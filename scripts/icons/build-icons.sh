#!/usr/bin/env bash
# Renders public/icons/*.png from scripts/icons/icon.html with headless Chromium.
# Requires Chromium on PATH or CHROME=/path/to/chrome.
set -euo pipefail
cd "$(dirname "$0")/../.."
CHROME="${CHROME:-$(command -v chromium || command -v google-chrome || true)}"
[ -n "$CHROME" ] || { echo "Chromium not found; set CHROME=" >&2; exit 1; }
mkdir -p public/icons
SRC="file://$PWD/scripts/icons/icon.html"
shot() { "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size="$2,$2" --screenshot="$3" "$SRC#$1" >/dev/null 2>&1; }
shot "size=512" 512 public/icons/icon-512.png
shot "size=512&maskable=1" 512 public/icons/icon-maskable-512.png
shot "size=192" 192 public/icons/icon-192.png
shot "size=180" 180 public/icons/apple-touch-icon.png
ls -la public/icons
