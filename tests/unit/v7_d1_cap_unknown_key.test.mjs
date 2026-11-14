/* V7 · المرحلة 2 · الحزمة د1 — إغلاقُ سماح المفتاح المجهول في capOnDept (workers/parts/021-authz-core-intro.js).
   كان مفتاحُ صفحةٍ رئيسيٌّ غيرُ موجود في PG_KEYS يُعدّ «مفعّلاً على الإدارة» (return true)، فالنظامُ الذي يغيب مفتاحُ صفحته من PG_REG
   (مجلدٌ مفقود أو تعريفٌ غيرُ صالح حين تُقرأ الصفحاتُ من المجلدات) تظهر تنبيهاتُه لمن في النطاق (019 nfPage). الآن: منعٌ.
   على العامل المولَّد نفسه: نسخةٌ كما هي، ونسخةٌ أُزيل منها سطرُ «irshad» من PG_REG وحده. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WORKER } from './harness.mjs';

const SRC = fs.readFileSync(WORKER, 'utf8'), LINE = "  { key: 'irshad', subs: ['dash', 'records'], off: ['dash'] },\n";
let n = 0;
const load = (text) => import('data:text/javascript;base64,' + Buffer.from(text + '\nexport { capOnDept, nfPage, PG_KEYS };\n// v7-d1-cap ' + ++n).toString('base64'));
const SUPER = { u: { id: 'TEST_ONLY_su', role: 'super' }, perms: { caps: {} }, enf: false };
/* V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية — فالتنبيهاتُ تُفحص بمدير الإدارة (يرث سقفَ إدارته) */
const MGR = { u: { id: 'TEST_ONLY_m1', role: 'staff', deptId: 'TEST_ONLY_d1', ekey: 'mgr:TEST_ONLY_d1', mgr: 1 }, users: [], perms: { caps: {} }, depts: [{ id: 'TEST_ONLY_d1', name: 'TEST_ONLY' }], nodes: [], off: [], enf: false };

test('مفتاحُ صفحةٍ أُزيل من PG_REG: لا يُعدّ مفعّلاً، فتنبيهاتُه لا تظهر (ir_new · ir_edit · ir_day)', async () => {
  assert.equal(SRC.split(LINE).length, 2, 'سطرُ irshad في PG_REG مرّةً واحدة');
  const W = await load(SRC), G = await load(SRC.replace(LINE, ''));
  assert.ok(W.PG_KEYS.includes('irshad') && !G.PG_KEYS.includes('irshad'), 'النسختان كما قُصد');
  for (const type of ['ir_new', 'ir_edit', 'ir_day']) {
    assert.equal(W.nfPage(MGR, 'TEST_ONLY_d1', type, 'irshad', 'view'), true, 'الضبط: الصفحةُ معروفة ⇒ تظهر ' + type);
    assert.equal(G.nfPage(MGR, 'TEST_ONLY_d1', type, 'irshad', 'view'), false, 'الصفحةُ غائبةٌ من PG_REG ⇒ لا تظهر ' + type);
    assert.equal(G.nfPage(SUPER, 'TEST_ONLY_d1', type, 'irshad', 'view'), true, 'د1-ج: مدير المنصة بلا قيد ' + type);
  }
  assert.equal(G.capOnDept(SUPER, 'TEST_ONLY_d1', 'irshad'), false);
  assert.equal(G.capOnDept(SUPER, 'TEST_ONLY_d1', 'irshad/records'), false, 'الورقةُ تحتها مغلقةٌ كما كانت');
});

test('المفتاحُ المجهول يُمنع، والمعروفُ كما كان، والفارغُ كما كان', async () => {
  const W = await load(SRC);
  assert.equal(W.capOnDept(SUPER, 'TEST_ONLY_d1', 'TEST_ONLY_no_such_page'), false, 'مجهول ⇒ منع');
  for (const k of W.PG_KEYS) assert.equal(W.capOnDept(SUPER, 'TEST_ONLY_d1', k), true, 'المعروفُ بلا سقفٍ مفعّل: ' + k);
  assert.equal(W.capOnDept(SUPER, 'TEST_ONLY_d1', ''), true, 'بلا مفتاح ⇒ كما كان');
  const capped = { u: SUPER.u, perms: { caps: { TEST_ONLY_d1: ['tasks'] } }, enf: false };
  assert.equal(W.capOnDept(capped, 'TEST_ONLY_d1', 'tasks'), true);
  assert.equal(W.capOnDept(capped, 'TEST_ONLY_d1', 'irshad'), false, 'السقفُ يقطع المعروف كما كان');
});
