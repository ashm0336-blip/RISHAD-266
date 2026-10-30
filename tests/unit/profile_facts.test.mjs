/* KIVO_264 · «ملفي» — قواعدُ الصفحة المشتركة (PF-CORE) نقيّةً: src/services/535-profile-facts.js (الواجهة) و workers/parts/062b-me-history.js (الخادم)
   (أ) النصُّ نفسُه حرفاً في الملفين، والسلوكُ نفسُه على المدخلات نفسِها · (ب) الربطُ بمعرّفٍ ثابت وحده (eid ثم nid للقديم — OD-9) والاسمُ ممنوع ·
   (ج) حقائقُ اليوم: التقريرُ المسحوب لمن ورد فيه والجدولُ لمن لم يرد · (د) اليومُ التشغيليّ لليلية (OD-10) · (هـ) الرسميُّ/المسودة/تسكينُ اليوم (OD-5) ·
   (و) الزملاء (OD-4) · (ز) «أسبوعك» بلا سقوطٍ إلى شهرٍ آخر · (ح) «السجل»: فئةُ دليلٍ لكل عنصر ولا إعادةَ بناءٍ من الحالة الحالية. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { blockFile, srcDir } from './harness.mjs';

const CLI = blockFile('535-profile-facts.js'), SRV = path.join(srcDir('workersParts'), '062b-me-history.js');
const J = (x) => JSON.parse(JSON.stringify(x));   /* القيمُ من سياق vm إلى هذا العالَم */
function load(file) { const ctx = { KIVO: {}, Intl, Date, Math, JSON, console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: path.basename(file) }); return ctx; }
const C = load(CLI), P = C.KIVO.BassamProfileFacts, S = load(SRV);
const core = (t) => { const a = t.indexOf('/* ══ PF-CORE:BEGIN'), b = t.indexOf('/* ══ PF-CORE:END ══ */'); assert.ok(a >= 0 && b > a, 'علامتا PF-CORE'); return t.slice(a, b); };
const DAY = 86400000;
/* لحظةٌ بتوقيت الرياض: يومٌ ميلاديّ + ساعة */
const riyadh = (y, mo, d, h, mi = 0) => Date.UTC(y, mo - 1, d, h - 3, mi);

test('(أ) PF-CORE: النصُّ نفسُه حرفاً في الخادم والواجهة — والسلوكُ نفسُه', () => {
  const a = core(fs.readFileSync(CLI, 'utf8')), b = core(fs.readFileSync(SRV, 'utf8'));
  assert.ok(a.length > 8000, 'نصٌّ حقيقي');
  assert.equal(a, b, 'أيُّ تعديلٍ على قواعد «ملفي» يُجرى في الملفين معاً');
  for (const fn of ['pfLink', 'pfTokens', 'pfDay', 'pfOpDay', 'pfSite', 'pfMates', 'pfWeek', 'pfMon', 'pfHist', 'pfMonthDays', 'pfHijriAt']) assert.equal(typeof S[fn], 'function', 'الخادم: ' + fn);
  const o = { bucket: { e1: { shift: 'أ', rest: ['الجمعة'], muk: true, cs: 'R1' } }, rep: { shifts: { 'أ': { pulled: true, ap: 1, roster: [{ ekey: 'e1', st: 'pm', pmk: 'مراجعة' }] } } }, toks: ['e1'], wd: 'الجمعة', opts: [] };
  assert.deepEqual(J(S.pfDay(o)), J(P.day(o)));
  assert.deepEqual(J(S.pfMonthDays(1447, 9)), J(P.monthDays(1447, 9)));
});

