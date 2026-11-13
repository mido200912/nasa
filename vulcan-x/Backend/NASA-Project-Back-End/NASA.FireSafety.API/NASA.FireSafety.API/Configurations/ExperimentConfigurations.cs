using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NASA.FireSafety.API.Entities;

namespace NASA.FireSafety.API.Configurations;

public sealed class ExperimentConfiguration : IEntityTypeConfiguration<Experiment>
{
    public void Configure(EntityTypeBuilder<Experiment> b)
    {
        b.ToTable("Experiments", t => t.HasCheckConstraint("CK_Experiments_CurationStatus", "[CurationStatus] IN ('Draft','MetadataReviewed','ApprovedForDisplay')"));
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(300).IsRequired();
        b.Property(x => x.ExternalSystem).HasMaxLength(50);
        b.Property(x => x.ExternalId).HasMaxLength(200);
        b.Property(x => x.Discipline).HasMaxLength(50).IsRequired();
        b.Property(x => x.Platform).HasMaxLength(100);
        b.Property(x => x.GravityCondition).HasMaxLength(30);
        b.Property(x => x.Summary).IsRequired();
        b.Property(x => x.CurationStatus).HasStringEnum(30).HasDefaultValue(CurationStatus.Draft).IsRequired();
        b.Property(x => x.CuratedAt).HasColumnType("datetime2(3)");
        b.Property(x => x.CreatedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.HasIndex(x => x.Title).HasDatabaseName("IX_Experiments_Title");
        b.HasIndex(x => new { x.Discipline, x.GravityCondition }).HasDatabaseName("IX_Experiments_Discipline_Gravity");
        b.HasIndex(x => new { x.ExternalSystem, x.ExternalId }).IsUnique().HasFilter("[ExternalSystem] IS NOT NULL AND [ExternalId] IS NOT NULL").HasDatabaseName("UX_Experiments_External");
    }
}

public sealed class ExperimentParameterConfiguration : IEntityTypeConfiguration<ExperimentParameter>
{
    public void Configure(EntityTypeBuilder<ExperimentParameter> b)
    {
        b.ToTable("ExperimentParameters", t =>
        {
            t.HasCheckConstraint("CK_ExperimentParameters_Category", "[Category] IN ('Condition','Measurement','Result')");
            t.HasCheckConstraint("CK_ExperimentParameters_ValueType", "[ValueType] IN ('Numeric','Text','Range')");
            t.HasCheckConstraint("CK_ExperimentParameters_ValueShape", "([ValueType] = 'Numeric' AND [ValueNumber] IS NOT NULL AND [ValueText] IS NULL AND [ValueMin] IS NULL AND [ValueMax] IS NULL) OR ([ValueType] = 'Text' AND [ValueText] IS NOT NULL AND [ValueNumber] IS NULL AND [ValueMin] IS NULL AND [ValueMax] IS NULL) OR ([ValueType] = 'Range' AND [ValueMin] IS NOT NULL AND [ValueMax] IS NOT NULL AND [ValueMin] <= [ValueMax] AND [ValueNumber] IS NULL AND [ValueText] IS NULL)");
            t.HasCheckConstraint("CK_ExperimentParameters_Uncertainty", "[Uncertainty] IS NULL OR ([ValueType] = 'Numeric' AND [Uncertainty] >= 0)");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.ParameterKey).HasMaxLength(80).IsRequired();
        b.Property(x => x.Category).HasStringEnum(20).IsRequired();
        b.Property(x => x.DisplayName).HasMaxLength(150).IsRequired();
        b.Property(x => x.OriginalLabel).HasMaxLength(150);
        b.Property(x => x.ValueType).HasStringEnum(10).IsRequired();
        b.Property(x => x.ValueNumber).HasPrecision(18, 6);
        b.Property(x => x.ValueText).HasMaxLength(500);
        b.Property(x => x.ValueMin).HasPrecision(18, 6);
        b.Property(x => x.ValueMax).HasPrecision(18, 6);
        b.Property(x => x.Unit).HasMaxLength(40);
        b.Property(x => x.Uncertainty).HasPrecision(18, 6);
        b.Property(x => x.CreatedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.HasIndex(x => new { x.ExperimentId, x.ParameterKey }).HasDatabaseName("IX_ExperimentParameters_Experiment_Key");
        b.HasIndex(x => x.ResearchSourceId);
        b.HasOne(x => x.Experiment).WithMany(x => x.Parameters).HasForeignKey(x => x.ExperimentId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ResearchSource).WithMany(x => x.ExperimentParameters).HasForeignKey(x => x.ResearchSourceId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ExperimentMaterialConfiguration : IEntityTypeConfiguration<ExperimentMaterial>
{
    public void Configure(EntityTypeBuilder<ExperimentMaterial> b)
    {
        b.ToTable("ExperimentMaterials");
        b.HasKey(x => new { x.ExperimentId, x.MaterialId });
        b.Property(x => x.Role).HasMaxLength(30);
        b.HasIndex(x => x.MaterialId).HasDatabaseName("IX_ExperimentMaterials_MaterialId");
        b.HasOne(x => x.Experiment).WithMany(x => x.ExperimentMaterials).HasForeignKey(x => x.ExperimentId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Material).WithMany(x => x.ExperimentMaterials).HasForeignKey(x => x.MaterialId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ExperimentSourceConfiguration : IEntityTypeConfiguration<ExperimentSource>
{
    public void Configure(EntityTypeBuilder<ExperimentSource> b)
    {
        b.ToTable("ExperimentSources", t => t.HasCheckConstraint("CK_ExperimentSources_Role", "[Role] IN ('Primary','Dataset','Publication','Related')"));
        b.HasKey(x => new { x.ExperimentId, x.ResearchSourceId });
        b.Property(x => x.Role).HasStringEnum(20).IsRequired();
        b.HasIndex(x => x.ResearchSourceId).HasDatabaseName("IX_ExperimentSources_ResearchSourceId");
        b.HasOne(x => x.Experiment).WithMany(x => x.ExperimentSources).HasForeignKey(x => x.ExperimentId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ResearchSource).WithMany(x => x.ExperimentSources).HasForeignKey(x => x.ResearchSourceId).OnDelete(DeleteBehavior.Restrict);
    }
}
