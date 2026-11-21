/* V7 · د5-ح (قرارا المالك 13 نوفمبر) — الطباعة:
   (1) قسمُ «الطباعة والتقارير — الترويسة والتذييل» في مركز الإدارة حُذف بلا أثر: الواجهة (القالب · المنطق · الأنماط · المعاينة «الطباعة») · الشريطُ
       الجانبي (#/sysadmin/plat/print) · مفتاحُ print في إعدادات المنصة (bassam_platform_v1 — لا موردَ خادمٍ له غيرُها: الخادمُ يحفظ الكائنَ كلَّه ولا يعرف print)
       · وقارئُه الوحيد: ترويسةُ/تذييلُ beforeprint وحجمُ الورق في 260-bassam-plat — الطباعةُ تخرج بترويسة كل صفحةٍ نفسِها كما كانت تحتها.
       المخزَّنُ قديماً يسقط عند القراءة ولا يُكتب ثانيةً.
   (2) نواةُ الطباعة (KIVO.BassamPrintCore) خرجت من القاعدة إلى قطعةٍ مشتركة src/systems/_shared/print يملكها plan و daily: كتلةٌ في الغلاف
       مرّةً واحدة ما حضر أحدُهما، وتغيب بغيابهما ومعها اسمُها من طبقة الأسماء العامة. لا كودَ طباعةٍ في القاعدة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { SRC, ROOT, PYTHON, SYSTEMS } from './harness.mjs';

/* (1) الأسماءُ المحذوفة — كلٌّ معرّفٌ أو نصُّ واجهةٍ لا يُكتب إلا لقسم الترويسة والتذييل */
const NAMES = [
  'plOnPrint', 'pvPrint', 'pvPrHead', 'pvPrLogo', 'pvPrL1', 'pvPrL3', 'pvPrRight', 'printOn', 'printOff', 'bs-plat-print', 'bs-plat-printfoot',
  'logoPos', 'print.l1', 'print.l2', 'print.l3', 'print.footer', 'print.paper', 'print.date', 'print.who', 'P.print', 'i.print',
  'tg_print_', 'tgOn_print_', 'sg_print_', 'sgOn_print_', 'plD.print', '["plat", "print"', '"print", "الطباعة', "print:'الطباعة'", 'print: ["print"]', 'print: "print"',
  '#/sysadmin/plat/print', 'الترويسة الموحّدة', 'الترويسة والتذييل', 'ترويسة الطباعة كما ستظهر', 'حجم الورق الافتراضي', 'كما تحدده كل صفحة', 'اسم من طبع',
  'تاريخ الطباعة ووقتها', 'طُبع بواسطة', 'هذه تُضاف فوقها موحّدةً',
];
const word = (n) => (/^[A-Za-z_$][\w$]*$/.test(n) ? new RegExp('(?<![\\w$])' + n.replace(/\$/g, '\\$') + '(?![\\w$])') : null);
function files(dir, base, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name), rel = path.relative(base, p).split(path.sep).join('/');
    if (e.isDirectory()) { if (!/(^|\/)(tests|assets|node_modules)$/.test(rel)) files(p, base, out); continue; }
    if (/\.(js|tpl|html|css|json|frag|mjs)$/.test(e.name)) out.push([rel, p]);
  }
  return out;
}

test('(1) no trace of «الطباعة والتقارير — الترويسة والتذييل» in the client tree or the server parts', () => {
  const F = files(SRC, ROOT).concat(files(path.join(ROOT, 'workers', 'parts'), ROOT)), hits = [];
  assert.ok(F.length > 200, 'the tree is read');
  for (const [rel, p] of F) {
    const s = fs.readFileSync(p, 'utf8');
    for (const n of NAMES) { const re = word(n); if (re ? re.test(s) : s.includes(n)) hits.push(rel + ': ' + n); }
  }
  assert.deepEqual(hits, [], 'remaining references:\n' + hits.join('\n'));
});

