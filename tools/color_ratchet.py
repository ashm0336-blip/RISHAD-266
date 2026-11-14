#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · RM-3 (SOT-066 · معيارُ الخروج «لا ألوانَ صلبة جديدة») — سقّاطةُ الألوان الخام: عدُّ الألوان الحرفية (hex · rgb/rgba · hsl) في CSS/JS/HTML
   خارج ملفات الرموز (070/080 — البدائياتُ هناك وحدها) وخريطةِ وقت التشغيل (110 · __BS_TOK) لا يزيد على الخط الأساسي tests/baselines/colors.baseline.json.
   python3 tools/color_ratchet.py <src> [--update]"""
import os, sys, re, json, glob, collections
src = sys.argv[1]; base_p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tests', 'baselines', 'colors.baseline.json')
RE = re.compile(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])|\brgba?\(\s*\d|\bhsla?\(')
SKIP = ('070-theme-tokens.css', '080-theme-dark.css', '010-react.js', '020-react-dom.js', '340-registry-v24-9.js', '255-page-manifest.js')
# KIVO_251 · ADR-012: التخطيطُ المستهدف (src/layout.json) أو الانتقالي (k2NN/src) — الملفاتُ نفسُها بحسب الدور لا المسار
# مفتاحُ الملف مستقلٌّ عن التخطيط (ADR-012): modules/<slug>/<file> أو اسمُ الملف وحده (الأسماءُ المرقَّمة فريدة)
def keyof(rel): return rel if '/modules/' in '/' + rel or (rel.startswith('systems/') and not os.path.basename(rel)[:1].isdigit()) else os.path.basename(rel)   # V7 · الحزمة ب: وحدةُ نظامٍ منقولة بمسارها · ملفٌّ مرقَّم باسمه كما كان
if os.path.exists(os.path.join(src, 'layout.json')):
    files = sorted(glob.glob(src + '/styles/*.css') + [f for d in ('core', 'layouts', 'components', 'services', 'i18n', 'api', 'auth', 'permissions', 'manifests') for f in glob.glob(src + '/' + d + '/*.js')] + glob.glob(src + '/modules/*/*.css') + glob.glob(src + '/modules/*/logic.js') + glob.glob(src + '/modules/*/logic-*.js') + glob.glob(src + '/modules/*/view.html') + [f for x in ('*.css', 'logic.js', 'logic-*.js', 'view.html', '[0-9]*.js') for f in glob.glob(src + '/systems/*/client/' + x)] + [src + '/layouts/index.template.html', src + '/layouts/root-logic.js'])
else:
    files = sorted(glob.glob(src + '/client/css/*.css') + glob.glob(src + '/client/js/*.js') + glob.glob(src + '/modules/*/*.css') + glob.glob(src + '/modules/*/logic.js') + glob.glob(src + '/modules/*/logic-*.js') + glob.glob(src + '/modules/*/view.html') + [src + '/shell/index.template.html', src + '/shell/xdc/root-logic.js'])
cnt = collections.OrderedDict()
for f in files:
    if any(f.endswith(s) for s in SKIP): continue
    t = open(f, encoding='utf-8').read()
    if f.endswith('110-theme-prepaint.js'): t = re.sub(r'(?:window|KIVO)\.__BS_TOK = \{.*?\};\n', '', t, count=1, flags=re.S)   # خريطةُ التحويل مولَّدة من الرموز لا كودٌ يدوي (منذ KIVO_258 · AUD-016: KIVO.__BS_TOK)
    n = len(RE.findall(t)); 
    if n: cnt[keyof(os.path.relpath(f, src))] = n
cur = {'total': sum(cnt.values()), 'byFile': cnt}
if '--update' in sys.argv: json.dump(cur, open(base_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('baseline updated:', cur['total']); sys.exit(0)
base = json.load(open(base_p, encoding='utf-8')) if os.path.exists(base_p) else {'total': 0, 'byFile': {}}
worse = {f: (base['byFile'].get(f, 0), n) for f, n in cnt.items() if n > base['byFile'].get(f, 0)}
better = {f: (base['byFile'][f], cnt.get(f, 0)) for f in base['byFile'] if cnt.get(f, 0) < base['byFile'][f]}
print('ألوانٌ خام خارج الرموز: ' + str(cur['total']) + ' (الخط الأساسي ' + str(base['total']) + ') في ' + str(len(cnt)) + ' ملفاً')
if better: print('   ↓ تحسّن: ' + json.dumps(better, ensure_ascii=False)[:400] + ' — حدّث الخط الأساسي بـ--update')
if worse: print('✘ زيادة: ' + json.dumps(worse, ensure_ascii=False)); sys.exit(1)
print('✔ لا ألوانَ خام جديدة')
