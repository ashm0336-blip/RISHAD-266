/* KIVO_264 · D-6 (عالٍ) — فقدُ تعديل الزميل في دمج القوائم (أدلةُ التدقيق t7 · t8 مُكيَّفةً للمستودع).
   العيب: الدمجُ الثلاثيّ في الواجهة (280: merge3/m3/idField) لا يعرف هويةَ عناصر المنصة (uid للعناصر · sid للمواقع · ekey لصفوف
   التقرير · الخانة 13 لصفّ المهمة)، فالقائمةُ بلا id/eid تُحسم «نسختي تغلب» كاملةً: تعديلُ الزميل على عنصرٍ آخر يضيع بصمت.
   المطلوب: دمجٌ بالهوية الثابتة، وحين تغيب الهويةُ أو تلتبس: تعارضٌ صريحٌ يُبلَّغ (الشريطُ القائم) لا إسقاطٌ صامت. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadClient, sleep, fixture, cp, pageText } from './k264_vm.mjs';
import { world, tab, roundsPage, tasksPage, KR, KT } from './k264_opconflict_fx.mjs';

const offline = { req: async () => { throw new Error('offline'); } };
function merger() {
  const T = loadClient({ C: offline, boot: { srv: 1, cf: 1, v: 1, keys: {}, revs: {} } });
  const M = T.W.KIVO.__BS_SRV.merge3;
  /* k: مفتاحُ التخزين كما تمرّره settle (KIVO_264 · المراجعة A3c: الهويةُ من خريطة المورد) — بلا مفتاح: الدمجُ الآمن بالمحاذاة */
  const run = (b, m, t, k) => { const r = M(b === undefined ? null : JSON.stringify(b), JSON.stringify(m), JSON.stringify(t), k); return { v: JSON.parse(r.v), c: r.c || 0, l: r.l || 0 }; };
  /* قائمةُ عناصر الخريطة (uid) في موضعها الحقيقي: رأسُ الخطة التشغيلية */
  const runZ = (b, m, t) => { const r = run({ zones: b }, { zones: m }, { zones: t }, 'bsdept:tst_d1:bassam_plan_v1'); return { v: r.v.zones, c: r.c, l: r.l }; };
  return { T, run, runZ };
}

test('D-6 (وحدة): أشكالُ المنصة الحقيقية — المواقع · مواقعُ الخطة · صفوفُ المهام · صفوفُ التقرير اليومي: لا يضيع تعديلُ الزميل', () => {
  const DK = fixture().json.deptKeys; const { T, run } = merger();
  try {
    const res = [];
    /* ١ · الجولات: A يُغلق مصلى في الموقع ١ و B (الحافظُ الثاني) يُغلق مصلى في الموقع ٢ */
    const R = DK['bsdept:tst_d1:bassam_rounds_v1']; const day = Object.keys(R)[0];
    const rA = cp(R), rB = cp(R);
    rA[day].d[0].zones[0].fst = 'closed'; rA[day].d[0].zones[0].cWhy = 'TEST_ONLY A';
    rB[day].d[1].zones[0].fst = 'closed'; rB[day].d[1].zones[0].cWhy = 'TEST_ONLY B';
    let r = run(R, rB, rA, 'bsdept:tst_d1:bassam_rounds_v1'); res.push(['rounds', r, r.v[day].d[0].zones[0].cWhy === 'TEST_ONLY A' && r.v[day].d[1].zones[0].cWhy === 'TEST_ONLY B']);
    /* ٢ · الخطة: A يسمّي الموقع ١ و B يسمّي الموقع ٢ */
    const P = DK['bsdept:tst_d1:bassam_plan_v1']; const pA = cp(P), pB = cp(P);
    pA.floors[0].name = 'TEST_ONLY A'; pB.floors[1].name = 'TEST_ONLY B';
    r = run(P, pB, pA, 'bsdept:tst_d1:bassam_plan_v1'); res.push(['plan', r, r.v.floors[0].name === 'TEST_ONLY A' && r.v.floors[1].name === 'TEST_ONLY B']);
    /* ٣ · المهام: كلٌّ يضيف مهمةً لليوم نفسه */
    const TK = DK['bsdept:tst_d1:bassam_tasks_v1']; const td = Object.keys(TK)[0]; const tA = cp(TK), tB = cp(TK);
    const row = (id, s) => { const x = cp(TK[td][0]); x[0] = s; x[13] = id; return x; };
    tA[td].push(row(9001, 'TEST_ONLY task A')); tB[td].push(row(9002, 'TEST_ONLY task B'));
    r = run(TK, tB, tA, 'bsdept:tst_d1:bassam_tasks_v1'); res.push(['tasks', r, r.v[td].some(x => x[13] === 9001) && r.v[td].some(x => x[13] === 9002) && r.v[td].length === TK[td].length + 2]);
    /* ٤ · التقرير اليومي: مشرفان يسجّلان حالتين لموظفَين مختلفَين في كشف الوردية نفسِها */
    const DR = DK['bsdept:tst_d1:bassam_dreport_v1']; const dd = Object.keys(DR)[0]; const sh = Object.keys(DR[dd].shifts)[0];
    const dA = cp(DR), dB = cp(DR); dA[dd].shifts[sh].roster[0].st = 'ab'; dB[dd].shifts[sh].roster[1].st = 'lv';
    r = run(DR, dB, dA, 'bsdept:tst_d1:bassam_dreport_v1'); res.push(['dreport', r, r.v[dd].shifts[sh].roster[0].st === 'ab' && r.v[dd].shifts[sh].roster[1].st === 'lv']);
    /* الضابط: الموظفون (eid) كانوا يُدمجون عنصراً عنصراً من قبل */
    const E = DK['bsdept:tst_d1:bassam_employees_v1']; const eA = cp(E), eB = cp(E);
    eA[0].name = 'TEST_ONLY A'; eB[1].name = 'TEST_ONLY B';
    r = run(E, eB, eA, 'bsdept:tst_d1:bassam_employees_v1'); res.push(['employees', r, r.v[0].name === 'TEST_ONLY A' && r.v[1].name === 'TEST_ONLY B']);
    for (const [n, x, ok] of res) {
      assert.ok(ok, n + ': تعديلُ الزميل وتعديلي كلاهما في الناتج');
      assert.equal(x.c + x.l, 0, n + ': عناصرُ مختلفة ⇒ لا تعارضَ يُحصى');
    }
  } finally { T.dispose(); }
});

