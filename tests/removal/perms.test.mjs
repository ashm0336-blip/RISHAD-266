/* V7 · د3 — اختبارُ الحذف (الصلاحيات): يُشغَّل داخل نسخةٍ حُذف منها مجلدُ نظامٍ أو أكثر ثم أُعيد توليدُها (tools/removal_test.py)،
   ويعمل كذلك في الشجرة الكاملة (لا نظامَ غائب ⇒ فحوصُ الغياب فارغة، والباقي يعمل).
     · لا مفتاحَ ولا ورقةَ ولا ذرّةَ ولا عَلمَ ولا موردَ لنظامٍ غائب في السجلّ المولَّد (المصدر · 340 · 004) ولا في الشجرة ولا في روابط 006 · 008 · 010
     · لا مفتاحَ نظامٍ غائب مكتوباً في أي جزءٍ من القاعدة (أجزاءُ الخادم وكتلُ الواجهة — خارج التعليقات)
     · السجلُّ المجموع يصحّ (validate) · أعدادُه = المحسوب من محتواه · والشجرةُ الملتزَمة = الاشتقاق (tools/perm_tree.py check)
     · الشجرةُ كما تبنيها صفحةُ الإعدادات (t24Struct · t24Rows) لا تحمل حاويةً ولا ورقةً ولا مفتاحاً لنظامٍ غائب
   رموزُ النظام الغائب تُقرأ من مجلده في الشجرة الكاملة (KIVO_FULL_SRC يضبطه removal_test.py). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SRC, ROOT, PYTHON, SYSTEMS } from '../unit/harness.mjs';
import { noComments, scanFiles, relOf, staleAllow, finder } from './names_allow.mjs';
import { roleCleaner, staleRoles, allowCounts, LIMITS } from './role_rule.mjs';
import { busCleaner, baseBusProblems } from './bus_rule.mjs';

const FULL = process.env.KIVO_FULL_SRC || SRC;
const rd = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const allSystems = fs.existsSync(path.join(FULL, 'systems')) ? fs.readdirSync(path.join(FULL, 'systems')).filter((k) => fs.existsSync(path.join(FULL, 'systems', k, 'system.json'))).sort() : [];
const GONE = allSystems.filter((k) => !SYSTEMS.includes(k));

/* رموزُ نظام: ما يصرّح به ملفُّ صلاحياته (مفاتيح · أوراق · أعلام · موارد) */
function tokensOf(k) {
  const p = path.join(FULL, 'systems', k, 'permissions.json'); const out = { keys: new Set(), owners: new Set(), flags: new Set(), resources: new Set() };
  if (!fs.existsSync(p)) return out;
  const docs = JSON.parse(fs.readFileSync(p, 'utf8')).docs || {};
  const walk = (v, key) => {
    if (typeof v === 'string') { if (/^ff\./.test(v)) out.flags.add(v); else if (/^bassam_\w+$/.test(v)) out.resources.add(v); return; }
    if (Array.isArray(v)) { v.forEach((x) => walk(x)); return; }
    if (v && typeof v === 'object') {
      if (typeof v.key === 'string' && typeof v.owner === 'string' && v.guard) out.keys.add(v.key);
      if (typeof v.id === 'string' && typeof v.kind === 'string' && 'manifest' in v) out.owners.add(v.id);
      Object.keys(v).forEach((x) => { if (/^bassam_\w+$/.test(x)) out.resources.add(x); walk(v[x], x); });
    }
  };
  for (const name of Object.keys(docs)) for (const op of docs[name]) { if (typeof op.key === 'string' && /^bassam_\w+$/.test(op.key)) out.resources.add(op.key); if ('value' in op) walk(op.value); }
  return out;
}
const GT = { keys: new Set(), owners: new Set(), flags: new Set(), resources: new Set() };
for (const k of GONE) { const t = tokensOf(k); for (const f of Object.keys(GT)) t[f].forEach((x) => GT[f].add(x)); }
/* موردٌ يذكره نظامٌ غائب وهو موردُ قاعدة (قائمةُ قراءةٍ أضاف إليها مفاتيحه) ليس «موردَ النظام»: موردُ النظام يحمل اسمَه */
const sysRes = [...GT.resources].filter((r) => GONE.some((k) => new RegExp('^bassam_' + k + '(?:_|$)').test(r)));
/* في الكود: المفاتيحُ والأوراقُ والأعلام. وفي وثائق البيانات (JSON): ومعها مواردُ النظام (صفوفُها تغيب معه). */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const rxOf = (toks) => (toks.length ? new RegExp('(?<![\\w.])(' + toks.slice().sort((a, b) => b.length - a.length).map(esc).join('|') + ')(?![\\w])', 'g') : null);
/* د4-ب: ورقةٌ اسمُها كلمةٌ واحدة (صفحةٌ مثل tasks) كلمةٌ عادية في الكود (متغيّر · جزءٌ من معرّف كتلةٍ مشتركة) — تُعدّ رمزاً في الكود حين تكون نصاً كاملاً بين علامتَي اقتباس وحده */
const bareOwners = [...GT.owners].filter((o) => /^[a-z]+$/.test(o)), pathOwners = [...GT.owners].filter((o) => !/^[a-z]+$/.test(o));
const RX_CODE = rxOf([...GT.keys, ...pathOwners, ...GT.flags]), RX_BARE = bareOwners.length ? new RegExp('([\'"])(' + bareOwners.map(esc).join('|') + ')\\1', 'g') : null, RX_DATA = rxOf([...GT.keys, ...GT.owners, ...GT.flags, ...sysRes]);
/* د5-د2: القائمة وقاعدةُ الدور (role_rule.mjs) — تُطبَّق على كل ما تفحصه الاختباراتُ الثلاثة أدناه: سطرُ الدور يُمحى منه المقطعُ المقتبس وحده،
   والمعرّفاتُ المسمّاة بحدود الكلمة، ومقاطعُ المداخل الحرفية لملفها؛ وبقيةُ السطر تُفحص */
