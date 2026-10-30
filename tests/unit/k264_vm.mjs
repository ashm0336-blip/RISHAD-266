/* KIVO_264 · عُدّةُ اختبار طبقة البيانات في الواجهة (§2 من التكليف — المعماريةُ السحابية): تشغيلُ كتل الواجهة الحقيقية
   (src/api/280-server-storage.js وما بعدها: 310 · 320 · 330 · 332 …) داخل node:vm، وكائنُ vm العامُّ هو window كما في المتصفح،
   وfetch يذهب إلى العامل الحقيقي (harness.mjs: _worker.js فوق D1 البديل) أو إلى خادمٍ وهميٍّ يكتبه الاختبار — بجرّة كوكي مشتركة
   (= ملفُّ متصفحٍ واحد: كلُّ تبويباته تشترك فيها). wait=1 يُنزع من /api/changes فيعود الانتظارُ الطويل فوراً (يغيّر الزمنَ لا المفاتيح).
   مأخوذةٌ من أدلة التدقيق (scratchpad/k264/arch/vmclient.mjs) بلا تغييرٍ في الحكم — مع: موقعٌ قابلٌ للضبط (http · file · localhost)،
   ومخزنُ جلسةٍ لكل تبويب، ومخزنٌ أصليٌّ مشترك بين التبويبات بأحداث storage (shareNative)، وسجلٌّ للعناوين كما طُلبت. */
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, blockFile, ROOT } from './harness.mjs';

export class FakeStorage {
  constructor() { this._m = new Map(); }
  getItem(k) { k = String(k); return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(String(k), String(v)); }
  removeItem(k) { this._m.delete(String(k)); }
  clear() { this._m.clear(); }
  key(i) { const a = [...this._m.keys()]; return i >= 0 && i < a.length ? a[i] : null; }
  get length() { return this._m.size; }
}
function el(tag) {
  const e = { tagName: String(tag || 'div').toUpperCase(), style: {}, dataset: {}, children: [], attrs: {}, listeners: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    setAttribute(k, v) { e.attrs[k] = String(v); }, getAttribute(k) { return k in e.attrs ? e.attrs[k] : null; }, removeAttribute(k) { delete e.attrs[k]; },
    addEventListener(t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); }, removeEventListener() {},
    appendChild(c) { e.children.push(c); c.parentNode = e; return c; }, insertBefore(c) { e.children.unshift(c); c.parentNode = e; return c; },
    removeChild(c) { e.children = e.children.filter(x => x !== c); c.parentNode = null; return c; }, querySelector() { return el(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { bottom: 0, top: 0, left: 0, right: 0, width: 0, height: 0 }; }, focus() {}, remove() { if (e.parentNode) e.parentNode.removeChild(e); },
    set innerHTML(v) { e._html = String(v); }, get innerHTML() { return e._html || ''; }, set textContent(v) { e._text = String(v); }, get textContent() { return (e._text || '') + (e._html || '').replace(/<[^>]*>/g, ''); } };
  return e;
}
/* كلُّ نصٍّ ظاهرٍ في الصفحة الوهمية (للتحقق من رسائل الواجهة) */
export function pageText(W) {
  const out = []; const walk = (n) => { if (!n) return; out.push(n.textContent || ''); (n.children || []).forEach(walk); };
  walk(W.document.documentElement); walk(W.document.body); return out.join(' \n ');
}

