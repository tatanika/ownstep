#!/bin/bash
# ===== OwnStep - Download Xray-core for macOS =====

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$SCRIPT_DIR/bin"
XRAY_PATH="$BIN_DIR/xray"

if [ -f "$XRAY_PATH" ]; then
    echo "[OK] xray already exists"
    "$XRAY_PATH" version
    exit 0
fi

echo "========================================"
echo "  OwnStep - Downloading Xray-core"
echo "========================================"
echo ""

# Get latest release info from GitHub
echo "[*] Fetching latest release info..."
RELEASE_JSON=$(curl -s "https://api.github.com/repos/XTLS/Xray-core/releases/latest")

if [ -z "$RELEASE_JSON" ]; then
    echo "[ERROR] Failed to fetch release info"
    echo "Please download manually from https://github.com/XTLS/Xray-core/releases"
    exit 1
fi

VERSION=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//')
echo "[*] Latest version: $VERSION"

# Detect architecture (Intel vs Apple Silicon)
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        XRAY_ASSET="Xray-macos-64"
        echo "[*] Architecture: Intel (x86_64)"
        ;;
    arm64)
        XRAY_ASSET="Xray-macos-arm64-v8a"
        echo "[*] Architecture: Apple Silicon (arm64)"
        ;;
    *)
        echo "[ERROR] Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

DOWNLOAD_URL="https://github.com/XTLS/Xray-core/releases/download/$VERSION/$XRAY_ASSET.zip"
ZIP_PATH="/tmp/xray-mac.zip"

echo "[*] Downloading: $XRAY_ASSET.zip"
echo "    URL: $DOWNLOAD_URL"

curl -sL -o "$ZIP_PATH" "$DOWNLOAD_URL"

if [ ! -f "$ZIP_PATH" ] || [ ! -s "$ZIP_PATH" ]; then
    echo "[ERROR] Download failed"
    exit 1
fi

echo "[*] Downloaded successfully!"

# Extract
echo "[*] Extracting to $BIN_DIR ..."
mkdir -p "$BIN_DIR"
unzip -qo "$ZIP_PATH" -d "$BIN_DIR"
rm -f "$ZIP_PATH"
chmod +x "$XRAY_PATH"

# Verify
if [ -f "$XRAY_PATH" ]; then
    echo ""
    echo "[SUCCESS] Xray-core installed!"
    "$XRAY_PATH" version

    # Remove macOS quarantine attribute so Gatekeeper doesn't block it
    xattr -d com.apple.quarantine "$XRAY_PATH" 2>/dev/null || true
else
    echo "[ERROR] xray not found after extraction"
    echo "Contents of $BIN_DIR:"
    ls -la "$BIN_DIR"
    exit 1
fi

echo ""
echo "Now run: ./start-vpn-mac.sh"
