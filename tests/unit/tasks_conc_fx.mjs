/* KIVO_242_HOTFIX_SR2 · SR-2.3 — عُدّةُ التزامن الحقيقي لاختبارات الوحدة (مأخوذةٌ بتصرّفٍ من مجسّات المراجِع المستقل — round3/scripts/lib23.mjs):
   · تأخيرٌ عشوائيّ عند كل جولة D1 (first/all/run/raw/batch) فتتشابك الطلباتُ المتزامنة داخل الحفظ فعلاً — لا جدولةُ microtask وحدها
   · وسمُ الطلب (who) بـAsyncLocalStorage، وخطّافاتٌ تنفَّذ عند عبارة SQL بعينها لطلبٍ بعينه (تشابكٌ حتميّ)
   · أثرُ كل طلب: G دفعةٌ بحارسٍ كُتبت · L دفعةٌ بحارسٍ سُبقت (تعارض) · r قراءةُ نسخة مفتاح · d دفعةُ رفضٍ أمنيّ وحدها
   · واجهةُ المدير بدلالة 242 (settle في 280-server-storage): نسخةٌ قديمة · merge3 المشحون عند التعارض · base := نسخةُ التعارض
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PNG, operationSaveBody, stored } from './tasks_fx.mjs';

export const als = new AsyncLocalStorage();
export const who = () => (als.getStore() || {}).who || '-';
export const asWho = (w, fn) => als.run({ who: w }, fn);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function merge3Of(workerPath) {
  const dir = path.join(path.dirname(workerPath), 'assets/js'), f = fs.readdirSync(dir).find((n) => /^280-server-storage\.[0-9a-f]{10}\.js$/.test(n));
  const t = fs.readFileSync(path.join(dir, f), 'utf8'), a = t.indexOf('  function isObj(x)'), b = t.indexOf('  /* ── الطابور والإرسال');
  if (!(a > 0 && b > a)) throw new Error('merge3 غيرُ موجود في 280');
  const ctx = {}; vm.runInNewContext(t.slice(a, b) + '\nthis.merge3 = merge3;', ctx); return ctx.merge3;
}

export function instrument(env, opt = {}) {
  const DB = env.DB, P = DB.prepare.bind(DB), B = DB.batch.bind(DB);
  const S = { jitter: opt.jitter == null ? 2 : opt.jitter, hooks: [], trace: {} };
  const delay = () => (S.jitter <= 0 ? new Promise((r) => setImmediate(r)) : sleep(Math.random() * S.jitter));
  const fire = async (sql, kind) => {
    for (const h of S.hooks.slice()) {
      if (h.done || (h.who && h.who !== who()) || (h.kind && h.kind !== kind) || (h.match && !h.match(sql))) continue;
      if (h.nth && ++h.seen < h.nth) continue;
      h.done = !h.repeat; await h.run(sql);
    }
  };
  const tr = (c) => { const w = who(); S.trace[w] = (S.trace[w] || '') + c; };
  DB.prepare = (sql) => {
    const s = P(sql);
    for (const m of ['first', 'all', 'run', 'raw']) { const f = s[m].bind(s); s[m] = async (...a) => { await fire(sql, 'stmt'); await delay(); if (/^SELECT rev FROM revs WHERE k = \?1$/.test(sql)) tr('r'); return f(...a); }; }
    return s;
  };
  DB.batch = async (stmts) => {
    await fire(stmts.map((x) => x.sql).join(' ;; '), 'batch'); await delay();
    const g = !!(stmts[0] && /KIVO_REV_CONFLICT/.test(stmts[0].sql)), sec = stmts.some((x) => /^INSERT INTO sec/.test(x.sql));
    try { const v = await B(stmts); if (g) tr('G'); else if (sec && !stmts.some((x) => /INTO kv/.test(x.sql))) tr('d'); return v; }
    catch (e) { if (g) tr('L'); throw e; }
  };
  S.hook = (h) => { h.seen = 0; S.hooks.push(h); return h; };
  S.lost = () => Object.values(S.trace).reduce((n, t) => n + (t.match(/L/g) || []).length, 0);
  return S;
}

/* The SQL editor retains one sealed ticket. A conflict never merges/rebases or
   writes automatically; a deliberate load() starts a reviewed fresh edit. */
