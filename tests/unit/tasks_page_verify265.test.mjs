/* KIVO_265 — تحقّقُ المراجِع المستقل من 648242f (reports/k265/reviews/verify_648242f.md · V-1 منخفض) في الواجهة: صفحةُ «المهام» الحقيقية
   (src/modules/tasks/logic.js في vm + KIVO.BassamPageKit الحقيقي + 490 · 546 الحقيقيان) — بياناتٌ اصطناعية وحدها (TEST_ONLY). تُخفق على 648242f أولاً:
     (V-1) مهمةٌ صارت «عامة» بحذف موظفٍ كان قد أكّد استلامَها أو اعتذر عنها أو انقضت مهلتُها (العمودُ 20 باقٍ بعد تنظيف الحذف):
           «قبول نيابةً» لها وإسنادُها بالتعديل يفرّغان العمودَ 20 (استلامُ المحذوف أو اعتذارُه أو انقضاؤه لا ينتقل إلى المكلَّف الجديد — والخادمُ يرفضه task-asg)
           والاعتذارُ لا يورَث: صفٌّ «اعتذر عنه» المحذوفُ يُسند بالتعديل «بانتظار الاستلام» (كـRC-13: المكلَّفُ الجديد لا يرث حالةَ الأول)
     ولا تراجع: صفٌّ مسنَدٌ يبقى عمودُه 20 لصاحبه («قبول نيابةً» عنه · تعديلُه) · وتعديلُ العامة بلا إسنادٍ يُبقيه (RC-12)
   ثم التحقّقُ من b7538e2 (reports/k265/reviews/verify_b7538e2.md · V-5 منخفض — يُخفق على b7538e2 أولاً):
     (V-5) مهمةٌ عامةٌ تُسند بالتعديل تبدأ للمكلَّف الجديد «بانتظار الاستلام» كاملةً: لا يرث وقتَ بدء من حُذف وحالتَه «جارية» (قبولٌ مستعار) ولا قبولاً دون إسناد ·
           وما أُنجز أو سُلِّم أو أغلقه الخادم أو فيه توثيقُ غيره (21) لا يُسند بالتعديل — سببٌ في الواجهة بدل حفظٍ يرفضه الخادم (task-asg)
   ثم التحقّقُ من fa5a5bf (reports/k265/reviews/verify_fa5a5bf.md — يُخفقان على fa5a5bf أولاً):
     (V-7 متوسط) نوافذُ التعديل والحذف والقبول والإنهاء بهوية الصفّ لا بموضعه: تغييرٌ بعيدٌ يُزيح صفوفَ اليوم والنافذةُ مفتوحة لا يجعل الفعلَ على صفٍّ آخر
           — وإن غاب الصفُّ أو تغيّرت هويتُه فسببٌ ولا كتابة
     (V-6 منخفض) مهمةٌ أغلقها الخادم (أُلغيت · أُعيد إسنادُها) لا يُعرض لها «قبول» ولا «إنهاء» ولا تُقبل ولا تُنهى
   ثم التحقّقُ من c4f79a0 (reports/k265/reviews/verify_c4f79a0.md — يُخفقان على c4f79a0 أولاً):
     (C-1) صفٌّ قديمٌ بلا طابع (22) يختمه الخادمُ والنافذةُ مفتوحة (الإعدادات · إعادةُ الفتح) يبقى صفَّها — لا رفضَ زائف ولا يضيع ما كتبه المستخدم
     (C-3) قائمةُ الصفّ المفتوحة تبقى مع صفّها بعد إزاحة صفوف اليوم، و«إعادةُ الفتح» بهويته لا بموضعه
   schema10: القراءة والحفظ عبر280الحقيقي وWorkerالحقيقي فوقSQLiteاصطناعي، معحظرOperationsفيStorage.
   التغيير البعيد يرفضالمسودة القديمة ويحفظمدخلاتها؛استئنافالفعللايتمإلابعدإغلاقالمسودةومراجعتهاوفتحهاصراحةً،معالحفاظعلىهويةالصف.
   ثم التحقّقُ من cf03398 (reports/k265/reviews/verify_cf03398.md — يُخفق على cf03398 أولاً):
     (D-1) صفّان بالهوية نفسِها في اليوم (فردان يتيمان لمجموعةٍ قديمة): قائمةُ أحدهما لا تفتح الآخر، ونافذةُ حذفه بعد الإزاحة لا تحذف توأمه */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { attachTaskOperations } from './tasks_vm_operations_fx.mjs';
import { world, workerUnderTest } from './tasks_fx.mjs';
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';

