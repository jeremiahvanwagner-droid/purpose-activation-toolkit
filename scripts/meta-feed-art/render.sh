#!/bin/bash
# Render every plate in plate.html to public/store/feed/<slug>.png at 1200×1200
# with headless Chrome. Re-run after changing a plate's words or the store's
# plate styling; commit the PNGs — the feed links to them by URL.
set -u
cd "$(dirname "$0")/../.." || exit 1
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
HTML="$(pwd -W 2>/dev/null || pwd)/scripts/meta-feed-art/plate.html"
OUT="public/store/feed"; mkdir -p "$OUT"
for slug in inner-alignment-audit purpose-activation-toolkit inner-work-integration-course-47 divine-alignment-blueprint first-step-through-the-veil deep-dive-call; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1200,1200 --virtual-time-budget=2000 \
    --screenshot="$(pwd -W 2>/dev/null || pwd)/$OUT/$slug.png" "file:///$HTML?slug=$slug" >/dev/null 2>&1
  printf "  %-36s %s\n" "$slug" "$(stat -c%s "$OUT/$slug.png" 2>/dev/null || echo MISSING) bytes"
done
