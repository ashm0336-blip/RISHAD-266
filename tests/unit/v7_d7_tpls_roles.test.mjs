/* V7 · د7 (قرار المالك — 51ب): قوالبُ الصلاحيات القديمة في نسخة الإدارة تصير أدواراً عند الاستيراد (TEST_ONLY — v7_d6_import_fx.mjs).
   · bassam_perm_tpls_v1 لا يُذكر «لن يُنقل» بعد اليوم: يتحوّل بالقاعدة نفسِها التي رحّلت المنصة (063 enfRolesFromTpls) إلى bassam_roles_v1 للوحدة الهدف،
     وإسناداتُه من tplOf في شريحة الصلاحيات (صحيفةُ المدير mgr:* لا تُسند — ب1) · والمنحُ المترجَم يُبنى بسقف الهدف (019d rsRoleGrants).
   · السقفُ والمديرُ والحساباتُ لا تتغيّر (ب3) · مفتاحُ دورٍ لنظامٍ مطفأ في الهدف مخزَّنٌ بلا أثر (ليس في المنح) — ولمدير الإدارة كذلك (057b perm44RolesWhy).
   · الملخّص (قبل التأكيد وبعده) يذكر عددَ الأدوار والإسنادات (counts.perms) وما حُوِّل (summary.tplRoles).
   · بعد الاعتماد يُقرأ كلُّ مورد (readBack) — والأدوارُ والمنحُ من القاعدة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasSystem } from './harness.mjs';
import { internals } from './internals.mjs';
import { target, oldFile, protocol, staged, readBack, LAB, NOT_TRANSFERRED, SRC_DEPT } from './v7_d6_import_fx.mjs';

const B = 'TEST_ONLY_B', SCOPE = { kind: 'dept', departmentId: B };
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة بيانات العرض المصدر' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };
const kvOf = (T, k) => { const r = T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k=?1 ORDER BY seq)", k)[0]; return r && r.v ? JSON.parse(r.v) : null; };
const W = await internals(['perm44E']);
const E = W.perm44E(), TASKS = E.keysFor('tasks', 'view'), OFF = { super: 'plan', mgr: 'dstats' }, OFFKEYS = { super: E.keysFor('plan', 'view'), mgr: E.keysFor('dstats', 'view') };

async function fileWithTpls(as = 'super') {
  const file = await oldFile({ small: true });
  file.data.bassam_perm_tpls_v1 = JSON.stringify([
    { id: 'TEST_ONLY_t1', name: 'TEST_ONLY قالب المهام والخطة', keys24: TASKS.concat(OFFKEYS[as]) },
    { id: 'TEST_ONLY_t2', name: 'TEST_ONLY قالب المدير', keys24: TASKS },
    { id: 'TEST_ONLY_t3', name: 'TEST_ONLY قالب فارغ' },
  ]);
  /* إسنادُ موظفٍ · صحيفةُ مدير المصدر (لا تُسند) · قالبٌ غيرُ موجود */
  file.perms.tplOf = { tst_demo_e11: 'TEST_ONLY_t1', ['mgr:' + SRC_DEPT]: 'TEST_ONLY_t2', TEST_ONLY_ghost: 'TEST_ONLY_tx' };
  return file;
}

