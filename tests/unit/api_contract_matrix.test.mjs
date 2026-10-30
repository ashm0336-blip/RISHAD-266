/* KIVO_263 · AUD-026 — مصفوفةُ العقد لكل مسار: الشكلُ (api_contracts) · الأخطاء · **الصلاحية** — هنا الصلاحيةُ والأخطاء بغير مدير النظام:
   (أ) موظفٌ بجلسة: كلُّ مسارٍ super ⇒ 403 · كلُّ مسارٍ session ⇒ 200 · مساراتُ enforce في الوضع القديم ⇒ 404 — لكل مسارٍ في العقد
   (ب) مديرُ إدارة: مساراتُ super ⇒ 403 كذلك (الإدارةُ ليست حوكمةَ المنصة)
   (ج) الأخطاءُ المعقودة: 400 bad-body بموضع المخالفة لكل مسارٍ له مخطّطُ جسم (ADR-032) · 405 للطريقة غير المسموحة · 404 للمجهول */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, SRC, since, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const CT = JSON.parse(fs.readFileSync(path.join(SRC, 'api', 'contracts.json'), 'utf8'));
function seed() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_am_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const QS = { '/api/changes': '?since=0', '/api/get': '?keys=bassam_depts_v1', '/api/aud': '?limit=3' };
const BODY = { '/api/sess/kill': { uid: 'nobody' }, '/api/guard/unlock': { gk: 'u:x' }, '/api/recovery/new': { pw: 'x' }, '/api/reset': { pw: 'x', confirm: 'x' }, '/api/policy': {}, '/api/permv2': {} };
async function world() {
  const env = makeTestEnv(); const C = client(env);
  assert.ok((await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN)).ok);
  await applySql(env.DB, seed());
  const emp = await C.login('0000000113', '70113'), dm = await C.login('0000000101', '70101'); assert.ok(emp.ok && dm.ok);
  return { env, C, emp, dm };
}
const call = (C, r, ck) => { const m = r.methods.includes('GET') ? 'GET' : r.methods[0]; return C.api(r.path + (QS[r.path] || ''), m === 'GET' ? { cookie: ck } : { method: m, body: BODY[r.path] || {}, cookie: ck }); };
test('(أ)(ب) الصلاحيةُ لكل مسارٍ في العقد — موظفٌ ومديرُ إدارة', since(163), async () => {
  const { C, emp, dm } = await world();
  const seen = { super: 0, session: 0, enforce: 0 };
  for (const r of CT.routes) {
    if (r.path === '/api/img/' || r.path === '/api/logout') continue;
    if (r.access === 'super') { for (const [who, ck] of [['موظف', emp.ck], ['مدير إدارة', dm.ck]]) { const x = await call(C, r, ck); assert.equal(x.status, 403, who + ' ⇐ ' + r.path + ': ' + x.status + ' ' + JSON.stringify(x.j).slice(0, 80)); } seen.super++; }
    else if (r.access === 'session') { const x = await call(C, r, emp.ck); assert.ok(x.status === 200 || (x.status === 400 && r.path !== '/api/whoami'), 'موظف ⇐ ' + r.path + ': ' + x.status); seen.session++; }
    else if (r.access === 'enforce') { const x = await call(C, r, emp.ck); assert.equal(x.status, 404, 'الوضعُ القديم ⇐ ' + r.path + ': ' + x.status); seen.enforce++; }
  }
  assert.ok(seen.super >= 10 && seen.session >= 3 && seen.enforce >= 4, JSON.stringify(seen));
});
test('(ج) الأخطاءُ المعقودة: 400 bad-body لكل مخطّط · 405 · 404', since(163), async () => {
  const { C, emp } = await world();
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const B = JSON.parse(fs.readFileSync(path.join(SRC, 'schemas', 'api', 'bodies.schema.json'), 'utf8')).bodies;
  /* KIVO_264 · SOT-101 (إفصاح — توسيعُ اختبار): مخطّطاتُ المسارات المغيِّرة الباقية (14 بدل 5). مساراتُ مدير النظام تُرسَل بجلسته — الصلاحيةُ قبل الشكل
     (الموظفُ 403 عليها، (أ) أعلاه)؛ ومسارا الإنفاذ (authz-migrate · authz-test) يُثبَت مخطّطاهما في بيئتهما: tests/unit/k264_sec_bodies.test.mjs */
  const bad = { '/api/dstats': null, '/api/notifications/act': { op: 17 }, '/api/save': { set: { bassam_depts_v1: 5 } }, '/api/login': { u: [] }, '/api/recover': { key: {} }, '/api/checkpw': { p: 1 }, '/api/sess/kill': { uid: true },
    '/api/logout': { tok: 'x' }, '/api/me/sess/kill': { tok: 'x' }, '/api/retro': { res: 1 }, '/api/guard/unlock': { gk: 1 }, '/api/policy': null, '/api/recovery/new': { pw: 1 }, '/api/reset': null,
    /* KIVO_264 · KIVO-Tasks (الرقعتان 02 · 05): «مهامي» ومساراتُ المسؤول — الشكلُ قبل الصلاحية (الموظفُ يرى 400 لا 403 لجسمٍ خاطئ) */
    '/api/me/tasks/act': { k: 5 }, '/api/tasks/create': { k: 5 }, '/api/tasks/review': { k: 5 }, '/api/tasks/extend': { k: 5 }, '/api/tasks/reassign': { k: 5 },
    '/api/tasks/cancel': { k: 5 }, '/api/tasks/relink': { k: 5 }, '/api/tasks/recur': { id: 5 }, '/api/tasks/recur/run': { day: 5 },
    /* KIVO_265 · H-1: إعداداتُ المهمة وإعادةُ فتحها من الخادم (العمود 23) */
    '/api/tasks/settings': { k: 5 }, '/api/tasks/reopen': { k: 5 },
    /* The five domain POST envelopes use an existing actor/session first.
       Dept wipe/delete are super-only before shape; the loop selects su there. */
    '/api/custody/act': { op: 17 }, '/api/irshad/act': { op: 17 }, '/api/employees/transition': { intent: 17 },
    '/api/admin/dept-wipe': { dept: 17 }, '/api/admin/dept-delete': { dept: 17 },
    '/api/backup/restore': { mode: 17 } };
  const ENF_ONLY = ['/api/authz-migrate', '/api/authz-test'];
  for (const p of Object.keys(B)) {
    if (ENF_ONLY.includes(p)) continue;
    assert.ok(bad[p] !== undefined, 'جسمٌ خاطئٌ للاختبار: ' + p);
    const x = await C.api(p, { method: 'POST', body: bad[p], cookie: p === '/api/dstats' || CT.routes.find(r => r.path === p).access === 'super' ? su.ck : emp.ck });
    assert.equal(x.status, 400, p); assert.equal(x.j.err, 'bad-body'); assert.ok(x.j.at, p + ': الموضع');
    const spec = (CT.routes.find(r => r.path === p).responses || {})['400']; assert.ok(spec && spec.err === 'bad-body', p + ': الردُّ 400 معقود');
  }
  assert.equal((await C.api('/api/aud', { method: 'POST', body: {}, cookie: emp.ck })).status, 405);
  const nf = await C.api('/api/لا-يوجد', { cookie: emp.ck }); assert.equal(nf.status, 404); assert.equal(nf.j.err, 'not-found');
});
