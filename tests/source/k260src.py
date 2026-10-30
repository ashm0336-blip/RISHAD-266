# -*- coding: utf-8 -*-
"""KIVO_260 · قفلُ الدخول تحت التزامن «مؤقّت» (scorecard_final §٤ بند 10) · صيغةُ الثواني بالعدد والمعدود (R183 · بند 12) · عُدّةُ الأدلة
   (test_catalog · audit · trace · sot recount · release_check · metrics A4 · hotfix242 --sr1) — إثباتُ الفرق بالضبط عن KIVO_259
   (الوسم git؛ KIVO_PREV_TAG يبدّله). الوسمُ والشجرةُ كلاهما بالوصول KIVO.X (AUD-016) فالفرقُ نصّيٌّ مباشر.
   (أ) الشجرة = الوسم عدا المعلن: اليدويةُ (CODE · ببصمة فرقٍ مراجَعة في k260diff.json) · المولَّدةُ بالأدوات (GEN) — ولا ملفَّ كودٍ جديداً ولا غيرَ متتبَّع.
   (ب) ثوابتُ 259 كما هي: الإضافات (AUD-030) · الوحداتُ المرجعية v24.9 بايتاً · شجرةُ v24.9 = الاشتقاق · طبقتا الرموز (AUD-017) بلا فرق ·
       قواعدُ الاعتماد (SOT-091) · AUD-016 (kivo_ns --check · الملفاتُ المحرَّرة بعد التحويل معلنةٌ في after).
   (ج) 260 نفسُه ساكناً: قفلُ الحجز مؤقّتٌ (LOCK_PROV_MS) والقفلُ الكامل المتضاعف عند الإخفاق المؤكَّد وحده — ذرّياً (MAX · RETURNING) ·
       ردّا القفل يحملان wait · secAr في الخادم وKIVO.BassamCount «ثانية» في الواجهة · لا «N ثانية» حرفيّاً بعد رقم.
       (السلوكُ نفسُه يثبته tests/unit/login_burst.test.mjs على العامل المبني — هذا الفحصُ للشكل وحده.)
   (د) المشتقّات · الإصدار 160/260 · السقّاطات · البيئة · العقد = مساراتُ العامل · الحزمةُ من هذا المصدر · البنيةُ الرسمية · SOT v6.
       python3 tests/source/k260src.py [pk260] [--freeze]"""
import os, sys, hashlib, subprocess, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk260'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_259')
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
               'workers/parts/054-image-contract.js', 'workers/parts/063-enf-api-and-handler.js',                         # قفلُ الدخول المؤقّت · secAr · wait
               'src/services/440-count.js', 'src/auth/330-auth.js', 'src/auth/335-identity-gate.js', 'src/api/280-server-storage.js',   # صيغةُ الثواني (R183)
               'src/observability/events.json',                                                                          # A4 بلا /api/changes
               'tools/test_catalog.py', 'tools/sec/audit.py', 'tools/trace.py', 'tools/sot.py', 'tools/release_check.py',  # عُدّةُ الأدلة
               'tools/obs/metrics_report.py', 'tools/hotfix242.py',
               'tools/kivo_ns.json', 'config/wrangler.toml', 'tools/onboard_check.sh'])
GEN = sorted(['workers/_worker.js'])
NEW = []
want = sorted(set(CODE + GEN + NEW))
ok(diff == want and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = المعلنة فقط (' + str(len(CODE)) + ' يدوياً · ' + str(len(GEN)) + ' بالأدوات · ' + str(len(NEW)) + ' جديدة) · لا غيرَ متتبَّع',
   json.dumps({'extra': [k for k in diff if k not in want], 'missing': [k for k in want if k not in diff], 'untracked': untracked}, ensure_ascii=False))
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'KIVO.__BS_VER = "2026.10.11-260";', '   الإصدار 2026.10.11-260')
pages_changed = [k for k in cur if k.startswith('src/pages/') and prev.get(k) != cur.get(k)]
ok(not pages_changed, '   الصفحاتُ المولَّدة (src/pages) = الوسم بايتاً (لا وحدةَ صفحةٍ معدَّلة في 260)', pages_changed)
refp = ['workers/parts/' + f for f in sorted(os.listdir(ROOT + '/workers/parts')) if re.match(r'0(0[4-9]|1[0-6])-', f)]
ok(refp and all(prev.get(f) == cur.get(f) for f in refp), '★ الوحداتُ المرجعية v24.9 (' + str(len(refp)) + ' جزءاً) = الوسم بايتاً', [f for f in refp if prev.get(f) != cur.get(f)])
perm = [k for k in diff if k.startswith(('src/permissions/', 'src/plugins/', 'src/manifests/', 'src/styles/', 'migrations/'))]
ok(not perm, '★ لا تغييرَ في الصلاحيات والإضافات والبيانات الوصفية والأنماط والترحيلات (شجرةُ الصلاحيات وسقفُ صفحات الإدارة كما في 259)', perm)

