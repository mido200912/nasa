using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Data.SqlClient;

namespace NASA.FireSafety.API.Middleware;

public sealed class AnonymousRateOptions
{
    public int RequestsPerMinute { get; set; } = 120;
    public int KnowledgePerMinute { get; set; } = 6;
    public int KnowledgePerHour { get; set; } = 100;
    public int MaximumClients { get; set; } = 4096;
    public void Validate()
    {
        if (RequestsPerMinute is < 1 or > 10000 || KnowledgePerMinute is < 1 or > 60
            || KnowledgePerHour is < 1 or > 10000 || MaximumClients is < 1 or > 65536)
            throw new InvalidOperationException("Invalid anonymous rate-limit configuration.");
    }
}

// Fixed-size state, monotonic clock, no queue. Limits are per API process.
public sealed class AnonymousRateLimits
{
    private sealed class Bucket { public long Started; public int Requests; public int Knowledge; }
    private readonly Dictionary<string, Bucket> clients = new();
    private readonly object gate = new();
    private readonly AnonymousRateOptions options;
    private long hourStarted = Stopwatch.GetTimestamp();
    private int hourRequests;
    public AnonymousRateLimits(AnonymousRateOptions options) { options.Validate(); this.options = options; }
    public static bool IsExpensive(string method, string path) => HttpMethods.IsPost(method)
        && (path.TrimEnd('/').Equals("/api/knowledge/queries", StringComparison.OrdinalIgnoreCase)
            || path.TrimEnd('/').Equals("/api/v1/ai/query", StringComparison.OrdinalIgnoreCase));
    public bool TryAcquire(IPAddress? address, bool expensive)
    {
        var key = (address?.IsIPv4MappedToIPv6 == true ? address.MapToIPv4() : address)?.ToString() ?? "unknown";
        lock (gate)
        {
            var now = Stopwatch.GetTimestamp();
            if (Stopwatch.GetElapsedTime(hourStarted, now) >= TimeSpan.FromHours(1)) { hourStarted = now; hourRequests = 0; }
            if (!clients.TryGetValue(key, out var bucket))
            {
                if (clients.Count >= options.MaximumClients)
                    foreach (var stale in clients.Where(x => Stopwatch.GetElapsedTime(x.Value.Started, now) >= TimeSpan.FromMinutes(1)).Select(x => x.Key).ToArray()) clients.Remove(stale);
                if (clients.Count >= options.MaximumClients) return false; // fail closed, never grow without bound
                clients[key] = bucket = new Bucket { Started = now };
            }
            if (Stopwatch.GetElapsedTime(bucket.Started, now) >= TimeSpan.FromMinutes(1)) { bucket.Started = now; bucket.Requests = 0; bucket.Knowledge = 0; }
            if (bucket.Requests >= options.RequestsPerMinute || (expensive && (bucket.Knowledge >= options.KnowledgePerMinute || hourRequests >= options.KnowledgePerHour))) return false;
            bucket.Requests++;
            if (expensive) { bucket.Knowledge++; hourRequests++; }
            return true;
        }
    }
}

public static class Operations
{
    private static readonly Meter Meter = new("Flame.FireSafety", "1.0");
    public static readonly Counter<long> Requests = Meter.CreateCounter<long>("flame.requests");
    public static readonly Counter<long> Rejections = Meter.CreateCounter<long>("flame.rejections");
    public static readonly Counter<long> Knowledge = Meter.CreateCounter<long>("flame.knowledge.terminal");
    public static readonly Histogram<double> Duration = Meter.CreateHistogram<double>("flame.request.duration", "ms");
}

public sealed class AnonymousRateMiddleware(RequestDelegate next, AnonymousRateLimits limits, ILogger<AnonymousRateMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (!limits.TryAcquire(context.Connection.RemoteIpAddress, AnonymousRateLimits.IsExpensive(context.Request.Method, context.Request.Path)))
        {
            Operations.Rejections.Add(1, new KeyValuePair<string, object?>("reason", "rate_limit"));
            logger.LogWarning("Anonymous request rejected {Category} {CorrelationId}", "rate_limit", context.TraceIdentifier);
            context.Response.OnStarting(() => { context.Response.Headers.RetryAfter = "60"; return Task.CompletedTask; });
            await SafeProblems.WriteAsync(context, 429, "Request rate limit reached", "RATE_LIMIT");
            return;
        }
        await next(context);
    }
}

public sealed class RequestTelemetryMiddleware(RequestDelegate next, ILogger<RequestTelemetryMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        context.TraceIdentifier = Guid.TryParse(context.Request.Headers["X-Correlation-ID"], out var id) ? id.ToString() : Guid.NewGuid().ToString();
        context.Response.Headers["X-Correlation-ID"] = context.TraceIdentifier;
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers.CacheControl = "no-store";
        // SafeProblems clears an unwritten response; restore boundary metadata
        // at send time too, so overload/error responses retain correlation.
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Correlation-ID"] = context.TraceIdentifier;
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers.CacheControl = "no-store";
            return Task.CompletedTask;
        });
        var watch = Stopwatch.StartNew();
        try { await next(context); }
        finally
        {
            var status = context.Response.StatusCode;
            Operations.Requests.Add(1, new KeyValuePair<string, object?>("status", status));
            Operations.Duration.Record(watch.Elapsed.TotalMilliseconds);
            // Never log bodies, query strings, headers, credentials or arbitrary path segments.
            logger.LogInformation("Request completed {CorrelationId} {Method} {Status} {DurationMs}", context.TraceIdentifier, context.Request.Method, status, watch.ElapsedMilliseconds);
        }
    }
}

public static class ProductionConfiguration
{
    public static void ValidateSql(string connection)
    {
        var sql = new SqlConnectionStringBuilder(connection);
        if (sql.Encrypt.ToString().Equals("False", StringComparison.OrdinalIgnoreCase) || sql.TrustServerCertificate
            || sql.UserID.Equals("sa", StringComparison.OrdinalIgnoreCase) || sql.PersistSecurityInfo)
            throw new InvalidOperationException("Production SQL requires encryption, certificate validation, least-privilege credentials and Persist Security Info=False.");
    }
    public static void ConfigureForwarding(ForwardedHeadersOptions options, IConfiguration configuration)
    {
        // No implicit loopback trust and no wildcard network/header trust.
        options.KnownNetworks.Clear(); options.KnownProxies.Clear();
        options.ForwardedHeaders = ForwardedHeaders.None;
        var proxies = configuration.GetSection("TrustedProxyAddresses").Get<string[]>() ?? [];
        foreach (var value in proxies)
        {
            if (!IPAddress.TryParse(value, out var ip)) throw new InvalidOperationException("Trusted proxy entries must be explicit IP addresses.");
            options.KnownProxies.Add(ip);
        }
        if (proxies.Length > 0)
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = 1;
        }
    }
}
