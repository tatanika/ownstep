# ===== ShadowLink - Download Xray-core =====
# This script downloads the latest Xray-core for Windows

$ErrorActionPreference = 'Stop'

$binDir = Join-Path $PSScriptRoot 'bin'
$xrayPath = Join-Path $binDir 'xray.exe'

if (Test-Path $xrayPath) {
    Write-Host '[OK] xray.exe already exists' -ForegroundColor Green
    & $xrayPath version
    exit 0
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  ShadowLink - Downloading Xray-core   ' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Get latest release info from GitHub
Write-Host '[*] Fetching latest release info...' -ForegroundColor Yellow
$releaseUrl = 'https://api.github.com/repos/XTLS/Xray-core/releases/latest'

try {
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers @{ 'User-Agent' = 'ShadowLink' }
}
catch {
    Write-Host '[ERROR] Failed to fetch release info' -ForegroundColor Red
    Write-Host 'Please download manually from https://github.com/XTLS/Xray-core/releases' -ForegroundColor Yellow
    exit 1
}

$version = $release.tag_name
Write-Host ('[*] Latest version: ' + $version) -ForegroundColor Green

# Find Windows 64-bit asset
$asset = $release.assets | Where-Object { $_.name -match 'Xray-windows-64' -and $_.name -match '\.zip$' } | Select-Object -First 1

if (-not $asset) {
    Write-Host '[ERROR] Could not find Windows 64-bit asset in release' -ForegroundColor Red
    exit 1
}

$downloadUrl = $asset.browser_download_url
$zipName = $asset.name
$zipPath = Join-Path $PSScriptRoot $zipName

Write-Host ('[*] Downloading: ' + $zipName) -ForegroundColor Yellow
Write-Host ('    URL: ' + $downloadUrl) -ForegroundColor DarkGray

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $progressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
}
catch {
    Write-Host '[ERROR] Download failed' -ForegroundColor Red
    exit 1
}

Write-Host '[*] Downloaded successfully!' -ForegroundColor Green

# Extract
Write-Host ('[*] Extracting to ' + $binDir + ' ...') -ForegroundColor Yellow
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

Expand-Archive -Path $zipPath -DestinationPath $binDir -Force

# Cleanup zip
Remove-Item $zipPath -Force

# Verify
if (Test-Path $xrayPath) {
    Write-Host '' -ForegroundColor Green
    Write-Host '[SUCCESS] Xray-core installed!' -ForegroundColor Green
    & $xrayPath version
}
else {
    Write-Host '[ERROR] xray.exe not found after extraction' -ForegroundColor Red
    Write-Host ('Contents of ' + $binDir + ':') -ForegroundColor Yellow
    Get-ChildItem $binDir
    exit 1
}

Write-Host ''
Write-Host 'Now run: .\start-vpn.ps1' -ForegroundColor Cyan
