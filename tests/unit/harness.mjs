/* KIVO — عُدّةُ اختبار الوحدة للعامل (RM-1 / RM-5): تشغيلُ _worker.js داخل Node مباشرةً فوق D1 بديلٍ (node:sqlite) —
   بلا Miniflare ولا متصفح: سريعٌ وحتميّ، ويسمح بحقن الأعطال في استعلامٍ بعينه (fail injection) وهو ما لا يتيحه D1 الحقيقي.
   ليست بديلاً عن حزم Miniflare/Playwright (التكامل) — بل طبقةُ الوحدة تحتها. */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { makeSql as makeFirstAdminSql } from '../../tools/provision_first_admin.mjs';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Python can be explicitly selected by CI/local runners; never assume a Unix command name. */
export const BASH = process.env.KIVO_BASH || 'bash';
export const PYTHON = process.env.KIVO_PYTHON || (() => {
  for (const command of ['python3', 'python', 'py']) {
    const check = spawnSync(command, ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf8', windowsHide: true });
    if (check.status === 0 && check.stdout.trim()) return check.stdout.trim();
  }
  throw new Error('Python runtime not found; set KIVO_PYTHON to the Python executable.');
})();
export const WORKER = process.env.KIVO_WORKER || path.join(ROOT, 'workers', '_worker.js');   /* المرشَّحُ الحالي (KIVO_251 · الشجرةُ المستهدفة)؛ KIVO_WORKER يبدّله */
/* رقمُ إصدار العامل المختبَر (من WORKER_VER) — الاختباراتُ التي تشترط ميزةً من إصدارٍ لاحق تُعلَّم skip على العوامل الأقدم (لا إخفاقَ زائفاً في بوابات المرشّحات السابقة) */
export const WORKER_N = (() => { try { const m = /var WORKER_VER = '[\d.]+-(\d+)';/.exec(fs.readFileSync(WORKER, 'utf8')); return m ? +m[1] : 0; } catch (e) { return 0; } })();
export const since = (n) => WORKER_N && WORKER_N < n ? { skip: 'يحتاج عاملاً ≥ ' + n + ' (المختبَر ' + WORKER_N + ')' } : {};
/* KIVO_259 (إصلاح — كشفه tools/onboard_check.sh: الاستنساخُ النظيف يُخفق في 96 اختباراً): الافتراضيُّ كان pk251 — مجلدُ مختبرٍ لا يُلتزَم فلا يوجد
   في استنساخٍ جديد ولا يبنيه build_chain 259. الآن: حزمةُ إصدار العامل المختبَر نفسِه (WORKER_VER -159 ⇒ pk259) إن وُجدت، ثم pk251 كما كان. */
export const DIST = process.env.KIVO_DIST || [WORKER_N ? 'pk' + (WORKER_N + 100) : '', 'pk251'].filter(Boolean).map(d => path.join(ROOT, d)).find(d => fs.existsSync(path.join(d, 'index.html'))) || path.join(ROOT, 'pk251');
/* KIVO_251 · ADR-012: تخطيطُ المصدر — <src>/layout.json (الشجرةُ المستهدفة) أو التخطيطُ الانتقالي k2NN/src */
export const SRC = process.env.KIVO_SRC || path.join(ROOT, 'src');
const LEGACY_LAYOUT = { migrations: 'migrations', workersParts: 'workers/parts', pages: 'client/pages', styles: 'client/css' };
export function layout() { const p = path.join(SRC, 'layout.json'); return fs.existsSync(p) ? Object.assign({}, LEGACY_LAYOUT, JSON.parse(fs.readFileSync(p, 'utf8'))) : LEGACY_LAYOUT; }
export function srcDir(key) { return path.normalize(path.join(SRC, layout()[key])); }
/* كتلةُ واجهةٍ بالاسم (مثل 380-hijri-fallback.js) أينما كانت في الشجرة */
export function blockFile(name) { const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) { if (e.name === 'modules' || e.name === 'pages' || e.name === 'client' && false) continue; const r = walk(q); if (r) return r; } else if (e.name === name) return q; } return null; }; const r = walk(SRC); if (!r) throw new Error('block not found: ' + name); return r; }

