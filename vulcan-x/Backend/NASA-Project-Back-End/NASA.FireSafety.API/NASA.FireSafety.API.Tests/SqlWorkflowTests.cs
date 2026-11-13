using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.DTOs.Knowledge;
using NASA.FireSafety.API.Entities;
using NASA.FireSafety.API.Services;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;
using Xunit;
using Xunit.Abstractions;

namespace NASA.FireSafety.API.Tests;

public sealed class SqlFactAttribute : FactAttribute
{
    public SqlFactAttribute() { if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FIRE_SAFETY_SQL_TEST_CONNECTION"))) Skip = "Dedicated SQL Server connection not supplied; not InMemory evidence."; }
}
public sealed class SqlTheoryAttribute : TheoryAttribute
{
    public SqlTheoryAttribute() { if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FIRE_SAFETY_SQL_TEST_CONNECTION"))) Skip = "Dedicated SQL Server connection not supplied; not InMemory evidence."; }
}

// Real SQL persistence, deliberately controlled upstream contract responses.
// These responses are technical fixtures, never provider/scientific evidence.
[Collection("SQL integration")]
public sealed class SqlWorkflowTests(ITestOutputHelper output)
{
    private static FireSafetyDbContext OpenDatabase()
    {
        var connection = new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("FIRE_SAFETY_SQL_TEST_CONNECTION"));
        if (!connection.InitialCatalog.StartsWith("Flame_M6_", StringComparison.Ordinal))
            throw new InvalidOperationException("SQL tests require a dedicated Flame_M6_* database; no unknown database will be migrated or seeded.");
        return new(new DbContextOptionsBuilder<FireSafetyDbContext>().UseSqlServer(connection.ConnectionString).Options);
    }

    private static async Task<FireSafetyDbContext> ReadyDatabase()
    {
        var db = OpenDatabase();
        await db.Database.MigrateAsync();
        await new CuratedCatalogSeeder(db).SeedAsync(CancellationToken.None);
        return db;
    }

