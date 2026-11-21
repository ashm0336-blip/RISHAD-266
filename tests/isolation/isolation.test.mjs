/* V7 · د5-ب — اختبارُ العزل الدائم.
   يمسح المصدرَ الحالي (tools/contracts.py --scan) ويفشل عند:
     · استيرادٍ من مجلد برنامجٍ آخر (import) · كتابةِ مفتاحٍ لا يملكه البرنامج (write) · قراءةِ مفتاحِ برنامجٍ آخر بلا إعلان (read)
     · نشرِ حدثٍ أو توفيرِ قراءةٍ/أمرٍ غير معلنٍ في عقده، أو استهلاكِ ما لم يُعلَن (bus)
     · استدعاءِ خدمةٍ يعرّفها برنامجٌ آخر (call) · تضمينِ صفحةِ برنامجٍ آخر (dcimport)
     · ومعرفةِ القاعدة ببرنامج: مفتاحُه (base-key) · خدمتُه (base-call) · صفحتُه (base-dcimport) · اسمُه (base-name) — في أي ملفِ مصدرٍ ليس لبرنامجٍ ولا مولَّداً
     · د5-ح: حدثِ صفحةٍ يُطلقه برنامجٌ آخر (dom · base-dom) · مفتاحٍ يُبنى بلا ذكره حرفاً (dynkey · base-dynkey) · عمليةِ صلاحياتٍ تمسّ برنامجاً آخر
       أو بياناتِ صلاحيات القاعدة تذكر ورقتَه (perm · base-perm) · سياسةِ via في موردٍ يملكه غيرُه (via)
   إلا ما في قائمة الاستثناءات tests/isolation/exceptions.json — وهي الروابطُ القائمة يوم بُني الاختبار. القائمة **تتقلّص ولا تكبر**:
     · خرقٌ ليس فيها، أو زاد عددُ أسطره ⇒ فشل (رابطٌ جديد).
     · استثناءٌ لم يعد له خرقٌ في المصدر، أو نقص عددُ أسطره ⇒ فشل حتى يُحذف/يُنقَّص (فلا يبقى فيها ما يُعاد استعمالُه).
     · عددُ الاستثناءات ومجموعُ أسطرها لا يتجاوزان السقفَين أدناه؛ كلُّ خطوةٍ في د5 تُنزل السقفَين، وفي د5-ح صارا صفراً.
   وعقودُ البرامج نفسُها يجب أن تكون سليمة (tools/contracts.py --check). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
/* د5-ب: 74 / 146 (read · write). د5-ج: وُسِّع الماسح مرةً واحدة (استدعاءُ خدمات برنامجٍ آخر · dc-import · خدماتُ البرامج في src/services وأجزاءُ خادمها ·
   ما تعرفه القاعدة عن البرامج) فانكشف ما لم يكن يُرى ورُفع السقف بقدره — هذه المرة فقط. **بعد د5-ج لا يُرفع السقف أبداً**؛ كلُّ خطوةٍ تُنزله. */
/* د5-د: شُدِّد base-name (قرار المراجع 4) — الاسمُ يُعدّ فقط حيث يُستعمل اسمَ برنامج (القواعد في tools/contracts.py: NAME_USE · NAME_NOT، وحالاتُها أدناه).
   فنزل السقف من 452 / 1193 إلى 403 / 984 (base-name: 71 استثناءً / 249 سطراً ← 22 / 40). لم يُرفع. */
/* د5-د (النقل والتحويل): الجدولُ الشهري في مجلده، وروابطُه صارت عقوداً (staff.callsign.set@1 · staff.dayFacts@1 · staff.availText@1 ·
   staff.permLimit@1 · staff.shiftUsage@1 · shifts.renamed@1 عميلاً وخادماً) فحُذفت استثناءاتُها ⇒ 390 / 954؛ ثم صفوفُ صلاحياته (22 مفتاحاً وروابطُها) من سجلّ القاعدة إلى permissions.json في مجلده ⇒ 387 / 850؛ ثم تبويبُه في حاوية الخطة التشغيلية قطعةً في مجلده (قالبُ الحاوية انتقل إلى src/slots فتبدّل مسارُ استثناءَي «plan» الباقيَين — لا رابطَ جديد) ⇒ 386 / 849. */
