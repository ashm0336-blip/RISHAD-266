/* KIVO_265 · البند 19 (الدَّين التقني) — أجزاءُ منطق الوحدة (meta.json "logicParts"): tools/page_modules.py يجمع logic.js + الأجزاءَ نصاً واحداً
   عند التركيب، والوحدةُ بلا أجزاء تبقى بايتاً كما كانت؛ وصفحةُ المهام مقسَّمةٌ فعلاً: كلُّ جزءٍ Object.assign(Component.prototype, {…}) صالحٌ وحده،
   لا منهجَ معرَّفاً مرتين (وإلا غلب الأخيرُ بصمت)، والصنفُ المجمَّع (كما تراه الاختباراتُ عبر moduleLogic) يحمل مناهجَ الأجزاء كلَّها ويبدأ بـ"use strict"
   فتبقى المناهجُ المنقولة صارمةً كما كانت داخل الصنف. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { PYTHON, ROOT, SRC, moduleLogic, moduleDir } from './harness.mjs';

const PM = path.join(ROOT, 'tools', 'page_modules.py');
const META = (slug) => JSON.parse(fs.readFileSync(path.join(moduleDir(slug), 'meta.json'), 'utf8'));
const SCRIPT_RX = /<script(?: type="text\/x-dc")? data-dc-script[^>]*>([\s\S]*?)<\/script>/;
const M_RX = /^  (?:async )?([A-Za-z_$][\w$]*)\(.*\{$/gm;   /* مناهجُ الصنف/الكائن في المستوى الثاني (prettier) */
const names = (t) => [...t.matchAll(M_RX)].map((m) => m[1]);
function tmpModules(mods) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pm265_')); const m = path.join(d, 'modules'); fs.mkdirSync(m);
  const pre = '<!DOCTYPE html>\n<html>\n<body>\n<x-dc>\n<helmet>\n', mid = '\n</helmet>\n', mid2 = '\n</x-dc>\n', tag = '<script type="text/x-dc" data-dc-script>', post = '</script>\n</body>\n</html>\n';
  fs.writeFileSync(path.join(m, 'modules.json'), JSON.stringify({ pages: mods.map((x) => ({ name: x.name, slug: x.slug, minifiedSource: false })) }));
  for (const x of mods) {
    const q = path.join(m, x.slug); fs.mkdirSync(q);
    fs.writeFileSync(path.join(q, 'meta.json'), JSON.stringify(Object.assign({ name: x.name, slug: x.slug, pre, mid, mid2, scriptTag: tag, post, minifiedSource: false }, x.parts ? { logicParts: x.parts.map((p) => p[0]) } : {})));
    fs.writeFileSync(path.join(q, 'helmet.css'), '.a{}'); fs.writeFileSync(path.join(q, 'view.html'), '<div>v</div>');
    fs.writeFileSync(path.join(q, 'logic.js'), x.logic);
    for (const [f, t] of x.parts || []) fs.writeFileSync(path.join(q, f), t);
  }
  return { d, m, p: path.join(d, 'pages') };
}
const join = (m, p) => execFileSync(PYTHON, [PM, 'join', m, p], { encoding: 'utf8' });