const LOGIC = moduleLogic('tasks');
const D = 'tst_d1', TAG = 'TEST_ONLY';
async function page(storeJson, emps, users, ext) {
  const W = await world({ worker: workerUnderTest().file }), dm = await W.login('0000000101', '70101');
  await replaceOperationalFixture(W.env, 'bsdept:' + D + ':bassam_tasks_v1', JSON.parse(storeJson));
  /* RISHAD266: قراءةُ الصفحة لمخزن المهام تجري مسحَ المواعيد في الخادم (063 ← 074) كما كان طلبُها عند الفتح — وهذه الاختباراتُ لأفعال الصفحة لا للمسح
     (له اختباراتُه)، وصفوفُها في «ظهر اليوم» فتنقضي بعد الواحدة بتوقيت الرياض. طابعُ «جرى المسحُ للتو» (الحارسُ المشترك نفسُه) يُبقيها حتميةً في كل ساعة */
  W.env.DB.exec("INSERT INTO meta (k, v) VALUES ('tkg:due:" + D + "', '" + Date.now() + "') ON CONFLICT(k) DO UPDATE SET v = excluded.v");
  await replaceOperationalFixture(W.env, 'bsdept:' + D + ':bassam_employees_v1', emps);
  for (const name of ['bassam_tasks_locks_v1', 'bassam_staffing_v3', 'bassam_shift_options_v1', 'bassam_dreport_v1', 'bassam_options_v1'])
    await replaceOperationalFixture(W.env, 'bsdept:' + D + ':' + name, null, { present: false });
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {}, toasts = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1, uid: 'tst_dm1' }, fetch: (u, o) => W.C.req(u, { ...o, cookie: dm.ck }) };
  Object.assign(ctx, ext || {});
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  /* اليوم التشغيلي من خدمة الغلاف الحقيقية؛ hToday وحده يتقدم يومًا بين 00:00 و03:00 الرياض. */
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/535-profile-facts.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => users };
  KIVO.BassamDepts = { active: () => D };
  KIVO.BassamSup = { isSup: () => false };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn(k) { return k !== 'staff'; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const opsFixture = await attachTaskOperations(ctx, { store, W, ck: dm.ck });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  const requests = [], api = c._tkApi.bind(c);
  c._tkApi = (route, body) => { const promise = api(route, body); requests.push({ route, body, promise }); return promise; };
  return { c, store, toasts, W, opsFixture, requests, drain: async () => { for (const call of requests) await call.promise; } };
}
const HIJ = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600e3)).forEach((p) => { o[p.type] = +p.value; }); return o; })();
const DAY = HIJ.year + '-' + HIJ.month + '-' + HIJ.day;
/* بدايةُ المهام: ظهرُ يومِ DAY نفسِه بتوقيت الرياض (لا «الآن + ساعة») — كانت تقع في اليوم التالي بين 23:00 و03:00 فينقلها الحفظُ إليه (تحقّقُ c4f79a0 · C-2) */
const NOON = (() => { const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - 3 * 3600e3)); return Date.parse(f + 'T12:00:00+03:00'); })();
const emp = (i, o) => Object.assign({ eid: 'tst_e_p0_' + i, nid: String(1991000000 + i), name: TAG + ' · موظف ' + i, empno: String(71000 + i), work: TAG + ' مراقب' }, o || {});
const acc = (i, o) => Object.assign({ id: 'tst_p0e' + i, role: 'staff', deptId: D, ekey: 'tst_e_p0_' + i, dis: 0 }, o || {});
const tRow = (o) => { const r = new Array(24).fill(null); Object.assign(r, { 0: TAG + ' ' + (o.t || 'مهمة'), 1: '', 2: 'normal', 3: o.st || 'pending', 4: 'normal', 5: 'مضافة', 7: o.eid ? ['م'] : [], 8: o.name || '', 9: TAG, 10: 60, 13: o.id, 14: o.eid || null, 15: o.s, 16: o.e, 20: o.r20 || null, 21: o.r21 || null }); return r; };
const stored = (P) => JSON.parse(P.store.get('bassam_tasks_v1'))[DAY].find((q) => q && q[13]);
/* استلامُ المحذوف · اعتذارُه (كما يكتبهما 062c) — يبقيان بعد تنظيف حذفه (040 يفرّغ 7 · 8 · 14 وحدها) */
const ORPH = [{ tag: 'أكّد استلامَها', st: 'pending', r20: { ack: Date.now() - 600e3 } }, { tag: 'اعتذر عنها', st: 'declined', r20: { at: Date.now() - 600e3, why: TAG + ' ظرف' } },
  { tag: 'انقضت مهلتُها', st: 'pending', r20: { exp: Date.now() - 600e3 } }];
const emps = [emp(1), emp(2)], users = [acc(1), acc(2)];
const editState = (P, r0, pick) => { const state = Object.assign({ year: HIJ.year, month: HIJ.month, newTaskOpen: true, editRef: { d: HIJ.day, i: 0, k: P.c._tkKey(r0, HIJ.day), grp: null, grpLabel: '' }, newTitle: r0[0], newDesc: '', newPrio: 'normal',
  newAsg: pick ? 'direct' : 'general', newPick: pick || {}, pickQ: '', pickOpen: {}, pickWt: '', newDur: '60', newDay: HIJ.day, newCreatedAt: r0[13] }, P.c._tkPickers(r0[15], r0[16], HIJ.day), P.c._tkAdvFrom(r0));
  P.c._tkOpen(state); return state; };

test('اليوم التشغيلي في fixture الصفحة الحقيقي يتغير عند 03:00 الرياض، مع بقاء اليوم المدني نفسه', async () => {
  const boundary = Date.parse('2026-10-30T00:00:00Z'); // 03:00 الرياض
  const make = async at => {
    const RD = class extends Date { constructor(...a) { if (a.length) super(...a); else super(at); } static now() { return at; } };
    const IR = Object.create(Intl);
    IR.DateTimeFormat = function (locale, options) { return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: 'Asia/Riyadh' }, options || {})); };
    return await page('{}', emps, users, { Date: RD, Intl: IR });
  };
  const before = await make(boundary - 1), after = await make(boundary);
  const key = value => value.y + '-' + value.m + '-' + value.d;
  assert.equal(key(before.c.hToday()), key(after.c.hToday()), '02:59:59 و03:00 في اليوم المدني نفسه');
  assert.notEqual(before.c._tkTodayK(), key(before.c.hToday()), 'قبل03:00 اليوم التشغيلي هو السابق');
  assert.equal(after.c._tkTodayK(), key(after.c.hToday()), 'عند03:00 يبدأ اليوم التشغيلي الجديد');
  const previous = before.c._tkTodayK().split('-').map(Number);
  assert.equal(before.c._tkDayLockOf(...previous).locked, false, 'اليوم الجاري مفتوح قبل الحد');
  assert.equal(after.c._tkDayLockOf(...previous).locked, true, 'اليوم نفسه يصبح منقضيًا ومقفلًا عند الحد');
});

