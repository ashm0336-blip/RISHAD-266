# -*- coding: utf-8 -*-
"""KIVO_264 · سقّالةُ الإصدار (الإصدار 264/164 · ENF_VER KIVO_264 · الافتراضيّات 264) — وتُمدَّد عند الدمج بقواعد تيّارات 264 —
   إثباتُ الفرق بالضبط عن KIVO_263 (الوسم git؛ KIVO_PREV_TAG يبدّله).
   (أ) الشجرة = الوسم عدا المعلن: كلُّ ملفٍّ متغيّر يطابق قاعدةً معلنةً واحدة بسببها (يدويٌّ ببصمة فرقٍ مراجَعة في k264diff.json · مولَّدٌ بأداة · جديد)
   (ب) ثوابتُ 263 كما هي: الإضافات · الوحداتُ المرجعية v24.9 بايتاً · شجرةُ v24.9 = الاشتقاق · طبقتا الرموز (0 فرقٍ محسوب) · قواعدُ الاعتماد · AUD-016
       + ما أثبته k263src ساكناً (SOT-190 · SOT-188/ADR-031 · مخطّطاتُ الأجسام · جزءُ المصادقة · علامتا أداة الاختبار · ترحيلاتُ العميل · ختمُ التصدير)
   (ج) 264 نفسُه ساكناً: السقّالة (البوابةُ وقائمتُها الإلزامية · CI · سكربتاتُ npm · الإصدار) — وإثباتاتُ كلّ تيّارٍ تُضاف عند الدمج (علامة KIVO_264-merge)
   (د) المشتقّات · الإصدار 164/264 · السقّاطات · البيئة · العقد = مساراتُ العامل · الحزمةُ من هذا المصدر · SOT v6
       python3 tests/source/k264src.py [pk264] [--freeze[=GLOB]] [--explain]
   إضافةُ قاعدة عند الدمج (سطرٌ واحد في كتلة تيّاره في RULES_BY_STREAM — النمط · النوع · السبب):
     1) python3 tests/source/k264src.py --explain     ← كلُّ ملفٍّ متغيّر وقاعدتُه، والملفُّ غيرُ المعلن مع سطرِ قاعدةٍ مقترحٍ للّصق
     2) أضف السطرَ بسببه الحقيقي (CODE يدويّ · GEN بأداةٍ مسمّاة يفحصها (د) · NEW ملفٌّ لم يكن في الوسم · VER رقمُ الإصدار)
     3) راجع الفرق (git diff KIVO_263 -- <الملف>) ثم جمّد بصمتَه وحده: --freeze=<الملف أو النمط> (و--freeze وحده يجمّد الكلّ كما في 263)
   الأنواع: CODE يدويٌّ ببصمة فرقٍ مجمَّدة · GEN بأداةٍ مسمّاة (المولِّد/الأنواع — يفحصها (د)) · NEW ملفٌّ جديد (يُخفق إن كان في الوسم) · VER رقمُ الإصدار"""
