/* V7 · د6 (م5 «الأنظمة») — تبويبُ «الأنظمة» (ب5) · التطبيقُ على المحدد (ب2) · حارسُ التغييرات غير المحفوظة (ب11) · العدّادُ الواحد (p44SysCount). بياناتٌ مصطنعة TEST_ONLY.
   ① ب5 / ج4 — المقفلُ من فوق صفٌّ «مطفأ من: <المصدر>» لا يُفعَّل، و«افتح مصدره» يصل الوحدةَ المصدر (أعلى أصلٍ أطفأه · المنصة) على تبويب الأنظمة؛ «تشغيل الكل» /
      «إطفاء الكل» لا يمسّان المقفل، وعدّادُ «المفعّل من الكل»؛ «أثر الحفظ» يسمّي ما يتغيّر وما يُطفأ مع حاويته (Perm44.offWith)؛ صفُّ المنصة بحاله الفعلية.
   ② الدالةُ الواحدة — عمودُ الشجرة وخانةُ الملخّص وخطوةُ التهيئة وبطاقةُ النقل = ما يرسمه التبويب (p44SysOnEff) حتى حين يختلف القفلُ عن السقف وحده.
   ③ ب2 — النافذة: اختيارُ الأنظمة ← «مراجعة قبل الحفظ» لكل وحدة (يتغيّر · يُطفأ معها · تُخطّي بسببه · أصلاً) ← حفظ؛ المقفلُ لا يُفعَّل أبداً.
   ④ ب2 · كلُّه أو لا شيء على العامل الحقيقي: الوحداتُ كلُّها في كتابةٍ واحدة؛ رفضُ الخادم لجزء وحدةٍ واحدة ⇒ لا وحدةَ تغيّرت (في الخادم وفي الواجهة)؛ رفضٌ محلّي في منتصفها ⇒ كذلك.
   ⑤ ب11 / ج7 — السؤالُ في الحالات الثلاث (وحدةٌ أخرى · تبويبٌ آخر · مغادرةُ الصفحة): «البقاء» · «تجاهل وانتقال» · «حفظ ثم انتقال» (يفتح المراجعة، ويبقى إن رُفض)؛
      سجلُّ المصادر (orgDirtyReg) لتبويبات غيرها؛ وتحذيرُ المتصفح الأصلي عند الإغلاق والتحديث. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { orgWorld, rowOf, J, ORG_SRC, ORG_VIEW, ORG_CSS } from './org_world.mjs';
import { holdersWorld, clientOf, permViews, applyState, A, B, A_S1, KP } from './v7_d6_holders_fx.mjs';
import { stored } from './world_fx.mjs';

const SEC = 'TEST_ONLY_SEC', G = 'TEST_ONLY_G', OA = 'TEST_ONLY_A', OB = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1';
const N = (x) => (x === undefined ? undefined : J(x)), deq = (a, b, m) => assert.deepEqual(N(a), N(b), m);
const sysTab = (W, u) => W.open('#/sysadmin/org/' + u + '/systems');
const rowK = (v, k) => v.p44SysRows.find((r) => r.k === k);

/* ═══ ① ب5 · ج4 ═══ */
test('ب5 · ج4 — locked from above: «مطفأ من: <source>» (the topmost unit that switched it off · the platform), never enabled; «افتح مصدره» reaches that unit on «الأنظمة»', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + OA + '/systems', off: ['award'], caps: { [SEC]: ['staff', 'plan', 'tasks', 'daily', 'dreport', 'irshad', 'dstats', 'award', 'links', 'help'], [G]: ['staff', 'plan', 'tasks', 'daily', 'dreport', 'irshad', 'dstats', 'award', 'links', 'help'] } });
  let v = W.render();
  const sz = rowK(v, 'seized'), aw = rowK(v, 'award');
  assert.equal(sz.locked, true); assert.equal(sz.by, 'TEST_ONLY قطاع', 'the source is the TOPMOST unit that switched it off (the sector), not the nearest');
  assert.equal(sz.lockTxt, 'مطفأ من: TEST_ONLY قطاع'); assert.equal(sz.on, 'false'); assert.equal(sz.srcOn, true); assert.equal(sz.srcHref, '#/sysadmin/org/' + SEC + '/systems');
  assert.equal(aw.lockTxt, 'مطفأ من: المنصة'); assert.equal(aw.srcHref, '#/sysadmin/org/platform/systems', 'the platform source = the root row');
  sz.flip(); v = W.render(); assert.equal(v.p44SysDirty, false, 'a locked row does not flip'); assert.equal(rowK(v, 'seized').on, 'false');
  /* «افتح مصدره» */
  rowK(v, 'seized').srcGo({ preventDefault() {} }); await W.tick(); await W.tick();
  assert.equal(W.location.hash, '#/sysadmin/org/' + SEC + '/systems', '«افتح مصدره» opens the source unit on the systems tab');
  v = W.render(); assert.equal(v.ogU.name, 'TEST_ONLY قطاع'); assert.equal(rowK(v, 'seized').locked, false, 'at the source the switch is free'); assert.equal(rowK(v, 'seized').isOn, false);
  rowK(sysTab(W, OA), 'award').srcGo({ preventDefault() {} }); await W.tick(); await W.tick();
  assert.equal(W.location.hash, '#/sysadmin/org/platform/systems');
  v = W.render(); assert.equal(rowK(v, 'award').locked, false, 'the platform switch is free on the root row'); assert.equal(rowK(v, 'award').isOn, false);
  /* the view: badge text from the row, the link only where there is a source */
  assert.ok(ORG_VIEW.includes('<span class="p44-lock" data-og="lock">{{s.lockTxt}}</span>'));
  assert.ok(ORG_VIEW.includes('<sc-if value="{{s.srcOn}}" hint-placeholder-val="{{ false }}"><a class="p44-src" href="{{s.srcHref}}" data-og-act="src" onClick="{{s.srcGo}}">افتح مصدره</a></sc-if>'));
});

