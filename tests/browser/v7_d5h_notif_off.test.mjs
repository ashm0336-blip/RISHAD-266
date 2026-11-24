/* V7 · د5-ح (قرار المالك · البند ٧) — تنبيهاتُ نظامٍ مطفأ «لا تظهر لأحد»، في المختبر المعزول (TEST_ONLY، بلا شبكة)، على العامل الحقيقي:
   · مطفأٌ لإدارة أ ⇒ مديرُها وموظفُها ومديرُ المنصة في مساحتها: لا يصلهم (لا يُولَّد) ولا يرونه (القائمة) ولا يحسبه العدّاد (الجرس · unread)؛
   · المخزَّنُ قبل الإطفاء باقٍ في القاعدة كما هو، محجوبٌ ما دام مطفأ، ويعود حين يُشغَّل؛
   · إدارةُ ب (مفعّلٌ فيها) تراه كالعادة؛ والمطفأُ على المنصة يحجبه عن الجميع. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', G = 'TEST_ONLY_G';
/* نوعان من نظامين: «مهمة متأخرة» (المهام · للموظف ومديره) و«حذف قطعة» (المضبوطات · للمدير ومدير المنصة) */
const TYPES = ['task_late', 'bx_del'], SYS = ['tasks', 'seized'];
const FULL = ['dstats', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin', 'emps'];
async function put(lab, k, v) {
  const DB = lab.env.DB;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)), DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
}
const setCaps = (lab, a, b, off = []) => Promise.all([
  put(lab, 'bassam_perms_v1', { caps: { [G]: FULL, [A]: a, [B]: b, TEST_ONLY_A_S1: a }, emps: {} }),
  put(lab, 'bassam_platform_v1', { mods: { off } })]);
const stored = (lab) => lab.env.DB.q("SELECT id, department, type FROM notification_messages WHERE type IN ('task_late','bx_del') ORDER BY id");
/* ما يراه الحساب: القائمةُ والعدّادُ من الخادم (الحكمُ الواحد) · والجرسُ في الصفحة (unread بعد التحديث) */
async function sees(s, dept) {
  const r = await s.api('/api/notifications' + (dept ? '?dept=' + dept : ''));
  const rows = ((r.j && (r.j.items || r.j.rows)) || []).filter((x) => TYPES.includes(x.type));
  await s.page.evaluate(() => KIVO.BassamNotif.refresh && KIVO.BassamNotif.refresh()).catch(() => {});
  await s.page.waitForTimeout(400);
  const bell = await s.page.evaluate((t) => KIVO.BassamNotif.list().filter((x) => t.includes(x.type)).length, TYPES);
  return { list: rows.length, unreadAll: (r.j && (r.j.unreadAll != null ? r.j.unreadAll : r.j.unread)) || 0, bell };
}
const emit = (s, dept, own) => s.api('/api/notifications/act', { method: 'POST', body: JSON.stringify({ op: 'emit-batch', events: TYPES.map((type) => ({ type, dept, own: own || [], vars: { 'المهمة': 'TEST_ONLY مهمة', 'الاسم': 'TEST_ONLY', 'الوقت': '10:00', 'القطعة': 'TEST_ONLY' } })) }) });

test('V7 · د5-ح (البند ٧) · notifications of an OFF system: not generated, not listed, not counted — for the manager, the employee and the platform admin; back when ON; platform-OFF too', { timeout: 900000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    await setCaps(lab, FULL, FULL);
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw); su.page.setDefaultTimeout(15000);
    await su.page.evaluate((d) => KIVO.BassamDepts.setActive(d), A); await su.page.reload({ waitUntil: 'domcontentloaded' }); await su.page.waitForTimeout(2500);
    /* ON: emitted for A (the employee is its «own», the manager its «mgr») and for B
       V7 · د7 (البند ٨): A's batch is emitted by manager A, so super (the «sys» recipient of bx_del) is not its actor. Manager A, the actor, does not
       get his own bx_del («فور الحذف») but still gets task_late (a condition event — exempt from the actor rule) */
    const mA = await openAs(b, lab, LAB.mgrA, LAB.pw), eA = await openAs(b, lab, LAB.empA, LAB.pw), mB = await openAs(b, lab, LAB.mgrB, LAB.pw);
    let e = await emit(mA, A, ['TEST_ONLY_eA1']); assert.equal(e.status, 200, JSON.stringify(e.j));
    e = await emit(su, B, []); assert.equal(e.status, 200, JSON.stringify(e.j));
    await lab.idle();
    const rows0 = stored(lab); assert.equal(rows0.length, 4, 'four stored: ' + JSON.stringify(rows0));
    const who = { 'manager A': mA, 'employee A': eA };
    const ON = { 'manager A': 1, 'employee A': 1 };
    for (const [n, s] of Object.entries(who)) assert.equal((await sees(s)).list, ON[n], 'ON: ' + n + ' sees them');
    assert.equal((await sees(mB)).list, 2, 'ON: manager B sees B\'s');
    assert.equal((await sees(su, A)).list, 1, 'ON: super in A\'s space sees A\'s «sys» one');
    const before = {}; for (const [n, s] of Object.entries(who)) before[n] = await sees(s);
    /* OFF for A only */
    await setCaps(lab, FULL.filter((k) => !SYS.includes(k)), FULL);
    for (const [n, s] of Object.entries(who)) {
      const v = await sees(s);
      assert.equal(v.list, 0, 'OFF: ' + n + ' does not see it'); assert.equal(v.bell, 0, 'OFF: not in ' + n + '\'s bell');
      assert.equal(v.unreadAll, before[n].unreadAll - ON[n], 'OFF: ' + n + '\'s unread counter excludes them');
    }
    assert.equal((await sees(su, A)).list, 0, 'OFF: super inside A\'s space does not see it');
    assert.equal((await sees(mB)).list, 2, 'B (ON there) still sees B\'s');
    e = await emit(su, A, ['TEST_ONLY_eA1']); await lab.idle();
    assert.equal(stored(lab).length, 4, 'OFF: no new event for A is generated (' + JSON.stringify(e.j) + ')');
    assert.deepEqual(stored(lab), rows0, 'the stored notifications are untouched (no delete)');
    assert.equal(lab.env.DB.q("SELECT COUNT(*) AS n FROM notification_user_state WHERE read_at>0").map((r) => r.n)[0] || 0, 0, 'nor marked read by the filter');
    /* back ON ⇒ the stored one is back */
    await setCaps(lab, FULL, FULL);
    for (const [n, s] of Object.entries(who)) assert.equal((await sees(s)).list, ON[n], 'ON again: ' + n + ' sees them again');
    assert.equal((await sees(su, A)).list, 1, 'ON again: super in A');
    /* OFF on the platform ⇒ nobody, in A or B */
    await setCaps(lab, FULL, FULL, SYS);
    for (const [n, s] of Object.entries(Object.assign({ 'manager B': mB }, who))) assert.equal((await sees(s)).list, 0, 'platform OFF: ' + n);
    assert.equal((await sees(su, A)).list, 0, 'platform OFF: super');
    e = await emit(su, B, []); await lab.idle();
    assert.equal(stored(lab).length, 4, 'platform OFF: not generated for B either');
    await setCaps(lab, FULL, FULL);
    assert.equal((await sees(mB)).list, 2, 'platform ON again: back');
    const errs = [su, mA, eA, mB].flatMap((s) => s.errs).filter((x) => !/ResizeObserver/.test(x));
    assert.deepEqual(errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