const ALLOW = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'removal', 'names.allow.json'), 'utf8'));
const cleanFor = (rel, gone) => {
  const bus = busCleaner(FULL, gone), role0 = roleCleaner(ALLOW.roles, gone), role = (l) => role0(bus(l)), cuts = ALLOW.entries.filter((e) => e.file === '*' || e.file === rel).flatMap((e) => e.match).sort((a, b) => b.length - a.length);
  const pats = ALLOW.patterns.map((x) => new RegExp(x.pattern, 'g'));
  return (line) => { let rest = role(line); for (const q of pats) rest = rest.replace(q, '""'); for (const c of cuts) rest = rest.split(c).join(''); return rest; };
};
const cleanText = (rel, text, gone) => { const f = cleanFor(rel, gone); return text.split('\n').map(f).join('\n'); };
const hits = (text, data) => { const RX = data ? RX_DATA : RX_CODE; const out = RX ? Array.from(text.matchAll(RX), (m) => m[1]) : []; if (!data && RX_BARE) for (const m of text.matchAll(RX_BARE)) out.push(m[2]); return [...new Set(out)]; };
const label = '[' + (SYSTEMS.join(' · ') || 'لا نظام') + ']' + (GONE.length ? ' — الغائب: ' + GONE.join(' · ') : '');

test('د3 · الحذف: السجلُّ والشجرةُ وروابطُ الخادم المولَّدة لا تحمل رمزاً لنظامٍ غائب ' + label, () => {
  if (GONE.length) assert.ok(GT.keys.size > 0 && GT.owners.size > 0, 'رموزُ الأنظمة الغائبة قُرئت من الشجرة الكاملة (' + GT.keys.size + ' مفتاحاً · ' + GT.owners.size + ' ورقة)');
  const files = [['src', 'permissions/registry/registry-v24.9.json'], ['src', 'permissions/340-registry-v24-9.js'], ['src', 'manifests/perm-tree24.json'],
    ['root', 'workers/parts/004-registry-2.js'], ['root', 'workers/parts/006-guard-bindings-2.js'], ['root', 'workers/parts/008-kivo-build-2.js'], ['root', 'workers/parts/010-kivo-scope-2.js'],
    ['root', 'workers/bindings/scope-bindings/data.json'], ['root', 'workers/bindings/guard-bindings/data.json'], ['root', 'workers/bindings/build-bindings/data.json']];
  for (const [base, rel] of files) {
    const p = path.join(base === 'src' ? SRC : ROOT, rel); assert.ok(fs.existsSync(p), rel + ' موجود');
    const js = /\.js$/.test(rel), text = cleanText(rel, js ? noComments(fs.readFileSync(p, 'utf8')) : fs.readFileSync(p, 'utf8'), GONE);
    assert.deepEqual(hits(text, !js), [], rel + ': لا رمزَ لنظامٍ غائب');
  }
});

