namespace NASA.FireSafety.API.Entities;

public sealed class ResearchSource
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public ResearchSourceType SourceType { get; set; }
    public ResearchOrigin Origin { get; set; }
    public string? ExternalSystem { get; set; }
    public string? ExternalId { get; set; }
    public string? DoiNormalized { get; set; }
    public string? SourceUrl { get; set; }
    public string? Publisher { get; set; }
    public DateOnly? PublicationDate { get; set; }
    public string? CitationText { get; set; }
    public string? LicenseText { get; set; }
    public CurationStatus CurationStatus { get; set; } = CurationStatus.Draft;
    public DateTime? AccessedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<SpaceEnvironment> EnvironmentDefaults { get; } = [];
    public ICollection<MaterialProperty> MaterialProperties { get; } = [];
    public ICollection<ExperimentParameter> ExperimentParameters { get; } = [];
    public ICollection<ExperimentSource> ExperimentSources { get; } = [];
    public ICollection<AnalysisCitation> AnalysisCitations { get; } = [];
    public ICollection<KnowledgeCitation> KnowledgeCitations { get; } = [];
    public ICollection<TechnologyApplication> TechnologyApplications { get; } = [];
    public ICollection<TechnologySource> TechnologySources { get; } = [];
}

public sealed class SpaceEnvironment
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public EnvironmentType EnvironmentType { get; set; }
    public string? Description { get; set; }
    public decimal? DefaultOxygenVolumePercent { get; set; }
    public decimal? DefaultPressureKPa { get; set; }
    public decimal? DefaultTemperatureCelsius { get; set; }
    public GravityRegime? DefaultGravityRegime { get; set; }
    public decimal? DefaultEffectiveGravityG { get; set; }
    public int? DefaultsSourceId { get; set; }
    public ResearchSource? DefaultsSource { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public ICollection<HabitatAnalysis> HabitatAnalyses { get; } = [];
}

public sealed class Material
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public ICollection<MaterialProperty> Properties { get; } = [];
    public ICollection<ExperimentMaterial> ExperimentMaterials { get; } = [];
    public ICollection<HabitatAnalysis> HabitatAnalyses { get; } = [];
}

public sealed class MaterialProperty
{
    public int Id { get; set; }
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public string PropertyKey { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public PropertyValueType ValueType { get; set; }
    public decimal? ValueNumber { get; set; }
    public string? ValueText { get; set; }
    public string? Unit { get; set; }
    public decimal? Uncertainty { get; set; }
    public int? ResearchSourceId { get; set; }
    public ResearchSource? ResearchSource { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class Experiment
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ExternalSystem { get; set; }
    public string? ExternalId { get; set; }
    public string Discipline { get; set; } = string.Empty;
    public string? Platform { get; set; }
    public string? GravityCondition { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? KeyFindings { get; set; }
    public CurationStatus CurationStatus { get; set; } = CurationStatus.Draft;
    public DateTime? CuratedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<ExperimentParameter> Parameters { get; } = [];
    public ICollection<ExperimentMaterial> ExperimentMaterials { get; } = [];
    public ICollection<ExperimentSource> ExperimentSources { get; } = [];
    public ICollection<TechnologyExperiment> TechnologyExperiments { get; } = [];
}

public sealed class ExperimentParameter
{
    public int Id { get; set; }
    public int ExperimentId { get; set; }
    public Experiment Experiment { get; set; } = null!;
    public string ParameterKey { get; set; } = string.Empty;
    public ExperimentParameterCategory Category { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? OriginalLabel { get; set; }
    public ExperimentParameterValueType ValueType { get; set; }
    public decimal? ValueNumber { get; set; }
    public string? ValueText { get; set; }
    public decimal? ValueMin { get; set; }
    public decimal? ValueMax { get; set; }
    public string? Unit { get; set; }
    public decimal? Uncertainty { get; set; }
    public int ResearchSourceId { get; set; }
    public ResearchSource ResearchSource { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
