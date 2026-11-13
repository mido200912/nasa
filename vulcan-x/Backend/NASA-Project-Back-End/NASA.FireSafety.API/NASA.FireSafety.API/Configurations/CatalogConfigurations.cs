using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NASA.FireSafety.API.Entities;

namespace NASA.FireSafety.API.Configurations;

internal static class ConfigurationExtensions
{
    internal static PropertyBuilder<TEnum> HasStringEnum<TEnum>(this PropertyBuilder<TEnum> property, int length) where TEnum : struct, Enum =>
        property.HasConversion<string>().HasMaxLength(length);

    internal static PropertyBuilder<TEnum?> HasNullableStringEnum<TEnum>(this PropertyBuilder<TEnum?> property, int length) where TEnum : struct, Enum =>
        property.HasConversion<string>().HasMaxLength(length);
}

public sealed class ResearchSourceConfiguration : IEntityTypeConfiguration<ResearchSource>
{
    public void Configure(EntityTypeBuilder<ResearchSource> b)
    {
        b.ToTable("ResearchSources", t =>
        {
            t.HasCheckConstraint("CK_ResearchSources_SourceType", "[SourceType] IN ('PsiDataset','NasaPublication','JournalArticle','TechnicalReport','Other')");
            t.HasCheckConstraint("CK_ResearchSources_Origin", "[Origin] IN ('NasaOriginal','ThirdParty')");
            t.HasCheckConstraint("CK_ResearchSources_CurationStatus", "[CurationStatus] IN ('Draft','MetadataReviewed','ApprovedForDisplay')");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(500).IsRequired();
        b.Property(x => x.SourceType).HasStringEnum(30).IsRequired();
        b.Property(x => x.Origin).HasStringEnum(20).IsRequired();
        b.Property(x => x.ExternalSystem).HasMaxLength(50);
        b.Property(x => x.ExternalId).HasMaxLength(200);
        b.Property(x => x.DoiNormalized).HasMaxLength(255);
        b.Property(x => x.SourceUrl).HasMaxLength(2000);
        b.Property(x => x.Publisher).HasMaxLength(200);
        b.Property(x => x.CitationText).HasMaxLength(1500);
        b.Property(x => x.LicenseText).HasMaxLength(300);
        b.Property(x => x.CurationStatus).HasStringEnum(30).HasDefaultValue(CurationStatus.Draft).IsRequired();
        b.Property(x => x.AccessedAt).HasColumnType("datetime2(3)");
        b.Property(x => x.CreatedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.HasIndex(x => x.Title).HasDatabaseName("IX_ResearchSources_Title");
        b.HasIndex(x => new { x.ExternalSystem, x.ExternalId }).IsUnique().HasFilter("[ExternalSystem] IS NOT NULL AND [ExternalId] IS NOT NULL").HasDatabaseName("UX_ResearchSources_External");
        b.HasIndex(x => x.DoiNormalized).IsUnique().HasFilter("[DoiNormalized] IS NOT NULL").HasDatabaseName("UX_ResearchSources_DoiNormalized");
    }
}

public sealed class SpaceEnvironmentConfiguration : IEntityTypeConfiguration<SpaceEnvironment>
{
    public void Configure(EntityTypeBuilder<SpaceEnvironment> b)
    {
        b.ToTable("SpaceEnvironments", t =>
        {
            t.HasCheckConstraint("CK_SpaceEnvironments_EnvironmentType", "[EnvironmentType] IN ('OrbitalStation','LunarSurface','MarsSurface','Other')");
            t.HasCheckConstraint("CK_SpaceEnvironments_Oxygen", "[DefaultOxygenVolumePercent] IS NULL OR [DefaultOxygenVolumePercent] BETWEEN 0 AND 100");
            t.HasCheckConstraint("CK_SpaceEnvironments_Pressure", "[DefaultPressureKPa] IS NULL OR [DefaultPressureKPa] > 0");
            t.HasCheckConstraint("CK_SpaceEnvironments_Temperature", "[DefaultTemperatureCelsius] IS NULL OR [DefaultTemperatureCelsius] >= -273.15");
            t.HasCheckConstraint("CK_SpaceEnvironments_GravityRegime", "[DefaultGravityRegime] IS NULL OR [DefaultGravityRegime] IN ('Microgravity','ReducedGravity','EarthLike','Hypergravity','Unspecified')");
            t.HasCheckConstraint("CK_SpaceEnvironments_EffectiveGravity", "[DefaultEffectiveGravityG] IS NULL OR ([DefaultEffectiveGravityG] >= 0 AND [DefaultGravityRegime] IS NOT NULL)");
            t.HasCheckConstraint("CK_SpaceEnvironments_DefaultSource", "([DefaultOxygenVolumePercent] IS NULL AND [DefaultPressureKPa] IS NULL AND [DefaultTemperatureCelsius] IS NULL AND [DefaultGravityRegime] IS NULL AND [DefaultEffectiveGravityG] IS NULL) OR [DefaultsSourceId] IS NOT NULL");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(30).IsRequired();
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.EnvironmentType).HasStringEnum(30).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        b.Property(x => x.DefaultOxygenVolumePercent).HasPrecision(5, 2);
        b.Property(x => x.DefaultPressureKPa).HasPrecision(9, 3);
        b.Property(x => x.DefaultTemperatureCelsius).HasPrecision(6, 2);
        b.Property(x => x.DefaultGravityRegime).HasNullableStringEnum(20);
        b.Property(x => x.DefaultEffectiveGravityG).HasPrecision(8, 6);
        b.Property(x => x.IsActive).HasDefaultValue(true);
        b.Property(x => x.CreatedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_SpaceEnvironments_Code");
        b.HasIndex(x => x.DefaultsSourceId);
        b.HasOne(x => x.DefaultsSource).WithMany(x => x.EnvironmentDefaults).HasForeignKey(x => x.DefaultsSourceId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class MaterialConfiguration : IEntityTypeConfiguration<Material>
{
    public void Configure(EntityTypeBuilder<Material> b)
    {
        b.ToTable("Materials");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Category).HasMaxLength(50);
        b.Property(x => x.Description).HasMaxLength(1000);
        b.Property(x => x.IsActive).HasDefaultValue(true);
        b.Property(x => x.CreatedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_Materials_Code");
        b.HasIndex(x => x.Category).HasDatabaseName("IX_Materials_Category");
    }
}

public sealed class MaterialPropertyConfiguration : IEntityTypeConfiguration<MaterialProperty>
{
    public void Configure(EntityTypeBuilder<MaterialProperty> b)
    {
        b.ToTable("MaterialProperties", t =>
        {
            t.HasCheckConstraint("CK_MaterialProperties_ValueType", "[ValueType] IN ('Numeric','Text')");
            t.HasCheckConstraint("CK_MaterialProperties_ValueShape", "([ValueType] = 'Numeric' AND [ValueNumber] IS NOT NULL AND [ValueText] IS NULL) OR ([ValueType] = 'Text' AND [ValueText] IS NOT NULL AND [ValueNumber] IS NULL)");
            t.HasCheckConstraint("CK_MaterialProperties_Uncertainty", "[Uncertainty] IS NULL OR ([ValueType] = 'Numeric' AND [Uncertainty] >= 0)");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.PropertyKey).HasMaxLength(80).IsRequired();
        b.Property(x => x.DisplayName).HasMaxLength(150).IsRequired();
        b.Property(x => x.ValueType).HasStringEnum(10).IsRequired();
        b.Property(x => x.ValueNumber).HasPrecision(18, 6);
        b.Property(x => x.ValueText).HasMaxLength(500);
        b.Property(x => x.Unit).HasMaxLength(40);
        b.Property(x => x.Uncertainty).HasPrecision(18, 6);
        b.Property(x => x.CreatedAt).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
        b.HasIndex(x => new { x.MaterialId, x.PropertyKey }).IsUnique().HasDatabaseName("UX_MaterialProperties_Material_Key");
        b.HasIndex(x => x.ResearchSourceId);
        b.HasOne(x => x.Material).WithMany(x => x.Properties).HasForeignKey(x => x.MaterialId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ResearchSource).WithMany(x => x.MaterialProperties).HasForeignKey(x => x.ResearchSourceId).OnDelete(DeleteBehavior.SetNull);
    }
}
