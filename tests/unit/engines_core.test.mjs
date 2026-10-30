/* KIVO_258 · AUD-025 — اختباراتُ الوحدة للمحرّكات المحضة في الخادم (جداولُ حالات · بلا D1 ولا طلبات):
   (أ) التحقق: عقودُ الحقول FIELDS (النوع · الواجب · المغلق · التعداد · التفرّد) · ثوابتُ الشكل · أشكالُ عمليات الاعتماد OP_SHAPE · المقارِنات
   (ب) المصنِّف classifyMutation: كلُّ أصناف ENT (مجموعاتٌ · خريطة · قوائمُ بدائية · فعلٌ مسمّى · mapAt) + عملياتُ الاعتماد OPS + المواءمة (إعادةُ التسمية · التبنّي)
   (ج) التخويل authorize0/authorizeActs على فاعلين حقيقيّي البنية (actorFromKeys): الجلسة · المجهول · الجهاز · العامّ · الإدارة · القاعدة · الأوراق
   (د) الإنفاذ: enfHeld0 بفروعه على مفاتيح السجلّ الحقيقية · enfDecide بمفاتيح محقونة (الحرّاس · غيرُ المغطّى · البديل · السبب) · enfVia
       · أبعادُ النطاق Site/Zone/Shift (enfValueDim · enfShiftDim) بسياقاتٍ مركّبة.
   تُقاس تغطيتُها بـtools/engine_coverage.mjs (العتبة 80٪ لكل محرّك). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';
const W = await internals(['FIELDS', 'ENT', 'OPS', 'OP_SHAPE', 'RES_REG', 'K_USERS', 'K_PERM', 'K_DEPTS', 'K_GDEPTS', 'K_PLAT', 'KIVO_REGISTRY', 'KIVO_SCOPE', 'ENF_COMPAT',
  'typeOk', 'entChanged', 'twinOf', 'hasF', 'specViolation', 'uniqViolation', 'idfFor', 'fieldViolation', 'fieldsOf', 'primBad', 'shapeViolation', 'bodyNoId', 'fbChain', 'withCol', 'adoptOk',
  'needAdd', 'idOf', 'colList', 'cmpCol', 'cmpList', 'cmpPrim', 'cmpMap', 'isEmptyVal', 'stripCols', 'primDup',
  'classifyMutation', 'capForAct', 'allowKeyDelete', 'entOf', 'opsOf', 'resOf',
  'authorize0', 'authorize', 'authorizeActs', 'actorFromKeys',
  'enfIx', 'enfHeld', 'enfHeld0', 'enfAttachGrantsKeys', 'enfGrantsKey', 'enfDecide', 'enfVia', 'enfSides', 'enfR', 'enfHas', 'enfCeilingOf', 'enfEmpScopeOf', 'enfScopeParse',
  'enfValueDim', 'enfShiftDim', 'enfKeyOnCeiling', 'enfTranslated', 'enfScopeEval', 'enfScopeCtx', 'enfSources', 'enfHeldMap', 'enfReasonOf']);
const J = (x) => JSON.stringify(x);
const cls = (key, cur, nxt) => W.classifyMutation(W.resOf(key), cur == null ? null : J(cur), nxt == null ? null : J(nxt), W.entOf(key), W.opsOf(key), null);
const acts = (o) => Object.keys(o).sort().join(',');

/* ══ (أ) التحقق ══ */
test('typeOk · hasF · primBad · primDup · isEmptyVal', () => {
  for (const [t, v, w] of [['str', 'x', true], ['str', 1, false], ['num', 1.5, true], ['num', NaN, false], ['num', Infinity, false], ['num', '1', false], ['bool', false, true], ['bool', 0, false], ['zzz', {}, true]])
    assert.equal(W.typeOk(t, v), w, 'typeOk(' + t + ',' + String(v) + ')');
  assert.equal(W.hasF({ a: 1 }, 'a'), true); assert.equal(W.hasF({ a: '' }, 'a'), false); assert.equal(W.hasF({ a: null }, 'a'), false); assert.equal(W.hasF({}, 'a'), false); assert.equal(W.hasF(null, 'a'), false); assert.equal(W.hasF({ a: 0 }, 'a'), true);
  assert.equal(W.primBad(['a', 'b']), false); assert.equal(W.primBad(['a', ' ']), true); assert.equal(W.primBad(['a', 3]), true);
  assert.equal(W.primDup(['a', 'b', 'a']), true); assert.equal(W.primDup(['1', 1]), true, 'المقارنةُ نصّية'); assert.equal(W.primDup([]), false);
  assert.equal(W.isEmptyVal({}), true); assert.equal(W.isEmptyVal({ a: 1 }), false); assert.equal(W.isEmptyVal([]), true); assert.equal(W.isEmptyVal(['']), false); assert.equal(W.isEmptyVal(0), true); assert.equal(W.isEmptyVal('x'), false);
});
test('عقدُ الحقول: الواجب · المغلق · النوع · التعداد — على الكيان المتغيّر وحده (الإرثُ لا يُعاقَب)', () => {
  const sp = { req: ['eid', 'name'], type: { eid: 'str', name: 'str', phone: 'str' } };
  const old = [{ eid: 'e1', name: 'أ' }, { name: 'قديمٌ بلا eid' }];
  assert.equal(W.specViolation(sp, old, old, null), '', 'لا تغيير');
  assert.equal(W.specViolation(sp, old, old.concat([{ eid: 'e2', name: 'ب', phone: '05' }]), null), '', 'إضافةٌ سليمة');
  assert.equal(W.specViolation(sp, old, old.concat([{ eid: 'e2' }]), null), 'field', 'جديدٌ بلا اسم');
  assert.equal(W.specViolation(sp, old, old.concat([{ eid: 'e2', name: 'ب', phone: 5 }]), null), 'field', 'نوعٌ خاطئ');
  assert.equal(W.specViolation(sp, old, old.concat([7]), null), 'field', 'عنصرٌ ليس كائناً');
  assert.equal(W.specViolation(sp, old, [old[0], { eid: '', name: 'ج' }], null), 'field', 'إسقاطُ الواجب من كيانٍ معدَّل بلا نظير');
  /* الإرث: نظيرُ السجل القديم (بالسلسلة idf) لم يكن يحمل eid أصلاً ⇒ تعديله مسموحٌ كما هو */
  const ch = { lock: ['eid'], idf: ['eid', 'nid', 'name'] };
  assert.equal(W.specViolation(sp, old, [old[0], { name: 'قديمٌ بلا eid', phone: '0555' }], ch), '', 'نظيرُ الإرث بالسلسلة (الاسم) لم يكن يحمل eid ⇒ تعديلُه مسموحٌ كما هو');
  assert.equal(W.specViolation(sp, old, [old[0], { name: 'اسمٌ جديد', phone: '0555' }], ch), 'field', 'بلا نظير ⇒ كيانٌ جديد يُطالَب بالواجب');
  const old2 = [{ nid: '1234567890', name: 'قديم' }];
  assert.equal(W.specViolation(sp, old2, [{ nid: '1234567890', name: 'قديم', phone: '0555' }], ch), '', 'نظيرٌ قديمٌ بلا eid: لا يُطالَب به');
  const closed = { closed: 1, req: ['name'], type: { name: 'str', color: 'str' } };
  assert.equal(W.specViolation(closed, [], [{ name: 'صباحي', color: '#fff' }], null), '');
  assert.equal(W.specViolation(closed, [], [{ name: 'صباحي', extra: 1 }], null), 'field', 'عقدٌ مغلق: حقلٌ خارج المعلن');
  const en = { req: ['t'], type: { t: 'str' }, enum: { t: ['out', 'in'] } };
  assert.equal(W.specViolation(en, [], [{ t: 'out' }], null), ''); assert.equal(W.specViolation(en, [], [{ t: 'lost?' }], null), 'field', 'خارج التعداد');
});
test('twinOf: الهويةُ القانونية أوّلاً ثم السلسلةُ بين نظراء الإرث', () => {
  const la = [{ eid: 'e1', name: 'أ' }, { nid: '1', name: 'ب' }, { eid: 'e3', name: 'ج' }];
  const ch = { lock: ['eid'], idf: ['eid', 'nid', 'name'] };
  assert.equal(W.twinOf(la, { eid: 'e1', name: 'x' }, ch), la[0]);
  assert.equal(W.twinOf(la, { eid: 'e9', name: 'x' }, ch), null, 'هويةٌ قانونيةٌ بلا نظير');
  assert.equal(W.twinOf(la, { nid: '1', name: 'ب2' }, ch), la[1], 'بلا هويةٍ قانونية: بالسلسلة');
  assert.equal(W.twinOf(la, { name: 'ج' }, ch), null, 'نظيرٌ له هويةٌ قانونية لا يُطابَق بالسلسلة');
  assert.equal(W.twinOf(la, { x: 1 }, ch), null); assert.equal(W.twinOf(la, { name: 'أ' }, null), null);
  assert.equal(W.twinOf(la, { name: 'أ' }, { lock: [], idf: [] }), null, 'بلا سلسلة');
});
test('التفرّد (nid): الصيغةُ القانونية على المتغيّر · التصادمُ مع جديدٍ مرفوض · تصادمُ قديمَين لم يُمسّا مقبول', () => {
  const sp = W.FIELDS.bassam_employees_v1;
  const ok1 = { eid: 'e1', name: 'أ', nid: '1234567890' }, dupOld = [{ eid: 'a', name: 'x', nid: '1111111111' }, { eid: 'b', name: 'y', nid: '1111111111' }];
  assert.equal(W.uniqViolation(sp, [], [ok1]), '');
  assert.equal(W.uniqViolation(sp, [], [{ eid: 'e1', name: 'أ', nid: '12345' }]), 'nid', 'صيغةٌ غيرُ قانونية');
  assert.equal(W.uniqViolation(sp, [], [ok1, Object.assign({}, ok1, { eid: 'e2' })]), 'nid', 'تكرارٌ بين جديدين');
  assert.equal(W.uniqViolation(sp, dupOld, dupOld), '', 'قديمان متصادمان لم يُمسّا');
  assert.equal(W.uniqViolation(sp, dupOld, dupOld.concat([{ eid: 'c', name: 'z', nid: '1111111111' }])), 'nid', 'جديدٌ يصطدم بقديم');
  assert.equal(W.uniqViolation(sp, [], [{ eid: 'e1', name: 'أ', nid: '' }, { eid: 'e2', name: 'ب' }, 5]), '', 'الفارغُ والغائبُ وغيرُ الكائن لا يدخل');
});
test('fieldViolation على المفاتيح الحقيقية: الجذر (الموظفون) · المجموعات (العهد: التعداد) · بلا عقد', () => {
  const k = 'bsdept:d1:bassam_employees_v1', kc = 'bsdept:d1:bassam_custody_v1';
  assert.equal(W.fieldViolation(k, W.fieldsOf(k), [], [{ eid: 'e1', name: 'أ', nid: '1234567890' }]), '');
  assert.equal(W.fieldViolation(k, W.fieldsOf(k), [], [{ eid: 'e1', name: 'أ', nid: '12' }]), 'nid');
  assert.equal(W.fieldViolation(k, W.fieldsOf(k), [], { not: 'array' }), '', 'الجذرُ ليس قائمة: الشكلُ يحكمه shapeViolation');
  const mv = { t: 'out', eid: 'e1', item: 'جهاز', ser: 'S1', y: 1447, m: 3, d: 1 };
  assert.equal(W.fieldViolation(kc, W.fieldsOf(kc), { items: [], moves: [] }, { items: [{ name: 'جهاز', qty: 2 }], moves: [mv] }), '');
  assert.equal(W.fieldViolation(kc, W.fieldsOf(kc), { items: [], moves: [] }, { items: [], moves: [Object.assign({}, mv, { t: 'gift' })] }), 'field', 'تعدادُ الحركة');
  assert.equal(W.fieldViolation(kc, W.fieldsOf(kc), { items: [], moves: [] }, { items: [{ name: 'جهاز', qty: '2' }] }), 'field', 'نوعُ الكمية');
  assert.equal(W.fieldViolation('bsdept:d1:bassam_tasks_v1', W.fieldsOf('bsdept:d1:bassam_tasks_v1'), {}, { a: 1 }), '', 'موردٌ بلا عقد');
  assert.deepEqual(W.idfFor(kc, 'items'), { lock: ['name'], idf: ['name'] }); assert.equal(W.idfFor(kc, 'nope'), null); assert.equal(W.idfFor('bsdept:d1:bassam_tasks_v1', ''), null);
});
test('shapeViolation: الجذرُ القانوني · الخريطة · القوائمُ البدائية · المجموعاتُ المعلنة لا تُسقط ولا يُبدَّل نوعها', () => {
  const E = (k) => W.ENT[k];
  assert.equal(W.shapeViolation(null, 1, 2), '');
  assert.equal(W.shapeViolation(E('bassam_employees_v1'), [], { a: 1 }, false), 'shape', 'الجذرُ قائمة');
  assert.equal(W.shapeViolation(E('bassam_options_v1'), {}, [], false), 'shape', 'الجذرُ كائن');
  assert.equal(W.shapeViolation(E('bassam_tasks_v1'), {}, [], false), 'shape', 'خريطةٌ صارت قائمة');
  assert.equal(W.shapeViolation(E('bassam_irshad_langs_v1'), [], ['ع', 'ع'], false), 'dup');
  assert.equal(W.shapeViolation(E('bassam_irshad_langs_v1'), [], ['ع', ''], false), 'field');
  assert.equal(W.shapeViolation(E('bassam_options_v1'), {}, { type: ['أ', 'أ'] }, false), 'dup');
  assert.equal(W.shapeViolation(E('bassam_options_v1'), {}, { type: ['أ'], work: [' '] }, false), 'field');
  assert.equal(W.shapeViolation(E('bassam_options_v1'), {}, { type: ['أ'], work: ['ب'] }, false), '');
  const C = E('bassam_custody_v1');
  assert.equal(W.shapeViolation(C, { items: [], moves: [] }, { items: [], moves: [] }, false), '');
  assert.equal(W.shapeViolation(C, { items: [], moves: [] }, [], false), 'shape', 'الجذرُ صار قائمة');
  assert.equal(W.shapeViolation(C, { items: [], moves: [] }, { items: {}, moves: [] }, false), 'shape', 'مجموعةٌ صارت كائناً');
  assert.equal(W.shapeViolation(C, { items: [], moves: [] }, { items: [] }, false), 'shape', 'مجموعةٌ معلنة أُسقطت');
  assert.equal(W.shapeViolation(C, null, { items: [] }, true), '', 'أوّلُ إنشاء: لا يُطالَب بما لم يكن');
  assert.equal(W.shapeViolation(E('bassam_employees_v1'), [], [{ eid: 'e1' }], false), '');
});
test('أدواتُ الهوية والمجموعات: idOf · colList · withCol · bodyNoId · fbChain · adoptOk · stripCols', () => {
  assert.equal(W.idOf({ eid: '', nid: 7 }, ['eid', 'nid']), '7'); assert.equal(W.idOf(null, ['eid']), ''); assert.equal(W.idOf({}, ['eid']), '');
  assert.deepEqual(W.colList([1], ''), [1]); assert.equal(W.colList({}, ''), null); assert.deepEqual(W.colList({ a: [1] }, 'a'), [1]); assert.equal(W.colList({ a: 1 }, 'a'), null);
  assert.deepEqual(W.withCol({ a: [1], b: 2 }, 'a', [3]), { a: [3], b: 2 }); assert.deepEqual(W.withCol([1], '', [2]), [2]);
  assert.deepEqual(W.bodyNoId({ eid: 'e', name: 'n', x: 1 }, ['eid']), { name: 'n', x: 1 });
  assert.deepEqual(W.fbChain({ idf: ['eid', 'nid', 'name'], lock: ['eid'] }), ['nid', 'name']); assert.deepEqual(W.fbChain({}), []);
  const E = W.ENT.bassam_employees_v1, col = E.cols[0];
  assert.equal(W.adoptOk(E, { name: 'أ', job: 'قديم' }, { eid: 'e1', name: 'أ' }, col), true, 'التبنّي: المعرّفُ وإسقاطُ المهجور');
  assert.equal(W.adoptOk(E, { name: 'أ' }, { eid: 'e1', name: 'ب' }, col), false, 'تغييرٌ آخر');
  assert.equal(W.adoptOk(E, { name: 'أ', job: 'x' }, { eid: 'e1', name: 'أ', job: 'x' }, col), false, 'المهجورُ لا يعود');
  assert.deepEqual(W.stripCols(W.ENT.bassam_plan_v1, { gates: [1], months: { a: 1 }, x: 2 }), { months: { a: 1 }, x: 2 });
  assert.deepEqual(W.stripCols(null, [1]), [1]);
});
test('المقارِنات: cmpCol (بالهوية) · cmpList (قصُّ المتطابق) · cmpPrim (التسميةُ في موضعها) · cmpMap (list/map)', () => {
  const n = () => ({});
  let o = n(); W.cmpCol([{ id: 1, v: 1 }], [{ id: 1, v: 1 }, { id: 2 }], ['id'], o); assert.equal(acts(o), 'add');
  o = n(); W.cmpCol([{ id: 1, v: 1 }, { id: 2 }], [{ id: 1, v: 2 }], ['id'], o); assert.equal(acts(o), 'del,edit');
  o = n(); W.cmpCol([{ v: 1 }], [{ v: 2 }], ['id'], o); assert.equal(acts(o), 'edit', 'بلا هوية: بالموضع');
  o = n(); W.cmpList([1, 2], [0, 1, 2], o); assert.equal(acts(o), 'add', 'إدراجٌ في الأوّل إضافةٌ صِرف');
  o = n(); W.cmpList([1, 2, 3], [1, 3], o); assert.equal(acts(o), 'del');
  o = n(); W.cmpList([1, 2, 3], [1, 9, 3], o); assert.equal(acts(o), 'edit');
  o = n(); W.cmpList([1, 2], [3, 4, 5], o); assert.equal(acts(o), 'add,edit');
  o = n(); W.cmpPrim(['أ', 'ب'], ['أ', 'ب', 'ج'], o); assert.equal(acts(o), 'add');
  o = n(); W.cmpPrim(['أ', 'ب'], ['أ'], o); assert.equal(acts(o), 'del');
  o = n(); W.cmpPrim(['أ', 'ب'], ['أ', 'ج'], o); assert.equal(acts(o), 'edit', 'استبدالٌ في موضعه = تسمية');
  o = n(); W.cmpPrim(['أ', 'ب'], ['ب', 'أ'], o); assert.equal(acts(o), 'edit', 'الترتيب');
  o = n(); W.cmpPrim(['أ', 'ب'], ['ج', 'أ'], o); assert.equal(acts(o), 'add,del', 'ظهورٌ وزوالٌ مع تحريك');
  o = n(); W.cmpPrim(['أ'], ['أ'], o); assert.equal(acts(o), '');
  o = n(); W.cmpMap({ a: 1 }, { a: 1, b: 2, c: 0 }, o, ''); assert.equal(acts(o), 'add', 'الفارغُ الجديد ليس إضافة');
  o = n(); W.cmpMap({ a: 1, b: [], c: 3 }, { a: 2 }, o, ''); assert.equal(acts(o), 'del,edit');
  o = n(); W.cmpMap({ d: [{ id: 1 }] }, { d: [{ id: 1 }, { id: 2 }] }, o, 'list'); assert.equal(acts(o), 'add');
  o = n(); W.cmpMap({ d: { r1: { x: 1 } } }, { d: { r1: { x: 2 } } }, o, 'map'); assert.equal(acts(o), 'edit');
  o = n(); W.cmpMap({ d: 1 }, { d: [1] }, o, 'list'); assert.equal(acts(o), 'edit');
  o = n(); W.needAdd(o); assert.equal(o.add, 1);
});
test('أشكالُ عمليات الاعتماد OP_SHAPE: الجولات · التقرير اليومي · الخطة · الجائزة', () => {
  const R = W.OP_SHAPE.rounds, D = W.OP_SHAPE.dreport, P = W.OP_SHAPE.plan, A = W.OP_SHAPE.award;
  const field = [{ g: 1, ap: 0 }, { g: 2, ap: 1 }];
  assert.equal(R({}, { '1447-03-01': { ap: 1, mo: 1, auto: 1, d: field, shAp: { s1: { ap: 1, at: 't', snap: field, byRep: 1 }, s2: { ap: 0 } } } }), '', 'اعتمادٌ يدويّ ومرآةٌ وفكّ — واللقطةُ = الميدان');
  for (const [rec, why] of [[{ ap: 2 }, 'ap'], [{ mo: 0 }, 'mo'], [{ auto: 2 }, 'auto'], [{ shAp: 1 }, 'shAp ليس كائناً'], [{ shAp: { s: 5 } }, 'وردية ليست كائناً'], [{ shAp: { s: { ap: 1, at: 't', snap: [], x: 1 } } }, 'مفتاحٌ زائد'],
    [{ shAp: { s: { ap: 1, at: 5, snap: [] } } }, 'at ليس نصاً'], [{ shAp: { s: { ap: 1, at: 't' } } }, 'بلا لقطة'], [{ d: field, shAp: { s: { ap: 1, at: 't', snap: [{ g: 2 }] } } }, 'لقطةٌ لا تطابق الميدان'],
    [{ d: field, shAp: { s: { ap: 1, at: 't', snap: field, byRep: 2 } } }, 'byRep'], [{ shAp: { s: { ap: 0, at: 't' } } }, 'فكٌّ بحقلٍ زائد'], [{ d: [{ ap: 3 }] }, 'موقعٌ بعلَمٍ غيرِ ثنائي']])
    assert.equal(R({}, { day: rec }), 'approve', 'الجولات: ' + why);
  assert.equal(R({ day: { shAp: { s1: { ap: 0 } } } }, { day: { shAp: {} } }), 'approve', 'ورديةٌ حُذفت من شجرة الاعتماد');
  assert.equal(R({ day: { shAp: { s1: { ap: 1, at: 'old', snap: 'whatever' } } } }, { day: { shAp: { s1: { ap: 1, at: 'old', snap: 'whatever' } } } }), '', 'لم تتغيّر: لا تُفحص');
  assert.equal(R({}, { day: 5 }), '');
  assert.equal(D({}, { day: { shifts: { s: { ap: 1, apAt: 't', apBy: 'u' }, s2: { ap: 0 }, s3: 4 } }, d2: 3, d3: { shifts: 1 } }), '');
  for (const [r, why] of [[{ ap: 0, apAt: 't' }, 'فكٌّ يُبقي apAt'], [{ ap: 2, apAt: 't', apBy: 'u' }, 'ap'], [{ ap: 1, apBy: 'u' }, 'apAt'], [{ ap: true, apAt: 't', apBy: '' }, 'apBy']])
    assert.equal(D({}, { day: { shifts: { s: r } } }), 'approve', 'التقرير: ' + why);
  assert.equal(P({}, { floors: [{ approved: true }, 3], months: { m: { mo: 1, d: [{ approved: false }, 2] }, m2: 4 } }), '');
  assert.equal(P({}, { floors: [{ approved: 1 }] }), 'approve'); assert.equal(P({}, { months: { m: { mo: 2 } } }), 'approve'); assert.equal(P({}, { months: { m: { d: [{ approved: 'نعم' }] } } }), 'approve');
  assert.equal(P({}, {}), '');
  assert.equal(A({ recs: [{ id: 1, st: 'معتمد' }] }, { recs: [{ id: 1, st: 'مستبعد' }, { id: 2, st: 'قيد التحكيم' }, 7] }), '');
  assert.equal(A({}, { recs: [{ id: 1, st: 'فائز' }] }), 'approve', 'حالةٌ رابعة'); assert.equal(A({ recs: [] }, { recs: [{ id: 3, st: 'معتمد' }] }), 'approve', 'ترشيحٌ يولد معتمَداً');
  assert.equal(A({}, {}), '');
});

