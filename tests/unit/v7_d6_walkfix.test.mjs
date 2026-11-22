/* V7 · د6 (walkfix) — إصلاحاتُ ما كشفته «الجولة الكاملة» خارج شاشة الصلاحيات، على العامل الحقيقي والواجهة الحقيقية (node:vm) — TEST_ONLY، بلا شبكة:
   ① إطفاءُ حاويةٍ على المنصة يأخذ ما يسكنها (إغلاقٌ واحد: perm44-core offClosure) في الواجهة والخادم، والمخزَّنُ كما هو · وذرّةُ منحٍ لا تفتح ورقةً خارج السقف
   ② تبويباتُ القسم ترث إطفاءَ إدارته («عهد الموظفين») واجهةً وخادماً
   ③ «مهامي» مرفوضةٌ في الخادم لغير مدير المنصة والمهامُ مطفأة — وما يعود لمدير المنصة كما كان
   ④ أسطرُ سجل نظامٍ مطفأ تُحجب عند القراءة ولا تُحذف
   ⑤ اسمُ بند القائمة بنوع الوحدة من المصدر الواحد (menuFor / seenBy) */
import test from 'node:test';
import assert from 'node:assert/strict';
import { holdersWorld, clientOf, applyState, seedRoles, ROLE_DOC, A, B, A_S1, E_ROLE, ACC } from './v7_d6_holders_fx.mjs';
import { stored } from './world_fx.mjs';

const UNDER = ['daily', 'dreport', 'tasks'];
const leavesOf = (c, re) => c.ev('Object.keys(KIVO.BassamPerm.myPerms()).filter(function (k) { return ' + re + '.test(k); })');
async function platOff(W, off) {
  const c = await clientOf(W, 'su', B);
  try { const pl = c.K.BassamPlat.get(); c.K.BassamPlat.set(Object.assign({}, pl, { mods: Object.assign({}, pl.mods, { off }) })); await c.settle(); assert.equal(c.denied(), 0, 'platform switch saved'); } finally { c.dispose(); }
}
async function asSuper(W, did, fn) { const c = await clientOf(W, 'su', did); try { const r = fn(c); await c.settle(); assert.equal(c.denied(), 0, 'saved by the worker'); return r; } finally { c.dispose(); } }

test('V7 · د6 (walkfix ①) · a container switched OFF on the platform takes what lives in it — one closure for the client and the server; the stored list is untouched; a grant atom opens no leaf outside the ceiling', { timeout: 600000 }, async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  ROLE_DOC.sys.plan = { lvl: 'view' };   /* مفاتيحُ العدسات يشاركها «التشغيل الميداني» و«الجولات اليومية» — منها كان التسرّب */
  await seedRoles(W, { live: 'task.view', gone: 'staff.view' });
  /* ON: every holder has the container */
  for (const [who, did] of [['mgr', A], ['role', A], ['sec', A_S1]]) { const c = await clientOf(W, who, did); try { assert.ok(c.seen().includes('daily'), 'ON: ' + who + ' sees «المتابعة اليومية»'); } finally { c.dispose(); } }
  await platOff(W, ['daily']);
  assert.deepEqual(stored(W.env, 'bassam_platform_v1').mods.off, ['daily'], 'the stored platform list is exactly what was switched (the closure is applied at read time)');
  for (const [who, did] of [['su', A], ['gm', A], ['mgr', A], ['sec', A_S1], ['role', A], ['none', A]]) {
    const c = await clientOf(W, who, did);
    try {
      assert.deepEqual(c.ev('KIVO.BassamPerm.platOff().slice().sort()'), UNDER.slice().sort(), who + ': platOff() = the container and what lives in it');
      assert.deepEqual(leavesOf(c, '/^(daily|dreport|tasks)(\\/|$)/'), [], who + ': no leaf of the OFF container or of what lives in it');
      const seen = c.seen();
      assert.ok(!seen.includes('daily'), who + ': the container is not in his menu: ' + seen);
      assert.deepEqual(c.sidebar(), seen, who + ': the sidebar source says the same');
      const on = c.ev('KIVO.Perm44.ceiling(' + JSON.stringify(did) + ').on');
      for (const k of UNDER) assert.ok(!on.includes(k), who + ': ' + k + ' is OFF in the ceiling');
      assert.equal(c.ev('KIVO.BassamPerm.kpiPanelOk("tasks", "")'), false, who + ': no «مؤشرات المهام» panel');
    } finally { c.dispose(); }
  }
  /* the server applies the same closure: «مهامي» is refused, the role's task key is outside the ceiling */
  const me = await W.C.api('/api/me/tasks?uid=' + ACC.role.uid, { cookie: W.ck.role });
  assert.equal(me.status, 403, 'server: «مهامي» refused while its container is OFF on the platform: ' + JSON.stringify(me.j));
  const chk = await W.C.api('/api/perm44/check?d=' + A + '&role=' + ROLE_DOC.id + '&key=task.view', { cookie: W.ck.su });
  for (const k of UNDER) assert.ok(chk.j && Array.isArray(chk.j.on) && !chk.j.on.includes(k), 'server: ' + k + ' is OFF in the ceiling it reports: ' + JSON.stringify(chk.j));
  assert.equal(chk.j.allow, false, 'server: the role\'s task.view is not allowed: ' + JSON.stringify(chk.j));
  /* back ON: everything returns */
  await platOff(W, []);
  for (const [who, did] of [['mgr', A], ['role', A]]) { const c = await clientOf(W, who, did); try { assert.deepEqual(c.ev('KIVO.BassamPerm.platOff()'), []); assert.ok(c.seen().includes('daily'), 'ON again: ' + who); } finally { c.dispose(); } }
  /* department level, the same leak: «المتابعة اليومية» OFF for A while «التشغيل الميداني» stays ON — the role holder gets no «الجولات اليومية» through the shared lens keys */
  await asSuper(W, B, (c) => c.I.setDeptCap(A, c.ev('KIVO.BassamPerm.PAGE_KEYS').filter((k) => !UNDER.includes(k))));
  const r = await clientOf(W, 'role', A);
  try {
    assert.ok(r.ev('KIVO.BassamPerm.can("plan", "view")'), 'the role holder still has «التشغيل الميداني»');
    assert.deepEqual(leavesOf(r, '/^daily(\\/|$)/'), [], 'and no leaf of «المتابعة اليومية» (it is OFF for his department)');
    assert.ok(!r.seen().includes('daily'));
  } finally { r.dispose(); }
});

