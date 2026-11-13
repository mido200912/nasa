namespace NASA.FireSafety.API.Entities;

public sealed class HabitatAnalysis
{
    public Guid Id { get; set; }
    public int SpaceEnvironmentId { get; set; }
    public SpaceEnvironment SpaceEnvironment { get; set; } = null!;
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public decimal? OxygenVolumePercent { get; set; }
    public decimal? PressureKPa { get; set; }
    public decimal? TemperatureCelsius { get; set; }
    public GravityRegime? GravityRegime { get; set; }
    public decimal? EffectiveGravityG { get; set; }
    public string InputOriginsJson { get; set; } = string.Empty;
    public string? AdditionalParametersJson { get; set; }
    public AnalysisStatus Status { get; set; } = AnalysisStatus.Pending;
    public string? RiskLabel { get; set; }
    public AnalysisBasis? AnalysisBasis { get; set; }
    public bool IsMock { get; set; }
    public string? Explanation { get; set; }
    public string? Limitations { get; set; }
    public string? ModelName { get; set; }
    public string? ModelVersion { get; set; }
    public string? ContractVersion { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid CorrelationId { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? DurationMs { get; set; }
    public ICollection<AnalysisFactor> Factors { get; } = [];
    public ICollection<AnalysisCitation> Citations { get; } = [];
}

public sealed class AnalysisFactor
{
    public int Id { get; set; }
    public Guid HabitatAnalysisId { get; set; }
    public HabitatAnalysis HabitatAnalysis { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AnalysisFactorDirection? Direction { get; set; }
    public int SortOrder { get; set; }
}

public sealed class AnalysisCitation
{
    public int Id { get; set; }
    public Guid HabitatAnalysisId { get; set; }
    public HabitatAnalysis HabitatAnalysis { get; set; } = null!;
    public int? ResearchSourceId { get; set; }
    public ResearchSource? ResearchSource { get; set; }
    public CitationMatchStatus MatchStatus { get; set; }
    public string? RawTitle { get; set; }
    public string? RawUrl { get; set; }
    public string? RawDoiNormalized { get; set; }
    public string? RawExternalSystem { get; set; }
    public string? RawExternalId { get; set; }
    public string? Excerpt { get; set; }
    public int SortOrder { get; set; }
}

public sealed class KnowledgeQuery
{
    public Guid Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string? FiltersJson { get; set; }
    public string? Answer { get; set; }
    public AnalysisStatus Status { get; set; } = AnalysisStatus.Pending;
    public KnowledgeGroundingStatus? GroundingStatus { get; set; }
    public bool IsMock { get; set; }
    public string? ModelName { get; set; }
    public string? ModelVersion { get; set; }
    public string? ContractVersion { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid CorrelationId { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? DurationMs { get; set; }
    public ICollection<KnowledgeCitation> Citations { get; } = [];
}

public sealed class KnowledgeCitation
{
    public int Id { get; set; }
    public Guid KnowledgeQueryId { get; set; }
    public KnowledgeQuery KnowledgeQuery { get; set; } = null!;
    public int? ResearchSourceId { get; set; }
    public ResearchSource? ResearchSource { get; set; }
    public CitationMatchStatus MatchStatus { get; set; }
    public string? RawTitle { get; set; }
    public string? RawUrl { get; set; }
    public string? RawDoiNormalized { get; set; }
    public string? RawExternalSystem { get; set; }
    public string? RawExternalId { get; set; }
    public string? Excerpt { get; set; }
    public decimal? RelevanceScore { get; set; }
    public int SortOrder { get; set; }
}