print('\n╔═ (ب) ثوابتُ 259 كما هي ═╗')
pc = run([sys.executable, 'tools/plugins.py', 'check'])
ok(pc.returncode == 0 and '6 عدسة' in pc.stdout, '★ tools/plugins.py check (AUD-030)', pc.stdout.strip().split('\n')[-1][:200])
sys.path.insert(0, os.path.join(ROOT, 'tools')); import plugins as PL
W = rd(ROOT + '/workers/_worker.js'); m = re.search(r'var KIVO_LENS_PLUGINS = (\{.*?\});\n', W)
ok(m is not None and json.loads(m.group(1)) == PL.table(os.path.join(ROOT, 'src')) and W.count('var KIVO_LENS_PLUGINS = ') == 1, '   KIVO_LENS_PLUGINS في العامل = جدولُ الإضافات (مرّةً واحدة)')
pt = run([sys.executable, 'tools/perm_tree.py', 'check'])
ok(pt.returncode == 0, '★ شجرةُ v24.9 = الاشتقاق', pt.stdout.strip()[-120:])
tc = run([sys.executable, 'tools/tokens.py', 'check', 'src'])
ok(tc.returncode == 0, '   tools/tokens.py check (AUD-017)', tc.stdout.strip()[:160])
tv = run([sys.executable, 'tools/tokens.py', 'verify', 'src', 'git:' + TAG])
ok(tv.returncode == 0 and ' 0 فرق منها 0 ' in tv.stdout and 'داكن: 0 منها 0' in tv.stdout, '★ tokens verify مقابل ' + TAG + ': 0 فرقٍ محسوب (لا رمزَ جديداً في 260)', tv.stdout.split('\n')[0][:220])
dc = run([sys.executable, 'tools/deps_check.py'])
ok(dc.returncode == 0, '   tools/deps_check.py: 0 مخالفة (SOT-091)', dc.stdout.strip().split('\n')[-1][:160])
ns = run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--check'])
ok(ns.returncode == 0, '★ kivo_ns --check (AUD-016 — 280 · 330 · 335 · 440 معلنةٌ في after)', ns.stdout.strip().split('\n')[-1][:160])
NSJ = json.load(open(ROOT + '/tools/kivo_ns.json', encoding='utf-8'))
ok(all(f in NSJ['after'] for f in ('src/api/280-server-storage.js', 'src/auth/330-auth.js', 'src/auth/335-identity-gate.js', 'src/services/440-count.js')), '   الملفاتُ الأربعة المحرَّرة في 260 معلنةٌ في kivo_ns.json after')

print('\n╔═ (ج) KIVO_260 ساكناً: قفلُ الدخول المؤقّت · صيغةُ الثواني ═╗')
P54 = rd(ROOT + '/workers/parts/054-image-contract.js'); P63 = rd(ROOT + '/workers/parts/063-enf-api-and-handler.js')
ok(P54.count('var LOCK_PROV_MS = 1500;') == 1 and W.count('var LOCK_PROV_MS = 1500;') == 1, '★ LOCK_PROV_MS = 1500 مرّةً واحدة (الجزءُ والعامل)')
gl = re.search(r'async function guardLeft\(env, gk\) \{[\s\S]*?\n\}', P54).group(0)
ok("WHEN guard.n + 1 >= ?3 THEN ?2 + ?4 ELSE guard.until END').bind(gk, now, LOCK_N, LOCK_PROV_MS)" in gl and 'LOCK_MS' not in gl and 'env.DB.batch(' in gl,
   '★ guardLeft: الحجزُ والزيادةُ في معاملةٍ واحدة · القفلُ عند بلوغ الحدّ مؤقّتٌ (LOCK_PROV_MS) لا كامل')
