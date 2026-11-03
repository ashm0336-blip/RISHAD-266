/* KIVO_264 · عقودُ الخادم التي يبني عليها العميل (التدقيقُ المعماري D-1 · D-2 · D-3):
   (C1) /api/save يقبل uid اختيارياً: إن حضر وخالف صاحبَ الجلسة ⇒ 409 {ok:0, err:'session-changed'} قبل أيّ قراءةٍ أو كتابة · غيابُه (أو null) = السلوكُ القديم
   (C2) /api/changes: المفاتيحُ مرتّبةٌ بالمراجعة وتُقطع عند CHANGES_MAX على حدود مراجعةٍ كاملة ⇒ more:1 و v = آخرُ مراجعةٍ مضمَّنة (مؤشّرٌ آمن للطلب التالي)؛
        بلا قطع: الشكلُ كما كان (v = المراجعةُ الحالية) · /api/get: أكثرُ من 80 مفتاحاً ⇒ يُقطع كما كان + more:1
   (C3) GET / عند غياب ربط D1 أو تعذّر مسار القاعدة ⇒ 503 بصفحةٍ عربيةٍ قصيرة — لا غلافَ ولا __BS_BOOT (كان الغلافُ يُقدَّم بلا حقن فيعمل
        النظامُ المحلي القديم: قاعدةُ المتصفح وحسابُ admin/admin) — برؤوس الغلاف نفسِها (CSP · no-store) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, worker, ROOT, WORKER } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
import { inspectOperationalFixture } from './operational_legacy_seed_fx.mjs';
/* العاملُ المختبَر قبل KIVO_264 (حزمةٌ أقدم عبر KIVO_WORKER) ⇒ تخطٍّ معلن — KIVO_K264_STRICT=1 يفرض التشغيل */
const K264 = fs.readFileSync(WORKER, 'utf8').includes("'session-changed'") || process.env.KIVO_K264_STRICT ? {} : { skip: 'العاملُ المختبَر قبل KIVO_264' };
const TODAY = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); return o; })();
function seedSql() {
  const o = TODAY;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264c_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world(mode) {
  const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  return { env, C, su };
}
const truth = (env, k) => { if (/:bassam_options_v1$/.test(k)) { const o = inspectOperationalFixture(env, k); return o == null ? null : JSON.stringify(o); } const r = env.DB.q('SELECT group_concat(v, \'\') AS v FROM (SELECT v FROM kv WHERE k = ?1 ORDER BY seq)', k)[0]; return r ? r.v : null; };
const revOf = (env, k) => { const r = env.DB.q('SELECT rev FROM revs WHERE k = ?1', k)[0]; return r ? r.rev : 0; };

/* ══ C1 ══ */
for (const mode of ['legacy', 'enforce']) test('(C1) [' + mode + '] uid يخالف صاحبَ الجلسة ⇒ 409 session-changed بلا أيّ كتابة · المطابقُ والغائبُ وnull كما كانت', K264, async () => {
  const { env, C, su } = await world(mode);
  const K = 'bsdept:tst_d1:bassam_options_v1';
  const permissions = JSON.parse(truth(env, 'bassam_perms_v1'));
  permissions.emps.tst_d1.tst_e_emp1['emps/data'] = ['view', 'add', 'edit', 'del'];
  env.DB.db.prepare("UPDATE kv SET v=? WHERE k='bassam_perms_v1' AND seq=0").run(JSON.stringify(permissions));
  const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok, 'tst_emp1');
  /* schema 10: bassam_options_v1 is a typed Operations resource (read via /api/operations/read, saved with the operations envelope). */
  const opRead = async () => { const r = await C.api('/api/operations/read?' + new URLSearchParams({ uid: 'tst_emp1', keys: K }), { cookie: emp.ck }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200)); return r.j; };
  const it = await opRead(); assert.ok(it.resources && Object.hasOwn(it.base, K), 'يقرأ مفتاحَ نطاقه');
  assert.ok(Object.hasOwn(it.resources, K) && it.resources[K] != null && !(it.absent || []).includes(K), 'يقرأ قيمةً غيرَ فارغة لمفتاح نطاقه ' + JSON.stringify(it).slice(0, 200));
  const cur = it.resources[K];
  let seq = 0; const env1 = (r, extra) => Object.assign({ requestId: 'TEST_ONLY_k264c_' + (++seq) + '_' + Date.now(), epoch: r.epoch, del: [], base: { [K]: r.base[K] } }, extra || {});
  const rec = (n) => 'TEST_ONLY k264c' + n;
  const body = (n, extra) => env1(it, Object.assign({ set: { [K]: JSON.stringify({ ...cur, type: (cur.type || []).concat(rec(n)) }) } }, extra || {}));
  const v0 = truth(env, K), r0 = revOf(env, K), aud0 = env.DB.q('SELECT COUNT(*) AS n FROM aud')[0].n, sec0 = env.DB.q('SELECT COUNT(*) AS n FROM sec')[0].n;
  /* جلسةُ هذا المتصفح الآن tst_emp1 والطابورُ بُني لحسابٍ آخر (tst_sup1 · ثم مدير النظام) */
  for (const other of ['tst_sup1', 'su', '']) {
    const x = await C.api('/api/save', { method: 'POST', cookie: emp.ck, body: body(1, { uid: other }) });
    assert.equal(x.status, 409, 'uid=' + JSON.stringify(other) + ' ⇒ 409: ' + JSON.stringify(x.j).slice(0, 200));
    assert.deepEqual({ ok: x.j.ok, err: x.j.err }, { ok: 0, err: 'session-changed' });
  }
  assert.equal(truth(env, K), v0, 'لم يُكتب شيء'); assert.equal(revOf(env, K), r0, 'ولا رقمُ مراجعة');
  assert.equal(env.DB.q('SELECT COUNT(*) AS n FROM aud')[0].n, aud0, 'ولا سطرَ تدقيق');
  assert.equal(env.DB.q('SELECT COUNT(*) AS n FROM sec')[0].n, sec0, 'ولا سطرَ أمنٍ (لا «رفض» يُسجَّل لطابورٍ بُني لجلسةٍ أخرى)');
  /* النوعُ الخاطئ ⇒ 400 bad-body (المخطّط) */
  const bt = await C.api('/api/save', { method: 'POST', cookie: emp.ck, body: body(1, { uid: 7 }) });
  assert.equal(bt.status, 400); assert.equal(bt.j.err, 'bad-body'); assert.equal(bt.j.at, 'uid');
  /* المطابق ⇒ يُكتب */
  const ok1 = await C.api('/api/save', { method: 'POST', cookie: emp.ck, body: body(1, { uid: 'tst_emp1' }) });
  assert.equal(ok1.status, 200, JSON.stringify(ok1.j).slice(0, 300)); assert.equal(ok1.j.ok, 1); assert.ok(!(ok1.j.denied || {})[K] && !(ok1.j.conflicts || {})[K], 'قُبل');
  assert.ok(truth(env, K).includes('k264c1'), 'كُتب');
  /* الغائبُ وnull ⇒ السلوكُ القديم (لا عقدَ جديدٌ على عميلٍ قديم) */
  const it2 = await opRead(); const cur2 = it2.resources[K];
  const b2 = env1(it2, { set: { [K]: JSON.stringify({ ...cur2, type: cur2.type.concat(rec(2)) }) } });
  const ok2 = await C.api('/api/save', { method: 'POST', cookie: emp.ck, body: b2 }); assert.equal(ok2.status, 200); assert.ok(truth(env, K).includes('k264c2'), 'بلا uid يُكتب كما كان');
  const it3 = await opRead(); const cur3 = it3.resources[K];
  const ok3 = await C.api('/api/save', { method: 'POST', cookie: emp.ck, body: env1(it3, { set: { [K]: JSON.stringify({ ...cur3, type: cur3.type.concat(rec(3)) }) }, uid: null }) });
  assert.equal(ok3.status, 200); assert.ok(truth(env, K).includes('k264c3'), 'uid:null = غائب');
  /* مديرُ النظام بجلسته: uid مطابق ⇒ 200 · مخالف ⇒ 409 */
  /* Use a live KV resource; notification configuration now has its own relational API. */
  const sv = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: { bassam_platform_v1: '{"k264":1}' }, del: [], base: { bassam_platform_v1: revOf(env, 'bassam_platform_v1') }, uid: 'tst_emp1' } });
  assert.equal(sv.status, 409); assert.equal(truth(env, 'bassam_platform_v1') === '{"k264":1}', false);
  const sv2 = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: { bassam_platform_v1: '{"k264":1}' }, del: [], base: { bassam_platform_v1: revOf(env, 'bassam_platform_v1') }, uid: 'su' } });
  assert.equal(sv2.status, 200); assert.equal(truth(env, 'bassam_platform_v1'), '{"k264":1}');
});