import os, sys, hashlib, subprocess, json, re, fnmatch
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk264'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_263')
FREEZE = next((a for a in sys.argv[1:] if a == '--freeze' or a.startswith('--freeze=')), None)
FREEZE_GLOB = FREEZE.split('=', 1)[1] if FREEZE and '=' in FREEZE else '*'
EXPLAIN = '--explain' in sys.argv
VER_UI, VER_W, ENF_TAG, N = '2026.10.13-264', '2026.10.13-164', 'KIVO_264', '264'
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
run = lambda cmd: subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')
# ── القواعدُ المعلنة لكل تيّار: (النمط · النوع · السبب). الأولى المطابِقة تحكم — فالخاصُّ قبل العامّ داخل كل كتلة، والكتلةُ العامة «derived» آخراً.
#    كلُّ تيّارٍ يضيف أسطرَه في كتلته وحدها (لا تعارضَ دمجٍ بين التيّارات) — والفارغةُ تنتظر الدمج (KIVO_264-merge).
RULES_BY_STREAM = {
 'scaffold': [   # QA/الإصدار (k264-qa): رقمُ الإصدار والافتراضيّات — كما سقّالةُ 263 (91f3c9f) بلا تغييرٍ وظيفي
  ('src/core/270-bs-ver.js', 'VER', 'الإصدار ' + VER_UI),
  ('workers/parts/002-seclog.js', 'CODE', 'WORKER_VER ' + VER_W),
  ('workers/parts/056-enforce.js', 'CODE', 'ENF_VER ' + ENF_TAG + ' (+ الرموز read-ceiling · self-fields · az-staffing عند الدمج)'),
  ('config/wrangler.toml', 'CODE', 'مجلدُ البناء pk264'),
  ('tools/perf_budget.json', 'CODE', 'ق-264-perf: رفعُ سقفَي page:Profile والعامل وحدهما بقرارٍ مكتوب (reports/k264/decisions.md) — وبقيةُ السقوف كما في 263'),
  ('tools/sec/audit.py', 'CODE', 'الافتراضيُّ pk264'), ('tools/onboard_check.sh', 'CODE', 'الافتراضيُّ 264'),
  ('tools/ux_states.py', 'CODE', 'نصُّ docs/ux-states.md المولَّد يشير إلى «npm run check» لا إلى check:263 (لا رقمَ إصدارٍ مثبّت)'),
 ],
 'server': [     # G1 الخادم (SOT-101 مخطّطاتُ الأجسام · D14 الحقولُ الذاتية · QA-264-D1 · العقود C1/C2/C3) — الإسقاطُ وAUD-044 لم يُنفَّذا بقرار المالك
  ('workers/parts/063-enf-api-and-handler.js', 'CODE', 'C1 (save uid ⇒ 409 session-changed) · C2 (changes/get: more و v = آخرُ مراجعةٍ مضمَّنة) · C3 (GET / ⇒ 503 عند تعذّر D1) · SOT-101 bodyCheck للمسارات الباقية · uid للقراءة · az-staffing: enfShiftBound/enfShiftSig/enfStaffAz (ورديةُ الفاعل المربوطة بالجدول الشهري · depts[d].sb)'),
  ('workers/parts/062a-auth-routes.js', 'CODE', 'تيّارُ «ملفي» (OD-3): سطرُ توجيه /api/me/today و/api/me/history إلى meSelfRoutes (062b) وحده — مخطّطاتُ SOT-101 في 051b/063'),
  ('workers/parts/051b-body-schemas.js', 'CODE', 'SOT-101: مخطّطاتُ الأجسام للمسارات المغيِّرة الباقية + العقدُ الخامّ للصورة'),
  ('workers/parts/054-image-contract.js', 'CODE', 'SOT-101: Content-Type للصورة (text/plain أو غائب ⇒ وإلا 415 قبل قراءة الجسم) · D14/OD-7: selfCurState — تحقّقُ cur بحارس pw:<uid> واستثناءُ الدخول الأول (≤ 15 دقيقة) · الحارسُ المقفل ⇒ locked (self-lock · F6) · «يجب التغيير» = قاعدةُ /api/login حرفاً (run1b · bkstamp: الحسابُ القديم dept)'),
  ('workers/parts/047-retro.js', 'CODE', 'SOT-101: جسمُ /api/retro بمخطّط'),
  ('workers/parts/044-protected-ops.js', 'CODE', 'D14: مديرُ النظام في نطاقه العام — تغييرُ اسم دخوله هو يشترط cur وصيغةَ 10 أرقام (superSelfWhy) · usersRule يتسلّم ctx'),
  ('workers/parts/059-protected-ops-2.js', 'CODE', 'D14 · OD-7: حفظُ الذات في الإنفاذ عبر selfAcctWhy (018) بحالة cur من الحفظ (ctx.selfCur — تُحسب في 054) بدل eqExcept(SELF_FIELDS)'),
  ('workers/parts/017-authorize-core.js', 'CODE', 'D14: الحقولُ الذاتية حسب الدور'),
  ('workers/parts/018-ancestry.js', 'CODE', 'D14: الحقولُ الذاتية حسب الدور (القديم) · self-lock حين يُقفل حارسُ كلمة المرور (F6)'),
  ('workers/parts/050-read-map.js', 'CODE', 'QA-264-D1: resOnCeiling المشتركُ بين canRead0 وcanReadEnf (لا تغيير في القديم)'),
  ('workers/parts/061-enf-read.js', 'CODE', 'QA-264-D1: قراءةُ الإنفاذ تتبع سقفَ الإدارة كالقديم حرفاً (resOnCeiling · 050)'),
  ('src/schemas/api/bodies.schema.json', 'CODE', 'SOT-101: مخطّطاتُ الأجسام للمسارات الباقية + uid/cur في /api/save + العقدُ الخامّ للصورة'),
  ('src/api/contracts.json', 'CODE', 'عقودُ 264: C1/C2/C3 · SOT-101 · /api/me/today و/api/me/history · /api/sec لمدير النظام وحده'),
  ('src/observability/events.json', 'CODE', 'السجلُّ المركزي (SOT-124/143 · obs_check — البوابة run2): حدثا 264 session-changed (C1 · 409) وshell-no-db (E2 · 503) بمستواهما وحقولهما'),
 ],
 'profile': [    # «ملفي» (التكليف §3): src/modules/profile/* · بياناتُ «السجل» ومسارُ قراءته · «موقعك اليوم» · «أيام الراحة»
  ('workers/parts/062b-me-history.js', 'NEW', 'OD-3: مسارا القراءة الذاتية /api/me/today و/api/me/history — صفوفُ صاحب الجلسة وحدها بمعرّفٍ ثابت (ekey = eid ثم nid · لا اسم) · رقمُ الهوية رمزٌ إن تفرّد ومفتاحُ غيرِ المرتبط لا يُقرأ به إن طالب به سجلّ (مراجعةُ SR-2.1 · F-1)'),
  ('src/modules/profile/logic.js', 'CODE', 'التكليف §3: الربطُ بالمعرّف الثابت (D1–D4) · الزملاء (D5) · «موقعك المُسنَد» (D6) · التفاصيلُ داخل الصفحة (D7) · لا مسودةَ موقعاً (D8) · «أسبوعك» بلا اختلاق (D9) · بطاقاتُ المدير-الموظف (D10) · «السجل»'),
  ('src/modules/profile/view.html', 'CODE', 'التكليف §3: أزرارُ «الإدارة · بياناتي · الأمان · السجل» · «تفاصيل موقعك» · أقسامُ «بياناتي» و«الإدارة» · «السجل» بمرشّحاته ووسومه'),
  ('src/modules/profile/helmet.css', 'CODE', 'التكليف §3: لوحةُ «السجل» ووسومُ الدليل وشبكةُ الشهر وقواعدُ 320–360px'),
  ('src/modules/profile/meta.json', 'CODE', 'ميثاقُ الوحدة: المساران الذاتيان والاختبارات'),
  ('src/services/535-profile-facts.js', 'NEW', 'خدمةٌ نقية: ترشيحُ الزملاء · حلُّ مصدر الموقع · طبقتا الأسبوع · نموذجُ عرض «السجل» · PF-CORE = 062b حرفاً (F-1) · وسمُ التنقّل current لا none (F8)'),
  ('src/auth/330-auth.js', 'CODE', 'D13: تغييرُ اسم الدخول يتحقّق من كلمة المرور الحالية (saveCur — تُستهلك مرةً واحدة · F4) · هويةُ الواجهة من BOOT.uid · نصوصُ self/self-cur/self-un/self-lock (F6)'),
  ('src/auth/335-identity-gate.js', 'CODE', 'D14 · F3: بعد حفظ تغيير الدخول الأول يُقرأ السجلُّ المخزَّن — إن لم يثبت (رُفض أو انقضت المهلة) تبقى علامةُ «يجب التغيير» ويُعاد الدخول'),
  ('src/blocks.json', 'CODE', 'تسجيلُ 535-profile-facts في ترتيب التحميل'),
  ('src/layouts/index.template.html', 'CODE', 'تسجيلُ 535-profile-facts في الغلاف'),
  ('src/assets/icons/catalog.json', 'CODE', 'أيقوناتُ «السجل» (icons.py extract)'),
 ],
 'arch': [       # المعمارية السحابية (التكليف §2): التخزينُ المحلي/المزامنة إن ثبت خللٌ يُصلَح
  ('src/api/280-server-storage.js', 'CODE', 'D-6 دمجُ القوائم بخريطة هويةٍ لكل مورد (لا يضيع تعديل · إشعارُ الطرفين) · D-2 لا نظامَ محلياً على الأصل السحابي · D-3 uid في الحفظ و409 · D-1 تتبّعُ more · D-4 تحديثُ مجموعة القراءة · مراجعةُ A2–A7 · خطّافُ cur (D14) ونصوصُ self-cur/self-un/self-lock (F6)'),
  ('src/services/320-dept-storage.js', 'CODE', 'D-7: الإدارةُ النشطة لكل تبويب (sessionStorage) — الجهازُ افتراضٌ للتبويب الجديد'),
  ('src/services/332-find-day.js', 'CODE', 'D-5: «اليوم المختار» لكل مستخدمٍ وتبويب (المفتاحُ المشترك يُقرأ افتراضاً ولا يُكتب) · مراجعةُ A6'),
  ('tools/kivo_ns.json', 'CODE', 'ترتيبُ الأسماء: 332-find-day (D-5) و535/profile logic'),
 ],
 'tasks': [      # KIVO-Tasks (تكليفُ «نظام المهام» · reports/k264/tasks): المسارُ الذاتي ودورةُ المهمة في الخادم · «ملفي ← مهامي» · صفحةُ «المهام».
                 # الملفاتُ المشتركة تحت قواعد تيّاراتها أعلاه (أوّلُ قاعدةٍ مطابِقة تحكم) — موزِّعُ 062a · العقودُ والمخطّطات · 051b · 018/059 · «ملفي» · الكتل —
                 # وفرقُ المهام فيها رقعٌ لكل مالك: reports/k264/tasks/patches (03 · 04 · 05 · 06) — يُذكر في سببها عند التجميد (KIVO_264-merge)
  ('workers/parts/062c-me-tasks.js', 'NEW', 'P0 «ملفي ← مهامي»: GET /api/me/tasks · POST /api/me/tasks/act · img · log — صفوفُ صاحب الجلسة وحده (eid ثم nid) بلا task.view'),
  ('workers/parts/07[0-3]-task-*.js', 'NEW', 'المرحلةُ الثانية: نواةُ المهمة (070) · مساراتُ المسؤول (071) · الأهليةُ من الجدول الشهري (072) · التكرارُ بلا Cron (073)'),
  ('workers/parts/045-permv2.js', 'CODE', 'الرقعة 06: التصنيفُ الظلّي يرى هويةَ الذات على مخزن المهام من المسار الذاتي وحده (كـ059 enfTaskSelfEkey)'),
  ('src/services/54[56]-task-*.js', 'NEW', 'KIVO.BassamMyTasks (545 — «مهامي» من الخادم) · KIVO.BassamTaskModel (546 — مرآةُ 070 للعرض)'),
  ('src/modules/tasks/logic.js', 'CODE', 'صفحةُ «المهام» على الخادم: الإنشاءُ بإعداداتٍ متقدمة · الأهلية · المراجعةُ والإعادة · التمديد · إعادةُ الإسناد · الإلغاء · الربط · التكرار · RC-12/13 · C1'),
  ('src/modules/tasks/view.html', 'CODE', 'صفحةُ «المهام»: الإعداداتُ المتقدمة المطويّة · «✓ اعتماد / ↩ إعادة» · الحالاتُ الجديدة · شاراتُ «غير مرتبطة»'),
  ('tools/hotfix242.py', 'CODE', '--sr2: حزمةُ 242 SR-2.2 (P0 + RC-12 فوق AUD-033c+SR-1 · إصلاحاتُ المراجعة المستقلة F-1/F-3/F-7 · ملفُّ رفعٍ جذرُه dist/ وأرشيفٌ «ليس للرفع» — F-2) — مرشَّحٌ غيرُ منشور'),
  ('tools/hotfix242_sr2/*.pin', 'NEW', 'مصدرا حزمة SR-2.x مثبَّتان (062c بإصلاحات SR-2.2 · 545 كما شُحن) — بامتداد .pin (بياناتٌ لا سكربت: scripts_check)'),
  ('tools/hotfix242_sr2/legacy_rows_count.sql', 'NEW', 'SR-2.2 · F-5: ثلاثةُ استعلاماتٍ للقراءة وحدها (D1 Console) تقيس أثرَ الحزمة قبل نشرها — تُشحن في أرشيفها خارج dist/ (tasks_hotfix242_sql)'),
 ],
 'derived': [    # مولَّدٌ بأداةٍ مسمّاة يفحصها (د) — لا يُحرَّر يدوياً
  ('workers/_worker.js', 'GEN', 'العاملُ المجمَّع من الأجزاء (generate.py)'),
  ('workers/parts.json', 'GEN', 'قائمةُ الأجزاء وبصماتُها (تُحدَّث مع الأجزاء)'),
  ('src/pages/*.dc.html', 'GEN', 'الصفحاتُ المشتقّة من الوحدات (generate.py)'),
  ('src/types/kivo.d.ts', 'GEN', 'الأنواع (tools/gen_types.mjs)'),
 ],
}
RULES = [(pat, kind, why, s) for s in RULES_BY_STREAM for (pat, kind, why) in RULES_BY_STREAM[s]]
# ملفاتُ الصلاحيات والإضافات والـmanifests والترحيلات المسموحُ تغيّرُها في 264 — بسببها (السقّالة لا تمسّ شيئاً منها؛ أيُّ إضافةٍ قرارٌ يُعلن هنا عند الدمج)
PERM_DECLARED = {}   # KIVO_264-merge: {'migrations/00NN_<name>.sql': 'السبب', …}