test('(V-1) «قبول نيابةً» لمهمةٍ صارت عامةً بحذف من أكّد استلامَها أو اعتذر عنها: يُسند ويفرّغ العمودَ 20 — ولا تراجع للمسنَدة', async () => {
  const s = NOON;
  for (const o of ORPH) {
    const P = await page(JSON.stringify({ [DAY]: [tRow({ id: 1760000910001, t: 'يتيمة', s, e: s + 3600e3, st: o.st, r20: o.r20 })] }), emps, users);
    P.c._tkOpen({ year: HIJ.year, month: HIJ.month, acceptRef: { d: HIJ.day, i: 0, title: 'يتيمة', wt: '' } });
    const it = P.c._tkDutyVals().dutyList.find((x) => x.name === emp(1).name);
    assert.ok(it && !it.acct, o.tag + ': المداومُ بحسابٍ نشطٍ قابلٌ للاختيار');
    await it.click();
    const r = stored(P);
    assert.equal(r[14], 'tst_e_p0_1', o.tag + ': أُسند');
    assert.equal(r[3], 'in_progress', o.tag);
    assert.ok(r[11], o.tag + ': وقتُ القبول');
    assert.equal(r[20], null, o.tag + ': لا ينتقل استلامُ المحذوف أو اعتذارُه إلى المكلَّف الجديد — ' + JSON.stringify(r[20]));
  }
  /* لا تراجع: «قبول نيابةً» عن المكلَّف نفسه يُبقي عمودَه 20 (استلامُه هو) */
  const ack = { ack: Date.now() - 300e3 };
  const P = await page(JSON.stringify({ [DAY]: [tRow({ id: 1760000910002, t: 'مسنَدة', s, e: s + 3600e3, eid: 'tst_e_p0_1', name: emp(1).name, r20: ack })] }), emps, users);
  P.c._tkOpen({ year: HIJ.year, month: HIJ.month, acceptRef: { d: HIJ.day, i: 0, title: 'مسنَدة' } });
  await P.c._doAccept(emp(1).name, 'tst_e_p0_1');
  const r = stored(P);
  assert.equal(r[14], 'tst_e_p0_1');
  assert.deepEqual(r[20], ack, 'استلامُ صاحبها باقٍ');
});

test('(V-1) إسنادُ مهمةٍ عامةٍ بالتعديل يفرّغ العمودَ 20 للمحذوف — والاعتذارُ لا يورَث («بانتظار الاستلام») · وتعديلُها بلا إسنادٍ يُبقيه (RC-12)', async () => {
  const s = NOON;
  for (const o of ORPH) {
    const r0 = tRow({ id: 1760000910003, t: 'يتيمة', s, e: s + 3600e3, st: o.st, r20: o.r20 });
    const P = await page(JSON.stringify({ [DAY]: [r0] }), emps, users);
    P.c.setState(editState(P, r0, { tst_e_p0_2: emp(2).name }));
    await P.c.renderVals().submitTask();
    const r = stored(P);
    assert.ok(r, o.tag + ': ' + JSON.stringify(P.toasts));
    assert.equal(r[14], 'tst_e_p0_2', o.tag + ': أُسند');
    assert.equal(r[20], null, o.tag + ': ' + JSON.stringify(r[20]));
    assert.equal(r[3], 'pending', o.tag + ': لا يرث الجديدُ حالةَ المحذوف — ' + r[3]);
    assert.equal(r[13], r0[13], 'الهويةُ نفسُها');
    /* لا تراجع (RC-12): تعديلُ العنوان وهي عامة يُبقي 20 كما هو */
    const r1 = tRow({ id: 1760000910004, t: 'يتيمة', s, e: s + 3600e3, st: o.st, r20: o.r20 });
    const Q = await page(JSON.stringify({ [DAY]: [r1] }), emps, users);
    Q.c.setState(Object.assign(editState(Q, r1, null), { newTitle: r1[0] + ' مصحَّح' }));
    await Q.c.renderVals().submitTask();
    const q = stored(Q);
    assert.equal(q[14], null, o.tag);
    assert.deepEqual(q[20], o.r20, o.tag + ': عامةٌ بلا إسنادٍ ⇒ العمودُ 20 باقٍ');
    assert.equal(q[3], o.st, o.tag);
  }
  /* لا تراجع (RC-12): تعديلُ مهمةٍ مسنَدةٍ لصاحبها يُبقي 20 و21 */
  const r21 = { imgs: [], note: TAG + ' تم', at: Date.now() - 60e3 }, ack = { ack: Date.now() - 300e3 };
  const r2 = tRow({ id: 1760000910005, t: 'مسنَدة', s, e: s + 3600e3, eid: 'tst_e_p0_1', name: emp(1).name, st: 'in_progress', r20: ack, r21 });
  r2[11] = Date.now() - 120e3;
  const R = await page(JSON.stringify({ [DAY]: [r2] }), emps, users);
  R.c.setState(Object.assign(editState(R, r2, { tst_e_p0_1: emp(1).name }), { newTitle: r2[0] + ' مصحَّح' }));
  await R.c.renderVals().submitTask();
  const q = stored(R);
  assert.equal(q[14], 'tst_e_p0_1');
  assert.deepEqual(q[20], ack);
  assert.deepEqual(q[21], r21);
  assert.equal(q[3], 'in_progress');
});

