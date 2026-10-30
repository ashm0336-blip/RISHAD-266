/* KIVO_265 · TSK-5 — المهامُّ المتكررة ظاهرةٌ في شجرة الصلاحيات الحالية بلا مفتاحٍ ولا صفحةٍ ولا رقاقةٍ جديدة (سجلُّ v24.9 مجمَّد):
   منطقُ الإدارة الحقيقي (src/modules/admin/logic.js · t24Rows/tskRecLegacy) في vm فوق السجلّ والبيان المولَّدَين الحقيقيَّين (340 · 255) —
   ومحرّكُ p24 بديلٌ يقول «داخل السقف/قابلٌ للمنح» (الحسابُ نفسُه يثبته k256perm في المتصفح مقابل الخادم):
     (أ) ورقةُ «المهام» (المفرودة) تحمل ملاحظةَ التكرار بأسماء المفاتيح من السجلّ نفسِه (فتطابق الرقاقات) — والرقاقاتُ هي مفاتيحُ السجلّ حرفاً
     (ب) تلميحُ task.create / task.edit / task.assign يُلحق ما يشمله كلٌّ منها في التكرار (سقفُ الإدارة · المنحُ للموظف) — ولا غيرُها · وسابقةُ «يظهر في» باقية
     (ج) شجرةُ الأفعال الستة (legacy): تلميحُ مربّع ورقة «المهام» وحده يُلحق «إضافة/تعديل» — والبنيةُ (الصفوف · الأفعال) كما هي */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';

const REG = JSON.parse(fs.readFileSync(path.join(SRC, 'permissions', 'registry', 'registry-v24.9.json'), 'utf8'));
const TREE = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests', 'perm-tree24.json'), 'utf8'));
const LBL = Object.fromEntries(REG.registry.map((e) => [e.key, e.label]));
const TASKS = TREE.containers.flatMap((c) => c.leaves).find((l) => l.owner === 'tasks');
/* عباراتُ التلميح والملاحظة وحدها (لا «تسكين متكرر» في سببِ حجزِ lens.dist.redistribute) */
const RXT = /يشمل (?:إنشاءَ مهمةٍ|تعديلَ التكرار|مكلَّفي المهمة)/, RXN = /التكرار:|مهمةٍ متكررة/;
const J = (x) => JSON.parse(JSON.stringify(x));   /* مصفوفاتُ vm من عالمٍ آخر */

function load() {
  const KIVO = {};
  const ctx = { KIVO, console, JSON, Object, Array, String, Number, RegExp, Set, Map, Error, Math, Date };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SRC, 'manifests', '255-page-manifest.js'), 'utf8'), ctx, { filename: '255-page-manifest.js' });
  vm.runInContext(fs.readFileSync(path.join(SRC, 'permissions', '340-registry-v24-9.js'), 'utf8') + '\n;globalThis.__R = KIVO_REGISTRY;', ctx, { filename: '340-registry-v24-9.js' });
  KIVO.KIVO_MANIFEST = ctx.KIVO_MANIFEST; KIVO.KIVO_REGISTRY = ctx.__R;
  KIVO.BassamCount = (n, w) => n + ' ' + w;
  /* p24 بديل: كلُّ مفتاحٍ نشطٍ داخل السقف وقابلٌ للمنح — والفروعُ الأخرى (بالدور · محجوز · ذاتي) من السجلّ الحقيقي */
  KIVO.BassamPerm = { ACT_NAMES: { view: 'عرض', add: 'إضافة', edit: 'تعديل', del: 'حذف', approve: 'اعتماد', export: 'تصدير' },
    p24: { ix: () => ({ needMgr: {}, atomless: {}, superOnly: {} }), keyOn: () => true, leafOn: () => true, lensHosted: () => true, lensOf: () => null, DERIVE: {}, grantable: () => true } };
  KIVO.BassamPageKit = { base: (B) => class extends B {} };
  ctx.DCLogic = class { constructor() { this.state = {}; } setState() {} };
  vm.runInContext(fs.readFileSync(path.join(SRC, 'modules', 'admin', 'logic.js'), 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'admin/logic.js' });
  return { C: ctx.__C, KIVO };
}
const { C } = load();
const C24 = { lens: () => true };
/* صفوفُ الشجرة كما تُرسم: كلُّ الحاويات مفرودةٌ وكلُّ أوراقها مفتوحة */
function rows(mode) {
  const c = Object.create(C.prototype), S = c.t24Struct();
  assert.ok(S && S.length, 'بنيةُ الشجرة من البيان والسجلّ الحقيقيَّين');
  const exp = {}, lx = {};
  S.forEach((x) => { exp[x.id] = 1; x.leaves.forEach((l) => { lx[l.owner] = 1; }); });
  const md = c.t24Rows({ mode, ceil: C24, on: {}, lens: [], exp, leafExp: lx, canEdit: !0, target: { role: 'staff', mgr: !1 } });
  assert.equal(md.ok, !0, 't24Rows يعمل');
  return md.rows;
}
const keysRow = (R, owner) => R.find((r) => r.isKeys && r.key === owner + '#keys');
const tipOf = (R, k) => (keysRow(R, 'tasks').keys.find((x) => x.k === k) || {}).tip || '';

