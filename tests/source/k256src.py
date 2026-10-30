# -*- coding: utf-8 -*-
"""KIVO_256 · SOT-003/004/005/010/015 (شجرةُ صلاحيات الموظف وسقفُ الإدارة على شجرة v24.9) · AUD-007 (المصدرُ المقروء) — إثباتُ الفرق بالضبط عن KIVO_255
   (الوسم git؛ KIVO_PREV_TAG يبدّله — مثلاً الفرع k255 قبل وسمه).
   (أ) الشجرةُ المتتبَّعة = KIVO_255 بايتاً عدا الملفاتِ المعلنة (CODE) والجديدةِ المعلنة (NEW_OK)؛ لا ملفَّ كودٍ غيرَ متتبَّع.
       ومنها: صفحاتُ الوحدات الثلاث التي نُقل منها شعارُ الطباعة (المهام اليومية · التشغيل الميداني · الموظفون) = 255 بايتاً — برهانُ الأصل الواحد.
   (ب) الشجرة: tools/perm_tree.py check (الوثيقة ↔ السجلّ ↔ pages.json) · ثوابتُ p24 = الخادم (ENF_DERIVE · ENF_COMPAT · ENF_LEAF_RE) ·
       الخطّاف في setEmpTpl · قصُّ المنح في مُعدِّلات السقف الأربعة · الشجرةُ في وضع الإنفاذ وحده (t24On ⇐ authz()) · كتلُ العرض الثلاث ملفوفةٌ بالشرطين.
   (ج) AUD-007: admin/logic.js مقروء (prettified) · helmet.css الإعدادات = 255 بعد حذف الأسطر المضافة (فواصلُ بين القواعد وحدها) · الأصلُ الواحد
       src/assets/images/haramain-print.png ولا data:image مضمَّنةً ≥ 2 KB في مصادر الوحدات · مسحُ الأسطر > 1,500 بايت في المصادر المحرَّرة يدوياً.
   (د) الرموز: لا فرقَ عن KIVO_255 (tokens verify). (هـ) بصمةُ فرق كلّ ملفٍّ معلن = المسجَّلةُ في k256diff.json (--freeze يعيد التسجيل عمداً).
   (و) المشتقّات · الفهرس · الإصدار 156/256 · لا catch فارغاً جديداً · البيئة · العقد = مساراتُ العامل · الحزمةُ من هذا المصدر.
       python3 tests/source/k256src.py [pk256] [--freeze]"""
import os, sys, hashlib, subprocess, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk256'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_255')
FREEZE = '--freeze' in sys.argv
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
gitb = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, cwd=ROOT).stdout
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')
print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا الملفات المعلنة ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   المرجعُ ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
CODE = sorted(['src/core/270-bs-ver.js', 'workers/_worker.js', 'workers/parts/002-seclog.js', 'workers/parts/056-enforce.js',
               'src/auth/330-auth-perm.js', 'src/services/440-notifications.js', 'src/assets/icons/catalog.json',
               'src/modules/admin/logic.js', 'src/modules/admin/view.html', 'src/modules/admin/helmet.css', 'src/modules/admin/meta.json', 'src/modules/modules.json',
               'src/modules/plan/logic.js', 'src/modules/employees/logic.js', 'src/modules/daily/logic.js', 'src/pages/Admin.dc.html', 'tools/page_modules.py'])
NEW_OK = ('src/assets/images/haramain-print.png', 'src/manifests/perm-tree24.json', 'tools/perm_tree.py', 'tools/ast_equal.mjs')
diffC = [k for k in diff if k not in NEW_OK]; untracked = [k for k in untracked if k not in NEW_OK]
ok(diffC == CODE and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = الـ' + str(len(CODE)) + ' المعلنة فقط · لا ملفَّ كودٍ غيرَ متتبَّع',
   json.dumps({'extra': [k for k in diffC if k not in CODE], 'missing': [k for k in CODE if k not in diffC], 'untracked': untracked}, ensure_ascii=False))
ok(all(k in cur and k not in prev for k in NEW_OK), '   الملفّاتُ الجديدة الأربعة متتبَّعة وجديدة', NEW_OK)
for pg in ('Daily Sessions', 'Operational Plan', 'Employees'):
    q = 'src/pages/' + pg + '.dc.html'
    ok(q in prev and prev.get(q) == cur.get(q), '★ صفحةُ «' + pg + '» = ' + TAG + ' بايتاً بعد نقل شعار الطباعة إلى أصلٍ واحد (@@KIVO_INLINE@@ يُضمَّن عند التركيب)')
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'window.__BS_VER = "2026.10.10-256";', '   الإصدار 2026.10.10-256')

