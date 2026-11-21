/* V7 · د5-ح (rmall) — عُدّةُ اختبارات الحدود (src/systems/<نظام>/tests/*_boundary.test.mjs): النظامُ يعمل بغياب أيٍّ من شركائه.
   الشركاءُ من عقده نفسِه (contract.json ← consumes): كلُّ اسمٍ على الناقل «مالك.شيء@N» مالكُه نظام، ونوعُه (قراءة · أمر · مشارك · حدث)
   من عقد مالكه في الشجرة الكاملة (KIVO_FULL_SRC — في نسخة الحذف يضبطه tools/removal_test.py؛ وفي المستودع هو المصدرُ نفسُه).
   تُشغَّل في الشجرة الكاملة (الشركاءُ كلُّهم حاضرون) وفي كل نسخة حذفٍ غاب فيها أحدُ الشركاء (tools/removal_test.py ⑤ حدود · only:<نظام>):
     · busFacts/assertBus — في الصفحة الحقيقية: الاسمُ حاضرٌ على الناقل بحضور مالكه فقط؛ وبغيابه القراءةُ undefined والأمرُ { ok:0, absent:1 }
       (القيمةُ التي تعلنها القاعدة لكل غائب — src/core/060-bus.js — ويبني عليها المستهلكُ سلوكَه المعلن في absent)
     · logicOf/callLogic — منطقُ الصفحة المرسومة نفسُه (مكوّنُها من شجرة React) لتُنادى طرقُ الحفظ كما تناديها أزرارُها
     · saves — طلباتُ /api/save وردودُها: ما أُرسل من مفاتيح وما قبله الخادم — والانتظارُ على الحدث نفسِه لا على مهلةٍ ثابتة
   بيانات TEST_ONLY. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { SYSTEMS, SRC } from '../unit/harness.mjs';

export const FULL = process.env.KIVO_FULL_SRC || SRC;
export const present = (k) => SYSTEMS.includes(k);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const contractOf = (root, k) => { const f = path.join(root, 'systems', k, 'contract.json'); return fs.existsSync(f) ? readJson(f) : null; };
const ALL_SYS = fs.readdirSync(path.join(FULL, 'systems')).filter((k) => fs.existsSync(path.join(FULL, 'systems', k, 'system.json')));

/* شركاءُ النظام من عقده: { owners:[نظام…], bus:[{ name, owner, kind, absent }], owns:{ نظام: [مفاتيحه] } } */
export function partners(sys) {
  const c = contractOf(SRC, sys); assert.ok(c, sys + ': عقدُه حاضر');
  const owners = new Set(), bus = [], owns = {};
  for (const [name, v] of Object.entries(c.consumes || {})) {
    const m = /^(?:perm:|via:)?([a-z]+)(?:\.|$)/.exec(name);
    if (!m || !ALL_SYS.includes(m[1]) || m[1] === sys) continue;
    owners.add(m[1]);
    if (!/@\d+$/.test(name)) continue;
    const oc = contractOf(FULL, m[1]) || {}, P = oc.provides || {};
    const kind = ['read', 'commands', 'participants', 'events'].find((t) => P[t] && name in P[t]) || 'other';
    bus.push({ name, owner: m[1], kind, absent: v.absent });
  }
  for (const o of owners) owns[o] = (contractOf(FULL, o) || {}).owns || [];
  return { owners: [...owners].sort(), bus, owns };
}

/* حقائقُ الناقل في الصفحة: لكل اسمٍ مستهلَك — has، وبغياب مالكه قيمةُ القراءة أو الأمر (لا يُنادى أمرٌ حاضر: لا كتابة) */
export function busFacts(page, list) {
  return page.evaluate((list) => list.map((x) => {
    const B = window.KIVO.bus, has = B.has(x.name); let v = null;
    if (!x.ownerPresent && x.kind === 'read') { const r = B.read(x.name); v = r === undefined ? '__undefined__' : r; }
    if (!x.ownerPresent && x.kind === 'commands') v = B.call(x.name, {});
    return { name: x.name, kind: x.kind, ownerPresent: x.ownerPresent, has, v };
  }), list.map((b) => ({ name: b.name, kind: b.kind, ownerPresent: present(b.owner) })));
}
export function assertBus(facts, sys) {
  for (const f of facts) {
    assert.equal(f.has, f.ownerPresent, sys + ': «' + f.name + '» على الناقل بحضور مالكه فقط (' + JSON.stringify(f) + ')');
    if (f.ownerPresent) continue;
    if (f.kind === 'read') assert.equal(f.v, '__undefined__', sys + ': قراءةُ «' + f.name + '» بغياب مالكها undefined');
    if (f.kind === 'commands') assert.deepEqual(f.v, { ok: 0, absent: 1 }, sys + ': أمرُ «' + f.name + '» بغياب مالكه { ok:0, absent:1 }');
  }
}

