/* KIVO_259 — SR-2 (المراجعةُ الأمنية المستقلة · reports/k259/secreview_259.md): العمليةُ المحمية (ذرّية) أكبرُ من دفعة D1 واحدة (> 90 عبارة)
   تُكتب على دفعات — فحفظٌ متزامنٌ يقع على مفتاحٍ في دفعةٍ لاحقة كان يُلغي تلك الدفعةَ وحدها بعد أن ثبتت سابقتُها (تطبيقٌ جزئيٌّ لعمليةٍ «ذرّية»).
   الآن: commitGroups يفحص نسخَ مفاتيح العملية كلِّها قبل أوّل كتابة — المسبوقُ قبلها ⇒ لا يُكتب منها شيء ويُردّ كلُّه تعارضاً.
   (النافذةُ الباقية ما بين الدفعات — ميلي ثوانٍ — فـD1 لا يعرف معاملةً تتجاوز الدفعة؛ معلنةٌ في التعليق والوثائق.) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D1Shim } from './harness.mjs';
import { internals } from './internals.mjs';

const { commitGroups, revGuard } = await internals(['commitGroups', 'revGuard']);
function setup() {
  const DB = new D1Shim(); const env = { DB };
  DB.exec('CREATE TABLE IF NOT EXISTS revs (k TEXT PRIMARY KEY, rev INTEGER NOT NULL)');
  DB.exec('CREATE TABLE w (k TEXT, i INTEGER)');
  DB.exec("INSERT INTO revs (k, rev) VALUES ('A', 5), ('B', 7)");
  /* مجموعةُ مفتاح كما يبنيها الحفظ: الحارس · كتاباتُ القيمة · النسخة */
  const grp = (k, have, n) => ({ k, have, g: [revGuard(env, k, have)].concat(Array.from({ length: n }, (_, i) => DB.prepare('INSERT INTO w (k, i) VALUES (?1, ?2)').bind(k, i)), [DB.prepare('UPDATE revs SET rev = 9 WHERE k = ?1').bind(k)]) });
  /* «حفظٌ متزامن»: قبل أوّل دفعةٍ يرفع كاتبٌ آخر نسخةَ B */
  const race = () => { const orig = DB.batch.bind(DB); let first = true; DB.batch = async (s) => { if (first) { first = false; DB.exec("UPDATE revs SET rev = 8 WHERE k = 'B'"); } return orig(s); }; };
  const rows = (k) => DB.q('SELECT COUNT(*) AS n FROM w WHERE k = ?1', k)[0].n;
  const rev = (k) => DB.q('SELECT rev FROM revs WHERE k = ?1', k)[0].rev;
  return { DB, env, grp, race, rows, rev };
}

test('ذرّية > 90 عبارة · سُبق مفتاحٌ في دفعةٍ لاحقة قبل أوّل كتابة ⇒ لا يُكتب شيء ويُردّ الكلُّ تعارضاً (كان: A كُتب كاملاً وB وحده تعارض)', async () => {
  const { env, grp, race, rows, rev } = setup();
  race();
  const lost = await commitGroups(env, [grp('A', 5, 120), grp('B', 7, 3)], true);
  assert.deepEqual(lost.slice().sort(), ['A', 'B'], 'الكلُّ تعارض: ' + JSON.stringify(lost));
  assert.equal(rows('A'), 0, 'لم يُكتب من A شيء'); assert.equal(rows('B'), 0);
  assert.equal(rev('A'), 5, 'نسخةُ A كما هي'); assert.equal(rev('B'), 8, 'نسخةُ B كما كتبها السابق');
});

test('غيرُ الذرّية بالسباق نفسِه: كلُّ مفتاحٍ بحارسه — A يُكتب وB وحده تعارض (العقدُ القديم للحفظ الجزئي)', async () => {
  const { env, grp, race, rows } = setup();
  race();
  const lost = await commitGroups(env, [grp('A', 5, 120), grp('B', 7, 3)], false);
  assert.deepEqual(lost, ['B']); assert.equal(rows('A'), 120); assert.equal(rows('B'), 0);
});

test('ذرّية > 90 بلا سباق ⇒ يُكتب الكلّ · وذرّيةٌ صغيرة (≤ 90) بلا جولةِ فحصٍ إضافية', async () => {
  const a = setup();
  assert.deepEqual(await commitGroups(a.env, [a.grp('A', 5, 120), a.grp('B', 7, 3)], true), []);
  assert.equal(a.rows('A'), 120); assert.equal(a.rows('B'), 3); assert.equal(a.rev('A'), 9); assert.equal(a.rev('B'), 9);
  const b = setup(); const t0 = b.DB.trips;
  assert.deepEqual(await commitGroups(b.env, [b.grp('A', 5, 10), b.grp('B', 7, 3)], true), []);
  assert.equal(b.DB.trips - t0, 1, 'دفعةٌ واحدة لعمليةٍ صغيرة (لا فحصَ مسبقاً)');
});
