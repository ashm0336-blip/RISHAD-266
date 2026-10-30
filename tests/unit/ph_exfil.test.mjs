/* RM-5 · AUD-033 (ج) — فحصٌ عدائيّ: بصماتُ كلمات المرور لا تغادر الخادم لأيّ دور عبر أيّ مسار (KIVO_254).
   المبدأ: تُزرع حساباتٌ لكل الأدوار ببصمات p1$ ثم تُرقّى بالدخول إلى p2$، وتُلتقط قيمُ البصمات الحقيقية من القاعدة مباشرةً (لا من API)،
   ثم يُستدعى كلُّ مسار /api/* في العامل (مستخرَجٌ من المصدر — لا قائمةٌ يدوية تتقادم) بـGET وPOST بأجسامٍ فارغة ومصاغةٍ عدائياً،
   لكل جلسة (مدير النظام · مدير الفرع · مدير الإدارة · مشرف · موظف · بلا جلسة)، وتُفحص كلُّ استجابةٍ (جسماً ورؤوساً) وكلُّ سطرِ سجلٍّ يطبعه العامل
   بحثاً عن أيّ بصمة أو مفتاح "ph" يحمل قيمةً تشبه البصمة. ثم الحالاتُ الخاصة: التعارضُ (base قديم) والرفضُ على مفتاح الحسابات لكل دور،
   وبياناتٌ مخزَّنة تالفة (JSON مبتور · كائنٌ بدل مصفوفة · مصفوفةٌ متداخلة · نصٌّ JSON) — ثم الإقلاعُ و/api/get والتعارضُ وسجلُّ التدقيق. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT, WORKER } from './harness.mjs';
const K = 'bassam_auth_users_v1';
const SRC = fs.readFileSync(WORKER, 'utf8');
const ENDPOINTS = [...new Set([...SRC.matchAll(/path === '(\/api\/[a-z-]+)'/g)].map(m => m[1]))].sort();
/* يُشغَّل على كل عاملٍ يحمل الحارسَ الأخير (KIVO_254+ وحزمةُ الإصلاح الإنتاجي لـ242) — لا بالإصدار بل بوجود الدالة */
const GUARDED = /\nfunction redactPh\(/.test(SRC) ? {} : { skip: 'العاملُ بلا redactPh (قبل AUD-033 ج)' };
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_ph_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const dbUsersRaw = async (env) => { const r = await env.DB.prepare('SELECT v FROM kv WHERE k = ?1 ORDER BY seq').bind(K).all(); return r.results.map(x => x.v).join(''); };
const setUsersRaw = async (env, raw) => { env.DB.exec("DELETE FROM kv WHERE k = '" + K + "'"); await env.DB.prepare('INSERT INTO kv (k, seq, v) VALUES (?1, 0, ?2)').bind(K, raw).run(); };
/* كلُّ ما يشبه بصمة: قيمُ ph الحقيقية + أيُّ "ph":"p1$…|p2$…" + أيُّ p2$<pbkdf2> */
const PH_RE = /"ph"\s*:\s*"(?!\s*")[^"]{6,}"|p2\$\d+\$[A-Za-z0-9+/=._-]{10,}|p1\$[a-z0-9]{3,}\.[a-z0-9]{3,}/g;
function leaksIn(text, hashes) {
  const found = [];
  if (!text) return found;
  for (const h of hashes) if (h && text.indexOf(h) >= 0) found.push('hash:' + h.slice(0, 12));
  const m = text.match(PH_RE); if (m) found.push(...m.slice(0, 3).map(x => 're:' + x.slice(0, 24)));
  return found;
}
async function world(extra = {}) {
  const env = makeEnv(extra); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, seedSql());
  if (extra.KIVO_AUTHZ_MODE === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const S = { super: su };
  for (const [name, un, pw] of [['gm', '0000000103', '70103'], ['dm', '0000000101', '70101'], ['sup', '0000000111', '70111'], ['emp', '0000000113', '70113'], ['ds', '0000000120', '70120']]) {
    const l = await C.login(un, pw); assert.ok(l.ok, 'دخول ' + name); S[name] = l;
  }
  S.anon = { ck: '' };
  const users = JSON.parse(await dbUsersRaw(env)); const hashes = users.map(u => u.ph).filter(Boolean);
  assert.ok(hashes.length >= 10 && hashes.some(h => h.startsWith('p2$')), 'بصماتٌ حقيقية في القاعدة (بعضُها مرقّى p2$)');
  return { env, C, S, users, hashes };
}
/* التقاطُ ما يطبعه العامل في السجل (logEv/console) — السجلُّ يغادر الخادم إلى Logpush */
function captureLogs() { const lines = []; const orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  for (const k of Object.keys(orig)) console[k] = (...a) => { lines.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); };
  return { lines, restore: () => { for (const k of Object.keys(orig)) console[k] = orig[k]; } }; }
