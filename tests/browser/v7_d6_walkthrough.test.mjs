/* V7 · د6 (أ2 · ج1 · ج2 · ج9) — «الجولة الكاملة»: اختبارُ متصفحٍ واحد على العامل الحقيقي في المختبر المعزول (TEST_ONLY، بلا شبكة).
   المصفوفة: سبعةُ حسابات × أربعُ حالات (كلٌّ تُبنى بحفظٍ حقيقي من شاشة الأنظمة ثم إعادة تحميل) — ولكل خانةٍ يُفتح كلُّ بندٍ في القائمة الجانبية وكلُّ تبويبٍ
   داخل كل صفحة (مكتشَفةً من الـDOM لا من قائمةٍ مكتوبة) ويُحكم بخمسة أحكام:
     (1) blank / loading — لا صفحة فارغة ولا تحميلَ لا ينتهي · (2) off — لا شيء من نظامٍ مطفأ (رابط · تبويب · لوحة · بقيّة · تنبيه · عدّاد · قراءةُ مورده)
     (3) http / error — لا خطأ في الصفحة ولا طلبٌ مرفوض من فتحها · (4) flash — لا وميض قبل وصول الصلاحية (مراقبٌ منذ أول رسم)
     (5) addr — العنوانُ يطابق التبويبَ المعروض (النقرُ يعرض تبويبَه · لا تبويبان بعنوانٍ واحد · فتحُ العنوان من جديد يعيد التبويبَ نفسَه · البندُ المنقور هو المعلَّم)
   ومعها ج2 (source): القائمةُ الجانبية الفعلية = مصدرُها = البطاقاتُ التي تصف الحاملَ نفسَه · وج9: الجولةُ بعرض 390 و768.
   كلُّ موجودةٍ على الشجرة إمّا مدخلٌ مسمّى في KNOWN_D6 (يُحذف حين يُصلَح) أو تُسقط الاختبار؛ ومدخلٌ لم يعد يتكرر يُسقطه كذلك.
   مفاتيحُ التشغيل: KIVO_D6_STATES=allOn,oneOffDept · KIVO_D6_ACCOUNTS=mgr,sec · KIVO_D6_VIEWPORTS=1366,390 · KIVO_D6_ONLY=walk|source ·
   KIVO_D6_FULL=1 (البوابةُ الكاملة: المصفوفةُ كلُّها بالعرضين الضيّقين) · KIVO_D6_REPORT=<ملف.md> (جدولُ الموجودات والأزمنة) · KIVO_D6_SAVE=model (كاتبُ السقف بلا شاشة) · KIVO_D6_PAR=<عددُ الحسابات معاً، الافتراضي 3>. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCOUNTS, UNITS, ROLE, makeWorld, closeWorld, catalogue, buildState, seedRoleAndNotifications, walkAccount, singleSource, selfCheck, judge, fmt } from './d6_walk_lib.mjs';

/* ══ ① المعرفةُ الخاصة بالصفحات — هذا الجدولُ وحده يُحدَّث حين تتغيّر الواجهة ══ */
const SPECIAL = {
  dom: {
    side: 'aside.bsb',                                  /* القائمة الجانبية */
    sideItem: 'a, [role=link], .s-user',                /* بنودُها (روابط) — وصندوقُ المستخدم يفتح «صفحتي» */
    sideLabel: '.nlbl',
    sideSkip: '.s-logout, .gone, .s-user .s-logout',    /* ليست بنودَ تنقّل */
    sideExpand: 'button.s-cgh',                         /* رؤوسُ مجموعاتٍ تُطوى وتُفتح (مركز الإدارة) */
    spaceSwitch: '.s-exit, .s-togwrap a',               /* تبديلُ المساحة (المركز ↔ مساحة العمل): لا يُنقر داخل الجولة */
    selfItem: '.s-user',                                /* بندٌ لا تعلّمه القائمة (صفحتي) */
    main: 'main',
    crumb: '.bs-crumb span',
    screen: 'main [data-screen-label]',
    tab: '[role=tab], [aria-selected], [aria-current], .bs-tabstrip > *, .bs-subseg > button',
    tabBox: '[role=tablist], .bs-tabstrip, .bs-subseg, nav',
    tabNoAddr: '.bs-subseg:not(.org-tabs)',             /* مقاطعُ داخل التبويب (وضعُ عرضٍ أو لوحةٌ فرعية): تُفتح كلُّها، ولا يُطلب لها عنوانٌ خاص */
    tabSkip: '[role=treeitem], [role=option], [role=row], [role=gridcell], [role=menuitem], option, tr, td, li[aria-current], a[href^="http"]',
    tabSkipIn: '[role=tree], [role=listbox], [role=grid], table, [role=dialog], .p44-units, .p44-list',   /* اختيارُ وحدةٍ أو دورٍ أو شخص ليس تبويباً */
    tabPressed: '.p44-view button',                     /* مبدّلٌ بـaria-pressed يُعدّ تبويباً («شاهد الصفحة كـ») */
    tabOnMark: ':scope > span:empty',                   /* علامةُ التبويب المعروض في الأشرطة القديمة (.bs-tabstrip): خطٌّ تحته (span فارغ) */
    dialog: '[role=dialog], [role=alertdialog], dialog[open], .bs-plat-ov',   /* نافذةٌ فوق الصفحة («المساعدة» تفتح .bs-plat-ov) */
    dialogClose: '^(?:إغلاق|أغلق|×|✕)',
    mainWait: '[data-ps-wait]',                         /* الغلافُ ما زال ينتظر الصفحة (555-page-states) */
    loading: '.ps-skel, .sc-placeholder, [aria-busy="true"]',
    loadingText: 'جارٍ (?:ال)?(?:قراءة|تحميل)',
    failed: '.ps-fail, .bs-retry, .sc-placeholder-error',
    leftover: 'h1, h2, h3, h4, h5, button, a, th, legend, summary, label, option, [role=button], [role=link], [role=heading], b',
    timer: '^/api/(?:changes|presence)\\b',
    blankMin: 25,                                       /* أقلُّ من هذا عددَ حروفٍ تحت الترويسة (بلا جدولٍ ولا رسمٍ ولا حقل ولا رسالة) = صفحةٌ فارغة */
    idleMs: 350,                                        /* فعلٌ لم يغيّر شيئاً في الصفحة: يُنتظر هذا القدر ثم يُعدّ مستقراً */             /* طلباتٌ يحرّكها مؤقّتٌ لا الصفحة: لا تُنتظر */
  },
  centerHome: '#/sysadmin/overview',
  unitHome: '#/profile',
  flashProbe: '#/admin/shifts',                         /* عنوانٌ يُعاد التحميل عليه حين لا نظامَ مطفأ (تبويبٌ قد لا يملكه الحساب) */
  maxDepth: 3, maxViews: 220,
  lateStrip: 250,                                       /* صفحةٌ بلا شريط تبويبات: يُنتظر هذا القدر لشريطٍ يُرسم بعد المحتوى */
  blankGrace: 4000,                                     /* مهلةُ ما يبدو فارغاً (أو تبويباً لم يُعرض) قبل الحكم عليه */
  /* عناوينُ لا يصلها بندٌ ولا تبويب: صفحاتُ الوحدات في المركز (العناوينُ القديمة تُحوَّل إلى الشاشة الجديدة) */
  extraPages: {
    'super-center': ['#/sysadmin/org/' + UNITS.G, '#/sysadmin/org/' + UNITS.A, '#/sysadmin/org/' + UNITS.S1, '#/sysadmin/org/' + UNITS.A + '/perm/systems'],
  },
  /* الموضعُ الوحيد الذي يُسمّى فيه نظامٌ مطفأ: «الصلاحيات ← الأنظمة» لمدير المنصة (ليعيد تشغيله) */
  offNameAllowed: [/\/perm\/systems$/],
  benign: [/ResizeObserver loop/],                      /* تحذيرُ المتصفح عن حلقة القياس — ليس خطأ صفحة */
  /* حفظُ الأنظمة من شاشتها (اليوم «الصلاحيات ← الأنظمة»؛ عنوانُها القديم يُحوَّل إلى تبويب «الأنظمة» في الشاشة الجديدة) */
  save: {
    addr: (unit) => '#/sysadmin/org/' + unit + '/perm/systems',
    platName: 'المنصة كلها',
    unitPick: (p, name) => p.locator('main .p44-units button, main [role=treeitem]').filter({ has: p.getByText(name, { exact: true }) }),   /* اختيارُ الوحدة في الشاشة */
    sw: 'main [role=switch]',
    review: 'main button:has-text("مراجعة وحفظ")',
    dialog: '[role=dialog]',
    confirm: '[role=dialog] button:text-is("حفظ")',
  },
  notifVars: { 'المهمة': 'TEST_ONLY مهمة', 'الاسم': 'TEST_ONLY', 'الوقت': '10:00', 'القطعة': 'TEST_ONLY', 'الشهر': '2026-11', 'الوردية': 'TEST_ONLY', 'الموقع': 'TEST_ONLY', 'العدد': '1', 'التاريخ': '2026-11-22' },
  /* ج2: البطاقاتُ التي تصف قائمةَ حاملٍ — holder: صاحبُ القائمة الفعلية · viewers: من يعرض البطاقة وأين · pick: ما يُنقر لاختيار الدور/الشخص */
  cards: {
    item: 'li',
    sideOnly: [],                                        /* في القائمة الفعلية ولا تذكره البطاقات */
    cardOnly: ['profile', 'صفحتي'],                      /* تذكره البطاقات وليس رابطاً في القائمة (صندوقُ المستخدم) */
    list: [
      { name: 'ما يراه مدير هذه الإدارة — إدارة أ', holder: 'mgr', heading: ['ما يراه مدير', 'قائمة إدارتك'], viewers: [{ account: 'super-center', addr: '#/sysadmin/org/' + UNITS.A + '/perm/systems' }, { account: 'mgr', addr: '#/admin/perm/systems' }] },
      { name: 'ما يراه مدير هذه الإدارة — قسم أ١', holder: 'sec', heading: ['ما يراه مدير', 'قائمة إدارتك'], viewers: [{ account: 'super-center', addr: '#/sysadmin/org/' + UNITS.S1 + '/perm/systems' }, { account: 'sec', addr: '#/admin/perm/systems' }] },
      { name: 'ماذا يرى حامل الدور — ' + ROLE.name, holder: 'emp-role', heading: 'ماذا يرى حامل الدور', pick: ROLE.name, viewers: [{ account: 'super-center', addr: '#/sysadmin/org/' + UNITS.A + '/perm/roles' }, { account: 'mgr', addr: '#/admin/perm/roles' }] },
      { name: 'ما يراه الآن — موظف بدور', holder: 'emp-role', heading: 'ما يراه الآن', pick: 'TEST_ONLY موظف أ٢', verify: '[aria-label="تفاصيل الشخص"]', viewers: [{ account: 'super-center', addr: '#/sysadmin/org/' + UNITS.A + '/perm/people' }, { account: 'mgr', addr: '#/admin/perm/people' }] },
      { name: 'ما يراه الآن — موظف بلا دور', holder: 'emp-none', heading: 'ما يراه الآن', pick: 'TEST_ONLY موظف أ', verify: '[aria-label="تفاصيل الشخص"]', viewers: [{ account: 'super-center', addr: '#/sysadmin/org/' + UNITS.A + '/perm/people' }, { account: 'mgr', addr: '#/admin/perm/people' }] },
      { name: 'ما يراه الآن — مدير الإدارة', holder: 'mgr', heading: 'ما يراه الآن', pick: 'TEST_ONLY مدير أ', verify: '[aria-label="تفاصيل الشخص"]', viewers: [{ account: 'super-center', addr: '#/sysadmin/org/' + UNITS.A + '/perm/people' }] },
    ],
  },
};

