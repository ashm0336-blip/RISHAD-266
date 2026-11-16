/* V7 · د2 — مقبسُ الأنظمة (tools/systems.py): قارئُ system.json ومحرّكُ الفتحات، في مجلدٍ مؤقت بأنظمةٍ اصطناعية (TEST_ONLY).
   يثبت: requires غائبة تُرفض · الدورة تُرفض · المفتاح = اسم المجلد · القطعُ تُحقن مرتَّبةً بـ(order ثم المفتاح) وتوصل بـsep،
   و pre/post لا يُكتبان بلا قطعة · حذفُ مجلد نظامٍ يُخرجه من الناتج · قطعةٌ بلا فتحة تُرفض · والمستودعُ نفسُه: الأنظمةُ الأربعة صالحة والمضبوطات تتطلب الاسترشاد. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PYTHON, SYSTEMS, hasSystem } from './harness.mjs';
import { needs } from './harness.mjs';

const run = (src, ...a) => spawnSync(PYTHON, [path.join(ROOT, 'tools', 'systems.py'), ...a, '--src', src], { encoding: 'utf8' });
const sys = (key, extra = {}) => Object.assign({ schema: 1, kind: 'system', key, name: 'TEST_ONLY ' + key, client: { slug: key, component: key, files: [] }, server: { parts: [] } }, extra);
function world(systems, tpl) {
  const d = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'd2sys-')), src = path.join(d, 'src');
  fs.mkdirSync(path.join(src, 'schemas'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'src/schemas/system.schema.json'), path.join(src, 'schemas/system.schema.json'));
  for (const [folder, json, files] of systems) { const sd = path.join(src, 'systems', folder); fs.mkdirSync(sd, { recursive: true }); fs.writeFileSync(path.join(sd, 'system.json'), JSON.stringify(json)); for (const [f, t] of Object.entries(files || {})) fs.writeFileSync(path.join(sd, f), t); }
  if (tpl != null) { fs.mkdirSync(path.join(src, 'slots'), { recursive: true }); fs.writeFileSync(path.join(src, 'slots/slots.json'), JSON.stringify({ templates: [{ tpl: 'out.txt.tpl', out: 'out.txt' }] })); fs.writeFileSync(path.join(src, 'slots/out.txt.tpl'), tpl); }
  return { d, src, out: () => fs.readFileSync(path.join(d, 'out.txt'), 'utf8'), done: () => fs.rmSync(d, { recursive: true, force: true }) };
}

test('V7 · د2: requires غائبة أو دائرية تُرفض، والمفتاحُ يطابق اسم المجلد', () => {
  let w = world([['b', sys('b', { requires: ['a'] })]]); let r = run(w.src, '--check'); w.done();
  assert.equal(r.status, 1); assert.match(r.stdout, /b يتطلب «a» وهو غير حاضر/);
  w = world([['a', sys('a', { requires: ['b'] })], ['b', sys('b', { requires: ['a'] })]]); r = run(w.src, '--check'); w.done();
  assert.equal(r.status, 1); assert.match(r.stdout, /requires دائرية/);
  w = world([['a', sys('zz')]]); r = run(w.src, '--check'); w.done();
  assert.equal(r.status, 1); assert.match(r.stdout, /key «zz» ≠ اسم المجلد/);
  w = world([['a', sys('a')], ['b', sys('b', { requires: ['a'] })]]); r = run(w.src, '--list'); w.done();
  assert.deepEqual(JSON.parse(r.stdout).map((x) => [x.key, x.requires]), [['a', []], ['b', ['a']]]);
});

test('V7 · د2: القطعُ تُحقن بالترتيب وتوصل بـsep، و pre/post بلا قطعةٍ لا يُكتبان، وحذفُ النظام يُخرجه', () => {
  const tpl = 'L=[@@SYS:list|sep=","|pre="<"|post=">"@@]\nA@@SYS:plain@@Z\nE=[@@SYS:none|pre="x"@@]\n';
  const a = sys('a', { slots: { list: { order: 20, text: 'a20' }, plain: { text: '-a-' } } });
  const b = sys('b', { slots: { list: [{ order: 10, text: 'b10' }, { order: 30, file: 'frag.txt' }], plain: { text: '-b-' } } });
  let w = world([['a', a], ['b', b, { 'frag.txt': 'b30\n' }]], tpl); let r = run(w.src, '--write'); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(w.out(), 'L=[<b10,a20,b30\n>]\nA-a--b-Z\nE=[]\n');
  assert.equal(run(w.src, '--check').status, 0);
  fs.rmSync(path.join(w.src, 'systems/b'), { recursive: true }); r = run(w.src, '--check'); assert.equal(r.status, 1, 'الملتزَمُ صار قديماً'); assert.match(r.stdout, /out\.txt ≠ قالبه/);
  assert.equal(run(w.src, '--write').status, 0); assert.equal(w.out(), 'L=[<a20>]\nA-a-Z\nE=[]\n');
  fs.rmSync(path.join(w.src, 'systems'), { recursive: true }); assert.equal(run(w.src, '--write').status, 0); assert.equal(w.out(), 'L=[]\nAZ\nE=[]\n', 'بلا نظام: الفتحاتُ فارغة');
  w.done();
  w = world([['a', sys('a', { slots: { typo: { text: 'x' } } })]], 'no slot here\n'); r = run(w.src, '--check'); w.done();
  assert.notEqual(r.status, 0); assert.match(r.stdout + r.stderr, /قطعٌ بلا فتحة في أي قالب: typo/);
});

test('V7 · د2-ب: النصُّ المحايد empty، وبدائلُ القطعة first · last · only بحسب من حضر', () => {
  const tpl = 'K=@@SYS:keys|sep=" || "|pre="("|post=")"|empty="false"@@;\nR=@@SYS:res|empty="[]"@@;\nF=@@SYS:fn|empty="null"@@;\n';
  const a = sys('a', { slots: { keys: { order: 10, text: 'aKey(k)' }, res: { order: 10, text: 'A_RES', }, fn: { order: 10, text: 'p === "a" ? fa : ', last: 'fa' } } });
  const b = sys('b', { slots: { keys: { order: 20, text: 'bKey(k)' }, res: { order: 20, text: '.concat(B_RES)', first: 'B_RES' }, fn: { order: 20, text: 'fb' } } });
  const w = world([['a', a], ['b', b]], tpl); assert.equal(run(w.src, '--write').status, 0);
  assert.equal(w.out(), 'K=(aKey(k) || bKey(k));\nR=A_RES.concat(B_RES);\nF=p === "a" ? fa : fb;\n', 'الاثنان: النصُّ كما كان');
  fs.rmSync(path.join(w.src, 'systems/a'), { recursive: true }); assert.equal(run(w.src, '--write').status, 0);
  assert.equal(w.out(), 'K=(bKey(k));\nR=B_RES;\nF=fb;\n', 'بلا a: b الأولى تأخذ first');
  fs.rmSync(path.join(w.src, 'systems/b'), { recursive: true }); fs.mkdirSync(path.join(w.src, 'systems/a')); fs.writeFileSync(path.join(w.src, 'systems/a/system.json'), JSON.stringify(a)); assert.equal(run(w.src, '--write').status, 0);
  assert.equal(w.out(), 'K=(aKey(k));\nR=A_RES;\nF=fa;\n', 'بلا b: a الأخيرة تأخذ last');
  fs.rmSync(path.join(w.src, 'systems'), { recursive: true }); assert.equal(run(w.src, '--write').status, 0);
  assert.equal(w.out(), 'K=false;\nR=[];\nF=null;\n', 'بلا نظام: النصُّ المحايد'); w.done();
});

test('V7 · د2: المستودع — الأنظمةُ الحاضرة صالحة، وكلُّ متطلَّبٍ حاضر (المضبوطات تتطلب الاسترشاد)، والمحقونُ = الملتزَم', needs('award'), () => {
  const r = run(path.join(ROOT, 'src'), '--list'); assert.equal(r.status, 0, r.stderr);
  /* د2-ب: المقبسُ يسرد ما في src/systems بالضبط — أربعةٌ في المستودع الكامل، وأقلّ في نسخة اختبار الحذف */
  const L = JSON.parse(r.stdout); assert.deepEqual(L.map((x) => x.key), SYSTEMS);
  for (const x of L) for (const q of x.requires || []) assert.ok(SYSTEMS.includes(q), x.key + ' يتطلب ' + q);
  if (hasSystem('seized')) assert.deepEqual(L.find((x) => x.key === 'seized').requires, ['irshad']);
  const c = run(path.join(ROOT, 'src'), '--check'); assert.equal(c.status, 0, c.stdout + c.stderr);
});