print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا المعلن ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   المرجعُ ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q and os.path.exists(os.path.join(ROOT, q))}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
def rule(f):
    for r in RULES:
        if fnmatch.fnmatchcase(f, r[0]): return r
    return None
undecl = [f for f in diff if not rule(f)]
newbad = [f for f in diff if rule(f) and rule(f)[1] == 'NEW' and f in prev]
gone = [f for f in diff if f in prev and f not in cur]
if EXPLAIN:
    print('   ── الملفاتُ المتغيّرة (' + str(len(diff)) + ') وقاعدتُها ──')
    for f in diff:
        r = rule(f); st = 'حُذف' if f in gone else ('جديد' if f not in prev else 'معدَّل')
        print('     ' + f + '  [' + st + ']  ⇐ ' + ('%s · %s · %s' % (r[3], r[1], r[2][:90]) if r else 'غيرُ معلن'))
    for f in undecl:
        print("     اقتراح (الصقه في كتلة تيّاره وصحّح السبب):  ('" + f + "', '" + ('NEW' if f not in prev else 'CODE') + "', '<السبب: البند · ماذا ولماذا>'),")
    used = set(rule(f)[0] for f in diff if rule(f))
    for r in RULES:
        if r[0] not in used: print('     · قاعدةٌ بلا ملفٍّ متغيّر (لا ضرر): ' + r[3] + ' · ' + r[0])