gf = re.search(r'async function guardFail\(env, gk\) \{[\s\S]*?\n\}', P54).group(0)
ok("UPDATE guard SET until = MAX(until, ?2 + MIN(?4, 5000 * (1 << MIN(30, MAX(0, n - ?3))))) WHERE gk = ?1 AND n >= ?3 RETURNING n').bind(gk, now, LOCK_N, LOCK_MS)" in gf and 'SELECT n FROM guard' not in gf,
   '★ guardFail: القفلُ الكامل المتضاعف (5 ث × 2^(n−lockN) حتى lockMin) من لحظة الإخفاق المؤكَّد · ذرّياً (MAX · RETURNING) · بعد الحدّ وحده')
sa = re.search(r'function secAr\(n\) \{[\s\S]*?\n\}', P54)
ok(sa is not None and "if (n === 1) return 'ثانية واحدة';" in sa.group(0) and "if (n === 2) return 'ثانيتين';" in sa.group(0) and "return n + (r >= 3 && r <= 10 ? ' ثوانٍ' : ' ثانية');" in sa.group(0) and W.count('function secAr(n) {') == 1,
   '★ secAr في الخادم: ١ «ثانية واحدة» · ٢ «ثانيتين» · ٣–١٠ «ثوانٍ» · غيرُها «ثانية» — بحسب آخر رقمين')
lockR = re.findall(r"return json\(\{ ok: 0, err: 'محاولات كثيرة — انتظر ' \+ secAr\((leftR|left) / 1000\), wait: Math\.ceil\(\1 / 1000\) \}\);", P63)
ok(sorted(lockR) == ['left', 'leftR'], '★ ردّا القفل (الدخول · مفتاحُ الاستعادة) بصيغة العدد ويحملان wait رقماً', lockR)
ok("err: 'طلباتٌ كثيرة من حسابك — أعد المحاولة بعد ' + secAr(sec), retry: sec }" in P54, '   429 (tooMany) بصيغة العدد · retry كما هو')
lit = [(f, m.group(0)) for f in ('workers/parts/054-image-contract.js', 'workers/parts/063-enf-api-and-handler.js') for m in re.finditer(r"\+ ?' ثانية'", rd(ROOT + '/' + f))]
ok(not lit, '   لا «+ \' ثانية\'» حرفيّاً بعد رقمٍ في الخادم', lit)
CNT = rd(ROOT + '/src/services/440-count.js')
ok('"ثانية": ["ثانية واحدة", "ثانيتان", "ثانيتين", "ثوانٍ", "ثانية", "ثانية"],' in CNT, '★ BassamCount: «ثانية» بصيغها الست (R183)')
A330 = rd(ROOT + '/src/auth/330-auth.js'); A335 = rd(ROOT + '/src/auth/335-identity-gate.js'); S280 = rd(ROOT + '/src/api/280-server-storage.js')
SW = "function secWord(n){ n = Math.max(1, Math.ceil(+n || 0)); var C = KIVO.BassamCount; if (C && C.forms && C.forms['ثانية']) return C(n, 'ثانية', 'g'); var r = n % 100; return n === 1 ? 'ثانية واحدة' : n === 2 ? 'ثانيتين' : n + (r >= 3 && r <= 10 ? ' ثوانٍ' : ' ثانية'); }"
ok(A330.count(SW) == 1 and A335.count(SW) == 1, '★ secWord في 330 و335 = KIVO.BassamCount إن حُمِّلت (البوابةُ قد تسبق 440) وإلا القاعدةُ نفسُها حرفاً')
ok("wait: (j && +j.wait > 0) ? +j.wait : 0" in A330 and "'محاولات كثيرة — انتظر ' + secWord(wS), wait: wS" in A330, '   330: wait من الخادم يُمرَّر · القفلُ المحلي بصيغة العدد')
ok("er.textContent = 'محاولات كثيرة — انتظر ' + secWord(left);" in A335 and 'var wS = (r && +r.wait > 0) ? +r.wait : 0;' in A335 and 'if (wS > 0) countdown(btn, wS);' in A335,
   '★ 335: العدُّ التنازلي من wait (والنصُّ احتياطاً بصيغه كلِّها) وبصيغة العدد')
