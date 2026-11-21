/* RISHAD-266 · browser acceptance — the platform administrator (super) and the selected department/section.
   Required: selecting a unit changes only the data shown; super's identity and page access do not change, while the server keeps
   every data-integrity control. V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية — كان «السقفُ يحكم الجميع» (القرار هـ)
   فكانت كتابتُه خارج السقف ممنوعة؛ الآن يكتب في كل وحدة. ما يخصّ مدير الإدارة والموظف (الاختبار الثاني) لم يتغيّر.
   Root cause fixed (client, 331 myPerms): super's page set was the selected unit's ceiling, exactly as for that unit's own account,
   so in a unit with a narrow ceiling super lost even the view of its pages (the server already reads everything for super).
   Lab: TEST_ONLY_B ceiling = ['tasks'], section TEST_ONLY_A_S1 ceiling = [] (own). TEST_ONLY data, no network.
   V7 · د5-ح (قرار المالك): النظامُ المطفأ لا يراه أحد — ولا مديرُ المنصة: في وحدةٍ سقفُها ضيّق يغيب عنه ما أُطفئ فيها (لا عرضَ باهتاً «out»)
   ويبقى ما هو دائم (موظفو الإدارة · الإعدادات …) بكتابته (د1-ج)، ومفاتيحُ الخادم له كما هي في كل وحدة. والمطفأُ على المنصة لا يظهر له كذلك. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

async function narrowWorld() {
  const lab = await startLab();
  const { env, W } = lab, DB = env.DB;
  const kv = (k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join(''));
  const pm = kv('bassam_perms_v1');
  pm.caps.TEST_ONLY_G = pm.caps.TEST_ONLY_G.concat(['award']); pm.caps.TEST_ONLY_A = pm.caps.TEST_ONLY_A.concat(['award']);   /* the effective ceiling also needs the parent group's */ pm.caps.TEST_ONLY_B = ['tasks']; pm.caps.TEST_ONLY_A_S1 = []; pm.capOwn = Object.assign({}, pm.capOwn || {}, { TEST_ONLY_A_S1: true });
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
  return { lab, kv };
}
const state = (page) => page.evaluate(() => {
  const P = KIVO.BassamPerm, u = KIVO.BassamAuth.user();
  const nav = [...document.querySelectorAll('.bsb .n')].filter((e) => e.getBoundingClientRect().height).map((e) => ({ t: e.textContent.trim().replace(/\s+/g, ' '), out: /\bout\b/.test(e.className), gone: /\bgone\b/.test(e.className) }));
  return { active: KIVO.BassamDepts.active(), role: u && u.role, uid: u && u.id, vis: P.visiblePages(), empsAdd: !!(P.can('emps', 'add') || P.can('emps/data', 'add')), nav };
});
const held = (page) => page.evaluate(async () => { const r0 = await (await fetch('/api/authz')).json(); const R = KIVO.KIVO_REGISTRY, o = {}; for (const [d, x] of Object.entries((r0.me || {}).depts || {})) { const bin = atob(x.h || ''); let n = 0; R.keys.forEach((k, i) => { if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) n++; }); o[d] = n; } return o; });
/* CORE-02 S7 (intended change): super signs in to «مركز إدارة رشاد», whose sidebar holds the console navigation only — the operational
   sidebar measured here is read on an operational page (#/profile, open to every account) */