test('D-6 (وحدة): دلالاتُ الهوية — الحذف · التعديل مقابل الحذف · القائمةُ الجديدة عند الطرفين · الترتيب', () => {
  const { T, run, runZ } = merger();
  try {
    const z = (uid, o) => Object.assign({ uid, name: uid, fst: 'open' }, o || {});
    const base = [z('u1'), z('u2'), z('u3')];
    /* حذفه هو ولم أغيّره ⇒ يُحذف */
    let r = runZ(base, base, [z('u1'), z('u3')]);
    assert.deepEqual(r.v.map(x => x.uid), ['u1', 'u3']); assert.equal(r.c + r.l, 0);
    /* عدّلتُه أنا وحذفه هو ⇒ يبقى تعديلي ويُحصى تعارضاً (لا صمت) */
    r = runZ(base, [z('u1'), z('u2', { fst: 'closed' }), z('u3')], [z('u1'), z('u3')]);
    assert.ok(r.v.some(x => x.uid === 'u2' && x.fst === 'closed')); assert.ok(r.c >= 1);
    /* حذفتُه أنا وعدّله هو ⇒ يبقى تعديلُه، ويُبلَّغ أن حذفي لم يُطبَّق */
    r = runZ(base, [z('u1'), z('u3')], [z('u1'), z('u2', { fst: 'closed' }), z('u3')]);
    assert.ok(r.v.some(x => x.uid === 'u2' && x.fst === 'closed')); assert.ok(r.l >= 1);
    /* يومٌ جديد أنشأه الطرفان معاً (لا أساس): المهمتان كلتاهما */
    const t = (id, s) => { const x = new Array(22).fill(null); x[0] = s; x[13] = id; return x; };
    r = run({ a: [] }, { a: [], '1448-9-9': [t(11, 'B')] }, { a: [], '1448-9-9': [t(10, 'A')] }, 'bsdept:tst_d1:bassam_tasks_v1');
    assert.deepEqual(r.v['1448-9-9'].map(x => x[0]).sort(), ['A', 'B']); assert.equal(r.c + r.l, 0);
    /* أعاد هو الترتيب وعدّلتُ أنا عنصراً ⇒ ترتيبُه وتعديلي */
    r = runZ(base, [z('u1'), z('u2', { name: 'mine' }), z('u3')], [z('u3'), z('u1'), z('u2')]);
    assert.deepEqual(r.v.map(x => x.uid), ['u3', 'u1', 'u2']); assert.equal(r.v[2].name, 'mine'); assert.equal(r.c + r.l, 0);
    /* إضافتان متزامنتان في آخر القائمة ⇒ كلتاهما، الأسبقُ حفظاً أولاً */
    r = runZ(base, base.concat([z('m9')]), base.concat([z('t9')]));
    assert.deepEqual(r.v.map(x => x.uid), ['u1', 'u2', 'u3', 't9', 'm9']);
    /* حقلُ الهوية يجب أن يكون فريداً: eid مكرَّرٌ في سجل الحركات ليس هويةً (كان يُسقط حركاتٍ بلا إنذار) */
    const mv = (eid, ser) => ({ t: 'out', eid, item: 'TEST_ONLY جهاز', ser });
    const b2 = [mv('e1', 'S1'), mv('e1', 'S2')];
    r = run(b2, b2.concat([mv('e2', 'S3')]), b2.concat([mv('e1', 'S4')]), 'bsdept:tst_d1:bassam_custody_v1');
    assert.deepEqual(r.v.map(x => x.ser).sort(), ['S1', 'S2', 'S3', 'S4']); assert.equal(r.c + r.l, 0);
  } finally { T.dispose(); }
});

