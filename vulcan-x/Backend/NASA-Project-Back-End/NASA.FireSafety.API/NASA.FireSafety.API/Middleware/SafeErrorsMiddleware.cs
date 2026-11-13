using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace NASA.FireSafety.API.Middleware;

public static class SafeProblems
{
    public static async Task WriteAsync(HttpContext context, int status, string title, string code)
    {
        if (context.Response.HasStarted) { context.Abort(); return; }
        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        context.Response.Headers.CacheControl = "no-store";
        var problem = new ProblemDetails { Status = status, Title = title };
        problem.Extensions["errorCode"] = code;
        problem.Extensions["traceId"] = context.TraceIdentifier;
        await context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json", cancellationToken: context.RequestAborted);
    }
}

public sealed class SafeErrorsMiddleware(RequestDelegate next, ILogger<SafeErrorsMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The peer may already be gone. Never emit a fake successful response.
            if (!context.Response.HasStarted) context.Response.StatusCode = 499;
        }
        catch (BadHttpRequestException exception) when (exception.StatusCode == 413)
        { await SafeProblems.WriteAsync(context, 413, "Request body is too large", "REQUEST_BODY_TOO_LARGE"); }
        catch (Exception exception)
        {
            var databaseFailure = exception is DbUpdateException or SqlException;
            // Do not log exception messages/connection details/provider response bodies.
            logger.LogError("Request failed ({Category}); trace {TraceId}", databaseFailure ? "database" : "unexpected", context.TraceIdentifier);
            await SafeProblems.WriteAsync(context, databaseFailure ? 503 : 500,
                databaseFailure ? "Database service is unavailable" : "The request could not be completed", databaseFailure ? "DATABASE_UNAVAILABLE" : "REQUEST_FAILED");
        }
    }
}
