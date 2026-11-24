/* V7 · 53 (noreason · REVIEW.md البند ٣ — قرارُ المالك 23 نوفمبر): «لا يُطلب سببٌ لأيّ فعلٍ من أيّ مستخدم — رسالةُ التأكيد تكفي».
   في متصفحٍ حقيقي على المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY) ومديرُ الإدارة هو الفاعل (من كانت تُفتح له نافذةُ السبب؛ مديرُ المنصة كان معفًى):
   فعلٌ ممثِّلٌ لكل نظام من مدخله نفسِه في الصفحة —
     المهام: فتحُ الشهر الماضي المعتمد (task.month.reopen · نقرةٌ مزدوجة على بطاقته) · الجدول الشهري: فتحُ الشهر الماضي المعتمد (staff.reopen · نقرةٌ مزدوجة)
     الإحصائيات اليومية والخطة التشغيلية: فتحُ الشهر الماضي بأثر رجعي (نقرةٌ مزدوجة) · المتابعة اليومية: فتحُ يومٍ ماضٍ (نافذتُه نفسُها)
     الإرشاد والمضبوطات: فتحُ الفترة للاستدراك (_irRetroToggle · _szRetroToggle — مدخلُ النقرة المزدوجة) · الموظفون: حذفُ موظف (نافذةُ تأكيد الحذف)
   لكلٍّ: تظهر نافذةُ تأكيد (عنوانُها وزرُّ «إلغاء») بلا أيّ حقلٍ نصّيّ؛ «تأكيد» يُرسل طلباً يقبله الخادم (200) ولا يظهر بعده سؤالُ سبب
   (لا <textarea> ولا نصوصُ نافذة السبب في الصفحة) ولا يردّ الخادمُ 403 لنقص السبب، ويتغيّر المخزَّن فعلاً. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, LAB, openAs, chromium, A, logicOf, until } from './d7_cov_lib.mjs';
import { replaceOperationalFixture, inspectOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';

const kv = (lab, k) => { try { return inspectOperationalFixture(lab.env, k); } catch (e) { return null; } };

const K = (r) => 'bsdept:' + A + ':' + r;
const REASON_TEXT = ['هذا الإجراء يتطلب سبباً', 'حفظ بالسبب', 'تذكّر هذا السبب', 'اكتب السبب', 'يشترط الخادم سبباً', 'يتطلب سببًا'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];   /* V7 · 53 تقويم: الأشهرُ ميلادية (كرتُ الشهر المشترك) */
/* اليومُ الهجريّ للخادم (أم القرى · الرياض − 3 ساعات) والشهرُ الماضي */
const T = (() => { const o = {}; new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(Date.now() - 3 * 3600e3)).forEach((p) => { o[p.type] = p.value; }); return { y: parseInt(o.year, 10), m: +o.month, d: +o.day }; })();
const PM = T.m === 1 ? { y: T.y - 1, m: 12 } : { y: T.y, m: T.m - 1 }, PMK = PM.y + '-' + String(PM.m).padStart(2, '0');
const L = (p, name, fn, arg) => p.evaluate(async ([src, fn, arg]) => { const x = new Function('return ' + src)(); return new Function('L', 'arg', 'return (async () => {' + fn + '})()')(x, arg); }, [logicOf(name), fn, arg]);

