/* KIVO_264 · «ملفي» — عيوبُ التدقيق D1–D20 على منطق الصفحة الحقيقي (src/modules/profile/logic.js) داخل Node (tests/unit/profile_world.mjs):
   كلُّ اختبارٍ يسمّي عيبه ويثبت السلوكَ المصحَّح؛ وقد شُغّلت أوّلاً على منطق KIVO_263 (PROFILE_LOGIC=…) فأخفقت — الدليلُ في تقرير الوكيل.
   الربطُ بمعرّفٍ ثابت وحده · لا استنتاجَ من اسم الدخول · ترشيحُ الزملاء · «موقعك المُسنَد» · «التفاصيل»/«+N» داخل الصفحة · المسودةُ ليست موقعاً ·
   «أسبوعك» بلا راحةٍ مختلقة · الموظفُ بصفة مدير يبقى موظفاً · حقائقُ متّسقة لحسابٍ بلا سجل · «لا صلاحية» غيرُ «لا مهام» · السجلّ بعنوانه المباشر. */
import './clock.mjs';   /* KIVO_265 · البند 19: ساعةٌ مثبَّتة (10:00 الرياض · 1448-5-9) — قبل tasks_fx/profile_world لأن ثوابتَهما تُحسب عند التحميل */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, riyadhDay, allText, LOGIC } from './profile_world.mjs';
import { SRC } from './harness.mjs';
const T = riyadhDay();
const opts24 = [{ name: 'أ', tStart: '00:00', tEnd: '23:59' }, { name: 'ب', tStart: '00:00', tEnd: '23:59' }];
const staff = (id, ekey, extra) => Object.assign({ id, role: 'staff', ekey, un: '10000000' + String(id).slice(-2).padStart(2, '0'), deptId: 'd1', name: 'حساب ' + id }, extra || {});
const fact = (v, k) => (v.pfFacts || []).find((f) => f.k === k) || {};
/* القيمُ تُبنى داخل سياق vm — تُنقل إلى هذا العالَم قبل المقارنة البنيوية */
const A = (x) => JSON.parse(JSON.stringify(x));

