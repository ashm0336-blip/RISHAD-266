/* V7 · د3 — صلاحياتُ كل نظامٍ من مجلده (tools/perm_parts.py): الجمعُ من «القاعدة + الأنظمة الحاضرة».
     · المستودع: الوثائقُ الأربع المجموعة = الملتزَم (‎--check‎) · كلُّ نظامٍ حاضر يصرّح بملف صلاحياته · السجلُّ المجموع = مصدرُ 340 و004
     · السلوك (في مجلدٍ مؤقت): الإدراجُ في مصفوفة وفي كائن بترتيب (after · seq) مهما كان الحاضر · المسارُ يُحلّ على القاعدة ({by, eq}) ·
       set يُطبَّق بحضور النظام ومن في with وإلا يبقى نصُّ القاعدة · الأعدادُ تُحسب من المجموع · والخطأُ في المسار يُرفض */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, SRC, PYTHON, SYSTEMS } from './harness.mjs';

const py = (code, cwd) => spawnSync(PYTHON, ['-c', code], { cwd: cwd || ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONPATH: path.join(ROOT, 'tools') }) });

test('V7 · د3: المستودع — الوثائقُ المجموعة = الملتزَم، وكلُّ نظامٍ حاضر يصرّح بملف صلاحياته', () => {
  const r = spawnSync(PYTHON, [path.join(ROOT, 'tools', 'perm_parts.py'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /registry-v24\.9\.json/); assert.match(r.stdout, /scope-bindings\/data\.json/);
  for (const k of SYSTEMS) {
    const sj = JSON.parse(fs.readFileSync(path.join(SRC, 'systems', k, 'system.json'), 'utf8')); assert.equal(sj.permissions, 'permissions.json', k + ': system.json يسمّي ملف صلاحياته');
    const pj = JSON.parse(fs.readFileSync(path.join(SRC, 'systems', k, 'permissions.json'), 'utf8')); assert.equal(pj.system, k);
    const rows = (pj.docs.registry || []).map((o) => o.value).filter((v) => v && v.key && v.owner);
    assert.ok(rows.length > 0, k + ': له مفاتيح'); /* د4-ج: مالكُ النظام صفحتُه (award/…) أو تبويبُه داخل صفحة قاعدة (emps/custody) */
    for (const v of rows) assert.ok(v.owner.split('/').slice(0, 2).includes(k), v.key + ' مالكُه من نظامه: ' + v.owner);
  }
  /* القاعدةُ لا تحمل صفاً يملكه نظام */
  const base = JSON.parse(fs.readFileSync(path.join(SRC, 'permissions', 'registry', 'registry.base.json'), 'utf8'));
  for (const e of base.registry) assert.ok(!['award', 'daily', 'dstats', 'dreport', 'irshad', 'plan', 'seized', 'staff', 'tasks'].includes(e.owner.split('/')[0]) && e.owner !== 'emps/custody', 'صفُّ نظامٍ في القاعدة: ' + e.key);
  /* ومصدرُ 340 هو السجلُّ المجموع */
  const reg = JSON.parse(fs.readFileSync(path.join(SRC, 'permissions', 'registry', 'registry-v24.9.json'), 'utf8'));
  const js = fs.readFileSync(path.join(SRC, 'permissions', '340-registry-v24-9.js'), 'utf8');
  assert.ok(js.includes('var KIVO_REGISTRY_DATA = ' + JSON.stringify(reg) + ';\n'), '340 = السجلُّ المجموع مضغوطاً');
});

test('V7 · د3: السلوك — الإدراجُ بالترتيب مهما كان الحاضر · set بشرط with · الأعدادُ من المجموع · المسارُ الخاطئ يُرفض', () => {
  const code = `
import json, perm_parts as PP
base = {'registry': [{'key': 'b1', 'owner': 'p', 'ownerKind': 'page', 'status': 'active', 'grant': 'assignable', 'guard': {'status': 'exists'}, 'references': ['p'], 'note': 'قاعدة'},
                     {'key': 'ref.b2', 'owner': 'p', 'ownerKind': 'page', 'status': 'reserved', 'grant': 'none', 'guard': {'status': 'reserved'}, 'references': []}],
        'owners': [{'id': 'p', 'kind': 'page'}], 'atoms': [], 'featureFlags': [], 'map': {'x': 1, 'z': 3}, 'counts': {}}
row = lambda k, o: {'key': k, 'owner': o, 'ownerKind': 'page', 'status': 'active', 'grant': 'assignable', 'guard': {'status': 'to-bind'}, 'references': []}
A = [{'path': ['registry'], 'after': 0, 'seq': 0, 'value': row('a1', 'a/x')}, {'path': ['registry'], 'after': 1, 'seq': 1, 'value': row('a2', 'a/x')},
     {'path': ['owners'], 'after': 1, 'seq': 0, 'value': {'id': 'a/x', 'kind': 'page'}},
     {'path': ['registry', {'by': 'key', 'eq': 'b1'}, 'references'], 'after': 1, 'seq': 0, 'value': 'a/x'},
     {'path': ['map'], 'key': 'y', 'after': 1, 'seq': 0, 'value': 2},
     {'path': ['registry', {'by': 'key', 'eq': 'b1'}, 'note'], 'set': 'قاعدة + a + b', 'with': ['b']}]
B = [{'path': ['registry'], 'after': 1, 'seq': 0, 'value': row('ref.bb', 'b/x')}, {'path': ['owners'], 'after': 1, 'seq': 1, 'value': {'id': 'b/x', 'kind': 'page'}}]
out = {}
for name, ops in (('all', {'a': A, 'b': B}), ('a', {'a': A}), ('b', {'b': B}), ('none', {})):
    d = PP.finish('registry', PP.apply(base, ops, 't'), False)
    out[name] = {'keys': [e['key'] for e in d['registry']], 'owners': [o['id'] for o in d['owners']], 'refs': d['registry'][[e['key'] for e in d['registry']].index('b1')]['references'],
                 'map': list(d['map']), 'note': [e for e in d['registry'] if e['key'] == 'b1'][0]['note'], 'c': d['counts']}
try:
    PP.apply(base, {'a': [{'path': ['registry', {'by': 'key', 'eq': 'nope'}, 'references'], 'after': 0, 'seq': 0, 'value': 'x'}]}, 't'); out['bad'] = 'accepted'
except SystemExit as e: out['bad'] = str(e)
g = {'bindings': [], 'shadowOnly': [], 'decisions': [], 'toBind': 0, 'counts': {'emittedKeys': 5, 'coveredResources': 2}}
gg = lambda ops: PP.finish('guard-bindings', PP.apply(g, ops, 't'), False)['counts']
out['add'] = [gg({})['emittedKeys'], gg({'a': [{'path': ['counts', 'emittedKeys'], 'add': 3}]})['emittedKeys'], gg({'a': [{'path': ['counts', 'emittedKeys'], 'add': 3}], 'b': [{'path': ['counts', 'emittedKeys'], 'add': 4}, {'path': ['counts', 'coveredResources'], 'add': 1}]})]
out['base'] = [e['key'] for e in base['registry']]
N = {'a': [{'path': ['map'], 'key': 'own', 'after': 1, 'seq': 0, 'value': {'keys': ['k1']}}, {'path': ['registry', {'by': 'key', 'eq': 'b1'}, 'note'], 'sub': 'قاعدة', 'by': 'قاعدة (a)'}],
     'b': [{'path': ['map', 'own', 'keys'], 'after': 1, 'seq': 0, 'value': 'k2', 'needs': ['a']}]}
PP.apply(base, N, 't'); both = PP.apply(base, N, 't'); onlyb = PP.apply(base, {'b': N['b']}, 't')
out['needs'] = [both['map']['own']['keys'], 'own' in onlyb['map'], both['registry'][0]['note'], onlyb['registry'][0]['note']]
print(json.dumps(out, ensure_ascii=False))
`;
  const r = py(code); assert.equal(r.status, 0, r.stderr); const o = JSON.parse(r.stdout);
  assert.deepEqual(o.all.keys, ['a1', 'b1', 'ref.bb', 'a2', 'ref.b2'], 'بالنظامين: after ثم seq');
  assert.deepEqual(o.a.keys, ['a1', 'b1', 'a2', 'ref.b2']); assert.deepEqual(o.b.keys, ['b1', 'ref.bb', 'ref.b2']); assert.deepEqual(o.none.keys, ['b1', 'ref.b2']);
  assert.deepEqual(o.all.owners, ['p', 'a/x', 'b/x']); assert.deepEqual(o.b.owners, ['p', 'b/x']);
  assert.deepEqual(o.all.refs, ['p', 'a/x']); assert.deepEqual(o.b.refs, ['p'], 'إضافةُ نظامٍ داخل صفّ القاعدة تغيب بغيابه');
  assert.deepEqual(o.all.map, ['x', 'y', 'z']); assert.deepEqual(o.none.map, ['x', 'z']);
  assert.equal(o.all.note, 'قاعدة + a + b'); assert.equal(o.a.note, 'قاعدة', 'set لا يُطبَّق بغياب من في with'); assert.equal(o.none.note, 'قاعدة');
  assert.equal(o.all.c.securityActive, 4); assert.equal(o.all.c.reserved, 1); assert.equal(o.all.c.reference, 2, 'reference = مفاتيحٌ تبدأ بـref.');
  assert.equal(o.none.c.securityActive, 1); assert.equal(o.none.c.reference, 1); assert.equal(o.a.c.owners, 2); assert.equal(o.all.c.references, 2); assert.equal(o.none.c.references, 1);
  assert.deepEqual(o.all.c.guards, { exists: 1, toBind: 3, toBuild: 0 });
  assert.match(o.bad, /0 عنصراً يطابق key='nope'/, 'مسارٌ لا يطابق عنصراً في القاعدة يُرفض');
  assert.deepEqual(o.base, ['b1', 'ref.b2'], 'القاعدةُ لا تتبدّل بالجمع');
  assert.deepEqual(o.needs, [['k1', 'k2'], false, 'قاعدة (a)', 'قاعدة'], 'V7 · د5-د2: needs تُدرج في مدخل نظامٍ آخر بعد إدراجه وتُهمل بغيابه · sub يبدّل مقطعاً في نصّ القاعدة بحضور صاحبه');
  assert.equal(o.add[0], 5); assert.equal(o.add[1], 8); assert.equal(o.add[2].emittedKeys, 12); assert.equal(o.add[2].coveredResources, 3, 'add: نصيبُ النظام يُجمع على نصيب القاعدة');
});
