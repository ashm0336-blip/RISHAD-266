/* V7 · د6 (رصد الحالات · ر2) — منطقُ الصفحة وحده: الصفحةُ الحقيقية (client/logic.js) مع عُدّة الصفحات (565) وخدمة التقويم (385) والعدّ (440)
   في سياقٍ معزول؛ المخزنُ السحابي (واجهةُ localStorage في المنصة) خريطةٌ في الذاكرة. يثبت سلوكَ Production: القوائمُ الافتراضية والقيمُ الأساسية ·
   الإضافةُ قبل «أخرى» · التعديلُ يسري على السجلات والمؤشرات · الحذفُ يُبقي النصَّ المسجَّل · التحقّق (الجهةُ مع «إبلاغ جهة مختصة» وحدها · وقتُ الوقوع
   منفصلٌ ولا يكون بعد الآن) · المؤشرات · شكلُ السجل المحفوظ بمفاتيح Production · الموقعُ مصفّىً بالمنطقة · تنبيهُ «ممنوعات» عبر الناقل وحده. TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = process.env.KIVO_SRC || new URL('../../../', import.meta.url).pathname;
const rd = (p) => fs.readFileSync(SRC + '/' + p, 'utf8');

function world({ seized } = {}) {
  const store = new Map(), writes = [], toasts = [], acks = [];
  const perm = new Set(['view', 'add', 'edit', 'del', 'approve', 'export']);
  const KIVO = {
    BassamPerm: { can: (p, a) => p === 'rasd' && perm.has(a), subOn: () => true },
    BassamAuth: { user: () => ({ id: 'TEST_ONLY_u1', un: 'TEST_ONLY' }), display: () => ({ name: 'TEST_ONLY راصد' }) },
    BassamDepts: { activeName: () => 'TEST_ONLY إدارة أ' },
    bus: { read: (n) => (n === 'seized.usable@1' ? seized : undefined) },
    BassamFind: { filter: (q, rows, f) => rows.filter((r) => !q || f(r).some((x) => String(x).indexOf(q) >= 0)) },
    BassamAck: { toast: (c, t) => (acks.push(t), Promise.resolve(true)) },
  };
  const C = { KIVO, window: null, DCLogic: class { constructor(p) { this.props = p || {}; } setState(s) { this.state = { ...this.state, ...(typeof s === 'function' ? s(this.state) : s) }; } },
    console, Date, Intl, Math, JSON, setTimeout, clearTimeout, location: { hash: '#/rasd', pathname: '/', search: '' }, history: {}, document: { getElementById: () => null },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { writes.push(k); store.set(k, String(v)); }, removeItem: (k) => store.delete(k) } };
  C.window = C; C.globalThis = C;
  vm.createContext(C);
  for (const f of ['i18n/380-hijri-fallback.js', 'i18n/385-calendar.js', 'services/440-count.js', 'components/565-page-kit.js']) vm.runInContext(rd(f), C, { filename: f });
  vm.runInContext(rd('systems/rasd/client/logic.js') + '\nglobalThis.TEST_ONLY_Rasd = Component;', C, { filename: 'rasd/logic.js' });
  const page = new C.TEST_ONLY_Rasd({});
  page.bsToast = (t) => toasts.push(t);
  return { page, store, writes, toasts, acks, perm, KIVO };
}
const J = (s) => JSON.parse(s);
/* قيمُ السياق المعزول من عالمٍ آخر (vm): تُقارن بنسختها النصّية */
const X = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v))), eq = (a, b, m) => assert.deepEqual(X(a), X(b), m);

