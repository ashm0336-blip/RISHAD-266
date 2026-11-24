/* V7 · 53 (ما لم يُنجز من 52 — رحلةُ «إيقاف الكل» على الجوال): محرّرُ الدور على iPhone 13 في المختبر المعزول (TEST_ONLY · الإنفاذ · بلا page.route).
   دورٌ فيه صفٌّ ظاهر (المهام) وصفُّ عدسةٍ مفعّلة للوحدة (المصليات) وصفٌّ لنظامٍ أُطفئ بعدُ للوحدة (الإحصائيات اليومية — لا يُعرض في المحرّر):
     ① مديرُ الإدارة بلمس الشاشة: يفتح الدور ← «إيقاف الكل» (ظاهرٌ في الشاشة بلا تمريرٍ أفقي للصفحة) ← «مراجعة وحفظ» ← «حفظ» ⇒ لا رفض ولا خطأ صفحة؛
        المخزَّن: الصفّان الظاهران أُطفئا، وصفُّ النظام المطفأ محمولٌ كما هو حرفاً؛ بعد إعادة التحميل المحرّرُ يعرض الصفّين «بلا صلاحية»،
        والموظفُ حاملُ الدور (على الجوال أيضاً) لم يعد يملك المهام.
     ② الموظفُ حاملُ الدور: لا محرّرَ أدوارٍ له، وحفظُ الأدوار من الصفحة نفسِها (KIVO.Perm44 — كاتبُ المحرّر) يُرفض برسالةٍ عربية ولا يتغيّر شيء. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { isArabicRefusal } from './d7_cov_lib.mjs';

const { devices } = createRequire(process.env.KIVO_PLAYWRIGHT || (execSync('npm root -g').toString().trim() + '/'))('playwright');
const PHONE = devices['iPhone 13'], phone = { viewport: PHONE.viewport, context: { userAgent: PHONE.userAgent, deviceScaleFactor: PHONE.deviceScaleFactor, isMobile: true, hasTouch: true } };
const A = 'TEST_ONLY_A', EMP = 'TEST_ONLY_eA1', KR = 'bsdept:' + A + ':bassam_roles_v1', KG = 'bsdept:' + A + ':bassam_grants_v1';
const OFF = 'dstats', LROW = 'lens.zones';
const P = (p, sel, o) => p.locator('main .p44 ' + sel, o);
const kv = (lab, k) => { const r = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : null; };
const settle = async (lab, p, ms = 900) => { await p.waitForTimeout(ms); await lab.idle(); };
const ROLE = { id: 'TEST_ONLY_r_53m', name: 'TEST_ONLY دور الجوال', sys: { tasks: { lvl: 'view' }, [OFF]: { lvl: 'view' }, [LROW]: { lvl: 'full' } } };

async function superDo(b, lab, fn, arg) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000);
  await s.go('#/sysadmin/org/' + A + '/roles', 3000);
  const r = await s.page.evaluate(fn, arg);
  await s.page.evaluate(() => KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync && KIVO.__BS_SRV.flushAsync()); await settle(lab, s.page, 1500);
  assert.deepEqual(s.errs, [], 'no page errors (platform admin)');
  await s.ctx.close(); return r;
}
async function world(b, lab) {
  const g = await superDo(b, lab, async ([d, role, e]) => {
    const E = KIVO.Perm44, rec = E.rolesOf(d), dr = E.draft(d);
    rec.roles.push(role); rec.people[e] = { role: role.id, ex: [] };
    const w = E.setRoles(dr, d, rec); if (!w.ok) return w; return E.commit(dr);
  }, [A, ROLE, EMP]);
  assert.equal(g.ok, true, 'the platform admin grants the role: ' + JSON.stringify(g));
  const c = await superDo(b, lab, ([d, sys]) => { const P = KIVO.BassamPerm; return P.setDeptCap(d, P.rawCap(d).filter((k) => k !== sys)); }, [A, OFF]);
  assert.ok(c && c.ok !== false, 'dstats OFF for A: ' + JSON.stringify(c));
  assert.ok(!kv(lab, 'bassam_perms_v1').caps[A].includes(OFF), 'dstats is OFF for A');
}

test('V7 · 53 ① mobile «إيقاف الكل» (iPhone 13): the manager turns the shown rows OFF by touch and saves — stored, after reload, and the role holder lost them', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    await world(b, lab);
    const r0 = kv(lab, KR).roles.find((r) => r.id === ROLE.id), g0 = kv(lab, KG).emp[EMP];
    assert.ok(g0.plus.some((k) => /^tasks?\./.test(k)) && g0.plus.some((k) => k.startsWith(LROW + '.')), 'the role grants tasks and the zones lens: ' + JSON.stringify(g0));
    const e0 = await openAs(b, lab, LAB.empA, LAB.pw, phone); await e0.go('#/profile', 3000);
    assert.equal(await e0.page.evaluate(() => KIVO.BassamPerm.can('tasks', 'view')), true, 'before: the role holder sees tasks');
    await e0.ctx.close();

    const m = await openAs(b, lab, LAB.mgrA, LAB.pw, phone), p = m.page; p.setDefaultTimeout(15000);
    const answers = []; p.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save$/.test(new URL(r.url()).pathname)) { let j = null; try { j = await r.json(); } catch (e) { j = null; } answers.push({ st: r.status(), j: j || {} }); } });
    await m.go('#/admin/perm/' + A + '/roles', 3500);
    const later = p.getByText('لاحقاً'); if (await later.count()) await later.first().tap().catch(() => {});   /* شريطُ «أضف إلى الشاشة الرئيسية» */
    await P(p, '.p44-role', { hasText: ROLE.name }).first().tap(); await p.waitForTimeout(500);
    const stop = P(p, '.p44-strip button', { hasText: 'إيقاف الكل' }).first();
    await stop.scrollIntoViewIfNeeded();
    const box = await stop.boundingBox(), vw = PHONE.viewport.width;
    assert.ok(box && box.x >= 0 && box.x + box.width <= vw + 1 && box.width >= 24 && box.height >= 24, '«إيقاف الكل» is inside the phone width and touchable: ' + JSON.stringify(box));
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'the page does not scroll sideways on the phone');
    await stop.tap(); await p.waitForTimeout(400);
    await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).first().tap(); await p.waitForTimeout(500);
    await P(p, '.p44-rev button', { hasText: 'حفظ' }).last().tap(); await settle(lab, p, 2500);
    assert.ok(answers.length >= 1, 'a save was sent');
    assert.deepEqual(answers.filter((x) => x.st !== 200 || Object.keys(x.j.denied || {}).length).map((x) => x.st + ' ' + JSON.stringify(x.j.denied)), [], 'no refusal from the server');
    assert.deepEqual(m.errs, [], 'no page errors (manager on the phone)');
    const r1 = kv(lab, KR).roles.find((r) => r.id === ROLE.id);
    assert.equal(r1.sys.tasks, undefined, 'stored: the shown system row is OFF');
    assert.equal(r1.sys[LROW], undefined, 'stored: the shown lens row is OFF');
    assert.deepEqual(r1.sys[OFF], r0.sys[OFF], 'stored: the OFF system row is carried as stored: ' + JSON.stringify(r1.sys));
    /* بعد إعادة التحميل: المحرّرُ يعرض الصفّين بلا صلاحية */
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4500);
    await P(p, '.p44-role', { hasText: ROLE.name }).first().tap(); await p.waitForTimeout(600);
    const lv = await p.evaluate(() => [...document.querySelectorAll('main .p44 select[aria-label^="مستوى "]')].map((x) => [x.getAttribute('aria-label'), x.value]));
    assert.ok(lv.length >= 2, 'the editor rows are shown after reload: ' + JSON.stringify(lv));
    const sel = Object.fromEntries(lv), noneOf = (n) => !sel[n] || sel[n] === '' || sel[n] === 'none';
    assert.ok(noneOf('مستوى المهام') && noneOf('مستوى المصليات'), 'after reload: tasks and the zones lens show no right: ' + JSON.stringify(lv));
    await m.ctx.close();
    const e1 = await openAs(b, lab, LAB.empA, LAB.pw, phone); await e1.go('#/profile', 3000);
    assert.equal(await e1.page.evaluate(() => KIVO.BassamPerm.can('tasks', 'view')), false, 'after: the role holder no longer sees tasks');
    const g1 = kv(lab, KG).emp[EMP];
    assert.ok(!g1 || !(g1.plus || []).some((k) => /^tasks?\./.test(k) || k.startsWith(LROW + '.')), 'his grant lost tasks and the lens: ' + JSON.stringify(g1));
    assert.deepEqual(e1.errs, [], 'no page errors (employee)');
    await e1.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

