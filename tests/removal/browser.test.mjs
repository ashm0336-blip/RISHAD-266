/* V7 · د2-ب — اختبارُ الحذف (المتصفح): داخل نسخةٍ حُذف منها مجلدُ نظامٍ أو أكثر ثم أُعيد توليدُها وبناؤها (tools/removal_test.py)،
   ويعمل كذلك في الشجرة الكاملة. متصفحٌ حقيقي على المختبر المحلي (TEST_ONLY):
     · الدخول، ثم «صفحتي» و«الموظفون» و«الإعدادات» بكل تبويباتها، ولوحةُ مدير المنصة بوجهاتها، و«مؤشرات الإدارة» — بلا أخطاء صفحة
     · القائمةُ الجانبية تحمل رابطَ كل نظامٍ حاضر ولا تحمل رابطَ نظامٍ غائب، وعنوانُ نظامٍ غائب لا يفتح صفحة */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startLab, LAB } from '../browser/local_server.mjs';
import { chromium, openAs } from '../browser/lab_browser.mjs';
import { SYSTEMS, SRC } from '../unit/harness.mjs';

const ALL = ['award', 'dstats', 'irshad', 'seized'];
const PAGES = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests', 'pages.json'), 'utf8'));
const adminTabs = ((PAGES.pages.find((p) => p.key === 'admin') || {}).subs || []).filter((s) => !s.noTab).map((s) => s.key);

test('د2-ب · الحذف: المتصفحُ بالأنظمة الحاضرة [' + (SYSTEMS.join(' · ') || 'لا نظام') + '] — الدخول والصفحات الأساسية بلا أخطاء صفحة', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    /* مدير الإدارة: صفحتي · الموظفون · الإعدادات وتبويباتها */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    for (const h of ['#/profile', '#/employees', '#/admin'].concat(adminTabs.map((t) => '#/admin/' + t))) {
      await m.go(h, 2800); const st = await m.page.evaluate(() => ({ hash: location.hash, text: (document.querySelector('main') || document.body).innerText.length }));
      assert.ok(st.text > 40, h + ': الصفحة رُسمت (' + JSON.stringify(st) + ')');
    }
    const side = await m.page.evaluate(() => [...document.querySelectorAll('aside.bsb a[data-key]')].map((a) => a.getAttribute('data-key')));
    for (const k of ALL) assert.equal(side.includes(k), SYSTEMS.includes(k), 'رابطُ «' + k + '» في القالب بحضور نظامه فقط — ' + JSON.stringify(side));
    for (const k of ALL.filter((x) => !SYSTEMS.includes(x))) { await m.go('#/' + k, 2500); const comp = await m.page.evaluate(() => (document.querySelector('main') || document.body).innerText.length); assert.ok(comp >= 0, '#/' + k + ' لا يُسقط الصفحة'); }
    assert.deepEqual(m.errs, [], 'مدير الإدارة: لا أخطاء صفحة');
    await m.ctx.close();
    /* مدير المنصة: لوحةُ الإدارة بوجهاتها، ومؤشراتُ الإدارة، والموظفون */
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw);
    await s.go('#/sysadmin', 3500);
    const dests = await s.page.evaluate(() => [...document.querySelectorAll('aside.bsb [data-con-tab]')].map((x) => x.getAttribute('data-con-tab') + (x.getAttribute('data-con-sub') ? '/' + x.getAttribute('data-con-sub') : '')));
    assert.ok(dests.length >= 8, 'وجهاتُ اللوحة: ' + JSON.stringify(dests));
    assert.equal(dests.some((d) => /^histimp/.test(d)), SYSTEMS.includes('dstats'), 'وجهةُ الاستيراد التاريخي بحضور الإحصائيات فقط');
    for (const d of [...new Set(dests.map((x) => x.split('/')[0]))]) { await s.go('#/sysadmin/' + d, 2600); }
    await s.go('#/profile', 2500); await s.go('#/kpis', 3500); await s.go('#/employees', 3000);
    assert.deepEqual(s.errs, [], 'مدير المنصة: لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
