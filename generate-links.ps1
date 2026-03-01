# generate-links.ps1 - Generates VLESS links from config.json

$configPath = Join-Path $PSScriptRoot 'config.json'
if (-not (Test-Path $configPath)) {
    Write-Host '[ERROR] config.json not found' -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json

Write-Host ''
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host '    OwnStep - Phone Links Generator   ' -ForegroundColor Cyan
Write-Host '  ========================================' -ForegroundColor Cyan
Write-Host ''

$links = @()

foreach ($out in $config.outbounds) {
    if ($out.protocol -ne 'vless') { continue }
    if (-not $out.streamSettings.realitySettings) { continue }

    $vnext = $out.settings.vnext[0]
    $user = $vnext.users[0]
    $reality = $out.streamSettings.realitySettings

    $uuid = $user.id
    $addr = $vnext.address
    $port = $vnext.port
    $flow = $user.flow
    $sni = $reality.serverName
    $pbk = $reality.publicKey
    $fp = $reality.fingerprint
    $tag = $out.tag

    $name = 'OwnStep'
    if ($tag -match 'us') { $name = 'OwnStep_US' }
    elseif ($tag -match 'de') { $name = 'OwnStep_DE' }

    $link = 'vless://' + $uuid + '@' + $addr + ':' + $port + '?type=tcp&security=reality&sni=' + $sni + '&pbk=' + $pbk + '&flow=' + $flow + '&fp=' + $fp + '#' + $name

    $links += @{ tag = $tag; name = $name; link = $link }

    if ($tag -match 'us') {
        Write-Host '  US (Amerika):' -ForegroundColor Green
    }
    else {
        Write-Host '  DE (Germany):' -ForegroundColor Yellow
    }
    Write-Host ('  ' + $link) -ForegroundColor White
    Write-Host ''
}

# Save to phone-links.md
$md = "# Phone Links (auto-generated)`n`n"
foreach ($l in $links) {
    $md += '## ' + $l.name + "`n" + '```' + "`n" + $l.link + "`n" + '```' + "`n`n"
}
$md += '## How to use:' + "`n"
$md += '1. Copy the link' + "`n"
$md += '2. In v2rayNG / Hiddify press + > Import from clipboard' + "`n"
$md += '3. Connect' + "`n"

$mdPath = Join-Path $PSScriptRoot 'phone-links.md'
$md | Out-File -FilePath $mdPath -Encoding utf8
Write-Host ('  Saved to: ' + $mdPath) -ForegroundColor Gray
Write-Host ''
Write-Host '  Copy any link above and paste into v2rayNG / Hiddify' -ForegroundColor Cyan
Write-Host ''