test('(V-5) إسنادُ مهمةٍ عامةٍ بالتعديل يبدأ «بانتظار الاستلام» كاملاً: لا يرث وقتَ بدء من حُذف (ولا قبولاً دون إسناد) — والمنجزةُ والمسلَّمة والمغلقةُ وذاتُ التوثيق لا تُسند بالتعديل', async () => {
  const s = NOON, acc0 = Date.now() - 900e3;
  /* (أ) بدأها من حُذف (start يكتب 11 · in_progress · 20.ack — 062c) · وقبولٌ دون إسناد (11 · in_progress بلا 20 — acceptNoAssign) · ومتعثّرة */
  for (const o of [{ tag: 'بدأها المحذوف', r20: { ack: acc0 } }, { tag: 'قبولٌ دون إسناد', r20: null }, { tag: 'تعثّرت', r20: { ack: acc0, stall: { at: acc0 + 60e3, why: TAG + ' عائق' } } }]) {
    const r0 = tRow({ id: 1760000910006, t: 'جارية', s, e: s + 3600e3, st: 'in_progress', r20: o.r20 }); r0[11] = acc0;
    const P = await page(JSON.stringify({ [DAY]: [r0] }), emps, users);
    P.c.setState(editState(P, r0, { tst_e_p0_2: emp(2).name }));
    await P.c.renderVals().submitTask();
    const r = stored(P);
    assert.equal(r[14], 'tst_e_p0_2', o.tag + ': ' + JSON.stringify(P.toasts));
    assert.equal(r[3], 'pending', o.tag + ': لا حالةَ مستعارة — ' + r[3]);
    assert.equal(r[11], null, o.tag + ': لا وقتَ بدءٍ مستعار');
    assert.equal(r[12], null, o.tag);
    assert.equal(r[20], null, o.tag);
    assert.equal(r[6], null, o.tag);
  }
  /* (ب) لا تُسند بالتعديل: منجزةٌ (ولو بلا توثيق) · مسلَّمةٌ للمراجعة · فيها توثيقُ المحذوف (مسوّدة) · ملغاة — سببٌ ولا تغيير */
  const fin = Date.now() - 300e3;
  const cases = [
    { tag: 'منجزة', st: 'done', r11: acc0, r12: fin, r20: { ack: acc0 } },
    { tag: 'منجزةٌ نيابةً بلا توثيق', st: 'done', r11: acc0, r12: fin, r20: null },
    { tag: 'مسلَّمة للمراجعة', st: 'in_progress', r11: acc0, r12: fin, r20: { ack: acc0 }, r21: { imgs: [], note: TAG + ' سُلِّمت', at: fin, sub: fin } },
    { tag: 'فيها توثيقُ المحذوف', st: 'in_progress', r11: acc0, r20: { ack: acc0 }, r21: { imgs: [], note: TAG + ' مسوّدة', at: fin, draft: 1 } },
    { tag: 'ملغاة', st: 'pending', x: { v: 2, asg: 'cancelled', can: { at: 1 } } },
  ];
  for (const o of cases) {
    const r0 = tRow({ id: 1760000910007, t: o.tag, s, e: s + 3600e3, st: o.st, r20: o.r20, r21: o.r21 }); r0[11] = o.r11 || null; r0[12] = o.r12 || null; r0[23] = o.x || null;
    const P = await page(JSON.stringify({ [DAY]: [r0] }), emps, users);
    P.c.setState(editState(P, r0, { tst_e_p0_2: emp(2).name }));
    const before = P.store.get('bassam_tasks_v1');
    await P.c.renderVals().submitTask();
    assert.equal(P.store.get('bassam_tasks_v1'), before, o.tag + ': لا تغيير');
    assert.ok(P.toasts.some((t) => /لا تُسند بالتعديل|لا يُغيَّر المكلَّف.*إسناد/.test(t[0])), o.tag + ': ' + JSON.stringify(P.toasts));
    /* ولا تراجع: تعديلُ عنوانها وهي عامة يمضي ويُبقي حالتَها وعمودَيها (RC-12) */
    P.toasts.length = 0;
    P.c.setState(Object.assign(editState(P, r0, null), { newTitle: r0[0] + ' مصحَّح' }));
    await P.c.renderVals().submitTask();
    const q = stored(P);
    assert.equal(q[0], r0[0] + ' مصحَّح', o.tag + ': ' + JSON.stringify(P.toasts));
    assert.equal(q[3], o.st, o.tag); assert.equal(q[11], o.r11 || null, o.tag); assert.equal(q[12], o.r12 || null, o.tag);
    assert.deepEqual(q[20], o.r20 || null, o.tag); assert.deepEqual(q[21], o.r21 || null, o.tag);
  }
});

/* ── التحقّقُ من fa5a5bf: النوافذُ من قائمة الصفّ الحقيقية (renderVals ⇒ VM الصفّ ⇒ edit · del · accept · finish) ثم تغييرٌ بعيدٌ في المخزن والنافذةُ مفتوحة ── */
const vmsOf = (V) => { const out = [], seen = new Set(); const walk = (o) => { if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o); if (Array.isArray(o.tkcT) && typeof o.edit === 'function') out.push(o); for (const k of Object.keys(o)) { const v = o[k]; if (v && typeof v === 'object') walk(v); } }; walk(V); return out; };
const vmOf = (P, id) => { P.c.setState({ tasksAll: null }); return vmsOf(P.c.renderVals()).find((x) => x.tkcT[13] === id); };
const remote = async (P, f) => { const S = JSON.parse(P.store.get('bassam_tasks_v1')); f(S); await replaceOperationalFixture(P.W.env, 'bsdept:' + D + ':bassam_tasks_v1', S); await P.opsFixture.sync(); P.c.setState({ tasksAll: null }); };
const byId = (P, id) => JSON.parse(P.store.get('bassam_tasks_v1'))[DAY].find((q) => q && q[13] === id);
const three = (o) => { const s = NOON; return [1, 2, 3].map((n) => { const r = tRow(Object.assign({ id: 1760000920000 + n, t: 'R' + n, s, e: s + 3600e3 }, o && o(n))); return r; }); };
const reviewEdit = async (P, id, title) => { await P.c.renderVals().closeNewTask(); vmOf(P, id).edit(); P.c.setState({ newTitle: title }); await P.c.renderVals().submitTask(); };

