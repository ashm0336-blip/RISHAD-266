/* RISHAD V7 P3-0 — the ceiling state shown from one source, and seeding unchanged by the removal of the unused patterns (isolated lab,
   TEST_ONLY data). The lab's units all have a record; each case rewrites bassam_perms_v1 in the lab database before signing in.
     · open    (no record in unit B nor above it): tree «السقف مفتوح — لم يُضبط», checklist «مفتوح — لم يُضبط» as a warning (!, not ✓),
               (V7 · د5-هـ 44: the editor header and its empty alert were deleted with «سقف الصفحات» — their checks with them);
     · inherit (G has a record, B none): «يرث سقف الأصل · n من …» / «موروثٌ من الأصل …» ✓;
     · own     (A its own record): «سقفٌ خاصّ · n من …», independent adds «مستقلّ»; an empty record reads «السقف فارغ» as a warning.
   Seeding (the real client engine) — V7 · د6 (ب4): the explicit choice 'off' (default: the permanent pages alone) | 'parent' (the parent's systems; open or
   root ⇒ every page); when the parent is widened the child does not widen by itself. Nothing here changes authorization. */
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
  /* V7 · د6: الشاشةُ الواحدة — حالةُ السقف في الشجرة تلميحُ عمود «الأنظمة» (كانت سطراً تحت الاسم)، وخطوةُ قائمة التهيئة «الأنظمة» (كانت «الصلاحيات»):
     نصُّها الظاهر + تلميحُها، وحالتُها data-ok (كانت الصنف ok / wn) */
  const tree = async (name) => { await s.go('#/sysadmin/org/platform/overview', 2500); await p.locator('main [data-og-act="expand"]').first().click(); await p.waitForTimeout(400); return ((await p.locator('main .og-rw', { hasText: name }).first().locator('[data-og-col="systems"]').getAttribute('title')) || '').replace(/\s+/g, ' '); };
  const step = async (id) => { await s.go('#/sysadmin/org/' + id + '/overview', 2500); const li = p.locator('main section[aria-label="قائمة التهيئة"] li[data-og-step="systems"]').first(); return { txt: ((await li.innerText()) + ' ' + ((await li.locator('button').getAttribute('title')) || '')).replace(/\s+/g, ' '), cls: (await li.getAttribute('data-ok')) === 'true' ? 'ok' : 'wn' }; };
  return { s, p, tree, step };
}

test('V7 P3-0 · ceiling state from one source: open (warning), inherited, own, independent, empty — the tree and the checklist agree (V7 · د5-هـ 44: the ceiling editor was deleted)', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    /* open: no record in B nor above it */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_A: P.caps.TEST_ONLY_A }; });
    let v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة ب'), /السقف مفتوح — لم يُضبط/, 'tree: open');
    let st = await v.step('TEST_ONLY_B'); assert.match(st.txt, /مفتوح — لم يُضبط/); assert.match(st.cls, /\bwn\b/, 'checklist: open is a warning, not ✓');
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* inherit (G capped, B no record) · own (A) · independent (A capOwn) */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_G: ['tasks', 'emps', 'admin'], TEST_ONLY_A: ['tasks', 'emps', 'help'] }; P.capOwn = {}; });
    v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة ب'), /يرث سقف الأصل [·-] [3٣] من/, 'tree: inherited (3 pages of G)');
    st = await v.step('TEST_ONLY_B'); assert.match(st.txt, /موروثٌ من الأصل/); assert.match(st.cls, /\bok\b/);
    assert.match(await v.tree('TEST_ONLY إدارة أ'), /سقفٌ خاصّ [·-] [2٢] من/, 'tree: own, cut by G (tasks, emps)');
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    await setPerms(lab, (P) => { P.capOwn = { TEST_ONLY_A: true }; });
    v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة أ'), /سقفٌ خاصّ [·-] [3٣] من .* [·-] مستقلّ/, 'tree: independent, its own 3 pages');
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* empty */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_A: [] }; P.capOwn = {}; });
    v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة أ'), /السقف فارغ/);
    st = await v.step('TEST_ONLY_A'); assert.match(st.txt, /سقفٌ خاصّ فارغ — لا صفحة مفعّلة لهذه الوحدة/); assert.match(st.cls, /\bwn\b/);
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* V7 P3-0 acceptance fix: an own NON-empty record under an empty ancestor — the emptiness comes from the ancestor */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_G: [], TEST_ONLY_A: ['tasks', 'emps', 'admin'] }; P.capOwn = {}; });
    v = await view(b, lab);
    assert.match(await v.tree('TEST_ONLY إدارة أ'), /السقف فارغ بحكم الأصول/, 'tree: empty because of the ancestors');
    st = await v.step('TEST_ONLY_A'); assert.match(st.txt, /السقف الفعلي فارغ بحكم سقوف الأصول/); assert.doesNotMatch(st.txt, /سقفٌ خاصّ فارغ/); assert.match(st.cls, /\bwn\b/);
    /* inherited and empty (B has no record under G []) */
    assert.match(await v.tree('TEST_ONLY إدارة ب'), /السقف فارغ بحكم الأصول/);
    st = await v.step('TEST_ONLY_B'); assert.match(st.txt, /السقف الفعلي فارغ بحكم سقوف الأصول/);
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* independent and empty: its own record, no ancestor assumed */
    await setPerms(lab, (P) => { P.caps = { TEST_ONLY_G: ['tasks'], TEST_ONLY_A: [] }; P.capOwn = { TEST_ONLY_A: true }; });
    v = await view(b, lab);
    st = await v.step('TEST_ONLY_A'); assert.match(st.txt, /سقفٌ خاصّ مستقلّ فارغ — لا صفحة مفعّلة لهذه الوحدة/);
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
    /* showing the state wrote nothing */
    const before = JSON.stringify(readP(lab)); await lab.idle(); assert.equal(JSON.stringify(readP(lab)), before);
  } finally { await b.close(); await lab.close(); }
});