test('د3 · الحذف: لا مفتاحَ نظامٍ غائب مكتوباً في جزءٍ من القاعدة (الخادم والواجهة — خارج التعليقات) ' + label, () => {
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers', 'parts.json'), 'utf8')).parts.map((p) => path.join(ROOT, 'workers', 'parts', p.file));
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (['systems', 'slots', 'pages'].includes(e.name) ? [] : walk(path.join(d, e.name))) : (/\.js$/.test(e.name) ? [path.join(d, e.name)] : [])));
  const bad = [];
  for (const f of parts.concat(walk(SRC))) { const h = hits(cleanText(relOf(ROOT, f), noComments(fs.readFileSync(f, 'utf8')), GONE)); if (h.length) bad.push(path.relative(ROOT, f) + ': ' + h.slice(0, 5).join(' ')); }
  assert.deepEqual(bad, [], 'أجزاءٌ تحمل رمزَ نظامٍ غائب');
});

test('د3 · الحذف: السجلُّ المجموع يصحّ، وأعدادُه = المحسوب من محتواه، والشجرةُ الملتزَمة = الاشتقاق ' + label, () => {
  const REG = JSON.parse(rd('permissions', 'registry', 'registry-v24.9.json'));
  const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(rd('permissions', '340-registry-v24-9.js') + '\n;globalThis.__R = KIVO_REGISTRY;', ctx);
  const v = ctx.__R.validate(); assert.equal(v.ok, true, 'validate: ' + JSON.stringify(v.errors));
  const act = REG.registry.filter((e) => e.status === 'active'), c = REG.counts;
  assert.equal(c.securityActive, act.length); assert.equal(c.assignable, act.filter((e) => e.grant === 'assignable').length);
  assert.equal(c.reserved, REG.registry.length - act.length); assert.equal(c.owners, REG.owners.length); assert.equal(c.atoms, REG.atoms.length);
  assert.equal(c.reference, REG.registry.filter((e) => e.key.startsWith('ref.')).length); assert.equal(c.references, REG.registry.reduce((a, e) => a + e.references.length, 0));
  assert.equal(c.pageOwned + c.plugin + c.platform + c.referenceOwned, act.length, 'الأنواعُ الأربعة تجمع النشط');
  for (const o of REG.owners) assert.ok(SYSTEMS.includes(o.id.split('/')[0]) || !allSystems.includes(o.id.split('/')[0]), 'ورقةُ نظامٍ غائب في السجل: ' + o.id);
  const TREE = JSON.parse(rd('manifests', 'perm-tree24.json'));
  assert.equal(TREE.counts.leaves, REG.owners.length, 'أوراقُ الشجرة = مالكو السجل'); assert.equal(TREE.counts.keys, act.length, 'مفاتيحُ الشجرة = النشط');
  for (const [tool, arg] of [['tools/perm_parts.py', '--check'], ['tools/perm_tree.py', 'check']]) {
    const r = spawnSync(PYTHON, [path.join(ROOT, tool), arg], { cwd: ROOT, encoding: 'utf8' }); assert.equal(r.status, 0, tool + ' ' + arg + ': ' + (r.stdout + r.stderr).slice(-400));
  }
});

