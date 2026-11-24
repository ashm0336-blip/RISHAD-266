/* V7 · د6 (schemafix) — ترحيلُ 0012_prayer_readings: صفوفُ pc وسجلّ التسكين المكتوبة بترميز الإصدار 11 تُقرأ بعده كما كُتبت، بلا تحويل ولا فقد.
   «القديم» يُبنى من مصدر اليوم نفسِه بإرجاع الشكلين إلى ما كانا عليه (pc مدخلُه رقمٌ فقط · mvLog بلا rm/src · اسمُ جدول pc القديم)،
   فلا يُعتمد على تاريخ git. بياناتٌ اصطناعية TEST_ONLY فقط. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { D1Shim, ROOT, CURRENT_SCHEMA } from './harness.mjs';
import { SCHED_PARTS } from './sched_parts.mjs';

const DEPT = 'TEST_ONLY_D6_SCHEMAFIX';
const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers/parts.json'), 'utf8')).parts;
let isolate = 0;
async function worker() {
  const source = parts.map(p => fs.readFileSync(path.join(ROOT, 'workers/parts', p.file), 'utf8')).join('');
  return import('data:text/javascript;base64,' + Buffer.from(source + '\nexport { migrateDb, KIVO_MIGRATIONS, opLoadMany, opBackupDecode, ocInflate, osLegacyPhysical, ocPhysicalRows, opInfo, ocConvert };\n// schemafix isolate ' + ++isolate).toString('base64'));
}
/* مرمّزُ الإصدار 11: الشكلان كما كانا قبل هذا الترحيل */
function oldCodec() {
  const C = vm.createContext({});
  for (const file of ['019o-operational-codec.js', ...SCHED_PARTS]) {
    let text = fs.readFileSync(path.join(ROOT, 'workers/parts', file), 'utf8');
    if (/019p5-/.test(file)) { assert.ok(text.includes('osSchemaPrayerCounts(table + "_prayer_counts")')); text = text.replace('osSchemaPrayerCounts(table + "_prayer_counts")', 'ocMap(table + "_prayer_counts", ocScalar("scalar"))'); }
    if (/019p3-/.test(file)) { const n = text.length; text = text.replace(/\n\s+"rm",\n\s+"src",/, ''); assert.ok(text.length < n); }
    if (/019o1-/.test(file)) text = text.replaceAll('{ t: "ops_zone_prayer_counts", e: null }', '{ t: "ops_plan_deleted_months", e: null }');
    vm.runInContext(text, C, { filename: file });
  }
  return vm.runInContext('(function () { var all = ocPrepare(OC_SCHEDULING_RESOURCES, OC_TABLE_NAMES); return function (resource) { return ocForResource(all, resource); }; })()', C);
}
const zone = (uid, pc) => ({ uid, code: uid.slice(-1), cap: 300, count: null, pc });
const ROUNDS = {
  'm:1448-1': { ap: false, mo: false },
  '1448-1-16': {
    t: 1,
    d: [{ sid: 'S1', name: 'TEST_ONLY', zones: [zone('TEST_ONLY_Z1', { fajr: 35, dhuhr: null, asr: '12' }), zone('TEST_ONLY_Z2', {}), zone('TEST_ONLY_Z3', null)] }],
    shAp: { A: { ap: true, at: 1, snap: [{ zones: [zone('TEST_ONLY_Z4', { isha: 7 })] }] } },
    mvLog: [{ t: '07:00', kind: 'gates', key: 'TEST_ONLY_E1', tok: 'TEST_ONLY_E1', fromI: -1, toI: 0, fromLbl: '', toLbl: 'TEST_ONLY', by: 'TEST_ONLY', name: 'TEST_ONLY' }],
  },
};
const PLAN = { zones: [zone('TEST_ONLY_P1', { fajr: 40 })], floors: [{ sid: 'S1', zones: [zone('TEST_ONLY_P2', { maghrib: null }), { uid: 'TEST_ONLY_P3', needS: { A: 2 } }] }] };
const DOCS = { bassam_rounds_v1: ROUNDS, bassam_rounds_arc_v1: ROUNDS, bassam_plan_v1: PLAN };

