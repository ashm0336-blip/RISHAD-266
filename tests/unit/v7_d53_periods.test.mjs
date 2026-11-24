/* V7 · 53 · التخزين بالفترة (§3ب · رد المراجع §4): الخاصيةُ opJoin(opSplit(d)) ≡ d حرفاً بالترتيب · القراءةُ بالفترة والمدى والفهرس ·
   الحفظُ بالفترة (يومٌ واحد · يومٌ جديد · حذفُ يوم · يومان معاً بلا تعارض · تعارضٌ بمراجعة الفترة) · ثابتُ رفع المراجعة في dbGuard. TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { target } from './v7_d6_import_fx.mjs';
import { operationSaveBody } from './world_fx.mjs';

const A = 'TEST_ONLY_A', K = (r) => 'bsdept:' + A + ':' + r, RK = K('bassam_rounds_v1');
const zone = (i, n) => ({ uid: 'tz' + i, code: 'Z' + i, name: 'TEST_ONLY · مصلى ' + i, fst: i % 2 ? 'open' : 'closed', pc: { fajr: { n: n + i, cap: 100 } } });
const day = (n) => ({ t: 1795000000000 + n * 86400000, d: [{ sid: 'ts0', name: 'TEST_ONLY · موقع', zones: [zone(1, n), zone(2, n)], gates: [], marks: [], paths: [] }] });
const ROUNDS = { __pMig: 2, 'm:1448-5': { ap: 0 }, '1448-5-29': day(1), 'm:1448-6': { ap: 0, dopen: { 3: 1 } }, '1448-6-1': day(2), '1448-6-2': day(3), '1448-6-10': day(4), '1448-6-9': day(5) };

async function lab() {
  const T = await target({ KIVO_TEST_FIXTURE: 'allow' });
  const read = (q) => T.call('/api/operations/read?' + q + '&uid=' + encodeURIComponent(T.su.uid), { ck: T.su.ck });
  let seq = 0;
  const save = (body) => T.call('/api/save', { ck: T.su.ck, body: operationSaveBody(T.lab.env, '/api/save', { del: [], requestId: 'TEST_ONLY_period_save_' + ++seq, epoch: Number(T.lab.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0), ...body }) });
  return { T, read, save, W: T.lab.W, env: T.lab.env };
}

test('53 · الخاصية: opJoin(opSplit(d)) يعيد الوثيقةَ حرفاً بترتيب مفاتيحها — لكل موردٍ مقسَّم ولوثائق عشوائية', async () => {
  const { T, W } = await lab();
  try {
    const rnd = (seed) => { let x = seed; return () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648; };
    const plan = { pMig: 1, floors: [], zones: [], months: { '1448-6': { c: 1, d: [] }, '1448-5': { c: 0, d: [] } }, delMonths: { '1448-1': 1 } };
    const docs = { bassam_rounds_v1: ROUNDS, bassam_plan_v1: plan, bassam_staffing_v3: { '1448-6': { TEST_ONLY_e1: { shift: 'A' } }, '1448-10': {} }, bassam_dreport_v1: { __ldcs: { a: 'b' }, '1448-6-1': { created: 1 }, 'm:1448-6': 1 }, bassam_tasks_v1: { '1448-6-2': [], '1448-6-1': [] } };
    for (let s = 1; s <= 30; s++) {   /* ترتيبٌ عشوائي للأعضاء والحقول الثابتة بينها */
      const r = rnd(s), keys = Object.keys(ROUNDS).sort(() => r() - 0.5), d = {};
      keys.forEach((k) => { d[k] = ROUNDS[k]; });
      docs['bassam_rounds_v1#' + s] = d;
    }
    for (const [name, doc] of Object.entries(docs)) {
      const info = W.opInfo(K(name.split('#')[0]));
      const parts = W.opSplit(info, doc), back = W.opJoin(info, parts);
      assert.equal(JSON.stringify(back), JSON.stringify(doc), name);
      assert.equal(W.opJoin(info, W.opSplit(info, undefined)), undefined);
    }
    /* لا تحليلَ تاريخٍ في الطبقة: الترتيبُ عدديٌّ من دالة التعريف ('1448-10' بعد '1448-9') */
    const def = W.opInfo(K('bassam_staffing_v3')).definition.period;
    assert.deepEqual(W.opPeriodOrder(def, ['1448-10', '1448-9', '1447-12']), ['1447-12', '1448-9', '1448-10']);
  } finally { await T.close(); }
});