/* KIVO_265 · البند 19: منطقُ وحدةٍ كاملاً — logic.js + أجزاؤها بترتيب meta.json "logicParts" كما يجمعها tools/page_modules.py (الصفحةُ في vm) */
export function moduleLogic(slug) { const d = path.join(SRC, 'modules', slug); let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(d, 'meta.json'), 'utf8')); } catch (e) { /* بلا meta: logic.js وحده */ } return ['logic.js'].concat(meta.logicParts || []).map((f) => { const t = fs.readFileSync(path.join(d, f), 'utf8'); return t.endsWith('\n') ? t : t + '\n'; }).join(''); }
/* ── D1 بديل: الواجهة التي يستعملها العامل فقط (prepare/bind/first/all/run · batch · withSession) ── */
export class D1Shim {
  constructor() { this.db = new DatabaseSync(':memory:'); this.failIf = null; this.log = []; this.trips = 0; this._inBatch = false; }   /* KIVO_255 · AUD-037: trips = جولاتُ D1 (كلُّ first/all/run/raw جولة · batch جولةٌ واحدة) */
  trip() { if (!this._inBatch) this.trips++; }
  withSession() { return this; }
  prepare(sql) { const self = this; return new (class Stmt {
    constructor() { this.sql = sql; this.args = []; }
    bind(...a) { this.args = a.map(v => v === undefined ? null : (typeof v === 'boolean' ? (v ? 1 : 0) : v)); return this; }
    _st() { self.log.push(this.sql); self.trip(); if (self.failIf && self.failIf(this.sql)) throw new Error('D1_ERROR: injected failure for test'); return self.db.prepare(this.sql); }
    /* Node 22 sqlite treats ?1/?2 as named parameters; D1 binds them positionally.
       Keep the adaptation ONLY in this test shim, never in the production Worker. */
    _params() { return /\?[1-9][0-9]*/.test(this.sql) && this.args.length ? [Object.fromEntries(this.args.map((v, i) => [String(i + 1), v]))] : this.args; }
    async first(col) { const r = this._st().get(...this._params()); if (r == null) return null; return col ? r[col] : r; }
    async all() { const rows = this._st().all(...this._params()); return { results: rows, success: true, meta: { rows_read: rows.length } }; }
    async run() { const i = this._st().run(...this._params()); return { success: true, meta: { changes: Number(i.changes), last_row_id: Number(i.lastInsertRowid) }, results: [] }; }
    async raw() { const rows = this._st().all(...this._params()); return rows.map(r => Object.values(r)); }
    _allSync() { const rows = this._st().all(...this._params()); return { results: rows, success: true, meta: { rows_read: rows.length } }; }
    _runSync() { const i = this._st().run(...this._params()); return { success: true, meta: { changes: Number(i.changes), last_row_id: Number(i.lastInsertRowid) }, results: [] }; }
    /* D1.batch returns result rows for DML RETURNING as well as SELECT. Running
       the SQLite statement through all() preserves that distinction without
       guessing from SQL text (a value/comment can contain RETURNING). These
       native metadata reads are shim bookkeeping, not simulated D1 trips. */
    _batchSync() {
      const statement = this._st();
      const before = self.db.prepare('SELECT total_changes() AS n').get().n;
      const rows = statement.all(...this._params());
      const after = self.db.prepare('SELECT total_changes() AS n,last_insert_rowid() AS id').get();
      return { results: rows, success: true, meta: { rows_read: rows.length, changes: Number(after.n - before), last_row_id: Number(after.id) } };
    }
  })(); }
  /* KIVO_255: batch جولةٌ واحدة، وعباراتُ SELECT فيها تعيد صفوفَها (كما D1 الحقيقية — تحتاجها لقطةُ المقدّمة) */
  /* KIVO_259 (إصلاحُ عُدّة — إفصاح): الدفعةُ تُنفَّذ متزامنةً بلا await بين BEGIN وCOMMIT — ذرّيةٌ كما في D1 الحقيقية التي تسلسل الدفعات.
     كانت تُفلت await داخل المعاملة فيبدأ طلبٌ متزامنٌ آخر معاملتَه («cannot start a transaction within a transaction») — لم يظهر قبل
     اختبارات التزامن (save_race) لأن الاختباراتِ السابقةَ كلَّها متتابعة. */
  async batch(stmts) { const out = []; this.trips++; this._inBatch = true; this.db.exec('BEGIN'); try { for (const s of stmts) out.push(s._batchSync()); this.db.exec('COMMIT'); } catch (e) { this.db.exec('ROLLBACK'); throw e; } finally { this._inBatch = false; } return out; }
  exec(sql) { this.db.exec(sql); }
  q(sql, ...args) { const params = /\?[1-9][0-9]*/.test(sql) && args.length ? [Object.fromEntries(args.map((v, i) => [String(i + 1), v]))] : args; return this.db.prepare(sql).all(...params); }
}
/* ── البيئة: ASSETS تخدم index.html من dist · R2 بديلٌ في الذاكرة ── */
export function makeEnv(extra = {}) {
  const DB = new D1Shim(); const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'); const r2 = new Map();
  const ASSETS = { fetch: async (req) => { const u = new URL(req.url); const p = decodeURIComponent(u.pathname); if (p === '/' || p === '/index.html') return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }); const f = path.join(DIST, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) return new Response(fs.readFileSync(f), { status: 200, headers: { 'Content-Type': 'application/octet-stream' } }); return new Response('not found', { status: 404 }); } };
  const IMG_R2 = { put: async (k, v) => { r2.set(k, v); }, get: async (k) => r2.has(k) ? { body: r2.get(k), arrayBuffer: async () => r2.get(k), text: async () => typeof r2.get(k) === 'string' ? r2.get(k) : new TextDecoder().decode(r2.get(k)) } : null, delete: async (k) => { r2.delete(k); } };
  return Object.assign({ DB, ASSETS, IMG_R2 }, extra);
}
/* RISHAD 266: explicit, TEST-ONLY identity fixture. No default users in makeEnv().
   Tests requesting a super account must opt in by calling makeTestEnv(). */
