/* V7 · 53 · ملحق (4): إسقاطُ مرجع صورة (حذفُ موقع · استبدالُ خريطة) كان يُعيد 500 save-failed بعد ~8 ث على Preview:
   «D1_ERROR: Serialized RPC arguments or return values are limited to 32MiB, but the size of this value was: 62752317 bytes».
   السبب: rsImageMetadataPlan (019e) يحكم على الصورة التي لم يعد المفتاحُ يذكرها بتوسيع المرجع إلى القاعدة كلها (rsReferenceWiden — 019d):
   يقرأ كلَّ صفوف kv خارج النطاق وكلَّ الموارد التشغيلية لكل الإدارات إلى العامل، ثم يُرسلها كلَّها شاهداً (rsWitness) في دفعة الحفظ.
   فحجمُ الاستدعاء = حجمُ القاعدة كلها (إدارةٌ أخرى كبيرة تكفي)، لا حجمُ ما يُحفظ.
   هنا: صورُ خرائط بحجم حقيقي في D1 (بلا IMG_R2 كما Preview) · إدارةٌ ثانية بجدولٍ كبير · D1Shim بسقوف D1 (32MiB للاستدعاء) ·
   حذفُ موقع الصورة ثم حذفُ مرجعها وحده ⇒ 200 في أقل من 3 ث، والصورةُ يتيمةٌ كما كانت تصير، والاستدعاءُ الأكبر بعيدٌ عن السقف. TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { target, png } from './v7_d6_import_fx.mjs';
import { operationSaveBody } from './world_fx.mjs';
import { D1_LIMITS } from './harness.mjs';
import { seed } from '../load/s1_world.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', K = (d, r) => 'bsdept:' + d + ':' + r;
const IDS = ['img_testonly_mapone', 'img_testonly_maptwo', 'img_testonly_mapthree'];
const floor = (s, iid) => ({ sid: 'ts' + s, name: 'TEST_ONLY · موقع ' + s, num: s + 1, ...(iid ? { iid, imgW: 1920, imgH: 1080 } : {}), zones: [], gates: [], marks: [], paths: [] });
const STF_M = +(process.env.STF_M || 26), EMP = 500;

async function world() {
  const T = await target({ KIVO_TEST_FIXTURE: 'allow' });
  delete T.lab.env.IMG_R2;   /* Preview: الصورُ في D1 (جدول imgs) */
  const W = T.lab.W, env = T.lab.env;
  /* خرائطُ بحجم حقيقي: 1920×1080 وأكبر (PNG ضجيجٍ لا ينضغط، ≈ 3–6MB نصّاً) — تملكها الخطةُ في الإدارة أ */
  const bodies = [png(3_200_000, 1), png(4_500_000, 2), png(6_000_000, 3)];
  const st = [];
  IDS.forEach((id, i) => { st.push(...W.kvPutStmts(env, 'imgs', id, bodies[i])); st.push(env.DB.prepare("INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,'claim','',?2,'',?3)").bind(id, T.su.uid, Date.now())); });
  await env.DB.batch(st);
  /* V7 · 53: فهرسُ imgref مكتملٌ لسجلات هذه القاعدة (كلُّها كتبها هذا الإصدار) — كما يختمه imgRefScan في أول مرور للكنس */
  env.DB.q("INSERT INTO meta(k,v) VALUES('imgref_scan_v1','done') ON CONFLICT(k) DO UPDATE SET v='done'");
  const save = async (k, v) => {
    const rd = await T.call('/api/operations/read?keys=' + encodeURIComponent(k), { ck: T.su.ck });
    assert.equal(rd.status, 200, rd.t.slice(0, 200));
    const t0 = performance.now(), r = await T.call('/api/save', { ck: T.su.ck, body: operationSaveBody(env, '/api/save', { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: rd.j.base[k] || 0 } }) });
    return { ...r, ms: performance.now() - t0 };
  };
  /* الإدارة أ: خطةٌ بثلاثة مواقع، لكلٍّ خريطتُه */
  const plan = { floors: IDS.map((id, s) => floor(s, id)), months: {}, delMonths: {} };
  const p0 = await save(K(A, 'bassam_plan_v1'), plan);
  assert.equal(p0.status, 200, p0.t.slice(0, 300));
  /* الإدارة ب: جدولٌ شهري لـ500 موظف — بياناتُ إدارةٍ أخرى لا يمسّها الحفظ */
  const eids = Array.from({ length: EMP }, (_, i) => 'TEST_ONLY_e' + i), staffing = {};
  for (let m = 0; m < STF_M; m++) staffing[(1446 + Math.floor(m / 12)) + "-" + (m % 12 + 1)] = Object.fromEntries(eids.map((e, i) => [e, { shift: 'TEST_ONLY-' + 'ABCD'[(i + m) % 4], rest: [['fri', 'sat', 'sun'][i % 3]], leaves: {}, perm: {}, cs: '', muk: false }]));
  /* V7 · 53: يُبذر بالمرمِّز نفسِه (حفظُ 26 شهراً دفعةً واحدة يُرفض الآن مبكراً 413 batch-budget) — الصفوفُ هي التي كان يكتبها الحفظ */
  seed(T.lab, { bassam_staffing_v3: staffing }, {}, B);
  return { T, env, save, plan };
}

