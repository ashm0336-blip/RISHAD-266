/* V7 · 53 تقويم · عُدّةُ اختبارات 0014 والاستيراد: أوراكلٌ مستقلٌّ عن الكود — أم القرى من Intl (لا من 016/019v) وقاعدةُ القفل نسخةٌ حرفية من 010 lockedIn. TEST_ONLY. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
let inst = 0;
/* العاملُ مع دوالّ الترحيل مصدَّرةً (الدالةُ الواحدة للمورد) */
export async function load(source, tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_c14_')), file = path.join(dir, tag + '.mjs');
  fs.writeFileSync(file, source + (tag === 'new' ? '\nexport { ' + ['calMigDoc', 'calMigOnce', 'opInfo'].filter((n) => new RegExp('function ' + n + '\\b').test(source)).join(', ') + ' };\n' : ''));
  try { return await import(pathToFileURL(file).href + '?inst=' + ++inst); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
/* ── الأوراكل المستقل: أم القرى من Intl (لا من 016/019v) · قاعدةُ القفل نسخةٌ حرفية من 010 lockedIn ── */
const HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
const pad = (n) => String(n).padStart(2, '0');
export const H2G = (() => { const m = new Map(); for (let t = Date.UTC(2015, 0, 1); t < Date.UTC(2032, 0, 1); t += 864e5) { const o = {}; HF.formatToParts(new Date(t)).forEach((p) => { o[p.type] = +p.value; }); const d = new Date(t); m.set(o.year + '-' + o.month + '-' + o.day, d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())); } return m; })();
export const G2H = new Map([...H2G].map(([h, g]) => [g, h]));
export const hKey = (k) => { const p = String(k).split('-').map(Number); return p[0] + '-' + p[1] + '-' + p[2]; };
export function lockedIn(rec, y, m, d, T) {
  if (rec === true || rec === 1) rec = { ap: 1 }; else if (!rec || typeof rec !== 'object') rec = {};
  if (rec.ap) return true;
  const mPast = !!T && (y < T.y || (y === T.y && m < T.m)), dPast = mPast || (!!T && y === T.y && m === T.m && d != null && d < T.d);
  if (mPast && !rec.mo) return true;
  if (d == null) return false;
  return dPast ? !(rec.dopen && rec.dopen[d]) : !!(rec.dshut && rec.dshut[d]);
}
const isDay = (k) => /^\d{4}-\d{1,2}-\d{1,2}$/.test(k), isMk = (k) => /^m:\d{4}-\d{1,2}$/.test(k);
/* لكل يومٍ هجري في مدى العلامات والأيام: حالتُه بالقاعدة القديمة = حالةُ يومه الميلادي بالقاعدة نفسِها على السجل الجديد · وقيمتُه هي هي */
export function oracle(before, after, T, label) {
  const Tg = { y: +T.slice(0, 4), m: +T.slice(5, 7), d: +T.slice(8, 10) }, Th = (() => { const p = G2H.get(T).split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; })();
  const hMonths = new Set();
  Object.keys(before).forEach((k) => { if (isMk(k)) hMonths.add(k.slice(2)); if (isDay(k)) { const p = k.split('-').map(Number); hMonths.add(p[0] + '-' + p[1]); } });
  let days = 0;
  for (const hm of hMonths) for (let d = 1; d <= 30; d++) {
    const h = hm + '-' + d, g = H2G.get(h); if (!g) continue;
    const [y, m] = hm.split('-').map(Number), gm = g.slice(0, 7);
    const old = lockedIn(before['m:' + hm], y, m, d, Th), now = lockedIn(after['m:' + gm], +g.slice(0, 4), +g.slice(5, 7), +g.slice(8, 10), Tg);
    assert.equal(now, old, label + ': قفلُ اليوم ' + h + ' (' + g + ') لم يتغيّر');
    days++;
  }
  const bd = Object.keys(before).filter(isDay), ad = Object.keys(after).filter(isDay);
  assert.equal(ad.length, bd.length, label + ': عددُ الأيام محفوظ');
  for (const k of bd) { const g = H2G.get(hKey(k)); assert.ok(g, label + ': ' + k + ' يومٌ معروف'); assert.ok(Object.prototype.hasOwnProperty.call(after, g), label + ': اليوم ' + k + ' ← ' + g + ' لم يُسقط'); assert.deepEqual(after[g], before[k], label + ': قيمةُ اليوم ' + k + ' كما هي'); }
  assert.ok(Object.keys(after).every((k) => !/^(?:m:)?1[3-5]\d\d-/.test(k)), label + ': لا مفتاحَ هجرياً باقٍ');
  return days;
}

/* بياناتُ العرض يولّدها ويقرؤها العاملُ السابق (Preview قبل التقويم) في قاعدةٍ فارغة — شكلُ legacyDocs نفسُه */
export async function oldDemoDocs(oldSource, D1Shim) {
  const W = await load(oldSource, 'old'), TOK = 'TEST_ONLY_c14_demo', U = 'TEST_ONLY_c14_demo_super';
  const E = { DB: new D1Shim(), KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow', KIVO_TEST_HOST: 'x', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
  const call = async (p, body) => { const h = new Headers({ Cookie: 'bs_tok=' + TOK }); if (body) { h.set('Origin', 'http://x'); h.set('Content-Type', 'application/json'); } const r = await W.default.fetch(new Request('http://x' + p, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined }), E); return { status: r.status, j: await r.json().catch(() => null) }; };
  assert.equal((await call('/api/ping')).status, 200);
  E.DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?)').run('bassam_auth_users_v1', JSON.stringify([{ id: U, un: '1000000979', name: 'TEST_ONLY', role: 'super', ph: 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64), mc: 0, dis: 0 }]));
  E.DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  E.DB.db.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?,?,?,?,?,?)').run(TOK, U, Date.now(), Date.now(), 'TEST_ONLY', 'TEST_ONLY');
  assert.equal((await call('/api/demo-data', { act: 'seed' })).status, 200);
  const src = 'tst_demo_d1', ex = await call('/api/operations/export?uid=' + U + '&dept=' + src);
  const rd = await call('/api/operations/read?uid=' + U + '&keys=' + encodeURIComponent(ex.j.domains.map((d) => 'bsdept:' + src + ':' + d.resource).join(',')));
  assert.equal(rd.status, 200);
  const docs = {}; for (const [k, v] of Object.entries(rd.j.resources)) if (v != null) docs[k.split(':').pop()] = v;
  return docs;
}
