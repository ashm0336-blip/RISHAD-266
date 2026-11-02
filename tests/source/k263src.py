# -*- coding: utf-8 -*-
"""KIVO_263 · إنهاءُ البنود الهندسية (SOT A: الـ14 P0 وما بعدها) · قراراتُ المالك (SOT-188/190/173 · AUD-053) · بوابةٌ تُفشل غيابَ الإلزامي —
   إثباتُ الفرق بالضبط عن KIVO_262 (الوسم git؛ KIVO_PREV_TAG يبدّله).
   (أ) الشجرة = الوسم عدا المعلن: كلُّ ملفٍّ متغيّر يطابق قاعدةً معلنةً واحدة بسببها (يدويٌّ ببصمة فرقٍ مراجَعة في k263diff.json · مولَّدٌ بأداة · جديد)
   (ب) ثوابتُ 262 كما هي: الإضافات · الوحداتُ المرجعية v24.9 بايتاً · شجرةُ v24.9 = الاشتقاق · طبقتا الرموز (0 فرقٍ محسوب) · قواعدُ الاعتماد · AUD-016
   (ج) 263 نفسُه ساكناً (السلوكُ تثبته tests/unit/{restore_full_super,body_schemas,auth_routes,prod_strip,…} وcfbench/k263{journeys,journeys2,firstplan})
   (د) المشتقّات · الإصدار 163/263 · السقّاطات · البيئة · العقد = مساراتُ العامل · الحزمةُ من هذا المصدر · SOT v6
       python3 tests/source/k263src.py [pk263] [--freeze]"""
