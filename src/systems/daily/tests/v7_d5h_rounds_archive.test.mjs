/* V7 · د5-ح (13) — أرشيفُ الجولات: الأشهرُ المقفلة في bsdept:<d>:bassam_rounds_arc_v1 فلا يكبر ملفُّ الجولات الحيّ مع الأيام.
   على العامل الحقيقي (node:sqlite) وبياناتٍ اصطناعية TEST_ONLY (مُثبِّتُ tests/fixtures/gen_fixture.py · كلماتُ الدخول من credentials.txt الذي يولّده):
   ① ترحيلُ «rounds-arc» المحمي على مُثبِّتٍ من ستة أشهر: مديرُ المنصة وحده · بيئةُ الإنفاذ وحدها · لا خلط · حتمية · plan-changed ·
     التطبيقُ يومًا يومًا (اليوم · في الحيّ قبل · في الحيّ بعد · في الأرشيف بعد) · حجمُ الملف الحيّ قبل/بعد · الثانيةُ بلا كتابة · الرجوعُ حرفاً
   ② السلوكُ الجاري: اعتمادُ شهرٍ في حفظة الجولات ينقل أيامَه إلى الأرشيف في الدفعة نفسِها · إعادةُ الحفظ بنسخةٍ قديمة لا تغيّر الأرشيف ·
     فتحُ الشهر يعيدها · لا يكتب الأرشيفَ أحدٌ من العميل (ولا مديرُ المنصة) · قراءتُه بسياسة الجولات حرفاً لكل حسابٍ في المُثبِّت (الإنفاذ والقديم). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from '../../../../tests/unit/harness.mjs';
import { installCurrentSchemaFixture } from '../../../../tests/unit/current_schema_fx.mjs';
import { replaceOperationalFixture } from '../../../../tests/unit/operational_legacy_seed_fx.mjs';

/* V7 · 53 تقويم: اليومُ التشغيلي للخادم ميلاديٌّ (calToday: الرياض − 3 ساعات) والمفاتيحُ ISO — كان أم القرى بلا بطانة */
const T = (() => { const x = new Date(Date.now()); return { year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate() }; })();
const D2 = (n) => String(n).padStart(2, '0'), YM = (y, m) => y + '-' + D2(m), DK = (y, m, d) => YM(y, m) + '-' + D2(d);
const KR = 'bsdept:tst_d1:bassam_rounds_v1', KA = 'bsdept:tst_d1:bassam_rounds_arc_v1';
const ym = (k) => { const x = T.year * 12 + (T.month - 1) + k; return { y: Math.floor(x / 12), m: (x % 12) + 1 }; };
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
let FX = null;
function fixture() {
  if (FX) return FX;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_arc_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  /* حساباتُ الاختبار من الملف المولَّد نفسِه — لا كلمةَ مرورٍ مكتوبةٌ هنا */
  const creds = [];
  for (const line of fs.readFileSync(out + '/credentials.txt', 'utf8').split('\n')) { const m = /^(tst_\w+)\s+(\d{10})\s+(\d{4,})\s/.exec(line); if (m) creds.push({ id: m[1], un: m[2], pw: m[3] }); }
  FX = { sql: fs.readFileSync(out + '/test_seed.sql', 'utf8'), creds };
  return FX;
}
async function world(mode = 'enforce') {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'admin');
  await applySql(env.DB, fixture().sql); await installCurrentSchemaFixture(env);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const dmc = fixture().creds.find((c) => c.id === 'tst_dm1'), dm = await C.login(dmc.un, dmc.pw); assert.ok(dm.ok, 'dm1');
  const uid = (await C.api('/api/whoami', { cookie: su.ck })).j.uid;
  return { env, C, su: su.ck, dm: dm.ck, uid };
}
const read = async (W, keys, ck) => {
  const cookie = ck || W.su, uid = (await W.C.api('/api/whoami', { cookie })).j.uid;
  return (await W.C.api('/api/operations/read?' + new URLSearchParams({ uid, keys: keys.join(',') }), { cookie })).j;
};
let RQ = 0;
async function save(W, set, ck, why) {
  const cookie = ck || W.su, uid = (await W.C.api('/api/whoami', { cookie })).j.uid, cur = await read(W, Object.keys(set), cookie);
  return (await W.C.api('/api/save', { method: 'POST', cookie, body: { uid, requestId: 'TEST_ONLY_arc_' + (++RQ), epoch: cur.epoch, set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, JSON.stringify(v)])), del: [], base: cur.base, ...(why ? { why } : {}) } })).j;
}
const okSave = (r) => assert.ok(r && r.ok === 1 && !Object.keys(r.denied || {}).length && !Object.keys(r.conflicts || {}).length, 'حفظ TEST_ONLY: ' + JSON.stringify(r, (k, v) => (k === 'cur' ? undefined : v)).slice(0, 600));
const migrate = (W, body, ck) => W.C.api('/api/authz-migrate', { method: 'POST', cookie: ck || W.su, body });
const plan = (W, extra = '', ck) => W.C.api('/api/authz-migrate?act=plan&parts=rounds-arc' + extra, { cookie: ck || W.su });
/* المُثبِّتُ الاصطناعي: ستةُ أشهر × 29 يوماً بطوابق جولة المُثبِّت (TEST_ONLY) — والأشهرُ:
   −5 بلا علامة (قبل الشهر الماضي ⇒ مقفل) · −4 معتمدٌ صراحةً (ap) · −3 مفتوحٌ صراحةً (mo) · −2 بلا علامة (مقفل) · −1 الشهرُ الماضي (يبقى حيّاً) · 0 الشهرُ الجاري */
