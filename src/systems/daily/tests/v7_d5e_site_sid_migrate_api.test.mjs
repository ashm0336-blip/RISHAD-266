/* V7 · د5-هـ (م3) — ترحيلُ هوية الموقع «site-sid» عبر المسار المحمي القائم /api/authz-migrate، على العامل الحقيقي (node:sqlite) وبياناتٍ اصطناعية TEST_ONLY:
   ① مديرُ النظام وحده · لا يُخلط بجزءٍ آخر (parts-mixed) · الخطةُ حتمية (البذرةُ نفسُها ⇒ البصمةُ نفسُها)
   ② التطبيق: كلُّ طابقٍ في الجولات ولقطةِ الشهر يحمل sid طابق الخطة المقابل (exact) — صفاً صفاً قبل/بعد — ولا يمسّ غيرَ الجولات والخطة
   ③ الثانيةُ لا تكتب شيئاً (applied:0) · ④ الرجوعُ يعيد القيمتين حرفاً، والثاني «already-restored» · ⑤ plan-changed إن تغيّرت الجولاتُ بعد الخطة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from '../../../../tests/unit/harness.mjs';
import { installCurrentSchemaFixture } from '../../../../tests/unit/current_schema_fx.mjs';

const T = (() => { const x = new Date(Date.now()); return { year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate() }; })();   /* V7 · 53 تقويم: اليومُ التشغيلي ميلادي (الرياض − 3 ساعات) */
const P2 = (n) => String(n).padStart(2, '0');
const YM = T.year + '-' + P2(T.month), D1 = YM + '-01', D2 = YM + '-02';
const KP = 'bsdept:tst_d1:bassam_plan_v1', KR = 'bsdept:tst_d1:bassam_rounds_v1';
function seedSql() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_sid_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world() {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' }), C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'admin');
  await applySql(env.DB, seedSql()); await installCurrentSchemaFixture(env);
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const dm = await C.login('0000000101', '70101'); assert.ok(dm.ok, 'dm1');
  const uid = (await C.api('/api/whoami', { cookie: su.ck })).j.uid;
  return { env, C, su: su.ck, dm: dm.ck, uid };
}
const read = async (W, keys) => (await W.C.api('/api/operations/read?' + new URLSearchParams({ uid: W.uid, keys: keys.join(',') }), { cookie: W.su })).j;
let RQ = 0;
async function put(W, set) {
  const cur = await read(W, Object.keys(set));
  const r = await W.C.api('/api/save', { method: 'POST', cookie: W.su, body: { uid: W.uid, requestId: 'TEST_ONLY_sid_' + (++RQ), epoch: cur.epoch, set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, JSON.stringify(v)])), del: [], base: cur.base } });
  assert.ok(r.j && (r.j.ok === 1 || Object.keys(r.j.revs || {}).length) && !Object.keys(r.j.denied || {}).length, 'حفظ TEST_ONLY: ' + JSON.stringify(r.j).slice(0, 300));
}
/* مواقعُ بهندسةٍ متمايزة: مصلّى + 10 أبواب لكل موقع */
function site(tag, k, sid) {
  const gates = []; for (let j = 0; j < 10; j++) gates.push({ num: tag + j, x: 100 * k + 7 * j, y: 50 + 3 * j });
  const f = { name: 'TEST_ONLY ' + tag, num: k, zones: [{ code: 'TEST_ONLY_Z' + tag, d: 'M' + 100 * k + ' 0 L' + (100 * k + 50) + ' 0 L' + (100 * k + 50) + ' 40 Z' }], gates, marks: [], paths: [] };
  if (sid) f.sid = sid; return f;
}
const bare = (f) => { const o = JSON.parse(JSON.stringify(f)); delete o.sid; return o; };
const dayOf = (fs0) => ({ t: 1, ap: 0, d: fs0.map((f) => { const o = bare(f); delete o.name; delete o.num; return o; }) });
const migrate = (W, body, ck) => W.C.api('/api/authz-migrate', { method: 'POST', cookie: ck || W.su, body });
const plan = (W, extra = '', ck) => W.C.api('/api/authz-migrate?act=plan&parts=site-sid' + extra, { cookie: ck || W.su });

