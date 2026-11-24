/* V7 · 53 (noreason · REVIEW.md البند ٣ — قرارُ المالك 23 نوفمبر): «لا يُطلب سببٌ لأيّ فعلٍ من أيّ مستخدم — رسالةُ التأكيد تكفي».
   حارسٌ ثابت على المُخرَج المبنيّ نفسِه (DIST: كلُّ JS الصفحات والخدمات وقوالبُها) والعامل (WORKER) — بشجرة acorn لا بـgrep:
     العميل  C1 لا بانيَ لنافذة السبب ولا مستدعيَ لها (askReason · reasonAsk9 · askFirst9 · rsnNeed9 · reasonNeed · _reasonFirst · _bcReasons · _irReasonRequired)
             C2 لا فرعَ يفحص رفضاً بـ why/err === 'reason' (أو 'reason-cancelled') ليفتح نافذةً أو يعيد الإرسال بسبب
             C3 لا إخفاقَ بسبب «نقص السبب» (fail/failure/_irFailure… بالرمز 'reason' أو 'reason-cancelled')
             C4 لا نصَّ من نصوص نافذة السبب في أيّ ملفٍّ مبنيّ (العنوان · الزر · «تذكّر» · حقلُ «اكتب السبب (ثلاثة أحرف…)» · «يشترط الخادم سبباً» …)
             C5 لا <textarea> في بانية نافذة التأكيد (dlg9) — نافذةُ تأكيدٍ وحدها
     العامل  W1 لا enfNo('reason') · W2 لا رفضَ { why|err: 'reason' } · W3 لا missingReason / 'missing-reason' في سياسة الاستعادة
             W4 كلُّ رفضٍ يذكر السبب (restore-reason · bad-reason · irshad-reason · seized-reason · award 'reason') محروسٌ بغيابه: لا يُرفض طلبٌ بلا سبب —
                حدُّ الطول والنوع وحده لما يُرسل · W5 لا شرطَ «!السبب ⇒ رفض» في أيّ موضع · W6 فهرسُ audit.reason (057) لا يقرؤه أيُّ موضع إنفاذ
     والسجلاتُ القديمة مقروءة: عبارةُ «تتطلب ذكر السبب» لصفوف السجل القديمة باقيةٌ في صفحة الإدارة، وفرعُ detail === "reason" في التنبيهات.
   يفشل على المُخرَج قبل الإصلاح (askReason · reasonAsk9 · askFirst9 · fail('reason') · missingReason …) وينجح بعده. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';
import { DIST, WORKER } from './harness.mjs';

const walk = (node, fn, anc = []) => {
  if (!node || typeof node.type !== 'string') return;
  fn(node, anc);
  const next = anc.concat([node]);
  for (const k of Object.keys(node)) {
    if (k === 'start' || k === 'end' || k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, fn, next));
    else if (v && typeof v.type === 'string') walk(v, fn, next);
  }
};
const ast = (src, file) => {
  for (const sourceType of ['script', 'module']) { try { return parse(src, { ecmaVersion: 'latest', sourceType, allowHashBang: true, allowReturnOutsideFunction: true }); } catch (e) { if (sourceType === 'module') throw new Error(file + ': ' + e.message); } }
  return null;
};
const files = (dir, rx) => { const out = []; const go = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) go(p); else if (rx.test(e.name)) out.push(p); } }; go(dir); return out.sort(); };
const name = (n) => (!n ? '' : n.type === 'Identifier' ? n.name : n.type === 'PrivateIdentifier' ? n.name : n.type === 'Literal' ? String(n.value) : '');
const propName = (m) => (m && m.type === 'MemberExpression' ? (m.computed ? (m.property.type === 'Literal' ? String(m.property.value) : '') : name(m.property)) : '');
const isReasonLit = (n) => n && n.type === 'Literal' && (n.value === 'reason' || n.value === 'reason-cancelled');
const at = (src, n) => { const l = src.slice(0, n.start).split('\n').length; return 'L' + l + ': ' + src.slice(n.start, Math.min(n.end, n.start + 140)).replace(/\s+/g, ' '); };

/* نصوصُ نافذة السبب كما كانت (280 · 548 · 590 · الإدارة · الإرشاد · الاستيراد التاريخي) */
const PHRASES = ['هذا الإجراء يتطلب سبباً', 'حفظ بالسبب', 'تذكّر هذا السبب', 'اكتب السبب (ثلاثة أحرف', 'يشترط الخادم سبباً', 'هذا الإجراء يتطلب سببًا',
  'لإدخال السبب', 'أُلغي إدخال السبب', 'لعدم إدخال سبب', 'لعدم كتابة سبب', 'نافذة سبب الاستيراد', 'سبب الاستيراد مطلوب'];
