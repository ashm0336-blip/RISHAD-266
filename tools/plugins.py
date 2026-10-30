#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_259 · AUD-030 · SOT-089 · SOT-069 — العدساتُ إضافاتٌ بـmanifest (ADR-018): الأداةُ الواحدة للتحميل والتنسيق والفحص.
     python3 tools/plugins.py check [--src src]   الفحص (exit 1 عند أيّ مخالفة) — يُستدعى من generate.py --check ومن البوابة
     python3 tools/plugins.py fmt   [--src src]   يعيد تنسيقَ الملفات بالصيغة القانونية (المصفوفاتُ البسيطة سطراً واحداً)
   مصدرُ الحقيقة: src/plugins/lenses/<key>/manifest.json (المخطّط src/schemas/lens-plugin.schema.json).
   يُشتقّ منها بالتوليد: LENS_REG في الواجهة (KIVO_MANIFEST.lenses) · جزءُ الخادم KIVO_LENS_PLUGINS (workers/parts/006a-lens-plugins.js).
   القواعد:
     ① المخطّط · اسمُ المجلد = key · owner = lens.<key> · order وname فريدان.
     ② المفاتيحُ = السجلّ: own = مفاتيحُ المالك النشطة · reserved = غيرُ النشطة · managedRefs = مفاتيحُ المراجع التي يُدار مالكُها في العدسة.
        hosts = أوراقُ asisMap لمفتاح <owner>.view · guards.enable = <owner>.enable نشطٌ قابلٌ للمنح.
     ③ الموارد: كلُّ مفتاحِ عمليةٍ (editKey · status.op · elementFields.op · floorFields.op) نشطٌ في السجلّ ومالكُه عدسةٌ معلنة؛ لا حقلَ معلناً مرتين؛
        أعمدةُ elementFields أعمدةُ عدساتٍ معلنة؛ seq الأعمدة فريد.
     ④ المرجعُ (العدساتُ المضمَّنة في وحدات v24.9 المرجعية registry10 — الحرّاس 006 · البناء 008): جداولُها = الـmanifest حرفاً
        (LENSES · LENS_COLS · GEOM · EDIT_KEY · FIELD_KEYS · DIST_ASSIGN/DIST_NEED · DENS · DERIVED_Z) — فلا تنحرف الإضافةُ عن الحارس المرجعي.
        العدسةُ الجديدة (خارج المرجع) تُحرس من طبقة الإنفاذ بالـmanifest وحده (enfPlugLensOf · أقنعةُ الإسقاط · إعادةُ تصنيف حقولها).
     ⑤ الاختبارات: كلُّ ملفٍّ مُعلَن موجود ويذكر العدسة (lens.<key> أو '<key>') أو هو فحصُ الإضافات العام."""
import os, sys, re, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def arg(name, dflt):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else dflt

def lay(S):
    p = os.path.join(S, 'layout.json')
    L = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
    L.setdefault('plugins', 'plugins'); L.setdefault('workersParts', '../workers/parts')
    return L

def load(S):
    """يعيد العدساتِ المعلنة مرتّبةً بـ(order, key) — أو [] إن غاب المجلد (التخطيطُ الانتقالي)."""
    d = os.path.join(S, lay(S)['plugins'], 'lenses')
    if not os.path.isdir(d): return []
    out = []
    for k in sorted(os.listdir(d)):
        p = os.path.join(d, k, 'manifest.json')
        if os.path.isfile(p):
            m = json.load(open(p, encoding='utf-8')); m['_dir'] = k; out.append(m)
    out.sort(key=lambda m: (m.get('order', 0), m.get('key', '')))
    return out

def fmt(obj, ind=0):
    """JSON قانوني: كائناتٌ بإزاحةٍ واحدة لكل مستوى · المصفوفاتُ التي عناصرُها قيمٌ بسيطة على سطرٍ واحد."""
    sp = ' ' * ind
    if isinstance(obj, dict):
        if not obj: return '{}'
        return '{\n' + ',\n'.join(sp + ' ' + json.dumps(k, ensure_ascii=False) + ': ' + fmt(v, ind + 1) for k, v in obj.items()) + '\n' + sp + '}'
    if isinstance(obj, list):
        if all(not isinstance(x, (dict, list)) for x in obj): return json.dumps(obj, ensure_ascii=False)
        return '[\n' + ',\n'.join(sp + ' ' + fmt(v, ind + 1) for v in obj) + '\n' + sp + ']'
    return json.dumps(obj, ensure_ascii=False)

def table(S):
    """جدولُ الخادم المولَّد (KIVO_LENS_PLUGINS) — البنيةُ التي تستهلكها طبقةُ الإنفاذ وحدها."""
    P = load(S)
    cols = sorted([m for m in P if m['resources'].get('column')], key=lambda m: m['resources']['column']['seq'])
    t = {'keys': [m['key'] for m in P],
         'cols': [m['resources']['column']['name'] for m in cols],
         'elem': [{'lens': m['key'], 'cols': f['cols'], 'fields': f['fields'], 'op': f['op']} for m in P for f in m['resources'].get('elementFields', [])],
         'floor': [{'lens': m['key'], 'field': f['field'], 'op': f['op']} for m in P for f in m['resources'].get('floorFields', [])],
         'edit': {m['resources']['column']['name']: m['resources']['column']['editKey'] for m in cols}}
    return t

def registry(S):
    spec = json.load(open(os.path.join(S, 'permissions', 'registry', 'targets.json'), encoding='utf-8'))
    return json.load(open(os.path.join(S, 'permissions', 'registry', spec['source']), encoding='utf-8'))

def jslit(src, name):
    """قيمةُ تعريف var NAME = {…}|[…]; من نصّ JS (أدبياتُ الجداول المرجعية) — كـJSON بعد تطبيع الاقتباس."""
    m = re.search(r'var ' + re.escape(name) + r' = ([\[{][^\n;]*[\]}]);', src)
    if not m: return None
    t = m.group(1).replace("'", '"')
    t = re.sub(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', t)
    return json.loads(t)

def check(S):
    errs, info, lab = [], [], set()
    E = lambda m: errs.append(m)
    try:
        import jsonschema
        sch = json.load(open(os.path.join(S, 'schemas', 'lens-plugin.schema.json'), encoding='utf-8'))
        V = jsonschema.Draft202012Validator(sch)
    except Exception as e:
        V = None; E('المخطّط: ' + str(e)[:120])
    P = load(S)
    if not P: E('لا عدسةَ معلنة في ' + lay(S)['plugins'] + '/lenses'); return errs, info
    R = registry(S); byKey = {e['key']: e for e in R['registry']}; owners = {o['id']: o for o in R['owners']}
    seen = {'order': {}, 'name': {}, 'seq': {}, 'field': {}}
    keysAll = {m.get('key') for m in P}
    colNames = {m['resources']['column']['name'] for m in P if m.get('resources', {}).get('column')}
    for m in P:
        k = m.get('key', '?'); tag = 'العدسة «' + k + '»: '
        if V:
            for e in sorted(V.iter_errors({x: y for x, y in m.items() if x != '_dir'}), key=lambda e: list(e.path))[:4]: E(tag + '/'.join(map(str, e.path)) + ': ' + e.message[:120])
        if m['_dir'] != k: E(tag + 'اسمُ المجلد «' + m['_dir'] + '» ≠ key')
        if m.get('owner') != 'lens.' + k: E(tag + 'owner ≠ lens.' + k)
        for f in ('order', 'name'):
            if m.get(f) in seen[f]: E(tag + f + ' مكرّر مع «' + seen[f][m.get(f)] + '»')
            seen[f][m.get(f)] = k
        oid = 'lens.' + k; own = [e for e in R['registry'] if e['owner'] == oid]
        if oid not in owners or owners[oid].get('kind') != 'lens': E(tag + 'لا مالكَ «' + oid + '» من نوع lens في السجلّ')
        act = [e['key'] for e in own if e['status'] == 'active']; res = sorted(e['key'] for e in own if e['status'] != 'active')
        mref = sorted(e['key'] for e in R['registry'] if owners.get(e['owner'], {}).get('managedIn') == oid and e['status'] == 'active')
        K = m.get('keys', {})
        if sorted(K.get('own', [])) != sorted(act): E(tag + 'keys.own ≠ مفاتيحِ المالك النشطة في السجلّ ' + json.dumps({'manifestOnly': sorted(set(K.get('own', [])) - set(act)), 'registryOnly': sorted(set(act) - set(K.get('own', [])))}))
        if sorted(K.get('reserved', [])) != res: E(tag + 'keys.reserved ≠ المحجوز في السجلّ')
        if sorted(K.get('managedRefs', [])) != mref: E(tag + 'keys.managedRefs ≠ المراجعِ المُدارة في السجلّ')
        view = byKey.get(oid + '.view')
        hosts = []
        for x in (view or {}).get('asisMap', []):
            h = str(x).split(':')[0]
            if h not in hosts: hosts.append(h)
        if not view or sorted(hosts) != sorted(m.get('hosts', [])): E(tag + 'hosts ≠ أوراقِ ' + oid + '.view في السجلّ ' + json.dumps(hosts))
        en = byKey.get(m.get('guards', {}).get('enable', ''))
        if m.get('guards', {}).get('enable') != oid + '.enable' or not en or en['status'] != 'active' or en.get('grant') != 'assignable': E(tag + 'guards.enable يجب أن يكون ' + oid + '.enable نشطاً قابلاً للمنح')
        rs = m.get('resources', {}); ops = []
        c = rs.get('column')
        if c:
            if c['name'] in seen['seq'].values() and seen['seq'].get(c['seq']) != c['name']: pass
            if c['seq'] in seen['seq']: E(tag + 'seq العمود مكرّر مع «' + seen['seq'][c['seq']] + '»')
            seen['seq'][c['seq']] = c['name']
            ops += [c['editKey'], c['status']['op']]
            for f in list(c['geometry']) + list(c.get('derived', [])) + list(c['status']['fields']):
                q = c['name'] + '.' + f
                if q in seen['field']: E(tag + 'الحقلُ ' + q + ' معلنٌ أيضاً في «' + seen['field'][q] + '»')
                seen['field'][q] = k
        for f in rs.get('elementFields', []):
            ops.append(f['op'])
            for col in f['cols']:
                if col not in colNames: E(tag + 'elementFields: العمود «' + col + '» ليس عمودَ عدسةٍ معلنة')
                for x in f['fields']:
                    q = col + '.' + x
                    if q in seen['field']: E(tag + 'الحقلُ ' + q + ' معلنٌ أيضاً في «' + seen['field'][q] + '»')
                    seen['field'][q] = k
        for f in rs.get('floorFields', []):
            ops.append(f['op']); q = '<floor>.' + f['field']
            if q in seen['field']: E(tag + 'حقلُ الطابق «' + f['field'] + '» معلنٌ أيضاً في «' + seen['field'][q] + '»')
            seen['field'][q] = k
        for op in ops:
            e = byKey.get(op)
            if not e or e['status'] != 'active': E(tag + 'مفتاحُ العملية «' + op + '» غيرُ نشطٍ في السجلّ'); continue
            if not (e['owner'].startswith('lens.') and e['owner'][5:] in keysAll): E(tag + 'مفتاحُ العملية «' + op + '» مالكُه «' + e['owner'] + '» ليس عدسةً معلنة')
        if not any(str(x).startswith('tests/') for x in m.get('tests', [])): E(tag + 'لا اختبارَ في المستودع الرسمي (tests/) — حزمُ المختبر وحدها لا تكفي')
        for t in m.get('tests', []):
            p = os.path.join(ROOT, t)
            if t.startswith('cfbench/') and not os.path.isdir(os.path.join(ROOT, 'cfbench')):   # AUD-029: حزمُ التكامل في المختبر الانتقالي — غائبةٌ في المستودع الرسمي وحده
                lab.add(t); continue
            if not os.path.isfile(p): E(tag + 'ملفُّ الاختبار غيرُ موجود: ' + t); continue
            body = open(p, encoding='utf-8', errors='ignore').read()
            if not (os.path.basename(t) == 'plugins.test.mjs' or ('lens.' + k) in body or ("'" + k + "'") in body or ('"' + k + '"') in body): E(tag + 'ملفُّ الاختبار لا يذكر العدسة: ' + t)
    # ④ المرجع: جداولُ الحارس المرجعي (006) والبناء (008) = الـmanifest للعدسات المضمَّنة فيهما
    PD = os.path.normpath(os.path.join(S, lay(S)['workersParts']))
    g = open(os.path.join(PD, '006-guard-bindings-2.js'), encoding='utf-8').read() if os.path.exists(os.path.join(PD, '006-guard-bindings-2.js')) else ''
    b = open(os.path.join(PD, '008-kivo-build-2.js'), encoding='utf-8').read() if os.path.exists(os.path.join(PD, '008-kivo-build-2.js')) else ''
    if g and b:
        LENSES = jslit(b, 'LENSES') or []
        ref = [m for m in P if m['key'] in LENSES]
        if [m['key'] for m in ref] != LENSES: E('المرجع: KIVO_BUILD.LENSES ' + json.dumps(LENSES) + ' ≠ ترتيبِ العدسات المعلنة ' + json.dumps([m['key'] for m in ref]))
        newL = [m['key'] for m in P if m['key'] not in LENSES]
        if newL: info.append('عدساتٌ جديدة خارج المرجع (تحرسها طبقةُ الإنفاذ بالـmanifest): ' + ', '.join(newL))
        GEOM = jslit(g, 'GEOM') or {}; LC = jslit(g, 'LENS_COLS') or {}; EK = jslit(g, 'EDIT_KEY') or {}; FK = jslit(g, 'FIELD_KEYS') or {}
        DA = re.search(r'var DIST_ASSIGN = (\{[^}]*\}), DIST_NEED = (\{[^}]*\}), DENS = (\{[^}]*\}), DERIVED_Z = (\{[^}]*\});', g)
        lit = lambda s: list(json.loads(re.sub(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', s)).keys())
        refCols = [m for m in ref if m['resources'].get('column')]
        if sorted(m['resources']['column']['name'] for m in refCols) != sorted(LC): E('المرجع: LENS_COLS ' + json.dumps(sorted(LC)) + ' ≠ أعمدةِ العدسات المعلنة')
        for m in refCols:
            c = m['resources']['column']; n = c['name']
            if list(GEOM.get(n, {})) != c['geometry']: E('المرجع: GEOM.' + n + ' ' + json.dumps(list(GEOM.get(n, {}))) + ' ≠ geometry ' + json.dumps(c['geometry']))
            if EK.get(n) != c['editKey']: E('المرجع: EDIT_KEY.' + n + ' ≠ editKey')
            want = {'fields': ['active'], 'op': 'lens.paths.status.change'} if n == 'paths' else {'fields': list(FK), 'op': 'lens.' + n + '.status.change'}
            if c['status'] != want: E('المرجع: حقولُ الحالة لـ' + n + ' ≠ FIELD_KEYS/active في الحارس')
        if DA:
            dist = [m for m in ref if m['key'] == 'dist']; dens = [m for m in ref if m['key'] == 'dens']
            ef = lambda m: [(tuple(f['cols']), tuple(f['fields']), f['op']) for f in m['resources'].get('elementFields', [])]
            nonPaths = tuple(x for x in sorted(LC, key=lambda q: [mm['resources']['column']['seq'] for mm in refCols if mm['resources']['column']['name'] == q][0]) if x != 'paths')
            if dist and ef(dist[0]) != [(nonPaths, tuple(lit(DA.group(1))), 'lens.dist.assign.edit'), (nonPaths, tuple(lit(DA.group(2))), 'lens.dist.need.edit')]: E('المرجع: حقولُ التوزيع ≠ DIST_ASSIGN/DIST_NEED (كلُّ عمودٍ عدا paths)')
            if dens and ef(dens[0]) != [(('zones',), tuple(lit(DA.group(3))), 'lens.dens.reading.record')]: E('المرجع: حقولُ الكثافة ≠ DENS على zones')
            if dens and dens[0]['resources'].get('floorFields') != [{'field': 'dens', 'op': 'lens.dens.threshold.configure'}]: E('المرجع: حقلُ الطابق dens ≠ الحارس')
            z = [m for m in refCols if m['key'] == 'zones']
            if z and z[0]['resources']['column'].get('derived', []) != lit(DA.group(4)): E('المرجع: DERIVED_Z ≠ derived')
    else:
        info.append('لا وحداتَ مرجعيةَ في ' + PD + ' — يُتخطّى الفحص ④')
    if lab: info.append('حزمُ تكاملٍ في المختبر الانتقالي (cfbench/ غائبٌ هنا — المستودعُ الرسمي وحده): ' + ', '.join(sorted(lab)))
    return errs, info

def main():
    S = os.path.abspath(arg('--src', os.path.join(ROOT, 'src')))
    cmd = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'check'
    if cmd == 'fmt':
        for m in load(S):
            d = m.pop('_dir'); p = os.path.join(S, lay(S)['plugins'], 'lenses', d, 'manifest.json')
            open(p, 'w', encoding='utf-8').write(fmt(m) + '\n'); print('  → ' + os.path.relpath(p, S))
        return 0
    errs, info = check(S)
    P = load(S)
    bad = []
    for m in P:
        d = m.pop('_dir'); p = os.path.join(S, lay(S)['plugins'], 'lenses', d, 'manifest.json')
        if open(p, encoding='utf-8').read() != fmt(m) + '\n': bad.append(d)
    if bad: errs.append('الصيغةُ القانونية (tools/plugins.py fmt): ' + ', '.join(bad))
    for e in errs: print('  ✘ ' + e)
    for i in info: print('  · ' + i)
    print(('✔' if not errs else '✘') + ' الإضافات: ' + str(len(P)) + ' عدسة (' + ' · '.join(m['key'] for m in P) + ')' + (' — كلُّها مطابقةٌ للمخطّط والسجلّ والحارس المرجعي واختباراتها' if not errs else ' — ' + str(len(errs)) + ' مخالفة'))
    return 1 if errs else 0

if __name__ == '__main__':
    sys.exit(main())
