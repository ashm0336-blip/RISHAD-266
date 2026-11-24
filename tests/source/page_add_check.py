# -*- coding: utf-8 -*-
"""KIVO_258 · AUD-015 — قبولُ «إضافةُ صفحة = ملفٌ واحد» آلياً. V7 · د6 (قرار المالك، الخيار أ): src/manifests/pages.json صار مولَّداً
   من القالب src/slots/manifests/pages.json.tpl وفتحات الأنظمة الحاضرة (src/slots/slots.json) — فـ«الملفُّ الواحد» اليوم:
     · صفحةٌ في القاعدة  = القالب src/slots/manifests/pages.json.tpl وحده؛
     · صفحةُ نظام        = مجلدُ النظام src/systems/<key>/ وحده (system.json بفتحات pages.*).
   على نسخةٍ مؤقتة من الشجرة (src · workers · migrations · config · tools — المولِّدُ يكتب مشتقّاتٍ في tools/ أيضاً) لكلٍّ من الحالتين:
   (أ) تظهر الصفحةُ في كل سجلّ: كتلةُ الواجهة KIVO_MANIFEST (pages · navOrder · navNames · routeNames · tabAddr) · PG_REG في جزء الخادم
       وفي العامل المركَّب _worker.js (بأوراقها: الصفحةُ الفرعية والتبويب والتبويبُ خارج الصفحة)
   (ب) يكون كلُّ ما تغيّر في الشجرة = الملفُّ اليدوي (القالب · أو مجلدُ النظام) + المشتقّاتُ المعلنة وحدها (pages.json · 255 · جزءُ PG_REG · العامل)
   (ب٢) المولِّد --check بعدها نظيف، والبناءُ (split + الصفحاتُ الكسولة) ينجح وكتلتُه تحمل الصفحة
   (د) تعديلُ pages.json المولَّد يدوياً يُكشف: generate --check يرفضه ويسمّيه
   (ج) تستهلك الواجهةُ السجلات من KIVO_MANIFEST لا من نسخٍ حرفية (331 · 333 · 260 · root-logic) — وتشغيلُ الكتلة المولَّدة في vm يُرجع الصفحة
       python3 tests/source/page_add_check.py"""
import os, sys, json, shutil, tempfile, subprocess, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:400]) if x else ''))
def last(r):
    L = [l for l in (r.stdout + r.stderr).strip().split('\n') if '✘' in l or 'Error' in l]
    return (' | '.join(L[:3]) if L else (r.stdout + r.stderr).strip().split('\n')[-1])[:300]
def world():
    tmp = tempfile.mkdtemp(prefix='k258page_'); S = os.path.join(tmp, 'src')
    shutil.copytree(os.path.join(ROOT, 'src'), S, ignore=shutil.ignore_patterns('__pycache__'))
    for d in ('workers', 'migrations', 'config', 'tools'):
        if os.path.isdir(os.path.join(ROOT, d)): shutil.copytree(os.path.join(ROOT, d), os.path.join(tmp, d), ignore=shutil.ignore_patterns('__pycache__'))
    for d in ('node_modules', 'tests', 'public'):   # للقراءة وحدها: الاعتمادياتُ · ملفاتُ الاختبار التي تعلنها الإضافات · أصولُ البناء
        if os.path.isdir(os.path.join(ROOT, d)): os.symlink(os.path.join(ROOT, d), os.path.join(tmp, d))
    return tmp, S
def snap(tmp):
    out = {}
    for base in ('src', 'workers', 'tools'):
        for dp, dn, fn in os.walk(os.path.join(tmp, base)):
            for f in fn:
                q = os.path.join(dp, f); out[os.path.relpath(q, tmp)] = hashlib.sha256(open(q, 'rb').read()).hexdigest()
    return out