/* النافذةُ المفتوحة التي فيها العنوان: أقربُ سلفٍ ثابت الموضع (fixed) — حقولُها النصّية وأزرارُها الظاهرة */
const dialogOf = (p, title) => p.evaluate((title) => {
  const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const hit = ['h2', 'h1,h3,b', 'div,p,span'].flatMap((q) => [...document.querySelectorAll(q)].filter((e) => vis(e) && e.children.length === 0 && (e.textContent || '').trim().includes(title)));
  for (const e of hit) {
    let o = e; while (o && o !== document.body && getComputedStyle(o).position !== 'fixed') o = o.parentElement;
    if (!o || o === document.body) continue;
    const fields = [...o.querySelectorAll('textarea, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), [contenteditable=true]')].filter(vis);
    const buttons = [...o.querySelectorAll('button')].filter(vis).map((b) => (b.textContent || '').trim()).filter(Boolean);
    return { fields: fields.map((f) => f.outerHTML.slice(0, 160)), buttons, text: (o.innerText || '').slice(0, 600) };
  }
  return null;
}, title);
const clickOk = (p, title) => p.evaluate((title) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const e = ['h2', 'h1,h3,b', 'div,p,span'].flatMap((q) => [...document.querySelectorAll(q)].filter((x) => vis(x) && x.children.length === 0 && (x.textContent || '').trim().includes(title)))
    .find((x) => { let o = x; while (o && o !== document.body && getComputedStyle(o).position !== 'fixed') o = o.parentElement; return o && o !== document.body; });
  let o = e; while (o && o !== document.body && getComputedStyle(o).position !== 'fixed') o = o.parentElement;
  const b = o && [...o.querySelectorAll('button')].filter(vis).find((x) => !/^\s*(إلغاء|إلغاء التعديل|رجوع)\s*$/.test(x.textContent || '') && (x.textContent || '').trim());
  if (!b) return null; const t = b.textContent.trim(); b.click(); return t;
}, title);

