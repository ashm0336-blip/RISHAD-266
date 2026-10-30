/* KIVO_261 · AUD-050 (SR-5) — انتظارُ /api/changes?wait=1 محدودٌ لكل حساب: 3 متزامنة تنتظر، وما زاد يُجاب فوراً بلا انتظار (لا خطأ) ·
   والمنتظرون يعودون حين يقع تغيير · ويتحرّر المقعدُ بعد العودة */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

test('wait=1: ثلاثةُ انتظاراتٍ متزامنة للحساب — الرابعُ فوري · التغييرُ يُعيد المنتظرين · المقعدُ يتحرّر', async () => {
  const env = makeTestEnv({}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const p0 = await C.api('/api/ping', { cookie: su.ck }); const v0 = p0.j.rev;
  const t0 = Date.now();
  const W = [1, 2, 3].map(() => C.api('/api/changes?since=' + v0 + '&wait=1', { cookie: su.ck }).then(r => ({ r, ms: Date.now() - t0 })));
  await new Promise(r => setTimeout(r, 150));
  const t4 = Date.now(); const r4 = await C.api('/api/changes?since=' + v0 + '&wait=1', { cookie: su.ck }); const ms4 = Date.now() - t4;
  assert.equal(r4.status, 200, 'الزائدُ يُجاب 200 لا خطأ'); assert.equal(r4.j.v, v0); assert.deepEqual(r4.j.keys, []);
  assert.ok(ms4 < 700, 'الرابعُ فوريٌّ بلا انتظار: ' + ms4 + ' ms');
  const sv = await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]) }); assert.equal(sv.j.ok, 1);
  const done = await Promise.all(W);
  for (const d of done) { assert.equal(d.r.status, 200); assert.ok(d.r.j.v > v0, 'المنتظرُ عاد بالتغيير'); assert.ok(d.ms >= 900 && d.ms < 4000, 'انتظر ثم عاد عند التغيير: ' + d.ms + ' ms'); }
  /* المقاعدُ تحرّرت: انتظارٌ جديدٌ ينتظر فعلاً (يعود بالتغيير التالي لا فوراً) */
  const v1 = done[0].r.j.v; const t5 = Date.now();
  const w5 = C.api('/api/changes?since=' + v1 + '&wait=1', { cookie: su.ck });
  await new Promise(r => setTimeout(r, 1200));
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'إدارة ٢', gid: '' }]) });
  const r5 = await w5; const ms5 = Date.now() - t5;
  assert.ok(r5.j.v > v1 && ms5 >= 1100, 'بعد تحرّر المقاعد: الانتظارُ يعمل (' + ms5 + ' ms)');
});