/* ══ ② الحالات — تُبنى بالترتيب على عالَمٍ واحد، كلٌّ بحفظٍ حقيقي ثم إعادة تحميل · ONE_DEPT و ONE_PLAT: النظامُ الواحد المطفأ ══ */
const ONE_DEPT = process.env.KIVO_D6_ONE_DEPT || 'tasks', ONE_PLAT = process.env.KIVO_D6_ONE_PLAT || 'daily';   /* المهام: تبويبٌ ولوحةٌ وتنبيهاتٌ وقطعةٌ في «صفحتي» · المتابعة: حاويةٌ تسكنها صفحتان */
const STATES = (toggle) => [
  { key: 'allOn', name: 'كل الأنظمة مفعّلة', plat: [], unitOff: [] },
  { key: 'oneOffDept', name: 'واحدٌ مطفأ لإدارة أ («' + ONE_DEPT + '»)', plat: [], unitOff: [ONE_DEPT] },
  { key: 'allOffDept', name: 'كلها مطفأة لإدارة أ', plat: [], unitOff: toggle },
  { key: 'oneOffPlat', name: 'واحدٌ مطفأ على المنصة («' + ONE_PLAT + '»)', plat: [ONE_PLAT], unitOff: [] },
];
/* ج9: العرضان الضيّقان — المجموعةُ المصغّرة (الحسابات × الحالات) التي تُمشى بهما؛ العرضُ 1366 يمشي المصفوفةَ كلَّها */
const NARROW = { widths: [{ width: 390, height: 844 }, { width: 768, height: 1024 }], accounts: ['super-center', 'super-in', 'mgr', 'emp-role'], states: ['allOn', 'oneOffDept'] };

