/* KIVO_264 · KIVO-Tasks — سلامةُ بيانات الإثبات عند تعديل المهمة (مطلبُ المالك صراحةً: «راجع سلامة بيانات الإثبات عند تعديل المهمة»).
   العيب (AS_IS.md RC-12): فرعُ «تعديل مهمةٍ فردية» في submitTask (src/modules/tasks/logic.js) يبني الصفَّ الجديد بـ20 عموداً (0…19) فيُسقط
   العمودين 20 (الاعتذار/الانقضاء) و21 (التوثيق: الصورُ والملاحظة) — ثم يحفظ المخزن فيُزيل imgSync مرجعَ الصورة ويكنسها من المخزن.
   أي أن تعديلَ عنوانِ مهمةٍ منجزةٍ يحذف إثباتَ إنجازها نهائياً. يُثبَت هنا بشيفرة الصفحة الحقيقية (vm + KIVO.BassamPageKit الحقيقي)
   والعاملِ الحقيقي: (أ) على شيفرة KIVO_263 (git show KIVO_263:…) العيبُ قائمٌ في الواجهة (ترسل الصفَّ بـ20 عموداً) — وKIVO_265 (F-10 من SR-2.3 في الخادم ·
   tkKeepSelf) يعيد العمودين ويُبقي الصورة حتى لتبويبٍ قديم (حمايةٌ مزدوجة · كان الخادمُ قبله يكتب الصفَّ ناقصاً ويكنس الصورة) ·
   (ب) على المصدر الحالي (الإصلاح في الواجهة) الإثباتُ والصورةُ باقيان. */
