/* V7 · د2-ب — اختبارُ الحذف (الخادم): يُشغَّل داخل نسخةٍ حُذف منها مجلدُ نظامٍ أو أكثر ثم أُعيد توليدُها (tools/removal_test.py)،
   ويعمل كذلك في الشجرة الكاملة. الخادمُ المولَّد على قاعدة بياناتٍ جديدة (D1Shim في الذاكرة · TEST_ONLY):
     · 200 على ping والدخول والقراءة والحفظ (العامّ والذرّي) والتنبيهات ومرجع النسخة والاستعادة
     · مسارُ كل نظامٍ حاضر 200، ومسارُ كل نظامٍ غائب 404
     · لا جزءَ من القاعدة يذكر اسماً معرَّفاً في أجزاء نظامٍ غائب (يُفحص في removal_test.py)، ولا خطأ خادم (worker-error) في أي طلب */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeTestEnv, WORKER, SYSTEMS, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from '../unit/harness.mjs';

const ALL = ['award', 'dstats', 'irshad', 'seized'];
const ROUTE = { award: '/api/award?dept=TEST_ONLY_d1', dstats: '/api/dstats', irshad: '/api/irshad?dept=TEST_ONLY_d1', seized: '/api/seized?dept=TEST_ONLY_d1' };

test('د2-ب · الحذف: الخادمُ بالأنظمة الحاضرة [' + (SYSTEMS.join(' · ') || 'لا نظام') + '] يجيب على الطرق الأساسية، ومساراتُ الغائب 404', { timeout: 120000 }, async () => {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'rm-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, fs.readFileSync(WORKER, 'utf8'));
  let W; try { W = (await import(pathToFileURL(f).href)).default; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const env = makeTestEnv(), errs = []; let cookie = '';
  const log = console.log; console.log = (x) => { try { const j = JSON.parse(x); if (j.ev === 'worker-error' || j.ev === 'save-failed') errs.push(j.p + ': ' + j.err); } catch (e) {} };
  const call = async (p, o = {}) => { const a = await W.fetch(new Request('https://t.example' + p, Object.assign({ headers: Object.assign({ 'Content-Type': 'application/json' }, cookie ? { Cookie: cookie } : {}) }, o)), env, { waitUntil() {}, passThroughOnException() {} }); const t = await a.text(); const sc = a.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; let j = null; try { j = JSON.parse(t); } catch (e) {} return { s: a.status, j, t: t.slice(0, 200) }; };
  const post = (p, body) => call(p, { method: 'POST', body: JSON.stringify(body) });
  try {
    let r = await call('/api/ping'); assert.equal(r.s, 200, 'ping ' + r.t);
    r = await post('/api/login', { u: TEST_SUPER_USERNAME, p: TEST_SUPER_PIN }); assert.equal(r.s, 200, 'login ' + r.t); const uid = r.j.uid;
    r = await call('/api/get?keys=bassam_depts_v1'); assert.equal(r.s, 200, 'get ' + r.t);
    r = await post('/api/save', { set: { bassam_depts_v1: JSON.stringify([{ id: 'TEST_ONLY_d1', name: 'TEST_ONLY إدارة' }]) }, del: [], base: { bassam_depts_v1: r.j.keys.bassam_depts_v1.rev || 0 }, uid });
    assert.equal(r.s, 200, 'save (عامّ) ' + r.t); assert.ok(r.j.revs && r.j.revs.bassam_depts_v1, 'الحفظُ قُبل ' + r.t);
    /* حفظٌ ذرّي: قائمةُ موظفي الإدارة موردٌ تشغيلي (يمرّ بـrsSaveCommit وحارس الاعتماد المشترك) */
    const KE = 'bsdept:TEST_ONLY_d1:bassam_employees_v1'; const g = await call('/api/operations/read?keys=' + encodeURIComponent(KE)); assert.equal(g.s, 200, 'operations/read ' + g.t);
    r = await post('/api/save', { set: { [KE]: JSON.stringify([{ eid: 'TEST_ONLY_e1', name: 'TEST_ONLY موظف', nid: '1299999991' }]) }, del: [], base: { [KE]: (g.j.base || {})[KE] || 0 }, uid, requestId: 'rm_' + Date.now().toString(36), epoch: g.j.epoch });
    assert.equal(r.s, 200, 'save (ذرّي) ' + r.t); assert.equal(r.j.ok, 1, 'الحفظُ الذرّي قُبل ' + r.t);
    r = await call('/api/notifications'); assert.equal(r.s, 200, 'notifications ' + r.t);
    r = await call('/api/backup/restore?scope=full&uid=' + encodeURIComponent(uid)); assert.equal(r.s, 200, 'مرجعُ النسخة والاستعادة ' + r.t);
    const base = r.j.base || {};
    for (const [k, name] of [['dstats', 'dailyStats'], ['irshad', 'irshad'], ['seized', 'seized'], ['award', 'awards']]) assert.equal(Object.prototype.hasOwnProperty.call(base, name), SYSTEMS.includes(k), 'أساسُ الاستعادة يذكر مجال ' + name + ' بحضور نظامه فقط');
    r = await call('/'); assert.equal(r.s, 200, 'الغلاف');
    for (const k of ALL) { r = await call(ROUTE[k]); assert.equal(r.s, SYSTEMS.includes(k) ? 200 : 404, ROUTE[k] + ' ← ' + r.s + ' ' + r.t); }
  } finally { console.log = log; }
  assert.deepEqual([...new Set(errs)], [], 'لا خطأ خادم في أي طلب');
});
