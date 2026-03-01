#!/bin/bash
# ===== OwnStep - Start VPN (macOS) =====
# This script starts xray-core with the config from the web UI

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$SCRIPT_DIR/bin"
XRAY_PATH="$BIN_DIR/xray"

# Check if xray exists
if [ ! -f "$XRAY_PATH" ]; then
    echo "[!] xray not found. Running download script..."
    bash "$SCRIPT_DIR/download-xray-mac.sh"
    if [ ! -f "$XRAY_PATH" ]; then
        echo "[ERROR] Xray-core download failed"
        exit 1
    fi
fi

# Find config
CONFIG_PATH=""
for p in "$SCRIPT_DIR/config.json" "$HOME/Downloads/config.json" "$HOME/Desktop/config.json"; do
    if [ -f "$p" ]; then
        CONFIG_PATH="$p"
        break
    fi
done

if [ -z "$CONFIG_PATH" ]; then
    echo "========================================"
    echo "  Config not found!"
    echo "========================================"
    echo ""
    echo "Please do one of the following:"
    echo "  1. Open setup.html in browser"
    echo "  2. Configure your server settings"
    echo "  3. Click the connect button to download config.json"
    echo "  4. Move config.json to this folder"
    echo ""
    echo "Or run: ./start-vpn-mac.sh /path/to/config.json"
    exit 1
fi

# Allow passing config path as argument
if [ -n "$1" ] && [ -f "$1" ]; then
    CONFIG_PATH="$1"
fi

echo "========================================"
echo "  OwnStep - Starting"
echo "========================================"
echo ""
echo "[*] Config: $CONFIG_PATH"
echo "[*] Xray:   $XRAY_PATH"

# Parse config to show info (using python which is pre-installed on macOS)
if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
try:
    with open('$CONFIG_PATH') as f:
        config = json.load(f)
    out = config.get('outbounds', [{}])[0]
    print('[*] Protocol:', out.get('protocol', 'unknown'))
    vnext = out.get('settings', {}).get('vnext', [{}])[0]
    if vnext.get('address'):
        print('[*] Server:', vnext['address'] + ':' + str(vnext.get('port', '?')))
    for ib in config.get('inbounds', []):
        if ib.get('protocol') == 'socks':
            print('[*] SOCKS5: 127.0.0.1:' + str(ib['port']))
        elif ib.get('protocol') == 'http':
            print('[*] HTTP:   127.0.0.1:' + str(ib['port']))
except Exception as e:
    print('[!] Could not parse config:', e)
" 2>/dev/null
fi

echo ""
echo "Starting Xray-core..."
echo "Press Ctrl+C to stop"
echo ""

# Detect the active network service (Wi-Fi or Ethernet)
NETWORK_SERVICE=""
for svc in "Wi-Fi" "Ethernet" "USB 10/100/1000 LAN"; do
    if networksetup -getinfo "$svc" 2>/dev/null | grep -q "IP address"; then
        NETWORK_SERVICE="$svc"
        break
    fi
done

# Get HTTP port from config
HTTP_PORT=""
if command -v python3 &>/dev/null; then
    HTTP_PORT=$(python3 -c "
import json
with open('$CONFIG_PATH') as f:
    config = json.load(f)
for ib in config.get('inbounds', []):
    if ib.get('protocol') == 'http':
        print(ib['port'])
        break
" 2>/dev/null)
fi

# Set system proxy
PROXY_SET=false
if [ -n "$NETWORK_SERVICE" ] && [ -n "$HTTP_PORT" ]; then
    echo "[*] Setting system proxy on '$NETWORK_SERVICE' → 127.0.0.1:$HTTP_PORT"
    networksetup -setwebproxy "$NETWORK_SERVICE" 127.0.0.1 "$HTTP_PORT" 2>/dev/null
    networksetup -setsecurewebproxy "$NETWORK_SERVICE" 127.0.0.1 "$HTTP_PORT" 2>/dev/null
    networksetup -setproxybypassdomains "$NETWORK_SERVICE" "localhost" "127.0.0.1" "10.*" "192.168.*" "*.local" 2>/dev/null
    PROXY_SET=true
    echo "[*] System proxy enabled"
else
    echo "[!] Could not detect active network — system proxy not set"
    echo "    VPN will still work via browser extension or manual proxy settings"
fi

# Cleanup function
cleanup() {
    echo ""
    echo "[*] Shutting down..."
    if [ "$PROXY_SET" = true ] && [ -n "$NETWORK_SERVICE" ]; then
        networksetup -setwebproxystate "$NETWORK_SERVICE" off 2>/dev/null
        networksetup -setsecurewebproxystate "$NETWORK_SERVICE" off 2>/dev/null
        echo "[*] System proxy disabled"
    fi
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

# Start xray
"$XRAY_PATH" run -c "$CONFIG_PATH"