test('(V-7) نافذةُ التعديل بهوية الصفّ: حذفٌ بعيدٌ لصفٍّ قبله والنافذةُ مفتوحة لا يجعل التعديلَ على جاره — وغيابُ الصفّ نفسِه سببٌ ولا كتابة', async () => {
  const emps3 = [emp(1), emp(2), emp(3)], users3 = [acc(1), acc(2), acc(3)];
  const R = three((n) => ({ eid: 'tst_e_p0_' + n, name: emp(n).name }));
  const P = await page(JSON.stringify({ [DAY]: R }), emps3, users3);
  P.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(P, R[1][13]).edit();                                                    /* يفتح R2 (الموضعُ 1) */
  assert.ok(P.c.state.editRef && P.c.state.newTaskOpen, 'فُتح نموذجُ التعديل');
  await remote(P, (S) => { S[DAY] = S[DAY].filter((q) => q[13] !== R[0][13]); });     /* مديرٌ آخر حذف R1 ⇒ R2 في الموضع 0 · R3 في 1 */
  P.c.setState({ newTitle: TAG + ' R2 مصحَّح' });
  await P.c.renderVals().submitTask();
  const r2 = byId(P, R[1][13]), r3 = byId(P, R[2][13]);
  assert.equal(r2[0], R[1][0], 'النسخة القديمة لا تُطبّق بعد تغيّر revision');
  assert.equal(P.c.state.newTitle, TAG + ' R2 مصحَّح', 'مدخل المستخدم باقٍ للمراجعة');
  assert.equal(P.c.state.newTaskOpen, true);
  await reviewEdit(P, R[1][13], TAG + ' R2 مصحَّح');
  assert.equal(byId(P, R[1][13])[0], TAG + ' R2 مصحَّح', 'بعد المراجعة الصريحة يُعدّل R2 نفسه');
  assert.equal(r3[0], R[2][0], 'R3 لم يُمسّ'); assert.equal(r3[14], 'tst_e_p0_3', 'ومكلَّفُه باقٍ');
  assert.equal(JSON.parse(P.store.get('bassam_tasks_v1'))[DAY].length, 2);
  /* الصفُّ نفسُه حُذف من بعيد والنافذةُ مفتوحة ⇒ سببٌ ولا كتابة (كان يُعيد إنشاءه أو يعدّل غيره) */
  const Q = await page(JSON.stringify({ [DAY]: three((n) => ({ eid: 'tst_e_p0_' + n, name: emp(n).name })) }), emps3, users3);
  Q.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(Q, R[1][13]).edit();
  await remote(Q, (S) => { S[DAY] = S[DAY].filter((q) => q[13] !== R[1][13]); });
  const before = Q.store.get('bassam_tasks_v1');
  Q.c.setState({ newTitle: TAG + ' بعد حذفه' });
  await Q.c.renderVals().submitTask();
  assert.equal(Q.store.get('bassam_tasks_v1'), before, 'لا كتابة');
  assert.ok(Q.toasts.some((t) => /تغيّرت المهمة|راجع المسودة/.test(t[0])), JSON.stringify(Q.toasts));
  assert.equal(Q.c.state.newTaskOpen, true, 'الصف المحذوف لا يُنشأ من المسودة القديمة');
  /* وإعادةُ إسناد R2 من بعيد (يبقى الأصلُ «أُعيد إسنادُه» وتُدرج نسخةٌ بعده): التعديلُ على R2 الأصل لا على النسخة */
  const W = await page(JSON.stringify({ [DAY]: three((n) => ({ eid: 'tst_e_p0_' + n, name: emp(n).name })) }), emps3, users3);
  W.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(W, R[2][13]).edit();                                                    /* يفتح R3 (الموضعُ 2) */
  await remote(W, (S) => { const c = S[DAY][1].slice(); c[13] = 1760000920009; c[14] = 'tst_e_p0_1'; c[8] = emp(1).name; S[DAY].splice(2, 0, c); });   /* نسخةٌ لـR2 في الموضع 2 */
  W.c.setState({ newTitle: TAG + ' R3 مصحَّح' });
  await W.c.renderVals().submitTask();
  assert.equal(byId(W, R[2][13])[0], R[2][0], 'لا دمج تلقائي بعد إدراج صف بعيد');
  await reviewEdit(W, R[2][13], TAG + ' R3 مصحَّح');
  assert.equal(byId(W, R[2][13])[0], TAG + ' R3 مصحَّح', JSON.stringify(W.toasts));
  assert.equal(byId(W, 1760000920009)[0], R[1][0], 'النسخةُ المُدرجة لم تُمسّ'); assert.equal(byId(W, 1760000920009)[14], 'tst_e_p0_1');
});