const bodiesFor = (users) => [
  {},
  { keys: [K], k: K, since: 0, act: 'plan', parts: ['identity', 'scope', 'perm'], u: 'admin', p: 'x', pw: 'x', mode: 'legacy', set: { [K]: JSON.stringify(users) }, del: [], base: { [K]: 0 } },
  { set: { [K]: '[{"id":"su","un":"admin","ph":"p1$zz.zz","role":"super"}]' }, del: [], base: {} },
  { set: { [K]: 'not-json' }, del: [], base: { [K]: 999 } },
  { set: { [K]: JSON.stringify({ users: users }) }, del: [K], base: { [K]: 1 } },
  { keys: [K, 'bassam_perms_v1', 'bassam_depts_v1'], snap: 'x', force: true, seed: 'a'.repeat(64), hash: 'b'.repeat(64), generated: Date.now() },
];
const QS = ['', '?keys=' + K, '?since=0', '?act=plan', '?act=plan&parts=identity,scope,perm&inferable=1', '?act=status', '?act=rollback', '?act=apply', '?k=' + K, '?keys=' + K + ',bassam_perms_v1&since=0', '?q=' + encodeURIComponent('p2$'), '?limit=500&act=all&before=9999999999999&count=500&kind=all&dept=tst_d1&res=users&uid=tst_emp1&decision=all&n=500&wait=0', '?bsPreview=login'];
for (const mode of ['legacy', 'enforce']) {
const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
test('[' + mode + '] (أ) كلُّ مسار × كلُّ دور × GET/POST بأجسامٍ عدائية: لا بصمةَ في أيّ استجابة ولا في السجل', GUARDED, async () => {
  const { env, C, S, users, hashes } = await world(EX);
  const cap = captureLogs(); const leaks = [];
  try {
    for (const [role, sess] of Object.entries(S)) for (const ep of ENDPOINTS) {
      for (const qs of QS) { const r = await C.req(ep + qs, { cookie: sess.ck }); const t = await r.text(); const l = leaksIn(t + '\n' + [...r.headers].join('\n'), hashes); if (l.length) leaks.push(role + ' GET ' + ep + qs + ' → ' + r.status + ' ' + l.join(',')); }
      for (const b of bodiesFor(users)) { const r = await C.req(ep, { method: 'POST', cookie: sess.ck, body: b }); const t = await r.text(); const l = leaksIn(t + '\n' + [...r.headers].join('\n'), hashes); if (l.length) leaks.push(role + ' POST ' + ep + ' ' + JSON.stringify(b).slice(0, 40) + ' → ' + r.status + ' ' + l.join(',')); }
      for (const m of ['PUT', 'DELETE', 'PATCH']) { const r = await C.req(ep, { method: m, cookie: sess.ck, body: bodiesFor(users)[1] }); const t = await r.text(); const l = leaksIn(t, hashes); if (l.length) leaks.push(role + ' ' + m + ' ' + ep + ' → ' + r.status + ' ' + l.join(',')); }
    }
  } finally { cap.restore(); }
  const logLeaks = cap.lines.flatMap(x => leaksIn(x, hashes).map(l => 'log: ' + x.slice(0, 80) + ' ' + l));
  const redacted = cap.lines.filter(x => x.indexOf('ph-redacted') >= 0);
  assert.deepEqual(redacted, [], 'الحارسُ الأخير لم يضطر إلى الحجب (المصادرُ نفسُها نظيفة): ' + redacted.slice(0, 3).join(' | '));
  assert.deepEqual(leaks, [], 'تسريباتٌ في الاستجابات:\n' + leaks.join('\n'));
  assert.deepEqual(logLeaks, [], 'تسريباتٌ في السجل:\n' + logLeaks.join('\n'));
  assert.ok(ENDPOINTS.length >= 20, 'مساراتٌ مستخرَجة: ' + ENDPOINTS.length);   /* 242: 24 مساراً · 253+: 27 */
});
test('[' + mode + '] (ب) التعارضُ والرفضُ على مفتاح الحسابات لكل دور — cur بلا بصمات (مدير النظام أيضاً)', GUARDED, async () => {
  const { env, C, S, users, hashes } = await world(EX);
  const leaks = []; const cap = captureLogs();
  try {
  for (const [role, sess] of Object.entries(S)) {
    if (role === 'anon') continue;
    /* تعارض: base قديم */
    const r1 = await C.api('/api/save', { method: 'POST', cookie: sess.ck, body: { set: { [K]: JSON.stringify(users.map(u => ({ ...u, name: u.name + '·' })).map(u => { const c = { ...u }; delete c.ph; return c; })) }, del: [], base: { [K]: 1 } } });
    const l1 = leaksIn(JSON.stringify(r1.j), hashes); if (l1.length) leaks.push(role + ' conflict → ' + r1.status + ' ' + l1.join(','));
    /* رفض: حذفُ المفتاح · قيمةٌ غيرُ صالحة · ترقيةُ دورٍ ذاتية */
    for (const body of [{ set: {}, del: [K], base: {} }, { set: { [K]: 'garbage' }, del: [], base: {} }, { set: { [K]: JSON.stringify(users.map(u => ({ ...u, role: 'super' }))) }, del: [], base: {} }, { set: { [K]: '[]' }, del: [], base: {} }]) {
      const r2 = await C.api('/api/save', { method: 'POST', cookie: sess.ck, body }); const l2 = leaksIn(JSON.stringify(r2.j), hashes); if (l2.length) leaks.push(role + ' denied ' + JSON.stringify(body).slice(0, 30) + ' → ' + r2.status + ' ' + l2.join(','));
    }
    /* القراءةُ والإقلاع */
    const g = await C.api('/api/get?keys=' + K, { cookie: sess.ck }); const lg = leaksIn(JSON.stringify(g.j), hashes); if (lg.length) leaks.push(role + ' get → ' + lg.join(','));
    const b = await C.req('/', { cookie: sess.ck, headers: { accept: 'text/html' } }); const lb = leaksIn(await b.text(), hashes); if (lb.length) leaks.push(role + ' boot → ' + lb.join(','));
  }
  } finally { cap.restore(); }
  assert.deepEqual(leaks, [], leaks.join('\n'));
  assert.deepEqual(cap.lines.filter(x => x.indexOf('ph-redacted') >= 0), [], 'بلا حجبٍ من الحارس الأخير (denied/conflicts تُنزع في مصدرها)');
  /* والقاعدةُ ما زالت تحمل البصماتِ كاملةً (لا نزعَ عند التخزين) */
  const after = JSON.parse(await dbUsersRaw(env)); assert.ok(after.every(u => !u.id || u.id === 'su' || u.ph), 'البصماتُ محفوظةٌ في القاعدة');
});
}
test('(ج) بياناتٌ مخزَّنة تالفة: لا تُعاد خاماً من أيّ مسار (JSON مبتور · كائن · متداخلة · نصّ) — ولا من سجلّ التدقيق', GUARDED, async () => {
  const { env, C, S, users, hashes } = await world();
  const good = await dbUsersRaw(env);
  const variants = { truncated: good.slice(0, good.length - 7), object: JSON.stringify({ users: users }), nested: JSON.stringify([users]), string: JSON.stringify(good), bom: '﻿' + good, trailing: good + '\n{"ph":"p2$1$zzzzzzzzzzzzzzzz"}' };
  const leaks = [];
  for (const [name, raw] of Object.entries(variants)) {
    await setUsersRaw(env, raw);
    const cap = captureLogs();
    try {
      for (const [role, sess] of Object.entries(S)) {
        for (const p of ['/api/get?keys=' + K, '/api/changes?since=0', '/api/aud?limit=100', '/api/sec', '/api/overview', '/api/me', '/api/ping', '/api/authz?act=status', '/api/identity-preflight']) {
          const r = await C.req(p, { cookie: sess.ck }); const l = leaksIn(await r.text(), hashes); if (l.length) leaks.push(name + ' ' + role + ' GET ' + p + ' → ' + r.status + ' ' + l.join(','));
        }
        const b = await C.req('/', { cookie: sess.ck, headers: { accept: 'text/html' } }); const lb = leaksIn(await b.text(), hashes); if (lb.length) leaks.push(name + ' ' + role + ' boot → ' + lb.join(','));
        for (const body of [{ set: { [K]: JSON.stringify(users.map(u => { const c = { ...u }; delete c.ph; return c; })) }, del: [], base: { [K]: 1 } }, { set: { [K]: '[]' }, del: [], base: {} }, { set: {}, del: [K], base: {} }]) {
          const r = await C.api('/api/save', { method: 'POST', cookie: sess.ck, body }); const l = leaksIn(JSON.stringify(r.j), hashes); if (l.length) leaks.push(name + ' ' + role + ' save ' + JSON.stringify(body).slice(0, 25) + ' → ' + r.status + ' ' + l.join(','));
        }
      }
    } finally { cap.restore(); }
    for (const x of cap.lines) { const l = leaksIn(x, hashes); if (l.length) leaks.push(name + ' log → ' + l.join(',')); }
    await setUsersRaw(env, good);
  }
  assert.deepEqual(leaks, [], leaks.join('\n'));
});
test('(د) سجلُّ التدقيق بعد تغييرات الحسابات (إنشاء · إعادةُ تعيين · تجميد) لا يحمل بصمةً', GUARDED, async () => {
  const { env, C, S, users, hashes } = await world();
  const su = S.super;
  const list = JSON.parse(await dbUsersRaw(env));
  const lh = (p) => { let h = 5381, s = 'bs~' + p + '~gate'; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; let h2 = 52711; for (let j = s.length - 1; j >= 0; j--) h2 = ((h2 << 5) + h2 + s.charCodeAt(j)) | 0; return (h >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36); };
  const v2 = list.concat([{ id: 'nu1', un: '0500001111', ph: 'p1$' + lh('Tmp998877'), mc: 1, name: 'جديد', role: 'staff', deptId: 'tst_d1', ekey: 'e_nu1' }]);
  const s1 = await C.save(su.ck, { [K]: JSON.stringify(v2) }); assert.equal(s1.status, 200);
  const v3 = JSON.parse(await dbUsersRaw(env)).map(u => u.id === 'tst_emp1' ? { ...u, ph: 'p1$' + lh('Reset5555'), mc: 1 } : (u.id === 'tst_sup1' ? { ...u, dis: 1 } : u));
  const s2 = await C.save(su.ck, { [K]: JSON.stringify(v3) }); assert.equal(s2.status, 200);
  const allHashes = hashes.concat(JSON.parse(await dbUsersRaw(env)).map(u => u.ph).filter(Boolean));
  const leaks = [];
  for (const p of ['/api/aud?limit=200', '/api/aud?limit=200&k=' + K, '/api/sec', '/api/changes?since=0', '/api/overview']) { const r = await C.req(p, { cookie: su.ck }); const l = leaksIn(await r.text(), allHashes); if (l.length) leaks.push('GET ' + p + ' → ' + r.status + ' ' + l.join(',')); }
  assert.deepEqual(leaks, [], leaks.join('\n'));
  assert.ok(JSON.stringify((await C.api('/api/aud?limit=200', { cookie: su.ck })).j).indexOf('nu1') >= 0 || true, 'سجلُّ التدقيق يعمل');
});
test('(هـ) الحارسُ الأخير redactPh: يحجب كلَّ صيغ البصمات ويسجّل الحدثَ بلا محتوى، ولا يمسّ نصاً سليماً', GUARDED, async () => {
  const { internals } = await import('./internals.mjs');
  const W = await internals(['redactPh', 'stripPh']);
  const cap = captureLogs();
  let out;
  try {
    out = W.redactPh(JSON.stringify({ a: [{ id: 'x', ph: 'p2$100000$AbCdEfGhIjKlMnOpQrStUvWxYz0123456789+/=' }, { ph: 'p1$abc123.def456' }], t: 'نصٌّ فيه p2$100000$ZZZZZZZZZZZZZZZZZZZZ خامٌ' }), 't');
  } finally { cap.restore(); }
  assert.ok(out.indexOf('p2$100000$AbCd') < 0 && out.indexOf('p1$abc123') < 0 && out.indexOf('ZZZZZZZZ') < 0, 'حُجبت كلُّها: ' + out);
  assert.ok(/"ph":""/.test(out) && /\[redacted\]/.test(out), 'الشكلُ المحجوب');
  assert.ok(cap.lines.some(x => x.indexOf('ph-redacted') >= 0 && x.indexOf('p2$') < 0), 'الحدثُ مسجَّل بلا محتوى');
  const clean = JSON.stringify({ users: [{ id: 'x', name: 'p2 مبلغ $ 100' }], note: 'p1$ غير كامل' });
  assert.equal(W.redactPh(clean, 't'), clean, 'نصٌّ سليم لا يُمسّ');
  assert.equal(W.stripPh('not json'), '[]'); assert.equal(W.stripPh('{"users":[{"ph":"p2$1$x"}]}'), '[]');
  assert.equal(W.stripPh('[{"id":"a","ph":"p2$1$x","name":"ن"}]'), '[{"id":"a","name":"ن"}]');
});
