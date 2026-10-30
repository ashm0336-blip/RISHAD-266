#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_251 · ADR-012 — نقلُ مصدر مرشّحٍ انتقالي (k2NN/src) إلى الشجرة المستهدفة في جذر المستودع بحسب tools/restructure_map.json،
   مع تعديل المراجع الداخلية إلى المسارات الجديدة (blocks.json ids · قالبُ الغلاف · targets.json · parts.json) وكتابة src/layout.json.
   python3 tools/restructure.py k250/src [--dry]
   لا يمسّ المصدرَ الأصلي؛ الناتجُ في الجذر (src/ public/ workers/ migrations/ config/)."""
import os, sys, json, shutil, re
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(H, sys.argv[1]); DRY = '--dry' in sys.argv
M = json.load(open(os.path.join(H, 'tools/restructure_map.json'), encoding='utf-8'))
mapped = {}
for srcdir, targets in M['dirs'].items():
    d = S if srcdir == '.' else os.path.join(S, srcdir)
    for tgt, lst in targets.items():
        if lst == '*':
            for base, _, fs in os.walk(d):
                for f in fs: rel = os.path.relpath(os.path.join(base, f), S); mapped[rel] = os.path.join(tgt, os.path.relpath(os.path.join(base, f), d))
        else:
            for f in lst: mapped[os.path.relpath(os.path.join(d, f), S)] = os.path.join(tgt, f)
def new_id(old):   # معرّفُ كتلة (نسبيٌّ إلى src/) من مسارٍ قديم نسبيٍّ إلى k2NN/src
    t = mapped[old]; assert t.startswith('src/'), old; return t[4:]
# ── النصوصُ التي تحمل مسارات ──
blocks = json.loads(open(os.path.join(S, 'blocks.json'), encoding='utf-8').read())
for b in blocks['blocks']: b['id'] = new_id(b['id'])
blocks['gateBlock'] = new_id(blocks['gateBlock'])
tpl = open(os.path.join(S, 'shell/index.template.html'), encoding='utf-8').read()
tpl2 = re.sub(r'@@KIVO_(BLOCK|INLINE):([^@]+)@@', lambda m: '@@KIVO_' + m.group(1) + ':' + new_id(m.group(2)) + '@@', tpl)
targets = json.load(open(os.path.join(S, 'registry/targets.json'), encoding='utf-8'))
for t in targets['targets']:
    t['file'] = ('../workers/parts/' + t['file'].split('/')[-1]) if t['file'].startswith('workers/parts/') else new_id(t['file'])
parts = json.load(open(os.path.join(S, 'workers/parts.json'), encoding='utf-8')); parts['worker'] = '_worker.js'
layout = dict(M['layout']); layout.pop('note', None)
print('mapped files:', len(mapped), '· blocks:', len(blocks['blocks']), '· template refs:', len(re.findall('@@KIVO_(?:BLOCK|INLINE):', tpl2)))
if DRY:
    for k, v in sorted(mapped.items())[:12]: print('  ', k, '→', v)
    sys.exit(0)
for old, new in mapped.items():
    dst = os.path.join(H, new); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if old == 'blocks.json': open(dst, 'w', encoding='utf-8').write(json.dumps(blocks, ensure_ascii=False, indent=1) + '\n'); continue
    if old == 'shell/index.template.html': open(dst, 'w', encoding='utf-8', newline='').write(tpl2); continue
    if old == 'registry/targets.json': open(dst, 'w', encoding='utf-8').write(json.dumps(targets, ensure_ascii=False, indent=1) + '\n'); continue
    if old == 'workers/parts.json': open(dst, 'w', encoding='utf-8').write(json.dumps(parts, ensure_ascii=False, indent=1) + '\n'); continue
    shutil.copy2(os.path.join(S, old), dst)
open(os.path.join(H, 'src/layout.json'), 'w', encoding='utf-8').write(json.dumps(layout, ensure_ascii=False, indent=1) + '\n')
for d, txt in [('src/assets/icons', 'نظامُ الأيقونات (AUD-018 · SOT-084) — يُملأ من 388 شكلاً مضمَّناً في الصفحات.'), ('src/plugins', 'العدساتُ كإضافات (SOT-089) — manifest لكل عدسة؛ اليوم LENS_REG في manifests/pages.json.'), ('src/schemas', 'مخطّطاتُ التحقق (SOT-101) — FIELDS/RES_REG/ENT في الخادم اليوم؛ تُستخرج هنا.'), ('src/scope', 'محرّكُ النطاق KIVO_SCOPE (SOT-098) — داخل workers/parts/009–010 اليوم؛ يُستخرج هنا.')]:
    os.makedirs(os.path.join(H, d), exist_ok=True); open(os.path.join(H, d, 'README.md'), 'w', encoding='utf-8').write('# ' + d + '\n' + txt + '\n')
json.dump({'from': sys.argv[1], 'map': mapped}, open(os.path.join(H, 'tools/restructure_applied.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('✔ restructured into', H)
