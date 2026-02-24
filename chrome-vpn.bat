@echo off
echo [ShadowLink] Launching Chrome with GERMAN VPN proxy...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --proxy-server=socks5://127.0.0.1:10808 --user-data-dir=C:\temp\chrome-vpn
echo [ShadowLink] Chrome started with DE VPN (port 10808)
