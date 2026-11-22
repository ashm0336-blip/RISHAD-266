/* V7 · د6 (رصد الحالات · قرار المالك) — الخادمُ الحقيقي (TEST_ONLY):
   ① فتحُ الشهر أو اليوم المقفل يُنفَّذ على الخادم بآلية الاستدراك القائمة (/api/retro · الإنفاذ عند الحفظ): طلبٌ مصنوع يكتب حالةً في فترةٍ مغلقة يُرفض بلا نافذة
· يُقبل داخل نافذةٍ مفتوحة · يُرفض بعد إغلاقها · ومن لا يملك rz.rec.retro.open لا يفتح نافذة.
   ② optIn (قاعدةٌ عامة من system.json): نظامٌ يعلنه — رصد الحالات ونظامٌ مصطنع — مطفأٌ في وحدةٍ مفتوحة (لا سجلَّ سقفٍ فيها ولا في أصولها)، والتفعيلُ الصريح
      يفتحه، والأنظمةُ غيرُ المعلِنة كما هي في الوحدة المفتوحة. والمولِّد يشتقّ العلامةَ من system.json وحده ويرفضها على غير صفحةِ نظامٍ يُطفأ. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { LAB } from '../../../../tests/unit/v7_d6_import_fx.mjs';
import { startLab } from '../../../../tests/browser/local_server.mjs';
import { A, G, REC, key, lab, rasdOn, readK, putK, report } from './rasd_fx.mjs';

const denied = (r, k) => r.status !== 200 || !!(r.j && r.j.denied && Object.prototype.hasOwnProperty.call(r.j.denied, k)) || !(r.j && r.j.ok);
const prevMonth = (t) => (t.m > 1 ? { y: t.y, m: t.m - 1 } : { y: t.y - 1, m: 12 });

test('rasd · ① الكتابةُ في فترةٍ مغلقة: تُرفض بلا نافذة · تُقبل داخل نافذةٍ مفتوحة · تُرفض بعد إغلاقها · ولا يفتح النافذةَ إلا حاملُ rz.rec.retro.open', async () => {
  const T = await lab();
  try {
    await rasdOn(T, A, true);
    const mgr = await T.as(LAB.mgrA, LAB.pw), emp = await T.as(LAB.empA, LAB.pw), K = key(A, REC), t = await T.today(), p = prevMonth(t);
    const open0 = { reports: [report(1, { y: t.y, m: t.m, d: t.d })] };
    const w0 = await T.save(mgr, K, open0);
    assert.equal(w0.status, 200, w0.t.slice(0, 200)); assert.deepEqual(w0.j.denied || {}, {}, 'an open-period write is refused: ' + w0.t.slice(0, 300));
    /* فترةٌ مغلقة بلا نافذة: مرفوضٌ (مديرُ المنصة بلا قيد صلاحية في الحفظ كما اليوم — لا يتغيّر) */
    const closed = { reports: open0.reports.concat([report(2, { y: p.y, m: p.m, d: 3 })]) };
    const d1 = await T.save(mgr, K, closed);
    assert.ok(denied(d1, K), 'a closed-period write passed without a retro window: ' + d1.t.slice(0, 300));
    assert.deepEqual(readK(T.DB, K), open0);
    /* من لا يملك rz.rec.retro.open لا يفتح نافذة */
    const e1 = await T.retro(emp, { act: 'open', scope: { y: p.y, m: p.m }, reason: 'TEST_ONLY سبب' });
    assert.equal(e1.status, 403, e1.t.slice(0, 200));
    /* مديرُ الإدارة (approve ⇒ rz.rec.retro.open) يفتح نافذةَ الشهر بسبب ⇒ الكتابةُ تُقبل */
    const op = await T.retro(mgr, { act: 'open', scope: { y: p.y, m: p.m }, reason: 'TEST_ONLY استدراك', hours: 1 });
    assert.equal(op.status, 200, op.t.slice(0, 300)); assert.ok(op.j.window && op.j.window.id);
    assert.equal(T.DB.q("SELECT COUNT(*) n FROM aud WHERE etype='retro' AND k=?1", key(A, 'bassam_rasd_retro_v1'))[0].n, 1, 'the opening is in the activity log');
    const ok = await T.save(mgr, K, closed);
    assert.equal(ok.status, 200); assert.deepEqual(ok.j.denied || {}, {}, 'inside an open window the write is refused: ' + ok.t.slice(0, 300));
    assert.deepEqual(readK(T.DB, K), closed);
    /* GET /api/retro يعرض النافذة لقارئ السجلات */
    const g = await T.call('/api/retro?res=rasd&dept=' + A, { ck: mgr.ck });
    assert.equal(g.status, 200); assert.ok(g.j.windows.some((w) => w.id === op.j.window.id && !w.closedAt));
    /* تُغلق ⇒ الكتابةُ التالية في الفترة نفسِها تُرفض */
    const cl = await T.retro(mgr, { act: 'close', id: op.j.window.id });
    assert.equal(cl.status, 200, cl.t.slice(0, 200));
    const after = { reports: closed.reports.concat([report(3, { y: p.y, m: p.m, d: 4 })]) };
    const d3 = await T.save(mgr, K, after);
    assert.ok(denied(d3, K), 'a closed-period write passed after the window was closed: ' + d3.t.slice(0, 300));
    assert.deepEqual(readK(T.DB, K), closed);
    /* سجلُّ الحالة المكتوبةُ داخل النافذة لا يُحذف بعد إغلاقها (الحذفُ كتابةٌ في الفترة المغلقة) */
    const d4 = await T.save(mgr, K, open0);
    assert.ok(denied(d4, K), 'deleting a closed-period case passed without a window');
    /* نافذةُ يومٍ واحد تغطّي يومَها وحده */
    const opD = await T.retro(mgr, { act: 'open', scope: { y: p.y, m: p.m, d: 4 }, reason: 'TEST_ONLY يوم' });
    assert.equal(opD.status, 200, opD.t.slice(0, 200));
    assert.deepEqual((await T.save(mgr, K, after)).j.denied || {}, {}, 'the day window does not cover its day');
    const other = { reports: after.reports.concat([report(4, { y: p.y, m: p.m, d: 5 })]) };
    assert.ok(denied(await T.save(mgr, K, other), K), 'a day window opened another day');
    /* مخزنُ النوافذ لا يُكتب بحفظٍ عادي (srv في RES_REG): نافذةٌ مزوَّرة بـ/api/save مرفوضة — للمدير ولمدير المنصة — والمخزنُ كما هو */
    const RK = key(A, 'bassam_rasd_retro_v1'), st0 = readK(T.DB, RK);
    const forged = { windows: [{ id: 'TEST_ONLY_forged', scope: { y: p.y, m: p.m, d: null }, by: 'x', at: Date.now(), until: Date.now() + 36e5, hours: 1, reason: 'TEST_ONLY' }] };
    for (const who of [mgr, T.su]) assert.ok(denied(await T.save(who, RK, forged), RK), 'a forged retro window was saved through /api/save');
    assert.deepEqual(readK(T.DB, RK), st0);
  } finally { await T.close(); }
});

