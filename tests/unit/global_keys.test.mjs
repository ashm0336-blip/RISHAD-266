/* KIVO_261 · SOT-136 (P0) — مسحُ المفاتيح العامّة (scope: global في 023-resources) عدائياً: موظفٌ ومديرُ إدارة يكتبان قيمةً عبثية (ونصّاً ضخماً)
   في كلّ مفتاحٍ عامّ — والحكم: لا يُكتب شيءٌ منها (القيمةُ كما هي بايتاً) في الوضعين. وُلد من AUD-054 (lensZ كانت تُتخطّى). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_gk_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const GLOBAL = (() => { const t = fs.readFileSync(path.join(ROOT, 'workers/parts/023-resources.js'), 'utf8'); return [...t.matchAll(/'([a-z0-9_]+)':\s*\{ scope: 'global'/g)].map(m => m[1]); })();
for (const mode of ['legacy', 'enforce']) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
  test('[' + mode + '] المفاتيحُ العامة (' + GLOBAL.length + '): قيمةٌ عبثية أو ضخمة من موظفٍ أو مدير إدارة لا تُكتب أبداً', async () => {
    assert.ok(GLOBAL.length >= 15, 'المفاتيحُ العامة من السجلّ: ' + GLOBAL.length);
    const env = makeTestEnv(EX); const C = client(env);
    const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
    await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
    await applySql(env.DB, seedSql());
    if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
    const emp = await C.login('0000000113', '70113'); const mgr = await C.login('0000000101', '70101'); assert.ok(emp.ok && mgr.ok);
    const val = (k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ?1', k)[0]; return r ? r.v : null; };
    const JUNK = ['{"x":"TEST_ONLY عبث"}', '[{"id":"evil","role":"super","un":"9999999999"}]', JSON.stringify({ blob: 'z'.repeat(150000) }), '"TEST_ONLY"'];
    const leaks = [];
    for (const [who, s] of [['موظف', emp], ['مدير إدارة', mgr]]) {
      for (const k of GLOBAL) for (const j of JUNK) {
        const before = val(k);
        const r = await C.save(s.ck, { [k]: j });
        if (val(k) !== before) leaks.push(who + ' ' + k + ' ⇐ ' + j.slice(0, 40) + ' (' + r.status + ' ' + JSON.stringify(r.j).slice(0, 80) + ')');
      }
    }
    assert.deepEqual(leaks, [], 'كتاباتٌ مرّت: ' + leaks.slice(0, 5).join(' | '));
  });
}
