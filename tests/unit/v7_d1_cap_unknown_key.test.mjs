/* V7 · المرحلة 2 · الحزمة د1 — إغلاقُ سماح المفتاح المجهول في capOnDept (workers/parts/021-authz-core-intro.js).
   كان مفتاحُ صفحةٍ رئيسيٌّ غيرُ موجود في PG_KEYS يُعدّ «مفعّلاً على الإدارة» (return true)، فالنظامُ الذي يغيب مفتاحُ صفحته من PG_REG
   (مجلدٌ مفقود أو تعريفٌ غيرُ صالح حين تُقرأ الصفحاتُ من المجلدات) تظهر تنبيهاتُه لمن في النطاق (019 nfPage). الآن: منعٌ.
   على العامل المولَّد نفسه: نسخةٌ كما هي، ونسخةٌ أُزيل منها سطرُ «irshad» من PG_REG وحده. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WORKER } from './harness.mjs';
import { needs, SYSTEMS, SRC as SRC_DIR } from './harness.mjs';
import path from 'node:path';

const SRC = fs.readFileSync(WORKER, 'utf8'), LINE = "  { key: 'irshad', subs: ['dash', 'records'], off: ['dash'] },\n";
let n = 0;
const load = (text) => import('data:text/javascript;base64,' + Buffer.from(text + '\nexport { capOnDept, nfPage, PG_KEYS, KIVO_REGISTRY };\n// v7-d1-cap ' + ++n).toString('base64'));
const SUPER = { u: { id: 'TEST_ONLY_su', role: 'super' }, perms: { caps: {} }, enf: false };
/* V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية — فالتنبيهاتُ تُفحص بمدير الإدارة (يرث سقفَ إدارته) */
/* V7 · د5-ح: لا فاعلَ قديماً (enf:false) — مديرُ الإدارة فاعلُ إنفاذٍ بمنحٍ صريحٍ لمفاتيح عرض أوراق irshad (TEST_ONLY) */
const MGR0 = { u: { id: 'TEST_ONLY_m1', role: 'staff', deptId: 'TEST_ONLY_d1', ekey: 'mgr:TEST_ONLY_d1', mgr: 1 }, users: [], perms: { caps: {} }, depts: [{ id: 'TEST_ONLY_d1', name: 'TEST_ONLY' }], nodes: [], off: [] };
const mgrOf = (R) => { const plus = [...new Set(Object.keys(R.atoms).filter((a) => /^irshad\/[^:]+:view$/.test(a)).flatMap((a) => R.atoms[a].targets || []))];
  return Object.assign({}, MGR0, { enf: { mode: 'enforce' }, __grants: { TEST_ONLY_d1: { v: 1, emp: { 'mgr:TEST_ONLY_d1': { plus, minus: [] } } } } }); };

test('مفتاحُ صفحةٍ أُزيل من PG_REG: لا يُعدّ مفعّلاً، فتنبيهاتُه لا تظهر (ir_new · ir_edit · ir_day)', needs('irshad'), async () => {
  assert.equal(SRC.split(LINE).length, 2, 'سطرُ irshad في PG_REG مرّةً واحدة');
  const W = await load(SRC), G = await load(SRC.replace(LINE, ''));
  assert.ok(W.PG_KEYS.includes('irshad') && !G.PG_KEYS.includes('irshad'), 'النسختان كما قُصد');
  for (const type of ['ir_new', 'ir_edit', 'ir_day']) {
    const MGR = mgrOf(W.KIVO_REGISTRY);
    assert.equal(W.nfPage(MGR, 'TEST_ONLY_d1', type, 'irshad', 'view'), true, 'الضبط: الصفحةُ معروفة ⇒ تظهر ' + type);
    assert.equal(G.nfPage(MGR, 'TEST_ONLY_d1', type, 'irshad', 'view'), false, 'الصفحةُ غائبةٌ من PG_REG ⇒ لا تظهر ' + type);
    assert.equal(G.nfPage(SUPER, 'TEST_ONLY_d1', type, 'irshad', 'view'), true, 'د1-ج: مدير المنصة بلا قيد ' + type);
  }
  assert.equal(G.capOnDept(SUPER, 'TEST_ONLY_d1', 'irshad'), false);
  assert.equal(G.capOnDept(SUPER, 'TEST_ONLY_d1', 'irshad/records'), false, 'الورقةُ تحتها مغلقةٌ كما كانت');
});

test('المفتاحُ المجهول يُمنع، والمعروفُ كما كان، والفارغُ كما كان', needs('tasks'), async () => {
  const W = await load(SRC);
  assert.equal(W.capOnDept(SUPER, 'TEST_ONLY_d1', 'TEST_ONLY_no_such_page'), false, 'مجهول ⇒ منع');
  /* V7 · د6 (قرار المالك · optIn): السقفُ المفتوح لا يفتح نظاماً أعلن "optIn": true في system.json — مشتقّاً من الإعلانات؛ وسجلٌّ صريحٌ يفتحه */
  const OPTIN = SYSTEMS.filter((k) => JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'systems', k, 'system.json'), 'utf8')).optIn === true);
  for (const k of W.PG_KEYS) assert.equal(W.capOnDept(SUPER, 'TEST_ONLY_d1', k), !OPTIN.includes(k), (OPTIN.includes(k) ? 'optIn بلا سقفٍ مفعّل ⇒ مطفأ: ' : 'المعروفُ بلا سقفٍ مفعّل: ') + k);
  for (const k of OPTIN.filter((x) => W.PG_KEYS.includes(x))) assert.equal(W.capOnDept({ u: SUPER.u, perms: { caps: { TEST_ONLY_d1: [k] } }, enf: false }, 'TEST_ONLY_d1', k), true, 'optIn بسجلٍّ صريح ⇒ مفعّل: ' + k);
  assert.equal(W.capOnDept(SUPER, 'TEST_ONLY_d1', ''), true, 'بلا مفتاح ⇒ كما كان');
  const capped = { u: SUPER.u, perms: { caps: { TEST_ONLY_d1: ['tasks'] } }, enf: false };
  assert.equal(W.capOnDept(capped, 'TEST_ONLY_d1', 'tasks'), true);
  assert.equal(W.capOnDept(capped, 'TEST_ONLY_d1', 'irshad'), false, 'السقفُ يقطع المعروف كما كان');
});
