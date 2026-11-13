using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using NASA.FireSafety.API.Middleware;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class RequestProtectionTests
{
    [Theory]
    [InlineData(32768, 200)]
    [InlineData(32769, 413)]
    public async Task EnforcesActualBodyBytesEvenWithoutContentLength(int bytes, int expected)
    {
        var context = Context("/api/knowledge/queries");
        context.Request.Body = new MemoryStream(new byte[bytes]);
        var invoked = false;
        var middleware = Pipeline(_ => { invoked = true; return Task.CompletedTask; }, new());
        await middleware(context);
        Assert.Equal(expected, context.Response.StatusCode);
        Assert.Equal(expected == 200, invoked);
        if (expected == 413) AssertSafeProblem(context, 413);
    }

    [Fact]
    public async Task RejectsLargeDeclaredBodyBeforeReadingIt()
    {
        var context = Context("/api/materials");
        context.Request.ContentLength = 32769;
        await Pipeline(_ => throw new Exception("must not enter"), new())(context);
        AssertSafeProblem(context, 413);
    }

    [Theory]
    [InlineData("/api/materials", 32)]
    [InlineData("/api/habitat-analyses", 2)]
    [InlineData("/api/knowledge/queries", 2)]
    [InlineData("/api/v1/ai/query", 2)]
    [InlineData("/api/v1/simulator/stress-test", 2)]
    public async Task SaturationHasNoQueueAndPermitsAreReleased(string path, int capacity)
    {
        var entered = 0;
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var ready = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var middleware = Pipeline(async _ => { if (Interlocked.Increment(ref entered) == capacity) ready.TrySetResult(); await release.Task; }, new());
        var requests = Enumerable.Range(0, capacity).Select(_ => middleware(Context(path))).ToArray();
        await ready.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var rejected = Context(path);
        await middleware(rejected).WaitAsync(TimeSpan.FromSeconds(2));
        AssertSafeProblem(rejected, 429);
        release.SetResult();
        await Task.WhenAll(requests);
        var retry = Context(path);
        await middleware(retry);
        Assert.Equal(200, retry.Response.StatusCode);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FailureAndCancellationReleaseBothPermits(bool cancelled)
    {
        var limits = new RequestConcurrencyLimits();
        for (var i = 0; i < 3; i++)
        {
            var context = Context("/api/knowledge/queries");
            if (cancelled) context.RequestAborted = new CancellationToken(true);
            await Pipeline(_ => cancelled ? Task.FromCanceled(context.RequestAborted) : Task.FromException(new Exception("private connection secret")), limits)(context);
            Assert.Equal(cancelled ? 499 : 500, context.Response.StatusCode);
            Assert.DoesNotContain("private", Encoding.UTF8.GetString(((MemoryStream)context.Response.Body).ToArray()));
        }
        var retry = Context("/api/knowledge/queries");
        await Pipeline(_ => Task.CompletedTask, limits)(retry);
        Assert.Equal(200, retry.Response.StatusCode);
    }

    private static RequestDelegate Pipeline(RequestDelegate next, RequestConcurrencyLimits limits) =>
        new SafeErrorsMiddleware(new RequestProtectionMiddleware(next, limits).InvokeAsync, NullLogger<SafeErrorsMiddleware>.Instance).InvokeAsync;

    private static DefaultHttpContext Context(string path)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Method = path == "/api/materials" ? "GET" : "POST";
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static void AssertSafeProblem(DefaultHttpContext context, int status)
    {
        Assert.Equal(status, context.Response.StatusCode);
        Assert.StartsWith("application/problem+json", context.Response.ContentType);
        using var json = JsonDocument.Parse(((MemoryStream)context.Response.Body).ToArray());
        Assert.Equal(status, json.RootElement.GetProperty("status").GetInt32());
        Assert.True(json.RootElement.TryGetProperty("traceId", out _));
        Assert.DoesNotContain("Exception", json.RootElement.ToString());
    }
}