/* نسخةٌ من العامل المبنيّ تُصدِّر دوالَّ السقف وجدولَ الأنظمة (KIVO_PERM44_DATA) — لنظامٍ مصطنعٍ يعلن optIn دون أن يُبنى */
async function workerWithExports() {
  const src = fs.readFileSync(process.env.KIVO_WORKER, 'utf8'), f = process.env.KIVO_WORKER.replace(/_worker\.js$/, '_rasd_optin_' + process.pid + '.mjs');
  fs.writeFileSync(f, src + '\nexport { KIVO_PERM44_DATA, actorOf, deptCapOf, capOnDept };\n');
  try { return await import(f); } finally { fs.unlinkSync(f); }
}

test('rasd · ② optIn عامّة: النظامُ المعلِن (رصد الحالات ونظامٌ مصطنع) مطفأٌ في الوحدة المفتوحة ويُفتح بالتفعيل الصريح · غيرُ المعلِن كما هو · المولِّدُ من system.json وحده', async () => {
  const labo = await startLab(), T = { DB: labo.env.DB, lab: labo };
  try {
    const W = await workerWithExports();
    const sys = W.KIVO_PERM44_DATA.systems, rz = sys.find((s) => s.key === 'rasd');
    assert.equal(rz.optIn, true, 'rasd carries optIn in the systems list (from its system.json)');
    assert.deepEqual(sys.filter((s) => s.optIn).map((s) => s.key), ['rasd'], 'only the declaring system carries it');
    /* نظامٌ مصطنع يعلن optIn: «جائزة التميز» في هذه النسخة وحدها */
    sys.find((s) => s.key === 'award').optIn = true;
    const P = readK(T.DB, 'bassam_perms_v1'); delete P.caps[A]; delete P.caps[G]; await putK(T, 'bassam_perms_v1', P);
    let Ac = await W.actorOf(labo.env, 'TEST_ONLY_mgrA');
    let cap = W.deptCapOf(Ac, A);
    assert.ok(!cap.includes('rasd') && !cap.includes('award'), 'an optIn system is ON in an open unit: ' + cap.join(','));
    for (const k of ['irshad', 'seized', 'daily', 'tasks', 'plan', 'dstats', 'emps', 'admin']) assert.ok(cap.includes(k), 'a non-optIn system changed in the open unit: ' + k);
    assert.equal(W.capOnDept(Ac, A, 'rasd/records'), false);
    /* التفعيلُ الصريح (سجلٌّ للوحدة وأصلها يحمل النظامين) يفتحهما */
    const all = cap.concat(['rasd', 'award']); P.caps[A] = all; P.caps[G] = all; await putK(T, 'bassam_perms_v1', P);
    Ac = await W.actorOf(labo.env, 'TEST_ONLY_mgrA'); cap = W.deptCapOf(Ac, A);
    assert.ok(cap.includes('rasd') && cap.includes('award'), 'explicit enabling did not turn them ON: ' + cap.join(','));
    assert.equal(W.capOnDept(Ac, A, 'rasd/records'), true);
    /* وحدةٌ بلا سجلّ تحت أصلٍ مسقوفٍ يحملهما: الوراثةُ كما هي (ليست «مفتوحة») */
    delete P.caps[A]; await putK(T, 'bassam_perms_v1', P);
    Ac = await W.actorOf(labo.env, 'TEST_ONLY_mgrA'); cap = W.deptCapOf(Ac, A);
    assert.ok(cap.includes('rasd') && cap.includes('award'), 'inheritance from a capped parent changed: ' + cap.join(','));
  } finally { await labo.close(); }
  /* المولِّد: العلامةُ من system.json وحده، ومرفوضةٌ على غير صفحةِ نظامٍ يُطفأ */
  const py = (code) => spawnSync('python3', ['-c', 'import sys, json; sys.path.insert(0, "tools"); import generate as g\n' + code], { encoding: 'utf8' });
  const M = "M = {'pages': [{'key': 'x', 'activation': 'toggle', 'name': 'X', 'subs': [{'key': 'a'}]}, {'key': 'y', 'activation': 'toggle', 'name': 'Y'}, {'key': 'emps', 'name': 'E'}]}\n";
  const ok = py(M + "print(json.dumps([s.get('optIn', False) for s in g.perm44_systems(M, ['x'])]))");
  assert.equal(ok.status, 0, ok.stderr); assert.equal(ok.stdout.trim(), '[true, false]');
  const bad = py(M + "g.perm44_systems(M, ['emps'])");
  assert.notEqual(bad.status, 0, 'optIn on a page that is not a switchable system was accepted');
});
