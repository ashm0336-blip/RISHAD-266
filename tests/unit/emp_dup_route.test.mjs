/* KIVO_265 · ملاحظةُ المالك (2026-10-19 · أمن) — على العامل الحقيقي (Node + D1 بديل) بالوضعين: حفظُ قائمة موظفي إدارةٍ فيها صفٌّ
   جديد بهويةٍ أو جوالٍ هو اسمُ مستخدم حسابِ دخولٍ في إدارةٍ أخرى يُرفض «emp-dup»، والصفُّ الفريد يُقبل. (الفحصُ الحيّ على Test
   قبِل صفّاً كهذا رغم القاعدة — فهذا الاختبارُ يحسم: القاعدةُ في الكود أم النشر.) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now())).forEach((p) => { o[p.type] = p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_dup_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
async function world(extra = {}) {
  const env = makeTestEnv(extra); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  if (extra.KIVO_AUTHZ_MODE === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  return { env, C, su };
}
const getv = async (C, ck, k) => ((await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: ck })).j.keys || {})[k];
for (const mode of ['legacy', 'enforce']) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
  test('[' + mode + '] emp-dup: هويةُ حسابِ إدارةٍ أخرى تُرفض في قائمة موظفي tst_d1 · والفريدُ يُقبل', async () => {
    const { C, su } = await world(EX);
    const k = 'bsdept:tst_d1:bassam_employees_v1';
    const cur = await getv(C, su.ck, k); const list = cur && cur.v ? JSON.parse(cur.v) : [];
    assert.ok(Array.isArray(list) && list.length, 'قائمةُ tst_d1 من المِثال');
    const users = JSON.parse((await getv(C, su.ck, 'bassam_auth_users_v1')).v);
    const inList = (v) => !!v && list.some((e) => e && (String(e.nid || '') === v || String(e.phone || '') === v));
    const other = users.filter((u) => u.deptId && u.deptId !== 'tst_d1' && /^\d{10}$/.test(String(u.un || '')) && !inList(String(u.un)) && !inList(String(u.alt || '')))[0];
    assert.ok(other, 'حسابٌ في إدارةٍ أخرى باسم مستخدم رقمي: ' + JSON.stringify(users.map((u) => [u.un, u.deptId]).slice(0, 6)));
    const row = (nid, phone, empno) => ({ eid: 'e' + nid, name: 'اختبار ' + nid, nid, phone, empno, type: 'دائم', gender: 'ذكر' });
    const bad = await C.save(su.ck, { [k]: JSON.stringify([row(other.un, '0590000001', '900001')].concat(list)) });
    const den = (bad.j && bad.j.denied) || {};
    assert.ok(den[k], 'مرفوض: ' + JSON.stringify(bad.j).slice(0, 200));
    assert.equal(den[k].why, 'emp-dup', 'السبب emp-dup لا ' + den[k].why);
    assert.equal(JSON.parse((await getv(C, su.ck, k)).v).length, list.length, 'القيمةُ لم تتغيّر');
    const ok = await C.save(su.ck, { [k]: JSON.stringify([row('2900000051', '0590000051', '900051')].concat(list)) });
    assert.ok(!((ok.j && ok.j.denied) || {})[k], 'الفريدُ يُقبل: ' + JSON.stringify(ok.j).slice(0, 200));
    assert.equal(JSON.parse((await getv(C, su.ck, k)).v).length, list.length + 1);
    const bad2 = await C.save(su.ck, { [k]: JSON.stringify([row('2900000052', String(other.alt || other.un), '900052')].concat(JSON.parse((await getv(C, su.ck, k)).v))) });
    assert.equal((((bad2.j && bad2.j.denied) || {})[k] || {}).why, 'emp-dup', 'الجوالُ = اسمُ مستخدم حسابٍ آخر يُرفض');
    const bad3 = await C.save(su.ck, { [k]: JSON.stringify([row('2900000053', other.un, '900053')].concat(JSON.parse((await getv(C, su.ck, k)).v))) });
    assert.equal((((bad3.j && bad3.j.denied) || {})[k] || {}).why, 'emp-dup', 'الجوالُ = اسمُ مستخدم (الحالةُ الحيّة e05) يُرفض');
  });
}
