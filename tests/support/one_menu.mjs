/* V7 · د6 (أ1) — «ما يراه حامل» من مصدرٍ واحد: مساعدٌ صغير تستورده اختباراتُ الوحدة والمتصفح (TEST_ONLY — لا بيانات فيه).
   المصدرُ الواحد في الواجهة: KIVO.BassamPerm.seenBy(holder) (src/slots/permissions/334-perm-tree-tpl.js.tpl) = «صفحتي» + روابطُ menuFor المملوكة غيرُ المخفيّة.
   holder: { kind: 'session' } · { kind: 'mgr', did } · { kind: 'role', did, keys } · { kind: 'person', did, ekey, mgr?, keys? }.
   الدوالُّ النصّية (SEEN_SRC · SIDEBAR_SRC) تُقيَّم داخل الصفحة: في المتصفح page.evaluate، وفي الوحدة vm.runInContext. */
export const SESSION = Object.freeze({ kind: 'session' });
/* مفاتيحُ ما يراه الحامل بترتيب القائمة — من المصدر الواحد */
export const SEEN_SRC = '(function (h) { return KIVO.BassamPerm.seenBy(h).map(function (x) { return x.k; }); })';
/* مصدرُ القائمة الجانبية الفعلية كما يقرؤه الغلاف (root-logic: BassamPerm.menuFor() بلا وسيط) — بالشكل نفسِه للمقارنة */
export const SIDEBAR_SRC = '(function () { return ["profile"].concat(KIVO.BassamPerm.menuFor().filter(function (x) { return x.on && !x.hid; }).map(function (x) { return x.k; })); })';
/* متصفح (Playwright): قائمةُ حاملٍ ومصدرُ القائمة الجانبية للجلسة المفتوحة */
export const seenInPage = (page, holder) => page.evaluate('(' + SEEN_SRC + ')(' + JSON.stringify(holder || SESSION) + ')');
export const sidebarSourceInPage = (page) => page.evaluate('(' + SIDEBAR_SRC + ')()');
/* الروابطُ المرسومة فعلاً في الشريط الجانبي (data-key) — للمقارنة بمصدرها في اختبار المتصفح */
export const sidebarDomInPage = (page) => page.evaluate(() => [...document.querySelectorAll('aside.bsb nav.s-nav a.n')].filter((a) => !a.classList.contains('gone') && a.offsetParent !== null).map((a) => a.dataset.key || ''));
/* كلُّ القوائم المسمّاة متطابقة؟ — lists: { اسمُ العرض: [مفاتيح] } · يرمي بأول اختلاف باسم العرضين */
export function assertOneSource(assert, lists, label) {
  const names = Object.keys(lists);
  for (let i = 1; i < names.length; i++) assert.deepEqual(lists[names[i]], lists[names[0]], (label ? label + ' — ' : '') + '«' + names[i] + '» ≠ «' + names[0] + '»');
}
