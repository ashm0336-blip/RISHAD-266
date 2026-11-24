/* V7 · د5-هـ (44 · التوحيد) — «الصلاحيات» على المحرّك الحقيقي والخادم الحقيقي في المختبر المعزول (TEST_ONLY، بلا بديل ولا page.route):
   (أ) مديرُ المنصة يفتح #/sysadmin/org/<إدارة>/roles (V7 · د6 — كان …/perm/roles)، ينشئ دوراً بنظامٍ واحد على «تعديل»، يراجع ويحفظ — وبعد إعادة التحميل الدورُ قائم؛
   (ب) يُسنده في «الأشخاص» لموظفٍ TEST_ONLY — فيجيب الخادم /api/perm44/check بالسماح لمفتاح تعديلٍ في ذلك النظام وبالمنع لمفتاح حذف،
       ويظهر اسمُ الدور في بطاقة الموظف الجانبية وسطرِ «صفحتي»؛
   (ج) يطفئ نظاماً للإدارة في «الأنظمة» — فلا يراه مديرُ الإدارة في قائمته ولا في سقفه (المحرّك) ولا في محرّر الأدوار («شاهد الصفحة كـ مدير الإدارة»)
       ويقول الخادم «ceiling»، وصفحاتُ المنصة تفتح بلا أخطاء — ثم يعيده؛
   (د) يكرّر (ج) لكل نظامٍ قابلٍ للتشغيل مرةً (الخادم + القائمة، خفيفاً) — الخطوةُ الأولى في تجربة المالك؛ ويُطبع جدولُ النتائج؛
   (هـ) «تعديل الصلاحيات» في قائمة الحساب يصل إلى …/people.
   KIVO_P44_TABLE=<ملف> يحفظ جدولَ (د). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', ROLE = 'TEST_ONLY منسّق المهام', EMP = 'TEST_ONLY_eA1';
const quiet = (errs) => errs.filter((e) => !/ResizeObserver/.test(e));

/* ── أدواتُ الصفحة ── */
const P = (p, sel, o) => p.locator('main .p44 ' + sel, o);
async function settle(lab, p, ms = 900) { await p.waitForTimeout(ms); await lab.idle(); }
async function reloadAs(s) {
  await s.page.reload({ waitUntil: 'domcontentloaded' });
  await s.page.waitForSelector('aside.bsb nav.s-nav', { timeout: 30000 });
  await s.page.waitForTimeout(2500);
}
/* ما تراه القائمةُ لهذا النظام في جلسةٍ ما: الشريطُ الجانبي (للأنظمة العليا) · مصدرُ القائمة (visiblePages · subOn) · سقفُ المحرّك */
const menuOf = (s, sys) => s.page.evaluate(([sys, d]) => {
  const S = KIVO.Perm44.sysList().find((x) => x.key === sys), leaf = S.leaves[0], Pm = KIVO.BassamPerm, top = leaf.indexOf('/') === -1 && !(KIVO.KIVO_MANIFEST.clone('pages').find((x) => x.key === leaf) || {}).under;
  const a = [...document.querySelectorAll('aside.bsb nav.s-nav a.n')].find((x) => x.dataset.key === leaf || x.title === S.name);
  const dom = !!a && !a.classList.contains('gone') && a.offsetParent !== null;
  const vis = leaf.indexOf('/') === -1 ? Pm.visiblePages().indexOf(leaf) !== -1 : !!(Pm.subOn && Pm.subOn(leaf.split('/')[0], leaf.split('/')[1]));
  return { top, dom, vis, ceil: KIVO.Perm44.ceiling(d).on.indexOf(sys) !== -1 };
}, [sys, A]);
async function sysRows(p) { return P(p, '.p44-row').evaluateAll((L) => L.map((x) => ({ n: x.querySelector('b').innerText.trim(), on: x.dataset.on === 'true', locked: !!x.querySelector('button.p44-sw').disabled }))); }
/* V7 · د6: الوحدةُ تُختار من العنوان (الشجرةُ بجانب التبويب) — كان عمودَ الوحدات داخل «الأنظمة» */
const UA = A, UG = 'TEST_ONLY_G';
async function pickUnit(s, unit) {
  const p = s.page, h = '#/sysadmin/org/' + unit + '/systems';
  if ((await p.evaluate(() => location.hash)) !== h) { await s.go(h, 2500); }
}
/* يجعل صفوفَ «الأنظمة» لوحدةٍ (الإدارة أو أصلها) كما في want ({اسم: مفعّل}) ثم «مراجعة وحفظ» ← «حفظ» — بالواجهة وحدها؛ المقفلُ من أصلٍ يُترك لأصله */
async function setSystems(lab, s, want, unit = UA) {
  const p = s.page;
  await pickUnit(s, unit);
  let flipped = 0;
  for (const [n, on] of Object.entries(want)) {
    const r = (await sysRows(p)).find((x) => x.n === n);
    assert.ok(r, 'a row for «' + n + '»');
    if (r.on !== on && !r.locked) { await P(p, 'button.p44-sw[aria-label="' + n + '"]').click(); await p.waitForTimeout(150); flipped++; }
  }
  if (!flipped) return 0;
  /* V7 · د5-ح: المراجعةُ نافذةٌ — «مراجعة وحفظ» ثم «حفظ» فيها */
  await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await P(p, '[role=dialog].p44-rev').waitFor();
  await P(p, '[role=dialog].p44-rev button', { hasText: 'حفظ' }).click();
  await settle(lab, p, 1200);
  return flipped;
}
const check = (s, key) => s.api('/api/perm44/check?d=' + A + '&ekey=' + EMP + '&key=' + encodeURIComponent(key)).then((r) => r.j || {});

