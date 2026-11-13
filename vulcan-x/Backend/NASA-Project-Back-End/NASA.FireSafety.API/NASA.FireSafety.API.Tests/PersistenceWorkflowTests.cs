using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.DTOs.Habitat;
using NASA.FireSafety.API.DTOs.Knowledge;
using NASA.FireSafety.API.Entities;
using NASA.FireSafety.API.Services;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class PersistenceWorkflowTests
{
    [Fact]
    public async Task Habitat_PersistsCompletedAnalysisAndMappedFactor()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        var service = new HabitatAnalysisService(db, new StubAiClient { StressResponse = new StressTestResponse { Success = true, SimulationResult = new StressTestResult { SafetyStatus = "High", IgnitionSpeedMultiplier = 2.5, Recommendation = "AI response." } } });

        var result = await service.CreateAsync(new CreateHabitatAnalysisRequest { EnvironmentId = environment.Id, MaterialId = material.Id, OxygenVolumePercent = 21, PressureKPa = 101.325m, GravityRegime = "Microgravity" }, CancellationToken.None);

        Assert.Equal("Completed", result.Status);
        Assert.Equal("LlmInterpretationOnly", result.Result!.AnalysisBasis);
        Assert.Single(result.Result.Factors);
        Assert.False(result.Result.IsScientificallyValidated);
        var saved = await db.HabitatAnalyses.Include(x => x.Factors).SingleAsync();
        Assert.Equal(AnalysisStatus.Completed, saved.Status);
        Assert.Single(saved.Factors);
    }

    [Fact]
    public async Task Habitat_RejectsUnknownRequiredInputsWithoutCreatingRecord()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        var service = new HabitatAnalysisService(db, new StubAiClient());

        await Assert.ThrowsAsync<ScientificInputRequiredException>(() => service.CreateAsync(new CreateHabitatAnalysisRequest { EnvironmentId = environment.Id, MaterialId = material.Id }, CancellationToken.None));
        Assert.Empty(await db.HabitatAnalyses.ToListAsync());
    }

    [Fact]
    public async Task Workflows_RejectUnknownCatalogReferences()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var habitat = new HabitatAnalysisService(db, new StubAiClient());
        var knowledge = new KnowledgeQueryService(db, new StubAiClient());

        await Assert.ThrowsAsync<CatalogRecordNotFoundException>(() => habitat.CreateAsync(new CreateHabitatAnalysisRequest { EnvironmentId = 999, MaterialId = 999, OxygenVolumePercent = 21, PressureKPa = 100 }, CancellationToken.None));
        await Assert.ThrowsAsync<CatalogRecordNotFoundException>(() => knowledge.CreateAsync(new CreateKnowledgeQueryRequest { Question = "What is combustion?", EnvironmentId = 999 }, CancellationToken.None));
    }

    [Fact]
    public async Task Habitat_PersistsFailedRecord_WhenAiIsUnavailable()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        var service = new HabitatAnalysisService(db, new StubAiClient { StressFailure = VulcanXFailureKind.Unavailable });

        var error = await Assert.ThrowsAsync<PersistedExternalFailureException>(() => service.CreateAsync(new CreateHabitatAnalysisRequest { EnvironmentId = environment.Id, MaterialId = material.Id, OxygenVolumePercent = 21, PressureKPa = 100 }, CancellationToken.None));

        var saved = await db.HabitatAnalyses.SingleAsync(x => x.Id == error.RecordId);
        Assert.Equal(AnalysisStatus.Failed, saved.Status);
        Assert.Equal("VULCANX_UNAVAILABLE", saved.ErrorCode);
    }

    [Fact]
    public async Task Knowledge_PersistsMatchedAndUnmatchedCitations_AndComputesGrounding()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, _) = await AddCatalogAsync(db);
        db.ResearchSources.Add(new ResearchSource { Title = "Exact NASA Source", SourceType = ResearchSourceType.NasaPublication, Origin = ResearchOrigin.NasaOriginal, CurationStatus = CurationStatus.ApprovedForDisplay });
        await db.SaveChangesAsync();
        var service = new KnowledgeQueryService(db, new StubAiClient { QueryResponse = new AiQueryResponse { Success = true, Answer = "AI answer", Sources = ["Exact NASA Source", "Unverified AI source"] } });

        var result = await service.CreateAsync(new CreateKnowledgeQueryRequest { Question = "How does flame spread change?", EnvironmentId = environment.Id }, CancellationToken.None);

        Assert.Equal("HasMatchedCitations", result.GroundingStatus);
        Assert.Equal(2, result.Citations.Count);
        Assert.Contains(result.Citations, x => x.MatchStatus == "Matched" && x.Source?.Title == "Exact NASA Source");
        Assert.Contains(result.Citations, x => x.MatchStatus == "Unmatched" && x.RawTitle == "Unverified AI source");
    }

    [Fact]
    public async Task Knowledge_UsesNoCitationsAndPersistsFailureSafely()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, _) = await AddCatalogAsync(db);
        var success = new KnowledgeQueryService(db, new StubAiClient { QueryResponse = new AiQueryResponse { Success = true, Answer = "AI answer" } });
        var completed = await success.CreateAsync(new CreateKnowledgeQueryRequest { Question = "What is combustion?", EnvironmentId = environment.Id }, CancellationToken.None);
        Assert.Equal("NoCitations", completed.GroundingStatus);

        var failed = new KnowledgeQueryService(db, new StubAiClient { QueryFailure = VulcanXFailureKind.Timeout });
        var error = await Assert.ThrowsAsync<PersistedExternalFailureException>(() => failed.CreateAsync(new CreateKnowledgeQueryRequest { Question = "What is combustion?", EnvironmentId = environment.Id }, CancellationToken.None));
        Assert.Equal(AnalysisStatus.Failed, (await db.KnowledgeQueries.SingleAsync(x => x.Id == error.RecordId)).Status);
    }

    private static async Task<(SpaceEnvironment Environment, Material Material)> AddCatalogAsync(Data.FireSafetyDbContext db)
    {
        var environment = new SpaceEnvironment { Code = "ISS", Name = "ISS", EnvironmentType = EnvironmentType.OrbitalStation, IsActive = true };
        var material = new Material { Code = "TEST", Name = "Test material", IsActive = true };
        db.AddRange(environment, material);
        await db.SaveChangesAsync();
        return (environment, material);
    }

    [Fact]
    public async Task Knowledge_RetainsReportedProviderProvenanceOnRetrieval_WithoutClaimingFixtureIsLiveInference()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, _) = await AddCatalogAsync(db);
        var ai = new StubAiClient { QueryResponse = new AiQueryResponse { Success = true, Answer = "Technical provider fixture, not actual model inference.", Generation = new AiGeneration { Mode = "ProviderInference", Provider = "openrouter", Model = "technical-fixture" } } };
        var service = new KnowledgeQueryService(db, ai);
        var created = await service.CreateAsync(new() { EnvironmentId = environment.Id, Question = "Provenance contract fixture" }, CancellationToken.None);
        var retrieved = await service.GetAsync(created.Id, CancellationToken.None);
        Assert.Equal("ProviderInference", retrieved!.Generation!.Mode);
        Assert.Equal("technical-fixture", retrieved.Generation.Model);
        Assert.Equal("openrouter", retrieved.Generation.Provider);
        Assert.Equal("knowledge-inference/1", (await db.KnowledgeQueries.SingleAsync()).ContractVersion);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CancellationPersistsFailedWithoutPartialSuccess(bool habitat)
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        using var cancelled = new CancellationTokenSource();
        var client = new StubAiClient { Cancel = cancelled };
        if (habitat)
        {
            // Technical service fixture only, never an approved/live scientific input.
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => new HabitatAnalysisService(db, client).CreateAsync(new CreateHabitatAnalysisRequest { EnvironmentId = environment.Id, MaterialId = material.Id, OxygenVolumePercent = 21, PressureKPa = 100 }, cancelled.Token));
            var saved = await db.HabitatAnalyses.SingleAsync();
            Assert.Equal(AnalysisStatus.Failed, saved.Status);
            Assert.Equal("REQUEST_CANCELLED", saved.ErrorCode);
            Assert.Empty(await db.AnalysisFactors.ToListAsync());
        }
        else
        {
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => new KnowledgeQueryService(db, client).CreateAsync(new CreateKnowledgeQueryRequest { Question = "Cancellation regression fixture", EnvironmentId = environment.Id }, cancelled.Token));
            var saved = await db.KnowledgeQueries.SingleAsync();
            Assert.Equal(AnalysisStatus.Failed, saved.Status);
            Assert.Equal("REQUEST_CANCELLED", saved.ErrorCode);
            Assert.Null(saved.Answer);
        }
    }

    private sealed class StubAiClient : IVulcanXAiClient
    {
        public CancellationTokenSource? Cancel { get; init; }
        public StressTestResponse? StressResponse { get; init; }
        public AiQueryResponse? QueryResponse { get; init; }
        public VulcanXFailureKind? StressFailure { get; init; }
        public VulcanXFailureKind? QueryFailure { get; init; }
        public Task<AiQueryResponse> QueryAsync(AiQueryRequest request, CancellationToken cancellationToken) { Cancel?.Cancel(); cancellationToken.ThrowIfCancellationRequested(); return QueryFailure is { } failure ? throw new VulcanXServiceException(failure, "failure") : Task.FromResult(QueryResponse ?? new AiQueryResponse()); }
        public Task<StressTestResponse> RunStressTestAsync(StressTestRequest request, CancellationToken cancellationToken) { Cancel?.Cancel(); cancellationToken.ThrowIfCancellationRequested(); return StressFailure is { } failure ? throw new VulcanXServiceException(failure, "failure") : Task.FromResult(StressResponse ?? new StressTestResponse()); }
        public Task<HazardEvaluationResponse> EvaluateHazardAsync(HazardEvaluationRequest request, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<DatasetCatalogResponse> GetDatasetsAsync(CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<VulcanXHealthResponse> GetHealthAsync(CancellationToken cancellationToken) => throw new NotSupportedException();
    }
}
