# -*- coding: utf-8 -*-
"""KIVO_259 · AUD-030/SOT-089 (العدساتُ إضافات) · AUD-017 (طبقتا الرموز) · SOT-091 (قواعدُ الاعتماد) · إصلاحُ السقف المستعاد — إثباتُ الفرق بالضبط عن KIVO_258
   (الوسم git؛ KIVO_PREV_TAG يبدّله — مثلاً الفرع k258 قبل وسمه). الوسمُ والشجرةُ كلاهما بالوصول KIVO.X (AUD-016) فالفرقُ نصّيٌّ مباشر.
   (أ) الشجرة = الوسم عدا المعلن: اليدويةُ (CODE · ببصمة فرقٍ مراجَعة في k259diff.json) · المولَّدةُ بالأدوات (GEN) · الجديدةُ (NEW) — ولا ملفَّ كودٍ غيرَ متتبَّع.
   (ب) AUD-030: tools/plugins.py check · KIVO_LENS_PLUGINS في العامل = جدولُ الإضافات · LENS_REG في الواجهة = الإضافات · لا قائمةَ عدساتٍ حرفيّة في 331 ولا
       طبقة الإنفاذ (057/059/061/063) · الوحداتُ المرجعية (004–016) = الوسم بايتاً · pages.json بلا lenses · شجرةُ v24.9 = الاشتقاق.
   (ج) AUD-017: tools/tokens.py check (070/080 = التوليد · الحرفيةُ مستعارةٌ على الدلالية · الداكنُ عليها وحدها) · tokens verify مقابل الوسم: 0 فرقٍ محسوب
       (الجديدةُ معلنة changes-259.json) · خريطةُ وقت التشغيل (110 · __BS_TOK) = الوسم بايتاً.
   (د) SOT-091: tools/deps_check.py 0 مخالفة. (هـ) AUD-016 مستمرّ: kivo_ns --check (الملفاتُ المحرَّرة بعد التحويل معلنةٌ في after).
   (أ) AUD-029: النقلُ إلى البنية الرسمية آليّ — كلُّ ملفٍّ منقول = أصلُه في الوسم بعد إعادة كتابة المراجع (tools/restructure_official.rewrite) حرفاً،
       وكلُّ ملفٍّ أُعيدت كتابةُ مراجعه وحدها كذلك؛ وما عُدِّل بعد النقل معلنٌ ببصمة فرقه عن أصله المُعاد كتابتُه.
   (و) المشتقّات · الفهرس · الإصدار 159/259 · catch الفارغ · البيئة · العقد = مساراتُ العامل · الحزمةُ من هذا المصدر.
       python3 tests/source/k259src.py [pk259] [--freeze]"""
import os, sys, hashlib, subprocess, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk259'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_258')
FREEZE = '--freeze' in sys.argv
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
gitb = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, cwd=ROOT).stdout
run = lambda cmd: subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')

print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا المعلن ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   المرجعُ ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q and os.path.exists(os.path.join(ROOT, q))}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
CODE = sorted(['src/core/270-bs-ver.js', 'workers/parts/002-seclog.js', 'workers/parts/056-enforce.js',                                   # الإصدار
               'workers/parts/057-enf-index.js', 'workers/parts/059-protected-ops-2.js', 'workers/parts/061-enf-read.js', 'workers/parts/063-enf-api-and-handler.js',
               'workers/parts.json', 'src/permissions/331-perm-model.js', 'src/manifests/pages.json', 'src/schemas/pages.schema.json', 'src/plugins/README.md',  # AUD-030
               'src/styles/tokens/tokens.json', 'src/schemas/tokens.schema.json',                                                                        # AUD-017 (tokens.py semanticize)
               'src/core/050-dc-runtime.js',                                                                                                             # SOT-091
               'src/services/320-dept-storage.js', 'src/layouts/root-logic.js',                                                                          # الإصلاح
               'tools/generate.py', 'tools/perm_tree.py', 'tools/gen_types.mjs', 'tools/tokens.py', 'tools/kivo_ns.json',                                # الأدوات
               'tools/sec/secrets_scan.py', 'tools/kivo_ns.mjs', 'config/wrangler.toml',
               'workers/parts/001-policy.js', 'src/modules/admin/logic.js',
               'src/components/660-a11y-enhancer.js', 'src/layouts/helmet-global.css',                                              # إصلاحان كشفهما k258layout
               'workers/parts/054-image-contract.js',
               'src/modules/admin/helmet.css',
               'src/modules/tasks/logic.js'])   # المهام: أولويةٌ/حالةٌ خارج القائمة لا تُسقط الصفحة (كشفته k259journeys)   # شجرةُ v24.9 على الجوال (المسارُ يُخفى تحت 640px — لقطةُ المراجعة k259shots)                                                                                  # إصلاحٌ كشفه k258load (تحديثٌ ضائع)                                                                                                             # AUD-029
