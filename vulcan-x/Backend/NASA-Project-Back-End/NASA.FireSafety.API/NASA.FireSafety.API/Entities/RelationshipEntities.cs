namespace NASA.FireSafety.API.Entities;

public sealed class ExperimentMaterial
{
    public int ExperimentId { get; set; }
    public Experiment Experiment { get; set; } = null!;
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public string? Role { get; set; }
}

public sealed class ExperimentSource
{
    public int ExperimentId { get; set; }
    public Experiment Experiment { get; set; } = null!;
    public int ResearchSourceId { get; set; }
    public ResearchSource ResearchSource { get; set; } = null!;
    public ExperimentSourceRole Role { get; set; }
}

public sealed class TechnologyExperiment
{
    public int TechnologyId { get; set; }
    public Technology Technology { get; set; } = null!;
    public int ExperimentId { get; set; }
    public Experiment Experiment { get; set; } = null!;
}

public sealed class TechnologySource
{
    public int TechnologyId { get; set; }
    public Technology Technology { get; set; } = null!;
    public int ResearchSourceId { get; set; }
    public ResearchSource ResearchSource { get; set; } = null!;
}
