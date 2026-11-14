/* KIVO_264 · KIVO-Tasks — نموذجُ المهمة في الواجهة (src/services/546-task-model.js) مرآةٌ حرفية لنواة الخادم (workers/parts/070-task-core.js):
   الحالاتُ المنفصلة (الإسناد · التنفيذ · المراجعة · الوقت) وحالةُ العرض وسياسةُ الإثبات ونصُّها وربطُ الصفّ بسجلّ الموظف (ق4) — على صفوفٍ اصطناعية
   تغطي الحالاتِ كلَّها وأوقاتاً قبل المهلة وبعدها. الخادمُ يحكم؛ وأيُّ انحرافٍ في المرآة يُضلّل العرضَ والفرز فيُكشف هنا. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';

function server() {
  const ctx = { Intl, Date, Math, JSON, Object, Array, String, Number, isNaN, parseInt, console };
  ctx.isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  ctx.swallow = () => {}; ctx.nmap = () => Object.create(null);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'workers/parts/016-base-shared.js'), 'utf8'), ctx, { filename: '016-base-shared.js' });   /* tkEmps · tkTokN · tkTokRec انتقلت إليه (مسارُ ملفٍ فقط) */
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'workers/parts/070-task-core.js'), 'utf8'), ctx, { filename: '070-task-core.js' });
  return ctx;
}
function client() {
  const ctx = { Intl, Date, Math, JSON, Object, Array, String, Number, isNaN, parseInt, console, KIVO: {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/546-task-model.js'), 'utf8'), ctx, { filename: '546-task-model.js' });
  return ctx.KIVO.BassamTaskModel;
}
const plain = (o) => JSON.parse(JSON.stringify(o));
const NOW = 1790000000000, H = 3600e3;
const RV = { u: 'tst_u_dm', e: '', n: 'TEST_ONLY مدير' };
function R(o) {
  const r = ['TEST_ONLY مهمة', '', 'normal', o.st || 'pending', 'normal', 'مضافة', o.perf || null, [], '', 'TEST_ONLY مدير', 60, o.acc || null, o.fin || null, 1, 'tst_e1',
    o.s == null ? NOW - H : o.s, o.e == null ? NOW + H : o.e, null, null, null, o.r20 || null, o.r21 || null, 'Tabc'];
  if (o.x !== undefined) r.push(o.x);
  return r;
}
const X = (o) => Object.assign({ v: 2, by: RV, pol: { m: 'any' }, rv: RV, dec: 1 }, o || {});
const ROWS = {
  legacy_new: R({}),
  legacy_upcoming: R({ s: NOW + H, e: NOW + 2 * H }),
  legacy_expired: R({ s: NOW - 5 * H, e: NOW - 3 * H }),                              /* KIVO_265 · نافذةُ التنفيذ: الانقضاءُ بعد المهلة + ساعتي السماح */
  legacy_running: R({ st: 'in_progress', acc: NOW - 30 * 60e3 }),
  legacy_overdue_exec: R({ st: 'in_progress', acc: NOW - 3 * H, s: NOW - 4 * H, e: NOW - H }),
  legacy_done: R({ st: 'done', acc: NOW - H, fin: NOW - 10 * 60e3, perf: ['on_time', 'في الوقت'], r21: { imgs: [], note: 'تم', at: NOW - 10 * 60e3 } }),
  legacy_declined: R({ st: 'declined', r20: { at: NOW - H, why: 'ظرف' } }),
  new_x: R({ x: X() }),
  acked: R({ x: X(), r20: { ack: NOW - 5 * 60e3 } }),
  acked_expired: R({ x: X(), r20: { ack: NOW - 5 * H }, s: NOW - 6 * H, e: NOW - 3 * H }),
  running: R({ x: X(), st: 'in_progress', acc: NOW - 20 * 60e3, r20: { ack: NOW - 30 * 60e3 } }),
  stalled: R({ x: X(), st: 'in_progress', acc: NOW - 20 * 60e3, r20: { ack: NOW - 30 * 60e3, stall: { at: NOW - 5 * 60e3, why: 'نقص' } } }),
  draft: R({ x: X(), st: 'in_progress', acc: NOW - 20 * 60e3, r21: { imgs: ['img_tska_b'], note: 'م', draft: 1, at: NOW - 60e3 } }),
  submitted: R({ x: X(), st: 'in_progress', acc: NOW - H, fin: NOW - 60e3, r21: { imgs: [], note: 'تم', sub: NOW - 60e3, h: [{ at: NOW - 60e3, imgs: [], note: 'تم' }] } }),
  submitted_late: R({ x: X(), st: 'in_progress', acc: NOW - 3 * H, fin: NOW - 60e3, s: NOW - 4 * H, e: NOW - 2 * H, r21: { note: 'تم', sub: NOW - 60e3 } }),
  returned: R({ x: X({ rev: { st: 'returned', at: NOW - 30e3, by: RV, why: 'ناقص', sub: NOW - 60e3 } }), st: 'in_progress', acc: NOW - H, r21: { note: 'تم', sub: NOW - 60e3 } }),
  returned_stalled: R({ x: X({ rev: { st: 'returned', at: NOW - 30e3, by: RV, why: 'ناقص', sub: NOW - 60e3 } }), st: 'in_progress', acc: NOW - H, r20: { stall: { at: NOW - 10e3, why: 'x' } }, r21: { note: 'تم', sub: NOW - 60e3 } }),
  resubmitted: R({ x: X({ rev: { st: 'returned', at: NOW - 30e3, by: RV, why: 'ناقص', sub: NOW - 60e3 } }), st: 'in_progress', acc: NOW - H, r21: { note: 'تم+', sub: NOW - 5e3 } }),
  approved: R({ x: X({ rev: { st: 'approved', at: NOW - 5e3, by: RV, sub: NOW - 60e3 } }), st: 'done', acc: NOW - H, fin: NOW - 60e3, perf: ['early', 'مبكر'], r21: { note: 'تم', sub: NOW - 60e3 } }),
  no_review_done: R({ x: X({ rv: null }), st: 'done', acc: NOW - H, fin: NOW - 60e3, r21: { note: 'تم', sub: NOW - 60e3 } }),
  declined_x: R({ x: X(), st: 'declined', r20: { at: NOW - 60e3, why: 'ظرف' } }),
  cancelled: R({ x: X({ asg: 'cancelled', can: { at: NOW - 60e3, by: RV, why: 'أُلغيت' } }) }),
  reassigned: R({ x: X({ asg: 'reassigned', re: { at: NOW - 60e3, by: RV, why: 'غياب', to: { e: 'tst_e2', n: 'زميل' } } }), st: 'in_progress', acc: NOW - H }),
  upcoming_x: R({ x: X(), s: NOW + 2 * H, e: NOW + 3 * H }),
  pol_both_steps: R({ x: X({ pol: { m: 'both', n: 2, steps: [' تنظيف ', 'تصوير', '', 7] } }) }),
  pol_img3: R({ x: X({ pol: { m: 'img', n: 3 } }) }),
  pol_note: R({ x: X({ pol: { m: 'note' } }) }),
  pol_none: R({ x: X({ pol: { m: 'none' } }) }),
  pol_bad: R({ x: X({ pol: { m: 'weird', n: 9 } }) }),
  x_not_object: R({ x: 'oops' }),
  rv_empty: R({ x: X({ rv: { n: 'بلا مفتاح' } }), st: 'in_progress', acc: NOW - H, r21: { note: 'تم', sub: NOW - 60e3 } }),
  /* KIVO_265 · نافذةُ التنفيذ: الانقضاءُ بعد المهلة + late (الافتراضي 2 س · late 0 فوراً · late 24 طويل) */
  win_grace_default: R({ x: X(), s: NOW - 3 * H, e: NOW - 1.5 * H }),
  win_late0: R({ x: X({ win: { early: 0, late: 0 } }), s: NOW - 3 * H, e: NOW - 60e3 }),
  win_late24: R({ x: X({ win: { early: 30, late: 24 } }), s: NOW - 30 * H, e: NOW - 20 * H }),
  win_bad: R({ x: X({ win: { early: 'x', late: -3 } }), s: NOW - 3 * H, e: NOW - 1.5 * H }),
  legacy_grace: R({ s: NOW - 3 * H, e: NOW - 1.5 * H }),
};
const TIMES = [NOW, NOW - 2 * H, NOW + 4 * H];

test('مرآةُ النموذج: الحالاتُ المنفصلة وحالةُ العرض في الواجهة (546) = الخادم (070) لكل صفٍّ ووقت', () => {
  const S = server(), C = client();
  let n = 0;
  for (const [name, r] of Object.entries(ROWS)) for (const now of TIMES) {
    const a = plain(S.tkState(r, now)), b = plain(C.state(r, now));
    assert.deepEqual(b, a, 'state ' + name + ' @' + (now - NOW) / H + 'h');
    assert.equal(C.phase(r, now), S.tkPhase(r, now), 'phase ' + name + ' @' + (now - NOW) / H + 'h');
    n++;
  }
  assert.ok(n >= 90, 'التغطية: ' + n);
  /* الحالاتُ المتوقعة صراحةً (لا مرآةَ تتفق مع خادمٍ مخطئ) */
  const ph = (k) => S.tkPhase(ROWS[k], NOW);
  assert.deepEqual([ph('legacy_new'), ph('legacy_upcoming'), ph('legacy_expired'), ph('legacy_running'), ph('legacy_done'), ph('legacy_declined')], ['new', 'upcoming', 'expired', 'running', 'done', 'declined']);
  assert.deepEqual([ph('stalled'), ph('submitted'), ph('returned'), ph('resubmitted'), ph('approved'), ph('cancelled'), ph('reassigned')], ['stalled', 'review', 'returned', 'review', 'done', 'cancelled', 'reassigned']);
  assert.equal(ph('returned_stalled'), 'returned', 'المُعادةُ تبقى «أُعيدت» ولو أُبلغ بتعثّرها');
  assert.equal(S.tkState(ROWS.acked, NOW).asg, 'acknowledged'); assert.equal(S.tkState(ROWS.acked, NOW).exe, 'not_started', 'الاستلامُ لا يبدأ التنفيذ');
  assert.equal(S.tkState(ROWS.legacy_done, NOW).rev, 'none', 'الصفُّ القديم بلا مراجِع');
  assert.equal(S.tkState(ROWS.no_review_done, NOW).rev, 'none'); assert.equal(S.tkState(ROWS.approved, NOW).rev, 'approved');
  assert.equal(S.tkState(ROWS.rv_empty, NOW).rev, 'none', 'مراجِعٌ بلا مفتاح ⇒ لا مراجعة');
  assert.equal(S.tkState(ROWS.submitted_late, NOW).tim, '', 'المسلَّمةُ لا تُعدّ متأخرةَ التنفيذ وهي بانتظار المراجِع');
  assert.equal(S.tkState(ROWS.legacy_overdue_exec, NOW).tim, 'overdue_exec');
  assert.equal(S.tkState(ROWS.acked_expired, NOW).tim, 'overdue_ack');
});

test('مرآةُ النموذج: سياسةُ الإثبات ونصُّها (ق2) والمراجِع (ق3) وربطُ الصفّ بسجلّ الموظف (ق4)', () => {
  const S = server(), C = client();
  for (const [name, r] of Object.entries(ROWS)) {
    assert.deepEqual(plain(C.pol(r)), plain(S.tkPolOf(r)), 'pol ' + name);
    assert.equal(C.polTxt(C.pol(r)), S.tkPolTxt(S.tkPolOf(r)), 'polTxt ' + name);
    assert.deepEqual(plain(C.rv(r)), plain(S.tkRv(r)), 'rv ' + name);
  }
  assert.equal(S.tkPolTxt(S.tkPolOf(ROWS.new_x)), 'صورةٌ أو ملاحظة', 'ق2: الافتراضيّ');
  assert.equal(S.tkPolTxt(S.tkPolOf(ROWS.legacy_new)), 'صورةٌ أو ملاحظة', 'الصفُّ القديم: «صورة أو ملاحظة»');
  assert.deepEqual(plain(S.tkPolOf(ROWS.pol_both_steps)), { m: 'both', n: 2, steps: ['تنظيف', 'تصوير'] });
  assert.equal(S.tkPolTxt(S.tkPolOf(ROWS.pol_both_steps)), '2 صور وملاحظة · 2 خطوات');
  assert.deepEqual(plain(S.tkPolOf(ROWS.pol_bad)), { m: 'any', n: 1, steps: [] }, 'سياسةٌ معطوبة ⇒ الافتراضيّ');
  const emps = [{ eid: 'E1', nid: '111', name: 'أحمد' }, { eid: 'E2', nid: '222', name: 'سالم' }, { eid: 'E3', nid: '222', name: 'سالم ب' }, { eid: '', nid: '333', name: 'خالد' },
    { eid: 'E5', nid: '555', name: 'ماجد' }, { eid: 'E5', nid: '556', name: 'ماجد ب' }];   /* SR-2.2 · F-1: معرّفٌ ثابتٌ يحمله سجلّان (خطأُ إدخال) */
  for (const tok of ['E1', '111', '222', '333', 'أحمد', 'مجهول', '', null, 'E9', 'E5', '555']) {
    const a = plain(S.tkLink(emps, tok)), b = plain(C.link(emps, tok));
    assert.deepEqual(b, a, 'link ' + tok);
  }
  assert.equal(S.tkLink(emps, '222').by, 'ambiguous', 'هويةٌ وطنية مشتركة ⇒ ملتبسة (لا ربط)');
  assert.deepEqual(plain(S.tkLink(emps, 'E5')), { by: 'ambiguous', emp: null }, 'SR-2.2 · F-1: معرّفٌ ثابتٌ مشترك ⇒ ملتبس لا أوّلُ مطابِق');
  assert.equal(S.tkLink(emps, '555').by, 'nid', 'ورقمُ الهوية الفريد لأحدهما مرتبطٌ وقتَ القراءة');
  assert.equal(S.tkLink(emps, 'أحمد').by, 'name', 'الاسمُ وحده ⇒ «غير مرتبطة» (مرشَّحٌ للربط اليدوي لا ربط)');
  assert.equal(S.tkLink(emps, 'أحمد').emp, null);
  /* KIVO_265 · M-2: التفرّدُ في الحقلين معاً — رقمُ هويةِ سجلٍّ = معرّفُ زميلٍ ثابت ⇒ ملتبسٌ للطرفين · L-2: مرشَّحُ الاسم إن تفرّد الاسمُ وحده */
  const emps2 = [{ eid: 'E7', nid: '777', name: 'فهد' }, { eid: 'X1', nid: 'E7', name: 'فهد ب' }, { eid: 'E8', nid: '888', name: 'سعد' }, { eid: 'E9', nid: '999', name: 'سعد' }, { eid: 'E6', nid: '666', name: 'نايف' }];
  for (const tok of ['E7', '777', 'X1', 'سعد', 'نايف', 'E8']) assert.deepEqual(plain(C.link(emps2, tok)), plain(S.tkLink(emps2, tok)), 'link ' + tok);
  assert.deepEqual(plain(S.tkLink(emps2, 'E7')), { by: 'ambiguous', emp: null }, 'M-2: معرّفُ E7 يحمله سجلّان (eid ∪ nid) ⇒ ملتبس');
  assert.equal(S.tkLink(emps2, '777').by, 'nid', 'ورقمُ هويته الفريد ما زال يدلّ عليه');
  assert.deepEqual(plain(S.tkLink(emps2, 'سعد')), { by: 'name', emp: null, cand: null }, 'L-2: اسمٌ يحمله اثنان ⇒ لا مرشَّح (لا أوّلُ مطابِق)');
  assert.equal(S.tkLink(emps2, 'نايف').cand.eid, 'E6', 'والاسمُ الفريد مرشَّحٌ للاختيار اليدوي');
});

test('مرآةُ النموذج: نافذةُ التنفيذ (win · from · to · النصّ) والأداءُ من المهلة (perf) في الواجهة (546) = الخادم (070)', () => {
  const S = server(), C = client();
  for (const [name, r] of Object.entries(ROWS)) {
    assert.deepEqual(plain(C.win(r)), plain(S.tkWinOf(r)), name + ' · win');
    assert.equal(C.winTxt(C.win(r)), S.tkWinTxt(S.tkWinOf(r)), name + ' · txt');
    assert.equal(C.winFrom(r), S.tkWinFrom(r), name + ' · from'); assert.equal(C.winTo(r), S.tkWinTo(r), name + ' · to');
    for (const fin of [NOW, NOW - 2 * H, NOW + 4 * H, NOW - 50 * 60e3]) assert.deepEqual(plain(C.perf(r, fin)), plain(S.tkPerfOf(r, fin)), name + ' · perf@' + fin);
  }
  const W = S.tkWinOf(ROWS.win_late24); assert.equal(W.early, 30); assert.equal(W.late, 24); assert.equal(W.set, 1);
  assert.deepEqual(plain(S.tkWinOf(ROWS.win_bad)), { early: 0, late: 2, set: 0 }, 'القيمُ الفاسدة ⇒ الافتراضي');
  assert.equal(S.tkPhase(ROWS.win_grace_default, NOW), 'new'); assert.equal(S.tkPhase(ROWS.win_grace_default, NOW + H), 'expired');
  assert.equal(S.tkPhase(ROWS.win_late0, NOW), 'expired'); assert.equal(S.tkPhase(ROWS.win_late24, NOW), 'new');
  assert.equal(S.tkPerfOf(R({ s: NOW - 2 * H, e: NOW + 8 * H, acc: NOW - H }), NOW)[0], 'early');
  assert.equal(S.tkPerfOf(R({ s: NOW - 2 * H, e: NOW + 2 * 60e3, acc: NOW - H }), NOW)[0], 'on_time');
  assert.equal(S.tkPerfOf(R({ s: NOW - 2 * H, e: NOW - 2 * 60e3, acc: NOW - H }), NOW)[0], 'late');
  assert.equal(S.tkPerfOf(R({ s: null, e: null, acc: NOW - 30 * 60e3 }), NOW)[0], 'early', 'بلا مهلة: القاعدةُ القديمة (60 د من القبول)');
});
