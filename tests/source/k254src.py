# -*- coding: utf-8 -*-
"""KIVO_254 · RM-3 المعتمدة (البنود ١–٤ و٦ و٧) + AUD-020 (لوحةُ المفاتيح · العناوين · المعالم) + AUD-033 (ج) — إثباتُ الفرق بالضبط عن KIVO_253 (الوسم git).
   (أ) الشجرةُ المتتبَّعة = KIVO_253 بايتاً عدا الملفاتِ المعلنة (CODE) + ملفاتٍ جديدةٍ معلنة (NEW_OK)؛ لا ملفَّ كودٍ غيرَ متتبَّع.
   (ب) الخادم: عكسُ لُصَق AUD-033 (ج) في 052/054/063 والإصدار في 002/056 يعيد أجزاءَ 253 حرفاً؛ و_worker.js = ضمُّ الأجزاء (generate --check).
   (ج) الرموز: كلُّ فرقٍ في القيم المحسوبة (فاتح/داكن) عن رموز KIVO_253 معلنٌ في changes-254.json، ولا فرقَ في رمزٍ غيرِ نصّي (bg-/bd-) — tokens.py verify.
   (د) بقيةُ الملفات: بصمةُ فرق كلّ ملف (sha256 لناتج git diff عن الوسم) = المسجَّلةُ في k254diff.json بعد المراجعة (أيُّ تعديلٍ لاحق غيرِ مراجَع يُسقطها)
       — وسببُ كلّ ملف مكتوب؛ --freeze يعيد تسجيلَ البصمات (يُستعمل عمداً بعد مراجعةٍ جديدة).
   (هـ) المشتقّات = مصادرها (generate --check) · الفهرسُ متّسق · الإصدار 154/254 · لا catch فارغاً جديداً في الخادم.
       python3 tests/source/k254src.py [pk254] [--freeze]"""