    [SqlFact]
    public async Task ExistingMigrationCreatesSeventeenTablesAndSeedIsIdempotent()
    {
        await using var db = OpenDatabase();
        await db.Database.MigrateAsync();
        Assert.Single(await db.Database.GetAppliedMigrationsAsync());
        var seeder = new CuratedCatalogSeeder(db);
        var first = await seeder.SeedAsync(CancellationToken.None);
        var before = await Counts(db);
        var second = await seeder.SeedAsync(CancellationToken.None);
        var after = await Counts(db);
        Assert.Equal(17, before.Count);
        Assert.Equal(JsonSerializer.Serialize(before), JsonSerializer.Serialize(after));
        Assert.Equal(3, await db.SpaceEnvironments.CountAsync());
        Assert.Equal(await db.Materials.CountAsync(), await db.Materials.Select(x => x.Code).Distinct().CountAsync());
        Assert.Equal(await db.ResearchSources.CountAsync(), await db.ResearchSources.Select(x => new { x.ExternalSystem, x.ExternalId }).Distinct().CountAsync());
        Assert.Equal(0, await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1").SingleAsync());
        output.WriteLine($"Seed first: {first}; seed second: {second}; tables: {JsonSerializer.Serialize(after)}");
    }

    [SqlTheory]
    [InlineData(0, "NoCitations")]
    [InlineData(1, "HasMatchedCitations")]
    [InlineData(2, "HasOnlyUnmatchedCitations")]
    public async Task SavedKnowledgeCanBeRetrievedWithHonestCitations(int mode, string grounding)
    {
        await using var db = await ReadyDatabase();
        var environment = await db.SpaceEnvironments.FirstAsync(x => x.Code == "ISS");
        var source = await db.ResearchSources.FirstAsync();
        var sources = mode switch { 1 => new List<string> { source.Title, "UNVERIFIED technical citation fixture" }, 2 => new List<string> { "UNVERIFIED technical citation fixture" }, _ => [] };
        var ai = new ControlledAi { Query = (_, _) => Task.FromResult(new AiQueryResponse { Success = true, Answer = "Technical response fixture, not scientific evidence.", Sources = sources }) };
        var request = new CreateKnowledgeQueryRequest { EnvironmentId = environment.Id, Question = $"SQL contract fixture {Guid.NewGuid()}", YearFrom = 2000, YearTo = 2020, MaxSources = 3 };
        var result = await new KnowledgeQueryService(db, ai).CreateAsync(request, CancellationToken.None);
        await using var reader = OpenDatabase();
        var saved = await reader.KnowledgeQueries.Include(x => x.Citations).SingleAsync(x => x.Id == result.Id);
        Assert.Equal(AnalysisStatus.Completed, saved.Status);
        Assert.Contains($"\"EnvironmentId\":{environment.Id}", saved.FiltersJson);
        Assert.Equal(request.Question, saved.Question);
        var retrieved = await new KnowledgeQueryService(reader, ai).GetAsync(result.Id, CancellationToken.None);
        Assert.Equal(grounding, retrieved!.GroundingStatus);
        Assert.Equal(result.Answer, retrieved.Answer);
        Assert.All(retrieved.Citations.Where(x => x.MatchStatus == "Unmatched"), x => Assert.Null(x.Source));
        Assert.Equal(2, ai.LastRequest!.GetType().GetProperties().Length); // upstream question/environment only
        output.WriteLine($"SQL + controlled upstream queryId={result.Id}, status={result.Status}, grounding={grounding}");
    }

    [SqlTheory]
    [InlineData(VulcanXFailureKind.Timeout)]
    [InlineData(VulcanXFailureKind.Unavailable)]
    [InlineData(VulcanXFailureKind.InvalidResponse)]
    public async Task UpstreamFailureIsTerminalAndRetrievable(VulcanXFailureKind kind)
    {
        await using var db = await ReadyDatabase();
        var id = await db.SpaceEnvironments.Where(x => x.Code == "ISS").Select(x => x.Id).SingleAsync();
        var ai = new ControlledAi { Query = (_, _) => throw new VulcanXServiceException(kind, "private upstream fixture detail") };
        var failure = await Assert.ThrowsAsync<PersistedExternalFailureException>(() => new KnowledgeQueryService(db, ai).CreateAsync(new() { EnvironmentId = id, Question = $"SQL failure fixture {Guid.NewGuid()}" }, CancellationToken.None));
        await using var reader = OpenDatabase();
        var saved = await new KnowledgeQueryService(reader, ai).GetAsync(failure.RecordId, CancellationToken.None);
        Assert.Equal("Failed", saved!.Status);
        Assert.Null(saved.Answer);
        Assert.DoesNotContain("private", saved.Error!.Message);
        output.WriteLine($"SQL + controlled upstream failed queryId={failure.RecordId}, kind={kind}, code={saved.Error.Code}");
    }

    [SqlFact]
    public async Task DuplicatePostsAreDistinctRecords_NotSilentlyClaimedIdempotent()
    {
        await using var db = await ReadyDatabase();
        var id = await db.SpaceEnvironments.Where(x => x.Code == "ISS").Select(x => x.Id).SingleAsync();
        var ai = new ControlledAi { Query = (_, _) => Task.FromResult(new AiQueryResponse { Success = true, Answer = "Technical duplicate-workflow fixture." }) };
        var request = new CreateKnowledgeQueryRequest { EnvironmentId = id, Question = $"SQL duplicate fixture {Guid.NewGuid()}" };
        var service = new KnowledgeQueryService(db, ai);
        var first = await service.CreateAsync(request, CancellationToken.None);
        var second = await service.CreateAsync(request, CancellationToken.None);
        Assert.NotEqual(first.Id, second.Id);
        await using var reader = OpenDatabase();
        Assert.Equal(2, await reader.KnowledgeQueries.CountAsync(x => x.Question == request.Question));
        Assert.Equal("Completed", (await new KnowledgeQueryService(reader, ai).GetAsync(first.Id, CancellationToken.None))!.Status);
    }

    [SqlFact]
    public async Task RealForeignKeyFailureRollsBackOnlyThisTestTransaction()
    {
        await using var db = await ReadyDatabase();
        var queryId = Guid.NewGuid();
        await using var transaction = await db.Database.BeginTransactionAsync();
        db.KnowledgeQueries.Add(new KnowledgeQuery { Id = queryId, Question = "Technical rollback fixture only", Status = AnalysisStatus.Running, CorrelationId = Guid.NewGuid() });
        await db.SaveChangesAsync();
        db.KnowledgeCitations.Add(new KnowledgeCitation { KnowledgeQueryId = queryId, MatchStatus = CitationMatchStatus.Matched, ResearchSourceId = -1 });
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        await transaction.RollbackAsync();
        await using var reader = OpenDatabase();
        Assert.False(await reader.KnowledgeQueries.AnyAsync(x => x.Id == queryId));
        Assert.False(await reader.KnowledgeCitations.AnyAsync(x => x.KnowledgeQueryId == queryId));
    }

    [SqlFact]
    public async Task ReportedProviderProvenanceRoundTripsThroughRealSql_UsingExplicitContractFixture()
    {
        await using var db = await ReadyDatabase();
        var id = await db.SpaceEnvironments.Where(x => x.Code == "ISS").Select(x => x.Id).SingleAsync();
        var ai = new ControlledAi { Query = (_, _) => Task.FromResult(new AiQueryResponse {
            Success = true, Answer = "Technical provenance fixture, not live inference.",
            Generation = new AiGeneration { Mode = "ProviderInference", Provider = "openrouter", Model = "technical-contract-fixture" }
        }) };
        var created = await new KnowledgeQueryService(db, ai).CreateAsync(new() { EnvironmentId = id, Question = $"SQL provenance fixture {Guid.NewGuid()}" }, CancellationToken.None);
        await using var reader = OpenDatabase();
        var result = await new KnowledgeQueryService(reader, ai).GetAsync(created.Id, CancellationToken.None);
        Assert.Equal("technical-contract-fixture", result!.Generation!.Model);
        Assert.Equal("openrouter", result.Generation.Provider);
        Assert.Equal("ProviderInference", result.Generation.Mode);
        output.WriteLine($"SQL provenance contract fixture queryId={created.Id}; not actual provider inference");
    }

    [SqlFact]
    public async Task CancellationAfterRunningWasCommittedPersistsFailedUsingIndependentToken()
    {
        await using var db = await ReadyDatabase();
        var environment = await db.SpaceEnvironments.FirstAsync(x => x.Code == "ISS");
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var ai = new ControlledAi { Query = async (_, token) => { started.SetResult(); await Task.Delay(Timeout.Infinite, token); throw new InvalidOperationException(); } };
        using var cancelled = new CancellationTokenSource();
        var question = $"SQL cancellation fixture {Guid.NewGuid()}";
        var pending = new KnowledgeQueryService(db, ai).CreateAsync(new() { EnvironmentId = environment.Id, Question = question }, cancelled.Token);
        await started.Task.WaitAsync(TimeSpan.FromSeconds(10));
        await using var reader = OpenDatabase();
        var running = await reader.KnowledgeQueries.AsNoTracking().SingleAsync(x => x.Question == question);
        Assert.Equal(AnalysisStatus.Running, running.Status);
        cancelled.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => pending);
        var saved = await reader.KnowledgeQueries.AsNoTracking().SingleAsync(x => x.Id == running.Id);
        Assert.Equal(AnalysisStatus.Failed, saved.Status);
        Assert.Equal("REQUEST_CANCELLED", saved.ErrorCode);
        Assert.NotNull(saved.CompletedAt);
        Assert.Null(saved.Answer);
        output.WriteLine($"SQL cancellation queryId={saved.Id}, Running -> Failed, code={saved.ErrorCode}");
    }