test('D-6 (وحدة): القوائمُ بلا هوية — مجموعاتٌ وسجلّاتٌ وصفوفٌ موضعية تُدمج، وما يلتبس يُبلَّغ صراحةً ولا يُسقط بصمت', () => {
  const { T, run } = merger();
  try {
    /* مجموعةُ إسناد: حذفتُ b وأضفتُ x، وحذف هو a وأضاف y ⇒ {c, x, y} بلا تعارض */
    let r = run(['a', 'b', 'c'], ['a', 'c', 'x'], ['b', 'c', 'y']);
    assert.deepEqual(r.v.slice().sort(), ['c', 'x', 'y']); assert.equal(r.c + r.l, 0);
    /* تعديلان متجاوران في المكان (عنصران مختلفان بلا هوية) ⇒ كلاهما */
    const o = (n, v) => ({ name: n, v });
    r = run([o('p', 1), o('q', 1)], [o('p', 2), o('q', 1)], [o('p', 1), o('q', 3)]);
    assert.deepEqual(r.v, [o('p', 2), o('q', 3)]); assert.equal(r.c + r.l, 0);
    /* صفُّ مهمةٍ موضعيّ: غيّرتُ الحالة وغيّر هو العنوان ⇒ كلاهما */
    const row = ['عنوان', '', 'med', 'pending', null, null, null, ['e1'], '', null, null, null, null, 77, 'e1', null, null, null, null, null, null, null];
    const rm = cp(row); rm[3] = 'done'; const rt = cp(row); rt[0] = 'عنوان جديد';
    r = run(row, rm, rt); assert.equal(r.v[3], 'done'); assert.equal(r.v[0], 'عنوان جديد'); assert.equal(r.c + r.l, 0);
    /* التباس: كلانا استبدل العنصرَ نفسَه بقيمٍ مختلفة العدد ⇒ تبقى قيمتُه المحفوظة ويُحصى «لم يُطبَّق تعديلك» (l) — لا صمت */
    r = run(['X', 'k'], ['B1', 'k'], ['A1', 'A2', 'k']);
    assert.deepEqual(r.v, ['A1', 'A2', 'k']); assert.ok(r.l >= 1, 'تعارضٌ صريح يُبلَّغ لمن لم يُطبَّق تعديلُه');
    /* الخانةُ نفسُها بقيمتين ⇒ قيمتي تُعتمد ويُحصى تعارضاً (الدلالةُ القائمة · الشريط «واعتُمدت قيمتك») */
    r = run({ a: 1 }, { a: 2 }, { a: 3 }); assert.equal(r.v.a, 2); assert.equal(r.c, 1);
    /* خاصيّة: في كلّ دمجٍ إمّا يبقى التعديلان وإمّا يُحصى تعارض — لا ضياعَ صامت */
    const cases = [[['a'], ['a', 'm'], ['a', 't']], [[1, 2, 3], [1, 3], [1, 2]], [[{ x: 1 }, { x: 2 }], [{ x: 1 }], [{ x: 2 }, { x: 9 }]], [['p', 'q'], ['q', 'p'], ['p', 'q', 'r']]];
    for (const [b, m, t] of cases) {
      const x = run(b, m, t); const s = JSON.stringify(x.v);
      const lostT = t.some(e => !b.some(y => JSON.stringify(y) === JSON.stringify(e)) && !s.includes(JSON.stringify(e)));
      const lostM = m.some(e => !b.some(y => JSON.stringify(y) === JSON.stringify(e)) && !s.includes(JSON.stringify(e)));
      assert.ok(!(lostT || lostM) || x.c + x.l > 0, 'لا إضافةَ تضيع بلا تعارضٍ معلن: ' + JSON.stringify([b, m, t, x]));
    }
  } finally { T.dispose(); }
});

