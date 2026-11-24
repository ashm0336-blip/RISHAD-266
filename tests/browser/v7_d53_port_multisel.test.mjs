/* V7 · 53 (ملحق 6 · البند 6): التحديدُ المتعدد للمصليات وتغييرُ حالتها دفعةً واحدة بنافذة تأكيد — على العامل الحقيقي (الإنفاذ)
   ونسخةٍ بشكل Production مستوردةٍ بالبروتوكول (oldFile({small:true}): عناصرُها بلا eid · أيامٌ تاريخية مؤرشفة · يومان حيّان في الشهر الجاري).
   مديرُ الإدارة (tst_demo_u_m1) في «الجولات»: أداةُ «تحديد متعدد» ← لمسُ مصلّيين (متوقفٌ ومفعّل) ← «تفعيل المحدَّد» ← نافذةُ التأكيد:
     • الإلغاءُ لا يرسل شيئاً · التأكيدُ طلبُ حفظٍ واحد يقبله الخادم: المتوقفُ المحدَّد فُعِّل بختم الميدان، والمفعّلُ وغيرُ المحدَّد كما هما،
       والأيامُ التاريخية في الخادم حرفاً كما كانت (0010) — ويُقرأ كلُّ مورد بعد الاستيراد (readBack).
     • تعارض: تعديلٌ من جلسةٍ أخرى بين التحديد والتأكيد ⇒ يُرفض الطلبُ كلُّه (لا يُكتب من المجموعة شيء) ويبقى تعديلُ الآخر.
     • يومٌ مضى (مقفلٌ تلقائياً): لا أداةَ ولا كتابة.
   مختبرٌ معزول بلا شبكة · TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';
import { oldFile, client, protocol, readBack } from '../unit/v7_d6_import_fx.mjs';

const B = 'tst_demo_d1', SCOPE = { kind: 'dept', departmentId: B }, RK = 'bsdept:' + B + ':bassam_rounds_v1';
const need = hasSystem('plan', 'daily') ? {} : { skip: 'يحتاج نظامَي الخطة والجولات' };
const clone = (v) => JSON.parse(JSON.stringify(v));
const noEid = (z) => { const x = { ...z }; delete x.eid; return JSON.stringify(x); };
/* مكوّنُ صفحة الجولات (الصنفُ الذي يحمل _dsCanEditZones) — دالّةٌ تُرسل إلى الصفحة (لا eval داخلها: CSP) */
const finder = () => { for (const el of document.querySelectorAll('main *')) { const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let x = fk ? el[fk] : null;
  while (x) { const n = x.stateNode; for (const c of [n, n && n.logic]) if (c && typeof c._dsCanEditZones === 'function' && c.state && c.state.rounds && Object.keys(c.state.rounds).length) { window.__pc = c; return true; } x = x.return; } } return false; };

