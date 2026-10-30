/* KIVO_261 · AUD-054 (كشفه cfbench/k261tamper.mjs): علامةُ ترقية العدسات lensZ في bassam_perms_v1 كانت تُتخطّى في قاعدة الصلاحيات (permsRule)
   فيكتب فيها موظفٌ أيَّ قيمةٍ وبأيّ حجم في مفتاحٍ عامّ يقرؤه الجميع. الآن: تبقى كما هي أو تصير 1 من غياب (ترقيةُ 331 الأصلية) — وما سواها مرفوضٌ
   في الوضعين؛ والترقيةُ نفسُها ومنحُ مدير الإدارة كما كانا. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_lz_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const K = 'bassam_perms_v1';
for (const mode of ['legacy', 'enforce']) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
  test('[' + mode + '] lensZ: الموظفُ لا يكتب فيها إلا ترقيةَ الغياب إلى 1 · لا قيمةَ أخرى ولا حجماً', async () => {
    const env = makeTestEnv(EX); const C = client(env);
    const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
    await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
    await applySql(env.DB, seedSql());
    if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
    const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok);
    const cur = () => JSON.parse(env.DB.q('SELECT v FROM kv WHERE k = ?1', K)[0].v);
    const p0 = cur(); assert.ok(!p0.lensZ, 'العُدّةُ بلا lensZ (كما قبل الترقية)');
    const put = async (obj) => { const r = await C.save(emp.ck, { [K]: JSON.stringify(obj) }); return { r, denied: !!(r.j.denied || {})[K] }; };
    /* (١) الترقيةُ الأصلية من الغياب إلى 1 (مع حقولٍ فارغة) — تُقبل كما كانت */
    const up = await put(Object.assign({}, p0, { lensZ: 1, tplOf: p0.tplOf || {}, subs: p0.subs || {}, patterns: p0.patterns || {} }));
    assert.ok(!up.denied && up.r.j.ok === 1, 'الترقيةُ إلى 1 مقبولة: ' + JSON.stringify(up.r.j).slice(0, 200)); assert.equal(cur().lensZ, 1);
    /* (٢) قيمٌ أخرى مرفوضة: نصٌّ ضخم · رقمٌ آخر · كائن · حذفُها */
    for (const [nm, v] of [['big', 'x'.repeat(200000)], ['two', 2], ['obj', { a: 1 }], ['zero', 0]]) {
      const before = env.DB.q('SELECT v FROM kv WHERE k = ?1', K)[0].v;
      const r = await put(Object.assign({}, cur(), { lensZ: v }));
      assert.ok(r.denied || r.r.status >= 400, nm + ' ⇒ مرفوض (' + r.r.status + ')');
      assert.equal(env.DB.q('SELECT v FROM kv WHERE k = ?1', K)[0].v, before, nm + ': القيمةُ لم تتغيّر');
    }
    const c1 = cur(); delete c1.lensZ; const del = await put(c1); assert.ok(del.denied, 'حذفُ العلامة مرفوض'); assert.equal(cur().lensZ, 1);
    /* (٣) مديرُ النظام يبقى حرّاً فيها (الصلاحياتُ كلُّها له) */
    const s2 = await C.save(su.ck, { [K]: JSON.stringify(Object.assign({}, cur(), { lensZ: 1 })) }); assert.equal(s2.j.ok, 1); assert.ok(!(s2.j.denied || {})[K]);
  });
}
