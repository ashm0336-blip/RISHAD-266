/* V7 · 53 (باقي (ج) — «الجولات على الخريطة»): قراءاتُ الجولة اليومية والتسكين في متصفحٍ حقيقي على المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   الموقعُ يُنشأ كما في v7_real_scenarios: جولةُ اليوم مبذورةٌ فارغة ({d: []})، ومديرُ الإدارة يُنشئ موقعاً بصورته من «التشغيل الميداني» فتُهيَّأ جولةُ اليوم له؛
   ثم يضيف مصلَّيين بحفظه من الصفحة نفسِها (كاتبُ العمليات — draft/stage/flush): «TZ0» سعتُه 400 · «TZ1» بلا سعة.
   ① مديرُ الإدارة وموظفٌ بدور (المتابعة والعدسات «كامل»): «الجولات اليومية» ← «كثافة» ← نقرُ المصلى على الخريطة (اختيارُه: رأسُ اللوحة «TZ0»)
      ← «عدد المصلين الآن» = N ⇒ في الخادم pc = {n: N, cap: 400} ويبقى بعد إعادة التحميل (الحقلُ يعرض N)؛ «نسبة الإشغال» = 25 (50 للموظف) ⇒ {n: 100 (200), cap: 400}؛
      والمصلى بلا سعة: لا «عدد المصلين الآن»، والنسبة 30 (40) ⇒ {n: null, cap: 0, p: 30 (40)}.
      «توزيع» ← نقرُ المصلى ← قائمةُ التسكين ← اختيارُ موظف ⇒ emp في الخادم، وبعد إعادة التحميل مسكَّنٌ (مختارٌ في القائمة).
   ② موظفٌ بدور «مشاهدة»: لا حقلَ قراءةٍ يُكتب ولا قائمةَ تسكين، والقراءةُ من منطق الصفحة نفسِه (_occApply — ما يستدعيه الحقل) تُرفض برسالةٍ عربية ولا يتغيّر شيء.
   ③ اليومُ المنقضي (مقفل): مديرُ الإدارة وموظفٌ بدور «كامل» — لا لوحةَ قراءة، والقراءةُ من منطق الصفحة تُرفض برسالةٍ عربية ولا يتغيّر شيء. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, ACTORS, LAB, A, EKEY, chromium, openAs, mainText, norm, reloadAt, isArabicRefusal, until, toasts, seen, png } from '../../../../../tests/browser/d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../../../../../tests/unit/world_fx.mjs';

const KP = 'bsdept:' + A + ':bassam_plan_v1', KR = 'bsdept:' + A + ':bassam_rounds_v1';
const H = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date()).forEach((q) => { if (q.type !== 'literal') o[q.type] = +q.value; }); return { y: o.year, m: o.month, d: o.day }; })();
const TODAY = H.y + '-' + H.m + '-' + H.d, PAST = (H.m > 1 ? H.y + '-' + (H.m - 1) : (H.y - 1) + '-12') + '-3';
const LEVELS_FULL = { daily: 'full', 'lens.zones': 'full', 'lens.dens': 'full', 'lens.dist': 'full' };
const LEVELS_VIEW = { daily: 'view', 'lens.zones': 'view', 'lens.dens': 'view', 'lens.dist': 'view' };
const zone = (i, cap) => ({ uid: 'TEST_ONLY_z' + i, code: 'TZ' + i, name: 'TEST_ONLY مصلى ' + (i + 1), cat: 'men', d: 'M' + (100 + i * 150) + ' 100 L' + (200 + i * 150) + ' 100 L' + (200 + i * 150) + ' 200 L' + (100 + i * 150) + ' 200 Z', cx: 150 + i * 150, cy: 150, area: 10000, cap, emp: [] });
const SAVE = (r) => /^\/api\/(save|operations\/[a-z]+)$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST';
const rounds = async (s) => ((await s.api('/api/operations/read?keys=' + encodeURIComponent(KR))).j.resources || {})[KR] || {};
const zoneAt = async (s, day, i) => (((((await rounds(s))[day] || {}).d || [])[0] || {}).zones || [])[i] || null;
const pcOf = (z) => Object.values((z && z.pc) || {}).filter((x) => x && typeof x === 'object');
const daily = `(() => { const host = document.querySelector('.sc-host[data-sc-name="Daily Sessions"]'); if (!host) return null; const key = Object.keys(host).find((k) => k.startsWith('__reactFiber$')); let f = host[key]; while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic.state)) f = f.return; return f ? f.stateNode.logic : null; })()`;
const L = (p, fn, arg) => p.evaluate(async ([src, fn, arg]) => { const x = new Function('return ' + src)(); return new Function('L', 'arg', 'return (async () => {' + fn + '})()')(x, arg); }, [daily, fn, arg]);   /* src/fn: ثوابتُ هذا الملف */