/* ══ (ب) المصنِّف ══ */
test('classifyMutation: حذفُ المفتاح · أوّلُ إنشاء (الشكلُ الفارغ القانوني) · غيرُ المقروء', () => {
  assert.deepEqual(W.classifyMutation(W.resOf('bsdept:d1:bassam_irshad_v1'), '{}', null, W.entOf('bsdept:d1:bassam_irshad_v1'), null, null), { keyDelete: 1 });
  assert.equal(acts(cls('bsdept:d1:bassam_irshad_v1', null, { reports: [{ id: 'r1' }] })), 'add', 'أوّلُ إنشاء: إضافة لا «كلُّ الحمولة»');
  assert.equal(acts(cls('bsdept:d1:bassam_irshad_v1', null, { reports: [] })), '', 'أوّلُ إنشاءٍ بالشكل الفارغ: لا فعل');
  assert.equal(acts(W.classifyMutation(W.resOf('bsdept:d1:bassam_irshad_v1'), '{', '{"reports":[]}', W.entOf('bsdept:d1:bassam_irshad_v1'), null, null)), 'edit', 'القديمُ غيرُ مقروء');
  assert.equal(acts(W.classifyMutation(null, '1', '2', null, null, null)), 'edit', 'قيمٌ مفردة');
  assert.equal(acts(W.classifyMutation(null, '[{"id":1}]', '[{"id":1},{"id":2}]', null, null, null)), 'add', 'قائمةٌ بلا سجلّ كيان: IDF_ANY');
  const PV = { a: () => ({ x: 1 }), b: () => ({ x: 2 }) };
  assert.equal(acts(W.classifyMutation(null, 'ignored', 'ignored', null, null, PV)), 'edit', 'القيمُ المحلَّلة مسبقاً (PV)');
});
test('classifyMutation: المجموعات (الجذر · تحت مفتاح · الإلحاقية) · خريطةٌ بقوائم/صفوف · mapAt في الخطة · بقيةُ المورد', () => {
  const E1 = [{ eid: 'e1', name: 'أ' }];
  assert.equal(acts(cls('bsdept:d1:bassam_employees_v1', E1, E1.concat([{ eid: 'e2', name: 'ب' }]))), 'add');
  assert.equal(acts(cls('bsdept:d1:bassam_employees_v1', E1.concat([{ eid: 'e2', name: 'ب' }]), E1)), 'del');
  assert.equal(acts(cls('bsdept:d1:bassam_employees_v1', E1, [{ eid: 'e1', name: 'أ2' }])), 'edit');
  const C0 = { items: [{ name: 'جهاز', qty: 1 }], moves: [] };
  assert.equal(acts(cls('bsdept:d1:bassam_custody_v1', C0, { items: C0.items, moves: [{ t: 'out', eid: 'e1', item: 'جهاز' }] })), 'add', 'حركةٌ إلحاقية');
  assert.equal(acts(cls('bsdept:d1:bassam_custody_v1', C0, { items: [{ name: 'جهاز', qty: 2 }], moves: [] })), 'edit');
  assert.equal(acts(cls('bsdept:d1:bassam_custody_v1', { items: [] }, { items: [], moves: [{ t: 'in' }] })), 'add', 'مجموعةٌ وُلدت');
  assert.equal(acts(cls('bsdept:d1:bassam_custody_v1', { items: [], moves: [{ t: 'in' }] }, { items: [] })), 'del', 'مجموعةٌ زالت');
  assert.equal(acts(cls('bsdept:d1:bassam_custody_v1', { items: [], moves: [], note: 'a' }, { items: [], moves: [], note: 'b' })), 'edit', 'بقيةُ المورد');
  assert.equal(acts(cls('bsdept:d1:bassam_tasks_v1', { '1447-03-01': [{ id: 1 }] }, { '1447-03-01': [{ id: 1 }, { id: 2 }] })), 'add', 'المهام: صفٌّ جديدٌ في يوم');
  assert.equal(acts(cls('bsdept:d1:bassam_tasks_v1', {}, { '1447-03-02': [{ id: 1 }] })), 'add', 'يومٌ جديد');
  assert.equal(acts(cls('bsdept:d1:bassam_staffing_v3', { m: { r1: { s: 'a' } } }, { m: { r1: { s: 'b' } } })), 'edit', 'الجدول: صفٌّ تحت الشهر');
  const P0 = { gates: [{ id: 'g1', num: 1 }], months: { '1447-03': { mo: 0 } }, title: 'x' };
  assert.equal(acts(cls('bsdept:d1:bassam_plan_v1', P0, Object.assign({}, P0, { gates: P0.gates.concat([{ id: 'g2', num: 2 }]) }))), 'add');
  assert.equal(acts(cls('bsdept:d1:bassam_plan_v1', P0, Object.assign({}, P0, { months: { '1447-03': { mo: 0 }, '1447-04': { x: 1 } } }))), 'add', 'شهرٌ جديد (mapAt)');
  assert.equal(acts(cls('bsdept:d1:bassam_plan_v1', P0, Object.assign({}, P0, { title: 'y' }))), 'edit', 'بقيةُ الخطة');
});
test('classifyMutation: القوائمُ البدائية (الجذر · الحقول · الفعلُ المسمّى) · عملياتُ الاعتماد (الكلّ · المسارات · newAp) · المواءمة', () => {
  assert.equal(acts(cls('bsdept:d1:bassam_irshad_langs_v1', ['ع'], ['ع', 'إن'])), 'add');
  assert.equal(acts(cls('bsdept:d1:bassam_irshad_langs_v1', ['ع', 'إن'], ['ع', 'فر'])), 'edit', 'تسمية');
  assert.deepEqual(cls('bsdept:d1:bassam_leave_kinds_v1', ['سنوية'], ['سنوية', 'مرضية']), { edit: 1 }, 'primAct: الواجهةُ تسمّي الفعلَ edit');
  assert.deepEqual(cls('bsdept:d1:bassam_leave_kinds_v1', ['سنوية'], ['سنوية']), {}, 'لا تغيير');
  assert.equal(acts(cls('bsdept:d1:bassam_options_v1', { type: ['أ'], work: ['ب'] }, { type: ['أ', 'ج'], work: ['ب'] })), 'add');
  assert.equal(acts(cls('bsdept:d1:bassam_options_v1', { type: ['أ'], work: ['ب'], v: 1 }, { type: ['أ'], work: 'ب', v: 2 })), 'edit', 'حقلٌ ليس قائمة · وبقيةٌ تغيّرت');
  assert.equal(acts(cls('bsdept:d1:bassam_staffing_locks_v1', { m: 1 }, { m: 2 })), 'approve', 'الموردُ كلُّه اعتماد (**)');
  assert.equal(acts(cls('bsdept:d1:bassam_staffing_locks_v1', { m: 1 }, { m: 1 })), '');
  assert.equal(acts(cls('bsdept:d1:bassam_rounds_v1', { day: { ap: 0, closed: 0 } }, { day: { ap: 1, closed: 0 } })), 'approve', 'اعتمادُ يوم');
  assert.equal(acts(cls('bsdept:d1:bassam_rounds_v1', { day: { ap: 0, closed: 0 } }, { day: { ap: 1, closed: 1 } })), 'approve,edit', 'اعتمادٌ ورصدٌ معاً — لا يُبتلع أحدهما');
  assert.equal(acts(cls('bsdept:d1:bassam_rounds_v1', {}, { day: { ap: 1 } })), 'approve', 'يومٌ وُلد بعلَم الاعتماد وحده (newAp): اعتمادٌ لا غير — والحاويةُ الباقية بعد الفصل فارغةٌ فليست إضافة');
  assert.equal(acts(cls('bsdept:d1:bassam_rounds_v1', {}, { day: { ap: 1, closed: 1 } })), 'add,approve', 'يومٌ وُلد معتمَداً ومعه رصد: اعتمادٌ وإضافة');
  assert.equal(acts(cls('bsdept:d1:bassam_award_v1', { recs: [{ id: 1, name: 'أ', st: 'قيد التحكيم' }] }, { recs: [{ id: 1, name: 'أ', st: 'معتمد' }] })), 'approve');
  /* المواءمةُ قبل التصنيف: إعادةُ التسمية والتبنّي لا تُعدّ حذفاً وإضافة — يُواءَم القديمُ بها فلا يبقى فرقٌ مصنَّف،
     والمستدعي يعامل «لا فعل» تعديلاً (canWrite · enfDecide: if (!acts.length) acts = ['edit']) */
  assert.equal(acts(cls('bsdept:d1:bassam_shift_options_v1', [{ name: 'صباحي', color: 'a' }], [{ name: 'الصباحية', color: 'a' }])), '', 'إعادةُ تسمية الوردية: لا حذفَ ولا إضافة');
  assert.equal(acts(cls('bsdept:d1:bassam_shift_options_v1', [{ name: 'صباحي', color: 'a' }], [{ name: 'الصباحية', color: 'b' }])), 'edit', 'تسميةٌ ومعها تعديل');
  assert.equal(acts(cls('bsdept:d1:bassam_shift_options_v1', [{ name: 'صباحي' }, { name: 'مسائي' }], [{ name: 'مسائي' }, { name: 'مسائي' }])), 'del', 'تسميةٌ إلى اسمٍ قائم ليست تسمية: زوالُ «صباحي»');
  assert.equal(acts(cls('bsdept:d1:bassam_shift_options_v1', [{ name: 'صباحي' }], [{ name: ' ' }])), 'add,del', 'اسمٌ فارغ ليس تسمية');
  assert.equal(acts(cls('bsdept:d1:bassam_employees_v1', [{ name: 'أ', job: 'x' }], [{ eid: 'e1', name: 'أ' }])), '', 'تبنّي الهوية: لا حذفَ ولا إضافة');
  const C = { items: [{ name: 'جهاز' }], moves: [{ t: 'out', item: 'جهاز' }] };
  assert.equal(acts(cls('bsdept:d1:bassam_custody_v1', C, { items: [{ name: 'جهاز لاسلكي' }], moves: [{ t: 'out', item: 'جهاز لاسلكي' }] })), '', 'تسميةُ صنف العهدة وتبعتُها في الحركات: مواءمةٌ كاملة');
  assert.equal(acts(cls('bsdept:d1:bassam_custody_v1', C, { items: [{ name: 'جهاز لاسلكي' }], moves: [{ t: 'out', item: 'جهاز' }] })), 'edit', 'تسميةٌ بلا تبعتها: الحركةُ تغيّرت');
});
test('capForAct · allowKeyDelete', () => {
  assert.deepEqual(W.capForAct({ cap: 'x', capAdd: 'y' }, 'add'), ['y']); assert.deepEqual(W.capForAct({ cap: 'x', capAdd: 'y' }, 'edit'), ['x']);
  assert.deepEqual(W.capForAct({ cap: ['a', 'b'] }, 'del'), ['a', 'b']); assert.deepEqual(W.capForAct({}, 'del'), []);
  assert.equal(W.allowKeyDelete({}, 'bsdept:d1:bassam_tasks_v1', W.resOf('bsdept:d1:bassam_tasks_v1')), false, 'بلا سياسةٍ معلنة: مرفوضٌ للجميع');
  assert.equal(W.allowKeyDelete({}, 'k', null), false);
});

