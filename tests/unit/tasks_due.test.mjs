/* KIVO_265 · البند 10 من قائمة صفحة المهام (قرارُ المالك 2026-10-19): التذكيرُ قبل المهلة والتصعيدُ عند التأخر من الخادم (074 tkDueRun) — على العامل الحقيقي بالوضعين:
     (أ) soon: بقي ≤ ساعة ⇒ task_soon للمكلَّف مرةً واحدة (once) — تحرّكه قراءةُ «مهامي» (ومعها الاستطلاع since) وفتحُ صفحة المهام (recur/run)
     (ب) late: تجاوزت المهلةَ وبدأت ⇒ task_late للمكلَّف وصاحبِ المهمة ولأدوار lead/mgr · لا r20.exp للمبدوءة
     (ج) exp: لم تبدأ وانقضت نافذتُها (المهلة + سماحُ التأخر) ⇒ r20.exp + حدثُ expired (via due · sys) + «لم تُقبل» لصاحبها · وداخل السماح late بلا exp
     (د) لا شيءَ للمسلَّمة للمراجعة ولا للمنجزة ولا للأقدم من 48 ساعة
     (هـ) صفٌّ قديمٌ بلا صاحب (x غائب) ⇒ يكتب باسم مدير الإدارة ويُنبَّه mgr:<الإدارة>
     (و) المصدرُ هويةُ الخادم (srv:due) · والواجهةُ (442) لم تعد تُصدر soon/late */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, workerUnderTest, ME, KT, notificationMessages, notificationDedup, TAG, stored, putKV, hij, HR, row } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const MIN = 60e3;
