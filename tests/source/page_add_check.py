# -*- coding: utf-8 -*-
"""KIVO_258 · AUD-015 — قبولُ «إضافةُ صفحة = ملفٌ واحد» آلياً: على نسخةٍ مؤقتة من src/ تُضاف صفحةٌ جديدة (بتبويبٍ وصفحةٍ فرعية)
   وحاويةٌ في القائمة إلى src/manifests/pages.json وحده، ثم يُشغَّل المولِّد (tools/generate.py) — فيجب أن:
   (أ) تظهر الصفحةُ في كل سجلّ: كتلةُ الواجهة KIVO_MANIFEST (pages · navOrder · navNames · routeNames · tabAddr) · PG_REG في جزء الخادم
       وفي العامل المركَّب _worker.js (بأوراقها: الصفحةُ الفرعية والتبويب والتبويبُ خارج الصفحة)
   (ب) يكون كلُّ ما تغيّر في الشجرة = pages.json (اليدوي) + المشتقّاتُ المعلنة وحدها — لا تعديلَ يدويَّ في أيّ ملفٍّ آخر
   (ج) تستهلك الواجهةُ السجلات من KIVO_MANIFEST لا من نسخٍ حرفية (331 · 333 · 260 · root-logic) — وتشغيلُ الكتلة المولَّدة في vm يُرجع الصفحة
       python3 tests/source/page_add_check.py"""
import os, sys, json, shutil, tempfile, subprocess, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:400]) if x else ''))
tmp = tempfile.mkdtemp(prefix='k258page_'); S = os.path.join(tmp, 'src')
shutil.copytree(os.path.join(ROOT, 'src'), S)
for d in ('workers', 'migrations', 'config'):
    if os.path.isdir(os.path.join(ROOT, d)): shutil.copytree(os.path.join(ROOT, d), os.path.join(tmp, d))
def snap():
    out = {}
    for base in (S, os.path.join(tmp, 'workers')):
        for dp, dn, fn in os.walk(base):
            for f in fn:
                q = os.path.join(dp, f); out[os.path.relpath(q, tmp)] = hashlib.sha256(open(q, 'rb').read()).hexdigest()
    return out
g0 = subprocess.run([sys.executable, 'tools/generate.py', '--src', S, '--check'], cwd=ROOT, capture_output=True, text=True)
ok(g0.returncode == 0, 'النسخةُ المؤقتة = المصدر (generate --check قبل الإضافة)', g0.stdout.strip().split('\n')[-1][:160])
before = snap()
print('╔═ إضافةُ صفحة «demo» في pages.json وحده ═╗')
mp = os.path.join(S, 'manifests', 'pages.json'); M = json.load(open(mp, encoding='utf-8'))
M['pages'].append({'key': 'demo', 'nav': 'demo', 'name': 'صفحةٌ تجريبية', 'seq': ['sub:main', 'tab:t1', 'tab:t2'], 'subs': [{'key': 'main', 'name': 'الرئيسية'}],
                   'tabs': [{'key': 't1', 'name': 'تبويبٌ أوّل'}, {'key': 't2', 'name': 'تحليلٌ خارج الصفحة', 'offPage': True}]})
