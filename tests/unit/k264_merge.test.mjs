/* KIVO_264 · D-6 (عالٍ) — فقدُ تعديل الزميل في دمج القوائم (أدلةُ التدقيق t7 · t8 مُكيَّفةً للمستودع).
   العيب: الدمجُ الثلاثيّ في الواجهة (280: merge3/m3/idField) لا يعرف هويةَ عناصر المنصة (uid للعناصر · sid للمواقع · ekey لصفوف
   التقرير · الخانة 13 لصفّ المهمة)، فالقائمةُ بلا id/eid تُحسم «نسختي تغلب» كاملةً: تعديلُ الزميل على عنصرٍ آخر يضيع بصمت.
   المطلوب: دمجٌ بالهوية الثابتة، وحين تغيب الهويةُ أو تلتبس: تعارضٌ صريحٌ يُبلَّغ (الشريطُ القائم) لا إسقاطٌ صامت. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, applySql, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { loadClient, sleep, fixture, cp, pageText } from './k264_vm.mjs';

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
  const K = 'bsdept:d1:bassam_options_v1', base = JSON.stringify({ type: ['X', 'k'] }), theirs = JSON.stringify({ type: ['A1', 'A2', 'k'] });
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

/* ── من طرفٍ إلى طرف (الخادمُ الحقيقي · مستخدمان · الوضعان): كلا التعديلين على الخادم وعند التبويبين ── */
const KR = 'bsdept:tst_d1:bassam_rounds_v1', KT = 'bsdept:tst_d1:bassam_tasks_v1';
const CASES = [
  { name: 'rounds (different floors)', k: KR, a: ['0000000111', '70111'], b: ['0000000114', '70114'],
    editA: (v) => { const d = Object.keys(v)[0]; v[d].d[0].zones[1].fst = 'open'; delete v[d].d[0].zones[1].cWhy; return v; },
    editB: (v) => { const d = Object.keys(v)[0]; v[d].d[1].zones[1].fst = 'open'; delete v[d].d[1].zones[1].cWhy; return v; },
    hasA: (v) => { const d = Object.keys(v)[0]; return v[d].d[0].zones[1].fst === 'open'; }, hasB: (v) => { const d = Object.keys(v)[0]; return v[d].d[1].zones[1].fst === 'open'; } },
  { name: 'tasks (two new tasks, same day)', k: KT, a: ['0000000111', '70111'], b: ['0000000101', '70101'],
    editA: (v) => { const d = Object.keys(v)[0]; const r = cp(v[d][0]); r[0] = 'TEST_ONLY task A'; r[13] = Date.now() + 1; r[22] = null; v[d].push(r); return v; },
    editB: (v) => { const d = Object.keys(v)[0]; const r = cp(v[d][0]); r[0] = 'TEST_ONLY task B'; r[13] = Date.now() + 2; r[22] = null; v[d].push(r); return v; },
    hasA: (v) => Object.values(v).some(L => Array.isArray(L) && L.some(r => r[0] === 'TEST_ONLY task A')), hasB: (v) => Object.values(v).some(L => Array.isArray(L) && L.some(r => r[0] === 'TEST_ONLY task B')) }
];
for (const mode of ['legacy', 'enforce']) for (const K of CASES) test('[' + mode + '] D-6 (طرفٌ لطرف): ' + K.name + ' — لا يضيع تعديلُ الحافظ الأول', async () => {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : { KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const LA = await C.login(...K.a), LB = await C.login(...K.b); assert.ok(LA.ok && LB.ok);
  const bA = (await C.boot(LA.ck)).boot, bB = (await C.boot(LB.ck)).boot; assert.ok(bA.keys[K.k] && bB.keys[K.k], 'التبويبان يقرآن ' + K.k);
  const A = loadClient({ C, boot: bA, jar: { cookie: LA.ck } }), B = loadClient({ C, boot: bB, jar: { cookie: LB.ck } });
  try {
    /* الإنفاذ: تغييرُ حالة المصلى يتطلب سبباً (§12) — يُعطى سلفاً كما تعطيه نافذةُ السبب */
    A.W.KIVO.__BS_SRV.why(K.k, 'TEST_ONLY سبب A'); B.W.KIVO.__BS_SRV.why(K.k, 'TEST_ONLY سبب B');
    A.set(K.k, JSON.stringify(K.editA(JSON.parse(A.get(K.k)))));
    await sleep(20);
    B.set(K.k, JSON.stringify(K.editB(JSON.parse(B.get(K.k)))));
    await sleep(3200);
    const srv = JSON.parse(env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', K.k).map(r => r.v).join(''));
    const st = { A_denied: A.W.KIVO.__BS_SRV.denied(), B_denied: B.W.KIVO.__BS_SRV.denied(), A_onServer: K.hasA(srv), B_onServer: K.hasB(srv),
      A_tab: K.hasA(JSON.parse(A.get(K.k))) && K.hasB(JSON.parse(A.get(K.k))), B_tab: K.hasA(JSON.parse(B.get(K.k))) && K.hasB(JSON.parse(B.get(K.k))) };
    assert.equal(st.A_denied + st.B_denied, 0, 'التعديلان مأذونان: ' + JSON.stringify(st));
    assert.ok(st.A_onServer && st.B_onServer, 'كلا التعديلين على الخادم: ' + JSON.stringify(st));
    assert.ok(st.A_tab && st.B_tab, 'والتبويبان يلتقيان على القيمة نفسِها: ' + JSON.stringify(st));
  } finally { A.dispose(); B.dispose(); }
});