test('د3 · الحذف: الشجرةُ كما تبنيها صفحةُ الإعدادات لا تحمل حاويةً ولا ورقةً ولا مفتاحاً لنظامٍ غائب ' + label, () => {
  const KIVO = {}; const ctx = { KIVO, console, JSON, Object, Array, String, Number, RegExp, Set, Map, Error, Math, Date }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(rd('manifests', '255-page-manifest.js'), ctx);
  vm.runInContext(rd('permissions', '340-registry-v24-9.js') + '\n;globalThis.__R = KIVO_REGISTRY;', ctx);
  KIVO.KIVO_MANIFEST = ctx.KIVO_MANIFEST; KIVO.KIVO_REGISTRY = ctx.__R;
  KIVO.BassamCount = Object.assign((n, w) => n + ' ' + (Array.isArray(w) ? w[5] : w), { agr: (n, a) => a });
  KIVO.BassamPerm = { deptCap: () => ['emps'], p24: { ix: () => ({ needMgr: {}, atomless: {}, superOnly: {} }), keyOn: () => true, leafOn: () => true, lensHosted: () => true, lensOf: () => null, DERIVE: {}, grantable: () => true } };
  KIVO.BassamDepts = { list: () => [{ id: 'u1', name: 'TEST_ONLY' }] }; KIVO.BassamPageKit = { base: (B) => class extends B {} };
  ctx.DCLogic = class { constructor() { this.state = {}; } setState() {} };
  vm.runInContext(rd('modules', 'admin', 'logic.js') + '\n;globalThis.__C = Component;', ctx);
  const page = () => Object.create(ctx.__C.prototype), ST = page().t24Struct(); assert.ok(ST && ST.length, 'الشجرةُ بُنيت');
  const conts = Array.from(ST).map((c) => ({ id: c.id, leaves: Array.from(c.leaves).map((l) => l.owner) }));
  const TREE = JSON.parse(rd('manifests', 'perm-tree24.json')), REG = JSON.parse(rd('permissions', 'registry', 'registry-v24.9.json'));
  assert.deepEqual(conts.map((c) => c.id), TREE.containers.map((c) => c.id), 'حاوياتُ الواجهة = حاوياتُ الشجرة الملتزَمة');
  assert.deepEqual(conts.flatMap((c) => c.leaves).sort(), REG.owners.map((o) => o.id).sort(), 'أوراقُ الواجهة = مالكو السجل كلُّهم، كلٌّ مرة');
  for (const k of GONE) assert.ok(!conts.some((c) => c.id === k || c.leaves.some((l) => l.split('/')[0] === k)), 'نظامٌ غائب في شجرة الواجهة: ' + k);
  const c = page(), exp = {}, lx = {}; ST.forEach((x) => { exp[x.id] = 1; x.leaves.forEach((l) => { lx[l.owner] = 1; }); });
  for (const mode of ['view', 'cap']) {
    const md = c.t24Rows({ map: true, mode, ceil: { lens: () => true }, on: {}, lens: [], exp, leafExp: lx, canEdit: false, target: { role: 'staff', mgr: false } });
    assert.equal(md.ok, true); assert.deepEqual(hits(JSON.stringify(Array.from(md.rows))), [], 'صفوفُ الخريطة (' + mode + ') بلا رمزِ نظامٍ غائب');
  }
});

/* V7 · د3 (تتمة) — بحثٌ نصي عن أسماء الأنظمة الغائبة (اسمُ المجلد حيث ورد، بأي حالة أحرف) في أجزاء الخادم وكتل الواجهة، خارج التعليقات.
   ما يبقى معلنٌ بسببه في tests/removal/names.allow.json (مقطعٌ بعينه في ملفٍ بعينه)؛ أيُّ ذكرٍ خارج القائمة يُفشل الاختبار. */
