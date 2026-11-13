using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.DTOs.Habitat;
using NASA.FireSafety.API.Entities;
using NASA.FireSafety.API.Interfaces;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;

namespace NASA.FireSafety.API.Services;

public sealed class HabitatAnalysisService(FireSafetyDbContext dbContext, IVulcanXAiClient aiClient) : IHabitatAnalysisService
{
    private const decimal KpaPerPsi = 6.894757m;

    public async Task<HabitatAnalysisResponseDto> CreateAsync(CreateHabitatAnalysisRequest request, CancellationToken cancellationToken)
    {
        ValidateRequest(request);
        var environment = await dbContext.SpaceEnvironments.SingleOrDefaultAsync(x => x.Id == request.EnvironmentId && x.IsActive, cancellationToken)
            ?? throw new CatalogRecordNotFoundException("environment");
        var material = await dbContext.Materials.SingleOrDefaultAsync(x => x.Id == request.MaterialId && x.IsActive, cancellationToken)
            ?? throw new CatalogRecordNotFoundException("material");

        var input = ApplyDocumentedDefaults(request, environment);
        if (input.Oxygen is null || input.Pressure is null)
            throw new ScientificInputRequiredException("oxygenVolumePercent and pressureKPa are required by the currently configured Vulcan-X stress-test contract.");
        var habitat = MapHabitat(environment.Code);
        if (habitat is null)
            throw new ScientificInputRequiredException("The selected environment is not mapped to the current Vulcan-X stress-test contract.");

        var analysis = new HabitatAnalysis
        {
            Id = Guid.NewGuid(), SpaceEnvironmentId = environment.Id, MaterialId = material.Id,
            OxygenVolumePercent = input.Oxygen, PressureKPa = input.Pressure, TemperatureCelsius = input.Temperature,
            GravityRegime = input.GravityRegime, EffectiveGravityG = input.EffectiveGravity,
            InputOriginsJson = JsonSerializer.Serialize(input.Origins),
            AdditionalParametersJson = request.AdditionalParameters is null ? null : JsonSerializer.Serialize(request.AdditionalParameters),
            Status = AnalysisStatus.Running, CorrelationId = Guid.NewGuid(), IsMock = false
        };
        dbContext.HabitatAnalyses.Add(analysis);

        var stopwatch = Stopwatch.StartNew();
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            var aiResponse = await aiClient.RunStressTestAsync(new StressTestRequest
            {
                Habitat = habitat, OxygenConcentration = (double)input.Oxygen.Value,
                PressurePsi = (double)(input.Pressure.Value / KpaPerPsi), MaterialType = material.Name
            }, cancellationToken);
            cancellationToken.ThrowIfCancellationRequested();
            if (!aiResponse.Success || string.IsNullOrWhiteSpace(aiResponse.SimulationResult.SafetyStatus))
                throw new VulcanXServiceException(VulcanXFailureKind.InvalidResponse, "The AI service returned an unsuccessful habitat response.");

            analysis.Status = AnalysisStatus.Completed;
            analysis.RiskLabel = Truncate(aiResponse.SimulationResult.SafetyStatus, 30);
            analysis.AnalysisBasis = AnalysisBasis.LlmInterpretationOnly;
            analysis.Explanation = aiResponse.SimulationResult.Recommendation;
            analysis.Limitations = "AI interpretation only. The current Vulcan-X stress-test response does not provide structured scientific citations.";
            analysis.CompletedAt = DateTime.UtcNow;
            analysis.DurationMs = (int)stopwatch.ElapsedMilliseconds;
            analysis.Factors.Add(new AnalysisFactor
            {
                Name = "Ignition speed multiplier", Description = $"AI-reported value: {aiResponse.SimulationResult.IgnitionSpeedMultiplier.ToString(System.Globalization.CultureInfo.InvariantCulture)}.",
                Direction = AnalysisFactorDirection.Unclear, SortOrder = 0
            });
            await dbContext.SaveChangesAsync(cancellationToken);
            return ToDto(analysis, environment, material);
        }
        catch (VulcanXServiceException exception)
        {
            await RecordFailureAsync(analysis.Id, FailureCode(exception.Kind), (int)stopwatch.ElapsedMilliseconds);
            throw new PersistedExternalFailureException(analysis.Id, exception.Kind);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            await RecordFailureAsync(analysis.Id, "REQUEST_CANCELLED", (int)stopwatch.ElapsedMilliseconds);
            throw;
        }
        catch (Exception)
        {
            await RecordFailureAsync(analysis.Id, "WORKFLOW_FAILED", (int)stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    private async Task RecordFailureAsync(Guid id, string code, int duration)
    {
        dbContext.ChangeTracker.Clear();
        using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var saved = await dbContext.HabitatAnalyses.SingleOrDefaultAsync(x => x.Id == id, cleanup.Token);
        if (saved is null || saved.Status is AnalysisStatus.Completed or AnalysisStatus.Failed) return;
        saved.Status = AnalysisStatus.Failed;
        saved.ErrorCode = code;
        saved.ErrorMessage = "The habitat analysis could not be completed.";
        saved.CompletedAt = DateTime.UtcNow;
        saved.DurationMs = duration;
        await dbContext.SaveChangesAsync(cleanup.Token);
    }

    public async Task<HabitatAnalysisResponseDto?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var analysis = await dbContext.HabitatAnalyses.Include(x => x.SpaceEnvironment).Include(x => x.Material).Include(x => x.Factors).Include(x => x.Citations).ThenInclude(x => x.ResearchSource)
            .AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return analysis is null ? null : ToDto(analysis, analysis.SpaceEnvironment, analysis.Material);
    }

    private static void ValidateRequest(CreateHabitatAnalysisRequest request)
    {
        if (request.EffectiveGravityG.HasValue && string.IsNullOrWhiteSpace(request.GravityRegime)) throw new InvalidRequestException("effectiveGravityG requires gravityRegime.");
        if (!string.IsNullOrWhiteSpace(request.GravityRegime) && !Enum.TryParse<GravityRegime>(request.GravityRegime, true, out _)) throw new InvalidRequestException("gravityRegime is invalid.");
        if (request.AdditionalParameters is { Count: > 20 } || request.AdditionalParameters?.Any(x => x.Key.Length > 100 || x.Value.Length > 500) == true) throw new InvalidRequestException("additionalParameters exceeds the permitted shape.");
    }

    private static InputSnapshot ApplyDocumentedDefaults(CreateHabitatAnalysisRequest request, SpaceEnvironment environment)
    {
        var mayUseDefaults = environment.DefaultsSourceId.HasValue;
        var oxygen = request.OxygenVolumePercent ?? (mayUseDefaults ? environment.DefaultOxygenVolumePercent : null);
        var pressure = request.PressureKPa ?? (mayUseDefaults ? environment.DefaultPressureKPa : null);
        var temperature = request.TemperatureCelsius ?? (mayUseDefaults ? environment.DefaultTemperatureCelsius : null);
        var gravity = !string.IsNullOrWhiteSpace(request.GravityRegime) ? Enum.Parse<GravityRegime>(request.GravityRegime, true) : (mayUseDefaults ? environment.DefaultGravityRegime : null);
        var effectiveGravity = request.EffectiveGravityG ?? (mayUseDefaults ? environment.DefaultEffectiveGravityG : null);
        string Origin<T>(T? provided, T? value) where T : struct => provided.HasValue ? "UserProvided" : value.HasValue ? "SourcedDefault" : "Missing";
        return new InputSnapshot(oxygen, pressure, temperature, gravity, effectiveGravity, new
        {
            oxygenVolumePercent = Origin(request.OxygenVolumePercent, oxygen), pressureKPa = Origin(request.PressureKPa, pressure),
            temperatureCelsius = Origin(request.TemperatureCelsius, temperature), gravity = string.IsNullOrWhiteSpace(request.GravityRegime) ? gravity is null ? "Missing" : "SourcedDefault" : "UserProvided",
            effectiveGravityG = Origin(request.EffectiveGravityG, effectiveGravity), defaultsSourceId = mayUseDefaults ? environment.DefaultsSourceId : null
        });
    }

    private static HabitatAnalysisResponseDto ToDto(HabitatAnalysis analysis, SpaceEnvironment environment, Material material) => new(analysis.Id, analysis.Status.ToString(), analysis.RequestedAt,
        new HabitatCatalogReferenceDto(environment.Id, environment.Code, environment.Name), new HabitatCatalogReferenceDto(material.Id, material.Code, material.Name),
        new HabitatInputsDto(new InputValueDto(analysis.OxygenVolumePercent, Origin(analysis, "oxygenVolumePercent"), "VolumePercent"), new InputValueDto(analysis.PressureKPa, Origin(analysis, "pressureKPa")), new InputValueDto(analysis.TemperatureCelsius, Origin(analysis, "temperatureCelsius")), new GravityInputDto(analysis.GravityRegime?.ToString(), analysis.EffectiveGravityG, Origin(analysis, "gravity"))),
        analysis.Status == AnalysisStatus.Failed ? null : new HabitatResultDto(analysis.RiskLabel, analysis.AnalysisBasis?.ToString(), analysis.IsMock, false, analysis.Explanation, analysis.Limitations,
            analysis.Factors.OrderBy(x => x.SortOrder).Select(x => new AnalysisFactorDto(x.Name, x.Description, x.Direction?.ToString())).ToList(), analysis.Citations.OrderBy(x => x.SortOrder).Select(ToCitation).ToList()),
        analysis.Status == AnalysisStatus.Failed ? new HabitatErrorDto(analysis.ErrorCode, analysis.ErrorMessage) : null,
        "AI interpretation, not a scientifically validated safety decision.");

    private static CitationDto ToCitation(AnalysisCitation x) => new(x.MatchStatus.ToString(), x.ResearchSource is null ? null : new SourceReferenceDto(x.ResearchSource.Id, x.ResearchSource.Title, x.ResearchSource.DoiNormalized, x.ResearchSource.SourceUrl), x.RawTitle, x.RawUrl, x.Excerpt);
    private static string Origin(HabitatAnalysis analysis, string key) => JsonDocument.Parse(analysis.InputOriginsJson).RootElement.TryGetProperty(key, out var value) ? value.GetString() ?? "Missing" : "Missing";
    private static string? MapHabitat(string code) => code.ToUpperInvariant() switch { "ISS" => "iss", "LUNAR_HABITAT" => "lunar", "MARS_HABITAT" => "mars", _ => null };
    private static string FailureCode(VulcanXFailureKind kind) => kind switch { VulcanXFailureKind.Timeout => "VULCANX_TIMEOUT", VulcanXFailureKind.InvalidResponse => "VULCANX_INVALID_RESPONSE", VulcanXFailureKind.UpstreamFailure => "VULCANX_UPSTREAM_FAILURE", _ => "VULCANX_UNAVAILABLE" };
    private static string Truncate(string text, int max) => text.Length <= max ? text : text[..max];
    private sealed record InputSnapshot(decimal? Oxygen, decimal? Pressure, decimal? Temperature, GravityRegime? GravityRegime, decimal? EffectiveGravity, object Origins);
}

public sealed class CatalogRecordNotFoundException(string resource) : Exception { public string Resource { get; } = resource; }
public sealed class ScientificInputRequiredException(string message) : Exception(message);
public sealed class InvalidRequestException(string message) : Exception(message);
