/* V7 · 53 (writers · رد المالك على (ج) — REPLY_D7_1): «النسخة الشاملة تُسقط قوالبها — يُطبَّق عليها التحويلُ نفسُه إلى أدوار، إدارةً إدارة بمسار التقطيع».
   نسخةٌ شاملة TEST_ONLY لإدارتين (v7_d7_fullcopy_fx fullOf) تحمل لكلٍّ bassam_perm_tpls_v1 وإسناداتِها في tplOf[<الإدارة>] من سجلّ صلاحياتها:
   بالمسار الواحد وبالدفعات (التقطيع) ⇒ القوالبُ لا تُذكر «لن يُنقل» · كلُّ إدارةٍ أدوارُها الثلاثة وشخصُها · منحُه من الدور (role:t1) بسقف الوحدة ·
   الملخّصُ يجمع الإدارتين · وكلُّ موردٍ يُقرأ بعد الاعتماد (readBack). قبل الإصلاح: القوالبُ في «لن يُنقل» ولا أدوار. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasSystem } from './harness.mjs';
import { internals } from './internals.mjs';
import { target, protocol, staged, readBack } from './v7_d6_import_fx.mjs';
import { fullOf } from './v7_d7_fullcopy_fx.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', FULL = { kind: 'full' };
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة بيانات العرض المصدر' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };
after(() => { console.log = quiet; });
const kvOf = (T, k) => { const r = T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k=?1 ORDER BY seq)", k)[0]; return r && r.v ? JSON.parse(r.v) : null; };
const W = await internals(['perm44E']);
const TASKS = W.perm44E().keysFor('tasks', 'view');

test('53 · النسخةُ الشاملة: قوالبُ كل إدارةٍ تصير أدوارَها بإسناداتها ومنحِها — بالمسار الواحد وبالدفعات', { timeout: 600000, ...need }, async () => {
  for (const how of ['single', 'sliced']) {
    const T = await target();
    try {
      const { full, want } = await fullOf(T, [[A, { small: true }, 'a'], [B, { small: true }, 'b']]);
      const tpls = JSON.stringify([{ id: 'TEST_ONLY_t1', name: 'TEST_ONLY قالب المهام', keys24: TASKS }, { id: 'TEST_ONLY_t2', name: 'TEST_ONLY قالب ثانٍ', keys24: TASKS }, { id: 'TEST_ONLY_t3', name: 'TEST_ONLY قالب فارغ' }]);
      full.data['bsdept:' + A + ':bassam_perm_tpls_v1'] = tpls; full.data['bsdept:' + B + ':bassam_perm_tpls_v1'] = tpls;
      const pm = JSON.parse(full.data.bassam_perms_v1);
      pm.tplOf = { [A]: { tst_demo_ae11: 'TEST_ONLY_t1' }, [B]: { tst_demo_be11: 'TEST_ONLY_t1', TEST_ONLY_ghost: 'TEST_ONLY_tx' } };
      full.data.bassam_perms_v1 = JSON.stringify(pm);
      for (const d of [A, B]) delete full.data['bsdept:' + d + ':bassam_roles_v1'];
      const run = await protocol(T, T.su, full, { scope: FULL, ...(how === 'sliced' ? { slice: 1, sliceTarget: 4000 } : { slice: false }) }).run();
      assert.equal(run.begin.status, 200, how + ' begin ' + JSON.stringify(run.begin.j).slice(0, 300));
      assert.ok(!(run.begin.j.skip || []).some((x) => /bassam_perm_tpls_v1/.test(x.k)), how + ': القوالبُ ليست في «لن يُنقل»: ' + JSON.stringify(run.begin.j.skip));
      assert.equal(run.commit && run.commit.status, 200, how + ' commit ' + JSON.stringify((run.commit || run.inspect || run.part || {}).j).slice(0, 500));
      assert.deepEqual(run.inspect.j.inspection.summary.tplRoles, { roles: 6, people: 2, unknownTpl: 1, lensDropped: 0 }, how + ': الملخّصُ يجمع الإدارتين');
      for (const d of [A, B]) await readBack(T, d, want[d]);
      const caps = kvOf(T, 'bassam_perms_v1').caps;
      for (const [d, ek] of [[A, 'tst_demo_ae11'], [B, 'tst_demo_be11']]) {
        const roles = kvOf(T, 'bsdept:' + d + ':bassam_roles_v1'), grants = kvOf(T, 'bsdept:' + d + ':bassam_grants_v1');
        assert.deepEqual(roles && roles.roles.map((r) => r.id), ['TEST_ONLY_t1', 'TEST_ONLY_t2', 'TEST_ONLY_t3'], how + ' ' + d + ': ثلاثةُ أدوار');
        assert.deepEqual(roles.people, { [ek]: { role: 'TEST_ONLY_t1', ex: [] } }, how + ' ' + d + ': الإسنادُ من tplOf الإدارة وحدها');
        const g = grants && grants.emp && grants.emp[ek];
        assert.equal(g && g.src, 'role:TEST_ONLY_t1', how + ' ' + d + ': المنحُ من الدور: ' + JSON.stringify(grants));
        assert.ok(g.plus.every((k) => TASKS.includes(k)), how + ' ' + d + ': لا مفتاحَ خارج الدور');
        if (!Array.isArray(caps[d]) || caps[d].includes('tasks')) for (const k of TASKS) assert.ok(g.plus.includes(k), how + ' ' + d + ': ' + k);
      }
      assert.equal(staged(T.DB), 0);
    } finally { await T.close(); }
  }
});