/* الموقع كما في v7_real_scenarios: جولةُ اليوم مبذورةٌ فارغة، والموقعُ بصورته من الواجهة ⇒ جولةُ اليوم تُهيَّأ له */
async function setupSite(b, lab) {
  await replaceOperationalFixture(lab.env, KR, { [TODAY]: { d: [] } });
  const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(20000);
  const pickFile = async (file, target) => { const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 15000 }), target.click()]); await fc.setFiles(file); await p.waitForTimeout(2500); };
  await s.go('#/plan', 5000);
  await p.getByText('إضافة خطة لشهر', { exact: false }).last().click(); await p.waitForTimeout(1200);
  await p.getByText('بدء خطة فارغة بالكامل', { exact: false }).last().click(); await p.waitForTimeout(600);
  await p.getByText('إنشاء الخطة', { exact: true }).last().click(); await p.waitForTimeout(4000);
  await p.getByText('أضف أول موقع', { exact: true }).last().click(); await p.waitForTimeout(900);
  await p.locator('input[placeholder^="مثال"]').last().fill('TEST_ONLY موقع الجولات');
  await pickFile(png(640, 480, [200, 220, 240]), p.getByText('اسحب صورة الخريطة هنا', { exact: false }).last());
  await p.evaluate(() => { const q = [...document.querySelectorAll('p')].find((x) => x.textContent.trim() === 'اسم الموقع وخريطته المرجعية'); let c = q; while (c && ![...c.querySelectorAll('button')].some((x) => x.textContent.trim() === 'إلغاء')) c = c.parentElement; const bs = [...c.querySelectorAll('button')], i = bs.findIndex((x) => x.textContent.trim() === 'إلغاء'); bs[i - 1].click(); });
  await p.waitForTimeout(6000); await lab.idle();
  const r0 = await rounds(s);
  assert.equal(((r0[TODAY] || {}).d || []).length, 1, 'جولةُ اليوم هُيّئت للموقع الجديد: ' + JSON.stringify(r0[TODAY]));
  /* المصلّيان: حفظُ مديرِ الإدارة من الصفحة نفسِها (الخطة: الموقعُ وشهرُه · جولةُ اليوم) */
  const add = await p.evaluate(async (Z) => {
    const svc = KIVO.__BS_SRV.operations, dr = svc.draft(), v = dr.get('bassam_plan_v1'), R = dr.get('bassam_rounds_v1'), day = Object.keys(R).find((k) => R[k] && R[k].d && R[k].d.length);
    v.floors[0].zones = JSON.parse(JSON.stringify(Z)); Object.keys(v.months).forEach((m) => { v.months[m].d[0].zones = JSON.parse(JSON.stringify(Z)); });
    R[day].d[0].zones = JSON.parse(JSON.stringify(Z));
    dr.set('bassam_plan_v1', v); dr.set('bassam_rounds_v1', R);
    const tk = dr.stage(); let r; try { r = await svc.flush(tk); } catch (e) { r = { err: String(e && e.message || e) }; } try { svc.release(tk); } catch (e) { /* مُحرَّر */ }
    return r && { ok: r.ok, status: r.status, err: r.err };
  }, [zone(0, 400), zone(1, 0)]);
  await lab.idle();
  assert.equal(add && add.ok, 1, 'المصلّيان حُفظا: ' + JSON.stringify(add));
  assert.deepEqual(s.errs, [], 'لا أخطاء صفحة (إنشاء الموقع)');
  await s.ctx.close();
}
async function openRounds(s, lens) {
  const p = s.page;
  await s.go('#/daily/rounds', 6000);
  await p.locator('main button[title^="' + lens + '"]').first().click(); await p.waitForTimeout(900);
}
const pickZone = async (p, i) => { await p.locator('main svg path[d^="M' + (100 + i * 150) + ' 100 L"]').first().click({ force: true }); await p.waitForTimeout(900); };
const field = (p, label) => p.locator('xpath=//main//label[normalize-space()="' + label + '"]/following-sibling::div[1]//input');
async function typeIn(p, label, v) {
  const post = p.waitForResponse(SAVE, { timeout: 20000 });
  await field(p, label).fill(String(v)); await field(p, label).press('Tab');
  return post;
}