function sixMonths(base) {
  const floors = base[Object.keys(base).find((k) => isDay(k) && Array.isArray(base[k].d) && base[k].d.length)].d, doc = {}, closed = new Set();
  for (let k = -5; k <= 0; k++) {
    const { y, m } = ym(k);
    for (let d = 1; d <= 29; d++) doc[DK(y, m, d)] = { t: 1, ap: k < 0 ? 1 : 0, d: JSON.parse(JSON.stringify(floors)) };
    if (k === -4) doc['m:' + YM(y, m)] = { ap: 1 };
    if (k === -3) doc['m:' + YM(y, m)] = { mo: 1 };
    if (k === -5 || k === -4 || k === -2) closed.add(YM(y, m));
  }
  return { doc, closed };
}
const monthOf = (k) => k.split('-').slice(0, 2).join('-');

test('[enforce] rounds-arc: خطة ← تطبيق (يوماً يوماً) ← لا شيءَ بعد ← رجوع · مديرُ المنصة وحده · بيئةُ الإنفاذ · لا خلط · plan-changed · الحجمُ قبل/بعد', async () => {
  const W = await world();
  const start = (await read(W, [KR])).resources[KR], { doc, closed } = sixMonths(start);
  /* حالةُ ما قبل الحزمة: الأيامُ كلُّها في الملف الحيّ — تُكتب مباشرةً في التخزين (بلا خطوة الحفظ) كما تركها الإصدارُ السابق */
  await replaceOperationalFixture(W.env, KR, doc);
  const before = await read(W, [KR, KA]), LB = before.resources[KR], R0 = JSON.stringify(LB);
  assert.equal(before.resources[KA], undefined, 'لا أرشيفَ قبل الترحيل');
  assert.equal(Object.keys(LB).filter(isDay).length, 6 * 29);
  /* ① */
  assert.equal((await plan(W, '', W.dm)).status, 403, 'مديرُ الإدارة لا يخطّط');
  const legacy = await world('legacy');
  /* V7 · د5-ح (القفل): /api/authz-migrate متاحٌ في كل بيئة لمدير المنصة (لا بوابةَ بيئة) — فيخطّط على قاعدةٍ لم تُرحَّل بعد كما في الإنفاذ */
  const lp = await plan(legacy); assert.equal(lp.status, 200, JSON.stringify(lp.j).slice(0, 200)); assert.deepEqual(lp.j.plan.parts, ['rounds-arc']);
  const mixed = await plan(W, ',perm'); assert.equal(mixed.status, 400); assert.equal(mixed.j.err, 'parts-mixed');
  const p1 = await plan(W); assert.equal(p1.status, 200, JSON.stringify(p1.j).slice(0, 300)); const P1 = p1.j.plan;
  assert.deepEqual(P1.parts, ['rounds-arc']); assert.deepEqual(P1.writes.map((w) => w.k).sort(), [KA, KR].sort(), 'الحيُّ والأرشيفُ وحدهما');
  assert.equal(P1.counts.moved, 3 * 29, 'ثلاثةُ أشهرٍ مقفلة'); assert.equal(P1.counts.back, 0);
  assert.equal((await plan(W, '&seed=' + P1.seed)).j.plan.hash, P1.hash, 'حتمية');
  /* plan-changed: تغيّرت الجولاتُ بعد الخطة */
  const touched = JSON.parse(R0), tk = Object.keys(touched).find(isDay); touched[tk].t = 2; await replaceOperationalFixture(W.env, KR, touched);
  const pc = await migrate(W, { act: 'apply', seed: P1.seed, hash: P1.hash, generated: P1.generated, parts: ['rounds-arc'] });
  assert.equal(pc.status, 409); assert.equal(pc.j.err, 'plan-changed');
  await replaceOperationalFixture(W.env, KR, JSON.parse(R0));
  const base = await read(W, [KR, KA]), B0 = JSON.stringify(base.resources[KR]);
  /* ② التطبيق */
  const P2 = (await plan(W)).j.plan;
  const ap = await migrate(W, { act: 'apply', seed: P2.seed, hash: P2.hash, generated: P2.generated, parts: ['rounds-arc'] });
  assert.equal(ap.status, 200, JSON.stringify(ap.j)); assert.equal(ap.j.applied, 2); assert.match(ap.j.snap, /^migration_/);
  const after = await read(W, [KR, KA]), LA = after.resources[KR], AA = after.resources[KA], rows = [];
  for (const k of Object.keys(JSON.parse(B0)).filter(isDay)) {
    const shut = closed.has(monthOf(k));
    rows.push([k, '✓', k in LA ? '✓' : '—', k in AA ? '✓' : '—'].join(' | '));
    assert.equal(k in LA, !shut, k + ': في الحيّ بعد'); assert.equal(k in AA, shut, k + ': في الأرشيف بعد');
    assert.deepEqual(shut ? AA[k] : LA[k], JSON.parse(B0)[k], k + ': اليومُ نفسُه حرفاً');
  }
  for (const k of Object.keys(JSON.parse(B0)).filter((x) => !isDay(x))) assert.deepEqual(LA[k], JSON.parse(B0)[k], k + ': العلامةُ تبقى في الحيّ');
  assert.ok(!Object.keys(AA).some((k) => !isDay(k)), 'الأرشيفُ أيامٌ وحدها');
  console.log('TEST_ONLY · day | in live before | in live after | in archive after\n' + rows.join('\n'));
  const sizeB = Buffer.byteLength(B0), sizeA = Buffer.byteLength(JSON.stringify(LA));
  console.log('TEST_ONLY · live rounds bytes (6 months × 29 days): before ' + sizeB + ' → after ' + sizeA + ' (' + Math.round(100 * sizeA / sizeB) + '%) · archive ' + Buffer.byteLength(JSON.stringify(AA)));
  assert.ok(sizeA < sizeB * 0.55, 'الملفُّ الحيّ يحمل ثلاثة أشهرٍ مفتوحة من ستة');
  assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM meta WHERE k IN ('authz_perm_mig','authz_id_mig')")[0].n, 0, 'لا علامةَ صلاحياتٍ أو هويةٍ من هذا الجزء');
  /* ③ الثانيةُ بلا كتابة */
  const P3 = (await plan(W)).j.plan; assert.equal(P3.counts.writes, 0, JSON.stringify(P3.counts));
  const ap0 = await migrate(W, { act: 'apply', seed: P3.seed, hash: P3.hash, generated: P3.generated, parts: ['rounds-arc'] });
  assert.equal(ap0.status, 200); assert.equal(ap0.j.applied, 0);
  /* ④ الرجوع */
  const rb = await migrate(W, { act: 'rollback', snap: ap.j.snap });
  assert.equal(rb.status, 200, JSON.stringify(rb.j)); assert.equal(rb.j.restored, 2);
  const back = await read(W, [KR, KA]);
  assert.equal(JSON.stringify(back.resources[KR]), B0, 'الحيُّ كما كان حرفاً'); assert.equal(back.resources[KA], undefined, 'ولا أرشيف');
  assert.equal((await migrate(W, { act: 'rollback', snap: ap.j.snap })).j.err, 'already-restored');
});