test('D1: الربطُ بالاسم ممنوع — حسابٌ مفتاحُه اسمٌ لا يرتبط بأول سَميٍّ ولا تظهر بياناتُه', () => {
  const W = world({ user: staff('s1', 'محمد علي'), emps: [{ eid: 'e_A', name: 'محمد علي', nid: '1111111111', phone: '0500000001' }, { eid: 'e_B', name: 'محمد علي', nid: '2222222222' }] });
  assert.equal(W.c.empRec(), null, 'لا سجلَّ بالاسم');
  W.c.state.pfPanel = 'data';
  const t = allText(W.v().pfInfo);
  assert.ok(!t.includes('1111111111') && !t.includes('0500000001') && !t.includes('2222222222'), 'لا هويةَ ولا جوالَ لسَميّ: ' + t.slice(0, 200));
});
test('D2: اسمُ الدخول لا يربط بسجلّ موظفٍ آخر يحمل الرقمَ نفسَه', () => {
  const W = world({ user: staff('s2', 'e_GONE', { un: '3333333333' }), emps: [{ eid: 'e_OTHER', name: 'سعد', nid: '3333333333', phone: '0599999999', email: 'saad@x.sa', gender: 'ذكر' }] });
  assert.equal(W.c.empRec(), null);
  const t = allText(W.v());
  assert.ok(!t.includes('سعد') && !t.includes('0599999999') && !t.includes('saad@x.sa'), 'لا شيءَ من سجلّ «سعد»');
});
test('D3: لا استنتاجَ للهوية والجوال من اسم الدخول — الحقلُ الغائبُ يُخفى ويُذكر في «غير مسجّل»', () => {
  const W = world({ user: staff('s3', 'e_C', { un: '1098765432', alt: '0551112223' }), emps: [{ eid: 'e_C', name: 'خالد', empno: '12345' }] });
  W.c.state.pfPanel = 'data';
  const v = W.v(), ks = v.pfInfo.filter((f) => !f.hd).map((f) => f.k);
  assert.ok(!ks.includes('nid') && !ks.includes('phone'), 'لا حقلَ هويةٍ ولا جوال: ' + ks.join(','));
  assert.ok(!allText(v.pfInfo).includes('1098765432') && !allText(v.pfInfo).includes('0551112223'));
  assert.ok(v.pfInfoMissOn && /رقم الهوية/.test(v.pfInfoMiss) && /رقم الجوال/.test(v.pfInfoMiss) && /الجنس/.test(v.pfInfoMiss), v.pfInfoMiss);
  assert.equal(v.pfInfo.find((f) => f.k === 'empno').v, '12345');
});
test('D4 · OD-8: مديرُ الإدارة المعيَّن — بيانُ حسابه وحده (لا هويةَ ولا جوال · ولا «لم يُسجَّل»)', () => {
  const u = staff('m1', 'mgr:d1', { mgr: true, un: '1044455566', alt: '0533344455', no: '70101', name: 'مدير الإدارة' });
  const W = world({ user: u, users: [u], emps: [] });
  W.c.state.pfPanel = 'data';
  const v = W.v(), t = allText(v.pfInfo);
  assert.equal(v.isStaffView, false, 'لا يومَ تشغيليّاً مفترَضاً');
  assert.ok(!t.includes('1044455566') && !t.includes('0533344455'), 'لا استنتاج');
  assert.ok(!/لم يُسجَّل/.test(t));
  assert.deepEqual(A(v.pfInfo.filter((f) => !f.hd).map((f) => f.k)), ['name', 'empno', 'dept']);
});
function siteWorld(extra) {
  const emps = [{ eid: 'e_me', name: 'أنا الموظف' }, { eid: 'e_sameA', name: 'زميل نفس الوردية' }, { eid: 'e_shiftB', name: 'زميل وردية ب' }, { eid: 'e_rest', name: 'زميل في راحته' }, { eid: 'e_abs', name: 'زميل غائب' }, { eid: 'e_tout', name: 'زميل محوَّل' }];
  const staffing = { [T.YM]: { e_me: { shift: 'أ', rest: [] }, e_sameA: { shift: 'أ', rest: [] }, e_shiftB: { shift: 'ب', rest: [] }, e_rest: { shift: 'أ', rest: [T.WD] }, e_abs: { shift: 'أ', rest: [] }, e_tout: { shift: 'أ', rest: [] } } };
  const dreport = { [T.DK]: { shifts: { 'أ': { pulled: true, roster: [{ ekey: 'e_me', st: 'pr' }, { ekey: 'e_sameA', st: 'pr' }, { ekey: 'e_rest', st: 'pr' }, { ekey: 'e_abs', st: 'ab' }], rest: { e_rest: [T.WD], e_me: [], e_sameA: [], e_abs: [] }, tout: { e_tout: { to: 'ب' } } } } } };
  const gate = { uid: 'g7', num: '7', x: 100, y: 100, emp: ['e_me', 'e_sameA', 'e_shiftB', 'e_rest', 'e_abs', 'e_tout'] };
  const plan = { floors: [{ name: 'الدور الأرضي', sid: 's1' }], months: { [T.YM]: { c: 1, d: [{ name: 'الدور الأرضي', sid: 's1', approved: true, gates: [gate], zones: [], marks: [] }] } } };
  const rounds = { [T.DK]: { d: [{ gates: [gate], zones: [], marks: [] }] } };
  return world(Object.assign({ user: staff('s5', 'e_me'), emps, staffing, dreport, rounds, plan, shiftOpts: opts24 }, extra || {}));
}
test('D5 · OD-4: زملاءُ الموقع — العنصرُ نفسُه · ورديتي · لا راحة · لا غياب/تحويل · بالاسم وحده (بلا ألوان حضور)', () => {
  const W = siteWorld();
  W.c.state.pfPanel = 'spot';
  const v = W.v();
  assert.deepEqual(A(v.spotMates.map((m) => m.n)), ['زميل نفس الوردية']);
  assert.ok(v.spotMates.every((m) => !('c' in m)), 'لا لونَ حضور');
  assert.ok(!allText(v).includes('زميل غائب') && !allText(v).includes('زميل وردية ب') && !allText(v).includes('زميل في راحته'));
});
test('D6 · D18: «موقعك المُسنَد» لا «أنت هنا» — والمفتاحُ يقول إنه ليس تحديداً فعلياً ويذكر ألوانَ التغطية حين تُرسم', () => {
  const v = siteWorld().v();
  assert.ok(v.mapMine && /موقعك المُسنَد/.test(v.mapMine.label) && !/أنت هنا/.test(allText(v)), JSON.stringify(v.mapMine));
  assert.match(v.mapLegend, /ليس تحديداً لموقعك الفعلي/);
  assert.match(v.mapLegend, /عجز كامل/, 'عدسةُ التوزيع مفعّلة ⇒ ألوانُ التغطية في المفتاح');
});
test('D7: «التفاصيل ←» يفتح «السجل» على قسم الراحة داخل الصفحة · و«+N» يكشف البقيةَ هنا — لا تنقّل إلى صفحاتٍ إدارية', () => {
  const W = siteWorld({ can: (k) => k !== 'staff' && k !== 'daily' });
  W.c.state.pfPanel = 'week';
  const v = W.v();
  assert.equal(v.goWeekOn, true); v.goWeek();
  assert.deepEqual(W.nav, [], 'لا تنقّل');
  assert.equal(W.c.state.pfPanel, 'hist'); assert.equal(W.c.state.histType, 'rest');
  assert.equal(W.loc.hash, '#/profile/history', 'العنوانُ المباشر');
  W.c.setState({ pfPanel: 'spot' });
  const v2 = W.v();
  assert.equal(v2.spotDailyOn, false, 'لا زرَّ لصفحةٍ لا يملكها');
  v2.spotMoreGo(); assert.deepEqual(W.nav, []); assert.equal(W.c.state.spotAll, true);
});
test('D8 · OD-5: مسودةُ التشغيل الميداني لا تُعرض موقعاً لليوم (والخريطةُ تبقى بلا ذهبيّ)', () => {
  const emps = [{ eid: 'e_me', name: 'أنا' }];
  const plan = { floors: [{ name: 'الدور الأرضي', sid: 's1' }], months: { [T.YM]: { c: 1, d: [{ name: 'الدور الأرضي', approved: false, gates: [{ uid: 'g9', num: '9', x: 50, y: 50, emp: ['e_me'] }], zones: [], marks: [] }] } } };
  const v = world({ user: staff('s7', 'e_me'), emps, plan, staffing: { [T.YM]: { e_me: { shift: 'أ', rest: [] } } }, shiftOpts: opts24 }).v();
  const f = fact(v, 'spot');
  assert.equal(f.v, 'لا إسناد'); assert.match(f.sub, /مسودة/);
  assert.equal(v.mapMine, null, 'لا تعليمَ «موقعك» على مسودة');
  assert.match(v.mapSub, /مسودة/);
});
test('D9: «أسبوعك» بلا راحةٍ مختلقة لشهرٍ آخر — طبقتان والمجدولُ من جدول شهر اليوم وحده', () => {
  const days7 = []; for (let t = 6; t >= 0; t--) days7.push(riyadhDay(Date.now() - 864e5 * t));
  const prev = [...new Set(days7.map((x) => x.YM))].filter((x) => x !== T.YM);
  const staffing = { [T.YM]: { e_me: { shift: 'أ', rest: days7.map((x) => x.WD) } } };
  prev.forEach((ym) => { staffing[ym] = { e_me: { shift: 'أ', rest: [] } }; });
  const W = world({ user: staff('s8', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }], staffing });
  W.c.state.pfPanel = 'week';
  const v = W.v();
  assert.equal(v.week.length, 7);
  v.week.forEach((w, i) => {
    const inPrev = days7[i].YM !== T.YM;
    assert.equal(/s-rest/.test(w.cls), !inPrev, 'اليوم ' + days7[i].DK + ': ' + w.cls);
    assert.match(w.sub, /لم يُسحب/, 'لا تقرير ⇒ «لم يُسحب» صريحة');
  });
  assert.ok(!/من التقرير اليومي وحده/.test(v.weekSub), v.weekSub);
});
test('D10 · OD-6: الموظفُ بصفة مدير يرى بطاقاتِ يومه ومهامَّه — ويُذكر بين مديري الإدارة', () => {
  const em = staff('s9', 'e_em', { mgr: true, name: 'موظف مدير' }), me = staff('s10', 'e_me'), dm = staff('m1', 'mgr:d1', { mgr: true, name: 'المدير المعيَّن' });
  const emps = [{ eid: 'e_em', name: 'موظف مدير' }, { eid: 'e_me', name: 'أنا' }];
  const staffing = { [T.YM]: { e_em: { shift: 'أ', rest: [] }, e_me: { shift: 'أ', rest: [] } } };
  const v = world({ user: em, users: [em, me, dm], emps, staffing, shiftOpts: opts24 }).v();
  assert.equal(v.isStaffView, true); assert.equal(v.pfFacts.length, 5); assert.equal(v.tkOn, true);
  const W2 = world({ user: me, users: [em, me, dm], emps, staffing, shiftOpts: opts24 });
  W2.c.state.pfPanel = 'data';
  const row = W2.v().pfInfo.find((f) => f.k === 'mgr');
  assert.ok(row && /موظف مدير/.test(row.v) && /المدير المعيَّن/.test(row.v), row && row.v);
});
test('D11: حسابٌ لا يُحلّ سجلُّه — حقائقُ متّسقة بمفتاح الحساب نفسِه (الراحة ⇒ «في راحتك اليوم» · الموقعُ من صفوفه) وشارةٌ صريحة', () => {
  const staffing = { [T.YM]: { e_lost: { shift: 'أ', rest: [T.WD], muk: true } } };
  const rounds = { [T.DK]: { d: [{ gates: [{ uid: 'g3', num: '3', x: 10, y: 10, emp: ['e_lost'] }], zones: [], marks: [] }] } };
  const v = world({ user: staff('s11', 'e_lost', { name: 'حساب بلا سجل' }), emps: [{ eid: 'e_x', name: 'غيره' }], staffing, rounds, shiftOpts: [{ name: 'أ', tStart: '00:00', tEnd: '23:59' }] }).v();
  assert.equal(v.statusTxt, 'في راحتك اليوم');
  assert.equal(fact(v, 'status').v, 'راحة');
  assert.match(fact(v, 'spot').v, /باب 3/);
  assert.ok(v.pfFactsNoteOn && /غير مرتبط/.test(v.pfFactsNote), v.pfFactsNote);
});
test('D11 (حسابٌ مفتاحُه اسم): لا يومَ يُعرض بيقينٍ زائف', () => {
  const v = world({ user: staff('s12', 'محمد'), emps: [{ eid: 'e1', name: 'محمد' }], staffing: { [T.YM]: { 'محمد': { shift: 'أ', rest: [] } } } }).v();
  assert.equal(v.pfFacts.length, 0); assert.ok(/غير مرتبط/.test(v.pfFactsNote));
});
test('D12: «الإدارة» لمدير النظام — صلاحيةٌ على كل الإدارات لا الإدارةُ النشطة كأنها إدارتُه', () => {
  const W = world({ user: { id: 'su', role: 'super', name: 'مدير النظام' }, depts: [{ id: 'd1', name: 'إدارة الأبواب' }, { id: 'd2', name: 'إدارة المصليات' }] });
  W.c.state.pfPanel = 'dept';
  const v = W.v(), t = allText(v.pfDeptInfo);
  assert.match(t, /على كل الإدارات/); assert.ok(!t.includes('إدارة الأبواب'), t);
  assert.ok(!/إدارة الأبواب/.test(v.roleLine), v.roleLine);
});
test('D15: «لا تملك صلاحية عرض المهام» غيرُ «لا توجد لديك مهام حالية»', () => {
  const v = world({ user: staff('s13', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }], can: (k) => k !== 'tasks' }).v();
  assert.equal(v.tkOn, true); assert.equal(v.tkNoPerm, true); assert.match(v.tkEmptyT, /لا تملك صلاحية/);
  assert.ok(!/اطلب|ورقة/.test(v.tkEmptyS), 'لا يُوجَّه الموظفُ إلى طلب ورقةٍ إدارية (قرارُ المالك): ' + v.tkEmptyS);
  assert.equal(v.tkStatsOn, false, 'لا إحصاءَ «هذا الشهر» فوق قائمةٍ لا تصل');
  const v2 = world({ user: staff('s14', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }] }).v();
  assert.equal(v2.tkNoPerm, false); assert.equal(v2.tkEmptyT, 'لا توجد لديك مهام حالية', 'KIVO_265 · قرارُ المالك: نصُّ الفراغ حرفاً');
});
test('D16: مهمةٌ قديمة بلا معرّفٍ (الاسمُ وحده) لا تُنسب لِسَميّ', () => {
  const task = (nm, ek) => ['مهمة', '', 'normal', 'pending', null, null, null, [], nm, 'المدير', 30, null, null, Date.now(), ek || null];
  const v = world({ user: staff('s15', 'e_me'), emps: [{ eid: 'e_me', name: 'أحمد' }], tasks: { [T.DK]: [task('أحمد', null)] } }).v();
  assert.equal(v.tkEmpty, true, 'مهمةُ الاسم وحده ليست لي');
  const v2 = world({ user: staff('s16', 'e_me'), emps: [{ eid: 'e_me', name: 'أحمد' }], tasks: { [T.DK]: [task('أحمد', 'e_me')] } }).v();
  assert.equal(v2.tkHas, true, 'بمعرّفي الثابت هي لي');
});
test('D19: عند تعدّد المواقع — اختيارٌ حتميّ (الرسميُّ المعتمد) و«+N»', () => {
  const g = (uid, num, x, closed) => ({ uid, num, x, y: 20, closed, emp: ['e_me'] });
  const plan = { floors: [{ name: 'م١', sid: 's1' }], months: { [T.YM]: { c: 1, d: [{ name: 'م١', sid: 's1', approved: true, gates: [g('a', '1', 10), g('b', '2', 40)], zones: [], marks: [] }] } } };
  const rounds = { [T.DK]: { d: [{ gates: [g('a', '1', 10), g('b', '2', 40, true)], zones: [], marks: [] }] } };
  const v = world({ user: staff('s17', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }], plan, rounds, staffing: { [T.YM]: { e_me: { shift: 'أ', rest: [] } } }, shiftOpts: opts24 }).v();
  assert.equal(fact(v, 'spot').v, 'باب 1 +1');
  assert.match(fact(v, 'spot').sub, /تسكين اليوم: باب 2/, 'المغلقُ أولاً في تسكين اليوم — ويختلف عن الرسمي');
});
test('KIVO_265: بطاقةُ «يحتاج انتباهك» أُزيلت من «ملفي» — لا قيمَ لها ولا قالبَ ولا تنسيق (كلمةُ المرور المؤقتة تُفرض عند الدخول)', () => {
  for (const u of [staff('s18', 'e_me'), staff('s19', 'e_me', { mc: 1 }), staff('s19b', 'e_em', { mgr: true, name: 'موظف مدير' })]) {
    const v = world({ user: u, emps: [{ eid: 'e_me', name: 'أنا' }, { eid: 'e_em', name: 'موظف مدير' }] }).v();
    for (const k of ['inboxCardOn', 'inbox', 'inboxN', 'inboxEmpty', 'inboxAny', 'inboxSub']) assert.equal(v[k], undefined, u.id + ': ' + k);
    assert.ok(!allText(v).includes('كلمة مرورك مؤقتة — غيّرها الآن'), u.id);
  }
  const M = path.join(SRC, 'modules/profile');
  const view = fs.readFileSync(path.join(M, 'view.html'), 'utf8'), css = fs.readFileSync(path.join(M, 'helmet.css'), 'utf8'), lg = fs.readFileSync(path.join(M, 'logic.js'), 'utf8');
  assert.ok(!/يحتاج انتباهك|data-pf-inbox|\{\{inbox/.test(view), 'القالب');
  assert.ok(!/\.pf-inbox-row|\.pf-ib-|\.pf-pill-hot/.test(css), 'التنسيق');
  assert.ok(!/pfInboxVals|pfApprove/.test(lg), 'المنطق');
});
test('العنوانُ المباشر #/profile/history يفتح «السجل» — والإغلاقُ يعيد #/profile', () => {
  const W = world({ user: staff('s20', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }], open: { page: 'profile', tab: 'history' }, hash: '#/profile/history' });
  W.v(); W.run();
  assert.equal(W.c.state.pfPanel, 'hist');
  W.c.pfClose(); assert.equal(W.loc.hash, '#/profile');
});
test('OD-3 (الواجهة): الموظفُ الذي لا تصله مفاتيحُ الإدارة يرى يومَه من /api/me/today لا «لم يتم الإسناد»', async () => {
  const srv = { ok: 1, v: 1, day: { y: T.y, m: T.m, d: T.d, dk: T.DK, ym: T.YM, wd: T.WD, op: 'calendar' }, account: { id: 's21', role: 'staff', deptId: 'd1' },
    identity: { linked: true, by: 'eid', keyed: true, rec: { name: 'اسمي من الخادم', empno: '777' } },
    facts: { known: true, shift: { name: 'أ', src: 'schedule', sched: 'أ', def: { tStart: '00:00', tEnd: '23:59' } }, rest: { days: [], sched: ['الجمعة'], today: false, src: 'schedule', dayChanged: false }, muk: { v: true, src: 'schedule' },
      status: { code: '', st: '', src: 'none', to: '', tin: false, tfrom: '', kind: '' }, report: { any: false, mine: false, approved: false, sh: '' }, month: { locked: true, has: true } },
    site: { official: { fi: 0, kind: 'gates', i: 0, uid: 'g1', label: 'باب 1', short: 'باب 1', floor: 'م١', sid: '', loc: '', closed: false }, officialN: 1, draft: null, draftN: 0, today: null, todayN: 0, same: false, plan: true, round: false, planYm: T.YM },
    mates: [], matesN: 0, week: [], mon: { pr: 0, ab: 0, pm: 0, lv: 0, tout: 0, n: 0, ap: 0 } };
  const W = world({ cf: true, user: staff('s21', 'e_me'), unreadable: ['bassam_employees_v1', 'bassam_staffing_v3'], fetch: (u) => (u.indexOf('/api/me/today') === 0 ? { body: srv } : null) });
  const v0 = W.v();
  assert.equal(v0.statusTxt, 'جارٍ تحميل يومك…', 'لا «لم يتم الإسناد» قبل وصول الخادم');
  W.c.pfMeLoad(true); await W.flush();
  const v = W.v();
  assert.equal(v.profName, 'اسمي من الخادم');
  assert.equal(fact(v, 'shift').v, 'أ'); assert.equal(fact(v, 'muk').v, 'مكلف'); assert.equal(fact(v, 'spot').v, 'باب 1'); assert.equal(fact(v, 'rest').v, 'الجمعة');
  assert.match(fact(v, 'shift').sub, /الجدول الشهري \(معتمد\)/);
});
test('أزرارُ الرأس الأربعة بالنمط نفسِه: الإدارة · بياناتي · الأمان · السجل', () => {
  const html = fs.readFileSync(path.join(SRC, 'modules', 'profile', 'view.html'), 'utf8');
  const btns = [...html.matchAll(/<button class="pf-btn pf-hbtn"[^>]*aria-haspopup="dialog"[^>]*>.*?<span>([^<]+)<\/span><\/button>/g)].map((m) => m[1]);
  assert.deepEqual(btns, ['الإدارة', 'بياناتي', 'الأمان', 'السجل']);
  const code = fs.readFileSync(LOGIC, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); /* التعليقاتُ ليست واجهة */
  assert.ok(!/أنت هنا/.test(html) && !/أنت هنا/.test(code), 'لا «أنت هنا» في الواجهة');
});
test('«بياناتي» لمدير العقدة: الاسمُ عرضٌ فقط (حقولُ حسابه في الخادم: كلمةُ المرور والبريد والجوال) — ومديرُ النظام يعدّله', async () => {
  const v = world({ user: { id: 'g1', role: 'gm', gid: 'g1', name: 'مدير العقدة', un: '1000000005' }, nodes: { g1: { name: 'العقدة' } } }).v();
  assert.deepEqual([v.pfEditable, v.pfNameRO, v.pfNameEdit], [true, true, false]);
  /* مديرُ عقدةٍ حسابُه بلا اسم يحفظ بريدَه وجوالَه (الاسمُ لا يُشترط ولا يُرسل تعديلاً) */
  const G0 = world({ user: { id: 'g2', role: 'gm', gid: 'g1', name: '', un: '1000000006' }, nodes: { g1: { name: 'العقدة' } } });
  G0.c.state.pfEmail = 'gm@x.sa'; G0.v().pfSave(); await G0.flush();
  assert.deepEqual(A(G0.ctx.__acct || []), [{ name: '', email: 'gm@x.sa', phone: '' }]); assert.equal(G0.c.state.pfMsg, '✓ حُفظ بريدك وجوالك');
  const s = world({ user: { id: 'su', role: 'super', name: 'مدير النظام' } }).v();
  assert.deepEqual([s.pfNameRO, s.pfNameEdit], [false, true]);
  const html = fs.readFileSync(path.join(SRC, 'modules', 'profile', 'view.html'), 'utf8');
  assert.match(html, /<sc-if value="\{\{pfNameRO\}\}"[^>]*>.*data-pf-name-ro="1"/);
});
test('OD-10 لا يمسّ «مهامك» ولا رصدَ الميدان: اليومُ التشغيليّ لورديةٍ ليلية بدأت أمس — والمهامُّ والخريطةُ ورصدُ الميدان على يوم الجهاز كما كانت', async () => {
  const Y = riyadhDay(Date.now() - 864e5);
  const task = ['مهمة اليوم', '', 'normal', 'pending', null, null, null, [], 'أنا', 'المدير', 30, null, null, Date.now(), 'e_me'];
  const srv = { ok: 1, v: 1, day: { y: Y.y, m: Y.m, d: Y.d, dk: Y.DK, ym: Y.YM, wd: Y.WD, op: 'night' }, account: { id: 's24', role: 'staff', deptId: 'd1' },
    identity: { linked: true, by: 'eid', keyed: true, rec: { name: 'أنا' } },
    facts: { known: true, shift: { name: 'ل', src: 'schedule', sched: 'ل', def: { tStart: '22:00', tEnd: '06:00' } }, rest: { days: [], sched: [], today: false, src: 'schedule', dayChanged: false }, muk: { v: false, src: 'schedule' },
      status: { code: '', st: '', src: 'none', to: '', tin: false, tfrom: '', kind: '' }, report: { any: false, mine: false, approved: false, sh: '' }, month: { locked: false, has: true } },
    site: null, mates: [], matesN: 0, week: [], mon: null };
  const rounds = { [T.DK]: { d: [{ name: 'م١', gates: [{ uid: 'g5', num: '5', x: 10, y: 10, emp: ['e_me'] }], zones: [], marks: [] }] } };
  const W = world({ cf: true, user: staff('s24', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }], tasks: { [T.DK]: [task] }, rounds, fetch: (u) => (u.indexOf('/api/me/today') === 0 ? { body: srv } : null) });
  W.c.pfMeLoad(true); await W.flush();
  const v = W.v(), d = W.c.pfData();
  assert.deepEqual([d.Top.d, d.T.d], [Y.d, T.d], 'Top = يومُ بدء الليلية · T = يومُ الجهاز');
  assert.match(v.pfFactsNote, /يومُك التشغيلي/);
  assert.equal(v.tkHas, true, 'مهمةُ اليوم التقويمي تظهر في «مهامك» كما في KIVO_263');
  assert.equal(d.DK, T.DK, 'رصدُ الميدان يكتب في جولة اليوم التي تراها المتابعةُ اليومية — لا جولةَ الأمس');
  assert.ok(d.rnd === W.c.LS('bassam_rounds_v1', {})[T.DK] || (d.rnd && d.rnd.d && d.rnd.d[0].gates[0].uid === 'g5'), 'الخريطةُ على جولة اليوم');
  assert.deepEqual(A(d.mySpots.map((x) => x.label)), ['باب 5'], 'صفوفُ رصد الميدان من جولة اليوم');
});
test('«التفاصيل» تفتح «السجل» على الشهر الجاري ولو تُصفِّح شهرٌ آخر قبلها — والفتحُ يعيد جلبَ الشهر', () => {
  const W = world({ user: staff('s25', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }], staffing: { [T.YM]: { e_me: { shift: 'أ', rest: [] } } } });
  W.v(); W.c.pfOpenHist('all', '');
  const prev = W.KIVO.BassamProfileFacts.ymAdd(T.YM, -1);
  W.c.pfHistGo(prev); assert.equal(W.c.state.histYm, prev);
  W.c.pfClose(); W.c.state.pfPanel = 'week';
  W.v().goWeek();
  assert.deepEqual([W.c.state.pfPanel, W.c.state.histType, W.c.state.histYm], ['hist', 'rest', T.YM]);
  const before = W.c.state.pfHist[''] || W.c.state.pfHist.cur;
  W.c.pfOpenHist('all', ''); assert.notEqual(W.c.state.pfHist.cur, before, 'يُعاد حسابُ الشهر عند الفتح (لا سجلَّ قديم)');
});
test('OD-4 (الواجهة): لا أسماءَ زملاء لحسابٍ غير مرتبط بسجلّ موظف — ولو وصلت', async () => {
  const srv = { ok: 1, v: 1, day: { y: T.y, m: T.m, d: T.d, dk: T.DK, ym: T.YM, wd: T.WD, op: 'calendar' }, account: { id: 's26', role: 'staff', deptId: 'd1' },
    identity: { linked: false, by: 'none', keyed: true, rec: null },
    facts: { known: true, shift: { name: 'أ', src: 'schedule', sched: 'أ', def: null }, rest: { days: [], sched: [], today: false, src: 'schedule', dayChanged: false }, muk: { v: false, src: 'schedule' },
      status: { code: '', st: '', src: 'none', to: '', tin: false, tfrom: '', kind: '' }, report: { any: false, mine: false, approved: false, sh: '' }, month: { locked: false, has: true } },
    site: { official: null, officialN: 0, draft: null, draftN: 0, today: { fi: 0, kind: 'gates', i: 0, uid: 'g1', label: 'باب 1', short: 'باب 1', floor: 'م١', sid: '', loc: '', closed: false }, todayN: 1, same: false, plan: false, round: true, planYm: T.YM },
    mates: ['اسمٌ لا يُعرض'], matesN: 1, week: [], mon: null };
  const W = world({ cf: true, user: staff('s26', 'e_gone'), unreadable: ['bassam_employees_v1', 'bassam_staffing_v3'], fetch: (u) => (u.indexOf('/api/me/today') === 0 ? { body: srv } : null) });
  W.c.pfMeLoad(true); await W.flush();
  W.c.state.pfPanel = 'spot';
  const v = W.v();
  assert.deepEqual([A(v.spotMates), v.spotRestOn, v.spotMoreOn], [[], false, false]);
  assert.ok(!allText(v).includes('اسمٌ لا يُعرض')); assert.match(v.spotMatesTxt, /مرتبطٍ بسجلّ موظف/);
});
test('D17: «محاولات الدخول الفاشلة» دقيقةٌ حين تغطي الأحداثُ الأسبوع — وإلا «على الأقل» (الخادمُ يعيد آخر ٨ أحداث)', () => {
  const now = Date.now(), W = world({ cf: true, user: staff('s27', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }] });
  const ev = (n, act, age) => Array.from({ length: n }, (_, i) => ({ ts: now - (age || 3600000) - i * 1000, act }));
  W.c.state.pfSrv = { now, sess: [], events: ev(8, 'login_fail'), thisLogin: { ts: now }, lastLogin: null };
  let t = W.v().secEv.map((x) => x.t).join(' | ');
  assert.match(t, /محاولات دخول فاشلة على الأقل|محاولة دخول فاشلة على الأقل/, t);
  W.c.state.pfSrv = { now, sess: [], events: ev(3, 'login_fail'), thisLogin: { ts: now }, lastLogin: null }; W.c.state.pfTick = 9;
  t = W.v().secEv.map((x) => x.t).join(' | ');
  assert.ok(/فاشلة على حسابك/.test(t) && !/على الأقل/.test(t), t);
});
test('التحديثُ الحيّ: تغيّرُ مفتاحٍ يبني يومي يعيد جلبَ /api/me/today مرةً واحدةً للدفعة (≤ مرةً كلَّ ١٠ ثوانٍ) — ومفاتيحُ المهام لا تجلب', async () => {
  const body = { ok: 1, v: 1, day: { y: T.y, m: T.m, d: T.d, dk: T.DK, ym: T.YM, wd: T.WD, op: 'calendar' }, account: { id: 's28', role: 'staff', deptId: 'd1' }, identity: { linked: true, by: 'eid', keyed: true, rec: { name: 'أنا' } }, facts: null, site: null, mates: [], matesN: 0, week: [], mon: null };
  const W = world({ cf: true, user: staff('s28', 'e_me'), emps: [{ eid: 'e_me', name: 'أنا' }], fetch: (u) => (u.indexOf('/api/me/today') === 0 ? { body } : null) });
  const n = () => W.fetches.filter((u) => u.indexOf('/api/me/today') === 0).length;
  W.c.componentDidMount(); await W.flush();
  const n0 = n();
  assert.equal(n0, 1, 'جلبٌ واحدٌ عند الفتح');
  W.c._pfOnRemote({ detail: { keys: ['bsdept:d1:bassam_tasks_v1', 'bassam_notif_v1'] } }); await W.flush();
  assert.equal(n(), n0, 'المهامُ والتنبيهاتُ لا تمسّ يومي');
  W.c._pfOnRemote({ detail: { keys: ['bsdept:d1:bassam_dreport_v1'] } }); W.c._pfOnRemote({ detail: { keys: ['bassam_staffing_v3'] } }); W.c._pfOnRemote({ detail: { keys: [] } });
  await W.flush();
  assert.equal(n(), n0 + 1, 'دفعةُ أحداثٍ متتابعة ⇒ جلبٌ واحد');
  W.c.componentWillUnmount();
});