import os, sys, hashlib, subprocess, json, re, fnmatch
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk263'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_262')
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
# القواعدُ المعلنة: (النمط · النوع · السبب) — CODE يدويٌّ ببصمة فرقٍ مجمَّدة · GEN بأداةٍ مسمّاة · NEW ملفٌّ جديد
RULES = [
 ('src/core/270-bs-ver.js', 'VER', 'الإصدار 2026.10.12-263'),
 ('workers/parts/002-seclog.js', 'CODE', 'WORKER_VER 2026.10.12-163'),
 ('workers/parts/056-enforce.js', 'CODE', 'ENF_VER KIVO_263 (· first-plan)'),
 ('workers/parts/058-enf-scope.js', 'CODE', 'SOT-188 · ADR-031: first-plan-bootstrap لمدير النظام وحده · enfPlanEmpty = لا موقعَ ولا عنصر (مستخرِجُ المحرّك) · enfPlanHidden: محتوى الأشهر والطوابق المضافة/المحذوفة يُقيَّم بمقيِّمَي الإنفاذ (مراجعةٌ مستقلة · قرارُ المالك 2026-10-13)'),
 ('workers/parts/062-enf-save.js', 'CODE', 'SOT-190 (قرارُ المالك): الاستعادةُ الشاملة scope:full لمدير النظام وحده (full-super-only)'),
 ('workers/parts/063-enf-api-and-handler.js', 'CODE', 'SOT-096 نقلُ مسارات المصادقة إلى 062a حرفاً · SOT-101 bodyCheck · SOT-173 علامتا أداة الاختبار'),
 ('workers/parts/062a-auth-routes.js', 'NEW', 'SOT-096: authPublicRoutes · authSessionRoutes (منقولةٌ من 063 حرفاً) + bodyCheck'),
 ('workers/parts/051b-body-schemas.js', 'NEW', 'SOT-101 · ADR-032: KIVO_BODY_SCHEMAS (من src/schemas/api/bodies.schema.json) · bodyCheck'),
 ('workers/parts.json', 'GEN', 'قائمةُ الأجزاء وبصماتُها (generate.py)'),
 ('workers/_worker.js', 'GEN', 'العاملُ المجمَّع من الأجزاء (generate.py)'),
 ('src/api/contracts.json', 'CODE', 'SOT-101: ردُّ 400 bad-body للمسارات الخمسة ذات مخطّط الجسم'),
 ('src/schemas/*.json', 'NEW', 'SOT-101/123: مخطّطاتُ الأجسام والعقد وشجرة v24.9 والبيان'),
 ('src/schemas/api/*.json', 'NEW', 'SOT-101: bodies.schema.json'),
 ('src/types/kivo.d.ts', 'GEN', 'الأنواع (tools/gen_types.mjs) — ردودُ 400 الجديدة'),
 ('src/assets/README.md', 'NEW', 'SOT-085: الأصولُ الثابتة — الاستخدام والحجم'),
 ('src/core/005-kivo-ns.js', 'CODE', 'AUD-007: لفُّ سطر N الطويل (8 أسماء في السطر) — المحتوى نفسه'),
 ('src/core/050-dc-runtime.js', 'CODE', 'AUD-012/SOT-051: KIVO.__bsCssObj (الدالةُ المنسوخة 12 مرةً في daily وplan)'),
 ('src/components/660-a11y-enhancer.js', 'CODE', 'SOT-058: tabindex وaria-label لـ.bs-info و.dz-hz (التركيزُ بديلُ التحويم)'),
 ('src/layouts/helmet-global.css', 'CODE', 'SOT-058: :focus/:focus-within للتلميحات · AUD-017 مراجعُ الرموز الدلالية'),
 ('src/layouts/index.template.html', 'CODE', 'AUD-020: ترتيبُ العناوين (h3→h2) في عنصر النائب'),
 ('src/layouts/root-logic.js', 'CODE', 'ختمُ «آخر تصدير» رقمُ اللحظة (JSON صالح — كان يرفضه الإنفاذ shape)'),
 ('src/permissions/331-perm-model.js', 'CODE', 'ترحيلاتُ الصلاحيات القديمة في العميل لمدير النظام وحده (كانت تُرسل من غيره فتُرفض برسالةٍ مضلِّلة)'),
 ('src/modules/admin/logic.js', 'CODE', 'AUD-020 (h4→h3 · أسماءٌ مقروءة لأدوات تصفية «سجل الحركة»: حقلا التاريخ وقائمتا الإدارة والمستخدم — كشفها axe على 32 شاشة في run3) · _expInfo يقبل رقمَ اللحظة'),
 ('src/modules/daily/logic.js', 'CODE', 'AUD-012: KIVO.__bsCssObj بدل 6 نسخ'),
 ('src/modules/plan/logic.js', 'CODE', 'AUD-012: KIVO.__bsCssObj بدل 6 نسخ'),
 ('src/modules/*/view.html', 'CODE', 'AUD-020/SOT-156: عناوينُ البطاقات والحالات الفارغة h3→h2 (الحجمُ نفسُه بالنمط) · «مديرو الإدارة» aria-level=2 (heading-order — run3)'),
 ('src/modules/*/helmet.css', 'GEN', 'AUD-017: مراجعُ الرموز الدلالية (tools/tokens_refs.py --rewrite-css) · SOT-058 dstats :focus'),
 ('src/styles/*.css', 'GEN', 'AUD-017: مراجعُ الرموز الدلالية (tools/tokens_refs.py --rewrite-css)'),
 ('src/modules/*/meta.json', 'GEN', 'SOT-092: ميثاقُ الوحدة (tools/module_charter.py --write)'),
 ('src/pages/*.dc.html', 'GEN', 'الصفحاتُ المشتقّة من الوحدات (generate.py)'),
 ('config/wrangler.toml', 'CODE', 'مجلدُ البناء pk263'),
 ('tools/sec/audit.py', 'CODE', 'الافتراضيُّ pk263'), ('tools/onboard_check.sh', 'CODE', 'الافتراضيُّ 263'),
 ('tools/release_n.sh', 'CODE', 'SOT-119: سطرُ الاستعمال'),
 ('tools/kivo_ns.mjs', 'CODE', 'AUD-007: N بثمانية أسماءٍ في السطر'),
 ('tools/deps_check.py', 'CODE', 'SOT-129: الإشارةُ إلى خطوة CI الصريحة'),
 ('tools/export_official.py', 'CODE', 'المستودعُ الرسمي: فحوصُ 263'),
 ('tools/pack.py', 'CODE', 'SOT-173: Production_upload.zip وdist_Candidate من pk<N>.prod وحده · يرفض إن غاب أو لم يكن مشتقّاً من pk<N> الحالي'),
('tools/release_check.py', 'CODE', 'N13: يرفض الإصدارَ ووثائقُه (CHANGELOG · STATE · reports/k<N>/decisions.md) فيها عناصرُ نائبةٌ غيرُ مملوءة {{…}}'),
 ('tools/trace.py', 'CODE', 'SOT-128: «مفتوح P0/P1 هندسيٌّ بلا أثر» = 0 شرطٌ في --check'),
 ('tools/validate_schemas.py', 'CODE', 'SOT-095/101/123: routeNames خطأ · مخطّطاتُ الأجسام والعقد والشجرة والبيان'),
 ('tools/*.py', 'NEW', 'أدواتُ 263 الجديدة (gate_manifest · long_lines · module_charter · route_registry · api_routes · perf_budget · scripts_check · hover_check · assets_check · scope_single_engine · prod_strip · reports_check · ux_states · tokens_refs)'),
 ('tools/*.mjs', 'NEW', 'AUD-012: dup_nested.mjs'),
 ('tools/*.json', 'NEW', 'خطوطُ أساس السقّاطات (perf_budget · dup_nested · tokens_refs · ux_states · trace_nonengineering)'),
]
def rule(f):
    for pat, kind, why in RULES:
        if fnmatch.fnmatchcase(f, pat): return (pat, kind, why)
    return None