ok(not undecl and not untracked and not newbad, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' (' + str(len(diff)) + ') كلُّها تحت قاعدةٍ معلنةٍ بسببها — لا تغييرَ غيرُ معلن',
   json.dumps({'undeclared': undecl[:10], 'untracked': untracked[:10], 'new-but-existed': newbad[:5]}, ensure_ascii=False) + ('' if not (undecl or untracked) else ' — شغّل --explain'))
gbad = [f for f in gone if rule(f) and rule(f)[1] not in ('CODE', 'GEN')]
ok(not gbad, '   لا ملفَّ حُذف إلا بقاعدةٍ يدوية مراجَعة (CODE) أو مولَّدة تفحصها أداة (GEN)' + (' · المحذوف: ' + str(len(gone)) if gone else ''), gbad)
CODE = sorted(f for f in diff if (rule(f) or (None, None, None))[1] == 'CODE')   # KIVO_264 (المراجعة): لا انهيارَ على غير المعلن — يبقى الحكمُ ✘
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'KIVO.__BS_VER = "' + VER_UI + '";', '   الإصدار ' + VER_UI)
refp = ['workers/parts/' + f for f in sorted(os.listdir(ROOT + '/workers/parts')) if re.match(r'0(0[4-9]|1[0-6])-', f)]
ok(refp and all(prev.get(f) == cur.get(f) for f in refp), '★ الوحداتُ المرجعية v24.9 (' + str(len(refp)) + ' جزءاً) = الوسم بايتاً — المحرّكُ والسجلُّ لم يُمسّا', [f for f in refp if prev.get(f) != cur.get(f)])
perm = sorted(k for k in diff if k.startswith(('src/permissions/', 'src/plugins/', 'src/manifests/', 'migrations/')))
ok(perm == sorted(PERM_DECLARED), '★ الصلاحيات: لا تغييرَ في السجلّ ولا الشجرة ولا الإضافات ولا الترحيلات إلا المعلنَ بسببه (' + str(len(PERM_DECLARED)) + ')',
   json.dumps({'undeclared': [p for p in perm if p not in PERM_DECLARED], 'declared-unchanged': [p for p in PERM_DECLARED if p not in perm]}, ensure_ascii=False))

