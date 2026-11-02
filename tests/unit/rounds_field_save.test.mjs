/* F24 — بلاغُ المالك (خطُّ الإصلاح 0b96cc0): «راصد ميدان» يحفظ في «الجولات اليومية» فيُرفض بـ«لا يحقّ لك تعديلُ هذا السجلّ (التعديلُ يمسّ بياناتٍ
   لا تظهر لك)». في المخطّط 10 الجولاتُ موردٌ تشغيليّ: تُقرأ من /api/operations/read (إسقاطُ الإنفاذ 061) وتُحفظ بغلاف العمليات عبر /api/save
   (دمجُ 061 enfMergeChk ثم حكمُ 058). كان الخادمُ يرفض الحفظةَ كلَّها لأيّ فرقٍ بين المرسَل وإسقاطِ ما سيُحفظ، والفرقُ ينشأ بلا يدٍ من المستخدم:
   (١) حالةٌ منسوخةٌ من الخطة على عنصرٍ غيرِ مسنَدٍ إليه · (٢) عناصرُ قديمةٌ بلا uid بالرمز نفسِه (يُستعار حقلُ أحدها للآخر ⇒ Assigned=not-assigned)
   · (٣) تسكينٌ باسم الموظف أو هويته لا بمفتاح حسابه. الآن (الإنفاذ): يُحفظ ما أُسند إليه، ويبقى الباقي كما في الخادم بلا رفض، ويُعرف الفاعلُ برموزه كلِّها.
   الوضعُ القديم (legacy) لا إسقاطَ فيه: يبقى كما كان (يُثبَّت هنا). بياناتٌ اصطناعية (TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, stored, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';

const KR = 'bsdept:tst_d1:bassam_rounds_v1', KE = 'bsdept:tst_d1:bassam_employees_v1';
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
/* إعدادٌ على الخادم (prep) ← قراءةُ الراصد كما يقرؤها العميل ← تعديلُه (edit) على ما رآه ← حفظٌ بغلاف العمليات */
async function attempt(mode, prep, edit) {
  const w = await world({ mode });
  const raw = stored(w.env, KR), day = Object.keys(raw).find(isDay), full = JSON.parse(JSON.stringify(raw[day]));
  await prep(raw, day, w); await replaceOperationalFixture(w.env, KR, raw);
  const f = (await w.login('0000000118', '70118')).ck;
  const g = await w.C.api('/api/operations/read?' + new URLSearchParams({ uid: 'tst_fld', keys: KR }), { cookie: f });
  assert.equal(g.status, 200, JSON.stringify(g.j)); const v = g.j.resources[KR];
  const seen = v[day] ? JSON.parse(JSON.stringify(v[day])) : null;
  edit(v, day, full);
  const r = await w.C.api('/api/save', { method: 'POST', cookie: f, body: operationSaveBody(w.env, '/api/save', { uid: 'tst_fld', set: { [KR]: JSON.stringify(v) }, del: [], base: { [KR]: g.j.base[KR] } }) });
  return { r, seen, before: raw[day], after: (stored(w.env, KR) || {})[day] };
}
const why = (r) => JSON.stringify(r.j.denied || r.j, (k, x) => k === 'cur' ? undefined : x).slice(0, 300);
const saved = (r) => { assert.equal(r.status, 200, why(r)); assert.ok(r.j.revs && r.j.revs[KR], why(r)); };
const own = (d, i = 0) => { const z = d.d[0].zones[i]; z.fst = 'closed'; z.closed = true; z.cWhy = 'TEST_ONLY صيانة'; };
const F = ['fst', 'closed', 'cWhy', 'fAt', 'fBy'], pick = (e) => Object.fromEntries(F.filter((k) => k in e).map((k) => [k, e[k]]));

test('[enforce] (١) حالةٌ منسوخةٌ من الخطة على بابٍ غيرِ مسنَد: يُحفظ تعديلُه ولا تُكتب حالةُ الباب', async () => {
  const { r, after, before } = await attempt('enforce', (x, day) => { x[day].d[0].gates[0].emp = []; }, (v, day) => { own(v[day]); Object.assign(v[day].d[0].gates[0], { fst: 'closed', closed: true }); });
  saved(r);
  assert.equal(after.d[0].zones[0].fst, 'closed', 'تعديلُه محفوظ');
  assert.deepEqual(pick(after.d[0].gates[0]), pick(before.d[0].gates[0]), 'وحالةُ الباب غيرِ المسنَد كما في الخادم');
});

