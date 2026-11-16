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
import { makeTestEnv, WORKER, SRC, SYSTEMS, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from '../unit/harness.mjs';

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
    /* د3: تقريرُ الصلاحيات — السجلُّ المجموع يصحّ في الخادم، وأعدادُه = المحسوب من السجل المولَّد، وروابطُ النطاق والحراسة بعدد الحاضر */
    r = await call('/api/permv2'); assert.equal(r.s, 200, 'permv2 ' + r.t.slice(0, 200));
    const REG = JSON.parse(fs.readFileSync(path.join(SRC, 'permissions', 'registry', 'registry-v24.9.json'), 'utf8')), act = REG.registry.filter((e) => e.status === 'active');
    assert.equal(r.j.validation && r.j.validation.ok, true, 'validate في الخادم: ' + JSON.stringify(r.j.validation && r.j.validation.errors));
    assert.deepEqual(r.j.counts, REG.counts, 'أعدادُ الخادم = أعدادُ السجل المولَّد');
    assert.equal(r.j.counts.securityActive, act.length); assert.equal(r.j.counts.owners, REG.owners.length); assert.equal(r.j.counts.atoms, REG.atoms.length);
    assert.equal(r.j.counts.reserved, REG.registry.length - act.length); assert.equal(r.j.counts.reference, REG.registry.filter((e) => e.key.startsWith('ref.')).length);
    assert.equal(r.j.scope.bindings, act.length, 'روابطُ النطاق = المفاتيحُ النشطة'); assert.equal(r.j.scope.counts.keys, act.length);
    assert.equal(r.j.scope.validation && r.j.scope.validation.ok, true, 'تحقّقُ النطاق: ' + JSON.stringify(r.j.scope.validation).slice(0, 400));
    assert.equal(r.j.scope.readBindingCheck && r.j.scope.readBindingCheck.ok, true, 'تحقّقُ ربط القراءة: ' + JSON.stringify(r.j.scope.readBindingCheck).slice(0, 400));
    assert.equal(r.j.guards.bindings, act.filter((e) => e.guard.status === 'to-bind').length, 'روابطُ الحراسة = المفاتيحُ التي حارسُها «للربط»');
    assert.equal(r.j.guards.counts.bindings, r.j.guards.bindings);
    assert.equal(r.j.guards.counts.coveredResources, r.j.guards.covers.length, 'المواردُ التي لها مصنِّف = المعدودُ (نصيبُ القاعدة + الأنظمة الحاضرة)');
    r = await call('/'); assert.equal(r.s, 200, 'الغلاف');
    for (const k of ALL) { r = await call(ROUTE[k]); assert.equal(r.s, SYSTEMS.includes(k) ? 200 : 404, ROUTE[k] + ' ← ' + r.s + ' ' + r.t); }
  } finally { console.log = log; }
  assert.deepEqual([...new Set(errs)], [], 'لا خطأ خادم في أي طلب');
});

/* V7 · د3 (قرار المراجع 4): المنحُ المخزّنة على مفتاح نظامٍ حُذف لا تُمسّ — خاملة، محفوظة، تعود بعودة النظام.
   وضعُ الإنفاذ · سجلُّ منح إدارةٍ اصطناعية (TEST_ONLY). المفتاحُ الغائب: أولُ مفتاحٍ قابلٍ للمنح من نظامٍ غائب (يُقرأ من مجلده في الشجرة الكاملة)،
   ومعه دائماً مفتاحٌ لا وجودَ له في أي سجل. */
const FULL = process.env.KIVO_FULL_SRC || SRC;
function goneKey() {
  for (const k of ALL.filter((x) => !SYSTEMS.includes(x))) {
    const p = path.join(FULL, 'systems', k, 'permissions.json'); if (!fs.existsSync(p)) continue;
    const rows = ((JSON.parse(fs.readFileSync(p, 'utf8')).docs || {}).registry || []).map((o) => o.value).filter((v) => v && v.key && v.status === 'active' && v.grant === 'assignable');
    if (rows.length) return rows[0].key;
  }
  return null;
}
test('د3 · الحذف: منحُ مفتاح نظامٍ غائب مرفوض، والمنحُ المخزّنة عليه باقيةٌ لا يحذفها حفظٌ عادي [' + (SYSTEMS.join(' · ') || 'لا نظام') + ']', { timeout: 300000 }, async () => {
  const { world, stored } = await import('../unit/tasks_fx.mjs');
  const w = await world({ mode: 'enforce' }), su = w.su.ck, G = 'bsdept:tst_d1:bassam_grants_v1', cp = (o) => JSON.parse(JSON.stringify(o));
  const put = async (v) => {
    const g = await w.C.api('/api/get?keys=' + encodeURIComponent(G), { cookie: su });
    const r = await w.C.api('/api/save', { method: 'POST', cookie: su, body: { set: { [G]: JSON.stringify(v) }, del: [], base: { [G]: ((g.j.keys || {})[G] || {}).rev || 0 } } });
    const d = (r.j.denied || {})[G] || (r.j.conflicts || {})[G] || null;
    return { ok: !!(r.j.revs && r.j.revs[G]), why: d ? d.why : '', detail: d ? String(d.detail || '') : '' };
  };
  const cur = () => cp(stored(w.env, G) || { v: 1, emp: {} });
  const keys = ['zz.gone.view'].concat(goneKey() ? [goneKey()] : []);
  for (const K of keys) {
    let g = cur(); g.emp.tst_e_emp1 = { plus: [K], minus: [], at: 1, by: 'x' }; let r = await put(g);
    assert.equal(r.ok, false, 'منحُ ' + K + ' مرفوض'); assert.match(r.why, /^(grant|cap)$/, K + ': ' + r.why + ' ' + r.detail);
    g = cur(); g.emp.tst_e_emp1 = { plus: [], minus: [K], at: 1, by: 'x' }; r = await put(g); assert.equal(r.ok, false, 'إسقاطُ ' + K + ' مرفوض');
    /* مخزَّنٌ سلفاً (كأنه بقي بعد حذف النظام) */
    const st = cur(); st.emp.tst_e_emp1 = { plus: ['emp.view', K], minus: [], at: 2, by: 'x' };
    w.env.DB.db.prepare('UPDATE kv SET v=? WHERE k=?').run(JSON.stringify(st), G); assert.deepEqual(cur().emp.tst_e_emp1.plus, ['emp.view', K], 'زُرع المخزَّن');
    g = cur(); g.emp.tst_e_emp2 = { plus: ['emp.view'], minus: [], at: 3, by: 'x' }; r = await put(g);
    assert.equal(r.ok, true, 'حفظٌ لا يمسّ القائمة يُقبل — ' + r.why + ' ' + r.detail); assert.deepEqual(cur().emp.tst_e_emp1.plus, ['emp.view', K], 'المنحُ المخزّنة على ' + K + ' باقية');
    g = cur(); g.emp.tst_e_emp1 = { plus: ['emp.view'], minus: [], at: 4, by: 'x' }; r = await put(g);
    assert.equal(r.ok, false, 'حفظٌ يحذف ' + K + ' من القائمة مرفوض'); assert.equal(r.why, 'perms'); assert.match(r.detail, /latent/);
    assert.deepEqual(cur().emp.tst_e_emp1.plus, ['emp.view', K], 'وبعد الرفض ما زالت باقية');
    const clean = cur(); delete clean.emp.tst_e_emp1; delete clean.emp.tst_e_emp2; w.env.DB.db.prepare('UPDATE kv SET v=? WHERE k=?').run(JSON.stringify(clean), G);
  }
});