/* اسمُ نظامٍ غائب في سطرٍ من القاعدة بعد القائمة وقاعدة الدور: [«ملف:سطر …»] — يستعمله الاختبارُ والحقنُ السلبية معاً */
function residue(files, gone) {
  /* د5-هـ: نظامٌ مفتاحُه كلمةٌ عامة (roles ← substring:false — plan) لا يُبحث عن مقطعه؛ تُبحث أسماؤه المميِّزة (system.json ← names) — بقاعدةٍ مكتوبة */
  const noSub = new Set((ALLOW.roles || []).filter((r) => r.substring === false).map((r) => r.name));
  const extra = gone.flatMap((k) => JSON.parse(fs.readFileSync(path.join(FULL, 'systems', k, 'system.json'), 'utf8')).names || []), find = finder(gone.filter((k) => !noSub.has(k)), extra);
  const skip = new Set(ALLOW.skipFiles.map((x) => x.file)), bad = [];
  for (const [rel, text] of files) {
    if (skip.has(rel)) continue;
    const clean = cleanFor(rel, gone);
    noComments(text).split('\n').forEach((line, i) => {
      if (!find(line)) return;
      const rest = clean(line), m = find(rest); if (m) bad.push(rel + ':' + (i + 1) + ' «' + rest.slice(Math.max(0, m.index - 40), m.index + 50).trim() + '»');
    });
  }
  return bad;
}
test('د3 · الحذف: لا اسمَ لنظامٍ غائب في جزءٍ من القاعدة خارج قائمة الاستثناء المعلنة ' + label, () => {
  for (const e of ALLOW.skipFiles.concat(ALLOW.patterns, ALLOW.entries, ALLOW.roles || [])) { assert.ok(e.why && e.why.length > 20, 'لكل استثناءٍ سبب'); assert.equal(e.kind, 'legit', 'لا مؤجَّلَ في قائمة الاستثناء (د4-أ): ' + JSON.stringify(e.file || e.pattern || e.name)); }
  for (const r of ALLOW.roles || []) for (const x of (r.patterns || []).concat(r.identifiers || [])) assert.ok(x.why && x.why.length > 15, 'لكل نمطٍ ومعرّفٍ في قاعدة الدور سببُه: ' + (x.re || x.name));
  /* د4-أ: كلُّ مدخلٍ في القائمة ما زال له موضع — يُفحص على الشجرة الكاملة (الأنظمةُ كلُّها حاضرة)، فيعمل في المستودع وفي كل نسخة حذف */
  assert.deepEqual(staleAllow(ALLOW, path.dirname(FULL), FULL), [], 'مدخلٌ في قائمة الاستثناء بلا موضع');
  const root0 = path.dirname(FULL); assert.deepEqual(staleRoles(ALLOW.roles, scanFiles(root0, FULL).map((f) => noComments(fs.readFileSync(f, 'utf8')))), [], 'نمطٌ أو معرّفٌ في قاعدة الدور بلا موضع');
  if (!GONE.length) return;
  const bad = residue(scanFiles(ROOT, SRC).map((f) => [relOf(ROOT, f), fs.readFileSync(f, 'utf8')]), GONE);
  assert.deepEqual(bad.slice(0, 25), [], bad.length + ' ذكراً لاسم نظامٍ غائب خارج قائمة الاستثناء');
});

/* د5-د2 · قرار المراجع 4: عددُ مداخل القائمة مثبَّتٌ — ينزل ولا يرتفع. مدخلٌ جديد = رفعُ LIMITS في role_rule.mjs = موافقةُ المراجع */
test('د5-د2 · قائمةُ الاستثناء لا تكبر: أعدادُها ≤ المثبَّت', () => {
  const now = allowCounts(ALLOW);
  for (const k of Object.keys(LIMITS)) assert.ok(now[k] <= LIMITS[k], k + ': ' + now[k] + ' > المثبَّت ' + LIMITS[k] + ' — مدخلٌ جديد يحتاج موافقةَ المراجع');
  assert.deepEqual(Object.keys(now).sort(), Object.keys(LIMITS).sort());
});

/* د5-د2 · قرار المراجع 3 — حقنٌ سلبية إلزامية: كلُّ حقنةٍ في ملفٍ من القاعدة يجب أن يكشفها البحثُ مع القاعدة؛ وسطرُ دورٍ خالص لا يُكشف.
   تُفحص كأن الجدولَ غائب (gone = staff) في كل شجرة — المستودع ونسخُ الحذف — لأن رموزَه تُقرأ من الشجرة الكاملة. لو مرّت حقنةٌ فالقاعدةُ مرفوضة. */
/* د5-هـ · قرار المراجع 4: الحقنُ السلبية لكل نظامٍ مفصول — قراءةُ مفتاحه مباشرةً · الاستيرادُ من مجلده · وسطرٌ يبدو معنىً آخر للكلمة ويقرأ مفتاحَه — كلٌّ يُكشف */
test('د5-هـ · الحقنُ السلبية لكل نظامٍ مفصول بقاعدة: plan', () => {
  if (!fs.existsSync(path.join(FULL, 'systems', 'plan', 'system.json'))) return;
  const at = 'workers/parts/063-enf-api-and-handler.js', gone = ['plan'];
  const INJ = {
    'قراءة bassam_plan_v1 مباشرة': 'var p = await opResourceGet(env, "bsdept:" + d + ":bassam_plan_v1");',
    'استيراد من modules/plan/': 'import { x } from "../modules/plan/logic.js";',
    'خطةُ تنفيذٍ تقرأ مفتاح الخطة': 'var plan = { guards: [], statements: [] }; plan.statements.push(opRead("bassam_plan_v1"));',
    'اسمُ صفحة البرنامج': 'mount("Operational Plan");',
  };
  for (const [name, line] of Object.entries(INJ)) assert.ok(residue([[at, line]], gone).length > 0, 'الحقنة مرّت بلا كشف: ' + name);
  assert.deepEqual(residue([[at, 'var plan = { guards: [], statements: [] }; plan.guards.push(g);']], gone), [], 'ضابط: «خطةُ تنفيذ» بلا مفتاح البرنامج');
});

