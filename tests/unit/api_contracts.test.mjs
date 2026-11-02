/* ══ KIVO_255 · SOT-127 / SOT-100 / AUD-026 — عقودُ الواجهة البرمجية مقروءةً آلياً (src/api/contracts.json) ══
   (أ) قائمةُ المسارات في العقد = ما يطابقه العاملُ فعلاً (path === '/api/…' + بادئةُ /api/img/) — لا مسارَ بلا عقد ولا عقدَ بلا مسار.
   (ب) الردودُ الفعلية (بجلسة مدير النظام · legacy وenforce) تحمل مفاتيحَ عقدها لكل حالة؛ الطرائقُ غيرُ المسموحة تُرفض؛ المجهولُ 404 not-found.
   (ج) الوصولُ: مساراتُ session/actor/super بلا كوكي ⇒ 401 بالشكل الموحَّد؛ مساراتُ enforce بلا ENV ⇒ 404. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { makeTestEnv, makeEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client, worker, WORKER, SRC, since } from './harness.mjs';
const S255 = since(155);
const CT = JSON.parse(fs.readFileSync(path.join(SRC, 'api', 'contracts.json'), 'utf8'));
const byPath = Object.fromEntries(CT.routes.map(r => [r.path, r]));
const hasKeys = (j, keys) => keys.every(k => j && Object.prototype.hasOwnProperty.call(j, k));

test('(أ) مساراتُ العقد = مساراتُ العامل حرفاً، بما فيها واجهة الإحصائيات العلائقية', S255, () => {
  const src = fs.readFileSync(WORKER, 'utf8');
  const exact = [...new Set([...src.matchAll(/path === '(\/api\/[a-z0-9/_-]+)'/g)].map(m => m[1]))];
  const prefixes = [...new Set([...src.matchAll(/path\.indexOf\('(\/api\/[a-z0-9_-]+\/)'\)/g)].map(m => m[1]))];
  const inWorker = exact.concat(prefixes).sort(), inContract = CT.routes.map(r => r.path).sort();
  assert.deepEqual(inContract, inWorker, 'العقدُ والعاملُ يسمّيان المساراتِ نفسَها');
  assert.equal(new Set(inContract).size, inContract.length, 'كل مسار له عقد واحد فقط');
  assert.ok(inContract.includes('/api/dstats'), 'واجهة الإحصائيات العلائقية ضمن العقد والعامل');
  for (const r of CT.routes) { assert.ok(Array.isArray(r.methods) && r.methods.length, r.path + ': طرائق'); assert.ok(['public', 'session', 'actor', 'super', 'enforce'].includes(r.access), r.path + ': مستوى'); assert.ok(r.responses && Object.keys(r.responses).length, r.path + ': ردود'); }
});

for (const mode of ['legacy', 'enforce']) test('(ب) الردودُ الفعلية تطابق العقد — ' + mode, S255, async () => {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok); const ck = su.ck;
  assert.ok(hasKeys(su.j, byPath['/api/login'].responses['200'].ok1), 'login ok1');
  if (mode === 'enforce') { env.DB.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)"); env.DB.exec("INSERT OR REPLACE INTO meta (k, v) VALUES ('authz_mode','enforce')"); }
  const s0 = await C.save(ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]) }); assert.equal(s0.status, 200); assert.ok(hasKeys(s0.j, byPath['/api/save'].responses['200'].keys), 'save');
  const GETS = { '/api/dstats': '', '/api/brand': '', '/api/ping': '', '/api/whoami': '', '/api/me': '', '/api/changes': '?since=0', '/api/get': '?keys=bassam_depts_v1', '/api/aud': '?limit=5', '/api/presence': '', '/api/sec': '', '/api/guard': '', '/api/policy': '', '/api/overview': '', '/api/recovery': '', '/api/permv2': '', '/api/identity-rehearsal': '', '/api/identity-preflight': '', '/api/authz': '', '/api/authz/log': '', '/api/authz/snaps': '', '/api/retro': '' };
  for (const p in GETS) {
    const r = await C.api(p + GETS[p], { cookie: ck }); const c = byPath[p];
    const expect = c.access === 'enforce' && mode === 'legacy' ? '404' : (p === '/api/retro' ? '400' : '200');
    assert.equal(String(r.status), expect, p + ' الحالة'); const spec = c.responses[expect]; assert.ok(spec, p + ': حالةٌ معقودة ' + expect);
    assert.ok(hasKeys(r.j, spec.keys), p + ' مفاتيحُ ' + expect + ': ' + Object.keys(r.j || {}).join(','));
    if (p === '/api/ping') assert.ok(hasKeys(r.j, spec.super_extra), 'ping super_extra');
    if (p === '/api/changes' && mode === 'enforce') assert.ok(hasKeys(r.j, spec.enforce_extra), 'changes enforce_extra');
  }
  const im = await C.api('/api/imgs', { cookie: ck }); assert.equal(im.status, 200); assert.equal(typeof im.j, 'object');
  /* KIVO_264 · SOT-101 (إفصاح — تعديلُ اختبار): /api/me/sess/kill «بلا جسم» — كان يُرسل هنا {tok} والمعالجُ يتجاهله (والعميلُ يرسل {}) فصار 400 bad-body؛ الجسمُ هنا {} كالعميل */
  const POSTS = [['/api/dstats', { base: 0, data: { haram: {}, nabawi: {}, locks: {} } }, '200'], ['/api/checkpw', { pw: 'x' }, '200'], ['/api/me/sess/kill', {}, '200'], ['/api/sess/kill', { uid: 'nobody' }, '403'], ['/api/guard/unlock', { gk: 'u:x' }, '200'], ['/api/policy', { sessH: 12, idleH: 2, lockN: 5, lockMin: 5, pwMin: 6 }, '200'], ['/api/recovery/new', {}, '200'], ['/api/retro', { dept: 'dA' }, '400'], ['/api/authz-migrate', { op: 'plan' }, mode === 'enforce' ? '400' : '404'], ['/api/authz-test', {}, '404']];
  for (const [p, body, st] of POSTS) {
    const r = await C.api(p, { method: 'POST', body, cookie: ck }); const spec = byPath[p].responses[st];
    assert.equal(String(r.status), st, p + ' POST الحالة ' + r.status); assert.ok(spec && hasKeys(r.j, spec.keys), p + ' POST مفاتيح ' + st + ': ' + Object.keys(r.j || {}).join(','));
  }
  /* KIVO_261 (إفصاح — تعديلُ اختبار · SOT-068): كان الرفعُ هنا بايتاتِ PNG خاماً — صيغةٌ لا يرسلها العميل أبداً (يرسل data:image/… نصاً)
     وكان الخادمُ يفكّها نصاً UTF-8 فيُفسدها صامتاً؛ الآن تُرفض 415 (مؤكَّدٌ أدناه)، ويُرفع هنا بصيغة العميل الحقيقية. */
  const w = await worker(env); const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const raw = await w.fetch(new Request('http://x/api/img/t0', { method: 'PUT', headers: { cookie: ck, origin: 'http://x', 'Content-Type': 'image/png' }, body: png }), env); assert.equal(raw.status, 415, 'بايتاتٌ خام ⇒ 415 (لا إفسادَ صامت)');
  const pu = await w.fetch(new Request('http://x/api/img/t1', { method: 'PUT', headers: { cookie: ck, origin: 'http://x', 'Content-Type': 'text/plain; charset=utf-8' }, body: 'data:image/png;base64,iVBORw0KGgo=' }), env); assert.equal(pu.status, 200); assert.ok(hasKeys(await pu.json(), byPath['/api/img/'].responses['200'].PUT_keys), 'img PUT');
  const gi = await w.fetch(new Request('http://x/api/img/t1', { headers: { cookie: ck } }), env); assert.equal(gi.status, 200);
  const di = await w.fetch(new Request('http://x/api/img/t1', { method: 'DELETE', headers: { cookie: ck, origin: 'http://x' } }), env); assert.equal(di.status, 200); assert.ok(hasKeys(await di.json(), byPath['/api/img/'].responses['200'].keys), 'img DELETE');
  const nf = await C.api('/api/nope', { cookie: ck }); assert.equal(nf.status, 404); assert.equal(nf.j.err, CT.common.errors['404'].err);
  const ro = await C.api('/api/aud', { method: 'POST', body: {}, cookie: ck }); assert.equal(ro.status, 405, 'aud غيرُ GET: ' + ro.status);
  const lo = await C.api('/api/logout', { method: 'POST', cookie: ck }); assert.equal(lo.status, 200); assert.ok(hasKeys(lo.j, byPath['/api/logout'].responses['200'].keys));
});

test('(ج) الوصول: بلا كوكي ⇒ 401 موحَّد لكل مسارٍ غيرِ عام (ومنها مساراتُ الإنفاذ — بوابةُ الجلسة قبل 404) · public تردّ', S255, async () => {
  const env = makeTestEnv(); const C = client(env); await C.api('/api/brand');
  for (const r of CT.routes) {
    if (r.path === '/api/img/' || r.path === '/api/reset' || r.path === '/api/recover') continue;
    const m = r.methods[0], o = m === 'GET' ? {} : { method: 'POST', body: {} };
    const x = await C.api(r.path + (r.path === '/api/changes' ? '?since=0' : ''), o);
    if (r.access === 'public') assert.ok(x.status < 400, r.path + ' عام: ' + x.status);
    else if (r.access === 'enforce') { assert.equal(x.status, 401, r.path + ' بلا كوكي (بوابةُ الجلسة قبل 404 الإنفاذ — لا كشفَ لوجود الواجهة بلا جلسة)'); }
    else { assert.equal(x.status, 401, r.path + ' بلا كوكي'); assert.equal(x.j.err, CT.common.errors['401'].err); }
  }
});
