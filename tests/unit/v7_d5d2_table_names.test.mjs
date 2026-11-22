/* V7 · د5-د2 · قرار المراجع 1 — خريطةُ أسماء جداول العمليات ثابتة (workers/parts/019o1-table-names.js). بلا ترحيل D1 ولا مسٍّ لصفّ.
   ① كلُّ شكلٍ موجود اليوم يُخزَّن في الجدول نفسِه بالضبط قبل التغيير وبعده: لكل مورد، جداولُ الشكل وجداولُ الكيان وأعمدتُها وجملُ الإنشاء
      بالخريطة = ما كانت تعطيه التسميةُ بالترتيب.
   ② الاسمُ لا يتبع الترتيبَ ولا الحاضر: بترتيبٍ معكوس، وبكل موردٍ وحده، وبغياب كل موردٍ وحده — جداولُ كل مورد هي هي.
      (بالتسمية القديمة يتبدّل اسمُ جدول خيارات الورديات بغياب الجدول الشهري — وهو ما أوقف اختبارَ الحذف.)
   ③ شكلٌ جديد بلا اسمٍ صريح يُفشل generate --check (tools/oc_tables.mjs)، والتحضيرُ يرفضه (operations-unnamed-table).
   ④ اسمٌ في الخريطة يخالف جدولَ شكلٍ مطابقٍ سبقه ⇒ رفض، لا دمجٌ صامت. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { ROOT } from './harness.mjs';
import { load } from '../../tools/oc_tables.mjs';

const C = load(ROOT);
const run = (code) => JSON.parse(vm.runInContext('JSON.stringify((function () {' + code + '})())', C));
const SHAPE = `function shape(P, resource) { var R = ocForResource(P, resource); return { tables: R.order.map(function (s) { return [s.table, s.entityTable || null, s.columns]; }).sort(), entities: Object.keys(R.entities).sort().map(function (n) { return [n, R.entities[n].columns]; }) }; }`;

test('① every existing shape is stored in exactly the same table before and after: per resource, same shape tables, entity tables, columns and CREATE statements', () => {
  const r = run(SHAPE + `var before = ocPrepare(__DEFS), after = ocPrepare(__DEFS, OC_TABLE_NAMES), out = { resources: __DEFS.length, diff: [] };
    __DEFS.forEach(function (d) { if (JSON.stringify(shape(before, d.resource)) !== JSON.stringify(shape(after, d.resource))) out.diff.push(d.resource); });
    out.ddl = JSON.stringify(ocCreateStatements(before)) === JSON.stringify(ocCreateStatements(after)); out.nEntities = Object.keys(after.entities).length; return out;`);
  assert.ok(r.resources >= 20, 'موارد: ' + r.resources); assert.deepEqual(r.diff, []); assert.equal(r.ddl, true, 'جملُ الإنشاء متطابقة'); assert.equal(r.nEntities, 57);
});

test('② a table name follows neither registration order nor which programs are present', () => {
  const r = run(SHAPE + `var full = ocPrepare(__DEFS, OC_TABLE_NAMES), want = {}, bad = [], oldMoves = [];
    __DEFS.forEach(function (d) { want[d.resource] = JSON.stringify(shape(full, d.resource)); });
    function check(defs, label) { var P = ocPrepare(defs, OC_TABLE_NAMES); defs.forEach(function (d) { if (JSON.stringify(shape(P, d.resource)) !== want[d.resource]) bad.push(label + ':' + d.resource); }); }
    check(__DEFS.slice().reverse(), 'reversed');
    __DEFS.forEach(function (d, i) { check([d], 'alone'); check(__DEFS.filter(function (x) { return x !== d; }), 'without-' + d.resource); });
    /* والتسميةُ القديمة كانت تتبدّل: بغياب موارد الجدول الشهري */
    var rest = __DEFS.filter(function (d) { return !/staffing|callsigns|perm_limit/.test(d.resource); }), old = ocPrepare(rest), oldFull = ocPrepare(__DEFS);
    rest.forEach(function (d) { if (JSON.stringify(shape(old, d.resource)) !== JSON.stringify(shape(oldFull, d.resource))) oldMoves.push(d.resource); });
    return { bad: bad, oldMoves: oldMoves };`);
  assert.deepEqual(r.bad, []);
  assert.ok(r.oldMoves.includes('bassam_shift_options_v1'), 'بالتسمية القديمة يتبدّل جدول خيارات الورديات بغياب الجدول: ' + r.oldMoves.join(' · '));
});

test('③ a new shape without an explicit name fails generate --check, and the codec refuses it', () => {
  assert.equal(run(`try { ocPrepare(__DEFS.concat([{ resource: 'bassam_test_only_v1', schema: ocMap('ops_test_only_new', ocObject('ops_test_only_new_row', { a: ocScalar('text') })) }]), OC_TABLE_NAMES); return 'accepted'; } catch (e) { return e.message + '|' + e.ocTable; }`), 'operations-unnamed-table|ops_test_only_new');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-')), extra = path.join(dir, 'extra.js');
  fs.writeFileSync(extra, "var OC_EXTRA_RESOURCES = [{ resource: 'bassam_test_only_v1', schema: ocMap('ops_test_only_new', ocObject('ops_test_only_new_row', { a: ocScalar('text') })) }];\n");
  try {
    const bad = spawnSync('node', [path.join(ROOT, 'tools/oc_tables.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, KIVO_OC_EXTRA: extra } });
    assert.equal(bad.status, 1, bad.stdout); assert.match(bad.stdout, /ops_test_only_new/); assert.match(bad.stdout, /ليس في الخريطة/);
    const ok = spawnSync('node', [path.join(ROOT, 'tools/oc_tables.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, KIVO_OC_EXTRA: '' } });
    assert.equal(ok.status, 0, ok.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.match(fs.readFileSync(path.join(ROOT, 'tools/generate.py'), 'utf8'), /oc_tables\.mjs'\), '--check'\]/, 'الفحص داخل generate --check');
  assert.match(fs.readFileSync(path.join(ROOT, 'workers/parts/019r-operational-storage.js'), 'utf8'), /ocPrepare\(opDefinitions\(\), OC_TABLE_NAMES\)/, 'الخادم يحضّر بالخريطة');
});

test('④ a map entry that contradicts the table of an identical earlier shape is refused, never merged silently', () => {
  assert.equal(run(`var names = { a: { t: 'a', e: 'a' }, a_values: { t: 'a_values', e: 'a_values' }, b: { t: 'b', e: 'b' }, b_values: { t: 'b_values', e: 'b_values' } };
    var defs = [{ resource: 'bassam_one_v1', schema: ocArray('a', ocScalar('text')) }, { resource: 'bassam_two_v1', schema: ocArray('b', ocScalar('text')) }];
    try { ocPrepare(defs, names); return 'accepted'; } catch (e) { return e.message; }`), 'operations-table-name-conflict');
  assert.equal(run(`var names = { a: { t: 'a', e: null }, a_values: { t: 'a_values', e: 'a_values' }, b: { t: 'a', e: null }, b_values: { t: 'a_values', e: 'a_values' } };
    var defs = [{ resource: 'bassam_one_v1', schema: ocArray('a', ocScalar('text')) }, { resource: 'bassam_two_v1', schema: ocArray('b', ocScalar('text')) }];
    var P = ocPrepare(defs.slice().reverse(), names); return Object.keys(P.tables).sort().join(',');`), 'a,a_values');
});