import './clock.mjs';   /* V7 P3: ساعةُ الاختبار المثبَّتة (1448-5-9) — كان يُخفق في أول الشهر الهجري وبعد تبدّل الشهر (يُستورد أولاً) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, KT, YESTERDAY, IMG_ME, stored } from './tasks_fx.mjs';
import { attachTaskOperations, taskText, saveTaskDocuments } from './tasks_vm_operations_fx.mjs';

const WU = workerUnderTest();
const ref263 = (() => { try { return execFileSync('git', ['show', 'KIVO_263:src/modules/tasks/logic.js'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; } })();
/* صفحةُ المهام الحقيقية لمدير الإدارة — تخزينُها المحلي = قيمةُ المخزن من الخادم، والكتابةُ تُلتقط ثم تُحفظ بـ/api/save كما يفعل 280 */
async function tasksPage(logicSrc, storeJson, emps, W, ck) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {};
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {} };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.__BS_BOOT = { srv: 1, uid: 'tst_dm1' };
  ctx.fetch = (route, options = {}) => W.C.req(route, { ...options, cookie: ck });
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: 'tst_d1', name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }) };
  KIVO.BassamSup = { isSup: () => false };
  KIVO.BassamDepts = { active: () => 'tst_d1' };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast() {} bsAck() { return Promise.resolve(true); } };
  vm.runInContext(logicSrc + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const legacyStorage = { ...ctx.localStorage };
  const legacyGet = store.get.bind(store);
  const opsFixture = await attachTaskOperations(ctx, { W, ck, store });
  // Historical 263 source deliberately runs in its old test-only environment
  // to preserve the evidence of the original client defect. Current source
  // keeps the Operations/retired-Storage guard and uses its atomic command.
  if (logicSrc === ref263) { ctx.localStorage = legacyStorage; store.get = legacyGet; }
  return { c: new ctx.__C(), store, opsFixture };
}
async function editTitleOfDoneTask(logicSrc, mode) {
  const W = await world({ worker: WU.file, mode });
  const dm = await W.login('0000000101', '70101');
  const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(KT + ',bsdept:tst_d1:bassam_employees_v1'), { cookie: dm.ck });
  const [y, m, d] = YESTERDAY.split('-').map(Number);
  const S0 = JSON.parse(taskText(g.j, KT)), i = S0[YESTERDAY].findIndex(r => r[13] === 1760000000106 && r[14] === ME.eid);
  const P = await tasksPage(logicSrc, taskText(g.j, KT), JSON.parse(taskText(g.j, 'bsdept:tst_d1:bassam_employees_v1')), W, dm.ck);
  /* KIVO_265 · قفلُ اليوم: المهمةُ المعدَّلة من أمسِ المُثبِّت (tasks_fx · YESTERDAY) واليومُ المنقضي صار مقفلاً تلقائياً فترفض الواجهةُ تعديلَه.
     يُفتح بأثر رجعي أولاً بالقيمة التي يكتبها _setDayLockT(...,'open') نفسُها: {mo:1} على مفتاح «y-m-d» في bassam_tasks_locks_v1 (state.locked) —
     لا نقلُ الصفّ إلى اليوم (المُثبِّتُ مشتركٌ بين الملفات) · ولا حاجةَ لسببٍ في وضع الإنفاذ: الخادمُ لا يحكم إلا باعتماد الشهر («y-m»: true · tkLocked)
     فلا يُرسل مخزنُ الأقفال · وواجهةُ 263 تتجاهل مفاتيحَ الأيام. المختبَرُ كما هو: التعديلُ يحفظ الاعتذارَ والتوثيقَ والصورة */
  const form = Object.assign({}, P.c.state || {}, { year: y, month: m, newTaskOpen: true, newTitle: 'TEST_ONLY عنوانٌ مُعدَّل', newDesc: '', newPrio: 'normal', newDay: d, newEDay: d, newSh: 8, newSm: 0, newSap: 'ص', newEh: 10, newEm: 0, newEap: 'ص',
    newAsg: 'direct', newPick: { [ME.eid]: ME.name }, pickWt: '', newDur: '60', editRef: { d, i, grp: null, grpLabel: '' }, locked: { [YESTERDAY]: { mo: 1 } } });
  if (logicSrc === ref263) P.c.setState(form); else P.c._tkOpen(form);
  await P.c.renderVals().submitTask();
  const sent = JSON.parse(P.store.get('bassam_tasks_v1'))[YESTERDAY].find(r => r[13] === 1760000000106 && r[14] === ME.eid);   /* ما ترسله الواجهة */
  if (logicSrc === ref263) {
    const sv = await saveTaskDocuments(W, dm.ck, { [KT]: P.store.get('bassam_tasks_v1') });
    assert.ok(sv.j.revs && sv.j.revs[KT], 'المدير يحفظ التعديل التاريخي: ' + JSON.stringify(sv.j).slice(0, 160));
  }
  const row = Object.values(stored(W.env, KT)).flat().find(r => r[13] === 1760000000106 && r[14] === ME.eid);
  return { row, sent, img: W.env.DB.q('SELECT k FROM imgs WHERE k = ?', IMG_ME).length };
}

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] (أ) العيبُ على KIVO_263: واجهتُه تُسقط التوثيق (العمود 21) عند تعديل عنوانِ مهمةٍ منجزة — والخادمُ (F-10) يعيده ولا يكنس الصورة', { skip: ref263 ? false : 'لا تاريخ git (KIVO_263)' }, async () => {
    const r = await editTitleOfDoneTask(ref263, mode);
    assert.equal(r.sent.length, 20, 'العيبُ في واجهة 263: الصفُّ المعدَّل يُرسل بـ20 عموداً'); assert.equal(r.sent[21], undefined, 'والتوثيقُ ساقطٌ ممّا ترسله');
    assert.equal(r.row[0], 'TEST_ONLY عنوانٌ مُعدَّل', 'والتعديلُ نفسُه يُحفظ');
    /* KIVO_265 · F-10 (SR-2.3 في الخادم): العمودان 20 و21 يعودان من القيمة الحالية — وكان الخادمُ قبله يكتب 20 عموداً ويكنس الصورة */
    assert.deepEqual(r.row[21] && r.row[21].imgs, [IMG_ME], 'الخادمُ أعاد التوثيقَ رغم واجهة 263');
    assert.equal(r.img, 1, 'وصورةُ الإثبات باقيةٌ في المخزن');
  });
  test('[' + mode + '] (ب) الإصلاح (src/modules/tasks/logic.js): التعديلُ يحفظ الاعتذارَ والتوثيق — والصورةُ باقية', async () => {
    const r = await editTitleOfDoneTask(moduleLogic('tasks'), mode);
    assert.equal(r.row[0], 'TEST_ONLY عنوانٌ مُعدَّل');
    assert.deepEqual(r.row[21] && r.row[21].imgs, [IMG_ME], 'التوثيقُ باقٍ');
    assert.equal(r.img, 1, 'والصورةُ في المخزن');
  });
}