async function world() {
  const lab = await startLab(), b = await chromium.launch();
  try {
    lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
    const C = client(lab), su = await C.login(LAB.superUn, LAB.superPw), T = { lab, DB: lab.env.DB, ...C, su };
    const sa = await openAs(b, lab, LAB.superUn, LAB.superPw), seed = await sa.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
    const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1');
    const H = await sa.page.evaluate(() => KIVO.BassamCal.hNow(new Date(), null));
    await sa.ctx.close();
    const days = [H.d - 1, H.d].filter((d) => d >= 1), DAY = H.y + '-' + H.m + '-' + H.d, PAST = days.length > 1 ? H.y + '-' + H.m + '-' + days[0] : null;
    const f = await oldFile({ small: true, lenses: null, open: { y: H.y, m: H.m, days } });
    const rounds = JSON.parse(f.data.bassam_rounds_v1);
    assert.ok(rounds[DAY] && rounds[DAY].d[0].zones.length >= 2, 'يومُ الصفحة في النسخة بمصلياته');
    const z = rounds[DAY].d[0].zones;
    z.push({ ...clone(z[0]), uid: z[0].uid + '_TEST_ONLY_c', code: z[0].code + 'c', d: 'M600 300 L700 300 L700 400 L600 400 Z' });   /* مصلى ثالث (غيرُ محدَّد) */
    z.forEach((x, i) => (i === 1 ? (x.off = true) : delete x.off));
    f.data.bassam_rounds_v1 = JSON.stringify(rounds);
    assert.equal(/"eid":/.test(f.data.bassam_rounds_v1), false, 'النسخةُ كـProduction: عناصرُها بلا eid');
    const run = await protocol(T, su, f, { scope: SCOPE }).run();
    assert.ok(run.commit && run.commit.status === 200 && run.commit.j.ok, 'الاستيراد: ' + JSON.stringify({ failedAt: run.failedAt, commit: run.commit && run.commit.j }).slice(0, 1200));
    await readBack(T, B);
    const s = await openAs(b, lab, m1.un, m1.pw), p = s.page, saves = [];
    p.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save\b/.test(r.url())) { let j = null; try { j = await r.json(); } catch (e) { /* بلا جسم */ } saves.push({ st: r.status(), j }); } });
    await s.go('#/daily/rounds', 3000);
    await p.waitForFunction(finder, null, { timeout: 60000, polling: 250 });
    const read = async () => (await s.api('/api/operations/read?keys=' + encodeURIComponent(RK))).j.resources[RK];
    const close = async () => { await b.close(); await lab.close(); };
    return { lab, T, s, p, saves, H, DAY, PAST, m1, read, close, b, su };
  } catch (e) { await b.close(); await lab.close(); throw e; }
}
/* الصفحةُ على يومٍ وموقعه الأول في عدسة المصليات وشريطُ الأدوات مفتوح */
const at = (p, y, m, d) => p.evaluate(([y, m, d]) => new Promise((r) => window.__pc.setState({ year: y, month: m, day: d, floor: 0, dsTab: 'rounds', lens: 'zones', panelTab: 'zones', dsAsn: false, tool: 'select', dsToolsOpen: true, dsSel: null, selMulti: [], dsMulti: false, dview: { x: 0, y: 0, w: 1000, h: 600 } }, r)), [y, m, d]);
/* لمسُ مصلى i في الخريطة: نقرةٌ حقيقية على عنصره (معالجُ React نفسُه) */
const tapZone = (p, i) => p.evaluate((i) => {
  const c = window.__pc, s = c.state, k = s.year + '-' + s.month + '-' + s.day, site = c._rdAt(s.rounds[k].d, s.floor), d = site.zones[i].d;
  const el = [...document.querySelectorAll('svg[data-ds-zoom] path')].find((x) => x.getAttribute('d') === d && x.getAttribute('fill') !== 'none');
  if (!el) return false;
  for (const t of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'touch', isPrimary: true, pointerId: 7 }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
}, i);
/* زرُّ شريط الأفعال الجماعية (لوحةٌ قائمة: «تفعيل» · «تعطيل») */
const dock = (p, name) => p.locator('div[data-dock="1"] button').filter({ hasText: new RegExp('^\\s*' + name + '\\s*$') });
const selected = (p) => p.evaluate(() => JSON.stringify(window.__pc.state.selMulti));

