/* KIVO_264 · D-1 (شقُّ الواجهة) — التحديثُ الحيّ يتوقف عند 80 مفتاحاً (دليلُ التدقيق t1 مُكيَّفاً) + العقد C2 (more: 1).
   العيب: السحبُ يقتطع أولَ 80 مفتاحاً متغيّراً (وسقفُ /api/get 80) ثم يرفع المؤشّرَ BOOT.v إلى أحدث مراجعة — فما بعد الثمانين لا يصل التبويبَ
   المفتوح أبداً (لا تبلّغ عنه دورةٌ لاحقة). المطلوب: دفعاتٌ ≤ 80 والمؤشّرُ لا يتقدّم إلا بعد آخرها، وجوابُ /api/changes المبتور عند سقف الخادم
   (more: 1) يُتبَع فوراً من آخر مراجعةٍ وصلت حتى يكتمل — بسقفٍ لعدد الدورات. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, applySql, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { loadClient, sleep, until } from './k264_vm.mjs';

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
async function put(env, k, v) {
  await applySql(env.DB, ['DELETE FROM kv WHERE k = ' + q(k) + ';', 'INSERT INTO kv (k, seq, v) VALUES (' + q(k) + ', 0, ' + q(v) + ');',
    "INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);",
    'INSERT INTO revs (k, rev) VALUES (' + q(k) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;"].join('\n'));
}
const server = (env, k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k); return r.length ? r.map(x => x.v).join('') : null; };
// Keep 96 live KV resources: custody now has its own typed API and invalidation.
const RES = ['bassam_tasks_v1', 'bassam_irshad_v1', 'bassam_seized_v1', 'bassam_shift_options_v1', 'bassam_award_v1', 'bassam_options_v1', 'bassam_callsigns_v1', 'bassam_leave_kinds_v1'];

for (const mode of ['legacy', 'enforce']) test('[' + mode + '] D-1: 96 مفتاحاً تغيّرت عند زميل ⇒ كلُّها تصل التبويبَ المفتوح (لا تتوقف عند 80)', async () => {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const depts = Array.from({ length: 12 }, (_, i) => ({ id: 'dz' + i, name: 'TEST_ONLY إدارة ' + i }));
  assert.equal((await C.save(su.ck, { bassam_depts_v1: JSON.stringify(depts) })).j.ok, 1);
  const keys = []; for (const d of depts) for (const r of RES) keys.push('bsdept:' + d.id + ':' + r);
  for (const k of keys) await put(env, k, JSON.stringify({ test: 'TEST_ONLY', gen: 0 }));
  const b = await C.boot(su.ck); assert.ok(b.boot && b.boot.srv && b.boot.cf);
  const T = loadClient({ C, boot: b.boot, jar: { cookie: su.ck } });
  try {
    for (const k of keys) assert.equal(T.get(k), server(env, k));
    for (const k of keys) await put(env, k, JSON.stringify({ test: 'TEST_ONLY', gen: 1 }));
    const vNow = +env.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v;
    assert.ok(await until(() => keys.every(k => T.get(k) === server(env, k)), 5000), 'كلُّ المفاتيح الـ96 وصلت: الباقي ' + keys.filter(k => T.get(k) !== server(env, k)).length);
    assert.equal(T.W.__BS_BOOT.v, vNow, 'والمؤشّر على أحدث مراجعة');
    assert.ok(T.urls.filter(u => /\/api\/get\?/.test(u.url)).every(u => decodeURIComponent(u.url.split('keys=')[1] || '').split(',').length <= 80), 'كلُّ دفعةٍ ≤ 80');
  } finally { T.dispose(); }
});

/* خادمٌ وهميٌّ بالعقد C2: /api/changes يُرجع 10 مفاتيح على الأكثر بترتيب المراجعة، more: 1 ومعه v = مراجعةُ آخر مفتاحٍ في الصفحة */
function c2Server(n, page = 10, always = false) {
  const S = { rev: 10, vals: {}, revs: {}, calls: [] };
  for (let i = 0; i < n; i++) { const k = 'bsdept:d1:bassam_k' + i + '_v1'; S.revs[k] = ++S.rev; S.vals[k] = JSON.stringify({ i, gen: 1 }); }
  S.C = { req: async (p) => {
    const J = (x) => new Response(JSON.stringify(x), { status: 200 });
    if (p.startsWith('/api/changes')) {
      const since = +(new URL('http://x' + p).searchParams.get('since') || 0); S.calls.push(since);
      if (always) return J({ v: since + 1, keys: [], more: 1 });
      const ch = Object.keys(S.revs).filter(k => S.revs[k] > since).sort((a, b) => S.revs[a] - S.revs[b]);
      if (ch.length > page) return J({ v: S.revs[ch[page - 1]], keys: ch.slice(0, page), more: 1 });
      return J({ v: S.rev, keys: ch });
    }
    if (p.startsWith('/api/get')) { const want = decodeURIComponent(new URL('http://x' + p).searchParams.get('keys') || '').split(',').filter(Boolean); const keys = {}; want.forEach(k => { if (k in S.vals) keys[k] = { v: S.vals[k], rev: S.revs[k] }; }); return J({ ok: 1, v: S.rev, keys }); }
    return J({ ok: 1 });
  } };
  return S;
}
test('D-1 (C2): جوابٌ مبتور (more: 1) يُتبَع فوراً من آخر مراجعةٍ وصلت حتى يكتمل — بلا انتظارٍ طويل في الصفحات التالية', async () => {
  const S = c2Server(35);
  const T = loadClient({ C: S.C, boot: { srv: 1, cf: 1, v: 10, uid: 'su', keys: {}, revs: {} } });
  try {
    assert.ok(await until(() => Object.keys(S.vals).every(k => T.get(k) === S.vals[k]), 4000), 'المفاتيحُ الـ35 كلُّها وصلت في دورةٍ واحدة');
    assert.deepEqual(S.calls.slice(0, 4), [10, 20, 30, 40], 'كلُّ صفحةٍ تبدأ من آخر مراجعةٍ وصلت');
    const ch = T.urls.filter(u => /\/api\/changes/.test(u.url));
    assert.ok(/wait=1/.test(ch[0].url) && ch.slice(1, 4).every(u => !/wait=1/.test(u.url)), 'الصفحاتُ التالية فوراً بلا wait');
    assert.equal(T.W.__BS_BOOT.v, 45);
  } finally { T.dispose(); }
});
test('D-1 (C2): خادمٌ يكرّر more بلا نهاية لا يُدخل الواجهةَ في حلقة — سقفُ 50 صفحة للدورة', async () => {
  const S = c2Server(0, 10, true);
  const T = loadClient({ C: S.C, boot: { srv: 1, cf: 1, v: 10, uid: 'su', keys: {}, revs: {} } });
  try {
    await sleep(1700);
    const n = S.calls.length;
    assert.ok(n >= 2 && n <= 50, 'دورةٌ واحدة لا تتجاوز 50 طلباً: ' + n);
  } finally { T.dispose(); }
});
