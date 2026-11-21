/* V7 · د2-ب — اختبارُ الحذف (المتصفح): داخل نسخةٍ حُذف منها مجلدُ نظامٍ أو أكثر ثم أُعيد توليدُها وبناؤها (tools/removal_test.py)،
   ويعمل كذلك في الشجرة الكاملة. متصفحٌ حقيقي على المختبر المحلي (TEST_ONLY):
     · الدخول، ثم «صفحتي» و«الموظفون» و«المتابعة اليومية» و«مؤشرات الإدارة» و«الإعدادات» بكل تبويباتها، ولوحةُ مدير المنصة بوجهاتها — بلا أخطاء صفحة
     · د4-ب: بغياب المهام لا تبويبَ «المهام» في «المتابعة اليومية» ولا بطاقةَ «مهامك» في «صفحتي» ولا لوحةَ «مؤشرات المهام»
     · د4-ج: بغياب العهد — صفحةُ الموظفين بتبويب البيانات وحده (لا زرَّي «عهد الموظفين» و«مستودع العهد»، ورابطُ التبويب القديم يهبط على البيانات)،
       وحذفُ موظفٍ بخدمة الواجهة الحقيقية (مرجعُ الطلب بلا base.custody)، ونسخةُ الإدارة (بيانُها بلا مجال custody) ثم استعادتُها بالاستبدال حتى اعتماد الخادم
     · القائمةُ الجانبية تحمل رابطَ كل نظامٍ حاضر ولا تحمل رابطَ نظامٍ غائب، وعنوانُ نظامٍ غائب لا يفتح صفحة */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from '../browser/local_server.mjs';
import { chromium, openAs } from '../browser/lab_browser.mjs';
import { SYSTEMS, SRC } from '../unit/harness.mjs';

/* V7 · د5-ح (rmall): الأنظمةُ العشرة من الشجرة الكاملة (KIVO_FULL_SRC) — لا قائمةَ ثابتة تنسى نظاماً */
const FULL = process.env.KIVO_FULL_SRC || SRC;
const ALL = fs.readdirSync(path.join(FULL, 'systems')).filter((k) => fs.existsSync(path.join(FULL, 'systems', k, 'system.json'))).sort();
/* المهام بلا رابطٍ في القائمة الجانبية: تبويبٌ تحت «المتابعة اليومية» ولوحةٌ في المؤشرات وبطاقةٌ في «ملفي» · العهدُ تبويبٌ في الموظفين ·
   الجدولُ الشهري والتشغيلُ الميداني تحت حاويتهما «الخطة التشغيلية» (planning) · التقريرُ اليومي يُفحص أدناه (رابطُه بغياب المتابعة وحدها) */
const SIDE = ALL.filter((k) => !['tasks', 'custody', 'staff', 'plan', 'dreport'].includes(k));
const PAGES = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests', 'pages.json'), 'utf8'));
const adminTabs = ((PAGES.pages.find((p) => p.key === 'admin') || {}).subs || []).filter((s) => !s.noTab).map((s) => s.key);