test('(ب) الربط: eid وحيد · nid للحساب القديم · الاسمُ ممنوع · مفاتيحُ الإدارة والفرع والنظام لا ترتبط', () => {
  const st = (ekey, x) => Object.assign({ role: 'staff', ekey, deptId: 'd1' }, x || {});
  assert.deepEqual(J(P.link(st('e1'), [{ eid: 'e0' }, { eid: 'e1', name: 'أ' }])), { rec: { eid: 'e1', name: 'أ' }, by: 'eid' });
  assert.deepEqual(J(P.link(st('e1'), [{ eid: 'e1', name: 'أ' }, { eid: 'e1', name: 'ب' }])), { rec: null, by: 'none' }, 'تكرارُ المعرّف ⇒ لا ربط (لا «الأول»)');
  assert.deepEqual(J(P.link(st('1234567890'), [{ eid: 'e9', nid: '1234567890', name: 'قديم' }])).by, 'nid', 'OD-9');
  assert.deepEqual(J(P.tokens(st('1234567890'), { eid: 'e9', nid: '1234567890' }, [])), ['e9', '1234567890'], 'صفوفُه بالمعرّفين');
  assert.equal(P.link(st('X'), [{ eid: 'X', name: 'بالمعرّف' }, { eid: 'e2', nid: 'X' }]).by, 'eid', 'المعرّفُ أولاً');
  assert.deepEqual(J(P.link(st('1234567890'), [{ eid: 'a', nid: '1234567890' }, { eid: 'b', nid: '1234567890' }])), { rec: null, by: 'none' }, 'هويةٌ مكرّرة ⇒ لا ربط');
  for (const k of ['محمد علي', 'محمد']) {
    assert.deepEqual(J(P.link(st(k), [{ eid: 'e1', name: k }])), { rec: null, by: 'none' }, 'لا ربطَ بالاسم: ' + k);
    assert.deepEqual(J(P.tokens(st(k), null, [{ eid: 'e1', name: k }])), [], 'ولا مطابقةَ بمفتاحٍ هو اسمُ موظف: ' + k);
  }
  assert.deepEqual(J(P.tokens(st('e_gone'), null, [{ eid: 'e1', name: 'أ' }])), ['e_gone'], 'حسابٌ بمعرّفٍ لا سجلَّ له: يُطابَق بمفتاحه نفسِه');
  /* مراجعةُ SR-2.1 · F-1: رقمُ هويةٍ مكرَّر (خطأُ إدخال) لا يصير رمزاً لأحد — ومفتاحٌ يطالب به سجلّان لا يُقرأ به */
  const dupN = [{ eid: 'e1', nid: 'N1' }, { eid: 'e2', nid: 'N1' }];
  for (const F of [P.tokens, S.pfTokens]) {
    assert.deepEqual(J(F(st('e1'), dupN[0], dupN)), ['e1'], 'المرتبطُ بمعرّفه: رقمُ هويته المكرَّر ليس رمزاً له');
    assert.deepEqual(J(F(st('N1'), null, dupN)), [], 'مفتاحٌ هو رقمُ هويةٍ لسجلّين ⇒ لا شيء');
    assert.deepEqual(J(F(st('X'), null, [{ eid: 'X' }, { eid: 'X' }])), [], 'مفتاحٌ هو معرّفٌ لسجلّين ⇒ لا شيء');
    assert.deepEqual(J(F(st('e9'), { eid: 'e9', nid: 'N9' }, [{ eid: 'e9', nid: 'N9' }, { eid: 'e1', nid: 'N1' }])), ['e9', 'N9'], 'المتفرّدُ يبقى رمزاً');
  }
  /* KIVO_265 · M-2 (المراجعةُ المستقلة لدمج 265): رقمُ هويةِ سجلّي = معرّفُ زميلٍ ثابت (خطأُ إدخال) ليس رمزاً لي — التفرّدُ في الحقلين معاً —
     وصاحبُ المعرّف يبقى مرتبطاً به (المعرّفُ أولاً — قاعدةُ 264) */
  const xN = [{ eid: 'x1', nid: 'E7' }, { eid: 'E7', nid: 'N7' }];
  for (const F of [P.tokens, S.pfTokens]) {
    assert.deepEqual(J(F(st('x1'), xN[0], xN)), ['x1'], 'رقمُ هويتي المساوي لمعرّف زميلٍ ثابت ليس رمزاً لي');
    assert.deepEqual(J(F(st('E7'), xN[1], xN)), ['E7', 'N7'], 'وصاحبُ المعرّف برمزيه');
  }
  assert.equal(P.link(st('E7'), xN).by, 'eid', 'وصاحبُ المعرّف مرتبطٌ به');
  for (const u of [st('mgr:d1', { mgr: true }), { role: 'gm', ekey: 'gm:g1' }, { role: 'super' }]) {
    assert.deepEqual(J(P.link(u, [{ eid: 'mgr:d1' }, { eid: 'gm:g1' }])), { rec: null, by: 'none' }); assert.deepEqual(J(P.tokens(u, null, [])), []);
  }
});