test('(V-7) نوافذُ الحذف والقبول والإنهاء بهوية الصفّ: حذفٌ بعيدٌ لصفٍّ قبله لا يجعل الفعلَ على جاره', async () => {
  const emps3 = [emp(1), emp(2), emp(3)], users3 = [acc(1), acc(2), acc(3)];
  /* الحذف */
  const P = await page(JSON.stringify({ [DAY]: three((n) => ({ eid: 'tst_e_p0_' + n, name: emp(n).name })) }), emps3, users3);
  P.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(P, 1760000920002).del();
  assert.ok(P.c.state.confirmDel, 'نافذةُ الحذف');
  await remote(P, (S) => { S[DAY] = S[DAY].filter((q) => q[13] !== 1760000920001); });
  await P.c.renderVals().confirmDelDo();
  assert.ok(byId(P, 1760000920002), 'المسودة القديمة مرفوضة بعد التعارض');
  assert.ok(P.c.state.confirmDel, 'التأكيد باقٍ للمراجعة');
  await P.c.renderVals().confirmDelCancel(); vmOf(P, 1760000920002).del(); await P.c.renderVals().confirmDelDo();
  assert.equal(byId(P, 1760000920002), undefined, 'حُذف R2 نفسُه');
  assert.ok(byId(P, 1760000920003), 'وبقي R3: ' + JSON.stringify(P.toasts));
  /* القبولُ نيابةً لعامة (نافذةُ المداومين) */
  const Q = await page(JSON.stringify({ [DAY]: three() }), emps3, users3);
  Q.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(Q, 1760000920002).accept();
  assert.ok(Q.c.state.acceptRef, 'نافذةُ القبول');
  await remote(Q, (S) => { S[DAY] = S[DAY].filter((q) => q[13] !== 1760000920001); });
  await Q.c._tkDutyVals().dutyList.find((x) => x.name === emp(2).name).click();
  assert.equal(byId(Q, 1760000920002)[14], null, 'لا قبول من نسخة قديمة');
  assert.ok(Q.c.state.acceptRef);
  await Q.c.renderVals().closeAccept(); vmOf(Q, 1760000920002).accept();
  await Q.c._tkDutyVals().dutyList.find((x) => x.name === emp(2).name).click();
  assert.equal(byId(Q, 1760000920002)[14], 'tst_e_p0_2', 'أُسند R2: ' + JSON.stringify(Q.toasts));
  assert.equal(byId(Q, 1760000920003)[14], null, 'وR3 عامةٌ كما هي'); assert.equal(byId(Q, 1760000920003)[11], null);
  /* الإنهاءُ لعامةٍ مقبولة */
  const acc0 = Date.now() - 600e3;
  const W = await page(JSON.stringify({ [DAY]: three(() => ({ st: 'in_progress' })).map((r) => { r[11] = acc0; return r; }) }), emps3, users3);
  W.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(W, 1760000920002).finish();
  assert.ok(W.c.state.confirmFinish, 'نافذةُ الإنهاء');
  await remote(W, (S) => { S[DAY] = S[DAY].filter((q) => q[13] !== 1760000920001); });
  await W.c.renderVals().confirmFinishDo();
  assert.equal(byId(W, 1760000920002)[3], 'in_progress', 'لا إنهاء تلقائي من نسخة قديمة');
  assert.ok(W.c.state.confirmFinish);
  await W.c.renderVals().confirmFinishCancel(); vmOf(W, 1760000920002).finish(); await W.c.renderVals().confirmFinishDo();
  assert.equal(byId(W, 1760000920002)[3], 'done', 'أُنهي R2: ' + JSON.stringify(W.toasts));
  assert.equal(byId(W, 1760000920003)[3], 'in_progress', 'وR3 كما هو');
});

test('(V-6) مهمةٌ عامةٌ أغلقها الخادم (أُلغيت · أُعيد إسنادُها): لا «قبول» ولا «إنهاء» يُعرضان — ولا تُقبل ولا تُنهى — والمعلّقةُ كما هي', async () => {
  const s = NOON, acc0 = Date.now() - 600e3;
  for (const asg of ['cancelled', 'reassigned']) {
    const r0 = tRow({ id: 1760000930001, t: 'أغلقها الخادم', s, e: s + 3600e3 }); r0[23] = { v: 2, asg, can: { at: 1 }, re: { at: 1 } };
    const r1 = tRow({ id: 1760000930002, t: 'أغلقها الخادم وقُبلت', s, e: s + 3600e3, st: 'in_progress' }); r1[11] = acc0; r1[23] = { v: 2, asg, can: { at: 1 }, re: { at: 1 } };
    const r2 = tRow({ id: 1760000930003, t: 'معلّقة', s, e: s + 3600e3 });
    const P = await page(JSON.stringify({ [DAY]: [r0, r1, r2] }), emps, users);
    P.c.setState({ year: HIJ.year, month: HIJ.month });
    assert.equal(vmOf(P, r0[13]).showAccept, false, asg + ': لا «قبول»');
    assert.equal(vmOf(P, r1[13]).showFinish, false, asg + ': لا «إنهاء»');
    assert.equal(vmOf(P, r2[13]).showAccept, true, 'المعلّقةُ يُعرض قبولُها');
    const before = P.store.get('bassam_tasks_v1');
    vmOf(P, r0[13]).accept();
    await P.c._tkDutyVals().dutyList.find((x) => x.name === emp(1).name).click();
    assert.equal(P.store.get('bassam_tasks_v1'), before, asg + ': لا تُقبل');
    P.c._tkOpen({ acceptRef: { d: HIJ.day, i: 0, k: P.c._tkKey(r0), title: r0[0] } }); await P.c._doAccept('', null);
    assert.equal(P.store.get('bassam_tasks_v1'), before, asg + ': ولا «قبولٌ بلا تعيين»');
    await P.c._doFinish(HIJ.day, 1, P.c._tkKey(r1));
    assert.equal(P.store.get('bassam_tasks_v1'), before, asg + ': ولا تُنهى');
    assert.ok(P.toasts.some((t) => /ملغاةٌ أو أُعيد إسنادُها/.test(t[0])), JSON.stringify(P.toasts));
    /* والمعلّقةُ تُقبل نيابةً كما هي */
    vmOf(P, r2[13]).accept();
    await P.c._tkDutyVals().dutyList.find((x) => x.name === emp(1).name).click();
    assert.equal(byId(P, r2[13])[14], 'tst_e_p0_1');
  }
});

