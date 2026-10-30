# -*- coding: utf-8 -*-
"""KIVO_262 · تشغيلُ شجرة v24.9 فعلياً (سقفُ النطاق من الواجهة — SOT-014/015/188) · تنظيفٌ معماريّ (دوالُّ ميتة) · حارسُ بصمة كلمة المرور ·
   اختباراتُ «سجل الشهر» مستقلةٌ عن التاريخ · CI يتبع الإصدار — إثباتُ الفرق بالضبط عن KIVO_261 (الوسم git؛ KIVO_PREV_TAG يبدّله).
   (أ) الشجرة = الوسم عدا المعلن: اليدويةُ (CODE · ببصمة فرقٍ مراجَعة في k262diff.json) · المولَّدةُ (GEN) · الجديدةُ (NEW)
   (ب) ثوابتُ 261 كما هي: الإضافات · الوحداتُ المرجعية v24.9 بايتاً · شجرةُ v24.9 = الاشتقاق · طبقتا الرموز بلا رمزٍ جديد · قواعدُ الاعتماد · AUD-016
   (ج) 262 نفسُه ساكناً (السلوكُ تثبته tests/unit/{ph_downgrade,scope_ids,ci_release} وcfbench/k262scope — هذا الفحصُ للشكل وحده)
   (د) المشتقّات · الإصدار 162/262 · السقّاطات · البيئة · العقد = مساراتُ العامل · الحزمةُ من هذا المصدر · SOT v6
       python3 tests/source/k262src.py [pk262] [--freeze]"""
import os, sys, hashlib, subprocess, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk262'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_261')
FREEZE = '--freeze' in sys.argv
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
run = lambda cmd: subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')

print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا المعلن ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   المرجعُ ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q and os.path.exists(os.path.join(ROOT, q))}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
CODE = sorted(['src/core/270-bs-ver.js', 'workers/parts/002-seclog.js', 'workers/parts/056-enforce.js',                    # الإصدار
               'src/modules/admin/logic.js', 'src/modules/admin/view.html', 'src/assets/icons/catalog.json',               # سقفُ النطاق ونطاقُ الموظفين
               'workers/parts/018-ancestry.js', 'workers/parts/059-protected-ops-2.js', 'src/api/280-server-storage.js',  # حارسُ بصمة كلمة المرور
               'workers/parts/021-authz-core-intro.js', 'workers/parts/057-enf-index.js', 'workers/parts/061-enf-read.js', # دوالُّ ميتة
               'tools/sec/audit.py', 'config/wrangler.toml', 'tools/onboard_check.sh'])                                   # الافتراضيُّ 262
GEN = sorted(['workers/_worker.js', 'src/pages/Admin.dc.html'])
NEW = ['tools/release_n.sh']
want = sorted(set(CODE + GEN + NEW))
ok(diff == want and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = المعلنة فقط (' + str(len(CODE)) + ' يدوياً · ' + str(len(GEN)) + ' بالأدوات · ' + str(len(NEW)) + ' جديدة)',
   json.dumps({'extra': [k for k in diff if k not in want], 'missing': [k for k in want if k not in diff], 'untracked': untracked}, ensure_ascii=False))
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'KIVO.__BS_VER = "2026.10.12-262";', '   الإصدار 2026.10.12-262')
refp = ['workers/parts/' + f for f in sorted(os.listdir(ROOT + '/workers/parts')) if re.match(r'0(0[4-9]|1[0-6])-', f)]
ok(refp and all(prev.get(f) == cur.get(f) for f in refp), '★ الوحداتُ المرجعية v24.9 (' + str(len(refp)) + ' جزءاً) = الوسم بايتاً — المحرّكُ والسجلُّ لم يُمسّا', [f for f in refp if prev.get(f) != cur.get(f)])
perm = sorted(k for k in diff if k.startswith(('src/permissions/', 'src/plugins/', 'src/manifests/', 'src/styles/', 'migrations/', 'src/schemas/')))
ok(perm == [], '★ لا تغييرَ في الصلاحيات (السجلّ · الشجرة · البيانات الوصفية) ولا الإضافات ولا الأنماط ولا الترحيلات — سقفُ النطاق واجهةٌ على نموذج الخادم القائم', perm)