gen = lambda tmp, *a: subprocess.run([sys.executable, 'tools/generate.py', '--src', 'src'] + list(a), cwd=tmp, capture_output=True, text=True)
PROBE = r'''
const vm = require('vm'); const fs = require('fs'); const w = {}; const ctx = vm.createContext({ window: w }); ctx.KIVO = w;
vm.runInContext(fs.readFileSync(process.argv[1], 'utf8'), ctx);
const K = w.KIVO_MANIFEST, key = process.argv[2]; const pages = K.clone('pages'), nav = K.clone('navOrder'), names = K.clone('navNames'), rn = K.clone('routeNames'), ta = K.clone('tabAddr');
const p = pages.find(x => x.key === key);
console.log(JSON.stringify({ page: !!p, subs: p && (p.subs || []).map(x => x.key), tabs: p && (p.tabs || []).map(x => x.key), nav: nav.indexOf(key) !== -1, name: names[key], route: rn[key], tab: ta[key] }));
'''
# المشتقّاتُ المعلنة لصفحةٍ تُطفأ (activation: toggle — نظامٌ في Perm44): pages.json · كتلةُ الواجهة 255 · PG_REG (021) · فهرسُ الأجزاء · العامل
#   + السجلُّ المجموع ومشتقّاتُه (مفتاحُ التفعيل ff.module.<key>.enabled: 340 · 004) + قائمةُ أنظمة المحرّك (345 · 057b)
DERIVED0 = {'src/manifests/255-page-manifest.js', 'src/manifests/pages.json', 'src/permissions/340-registry-v24-9.js', 'src/permissions/345-perm44.js',
            'src/permissions/registry/registry-v24.9.json', 'workers/_worker.js', 'workers/parts.json', 'workers/parts/004-registry-2.js',
            'workers/parts/021-authz-core-intro.js', 'workers/parts/057b-perm44.js'}
DERIVED = {'demo': DERIVED0, 'demosys': DERIVED0}
LINE = "  { key: '%s', subs: ['main'], tabs: ['t1', 't2'], off: ['t2'] }"
def scenario(title, key, add, hand):
    """add(tmp, S): يضيف الصفحة في الملف اليدوي وحده · hand(path) ⇒ هل هذا المسار من الإضافة اليدوية"""
    print('\n╔═ ' + title + ' ═╗')
    tmp, S = world()
    try:
        g0 = gen(tmp, '--check'); ok(g0.returncode == 0, 'النسخةُ المؤقتة = المصدر (generate --check قبل الإضافة)', last(g0))
        before = snap(tmp); add(tmp, S)
        g1 = gen(tmp); ok(g1.returncode == 0, 'المولِّدُ بعد الإضافة', last(g1))
        after = snap(tmp)
        changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
        manual = [k for k in changed if hand(k)]
        derived = set(changed) - set(manual)
        wpart = [k for k in derived if k.startswith('workers/parts/') and k.endswith('.js')]
        print('     · ' + json.dumps(sorted(derived), ensure_ascii=False))
        ok(manual and derived == DERIVED[key],
           '★ (ب) ما تغيّر = ' + ' · '.join(manual[:3]) + ' (يدوياً) + المشتقّاتُ وحدها: pages.json · كتلةُ الواجهة 255 · جزءُ الخادم (PG_REG) · العاملُ المركَّب', json.dumps(changed, ensure_ascii=False))
        r = subprocess.run(['node', '-e', PROBE, os.path.join(S, 'manifests', '255-page-manifest.js'), key], capture_output=True, text=True)
        o = json.loads(r.stdout.strip() or '{}') if r.stdout.strip().startswith('{') else {}
        ok(o.get('page') and o.get('subs') == ['main'] and o.get('tabs') == ['t1', 't2'] and o.get('nav') and o.get('name') and o.get('route') and o.get('tab') == 1,
           '★ (أ) الواجهة: KIVO_MANIFEST يُرجع الصفحةَ بأوراقها وموضعَها في القائمة واسمَها ومسارَها وعنوانَ تبويباتها', r.stdout.strip()[:200] or r.stderr.strip()[:200])
        wp = ''.join(open(os.path.join(tmp, k), encoding='utf-8').read() for k in wpart if (LINE % key) in open(os.path.join(tmp, k), encoding='utf-8').read()); wj = open(os.path.join(tmp, 'workers', '_worker.js'), encoding='utf-8').read()
        ok((LINE % key) in wp and (LINE % key) in wj, '★ (أ) الخادم: PG_REG في الجزء وفي العامل المركَّب يحمل الصفحةَ بأوراقها (والتبويبُ خارج الصفحة off)', wpart[:1])
        g2 = gen(tmp, '--check'); ok(g2.returncode == 0, '★ (ب٢) المولِّد --check بعد الإضافة نظيف (المشتقّاتُ = مصادرها)', last(g2))
        b = subprocess.run([sys.executable, 'tools/build.py', '--src', 'src', '--mode', 'split', '--pages', 'lazy', '--out', '_dist'], cwd=tmp, capture_output=True, text=True)
        built = ''
        for dp, dn, fn in os.walk(os.path.join(tmp, '_dist')):
            for f in fn:
                if f.endswith(('.js', '.html')):
                    t = open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()
                    if '"key":"' + key + '"' in t.replace(' ', '') or "key: '" + key + "'" in t: built += f + ' '
        ok(b.returncode == 0 and built, '★ (ب٢) البناء (split + الصفحاتُ الكسولة) ينجح والحزمةُ تحمل الصفحة', (last(b) + ' · ' + built)[:200])
        return tmp, S
    except Exception as e:
        ok(False, title + ': استثناء', repr(e)[:300]); return tmp, S