test('V7 · د6 (walkfix ② · ③) · a section inherits its department\'s OFF tab («عهد الموظفين»), client and server · «مهامي» is refused for a non-admin account while «المهام» is OFF, unchanged for the platform admin', { timeout: 600000 }, async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  await seedRoles(W, { live: 'task.view', gone: 'staff.view' });
  const custody = async (who, did) => { const c = await clientOf(W, who, did); try { return { subOn: c.ev('KIVO.BassamPerm.subOn("emps", "custody")'), on: c.ev('KIVO.BassamPerm.on("emps/custody", ' + JSON.stringify(did) + ')'), own: c.ev('KIVO.BassamPerm.deptSubs(' + JSON.stringify(did) + ', "emps")') }; } finally { c.dispose(); } };
  assert.deepEqual(await custody('sec', A_S1), { subOn: true, on: true, own: ['data', 'custody'] }, 'ON: the section manager has «عهد الموظفين»');
  assert.equal((await W.C.api('/api/custody?uid=' + ACC.sec.uid + '&dept=' + A_S1 + '&view=month&limit=10', { cookie: W.ck.sec })).status, 200, 'ON: the server answers him');
  /* OFF for the department only — the section's own record keeps the tab */
  await asSuper(W, B, (c) => c.I.setDeptSubs(A, 'emps', ['data']));
  assert.deepEqual(stored(W.env, 'bassam_perms_v1').subs[A_S1].emps, ['data', 'custody'], 'the section\'s stored record is untouched');
  assert.deepEqual(await custody('sec', A_S1), { subOn: false, on: false, own: ['data', 'custody'] }, 'OFF for the department ⇒ OFF for its section (the record stays)');
  assert.equal((await custody('su', A_S1)).subOn, false, 'for the platform admin inside the section too');
  assert.equal((await W.C.api('/api/custody?uid=' + ACC.sec.uid + '&dept=' + A_S1 + '&view=month&limit=10', { cookie: W.ck.sec })).status, 403, 'the server refuses the section manager');
  /* back ON for the department ⇒ back for the section, from its own record */
  await asSuper(W, B, (c) => c.I.setDeptSubs(A, 'emps', ['data', 'custody']));
  assert.equal((await custody('sec', A_S1)).subOn, true, 'ON again for the department ⇒ the section has it again');

  /* ③ «مهامي» */
  const me = (who) => W.C.api('/api/me/tasks?uid=' + (who === 'su' ? '' : ACC[who].uid), { cookie: W.ck[who] });
  let r = await me('role'); assert.equal(r.status, 200, 'ON: ' + JSON.stringify(r.j)); assert.equal(r.j.ok, 1); assert.ok(!(r.j.me && r.j.me.off));
  await asSuper(W, B, (c) => c.I.setDeptCap(A, c.ev('KIVO.BassamPerm.PAGE_KEYS').filter((k) => k !== 'tasks')));
  for (const who of ['role', 'none', 'mgr']) { r = await me(who); assert.equal(r.status, 403, 'OFF: refused for ' + who + ': ' + JSON.stringify(r.j)); assert.equal(r.j.err, 'off'); assert.ok(!r.j.rows, 'no rows'); }
  const su = await W.C.api('/api/me/tasks', { cookie: W.ck.su });
  assert.equal(su.status, 200, 'the platform admin\'s answer is unchanged'); assert.equal(su.j.me.off, 1);
});