ok('KIVO.BassamCount(sec, "ثانية", "g")' in S280, '   280: «إعادةٌ بعد …» بصيغة العدد')
front = [(f, m.group(0)) for f in ('src/auth/330-auth.js', 'src/auth/335-identity-gate.js', 'src/api/280-server-storage.js') for m in re.finditer(r"\+ ?['\"] ?ثانية['\"]", rd(ROOT + '/' + f))]
ok(not front, '   لا «+ \' ثانية\'» حرفيّاً بعد رقمٍ في الواجهة', front)

print('\n╔═ بصماتُ الفروق المراجَعة ═╗')
FP = ROOT + '/tests/source/k260diff.json'
REASONS = {
 'workers/parts/002-seclog.js': 'الإصدار 2026.10.11-160', 'workers/parts/056-enforce.js': 'ENF_VER KIVO_260',
 'workers/parts/054-image-contract.js': 'KIVO_260 (scorecard_final §٤ بند 10): قفلُ الحجز مؤقّت LOCK_PROV_MS (1.5 ث) والقفلُ الكامل المتضاعف يضعه guardFail عند الإخفاق المؤكَّد ذرّياً (MAX · RETURNING) — حدُّ الدفع المتزامن كما هو والسلوكُ المتتابع كما هو؛ مكتبٌ خلف عنوانٍ واحد لا يُعطَّل زرُّه 5 ث لدخولاتٍ صحيحة · (بند 12) secAr: الثواني بالعدد والمعدود (R183) · tooMany بها',
 'workers/parts/063-enf-api-and-handler.js': 'KIVO_260: ردّا القفل (الدخول · مفتاحُ الاستعادة) بـsecAr ويحملان wait (الثواني رقماً — عدّادُ الواجهة يقرؤه بدل تحليل النص)',
 'src/services/440-count.js': 'KIVO_260: «ثانية» في BassamCount بصيغها الست (R183)',
 'src/auth/330-auth.js': 'KIVO_260: secWord (KIVO.BassamCount وإلا القاعدةُ نفسُها) · wait من الخادم يُمرَّر · القفلُ المحلي بصيغة العدد',
 'src/auth/335-identity-gate.js': 'KIVO_260: العدُّ التنازلي بصيغة العدد · يقرأ wait رقماً (والنصُّ احتياطاً: «ثانية واحدة» · «ثانيتين» · «N ثوانٍ» · «N ثانية»)',
 'src/api/280-server-storage.js': 'KIVO_260: «طلباتٌ كثيرة — إعادةٌ بعد …» بصيغة العدد (KIVO.BassamCount)',
 'src/observability/events.json': 'KIVO_260 (scorecard_final): وصفُ A4 — الكمونُ p95 بلا /api/changes (انتظارٌ طويلٌ بالتصميم حتى 25 ث)',
 'tools/test_catalog.py': 'KIVO_260 (scorecard_final): الأعدادُ من أحدث جولةٍ وأجزائها (runK + b/c) بالصيغتين · حالةُ P0 من SOT JSON',
 'tools/sec/audit.py': 'KIVO_260: يقرأ الصيغتين «نجح N | أخفق M» و«N نجاح · M إخفاق» · الافتراضيُّ pk260',
 'tools/trace.py': 'KIVO_260: أدلةُ بنود التدقيق المنجزة تُعرض (k243/evidence → docs/evidence/k243 في المستودع الرسمي) · docs/evidence تُعدّ تقارير',
 'tools/sot.py': 'KIVO_260 (scorecard_final): recount — أعدادُ META تُحسب من البنود عند كل حفظ (لقطةُ الإنشاء تُحفظ مرّةً في counts_v6_creation) — كانت p0_open/security_open ثابتةً منذ الإنشاء',
 'tools/release_check.py': 'KIVO_260: سجلُّ الفحص يُحفظ تلقائياً reports/k<N>/release_check_<N>.txt (كان يُكتب يدوياً)',
 'tools/obs/metrics_report.py': 'KIVO_260 (scorecard_final): p95 بلا /api/changes (LONGPOLL) · latency_excl_longpoll',
 'tools/hotfix242.py': 'KIVO_260: --sr1 — رقعةُ 242 تحمل SR-1 مع AUD-033 (usersNoOut/usersNoIn في curSafe و/api/get والإقلاع والحفظ) · KIVO_242_HOTFIX_AUD033_SR1',
 'tools/kivo_ns.json': 'AUD-016: after += 280 · 330 · 335 · 440 (260: صيغةُ الثواني) — والملاحظة',
 'config/wrangler.toml': 'مجلدُ البناء pk260 (كان pk259)',
 'tools/onboard_check.sh': 'الافتراضيُّ 260 (كان 259)',
}
fps = {}
for name in CODE:
    if name == 'src/core/270-bs-ver.js': continue
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
if FREEZE:
    if not prev: raise SystemExit('✘ لا تجميدَ بلا مرجع ' + TAG)
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k260diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملفٍّ يدوي (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في k260diff.json', json.dumps({'changed-since-review': bad[:5]}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب', [n for n in fps if not fps[n]['why']])

