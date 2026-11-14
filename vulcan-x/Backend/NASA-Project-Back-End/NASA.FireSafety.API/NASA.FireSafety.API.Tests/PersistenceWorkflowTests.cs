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
    public async Task Habitat_PersistsRealInterpretationAndSourcesWithoutInventedSimulationFactors()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        db.ResearchSources.Add(new ResearchSource { Title = "NASA fixture", SourceUrl = "https://www.nasa.gov/fire/", CurationStatus = CurationStatus.ApprovedForDisplay });
        await db.SaveChangesAsync();
        var client = new StubAiClient { QueryResponse = HabitatResponse() };
        var service = new HabitatAnalysisService(db, client);

        var result = await service.CreateAsync(new CreateHabitatAnalysisRequest { EnvironmentId = environment.Id, MaterialId = material.Id, OxygenVolumePercent = 21, PressureKPa = 101.325m, GravityRegime = "Microgravity" }, CancellationToken.None);

        Assert.Equal("Completed", result.Status);
        Assert.Equal("LlmInterpretationOnly", result.Result!.AnalysisBasis);
        Assert.Empty(result.Result.Factors);
        Assert.Null(result.Result.RiskLabel);
        Assert.False(result.Result.IsScientificallyValidated);
        Assert.Equal("AI response fixture, not scientific evidence.", result.Result.Explanation);
        Assert.Equal(2, result.Result.Citations.Count);
        Assert.Contains(result.Result.Citations, x => x.MatchStatus == "Matched");
        Assert.Contains(result.Result.Citations, x => x.MatchStatus == "Unmatched");
        var saved = await db.HabitatAnalyses.Include(x => x.Factors).SingleAsync();
        Assert.Equal(AnalysisStatus.Completed, saved.Status);
        Assert.Empty(saved.Factors);
        Assert.Equal("technical-fixture", saved.ModelName);
        Assert.Equal("openrouter", saved.ModelVersion);
        Assert.Equal("habitat-interpretation/1", saved.ContractVersion);
        var retrieved = await service.GetAsync(result.Id, CancellationToken.None);
        Assert.Equal(result.Result.Explanation, retrieved!.Result!.Explanation);
        Assert.Equal("technical-fixture", retrieved.Generation!.Model);
        Assert.Empty(await db.KnowledgeQueries.ToListAsync());
        Assert.NotNull(client.LastQuery);
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
        var service = new HabitatAnalysisService(db, new StubAiClient { QueryFailure = VulcanXFailureKind.Unavailable });

        var error = await Assert.ThrowsAsync<PersistedExternalFailureException>(() => service.CreateAsync(new CreateHabitatAnalysisRequest { EnvironmentId = environment.Id, MaterialId = material.Id, OxygenVolumePercent = 21, PressureKPa = 100 }, CancellationToken.None));

        var saved = await db.HabitatAnalyses.SingleAsync(x => x.Id == error.RecordId);
        Assert.Equal(AnalysisStatus.Failed, saved.Status);
        Assert.Equal("VULCANX_UNAVAILABLE", saved.ErrorCode);
    }

    [Theory]
    [InlineData("ISS", "iss")]
    [InlineData("LUNAR_HABITAT", "lunar_base")]
    [InlineData("MARS_HABITAT", "mars_rover")]
    public async Task Habitat_ForwardsAllConditionsAndOriginsWithoutLosingUnits(string code, string aiEnvironment)
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        environment.Code = code;
        await db.SaveChangesAsync();
        var client = new StubAiClient { QueryResponse = HabitatResponse() };
        await new HabitatAnalysisService(db, client).CreateAsync(new()
        {
            EnvironmentId = environment.Id, MaterialId = material.Id,
            OxygenVolumePercent = 30, PressureKPa = 70.3m, TemperatureCelsius = 24,
            GravityRegime = "ReducedGravity", EffectiveGravityG = 0.16m, Language = "en",
            AdditionalParameters = new() { ["ventilation"] = "unknown" }
        }, CancellationToken.None);
        Assert.Equal(aiEnvironment, client.LastQuery!.Environment);
        foreach (var value in new[] { code, "Test material", "oxygenVolumePercent", "30", "pressureKPa", "70.3", "temperatureCelsius", "24", "ReducedGravity", "0.16", "ventilation", "unknown", "UserProvided" })
            Assert.Contains(value, client.LastQuery.Question);
        Assert.InRange(client.LastQuery.Question.Length, 1, 2000);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("LocalFallback")]
    public async Task Habitat_RejectsUnprovenGenerationAndKeepsOnlyFailedRecord(string? mode)
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        var response = HabitatResponse();
        response.Generation = mode is null ? null : new AiGeneration { Mode = mode, Provider = "openrouter", Model = "technical-fixture" };
        var service = new HabitatAnalysisService(db, new StubAiClient { QueryResponse = response });
        var error = await Assert.ThrowsAsync<PersistedExternalFailureException>(() => service.CreateAsync(new() { EnvironmentId = environment.Id, MaterialId = material.Id, OxygenVolumePercent = 21, PressureKPa = 100 }, CancellationToken.None));
        var saved = await service.GetAsync(error.RecordId, CancellationToken.None);
        Assert.Equal("Failed", saved!.Status);
        Assert.Null(saved.Result);
        Assert.Empty(await db.AnalysisCitations.ToListAsync());
    }

    private static AiQueryResponse HabitatResponse() => new()
    {
        Success = true, Answer = "AI response fixture, not scientific evidence.",
        Sources = ["https://www.nasa.gov/fire/", "Unverified source"],
        Generation = new AiGeneration { Mode = "ProviderInference", Provider = "openrouter", Model = "technical-fixture" }
    };

    [Fact]
    public async Task Habitat_RejectsOversizedCombinedContextBeforePersistenceOrInference()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        var client = new StubAiClient { QueryResponse = HabitatResponse() };
        await Assert.ThrowsAsync<InvalidRequestException>(() => new HabitatAnalysisService(db, client).CreateAsync(new()
        {
            EnvironmentId = environment.Id, MaterialId = material.Id, OxygenVolumePercent = 21, PressureKPa = 100,
            AdditionalParameters = Enumerable.Range(0, 10).ToDictionary(x => $"condition{x}", _ => new string('x', 500))
        }, CancellationToken.None));
        Assert.Null(client.LastQuery);
        Assert.Empty(await db.HabitatAnalyses.ToListAsync());
    }

    [Fact]
    public async Task Habitat_InvalidCitationDoesNotPersistPartialAnswerOrSources()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, material) = await AddCatalogAsync(db);
        var response = HabitatResponse();
        response.Sources.Add(new string('x', 501));
        var service = new HabitatAnalysisService(db, new StubAiClient { QueryResponse = response });
        var error = await Assert.ThrowsAsync<PersistedExternalFailureException>(() => service.CreateAsync(new()
        { EnvironmentId = environment.Id, MaterialId = material.Id, OxygenVolumePercent = 21, PressureKPa = 100 }, CancellationToken.None));
        var saved = await db.HabitatAnalyses.SingleAsync(x => x.Id == error.RecordId);
        Assert.Equal(AnalysisStatus.Failed, saved.Status);
        Assert.Null(saved.Explanation);
        Assert.Null(saved.ModelName);
        Assert.Empty(await db.AnalysisCitations.ToListAsync());
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

    [Fact]
    public async Task Knowledge_MatchesApprovedUrls_PreservesUnmatchedUrls_AndDoesNotGuessAmbiguousSources()
    {
        await using var db = CatalogTestSupport.CreateContext();
        var (environment, _) = await AddCatalogAsync(db);
        db.ResearchSources.AddRange(
            new ResearchSource { Title = "NASA source", SourceUrl = "https://www.nasa.gov/research/fire/", CurationStatus = CurationStatus.ApprovedForDisplay },
            new ResearchSource { Title = "Not approved", SourceUrl = "https://www.nasa.gov/unapproved/", CurationStatus = CurationStatus.Draft },
            new ResearchSource { Title = "Duplicate title", CurationStatus = CurationStatus.ApprovedForDisplay },
            new ResearchSource { Title = "Duplicate title", CurationStatus = CurationStatus.ApprovedForDisplay });
        await db.SaveChangesAsync();
        var service = new KnowledgeQueryService(db, new StubAiClient { QueryResponse = new AiQueryResponse
        {
            Success = true, Answer = "Technical citation fixture, not provider inference.",
            Sources = ["https://WWW.NASA.GOV/research/fire/#section", "https://www.nasa.gov/unapproved/", "Duplicate title", "https://www.nasa.gov/research/FIRE/"]
        } });

        var created = await service.CreateAsync(new() { EnvironmentId = environment.Id, Question = "URL citation regression" }, CancellationToken.None);
        var saved = await service.GetAsync(created.Id, CancellationToken.None);
        Assert.Equal(4, saved!.Citations.Count);
        Assert.Contains(saved.Citations, x => x.MatchStatus == "Matched" && x.Source!.Title == "NASA source");
        Assert.Contains(saved.Citations, x => x.MatchStatus == "Unmatched" && x.RawUrl == "https://www.nasa.gov/unapproved/");
        Assert.Contains(saved.Citations, x => x.MatchStatus == "Unmatched" && x.RawTitle == "Duplicate title");
        Assert.Contains(saved.Citations, x => x.MatchStatus == "Unmatched" && x.RawUrl == "https://www.nasa.gov/research/FIRE/");
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
        public AiQueryRequest? LastQuery { get; private set; }
        public Task<AiQueryResponse> QueryAsync(AiQueryRequest request, CancellationToken cancellationToken) { LastQuery = request; Cancel?.Cancel(); cancellationToken.ThrowIfCancellationRequested(); return QueryFailure is { } failure ? throw new VulcanXServiceException(failure, "failure") : Task.FromResult(QueryResponse ?? new AiQueryResponse()); }
        public Task<StressTestResponse> RunStressTestAsync(StressTestRequest request, CancellationToken cancellationToken) { Cancel?.Cancel(); cancellationToken.ThrowIfCancellationRequested(); return StressFailure is { } failure ? throw new VulcanXServiceException(failure, "failure") : Task.FromResult(StressResponse ?? new StressTestResponse()); }
        public Task<HazardEvaluationResponse> EvaluateHazardAsync(HazardEvaluationRequest request, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<DatasetCatalogResponse> GetDatasetsAsync(CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<VulcanXHealthResponse> GetHealthAsync(CancellationToken cancellationToken) => throw new NotSupportedException();
    }
}