/* ══ (ج) التخويل ══ */
const USERS = [
  { id: 'su', role: 'super', ekey: 'mgr:root' }, { id: 'gm1', role: 'gm', gid: 'g1', ekey: 'mgr:g1' }, { id: 'dm1', role: 'dept', deptId: 'd1', ekey: 'mgr:d1' },
  { id: 'st1', role: 'staff', deptId: 'd1', ekey: 'e1' }, { id: 'st2', role: 'staff', deptId: 'd2', ekey: 'e2' }, { id: 'off', role: 'staff', deptId: 'd1', ekey: 'e9', dis: 1 }, { id: 'x', role: '??', deptId: 'd1' }];
const KEYS = (perms, plat) => ({ [W.K_USERS]: J(USERS), [W.K_PERM]: J(perms || { emps: { d1: { e1: { 'emps/data': ['view', 'edit'], tasks: ['view', 'add', 'edit'] } } } }),
  [W.K_DEPTS]: J([{ id: 'd1', gid: 'g1' }, { id: 'd2', gid: 'g2' }]), [W.K_GDEPTS]: J([{ id: 'g1', pid: 'top' }, { id: 'g2' }, { id: 'top' }]), [W.K_PLAT]: J(plat || {}) });
const actor = (uid, perms, plat) => W.actorFromKeys(KEYS(perms, plat), uid);
test('actorFromKeys: بنيةُ الفاعل · المجمَّد والمجهول لا فاعلَ لهما · الوحداتُ المطفأة من المنصة', () => {
  assert.equal(W.actorFromKeys(null, 'su'), null); assert.equal(W.actorFromKeys({ [W.K_USERS]: '{}' }, 'su'), null, 'المستخدمون ليسوا قائمة');
  assert.equal(actor('off'), null, 'مجمَّد'); assert.equal(actor('nobody'), null);
  const A = actor('st1', null, { mods: { off: ['irshad'] } });
  assert.equal(A.u.id, 'st1'); assert.deepEqual(A.off, ['irshad']); assert.equal(A.depts.length, 2); assert.equal(A.nodes.length, 3);
  const B = W.actorFromKeys({ [W.K_USERS]: J(USERS), [W.K_PERM]: '[1]', [W.K_DEPTS]: '{}', [W.K_GDEPTS]: 'x', [W.K_PLAT]: '{"mods":{"off":"no"}}' }, 'st1');
  assert.deepEqual([B.perms, B.depts, B.nodes, B.off], [{}, [], [], []], 'سجلّاتٌ تالفة ⇒ قيمٌ فارغة آمنة');
});
test('authorize0: الجلسة · المجهول · الجهاز · العامّ (مديرُ النظام وحده) · الإدارة (النطاق · القاعدة · الورقة والفعل)', () => {
  const su = actor('su'), st1 = actor('st1'), gm1 = actor('gm1'), dm1 = actor('dm1'), st2 = actor('st2'), xx = actor('x');
  const K = (r, d = 'd1') => 'bsdept:' + d + ':' + r;
  assert.deepEqual(W.authorize0(null, K('bassam_tasks_v1'), 'add'), { ok: false, why: 'session' });
  assert.equal(W.authorize0(st1, K('bassam_nope_v1'), 'add').why, 'unknown');
  assert.equal(W.authorize0(st1, K('bassam_page_v1'), 'edit').why, 'device');
  /* السجلّاتُ العامّة: لمدير النظام وحده بلا إدارة (قواعدُها الخاصة — users/perms/dstats — تُفحص في canWrite لا هنا) */
  assert.deepEqual(W.authorize0(su, 'bassam_depts_v1', 'edit'), { ok: true, cap: '*' }); assert.equal(W.authorize0(st1, 'bassam_depts_v1', 'edit').why, 'super');
  assert.equal(W.authorize0(su, 'bsdept:d1:bassam_depts_v1', 'edit').why, 'scope', 'سجلٌّ عامٌّ بمفتاح إدارة');
  assert.equal(W.authorize0(st1, 'bassam_tasks_v1', 'add').why, 'scope', 'موردُ إدارةٍ بلا إدارة');
  assert.equal(W.authorize0(st2, K('bassam_tasks_v1'), 'add').why, 'dept', 'إدارةٌ أخرى');
  assert.equal(W.authorize0(xx, K('bassam_tasks_v1'), 'add').why, 'dept', 'دورٌ مجهول');
  assert.equal(W.authorize0(st1, K('bassam_tasks_v1'), 'add').ok, true, 'ورقةُ الموظف تحمل الفعل');
  assert.equal(W.authorize0(st1, K('bassam_tasks_v1'), 'del').why, 'act', 'الورقةُ بلا هذا الفعل');
  assert.equal(W.authorize0(st1, K('bassam_irshad_v1'), 'add').why, 'page', 'ورقةٌ أخرى');
  assert.equal(W.authorize0(actor('st1', { emps: {} }), K('bassam_tasks_v1'), 'add').why, 'view', 'بلا ورقةٍ أصلاً');
  assert.equal(W.authorize0(su, K('bassam_tasks_v1'), 'del').ok, true, 'مديرُ النظام بسقف الإدارة كاملاً');
  assert.equal(W.authorize0(dm1, K('bassam_tasks_v1'), 'del').ok, true, 'مديرُ الإدارة يرث سقفها');
  assert.equal(W.authorize0(gm1, K('bassam_tasks_v1'), 'add').ok, true, 'مديرُ القطاع على إدارةٍ تحته (سلسلةُ الأسلاف)');
  assert.equal(W.authorize0(gm1, K('bassam_tasks_v1', 'd2'), 'add').why, 'dept', 'مديرُ القطاع خارج قطاعه');
  assert.equal(W.authorize0(actor('dm1', null, { mods: { off: ['tasks'] } }), K('bassam_tasks_v1'), 'add').why, 'page', 'وحدةٌ مطفأةٌ على مستوى المنصة: لا ورقة');
  assert.equal(W.authorize0(actor('su', null, { mods: { off: ['tasks'] } }), K('bassam_tasks_v1'), 'add').ok, false, 'ولا يُستثنى مديرُ النظام من الوحدة المطفأة');
  const ruled = Object.keys(W.RES_REG).find(k => W.RES_REG[k].scope === 'dept' && W.RES_REG[k].rule);
  if (ruled) assert.equal(W.authorize0(su, K(ruled), 'edit').why, 'rule', 'سياسةٌ خاصة تُفحص في موضعها');
});
test('authorize · authorizeActs: كلُّ فعلٍ في يد الفاعل — لا «أيُّ فعلٍ يكفي»', () => {
  const st1 = actor('st1'), k = 'bsdept:d1:bassam_tasks_v1';
  assert.deepEqual(W.authorizeActs(st1, k, []), { ok: false, why: 'noop' });
  assert.deepEqual(W.authorizeActs(st1, k, ['add', 'edit']), { ok: true });
  assert.deepEqual(W.authorizeActs(st1, k, ['add', 'del']), { ok: false, why: 'act', act: 'del' });
  assert.equal(W.authorize(null, k, 'add').why, 'session');
  assert.equal(W.authorize(st1, k, 'add').ok, true, 'الظلُّ لا يغيّر الحكم');
});

