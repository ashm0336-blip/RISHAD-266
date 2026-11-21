# -*- coding: utf-8 -*-
"""براهينُ المصدر الساكنة للشجرة الحالية (RISHAD-266 · الإصدار 265 · V7) — جزءٌ من البوابة: tools/build_chain.sh --check-current (npm run check).
   V7 · د5-ح (ملاحظةُ المراجع 30 · البند 7): كانت تثبت «الفرقَ بالضبط عن الوسم KIVO_264» — والوسمُ غيرُ موجود في هذا المستودع (تاريخُ V7 بلا وسوم إصدار)
   وكانت خارج كلّ سلسلة فحص، فلا تعمل ولا يراها أحد. صارت تفحص الشجرةَ كما هي اليوم:
   (ب) الثوابت: الإضافات · شجرةُ v24.9 = الاشتقاق · الرموز · الاعتماديات · طبقةُ الأسماء · إثباتاتُ الخادم الساكنة (SOT-190 · تقاعدُ سقف النطاق ·
       مخطّطاتُ الأجسام · جزءُ المصادقة · علامتا أداة الاختبار) · لا ترحيلَ صلاحياتٍ قديماً في العميل (حُذفت في P14) · ختمُ التصدير
   (ج) السقّالة: CI · رقمُ الإصدار · سكربتاتُ npm الحالية (build_chain) وهذه البراهينُ في سلسلة الفحص
   (د) المشتقّات · الأنواع · الأيقونات · الإصدار · السقّاطات · البيئة · العقد = مساراتُ العامل · الحزمةُ مبنيّةٌ من هذا المصدر (بلا إصداراتٍ محتفَظٍ بها) · SOT v6
   حُذف ما لا معنى له بلا وسم: قواعدُ «الملفات المتغيّرة عن الوسم» (RULES_BY_STREAM · W1_NOTE · PERM_DECLARED)، وبصماتُ الفروق (k265diff.json)،
   وtokens verify مقابل الوسم — والرموزُ يحرسها tokens check وtokens_refs --check أدناه.
       python3 tests/source/k265src.py [pk265]"""
import os, sys, hashlib, subprocess, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk265'))
VER_UI, VER_W, ENF_TAG, N = '2026.10.14-265', '2026.10.14-165', 'KIVO_265', '265'
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
run = lambda cmd: subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
print('╔═ (ب) الثوابت ═╗')
pc = run([sys.executable, 'tools/plugins.py', 'check'])
ok(pc.returncode == 0 and '6 عدسة' in pc.stdout, '★ tools/plugins.py check (AUD-030)', pc.stdout.strip().split('\n')[-1][:200])
pt = run([sys.executable, 'tools/perm_tree.py', 'check'])
ok(pt.returncode == 0, '★ شجرةُ v24.9 = الاشتقاق (perm-tree24.json)', pt.stdout.strip()[-140:])
tc = run([sys.executable, 'tools/tokens.py', 'check', 'src'])
ok(tc.returncode == 0, '   tools/tokens.py check (AUD-017)', tc.stdout.strip()[:160])
tr = run([sys.executable, 'tools/tokens_refs.py', '--check'])
ok(tr.returncode == 0 and '(CSS: 0)' in tr.stdout, '★ مراجعُ الرموز الحرفية في CSS = 0 · والمجموعُ لا يزيد (AUD-017)', tr.stdout.strip().split('\n')[-1][:200])
dc = run([sys.executable, 'tools/deps_check.py'])
ok(dc.returncode == 0, '   tools/deps_check.py: 0 مخالفة (SOT-091)', dc.stdout.strip().split('\n')[-1][:160])
ns = run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--check'])
ok(ns.returncode == 0, '★ kivo_ns --check (AUD-016)', ns.stdout.strip().split('\n')[-1][:160])
W = rd(ROOT + '/workers/_worker.js')
ok("detail: 'full-super-only'" in W and "markers.ops[fk].scope === 'full'" in W, '★ SOT-190: الاستعادةُ الشاملة لمدير النظام وحده في الخادم')
# RISHAD-266: سقفُ النطاق القديم تقاعد — الخطةُ الأولى (enfPlanEmpty) والمحتوى المخفيّ (enfPlanHidden) كانا لسقفٍ لم يعد يُقرأ؛ يُتحقّق الآن من التقاعد نفسِه
ok('function enfPlanEmpty(' not in W and 'function enfPlanHidden(' not in W and "return { r: 'not_applicable', why: 'legacy-scope-retired' }" in W and "enfNo('scope-retired'" in W, '★ RISHAD-266: سقفُ النطاق القديم متقاعد — Site/Zone/Shift لا تنطبق في الإنفاذ · كتابةُ السجلّ scope-retired')
_bs = re.search(r"var KIVO_BODY_SCHEMAS = (\{.*?\});\n", W, re.S); _bsk = sorted(json.loads(_bs.group(1))) if _bs else []
_sites = W.count("bodyCheck('/api/") + W.count("bodyRead(request, ")   # KIVO_264 · SOT-101: الفحصُ الحرفيّ (bodyCheck('/api/…') + bodyRead(request, …) + KIVO_BODY_NONE)
ok(len(_bsk) >= 14 and _sites >= 12 and 'var KIVO_BODY_NONE = ' in W and "'/api/img/'" in W, '★ SOT-101 · ADR-032: مخطّطاتُ الأجسام مفروضةٌ في الخادم (≥ 14 مساراً بمخطّط + الصورةُ الخامّ · ≥ 12 موضعَ فرض — تزيد ولا تنقص؛ كانت 5 في 263)', {'schemas': len(_bsk), 'sites': _sites})
ok('function authPublicRoutes(' in W and 'function authSessionRoutes(' in W, '★ SOT-096: مساراتُ المصادقة في جزءٍ مستقل')
ok(W.count('@@KIVO_TEST_TOOL_BEGIN') == 1 and W.count('@@KIVO_TEST_TOOL_END') == 1, '★ SOT-173: أداةُ الاختبار بين علامتين تنزعهما حزمةُ الإنتاج (tools/prod_strip.py)')
PM = rd(ROOT + '/src/permissions/331-perm-model.js')
ok(PM.count('KIVO_263: ترحيلٌ عامّ') == 0 and 'isSuper = I.isSuper' in PM, '★ لا ترحيلَ صلاحياتٍ لمرّةٍ واحدة في العميل (حُذفت الستّ في P14 — كانت لمدير النظام وحده)')
RL = rd(ROOT + '/src/layouts/root-logic.js')
ok('":bassam_last_export_v1", String(dt.getTime())' in RL, '   ختمُ «آخر تصدير» رقمُ اللحظة (JSON صالح)')

