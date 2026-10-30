/* KIVO_264 · SOT-101 — مخطّطاتُ الأجسام لبقية المسارات المغيِّرة (كانت 5 من 15): الخروج · إنهاءُ جلساتي (بلا جسم) · الاستدراك · فكُّ القفل · السياسات ·
   مفتاحُ الاستعادة · التهيئة · ترحيلُ الإنفاذ · أداةُ الاختبار — يفرضها bodyCheck نفسُه (400 {ok:0, err:'bad-body', at}) قبل أيّ كتابة؛ والصورةُ عقدٌ خامٌّ مكتوب
   (النوع · الحجم · الصيغة · الأجزاء) يطابق ثوابتَ الخادم. وE5: الجسمُ null كان 500 في السياسات والاستعادة والتهيئة ⇒ 400 الآن.
   (أ) كلُّ مسارٍ مغيِّرٍ في العقد له مخطّطٌ أو عقدٌ خامّ أو هو «بلا جسم» — لا مسارَ مغيِّرٌ بلا قاعدة
   (ب) السليمُ (أشكالُ العميل الحقيقية) يمرّ · الخاطئُ 400 بموضعه · null ⇒ 400 · ولا أثرَ في القاعدة
   (ج) الصورة: النوعُ (text/plain أو غائب) · الحجمُ 512 KB · الصيغة · الأجزاء — والعقدُ المكتوب = ثوابتُ الخادم */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, worker, ROOT, SRC, WORKER, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { internals } from './internals.mjs';