test('ب5 · ج4 — «تشغيل الكل» / «إطفاء الكل» never touch a locked row; the «المفعّل من الكل» counter; «أثر الحفظ» names what changes and what goes OFF with its container', () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + OA + '/systems', off: ['award'], caps: { [G]: ['staff', 'plan', 'tasks', 'daily', 'dreport', 'irshad', 'dstats', 'award', 'links', 'help', 'planning', 'emps'] } });
  let v = W.render();
  const locked = v.p44SysRows.filter((r) => r.locked).map((r) => r.k), free = v.p44SysRows.filter((r) => !r.locked).map((r) => r.k);
  assert.ok(locked.includes('seized') && locked.includes('award') && free.includes('staff'), 'a mix: ' + JSON.stringify([locked, free]));
  assert.equal(v.p44SysOnOf, v.p44SysRows.filter((r) => r.isOn).length + ' من ' + v.p44SysRows.length);
  assert.equal(v.p44SysAllOk, true); assert.equal(v.p44SysEffNone, true);
  v.p44SysAllOff(); v = W.render();
  deq(v.p44SysRows.filter((r) => r.isOn).map((r) => r.k), [], '«إطفاء الكل»: every free row OFF');
  deq(Object.keys(W.page.state.p44.cap.on).sort(), free.filter((k) => rowK(sysTab(W, OA), k).was).sort(), 'the draft holds the free rows that were ON — nothing locked');
  assert.equal(v.p44SysOnOf, '0 من ' + v.p44SysRows.length);
  assert.match(v.p44SysEffOff, /المتابعة اليومية/); assert.equal(v.p44SysEffNone, false);
  v.p44SysAllOn(); v = W.render();
  for (const k of locked) assert.equal(rowK(v, k).on, 'false', '«تشغيل الكل» does not touch the locked ' + k);
  for (const k of free) assert.equal(rowK(v, k).on, 'true', '«تشغيل الكل» turns on the free ' + k);
  for (const k of locked) assert.equal(k in W.page.state.p44.cap.on, false, 'no draft entry for a locked row: ' + k);
  /* «أثر الحفظ»: a container switched off names what lives in it (Perm44.offWith — the one closure) */
  v.p44SysUndo(); v = W.render(); rowK(v, 'daily').flip(); v = W.render();
  assert.equal(v.p44SysEffOff, 'المتابعة اليومية'); assert.match(v.p44SysEffWith, /المهام/); assert.match(v.p44SysEffWith, /التقرير اليومي/);
  v.p44SysReview(); v = W.render();
  deq(v.p44RevRows.map((r) => r.what.replace('TEST_ONLY إدارة أ · ', '')).sort(), ['التقرير اليومي — يُطفأ معها', 'المتابعة اليومية', 'المهام — يُطفأ معها'].sort(), 'the review names the same');
  assert.ok(/data-og="sys-effect"/.test(ORG_VIEW) && /يُطفأ معها:<\/b> \{\{p44SysEffWith\}\}/.test(ORG_VIEW) && /data-og-act="all-on"/.test(ORG_VIEW) && /data-og-act="all-off"/.test(ORG_VIEW) && /المفعّل من الكل/.test(ORG_VIEW));
});