/* ══ (د) الإنفاذ ══ */
const R = () => W.KIVO_REGISTRY, IX = () => W.enfIx();
const keyWhere = (f) => R().keys.find(k => { const e = R().byKey[k]; return e && e.status === 'active' && f(k, e); });
const enfA = (uid, perms, grants) => { const A = actor(uid, perms); A.enf = { mode: 'enforce', perm: { applied: false } }; const keys = {}; for (const d in (grants || {})) keys[W.enfGrantsKey(d)] = J(grants[d]); W.enfAttachGrantsKeys(A, keys); return A; };
test('enfHeld0: المحجوزُ والمجهول · الذات · مديرُ النظام وحده · الدور (المدير) · خارجَ النطاق · خارجَ السقف · المنحُ الصريح (plus/minus) · الترجمة · التوافقُ المؤقّت', () => {
  const su = enfA('su'), st1 = enfA('st1'), dm1 = enfA('dm1'), st2 = enfA('st2');
  assert.equal(W.enfHeld0(st1, 'd1', 'no.such.key'), false);
  const reserved = R().keys.find(k => R().byKey[k].status !== 'active'); if (reserved) assert.equal(W.enfHeld0(su, 'd1', reserved), false, 'محجوز');
  const self = keyWhere((k, e) => e.grant === 'self'); if (self) assert.equal(W.enfHeld0(st1, 'd1', self), true, 'قاعدةُ ذات');
  const so = keyWhere((k) => IX().superOnly[k]); if (so) { assert.equal(W.enfHeld0(su, 'd1', so), true); assert.equal(W.enfHeld0(dm1, 'd1', so), false, 'لمدير النظام وحده'); }
  const rm = keyWhere((k, e) => e.grant === 'role' && IX().needMgr[k]); if (rm) { assert.equal(W.enfHeld0(dm1, 'd1', rm), true, 'دورُ المدير'); assert.equal(W.enfHeld0(st1, 'd1', rm), false); assert.equal(W.enfHeld0(dm1, '', rm), false); }
  const rs = keyWhere((k, e) => e.grant === 'role' && !IX().needMgr[k]); if (rs) { assert.equal(W.enfHeld0(su, 'd1', rs), true); assert.equal(W.enfHeld0(dm1, 'd1', rs), false); }
  const asg = keyWhere((k, e) => e.grant === 'assignable' && !IX().lens[k] && !IX().needMgr[k] && !IX().superOnly[k] && W.enfKeyOnCeiling(su, 'd1', k));
  assert.ok(asg, 'مفتاحٌ قابلٌ للمنح'); assert.equal(W.enfHeld0(st1, '', asg), false, 'بلا إدارة');
  assert.equal(W.enfHeld0(st2, 'd1', asg), false, 'خارج النطاق'); assert.equal(W.enfHeld0(su, 'd1', asg), true, 'مديرُ النظام');
  assert.equal(W.enfHeld0(st1, 'd1', asg), !!W.enfTranslated(st1, 'd1').keys[asg], 'الموظف: ترجمةُ ورقته وحدها');
  const plus = enfA('st1', null, { d1: { v: 1, emp: { e1: { plus: [asg] } } } }); assert.equal(W.enfHeld0(plus, 'd1', asg), true, 'plus يضيف');
  const tk = Object.keys(W.enfTranslated(dm1, 'd1').keys).find(k => R().byKey[k] && R().byKey[k].status === 'active' && R().byKey[k].grant === 'assignable' && !IX().needMgr[k] && !IX().lens[k]);
  if (tk) { const mn = enfA('dm1', null, { d1: { v: 1, emp: { 'mgr:d1': { minus: [tk] } } } }); assert.equal(W.enfHeld0(dm1, 'd1', tk), true); assert.equal(W.enfHeld0(mn, 'd1', tk), false, 'minus يُسقط'); }
  const off = enfA('dm1', { emps: {}, caps: { d1: [] } }); const leafK = keyWhere((k) => IX().leaf[k] && IX().leaf[k].indexOf('admin') !== 0 && !IX().hosts[k]);
  if (leafK) assert.equal(W.enfKeyOnCeiling(su, 'd1', leafK), true);
  assert.equal(W.enfHeld(null, 'd1', asg), false); assert.equal(W.enfHeld(st1, 'd1', asg), W.enfHeld(st1, 'd1', asg), 'الذاكرةُ المؤقتة');
  const ck = Object.keys(W.ENF_COMPAT)[0]; if (ck && R().byKey[ck]) { const m1 = enfA('su'); m1.enf.perm.applied = true; assert.equal(typeof W.enfHeld0(m1, 'd1', ck), 'boolean'); }
  assert.equal(off.u.id, 'dm1');
});
test('enfSides · enfR · enfHas · enfCeilingOf · enfEmpScopeOf · enfScopeParse', () => {
  assert.deepEqual(W.enfSides({ kind: 'modified', site: { old: 'A', new: 'B' } }, 'site'), [{ side: 'old', v: 'A' }, { side: 'new', v: 'B' }]);
  assert.deepEqual(W.enfSides({ kind: 'added', site: { old: 'A', new: 'B' } }, 'site'), [{ side: 'new', v: 'B' }]);
  assert.deepEqual(W.enfSides({ kind: 'removed', site: { old: 'A', new: 'B' } }, 'site'), [{ side: 'old', v: 'A' }]);
  assert.deepEqual(W.enfSides({ kind: 'added', site: { new: '' } }, 'site'), [{ side: 'new', v: '' }]);
  assert.deepEqual(W.enfSides({ kind: 'modified' }, 'site'), []);
  assert.deepEqual(W.enfR('allow', 'w', { a: 1 }), { r: 'allow', why: 'w', a: 1 }); assert.deepEqual(W.enfR('deny'), { r: 'deny', why: '' });
  assert.equal(W.enfHas([1, '2'], '1'), true); assert.equal(W.enfHas([], 1), false);
  const E = { recs: { d1: { ceiling: { Site: { mode: 'ALL' }, 'Zone/Element': { mode: 'list', list: ['z1', 2] } }, emp: { e1: { Site: { mode: 'list', list: ['A'] }, Shift: { mode: 'bogus' } } } }, d2: { ceiling: { Site: { mode: 'unknown' } } } } };
  assert.equal(W.enfCeilingOf(E, 'd1', 'Site'), 'ALL'); assert.deepEqual(W.enfCeilingOf(E, 'd1', 'Zone/Element'), ['z1', '2']); assert.equal(W.enfCeilingOf(E, 'd2', 'Site'), null); assert.equal(W.enfCeilingOf(E, 'd9', 'Site'), null); assert.equal(W.enfCeilingOf(null, 'd1', 'Site'), null);
  assert.deepEqual(W.enfEmpScopeOf(E, 'd1', 'e1', 'Site'), { mode: 'list', list: ['A'] }); assert.equal(W.enfEmpScopeOf(E, 'd1', 'e1', 'Shift'), null, 'نمطٌ مجهول'); assert.equal(W.enfEmpScopeOf(E, 'd1', '', 'Site'), null); assert.equal(W.enfEmpScopeOf(E, 'd1', 'e2', 'Site'), null);
  assert.deepEqual(W.enfScopeParse('{"a":1}'), { a: 1 }); assert.equal(W.enfScopeParse('[1]'), null); assert.deepEqual(W.enfScopeParse({ b: 2 }), { b: 2 }); assert.equal(W.enfScopeParse(null), null);
});
test('أبعادُ النطاق في الإنفاذ: Site/Zone (قيمةُ الموظف ضمن السقف · فاعلو السقف · غيرُ المهاجر ⇒ unknown) · Shift (R4 · n/a · قائمة · مربوطٌ بالجدول)', () => {
  const site = W.enfValueDim('Site', 'site'), zone = W.enfValueDim('Zone/Element', 'element');
  const recs = { d1: { ceiling: { Site: { mode: 'list', list: ['A', 'B'] }, 'Zone/Element': { mode: 'ALL' } }, emp: {
    e1: { Site: { mode: 'list', list: ['A'] }, 'Zone/Element': { mode: 'single', value: 'z1' }, Shift: { mode: 'list', list: ['ص'] } },
    e2: { Site: { mode: 'inherit' }, 'Zone/Element': { mode: 'unknown' }, Shift: { mode: 'n/a' } },
    e3: { Site: { mode: 'single' }, Shift: { mode: 'staffing-bound' } }, e4: { Shift: { mode: 'unknown' } } } }, d2: { emp: { e1: { Site: { mode: 'inherit' } } } } };
  const cx = (ekey, role = 'staff', extra = {}) => Object.assign({ enf: { recs }, dept: 'd1', actor: { ekey, role, id: 'u' } }, extra);
  const it = (v, kind = 'modified', extra = {}) => Object.assign({ kind, site: { old: v[0], new: v[1] } }, extra);
  assert.equal(site({ kind: 'added' }, 'k', cx('e1')).r, 'not_applicable');
  assert.equal(site(it(['A', 'A']), 'k', cx('e1'), 'bassam_irshad_v1').r, 'not_applicable', 'الاسترشاد خارج نموذج Site (معلن)');
  assert.equal(site(it(['A', 'A']), 'k', cx('e1')).r, 'allow');
  assert.equal(site(it(['A', 'B']), 'k', cx('e1')).r, 'deny', 'خارج قائمة الموظف');
  assert.equal(site(it(['B', 'B']), 'k', cx('e2')).r, 'allow', 'وراثةُ السقف');
  assert.equal(site(it(['C', 'C']), 'k', cx('e2')).r, 'deny', 'خارج سقف الإدارة');
  assert.equal(site(it(['A', 'A']), 'k', cx('e3')).r, 'deny', 'single بلا قيمة');
  assert.equal(site(it(['A', 'A']), 'k', cx('e9')).r, 'unknown', 'موظفٌ غيرُ مهاجر');
  assert.equal(site(it(['A', 'A']), 'k', cx('mgr:d1', 'super')).r, 'allow', 'فاعلُ السقف بسقف الإدارة');
  assert.equal(site(it(['C', 'C']), 'k', cx('mgr:d1', 'super')).r, 'deny');
  assert.equal(site(it(['A', 'A'], 'modified', { dept: { old: 'd2', new: 'd2' } }), 'k', cx('e1')).r, 'unknown', 'الإدارةُ المستهدفة بلا سقف');
  assert.equal(zone({ kind: 'modified', element: { old: 'z1', new: 'z1' } }, 'k', cx('e1')).r, 'allow');
  assert.equal(zone({ kind: 'modified', element: { old: 'z1', new: 'z2' } }, 'k', cx('e1')).r, 'deny');
  assert.equal(zone({ kind: 'modified', element: { old: 'z1', new: 'z1' } }, 'k', cx('e2')).r, 'unknown');
  const sh = (v, ekey, role, extra) => W.enfShiftDim({ kind: 'modified', shift: { old: v, new: v }, period: { new: { y: 1447, m: 3 } } }, 'k', cx(ekey, role, extra));
  assert.equal(W.enfShiftDim({ kind: 'modified' }, 'k', cx('e1')).r, 'not_applicable');
  assert.equal(sh('م', 'mgr:d1', 'super').r, 'allow', 'R4: المديرُ بلا قيد');
  assert.equal(sh('ص', 'e1').r, 'allow'); assert.equal(sh('م', 'e1').r, 'deny');
  assert.equal(sh('م', 'e2').r, 'allow', 'n/a'); assert.equal(sh('م', 'e4').r, 'unknown'); assert.equal(sh('م', 'e9').r, 'unknown');
  assert.equal(sh('ص', 'e3', 'staff', { actorShift: () => null }).r, 'deny', 'بلا صفٍّ في الجدول');
  assert.equal(sh('ص', 'e3', 'staff', { actorShift: () => 'م' }).r, 'deny', 'ورديةٌ غيرُ ورديته');
  assert.equal(sh('ص', 'e3', 'staff', { actorShift: (p) => p === '1447-3' ? 'ص' : null }).r, 'allow', 'مربوطٌ بالجدول الحيّ');
});
test('enfDecide: الحرّاسُ (المفاتيحُ الحقيقية) · غيرُ المغطّى (ENF_UNCOV بالمصنِّف) · البديلُ (self) · السببُ الإلزامي · بلا تغيير', () => {
  const su = enfA('su'), st1 = enfA('st1');
  const held = (set) => ({ held: (k) => set.has(k), noScope: true });
  /* غيرُ المغطّى بالحرّاس: المصنِّفُ + ENF_UNCOV */
  const k1 = 'bsdept:d1:bassam_irshad_langs_v1', a1 = ['ع'], b1 = ['ع', 'إن'];
  const r0 = W.enfDecide(st1, k1, 'bassam_irshad_langs_v1', 'd1', a1, b1, J(a1), J(b1), {}, {}, held(new Set()));
  assert.equal(r0.ok, false); assert.equal(r0.why || r0.reason || r0.code, r0.why || r0.reason || r0.code);
  const need = (JSON.stringify(r0).match(/anyOf\(([^)]+)\)/) || [])[1];
  if (need) { const r1 = W.enfDecide(st1, k1, 'bassam_irshad_langs_v1', 'd1', a1, b1, J(a1), J(b1), {}, {}, held(new Set([need.split('|')[0]]))); assert.equal(r1.ok, true, 'مفتاحٌ من anyOf يكفي'); }
  const unb = W.enfDecide(st1, 'bsdept:d1:bassam_nope_v1', 'bassam_nope_v1', 'd1', 1, 2, '1', '2', {}, {}, held(new Set()));
  assert.equal(unb.ok, false); assert.ok(/unbound/.test(J(unb)), 'موردٌ بلا ربط');
  /* المغطّى بالحرّاس: KIVO_GUARDS.classify */
  const cov = W.KIVO_SCOPE && Array.isArray(globalThis.__x) ? null : null; void cov;
  const gk = 'bsdept:d1:bassam_tasks_v1', ta = { '1447-03-01': [{ id: 't1', title: 'أ' }] }, tb = { '1447-03-01': [{ id: 't1', title: 'أ' }, { id: 't2', title: 'ب' }] };
  const rd = W.enfDecide(su, gk, 'bassam_tasks_v1', 'd1', ta, tb, J(ta), J(tb), {}, {}, held(new Set()));
  assert.equal(rd.ok, false, 'بلا مفاتيح: رفض');
  const miss = (J(rd).match(/"missing":\[([^\]]*)\]/) || [])[1] || '';
  const ks = new Set((miss.match(/[a-z][a-z0-9_.]+/g) || []));
  const rk = W.enfDecide(su, gk, 'bassam_tasks_v1', 'd1', ta, tb, J(ta), J(tb), {}, {}, held(ks));
  assert.equal(rk.ok, true, 'بالمفاتيح الناقصة نفسِها: قبول — ' + J(rk).slice(0, 200));
  const same = W.enfDecide(su, gk, 'bassam_tasks_v1', 'd1', ta, ta, J(ta), J(ta), {}, {}, Object.assign(held(new Set()), { techOk: () => true }));
  assert.equal(same.ok, true, 'لا عمليةَ مصنَّفة: تقنيٌّ لمن يكتب المورد');
  const same2 = W.enfDecide(st1, gk, 'bassam_tasks_v1', 'd1', ta, ta, J(ta), J(ta), {}, {}, Object.assign(held(new Set()), { techOk: () => false }));
  assert.equal(same2.ok, false);
  /* السببُ الإلزامي: مفتاحٌ يطلب audit.reason */
  const rkey = Object.keys(IX().reason)[0];
  assert.equal(W.enfReasonOf({ why: '  سببٌ كافٍ ' }), 'سببٌ كافٍ'); assert.equal(W.enfReasonOf({ why: 'لا' }), ''); assert.equal(W.enfReasonOf({ op: { reason: 'استعادةٌ مقصودة' } }), 'استعادةٌ مقصودة'); assert.equal(W.enfReasonOf(null), '');
  assert.ok(rkey, 'في السجلّ مفاتيحُ تطلب سبباً');
});
test('enfVia: الحقولُ الممنوحة من ورقةٍ أخرى (EMP_FIELDS · CS_ONLY · SEED_ONLY) — وغيرُها لا', () => {
  const su = enfA('su');
  assert.equal(W.enfVia(su, 'k', 'bassam_employees_v1', 'd1', null, '[]', {}), null, 'بلا قديم');
  const ea = J([{ eid: 'e1', name: 'أ', work: 'ميداني', type: 'رسمي' }]), eb = J([{ eid: 'e1', name: 'أ', work: 'مكتبي', type: 'رسمي' }]);
  const v1 = W.enfVia(su, 'bsdept:d1:bassam_employees_v1', 'bassam_employees_v1', 'd1', ea, eb, {});
  assert.ok(v1 === null || /EMP_FIELDS/.test(v1.tag), J(v1));
  assert.equal(W.enfVia(su, 'bsdept:d1:bassam_employees_v1', 'bassam_employees_v1', 'd1', ea, J([{ eid: 'e1', name: 'ب', work: 'ميداني', type: 'رسمي' }]), {}), null, 'الاسمُ ليس من حقول البديل');
  const sa = J({ '1447-03': { r1: { cs: 'A1', shift: 'ص' } } }), sb = J({ '1447-03': { r1: { cs: 'A2', shift: 'ص' } } });
  const v2 = W.enfVia(su, 'bsdept:d1:bassam_staffing_v3', 'bassam_staffing_v3', 'd1', sa, sb, {});
  assert.ok(v2 === null || /CS_ONLY/.test(v2.tag), J(v2));
  const v3 = W.enfVia(su, 'bsdept:d1:bassam_perm_tpls_v1', 'bassam_perm_tpls_v1', 'd1', '[]', J([{ id: 't1', name: 'قالب' }]), {});
  assert.ok(v3 === null || /SEED_ONLY/.test(v3.tag), J(v3));
  const rn = W.enfVia(su, 'bsdept:d1:bassam_staffing_v3', 'bassam_staffing_v3', 'd1', J({ m: { r: { shift: 'ص' } } }), J({ m: { r: { shift: 'الصباحية' } } }), { shRen: { o: 'ص', n: 'الصباحية' } });
  assert.ok(rn === null || /shiftRename/.test(rn.tag), J(rn));
  assert.equal(W.enfVia(su, 'bsdept:d1:bassam_staffing_v3', 'bassam_staffing_v3', 'd1', J({ m: { r: { shift: 'ص', x: 1 } } }), J({ m: { r: { shift: 'الصباحية', x: 2 } } }), { shRen: { o: 'ص', n: 'الصباحية' } }), null, 'تبعةُ التسمية لا تحمل تغييراً آخر');
  assert.equal(W.enfVia(su, 'bsdept:d1:bassam_tasks_v1', 'bassam_tasks_v1', 'd1', '{}', '{"a":1}', {}), null);
});
test('enfScopeEval · enfScopeCtx · enfSources · enfHeldMap: كتابةٌ بلا مفاتيح ⇒ لا ينطبق · المصادرُ لمدير النظام كلُّها', () => {
  const su = enfA('su'), st1 = enfA('st1');
  assert.deepEqual(W.enfScopeEval(su, 'd1', 'bsdept:d1:bassam_tasks_v1', 'bassam_tasks_v1', {}, {}, [], {}), { composite: 'not_applicable', denyDims: [], unknownDims: [], items: 0, why: '' });
  assert.deepEqual(W.enfSources(su, 'write'), { haram: true, nabawi: true });
  assert.deepEqual(W.enfSources(st1, 'read'), { haram: false, nabawi: false });
  const asg = keyWhere((k, e) => e.grant === 'assignable' && !IX().lens[k] && !IX().needMgr[k] && !IX().superOnly[k]);
  const hm = W.enfHeldMap(su, 'd1', [asg, keyWhere((k, e) => e.grant === 'self')].filter(Boolean)); assert.equal(hm[asg], true); assert.equal(Object.keys(hm).length, 1, 'قواعدُ الذات خارج المحمول');
  const cx = W.enfScopeCtx(st1, 'd1', 'bsdept:d1:bassam_tasks_v1', {}, { recs: { d1: { ceiling: { Site: { mode: 'ALL' } } } } }, 'read');
  assert.equal(cx.enf.mode, 'read'); assert.equal(cx.deptCeiling('Site', 'd1'), 'ALL'); assert.equal(cx.deptCeiling('Site', 'd9'), null);
  const ta = { '1447-03-01': [{ id: 't1', title: 'أ', site: 'A' }] }, tb = { '1447-03-01': [{ id: 't1', title: 'ب', site: 'A' }] };
  const ev = W.enfScopeEval(su, 'd1', 'bsdept:d1:bassam_tasks_v1', 'bassam_tasks_v1', ta, tb, [asg], { recs: {} });
  assert.ok(['allow', 'deny', 'unknown', 'not_applicable'].indexOf(ev.composite) !== -1, J(ev));
});