test('V7 · د6 (walkfix ④ · ⑤) · stored log lines of an OFF system are hidden while it is OFF (not deleted) · the menu name follows the unit kind from the one source', { timeout: 600000 }, async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const ins = (cid, k, etype) => W.env.DB.db.prepare('INSERT INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, ename, act, ctx, bef, aft, ip, dev, city) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, \'\', \'\', \'\', \'\', \'\', \'\')').run(cid, Date.now(), 'TEST_ONLY_u', 'TEST_ONLY', A, k, etype, 'TEST_ONLY_e', 'TEST_ONLY', 'edited');
  ins('TEST_ONLY_c1', 'bsdept:' + A + ':bassam_tasks_v1', 'task'); ins('TEST_ONLY_c2', 'bsdept:' + A + ':bassam_employees_v1', 'employee');
  const log = async (who) => { const r = await W.C.api('/api/aud?dept=' + A + '&limit=50', { cookie: W.ck[who] }); assert.equal(r.status, 200, JSON.stringify(r.j)); return r.j.rows.filter((x) => /^TEST_ONLY_c/.test(String(x.cid || '')) || x.eid === 'TEST_ONLY_e').map((x) => x.etype).sort(); };
  assert.deepEqual(await log('su'), ['employee', 'task'], 'ON: both lines');
  await asSuper(W, B, (c) => c.I.setDeptCap(A, c.ev('KIVO.BassamPerm.PAGE_KEYS').filter((k) => k !== 'tasks')));
  assert.deepEqual(await log('su'), ['employee'], 'OFF for the department: the task line is hidden — for the platform admin too');
  assert.deepEqual(await log('mgr'), ['employee'], 'and for the manager');
  assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE cid LIKE 'TEST_ONLY_c%'")[0].n, 2, 'nothing was deleted');
  await asSuper(W, B, (c) => c.I.setDeptCap(A, c.ev('KIVO.BassamPerm.PAGE_KEYS')));
  assert.deepEqual(await log('su'), ['employee', 'task'], 'ON again: the stored line is back');
  await platOff(W, ['daily']);
  assert.deepEqual(await log('su'), ['employee'], 'its container OFF on the platform: hidden too (the same closure)');
  await platOff(W, []);

  /* ⑤ names */
  const names = async (who, did, h) => { const c = await clientOf(W, who, did); try { return c.ev('(function (h) { var m = {}; (h ? KIVO.BassamPerm.seenBy(h) : KIVO.BassamPerm.menuFor().filter(function (x) { return x.on; })).forEach(function (x) { m[x.k] = x.n; }); return [m.kpis, m.emps]; })(' + JSON.stringify(h || null) + ')'); } finally { c.dispose(); } };
  assert.deepEqual(await names('sec', A_S1), ['مؤشرات القسم', 'موظفو القسم'], 'the section manager\'s menu source names the section');
  assert.deepEqual(await names('mgr', A), ['مؤشرات الإدارة', 'موظفو الإدارة'], 'the department manager\'s names the department');
  assert.deepEqual(await names('su', B, { kind: 'mgr', did: A_S1 }), ['مؤشرات القسم', 'موظفو القسم'], '«ما يراه مدير» for a section, seen from elsewhere, names the section');
  assert.deepEqual(await names('su', A_S1, { kind: 'mgr', did: A }), ['مؤشرات الإدارة', 'موظفو الإدارة'], 'and for a department, seen from inside a section, the department');
});