async function v11WithOldRows(W, old) {
  const DB = new D1Shim(), env = { DB };
  DB.exec('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for (const migration of W.KIVO_MIGRATIONS.slice(0, 11)) {
    for (const sql of migration.sql) DB.exec(sql);
    DB.db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run(migration.name);
  }
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '11');
  const physical = {};
  for (const [resource, doc] of Object.entries(DOCS)) {
    const p = old(resource), rows = W.ocPhysicalRows(p, W.ocConvert(p, DEPT, resource, doc, true));
    physical[resource] = rows;
    for (const [table, list] of Object.entries(rows))
      for (const row of list) {
        const cols = Object.keys(row);
        DB.db.prepare('INSERT INTO ' + table + '(' + cols.join(',') + ') VALUES(' + cols.map(() => '?').join(',') + ')').run(...cols.map(c => row[c]));
      }
  }
  assert.deepEqual(DB.q('PRAGMA foreign_key_check'), []);
  return { DB, env, physical };
}
function permit(DB, W) {
  const value = { version: 1, from: 11, to: W.KIVO_MIGRATIONS.length, migrations: W.KIVO_MIGRATIONS.slice(11).map(m => m.name), operationId: randomUUID(), expiresAt: Date.now() + 60000 };
  DB.db.prepare('INSERT INTO meta(k,v) VALUES(?,?)').run('schema_upgrade_permit_v1', JSON.stringify(value));
}

test('(١) 0012 على قاعدةٍ بالإصدار 11: كلُّ pc (رقم · نص · null · خريطةٌ فارغة · pc نفسُه null) وسجلُّ التسكين يُقرأ بعده حرفاً كما كُتب', async () => {
  const W = await worker(), old = oldCodec(), { DB, env } = await v11WithOldRows(W, old);
  const before = DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE schema_id='ops_plan_deleted_months' AND member_key='pc'")[0].n;
  assert.ok(before >= 8, 'صفوفُ pc القديمة موجودة: ' + before);
  permit(DB, W);
  await W.migrateDb(env);
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA));   // V7 · 53: إلى المخطّط الحالي (0013 بعد 0012)
  assert.deepEqual(DB.q('PRAGMA foreign_key_check'), []);
  assert.equal(DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE schema_id='ops_plan_deleted_months' AND member_key='pc'")[0].n, 0, 'لا عقدةَ pc بالشكل القديم');
  assert.ok(DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE schema_id='ops_plan_deleted_months' AND member_key='needS'")[0].n >= 1, 'needS (الشكلُ المشترك القديم) لم يُمسّ');
  const keys = Object.keys(DOCS).map(r => 'bsdept:' + DEPT + ':' + r), state = await W.opLoadMany(env, keys);
  for (const key of keys) assert.equal(state.values[key], JSON.stringify(DOCS[key.split(':').pop()]), key);
});

test('(٢) نسخةٌ حديثة صُدِّرت قبل 0012 (صفوفٌ بترميز 11): opBackupDecode يعيدها بالترميز الجديد كما هي · والصفوفُ الجديدة تمرّ دون تغيير', async () => {
  const W = await worker(), old = oldCodec();
  for (const [resource, doc] of Object.entries(DOCS)) {
    const p = old(resource), oldRows = W.ocPhysicalRows(p, W.ocConvert(p, DEPT, resource, doc, true));
    const dec = W.opBackupDecode({ version: 1, scope: { departmentId: DEPT }, resource, rows: oldRows });
    assert.equal(JSON.stringify(W.ocInflate(dec.info.prepared, dec.domain).value), JSON.stringify(doc), resource);
    const info = W.opInfo('bsdept:' + DEPT + ':' + resource), now = W.ocPhysicalRows(info.prepared, W.ocConvert(info.prepared, DEPT, resource, doc, true));
    assert.equal(JSON.stringify(W.osLegacyPhysical(now, now)), JSON.stringify(now), 'الترميزُ الجديد لا يطابقه شيء: ' + resource);
    const sorted = rows => Object.fromEntries(Object.entries(rows).map(([t, list]) => [t, list.map(r => JSON.stringify(r)).sort()]));
    assert.deepEqual(sorted(W.ocPhysicalRows(info.prepared, dec.domain)), sorted(now), 'المرآةُ = ترميزُ اليوم صفاً بصف: ' + resource);
  }
});

test('(٣) الترحيلُ والمرآة يعطيان الصفوفَ نفسَها: قاعدةٌ رُحِّلت = ترميزُ اليوم للوثيقة نفسِها', async () => {
  const W = await worker(), old = oldCodec(), { DB, env } = await v11WithOldRows(W, old);
  permit(DB, W); await W.migrateDb(env);
  for (const [resource, doc] of Object.entries(DOCS)) {
    const info = W.opInfo('bsdept:' + DEPT + ':' + resource), now = W.ocPhysicalRows(info.prepared, W.ocConvert(info.prepared, DEPT, resource, doc, true));
    for (const [table, rows] of Object.entries(now)) {
      const cols = Object.keys(rows[0] || { row_key: 1 }), order = list => list.map(r => JSON.stringify(cols.map(c => r[c]))).sort();
      assert.deepEqual(order(DB.q('SELECT ' + cols.join(',') + ' FROM ' + table + ' WHERE department_id=? AND resource=?', DEPT, resource)), order(rows), resource + ' · ' + table);
    }
  }
});
