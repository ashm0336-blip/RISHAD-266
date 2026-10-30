/* RM-6 · SOT-142 (سجلٌّ منظَّم) · SOT-144 (معرّفُ الارتباط) · AUD-021 (سياسةُ الأخطاء) — KIVO_250:
   كلُّ ردٍّ يحمل X-Kivo-Rid فريداً · أخطاءُ الخادم (500) تُسجَّل سطرَ JSON واحداً بالمخطّط v1 مع rid نفسِه في الجسم والرأس · الرفضُ الأمني (403/413)
   يُسجَّل تحذيراً · ترحيلُ المخطّط يُسجَّل إعلاماً · الاستثناءُ المبتلَع عمداً يُسجَّل تحذيراً بوسمه (لا catch فارغ) · لا بياناتٍ شخصية في السجل. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTestEnv, makeEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client, WORKER, ROOT, since } from './harness.mjs';
const S150 = since(150);
function capture() {
  const rows = [], orig = { log: console.log, warn: console.warn, error: console.error };
  for (const k of Object.keys(orig)) console[k] = (...a) => { const s = a.length === 1 && typeof a[0] === 'string' ? a[0] : null; if (s && s.startsWith('{"v":')) rows.push(Object.assign({ _lvlFn: k }, JSON.parse(s))); else orig[k](...a); };
  return { rows, stop() { for (const k of Object.keys(orig)) console[k] = orig[k]; } };
}
const SCHEMA = ['v', 't', 'lvl', 'ev', 'ver'];
test('لا catch فارغ في العامل · swallow/logEv/ridNew موجودة · المخطّط v1', S150, () => {
  const w = fs.readFileSync(WORKER, 'utf8');
  assert.equal((w.match(/catch \(\w*\) \{\s*\}/g) || []).length, 0, 'لا catch فارغ');
  assert.ok(/function logEv\(lvl, ev, f\)/.test(w) && /function swallow\(op, e, rid\)/.test(w) && /function ridNew\(\)/.test(w) && /var LOG_SCHEMA = 1;/.test(w));
  assert.ok((w.match(/swallow\('[a-zA-Z0-9-]+', \w+(?:, (?:env(?: && env)?\.__rid|rid))?\)/g) || []).length >= 31, '31 موضعاً موسوماً على الأقل');
});
test('كلُّ ردٍّ يحمل X-Kivo-Rid (12 خانة hex) فريداً — API وصفحة', S150, async () => {
  const env = makeTestEnv(); const C = client(env);
  const a = await C.api('/api/brand'), b = await C.api('/api/ping'), h = await C.req('/', { headers: { accept: 'text/html' } });
  for (const r of [a.h, b.h, h.headers]) assert.match(r.get('X-Kivo-Rid') || '', /^[0-9a-f]{12}$/);
  assert.notEqual(a.h.get('X-Kivo-Rid'), b.h.get('X-Kivo-Rid'));
});
test('قاعدةٌ جديدة: سطرُ schema-migrate (info) بأسماء الترحيلات · بالمخطّط v1', S150, async () => {
  const cap = capture(); try { const env = makeEnv(); const C = client(env); await C.api('/api/brand'); } finally { cap.stop(); }
  const m = cap.rows.filter(r => r.ev === 'schema-migrate'); assert.equal(m.length, 1); assert.equal(m[0].lvl, 'info'); assert.equal(m[0]._lvlFn, 'log');
  const migrations = fs.readdirSync(path.join(ROOT, 'migrations')).filter(f => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => f.slice(0, -4));
  assert.deepEqual(SCHEMA.filter(k => !(k in m[0])), []); assert.equal(m[0].v, 1);
  assert.deepEqual(m[0].ran.split(','), migrations, 'السجل يسمّي كل ملفات الترحيل بالترتيب دون حذف أو تكرار');
  assert.equal(m[0].applied, migrations.length); assert.equal(m[0].fresh, 1); assert.match(m[0].t, /^\d{4}-\d\d-\d\dT/);
});
test('عطلُ D1 في مسار API ⇒ 500 worker-error: rid في الجسم = الرأس = سطرِ السجل (error) مع المسار والطريقة والخطأ · بلا un/ip', S150, async () => {
  const env = makeTestEnv(); const C = client(env); await C.api('/api/brand');
  env.DB.failIf = (sql) => /FROM kv WHERE k (= \?1|IN \()/.test(sql);   /* KIVO_255 (إفصاح — عُدّة): قراءةُ الحسابات صارت في دفعة المقدّمة (k IN) ثم استعلامَها المباشر عند تعذّرها — العطلُ يصيب الصورتين */
  const cap = capture(); let r; try { r = await C.api('/api/ping'); } finally { cap.stop(); }
  assert.equal(r.status, 500); assert.equal(r.j.err, 'worker-error'); assert.match(r.j.rid, /^[0-9a-f]{12}$/); assert.equal(r.h.get('X-Kivo-Rid'), r.j.rid, 'الرأس = الجسم');
  const e = cap.rows.filter(x => x.ev === 'worker-error'); assert.equal(e.length, 1); assert.equal(e[0].lvl, 'error'); assert.equal(e[0]._lvlFn, 'error');
  assert.equal(e[0].rid, r.j.rid); assert.equal(e[0].p, '/api/ping'); assert.equal(e[0].m, 'GET'); assert.equal(e[0].st, 500); assert.match(e[0].err, /injected failure/);
  assert.ok(!('un' in e[0]) && !('ip' in e[0]) && !('uid' in e[0]), 'لا بياناتٍ شخصية');
});
test('رفضُ المصدر (403) وتجاوزُ الحجم (413): تحذيرٌ موسوم مع rid · الجسمُ يحمل rid', S150, async () => {
  const env = makeTestEnv(); const C = client(env); await C.api('/api/brand');
  const cap = capture(); let a, b; try {
    a = await C.api('/api/login', { method: 'POST', body: { u: 'x', p: 'y' }, headers: { origin: 'http://evil' } });
    b = await C.api('/api/save', { method: 'POST', body: '{}', headers: { 'Content-Length': String(9 * 1024 * 1024) } });
  } finally { cap.stop(); }
  assert.equal(a.status, 403); assert.equal(a.j.rid, a.h.get('X-Kivo-Rid')); const o = cap.rows.find(x => x.ev === 'origin-reject'); assert.ok(o && o.lvl === 'warn' && o.rid === a.j.rid && o.st === 403 && o.p === '/api/login');
  assert.equal(b.status, 413); const t = cap.rows.find(x => x.ev === 'body-too-large'); assert.ok(t && t.lvl === 'warn' && t.rid === b.j.rid && t.cl === 9 * 1024 * 1024);
});
test('الاستثناءُ المبتلَع عمداً (سجلُّ الأمن يفشل أثناء الخروج) ⇒ تحذيرُ swallowed بوسمه ولا يُسقط الطلب', S150, async () => {
  const env = makeTestEnv(); const C = client(env); const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  env.DB.failIf = (sql) => /INSERT INTO sec/.test(sql);
  const cap = capture(); let r; try { r = await C.api('/api/logout', { method: 'POST', cookie: su.ck, body: {} }); } finally { cap.stop(); env.DB.failIf = null; }
  assert.equal(r.status, 200, 'الخروجُ ينجح رغم فشل سجل الأمن: ' + JSON.stringify(r.j).slice(0, 80));
  const s = cap.rows.filter(x => x.ev === 'swallowed'); assert.ok(s.length >= 1, 'سطرُ swallowed'); assert.ok(s.some(x => x.op === 'seclog' && x.lvl === 'warn' && /injected/.test(x.err) && x.rid === r.h.get('X-Kivo-Rid')), JSON.stringify(s));
  assert.ok(cap.rows.every(x => !JSON.stringify(x).includes('admin')), 'اسمُ المستخدم لا يظهر في السجل');
});