print('\n╔═ (ج) KIVO_265 ساكناً — السقّالة ونظامُ المهام ═╗')
G, MAN = 'gateall' + N + '.sh', 'tests/gate/mandatory_' + N + '.txt'
if os.path.exists(os.path.join(ROOT, G)):   # البوابةُ في المختبر الانتقالي وحده — المستودعُ الرسمي المصدَّر بلا gateall (AUD-029)
    gm = run([sys.executable, 'tools/gate_manifest.py', G, '--check', MAN])
    ok(gm.returncode == 0, '★ ADR-033: قائمةُ الحزم الإلزامية ' + MAN + ' = نصُّ ' + G + ' (غيابُ أيٍّ منها إخفاق)', (gm.stdout.strip().split('\n') or [''])[-1][:200])
    GT = rd(os.path.join(ROOT, G))
    ok('KIVO_REPORT_DIR="$PWD/../reports/k' + N + '"' in GT and 'mkdir -p reports/k' + N in GT and 'reports/k' + N + '/engine_coverage.json' in GT and 'reports/k264/' not in GT,
       '   أدلةُ البوابة في reports/k' + N + ' وحده (لا مجلدَ 264)')
    ok(GT.count('# gate:optional-by-owner 2026-10-13') == 1 and 'R185 استيرادُ البيانات التاريخية' in GT, '   R185 غيرُ إلزامي بقرار المالك (2026-10-13) — بالعلامة نفسِها لا صمتاً')
    ok('[ "$f" = k258print.mjs ] && xa=("../pk264")' in GT and 'x/k' + N + 'vis:' in GT, '   k258print مقابل 264 المنشور على Preview · السقّاطةُ البصرية بإصدار ' + N)
else: ok(True, '   (المستودعُ الرسمي وحده: لا بوابةَ مختبرٍ هنا)')
CI = rd(ROOT + '/.github/workflows/ci.yml')
ok('tools/release_n.sh' in CI and 'lint:deps' in CI and not re.search(r'\bpk2\d\d\b|gateall2\d\d|build_chain\.sh\s+2\d\d', CI), '★ CI يقرأ رقمَ الإصدار من المصدر · خطوةُ lint:deps صريحة (SOT-129)')
ok(run(['bash', 'tools/release_n.sh']).stdout.strip() == N, '   tools/release_n.sh = ' + N)
PJ = json.load(open(os.path.join(ROOT, 'package.json'), encoding='utf-8')); S = PJ.get('scripts', {})
ok(PJ.get('version') == N + '.0.0-dev' and S.get('build') == 'npm run -s build:' + N and S.get('check') == 'npm run -s check:' + N and S.get('build:chain') == 'npm run -s build:' + N,
   '   package.json ' + N + '.0.0-dev · build/check/build:chain → ' + N)
