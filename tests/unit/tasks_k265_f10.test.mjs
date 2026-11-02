/* KIVO_265 — F-10 في خطّ التطوير المعتمد (الفرع k265 — بقرار المالك 2026-10-14 09:40: «ضمّن الإصلاح في خط التطوير المستقبلي حتى لا يعود العطل»؛
   و15:13: «تأكد من دمج جميع إصلاحات SR-2.3، خصوصًا F-10 وRC-12، وأثبت ذلك باختبارات عدم التراجع»).
   الإصلاحُ في الحزمة SR-2.3 (Production · KIVO_242) منقولاً إلى نموذج مهام المرحلة الثانية على العامل المولَّد (workers/_worker.js) بالوضعين:
     · tkSave (070): حتى TK_TRIES محاولة بمهلةٍ بقدر زمن القاعدة · الرفضُ على نسخةٍ تحرّكت يُعاد بقراءةٍ جديدة ولا يُسجَّل «رفضاً» · الصريحُ حدثٌ واحد
     · tkKeepSelf (070) في applySave (054) للحفظ الخامّ وحده: العمودان 20 و21 كما في الخادم + تقدّمُ الموظف في 3 · 6 · 11 · 12 — لا لمسارات الخادم (opt.srv)
     · 054: ردُّ التعارض للمفتاح المسبوق يقرأ النسخةَ ثم القيمة (F-2) · كنسُ الصور يمتنع إن ذكرها أيُّ مفتاحٍ الآن (F-6)
   الواجهةُ في الاختبار: دمجُ 264 نفسُه (src/api/280 · merge3 بالهوية — k264_vm) — والعاملُ الحقيقيّ فوق node:sqlite بتأخيرٍ عشوائيٍّ في كل جولة D1
   (tasks_conc_fx) فتتشابك الطلباتُ داخل الحفظ فعلاً، والتشابكُ مُثبَتٌ بعدد الحفظات المسبوقة (L). بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY).
     (أ) سبعةُ موظفين ومديرٌ معاً: كلُّ «تم» محفوظ · تعديلُ المدير باقٍ · انقضاءٌ مرةً لكل صفّ · الصورُ باقية · وما لم يُحفظ «أعد المحاولة» (409) لا «رُفض»
     (ج) حفظُ المدير من نسخةٍ لم ترَ أفعالَ الموظف (مباشرةً ثم بالتعارض والدمج) لا يمحوها ولا يكنس صورتَه — ويبقى تعديلُه
     (د) المقصودُ يمضي: إعادةُ الفتح بالتوثيق نفسِه — بمسار الخادم /api/tasks/reopen (صفحةُ 265 · H-1) وبالحفظ الخامّ (تبويبٌ قديم)، وفي الإنفاذ
         بسببه (§12 audit.reason): بلا سبب ⇒ «يتطلب سبباً» ولا يُكتب شيء، ثم بالسبب كما ترسله نافذةُ السبب في 280 · الإسنادُ لغيره والحذف · الاستعادةُ.
         المراجعةُ الموحّدة (R-1 — عالٍ · review_265_unified.md): «الإسنادُ لغيره» بعد قبول الموظف كان يمضي بالحفظ الخامّ — وبدمج الواجهة الحقيقي يُركَّب
         الصفُّ بقبول الأول وإثباته للزميل؛ RC-13 صار في الخادم: بعد النشاط ⇒ 'task-asg' والقبولُ لصاحبه، والمقصودُ يمضي بمساره (/api/tasks/reassign:
         نسخةٌ جديدة بلا قبولٍ مستعار)، وقبل النشاط يمضي بالحفظ الخامّ كما كان — والحذفُ كما كان
     (هـ) لسانٌ قديمٌ يُسقط العمودين 20 و21 ⇒ يعودان والصورةُ باقية
     (و) إنهاءٌ ثانٍ بعد «إعادة المهمة للموظف» (بالمسار وبالحفظ الخامّ) لا يمحوه حفظُ مديرٍ من نسخةٍ قبله — وكشف في 265 أنّ المهمة بلا مراجِع
         كانت تعلق بعد إعادة فتحها «بانتظار قرار المراجِع» (أثرُ التسليم sub من إنجازها) فيُرفض إنهاؤها الثاني ⇒ أُصلح في 070 tkState و546 معاً
     (ز) F-2 · (ح) F-6 · (ط) F-4/F-5 كما في SR-2.3
     (ي) جديدُ المرحلة الثانية في العمود 20: الاستلامُ والتعثّرُ ورفعُه لا يعكسها حفظٌ قديم
     (ك) التسليمُ للمراجِع (21.sub · 12) يبقى أمام حفظٍ قديم ثم يُعتمد بالمسار
     (ل) مساراتُ الخادم لا يمسّها الحفظُ الخامّ: «التمديد» يرفع علامةَ الانقضاء ولا يعيدها حفظٌ قديم
   KIVO_K265F10_ROUNDS عددُ جولات (أ) لكل وضع. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, P0, ME, MATE, KT, DAY, YESTERDAY, TOMORROW, row, stored, putKV, hij, taskCommandBody, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';
import { MgrClient, upImg, act, findRow, sleep, reviewAndApply } from './tasks_conc_fx.mjs';
import { instrument } from './tasks_k265_f10_fx.mjs';
import { loadClient } from './k264_vm.mjs';

const WU = workerUnderTest();
const H = 3600e3, MGR = { un: '0000000101', pw: '70101' };
const ROUNDS = +(process.env.KIVO_K265F10_ROUNDS || 2);
const MODES = (process.env.KIVO_K265F10_MODES || 'legacy,enforce').split(',');
const get = async (Wd, ck) => { const r = await Wd.C.api("/api/operations/read?keys=" + encodeURIComponent(KT), { cookie: ck }); const it = r.j; return { v: JSON.stringify(it.resources[KT]), rev: it.base[KT] }; };
const at = (S, id, eid) => { const f = findRow(S, id, eid); return f ? f.r : null; };
const idx = (S, d, id, eid) => (S[d] || []).findIndex((r) => Array.isArray(r) && r[13] === id && r[14] === eid);
const audN = (Wd, a) => Wd.env.DB.q('SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = ?', KT, a)[0].n;
const imgN = (Wd, id) => Wd.env.DB.q('SELECT COUNT(*) AS n FROM imgs WHERE k = ?', id)[0].n;
const okAct = (r) => r && r.status === 200 && r.j && r.j.ok === 1;
const post = (Wd, ck, p, body) => Wd.C.api(p, { method: 'POST', cookie: ck, body:operationSaveBody(Wd.env,p,taskCommandBody(Wd.env, p, body)) });
const raw = (Wd, ck, v, rev) => post(Wd, ck, '/api/save', { set: { [KT]: typeof v === 'string' ? v : JSON.stringify(v) }, del: [], base: { [KT]: rev } });
/* دمجُ واجهة 264 (280 · merge3 بهوية الصفّ — المفتاحُ يُمرَّر كما تمرّره settle) */
function mergeOf264() {
  const T = loadClient({ C: { req: async () => { throw new Error('offline'); } }, boot: { srv: 1, cf: 1, v: 1, keys: {}, revs: {} } });
  const M = T.W.KIVO.__BS_SRV.merge3;
  return { merge3: (b, m, t) => M(b == null ? null : b, m, t, KT), dispose: () => T.dispose() };
}