test('(1) the console knows seven platform sections; plat/print is not one of them', () => {
  const L = fs.readFileSync(path.join(SRC, 'modules', 'admin', 'logic.js'), 'utf8'), R = fs.readFileSync(path.join(SRC, 'layouts', 'root-logic.js'), 'utf8');
  const secs = L.slice(L.indexOf('  PL_SECS() {'), L.indexOf('  PL_KEYS() {'));
  assert.deepEqual([...secs.matchAll(/\[\s*"([a-z]+)",\s*"/g)].map((m) => m[1]), ['id', 'login', 'app', 'side', 'setup', 'notif', 'about']);
  const nav = R.slice(R.indexOf('  _sysNav() {'), R.indexOf('  _conGrpOf('));
  assert.deepEqual([...nav.matchAll(/\["plat", "([a-z]+)"/g)].map((m) => m[1]), ['id', 'notif', 'login', 'side', 'app', 'about', 'setup']);
});

test('(1) the platform store drops the old «print» key: not read, not written again', () => {
  const P = fs.readFileSync(path.join(SRC, 'layouts', '260-bassam-plat.js'), 'utf8');
  const store = { bassam_platform_v1: JSON.stringify({ name: 'TEST_ONLY منصة', print: { l1: 'TEST_ONLY', footer: 'TEST_ONLY', date: true, who: true, paper: 'a4l' } }) };
  const KIVO = { BassamAuth: { isSuper: () => true }, KIVO_MANIFEST: { clone: () => [] } };
  class Storage { getItem(k) { return store[k] ?? null; } setItem(k, v) { store[k] = String(v); } }
  const ctx = vm.createContext({ KIVO, Storage, window: { addEventListener() {} }, localStorage: new Storage(), document: { documentElement: { getAttribute: () => null }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] }, JSON, Object, Array, String });
  try { vm.runInContext(P, ctx); } catch (e) { /* apply() touches the DOM; the store contract is what is checked */ }
  const BP = KIVO.BassamPlat; assert.ok(BP && BP.get && BP.set);
  assert.equal('print' in BP.DEF, false, 'no print defaults');
  const g = BP.get(); assert.equal(g.name, 'TEST_ONLY منصة'); assert.equal('print' in g, false, 'the stored key is not read');
  try { BP.set(Object.assign({}, g, { print: { l1: 'TEST_ONLY' } })); } catch (e) { /* apply() after the write */ }
  assert.equal('print' in JSON.parse(store.bassam_platform_v1), false, 'the next save drops it from the store');
  /* no beforeprint/afterprint header or footer, and no @page size from the settings */
  assert.doesNotMatch(P, /beforeprint|afterprint|@page/);
});

/* (2) نواةُ الطباعة خارج القاعدة */
const BASE_SKIP = /^src\/(systems\/|pages\/|core\/005-kivo-ns\.js$|types\/kivo\.d\.ts$|blocks\.json$|layouts\/index\.template\.html$)/;   /* المولَّد من قطعة القطعة المشتركة يتبعها */
test('(2) no print-core code in the base: the core lives in src/systems/_shared/print only', () => {
  const hits = [];
  for (const [rel, p] of files(SRC, ROOT)) {
    if (path.basename(p) === '566-print-core.js' && rel !== 'src/systems/_shared/print/566-print-core.js') hits.push(rel + ': a copy of the core');
    if (BASE_SKIP.test(rel)) continue;
    const s = fs.readFileSync(p, 'utf8').replace(/@@SYS:[^@]*@@/g, '');   /* علامةُ فتحةٍ تحمل نصَّها المحايد بغياب القطعة (ns.owned.print ← retired) */
    for (const n of ['BassamPrintCore', '566-print-core', 'bs-print-frame']) if (s.includes(n)) hits.push(rel + ': ' + n);
  }
  assert.deepEqual(hits, [], 'base references:\n' + hits.join('\n'));
  const piece = JSON.parse(fs.readFileSync(path.join(SRC, 'systems', '_shared', 'print', 'shared.json'), 'utf8'));
  assert.deepEqual(piece.owners, ['daily', 'plan']); assert.deepEqual(piece.files, ['566-print-core.js']);
  for (const k of piece.owners.filter((o) => SYSTEMS.includes(o)))
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(SRC, 'systems', k, 'system.json'), 'utf8')).shared, ['print'], k + ' declares the piece');
  /* the generated shell holds it exactly once (both owners present = one block) */
  const T = fs.readFileSync(path.join(SRC, 'layouts', 'index.template.html'), 'utf8'), B = fs.readFileSync(path.join(SRC, 'blocks.json'), 'utf8');
  assert.equal(T.split('@@KIVO_BLOCK:systems/_shared/print/566-print-core.js@@').length - 1, 1, 'one block in the shell');
  assert.equal(B.split('"systems/_shared/print/566-print-core.js"').length - 1, 1, 'one entry in blocks.json');
  assert.ok(T.indexOf('565-page-kit.js@@') < T.indexOf('566-print-core.js@@') && T.indexOf('566-print-core.js@@') < T.indexOf('570-bassam-xlsx.js@@'), 'in its old place, after 565');
});

test('(2) systems.py: the shared piece is injected once while either owner is present, and is gone (with its public name) when both are', { skip: ['plan', 'daily'].every((k) => SYSTEMS.includes(k)) ? false : 'يُفحص على الشجرة الكاملة' }, () => {
  const code = `
import json, systems as SY
S = ${JSON.stringify(SRC)}; base = SY.load(S); out = {}
for name, gone in (('full', []), ('plan', ['plan']), ('daily', ['daily']), ('both', ['plan', 'daily'])):
    sy = [d for d in base if d['key'] not in gone]
    f = SY.fragments(S, sy)
    T = SY.expand(open(S + '/slots/layouts/index.template.html.tpl', encoding='utf-8').read(), f)
    B = SY.expand(open(S + '/slots/blocks.json.tpl', encoding='utf-8').read(), f)
    N = json.loads(SY.expand(open(S + '/slots/tools/kivo_ns.json.tpl', encoding='utf-8').read(), f))
    out[name] = {'shell': T.count('566-print-core.js@@'), 'blocks': B.count('566-print-core.js"'), 'after': [a for a in N['after'] if 'print' in a], 'retired': 'BassamPrintCore' in N['retired'], 'problems': SY.problems(S, sy)}
print(json.dumps(out, ensure_ascii=False))`;
  const r = spawnSync(PYTHON, ['-c', code], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONPATH: path.join(ROOT, 'tools') }) });
  assert.equal(r.status, 0, r.stderr); const o = JSON.parse(r.stdout);
  for (const k of ['full', 'plan', 'daily']) {
    assert.equal(o[k].shell, 1, k + ': one block in the shell'); assert.equal(o[k].blocks, 1, k + ': one entry in blocks.json');
    assert.deepEqual(o[k].after, ['src/systems/_shared/print/566-print-core.js'], k); assert.equal(o[k].retired, false, k + ': the public name stays');
    assert.deepEqual(o[k].problems, [], k);
  }
  assert.equal(o.both.shell, 0, 'both gone: no block'); assert.equal(o.both.blocks, 0); assert.deepEqual(o.both.after, []);
  assert.equal(o.both.retired, true, 'both gone: KIVO.BassamPrintCore leaves the public names layer');
  assert.deepEqual(o.both.problems, ['قطعة مشتركة بلا مالك: src/systems/_shared/print — احذفها'], 'both gone: the check asks for the piece to be deleted (the removal test deletes it)');
});