for (const mode of ['cap', 'emp', 'tpl']) {
  test('[' + mode + '] (أ) ورقةُ «المهام»: ملاحظةُ التكرار بأسماء السجلّ · والرقاقاتُ = مفاتيحُ السجلّ حرفاً (لا رقاقةَ جديدة)', () => {
    const R = rows(mode), kr = keysRow(R, 'tasks');
    assert.ok(kr, 'صفُّ مفاتيح «المهام» حاضرٌ مفروداً');
    const want = 'التكرار: إنشاءُ مهمةٍ متكررة = «' + LBL['task.create'] + '» (+ «' + LBL['task.assign'] + '») · تعديلُ التكرار وإيقافُه واستئنافُه وإنهاؤه = «' + LBL['task.edit'] + '»';
    assert.equal(kr.noteOn, true, 'الملاحظةُ ظاهرة');
    assert.equal(kr.note, want);
    assert.deepEqual(J(kr.keys.filter((x) => x.kind !== 'resv').map((x) => x.k).sort()), TASKS.keys.slice().sort(), 'الرقاقاتُ = مفاتيحُ الورقة في perm-tree24.json');
    assert.deepEqual(J(kr.keys.map((x) => x.name)), J(kr.keys.map((x) => LBL[x.k])), 'أسماءُ الرقاقات من السجلّ');
    const others = R.filter((r) => r.isKeys && r.key !== 'tasks#keys' && RXN.test(r.note || ''));
    assert.deepEqual(J(others.map((r) => r.key)), [], 'لا ورقةَ أخرى تحمل ملاحظةَ التكرار');
  });

  test('[' + mode + '] (ب) تلميحُ task.create / task.edit / task.assign يُلحق ما يشمله التكرار — ولا مفتاحَ غيرُها · و«يظهر في» باقٍ', () => {
    const R = rows(mode);
    const cr = tipOf(R, 'task.create'), ed = tipOf(R, 'task.edit'), as = tipOf(R, 'task.assign');
    assert.ok(cr.includes(' · يشمل إنشاءَ مهمةٍ لمرة واحدة أو متكررة (يومي · أسبوعي · شهري)') && cr.includes('task.create'), cr);
    /* مراجعة T1: التحويلُ إلى متكررة يحتاج «إنشاء مهمة» و«إسناد/إعادة إسناد» معاً (073 tkRecurStart: task.create + task.edit + task.assign) */
    assert.ok(ed.includes(' · يشمل تعديلَ التكرار وإيقافَه مؤقتاً واستئنافَه وإنهاءَه، وتحويلَ مهمةٍ إلى متكررة مع «' + LBL['task.create'] + '» و«' + LBL['task.assign'] + '»') && ed.includes('task.edit'), ed);
    assert.ok(as.includes(' · يشمل مكلَّفي المهمة المتكررة') && as.includes('task.assign'), as);
    const all = R.filter((r) => r.isKeys).flatMap((r) => r.keys);
    assert.deepEqual(J(all.filter((x) => RXT.test(x.tip || '')).map((x) => x.k).sort()), ['task.assign', 'task.create', 'task.edit'], 'التلميحُ على المفاتيح الثلاثة وحدها');
    const ind = all.find((x) => x.k === 'report.indicators.view');
    assert.ok(ind && /يظهر في «مؤشرات الإدارة ← مؤشرات التشغيل اليومي»/.test(ind.tip), 'سابقةُ t24Shown كما هي: ' + (ind && ind.tip));
  });
}

test('(ج) شجرةُ الأفعال الستة (legacy): تلميحُ مربّع «المهام» وحده يذكر التكرار بـ«إضافة»/«تعديل» — والصفوفُ والأفعالُ كما هي', () => {
  const c = Object.create(C.prototype);
  assert.equal(typeof c.tskRecLegacy, 'function', 'tskRecLegacy موجودة');
  const acts = () => ['view', 'add', 'edit', 'del', 'approve', 'export'].map((k) => ({ k, name: k, on: !1 }));
  const mk = () => [
    { kind: 'cont', isCont: !0, isLeaf: !1, key: 'daily', name: 'المتابعة اليومية' },
    { kind: 'leaf', isLeaf: !0, isCont: !1, key: 'tasks', name: 'المهام', child: !0, chkTip: 'إلغاء كل الأفعال', acts: acts() },
    { kind: 'leaf', isLeaf: !0, isCont: !1, key: 'dreport', name: 'التقرير اليومي', child: !0, chkTip: 'إلغاء كل الأفعال', acts: acts() },
  ];
  const before = mk(), out = c.tskRecLegacy(mk());
  assert.equal(out.length, before.length, 'لا صفَّ يُضاف ولا يُحذف');
  assert.equal(out[1].chkTip, 'إلغاء كل الأفعال · التكرار: إنشاءُ مهمةٍ متكررة = «إضافة» (+ «تعديل» لمكلَّفيها) · تعديلُ التكرار وإيقافُه واستئنافُه وإنهاؤه = «تعديل»');
  assert.equal(out[2].chkTip, before[2].chkTip, 'الأوراقُ الأخرى كما هي');
  out.forEach((r, i) => {
    const { chkTip: a, ...ra } = r, { chkTip: b, ...rb } = before[i];
    assert.deepEqual(JSON.parse(JSON.stringify(ra)), JSON.parse(JSON.stringify(rb)), 'لا يتغيّر في الصفّ إلا التلميح: ' + r.key);
  });
  assert.deepEqual(J(c.tskRecLegacy([])), []);
  assert.deepEqual(c.tskRecLegacy(undefined), undefined);
});
