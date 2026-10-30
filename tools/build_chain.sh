#!/usr/bin/env bash
# KIVO — بناءُ مرشّحٍ من مصدرٍ نظيف (SOT-160 · SOT-120): نافذةُ الإصدارين (--retain) تحتاج حزمتَي الإصدارين السابقين، وهما قابلتان لإعادة الإنتاج من مصدريهما
# (أصولُ كل إصدارٍ «الخاصة» لا تعتمد على ما أبقاه هو) — فيُبنيان أولاً إن غابا ثم يُبنى المرشّحُ بسكربت npm الرسمي.
# مصدرُ إصدارٍ سابق: k2NN/src (التخطيطُ الانتقالي) إن وُجد، وإلا الوسمُ git KIVO_2NN (الشجرةُ المستهدفة · ADR-012) يُستخرج بـgit archive إلى مجلدٍ مؤقت.
#   bash tools/build_chain.sh 252        → pk250 (إن غاب) · pk251 (إن غاب) · pk252 + pk252.mono + MANIFEST   (المُبقاةُ من build:N إن أعلنها)
set -euo pipefail
cd "$(dirname "$0")/.."
N=${1:?candidate number, e.g. 265}; MODE=${2:-}; A=$((N-1)); B=$((N-2))
PY=${KIVO_PYTHON:-python3}
export PYTHONIOENCODING=${PYTHONIOENCODING:-utf-8}
[ "$N" != "265" ] || [ -n "$MODE" ] || MODE="--current"
# RISHAD 266 current contract: no historical Git refs and no old schema clients.
# The existing chain is the single build entry point; --legacy below keeps the
# historical reconstruction available explicitly without deploying its assets.
if [ "$MODE" = "--current" ] || [ "$MODE" = "--check-current" ]; then
  [ "$N" = "265" ] || { echo "No current contract is configured for this release." >&2; exit 2; }
  OUT=${KIVO_BUILD_OUT:-pk265}
  "$PY" - "$OUT" <<'PY'
import pathlib,sys
root=pathlib.Path.cwd().resolve(); target=(root/sys.argv[1]).resolve()
protected={'src','workers','public','migrations','config','tools','tests','docs','node_modules','.github','.git','.agents','.codex'}
if target==root or root not in target.parents or target.relative_to(root).parts[0] in protected or target.is_file():
    raise SystemExit('Build output must be a dedicated directory within this workspace')
PY
  if [ "$MODE" = "--check-current" ]; then
    "$PY" tools/generate.py --src src --check
    "$PY" tools/icons.py check --src src
    "$PY" tools/long_lines.py --check
    "$PY" tools/module_charter.py --check
    "$PY" tools/route_registry.py --check
    "$PY" tools/api_routes.py --check
    "$PY" tools/scope_single_engine.py --check
    "$PY" tools/scripts_check.py
    "$PY" tools/hover_check.py
    "$PY" tools/assets_check.py
    node tools/dup_nested.mjs --check
    "$PY" tools/reports_check.py
    "$PY" tools/ux_states.py --check
    "$PY" tools/trace.py --check
    "$PY" tools/tokens_refs.py --check
    "$PY" tools/validate_schemas.py
    "$PY" tools/build.py --src src --mode split --pages lazy --minify-worker --out "$OUT" --verify
    "$PY" tests/source/k265eq.py "$OUT"
    "$PY" tools/sec/secrets_scan.py "$OUT"
    exit 0
  fi
  "$PY" tools/generate.py --src src --check
  "$PY" tools/icons.py check --src src
  node tools/kivo_ns.mjs tools/kivo_ns.json --check
  "$PY" tools/plugins.py check
  "$PY" tools/tokens.py check src
  "$PY" tools/deps_check.py
  "$PY" tools/build.py --src src --mode split --pages lazy --minify-worker --out "$OUT"
  "$PY" tools/build.py --src src --mode monolith --out "$OUT.mono/index.html"
  "$PY" tools/perf_budget.py "$OUT"
  "$PY" tools/build.py --src src --mode split --pages lazy --minify-worker --out "$OUT" --verify
  "$PY" tools/prod_strip.py "$OUT"
  "$PY" - "$OUT" <<'PY'
