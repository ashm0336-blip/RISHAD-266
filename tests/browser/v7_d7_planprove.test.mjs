/* V7 · د7 (planprove · رد المالك 52 §2) — إثباتٌ على نسخة Production مستوردة (TEST_ONLY — مولَّدةٌ بشكل Production القديم بعُدّة د6، لا بياناتٍ حقيقية):
   عناصرُ الملف بلا eid كما في Production والبيانات القديمة (المصلياتُ والأبوابُ والمعالمُ تحمل uid وحده، والمواقعُ sid).
   الحالة ١ (جرد الكتّاب): «الخطة التشغيلية» تختم eid/id على كل الطوابق وكل الأشهر عند التحميل (BassamAudit.stampPlan) ثم ترسلها مع الحفظ —
       فتعديلٌ في موقعٍ مفتوح يحمل معه «تعديلاً» على موقعٍ معتمد (site-approved) وعلى شهرٍ ماضٍ بلا mo (past-month-without-mo).
   الحالة ٣: «حذف موقع» من الخطة يحذفه من أيام الجولات كلِّها (daily.site.remove@1) ومنها المعتمدُ والماضي المقفل (locked-period).
   كلُّ اختبار: الاستيرادُ بالبروتوكول الحقيقي (/api/backup/import) ← فتحُ الصفحة ← التعديل ← الحفظ 200 ← ما لم يعدّله المستخدم مخزَّنٌ كما كان بايتاً ←
   والتعديلُ الحقيقي على المقفل ما زال يُرفض في الخادم ← ثم يُقرأ كلُّ مورد (readBack). مختبرٌ معزول بلا شبكة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';
import { oldFile, client, protocol, readBack } from '../unit/v7_d6_import_fx.mjs';

/* الإدارةُ التجريبية بمديرها (tst_demo_u_m1): مديرُ المنصة مستثنًى من قفل الفترة في الخادم، فالإثباتُ بمدير الإدارة كما في د6 distfix */
const B = 'tst_demo_d1', SCOPE = { kind: 'dept', departmentId: B }, PK = 'bsdept:' + B + ':bassam_plan_v1', RK = 'bsdept:' + B + ':bassam_rounds_v1';
const need = hasSystem('plan', 'daily') ? {} : { skip: 'يحتاج نظامَي الخطة والجولات' };
const clone = (v) => JSON.parse(JSON.stringify(v));
const hasEid = (doc) => /"eid":/.test(JSON.stringify(doc));