test('53 ملحق 6 · 6 — التحديدُ المتعدد على نسخةٍ بشكل Production: تأكيدٌ ثم حفظٌ ذرّيٌّ واحد · التاريخُ كما هو · التعارضُ يرفض الكل · اليومُ الماضي بلا أداة', { timeout: 900000, ...need }, async () => {
  const W = await world(), { p, H, DAY } = W;
  try {
    const before = await W.read();
    await at(p, H.y, H.m, H.d); await p.waitForTimeout(600);
    const tool = p.getByRole('button', { name: 'تحديد متعدد للمصليات', exact: true });
    const why = await p.evaluate(() => { const c = window.__pc, s = c.state, v = c.renderVals(), k = s.year + '-' + s.month + '-' + s.day;
      const btn = document.querySelector('[aria-label="تحديد متعدد للمصليات"]'), bar = document.getElementById('bsDsToolsBar'); return { dom: !!btn, rect: btn && JSON.stringify(btn.getBoundingClientRect()), barOn: !!bar, barRect: bar && JSON.stringify(bar.getBoundingClientRect()), hash: location.hash, k, has: !!(s.rounds[k]), lock: c._dsLockInfo(), canW: c._dsCanWrite(), lens: c.bsLensOn('zones'), on: v.dsMultiToolOn, open: v.dsToolsOpenOn, bar: v.dsCanDrawBar, edit: c._dsCanEditZones() }; });
    assert.ok(await tool.isVisible(), 'الأداةُ في شريط أدوات المصليات: ' + JSON.stringify(why));
    await tool.click(); await p.waitForTimeout(300);
    assert.equal(await tool.getAttribute('aria-pressed'), 'true');
    assert.ok(await tapZone(p, 0) && await tapZone(p, 1), 'المصلّيان في الخريطة');
    await p.waitForTimeout(300);
    assert.equal(await selected(p), '[0,1]', 'لمستان بلا Ctrl ⇒ مصلّيان');
    /* الإلغاء */
    const n0 = W.saves.length;
    await dock(p, 'تفعيل').click();
    await p.locator('#bsCfmOk').waitFor({ timeout: 10000 });
    assert.match(await p.locator('#bsCfm').innerText(), /أصلًا ولن تتغيّر/, 'المجموعةُ المختلطة معلنة في النافذة');
    await p.locator('#bsCfmNo').click(); await p.waitForTimeout(1500);
    assert.equal(W.saves.length, n0, 'الإلغاءُ لا يرسل شيئاً');
    /* التأكيد */
    await dock(p, 'تفعيل').click();
    await p.locator('#bsCfmOk').click();
    const t0 = Date.now(); while (W.saves.length === n0 && Date.now() - t0 < 20000) await p.waitForTimeout(200);
    await p.waitForTimeout(1500);
    assert.equal(W.saves.length, n0 + 1, 'طلبُ حفظٍ واحد للمجموعة');
    assert.equal(W.saves[n0].st, 200, 'الخادمُ قبله: ' + JSON.stringify(W.saves[n0].j).slice(0, 600));
    const after = await W.read(), z = after[DAY].d[0].zones, z0 = before[DAY].d[0].zones;
    assert.equal(!!z[1].off, false, 'المتوقفُ المحدَّد فُعِّل في الخادم');
    assert.ok(z[1].fAt && Array.isArray(z[1].fLog) && z[1].fLog.length, 'بختم الميدان');
    assert.equal(noEid(z[0]), noEid(z0[0]), 'المفعّلُ أصلاً كما هو'); assert.equal(noEid(z[2]), noEid(z0[2]), 'غيرُ المحدَّد كما هو');
    for (const k of Object.keys(before).filter((k) => /^\d+-\d+-\d+$/.test(k) && k !== DAY))
      assert.equal(JSON.stringify(after[k]), JSON.stringify(before[k]), 'اليومُ التاريخي في الخادم حرفاً كما كان: ' + k);
    assert.equal(await selected(p), '[]');
    /* التعارض: جلسةٌ أخرى (مديرُ المنصة) تعدّل اسمَ المصلى 2 بين التحديد والتأكيد ⇒ الطلبُ كلُّه يُرفض */
    await tapZone(p, 0); await tapZone(p, 2); await p.waitForTimeout(300);
    assert.equal(await selected(p), '[0,2]');
    const s2 = await openAs(W.b, W.lab, W.m1.un, W.m1.pw); await s2.go('#/daily/rounds', 4000);
    const other = await s2.page.evaluate(async ([RN, day]) => {
      const svc = KIVO.__BS_SRV.operations, dr = svc.draft(), v = dr.get(RN);
      v[day].d[0].zones[2].name = 'TEST_ONLY · عدّله غيري'; dr.set(RN, v);
      const tk = dr.stage(); if (!tk || !tk.requestId) return { staged: tk };
      const r = await svc.flush(tk); try { svc.release(tk); } catch (e) { /* مُحرَّر */ }
      return { ok: r && r.ok };
    }, ['bassam_rounds_v1', DAY]);
    assert.equal(other.ok, 1, 'تعديلُ الجلسة الأخرى حُفظ: ' + JSON.stringify(other));
    await s2.ctx.close();
    const mid = await W.read();
    assert.equal(mid[DAY].d[0].zones[2].name, 'TEST_ONLY · عدّله غيري');
    const n1 = W.saves.length;
    await dock(p, 'تعطيل').click();
    await p.locator('#bsCfmOk').click();
    const t1 = Date.now(); while (W.saves.length === n1 && Date.now() - t1 < 20000) await p.waitForTimeout(200);
    await p.waitForTimeout(2500);
    const fin = await W.read();
    assert.ok(W.saves.slice(n1).every((x) => !(x.st === 200 && x.j && x.j.ok === 1)), 'طلبُ المجموعة لم يُقبل بعد تعديل غيري: ' + JSON.stringify(W.saves.slice(n1)).slice(0, 600));
    assert.equal(JSON.stringify(fin), JSON.stringify(mid), 'لا يُكتب من المجموعة شيء، ويبقى تعديلُ الآخر');
    /* يومٌ مضى: لا أداة */
    if (W.PAST) {
      const [y, m, d] = W.PAST.split('-').map(Number);
      await at(p, y, m, d); await p.waitForTimeout(800);
      assert.equal(await p.getByRole('button', { name: 'تحديد متعدد للمصليات', exact: true }).count(), 0, 'اليومُ الماضي مقفل: لا أداة');
    }
    assert.deepEqual(W.s.errs, [], 'بلا أخطاء صفحة');
  } finally { await W.close(); }
});
