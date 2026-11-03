/* RM-5 · AUD-026 / SOT-127 — عقودُ الاستجابة (الشكلُ والأنواع) لمسارات الخادم على العامل الحقيقي: كلُّ مسارٍ يعيد الحقولَ الموثَّقة في docs/api.md
   بأنواعها (لا أكثرَ من المسموح للزائر) · الأخطاءُ الموحَّدة {ok:0, err} · 404 للمجهول · JSON دائماً بـContent-Type صحيح · لا بصماتٍ ولا رموزَ جلسة في أي رد. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client } from './harness.mjs';
const T = (v) => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
function shape(j, spec, name) {
  const bad = [];
  for (const [k, t] of Object.entries(spec)) { const ts = t.split('|'); if (!(k in j)) bad.push(name + ': غاب ' + k); else if (!ts.includes(T(j[k]))) bad.push(name + '.' + k + ' نوعه ' + T(j[k]) + ' لا ' + t); }
  return bad;
}
const SPEC = {
  '/api/brand': { ok: 'number', brand: 'object', ver: 'string', rk: 'number' },
  '/api/ping': { ok: 'number', cf: 'number', ver: 'string', fresh: 'number' },
  '/api/ping#super': { users: 'number', rev: 'number', sess: 'number', schema: 'number', schemaDb: 'string' },
  '/api/whoami': { ok: 'number', uid: 'string' },
  '/api/me': { ok: 'number', now: 'number', sess: 'array', events: 'array', lastLogin: 'object|null', thisLogin: 'object|null' },
  '/api/get': { ok: 'number', v: 'number', keys: 'object' },
  '/api/changes': { v: 'number', keys: 'array' },
  '/api/save': { ok: 'number', v: 'number', revs: 'object', denied: 'object', conflicts: 'object', atomic: 'string' },
  '/api/aud': { ok: 'number', rows: 'array' },
  '/api/presence': { ok: 'number', now: 'number', active: 'number', list: 'array' },
  '/api/sec': { ok: 'number', rows: 'array' },
  '/api/guard': { ok: 'number', now: 'number', rows: 'array' },
  '/api/policy': { ok: 'number', policy: 'object' },
  '/api/overview': { ok: 'number', now: 'number', policy: 'object', failsToday: 'number', deniedToday: 'number', lockedNow: 'number', activeNow: 'number', sessions: 'number', lastLogin: 'object', fails: 'array' },
  '/api/recovery': { ok: 'number', key: 'string|null', used: 'object|null', backups: 'array', backupLastLogin: 'number' },
  '/api/permv2': { ok: 'number', version: 'string', docSha256: 'string', status: 'string' },
  /* RISHAD-266: /api/scope-dryrun أُزيل مع تقاعد سقف النطاق القديم */
  '/api/identity-rehearsal': { ok: 'number', worker: 'string', rehearsal: 'object' },
  '/api/identity-preflight': { ok: 'number', worker: 'string', preflight: 'object' },
};
test('أشكالُ الاستجابة لـ18 مساراً كما في docs/api.md (الحقولُ والأنواع) · الزائرُ لا يرى حقولَ مدير النظام في ping · get يعيد {v, rev} لكل مفتاح (المجهولُ v:null rev:0)', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  const bad = [];
  const get = async (p, o) => { const r = await C.api(p, o); assert.match(r.h.get('Content-Type') || '', /application\/json/, p + ' JSON'); return r.j; };
  bad.push(...shape(await get('/api/brand'), SPEC['/api/brand'], 'brand'));
  const pa = await get('/api/ping'); bad.push(...shape(pa, SPEC['/api/ping'], 'ping')); for (const k of Object.keys(SPEC['/api/ping#super'])) if (k in pa) bad.push('ping(anon) يحمل ' + k);
  bad.push(...shape(await get('/api/ping', { cookie: su.ck }), Object.assign({}, SPEC['/api/ping'], SPEC['/api/ping#super']), 'ping(super)'));
  for (const p of ['/api/whoami', '/api/me', '/api/aud', '/api/presence', '/api/sec', '/api/guard', '/api/policy', '/api/overview', '/api/recovery', '/api/permv2', '/api/identity-rehearsal', '/api/identity-preflight']) bad.push(...shape(await get(p, { cookie: su.ck }), SPEC[p], p));
  const g = await get('/api/get?keys=bassam_depts_v1,nope', { cookie: su.ck }); bad.push(...shape(g, SPEC['/api/get'], 'get'));
  if (!(g.keys.bassam_depts_v1 && typeof g.keys.bassam_depts_v1.v === 'string' && g.keys.bassam_depts_v1.rev >= 1)) bad.push('get: مفتاحٌ موجود {v: string, rev ≥ 1}');
  if (!(g.keys.nope && g.keys.nope.v === null && g.keys.nope.rev === 0)) bad.push('get: المفتاحُ المجهول {v:null, rev:0}');
  bad.push(...shape(await get('/api/changes?since=0', { cookie: su.ck }), SPEC['/api/changes'], 'changes'));
  const sv = (await C.save(su.ck, { 'bsdept:dR:bassam_last_export_v1': '{"a":1}' })).j; bad.push(...shape(sv, SPEC['/api/save'], 'save')); if (sv.revs['bsdept:dR:bassam_last_export_v1'] !== sv.v) bad.push('save: rev المفتاح = v العامة');
  const dn = (await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: { bassam_perms_v1: '{}' }, del: [], base: {} } })).j; bad.push(...shape(dn, SPEC['/api/save'], 'save(denied)'));
  const d = dn.denied.bassam_perms_v1; if (!(d && typeof d.why === 'string' && 'cur' in d && typeof d.rev === 'number')) bad.push('save: شكلُ المرفوض {why, cur, rev}: ' + JSON.stringify(d));
  assert.deepEqual(bad, []);
});
test('الأخطاءُ الموحَّدة: المجهول 404 {ok:0, err:"not-found"} · بلا جلسة 401 {ok:0, err:"session"} · طلبٌ غيرُ مفهوم 400 {ok:0, err} · فشلُ الدخول {ok:0, err} بلا تمييزٍ بين الحساب وكلمة المرور', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin');
  const a = await C.api('/api/nope', { cookie: su.ck }); assert.equal(a.status, 404); assert.deepEqual(a.j, { ok: 0, err: 'not-found' });
  const b = await C.api('/api/whoami'); assert.equal(b.status, 401); assert.deepEqual(b.j, { ok: 0, err: 'session' });
  const c = await C.req('/api/login', { method: 'POST', body: '{bad json', headers: { 'Content-Type': 'application/json', origin: 'http://x' } }); assert.equal(c.status, 400); const cj = await c.json(); assert.equal(cj.ok, 0); assert.equal(typeof cj.err, 'string');
  const d1 = (await C.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'zz' } })).j, d2 = (await C.api('/api/login', { method: 'POST', body: { u: 'nobody9', p: 'zz' } })).j;
  assert.equal(d1.ok, 0); assert.equal(d2.ok, 0); assert.equal(d1.err, d2.err, 'لا تعدادَ للحسابات من رسالة الخطأ');
});
test('لا بصماتٍ (ph) ولا رموزَ جلسة (tok) في أي ردّ لمدير النظام ولا للموظف — جدولُ الحسابات في get/boot/presence منزوعُ البصمات', async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin');
  const txt = [];
  for (const p of ['/api/get?keys=bassam_auth_users_v1', '/api/presence', '/api/me', '/api/sec', '/api/overview', '/api/aud']) txt.push(p + ' ' + JSON.stringify((await C.api(p, { cookie: su.ck })).j));
  const boot = await C.boot(su.ck); txt.push('boot ' + JSON.stringify(boot.boot));
  for (const s of txt) { assert.doesNotMatch(s, /"ph":"/, 'بصمة في ' + s.slice(0, 40)); assert.doesNotMatch(s, /"tok":"/, 'رمزُ جلسة في ' + s.slice(0, 40)); assert.doesNotMatch(s, /p1\$|pbkdf2\$|\$pbkdf2/i, 'تجزئة في ' + s.slice(0, 40)); }
});
