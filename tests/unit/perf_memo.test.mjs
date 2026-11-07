/* KIVO_265 · أداء (ملاحظةُ المالك 2026-10-19 «الكتابة تتأخر»): قياسٌ على Test بـ13,000 حساب — كل ضغطة مفتاح 300–470 مللي ثانية لأن الرسمَ
   يعيد مسحَ جدول الحسابات في كل فحص صلاحية (cur) ويعيد قسمَي الحسابات ونظرة عامة كاملين. يُثبت هنا: فهرسُ الحسابات يعطي النتيجةَ نفسَها
   التي كان يعطيها المسح (بالمعرّف · مديرو الإدارة بقاعدة المفتاح · مديرو العقد) ويسقط مع تغيّر الجدول · pubUsers بلا بصمات ونسخةٌ جديدة
   للمصفوفة في كل نداء · والربطُ في الصفحات (الجدول الشهري · الإدارات) ومفتاحُ ذاكرة myPerms. */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const A = rd('src/auth/330-auth.js');
function fn(name) {
  const i = A.indexOf('\n  function ' + name + '('); assert.ok(i > 0, name + ' موجودة');
  let j = A.indexOf('{', i), d = 0;
  for (let k = j; k < A.length; k++) { if (A[k] === '{') d++; else if (A[k] === '}' && --d === 0) { j = k + 1; break; } }
  return A.slice(i + 3, j);
}
function world(users) {
  const ctx = { _usersMemo: users, _uIx: null, _uIxSrc: null, _usersVer: 0, _pubMemo: null, _pubSrc: null, _smMemo: null, _smDept: null, KIVO: {}, String, Array, Object };
  ctx.rawUsers = () => ctx._usersMemo;
  ctx.curDept = () => 'd1';
  vm.runInNewContext([fn('mgrKeyOf'), fn('isMgrKey'), fn('uIx'), fn('userById'), fn('usersVer'), fn('deptManagers'), fn('groupManagers'), fn('pubUsers'), fn('_bustUsers')].join('\n') + '\nthis.F = { userById, usersVer, deptManagers, groupManagers, pubUsers, _bustUsers };', ctx);
  return ctx;
}
const U = [
  { id: 'su', un: 'admin', role: 'super', ph: 'p2$x' },
  { id: 'm1', un: '5555555555', role: 'staff', deptId: 'd1', ekey: 'mgr:d1', ph: 'p2$y' },
  { id: 'm1b', un: '5555555556', role: 'staff', deptId: 'd1', ekey: 'mgr:d1:2', ph: 'p2$y' },
  { id: 'mx', un: '5555555557', role: 'staff', deptId: 'd1', ekey: 'mgr:d10', ph: 'p2$y' },
  { id: 'e1', un: '2000010001', role: 'staff', deptId: 'd1', ekey: 'e-1', ph: 'p2$z' },
  { id: 'g1', un: '7000000001', role: 'gm', gid: 'sec', ekey: 'gm:sec', ph: 'p2$w' },
  { id: 'g2', un: '7000000002', role: 'gm', gid: 'sec', ekey: 'gm:sec:2', ph: 'p2$w' },
];
const scanMgrs = (l, d) => l.filter((x) => x.role === 'staff' && x.deptId === d && String(x.ekey || '').slice(0, 4) === 'mgr:' && (x.ekey === 'mgr:' + d || String(x.ekey).indexOf('mgr:' + d + ':') === 0));

test('الفهرس = المسح: بالمعرّف (صارم) · مديرو الإدارة بقاعدة المفتاح (mgr:d1 و mgr:d1:n لا mgr:d10) · مديرو العقدة', () => {
  const w = world(U.slice()), F = w.F;
  assert.equal(F.userById('m1').id, 'm1'); assert.equal(F.userById('zz'), null); assert.equal(F.userById(undefined), null);
  assert.deepEqual(JSON.parse(JSON.stringify(F.deptManagers('d1').map((x) => x.id))), scanMgrs(U, 'd1').map((x) => x.id));
  assert.deepEqual(JSON.parse(JSON.stringify(F.deptManagers('d1').map((x) => x.id))), ['m1', 'm1b'], 'mgr:d10 ليس مدير d1');
  assert.deepEqual(JSON.parse(JSON.stringify(F.deptManagers('d9'))), []);
  assert.deepEqual(JSON.parse(JSON.stringify(F.groupManagers('sec').map((x) => x.id))), ['g1', 'g2']); assert.deepEqual(JSON.parse(JSON.stringify(F.groupManagers('nope'))), []);
});

