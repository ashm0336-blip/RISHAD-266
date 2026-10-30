/* KIVO_265 · ملاحظةُ المالك (2026-10-19 · أمن): رقمُ الهوية ورقمُ الجوال والرقمُ الوظيفي لا تتكرّر في المنصة كلها — لا داخل الإدارة
   ولا عبر الإدارات ولا مع حسابات الدخول. كان الفحصُ في العميل وحده (النموذج والاستيراد بما في ذاكرة المتصفح) فقبِل الاستيرادُ على Test
   صفّاً بهوية مدير إدارةٍ أخرى. القاعدةُ هنا على الخادم (018 empDupWhy) ومربوطةٌ في طبقتي الكتابة (044 · 060) بسياقٍ يُقرأ مرةً واحدة
   للدفعة (054) ولا يُقرأ إلا إذا حملت الدفعةُ هويةً جديدة. يُثبت هنا: الجديدُ المكرّر يُرفض (إدارة أخرى · حساب دخول · داخل الدفعة) ·
   القديمُ القائم لا يُحاسَب · حسابُ الإدارة نفسِها ليس تكراراً · بلا سياق لا حكم · الربطُ في الطبقتين ونصُّ السبب في العميل. */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = rd('workers/parts/018-ancestry.js');
function fn(name) {
  const i = SRC.indexOf('\nfunction ' + name + '('); assert.ok(i > 0, name + ' موجودة في 018');
  let j = SRC.indexOf('{', i), d = 0;
  for (let k = j; k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}' && --d === 0) { j = k + 1; break; } }
  return SRC.slice(i + 1, j);
}
const ctx = { isObj: (x) => !!x && typeof x === 'object' && !Array.isArray(x), Array, String };
vm.runInNewContext(fn('empIdents') + '\n' + fn('empDupWhy') + '\nthis.empDupWhy = empDupWhy; this.empIdents = empIdents;', ctx);
const why = (a, b, ed, d = 'd1') => ctx.empDupWhy({}, a, b, d, ed === undefined ? { ed: { others: {}, users: [] } } : ed);
const E = (nid, phone, empno, x) => Object.assign({ nid, phone, empno, name: 'م' }, x || {});
const OTHERS = { d2: [E('2000020001', '0500020001', '020001')] };
const USERS = [{ un: '5555555555', alt: '0555555555', deptId: 'd9', role: 'manager' }, { un: '7777777777', alt: '0577777777', deptId: 'd1', role: 'staff' }];

test('هويةٌ أو جوالٌ أو رقمٌ وظيفي جديد موجودٌ في إدارة أخرى ⇒ emp-dup · وغيرُ المكرّر يمرّ', () => {
  const ed = { ed: { others: OTHERS, users: [] } };
  assert.equal(why([], [E('2000020001', '0500000009', '000009')], ed), 'emp-dup', 'الهوية');
  assert.equal(why([], [E('2000000009', '0500020001', '000009')], ed), 'emp-dup', 'الجوال');
  assert.equal(why([], [E('2000000009', '0500000009', '020001')], ed), 'emp-dup', 'الرقم الوظيفي');
  assert.equal(why([], [E('2000000009', '0500000009', '000009')], ed), '', 'فريدٌ يمرّ');
  assert.equal(why([], [E('2000020001', '0500020001', '020001')], ed, 'd2'), '', 'الإدارةُ نفسُها ليست «أخرى»');
});

test('اسمُ مستخدم حسابِ دخولٍ خارج الإدارة (هوية أو جوال) ⇒ emp-dup · حسابُ الإدارة نفسِها لا', () => {
  const ed = { ed: { others: {}, users: USERS } };
  assert.equal(why([], [E('5555555555', '0500000001', '000001')], ed), 'emp-dup', 'هويةُ مدير إدارةٍ أخرى — الحالةُ التي قبِلها الاستيراد على Test');
  assert.equal(why([], [E('2000000001', '0555555555', '000001')], ed), 'emp-dup', 'جوالُ الحساب (alt)');
  assert.equal(why([], [E('7777777777', '0577777777', '000001')], ed), '', 'حسابُ موظفٍ في هذه الإدارة');
});