export const TEST_SUPER_USERNAME = '0501234567';
export const TEST_SUPER_PIN = '583927';
/* Explicit synthetic operator authorization for fixtures that intentionally
   construct an older application database. Never used by runtime code. */
export function allowTestSchemaUpgrade(DB) {
  const names = fs.readdirSync(path.join(ROOT, 'migrations')).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort().map(name => name.slice(0, -4));
  const from = Number(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v || 0);
  if (!Number.isSafeInteger(from) || from < 0 || from >= names.length) throw Error('Fixture must explicitly select an older supported migration source');
  // The fixture JS clock may be intentionally shifted; SQLite's expiry clock is real.
  const sqlNow = Number(DB.q("SELECT CAST(strftime('%s','now') AS INTEGER)*1000 AS now")[0].now);
  const expiresAt = Math.max(Date.now(), sqlNow) + 600000;
  if (!Number.isSafeInteger(expiresAt)) throw Error('Fixture migration expiry must be a safe integer');
  const raw = JSON.stringify({ version: 1, from, to: names.length, migrations: names.slice(from), operationId: randomUUID(), expiresAt });
  DB.db.prepare('INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('schema_upgrade_permit_v1', raw);
  return raw;
}
export function makeTestEnv(extra = {}) {
  const env = makeEnv(extra);
  env.DB.exec(fs.readFileSync(path.join(ROOT, 'migrations/0001_baseline.sql'), 'utf8'));
  env.DB.exec('CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  env.DB.db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run('0001_baseline');
  env.DB.exec(makeFirstAdminSql({ username: TEST_SUPER_USERNAME, name: 'Test Administrator', password: TEST_SUPER_PIN }));
  allowTestSchemaUpgrade(env.DB);
  return env;
}
/* Explicit historical identity fixture for backward-compatibility tests only.
   Production never creates this account. makeEnv() stays genuinely empty. */
export function seedLegacyTestAdmin(env) {
  const password = 'admin';
  const s = 'bs~' + password + '~gate';
  let h = 5381, h2 = 52711;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  for (let i = s.length - 1; i >= 0; i--) h2 = ((h2 << 5) + h2 + s.charCodeAt(i)) | 0;
  const ph = 'p1$' + (h >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36);
  const users = JSON.stringify([{ id: 'su', un: 'admin', name: 'Historical test administrator', role: 'super', ph }]);
  env.DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run('bassam_auth_users_v1', users);
  env.DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1)').run('bassam_auth_users_v1');
  env.DB.db.prepare("INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO NOTHING").run();
  return env;
}
export function makeLegacyTestEnv(extra = {}) {
  const env = makeEnv(extra);
  env.DB.exec(fs.readFileSync(path.join(ROOT, 'migrations/0001_baseline.sql'), 'utf8'));
  env.DB.exec('CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  env.DB.db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run('0001_baseline');
  allowTestSchemaUpgrade(env.DB);
  return seedLegacyTestAdmin(env);
}
let _n = 0;
/* نسخةُ وحدةٍ جديدة لكل بيئة: العاملُ يحتفظ بحالةٍ على مستوى الوحدة (مثل _init تهيئة D1 مرةً لكل isolate) — كما يفعل isolate جديد */
export async function worker(env) { if (!env.__worker) env.__worker = (await import(pathToFileURL(WORKER).href + '?inst=' + (++_n))).default; return env.__worker; }
/* ── عميل: طلبٌ بمضيفٍ قابل للضبط (الأصل = المضيف نفسه كي يمرّ فحصُ Origin) ── */
export function client(env, base = 'http://x') {
  const W = { base };
  const jget = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { __text: t.slice(0, 400) }; } };
  const req = async (p, o = {}) => { const w = await worker(env); const b = o.base || W.base; const h = Object.assign({}, o.headers || {}); if (o.cookie) h.cookie = o.cookie; if (o.method && o.method !== 'GET') { h.origin = h.origin || b; h['Content-Type'] = h['Content-Type'] || 'application/json'; } const init = { method: o.method || 'GET', headers: h }; if (o.body !== undefined) init.body = typeof o.body === 'string' ? o.body : JSON.stringify(o.body); return w.fetch(new Request(b + p, init), env); };
  return {
    req,
    async api(p, o = {}) { const r = await req(p, o); return { status: r.status, j: await jget(r), h: r.headers }; },
    async login(u, p, o = {}) { const r = await req('/api/login', Object.assign({ method: 'POST', body: { u, p } }, o)); const j = await jget(r); return { ok: j.ok === 1, ck: (r.headers.get('set-cookie') || '').split(';')[0], j, status: r.status }; },
    async save(ck, set, del = [], base) { const keys = Object.keys(set).concat(del); let b = base; if (!b) { const g = await req('/api/get?keys=' + encodeURIComponent(keys.join(',')), { cookie: ck }); const gj = await jget(g); b = {}; for (const k of keys) b[k] = ((gj.keys || {})[k] || {}).rev || 0; } const r = await req('/api/save', { method: 'POST', cookie: ck, body: { set, del, base: b } }); return { status: r.status, j: await jget(r) }; },
    async boot(ck) { const r = await req('/', { cookie: ck, headers: { accept: 'text/html' } }); const t = await r.text(); const m = /window\.__BS_BOOT=(\{[\s\S]*?\});<\/script>/.exec(t); let b = null; try { b = m ? JSON.parse(m[1]) : null; } catch (e) {} return { status: r.status, boot: b, html: t }; }
  };
}
export async function applySql(DB, text) { let n = 0; const out = []; for (const line of text.split('\n')) { const s = line.trim(); if (!s || s.startsWith('--')) continue; n++; if (/^SELECT/i.test(s)) out.push(DB.q(s)); else DB.exec(s); } return { n, out }; }
