/* SOT-166: الجزء المحلي المثبت هو سلامة سباق الحفظ و8 طلبات متزامنة على Worker وSQLite؛
   لا يثبت حمل الإصدار النهائي أو زمن الاستجابة في Cloudflare أو مدخلات واقعية.
   KIVO_259 — لا تحديثَ ضائعاً تحت التزامن (SOT-150 · كشفه cfbench/k258load): حفظان متزامنان على النسخة نفسِها كانا يعبران فحصَ base
   معاً (القراءةُ أوّلَ الطلب والكتابةُ بعد جولاتٍ) فيكتب الثاني فوق الأوّل بلا تعارض. الآن يتقدّم مجموعةَ عبارات المفتاح حارسُ نسخةٍ داخل
   المعاملة نفسِها (مقارنةٌ ومبادلة) — فالمسبوقُ يُردّ تعارضاً بقيمة الخادم ونسختِه كسائر التعارضات (ويدمج العميلُ ويعيد).
   العاملُ داخل Node فوق node:sqlite: الطلبان المتزامنان يتشابكان عند كل await (جولةُ D1) كما في isolate حقيقي. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

async function setup() {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const d = await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]) }); assert.equal(d.j.ok, 1);
  return { env, C, ck: su.ck };
}
/* schema 10: options/callsigns are typed operational resources (their race is covered by the operations envelope tests); the KV compare-and-swap
   under test applies to the remaining /api/save KV resources */
const K = 'bassam_platform_v1', K2 = 'bsdept:dA:bassam_perm_tpls_v1';
const getRev = async (C, ck, k) => { const r = await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: ck }); const it = (r.j.keys || {})[k] || {}; return { v: it.v, rev: it.rev || 0 }; };
const saveRaw = (C, ck, set, base) => C.api('/api/save', { method: 'POST', cookie: ck, body: { set, del: [], base } });

test('حفظان متزامنان على النسخة نفسِها: يُكتب أحدُهما ويُردّ الآخرُ تعارضاً بقيمة الأوّل — لا كتابةَ فوق كتابة', async () => {
  const { C, ck } = await setup();
  const s0 = await saveRaw(C, ck, { [K]: JSON.stringify({ n: 0 }) }, { [K]: 0 }); assert.equal(s0.j.ok, 1);
  const g = await getRev(C, ck, K); assert.ok(g.rev > 0);
  const [a, b] = await Promise.all([saveRaw(C, ck, { [K]: JSON.stringify({ n: 'A' }) }, { [K]: g.rev }), saveRaw(C, ck, { [K]: JSON.stringify({ n: 'B' }) }, { [K]: g.rev })]);
  const won = [a, b].filter(x => x.j.revs && x.j.revs[K]), lost = [a, b].filter(x => x.j.conflicts && x.j.conflicts[K]);
  assert.equal(won.length, 1, 'واحدٌ كُتب: ' + JSON.stringify([a.j, b.j]).slice(0, 400));
  assert.equal(lost.length, 1, 'والآخرُ تعارض');
  const fin = await getRev(C, ck, K);
  assert.equal(fin.rev, won[0].j.revs[K], 'النسخةُ النهائية = نسخةُ الفائز');
  assert.equal(lost[0].j.conflicts[K].cur, fin.v, 'التعارضُ يحمل قيمةَ الخادم الآن (قيمةَ الفائز)');
  assert.equal(lost[0].j.conflicts[K].rev, fin.rev, 'ونسختَها');
});

test('عدّادٌ مشترك: 8 جلساتٍ متزامنة تزيده بقراءةٍ ثم كتابة (وإعادةٍ عند التعارض) ⇒ العدّادُ = الزياداتُ الناجحة بالضبط', async () => {
  const { C, ck } = await setup();
  await saveRaw(C, ck, { [K]: JSON.stringify({ n: 0 }) }, { [K]: 0 });
  let okN = 0, confN = 0;
  const inc = async () => { for (let t = 0; t < 30; t++) { const g = await getRev(C, ck, K); const n0 = JSON.parse(g.v || '{}').n || 0; const s = await saveRaw(C, ck, { [K]: JSON.stringify({ n: n0 + 1 }) }, { [K]: g.rev });
    if (s.j.revs && s.j.revs[K]) { okN++; return true; } if (s.j.conflicts && s.j.conflicts[K]) { confN++; continue; } return false; } return false; };
  const r = await Promise.all(Array.from({ length: 8 }, () => inc()));
  const fin = JSON.parse((await getRev(C, ck, K)).v).n;
  assert.ok(r.every(Boolean), 'كلُّ جلسةٍ بلغت زيادتَها');
  assert.equal(fin, okN, 'العدّاد ' + fin + ' = الزياداتُ الناجحة ' + okN + ' (تعارضاتٌ عولجت: ' + confN + ')');
  assert.equal(okN, 8); assert.ok(confN > 0, 'السباقُ حقيقيّ: حدثت تعارضاتٌ وعولجت');
});

test('حفظٌ بمفتاحين يُسبق أحدُهما: يُكتب غيرُ المسبوق ويُردّ المسبوقُ وحده تعارضاً', async () => {
  const { C, ck } = await setup();
  await saveRaw(C, ck, { [K]: JSON.stringify({ n: 0 }) }, { [K]: 0 }); await saveRaw(C, ck, { [K2]: JSON.stringify([{ id: 'TEST_ONLY_x', name: 'x' }]) }, { [K2]: 0 });
  const g1 = await getRev(C, ck, K), g2 = await getRev(C, ck, K2);
  const [m, o] = await Promise.all([saveRaw(C, ck, { [K]: JSON.stringify({ n: 'M' }), [K2]: JSON.stringify([{ id: 'TEST_ONLY_y', name: 'y' }]) }, { [K]: g1.rev, [K2]: g2.rev }), saveRaw(C, ck, { [K]: JSON.stringify({ n: 'O' }) }, { [K]: g1.rev })]);
  const multiWonK = !!(m.j.revs && m.j.revs[K]), otherWonK = !!(o.j.revs && o.j.revs[K]);
  assert.ok(multiWonK !== otherWonK, 'المفتاحُ المشترك كتبه أحدُهما فقط: ' + JSON.stringify([m.j, o.j]).slice(0, 400));
  assert.ok(m.j.revs && m.j.revs[K2], 'المفتاحُ غيرُ المسبوق كُتب في الحفظ ذي المفتاحين');
  assert.equal((await getRev(C, ck, K2)).v, JSON.stringify([{ id: 'TEST_ONLY_y', name: 'y' }]));
  const fin = (await getRev(C, ck, K)).v; assert.equal(fin, multiWonK ? JSON.stringify({ n: 'M' }) : JSON.stringify({ n: 'O' }), 'القيمةُ النهائية = قيمةُ الفائز وحده');
});
