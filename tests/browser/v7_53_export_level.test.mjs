/* V7 · 53 (قرار المالك — التصدير «أ»): الواجهةُ على العامل الحقيقي (الإنفاذ · TEST_ONLY): موظفٌ بدور {staff: كامل} يملك «تصدير» الجدول الشهري
   (KIVO.BassamPerm.can('staff','export')) · وبدور {staff: تعديل} لا يملكه · والمهامُ التي لا يحملها دورُه بلا تصدير. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, LAB, chromium, openAs, A, EKEY, ROLE_ID } from './d7_cov_lib.mjs';

test('53 · التصدير: {staff: كامل} ⇒ can(staff, export) · {staff: تعديل} ⇒ لا', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const probe = async () => {
      const s = await openAs(b, lab, LAB.empA, LAB.pw); await s.go('#/staffing', 4000);
      const r = await s.page.evaluate(() => ({ s: KIVO.BassamPerm.can('staff', 'export'), sv: KIVO.BassamPerm.can('staff', 'view'), t: KIVO.BassamPerm.can('tasks', 'export') }));
      await s.ctx.close(); return r;
    };
    await grant(b, lab, { staff: 'full' });
    assert.deepEqual(await probe(), { s: true, sv: true, t: false }, 'full: export on staff only');
    await grant(b, lab, { staff: 'edit' });
    assert.deepEqual(await probe(), { s: false, sv: true, t: false }, 'edit: no export');
  } finally { await b.close(); await lab.close(); }
});

/* V7 · 53: «ماذا يرى حامل الدور» و«ما يراه الآن» (334 holderPerms) = صلاحياتُ جلسة الشخص نفسِها — والتصديرُ منها */
test('53 · التصدير في معاينة الحامل: holderPerms للدور وللشخص = جلسةُ الشخص ({staff: كامل} تصدير · {staff: تعديل} بلا)', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const session = async () => { const s = await openAs(b, lab, LAB.empA, LAB.pw); await s.go('#/staffing', 4000); const r = await s.page.evaluate(() => KIVO.BassamPerm.myPerms().staff || []); await s.ctx.close(); return r.slice().sort(); };
    const preview = async () => {
      const m = await openAs(b, lab, LAB.mgrA, LAB.pw); await m.go('#/staffing', 4000);
      const r = await m.page.evaluate(([d, ek, id]) => {
        const P = KIVO.Perm44, rec = P.rolesOf(d), role = rec.roles.find((x) => x.id === id), keys = P.compileRole(role, P.ceiling(d).key);
        const st = (h) => ((KIVO.BassamPerm.holderPerms(h) || {}).staff || []).slice().sort();
        return { role: st({ kind: 'role', did: d, keys, role }), person: st({ kind: 'person', did: d, ekey: ek }) };
      }, [A, EKEY, ROLE_ID]);
      await m.ctx.close(); return r;
    };
    await grant(b, lab, { staff: 'full' });
    let me = await session(), pv = await preview();
    assert.ok(me.includes('export'), 'the session exports: ' + me);
    assert.deepEqual(pv.person, me, 'the person preview = the session'); assert.deepEqual(pv.role, me, 'the role preview = the session');
    await grant(b, lab, { staff: 'edit' });
    me = await session(); pv = await preview();
    assert.ok(!me.includes('export'), 'edit: no export: ' + me);
    assert.deepEqual(pv.person, me); assert.deepEqual(pv.role, me);
  } finally { await b.close(); await lab.close(); }
});
