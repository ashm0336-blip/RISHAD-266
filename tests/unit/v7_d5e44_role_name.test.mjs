/* V7 · د5-هـ (44) — اسمُ الصلاحية في كل مكان = اسمُ الدور الممنوح (قرارُ المالك · SPEC44 البند 7) والطاقمُ الإشرافي بعلامة الدور sup:true.
   الكتلُ الحقيقية (334 · منطقُ الإدارة · منطقُ «صفحتي») في node:vm، ومحرّكُ الأدوار بديلُ اختبار (perm44_stub.mjs) — TEST_ONLY:
     ① permLabel = اسمُ الدور | «صلاحيات مخصّصة» | «بلا صلاحيات» — وفرعُ «عدد الصفحات» محذوف؛ بغياب المحرّك: مخصّصةٌ أو بلا صلاحيات من المنح القائم
     ② الأماكنُ الأربعة: بطاقةُ المستخدم في القائمة الجانبية (BassamAuth.display) · بطاقةُ قائمة الحسابات (adRole) · سطرُ الدور في «صفحتي» ·
        سطرُ «الصلاحيات» في نافذة «الإدارة» — كلُّها من permLabel بإدارة الحساب
     ③ BassamSup: إشرافيٌّ = دورُه sup:true (لا استنتاجَ من الاسم وقتَ التشغيل) · بغياب المحرّك لا أحد */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC } from './harness.mjs';
import { perm44Stub } from './perm44_stub.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const D = 'TEST_ONLY_d1';
const DATA = () => ({ [D]: {
  roles: [{ id: 'r_lead', name: 'TEST_ONLY رئيس الوردية', sup: true, sys: {} }, { id: 'r_view', name: 'TEST_ONLY مراقب', sup: false, sys: {} }],
  people: { TEST_ONLY_e1: { role: 'r_lead' }, TEST_ONLY_e2: { role: 'r_view' } }, custom: { TEST_ONLY_e3: true } } });

function load334({ grants = {}, user = null } = {}) {
  const I = { cur: () => user, curDept: () => D, isMgrKey: (k) => /^mgr:/.test(String(k || '')), empPerms: (t) => grants[t] || {}, cleanLeafPerms: (v) => v,
    deptCap: () => [], can: () => false, rawUsers: () => (user ? [user] : []), RAW: { getItem: () => null } };
  const ctx = { KIVO: { __BS_I: { auth: I }, __BS_SRV: { operations: { get: () => [], reference: () => [] } }, BassamCount: (n, w) => n + ' ' + w },
    localStorage: { getItem: () => null, setItem() {} }, location: { search: '' }, window: {} };
  vm.createContext(ctx);
  vm.runInContext(rd('services/490-emp-key.js'), ctx); vm.runInContext(rd('permissions/334-perm-tree-tpl.js'), ctx);
  return ctx.KIVO;
}

test('① permLabel: اسمُ الدور · «صلاحيات مخصّصة» · «بلا صلاحيات» — بلا عدد صفحات، وبغياب المحرّك من المنح القائم', () => {
  const K = load334({ grants: { TEST_ONLY_e9: { tasks: ['view'], plan: ['view'] } } });
  /* بغياب المحرّك */
  assert.equal(K.BassamAuth.permLabel('TEST_ONLY_e9', D), 'صلاحيات مخصّصة', 'منحٌ بلا دور (كان: «2 صفحة»)');
  assert.equal(K.BassamAuth.permLabel('TEST_ONLY_none', D), 'بلا صلاحيات');
  assert.equal(K.BassamAuth.permLabel('', D), '');
  /* بالمحرّك */
  K.Perm44 = perm44Stub(DATA());
  assert.equal(K.BassamAuth.permLabel('TEST_ONLY_e1', D), 'TEST_ONLY رئيس الوردية');
  assert.equal(K.BassamAuth.permLabel('TEST_ONLY_e3', D), 'صلاحيات مخصّصة');
  assert.equal(K.BassamAuth.permLabel('TEST_ONLY_e4', D), 'بلا صلاحيات');
  const src = rd('permissions/334-perm-tree-tpl.js'), body = src.slice(src.indexOf('function permLabel('), src.indexOf('KIVO.BassamAuth = {'));
  assert.doesNotMatch(body, /BassamCount|صفحة/, 'فرعُ «عدد الصفحات» محذوف');
  assert.match(body, /P4\.roleNameOf\(ekey, did\)/, 'اسمُ الدور من المحرّك');
});

test('② المكان ١ — بطاقةُ المستخدم في القائمة الجانبية (BassamAuth.display ← permLabel بإدارة الحساب)', () => {
  const user = { id: 'TEST_ONLY_u', role: 'staff', deptId: D, ekey: 'TEST_ONLY_e2', name: 'TEST_ONLY موظف' };
  const K = load334({ user }); K.Perm44 = perm44Stub(DATA());
  assert.equal(K.BassamAuth.display().role, 'TEST_ONLY مراقب');
  const RL = rd('layouts/root-logic.js'); assert.match(RL, /BassamAuth\.display\(\)/, 'القائمةُ الجانبية تعرض display().role');
});