print('\n╔═ (ب) شجرةُ v24.9: الوثيقة · الثوابت · الوضع ═╗')
pt = subprocess.run([sys.executable, 'tools/perm_tree.py', 'check'], cwd=ROOT, capture_output=True, text=True)
ok(pt.returncode == 0 and '✔ perm-tree24.json' in pt.stdout, '★ tools/perm_tree.py check: perm-tree24.json = الاشتقاقُ من الوثيقة (القسم ٣) والسجلّ وpages.json', pt.stdout.strip()[-200:])
T = json.load(open(ROOT + '/src/manifests/perm-tree24.json', encoding='utf-8'))
ok(T['counts'] == {'containers': 13, 'leaves': 44, 'keys': 255}, '   13 حاوية · 44 ورقة · 255 مفتاحاً نشطاً', json.dumps(T['counts']))
p330 = rd(ROOT + '/src/auth/330-auth-perm.js'); W = rd(ROOT + '/workers/_worker.js')
lit = lambda src, name: (re.search(r'var ' + name + r' = (\{[^\n]*?\});', src) or [None, ''])[1]
ok(lit(p330, 'P24_DERIVE') and lit(p330, 'P24_DERIVE') == lit(W, 'ENF_DERIVE'), '★ P24_DERIVE = ENF_DERIVE في الخادم حرفاً (D‑19)')
ck = lambda s: sorted(re.findall(r"'([a-z.]+)':", s or ''))
ok(ck(lit(p330, 'P24_COMPAT')) == ck(lit(W, 'ENF_COMPAT')) and ck(lit(p330, 'P24_COMPAT')), '★ P24_COMPAT = مفاتيحُ ENF_COMPAT (D3‑01)')
ok('/^([A-Za-z]+(?:\\/[A-Za-z]+)?):(view|add|edit|del|approve|export)$/' in p330 and 'var ENF_LEAF_RE = /^([A-Za-z]+(?:\\/[A-Za-z]+)?):(view|add|edit|del|approve|export)$/;' in W, '   P24_LEAF_RE = ENF_LEAF_RE')
ok('var g24 = p24AfterTpl(ekey, tplId, d);' in p330, '★ الخطّاف: منحُ قالبٍ في وضع الإنفاذ يضبط المنحَ الصريح (keys24 بالضبط أو رفعُ السابق)')
ok(p330.count('p24TrimGrants(scope);') == 1 and p330.count('p24TrimGrants([d]);') == 3, '★ قصُّ المنح الصريح في مُعدِّلات السقف الأربعة (السقف · التبويبات ×2 · العدسات)')
ok("if (!azZ() || !p24R() || !isSuper()) return 0;" in p330 and "if (!azZ() || !ekey || !p24R()) return null;" in p330 and "if (!azZ()) return { ok:false, err:'المنحُ على مستوى المفتاح في وضع الإنفاذ وحده' };" in p330,
   '★ كلُّ كتابةٍ للمنح الصريح في وضع الإنفاذ وحده (النظامُ القديم لا يتغيّر)')
adm = rd(ROOT + '/src/modules/admin/logic.js'); view = rd(ROOT + '/src/modules/admin/view.html')
ok('return !!(window.BassamPerm && window.BassamPerm.authz && window.BassamPerm.authz() && window.BassamPerm.p24 && window.BassamPerm.p24.R() && this.t24Struct());' in adm, '★ t24On: الشجرةُ الجديدة في وضع الإنفاذ وحده (__BS_AUTHZ)')
blocks = [(m, view.count('<sc-if value="{{' + m + 'Legacy}}"'), view.count('<sc-if value="{{' + m + 'V24}}"')) for m in ('cap', 'up', 'tp')]
ok(all(a == 1 and b == 1 for _, a, b in blocks) and view.count('data-bs="permtree24"') == 3, '   كتلُ العرض الثلاث (السقف · نافذةُ المستخدم · القوالب): القديمةُ تحت *Legacy والجديدةُ تحت *V24', json.dumps(blocks))

print('\n╔═ (ج) AUD-007: المصدرُ المقروء ═╗')
meta = json.load(open(ROOT + '/src/modules/admin/meta.json', encoding='utf-8'))
ok(meta.get('prettified') is True and meta.get('minifiedSource') is True and adm.count('\n') > 10000, '★ admin/logic.js مقروء (prettier) ويُضغط عند البناء كسائر الصفحات', str(adm.count('\n')) + ' سطراً')
h0 = gitb('show', TAG + ':src/modules/admin/helmet.css').decode('utf-8'); h1 = rd(ROOT + '/src/modules/admin/helmet.css')
ok(h0 and h1.replace('\n', '') == h0.replace('\n', '') and h1.count('\n') > h0.count('\n') and max(len(l.encode()) for l in h1.split('\n')) <= 1500,
   '★ helmet.css الإعدادات = ' + TAG + ' بعد حذف الأسطر المضافة (فواصلُ بين القواعد وحدها — CSS متطابق) · أطولُ سطر ≤ 1,500', str(h0.count('\n')) + ' → ' + str(h1.count('\n')))
