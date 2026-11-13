using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Entities;
using NASA.FireSafety.API.Services;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class CuratedCatalogSeederTests
{
    [Fact]
    public async Task SeedAsync_AddsOnlyMissingRecords_WhenRunMoreThanOnce()
    {
        await using var context = CatalogTestSupport.CreateContext();
        var seeder = new CuratedCatalogSeeder(context);

        var first = await seeder.SeedAsync(CancellationToken.None);
        var second = await seeder.SeedAsync(CancellationToken.None);

        Assert.Equal(3, first.AddedResearchSources);
        Assert.Equal(3, first.AddedEnvironments);
        Assert.Equal(1, first.AddedMaterials);
        Assert.Equal(1, first.AddedExperiments);
        Assert.Equal(1, first.AddedExperimentSources);
        Assert.Equal(1, first.AddedTechnologies);
        Assert.Equal(1, first.AddedTechnologyApplications);
        Assert.Equal(new(0, 0, 0, 0, 0, 0, 0), second);
        Assert.Equal(3, await context.ResearchSources.CountAsync());
        Assert.Equal(3, await context.SpaceEnvironments.CountAsync());
        Assert.Equal(1, await context.Experiments.CountAsync());
    }

    [Fact]
    public async Task SeedAsync_PreservesExistingRecordsWithTheSameStableKey()
    {
        await using var context = CatalogTestSupport.CreateContext();
        context.ResearchSources.Add(new ResearchSource
        {
            Title = "User-maintained title",
            SourceType = ResearchSourceType.Other,
            Origin = ResearchOrigin.ThirdParty,
            ExternalSystem = "NASA-Science",
            ExternalId = "sofie-mist",
            CurationStatus = CurationStatus.Draft
        });
        await context.SaveChangesAsync();

        await new CuratedCatalogSeeder(context).SeedAsync(CancellationToken.None);

        var existing = await context.ResearchSources.SingleAsync(x => x.ExternalSystem == "NASA-Science" && x.ExternalId == "sofie-mist");
        Assert.Equal("User-maintained title", existing.Title);
        Assert.Equal(CurationStatus.Draft, existing.CurationStatus);
        Assert.Equal(3, await context.ResearchSources.CountAsync());
    }
}
