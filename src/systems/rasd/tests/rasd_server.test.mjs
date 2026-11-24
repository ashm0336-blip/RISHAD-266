/* V7 · د6 (رصد الحالات) — الخادمُ الحقيقي (العاملُ المبنيّ على SQLite في الذاكرة · TEST_ONLY):
   ① النظامُ مطفأٌ افتراضياً لكل وحدة قائمة — سجلٌّ صريح بلا «rasd» وسلسلةٌ مفتوحة بلا سجلّ (optIn في system.json) — ويُفعَّل بسقف الوحدة وحده
   ② الخادمُ يرفض الطلبَ المصنوع يدوياً ممّن لا يملك الصلاحية (موظفٌ بلا دور · مديرُ وحدةٍ أخرى · مديرٌ والنظامُ مطفأ لوحدته) — والمخزَّن لا يتغيّر
   ③ القراءة: لا يصل مفتاحُ النظام لمن لا يقرؤه · ④ «سجل الحركة» يسجّل الحفظ · ⑤ التنبيهُ العاجل (rz_hot) يُقبل والنظامُ مفعّل ولا يُعرض والنظامُ مطفأ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB } from '../../../../tests/unit/v7_d6_import_fx.mjs';
import { A, B, G, REC, OPT, key, lab, rasdOn, readK, putK, REPORTS, OPTS, report } from './rasd_fx.mjs';

const denied = (r, k) => r.status !== 200 || !!(r.j && r.j.denied && Object.prototype.hasOwnProperty.call(r.j.denied, k)) || !(r.j && r.j.ok);

test('rasd · ① مطفأٌ افتراضياً لكل وحدة قائمة (سجلٌّ صريح · سلسلةٌ مفتوحة) ويُفتح بسقف الوحدة وحده — ② الطلبُ المصنوع يُرفض ولا يتغيّر شيء', async () => {
  const T = await lab();
  try {
    const su = T.su, mgr = await T.as(LAB.mgrA, LAB.pw), emp = await T.as(LAB.empA, LAB.pw), mgrB = await T.as(LAB.mgrB, LAB.pw);
    su.uid = su.uid || T.DB.q("SELECT uid FROM sess ORDER BY rowid LIMIT 1")[0].uid;
    const K = key(A, REC), doc = REPORTS(3, await T.today());   /* اليومُ الحالي: فترةٌ مفتوحة (القفلُ الزمني في rasd_retro.test.mjs) */
    /* ① سجلُّ الوحدة صريحٌ بلا «rasd» (كما في المختبر وكما تكون الوحدات القائمة) ⇒ مطفأ: مديرُ الوحدة نفسُه لا يكتب */
    const off = await T.save(mgr, K, doc);
    assert.ok(denied(off, K), 'manager wrote rasd while it is OFF for his unit: ' + off.t.slice(0, 200));
    assert.equal(readK(T.DB, K), null);
    /* سلسلةٌ مفتوحة (لا سجلَّ في الوحدة ولا في أصولها): النظامُ الجديد لا يُفتح ضمناً (optIn في system.json) — وبقيةُ الأنظمة مفتوحةٌ كما كانت */
    const P0 = readK(T.DB, 'bassam_perms_v1'), P1 = JSON.parse(JSON.stringify(P0));
    delete P1.caps[A]; delete P1.caps[G];
    await putK(T, 'bassam_perms_v1', P1);
    const open = await T.save(mgr, K, doc);
    assert.ok(denied(open, K), 'an open unit got rasd ON implicitly: ' + open.t.slice(0, 200));
    assert.equal(readK(T.DB, K), null);
    await putK(T, 'bassam_perms_v1', P0);
    /* يُفعَّل للوحدة ⇒ مديرُها يكتب */
    await rasdOn(T, A, true);
    const on = await T.save(mgr, K, doc);
    assert.equal(on.status, 200, on.t.slice(0, 300)); assert.equal(on.j.ok, 1); assert.deepEqual(on.j.denied || {}, {});
    assert.deepEqual(readK(T.DB, K), doc);
    /* ② موظفٌ بلا دور — طلبٌ مصنوع يدوياً يضيف حالة: مرفوض */
    const forged = { reports: doc.reports.concat([report(9, { byName: 'TEST_ONLY مزوّر', y: doc.reports[0].y, m: doc.reports[0].m, d: doc.reports[0].d })]) };
    const e1 = await T.save(emp, K, forged);
    assert.ok(denied(e1, K), 'employee without permission wrote rasd: ' + e1.t.slice(0, 200));
    /* مديرُ وحدةٍ أخرى يكتب مفتاحَ هذه الوحدة: مرفوض */
    const e2 = await T.save(mgrB, K, forged);
    assert.ok(denied(e2, K), 'manager of another unit wrote rasd: ' + e2.t.slice(0, 200));
    /* القوائم كذلك */
    const e3 = await T.save(emp, key(A, OPT), OPTS());
    assert.ok(denied(e3, key(A, OPT)), 'employee wrote the rasd lists');
    assert.deepEqual(readK(T.DB, K), doc, 'refused writes changed the stored records');
    assert.equal(readK(T.DB, key(A, OPT)), null);
    /* يُطفأ ثانيةً ⇒ حتى مديرُ الوحدة يُرفض والمخزَّن باقٍ (لا يُحذف) */
    await rasdOn(T, A, false);
    const e4 = await T.save(mgr, K, forged);
    assert.ok(denied(e4, K)); assert.deepEqual(readK(T.DB, K), doc);
    /* مديرُ المنصة يكتب دائماً (بلا قيد صلاحية — كما اليوم) */
    await rasdOn(T, A, true);
    const s1 = await T.save(su, key(A, OPT), OPTS());
    assert.equal(s1.status, 200, s1.t.slice(0, 200)); assert.deepEqual(s1.j.denied || {}, {});
    assert.deepEqual(readK(T.DB, key(A, OPT)), OPTS());
  } finally { await T.close(); }
});

