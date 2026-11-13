using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.DTOs.Catalog;
using NASA.FireSafety.API.Entities;
using NASA.FireSafety.API.Services;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class CatalogQueryServiceTests
{
    [Fact]
    public async Task Queries_ProjectRelatedData_AndApplyFiltersAndPagination()
    {
        await using var context = CatalogTestSupport.CreateContext();
        var seeder = new CuratedCatalogSeeder(context);
        await seeder.SeedAsync(CancellationToken.None);
        var service = new CatalogQueryService(context);

        var pmma = await context.Materials.SingleAsync(x => x.Code == "PMMA");
        var filtered = await service.GetExperimentsAsync(new ExperimentListQuery { MaterialId = pmma.Id, Page = 1, PageSize = 1 }, CancellationToken.None);
        var experiment = await service.GetExperimentAsync(filtered.Items.Single().Id, CancellationToken.None);
        var material = await service.GetMaterialAsync(pmma.Id, CancellationToken.None);
        var technologies = await service.GetTechnologiesAsync(new TechnologyListQuery { Domain = "Space", Page = 1, PageSize = 10 }, CancellationToken.None);
        var technology = await service.GetTechnologyAsync(technologies.Items.Single().Id, CancellationToken.None);

        Assert.Equal(1, filtered.TotalCount);
        Assert.NotNull(experiment);
        Assert.Equal("Microgravity", experiment.GravityCondition);
        Assert.Single(experiment.Materials);
        Assert.Equal("PMMA", experiment.Materials[0].Code);
        Assert.Single(experiment.Sources);
        Assert.NotNull(material);
        Assert.Empty(material.Properties);
        Assert.Single(technologies.Items);
        Assert.NotNull(technology);
        Assert.Single(technology.Applications);
        Assert.Equal("DocumentedInSource", technology.Applications[0].EvidenceLevel);
    }

    [Fact]
    public async Task Queries_ReturnEmptyPages_AndHideInactiveOrUnapprovedRecords()
    {
        await using var context = CatalogTestSupport.CreateContext();
        context.Materials.Add(new Material { Code = "INACTIVE", Name = "Inactive", IsActive = false });
        context.Experiments.Add(new Experiment { Title = "Draft", Discipline = "Combustion Science", Summary = "Not displayable", CurationStatus = CurationStatus.Draft });
        await context.SaveChangesAsync();
        var service = new CatalogQueryService(context);

        var materials = await service.GetMaterialsAsync(new MaterialListQuery { Search = "missing", Page = 1, PageSize = 20 }, CancellationToken.None);
        var experiments = await service.GetExperimentsAsync(new ExperimentListQuery { Page = 1, PageSize = 20 }, CancellationToken.None);
        var technologies = await service.GetTechnologiesAsync(new TechnologyListQuery { Page = 1, PageSize = 20 }, CancellationToken.None);

        Assert.Empty(materials.Items);
        Assert.Equal(0, materials.TotalCount);
        Assert.Empty(experiments.Items);
        Assert.Empty(technologies.Items);
    }
}
