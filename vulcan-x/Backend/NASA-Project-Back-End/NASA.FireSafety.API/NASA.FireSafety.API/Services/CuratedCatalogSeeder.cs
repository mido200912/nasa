using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.Entities;
using NASA.FireSafety.API.Interfaces;

namespace NASA.FireSafety.API.Services;

/// <summary>
/// Adds only the small, source-backed demonstration catalog. Existing rows are never changed or deleted.
/// </summary>
public sealed class CuratedCatalogSeeder(FireSafetyDbContext dbContext) : ICuratedCatalogSeeder
{
    private const string NasaPsiSystem = "NASA-PSI";
    private const string NasaScienceSystem = "NASA-Science";
    private const string NasaGlennSystem = "NASA-Glenn";

    public async Task<CuratedCatalogSeedResult> SeedAsync(CancellationToken cancellationToken)
    {
        var result = new SeedCount();
        var psi = await AddResearchSourceIfMissingAsync(new ResearchSource
        {
            Title = "PSI Investigations by Research Area",
            SourceType = ResearchSourceType.PsiDataset,
            Origin = ResearchOrigin.NasaOriginal,
            ExternalSystem = NasaPsiSystem,
            ExternalId = "investigations-by-research-area",
            SourceUrl = "https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/",
            Publisher = "NASA",
            CurationStatus = CurationStatus.ApprovedForDisplay,
            AccessedAt = DateTime.UtcNow
        }, result, cancellationToken);

        var mistSource = await AddResearchSourceIfMissingAsync(new ResearchSource
        {
            Title = "Solid Fuel Ignition and Extinction – Material Ignition and Suppression Test (SoFIE-MIST)",
            SourceType = ResearchSourceType.NasaPublication,
            Origin = ResearchOrigin.NasaOriginal,
            ExternalSystem = NasaScienceSystem,
            ExternalId = "sofie-mist",
            SourceUrl = "https://science.nasa.gov/biological-physical/investigations/sofie-mist/",
            Publisher = "NASA",
            CurationStatus = CurationStatus.ApprovedForDisplay,
            AccessedAt = DateTime.UtcNow
        }, result, cancellationToken);

        var cirSource = await AddResearchSourceIfMissingAsync(new ResearchSource
        {
            Title = "Fluids & Combustion Facility",
            SourceType = ResearchSourceType.NasaPublication,
            Origin = ResearchOrigin.NasaOriginal,
            ExternalSystem = NasaGlennSystem,
            ExternalId = "fluids-combustion-facility",
            SourceUrl = "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/science-facilities-on-the-iss/fluids-combustion-facility/",
            Publisher = "NASA",
            CurationStatus = CurationStatus.ApprovedForDisplay,
            AccessedAt = DateTime.UtcNow
        }, result, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        await AddEnvironmentIfMissingAsync("ISS", "International Space Station", EnvironmentType.OrbitalStation, "Scenario with no seeded atmospheric defaults.", result, cancellationToken);
        await AddEnvironmentIfMissingAsync("LUNAR_HABITAT", "Lunar Habitat Scenario", EnvironmentType.LunarSurface, "Scenario with no seeded atmospheric defaults.", result, cancellationToken);
        await AddEnvironmentIfMissingAsync("MARS_HABITAT", "Mars Habitat Scenario", EnvironmentType.MarsSurface, "Scenario with no seeded atmospheric defaults.", result, cancellationToken);

        var pmma = await dbContext.Materials.SingleOrDefaultAsync(x => x.Code == "PMMA", cancellationToken);
        if (pmma is null)
        {
            pmma = new Material { Code = "PMMA", Name = "PMMA", Category = "Solid fuel", Description = "Material named in the SoFIE-MIST investigation source." };
            dbContext.Materials.Add(pmma);
            result.Materials++;
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        var mist = await dbContext.Experiments.SingleOrDefaultAsync(x => x.ExternalSystem == NasaScienceSystem && x.ExternalId == "sofie-mist", cancellationToken);
        if (mist is null)
        {
            mist = new Experiment
            {
                Title = mistSource.Title,
                ExternalSystem = NasaScienceSystem,
                ExternalId = "sofie-mist",
                Discipline = "Combustion Science",
                Platform = "International Space Station",
                GravityCondition = "Microgravity",
                Summary = "NASA describes this investigation as examining thermally-assisted burning in microgravity while varying air flow speed, oxygen concentration, pressure, and external radiation.",
                CurationStatus = CurationStatus.ApprovedForDisplay
            };
            dbContext.Experiments.Add(mist);
            result.Experiments++;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (!await dbContext.ExperimentSources.AnyAsync(x => x.ExperimentId == mist.Id && x.ResearchSourceId == mistSource.Id, cancellationToken))
        {
            dbContext.ExperimentSources.Add(new ExperimentSource { ExperimentId = mist.Id, ResearchSourceId = mistSource.Id, Role = ExperimentSourceRole.Primary });
            result.ExperimentSources++;
        }
        if (!await dbContext.ExperimentMaterials.AnyAsync(x => x.ExperimentId == mist.Id && x.MaterialId == pmma.Id, cancellationToken))
            dbContext.ExperimentMaterials.Add(new ExperimentMaterial { ExperimentId = mist.Id, MaterialId = pmma.Id, Role = "Test material" });

        var cir = await dbContext.Technologies.SingleOrDefaultAsync(x => x.Slug == "combustion-integrated-rack", cancellationToken);
        if (cir is null)
        {
            cir = new Technology
            {
                Slug = "combustion-integrated-rack",
                Name = "Combustion Integrated Rack",
                Category = TechnologyCategory.Other,
                Summary = "ISS rack dedicated to combustion experimentation.",
                Description = "NASA describes the rack as enabling combustion research relevant to spacecraft fire prevention, detection, and suppression.",
                SpaceOriginSummary = "Located in the International Space Station U.S. Laboratory Module (Destiny).",
                IsPublished = true,
                UpdatedAt = DateTime.UtcNow
            };
            dbContext.Technologies.Add(cir);
            result.Technologies++;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        if (!await dbContext.TechnologyApplications.AnyAsync(x => x.TechnologyId == cir.Id && x.SortOrder == 0, cancellationToken))
        {
            dbContext.TechnologyApplications.Add(new TechnologyApplication
            {
                TechnologyId = cir.Id,
                Domain = TechnologyApplicationDomain.Space,
                Title = "Microgravity combustion research",
                Description = "NASA documents the facility as supporting combustion investigations addressing spacecraft fire safety.",
                EvidenceLevel = TechnologyEvidenceLevel.DocumentedInSource,
                ResearchSourceId = cirSource.Id,
                SortOrder = 0
            });
            result.TechnologyApplications++;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new CuratedCatalogSeedResult(result.ResearchSources, result.Environments, result.Materials, result.Experiments, result.ExperimentSources, result.Technologies, result.TechnologyApplications);
    }

    private async Task<ResearchSource> AddResearchSourceIfMissingAsync(ResearchSource candidate, SeedCount count, CancellationToken cancellationToken)
    {
        var existing = await dbContext.ResearchSources.SingleOrDefaultAsync(x => x.ExternalSystem == candidate.ExternalSystem && x.ExternalId == candidate.ExternalId, cancellationToken);
        if (existing is not null) return existing;
        dbContext.ResearchSources.Add(candidate);
        count.ResearchSources++;
        return candidate;
    }

    private async Task AddEnvironmentIfMissingAsync(string code, string name, EnvironmentType type, string description, SeedCount count, CancellationToken cancellationToken)
    {
        if (await dbContext.SpaceEnvironments.AnyAsync(x => x.Code == code, cancellationToken)) return;
        dbContext.SpaceEnvironments.Add(new SpaceEnvironment { Code = code, Name = name, EnvironmentType = type, Description = description });
        count.Environments++;
    }

    private sealed class SeedCount
    {
        public int ResearchSources { get; set; }
        public int Environments { get; set; }
        public int Materials { get; set; }
        public int Experiments { get; set; }
        public int ExperimentSources { get; set; }
        public int Technologies { get; set; }
        public int TechnologyApplications { get; set; }
    }
}