test('53 · القراءةُ بالفترة والمدى والفهرس، والحفظُ بالفترة لا يمسّ غيرها', { timeout: 120000 }, async () => {
  const { T, read, save, env } = await lab();
  try {
    let r = await save({ set: { [RK]: JSON.stringify(ROUNDS) }, base: { [RK]: 0 } });
    assert.equal(r.status, 200, r.t.slice(0, 300));
    /* فترةٌ ورأس */
    r = await read('keys=' + encodeURIComponent([RK + '@1448-6-2', RK + '@', RK + '@m:1448-6', RK + '@1448-7-1'].join(',')));
    assert.equal(r.status, 200, r.t.slice(0, 300));
    assert.deepEqual(r.j.resources[RK + '@1448-6-2'], ROUNDS['1448-6-2']);
    assert.deepEqual(r.j.resources[RK + '@'], { __pMig: 2 });
    assert.deepEqual(r.j.resources[RK + '@m:1448-6'], ROUNDS['m:1448-6']);
    assert.deepEqual(r.j.absent, [RK + '@1448-7-1']);
    assert.ok(Object.values(r.j.base).every(Number.isSafeInteger));
    /* المدى: أيامُ الشهر وعلامتُه بترتيبٍ عددي (9 قبل 10) */
    r = await read('range=' + encodeURIComponent(RK + '@1448-6') + '&index=' + encodeURIComponent(RK));
    assert.equal(r.status, 200, r.t.slice(0, 300));
    assert.deepEqual(r.j.ranges[RK + '@1448-6'], ['m:1448-6', '1448-6-1', '1448-6-2', '1448-6-9', '1448-6-10'].map((p) => RK + '@' + p));
    assert.deepEqual(r.j.index[RK].map((x) => x.p), ['m:1448-5', '1448-5-29', 'm:1448-6', '1448-6-1', '1448-6-2', '1448-6-9', '1448-6-10']);
    /* الحفظُ بالفترة: يومٌ معدَّل · يومٌ جديد · حذفُ يوم — والباقي كما هو بترتيبه */
    const base = r.j.base, d2 = { ...ROUNDS['1448-6-2'], ap: 1 };
    const before = env.DB.q("SELECT row_key,position FROM ops_nodes WHERE department_id=?1 AND resource='bassam_rounds_v1' AND row_key NOT LIKE '$/e:1448-6-2%' ORDER BY row_key", A);
    r = await save({ set: { [RK + '@1448-6-2']: JSON.stringify(d2), [RK + '@1448-6-11']: JSON.stringify(day(9)) }, del: [RK + '@1448-6-9'], base: { [RK + '@1448-6-2']: base[RK + '@1448-6-2'], [RK + '@1448-6-11']: 0, [RK + '@1448-6-9']: base[RK + '@1448-6-9'] } });
    assert.equal(r.status, 200, r.t.slice(0, 400));
    assert.deepEqual(Object.keys(r.j.revs).sort(), [RK + '@1448-6-11', RK + '@1448-6-2', RK + '@1448-6-9'].sort());
    const full = await read('keys=' + encodeURIComponent(RK));
    const expect = { ...ROUNDS, '1448-6-2': d2, '1448-6-11': day(9) }; delete expect['1448-6-9'];
    assert.equal(JSON.stringify(full.j.resources[RK]), JSON.stringify(expect), 'الوثيقةُ كلُّها بترتيبها');
    const after = env.DB.q("SELECT row_key,position FROM ops_nodes WHERE department_id=?1 AND resource='bassam_rounds_v1' AND row_key NOT LIKE '$/e:1448-6-2%' AND row_key NOT LIKE '$/e:1448-6-9%' AND row_key NOT LIKE '$/e:1448-6-11%' ORDER BY row_key", A);
    assert.equal(after.filter((x) => !x.row_key.startsWith('$/e:1448-6-10')).length, before.filter((x) => !x.row_key.startsWith('$/e:1448-6-9') && !x.row_key.startsWith('$/e:1448-6-10')).length, 'صفوفُ الأيام الأخرى لم تُكتب');
    /* يومان من صفحتين بالمراجعات القديمة نفسِها: لا تعارض (كلٌّ بمراجعة فترته) · والثالث بمراجعةٍ قديمة لفترته: تعارضٌ باسمها */
    const r2 = await read('keys=' + encodeURIComponent([RK + '@1448-6-1', RK + '@1448-6-10'].join(',')));
    const s1 = await save({ set: { [RK + '@1448-6-1']: JSON.stringify(day(20)) }, base: { [RK + '@1448-6-1']: r2.j.base[RK + '@1448-6-1'] } });
    const s2 = await save({ set: { [RK + '@1448-6-10']: JSON.stringify(day(21)) }, base: { [RK + '@1448-6-10']: r2.j.base[RK + '@1448-6-10'] } });
    assert.equal(s1.status, 200, s1.t.slice(0, 300)); assert.equal(s2.status, 200, s2.t.slice(0, 300));
    const s3 = await save({ set: { [RK + '@1448-6-1']: JSON.stringify(day(22)) }, base: { [RK + '@1448-6-1']: r2.j.base[RK + '@1448-6-1'] } });
    assert.equal(s3.status, 409, s3.t.slice(0, 300));
    assert.deepEqual(Object.keys(s3.j.conflicts), [RK + '@1448-6-1']);
    /* المراجعة المنطقية ترتفع مع كل كتابة (الصفحاتُ القديمة ترى كلَّ تغيير) */
    const f2 = await read('keys=' + encodeURIComponent(RK));
    assert.ok(f2.j.base[RK] > full.j.base[RK]);
    assert.deepEqual(f2.j.resources[RK]['1448-6-1'], day(20));
    /* ملخّصُ الفترة مكتوبٌ في الدفعة نفسِها بمراجعتها */
    const sum = env.DB.q("SELECT period,rev,v_json FROM ops_period_summary WHERE department_id=?1 AND resource='bassam_rounds_v1' AND period='1448-6-1'", A)[0];
    assert.equal(JSON.parse(sum.v_json).zones, 2);
    /* مفاتيحُ مختلطة تُرفض بوضوح */
    const bad = await save({ set: { [RK]: '{}', [RK + '@1448-6-1']: '{}' }, base: { [RK]: 0, [RK + '@1448-6-1']: 0 } });
    assert.equal(bad.status, 400); assert.equal(bad.j.err, 'operations-period-mixed');
  } finally { await T.close(); }
});