/* ══ ③ KNOWN_D6 — موجوداتُ الشجرة الأساس (f73613d)، كلٌّ باسمه: يُحذف المدخلُ حين يُصلَح خللُه (الاختبارُ يسقط إن بقي مدخلٌ لا يتكرر) ══
   rule · accounts · states · viewports ('*' = الكل) · page / tab / detail (تعابير) · owner: المجموعةُ التي يُحال إليها · some: يكفي أن يتكرر في خانةٍ واحدة */
const KNOWN_D6 = [
  /* ما بقي بعد إصلاحات د6 (walkfix): صفحةُ الوحدة القديمة وحدها — تُستبدل بشاشة «الإدارات والصلاحيات» (م1) فيُحذف مدخلُها معها */
  { id: 'D6-ADDR-UNIT-DATA', owner: 'ب1 (صفحةُ الوحدة تُستبدل بالشاشة الجديدة)', rule: 'addr', accounts: ['super-center'], detail: /تبويبات بعنوانٍ واحد #\/sysadmin\/org\/[^/ ]+: «البيانات» · «نظرة عامة»/,
    note: 'تبويب «البيانات» في صفحة الوحدة بلا عنوان: يبقى #/sysadmin/org/<الوحدة> — يزول مع الشاشة الجديدة (العنوانُ يحمل الوحدةَ والتبويب)' },
];

