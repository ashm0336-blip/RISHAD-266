import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { peopleTaskDocuments } from './operational_people_tasks_fx.mjs';
const C = vm.createContext({});
for (const path of ['workers/parts/019o-operational-codec.js', 'workers/parts/019p-operations-scheduling.js', 'workers/parts/019q-operations-people-tasks.js']) vm.runInContext(fs.readFileSync(path, 'utf8'), C, { filename: path });
const all = C.ocPrepare(C.OC_SCHEDULING_RESOURCES.concat(C.OC_PEOPLE_TASK_RESOURCES));
const docs = peopleTaskDocuments(), copy = value => JSON.parse(JSON.stringify(value));
for (const definition of C.OC_PEOPLE_TASK_RESOURCES) test('Lossless typed SQL roundtrip: ' + definition.resource, () => {
  const resource = definition.resource, prepared = C.ocForResource(all, resource), value = docs['bsdept:TEST_ONLY_DEPT:' + resource];
  const db = new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON');
  try {
    for (const ddl of C.ocCreateStatements(all)) db.exec(ddl);
    const domain = C.ocConvert(prepared, 'TEST_ONLY_DEPT', resource, value), rows = C.ocPhysicalRows(prepared, domain), tables = C.ocPhysicalTables(prepared);
    for (const [table, columns] of Object.entries(tables)) {
      assert.ok(columns.length <= 100, table);
      for (const row of rows[table]) db.prepare('INSERT INTO ' + table + '(' + columns.join(',') + ') VALUES(' + columns.map(() => '?').join(',') + ')').run(...columns.map(column => row[column]));
    }
    const actual = Object.fromEntries(Object.keys(tables).map(table => [table, db.prepare('SELECT * FROM ' + table + ' WHERE department_id=? AND resource=?').all('TEST_ONLY_DEPT', resource)]));
    assert.equal(JSON.stringify(C.ocInflate(prepared, C.ocFromPhysical(prepared, 'TEST_ONLY_DEPT', resource, actual)).value), JSON.stringify(value));
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.deepEqual(copy(C.ocInflate(prepared, C.ocConvert(prepared, 'TEST_ONLY_DEPT', resource, undefined, false))), { present: false });
    assert.equal(C.ocInflate(prepared, C.ocConvert(prepared, 'TEST_ONLY_DEPT', resource, null, true)).value, null);
  } finally { db.close(); }
});
test('Unsupported people/report/task fields and tuple overflow fail before SQL; no unknown historical JSON is discarded', () => {
  const check = (resource, value, pattern) => assert.throws(() => C.ocConvert(C.ocForResource(all, resource), 'TEST_ONLY_DEPT', resource, value), pattern);
  check('bassam_options_v1', { job: [] }, /unknown-field/);
  check('bassam_dreport_v1', { __lv: { unproven: [] } }, /map-key/);
  check('bassam_employees_v1', [{ name: 'TEST_ONLY employee', secretExtension: {} }], /unknown-field/);
  check('bassam_tasks_v1', { '1448-5-1': [new Array(25).fill(null)] }, /tuple-length/);
  const tasks = copy(docs['bsdept:TEST_ONLY_DEPT:bassam_tasks_v1']); tasks['1448-5-1'][0][23].opaque = { business: true };
  check('bassam_tasks_v1', tasks, /unknown-field/);
});