test('53 · الثابت: كتابةٌ على ops_* بلا رفع مراجعة مفتاحها في الدفعة نفسِها تُرفض (dbGuard)', async () => {
  const { T, W, env } = await lab();
  try {
    const pre = await W.dbGuardFallback(env, '');
    const G = W.dbGuard(env.DB, pre, false);
    const st = G.prepare("UPDATE ops_nodes SET position=position WHERE department_id=?1 AND resource='bassam_rounds_v1'").bind(A);
    await assert.rejects(() => G.batch([st]), /db-unrevised-ops-write/);
    W.opTag(st, [RK]);
    await assert.rejects(() => G.batch([st]), /db-unrevised-ops-write/, 'موسومةٌ بلا رفع');
    const bump = G.prepare("INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1").bind(RK);
    await G.batch([st, bump]);
  } finally { await T.close(); }
});

/* V7 · 53 · طلباتُ periodsui (periodsui_to_periods.md): خلل 7 · خلل 8 · طلب 1 · طلب 6 */
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
test('53 · periodsui: فترةٌ غائبة تُنشأ بـbase 0 بعد حذفها وكتابةٍ كاملة (7) · كتابةٌ كاملة تغيّر اليوم ⇒ 409 لا 403 (8) · ملخّصُ التقرير (1) · المراجعةُ المنطقية (6)', { timeout: 120000 }, async () => {
  const { T, read, save, env } = await lab();
  try {
    const SK = K('bassam_staffing_v3'), DK = K('bassam_dreport_v1');
    /* (7) شهرٌ يُكتب ثم يُحذف ثم تكتب الوثيقةُ كاملة بلا ذلك الشهر — ثم يُنشأ من جديد بـbase 0 */
    let r = await save({ set: { [SK + '@1448-6']: JSON.stringify({ TEST_ONLY_eA1: { shift: 'A' } }) }, base: { [SK + '@1448-6']: 0 } });
    assert.equal(r.status, 200, r.t.slice(0, 300));
    r = await save({ del: [SK + '@1448-6'], base: { [SK + '@1448-6']: r.j.revs[SK + '@1448-6'] } });
    assert.equal(r.status, 200, r.t.slice(0, 300));
    await replaceOperationalFixture(env, SK, { '1448-5': { TEST_ONLY_eA1: { shift: 'B' } } });
    r = await save({ set: { [SK + '@1448-6']: JSON.stringify({ TEST_ONLY_eA1: { shift: 'C' } }) }, base: { [SK + '@1448-6']: 0 } });
    assert.equal(r.status, 200, 'فترةٌ غائبةٌ الآن تُنشأ بـbase 0: ' + r.t.slice(0, 300));
    /* وbase 0 لفترةٍ حاضرة تعارضٌ كما كان */
    r = await save({ set: { [SK + '@1448-5']: JSON.stringify({}) }, base: { [SK + '@1448-5']: 0 } });
    assert.equal(r.status, 409, r.t.slice(0, 300));
    /* (8) قراءةُ يومٍ ثم كتابةٌ كاملة تغيّره ⇒ حفظُ اليوم بمراجعته القديمة تعارض 409 */
    r = await save({ set: { [RK]: JSON.stringify(ROUNDS) }, base: { [RK]: 0 } }); assert.equal(r.status, 200, r.t.slice(0, 300));
    const rd = await read('keys=' + encodeURIComponent(RK + '@1448-6-1'));
    await replaceOperationalFixture(env, RK, { ...ROUNDS, '1448-6-1': day(77) });
    r = await save({ set: { [RK + '@1448-6-1']: JSON.stringify(day(78)) }, base: { [RK + '@1448-6-1']: rd.j.base[RK + '@1448-6-1'] } });
    assert.equal(r.status, 409, r.t.slice(0, 300)); assert.deepEqual(Object.keys(r.j.conflicts), [RK + '@1448-6-1']);
    /* والحفظُ الكاملُ الحقيقي عبر /api/save كذلك */
    const rd2 = await read('keys=' + encodeURIComponent(RK + '@1448-6-2')), full = await read('keys=' + encodeURIComponent(RK));
    r = await save({ set: { [RK]: JSON.stringify({ ...full.j.resources[RK], '1448-6-2': day(79) }) }, base: { [RK]: full.j.base[RK] } }); assert.equal(r.status, 200, r.t.slice(0, 300));
    r = await save({ set: { [RK + '@1448-6-2']: JSON.stringify(day(80)) }, base: { [RK + '@1448-6-2']: rd2.j.base[RK + '@1448-6-2'] } });
    assert.equal(r.status, 409, r.t.slice(0, 300));
    /* (1) ملخّصُ يوم التقرير: created · ap (كلُّ الورديات معتمدة) · anyAp */
    await replaceOperationalFixture(env, DK, { '1448-6-3': { created: 1, shifts: { A: { ap: 1, roster: [] }, B: { roster: [] } } } });   /* الاعتمادُ مسارُه وأحكامُه — هنا شكلُ الملخّص وحده */
    const sm = await T.call('/api/operations/summary?key=' + encodeURIComponent(DK) + '&grp=1448-6&uid=' + encodeURIComponent(T.su.uid), { ck: T.su.ck });
    assert.equal(sm.status, 200, sm.t.slice(0, 300));
    const v = sm.j.rows.find((x) => x.p === '1448-6-3').v;
    assert.deepEqual([v.created, v.ap, v.anyAp], [1, 0, 1]);
    /* (6) قراءةُ الفترات تحمل المراجعةَ المنطقية لمفتاحها */
    const lr = await read('keys=' + encodeURIComponent(RK + '@1448-6-1')), lf = await read('keys=' + encodeURIComponent(RK));
    assert.equal(lr.j.logical[RK], lf.j.base[RK]);
  } finally { await T.close(); }
});
