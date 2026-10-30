/* KIVO_265 · دمجُ الواجهة (src/api/280 merge3) ليومٍ فيه مهمةٌ جماعية — جذرُ إخفاق tasks_k265_f10 (أ) المتقطّع «مهمةُ المدير الجديدة باقية» (CI d121cb7 · 73e7de4):
   هويةُ صفّ المهمة كانت العمودَ 13 وحده؛ والمهمةُ الجماعية صفٌّ لكل مكلَّف بالـ13 نفسِه ⇒ لا هويةَ فريدة في اليوم ⇒ يُدمج اليومُ كلُّه بالمحاذاة (m3seq9)،
   وصفٌّ غيّره الطرفان (قبولُ عضوٍ + تعديلُ المدير) مع إضافةٍ في القطعة نفسِها بلا صفٍّ ثابتٍ بعدها ⇒ القطعةُ «ملتبسة» فتؤخذ نسخةُ الخادم وتُسقط
   إضافةُ المدير وتعديلاتُه (الواجهةُ تقول «تعذّر دمجُ تعديلك…» ولا يُكتب شيء). الإصلاح: الهويةُ 13 وما تكرّر منها (صفوفُ الجماعية) 13·14 في النسخ الثلاث —
   كهوية الخادم (070 tkKeepSelf). (أ) الدمجُ وحده على 280 الحقيقيّ · (ب) الطرفان معاً بلا توقيت: الموظفون يفعلون ثم يحفظ المديرُ من صفحةٍ قديمة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadClient } from './k264_vm.mjs';
import { world, workerUnderTest, P0, MATE, KT, DAY, row, stored, putKV, replaceOperationalFixture } from './tasks_fx.mjs';
import { MgrClient, upImg, act, findRow, reviewAndApply } from './tasks_conc_fx.mjs';

const K = 'bsdept:tst_d1:bassam_tasks_v1', D = '1448-4-15';
const R = (id, eid, o = {}) => ['t' + id, o.desc || '', 'normal', o.st || 'pending', 'normal', 'مضافة', null, [], '', 'mgr', 60, o.acc || null, null, id, eid, 1, 2, o.g || null, o.g ? 'G' : null, null, o.r20 || null, null];
function client() { const T = loadClient({ C: { req: async () => { throw new Error('offline'); } }, boot: { srv: 1, cf: 1, v: 1, keys: {}, revs: {} } }); return { M3: T.W.KIVO.__BS_SRV.merge3, T }; }
const J = (x) => JSON.stringify(x), C = (x) => JSON.parse(J(x));

test('(أ) يومٌ فيه مهمةٌ جماعية: إضافةُ المدير وتعديلُه للجماعية يبقيان مع قبول العضو — بلا التباس (l = 0)', () => {
  const { M3, T } = client();
  try {
    const base = { [D]: [R(1, 'e1'), R(2, 'e2'), R(9, 'e1', { g: 'g9' }), R(9, 'e2', { g: 'g9' })] };
    const mine = C(base); mine[D].forEach((r) => { if (r[13] === 9) r[1] = 'desc by manager'; }); mine[D].push(R(77, 'e2'));
    const theirs = C(base); theirs[D][2] = R(9, 'e1', { g: 'g9', st: 'in_progress', acc: 123, r20: { ack: 123 } });
    const r = M3(J(base), J(mine), J(theirs), K), out = JSON.parse(r.v)[D];
    assert.equal(r.l, 0, 'لا قطعةَ ملتبسة');
    assert.ok(out.some((x) => x[13] === 77), 'مهمةُ المدير الجديدة باقية');
    assert.deepEqual(out.filter((x) => x[13] === 9).map((x) => x[1]), ['desc by manager', 'desc by manager'], 'وصفُ المدير على صفّي الجماعية');
    const e1 = out.find((x) => x[13] === 9 && x[14] === 'e1'); assert.equal(e1[3], 'in_progress'); assert.equal(e1[11], 123, 'قبولُ العضو باقٍ');
    assert.equal(out.find((x) => x[13] === 9 && x[14] === 'e2')[3], 'pending', 'العضوُ الآخر كما هو');
    /* ضابط: اليومُ نفسُه بلا جماعية — الهويةُ 13 كما كانت والنتيجةُ نفسُها */
    const b2 = { [D]: [R(1, 'e1'), R(2, 'e2'), R(9, 'e1')] }, m2 = C(b2); m2[D][2][1] = 'desc by manager'; m2[D].push(R(77, 'e2'));
    const t2 = C(b2); t2[D][2] = R(9, 'e1', { st: 'in_progress', acc: 123, r20: { ack: 123 } });
    const r2 = M3(J(b2), J(m2), J(t2), K), o2 = JSON.parse(r2.v)[D];
    assert.equal(r2.l, 0); assert.ok(o2.some((x) => x[13] === 77)); assert.equal(o2[2][1], 'desc by manager'); assert.equal(o2[2][3], 'in_progress');
    /* حذفُ المدير صفَّ عضوٍ في الجماعية وحده (والعضوُ الآخر قبل): يُحذف هو وحده */
    const m3 = C(base); m3[D] = m3[D].filter((x) => !(x[13] === 9 && x[14] === 'e2'));
    const r3 = M3(J(base), J(m3), J(theirs), K), o3 = JSON.parse(r3.v)[D];
    assert.equal(r3.l, 0); assert.deepEqual(o3.filter((x) => x[13] === 9).map((x) => x[14]), ['e1']); assert.equal(o3.find((x) => x[13] === 9)[11], 123);
  } finally { T.dispose(); }
});

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] (ب) الموظفون يقبلون وينهون ويُنقضى كلَّ صفوف اليوم ثم يحفظ المديرُ من صفحةٍ قديمة: إضافتُه وتعديلاته باقية', { timeout: 120000 }, async () => {
    const WU = workerUnderTest(), H = 3600e3, { M3, T } = client();
    try {
      const Wd = await world({ worker: WU.file, mode }), now = Date.now(), G = 1760000099001;
      const emps = []; for (const p of P0) emps.push({ p, s: await Wd.login(p.un, p.pw) });
      const dm = await Wd.login('0000000101', '70101');
      const S = stored(Wd.env, KT);
      for (const { p } of emps) S[DAY].push(row({ id: G, title: 'جولةٌ جماعية', eid: p.eid, s: now - 0.5 * H, e: now + 3 * H, grp: 'gM', grpL: 'M' }));
      const FIN = [0, 1, 2].map((i) => ({ p: P0[i], id: 1760000099100 + i }));
      FIN.forEach(({ p, id }, i) => S[DAY].push(row({ id, title: 'جاريةٌ للإنهاء ' + i, eid: p.eid, st: 'in_progress', acc: now - H, s: now - 2 * H, e: now + 2 * H })));
      const EXP = []; P0.forEach((p, i) => [0, 1].forEach((q) => { const id = 1760000099200 + i * 10 + q; EXP.push({ p, id }); S[DAY].push(row({ id, title: 'منقضية ' + i + '.' + q, eid: p.eid, s: now - (5 + q) * H, e: now - (2 + q) * H })); }));
      await replaceOperationalFixture(Wd.env, KT, S);
      const imgs = await Promise.all(FIN.slice(0, 2).map(({ p }, i) => upImg(Wd, emps.find((e) => e.p === p).s.ck, 'mg' + i)));
      const calls = [], merge3 = (b, m, t) => { const r = M3(b == null ? null : b, m, t, KT); calls.push(r.l); return r; };
      const Mc = new MgrClient(Wd, dm.ck, merge3, KT, 'M'); await Mc.load();                 /* صفحةُ المدير قبل أفعالهم */
      const ck = (p) => emps.find((e) => e.p === p).s.ck, ok = (r) => r && r.status === 200 && r.j && r.j.ok === 1;
      for (const p of P0) assert.ok(ok(await act(Wd, ck(p), { k: DAY, id: G, act: 'accept' }, 'a')));
      for (const [i, { p, id }] of FIN.entries()) assert.ok(ok(await act(Wd, ck(p), { k: DAY, id, act: 'finish', imgs: i < 2 ? [imgs[i]] : [], note: 'TEST_ONLY تم' }, 'f')));
      for (const { p, id } of EXP) assert.ok(ok(await act(Wd, ck(p), { k: DAY, id, act: 'expire' }, 'e')));
      const NEW = 1760000099999;
      const mr = await reviewAndApply(Mc, (X) => {
        X[DAY].push(row({ id: NEW, title: 'مهمةٌ جديدة من المدير', eid: MATE.eid, s: now + H, e: now + 3 * H }));
        const gi = X[DAY].findIndex((r) => r[13] === 1760000000901); X[DAY][gi] = X[DAY][gi].slice(); X[DAY][gi][0] = 'TEST_ONLY عامة ١ — عدّلها المدير';
        for (const r of X[DAY]) if (r[13] === G) r[1] = 'TEST_ONLY وصفٌ عدّله المدير';
      });
      assert.ok(mr.ok, 'حفظُ المدير');
      assert.equal(calls.length,0,'لا دمج أو إعادة كتابة تلقائية لوثيقة أعمال مهاجرة');
      assert.equal(mr.reviewed,true,'سبق الحفظَ رفضُ المسودة القديمة ثم قراءة ومراجعة صريحة');
      const F = stored(Wd.env, KT);
      assert.ok(findRow(F, NEW, MATE.eid), 'مهمةُ المدير الجديدة باقية');
      assert.equal(F[DAY].find((r) => r[13] === 1760000000901)[0], 'TEST_ONLY عامة ١ — عدّلها المدير', 'تعديلُ المدير باقٍ');
      assert.ok(F[DAY].filter((r) => r[13] === G).every((r) => r[1] === 'TEST_ONLY وصفٌ عدّله المدير' && r[11] && r[3] === 'in_progress'), 'وصفُ المدير مع قبولات الجماعية');
      for (const { p, id } of FIN) { const x = findRow(F, id, p.eid).r; assert.equal(x[3], 'done'); assert.ok(x[21]); }
      for (const { p, id } of EXP) assert.ok(findRow(F, id, p.eid).r[20].exp, 'الانقضاءُ باقٍ');
    } finally { T.dispose(); }
  });
}