async function switchTo(s, d) { const ok = await s.page.evaluate((d) => KIVO.BassamDepts.setActive(d), d); await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(3000);
  if (await s.page.evaluate(() => /^#\/sysadmin/.test(location.hash))) { await s.page.evaluate(() => { location.hash = '#/profile'; }); await s.page.waitForTimeout(2500); }
  return ok; }

test('super: switching unit changes the data shown, not identity; an OFF system is absent where it is OFF (V7 · د5-ح); writes are offered in every unit (D1-c)', { timeout: 300000 }, async () => {
  const { lab } = await narrowWorld();
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const who0 = (await s.api('/api/whoami')).j;
    const per = {};
    for (const d of ['TEST_ONLY_A', 'TEST_ONLY_A_S1', 'TEST_ONLY_B']) {
      assert.equal(await switchTo(s, d), true, 'super can select ' + d);
      const st = await state(s.page);
      assert.equal(st.active, d); assert.equal(st.role, 'super'); assert.equal(st.uid, who0.uid, 'identity unchanged in ' + d);
      assert.deepEqual((await s.api('/api/whoami')).j.uid, who0.uid);
      per[d] = st;
    }
    /* V7 · د5-ح: super's pages follow each unit's ceiling for the switchable systems — what is OFF there is absent, never dimmed */
    const visA = per.TEST_ONLY_A.vis.slice().sort();
    /* the switchable systems' own pages (KIVO.Perm44.sysList: toggle) — «موظفو الإدارة» is always on */
    const TG = await s.page.evaluate(() => [].concat(...KIVO.Perm44.sysList().filter((x) => x.toggle !== false).map((x) => x.leaves.filter((l) => l.indexOf('/') === -1))));
    const capOf = { TEST_ONLY_A_S1: [], TEST_ONLY_B: ['tasks'] };
    const UNDER = await s.page.evaluate(() => Object.fromEntries(KIVO.BassamPerm.PAGE_REG.filter((p) => p.under).map((p) => [p.key, p.under])));
    for (const d of ['TEST_ONLY_A_S1', 'TEST_ONLY_B']) {
      const host = (k) => capOf[d].some((c) => UNDER[c] === k);   /* a container that hosts an ON page opens for view (as for everyone) */
      for (const k of TG) if (!capOf[d].includes(k) && !host(k)) assert.ok(!per[d].vis.includes(k), 'OFF in ' + d + ' ⇒ absent for super: ' + k);
      assert.deepEqual(per[d].vis.filter((k) => !TG.includes(k)).sort(), visA.filter((k) => !TG.includes(k)), 'the always-on pages stay for super in ' + d);
      assert.equal(per[d].nav.filter((n) => n.out).length, 0, 'no dimmed «out» item in ' + d);
      assert.equal(per[d].empsAdd, true, 'employee write offered to super in ' + d + ' (D1-c)');
    }
    assert.ok(per.TEST_ONLY_B.vis.includes('tasks'), 'ON in B ⇒ present for super');
    assert.equal(per.TEST_ONLY_A.empsAdd, true, 'inside the ceiling super keeps full actions');
    assert.ok(visA.includes('emps') && visA.includes('admin'));
    /* B: the employees page opens through the nav and lists B's employee, with the add control (D1-c). The control is an icon
       whose label is its title — the probe read the text only, so the former «0» held whatever the page offered; it reads the title too */
    await switchTo(s, 'TEST_ONLY_B');
    await s.page.locator('.bsb .n', { hasText: /موظفو/ }).first().click(); await s.page.waitForTimeout(3000);
    const ev = await s.page.evaluate(() => { const m = document.querySelector('main') || document.body; return { hash: location.hash, text: m.innerText, add: [...m.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().height && /إضافة موظف/.test(x.textContent + ' ' + (x.getAttribute('title') || ''))).length }; });
    assert.match(ev.text, /TEST_ONLY موظف ب/, 'B employees visible to super');
    assert.ok(ev.add > 0, 'add-employee control offered to super outside the ceiling (D1-c)');
    /* pages that hang their content on sub-pages/tabs (award · irshad · seized · planning) open with their tabs and their writes, outside the ceiling (D1-c) */
    const gates = await s.page.evaluate(() => {
      const P = KIVO.BassamPerm, out = {};
      for (const pg of P.PAGE_REG) {
        const leaves = (pg.subs || []).concat(pg.tabs || []).map((x) => x.key);
        if (!leaves.length) continue;
        out[pg.key] = { seen: leaves.filter((k) => P.subOn(pg.key, k) || P.tabOn(pg.key, k)).length, n: leaves.length, edit: leaves.filter((k) => P.canSub(pg.key, k, 'edit')).length, inCap: P.deptCap().indexOf(pg.key) !== -1 };
      }
      return out;
    });
    for (const [pk, g] of Object.entries(gates)) {
      if (g.inCap || !TG.includes(pk)) continue;
      assert.equal(g.seen, 0, pk + ': OFF in B ⇒ none of its sub-pages/tabs shown to super (V7 · د5-ح) ' + JSON.stringify(g));
      assert.equal(g.edit, 0, pk + ': nor offered ' + JSON.stringify(g));
    }
    for (const [label, re] of [['جائزة', /جائزة/], ['الاسترشاد', /الاسترشاد/], ['المضبوطات', /المضبوطات/]]) {
      const item = s.page.locator('.bsb .n', { hasText: label }).first();
      if (!(await item.isVisible().catch(() => false))) continue;
      await item.click(); await s.page.waitForTimeout(3500);
      const len = await s.page.evaluate(() => ((document.querySelector('main') || document.body).innerText || '').replace(/\s+/g, ' ').length);
      assert.ok(len > 120, label + ' page renders its content for super outside the ceiling (text ' + len + ')');
      assert.ok(re.test(await s.page.evaluate(() => document.title + ' ' + (document.querySelector('main') || document.body).innerText)), label);
    }
    /* the award reference editor is a write: offered to super in every unit (D1-c) */
    const awSet = async () => s.page.evaluate(() => {
      for (const el of document.querySelectorAll('main [data-screen-label]')) {
        const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let f = fk ? el[fk] : null;
        while (f && !(f.stateNode && f.stateNode.logic && typeof f.stateNode.logic.awCanSetRef === 'function')) f = f.return;
        if (f) return f.stateNode.logic.awCanSetRef();
      }
      return 'no-award-component';
    });
    const openAward = async () => { await s.page.locator('.bsb .n', { hasText: 'جائزة' }).first().click(); await s.page.waitForTimeout(3500); };
    assert.equal(await s.page.locator('.bsb .n:not(.gone)', { hasText: 'جائزة' }).count(), 0, 'award is OFF in B ⇒ no link for super (V7 · د5-ح)');
    await switchTo(s, 'TEST_ONLY_A'); await openAward(); assert.equal(await awSet(), true, 'award reference editor offered in A (inside the ceiling)');
    /* server: held action keys are the same in every unit for super — not narrowed by the ceiling (D1-c) */
    const h = await held(s.page);
    assert.ok(h.TEST_ONLY_A > 0 && h.TEST_ONLY_A === h.TEST_ONLY_B && h.TEST_ONLY_A === h.TEST_ONLY_A_S1, 'server write keys equal in every unit: ' + JSON.stringify(h));
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});

test('department manager and employee: scope selection still limited (no widening)', { timeout: 300000 }, async () => {
  const { lab } = await narrowWorld();
  const b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    assert.equal(await m.page.evaluate(() => KIVO.BassamDepts.setActive('TEST_ONLY_B')), false, 'manager of A cannot select B');
    const hm = await held(m.page);
    assert.equal(hm.TEST_ONLY_B, undefined, 'no server keys for B: ' + JSON.stringify(hm));
    const sm = await state(m.page);
    assert.equal(sm.role, 'staff'); assert.equal(sm.active, 'TEST_ONLY_A');
    assert.ok(sm.empsAdd, 'manager keeps his own department powers');
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    assert.equal(await e.page.evaluate(() => KIVO.BassamDepts.setActive('TEST_ONLY_B')), false, 'employee cannot select B');
    const se = await state(e.page);
    assert.equal(se.empsAdd, false, 'employee gains no write');
    assert.ok(!se.vis.includes('admin'), 'employee gains no admin page');
    assert.deepEqual(m.errs.concat(e.errs), []);
  } finally { await b.close(); await lab.close(); }
});

/* V7 · د5-ح (قرار المالك — كان د1-ج: «تظهر لمدير المنصة وحده»): الوحدةُ المطفأة على مستوى المنصة (mods.off) لا تظهر لأحد في القائمة الجانبية،
   ولا لمدير المنصة (260-bassam-plat.js · 331 myPerms). الحالتان في عالمٍ واحد: «الاسترشاد» مطفأ. */
test('module switched off platform-wide: its sidebar link is shown to nobody, not even super', { timeout: 300000 }, async () => {
  const lab = await startLab();
  const { env, W } = lab, DB = env.DB;
  const rows = DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_platform_v1'), plat = rows.length ? JSON.parse(rows.map((r) => r.v).join('')) : {};
  plat.mods = Object.assign({}, plat.mods || {}, { off: ['irshad'] });
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_platform_v1'), ...W.kvPutStmts(env, 'kv', 'bassam_platform_v1', JSON.stringify(plat)),
    DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind('bassam_platform_v1')]);
  const link = (page) => page.evaluate(() => {
    const off = ((KIVO.BassamPlat.get().mods || {}).off || []).slice();
    const a = document.querySelector('aside.bsb .s-nav .grp > a[data-key="irshad"]'), ctl = document.querySelector('aside.bsb .s-nav .grp > a[data-key="emps"]');
    const shown = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
    return { off, link: shown(a), control: shown(ctl) };
  });
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw);
    assert.equal(await switchTo(s, 'TEST_ONLY_A'), true);
    const su = await link(s.page);
    assert.deepEqual(su.off, ['irshad'], 'the module is off platform-wide');
    assert.equal(su.control, true, 'control: the operational sidebar is rendered for super');
    assert.equal(su.link, false, 'super does not see the link of the module switched off (V7 · د5-ح)');
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); await m.page.waitForTimeout(2500);
    const mg = await link(m.page);
    assert.deepEqual(mg.off, ['irshad']);
    assert.equal(mg.control, true, 'control: the sidebar is rendered for the manager');
    assert.equal(mg.link, false, 'the manager does not see the link of the module switched off');
    assert.deepEqual(s.errs.concat(m.errs), []);
  } finally { await b.close(); await lab.close(); }
});