test('V7 · 53 ② mobile: the role holder has no role editor, the page shows no editor (redirect or Arabic message), a roles save from his page is refused by the server and changes nothing', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    await world(b, lab);
    const before = JSON.stringify(kv(lab, KR)), gBefore = JSON.stringify(kv(lab, KG));
    const e = await openAs(b, lab, LAB.empA, LAB.pw, phone), p = e.page; p.setDefaultTimeout(15000);
    await e.go('#/admin/perm/' + A + '/roles', 3500);
    assert.equal(await P(p, '.p44-strip button', { hasText: 'إيقاف الكل' }).count(), 0, 'no «إيقاف الكل» for the role holder');
    assert.equal(await P(p, '.p44-role').count(), 0, 'no role editor for the role holder');
    const r = await p.evaluate(async ([d, id]) => {
      const E = KIVO.Perm44, rec = JSON.parse(JSON.stringify(E.rolesOf(d))), x = rec.roles.find((q) => q.id === id);
      if (x) x.sys = {}; else rec.roles.push({ id, name: 'TEST_ONLY', sys: {} });
      let w; try { const dr = E.draft(d); w = E.setRoles(dr, d, rec); if (w && w.ok) w = await E.commit(dr); } catch (err) { w = { ok: false, err: String(err && err.message || err) }; }
      return w;
    }, [A, ROLE.id]);
    await lab.idle();
    assert.notEqual(r && r.ok, true, 'the roles save is refused: ' + JSON.stringify(r));
    assert.ok((r.denied || []).includes(KR), 'the server refuses the roles record: ' + JSON.stringify(r));
    /* ما يراه حاملُ الدور على الشاشة: لا محرّر، بل تحويلٌ أو رسالةُ عدم إتاحة عربية (كما في اختبار CSV) */
    const shown = await p.evaluate(() => ({ hash: location.hash, text: (document.querySelector('main') || document.body).innerText }));
    assert.ok(!/^#\/admin\/perm/.test(shown.hash) || isArabicRefusal(shown.text) || /غير متاحة لك/.test(shown.text), 'the page shows no editor (redirect or Arabic message): ' + shown.hash + ' · ' + shown.text.slice(0, 200));
    assert.equal(JSON.stringify(kv(lab, KR)), before, 'roles record unchanged');
    assert.equal(JSON.stringify(kv(lab, KG)), gBefore, 'grants unchanged');
    assert.deepEqual(e.errs, [], 'no page errors');
    await e.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