/* href: عنوانُ الصفحة (http://x/ افتراضاً = أصلٌ سحابي) · boot: undefined ⇒ لا يُضبط · null ⇒ يُحذف · blocks: الكتلُ بالترتيب */
export function loadClient({ C, boot, jar = { cookie: '' }, blocks = ['280-server-storage.js'], log = [], href = 'http://x/', native, session } = {}) {
  const timers = new Set();
  const listeners = Object.create(null);
  const net = { down: false };
  const urls = [];
  const W = {};
  W.window = W; W.self = W; W.globalThis = W;
  /* مبنيّاتُ ECMAScript (Object · Array · JSON · Promise …) من سياق vm نفسه — لا تُستبدل؛ وواجهاتُ المضيف وحدها تُعطى هنا */
  W.console = { log() {}, warn() {}, info() {}, debug() {}, error(...a) { log.push('console.error ' + a.map(String).join(' ')); } };
  W.crypto = globalThis.crypto; W.TextEncoder = TextEncoder; W.TextDecoder = TextDecoder; W.URL = URL; W.Blob = Blob;
  W.setTimeout = (f, ms, ...a) => { const t = setTimeout(() => { timers.delete(t); try { f(...a); } catch (e) { log.push('timer-throw ' + e.message); } }, ms); timers.add(t); return t; };
  W.clearTimeout = (t) => { clearTimeout(t); timers.delete(t); };
  W.setInterval = (f, ms) => { const t = setInterval(() => { try { f(); } catch (e) {} }, ms); timers.add(t); return t; };
  W.clearInterval = (t) => { clearInterval(t); timers.delete(t); };
  W.addEventListener = (t, f) => { (listeners[t] = listeners[t] || []).push(f); };
  W.removeEventListener = (t, f) => { listeners[t] = (listeners[t] || []).filter(x => x !== f); };
  W.dispatchEvent = (ev) => { (listeners[ev.type] || []).slice().forEach(f => { try { f(ev); } catch (e) {} }); return true; };
  W.Event = Event; W.CustomEvent = CustomEvent;
  W.StorageEvent = class StorageEvent extends Event { constructor(t, o) { super(t); this.key = o && o.key != null ? o.key : null; } };
  W.Storage = FakeStorage;
  W.localStorage = native || new FakeStorage();
  W.sessionStorage = session || new FakeStorage();
  W.navigator = { onLine: true, userAgent: 'node-vm', sendBeacon: (u, b) => { log.push('beacon ' + u); W.fetch(u, { method: 'POST', body: b }); return true; } };
  const U = new URL(href);
  W.location = { href: U.href, protocol: U.protocol, hostname: U.hostname, host: U.host, origin: U.origin, pathname: U.pathname, search: '', hash: '',
    reload() { log.push('reload'); }, replace(u) { log.push('replace ' + u); } };
  const docEl = el('html'); const body = el('body'); const head = el('head');
  W.document = { hidden: false, documentElement: docEl, body, head, readyState: 'complete', createElement: (t) => el(t), getElementById: () => null, querySelector: () => null,
    querySelectorAll: () => [], addEventListener() {}, removeEventListener() {} };
  W.fetch = async (url, init = {}) => {
    urls.push({ method: init.method || 'GET', url: String(url), body: init.body && typeof init.body === 'string' ? init.body : null });
    const p = String(url).replace(/([?&])wait=1(&|$)/, '$1').replace(/[?&]$/, '');
    log.push((init.method || 'GET') + ' ' + p.split('?')[0]);
    if (net.down) throw new TypeError('Failed to fetch');
    let body = init.body;
    if (body && typeof body !== 'string') body = await body.text();
    return C.req(p, { method: init.method || 'GET', cookie: jar.cookie, body });
  };
  if (boot !== undefined) W.__BS_BOOT = boot === null ? undefined : JSON.parse(JSON.stringify(boot));
  const ctx = vm.createContext(W);
  vm.runInContext(fs.readFileSync(blockFile('005-kivo-ns.js'), 'utf8'), ctx, { filename: '005-kivo-ns.js' });
  const T = {
    W, ctx, net, log, urls, jar,
    run: (names) => { for (const b of names) vm.runInContext(fs.readFileSync(blockFile(b), 'utf8'), ctx, { filename: b }); return T; },
    nativeLS: () => Object.fromEntries(W.localStorage._m),   /* مخزنُ المتصفح الحقيقي (ما يبقى على الجهاز) */
    get: (k) => W.localStorage.getItem(k),                   /* مسارُ القراءة في التطبيق (Storage.prototype كما رقّعته 280/320) */
    set: (k, v) => W.localStorage.setItem(k, v),
    saves: () => urls.filter(u => u.method === 'POST' && /\/api\/save/.test(u.url)),
    dispose: () => { for (const t of timers) { clearTimeout(t); clearInterval(t); } timers.clear(); W.document.hidden = true; }
  };
  T.run(blocks);
  return T;
}
/* تبويباتُ متصفحٍ واحد: مخزنٌ أصليٌّ واحد خلفها، وكلُّ كتابةٍ أصليةٍ في تبويب تُطلق حدثَ storage في التبويبات الأخرى وحدها (كما في المتصفحات) */
export function shareNative(tabs) {
  const shared = tabs[0].W.localStorage._m;
  for (const t of tabs) t.W.localStorage._m = shared;
  if (!shared.__wrapped) {
    const set0 = shared.set.bind(shared), del0 = shared.delete.bind(shared);
    shared.__tabs = tabs;
    shared.set = (k, v) => { const r = set0(k, v); for (const o of shared.__tabs) if (o !== shared.__writer) o.W.dispatchEvent(new o.W.StorageEvent('storage', { key: k })); return r; };
    shared.delete = (k) => { const r = del0(k); for (const o of shared.__tabs) if (o !== shared.__writer) o.W.dispatchEvent(new o.W.StorageEvent('storage', { key: k })); return r; };
    shared.__wrapped = true;
  } else shared.__tabs = tabs;
  return shared;
}
/* الكتابةُ الأصلية من تبويبٍ بعينه (يُستثنى من حدث storage كما في المتصفح) */
export function asWriter(shared, tab, fn) { shared.__writer = tab; try { return fn(); } finally { shared.__writer = null; } }
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export async function until(fn, ms = 6000, step = 50) { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await fn(); } catch (e) { v = false; } if (v) return v; await sleep(step); } return false; }

/* اليومُ الهجريّ للخادم (أم القرى · الرياض بمهلة ٣ ساعات) — كما يولّده المُثبِّت (tests/fixtures/gen_fixture.py) */
export const TODAY = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); return o; })();
let FX = null;
export function fixture() {
  if (FX) return FX;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', TODAY.year + '-' + TODAY.month + '-' + TODAY.day, '--out', out], { stdio: 'pipe' });
  FX = { json: JSON.parse(fs.readFileSync(path.join(out, 'fixture.json'), 'utf8')), seed: fs.readFileSync(path.join(out, 'test_seed.sql'), 'utf8') };
  try { fs.rmSync(out, { recursive: true, force: true }); } catch (e) {}
  return FX;
}
export const cp = (o) => JSON.parse(JSON.stringify(o));
