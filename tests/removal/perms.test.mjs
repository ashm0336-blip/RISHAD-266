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
import { noComments, scanFiles, relOf, staleAllow } from './names_allow.mjs';

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
const RX_CODE = rxOf([...GT.keys, ...GT.owners, ...GT.flags]), RX_DATA = rxOf([...GT.keys, ...GT.owners, ...GT.flags, ...sysRes]);
const hits = (text, data) => { const RX = data ? RX_DATA : RX_CODE; return RX ? [...new Set(Array.from(text.matchAll(RX), (m) => m[1]))] : []; };
const label = '[' + (SYSTEMS.join(' · ') || 'لا نظام') + ']' + (GONE.length ? ' — الغائب: ' + GONE.join(' · ') : '');

test('د3 · الحذف: السجلُّ والشجرةُ وروابطُ الخادم المولَّدة لا تحمل رمزاً لنظامٍ غائب ' + label, () => {
  if (GONE.length) assert.ok(GT.keys.size > 0 && GT.owners.size > 0, 'رموزُ الأنظمة الغائبة قُرئت من الشجرة الكاملة (' + GT.keys.size + ' مفتاحاً · ' + GT.owners.size + ' ورقة)');
  const files = [['src', 'permissions/registry/registry-v24.9.json'], ['src', 'permissions/340-registry-v24-9.js'], ['src', 'manifests/perm-tree24.json'],
    ['root', 'workers/parts/004-registry-2.js'], ['root', 'workers/parts/006-guard-bindings-2.js'], ['root', 'workers/parts/008-kivo-build-2.js'], ['root', 'workers/parts/010-kivo-scope-2.js'],
    ['root', 'workers/bindings/scope-bindings/data.json'], ['root', 'workers/bindings/guard-bindings/data.json'], ['root', 'workers/bindings/build-bindings/data.json']];
  for (const [base, rel] of files) {
    const p = path.join(base === 'src' ? SRC : ROOT, rel); assert.ok(fs.existsSync(p), rel + ' موجود');
    const js = /\.js$/.test(rel), text = js ? noComments(fs.readFileSync(p, 'utf8')) : fs.readFileSync(p, 'utf8');
    assert.deepEqual(hits(text, !js), [], rel + ': لا رمزَ لنظامٍ غائب');
  }
});

test('د3 · الحذف: لا مفتاحَ نظامٍ غائب مكتوباً في جزءٍ من القاعدة (الخادم والواجهة — خارج التعليقات) ' + label, () => {
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers', 'parts.json'), 'utf8')).parts.map((p) => path.join(ROOT, 'workers', 'parts', p.file));
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (['systems', 'slots', 'pages'].includes(e.name) ? [] : walk(path.join(d, e.name))) : (/\.js$/.test(e.name) ? [path.join(d, e.name)] : [])));
  const bad = [];
  for (const f of parts.concat(walk(SRC))) { const h = hits(noComments(fs.readFileSync(f, 'utf8'))); if (h.length) bad.push(path.relative(ROOT, f) + ': ' + h.slice(0, 5).join(' ')); }
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
test('د3 · الحذف: لا اسمَ لنظامٍ غائب في جزءٍ من القاعدة خارج قائمة الاستثناء المعلنة ' + label, () => {
  const ALLOW = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'removal', 'names.allow.json'), 'utf8'));
  for (const e of ALLOW.skipFiles.concat(ALLOW.patterns, ALLOW.entries)) { assert.ok(e.why && e.why.length > 20, 'لكل استثناءٍ سبب'); assert.match(e.kind, /^(legit|deferred)$/); }
  /* د4-أ: كلُّ مدخلٍ في القائمة ما زال له موضع — يُفحص على الشجرة الكاملة (الأنظمةُ كلُّها حاضرة)، فيعمل في المستودع وفي كل نسخة حذف */
  assert.deepEqual(staleAllow(ALLOW, path.dirname(FULL), FULL), [], 'مدخلٌ في قائمة الاستثناء بلا موضع');
  if (!GONE.length) return;
  const NAME = new RegExp('(?:' + GONE.join('|') + ')', 'i'), skip = new Set(ALLOW.skipFiles.map((x) => x.file)), pats = ALLOW.patterns.map((x) => new RegExp(x.pattern, 'g'));
  const bad = [];
  for (const f of scanFiles(ROOT, SRC)) {
    const rel = relOf(ROOT, f); if (skip.has(rel)) continue;
    const cuts = ALLOW.entries.filter((e) => e.file === '*' || e.file === rel).flatMap((e) => e.match).sort((a, b) => b.length - a.length);
    noComments(fs.readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
      if (!NAME.test(line)) return;
      let rest = line; for (const p of pats) rest = rest.replace(p, '""'); for (const c of cuts) rest = rest.split(c).join('');
      const m = NAME.exec(rest); if (m) bad.push(rel + ':' + (i + 1) + ' «' + rest.slice(Math.max(0, m.index - 40), m.index + 50).trim() + '»');
    });
  }
  assert.deepEqual(bad.slice(0, 25), [], bad.length + ' ذكراً لاسم نظامٍ غائب خارج قائمة الاستثناء');
});
