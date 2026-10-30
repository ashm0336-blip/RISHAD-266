#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_256 · SOT-003/SOT-004/SOT-097 — شجرةُ الصلاحيات TO-BE v24.9 (القسم ٣ من الوثيقة المعتمدة) مُصدَّرةً بيانات:
   الحاويات · الأوراق (المالكون) بنوعها ومسارها · مفاتيحُها النشطة — مطابَقةً 1:1 مع السجلّ (KIVO_REGISTRY_DATA) ومع بنية المنصة الحقيقية (manifests/pages.json).
     python3 tools/perm_tree.py emit  [--src src] [--doc docs/reference/v24_9_FINAL.html]   → src/manifests/perm-tree24.json
     python3 tools/perm_tree.py check [--src src] [--doc …]                               → يعيد الاشتقاقَ ويقارن الملفَّ الملتزَم (0 = مطابق)
   القواعد (كلُّ مخالفةٍ تُسقط الأداة):
     · بصمةُ الوثيقة = docSha256 المسجّلة في السجلّ (المصدرُ نفسُه الذي وُلِّد منه السجل).
     · كلُّ مالكٍ في السجلّ (44) يظهر ورقةً واحدةً بالضبط في الشجرة، ولا ورقةَ بلا مالك.
     · مفاتيحُ كلّ ورقة في الوثيقة = مفاتيحُ مالكها النشطة في السجلّ (المجموعة نفسُها)، وعددُ المحجوز = محجوزُ السجلّ.
     · كلُّ حاويةِ صفحاتٍ = صفحةٌ في pages.json بالاسم نفسِه، وكلُّ ورقة «p/s» = تبويبٌ/ورقةٌ s في الصفحة p، وكلُّ ورقةٍ مفردة = صفحةٌ في pages.json.
   لا يُحرَّر الناتجُ يدوياً."""
import os, sys, re, json, hashlib, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def arg(name, dflt):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else dflt
SRC = os.path.join(ROOT, arg('--src', 'src')); DOC = os.path.join(ROOT, arg('--doc', 'docs/reference/v24_9_FINAL.html'))
OUT = os.path.join(SRC, 'manifests', 'perm-tree24.json')
CONT_KIND = {'العدسات (Plugins)': 'plugins', 'المنصة': 'platform', 'المراجع المستقلة (Reference Data)': 'reference'}
CONT_ID = {'العدسات (Plugins)': 'lenses', 'المنصة': 'platform', 'المراجع المستقلة (Reference Data)': 'refs'}
def registry():
    t = open(os.path.join(SRC, 'permissions', '340-registry-v24-9.js'), encoding='utf-8').read()
    return json.loads(re.search(r'var KIVO_REGISTRY_DATA = (\{[\s\S]*?\});\n', t).group(1))
def strip(x): return html.unescape(re.sub(r'<[^>]+>', '', x)).strip()
def derive():
    errs = []
    raw = open(DOC, 'rb').read(); D = registry(); sha = hashlib.sha256(raw).hexdigest()
    if sha != D['docSha256']: errs.append('بصمةُ الوثيقة ' + sha[:16] + ' ≠ docSha256 السجلّ ' + D['docSha256'][:16])
    s = raw.decode('utf-8'); i = s.find('القسم ٣ — الشجرة')
    i = s.find('القسم ٣ — الشجرة', i + 1) if s.find('<table', i) > s.find('القسم ٤', i) else i
    j = s.find('<table', i); k = s.find('</table>', j); tbl = s[j:k]
    rows = re.findall(r'<tr>(.*?)</tr>', tbl, re.S)[1:]
    owners = {o['id']: o for o in D['owners']}
    reg = {}
    for e in D['registry']: reg.setdefault(e['owner'], []).append(e)
    pages = json.load(open(os.path.join(SRC, 'manifests', 'pages.json'), encoding='utf-8'))
    PG = {p['key']: p for p in pages['pages']}; PGN = {p['name']: p for p in pages['pages']}
    cont, order, seen = {}, [], {}
    for r in rows:
        td = re.findall(r'<td>(.*?)</td>', r, re.S)
        if len(td) < 7: continue
        cname = strip(td[0]); m = re.search(r'<b>(.*?)</b>\s*<code>(.*?)</code>', td[1], re.S)
        if not m: continue
        label, oid = strip(m.group(1)), strip(m.group(2)); kind = strip(td[2]); route = strip(td[3])
        own_part = td[4].split('<br>')[0]; keys = [strip(c) for c in re.findall(r'<code>(.*?)</code>', own_part, re.S)]
        mref = re.search(r'Managed References:</b>\s*<ul[^>]*>(.*?)</ul>', td[4], re.S); managed = [strip(c) for c in re.findall(r'<code>(.*?)</code>', mref.group(1), re.S)] if mref else []
        nres = int(strip(td[5]) or 0) if strip(td[5]).isdigit() else 0
        if oid in seen: errs.append('ورقةٌ مكرّرة: ' + oid); continue
        seen[oid] = 1
        if cname not in cont:
            pg = PGN.get(cname)
            ck = CONT_KIND.get(cname, 'page')
            if ck == 'page' and not pg: errs.append('حاويةٌ بلا صفحةٍ في pages.json: ' + cname)
            cont[cname] = {'id': CONT_ID.get(cname) or (pg['key'] if pg else cname), 'label': cname, 'kind': ck, 'page': pg['key'] if pg else None, 'nav': (pg.get('nav') or pg['key']) if pg else None, 'leaves': []}
            order.append(cname)
        o = owners.get(oid)
        if not o: errs.append('ورقةٌ بلا مالكٍ في السجلّ: ' + oid); continue
        act = sorted(e['key'] for e in reg.get(oid, []) if e['status'] == 'active'); resv = [e['key'] for e in reg.get(oid, []) if e['status'] != 'active']
        if sorted(keys) != act: errs.append(oid + ': مفاتيحُ الوثيقة ≠ السجلّ ' + json.dumps({'docOnly': sorted(set(keys) - set(act)), 'regOnly': sorted(set(act) - set(keys))}, ensure_ascii=False))
        if nres != len(resv): errs.append(oid + ': المحجوز في الوثيقة ' + str(nres) + ' ≠ السجلّ ' + str(len(resv)))
        leaf = {'owner': oid, 'label': label, 'kind': kind, 'route': route, 'ownerKind': o['kind'], 'keys': keys, 'reserved': sorted(resv)}
        if o.get('managedIn'): leaf['managedIn'] = o['managedIn']
        if managed:
            leaf['managedRefs'] = managed
            ref_owner = sorted(set(e['owner'] for e in D['registry'] if e['key'] in managed))
            if any(owners.get(x, {}).get('managedIn') != oid for x in ref_owner): errs.append(oid + ': مراجعُ مُدارةٌ لا يُدار مالكُها هنا ' + ', '.join(ref_owner))
        if cont[cname]['kind'] == 'page':
            pg = PG.get(cont[cname]['page'])
            if '/' in oid:
                p, sub = oid.split('/', 1)
                pp = PG.get(p)
                names = [x['key'] for x in (pp or {}).get('subs', []) + (pp or {}).get('tabs', [])] if pp else []
                if not pp or sub not in names: errs.append(oid + ': لا تبويبَ/ورقةَ «' + sub + '» في صفحة «' + p + '» (pages.json)')
                leaf['page'], leaf['sub'] = p, sub
                # KIVO_261 · SOT-003 (1:1 مع المنصة — كشفه k261tree): لوحةٌ تعرضها «مؤشرات الإدارة» وحدها (offPage في pages.json) مكانُها الحقيقيّ #/kpis —
                # الوثيقةُ تصف مصدرَها (التبويبُ الأول في صفحته) والصفحةُ لا ترسمه إلا مستورَداً (solo) هناك. يُحفظ ما في الوثيقة (docKind/docRoute) ويُعلَن الفرق.
                x = [y for y in (pp or {}).get('subs', []) + (pp or {}).get('tabs', []) if y['key'] == sub]
                kpc = [c for c in pages.get('containers', []) if c['key'] == 'kpis']
                if x and x[0].get('offPage') and kind != 'offpage':
                    inK = bool(kpc) and oid in kpc[0].get('refs', [])
                    leaf['docKind'], leaf['docRoute'] = kind, route
                    leaf['kind'] = 'offpage'
                    leaf['route'] = '#/' + (kpc[0].get('nav') or 'kpis') if inK else ''
                    leaf['platform'] = ('تُعرض في «' + kpc[0]['name'] + '» وحدها' if inK else 'لا تُعرض في صفحتها') + ' (KIVO_261 · SOT-003 — الوثيقة: ' + kind + ' · ' + route + ')'
            else:
                pp = PG.get(oid)
                if not pp: errs.append(oid + ': ليست صفحةً في pages.json')
                else:
                    leaf['page'] = oid
                    if pp.get('under') and pp['under'] != cont[cname]['page']: errs.append(oid + ': تحت «' + pp['under'] + '» في المنصة لا «' + str(cont[cname]['page']) + '»')
        cont[cname]['leaves'].append(leaf)
    # KIVO_259 · AUD-030 (ADR-018): عدسةُ إضافةٍ غيرُ مذكورةٍ في الوثيقة تُلحق بحاوية «العدسات (Plugins)» من manifest-ها (source: plugin) —
    # مفاتيحُها من السجلّ كسائر الأوراق؛ والعدساتُ المذكورة في الوثيقة كما هي (لا تغيير للست المضمَّنة).
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plugins as PL
    LC = 'العدسات (Plugins)'
    for pm in PL.load(SRC):
        oid = pm['owner']
        if oid in seen: continue
        if oid not in owners: errs.append('إضافةٌ بلا مالكٍ في السجلّ: ' + oid); continue
        if LC not in cont:
            cont[LC] = {'id': CONT_ID[LC], 'label': LC, 'kind': CONT_KIND[LC], 'page': None, 'nav': None, 'leaves': []}
            order.insert(order.index('المنصة') if 'المنصة' in order else len(order), LC)
        cont[LC]['leaves'].append({'owner': oid, 'label': pm['label'], 'kind': 'plugin', 'route': 'Canvas host', 'ownerKind': 'lens',
                                   'keys': [e['key'] for e in reg.get(oid, []) if e['status'] == 'active'], 'reserved': sorted(e['key'] for e in reg.get(oid, []) if e['status'] != 'active'), 'source': 'plugin'})
        seen[oid] = 1
    missing = sorted(set(owners) - set(seen))
    if missing: errs.append('مالكون في السجلّ بلا ورقةٍ في الشجرة: ' + ', '.join(missing))
    # المفاتيحُ التي حلّت محلّ أوراقٍ أُلغيت في v24 (لوحاتُ «مؤشرات الإدارة»): مكانُها في المنصة للعرض
    shown = {}
    kp = [c for c in pages.get('containers', []) if c['key'] == 'kpis']
    if kp:
        for a in D['atoms']:
            if a['act'] == 'view' and a['leaf'] in kp[0]['refs'] and a['leaf'] not in owners and a.get('targets'):
                for t in a['targets']:
                    shown[t] = {'container': kp[0]['name'], 'panel': kp[0]['names'].get(a['leaf'], a['leaf']), 'asis': a['leaf']}
    out = {'version': D['version'], 'doc': D['doc'], 'docSha256': D['docSha256'], 'generatedBy': 'tools/perm_tree.py',
           'note': 'القسم ٣ من وثيقة الشجرة TO-BE v24.9 بياناتٍ: الحاوياتُ لا تُمنح؛ المفاتيحُ على الأوراق والعدسات؛ المنصةُ والمراجعُ عقدتان مستقلتان. مطابَقٌ للسجلّ ولـpages.json بأداة التوليد.',
           'containers': [cont[c] for c in order], 'shownIn': shown,
           'counts': {'containers': len(order), 'leaves': len(seen), 'keys': sum(len(l['keys']) for c in order for l in cont[c]['leaves'])}}
    return out, errs
if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    out, errs = derive()
    for e in errs: print('  ✘ ' + e)
    if errs: print('✘ شجرةُ الصلاحيات: ' + str(len(errs)) + ' مخالفة'); sys.exit(1)
    txt = json.dumps(out, ensure_ascii=False, indent=1) + '\n'
    if cmd == 'emit':
        open(OUT, 'w', encoding='utf-8').write(txt); print('✔ perm-tree24.json: ' + json.dumps(out['counts'], ensure_ascii=False))
    else:
        cur = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
        print(('✔' if cur == txt else '✘') + ' perm-tree24.json ' + ('= الاشتقاقُ من الوثيقة والسجلّ وpages.json' if cur == txt else '≠ الاشتقاق (شغّل emit بعد مراجعة السبب)') + ' · ' + json.dumps(out['counts'], ensure_ascii=False))
        sys.exit(0 if cur == txt else 1)
