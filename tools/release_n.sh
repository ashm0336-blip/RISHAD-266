#!/usr/bin/env bash
# KIVO_262 · رقمُ الإصدار الجاري من مصدرٍ واحد (src/core/270-bs-ver.js: "YYYY.MM.DD-NNN") — يستعمله CI والأدوات بدل رقمٍ مكتوبٍ يدوياً.
#   bash tools/release_n.sh     → يطبع رقمَ الإصدار (مثلاً 263) — بلا أثرٍ جانبي
set -euo pipefail
cd "$(dirname "$0")/.."
N=$(grep -o '"[0-9.]*-[0-9]*"' src/core/270-bs-ver.js | head -1 | sed 's/.*-\([0-9]*\)"/\1/')
[ -n "$N" ] || { echo "✘ لا رقمَ إصدار في src/core/270-bs-ver.js" >&2; exit 2; }
echo "$N"