GEN = sorted(['workers/_worker.js', 'src/styles/070-theme-tokens.css', 'src/styles/080-theme-dark.css', 'src/types/kivo.d.ts',
             'src/manifests/255-page-manifest.js', 'workers/parts/051a-schema-migrations.js',   # الأخيران: رأسُ المولَّد «بأداة tools/generate.py» (AUD-029)
             'src/pages/Admin.dc.html', 'src/pages/Tasks.dc.html'])   # الصفحةُ المولَّدة من src/modules/admin/logic.js (تسميةُ حقل pwMin — الإصلاح) — generate --check يُثبت أنها = توليدُ وحدتها
PAGES_GEN = {'src/pages/Admin.dc.html': 'src/modules/admin/logic.js', 'src/pages/Tasks.dc.html': 'src/modules/tasks/logic.js'}   # صفحةٌ مولَّدة ← وحدتُها المعدَّلة (المعلنة في CODE)
NEW = sorted(['src/plugins/lenses/' + k + '/manifest.json' for k in ('zones', 'paths', 'gates', 'marks', 'dist', 'dens')] +
             ['src/schemas/lens-plugin.schema.json', 'workers/parts/006a-lens-plugins.js', 'src/styles/tokens/changes-259.json',
              'tools/plugins.py', 'tools/trace.py', 'tools/deps_check.py', 'tools/test_catalog.py',
              'tools/restructure_official.py', 'tools/sot_render.py', 'tools/sot_verify.py', 'tools/sec/audit.py', 'tools/export_official.py'])
import importlib.util as _ilu
_sp = _ilu.spec_from_file_location('restructure_official', os.path.join(ROOT, 'tools', 'restructure_official.py')); RO = _ilu.module_from_spec(_sp); _sp.loader.exec_module(RO)
tagtxt = lambda path: subprocess.run(['git', 'show', TAG + ':' + path], capture_output=True, cwd=ROOT).stdout.decode('utf-8')
MOVED = {}                                                                             # الموضعُ الجديد ← الأصلُ في الوسم (AUD-029)
for _s, _d in RO.MOVES:
    for _o in [l for l in git('ls-tree', '-r', '--name-only', TAG, '--', _s.rstrip('/')).split('\n') if l]:
        MOVED[_d + _o[len(_s):] if _s.endswith('/') else _d] = _o
MOVED_EDIT = sorted(['tools/sot.py', 'tools/env_check.py', 'tools/sbom.py', 'tools/build_chain.sh', 'tools/onboard_check.sh'])                                                  # منقولٌ ثم معدَّل (بصمةُ فرقه عن أصله المُعاد كتابتُه)
mech_moved = sorted(k for k in diff if k in MOVED and k not in prev and k in cur and k not in MOVED_EDIT and rd(os.path.join(ROOT, k)) == RO.rewrite(k, tagtxt(MOVED[k])))
moved_from = sorted(k for k in diff if k in prev and k not in cur and k in MOVED.values())
mech_rewr = sorted(k for k in diff if k in prev and k in cur and k not in CODE and k not in GEN and rd(os.path.join(ROOT, k)) == RO.rewrite(k, tagtxt(k)) != tagtxt(k))
ok(len(mech_moved) + len(MOVED_EDIT) == len([k for k in MOVED if k.startswith(CODE_DIRS)]) and len(moved_from) == len([v for k, v in MOVED.items() if v.startswith(CODE_DIRS)]),
   '★ AUD-029: المنقولُ إلى tools/ (' + str(len(mech_moved) + len(MOVED_EDIT)) + ') = أصلُه في الوسم بعد إعادة كتابة المراجع حرفاً (عدا المعلن بعد النقل: ' + ', '.join(MOVED_EDIT) + ') · الأصلُ غائب',
   json.dumps({'notMechanical': sorted(k for k in MOVED if k.startswith(CODE_DIRS) and k not in mech_moved and k not in MOVED_EDIT)}, ensure_ascii=False))
