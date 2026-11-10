/* RISHAD V7 P3-0 — the ceiling state shown from one source, and seeding unchanged by the removal of the unused patterns (isolated lab,
   TEST_ONLY data). The lab's units all have a record; each case rewrites bassam_perms_v1 in the lab database before signing in.
     · open    (no record in unit B nor above it): tree «السقف مفتوح — لم يُضبط», checklist «مفتوح — لم يُضبط» as a warning (!, not ✓),
               editor header the same warning;
     · inherit (G has a record, B none): «يرث سقف الأصل · n من …» / «موروثٌ من الأصل …» ✓;
     · own     (A its own record): «سقفٌ خاصّ · n من …», independent adds «مستقلّ»; an empty record reads «السقف فارغ» as a warning.
   Seeding (the real client engine, after the removal): a child under an empty parent gets the «أساسي» record and an empty effective ceiling;
   when the parent is widened the child stays within «أساسي» (no silent widening); under a capped parent the child snapshots it; a root node
   has no record (open). Nothing here changes authorization. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const KP = 'bassam_perms_v1';
const readP = (lab) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', KP).map((r) => r.v).join('') || '{}');
async function setPerms(lab, f) {
  const P = readP(lab); f(P);
  await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind(KP), ...lab.W.kvPutStmts(lab.env, 'kv', KP, JSON.stringify(P)), lab.env.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind(KP)]);
}
async function view(b, lab) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000); const p = s.page;
  const tree = async (name) => { await s.go('#/sysadmin/org', 2500); await p.locator('main a:has-text("فرد الكل")').click(); await p.waitForTimeout(400); return (await p.locator('main .tr-rw', { hasText: name }).first().innerText()).replace(/\s+/g, ' '); };
  const step = async (id) => { await s.go('#/sysadmin/org/' + id, 2500); const li = p.locator('main section[aria-label="قائمة التهيئة"] li', { hasText: 'سقف الصفحات' }).first(); return { txt: (await li.innerText()).replace(/\s+/g, ' '), cls: await li.getAttribute('class') }; };
  const head = async (id) => { await s.go('#/sysadmin/org/' + id, 2500); await p.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: 'سقف الصفحات' }).click(); await p.waitForTimeout(800); const e = p.locator('main .capst').first(); return { txt: (await e.innerText()).trim(), tone: await e.getAttribute('data-tone') }; };
  const emptyAlert = async (id) => { await s.go('#/sysadmin/org/' + id, 2500); await p.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: 'سقف الصفحات' }).click(); await p.waitForTimeout(800);
    return p.evaluate(() => { const m = document.querySelector('main').innerText.split('\n').map((x) => x.trim()); return m.find((x) => /^سقف الصفحات فارغ — |^السقف الفعلي لهذه الإدارة فارغ/.test(x)) || ''; }); };
  return { s, p, tree, step, head, emptyAlert };
}

test('V7 P3-0 · ceiling state from one source: open (warning), inherited, own, independent, empty — tree, checklist and editor agree', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    /* open: no record in B nor above it */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_A: P.caps.TEST_ONLY_A }; });
    let v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة ب'), /السقف مفتوح — لم يُضبط/, 'tree: open');
    let st = await v.step('TEST_ONLY_B'); assert.match(st.txt, /مفتوح — لم يُضبط/); assert.match(st.cls, /\bwn\b/, 'checklist: open is a warning, not ✓');
    let h = await v.head('TEST_ONLY_B'); assert.match(h.txt, /^المحفوظ: مفتوح — لم يُضبط/); assert.equal(h.tone, 'warn', 'editor: warning tone');
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* inherit (G capped, B no record) · own (A) · independent (A capOwn) */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_G: ['tasks', 'emps', 'admin'], TEST_ONLY_A: ['tasks', 'emps', 'help'] }; P.capOwn = {}; });
    v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة ب'), /يرث سقف الأصل [·-] [3٣] من/, 'tree: inherited (3 pages of G)');
    st = await v.step('TEST_ONLY_B'); assert.match(st.txt, /موروثٌ من الأصل/); assert.match(st.cls, /\bok\b/);
    h = await v.head('TEST_ONLY_B'); assert.match(h.txt, /^المحفوظ: موروثٌ من الأصل/); assert.equal(h.tone, '');
    assert.match(await v.tree('TEST_ONLY إدارة أ'), /سقفٌ خاصّ [·-] [2٢] من/, 'tree: own, cut by G (tasks, emps)');
    h = await v.head('TEST_ONLY_A'); assert.match(h.txt, /^المحفوظ: سقفٌ خاصّ: [2٢] من/);
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    await setPerms(lab, (P) => { P.capOwn = { TEST_ONLY_A: true }; });
    v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة أ'), /سقفٌ خاصّ [·-] [3٣] من .* [·-] مستقلّ/, 'tree: independent, its own 3 pages');
    h = await v.head('TEST_ONLY_A'); assert.match(h.txt, /^المحفوظ: سقفٌ خاصّ مستقلّ: [3٣] من/);
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* empty */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_A: [] }; P.capOwn = {}; });
    v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة أ'), /السقف فارغ/);
    st = await v.step('TEST_ONLY_A'); assert.match(st.txt, /سقفٌ خاصّ فارغ — لا صفحة مفعّلة لهذه الوحدة/); assert.match(st.cls, /\bwn\b/);
    let ea = await v.emptyAlert('TEST_ONLY_A'); assert.match(ea, /^سقف الصفحات فارغ — لا صفحة مفعّلة لهذه الإدارة/, 'editor alert: its own empty record — tick pages');
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* V7 P3-0 acceptance fix: an own NON-empty record under an empty ancestor — the emptiness comes from the ancestor */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_G: [], TEST_ONLY_A: ['tasks', 'emps', 'admin'] }; P.capOwn = {}; });
    v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة أ'), /السقف فارغ بحكم الأصول/, 'tree: empty because of the ancestors');
    st = await v.step('TEST_ONLY_A'); assert.match(st.txt, /السقف الفعلي فارغ بحكم سقوف الأصول/); assert.doesNotMatch(st.txt, /سقفٌ خاصّ فارغ/); assert.match(st.cls, /\bwn\b/);
    ea = await v.emptyAlert('TEST_ONLY_A'); assert.match(ea, /^السقف الفعلي لهذه الإدارة فارغ لأن سقف أصلٍ فوقها/, 'editor alert: the ancestor, not «tick pages»');
    /* inherited and empty (B has no record under G []) */
    assert.match(await v.tree('TEST_ONLY إدارة ب'), /السقف فارغ بحكم الأصول/);
    st = await v.step('TEST_ONLY_B'); assert.match(st.txt, /السقف الفعلي فارغ بحكم سقوف الأصول/);
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* independent and empty: its own record, no ancestor assumed */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_G: ['tasks'], TEST_ONLY_A: [] }; P.capOwn = { TEST_ONLY_A: true }; });
    v = await view(b, lab);
    st = await v.step('TEST_ONLY_A'); assert.match(st.txt, /سقفٌ خاصّ مستقلّ فارغ — لا صفحة مفعّلة لهذه الوحدة/);
    ea = await v.emptyAlert('TEST_ONLY_A'); assert.match(ea, /^سقف الصفحات فارغ — لا صفحة مفعّلة لهذه الإدارة/);
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* showing the state wrote nothing */
    const before = JSON.stringify(readP(lab)); await lab.idle(); assert.equal(JSON.stringify(readP(lab)), before);
  } finally { await b.close(); await lab.close(); }
});