test('جولات ①: مديرُ الإدارة وموظفٌ بدور — قراءةُ «عدد المصلين الآن» والنسبة على المصلى المختار تُحفظ وتبقى بعد التحميل · والتسكينُ من قائمته', { timeout: 900000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await setupSite(b, lab);
    await grant(b, lab, LEVELS_FULL);
    let k = 0;
    for (const { who, un } of ACTORS) {
      const N = 120 + 37 * k, PCT = 25 + 25 * k, P1 = 30 + 10 * k; k++;   /* قيمٌ مختلفة لكل حساب: القيمةُ نفسُها لا تُرسل حفظاً */
      const s = await openAs(b, lab, un, LAB.pw), p = s.page; p.setDefaultTimeout(20000); await toasts(s);
      const fail = async (e) => { throw new Error(who + ': ' + e.message + ' — ' + JSON.stringify(await seen(s)) + ' · ' + norm(await mainText(p)).slice(-700)); };
      /* القراءةُ بالعدد على «TZ0» (سعتُه 400) */
      await openRounds(s, 'وضع الكثافة').catch(fail); await pickZone(p, 0);
      assert.ok(norm(await mainText(p)).includes('TZ0'), who + ': المصلى المختار في اللوحة (TZ0)');
      assert.ok(await field(p, 'عدد المصلين الآن').count(), who + ': حقلُ «عدد المصلين الآن» ظاهر');
      const r1 = await typeIn(p, 'عدد المصلين الآن', N).catch(fail);
      assert.equal(r1.status(), 200, who + ': ' + (await r1.text()).slice(0, 300));
      await lab.idle();
      assert.ok(pcOf(await zoneAt(s, TODAY, 0)).some((x) => x.n === N && x.cap === 400), who + ': في الخادم {n: ' + N + ', cap: 400}: ' + JSON.stringify((await zoneAt(s, TODAY, 0)).pc));
      await reloadAt(s, '#/daily/rounds', 5000);
      await p.locator('main button[title^="وضع الكثافة"]').first().click(); await p.waitForTimeout(900); await pickZone(p, 0);
      assert.equal(norm(await field(p, 'عدد المصلين الآن').inputValue()), String(N), who + ': القراءةُ باقيةٌ بعد التحميل');
      /* النسبة: PCT٪ من 400 */
      const r2 = await typeIn(p, 'نسبة الإشغال', PCT).catch(fail);
      assert.equal(r2.status(), 200, who + ': ' + (await r2.text()).slice(0, 300)); await lab.idle();
      assert.ok(pcOf(await zoneAt(s, TODAY, 0)).some((x) => x.n === PCT * 4 && x.cap === 400), who + ': النسبة ⇒ {n: ' + PCT * 4 + ', cap: 400}: ' + JSON.stringify((await zoneAt(s, TODAY, 0)).pc));
      /* المصلى بلا سعة: لا عدد، والنسبةُ وحدها */
      await pickZone(p, 1);
      assert.ok(norm(await mainText(p)).includes('TZ1'), who + ': المصلى الثاني مختار');
      assert.equal(await field(p, 'عدد المصلين الآن').count(), 0, who + ': بلا سعة ⇒ لا «عدد المصلين الآن»');
      const r3 = await typeIn(p, 'نسبة الإشغال', P1).catch(fail);
      assert.equal(r3.status(), 200, who + ': ' + (await r3.text()).slice(0, 300)); await lab.idle();
      assert.ok(pcOf(await zoneAt(s, TODAY, 1)).some((x) => x.n === null && x.cap === 0 && x.p === P1), who + ': {n: null, cap: 0, p: ' + P1 + '}: ' + JSON.stringify((await zoneAt(s, TODAY, 1)).pc));
      await reloadAt(s, '#/daily/rounds', 5000);
      await p.locator('main button[title^="وضع الكثافة"]').first().click(); await p.waitForTimeout(900); await pickZone(p, 1);
      assert.equal(norm(await field(p, 'نسبة الإشغال').inputValue()), String(P1), who + ': النسبةُ باقيةٌ بعد التحميل');
      /* التسكين: «توزيع» ← المصلى ← قائمةُ التسكين ← موظف */
      await p.locator('main button[title^="وضع التوزيع"]').first().click(); await p.waitForTimeout(900); await pickZone(p, 0);
      const pick = p.locator('main label').filter({ has: p.locator('input[type=checkbox]:not(:checked)') }).first();
      await pick.waitFor().catch(fail);
      const name = norm(await pick.innerText());
      const post = p.waitForResponse(SAVE, { timeout: 20000 }); await pick.click(); const r4 = await post.catch(fail);
      assert.equal(r4.status(), 200, who + ': التسكين: ' + (await r4.text()).slice(0, 300)); await lab.idle();
      const emp = ((await zoneAt(s, TODAY, 0)) || {}).emp || [];
      assert.ok(emp.length >= k, who + ': المسكَّن في الخادم (' + name + '): ' + JSON.stringify(emp));
      await reloadAt(s, '#/daily/rounds', 5000);
      await p.locator('main button[title^="وضع التوزيع"]').first().click(); await p.waitForTimeout(900); await pickZone(p, 0);
      assert.ok(await p.locator('main label', { hasText: name.slice(0, 20) }).filter({ has: p.locator('input[type=checkbox]:checked') }).count(), who + ': «' + name + '» مسكَّنٌ بعد التحميل');
      assert.deepEqual((await seen(s)).filter(isArabicRefusal), [], who + ': بلا رسالة رفض');
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});

/* القراءةُ من منطق الصفحة نفسِه: ما يستدعيه حقلُ «عدد المصلين الآن» (_occApply.n) على المصلى المختار */
const forgeReading = (p, n) => L(p, 'L._pickSel("zone", 0); await new Promise((go) => setTimeout(go, 700)); const a = L._occApply; if (!a || !a.n) return "no-apply"; a.n(arg); await new Promise((go) => setTimeout(go, 2500)); return "sent";', n);

test('جولات ②: موظفٌ بدور «مشاهدة» — لا حقلَ قراءةٍ ولا تسكين، والقراءةُ من منطق الصفحة تُرفض برسالةٍ عربية ولا يتغيّر شيء', { timeout: 600000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await setupSite(b, lab);
    await grant(b, lab, LEVELS_VIEW);
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page; p.setDefaultTimeout(20000); await toasts(s);
    const before = JSON.stringify(await rounds(s));
    await s.go('#/daily/rounds', 6000);
    const dens = await p.locator('main button[title^="وضع الكثافة"]').count();
    if (dens) { await p.locator('main button[title^="وضع الكثافة"]').first().click(); await p.waitForTimeout(900); await pickZone(p, 0); }
    const editable = await p.locator('xpath=//main//label[normalize-space()="عدد المصلين الآن" or normalize-space()="نسبة الإشغال"]/following-sibling::div[1]//input[not(@disabled) and not(@readonly)]').count();
    assert.equal(editable, 0, 'لا حقلَ قراءةٍ يُكتب لدور «مشاهدة» (زرُّ الكثافة ' + (dens ? 'ظاهر' : 'غير ظاهر') + ')');
    assert.equal(await p.locator('main button[title^="وضع التوزيع"]').count() && (await p.locator('main label').filter({ has: p.locator('input[type=checkbox]') }).count()), 0, 'لا قائمةَ تسكين');
    const t0 = (await seen(s)).length;
    const sent = await forgeReading(p, 77);
    await until(async () => (await seen(s)).slice(t0).some(isArabicRefusal), 'رسالةُ رفضٍ عربية (' + sent + ')').catch(async (e) => { throw new Error(e.message + ' — ' + JSON.stringify(await seen(s))); });
    await lab.idle();
    assert.equal(JSON.stringify(await rounds(s)), before, 'لا يتغيّر شيء في الخادم');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

test('جولات ③: اليومُ المنقضي مقفل — مديرُ الإدارة وموظفٌ بدور «كامل»: لا لوحةَ قراءة، والقراءةُ من منطق الصفحة تُرفض برسالةٍ عربية ولا يتغيّر شيء', { timeout: 900000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await setupSite(b, lab);
    await grant(b, lab, LEVELS_FULL);
    /* اليومُ الماضي: جولةُ اليوم نفسُها مبذورةً فيه (TEST_ONLY) */
    const su = await openAs(b, lab, LAB.mgrA, LAB.pw); const R0 = await rounds(su); await su.ctx.close();
    await replaceOperationalFixture(lab.env, KR, { ...R0, [PAST]: JSON.parse(JSON.stringify(R0[TODAY])) });
    const [py, pm, pd] = PAST.split('-').map(Number);
    for (const { who, un } of ACTORS) {
      const s = await openAs(b, lab, un, LAB.pw), p = s.page; p.setDefaultTimeout(20000); await toasts(s);
      const before = JSON.stringify((await rounds(s))[PAST]);
      await s.go('#/daily/rounds', 6000);
      await L(p, 'L.setState({ year: arg[0], month: arg[1], day: arg[2] }); await new Promise((go) => setTimeout(go, 1500)); return 1;', [py, pm, pd]);
      const dens = await p.locator('main button[title^="وضع الكثافة"]').count();
      if (dens) { await p.locator('main button[title^="وضع الكثافة"]').first().click(); await p.waitForTimeout(900); await pickZone(p, 0); }
      assert.equal(await field(p, 'نسبة الإشغال').count(), 0, who + ': لا لوحةَ قراءة في اليوم المقفل');
      const t0 = (await seen(s)).length;
      const sent = await forgeReading(p, 55);
      await until(async () => (await seen(s)).slice(t0).some(isArabicRefusal) || isArabicRefusal(norm(await mainText(p)).match(/[^.]*مقفل[^.]*/)?.[0]), who + ': رسالةُ رفضٍ عربية (' + sent + ')')
        .catch(async (e) => { throw new Error(e.message + ' — ' + JSON.stringify(await seen(s))); });
      await lab.idle();
      assert.equal(JSON.stringify((await rounds(s))[PAST]), before, who + ': اليومُ المقفل لم يتغيّر');
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});
