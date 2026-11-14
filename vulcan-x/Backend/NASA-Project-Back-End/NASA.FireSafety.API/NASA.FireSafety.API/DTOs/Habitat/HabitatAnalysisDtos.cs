using System.ComponentModel.DataAnnotations;

namespace NASA.FireSafety.API.DTOs.Habitat;

public sealed class CreateHabitatAnalysisRequest
{
    [Range(1, int.MaxValue)] public int EnvironmentId { get; init; }
    [Range(1, int.MaxValue)] public int MaterialId { get; init; }
    [Range(typeof(decimal), "0", "100")] public decimal? OxygenVolumePercent { get; init; }
    [Range(typeof(decimal), "0.000001", "999999")] public decimal? PressureKPa { get; init; }
    [Range(typeof(decimal), "-273.15", "999999")] public decimal? TemperatureCelsius { get; init; }
    public string? GravityRegime { get; init; }
    [Range(typeof(decimal), "0", "999999")] public decimal? EffectiveGravityG { get; init; }
    public Dictionary<string, string>? AdditionalParameters { get; init; }
    [MaxLength(10)] public string? Language { get; init; }
}

public sealed record HabitatAnalysisResponseDto(Guid Id, string Status, DateTime RequestedAt, HabitatCatalogReferenceDto Environment, HabitatCatalogReferenceDto Material, HabitatInputsDto Inputs, HabitatResultDto? Result, HabitatErrorDto? Error, string Disclaimer, HabitatGenerationDto? Generation = null);
public sealed record HabitatGenerationDto(string Mode, string? Provider, string? Model);
public sealed record HabitatCatalogReferenceDto(int Id, string Code, string Name);
public sealed record HabitatInputsDto(InputValueDto OxygenVolumePercent, InputValueDto PressureKPa, InputValueDto TemperatureCelsius, GravityInputDto Gravity);
public sealed record InputValueDto(decimal? Value, string Origin, string? MeasurementBasis = null);
public sealed record GravityInputDto(string? Regime, decimal? EffectiveGravityG, string Origin);
public sealed record HabitatResultDto(string? RiskLabel, string? AnalysisBasis, bool IsMock, bool IsScientificallyValidated, string? Explanation, string? Limitations, IReadOnlyList<AnalysisFactorDto> Factors, IReadOnlyList<CitationDto> Citations);
public sealed record AnalysisFactorDto(string Name, string? Description, string? Direction);
public sealed record CitationDto(string MatchStatus, SourceReferenceDto? Source, string? RawTitle, string? RawUrl, string? Excerpt);
public sealed record SourceReferenceDto(int Id, string Title, string? Doi, string? Url);
public sealed record HabitatErrorDto(string? Code, string? Message);