test('ب5 · the root row = the platform switches; a system with no platform switch shows its real state (no false «مطفأ»), is not switchable there, and counts as ON', () => {
  const W = orgWorld({ hash: '#/sysadmin/org/platform/systems', off: ['seized'] }); const v = W.render();
  const fixed = v.p44SysRows.filter((r) => r.locked);
  assert.ok(fixed.length >= 1, 'systems without a platform switch exist');
  for (const r of fixed) { assert.equal(r.on, 'true', r.k + ' is ON on the platform'); assert.equal(r.lockTxt, 'لا مفتاح له على المنصة'); assert.equal(r.srcOn, false); assert.match(r.sub, /يُضبط لكل وحدة/); }
  assert.equal(rowK(v, 'seized').isOn, false); assert.equal(rowK(v, 'seized').locked, false);
  const c = W.page.p44SysCount('__plat'); assert.equal(c.on, v.p44SysRows.filter((r) => r.isOn).length, 'the root column = the root tab'); assert.equal(c.all, v.p44SysRows.length);
});

/* ═══ ② الدالةُ الواحدة ═══ */
test('one effective-ON function: the tree «الأنظمة» column · the overview summary · the checklist step · the move card read what the tab draws (p44SysOnEff), even where the lock and the ceiling alone disagree', () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + OA + '/systems', caps: { [G]: ['staff', 'plan', 'tasks', 'daily'], [OA]: ['staff', 'plan', 'tasks', 'daily', 'emps/custody'] } });
  /* the old divergence (frame 0.4): a leaf kept per unit that the ceiling read alone calls ON while the parent locks it */
  const P = W.KIVO.BassamPerm, on0 = P.on; P.on = (k, u) => ('emps/custody' === k ? Array.isArray(W.caps[u]) && W.caps[u].includes(k) : on0(k, u));
  const v = W.render(), cu = v.p44SysRows.find((r) => /custody/.test(String(r.k)) || r.n === 'عهد الموظفين');
  assert.ok(cu, 'custody row'); assert.equal(cu.locked, true, 'the tab shows it locked from the parent'); assert.equal(cu.isOn, false);
  assert.equal(W.page._p44On(OA, W.page._p44Sys().find((s) => s.k === cu.k)), true, 'the ceiling read alone calls it ON — the case that differed');
  const tabOn = v.p44SysRows.filter((r) => r.isOn).length, all = v.p44SysRows.length;
  deq(W.page.p44SysCount(OA), { on: tabOn, all }, 'p44SysCount = the tab');
  assert.equal(rowOf(v, OA).sys, tabOn + '/' + all, 'tree column = the tab');
  const ov = W.open('#/sysadmin/org/' + OA + '/overview');
  assert.equal(ov.ogSum.find((x) => x.k === 'systems').v, tabOn + ' من ' + all, 'overview summary = the tab');
  assert.match(ov.ogSteps.find((x) => x.k === 'systems').st + ov.ogSteps.find((x) => x.k === 'systems').tip, new RegExp(String(tabOn)), 'checklist step reads the same count');
  /* the source: one function, called by the three readers and the move card — no second copy of the expression */
  const f = (a, b) => ORG_SRC.slice(ORG_SRC.indexOf(a), ORG_SRC.indexOf(b));
  assert.match(f('  p44SysCount(', '  _p44NodePeopleVals('), /this\.p44SysOnEff\(u, s, off\)/);
  assert.match(f('  _ogMoveEffect(', '  _ogSetAll('), /this\.p44SysOnEff\(u, x, off\)/);
  assert.match(f('  _p44SysVals(', '  p44NavOf('), /this\.p44SysOnEff\(u, s, off\)/);
  assert.equal((ORG_SRC.match(/!this\._p44Lock\([^)]*\) && this\._p44On\(/g) || []).length, 0, 'the expression is not repeated anywhere');
});

