#!/bin/bash
# OwnStep — Launch Chrome with VPN proxy (macOS)

echo "[OwnStep] Launching Chrome with GERMAN VPN proxy..."

# Kill existing Chrome instances
pkill -f "Google Chrome" 2>/dev/null
sleep 2

# Launch Chrome with proxy
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --proxy-server=socks5://127.0.0.1:10808 \
    --user-data-dir=/tmp/chrome-vpn \
    &>/dev/null &

echo "[OwnStep] Chrome started with DE VPN (port 10808)"