const pick = (env, all, key) => { const v = (process.env[env] || '').split(',').map((x) => x.trim()).filter(Boolean); return v.length ? all.filter((x) => v.includes(String(key(x)))) : all; };
const ONLY = process.env.KIVO_D6_ONLY || '', PAR = Math.max(1, +(process.env.KIVO_D6_PAR || 3));
const FULL = process.env.KIVO_D6_FULL === '1';   /* V7 · د6 (ج9 — البوابةُ الكاملة): المصفوفةُ كلُّها (كلُّ الحسابات × كلُّ الحالات) بعرض 390 و768 أيضاً؛ بدونه المجموعةُ المصغّرة NARROW (البوابةُ السريعة) */
/* سجلُّ طلبات الخادم (سطرٌ لكل طلب) يُسكَت في هذا الملف وحده: آلافُ الأسطر تحجب تقريرَ الجولة */
const log0 = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('{"v":1,"t":')) return; log0(...a); };
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

test('V7 · د6 (أ2 · ج1 · ج2 · ج9) · الجولة الكاملة: كلُّ بندٍ وكلُّ تبويب لكل حساب في كل حالة — لا فارغ · لا مطفأ · لا خطأ · لا وميض · العنوانُ يطابق التبويب', { timeout: 1800000 }, async (t) => {
  const T0 = Date.now(), W = await makeWorld(SPECIAL), all = [], cells = [], times = [], walks = [], sources = [];
  try {
    const cat = await catalogue(W);
    const accounts = pick('KIVO_D6_ACCOUNTS', ACCOUNTS, (a) => a.key), states = pick('KIVO_D6_STATES', STATES(cat.toggle), (s) => s.key);
    const widths = pick('KIVO_D6_VIEWPORTS', [{ width: 1366, height: 900 }].concat(NARROW.widths), (v) => v.width);
    /* العالَمُ يمرّ دائماً بـ«كل الأنظمة مفعّلة» أولاً (الدورُ والتنبيهاتُ تُبذَر فيها) — فتشغيلُ حالةٍ وحدها يبدأ من التاريخ نفسِه */
    const ALL_ON = STATES(cat.toggle)[0];
    if (!states.length || states[0].key !== ALL_ON.key) { await buildState(W, ALL_ON); await seedRoleAndNotifications(W); }
    for (const st of states) {
      await t.test('الحالة: ' + st.name, async () => {
        const s0 = Date.now(), built = await buildState(W, st);
        if (st.key === ALL_ON.key) await seedRoleAndNotifications(W);
        const row = { state: st.key, build: built.ms, saves: built.saves, walk: {}, source: 0 };
        if (ONLY !== 'source') for (const vp of widths) {
          const narrow = vp.width !== 1366, accs = accounts.filter((a) => !narrow || FULL || (NARROW.accounts.includes(a.key) && NARROW.states.includes(st.key)));
          if (!accs.length) continue;
          const w0 = Date.now();
          const res = await pool(accs, PAR, (acc) => walkAccount(W, acc, st, vp, { deep: st.key === 'allOn' && !narrow }));
          row.walk[vp.width] = Date.now() - w0;
          res.forEach((r) => { walks.push(r); all.push(...r.findings); cells.push({ account: r.account, state: r.state, viewport: r.viewport, part: 'walk' }); });
        }
        if (ONLY !== 'walk') {
          const q0 = Date.now(), src = await singleSource(W, st, accounts);
          row.source = Date.now() - q0; sources.push({ state: st.key, rows: src.rows }); all.push(...src.findings);
          /* بطاقةُ حاملٍ يعرضها حسابٌ آخر: مداخلُ المصدر الواحد لا يُحكم ببَوارها إلا والحساباتُ كلُّها في التشغيل */
          if (accounts.length === ACCOUNTS.length) accounts.forEach((a) => cells.push({ account: a.key, state: st.key, viewport: 1366, part: 'source' }));
        }
        row.total = Date.now() - s0; times.push(row);
        log0('d6 · ' + st.key + ': build ' + row.build + ' ms (' + row.saves + ' saves) · walk ' + JSON.stringify(row.walk) + ' · source ' + row.source + ' ms · total ' + row.total + ' ms');
      });
    }
    /* المِجسُّ يعضّ: خللٌ مزروع من كل نوع يُلتقط (وإلا فالأحكامُ أعلاه فارغة) */
    await t.test('المِجسّ يلتقط الخللَ المزروع: فارغ · تحميل · مطفأ · طلب مرفوض · خطأ · وميض', async () => {
      const acc = accounts.find((a) => a.key === 'mgr') || accounts.find((a) => a.space === 'unit');
      if (!acc) return;
      assert.deepEqual(await selfCheck(W, acc), { flash: true, off: true, http: true, error: true, loading: true, blank: true });
    });
    const total = Date.now() - T0;
    const verdict = judge(all, KNOWN_D6, cells);
    if (process.env.KIVO_D6_REPORT) fs.writeFileSync(process.env.KIVO_D6_REPORT, report({ all, verdict, times, walks, sources, total, W }));
    if (process.env.KIVO_D6_JSON) fs.writeFileSync(process.env.KIVO_D6_JSON, JSON.stringify({ all, times, walks: walks.map((w) => ({ account: w.account, state: w.state, viewport: w.viewport, ms: w.ms, views: w.views.length, side: w.side, unmarked: w.unmarked, notif: w.notif, list: w.views })), sources, total, notifSeed: W.notifSeed }, null, 1));
    log0('d6 · total ' + total + ' ms · ' + walks.length + ' walks · ' + walks.reduce((n, w) => n + w.views.length, 0) + ' views · ' + all.length + ' findings (' + verdict.unknown.length + ' not in KNOWN_D6 · ' + verdict.stale.length + ' stale entries)');
    assert.deepEqual(verdict.unknown.map(fmt), [], 'موجوداتٌ ليست في جدول KNOWN_D6 (خللٌ جديد — أو أضِف مدخلاً مسمّى إن كان خللاً قائماً يُحال إلى مجموعته)');
    assert.deepEqual(verdict.stale, [], 'مداخلُ في KNOWN_D6 لم تعد تتكرر — احذفها (أُصلح خللُها)');
  } finally { await closeWorld(W); }
});

