namespace NASA.FireSafety.API.Interfaces;

public interface ICuratedCatalogSeeder
{
    Task<CuratedCatalogSeedResult> SeedAsync(CancellationToken cancellationToken);
}

public sealed record CuratedCatalogSeedResult(int AddedResearchSources, int AddedEnvironments, int AddedMaterials, int AddedExperiments, int AddedExperimentSources, int AddedTechnologies, int AddedTechnologyApplications);