undecl = [f for f in diff if not rule(f)]
newbad = [f for f in diff if rule(f) and rule(f)[1] == 'NEW' and f in prev]
ok(not undecl and not untracked and not newbad, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' (' + str(len(diff)) + ') كلُّها تحت قاعدةٍ معلنةٍ بسببها — لا تغييرَ غيرُ معلن',
   json.dumps({'undeclared': undecl[:10], 'untracked': untracked[:10], 'new-but-existed': newbad[:5]}, ensure_ascii=False))
CODE = sorted(f for f in diff if rule(f)[1] == 'CODE')
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'KIVO.__BS_VER = "2026.10.12-263";', '   الإصدار 2026.10.12-263')
refp = ['workers/parts/' + f for f in sorted(os.listdir(ROOT + '/workers/parts')) if re.match(r'0(0[4-9]|1[0-6])-', f)]
ok(refp and all(prev.get(f) == cur.get(f) for f in refp), '★ الوحداتُ المرجعية v24.9 (' + str(len(refp)) + ' جزءاً) = الوسم بايتاً — المحرّكُ والسجلُّ لم يُمسّا', [f for f in refp if prev.get(f) != cur.get(f)])
perm = sorted(k for k in diff if k.startswith(('src/permissions/', 'src/plugins/', 'src/manifests/', 'migrations/')))
ok(perm == ['src/permissions/331-perm-model.js'], '★ الصلاحيات: لا تغييرَ في السجلّ ولا الشجرة ولا الإضافات ولا الترحيلات — وحده 331 (ترحيلاتُ العميل لمدير النظام وحده)', perm)

