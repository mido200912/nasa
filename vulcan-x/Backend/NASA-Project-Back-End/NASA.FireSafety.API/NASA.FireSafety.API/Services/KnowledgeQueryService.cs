using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.DTOs.Habitat;
using NASA.FireSafety.API.DTOs.Knowledge;
using NASA.FireSafety.API.Entities;
using NASA.FireSafety.API.Interfaces;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;

namespace NASA.FireSafety.API.Services;

public sealed class KnowledgeQueryService(FireSafetyDbContext dbContext, IVulcanXAiClient aiClient, ILogger<KnowledgeQueryService>? logger = null) : IKnowledgeQueryService
{
    public async Task<KnowledgeQueryResponseDto> CreateAsync(CreateKnowledgeQueryRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Question) || request.Question.Trim().Length is < 3 or > 2000) throw new InvalidRequestException("question must contain 3 to 2000 non-whitespace characters.");
        if (request.YearFrom.HasValue && request.YearTo.HasValue && request.YearFrom > request.YearTo) throw new InvalidRequestException("yearFrom must not be after yearTo.");
        var environment = await dbContext.SpaceEnvironments.SingleOrDefaultAsync(x => x.Id == request.EnvironmentId && x.IsActive, cancellationToken) ?? throw new CatalogRecordNotFoundException("environment");
        if (request.MaterialId.HasValue && !await dbContext.Materials.AnyAsync(x => x.Id == request.MaterialId && x.IsActive, cancellationToken)) throw new CatalogRecordNotFoundException("material");
        var aiEnvironment = MapEnvironment(environment.Code) ?? throw new InvalidRequestException("The selected environment is not mapped to the current Vulcan-X knowledge contract.");

        var query = new KnowledgeQuery
        {
            Id = Guid.NewGuid(), Question = request.Question.Trim(), FiltersJson = JsonSerializer.Serialize(new { request.EnvironmentId, request.MaterialId, request.YearFrom, request.YearTo, request.MaxSources }),
            Status = AnalysisStatus.Running, IsMock = false, CorrelationId = Guid.NewGuid()
        };
        dbContext.KnowledgeQueries.Add(query);
        var stopwatch = Stopwatch.StartNew();
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            var ai = await aiClient.QueryAsync(new AiQueryRequest { Question = query.Question, Environment = aiEnvironment }, cancellationToken);
            cancellationToken.ThrowIfCancellationRequested();
            if (!ai.Success || string.IsNullOrWhiteSpace(ai.Answer) || ai.Sources is null
                || (ai.Generation is not null && (ai.Generation.Mode != "ProviderInference" || ai.Generation.Provider != "openrouter" || string.IsNullOrWhiteSpace(ai.Generation.Model) || ai.Generation.Model.Length > 100)))
                throw new VulcanXServiceException(VulcanXFailureKind.InvalidResponse, "The AI service returned an unsuccessful knowledge response.");

            query.Answer = ai.Answer;
            // Existing columns retain provenance without a new schema/migration.
            query.ModelName = ai.Generation?.Model;
            query.ModelVersion = ai.Generation?.Provider;
            query.ContractVersion = ai.Generation is null ? null : "knowledge-inference/1";
            query.Status = AnalysisStatus.Completed;
            query.CompletedAt = DateTime.UtcNow;
            query.DurationMs = (int)stopwatch.ElapsedMilliseconds;
            if (ai.Sources.Count > 100) throw new VulcanXServiceException(VulcanXFailureKind.InvalidResponse, "Too many source references.");
            var approvedSources = await dbContext.ResearchSources
                .Where(source => source.CurationStatus == CurationStatus.ApprovedForDisplay).ToListAsync(cancellationToken);
            for (var index = 0; index < ai.Sources.Count; index++)
            {
                var rawSource = ai.Sources[index]?.Trim();
                if (string.IsNullOrWhiteSpace(rawSource)) continue;
                var isUrl = CitationMatcher.NormalizeUrl(rawSource) is not null;
                if (rawSource.Length > (isUrl ? 2000 : 500))
                    throw new VulcanXServiceException(VulcanXFailureKind.InvalidResponse, "Source reference exceeds the storage contract.");
                var matched = CitationMatcher.Match(approvedSources, rawSource);
                query.Citations.Add(new KnowledgeCitation
                {
                    MatchStatus = matched is null ? CitationMatchStatus.Unmatched : CitationMatchStatus.Matched,
                    ResearchSourceId = matched?.Id, ResearchSource = matched,
                    RawTitle = matched is null && !isUrl ? rawSource : null,
                    RawUrl = matched is null && isUrl ? rawSource : null,
                    SortOrder = query.Citations.Count
                });
            }
            query.GroundingStatus = query.Citations.Count == 0 ? KnowledgeGroundingStatus.NoCitations : query.Citations.Any(x => x.MatchStatus == CitationMatchStatus.Matched) ? KnowledgeGroundingStatus.HasMatchedCitations : KnowledgeGroundingStatus.HasOnlyUnmatchedCitations;
            await dbContext.SaveChangesAsync(cancellationToken);
            Middleware.Operations.Knowledge.Add(1, new KeyValuePair<string, object?>("status", "Completed"));
            logger?.LogInformation("Knowledge terminal {QueryId} {Status} {DurationMs}", query.Id, "Completed", query.DurationMs);
            return ToDto(query);
        }
        catch (VulcanXServiceException exception)
        {
            await RecordFailureAsync(query.Id, FailureCode(exception.Kind), (int)stopwatch.ElapsedMilliseconds);
            throw new PersistedExternalFailureException(query.Id, exception.Kind);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            await RecordFailureAsync(query.Id, "REQUEST_CANCELLED", (int)stopwatch.ElapsedMilliseconds);
            throw;
        }
        catch (Exception)
        {
            await RecordFailureAsync(query.Id, "WORKFLOW_FAILED", (int)stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    private async Task RecordFailureAsync(Guid id, string code, int duration)
    {
        // Discard partial answer/citations; cancellation cleanup must not save success data.
        dbContext.ChangeTracker.Clear();
        using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var saved = await dbContext.KnowledgeQueries.SingleOrDefaultAsync(x => x.Id == id, cleanup.Token);
        if (saved is null || saved.Status is AnalysisStatus.Completed or AnalysisStatus.Failed) return;
        saved.Status = AnalysisStatus.Failed;
        saved.ErrorCode = code;
        saved.ErrorMessage = "The knowledge query could not be completed.";
        saved.CompletedAt = DateTime.UtcNow;
        saved.DurationMs = duration;
        await dbContext.SaveChangesAsync(cleanup.Token);
        Middleware.Operations.Knowledge.Add(1, new KeyValuePair<string, object?>("status", "Failed"));
        logger?.LogWarning("Knowledge terminal {QueryId} {Status} {Category}", id, "Failed", code);
    }

    public async Task<KnowledgeQueryResponseDto?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var query = await dbContext.KnowledgeQueries.Include(x => x.Citations).ThenInclude(x => x.ResearchSource).AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return query is null ? null : ToDto(query);
    }

    private static KnowledgeQueryResponseDto ToDto(KnowledgeQuery query) => new(query.Id, query.Status.ToString(), query.Question, query.Answer, query.GroundingStatus?.ToString(), query.IsMock,
        query.Citations.OrderBy(x => x.SortOrder).Select(x => new KnowledgeCitationDto(x.MatchStatus.ToString(), x.ResearchSource is null ? null : new SourceReferenceDto(x.ResearchSource.Id, x.ResearchSource.Title, x.ResearchSource.DoiNormalized, x.ResearchSource.SourceUrl), x.RawTitle, x.RawUrl, x.Excerpt, x.RelevanceScore)).ToList(),
        query.Status == AnalysisStatus.Failed ? new KnowledgeErrorDto(query.ErrorCode, query.ErrorMessage) : null,
        "AI output is not scientific validation. Verify cited sources and generation provenance.",
        query.ContractVersion == "knowledge-inference/1"
            ? new KnowledgeGenerationDto("ProviderInference", query.ModelVersion, query.ModelName)
            : new KnowledgeGenerationDto("Unspecified", null, null));
    private static string? MapEnvironment(string code) => code.ToUpperInvariant() switch { "ISS" => "iss", "LUNAR_HABITAT" => "lunar_base", "MARS_HABITAT" => "mars_rover", _ => null };
    private static string FailureCode(VulcanXFailureKind kind) => kind switch { VulcanXFailureKind.Timeout => "VULCANX_TIMEOUT", VulcanXFailureKind.InvalidResponse => "VULCANX_INVALID_RESPONSE", VulcanXFailureKind.UpstreamFailure => "VULCANX_UPSTREAM_FAILURE", _ => "VULCANX_UNAVAILABLE" };
}