print('\n╔═ (ب) ثوابتُ 261 كما هي ═╗')
pc = run([sys.executable, 'tools/plugins.py', 'check'])
ok(pc.returncode == 0 and '6 عدسة' in pc.stdout, '★ tools/plugins.py check (AUD-030)', pc.stdout.strip().split('\n')[-1][:200])
pt = run([sys.executable, 'tools/perm_tree.py', 'check'])
ok(pt.returncode == 0, '★ شجرةُ v24.9 = الاشتقاق (perm-tree24.json)', pt.stdout.strip()[-140:])
tc = run([sys.executable, 'tools/tokens.py', 'check', 'src'])
ok(tc.returncode == 0, '   tools/tokens.py check (AUD-017)', tc.stdout.strip()[:160])
tv = run([sys.executable, 'tools/tokens.py', 'verify', 'src', 'git:' + TAG])
ok(tv.returncode == 0 and ' 0 فرق منها 0 ' in tv.stdout and 'داكن: 0 منها 0' in tv.stdout, '★ tokens verify مقابل ' + TAG + ': 0 فرقٍ محسوب (لا رمزَ لونٍ جديداً — التبويبُ برموز السمة القائمة)', tv.stdout.split('\n')[0][:220])
dc = run([sys.executable, 'tools/deps_check.py'])
ok(dc.returncode == 0, '   tools/deps_check.py: 0 مخالفة (SOT-091)', dc.stdout.strip().split('\n')[-1][:160])
ns = run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--check'])
ok(ns.returncode == 0, '★ kivo_ns --check (AUD-016)', ns.stdout.strip().split('\n')[-1][:160])

print('\n╔═ (ج) KIVO_262 ساكناً ═╗')
AL = rd(ROOT + '/src/modules/admin/logic.js'); AV = rd(ROOT + '/src/modules/admin/view.html')
ok(all(x in AL for x in ('  scIdOf(kind, e) {', '  scopeVals(d, isNode, tab) {', '  scSave(d, draft, empDraft) {', '  scEmpVals(d, rec, plan, canEdit) {', '  scMgrVals() {'))
   and 'l = "cap" === e.sysTab ? "cap" : "scope" === e.sysTab ? "scope" : "emps",' in AL and '...this.scopeVals(o, n, l),' in AL and '...("dept" === i && "ptpls" === h ? this.scMgrVals() : {}),' in AL,
   '★ سقفُ النطاق: النموذجُ والحفظُ ونطاقُ الموظفين في وحدة الإدارة — تبويبٌ ثالث لمدير النظام ولوحةٌ لمدير الإدارة في «قوالب الصلاحيات»')
ok('const on = !isNode && this.t24On() && !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper());' in AL and 'P.key("perm.assign", d)' in AL,
   '★ التبويبُ في وضع الإنفاذ لمدير النظام وحده · نطاقُ الموظفين يعدّله حاملُ perm.assign — والخادمُ حَكَمٌ في الحالين (enfScopeWrite)')
ok(AV.count('data-bs="tab-scope"') == 1 and AV.count('data-bs="scope-tab"') == 1 and AV.count('data-bs="scope-mgr"') == 1 and 'سقفُ النطاق غيرُ سقف الصفحات.' in AV,
   '★ الواجهة: زرُّ التبويب · محتواه (يفصل النطاقَ عن الصفحات صراحةً) · لوحةُ مدير الإدارة')
ok('"bsdept:" + d + ":bassam_scope_v1"' in AL and 'src: "manual", by: u.id || "", byName: u.name || "", at: now' in AL,
   '   الحفظُ في سجلّ النطاق المنفصل (bsdept:<d>:bassam_scope_v1) مع المصدر والفاعل والوقت — لا في bassam_perms_v1')