DEMO = '  {\n   "key": "%s",\n   "activation": "%s",\n   "nav": "%s",\n   "name": "%s",\n   "seq": [\n    "sub:main",\n    "tab:t1",\n    "tab:t2"\n   ],\n   "subs": [\n    {\n     "key": "main",\n     "name": "الرئيسية"\n    }\n   ],\n   "tabs": [\n    {\n     "key": "t1",\n     "name": "تبويبٌ أوّل"\n    },\n    {\n     "key": "t2",\n     "name": "تحليلٌ خارج الصفحة",\n     "offPage": true\n    }\n   ]\n  },\n'
NAME = 'صفحةٌ تجريبية'
TPL = os.path.join('src', 'slots', 'manifests', 'pages.json.tpl'); REGB = os.path.join('src', 'permissions', 'registry', 'registry.base.json')

# ① صفحةٌ في القاعدة: القالبُ وحده
def add_core(tmp, S):
    p = os.path.join(tmp, TPL); t = open(p, encoding='utf-8', newline='').read()
    def put(anchor, text, after=False):
        nonlocal t
        assert t.count(anchor) == 1, 'مرساةٌ غيرُ فريدة في القالب: ' + anchor[:60]
        t = t.replace(anchor, anchor + text if after else text + anchor)
    put('  {\n   "key": "admin",\n', DEMO % ('demo', 'toggle', 'demo', NAME))                                   # pages: قبل «الإعدادات»
    put('  "admin": 1@@SYS:pages.tabAddr.daily.entry@@', '  "demo": 1,\n')                          # tabAddr
    put('@@SYS:pages.navOrder.tail@@', ',\n  "demo"', after=True)                                    # navOrder
    put('@@SYS:pages.navNames.tail@@', ',\n  "demo": "' + NAME + '"', after=True)                   # navNames
    put('  "admin": "الإعدادات",\n', '  "demo": "' + NAME + '",\n')                                 # routeNames
    open(p, 'w', encoding='utf-8', newline='').write(t)
    # عقدُ النظام (CORE-01): كلُّ صفحةٍ تُطفأ لها مفتاحُ تفعيلٍ في السجلّ — ومفاتيحُ صفحات القاعدة في registry.base.json (مصدرُ القاعدة الوحيد للسجلّ)
    q = os.path.join(tmp, REGB); r = open(q, encoding='utf-8', newline='').read(); a = '"ff.module.help.enabled",'
    assert r.count(a) == 1, 'مرساةُ مفتاح التفعيل'
    open(q, 'w', encoding='utf-8', newline='').write(r.replace(a, a + '\n  "ff.module.demo.enabled",'))
tmp1, S1 = scenario('① صفحةٌ في القاعدة «demo»: القالب src/slots/manifests/pages.json.tpl (+ مفتاحُ تفعيلها في registry.base.json — CORE-01)', 'demo', add_core, lambda k: k in (TPL, REGB))

