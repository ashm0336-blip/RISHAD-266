/* V7 · د5-د — روابطُ الجدول الشهري عبر الناقل، وإصلاحُ حدّ الاستئذانات، وناقلُ الخادم. بيانات TEST_ONLY.
   ① حدُّ الاستئذانات المحفوظ يُقرأ ويُطبَّق (كان loadPermLimit يعيد 2 دائماً).
   ② الأمر staff.callsign.set@1 = ما كان التقرير يكتبه مباشرةً، في حالاته الثلاث.
   ③ المشارك shifts.renamed@1 = ما كانت الإعدادات تكتبه مباشرةً (sfRenameEverywhere)، والقراءة staff.shiftUsage@1 = sfUsage.
   ④ بغياب الجدول: القراءةُ undefined · الأمرُ { ok:0, absent:1 } · الحدثُ بلا مشارك — ولا خطأ.
   ⑤ ناقلُ الخادم: القاعدةُ تسأل بالاسم؛ بلا مشاركٍ الجوابُ «لا»؛ والاسمُ بغير شكله خطأ. وأجزاءُ القاعدة لا تسمّي دالةَ الجدول. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { hToIso as H } from '../../../../tests/unit/cal_fx.mjs';   /* V7 · 53 تقويم: مفاتيحُ الاختبار الهجرية ⇐ ISO بالعُدّة المشتركة (الأغلبية للشهر) */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const copy = (v) => JSON.parse(JSON.stringify(v));

function client({ store = {}, on = true, links = true } = {}) {
  const KIVO = { __BS_SRV: { operations: { get: (k) => (k in store ? copy(store[k]) : null), state: () => 'ready' } }, BassamPerm: { on: () => on }, BassamDay: { of: (y, m, d) => ({ y, m, d }), availTxt: (s, t) => s + ':' + t } };
  const ctx = vm.createContext({ KIVO, console, Intl, Date, Math, JSON, Object, Array, isFinite, parseInt, Error });
  vm.runInContext(rd('src/core/060-bus.js'), ctx);
  if (links) vm.runInContext(rd('src/systems/staff/client/531-staff-links.js'), ctx);
  if (links) vm.runInContext(rd('src/systems/staff/client/533-staff-g3.js'), ctx);
  return { KIVO, ctx, bus: KIVO.bus };
}
function draftOf(store) { const w = {}; return { get: (k) => (k in w ? w[k] : k in store ? copy(store[k]) : null), set: (k, v) => { w[k] = copy(v); }, written: w }; }