/* د5-د2: اكتمل فصلُ الجدول الشهري (لا مفتاحَ له ولا اسمَ في القاعدة، وقراءاتُ البرامج الأخرى له معلنة staff.*@1) مع عدٍّ أشدّ لأسماء البرامج
   (قاعدةٌ مكتوبة لكل ورود — قرار المراجع 3). السقف 386 / 849 ⇒ 239 / 674. لم يُرفع. */
/* د5-ح (القفل): صفر. وُسِّع الماسحُ لما كان أعمى عنه — أحداثُ الصفحة بين البرامج (dom · base-dom) · الوصولُ غير الحرفي للمفاتيح (dynkey · base-dynkey) ·
   روابطُ سجلّ الصلاحيات في غير المفتاح (perm · base-perm) · سياساتُ via — وحُوِّل كلُّ ما كشفه إلى عقد (consumes: perm:<برنامج> · via:<مفتاح> · dom:<حدث>)
   أو نُقل إلى قطعة نظامه. القائمةُ فارغة ولا يُضاف إليها شيء: كلُّ رابطٍ جديدٍ عقدٌ أو فشل. */
const CEILING = { entries: 1, lines: 1 };   /* د5-ح: 0/0 لكل الأنواع، ومدخلٌ واحدٌ مؤقّت من النوع الجديد base-only (566-print-core — يُغلقه فرعُ print بنقله إلى _multi؛ بعد الدمج: احذف المدخل واجعل السقف 0/0) */
const CEILING_AFTER_PRINT = { entries: 0, lines: 0 };   /* د5-هـ: 239/674 → 137/315 (م1 الخطة) → 68/152 (م2 التقرير اليومي) → 22/26 (م3 المتابعة اليومية) → 21/25 (44: حُذف 049-permv4-read) → د5-ح: 0/0 */

