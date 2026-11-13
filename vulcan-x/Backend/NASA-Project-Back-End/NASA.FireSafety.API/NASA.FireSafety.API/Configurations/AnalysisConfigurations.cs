using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NASA.FireSafety.API.Entities;

namespace NASA.FireSafety.API.Configurations;

public sealed class HabitatAnalysisConfiguration : IEntityTypeConfiguration<HabitatAnalysis>
{
    public void Configure(EntityTypeBuilder<HabitatAnalysis> b)
    {
        b.ToTable("HabitatAnalyses", t =>
        {
            t.HasCheckConstraint("CK_HabitatAnalyses_Oxygen", "[OxygenVolumePercent] IS NULL OR [OxygenVolumePercent] BETWEEN 0 AND 100");
            t.HasCheckConstraint("CK_HabitatAnalyses_Pressure", "[PressureKPa] IS NULL OR [PressureKPa] > 0");
            t.HasCheckConstraint("CK_HabitatAnalyses_Temperature", "[TemperatureCelsius] IS NULL OR [TemperatureCelsius] >= -273.15");
            t.HasCheckConstraint("CK_HabitatAnalyses_GravityRegime", "[GravityRegime] IS NULL OR [GravityRegime] IN ('Microgravity','ReducedGravity','EarthLike','Hypergravity','Unspecified')");
            t.HasCheckConstraint("CK_HabitatAnalyses_Gravity", "[EffectiveGravityG] IS NULL OR ([EffectiveGravityG] >= 0 AND [GravityRegime] IS NOT NULL)");
            t.HasCheckConstraint("CK_HabitatAnalyses_InputOriginsJson", "ISJSON([InputOriginsJson]) = 1");
            t.HasCheckConstraint("CK_HabitatAnalyses_AdditionalParametersJson", "[AdditionalParametersJson] IS NULL OR ISJSON([AdditionalParametersJson]) = 1");
            t.HasCheckConstraint("CK_HabitatAnalyses_Status", "[Status] IN ('Pending','Running','Completed','Failed')");
            t.HasCheckConstraint("CK_HabitatAnalyses_Basis", "[AnalysisBasis] IS NULL OR [AnalysisBasis] IN ('Mock','LlmInterpretationOnly','ValidatedModel')");
            t.HasCheckConstraint("CK_HabitatAnalyses_Duration", "[DurationMs] IS NULL OR [DurationMs] >= 0");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.OxygenVolumePercent).HasPrecision(5, 2);
        b.Property(x => x.PressureKPa).HasPrecision(9, 3);
        b.Property(x => x.TemperatureCelsius).HasPrecision(6, 2);
        b.Property(x => x.GravityRegime).HasNullableStringEnum(20);
        b.Property(x => x.EffectiveGravityG).HasPrecision(8, 6);
        b.Property(x => x.InputOriginsJson).IsRequired();
        b.Property(x => x.Status).HasStringEnum(20).HasDefaultValue(AnalysisStatus.Pending).IsRequired();
        b.Property(x => x.RiskLabel).HasMaxLength(30);
        b.Property(x => x.AnalysisBasis).HasNullableStringEnum(40);
        b.Property(x => x.ModelName).HasMaxLength(100);
        b.Property(x => x.ModelVersion).HasMaxLength(50);
        b.Property(x => x.ContractVersion).HasMaxLength(30);
        b.Property(x => x.ErrorCode).HasMaxLength(50);
        b.Property(x => x.ErrorMessage).HasMaxLength(1000);
        b.Property(x => x.RequestedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.CompletedAt).HasColumnType("datetime2(3)");
        b.HasIndex(x => x.CorrelationId).HasDatabaseName("IX_HabitatAnalyses_CorrelationId");
        b.HasIndex(x => x.RequestedAt).IsDescending().HasDatabaseName("IX_HabitatAnalyses_RequestedAt");
        b.HasIndex(x => new { x.SpaceEnvironmentId, x.MaterialId, x.RequestedAt }).HasDatabaseName("IX_HabitatAnalyses_Environment_Material_RequestedAt");
        b.HasOne(x => x.SpaceEnvironment).WithMany(x => x.HabitatAnalyses).HasForeignKey(x => x.SpaceEnvironmentId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Material).WithMany(x => x.HabitatAnalyses).HasForeignKey(x => x.MaterialId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class AnalysisFactorConfiguration : IEntityTypeConfiguration<AnalysisFactor>
{
    public void Configure(EntityTypeBuilder<AnalysisFactor> b)
    {
        b.ToTable("AnalysisFactors", t =>
        {
            t.HasCheckConstraint("CK_AnalysisFactors_Direction", "[Direction] IS NULL OR [Direction] IN ('IncreasesRisk','DecreasesRisk','Unclear')");
            t.HasCheckConstraint("CK_AnalysisFactors_SortOrder", "[SortOrder] >= 0");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        b.Property(x => x.Direction).HasNullableStringEnum(20);
        b.HasIndex(x => new { x.HabitatAnalysisId, x.SortOrder }).IsUnique().HasDatabaseName("UX_AnalysisFactors_Analysis_SortOrder");
        b.HasOne(x => x.HabitatAnalysis).WithMany(x => x.Factors).HasForeignKey(x => x.HabitatAnalysisId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class AnalysisCitationConfiguration : IEntityTypeConfiguration<AnalysisCitation>
{
    public void Configure(EntityTypeBuilder<AnalysisCitation> b)
    {
        b.ToTable("AnalysisCitations", t =>
        {
            t.HasCheckConstraint("CK_AnalysisCitations_MatchStatus", "[MatchStatus] IN ('Matched','Unmatched')");
            t.HasCheckConstraint("CK_AnalysisCitations_MatchData", "([MatchStatus] = 'Matched' AND [ResearchSourceId] IS NOT NULL) OR ([MatchStatus] = 'Unmatched' AND ([RawTitle] IS NOT NULL OR [RawUrl] IS NOT NULL OR [RawDoiNormalized] IS NOT NULL OR [RawExternalId] IS NOT NULL))");
            t.HasCheckConstraint("CK_AnalysisCitations_SortOrder", "[SortOrder] >= 0");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.MatchStatus).HasStringEnum(20).IsRequired();
        b.Property(x => x.RawTitle).HasMaxLength(500);
        b.Property(x => x.RawUrl).HasMaxLength(2000);
        b.Property(x => x.RawDoiNormalized).HasMaxLength(255);
        b.Property(x => x.RawExternalSystem).HasMaxLength(50);
        b.Property(x => x.RawExternalId).HasMaxLength(200);
        b.Property(x => x.Excerpt).HasMaxLength(2000);
        b.HasIndex(x => x.ResearchSourceId);
        b.HasIndex(x => new { x.HabitatAnalysisId, x.SortOrder }).IsUnique().HasDatabaseName("UX_AnalysisCitations_Analysis_SortOrder");
        b.HasOne(x => x.HabitatAnalysis).WithMany(x => x.Citations).HasForeignKey(x => x.HabitatAnalysisId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ResearchSource).WithMany(x => x.AnalysisCitations).HasForeignKey(x => x.ResearchSourceId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class KnowledgeQueryConfiguration : IEntityTypeConfiguration<KnowledgeQuery>
{
    public void Configure(EntityTypeBuilder<KnowledgeQuery> b)
    {
        b.ToTable("KnowledgeQueries", t =>
        {
            t.HasCheckConstraint("CK_KnowledgeQueries_FiltersJson", "[FiltersJson] IS NULL OR ISJSON([FiltersJson]) = 1");
            t.HasCheckConstraint("CK_KnowledgeQueries_Status", "[Status] IN ('Pending','Running','Completed','Failed')");
            t.HasCheckConstraint("CK_KnowledgeQueries_Grounding", "[GroundingStatus] IS NULL OR [GroundingStatus] IN ('HasMatchedCitations','HasOnlyUnmatchedCitations','NoCitations')");
            t.HasCheckConstraint("CK_KnowledgeQueries_Duration", "[DurationMs] IS NULL OR [DurationMs] >= 0");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.Question).HasMaxLength(2000).IsRequired();
        b.Property(x => x.Status).HasStringEnum(20).HasDefaultValue(AnalysisStatus.Pending).IsRequired();
        b.Property(x => x.GroundingStatus).HasNullableStringEnum(30);
        b.Property(x => x.ModelName).HasMaxLength(100);
        b.Property(x => x.ModelVersion).HasMaxLength(50);
        b.Property(x => x.ContractVersion).HasMaxLength(30);
        b.Property(x => x.ErrorCode).HasMaxLength(50);
        b.Property(x => x.ErrorMessage).HasMaxLength(1000);
        b.Property(x => x.RequestedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.CompletedAt).HasColumnType("datetime2(3)");
        b.HasIndex(x => x.CorrelationId).HasDatabaseName("IX_KnowledgeQueries_CorrelationId");
        b.HasIndex(x => x.RequestedAt).IsDescending().HasDatabaseName("IX_KnowledgeQueries_RequestedAt");
    }
}

public sealed class KnowledgeCitationConfiguration : IEntityTypeConfiguration<KnowledgeCitation>
{
    public void Configure(EntityTypeBuilder<KnowledgeCitation> b)
    {
        b.ToTable("KnowledgeCitations", t =>
        {
            t.HasCheckConstraint("CK_KnowledgeCitations_MatchStatus", "[MatchStatus] IN ('Matched','Unmatched')");
            t.HasCheckConstraint("CK_KnowledgeCitations_MatchData", "([MatchStatus] = 'Matched' AND [ResearchSourceId] IS NOT NULL) OR ([MatchStatus] = 'Unmatched' AND ([RawTitle] IS NOT NULL OR [RawUrl] IS NOT NULL OR [RawDoiNormalized] IS NOT NULL OR [RawExternalId] IS NOT NULL))");
            t.HasCheckConstraint("CK_KnowledgeCitations_Relevance", "[RelevanceScore] IS NULL OR [RelevanceScore] BETWEEN 0 AND 1");
            t.HasCheckConstraint("CK_KnowledgeCitations_SortOrder", "[SortOrder] >= 0");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.MatchStatus).HasStringEnum(20).IsRequired();
        b.Property(x => x.RawTitle).HasMaxLength(500);
        b.Property(x => x.RawUrl).HasMaxLength(2000);
        b.Property(x => x.RawDoiNormalized).HasMaxLength(255);
        b.Property(x => x.RawExternalSystem).HasMaxLength(50);
        b.Property(x => x.RawExternalId).HasMaxLength(200);
        b.Property(x => x.Excerpt).HasMaxLength(2000);
        b.Property(x => x.RelevanceScore).HasPrecision(5, 4);
        b.HasIndex(x => x.ResearchSourceId);
        b.HasIndex(x => new { x.KnowledgeQueryId, x.SortOrder }).IsUnique().HasDatabaseName("UX_KnowledgeCitations_Query_SortOrder");
        b.HasOne(x => x.KnowledgeQuery).WithMany(x => x.Citations).HasForeignKey(x => x.KnowledgeQueryId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ResearchSource).WithMany(x => x.KnowledgeCitations).HasForeignKey(x => x.ResearchSourceId).OnDelete(DeleteBehavior.SetNull);
    }
}