import os, sys, hashlib, subprocess, tempfile, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.abspath(os.path.join(ROOT, [a for a in sys.argv[1:] if not a.startswith('--')][0] if [a for a in sys.argv[1:] if not a.startswith('--')] else 'pk254'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_253')
FREEZE = '--freeze' in sys.argv
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')
print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا الملفات المعلنة ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   الوسمُ المرجعي ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
VIEWS = sorted('src/modules/%s/view.html' % m for m in ['admin', 'daily', 'dreport', 'dstats', 'irshad', 'seized'])
LOGIC = sorted('src/modules/%s/logic.js' % m for m in ['admin', 'daily', 'dreport', 'dstats', 'employees', 'irshad', 'plan', 'seized', 'staff', 'tasks'])
PAGES = sorted('src/pages/' + p + '.dc.html' for p in ['Admin', 'Daily Report', 'Daily Sessions', 'Daily Stats', 'Employees', 'Irshad', 'Operational Plan', 'Seized', 'Staffing', 'Tasks'])
CODE = sorted(['src/core/270-bs-ver.js', 'workers/_worker.js', 'workers/parts/002-seclog.js', 'workers/parts/056-enforce.js', 'workers/parts/052-aud-events.js', 'workers/parts/054-image-contract.js', 'workers/parts/063-enf-api-and-handler.js',
               'src/auth/330-auth-perm.js', 'src/components/240-bassam-link.js', 'src/components/660-a11y-enhancer.js', 'src/core/030-pages-loader.lazy-guard.js', 'src/layouts/260-bassam-plat.js', 'src/api/280-server-storage.js',
               'src/layouts/helmet-global.css', 'src/layouts/index.template.html', 'src/layouts/root-logic.js', 'src/styles/070-theme-tokens.css', 'src/styles/080-theme-dark.css', 'src/styles/tokens/tokens.json', 'tools/tokens.py'] + VIEWS + LOGIC + PAGES)
NEW_OK = ('src/styles/tokens/changes-254.json', 'tools/hotfix242.py')
diff = [k for k in diff if k not in NEW_OK]; untracked = [k for k in untracked if k not in NEW_OK]
ok(diff == CODE and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = الـ' + str(len(CODE)) + ' المعلنة فقط · لا ملفَّ كودٍ غيرَ متتبَّع',
   json.dumps({'extra': [k for k in diff if k not in CODE], 'missing': [k for k in CODE if k not in diff], 'untracked': untracked}, ensure_ascii=False))
ok(all(k in cur for k in NEW_OK), '   الملفّان الجديدان متتبَّعان', NEW_OK)
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'window.__BS_VER = "2026.10.10-254";', '   الإصدار 2026.10.10-254')

print('\n╔═ (ب) الخادم: عكسُ لُصَق AUD-033 (ج) والإصدار يعيد أجزاءَ ' + TAG + ' حرفاً ═╗')
def at_tag(path): return subprocess.run(['git', 'show', TAG + ':' + path], capture_output=True, cwd=ROOT).stdout.decode('utf-8')
HUNKS = {
 'workers/parts/052-aud-events.js': [("  return new Response(redactPh(JSON.stringify(o), 'json'), { status: status || 200, headers: h });   /* KIVO_254 · AUD-033 (ج): لا بصمةَ تغادر في أيّ استجابة JSON */\n", "  return new Response(JSON.stringify(o), { status: status || 200, headers: h });\n")],
 'workers/parts/063-enf-api-and-handler.js': [("    var bootJs = redactPh(JSON.stringify(boot), 'boot').replace(/</g, '\\\\u003c')", "    var bootJs = JSON.stringify(boot).replace(/</g, '\\\\u003c')")],
 'workers/parts/002-seclog.js': [("var WORKER_VER = '2026.10.10-154';", "var WORKER_VER = '2026.10.10-153';")],
 'workers/parts/056-enforce.js': [("var ENF_VER = 'KIVO_254 · enforce 2", "var ENF_VER = 'KIVO_253 · enforce 2")],
}
for name, reps in HUNKS.items():
    t = rd(ROOT + '/' + name); n = 0
    for new, old in reps:
        c = t.count(new); n += c; t = t.replace(new, old)
    ok(n == len(reps) and t == at_tag(name), '   ' + name + ': عكسُ ' + str(len(reps)) + ' لُصقة = ' + TAG + ' حرفاً', 'مواضع ' + str(n))
# 054: stripPh · redactPh (كتلةٌ جديدة) · curSafe · inject
t054 = rd(ROOT + '/workers/parts/054-image-contract.js'); o054 = at_tag('workers/parts/054-image-contract.js')
RED = re.compile(r"\n/\* KIVO_254 · AUD-033 \(ج\) — الحارسُ الأخير.*?\n\}\n", re.S)
r054 = RED.sub('\n', t054, 1)
r054 = r054.replace("""    if (!Array.isArray(v)) { logEv('warn', 'users-unparseable', { kind: 'not-array' }); return '[]'; }
    return JSON.stringify(v.map(function (u) { var c = {}; for (var k in u) if (k !== 'ph') c[k] = u[k]; return c; }));
  } catch (e) { logEv('warn', 'users-unparseable', { kind: 'parse' }); return '[]'; }""", """    if (!Array.isArray(v)) return rawJson;
    return JSON.stringify(v.map(function (u) { var c = {}; for (var k in u) if (k !== 'ph') c[k] = u[k]; return c; }));
  } catch (e) { return rawJson; }""", 1)
r054 = re.sub(r"  /\* نسخة العرض: بلا بصمات\. KIVO_254 · AUD-033 \(ج\):.*?\n(.*?\n)", lambda m: "  /* نسخة العرض: بلا بصمات. إن تعذّر التحليل تُعاد كما هي كي لا يتعطل شيء */\n", r054, count=1, flags=re.S)
r054 = r054.replace("if (kq === K_USERS && cq != null) cq = stripPh(cq); return cq; };   /* KIVO_248 · AUD-033: القيمةُ الحالية في denied/conflicts كانت تحمل بصمات كلمات المرور — تُنزع كما في /api/get والإقلاع · KIVO_254 (ج): لكل الأدوار بلا استثناء (كان مدير النظام يُستثنى) */",
                    "if (kq === K_USERS && cq != null && A.u.role !== 'super') cq = stripPh(cq); return cq; };   /* KIVO_248 · AUD-033: القيمةُ الحالية في denied/conflicts كانت تحمل بصمات كلمات المرور لغير مدير النظام — تُنزع كما في /api/get والإقلاع */", 1)
r054 = r054.replace("  var js = redactPh(JSON.stringify(boot), 'inject').replace(/</g, '\\\\u003c')", "  var js = JSON.stringify(boot).replace(/</g, '\\\\u003c')", 1)
ok(r054 == o054, '★ 054-image-contract.js: نزعُ redactPh/PH_REDACT_RE + عكسُ stripPh وcurSafe وinject = ' + TAG + ' حرفاً', '' if r054 == o054 else 'فرق عند الموضع ' + str(next((i for i in range(min(len(r054), len(o054))) if r054[i] != o054[i]), -1)))
ok("if (kq === K_USERS && cq != null) cq = stripPh(cq)" in t054 and "A.u.role !== 'super'" not in t054.split('var curSafe')[1].split('\n')[0], '★ curSafe تنزع ph لكل الأدوار (لا استثناءَ لمدير النظام)')
ok("return '[]'; }" in t054 and 'users-unparseable' in t054 and 'return rawJson' not in t054.split('function stripPh')[1].split('\n}\n')[0], '★ stripPh لا تعيد الخامَ أبداً')
ok(t054.count('function redactPh(') == 1 and "redactPh(JSON.stringify(o), 'json')" in rd(ROOT + '/workers/parts/052-aud-events.js') and "redactPh(JSON.stringify(boot), 'boot')" in rd(ROOT + '/workers/parts/063-enf-api-and-handler.js'), '★ الحارسُ الأخير redactPh في json() وموضعَي الإقلاع')
chk = subprocess.run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'], cwd=ROOT, capture_output=True, text=True)
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات (20) = مصادرها (generate --check) — ومنها _worker.js = ضمُّ الأجزاء')

print('\n╔═ (ج) الرموز: كلُّ فرقٍ معلنٌ ونصّيٌّ فقط ═╗')
tmp = tempfile.mkdtemp(prefix='k254src_')
subprocess.run('git archive ' + TAG + ' src | tar -x -C ' + tmp, shell=True, cwd=ROOT, check=True)
tv = subprocess.run([sys.executable, 'tools/tokens.py', 'verify', 'src', tmp + '/src', '--declared', 'src/styles/tokens/changes-254.json'], cwd=ROOT, capture_output=True, text=True)
ok(tv.returncode == 0 and tv.stdout.startswith('✔'), '★ tokens verify مقابل رموز ' + TAG + ': كلُّ الفروق معلنة (0 غيرُ معلَن · 0 إعلانٍ ميّت)', tv.stdout.split('\n')[0][:200])
decl = json.load(open(ROOT + '/src/styles/tokens/changes-254.json', encoding='utf-8'))
nonfg = [k for k in decl['tokens'] if not (k.startswith('fg-') or k.startswith('p-') or k in ('text-faint', 'success-text', 'plum-text'))]
ok(not nonfg and all(k in ('chart-2-text', 'chart-5-text', 'plum-strong') for k in decl['new']), '★ الفروقُ المعلنة نصّيةٌ فقط (fg-* · text-faint · success-text · plum-text · بدائياتُها) + ثلاثةُ رموزٍ جديدة', json.dumps({'nonfg': nonfg, 'new': list(decl['new'])}, ensure_ascii=False))
ok(len(decl['tokens']) >= 50, '   ' + str(len(decl['tokens'])) + ' رمزاً معلناً (البندُ ٦: الذهبيُّ والرماديُّ الباهت والأخضر والبنفسجي والأزرق للنصوص الصغيرة)')

print('\n╔═ (د) بصماتُ الفروق المراجَعة لبقية الملفات ═╗')
FP = ROOT + '/tests/source/k254diff.json'
REASONS = {
 'src/auth/330-auth-perm.js': 'AUD-033 (ج): مدقّقُ الاستيراد يقبل حساباتٍ بلا ph ودورَ gm · AUD-020: معالمُ شاشة الدخول (complementary/main) · التباين: نصُّ الإصدار بلا opacity',
 'src/components/240-bassam-link.js': 'البند ١: لافتةُ الجوال (off/back · 4 ث · role=status)',
 'src/components/660-a11y-enhancer.js': 'البند ٧: Enter على <a> بلا href · البند ٤: الحاشيةُ اللمسية (pointer: coarse) · ربطُ tapify بالطفرات · تصحيحُ البوابة: الحاشيةُ تُعاد عند كلّ تغيّرٍ في المقاس (ResizeObserver) لا قياسٌ واحدٌ يسبق الخط',
 'src/layouts/260-bassam-plat.js': 'البند ٧ (تصحيحُ البوابة): رابطُ «المساعدة» role=link tabindex=0 كروابط التنقّل — كان خارج ترتيب Tab',
 'src/api/280-server-storage.js': 'البند ١ (تصحيحُ البوابة): لا «متصل» ما دام navigator.onLine = false — ردٌّ كان في الطريق لحظةَ الانقطاع كان يقلب اللافتةَ «عاد الاتصال» والمتصفحُ بلا شبكة',
 'src/core/030-pages-loader.lazy-guard.js': 'البند ٣أ: بطاقةُ «تعذّر تحميل الشاشة» في sc-host بعد المحاولات التلقائية + زرٌّ يعيد الجلب',
 'src/layouts/helmet-global.css': 'البند ١ (.bs-netbar) · ٢ (هيكلُ sc-placeholder) · ٣ (.bs-retry) · ٤ (.bs-tap) · AUD-020 (.bs-sr-only · زرُّ الخروج المطويّ visibility:hidden)',
 'src/layouts/index.template.html': 'AUD-020: h1 لكل شاشة · روابطُ التنقّل role=link tabindex=0 · زرُّ الطيّ وبطاقةُ المستخدم وصفوفُ الشجرة role=button',
 'src/layouts/root-logic.js': 'AUD-020: screenTitle · عنوانُ شاشة الاحتياط غيرُ فارغ',
 'src/modules/admin/logic.js': 'البند ٣ب: adErr/adRetry وبطاقةُ سجلّ التدقيق بزرّ · البند ٦: رقاقاتُ التصفية المختارة بنصٍّ داكن على الذهبي',
 'src/modules/admin/view.html': 'البند ٣ب: بطاقةُ أعد المحاولة في لوحات مدير النظام · AUD-020 (253→254): aria-label للحقول الحرجة',
 'src/styles/070-theme-tokens.css': 'مولَّدٌ من tokens.json (البند ٦)', 'src/styles/080-theme-dark.css': 'مولَّدٌ من tokens.json (البند ٦)', 'src/styles/tokens/tokens.json': 'البند ٦: بدائياتٌ أغمق/أفتح للنصوص الصغيرة · brand-text/chart-2-text/chart-5-text/plum-strong',
 'tools/tokens.py': 'verify --declared: التغييراتُ المقصودة تُعلَن ملفاً ولا تمرّ صامتة',
}
for v in VIEWS: REASONS.setdefault(v, 'البند ٦: الرقمُ الميلادي في شريط الأيام بلا opacity .72' + (' · AUD-020: aria-label' if 'irshad' in v or 'admin' in v else ''))
for l in LOGIC: REASONS.setdefault(l, 'البند ٦: بطاقاتُ الأشهر الفارغة opacity .75 → .9')
for p in PAGES: REASONS.setdefault(p, 'مولَّدةٌ من view/logic (البند ٦ · AUD-020)')
fps = {}
for name in CODE:
    if name in HUNKS or name == 'workers/parts/054-image-contract.js' or name == 'workers/_worker.js' or name == 'src/core/270-bs-ver.js': continue
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
if FREEZE:
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k254diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملف (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في k254diff.json', json.dumps({'changed-since-review': bad[:5], 'unknown': [n for n in rec if n not in fps][:3]}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب')

print('\n╔═ (هـ) الفهرسُ والإصدارُ وcatch ═╗')
ic = subprocess.run([sys.executable, 'tools/icons.py', 'check', '--src', 'src'], cwd=ROOT, capture_output=True, text=True)
ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
w = rd(ROOT + '/workers/_worker.js')
ok("var WORKER_VER = '2026.10.10-154';" in w and "var ENF_VER = 'KIVO_254 · enforce 2" in w, '   الخادم 2026.10.10-154 · ENF_VER KIVO_254')
ec = subprocess.run([sys.executable, 'scripts/empty_catch_ratchet.py', 'src'], cwd=ROOT, capture_output=True, text=True)
ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
