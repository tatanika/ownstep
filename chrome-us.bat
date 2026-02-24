@echo off
echo [ShadowLink] Launching Chrome with US proxy (via Germany)...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --proxy-server=socks5://127.0.0.1:10818 --user-data-dir=C:\temp\chrome-us
echo [ShadowLink] Chrome started with US proxy (port 10818)