test('D-6 (الشريط): التعارضُ الملتبس يُعلَن لصاحبه بنصٍّ صريح، واسمُ الزميل يُهرَّب (لا HTML من الخادم)', async () => {
  /* خادمٌ وهميّ: الحفظُ يعود بتعارضٍ على مفتاحٍ قيمتُه عند الزميل قائمةٌ استُبدل فيها العنصرُ نفسُه */
  const K = 'bsdept:d1:bassam_perm_help_v1', base = JSON.stringify({ type: ['X', 'k'] }), theirs = JSON.stringify({ type: ['A1', 'A2', 'k'] });
  let n = 0; const sent = [];
  const C = { req: async (p, o) => {
    if (p.startsWith('/api/save')) { n++; sent.push(JSON.parse(o.body)); return new Response(JSON.stringify(n === 1 ? { ok: 1, conflicts: { [K]: { cur: theirs, rev: 7, by: '<img src=x onerror=alert(1)>زميل', at: Date.now() } } } : { ok: 1, revs: { [K]: 8 } }), { status: 200 }); }
    if (p.startsWith('/api/changes')) return new Response(JSON.stringify({ v: 1, keys: [] }), { status: 200 });
    return new Response('{}', { status: 200 });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, v: 1, uid: 'u_b', keys: { [K]: base }, revs: { [K]: 6 } }, blocks: ['280-server-storage.js', '440-count.js'] });
  try {
    T.set(K, JSON.stringify({ type: ['B1', 'k'] }));
    await sleep(600);
    assert.equal(JSON.parse(T.get(K)).type.join(','), 'A1,A2,k', 'تبقى قيمةُ الزميل المحفوظة — لا تُمحى بصمت');
    const txt = pageText(T.W);
    assert.match(txt, /تعذّر دمجُ تعديلك/, 'الشريطُ يقول صراحةً إن تعديلي لم يُطبَّق: ' + txt.slice(0, 300));
    const ban = T.W.document.body.children.find(x => x.id === 'bs-conflict');
    assert.ok(ban && !/<img/.test(ban.innerHTML) && /&lt;img/.test(ban.innerHTML), 'اسمُ الزميل نصٌّ مهرَّب لا عنصر HTML');
  } finally { T.dispose(); }
});

/* ── من طرفٍ إلى طرف (الخادمُ الحقيقي · مستخدمان · الوضعان) ──
   RISHAD-266 · قرارُ المالك (d) 2026-11-03: الجولاتُ والمهامّ مواردُ تشغيلية (Operations) — التحريرُ المتزامن تعارضٌ بلا فقد:
   الحفظُ الأول من الأساس نفسِه يُعتمد، والثاني يُرفض بحالة تعارضٍ صريحة (409 · conflict) ولا يُدمج منه شيءٌ تلقائياً،
   ثم يعيد صاحبُه القراءة ويحاول فيثبت تعديلُه أيضاً. كان هذا الاختبارُ يشترط الدمجَ الثلاثيّ المتقاعد (كلا التعديلين بلا إعادة قراءة)؛
   أُعيدت كتابتُه على العقد الحالي بالصرامة نفسِها: لا يضيع تعديلُ أيٍّ من الطرفين، ولا يُكتم الرفض، ولا تتسرّب قيمةٌ لم تُعتمد. */
