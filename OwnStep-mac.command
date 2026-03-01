#!/bin/bash
# OwnStep — macOS Launcher
# Double-click this file to start VPN

cd "$(dirname "$0")"

echo ""
echo "    ========================================"
echo "      OwnStep - Starting..."
echo "    ========================================"
echo ""
echo "    Do not close this window!"
echo "    Press Ctrl+C to stop."
echo ""

bash ./start-vpn-mac.sh

echo ""
echo "Press any key to close..."
read -n 1
