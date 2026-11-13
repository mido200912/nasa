namespace NASA.FireSafety.API.DTOs.Catalog;

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public sealed record EnvironmentListItemDto(
    int Id, string Code, string Name, string Type, EnvironmentDefaultsDto? Defaults);

public sealed record EnvironmentDefaultsDto(
    decimal? OxygenVolumePercent, decimal? PressureKPa, decimal? TemperatureCelsius,
    string? GravityRegime, decimal? EffectiveGravityG, int? SourceId);

public sealed record MaterialListItemDto(int Id, string Code, string Name, string? Category);
public sealed record MaterialDetailDto(int Id, string Code, string Name, string? Category, string? Description, IReadOnlyList<MaterialPropertyDto> Properties);
public sealed record MaterialPropertyDto(string Key, string DisplayName, string ValueType, decimal? ValueNumber, string? ValueText, string? Unit, decimal? Uncertainty, int? ResearchSourceId);

public sealed record ExperimentListItemDto(int Id, string Title, string Discipline, string? Platform, string? GravityCondition);
public sealed record ExperimentDetailDto(int Id, string Title, string? ExternalSystem, string? ExternalId, string Discipline, string? Platform, string? GravityCondition, string Summary, string? KeyFindings, IReadOnlyList<ExperimentParameterDto> Parameters, IReadOnlyList<ExperimentMaterialDto> Materials, IReadOnlyList<ExperimentSourceDto> Sources);
public sealed record ExperimentParameterDto(string Key, string Category, string DisplayName, string? OriginalLabel, string ValueType, decimal? ValueNumber, string? ValueText, decimal? ValueMin, decimal? ValueMax, string? Unit, decimal? Uncertainty, int ResearchSourceId);
public sealed record ExperimentMaterialDto(int Id, string Code, string Name, string? Role);
public sealed record ExperimentSourceDto(int Id, string Title, string Role, string? Doi, string? Url);

public sealed record SourceDetailDto(int Id, string Title, string SourceType, string Origin, string? ExternalSystem, string? ExternalId, string? Doi, string? Url, string CurationStatus, DateOnly? PublicationDate, string? Publisher, string? CitationText);

public sealed record TechnologyListItemDto(int Id, string Slug, string Name, string Category, string Summary);
public sealed record TechnologyDetailDto(int Id, string Slug, string Name, string Category, string Summary, string? Description, string? SpaceOriginSummary, IReadOnlyList<TechnologyApplicationDto> Applications, IReadOnlyList<RelatedExperimentDto> RelatedExperiments);
public sealed record TechnologyApplicationDto(int Id, string Domain, string Title, string Description, string EvidenceLevel, SourceReferenceDto? Source);
public sealed record RelatedExperimentDto(int Id, string Title, string Discipline, string? Platform, string? GravityCondition);
public sealed record SourceReferenceDto(int Id, string Title, string? Doi, string? Url);

public class PageQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public sealed class MaterialListQuery : PageQuery
{
    public string? Search { get; init; }
    public string? Category { get; init; }
}

public sealed class ExperimentListQuery : PageQuery
{
    public string? Search { get; init; }
    public string? Discipline { get; init; }
    public string? GravityCondition { get; init; }
    public int? MaterialId { get; init; }
}

public sealed class TechnologyListQuery : PageQuery
{
    public string? Search { get; init; }
    public string? Category { get; init; }
    public string? Domain { get; init; }
}
