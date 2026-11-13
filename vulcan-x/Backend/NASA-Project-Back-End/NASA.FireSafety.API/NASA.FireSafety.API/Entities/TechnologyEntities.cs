namespace NASA.FireSafety.API.Entities;

public sealed class Technology
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public TechnologyCategory Category { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? SpaceOriginSummary { get; set; }
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<TechnologyApplication> Applications { get; } = [];
    public ICollection<TechnologyExperiment> TechnologyExperiments { get; } = [];
    public ICollection<TechnologySource> TechnologySources { get; } = [];
}

public sealed class TechnologyApplication
{
    public int Id { get; set; }
    public int TechnologyId { get; set; }
    public Technology Technology { get; set; } = null!;
    public TechnologyApplicationDomain Domain { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TechnologyEvidenceLevel EvidenceLevel { get; set; }
    public int? ResearchSourceId { get; set; }
    public ResearchSource? ResearchSource { get; set; }
    public int SortOrder { get; set; }
}
