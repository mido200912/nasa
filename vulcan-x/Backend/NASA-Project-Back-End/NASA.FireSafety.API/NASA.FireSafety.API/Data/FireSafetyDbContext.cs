using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Entities;

namespace NASA.FireSafety.API.Data;

public sealed class FireSafetyDbContext(DbContextOptions<FireSafetyDbContext> options) : DbContext(options)
{
    public DbSet<ResearchSource> ResearchSources => Set<ResearchSource>();
    public DbSet<SpaceEnvironment> SpaceEnvironments => Set<SpaceEnvironment>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<MaterialProperty> MaterialProperties => Set<MaterialProperty>();
    public DbSet<Experiment> Experiments => Set<Experiment>();
    public DbSet<ExperimentParameter> ExperimentParameters => Set<ExperimentParameter>();
    public DbSet<ExperimentMaterial> ExperimentMaterials => Set<ExperimentMaterial>();
    public DbSet<ExperimentSource> ExperimentSources => Set<ExperimentSource>();
    public DbSet<HabitatAnalysis> HabitatAnalyses => Set<HabitatAnalysis>();
    public DbSet<AnalysisFactor> AnalysisFactors => Set<AnalysisFactor>();
    public DbSet<AnalysisCitation> AnalysisCitations => Set<AnalysisCitation>();
    public DbSet<KnowledgeQuery> KnowledgeQueries => Set<KnowledgeQuery>();
    public DbSet<KnowledgeCitation> KnowledgeCitations => Set<KnowledgeCitation>();
    public DbSet<Technology> Technologies => Set<Technology>();
    public DbSet<TechnologyApplication> TechnologyApplications => Set<TechnologyApplication>();
    public DbSet<TechnologyExperiment> TechnologyExperiments => Set<TechnologyExperiment>();
    public DbSet<TechnologySource> TechnologySources => Set<TechnologySource>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FireSafetyDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