A18 = rd(ROOT + '/workers/parts/018-ancestry.js'); P59 = rd(ROOT + '/workers/parts/059-protected-ops-2.js')
ok('var PH_NEW_RX = /^p2\\$(\\d{4,7})\\$[0-9a-f]{32}\\$[0-9a-f]{64}$/;' in A18 and 'function phNewOk(a, b) {' in A18
   and "if (!phNewOk(a, b)) return { ok: false, why: 'ph' };" in A18 and 'userRecOk(b) && phNewOk(a, b)) continue;' in A18
   and "if (!phNewOk(a, b)) return enfNo('ph');" in P59 and '(sup || (userRecOk(b) && phNewOk(a, b)))' in P59,
   '★ حارسُ البصمة: غيرُ مدير النظام لا يكتب بصمةً جديدة إلا p2$ بالتكرارات المضبوطة — في المسارين (القديم والإنفاذ)')
ok(all(('function ' + f + '(') not in rd(ROOT + '/workers/parts/' + p) for f, p in (('enfMergeStr', '061-enf-read.js'), ('enfHeldList', '057-enf-index.js'), ('empPagePermsOf', '021-authz-core-intro.js'))),
   '★ الدوالُّ الميتة الثلاث محذوفة (enfMergeStr ← enfMergeChk · enfHeldList ← البتماب · empPagePermsOf بلا مستدعٍ)')
S280 = rd(ROOT + '/src/api/280-server-storage.js')
ok(S280.count('ph: "كلمةُ المرور لم تُحفظ: صيغةُ تشفيرها قديمة — حدّث الصفحة ثم أعد المحاولة"') == 2, '   الواجهة: سببُ الرفض ph برسالةٍ عربية (الوضعان)')
CI = rd(ROOT + '/.github/workflows/ci.yml')
ok('tools/release_n.sh' in CI and not re.search(r'\bpk2\d\d\b|gateall2\d\d|build_chain\.sh\s+2\d\d', CI), '★ CI يقرأ رقمَ الإصدار من المصدر (tools/release_n.sh) — لا رقمَ مثبّت')
ok(run(['bash', 'tools/release_n.sh']).stdout.strip() == '262', '   tools/release_n.sh = 262')

print('\n╔═ بصماتُ الفروق المراجَعة ═╗')
FP = ROOT + '/tests/source/k262diff.json'
REASONS = {
 'workers/parts/002-seclog.js': 'الإصدار 2026.10.12-162', 'workers/parts/056-enforce.js': 'ENF_VER KIVO_262 (· ph-new)',
 'src/modules/admin/logic.js': 'KIVO_262 (SOT-014/015/188): سقفُ النطاق — scIdOf (= KIVO_SCOPE.ID) · scPlan · scRec · scopeVals · scSave · scEmpVals · scMgrVals · tabScopeStyle · sysTab "scope"',
 'src/modules/admin/view.html': 'KIVO_262: زرُّ «سقف النطاق» · محتوى التبويب (البعدان · المصدر · الحفظ · نطاقُ موظفي الإدارة) · لوحةُ مدير الإدارة في «قوالب الصلاحيات» — برموز السمة القائمة',
 'src/assets/icons/catalog.json': 'KIVO_262: عددُ مواضع أربع أيقوناتٍ قائمة +1 (tools/icons.py extract) — لا أيقونةَ جديدة',
 'workers/parts/018-ancestry.js': 'KIVO_262 (تصليب · المراجعة المعمارية): PH_NEW_RX · phNewOk — في usersRule (الذات والمدير)',
 'workers/parts/059-protected-ops-2.js': 'KIVO_262: phNewOk في enfUsersWrite (الذات والمدير)',
 'src/api/280-server-storage.js': 'KIVO_262: رسالةُ سبب الرفض ph بالعربية (الوضعان)',
 'workers/parts/021-authz-core-intro.js': 'KIVO_262 (المراجعة المعمارية): حذفُ empPagePermsOf — بلا مستدعٍ',
 'workers/parts/057-enf-index.js': 'KIVO_262 (المراجعة المعمارية): حذفُ enfHeldList — حلّ محلَّها البتماب في 063',
 'workers/parts/061-enf-read.js': 'KIVO_262 (المراجعة المعمارية): حذفُ enfMergeStr — حلّ محلَّها enfMergeChk',
 'tools/sec/audit.py': 'الافتراضيُّ pk262 (كان pk261)', 'config/wrangler.toml': 'مجلدُ البناء pk262 (كان pk261)', 'tools/onboard_check.sh': 'الافتراضيُّ 262 (كان 261)',
}
fps = {}
for name in CODE:
    if name == 'src/core/270-bs-ver.js': continue
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
if FREEZE:
    if not prev: raise SystemExit('✘ لا تجميدَ بلا مرجع ' + TAG)
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k262diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملفٍّ يدوي (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في k262diff.json', json.dumps({'changed-since-review': bad}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب', [n for n in fps if not fps[n]['why']])