const BANNED_NAMES = new Set(['askReason', 'askReason9', 'reasonAsk9', 'askFirst9', 'rsnNeed9', 'rsnByRes9', 'reasonNeed', '_reasonFirst', '_bcReasons', '_irReasonRequired', 'rsnMem9']);

function clientFindings(file, src) {
  const out = [], tree = ast(src, file), rel = path.relative(DIST, file);
  walk(tree, (n) => {
    /* C1: تعريفُ الاسم أو الوصولُ إليه (srv.askReason · function askReason9 · { askReason: … } · this._reasonFirst) */
    if (n.type === 'Identifier' && BANNED_NAMES.has(n.name)) out.push('C1 ' + rel + ' ' + at(src, n));
    if (n.type === 'Literal' && typeof n.value === 'string' && BANNED_NAMES.has(n.value)) out.push('C1 ' + rel + ' ' + at(src, n));
    /* C2: x.why === 'reason' · x.err !== 'reason' … (رفضُ نقص السبب ⇒ نافذةٌ أو إعادةُ إرسالٍ بسبب). detail === 'reason' عرضٌ لسجلٍّ قديم — مسموح */
    if (n.type === 'BinaryExpression' && /^[!=]==?$/.test(n.operator)) {
      const [a, b] = isReasonLit(n.right) ? [n.left, n.right] : isReasonLit(n.left) ? [n.right, n.left] : [null, null];
      if (a && ['why', 'err'].includes(propName(a) || name(a))) out.push('C2 ' + rel + ' ' + at(src, n));
      void b;
    }
    if (n.type === 'CallExpression') {
      const callee = n.callee.type === 'MemberExpression' ? propName(n.callee) : name(n.callee);
      /* C3: fail('reason') · failure('reason', 403) · _irFailure('reason') · ['reason','reason-cancelled'].includes(result.err) */
      if (/fail/i.test(callee) && isReasonLit(n.arguments[0])) out.push('C3 ' + rel + ' ' + at(src, n));
      if (callee === 'includes' && n.callee.type === 'MemberExpression' && n.callee.object.type === 'ArrayExpression' && n.callee.object.elements.some(isReasonLit)
        && n.arguments[0] && ['why', 'err'].includes(propName(n.arguments[0]))) out.push('C3 ' + rel + ' ' + at(src, n));
    }
    /* C4 · C5: نصوصُ نافذة السبب في سلاسل JS وقوالبها */
    const text = n.type === 'Literal' && typeof n.value === 'string' ? n.value : n.type === 'TemplateElement' ? n.value.cooked || n.value.raw : null;
    if (text != null) {
      for (const ph of PHRASES) if (text.includes(ph)) out.push('C4 ' + rel + ' «' + ph + '» ' + at(src, n));
      if (/<textarea/i.test(text) && /السبب/.test(text)) out.push('C5 ' + rel + ' ' + at(src, n));
    }
  });
  /* C5: بانيةُ نافذة التأكيد في طبقة التخزين (dlg9) بلا حقل نصّ */
  walk(tree, (n) => {
    if (n.type === 'FunctionDeclaration' && name(n.id) === 'dlg9') {
      walk(n, (m) => { const t = m.type === 'Literal' && typeof m.value === 'string' ? m.value : null; if (t && /<textarea|<input/i.test(t)) out.push('C5 ' + rel + ' dlg9 ' + at(src, m)); });
    }
  });
  return out;
}