test('(C-1) ختم الصف البعيد يرفض المسودة القديمة ويحفظ مدخلاتها؛ بعد مراجعة صريحة تبقى عمليات التعديل والحذف والقبول والإنهاء على هويته', async () => {
  const emps3 = [emp(1), emp(2), emp(3)], users3 = [acc(1), acc(2), acc(3)];
  const stamp = async (P, id) => await remote(P, (S) => { const q = S[DAY].find((x) => x[13] === id); q[22] = 'T' + id; });   /* 071: settings/reopen تختم 22 حين يغيب */
  const R = three((n) => ({ eid: 'tst_e_p0_' + n, name: emp(n).name }));
  assert.ok(R.every((r) => r[22] == null), 'صفوفٌ قديمةٌ بلا طابع');
  const P = await page(JSON.stringify({ [DAY]: R }), emps3, users3);
  P.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(P, R[1][13]).edit(); await stamp(P, R[1][13]);
  P.c.setState({ newTitle: TAG + ' R2 مصحَّح' }); await P.c.renderVals().submitTask();
  assert.equal(byId(P, R[1][13])[0], R[1][0]); assert.equal(P.c.state.newTitle, TAG + ' R2 مصحَّح');
  await reviewEdit(P, R[1][13], TAG + ' R2 مصحَّح');
  assert.equal(byId(P, R[1][13])[0], TAG + ' R2 مصحَّح', 'التعديل: ' + JSON.stringify(P.toasts));
  assert.equal(byId(P, R[1][13])[22], 'T' + R[1][13], 'والطابعُ باقٍ');
  vmOf(P, R[2][13]).del(); await stamp(P, R[2][13]); await P.c.renderVals().confirmDelDo();
  assert.ok(byId(P, R[2][13])); await P.c.renderVals().confirmDelCancel(); vmOf(P, R[2][13]).del(); await P.c.renderVals().confirmDelDo();
  assert.equal(byId(P, R[2][13]), undefined, 'الحذف: ' + JSON.stringify(P.toasts));
  const Q = await page(JSON.stringify({ [DAY]: three() }), emps3, users3);
  Q.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(Q, 1760000920002).accept(); await stamp(Q, 1760000920002);
  await Q.c._tkDutyVals().dutyList.find((x) => x.name === emp(2).name).click();
  assert.equal(byId(Q, 1760000920002)[14], null); await Q.c.renderVals().closeAccept(); vmOf(Q, 1760000920002).accept();
  await Q.c._tkDutyVals().dutyList.find((x) => x.name === emp(2).name).click();
  assert.equal(byId(Q, 1760000920002)[14], 'tst_e_p0_2', 'القبول: ' + JSON.stringify(Q.toasts));
  const acc0 = Date.now() - 600e3;
  const W = await page(JSON.stringify({ [DAY]: three(() => ({ st: 'in_progress' })).map((r) => { r[11] = acc0; return r; }) }), emps3, users3);
  W.c.setState({ year: HIJ.year, month: HIJ.month });
  vmOf(W, 1760000920002).finish(); await stamp(W, 1760000920002); await W.c.renderVals().confirmFinishDo();
  assert.equal(byId(W, 1760000920002)[3], 'in_progress'); await W.c.renderVals().confirmFinishCancel(); vmOf(W, 1760000920002).finish(); await W.c.renderVals().confirmFinishDo();
  assert.equal(byId(W, 1760000920002)[3], 'done', 'الإنهاء: ' + JSON.stringify(W.toasts));
  assert.ok([P, Q, W].every((x) => x.toasts.some((t) => /المسودة|لم يُحفظ|تعذّر|تغيّرت|لم يُؤك/.test(t[0]))), 'التعارض معلن ولا يُخفى بختم بعيد');
});

test('(C-3) قائمةُ الصفّ المفتوحة تبقى مع صفّها بعد حذفٍ بعيدٍ قبله — و«إعادةُ الفتح» منها على الصفّ نفسِه', async () => {
  const emps3 = [emp(1), emp(2), emp(3)], users3 = [acc(1), acc(2), acc(3)], fin = Date.now() - 300e3, acc0 = Date.now() - 900e3;
  const R = three((n) => ({ eid: 'tst_e_p0_' + n, name: emp(n).name, st: 'done' })).map((r) => { r[11] = acc0; r[12] = fin; return r; });
  const P = await page(JSON.stringify({ [DAY]: R }), emps3, users3);
  const calls = P.requests;
    P.c.setState({ year: HIJ.year, month: HIJ.month });
    vmOf(P, R[1][13]).rmToggle();                                              /* يفتح قائمةَ R2 */
    assert.equal(vmOf(P, R[1][13]).rmOpen, true);
    await remote(P, (S) => { S[DAY] = S[DAY].filter((q) => q[13] !== R[0][13]); });
    assert.equal(vmOf(P, R[1][13]).rmOpen, true, 'القائمةُ مع R2 بعد الإزاحة');
    assert.equal(vmOf(P, R[2][13]).rmOpen, false, 'لا مع R3');
    const it = vmOf(P, R[1][13]).rmItems.find((x) => /إعادة|فتح/.test(x.name || ''));
    assert.ok(it, 'بندُ إعادة الفتح في قائمة R2: ' + JSON.stringify(vmOf(P, R[1][13]).rmItems.map((x) => x.name)));
    it.run ? it.run() : it.click && await it.click({});
    await P.drain();
    const re = calls.filter((c) => /\/api\/tasks\/reopen/.test(c.route));
    assert.equal(re.length, 1, JSON.stringify(calls.map((c) => c.route)));
    assert.equal(re[0].body.id, R[1][13], 'أُعيد فتحُ R2 نفسِه لا R3');
    assert.equal((await re[0].promise).j.ok, 1, 'إقرار API الحقيقي لا mock200');
    assert.equal(byId(P, R[2][13])[3], 'done', 'R3 غير مستهدف');
    /* و«إعادة الفتح» بموضعٍ قديمٍ (إزاحةٌ بعد بناء الصفوف) تبقى بهويته */
    calls.length = 0; P.c._doReopen(HIJ.day, 1, P.c._tkKey(R[1]));
    await P.drain();
    assert.equal(calls.filter((c) => /reopen/.test(c.route))[0].body.id, R[1][13]);
});

