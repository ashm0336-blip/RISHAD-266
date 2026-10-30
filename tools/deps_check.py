#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_259 · SOT-091 · SOT-093 · SOT-104 · (KIVO_263 · SOT-129: خطوةٌ صريحة npm run lint:deps في ci.yml) — قواعدُ الاعتماد بين طبقات الواجهة آلياً (core لا يعرف تفاصيلَ الأعمال إلا عبر عقود):
     python3 tools/deps_check.py [--json reports/deps.json]      exit 1 عند أيّ مخالفة
   المعرّفاتُ المشتركة كلُّها على الفضاء العام KIVO (AUD-016 · ADR-017): كلُّ «KIVO.X = …» تعريفٌ في ملفّه، وكلُّ «KIVO.X» إشارة. الطبقةُ = مجلدُ الملف تحت src/
   (core · layouts · api · auth · permissions · manifests · plugins · i18n · components · services · modules)، والخدماتُ قسمان بمسؤوليتها:
     منصّية (التخزين · الصور · الإشعارات · العدّ · السجل · الهوية · الطباعة المشتركة · xlsx · بدائيات العرض) ومجالية (الموظفون · الورديات · الأبواب · الجولات ·
     رصدُ الميدان · الاستيرادان).
   القواعد:
     R1 core (التشغيل · dc-runtime · المحمّل · الإصدار) لا يشير إلا إلى core وبنية الخادم (api) — لا خدمةَ ولا وحدةَ ولا صلاحية.
     R2 الغلافُ والموجِّه (layouts) لا يشير إلى خدمةٍ مجالية ولا إلى وحدة صفحة إلا عبر عقود التنقّل المعلنة (CONTRACTS).
     R3 الخدماتُ والمكوّناتُ والصلاحياتُ والمصادقة لا تشير إلى وحدات الصفحات إلا عبر العقود.
     R4 الخدماتُ المنصّية لا تشير إلى خدمةٍ مجالية.
   العقود: أسماءٌ تنشرها وحدةُ صفحةٍ لتقرأها الطبقاتُ الأخرى (نوايا التنقّل بين الصفحات) · والواجهاتُ (FACADES): اسمٌ تعرّفه خدمةٌ مجالية ويستهلكه الغلاف
   بعقدٍ معلن — معلنةٌ هنا ومكتوبةٌ في src/types/kivo.d.ts (KivoNamespace). مالكُ الاسم = أدنى طبقةٍ تعرّفه (ترتيبُ التحميل)."""
import os, re, sys, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
DOMAIN = {'400-shift-need.js', '410-gate-units.js', '420-round-factory.js', '510-emp-monthly-source.js', '520-field-monitor.js', '530-emp-day-facts.js', '580-historical-import.js', '590-employees-import.js',
          '442-notif-observer.js'}   # قواعدُ أحداث التنبيهات عبر المجالات (رصدُ الميدان · الجولات · الأبواب …) — خدمةُ تطبيقٍ لا بدائيةُ منصّة
FACADES = {'BassamNotif': 'واجهةُ التنبيهات للغلاف (الجرس · العدّ · التنقّل) — يعرّفها مراقبُ التنبيهات (442)'}
CONTRACTS = {'__ADMIN_OPEN_TAB': 'فتحُ تبويبٍ في الإعدادات من صفحةٍ أخرى', '__ADMIN_OPEN_DTAB': 'فتحُ تبويبِ إدارةٍ في الإعدادات',
             '__BS_OPEN_TAB': 'فتحُ تبويبٍ في صفحة الهدف عند التنقّل'}
ORDER = ['core', 'api', 'layouts', 'auth', 'permissions', 'manifests', 'plugins', 'i18n', 'components', 'platform', 'domain', 'modules', 'styles', 'assets', 'types', 'observability', 'scope', 'schemas']
def layer(rel):
    parts = rel.split('/')
    if parts[0] == 'services': return 'domain' if parts[-1] in DOMAIN else 'platform'
    return parts[0]
def scan():
    defs, refs = {}, {}
    for root, dirs, files in os.walk(SRC):
        rel_root = os.path.relpath(root, SRC)
        if rel_root.startswith('pages'): continue                       # الصفحاتُ مشتقّة من modules/
        for f in files:
            if not f.endswith('.js'): continue
            p = os.path.join(root, f); rel = os.path.relpath(p, SRC).replace(os.sep, '/')
            t = open(p, encoding='utf-8', errors='ignore').read()
            t = re.sub(r'/\*[\s\S]*?\*/', '', t)                           # التعليقاتُ لا تُعدّ
            for m in re.finditer(r'\bKIVO\.([A-Za-z_$][\w$]*)\s*=(?!=)', t):
                n = m.group(1)
                if n not in defs or ORDER.index(layer(rel)) < ORDER.index(layer(defs[n])): defs[n] = rel   # المالكُ = أدنى طبقةٍ تعرّفه (ترتيبُ التحميل)
            refs[rel] = sorted(set(re.findall(r'\bKIVO\.([A-Za-z_$][\w$]*)', t)))
    return defs, refs
def main():
    defs, refs = scan()
    V, M = [], {}
    for rel, names in sorted(refs.items()):
        a = layer(rel)
        for n in names:
            d = defs.get(n)
            if not d or d == rel: continue
            b = layer(d); M[(a, b)] = M.get((a, b), 0) + 1
            why = None
            if a == 'core' and b not in ('core', 'api'): why = 'R1'
            elif a == 'layouts' and ((b == 'domain' and n not in FACADES) or (b == 'modules' and n not in CONTRACTS)): why = 'R2'
            elif a in ('platform', 'domain', 'components', 'permissions', 'auth') and b == 'modules' and n not in CONTRACTS: why = 'R3'
            elif a == 'platform' and b == 'domain' and n not in FACADES: why = 'R4'
            if why: V.append({'rule': why, 'file': 'src/' + rel, 'name': n, 'definedIn': 'src/' + d})
    used = sorted({n for rel, ns in refs.items() for n in ns if n in CONTRACTS and layer(rel) != 'modules'})
    stray = sorted(n for n in CONTRACTS if n not in defs)
    LAY = ['core', 'api', 'layouts', 'auth', 'permissions', 'manifests', 'plugins', 'i18n', 'components', 'platform', 'domain', 'modules']
    print('مصفوفةُ الاعتماد (الصفّ يشير إلى العمود · عددُ الأسماء):')
    print('   ' + ' '.join(x[:8].rjust(8) for x in LAY))
    for a in LAY:
        if any(M.get((a, b)) for b in LAY): print(a[:10].ljust(11) + ' '.join(str(M.get((a, b), '')).rjust(8) for b in LAY))
    for v in V[:30]: print('  ✘ ' + v['rule'] + ' ' + v['file'] + ' → KIVO.' + v['name'] + ' (من ' + v['definedIn'] + ')')
    if stray: print('  ✘ عقودٌ معلنة بلا تعريف: ' + ', '.join(stray))
    ok = not V and not stray
    print(('✔' if ok else '✘') + ' قواعدُ الاعتماد R1–R4: ' + str(len(refs)) + ' ملفاً · ' + str(sum(M.values())) + ' إشارةً بين الملفات · المخالفات ' + str(len(V)) +
          ' · العقودُ المستعملة خارج الوحدات: ' + ', '.join(used))
    if '--json' in sys.argv:
        json.dump({'violations': V, 'matrix': {a + '→' + b: c for (a, b), c in sorted(M.items())}, 'contracts': CONTRACTS, 'domainServices': sorted(DOMAIN)},
                  open(sys.argv[sys.argv.index('--json') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(0 if ok else 1)
if __name__ == '__main__':
    main()