/* منطقُ مكوّن الصفحة المرسومة الذي يحمل الطريقة method (من شجرة React تحت main) */
export function logicOf(page, method) {
  return page.waitForFunction((method) => {
    for (const el of document.querySelectorAll('main *')) {
      const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let f = fk ? el[fk] : null;
      while (f && !(f.stateNode && f.stateNode.logic && typeof f.stateNode.logic[method] === 'function')) f = f.return;
      if (f) return true;
    }
    return false;
  }, method, { timeout: 60000 }).then(() => true);
}
export function callLogic(page, method, args) {
  return page.evaluate(async ([method, args]) => {
    for (const el of document.querySelectorAll('main *')) {
      const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let f = fk ? el[fk] : null;
      while (f && !(f.stateNode && f.stateNode.logic && typeof f.stateNode.logic[method] === 'function')) f = f.return;
      if (f) { const L = f.stateNode.logic, r = await L[method].apply(L, args || []); return r === undefined ? '__undefined__' : r; }
    }
    throw Error('no-logic: ' + method);
  }, [method, args || []]);
}
/* قيمةٌ من حالة المنطق نفسه (state) — للانتظار على شرطٍ حقيقي */
export function logicState(page, method, key) {
  return page.evaluate(([method, key]) => {
    for (const el of document.querySelectorAll('main *')) {
      const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let f = fk ? el[fk] : null;
      while (f && !(f.stateNode && f.stateNode.logic && typeof f.stateNode.logic[method] === 'function')) f = f.return;
      if (f) return (f.stateNode.logic.state || {})[key];
    }
    return null;
  }, [method, key]);
}

/* طلباتُ الحفظ: [{ keys, status, ok, err }] — keys بلا بادئة الإدارة */
export function saves(page) {
  const out = [];
  page.on('response', async (r) => {
    if (r.request().method() !== 'POST' || !/\/api\/save\b/.test(r.url())) return;
    let body = {}, j = null; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    try { j = await r.json(); } catch (e) {}
    out.push({ keys: Object.keys(body.set || {}).map((k) => k.replace(/^bsdept:[^:]+:/, '')).sort(), status: r.status(), ok: j && j.ok, err: j && j.err });
  });
  return out;
}
/* ينتظر أن يبلغ عددُ الحفظات n (ردٌّ وصل) — لا مهلةَ ثابتة */
export async function savedCount(page, log, n, ms = 60000) {
  const t0 = Date.now();
  while (log.length < n) { if (Date.now() - t0 > ms) throw Error('لم يصل ردُّ الحفظ ' + n + ' في ' + ms + ' مث — ' + JSON.stringify(log)); await page.waitForTimeout(100); }
  return log[n - 1];
}
/* لا مفتاحَ لنظامٍ غائب في حفظ: كلُّ مفتاحٍ يملكه شريكٌ غائب ممنوع */
export function assertNoAbsentKeys(save, P, sys) {
  const bad = []; for (const o of P.owners) if (!present(o)) for (const k of P.owns[o] || []) if (save.keys.includes(k)) bad.push(o + ':' + k);
  assert.deepEqual(bad, [], sys + ': الحفظُ لا يكتب مفتاحَ شريكٍ غائب (' + JSON.stringify(save) + ')');
}

/* رسائلُ الصفحة (#bs-toast) منذ الآن */
export const watchToasts = (page) => page.evaluate(() => { window.__bdToasts = []; new MutationObserver(() => { const t = document.getElementById('bs-toast'); if (t && t.textContent && window.__bdToasts[window.__bdToasts.length - 1] !== t.textContent) window.__bdToasts.push(t.textContent); }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
export const toasts = (page) => page.evaluate(() => window.__bdToasts || []);
export const waitToast = (page, rx, ms = 30000) => page.waitForFunction((src) => (window.__bdToasts || []).some((t) => new RegExp(src).test(t)), rx.source, { timeout: ms });

/* فتحُ عنوانٍ والانتظارُ حتى تُرسم الصفحةُ فعلاً (نصٌّ في main بلا هيكل تحميل) */
export async function openRoute(s, hash, ms = 60000) {
  await s.page.evaluate((h) => { location.hash = h; }, hash);
  await s.page.waitForFunction(() => { const m = document.querySelector('main'); return !!m && m.innerText.replace(/\s+/g, ' ').length > 40 && !m.querySelector('[data-bs-skeleton], .bs-skel-page'); }, null, { timeout: ms });
}

/* اليومُ الهجري (أم القرى · الرياض) كما تراه الصفحة */
export const today = () => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date()).forEach((p) => { if (p.type !== 'literal') o[p.type] = +p.value; }); return { y: o.year, m: o.month, d: o.day }; };

/* صورةٌ PNG صغيرة حقيقية (لخريطة موقع) */
export function png(name, w, h, rgb) {
  const crc = (b) => { let c, n, k; const t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0).map((_, i) => rgb[i % 3])]), raw = Buffer.concat(Array.from({ length: h }, () => row));
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bd-')), name);
  fs.writeFileSync(f, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  return f;
}