    private static async Task<SortedDictionary<string, long>> Counts(FireSafetyDbContext db)
    {
        await db.Database.OpenConnectionAsync();
        var result = new SortedDictionary<string, long>();
        foreach (var table in db.Model.GetEntityTypes().Select(x => x.GetTableName()!).Distinct().Order())
        {
            await using var command = db.Database.GetDbConnection().CreateCommand();
            // Names come only from the fixed EF model, never request input.
            command.CommandText = $"SELECT COUNT_BIG(*) FROM [dbo].[{table}]";
            result[table] = (long)(await command.ExecuteScalarAsync())!;
        }
        return result;
    }

    [SqlTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UnexpectedFailureAndCancelledLateReplyCannotSavePartialSuccess(bool lateReply)
    {
        await using var db = await ReadyDatabase();
        var id = await db.SpaceEnvironments.Where(x => x.Code == "ISS").Select(x => x.Id).SingleAsync();
        using var cancelled = new CancellationTokenSource();
        var question = $"SQL late-reply technical fixture {Guid.NewGuid()}";
        var ai = new ControlledAi { Query = (_, _) => {
            if (!lateReply) throw new InvalidOperationException("private fixture exception");
            cancelled.Cancel();
            return Task.FromResult(new AiQueryResponse { Success = true, Answer = "Must not be saved after cancellation", Sources = ["unverified technical fixture"] });
        } };
        var pending = new KnowledgeQueryService(db, ai).CreateAsync(new() { EnvironmentId = id, Question = question }, cancelled.Token);
        if (lateReply) await Assert.ThrowsAnyAsync<OperationCanceledException>(() => pending);
        else await Assert.ThrowsAsync<InvalidOperationException>(() => pending);
        await using var reader = OpenDatabase();
        var saved = await reader.KnowledgeQueries.Include(x => x.Citations).SingleAsync(x => x.Question == question);
        Assert.Equal(AnalysisStatus.Failed, saved.Status);
        Assert.Null(saved.Answer);
        Assert.Empty(saved.Citations);
        Assert.Equal(lateReply ? "REQUEST_CANCELLED" : "WORKFLOW_FAILED", saved.ErrorCode);
    }

    private sealed class ControlledAi : IVulcanXAiClient
    {
        public required Func<AiQueryRequest, CancellationToken, Task<AiQueryResponse>> Query { get; init; }
        public AiQueryRequest? LastRequest { get; private set; }
        public Task<AiQueryResponse> QueryAsync(AiQueryRequest request, CancellationToken token) { LastRequest = request; return Query(request, token); }
        public Task<StressTestResponse> RunStressTestAsync(StressTestRequest request, CancellationToken token) => throw new NotSupportedException("No approved scientific fixture");
        public Task<HazardEvaluationResponse> EvaluateHazardAsync(HazardEvaluationRequest request, CancellationToken token) => throw new NotSupportedException();
        public Task<DatasetCatalogResponse> GetDatasetsAsync(CancellationToken token) => throw new NotSupportedException();
        public Task<VulcanXHealthResponse> GetHealthAsync(CancellationToken token) => throw new NotSupportedException();
    }
}

[CollectionDefinition("SQL integration", DisableParallelization = true)]
public sealed class SqlIntegrationCollection { }
