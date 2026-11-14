#!/usr/bin/env bash
# KIVO · SOT-160 — اختبارُ «المطوّر من الصفر»: استنساخٌ جديد للمستودع (ما هو مُلتزَم فقط) ← الاعتماديات ← المشتقّات ← البناء ← الفحوص السريعة واختباراتُ الوحدة
# ← بصمةُ الحزمة المبنية من الاستنساخ = بصمةُ pk249 في مجلد العمل (الحتمية من مصدرٍ نظيف).
#   bash tools/onboard_check.sh [249] [--keep]    (الدليلُ يُكتب إلى k2NN/evidence/onboard_<تاريخ>.txt)
set -uo pipefail
cd "$(dirname "$0")/.."; ROOT=$PWD; N=${1:-265}; KEEP=${2:-}
T=$(mktemp -d /tmp/kivo_onboard_XXXX); LOG="$ROOT/reports/k$N/onboard_$(date -u +%Y%m%dT%H%M%SZ).txt"; mkdir -p "$(dirname "$LOG")"
step(){ printf '%-52s' "$1"; shift; local t0=$SECONDS; if out=$(nice -n 19 "$@" 2>&1); then echo "✔ ($((SECONDS-t0))s) $(echo "$out" | tail -1 | cut -c1-90)"; else echo "✘ ($((SECONDS-t0))s)"; echo "$out" | tail -15; FAIL=1; fi; }
FAIL=0
{
echo "══ onboarding من الصفر · KIVO_$N · $(date -u +%FT%TZ) · node $(node --version) · npm $(npm --version) · $(python3 --version) ══"
step "git clone (المُلتزَم فقط)" git clone -q "$ROOT" "$T/kivo"
cd "$T/kivo"
echo "   الإيداع: $(git rev-parse --short HEAD) · ملفاتٌ متتبَّعة: $(git ls-files | wc -l)"
step "npm ci (الجذر)" npm ci --ignore-scripts --no-audit --no-fund
step "npm ci (cfbench)" bash -c "cd cfbench && npm ci --ignore-scripts --no-audit --no-fund"
SRCDIR=$([ -d "k$N/src" ] && echo "k$N/src" || echo src)
step "المشتقّات = مصادرها (generate --check)" python3 tools/generate.py --src "$SRCDIR" --check
step "البناءُ من مصدرٍ نظيف (build_chain)" bash tools/build_chain.sh "$N"
step "الفحوصُ الساكنة (static)" npm run -s lab:static
step "تطابقُ السجلّين (gate.py)" python3 gate.py "pk$N"
step "ESLint + الألوان الخام + نقاطُ الكسر + الأيقونات" bash -c "npm run -s lint && python3 tools/color_ratchet.py $SRCDIR && python3 tools/bp_ratchet.py $SRCDIR && python3 tools/icons.py check --src $SRCDIR"
step "SBOM + مخطّطُ البيئة" bash -c "python3 tools/sbom.py --src $SRCDIR --check && python3 tools/env_check.py $SRCDIR"
step "اختباراتُ الوحدة" bash -c "set -o pipefail; node --no-warnings --test tests/unit/*.test.mjs src/systems/*/tests/*.test.mjs 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' '"
step "الفرقُ بالضبط · التكافؤ · الخصوصية" bash -c "set -o pipefail; npm run -s check:$N 2>&1 | grep -E 'النتيجة|✘' | tr '\n' ' '"
A=$(cd "$T/kivo" && find "pk$N" -type f | LC_ALL=C sort | xargs sha256sum | sha256sum | cut -c1-64)
B=$(cd "$ROOT" && find "pk$N" -type f | LC_ALL=C sort | xargs sha256sum | sha256sum | cut -c1-64)
if [ "$A" = "$B" ]; then echo "✔ بصمةُ pk$N من الاستنساخ النظيف = بصمةُ مجلد العمل ($A)"; else echo "✘ بصمةُ pk$N تختلف: استنساخ $A ≠ عمل $B"; FAIL=1; fi
echo "══ النتيجة: $([ $FAIL -eq 0 ] && echo PASS || echo FAIL) ══"
} 2>&1 | tee "$LOG"
[ -n "$KEEP" ] || rm -rf "$T"
exit $FAIL