print('\n╔═ (ب) ثوابتُ 263 كما هي ═╗')
pc = run([sys.executable, 'tools/plugins.py', 'check'])
ok(pc.returncode == 0 and '6 عدسة' in pc.stdout, '★ tools/plugins.py check (AUD-030)', pc.stdout.strip().split('\n')[-1][:200])
pt = run([sys.executable, 'tools/perm_tree.py', 'check'])
ok(pt.returncode == 0, '★ شجرةُ v24.9 = الاشتقاق (perm-tree24.json)', pt.stdout.strip()[-140:])
tc = run([sys.executable, 'tools/tokens.py', 'check', 'src'])
ok(tc.returncode == 0, '   tools/tokens.py check (AUD-017)', tc.stdout.strip()[:160])
tv = run([sys.executable, 'tools/tokens.py', 'verify', 'src', 'git:' + TAG])
ok(tv.returncode == 0 and ' 0 فرق منها 0 ' in tv.stdout and 'داكن: 0 منها 0' in tv.stdout, '★ tokens verify مقابل ' + TAG + ': 0 فرقٍ محسوب (AUD-017)', tv.stdout.strip()[:200])
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
ok(PM.count('if (!isSuper()) return;   /* KIVO_263: ترحيلٌ عامّ') == 6, '★ ترحيلاتُ الصلاحيات الستّ في العميل لمدير النظام وحده')
RL = rd(ROOT + '/src/layouts/root-logic.js')
ok('":bassam_last_export_v1", String(dt.getTime())' in RL, '   ختمُ «آخر تصدير» رقمُ اللحظة (JSON صالح)')

