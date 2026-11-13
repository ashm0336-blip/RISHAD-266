/* V7-F · OWNER BLOCKER — «فشل النسخ الاحتياطي بعد استعادة فيها صورة مفقودة: مانع. النسخة تُنشأ وتتخطى الصورة المفقودة مع تحذير يسمّيها.»
   The real frontend backup callers (admin exportBackup · pwDlgGo · importBackup · fbkCommit) → the actual 360 image transport and 548 backup service
   → the canonical Worker/SQLite. No stub stands between the backup loop and the server's answer for an image.
   Before (68cfa6a): a record that mentions an image whose bytes are gone (restored as «images-missing», or swept) made every later backup throw
   «تعذّر قراءة صورة؛ لم تُنشأ نسخة جزئية» — the platform could not be backed up at all.
   Now: an image the server CONFIRMS missing (404) is skipped and NAMED — id, unit and record — in the confirmation message and in the file
   (imagesMissing); anything else (5xx · no connection · a refusal) still fails the whole backup; and the new file restores, reporting the same image. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { world, browser, fullExport, D1, OPTIONS, epoch, posts, copy, IDS } from './operations_backup_flow_fx.mjs';
import { until } from './k264_vm.mjs';

const HAVE = 'img_testonly_have', GONE = 'img_testonly_gone', BODY = 'data:image/png;base64,VEVTVF9PTkxZ';
const value = { type: [HAVE, GONE], work: ['TEST_ONLY v7f backup'] };
/* a unit record that mentions two images: one with its bytes, one whose bytes are gone (what a restore with «images-missing» leaves) */
async function seed(B) {
  await replaceOperationalFixture(B.env, OPTIONS, value);
  await B.DB.batch([...B.W.kvPutStmts(B.env, 'imgs', HAVE, BODY),
    B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,?2,?3,?4,?5,?6)').bind(HAVE, 'bound', OPTIONS, IDS.super, D1, 1),
    B.DB.prepare('INSERT INTO imgref(img,k) VALUES(?1,?2)').bind(HAVE, OPTIONS), B.DB.prepare('INSERT INTO imgref(img,k) VALUES(?1,?2)').bind(GONE, OPTIONS)]);
}
const imgGets = (C) => C.requests.filter((r) => r.method === 'GET' && r.url.startsWith('/api/img/'));
async function exportOutcome(C) {
  C.property('modules/admin/logic.js', 'exportBackup')();
  assert.ok(await until(() => C.page._encPend || /تعذّر/.test(C.page.state.backupMsg || ''), 10000, 10), JSON.stringify(C.page.state));
  return C.page._encPend ? JSON.parse(C.page._encPend.json) : null;
}

test('a backup is CREATED when a record mentions an image the server confirms missing: the image is skipped and named (message + file), the rest is complete', async (t) => {
  const B = await world(); await seed(B);
  const C = await browser(B, t, { images: true }), file = await fullExport(C);
  assert.deepEqual(imgGets(C).filter((r) => r.url === '/api/img/' + GONE).map((r) => r.status), [404], 'the server was asked, once, and confirmed it missing');
  assert.deepEqual(Object.keys(file.idbImages), [HAVE], 'the image that exists is in the file'); assert.equal(file.idbImages[HAVE], BODY);
  assert.deepEqual(copy(file.imagesMissing), [{ id: GONE, at: [D1 + ':bassam_options_v1'] }], 'the file names the missing image and where it is referenced');
  assert.ok(JSON.stringify(file.domains.operations).includes(GONE), 'the record itself is exported as it is, reference included');
  /* the confirmation the admin sees once the file is written */
  C.K.BassamCrypt = { ok: () => true, enc: async (json) => 'TEST_ONLY_ENC:' + json.length };
  const W = C.T.W; W.Blob = W.Blob || Blob; C.K.BassamCount = C.K.BassamCount || ((n, w) => n + ' ' + w);
  C.page._pwSetErr = (m) => assert.fail('password dialog error: ' + m);
  C.page.state.pwDlg = { mode: 'exp', p1: 'TEST_ONLY_pw_12', p2: 'TEST_ONLY_pw_12' };
  C.method('modules/admin/logic.js', 'pwDlgGo').call(C.page);
  assert.ok(await until(() => /^✓/.test(C.page.state.backupMsg || '') || /تعذّر/.test(C.page.state.backupMsg || ''), 5000, 10), C.page.state.backupMsg);
  const msg = C.page.state.backupMsg;
  assert.match(msg, /^✓ تم تصدير النسخة الشاملة/, msg);
  assert.ok(msg.includes('تحذير') && msg.includes(GONE), 'the warning names the image · ' + msg);
  assert.ok(msg.includes('TEST_ONLY department one') || msg.includes(D1), 'and the unit that references it · ' + msg);
  assert.ok(!msg.includes(HAVE), 'only the missing one');
});