print('\n╔═ (ب) ثوابتُ 262 كما هي ═╗')
pc = run([sys.executable, 'tools/plugins.py', 'check'])
ok(pc.returncode == 0 and '6 عدسة' in pc.stdout, '★ tools/plugins.py check (AUD-030)', pc.stdout.strip().split('\n')[-1][:200])
pt = run([sys.executable, 'tools/perm_tree.py', 'check'])
ok(pt.returncode == 0, '★ شجرةُ v24.9 = الاشتقاق (perm-tree24.json)', pt.stdout.strip()[-140:])
tc = run([sys.executable, 'tools/tokens.py', 'check', 'src'])
ok(tc.returncode == 0, '   tools/tokens.py check (AUD-017)', tc.stdout.strip()[:160])
tv = run([sys.executable, 'tools/tokens.py', 'verify', 'src', 'git:' + TAG])
ok(tv.returncode == 0 and ' 0 فرق منها 0 ' in tv.stdout and 'داكن: 0 منها 0' in tv.stdout, '★ tokens verify مقابل ' + TAG + ': 0 فرقٍ محسوب — مراجعُ CSS الدلالية بالقيمة نفسِها (AUD-017)', tv.stdout.strip()[:200])
tr = run([sys.executable, 'tools/tokens_refs.py', '--check'])
ok(tr.returncode == 0 and '(CSS: 0)' in tr.stdout, '★ مراجعُ الرموز الحرفية في CSS = 0 · والمجموعُ لا يزيد (AUD-017)', tr.stdout.strip().split('\n')[-1][:200])
dc = run([sys.executable, 'tools/deps_check.py'])
ok(dc.returncode == 0, '   tools/deps_check.py: 0 مخالفة (SOT-091)', dc.stdout.strip().split('\n')[-1][:160])
ns = run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--check'])
ok(ns.returncode == 0, '★ kivo_ns --check (AUD-016)', ns.stdout.strip().split('\n')[-1][:160])

print('\n╔═ (ج) KIVO_263 ساكناً ═╗')
W = rd(ROOT + '/workers/_worker.js')
ok("detail: 'full-super-only'" in W and "markers.ops[fk].scope === 'full'" in W, '★ SOT-190: الاستعادةُ الشاملة لمدير النظام وحده في الخادم')
# RISHAD-266: سقفُ النطاق القديم تقاعد — الخطةُ الأولى (enfPlanEmpty) والمحتوى المخفيّ (enfPlanHidden) كانا لسقفٍ لم يعد يُقرأ؛ يُتحقّق الآن من التقاعد نفسِه
ok('function enfPlanEmpty(' not in W and 'function enfPlanHidden(' not in W and "return { r: 'not_applicable', why: 'legacy-scope-retired' }" in W and "enfNo('scope-retired'" in W, '★ RISHAD-266: سقفُ النطاق القديم متقاعد — Site/Zone/Shift لا تنطبق في الإنفاذ · كتابةُ السجلّ scope-retired')
ok('var KIVO_BODY_SCHEMAS = ' in W and W.count("bodyCheck('/api/") >= 5, '★ SOT-101 · ADR-032: مخطّطاتُ الأجسام مفروضةٌ في الخادم (5 مسارات)')
ok('function authPublicRoutes(' in W and 'function authSessionRoutes(' in W, '★ SOT-096: مساراتُ المصادقة في جزءٍ مستقل')
ok(W.count('@@KIVO_TEST_TOOL_BEGIN') == 1 and W.count('@@KIVO_TEST_TOOL_END') == 1, '★ SOT-173: أداةُ الاختبار بين علامتين تنزعهما حزمةُ الإنتاج (tools/prod_strip.py)')
PM = rd(ROOT + '/src/permissions/331-perm-model.js')
ok(PM.count('if (!isSuper()) return;   /* KIVO_263: ترحيلٌ عامّ') == 6, '★ ترحيلاتُ الصلاحيات الستّ في العميل لمدير النظام وحده')
RL = rd(ROOT + '/src/layouts/root-logic.js')
ok('":bassam_last_export_v1", String(dt.getTime())' in RL, '   ختمُ «آخر تصدير» رقمُ اللحظة (JSON صالح)')
gm = run([sys.executable, 'tools/gate_manifest.py', 'gateall263.sh', '--check'])
ok(gm.returncode == 0 if os.path.exists(os.path.join(ROOT, 'gateall263.sh')) else True, '★ ADR-033: قائمةُ الحزم الإلزامية = البوابة (غيابُ أيٍّ منها إخفاق)', gm.stdout.strip().split('\n')[-1][:160])
CI = rd(ROOT + '/.github/workflows/ci.yml')
ok('tools/release_n.sh' in CI and 'lint:deps' in CI and not re.search(r'\bpk2\d\d\b|gateall2\d\d|build_chain\.sh\s+2\d\d', CI), '★ CI يقرأ رقمَ الإصدار من المصدر · خطوةُ lint:deps صريحة (SOT-129)')
ok(run(['bash', 'tools/release_n.sh']).stdout.strip() == '263', '   tools/release_n.sh = 263')