/* ═══ ③ ب2 · النافذة ═══ */
test('ب2 · bulk apply: pick systems → «مراجعة قبل الحفظ» per unit (changes · goes OFF with it · skipped with its reason · already) → save; locked from above is never enabled', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org', caps: { [G]: ['staff', 'plan', 'tasks', 'daily', 'dreport'], [OA]: ['staff'], [OB]: ['staff', 'plan', 'tasks', 'daily', 'dreport'] } });
  let v = W.render();
  [OA, OB, S1].forEach((id) => rowOf(W.render(), id).chkFlip({ stopPropagation() {} }));
  W.render().ogBulkEnable(); v = W.render();
  assert.equal(v.p44BulkOn, true); assert.equal(v.p44BulkPick, true); assert.equal(v.p44BulkNoPick, true, 'nothing picked: no review yet');
  assert.match(v.p44BulkT, /^تفعيل أنظمة للمحدد — 3 وحدة/); assert.equal(v.p44BulkUnits, 'TEST_ONLY إدارة أ · TEST_ONLY قسم أ١ · TEST_ONLY إدارة ب', 'tree order');
  v.p44BulkNext(); assert.equal(W.render().p44BulkPick, true, 'no review without a system');
  for (const k of ['plan', 'seized']) W.render().p44BulkSys.find((s) => s.k === k).flip();
  v = W.render(); assert.equal(v.p44BulkPickN, '2 نظام من ' + v.p44BulkSys.length);
  v.p44BulkNext(); v = W.render();
  assert.equal(v.p44BulkRev, true);
  const R = (id) => v.p44BulkRows.find((r) => r.id === id);
  assert.equal(R(OA).ch, 'التشغيل الميداني', 'A: plan changes'); assert.equal(R(OA).chLbl, 'يُفعَّل');
  deq(R(OA).skip, [{ n: 'نظام المضبوطات', why: 'مطفأ من: TEST_ONLY إدارة عامة' }], 'A: seized is locked from above — skipped with its reason');
  deq(R(S1).skip.map((x) => x.n).sort(), ['التشغيل الميداني', 'نظام المضبوطات'].sort(), 'the section under A: both locked');
  assert.equal(R(S1).skip.find((x) => x.n === 'التشغيل الميداني').why, 'مطفأ من: TEST_ONLY إدارة أ — محدَّدةٌ معها: أعد التطبيق بعد الحفظ', 'locked by a unit selected with it: said, not enabled');
  assert.equal(R(S1).none, true);
  assert.equal(R(OB).sameOn, true); assert.equal(R(OB).same, 'التشغيل الميداني'); assert.equal(R(OB).sameLbl, 'مفعّل أصلاً');
  assert.match(v.p44BulkSum, /^يتغيّر 1 نظام في 1 وحدة · يُتخطّى 4 نظام مقفل من فوق$/);
  assert.equal(v.p44BulkSaveOff, false);
  const w0 = W.capW.length;
  assert.equal(await v.p44BulkSave(), true);
  deq(W.capW.slice(w0).map((x) => x[0]), [OA], 'only the unit that changes is written');
  assert.ok(W.capW.at(-1)[1].includes('plan') && !W.capW.at(-1)[1].includes('seized'), 'plan ON · seized NOT enabled');
  v = W.render(); assert.equal(v.p44BulkOn, false); assert.equal(v.ogBulkOn, false, 'the selection is cleared'); assert.match(W.toasts.at(-1)[0], /^فُعّلت الأنظمة المختارة في 1 وحدة/);
  /* OFF: what lives in a container goes with it, by name; already OFF is said */
  [OB].forEach((id) => rowOf(W.render(), id).chkFlip({ stopPropagation() {} })); W.render().ogBulkDisable();
  W.render().p44BulkSys.find((s) => s.k === 'daily').flip(); W.render().p44BulkNext(); v = W.render();
  assert.match(v.p44BulkT, /^إطفاء أنظمة/); assert.equal(v.p44BulkRows[0].ch, 'المتابعة اليومية'); assert.equal(v.p44BulkRows[0].chLbl, 'يُطفأ'); assert.match(v.p44BulkRows[0].with, /المهام/); assert.match(v.p44BulkRows[0].with, /التقرير اليومي/);
  /* back · cancel */
  v.p44BulkBack(); assert.equal(W.render().p44BulkPick, true); W.render().p44BulkClose(); assert.equal(W.render().p44BulkOn, false);
  /* not the platform admin: the hook does not take it */
  assert.equal(W.page.orgBulkApply('on', ['__plat']), false, 'the root row is never a bulk target');
  for (const s of ['data-og-dlg="bulk"', 'مراجعة قبل الحفظ', 'data-og-b="skip"', 'تُخطّي', 'data-og-b="ch"', 'data-og-b="with"', 'data-og-ok="bulk-save"']) assert.ok(ORG_VIEW.includes(s), s);
});