const scan = () => JSON.parse(execFileSync('python3', [path.join(ROOT, 'tools/contracts.py'), '--src', path.join(ROOT, 'src'), '--scan'], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const allowed = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/isolation/exceptions.json'), 'utf8')).exceptions;

test('the contracts are complete and consistent', () => {
  assert.deepEqual(scan().errors, []);
});

test('no new link between programs: every violation is a listed exception, with no more lines than listed', () => {
  const now = scan().violations, ok = allowed();
  const fresh = Object.keys(now).filter((k) => !(k in ok)).sort(), grown = Object.keys(now).filter((k) => k in ok && now[k] > ok[k]).map((k) => k + ' (' + ok[k] + ' → ' + now[k] + ')').sort();
  assert.deepEqual(fresh, [], 'رابطٌ جديد بين برنامجين — حوّله إلى عقد (قراءة معلنة · أمر · حدث · مشارك) بدل الوصول المباشر:\n' + fresh.join('\n'));
  assert.deepEqual(grown, [], 'رابطٌ قائم زادت أسطرُه:\n' + grown.join('\n'));
});

test('the exception list only shrinks: nothing stale stays in it, and it never exceeds its ceiling', () => {
  const now = scan().violations, ok = allowed();
  const stale = Object.keys(ok).filter((k) => !(k in now)).sort(), loose = Object.keys(ok).filter((k) => k in now && now[k] < ok[k]).map((k) => k + ' (' + ok[k] + ' → ' + now[k] + ')').sort();
  assert.deepEqual(stale, [], 'استثناءٌ لم يعد له وجود — احذفه من tests/isolation/exceptions.json وأنزل السقف:\n' + stale.join('\n'));
  assert.deepEqual(loose, [], 'استثناءٌ نقصت أسطرُه — نقِّص عددَه في القائمة:\n' + loose.join('\n'));
  const entries = Object.keys(ok).length, lines = Object.values(ok).reduce((a, b) => a + b, 0);
  assert.ok(entries <= CEILING.entries && lines <= CEILING.lines, 'القائمة تجاوزت سقفها: ' + entries + ' استثناءً / ' + lines + ' سطراً (السقف ' + CEILING.entries + ' / ' + CEILING.lines + ') — لا يُضاف استثناء');
  for (const k of Object.keys(ok)) assert.match(k, /^[a-z]+\|(read|write|import|bus|call|dcimport|base-key|base-call|base-dcimport|base-name|dom|base-dom|dynkey|base-dynkey|perm|base-perm|via|base-only)\|[^|]+\|[^|]+$/, k);
});

/* الماسحُ نفسُه يكشف كلَّ نوع خرق، وأداةُ العقود ترفض العقدَ الناقص والمتناقض — على شجرةٍ مصطنعة (TEST_ONLY) لا على المستودع */
import os from 'node:os';
function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-'));
  for (const [rel, body] of Object.entries(files)) { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body)); }
  return dir;
}
const run = (dir, flag) => { try { return { code: 0, out: execFileSync('python3', [path.join(ROOT, 'tools/contracts.py'), '--src', dir, flag], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status, out: String(e.stdout) }; } };
const contract = (system, extra) => ({ schema: 1, system, version: 1, owns: [], provides: {}, consumes: {}, crossEffects: [], ...extra });

test('the scanner catches each kind: undeclared read, foreign write, import, undeclared bus name — and a declared one passes', () => {
  const dir = tree({
    'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_alpha_v1'], provides: { read: { 'alpha.value@1': 'x' }, events: { 'alpha.changed@1': 'x' } } }),
    'systems/beta/contract.json': contract('beta', { owns: ['bassam_beta_v1'], consumes: { 'alpha.value@1': { absent: 'none' } }, provides: { participants: { 'alpha.changed@1': 'x' } } }),
    'systems/alpha/client/a.js': 'KIVO.bus.provide("alpha.value@1", f); KIVO.bus.publish("alpha.changed@1", {});\n',
    'systems/beta/client/ok.js': 'KIVO.bus.read("alpha.value@1"); KIVO.bus.participant("alpha.changed@1", f); var own = "bassam_beta_v1";\n',
    'systems/beta/client/bad.js': 'var r = get("bassam_alpha_v1");\ndraft.set("bassam_alpha_v1", 1);\nimport "../../systems/alpha/client/a.js";\nKIVO.bus.publish("alpha.changed@1", {});\nKIVO.bus.read("alpha.secret@1");\n',
  });
  try {
    const got = JSON.parse(run(dir, '--scan').out);
    assert.deepEqual(got.errors, []);
    assert.deepEqual(Object.keys(got.violations).sort(), [
      'beta|bus|systems/beta/client/bad.js|publish alpha.changed@1',
      'beta|bus|systems/beta/client/bad.js|read alpha.secret@1',
      'beta|import|systems/beta/client/bad.js|alpha',
      'beta|read|systems/beta/client/bad.js|bassam_alpha_v1',
      'beta|write|systems/beta/client/bad.js|bassam_alpha_v1',
    ]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('an incomplete or contradictory contract fails the check', () => {
  const cases = {
    'no contract file': { 'systems/alpha/x.js': '' },
    'a key owned twice': { 'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_x_v1'] }), 'systems/beta/contract.json': contract('beta', { owns: ['bassam_x_v1'] }) },
    'consumes nothing provides': { 'systems/alpha/contract.json': contract('alpha', { consumes: { 'beta.value@1': { absent: 'none' } } }), 'systems/beta/contract.json': contract('beta') },
    'no absence behaviour': { 'systems/alpha/contract.json': contract('alpha', { provides: { read: { 'alpha.v@1': 'x' } } }), 'systems/beta/contract.json': contract('beta', { consumes: { 'alpha.v@1': {} } }) },
    'a name outside its owner': { 'systems/alpha/contract.json': contract('alpha', { provides: { events: { 'beta.changed@1': 'x' } } }) },
    'participates in an undeclared event': { 'systems/alpha/contract.json': contract('alpha', { provides: { participants: { 'alpha.none@1': 'x' } } }) },
    'a missing field': { 'systems/alpha/contract.json': { schema: 1, system: 'alpha', version: 1, owns: [] } },
  };
  for (const [name, files] of Object.entries(cases)) {
    const dir = tree(files);
    try { assert.equal(run(dir, '--check').code, 1, name); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  const good = tree({ 'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_x_v1'], provides: { read: { 'alpha.v@1': 'x' } } }), 'systems/beta/contract.json': contract('beta', { consumes: { 'alpha.v@1': { absent: 'none' }, 'key:bassam_x_v1': { absent: 'none' } } }) });
  try { assert.equal(run(good, '--check').code, 0); } finally { fs.rmSync(good, { recursive: true, force: true }); }
});