test('(ج) حقائقُ اليوم: التقريرُ المسحوب لمن ورد فيه · الجدولُ لمن لم يرد · الراحة · التحويل · الاعتماد · رمزُ النداء', () => {
  const bucket = { e1: { shift: 'أ', rest: ['الجمعة'], muk: true, cs: ' R1 ' } }, toks = ['e1'];
  let f = J(P.day({ bucket, rep: null, toks, wd: 'الجمعة', opts: [{ name: 'أ', tStart: '06:00', tEnd: '14:00' }] }));
  assert.deepEqual([f.known, f.cs, f.shift.name, f.shift.src, f.rest.today, f.status.code, f.muk.v, f.muk.src, f.report.any], [true, 'R1', 'أ', 'schedule', true, 'rest', true, 'schedule', false]);
  assert.deepEqual(f.shift.def, { tStart: '06:00', tEnd: '14:00', src: 'current' });
  f = J(P.day({ bucket: Object.assign({ __shifts: [{ name: 'أ', tStart: '07:00', tEnd: '15:00' }] }, bucket), rep: null, toks, wd: 'السبت', opts: [] }));
  assert.deepEqual([f.shift.def.src, f.shift.def.tStart, f.rest.today, f.status.code], ['month', '07:00', false, ''], 'لقطةُ الشهر قبل التعريفات الحالية');
  f = J(P.day({ bucket, rep: { shifts: { 'أ': { pulled: true, ap: 1, roster: [{ ekey: 'e1', st: 'ab' }] } } }, toks, wd: 'الجمعة' }));
  assert.deepEqual([f.status.st, f.status.code, f.status.src, f.report.mine, f.report.approved, f.shift.src], ['ab', 'ab', 'report', true, true, 'report'], 'غيابٌ في تقريرٍ معتمد (لا «راحة» فوقه)');
  f = J(P.day({ bucket, rep: { shifts: { 'أ': { pulled: true, roster: [{ ekey: 'e1', st: 'pr' }], rest: { e1: [] }, restSrc: { e1: 'day' }, muk: { e1: false } } } }, toks, wd: 'الجمعة' }));
  assert.deepEqual([f.rest.src, f.rest.today, f.rest.dayChanged, f.muk.v, f.muk.src, f.status.code, f.report.approved], ['report', false, true, false, 'report', 'pr', false], 'تعديلُ اليوم في التقرير يغلب الجدول');
  f = J(P.day({ bucket, rep: { shifts: { 'أ': { pulled: true, roster: [], tout: { e1: { to: 'ب', why: 'س' } } } } }, toks, wd: 'السبت' }));
  assert.deepEqual([f.status.st, f.status.to], ['tout', 'ب']);
  f = J(P.day({ bucket, rep: { shifts: { 'ب': { roster: [{ ekey: 'e1', st: 'pr', tin: 1, tfrom: 'أ' }] } } }, toks, wd: 'السبت' }));
  assert.deepEqual([f.shift.name, f.shift.sched, f.status.tin, f.status.tfrom], ['ب', 'أ', true, 'أ'], 'محوَّلٌ إليها');
  f = J(P.day({ bucket, rep: { shifts: { 'أ': { pulled: true, roster: [{ ekey: 'x9', st: 'pr' }] } } }, toks, wd: 'السبت' }));
  assert.deepEqual([f.report.any, f.report.mine, f.shift.src, f.status.code], [true, false, 'schedule', ''], 'لم يرد في التقرير ⇒ الجدول، بلا حالةٍ مفترَضة');
  f = J(P.day({ bucket: {}, rep: null, toks, wd: 'السبت' }));
  assert.deepEqual([f.known, f.shift.src, f.rest.src, f.cs], [false, 'none', 'none', '']);
});