print('\n╔═ (د) المشتقّاتُ والإصدارُ والسقّاطاتُ والعقدُ والبنيةُ الرسمية ═╗')
chk = run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'])
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات = مصادرها (generate --check · ومعه المخطّطات والإضافات)')
ty = run(['node', 'tools/gen_types.mjs', '--check']); ok(ty.returncode == 0, '   src/types/kivo.d.ts = التوليد', ty.stdout.strip()[:120])
ic = run([sys.executable, 'tools/icons.py', 'check', '--src', 'src']); ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
ok("var WORKER_VER = '2026.10.11-160';" in W and "var ENF_VER = 'KIVO_260 · enforce 2" in W, '   الخادم 2026.10.11-160 · ENF_VER KIVO_260')
ec = run([sys.executable, 'tools/empty_catch_ratchet.py', 'src']); ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
cr = run([sys.executable, 'tools/color_ratchet.py', 'src']); ok(cr.returncode == 0, '   لا لونَ خاماً جديداً (السقّاطة)', (cr.stdout or cr.stderr).strip().split('\n')[0][:120])
ev = run([sys.executable, 'tools/env_check.py', 'src']); ok(ev.returncode == 0 and 'wrangler.toml متّسق' in ev.stdout, '   مخطّطُ البيئة = العامل · wrangler.toml متّسق بلا أسرار', ev.stdout.strip()[:160])
CT = json.load(open(ROOT + '/src/api/contracts.json', encoding='utf-8'))
exact = sorted(set(re.findall(r"path === '(/api/[a-z0-9/_-]+)'", W))); pref = sorted(set(re.findall(r"path\.indexOf\('(/api/[a-z0-9_-]+/)'\)", W)))
ok(sorted(r['path'] for r in CT['routes']) == sorted(exact + pref), '★ src/api/contracts.json = مساراتُ العامل حرفاً (' + str(len(CT['routes'])) + ') — لا مسارَ جديد')
if os.path.isdir(DIR):
    bj = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else None
    ok(bj is not None and bj['files']['_worker.js']['sha256'] == sha(open(ROOT + '/workers/_worker.js', 'rb').read()), '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js (الحزمةُ مبنيّةٌ من هذا المصدر)')
    ok(bj is not None and sorted(bj.get('retained', [])) == ['pk255', 'pk259'], '   نافذةُ الإصدارين: pk259 وpk255 (آخرُ إصدارين منشورَين على Preview)', bj and bj.get('retained'))
rs = run([sys.executable, 'tools/restructure_official.py'])
ok(rs.returncode == 0 and 'مدخلاتُ الجذر الرسمية: 15 ' in rs.stdout, '★ tools/restructure_official.py: مدخلاتُ الجذر الرسمية 15 · لا مرجعَ قديماً', rs.stdout.strip()[-200:])
_doc = os.path.join(ROOT, 'docs/reference/v24_9_FINAL.html')
ok(os.path.exists(_doc) and sha(open(_doc, 'rb').read()) == '6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde', '   وثيقةُ v24.9 = المرجعُ بايتاً (SHA-256 6e9aba63…)')
sv = run([sys.executable, 'tools/sot_verify.py'])
ok(sv.returncode == 0, '★ SOT v6 متّسق (tools/sot_verify.py)', sv.stdout.strip().split('\n')[-1][:200])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
