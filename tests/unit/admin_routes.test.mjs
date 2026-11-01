/* KIVO_261 · SOT-136 (P0) — مساراتُ مدير النظام الأربعة عشر لغير مدير النظام (موظف · مدير إدارة) في الوضعين: كلُّ مسارٍ مرفوضٌ 403
   عدا ما صُمّم لمدير الإدارة في الوضع القديم وحده: «الحضور» (صفوفُ إدارته ونفسِه فقط) و«إنهاءُ جلسة» موظفٍ من إدارته — ولا بياناتَ تتسرّب في الرفض.
   (كان سبعةٌ من المسارات بلا اختبارٍ لغير مدير النظام — البطاقةُ المستقلة.) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, makeEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client, applySql, ROOT } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_adm_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const GETS = ['/api/sec', '/api/guard', '/api/policy', '/api/overview', '/api/recovery', '/api/permv2', '/api/scope-dryrun', '/api/identity-rehearsal', '/api/identity-preflight'];
const POSTS = [['/api/guard/unlock', { gk: 'ip:x' }], ['/api/recovery/new', {}], ['/api/reset', { confirm: 'x' }], ['/api/policy', { lockN: 3 }]];
for (const mode of ['legacy', 'enforce']) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
  test('[' + mode + '] مساراتُ مدير النظام لغير مدير النظام: 403 بلا بيانات · الحضورُ وإنهاءُ الجلسة لمدير الإدارة في نطاقه وحده (legacy)', async () => {
    const env = makeTestEnv(EX); const C = client(env);
    const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
    await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
    await applySql(env.DB, seedSql());
    await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
    if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
    const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok, 'tst_emp1 (موظف · tst_d1)');
    const mgr = await C.login('0000000101', '70101'); assert.ok(mgr.ok, 'tst_dm1 (مدير إدارة · tst_d1)');
    const emp2 = await C.login('0000000121', '70121'); assert.ok(emp2.ok, 'tst_emp2 (موظف · tst_d2)');
    const pol0 = (await C.api('/api/policy', { cookie: su.ck })).j;
    for (const [who, ck] of [['موظف', emp.ck], ['مدير إدارة', mgr.ck]]) {
      for (const p of GETS) {
        const r = await C.api(p, { cookie: ck });
        assert.equal(r.status, 403, who + ' ' + p + ' ⇒ ' + r.status);
        assert.equal(r.j.ok, 0); assert.ok(!('rows' in r.j) && !('users' in r.j) && !('keys' in r.j), who + ' ' + p + ': لا بياناتَ في الرفض');
      }
      for (const [p, body] of POSTS) {
        const r = await C.api(p, { method: 'POST', cookie: ck, body });
        assert.equal(r.status, 403, who + ' POST ' + p + ' ⇒ ' + r.status);
      }
    }
    assert.deepEqual((await C.api('/api/policy', { cookie: su.ck })).j, pol0, 'السياساتُ لم تتغيّر بمحاولات غير مدير النظام');
    assert.equal((await C.api('/api/whoami', { cookie: su.ck })).status, 200, 'لم يُمسّ شيءٌ من مدير النظام (reset لم يقع)');
    /* الحضور */
    const prE = await C.api('/api/presence', { cookie: emp.ck }), prM = await C.api('/api/presence', { cookie: mgr.ck });
    if (mode === 'enforce') { assert.equal(prE.status, 403); assert.equal(prM.status, 403, 'الإنفاذ: الحضورُ لمدير النظام وحده (sys.security.view)'); }
    else {
      const ids = (r) => (r.j.list || []).map(x => x.u && x.u.id);
      assert.equal(prE.status, 200); assert.deepEqual(ids(prE), ['tst_emp1'], 'الموظفُ يرى نفسَه وحده: ' + JSON.stringify(ids(prE)));
      assert.equal(prM.status, 200); const uids = ids(prM);
      assert.ok(uids.includes('tst_emp1') && uids.includes('tst_dm1') && !uids.includes('tst_emp2') && uids.every(u => /^tst_/.test(u)) && !uids.some(u => /^tst_.*2$/.test(u) && u !== 'tst_dm1'), 'مديرُ الإدارة يرى إدارتَه ونفسَه وحدهما (لا مديرَ النظام ولا إدارةً أخرى): ' + JSON.stringify(uids));
    }
    /* إنهاءُ جلسة */
    const k1 = await C.api('/api/sess/kill', { method: 'POST', cookie: emp.ck, body: { uid: 'tst_emp2' } }); assert.equal(k1.status, 403, 'الموظفُ لا يُنهي جلسةَ غيره');
    const k2 = await C.api('/api/sess/kill', { method: 'POST', cookie: mgr.ck, body: { uid: 'tst_emp2' } }); assert.equal(k2.status, 403, 'مديرُ الإدارة لا يُنهي جلسةَ إدارةٍ أخرى');
    assert.equal((await C.api('/api/whoami', { cookie: emp2.ck })).status, 200, 'جلسةُ موظف الإدارة الأخرى قائمة');
    const k3 = await C.api('/api/sess/kill', { method: 'POST', cookie: mgr.ck, body: { uid: 'tst_emp1' } });
    if (mode === 'enforce') { assert.equal(k3.status, 403); assert.equal((await C.api('/api/whoami', { cookie: emp.ck })).status, 200); }
    else { assert.equal(k3.status, 200, 'مديرُ الإدارة يُنهي جلسةَ موظفٍ من إدارته (legacy · مقصود)'); assert.equal((await C.api('/api/whoami', { cookie: emp.ck })).status, 401, 'الجلسةُ انتهت فعلاً'); }
  });
}