test('rasd · القوائمُ الافتراضية والقيمُ الأساسية (كما في Production) — والتطبيعُ يُبقي الأساسي حاضراً', () => {
  const { page } = world();
  const o = page.rzSeedOpts();
  eq(o.zone.map((x) => x.n), ['الأبواب', 'المسعى', 'الرواق السعودي', 'توسعة الملك فهد', 'الساحة الشرقية', 'الساحة الغربية', 'أخرى']);
  eq(o.floor.map((x) => x.n), ['القبو', 'الأرضي', 'الأول', 'الثاني', 'السطح', 'الساحات الخارجية', 'لا ينطبق']);
  eq(o.type.map((x) => x.n), ['ممنوعات', 'ظاهرة سلبية', 'ازدحام', 'حالة صحية', 'إغلاق جزئي', 'عائق بالممر', 'تعثر تدفق', 'أخرى']);
  eq(o.act.map((x) => x.n), ['منع إدخال', 'تنظيم حركة', 'توجيه لمسار بديل', 'إبلاغ جهة مختصة', 'لم يتخذ إجراء بعد', 'أخرى']);
  eq(o.party.map((x) => x.n), ['العمليات المشتركة', 'العمليات الموحدة', 'مكافحة الظواهر السلبية', 'الجهة الفنية', 'أخرى', 'لم يتم الإبلاغ']);
  assert.equal(o.spot.length, 31);
  eq(o.spot[0], { n: 'باب 1', z: 'الأبواب', g: 'باب' });
  assert.ok(o.zone.every((x) => typeof x.c === 'string' && x.c));
  eq(page.RZ_IMPACTS, ['منخفض', 'متوسط', 'عالٍ', 'حرج']);
  /* قائمةٌ مخزَّنة بلا قيمها الأساسية تستعيدها · فارغةٌ تأخذ الافتراضي · المواقعُ كما خُزّنت */
  const n = page.rzNormOpts({ type: [{ n: 'TEST_ONLY نوع', c: '#0e7490' }], act: [], spot: [{ n: 'TEST_ONLY موقع', z: 'الأبواب' }] });
  eq(n.type.map((x) => x.n), ['TEST_ONLY نوع', 'ممنوعات', 'أخرى']);
  eq(n.act.map((x) => x.n), o.act.map((x) => x.n));
  eq(n.spot, [{ n: 'TEST_ONLY موقع', z: 'الأبواب', g: '' }]);
});

test('rasd · القوائم تُدار من داخلها: إضافةٌ قبل «أخرى» · تعديلٌ يسري على السجلات (والمؤشرات) · حذفٌ يُبقي القيمة المسجّلة · الأساسيُّ لا يُمسّ', () => {
  const { page } = world();
  const o = page.rzSeedOpts();
  const add = page.rzListAdd(o, 'type', ' TEST_ONLY نوعٌ جديد ');
  assert.equal(add.v, 'TEST_ONLY نوعٌ جديد');
  eq(add.opts.type.slice(-2).map((x) => x.n), ['TEST_ONLY نوعٌ جديد', 'أخرى']);
  assert.match(page.rzListAdd(add.opts, 'type', 'ازدحام').err, /موجود/);
  assert.match(page.rzListAdd(o, 'spot', 'TEST_ONLY موقع', '').err, /اختر المنطقة/);
  assert.match(page.rzListAdd(o, 'spot', 'TEST_ONLY موقع', 'أخرى').err, /اختر المنطقة/);
  eq(page.rzListAdd(o, 'spot', 'TEST_ONLY موقع', 'المسعى').opts.spot.slice(-1)[0], { n: 'TEST_ONLY موقع', z: 'المسعى', g: 'مضاف' });
  const R = [{ id: 'a', zone: 'المسعى', type: 'ازدحام' }, { id: 'b', zone: 'الأبواب', type: 'ازدحام' }, { id: 'c', zone: 'المسعى', type: 'حالة صحية' }];
  const rn = page.rzListRename(o, R, 'zone', 'المسعى', 'TEST_ONLY المسعى');
  assert.equal(rn.n, 2);
  eq(rn.reports.map((x) => x.zone), ['TEST_ONLY المسعى', 'الأبواب', 'TEST_ONLY المسعى']);
  assert.ok(rn.opts.spot.filter((s) => s.z === 'TEST_ONLY المسعى').length === 5 && !rn.opts.spot.some((s) => s.z === 'المسعى'), 'spots follow the renamed zone');
  assert.equal(page.rzKpis(rn.reports, rn.opts).total, 3);
  assert.match(page.rzListRename(o, R, 'type', 'ممنوعات', 'x').err, /أساسية/);
  assert.match(page.rzListRename(o, R, 'type', 'ازدحام', 'حالة صحية').err, /موجود/);
  const del = page.rzListDel(o, 'type', 'ازدحام');
  assert.ok(!del.opts.type.some((x) => x.n === 'ازدحام'));
  eq(R.map((x) => x.type), ['ازدحام', 'ازدحام', 'حالة صحية'], 'deleting from the list keeps recorded values');
  assert.match(page.rzListDel(o, 'party', 'لم يتم الإبلاغ').err, /أساسية/);
  assert.match(page.rzListDel(o, 'act', 'إبلاغ جهة مختصة').err, /أساسية/);
});