async function check(s, lab, sys, { open, title, key, changed }) {
  const p = s.page, posts = [], before = key ? JSON.stringify(kv(lab, key)) : null;
  const onResp = async (r) => { if (r.request().method() === 'POST' && /^\/api\//.test(new URL(r.url()).pathname)) { let t = ''; try { t = (await r.text()).slice(0, 300); } catch (e) { /* بلا جسم */ } posts.push(r.status() + ' ' + new URL(r.url()).pathname + ' ' + t); } };
  p.on('response', onResp);
  try {
    await open();
    const dlg = await until(() => dialogOf(p, title), sys + ': نافذةُ التأكيد «' + title + '»');
    assert.deepEqual(dlg.fields, [], sys + ': لا حقلَ سببٍ في نافذة التأكيد — ' + dlg.text);
    assert.ok(dlg.buttons.some((b) => /^إلغاء/.test(b)), sys + ': نافذةُ تأكيدٍ بزرّ إلغاء — ' + JSON.stringify(dlg.buttons));
    for (const t of REASON_TEXT) assert.ok(!dlg.text.includes(t), sys + ': لا نصَّ سبب في النافذة: ' + t);
    const ok = await clickOk(p, title);
    assert.ok(ok, sys + ': زرُّ التأكيد');
    await until(() => posts.some((x) => /^200 /.test(x)), sys + ': طلبٌ قبله الخادم بعد «' + ok + '» · ' + JSON.stringify(posts));
    await p.waitForTimeout(2500); await lab.idle();
    const body = await p.evaluate(() => document.body.innerText);
    for (const t of REASON_TEXT) assert.ok(!body.includes(t), sys + ': لا نافذةَ سبب بعد التأكيد: ' + t);
    assert.equal(await p.locator('textarea:visible').count(), 0, sys + ': لا حقلَ سبب بعد التأكيد');
    assert.deepEqual(posts.filter((x) => /^403 /.test(x) || /"(?:why|err)":"reason"/.test(x)), [], sys + ': لا رفضَ لنقص السبب');
    if (key) assert.ok(changed(kv(lab, key), JSON.parse(before)), sys + ': تغيّر المخزَّن فعلاً · ' + JSON.stringify(kv(lab, key)).slice(0, 300));
    return { ok, posts };
  } finally { p.off('response', onResp); }
}
const dbl = async (p, text) => { const c = p.locator('main').getByText(text, { exact: true }).first(); await c.scrollIntoViewIfNeeded(); await c.dblclick(); };

test('noreason: مديرُ الإدارة — فعلٌ ممثّلٌ لكل نظام: نافذةُ تأكيدٍ بلا حقل سبب، والتأكيدُ يحفظ بلا سؤالٍ عن سبب ولا رفض', { timeout: 900000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await replaceOperationalFixture(lab.env, K('bassam_tasks_locks_v1'), { [PMK]: true });
    await replaceOperationalFixture(lab.env, K('bassam_staffing_locks_v1'), { [PMK]: true });
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(20000);
    const done = [];
    const at = async (hash, name) => { await s.go(hash, 5000); if (PM.y !== T.y) await L(p, name, 'L.setState({ year: arg }); await new Promise((go) => setTimeout(go, 600));', PM.y); };

    /* المهام: الشهرُ الماضي معتمد ⇒ نقرةٌ مزدوجة على بطاقته ⇒ «فتح الشهر للتعديل» (task.month.reopen) */
    await at('#/tasks', 'Tasks');
    done.push(['tasks', await check(s, lab, 'المهام · إعادة فتح الشهر المعتمد', { open: () => dbl(p, MONTHS[PM.m - 1]), title: 'فتح الشهر للتعديل',
      key: K('bassam_tasks_locks_v1'), changed: (a) => !a || a[PMK] !== true })]);

    /* الجدول الشهري: الشهرُ الماضي معتمد ⇒ نقرةٌ مزدوجة ⇒ فتحُه للتعديل (staff.reopen — حالةُ المالك الأصلية 403 …=reason[staff.reopen]) */
    await at('#/staffing', 'Staffing');
    done.push(['staff', await check(s, lab, 'الجدول الشهري · إعادة فتح الشهر المعتمد', { open: () => dbl(p, MONTHS[PM.m - 1]), title: 'فتح للتعديل',
      key: K('bassam_staffing_locks_v1'), changed: (a) => !a || a[PMK] !== true })]);

    /* الإحصائيات اليومية: الشهرُ الماضي مقفلٌ تلقائياً ⇒ نقرةٌ مزدوجة ⇒ «فتح … بأثر رجعي» */
    await s.go('#/dstats/haram', 5000);
    if (PM.y !== T.y) await L(p, 'Daily Stats', 'L.setState({ year: arg }); await new Promise((go) => setTimeout(go, 600));', PM.y);
    done.push(['dstats', await check(s, lab, 'الإحصائيات اليومية · فتح الشهر الماضي', { open: () => dbl(p, MONTHS[PM.m - 1]), title: 'فتح شهر ' + MONTHS[PM.m - 1] })]);

    /* الخطة التشغيلية: الشهرُ الماضي ⇒ نقرةٌ مزدوجة ⇒ «فتح … بأثر رجعي» */
    await at('#/plan', 'Operational Plan');
    done.push(['plan', await check(s, lab, 'الخطة التشغيلية · فتح الشهر الماضي', { open: () => dbl(p, MONTHS[PM.m - 1]), title: 'فتح شهر ' + MONTHS[PM.m - 1] })]);

    /* المتابعة اليومية: يومٌ ماضٍ ⇒ نافذةُ فتح اليوم (retroAsk — ما تضعه النقرةُ المزدوجة على اليوم) */
    await s.go('#/daily/rounds', 5000);
    done.push(['daily', await check(s, lab, 'المتابعة اليومية · فتح يومٍ ماضٍ', {
      open: () => L(p, 'Daily Sessions', 'L.setState({ year: arg.y, month: arg.m, day: 10 }, () => L.setState({ retroAsk: { m: arg.m, d: 10, open: true } })); await new Promise((go) => setTimeout(go, 800));', PM),
      title: 'بأثر رجعي' })]);

    /* الإرشاد والمضبوطات: فتحُ الفترة المغلقة للاستدراك (مدخلُ النقرة المزدوجة على الشهر) ⇒ «فتح الفترة للاستدراك» ⇒ /api/retro */
    for (const [hash, name, fn] of [['#/irshad/records', 'Irshad', '_irRetroToggle'], ['#/seized/records', 'Seized', '_szRetroToggle']]) {
      await s.go(hash, 6000);
      done.push([name, await check(s, lab, name + ' · فتح الفترة للاستدراك', { open: () => { L(p, name, 'L.' + fn + '(arg);', { y: PM.y, m: PM.m }).catch(() => null); return p.waitForTimeout(800); }, title: 'فتح الفترة للاستدراك' })]);
    }

    /* الموظفون: حذفُ موظف ⇒ نافذةُ تأكيد الحذف ⇒ /api/employees/transition */
    await s.go('#/employees', 6000);
    const n0 = (kv(lab, K('bassam_employees_v1')) || []).length;
    done.push(['employees', await check(s, lab, 'الموظفون · حذف موظف', {
      open: async () => { await L(p, 'Employees', 'const i = (L.state.employees || []).findIndex((e) => e && e.eid !== "TEST_ONLY_eA1"); await L._empDeleteOpen([i], false);'); await p.waitForTimeout(800); },
      title: 'حذف', key: K('bassam_employees_v1'), changed: (a) => (a || []).length === n0 - 1 })]);

    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    console.log('NOREASON_UI ' + JSON.stringify(done.map(([k, r]) => [k, r.ok, r.posts.length])));
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

/* ما بقي من مسارات «رفضٌ لنقص السبب ⇒ نافذةُ السبب» في العميل (590 الموظفون · الإرشاد · المضبوطات/الجائزة · 548 · الإدارة · الاستيراد التاريخي)
   لا يبلغه الخادمُ الحالي — فيُحاكى ردُّ خادمٍ قديم (403 why:reason) على طلب حذف الموظف: لا تظهر نافذةُ سبب ولا حقل، ولا يُعاد الطلبُ بسبب،
   ويُقال رفضٌ عاديّ. قبل الإصلاح كان 590 يفتح نافذةَ السبب (askReason ⇒ «هذا الإجراء يتطلب سبباً» بحقلٍ نصّي) ثم يعيد الإرسال بالسبب. */
test('noreason: ردُّ خادمٍ قديم why:reason على حذف موظف لا يفتح نافذةَ سبب ولا يعيد الإرسال بسبب', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(20000);
    const sent = [];
    await p.route('**/api/employees/transition', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      sent.push(route.request().postData() || '');
      return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ ok: 0, err: 'denied', why: 'reason', reasonKeys: ['emp.record.bulk.delete'] }) });
    });
    await s.go('#/employees', 6000);
    const n0 = (kv(lab, K('bassam_employees_v1')) || []).length;
    await L(p, 'Employees', 'const i = (L.state.employees || []).findIndex((e) => e && e.eid !== "TEST_ONLY_eA1"); await L._empDeleteOpen([i], false);'); await p.waitForTimeout(800);
    const dlg = await until(() => dialogOf(p, 'حذف'), 'نافذةُ تأكيد الحذف');
    assert.deepEqual(dlg.fields, [], 'لا حقلَ سبب في نافذة التأكيد');
    assert.ok(await clickOk(p, 'حذف'), 'زرُّ التأكيد');
    await until(() => sent.length >= 1, 'طلبُ الحذف أُرسل');
    await p.waitForTimeout(3000);
    const body = await p.evaluate(() => document.body.innerText);
    for (const t of REASON_TEXT) assert.ok(!body.includes(t), 'لا نافذةَ سبب بعد ردّ why:reason: ' + t);
    assert.equal(await p.locator('textarea:visible').count(), 0, 'لا حقلَ سبب');
    assert.equal(sent.length, 1, 'لا إعادةَ إرسالٍ بسبب');
    assert.equal(Object.hasOwn(JSON.parse(sent[0]), 'reason'), false, 'الطلبُ بلا حقل reason');
    assert.equal((kv(lab, K('bassam_employees_v1')) || []).length, n0, 'لم يُحذف شيء (الردُّ رفض)');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
