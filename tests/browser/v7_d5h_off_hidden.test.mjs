/* V7 · د5-ح (قرار المالك) — النظامُ المطفأ لا يراه أحد، ولا مديرُ المنصة، في المختبر المعزول (TEST_ONLY، بلا شبكة):
   · مطفأٌ على المنصة كلها (bassam_platform_v1.mods.off) ⇒ غائبٌ لمدير المنصة في كل إدارة: القائمةُ الجانبية · العنوانُ المباشر · مصدرُ القائمة (visiblePages · can).
   · مطفأٌ في سقف إدارة ⇒ غائبٌ لمدير المنصة داخل مساحتها (الإدارةُ النشطة) وحاضرٌ في إدارةٍ أخرى مفعّلٌ فيها.
   · لا عرضَ باهتاً بنقطة «خارج السقف» (.n.out) في أي حال.
   · موضعُه الوحيد «الصلاحيات ← الأنظمة» لمدير المنصة (بمفتاحه ليعيد تشغيله).
   · الصلاحياتُ لا تتغيّر لمدير المنصة فيما سوى ذلك: الخادمُ يجيبه عن بيانات النظام المطفأ كما كان (لا يُحجب الوصولُ للنسخ والاستعادة). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', G = 'TEST_ONLY_G';
async function put(lab, k, v) {
  const DB = lab.env.DB;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)), DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
}
const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'award'];   /* «جائزة التميز» في كل سقف — فغيابُها من إطفاء المنصة وحده */
/* ما تُظهره الواجهةُ لمفتاح صفحة: رابطُ القائمة الجانبية ظاهرٌ؟ · مصدرُ القائمة · can */
const seen = (p, k) => p.evaluate((k) => {
  const a = [...document.querySelectorAll('aside.bsb nav.s-nav a.n')].find((x) => x.dataset.key === k || (KIVO.BassamPerm.PAGE_REG.find((r) => r.key === k) || {}).name === x.title);
  return { dom: !!a && !a.classList.contains('gone') && a.offsetParent !== null, vis: KIVO.BassamPerm.visiblePages().includes(k), can: KIVO.BassamPerm.can(k, 'view') };
}, k);
async function inDept(s, d) {
  await s.page.evaluate((d) => KIVO.BassamDepts.setActive(d), d);
  await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForSelector('aside.bsb nav.s-nav', { timeout: 30000 }); await s.page.waitForTimeout(2000);
  await s.go('#/profile', 1500);
}

test('V7 · د5-ح · an OFF system is visible to nobody, not even the platform admin — platform-wide, and inside the department where it is OFF', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    /* «جائزة التميز» (award) مطفأةٌ على المنصة · «الإحصائيات اليومية» (dstats) مطفأةٌ في سقف إدارة أ وحدها */
    await put(lab, 'bassam_perms_v1', { caps: { [G]: cap, [A]: cap.filter((k) => k !== 'dstats'), [B]: cap, TEST_ONLY_A_S1: cap.filter((k) => k !== 'dstats') }, emps: {} });
    await put(lab, 'bassam_platform_v1', { mods: { off: ['award'] } });
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; p.setDefaultTimeout(15000);
    /* in A: both absent */
    await inDept(s, A);
    assert.equal(await p.evaluate(() => KIVO.BassamDepts.active()), A);
    for (const k of ['award', 'dstats']) assert.deepEqual(await seen(p, k), { dom: false, vis: false, can: false }, 'in A, for super: ' + k);
    assert.deepEqual(await seen(p, 'daily'), { dom: true, vis: true, can: true }, 'an ON system stays');
    assert.equal(await p.locator('aside.bsb .n.out').count(), 0, 'no faded «خارج السقف» item');
    const nav = (k) => p.evaluate((k) => '#/' + KIVO.BassamPerm.PERM2NAV[k], k);
    for (const h of [await nav('dstats'), await nav('award')]) {
      await s.go(h, 2000);
      assert.notEqual(await p.evaluate(() => location.hash), h, 'the deep link does not open an OFF system: ' + h);
    }
    /* in B: dstats is ON there ⇒ present; award is OFF on the platform ⇒ still absent */
    await inDept(s, B);
    assert.deepEqual(await seen(p, 'dstats'), { dom: true, vis: true, can: true }, 'in B (ON there): dstats is present for super');
    assert.deepEqual(await seen(p, 'award'), { dom: false, vis: false, can: false }, 'platform-wide OFF: absent in B too');
    const hd = await nav('dstats'); await s.go(hd, 2000);
    assert.equal(await p.evaluate(() => location.hash), hd, 'in B the dstats link opens');
    /* the only place: «الصلاحيات ← الأنظمة» for the platform admin, with its switch */
    await s.go('#/sysadmin/org/' + A + '/perm/systems', 2500);
    const row = (n) => p.locator('main .p44 .p44-row', { hasText: n }).first();
    assert.equal(await row('الإحصائيات اليومية').getAttribute('data-on'), 'false'); assert.equal(await row('الإحصائيات اليومية').locator('button.p44-sw').isDisabled(), false, 'switchable here');
    assert.match(await row('جائزة التميز').innerText(), /مطفأ من المنصة/);
    await p.locator('main .p44 .p44-unit', { hasText: 'المنصة كلها' }).click(); await p.waitForTimeout(300);
    assert.equal(await row('جائزة التميز').locator('button.p44-sw').isDisabled(), false, 'the platform switch turns it back on');
    /* the server: super's access is unchanged (data kept reachable for backup / restore) */
    const r = await s.api('/api/perm44/check?d=' + A + '&role=x&key=task.view');
    assert.equal(r.status, 200, 'super still reads the OFF system\'s unit through the server');
    assert.deepEqual(s.errs.filter((e) => !/ResizeObserver/.test(e)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