print('\n╔═ (د) المشتقّاتُ والإصدارُ والسقّاطاتُ والعقدُ ═╗')
W = rd(ROOT + '/workers/_worker.js')
chk = run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'])
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات = مصادرها (generate --check)')
ty = run(['node', 'tools/gen_types.mjs', '--check']); ok(ty.returncode == 0, '   src/types/kivo.d.ts = التوليد', ty.stdout.strip()[:120])
ic = run([sys.executable, 'tools/icons.py', 'check', '--src', 'src']); ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
ok("var WORKER_VER = '2026.10.12-162';" in W and "var ENF_VER = 'KIVO_262 · enforce 2" in W, '   الخادم 2026.10.12-162 · ENF_VER KIVO_262')
ec = run([sys.executable, 'tools/empty_catch_ratchet.py', 'src']); ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
cr = run([sys.executable, 'tools/color_ratchet.py', 'src']); ok(cr.returncode == 0, '   لا لونَ خاماً جديداً (السقّاطة)', (cr.stdout or cr.stderr).strip().split('\n')[0][:120])
ev = run([sys.executable, 'tools/env_check.py', 'src']); ok(ev.returncode == 0 and 'wrangler.toml متّسق' in ev.stdout, '   مخطّطُ البيئة = العامل · wrangler.toml متّسق بلا أسرار', ev.stdout.strip()[-160:])
CT = json.load(open(ROOT + '/src/api/contracts.json', encoding='utf-8'))
exact = sorted(set(re.findall(r"path === '(/api/[a-z0-9/_-]+)'", W))); pref = sorted(set(re.findall(r"path\.indexOf\('(/api/[a-z0-9_-]+/)'\)", W)))
ok(sorted(r['path'] for r in CT['routes']) == sorted(exact + pref), '★ src/api/contracts.json = مساراتُ العامل حرفاً (' + str(len(CT['routes'])) + ') — لا مسارَ جديد')
if os.path.isdir(DIR):
    bj = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else None
    ok(bj is not None and bj['files']['_worker.js']['sha256'] == sha(open(ROOT + '/workers/_worker.js', 'rb').read()), '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js (الحزمةُ مبنيّةٌ من هذا المصدر)')
    ok(bj is not None and sorted(bj.get('retained', [])) == ['pk260', 'pk261'], '   نافذةُ الإصدارين: pk261 وpk260 (آخرُ إصدارين منشورَين على Preview)', bj and bj.get('retained'))
_doc = os.path.join(ROOT, 'docs/reference/v24_9_FINAL.html')
ok(os.path.exists(_doc) and sha(open(_doc, 'rb').read()) == '6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde', '   وثيقةُ v24.9 = المرجعُ بايتاً (SHA-256 6e9aba63…)')
sv = run([sys.executable, 'tools/sot_verify.py'])
ok(sv.returncode == 0, '★ SOT v6 متّسق (tools/sot_verify.py)', sv.stdout.strip().split('\n')[-1][:200])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