print('\n╔═ (ج) KIVO_264 ساكناً — السقّالة (وإثباتاتُ التيّارات عند الدمج) ═╗')
G, MAN = 'gateall' + N + '.sh', 'tests/gate/mandatory_' + N + '.txt'
if os.path.exists(os.path.join(ROOT, G)):   # البوابةُ في المختبر الانتقالي وحده — المستودعُ الرسمي المصدَّر بلا gateall (AUD-029)
    gm = run([sys.executable, 'tools/gate_manifest.py', G, '--check', MAN])
    ok(gm.returncode == 0, '★ ADR-033: قائمةُ الحزم الإلزامية ' + MAN + ' = نصُّ ' + G + ' (غيابُ أيٍّ منها إخفاق)', (gm.stdout.strip().split('\n') or [''])[-1][:200])
    GT = rd(os.path.join(ROOT, G))
    ok('KIVO_REPORT_DIR="$PWD/../reports/k' + N + '"' in GT and 'mkdir -p reports/k' + N in GT and 'reports/k' + N + '/engine_coverage.json' in GT and 'reports/k263/' not in GT,
       '   أدلةُ البوابة في reports/k' + N + ' وحده (لا مجلدَ 263)')
    ok(GT.count('# gate:optional-by-owner 2026-10-13') == 1 and 'R185 استيرادُ البيانات التاريخية' in GT, '   R185 غيرُ إلزامي بقرار المالك (2026-10-13) — بالعلامة نفسِها لا صمتاً')
    ok('[ "$f" = k258print.mjs ] && xa=("../pk263")' in GT and 'x/k' + N + 'vis:' in GT, '   k258print مقابل 263 المنشور على Preview · السقّاطةُ البصرية بإصدار ' + N)