test('V7 P3-0 · seeding after the pattern removal: empty parent ⇒ «أساسي» record and empty effective; widening the parent does not widen the child past «أساسي»', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; await s.go('#/sysadmin/org', 3000);
    const ev = (fn, arg) => p.evaluate(fn, arg);
    const flush = async () => { await p.evaluate(() => (KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync ? KIVO.__BS_SRV.flushAsync(4000) : null)).catch(() => {}); await p.waitForTimeout(700); await lab.idle(); };
    const eff = (id) => ev((id) => KIVO.BassamPerm.deptCap(id).slice().sort(), id);
    const ALL = await ev(() => KIVO.BassamPerm.PAGE_KEYS.slice());
    const BASIC = ['admin', 'emps', 'help', 'links', 'planning', 'staff', 'tasks'];
    const root = await ev(() => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY جذر', kind: 'إدارة عامة', pid: null })); await flush();
    assert.equal(readP(lab).caps[root.id], undefined, 'a root node gets no record'); assert.equal((await eff(root.id)).length, ALL.length, 'open');
    await ev((id) => KIVO.BassamPerm.setDeptCap(id, []), root.id); await flush();
    const kid = await ev((pid) => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY ابن', kind: 'قطاع', pid }), root.id); await flush();
    assert.deepEqual(readP(lab).caps[kid.id].slice().sort(), BASIC, 'under an empty parent: the «أساسي» record');
    assert.deepEqual(readP(lab).subs[kid.id], { emps: ['data', 'custody'], planning: ['readiness'], admin: ['shifts', 'backup', 'ptpls', 'import'] }, 'and its inner tabs');
    assert.deepEqual(readP(lab).lenses[kid.id], [], 'and its lenses');
    assert.deepEqual(await eff(kid.id), [], 'its effective ceiling is empty (the parent)');
    await ev(([id, all]) => KIVO.BassamPerm.setDeptCap(id, all), [root.id, ALL]); await flush();
    assert.deepEqual(await eff(kid.id), BASIC, 'the parent widened to every page: the child stays within «أساسي»');
    const capped = await ev(() => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY أب مسقوف', kind: 'إدارة عامة', pid: null })); await flush();
    await ev((id) => KIVO.BassamPerm.setDeptCap(id, ['emps', 'tasks', 'help']), capped.id); await flush();
    const snap = await ev((pid) => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY لقطة', kind: 'قطاع', pid }), capped.id); await flush();
    assert.deepEqual(readP(lab).caps[snap.id].slice().sort(), ['emps', 'help', 'tasks'], 'under a capped parent: a snapshot of it');
    assert.deepEqual(s.errs, []); await s.ctx.close();
    /* a stored patterns.basic (written by an earlier admin screen) still wins, end to end */
    await setPerms(lab, (P) => { P.patterns = { basic: { cap: ['help', 'links'], subs: {}, tabs: {}, lenses: [] } }; });
    const s2 = await openAs(b, lab, LAB.superUn, LAB.superPw); const p2 = s2.page; await s2.go('#/sysadmin/org', 3000);
    const flush2 = async () => { await p2.evaluate(() => (KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync ? KIVO.__BS_SRV.flushAsync(4000) : null)).catch(() => {}); await p2.waitForTimeout(700); await lab.idle(); };
    const kid2 = await p2.evaluate((pid) => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY ابن ثانٍ', kind: 'قطاع', pid }), root.id); await flush2();
    await p2.evaluate((id) => KIVO.BassamPerm.setDeptCap(id, []), root.id); await flush2();
    const kid3 = await p2.evaluate((pid) => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY ابن ثالث', kind: 'قطاع', pid }), root.id); await flush2();
    assert.deepEqual(readP(lab).caps[kid3.id].slice().sort(), ['help', 'links'], 'the stored «أساسي» is used for the seed');
    assert.ok(Array.isArray(readP(lab).caps[kid2.id]), 'kid2 (parent widened at that time) got a snapshot');
    assert.deepEqual(s2.errs, []);
  } finally { await b.close(); await lab.close(); }
});
