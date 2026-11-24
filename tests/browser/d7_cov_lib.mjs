/* V7 · د7 (ج ١٥ — «ما لم تغطّه أدوات الفحص»): عُدّةٌ مشتركة لاختبارات التغطية في المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY · بلا شبكة).
   world()   — المختبر بسقفٍ كامل لكل الوحدات (كلُّ الأنظمة مفعّلة) كما في walkfix وaward_form_refresh
   grant()   — دورٌ TEST_ONLY للموظف empA (TEST_ONLY_eA1) بمستوىً لكل نظام، يحفظه مديرُ المنصة عبر KIVO.Perm44 (طريقُ محرّر الأدوار نفسُه)
   toasts()  — كلُّ نصٍّ ظهر في شريط التنبيه (#bs-toast) منذ التركيب
   ACTORS    — مديرُ الإدارة وموظفٌ بدور: كلُّ اختبارٍ يمرّ عليهما معاً */
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
export { startLab, LAB, chromium, openAs };

export const A = 'TEST_ONLY_A', EKEY = 'TEST_ONLY_eA1', ROLE_ID = 'TEST_ONLY_d7_cov_role';
export const FULL = ['dstats', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin', 'emps'];
export const ACTORS = [{ who: 'مدير الإدارة', un: LAB.mgrA }, { who: 'موظف بدور', un: LAB.empA }];
/* نصٌّ عربيٌّ واضح: حروفٌ عربية وفيه كلمةُ رفضٍ أو منع (لا رمزٌ تقنيٌّ وحده) */
export const AR_REFUSAL = /صلاحيت|خارج نطاق|لا تملك|لا يمكن|لم يُ|لم ي|مقفل|مغلق|رفض|غير متاح|لا يحق|ممنوع|تعذّر/;
export const isArabicRefusal = (t) => /[ء-ي]{3}/.test(String(t || '')) && AR_REFUSAL.test(String(t || ''));

const log0 = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('{"v":1,"t":')) return; log0(...a); };   /* سجلُّ طلبات العامل يُسكَت */

