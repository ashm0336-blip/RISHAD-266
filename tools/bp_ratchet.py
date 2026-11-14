#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · RM-3 (AUD-019 · SOT-153) — سقّاطةُ نقاط الكسر: كلُّ @media بعرضٍ (min/max-width) يستعمل قيمةً من مقياس tokens.json → breakpoints
   (420 · 640 · 900 · 1024 · 1280)؛ القيمُ الموروثة المسجَّلة في tests/baselines/bp.baseline.json مسموحةٌ بعددها الحالي ولا تزيد (تُوحَّد تدريجياً بمراجعةٍ بصرية).
   python3 tools/bp_ratchet.py <src> [--update]"""
import os, sys, re, json, glob, collections
src = sys.argv[1]; ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); base_p = os.path.join(ROOT, 'tests', 'baselines', 'bp.baseline.json')
tok = json.load(open(os.path.join(src, 'styles', 'tokens', 'tokens.json'), encoding='utf-8'))
SCALE = {int(v) for k, v in tok.get('breakpoints', {}).items() if k != 'note'}
RE = re.compile(r'@media[^{]*?\((?:min|max)-width:\s*([0-9.]+)px\)')
files = sorted(glob.glob(src + '/styles/*.css') + glob.glob(src + '/layouts/*.css') + glob.glob(src + '/modules/*/helmet.css') + glob.glob(src + '/modules/*/view.html') + glob.glob(src + '/modules/*/logic.js') + glob.glob(src + '/modules/*/logic-*.js') + [f for x in ('helmet.css', 'view.html', 'logic.js', 'logic-*.js') for f in glob.glob(src + '/systems/*/client/' + x)] + glob.glob(src + '/auth/*.js') + glob.glob(src + '/components/*.js') + glob.glob(src + '/core/*.js') + [src + '/layouts/index.template.html'])
cnt = collections.OrderedDict()
for f in files:
    if not os.path.exists(f): continue
    for m in RE.finditer(open(f, encoding='utf-8', errors='ignore').read()):
        v = int(float(m.group(1)))
        if v in SCALE: continue
        k = os.path.relpath(f, src).replace(os.sep, '/') + ' @' + str(v); cnt[k] = cnt.get(k, 0) + 1
cur = {'scale': sorted(SCALE), 'total': sum(cnt.values()), 'legacy': cnt}
if '--update' in sys.argv: json.dump(cur, open(base_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('baseline updated:', cur['total']); sys.exit(0)
base = json.load(open(base_p, encoding='utf-8')) if os.path.exists(base_p) else {'total': 0, 'legacy': {}}
worse = {k: (base['legacy'].get(k, 0), n) for k, n in cnt.items() if n > base['legacy'].get(k, 0)}
better = {k: (base['legacy'][k], cnt.get(k, 0)) for k in base['legacy'] if cnt.get(k, 0) < base['legacy'][k]}
vals = collections.Counter(int(k.rsplit('@', 1)[1]) for k in cnt for _ in range(cnt[k]))
print('نقاطُ كسرٍ خارج المقياس ' + str(sorted(SCALE)) + ': ' + str(cur['total']) + ' موضعاً (الخط الأساسي ' + str(base['total']) + ') · القيمُ الموروثة: ' + ', '.join(str(v) + '×' + str(n) for v, n in sorted(vals.items())))
if better: print('   ↓ تحسّن: ' + json.dumps(better, ensure_ascii=False)[:300] + ' — حدّث الخط الأساسي بـ--update')
if worse: print('✘ قيمٌ جديدة خارج المقياس: ' + json.dumps(worse, ensure_ascii=False)[:400]); sys.exit(1)
print('✔ لا نقطةَ كسرٍ جديدة خارج المقياس')