ok(True, '   مراجعُ أُعيدت كتابتُها وحدها (آلياً): ' + str(len(mech_rewr)) + ' ملفَّ كود — ' + ', '.join(mech_rewr[:6]))
want = sorted(set(CODE + GEN + NEW + mech_moved + MOVED_EDIT + moved_from + mech_rewr))
ok(diff == want and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = المعلنة فقط (' + str(len(CODE)) + ' يدوياً · ' + str(len(GEN)) + ' بالأدوات · ' + str(len(NEW)) + ' جديدة) · لا غيرَ متتبَّع',
   json.dumps({'extra': [k for k in diff if k not in want], 'missing': [k for k in want if k not in diff], 'untracked': untracked}, ensure_ascii=False))
ok(all(k in cur and k not in prev for k in NEW), '   الجديدةُ جديدة (' + str(len(NEW)) + ')')
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'KIVO.__BS_VER = "2026.10.10-259";', '   الإصدار 2026.10.10-259')
pages_changed = [k for k in cur if k.startswith('src/pages/') and prev.get(k) != cur.get(k)]
ok(sorted(pages_changed) == sorted(PAGES_GEN) and all(PAGES_GEN[k] in CODE for k in PAGES_GEN),
   '   الصفحاتُ المولَّدة (src/pages) = الوسم بايتاً عدا صفحةِ وحدةٍ معدَّلةٍ معلنة (' + ', '.join(k + ' ← ' + v for k, v in PAGES_GEN.items()) + ')', pages_changed)

print('\n╔═ (ب) AUD-030: العدساتُ إضافات ═╗')
pc = run([sys.executable, 'tools/plugins.py', 'check'])
ok(pc.returncode == 0 and '6 عدسة' in pc.stdout, '★ tools/plugins.py check: المخطّط · السجلّ · جداولُ الحارس المرجعي · الاختبارات', pc.stdout.strip().split('\n')[-1][:200])
sys.path.insert(0, os.path.join(ROOT, 'tools')); import plugins as PL
W = rd(ROOT + '/workers/_worker.js'); m = re.search(r'var KIVO_LENS_PLUGINS = (\{.*?\});\n', W)
ok(m is not None and json.loads(m.group(1)) == PL.table(os.path.join(ROOT, 'src')) and W.count('var KIVO_LENS_PLUGINS = ') == 1, '★ KIVO_LENS_PLUGINS في العامل = جدولُ الإضافات (مرّةً واحدة)')
blk = rd(ROOT + '/src/manifests/255-page-manifest.js'); data = json.loads(blk[blk.rindex('})(') + 3: blk.rindex(');')])
ok(data['lenses'] == [{'key': x['key'], 'name': x['name']} for x in PL.load(os.path.join(ROOT, 'src'))], '   LENS_REG في الواجهة (KIVO_MANIFEST.lenses) = الإضافات')
pj = json.load(open(ROOT + '/src/manifests/pages.json', encoding='utf-8'))
ok('lenses' not in pj, '   pages.json بلا lenses (مصدرٌ واحد — المولِّدُ يرفض الاثنين)')
lit = []
for f in ['src/permissions/331-perm-model.js'] + ['workers/parts/' + x for x in ('057-enf-index.js', '059-protected-ops-2.js', '061-enf-read.js', '063-enf-api-and-handler.js')]:
    t = re.sub(r'/\*[\s\S]*?\*/', '', rd(ROOT + '/' + f))
    if re.search(r"'zones',\s*'paths',\s*'gates'|zones:\s*1,\s*paths:\s*1|zones:\s*true,\s*gates|V\.lens\.(zones|dens|dist)\b|ENF_D(IST|ENS)_KEYS", t): lit.append(f)