import hashlib,json,pathlib,sys
root=pathlib.Path.cwd(); out=root/sys.argv[1]
with pathlib.Path(str(out)+'.build.json').open(encoding='utf-8') as source: info=json.load(source)
mono=pathlib.Path(str(out)+'.mono/build.json')
mono.write_text(json.dumps({'phase':'RISHAD_266','pages':info['pages'],'retainPaths':info['retained']},sort_keys=True)+'\n',encoding='utf-8')
paths=sorted((p for p in out.rglob('*') if p.is_file()),key=lambda p:p.relative_to(root).as_posix())
lines=[hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(root).as_posix() for p in paths]
pathlib.Path(str(out)+'.MANIFEST.sha256').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Current build complete:',len(lines),'files; no retained releases; Worker tokens proved')
PY
  exit 0
fi
[ -z "$MODE" ] || [ "$MODE" = "--legacy" ] || { echo "Unknown build mode" >&2; exit 2; }
SCRIPT="build:$N"; [ "$MODE" != "--legacy" ] || SCRIPT="build:$N:legacy"
TMP=$(mktemp -d /tmp/kivo_chain_XXXX); trap 'rm -rf "$TMP"' EXIT
srcof(){  # يطبع مسارَ src للإصدار المطلوب (أو فارغاً)
  if [ -d "k$1/src" ]; then echo "k$1/src"
  elif [ -f src/layout.json ] && grep -q "\"[0-9.]*-$1\"" src/core/270-bs-ver.js; then echo src
  elif git rev-parse -q --verify "KIVO_$1" >/dev/null 2>&1; then mkdir -p "$TMP/k$1"; git archive "KIVO_$1" src public workers migrations config | tar -x -C "$TMP/k$1"; echo "$TMP/k$1/src"
  else echo ""; fi; }
# KIVO_259: الإصداراتُ المُبقاة كما يعلنها سكربتُ build:N نفسُه (--retain pkNNN) — نافذةُ الإصدارين = آخرُ إصدارين منشورَين على Preview لا الرقمان السابقان
# بالضرورة (256–258 مراحلُ داخلية لم تُنشر؛ 259 يُبقي 255 و254). بلا --retain في السكربت: الرقمان السابقان كما كان.
PREV=$(node -e 'const s=(require("./package.json").scripts||{})[process.argv[1]]||""; console.log([...s.matchAll(/--retain pk(\d+)/g)].map(m=>+m[1]).sort((a,b)=>a-b).join(" "))' "$SCRIPT")
[ -n "$PREV" ] || PREV="$B $A"
LAST=""
for X in $PREV; do
  if [ ! -f "pk$X/_worker.js" ]; then
    S=$(srcof "$X"); [ -n "$S" ] || { echo "✘ لا مصدرَ للإصدار $X (لا k$X/src ولا وسم KIVO_$X)" >&2; exit 2; }
    R=(); [ -n "$LAST" ] && [ -f "pk$LAST/_worker.js" ] && R=(--retain "pk$LAST")
    python3 tools/build.py --src "$S" --mode split --pages lazy --out "pk$X" "${R[@]}" | tail -1
    echo "   pk$X من $([ "${S#$TMP}" != "$S" ] && echo "الوسم KIVO_$X" || echo "$S")"
  fi
  LAST=$X
done
npm run -s "$SCRIPT"
# KIVO_256 (عُدّة): بيانُ النسخة الكاملة pkN.mono/build.json (الطورُ · وضعُ الصفحات · نافذةُ الإصدارين) من pkN.build.json نفسِه —
# كان يُكتب يدوياً بعد البناء (rebuild242.sh سطر 30 · و255)، ويقرؤه k25Neq (اليتيمُ = أصولُ الإصدارين المُبقاة) وk25Ncache (إعادةُ البناء بالنافذة نفسِها)
if [ -d "pk$N.mono" ] && [ -f "pk$N.build.json" ]; then
  python3 -c 'import json,sys; b=json.load(open(sys.argv[1], encoding="utf-8")); print(json.dumps({"phase": "KIVO_" + sys.argv[2], "pages": b.get("pages", "bundled"), "retainPaths": b.get("retained", [])}, ensure_ascii=False))' "pk$N.build.json" "$N" > "pk$N.mono/build.json"
fi
find "pk$N" -type f | LC_ALL=C sort | xargs sha256sum > "pk$N.MANIFEST.sha256"
echo "✔ pk$N: $(wc -l < "pk$N.MANIFEST.sha256") ملفاً · MANIFEST $(sha256sum "pk$N.MANIFEST.sha256" | cut -c1-16)"
