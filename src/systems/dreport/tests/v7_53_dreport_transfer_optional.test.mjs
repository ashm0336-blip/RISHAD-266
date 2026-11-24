/* V7 · 53 (REVIEW ١١-أ — قرارُ المراجع): سببُ التحويل في نموذج التقرير اليومي اختياريّ — يُحفظ إن كُتب ولا يُمنع التحويلُ بغيابه.
   «موافق» (mkTrGo) الحقيقيّ من منطق الصفحة (مستخرَجاً بشجرة acorn ومُنفَّذاً في vm): بوردية مختارة وسببٍ فارغ تُفتح نافذةُ تأكيد التحويل
   (drTrConfirm) بسببٍ فارغ ولا تظهر رسالةُ «اكتب سبب التحويل أولاً — حقل مطلوب» · والسببُ المكتوب يُحمل كما هو · وبلا وردية تبقى رسالتُها.
   والتنفيذُ (rpTransfer) يكتب tout[ekey] = { to, why } بلا شرطٍ على السبب، وعرضُ التأكيد يقول «بلا سبب مذكور». */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const LOGIC = fs.readFileSync(path.join(ROOT, 'src/systems/dreport/client/logic.js'), 'utf8');
const tree = parse(LOGIC, { ecmaVersion: 'latest' });
const props = [];
(function walk(n) { if (!n || typeof n.type !== 'string') return; if (n.type === 'Property') props.push(n); for (const v of Object.values(n)) { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); } })(tree);
const prop = (name) => { const p = props.filter((x) => (x.key.name || x.key.value) === name); assert.equal(p.length, 1, name + ' once'); return LOGIC.slice(p[0].value.start, p[0].value.end); };

function page(state) {
  const toasts = [], r = { state: { ...state }, setState(u) { this.state = { ...this.state, ...u }; }, bsToast: (t, k) => toasts.push([t, k]) };
  /* r = الصفحة · o = الوردية المحوَّل منها · e = صفُّ الموظف — كما في renderVals */
  const go = vm.runInContext('(function (r, o, e) { return (' + prop('mkTrGo') + '); })', vm.createContext({}))(r, 'TEST_ONLY_FROM', { ekey: 'TEST_ONLY_E1', name: 'TEST_ONLY_A', empno: '7' });
  return { r, toasts, go };
}

test('REVIEW ١١-أ: «موافق» على التحويل بسببٍ فارغ يفتح تأكيدَ التحويل بلا رسالة «حقل مطلوب»', () => {
  const P = page({ drTrSel: 'TEST_ONLY_TO', drTrWhy: '   ' });
  P.go();
  assert.deepEqual(P.toasts, [], 'لا رسالةَ «اكتب سبب التحويل»');
  assert.deepEqual(JSON.parse(JSON.stringify(P.r.state.drTrConfirm)), { ekey: 'TEST_ONLY_E1', name: 'TEST_ONLY_A', empno: '7', from: 'TEST_ONLY_FROM', to: 'TEST_ONLY_TO', why: '' });
});

test('REVIEW ١١-أ: السببُ المكتوب يُحمل كما هو · وبلا وردية مختارة تبقى رسالتُها', () => {
  const A = page({ drTrSel: 'TEST_ONLY_TO', drTrWhy: ' TEST_ONLY نقص ' }); A.go();
  assert.equal(A.r.state.drTrConfirm.why, 'TEST_ONLY نقص');
  const B = page({ drTrSel: '', drTrWhy: '' }); B.go();
  assert.equal(B.r.state.drTrConfirm, undefined); assert.match(B.toasts[0][0], /اختر الوردية/);
});

test('REVIEW ١١-أ: التنفيذُ والعرض لا يشترطان السبب (rpTransfer يكتب { to, why } كما هو · العرضُ «بلا سبب مذكور»)', () => {
  const m = /  async rpTransfer\(\) \{[\s\S]*?\n  \}\n/.exec(LOGIC); assert.ok(m, 'rpTransfer');
  assert.match(m[0], /e\.tout\[t\.ekey\] = \{ to: t\.to, why: t\.why \}/);
  assert.doesNotMatch(m[0], /!\s*t\.why|t\.why\.trim\(\)\s*\)|سبب التحويل/, 'rpTransfer has no reason condition');
  assert.match(LOGIC, /"  ·  بلا سبب مذكور"/);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/systems/dreport/client/view.html'), 'utf8'), /سبب التحويل \* \(مطلوب\)/, 'the field is not marked required');
});
