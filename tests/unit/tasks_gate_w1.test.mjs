/* الفحصُ العميق 2026-10-21 · الموجة 1 · R8: «مهامك» في «ملفي» تبقى على «جارٍ تحميل مهامك…» 4–6 ث بعد كل تحميل — GET /api/me/tasks 4–5 ث على Test.
   الجذر: التوليدُ الكسول (073 tkRecurLazy) والمسحُ الكسول (074 tkDueLazy) يجريان داخل القراءة بحارسٍ في ذاكرة العزلة وحدها، والطلباتُ المتتالية تقع
   في عزلاتٍ مختلفة فيجريان في كلّ طلبٍ تقريباً (≈24 جولةَ D1 من 29). الإصلاح (074 tkLazyJobs · tkGateTake): حارسٌ مشترك في meta (tkg:rec/due:<الإدارة>)
   — على العامل الحقيقي بالوضعين، وكلُّ «عزلةٍ جديدة» هنا نسخةُ وحدةٍ جديدة فوق D1 نفسِها (كما على Cloudflare):
     (أ) القراءةُ الأولى تولّد وتمسح كما كانت (النسخُ في الردّ نفسِه) وتختم الطابعين
     (ب) عزلةٌ جديدة في المهلة: لا توليدَ ولا مسح — جولاتٌ أقلّ بكثير والصفوفُ نفسُها حرفاً
     (ج) بعد المهلة يجريان من جديد · والطابعُ «من المستقبل» لا يحجب · وعطلُ قراءة الحارس ⇒ يجريان كما كانا (لا يُحجب عملٌ بخلل الحارس)
     (د) الاستطلاعُ (since) يمسح ولا يولّد — كما كان · والتشغيلُ الصريح من صفحة المهام يختم الطابعين
     (هـ) التذكيرُ (task_soon) يصل مرةً واحدة من القراءة الأولى ولا يتكرر عبر العزلات
   البياناتُ اصطناعيةٌ كلُّها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { world, workerUnderTest, ME, KT, notificationMessages, D, TAG, stored, putKV, hij, HR, MID } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const RECUR_SQL = "act IN ('created', 'rec_start') AND cid LIKE 'tk%' AND ts >= ?2";   /* tkRecurTombs (073) — أولُ ما يقرؤه التوليدُ بعد مخزن المهام */
