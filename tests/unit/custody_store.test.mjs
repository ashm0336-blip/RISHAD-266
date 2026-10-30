/* KIVO_265 · قرارُ المالك (2026-10-19): «مستودع العهد» تبويبٌ ثالث في «موظفو الإدارة» بجانب «عهد الموظفين» — الصنف · الكمية · بادئة الرقم ·
   اللون · الحالة (محسوبة) · إضافة · تعديل · حذف. كانت إدارةُ الأصناف مدسوسةً داخل خطوة التسليم («صنف جديد» + قلمُ التعديل) وفي قائمة
   التسليم السريع في صفّ الموظف. يُثبت هنا: التبويبُ والقسمُ في الواجهة · لا إضافةَ ولا تعديلَ للأصناف داخل التسليم · التسليمُ يعرض
   المتاحَ وحده · حذفُ الصنف يُرفض لما له حركات ويخضع لصلاحية الحذف · التبويبُ يخضع لورقة «عهد الموظفين» في الشجرة (لا ورقةَ جديدة). */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {world,createType,act,ok,EKEYS,copy,pageFor} from './custody_scenarios_fx.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
test('الواجهة: تبويبُ «مستودع العهد» بجانب «عهد الموظفين» وقسمُه بجدول الصنف · البادئة · الكمية · بعهدة · متاح · الحالة · إجراءات', () => {
  const v = rd('src/modules/employees/view.html');
  const bar = v.slice(v.indexOf('{{empTabBarShow}}'), v.indexOf('{{empOnReadiness}}'));
  assert.match(bar, /\{\{empCustodyTabLbl\}\}">عهد الموظفين</, 'تبويبُ عهد الموظفين باقٍ');
  assert.match(bar, /\{\{empStoreAllowed\}\}[\s\S]*\{\{empGoStore\}\}[\s\S]*\{\{empStoreTabLbl\}\}">مستودع العهد</, 'تبويبُ مستودع العهد بعده');
  assert.ok(bar.indexOf('عهد الموظفين') < bar.indexOf('مستودع العهد'), 'ترتيبُ التبويبات: عهد الموظفين ثم مستودع العهد');
  const i = v.indexOf('<sc-if value="{{empOnStore}}"'); assert.ok(i > 0, 'قسمُ المستودع موجود');
  const s = v.slice(i, v.indexOf('<sc-if value="{{empOnData}}" hint-placeholder-val="{{ false }}">\n', i));
  for (const h of ['>الصنف<', '>بادئة الرقم<', '>الكمية<', '>بعهدة<', '>متاح<', '>تالف / مفقود<', '>الحالة<', '>إجراءات<']) assert.ok(s.indexOf(h) > 0, 'عمود ' + h);
  for (const b of ['{{stRows}}', '{{r.edit}}', '{{r.del}}', '{{stAddOpen}}', '{{stFSave}}', '{{stFName}}', '{{stFQty}}', '{{stFPre}}', '{{stFColors}}', '{{stReadOnly}}', '{{stEmpty}}']) assert.ok(s.indexOf(b) > 0, 'ربطُ ' + b);
});

test('التسليم: لا «صنف جديد» ولا تعديلَ للأصناف داخل خطوة التسليم ولا في التسليم السريع — القائمةُ من المتاح وحده', () => {
  const v = rd('src/modules/employees/view.html');
  const wz = v.slice(v.indexOf('{{wzS2}}'), v.indexOf('{{wzS3}}'));
  assert.doesNotMatch(wz, /\{\{wzAddOpen\}\}|\{\{wzFormOn\}\}|\{\{wzFSave\}\}|\{\{wzCanEdit\}\}|\{\{it\.edit\}\}/, 'أُزيلت إضافةُ الصنف وتعديلُه من خطوة التسليم');
  assert.match(wz, /\{\{wzNoItemsMsg\}\}[\s\S]*\{\{wzGoStore\}\}/, 'رسالةُ «لا متاح» تحيل إلى تبويب المستودع');
  assert.doesNotMatch(v, /\{\{r\.newOpen\}\}|\{\{r\.cuNewSave\}\}|\{\{r\.newOn\}\}/, 'أُزيل نموذجُ الصنف الجديد من التسليم السريع في الصفّ');
  assert.match(v, /\{\{r\.goStore\}\}/, 'التسليمُ السريع يحيل إلى المستودع عند عدم التوفّر');
  const l = rd('src/modules/employees/logic.js');
  assert.match(l, /av = r\.filter\(\(t\) => this\.cuAvailable\(t\.name\) > 0\)/, 'خطوةُ التسليم: الأصنافُ المتاحة وحدها');
  assert.match(l, /wzItems: av\.map\(/, 'wzItems من المتاح');
  assert.match(l, /n = this\.cuCatalog\(\)\.filter\(\(t\) => this\.cuAvailable\(t\.name\) > 0\)/, 'التسليمُ السريع: المتاحُ وحده');
  assert.doesNotMatch(l.slice(l.indexOf('  _custodyWizVals() {'), l.indexOf('  _cuRowAdd(t, e) {')), /itemForm|cuAddItemType|cuEditItemType/, 'لا إنشاءَ ولا تعديلَ للأصناف من داخل التسليم');
});

test('المنطق: التبويبُ يخضع لورقة «عهد الموظفين» (لا ورقةَ جديدة في الشجرة) — والقسمُ يُحسب من سجلّ حركات الخادم', async () => {
  const l = rd('src/modules/employees/logic.js');
  assert.match(l, /V = \["data", "custody", "store"\]/, 'التوجيهُ يعرف التبويب');
  assert.equal((l.match(/P\.subOn\("emps", "store" === t \? "custody" : t\)/g) || []).length, 2, 'الإذنُ من ورقة custody (التوجيهُ وشريطُ التبويبات)');
  const pages = JSON.parse(rd('src/manifests/pages.json'));
  const emps = (pages.pages || pages).find((p) => p.key === 'emps');
  assert.deepEqual(emps.subs.map((s) => s.key), ['data', 'custody'], 'أوراقُ الصفحة كما هي — لا ورقةَ جديدة');
  const reg = rd('src/permissions/registry/registry-v24.9.json');
  for (const k of ['ref.custody_type.create', 'ref.custody_type.edit', 'ref.custody_type.delete']) assert.ok(reg.indexOf('"key": "' + k + '"') > 0, k + ' تحت emps/custody');
  const A=await world(),radio=await createType(A,{name:'TEST_ONLY radio',qty:5});await createType(A,{name:'TEST_ONLY torch',qty:2,prefix:'KS'});
  const issued=[];for(let i=0;i<3;i++)issued.push(ok(await act(A,'issue',{itemId:radio,holderKey:EKEYS.employee1})).outputs[0]);
  ok(await act(A,'close',{issueId:issued[1].issueId,kind:'dmg'}));ok(await act(A,'close',{issueId:issued[2].issueId,kind:'lost'}));
  const B=await pageFor(A),values=B.page._storeVals(),row=values.stRows.find(row=>row.name==='TEST_ONLY radio');
  assert.equal(row.held,'1');assert.equal(row.dead,'2');assert.equal(row.avail,'2');assert.equal(row.qty,'5');assert.equal(row.deadTip,'تالف 1 · مفقود 1');
  assert.deepEqual(copy(values.stKpis.map(row=>row.val)),['7','1','4','2'],'The UI uses complete server aggregates for held/damaged/lost/available');
  assert.equal(A.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n,5,'The totals reflect all three issues and two closes');
  assert.ok(B.calls.every(call=>new URL(call.url,'http://x').searchParams.get('view')!=='moves'),'The store does not fetch a complete ledger to recompute totals');
  assert.match(l, /\.\.\.this\._storeVals\(\),/, 'القيمُ مربوطة');
});

test('cuDelItemType: يُرفض بلا صلاحية الحذف · يُرفض لصنفٍ له حركات · ينجح لصنفٍ بلا سجلّ', async () => {
  const A=await world(),radio=await createType(A,{name:'TEST_ONLY radio',qty:5}),torch=await createType(A,{name:'TEST_ONLY torch',qty:2,prefix:'KS'});
  ok(await act(A,'issue',{itemId:radio,holderKey:EKEYS.employee1}));const B=await pageFor(A),moves=copy(A.DB.q('SELECT * FROM custody_movements'));
  B.setCan(false);let values=B.page._storeVals(),before=B.calls.length;values.stRows.find(row=>row.name==='TEST_ONLY torch').del();
  assert.equal(B.errors.filter(row=>row.kind==='denied').length,1);assert.equal(B.calls.length,before,'No request after the UI permission guard');
  const denied=await act(A,'type-delete',{itemId:torch},'noView');assert.equal(denied.status,403);assert.equal(denied.json.rev,undefined);assert.equal(A.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n,2,'The actual server also enforces delete permission');
  B.setCan(true);values=B.page._storeVals();const historical=values.stRows.find(row=>row.name==='TEST_ONLY radio');
  assert.equal(historical.delOn,false);assert.match(historical.delTip,/حركة/);before=B.calls.length;historical.del();assert.equal(B.calls.length,before,'The UI refuses deleting an item with history');
  const history=await B.page.cuDelItemType('TEST_ONLY radio');assert.equal(history.ok,0);assert.equal(history.err,'custody-history');assert.equal(A.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n,2,'The actual server refuses the same deletion');
  const missing=await B.page.cuDelItemType('غير موجود');assert.equal(missing.ok,0);assert.equal(A.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n,2);
  const saved=await B.page.cuDelItemType('TEST_ONLY torch');assert.equal(saved.ok,1);assert.deepEqual(A.DB.q('SELECT name FROM custody_items').map(row=>row.name),['TEST_ONLY radio']);
  assert.deepEqual(copy(A.DB.q('SELECT * FROM custody_movements')),moves,'Deleting an unused item leaves historical movements intact');
});