test('التكرارُ داخل الدفعة يُرفض · والقديمُ القائم لا يُحاسَب (سجلٌّ موروث أو تعديلُ اسم)', () => {
  assert.equal(why([], [E('2000000001', '0500000001', '000001'), E('2000000001', '0500000002', '000002')], undefined), 'emp-dup', 'هويتان متطابقتان في الدفعة');
  const old = [E('2000020001', '0500000001', '000001', { name: 'قديم' })];
  assert.equal(why(old, [E('2000020001', '0500000001', '000001', { name: 'اسم جديد' })], { ed: { others: OTHERS, users: [] } }), '', 'الهويةُ القائمة تبقى ولو تكرّرت في إدارة أخرى');
  assert.equal(why(old.concat(old), old.concat(old), { ed: { others: OTHERS, users: [] } }), '', 'تكرارٌ موروثٌ قائم لا يُقفل السجل');
  assert.equal(why([], [E('2000020001', '', '')], { ed: null }), '', 'بلا سياق لا حكم');
  assert.equal(why([], [E('', '', ''), null, 'x'], undefined), '', 'صفوفٌ فارغة أو تالفة تُتجاهل');
});

test('الربط: حارس التكرار الخادمي قائم، والاستيراد يرسل مسودته لمسار الانتقال الخادمي', () => {
  assert.match(rd('workers/parts/044-protected-ops.js'), /nm === 'bassam_employees_v1'\) \{ var xd9 = empDupWhy\(A, PV9\.a\(\), PV9\.b\(\), P\.dept, ctx\); if \(xd9\) return \{ ok: false, why: xd9 \}; \}/);
  assert.match(rd('workers/parts/060-enf-canwrite.js'), /rn === 'bassam_employees_v1'\) \{ var xdE = empDupWhy\(A, a, b, P\.dept, ctx\); if \(xdE\) return enfNo\(xdE\); \}/);
  const c = rd('workers/parts/054-image-contract.js');
  assert.match(c, /var edCtx9 = null;/); assert.match(c, /if \(!chg9\) continue;/, 'لا قراءةَ لبقية الإدارات بلا هويةٍ جديدة');
  assert.match(c, /ed: edCtx9 && d00 && resName\(k0\) === 'bassam_employees_v1' \? edCtx9 : null/);
  assert.match(rd('src/api/280-server-storage.js'), /"emp-dup": "رقم الهوية أو رقم الجوال أو الرقم الوظيفي مسجّل بالفعل/);
  assert.match(rd('src/services/590-employees-import.js'), /transitionRequest\('\/api\/employees\/transition', \{ method: 'POST'/);
  assert.match(rd('workers/parts/019e-atomic-save.js'), /await applySave\(env, body, A, meta, Object\.assign\(\{\}, opt, \{ quiet: true, __restorePlan: RESTORE_INTERNAL_TOKEN \}\)\)/, 'الانتقال يعيد استعمال فحص التكرار نفسه قبل إعداد المعاملة');
});

test('الاستيراد الفعلي يرفض هوية حساب إدارة أخرى قبل أي كتابة، في وضعي الصلاحيات', async () => {
  const {world, D1, D2, IDS} = await import('./custody_review_fx.mjs');
  for (const mode of ['legacy', 'enforce']) {
    const f = await world({mode});
    const foreign = f.users.find(u => u.deptId === D2 && /^\d{10}$/.test(u.un));
    assert.ok(foreign, 'حساب تركيبي لإدارة أخرى');
    const c = await f.api('super', '/api/employees/transition?' + new URLSearchParams({dept:D1,intent:'import'}));
    assert.equal(c.status, 200);
    const before = JSON.stringify(f.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'));
    const r = await f.api('super','/api/employees/transition',{method:'POST',body:{
      uid:IDS.super,dept:D1,intent:'import',requestId:'TEST_ONLY_foreign_import',base:c.json.base,
      finalRows:c.json.employees.concat([{eid:'TEST_ONLY_foreign_collision',name:'TEST_ONLY collision',nid:foreign.un,empno:''}]),
      import:{mode:'add',year:1448,month:1,schedule:[],templates:[]},accountProposals:[]
    }});
    assert.equal(r.json.ok, 0, JSON.stringify(r.json));
    assert.match(JSON.stringify(r.json), /emp-dup/);
    assert.equal(JSON.stringify(f.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq')), before, 'لا حساب أو موظف أو مورد يتغير عند التكرار');
  }
});