const GK = (q) => 'tkg:' + q + ':' + D;
const gate = (W, q) => { const r = W.env.DB.q('SELECT v FROM meta WHERE k = ?', GK(q)); return r.length ? +r[0].v : 0; };
const setGate = (W, q, v) => W.env.DB.exec("INSERT INTO meta (k, v) VALUES ('" + GK(q) + "', '" + v + "') ON CONFLICT(k) DO UPDATE SET v = excluded.v");
let n = 0;
const fresh = async (W) => { W.env.__worker = (await import(pathToFileURL(WU.file).href + '?w1gate=' + (++n))).default; };   /* عزلةٌ جديدة: ذاكرةٌ فارغة فوق D1 نفسِها */
async function call(W, ck, q = '') {
  const L0 = W.env.DB.log.length, t0 = W.env.DB.trips, r = await W.C.api('/api/me/tasks' + q, { cookie: ck });
  return { r, trips: W.env.DB.trips - t0, sql: W.env.DB.log.slice(L0) };
}
const recurRan = (c) => c.sql.some((s) => s.includes(RECUR_SQL));
const rowsOf = (c) => (c.r.j.rows || []).map((x) => JSON.stringify(x)).sort();
async function setup(mode) {
  const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
  const T0 = MID(Date.now()) + 864e5, s = T0 + 8 * HR;
  const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: hij(T0 + 12 * HR), t: TAG + ' سلسلة R8', s, e: s + HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'daily' } } });
  assert.equal(c.status, 200, JSON.stringify(c.j).slice(0, 300));
  const recId = (() => { const q = c.j.rows[0]; return stored(W.env, KT)[q.k].find((r) => r[13] === q.id)[23].rec.id; })();
  return { W, dm, me, recId };
}
const nSeries = (W, id) => Object.values(stored(W.env, KT) || {}).flat().filter((r) => Array.isArray(r) && r[23] && r[23].rec && r[23].rec.id === id).length;

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ)(ب) القراءةُ الأولى تولّد وتختم الطابعين · وعزلةٌ جديدة في المهلة لا تعيدهما — جولاتٌ أقلّ والصفوفُ نفسُها', async () => {
    const { W, me, recId } = await setup(mode);
    assert.equal(nSeries(W, recId), 1, 'قبل القراءة: النموذجُ وحده');
    await fresh(W); const t0 = Date.now();
    const a = await call(W, me.ck); assert.equal(a.r.status, 200);
    assert.ok(recurRan(a), 'القراءةُ الأولى ولّدت'); assert.ok(nSeries(W, recId) > 20, 'نسخُ الأفق: ' + nSeries(W, recId));
    assert.ok(a.r.j.rows.filter((x) => x.rec).length > 20, 'والنسخُ في الردّ نفسِه (كما كان)');
    assert.ok(gate(W, 'rec') >= t0 && gate(W, 'due') >= t0, 'الطابعان خُتما');
    for (let i = 0; i < 3; i++) {
      await fresh(W);
      const b = await call(W, me.ck); assert.equal(b.r.status, 200);
      assert.ok(!recurRan(b), 'عزلةٌ جديدة في المهلة: لا توليد');
      const schemaChecks = b.sql.filter(s => s === "SELECT v FROM meta WHERE k = 'schema_version'").length;
      assert.equal(schemaChecks, 1, 'التحقق من ختم المخطط مرة واحدة في العزلة الجديدة');
      const businessTrips = b.trips - schemaChecks;
      assert.ok((mode === 'enforce' ? businessTrips : b.trips) <= 8 && b.trips * 3 < a.trips, 'الجولات: ' + b.trips + ' (منها ' + schemaChecks + ' فحص مخطط) بدل ' + a.trips);
      assert.deepEqual(rowsOf(b), rowsOf(a), 'الصفوفُ نفسُها');
    }
  });

  test(M + '(ج) بعد المهلة يجريان من جديد · والطابعُ «من المستقبل» لا يحجب · وعطلُ قراءة الحارس ⇒ يجريان كما كانا', async () => {
    const { W, me } = await setup(mode);
    await fresh(W); assert.ok(recurRan(await call(W, me.ck)), 'الأولى');
    setGate(W, 'rec', Date.now() - 11 * 60e3); setGate(W, 'due', Date.now() - 6 * 60e3);
    await fresh(W); const t1 = Date.now(), b = await call(W, me.ck);
    assert.ok(recurRan(b), 'بعد مهلة التوليد (10 د) يجري'); assert.ok(gate(W, 'rec') >= t1 && gate(W, 'due') >= t1, 'وخُتما من جديد');
    setGate(W, 'rec', Date.now() + 3600e3);
    await fresh(W); assert.ok(recurRan(await call(W, me.ck)), 'طابعٌ بعد ساعة (ساعةٌ منحرفة) لا يحجب');
    await fresh(W); assert.ok(!recurRan(await call(W, me.ck)), 'وخُتم بالوقت الصحيح فحجب ما بعده');
    W.env.DB.failIf = (sql) => /^SELECT k, v FROM meta WHERE k IN \(\?1(, \?\d)*\)$/.test(sql);   /* قراءةُ الحارس وحدها (لقطةُ المقدّمة «(?1,?2,?3)» بلا مسافات) */
    await fresh(W);
    const c = await call(W, me.ck); W.env.DB.failIf = null;
    assert.equal(c.r.status, 200, 'الردّ سليم'); assert.ok(recurRan(c), 'عطلُ الحارس ⇒ السلوكُ القديم (يجري)');
  });

  test(M + '(د) الاستطلاعُ (since) يمسح ولا يولّد · والتشغيلُ الصريح من صفحة المهام يختم الطابعين', async () => {
    const { W, me } = await setup(mode);
    await fresh(W); const a = await call(W, me.ck), rev = a.r.j.rev;
    setGate(W, 'rec', Date.now() - 11 * 60e3); setGate(W, 'due', Date.now() - 6 * 60e3);
    await fresh(W); const t1 = Date.now(), s = await call(W, me.ck, '?since=' + rev);
    assert.equal(s.r.status, 200); assert.ok(!recurRan(s), 'الاستطلاعُ لا يولّد (كما كان)');
    assert.ok(gate(W, 'due') >= t1, 'والمسحُ جرى'); assert.ok(gate(W, 'rec') < t1, 'وطابعُ التوليد لم يُمسّ');
    setGate(W, 'rec', 1); setGate(W, 'due', 1);
    const t2 = Date.now(), r = await W.C.api('/api/tasks/recur/run?dept=' + D, { method: 'POST', cookie: W.su.ck, body: {} }); assert.equal(r.status, 200);
    assert.ok(gate(W, 'rec') >= t2 && gate(W, 'due') >= t2, 'التشغيلُ الصريح ختم الطابعين');
    await fresh(W); assert.ok(!recurRan(await call(W, me.ck)), 'فلا تعيده «ملفي» في عزلةٍ أخرى');
  });

  test(M + '(و) تغييرُ سلسلةٍ يمحو طابعَ التوليد: سلسلةٌ جديدة أو إيقافُ سلسلةٍ بعد تشغيلٍ صريح ⇒ القراءةُ التالية في «ملفي» تولّد فوراً', async () => {
    const { W, dm, me } = await setup(mode);
    await fresh(W); await call(W, me.ck);
    const r = await W.C.api('/api/tasks/recur/run?dept=' + D, { method: 'POST', cookie: W.su.ck, body: {} }); assert.equal(r.status, 200);
    assert.ok(gate(W, 'rec') > 0, 'مختوم بالتشغيل الصريح');
    const T0 = MID(Date.now()) + 864e5, s = T0 + 15 * HR;
    const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: hij(T0 + 12 * HR), t: TAG + ' سلسلة R8 ثانية', s, e: s + HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'daily' } } });
    assert.equal(c.status, 200); assert.equal(gate(W, 'rec'), 0, 'السلسلةُ الجديدة محت الطابع');
    const id2 = (() => { const q = c.j.rows[0]; return stored(W.env, KT)[q.k].find((x) => x[13] === q.id)[23].rec.id; })();
    await fresh(W); const b = await call(W, me.ck);
    assert.ok(recurRan(b) && nSeries(W, id2) > 20, 'القراءةُ التالية ولّدت نسخَ السلسلة الجديدة: ' + nSeries(W, id2));
    assert.ok(b.r.j.rows.filter((x) => x.rid === id2).length > 20, 'وهي في الردّ نفسِه');
    const p = await W.C.api('/api/tasks/recur', { method: 'POST', cookie: dm.ck, body: { id: id2, op: 'pause' } }); assert.equal(p.status, 200, JSON.stringify(p.j).slice(0, 200));
    assert.equal(gate(W, 'rec'), 0, 'الإيقافُ محا الطابع');
  });

  test(M + '(هـ) التذكيرُ قبل المهلة يصل مرةً واحدة من القراءة الأولى ولا يتكرر عبر العزلات · وبعد المهلة يُمسح من جديد بلا تكرار', async () => {
    const { W, dm, me } = await setup(mode);
    const now = Date.now(), s0 = now + 3 * HR;
    const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: hij(s0), t: TAG + ' قريبة R8', s: s0, e: s0 + HR, asg: [ME.eid], rv: 'none' } }); assert.equal(c.status, 200);
    const S = stored(W.env, KT), k0 = c.j.rows[0].k, id = c.j.rows[0].id, r = S[k0].find((q) => q[13] === id);
    S[k0] = S[k0].filter((q) => q[13] !== id); r[15] = now - 30 * 60e3; r[16] = now + 30 * 60e3; (S[hij(now)] = S[hij(now)] || []).push(r); putKV(W.env, KT, S);
    const soon = () => notificationMessages(W.env).filter((x) => x.type === 'task_soon' && /قريبة R8/.test(x.body)).length;
    await fresh(W); assert.equal((await call(W, me.ck)).r.status, 200); assert.equal(soon(), 1, 'تذكيرٌ واحد من القراءة الأولى');
    for (let i = 0; i < 2; i++) { await fresh(W); await call(W, me.ck); }
    assert.equal(soon(), 1, 'لا تكرارَ عبر العزلات');
    setGate(W, 'due', Date.now() - 6 * 60e3); await fresh(W); const t1 = Date.now(); await call(W, me.ck);
    assert.ok(gate(W, 'due') >= t1, 'بعد المهلة يُمسح من جديد'); assert.equal(soon(), 1, 'ولا يتكرر التذكير (once)');
  });
}
