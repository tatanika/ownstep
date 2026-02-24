@echo off
chcp 65001 >nul
title OwnStep
echo.
echo    ========================================
echo      OwnStep - Starting...
echo    ========================================
echo.
echo    Do not close this window!
echo    Press Ctrl+C to stop.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0start-vpn.ps1' -SetSystemProxy"
pause
