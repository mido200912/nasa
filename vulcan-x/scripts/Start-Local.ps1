param(
    [ValidateRange(1024, 65535)][int]$FrontendPort = 3012,
    [ValidateRange(1024, 65535)][int]$ApiPort = 5082,
    [ValidateRange(1024, 65535)][int]$AiPort = 4000,
    [string]$DotNet = "dotnet",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "Frontend"
$ai = Join-Path $root "ai-model"
$api = Join-Path $root "Backend\NASA-Project-Back-End\NASA.FireSafety.API\NASA.FireSafety.API"
$logs = Join-Path $env:LOCALAPPDATA ("Temp\opencode\nasa-local-" + [Guid]::NewGuid().ToString("N"))
$artifacts = Join-Path $logs "build"
$dotnetCommand = (Get-Command $DotNet -ErrorAction Stop).Source
$bunCommand = (Get-Command bun -ErrorAction Stop).Source
$nodeCommand = (Get-Command node -ErrorAction Stop).Source
if (@($FrontendPort, $ApiPort, $AiPort | Select-Object -Unique).Count -ne 3) {
    throw "Choose three distinct ports."
}
foreach ($port in @($FrontendPort, $ApiPort, $AiPort)) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. No existing process has been stopped."
    }
}
if (!(Test-Path (Join-Path $ai "node_modules")) -or !(Test-Path (Join-Path $frontend "node_modules"))) {
    throw "Install dependencies first: bun install --frozen-lockfile in ai-model; npm ci in Frontend."
}
if (!(Test-Path (Join-Path $frontend ".next\standalone\server.js"))) {
    throw "Build the frontend first: npm run build in Frontend."
}
New-Item -ItemType Directory -Path $logs | Out-Null
$oldEnvironment = @{}
$names = @("DOTNET_ROOT", "DOTNET_ROOT_X64", "ASPNETCORE_ENVIRONMENT", "ASPNETCORE_URLS", "VulcanX__BaseUrl", "VulcanX__TimeoutSeconds",
    "PORT", "HOSTNAME", "NODE_ENV", "FIRE_SAFETY_API_BASE_URL", "FIRE_SAFETY_API_TIMEOUT_SECONDS", "FIRE_SAFETY_AI_TIMEOUT_SECONDS")
foreach ($name in $names) { $oldEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process") }
$children = @()
try {
    $sdkRoot = Split-Path $dotnetCommand -Parent
    $env:DOTNET_ROOT = $sdkRoot
    $env:DOTNET_ROOT_X64 = $sdkRoot
    $env:ASPNETCORE_ENVIRONMENT = "Development"
    $env:ASPNETCORE_URLS = "http://127.0.0.1:$ApiPort"
    $env:VulcanX__BaseUrl = "http://127.0.0.1:$AiPort"
    $env:VulcanX__TimeoutSeconds = "60"
    $env:FIRE_SAFETY_API_BASE_URL = "http://127.0.0.1:$ApiPort"
    $env:FIRE_SAFETY_API_TIMEOUT_SECONDS = "75"
    $env:FIRE_SAFETY_AI_TIMEOUT_SECONDS = "60"
    if (!$SkipBuild) {
        Push-Location $api
        try {
            & $dotnetCommand build --artifacts-path $artifacts --verbosity quiet
            if ($LASTEXITCODE -ne 0) { throw "API build failed. Use a .NET 8 SDK via -DotNet." }
        } finally { Pop-Location }
    }
    $dll = if ($SkipBuild) { Join-Path $api "bin\Debug\net8.0\NASA.FireSafety.API.dll" } else { Join-Path $artifacts "bin\NASA.FireSafety.API\debug\NASA.FireSafety.API.dll" }
    if (!(Test-Path $dll)) { throw "API binary is missing; omit -SkipBuild." }
    $children += Start-Process $dotnetCommand -ArgumentList "`"$dll`"" -WorkingDirectory $api -PassThru -RedirectStandardOutput "$logs\api.log" -RedirectStandardError "$logs\api-error.log"
    $env:PORT = "$AiPort"
    $env:NODE_ENV = "production"
    $children += Start-Process $bunCommand -ArgumentList "run", "server.ts" -WorkingDirectory $ai -PassThru -RedirectStandardOutput "$logs\ai.log" -RedirectStandardError "$logs\ai-error.log"
    $env:PORT = "$FrontendPort"
    $env:HOSTNAME = "127.0.0.1"
    $env:NODE_ENV = "production"
    $children += Start-Process $nodeCommand -ArgumentList "scripts/start.mjs" -WorkingDirectory $frontend -PassThru -RedirectStandardOutput "$logs\frontend.log" -RedirectStandardError "$logs\frontend-error.log"
    $manifest = @{ frontend = "http://127.0.0.1:$FrontendPort"; api = "http://127.0.0.1:$ApiPort"; ai = "http://127.0.0.1:$AiPort"; processIds = @($children | ForEach-Object { $_.Id }); logs = $logs }
    $manifest | ConvertTo-Json | Set-Content (Join-Path $logs "processes.json")
    $manifest | ConvertTo-Json
    Write-Host "Processes launched; readiness is not yet verified. SQL must already be migrated/seeded and configured in local User Secrets or the process environment. No database was created or altered."
} catch {
    foreach ($child in $children) { Stop-Process -Id $child.Id -ErrorAction SilentlyContinue }
    throw
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $oldEnvironment[$name], "Process") }
}