test('د5-هـ · الحقنُ السلبية لكل نظامٍ مفصول بقاعدة: dreport', () => {
  if (!fs.existsSync(path.join(FULL, 'systems', 'dreport', 'system.json'))) return;
  const gone = ['dreport'];
  const INJ = {
    'قراءة bassam_dreport_v1 مباشرة (عميل)': ['src/modules/profile/logic.js', 'const r = KIVO.__BS_SRV.operations.get("bassam_dreport_v1");'],
    'قراءة bassam_dreport_v1 مباشرة (خادم)': ['workers/parts/063-enf-api-and-handler.js', 'var r = await opResourceGet(env, "bsdept:" + d + ":bassam_dreport_v1");'],
    'استيراد من systems/dreport/': ['src/layouts/root-logic.js', 'import { x } from "../systems/dreport/client/logic.js";'],
    'اسمُ صفحة البرنامج': ['src/layouts/root-logic.js', 'mount("Daily Report");'],
    'ورقةُ البرنامج': ['src/permissions/334-perm-tree-tpl.js', 'if (can("dreport", "view")) x();'],
    'اسمُ ناقلٍ لم يعلنه المالك': ['src/modules/profile/logic.js', 'const r = KIVO.bus.read("dreport.secret@1");'],
  };
  for (const [name, [at, line]] of Object.entries(INJ)) assert.ok(residue([[at, line]], gone).length > 0, 'الحقنة مرّت بلا كشف: ' + name);
  assert.deepEqual(residue([['src/modules/profile/logic.js', 'const r = KIVO.bus.read("dreport.doc@1", "granted");']], gone), [], 'ضابط: الاسمُ المعلن يُمحى');
});

test('د5-هـ · الحقنُ السلبية لكل نظامٍ مفصول بقاعدة: daily', () => {
  if (!fs.existsSync(path.join(FULL, 'systems', 'daily', 'system.json'))) return;
  const gone = ['daily'];
  const INJ = {
    'قراءة bassam_rounds_v1 مباشرة (عميل)': ['src/modules/profile/logic.js', 'const r = KIVO.__BS_SRV.operations.get("bassam_rounds_v1");'],
    'قراءة bassam_rounds_v1 مباشرة (خادم)': ['workers/parts/063-enf-api-and-handler.js', 'var r = await opResourceGet(env, "bsdept:" + d + ":bassam_rounds_v1");'],
    'استيراد من systems/daily/': ['src/layouts/root-logic.js', 'import { x } from "../systems/daily/client/logic.js";'],
    'اسمُ صفحة البرنامج': ['src/layouts/root-logic.js', 'mount("Daily Sessions");'],
    'ورقةُ الجولات': ['src/modules/employees/logic.js', 'if (this._on("daily/rounds")) x();'],
    'خدمةُ المصنع': ['src/modules/profile/logic.js', 'KIVO.BassamRound.prepareEnsure(draft, 1448, 2, 1);'],
    'اسمُ ناقلٍ لم يعلنه المالك': ['src/modules/profile/logic.js', 'const r = KIVO.bus.read("daily.secret@1");'],
  };
  for (const [name, [at, line]] of Object.entries(INJ)) assert.ok(residue([[at, line]], gone).length > 0, 'الحقنة مرّت بلا كشف: ' + name);
  /* ضابط: «daily» بمعنى آخر (الإحصاء اليومي · تكرارُ المهمة) والمعلنُ من أسماء ناقله يمرّان */
  for (const line of ['if (domains.dailyStats) x();', "if (rec.t === 'daily') next();", 'const r = KIVO.bus.read("daily.days@1", via);']) assert.deepEqual(residue([['workers/parts/019d-atomic-restore.js', line]], gone), [], 'ضابط: ' + line);
});

