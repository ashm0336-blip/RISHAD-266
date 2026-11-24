/* V7 · 53 (writers · قرار المالك ٩): ثغرةُ حارس الخطة — الخادم يرفض أيَّ تغييرٍ على الأجزاء المعتمدة والماضية من الخطة، لا نوعَ الختم وحده.
   قبل الإصلاح: مديرُ الإدارة يغيّر x بابٍ في موقعٍ معتمد من خطة الشهر (lens.gates.geometry.edit بلا بُعد DateRange) أو اسمَ مصلى في موقعٍ معتمد
   من قائمة المواقع (floors بلا فترة) ⇒ 200 ويُخزَّن. بعده: 403 locked-period، ولا يُخزَّن. والموقعُ المفتوح يُحفظ، ومديرُ المنصة مستثنًى.
   العُدّة (world · realEdit) منسوخةٌ من v7_d7_planprove (TEST_ONLY — نسخةٌ بشكل Production، عناصرُها بلا eid). مختبرٌ معزول بلا شبكة. */
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
  /* V7 · د7 (ك1): نسخةٌ بلا قائمة عدسات (الكلُّ مفعّل) — الاستيرادُ صار يضيّق العدسات إلى ما في النسخة، وهذا الاختبارُ يعدّل البوابات (ما يُرسله الختم) لا العدسات */
  const f = await oldFile({ small: true, lenses: null, open: { y: H.y, m: H.m, days: [H.d - 2, H.d - 1, H.d].filter((d) => d >= 1) } });
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
  return { lab, T, s, p, saves, H, f, read, close, b };
}
/* تعديلٌ حقيقي عبر خدمة العمليات في الصفحة (طريقُ الحفظ نفسُه) — للحالة السالبة */
const realEdit = (p, name, edit, arg = null) => p.evaluate(async ([name, src, arg]) => {
  const svc = KIVO.__BS_SRV.operations, dr = svc.draft(), v = dr.get(name);
  (0, eval)('(' + src + ')')(v, arg); dr.set(name, v);   /* دالّةُ الاختبار نفسِه (TEST_ONLY) */
  const tk = dr.stage(); if (!tk || !tk.requestId) return { staged: tk };
  let r; try { r = await svc.flush(tk); } catch (e) { r = { err: String((e && e.message) || e) }; }
  try { svc.release(tk); } catch (e) { /* مُحرَّر */ }
  const full = JSON.stringify(r);
  return { ok: r && r.ok, status: r && r.status, txt: [...new Set(full.match(/(locked-period|site-approved|past-month-without-mo|day-approved|period-locked)[^"\\]{0,60}/g) || [])].join(' ¦ ') || full.slice(0, 600) };
}, [name, edit.toString(), arg]);
/* ملخّصُ ردّ الحفظ: سببُ الرفض لكل مورد وأقفالُه المذكورة */
const why = (j) => { const t = JSON.stringify(j || {}), d = (j && j.denied) || {}; return { ok: j && j.ok, denied: Object.fromEntries(Object.entries(d).map(([k, v]) => [k.split(':').pop(), v && v.why])), locks: [...new Set(t.match(/(locked-period|site-approved|past-month-without-mo|day-approved|period-locked)[^"\\]{0,60}/g) || [])] }; };
const waitSave = async (p, saves, n0) => { const t0 = Date.now(); while (saves.length === n0 && Date.now() - t0 < 15000) await p.waitForTimeout(200); await p.waitForTimeout(1200); };
const prevMonth = (H) => (H.m > 1 ? H.y + '-' + (H.m - 1) : (H.y - 1) + '-12');


test('53 قرار ٩ — مديرُ الإدارة لا يغيّر موضعَ بابٍ ولا اسمَ مصلى في موقعٍ معتمد ولا شهرٍ ماضٍ بلا mo (403)، والمفتوحُ يُحفظ، ومديرُ المنصة مستثنًى', { timeout: 600000, ...need }, async (t) => {
  const W = await world(({ plan, H }) => {
    const cur = H.y + '-' + H.m, floors = plan.floors.map((x, i) => (i === 1 ? { ...x, approved: true } : x));
    plan.floors = floors;
    plan.months = { [prevMonth(H)]: { c: 1, d: clone(floors) }, [cur]: { c: 1, d: clone(floors) } };
    plan.months[prevMonth(H)].d.forEach((x) => delete x.approved);
  });
  const { p, H } = W, cur = H.y + '-' + H.m, prev = prevMonth(H);
  try {
    const before = await W.read(PK);
    assert.ok(before.floors[1].approved && before.months[cur].d[1].approved && !before.months[prev].mo, 'المخزَّن: موقعٌ معتمد وشهرٌ ماضٍ بلا mo');
    const again = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000); };
    const denied = {
      'باب في موقعٍ معتمد من خطة الشهر (x)': (v, a) => { v.months[a.cur].d[1].gates[0].x = (+v.months[a.cur].d[1].gates[0].x || 0) + 7; },
      'باب في موقعٍ معتمد من قائمة المواقع (x)': (v) => { v.floors[1].gates[0].x = (+v.floors[1].gates[0].x || 0) + 7; },
      'اسمُ مصلى في موقعٍ معتمد من قائمة المواقع': (v) => { v.floors[1].zones[0].name = 'TEST_ONLY اسمٌ جديد'; },
      'اسمُ الموقع المعتمد': (v) => { v.floors[1].name = 'TEST_ONLY موقع'; },
      'اسمُ مصلى في موقعٍ معتمد من خطة الشهر': (v, a) => { v.months[a.cur].d[1].zones[0].name = 'TEST_ONLY اسمٌ جديد'; },
      'باب في الشهر الماضي بلا mo (x)': (v, a) => { v.months[a.prev].d[0].gates[0].x = (+v.months[a.prev].d[0].gates[0].x || 0) + 7; },
    };
    for (const [n, fn] of Object.entries(denied)) {
      const r = await realEdit(p, 'bassam_plan_v1', fn, { cur, prev });
      t.diagnostic(n + ' ⇒ ' + JSON.stringify(r).slice(0, 300));
      assert.ok(r.ok !== 1 && r.status === 403 && /locked-period/.test(r.txt), n + ': يُرفض 403 locked-period — ' + JSON.stringify(r).slice(0, 400));
      await again();
    }
    const mid = await W.read(PK);
    assert.deepEqual(mid.floors[1], before.floors[1], 'الموقعُ المعتمد مخزَّنٌ كما كان');
    assert.deepEqual(mid.months, before.months, 'أشهرُ الخطة مخزَّنةٌ كما كانت');
    /* الموقعُ المفتوح: التغييرُ نفسُه يُحفظ (لا رفضَ لكل الخطة) */
    const open = await realEdit(p, 'bassam_plan_v1', (v, a) => { v.months[a.cur].d[0].gates[0].x = (+v.months[a.cur].d[0].gates[0].x || 0) + 7; v.floors[0].zones[0].name = 'TEST_ONLY مفتوح'; }, { cur });
    assert.equal(open.ok, 1, 'الموقعُ المفتوح يُحفظ: ' + JSON.stringify(open).slice(0, 400));
    const after = await W.read(PK);
    assert.equal(after.floors[0].zones[0].name, 'TEST_ONLY مفتوح');
    assert.deepEqual(after.floors[1], before.floors[1]); assert.deepEqual(after.months[prev], before.months[prev]); assert.deepEqual(after.months[cur].d[1], before.months[cur].d[1]);
    /* الاستثناء: مديرُ المنصة */
    const sa = await openAs(W.b, W.lab, LAB.superUn, LAB.superPw);
    await sa.page.evaluate((d) => KIVO.BassamDepts.setActive(d), B); await sa.page.waitForTimeout(1500);
    await sa.go('#/plan', 1500); await sa.page.waitForTimeout(2500);
    assert.equal(await sa.page.evaluate(() => KIVO.BassamDepts.active()), B);
    const sup = await realEdit(sa.page, 'bassam_plan_v1', (v, a) => { v.months[a.cur].d[1].gates[0].x = (+v.months[a.cur].d[1].gates[0].x || 0) + 7; }, { cur });
    t.diagnostic('super ⇒ ' + JSON.stringify(sup).slice(0, 300));
    assert.equal(sup.ok, 1, 'مديرُ المنصة يعدّل المعتمد: ' + JSON.stringify(sup).slice(0, 400));
    await W.lab.idle(); await readBack(W.T, B);
    assert.deepEqual(W.s.errs, [], 'لا أخطاء صفحة');
  } finally { await W.close(); }
});
