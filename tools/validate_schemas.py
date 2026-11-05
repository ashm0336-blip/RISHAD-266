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
# CORE-01 · عقدُ تعريف النظام (module · activation · requires في pages.json — للبناء وحده، لا يُصدَّر): يُطابَق مع ما هو قائمٌ في الشيفرة
def _core01(S, M):
    err = []; R = lambda *a: open(os.path.join(S, *a), encoding='utf-8').read()
    MODS = {m['slug']: m['name'] for m in json.load(open(os.path.join(S, 'modules', 'modules.json'), encoding='utf-8'))['pages']}
    PG = {p['key']: p for p in M['pages']}
    LENS = {d for d in os.listdir(os.path.join(S, 'plugins', 'lenses')) if os.path.isfile(os.path.join(S, 'plugins', 'lenses', d, 'manifest.json'))} if os.path.isdir(os.path.join(S, 'plugins', 'lenses')) else {l['key'] for l in M.get('lenses', [])}
    FF = set(json.load(open(os.path.join(S, 'permissions', 'registry', 'registry-v24.9.json'), encoding='utf-8')).get('featureFlags', {}))
    # ① module: وحدةٌ في modules.json · وكلُّ slug لصفحةٍ واحدة على الأكثر
    seen = {}
    for p in M['pages']:
        m = p.get('module')
        if m is None: continue
        if m not in MODS: err.append(p['key'] + '.module «' + m + '» ليست في modules/modules.json')
        if m in seen: err.append('module «' + m + '» لصفحتين: ' + seen[m] + ' · ' + p['key'])
        seen[m] = p['key']
    # ② activation: لكلّ صفحة · toggle ⇒ ff.module.<key>.enabled في السجل · always = المستثناةُ من mods.off في الشيفرة (331 · admin/logic)
    for p in M['pages']:
        a = p.get('activation')
        if a is None: err.append(p['key'] + ': activation مفقود')
        elif a == 'toggle' and 'ff.module.' + p['key'] + '.enabled' not in FF: err.append(p['key'] + ': toggle بلا ff.module.' + p['key'] + '.enabled في registry-v24.9.json')
    always = {p['key'] for p in M['pages'] if p.get('activation') == 'always'}
    ex331 = set(re.findall(r"off\[i\] !== '([a-z]\w*)'", R('permissions', '331-perm-model.js')))
    exAdm = set(re.findall(r'\(\(pl && pl\.mods && pl\.mods\.off\) \|\| \[\]\)\.filter\(\(k\) => "([a-z]\w*)" !== k\)', R('modules', 'admin', 'logic.js')))
    if not (always == ex331 == exAdm): err.append('activation:always ' + str(sorted(always)) + ' ≠ استثناءُ mods.off في 331 ' + str(sorted(ex331)) + ' / admin/logic ' + str(sorted(exAdm)))
    # ③ requires: for ورقةٌ offPage حقيقية في صفحتها · on صفحةٌ أو عدسة (lens:<key>) · kind يطابق شكل on
    def leaf(ref):
        pk, sk = ref.split('/'); pg = PG.get(pk)
        return next((x for x in (pg.get('subs') or []) + (pg.get('tabs') or []) if x['key'] == sk), None) if pg else None
    reqs = []
    for p in M['pages']:
        for r in p.get('requires', []):
            f, on = r['for'], r['on']; k = r.get('kind') or ('lens' if on.startswith('lens:') else 'perm'); reqs.append((f, on, k))
            lf = leaf(f)
            if f.split('/')[0] != p['key']: err.append(p['key'] + '.requires: for «' + f + '» ليست من أوراق الصفحة')
            elif not lf or not lf.get('offPage'): err.append(p['key'] + '.requires: for «' + f + '» ليست ورقةً offPage')
            if on.startswith('lens:'):
                if on[5:] not in LENS: err.append(f + ': on «' + on + '» ليست عدسة')
                if k != 'lens': err.append(f + ': on «' + on + '» عدسةٌ و kind=' + k)
            else:
                if on not in PG: err.append(f + ': on «' + on + '» ليست صفحة')
                if k == 'lens': err.append(f + ': kind=lens و on «' + on + '» ليست lens:')
    # ④ containers.kpis.refs كلُّها offPage
    for c in M['containers']:
        for ref in c.get('refs', []):
            lf = leaf(ref)
            if not lf or not lf.get('offPage'): err.append(c['key'] + '.refs: «' + ref + '» ليست ورقةً offPage')
    # ⑤ اعتمادياتُ perm/lens = قواعدُ kpiPanelOk الحرفية في 334 (شيفرةٌ وإعلانٌ لا يفترقان)
    body = re.search(r'function kpiPanelOk\(pk, sk\)\{([\s\S]*?)\n  \}', R('permissions', '334-perm-tree-tpl.js'))
    lit = set()
    for sk, expr in re.findall(r"if \(sk === '(\w+)'\) return ([^;]+);", body.group(1) if body else ''):
        lit |= {(sk, 'lens:' + x, 'lens') for x in re.findall(r"onCap\('(\w+)'\)", expr)}
        lit |= {(sk, x, 'perm') for x in re.findall(r"\bcan\('(\w+)', 'view'\)", expr)}
    dec = {(f.split('/')[1], on, k) for f, on, k in reqs if k != 'code'}
    if not lit: err.append('334 kpiPanelOk: لم تُقرأ قواعدُه')
    elif dec != lit: err.append('requires(perm/lens) ≠ 334 kpiPanelOk: زائدٌ ' + str(sorted(dec - lit)) + ' · ناقصٌ ' + str(sorted(lit - dec)))
    # ⑥ اعتمادياتُ code: صفحةُ for تستورد لوحتَها من وحدة on (<dc-import name="<وحدة on>" solo="<الورقة>">)
    for f, on, k in reqs:
        if k != 'code': continue
        pk, sk = f.split('/'); vm = PG[pk].get('module'); om = PG.get(on, {}).get('module')
        v = os.path.join(S, 'modules', vm or '', 'view.html')
        if not vm or not om or not os.path.isfile(v) or ('<dc-import name="' + MODS.get(om, '') + '" solo="' + sk + '"') not in R(v): err.append(f + ': kind=code لكن ' + str(vm) + '/view.html لا يستورد ' + str(MODS.get(om)) + ' solo="' + sk + '"')
    return err, len(seen), len(always), len(reqs)
_e, _nm, _na, _nr = _core01(S, M)
if _e: print('✘ pages.json عقدُ النظام (CORE-01): ' + ' · '.join(_e)); bad += 1
else: print('✔ pages.json عقدُ النظام (CORE-01): ' + str(_nm) + ' وحدة · ' + str(_na) + ' always · ' + str(_nr) + ' اعتمادية = modules.json · ff.module · 331/admin · 334 kpiPanelOk · dc-import')
sys.exit(1 if bad else 0)
