param(
    [Parameter(Mandatory=$true)][string]$DotNet,
    [Parameter(Mandatory=$true)][string]$ApiAssembly,
    [Parameter(Mandatory=$true)][string]$EvidenceDirectory,
    [string]$DatabaseName = ("Flame_M6_M7_" + [guid]::NewGuid().ToString("N"))
)
$ErrorActionPreference = 'Stop'
if ($DatabaseName -notmatch '^Flame_M6_M7_[a-fA-F0-9_]+$') { throw 'Only unique QA database names are permitted.' }
if (-not $env:ConnectionStrings__FireSafetyDb) { throw 'Supply the approved local SQL connection securely in the process environment.' }
$original = $env:ConnectionStrings__FireSafetyDb
$previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
$builder = [System.Data.SqlClient.SqlConnectionStringBuilder]::new($original)
$builder.set_InitialCatalog('master')
$admin = [System.Data.SqlClient.SqlConnection]::new($builder.ConnectionString)
$restoreName = "${DatabaseName}_Restore"
function ExecuteSql([string]$sql) {
    $command = $admin.CreateCommand()
    $command.CommandTimeout = 180
    $command.CommandText = $sql
    $table = [System.Data.DataTable]::new()
    $reader = $command.ExecuteReader()
    try { if ($reader.FieldCount -gt 0) { $table.Load($reader) } } finally { $reader.Dispose() }
    return ,$table
}
try {
    $admin.Open()
    $check = $admin.CreateCommand()
    $check.CommandText = 'SELECT COUNT(*) FROM sys.databases WHERE name IN (@db,@restore)'
    [void]$check.Parameters.AddWithValue('@db', $DatabaseName)
    [void]$check.Parameters.AddWithValue('@restore', $restoreName)
    if ([int]$check.ExecuteScalar() -ne 0) { throw 'Refusing to overwrite an existing database.' }
    $builder.set_InitialCatalog($DatabaseName)
    $env:ConnectionStrings__FireSafetyDb = $builder.ConnectionString
    # Local QA uses the existing self-signed SQL container, not production TLS signoff.
    $env:ASPNETCORE_ENVIRONMENT = 'Staging'
    New-Item -ItemType Directory -Force -Path $EvidenceDirectory | Out-Null
    & $DotNet $ApiAssembly --migrate-database *> (Join-Path $EvidenceDirectory 'disposable-migration.log')
    if ($LASTEXITCODE -ne 0) { throw 'Explicit QA migration failed. Inspect the safe local log.' }
    foreach ($run in 1,2) {
        & $DotNet $ApiAssembly --seed-curated-catalog *> (Join-Path $EvidenceDirectory "disposable-seed-$run.log")
        if ($LASTEXITCODE -ne 0) { throw 'Explicit QA seed failed.' }
    }
    $backup = "/var/opt/mssql/data/${DatabaseName}.bak"
    [void](ExecuteSql "BACKUP DATABASE [$DatabaseName] TO DISK=N'$backup' WITH COPY_ONLY,CHECKSUM")
    [void](ExecuteSql "RESTORE VERIFYONLY FROM DISK=N'$backup' WITH CHECKSUM")
    $files = ExecuteSql "RESTORE FILELISTONLY FROM DISK=N'$backup'"
    $moves = @($files.Rows | ForEach-Object {
        $logical = ([string]$_.LogicalName).Replace("'", "''")
        $suffix = if ($_.Type -eq 'L') { 'ldf' } else { 'mdf' }
        "MOVE N'$logical' TO N'/var/opt/mssql/data/${restoreName}.$suffix'"
    })
    # Never WITH REPLACE, never restore over an existing target.
    [void](ExecuteSql ("RESTORE DATABASE [$restoreName] FROM DISK=N'$backup' WITH CHECKSUM," + ($moves -join ',')))
    $result = ExecuteSql "SELECT name AS DatabaseName FROM sys.databases WHERE name IN (N'$DatabaseName',N'$restoreName')"
    foreach ($name in @($DatabaseName, $restoreName)) {
        $counts = ExecuteSql "SELECT (SELECT COUNT(*) FROM [$name].sys.tables WHERE name<>N'__EFMigrationsHistory') AS Tables,(SELECT COUNT(*) FROM [$name].dbo.SpaceEnvironments) AS Environments,(SELECT COUNT(*) FROM [$name].dbo.Materials) AS Materials,(SELECT COUNT(*) FROM [$name].dbo.ResearchSources) AS Sources"
        if ($counts.Rows[0].Tables -ne 17 -or $counts.Rows[0].Environments -ne 3 -or $counts.Rows[0].Materials -ne 1 -or $counts.Rows[0].Sources -ne 3) { throw 'Schema/seed/restore verification mismatch.' }
    }
    [PSCustomObject]@{ Database=$DatabaseName; RestoredDatabase=$restoreName; Tables=17; Environments=3; Materials=1; Sources=3; BackupChecksumVerified=$true; ExistingDatabaseOverwritten=$false } |
        ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $EvidenceDirectory 'disposable-database.json')
    Write-Output "QA migration, repeat seed, backup checksum and separate-target restore passed. Both QA databases retained."
} finally {
    $admin.Dispose()
    $env:ConnectionStrings__FireSafetyDb = $original
    $env:ASPNETCORE_ENVIRONMENT = $previousEnvironment
}