/* د5-هـ · قاعدةُ اسم الناقل المعلن (bus_rule.mjs): الشرطُ ② لملفات القاعدة على الشجرة الكاملة، والحقنُ السلبية للشرط ① */
test('د5-هـ · اسمُ الناقل: كلُّ اسمِ نظامٍ في ملف قاعدة معلنٌ في _base.json ← consumes بغيابه وملفه، ولا إعلانَ بائت', () => {
  const root0 = path.dirname(FULL);
  assert.deepEqual(baseBusProblems(FULL, scanFiles(root0, FULL).map((f) => [relOf(root0, f), noComments(fs.readFileSync(f, 'utf8'))])), []);
});
test('د5-هـ · اسمُ الناقل: يُمحى المعلنُ وحده — اسمٌ لم يعلنه المالك · ومفتاحٌ بجواره · يُكشفان', () => {
  for (const k of ['plan', 'staff']) {
    if (!fs.existsSync(path.join(FULL, 'systems', k, 'contract.json'))) continue;
    const at = 'src/modules/profile/logic.js', gone = [k], declared = k === 'plan' ? 'plan.doc@1' : 'staff.months@1', key = k === 'plan' ? 'bassam_plan_v1' : 'bassam_staffing_v3';
    assert.deepEqual(residue([[at, 'const x = KIVO.bus.read("' + declared + '");']], gone), [], 'الاسمُ المعلن يُمحى: ' + declared);
    assert.ok(residue([[at, 'const x = KIVO.bus.read("' + k + '.secret@1");']], gone).length > 0, 'اسمٌ لم يعلنه المالك مرّ: ' + k);
    assert.ok(residue([[at, 'const x = KIVO.bus.read("' + declared + '") || KIVO.__BS_SRV.operations.get("' + key + '");']], gone).length > 0, 'مفتاحٌ بجوار اسمٍ معلن مرّ: ' + k);
  }
});

test('د5-د2 · الحقنُ السلبية: قراءةُ مفتاح الجدول · الاستيرادُ من مجلده · سطرٌ يبدو سطرَ دورٍ ويقرأ الجدول — كلٌّ يُفشل البحث', () => {
  if (!fs.existsSync(path.join(FULL, 'systems', 'staff', 'system.json'))) return;
  const at = 'src/layouts/root-logic.js', gone = ['staff'];
  const INJ = {
    'قراءة bassam_staffing_v3 مباشرة': 'var s = KIVO.__BS_SRV.operations.get("bassam_staffing_v3");',
    'استيراد من modules/staff/': 'import { x } from "../modules/staff/logic.js";',
    'سطرُ دورٍ يقرأ الجدول': 'if (u.role === "staff") rows = KIVO.__BS_SRV.operations.get("bassam_staffing_v3");',
  };
  for (const [name, line] of Object.entries(INJ)) assert.ok(residue([[at, line]], gone).length > 0, 'الحقنة مرّت بلا كشف: ' + name);
  /* والقاعدةُ تُقبل لسطر الدور الخالص وحده */
  assert.deepEqual(residue([[at, 'if (u.role === "staff") x();']], gone), [], 'سطرُ الدور الخالص');
  /* ومعرّفٌ مسمّى لا يُستثنى إلا بحدود الكلمة: isStaffing ليس isStaff */
  if ((ALLOW.roles || []).some((r) => (r.identifiers || []).some((x) => x.name === 'isStaff'))) assert.ok(residue([[at, 'var v = u.isStaffing;']], gone).length > 0, 'معرّفٌ أطول من المسمّى مرّ');
});

/* V7 · د4-أ · د4-ب — القطعةُ المشتركة المعلنة (src/systems/_shared/<key>): تبقى ما حضر أحدُ مالكيها. الأدواتُ لا تحذفها؛ يحذفها اختبارُ الحذف حين يغيب مالكوها */
test('د4-أ · الحذف: القطعةُ المشتركة تتبع مالكيها ' + label, () => {
  const dir = path.join(FULL, 'systems', '_shared'); if (!fs.existsSync(dir)) return;
  for (const k of fs.readdirSync(dir)) {
    const piece = JSON.parse(fs.readFileSync(path.join(dir, k, 'shared.json'), 'utf8')), here = fs.existsSync(path.join(SRC, 'systems', '_shared', k));
    assert.equal(here, piece.owners.some((o) => SYSTEMS.includes(o)), 'القطعةُ «' + k + '» حاضرةٌ ما حضر أحدُ مالكيها [' + piece.owners.join(' · ') + ']');
  }
});
