/* KIVO_258 · AUD-025 — محرّكُ نطاق البيانات KIVO_SCOPE (v24.9) بجداول حالات (بلا D1 ولا طلبات):
   (١) الأدوات: الفترةُ المغلقة (G‑08) · نافذةُ الاستدراك · أقفالُ الشهر/اليوم (dsLockedIn) · الهجري · المطابقةُ بالهوية · الدمجُ والتركيب
   (٢) المستخرِجات لكل مورد: الخطة (مواقع · عناصرُ العدسات · الأشهر · المرآة) · الجولات · التقرير اليومي · الجدول الشهري · المهام · الاسترشاد/المضبوطات
       · الموظفون · العهد · الجائزة · الإحصائيات · الحسابات · الصلاحيات · الكلّ — كتابةً وقراءةً (المحتوياتُ المضافة تُمشى عنصراً عنصراً)
   (٣) مقيّمو الأبعاد العشرة: Department · Branch · Site · Zone/Element · Shift · Assigned · Own · DateRange · Source · Global (القديمُ خارج الإنفاذ)
   (٤) evaluate · evaluateWrite · evaluateRead (أفضلُ مفاتيح القراءة · السقف) · readKeysFor · validate. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';
const W = await internals(['KIVO_SCOPE', 'KIVO_REGISTRY']);
const S = W.KIVO_SCOPE, R = W.KIVO_REGISTRY, H = S._h, D = S._D;
const T = { y: 1447, m: 5, d: 10 };
const ex = (res, a, b, ctx) => S.extract(res, a, b, Object.assign({ today: T }, ctx || {}));
const whats = (items) => items.map(i => i.what + ':' + i.kind).sort().join(',');
const keyWith = (dims, f) => R.keys.find(k => { const e = R.byKey[k]; return e.status === 'active' && dims.every(d => e.scopeDims.indexOf(d) !== -1) && (!f || f(k, e)); });

test('الأدوات: الفترةُ المغلقة · نافذةُ الاستدراك · أقفالُ الشهر واليوم · الهجري · المطابقةُ بالهوية', () => {
  assert.equal(H.closedPeriod(null, 1447, 4, 1), false); assert.equal(H.closedPeriod(T, 0, 0, null), false, 'تاريخٌ غيرُ صالح');
  assert.equal(H.closedPeriod(T, 1447, 4, null), true, 'شهرٌ مضى'); assert.equal(H.closedPeriod(T, 1447, 6, 1), false, 'شهرٌ قادم');
  assert.equal(H.closedPeriod(T, 1447, 5, 9), true, 'يومٌ مضى في الشهر الجاري'); assert.equal(H.closedPeriod(T, 1447, 5, 10), false, 'اليوم'); assert.equal(H.closedPeriod(T, 1447, 5, null), false, 'الشهرُ الجاري كلُّه');
  const wins = [5, { scope: 'x' }, { id: 'w1', scope: { y: 1447, m: 4 }, until: 200 }, { id: 'w2', scope: { y: 1447, m: 3, d: 2 }, until: 50 }, { id: 'w3', scope: { y: 1447, m: 2 }, until: 900, closedAt: 1 }];
  assert.deepEqual(H.retroCover(wins, 1447, 4, 7, 100), { covered: true, expired: false, window: 'w1' });
  assert.deepEqual(H.retroCover(wins, 1447, 3, 2, 100), { covered: false, expired: true, window: null }, 'انتهت');
  assert.deepEqual(H.retroCover(wins, 1447, 3, 5, 100), { covered: false, expired: false, window: null }, 'يومٌ آخر');
  assert.deepEqual(H.retroCover(wins, 1447, 2, 1, 100), { covered: false, expired: true, window: null }, 'أُغلقت');
  assert.deepEqual(H.retroCover(null, 1447, 4, 1, 1), { covered: false, expired: false, window: null });
  assert.equal(H.lockedIn(true, 1447, 5, 12, T), true, 'قفلٌ قديمُ الشكل'); assert.equal(H.lockedIn({ ap: 1 }, 1447, 6, 1, T), true);
  assert.equal(H.lockedIn({}, 1447, 4, null, T), true, 'شهرٌ مضى بلا فتح'); assert.equal(H.lockedIn({ mo: 1 }, 1447, 4, 3, T), true, 'مفتوحُ الشهر لكنّ اليومَ مضى بلا dopen');
  assert.equal(H.lockedIn({ mo: 1, dopen: { 3: 1 } }, 1447, 4, 3, T), false, 'يومٌ مفتوحٌ صراحةً'); assert.equal(H.lockedIn({}, 1447, 5, 12, T), false, 'يومٌ قادم');
  assert.equal(H.lockedIn({ dshut: { 12: 1 } }, 1447, 5, 12, T), true, 'يومٌ قادمٌ أُغلق'); assert.equal(H.lockedIn({}, 1447, 5, null, T), false); assert.equal(H.lockedIn(null, 1447, 5, 9, T), true, 'أمسُ مغلق');
  assert.deepEqual(H.parseDay('1447-5-9'), { y: 1447, m: 5, d: 9 }); assert.equal(H.parseDay('x'), null); assert.deepEqual(H.parseMonth('m:1447-05'), { y: 1447, m: 5, d: null }); assert.equal(H.parseMonth('1447'), null);
  const m = H.matchById([{ id: 1 }, { id: 1, x: 1 }, { k: 2 }], [{ id: 1 }, { id: 3 }, { k: 9 }, { k: 8 }], (e) => e && e.id != null ? String(e.id) : null);
  assert.deepEqual([m.added.map(x => x.id), m.removed.map(x => x.id), m.changed.map(x => x.id)], [['3'], [], ['#2', '#3']], 'المكرَّرُ وما بلا هويةٍ يُطابَق بالموضع بين الطرفين');
  const m2 = H.matchById([{ id: 1 }, {}, {}], [{}], (e) => e && e.id != null ? String(e.id) : null);
  assert.deepEqual([m2.added.length, m2.removed.map(x => x.id), m2.changed.length], [0, ['1', '#2'], 0], 'الزائدُ بلا هوية يُعدّ محذوفاً');
  assert.equal(S.fold([]).r, 'not_applicable'); const f = S.fold([{ r: 'allow' }, { r: 'unknown', why: 'u' }, { r: 'allow' }]); assert.equal(f.r, 'unknown'); assert.deepEqual(f.n, { allow: 2, deny: 0, unknown: 1, not_applicable: 0 });
  assert.equal(S.fold([{ r: 'unknown' }, { r: 'deny', why: 'd' }]).why, 'd');
  const c = S.compose({ A: { r: 'allow' }, B: { r: 'not_applicable' } }, ['A', 'B', 'C']); assert.equal(c.composite, 'allow'); assert.deepEqual(c.naDims, ['B']);
  assert.equal(S.compose({ A: { r: 'not_applicable' } }, ['A']).composite, 'not_applicable'); assert.equal(S.compose({ A: { r: 'unknown' }, B: { r: 'deny' } }, ['A', 'B']).composite, 'deny');
});
test('مستخرِجُ الخطة: المواقع (إضافة · حذف · اعتماد · تعديل) · عناصرُ العدسات بالهوية (uid · id · gid/leafNo · label) · الأشهر (قفلٌ · مواقعُ الشهر) · المرآة · القراءة', () => {
  const fl = (o) => Object.assign({ sid: 's1', name: 'الشمالي', zones: [], gates: [], marks: [], paths: [] }, o);
  const a = { floors: [fl({ approved: true, gates: [{ id: 'g1', emp: ['e1'] }, { gid: 'P', leafNo: 2 }], zones: [{ uid: 'U1', name: 'z' }], marks: [{ label: 'm1' }], paths: [{ code: 'p1' }] }), fl({ sid: 's2', name: 'x' }), { name: 'بلا sid' }],
    zones: [{ name: 'جذر' }], months: { '1447-03': { d: [] }, '1447-04': { mo: 0, d: [fl({})] }, '1447-05': [fl({})], '1447-06': { d: [] } } };
  const b = { floors: [fl({ approved: false, title: 'جديد', gates: [{ id: 'g1', emp: ['e2'] }, { gid: 'P' }], zones: [{ uid: 'U1', name: 'z2' }], marks: [], paths: [{ code: 'p1' }, { name: 'p2' }] }), fl({ sid: 's3' })],
    zones: [{ name: 'جذر' }, { name: 'جذرٌ ثانٍ' }], months: { '1447-04': { mo: 1, d: [fl({ approved: true, zones: [{ name: 'ز' }] }), fl({ sid: 'n' })] }, '1447-05': [fl({ gates: [{ id: 'q' }] })], '1447-07': { d: [fl({})] } } };
  const it = ex('bassam_plan_v1', a, b, {});
  const w = whats(it);
  for (const x of ['floor:added', 'floor:removed', 'floorAp:changed', 'floorEdit:changed', 'element:added', 'element:removed', 'element:changed', 'month:added', 'month:removed', 'monthLock:changed'])
    assert.ok(w.indexOf(x) !== -1, 'الخطة: ' + x + ' ⊂ ' + w);
  const g = it.find(i => i.what === 'element' && i.col === 'gates' && i.kind === 'changed'); assert.deepEqual(g.emp, { old: ['e1'], new: ['e2'] }, 'تسكينُ الباب قبل/بعد');
  assert.ok(it.some(i => i.mirror), 'عنصرٌ في المرآة (الجذر) بلا نظير يُسجَّل');
  const mr = (id) => it.find(i => i.what === 'month' && i.kind === 'removed' && i.id === id);
  assert.equal(mr('1447-03').lock.locked, true, 'حذفُ شهرٍ مضى بلا mo ⇒ مقفل'); assert.equal(mr('1447-06').lock.locked, false, 'حذفُ شهرٍ قادم ⇒ مفتوح');
  assert.equal(whats(ex('bassam_plan_v1', a, a, {})), 'resource:changed', 'بلا تغيير: موردٌ واحد');
  assert.equal(whats(ex('bassam_plan_v1', undefined, {}, {})), 'resource:changed', 'الغائبُ يُطبَّع كائناً فارغاً قبل المقارنة — بلا فرقٍ ⇒ عنصرُ المورد');
  const rd = S.extractRead('bassam_plan_v1', { floors: [fl({ gates: [{ id: 'g1' }] })], months: { '1447-05': { d: [fl({ sid: 'r', zones: [{ uid: 'Z' }] })] } } }, { today: T });
  assert.ok(rd.length >= 4 && rd.every(i => i.kind === 'current' && i.read) && rd.total === rd.length && rd.truncated === 0, 'القراءة: كلُّ سجلٍّ عنصرٌ current (والمواقعُ في الأشهر)');
  const cap = S.extractRead('bassam_plan_v1', { floors: [fl({ gates: [{ id: 1 }, { id: 2 }, { id: 3 }] })] }, { today: T, readMaxItems: 2 }); assert.equal(cap.length, 2); assert.ok(cap.truncated >= 2, 'سقفُ عناصر القراءة');
});
test('مستخرِجُ الجولات: قفلُ الشهر · مفاتيحُ غيرُ يومية · اليومُ (إضافة · حذف · اعتماد · اعتمادُ ورديات · مواقعُ بالموضع · تعديل) · القراءة', () => {
  const a = { 'm:1447-04': { mo: 1 }, cfg: 1, '1447-04-02': { ap: 1, d: [{ sid: 'f', gates: [{ id: 'g' }] }, { name: 'ب' }], shAp: { s: { ap: 0 } }, note: 'x' }, '1447-05-11': { d: [] }, '1447-05-12': { d: [] } };
  const b = { 'm:1447-04': { mo: 0 }, cfg: 2, '1447-04-02': { ap: 0, d: [{ sid: 'f', gates: [{ id: 'g' }, { id: 'h' }] }], shAp: { s: { ap: 1 } }, note: 'y' }, '1447-05-11': { d: [] }, '1447-05-13': { d: [{ name: 'ج' }] } };
  const it = ex('bassam_rounds_v1', a, b, {}), w = whats(it);
  for (const x of ['monthLock:changed', 'dayOther:changed', 'dayAp:changed', 'shiftAp:changed', 'element:added', 'floor:removed', 'dayEdit:changed', 'day:added', 'day:removed']) assert.ok(w.indexOf(x) !== -1, 'الجولات: ' + x + ' ⊂ ' + w);
  const ed = it.find(i => i.what === 'dayEdit'); assert.equal(ed.lock.locked, true, 'يومٌ معتمَد ⇒ مقفل'); assert.equal(ed.lock.why, 'day-approved');
  const fa = it.find(i => i.what === 'element'); assert.equal(fa.site.new, 'f:f', 'هويةُ الموقع من sid');
  const rd = S.extractRead('bassam_rounds_v1', { '1447-05-13': { d: [{ name: 'ج', zones: [{ uid: 'Z' }] }, { sid: 'S', gates: [{ id: 1 }] }] } }, { today: T });
  assert.ok(rd.some(i => i.what === 'floor') && rd.some(i => i.what === 'element'), 'القراءة: المواقعُ وعناصرُها');
  assert.equal(whats(ex('bassam_rounds_v1', {}, {}, {})), 'resource:changed');
});
test('مستخرِجُ التقرير اليومي: صلاحيةُ الاستئذان الشهرية · اليوم · الورديات (اعتماد · قائمةُ المسكَّنين · تعديل) · القراءة', () => {
  const a = { 'm:1447-05': { perm: 2 }, x: 1, '1447-05-12': { shifts: { s1: { ap: 0, roster: [{ ekey: 'e1' }, { ekey: 'e2', r: 1 }], note: 'a' }, s2: {} }, title: 'أ' }, '1447-05-13': { shifts: {} } };
  const b = { 'm:1447-05': { perm: 3 }, x: 2, '1447-05-12': { shifts: { s1: { ap: 1, apAt: 't', apBy: 'u', roster: [{ ekey: 'e2', r: 2 }, { ekey: 'e3' }], note: 'b' }, s3: {} }, title: 'ب' }, '1447-05-14': { shifts: { s9: { roster: [{ ekey: 'e1' }] } } } };
  const it = ex('bassam_dreport_v1', a, b, {}), w = whats(it);
  for (const x of ['monthPerm:changed', 'dayOther:changed', 'shiftAp:changed', 'roster:added', 'roster:removed', 'roster:changed', 'shiftEdit:changed', 'shift:added', 'shift:removed', 'dayEdit:changed', 'day:added', 'day:removed'])
    assert.ok(w.indexOf(x) !== -1, 'التقرير: ' + x + ' ⊂ ' + w);
  const rd = S.extractRead('bassam_dreport_v1', { '1447-05-14': { shifts: { s9: { roster: [{ ekey: 'e1' }, { ekey: 'e2' }] } } } }, { today: T });
  assert.ok(rd.filter(i => i.what === 'roster').length === 2 && rd.some(i => i.what === 'shift'), 'القراءة: الورديةُ ومسكَّنوها');
  assert.equal(whats(ex('bassam_dreport_v1', {}, {}, {})), 'resource:changed');
});
test('مستخرِجا الجدول الشهري والمهام: الأقفال (غائبة ⇒ null · مقفل · مفتوح) · الصفوف · لقطةُ الورديات · مهامُّ بالمعرّف r[13] ومالكُها r[14]', () => {
  const a = { '1447-05': { e1: { s: 'ص' }, e2: { s: 'م' }, __shifts: [1] }, '1447-03': { e1: {} } }, b = { '1447-05': { e1: { s: 'م' }, e3: { s: 'ص' }, __shifts: [2] }, '1447-06': { e4: { s: 'ص' }, __shifts: [] } };
  const it = ex('bassam_staffing_v3', a, b, { locks: { staffing: { '1447-05': true } } }), w = whats(it);
  for (const x of ['row:changed', 'row:added', 'row:removed', 'snapshot:changed', 'month:added', 'month:removed']) assert.ok(w.indexOf(x) !== -1, 'الجدول: ' + x + ' ⊂ ' + w);
  assert.equal(it.find(i => i.what === 'row').lock.locked, true); assert.equal(ex('bassam_staffing_v3', a, b, {}).find(i => i.what === 'row').lock.locked, null, 'الأقفالُ غيرُ محمَّلة ⇒ null');
  assert.equal(ex('bassam_staffing_v3', a, b, { locks: { staffing: {} } }).find(i => i.what === 'row').lock.locked, false);
  const rd = S.extractRead('bassam_staffing_v3', b, { today: T }); assert.ok(rd.filter(i => i.what === 'row').length >= 2, 'القراءة: صفوفُ الأشهر');
  const row = (id, owner, t) => { const r = new Array(15).fill(''); r[0] = t; r[13] = id; r[14] = owner; return r; };
  const ta = { '1447-05-12': [row('t1', 'e1', 'أ'), row('t2', 'e2', 'ب')] }, tb = { '1447-05-12': [row('t1', 'e1', 'أ2'), row('t3', 'e3', 'ج')], '1447-05-13': [row('t4', 'e1', 'د')] };
  const ti = ex('bassam_tasks_v1', ta, tb, { locks: { tasks: { '1447-5': true } } }), tw = whats(ti);
  for (const x of ['task:changed', 'task:added', 'task:removed']) assert.ok(tw.indexOf(x) !== -1, 'المهام: ' + x + ' ⊂ ' + tw);
  assert.deepEqual(ti.find(i => i.kind === 'changed').owner, { old: 'e1', new: 'e1' }); assert.equal(whats(ex('bassam_tasks_v1', ta, ta, {})), 'resource:changed');
  assert.equal(whats(ex('bassam_staffing_v3', {}, {}, {})), 'resource:changed');
});
test('المستخرِجاتُ الأخرى: الاسترشاد/المضبوطات · الموظفون · العهد · الجائزة · الإحصائيات · الحسابات (ph يُورَث) · الصلاحيات · الكلّ · مالكُ إشعار الجهاز', () => {
  const r = ex('bassam_irshad_v1', { reports: [{ id: 1, y: 1447, m: 5, d: 1, loc: 'A' }, { id: 2 }] }, { reports: [{ id: 1, y: 1447, m: 5, d: 2, loc: 'B' }, { id: 3, loc: 'C' }] });
  assert.equal(whats(r), 'record:added,record:changed,record:removed'); const rc = r.find(i => i.kind === 'changed'); assert.deepEqual(rc.site, { old: 'A', new: 'B' }); assert.equal(rc.period.old.d, 1);
  assert.equal(whats(ex('bassam_seized_v1', {}, {})), 'resource:changed');
  assert.equal(whats(ex('bassam_employees_v1', [{ eid: 'e1', n: 1 }, { nid: '9' }], [{ eid: 'e1', n: 2 }, { name: 'ج' }])), 'employee:added,employee:changed,employee:removed');
  assert.equal(whats(ex('bassam_employees_v1', [], [])), 'resource:changed');
  assert.equal(whats(ex('bassam_custody_v1', { items: [{ name: 'أ' }, { name: 'ب' }], moves: [{}] }, { items: [{ name: 'أ', q: 1 }, { name: 'ج' }], moves: [{}, { y: 1447, m: 5, d: 1 }] })), 'custodyType:added,custodyType:changed,custodyType:removed,move:added');
  assert.equal(whats(ex('bassam_custody_v1', { items: [], moves: [{}, {}] }, { items: [], moves: [{}] })), 'move:removed');
  assert.equal(whats(ex('bassam_custody_v1', { items: [], moves: [], x: 1 }, { items: [], moves: [], x: 2 })), 'resource:changed', 'تغييرٌ خارج المجموعتين');
  assert.equal(whats(ex('bassam_custody_v1', { items: [] }, { items: [] })), 'resource:changed');
  const aw = ex('bassam_award_v1', { recs: [{ id: 1, ekey: 'e1' }, { id: 2 }] }, { recs: [{ id: 1, ekey: 'e2' }, { id: 3, ekey: 'e3' }] }); assert.equal(whats(aw), 'nomination:added,nomination:changed,nomination:removed');
  assert.deepEqual(aw.find(i => i.kind === 'changed').owner, { old: 'e1', new: 'e2' }); assert.equal(whats(ex('bassam_award_v1', {}, {})), 'resource:changed');
  const ds = ex('bassam_dstats_v1', { haram: { '1447-04-02': { men: 1 } }, locks: { 'haram|1447-04': { ap: 1 } } }, { haram: { '1447-04-02': { men: 2 }, 'bad-key': 1 }, nabawi: { '1447-05-11': { men: 1 } }, locks: { 'haram|1447-04': { ap: 0 }, 'zzz': 1 } }, {});
  assert.ok(whats(ds).indexOf('dsDay:changed') !== -1 && whats(ds).indexOf('dsDay:added') !== -1 && whats(ds).indexOf('dsLock:changed') !== -1 && whats(ds).indexOf('dsLock:added') !== -1, whats(ds));
  assert.equal(ds.find(i => i.what === 'dsDay' && i.kind === 'changed').source, 'haram'); assert.equal(whats(ex('bassam_dstats_v1', {}, {}, {})), 'resource:changed');
  const us = ex('bassam_auth_users_v1', [{ id: 'u1', ph: 'H', deptId: 'd1' }, { id: 'u2', deptId: 'd1' }], [{ id: 'u1', deptId: 'd1' }, { id: 'u3', deptId: 'd2' }]);
  assert.equal(whats(us), 'user:added,user:removed', 'ph الغائبُ يُورَث — فلا يُعدّ u1 متغيّراً');
  assert.equal(whats(ex('bassam_auth_users_v1', [{ id: 'u1', role: 'staff' }], [{ id: 'u1', role: 'dept' }])), 'user:changed'); assert.equal(whats(ex('bassam_auth_users_v1', [], [])), 'resource:changed');
  assert.equal(whats(ex('bassam_perms_v1', { caps: { d1: [1] }, emps: { d1: {} } }, { caps: { d1: [2] }, lenses: { d1: [] } })), 'permSection:added,permSection:changed,permSection:removed');
  assert.equal(whats(ex('bassam_perms_v1', {}, {})), 'resource:changed');
  assert.equal(whats(ex('bassam_unknown_v1', 1, 2)), 'resource:changed', 'الافتراضي: الموردُ كلُّه'); assert.equal(whats(ex('bassam_unknown_v1', undefined, 2)), 'resource:added'); assert.equal(whats(ex('bassam_unknown_v1', 1, undefined)), 'resource:removed');
  const nd = S.extract('bassam_notif_dev_v1', 1, 2, { keyName: 'bsdept:d1:bassam_notif_dev_v1:u7' }); assert.deepEqual(nd[0].owner, { old: 'u7', new: 'u7' }, 'مالكُ إشعار الجهاز من المفتاح');
});
test('مقيّمو الأبعاد (خارج الإنفاذ — القديم): Department · Branch · Site/Zone (الدورُ ≠ ALL · سقفُ الإدارة · القيمةُ الصريحة · الدليل) · Shift · Source · Global', () => {
  const ctx = (o) => Object.assign({ dept: 'd1', deptInScope: (d) => d === 'd1' || d === 'd2', actor: { role: 'staff', ekey: 'e1' } }, o || {});
  const itD = (o, n, kind = 'changed') => ({ kind, dept: { old: o, new: n } });
  assert.equal(D.Department({ kind: 'changed' }, 'k', ctx()).r, 'allow', 'هويةُ المفتاح'); assert.equal(D.Department({ kind: 'changed' }, 'k', ctx({ dept: '' })).r, 'not_applicable');
  assert.equal(D.Department(itD('d1', 'd2'), 'k', ctx()).r, 'allow'); assert.equal(D.Department(itD('d1', 'd9'), 'k', ctx()).r, 'deny', 'نقلٌ إلى إدارةٍ خارج النطاق');
  assert.equal(D.Branch({ kind: 'changed' }, 'k', ctx({ allowedDepts: null })).r, 'allow', 'super: كلُّ الإدارات'); assert.equal(D.Branch({ kind: 'changed' }, 'k', ctx({ dept: '' })).r, 'not_applicable');
  assert.equal(D.Branch(itD('d1', 'd2'), 'k', ctx({ allowedDepts: ['d1'] })).r, 'deny'); assert.equal(D.Branch(itD('d1', 'd1'), 'k', ctx({ allowedDepts: ['d1'] })).r, 'allow');
  const site = (v, o) => D.Site({ kind: 'changed', site: { old: v[0], new: v[1] }, emp: o && o.emp }, 'k', ctx(o && o.ctx));
  assert.equal(D.Site({ kind: 'changed' }, 'k', ctx()).r, 'not_applicable');
  assert.equal(site(['A', 'A'], { ctx: { scopeValues: { Site: ['A'] } } }).r, 'allow'); assert.equal(site(['A', 'B'], { ctx: { scopeValues: { Site: ['A'] } } }).r, 'deny');
  const u1 = site(['A', 'A'], { emp: { old: ['e1'], new: [] } }); assert.equal(u1.r, 'unknown'); assert.equal(u1.evidence, 'assigned-here');
  assert.equal(site(['A', 'A'], { emp: { old: [], new: [] } }).evidence, 'not-assigned-here'); assert.equal(site(['A', 'A']).evidence, 'none');
  const mgr = (ceil) => ({ ctx: { actor: { role: 'dept', ekey: 'mgr:d1' }, deptCeiling: ceil } });
  assert.equal(site(['A', 'A'], mgr(() => null)).r, 'unknown', 'المديرُ بلا سجلّ سقف ⇒ unknown (D4‑04)'); assert.equal(site(['A', 'A'], { ctx: { actor: { role: 'gm' } } }).r, 'unknown', 'بلا دالة السقف');
  assert.equal(site(['A', 'Z'], mgr(() => 'ALL')).r, 'allow'); assert.equal(site(['A', 'Z'], mgr(() => ['A'])).r, 'deny'); assert.equal(site(['A', 'A'], mgr(() => ['A'])).r, 'allow'); assert.equal(site(['A', 'A'], mgr(() => 7)).r, 'unknown', 'سقفٌ بشكلٍ مجهول');
  assert.equal(D['Zone/Element']({ kind: 'removed', element: { old: 'z', new: null } }, 'k', ctx({ scopeValues: { 'Zone/Element': ['z'] } })).r, 'allow');
  const sh = (v, o) => D.Shift({ kind: 'changed', shift: { old: v, new: v }, period: { new: { y: 1447, m: 5 } } }, 'k', ctx(o));
  assert.equal(D.Shift({ kind: 'changed' }, 'k', ctx()).r, 'not_applicable'); assert.equal(sh('ص', { actor: { role: 'staff', mgr: 1 } }).r, 'allow', 'المدير بلا قيد');
  assert.equal(sh('ص', { scopeValues: { Shift: ['ص'] } }).r, 'allow'); assert.equal(sh('م', { scopeValues: { Shift: ['ص'] } }).r, 'deny');
  assert.equal(sh('ص', { actorShift: () => 'ص' }).evidence, 'staffing-shift-match'); assert.equal(sh('ص', { actorShift: () => 'م' }).evidence, 'staffing-shift-mismatch'); assert.equal(sh('ص').evidence, 'no-staffing-evidence');
  assert.equal(D.Source({}, 'k', ctx()).r, 'not_applicable'); assert.equal(D.Source({ source: 'haram' }, 'k', ctx({ sources: { haram: true } })).r, 'allow'); assert.equal(D.Source({ source: 'nabawi' }, 'k', ctx()).r, 'deny');
  assert.equal(D.Global().r, 'not_applicable');
  assert.equal(S.isCeiling(null), false); assert.equal(S.isCeiling({ role: 'staff', ekey: 'mgr:x' }), true); assert.equal(S.isCeiling({ role: 'staff' }), false);
});
test('Assigned · Own · DateRange: التسكينُ (قراءة · إضافة · حذف · تغيير) · المهامُّ بالمالك · الملكيةُ وتغييرُها · الأقفالُ الزمنية ونافذةُ الاستدراك (لا تجاوزَ لمدير النظام)', () => {
  const c = (o) => Object.assign({ dept: 'd1', actor: { role: 'staff', ekey: 'e1', id: 'u1' } }, o || {});
  const em = (kind, o, n) => ({ kind, emp: { old: o, new: n } });
  assert.equal(D.Assigned(em('current', [], ['e1']), 'k', c()).r, 'allow'); assert.equal(D.Assigned(em('current', [], []), 'k', c()).r, 'deny');
  assert.equal(D.Assigned(em('added', [], ['e1']), 'k', c()).r, 'allow'); assert.equal(D.Assigned(em('added', [], []), 'k', c()).r, 'deny');
  assert.equal(D.Assigned(em('removed', ['e1'], []), 'k', c()).r, 'allow'); assert.equal(D.Assigned(em('removed', [], []), 'k', c()).r, 'deny');
  assert.equal(D.Assigned(em('changed', ['e1'], ['e1']), 'k', c()).r, 'allow'); assert.equal(D.Assigned(em('changed', ['e1'], []), 'k', c()).r, 'deny'); assert.equal(D.Assigned(em('changed', [], ['e1']), 'k', c()).r, 'deny'); assert.equal(D.Assigned(em('changed', [], []), 'k', c()).r, 'deny');
  assert.equal(D.Assigned(em('changed', [], []), 'k', c({ held: { k: true } })).r, 'not_applicable', 'حاملُ المفتاح بلا قيد'); assert.equal(D.Assigned(em('changed', [], ['e1']), 'k', c({ held: { k: true }, fieldOnly: true })).r, 'deny', 'الرصدُ وحده مقيَّد');
  const task = (o, n, kind = 'changed') => ({ what: 'task', kind, owner: { old: o, new: n } });
  assert.equal(D.Assigned(task('e1', 'e1'), 'k', c()).r, 'allow'); assert.equal(D.Assigned(task('e1', 'e2'), 'k', c()).r, 'deny'); assert.equal(D.Assigned(task('e1', 'e2'), 'k', c({ held: { k: 1 } })).r, 'not_applicable');
  assert.equal(D.Assigned({ what: 'task', kind: 'changed' }, 'k', c()).r, 'not_applicable'); assert.equal(D.Assigned({ what: 'x' }, 'k', c()).r, 'not_applicable');
  assert.equal(D.Own({}, 'k', c()).r, 'not_applicable'); assert.equal(D.Own({ owner: { old: 'e1', new: 'e1' } }, 'k', c({ held: { k: 1 } })).r, 'not_applicable');
  assert.equal(D.Own({ kind: 'changed', owner: { old: null, new: null } }, 'k', c()).r, 'not_applicable'); assert.equal(D.Own({ kind: 'changed', owner: { old: 'e1', new: 'e2' } }, 'k', c()).r, 'deny', 'تغييرُ المالك');
  assert.equal(D.Own({ kind: 'changed', owner: { old: 'e9', new: 'e9' } }, 'k', c()).r, 'deny'); assert.equal(D.Own({ kind: 'changed', owner: { old: 'u1', new: 'u1' } }, 'k', c()).r, 'allow', 'الهويةُ أو المعرّف');
  const p = (y, m, d) => ({ y, m, d }), pr = (o, n, x) => Object.assign({ kind: 'changed', period: { old: o, new: n } }, x || {});
  assert.equal(D.DateRange(pr(p(1447, 4, 1), p(1447, 4, 1)), 'k', c({ read: true })).r, 'not_applicable'); assert.equal(D.DateRange(pr(null, null, { lockOp: true }), 'k', c()).r, 'not_applicable'); assert.equal(D.DateRange({ kind: 'changed' }, 'k', c()).r, 'not_applicable');
  const ir = (o, n, cx) => D.DateRange(pr(o, n), 'k', c(Object.assign({ today: T, now: 100 }, cx)), 'bassam_irshad_v1');
  assert.equal(ir(p(1447, 5, 12), p(1447, 5, 12)).r, 'allow', 'فترةٌ مفتوحة'); assert.equal(ir(p(1447, 4, 2), p(1447, 4, 2)).r, 'deny', 'مغلقةٌ بلا نافذة');
  assert.equal(ir(p(1447, 4, 2), p(1447, 4, 2), { retroWin: { 'd1|irshad': [{ id: 'w', scope: { y: 1447, m: 4 }, until: 999 }] } }).r, 'allow', 'نافذةٌ سارية');
  assert.equal(ir(p(1447, 4, 2), p(1447, 4, 2), { retroWin: { 'd1|irshad': [{ id: 'w', scope: { y: 1447, m: 4 }, until: 9 }] } }).r, 'deny', 'نافذةٌ انتهت');
  assert.equal(ir(p(1447, 4, 2), p(1447, 4, 2), { actor: { role: 'super', ekey: 'x', id: 's' } }).r, 'deny', 'D4‑03: مديرُ النظام أيضاً بلا تجاوز');
  assert.equal(D.DateRange(pr(p(1447, 5, 1), p(1447, 5, 1)), 'k', c(), 'bassam_tasks_v1').r, 'allow', 'موردٌ بلا نموذج قفل');
  assert.equal(D.DateRange(pr(p(1447, 5, 1), p(1447, 5, 1), { lock: { locked: null, why: 'w' } }), 'k', c()).r, 'unknown');
  assert.equal(D.DateRange(pr(p(1447, 5, 1), p(1447, 5, 1), { lock: { locked: true, why: 'w' } }), 'k', c({ actor: { role: 'super' } }), 'bassam_dstats_v1').r, 'deny', 'D4‑02: dslock يشمل مدير النظام');
  assert.equal(D.DateRange(pr(p(1447, 5, 1), p(1447, 5, 1), { lock: { locked: true, why: 'w' } }), 'k', c(), 'bassam_plan_v1').r, 'deny');
  assert.equal(D.DateRange(pr(p(1447, 5, 1), p(1447, 5, 1), { lock: { locked: false, why: 'open' } }), 'k', c()).r, 'allow');
});
test('evaluate · evaluateWrite · evaluateRead · readKeysFor · validate: التركيبُ عبر المفاتيح · العناصرُ كلُّها (Bulk) · أفضلُ مفاتيح القراءة', () => {
  const kDept = keyWith(['Department', 'Branch'], (k, e) => e.scopeDims.length === 2), kTask = keyWith(['Assigned', 'Own']);
  const ctx = (o) => Object.assign({ dept: 'd1', today: T, deptInScope: (d) => d === 'd1', allowedDepts: ['d1'], actor: { role: 'staff', ekey: 'e1', id: 'u1' } }, o || {});
  const r1 = S.evaluate(kDept, null, 'bassam_custody_v1', { items: [] }, { items: [{ name: 'أ' }] }, ctx());
  assert.equal(r1.composite, 'allow'); assert.equal(r1.bulk.items, 1); assert.deepEqual(r1.dims.sort(), ['Branch', 'Department']);
  const r2 = S.evaluate(kDept, { role: 'staff' }, 'bassam_custody_v1', { items: [] }, { items: [{ name: 'أ' }] }, { dept: 'd1' });
  assert.equal(r2.composite, 'deny', 'بلا deptInScope ⇒ خارج النطاق (الافتراضي آمن)');
  const row = (id, owner) => { const r = new Array(15).fill(''); r[13] = id; r[14] = owner; return r; };
  const ta = { '1447-05-12': [row('t1', 'e1'), row('t2', 'e2')] }, tb = { '1447-05-12': [row('t1', 'e1'), row('t2', 'e2'), row('t3', 'e1')] };
  const w1 = S.evaluateWrite([kTask, 'no.such.key'], null, 'bassam_tasks_v1', ta, tb, ctx({ locks: { tasks: {} } }));
  assert.equal(w1.items, 1); assert.ok(w1.perKey[kTask] && !w1.perKey['no.such.key'], 'المفتاحُ المجهول يُتخطّى'); assert.equal(w1.composite, 'allow', 'مهمّةٌ لنفسه');
  const w2 = S.evaluateWrite([kTask], null, 'bassam_tasks_v1', ta, { '1447-05-12': [row('t1', 'e9'), row('t2', 'e9')] }, ctx({ locks: { tasks: {} } }));
  assert.equal(w2.composite, 'deny'); assert.ok(w2.denyDims.length && w2.bulk.denied >= 1 && w2.transitions.length >= 1, 'Bulk: كلُّ عنصرٍ متأثر · الانتقالاتُ تُعلَن');
  const w3 = S.evaluateWrite([kTask], null, 'bassam_tasks_v1', ta, tb, ctx());
  assert.equal(w3.composite, 'unknown', 'الأقفالُ غيرُ محمَّلة ⇒ دليلٌ ناقص'); assert.ok(w3.missingEvidence.indexOf('DateRange') !== -1);
  assert.equal(S.evaluateWrite([], null, 'bassam_tasks_v1', ta, tb, ctx()).composite, 'not_applicable');
  const kSite = keyWith(['Site'], (k, e) => e.scopeDims.indexOf('Assigned') === -1);
  const w4 = S.evaluateWrite([kSite], null, 'bassam_plan_v1', { floors: [] }, { floors: [{ sid: 's1' }] }, ctx());
  assert.ok(w4.migrationNeeded.indexOf('Site') !== -1, 'Site غيرُ مهاجر للموظف ⇒ migrationNeeded');
  const rk = S.readKeysFor('bassam_tasks_v1'); assert.equal(rk.known, true); assert.ok(rk.keys.length >= 1);
  assert.deepEqual(S.readKeysFor('bassam_nope_v1'), { known: false, cls: 'unknown-resource', keys: [], sources: {}, routes: [] });
  const rd0 = S.evaluateRead([], null, 'bassam_tasks_v1', tb, ctx()); assert.equal(rd0.why, 'no-read-key'); assert.equal(rd0.rows.notApplicable, rd0.items);
  const rd = S.evaluateRead(['task.view', 'task.view'], null, 'bassam_tasks_v1', tb, ctx({ held: {} })); assert.deepEqual(rd.keys, ['task.view'], 'المفاتيحُ بلا تكرار');
  assert.equal(rd.rows.items, 3); assert.equal(rd.rows.allowed + rd.rows.denied + rd.rows.unknown + rd.rows.notApplicable, 3);
  assert.equal(rd.rows.denied, 1, 'مهمّةُ غيره مرفوضةٌ قراءةً (Assigned)'); assert.equal(rd.composite, 'deny'); assert.ok(rd.rows.firstDenyReasons.length >= 1);
  const rdAlt = S.evaluateRead(rk.keys, null, 'bassam_tasks_v1', tb, ctx({ held: {} }));
  assert.deepEqual(rk.keys, ['task.view', 'backup.view']); assert.equal(rdAlt.rows.denied, 0, 'مفاتيحُ القراءة منحٌ بديلة: backup.view (القسمُ والفرع وحدهما) يُظهر السجلّ'); assert.deepEqual(rdAlt.rows.firstDenyReasons, [], 'أسبابُ الرفض تُعرض فقط إن بقي سجلٌّ مرفوضاً');
  const rdH = S.evaluateRead(rk.keys, null, 'bassam_tasks_v1', tb, ctx({ held: Object.fromEntries(rk.keys.map(k => [k, true])) })); assert.equal(rdH.rows.denied, 0, 'حاملُ المفتاح يقرأ الكلّ'); assert.deepEqual(rdH.rows.firstDenyReasons, []); assert.equal(rdH.heldKeys, rdH.keys.length);
  const v = S.validate(); assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.equal(v.dims, 10); assert.equal(v.evaluators, 10);
});