export class MgrClient {
  constructor(Wd, ck, _historicalMerge, key, tag) { this.Wd=Wd; this.ck=ck; this.K=key; this.tag=tag; this.ticket=null; }
  async load() {
    const r=await asWho(this.tag,()=>this.Wd.C.api('/api/operations/read?keys='+encodeURIComponent(this.K),{cookie:this.ck}));
    if(r.status!==200||r.j.ok!==1||r.j.denied.includes(this.K)||!Object.hasOwn(r.j.base,this.K))throw Error('Typed editor read denied');
    this.mem=JSON.stringify(Object.hasOwn(r.j.resources,this.K)?r.j.resources[this.K]:null);this.baseVal=this.mem;this.krev=r.j.base[this.K];this.epoch=r.j.epoch;this.ticket=null;return r.j;
  }
  async edit(fn,extra={}) {
    if(this.ticket)return{ok:false,status:409,reviewRequired:true,retainedDraft:true};
    const value=JSON.parse(this.mem);fn(value);this.mem=JSON.stringify(value);
    const raw=operationSaveBody(this.Wd.env,'/api/save',Object.assign({set:{[this.K]:this.mem},del:[],base:{[this.K]:this.krev}},extra));
    if(this.epoch!==undefined)raw.epoch=this.epoch;
    this.ticket={body:JSON.stringify(raw),sent:this.mem};return this.retry();
  }
  async retry() {
    if(!this.ticket)throw Error('No sealed editor ticket');
    const ticket=this.ticket,body=JSON.parse(ticket.body),r=await asWho(this.tag,()=>this.Wd.C.api('/api/save',{method:'POST',cookie:this.ck,body})),j=r.j||{};
    if(r.status===200&&j.ok===1&&j.requestId===body.requestId&&j.epoch===body.epoch&&Number.isSafeInteger(j.revs?.[this.K])){
      this.krev=j.revs[this.K];this.baseVal=ticket.sent;this.mem=ticket.sent;this.ticket=null;return{ok:true,tries:1,sent:ticket.sent,j};
    }
    return{ok:false,status:r.status,denied:j.denied?.[this.K]?.why,conflict:r.status===409,retainedDraft:true,sent:ticket.sent,body:ticket.body,j};
  }
}
/* Test-driver action only: first prove the stale ticket cannot overwrite SQL,
   including exact retry, then explicitly reload/review and enter the intent
   against the fresh document. This is never an automatic editor merge. */
export async function reviewAndApply(editor,intent,extra={}) {
  const first=await editor.edit(intent,extra);
  if(first.ok||!first.conflict)return first;
  assert.equal(first.status,409);assert.equal(first.retainedDraft,true);
  const ticket=editor.ticket.body,committed=stored(editor.Wd.env,editor.K),draft=editor.mem;
  const retry=await editor.retry();assert.equal(retry.status,409);assert.equal(editor.ticket.body,ticket);assert.equal(editor.mem,draft);
  assert.deepEqual(stored(editor.Wd.env,editor.K),committed,'An exact stale retry must not overwrite committed progress');
  await editor.load(); // Explicit simulated user review; not part of edit/retry.
  const reviewed=await editor.edit(intent,extra);return{...reviewed,tries:3,reviewed:true};
}
export async function upImg(Wd, ck, tag) {
  const id = 'img_tsk' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36) + '_' + tag;
  const r = await Wd.C.api('/api/img/' + encodeURIComponent(id), { method: 'PUT', cookie: ck, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: PNG });
  if (r.status !== 200) throw new Error('رفعُ الصورة ' + r.status); return id;
}
export const act = (Wd, ck, b, tag) => asWho(tag || 'E', () => Wd.C.api('/api/me/tasks/act', { method: 'POST', cookie: ck, body: b }));
export const findRow = (S, id, eid) => { for (const d in S) if (Array.isArray(S[d])) for (let i = 0; i < S[d].length; i++) { const r = S[d][i]; if (Array.isArray(r) && r[13] === id && (eid === undefined || r[14] === eid)) return { d, i, r }; } return null; };
