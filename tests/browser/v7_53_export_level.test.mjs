/* V7 · 53 (قرار المالك — التصدير «أ»): الواجهةُ على العامل الحقيقي (الإنفاذ · TEST_ONLY): موظفٌ بدور {staff: كامل} يملك «تصدير» الجدول الشهري
   (KIVO.BassamPerm.can('staff','export')) · وبدور {staff: تعديل} لا يملكه · والمهامُ التي لا يحملها دورُه بلا تصدير. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, LAB, chromium, openAs } from './d7_cov_lib.mjs';

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