test('rasd · ③ القراءةُ لمن يملكها وحده · ④ «سجل الحركة» يسجّل الحفظ', async () => {
  const T = await lab();
  try {
    const mgr = await T.as(LAB.mgrA, LAB.pw), emp = await T.as(LAB.empA, LAB.pw), K = key(A, REC), doc = REPORTS(2, await T.today());
    await rasdOn(T, A, true);
    const w = await T.save(mgr, K, doc);
    assert.equal(w.status, 200, w.t.slice(0, 200)); assert.deepEqual(w.j.denied || {}, {});
    const gm = await T.get(mgr, [K]);
    assert.equal(gm.status, 200); assert.ok(gm.j.keys && gm.j.keys[K] && JSON.parse(gm.j.keys[K].v).reports.length === 2, 'the manager reads the records: ' + gm.t.slice(0, 200));
    const ge = await T.get(emp, [K]);
    const leaked = ge.status === 200 && ge.j && ge.j.keys && ge.j.keys[K] && ge.j.keys[K].v != null && ge.j.keys[K].v.indexOf('zTEST_ONLY') !== -1;
    assert.ok(!leaked, 'an employee without rasd/records:view received the records: ' + ge.t.slice(0, 200));
    const aud = T.DB.q('SELECT * FROM aud WHERE k LIKE ?1', '%' + REC + '%');
    assert.ok(aud.length >= 1, 'no activity-log line for the rasd save');
  } finally { await T.close(); }
});

test('rasd · ⑤ التنبيهُ العاجل لمدير الإدارة (rz_hot) — يُقبل والنظامُ مفعّل · ولا يُعرض لأحد والنظامُ مطفأ للوحدة', async () => {
  const T = await lab();
  try {
    const mgr = await T.as(LAB.mgrA, LAB.pw), vars = { 'النوع': 'ازدحام', 'الموقع': 'باب 1', 'التأثير': 'حرج', 'الإجراء': 'تنظيم حركة', 'الراصد': 'TEST_ONLY راصد' };
    /* V7 · 53: srvfix (٨) — الفاعلُ لا يُنبَّه بفعله (rz_hot «فور الحفظ»): يُصدره مديرُ المنصة ويقرؤه مديرُ الإدارة (المستلم) */
    const emit = (once) => T.call('/api/notifications/act', { ck: T.su.ck, body: { uid: T.su.uid, op: 'emit', type: 'rz_hot', dept: A, vars, once } });
    const feed = async () => { const r = await T.call('/api/notifications?uid=' + encodeURIComponent(mgr.uid), { ck: mgr.ck }); assert.equal(r.status, 200, r.t.slice(0, 200)); return JSON.stringify(r.j); };
    await rasdOn(T, A, false);
    const r0 = await emit('TEST_ONLY_rz_off');
    assert.ok(r0.status === 200 || r0.status === 403, r0.t.slice(0, 200));
    assert.ok(!/TEST_ONLY راصد/.test(await feed()), 'a notification of a switched-off system is shown');
    await rasdOn(T, A, true);
    const r1 = await emit('TEST_ONLY_rz_on');
    assert.equal(r1.status, 200, r1.t.slice(0, 300)); assert.equal(r1.j.ok, 1);
    assert.ok(/TEST_ONLY راصد/.test(await feed()), 'the urgent rasd notification did not reach the department manager');
    /* يُطفأ ثانيةً: المخزَّنُ باقٍ ولا يُعرض */
    await rasdOn(T, A, false);
    assert.ok(!/TEST_ONLY راصد/.test(await feed()), 'switching rasd off did not hide its notification');
  } finally { await T.close(); }
});