/* ══ C2 ══ */
function bumpRevs(env, keys, sameRev) {
  /* مفاتيحُ متغيّرة مباشرةً في القاعدة (أسرعُ من 200 حفظة): كلُّ مفتاحٍ بمراجعةٍ مستقلة — أو كلُّها بمراجعةٍ واحدة (حفظةٌ واحدة كبيرة كالاستعادة) */
  let rv = +(env.DB.q("SELECT v FROM meta WHERE k = 'rev'")[0] || { v: 0 }).v || 0;
  if (sameRev) rv++;
  for (const k of keys) { if (!sameRev) rv++; env.DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').run(k, rv); }
  env.DB.db.prepare("INSERT INTO meta (k, v) VALUES ('rev', ?1) ON CONFLICT(k) DO UPDATE SET v = ?1").run(String(rv));
  return rv;
}
for (const mode of ['legacy', 'enforce']) test('(C2) [' + mode + '] /api/changes يُقطع عند الحدّ على حدود المراجعة ⇒ more:1 ومؤشّرٌ آمن · الصفحاتُ تغطّي كلَّ شيء بلا تكرار', K264, async () => {
  const { env, C, su } = await world(mode);
  const v0 = +(env.DB.q("SELECT v FROM meta WHERE k = 'rev'")[0]).v;
  /* صغير: الشكلُ القديم بلا more */
  const s0 = await C.api('/api/changes?since=' + (v0 - 1), { cookie: su.ck });
  assert.equal(s0.status, 200); assert.equal(s0.j.v, v0); assert.ok(!('more' in s0.j), 'بلا قطعٍ لا more');
  /* 200 مفتاحٍ بمراجعاتٍ مستقلة */
  const KS = Array.from({ length: 200 }, (_, i) => 'bsdept:tst_d1:bassam_k264_' + String(i).padStart(3, '0'));
  const vEnd = bumpRevs(env, KS, false);
  const seen = []; let since = v0, pages = 0, last = null;
  for (;;) {
    const r = await C.api('/api/changes?since=' + since, { cookie: su.ck }); assert.equal(r.status, 200);
    pages++; last = r.j;
    const mine = r.j.keys.filter(k => KS.includes(k));
    if (r.j.more) { assert.equal(r.j.more, 1); assert.ok(r.j.keys.length <= 80, 'الصفحةُ ≤ 80 (' + r.j.keys.length + ')'); assert.ok(r.j.v < vEnd, 'المؤشّرُ آخرُ مراجعةٍ مضمَّنة لا الحالية'); }
    else assert.equal(r.j.v, vEnd, 'الصفحةُ الأخيرة: المراجعةُ الحالية');
    /* المؤشّرُ آمن: كلُّ مفتاحٍ في الصفحة مراجعتُه ≤ v وكلُّ ما ≤ v ممّا بعد since في الصفحة */
    for (const k of r.j.keys) assert.ok(revOf(env, k) <= r.j.v && revOf(env, k) > since, k + ' ضمن (since, v]');
    seen.push(...mine);
    if (mode === 'enforce') assert.ok('am' in r.j, 'am باقٍ في بيئة الإنفاذ');
    if (!r.j.more) break;
    since = r.j.v; assert.ok(pages < 10, 'لا حلقة');
  }
  assert.equal(pages, 3, '200 مفتاحاً = 80 + 80 + 40'); assert.equal(new Set(seen).size, 200, 'كلُّ مفتاحٍ مرّةً واحدة'); assert.equal(seen.length, 200, 'بلا تكرار');
  /* مراجعةٌ واحدة لـ120 مفتاحاً (استعادة) لا تُشطر — تتجاوز الحدّ كاملةً · وما بعدها في صفحةٍ تالية */
  const BIG = Array.from({ length: 120 }, (_, i) => 'bsdept:tst_d1:bassam_k264b_' + i), LATE = ['bsdept:tst_d1:bassam_k264late'];
  const vBig0 = last.v; bumpRevs(env, BIG, true); const vLate = bumpRevs(env, LATE, false);
  const p1 = await C.api('/api/changes?since=' + vBig0, { cookie: su.ck });
  assert.equal(p1.j.keys.filter(k => BIG.includes(k)).length, 120, 'المجموعةُ كاملة'); assert.equal(p1.j.more, 1); assert.ok(!p1.j.keys.includes(LATE[0]));
  const p2 = await C.api('/api/changes?since=' + p1.j.v, { cookie: su.ck });
  assert.deepEqual(p2.j.keys, LATE); assert.ok(!('more' in p2.j)); assert.equal(p2.j.v, vLate);
  /* /api/get: الحدُّ 80 كما كان + more:1 عند القطع · وبلا قطعٍ لا more */
  const g1 = await C.api('/api/get?keys=' + encodeURIComponent(KS.slice(0, 100).join(',')), { cookie: su.ck });
  assert.equal(Object.keys(g1.j.keys).length, 80, 'الحدُّ 80 كما كان'); assert.equal(g1.j.more, 1);
  const g2 = await C.api('/api/get?keys=' + encodeURIComponent(KS.slice(0, 80).join(',')), { cookie: su.ck });
  assert.equal(Object.keys(g2.j.keys).length, 80); assert.ok(!('more' in g2.j));
});
test('(C2) الموظفُ: القطعُ على ما يراه وحده — مفاتيحُ غيره لا تُحسب ولا تظهر', K264, async () => {
  const { env, C } = await world('legacy');
  const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok);
  const v0 = +(env.DB.q("SELECT v FROM meta WHERE k = 'rev'")[0]).v;
  const hidden = Array.from({ length: 150 }, (_, i) => 'bsdept:tst_d2:bassam_irshad_v1_x' + i);   /* إدارةٌ أخرى — لا يراها */
  bumpRevs(env, hidden, false); bumpRevs(env, ['bsdept:tst_d1:bassam_irshad_v1'], false);
  const r = await C.api('/api/changes?since=' + v0, { cookie: emp.ck });
  assert.deepEqual(r.j.keys, ['bsdept:tst_d1:bassam_irshad_v1']); assert.ok(!('more' in r.j), 'المحجوبُ لا يُحسب في الحدّ');
});