const notifs = (W) => notificationMessages(W.env);
const seen = (W) => notificationDedup(W.env);
const rowOf = (W, id) => Object.values(stored(W.env, KT)).flat().find((r) => Array.isArray(r) && r[13] === id);
const run = (W) => post(W, W.su.ck, '/api/tasks/recur/run?dept=tst_d1', {});
async function mk(W, ck, o) {                                                   /* تُنشأ في المستقبل ثم تُزاح أوقاتُها إلى موضع الاختبار (الإنشاءُ يرفض المهلةَ الماضية) */
  const s0 = Date.now() + 3 * HR, c = await post(W, ck, '/api/tasks/create', Object.assign({ k: hij(s0), t: TAG + ' ' + o.t, s: s0, e: s0 + HR, asg: [ME.eid], rv: o.rv || 'none' }, o.win ? { win: o.win } : {}));
  assert.equal(c.status, 200, JSON.stringify(c.j));
  const id = c.j.rows[0].id, k0 = c.j.rows[0].k, S = stored(W.env, KT), k1 = hij(o.s);
  const r = S[k0].find((q) => q[13] === id); S[k0] = S[k0].filter((q) => q[13] !== id); r[15] = o.s; r[16] = o.e;
  if (o.acc) r[11] = o.acc; if (o.st) r[3] = o.st; if (o.r21) r[21] = o.r21;
  (S[k1] = S[k1] || []).push(r); putKV(W.env, KT, S);
  return { k: k1, id };
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) soon: بقي ≤ ساعة ⇒ task_soon للمكلَّف مرةً واحدة — من قراءة «مهامي» والاستطلاع وفتح صفحة المهام', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const now = Date.now();
    const a = await mk(W, dm.ck, { t: 'قريبة', s: now - 30 * MIN, e: now + 30 * MIN });
    const far = await mk(W, dm.ck, { t: 'بعيدة', s: now + 2 * HR, e: now + 3 * HR });
    assert.equal((await get(W, me.ck, '/api/me/tasks')).status, 200);
    const sn = notifs(W).filter((n) => n.type === 'task_soon' && /قريبة/.test(n.body));   /* عُدّةُ البيانات تحمل صفوفاً أخرى قريبةً من مهلتها — تُذكَّر هي أيضاً */
    assert.equal(sn.length, 1, 'تذكيرٌ واحد: ' + JSON.stringify(sn.map((n) => n.body)));
    assert.ok(sn[0].employee_targets.includes(ME.eid) && sn[0].server_origin === 1 && /قريبة/.test(sn[0].body) && /دقيقة/.test(sn[0].body), JSON.stringify(sn[0]));
    assert.ok(seen(W).some(row => row.once_key === 'soon:' + a.k + ':' + a.id && row.created_at > 0), 'مفتاحُ once');
    assert.ok(!notifs(W).some((n) => n.type === 'task_soon' && /بعيدة/.test(n.body)), 'البعيدةُ لا تُذكَّر');
    const rv = (await get(W, me.ck, '/api/me/tasks')).j.rev;
    assert.equal((await get(W, me.ck, '/api/me/tasks?since=' + rv)).status, 200);
    const r1 = await run(W); assert.equal(r1.status, 200); assert.ok(r1.j.due && typeof r1.j.due.soon === 'number', 'تقريرُ المسح في ردّ التوليد: ' + JSON.stringify(r1.j.due));
    assert.equal(notifs(W).filter((n) => n.type === 'task_soon' && /قريبة/.test(n.body)).length, 1, 'لا تكرارَ مع الاستطلاع ولا مع التشغيل الصريح');
    assert.ok(!notifs(W).some((n) => n.type === 'task_soon' && /بعيدة/.test(n.body)), 'لا شيءَ للبعيدة');
  });

  test(M + '(ب) late: تجاوزت المهلةَ وبدأت ⇒ task_late للمكلَّف وصاحبِها ولأدوار الإدارة · لا exp للمبدوءة', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const now = Date.now();
    const a = await mk(W, dm.ck, { t: 'متأخرة جارية', s: now - 2 * HR, e: now - 10 * MIN, acc: now - 100 * MIN });
    const r1 = await run(W); assert.equal(r1.status, 200, JSON.stringify(r1.j)); assert.ok(r1.j.due.late >= 1, JSON.stringify(r1.j.due));
    const ln = notifs(W).filter((n) => n.type === 'task_late' && /متأخرة جارية/.test(n.body));
    assert.equal(ln.length, 1, JSON.stringify(ln));
    assert.ok(ln[0].employee_targets.includes(ME.eid), 'المكلَّف'); assert.ok(ln[0].employee_targets.includes('tst_dm1') || ln[0].employee_targets.includes('mgr:tst_d1'), 'صاحبُ المهمة: ' + JSON.stringify(ln[0].to));
    assert.deepEqual(ln[0].role_targets, ['lead', 'mgr']); assert.equal(ln[0].priority, 'urg'); assert.ok(/موظف مهام 1/.test(ln[0].body) && /[\d٠-٩]{1,2}:[\d٠-٩]{2}/.test(ln[0].body), ln[0].body);
    assert.ok(!(rowOf(W, a.id)[20] || {}).exp, 'المبدوءةُ لا تُوسم منقضية');
    await run(W); assert.equal(notifs(W).filter((n) => n.type === 'task_late' && /متأخرة جارية/.test(n.body)).length, 1, 'مرةً واحدة');
  });

  test(M + '(ج) exp: لم تبدأ وانقضت نافذتُها ⇒ r20.exp + حدثُ expired (due) + «لم تُقبل» لصاحبها · وداخل السماح late بلا exp', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const now = Date.now();
    const gone = await mk(W, dm.ck, { t: 'لم تُقبل وانقضت', s: now - 5 * HR, e: now - 3 * HR });             /* late الافتراضي ساعتان ⇒ النافذةُ انقضت */
    const grace = await mk(W, dm.ck, { t: 'لم تُقبل وفي السماح', s: now - 3 * HR, e: now - 1 * HR });
    const tight = await mk(W, dm.ck, { t: 'بلا سماح', s: now - 2 * HR, e: now - 5 * MIN, win: { early: 0, late: 0 } });
    const r1 = await run(W); assert.equal(r1.status, 200, JSON.stringify(r1.j)); assert.ok(r1.j.due.exp >= 2, JSON.stringify(r1.j.due));
    assert.ok((rowOf(W, gone.id)[20] || {}).exp > 0, 'exp كُتب'); assert.ok((rowOf(W, tight.id)[20] || {}).exp > 0, 'late 0 ⇒ منقضيةٌ فور المهلة');
    assert.ok(!(rowOf(W, grace.id)[20] || {}).exp, 'داخل السماح لا exp');
    assert.ok(notifs(W).some((n) => n.type === 'task_chg' && /لم تُقبل/.test(n.body) && /لم تُقبل وانقضت/.test(n.body) && (n.employee_targets.includes('tst_dm1') || n.employee_targets.includes('mgr:tst_d1'))), 'صاحبُها نُبِّه');
    assert.ok(!notifs(W).some((n) => n.type === 'task_chg' && /وفي السماح/.test(n.body)), 'لا «لم تُقبل» داخل السماح');
    for (const t of ['لم تُقبل وانقضت', 'وفي السماح', 'بلا سماح']) assert.equal(notifs(W).filter((n) => n.type === 'task_late' && n.body.includes(t)).length, 1, 'late لـ' + t);
    const ev = W.env.DB.q("SELECT ctx, aft FROM aud WHERE k = ? AND act = 'expired' AND ename LIKE '%لم تُقبل وانقضت%'", KT);
    assert.ok(ev.length >= 1, 'حدثُ expired'); const cx = JSON.parse(ev[0].ctx); assert.equal(cx.via, 'due'); assert.equal(cx.sys, 1); assert.ok(JSON.parse(ev[0].aft).exp > 0);
    const ip = W.env.DB.q("SELECT ip, dev FROM aud WHERE k = ? AND act = 'expired' AND ename LIKE '%لم تُقبل وانقضت%'", KT)[0];
    assert.equal(ip.ip, 'srv:due'); assert.equal(ip.dev, 'srv:due');
    const x = await post(W, me.ck, '/api/me/tasks/act', { k: gone.k, id: gone.id, act: 'expire' });
    assert.equal(x.status, 200); assert.equal(x.j.noop, 1, 'فعلُ الموظف لا يكرّر الوسمَ ولا التنبيه');
    assert.equal(notifs(W).filter((n) => n.type === 'task_chg' && /لم تُقبل وانقضت/.test(n.body)).length, 1);
    assert.equal((await run(W)).j.due.exp, 0, 'لا إعادةَ وسم');
    assert.equal(notifs(W).filter((n) => n.type === 'task_chg' && /لم تُقبل وانقضت/.test(n.body)).length, 1, 'ولا إعادةَ تنبيه');
  });

  test(M + '(د) لا شيءَ للمسلَّمة للمراجعة ولا للمنجزة ولا للأقدم من 48 ساعة', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const now = Date.now();
    await mk(W, dm.ck, { t: 'مسلَّمة', s: now - 3 * HR, e: now - 10 * MIN, acc: now - 2 * HR, rv: 'creator', r21: { imgs: [], note: '', sub: now - 20 * MIN } });   /* بمراجِع: بانتظار قراره */
    await mk(W, dm.ck, { t: 'منجزة', s: now - 3 * HR, e: now - 10 * MIN, acc: now - 2 * HR, st: 'done' });
    await mk(W, dm.ck, { t: 'قديمة جداً', s: now - 60 * HR, e: now - 50 * HR });
    const n0 = notifs(W).filter((n) => /مسلَّمة|منجزة|قديمة جداً/.test(n.body)).length;
    const r1 = await run(W); assert.equal(r1.status, 200);
    assert.equal(notifs(W).filter((n) => /مسلَّمة|منجزة|قديمة جداً/.test(n.body)).length, n0, JSON.stringify(notifs(W).map((n) => n.type + ':' + n.body)));
    assert.ok(!rowOf(W, (await mk(W, dm.ck, { t: 'x', s: now - 60 * HR, e: now - 50 * HR })).id)[20], 'القديمةُ لا تُوسم');
  });

  test(M + '(هـ) صفٌّ قديمٌ بلا صاحب ⇒ يكتب باسم مدير الإدارة ويُنبَّه mgr:<الإدارة> · والمصدرُ srv:due', async () => {
    const W = await world({ worker: WU.file, mode });
    const now = Date.now(), k = hij(now - 4 * HR), S = stored(W.env, KT);
    const r = row({ title: 'قديمة بلا صاحب', eid: ME.eid, s: now - 4 * HR, e: now - 3 * HR }); (S[k] = S[k] || []).push(r); putKV(W.env, KT, S);
    const r1 = await run(W); assert.equal(r1.status, 200, JSON.stringify(r1.j)); assert.ok(r1.j.due.exp >= 1 && r1.j.due.skipped === 0, JSON.stringify(r1.j.due));
    assert.ok((rowOf(W, r[13])[20] || {}).exp > 0, 'وُسمت منقضية');
    const ln = notifs(W).find((n) => n.type === 'task_late' && /قديمة بلا صاحب/.test(n.body)); assert.ok(ln, 'late'); assert.ok(ln.employee_targets.includes('mgr:tst_d1'), JSON.stringify(ln.to));
    const ev = W.env.DB.q("SELECT uid, ip FROM aud WHERE k = ? AND act = 'expired' AND ename LIKE '%قديمة بلا صاحب%'", KT)[0];
    assert.equal(ev.uid, 'tst_dm1'); assert.equal(ev.ip, 'srv:due');
  });
}

test('(و) الواجهة (442) لم تعد تُصدر task_soon/task_late — الخادمُ وحده (074)', () => {
  const src = fs.readFileSync(path.join(process.env.KIVO_SRC || path.resolve('src'), 'services', '442-notif-observer.js'), 'utf8');
  assert.ok(!/emit\('task_soon'/.test(src) && !/emit\('task_late'/.test(src), 'لا إصدارَ من الواجهة');
  assert.ok(/074-task-due/.test(src), 'إحالةٌ إلى الخادم');
});