print('\n╔═ بصماتُ الفروق المراجَعة ═╗')
FP = ROOT + '/tests/source/k263diff.json'
fps = {}
for name in CODE:
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': rule(name)[2]}
if FREEZE:
    if not prev: raise SystemExit('✘ لا تجميدَ بلا مرجع ' + TAG)
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k263diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملفٍّ يدوي (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في k263diff.json', json.dumps({'changed-since-review': bad[:8], 'set': sorted(set(rec) ^ set(fps))[:8]}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب', [n for n in fps if not fps[n]['why']])

print('\n╔═ (د) المشتقّاتُ والإصدارُ والسقّاطاتُ والعقدُ ═╗')
W = rd(ROOT + '/workers/_worker.js')
chk = run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'])
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات = مصادرها (generate --check)')
ty = run(['node', 'tools/gen_types.mjs', '--check']); ok(ty.returncode == 0, '   src/types/kivo.d.ts = التوليد', ty.stdout.strip()[:120])
ic = run([sys.executable, 'tools/icons.py', 'check', '--src', 'src']); ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
ok("var WORKER_VER = '2026.10.12-163';" in W and "var ENF_VER = 'KIVO_263" in W, '   الخادم 2026.10.12-163 · ENF_VER KIVO_263')
ec = run([sys.executable, 'tools/empty_catch_ratchet.py', 'src']); ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
cr = run([sys.executable, 'tools/color_ratchet.py', 'src']); ok(cr.returncode == 0, '   لا لونَ خاماً جديداً (السقّاطة)', (cr.stdout or cr.stderr).strip().split('\n')[0][:120])
ev = run([sys.executable, 'tools/env_check.py', 'src']); ok(ev.returncode == 0 and 'wrangler.toml متّسق' in ev.stdout, '   مخطّطُ البيئة = العامل · wrangler.toml متّسق بلا أسرار', ev.stdout.strip()[-160:])
CT = json.load(open(ROOT + '/src/api/contracts.json', encoding='utf-8'))
exact = sorted(set(re.findall(r"path === '(/api/[a-z0-9/_-]+)'", W))); pref = sorted(set(re.findall(r"path\.indexOf\('(/api/[a-z0-9_-]+/)'\)", W)))
ok(sorted(r['path'] for r in CT['routes']) == sorted(exact + pref), '★ src/api/contracts.json = مساراتُ العامل حرفاً (' + str(len(CT['routes'])) + ') — لا مسارَ جديد')
if os.path.isdir(DIR):
    bj = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else None
    ok(bj is not None and bj['files']['_worker.js']['sha256'] == sha(open(ROOT + '/workers/_worker.js', 'rb').read()), '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js (الحزمةُ مبنيّةٌ من هذا المصدر)')
    ok(bj is not None and sorted(bj.get('retained', [])) == ['pk261', 'pk262'], '   نافذةُ الإصدارين: pk262 وpk261 (آخرُ إصدارين منشورَين على Preview)', bj and bj.get('retained'))
_doc = os.path.join(ROOT, 'docs/reference/v24_9_FINAL.html')
ok(os.path.exists(_doc) and sha(open(_doc, 'rb').read()) == '6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde', '   وثيقةُ v24.9 = المرجعُ بايتاً (SHA-256 6e9aba63…)')
sv = run([sys.executable, 'tools/sot_verify.py'])
ok(sv.returncode == 0, '★ SOT v6 متّسق (tools/sot_verify.py)', sv.stdout.strip().split('\n')[-1][:200])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