test('① the stored permission limit is read and applied — not the constant default', () => {
  for (const [stored, want] of [['7', 7], [5, 5], [0, 0], ['99', 31], [{}, undefined], [null, undefined], ['x', undefined]])
    assert.equal(client({ store: { bassam_perm_limit_v1: stored } }).bus.read('staff.permLimit@1'), want, JSON.stringify(stored));
  /* عُدّة الصفحات: السمة التي ترثها صفحتا الجدول والتقرير */
  const kit = (store, links) => {
    const c = client({ store, links });
    c.ctx.window = c.ctx; c.ctx.document = { getElementById: () => null }; c.ctx.DCLogic = class { constructor() { this.state = {}; } };
    vm.runInContext(rd('src/i18n/385-calendar.js'), c.ctx); vm.runInContext(rd('src/components/565-page-kit.js'), c.ctx);
    return new (vm.runInContext('KIVO.BassamPageKit.base(DCLogic, ["dreport+staff"])', c.ctx))();
  };
  assert.equal(kit({ bassam_perm_limit_v1: '6' }, true).loadPermLimit(), 6, 'المحفوظ يُقرأ');
  assert.equal(kit({ bassam_perm_limit_v1: 0 }, true).loadPermLimit(), 0, 'الصفر حدٌّ محفوظ لا غياب');
  assert.equal(kit({}, true).loadPermLimit(), 2, 'بلا حدٍّ محفوظ: الافتراضي');
  assert.equal(kit({ bassam_perm_limit_v1: '6' }, false).loadPermLimit(), 2, 'بغياب الجدول: الافتراضي');
  /* التطبيق: الصفحتان تأخذان الحدَّ من loadPermLimit وحده — المنعُ عند بلوغه */
  const staff = rd('src/systems/staff/client/logic.js'), report = rd('src/systems/dreport/client/logic.js');
  assert.match(staff, /permLimit: this\.loadPermLimit\(\)/); assert.match(staff, /s\.length >= this\.state\.permLimit/);
  assert.match(report, /d\.length >= this\.loadPermLimit\(\)/);
  assert.doesNotMatch(rd('src/components/565-page-kit.js'), /loadPermLimit\(\) \{\s*return this\.PERM_DEF_LIMIT;/, 'لا عودةَ للثابت');
});

test('② staff.callsign.set@1 writes exactly what the report used to write itself, in its three cases', () => {
  const month = H('1448-5'), store = { bassam_staffing_v3: { [month]: { a: { shift: 'S', cs: 'C1' }, b: { shift: 'S' }, __shifts: ['S'] }, [H('1448-4')]: { a: { cs: 'OLD' } } } };
  const viaBus = (changes) => { const c = client({ store }), d = draftOf(store); const r = c.bus.call('staff.callsign.set@1', { month, changes }, d); return { r, w: d.written }; };
  /* (1) drCsPersist — كان: a[t] = {…a[t], cs:r} دائماً */
  { const want = copy(store.bassam_staffing_v3); want[month].b = { ...want[month].b, cs: 'C9' }; const got = viaBus([{ ekey: 'b', cs: 'C9' }]); assert.deepEqual(got.w.bassam_staffing_v3, want); assert.equal(got.r.ok, 1); }
  { const want = copy(store.bassam_staffing_v3); want[month].zz = { cs: '' }; assert.deepEqual(viaBus([{ ekey: 'zz', cs: '' }]).w.bassam_staffing_v3, want, 'موظفٌ بلا صفّ ورمزٌ فارغ: يُكتب كما كان'); }
  /* (2) rpSetLeader — كان: يُفرَّغ الرمز عن السابق إن كان ما زال يحمله، ويُكتب للجديد؛ ولا كتابةَ إن لم يتغيّر شيء */
  const old = (s, r, o) => { const st = copy(store.bassam_staffing_v3), bucket = { ...(st[month] || {}) }; let changed = false;
    if (s && s !== r && bucket[s] && bucket[s].cs === o) { bucket[s] = { ...bucket[s], cs: '' }; changed = true; }
    if (r && r !== s) { bucket[r] = { ...(bucket[r] || {}), cs: o }; changed = true; }
    if (changed) st[month] = bucket; return changed ? st : undefined; };
  for (const [s, r, o] of [['a', 'b', 'C1'], ['a', 'b', 'OTHER'], ['a', '', 'C1'], ['', 'b', 'C1'], ['a', 'a', 'C1'], ['a', '', 'OTHER'], ['nobody', 'b', 'C1']]) {
    const changes = []; if (s && s !== r) changes.push({ ekey: s, cs: '', ifCs: o }); if (r && r !== s) changes.push({ ekey: r, cs: o });
    assert.deepEqual(viaBus(changes).w.bassam_staffing_v3, old(s, r, o), [s, r, o].join('→'));
  }
  /* (3) drLdCsSet — كان: bucket[i].cs = r || "" دائماً */
  { const want = copy(store.bassam_staffing_v3); want[month].a = { ...want[month].a, cs: '' }; assert.deepEqual(viaBus([{ ekey: 'a', cs: '' }]).w.bassam_staffing_v3, want); }
  /* لا يمسّ شهراً آخر ولا حقلاً غير cs، ويطلب مسودة */
  const got = viaBus([{ ekey: 'a', cs: 'NEW' }]).w.bassam_staffing_v3; assert.deepEqual(got[H('1448-4')], store.bassam_staffing_v3[H('1448-4')]); assert.equal(got[month].a.shift, 'S');
  assert.throws(() => client({ store }).bus.call('staff.callsign.set@1', { month, changes: [] }), /bus-draft-required/);
});

test('③ shifts.renamed@1 and staff.shiftUsage@1 equal what the settings page used to do on the schedule keys itself', () => {
  const store = { bassam_staffing_locks_v1: { [H('1448-3')]: true }, bassam_staffing_v3: { [H('1448-3')]: { a: { shift: 'ليل', rest: [1] }, __shifts: ['ليل'] }, [H('1448-4')]: { a: { shift: 'ليل' }, b: { shift: 'نهار' }, c: null, __shifts: ['ليل'] }, [H('1448-5')]: 'bad', [H('1448-6')]: { d: { shift: 'ليل', cs: 'X' } } } };
  const oldRename = (st, t, e, deleting) => { const d = draftOf(st); const locks = d.get('bassam_staffing_locks_v1') || {}, a = d.get('bassam_staffing_v3') || {}; let r = false;
    Object.keys(a).forEach((i) => { const n = a[i]; n && 'object' == typeof n && Object.keys(n).forEach((s) => { if ('__shifts' === s || !n[s] || n[s].shift !== t) return; if (locks[i]) { if (deleting) throw Error('locked-month'); return; } n[s] = Object.assign({}, n[s], { shift: e }); r = true; }); });
    r && d.set('bassam_staffing_v3', a); return d.written; };
  const viaBus = (st, from, to, deleting, on = true) => { const c = client({ store: st, on }), d = draftOf(st); c.bus.participate('shifts.renamed@1', { from, to, deleting }, d); return d.written; };
  assert.deepEqual(viaBus(store, 'ليل', 'مسائي', false), oldRename(store, 'ليل', 'مسائي', false));
  assert.deepEqual(viaBus(store, 'ليل', 'مسائي', false).bassam_staffing_v3[H('1448-3')].a.shift, 'ليل', 'الشهر المعتمد يُترك عند التسمية');
  assert.deepEqual(viaBus(store, 'غير موجودة', 'x', false), {}, 'لا كتابةَ بلا تغيير');
  assert.throws(() => viaBus(store, 'ليل', '', true), /locked-month/); assert.throws(() => oldRename(store, 'ليل', '', true), /locked-month/);
  const open = { ...store, bassam_staffing_locks_v1: {} };
  assert.deepEqual(viaBus(open, 'ليل', '', true), oldRename(open, 'ليل', '', true), 'الحذف يفرّغ الخانة في كل شهرٍ مفتوح');
  assert.deepEqual(viaBus(store, 'ليل', 'مسائي', false, false), {}, 'الجدول غير مفعَّل في الإدارة: لا تبعة (كما كان bsOn)');
  const oldUsage = (st, t, on) => { let e = 0, s = {}, a = []; const r = st.bassam_staffing_locks_v1 || {}; if (on) { const i = st.bassam_staffing_v3 || {}; Object.keys(i).forEach((n) => { const o = i[n]; if (!o || 'object' != typeof o) return; let p = 0; (Object.keys(o).forEach((a2) => { '__shifts' !== a2 && o[a2] && o[a2].shift === t && (e++, (s[n] = 1), p++); }), p && r[n] && a.push(n)); }); } return { records: e, months: Object.keys(s).length, locked: a }; };
  for (const on of [true, false]) for (const name of ['ليل', 'نهار', 'لا أحد']) { const u = client({ store, on }).bus.read('staff.shiftUsage@1', name); assert.deepEqual({ records: u.records, months: u.months, locked: copy(u.locked) }, oldUsage(store, name, on), name + on); assert.equal(u.on, on); }
});

test('④ without the schedule program nothing fails: a read is undefined, the command reports absence, the event has no participant', () => {
  const c = client({ links: false }), d = draftOf({});
  for (const n of ['staff.dayFacts@1', 'staff.availText@1', 'staff.permLimit@1', 'staff.shiftUsage@1']) { assert.equal(c.bus.read(n, 1, 2, 3), undefined); assert.equal(c.bus.has(n), false); }
  assert.deepEqual(copy(c.bus.call('staff.callsign.set@1', { month: 'm', changes: [] }, d)), { ok: 0, absent: 1 });
  assert.equal(c.bus.participate('shifts.renamed@1', { from: 'a', to: 'b' }, d), 0); assert.deepEqual(d.written, {});
  /* وبحضوره: القراءتان تمرّان إلى خدمة وقائع اليوم كما هي */
  const p = client(); assert.deepEqual(copy(p.bus.read('staff.dayFacts@1', 1448, 5, 9)), { y: 1448, m: 5, d: 9 }); assert.equal(p.bus.read('staff.availText@1', 'S', true), 'S:true');
  /* المستهلكون في المصدر لا يسمّون خدمةَ الجدول ولا يكتبون مفتاحَه */
  for (const f of ['src/systems/dreport/client/logic.js', 'src/systems/plan/client/logic.js', 'src/systems/daily/client/logic.js.tpl', 'src/slots/modules/admin/logic.js.tpl']) {
    const s = rd(f); assert.doesNotMatch(s, /KIVO\.BassamDay\b/, f); assert.doesNotMatch(s, /draft\.set\("bassam_staffing_v3"/, f);
  }
});

test('⑤ the server bus: the base asks by name; no participant means "no"; a malformed name is an error; base parts never name the schedule function', () => {
  const ctx = vm.createContext({ Object, Array, Error, String });
  vm.runInContext(rd('workers/parts/016b-server-bus.js'), ctx);
  assert.equal(vm.runInContext("srvBusAccepts('shifts.renamed@1', 1, 2)", ctx), false, 'بلا مشارك');
  assert.throws(() => vm.runInContext("srvBusAccepts('shiftsRenamed')", ctx), /bus-name/); assert.throws(() => vm.runInContext("srvBusParticipant('x', function () {})", ctx), /bus-name/);
  assert.throws(() => vm.runInContext("srvBusParticipant('shifts.renamed@1', 5)", ctx), /bus-handler/);
  vm.runInContext("var seen = []; srvBusParticipant('shifts.renamed@1', function (a, b) { seen.push([a, b]); return 'yes'; }); srvBusParticipant('shifts.renamed@1', function (a) { return a === 7; });", ctx);
  assert.equal(vm.runInContext("srvBusAccepts('shifts.renamed@1', 1, 2)", ctx), false, 'القبولُ true صريحاً فقط');
  assert.equal(vm.runInContext("srvBusAccepts('shifts.renamed@1', 7, 2)", ctx), true);
  assert.deepEqual(copy(vm.runInContext('seen', ctx)), [[1, 2], [7, 2]]);
  /* جزءُ الجدول يسجّل نفسَه، وأجزاءُ القاعدة تسأل بالاسم */
  assert.match(rd('src/systems/staff/server/041a-shift-rename.js'), /srvBusParticipant\('shifts\.renamed\.cascade@1', shiftRenameCascade\);/);   /* V7 · د5-ح: مشاركُ الوضع القديم shiftRenameOk حُذف */
  const parts = JSON.parse(rd('workers/parts.json')).parts.map((p) => p.file);
  assert.ok(parts.indexOf('016b-server-bus.js') !== -1 && parts.indexOf('016b-server-bus.js') < parts.findIndex((f) => /041a-shift-rename/.test(f)), 'الناقل يسبق جزءَ الجدول');
  for (const f of parts.filter((f) => !f.includes('/'))) assert.doesNotMatch(rd('workers/parts/' + f), /\bshiftRenameOk\b|\bshiftLeft\b/, f);
  assert.match(rd('workers/parts/059-protected-ops-2.js'), /srvBusAccepts\('shifts\.renamed\.cascade@1', rn, diffs, newVal, ctx\)/);
  assert.match(rd('src/systems/staff/server/041a-shift-rename.js'), /srvBusParticipant\('shifts\.renamed\.cascade@1', shiftRenameCascade\);/);
  /* V7 · د5-ح (القفل): سؤالُ الوضع القديم srvBusAccepts('shifts.renamed@1', …) في 044 canWrite حُذف مع فرعه — لا جزءَ يسأل به في الخادم */
  for (const f of JSON.parse(rd('workers/parts.json')).parts.map((p) => p.file).filter((x) => !x.includes('/'))) assert.doesNotMatch(rd('workers/parts/' + f), /srvBusAccepts\('shifts\.renamed@1'/, f);
  assert.doesNotMatch(rd('workers/parts/016b-server-bus.js').replace(/\/\*[\s\S]*?\*\//g, ''), /staff|plan|daily|rounds|dreport|tasks|seized|irshad|award|custody|dstats/, 'لا اسمَ برنامجٍ في الناقل');
});
