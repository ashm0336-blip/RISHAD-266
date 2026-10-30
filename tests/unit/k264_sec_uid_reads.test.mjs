/* KIVO_264 · C1 للقراءة (اختياري — العقدُ نفسُه لـ/api/save): ?uid= على /api/changes و/api/get = هويةُ الجلسة التي بُني لها التبويب (BOOT.uid).
   إن حضر وخالف صاحبَ الجلسة ⇒ 409 {ok:0, err:'session-changed'} قبل أيّ قراءة — وقبل الانتظار الطويل (wait=1) — فلا يسحب تبويبٌ بُني لحسابٍ
   أسماءَ مفاتيحِ حسابٍ آخر دخل في المتصفح نفسِه ولا قيمَها. غيابُه = السلوكُ القديم حرفاً (عملاءُ ما قبل 264 لا يرسلونه). بلا جلسة: 401 أولاً كما كان. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, WORKER, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const FIX = fs.readFileSync(WORKER, 'utf8').includes('sessUidMismatch') || process.env.KIVO_K264_STRICT ? {} : { skip: 'العاملُ المختبَر قبل KIVO_264 (uid على مسارَي القراءة)' };
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264ur_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const K = 'bsdept:tst_d1:bassam_irshad_v1';

for (const mode of ['legacy', 'enforce']) test('(C1 · القراءة) [' + mode + '] ?uid= يخالف صاحبَ الجلسة ⇒ 409 session-changed على /api/changes و/api/get بلا قراءةٍ ولا انتظار · المطابقُ والغائبُ كما كانا', FIX, async () => {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok, 'tst_emp1');
  const v = +(env.DB.q("SELECT v FROM meta WHERE k = 'rev'")[0]).v;
  const base = await C.api('/api/changes?since=0', { cookie: emp.ck }); assert.equal(base.status, 200); assert.ok(base.j.keys.includes(K));
  for (const other of ['tst_sup1', 'su', '']) {
    const q = '&uid=' + encodeURIComponent(other);
    const c = await C.api('/api/changes?since=0' + q, { cookie: emp.ck });
    assert.equal(c.status, 409, 'changes uid=' + JSON.stringify(other)); assert.deepEqual(c.j, { ok: 0, err: 'session-changed' }, 'بلا أسماء مفاتيح');
    const g = await C.api('/api/get?keys=' + encodeURIComponent(K) + q, { cookie: emp.ck });
    assert.equal(g.status, 409, 'get uid=' + JSON.stringify(other)); assert.deepEqual(g.j, { ok: 0, err: 'session-changed' }, 'بلا قيم');
  }
  /* قبل الانتظار الطويل: since = المراجعةُ الحالية مع wait=1 كان سينتظر حتى 25 ث */
  const t0 = Date.now(); const w = await C.api('/api/changes?since=' + v + '&wait=1&uid=tst_sup1', { cookie: emp.ck });
  assert.equal(w.status, 409); assert.ok(Date.now() - t0 < 900, 'بلا انتظار (' + (Date.now() - t0) + ' ms)');
  /* المطابقُ = الغائب */
  const cm = await C.api('/api/changes?since=0&uid=tst_emp1', { cookie: emp.ck }); assert.equal(cm.status, 200); assert.deepEqual(cm.j, base.j);
  const g0 = await C.api('/api/get?keys=' + encodeURIComponent(K), { cookie: emp.ck }), gm = await C.api('/api/get?keys=' + encodeURIComponent(K) + '&uid=tst_emp1', { cookie: emp.ck });
  assert.equal(gm.status, 200); assert.ok(gm.j.keys[K] && gm.j.keys[K].v, 'المطابقُ يقرأ'); assert.deepEqual(gm.j, g0.j);
  const sm = await C.api('/api/get?keys=bassam_notif_cfg_v1&uid=su', { cookie: su.ck }); assert.equal(sm.status, 200, 'مديرُ النظام بهويته');
  /* بلا جلسة: 401 قبل العقد */
  assert.equal((await C.api('/api/changes?since=0&uid=tst_emp1')).status, 401); assert.equal((await C.api('/api/get?keys=' + K + '&uid=tst_emp1')).status, 401);
});
