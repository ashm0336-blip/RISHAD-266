/* RISHAD CORE-02 step 3 — sensitive actions in «مركز إدارة رشاد», through the real UI (lab: TEST_ONLY data, no network).
   As the platform administrator:
     (1) each sensitive action opens the one confirmation dialog (KIVO.bsConfirm), and «إلغاء» sends nothing and changes no record:
         end all other sessions, save the security policies, freeze an account, delete a unit manager, platform-wide broadcast;
     (2) the recovery-key dialog, once the key is shown, stays open on Escape and on a click outside it, and closes only on
         «حفظته في مكان آمن»;
     (3) «التهيئة والاستعادة» step 1 runs the real full-backup export: cancelling its password dialog keeps step 1; after the file
         is downloaded the limit of browser verification is stated, «متابعة» is refused until «تأكدت من حفظ ملف النسخة» is ticked,
         and only then step 2 opens; no reset request is ever sent;
     (4) zero page errors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

/* the lab world as on Test (see core02_admin_functions): the permission lens upgrade mark is already set */
async function world() {
  const lab = await startLab(); const { env, W } = lab, DB = env.DB;
  const pm = JSON.parse(DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1').map((r) => r.v).join(''));
  pm.lensZ = 1;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
  lab.revs = () => JSON.stringify(DB.q("SELECT k,rev FROM revs WHERE k<>'bassam_notifications_domain_v1' ORDER BY k"));
  return lab;
}
function watchWrites(page, out) {
  page.on('request', (r) => {
    if (['GET', 'HEAD'].includes(r.method())) return;
    const p = new URL(r.url()).pathname; let j = null; try { j = JSON.parse(r.postData() || 'null'); } catch (e) { j = { unparsable: 1 }; }
    if (p === '/api/login') return;
    if (p === '/api/save' && j && !Object.keys(j.set || {}).length && !(j.del || []).length) return;
    if (p === '/api/notifications/act' && j && (j.op === 'security-poll' || j.op === 'targets')) return;
    out.push(r.method() + ' ' + p + ' ' + JSON.stringify(j).slice(0, 120));
  });
}
const main = (page) => page.locator('main.bs-main');
async function cancelDialog(page, label, title) {
  await page.waitForSelector('#bsCfmNo', { state: 'visible', timeout: 8000 }).catch(() => { throw new Error(label + ': no confirmation dialog'); });
  if (title) assert.ok((await page.locator('#bsCfmOk').locator('xpath=ancestor::*[@role="alertdialog" or @role="dialog"][1]').innerText()).includes(title), label + ': the dialog names the action');
  await page.locator('#bsCfmNo').click(); await page.waitForTimeout(900);
  assert.equal(await page.locator('#bsCfmNo').count(), 0, label + ': the dialog closed');
}

test('CORE-02 step 3: sensitive actions ask first, the recovery key dialog holds, the reset backup step is real', { timeout: 600000 }, async () => {
  const b = await chromium.launch(); const lab = await world(); const writes = []; let s = null;
  try {
    s = await openAs(b, lab, LAB.superUn, LAB.superPw, { context: { acceptDownloads: true }, onPage: (p) => watchWrites(p, writes) });
    const { page } = s; page.setDefaultTimeout(15000);
    const before = lab.revs();

    /* (1) cancel each sensitive action: nothing is sent, no record changes */
    await s.go('#/sysadmin/sec', 4500);
    await main(page).getByRole('button', { name: 'إنهاء كل الجلسات عدا جلستي' }).click();
    await cancelDialog(page, 'end all other sessions', 'إنهاء كل الجلسات الأخرى');
    await main(page).getByRole('button', { name: 'حفظ السياسات' }).click();
    await cancelDialog(page, 'save the security policies', 'حفظ سياسات الأمن');

    await s.go('#/sysadmin/users', 4500);
    const row = main(page).locator('div', { has: page.getByText('TEST_ONLY موظف أ', { exact: true }) }).filter({ has: page.locator('[title="أفعال هذا الحساب"]') }).last();
    await row.locator('[title="أفعال هذا الحساب"]').click(); await page.waitForTimeout(600);
    await row.locator('[data-bs-dd]').getByText('تجميد الحساب', { exact: true }).click();
    await cancelDialog(page, 'freeze an account', 'تجميد الحساب');

    await s.go('#/sysadmin/depts', 4500);
    /* the first unit is selected on opening; its managers panel lists TEST_ONLY مدير أ */
    await main(page).locator('.mk button.dz[title="حذف حساب المدير — تبقى الإدارة وبياناتها"]').first().click();
    await cancelDialog(page, 'delete a unit manager', 'حذف حساب المدير');

    await s.go('#/sysadmin/plat', 3500);
    await main(page).locator('[role=tab]', { hasText: 'التنبيهات والتعاميم' }).first().click(); await page.waitForTimeout(2500);
    await main(page).getByText('تعميم جديد', { exact: true }).click(); await page.waitForTimeout(1200);
    await main(page).locator('[data-nf-bc="title"]').fill('TEST_ONLY تعميم'); await main(page).locator('[data-nf-bc="body"]').fill('TEST_ONLY نص التعميم');
    await page.waitForTimeout(2500);
    await main(page).locator('[data-nf-bc="send"]').click();
    await cancelDialog(page, 'platform-wide broadcast', 'تعميم على كل المنصة');

    assert.deepEqual(writes, [], 'cancelling sent nothing');
    assert.equal(lab.revs(), before, 'cancelling changed no stored record');

    /* (2) recovery key dialog */
    await main(page).locator('[role=tab]', { hasText: 'التهيئة والاستعادة' }).first().click(); await page.waitForTimeout(2500);
    await main(page).getByRole('button', { name: /إنشاء مفتاح/ }).first().click();
    const dlg = page.locator('[role=dialog][aria-label="مفتاح الاستعادة"]');
    await dlg.locator('input[type=password]').fill(LAB.superPw);
    await dlg.getByRole('button', { name: 'إنشاء المفتاح' }).click();
    await dlg.locator('.key').waitFor({ state: 'visible', timeout: 15000 });
    const key = (await dlg.locator('.key').innerText()).trim(); assert.ok(key.length >= 8, 'the key is shown');
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    assert.equal(await dlg.locator('.key').count(), 1, 'Escape does not close it once the key is shown');
    await page.mouse.click(8, 8); await page.waitForTimeout(600);
    assert.equal(await dlg.locator('.key').count(), 1, 'a click outside does not close it');
    assert.match(await dlg.innerText(), /لا يظهر مرة أخرى/, 'it says why');
    await dlg.getByRole('button', { name: 'حفظته في مكان آمن' }).click(); await page.waitForTimeout(600);
    assert.equal(await dlg.count(), 0, '«حفظته في مكان آمن» closes it');

    /* (3) reset step 1: the real export, cancel keeps step 1; download + acknowledgement opens step 2 */
    const step = main(page).getByRole('button', { name: 'تنزيل نسخة كاملة والمتابعة' });
    await step.click();
    await page.getByRole('button', { name: 'تشفير وتنزيل' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('button', { name: 'إلغاء', exact: true }).last().click(); await page.waitForTimeout(900);
    assert.match(await main(page).innerText(), /لم تكتمل النسخة الكاملة، فبقيت في هذه الخطوة/, 'cancel: a plain message');
    assert.equal(await main(page).getByText('إبقاء هوية المنصة (الاسم والشعار والنصوص)').count(), 0, 'cancel: still step 1');
    await step.click();
    await page.getByRole('button', { name: 'تشفير وتنزيل' }).waitFor({ state: 'visible', timeout: 30000 });
    const pw = page.locator('#bsPwD1'); await pw.fill('TEST_ONLY_pass1'); await page.getByLabel('تأكيد كلمة المرور', { exact: true }).fill('TEST_ONLY_pass1');
    const dl = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'تشفير وتنزيل' }).click();
    await dl;   /* the browser received the file (headless Chromium does not keep the suggested name of a revoked blob URL) */
    await main(page).getByText('تأكدت من حفظ ملف النسخة').waitFor({ state: 'visible', timeout: 10000 });
    const txt = await main(page).innerText();
    assert.match(txt, /سلّم المتصفح ملف النسخة للتنزيل: نسخة-شاملة-كل-الإدارات-\d{4}-\d{2}-\d{2}\.json/, 'the downloaded file is named'); assert.match(txt, /لا يستطيع المتصفح التأكد من أن الملف حُفظ فعلاً على جهازك/);
    const next = main(page).getByRole('button', { name: 'متابعة إلى «ماذا يبقى؟»' });
    await next.click(); await page.waitForTimeout(700);
    assert.match(await main(page).innerText(), /أكّد أولاً أنك وجدت ملف النسخة محفوظاً على جهازك/);
    assert.equal(await main(page).getByText('إبقاء هوية المنصة (الاسم والشعار والنصوص)').count(), 0, 'no acknowledgement: still step 1');
    await main(page).getByLabel('تأكدت من حفظ ملف النسخة').check(); await next.click(); await page.waitForTimeout(900);
    assert.equal(await main(page).getByText('إبقاء هوية المنصة (الاسم والشعار والنصوص)').count(), 1, 'download + acknowledgement: step 2');

    assert.ok(!writes.some((w) => /\/api\/reset/.test(w)), 'no reset request');
    /* the only writes: creating the recovery key, and the existing export's own «last full backup» stamp (unchanged behaviour) */
    assert.deepEqual(writes.filter((w) => !/^POST \/api\/recovery\/new /.test(w) && !/^POST \/api\/save \{"set":\{"bassam_last_full_export_v1":"[^"]+"\},"del":\[\]/.test(w)), [], 'nothing else was written');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); await b.close(); }
});