/* المختبر ← نسخةٌ قديمة (عناصرُها بلا eid) يعدّلها shape ← استيرادٌ كامل بالبروتوكول ← الصفحةُ على «الخطة التشغيلية» للإدارة المستوردة */
async function world(shape) {
  const lab = await startLab(), b = await chromium.launch();
  try { return await worldIn(lab, b, shape); } catch (e) { await b.close(); await lab.close(); throw e; }
}
async function worldIn(lab, b, shape) {
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
  const C = client(lab), su = await C.login(LAB.superUn, LAB.superPw), T = { lab, DB: lab.env.DB, ...C, su };
  const sa = await openAs(b, lab, LAB.superUn, LAB.superPw), seed = await sa.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
  assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
  const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1'), saves = [];
  const H = await sa.page.evaluate(() => KIVO.BassamCal.hNow(new Date(), null));   /* يومُ الصفحة بتقويمها */
  await sa.ctx.close();
  const f = await oldFile({ small: true, open: { y: H.y, m: H.m, days: [H.d - 2, H.d - 1, H.d].filter((d) => d >= 1) } });
  const plan = JSON.parse(f.data.bassam_plan_v1), rounds = JSON.parse(f.data.bassam_rounds_v1);
  shape({ plan, rounds, H });
  f.data.bassam_plan_v1 = JSON.stringify(plan); f.data.bassam_rounds_v1 = JSON.stringify(rounds);
  assert.equal(hasEid(plan) || hasEid(rounds), false, 'النسخةُ كـProduction: عناصرُها بلا eid');
  const run = await protocol(T, su, f, { scope: SCOPE }).run();
  assert.ok(run.commit && run.commit.status === 200 && run.commit.j.ok, 'الاستيراد: ' + JSON.stringify({ failedAt: run.failedAt, part: run.part && run.part.j, inspect: run.inspect && run.inspect.j, commit: run.commit && run.commit.j }).slice(0, 1500));
  await readBack(T, B);
  const s = await openAs(b, lab, m1.un, m1.pw), p = s.page;
  p.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save\b/.test(r.url())) { let j = null; try { j = await r.json(); } catch (e) { /* بلا جسم */ } saves.push({ st: r.status(), j }); } });
  await s.go('#/plan', 1500);
  /* مكوّنُ الصفحة (الصنفُ الذي يحمل savePlan) — بعد تحميل طوابق النسخة */
  await p.waitForFunction(() => {
    for (const el of document.querySelectorAll('main *')) {
      const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let x = fk ? el[fk] : null;
      while (x) { const n = x.stateNode; for (const c of [n, n && n.logic]) if (c && typeof c.savePlan === 'function' && c.state && Array.isArray(c.state.floors) && c.state.floors.length >= 2) { window.__pp = c; return true; } x = x.return; }
    }
    return false;
  }, null, { timeout: 60000, polling: 250 });
  const read = async (k) => (await s.api('/api/operations/read?keys=' + encodeURIComponent(k))).j.resources[k];
  const close = async () => { await b.close(); await lab.close(); };
  return { lab, T, s, p, saves, H, f, read, close };
}
/* تعديلٌ حقيقي عبر خدمة العمليات في الصفحة (طريقُ الحفظ نفسُه) — للحالة السالبة */
const realEdit = (p, name, edit, arg = null) => p.evaluate(async ([name, src, arg]) => {
  const svc = KIVO.__BS_SRV.operations, dr = svc.draft(), v = dr.get(name);
  (0, eval)('(' + src + ')')(v, arg); dr.set(name, v);   /* دالّةُ الاختبار نفسِه (TEST_ONLY) */
  const tk = dr.stage(); if (!tk || !tk.requestId) return { staged: tk };
  let r; try { r = await svc.flush(tk); } catch (e) { r = { err: String((e && e.message) || e) }; }
  try { svc.release(tk); } catch (e) { /* مُحرَّر */ }
  return { ok: r && r.ok, status: r && r.status, txt: JSON.stringify(r).slice(0, 1500) };
}, [name, edit.toString(), arg]);
/* ملخّصُ ردّ الحفظ: سببُ الرفض لكل مورد وأقفالُه المذكورة */
const why = (j) => { const t = JSON.stringify(j || {}), d = (j && j.denied) || {}; return { ok: j && j.ok, denied: Object.fromEntries(Object.entries(d).map(([k, v]) => [k.split(':').pop(), v && v.why])), locks: [...new Set(t.match(/(locked-period|site-approved|past-month-without-mo|day-approved|period-locked)[^"\\]{0,60}/g) || [])] }; };
const waitSave = async (p, saves, n0) => { const t0 = Date.now(); while (saves.length === n0 && Date.now() - t0 < 15000) await p.waitForTimeout(200); await p.waitForTimeout(1200); };
const prevMonth = (H) => (H.m > 1 ? H.y + '-' + (H.m - 1) : (H.y - 1) + '-12');

test('د7 الحالة ١ — الخطة على نسخة Production مستوردة: تعديلٌ في موقعٍ مفتوح بجوار موقعٍ معتمد وشهرٍ ماضٍ بلا mo يُحفظ 200، والمعتمدُ والماضي كما خُزِّنا', { timeout: 600000, ...need }, async (t) => {
  const W = await world(({ plan, H }) => {
    const cur = H.y + '-' + H.m, floors = plan.floors.map((x, i) => (i === 1 ? { ...x, approved: true } : x));   /* الموقعُ الثاني معتمد */
    plan.floors = floors;
    plan.months = { [prevMonth(H)]: { c: 1, d: clone(floors).map((x) => ({ ...x, approved: undefined })) }, [cur]: { c: 1, d: clone(floors) } };   /* شهرٌ ماضٍ بلا mo (مقفلٌ تلقائياً) والشهرُ الجاري */
    plan.months[prevMonth(H)].d.forEach((x) => delete x.approved);
  });
  const { p, saves, H } = W;
  try {
    const before = await W.read(PK), prev = prevMonth(H), cur = H.y + '-' + H.m;
    assert.ok(before.floors[1].approved && before.months[prev] && !before.months[prev].mo, 'المخزَّن: موقعٌ معتمد وشهرٌ ماضٍ بلا mo');
    assert.equal(hasEid(before), false, 'المخزَّن بعد الاستيراد بلا eid');
    /* (أ) شهرٌ فيه موقعٌ معتمد: تعديلُ الموقع المفتوح (الأول — النشط) */
    const n0 = saves.length;
    const ack = await p.evaluate(async () => { const c = window.__pp; await new Promise((r) => c.setState((s) => ({ floor: 0, zones: s.zones.map((z, i) => (i ? z : { ...z, name: z.name + ' (عُدِّل د7)' })) }), r)); const a = await c.savePlan(); return a && { ok: a.ok, err: a.err }; });
    await waitSave(p, saves, n0);
    t.diagnostic('saves (approved-site month): ' + JSON.stringify(saves.slice(n0).map((x) => ({ st: x.st, ...why(x.j) }))));
    assert.ok(saves.length > n0, 'التعديلُ أرسل حفظاً');
    for (const x of saves.slice(n0)) assert.equal(x.st, 200, 'POST /api/save مقبول — لا site-approved ولا past-month-without-mo: ' + JSON.stringify(why(x.j)));
    assert.equal(ack && ack.ok, 1, 'savePlan: ' + JSON.stringify(ack));
    const after = await W.read(PK);
    assert.match(after.floors[0].zones[0].name, /عُدِّل د7/, 'التعديلُ حُفظ');
    assert.deepEqual(after.floors[1], before.floors[1], 'الموقعُ المعتمد مخزَّنٌ كما كان (بلا ختم)');
    assert.deepEqual(after.months[prev], before.months[prev], 'الشهرُ الماضي بلا mo مخزَّنٌ كما كان (بلا ختم)');
    assert.deepEqual(after.months[cur].d[1], before.months[cur].d[1], 'والموقعُ المعتمد في الشهر الجاري كما كان');
    /* (ب) شهرٌ مفتوح: تعديلٌ ثانٍ في الموقع المفتوح — بعد إيصال الأول */
    const n1 = saves.length;
    const ack2 = await p.evaluate(async () => { const c = window.__pp; await new Promise((r) => c.setState((s) => ({ zones: s.zones.map((z, i) => (i === 1 ? { ...z, name: z.name + ' (ثانٍ د7)' } : z)) }), r)); const a = await c.savePlan(); return a && { ok: a.ok, err: a.err }; });
    await waitSave(p, saves, n1);
    for (const x of saves.slice(n1)) assert.equal(x.st, 200, 'الحفظُ الثاني مقبول: ' + JSON.stringify(why(x.j)));
    assert.equal(ack2 && ack2.ok, 1, 'savePlan الثاني: ' + JSON.stringify(ack2));
    const after2 = await W.read(PK);
    assert.match(after2.floors[0].zones[1].name, /ثانٍ د7/);
    assert.deepEqual(after2.floors[1], before.floors[1]); assert.deepEqual(after2.months[prev], before.months[prev]);
    /* السالب: التعديلُ الحقيقي على المعتمد وعلى الماضي ما زال يُرفض في الخادم ولا يُخزَّن */
    const negAp = await realEdit(p, 'bassam_plan_v1', (v) => { v.floors[1].zones[0].name += ' X'; });
    t.diagnostic('negative approved: ' + JSON.stringify(negAp).slice(0, 500));
    assert.ok(negAp.ok !== 1 && negAp.status === 403 && /site-approved/.test(negAp.txt), 'الموقعُ المعتمد يُرفض (site-approved): ' + JSON.stringify(negAp));
    const negPast = await realEdit(p, 'bassam_plan_v1', (v) => { const k = Object.keys(v.months).sort()[0]; v.months[k].d[0].zones[0].name += ' X'; });
    t.diagnostic('negative past month: ' + JSON.stringify(negPast).slice(0, 500));
    assert.ok(negPast.ok !== 1 && negPast.status === 403 && /past-month-without-mo/.test(negPast.txt), 'الشهرُ الماضي بلا mo يُرفض: ' + JSON.stringify(negPast));
    const fin = await W.read(PK);
    assert.deepEqual(fin.floors[1], before.floors[1]); assert.deepEqual(fin.months[prev], before.months[prev]);
    await W.lab.idle(); await readBack(W.T, B);   /* كلُّ موردٍ يُقرأ بعد الحفظ */
    assert.deepEqual(W.s.errs, [], 'لا أخطاء صفحة');
  } finally { await W.close(); }
});

test('د7 الحالة ٣ — «حذف موقع» من الخطة على نسخة Production مستوردة: الحذفُ يُحفظ 200، وأيامُ الجولات المعتمدة والماضية تبقى كما خُزِّنت', { timeout: 600000, ...need }, async (t) => {
  const W = await world(({ plan, rounds, H }) => {
    plan.months = { [H.y + '-' + H.m]: { c: 1, d: clone(plan.floors) } };
    const days = Object.keys(rounds).filter((k) => /^\d+-\d+-\d+$/.test(k) && k.startsWith(H.y + '-' + H.m + '-'));
    const ap = days.find((k) => k !== H.y + '-' + H.m + '-' + H.d); if (ap) rounds[ap].ap = 1;   /* يومٌ معتمد (والآخرُ ماضٍ) */
  });
  const { p, saves, H } = W;
  try {
    const today = H.y + '-' + H.m + '-' + H.d, R0 = await W.read(RK), P0 = await W.read(PK);
    const locked = Object.keys(R0).filter((k) => /^\d+-\d+-\d+$/.test(k) && k !== today);
    assert.ok(locked.length >= 1, 'في الجولات الحيّة أيامٌ معتمدة أو ماضية: ' + Object.keys(R0));
    const sid = P0.floors[1].sid;
    assert.ok(locked.every((k) => R0[k].d.some((x) => x.sid === sid)), 'الموقعُ المحذوف في الأيام المقفلة');
    const n0 = saves.length;
    await p.evaluate(() => new Promise((r) => window.__pp.setState({ delFloor: { i: 1, name: window.__pp.state.floors[1].name } }, r)));
    await p.getByText('حذف نهائي', { exact: true }).last().click();
    await waitSave(p, saves, n0);
    t.diagnostic('saves (site remove): ' + JSON.stringify(saves.slice(n0).map((x) => ({ st: x.st, ...why(x.j) }))));
    assert.ok(saves.length > n0, 'الحذفُ أرسل حفظاً');
    for (const x of saves.slice(n0)) assert.equal(x.st, 200, 'POST /api/save مقبول — لا locked-period: ' + JSON.stringify(why(x.j)));
    const P1 = await W.read(PK), R1 = await W.read(RK);
    assert.deepEqual(P1.floors.map((x) => x.sid), [P0.floors[0].sid], 'الموقعُ حُذف من الخطة');
    for (const k of locked) assert.deepEqual(R1[k], R0[k], 'اليومُ المقفل ' + k + ' مخزَّنٌ كما كان (التاريخُ لا يُمسّ)');
    if (R0[today]) assert.equal(R1[today].d.some((x) => x.sid === sid), false, 'وحُذف من يوم اليوم');
    /* السالب: حذفُ الموقع حقيقةً من يومٍ مقفل ما زال يُرفض */
    const neg = await realEdit(p, 'bassam_rounds_v1', (v, a) => { v[a.k].d = v[a.k].d.filter((x) => x.sid !== a.sid); }, { k: locked[0], sid });
    t.diagnostic('negative locked day: ' + JSON.stringify(neg).slice(0, 500));
    assert.ok(neg.ok !== 1 && neg.status === 403 && /locked-period|day-approved|period-locked/.test(neg.txt), 'اليومُ المقفل يُرفض: ' + JSON.stringify(neg));
    assert.deepEqual((await W.read(RK))[locked[0]], R0[locked[0]]);
    await W.lab.idle(); await readBack(W.T, B);
    assert.deepEqual(W.s.errs, [], 'لا أخطاء صفحة');
  } finally { await W.close(); }
});
