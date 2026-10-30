/* KIVO_265 · k265-init (حادثةُ Production 2026-10-15 — تشخيصٌ للقراءة): المساراتُ كلُّها عبر colo واحد معلّقةٌ أبداً عند أوّل جولة D1 والأصولُ تعمل.
   الفرضية: initDb (052) كان يخبّئ وعدَ التهيئة _init على مستوى الوحدة ويشركه بين الطلبات — فإن أُلغي الطلبُ الذي بدأه أو علقت جولتُه بقي معلَّقاً
   وانتظره كلُّ طلبٍ لاحق في الـisolate بلا مهلة. الآن علامةٌ بعد النجاح وحده (_initOk) وكلُّ طلبٍ قبلها يهيّئ بنفسه بمهلة (INIT_MS = 8 ث):
     (أ) أوّلُ استعلامٍ للطلب A لا يعود أبداً ⇒ الطلبُ B يكتمل (لا ينتظر A) · وA نفسُه يُردّ 500 worker-error عند المهلة (لا تعليقَ أبداً)
     (ب) تهيئةٌ مرفوضة لا تسمّم ما بعدها: الطلبُ الأول 500 سريعاً والتالي يكتمل
     (ج) التهيئة مرة واحدة، مع قراءة سجل الترحيلات داخل لقطة كل طلب لحماية الـisolate الدافئ، دون إعادة DDL
   D1 بديلٌ في الذاكرة (harness · node:sqlite) — بلا بيئةٍ حيّة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, client } from './harness.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* يُكمل الوعدَ أو يُعلن التعليقَ بعد ms (كشفُ «لا يعود أبداً» بمهلةٍ على مستوى الاختبار) */
const within = (p, ms) => Promise.race([p.then((v) => ({ done: 1, v }), (e) => ({ done: 1, e })), sleep(ms).then(() => ({ done: 0 }))]);
/* أوّلُ استعلامٍ على d1_migrations لا يعود أبداً (جولةُ الطلب A العالقة) — وما بعده كما هو */
function hangFirstInit(DB) {
  const prep = DB.prepare.bind(DB); let hung = 0;
  DB.prepare = (sql) => { const st = prep(sql); if (hung || !/FROM d1_migrations/.test(sql)) return st; hung = 1; st.all = () => new Promise(() => {}); st.first = () => new Promise(() => {}); return st; };
}

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] (أ) أوّلُ جولة D1 للطلب A معلّقةٌ أبداً ⇒ الطلبُ B يكتمل — وA يُردّ 5xx عند المهلة لا تعليقاً', { timeout: 30000 }, async () => {
    const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), C = client(env);
    hangFirstInit(env.DB);
    const A = C.api('/api/ping');
    await sleep(50);                                                                  /* A بدأ تهيئتَه وعلق عند أوّل استعلام */
    const B = await within(C.api('/api/ping'), 4000);
    assert.equal(B.done, 1, 'B لم يكتمل خلال 4 ث — ينتظر تهيئةَ A المعلّقة');
    assert.ok(!B.e && B.v.status === 200 && B.v.j.ok === 1, 'B نجح: ' + JSON.stringify(B.e ? String(B.e) : { st: B.v.status, j: B.v.j }).slice(0, 200));
    const a = await within(A, 12000);
    assert.equal(a.done, 1, 'A معلّقٌ بعد مهلة التهيئة (8 ث)');
    assert.ok(!a.e && a.v.status >= 500 && a.v.j.err === 'worker-error', 'A يُردّ 5xx سريعاً: ' + JSON.stringify(a.e ? String(a.e) : { st: a.v.status, j: a.v.j }));
  });
}

test('(ب) تهيئةٌ مرفوضة لا تسمّم ما بعدها: 500 سريعاً ثم يكتمل الطلبُ التالي', { timeout: 20000 }, async () => {
  const env = makeEnv(), C = client(env); let n = 0;
  env.DB.failIf = (sql) => /FROM d1_migrations/.test(sql) && n++ === 0;
  const r1 = await within(C.api('/api/ping'), 4000);
  assert.ok(r1.done && !r1.e && r1.v.status === 500 && r1.v.j.err === 'worker-error', 'الأوّل 500: ' + JSON.stringify(r1.done ? (r1.e ? String(r1.e) : r1.v.j) : 'معلّق'));
  const r2 = await within(C.api('/api/ping'), 4000);
  assert.ok(r2.done && !r2.e && r2.v.status === 200 && r2.v.j.ok === 1, 'التالي يكتمل: ' + JSON.stringify(r2.done ? (r2.e ? String(r2.e) : r2.v.j) : 'معلّق'));
});

test('(ج) قاعدة مرحَّلة: تهيئة واحدة والتحقق من سجل الترحيلات مع كل لقطة طلب، بلا DDL', { timeout: 20000 }, async () => {
  const env = makeEnv(); assert.equal((await client(env).api('/api/ping')).j.ok, 1);   /* isolate أوّل يرحّل القاعدة */
  const env2 = Object.assign({}, env); delete env2.__worker;                         /* isolate جديد على القاعدة نفسِها */
  const C2 = client(env2); env.DB.log.length = 0;
  for (let i = 0; i < 3; i++) assert.equal((await C2.api('/api/ping')).j.ok, 1);
  assert.deepEqual(env.DB.log.filter((s) => /d1_migrations|CREATE TABLE|ALTER TABLE/.test(s)), Array(4).fill('SELECT name FROM d1_migrations'), 'تهيئة واحدة وثلاث لقطات طلب محمية، بلا ترحيل أو DDL');
});
