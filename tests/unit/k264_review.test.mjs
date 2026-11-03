/* KIVO_264 · المراجعةُ المستقلة لفرع k264-arch (scratchpad/k264/review_arch_qa.md) — اختبارٌ يُخفق أولاً لكل ملاحظة ثم الإصلاح:
   A2 حقنُ علامتَي العملية/التدقيق المتقاعدتين لا يغيّر الحفظ، ولا يتسرّب السبب بعد دمجٍ ناتجُه قيمةُ الخادم أو إعادة المحاولة · A3 ضياعٌ صامتٌ متبقٍّ في D-6 (المكتوبُ فوقه لا يُبلَّغ · تبويبا الحساب
   نفسِه · هويةٌ عامة تلتقط مفتاحاً أجنبياً) · A4 الخانة 13 هويةٌ لصفوف المهام وحدها · A5 المجموعاتُ الرقمية القصيرة · A6 اليومُ المختار بلا مخزن ·
   A7 مزامنةُ القراءة للمعنيّين وحدهم. A1 (هويةُ الواجهة من BOOT.uid) في 330 لوكيل «ملفي» — ليس هنا. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, applySql, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
import { loadClient, sleep, until, fixture, cp, pageText, FakeStorage } from './k264_vm.mjs';

const J = (x, st = 200) => new Response(JSON.stringify(x), { status: st, headers: { 'Content-Type': 'application/json' } });
const offline = { req: async () => { throw new Error('offline'); } };
function merger() {
  const T = loadClient({ C: offline, boot: { srv: 1, cf: 1, v: 1, keys: {}, revs: {} } });
  const M = T.W.KIVO.__BS_SRV.merge3;
  const run = (k, b, m, t) => { const r = M(b === undefined ? null : JSON.stringify(b), JSON.stringify(m), JSON.stringify(t), k); return { v: JSON.parse(r.v), c: r.c || 0, l: r.l || 0 }; };
  return { T, run };
}

test('A2: حقنُ علامتَي العملية والتدقيق المتقاعدتين لا يؤثر POST، والتعارض وإعادة المحاولة لا يسرّبان backup.restore أو السبب القديم', async () => {
  const K = 'bsdept:d1:bassam_perm_help_v1', V = JSON.stringify({ type: ['RESTORED'] });
  let n = 0; const bodies = [];
  const C = { req: async (p, o) => {
    if (p.startsWith('/api/save')) { n++; bodies.push(JSON.parse(o.body)); if (n === 2) throw new Error('TEST_ONLY transient save failure'); return J(n === 1 ? { ok: 1, conflicts: { [K]: { cur: V, rev: 9, by: 'زميل', at: Date.now() } } } : { ok: 1, revs: { [K]: 10 + n } }); }
    if (p.startsWith('/api/changes')) return J({ v: 1, keys: [] });
    return J({ ok: 1 });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, v: 1, uid: 'u1', authz: {}, keys: { [K]: JSON.stringify({ type: ['old'] }) }, revs: { [K]: 5 } } });
  try {
    T.W.KIVO.BassamAudit = { events: (k, b, v, rev, mode) => [{ k, mode: mode || '' }] };   /* نمطُ التدقيق ظاهرٌ في الجسم */
    T.W.KIVO.__BS_SRV.why(K, 'TEST_ONLY سبب الاستعادة');
    T.W.KIVO.__BS_OP_MODE = { op: 'backup.restore', ref: 'TEST' }; T.W.KIVO.__BS_AUD_MODE = 'restore';
    T.set(K, V);                                   /* الاستعادةُ تكتب ما حفظه زميلٌ قبلها حرفاً */
    await sleep(600);
    assert.equal(n, 1, 'الدمجُ أعطى قيمةَ الخادم فلا إعادةَ إرسال');
    assert.equal(bodies[0].ops, undefined, 'حقنُ العلامة القديمة لا يحوّل طلب الحفظ إلى استعادة');
    assert.ok(bodies[0].aud.length > 0, 'تدقيقُ الحفظ العادي ما زال موجودًا');
    assert.ok(bodies[0].aud.every(e => e.mode === ''), 'حقنُ نمط الاستعادة لا يغيّر تدقيق الحفظ العادي');
    assert.equal(bodies[0].why[K], 'TEST_ONLY سبب الاستعادة', 'السببُ الصريح يخصّ الطلب الأول وحده');
    T.set(K, JSON.stringify({ type: ['RESTORED', 'TEST_ONLY تعديلٌ عاديّ لاحق'] }));
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), false, 'فشلُ الشبكة لا يُحسب إقرارًا');
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), true, 'تبقى الكتابةُ معلّقة لإعادة المحاولة');
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), true, 'المحاولةُ الصريحة التالية تُقرّ الكتابة');
    assert.equal(n, 3, 'طلبُ التعارض ثم المحاولة المخفقة ثم إقرارها');
    assert.deepEqual(bodies[2], bodies[1], 'إعادةُ المحاولة لا تغيّر الجسم أو السياق');
    const last = bodies[bodies.length - 1];
    assert.equal(last.ops, undefined, 'التعديلُ العاديّ بلا علامة عملية: ' + JSON.stringify(last.ops));
    assert.equal(last.why, undefined, 'ولا سببٍ قديم: ' + JSON.stringify(last.why));
    assert.ok((last.aud || []).every(e => e.mode !== 'restore'), 'ولا نمطِ تدقيق الاستعادة: ' + JSON.stringify(last.aud));
    for (const body of bodies) assert.equal(body.ops, undefined, 'العلامةُ القديمة لا تؤثر أيّ طلب، حتى وهي ما تزال محقونة');
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), false, 'لا بقايا عملية بعد الإقرار');
  } finally { T.dispose(); }
});