import { installIrshadFixture } from './irshad_legacy_seed_fx.mjs';
const SRCW = fs.readFileSync(WORKER, 'utf8');
const K264 = SRCW.includes('"/api/policy":') || process.env.KIVO_K264_STRICT ? {} : { skip: 'العاملُ المختبَر قبل KIVO_264' };
const SCH = JSON.parse(fs.readFileSync(path.join(SRC, 'schemas', 'api', 'bodies.schema.json'), 'utf8'));
const CT = JSON.parse(fs.readFileSync(path.join(SRC, 'api', 'contracts.json'), 'utf8'));
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264b_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
test('(أ) كلُّ مسارٍ مغيِّرٍ في العقد له قاعدةُ جسم: مخطّطٌ · عقدٌ خامّ · أو «بلا جسم» (كائنٌ فارغٌ وحده) — وكلُّ مخطّطٍ له ردُّ 400 معقود', K264, () => {
  const mut = CT.routes.filter(r => r.methods.some(m => m !== 'GET')).map(r => r.path).sort();
  const covered = Object.keys(SCH.bodies).concat(Object.keys(SCH.raw || {})).sort();
  assert.deepEqual(mut.filter(p => !covered.includes(p)), [], 'مساراتٌ مغيِّرة بلا قاعدة');
  for (const p of ['/api/logout', '/api/me/sess/kill']) assert.deepEqual(SCH.bodies[p], { type: 'object', additionalProperties: false }, p + ': بلا جسم');
  for (const p of Object.keys(SCH.bodies)) { const s = (CT.routes.find(r => r.path === p).responses || {})['400']; assert.ok(s && s.err === 'bad-body' && s.schema, p + ': 400 معقود'); }
  assert.ok(SCH.raw['/api/img/'] && (CT.routes.find(r => r.path === '/api/img/').responses['415']), 'الصورة: عقدٌ خامّ و415 معقود');
});
test('(ب) الأجسامُ في مساراتها: السليمُ يمرّ · الخاطئُ 400 بموضعه · null ⇒ 400 (E5 — كان 500) · بلا أثر', K264, async () => {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  await installIrshadFixture(env);
  const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok);
  const meta = () => JSON.stringify(env.DB.q("SELECT k, v FROM meta WHERE k IN ('policy','rk','rk_meta')"));
  const post = (p, body, ck) => C.api(p, { method: 'POST', body, cookie: ck });
  /* E5 + الأنواع: مدير النظام */
  const m0 = meta();
  for (const [p, body, at] of [
    ['/api/policy', null, '$'], ['/api/policy', [], '$'], ['/api/policy', { sessH: { x: 1 } }, 'sessH'], ['/api/policy', { lockN: 'x'.repeat(40) }, 'lockN'],
    ['/api/recovery/new', null, '$'], ['/api/recovery/new', { pw: 123456 }, 'pw'],
    ['/api/reset', null, '$'], ['/api/reset', { pw: 'x', key: 5 }, 'key'], ['/api/reset', { pw: 'x', admin: 'su' }, 'admin'], ['/api/reset', { pw: 'x', admin: { un: 1 } }, 'admin.un'], ['/api/reset', { keepBrand: 'yes' }, 'keepBrand'],
    ['/api/guard/unlock', null, '$'], ['/api/guard/unlock', { gk: 7 }, 'gk'], ['/api/guard/unlock', { gks: [1] }, 'gks[0]'], ['/api/guard/unlock', { all: 'all' }, 'all'],
    ['/api/retro', null, '$'], ['/api/retro', { res: ['irshad'] }, 'res'], ['/api/retro', { res: 'irshad', scope: [] }, 'scope'], ['/api/retro', { res: 'irshad', scope: { y: { a: 1 } } }, 'scope.y'], ['/api/retro', { reason: 5 }, 'reason'],
    ['/api/logout', null, '$'], ['/api/logout', { tok: 'x' }, 'tok'],
    ['/api/me/sess/kill', null, '$'], ['/api/me/sess/kill', { tok: 'x' }, 'tok'], ['/api/me/sess/kill', [], '$']]) {
    const r = await post(p, body, su.ck);
    assert.equal(r.status, 400, p + ' ' + JSON.stringify(body) + ' ⇒ ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 120));
    assert.equal(r.j.err, 'bad-body', p); assert.equal(r.j.at, at, p + ' ' + JSON.stringify(body));
  }
  assert.equal(meta(), m0, 'لم يُكتب شيءٌ في السياسات ولا مفتاح الاستعادة');
  assert.equal((await C.api('/api/whoami', { cookie: su.ck })).status, 200, 'الخروجُ بجسمٍ خاطئ لم يُنهِ الجلسة');
  /* JSON غيرُ مفهوم ⇒ 400 bad-body $ */
  const raw = await C.req('/api/policy', { method: 'POST', cookie: su.ck, body: '{nope' }); assert.equal(raw.status, 400); assert.equal((await raw.json()).at, '$');
  /* السليم — أشكالُ العميل الحقيقية (src/modules/admin/logic.js · 280 · profile) */
  const pol = await post('/api/policy', { sessH: '12', idleH: 2, lockN: '5', lockMin: 5, pwMin: 6, wrMin: '1200' }, su.ck);   /* حقولُ النموذج نصوصٌ من e.target.value */
  assert.equal(pol.status, 200); assert.equal(pol.j.ok, 1); assert.equal(pol.j.policy.sessH, 12);
  assert.equal((await post('/api/recovery/new', { pw: 'خطأ' }, su.ck)).j.ok, 0, 'كلمةٌ خاطئة: ok:0 بلا كتابة');
  const g1 = await post('/api/guard/unlock', { gk: 'u:admin', gks: ['p:admin|1.2.3.4', 'ip:1.2.3.4'] }, su.ck); assert.equal(g1.status, 200); assert.equal(g1.j.ok, 1);
  const ret = await post('/api/retro', { res: 'irshad', dept: 'tst_d1', act: 'open', scope: { y: 1440, m: 1 }, reason: 'TEST_ONLY سبب' }, su.ck);
  assert.equal(ret.status, 200, JSON.stringify(ret.j).slice(0, 200)); assert.equal(ret.j.ok, 1, 'نافذةُ استدراكٍ بشكل العميل');
  const rc = await post('/api/retro', { act: 'close', res: 'irshad', dept: 'tst_d1', id: ret.j.window.id }, su.ck); assert.equal(rc.j.ok, 1, 'الإغلاقُ بشكل مشغّل المصفوفة');
  for (const res of ['__proto__', 'constructor', 'toString']) { const rp = await post('/api/retro', { res, dept: 'tst_d1', act: 'open', scope: { y: 1440, m: 1 }, reason: 'x' }, su.ck); assert.equal(rp.status, 400, res + ' ⇒ ' + rp.status); assert.equal(rp.j.err, 'res'); }   /* كانت تمرّ فتنهار 500 */
  const other = await C.login('0000000113', '70113');
  assert.equal((await C.api('/api/me/sess/kill', { method: 'POST', cookie: emp.ck, body: '{}' })).j.ok, 1, 'إنهاءُ جلساتي بجسم {} (كما يرسل العميل)');
  assert.equal((await C.api('/api/whoami', { cookie: other.ck })).status, 401, 'أُنهيت الأخرى');
  assert.equal((await C.req('/api/me/sess/kill', { method: 'POST', cookie: emp.ck })).status, 200, 'وبلا جسمٍ أصلاً');
  assert.equal((await C.api('/api/logout', { method: 'POST', cookie: emp.ck })).j.ok, 1, 'الخروجُ بلا جسم'); assert.equal((await C.api('/api/whoami', { cookie: emp.ck })).status, 401);
  /* الترتيب: الصلاحيةُ قبل الشكل — غيرُ مدير النظام 403 على مساراته ولو بجسمٍ خاطئ */
  const e2 = await C.login('0000000121', '70121');
  for (const p of ['/api/policy', '/api/recovery/new', '/api/reset', '/api/guard/unlock']) assert.equal((await post(p, null, e2.ck)).status, 403, p + ': 403 قبل الشكل');
  assert.equal((await post('/api/me/sess/kill', { tok: 'x' })).status, 401, 'بلا جلسة: 401 قبل الشكل');
});
test('(ب) الإنفاذ: ترحيلُ الإنفاذ وأداةُ الاختبار بمخطّطَيهما (بعد حارسَيهما)', K264, async () => {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql()); env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  for (const [body, at] of [[null, '$'], [{ act: 5 }, 'act'], [{ act: 'apply', parts: 'identity' }, 'parts'], [{ act: 'rollback', force: 'yes' }, 'force'], [{ act: 'apply', generated: { t: 1 } }, 'generated']]) {
    const r = await C.api('/api/authz-migrate', { method: 'POST', cookie: su.ck, body }); assert.equal(r.status, 400, JSON.stringify(body)); assert.equal(r.j.err, 'bad-body'); assert.equal(r.j.at, at);
  }
  const ok = await C.api('/api/authz-migrate', { method: 'POST', cookie: su.ck, body: { act: 'rollback', snap: 'x_y_z' } }); assert.equal(ok.status, 404, 'سليمُ الشكل يبلغ معالجه (لقطةٌ مجهولة 404): ' + ok.status);
  const dm = await C.login('0000000101', '70101'); assert.equal((await C.api('/api/authz-migrate', { method: 'POST', cookie: dm.ck, body: null })).status, 403, 'غيرُ مدير النظام: 403 قبل الشكل');
  /* أداةُ الاختبار: مضيفُ الاختبار وحده — الشكلُ بعد حرّاسها (البيئة · المضيف · مدير النظام) */
  const T = client(env, 'http://test.kivo-d81.pages.dev'); const tsu = await T.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(tsu.ok);
  for (const [body, at] of [[null, '$'], [{ uid: 5 }, 'uid'], [{ uid: 'tst_emp1', path: ['/'] }, 'path'], [{ uid: 'tst_emp1', vals: 'k' }, 'vals']]) {
    const r = await T.api('/api/authz-test', { method: 'POST', cookie: tsu.ck, body }); assert.equal(r.status, 400, JSON.stringify(body) + ' ' + JSON.stringify(r.j).slice(0, 100)); assert.equal(r.j.err, 'bad-body'); assert.equal(r.j.at, at);
  }
  const t1 = await T.api('/api/authz-test', { method: 'POST', cookie: tsu.ck, body: { uid: 'tst_emp1', path: '/api/whoami', method: 'GET' } }); assert.equal(t1.status, 200); assert.equal(t1.j.uid, 'tst_emp1');
  const t2 = await client(env, 'http://kivo-d81.pages.dev').api('/api/authz-test', { method: 'POST', cookie: su.ck, body: null }); assert.equal(t2.status, 404, 'مضيفُ الإنتاج: 404 قبل الشكل');
});
test('(ج) الصورة: العقدُ الخامُّ المكتوب = ثوابتُ الخادم · النوعُ والحجمُ والصيغةُ والأجزاء في الخادم', K264, async () => {
  const R = SCH.raw['/api/img/'];
  const W = await internals(['BODY_MAX', 'IMG_TOTAL_MAX', 'IMG_PARTS_MAX', 'imgTypeOk', 'imgPartOk', 'imgCtypeOk']);
  assert.equal(W.BODY_MAX['/api/img/'], R.maxBytes); assert.equal(W.IMG_TOTAL_MAX, R.parts.totalMaxChars); assert.equal(W.IMG_PARTS_MAX, R.parts.maxParts);
  const rx = new RegExp(R.format, R.formatFlags || '');
  for (const s of ['data:image/png;base64,iVBORw0KGgo=', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png,<html>', 'data:text/html;base64,PGI+', '<svg/onload=1>', 'data:image/png;base64,ab$cd'])
    assert.equal(W.imgTypeOk(s), rx.test(s), 'الصيغةُ المكتوبة = الخادم: ' + s);
  for (const [ct, ok] of [[null, true], ['', true], ['text/plain', true], ['text/plain; charset=utf-8', true], ['TEXT/PLAIN;charset=UTF-8', true], ['text/plain, application/json', true], ['image/png', false], ['application/json', false], ['multipart/form-data; boundary=x', false], ['application/octet-stream', false]])
    assert.equal(W.imgCtypeOk(ct), ok, 'Content-Type ' + JSON.stringify(ct));
  const env = makeTestEnv(); const C = client(env); const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); const w = await worker(env);
  const put = (k, body, ct, q = '') => w.fetch(new Request('http://x/api/img/' + k + q, { method: 'PUT', headers: Object.assign({ cookie: su.ck, origin: 'http://x' }, ct === undefined ? {} : { 'Content-Type': ct }), body }), env);
  const n0 = env.DB.q('SELECT COUNT(*) AS n FROM imgs')[0].n;
  assert.equal((await put('k1', 'data:image/png;base64,iVBORw0KGgo=', 'application/json')).status, 415, 'نوعٌ آخر ⇒ 415 قبل قراءة الجسم');
  assert.equal((await put('k1', new Uint8Array([137, 80, 78, 71]), 'image/png')).status, 415, 'بايتاتٌ خام ⇒ 415');
  assert.equal(env.DB.q('SELECT COUNT(*) AS n FROM imgs')[0].n, n0, 'لا كتابة');
  assert.equal((await put('k1', 'data:image/png;base64,iVBORw0KGgo=', 'text/plain; charset=utf-8')).status, 200, 'صيغةُ العميل');
  assert.equal((await put('k2', new TextEncoder().encode('data:image/png;base64,iVBORw0KGgo='), undefined)).status, 200, 'بلا رأس Content-Type (جسمٌ متدفّق/بايتات) — مقبول');
  assert.equal((await put('k3', 'data:image/png;base64,' + 'A'.repeat(R.maxBytes), 'text/plain')).status, 413, 'أكبرُ من maxBytes ⇒ 413');
  assert.equal((await put('k4', 'iVBORw0KGgo=', 'text/plain', '?p=0&n=' + (R.parts.maxParts + 1))).status, 400, 'n فوق maxParts ⇒ 400 part');
  assert.equal((await put('k4', 'AAAA', 'text/plain', '?p=1&n=2')).status, 409, 'جزءٌ تالٍ بلا أوّل ⇒ 409');
});