# (د) على النسخة نفسِها بعد الإضافة: تعديلُ pages.json المولَّد يدوياً يُكشف
print('\n╔═ (د) تعديلُ pages.json المولَّد يدوياً ═╗')
try:
    mp = os.path.join(S1, 'manifests', 'pages.json'); M = json.load(open(mp, encoding='utf-8'))
    M['navNames']['demo'] = 'اسمٌ بتعديلٍ يدوي'; json.dump(M, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    g = gen(tmp1, '--check')
    ok(g.returncode != 0 and 'pages.json' in (g.stdout + g.stderr), '★ (د) generate --check يرفض pages.json المعدَّلَ يدوياً ويسمّيه', last(g))
finally:
    shutil.rmtree(tmp1, ignore_errors=True)

# ② صفحةُ نظام: مجلدُ النظام وحده
SYS = {'schema': 1, 'kind': 'system', 'key': 'demosys', 'name': 'نظامٌ تجريبي', 'note': 'TEST_ONLY — نظامٌ اصطناعي لقبول «صفحةُ نظام = مجلدُه وحده»',
       'client': {'files': []}, 'server': {'parts': []}, 'permissions': 'permissions.json',
       'slots': {'pages.entry.systems': {'order': 90, 'text': DEMO % ('demosys', 'toggle', 'demosys', 'نظامٌ تجريبي')},
                 'pages.tabAddr.tail': {'order': 90, 'text': ',\n  "demosys": 1'},
                 'pages.navOrder.tail': {'order': 90, 'text': ',\n  "demosys"'},
                 'pages.navNames.tail': {'order': 90, 'text': ',\n  "demosys": "نظامٌ تجريبي"'},
                 'pages.routeNames.systems': {'order': 90, 'text': '  "demosys": "نظامٌ تجريبي",\n'}}}
PERMS = {'schema': 1, 'system': 'demosys', 'note': 'TEST_ONLY — مفتاحُ تفعيل النظام الاصطناعي (نظامٌ يُطفأ: CORE-01)',
         'docs': {'registry': [{'path': ['featureFlags'], 'after': 12, 'seq': 99, 'value': 'ff.module.demosys.enabled'}]}}
CONTRACT = {'schema': 1, 'system': 'demosys', 'version': 1, 'note': 'TEST_ONLY — عقدُ النظام الاصطناعي: لا يملك مفتاحاً ولا يوفّر ولا يستهلك شيئاً', 'owns': [], 'files': [], 'provides': {}, 'consumes': {}, 'crossEffects': []}
def add_sys(tmp, S):
    d = os.path.join(S, 'systems', 'demosys'); os.makedirs(d)
    open(os.path.join(d, 'system.json'), 'w', encoding='utf-8').write(json.dumps(SYS, ensure_ascii=False, indent=1) + '\n')
    open(os.path.join(d, 'permissions.json'), 'w', encoding='utf-8').write(json.dumps(PERMS, ensure_ascii=False, indent=1) + '\n')
    open(os.path.join(d, 'contract.json'), 'w', encoding='utf-8').write(json.dumps(CONTRACT, ensure_ascii=False, indent=1) + '\n')   # لكل نظامٍ عقد (حارسُ العقود)
tmp2, S2 = scenario('② صفحةُ نظام «demosys»: مجلدُ النظام src/systems/demosys/ وحده', 'demosys', add_sys, lambda k: k.startswith('src/systems/demosys/'))
shutil.rmtree(tmp2, ignore_errors=True)

print('\n╔═ (ج) المستهلكون يقرؤون من المصدر الواحد ═╗')
cons = {'src/permissions/331-perm-model.js': ["KIVO.KIVO_MANIFEST.clone('pages')", "KIVO.KIVO_MANIFEST.clone('containers')", "KIVO.KIVO_MANIFEST.clone('lenses')"],
        'src/manifests/333-platform-map.js': ["KIVO.KIVO_MANIFEST.clone('tabAddr')"], 'src/layouts/260-bassam-plat.js': ["KIVO.KIVO_MANIFEST.clone('navOrder')", "KIVO.KIVO_MANIFEST.clone('navNames')"],
        'src/layouts/root-logic.js': ["KIVO.KIVO_MANIFEST.clone('routeNames')"]}
miss = [f + ' ∌ ' + s for f, ss in cons.items() for s in ss if s not in open(os.path.join(ROOT, f), encoding='utf-8').read()]
ok(not miss, '★ السجلاتُ في الواجهة (PAGE_REG · NAV_REG · LENS_REG · TAB_ADDR · NAVKEYS · NAVNAMES · _pageNames) تُبنى من KIVO_MANIFEST', json.dumps(miss, ensure_ascii=False))
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