png = open(ROOT + '/src/assets/images/haramain-print.png', 'rb').read()
ok(png[:8] == b'\x89PNG\r\n\x1a\n' and sha(png)[:16] == '7dd7bcf31a380852', '   الأصلُ الواحد: src/assets/images/haramain-print.png (PNG · 60,433 بايتاً)')
embedded = []
for root, _, files in os.walk(ROOT + '/src/modules'):
    for f in files:
        if f.endswith(('.js', '.html', '.css')):
            s = rd(os.path.join(root, f))
            if re.search(r'data:image/[a-z+]+;base64,[A-Za-z0-9+/=]{2000,}', s): embedded.append(os.path.relpath(os.path.join(root, f), ROOT))
uses = sum(rd(ROOT + '/src/modules/' + m + '/logic.js').count('@@KIVO_INLINE:img/haramain-print.png@@') for m in ('daily', 'plan', 'employees'))
ok(not embedded and uses == 3, '★ لا صورةَ مضمَّنةً ≥ 2 KB في مصادر الوحدات · ثلاثُ إشاراتٍ إلى الأصل الواحد (كانت ثلاثَ نسخٍ × 80 KB)', json.dumps({'embedded': embedded, 'uses': uses}))
DERIVED = set()
gl = subprocess.run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'], cwd=ROOT, capture_output=True, text=True).stdout
for m in re.finditer(r'^\s+[=✘]\s+(\S.*?)\s{2}[0-9a-f]{12}', gl, re.M): DERIVED.add(os.path.normpath(os.path.join(ROOT, 'src', m.group(1))))
DATA = {os.path.normpath(ROOT + '/' + q) for q in ('src/permissions/340-registry-v24-9.js', 'src/assets/icons/catalog.json', 'src/manifests/perm-tree24.json')}
logicLong, markupLong, other = [], [], []
for root, _, files in os.walk(ROOT + '/src'):
    for f in files:
        q = os.path.normpath(os.path.join(root, f))
        if q in DERIVED or q in DATA or not f.endswith(('.js', '.css', '.html', '.json', '.mjs')): continue
        n = sum(1 for l in rd(q).split('\n') if len(l.encode()) > 1500)
        if not n: continue
        r = os.path.relpath(q, ROOT)
        (markupLong if r.endswith('view.html') else logicLong if r.endswith('logic.js') else other).append((r, n))
ok(not logicLong, '★ لا سطرَ > 1,500 بايت في أيّ منطق وحدة (logic.js) — كانت 4 ملفات (الإعدادات مضغوطة · 3 بشعارٍ مضمَّن)', json.dumps(logicLong, ensure_ascii=False))
print('   (المتبقّي في المصادر المحرَّرة يدوياً: ' + str(sum(n for _, n in markupLong)) + ' سطرَ ترميزٍ في ' + str(len(markupLong)) + ' قوالب — عناصرُ متجاورةٌ بأنماطٍ مضمَّنة لا كودٌ مضغوط؛ '
      'كسرُها بين العناصر يُدخل عُقدَ مسافاتٍ بين العناصر السطرية فيغيّر الرسم — يبقى إفصاحاً · وغيرُها: ' + json.dumps(other, ensure_ascii=False) + ')')

print('\n╔═ (د) الرموز: لا فرق عن ' + TAG + ' ═╗')
tv = subprocess.run([sys.executable, 'tools/tokens.py', 'verify', 'src', 'git:' + TAG], cwd=ROOT, capture_output=True, text=True)
ok(tv.returncode == 0 and ' 0 فرق منها 0 ' in tv.stdout, '★ tokens verify مقابل ' + TAG + ': 0 فرق في الفاتح والداكن · 0 رمزٍ جديد', tv.stdout.split('\n')[0][:200])

