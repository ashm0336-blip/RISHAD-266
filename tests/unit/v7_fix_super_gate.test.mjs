/* برومت 43 · الجذر 1 — اختبارٌ حارسٌ دائم: مديرُ المنصة لا يُرفض بأي «قيد»، ويبقى له ما هو سلامةُ بيانات فقط.
     ① كلُّ نوع رفضٍ enfNo('…') في مصدر الخادم مصنَّفٌ في إحدى القائمتين (056): ENF_SUPER_KEEPS (يبقى حتى لمدير المنصة — سلامة بيانات)
        أو ENF_SUPER_LIFTS (قيدٌ يُرفع عنه). نوعٌ جديدٌ غيرُ مصنَّف ⇒ يفشل هذا الاختبار حتى يُصنَّف.
     ② البوابةُ نفسُها: كلُّ نوعٍ في LIFTS يُرفع عن مدير المنصة ولا يُرفع عن غيره · كلُّ نوعٍ في KEEPS يبقى · وما وُسم invariant/structural يبقى.
     ③ حفظٌ حقيقي: تعديلُ جولةِ يومٍ ماضٍ (خارج الفترة) — مديرُ المنصة يُحفظ له وتتغيّر البيانات · مديرُ الإدارة يُرفض كما كان. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { world, workerUnderTest, D, T, DAY, stored, replaceOperationalFixture } from './world_fx.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const WU = workerUnderTest();
const sources = () => { const out = []; const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name)) out.push(p); } }; walk(path.join(ROOT, 'workers/parts')); for (const s of fs.readdirSync(path.join(ROOT, 'src/systems'))) { const d = path.join(ROOT, 'src/systems', s, 'server'); if (fs.existsSync(d)) walk(d); } return out; };
const lists = () => { const src = fs.readFileSync(path.join(ROOT, 'workers/parts/056-enforce.js'), 'utf8'); const grab = (name) => { const m = new RegExp('var ' + name + ' = \\{([\\s\\S]*?)\\};').exec(src); assert.ok(m, name); return [...m[1].matchAll(/(?:^|[,{\s])'?([a-z][a-z-]*)'?\s*:/g)].map((x) => x[1]); }; return { keeps: grab('ENF_SUPER_KEEPS'), lifts: grab('ENF_SUPER_LIFTS') }; };

async function gateModule() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, fs.readFileSync(WU.file, 'utf8') + '\nexport { enfSuperGate, enfNo, enfOk, enfLockBypass };\n');
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('① every refusal kind in the server source is classified: kept for the platform admin (data integrity) or lifted (a restriction)', () => {
  const { keeps, lifts } = lists(), kinds = new Set();
  for (const f of sources()) for (const m of fs.readFileSync(f, 'utf8').matchAll(/enfNo\('([a-z:.-]+)'/g)) kinds.add(m[1]);
  assert.ok(kinds.size >= 25, 'refusal kinds found: ' + kinds.size);
  const unclassified = [...kinds].filter((k) => !keeps.includes(k) && !lifts.includes(k)).sort();
  assert.deepEqual(unclassified, [], 'classify these in workers/parts/056-enforce.js (ENF_SUPER_KEEPS or ENF_SUPER_LIFTS): ' + unclassified.join(', '));
  assert.deepEqual(keeps.filter((k) => lifts.includes(k)), [], 'a kind is in one list only');
  /* the restrictions the owner named are all lifted, and none of them is ever kept */
  for (const k of ['perm', 'scope', 'scope-unknown', 'reason', 'residual', 'unbound', 'dept', 'super']) assert.ok(lifts.includes(k), k + ' is lifted');
});

test('② the gate: every lifted kind is lifted for the platform admin only; kept kinds, invariants and structural refusals stay', async () => {
  const M = await gateModule(), { keeps, lifts } = lists();
  assert.equal(typeof M.enfSuperGate, 'function');
  const sup = { u: { id: 'su', role: 'super' } }, mgr = { u: { id: 'x', role: 'staff', mgr: 1 } };
  for (const why of lifts) {
    const out = M.enfSuperGate(sup, M.enfNo(why, { detail: 'TEST_ONLY', keys: ['k'] }));
    assert.deepEqual([out.ok, out.path, out.lifted], [true, 'super', why], why + ' is lifted and recorded');
    assert.equal(M.enfSuperGate(mgr, M.enfNo(why)).ok, false, why + ' still refuses everyone else');
    assert.equal(M.enfSuperGate(sup, M.enfNo(why, { invariant: 1 })).ok, false, why + ' flagged invariant stays');
    assert.equal(M.enfSuperGate(sup, M.enfNo(why, { structural: 1 })).ok, false, why + ' flagged structural stays');
  }
  for (const why of keeps) assert.equal(M.enfSuperGate(sup, M.enfNo(why)).ok, false, why + ' is data integrity: it stays for the platform admin');
  assert.equal(M.enfSuperGate(sup, M.enfNo('TEST_ONLY-new-kind')).ok, false, 'an unknown kind is never lifted by default');
  const ok = M.enfOk(['k']); assert.equal(M.enfSuperGate(sup, ok), ok);
});

