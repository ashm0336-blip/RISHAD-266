/* V7 · 53 (port-sync · بند 5 · قرار المالك) — تنبيهُ التحديث الوارد يسمّي صاحبَ التعديل، على آلية الدمج اللحظي (0ea78348): الاسمُ يرسله الخادمُ مع التغيير.
   ① /api/changes يحمل by: اسمُ من عدّل لغيره · لا يُسمّي الطالبَ لنفسه · يغيب بلا تغيير — بيانات TEST_ONLY على العامل الحقيقي
   ② 280 يمرّر by مع bassam:remote · ③ الجذر يجمع الأسماء للتعديل الوارد من غيري ويكتبها في التنبيه، ويمحوها عند التطبيق */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, SRC, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach((p) => { if (p.type !== 'literal') o[p.type] = +p.value; }); return o; })();
const KP = 'bsdept:tst_d1:bassam_plan_v1';
function seedSql() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_by_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const ch = async (C, ck, since) => (await C.api('/api/changes?since=' + since, { cookie: ck })).j;

test('① /api/changes: تعديلُ غيري يصلني باسم صاحبه · تعديلي لا يسمّيني · بلا تغيير لا حقل', async () => {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' }), C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql()); await installCurrentSchemaFixture(env);
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const dm = await C.login('0000000101', '70101'), sup = await C.login('0000000111', '70111'); assert.ok(dm.ok && sup.ok);
  const dmUid = (await C.api('/api/whoami', { cookie: dm.ck })).j.uid;
  const v0 = (await ch(C, sup.ck, 0)).v, quiet = await ch(C, sup.ck, v0);
  assert.deepEqual(quiet.keys, []); assert.equal(quiet.by, undefined, 'بلا تغيير: لا حقل');
  const cur = (await C.api('/api/operations/read?' + new URLSearchParams({ uid: dmUid, keys: KP }), { cookie: dm.ck })).j;
  const p = cur.resources[KP]; p.floors[0].zones[1].name = 'TEST_ONLY مصلى معدَّل';
  const s = await C.api('/api/save', { method: 'POST', cookie: dm.ck, body: { uid: dmUid, requestId: 'TEST_ONLY_by_1', epoch: cur.epoch, set: { [KP]: JSON.stringify(p) }, del: [], base: cur.base } });
  assert.equal(s.j && s.j.ok, 1, JSON.stringify(s.j).slice(0, 300));
  const mine = await ch(C, dm.ck, v0);
  assert.ok(mine.keys.includes(KP)); assert.equal(mine.by, undefined, 'صاحبُ التعديل لا يُسمّى لنفسه');
  const his = await ch(C, sup.ck, v0);
  assert.ok(his.keys.includes(KP), JSON.stringify(his).slice(0, 300));
  const dmName = (await C.api('/api/whoami', { cookie: dm.ck })).j;
  assert.ok(Array.isArray(his.by) && his.by.length === 1, 'اسمٌ واحد: ' + JSON.stringify(his.by));
  assert.ok(his.by[0].length > 0 && his.by[0].length <= 60 && !/^\d{6,}$/.test(his.by[0]), 'اسمٌ ظاهر لا رقمُ حساب: ' + his.by[0]);
  assert.ok(!dmName.name || his.by[0] === String(dmName.name).slice(0, 60), JSON.stringify([his.by, dmName.name]));
  const later = await ch(C, sup.ck, his.v);
  assert.equal(later.by, undefined, 'التعديلُ الذي وصل لا يُعاد ذكرُه');
});

test('② ③ الواجهة: الاسمُ يمرّ مع bassam:remote إلى التنبيه، ويُمحى عند التطبيق', () => {
  const st = fs.readFileSync(path.join(SRC, 'api', '280-server-storage.js'), 'utf8'), root = fs.readFileSync(path.join(SRC, 'layouts', 'root-logic.js'), 'utf8');
  assert.match(st, /operationDispatchRemote9\(ks, j\.v, result\.confirmed, result\.foreign, j\.by\)/);
  assert.match(st, /detail: \{ keys: keys, v: v, foreign: foreign \|\| \[\], by: Array\.isArray\(by\) \? by\.slice\(0, 3\)\.map\(String\) : \[\] \}/);
  const body = /_liveNoteText\(\) \{([\s\S]*?)\n  \}/.exec(root)[1], text = (w) => new Function(body).call({ _liveBy: w });
  assert.equal(text([]), 'حُدّثت البيانات من جهاز آخر — تظهر بعد إغلاق النافذة');
  assert.equal(text(['أحمد']), 'عدّل أحمد البيانات — تظهر بعد إغلاق النافذة');
  assert.equal(text(['أحمد', 'خالد']), 'عدّل أحمد وخالد البيانات — تظهر بعد إغلاق النافذة');
  assert.equal(text(['أحمد', 'خالد', 'سعد']), 'عدّل أحمد وآخرون البيانات — تظهر بعد إغلاق النافذة');
  assert.match(root, /this\.bkToast\(this\._liveNoteText\(\), 3500\)/);
  /* يُجمع من التعديل الوارد من غيري وحده، ويُمحى عند التطبيق */
  const q = /_liveQueue\(keys, foreign, by\) \{([\s\S]*?)\n  \}/.exec(root)[1];
  const L = { state: { active: 'plan' }, _liveTouches: () => true, _liveTry() {} };
  global.setTimeout = global.setTimeout; new Function('keys', 'foreign', 'by', q).call(L, ['k'], ['k'], ['أحمد', 'أحمد', ' ']);
  assert.deepEqual(L._liveBy, ['أحمد']);
  new Function('keys', 'foreign', 'by', q).call(L, ['k2'], [], ['خالد']);
  assert.deepEqual(L._liveBy, ['أحمد'], 'صدى حفظي (بلا foreign) لا يضيف اسماً');
  assert.equal(root.split('this._liveForeign = false; this._liveBy = [];').length - 1, 1, 'يُمحى عند التطبيق');
});