test('[enforce] site-sid: خطة ← تطبيق (صفاً صفاً) ← لا شيءَ بعد ← رجوع · مديرُ النظام وحده · لا خلط · plan-changed', async () => {
  const W = await world();
  /* بياناتُ المُثبِّت (TEST_ONLY): خطةُ tst_d1 بموقعين لهما sid، وجولاتُها بمعرّفاتها — يُنزع sid من طوابق الجولات (يومٌ قديمٌ قبل إقفال الهوية) */
  const start = (await read(W, [KP, KR])).resources, orig = start[KR];
  assert.ok(orig && Object.keys(orig).some((k) => /^\d+-\d+-\d+$/.test(k)), 'جولاتُ المُثبِّت');
  const want = {}, roundsDoc = JSON.parse(JSON.stringify(orig));
  for (const k of Object.keys(roundsDoc)) if (/^\d+-\d+-\d+$/.test(k) && Array.isArray(roundsDoc[k].d)) { want[k] = roundsDoc[k].d.map((f) => f.sid); roundsDoc[k].d.forEach((f) => { delete f.sid; }); }
  assert.ok(Object.values(want).flat().every(Boolean), 'كلُّ طابقٍ في المُثبِّت كان يحمل sid');
  await put(W, { [KR]: roundsDoc });
  const before = await read(W, [KP, KR]), RB = JSON.stringify(before.resources[KR]), PB = JSON.stringify(before.resources[KP]);
  /* ① */
  assert.equal((await plan(W, '', W.dm)).status, 403, 'مديرُ الإدارة لا يخطّط');
  const mixed = await plan(W, ',perm'); assert.equal(mixed.status, 400); assert.equal(mixed.j.err, 'parts-mixed');
  const p1 = await plan(W); assert.equal(p1.status, 200, JSON.stringify(p1.j).slice(0, 300)); const P1 = p1.j.plan;
  assert.deepEqual(P1.parts, ['site-sid']); assert.ok(P1.writes.some((w) => w.k === KR), 'الجولاتُ في مجموعة الكتابة');
  assert.equal((await plan(W, '&seed=' + P1.seed)).j.plan.hash, P1.hash, 'حتمية');
  /* ⑤ plan-changed */
  const changed = JSON.parse(JSON.stringify(roundsDoc)); changed[Object.keys(want)[0]].ap = changed[Object.keys(want)[0]].ap ? 0 : 1; await put(W, { [KR]: changed });
  const pc = await migrate(W, { act: 'apply', seed: P1.seed, hash: P1.hash, generated: P1.generated, parts: ['site-sid'] });
  assert.equal(pc.status, 409); assert.equal(pc.j.err, 'plan-changed');
  await put(W, { [KR]: roundsDoc });
  const base = await read(W, [KP, KR]), R0 = JSON.stringify(base.resources[KR]), P0b = JSON.stringify(base.resources[KP]);
  /* ② التطبيق */
  const P2 = (await plan(W)).j.plan;
  const ap = await migrate(W, { act: 'apply', seed: P2.seed, hash: P2.hash, generated: P2.generated, parts: ['site-sid'] });
  assert.equal(ap.status, 200, JSON.stringify(ap.j)); assert.ok(ap.j.applied >= 1); assert.match(ap.j.snap, /^migration_/);
  const after = (await read(W, [KR])).resources[KR], rows = [];
  for (const [k, sids] of Object.entries(want)) {
    const was = JSON.parse(R0)[k].d;
    after[k].d.forEach((f, i) => { rows.push([k, i, was[i].sid || '—', f.sid || '—'].join(' | ')); assert.equal(f.sid, sids[i], k + '[' + i + '] sid'); assert.deepEqual(bare(f), bare(was[i]), k + '[' + i + '] لا يتغيّر غيرُ sid'); });
  }
  console.log('day | idx | sid before | sid after\n' + rows.join('\n'));
  const meta = W.env.DB.q("SELECT v FROM meta WHERE k = 'authz_id_mig'")[0]; assert.ok(meta && JSON.parse(meta.v).snap === ap.j.snap, 'علامةُ الهوية');
  /* ③ الثانية بلا كتابة */
  const P3 = (await plan(W)).j.plan; assert.equal(P3.counts.writes, 0, JSON.stringify(P3.counts));
  const ap0 = await migrate(W, { act: 'apply', seed: P3.seed, hash: P3.hash, generated: P3.generated, parts: ['site-sid'] });
  assert.equal(ap0.status, 200); assert.equal(ap0.j.applied, 0);
  /* ④ الرجوع */
  const rb = await migrate(W, { act: 'rollback', snap: ap.j.snap });
  assert.equal(rb.status, 200, JSON.stringify(rb.j));
  const back = await read(W, [KP, KR]);
  assert.equal(JSON.stringify(back.resources[KR]), R0, 'الجولاتُ كما كانت حرفاً'); assert.equal(JSON.stringify(back.resources[KP]), P0b, 'والخطةُ كما كانت');
  assert.equal((await migrate(W, { act: 'rollback', snap: ap.j.snap })).j.err, 'already-restored');
  assert.ok(RB && PB);
});
