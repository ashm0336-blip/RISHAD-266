/* KIVO_265 — تحقّقُ المراجِع المستقل من إصلاحات 648242f (reports/k265/reviews/verify_648242f.md · PASS مع V-1 وV-2 منخفضَين) — بالوضعين على العامل المولَّد،
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). تُخفق على 648242f أولاً (reports/k265/unified/*_on_648242f.txt):
     (V-1) صفٌّ صار «عاماً» بحذف موظفٍ كان قد أكّد استلامَه أو اعتذر عنه أو انقضت مهلتُه (العمود 20 باقٍ): إسنادُه كما تكتبه صفحةُ 265 (العمود 20 مفرَّغ) يمضي —
           والعمودُ 20 لا ينتقل إلى المكلَّف الجديد (الخادمُ يرفضه task-asg · ونصُّه في الواجهة: tasks_page_verify265)
     (V-2) الحفظُ الخامّ لا يضيف إلى صفوف موظفٍ معرّفَ صورةٍ ليس فيها — ولو في صفٍّ قديمٍ بلا هوية (13) يحمل 21 أصلاً (tkKeepSelf لا يمسّه):
           كان يُكتب فيقرأ الزميلُ صورةَ إثبات غيره (P0) — بالوضعين في شهرٍ مفتوح (والإنفاذُ في الشهر المقفل يمنعه النطاقُ وحده)
   والتحقّقُ من b7538e2 (verify_b7538e2.md): (V-5) إسنادُ صفٍّ بدأه من حُذف كما تكتبه الصفحةُ الآن («بانتظار الاستلام» كاملاً) يمضي ويراه المكلَّفُ غيرَ مقبول
           (الإصلاحُ في الواجهة — tasks_page_verify265 (V-5) يُخفق على b7538e2) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, KE, TAG, DAY, PDAY, stored, putKV, row, hij, HR } from './tasks_fx.mjs';
import { upImg, act } from './tasks_conc_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const allRows = (W) => Object.values(stored(W.env, KT) || {}).flat().filter(Array.isArray);
const saved = (r) => !!(r.j && r.j.revs && r.j.revs[KT]);
const deniedWhy = (r) => (r.j && r.j.denied && r.j.denied[KT] ? r.j.denied[KT].why : '');
const show = (r) => JSON.stringify(r.j || r).slice(0, 260);
async function raw(W, ck, mut, extra) { const g = await get(W, ck, '/api/get?keys=' + encodeURIComponent(KT)); const S = JSON.parse(g.j.keys[KT].v); mut(S); return post(W, ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g.j.keys[KT].rev } }, extra || {})); }

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';
  const WHY = (ks) => (mode === 'enforce' ? { why: Object.fromEntries(ks.map((k) => [k, 'TEST_ONLY سببٌ كما ترسله نافذةُ السبب'])) } : {});

  test(M + '(V-1) مهمةٌ صارت عامةً بحذف من أكّد استلامَها أو اعتذر عنها: إسنادُها بالعمود 20 مفرَّغاً يمضي — ولا ينتقل العمودُ 20 إلى المكلَّف الجديد', async () => {
    for (const r20 of [{ ack: Date.now() - 600e3 }, { at: Date.now() - 600e3, why: 'TEST_ONLY ظرف' }, { exp: Date.now() - 600e3 }]) {
      const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
      const s = Date.now() + 2 * HR, id = 1760000700001;
      const S0 = stored(W.env, KT); S0[DAY].push(row({ id, title: 'يتيمة', s, e: s + HR, st: r20.why ? 'declined' : 'pending', r20 })); putKV(W.env, KT, S0);   /* بعد تنظيف حذف صاحبها: بلا مكلَّف */
      const assign = (clear) => raw(W, dm.ck, (S) => { const i = S[DAY].findIndex((q) => q[13] === id); const q = S[DAY][i].slice(); q[11] = Date.now(); q[12] = null; q[3] = 'in_progress'; q[7] = ['T']; q[8] = MATE.name; q[14] = MATE.eid; if (clear) q[20] = null; S[DAY][i] = q; }, WHY([KT]));
      const keep = await assign(false);
      assert.equal(deniedWhy(keep), 'task-asg', 'بالعمود 20 ⇒ لا ينتقل استلامُ المحذوف أو اعتذارُه: ' + show(keep));
      const ok = await assign(true);
      assert.ok(saved(ok), 'مفرَّغاً (كما تكتبه صفحةُ 265) يمضي: ' + show(ok));
      const r = allRows(W).find((q) => q[13] === id);
      assert.ok(r[14] === MATE.eid && !r[20], JSON.stringify([r[14], r[20]]));
    }
  });

  test(M + '(V-5) مهمةٌ صارت عامةً بحذف من بدأها: إسنادُها بالتعديل كما تكتبه صفحةُ 265 («بانتظار الاستلام» كاملةً) يمضي — والمكلَّفُ الجديد يراها غيرَ مقبولة', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), mate = await W.login(MATE.un, MATE.pw);
    const s = Date.now() + 2 * HR, id = 1760000700002, t0 = Date.now() - 900e3;
    const S0 = stored(W.env, KT), r0 = row({ id, title: 'بدأها المحذوف', s, e: s + HR, st: 'in_progress', acc: t0, r20: { ack: t0 } }); S0[DAY].push(r0); putKV(W.env, KT, S0);
    const b = await raw(W, dm.ck, (S) => { const i = S[DAY].findIndex((q) => q[13] === id); const q = S[DAY][i].slice(); q[3] = 'pending'; q[11] = null; q[12] = null; q[6] = null; q[20] = null; q[7] = ['T']; q[8] = MATE.name; q[14] = MATE.eid; S[DAY][i] = q; }, WHY([KT]));
    assert.ok(saved(b), show(b));
    const l = await get(W, mate.ck, '/api/me/tasks');
    assert.equal(l.status, 200, show(l));
    const v = (l.j.rows || []).find((x) => String(x.id) === String(id));
    assert.ok(v, 'تظهر للمكلَّف الجديد');
    assert.ok(!v.acc && v.ph !== 'running', 'لا قبولَ مستعاراً: ' + JSON.stringify({ acc: v.acc, ph: v.ph, st: v.st }));
  });

  test(M + '(V-2) الحفظُ الخامّ لا يضيف إلى صفوف موظفٍ صورةً ليست فيها — ولو صفّاً قديماً بلا هوية يحمل 21 أصلاً (يومُ اليوم · شهرٌ ماضٍ)', async () => {
    for (const where of ['today', 'past']) {
      const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
      const s = Date.now() - 10 * 60e3, c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' إثباتي', s, e: s + 3 * HR, asg: [ME.eid], rv: 'none', force: true });
      assert.equal(c.status, 200, show(c)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
      const img = await upImg(W, me.ck, 'v2');
      assert.equal((await act(W, me.ck, { k, id, act: 'start' })).status, 200);
      assert.equal((await act(W, me.ck, { k, id, act: 'submit', imgs: [img], note: TAG + ' تم' })).status, 200);
      /* صفٌّ قديمٌ بلا هوية (13) للزميل منجزٌ بتوثيقٍ نصّيّ — في يوم المهمة (يراه مديرُ الإدارة بالوضعين) أو في شهرٍ ماضٍ (مقفلٌ في الإنفاذ) */
      const day = where === 'today' ? k : PDAY, t0 = where === 'today' ? Date.now() - 3 * HR : Date.now() - 51 * HR;
      const S0 = stored(W.env, KT), r0 = row({ title: 'قديمٌ بلا هوية', eid: MATE.eid, st: 'done', acc: t0 + HR, fin: t0 + 2 * HR, s: t0, e: t0 + 3 * HR, r21: { imgs: [], note: TAG + ' قديم', at: t0 + 2 * HR } });
      r0[13] = null; S0[day] = (S0[day] || []).concat([r0]); putKV(W.env, KT, S0);
      const pick = (L) => L.findIndex((q) => q && q[13] == null && q[14] === MATE.eid);
      const b = await raw(W, dm.ck, (S) => { const L = S[day]; const i = pick(L); L[i] = L[i].slice(); L[i][21] = Object.assign({}, L[i][21], { imgs: [img] }); }, WHY([KT]));
      assert.ok(!saved(b), where + ': لا يُكتب: ' + show(b));
      assert.equal(deniedWhy(b), 'task-asg', where + ': قبل الصلاحية والنطاق (taskRawWhy): ' + show(b));
      const rr = (stored(W.env, KT)[day] || []).find((q) => q && q[13] == null && q[14] === MATE.eid);
      assert.ok(!(rr[21].imgs || []).includes(img), where + ': ' + JSON.stringify(rr[21]));
      assert.equal((await get(W, mate.ck, '/api/me/tasks/img?id=' + encodeURIComponent(img))).status, 403, where + ': ولا يقرأ الزميلُ صورةَ إثبات غيره (P0)');
      /* وتعديلُ الصفّ نفسِه بلا صورٍ جديدة يمضي (العنوان) — إلا في شهرٍ مقفلٍ في الإنفاذ (scope) */
      const t = await raw(W, dm.ck, (S) => { const L = S[day]; const i = pick(L); L[i] = L[i].slice(); L[i][0] = TAG + ' عنوانٌ مصحَّح'; }, WHY([KT]));
      if (where === 'today' || mode === 'legacy') assert.ok(saved(t), where + ': تعديلٌ بلا صورٍ جديدة: ' + show(t));
      if (where === 'past') continue;
      /* ولا تراجع (F-10): صفُّ هويةٍ مطابَق — tkKeepSelf يعيد عمودَه 21 من الخادم قبل الحكم فلا تُضاف إليه صورة */
      const S1 = stored(W.env, KT), r1 = row({ id: 1760000700777, title: 'بهوية', eid: MATE.eid, st: 'done', acc: t0 + HR, fin: t0 + 2 * HR, s: t0, e: t0 + 3 * HR, r21: { imgs: [], note: TAG + ' بهوية', at: t0 + 2 * HR } });
      S1[day] = S1[day].concat([r1]); putKV(W.env, KT, S1);
      await raw(W, dm.ck, (S) => { const L = S[day]; const i = L.findIndex((q) => q && q[13] === 1760000700777); L[i] = L[i].slice(); L[i][21] = Object.assign({}, L[i][21], { imgs: [img] }); }, WHY([KT]));
      const r2 = stored(W.env, KT)[day].find((q) => q && q[13] === 1760000700777);
      assert.deepEqual(r2[21].imgs, [], 'بهويةٍ مطابَقة: كما في الخادم');
      assert.equal((await get(W, mate.ck, '/api/me/tasks/img?id=' + encodeURIComponent(img))).status, 403);
    }
  });
}