const CASES = [
  { name: 'rounds (different floors)', k: KR, page: roundsPage, a: ['0000000111', '70111'], b: ['0000000114', '70114'],
    editA: (v) => { const d = Object.keys(v)[0]; v[d].d[0].zones[1].fst = 'open'; delete v[d].d[0].zones[1].cWhy; return v; },
    editB: (v) => { const d = Object.keys(v)[0]; v[d].d[1].zones[1].fst = 'open'; delete v[d].d[1].zones[1].cWhy; return v; },
    hasA: (v) => { const d = Object.keys(v)[0]; return v[d].d[0].zones[1].fst === 'open'; }, hasB: (v) => { const d = Object.keys(v)[0]; return v[d].d[1].zones[1].fst === 'open'; },
    /* daily/logic.js _opCommit يعرض شرحَ الخدمة (operations.explain): التعارضُ يُسمّى تعارضاً ويقول ما العمل */
    told: /حفظ غيرُك هذا السجلَّ قبلك[\s\S]*لم تُحفظ مسودتك[\s\S]*أعد تحميل الصفحة/ },
  { name: 'tasks (two new tasks, same day)', k: KT, page: tasksPage, a: ['0000000111', '70111'], b: ['0000000101', '70101'],
    editA: (v) => { const d = Object.keys(v)[0]; const r = cp(v[d][0]); r[0] = 'TEST_ONLY task A'; r[13] = Date.now() + 1; r[22] = null; v[d].push(r); return v; },
    editB: (v) => { const d = Object.keys(v)[0]; const r = cp(v[d][0]); r[0] = 'TEST_ONLY task B'; r[13] = Date.now() + 2; r[22] = null; v[d].push(r); return v; },
    hasA: (v) => Object.values(v).some(L => Array.isArray(L) && L.some(r => r[0] === 'TEST_ONLY task A')), hasB: (v) => Object.values(v).some(L => Array.isArray(L) && L.some(r => r[0] === 'TEST_ONLY task B')),
    /* tasks/logic.js _tkChange يعرض شرحَ الخدمة نفسَه */
    told: /حفظ غيرُك هذا السجلَّ قبلك[\s\S]*لم تُحفظ مسودتك[\s\S]*أعد تحميل الصفحة/ }
];
for (const mode of ['legacy', 'enforce']) for (const K of CASES) test('[' + mode + '] D-6 (طرفٌ لطرف · قرار المالك d): ' + K.name + ' — الحفظُ الثاني تعارضٌ صريح بلا دمج، ثم إعادةُ القراءة والمحاولة تُثبت التعديلين', async () => {
  const Wd = await world(mode), name = K.k.split(':')[2];
  const A = await tab(Wd, ...K.a), B = await tab(Wd, ...K.b);
  try {
    const why = (T, s) => T.W.KIVO.__BS_SRV.why(K.k, 'TEST_ONLY سبب ' + s);   /* الإنفاذ: تغييرُ حالة المصلى يتطلب سبباً (§12) */
    /* التبويبان يقرآن الأساسَ نفسَه، وتلتقط كلُّ صفحةٍ مسودتَها منه */
    const rdA = await A.ops.read([K.k]), rdB = await B.ops.read([K.k]);
    assert.ok(rdA.ok === 1 && rdB.ok === 1 && !rdA.denied.length && !rdB.denied.length, 'التبويبان يقرآن ' + K.k);
    assert.equal(rdA.base[K.k], rdB.base[K.k], 'الأساسُ نفسُه');
    const original = Wd.server(K.k); assert.ok(!K.hasA(original) && !K.hasB(original));
    const pA = K.page(A), pB = K.page(B);

    /* (1) الأولُ يحفظ فيُعتمد */
    why(A, 'A'); const rA = await pA.save(K.editA);
    assert.equal(rA && rA.ok, 1, 'حفظُ الأول يُعتمد: ' + JSON.stringify(rA).slice(0, 300));
    const afterA = Wd.server(K.k);
    assert.ok(K.hasA(afterA) && !K.hasB(afterA), 'تعديلُ الأول على الخادم');

    /* (2) الثاني من الأساس القديم: يُرفض بتعارضٍ صريح — لا دمج، لا كتابة جزئية، لا قيمةَ تتسرّب */
    why(B, 'B'); const rB = await pB.save(K.editB);
    assert.equal(rB.ok, 0, 'الحفظُ الثاني لا يُعتمد');
    assert.deepEqual({ err: rB.err, status: rB.status, uncertain: rB.uncertain }, { err: 'conflict', status: 409, uncertain: false }, 'تعارضٌ صريح محسوم (لا «غير مؤكَّد»): ' + JSON.stringify(rB).slice(0, 300));
    assert.equal(B.ops.status(rB.ticket).state, 'conflict', 'حالةُ الطلب عند صاحبه: conflict');
    assert.equal(B.posts(), 1, 'طلبٌ واحد — لا إعادةَ إرسالٍ ولا دمجَ آليّ');
    assert.deepEqual(Wd.server(K.k), afterA, 'الخادمُ لم يتغيّر: لا شيء من تعديل الثاني دُمج');
    assert.equal(B.ops.state(name), 'unloaded', 'تبويبُ الثاني لا يعرض قيمتَه المرفوضة كأنها محفوظة — يجب أن يعيد القراءة');
    assert.throws(() => B.ops.get(name), /operations-read-required/, 'ولا تُقرأ قيمةٌ قديمة أو مرفوضة قبل إعادة القراءة');
    /* ما يراه المستخدم: رسالةُ رفضٍ تحذيرية للثاني وحدَه، لا «حُفظ» */
    assert.equal(pB.toasts.length, 1, 'رسالةٌ واحدة للثاني: ' + JSON.stringify(pB.toasts));
    assert.equal(pB.toasts[0].tone, 'warn'); assert.match(pB.toasts[0].m, K.told);
    assert.doesNotMatch(pB.toasts[0].m, /أعد المحاولة بنفس/, 'لا تُدعى إعادةُ المحاولة نفسِها في تعارض');
    assert.deepEqual(pA.toasts, [], 'لا رسالةَ رفضٍ للأول');

    /* (3) إعادةُ القراءة: التبويبان يريان تعديلَ الأول، ولا أثرَ لتعديل الثاني المرفوض */
    if (pB.reread) await pB.reread(); else assert.equal((await B.ops.read([K.k])).ok, 1);
    assert.equal((await A.ops.read([K.k])).ok, 1);
    for (const [who, T] of [['A', A], ['B', B]]) { const v = T.ops.get(name); assert.ok(K.hasA(v) && !K.hasB(v), who + ' بعد إعادة القراءة يرى تعديلَ الأول وحده'); }

    /* (4) الثاني يعيد المحاولة على القيمة الجديدة فيثبت تعديلُه أيضاً — لا ضياعَ صامت */
    /* الصفحةُ نفسُها بلا إعادة تحميل لا تعيد إرسال المسودة المرفوضة (لا إرسالَ أعمى ولا تطبيقَ آليّ على القيمة الجديدة) —
       ولذلك تقول الرسالةُ «أعد تحميل الصفحة». الطريقُ: صفحةٌ أُعيد تحميلها (مسودةٌ جديدة من القيمة المقروءة) */
    why(B, 'B'); let rSame; try { rSame = await pB.save(K.editB); } catch (e) { assert.match(String(e && e.message), /^operations-draft-review-required$/, 'رفضٌ صريح للمسودة القديمة: ' + e); rSame = { ok: 0 }; }
    assert.notEqual(rSame && rSame.ok, 1, 'الصفحةُ نفسُها لا تعتمد المسودةَ المرفوضة دون إعادة تحميل');
    assert.equal(B.posts(), 1, 'ولا ترسل شيئاً');
    assert.deepEqual(Wd.server(K.k), afterA, 'والخادمُ كما هو');
    const pB2 = K.page(B);
    why(B, 'B'); const rB2 = await pB2.save(K.editB);
    assert.equal(rB2 && rB2.ok, 1, 'إعادةُ المحاولة بعد القراءة تُعتمد: ' + JSON.stringify(rB2).slice(0, 300));
    assert.equal(B.posts(), 2, 'طلبٌ ثانٍ واحد: المحاولةُ المقصودة');
    const final = Wd.server(K.k);
    assert.ok(K.hasA(final) && K.hasB(final), 'كلا التعديلين على الخادم');
    assert.equal((await A.ops.read([K.k])).ok, 1);
    for (const [who, T] of [['A', A], ['B', B]]) { const v = T.ops.get(name); assert.ok(K.hasA(v) && K.hasB(v), who + ' يرى التعديلين'); }
    assert.equal(A.W.KIVO.__BS_SRV.denied() + B.W.KIVO.__BS_SRV.denied(), 0, 'لا رفضَ صلاحية — الرفضُ الوحيد كان التعارض');
  } finally { A.dispose(); B.dispose(); }
});