ok(not lit, '★ لا قائمةَ عدساتٍ ولا حقلَ عدسةٍ حرفيّاً في 331 وطبقة الإنفاذ', lit)
refp = ['workers/parts/' + f for f in sorted(os.listdir(ROOT + '/workers/parts')) if re.match(r'0(0[4-9]|1[0-6])-', f)]
ok(refp and all(prev.get(f) == cur.get(f) for f in refp), '★ الوحداتُ المرجعية v24.9 (' + str(len(refp)) + ' جزءاً: السجلّ · الحرّاس · البناء · النطاق · الترحيل · الهوية · التمهيد) = الوسم بايتاً', [f for f in refp if prev.get(f) != cur.get(f)])
pt = run([sys.executable, 'tools/perm_tree.py', 'check'])
ok(pt.returncode == 0, '   شجرةُ v24.9 = الاشتقاق (العدساتُ من الوثيقة كما هي)', pt.stdout.strip()[-120:])

print('\n╔═ (ج) AUD-017: طبقتا الرموز ═╗')
tc = run([sys.executable, 'tools/tokens.py', 'check', 'src'])
ok(tc.returncode == 0, '★ tools/tokens.py check: 070/080 = التوليد · كلُّ حرفيٍّ مستعارٌ على دلالي · الداكنُ على الدلالية وحدها', tc.stdout.strip()[:220])
tv = run([sys.executable, 'tools/tokens.py', 'verify', 'src', 'git:' + TAG, '--declared', 'src/styles/tokens/changes-259.json'])
ok(tv.returncode == 0 and ' 0 فرق منها 0 ' in tv.stdout and 'داكن: 0 منها 0' in tv.stdout, '★ tokens verify مقابل ' + TAG + ': 0 فرقٍ محسوب في الفاتح والداكن · الجديدةُ معلنة', tv.stdout.split('\n')[0][:220])
ok(prev.get('src/core/110-theme-prepaint.js') == cur.get('src/core/110-theme-prepaint.js'), '   خريطةُ وقت التشغيل (110 · __BS_TOK) = الوسم بايتاً — الأسماءُ الحرفية كما هي (مستعارة)')

print('\n╔═ (د) SOT-091 قواعدُ الاعتماد · (هـ) AUD-016 ═╗')
dc = run([sys.executable, 'tools/deps_check.py'])
ok(dc.returncode == 0, '★ tools/deps_check.py: R1–R4 · 0 مخالفة', dc.stdout.strip().split('\n')[-1][:200])
ns = run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--check'])
ok(ns.returncode == 0, '★ kivo_ns --check: الطبقة = التوليد · الكتابةُ تامّة · الصورةُ القانونية = المرجع عدا المعلن بعد التحويل', ns.stdout.strip().split('\n')[-1][:220])