test('(د) OD-10: الورديةُ الليلية تتبع يومَ بدئها حتى تنتهي — ثم اليومُ التقويمي', () => {
  const night = { shift: { name: 'ل', def: { tStart: '22:00', tEnd: '06:00' } }, rest: { today: false } };
  const at2 = riyadh(2026, 10, 14, 2), at7 = riyadh(2026, 10, 14, 7);
  const prevDk = P.hijriAt(at2 - DAY).dk, curDk = P.hijriAt(at2).dk;
  const dayOf = (f) => (T) => (T.dk === prevDk ? f : { shift: { name: 'ن', def: { tStart: '06:00', tEnd: '14:00' } }, rest: { today: false } });
  let d = J(P.opDay(at2, dayOf(night)));
  assert.deepEqual([d.dk, d.op], [prevDk, 'night'], 'الثانية فجراً في ليليةٍ بدأت أمس');
  d = J(P.opDay(at7, dayOf(night))); assert.deepEqual([d.dk, d.op], [curDk, 'calendar'], 'بعد انتهائها');
  d = J(P.opDay(at2, dayOf({ shift: night.shift, rest: { today: true } }))); assert.equal(d.op, 'calendar', 'أمسِ راحة');
  d = J(P.opDay(at2, dayOf({ shift: { name: 'ن', def: { tStart: '06:00', tEnd: '14:00' } }, rest: { today: false } }))); assert.equal(d.op, 'calendar', 'نهارية');
});

const g = (uid, num, emp, x) => Object.assign({ uid, num, x: 10, y: 10, emp }, x || {});
const fl = (name, approved, gates, zones) => ({ name, sid: 's-' + name, approved, gates: gates || [], zones: zones || [], marks: [] });
test('(هـ) OD-5: الإسنادُ الرسمي = طابقٌ معتمد وحده · المسودةُ طبقةٌ مستقلة · تسكينُ اليوم (المغلقُ أولاً) · same', () => {
  const plan = { months: { '1447-9': { d: [fl('م١', false, [g('a', '1', ['e1'])]), fl('م٢', true, [g('b', '2', ['e1']), g('c', '3', ['e1'])])] } } };
  let s = J(P.site({ plan, round: null, ym: '1447-9', toks: ['e1'] }));
  assert.deepEqual([s.official.label, s.officialN, s.draft.label, s.draftN, s.today, s.round, s.plan], ['باب 2', 2, 'باب 1', 1, null, false, true]);
  const round = { d: [{ name: 'م٢', gates: [g('b', '2', ['e1']), g('c', '3', ['e1'], { closed: true })], zones: [{ uid: 'z', code: 'Z1', emp: ['e1'] }], marks: [] }] };
  s = J(P.site({ plan, round, ym: '1447-9', toks: ['e1'] }));
  assert.deepEqual([s.today.label, s.today.closed, s.todayN, s.same], ['باب 3', true, 3, false], 'المغلقُ أولاً — ويختلف عن الرسمي');
  s = J(P.site({ plan: { months: { '1447-9': { d: [fl('م١', false, [g('a', '1', ['e1'])])] } } }, round: null, ym: '1447-9', toks: ['e1'] }));
  assert.deepEqual([s.official, s.draft.label], [null, 'باب 1'], 'مسودةٌ وحدها ⇒ لا موقعَ رسمي');
  s = J(P.site({ plan, round: { d: [fl('م٢', true, [g('b', '2', ['e1'])])] }, ym: '1447-9', toks: ['e1'] }));
  assert.equal(s.same, true);
});

