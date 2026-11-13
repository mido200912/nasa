namespace NASA.FireSafety.API.Middleware;

// Singleton, process-wide concurrency permits. Try-acquire only: no waiting queue.
public sealed class RequestConcurrencyLimits : IDisposable
{
    public SemaphoreSlim Global { get; } = new(32, 32);
    public SemaphoreSlim Habitat { get; } = new(2, 2);
    public SemaphoreSlim Knowledge { get; } = new(2, 2);
    public void Dispose() { Global.Dispose(); Habitat.Dispose(); Knowledge.Dispose(); }
}

public sealed class RequestProtectionMiddleware(RequestDelegate next, RequestConcurrencyLimits limits)
{
    public const int MaximumBodyBytes = 32 * 1024;

    public async Task InvokeAsync(HttpContext context)
    {
        if (!limits.Global.Wait(0)) { await SafeProblems.WriteAsync(context, 429, "Request capacity reached", "CONCURRENCY_LIMIT"); return; }
        SemaphoreSlim? operation = null;
        var acquired = false;
        try
        {
            if (HttpMethods.IsPost(context.Request.Method))
            {
                var path = context.Request.Path.Value?.TrimEnd('/');
                operation = path?.ToLowerInvariant() switch
                {
                    "/api/habitat-analyses" or "/api/v1/simulator/stress-test" or "/api/v1/simulator/hazard-evaluation" => limits.Habitat,
                    "/api/knowledge/queries" or "/api/v1/ai/query" => limits.Knowledge,
                    _ => null
                };
                if (operation is not null && !(acquired = operation.Wait(0)))
                { await SafeProblems.WriteAsync(context, 429, "AI operation capacity reached", "AI_CONCURRENCY_LIMIT"); return; }
            }
            if (context.Request.ContentLength > MaximumBodyBytes)
            { await SafeProblems.WriteAsync(context, 413, "Request body is too large", "REQUEST_BODY_TOO_LARGE"); return; }

            // Bound actual bytes too, including chunked bodies and dishonest Content-Length.
            var original = context.Request.Body;
            using var buffered = new MemoryStream();
            var buffer = new byte[4096];
            int count;
            while ((count = await original.ReadAsync(buffer, context.RequestAborted)) > 0)
            {
                if (buffered.Length + count > MaximumBodyBytes)
                { await SafeProblems.WriteAsync(context, 413, "Request body is too large", "REQUEST_BODY_TOO_LARGE"); return; }
                await buffered.WriteAsync(buffer.AsMemory(0, count), context.RequestAborted);
            }
            buffered.Position = 0;
            context.Request.Body = buffered;
            try { await next(context); }
            finally { context.Request.Body = original; }
        }
        finally
        {
            if (acquired) operation!.Release();
            limits.Global.Release();
        }
    }
}