test('ب2 · a refused save stays in the review with its reason (nothing toasted as saved, the selection kept)', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org', caps: { [OB]: ['staff'] } });
  let den = 0; W.KIVO.__BS_SRV.denied = () => den; W.KIVO.__BS_SRV.flushAsync = async () => { den++; return true; };
  rowOf(W.render(), OB).chkFlip({ stopPropagation() {} }); W.render().ogBulkEnable(); W.render().p44BulkSys.find((s) => s.k === 'plan').flip(); W.render().p44BulkNext();
  assert.equal(await W.render().p44BulkSave(), false);
  const v = W.render(); assert.equal(v.p44BulkRev, true); assert.match(v.p44BulkErr, /^رفض الخادم الحفظ — لم يتغيّر شيء في أي وحدة/); assert.equal(v.ogBulkOn, true, 'the selection stays');
  assert.ok(!W.toasts.some((t) => /فُعّلت/.test(t[0])));
});

/* ═══ ④ ب2 · كلُّه أو لا شيء — العاملُ الحقيقي ═══ */
test('ب2 · all-or-nothing on the real worker: every unit in ONE write; the server refusing one unit\'s part ⇒ no unit changed (server and client); a local refusal mid-way ⇒ the same', { timeout: 600000 }, async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  /* A and B start with «جائزة التميز» OFF in their own records */
  {
    const c = await clientOf(W, 'su', B);
    try { const ALL = c.ev('KIVO.BassamPerm.PAGE_KEYS'); for (const u of [A, B]) assert.equal(c.I.setDeptCap(u, ALL.filter((k) => k !== 'award')).ok, true); await c.settle(); assert.equal(c.denied(), 0); } finally { c.dispose(); }
  }
  const ui = (c) => {
    const x = permViews(c).ui, toasts = [];
    x.setState = function (p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); };
    x.bsToast = (m, k) => toasts.push([m, k]); x.toasts = toasts;
    return x;
  };
  const perms = () => stored(W.env, KP);
  const has = (P, u, k) => (P.caps[u] || []).includes(k);
  /* (a) refusal: the posted registry gets an invalid part for B (capOwn of B) — the real server refuses the key, so A is not written either */
  {
    const c = await clientOf(W, 'su', B), x = ui(c);
    try {
      const before = JSON.stringify(perms()), f0 = c.T.W.fetch; let posts = 0;
      c.T.W.fetch = async (url, init = {}) => {
        if (/\/api\/save/.test(String(url)) && init.body && String(init.body).includes(KP)) {
          posts++; const b = JSON.parse(init.body), v = JSON.parse(b.set[KP]);
          assert.ok(has(v, A, 'award') && has(v, B, 'award'), 'ONE request carries both units');
          v.capOwn = Object.assign({}, v.capOwn || {}, { [B]: 'TEST_ONLY_bad' }); b.set[KP] = JSON.stringify(v); init = Object.assign({}, init, { body: JSON.stringify(b) });
        }
        return f0(url, init);
      };
      assert.equal(x.orgBulkApply('on', [A, B]), true); x.state.p44.bulk.pick = { award: true }; x.state.p44.bulk.step = 'rev';
      deq(x.p44BulkVals().p44BulkRows.map((r) => [r.id, r.ch]), [[A, 'جائزة التميز'], [B, 'جائزة التميز']]);
      assert.equal(await x.p44BulkSave(), false, 'refused');
      assert.equal(posts, 1, 'one write for all the units');
      assert.match(x.p44BulkVals().p44BulkErr, /لم يتغيّر شيء في أي وحدة/);
      assert.equal(JSON.stringify(perms()), before, 'server: nothing changed — neither A nor B');
      assert.equal(c.P.on('award', A) || c.P.rawCap(A).includes('award'), false, 'client: A back as it was'); assert.equal(c.P.rawCap(B).includes('award'), false, 'client: B back as it was');
    } finally { c.dispose(); }
  }
  /* (b) a local refusal mid-way (B refused after A was written): the registry is put back before anything is decided */
  {
    const c = await clientOf(W, 'su', B), x = ui(c);
    try {
      const before = JSON.stringify(perms()), raw0 = c.T.get(KP), sd = c.K.BassamPerm.setDeptCap;
      c.K.BassamPerm.setDeptCap = (u, arr) => (u === B ? { ok: false, err: 'TEST_ONLY مرفوض' } : sd(u, arr));
      x.orgBulkApply('on', [A, B]); x.state.p44.bulk.pick = { award: true }; x.state.p44.bulk.step = 'rev';
      assert.equal(await x.p44BulkSave(), false);
      assert.match(x.p44BulkVals().p44BulkErr, /^TEST_ONLY مرفوض — لم يتغيّر شيء في أي وحدة$/);
      assert.equal(c.T.get(KP), raw0, 'client registry = as before A was written'); assert.equal(c.P.rawCap(A).includes('award'), false);
      await c.settle(); assert.equal(JSON.stringify(perms()), before, 'server: unchanged');
    } finally { c.dispose(); }
  }
  /* (c) accepted: both units in one write; a fresh client sees both */
  {
    const c = await clientOf(W, 'su', B), x = ui(c);
    try {
      x.orgBulkApply('on', [A, B]); x.state.p44.bulk.pick = { award: true }; x.state.p44.bulk.step = 'rev';
      const n0 = c.T.saves().length;
      assert.equal(await x.p44BulkSave(), true);
      assert.equal(c.T.saves().slice(n0).filter((s) => String(s.body).includes(KP)).length, 1, 'one write');
      const P = perms(); assert.ok(has(P, A, 'award') && has(P, B, 'award'), 'server: both ON');
    } finally { c.dispose(); }
    const d = await clientOf(W, 'su', A);
    try { assert.equal(d.P.on('award', A), true); assert.equal(d.P.on('award', B), true); } finally { d.dispose(); }
  }
  /* (d) the single-unit tab save refused by the server: the draft and its review come back with the reason, and the promise says «not saved» (ب11 stays) */
  {
    const c = await clientOf(W, 'su', B), x = ui(c);
    try {
      const f0 = c.T.W.fetch, before = JSON.stringify(perms());
      c.T.W.fetch = async (url, init = {}) => {
        if (/\/api\/save/.test(String(url)) && init.body && String(init.body).includes(KP)) { const b = JSON.parse(init.body), v = JSON.parse(b.set[KP]); v.capOwn = { [B]: 'TEST_ONLY_bad' }; b.set[KP] = JSON.stringify(v); init = Object.assign({}, init, { body: JSON.stringify(b) }); }
        return f0(url, init);
      };
      let ended = null; x.__ogPend = (ok) => (ended = ok);
      assert.equal(await x._p44CapSave(B, { award: false }), false);
      deq(x.state.p44.cap, { unit: B, on: { award: false } }, 'the draft is back'); assert.match(x.state.p44.rev.err, /^رفض الخادم الحفظ/);
      assert.equal(ended, null, '«حفظ ثم انتقال» is still waiting (stays)'); assert.equal(JSON.stringify(perms()), before);
    } finally { c.dispose(); }
  }
});