test('د7 · قوالبُ نسخة الإدارة ← أدوار الوحدة الهدف (مديرُ المنصة ومديرُ الإدارة): الإسناد · المنحُ بسقف الهدف · المطفأُ بلا أثر · العدد في الملخّص · قراءةُ كلّ مورد', { timeout: 400000, ...need }, async () => {
  assert.ok(TASKS.length && OFFKEYS.super.length && OFFKEYS.mgr.length, 'registry keys for tasks, plan and dstats');
  assert.equal('bassam_perm_tpls_v1' in NOT_TRANSFERRED, false, 'templates are no longer listed as «not transferred»');
  for (const as of ['super', 'mgr']) {
    const file = await fileWithTpls(as), T = await target();
    try {
      /* سقفُ الهدف: لمدير المنصة بلا «plan» (مفاتيحُ الخطة في الدور وورقةُ plan مخزَّنةٌ بلا أثر) · لمدير الإدارة بلا «dstats» (مفاتيحُها في الدور
         مخزَّنةٌ له بلا أثر — 057b perm44RolesWhy؛ وplan مفعّلٌ له لأن بياناتِ نظامٍ مطفأ لا يكتبها مديرُ الإدارة — v7_d6_mgrimport (٣)) */
      const p0 = kvOf(T, 'bassam_perms_v1'); p0.caps[B] = as === 'super' ? ['daily', 'emps', 'admin', 'tasks', 'staff', 'dreport'] : ['tasks', 'daily', 'dreport', 'admin', 'emps', 'staff', 'plan']; p0.emps = { ...(p0.emps || {}), [B]: {} };
      await T.DB.batch([...T.lab.W.kvPutStmts(T.lab.env, 'kv', 'bassam_perms_v1', JSON.stringify(p0)), T.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
      const before = kvOf(T, 'bassam_perms_v1'), who = as === 'super' ? T.su : await T.login(LAB.mgrB, LAB.pw);
      const run = await protocol(T, who, file, { scope: SCOPE }).run();
      assert.equal(run.begin.status, 200, as + ': ' + JSON.stringify(run.begin.j).slice(0, 300));
      assert.ok(!run.begin.j.skip.some((x) => x.k === 'bassam_perm_tpls_v1'), as + ': the templates are not in the begin skip list');
      assert.equal(run.commit && run.commit.status, 200, as + ': ' + JSON.stringify((run.commit || run.inspect || run.begin).j).slice(0, 500));
      /* الملخّص: ما حُوِّل · والأدوارُ والإسناداتُ وما لا أثرَ له (قبل التأكيد وبعده — مصدرٌ واحد) */
      assert.deepEqual(run.inspect.j.inspection.summary.tplRoles, { roles: 3, people: 1, unknownTpl: 1, lensDropped: 0 }, as + ': summary.tplRoles');
      assert.ok(!run.inspect.j.inspection.summary.notTransferred.some((x) => /tpls/.test(x.k + x.why)), as + ': templates are not «not transferred»');
      /* القراءة بعد الاعتماد: كلُّ موردٍ تشغيلي · ثم الأدوار والمنح والصلاحيات من القاعدة */
      await readBack(T, B, null, T.su);
      const roles = kvOf(T, 'bsdept:' + B + ':bassam_roles_v1'), grants = kvOf(T, 'bsdept:' + B + ':bassam_grants_v1'), now = kvOf(T, 'bassam_perms_v1');
      assert.deepEqual(roles.roles.map((r) => r.id), ['TEST_ONLY_t1', 'TEST_ONLY_t2', 'TEST_ONLY_t3'], as + ': three roles');
      const t1 = roles.roles[0];
      assert.ok(t1.sys.tasks && t1.sys[OFF[as]], as + ': role t1 carries tasks and ' + OFF[as] + ' (stored though OFF)');
      assert.deepEqual(roles.people, { tst_demo_e11: { role: 'TEST_ONLY_t1', ex: [] } }, as + ': only the employee is assigned (no mgr:*, no unknown template)');
      /* الإسنادات: شخصُ الدور + ورقةُ الموظف · ما لا أثرَ له: كلُّ نظامٍ مطفأ يحمله الدور t1 (الخطةُ وعدساتُها) + ورقةُ plan */
      const inert = {}; for (const sy of Object.keys(t1.sys)) if (sy !== 'tasks') inert[sy] = 1; if (as === 'super') inert.plan = (inert.plan || 0) + 1;
      assert.ok(Object.keys(inert).every((k) => k === OFF[as] || /^lens\./.test(k)), as + ': only the OFF system (and its lenses) is inert: ' + JSON.stringify(inert));
      const wantP = { roles: 3, assignments: 2, inert };
      assert.deepEqual(run.inspect.j.inspection.counts.perms, wantP, as + ': counts.perms before the confirmation');
      assert.deepEqual(run.commit.j.counts.perms, wantP, as + ': and in the success summary');
      const g = grants.emp.tst_demo_e11;
      assert.equal(g.src, 'role:TEST_ONLY_t1', as + ': the grant comes from the role');
      for (const k of TASKS) assert.ok(g.plus.includes(k), as + ': the role grants ' + k);
      for (const k of OFFKEYS[as]) assert.ok(!g.plus.includes(k), as + ': ' + k + ' (' + OFF[as] + ' is OFF in the target) is inert — not granted');
      assert.ok(!Object.keys(grants.emp).some((e) => e.startsWith('mgr:')), as + ': no grant for a manager');
      assert.deepEqual(now.caps[B], before.caps[B], as + ': the ceiling is unchanged');
      assert.equal(staged(T.DB), 0);
      /* الإسنادُ فعّال: مفتاحُ المهام في الإنفاذ للموظف — يُسأل «اختبار الوصول» عن مفتاحٍ مُسنَد وآخرَ مطفأ */
    } finally { await T.close(); }
  }
});

test('د7 · نسخةُ إدارةٍ بلا tplOf (شكلُ نسخة Production المقيسة): القوالبُ تصير أدواراً بلا أشخاص — ولا منحَ لأحد', { timeout: 300000, ...need }, async () => {
  const file = await fileWithTpls(); delete file.perms.tplOf;
  const T = await target();
  try {
    const run = await protocol(T, T.su, file, { scope: SCOPE }).run();
    assert.equal(run.commit && run.commit.status, 200, JSON.stringify((run.commit || run.inspect || run.begin).j).slice(0, 400));
    await readBack(T, B, null, T.su);
    const roles = kvOf(T, 'bsdept:' + B + ':bassam_roles_v1');
    assert.equal(roles.roles.length, 3); assert.deepEqual(roles.people, {});
    assert.equal(run.commit.j.counts.perms.roles, 3);
    const grants = kvOf(T, 'bsdept:' + B + ':bassam_grants_v1');
    assert.ok(!grants || !Object.values(grants.emp || {}).some((x) => /^role:/.test(String(x.src || ''))), 'no role grant');
  } finally { await T.close(); }
});
