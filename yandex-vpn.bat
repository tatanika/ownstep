@echo off
echo [ShadowLink] Launching Yandex Browser with GERMAN VPN proxy...
taskkill /F /IM browser.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "C:\Users\Таня\AppData\Local\Yandex\YandexBrowser\Application\browser.exe" --proxy-server=socks5://127.0.0.1:10808 --user-data-dir=C:\temp\yandex-vpn
echo [ShadowLink] Yandex Browser started with DE VPN (port 10808)