print('\n╔═ بصماتُ الفروق المراجَعة ═╗')
FP = ROOT + '/tests/source/k259diff.json'
REASONS = {
 'workers/parts/002-seclog.js': 'الإصدار 2026.10.10-159', 'workers/parts/056-enforce.js': 'ENF_VER KIVO_259',
 'workers/parts/057-enf-index.js': 'AUD-030: enfPlugLensOf — مفتاحُ عدسة إضافةٍ ⇒ عدستُها (بعد المرجع)',
 'workers/parts/059-protected-ops-2.js': 'AUD-030: enfPlugOps — حقولُ العدسات الجديدة تُصنَّف بمفاتيحها (جدولٌ فارغٌ للمضمَّنة)',
 'workers/parts/061-enf-read.js': 'AUD-030: أعمدةُ العناصر وأقنعةُ حقول العدسات والإسقاطُ والدمج من KIVO_LENS_PLUGINS (التفاضلُ مع 258 حرفاً)',
 'workers/parts/063-enf-api-and-handler.js': 'AUD-030: عدساتُ me من الإضافات (الترتيبُ نفسُه) · إصلاح: pwMin ثابتٌ 6 في حفظ السياسات (قفلُ مدير النظام) · إصلاح: «آخرُ نشاط» في الحضور من aud (كان من audit المهجور فارغاً دائماً) · المراجعةُ الأمنية المستقلة: SR-1 الرقمُ الوظيفي لغير صاحبه ومدير النظام يُنزع في /api/get والإقلاع · SR-6 لا نصَّ خطأٍ داخلي في استجابات 500 (السجلُّ وحده بالمعرّف rid)',
 'workers/parts.json': 'AUD-030: الجزءُ المشتقّ 006a-lens-plugins.js بعد 006 · AUD-029: generated = tools/generate.py',
 'src/permissions/331-perm-model.js': 'AUD-030: P24_LENSES = LENS_KEYS · النمطُ «ميداني» = كلُّ العدسات',
 'src/manifests/pages.json': 'AUD-030: lenses انتقلت إلى plugins/lenses · AUD-029: generated = tools/generate.py', 'src/schemas/pages.schema.json': 'AUD-030: lenses خارج pages.json',
 'src/plugins/README.md': 'AUD-030: وصفُ الإضافات', 'src/schemas/tokens.schema.json': 'AUD-017: layers=2 · «from» للدلالية الجديدة', 'src/styles/tokens/tokens.json': 'AUD-017: tokens.py semanticize (الحرفيةُ مستعارة · 290 دلالياً جديداً · الداكنُ على الدلالية)',
 'src/core/050-dc-runtime.js': 'SOT-091: وقتُ التشغيل مالكُ إشارات الإبطال (يعرّفها بالصيغة نفسِها)',
 'src/services/320-dept-storage.js': 'إصلاح: permSlice — شريحةُ صلاحيات نسخة الإدارة بمفاتيح المنصة الحالية',
 'src/layouts/root-logic.js': 'إصلاح: الاستعادةُ عبر D.permSlice (كانت قائمتين حرفيّتين أقدم)',
 'tools/generate.py': 'AUD-030: LENS_REG من الإضافات · الجزءُ 006a · فحصُ الإضافات مع --check · AUD-029: رأسُ المولَّد «بأداة tools/generate.py»', 'tools/perm_tree.py': 'AUD-030: عدسةُ إضافةٍ خارج الوثيقة تُلحق بحاوية العدسات',
 'tools/gen_types.mjs': 'AUD-030: KivoLensKey من الإضافات + KivoLensPlugin', 'tools/tokens.py': 'AUD-017: semanticize · check · table',
 'tools/kivo_ns.json': 'AUD-016: after += 050 · 320 · 331 · root-logic · admin/logic (259: تسميةُ pwMin) · 660 (الحاشيةُ اللمسية) — والملاحظة',
 'tools/kivo_ns.mjs': 'AUD-029: المستودعُ الرسمي وحده (بلا تاريخ git) — الأسماءُ من الطبقة والملفاتُ من الشجرة · يُفحص ما لا يحتاج التاريخ (برهانُ المرجع في الانتقالي)',
 'tools/sec/secrets_scan.py': 'AUD-029: STRICT += tests/baselines/ (خطوطُ الأساس المنقولة صارمةٌ كما كانت في lint/) — البادئاتُ القديمة باقية · سطرُ النتيجة الموحَّد (تجمعه البوابة)',
 'tools/onboard_check.sh': 'الافتراضيُّ 259 (كان 255) · الفحوصُ الساكنة npm run lab:static (سكربتاتُ المختبر lab:* — AUD-029)',
 'config/wrangler.toml': 'AUD-029: مرجعُ tools/env_check.py · مجلدُ البناء pk259 (كان pk255)',
 'workers/parts/001-policy.js': 'إصلاح: PW_MIN ثابتٌ 6 حتى لقيمةٍ مخزَّنةٍ أكبر (قفلُ مدير النظام — كشفه التدقيقُ المستقل)',
 'src/modules/admin/logic.js': 'إصلاح: تسميةُ حقل pwMin «ثابتٌ وفق قاعدة المنصة»',
 'src/components/660-a11y-enhancer.js': 'إصلاح (كشفه k258layout): الحاشيةُ اللمسية لكل جهةٍ على حدة لا تتجاوز نصفَ الفجوة إلى الجار — كانت حاشيةُ «إنقاص» تغطي «زيادة» فنقرُ «+» يُنقص على اللمس',
 'workers/parts/054-image-contract.js': 'إصلاح (كشفه k258load · SOT-150): مجموعةُ عبارات كلِّ مفتاح في معاملةٍ واحدة يتقدّمها حارسُ النسخة (revGuard — مقارنةٌ ومبادلة) · commitGroups · المسبوقُ بين القراءة والكتابة يُردّ تعارضاً — كان حفظان متزامنان على النسخة نفسِها يُكتبان معاً (تحديثٌ ضائع: 255 = 697 زيادةً «ناجحة» والعدّادُ 327) · إصلاحان كشفهما التقييمُ المستقل: قفلُ الدخول ذرّيٌّ قبل التحقق البطيء (guardLeft/guardFail/guardCount — login_burst) · «مَن سبقك» في التعارض من aud لا من audit المهجور · المراجعةُ الأمنية المستقلة: SR-1 الرقمُ الوظيفي «no» لغير صاحبه ومدير النظام لا يغادر الخادم (usersNoOut في الرفض/التعارض) ويُورَث عند الكتابة (usersNoIn) · SR-8 اسمُ الدخول فريد (usersDupNew) · SR-2 حرّاسُ العملية المحمية كلُّها قبل أوّل دفعة (commitGroups)',
 'src/modules/tasks/logic.js': 'إصلاحٌ كشفته رحلاتُ k259journeys: سجلُّ مهمةٍ بأولويةٍ أو حالةٍ خارج القائمة (بياناتٌ مستوردة أو قديمة — بذرةُ الاختبار «med») كان يُسقط صفحةَ المهام كلَّها («Cannot read properties of undefined») ⇒ تُعرض «عادي»/«معلّقة» ويبقى الحقلُ كما هو',
 'src/modules/admin/helmet.css': 'شجرةُ v24.9 على الجوال (كشفتها لقطاتُ المراجعة cfbench/k259shots.mjs): المسارُ (#/…) في صفّ الورقة كان يدفع العدَّ وزرَّ الفتح إلى سطرٍ ثانٍ على 390px — يُخفى تحت 640px (نقطةٌ من المقياس) وفي سطح المكتب كما هو',
 'src/layouts/helmet-global.css': 'إصلاحان (كشفهما k258layout): .bs-tap::after بأربع جهات (--bs-tt/tb/tl/tr) · شريطُ التلميح safe center بمحدِّدٍ يطابق سمةَ React المسافيّة (كان لا يطابق قط فبدايةُ التلميح مقصوصةٌ على الجوال) · تصحيحٌ كشفته R191: قاعدةُ safe center تستثني أشرطةَ التبويبات (.bs-tabstrip) فيبقى سلوكُها المصمَّم — على الجوال تبدأ من أوّل تبويب',
 'tools/build_chain.sh': 'نافذةُ الإصدارين = المُبقاةُ المعلنة في build:N (259 يُبقي 255 و254 المنشورَين — 256–258 مراحلُ داخلية)',
 'tools/sbom.py': 'AUD-029: عُدّةُ cfbench (المختبر) إن وُجدت — المستودعُ الرسمي وحده يولّد ويقارن وقتَ التشغيل وأدواتِه',
 'tools/env_check.py': 'AUD-029: الافتراضيُّ src (كان k249/src — مسارُ مختبر)',
 'tools/sot.py': 'خللٌ أُصلح (259): العرضُ يكتب CSV من JSON ثم اللوحةَ ثم التحقّقَ المستمرّ (tools/sot_verify.py) ويفشل عند أيّ إخفاق — كان محقِّقُ لقطة الإنشاء يُخفق بصمت وCSV ثابتاً منذ RM-0',
}
fps = {}
for name in CODE:
    if name == 'src/core/270-bs-ver.js': continue
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
import difflib
for name in MOVED_EDIT:                                                                # منقولٌ ثم معدَّل: الفرقُ عن أصله بعد إعادة كتابة المراجع
    _o = RO.rewrite(name, tagtxt(MOVED[name])); _n = rd(os.path.join(ROOT, name))
    d = ''.join(difflib.unified_diff(_o.splitlines(True), _n.splitlines(True), MOVED[name] + ' (بعد إعادة كتابة المراجع)', name)).encode('utf-8')
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
if FREEZE:
    if not prev: raise SystemExit('✘ لا تجميدَ بلا مرجع ' + TAG)
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k259diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملفٍّ يدوي (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في k259diff.json', json.dumps({'changed-since-review': bad[:5]}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب', [n for n in fps if not fps[n]['why']])