else: ok(True, '   (المستودعُ الرسمي وحده: لا بوابةَ مختبرٍ هنا)')
CI = rd(ROOT + '/.github/workflows/ci.yml')
ok('tools/release_n.sh' in CI and 'lint:deps' in CI and not re.search(r'\bpk2\d\d\b|gateall2\d\d|build_chain\.sh\s+2\d\d', CI), '★ CI يقرأ رقمَ الإصدار من المصدر · خطوةُ lint:deps صريحة (SOT-129)')
ok(run(['bash', 'tools/release_n.sh']).stdout.strip() == N, '   tools/release_n.sh = ' + N)
PJ = json.load(open(os.path.join(ROOT, 'package.json'), encoding='utf-8')); S = PJ.get('scripts', {})
ok(PJ.get('version') == N + '.0.0-dev' and S.get('build') == 'npm run -s build:' + N and S.get('check') == 'npm run -s check:' + N and S.get('build:chain') == 'bash tools/build_chain.sh ' + N,
   '   package.json ' + N + '.0.0-dev · build/check/build:chain → ' + N)
b, c = S.get('build:' + N, ''), S.get('check:' + N, '')
ok('tools/tokens.py verify src git:' + TAG in b and '--out pk' + N + ' --retain pk263 --retain pk262 ' in b and 'perf_budget.py pk' + N in b and 'prod_strip.py pk' + N in b and '> pk' + N + '.MANIFEST.sha256' in b
   and all(('tests/source/k' + N + x + '.py pk' + N) in c for x in ('src', 'eq', 'pii')) and not re.search(r'\b(?:build|check|test:unit|test:coverage):263\b', json.dumps(S)),
   '★ build:' + N + ' (الرموز مقابل ' + TAG + ' · نافذةُ الإصدارين 263+262 · الميزانية · حزمةُ الإنتاج) · check:' + N + ' (k' + N + 'src/eq/pii) — لا سكربتَ 263 باقٍ')
ok(rd(ROOT + '/config/wrangler.toml').count('pages_build_output_dir = "pk' + N + '"') == 1, '   config/wrangler.toml → pk' + N)
# KIVO_264-merge: الإثباتاتُ الساكنة لكل تيّار (مثل ما فعله k263src (ج) لـ SOT-190/188/101) — سطرٌ ok(...) لكلّ قرارٍ أو إصلاحٍ مدمج

print('\n╔═ بصماتُ الفروق المراجَعة ═╗')
FP = ROOT + '/tests/source/k' + N + 'diff.json'
fps = {}
for name in CODE:
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': rule(name)[2]}
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
if FREEZE:
    if not prev: raise SystemExit('✘ لا تجميدَ بلا مرجع ' + TAG)
    pick = [n for n in fps if fnmatch.fnmatchcase(n, FREEZE_GLOB)]
    out = {n: rec[n] for n in rec if n in fps and n not in pick}          # ما لم يُختر يبقى بصمتُه المراجَعة كما هي (لا تبريكَ صامت)
    for n in pick: out[n] = fps[n]
    json.dump(dict(sorted(out.items())), open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('   (تجميد ' + FREEZE_GLOB + ') ' + str(len(pick)) + ' بصمة كُتبت · ' + str(len(out) - len(pick)) + ' كما هي في ' + os.path.basename(FP)); rec = out
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملفٍّ يدوي (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في ' + os.path.basename(FP),
   json.dumps({'changed-since-review': bad[:8], 'set': sorted(set(rec) ^ set(fps))[:8]}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب', [n for n in fps if not fps[n]['why']])

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
    ok(bj is not None and bj['files']['_worker.js']['sha256'] == sha(open(ROOT + '/workers/_worker.js', 'rb').read()), '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js (الحزمةُ مبنيّةٌ من هذا المصدر)')
    ok(bj is not None and sorted(bj.get('retained', [])) == ['pk262', 'pk263'], '   نافذةُ الإصدارين: pk263 وpk262 (آخرُ إصدارين منشورَين على Preview)', bj and bj.get('retained'))
_doc = os.path.join(ROOT, 'docs/reference/v24_9_FINAL.html')
ok(os.path.exists(_doc) and sha(open(_doc, 'rb').read()) == '6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde', '   وثيقةُ v24.9 = المرجعُ بايتاً (SHA-256 6e9aba63…)')
sv = run([sys.executable, 'tools/sot_verify.py'])
ok(sv.returncode == 0, '★ SOT v6 متّسق (tools/sot_verify.py)', sv.stdout.strip().split('\n')[-1][:200])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