export const kv = (lab, k) => { const r = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : null; };
export async function put(lab, k, v) {
  const DB = lab.env.DB;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)), DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
}
export async function world(opts = {}) {
  const lab = await startLab(opts);
  const P = kv(lab, 'bassam_perms_v1'); for (const d of Object.keys(P.caps)) P.caps[d] = FULL;
  await put(lab, 'bassam_perms_v1', P);
  return lab;
}
/* sys: { seized: 'input', award: 'edit', … } — المستوى من مستويات محرّر الأدوار (view · input · edit · full · sensitive) */
export async function grant(b, lab, sys, ekey = EKEY) {
  const su = await openAs(b, lab, LAB.superUn, LAB.superPw); await su.go('#/admin', 3000);
  const r = await su.page.evaluate(async ([d, sys, ekey, id]) => {
    const E = KIVO.Perm44, dr = E.draft(d), rec = E.rolesOf(d), s = {};
    Object.keys(sys).forEach((k) => { s[k] = { lvl: sys[k] }; });
    rec.roles = rec.roles.filter((x) => x.id !== id).concat([{ id, name: 'TEST_ONLY دور التغطية', sys: s }]);
    rec.people[ekey] = { role: id, ex: [] };
    const x = E.setRoles(dr, d, rec); if (!x.ok) return x; return E.commit(dr);
  }, [A, sys, ekey, ROLE_ID]);
  await lab.idle(); await su.ctx.close();
  if (!r || !r.ok) throw new Error('role not saved: ' + JSON.stringify(r));
  return r;
}
/* يُركَّب في الصفحة الحالية وفي كل تحميلٍ بعدها (addInitScript) — فلا يضيع بإعادة التحميل */
const TOASTS = () => {
  if (window.__toastsOn) return; window.__toastsOn = 1; window.__toasts = window.__toasts || [];
  const take = () => { const t = document.getElementById('bs-toast'); const x = t && t.textContent && t.textContent.trim(); if (x && window.__toasts[window.__toasts.length - 1] !== x) window.__toasts.push(x); };
  const go = () => new MutationObserver(take).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  if (document.documentElement) go(); else document.addEventListener('DOMContentLoaded', go);
};
export const toasts = async (s) => { await s.page.addInitScript(TOASTS); await s.page.evaluate(TOASTS); };
export const seen = (s) => s.page.evaluate(() => window.__toasts || []);
export const mainText = (p) => p.evaluate(() => (document.querySelector('main') || document.body).innerText);
/* الأرقامُ تُعرض هنديةً مع علامات اتجاه — تُطبَّع قبل المطابقة */
export const norm = (x) => String(x || '').replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\s+/g, ' ').trim();
export const until = async (fn, what, ms = 20000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 200)); } };
export async function reloadAt(s, hash, ms = 4500) {
  await s.page.evaluate((h) => { location.hash = h; }, hash);
  await s.page.reload({ waitUntil: 'domcontentloaded' });
  await s.page.waitForSelector('aside.bsb nav.s-nav', { timeout: 30000 });
  await s.page.waitForTimeout(ms);
}
/* ردودُ الخادم المرفوضة (≥400) على مسارٍ منذ التركيب */
export function refusals(s, rx) { const out = []; s.page.on('response', async (r) => { if (r.status() >= 400 && rx.test(new URL(r.url()).pathname)) { let t = ''; try { t = (await r.text()).slice(0, 300); } catch (e) { /* بلا جسم */ } out.push(r.status() + ' ' + new URL(r.url()).pathname + ' ' + t); } }); return out; }
/* منطقُ الصفحة نفسُه (مثيلُ المكوّن عبر ليف React لمضيفها) — لطلب فعلٍ لا يعرضه زرٌّ لمن لا يملك مفتاحه */
export const logicOf = (name) => `(() => { const host = document.querySelector('.sc-host[data-sc-name="${name}"]'); if (!host) return null; const key = Object.keys(host).find((k) => k.startsWith('__reactFiber$')); let f = host[key]; while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic.state)) f = f.return; return f ? f.stateNode.logic : null; })()`;
/* صورةُ PNG صغيرة مولَّدة (TEST_ONLY) — للتوقيع والصورة في النماذج */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
export function png(w = 120, h = 60, rgb = [30, 60, 120]) {
  const crc = (b) => { let c, n, k; const t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd7cov-')), 'TEST_ONLY.png');
  fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  return f;
}
/* المتصفحُ بلغةٍ UTF-8: بـLANG فارغ يستبدل Chromium الآلي اسمَ أيِّ تنزيلٍ غيرِ لاتيني بـ«download» بلا امتداد (انظر v7_port_print) — وهذا من
   بيئة المختبر لا من المنتج؛ مجموعةُ uifix تتحقّق منه في Chrome الحقيقي (BassamXLSX.download) */
export const launchUtf8 = () => chromium.launch({ env: Object.assign({}, process.env, { LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' }) });
/* window.print مُراقَب (لا نافذةَ طباعة في المتصفح الآلي): يعدّ الاستدعاءات — «طباعة / حفظ PDF» في الصفحات الجدولية هي نافذةُ الطباعة نفسُها */
export const watchPrint = (p) => p.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });
export const prints = (p) => p.evaluate(() => window.__prints || 0);
/* يضغط ما يُطلق التنزيل ويعيد اسمَه المقترح وبايتاته */
export async function downloaded(p, click, ms = 30000) {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: ms }), click()]);
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd7dl-')), 'file'); await dl.saveAs(f);
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(f) };
}
/* ملفٌّ بالامتداد الصحيح ومحتوًى غيرِ فارغ يطابق نوعَه: xlsx = حزمةُ ZIP فيها ورقةٌ · csv = BOM + سطرُ عناوين وسطرٌ على الأقل · pdf = %PDF- */
export function fileOk(f, ext) {
  const out = [];
  if (!new RegExp('\\.' + ext + '$', 'i').test(f.name)) out.push('الامتداد: ' + f.name);
  if (!f.bytes.length) out.push('ملفٌّ فارغ');
  if (ext === 'xlsx' && !(f.bytes[0] === 0x50 && f.bytes[1] === 0x4b && f.bytes.includes(Buffer.from('xl/worksheets/sheet1.xml')))) out.push('ليس مصنّف xlsx');
  if (ext === 'xlsx' && (f.bytes.toString('utf8').match(/<row[ >]/g) || []).length < 2) out.push('مصنّفٌ بلا صفوف بيانات (العناوينُ وحدها)');   /* zipStored: الأوراقُ غيرُ مضغوطة */
  if (ext === 'csv' && !(f.bytes.toString('utf8').replace(/^﻿/, '').split('\n').filter(Boolean).length >= 2)) out.push('CSV بلا صفوف');
  if (ext === 'pdf' && f.bytes.slice(0, 5).toString() !== '%PDF-') out.push('ليس PDF');
  return out;
}
/* «ملفات» ← «تصدير Excel» (تنزيلٌ يُفحص) ثم «ملفات» ← «طباعة / حفظ PDF» (نافذةُ الطباعة) — الشريطُ نفسُه في المهام والجدول الشهري والمضبوطات */
/* V7 · 53: الجدولُ وشريطُه أسفل الصفحة يُرسمان عند التمرير إليهما — يُمرَّر كلُّ ما يتمرّر إلى آخره قبل البحث عن «ملفات» (ومثلُه قبل فحص غيابه) */
export async function revealAll(p) {
  for (let i = 0; i < 3; i++) { await p.evaluate(() => { document.querySelectorAll('main, main *').forEach((e) => { if (e.scrollHeight > e.clientHeight + 50) e.scrollTop = e.scrollHeight; }); window.scrollTo(0, document.body.scrollHeight); }); await p.waitForTimeout(700); }
}
export async function filesMenu(p, who) {
  await revealAll(p);
  const files = () => p.locator('main button:visible', { hasText: /^\s*ملفات\s*$/ }).first();
  await files().click();
  const f = await downloaded(p, () => p.getByText('تصدير Excel', { exact: true }).first().click());
  const bad = fileOk(f, 'xlsx');
  await watchPrint(p);
  await files().click();
  await p.getByText('طباعة / حفظ PDF', { exact: true }).first().click();
  await until(async () => (await prints(p)) === 1, who + ': نافذةُ الطباعة (حفظ PDF)');
  return { f, bad };
}