/* ══ C3 ══ */
const assertDownPage = async (res, why) => {
  assert.equal(res.status, 503, why + ': 503');
  assert.ok((res.headers.get('content-type') || '').startsWith('text/html'), why + ': html');
  assert.equal(res.headers.get('cache-control'), 'no-store', why + ': no-store');
  assert.ok((res.headers.get('content-security-policy') || '').includes("default-src 'self'"), why + ': CSP');
  assert.ok(res.headers.get('retry-after'), why + ': Retry-After');
  assert.ok(res.headers.get('x-kivo-rid'), why + ': rid');
  const t = await res.text();
  assert.ok(!t.includes('__BS_BOOT') && !t.includes('BS_BOOT'), why + ': لا حقن');
  assert.ok(!/<script/i.test(t), why + ': لا سكربت (لا غلاف)');
  assert.ok(/dir="rtl"/.test(t) && /غير متاحة/.test(t), why + ': صفحةٌ عربية');
  return t;
};
test('(C3) بلا ربط D1: GET / و/index.html ⇒ 503 بلا غلاف · واجهةُ /api ⇒ 503 no-db كما كانت · الأصولُ الثابتة تُخدم', K264, async () => {
  const env = makeEnv(); delete env.DB; const w = await worker(env);
  await assertDownPage(await w.fetch(new Request('http://x/', { headers: { accept: 'text/html' } }), env), '/');
  await assertDownPage(await w.fetch(new Request('http://x/index.html'), env), '/index.html');
  const api = await w.fetch(new Request('http://x/api/ping'), env); assert.equal(api.status, 503); assert.equal((await api.json()).err, 'no-db');
  const fav = await w.fetch(new Request('http://x/manifest.webmanifest'), env); assert.equal(fav.status, 200, 'أصلٌ ثابت يُخدم بلا قاعدة');
});
for (const mode of ['legacy', 'enforce']) test('(C3) [' + mode + '] كلُّ عطلٍ في عبارات GET / ⇒ 503 بلا غلاف أو غلافٌ بحقنٍ سليم — لا غلافَ بلا __BS_BOOT أبداً', K264, async () => {
  const { env, C, su } = await world(mode);
  const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok);
  let down = 0, booted = 0;
  for (const [who, ck] of [['مدير النظام', su.ck], ['موظف', emp.ck], ['زائر', null]]) {
    env.DB.failIf = null; env.DB.log = [];
    const b0 = await C.boot(ck); assert.equal(b0.status, 200); assert.ok(b0.boot, who + ': خطُّ الأساس بحقن');
    const sqls = [...new Set(env.DB.log)]; assert.ok(sqls.length >= 1, who + ': عبارات');
    for (const q of sqls) {
      env.DB.failIf = (s) => s === q;
      const r = await C.req('/', { cookie: ck || undefined, headers: { accept: 'text/html' } });
      env.DB.failIf = null;
      if (r.status === 503) { await assertDownPage(r, who + ' ⇐ ' + q.slice(0, 60)); down++; continue; }
      const t = await r.text();
      assert.equal(r.status, 200, who + ' ⇐ ' + q.slice(0, 60) + ': ' + r.status);
      assert.ok(/window\.__BS_BOOT=\{/.test(t), who + ' ⇐ ' + q.slice(0, 60) + ': غلافٌ بلا حقن (fail-open)');
      booted++;
    }
  }
  assert.ok(down >= 3, 'أعطالٌ قاتلة ⇒ 503 (' + down + ' · غلافٌ سليم ' + booted + ')');
});