for (const kind of ['503', 'network', '403'])
  test('a transient or refused image read (' + kind + ') still FAILS the whole backup — only a confirmed-missing image is skipped', async (t) => {
    const B = await world(); await seed(B);
    const C = await browser(B, t, { images: true });
    C.intercept((request, response) => {
      if (request.method !== 'GET' || request.url !== '/api/img/' + HAVE) return response;
      if (kind === 'network') throw new TypeError('TEST_ONLY network down');
      return new Response(JSON.stringify({ ok: 0, err: kind === '403' ? 'forbidden' : 'unavailable' }), { status: +kind, headers: { 'Content-Type': 'application/json' } });
    });
    const file = await exportOutcome(C);
    assert.equal(file, null, 'no backup file is produced'); assert.equal(C.page._encPend || null, null);
    assert.match(C.page.state.backupMsg, /تعذّر التصدير/);
  });

test('the backup made around a missing image restores: same record, same image reported missing (inspection and receipt), nothing written to the image store', async (t) => {
  const B = await world(); await seed(B);
  const C = await browser(B, t, { images: true }), file = await fullExport(C);
  await replaceOperationalFixture(B.env, OPTIONS, { type: [], work: ['TEST_ONLY newer target'] });
  assert.equal((await C.K.__BS_SRV.operations.read([OPTIONS])).ok, 1);
  const imgsBefore = copy(B.DB.q('SELECT k, seq, v FROM imgs ORDER BY k, seq'));
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file], value: 'TEST_ONLY file' } });
  assert.ok(C.page._fbkPend, JSON.stringify(C.page.state));
  let asked = '';
  C.K.bsConfirm = async (...a) => { asked = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); return true; };
  const beforeEpoch = epoch(B);
  await C.method('modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace');
  assert.equal(C.page._fbkPend, null, JSON.stringify(C.page.state));
  assert.equal(epoch(B), beforeEpoch + 1, 'the restore committed');
  assert.deepEqual(inspectOperationalFixture(B.env, OPTIONS), value, 'the record is back, with both references');
  const inspect = JSON.parse(posts(C, 'inspect')[0].body), commit = posts(C, 'commit')[0];
  assert.deepEqual(copy(inspect.backup.imagesMissing), [{ id: GONE, at: [D1 + ':bassam_options_v1'] }], 'the file carried its note to the server');
  assert.equal(commit.status, 200);
  assert.ok(asked.includes(GONE), 'the confirmation before the restore names the image that will be missing · ' + asked.slice(0, 400));
  assert.deepEqual(copy(B.DB.q('SELECT k, seq, v FROM imgs ORDER BY k, seq')), imgsBefore, 'no image body was written by the restore');
  const receipt = B.DB.q('SELECT counts_json FROM restore_operations')[0];
  assert.ok(receipt, 'one receipt');
  const get = async (id) => (await B.W.default.fetch(new Request('http://x/api/img/' + id, { headers: { Cookie: 'bs_tok=TEST_ONLY_session_super' } }), B.env)).status;
  assert.equal(await get(GONE), 404, 'the missing image reads as missing'); assert.equal(await get(HAVE), 200);
  /* and the platform can be backed up again (a page opened after the restore) */
  const C2 = await browser(B, t, { images: true }), again = await fullExport(C2);
  assert.deepEqual(copy(again.imagesMissing), [{ id: GONE, at: [D1 + ':bassam_options_v1'] }]); assert.deepEqual(Object.keys(again.idbImages), [HAVE]);
});