test('(و) OD-4: الزملاء — العنصرُ نفسُه · ورديتي · لا راحة · لا غياب/إجازة/تحويل · بالاسم وحده ومرةً واحدة', () => {
  const emps = [{ eid: 'me', name: 'أنا' }, { eid: 'm1', name: 'زميل', nid: '111' }, { eid: 'b', name: 'وردية أخرى' }, { eid: 'r', name: 'في راحته' }, { eid: 'ab', name: 'غائب' }, { eid: 'lv', name: 'مجاز' }, { eid: 'to', name: 'محوَّل' }, { eid: 'nos', name: 'بلا جدول' }];
  const bucket = { me: { shift: 'أ' }, m1: { shift: 'أ' }, b: { shift: 'ب' }, r: { shift: 'أ', rest: ['الأحد'] }, ab: { shift: 'أ' }, lv: { shift: 'أ' }, to: { shift: 'أ' } };
  const rep = { shifts: { 'أ': { pulled: true, roster: [{ ekey: 'me', st: 'pr' }, { ekey: 'm1', st: 'pr' }, { ekey: 'r', st: 'pr' }, { ekey: 'ab', st: 'ab' }, { ekey: 'lv', st: 'lv' }], tout: { to: { to: 'ب' } } } } };
  const el = { emp: ['me', 'm1', '111', 'b', 'r', 'ab', 'lv', 'to', 'nos', 'غريب'] };
  const ms = J(P.mates({ el, toks: ['me'], emps, bucket, rep, wd: 'الأحد', opts: [], myShift: 'أ' }));
  assert.deepEqual(ms, ['زميل'], 'بالاسم وحده · مرةً واحدة (eid وnid للشخص نفسِه)');
  assert.deepEqual(J(P.mates({ el, toks: ['me'], emps, bucket, rep, wd: 'الأحد', myShift: '' })), [], 'لا ورديةَ لي ⇒ لا زملاء');
});
test('(و) OD-4: الزملاءُ لموظفٍ مرتبطٍ بسجلّه وحده (today المحلي كالخادم) — حسابٌ بمفتاحٍ لا سجلَّ له يرى صفوفَه بلا اسمِ أحد', () => {
  const now = Date.now(), T = P.hijriAt(now), opts = [{ name: 'أ', tStart: '00:00', tEnd: '23:59' }];
  const base = { emps: [{ eid: 'me', name: 'أنا' }, { eid: 'm1', name: 'زميل' }], staffing: { [T.ym]: { me: { shift: 'أ' }, gone: { shift: 'أ' }, m1: { shift: 'أ' } } }, dreport: {}, plan: {}, locks: {}, opts, now,
    rounds: { [T.dk]: { d: [{ gates: [{ uid: 'g', num: '1', emp: ['me', 'gone', 'm1'] }], zones: [], marks: [] }] } } };
  const a = J(P.today(Object.assign({ user: { role: 'staff', ekey: 'me', deptId: 'd1' } }, base)));
  assert.deepEqual([a.identity.linked, a.mates, a.matesN], [true, ['زميل'], 1]);
  const b = J(P.today(Object.assign({ user: { role: 'staff', ekey: 'gone', deptId: 'd1' } }, base)));
  assert.deepEqual([b.identity.linked, b.identity.keyed, b.facts.shift.name, b.site.today.label, b.mates, b.matesN], [false, true, 'أ', 'باب 1', [], 0]);
});

test('(ز) «أسبوعك»: المجدولُ من جدول شهر ذلك اليوم وحده (null حين لا جدول) · والفعليُّ من تقريره', () => {
  let end = Date.now(); while (P.hijriAt(end).d !== 3) end -= DAY;   /* ثالثُ أيام شهرٍ هجري: أربعةُ أيامٍ من الشهر السابق في النافذة */
  const T = P.hijriAt(end), staffing = { [T.ym]: { e1: { shift: 'أ', rest: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] } } };
  const dreport = { [T.dk]: { shifts: { 'أ': { pulled: true, ap: 1, roster: [{ ekey: 'e1', st: 'pr' }] } } } };
  const w = J(P.week({ end, toks: ['e1'], staffing, dreport, opts: [] }));
  assert.equal(w.length, 7); assert.equal(w[6].dk, T.dk); assert.equal(w[6].today, true);
  w.forEach((c) => assert.equal(c.sched, c.ym === T.ym ? true : null, c.dk + ': لا سقوطَ إلى جدول شهرٍ آخر'));
  assert.equal(w.filter((c) => c.ym !== T.ym).length, 4);
  assert.deepEqual(w[6].act, { code: 'rest', approved: true }, 'تقريرُ اليوم المعتمد ورد فيه — ويومُه يومُ راحةٍ مجدولة'); assert.ok(w.slice(0, 6).every((c) => c.act === null), 'بلا تقرير ⇒ لا حالةَ فعلية');
  const mon = J(S.pfMon({ ym: T.ym, toks: ['e1'], staffing, dreport: Object.assign({ [T.ym + '-1']: { shifts: { 'أ': { pulled: true, roster: [{ ekey: 'e1', st: 'ab' }] } } }, [T.ym + '-2']: { shifts: { 'أ': { pulled: true, roster: [{ ekey: 'x', st: 'pr' }] } } } }, dreport) }));
  assert.deepEqual(mon, { pr: 1, ab: 1, pm: 0, lv: 0, tout: 0, n: 2, ap: 1 }, 'يومُ غيري لا يُحسب');
});