test('③ a real save: a round of a PAST day (outside the period) — the platform admin saves it and the data changes; the unit manager is refused as before', async () => {
  const key = 'bsdept:' + D + ':bassam_rounds_v1', past = (T.m > 1 ? T.y + '-' + String(T.m - 1).padStart(2, '0') : (T.y - 1) + '-12') + '-03';
  const epoch = (W) => Number(W.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0);
  let seq = 0;
  const attempt = async (who) => {
    const W = await world({ worker: WU.file, mode: 'enforce' }), ck = who === 'super' ? W.su.ck : (await W.login(...(who === 'employee' ? ['0000000113', '70113'] : ['0000000101', '70101']))).ck;
    const base = stored(W.env, key); assert.ok(base && base[DAY], 'fixture rounds of today');
    const seeded = JSON.parse(JSON.stringify(base)); seeded[past] = JSON.parse(JSON.stringify(base[DAY])); seeded[past].ap = 1;
    await replaceOperationalFixture(W.env, key, seeded);
    const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(key), { cookie: ck });
    const v = g.j.resources[key], rev = g.j.base[key]; v[past].ap = 0;
    const r = await W.C.api('/api/save', { method: 'POST', cookie: ck, body: { requestId: 'TEST_ONLY_gate_' + (++seq), epoch: epoch(W), set: { [key]: JSON.stringify(v) }, base: { [key]: rev } } });
    return { r, now: stored(W.env, key)[past], sec: W.env.DB.q("SELECT act, detail FROM sec WHERE act='denied'"), authz: W.env.DB.q("SELECT keys, decision, why FROM authz WHERE k=?", key) };
  };
  /* V7 · د6 (QA) — قرارُ المالك (البند ١: لا سببَ إلزامياً لأحد): كان مديرُ الإدارة يُرفض هنا ببوابة السبب وحدها (why=reason على round.reopen — 059 enfDecide، أُزيلت).
     المشتق: (أ) المديرُ الحامل round.reopen يُحفظ له بلا سبب عبر المفاتيح (path=keys) — لا عبر تجاوز الفترات المقفلة (057 enfLockBypass للاستيراد/الاستعادة وحدهما، فلا يُرى
     «mgr-restore-locked» في الحفظ الحيّ)؛ (ب) موظفٌ بلا المفتاح يُرفض بقيدٍ كما كان ولا تتغيّر البيانات؛ (ج) enfLockBypass لا يصدق لحفظٍ حيّ. */
  const m = await attempt('manager');
  assert.ok(m.r.status === 200 && m.r.j.ok === 1 && !(m.r.j.denied && m.r.j.denied[key]), 'the unit manager holding round.reopen saves with no reason (owner decision): ' + JSON.stringify(m.r.j).slice(0, 300));
  assert.equal(m.now.ap, 0, 'manager: the past-day round changed');
  assert.deepEqual(m.authz.map((x) => [x.keys, x.decision, x.why]), [['round.reopen', 'allow', 'keys']], 'by the reopen key — not by a locked-period bypass');
  const e = await attempt('employee');
  assert.ok(e.r.j.denied && e.r.j.denied[key], 'an employee without the key is refused: ' + JSON.stringify(e.r.j).slice(0, 300));
  assert.ok(['scope', 'perm'].includes(e.r.j.denied[key].why), 'refused by a restriction, as before: ' + e.r.j.denied[key].why);
  assert.equal(e.now.ap, 1, 'employee: nothing changed');
  const G = await gateModule(), mgrA = { u: { id: 'x', role: 'staff', mgr: 1 }, __srvRst: 1 };
  assert.equal(G.enfLockBypass(mgrA, D, {}), false, 'no locked-period bypass on a live save');
  assert.equal(G.enfLockBypass(mgrA, D, { restore: false }), false, 'no locked-period bypass without a server restore');
  const s = await attempt('super');
  assert.ok(s.r.status === 200 && s.r.j.ok === 1 && !(s.r.j.denied && s.r.j.denied[key]), 'the platform admin is not refused: ' + JSON.stringify(s.r.j).slice(0, 300));
  assert.equal(s.now.ap, 0, 'the past-day round really changed');
  assert.deepEqual(s.sec, [], 'no security event for the platform admin');
});