test('page_modules.py join: الأجزاءُ تُلحق بـlogic.js بترتيب "logicParts" · والوحدةُ بلا أجزاء نصُّها كما هو بايتاً · وsplit يرفض الكتابةَ فوق وحدةٍ مقسَّمة', () => {
  const core = 'class Component {\n  a() {\n    return 1;\n  }\n}\n', p1 = 'Object.assign(Component.prototype, {\n  b() {\n    return 2;\n  },\n});\n', p2 = 'Object.assign(Component.prototype, {\n  c() {\n    return 3;\n  },\n});';   /* الثاني بلا سطرٍ أخير */
  const T = tmpModules([{ name: 'Split', slug: 'split', logic: core, parts: [['logic-b.js', p1], ['logic-c.js', p2]] }, { name: 'Plain', slug: 'plain', logic: 'class Component {}' }]);
  join(T.m, T.p);
  const s = SCRIPT_RX.exec(fs.readFileSync(path.join(T.p, 'Split.dc.html'), 'utf8'))[1];
  assert.equal(s, core + p1 + p2 + '\n', 'logic.js ثم الجزءان بترتيبهما — وسطرٌ أخير يُضمن بين الملفات');
  assert.equal(SCRIPT_RX.exec(fs.readFileSync(path.join(T.p, 'Plain.dc.html'), 'utf8'))[1], 'class Component {}', 'بلا أجزاء: النصُّ كما هو (التركيبُ بايتاً)');
  /* الصنفُ المجمَّع يعمل: مناهجُ الأجزاء على النموذج */
  const ctx = {}; vm.createContext(ctx); vm.runInContext(s + '\n;globalThis.__C = Component;', ctx);
  const c = new ctx.__C(); assert.deepEqual([c.a(), c.b(), c.c()], [1, 2, 3]);
  /* split فوق وحدةٍ مقسَّمة مرفوض (لا يعرف الأجزاء فيدمجها في logic.js ويُفقد التقسيم) */
  let err = '';
  try { execFileSync(PYTHON, [PM, 'split', T.p, T.m], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { err = String(e.stderr || e.stdout || e.message); }
  assert.match(err, /logicParts/, 'split يرفض: ' + err.slice(0, 120));
  fs.rmSync(T.d, { recursive: true, force: true });
});

test('صفحةُ المهام مقسَّمة: الأجزاءُ معلنةٌ وموجودة وصالحةٌ وحدها · لا منهجَ مكرَّراً بين logic.js والأجزاء · الصنفُ المجمَّع يحملها كلَّها ويبدأ صارماً', () => {
  const meta = META('tasks'), parts = meta.logicParts || [];
  assert.ok(parts.length >= 6, 'logicParts: ' + parts.join(','));
  assert.deepEqual(meta.charter.domain, ['src/modules/tasks/logic.js'].concat(parts.map((f) => 'src/modules/tasks/' + f)), 'الميثاق: domain = الأصلُ والأجزاء');
  const core = fs.readFileSync(path.join(SRC, 'modules/tasks/logic.js'), 'utf8');
  assert.ok(core.startsWith('"use strict";\nclass Component extends '), 'logic.js: "use strict" ثم الصنف');
  const all = names(core), seen = new Set(all), partNames = {};
  for (const f of parts) {
    const t = fs.readFileSync(path.join(SRC, 'modules/tasks', f), 'utf8');
    assert.match(t, /^\/\* KIVO_265 · البند 19/, f + ': ترويسةُ الجزء');
    assert.ok(t.includes('\n"use strict";\nObject.assign(Component.prototype, {\n') && t.endsWith('\n});\n'), f + ': Object.assign(Component.prototype, {…}) صالحٌ وحده');
    /* يُحلَّل وحده (صالحٌ نحوياً) ويُنفَّذ على صنفٍ فارغ */
    const ctx = { Component: class {} }; vm.createContext(ctx); vm.runInContext(t, ctx, { filename: f });
    const ns = names(t); assert.ok(ns.length >= 1, f + ': مناهج');
    partNames[f] = ns;
    for (const n of ns) { assert.ok(!seen.has(n), f + ': المنهج ' + n + ' معرَّفٌ مرتين'); seen.add(n); assert.equal(typeof ctx.Component.prototype[n], 'function', f + ': ' + n + ' على النموذج'); }
  }
  /* المجمَّع كما تراه اختباراتُ الصفحة (moduleLogic) = ما يركّبه page_modules.py قبل الضغط */
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'pm265_')); join(path.join(SRC, 'modules'), T);
  const joined = SCRIPT_RX.exec(fs.readFileSync(path.join(T, meta.name + '.dc.html'), 'utf8'))[1]; fs.rmSync(T, { recursive: true, force: true });
  const L = moduleLogic('tasks');
  assert.equal(L, joined, 'moduleLogic = تركيبُ الأداة');
  assert.ok(L.startsWith('"use strict";'), 'السكربتُ كلُّه صارم (المناهجُ المنقولة كانت صارمةً داخل الصنف)');
  /* يُحمَّل في vm كما في اختبارات الصفحة: الصنفُ يحمل مناهجَ الأجزاء كلَّها */
  const KIVO = { BassamPageKit: { base: (B) => class extends B {} } };
  const ctx = { KIVO, DCLogic: class {}, Intl, Date, Math, JSON, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, window: {}, document: {}, localStorage: { getItem: () => null }, setTimeout: () => 0, clearTimeout: () => 0 };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(L + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic(+parts).js' });
  for (const f of parts) for (const n of partNames[f]) assert.equal(typeof ctx.__C.prototype[n], 'function', n + ' (' + f + ') على Component');
  for (const n of ['renderVals', 'componentDidMount', '_doReopen', 'mutateLocks']) assert.equal(typeof ctx.__C.prototype[n], 'function', n + ' في الأصل');
  /* الحزمةُ المولَّدة: سكربتٌ واحد صارمٌ وفيه الأجزاءُ الثمانية */
  const page = SCRIPT_RX.exec(fs.readFileSync(path.join(SRC, 'pages', meta.name + '.dc.html'), 'utf8'))[1];
  assert.ok(page.startsWith('"use strict";'), 'الحزمة: "use strict" أولاً');
  assert.equal((page.match(/Object\.assign\(Component\.prototype,/g) || []).length, parts.length, 'الحزمة: جزءٌ لكل ملف');
});
