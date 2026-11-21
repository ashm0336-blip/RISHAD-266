/* V7 · د5-هـ (م6) — فحصُ متصفحٍ لبيانات العرض على المختبر المحلي (TEST_ONLY): مديرُ المنصة يزرع (POST /api/demo-data) ثم يدخل مديرُ الإدارة
   التجريبية بكلمته المكشوفة مرةً واحدة (لا تُطبع) فيفتح كلَّ صفحةٍ من صفحات فحص د5-د ⇒ كلُّ صفحةِ نظامٍ حاضر تعرض محتوى العرض (علاماتٌ غيرُ فارغة)
   بلا خطأ صفحة؛ ثم الحذفُ بأمرٍ واحد. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';

/* مساراتُ tests/browser/v7_d5d_pages_smoke.test.mjs:9 — ومعها النظامُ الذي يملك الصفحة (الغائبُ لا يُفتح) */
const ROUTES = [['#/planning', 'planning'], ['#/staffing', 'staff'], ['#/plan', 'plan'], ['#/daily', 'daily'], ['#/dreport', 'dreport'], ['#/employees', ''], ['#/admin', ''], ['#/profile', ''],
  ['#/kpis', ''], ['#/tasks', 'tasks'], ['#/irshad', 'irshad'], ['#/seized', 'seized'], ['#/award', 'award'], ['#/dstats', 'dstats']];
const BIDI = /[‎‏‪-‮⁦-⁩]/g, AR = (s) => s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660));

test('بياناتُ العرض: كلُّ صفحةٍ تُفتح بمحتوى العرض لمدير الإدارة التجريبية · ثم تُحذف بأمرٍ واحد', { timeout: 600000 }, async (t) => {
  const lab = await startLab(), b = await chromium.launch();
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';   /* أداةُ الاختبار على مضيف المختبر وحده */
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const seed = await su.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err)); assert.equal(seed.j.ok, 1);
    const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1'); assert.ok(m1, 'حسابُ مدير الإدارة التجريبية');
    const s = await openAs(b, lab, m1.un, m1.pw), errors = [];
    s.page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message)));
    s.page.on('console', (m) => { if (m.type() === 'error' && /TypeError|ReferenceError|is not a function|Cannot read|bus-/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
    const seen = {};
    for (const [r, sys] of ROUTES) {
      if (sys && sys !== 'planning' && !hasSystem(sys)) continue;
      await s.go(r, 3500);
      if (r === '#/award') { await s.page.getByText('لوحة النتائج').first().click(); await s.page.waitForTimeout(2000); }   /* الترشيحات في لوحة النتائج */
      seen[r] = await s.page.evaluate(() => { const m = document.querySelector('main'), t = m ? m.innerText : ''; return { len: t.replace(/\s+/g, ' ').length, demo: (t.match(/TEST_ONLY/g) || []).length, text: t.replace(/\s+/g, ' ').slice(0, 3000) }; });
      /* العلامة: أسماءُ العرض «TEST_ONLY · » — وفي الإحصائيات اليومية (أرقامٌ بلا أسماء) عددُ الأيام المسجّلة غيرُ صفر */
      const days = /(\d+)\s*\/\s*\d+\s*يوماً مسجّلاً/.exec(AR(seen[r].text.replace(BIDI, '')));
      seen[r].marks = r === '#/dstats' ? (days ? +days[1] : 0) : seen[r].demo;
      assert.ok(seen[r].len > 40 && seen[r].marks > 0, r + ': محتوى العرض ظاهر ' + JSON.stringify({ len: seen[r].len, marks: seen[r].marks, head: seen[r].text.slice(0, 200) }));
    }
    assert.deepEqual(errors, [], 'أخطاء صفحة:\n' + errors.join('\n'));
    t.diagnostic('marks: ' + JSON.stringify(Object.fromEntries(Object.entries(seen).map(([r, x]) => [r, x.marks]))));
    const rm = await su.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'remove' }) });
    assert.equal(rm.status, 200, JSON.stringify(rm.j)); assert.equal(rm.j.ok, 1);
    const st = await su.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'status' }) });
    assert.equal(st.j.seeded, false); assert.deepEqual(st.j.demoRows, {});
  } finally { await b.close(); await lab.close(); }
});