test('the widened scanner (د5-ج): a call to another program\'s service, a dc-import of its page, and what the base knows about a program', () => {
  const dir = tree({
    'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_alpha_v1'], files: ['services/900-alpha-service.js'] }),
    'systems/alpha/system.json': { client: { component: 'Alpha Page' } },
    'systems/beta/contract.json': contract('beta', { owns: ['bassam_beta_v1'] }),
    'services/900-alpha-service.js': 'KIVO.AlphaService = { run: function () {} };\n',
    'systems/alpha/client/own.js': 'KIVO.AlphaService.run();\n',
    'systems/beta/client/bad.js': 'KIVO.AlphaService.run();\n',
    'systems/beta/client/view.html': '<dc-import name="Alpha Page"></dc-import>\n',
    'layouts/shell.js': 'var k = "bassam_alpha_v1"; KIVO.AlphaService.run(); go("alpha"); var role = "x";\n',
    'layouts/shell.html': '<dc-import name="Alpha Page"></dc-import>\n',
    'layouts/neutral.js': 'var k = "bassam_base_v1"; KIVO.BaseThing = 1; KIVO.BaseThing;\n',
  });
  try {
    const got = JSON.parse(run(dir, '--scan').out);
    assert.deepEqual(got.errors, []);
    assert.deepEqual(Object.keys(got.violations).sort(), [
      'base|base-call|src/layouts/shell.js|AlphaService',
      'base|base-dcimport|src/layouts/shell.html|Alpha Page',
      'base|base-key|src/layouts/shell.js|bassam_alpha_v1',
      'base|base-name|src/layouts/shell.js|alpha',
      'beta|call|systems/beta/client/bad.js|AlphaService',
      'beta|dcimport|systems/beta/client/view.html|Alpha Page',
    ].map((k) => k.replace('|src/', '|' + path.basename(dir) + '/')).sort());
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the contract registry (د5-ج): a base resource needs evidence and no program owner; a contract left in src/contracts for a moved program fails; a claimed file must exist once', () => {
  const base = (resources) => ({ schema: 1, kind: 'base', resources });
  const cases = {
    'base resource without evidence': { 'contracts/_base.json': base([{ key: 'bassam_x_v1' }]), 'systems/alpha/contract.json': contract('alpha') },
    'base resource owned by a program': { 'contracts/_base.json': base([{ key: 'bassam_x_v1', why: 'x' }]), 'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_x_v1'] }) },
    'contract left behind for a moved program': { 'contracts/alpha.json': contract('alpha'), 'systems/alpha/contract.json': contract('alpha') },
    'claimed file missing': { 'systems/alpha/contract.json': contract('alpha', { files: ['services/none.js'] }) },
    'file claimed twice': { 'services/s.js': '', 'systems/alpha/contract.json': contract('alpha', { files: ['services/s.js'] }), 'systems/beta/contract.json': contract('beta', { files: ['services/s.js'] }) },
  };
  for (const [name, files] of Object.entries(cases)) { const dir = tree(files); try { assert.equal(run(dir, '--check').code, 1, name); } finally { fs.rmSync(dir, { recursive: true, force: true }); } }
  const good = tree({ 'contracts/_base.json': base([{ key: 'bassam_x_v1', why: 'written by a base service' }]), 'services/s.js': '', 'systems/alpha/contract.json': contract('alpha', { files: ['services/s.js'] }) });
  try { assert.equal(run(good, '--check').code, 0); } finally { fs.rmSync(good, { recursive: true, force: true }); }
});

