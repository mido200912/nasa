using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.Entities;
using Xunit;
using Xunit.Abstractions;

namespace NASA.FireSafety.API.Tests;

public sealed class LiveProxyFactAttribute : FactAttribute
{
    public LiveProxyFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FIRE_SAFETY_LIVE_PROXY_URL")))
            Skip = "Requires dedicated SQL + real Next.js/ASP.NET processes and controlled upstream harness.";
    }
}

// Actual TCP Next.js -> ASP.NET -> SQL; controlled upstream timing, not AI inference.
[Collection("SQL integration")]
public sealed class LiveProxyCancellationTests(ITestOutputHelper output)
{
    private static FireSafetyDbContext Database()
    {
        var connection = new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("FIRE_SAFETY_SQL_TEST_CONNECTION"));
        if (!connection.InitialCatalog.StartsWith("Flame_M6_", StringComparison.Ordinal)) throw new InvalidOperationException("Dedicated Flame_M6_* database required");
        return new(new DbContextOptionsBuilder<FireSafetyDbContext>().UseSqlServer(connection.ConnectionString).Options);
    }
    private static HttpClient Client() => new() { BaseAddress = new Uri(Environment.GetEnvironmentVariable("FIRE_SAFETY_LIVE_PROXY_URL")!), Timeout = TimeSpan.FromSeconds(40) };

    [LiveProxyFact]
    public async Task ProxyCancellationReachesRequestAbortedAndSqlTerminalState()
    {
        await using var db = Database();
        var environment = await db.SpaceEnvironments.SingleAsync(x => x.Code == "ISS");
        var question = $"M6_BLOCK cancellation {Guid.NewGuid()}";
        using var client = Client();
        using var cancellation = new CancellationTokenSource();
        var pending = client.PostAsJsonAsync("/api/backend/knowledge/queries", new { question, environmentId = environment.Id }, cancellation.Token);
        KnowledgeQuery? running = null;
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (running is null)
        {
            running = await db.KnowledgeQueries.AsNoTracking().SingleOrDefaultAsync(x => x.Question == question, deadline.Token);
            if (running is null) await Task.Delay(50, deadline.Token);
        }
        Assert.Equal(AnalysisStatus.Running, running.Status);
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => pending);
        KnowledgeQuery saved;
        do
        {
            await Task.Delay(50, deadline.Token);
            saved = await db.KnowledgeQueries.AsNoTracking().SingleAsync(x => x.Id == running.Id, deadline.Token);
        } while (saved.Status == AnalysisStatus.Running);
        Assert.Equal(AnalysisStatus.Failed, saved.Status);
        Assert.Equal("REQUEST_CANCELLED", saved.ErrorCode);
        Assert.Null(saved.Answer);
        output.WriteLine($"LIVE TCP proxy cancellation SQL queryId={saved.Id}, status={saved.Status}, error={saved.ErrorCode}");
    }

    [LiveProxyFact]
    public async Task UpstreamDeadlineReturns504WithRealFailedRecordBeforeProxyDeadline()
    {
        await using var db = Database();
        var id = await db.SpaceEnvironments.Where(x => x.Code == "ISS").Select(x => x.Id).SingleAsync();
        using var client = Client();
        var response = await client.PostAsJsonAsync("/api/backend/knowledge/queries", new { question = $"M6_BLOCK timeout {Guid.NewGuid()}", environmentId = id });
        Assert.Equal(HttpStatusCode.GatewayTimeout, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var queryId = problem.GetProperty("queryId").GetGuid();
        var saved = await db.KnowledgeQueries.AsNoTracking().SingleAsync(x => x.Id == queryId);
        Assert.Equal(AnalysisStatus.Failed, saved.Status);
        Assert.Equal("VULCANX_TIMEOUT", saved.ErrorCode);
        output.WriteLine($"LIVE TCP controlled upstream deadline SQL queryId={saved.Id}, status={saved.Status}, error={saved.ErrorCode}");
    }

    [LiveProxyFact]
    public async Task ValidSourceBoundResponseLongerThanTenSecondsSurvivesProxy()
    {
        await using var db = Database();
        var id = await db.SpaceEnvironments.Where(x => x.Code == "ISS").Select(x => x.Id).SingleAsync();
        using var client = Client();
        var response = await client.PostAsJsonAsync("/api/backend/knowledge/queries", new { question = $"M6_DELAY NASA oxygen fire sources {Guid.NewGuid()}", environmentId = id });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var queryId = result.GetProperty("id").GetGuid();
        Assert.Equal(AnalysisStatus.Completed, (await db.KnowledgeQueries.AsNoTracking().SingleAsync(x => x.Id == queryId)).Status);
        output.WriteLine($"LIVE TCP 11-second controlled delay + actual source-bound Vulcan-X SQL queryId={queryId}");
    }

    [LiveProxyFact]
    public async Task ActualHttpSaturationReturns429AndCancellationReleasesCapacity()
    {
        await using var db = Database();
        var id = await db.SpaceEnvironments.Where(x => x.Code == "ISS").Select(x => x.Id).SingleAsync();
        using var client = Client();
        using var cancelled = new CancellationTokenSource();
        var prefix = $"M6_BLOCK saturation {Guid.NewGuid()}";
        var pending = Enumerable.Range(0, 2).Select(index => client.PostAsJsonAsync("/api/backend/knowledge/queries", new { question = $"{prefix}-{index}", environmentId = id }, cancelled.Token)).ToArray();
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (await db.KnowledgeQueries.CountAsync(x => x.Question.StartsWith(prefix) && x.Status == AnalysisStatus.Running, deadline.Token) != 2)
            await Task.Delay(50, deadline.Token);
        var rejected = await client.PostAsJsonAsync("/api/backend/knowledge/queries", new { question = "Technical saturated request", environmentId = id }, deadline.Token);
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.Contains("AI_CONCURRENCY_LIMIT", await rejected.Content.ReadAsStringAsync(deadline.Token));
        cancelled.Cancel();
        foreach (var request in pending) await Assert.ThrowsAnyAsync<OperationCanceledException>(() => request);
        while (await db.KnowledgeQueries.CountAsync(x => x.Question.StartsWith(prefix) && x.Status == AnalysisStatus.Failed, deadline.Token) != 2)
            await Task.Delay(50, deadline.Token);
        var retry = await client.PostAsJsonAsync("/api/backend/knowledge/queries", new { question = "NASA oxygen fire source after cancellation", environmentId = id }, deadline.Token);
        Assert.Equal(HttpStatusCode.Created, retry.StatusCode);
        output.WriteLine("LIVE HTTP Knowledge capacity 2 -> 429; both cancellations persisted Failed and capacity was reusable.");
    }
}
