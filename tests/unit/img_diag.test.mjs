import { TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
/* KIVO_265 · حادثةُ الصور (البند 6 من قائمة صفحة المهام): تشخيصُ مخزن الصور في /api/overview (مدير النظام وحده) — ربطُ R2 · العدُّ بالحالات ·
   الرفوعُ غيرُ المربوطة بأصحابها · اليتيماتُ ومهلةُ السماح · الرفوعُ غيرُ المكتملة (أجزاءٌ مرحَّلة) — على العامل الحقيقي */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, KT, TAG, hij, HR, PNG } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const up = async (W, ck, id, q) => { const r = await W.C.api('/api/img/' + id + (q || ''), { method: 'PUT', cookie: ck, body: PNG, headers: { 'Content-Type': 'text/plain' } }); assert.equal(r.status, 200, 'رفعُ ' + id); return id; };

test('تشخيصُ الصور: مدير النظام يرى claim/bound/orphan/staged بأعدادها وأصحابها — والمديرُ لا يصل إلى /api/overview', async () => {
  const W = await world({ worker: WU.file });
  const su = await W.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN), dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
  assert.equal((await get(W, dm.ck, '/api/overview')).status, 403, 'لمدير النظام وحده');
  let ov = (await get(W, su.ck, '/api/overview')).j; assert.ok(ov.imgs && !ov.imgs.err, JSON.stringify(ov.imgs));
  const base = ov.imgs.counts.claim || 0, b0 = ov.imgs.counts.bound || 0, o0 = ov.imgs.counts.orphan || 0, s0 = ov.imgs.stored;
  assert.equal(ov.imgs.r2, true, 'المِثالُ يربط IMG_R2 وهمياً (harness) — الرايةُ تعكس الربط');
  /* رفعٌ لم يُربط (claim) · ورفعٌ مقطَّع لم يكتمل (staged) */
  await up(W, me.ck, 'img_tskdiag_c1');
  await up(W, me.ck, 'img_tskdiag_s1', '?p=0&n=2');
  ov = (await get(W, su.ck, '/api/overview')).j;
  assert.equal(ov.imgs.counts.claim, base + 1); assert.equal(ov.imgs.staged, 1, 'جزءٌ مرحَّل'); assert.equal(ov.imgs.stored, s0 + 1);
  const c = ov.imgs.claims.find((q) => q.img === 'img_tskdiag_c1'); assert.ok(c, 'في القائمة'); assert.equal(c.uid, ME.uid); assert.match(c.name, /موظف مهام 1/); assert.equal(c.dept, 'tst_d1'); assert.ok(c.ts > 0);
  /* الربطُ بمسودّةٍ ثم إزالتُها ⇒ bound ثم orphan */
  const s = Date.now() - HR, cr = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' diag', s, e: s + 3 * HR, asg: [ME.eid], rv: 'none' }); assert.equal(cr.status, 200);
  const k = cr.j.rows[0].k, id = cr.j.rows[0].id;
  assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k, id, act: 'start' })).status, 200);
  assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k, id, act: 'doc', imgs: ['img_tskdiag_c1'], note: 'م' })).status, 200);
  ov = (await get(W, su.ck, '/api/overview')).j; assert.equal(ov.imgs.counts.claim, base); assert.equal(ov.imgs.counts.bound, b0 + 1);
  assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k, id, act: 'doc', rm: ['img_tskdiag_c1'] })).status, 200);
  ov = (await get(W, su.ck, '/api/overview')).j; assert.equal(ov.imgs.counts.orphan, o0 + 1);
  const o = ov.imgs.orphans.find((q) => q.img === 'img_tskdiag_c1'); assert.ok(o, 'اليتيمةُ في القائمة'); assert.equal(o.dept, 'tst_d1'); assert.equal(ov.imgs.grace, 30 * 864e5);
  assert.ok(Object.keys(ov).includes('imgs') && KT, 'مفتاحُ العقد');
});