/* د5-د · قرار المراجع 4 ود5-د2 · قرار 3 — base-name: قائمةُ قواعد مرتَّبة (tools/contracts.py ← NAME_RULES)، أولُ قاعدةٍ تطابق تحسم.
   «يُعدّ» = الاسمُ اسمُ برنامج · «لا يُعدّ» = مفتاحُ صلاحيةٍ مماثل أو دورُ حساب أو كلمةٌ لمعنى آخر — **كلٌّ بقاعدةٍ مكتوبة**.
   لكل قاعدةٍ هنا سطرٌ يطابقها (ملفٌ في شجرةٍ مصطنعة). ولا ورودَ بلا قاعدة: على المستودع وعلى الشجرة المصطنعة صنفُ other غائب. */
const USE = {
  'system-key': 'if (this.bsOn("alpha")) x();',
  'system-field': 'var e = { system: "alpha" };',
  'pk': 'if (pk === "alpha") x();',
  'registry': 'var p = { page: "alpha", name: "x" };',
  'go': 'this._bsGo("alpha");',
  'page-key': 'var pg = pages.filter((p) => "alpha" === p.key)[0];',
  'go-map': 'var go = { "افتح الصفحة": ["alpha", "tab"] };',
  'active-page': 'var v = { isAlpha: ap === "alpha" };',
  'nav-item': 'var v = { nAlpha: cls("alphaNav", "alpha") };',
  'page-list': 'var order = ["kpis", "emps", "planning", "alpha"];',
  'nav-perm': 'var NAVP = { staffing: "sched", beta: "alpha" };',
  'notif-leaf': "L('al_new','alpha','تنبيه','فور الحفظ',true,['own'],'info','bell','نص','افتح');",
  'dept-tabs': 'var a = (e && e.deptTabs && e.deptTabs(null, "alpha")) || [];',
  'shape': "var ops = { approve: ['*.ap'], shape: 'alpha' };",
  'scope-item': "items.push(it({ what: 'resource', kind: 'changed', id: 'alpha', path: '*' }));",
  'container-tab': 'var P = this._tabOk("alpha");',
  'ident-container': 'rep.floors.push({ container: "alpha", key: day });',   /* د5-هـ: وعاءُ البرنامج في تقرير ترحيل الهوية */
};
const NOT = {
  'role': ['if (u.role === "alpha") x();'],
  'perm-key': ['var r = { scope: "dept", cap: "alpha" };', 'if (P.can("alpha", "view")) x();', 'if (capOnDept(A, d, "alpha")) x();', 'var n = { k: "alpha", n: "x" };', "  'bassam_other_v1': ['alpha', 'emps/data'],",
    "var hs = hosts[key] || ['alpha', 'other/leaf'];", 'var has = -1 !== (dr.cap || []).indexOf("alpha");', "if (R9.field === 'alpha' && v != null) x();", "var K = { bassam_other_v1:'alpha' };"],
  'local-state': ['var v = { onAlpha: "alpha" === e };', "if (act === 'alpha') x();", 'var t = P ? "alpha" : "none";'],
  'guard-path': ["classifyFloor(R, a, b, 'floors[1]', 'alpha', ctx);"],
  'audit-filter': ['inp("alpha", "الشهر", 110);', "var planA = audLike(qA.get('alpha')).slice(0, 20);"],
  'element-kind': ['var offEl = SITE ? findEl(SITE.official, "alpha") : null;'],
  'bound-name': ["if (i9 === LIMIT) return 'alpha';", "try { f(); } catch (e) { swallow('alpha', e); }"],
  'label-pair': ["var F = [['site', 'المواقع'], ['alpha', 'خطط الشهور']];"],
};
test('base-name: every rule has a case — a name counts only where it is a program name; a same-named permission key, account role or other-meaning word is excluded by its own written rule', () => {
  const files = { 'systems/alpha/contract.json': contract('alpha') }, want = {};
  Object.entries(USE).forEach(([rule, line]) => { files['layouts/use-' + rule + '.js'] = line + '\n'; want['use:' + rule] = 1; });
  Object.entries(NOT).forEach(([rule, lines]) => { lines.forEach((line, i) => { files['layouts/not-' + rule + '-' + i + '.js'] = line + '\n'; }); want['not:' + rule] = lines.length; });
  files['layouts/comment.js'] = '/* اسمٌ في تعليق: "alpha"\n   وفي سطره الثاني "alpha" */\nvar x = 1;\n';   /* داخل تعليق: لا يُعدّ ولا يُصنَّف */
  const dir = tree(files);
  try {
    const got = JSON.parse(run(dir, '--scan').out);
    assert.deepEqual(Object.keys(got.violations).sort(), Object.keys(USE).map((rule) => 'base|base-name|' + path.basename(dir) + '/layouts/use-' + rule + '.js|alpha').sort());
    assert.deepEqual(got.names, Object.fromEntries(Object.entries(want).sort()));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  /* كلُّ قاعدةٍ في الأداة لها حالةٌ هنا، ولا قاعدةَ هنا ليست في الأداة */
  const src = fs.readFileSync(path.join(ROOT, 'tools/contracts.py'), 'utf8'), rules = [...src.slice(src.indexOf('NAME_RULES = ['), src.indexOf('def name_class')).matchAll(/^\s*\('(use|not)', '([a-z-]+)'/gm)].map((m) => m[1] + ':' + m[2]);
  assert.deepEqual(rules.filter((r) => r !== 'not:comment').sort(), Object.keys(want).sort());
});

test('base-name on the repository: no occurrence is left unclassified («other meaning» without a rule is not evidence)', () => {
  const names = scan().names;
  assert.equal(names.other, undefined, 'ورودٌ بلا قاعدة: ' + names.other);
  assert.ok(Object.keys(names).every((k) => /^(use|not):[a-z-]+$/.test(k)), Object.keys(names).join(' '));
});

/* ── د5-ح (القفل): ما كان الماسحُ أعمى عنه (44_د5-ب §76 · 45_د5-ج §90) — لكل نوعٍ خرقٌ مزروع يُكشف، والمُعلَن يمرّ (شجرةٌ مصطنعة TEST_ONLY) ── */
test('the lock (د5-ح): a page event between programs, a non-literal key, a permission-registry link and a via policy are caught — and declared ones pass', () => {
  const perms = (system, docs) => ({ schema: 1, system, note: 'TEST_ONLY', docs });
  const files = {
    'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_alpha_v1', 'bassam_alpha_grp_v1'], provides: { dom: { 'alpha:changed': 'TEST_ONLY' } } }),
    'systems/beta/contract.json': contract('beta', { owns: ['bassam_beta_v1'] }),
    'systems/gamma/contract.json': contract('gamma', { owns: ['bassam_gamma_v1'], consumes: { 'dom:alpha:changed': { from: 'alpha', absent: 'TEST_ONLY' }, 'perm:alpha': { absent: 'TEST_ONLY' }, 'via:bassam_alpha_v1': { absent: 'TEST_ONLY' }, 'key:bassam_alpha_grp_v1': { absent: 'TEST_ONLY' } } }),
    'systems/beta/system.json': { slots: { 'res.via.beta': { text: "beta: 'TEST_ONLY'" } } },
    /* (1) أحداثُ الصفحة: alpha يُطلق، beta يستمع بلا إعلان (dom)، القاعدةُ تستمع (base-dom)، gamma يعلنه (يمرّ)، وحدثُ القاعدة يستمع له الجميع */
    'systems/alpha/client/fire.js': 'window.dispatchEvent(new CustomEvent("alpha:changed", { detail: 1 }));\n',
    'systems/beta/client/listen.js': 'window.addEventListener("alpha:changed", f);\nwindow.addEventListener("base:tick", f);\n',
    'systems/gamma/client/listen.js': 'window.addEventListener("alpha:changed", f);\n',
    'layouts/listen.js': 'window.addEventListener("alpha:changed", f);\nwindow.dispatchEvent(new CustomEvent("base:tick"));\n',
    /* (2) الوصولُ غير الحرفي: بديلٌ في تعبيرٍ نمطي وذيلُ مفتاحٍ في قائمة — في برنامجٍ (dynkey) وفي القاعدة (base-dynkey)؛ gamma يعلن قراءته (يمرّ) */
    'systems/beta/client/dyn.js': 'if (/^bassam_(?:alpha|beta)_v1$/.test(k)) x();\n["alpha_v1", "beta_v1"].forEach(function (s) { get("bassam_" + s); });\n',
    'systems/gamma/client/dyn.js': 'if (/(^|:)bassam_(alpha)_grp_v1$/.test(k)) x();\n',
    'layouts/dyn.js': 'var DEV = /(^|:)bassam_(alpha)_grp_v1$/;\n',
    /* (3) سجلُّ الصلاحيات: beta تستهدف صفَّ alpha وتذكر ورقتَه (perm)، gamma تعلن perm:alpha (يمرّ)، والقاعدةُ تذكر ورقةَ alpha (base-perm) */
    'systems/alpha/permissions.json': perms('alpha', { registry: [{ path: ['registry'], after: 0, seq: 1, value: { key: 'alpha.view', owner: 'alpha/page', references: [] } }, { path: ['owners'], after: 0, seq: 2, value: { id: 'alpha/page' } }] }),
    'systems/beta/permissions.json': perms('beta', { registry: [{ path: ['registry', { by: 'key', eq: 'alpha.view' }, 'references'], after: 0, seq: 1, value: 'beta/page', needs: ['alpha'] }, { path: ['registry'], after: 0, seq: 2, value: { key: 'beta.view', owner: 'beta/page', references: ['alpha/page'] } }] }),
    'systems/gamma/permissions.json': perms('gamma', { registry: [{ path: ['registry', { by: 'key', eq: 'alpha.view' }, 'references'], after: 0, seq: 1, value: 'gamma/page', needs: ['alpha'] }] }),
    'permissions/registry/registry.base.json': { registry: [{ key: 'base.view', owner: 'base/page', references: ['alpha/page'] }], owners: [{ id: 'base/page' }] },
    /* (4) via: قطعةُ beta محقونةٌ في سطر مورد alpha (via) — وحرفاً في ملف gamma يعلنها (يمرّ) */
    'systems/alpha/server/res.js': "var R = { 'bassam_alpha_v1': { scope: 'dept', cap: 'alpha', via: { @@SYS:res.via.beta@@ } } };\n",
    'systems/gamma/server/res.js': "var R = { 'bassam_alpha_v1': { scope: 'dept', cap: 'alpha', via: { gamma: 'TEST_ONLY' } } };\n",
  };
  const dir = tree(files);
  try {
    const got = JSON.parse(run(dir, '--scan').out), b = path.basename(dir);
    assert.deepEqual(got.errors, []);
    assert.deepEqual(Object.keys(got.violations).sort(), [
      'base|base-dom|' + b + '/layouts/listen.js|alpha:changed',
      'base|base-dynkey|' + b + '/layouts/dyn.js|bassam_alpha_grp_v1',
      'base|base-perm|' + b + '/permissions/registry/registry.base.json|alpha',
      'beta|dom|systems/beta/client/listen.js|alpha:changed',
      'beta|dynkey|systems/beta/client/dyn.js|bassam_alpha_v1',
      'beta|perm|systems/beta/permissions.json|alpha',
      'beta|via|systems/alpha/server/res.js|bassam_alpha_v1',
    ].sort());
    assert.equal(got.violations['beta|dynkey|systems/beta/client/dyn.js|bassam_alpha_v1'], 2, 'البديلُ في التعبير وذيلُ القائمة كلاهما');
    assert.equal(got.violations['beta|perm|systems/beta/permissions.json|alpha'], 2, 'استهدافُ الصف وذكرُ الورقة كلاهما');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the lock (د5-ح): the new declarations are checked — malformed, self-pointing, stale or unbacked ones fail', () => {
  const perms = (system, docs) => ({ schema: 1, system, note: 'TEST_ONLY', docs });
  const alpha = contract('alpha', { owns: ['bassam_alpha_v1'], provides: { dom: { 'alpha:changed': 'TEST_ONLY' } } });
  const cases = {
    'dom without from': { 'systems/alpha/contract.json': alpha, 'systems/beta/contract.json': contract('beta', { consumes: { 'dom:alpha:changed': { absent: 'x' } } }) },
    'dom its present owner does not provide': { 'systems/alpha/contract.json': alpha, 'systems/beta/contract.json': contract('beta', { consumes: { 'dom:alpha:other': { from: 'alpha', absent: 'x' } } }) },
    'provides.dom with a bad name': { 'systems/alpha/contract.json': contract('alpha', { provides: { dom: { 'nocolon': 'x' } } }) },
    'perm on itself': { 'systems/alpha/contract.json': contract('alpha', { consumes: { 'perm:alpha': { absent: 'x' } } }) },
    'perm declared with no link (stale)': { 'systems/alpha/contract.json': alpha, 'systems/beta/contract.json': contract('beta', { consumes: { 'perm:alpha': { absent: 'x' } } }), 'systems/beta/permissions.json': perms('beta', { registry: [] }) },
    'via on its own key': { 'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_alpha_v1'], consumes: { 'via:bassam_alpha_v1': { absent: 'x' } } }) },
    'via with a bad key': { 'systems/alpha/contract.json': contract('alpha', { consumes: { 'via:alpha': { absent: 'x' } } }) },
  };
  for (const [name, files] of Object.entries(cases)) { const dir = tree(files); try { assert.equal(run(dir, '--check').code, 1, name); } finally { fs.rmSync(dir, { recursive: true, force: true }); } }
  const good = tree({ 'systems/alpha/contract.json': alpha, 'systems/beta/contract.json': contract('beta', { consumes: { 'dom:alpha:changed': { from: 'alpha', absent: 'x' }, 'dom:gone:x': { from: 'gone', absent: 'x' }, 'perm:gone': { absent: 'x' }, 'via:bassam_alpha_v1': { absent: 'x' } } }) });
  try { assert.equal(run(good, '--check').code, 0); } finally { fs.rmSync(good, { recursive: true, force: true }); }
});

