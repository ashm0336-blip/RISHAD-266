/* V7 · د1-ج · قرار صاحب المنصة — مدير المنصة بلا قيد صلاحية: مسحٌ لأبواب الصلاحية في الخادم نفسها (لا المسارات — تلك في
   v7_d1c_super_unbounded). إدارةٌ سقفُها فارغ وكلُّ وحدات المنصة مطفأة، والوضعان:
     myPermsOf · actsHeldOn — كلُّ صفحةٍ وورقة × كلُّ فعل
     authorize0 — كلُّ موردٍ إداريٍّ في السجل (بلا قاعدةٍ خاصة) × كلُّ فعل
     resOnCeiling — كلُّ مورد · nfPage — كلُّ نوعِ تنبيه · enfHeld (الإنفاذ) — كلُّ مفتاحٍ فعّال في السجل v24.9
   يطبع كلَّ رفضٍ وُجد ثم يشترط أن يكون صفراً. TEST_ONLY · SQLite في الذاكرة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { D1Shim, WORKER } from './harness.mjs';

let loads = 0;
async function load() {
  const src = fs.readFileSync(WORKER, 'utf8');
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'd1c-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, src + '\nexport { initDb, kvPutStmts, actorOf, enfModeOf, enfAttachGrants, myPermsOf, actsHeldOn, authorize0, resOnCeiling, nfPage, enfHeld, NF_TYPES, PG_KEYS, pgLeaves, ACTS_ALL, KIVO_REGISTRY, RES_REG };\n');
  try { return await import(pathToFileURL(f).href + '?n=' + (++loads)); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const D = 'TEST_ONLY_d0';
async function actor(W, mode) {
  const DB = new D1Shim(), env = { DB, KIVO_AUTHZ_MODE: 'enforce' };
  await W.initDb(env);
  const ph = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
  const keys = { bassam_auth_users_v1: [{ id: 'TEST_ONLY_super', un: '1000000001', name: 'TEST_ONLY super', role: 'super', ph, mc: 0, dis: 0 }],
    bassam_gdepts_v1: [], bassam_depts_v1: [{ id: D, name: 'TEST_ONLY dept' }],
    bassam_perms_v1: { caps: { [D]: [] } }, bassam_platform_v1: { mods: { off: W.PG_KEYS.slice() } } };
  const st = [];
  for (const [k, v] of Object.entries(keys)) { st.push(...W.kvPutStmts(env, 'kv', k, JSON.stringify(v))); st.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(k)); }
  st.push(DB.prepare("INSERT INTO meta(k,v) VALUES('authz_mode',?1) ON CONFLICT(k) DO UPDATE SET v=?1").bind(mode));
  await DB.batch(st);
  const M = await W.enfModeOf(env); env.__enf = M.mode === 'enforce' ? M : null;
  const A = await W.actorOf(env, 'TEST_ONLY_super');
  assert.equal(!!A.enf, mode === 'enforce', 'mode ' + mode);
  assert.ok(A.off.length >= W.PG_KEYS.length, 'كلُّ الوحدات مطفأة'); assert.deepEqual(A.perms.caps[D], [], 'سقفٌ فارغ');
  return A;
}

for (const mode of ['legacy', 'enforce']) {
  test('V7 · د1-ج · ' + mode + ': أبوابُ الصلاحية في الخادم لا ترفض مدير المنصة على إدارةٍ سقفُها فارغ ووحداتُها مطفأة', { timeout: 300000 }, async (t) => {
    const W = await load(), A = await actor(W, mode), out = [];
    let n = 0; const chk = (ok, label) => { n++; if (!ok) out.push(label); };
    const pages = W.PG_KEYS.flatMap((k) => [k].concat(W.pgLeaves(k)));
    const P = W.myPermsOf(A, D);
    for (const p of pages) for (const a of W.ACTS_ALL) { chk((P[p] || []).includes(a), 'myPermsOf ' + p + ':' + a); chk(W.actsHeldOn(A, D, p, [a]), 'actsHeldOn ' + p + ':' + a); }
    const RES = Object.keys(W.RES_REG).filter((r) => W.RES_REG[r].scope === 'dept');
    for (const r of RES) {
      const R = W.RES_REG[r], k = 'bsdept:' + D + ':' + r;
      chk(W.resOnCeiling(A, D, R), 'resOnCeiling ' + r);
      if (!R.rule) for (const a of ['view', 'add', 'edit', 'del']) { const z = W.authorize0(A, k, a); chk(z.ok, 'authorize0 ' + r + ':' + a + ' (' + z.why + ')'); }
    }
    for (const type of Object.keys(W.NF_TYPES)) chk(W.nfPage(A, D, type, W.NF_TYPES[type].k, 'view'), 'nfPage ' + type);
    if (mode === 'enforce') for (const key of W.KIVO_REGISTRY.keys) { const e = W.KIVO_REGISTRY.byKey[key]; if (e && e.status === 'active') chk(W.enfHeld(A, D, key), 'enfHeld ' + key); }
    t.diagnostic('فحوص: ' + n + ' · رفض: ' + out.length);
    const by = {}; out.forEach((x) => { const g = x.split(' ')[0]; by[g] = (by[g] || 0) + 1; }); t.diagnostic('الرفضُ لكل باب: ' + JSON.stringify(by));
    out.slice(0, 400).forEach((x) => t.diagnostic('✘ ' + x));
    assert.ok(n > 500, 'المسحُ شامل (' + n + ')');
    assert.deepEqual(out, [], 'مدير المنصة رُفض في باب صلاحية');
  });
}