BC = rd(ROOT + '/tools/build_chain.sh'); _cc = BC[BC.find('--check-current" ]; then'):]
ok(S.get('build:' + N) == 'node tools/build_chain.mjs ' + N + ' --current' and S.get('check:' + N) == 'node tools/build_chain.mjs ' + N + ' --check-current'
   and all(('tests/source/k' + N + x + '.py "$OUT"') in _cc[:_cc.find('exit 0')] for x in ('src', 'eq')) and 'perf_budget.py "$OUT"' in BC and 'prod_strip.py "$OUT"' in BC
   and not re.search(r'\b(?:build|check|test:unit|test:coverage):26[34]\b', json.dumps(S)),
   '★ build:' + N + ' · check:' + N + ' عبر tools/build_chain (الميزانية · حزمةُ الإنتاج) · وk' + N + 'src/eq في سلسلة الفحص — لا سكربتَ 263/264 باقٍ')
ok(rd(ROOT + '/config/wrangler.toml').count('pages_build_output_dir = "pk' + N + '"') == 1, '   config/wrangler.toml → pk' + N)
# KIVO_264-merge: الإثباتاتُ الساكنة لكل تيّار (مثل ما فعله k263src (ج) لـ SOT-190/188/101) — سطرٌ ok(...) لكلّ قرارٍ أو إصلاحٍ مدمج

print('\n╔═ (د) المشتقّاتُ والإصدارُ والسقّاطاتُ والعقدُ ═╗')
chk = run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'])
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات = مصادرها (generate --check)')
ty = run(['node', 'tools/gen_types.mjs', '--check']); ok(ty.returncode == 0, '   src/types/kivo.d.ts = التوليد', ty.stdout.strip()[:120])
ic = run([sys.executable, 'tools/icons.py', 'check', '--src', 'src']); ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
ok("var WORKER_VER = '" + VER_W + "';" in W and "var ENF_VER = '" + ENF_TAG + " · enforce 2" in W, '   الخادم ' + VER_W + ' · ENF_VER ' + ENF_TAG)
ec = run([sys.executable, 'tools/empty_catch_ratchet.py', 'src']); ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
cr = run([sys.executable, 'tools/color_ratchet.py', 'src']); ok(cr.returncode == 0, '   لا لونَ خاماً جديداً (السقّاطة)', (cr.stdout or cr.stderr).strip().split('\n')[0][:120])
ev = run([sys.executable, 'tools/env_check.py', 'src']); ok(ev.returncode == 0 and 'wrangler.toml متّسق' in ev.stdout, '   مخطّطُ البيئة = العامل · wrangler.toml متّسق بلا أسرار', ev.stdout.strip()[-160:])
CT = json.load(open(ROOT + '/src/api/contracts.json', encoding='utf-8'))
exact = sorted(set(re.findall(r"path === '(/api/[a-z0-9/_-]+)'", W))); pref = sorted(set(re.findall(r"path\.indexOf\('(/api/[a-z0-9_-]+/)'\)", W)))
ok(sorted(r['path'] for r in CT['routes']) == sorted(exact + pref), '★ src/api/contracts.json = مساراتُ العامل حرفاً (' + str(len(CT['routes'])) + ')',
   json.dumps({'contract-only': sorted(set(r['path'] for r in CT['routes']) - set(exact + pref)), 'worker-only': sorted(set(exact + pref) - set(r['path'] for r in CT['routes']))}, ensure_ascii=False))
if os.path.isdir(DIR):
    bj = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else None
    _wt = (bj or {}).get('workerTransform') or {}
    ok(bj is not None and _wt.get('sourceSha256') == sha(open(ROOT + '/workers/_worker.js', 'rb').read()) and _wt.get('proof') == 'tokens-equal' and bj['files']['_worker.js']['sha256'] == _wt.get('sha256'),
       '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js مصغَّراً ببرهان الرموز (الحزمةُ مبنيّةٌ من هذا المصدر)')
    ok(bj is not None and bj.get('retained') == [], '   لا إصداراتٍ محتفَظٌ بها في الحزمة (العقدُ الحالي — build_chain.sh)', bj and bj.get('retained'))
_doc = os.path.join(ROOT, 'docs/reference/v24_9_FINAL.html')
ok(os.path.exists(_doc) and sha(open(_doc, 'rb').read()) == '6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde', '   وثيقةُ v24.9 = المرجعُ بايتاً (SHA-256 6e9aba63…)')
sv = run([sys.executable, 'tools/sot_verify.py'])
ok(sv.returncode == 0, '★ SOT v6 متّسق (tools/sot_verify.py)', sv.stdout.strip().split('\n')[-1][:200])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