/* د5-ح (إضافةُ المالك): كودٌ في القاعدة لا يستعمله إلا برنامج (أو برامج) ⇒ base-only — مكانُه مجلدُ البرنامج أو src/systems/_multi.
   المعلنُ موردَ قاعدةٍ مشتركاً (_base.json ← services) مستثنى، وما تستعمله القاعدةُ نفسُها عامٌّ حقاً. */
test('the lock (د5-ح · owner): base code used only by programs is caught (one program, or several) — base-used or declared-shared base code passes', () => {
  const dir = tree({
    'systems/alpha/contract.json': contract('alpha'), 'systems/beta/contract.json': contract('beta'),
    'contracts/_base.json': { schema: 1, kind: 'base', resources: [], services: [{ file: 'services/400-declared.js', global: 'BassamDeclared', why: 'TEST_ONLY' }] },
    'services/100-only-alpha.js': 'KIVO.BassamOnlyAlpha = { f: function () {} };\n',
    'services/200-alpha-beta.js': 'KIVO.BassamTwo = {};\nKIVO.BassamTwo.x = 1;\n',
    'services/300-shared.js': 'KIVO.BassamShared = {};\n',
    'services/400-declared.js': 'KIVO.BassamDeclared = {};\n',
    'services/500-unused.js': 'KIVO.BassamUnused = {};\n',
    'systems/alpha/client/a.js': 'KIVO.BassamOnlyAlpha.f(); KIVO.BassamTwo.x; KIVO.BassamShared; KIVO.BassamDeclared;\n',
    'systems/beta/client/b.js': 'KIVO.BassamTwo.x; KIVO.BassamDeclared;\n',
    'layouts/shell.js': 'KIVO.BassamShared;\n',
  });
  try {
    const got = JSON.parse(run(dir, '--scan').out), b = path.basename(dir);
    assert.deepEqual(got.errors, []);
    assert.deepEqual(Object.keys(got.violations).filter((k) => k.includes('|base-only|')).sort(), [
      'base|base-only|' + b + '/services/100-only-alpha.js|alpha',
      'base|base-only|' + b + '/services/200-alpha-beta.js|alpha+beta',
    ]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the lock (د5-ح): the repository is clean of every kind, the new kinds included, with nothing left in the exception list', () => {
  const now = scan();
  assert.deepEqual(now.errors, []);
  const left = Object.keys(now.violations).filter((k) => !/\|base-only\|src\/services\/566-print-core\.js\|/.test(k));
  assert.deepEqual(left, [], 'لا خرقَ باقٍ عدا مدخل print-core المؤقّت (يُغلقه فرعُ print)');
  assert.ok(Object.keys(allowed()).length <= CEILING.entries && CEILING_AFTER_PRINT.entries === 0);
});
