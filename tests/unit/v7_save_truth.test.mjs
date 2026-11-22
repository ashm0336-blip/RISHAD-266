/* V7 · د5-هـ (أمن ١) — «حفظٌ يجيب بالنجاح ولم يحفظ»:
   (أ) /api/save لا يجيب ok:1 إن رُفض كلُّ مفتاحٍ طُلب أو تعارض — النتيجةُ لكل مفتاحٍ كما هي (revs · denied · conflicts).
   (ب) mergeUsers: بصمةٌ قديمة (p1$) لحسابٍ بصمتُه المخزَّنة p2$ كانت تُستبدل صامتةً بالمخزَّنة ويُعلَن المفتاحُ «محفوظاً» (إعادةُ ضبطٍ لم تقع) —
       الآن يُرفض المفتاحُ بسببٍ صريح ولا تتغيّر البصمةُ ولا الجلسة. TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client } from './harness.mjs';
import { world } from './world_fx.mjs';

test('(أ) حفظٌ رُفضت مفاتيحُه كلُّها: ok:0 والرفضُ لكل مفتاح — وحفظٌ قُبل بعضُه: ok:1 والمقبولُ في revs', async () => {
  const B = await world();
  const dm = await B.login('0000000101', '70101');
  const g = await B.C.api('/api/get?keys=bassam_perms_v1', { cookie: dm.ck });
  const body = { set: { bassam_perms_v1: JSON.stringify({ TEST_ONLY: 1 }) }, del: [], base: { bassam_perms_v1: ((g.j.keys || {}).bassam_perms_v1 || {}).rev || 0 }, ack: 2 };   /* ack:2 — the current client (280 payload) */
  const all = await B.C.api('/api/save', { method: 'POST', cookie: dm.ck, body });
  assert.equal(all.status, 200, JSON.stringify(all.j));
  assert.ok(all.j.denied && all.j.denied.bassam_perms_v1, 'the key is refused: ' + JSON.stringify(all.j));
  assert.deepEqual(Object.keys(all.j.revs || {}), [], 'nothing saved');
  assert.equal(all.j.ok, 0, '★ an answer for a save that saved nothing is not ok:1: ' + JSON.stringify(all.j).slice(0, 200));
  const legacy = await B.C.api('/api/save', { method: 'POST', cookie: dm.ck, body: { ...body, ack: undefined } });
  assert.equal(legacy.j.ok, 1, 'a page of the previous release (no ack) keeps its ok:1 — it would resend an ok:0 forever'); assert.ok(legacy.j.denied.bassam_perms_v1);
  const ok = await B.C.save(B.su.ck, { bassam_platform_v1: JSON.stringify({ name: 'TEST_ONLY' }) });
  assert.equal(ok.j.ok, 1, 'a save that saved its key stays ok:1'); assert.ok(ok.j.revs.bassam_platform_v1 > 0);
});

const K = 'bassam_auth_users_v1';
const lh = (p) => { let h = 5381, s = 'bs~' + p + '~gate'; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; let h2 = 52711; for (let j = s.length - 1; j >= 0; j--) h2 = ((h2 << 5) + h2 + s.charCodeAt(j)) | 0; return (h >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36); };   /* the legacy p1$ digest (pw_upgrade_rev) */
const dbUsers = (env) => JSON.parse(env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', K).map((r) => r.v).join(''));
test('(ب) بصمةٌ قديمة p1$ لحساب غيره (بلا تعيينٍ مؤقت) تُرفض بسببٍ صريح — لا «محفوظ» والبصمةُ المخزَّنة كما هي', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const users = [{ id: 'su', un: 'admin', ph: 'p1$' + lh('admin'), name: 'م', role: 'super' }, { id: 'wr', un: 'writer', ph: 'p1$' + lh('Wrt#11234'), name: 'ك', role: 'staff', deptId: 'A', ekey: 'e_wr' }];
  await C.save(su.ck, { [K]: JSON.stringify(users), bassam_depts_v1: JSON.stringify([{ id: 'A', name: 'أ' }]) });
  const wr = await C.login('writer', 'Wrt#11234'); assert.ok(wr.ok);
  const before = dbUsers(env).find((u) => u.id === 'wr').ph; assert.ok(before.startsWith('p2$'));
  const rv = (await C.api('/api/get?keys=' + K, { cookie: su.ck })).j.keys[K].rev;
  const s = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: { [K]: JSON.stringify(dbUsers(env).map((u) => (u.id === 'wr' ? { ...u, ph: 'p1$' + lh('Other#5566') } : u))) }, del: [], base: { [K]: rv }, ack: 2 } });
  assert.equal(s.status, 200);
  assert.ok(!(s.j.revs && K in s.j.revs), '★ the account list is not reported saved: ' + JSON.stringify(s.j).slice(0, 300));
  assert.ok(s.j.denied && s.j.denied[K], 'refused'); assert.match(String(s.j.denied[K].detail || ''), /^stale-client: .*كلمةُ المرور/, 'a clear reason the client shows');
  assert.equal(s.j.ok, 0);
  assert.equal(dbUsers(env).find((u) => u.id === 'wr').ph, before, 'the stored hash is kept');
  assert.equal((await C.api('/api/whoami', { cookie: wr.ck })).status, 200, 'the owner\'s session stays');
});
