/* الموجة 1 · AUX-01 — «صفحتي» للموظف كانت تقفز ~105px في كل إعادة تحميل: صفُّ حقائق اليوم فارغٌ (سطرُ «جارٍ تحميل حقائق يومك…» وحده) حتى
   يصل /api/me/today ثم تظهر البطاقاتُ الخمس فتدفع الخريطةَ والمهام · وسطرُ الدور يُلحق به «دائم · رمز النداء» بعد الوصول فيلتفّ إلى سطرين.
   الآن: (1) أثناء التحميل البطاقاتُ الخمس نفسُها بقيمة «…» (المفاتيحُ والترتيبُ والتصفيةُ بالصلاحية كالنهائية) والصفُّ يحجز ارتفاعَه ·
   (2) لا سطرَ تحميلٍ منفصل يختفي فيرفع ما تحته · (3) نوعُ التوظيف ورمزُ النداء في سطرٍ ثانٍ محجوزٍ للموظف من أول رسم («…» حتى الوصول).
   منطقُ الصفحة الحقيقي في vm (profile_world.mjs) — بياناتٌ اصطناعية. */
import './clock.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, riyadhDay } from './profile_world.mjs';
import { SRC } from './harness.mjs';
const T = riyadhDay();
const staff = (id, ekey, extra) => Object.assign({ id, role: 'staff', ekey, un: '1000000099', deptId: 'd1', name: 'TEST_ONLY حساب ' + id }, extra || {});
const EMPS = [{ eid: 'e_me', name: 'TEST_ONLY أنا', type: 'دائم' }];
const STAFFING = { [T.YM]: { e_me: { shift: 'أ', rest: [], cs: 'TST-7' } } };
const OPTS = [{ name: 'أ', tStart: '00:00', tEnd: '23:59' }];
const keys = (v) => v.pfFacts.map((f) => f.k).join(',');

test('AUX-01 · أثناء تحميل حقائق اليوم من الخادم: البطاقاتُ الخمس بقيمة «…» والصفُّ يحجز ارتفاعَه · بلا سطر تحميلٍ منفصل · والسطرُ الثاني «…»', () => {
  /* كحساب الموظف على الخادم: لا يقرأ قائمةَ الموظفين ولا الجدولَ محلياً — يومُه من /api/me/today وحده (لم يصل بعد) */
  const W = world({ cf: true, user: staff('s1', 'e_me'), emps: EMPS, staffing: STAFFING, shiftOpts: OPTS, unreadable: ['bassam_employees_v1', 'bassam_staffing_v3'] });
  const v = W.v();
  assert.equal(v.isStaffView, true);
  assert.equal(keys(v), 'shift,rest,spot,muk,status', 'البطاقاتُ نفسُها بترتيبها');
  assert.ok(v.pfFacts.every((f) => f.v === '…' && f.sub === 'جارٍ التحميل' && / sk$/.test(f.cls) && !/\bgo\b/.test(f.cls)), 'بطاقاتُ انتظارٍ لا تُفتح');
  assert.deepEqual(JSON.parse(JSON.stringify(v.pfFacts.map((f) => f.l))), ['الوردية', 'أيام الراحة', 'موقعك اليوم', 'التكليف', 'الحالة']);
  assert.equal(v.pfFactsCols, 'repeat(5,1fr)');
  assert.equal(v.pfFactsCls, 'pf-facts pf-facts-on'); assert.equal(v.pfFactsBusy, 'true');
  assert.equal(v.pfFactsNoteOn, false, 'لا سطرَ «جارٍ تحميل…» يختفي عند الوصول');
  assert.equal(v.roleLine2On, true); assert.equal(v.roleLine2, '…');
  assert.doesNotMatch(v.roleLine, /رمز النداء|دائم|…/);
  v.pfFacts[0].open(); assert.equal(W.c.state.pfPanel || '', '', 'النقرُ على بطاقة انتظار لا يفتح لوحة');
});

test('AUX-01 · بعد الوصول: البطاقاتُ بالمفاتيح والصف نفسِه (لا تغيّرَ في الشكل) · ونوعُ التوظيف ورمزُ النداء في السطر الثاني لا في سطر الدور', () => {
  const W = world({ user: staff('s1', 'e_me'), emps: EMPS, staffing: STAFFING, shiftOpts: OPTS });
  const v = W.v();
  assert.equal(keys(v), 'shift,rest,spot,muk,status');
  assert.ok(v.pfFacts.every((f) => f.v !== '…' && /\bgo\b/.test(f.cls)));
  assert.equal(v.pfFactsCls, 'pf-facts pf-facts-on'); assert.equal(v.pfFactsBusy, 'false');
  assert.equal(v.roleLine2, 'دائم · رمز النداء TST-7');
  assert.doesNotMatch(v.roleLine, /رمز النداء|دائم/, 'سطرُ الدور لا يطول بما يصل من الخادم');
});

test('AUX-01 · لا بطاقاتِ انتظار حين لا تحميل: تعذّر الخادم ⇒ سطرُ الخطأ وإعادة المحاولة · ومديرٌ بلا يومٍ تشغيلي ⇒ لا صفَّ ولا سطرَ ثانٍ', () => {
  const W = world({ cf: true, user: staff('s1', 'e_me'), emps: EMPS, staffing: STAFFING, shiftOpts: OPTS, unreadable: ['bassam_employees_v1', 'bassam_staffing_v3'], state: { pfMeErr: 'net' } });
  const v = W.v();
  assert.equal(v.pfFacts.length, 0); assert.equal(v.pfFactsCls, 'pf-facts', 'الصفُّ الفارغ لا يحجز ارتفاعاً');
  assert.equal(v.pfFactsNoteOn, true); assert.match(v.pfFactsNote, /تعذّر/); assert.equal(v.pfFactsRetryOn, true);
  assert.equal(v.roleLine2, '', 'لا «…» بعد الإخفاق');
  const M = world({ user: staff('m1', 'mgr:d1', { mgr: true }), emps: [] }).v();
  assert.equal(M.isStaffView, false); assert.equal(M.roleLine2On, false); assert.equal(M.pfFacts.length, 0);
});

test('AUX-01 · القالبُ والأنماط: الصفُّ بصنفه المحسوب وaria-busy · السطرُ الثاني سطرٌ واحدٌ محجوز · وعلى الجوال يُحجز ارتفاعُ البطاقة النهائية (سطران)', () => {
  const view = fs.readFileSync(path.join(SRC, 'modules/profile/view.html'), 'utf8'), css = fs.readFileSync(path.join(SRC, 'modules/profile/helmet.css'), 'utf8');
  assert.match(view, /<div class="\{\{pfFactsCls\}\}" aria-busy="\{\{pfFactsBusy\}\}"/);
  assert.match(view, /<sc-if value="\{\{roleLine2On\}\}"[^>]*><div class="pf-role pf-role2">\{\{roleLine2\}\}<\/div><\/sc-if>/);
  assert.match(css, /\.pf-role2\{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:23px;min-height:1lh\}/);
  assert.match(css, /@media \(max-width:640px\)\{\.pf-facts-on\{min-height:118px\}\}/);
});