/* V7 · د6 (ب4 — owner decision): the seeding this case pinned (root ⇒ no record · empty parent ⇒ the «أساسي» pattern · capped parent ⇒ a snapshot · a stored
   patterns.basic wins) is replaced by the explicit choice 'off' (default) | 'parent'. The same end-to-end path (the real page, real saves), the new rule. */
test('V7 P3-0 → د6 · seeding by the explicit choice: default «all OFF»; «parent» = the parent\'s systems (open ⇒ all); widening the parent never widens the child; no «أساسي» pattern', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; await s.go('#/sysadmin/org', 3000);
    const ev = (fn, arg) => p.evaluate(fn, arg);
    const flush = async () => { await p.evaluate(() => (KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync ? KIVO.__BS_SRV.flushAsync(4000) : null)).catch(() => {}); await p.waitForTimeout(700); await lab.idle(); };
    const eff = (id) => ev((id) => KIVO.BassamPerm.deptCap(id).slice().sort(), id);
    const ALL = await ev(() => KIVO.BassamPerm.PAGE_KEYS.slice());
    const PERMANENT = ['admin', 'emps'];
    const root = await ev(() => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY جذر', kind: 'إدارة عامة', pid: null })); await flush();
    assert.equal(root.seed, 'off'); assert.deepEqual(readP(lab).caps[root.id].slice().sort(), PERMANENT, 'a new root node: the permanent pages alone (was: no record = open)');
    assert.deepEqual(readP(lab).subs[root.id], { emps: ['data'] }, '«العهد» OFF too'); assert.deepEqual(await eff(root.id), PERMANENT);
    const open = await ev(() => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY جذر كالمنصة', kind: 'إدارة عامة', pid: null, seed: 'parent' })); await flush();
    assert.deepEqual(readP(lab).caps[open.id].slice().sort(), ALL.slice().sort(), 'root + «parent»: every page, an explicit record');
    /* an empty parent: «parent» ⇒ its systems are OFF (no «أساسي» pattern); widening the parent later does not widen the child */
    await ev((id) => KIVO.BassamPerm.setDeptCap(id, []), root.id); await flush();
    const kid = await ev((pid) => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY ابن', kind: 'قطاع', pid, seed: 'parent' }), root.id); await flush();
    assert.deepEqual(readP(lab).caps[kid.id].slice().sort(), PERMANENT, 'under an empty parent: the permanent pages alone');
    assert.equal(readP(lab).lenses && readP(lab).lenses[kid.id], undefined, 'no lenses record is written');
    assert.deepEqual(await eff(kid.id), [], 'its effective ceiling is empty (the parent)');
    await ev(([id, all]) => KIVO.BassamPerm.setDeptCap(id, all), [root.id, ALL]); await flush();
    assert.deepEqual(await eff(kid.id), PERMANENT, 'the parent widened to every page: the child does not widen by itself');
    const capped = await ev(() => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY أب مسقوف', kind: 'إدارة عامة', pid: null, seed: 'parent' })); await flush();
    await ev((id) => KIVO.BassamPerm.setDeptCap(id, ['emps', 'tasks', 'help']), capped.id); await flush();
    const snap = await ev((pid) => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY لقطة', kind: 'قطاع', pid, seed: 'parent' }), capped.id); await flush();
    assert.deepEqual(readP(lab).caps[snap.id].slice().sort(), ['admin', 'emps', 'help', 'tasks'], 'under a capped parent: its systems (and the permanent pages)');
    assert.deepEqual(await eff(snap.id), ['emps', 'help', 'tasks'], 'effective: never beyond the parent');
    const offKid = await ev((pid) => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY مطفأ', kind: 'قطاع', pid }), capped.id); await flush();
    assert.deepEqual(readP(lab).caps[offKid.id].slice().sort(), PERMANENT, 'the default under a capped parent: all OFF');
    assert.deepEqual(s.errs, []); await s.ctx.close();
    /* a stored patterns.basic (written by an earlier admin screen) is no longer a seed source */
    await setPerms(lab, (P) => { P.patterns = { basic: { cap: ['help', 'links'], subs: {}, tabs: {}, lenses: [] } }; });
    const s2 = await openAs(b, lab, LAB.superUn, LAB.superPw); const p2 = s2.page; await s2.go('#/sysadmin/org', 3000);
    const flush2 = async () => { await p2.evaluate(() => (KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync ? KIVO.__BS_SRV.flushAsync(4000) : null)).catch(() => {}); await p2.waitForTimeout(700); await lab.idle(); };
    await p2.evaluate((id) => KIVO.BassamPerm.setDeptCap(id, []), root.id); await flush2();
    const kid3 = await p2.evaluate((pid) => KIVO.BassamDepts.nodeAdd({ name: 'TEST_ONLY ابن ثالث', kind: 'قطاع', pid, seed: 'parent' }), root.id); await flush2();
    assert.deepEqual(readP(lab).caps[kid3.id].slice().sort(), PERMANENT, 'the stored «أساسي» is not used: the explicit choice alone');
    assert.deepEqual(readP(lab).patterns, { basic: { cap: ['help', 'links'], subs: {}, tabs: {}, lenses: [] } }, 'the stored record itself is left as it is');
    assert.deepEqual(s2.errs, []);
  } finally { await b.close(); await lab.close(); }
});