test('A3a: مَن كُتب فوق تعديله يُبلَّغ عند السحب التالي (لا الحافظُ اللاحق وحده) — ولا تبليغَ إن بقي تعديلُه قائماً', async () => {
  const K = 'bsdept:d1:bassam_perm_help_v1';
  const S = { rev: 5, cur: JSON.stringify({ type: ['a', 'b'], work: ['w'] }), pend: null };
  const C = { req: async (p, o) => {
    if (p.startsWith('/api/save')) { const b = JSON.parse(o.body); S.cur = b.set[K]; S.rev++; return J({ ok: 1, revs: { [K]: S.rev } }); }
    if (p.startsWith('/api/changes')) { if (S.pend) { S.cur = S.pend; S.pend = null; S.rev++; return J({ v: S.rev, keys: [K] }); } return J({ v: S.rev, keys: [] }); }
    if (p.startsWith('/api/get')) return J({ ok: 1, v: S.rev, keys: { [K]: { v: S.cur, rev: S.rev } } });
    return J({ ok: 1 });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, v: 5, uid: 'u_a', keys: { [K]: S.cur }, revs: { [K]: 5 } }, blocks: ['280-server-storage.js', '440-count.js'] });
  try {
    T.set(K, JSON.stringify({ type: ['a', 'B-mine'], work: ['w'] }));   /* حفظي: b ⇒ B-mine */
    assert.ok(await until(() => S.rev === 6, 2000), 'حُفظ');
    S.pend = JSON.stringify({ type: ['a', 'b'], work: ['w', 'x'] });   /* زميلٌ حفظ فوقه (أعاد الخانة) وأضاف غيرها */
    assert.ok(await until(() => JSON.parse(T.get(K)).work.includes('x'), 5000), 'وصلت قيمةُ الزميل بالسحب');
    await sleep(100);
    assert.match(pageText(T.W), /بعد حفظك/, 'المكتوبُ فوق تعديله يُبلَّغ صراحةً: ' + pageText(T.W).slice(0, 200));
  } finally { T.dispose(); }
  /* ضابط: سحبٌ لا يمسّ ما حفظتُه ⇒ لا تبليغ */
  const S2 = { rev: 5, cur: JSON.stringify({ type: ['a', 'b'], work: ['w'] }), pend: null };
  const C2 = { req: async (p, o) => {
    if (p.startsWith('/api/save')) { const b = JSON.parse(o.body); S2.cur = b.set[K]; S2.rev++; return J({ ok: 1, revs: { [K]: S2.rev } }); }
    if (p.startsWith('/api/changes')) { if (S2.pend) { S2.cur = S2.pend; S2.pend = null; S2.rev++; return J({ v: S2.rev, keys: [K] }); } return J({ v: S2.rev, keys: [] }); }
    if (p.startsWith('/api/get')) return J({ ok: 1, v: S2.rev, keys: { [K]: { v: S2.cur, rev: S2.rev } } });
    return J({ ok: 1 });
  } };
  const T2 = loadClient({ C: C2, boot: { srv: 1, cf: 1, v: 5, uid: 'u_a', keys: { [K]: S2.cur }, revs: { [K]: 5 } }, blocks: ['280-server-storage.js', '440-count.js'] });
  try {
    T2.set(K, JSON.stringify({ type: ['a', 'B-mine'], work: ['w'] }));
    assert.ok(await until(() => S2.rev === 6, 2000));
    S2.pend = JSON.stringify({ type: ['a', 'B-mine'], work: ['w', 'x'] });   /* الزميلُ أبقى تعديلي وأضاف غيره */
    assert.ok(await until(() => JSON.parse(T2.get(K)).work.includes('x'), 5000));
    await sleep(100);
    assert.doesNotMatch(pageText(T2.W), /بعد حفظك/, 'تعديلي قائم ⇒ لا تبليغ');
  } finally { T2.dispose(); }
});