test('V7 · د5-هـ (44) · real engine + real server: build a role, save, reload; assign it; the server allows its edit key and denies delete; the role name is the permission name; the account menu lands on «الأشخاص»', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; p.setDefaultTimeout(15000);
    const saves = []; p.on('request', (r) => { if (r.method() === 'POST' && /\/api\/save$/.test(new URL(r.url()).pathname)) saves.push(JSON.parse(r.postData() || '{}')); });
    /* (أ) a role with one system at «تعديل» */
    await s.go('#/sysadmin/org/' + A + '/roles', 3000);
    assert.equal(await p.evaluate(() => location.hash), '#/sysadmin/org/' + A + '/roles');
    await P(p, 'button', { hasText: '+ دور جديد' }).click(); await p.waitForTimeout(400);
    await P(p, 'input[maxlength="60"]').fill(ROLE); await P(p, 'input[maxlength="60"]').dispatchEvent('change'); await p.waitForTimeout(300);
    await P(p, 'button[aria-label="تفعيل المهام لهذا الدور"]').click(); await p.waitForTimeout(300);
    await P(p, 'select[aria-label="مستوى المهام"]').selectOption('edit'); await p.waitForTimeout(300);
    assert.match(await P(p, 'aside[aria-label="المعاينة"] .p44-menu').first().innerText(), /المهام\s*تعديل/, 'what the holder sees, live');
    /* V7 · د5-ح ⑤: دورٌ لا يحمله أحد ⇒ «لا يتأثر أحد الآن» (لا «يتأثر · شخص» بلا رقم) */
    assert.match(await P(p, '.p44-bar').innerText(), /لا يتأثر أحد الآن/);
    await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(400);
    /* V7 · د5-ح ④: المراجعةُ نافذةٌ منبثقة في وسط الشاشة — التركيزُ داخلها، وEscape = «رجوع» (المسودةُ باقية) */
    const dlg = P(p, '[role=dialog][aria-modal="true"].p44-rev');
    assert.equal(await dlg.count(), 1, 'a modal dialog');
    await p.waitForFunction(() => !!(document.activeElement && document.activeElement.closest('[role=dialog].p44-rev')), null, { timeout: 3000 }).catch(() => {});
    assert.ok(await p.evaluate(() => !!(document.activeElement && document.activeElement.closest('[role=dialog].p44-rev'))), 'focus is inside the dialog');
    const ctr = await dlg.evaluate((el) => { const r = el.getBoundingClientRect(); return [Math.abs(r.left + r.width / 2 - innerWidth / 2), Math.abs(r.top + r.height / 2 - innerHeight / 2)]; });
    assert.ok(ctr[0] < 4 && ctr[1] < 4, 'centered on the screen: ' + JSON.stringify(ctr));
    for (let i = 0; i < 6; i++) await p.keyboard.press('Tab');
    assert.ok(await p.evaluate(() => !!(document.activeElement && document.activeElement.closest('[role=dialog].p44-rev'))), 'Tab stays inside');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    assert.equal(await P(p, '.p44-rev').count(), 0, 'Escape = «رجوع»'); assert.equal(await P(p, '.p44-bar').count(), 1, 'the draft stays');
    await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(400);
    const revTxt = await P(p, '.p44-rev').innerText();
    assert.match(revTxt, new RegExp('دور جديد [·-] ' + ROLE));
    assert.match(revTxt, new RegExp(ROLE + ' [·-] المهام[\\s\\S]*تعديل'), 'V7 · د5-ح ⑥: the new role\'s systems and levels');
    saves.length = 0;
    await P(p, '.p44-rev button', { hasText: 'حفظ' }).last().click(); await settle(lab, p, 2500);
    assert.equal(saves.length, 1, 'one save request');
    assert.deepEqual(Object.keys(saves[0].set || {}).sort(), ['bsdept:' + A + ':bassam_grants_v1', 'bsdept:' + A + ':bassam_roles_v1'], 'roles + compiled grants in the same request');
    const stored = JSON.parse(lab.env.DB.q("SELECT v FROM kv WHERE k=?1 ORDER BY seq", 'bsdept:' + A + ':bassam_roles_v1').map((r) => r.v).join(''));
    const role = stored.roles.find((r) => r.name === ROLE);
    assert.ok(role, 'the server holds the role'); assert.deepEqual(role.sys, { tasks: { lvl: 'edit' } });
    await reloadAs(s); await s.go('#/sysadmin/org/' + A + '/roles', 3000);
    assert.equal(await P(p, '.p44-role', { hasText: ROLE }).count(), 1, 'after a reload the role is there');
    /* (ب) assign it in «الأشخاص» */
    await s.go('#/sysadmin/org/' + A + '/people', 2500);
    await P(p, 'table.p44-people button', { hasText: 'TEST_ONLY موظف أ' }).first().click(); await p.waitForTimeout(400);
    await P(p, 'aside[aria-label="تفاصيل الشخص"] [role=radio]', { hasText: ROLE }).click(); await p.waitForTimeout(300);
    await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(300);
    saves.length = 0;
    await P(p, '.p44-rev button', { hasText: 'حفظ' }).last().click(); await settle(lab, p, 2500);
    assert.equal(saves.length, 1, 'one save request for the assignment');
    const G = JSON.parse(lab.env.DB.q("SELECT v FROM kv WHERE k=?1 ORDER BY seq", 'bsdept:' + A + ':bassam_grants_v1').map((r) => r.v).join(''));
    assert.equal(G.emp[EMP].src, 'role:' + role.id, 'the compiled grant names its role');
    const K = await p.evaluate(() => { const E = KIVO.Perm44, ed = E.keysFor('tasks', 'edit'), R = KIVO.KIVO_REGISTRY.byKey; return { edit: ed.filter((k) => R[k].type === 'edit'), del: E.keysFor('tasks', 'sensitive').filter((k) => R[k].type === 'delete') }; });
    assert.ok(K.edit.length && K.del.length, 'tasks has an edit key and a delete key: ' + JSON.stringify(K));
    assert.deepEqual(J(G.emp[EMP].plus).sort(), (await p.evaluate(() => KIVO.Perm44.keysFor('tasks', 'edit'))).sort(), 'grant = tasks·edit');
    const allow = await check(s, K.edit[0]), deny = await check(s, K.del[0]);
    assert.equal(allow.allow, true, 'the server allows the edit key: ' + JSON.stringify(allow)); assert.equal(allow.why, 'role');
    assert.equal(deny.allow, false, 'the server denies the delete key: ' + JSON.stringify(deny)); assert.equal(deny.why, 'level');
    assert.equal(await p.evaluate(([e, d]) => KIVO.BassamAuth.permLabel(e, d), [EMP, A]), ROLE, 'permLabel = the role name');
    /* ④ the log: both saves are audit events the server wrote (etype perm44), read back by /api/perm44/log into «السجل» */
    const ev = lab.env.DB.q("SELECT k, aft FROM aud WHERE etype='perm44' AND dept=?1 ORDER BY ts", A);
    assert.ok(ev.length >= 2, 'the server wrote an audit event per save: ' + ev.length);
    assert.ok(ev.some((r) => JSON.parse(r.aft).changes.some((c) => c.what === 'person' && c.person === EMP && c.to === role.id)), 'the assignment, as the engine\'s diff');
    await s.go('#/sysadmin/org/' + A + '/log', 3000);
    const items = P(p, '.p44-log > li');
    assert.ok((await items.count()) >= 2, 'the log lists the changes');
    assert.match(await items.first().innerText(), new RegExp('TEST_ONLY موظف أ[\\s\\S]*' + ROLE), 'the latest: the assignment, by name');
    /* V7 · د5-ح ⑥: سجلُّ إنشاء الدور يذكر أنظمته ومستوياتها (لا «دور جديد» وحده) */
    const made = await items.nth(1).innerText();
    assert.match(made, new RegExp('دور جديد [·-] ' + ROLE), 'the creation entry'); assert.match(made, new RegExp(ROLE + ' [·-] المهام[\\s\\S]*تعديل'), 'names its system and level: ' + made);
    await items.first().locator('button', { hasText: 'تراجع عن هذا التغيير' }).click(); await p.waitForTimeout(600);
    assert.match(await P(p, '.p44-rev').innerText(), new RegExp(ROLE + '[\\s\\S]*←[\\s\\S]*—'), 'undo opens the review with the inverse (role → none), unsaved');
    await P(p, '.p44-rev button', { hasText: 'رجوع' }).click(); await P(p, '.p44-bar button', { hasText: 'تراجع' }).click(); await p.waitForTimeout(300);
    assert.equal(await P(p, '.p44-rev').count(), 0, 'رجوع closes the dialog');
    /* the employee: the side user card and «صفحتي» say the role */
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    assert.match(await e.page.locator('aside.bsb').innerText(), new RegExp(ROLE), 'the side user card');
    await e.go('#/profile', 3000);
    assert.match(await e.page.locator('main').innerText(), new RegExp('TEST_ONLY إدارة أ [·-] ' + ROLE), '«صفحتي» role line');
    assert.equal(await e.page.evaluate(() => KIVO.BassamPerm.can('tasks', 'edit')), true, 'he can edit tasks');
    assert.deepEqual(quiet(e.errs), []);
    /* (هـ) the account menu entry «تعديل الصلاحيات» lands on …/people */
    await s.go('#/sysadmin/users', 4000);
    const row = p.locator('main .adm-tr.g-us', { hasText: 'TEST_ONLY موظف أ' }).filter({ has: p.locator('.adm-rmb') }).last();
    await row.locator('.adm-rmb').first().click(); await p.waitForTimeout(600);
    await row.locator('[data-bs-dd]').getByText('تعديل الصلاحيات', { exact: true }).click(); await p.waitForTimeout(3000);
    assert.equal(await p.evaluate(() => location.hash), '#/sysadmin/org/' + A + '/people');
    assert.deepEqual((await p.locator('main .og-tabs .og-tab[aria-selected="true"]').allInnerTexts()).map((x) => x.trim()), ['الأشخاص'], 'the «الأشخاص» tab is open (V7 · د6)');
    assert.match(await P(p, 'table.p44-people').innerText(), new RegExp('TEST_ONLY موظف أ[\\s\\S]*' + ROLE), 'and the person carries the role');
    assert.deepEqual(quiet(s.errs), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

const J = (x) => JSON.parse(JSON.stringify(x));

test('V7 · د5-هـ (44) · every system OFF then ON for a department: absent from the manager\'s menu, ceiling and role editor; the server says «ceiling»; the platform keeps working', { timeout: 1500000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  /* a TEST_ONLY role holding every system at «كامل» — the role editor shows what the ceiling lets through */
  {
    const k = 'bsdept:' + A + ':bassam_roles_v1', v = JSON.stringify({ v: 1, roles: [{ id: 'TEST_ONLY_rall', name: 'TEST_ONLY كل الأنظمة', sys: {} }], people: {} });
    await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, v), lab.env.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
  }
  const table = [['النظام', 'قبلُ', 'مطفأ: القائمة', 'مطفأ: السقف', 'مطفأ: المحرّر', 'مطفأ: الخادم', 'مُعاد: القائمة', 'مُعاد: الخادم', 'أخطاء']];
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; p.setDefaultTimeout(15000);
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000);
    await s.go('#/sysadmin/org/' + A + '/systems', 3000);
    await pickUnit(s, UG); const origG = Object.fromEntries((await sysRows(p)).map((r) => [r.n, r.on]));
    await pickUnit(s, UA); const orig = Object.fromEntries((await sysRows(p)).map((r) => [r.n, r.on]));
    const SYS = await p.evaluate(() => KIVO.Perm44.sysList().filter((x) => x.toggle !== false).map((x) => ({ k: x.key, n: x.name, key: KIVO.Perm44.sysKeys(x.key)[0] || '' })));
    assert.deepEqual(SYS.map((x) => x.n).sort(), Object.keys(orig).sort(), 'a switch for every toggleable system');
    /* the role editor as the department manager sees it (super · «شاهد الصفحة كـ مدير الإدارة») */
    const editorNames = async () => {
      await s.go('#/sysadmin/org/' + A + '/roles', 2000);
      await P(p, '[aria-label="شاهد الصفحة كـ"] button', { hasText: 'مدير الإدارة' }).click(); await p.waitForTimeout(400);
      await P(p, '.p44-role', { hasText: 'TEST_ONLY كل الأنظمة' }).click(); await p.waitForTimeout(400);
      const names = await P(p, '.p44-rows .p44-row b').allInnerTexts();
      await P(p, '[aria-label="شاهد الصفحة كـ"] button', { hasText: 'مدير المنصة' }).click(); await p.waitForTimeout(200);
      return names.map((x) => x.trim());
    };
    const ok = (x) => (x ? '✔' : '✘');
    let deep = false;
    for (const S of SYS) {
      const e0 = m.errs.length, before = orig[S.n], snap = await p.evaluate(() => localStorage.getItem('bassam_perms_v1'));
      const pre = await menuOf(m, S.k), preSrv = await check(m, S.key || 'task.view');   /* what the manager has before the step */
      /* a system OFF here is turned ON first (in the general department above too when it is off there), so that turning it OFF is a real change */
      if (!before) { await setSystems(lab, s, { [S.n]: true }, UG); await setSystems(lab, s, { [S.n]: true }); await reloadAs(m); }
      await setSystems(lab, s, { [S.n]: false });
      await reloadAs(m);
      const off = await menuOf(m, S.k), srvOff = S.key ? await check(m, S.key) : (await check(m, 'task.view'));
      const ed = await editorNames();
      const menuGone = !off.vis && !off.dom, ceilGone = !off.ceil, edGone = ed.indexOf(S.n) === -1;
      const srvGone = Array.isArray(srvOff.on) && srvOff.on.indexOf(S.k) === -1 && (!S.key || (srvOff.allow === false && srvOff.why === 'ceiling'));
      /* (ج) once, in depth: with «المهام» off the manager walks every page of his menu without an error */
      if (S.k === 'tasks' && !deep) {
        deep = true;
        const items = await m.page.locator('aside.bsb nav.s-nav a.n:not(.gone)').count();
        for (let i = 0; i < items; i++) { await m.page.locator('aside.bsb nav.s-nav a.n:not(.gone)').nth(i).click(); await m.page.waitForTimeout(1300); }
        await m.go('#/profile', 2000);
        assert.ok(items >= 3, 'the manager has pages to walk: ' + items);
      }
      /* back ON with the same switch (a system that was OFF stays OFF as it was) — then the ceiling records exactly as before the step
         (what the switches carried for the next system: the general department's switch turned on above, a container's pages) */
      if (before) await setSystems(lab, s, { [S.n]: true });
      else {
        await p.evaluate((v) => { localStorage.setItem('bassam_perms_v1', v); return KIVO.__BS_SRV.flushAsync(); }, snap); await settle(lab, p, 800);
        await s.go('#/sysadmin/org/' + A + '/systems', 1500);
      }
      await reloadAs(m);
      const on = await menuOf(m, S.k), srvOn = await check(m, S.key || 'task.view');
      if (before) {
        await p.evaluate((v) => { localStorage.setItem('bassam_perms_v1', v); return KIVO.__BS_SRV.flushAsync(); }, snap); await settle(lab, p, 800);
        await s.go('#/sysadmin/org/' + A + '/systems', 1500);
      }
      const back = on.vis === pre.vis && on.dom === pre.dom && on.ceil === pre.ceil && (!before || (on.vis && on.ceil));
      const srvBack = Array.isArray(srvOn.on) && (srvOn.on.indexOf(S.k) !== -1) === (preSrv.on || []).includes(S.k) && srvOn.why === preSrv.why;
      const errs = quiet(m.errs.slice(e0)).concat(quiet(s.errs));
      table.push([S.n + ' (' + S.k + ')', before ? 'مفعّل' : 'مطفأ', ok(menuGone), ok(ceilGone), ok(edGone), ok(srvGone), ok(back), ok(srvBack), errs.length ? errs.join(' | ').slice(0, 120) : '0']);
      assert.ok(menuGone, S.n + ': OFF ⇒ absent from the manager\'s menu: ' + JSON.stringify(off));
      assert.ok(ceilGone, S.n + ': OFF ⇒ not in his ceiling (the engine)');
      assert.ok(edGone, S.n + ': OFF ⇒ not in the role editor he sees: ' + JSON.stringify(ed));
      assert.ok(srvGone, S.n + ': OFF ⇒ the server says ceiling: ' + JSON.stringify(srvOff));
      assert.ok(back, S.n + ': restored ⇒ as it was in his menu: ' + JSON.stringify({ pre, on }));
      assert.ok(srvBack, S.n + ': restored ⇒ as it was on the server: ' + JSON.stringify(srvOn));
      assert.deepEqual(errs, [], S.n + ': no page errors');
    }
    assert.ok(deep, 'the in-depth walk ran');
    await pickUnit(s, UA); assert.deepEqual(Object.fromEntries((await sysRows(p)).map((r) => [r.n, r.on])), orig, 'the department ends as it began');
    await pickUnit(s, UG); assert.deepEqual(Object.fromEntries((await sysRows(p)).map((r) => [r.n, r.on])), origG, 'and its general department');
  } finally {
    const txt = table.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
    console.log('\n' + txt + '\n');
    if (process.env.KIVO_P44_TABLE) fs.writeFileSync(process.env.KIVO_P44_TABLE, txt + '\n');
    await b.close(); await lab.close();
  }
});
