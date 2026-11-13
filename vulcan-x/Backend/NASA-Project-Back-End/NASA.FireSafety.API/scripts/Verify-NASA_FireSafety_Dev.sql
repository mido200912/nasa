/*
  Read-only verification for the InitialDatabaseSchema migration.
  Run under DESKTOP-K0JOVSB\basil:

  sqlcmd -S "(localdb)\MSSQLLocalDB" -d "NASA_FireSafety_Dev" -E -i ".\scripts\Verify-NASA_FireSafety_Dev.sql"

  This script makes no DDL or DML changes. It exits when connected to another database.
*/
SET NOCOUNT ON;

IF DB_NAME() <> N'NASA_FireSafety_Dev'
    THROW 51000, 'Connect to NASA_FireSafety_Dev before running this verification script.', 1;

SELECT
    @@SERVERNAME AS ServerName,
    DB_NAME() AS DatabaseName,
    SUSER_SNAME() AS LoginName,
    @@VERSION AS SqlServerVersion;

;WITH ExpectedTables AS
(
    SELECT TableName
    FROM (VALUES
        (N'ResearchSources'), (N'SpaceEnvironments'), (N'Materials'), (N'MaterialProperties'),
        (N'Experiments'), (N'ExperimentParameters'), (N'ExperimentMaterials'), (N'ExperimentSources'),
        (N'HabitatAnalyses'), (N'AnalysisFactors'), (N'AnalysisCitations'), (N'KnowledgeQueries'),
        (N'KnowledgeCitations'), (N'Technologies'), (N'TechnologyApplications'),
        (N'TechnologyExperiments'), (N'TechnologySources')
    ) AS Expected(TableName)
)
SELECT TableName AS ExpectedButMissing
FROM ExpectedTables
EXCEPT
SELECT t.name
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE s.name = N'dbo';

SELECT COUNT(*) AS ApplicationTableCount
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE s.name = N'dbo' AND t.name <> N'__EFMigrationsHistory';

SELECT s.name AS SchemaName, t.name AS TableName, t.create_date AS CreatedAt
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE s.name = N'dbo'
ORDER BY t.name;

SELECT
    s.name AS SchemaName,
    t.name AS TableName,
    c.column_id AS Ordinal,
    c.name AS ColumnName,
    CASE
        WHEN ty.name IN (N'varchar', N'char', N'varbinary', N'binary')
            THEN ty.name + N'(' + CASE WHEN c.max_length = -1 THEN N'max' ELSE CONVERT(nvarchar(10), c.max_length) END + N')'
        WHEN ty.name IN (N'nvarchar', N'nchar')
            THEN ty.name + N'(' + CASE WHEN c.max_length = -1 THEN N'max' ELSE CONVERT(nvarchar(10), c.max_length / 2) END + N')'
        WHEN ty.name IN (N'decimal', N'numeric')
            THEN ty.name + N'(' + CONVERT(nvarchar(10), c.precision) + N',' + CONVERT(nvarchar(10), c.scale) + N')'
        WHEN ty.name IN (N'datetime2', N'datetimeoffset', N'time')
            THEN ty.name + N'(' + CONVERT(nvarchar(10), c.scale) + N')'
        ELSE ty.name
    END AS SqlType,
    c.is_nullable AS IsNullable,
    c.is_identity AS IsIdentity,
    dc.definition AS DefaultDefinition
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
INNER JOIN sys.columns AS c ON c.object_id = t.object_id
INNER JOIN sys.types AS ty ON ty.user_type_id = c.user_type_id
LEFT JOIN sys.default_constraints AS dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE s.name = N'dbo'
ORDER BY t.name, c.column_id;

SELECT
    fk.name AS ForeignKeyName,
    OBJECT_SCHEMA_NAME(fk.parent_object_id) AS ChildSchema,
    OBJECT_NAME(fk.parent_object_id) AS ChildTable,
    STRING_AGG(pc.name, N', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ChildColumns,
    OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS ParentSchema,
    OBJECT_NAME(fk.referenced_object_id) AS ParentTable,
    STRING_AGG(rc.name, N', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ParentColumns,
    fk.delete_referential_action_desc AS OnDelete,
    fk.update_referential_action_desc AS OnUpdate,
    fk.is_disabled AS IsDisabled,
    fk.is_not_trusted AS IsNotTrusted
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fkc ON fkc.constraint_object_id = fk.object_id
INNER JOIN sys.columns AS pc ON pc.object_id = fk.parent_object_id AND pc.column_id = fkc.parent_column_id
INNER JOIN sys.columns AS rc ON rc.object_id = fk.referenced_object_id AND rc.column_id = fkc.referenced_column_id
GROUP BY fk.name, fk.parent_object_id, fk.referenced_object_id, fk.delete_referential_action_desc,
         fk.update_referential_action_desc, fk.is_disabled, fk.is_not_trusted
ORDER BY ChildTable, ForeignKeyName;

SELECT
    s.name AS SchemaName,
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_primary_key AS IsPrimaryKey,
    i.is_unique AS IsUnique,
    i.has_filter AS HasFilter,
    i.filter_definition AS FilterDefinition,
    STRING_AGG(
        CASE WHEN ic.is_included_column = 1 THEN N'INCLUDE ' ELSE N'' END +
        c.name + CASE WHEN ic.is_descending_key = 1 THEN N' DESC' ELSE N' ASC' END,
        N', '
    ) WITHIN GROUP (ORDER BY ic.key_ordinal, ic.index_column_id) AS IndexColumns
FROM sys.indexes AS i
INNER JOIN sys.tables AS t ON t.object_id = i.object_id
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
INNER JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
INNER JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE s.name = N'dbo' AND i.index_id > 0
GROUP BY s.name, t.name, i.name, i.type_desc, i.is_primary_key, i.is_unique, i.has_filter, i.filter_definition
ORDER BY t.name, i.name;

SELECT
    s.name AS SchemaName,
    t.name AS TableName,
    cc.name AS CheckConstraintName,
    cc.definition AS CheckDefinition,
    cc.is_disabled AS IsDisabled,
    cc.is_not_trusted AS IsNotTrusted
FROM sys.check_constraints AS cc
INNER JOIN sys.tables AS t ON t.object_id = cc.parent_object_id
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE s.name = N'dbo'
ORDER BY t.name, cc.name;

SELECT MigrationId, ProductVersion
FROM dbo.__EFMigrationsHistory
ORDER BY MigrationId;

IF NOT EXISTS
(
    SELECT 1
    FROM dbo.__EFMigrationsHistory
    WHERE MigrationId = N'20261112173807_InitialDatabaseSchema'
)
    THROW 51001, 'InitialDatabaseSchema is missing from __EFMigrationsHistory.', 1;