function histWorld(upto) {
  const ym = '1447-9', days = P.monthDays(1447, 9), fri = days.filter((x) => x.wd === 'الجمعة').map((x) => x.d);
  const fg = (uid, num) => ({ name: 'م١', gates: [g(uid, num, ['e1'])], zones: [], marks: [] });
  const H = J(P.hist({ ym, days, upto, toks: ['e1'], opts: [{ name: 'أ', tStart: '06:00', tEnd: '14:00' }],
    staffing: { [ym]: { e1: { shift: 'أ', rest: ['الجمعة'], muk: false } } }, locks: { [ym]: true },
    dreport: { [ym + '-5']: { shifts: { 'أ': { pulled: true, ap: 1, roster: [{ ekey: 'e1', st: 'pr' }] } } }, [ym + '-6']: { shifts: { 'أ': { pulled: true, roster: [{ ekey: 'e1', st: 'pm', pmk: 'مراجعة' }] } } } },
    rounds: { [ym + '-5']: { d: [fg('g1', '1')] }, [ym + '-6']: { d: [fg('g1', '1')], shAp: { 'أ': { ap: true, snap: [fg('g1', '1')] } } }, [ym + '-8']: { d: [fg('g2', '2')] }, [ym + '-9']: { d: [fg('g2', '2')] } },
    plan: { months: { [ym]: { d: [Object.assign(fg('g1', '1'), { approved: true })] } } } }));
  return { H, days, fri };
}
test('(ح) «السجل» (pfHist): فئةُ الدليل لكل عنصر · لا إعادةَ بناءٍ من الجدول · تسكينُ الجولات متّصلاً بفئته', () => {
  const { H, days, fri } = histWorld(31);
  assert.deepEqual([H.month.has, H.month.locked, H.month.ev, H.month.defEv, H.month.shift], [true, true, 'saved_approved', 'current', 'أ']);
  assert.equal(H.days.length, days.length);
  const d = (n) => H.days.find((x) => x.d === n);
  assert.deepEqual([d(5).rep, d(5).ev, d(5).act.st], ['approved', 'saved_approved', 'pr']);
  assert.deepEqual([d(6).rep, d(6).ev, d(6).act.st, d(6).act.kind], ['pulled', 'saved_open', 'pm', 'مراجعة']);
  for (const n of fri) assert.deepEqual([d(n).sched.rest, d(n).ev], [true, n === 5 || n === 6 ? d(n).ev : 'none'], 'الجمعة ' + n + ': الراحةُ مجدولةٌ لا «فعلية»');
  H.days.filter((x) => x.d !== 5 && x.d !== 6).forEach((x) => { assert.equal(x.act, null, 'يوم ' + x.d + ': لا تقرير ⇒ لا حالة'); assert.equal(x.rep, 'none'); });
  assert.deepEqual(H.sites.runs.map((r) => [r.from, r.to, r.label, r.ev]), [[5, 5, 'باب 1', 'saved_open'], [6, 6, 'باب 1', 'saved_approved'], [8, 9, 'باب 2', 'saved_open']], 'الاعتمادُ يفصل الفترة · والأيامُ المتتالية تُدمج');
  assert.deepEqual([H.sites.month.length, H.sites.month[0].ev, H.sites.planApproved, 'uid' in H.sites.month[0]], [1, 'saved_approved', true, false]);
  assert.deepEqual(H.evidence, { reports: 2, approved: 1, rounds: 4 });
  const F = histWorld(6).H;
  assert.ok(F.days.filter((x) => x.d > 6).every((x) => x.ev === 'future' && x.act === null)); assert.equal(F.sites.runs.length, 2); assert.equal(F.evidence.rounds, 2);
});

