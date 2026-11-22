/* V7 · د5-هـ (أمن ٢) — سباقاتُ مفتاح الاستعادة على العامل الحقيقي، بتداخلٍ مفروض (لا توقيت): الطلبُ المنافس يُنفَّذ كاملاً داخل دفعة
   الطلب الأول قبل أن تُرسَل (خطّافٌ على DB.batch)، فيرى الأولُ عند كتابته ما كتبه المنافس.
   (٢) /api/recover لا يحذف مفتاحاً أحدث من الذي تحقّق منه · (٣) /api/recovery/new متزامنان: واحدٌ يفوز والآخر تعارضٌ صريح — لا مفتاحَ معروضٌ
   باطلٌ صامتاً · (٤) /api/reset متزامنان: واحدةٌ تُنفَّذ والأخرى تعارض. (١) استعمالُ المفتاح مرّةً واحدة: rishad266_recovery_validation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const NEW_A = String(400000 + 61728), NEW_B = String(700000 + 15926);
async function setup() {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  return { env, C, su };
}
const issue = (W, ck = W.su.ck) => W.C.api('/api/recovery/new', { method: 'POST', cookie: ck, body: { pw: TEST_SUPER_PIN } });
const recoverWith = (W, key, pw) => W.C.api('/api/recover', { method: 'POST', body: { key, pw } });
/* while the first batch matching `when` is about to run, run `rival` to completion first */
function raceInside(env, when, rival) {
  const batch = env.DB.batch.bind(env.DB); let out = null;
  env.DB.batch = async (stmts) => {
    if (!out && stmts.some((s) => when(String(s.sql), s.args || []))) { out = 'running'; out = await rival(); }
    return batch(stmts);
  };
  return { result: () => out, restore: () => { env.DB.batch = batch; } };
}

test('(٢) مفتاحٌ جديد يصدر أثناء استعادةٍ بالمفتاح القديم: الاستعادةُ تعارض (409) ولا تحذف المفتاحَ الجديد — وهو يعمل', async () => {
  const W = await setup();
  const k0 = await issue(W); assert.equal(k0.j.ok, 1);
  const R = raceInside(W.env, (q) => /DELETE FROM meta WHERE k IN/.test(q) && !/'rev'/.test(q), () => issue(W));
  const rec = await recoverWith(W, k0.j.key, NEW_A); R.restore();
  const k1 = R.result(); assert.equal(k1.j.ok, 1, 'the new key was issued in between');
  assert.equal(rec.j.ok, 0, '★ the recovery with the replaced key is refused: ' + JSON.stringify(rec.j)); assert.equal(rec.status, 409);
  assert.equal((await W.C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN)).ok, true, 'the PIN is unchanged');
  const r2 = await recoverWith(W, k1.j.key, NEW_B);
  assert.equal(r2.j.ok, 1, '★ the newer key (shown to the administrator) still works: ' + JSON.stringify(r2.j));
});

test('(٣) إصداران متزامنان لمفتاح الاستعادة: واحدٌ يفوز والآخر تعارضٌ صريح — والمفتاحُ المعروضُ ناجحاً هو الصالح', async () => {
  const W = await setup();
  const R = raceInside(W.env, (q, args) => /INSERT INTO meta/.test(q) && args.includes('rk_meta'), () => issue(W));
  const a = await issue(W); R.restore(); const b = R.result();
  const oks = [a, b].filter((x) => x.j.ok === 1);
  assert.equal(oks.length, 1, '★ exactly one issue succeeds: ' + JSON.stringify([a.status, a.j.ok, a.j.err, b.status, b.j.ok, b.j.err]));
  const lost = a.j.ok === 1 ? b : a; assert.equal(lost.status, 409); assert.ok(!lost.j.key, 'no key is shown for the losing issue'); assert.ok(lost.j.err);
  const r = await recoverWith(W, oks[0].j.key, NEW_A);
  assert.equal(r.j.ok, 1, '★ the key shown as issued works: ' + JSON.stringify(r.j));
});

test('(٤) تهيئتان متزامنتان بالمفتاح نفسِه: واحدةٌ تُنفَّذ والأخرى تعارض — والمديرُ الجديد هو الفائز', async () => {
  const W = await setup();
  const k = await issue(W); assert.equal(k.j.ok, 1);
  const body = (un, pw) => ({ pw: TEST_SUPER_PIN, key: k.j.key, confirm: 'تهيئة', admin: { un, name: 'TEST_ONLY admin ' + un, pw } });
  const R = raceInside(W.env, (q) => /DELETE FROM notification_user_state/.test(q), () => W.C.api('/api/reset', { method: 'POST', cookie: W.su.ck, body: body('0500000188', NEW_B) }));
  const a = await W.C.api('/api/reset', { method: 'POST', cookie: W.su.ck, body: body('0500000199', NEW_A) }); R.restore(); const b = R.result();
  assert.equal(b.j.ok, 1, 'the reset that ran first succeeded: ' + JSON.stringify(b.j));
  assert.equal(a.j.ok, 0, '★ the second reset with the consumed key is refused: ' + JSON.stringify(a.j)); assert.equal(a.status, 409);
  assert.equal((await W.C.login('0500000188', NEW_B)).ok, true, 'the winner\'s administrator signs in');
  assert.equal((await W.C.login('0500000199', NEW_A)).ok, false, 'the loser\'s administrator does not exist');
});

test('(٤ب) استعادةٌ تستهلك المفتاحَ بين تحقّق التهيئة منه وكتابتها: التهيئةُ تعارض (المفتاحُ الذي أجازها لم يعد قائماً)', async () => {
  const W = await setup();
  const k = await issue(W); assert.equal(k.j.ok, 1);
  const R = raceInside(W.env, (q) => /DELETE FROM notification_user_state/.test(q), () => recoverWith(W, k.j.key, NEW_B));
  const a = await W.C.api('/api/reset', { method: 'POST', cookie: W.su.ck, body: { pw: TEST_SUPER_PIN, key: k.j.key, confirm: 'تهيئة', admin: { un: '0500000199', name: 'TEST_ONLY admin', pw: NEW_A } } });
  R.restore(); const b = R.result();
  assert.equal(b.j.ok, 1, 'the recovery consumed the key first: ' + JSON.stringify(b.j));
  assert.equal(a.j.ok, 0, '★ the reset authorised by the consumed key is refused: ' + JSON.stringify(a.j)); assert.equal(a.status, 409);
  assert.equal((await W.C.login(TEST_SUPER_USERNAME, NEW_B)).ok, true, 'the recovered administrator remains');
});
