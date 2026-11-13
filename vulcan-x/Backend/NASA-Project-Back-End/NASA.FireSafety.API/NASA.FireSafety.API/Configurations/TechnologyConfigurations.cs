using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NASA.FireSafety.API.Entities;

namespace NASA.FireSafety.API.Configurations;

public sealed class TechnologyConfiguration : IEntityTypeConfiguration<Technology>
{
    public void Configure(EntityTypeBuilder<Technology> b)
    {
        b.ToTable("Technologies", t => t.HasCheckConstraint("CK_Technologies_Category", "[Category] IN ('FireDetection','FireSuppression','SmokeMonitoring','BuildingSafety','Other')"));
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).HasMaxLength(100).IsRequired();
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Category).HasStringEnum(30).IsRequired();
        b.Property(x => x.Summary).HasMaxLength(1000).IsRequired();
        b.Property(x => x.IsPublished).HasDefaultValue(false);
        b.Property(x => x.CreatedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasColumnType("datetime2(3)").IsRequired();
        b.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_Technologies_Slug");
        b.HasIndex(x => x.Category).HasDatabaseName("IX_Technologies_Category");
    }
}

public sealed class TechnologyApplicationConfiguration : IEntityTypeConfiguration<TechnologyApplication>
{
    public void Configure(EntityTypeBuilder<TechnologyApplication> b)
    {
        b.ToTable("TechnologyApplications", t =>
        {
            t.HasCheckConstraint("CK_TechnologyApplications_Domain", "[Domain] IN ('Space','Earth')");
            t.HasCheckConstraint("CK_TechnologyApplications_Evidence", "[EvidenceLevel] IN ('DocumentedInSource','TeamProposed')");
            t.HasCheckConstraint("CK_TechnologyApplications_Source", "[EvidenceLevel] <> 'DocumentedInSource' OR [ResearchSourceId] IS NOT NULL");
            t.HasCheckConstraint("CK_TechnologyApplications_SortOrder", "[SortOrder] >= 0");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.Domain).HasStringEnum(10).IsRequired();
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).IsRequired();
        b.Property(x => x.EvidenceLevel).HasStringEnum(30).IsRequired();
        b.HasIndex(x => x.ResearchSourceId);
        b.HasIndex(x => new { x.TechnologyId, x.SortOrder }).IsUnique().HasDatabaseName("UX_TechnologyApplications_Technology_SortOrder");
        b.HasOne(x => x.Technology).WithMany(x => x.Applications).HasForeignKey(x => x.TechnologyId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ResearchSource).WithMany(x => x.TechnologyApplications).HasForeignKey(x => x.ResearchSourceId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class TechnologyExperimentConfiguration : IEntityTypeConfiguration<TechnologyExperiment>
{
    public void Configure(EntityTypeBuilder<TechnologyExperiment> b)
    {
        b.ToTable("TechnologyExperiments");
        b.HasKey(x => new { x.TechnologyId, x.ExperimentId });
        b.HasIndex(x => x.ExperimentId).HasDatabaseName("IX_TechnologyExperiments_ExperimentId");
        b.HasOne(x => x.Technology).WithMany(x => x.TechnologyExperiments).HasForeignKey(x => x.TechnologyId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Experiment).WithMany(x => x.TechnologyExperiments).HasForeignKey(x => x.ExperimentId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class TechnologySourceConfiguration : IEntityTypeConfiguration<TechnologySource>
{
    public void Configure(EntityTypeBuilder<TechnologySource> b)
    {
        b.ToTable("TechnologySources");
        b.HasKey(x => new { x.TechnologyId, x.ResearchSourceId });
        b.HasIndex(x => x.ResearchSourceId).HasDatabaseName("IX_TechnologySources_ResearchSourceId");
        b.HasOne(x => x.Technology).WithMany(x => x.TechnologySources).HasForeignKey(x => x.TechnologyId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ResearchSource).WithMany(x => x.TechnologySources).HasForeignKey(x => x.ResearchSourceId).OnDelete(DeleteBehavior.Restrict);
    }
}
