/* V7 · د6 (م5 «الأنظمة») — في المتصفح الحقيقي فوق المختبر المعزول (TEST_ONLY، بلا شبكة). كلُّ حالةٍ تُبنى بحفظٍ حقيقي عبر الخادم ثم إعادة تحميل.
   ج4 · ب5 — المقفلُ من فوق «مطفأ من: <المصدر>» ومفتاحُه معطّل · «افتح مصدره» يصل الوحدةَ المصدر على «الأنظمة» · «تشغيل الكل»/«إطفاء الكل» لا يمسّان المقفل ·
        عدّادُ «المفعّل من الكل» = عمودُ الشجرة = خانةُ الملخّص · «أثر الحفظ» بالأسماء.
   ب2 — التحديدُ المتعدد: النافذة ← «مراجعة قبل الحفظ» (يتغيّر · تُخطّي بسببه) ← حفظٌ واحد؛ رفضُ الخادم لجزء وحدةٍ واحدة ⇒ لا وحدةَ تغيّرت بعد إعادة التحميل.
   ج7 · ب11 — السؤالُ عند وحدةٍ أخرى · تبويبٍ آخر · مغادرة الصفحة («البقاء» · «تجاهل وانتقال» · «حفظ ثم انتقال» يفتح المراجعة ويبقى إن رُفض) · وتحذيرُ المتصفح الأصلي.
   ب13 — «مراجعة وحفظ» ثابتٌ أسفل الشاشة بعرض 390 (أهدافُه 44px) ولاصقٌ في مكانه بعرض المكتب. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const KP = 'bassam_perms_v1';
const G = 'TEST_ONLY_G', A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1';
const GN = 'TEST_ONLY إدارة عامة', AN = 'TEST_ONLY إدارة أ';
const norm = (s) => String(s).replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g, ' ').trim();
const readKV = (lab, k) => { const v = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join(''); return v ? JSON.parse(v) : null; };

async function page(b, lab, view) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw, Object.assign({ viewport: { width: 1366, height: 900 } }, view || {})); s.page.setDefaultTimeout(15000);
  const p = s.page, T = 'main [data-org-tab="systems"]';
  const H = () => p.evaluate(() => location.hash);
  const row = (k) => p.locator(T + ' .p44-row[data-sys="' + k + '"]');
  const sw = (k) => row(k).locator('button.p44-sw');
  const rows = () => p.locator(T + ' .p44-row').evaluateAll((L) => L.map((e) => ({ k: e.dataset.sys, on: e.dataset.on === 'true', locked: !!(e.querySelector('button.p44-sw') || {}).disabled, lock: (e.querySelector('[data-og="lock"]') || {}).textContent || '', src: !!e.querySelector('[data-og-act="src"]') })));
  const reload = async (hash) => { await s.go(hash, 1500); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('main .og-tab', { timeout: 30000 }); await p.waitForTimeout(2200); };
  /* حفظُ مسودة «الأنظمة» بالواجهة: «مراجعة وحفظ» ← النافذة ← «حفظ» */
  const saveSys = async () => { await p.locator('main .p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.locator('[role=dialog].p44-rev').waitFor(); await p.locator('.p44-rev button', { hasText: 'حفظ' }).click(); await p.waitForTimeout(1500); await lab.idle(); };
  /* نظامٌ واحد في وحدة إلى حالٍ بعينها، بحفظٍ حقيقي */
  const setSys = async (u, k, on) => { await reload('#/sysadmin/org/' + u + '/systems'); if ((await row(k).getAttribute('data-on')) !== String(on)) { await sw(k).click(); await p.waitForTimeout(250); await saveSys(); } };
  return { s, p, H, row, sw, rows, reload, saveSys, setSys };
}
/* نظامٌ مفعّلٌ الآن في الوحدة وما فوقها، بلا حاويةٍ تسكنه وبلا ما يسكنه — لاختبارٍ لا يمسّ غيرَه */
const plainOn = (p, u) => p.evaluate((u) => { const S = KIVO.Perm44.sysList().filter((x) => x.toggle !== false && x.key !== 'admin'), U = {}; S.forEach((x) => x.under && (U[x.under] = 1));
  return S.filter((x) => !x.under && !U[x.key] && x.leaves[0].indexOf('/') === -1 && KIVO.BassamPerm.on(x.leaves[0], u)).map((x) => x.key); }, u);

test('V7 · د6 ج4 · ب5 — locked from above is not enableable («مطفأ من: <source>», switch disabled); «افتح مصدره» reaches the right unit; «تشغيل الكل»/«إطفاء الكل» do not touch it; the counter = the tree column = the summary; «أثر الحفظ» names the change', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const { s, p, H, row, sw, rows, reload, setSys } = await page(b, lab);
    await reload('#/sysadmin/org/' + A + '/systems');
    const X = (await plainOn(p, A))[0]; assert.ok(X, 'a plain system ON in A');
    /* the source: switched OFF in the general department above A (a real save) */
    await setSys(G, X, false);
    assert.equal((readKV(lab, KP).caps[G] || []).includes(X), false, 'server: OFF in ' + G);
    await reload('#/sysadmin/org/' + A + '/systems');
    assert.equal(norm(await row(X).locator('[data-og="lock"]').innerText()), 'مطفأ من: ' + GN, 'the locked row names its source');
    assert.equal(await sw(X).isDisabled(), true, 'its switch is disabled'); assert.equal(await row(X).getAttribute('data-on'), 'false');
    await sw(X).click({ force: true }); await p.waitForTimeout(300);
    assert.equal(await row(X).getAttribute('data-on'), 'false', 'clicking it anyway changes nothing'); assert.equal(await p.locator('main .p44-bar').count(), 0, 'no draft');
    /* «تشغيل الكل»: every free switch ON, the locked one untouched; the counter follows */
    const total = (await rows()).length;
    await p.locator('main [data-og-act="all-on"]').click(); await p.waitForTimeout(400);
    let R = await rows();
    assert.ok(R.filter((r) => !r.locked).every((r) => r.on), '«تشغيل الكل»: every free row ON');
    assert.deepEqual(R.filter((r) => r.locked).map((r) => [r.k, r.on]).find((x) => x[0] === X), [X, false], 'the locked row is untouched');
    assert.equal(norm(await p.locator('main [data-og="sys-count"]').innerText()), 'المفعّل من الكل: ' + R.filter((r) => r.on).length + ' من ' + total);
    await p.locator('main [data-og-act="all-off"]').click(); await p.waitForTimeout(400);
    R = await rows(); assert.ok(R.every((r) => !r.on), '«إطفاء الكل»: nothing ON'); assert.equal((await rows()).find((r) => r.k === X).locked, true, 'still locked');
    assert.equal(norm(await p.locator('main [data-og="sys-count"]').innerText()), 'المفعّل من الكل: 0 من ' + total);
    assert.match(norm(await p.locator('main [data-og="sys-effect"]').innerText()), /^سيُطفأ: /, '«أثر الحفظ» names what goes OFF');
    await p.locator('main .p44-bar button', { hasText: 'تراجع' }).click(); await p.waitForTimeout(400);
    assert.equal(norm(await p.locator('main [data-og="sys-effect"]').innerText()), 'لا تغيير غير محفوظ.');
    /* the counter = the tree «الأنظمة» column = the overview summary (one function) */
    const onN = (await rows()).filter((r) => r.on).length;
    assert.equal(norm(await p.locator('main .og-rw[data-og-id="' + A + '"] [data-og-col="systems"]').innerText()), onN + '/' + total, 'tree column');
    assert.equal(norm(await p.locator('main [data-og="sys-count"]').innerText()), 'المفعّل من الكل: ' + onN + ' من ' + total);
    /* «افتح مصدره» */
    await row(X).locator('[data-og-act="src"]').click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/' + G + '/systems', '«افتح مصدره» opens the source unit on «الأنظمة»');
    assert.equal(await sw(X).isDisabled(), false, 'at the source it is switchable'); assert.equal(await row(X).getAttribute('data-on'), 'false');
    await s.go('#/sysadmin/org/' + A + '/overview', 2000);
    assert.match(norm(await p.locator('main .og-sum').innerText()), new RegExp('الأنظمة المفعّلة ' + onN + ' من ' + total), 'overview summary = the tab');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 ب2 — bulk apply: dialog → «مراجعة قبل الحفظ» per unit (changes · skipped with «مطفأ من: …») → ONE save; the server refusing one unit\'s part ⇒ no unit changed after reload', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const { s, p, reload, setSys } = await page(b, lab);
    await reload('#/sysadmin/org/' + A + '/systems');
    const X = (await plainOn(p, A))[0]; assert.ok(X);
    await setSys(A, X, false); await setSys(B, X, false);
    const P0 = readKV(lab, KP); assert.ok(!(P0.caps[A] || []).includes(X) && !(P0.caps[B] || []).includes(X), 'both OFF on the server');
    const pick = async (ids, mode) => {
      await reload('#/sysadmin/org/platform/overview');
      for (const id of ids) { await p.locator('main .og-rw[data-og-id="' + id + '"] .og-ck').click(); await p.waitForTimeout(150); }
      await p.locator('main [data-og-bulk="' + mode + '"]').click(); await p.locator('[data-og-dlg="bulk"]').waitFor();
      await p.locator('[data-og-dlg="bulk"] [data-og-sys="' + X + '"]').click();
      await p.locator('[data-og-dlg="bulk"] [data-og-ok="bulk-next"]').click(); await p.waitForTimeout(300);
    };
    /* (1) the server refuses B's part (the posted registry carries an invalid ceiling mode for B) ⇒ the whole write is refused */
    let posts = 0;
    await p.route('**/api/save', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.set && body.set[KP]) { posts++; const v = JSON.parse(body.set[KP]); v.capOwn = Object.assign({}, v.capOwn || {}, { [B]: 'TEST_ONLY_bad' }); body.set[KP] = JSON.stringify(v); return route.continue({ postData: JSON.stringify(body) }); }
      return route.continue();
    });
    await pick([A, B], 'on');
    const unit = (id) => p.locator('[data-og-dlg="bulk"] [data-og-unit="' + id + '"]');
    assert.match(norm(await unit(A).innerText()), /يُفعَّل/); assert.match(norm(await unit(B).innerText()), /يُفعَّل/);
    await p.locator('[data-og-dlg="bulk"] [data-og-ok="bulk-save"]').click(); await p.waitForTimeout(2500);
    assert.equal(posts, 1, 'one write for both units');
    assert.match(norm(await p.locator('[data-og="bulk-err"]').innerText()), /لم يتغيّر شيء في أي وحدة/, 'refused: said in the review');
    await p.unroute('**/api/save'); await lab.idle();
    assert.deepEqual(readKV(lab, KP).caps, P0.caps, 'server: no unit changed');
    await reload('#/sysadmin/org/' + A + '/systems');
    assert.equal(await p.locator('main [data-org-tab="systems"] .p44-row[data-sys="' + X + '"]').getAttribute('data-on'), 'false', 'after reload: A unchanged');
    await s.go('#/sysadmin/org/' + B + '/systems', 2000);
    assert.equal(await p.locator('main [data-org-tab="systems"] .p44-row[data-sys="' + X + '"]').getAttribute('data-on'), 'false', 'after reload: B unchanged');
    /* (2) A and its section: the section is locked by A — skipped with its reason, never enabled; A changes; one save */
    await pick([A, S1], 'on');
    assert.match(norm(await unit(S1).locator('[data-og-b="skip"]').innerText()), new RegExp('مطفأ من: ' + AN));
    assert.match(norm(await unit(A).locator('[data-og-b="ch"]').innerText()), /يُفعَّل/);
    await p.locator('[data-og-dlg="bulk"] [data-og-ok="bulk-save"]').click(); await p.waitForTimeout(2500); await lab.idle();
    assert.equal(await p.locator('[data-og-dlg="bulk"]').count(), 0, 'saved: the dialog closes');
    const P1 = readKV(lab, KP);
    assert.ok((P1.caps[A] || []).includes(X), 'server: A ON'); assert.deepEqual(P1.caps[S1], P0.caps[S1], 'server: the section\'s own record untouched (skipped)'); assert.deepEqual(P1.caps[B], P0.caps[B]);
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 ج7 · ب11 — unsaved changes: another unit · another tab · leaving the page; «حفظ ثم انتقال» stays when refused; the browser\'s native warning on close · ب13 the fixed save bar at 390', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const { s, p, H, row, sw, reload } = await page(b, lab);
    await reload('#/sysadmin/org/' + A + '/systems');
    const X = (await plainOn(p, A))[0];
    const dirty = async () => { await sw(X).click(); await p.waitForTimeout(300); assert.equal(await p.locator('main .p44-bar').count(), 1); };
    const ask = () => p.locator('[data-og-dlg="unsaved"]');
    /* (1) another unit: «البقاء» */
    await dirty();
    await p.locator('main .og-rw[data-og-id="' + B + '"] .og-nm').click(); await ask().waitFor();
    assert.deepEqual((await ask().locator('button').allInnerTexts()).map(norm), ['حفظ ثم انتقال', 'تجاهل وانتقال', 'البقاء']);
    await ask().locator('[data-og-ask="stay"]').click(); await p.waitForTimeout(600);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/systems', 'stayed'); assert.equal(await p.locator('main .p44-bar').count(), 1, 'the draft is kept');
    /* (2) another tab: «تجاهل وانتقال» */
    await p.locator('main .og-tab', { hasText: 'الأدوار' }).click(); await ask().waitFor();
    await ask().locator('[data-og-ask="drop"]').click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/roles', 'moved'); await s.go('#/sysadmin/org/' + A + '/systems', 1500);
    assert.equal(await p.locator('main .p44-bar').count(), 0, 'the draft was dropped');
    /* (3) leaving the page: «حفظ ثم انتقال» refused by the server ⇒ stays with the reason */
    const was = await row(X).getAttribute('data-on');
    await dirty();
    await p.route('**/api/save', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.set && body.set[KP]) { const v = JSON.parse(body.set[KP]); v.capOwn = { [A]: 'TEST_ONLY_bad' }; body.set[KP] = JSON.stringify(v); return route.continue({ postData: JSON.stringify(body) }); }
      return route.continue();
    });
    const leave = p.locator('aside.bsb a.s-ci').filter({ hasNotText: 'الإدارات والصلاحيات' }).first();
    await leave.click(); await ask().waitFor();
    await ask().locator('[data-og-ask="save"]').click(); await p.locator('[role=dialog].p44-rev').waitFor();
    assert.match(await H(), /^#\/sysadmin\/org\//, 'not left before the save');
    await p.locator('.p44-rev button', { hasText: 'حفظ' }).click(); await p.waitForTimeout(3000);
    assert.match(norm(await p.locator('.p44-rev [role=alert]').innerText()), /رفض الخادم الحفظ/, 'refused: the review shows why');
    assert.equal(await H(), '#/sysadmin/org/' + A + '/systems', 'and the page stays');
    await p.locator('.p44-rev button', { hasText: 'رجوع' }).click(); await p.waitForTimeout(800);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/systems', '«رجوع» = stay'); assert.equal(await p.locator('main .p44-bar').count(), 1, 'the draft is still there');
    await p.unroute('**/api/save');
    /* (4) leaving the page: «حفظ ثم انتقال» accepted ⇒ saved, then left */
    await leave.click(); await ask().waitFor(); await ask().locator('[data-og-ask="save"]').click(); await p.locator('[role=dialog].p44-rev').waitFor();
    await p.locator('.p44-rev button', { hasText: 'حفظ' }).click(); await p.waitForTimeout(3000); await lab.idle();
    assert.doesNotMatch(await H(), /^#\/sysadmin\/org\//, 'left after the save');
    await reload('#/sysadmin/org/' + A + '/systems');
    assert.notEqual(await row(X).getAttribute('data-on'), was, 'the change was really saved');
    /* (5) the browser's native warning on close/refresh */
    await dirty();
    const kinds = []; p.on('dialog', (d) => { kinds.push(d.type()); d.dismiss().catch(() => {}); });
    await p.close({ runBeforeUnload: true }); await new Promise((r) => setTimeout(r, 1500));
    assert.deepEqual(kinds, ['beforeunload'], 'the native warning');
    assert.deepEqual(s.errs, [], 'no page errors');
    /* ب13 · 390: «مراجعة وحفظ» fixed at the bottom, 44px targets; at 1366 it stays in place (sticky) */
    const n = await page(b, lab, { viewport: { width: 390, height: 844 }, context: { hasTouch: true, isMobile: true } });
    await n.reload('#/sysadmin/org/' + A + '/systems');
    await n.sw(X).click(); await n.p.waitForTimeout(400);
    const bar = await n.p.evaluate(() => { const e = document.querySelector('main .p44-bar'), c = getComputedStyle(e), r = e.getBoundingClientRect();
      return { pos: c.position, bottom: Math.round(innerHeight - r.bottom), w: Math.round(r.width), btn: [...e.querySelectorAll('button')].map((x) => Math.round(x.getBoundingClientRect().height)), side: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    assert.equal(bar.pos, 'fixed'); assert.ok(bar.bottom <= 1, 'at the bottom: ' + JSON.stringify(bar)); assert.ok(bar.w >= 380, 'full width');
    assert.ok(bar.btn.length === 2 && bar.btn.every((h) => h >= 44), '44px targets: ' + bar.btn); assert.equal(bar.side, 0, 'no sideways scroll');
    const wide = await page(b, lab);
    await wide.reload('#/sysadmin/org/' + A + '/systems'); await wide.sw(X).click(); await wide.p.waitForTimeout(400);
    assert.equal(await wide.p.evaluate(() => getComputedStyle(document.querySelector('main .p44-bar')).position), 'sticky', 'desktop: in place');
  } finally { await b.close(); await lab.close(); }
});