test('noreason · العميل المبنيّ: لا نافذةَ سبب ولا مستدعيَ لها ولا فرعَ «رفضٌ لنقص السبب» في أيّ صفحة أو خدمة (C1–C5)', () => {
  const js = files(path.join(DIST, 'assets'), /\.js$/), tpl = files(path.join(DIST, 'assets'), /\.(?:dc\.txt|html)$/).concat(files(DIST, /^index\.html$/));
  assert.ok(js.length > 30, 'built JS found in ' + DIST + ': ' + js.length);
  assert.ok(js.some((f) => /280-server-storage\./.test(f)), 'the storage layer is part of the scan');
  const bad = [];
  for (const f of js) bad.push(...clientFindings(f, fs.readFileSync(f, 'utf8')));
  for (const f of tpl) { const s = fs.readFileSync(f, 'utf8'); for (const ph of PHRASES) if (s.includes(ph)) bad.push('C4 ' + path.relative(DIST, f) + ' «' + ph + '»'); }
  assert.deepEqual(bad, [], 'reason prompts remain in the built pages:\n' + bad.join('\n'));
  /* السجلاتُ القديمة مقروءة: صفُّ رفضٍ قديمٍ بـdetail «reason» ما زال يُعرض بنصّه */
  const admin = js.filter((f) => /Admin\.logic\./.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('');
  assert.match(admin, /هذه العملية تتطلب ذكر السبب/, 'old «reason» log rows still have their wording in the admin log');
  /* طبقةُ التخزين: ما بقي للتوافق ثابتٌ لا يسأل (reasonExempt ⇒ true · reasonFirst ⇒ go:true) */
  const store = fs.readFileSync(js.find((f) => /280-server-storage\./.test(f)), 'utf8');
  assert.match(store, /function exempt9\(\) \{ return true; \}/);
});

function workerFindings(src) {
  const out = [], tree = ast(src, 'worker'), seen = [];
  const fnOf = (anc) => { for (let i = anc.length - 1; i >= 0; i--) if (/Function/.test(anc[i].type)) return anc[i]; return tree; };
  const txt = (n) => src.slice(n.start, n.end);
  walk(tree, (n, anc) => {
    if (n.type === 'CallExpression') {
      const callee = n.callee.type === 'MemberExpression' ? propName(n.callee) : name(n.callee);
      /* W1 */
      if (callee === 'enfNo' && isReasonLit(n.arguments[0])) out.push('W1 ' + at(src, n));
      /* W4: رفضٌ يذكر السبب ⇒ محروسٌ بغيابه (… !== undefined && …) أو بتطبيع الغائب إلى "" قبله في الدالة نفسِها، وشرطُه لا يرفض الفارغ */
      const code = n.arguments[0] && n.arguments[0].type === 'Literal' && typeof n.arguments[0].value === 'string' ? n.arguments[0].value : '';
      if (/Error$/.test(callee) && /(^|-)reason$/.test(code)) {
        seen.push(code);
        const ifs = anc.filter((a) => a.type === 'IfStatement' || a.type === 'ConditionalExpression' || a.type === 'LogicalExpression');
        const tests = ifs.map((a) => txt(a.test || a)).join(' ;; '), fn = txt(fnOf(anc));
        const guarded = /\breason\s*!==\s*undefined/.test(tests) || /if\s*\(\s*([\w.]+)\.reason\s*===\s*undefined\s*\)\s*\1\.reason\s*=\s*''/.test(fn);
        const rejectsEmpty = /!\s*\(?\s*[\w.]*\breason\b(?!\s*[!=]==)|\breason(?:\.trim\(\))?\.length\s*<\s*\d|\breason\s*===\s*''/.test(tests);
        if (!guarded || rejectsEmpty) out.push('W4 ' + code + ' ' + at(src, n) + ' · guards: ' + tests.slice(0, 200));
      }
    }
    /* W2: { why: 'reason' } · { err: 'reason' } */
    if (n.type === 'Property' && ['why', 'err'].includes(name(n.key)) && isReasonLit(n.value)) out.push('W2 ' + at(src, n));
    /* W3 */
    if ((n.type === 'Identifier' && n.name === 'missingReason') || (n.type === 'Literal' && n.value === 'missing-reason')) out.push('W3 ' + at(src, n));
    /* W5: if (!reason …) ⇒ رفض (throw · return json · enfNo) */
    if (n.type === 'IfStatement') {
      const t = txt(n.test), c = txt(n.consequent);
      if (/!\s*\(?\s*(?:String\()?[\w.]*\breason\b(?!\s*[!=]==)/.test(t) && /\bthrow\b|return\s+json\(|enfNo\(|batchDeny/.test(c)) out.push('W5 ' + at(src, n));
    }
    /* W6: قراءةُ فهرس audit.reason (‹ix›.reason[k]) — الإسنادُ في البناء وحده مسموح */
    if (n.type === 'MemberExpression' && n.computed && n.object.type === 'MemberExpression' && propName(n.object) === 'reason' && !n.object.computed) {
      const parent = anc[anc.length - 1];
      if (!(parent && parent.type === 'AssignmentExpression' && parent.left === n)) out.push('W6 ' + at(src, n));
    }
  });
  return { out, seen };
}

test('noreason · العامل: لا يشترط الخادمُ سبباً ولا يرفض لغيابه في أيّ مسار (W1–W6)', () => {
  const src = fs.readFileSync(WORKER, 'utf8');
  const { out: bad, seen } = workerFindings(src);
  assert.deepEqual(bad, [], 'server reason requirements remain in ' + WORKER + ':\n' + bad.join('\n'));
  /* الحارسُ ليس فارغاً: رفوضُ السبب المعروفة (طولٌ/نوعٌ لما يُرسل) كلُّها فُحصت */
  for (const code of ['restore-reason', 'bad-reason', 'irshad-reason', 'seized-reason', 'reason']) assert.ok(seen.includes(code), 'W4 inspected ' + code + ' · seen: ' + seen.join(','));
  /* السجلاتُ القديمة مقروءة: تنبيهُ صفّ الرفض القديم بـdetail «reason» باقٍ */
  assert.match(src, /r\.detail === "reason"/, 'the bell still words old «reason» rows');
});