test('[legacy] A3a (طرفٌ لطرف): سباقٌ على الخانة نفسِها — الحافظُ اللاحق يرى «اعتُمدت قيمتك» والأسبقُ يرى «بعد حفظك»', async () => {
  const env = makeTestEnv({ KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  const K = 'bsdept:tst_d1:bassam_rounds_v1';
  const LA = await C.login('0000000111', '70111'), LB = await C.login('0000000114', '70114'); assert.ok(LA.ok && LB.ok);
  const A = loadClient({ C, boot: (await C.boot(LA.ck)).boot, jar: { cookie: LA.ck }, blocks: ['280-server-storage.js', '440-count.js'] });
  const B = loadClient({ C, boot: (await C.boot(LB.ck)).boot, jar: { cookie: LB.ck }, blocks: ['280-server-storage.js', '440-count.js'] });
  try {
    const ed = (T, why) => { const v = JSON.parse(T.get(K)); const d = Object.keys(v)[0]; v[d].d[0].zones[1].cWhy = why; return JSON.stringify(v); };
    A.set(K, ed(A, 'TEST_ONLY سبب A')); await sleep(20); B.set(K, ed(B, 'TEST_ONLY سبب B'));
    assert.ok(await until(() => /اعتُمدت قيمتك/.test(pageText(B.W)), 4000), 'الحافظُ اللاحق: «اعتُمدت قيمتك»');
    assert.ok(await until(() => /بعد حفظك/.test(pageText(A.W)), 6000), 'والأسبقُ الذي كُتب فوقه يُبلَّغ: ' + pageText(A.W).slice(0, 160));
  } finally { A.dispose(); B.dispose(); }
});

test('A3b: تبويبٌ آخر للحساب نفسِه طرفٌ آخر — تعارضُ الخانة نفسِها يُعلَن ولا يُكتم (c.self)', async () => {
  const K = 'bsdept:d1:bassam_perm_help_v1';
  let n = 0;
  const C = { req: async (p) => {
    if (p.startsWith('/api/save')) { n++; return J(n === 1 ? { ok: 1, conflicts: { [K]: { cur: JSON.stringify({ type: ['T-other-tab'] }), rev: 9, by: 'أنا', at: Date.now(), self: 1 } } } : { ok: 1, revs: { [K]: 10 + n } }); }
    if (p.startsWith('/api/changes')) return J({ v: 1, keys: [] });
    return J({ ok: 1 });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, v: 1, uid: 'u1', keys: { [K]: JSON.stringify({ type: ['base'] }) }, revs: { [K]: 5 } }, blocks: ['280-server-storage.js', '440-count.js'] });
  try {
    T.set(K, JSON.stringify({ type: ['M-this-tab'] }));
    await sleep(600);
    assert.match(pageText(T.W), /نافذةٍ أخرى لحسابك/, 'التبويبُ الآخر للحساب نفسِه يُسمّى ويُعلَن: ' + pageText(T.W).slice(0, 200));
  } finally { T.dispose(); }
  /* ضابط: النافذةُ نفسُها — حُفظ طلبُها وضاع جوابُه، وعدّلت بعده ثم أُعيد الإرسال ⇒ «تعارضٌ مع حسابك» قيمتُه ما أرسلتُه أنا: لا شريط، والأحدثُ يُحفظ */
  const S = { rev: 5, cur: JSON.stringify({ type: ['base'] }), n: 0 };
  const C2 = { req: async (p, o) => {
    if (p.startsWith('/api/save')) {
      const b = JSON.parse(o.body); S.n++;
      if (S.n === 1) { S.cur = b.set[K]; S.rev = 6; throw new Error('TEST_ONLY: الجوابُ ضاع بعد الحفظ'); }
      if ((b.base || {})[K] !== S.rev) return J({ ok: 1, conflicts: { [K]: { cur: S.cur, rev: S.rev, by: 'أنا', at: Date.now(), self: 1 } } });
      S.cur = b.set[K]; S.rev++; return J({ ok: 1, revs: { [K]: S.rev } });
    }
    if (p.startsWith('/api/changes')) return J({ v: 1, keys: [] });
    return J({ ok: 1 });
  } };
  const T2 = loadClient({ C: C2, boot: { srv: 1, cf: 1, v: 1, uid: 'u1', keys: { [K]: S.cur }, revs: { [K]: 5 } }, blocks: ['280-server-storage.js', '440-count.js'] });
  try {
    T2.set(K, JSON.stringify({ type: ['M1'] }));
    assert.ok(await until(() => S.n === 1, 2000));
    await sleep(50);
    T2.set(K, JSON.stringify({ type: ['M2'] }));
    assert.ok(await until(() => S.cur === JSON.stringify({ type: ['M2'] }), 4000), 'الأحدثُ حُفظ: ' + S.cur);
    await sleep(100);
    assert.doesNotMatch(pageText(T2.W), /نافذةٍ أخرى لحسابك|اختلفتما|اعتُمدت/, 'لا شريطَ تعارضٍ مع النافذة نفسِها: ' + pageText(T2.W).slice(0, 200));
  } finally { T2.dispose(); }
});

test('A3c: الهويةُ صريحةٌ لكل مورد — مفتاحٌ أجنبيٌّ فريدٌ صدفةً لا يصير هوية (حركتا عهدةٍ متزامنتان لموظفٍ جديد كلتاهما)', () => {
  const { T, run } = merger();
  try {
    const mv = (eid, ser) => ({ t: 'out', eid, item: 'TEST_ONLY جهاز', ser, y: 1448, m: 4, d: 20 });
    const base = { items: [{ name: 'TEST_ONLY جهاز', qty: 5 }], moves: [mv('e1', 'S1')] };
    const mine = cp(base); mine.moves.push(mv('e2', 'S2'));
    const theirs = cp(base); theirs.moves.push(mv('e2', 'S3'));
    const r = run('bsdept:d1:bassam_custody_v1', base, mine, theirs);
    assert.deepEqual(r.v.moves.map(x => x.ser).sort(), ['S1', 'S2', 'S3'], 'الحركتان كلتاهما: ' + JSON.stringify(r.v.moves));
    assert.equal(r.c + r.l, 0);
    /* موردٌ غيرُ معروف: لا هويةَ تُستنتج؛ الدمجُ الآمن (المحاذاة) يحفظ الإضافتين */
    const r2 = run('bsdept:d1:bassam_unknown_v1', [{ eid: 'e1', v: 1 }], [{ eid: 'e1', v: 1 }, { eid: 'e2', v: 'M' }], [{ eid: 'e1', v: 1 }, { eid: 'e2', v: 'T' }]);
    assert.equal(r2.v.length, 3, 'الإضافتان كلتاهما: ' + JSON.stringify(r2.v));
    /* والمواردُ المعروفة ما زالت بالهوية: الجولات (sid · uid) والتقرير (ekey) والموظفون (eid) */
    const z = (uid, o) => Object.assign({ uid, fst: 'open' }, o || {});
    const R = { '1448-4-20': { d: [{ sid: 's1', zones: [z('u1'), z('u2')] }, { sid: 's2', zones: [z('u3')] }] } };
    const Rm = cp(R); Rm['1448-4-20'].d.reverse(); Rm['1448-4-20'].d[1].zones[1].fst = 'closed';   /* أعدتُ ترتيبَ الموقعين وأغلقتُ u2 */
    const Rt = cp(R); Rt['1448-4-20'].d[0].zones[0].fst = 'closed';                                 /* وأغلق هو u1 */
    const r3 = run('bsdept:d1:bassam_rounds_v1', R, Rm, Rt);
    const f1 = r3.v['1448-4-20'].d.find(f => f.sid === 's1');
    assert.deepEqual([r3.v['1448-4-20'].d.map(f => f.sid), f1.zones.map(q => q.fst)], [['s2', 's1'], ['closed', 'closed']], JSON.stringify(r3));
  } finally { T.dispose(); }
});

test('A3c (الاحتياط الآمن): قائمةٌ مجهولة — نقلٌ أو إعادةُ ترتيبٍ عند الطرفين لا يدمج عنصرين مختلفين ولا يكرّر عنصراً، وما يلتبس يُبلَّغ', () => {
  const { T, run } = merger();
  try {
    const z = (uid, o) => Object.assign({ uid, n: uid }, o || {});
    const ids = (r) => r.v.map(x => x.uid).sort();
    const K = 'bsdept:d1:bassam_unknown_v1', base = [z('u1'), z('u2'), z('u3')];
    /* كلانا أعاد الترتيبَ بطريقةٍ مختلفة وعدّل هو u3 (مسبارُ المراجعة c: كان [u3,u1,u1] — u2 ضاع و u1 تكرّر) */
    let r = run(K, base, [z('u3'), z('u2'), z('u1')], [z('u2'), z('u1'), z('u3', { n: 'T' })]);
    assert.deepEqual(ids(r), ['u1', 'u2', 'u3'], 'لا ضياعَ ولا تكرار: ' + JSON.stringify(r));
    assert.ok(r.v.every(x => x.n === x.uid || (x.uid === 'u3' && x.n === 'T')), 'لا عنصرَ مركّبٌ من عنصرين: ' + JSON.stringify(r.v));
    assert.ok(r.c + r.l > 0, 'ويُبلَّغ');
    /* نقلٌ للعنصر نفسِه إلى موضعين مختلفين (كان المحاذي يكرّره بلا إبلاغ) */
    r = run(K, base, [z('u2'), z('u3'), z('u1')], [z('u2'), z('u1'), z('u3')]);
    assert.deepEqual(ids(r), ['u1', 'u2', 'u3'], 'لا تكرار: ' + JSON.stringify(r));
    assert.ok(r.c + r.l > 0 || JSON.stringify(r.v) === JSON.stringify([z('u2'), z('u3'), z('u1')]) || JSON.stringify(r.v) === JSON.stringify([z('u2'), z('u1'), z('u3')]), 'إمّا ترتيبُ أحدِهما وإمّا إبلاغ');
    /* ضابط: العنصرُ نفسُه في موضعه عدّل كلٌّ منّا خانةً منه ⇒ كلاهما بلا تعارض */
    r = run(K, [{ id: 'a', x: 1, y: 1, w: 1 }], [{ id: 'a', x: 2, y: 1, w: 1 }], [{ id: 'a', x: 1, y: 3, w: 1 }]);
    assert.deepEqual([r.v, r.c + r.l], [[{ id: 'a', x: 2, y: 3, w: 1 }], 0]);
  } finally { T.dispose(); }
});

test('A4: الخانةُ 13 هويةٌ لصفوف المهام وحدها — مصفوفةٌ أخرى بأربعة عشر عموداً تُدمج موضعاً لا بالعمود 13', () => {
  const { T, run } = merger();
  try {
    const row = (lbl, c14, d5) => { const r = new Array(30).fill('A'); r[0] = lbl; r[13] = c14; r[4] = d5; return r; };
    const b = [row('r1', 'M', 'A'), row('r2', 'N', 'A')];
    const m = [row('r1', 'N', 'A'), row('r2', 'M', 'A')];          /* بدّلتُ رمزَي اليوم 14 بين الصفّين */
    const t = [row('r1', 'M', 'B'), row('r2', 'N', 'A')];          /* وعدّل هو اليوم 5 في الصفّ الأول */
    const r = run('bsdept:d1:bassam_matrix_v1', b, m, t);
    const r1 = r.v.find(x => x[0] === 'r1'), r2 = r.v.find(x => x[0] === 'r2');
    assert.deepEqual([r1[13], r1[4], r2[13], r2[4]], ['N', 'B', 'M', 'A'], 'تعديلُه بقي في صفّه لا تبع العمودَ 13: ' + JSON.stringify(r.v.map(x => [x[0], x[4], x[13]])));
    /* صفوفُ المهام ما زالت بالخانة 13 (يعتمد عليها وكيلُ المهام) */
    const tr = (id, s) => { const x = new Array(22).fill(null); x[0] = s; x[13] = id; return x; };
    const B = { '1448-4-20': [tr(1, 'a'), tr(2, 'b')] };
    const Mm = cp(B); Mm['1448-4-20'].reverse(); const Tt = cp(B); Tt['1448-4-20'][0][3] = 'done';
    const rt = run('bsdept:d1:bassam_tasks_v1', B, Mm, Tt);
    assert.equal(rt.v['1448-4-20'].find(x => x[13] === 1)[3], 'done', 'تعديلُ المهمة يتبع معرّفَها');
  } finally { T.dispose(); }
});

test('A5: مجموعةٌ رقميةٌ قصيرة (أربعة أيامِ راحة) لا تُدمج موضعاً', () => {
  const { T, run } = merger();
  try {
    const r = run('bsdept:d1:bassam_staffing_v3', { '1448-4': { e1: { rest: [5, 12, 19, 26] } } }, { '1448-4': { e1: { rest: [12, 19, 26, 30] } } }, { '1448-4': { e1: { rest: [5, 13, 19, 26] } } });
    assert.deepEqual(r.v['1448-4'].e1.rest.slice().sort((a, b) => a - b), [13, 19, 26, 30], 'حذفتُ 5 وأضفتُ 30 · وبدّل هو 12 بـ13: ' + JSON.stringify(r));
    assert.equal(r.c + r.l, 0);
    const p = run('', [0, 0], [3, 0], [0, 4]);           /* الإحداثيّ (ثنائيٌّ) ما زال موضعياً */
    assert.deepEqual(p.v, [3, 4]);
  } finally { T.dispose(); }
});

test('A6: «اليوم المختار» حين يرفض المخزنان الكتابة يبقى في ذاكرة التبويب — ومستخدمٌ تالٍ في التبويب نفسِه لا يرث يومَ سابقه', () => {
  const C = { req: async () => J({ v: 1, keys: [] }) };
  const boot = (uid) => ({ srv: 1, cf: 1, v: 1, uid, keys: { bassam_depts_v1: JSON.stringify([{ id: 'd1', name: 'x' }]), bassam_auth_users_v1: JSON.stringify([{ id: 'su', un: 'admin', name: 'x', role: 'super' }, { id: 'u2', un: '0000000002', name: 'y', role: 'super' }]) }, revs: {} });
  const quota = () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
  const ss = new FakeStorage(); ss.setItem = quota;
  const native = new FakeStorage(); const set0 = native.setItem.bind(native); native.setItem = (k, v) => /dayfocus/.test(k) ? quota() : set0(k, v);
  const now = Date.now(); set0('bassam_session_v1', JSON.stringify({ uid: 'su', ts: now, la: now, mc: 0 })); set0('bassam_active_dept_v1', 'd1');
  const T = loadClient({ C, boot: boot('su'), blocks: ['280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '332-find-day.js'], session: ss, native });
  try {
    const F = T.W.KIVO.BassamDayFocus;
    F.set(1448, 3, 7);
    assert.deepEqual(JSON.parse(JSON.stringify(F.get())), { y: 1448, m: 3, d: 7 }, 'ما اختاره الآن يُقرأ الآن');
  } finally { T.dispose(); }
  /* التبويبُ نفسُه بعد خروجٍ ودخولِ مستخدمٍ آخر */
  const ss2 = new FakeStorage(), nat2 = new FakeStorage();
  nat2.setItem('bassam_session_v1', JSON.stringify({ uid: 'su', ts: now, la: now, mc: 0 })); nat2.setItem('bassam_active_dept_v1', 'd1');
  const T1 = loadClient({ C, boot: boot('su'), blocks: ['280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '332-find-day.js'], session: ss2, native: nat2 });
  T1.W.KIVO.BassamDayFocus.set(1448, 2, 9); T1.dispose();
  nat2.setItem('bassam_session_v1', JSON.stringify({ uid: 'u2', ts: now, la: now, mc: 0 }));
  const nat3 = new FakeStorage(); nat3._m = nat2._m;   /* المخزنُ الأصليّ نفسُه بعد إعادة التحميل — نسخةٌ مستقلة كما في كل سياق */
  const T2 = loadClient({ C, boot: boot('u2'), blocks: ['280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '332-find-day.js'], session: ss2, native: nat3 });
  try { assert.equal(T2.W.KIVO.BassamDayFocus.get(), null, 'لا يرث يومَ المستخدم السابق في التبويب'); } finally { T2.dispose(); }
});

test('[legacy] A7: تغييرُ صلاحياتٍ في إدارةٍ أخرى لا يدفع هذا التبويبَ إلى إعادة سرد كلّ ما يراه — ومديرُ النظام لا يحتاجها أصلاً', async () => {
  const env = makeTestEnv({ KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  const U = await C.login('0000000113', '70113'); assert.ok(U.ok, 'tst_emp1 في tst_d1');
  const A = loadClient({ C, boot: (await C.boot(U.ck)).boot, jar: { cookie: U.ck } });
  const S = loadClient({ C, boot: (await C.boot(su.ck)).boot, jar: { cookie: su.ck } });
  const listed = (T) => T.urls.filter(u => /\/api\/changes\?since=0(&|$)/.test(u.url)).length;
  try {
    await sleep(1500);
    const P = JSON.parse((await C.api('/api/get?keys=bassam_perms_v1', { cookie: su.ck })).j.keys.bassam_perms_v1.v);
    P.emps.tst_d2 = P.emps.tst_d2 || {}; P.emps.tst_d2.tst_e_emp2 = Object.assign({}, P.emps.tst_d2.tst_e_emp2 || {}, { tasks: ['view'] });
    const sv = await C.save(su.ck, { bassam_perms_v1: JSON.stringify(P) }); assert.ok(sv.j.revs, 'صلاحياتُ موظفٍ في tst_d2');
    /* privacy projection (019u): a tst_d1 employee never receives tst_d2 sheets — the change reaches the tab as a revision, not as foreign data */
    assert.ok(await until(() => A.W.__BS_BOOT.v >= sv.j.v && S.W.__BS_BOOT.v >= sv.j.v, 5000), 'وصلت التبويب');
    assert.equal(JSON.parse(A.get('bassam_perms_v1')).emps.tst_d2, undefined, 'ولا تُكشف صلاحياتُ إدارةٍ أخرى للموظف');
    /* positive delivery: the super tab S receives the tst_d2 sheet itself (content, not only a revision bump) */
    assert.ok(await until(() => { const sp = JSON.parse(S.get('bassam_perms_v1') || 'null'); return !!(sp && sp.emps && sp.emps.tst_d2 && sp.emps.tst_d2.tst_e_emp2 && sp.emps.tst_d2.tst_e_emp2.tasks); }, 5000), 'وصلت تبويبَ مدير النظام');
    assert.deepEqual(JSON.parse(S.get('bassam_perms_v1')).emps.tst_d2.tst_e_emp2.tasks, ['view'], 'ورقةُ tst_d2 كما حُفظت');
    await sleep(900);
    assert.equal(listed(A), 0, 'لا إعادةَ سردٍ لموظفٍ في tst_d1');
    assert.equal(listed(S), 0, 'ولا لمدير النظام');
  } finally { A.dispose(); S.dispose(); }
});