test('② المكان ٢ — بطاقةُ قائمة الحسابات في «مراقبة الحسابات» (adRole): الموظفُ باسم دوره، والمديرُ كما كان', () => {
  const K = load334(); K.Perm44 = perm44Stub(DATA());
  const ctx = { KIVO: Object.assign(K, { BassamPageKit: { base: (B) => class extends B {} } }), JSON, Object, Array, String, Number, RegExp, Set, Map, Error, Math, Date, console };
  ctx.KIVO.BassamAuth.gmRoleLabel = () => 'TEST_ONLY gm';
  ctx.DCLogic = class { constructor() { this.state = {}; } setState() {} };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(rd('modules/admin/logic.js') + '\n;globalThis.__C = Component;', ctx, { filename: 'admin/logic.js' });
  const a = Object.create(ctx.__C.prototype);
  assert.equal(a.adRole({ role: 'staff', ekey: 'TEST_ONLY_e1', deptId: D, title: 'TEST_ONLY مسمّى حرّ' }), 'TEST_ONLY رئيس الوردية', 'اسمُ الدور قبل المسمّى الحرّ');
  assert.equal(a.adRole({ role: 'staff', ekey: 'TEST_ONLY_e3', deptId: D }), 'صلاحيات مخصّصة');
  assert.equal(a.adRole({ role: 'staff', ekey: 'TEST_ONLY_e4', deptId: D }), 'بلا صلاحيات');
  assert.equal(a.adRole({ role: 'staff', mgr: true, ekey: 'TEST_ONLY_e1', deptId: D }), 'مدير الإدارة', 'المديرُ بالشارة كما كان');
  assert.equal(a.adRole({ role: 'super' }), 'مسؤول المنصة');
  delete K.Perm44;
  assert.equal(a.adRole({ role: 'staff', ekey: 'TEST_ONLY_e1', deptId: D }), 'موظف', 'بغياب المحرّك: كما كان');
});

test('② المكانان ٣ و٤ — سطرُ الدور في «صفحتي» وسطرُ «الصلاحيات» في نافذة «الإدارة»: permLabel بإدارة الحساب قبل المسمّى للموظف', () => {
  const P = rd('modules/profile/logic.js');
  const role = P.slice(P.indexOf('if (i.isSuper) return "مسؤول المنصة";'), P.indexOf('cs0 = F && F.cs'));
  assert.ok(role.indexOf('t.permLabel(e.ekey, e.deptId)') !== -1 && role.indexOf('t.permLabel(e.ekey, e.deptId)') < role.indexOf('myTitle'), 'سطرُ الدور: اسمُ الدور أولاً');
  const mg = P.slice(P.indexOf('pfDeptVals(i, e) {'), P.indexOf('const chain = (id) =>', P.indexOf('pfDeptVals(i, e) {')));
  assert.match(mg, /"staff" === e\.role && !i\.isAppt && AU && AU\.permLabel && e\.ekey\) return AU\.permLabel\(e\.ekey, e\.deptId\) \|\| "بلا صلاحيات"/, '«الصلاحيات»: اسمُ الدور');
  assert.match(P, /R\("mgr", "الصلاحيات", title, \{ h: "1" \}\)/);
});

test('③ BassamSup: الإشرافيُّ بعلامة الدور sup:true — لا استنتاجَ من الاسم · بغياب المحرّك لا أحد', () => {
  const K = load334();
  assert.equal(K.BassamSup.isSup('TEST_ONLY_e1', D), false, 'بلا محرّك: لا أحد');
  const data = DATA(); data[D].roles.push({ id: 'r_name', name: 'TEST_ONLY رئيس بلا علامة', sup: false, sys: {} }); data[D].people.TEST_ONLY_e5 = { role: 'r_name' };
  K.Perm44 = perm44Stub(data);
  assert.equal(K.BassamSup.isSup('TEST_ONLY_e1', D), true); assert.equal(K.BassamSup.supName('TEST_ONLY_e1', D), 'TEST_ONLY رئيس الوردية');
  assert.equal(K.BassamSup.isSup('TEST_ONLY_e2', D), false); assert.equal(K.BassamSup.supName('TEST_ONLY_e2', D), '');
  assert.equal(K.BassamSup.isSup('TEST_ONLY_e5', D), false, 'الاسمُ «رئيس…» وحده لا يجعله إشرافياً (الترحيلُ نقل الاستنتاجَ مرّةً واحدة)');
  assert.equal(K.BassamSup.isSupRole({ sup: true }), true); assert.equal(K.BassamSup.isSupRole({ name: 'رئيس' }), false);
  assert.equal(K.BassamSup.tpls, undefined, 'لا قوالب'); assert.equal(K.BassamSup.tplOf, undefined);
});
