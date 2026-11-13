namespace NASA.FireSafety.API.Middleware;

public sealed class CorrelationHandler(IHttpContextAccessor accessor) : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (Guid.TryParse(accessor.HttpContext?.TraceIdentifier, out var id))
            request.Headers.TryAddWithoutValidation("X-Correlation-ID", id.ToString());
        return base.SendAsync(request, cancellationToken);
    }
}