test('(ح) «السجل» (histView): وسمُ دليلٍ إلزاميّ لكل عنصر · المرشِّحات · التنقّلُ «بيانات حالية» (حقيقةٌ عن النظام — KIVO_264 المراجعة F8) · غيرُ المرتبط بلا أقسامٍ شخصية', () => {
  const { H } = histWorld(31);
  const R = Object.assign({ ok: 1, identity: { linked: true, keyed: true }, changes: [{ ts: Date.now() - DAY, by: 'المدير', act: 'reassigned', f: { shift: ['أ', 'ب'] }, ev: 'logged_change' }],
    moves: { ev: 'none', items: [], note: 'لا يوجد تاريخُ تنقّلٍ بين الإدارات — النقلُ بين الإدارات غيرُ مدعومٍ في النظام حالياً' } }, H);
  R.evidence = Object.assign({ auditSince: Date.now() - 30 * DAY }, H.evidence);
  const EV = J(P.EV), V = (f) => J(P.histView(R, f));
  const all = V('all');
  assert.deepEqual(all.sections.map((s) => s.key), ['shift', 'rest', 'sites', 'muk', 'status', 'moves', 'changes']);
  all.sections.forEach((s) => s.items.forEach((it) => { assert.ok(EV[it.ev], s.key + ': فئةٌ معروفة ' + it.ev); assert.equal(it.evl, EV[it.ev], s.key + ': وسمٌ ظاهر'); }));
  const rest = all.sections.find((s) => s.key === 'rest');
  assert.ok(rest.items.some((it) => it.ev === 'derived' && /تواريخها/.test(it.t)), 'تواريخُ الراحة «مشتقة» من النمط — لا مسجَّلة');
  assert.ok(all.sections.find((s) => s.key === 'changes').items.every((it) => it.ev === 'logged_change'));
  assert.deepEqual(all.sections.find((s) => s.key === 'moves').items.map((it) => [it.ev, it.t]), [['current', 'لا يوجد تاريخُ تنقّلٍ بين الإدارات — النقلُ بين الإدارات غيرُ مدعومٍ في النظام حالياً']]);
  const nm = J(P.histView(Object.assign({}, R, { moves: { ev: 'none', items: [] } }), 'moves'));
  assert.match(nm.sections[0].items[0].t, /^لا يوجد تاريخُ تنقّلٍ بين الإدارات/, 'بلا نصٍّ من الخادم: التصريحُ نفسُه');
  assert.deepEqual(V('rest').sections.map((s) => s.key), ['rest'], 'تغييرُ الوردية لا يظهر تحت «الراحة»');
  assert.deepEqual(V('shift').sections.map((s) => s.key), ['shift', 'changes']);
  assert.deepEqual(V('moves').sections.map((s) => s.key), ['moves']);
  assert.ok(all.grid.length === H.days.length && all.grid.find((x) => x.d === 5).code === 'pr' && all.grid.find((x) => x.d === 7).txt === '—');
  assert.match(all.sources, /الجدول الشهري \(معتمد\)/); assert.match(all.sources, /التقارير اليومية \(2 يوماً · 1 معتمد\)/);
  const un = J(P.histView(Object.assign({}, R, { identity: { linked: false, keyed: false } }), 'all'));
  assert.deepEqual([un.sections.map((s) => s.key), un.grid, un.linked], [['moves'], [], false], 'لا جدولَ ولا حالاتٍ لحسابٍ غير مرتبط');
  assert.equal(J(P.histView({ ok: 0 }, 'all')).empty, true);
});

test('التقويم: أيامُ الشهر الهجري متتالية بأسماء أيامها · وعمليّاتُ الأشهر', () => {
  for (const [y, m] of [[1447, 9], [1447, 12], [1448, 1], [1448, 4]]) {
    const ds = J(P.monthDays(y, m));
    assert.ok(ds.length === 29 || ds.length === 30, y + '-' + m + ': ' + ds.length);
    ds.forEach((x, i) => { assert.equal(x.d, i + 1); assert.ok(J(P.WD).includes(x.wd)); });
    for (let i = 1; i < ds.length; i++) assert.equal(J(P.WD).indexOf(ds[i].wd), (J(P.WD).indexOf(ds[i - 1].wd) + 1) % 7, 'أيامُ أسبوعٍ متتالية');
  }
  assert.equal(P.ymAdd('1447-12', 1), '1448-1'); assert.equal(P.ymAdd('1448-1', -1), '1447-12');
  assert.ok(P.ymCmp('1448-1', '1447-12') > 0 && P.ymCmp('1447-9', '1447-9') === 0);
  assert.equal(P.monthLabel('1447-9'), 'رمضان 1447');
  const h = J(P.hijriAt(riyadh(2026, 10, 13, 12)));
  const o = {}; new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(riyadh(2026, 10, 13, 12))).forEach((p) => { o[p.type] = +p.value; });
  assert.deepEqual([h.y, h.m, h.d, h.wd], [o.year, o.month, o.day, 'الثلاثاء']);
});