test('rasd · التحقّق: الجهةُ لا تُطلب إلا مع «إبلاغ جهة مختصة» · «أخرى» تحتاج نصّاً · وقتُ الوقوع منفصلٌ ولا يكون بعد الآن · الملاحظات 500', () => {
  const { page } = world();
  const base = { zone: 'الأبواب', floor: 'الأرضي', spot: 'باب 1', type: 'ازدحام', act: 'تنظيم حركة', impact: 'متوسط', t: '08:00' };
  const ok = page.rzValidate(base, { isToday: true, nowHM: '09:00' });
  assert.equal(ok.ok, true); assert.equal(ok.rec.party, 'لم يتم الإبلاغ'); assert.equal(ok.rec.t, '08:00');
  const need = page.rzValidate({ ...base, act: 'إبلاغ جهة مختصة' }, { isToday: true, nowHM: '09:00' });
  assert.equal(need.ok, false); assert.equal(need.errs.party, 'اختر الجهة');
  assert.equal(page.rzValidate({ ...base, act: 'إبلاغ جهة مختصة', party: 'العمليات المشتركة' }, { nowHM: '09:00' }).rec.party, 'العمليات المشتركة');
  const other = page.rzValidate({ ...base, type: 'أخرى' }, { nowHM: '09:00' });
  assert.equal(other.errs.type, 'اكتب التفاصيل');
  assert.equal(page.rzValidate({ ...base, type: 'أخرى', typeTx: ' TEST_ONLY وصف ' }, { nowHM: '09:00' }).rec.type, 'أخرى: TEST_ONLY وصف');
  assert.equal(page.rzValidate({ ...base, t: '10:30' }, { isToday: true, nowHM: '09:00' }).errs.t, 'وقت الوقوع لا يكون بعد الآن');
  assert.equal(page.rzValidate({ ...base, t: '10:30' }, { isToday: false, nowHM: '09:00' }).ok, true);
  assert.equal(page.rzValidate({ ...base, t: '25:00' }, { nowHM: '09:00' }).errs.t, 'وقت الوقوع غير صالح');
  assert.equal(page.rzValidate({ ...base, notes: 'x'.repeat(700) }, { nowHM: '09:00' }).rec.notes.length, 500);
  const empty = page.rzValidate({}, { nowHM: '09:00' });
  eq(Object.keys(empty.errs).sort(), ['act', 'floor', 'impact', 'spot', 'type', 'zone']);
});

test('rasd · المؤشراتُ الأربعة · «أخرى: …» تُحسب «أخرى» · الشهرُ الفارغ بأصفار', () => {
  const { page } = world();
  const R = [
    { impact: 'حرج', type: 'ازدحام', act: 'إبلاغ جهة مختصة', party: 'العمليات المشتركة' },
    { impact: 'عالٍ', type: 'ازدحام', act: 'لم يتخذ إجراء بعد', party: 'لم يتم الإبلاغ' },
    { impact: 'منخفض', type: 'أخرى: TEST_ONLY', act: 'تنظيم حركة', party: 'لم يتم الإبلاغ' },
  ];
  const K = page.rzKpis(R, page.rzSeedOpts());
  assert.equal(K.total, 3); assert.equal(K.hot, 2); assert.equal(K.acted, 2); assert.equal(K.reported, 1);
  eq(K.topType, { label: 'ازدحام', n: 2, color: K.type[0].color });
  assert.ok(K.type.some((x) => x.label === 'أخرى' && x.n === 1));
  const cards = page._rzKpiCards(K);
  eq(cards.map((c) => c.title), ['مستوى التأثير', 'نوع الحالة', 'الإجراء المتخذ', 'الإبلاغ']);
  eq(cards.map((c) => c.val), ['3', '2', '2', '1']);
  const Z = page._rzKpiCards(page.rzKpis([], page.rzSeedOpts()));
  eq(Z.map((c) => c.val), ['0', '0', '0', '0']);
  assert.ok(Z[1].rows.length === 4 && Z[1].rows.every((r) => r.n === '0'), 'an empty month shows the cards with zeros');
});

