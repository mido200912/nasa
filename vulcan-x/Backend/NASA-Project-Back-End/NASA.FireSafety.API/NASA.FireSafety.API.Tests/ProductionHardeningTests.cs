using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using NASA.FireSafety.API.Middleware;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class ProductionHardeningTests
{
    [Fact]
    public async Task ClearedProblemResponsesRetainCorrelationAndSecurityHeaders()
    {
        using var server = new TestServer(new WebHostBuilder()
            .ConfigureServices(services => services.AddLogging())
            .Configure(app =>
            {
                app.UseMiddleware<RequestTelemetryMiddleware>();
                app.Run(context => SafeProblems.WriteAsync(context, 429, "Request rate limit reached", "RATE_LIMIT"));
            }));
        using var response = await server.CreateClient().GetAsync("/");
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(Guid.TryParse(response.Headers.GetValues("X-Correlation-ID").Single(), out _));
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.True(response.Headers.CacheControl!.NoStore);
    }
    [Fact]
    public void ExpensiveAttemptsHaveSeparateLimitsAndMappedIpsShareABucket()
    {
        var limits = new AnonymousRateLimits(new() { RequestsPerMinute = 10, KnowledgePerMinute = 2, KnowledgePerHour = 10 });
        Assert.True(limits.TryAcquire(IPAddress.Parse("127.0.0.1"), true));
        Assert.True(limits.TryAcquire(IPAddress.Parse("::ffff:127.0.0.1"), true));
        Assert.False(limits.TryAcquire(IPAddress.Loopback, true));
        Assert.True(limits.TryAcquire(IPAddress.Loopback, false));
        Assert.True(limits.TryAcquire(IPAddress.Parse("127.0.0.2"), true));
    }
    [Fact]
    public void IpStateAndGlobalProviderBudgetAreBounded()
    {
        var limits = new AnonymousRateLimits(new() { MaximumClients = 1, KnowledgePerHour = 1 });
        Assert.True(limits.TryAcquire(IPAddress.Loopback, true));
        Assert.False(limits.TryAcquire(IPAddress.Parse("127.0.0.2"), true));
        Assert.False(limits.TryAcquire(IPAddress.Loopback, true));
    }
    [Theory]
    [InlineData("/api/knowledge/queries", true)]
    [InlineData("/api/v1/ai/query/", true)]
    [InlineData("/api/materials", false)]
    public void RawAiCannotBypassExpensiveLimiter(string path, bool expected) =>
        Assert.Equal(expected, AnonymousRateLimits.IsExpensive(HttpMethods.Post, path));

    [Fact]
    public void ProductionSqlRequiresCertificateValidationAndNotSa()
    {
        Assert.Throws<InvalidOperationException>(() => ProductionConfiguration.ValidateSql("Server=localhost;Database=example;User ID=sa;Password=technical-only;Encrypt=False;TrustServerCertificate=True"));
        ProductionConfiguration.ValidateSql("Server=sql.example.invalid;Database=example;User ID=app;Password=technical-only;Encrypt=True;TrustServerCertificate=False");
    }

    [Theory]
    [InlineData(false, "192.0.2.10", "192.0.2.10")]
    [InlineData(true, "192.0.2.99", "192.0.2.99")]
    [InlineData(true, "192.0.2.10", "203.0.113.5")]
    public async Task ForwardedHeadersRequireExplicitImmediatePeer(bool configured, string peer, string expected)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(configured
            ? new Dictionary<string, string?> { ["TrustedProxyAddresses:0"] = "192.0.2.10" }
            : new Dictionary<string, string?>()).Build();
        var options = new ForwardedHeadersOptions();
        ProductionConfiguration.ConfigureForwarding(options, config);
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(peer);
        context.Request.Headers["X-Forwarded-For"] = "203.0.113.5";
        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));
        await middleware.Invoke(context);
        Assert.Equal(expected, context.Connection.RemoteIpAddress!.ToString());
    }
}
