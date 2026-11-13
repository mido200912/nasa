using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NASA.FireSafety.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialDatabaseSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Experiments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    ExternalSystem = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ExternalId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Discipline = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Platform = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    GravityCondition = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    KeyFindings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurationStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Draft"),
                    CuratedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Experiments", x => x.Id);
                    table.CheckConstraint("CK_Experiments_CurationStatus", "[CurationStatus] IN ('Draft','MetadataReviewed','ApprovedForDisplay')");
                });

            migrationBuilder.CreateTable(
                name: "KnowledgeQueries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    FiltersJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Answer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    GroundingStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    IsMock = table.Column<bool>(type: "bit", nullable: false),
                    ModelName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ModelVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ContractVersion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    ErrorCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CorrelationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    CompletedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    DurationMs = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KnowledgeQueries", x => x.Id);
                    table.CheckConstraint("CK_KnowledgeQueries_Duration", "[DurationMs] IS NULL OR [DurationMs] >= 0");
                    table.CheckConstraint("CK_KnowledgeQueries_FiltersJson", "[FiltersJson] IS NULL OR ISJSON([FiltersJson]) = 1");
                    table.CheckConstraint("CK_KnowledgeQueries_Grounding", "[GroundingStatus] IS NULL OR [GroundingStatus] IN ('HasMatchedCitations','HasOnlyUnmatchedCitations','NoCitations')");
                    table.CheckConstraint("CK_KnowledgeQueries_Status", "[Status] IN ('Pending','Running','Completed','Failed')");
                });

            migrationBuilder.CreateTable(
                name: "Materials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Materials", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ResearchSources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Origin = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ExternalSystem = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ExternalId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DoiNormalized = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    SourceUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Publisher = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PublicationDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CitationText = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: true),
                    LicenseText = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CurationStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Draft"),
                    AccessedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResearchSources", x => x.Id);
                    table.CheckConstraint("CK_ResearchSources_CurationStatus", "[CurationStatus] IN ('Draft','MetadataReviewed','ApprovedForDisplay')");
                    table.CheckConstraint("CK_ResearchSources_Origin", "[Origin] IN ('NasaOriginal','ThirdParty')");
                    table.CheckConstraint("CK_ResearchSources_SourceType", "[SourceType] IN ('PsiDataset','NasaPublication','JournalArticle','TechnicalReport','Other')");
                });

            migrationBuilder.CreateTable(
                name: "Technologies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SpaceOriginSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Technologies", x => x.Id);
                    table.CheckConstraint("CK_Technologies_Category", "[Category] IN ('FireDetection','FireSuppression','SmokeMonitoring','BuildingSafety','Other')");
                });

            migrationBuilder.CreateTable(
                name: "ExperimentMaterials",
                columns: table => new
                {
                    ExperimentId = table.Column<int>(type: "int", nullable: false),
                    MaterialId = table.Column<int>(type: "int", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperimentMaterials", x => new { x.ExperimentId, x.MaterialId });
                    table.ForeignKey(
                        name: "FK_ExperimentMaterials_Experiments_ExperimentId",
                        column: x => x.ExperimentId,
                        principalTable: "Experiments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExperimentMaterials_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ExperimentParameters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperimentId = table.Column<int>(type: "int", nullable: false),
                    ParameterKey = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    OriginalLabel = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ValueType = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ValueNumber = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: true),
                    ValueText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ValueMin = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: true),
                    ValueMax = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Uncertainty = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: true),
                    ResearchSourceId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperimentParameters", x => x.Id);
                    table.CheckConstraint("CK_ExperimentParameters_Category", "[Category] IN ('Condition','Measurement','Result')");
                    table.CheckConstraint("CK_ExperimentParameters_Uncertainty", "[Uncertainty] IS NULL OR ([ValueType] = 'Numeric' AND [Uncertainty] >= 0)");
                    table.CheckConstraint("CK_ExperimentParameters_ValueShape", "([ValueType] = 'Numeric' AND [ValueNumber] IS NOT NULL AND [ValueText] IS NULL AND [ValueMin] IS NULL AND [ValueMax] IS NULL) OR ([ValueType] = 'Text' AND [ValueText] IS NOT NULL AND [ValueNumber] IS NULL AND [ValueMin] IS NULL AND [ValueMax] IS NULL) OR ([ValueType] = 'Range' AND [ValueMin] IS NOT NULL AND [ValueMax] IS NOT NULL AND [ValueMin] <= [ValueMax] AND [ValueNumber] IS NULL AND [ValueText] IS NULL)");
                    table.CheckConstraint("CK_ExperimentParameters_ValueType", "[ValueType] IN ('Numeric','Text','Range')");
                    table.ForeignKey(
                        name: "FK_ExperimentParameters_Experiments_ExperimentId",
                        column: x => x.ExperimentId,
                        principalTable: "Experiments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExperimentParameters_ResearchSources_ResearchSourceId",
                        column: x => x.ResearchSourceId,
                        principalTable: "ResearchSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ExperimentSources",
                columns: table => new
                {
                    ExperimentId = table.Column<int>(type: "int", nullable: false),
                    ResearchSourceId = table.Column<int>(type: "int", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperimentSources", x => new { x.ExperimentId, x.ResearchSourceId });
                    table.CheckConstraint("CK_ExperimentSources_Role", "[Role] IN ('Primary','Dataset','Publication','Related')");
                    table.ForeignKey(
                        name: "FK_ExperimentSources_Experiments_ExperimentId",
                        column: x => x.ExperimentId,
                        principalTable: "Experiments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExperimentSources_ResearchSources_ResearchSourceId",
                        column: x => x.ResearchSourceId,
                        principalTable: "ResearchSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "KnowledgeCitations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    KnowledgeQueryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResearchSourceId = table.Column<int>(type: "int", nullable: true),
                    MatchStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RawTitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RawUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RawDoiNormalized = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    RawExternalSystem = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RawExternalId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Excerpt = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RelevanceScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KnowledgeCitations", x => x.Id);
                    table.CheckConstraint("CK_KnowledgeCitations_MatchData", "([MatchStatus] = 'Matched' AND [ResearchSourceId] IS NOT NULL) OR ([MatchStatus] = 'Unmatched' AND ([RawTitle] IS NOT NULL OR [RawUrl] IS NOT NULL OR [RawDoiNormalized] IS NOT NULL OR [RawExternalId] IS NOT NULL))");
                    table.CheckConstraint("CK_KnowledgeCitations_MatchStatus", "[MatchStatus] IN ('Matched','Unmatched')");
                    table.CheckConstraint("CK_KnowledgeCitations_Relevance", "[RelevanceScore] IS NULL OR [RelevanceScore] BETWEEN 0 AND 1");
                    table.CheckConstraint("CK_KnowledgeCitations_SortOrder", "[SortOrder] >= 0");
                    table.ForeignKey(
                        name: "FK_KnowledgeCitations_KnowledgeQueries_KnowledgeQueryId",
                        column: x => x.KnowledgeQueryId,
                        principalTable: "KnowledgeQueries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KnowledgeCitations_ResearchSources_ResearchSourceId",
                        column: x => x.ResearchSourceId,
                        principalTable: "ResearchSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MaterialProperties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaterialId = table.Column<int>(type: "int", nullable: false),
                    PropertyKey = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ValueType = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ValueNumber = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: true),
                    ValueText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Uncertainty = table.Column<decimal>(type: "decimal(18,6)", precision: 18, scale: 6, nullable: true),
                    ResearchSourceId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialProperties", x => x.Id);
                    table.CheckConstraint("CK_MaterialProperties_Uncertainty", "[Uncertainty] IS NULL OR ([ValueType] = 'Numeric' AND [Uncertainty] >= 0)");
                    table.CheckConstraint("CK_MaterialProperties_ValueShape", "([ValueType] = 'Numeric' AND [ValueNumber] IS NOT NULL AND [ValueText] IS NULL) OR ([ValueType] = 'Text' AND [ValueText] IS NOT NULL AND [ValueNumber] IS NULL)");
                    table.CheckConstraint("CK_MaterialProperties_ValueType", "[ValueType] IN ('Numeric','Text')");
                    table.ForeignKey(
                        name: "FK_MaterialProperties_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialProperties_ResearchSources_ResearchSourceId",
                        column: x => x.ResearchSourceId,
                        principalTable: "ResearchSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SpaceEnvironments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EnvironmentType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    DefaultOxygenVolumePercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    DefaultPressureKPa = table.Column<decimal>(type: "decimal(9,3)", precision: 9, scale: 3, nullable: true),
                    DefaultTemperatureCelsius = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    DefaultGravityRegime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DefaultEffectiveGravityG = table.Column<decimal>(type: "decimal(8,6)", precision: 8, scale: 6, nullable: true),
                    DefaultsSourceId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpaceEnvironments", x => x.Id);
                    table.CheckConstraint("CK_SpaceEnvironments_DefaultSource", "([DefaultOxygenVolumePercent] IS NULL AND [DefaultPressureKPa] IS NULL AND [DefaultTemperatureCelsius] IS NULL AND [DefaultGravityRegime] IS NULL AND [DefaultEffectiveGravityG] IS NULL) OR [DefaultsSourceId] IS NOT NULL");
                    table.CheckConstraint("CK_SpaceEnvironments_EffectiveGravity", "[DefaultEffectiveGravityG] IS NULL OR ([DefaultEffectiveGravityG] >= 0 AND [DefaultGravityRegime] IS NOT NULL)");
                    table.CheckConstraint("CK_SpaceEnvironments_EnvironmentType", "[EnvironmentType] IN ('OrbitalStation','LunarSurface','MarsSurface','Other')");
                    table.CheckConstraint("CK_SpaceEnvironments_GravityRegime", "[DefaultGravityRegime] IS NULL OR [DefaultGravityRegime] IN ('Microgravity','ReducedGravity','EarthLike','Hypergravity','Unspecified')");
                    table.CheckConstraint("CK_SpaceEnvironments_Oxygen", "[DefaultOxygenVolumePercent] IS NULL OR [DefaultOxygenVolumePercent] BETWEEN 0 AND 100");
                    table.CheckConstraint("CK_SpaceEnvironments_Pressure", "[DefaultPressureKPa] IS NULL OR [DefaultPressureKPa] > 0");
                    table.CheckConstraint("CK_SpaceEnvironments_Temperature", "[DefaultTemperatureCelsius] IS NULL OR [DefaultTemperatureCelsius] >= -273.15");
                    table.ForeignKey(
                        name: "FK_SpaceEnvironments_ResearchSources_DefaultsSourceId",
                        column: x => x.DefaultsSourceId,
                        principalTable: "ResearchSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TechnologyApplications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TechnologyId = table.Column<int>(type: "int", nullable: false),
                    Domain = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EvidenceLevel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ResearchSourceId = table.Column<int>(type: "int", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TechnologyApplications", x => x.Id);
                    table.CheckConstraint("CK_TechnologyApplications_Domain", "[Domain] IN ('Space','Earth')");
                    table.CheckConstraint("CK_TechnologyApplications_Evidence", "[EvidenceLevel] IN ('DocumentedInSource','TeamProposed')");
                    table.CheckConstraint("CK_TechnologyApplications_SortOrder", "[SortOrder] >= 0");
                    table.CheckConstraint("CK_TechnologyApplications_Source", "[EvidenceLevel] <> 'DocumentedInSource' OR [ResearchSourceId] IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_TechnologyApplications_ResearchSources_ResearchSourceId",
                        column: x => x.ResearchSourceId,
                        principalTable: "ResearchSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TechnologyApplications_Technologies_TechnologyId",
                        column: x => x.TechnologyId,
                        principalTable: "Technologies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TechnologyExperiments",
                columns: table => new
                {
                    TechnologyId = table.Column<int>(type: "int", nullable: false),
                    ExperimentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TechnologyExperiments", x => new { x.TechnologyId, x.ExperimentId });
                    table.ForeignKey(
                        name: "FK_TechnologyExperiments_Experiments_ExperimentId",
                        column: x => x.ExperimentId,
                        principalTable: "Experiments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TechnologyExperiments_Technologies_TechnologyId",
                        column: x => x.TechnologyId,
                        principalTable: "Technologies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TechnologySources",
                columns: table => new
                {
                    TechnologyId = table.Column<int>(type: "int", nullable: false),
                    ResearchSourceId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TechnologySources", x => new { x.TechnologyId, x.ResearchSourceId });
                    table.ForeignKey(
                        name: "FK_TechnologySources_ResearchSources_ResearchSourceId",
                        column: x => x.ResearchSourceId,
                        principalTable: "ResearchSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TechnologySources_Technologies_TechnologyId",
                        column: x => x.TechnologyId,
                        principalTable: "Technologies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HabitatAnalyses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpaceEnvironmentId = table.Column<int>(type: "int", nullable: false),
                    MaterialId = table.Column<int>(type: "int", nullable: false),
                    OxygenVolumePercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    PressureKPa = table.Column<decimal>(type: "decimal(9,3)", precision: 9, scale: 3, nullable: true),
                    TemperatureCelsius = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    GravityRegime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    EffectiveGravityG = table.Column<decimal>(type: "decimal(8,6)", precision: 8, scale: 6, nullable: true),
                    InputOriginsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdditionalParametersJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    RiskLabel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    AnalysisBasis = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    IsMock = table.Column<bool>(type: "bit", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Limitations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ModelName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ModelVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ContractVersion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    ErrorCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CorrelationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    CompletedAt = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    DurationMs = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HabitatAnalyses", x => x.Id);
                    table.CheckConstraint("CK_HabitatAnalyses_AdditionalParametersJson", "[AdditionalParametersJson] IS NULL OR ISJSON([AdditionalParametersJson]) = 1");
                    table.CheckConstraint("CK_HabitatAnalyses_Basis", "[AnalysisBasis] IS NULL OR [AnalysisBasis] IN ('Mock','LlmInterpretationOnly','ValidatedModel')");
                    table.CheckConstraint("CK_HabitatAnalyses_Duration", "[DurationMs] IS NULL OR [DurationMs] >= 0");
                    table.CheckConstraint("CK_HabitatAnalyses_Gravity", "[EffectiveGravityG] IS NULL OR ([EffectiveGravityG] >= 0 AND [GravityRegime] IS NOT NULL)");
                    table.CheckConstraint("CK_HabitatAnalyses_GravityRegime", "[GravityRegime] IS NULL OR [GravityRegime] IN ('Microgravity','ReducedGravity','EarthLike','Hypergravity','Unspecified')");
                    table.CheckConstraint("CK_HabitatAnalyses_InputOriginsJson", "ISJSON([InputOriginsJson]) = 1");
                    table.CheckConstraint("CK_HabitatAnalyses_Oxygen", "[OxygenVolumePercent] IS NULL OR [OxygenVolumePercent] BETWEEN 0 AND 100");
                    table.CheckConstraint("CK_HabitatAnalyses_Pressure", "[PressureKPa] IS NULL OR [PressureKPa] > 0");
                    table.CheckConstraint("CK_HabitatAnalyses_Status", "[Status] IN ('Pending','Running','Completed','Failed')");
                    table.CheckConstraint("CK_HabitatAnalyses_Temperature", "[TemperatureCelsius] IS NULL OR [TemperatureCelsius] >= -273.15");
                    table.ForeignKey(
                        name: "FK_HabitatAnalyses_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HabitatAnalyses_SpaceEnvironments_SpaceEnvironmentId",
                        column: x => x.SpaceEnvironmentId,
                        principalTable: "SpaceEnvironments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AnalysisCitations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HabitatAnalysisId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResearchSourceId = table.Column<int>(type: "int", nullable: true),
                    MatchStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RawTitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RawUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RawDoiNormalized = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    RawExternalSystem = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RawExternalId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Excerpt = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalysisCitations", x => x.Id);
                    table.CheckConstraint("CK_AnalysisCitations_MatchData", "([MatchStatus] = 'Matched' AND [ResearchSourceId] IS NOT NULL) OR ([MatchStatus] = 'Unmatched' AND ([RawTitle] IS NOT NULL OR [RawUrl] IS NOT NULL OR [RawDoiNormalized] IS NOT NULL OR [RawExternalId] IS NOT NULL))");
                    table.CheckConstraint("CK_AnalysisCitations_MatchStatus", "[MatchStatus] IN ('Matched','Unmatched')");
                    table.CheckConstraint("CK_AnalysisCitations_SortOrder", "[SortOrder] >= 0");
                    table.ForeignKey(
                        name: "FK_AnalysisCitations_HabitatAnalyses_HabitatAnalysisId",
                        column: x => x.HabitatAnalysisId,
                        principalTable: "HabitatAnalyses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AnalysisCitations_ResearchSources_ResearchSourceId",
                        column: x => x.ResearchSourceId,
                        principalTable: "ResearchSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "AnalysisFactors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HabitatAnalysisId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Direction = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalysisFactors", x => x.Id);
                    table.CheckConstraint("CK_AnalysisFactors_Direction", "[Direction] IS NULL OR [Direction] IN ('IncreasesRisk','DecreasesRisk','Unclear')");
                    table.CheckConstraint("CK_AnalysisFactors_SortOrder", "[SortOrder] >= 0");
                    table.ForeignKey(
                        name: "FK_AnalysisFactors_HabitatAnalyses_HabitatAnalysisId",
                        column: x => x.HabitatAnalysisId,
                        principalTable: "HabitatAnalyses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisCitations_ResearchSourceId",
                table: "AnalysisCitations",
                column: "ResearchSourceId");

            migrationBuilder.CreateIndex(
                name: "UX_AnalysisCitations_Analysis_SortOrder",
                table: "AnalysisCitations",
                columns: new[] { "HabitatAnalysisId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_AnalysisFactors_Analysis_SortOrder",
                table: "AnalysisFactors",
                columns: new[] { "HabitatAnalysisId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExperimentMaterials_MaterialId",
                table: "ExperimentMaterials",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_ExperimentParameters_Experiment_Key",
                table: "ExperimentParameters",
                columns: new[] { "ExperimentId", "ParameterKey" });

            migrationBuilder.CreateIndex(
                name: "IX_ExperimentParameters_ResearchSourceId",
                table: "ExperimentParameters",
                column: "ResearchSourceId");

            migrationBuilder.CreateIndex(
                name: "IX_Experiments_Discipline_Gravity",
                table: "Experiments",
                columns: new[] { "Discipline", "GravityCondition" });

            migrationBuilder.CreateIndex(
                name: "IX_Experiments_Title",
                table: "Experiments",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "UX_Experiments_External",
                table: "Experiments",
                columns: new[] { "ExternalSystem", "ExternalId" },
                unique: true,
                filter: "[ExternalSystem] IS NOT NULL AND [ExternalId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ExperimentSources_ResearchSourceId",
                table: "ExperimentSources",
                column: "ResearchSourceId");

            migrationBuilder.CreateIndex(
                name: "IX_HabitatAnalyses_CorrelationId",
                table: "HabitatAnalyses",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_HabitatAnalyses_Environment_Material_RequestedAt",
                table: "HabitatAnalyses",
                columns: new[] { "SpaceEnvironmentId", "MaterialId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_HabitatAnalyses_MaterialId",
                table: "HabitatAnalyses",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_HabitatAnalyses_RequestedAt",
                table: "HabitatAnalyses",
                column: "RequestedAt",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_KnowledgeCitations_ResearchSourceId",
                table: "KnowledgeCitations",
                column: "ResearchSourceId");

            migrationBuilder.CreateIndex(
                name: "UX_KnowledgeCitations_Query_SortOrder",
                table: "KnowledgeCitations",
                columns: new[] { "KnowledgeQueryId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KnowledgeQueries_CorrelationId",
                table: "KnowledgeQueries",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_KnowledgeQueries_RequestedAt",
                table: "KnowledgeQueries",
                column: "RequestedAt",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialProperties_ResearchSourceId",
                table: "MaterialProperties",
                column: "ResearchSourceId");

            migrationBuilder.CreateIndex(
                name: "UX_MaterialProperties_Material_Key",
                table: "MaterialProperties",
                columns: new[] { "MaterialId", "PropertyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Category",
                table: "Materials",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "UX_Materials_Code",
                table: "Materials",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResearchSources_Title",
                table: "ResearchSources",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "UX_ResearchSources_DoiNormalized",
                table: "ResearchSources",
                column: "DoiNormalized",
                unique: true,
                filter: "[DoiNormalized] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UX_ResearchSources_External",
                table: "ResearchSources",
                columns: new[] { "ExternalSystem", "ExternalId" },
                unique: true,
                filter: "[ExternalSystem] IS NOT NULL AND [ExternalId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SpaceEnvironments_DefaultsSourceId",
                table: "SpaceEnvironments",
                column: "DefaultsSourceId");

            migrationBuilder.CreateIndex(
                name: "UX_SpaceEnvironments_Code",
                table: "SpaceEnvironments",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Technologies_Category",
                table: "Technologies",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "UX_Technologies_Slug",
                table: "Technologies",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TechnologyApplications_ResearchSourceId",
                table: "TechnologyApplications",
                column: "ResearchSourceId");

            migrationBuilder.CreateIndex(
                name: "UX_TechnologyApplications_Technology_SortOrder",
                table: "TechnologyApplications",
                columns: new[] { "TechnologyId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TechnologyExperiments_ExperimentId",
                table: "TechnologyExperiments",
                column: "ExperimentId");

            migrationBuilder.CreateIndex(
                name: "IX_TechnologySources_ResearchSourceId",
                table: "TechnologySources",
                column: "ResearchSourceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnalysisCitations");

            migrationBuilder.DropTable(
                name: "AnalysisFactors");

            migrationBuilder.DropTable(
                name: "ExperimentMaterials");

            migrationBuilder.DropTable(
                name: "ExperimentParameters");

            migrationBuilder.DropTable(
                name: "ExperimentSources");

            migrationBuilder.DropTable(
                name: "KnowledgeCitations");

            migrationBuilder.DropTable(
                name: "MaterialProperties");

            migrationBuilder.DropTable(
                name: "TechnologyApplications");

            migrationBuilder.DropTable(
                name: "TechnologyExperiments");

            migrationBuilder.DropTable(
                name: "TechnologySources");

            migrationBuilder.DropTable(
                name: "HabitatAnalyses");

            migrationBuilder.DropTable(
                name: "KnowledgeQueries");

            migrationBuilder.DropTable(
                name: "Experiments");

            migrationBuilder.DropTable(
                name: "Technologies");

            migrationBuilder.DropTable(
                name: "Materials");

            migrationBuilder.DropTable(
                name: "SpaceEnvironments");

            migrationBuilder.DropTable(
                name: "ResearchSources");
        }
    }
}
