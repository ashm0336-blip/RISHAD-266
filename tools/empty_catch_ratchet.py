#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · AUD-021 — سقّاطةُ «catch الفارغ»: الخادمُ (workers/parts) صفرٌ إلزامياً منذ KIVO_250؛ الواجهةُ (client/js · shell · modules/*/logic.js) لا تزيد على الخط الأساسي
   (tests/baselines/empty_catch.baseline.json) ويُخفَّض تدريجياً. python3 tools/empty_catch_ratchet.py <src> [--update]"""
import os, re, sys, json
import glob
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.abspath(sys.argv[1]); BASE = os.path.join(H, 'tests', 'baselines', 'empty_catch.baseline.json')
RE = re.compile(r'catch\s*(?:\(\s*\w*\s*\))?\s*\{\s*\}')
def count(sub, exts=('.js',)):
    n = 0; d = os.path.join(S, sub)
    if not os.path.isdir(d): return 0
    for base, _, files in os.walk(d):
        for f in files:
            if f.endswith(exts) and not f.endswith('.min.js'): n += len(RE.findall(open(os.path.join(base, f), encoding='utf-8', errors='ignore').read()))
    return n
NEW = os.path.exists(os.path.join(S, 'layout.json'))   # KIVO_251 · ADR-012
WP = '../workers/parts' if NEW else 'workers/parts'
CLIENT = (['core', 'layouts', 'components', 'services', 'i18n', 'api', 'auth', 'permissions', 'manifests'] if NEW else ['client/js', 'shell'])
cur = {'worker': count(WP), 'client': sum(count(d) for d in CLIENT) + sum(len(RE.findall(open(f, encoding='utf-8').read())) for f in sorted(glob.glob(os.path.join(S, 'modules', '*', 'logic.js')) + glob.glob(os.path.join(S, 'modules', '*', 'logic-*.js'))))}
if '--update' in sys.argv: json.dump(cur, open(BASE, 'w'), indent=1); print('baseline updated:', cur); sys.exit(0)
base = json.load(open(BASE)) if os.path.exists(BASE) else {'worker': 0, 'client': 10**9}
bad = []
if cur['worker'] != 0: bad.append('الخادم: %d catch فارغ (يجب صفر)' % cur['worker'])
if cur['client'] > base['client']: bad.append('الواجهة: %d > الخط الأساسي %d' % (cur['client'], base['client']))
print(('✔ catch الفارغ — الخادم 0 · الواجهة %d (الخط الأساسي %d)' % (cur['client'], base['client'])) if not bad else '✘ ' + ' · '.join(bad))
if cur['client'] < base['client']: print('   ↓ تحسّن — حدّث الخط الأساسي بـ--update')
sys.exit(1 if bad else 0)