test('rasd · الحفظ: السجلُّ بمفاتيح Production نفسِها في bassam_rasd_v1 · الجهةُ تظهر مع «إبلاغ جهة مختصة» وحدها · الموقعُ مصفّىً بالمنطقة · «ممنوعات» عبر الناقل', () => {
  const W = world({ seized: true }), p = W.page;
  let v = p.renderVals();
  assert.equal(v.rzOnRecords, true); assert.equal(v.rzOnDash, false);
  const field = (vv, k) => vv.rzFields.find((f) => f.k === k);
  assert.equal(field(v, 'party').show, false, 'party hidden until «إبلاغ جهة مختصة»');
  p.setState({ rzDraft: { ...p.emptyDraft(), zone: 'المسعى', floor: 'الأرضي', spot: 'باب 1', type: 'ممنوعات', act: 'إبلاغ جهة مختصة', party: 'العمليات المشتركة', impact: 'حرج', t: '00:01', notes: ' TEST_ONLY ملاحظة ' } });
  v = p.renderVals();
  assert.equal(field(v, 'party').show, true);
  assert.ok(!field(v, 'party').rows.some((r) => r.name === 'لم يتم الإبلاغ'), '«لم يتم الإبلاغ» is not offered in the list');
  assert.ok(v.rzSpotRows.every((r) => /المسعى/.test(r.meta)), 'the detailed location is filtered by the zone');
  assert.equal(v.rzSzNote, true);
  /* اختيارُ منطقةٍ لا يقع فيها الموقع يمسحه · اختيارُ إجراءٍ غير الإبلاغ يمسح الجهة */
  field(v, 'zone').rows.find((r) => r.name === 'الأبواب').pick();
  assert.equal(p.state.rzDraft.spot, 'باب 1');
  p.setState({ rzDraft: { ...p.state.rzDraft, zone: 'المسعى', spot: 'ممر الصفا', spotQ: 'ممر الصفا' } });
  p.renderVals().rzFields.find((f) => f.k === 'zone').rows.find((r) => r.name === 'الأبواب').pick();
  assert.equal(p.state.rzDraft.spot, '');
  p.setState({ rzDraft: { ...p.state.rzDraft, spot: 'باب 1', spotQ: 'باب 1' } });
  p.renderVals().rzSave();
  const doc = J(W.store.get('bassam_rasd_v1'));
  assert.equal(doc.reports.length, 1);
  const r = doc.reports[0];
  eq(Object.keys(r), ['id', 'y', 'm', 'd', 't', 'lt', 'by', 'byName', 'dept', 'zone', 'floor', 'spot', 'type', 'impact', 'act', 'party', 'notes', 'att']);
  assert.match(r.id, /^z[0-9a-z]+$/);
  assert.equal(r.t, '00:01'); assert.match(r.lt, /^\d\d:\d\d$/);
  assert.equal(r.by, 'TEST_ONLY_u1'); assert.equal(r.byName, 'TEST_ONLY راصد'); assert.equal(r.dept, 'TEST_ONLY إدارة أ');
  assert.equal(r.party, 'العمليات المشتركة'); assert.equal(r.notes, 'TEST_ONLY ملاحظة'); assert.equal(r.att, null);
  assert.match(W.acks.join(' '), /تنبيهٌ فوري لمدير الإدارة/);
  /* بغياب المضبوطات أو إطفائها: لا تنبيه «ممنوعات» */
  const W2 = world({ seized: undefined });
  W2.page.setState({ rzDraft: { ...W2.page.emptyDraft(), type: 'ممنوعات' } });
  assert.equal(W2.page.renderVals().rzSzNote, false);
});

test('rasd · الصلاحيات في الواجهة: بلا «add» لا محضر · بلا صلاحية كتابة لا تُكتب القوائم · بلا «approve» لا يُفتح المقفل · لوحةُ «مؤشرات الإدارة» (solo)', () => {
  const W = world(), p = W.page;
  W.perm.delete('add'); W.perm.delete('edit'); W.perm.delete('del'); W.perm.delete('approve');
  const v = p.renderVals();
  assert.equal(v.rzEntryShow, false); assert.equal(v.irPmReadOnly, true);
  assert.equal(p.saveRzOpts({}), false); eq(W.writes, []);
  assert.match(W.toasts.join(' '), /لا تشمل هذا الإجراء/);
  /* شهرٌ منقضٍ: النقرةُ المزدوجة بلا approve لا تفتحه */
  const past = v.rzMonths.find((m) => /انقضى/.test(m.tip));
  if (past) { past.dbl({}); eq(p.state.rzOpenMonths, {}); }
  const D = new (Object.getPrototypeOf(p).constructor)({ solo: 'dash' });
  D.bsToast = () => {};
  const dv = D.renderVals();
  assert.equal(dv.rzOnDash, true); assert.equal(dv.rzOnRecords, false);
  assert.equal(dv.irDashGauges.length, 3);
  eq(dv.irDashGauges.map((g) => g.name), ['عالية/حرجة', 'اتُّخذ فيها إجراء', 'أُبلغت فيها جهة مختصة']);
  assert.equal(dv.irEmptyShow, true);
});