print('\n╔═ (و) المشتقّاتُ والفهرسُ والإصدارُ والسقّاطاتُ والعقد ═╗')
chk = run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'])
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات = مصادرها (generate --check · ومعه المخطّطات والإضافات)')
ty = run(['node', 'tools/gen_types.mjs', '--check']); ok(ty.returncode == 0, '   src/types/kivo.d.ts = التوليد', ty.stdout.strip()[:120])
ic = run([sys.executable, 'tools/icons.py', 'check', '--src', 'src']); ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
ok("var WORKER_VER = '2026.10.10-159';" in W and "var ENF_VER = 'KIVO_259 · enforce 2" in W, '   الخادم 2026.10.10-159 · ENF_VER KIVO_259')
ec = run([sys.executable, 'tools/empty_catch_ratchet.py', 'src']); ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
cr = run([sys.executable, 'tools/color_ratchet.py', 'src']); ok(cr.returncode == 0, '   لا لونَ خاماً جديداً (السقّاطة)', (cr.stdout or cr.stderr).strip().split('\n')[0][:120])
ev = run([sys.executable, 'tools/env_check.py', 'src']); ok(ev.returncode == 0 and 'wrangler.toml متّسق' in ev.stdout, '   مخطّطُ البيئة = العامل · wrangler.toml متّسق بلا أسرار', ev.stdout.strip()[:160])
CT = json.load(open(ROOT + '/src/api/contracts.json', encoding='utf-8'))
exact = sorted(set(re.findall(r"path === '(/api/[a-z0-9/_-]+)'", W))); pref = sorted(set(re.findall(r"path\.indexOf\('(/api/[a-z0-9_-]+/)'\)", W)))
ok(sorted(r['path'] for r in CT['routes']) == sorted(exact + pref), '★ src/api/contracts.json = مساراتُ العامل حرفاً (' + str(len(CT['routes'])) + ')')
if os.path.isdir(DIR):
    bj = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else None
    ok(bj is not None and bj['files']['_worker.js']['sha256'] == sha(open(ROOT + '/workers/_worker.js', 'rb').read()), '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js (الحزمةُ مبنيّةٌ من هذا المصدر)')
print('\n╔═ (ز) AUD-029 البنيةُ الرسمية ═╗')
rs = run([sys.executable, 'tools/restructure_official.py'])
ok(rs.returncode == 0 and 'مدخلاتُ الجذر الرسمية: 15 ' in rs.stdout, '★ tools/restructure_official.py: لا مرجعَ قديماً في الملفات الرسمية · المجموعاتُ المنقولة غائبة · مدخلاتُ الجذر الرسمية 15', rs.stdout.strip()[-200:])
_doc = os.path.join(ROOT, 'docs/reference/v24_9_FINAL.html')
ok(os.path.exists(_doc) and sha(open(_doc, 'rb').read()) == '6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde', '   وثيقةُ v24.9 في المستودع الرسمي = المرجعُ بايتاً (SHA-256 6e9aba63…)')
sv = run([sys.executable, 'tools/sot_verify.py'])
ok(sv.returncode == 0, '★ SOT v6 متّسق (tools/sot_verify.py: الهوية · v5 · التدقيق محفوظ · الحالة = آخرُ تحقّق · لا ترقيةَ بلا دليل · CSV = JSON · HTML يضمّنه)', sv.stdout.strip().split('\n')[-1][:200])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