for (const mode of ['enforce', 'legacy'])
test('[' + mode + '] السلوكُ الجاري: اعتمادُ الشهر ينقل أيامَه إلى الأرشيف في الحفظة نفسِها · نسخةٌ قديمة لا تغيّره · الفتحُ يعيدها · لا كتابةَ من العميل · القراءةُ بسياسة الجولات', async () => {
  const W = await world(mode);
  /* أيامُ الشهر الماضي سُجّلت وهو مفتوح (تُكتب في التخزين مباشرةً: الإنفاذُ يقفل الفترةَ الماضية على الإنشاء) */
  const full = (await read(W, [KR])).resources[KR], P = ym(-1), PK = YM(P.y, P.m), cur = ym(0);
  const floors = full[Object.keys(full).find((k) => isDay(k) && full[k].d.length)].d, seeded = JSON.parse(JSON.stringify(full));
  for (let d = 1; d <= 29; d++) seeded[PK + '-' + D2(d)] = { t: 1, ap: 1, d: JSON.parse(JSON.stringify(floors)) };
  await replaceOperationalFixture(W.env, KR, seeded);
  /* الجولاتُ كما يراها مديرُ الإدارة (في الإنفاذ تُسقَط بعدسات سقف الإدارة) — منها يبني حفظاته */
  const doc = (await read(W, [KR], W.dm)).resources[KR];
  const L0 = (await read(W, [KR, KA])); assert.ok(PK + '-01' in L0.resources[KR], 'الشهرُ الماضي حيٌّ (هامش شهر)'); assert.equal(L0.resources[KA], undefined);
  /* ما يراه كلُّ حسابٍ من يومٍ في الشهر الماضي وهو في الجولات */
  const who = [];
  for (const c of fixture().creds) { const r = await W.C.login(c.un, c.pw); if (r.ok) who.push({ id: c.id, ck: r.ck }); }
  assert.ok(who.length >= 10, 'حساباتُ المُثبِّت');
  const seenBefore = {};
  for (const u of who) { const j = await read(W, [KR], u.ck); seenBefore[u.id] = { denied: (j.denied || []).includes(KR), day: j.resources && j.resources[KR] ? j.resources[KR][PK + '-05'] : undefined }; }
  /* اعتمادُ الشهر (مديرُ الإدارة) — الأيامُ تنتقل في الحفظة نفسِها */
  const ap = JSON.parse(JSON.stringify(doc)); ap['m:' + PK] = { ap: 1 };
  const r1 = await save(W, { [KR]: ap }, W.dm); okSave(r1);
  assert.deepEqual(Object.keys(r1.revs), [KR], 'الردُّ يسمّي ما طلبه العميلُ وحده');
  const L1 = await read(W, [KR, KA]), live1 = L1.resources[KR], arc1 = L1.resources[KA];
  assert.ok(!Object.keys(live1).some((k) => k.startsWith(PK + '-')), 'لا يومَ من الشهر المعتمد في الحيّ');
  assert.deepEqual(live1['m:' + PK], { ap: 1 }, 'علامتُه تبقى في الحيّ');
  for (let d = 1; d <= 29; d++) assert.deepEqual(arc1[PK + '-' + D2(d)], seeded[PK + '-' + D2(d)], 'اليوم ' + d + ' في الأرشيف كما هو');
  assert.ok(Object.keys(live1).some((k) => k.startsWith(YM(cur.y, cur.m) + '-')), 'الشهرُ الجاري حيّ');
  /* القراءةُ بسياسة الجولات حرفاً: الرفضُ نفسُه والإسقاطُ نفسُه لكل حساب */
  for (const u of who) {
    const j = await read(W, [KA], u.ck);
    assert.equal((j.denied || []).includes(KA), seenBefore[u.id].denied, u.id + ': حكمُ القراءة نفسُه');
    if (!seenBefore[u.id].denied) assert.deepEqual(j.resources[KA][PK + '-05'], seenBefore[u.id].day, u.id + ': ما يراه من اليوم نفسُه');
  }
  /* نسخةٌ قديمة في الصفحة (تحمل أيامَ الشهر المؤرشف) تُحفظ مرةً أخرى: الأرشيفُ لا يتغيّر والحيُّ بلا أيامه */
  const arcRev = L1.base[KA], stale = JSON.parse(JSON.stringify(ap)), today = DK(T.year, T.month, T.day);
  assert.ok(stale[today], 'جولةُ اليوم في المُثبِّت'); stale[today].t = 3;   /* تعديلٌ حقيقيٌّ على يومٍ مفتوح مع أيام الشهر المؤرشف كما في الصفحة */
  okSave(await save(W, { [KR]: stale }, W.dm));
  const L2 = await read(W, [KR, KA]);
  assert.equal(L2.base[KA], arcRev, 'الأرشيفُ لم يُكتب (idempotent)'); assert.deepEqual(L2.resources[KA], arc1);
  assert.ok(!Object.keys(L2.resources[KR]).some((k) => k.startsWith(PK + '-')));
  /* لا يكتب الأرشيفَ أحدٌ من العميل — ولا مديرُ المنصة */
  for (const ck of [W.dm, W.su]) {
    const bad = await save(W, { [KA]: {} }, ck);
    assert.ok(bad && bad.ok !== 1 && bad.denied && bad.denied[KA], 'رفضُ كتابة الأرشيف: ' + JSON.stringify(bad).slice(0, 200));
  }
  assert.deepEqual((await read(W, [KA])).resources[KA], arc1, 'الأرشيفُ كما هو');
  /* فتحُ الشهر يعيد أيامَه إلى الحيّ في الحفظة نفسِها */
  const open = JSON.parse(JSON.stringify(L2.resources[KR])); open['m:' + PK] = { mo: 1 };
  okSave(await save(W, { [KR]: open }, W.dm, { [KR]: 'TEST_ONLY إعادةُ فتح الشهر' }));
  const L3 = await read(W, [KR, KA]);
  for (let d = 1; d <= 29; d++) assert.deepEqual(L3.resources[KR][PK + '-' + D2(d)], seeded[PK + '-' + D2(d)], 'اليوم ' + d + ' عاد حيّاً');
  assert.ok(!Object.keys(L3.resources[KA]).length, 'الأرشيفُ فارغ');
});
