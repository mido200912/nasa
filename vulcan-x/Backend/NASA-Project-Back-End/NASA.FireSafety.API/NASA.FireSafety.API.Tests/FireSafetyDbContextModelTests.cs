using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.Entities;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class FireSafetyDbContextModelTests
{
    [Fact]
    public void Model_ContainsApprovedEntityTables()
    {
        using var context = CreateContext();

        Assert.Equal("ResearchSources", context.Model.FindEntityType(typeof(ResearchSource))!.GetTableName());
        Assert.Equal("HabitatAnalyses", context.Model.FindEntityType(typeof(HabitatAnalysis))!.GetTableName());
        Assert.Equal("KnowledgeCitations", context.Model.FindEntityType(typeof(KnowledgeCitation))!.GetTableName());
        Assert.Equal("TechnologyExperiments", context.Model.FindEntityType(typeof(TechnologyExperiment))!.GetTableName());
    }

    [Fact]
    public void Model_ConfiguresCitationAndJoinRelationships()
    {
        using var context = CreateContext();
        var citation = context.Model.FindEntityType(typeof(AnalysisCitation))!;
        var sourceForeignKey = citation.GetForeignKeys().Single(x => x.Properties.Single().Name == nameof(AnalysisCitation.ResearchSourceId));
        var join = context.Model.FindEntityType(typeof(ExperimentMaterial))!;

        Assert.True(sourceForeignKey.IsRequired is false);
        Assert.Equal(DeleteBehavior.SetNull, sourceForeignKey.DeleteBehavior);
        Assert.Equal(new[] { nameof(ExperimentMaterial.ExperimentId), nameof(ExperimentMaterial.MaterialId) }, join.FindPrimaryKey()!.Properties.Select(x => x.Name));
    }

    [Fact]
    public void Model_ConfiguresExperimentParameterValueShapeConstraint()
    {
        using var context = CreateContext();
        var entity = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(ExperimentParameter))!;

        Assert.Contains(entity.GetCheckConstraints(), x => x.Name == "CK_ExperimentParameters_ValueShape");
        Assert.Contains(entity.GetIndexes(), x => x.Properties.Select(p => p.Name).SequenceEqual([nameof(ExperimentParameter.ExperimentId), nameof(ExperimentParameter.ParameterKey)]));
    }

    private static FireSafetyDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<FireSafetyDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=NASA.FireSafety.ModelTests;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;

        return new FireSafetyDbContext(options);
    }
}