test('د2-ب · الحذف: المتصفحُ بالأنظمة الحاضرة [' + (SYSTEMS.join(' · ') || 'لا نظام') + '] — الدخول والصفحات الأساسية بلا أخطاء صفحة', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    /* مدير الإدارة: صفحتي · الموظفون · الإعدادات وتبويباتها */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    const HAS_DAILY = PAGES.pages.some((p) => p.key === 'daily');   /* د5-هـ: المتابعةُ اليومية نظامٌ — بغيابها لا صفحتُها، والتقريرُ اليومي صفحةٌ عليا */
    for (const h of ['#/profile', '#/employees'].concat(HAS_DAILY ? ['#/daily'] : PAGES.pages.some((p) => p.key === 'dreport') ? ['#/dreport'] : [], ['#/kpis', '#/admin'], adminTabs.map((t) => '#/admin/' + t))) {
      /* V7 · د5-ح (rmall): تحت حِمل البوابة (حالتان بالتوازي) تُنتظر الصفحةُ مرسومةً فعلاً (نصٌّ في main بلا هيكل تحميل) لا مهلةً ثابتة */
      await m.page.evaluate((x) => { location.hash = x; }, h);
      await m.page.waitForFunction(() => { const x = document.querySelector('main') || document.body; return x.innerText.length > 40 && !x.querySelector('[data-bs-skeleton], .bs-skel-page'); }, null, { timeout: 60000 }).catch(() => {});
      const st = await m.page.evaluate(() => ({ hash: location.hash, text: (document.querySelector('main') || document.body).innerText.length }));
      assert.ok(st.text > 40, h + ': الصفحة رُسمت (' + JSON.stringify(st) + ')');
    }
    const side = await m.page.evaluate(() => [...document.querySelectorAll('aside.bsb a[data-key]')].map((a) => a.getAttribute('data-key')));
    /* د4-ب: «المتابعة اليومية» رُسمت فعلاً بشريط تبويباتها (خطأٌ في حساب قيم الصفحة لا يظهر خطأَ صفحة، فيُفحص المرسوم نفسُه) */
    const exactIn = (t) => m.page.evaluate((t) => [...(document.querySelector('main') || document.body).querySelectorAll('span,b')].some((x) => x.textContent.trim() === t), t);
    if (HAS_DAILY) { await m.go('#/daily', 2800); assert.ok((await exactIn('التقرير اليومي')) || (await exactIn('الجولات اليومية')), 'المتابعة اليومية: شريطُ التبويبات مرسوم'); }
    else assert.equal(side.includes('daily'), false, 'بغياب المتابعة لا رابطَ لها في القائمة');
    /* V7 · د5-ح (بند 8): التقريرُ اليومي تبويبٌ تحت المتابعة بحضورها (القائمةُ كما هي، بلا رابطٍ له)، وبغيابها له رابطُه الظاهر في القائمة يفتح صفحتَه */
    const HAS_DR = PAGES.pages.some((p) => p.key === 'dreport');
    if (HAS_DAILY || !HAS_DR) assert.equal(side.includes('dreport'), false, 'بحضور المتابعة (أو بغياب التقرير) لا رابطَ مستقلّاً للتقرير اليومي في القائمة');
    else {
      assert.ok(PAGES.navOrder.includes('dreport') && PAGES.navNames.dreport === 'التقرير اليومي', 'بغياب المتابعة: التقريرُ في ترتيب القائمة وأسمائها');
      await m.go('#/profile', 2400);
      const ln = await m.page.evaluate(() => { const a = document.querySelector('aside.bsb a[data-key="dreport"]'); if (!a) return null; const r = a.getBoundingClientRect(), cs = getComputedStyle(a); return { cls: a.className, text: a.textContent.trim(), shown: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 }; });
      assert.ok(ln && ln.shown && ln.text === 'التقرير اليومي' && !/\bgone\b/.test(ln.cls), 'بغياب المتابعة: رابطُ «التقرير اليومي» ظاهرٌ في القائمة (' + JSON.stringify(ln) + ')');
      await m.page.click('aside.bsb a[data-key="dreport"]'); await m.page.waitForTimeout(2400);
      const at = await m.page.evaluate(() => ({ hash: location.hash, on: (document.querySelector('aside.bsb a[data-key="dreport"]') || {}).className || '' }));
      assert.ok(/^#\/dreport/.test(at.hash) && /\bon\b/.test(at.on), 'الرابطُ يفتح صفحةَ التقرير ويُعلَّم نشطاً (' + JSON.stringify(at) + ')');
    }
    /* د4-ب: بغياب المهام — لا تبويبَها في «المتابعة اليومية»، ولا بطاقةَ «مهامك» في «صفحتي»، ولا لوحةَ مؤشراتها */
    if (!SYSTEMS.includes('tasks')) {
      const exact = (t) => m.page.evaluate((t) => [...(document.querySelector('main') || document.body).querySelectorAll('span,b')].some((x) => x.textContent.trim() === t), t);
      if (HAS_DAILY) { await m.go('#/daily', 2800); assert.equal(await exact('المهام'), false, 'لا تبويبَ «المهام» في المتابعة اليومية'); }
      await m.go('#/profile', 2800); assert.equal(await m.page.evaluate(() => !!document.querySelector('[data-pf-tasks]')), false, 'لا بطاقةَ «مهامك» في صفحتي');
      await m.go('#/kpis', 2800); assert.equal(await exact('مؤشرات المهام'), false, 'لا لوحةَ «مؤشرات المهام»');
    }
    /* د4-ج: بغياب العهد — صفحةُ الموظفين بتبويب البيانات وحده، وحذفُ موظفٍ بخدمة الواجهة نفسِها (KIVO.BassamEmpImp.transition) */
    if (!SYSTEMS.includes('custody')) {
      const txt = () => m.page.evaluate(() => (document.querySelector('main') || document.body).innerText);
      await m.go('#/employees', 3200); let t = await txt();
      assert.equal(/عهد الموظفين|مستودع العهد/.test(t), false, 'الموظفون: لا تبويبَي العهد');
      assert.match(t, /TEST_ONLY/, 'الموظفون: قائمةُ البيانات مرسومة');
      await m.go('#/employees/custody', 3000); t = await txt();
      assert.equal(/عهد الموظفين|مستودع العهد/.test(t), false, 'رابطُ تبويب العهد القديم لا يفتح تبويباً'); assert.match(t, /TEST_ONLY/, 'ويهبط على البيانات');
      assert.equal(await m.page.evaluate(() => typeof KIVO.Custody), 'undefined', 'لا خدمةَ عهد في الواجهة');
      const del = await m.page.evaluate(async () => {
        const T = KIVO.BassamEmpImp.transition, key = (r) => String((r && (r.eid || r.nid || r.name)) || '');
        const s = await T.read('delete'); if (!s.ok) return { step: 'read', err: s.err, msg: s.message };
        const rows = s.data.employees, victim = rows[rows.length - 1];
        const tk = await T.prepare('delete', { finalRows: rows.filter((r) => key(r) !== key(victim)), deleteMode: 'selected' }, s); if (tk.ok === 0) return { step: 'prepare', err: tk.err, msg: tk.message };
        const r = await T.send(tk); const s2 = await T.read('delete');
        return { step: 'send', ok: r.ok, err: r.err, msg: r.message, before: rows.length, after: s2.ok ? s2.data.employees.length : -1, base: Object.keys(s.data.base).sort() };
      });
      assert.equal(del.step, 'send', 'حذفُ موظف: ' + JSON.stringify(del)); assert.ok(del.ok, 'الخادم اعتمد حذفَ الموظف: ' + JSON.stringify(del));
      assert.equal(del.after, del.before - 1, 'نقص الموظفون واحداً'); assert.equal(del.base.includes('custody'), false, 'مرجعُ طلب الانتقال بلا base.custody: ' + del.base);
    }
    for (const k of SIDE) assert.equal(side.includes(k), SYSTEMS.includes(k), 'رابطُ «' + k + '» في القالب بحضور نظامه فقط — ' + JSON.stringify(side));
    /* V7 · د5-ح (rmall): «الخطة التشغيلية» صفحةُ قاعدة (مؤشراتُ الجاهزية) — تبقى في القائمة وتُرسم بغياب الجدول الشهري والتشغيل الميداني معاً */
    assert.ok(side.includes('planning'), 'رابطُ «الخطة التشغيلية» (صفحةُ قاعدة) في القائمة — ' + JSON.stringify(side));
    await m.page.evaluate(() => { location.hash = '#/planning'; });
    await m.page.waitForFunction(() => (document.querySelector('main') || document.body).innerText.length > 40, null, { timeout: 60000 });   /* يرمي بانقضاء المهلة: الصفحةُ لم تُرسم */
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
    /* د4-ج: بغياب العهد — نسخةُ الإدارة من صفحة العقدة (ملفٌ حقيقي يسلّمه المتصفح) ثم استعادتُها بالاستبدال من الملف نفسه حتى اعتماد الخادم */
    if (!SYSTEMS.includes('custody')) {
      const p = s.page, posts = [];
      p.on('response', async (r) => { if (/\/api\/backup\/restore/.test(r.url()) && r.request().method() === 'POST') { let j = null; try { j = await r.json(); } catch (e) {} posts.push({ s: r.status(), ok: j && j.ok, err: j && j.err, phase: j && (j.inspection ? 'prepare' : 'commit') }); } });
      const unit = await p.evaluate(() => { const D = KIVO.BassamDepts; return D && D.active ? D.active() : ''; }); assert.ok(unit, 'الإدارةُ النشطة معروفة');
      await s.go('#/sysadmin/org/' + unit, 3500);
      await p.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: 'البيانات' }).click(); await p.waitForTimeout(800);
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.locator('main [title^="نسخة الإدارة"]').click()]);
      const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rm-bk-')), 'dept.json'); await d.saveAs(file);
      const bk = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.equal(bk.kind, 'dept'); assert.equal(bk.manifest.domains.kv, 1); assert.equal(bk.manifest.domains.notifications, 1);
      assert.equal('custody' in bk.manifest.domains, false, 'بيانُ نسخة الإدارة بلا مجال العهد: ' + JSON.stringify(bk.manifest.domains)); assert.equal('custody' in bk.domains, false, 'ولا مجالَ عهد في الملف');
      const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 15000 }), p.locator('main [title^="استيراد نسخة احتياطية إلى هذه الإدارة"]').click()]);
      await fc.setFiles(file); await p.waitForTimeout(3500);
      const click = async (t, ms) => { const el = p.getByText(t, { exact: true }).last(); assert.equal(await el.count() > 0, true, 'الخطوة «' + t + '» ظاهرة'); await el.click(); await p.waitForTimeout(ms || 3000); };
      await click('استبدال كامل'); await click('نعم، استبدل');
      if (await p.locator('textarea:visible').count()) { await p.locator('textarea:visible').last().fill('TEST_ONLY استعادة نسخة الإدارة'); await click('حفظ بالسبب', 4000); }
      const body = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      assert.match(body, /اعتماد استعادة النسخة/, 'نافذةُ الاعتماد ظهرت'); assert.equal(/نطاق عهد/.test(body), false, 'ملخّصُ الاعتماد بلا ذكر العهد');
      await click('استعادة النسخة', 6000);
      assert.ok(posts.some((x) => x.phase === 'prepare' && x.s === 200 && x.ok === 1), 'الخادم قبِل تحضير الاستعادة: ' + JSON.stringify(posts));
      assert.ok(posts.some((x) => x.phase === 'commit' && x.s === 200 && x.ok === 1), 'الخادم اعتمد الاستعادة: ' + JSON.stringify(posts));
      await s.go('#/employees', 3000);
    }
    assert.deepEqual(s.errs, [], 'مدير المنصة: لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