M['navOrder'].append('demo'); M['navNames']['demo'] = 'صفحةٌ تجريبية'; M['routeNames']['demo'] = 'صفحةٌ تجريبية'; M['tabAddr']['demo'] = 1
json.dump(M, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
g1 = subprocess.run([sys.executable, 'tools/generate.py', '--src', S], cwd=ROOT, capture_output=True, text=True)
ok(g1.returncode == 0, 'المولِّدُ بعد الإضافة', (g1.stdout + g1.stderr).strip().split('\n')[-1][:160])
after = snap()
changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
want = {'src/manifests/pages.json', 'src/manifests/255-page-manifest.js'}
wpart = [k for k in changed if k.startswith('workers/parts/')]; wout = [k for k in changed if k == 'workers/_worker.js']
ok(set(changed) - set(wpart) - set(wout) == want and len(wpart) == 1 and len(wout) == 1,
   '★ (ب) ما تغيّر = pages.json (يدوياً) + المشتقّاتُ وحدها: كتلةُ الواجهة 255 · جزءُ الخادم (PG_REG) · العاملُ المركَّب', json.dumps(changed, ensure_ascii=False))
blk = open(os.path.join(S, 'manifests', '255-page-manifest.js'), encoding='utf-8').read()
js = r'''
const vm = require('vm'); const fs = require('fs'); const w = {}; const ctx = vm.createContext({ window: w }); ctx.KIVO = w;
vm.runInContext(fs.readFileSync(process.argv[1], 'utf8'), ctx);
const K = w.KIVO_MANIFEST; const pages = K.clone('pages'), nav = K.clone('navOrder'), names = K.clone('navNames'), rn = K.clone('routeNames'), ta = K.clone('tabAddr');
const p = pages.find(x => x.key === 'demo');
console.log(JSON.stringify({ page: !!p, subs: p && p.subs.map(x => x.key), tabs: p && p.tabs.map(x => x.key), nav: nav.indexOf('demo') !== -1, name: names.demo, route: rn.demo, tab: ta.demo, keys: K.keys }));
'''
r = subprocess.run(['node', '-e', js, os.path.join(S, 'manifests', '255-page-manifest.js')], capture_output=True, text=True)
o = json.loads(r.stdout.strip() or '{}') if r.stdout.strip().startswith('{') else {}
ok(o.get('page') and o.get('subs') == ['main'] and o.get('tabs') == ['t1', 't2'] and o.get('nav') and o.get('name') and o.get('route') and o.get('tab') == 1,
   '★ (أ) الواجهة: KIVO_MANIFEST يُرجع الصفحةَ بأوراقها وموضعَها في القائمة واسمَها ومسارَها وعنوانَ تبويباتها', r.stdout.strip()[:200] or r.stderr.strip()[:200])
wp = open(os.path.join(tmp, wpart[0]), encoding='utf-8').read() if wpart else ''; wj = open(os.path.join(tmp, 'workers', '_worker.js'), encoding='utf-8').read()
line = "  { key: 'demo', subs: ['main'], tabs: ['t1', 't2'], off: ['t2'] }"
ok(line in wp and line in wj, '★ (أ) الخادم: PG_REG في الجزء وفي العامل المركَّب يحمل الصفحةَ بأوراقها (والتبويبُ خارج الصفحة off)', wpart[:1])
print('\n╔═ (ج) المستهلكون يقرؤون من المصدر الواحد ═╗')
cons = {'src/permissions/331-perm-model.js': ["KIVO.KIVO_MANIFEST.clone('pages')", "KIVO.KIVO_MANIFEST.clone('containers')", "KIVO.KIVO_MANIFEST.clone('lenses')"],
        'src/manifests/333-platform-map.js': ["KIVO.KIVO_MANIFEST.clone('tabAddr')"], 'src/layouts/260-bassam-plat.js': ["KIVO.KIVO_MANIFEST.clone('navOrder')", "KIVO.KIVO_MANIFEST.clone('navNames')"],
        'src/layouts/root-logic.js': ["KIVO.KIVO_MANIFEST.clone('routeNames')"]}
miss = [f + ' ∌ ' + s for f, ss in cons.items() for s in ss if s not in open(os.path.join(ROOT, f), encoding='utf-8').read()]
ok(not miss, '★ السجلاتُ في الواجهة (PAGE_REG · NAV_REG · LENS_REG · TAB_ADDR · NAVKEYS · NAVNAMES · _pageNames) تُبنى من KIVO_MANIFEST', json.dumps(miss, ensure_ascii=False))
shutil.rmtree(tmp, ignore_errors=True)
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
