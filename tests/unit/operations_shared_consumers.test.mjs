import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

const source = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('the existing identity resolver displays a legacy token from typed employees without moving or granting permissions', () => {
  const user = { id: 'TEST_ONLY staff', role: 'staff', deptId: 'TEST_ONLY dept', ekey: 'TEST_ONLY old nid', name: 'TEST_ONLY account snapshot' };
  let employees = [{ eid: 'TEST_ONLY stable eid', nid: user.ekey, name: 'TEST_ONLY current employee name' }];
  const grants = { [user.ekey]: { 'emps/data': ['view'] } }, before = JSON.stringify({ user, grants }), writes = [];
  const templates = [{ id: 'TEST_ONLY template', name: 'TEST_ONLY existing role', perms: grants[user.ekey] }];
  const I = { cur: () => user, curDept: () => user.deptId, isMgrKey: () => false,
    empPerms: token => grants[token] || {}, empTpl: () => 'TEST_ONLY template', cleanLeafPerms: value => value,
    deptCap: () => ['emps'], can: () => false, rawUsers: () => [user],
    RAW: { getItem: (_key) => JSON.stringify(templates) },
  };
  const storage = { getItem: k => { if (k.includes('employees')) throw Error('No legacy business read'); return JSON.stringify(templates); }, setItem: (...args) => writes.push(args) };
  I.RAW.getItem = function (_key) { return storage.getItem(_key); };
  const context = { KIVO: { __BS_I: { auth: I }, __BS_SRV: { operations: { get: () => employees, reference: () => employees } }, BassamCount: n => String(n) }, localStorage: storage, location: { search: '' }, window: {} };
  vm.runInNewContext(source('src/services/490-emp-key.js'), context);
  vm.runInNewContext(source('src/permissions/334-perm-tree-tpl.js'), context);
  const displayed = context.KIVO.BassamAuth.display();
  assert.equal(displayed.name, employees[0].name); assert.equal(displayed.role, templates[0].name);
  assert.equal(context.KIVO.BassamPerm.can('emps', 'edit'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(context.KIVO.BassamPerm.empPerms('TEST_ONLY stable eid'))), {});
  assert.equal(JSON.stringify({ user, grants }), before); assert.deepEqual(writes, []);
  employees = [];
  assert.equal(context.KIVO.BassamEmp.resolve(employees, user.ekey), null, 'An unresolved legacy link is not assigned a fabricated employee');
  assert.equal(context.KIVO.BassamAuth.display().name, user.name);
});

function actualDeclarations(file, names) {
  const text = source(file), found = new Map();
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && names.includes(node.id.name)) found.set(node.id.name, text.slice(node.start, node.end));
    for (const [key, child] of Object.entries(node)) if (key !== 'loc') Array.isArray(child) ? child.forEach(visit) : visit(child);
  };
  visit(parse(text, { ecmaVersion: 'latest' }));
  for (const name of names) assert.ok(found.has(name), 'Missing actual declaration ' + name);
  return names.map(name => found.get(name)).join('\n');
}

test('manager identity collision checks await all typed employee references and reject denied reads', async () => {
  let release, deny = false, ready = false;
  const gate = new Promise(resolve => { release = resolve; }), reads = [], writes = [];
  const departments = [{ id: 'TEST_ONLY A', name: 'TEST_ONLY A' }, { id: 'TEST_ONLY B', name: 'TEST_ONLY B' }];
  const service = { context: () => ({ uid: 'TEST_ONLY owner', dept: departments[0].id, generation: 0 }),
    read: async keys => { reads.push(keys); await gate; ready = true; return { ok: 1, denied: deny ? [keys[0]] : [] }; },
    reference: k => { assert.equal(ready, true); return k.includes('TEST_ONLY B:') ? [{ name: 'TEST_ONLY reserved employee', nid: '1234567890' }] : []; },
  };
  const context = { KIVO: { __BS_SRV: { operations: service } }, D: { list: () => departments, has: () => true },
    requireSuper: () => null, deptManagers: () => [], roleTitle: () => '', taken: () => false,
    hashPw: () => { writes.push('hash'); return Promise.resolve('TEST_ONLY hash'); }, writeUsers: () => writes.push('users'),
  };
  vm.runInNewContext(actualDeclarations('src/auth/330-auth.js', ['empHolder', 'setDeptManager']), context);
  const input = { deptId: departments[0].id, name: 'TEST_ONLY new manager', nid: '1234567890', empno: '735184' };
  let finished = false; const pending = context.setDeptManager(input).then(value => { finished = true; return value; });
  await Promise.resolve(); assert.equal(finished, false); assert.equal(reads.length, 1); assert.equal(reads[0].length, 2);
  release(); const collision = await pending;
  assert.equal(collision.ok, false); assert.match(collision.err, /TEST_ONLY reserved employee/); assert.deepEqual(writes, []);
  deny = true;
  const refused = await context.setDeptManager(input); assert.equal(refused.ok, false); assert.match(refused.err, /تعذّر التحقق/); assert.deepEqual(writes, []);
});

test('a manager action rechecks its authority after the awaited employee references', async () => {
  let release, allowed = true, guardCalls = 0;
  const gate = new Promise(resolve => { release = resolve; }), writes = [];
  const context = { KIVO: { __BS_SRV: { operations: { context: () => ({ uid: 'TEST_ONLY owner', dept: 'TEST_ONLY A', generation: 0 }), read: async () => { await gate; return { ok: 1, denied: [] }; }, reference: () => [] } } },
    D: { list: () => [{ id: 'TEST_ONLY A' }], has: () => true },
    requireSuper: () => { guardCalls++; return allowed ? null : { ok: false, err: 'TEST_ONLY authority changed' }; },
    deptManagers: () => [], roleTitle: () => '', taken: () => false,
    hashPw: () => { writes.push('hash'); return Promise.resolve('TEST_ONLY hash'); }, writeUsers: () => writes.push('users'),
  };
  vm.runInNewContext(actualDeclarations('src/auth/330-auth.js', ['empHolder', 'setDeptManager']), context);
  const pending = context.setDeptManager({ deptId: 'TEST_ONLY A', name: 'TEST_ONLY new manager', nid: '1234567890', empno: '735184' });
  allowed = false; release(); const result = await pending;
  assert.equal(result.err, 'TEST_ONLY authority changed'); assert.equal(guardCalls, 2); assert.deepEqual(writes, []);
});
