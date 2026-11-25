/* V7 · د6 (QA) البند ٢ — بذرةُ العرض تكتب لكل مسجدٍ حقوله وحدها وببصمةٍ بشكل الصفحة، فبعد الزرع يُقبل كلُّ حفظٍ في «الإحصائيات اليومية»
   (أرقامُ يوم · اعتمادُ الشهر) · و«حذف البيانات التجريبية» يحذف أيامها · ويومٌ مخزَّنٌ مخالف لا يمنع قفلَ الشهر، والرفضُ يسمّي اليوم المخالف. TEST_ONLY */
import './clock.mjs';   /* ساعةُ المختبر المثبَّتة (2026-10-20 10:00 الرياض) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, needs, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const ENF = { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' };
async function world() {
  const env = makeTestEnv(ENF), C = client(env, 'http://x');
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, JSON.stringify(su.j));
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const post = (p, body) => C.api(p, { method: 'POST', cookie: su.ck, body });
  const uid = encodeURIComponent((await C.api('/api/whoami', { cookie: su.ck })).j.uid || '');
  const read = async () => { const r = await C.api('/api/dstats?uid=' + uid, { cookie: su.ck }); assert.equal(r.status, 200, JSON.stringify(r.j)); return r.j; };
  return { env, C, su, post, read };
}
/* V7 · تقويم ميلادي (ترحيل 0014): مفاتيحُ اليوم YYYY-MM-DD والشهر YYYY-MM مبطَّنةٌ بالأصفار، واليومُ التشغيلي = الآن − 3 ساعات بتوقيت الرياض */
const today = () => { const o = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(Date.now() - 3 * 3600e3)).reduce((o, p) => (o[p.type] = p.value, o), {}); return { year: o.year, month: o.month, day: o.day }; };

test('(٢) بعد زرع العرض: حفظُ أرقام يومٍ واعتمادُ الشهر يُقبلان (200) لمدير المنصة · والحذفُ يزيل أيامَ العرض', needs('dstats'), async () => {
  const W = await world();
  const s = await W.post('/api/demo-data', { act: 'seed' }); assert.equal(s.status, 200, JSON.stringify(s.j));
  const v = await W.read(), days = Object.entries(v.data.nabawi);
  assert.ok(days.length > 0, 'أيامُ عرضٍ للنبوي');
  for (const [, d] of days) assert.equal(d.umrah, undefined, 'لا umrah للنبوي');
  for (const site of ['haram', 'nabawi']) for (const d of Object.values(v.data[site])) {
    assert.equal(typeof d.__m.t, 'number', 'بصمةٌ وقتُها رقمي'); assert.match(d.__m.n, /TEST_ONLY/, 'وسمُ العرض في البصمة');
  }
  /* حفظُ أرقام يوم (تعديلُ يومٍ مزروع) */
  const data = JSON.parse(JSON.stringify(v.data)), k0 = Object.keys(data.haram)[0];
  data.haram[k0].worshippers = 777;
  const r1 = await W.post('/api/dstats', { base: v.rev, data }); assert.equal(r1.status, 200, JSON.stringify(r1.j));
  /* اعتمادُ الشهر وفتحُه */
  const T = today(), mk = 'haram|' + T.year + '-' + T.month;
  const d2 = JSON.parse(JSON.stringify(r1.j.data)); d2.locks = Object.assign({}, d2.locks, { [mk]: { ap: 1 } });
  const r2 = await W.post('/api/dstats', { base: r1.j.rev, data: d2 }); assert.equal(r2.status, 200, JSON.stringify(r2.j));
  const d3 = JSON.parse(JSON.stringify(r2.j.data)); d3.locks[mk] = { mo: 1 };
  const r3 = await W.post('/api/dstats', { base: r2.j.rev, data: d3 }); assert.equal(r3.status, 200, JSON.stringify(r3.j));
  /* الحذف: أيامُ العرض تزول (القفلُ الذي كتبناه بعد الزرع كتابةُ مستخدم — لا يُدّعى أنه من العرض) */
  const rm = await W.post('/api/demo-data', { act: 'remove', force: true }); assert.equal(rm.status, 200, JSON.stringify(rm.j));
  const after = await W.read();
  assert.deepEqual(after.data.haram, {}, 'لا يومَ عرضٍ للحرم بعد الحذف'); assert.deepEqual(after.data.nabawi, {}, 'لا يومَ عرضٍ للنبوي بعد الحذف');
});

test('(٢) يومٌ مخزَّنٌ مخالف لا يمنع قفلَ الشهر · وتغييرُه يُرفض باسم اليوم (at)', needs('dstats'), async () => {
  const W = await world(), T = today(), bad = T.year + '-' + T.month + '-01';
  /* صفٌّ مخالفٌ مباشرةً في D1 (كما يتركه أيُّ مصدرٍ قديم): umrah (البت 1) للنبوي، وبصمةٌ وقتُها نص */
  W.env.DB.exec("INSERT INTO daily_stats_days (site, greg_date, field_mask, worshippers, umrah, meta_json) VALUES ('nabawi', '" + bad + "', 3, 10, 5, '{\"t\":\"TEST_ONLY\"}')");
  const v = await W.read(); assert.equal(v.data.nabawi[bad].umrah, 5);
  const mk = 'nabawi|' + T.year + '-' + T.month, d = JSON.parse(JSON.stringify(v.data)); d.locks = Object.assign({}, d.locks, { [mk]: { ap: 1 } });
  const r = await W.post('/api/dstats', { base: v.rev, data: d }); assert.equal(r.status, 200, JSON.stringify(r.j));
  const d2 = JSON.parse(JSON.stringify(r.j.data)); d2.nabawi[bad].umrah = 6;
  const r2 = await W.post('/api/dstats', { base: r.j.rev, data: d2 });
  assert.equal(r2.status, 400); assert.equal(r2.j.err, 'dstats-shape'); assert.equal(r2.j.at, 'nabawi|' + bad);
});