/* ═══ ⑤ ب11 · ج7 ═══ */
const dirtySys = (W, u) => { const v = sysTab(W, u); const r = v.p44SysRows.find((x) => !x.locked); r.flip(); assert.equal(W.render().p44SysDirty, true); return r.k; };
test('ب11 · ج7 — unit change: «البقاء» stays (draft kept) · «تجاهل وانتقال» drops and moves · «حفظ ثم انتقال» opens the review and moves after the save only', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + OA + '/systems' });
  dirtySys(W, OA); assert.equal(W.page.dirty(), true); assert.equal(W.page.orgDirty(), true);
  /* البقاء */
  let p = W.page.go(OB); await W.tick(); let v = W.render();
  assert.equal(v.ogAskOn, true); assert.match(v.ogAskTxt, /^في «الأنظمة · TEST_ONLY إدارة أ» تغييرٌ غير محفوظ — الانتقالُ بلا حفظ يتجاهله\.$/);
  v.ogAskStay(); assert.equal(await p, false); assert.equal(W.location.hash, '#/sysadmin/org/' + OA + '/systems'); assert.equal(W.render().p44SysDirty, true, 'the draft is kept');
  /* تجاهل وانتقال */
  p = W.page.go(OB); await W.tick(); W.render().ogAskDrop(); assert.equal(await p, true);
  assert.equal(W.location.hash, '#/sysadmin/org/' + OB + '/systems'); assert.equal(W.page.orgDirty(), false, 'the draft is dropped');
  /* حفظ ثم انتقال */
  const k = dirtySys(W, OB), w0 = W.capW.length;
  p = W.page.go(OA); await W.tick(); W.render().ogAskSave(); await W.tick(); v = W.render();
  assert.equal(v.p44RevOn, true, '«مراجعة قبل الحفظ» opens'); assert.equal(W.location.hash, '#/sysadmin/org/' + OB + '/systems', 'not moved yet');
  v.p44RevSave(); assert.equal(await p, true); assert.equal(W.capW.length, w0 + 1, 'saved'); assert.equal(W.location.hash, '#/sysadmin/org/' + OA + '/systems', 'moved after the save');
  void k;
});

