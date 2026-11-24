/* V7 · د6 (QA distfix · 51ج) — «الجولات» ← «وضع التوزيع» ← نقرُ مصلًّى ← اختيارُ موظف: مديرُ الإدارة التجريبية على iPhone 13 كان يتلقّى
   403 (bassam_rounds_v1 why:"scope" · lens.zones.data.edit · gates · marks · DateRange=locked-period). السببُ الجذري: ختمُ المعرّفات
   (BassamAudit.stampRounds) يضيف eid لكل عنصرٍ ناقصٍ في كل أيام الملف، فيصل للخادم «تعديلٌ» لأيامٍ ماضيةٍ مقفلة لم يلمسها المستخدم.
   هنا: الحفظُ ينجح، واليومُ الحاليُّ وحده يتغيّر، والأيامُ الماضية تبقى بقيمتها المخزّنة بايتاً — والخادمُ ما زال يرفض تعديلاً حقيقياً ليومٍ ماضٍ مقفل.
   مختبرٌ معزول · بياناتُ العرض TEST_ONLY · بلا شبكة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const { devices } = createRequire(process.env.KIVO_PLAYWRIGHT || (execSync('npm root -g').toString().trim() + '/'))('playwright');
const RK = 'bsdept:tst_demo_d1:bassam_rounds_v1';
const stored = async (s) => (await s.api('/api/operations/read?keys=' + encodeURIComponent(RK))).j.resources[RK];   /* القيمةُ المخزّنة كما يقرؤها الخادم */

test('V7 · د6 QA distfix — rounds distribution mode: the department manager (iPhone 13, demo data) assigns an employee on today without a 403', { timeout: 600000 }, async (t) => {
  const lab = await startLab(), b = await chromium.launch();
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const seed = await su.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
    const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1');
    const dev = devices['iPhone 13'];
    const s = await openAs(b, lab, m1.un, m1.pw, { viewport: dev.viewport, context: dev });
    const p = s.page; p.setDefaultTimeout(20000);
    const r0 = await s.api('/api/operations/read?keys=' + encodeURIComponent(RK));
    const before = r0.j.resources[RK], days = Object.keys(before).filter((k) => /^\d+-\d+-\d+$/.test(k)).sort((a, c) => +c.split('-')[2] - +a.split('-')[2]);
    assert.ok(days.length >= 2, 'the seed has today and past days of the month: ' + days);
    const oldest = days[days.length - 1];   /* أقدمُ أيام العرض: ماضٍ مقفلٌ بساعة الخادم (dsToday بمهلة 3 ساعات) */
    const saves = [];
    p.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save\b/.test(r.url())) { let j = null; try { j = await r.json(); } catch (e) {} saves.push({ st: r.status(), j }); } });
    await s.go('#/daily/rounds', 4500);
    await p.locator('main button[title^="وضع التوزيع"]').first().click();
    await p.waitForTimeout(1200);
    const later = p.getByText('لاحقاً'); if (await later.count()) await later.first().tap().catch(() => {});   /* شريطُ «أضف إلى الشاشة الرئيسية» على الهاتف */
    await p.locator('main svg path[d^="M0 0 L10 0"]').first().tap({ force: true });   /* المصلى DZ110 */
    await p.waitForTimeout(1200);
    const pick = p.locator('main label', { hasText: 'موظف ١-١' }).first();
    await pick.waitFor();
    const n0 = saves.length;
    await pick.tap();
    const t0 = Date.now(); while (saves.length === n0 && Date.now() - t0 < 15000) await p.waitForTimeout(200);
    await p.waitForTimeout(1500); await lab.idle();
    t.diagnostic('saves: ' + JSON.stringify(saves.slice(n0)).slice(0, 600));
    assert.ok(saves.length > n0, 'the pick sent a save');
    for (const x of saves.slice(n0)) assert.equal(x.st, 200, 'POST /api/save is accepted (no 403 locked-period): ' + JSON.stringify(x.j).slice(0, 400));
    const after = await stored(s);
    if (process.env.DISTFIX_DUMP) (await import('node:fs')).writeFileSync(process.env.DISTFIX_DUMP, JSON.stringify({ before, after }, null, 1));
    const changed = days.filter((d) => JSON.stringify(after[d]) !== JSON.stringify(before[d]));
    assert.equal(changed.length, 1, 'only the day the page edits changed (the assignment) — changed: ' + changed);
    for (const d of days) if (d !== changed[0]) assert.deepEqual(after[d], before[d], 'the other day ' + d + ' is stored exactly as before — the save did not touch it');
    assert.notEqual(changed[0], oldest, 'the edited day is not the past locked one');
    /* السالب: تعديلٌ حقيقيٌّ ليومٍ ماضٍ مقفل ما زال يُرفض في الخادم (نفسُ مسار الحفظ في الصفحة) */
    const neg = await p.evaluate(async ([k, d]) => {
      const svc = KIVO.__BS_SRV.operations, dr = svc.draft(), v = dr.get('bassam_rounds_v1');
      v[d].d[0].zones[2].emp = ['tst_demo_e14'];
      dr.set('bassam_rounds_v1', v);
      const tk = dr.stage(); if (!tk || !tk.requestId) return { staged: tk };
      let r; try { r = await svc.flush(tk); } catch (e) { r = { err: String(e && e.message || e) }; }
      try { svc.release(tk); } catch (e) {}
      return { ok: r && r.ok, status: r && r.status, err: r && r.err, locked: /locked-period/.test(JSON.stringify(r)), scope: /\\?"why\\?":\\?"scope/.test(JSON.stringify(r)) };
    }, [RK, oldest]).catch((e) => ({ evalErr: String(e.message).slice(0, 300) }));
    t.diagnostic('negative: ' + JSON.stringify(neg).slice(0, 600));
    await lab.idle();
    assert.ok(neg && neg.ok !== 1 && neg.status === 403 && neg.locked, 'the server refuses the past locked day (locked-period): ' + JSON.stringify(neg));
    assert.deepEqual((await stored(s))[oldest], before[oldest], 'a real edit of a past locked day is not stored');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