test('pubUsers بلا بصمات · مصفوفةٌ جديدة في كل نداء (الفرزُ في مكانه لا يفسد غيرَه) · الفهرسُ يسقط مع تغيّر الجدول وusersVer يرتفع', () => {
  const w = world(U.slice()), F = w.F;
  const a = F.pubUsers(), b = F.pubUsers();
  assert.ok(a.every((u) => !('ph' in u)), 'لا ph'); assert.notEqual(a, b, 'مصفوفةٌ مختلفة'); assert.equal(a[0], b[0], 'العناصرُ مذكورة');
  a.sort((x, y) => (x.id < y.id ? 1 : -1)); assert.equal(F.pubUsers()[0].id, 'su', 'الفرزُ في مكانه لم يغيّر النسخة المذكورة');
  const v0 = F.usersVer();
  F._bustUsers(); w._usersMemo = U.concat([{ id: 'n1', un: '5555555558', role: 'staff', deptId: 'd1', ekey: 'mgr:d1:3', ph: 'p2$q' }]);
  assert.equal(F.usersVer(), v0 + 1);
  assert.equal(F.userById('n1').id, 'n1'); assert.deepEqual(JSON.parse(JSON.stringify(F.deptManagers('d1').map((x) => x.id))), ['m1', 'm1b', 'n1']);
  assert.equal(F.pubUsers().length, U.length + 1);
});

test('الربط: cur() بالفهرس · الواجهةُ العامة userById/usersVer · مفتاحُ myPerms بنسختي العالم · ذاكرةُ الجدول الشهري والإدارات', () => {
  assert.match(A, /var u = userById\(ss\.uid\);/, 'cur بالفهرس');
  assert.match(A, /I\.userById = userById; I\.usersVer = usersVer;/);
  const T = rd('src/permissions/334-perm-tree-tpl.js');
  assert.match(T, /userById: function\(id\)\{ var u = I\.userById \? I\.userById\(id\) : null; if \(!u\) return null; var c = \{\}; for \(var k in u\) if \(k !== 'ph'\) c\[k\] = u\[k\]; return c; \}/, 'الواجهةُ العامة بلا بصمة');
  assert.match(T, /usersVer: function\(\)\{ return I\.usersVer \? I\.usersVer\(\) : 0; \}/);
  const P = rd('src/permissions/331-perm-model.js');
  assert.match(P, /KIVO\.__dcWorld \|\| 0, KIVO\.__dcWrite \|\| 0, RAW\.getItem\.call\(localStorage, 'bassam_platform_v1'\),\n\s*Math\.floor\(Date\.now\(\) \/ 1000\)\]\.join/, 'المفتاحُ بنسختي العالم والثانية');
  assert.ok(!/RAW\.getItem\.call\(localStorage, 'bassam_gdepts_v1'\), RAW\.getItem\.call\(localStorage, 'bassam_depts_v1'\)/.test(P), 'لا قراءةَ لسجلّي الإدارات في المفتاح');
  const S = rd('src/modules/staff/logic.js');
  assert.match(S, /_pcMemo\(n, f\)/); ['"PC:" \+ \(t \|\| "view"\)', '"PCE:" \+ \(t \|\| "view"\)', '"sdCanSet"', '"pmCanSet"'].forEach((k) => assert.ok(S.includes('this._pcMemo(' + k), k));
  const L = rd('src/modules/admin/logic.js');
  assert.match(L, /adUsersVals\(\) \{\n\s*return this\._adMemo\("users", \(\) => this\._adUsersVals0\(\)\);/); assert.match(L, /adVals\(\) \{\n\s*return this\._adMemo\("ov", \(\) => this\._adVals0\(\)\);/);
  assert.match(L, /A\.userById \? A\.userById\(t\.id\)/, '_who بالفهرس');
  assert.match(L, /\[A && A\.usersVer \? A\.usersVer\(\) : 0, KIVO\.__dcWorld \|\| 0, KIVO\.__dcWrite \|\| 0, Math\.floor\(Date\.now\(\) \/ 6e4\), d, t\.usF, t\.usQ, t\.pmQ, t\.adSecQ, t\.rowMenu, t\.admTab, t\.adErr, tag\(t\.usTmp\), tag\(t\.rmItems\), tag\(t\.adOv\), tag\(t\.adPres\)\]/, 'مدخلاتُ المفتاح كاملة');
});