test('ب11 · ج7 — tab change and «حفظ ثم انتقال» refused: stays in place with the reason; «رجوع» from the review = stay', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + OA + '/systems' });
  dirtySys(W, OA);
  W.KIVO.BassamPerm.setDeptCap = () => ({ ok: false, err: 'TEST_ONLY مرفوض' });
  const p = W.page.go(OA, 'roles'); await W.tick(); assert.equal(W.render().ogAskOn, true);
  W.render().ogAskSave(); await W.tick(); let v = W.render(); v.p44RevSave(); await W.tick(); v = W.render();
  assert.equal(v.p44RevOn, true); assert.equal(v.p44RevErr, 'TEST_ONLY مرفوض', 'refused: the review stays with the reason');
  assert.equal(W.location.hash, '#/sysadmin/org/' + OA + '/systems', 'and the tab did not change');
  v.p44RevClose(); assert.equal(await p, false, '«رجوع» = stay'); assert.equal(W.location.hash, '#/sysadmin/org/' + OA + '/systems'); assert.equal(W.render().p44SysDirty, true);
});

test('ب11 · ج7 — leaving the page (the shell asks canLeave({leave:true})): the same three answers; roles/people drafts and any registered source count; the browser\'s native warning on close/refresh', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + OA + '/roles', docs: { [OA]: { roles: [{ id: 'TEST_ONLY_r', name: 'TEST_ONLY دور', sys: {} }], people: {} } } });
  let v = W.render(); assert.equal(W.page.orgDirty(), false);
  v.p44RoleNameSet({ target: { value: 'TEST_ONLY دور معدَّل' } }); v = W.render(); assert.equal(v.p44Dirty, true); assert.equal(W.page.orgDirty(), true, 'a roles draft is unsaved too');
  let p = W.page.canLeave({ leave: true }); await W.tick(); v = W.render();
  assert.match(v.ogAskTxt, /^في «الأدوار · TEST_ONLY إدارة أ» تغييرٌ غير محفوظ — مغادرةُ الصفحة بلا حفظ يتجاهله\.$/);
  v.ogAskStay(); assert.equal(await p, false);
  p = W.page.canLeave({ leave: true }); await W.tick(); W.render().ogAskSave(); await W.tick(); v = W.render(); assert.equal(v.p44RevOn, true, 'the roles review');
  await v.p44RevSave(); assert.equal(await p, true, 'saved ⇒ may leave'); assert.equal(W.page.orgDirty(), false);
  /* a source registered by another tab (م6) */
  let drop = 0, d = true; W.page.orgDirtyReg({ k: 'TEST_ONLY_src', t: 'TEST_ONLY تبويب', unit: OA, tab: 'people', dirty: () => d, review() {}, drop: () => { drop++; d = false; } });
  assert.equal(W.page.orgDirty(), true);
  p = W.page.canLeave({ leave: true }); await W.tick(); assert.match(W.render().ogAskTxt, /TEST_ONLY تبويب/); W.render().ogAskDrop(); assert.equal(await p, true); assert.equal(drop, 1);
  /* native warning */
  W.page.componentDidMount(); dirtySys(W, OA);
  let prevented = 0; const ev = { preventDefault: () => prevented++, returnValue: 'x' };
  W.page.__ogUnload(ev); assert.equal(prevented, 1); assert.equal(ev.returnValue, '');
  W.page.state.p44.cap = null; const ev2 = { preventDefault: () => prevented++ }; W.page.__ogUnload(ev2); assert.equal(prevented, 1, 'nothing unsaved: no warning');
  W.page.componentWillUnmount();
  for (const s of ['data-og-dlg="unsaved"', 'حفظ ثم انتقال', 'تجاهل وانتقال', 'البقاء']) assert.ok(ORG_VIEW.includes(s), s);
});

/* ═══ ب13 ═══ */
test('ب13 · the «مراجعة وحفظ» bar is fixed at the bottom under 1024px with 44px targets', () => {
  const m = /@media \(max-width:1023px\)\{\n  \.og \.p44-bar\{position:fixed;inset-inline:0;bottom:0;[^}]*\}\n  \.og\.og\.og \.p44-bar button\{min-height:44px;min-width:44px\}/.exec(ORG_CSS);
  assert.ok(m, 'the narrow rule');
});