for (const mode of MODES) {
  const M = '[' + mode + '] ';

  test(M + '(أ) سبعةُ موظفين ومديرٌ معاً بتشابكٍ حقيقيّ — كلُّ «تم» محفوظ · تعديلُ المدير باقٍ · انقضاءٌ مرةً · وما لم يُحفظ «أعد المحاولة» (' + ROUNDS + ' جولات)', { timeout: 600000 }, async () => {
    const MG = mergeOf264(), report = []; let lostAll = 0;
    try {
      for (let round = 0; round < ROUNDS; round++) {
        const Wd = await world({ worker: WU.file, mode }), now = Date.now(), G = 1760000099001 + round;
        const emps = []; for (const p of P0) emps.push({ p, s: await Wd.login(p.un, p.pw) });
        const dm = await Wd.login(MGR.un, MGR.pw);
        const S = stored(Wd.env, KT);
        for (const { p } of emps) S[DAY].push(row({ id: G, title: 'F10 جولةُ الوردية (جماعية)', eid: p.eid, s: now - 0.5 * H, e: now + 3 * H, grp: 'gF10', grpL: 'F10' }));
        const FIN = [0, 1, 2].map((i) => ({ p: P0[i], id: 1760000099100 + i }));
        FIN.forEach(({ p, id }, i) => S[DAY].push(row({ id, title: 'F10 جاريةٌ للإنهاء ' + i, eid: p.eid, st: 'in_progress', acc: now - H, s: now - 2 * H, e: now + 2 * H })));
        const EXP = []; P0.forEach((p, i) => [0, 1].forEach((q) => { const id = 1760000099200 + i * 10 + q; EXP.push({ p, id }); S[DAY].push(row({ id, title: 'F10 منقضية ' + i + '.' + q, eid: p.eid, s: now - (5 + q) * H, e: now - (2 + q) * H })); }));
        await replaceOperationalFixture(Wd.env, KT, S);
        const imgs = await Promise.all(FIN.slice(0, 2).map(({ p }, i) => upImg(Wd, emps.find((e) => e.p === p).s.ck, 'ka' + round + i)));
        const Mc = new MgrClient(Wd, dm.ck, MG.merge3, KT, 'M'); await Mc.load();                    /* المديرُ فتح الصفحةَ قبل أفعالهم */
        const DB = instrument(Wd.env, { jitter: 4 }); const ev0 = audN(Wd, 'expired');
        const ops = [], spread = (fn) => sleep(Math.random() * 900).then(fn);
        const mk = (kind, p, id, body, img) => ({ kind, p, id, body, img, tag: kind + ':' + p.eid + ':' + id });
        const plan = [];
        for (const p of P0) plan.push(mk('accept', p, G, { k: DAY, id: G, act: 'accept' }));
        FIN.forEach(({ p, id }, i) => plan.push(mk('finish', p, id, { k: DAY, id, act: 'finish', imgs: i < 2 ? [imgs[i]] : [], note: 'TEST_ONLY تم ' + i }, i < 2 ? imgs[i] : null)));
        for (const { p, id } of EXP) plan.push(mk('expire', p, id, { k: DAY, id, act: 'expire' }));
        for (const o of plan) ops.push(spread(() => act(Wd, emps.find((e) => e.p === o.p).s.ck, o.body, o.tag).then((r) => Object.assign(o, { r }))));
        const NEW = 1760000099999 - round;
        const managerIntent = (T) => {
          T[DAY].push(row({ id: NEW, title: 'F10 مهمةٌ جديدة من المدير', eid: MATE.eid, s: now + H, e: now + 3 * H }));
          const gi = T[DAY].findIndex((r) => r[13] === 1760000000901); T[DAY][gi] = T[DAY][gi].slice(); T[DAY][gi][0] = 'TEST_ONLY عامة ١ — عدّلها المدير';
          for (const r of T[DAY]) if (r[13] === G) r[1] = 'TEST_ONLY وصفٌ عدّله المدير';
        };
        const mgr = spread(() => Mc.edit(managerIntent));
        await Promise.all(ops); let mr = await mgr; const lost = DB.lost(); lostAll += lost;
        if (!mr.ok) {
          assert.equal(mr.status,409);assert.equal(mr.retainedDraft,true);
          const draft=Mc.mem,ticket=Mc.ticket.body,beforeReview=stored(Wd.env,KT),same=await Mc.retry();
          assert.equal(same.status,409);assert.equal(Mc.mem,draft);assert.equal(Mc.ticket.body,ticket);assert.deepEqual(stored(Wd.env,KT),beforeReview);
          await Mc.load();mr=await Mc.edit(managerIntent); // Explicit review after concurrent operations settled.
        }
        assert.ok(mr.ok, 'حفظُ المدير: ' + JSON.stringify(mr).slice(0, 300));
        let F = stored(Wd.env, KT); const bad = [], fails = {};
        for (const o of plan) {
          if (!okAct(o.r)) { const e = o.r.status + ':' + (o.r.j && o.r.j.err); fails[e] = (fails[e] || 0) + 1; continue; }
          const x = at(F, o.id, o.p.eid);
          if (o.kind === 'accept' && !(x && x[11] && x[3] === 'in_progress')) bad.push('accept ' + o.p.eid);
          if (o.kind === 'finish' && !(x && x[3] === 'done' && x[12] && x[21] && (!o.img || (x[21].imgs || []).includes(o.img)))) bad.push('finish ' + o.p.eid);
          if (o.kind === 'expire' && !(x && x[20] && x[20].exp)) bad.push('expire ' + o.p.eid + '#' + o.id);
        }
        assert.deepEqual(bad, [], 'كلُّ «تم» محفوظ — ضاع: ' + bad.join(' · '));
        assert.deepEqual(Object.keys(fails).filter((e) => !/^409:busy$/.test(e)), [], 'ما لم يُحفظ رُدّ «أعد المحاولة» (409 busy) وحده: ' + JSON.stringify(fails));
        const retry = plan.filter((o) => !okAct(o.r));
        for (const o of retry) for (let t = 0; t < 5 && !okAct(o.r); t++) o.r = await act(Wd, emps.find((e) => e.p === o.p).s.ck, o.body, o.tag + ':retry');
        assert.ok(retry.every((o) => okAct(o.r)), 'إعادةُ المحاولة تحفظ: ' + JSON.stringify(retry.map((o) => [o.kind, o.r.status, o.r.j && o.r.j.err])));
        F = stored(Wd.env, KT);
        for (const o of plan) { const x = at(F, o.id, o.p.eid); assert.ok(o.kind === 'accept' ? x[11] && x[3] === 'in_progress' : o.kind === 'finish' ? x[3] === 'done' && x[21] : x[20] && x[20].exp, 'محفوظٌ في النهاية: ' + o.tag); }
        assert.ok(at(F, NEW, MATE.eid), 'مهمةُ المدير الجديدة باقية');
        assert.equal(F[DAY].find((r) => r[13] === 1760000000901)[0], 'TEST_ONLY عامة ١ — عدّلها المدير', 'تعديلُ المدير باقٍ');
        assert.ok(F[DAY].filter((r) => r[13] === G).every((r) => r[1] === 'TEST_ONLY وصفٌ عدّله المدير'), 'وصفُ المدير على صفوف المهمة الجماعية باقٍ (مع قبولاتها)');
        /* RISHAD266: قراءةُ المدير (Mc.load) تجري مسحَ المواعيد في الخادم كما كان طلبُ صفحة المهام يفعل — فقد يسبق المسحُ الموظفَ إلى الانقضاء.
           الثابتُ هو هو: حدثُ انقضاءٍ واحدٌ لكل صفّ، أيّاً كان مسجِّلُه */
        void ev0; const expN = Wd.env.DB.q("SELECT ename, COUNT(*) AS n FROM aud WHERE k = ? AND act = 'expired' AND ename LIKE '%F10 منقضية%' GROUP BY ename", KT);
        assert.equal(expN.length, EXP.length, 'لكل صفٍّ منقضٍ حدثُه'); assert.ok(expN.every((r) => r.n === 1), 'حدثُ انقضاءٍ واحدٌ لكل صفّ (لا تكرار): ' + JSON.stringify(expN));
        for (const id of imgs) { assert.equal(imgN(Wd, id), 1, 'صورةُ الإثبات مخزّنة ' + id); assert.equal(Wd.env.DB.q('SELECT st FROM imgown WHERE img = ?', id)[0].st, 'bound'); }
        assert.equal(Wd.env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'denied' AND uid LIKE 'tst_p0e%'")[0].n, 0, 'لا سطرَ «رفض» أمنياً لموظفٍ لم يُرفض (F-5)');
        report.push({ round, ops: plan.length, lost, busy: retry.length, mgrTries: mr.tries });
        const n1 = audN(Wd, 'expired');
        const again = await Promise.all(EXP.map(({ p, id }) => act(Wd, emps.find((e) => e.p === p).s.ck, { k: DAY, id, i: idx(F, DAY, id, p.eid), act: 'expire' }, 'again')));
        assert.ok(again.every((r) => okAct(r) && r.j.noop === 1), '(ب) noop: ' + JSON.stringify(again.map((r) => [r.status, r.j.noop, r.j.err])));
        assert.equal(audN(Wd, 'expired'), n1, '(ب) لا حدثَ انقضاءٍ جديد');
      }
      assert.ok(lostAll > 0, 'التشابكُ حقيقيّ: حفظاتٌ سُبقت فرُدّت تعارضاً (' + lostAll + ')');
      console.log('# ' + M + '(أ) ' + JSON.stringify(report));
    } finally { MG.dispose(); }
  });

  test(M + '(ج) حفظُ المدير من نسخةٍ لم ترَ أفعالَ الموظف لا يمحوها ولا يكنس صورتَه — ويبقى تعديلُه (مباشرةً، ثم بالتعارض ودمج 264)', async () => {
    const MG = mergeOf264();
    try {
      for (const via of ['direct', 'merge3']) {
        const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
        const old = await get(Wd, dm.ck), S = JSON.parse(old.v);
        const img = await upImg(Wd, me.ck, 'kc' + via);
        const rs = [await act(Wd, me.ck, { k: DAY, id: 1760000000101, i: idx(S, DAY, 1760000000101, ME.eid), act: 'accept' }),
          await act(Wd, me.ck, { k: DAY, id: 1760000000103, i: idx(S, DAY, 1760000000103, ME.eid), act: 'finish', imgs: [img], note: 'TEST_ONLY أُنجزت' }),
          await act(Wd, me.ck, { k: DAY, id: 1760000000102, i: idx(S, DAY, 1760000000102, ME.eid), act: 'decline', why: 'TEST_ONLY ظرف' }),
          await act(Wd, me.ck, { k: YESTERDAY, id: 1760000000105, i: idx(S, YESTERDAY, 1760000000105, ME.eid), act: 'expire' })];
        for (const r of rs) assert.equal(r.j.ok, 1, via + ': فعلُ الموظف ' + JSON.stringify(r.j).slice(0, 200));
        const Mv = JSON.parse(old.v), ix = idx(Mv, DAY, 1760000000101, ME.eid); Mv[DAY][ix] = Mv[DAY][ix].slice(); Mv[DAY][ix][0] = 'TEST_ONLY عنوانٌ عدّله المدير';
        let ok;
        if (via === 'direct') { const cur = await get(Wd, dm.ck); const r = await raw(Wd, dm.ck, Mv, cur.rev); ok = !!(r.j.revs && r.j.revs[KT]); }
        else { const C = new MgrClient(Wd, dm.ck, MG.merge3, KT, 'M'); C.mem = old.v; C.baseVal = old.v; C.krev = old.rev; ok = (await reviewAndApply(C, (T) => { const q = idx(T, DAY, 1760000000101, ME.eid); T[DAY][q] = T[DAY][q].slice(); T[DAY][q][0] = 'TEST_ONLY عنوانٌ عدّله المدير'; })).ok; }
        assert.ok(ok, via + ': حفظُ المدير');
        const F = stored(Wd.env, KT), a = at(F, 1760000000101, ME.eid), f = at(F, 1760000000103, ME.eid), d = at(F, 1760000000102, ME.eid), x = at(F, 1760000000105, ME.eid);
        assert.equal(a[0], 'TEST_ONLY عنوانٌ عدّله المدير', via + ': تعديلُ المدير باقٍ'); assert.ok(a[11] && a[3] === 'in_progress', via + ': القبولُ باقٍ');
        assert.ok(f[3] === 'done' && f[12] && f[21] && f[21].imgs.includes(img) && f[21].note === 'TEST_ONLY أُنجزت', via + ': الإنهاءُ بتوثيقه باقٍ');
        assert.ok(d[3] === 'declined' && d[20] && d[20].at && d[20].why === 'TEST_ONLY ظرف', via + ': الاعتذارُ باقٍ');
        assert.ok(x[20] && x[20].exp, via + ': علامةُ الانقضاء باقية (فلا يتكرّر حدثُها)');
        assert.equal(imgN(Wd, img), 1, via + ': صورةُ الإثبات لم تُكنس'); assert.equal(Wd.env.DB.q('SELECT st FROM imgown WHERE img = ?', img)[0].st, 'bound', via + ': ومربوطة');
        /* RISHAD266: قراءةُ المدير تجري مسحَ المواعيد (فتنقضي صفوفُ التجهيزة الفائتة الأخرى أيضاً) — الثابتُ: حدثُ انقضاءٍ واحدٌ لهذا الصف */
        assert.equal(Wd.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'expired' AND ename = ?", KT, String(x[0]).slice(0, 160))[0].n, 1, via + ': حدثُ انقضاءٍ واحد');
      }
    } finally { MG.dispose(); }
  });

  test(M + '(د) المقصودُ يمضي: إعادةُ فتح المنجزة بتوثيقها (مسارُ الخادم · والحفظُ الخامّ بسببه في الإنفاذ) · الإسنادُ لغيره والحذف · الاستعادةُ كما هي', async () => {
    {                                                                                                  /* صفحةُ 265 (H-1): _doReopen ⇒ /api/tasks/reopen */
      const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
      const S = stored(Wd.env, KT), img = await upImg(Wd, me.ck, 'kdroute');
      assert.equal((await act(Wd, me.ck, { k: DAY, id: 1760000000103, i: idx(S, DAY, 1760000000103, ME.eid), act: 'finish', imgs: [img], note: 'TEST_ONLY' })).j.ok, 1);
      const ro = await post(Wd, dm.ck, '/api/tasks/reopen', Object.assign({ k: DAY, id: 1760000000103, ekey: ME.eid }, mode === 'enforce' ? { why: 'TEST_ONLY سببُ إعادة الفتح' } : {}));   /* k265-fix: في الإنفاذ بالسبب كما ترسله نافذةُ 280 (askReason) */
      assert.equal(ro.status, 200, 'إعادةُ الفتح بالمسار: ' + JSON.stringify(ro.j).slice(0, 200));
      const x = at(stored(Wd.env, KT), 1760000000103, ME.eid);
      assert.ok(x[3] === 'in_progress' && x[12] == null && x[21] && x[21].imgs.includes(img), 'جاريةٌ من جديد بتوثيقها (المسار)');
      assert.equal(ro.j.st.exe, 'in_progress', 'بلا مراجِع: لا «بانتظار المراجِع» بعد إعادة الفتح — ' + JSON.stringify(ro.j.st));
    }
    {                                                                                                  /* تبويبٌ قديم / الوضعُ المحلي: _doReopen بحفظٍ خامّ */
      const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
      const S = stored(Wd.env, KT), img = await upImg(Wd, me.ck, 'kdreopen');
      assert.equal((await act(Wd, me.ck, { k: DAY, id: 1760000000103, i: idx(S, DAY, 1760000000103, ME.eid), act: 'finish', imgs: [img], note: 'TEST_ONLY' })).j.ok, 1);
      const g = await get(Wd, dm.ck), Mv = JSON.parse(g.v), ix = idx(Mv, DAY, 1760000000103, ME.eid);
      Mv[DAY][ix] = Mv[DAY][ix].slice(); Mv[DAY][ix][3] = 'in_progress'; Mv[DAY][ix][12] = null; Mv[DAY][ix][6] = null;          /* _doReopen */
      if (mode === 'enforce') {                                                                        /* §12 audit.reason: بلا سبب ⇒ تُعلَّق وتُسأل نافذةُ السبب (280 reasonAsk9) */
        const r0 = await raw(Wd, dm.ck, Mv, g.rev), d0 = r0.j.denied && r0.j.denied[KT];
        assert.ok(!(r0.j.revs && r0.j.revs[KT]) && d0 && d0.why === 'reason', 'الإنفاذ: إعادةُ الفتح بحفظٍ خامّ بلا سبب ⇒ «يتطلب سبباً»: ' + JSON.stringify(r0.j).slice(0, 200));
        assert.equal(at(stored(Wd.env, KT), 1760000000103, ME.eid)[3], 'done', 'ولا يُكتب شيءٌ بلا سبب');
      }
      const r = await post(Wd, dm.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(Mv) }, del: [], base: { [KT]: g.rev } }, mode === 'enforce' ? { why: { [KT]: 'TEST_ONLY سببُ إعادة الفتح' } } : {}));
      assert.ok(r.j.revs && r.j.revs[KT], 'إعادةُ الفتح تُكتب: ' + JSON.stringify(r.j).slice(0, 200));
      const x = at(stored(Wd.env, KT), 1760000000103, ME.eid);
      assert.ok(x[3] === 'in_progress' && x[12] == null && x[21] && x[21].imgs.includes(img), 'جاريةٌ من جديد بتوثيقها');
    }
    {                                                                                                  /* R-1: الإسنادُ لغيره بعد القبول — رفضٌ مسمّى بالحفظ الخامّ ويمضي بمساره */
      const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
      const old = await get(Wd, dm.ck), S = JSON.parse(old.v);
      assert.equal((await act(Wd, me.ck, { k: DAY, id: 1760000000101, i: idx(S, DAY, 1760000000101, ME.eid), act: 'accept' })).j.ok, 1);
      const Mv = JSON.parse(old.v), ix = idx(Mv, DAY, 1760000000101, ME.eid);
      Mv[DAY][ix] = Mv[DAY][ix].slice(); Mv[DAY][ix][14] = MATE.eid; Mv[DAY][ix][8] = MATE.name; Mv[DAY][ix][7] = [MATE.name.charAt(0)];
      const cur = await get(Wd, dm.ck);
      const r = await raw(Wd, dm.ck, Mv, cur.rev);
      assert.ok(!(r.j.revs && r.j.revs[KT]) && r.j.denied && r.j.denied[KT] && r.j.denied[KT].why === 'task-asg', 'بعد القبول: رفضٌ مسمّى (RC-13 في الخادم): ' + JSON.stringify(r.j).slice(0, 200));
      let F = stored(Wd.env, KT); const a0 = at(F, 1760000000101, ME.eid);
      assert.ok(a0 && a0[11] && a0[3] === 'in_progress', 'القبولُ لصاحبه'); assert.equal(at(F, 1760000000101, MATE.eid), null, 'ولا صفَّ للزميل بقبولٍ مستعار');
      const ra = await post(Wd, dm.ck, '/api/tasks/reassign', { k: DAY, id: 1760000000101, from: ME.eid, to: MATE.eid, force: true });
      assert.equal(ra.status, 200, 'المقصودُ يمضي بمساره: ' + JSON.stringify(ra.j).slice(0, 200));
      F = stored(Wd.env, KT); const y = at(F, ra.j.row.id, MATE.eid);
      assert.ok(y && !y[11] && y[3] === 'pending', 'المسنَدُ الجديد بلا قبولٍ مُستعار');
      assert.ok(at(F, 1760000000101, ME.eid)[11], 'وقبولُ الأول باقٍ في صفّه');
      /* قبل النشاط: الإسنادُ لغيره بالحفظ الخامّ والحذفُ يمضيان كما كانا */
      const g2 = await get(Wd, dm.ck), M2 = JSON.parse(g2.v), i2 = idx(M2, DAY, 1760000000102, ME.eid);
      M2[DAY][i2] = M2[DAY][i2].slice(); M2[DAY][i2][14] = MATE.eid; M2[DAY][i2][8] = MATE.name; M2[DAY][i2][7] = [MATE.name.charAt(0)];
      M2[TOMORROW] = M2[TOMORROW].filter((q) => q[13] !== 1760000000104);
      const r2 = await raw(Wd, dm.ck, M2, g2.rev);
      assert.ok(r2.j.revs && r2.j.revs[KT], 'قبل النشاط: ' + JSON.stringify(r2.j).slice(0, 200));
      F = stored(Wd.env, KT);
      assert.ok(at(F, 1760000000102, MATE.eid) && at(F, 1760000000102, ME.eid) === null, 'أُسندت لغيره');
      assert.equal(at(F, 1760000000104, ME.eid), null, 'المحذوفةُ لا تعود');
      assert.equal(Wd.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'accepted'", KT)[0].n, 1, 'قبولُ الموظف باقٍ في السجل');
    }
    {
      const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw);
      const old = await get(Wd, Wd.su.ck), S = JSON.parse(old.v);
      assert.equal((await act(Wd, me.ck, { k: DAY, id: 1760000000101, i: idx(S, DAY, 1760000000101, ME.eid), act: 'accept' })).j.ok, 1);
      const cur = await get(Wd, Wd.su.ck), audR = () => [{ cid: 'rstTEST' + Date.now().toString(36), k: KT, etype: 'dataset', act: 'restore', eid: 'bassam_tasks_v1', ename: 'TEST_ONLY استعادة' }];
      if (mode === 'enforce') {                                                                        /* الإنفاذ: الاستعادةُ عمليةٌ محميةٌ بسببها (backup.restore · §12) */
        const r0 = await post(Wd, Wd.su.ck, '/api/save', { set: { [KT]: old.v }, del: [], base: { [KT]: cur.rev }, aud: audR() }), d0 = r0.j.denied && r0.j.denied[KT];
        assert.ok(!(r0.j.revs && r0.j.revs[KT]) && d0 && d0.why === 'reason', 'الإنفاذ: استعادةٌ بلا سبب ⇒ «يتطلب سبباً»: ' + JSON.stringify(r0.j).slice(0, 200));
      }
      const r = await post(Wd, Wd.su.ck, '/api/save', Object.assign({ set: { [KT]: old.v }, del: [], base: { [KT]: cur.rev }, aud: audR() },
        mode === 'enforce' ? { ops: { [KT]: { op: 'backup.restore', scope: 'full', mode: 'replace', reason: 'TEST_ONLY سببُ الاستعادة' } } } : {}));
      assert.ok(r.j.revs && r.j.revs[KT], 'الاستعادةُ تُكتب: ' + JSON.stringify(r.j).slice(0, 200));
      assert.equal(JSON.stringify(stored(Wd.env, KT)), JSON.stringify(JSON.parse(old.v)), 'القيمةُ المستعادة حرفاً');
    }
  });

  test(M + '(هـ) لسانٌ قديمٌ يُسقط العمودين 20 و21 عند تعديل المهمة ⇒ يعودان والصورةُ باقية', async () => {
    const Wd = await world({ worker: WU.file, mode }), dm = await Wd.login(MGR.un, MGR.pw);
    const g = await get(Wd, dm.ck), Mv = JSON.parse(g.v);
    const dn = idx(Mv, YESTERDAY, 1760000000106, ME.eid); const before = Mv[YESTERDAY][dn].slice();
    Mv[YESTERDAY][dn] = Mv[YESTERDAY][dn].slice(0, 20); Mv[YESTERDAY][dn][0] = 'TEST_ONLY عدّلها لسانٌ قديم';
    const r = await raw(Wd, dm.ck, Mv, g.rev);
    assert.ok(r.j.revs && r.j.revs[KT], 'حُفظ: ' + JSON.stringify(r.j).slice(0, 200));
    const x = at(stored(Wd.env, KT), 1760000000106, ME.eid);
    assert.equal(x[0], 'TEST_ONLY عدّلها لسانٌ قديم'); assert.ok(x[21] && Array.isArray(x[21].imgs) && x[21].imgs.length === 1, 'التوثيقُ عاد');
    assert.equal(JSON.stringify(x[21]), JSON.stringify(before[21]), 'التوثيقُ كما كان حرفاً'); assert.equal(JSON.stringify(x[20] == null ? null : x[20]), JSON.stringify(before[20] == null ? null : before[20]), 'والعمودُ 20 كما كان');
    assert.equal(imgN(Wd, x[21].imgs[0]), 1, 'وصورتُه لم تُكنس');
  });

  test(M + '(و) إنهاءٌ ثانٍ بعد «إعادة المهمة للموظف» (بالمسار وبالحفظ الخامّ) لا يمحوه حفظُ مديرٍ من نسخةٍ قبله — ولا تُكنس صورتُه الجديدة', async () => {
    const MG = mergeOf264();
    try {
      for (const via of ['route', 'raw']) {
        const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
        let S = stored(Wd.env, KT); const p1 = await upImg(Wd, me.ck, 'kfone' + via), p2 = await upImg(Wd, me.ck, 'kftwo' + via);
        assert.equal((await act(Wd, me.ck, { k: DAY, id: 1760000000103, i: idx(S, DAY, 1760000000103, ME.eid), act: 'finish', imgs: [p1], note: 'TEST_ONLY الأول' })).j.ok, 1);
        const A = new MgrClient(Wd, dm.ck, MG.merge3, KT, 'A'); await A.load();
        if (via === 'route') assert.equal((await post(Wd, dm.ck, '/api/tasks/reopen', Object.assign({ k: DAY, id: 1760000000103, ekey: ME.eid }, mode === 'enforce' ? { why: 'TEST_ONLY سببُ الإعادة' } : {}))).status, 200, via + ': إعادةُ المهمة للموظف');
        else assert.ok((await reviewAndApply(A, (T) => { const q = idx(T, DAY, 1760000000103, ME.eid); T[DAY][q] = T[DAY][q].slice(); T[DAY][q][3] = 'in_progress'; T[DAY][q][12] = null; T[DAY][q][6] = null; }, mode === 'enforce' ? { why: { [KT]: 'TEST_ONLY سببُ الإعادة' } } : {})).ok, via + ': إعادةُ المهمة للموظف');
        await sleep(5);
        S = stored(Wd.env, KT);
        const f2 = await act(Wd, me.ck, { k: DAY, id: 1760000000103, i: idx(S, DAY, 1760000000103, ME.eid), act: 'finish', imgs: [p2], note: 'TEST_ONLY الثاني' });
        assert.equal(f2.j.ok, 1, via + ': الإنهاءُ الثاني «تم» — ' + JSON.stringify(f2.j).slice(0, 200));
        assert.ok((await reviewAndApply(A, (T) => { const q = T[DAY].findIndex((r) => r[13] === 1760000000901); T[DAY][q] = T[DAY][q].slice(); T[DAY][q][0] = 'TEST_ONLY عدّلها المديرُ بعد الإعادة'; })).ok, via + ': حفظُ المدير');
        const F = stored(Wd.env, KT), x = at(F, 1760000000103, ME.eid);
        assert.ok(x[3] === 'done' && x[12] && x[21] && x[21].imgs.includes(p2) && x[21].note === 'TEST_ONLY الثاني', via + ': الإنهاءُ الثاني بتوثيقه باقٍ: ' + JSON.stringify([x[3], x[12], x[21]]));
        assert.equal(F[DAY].find((r) => r[13] === 1760000000901)[0], 'TEST_ONLY عدّلها المديرُ بعد الإعادة', via + ': وتعديلُ المدير باقٍ');
        assert.equal(imgN(Wd, p2), 1, via + ': صورةُ الإنهاء الثاني لم تُكنس');
        assert.equal((await Wd.C.api('/api/me/tasks/img?id=' + encodeURIComponent(p2), { cookie: me.ck })).status, 200, via + ': ويقرؤها صاحبُها');
      }
    } finally { MG.dispose(); }
  });

  test(M + '(ز) F-2: ردُّ التعارض لحفظٍ مسبوق متّسق — حفظُ مديرٍ آخر يقع بين قراءتيه لا يمحوه الإرسالُ التالي', async () => {
    const MG = mergeOf264();
    try {
      const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
      const DB = instrument(Wd.env, { jitter: 0 });
      const B = new MgrClient(Wd, Wd.su.ck, MG.merge3, KT, 'B'); await B.load();
      let eRes = null, aRes = null;
      DB.hook({ who: 'B', kind: 'batch', phase: 'before', match: (sql) => /KIVO_REV_CONFLICT/.test(sql) && /(?:INSERT INTO|DELETE FROM) ops_/.test(sql), run: async () => {
        eRes = await act(Wd, me.ck, { k: DAY, id: 1760000000101, act: 'accept' }, 'E');
        const A = new MgrClient(Wd, dm.ck, MG.merge3, KT, 'A'); await A.load();
        aRes = await reviewAndApply(A, (T) => { const q = T[YESTERDAY].findIndex((r) => r[13] === 1760000000201 && r[14] === MATE.eid); T[YESTERDAY][q] = T[YESTERDAY][q].slice(); T[YESTERDAY][q][0] = 'TEST_ONLY عدّلها A'; });
      } });
      const bRes = await reviewAndApply(B, (T) => { const q = T[TOMORROW].findIndex((r) => r[13] === 1760000000902); T[TOMORROW][q] = T[TOMORROW][q].slice(); T[TOMORROW][q][0] = 'TEST_ONLY عدّلها B'; });
      const F = stored(Wd.env, KT);
      assert.ok(okAct(eRes), 'قبولُ E «تم»'); assert.ok((DB.trace.B || '').includes('L'), 'حارسُ B سُبق (' + DB.trace.B + ')');
      assert.ok(aRes && aRes.ok, 'حفظُ A في النافذة «تم»'); assert.ok(bRes.ok, 'حفظُ B «تم» في النهاية');
      assert.equal(at(F, 1760000000902)[0], 'TEST_ONLY عدّلها B', 'تعديلُ B باقٍ');
      assert.equal(at(F, 1760000000201, MATE.eid)[0], 'TEST_ONLY عدّلها A', 'تعديلُ A (يومٌ آخر) باقٍ — لم يمحه إرسالُ B التالي');
      const a = at(F, 1760000000101, ME.eid); assert.ok(a[11] && a[3] === 'in_progress', 'قبولُ E باقٍ');
    } finally { MG.dispose(); }
  });

  test(M + '(ح) F-6: كنسُ الصور المتأخّر من حفظٍ أقدم لا يحذف صورةَ إثباتٍ أحدث', async () => {
    const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), mate = await Wd.login(MATE.un, MATE.pw);
    const p1 = await upImg(Wd, me.ck, 'khone'), p2 = await upImg(Wd, mate.ck, 'khtwo');
    const DB = instrument(Wd.env, { jitter: 0 }); let r2 = null;
    DB.hook({ who: 'E1', kind: 'stmt', phase:'after', match: (sql) => /^SELECT img,k FROM imgref WHERE /.test(sql), run: async () => { r2 = await act(Wd, mate.ck, { k: DAY, id: 1760000000202, act: 'finish', imgs: [p2], note: 'TEST_ONLY E2' }, 'E2'); } });
    const r1 = await act(Wd, me.ck, { k: DAY, id: 1760000000103, act: 'finish', imgs: [p1], note: 'TEST_ONLY E1' }, 'E1');
    assert.ok(okAct(r1) && okAct(r2), 'الإنهاءان «تم»: ' + JSON.stringify([r1.status, r1.j, r2 && r2.status]).slice(0, 300));
    const f2 = at(stored(Wd.env, KT), 1760000000202, MATE.eid);
    assert.ok(f2[3] === 'done' && f2[21].imgs.includes(p2), 'المخزنُ يذكر صورةَ E2');
    assert.equal(imgN(Wd, p2), 1, 'صورةُ E2 لم تُكنس'); assert.equal(imgN(Wd, p1), 1, 'ولا صورةُ E1');
    assert.equal((await Wd.C.api('/api/me/tasks/img?id=' + encodeURIComponent(p2), { cookie: mate.ck })).status, 200, 'ويقرؤها صاحبُها');
  });

  test(M + '(ط) F-4/F-5: نفادُ المحاولات على رفضٍ بنسخةٍ تحرّكت ⇒ 409 «أعد المحاولة» لا 403 · ولا سطرَ «رفض» أمنياً للموظف', { timeout: 120000 }, async () => {
    const MG = mergeOf264();
    try {
      const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
      const DB = instrument(Wd.env, { jitter: 0 }); let n = 0;
      const Mc = new MgrClient(Wd, dm.ck, MG.merge3, KT, 'M');
      DB.hook({ who: 'E', kind: 'batch', phase: 'before', repeat: true, match: (sql) => /KIVO_REV_CONFLICT/.test(sql) && /(?:INSERT INTO|DELETE FROM) ops_/.test(sql), run: async () => { await Mc.load(); await reviewAndApply(Mc, (T) => { T[DAY].push(row({ id: 1760000088000 + (++n), title: 'TEST_ONLY صفُّ المدير ' + n, eid: MATE.eid, s: Date.now() + H, e: Date.now() + 2 * H })); }); } });
      const r = await act(Wd, me.ck, { k: DAY, id: 1760000000101, act: 'accept' }, 'E');
      assert.equal(r.status, 409, 'نفدت المحاولات ⇒ 409: ' + JSON.stringify(r.j)); assert.equal(r.j.err, 'busy');
      assert.ok(n >= 2, 'المحاولاتُ أُعيدت (' + n + ')');
      assert.equal(Wd.env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE act = 'denied' AND uid = ?", ME.uid)[0].n, 0, 'لا سطرَ «رفض» أمنياً للموظف');
      const x = at(stored(Wd.env, KT), 1760000000101, ME.eid); assert.ok(!x[11], 'لم يُكتب شيءٌ لم يُعلَن');
      DB.hooks.length = 0;
      const r2 = await act(Wd, me.ck, { k: DAY, id: 1760000000101, act: 'accept' }, 'E');
      assert.ok(okAct(r2), 'إعادةُ المحاولة بعد هدوء التزامن تحفظ');
    } finally { MG.dispose(); }
  });

  test(M + '(ي) العمودُ 20 في المرحلة الثانية: الاستلامُ والتعثّرُ ورفعُه لا يعكسها حفظُ مديرٍ من نسخةٍ قديمة', async () => {
    const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
    const S = stored(Wd.env, KT);
    assert.equal((await act(Wd, me.ck, { k: DAY, id: 1760000000103, i: idx(S, DAY, 1760000000103, ME.eid), act: 'stall', why: 'TEST_ONLY عائق' })).j.ok, 1, 'تعثّر');
    const withStall = await get(Wd, dm.ck);                                                       /* المديرُ رأى التعثّر */
    assert.equal((await act(Wd, me.ck, { k: DAY, id: 1760000000103, act: 'resume' })).j.ok, 1, 'رُفع التعثّر');
    assert.equal((await act(Wd, me.ck, { k: DAY, id: 1760000000101, act: 'ack' })).j.ok, 1, 'استلام');
    const Mv = JSON.parse(withStall.v), q = idx(Mv, DAY, 1760000000103, ME.eid); Mv[DAY][q] = Mv[DAY][q].slice(); Mv[DAY][q][0] = 'TEST_ONLY عدّلها المدير من نسخةٍ قديمة';
    const cur = await get(Wd, dm.ck);
    const r = await raw(Wd, dm.ck, Mv, cur.rev); assert.ok(r.j.revs && r.j.revs[KT], 'حفظُ المدير: ' + JSON.stringify(r.j).slice(0, 200));
    const F = stored(Wd.env, KT), x = at(F, 1760000000103, ME.eid), a = at(F, 1760000000101, ME.eid);
    assert.equal(x[0], 'TEST_ONLY عدّلها المدير من نسخةٍ قديمة', 'تعديلُ المدير باقٍ');
    assert.ok(!(x[20] && x[20].stall), 'التعثّرُ المرفوع لا يعود من نسخة المدير القديمة: ' + JSON.stringify(x[20]));
    assert.ok(a[20] && a[20].ack, 'الاستلامُ باقٍ');
  });

  test(M + '(ك) التسليمُ للمراجِع يبقى أمام حفظِ مديرٍ من نسخةٍ قبله — ثم يُعتمد بالمسار', async () => {
    const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
    const s = Date.now() + H, c = await post(Wd, dm.ck, '/api/tasks/create', { k: hij(s), t: 'TEST_ONLY للمراجعة', s, e: s + 2 * H, asg: [ME.eid], win: { early: 240 } });   /* KIVO_265 · نافذةُ التنفيذ: البدءُ قبل الموعد بساعة */
    assert.equal(c.status, 200, JSON.stringify(c.j)); const id = c.j.rows[0].id, k = c.j.rows[0].k;
    assert.equal((await act(Wd, me.ck, { k, id, act: 'start' })).status, 200);
    const old = await get(Wd, dm.ck);                                                              /* المديرُ قبل التسليم */
    const img = await upImg(Wd, me.ck, 'kksub');
    const sb = await act(Wd, me.ck, { k, id, act: 'submit', imgs: [img], note: 'TEST_ONLY سُلّمت' }); assert.equal(sb.status, 200, JSON.stringify(sb.j));
    const Mv = JSON.parse(old.v), q = idx(Mv, k, id, ME.eid); Mv[k][q] = Mv[k][q].slice(); Mv[k][q][1] = 'TEST_ONLY وصفٌ عدّله المدير';
    const cur = await get(Wd, dm.ck);
    const r = await raw(Wd, dm.ck, Mv, cur.rev); assert.ok(r.j.revs && r.j.revs[KT], 'حفظُ المدير: ' + JSON.stringify(r.j).slice(0, 200));
    let x = at(stored(Wd.env, KT), id, ME.eid);
    assert.equal(x[1], 'TEST_ONLY وصفٌ عدّله المدير', 'تعديلُ المدير باقٍ');
    assert.ok(x[21] && x[21].sub && x[21].imgs.includes(img) && x[12], 'التسليمُ باقٍ (21.sub · 12): ' + JSON.stringify([x[12], x[21]]));
    const v = (await Wd.C.api('/api/me/tasks', { cookie: me.ck })).j.rows.find((o) => String(o.id) === String(id));
    assert.equal(v.review, 'pending', 'بانتظار المراجِع');
    const ap = await post(Wd, dm.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'approve' }); assert.equal(ap.status, 200, JSON.stringify(ap.j));
    x = at(stored(Wd.env, KT), id, ME.eid); assert.equal(x[3], 'done', 'اعتُمدت');
    assert.equal(imgN(Wd, img), 1, 'صورةُ التسليم باقية');
  });

  test(M + '(ل) مساراتُ الخادم لا يمسّها الحفظُ الخامّ: «التمديد» يرفع علامةَ الانقضاء ولا يعيدها حفظُ مديرٍ من نسخةٍ قبله (والعمودُ 23 للخادم — H-1)', async () => {
    const MG = mergeOf264();
    try {
      for (const via of ['resend', 'merge3']) {
        const Wd = await world({ worker: WU.file, mode }), me = await Wd.login(ME.un, ME.pw), dm = await Wd.login(MGR.un, MGR.pw);
        const S = stored(Wd.env, KT);
        assert.equal((await act(Wd, me.ck, { k: YESTERDAY, id: 1760000000105, i: idx(S, YESTERDAY, 1760000000105, ME.eid), act: 'expire' })).j.ok, 1, via + ': انقضت');
        const old = await get(Wd, dm.ck);                                                            /* المديرُ رأى الانقضاء */
        const Mc = new MgrClient(Wd, dm.ck, MG.merge3, KT, 'M'); Mc.mem = old.v; Mc.baseVal = old.v; Mc.krev = old.rev;
        const ex = await post(Wd, dm.ck, '/api/tasks/extend', { k: YESTERDAY, id: 1760000000105, ekey: ME.eid, e: Date.now() + 5 * H, why: 'TEST_ONLY تمديد' });
        assert.equal(ex.status, 200, JSON.stringify(ex.j));
        let x = at(stored(Wd.env, KT), 1760000000105, ME.eid); assert.ok(!(x[20] && x[20].exp), via + ': التمديدُ رفع العلامة (مسارُ الخادم لم يُعَد عليه شيء)');
        const xNow = x.length > 23 ? x[23] : null;
        if (via === 'resend') {
          const Mv = JSON.parse(old.v), q = idx(Mv, YESTERDAY, 1760000000105, ME.eid); Mv[YESTERDAY][q] = Mv[YESTERDAY][q].slice(); Mv[YESTERDAY][q][1] = 'TEST_ONLY وصفٌ من نسخةٍ قبل التمديد';
          const cur = await get(Wd, dm.ck);
          assert.notEqual(JSON.stringify(xNow), JSON.stringify(Mv[YESTERDAY][q][23] === undefined ? null : Mv[YESTERDAY][q][23]), 'التمديدُ كتب العمودَ 23 (مسارُ خادم)');
          /* H-1 مع F-10: النسخةُ القديمة (base قديم) بعمودها 23 القديم ⇒ تعارضٌ يُدمج — لا «task-x» لعمودٍ لم تكن لتعرفه — ولا يُكتب شيء */
          const r1 = await raw(Wd, dm.ck, Mv, old.rev);
          assert.ok(r1.j.conflicts && r1.j.conflicts[KT] && !(r1.j.denied && r1.j.denied[KT]) && !(r1.j.revs && r1.j.revs[KT]), 'base قديم ⇒ تعارض: ' + JSON.stringify(r1.j).slice(0, 160));
          /* …والعمودُ 23 القديم على النسخة الحالية (بلا دمج) ⇒ «task-x» صريحاً (H-1 كما هو) ولا يُكتب شيء */
          const r0 = await raw(Wd, dm.ck, Mv, cur.rev); assert.equal(r0.j.denied && r0.j.denied[KT] && r0.j.denied[KT].why, 'task-x', 'H-1: العمودُ 23 القديم على النسخة الحالية ⇒ رفضٌ صريح: ' + JSON.stringify(r0.j).slice(0, 160));
          /* …وx مزوّرةٌ على base قديم لا تُكتب (تعارض) ثم تُرفض على النسخة الحالية */
          const Fx = JSON.parse(JSON.stringify(Mv)); while (Fx[YESTERDAY][q].length < 24) Fx[YESTERDAY][q].push(null); Fx[YESTERDAY][q][23] = Object.assign({}, xNow || {}, { pol: { m: 'none' }, rv: null });
          const r2 = await raw(Wd, dm.ck, Fx, old.rev); assert.ok(r2.j.conflicts && r2.j.conflicts[KT] && !(r2.j.revs && r2.j.revs[KT]), 'x مزوّرة على base قديم ⇒ تعارضٌ بلا كتابة');
          Fx[YESTERDAY][q][16] = x[16]; const r3 = await raw(Wd, dm.ck, Fx, cur.rev); assert.equal(r3.j.denied && r3.j.denied[KT] && r3.j.denied[KT].why, 'task-x', 'وعلى النسخة الحالية ⇒ «task-x»');
          assert.equal(JSON.stringify(at(stored(Wd.env, KT), 1760000000105, ME.eid)[23]), JSON.stringify(xNow), 'ولم يُكتب شيء: العمودُ 23 كما كتبه الخادم');
          Mv[YESTERDAY][q][16] = x[16];                                                              /* ما يأخذه الدمجُ من الخادم (لم يغيّره المدير): المهلةُ الجديدة · العمودُ 23 */
          while (Mv[YESTERDAY][q].length < 24) Mv[YESTERDAY][q].push(null); Mv[YESTERDAY][q][23] = xNow;   /* — والعلامةُ القديمة في 20 تبقى عمداً: أسوأُ الحالات */
          const r = await raw(Wd, dm.ck, Mv, cur.rev); assert.ok(r.j.revs && r.j.revs[KT], via + ': حفظُ المدير: ' + JSON.stringify(r.j).slice(0, 200));
        } else {
          /* الواجهةُ الحقيقية (280 · merge3 بالهوية): نسخةٌ قبل التمديد ⇒ تعارض ⇒ دمجٌ خانةً خانة ⇒ إعادةُ الإرسال */
          const mr = await reviewAndApply(Mc, (T) => { const q = idx(T, YESTERDAY, 1760000000105, ME.eid); T[YESTERDAY][q] = T[YESTERDAY][q].slice(); T[YESTERDAY][q][1] = 'TEST_ONLY وصفٌ من نسخةٍ قبل التمديد'; });
          assert.ok(mr.ok && mr.tries >= 2, via + ': حفظُ المدير بعد الدمج: ' + JSON.stringify(mr).slice(0, 200));
        }
        x = at(stored(Wd.env, KT), 1760000000105, ME.eid);
        assert.equal(x[1], 'TEST_ONLY وصفٌ من نسخةٍ قبل التمديد', via + ': تعديلُ المدير باقٍ');
        assert.ok(!(x[20] && x[20].exp), via + ': علامةُ الانقضاء لا تعود من النسخة القديمة: ' + JSON.stringify(x[20]));
        assert.equal(JSON.stringify(x.length > 23 ? x[23] : null), JSON.stringify(xNow), via + ': والعمودُ 23 كما كتبه الخادم');
        assert.equal((await act(Wd, me.ck, { k: YESTERDAY, id: 1760000000105, act: 'start' })).status, 200, via + ': ويبدأ الموظفُ بعد التمديد');
      }
    } finally { MG.dispose(); }
  });
}
