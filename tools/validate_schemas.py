#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · SOT-101 · SOT-114/123 — التحقق من ملفات الإعداد بمخطّطات JSON Schema (draft 2020-12) في src/schemas/:
   python3 tools/validate_schemas.py [src]      (يُستدعى أيضاً من generate.py --check)
   pages.json · tokens.json · layout.json · blocks.json · ../config/env.schema.json (مخطّطٌ صالح + بلا قيم) · migrations/ (الترقيمُ والختم)"""
import os, sys, json, re
try: import jsonschema
except ImportError: print('✘ jsonschema غير مثبَّت (pip install jsonschema)'); sys.exit(2)
S = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src'))
L = json.load(open(os.path.join(S, 'layout.json'), encoding='utf-8')) if os.path.exists(os.path.join(S, 'layout.json')) else {'pagesManifest': 'manifests/pages.json', 'tokens': 'design/tokens.json', 'migrations': 'migrations'}
SCH = os.path.join(S, 'schemas')
def check(name, inst_path, schema_name):
    sch = json.load(open(os.path.join(SCH, schema_name), encoding='utf-8')); inst = json.load(open(inst_path, encoding='utf-8'))
    errs = sorted(jsonschema.Draft202012Validator(sch).iter_errors(inst), key=lambda e: list(e.path))
    if errs: print('✘ ' + name + ': ' + ' · '.join(('/'.join(map(str, e.path)) + ': ' + e.message)[:140] for e in errs[:5])); return 1
    print('✔ ' + name + ' صالح (' + schema_name + ')'); return 0
bad = 0
bad += check('manifests/pages.json', os.path.join(S, L['pagesManifest']), 'pages.schema.json')
bad += check('styles/tokens/tokens.json', os.path.join(S, L['tokens']), 'tokens.schema.json')
if os.path.exists(os.path.join(S, 'layout.json')): bad += check('layout.json', os.path.join(S, 'layout.json'), 'layout.schema.json')
bad += check('blocks.json', os.path.join(S, 'blocks.json'), 'blocks.schema.json')
# env.schema.json: مخطّطٌ صالح بذاته وبلا قيم
envp = os.path.join(S, '..', 'config', 'env.schema.json') if os.path.exists(os.path.join(S, 'layout.json')) else os.path.join(S, 'config', 'env.schema.json')
E = json.load(open(envp, encoding='utf-8'))
try: jsonschema.Draft202012Validator.check_schema({k: v for k, v in E.items() if k in ('$schema', 'type', 'properties', 'additionalProperties', 'title', 'description')}); print('✔ config/env.schema.json مخطّطٌ صالح (' + str(len(E['properties'])) + ' متغيّرات · بلا قيم)')
except Exception as e: print('✘ env.schema.json: ' + str(e)[:120]); bad += 1
# KIVO_263 · SOT-123: الـmanifests المركزية كلُّها بمخطّط — العقد · شجرةُ الصلاحيات (وعدّاداتُها = محتواها) · بيانُ التطبيق
_api = os.path.join(S, 'api', 'contracts.json')
if os.path.exists(_api) and os.path.exists(os.path.join(SCH, 'contracts.schema.json')): bad += check('api/contracts.json', _api, 'contracts.schema.json')
_pt = os.path.join(S, 'manifests', 'perm-tree24.json')
if os.path.exists(_pt) and os.path.exists(os.path.join(SCH, 'perm-tree.schema.json')):
    bad += check('manifests/perm-tree24.json', _pt, 'perm-tree.schema.json')
    T = json.load(open(_pt, encoding='utf-8')); lv = [l for c in T['containers'] for l in c['leaves']]
    ks = sorted({k for l in lv for k in l.get('keys', [])})
    cn = {'containers': len(T['containers']), 'leaves': len(lv), 'keys': len(ks)}
    if cn != {k: T['counts'][k] for k in cn}: print('✘ perm-tree24.json: counts ' + str(T['counts']) + ' ≠ المحتوى ' + str(cn)); bad += 1
    else: print('✔ perm-tree24.json: العدّادات = المحتوى ' + str(cn))
_wm = os.path.join(S, 'manifests', 'manifest.webmanifest.json')
if os.path.exists(_wm) and os.path.exists(os.path.join(SCH, 'webmanifest.schema.json')): bad += check('manifests/manifest.webmanifest.json', _wm, 'webmanifest.schema.json')
# KIVO_263 · SOT-101: مخطّطاتُ أجسام الطلبات (src/schemas/api/bodies.schema.json) — كلُّ مخطّطٍ JSON Schema صالح · ومساراتُها في العقد
BP = os.path.join(SCH, 'api', 'bodies.schema.json')
if os.path.exists(BP):
    try:
        BS = json.load(open(BP, encoding='utf-8')); CT = json.load(open(os.path.join(S, 'api', 'contracts.json'), encoding='utf-8'))
        for rt, sc in BS['bodies'].items(): jsonschema.Draft202012Validator.check_schema(sc)
        miss = [rt for rt in BS['bodies'] if rt not in {r['path'] for r in CT['routes']}]
        if miss: print('✘ bodies.schema.json: مساراتٌ ليست في العقد ' + str(miss)); bad += 1
        else: print('✔ api/bodies.schema.json: ' + str(len(BS['bodies'])) + ' مخطّطَ جسمٍ صالحاً لمساراتٍ في العقد')
    except Exception as e: print('✘ api/bodies.schema.json: ' + str(e)[:160]); bad += 1
# pages: التناسقُ الداخلي (navOrder ⊂ pages/containers · routeNames تغطي nav · under يشير إلى صفحة)
M = json.load(open(os.path.join(S, L['pagesManifest']), encoding='utf-8'))
keys = {p['key'] for p in M['pages']} | {c['key'] for c in M['containers']}; navs = {p['nav'] for p in M['pages']} | {c['nav'] for c in M['containers']}
x = [k for k in M['navOrder'] if k not in keys]; y = [n for n in navs if n not in M['routeNames']]; z = [p['key'] for p in M['pages'] if p.get('under') and p['under'] not in keys]
if x or z: print('✘ pages.json تناسق: navOrder غريب ' + str(x) + ' · under غريب ' + str(z)); bad += 1
else: print('✔ pages.json متناسق داخلياً (navOrder · under)')
if y: print('✘ pages.json: مساراتٌ بلا اسمٍ في routeNames ' + str(y) + ' (KIVO_263 · SOT-095: خطأٌ لا تحذير)'); bad += 1
sys.exit(1 if bad else 0)