const twinsDay = async () => { const t0 = Date.now() - 600e3, gid = 1760000940009;
  const X = tRow({ id: 1760000940001, t: 'قبلهما', s: NOON, e: NOON + 3600e3 });
  const T1 = tRow({ id: gid, t: 'جماعية قديمة', s: NOON, e: NOON + 3600e3, st: 'declined', r20: { at: t0, why: TAG + ' ظرف' } });
  const T2 = tRow({ id: gid, t: 'جماعية قديمة', s: NOON, e: NOON + 3600e3, r20: { ack: t0 } });
  const P = await page(JSON.stringify({ [DAY]: [X, T1, T2] }), emps, users);
  P.c.setState({ year: HIJ.year, month: HIJ.month });
  const twins = () => { P.c.setState({ tasksAll: null }); return vmsOf(P.c.renderVals()).filter((x) => x.tkcT[13] === gid); };
  const t2 = () => twins().find((x) => x.tkcT[3] !== 'declined'), t1 = () => twins().find((x) => x.tkcT[3] === 'declined');   /* ترتيبُ العرض ليس ترتيبَ المخزن */
  return { P, X, gid, twins, t1, t2 };
};

test('(D-1 أ) توأمان بالهوية نفسِها (فردان يتيمان لمجموعةٍ قديمة): قائمةُ أحدهما وحده تُفتح', async () => {
  const { twins, t1, t2 } = await twinsDay();
  assert.equal(twins().length, 2);
  t2().rmToggle();
  assert.deepEqual([t1().rmOpen, t2().rmOpen], [false, true], 'قائمةُ T2 وحدها');
});

test('(D-1 ب) وحذفُ أحد التوأمين بعد إزاحة صفوف اليوم: KIVO_265 · حادثةُ الصور (البند 5) — صفٌّ عليه نشاط (أكّد استلامَه) لا يُحذف: يبقى التوأمان وتظهر رسالةُ الإلغاء', async () => {
  const { P, X, gid, t2 } = await twinsDay();
  t2().del();
  assert.ok(P.c.state.confirmDel);
  await remote(P, (S) => { S[DAY] = S[DAY].filter((q) => q[13] !== X[13]); });       /* حذفٌ بعيدٌ قبلهما ⇒ إزاحة */
  await P.c.renderVals().confirmDelDo();
  const L = JSON.parse(P.store.get('bassam_tasks_v1'))[DAY].filter((q) => q && q[13] === gid);
  assert.equal(L.length, 2, 'لا حذفَ لصفٍّ عليه نشاط (كان: يُحذف T2 دون توأمه) — ' + JSON.stringify(P.toasts));
  assert.ok(P.toasts.some(([t]) => /لا تُحذف مهمةٌ بدأ عليها نشاطٌ/.test(String(t))), 'رسالةُ «استعمل إلغاء»: ' + JSON.stringify(P.toasts));
  assert.equal(P.c.state.confirmDel, null, 'أُغلقت نافذةُ التأكيد');
});

test('معرّف موظف مفقود يبقى إسنادًا قائمًا؛ لا يُعامل كـnull orphan ولا يُمحى نشاطه أو إثباته بالتعديل', async () => {
  const r0 = tRow({ id: 1760000950001, t: 'موظف مفقود وله نشاط', s: NOON, e: NOON + 3600e3, eid: 'TEST_ONLY_MISSING_EMPLOYEE', name: 'TEST_ONLY historical assignee', st: 'in_progress', r20: { ack: Date.now() - 600e3 }, r21: { imgs: [], note: 'TEST_ONLY preserved proof', at: Date.now() - 300e3 } });
  r0[11] = Date.now() - 600e3;
  const P = await page(JSON.stringify({ [DAY]: [r0] }), emps, users), before = P.store.get('bassam_tasks_v1');
  P.c.setState(editState(P, r0, { tst_e_p0_2: emp(2).name }));
  await P.c.renderVals().submitTask();
  assert.equal(P.store.get('bassam_tasks_v1'), before, 'الهوية والتوثيق والنشاط باقية في SQL');
  assert.equal(P.requests.filter(call => call.route === '/api/tasks/settings').length, 0, 'لا طلب تسوية صامت لغياب سجل الموظف');
  assert.equal(P.c.state.newTaskOpen, true, 'المسودة باقية للمراجعة وإجراء إعادة الإسناد/الربط المناسب');
  assert.ok(P.toasts.some(([text]) => /إسناد|نشاط/.test(text)), JSON.stringify(P.toasts));
});