test('53 · ملحق 4: حذفُ موقعٍ بخريطته وإسقاطُ مرجع صورةٍ وحده تحت سقف D1 (32MiB) ⇒ 200 في < 3 ث، لا 500', { timeout: 600000 }, async (t) => {
  const { T, env, save, plan } = await world();
  try {
    const own0 = env.DB.q("SELECT img,st,k FROM imgown WHERE img IN (?1,?2,?3) ORDER BY img", ...IDS);
    assert.ok(own0.every((r) => r.st === 'bound' && r.k === K(A, 'bassam_plan_v1')), JSON.stringify(own0));
    const logs = [], log0 = console.log; console.log = (...a) => { const s = a.join(' '); if (/save-failed|worker-error/.test(s)) logs.push(s); };
    env.DB.limits = true; env.DB.peak = 0;
    try {
      /* ١) حذفُ الموقع الأول بخريطته */
      const r1 = await save(K(A, 'bassam_plan_v1'), { ...plan, floors: plan.floors.slice(1) });
      const peak1 = env.DB.peak;
      /* ٢) إبقاءُ الموقع الثاني وحذفُ مرجع صورته (iid) وحده */
      const f2 = plan.floors.slice(1).map((f, i) => (i === 0 ? floor(1) : f));
      const r2 = await save(K(A, 'bassam_plan_v1'), { ...plan, floors: f2 });
      console.log = log0;
      t.diagnostic('site delete ' + r1.status + ' ' + Math.round(r1.ms) + 'ms peak ' + peak1 + 'B · iid drop ' + r2.status + ' ' + Math.round(r2.ms) + 'ms peak ' + env.DB.peak + 'B');
      assert.equal(r1.status, 200, 'حذفُ الموقع: ' + r1.status + ' ' + r1.t.slice(0, 200) + ' ' + logs.join(' | ').slice(0, 400));
      assert.equal(r2.status, 200, 'حذفُ مرجع الصورة: ' + r2.status + ' ' + r2.t.slice(0, 200) + ' ' + logs.join(' | ').slice(0, 400));
      assert.ok(r1.ms < 3000 && r2.ms < 3000, 'الزمن ' + Math.round(r1.ms) + ' / ' + Math.round(r2.ms) + ' ms');
      assert.ok(peak1 < D1_LIMITS.call / 4 && env.DB.peak < D1_LIMITS.call / 4, 'أكبرُ استدعاءٍ لـD1 ' + peak1 + ' / ' + env.DB.peak + ' بايت — يجب ألا يكبر بحجم القاعدة');
    } finally { console.log = log0; env.DB.limits = false; }
    /* الدلالةُ كما كانت: الصورتان اللتان لم يعد يذكرهما أحد يتيمتان، والثالثة باقيةٌ مربوطة؛ والخطةُ تُقرأ بلا الموقع وبلا المرجع */
    const own = Object.fromEntries(env.DB.q("SELECT img,st FROM imgown WHERE img IN (?1,?2,?3)", ...IDS).map((r) => [r.img, r.st]));
    assert.deepEqual(own, { [IDS[0]]: 'orphan', [IDS[1]]: 'orphan', [IDS[2]]: 'bound' });
    assert.deepEqual(env.DB.q('SELECT img FROM imgref WHERE k=?1 ORDER BY img', K(A, 'bassam_plan_v1')).map((r) => r.img), [IDS[2]]);
    const rd = await T.call('/api/operations/read?keys=' + encodeURIComponent(K(A, 'bassam_plan_v1')), { ck: T.su.ck });
    assert.equal(rd.status, 200);
    assert.deepEqual(rd.j.resources[K(A, 'bassam_plan_v1')].floors.map((f) => f.iid || ''), ['', IDS[2]]);
  } finally { await T.close(); }
});

test('53 · ملحق 4: صورةٌ ما زال يذكرها مفتاحٌ آخر (إدارةٌ أخرى) لا تصير يتيمةً حين يُسقطها مفتاحٌ واحد', { timeout: 600000 }, async () => {
  const { T, env, save, plan } = await world();
  try {
    /* الإدارة ب تذكر الخريطة الأولى في خطتها كذلك (نسخٌ مشروع — مرجعٌ مسجَّل في imgref) */
    const pb = await save(K(B, 'bassam_plan_v1'), { floors: [floor(0, IDS[0])], months: {}, delMonths: {} });
    assert.equal(pb.status, 200, pb.t.slice(0, 300));
    env.DB.limits = true;
    try {
      const r = await save(K(A, 'bassam_plan_v1'), { ...plan, floors: plan.floors.slice(1) });
      assert.equal(r.status, 200, r.t.slice(0, 300));
    } finally { env.DB.limits = false; }
    const st = env.DB.q('SELECT st FROM imgown WHERE img=?1', IDS[0])[0].st;
    assert.notEqual(st, 'orphan', 'المرجعُ الآخر يُبقيها');
    assert.deepEqual(env.DB.q('SELECT k FROM imgref WHERE img=?1', IDS[0]).map((x) => x.k), [K(B, 'bassam_plan_v1')]);
  } finally { await T.close(); }
});