test('[enforce] (٢) عناصرُ قديمةٌ بلا uid بالرمز نفسِه: يُحفظ تعديلُه ولا يُستعار حقلُ عنصرٍ لغيره', async () => {
  const { r, after, before } = await attempt('enforce', (x, day) => { x[day].d[0].zones.forEach((z) => { delete z.uid; z.code = 'TEST_ONLY SAME'; }); }, (v, day) => own(v[day]));
  saved(r);
  assert.equal(after.d[0].zones[0].cWhy, 'TEST_ONLY صيانة', 'حقولُ عنصره له');
  assert.deepEqual(pick(after.d[0].zones[1]), pick(before.d[0].zones[1]), 'وحقولُ الآخر له كما في الخادم');
});

for (const tok of ['name', 'nid']) test('[enforce] (٣) تسكينٌ بـ' + tok + ' الموظف: الخادمُ يعرفه مسنَداً إليه — يراه ويُحفظ تعديلُه', async () => {
  const { r, after, seen } = await attempt('enforce', async (x, day, w) => {
    const E = stored(w.env, KE), me = E.find((e) => e.eid === 'tst_e_field'); me.nid = me.nid || '1099999999'; await replaceOperationalFixture(w.env, KE, E);
    x[day].d[0].zones[0].emp = [String(me[tok])];
  }, (v, day) => own(v[day]));
  assert.ok('fst' in seen.d[0].zones[0], 'يرى حالةَ عنصره');
  saved(r);
  assert.equal(after.d[0].zones[0].fst, 'closed', 'تعديلُه محفوظ');
});

test('[enforce] الكتابةُ في عنصرٍ غيرِ مسنَد لا تُحفظ: يُحفظ الباقي ويعود المحجوبُ من الخادم', async () => {
  const { r, after, before } = await attempt('enforce', () => {}, (v, day) => { own(v[day]); Object.assign(v[day].d[0].zones[1], { fst: 'open', cWhy: 'TEST_ONLY عبث' }); Object.assign(v[day].d[1].zones[0], { fst: 'closed', cWhy: 'TEST_ONLY عبث' }); Object.assign(v[day].d[1].zones[1], { fst: 'open', cWhy: 'TEST_ONLY عبث' }); });
  saved(r);
  assert.equal(after.d[0].zones[0].fst, 'closed');
  assert.deepEqual(pick(after.d[0].zones[1]), pick(before.d[0].zones[1]), 'غيرُ المسنَد كما في الخادم');
  /* RISHAD-266: قائمةُ مواقع الراصد (Site من سقف النطاق القديم) تقاعدت — مصلاه المسنَد في الموقع الثاني يُحفظ؛ وغيرُ المسنَد هناك يبقى كما في الخادم (Assigned) */
  assert.equal(after.d[1].zones[0].fst, 'closed', 'المسنَدُ إليه في الموقع الآخر يُحفظ');
  assert.deepEqual(pick(after.d[1].zones[1]), pick(before.d[1].zones[1]), 'وغيرُ المسنَد في الموقع الآخر كما في الخادم');
});

test('[enforce] ولا يُسنِد نفسَه إلى عنصرٍ غيره: الرفضُ باقٍ ولا يُكتب شيء', async () => {
  const { r, after, before } = await attempt('enforce', () => {}, (v, day) => { own(v[day]); v[day].d[0].zones[1].emp = ['tst_e_field']; });
  assert.equal(r.status, 403, why(r)); assert.ok(r.j.denied && r.j.denied[KR], why(r));
  assert.deepEqual(after, before);
});

/* الوضعُ القديم: لا إسقاط — يرى الراصدُ كلَّ شيء ويُحكم على ما أرسله حرفاً (018 fieldObsOnly) — كما كان */
test('[legacy] تعديلُه على عنصره يُحفظ · وعناصرُ بلا uid كذلك · والكتابةُ في غيرِ المسنَد ترفض كما كانت', async () => {
  saved((await attempt('legacy', () => {}, (v, day) => own(v[day]))).r);
  saved((await attempt('legacy', (x, day) => { x[day].d[0].zones.forEach((z) => { delete z.uid; z.code = 'TEST_ONLY SAME'; }); }, (v, day) => own(v[day]))).r);
  const t = await attempt('legacy', () => {}, (v, day) => { own(v[day]); v[day].d[0].zones[1].cWhy = 'TEST_ONLY عبث'; });
  assert.equal(t.r.status, 403, why(t.r)); assert.equal(t.r.j.denied[KR].why, 'page'); assert.deepEqual(t.after, t.before);
});
