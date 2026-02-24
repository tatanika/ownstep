# ===== OwnStep - Start =====
# This script starts xray-core with the config from the web UI

param(
    [string]$ConfigPath = '',
    [switch]$SetSystemProxy
)

$ErrorActionPreference = 'Stop'

$binDir = Join-Path $PSScriptRoot 'bin'
$xrayPath = Join-Path $binDir 'xray.exe'

# Check if xray exists
if (-not (Test-Path $xrayPath)) {
    Write-Host '[!] xray.exe not found. Running download script...' -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'download-xray.ps1')
    if (-not (Test-Path $xrayPath)) {
        Write-Host '[ERROR] Xray-core download failed' -ForegroundColor Red
        exit 1
    }
}

# Find config
if (-not $ConfigPath) {
    $possiblePaths = @(
        (Join-Path $PSScriptRoot 'config.json'),
        (Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads\config.json'),
        (Join-Path ([Environment]::GetFolderPath('Desktop')) 'config.json')
    )
    foreach ($p in $possiblePaths) {
        if (Test-Path $p) {
            $ConfigPath = $p
            break
        }
    }
}

if (-not $ConfigPath -or -not (Test-Path $ConfigPath)) {
    Write-Host '========================================' -ForegroundColor Red
    Write-Host '  Config not found!                    ' -ForegroundColor Red
    Write-Host '========================================' -ForegroundColor Red
    Write-Host ''
    Write-Host 'Please do one of the following:' -ForegroundColor Yellow
    Write-Host '  1. Open index.html in browser' -ForegroundColor White
    Write-Host '  2. Configure your server settings' -ForegroundColor White
    Write-Host '  3. Click the connect button to download config.json' -ForegroundColor White
    Write-Host '  4. Move config.json to this folder' -ForegroundColor White
    Write-Host ''
    Write-Host 'Or run: .\start-vpn.ps1 -ConfigPath C:\path\to\config.json' -ForegroundColor Cyan
    exit 1
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  OwnStep - Starting                   ' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host ('[*] Config: ' + $ConfigPath) -ForegroundColor Green
Write-Host ('[*] Xray:   ' + $xrayPath) -ForegroundColor Green

# Parse config to show info
try {
    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    $firstOut = $config.outbounds[0]
    Write-Host ('[*] Protocol: ' + $firstOut.protocol) -ForegroundColor Green

    if ($firstOut.settings.vnext) {
        $addr = $firstOut.settings.vnext[0].address
        $port = $firstOut.settings.vnext[0].port
        Write-Host ('[*] Server: ' + $addr + ':' + $port) -ForegroundColor Green
    }

    # Check for chaining
    $chainedProxy = $config.outbounds | Where-Object { $_.proxySettings }
    if ($chainedProxy) {
        Write-Host ('[*] Proxy chain detected: ' + $chainedProxy.tag + ' via ' + $chainedProxy.proxySettings.tag) -ForegroundColor Magenta
    }

    $socksIn = $config.inbounds | Where-Object { $_.protocol -eq 'socks' }
    $httpIn = $config.inbounds | Where-Object { $_.protocol -eq 'http' }
    $socksPort = $socksIn.port
    $httpPort = $httpIn.port
    Write-Host ('[*] SOCKS5: 127.0.0.1:' + $socksPort) -ForegroundColor Cyan
    Write-Host ('[*] HTTP:   127.0.0.1:' + $httpPort) -ForegroundColor Cyan
}
catch {
    Write-Host '[!] Could not parse config for info display' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Starting Xray-core...' -ForegroundColor Yellow
Write-Host 'Press Ctrl+C to stop' -ForegroundColor DarkGray
Write-Host ''

# Set system proxy if requested
if ($SetSystemProxy) {
    try {
        # Take only the FIRST http inbound (DE) to avoid array issues with multiple http ports
        $httpIn2 = @($config.inbounds | Where-Object { $_.protocol -eq 'http' })[0]
        $httpPort2 = $httpIn2.port
        if ($httpPort2) {
            # Bypass list: only local/private addresses (messengers need VPN since they're blocked in Russia)
            $bypassList = @(
                'localhost',
                '127.0.0.1',
                '10.*',
                '192.168.*',
                '<local>'
            ) -join ';'

            $regPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
            Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 1
            Set-ItemProperty -Path $regPath -Name ProxyServer -Value ('127.0.0.1:' + $httpPort2)
            Set-ItemProperty -Path $regPath -Name ProxyOverride -Value $bypassList
            Write-Host ('[*] System proxy set to 127.0.0.1:' + $httpPort2) -ForegroundColor Green
            Write-Host '[*] Bypass: WhatsApp, Telegram, Signal, local addresses' -ForegroundColor DarkGray
        }
    }
    catch {
        Write-Host '[!] Failed to set system proxy' -ForegroundColor Yellow
    }
}

# Register cleanup
$cleanup = {
    Write-Host ''
    Write-Host '[*] Shutting down...' -ForegroundColor Yellow

    # Remove system proxy
    try {
        $regPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
        Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 0
        Write-Host '[*] System proxy disabled' -ForegroundColor Green
    }
    catch {}
}

try {
    # Start xray
    & $xrayPath run -c $ConfigPath
}
finally {
    & $cleanup
}