print('\n╔═ (هـ) بصماتُ الفروق المراجَعة ═╗')
FP = ROOT + '/tests/source/k256diff.json'
REASONS = {
 'workers/parts/002-seclog.js': 'الإصدار 2026.10.10-156', 'workers/parts/056-enforce.js': 'ENF_VER KIVO_256',
 'src/auth/330-auth-perm.js': 'SOT-003/010/015: p24 — حسابُ المفاتيح الفعلية = الخادم (السقف · بوابةُ العدسة · الترجمة · plus/minus) · المنحُ الصريح (setGrant) · القوالب (afterTpl في setEmpTpl) · قصُّ المنح عند تضييق السقف',
 'src/services/440-notifications.js': 'قاموسُ العدد والمعدود: «صلاحية» و«مفتاح»',
 'src/assets/icons/catalog.json': 'مواضعُ الاستعمال (القفل · المجلد · السهم · الصحّ) في كتل الشجرة الثلاث',
 'src/modules/admin/logic.js': 'AUD-007 مقروء (prettier · AST متطابق) + الشجرة v24.9: t24Struct/Shown/Rows · نافذةُ المستخدم (up24) · القوالب (keys24) · السقف (cap24 · مزامنةُ لوحات المؤشرات) · فتحُ النافذة مطويّة',
 'src/modules/admin/view.html': 'الشجرة v24.9 في السقف ونافذة المستخدم والقوالب (وضعُ الإنفاذ) — القديمةُ كما هي تحت *Legacy',
 'src/modules/admin/helmet.css': 'AUD-007: سطرُ CSS المضغوط (10 KB) مفصولٌ بين القواعد',
 'src/modules/admin/meta.json': 'AUD-007: prettified · minifiedSource', 'src/modules/modules.json': 'AUD-007: الإعدادات minifiedSource',
 'src/modules/plan/logic.js': 'AUD-007/AUD-012: شعارُ الطباعة → @@KIVO_INLINE:img/haramain-print.png@@', 'src/modules/employees/logic.js': 'AUD-007/AUD-012: شعارُ الطباعة → @@KIVO_INLINE@@',
 'src/modules/daily/logic.js': 'AUD-007/AUD-012: شعارُ الطباعة → @@KIVO_INLINE@@', 'src/pages/Admin.dc.html': 'مولَّدةٌ من admin/{helmet,view,logic}',
 'tools/page_modules.py': 'inline_assets: @@KIVO_INLINE:<img|fonts>/<ملف>@@ يُضمَّن data: عند التركيب قبل الضغط',
}
fps = {}
for name in CODE:
    if name in ('workers/_worker.js', 'src/core/270-bs-ver.js'): continue
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
if FREEZE:
    if not prev: raise SystemExit('✘ لا تجميدَ بلا مرجع ' + TAG)
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k256diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملف (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في k256diff.json', json.dumps({'changed-since-review': bad[:5], 'unknown': [n for n in rec if n not in fps][:3]}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب')

print('\n╔═ (و) المشتقّاتُ والفهرسُ والإصدارُ والسقّاطاتُ والعقد ═╗')
chk = subprocess.run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'], cwd=ROOT, capture_output=True, text=True)
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات (20) = مصادرها (generate --check) — ومنها _worker.js والصفحاتُ بعد تضمين الأصل')
ic = subprocess.run([sys.executable, 'tools/icons.py', 'check', '--src', 'src'], cwd=ROOT, capture_output=True, text=True)
ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
ok("var WORKER_VER = '2026.10.10-156';" in W and "var ENF_VER = 'KIVO_256 · enforce 2" in W, '   الخادم 2026.10.10-156 · ENF_VER KIVO_256')
ec = subprocess.run([sys.executable, 'scripts/empty_catch_ratchet.py', 'src'], cwd=ROOT, capture_output=True, text=True)
ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
ev = subprocess.run([sys.executable, 'scripts/env_check.py', 'src'], cwd=ROOT, capture_output=True, text=True)
ok(ev.returncode == 0 and 'wrangler.toml متّسق' in ev.stdout, '   مخطّطُ البيئة = العامل · wrangler.toml متّسق بلا أسرار', ev.stdout.strip()[:160])
CT = json.load(open(ROOT + '/src/api/contracts.json', encoding='utf-8'))
exact = sorted(set(re.findall(r"path === '(/api/[a-z0-9/_-]+)'", W))); pref = sorted(set(re.findall(r"path\.indexOf\('(/api/[a-z0-9_-]+/)'\)", W)))
ok(sorted(r['path'] for r in CT['routes']) == sorted(exact + pref), '★ src/api/contracts.json = مساراتُ العامل حرفاً (' + str(len(CT['routes'])) + ')')
if os.path.isdir(DIR):
    bj = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else None
    ok(bj is not None and bj['files']['_worker.js']['sha256'] == sha(open(ROOT + '/workers/_worker.js', 'rb').read()), '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js (الحزمةُ مبنيّةٌ من هذا المصدر)')
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
