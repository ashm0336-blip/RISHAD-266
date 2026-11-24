/* V7 · 53 (uiqa) — البند 6 (الأداء): قراءةُ «الموظفين» لا تحمّل الجدولَ الشهريّ بتاريخه كله، وفكُّ المورد التشغيلي مرةً واحدة بالنتيجة نفسها.
   المختبرُ المعزول (العاملُ الحقيقي · SQLite في الذاكرة · TEST_ONLY). الأرقامُ قبل وبعد في تقرير المجموعة (uiqa_report.md). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startLab, LAB } from '../browser/local_server.mjs';
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { WORKER } from './harness.mjs';

const A = 'TEST_ONLY_A', K = (r) => 'bsdept:' + A + ':' + r;
const emps = Array.from({ length: 500 }, (_, i) => ({ eid: 'TEST_ONLY_n' + i, name: 'TEST_ONLY كثير ' + i, nid: String(1400000000 + i), empno: String(50000 + i), type: 'رسمي', gender: 'ذكر' }));
const staffing = () => { const st = {}; for (const ym of ['1448-4', '1448-5', '1448-6']) { st[ym] = {}; emps.forEach((e) => { st[ym][e.eid] = { shift: 'الأولى', rest: ['الجمعة'] }; }); } return st; };
async function session(lab, un) {
  const r = await fetch(lab.base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: lab.base }, body: JSON.stringify({ u: un, p: LAB.pw }) });
  return (r.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
}

test('٦ — قراءةُ «الموظفين» (500 موظف) لا تقرأ صفوفَ الجدول الشهري · وقراءةُ الجدول نفسِه تقرؤها', { timeout: 120000 }, async () => {
  const lab = await startLab();
  try {
    await replaceOperationalFixture(lab.env, K('bassam_employees_v1'), emps);
    await replaceOperationalFixture(lab.env, K('bassam_staffing_v3'), staffing());
    const ck = await session(lab, LAB.mgrA), DB = lab.env.DB, orig = DB.prepare.bind(DB), seen = [];
    DB.prepare = (sql) => { const s = orig(sql), b = s.bind.bind(s); s.bind = (...a) => { seen.push(a); return b(...a); }; return s; };
    const get = async (k) => { seen.length = 0; const r = await fetch(lab.base + '/api/operations/read?keys=' + encodeURIComponent(k), { headers: { cookie: ck } }); const j = await r.json(); return { j, touched: seen.some((a) => a.some((v) => v === 'bassam_staffing_v3' || v === K('bassam_staffing_v3'))) }; };
    const e = await get(K('bassam_employees_v1'));
    assert.equal(e.j.ok, 1); assert.equal(e.j.resources[K('bassam_employees_v1')].length, 500);
    assert.equal(e.touched, false, 'the employees read does not load the staffing table');
    const s = await get(K('bassam_staffing_v3'));
    assert.equal(s.j.ok, 1); assert.equal(Object.keys(s.j.resources[K('bassam_staffing_v3')]).length, 3); assert.equal(s.touched, true, 'reading the staffing table itself still does');
    DB.prepare = orig;
  } finally { await lab.close(); }
});

test('٦ — فكُّ المورد التشغيلي: ocFromPhysicalRead = ocFromPhysical + ocInflate حرفاً (الموظفون · الجدول)', { timeout: 120000 }, async () => {
  const lab = await startLab();
  try {
    const src = fs.readFileSync(process.env.KIVO_WORKER || WORKER, 'utf8'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd53p-')), f = path.join(dir, 'w.mjs');
    fs.writeFileSync(f, src + '\nexport { opInfo, opPrepared, ocPhysicalTables, ocFromPhysical, ocInflate, ocFromPhysicalRead };\n');
    const W = await import(pathToFileURL(f).href); fs.rmSync(dir, { recursive: true, force: true });
    assert.equal(typeof W.ocFromPhysicalRead, 'function');
    await replaceOperationalFixture(lab.env, K('bassam_employees_v1'), emps);
    await replaceOperationalFixture(lab.env, K('bassam_staffing_v3'), staffing());
    for (const r of ['bassam_employees_v1', 'bassam_staffing_v3']) {
      const info = W.opInfo(K(r)), prepared = W.opPrepared(info.resource), tables = W.ocPhysicalTables(prepared);
      const physical = Object.fromEntries(Object.keys(tables).map((t) => [t, lab.env.DB.q('SELECT * FROM ' + t + ' WHERE department_id=? AND resource=?', info.dept, info.resource)]));
      const one = W.ocFromPhysicalRead(prepared, info.dept, info.resource, physical), d = W.ocFromPhysical(prepared, info.dept, info.resource, physical);
      assert.deepEqual(one.projection, W.ocInflate(prepared, d), r + ': the same value');
      assert.deepEqual(one.domain.rows, d.rows, r + ': the same rows');
      /* المرتّبُ غيرُ القانوني يبقى مرفوضاً (لا تليين للحارس): صفٌّ يتيم ⇒ orphan */
      const bad = JSON.parse(JSON.stringify(physical)); bad.ops_nodes.push(Object.assign({}, bad.ops_nodes[bad.ops_nodes.length - 1], { row_key: '$/zz_orphan' }));
      assert.throws(() => W.ocFromPhysicalRead(prepared, info.dept, info.resource, bad), /operations-/, r + ': a non-canonical document is still refused');
    }
  } finally { await lab.close(); }
});
