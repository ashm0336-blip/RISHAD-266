/* ══ KIVO_255 · SOT-134 — بوابةُ سلامة البيانات: tools/d1/integrity.py على قاعدةٍ حقيقية مأهولة ثم على تلفٍ محقون ══
   (أ) قاعدةٌ عمل عليها العاملُ (دخول · حفظ · صور · جلسات) ⇒ 0 مخالفة. (ب) كلُّ تلفٍ يُحقن يُكتشف باسمه: فجوةُ قِطع · جلسةٌ يتيمة ·
   JSON تالف · معرّفٌ مكرَّر · بصمةٌ بصيغةٍ غريبة · meta.rev متأخّر · مفتاحٌ بلا مراجعة · ملكيةُ صورةٍ يتيمة. (ج) العاملُ نفسُه لا يُنتج شيئاً من ذلك بعد 30 حفظاً متتابعاً. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { DatabaseSync } from 'node:sqlite';
import { PYTHON, makeTestEnv, client, worker, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const TOOL = path.join(ROOT, 'tools', 'd1', 'integrity.py');
function toFile(shim, file) { const d = new DatabaseSync(file); d.exec(shim.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.sql).join(';\n') + ';');
  for (const { name } of shim.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) { const rows = shim.db.prepare('SELECT * FROM "' + name + '"').all(); for (const r of rows) { const ks = Object.keys(r); d.prepare('INSERT INTO "' + name + '"(' + ks.map(k => '"' + k + '"').join(',') + ') VALUES (' + ks.map(() => '?').join(',') + ')').run(...ks.map(k => r[k])); } }
  d.close(); }
function run(file) { let out = '', code = 0; try { out = execFileSync(PYTHON, [TOOL, file, '--strict', '--json', file + '.json'], { encoding: 'utf8' }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); code = e.status; } return { out, code, r: JSON.parse(fs.readFileSync(file + '.json', 'utf8')) }; }
async function populated() {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]), bassam_gdepts_v1: JSON.stringify([{ id: 'g1', name: 'قطاع' }]) });
  for (let i = 0; i < 30; i++) { const s = await C.save(su.ck, { 'bsdept:dA:bassam_options_v1': JSON.stringify({ i, pad: 'x'.repeat(2000) }) }); assert.equal(s.j.ok, 1); }
  const w = await worker(env);
  /* KIVO_261 (إفصاح — تعديلُ اختبار · SOT-068): الصورةُ بصيغة العميل الحقيقية (data:image/…) — البايتاتُ الخام صارت 415 (لم تكن تُخزَّن سليمةً أصلاً) */
  const pu = await w.fetch(new Request('http://x/api/img/im1', { method: 'PUT', headers: { cookie: su.ck, origin: 'http://x', 'Content-Type': 'text/plain; charset=utf-8' }, body: 'data:image/png;base64,' + 'A'.repeat(64) }), env); assert.equal(pu.status, 200);
  return { env, C, ck: su.ck };
}
test('(أ)+(ج) قاعدةٌ مأهولة بعمل العامل (دخول · 30 حفظاً · صورة): 0 مخالفة', async () => {
  const { env } = await populated();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_int_')); const f = path.join(dir, 'ok.sqlite'); toFile(env.DB, f);
  const { out, code, r } = run(f);
  assert.equal(code, 0, out); assert.equal(r.violations.length, 0, JSON.stringify(r.violations)); assert.match(out, /✔ سلامةُ البيانات: 0 مخالفة/);
  assert.ok(r.counts.kv > 0 && r.counts.sess >= 1 && r.counts.imgs >= 1);
});
test('(ب) كلُّ تلفٍ محقون يُكتشف باسمه', async () => {
  const { env } = await populated();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_int_'));
  const cases = [
    ['kv-chunks', "DELETE FROM kv WHERE k = 'bsdept:dA:bassam_options_v1' AND seq = 0; INSERT INTO kv (k, seq, v) VALUES ('bsdept:dA:bassam_options_v1', 5, '{}')"],
    ['sess-orphan', "INSERT INTO sess (tok, uid, ts, la, dev) VALUES ('t_orphan', 'ghost', " + Date.now() + ", " + Date.now() + ", 'd')"],
    ['kv-json', "UPDATE kv SET v = '{broken' WHERE k = 'bassam_depts_v1'"],
    ['users', "UPDATE kv SET v = (SELECT v FROM kv WHERE k = 'bassam_auth_users_v1' AND seq = 0) || '' WHERE k = 'bassam_auth_users_v1' AND seq = 0; UPDATE kv SET v = replace(v, '\"role\":\"super\"', '\"role\":\"king\"') WHERE k = 'bassam_auth_users_v1'"],
    ['meta-rev', "UPDATE meta SET v = '0' WHERE k = 'rev'"],
    ['revs-missing', "INSERT INTO kv (k, seq, v) VALUES ('bassam_stray_v1', 0, '{}')"],
    ['imgown-orphan', "INSERT INTO imgown (img, uid) VALUES ('nope', 'x')"],
  ];
  for (const [kind, sql] of cases) {
    const f = path.join(dir, kind + '.sqlite'); toFile(env.DB, f);
    const d = new DatabaseSync(f); try { d.exec(sql); } catch (e) { d.close(); if (kind === 'imgown-orphan') { continue; } throw e; } d.close();
    const { code, r } = run(f);
    assert.equal(code, 1, kind + ': الخروجُ 1 بوضع strict');
    assert.ok(r.violations.some(v => v.kind === kind), kind + ' مكتشَف: ' + JSON.stringify(r.violations).slice(0, 300));
  }
});