/* تقريرُ الجولة (KIVO_D6_REPORT): الموجوداتُ مجموعةً · الأزمنة · ما مُشي */
function report({ all, verdict, times, walks, sources, total, W }) {
  const L = ['# الجولة الكاملة — تقرير التشغيل', '', 'المجموع: ' + (total / 1000).toFixed(1) + ' ث · ' + walks.length + ' جولة · ' + walks.reduce((n, w) => n + w.views.length, 0) + ' عرضاً · ' + all.length + ' موجودة.', '', '## الأزمنة لكل حالة (ms)', '', '| الحالة | البناء | الحفظات | الجولة (لكل عرض) | المصدر الواحد | المجموع |', '|---|---|---|---|---|---|'];
  times.forEach((r) => L.push('| ' + [r.state, r.build, r.saves, JSON.stringify(r.walk), r.source, r.total].join(' | ') + ' |'));
  L.push('', '## الجولات', '', '| الحساب | الحالة | العرض | البنود | العروض | ms |', '|---|---|---|---|---|---|');
  walks.forEach((w) => L.push('| ' + [w.account, w.state, w.viewport, w.side.length, w.views.length, w.ms].join(' | ') + ' |'));
  const G = new Map();
  all.forEach((f) => { const k = f.rule + '¦' + f.page + '¦' + f.tab + '¦' + f.detail; if (!G.has(k)) G.set(k, { f, cells: [] }); G.get(k).cells.push(f.account + '·' + f.state + '·' + f.viewport); });
  L.push('', '## الموجودات (' + G.size + ' مجموعة)', '', '| الحكم | الصفحة › التبويب | ما رُئي | الخانات (حساب·حالة·عرض) | KNOWN_D6 |', '|---|---|---|---|---|');
  [...G.values()].sort((a, b) => (a.f.rule + a.f.page).localeCompare(b.f.rule + b.f.page)).forEach((g) => L.push('| ' + [g.f.rule, g.f.page + (g.f.tab ? ' › ' + g.f.tab : ''), g.f.detail.replace(/\|/g, '¦'), [...new Set(g.cells)].join(' · '), (g.f.known || []).join(' ') || '—'].join(' | ') + ' |'));
  L.push('', '## أشرطةٌ لا تعلّم تبويبَها المعروض (لا يُفحص فيها تطابقُ العنوان)', '');
  [...new Set(walks.flatMap((w) => w.unmarked))].forEach((u) => L.push('- ' + u));
  L.push('', '## المصدر الواحد (ج2)', '', '| الحالة | الحامل | البطاقة | يعرضها | مطابقة | القائمة الفعلية | البطاقة |', '|---|---|---|---|---|---|---|');
  sources.forEach((s) => s.rows.forEach((r) => L.push('| ' + [s.state, r.holder, r.card, r.viewer, r.same ? '✔' : '✘', JSON.stringify(r.real), JSON.stringify(r.shown)].join(' | ') + ' |')));
  L.push('', '## التنبيهات المبذورة', '', '```', JSON.stringify(W.notifSeed), '```', '', 'غير المعروف: ' + verdict.unknown.length + ' · مداخل بائدة: ' + verdict.stale.length, '');
  return L.join('\n');
}
