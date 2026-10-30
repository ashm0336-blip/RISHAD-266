/* KIVO_265 · قرارُ المالك 2026-10-16 (إيقافُ Production حتى إصلاح «تكرار المهام») — إكمالُ التكرار في الخادم (073 tkRecIn · tkSeries · tkRecurRun · tkRecurOp):
   مرةً واحدة أو متكررة يومياً/أسبوعياً/شهرياً · بدايةٌ ونهاية أو «حتى الإيقاف» · الإنشاءُ والتعديلُ والإيقاف بصلاحيات المهام القائمة في الخادم ·
   لا تُولَّد النسخةُ نفسُها مرتين · والنسخُ السابقةُ وسجلُّها وإثباتُها باقية. بالوضعين (القديم 018/044 · الإنفاذ 059) وببياناتٍ اصطناعية وحدها (tasks_fx):
     (أ) الأسبوعيُّ بيومين والشهريّ (و'days' اسمُه القديم) لا يولّدان إلا مواعيدَ القاعدة
     (ب) التحقّق: rec.wd · rec.md · rec.to (قبل البداية · بعد ثلاث سنوات · مع «حتى الإيقاف») · rec.open · rec-asg (متكررةٌ بلا مكلَّف) — والسنتان مقبولتان (كان السقفُ سنة)
     (ج) «حتى الإيقاف» بلا نهايةٍ مخزَّنة ويولِّد · وبلا نهايةٍ ولا «حتى الإيقاف» سنةٌ هجرية كما كان
     (د) تعديلُ القاعدة: القادمةُ المعلّقة غيرُ المطابقة تُلغى بسببها · المطابقةُ باقية · المنجزةُ والمبدوءة وإثباتُها وسجلُّها لا تُمسّ · الإصدارُ يعلو · ولا تكرار
     (هـ) التعديلُ إلى قاعدةٍ أوسع: التشغيلُ التالي يولِّد الناقصَ وحده — ومرّتين ⇒ لا شيء · والنهايةُ كما هي ما لم تُذكر
     (و) الإنهاء: stop=1 · النهايةُ لا تتقدّم أبداً · لا استئنافَ ولا إيقافَ ولا تعديلَ بعده (409 rec-ended) · ولا توليد
     (ز) شهرٌ معتمدٌ ومقفل: الإيقافُ والتعديلُ والإنهاء تمضي ونسخُه لا تُمسّ (كان الإنفاذُ يرفض العمليةَ كلَّها) · ونموذجٌ وحيدٌ في شهرٍ مقفل ⇒ 409 month-locked
     (ح) التحويلُ إلى متكررة (start): مهمةٌ مسندةٌ لمرة ومهمةٌ جماعية تولِّدان كالمنشأة · وصاحبُها من حوّلها بسجل الخادم (rec_start) · وما لا يُحوَّل 409
     (ط) H-1 باقٍ: x.rec مزوَّرةٌ بحفظٍ خامّ تُرفض ولا تولِّد · وrec.by مزوَّرٌ باستعادة مدير النظام (ومعه حدثٌ مزوَّر) لا يولِّد باسم غيره
     (ي) الصلاحيات: الموظفُ 403 على كلّ عملية · الإنشاءُ بلا الإسناد لا ينشئ متكررةً لمكلَّف · بلا التعديل 403 · بلا الإنشاء لا تحويل · ومن يملك الإضافةَ والتعديل يدير التكرارَ كلَّه */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, D, DAY, PDAY, TAG, stored, putKV, hij, MID, HR, wdOf, ymOf } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'], EMP1 = ['0000000113', '70113'], SUP_UID = 'tst_sup1', DM_UID = 'tst_dm1';
const KL = 'bsdept:' + D + ':bassam_tasks_locks_v1', PK = 'bassam_perms_v1', PMK = ymOf(PDAY);
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const act = (W, ck, body) => post(W, ck, '/api/me/tasks/act', body);
const op = (W, ck, body) => post(W, ck, '/api/tasks/recur', body);
const run = (W) => post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D, {});
const show = (r) => JSON.stringify({ st: r.status, j: r.j }).slice(0, 500);
const N0 = Date.now(), TM = MID(N0) + 864e5;                                  /* منتصفُ ليل الغد (الرياض) — الغدُ وما بعده في أفق التوليد دائماً */
const at = (i, h) => TM + i * 864e5 + (h == null ? 8 : h) * HR;                /* اليومُ «الغد + i» في الساعة h */
const kOf = (i) => hij(at(i, 12)), wdI = (i) => wdOf(at(i, 12));
const dn = (k) => { const p = String(k).split('-').map(Number); return p[0] * 10000 + p[1] * 100 + p[2]; };
const allRows = (W) => { const S = stored(W.env, KT) || {}, o = []; for (const dk in S) (S[dk] || []).forEach((r, i) => { if (Array.isArray(r)) o.push({ dk, i, r }); }); return o; };
const ser = (W, id) => allRows(W).filter((q) => q.r[23] && q.r[23].rec && q.r[23].rec.id === id);
const recIdOf = (W, c) => { const q = c.j.rows[0]; return stored(W.env, KT)[q.k].find((r) => r[13] === q.id)[23].rec.id; };
const mk = (W, ck, o = {}) => post(W, ck, '/api/tasks/create', Object.assign({ k: kOf(0), t: TAG + ' ' + (o.title || 'سلسلة'), s: at(0), e: at(0) + HR, asg: [ME.eid], rv: 'none', force: true }, o.body || {}));
const setPerm = (W, eid, acts) => { const P = stored(W.env, PK); P.emps = P.emps || {}; P.emps[D] = P.emps[D] || {}; P.emps[D][eid] = { tasks: acts }; putKV(W.env, PK, P); };
const protoOf = (W, id) => {                                                    /* نموذجُ السلسلة كما يختاره tkSeries: غيرُ المنفصلة · أعلى إصدار · أحدثُ بداية */
  let p = null; for (const q of ser(W, id)) { const x = q.r[23]; if (x.det) continue; const v = +x.rec.ver || 0; if (!p || v > p.v || (v === p.v && (q.r[15] || 0) > p.s)) p = { v, s: q.r[15] || 0, q }; }
  return p ? p.q.r[23].rec : null;
};
const RST = (why) => ({ ops: { [KT]: { op: 'backup.restore', scope: 'dept', mode: 'replace', reason: why } }, why: { [KT]: why } });

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) الأسبوعيُّ بيومين والشهريّ — و«days» اسمُه القديم: لا تُولَّد إلا مواعيدُ القاعدة · ومرّتين ⇒ لا شيء', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const wd = [wdI(1), wdI(3)];
    const c = await mk(W, dm.ck, { title: 'أسبوعية', body: { rec: { t: 'weekly', wd } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c), rec = ser(W, id)[0].r[23].rec;
    assert.equal(rec.t, 'weekly'); assert.deepEqual(rec.wd, wd.slice().sort()); assert.equal(rec.ver, 1); assert.deepEqual(rec.asg, [ME.eid]);
    const r1 = await run(W); assert.equal(r1.status, 200, show(r1));
    const g = ser(W, id).filter((q) => q.r[13] !== c.j.rows[0].id);
    /* KIVO_265 · البند 15: الأفقُ 30 يوماً (كان 7) — يوما القاعدة في كل أسبوعٍ من الأفق: 8 نُسخ (4 أسابيع × يومين)، أقربُها الغد+1 والغد+3 ولا شيءَ بعد الأفق */
    assert.deepEqual(g.map((q) => q.dk).sort(), [1, 3, 8, 10, 15, 17, 22, 24].map(kOf).sort(), 'أيامُ القاعدة في الأفق وحدها: ' + JSON.stringify(g.map((q) => q.dk)));
    assert.ok(g.every((q) => wd.includes(wdOf(q.r[15])) && q.r[14] === ME.eid), 'كلُّ نسخةٍ في يومٍ من أيامها');
    assert.equal((await run(W)).j.created, 0, 'لا تكرارَ عند إعادة التشغيل');
    const md = +kOf(2).split('-')[2];
    const m = await mk(W, dm.ck, { title: 'شهرية', body: { rec: { t: 'monthly', md } } }); assert.equal(m.status, 200, show(m));
    const idm = recIdOf(W, m); assert.equal((await run(W)).status, 200);
    assert.deepEqual(ser(W, idm).filter((q) => q.r[13] !== m.j.rows[0].id).map((q) => q.dk), [kOf(2)], 'الشهريُّ في يوم الشهر وحده');
    const dd = await mk(W, dm.ck, { title: 'أيام محددة', body: { rec: { t: 'days', wd: [wdI(2)] } } }); assert.equal(dd.status, 200, show(dd));
    const idd = recIdOf(W, dd); assert.equal((await run(W)).status, 200);
    assert.deepEqual(ser(W, idd).filter((q) => q.r[13] !== dd.j.rows[0].id).map((q) => q.dk).sort(), [2, 9, 16, 23].map(kOf).sort(), '«days» = «weekly» — في الأفق كلِّه (30 يوماً)');
  });

  test(M + '(ب) التحقّق: rec.t · rec.wd · rec.md · rec.to · rec.open · rec-asg — والنهايةُ بعد سنتين أو ثلاث مقبولة', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const n0 = allRows(W).length, [Y, Mo, Dd] = kOf(0).split('-').map(Number);
    const bad = async (rec, at2, extra) => {
      const r = await mk(W, dm.ck, { body: Object.assign({ rec }, extra || {}) });
      assert.equal(r.status, 400, JSON.stringify(rec) + ' ⇒ ' + show(r)); assert.equal(r.j.err, 'bad-body'); assert.equal(r.j.at, at2, JSON.stringify(rec));
    };
    await bad({ t: 'hourly' }, 'rec.t'); await bad({ t: 'toString' }, 'rec.t');                 /* لا مفتاحَ من النموذج الأب قاعدةً لا تولِّد */
    await bad({ t: 'weekly' }, 'rec.wd'); await bad({ t: 'weekly', wd: [7] }, 'rec.wd'); await bad({ t: 'days', wd: [] }, 'rec.wd'); await bad({ t: 'weekly', wd: [0, 1, 2, 3, 4, 5, 6, 0] }, 'rec.wd');
    await bad({ t: 'monthly' }, 'rec.md'); await bad({ t: 'monthly', md: 31 }, 'rec.md'); await bad({ t: 'monthly', md: 0 }, 'rec.md');
    await bad({ t: 'daily', to: kOf(-1) }, 'rec.to');                                        /* قبل يوم البداية */
    await bad({ t: 'daily', to: (Y + 4) + '-' + Mo + '-' + Dd }, 'rec.to');                  /* أبعدُ من ثلاث سنوات هجرية */
    await bad({ t: 'daily', to: Y + '-13-1' }, 'rec.to');
    await bad({ t: 'daily', to: kOf(5), open: 1 }, 'rec.to');                                /* نهايةٌ و«حتى الإيقاف» معاً */
    await bad({ t: 'daily', open: 'yes' }, 'rec.open');
    const na = await mk(W, dm.ck, { body: { asg: [], rec: { t: 'daily' } } });
    assert.equal(na.status, 400, show(na)); assert.equal(na.j.err, 'rec-asg', 'متكررةٌ بلا مكلَّف لا تولِّد شيئاً — تُرفض');
    assert.equal(allRows(W).length, n0, 'لم يُكتب شيء');
    for (const yy of [2, 3]) {
      const to = (Y + yy) + '-' + Mo + '-' + Dd, c = await mk(W, dm.ck, { title: 'نهايةٌ بعد ' + yy, body: { rec: { t: 'daily', to } } });
      assert.equal(c.status, 200, yy + ' سنوات: ' + show(c)); assert.equal(ser(W, recIdOf(W, c))[0].r[23].rec.to, to);
    }
  });

  test(M + '(ج) «حتى الإيقاف»: لا نهايةَ مخزَّنة ويولِّد · وبلا نهايةٍ ولا «حتى الإيقاف» سنةٌ هجرية كما كان', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const c = await mk(W, dm.ck, { title: 'حتى الإيقاف', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c); assert.ok(!('to' in ser(W, id)[0].r[23].rec), 'لا to: ' + JSON.stringify(ser(W, id)[0].r[23].rec));
    const r = await run(W); assert.equal(r.status, 200, show(r)); assert.ok(r.j.created >= 4, show(r));
    for (let i = 1; i <= 4; i++) assert.ok(ser(W, id).some((q) => q.dk === kOf(i)), 'نسخةُ الغد+' + i);
    assert.ok(ser(W, id).every((q) => !('to' in q.r[23].rec)), 'والمولَّدةُ بلا نهاية');
    const [Y, Mo, Dd] = kOf(0).split('-').map(Number);
    const d0 = await mk(W, dm.ck, { title: 'افتراضية', body: { rec: { t: 'daily' } } }); assert.equal(d0.status, 200, show(d0));
    assert.equal(ser(W, recIdOf(W, d0))[0].r[23].rec.to, (Y + 1) + '-' + Mo + '-' + Dd, 'التوافقُ الخلفيّ: سنةٌ هجرية');
  });

  test(M + '(د) تعديلُ القاعدة: القادمةُ المعلّقة غيرُ المطابقة تُلغى بسببها · المطابقةُ باقية · المنجزةُ والمبدوءة وإثباتُها وسجلُّها لا تُمسّ · الإصدارُ يعلو · ولا تكرار', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
    const c = await mk(W, dm.ck, { title: 'يوميةٌ للتعديل', body: { asg: [ME.eid, MATE.eid], rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c); const r0 = await run(W); assert.ok(r0.j.created >= 8, show(r0));
    const rowAt = (i, ek) => ser(W, id).find((q) => q.dk === kOf(i) && q.r[14] === ek);
    { const S9 = stored(W.env, KT); [[4, ME.eid], [2, MATE.eid]].forEach(([i9, e9]) => { const q9 = S9[kOf(i9)].find((r) => r[14] === e9 && r[23] && r[23].rec && r[23].rec.id === id); q9[15] = Date.now() - HR; q9[16] = Date.now() + HR; }); putKV(W.env, KT, S9); }   /* KIVO_265 · نافذةُ التنفيذ: لا بدءَ قبل الموعد — تُقدَّم أوقاتُ النسختين إلى الآن */
    const a = rowAt(4, ME.eid), b = rowAt(2, MATE.eid);
    assert.equal((await act(W, me.ck, { k: a.dk, id: a.r[13], act: 'start' })).status, 200);
    const fin = await act(W, me.ck, { k: a.dk, id: a.r[13], act: 'submit', note: TAG + ' أُنجزت' }); assert.equal(fin.status, 200, show(fin)); assert.equal(fin.j.row.st, 'done');
    assert.equal((await act(W, mate.ck, { k: b.dk, id: b.r[13], act: 'start' })).status, 200);
    const snap = (q) => JSON.stringify([q.r[3], q.r[11], q.r[12], q.r[20], q.r[21]]);
    const A0 = snap(rowAt(4, ME.eid)), B0 = snap(rowAt(2, MATE.eid)), aud0 = W.env.DB.q('SELECT cid FROM aud WHERE k = ?', KT).map((x) => x.cid);
    const wd = [wdI(1), wdI(3)];
    const exp = ser(W, id).filter((q) => dn(q.dk) > dn(DAY) && q.r[3] === 'pending' && !q.r[11] && !q.r[23].asg && !wd.includes(wdOf(q.r[15])));
    assert.ok(exp.length >= 4, 'قادمةٌ معلّقة غيرُ مطابقة: ' + exp.length);
    const e = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'weekly', wd } });
    assert.equal(e.status, 200, show(e)); assert.equal(e.j.ver, 2, 'الإصدارُ = إصدارُ النموذج + 1'); assert.equal(e.j.cancelled, exp.length, show(e));
    const after = ser(W, id), same = (p) => (q) => q.dk === p.dk && q.r[13] === p.r[13] && q.r[14] === p.r[14];
    for (const q of exp) { const n = after.find(same(q)); assert.equal(n.r[23].asg, 'cancelled', q.dk + ' ' + q.r[14]); assert.equal(n.r[23].can.why, 'عُدّل التكرار'); assert.equal(n.r[3], 'pending', 'إلغاءٌ منطقيّ — الصفُّ باقٍ'); }
    for (const i of [1, 3]) for (const ek of [ME.eid, MATE.eid]) { const q = rowAt(i, ek); assert.ok(q && !q.r[23].asg, 'المطابقةُ باقية: الغد+' + i); assert.equal(q.r[23].rec.ver, 2); assert.equal(q.r[23].rec.t, 'weekly'); }
    assert.equal(snap(rowAt(4, ME.eid)), A0, 'المنجزةُ وإثباتُها (20 · 21) كما هي'); assert.ok(!rowAt(4, ME.eid).r[23].asg, 'لم تُلغَ');
    assert.equal(snap(rowAt(2, MATE.eid)), B0, 'المبدوءةُ كما هي'); assert.ok(!rowAt(2, MATE.eid).r[23].asg, 'لم تُلغَ');
    const aud1 = W.env.DB.q('SELECT cid FROM aud WHERE k = ?', KT).map((x) => x.cid); assert.ok(aud0.every((x) => aud1.includes(x)), 'سجلُّ التدقيق كلُّه باقٍ');
    const ev = W.env.DB.q("SELECT uid, ctx FROM aud WHERE k = ? AND act = 'rec_edit'", KT); assert.equal(ev.length, 1, 'حدثٌ واحد');
    const cx = JSON.parse(ev[0].ctx); assert.equal(ev[0].uid, DM_UID); assert.equal(cx.rec, id); assert.equal(cx.before.t, 'daily'); assert.equal(cx.after.t, 'weekly'); assert.deepEqual(cx.after.wd, wd.slice().sort());
    assert.equal(protoOf(W, id).ver, 2, 'النموذجُ يحمل القاعدةَ الجديدة'); assert.equal(protoOf(W, id).t, 'weekly');
    const n1 = ser(W, id).length;
    assert.equal((await run(W)).j.created, 0, 'لا نسخةَ لموعدٍ قائم ولا لملغى'); assert.equal((await run(W)).j.created, 0); assert.equal(ser(W, id).length, n1);
    const idem = ser(W, id).map((q) => q.r[23].idem).filter(Boolean); assert.equal(new Set(idem).size, idem.length, 'مفتاحُ النسخة فريد');
  });

  test(M + '(هـ) التعديلُ إلى قاعدةٍ أوسع: التشغيلُ التالي يولِّد الناقصَ وحده — ومرّتين ⇒ لا شيء · والنهايةُ كما هي ما لم تُذكر', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const c = await mk(W, dm.ck, { title: 'تتّسع', body: { rec: { t: 'weekly', wd: [wdI(1)], to: kOf(20) } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c); await run(W);
    assert.deepEqual(ser(W, id).map((q) => q.dk).sort(), [0, 1, 8, 15].map(kOf).sort(), 'البند 15: الأسبوعيُّ حتى النهاية (الغد+20) في أفق 30 يوماً');
    const e = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'daily' } }); assert.equal(e.status, 200, show(e)); assert.equal(e.j.cancelled, 0);
    assert.equal(protoOf(W, id).to, kOf(20), 'النهايةُ كما هي'); assert.equal(protoOf(W, id).t, 'daily');
    const r = await run(W); assert.equal(r.status, 200, show(r)); assert.ok(r.j.created >= 3, 'وُلّد الناقص: ' + show(r));
    const L = ser(W, id); for (let i = 0; i <= 4; i++) assert.equal(L.filter((q) => q.dk === kOf(i)).length, 1, 'نسخةٌ واحدة لكل يوم: الغد+' + i);
    assert.ok(L.filter((q) => q.dk === kOf(1))[0].r[23].rec.ver === 2, 'القائمةُ أخذت القاعدةَ ولم تُكرَّر');
    assert.equal((await run(W)).j.created, 0, 'مرّتين ⇒ لا شيء');
    const o = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'daily', open: 1 } }); assert.equal(o.status, 200, show(o)); assert.ok(!('to' in protoOf(W, id)), '«حتى الإيقاف» بالتعديل');
    assert.equal((await op(W, dm.ck, { id, op: 'edit', rec: { t: 'weekly' } })).j.at, 'rec.wd');
    assert.equal((await op(W, dm.ck, { id, op: 'edit' })).j.at, 'rec');
    assert.equal((await op(W, dm.ck, { id: 'rNOPE', op: 'edit', rec: { t: 'daily' } })).status, 404);
    for (const o of ['toString', 'valueOf', 'resumeX']) { const r = await op(W, dm.ck, { id, op: o }); assert.equal(r.status, 400, o + ': ' + show(r)); assert.equal(r.j.at, 'op'); }
    assert.equal((await op(W, dm.ck, { id, op: 'pause', rec: { t: 'daily' } })).j.at, 'rec', 'القاعدةُ للتعديل والتحويل وحدهما');
  });

  test(M + '(و) الإنهاء: stop=1 · النهايةُ لا تتقدّم أبداً · لا استئنافَ ولا إيقافَ ولا تعديلَ بعده (409 rec-ended) · ولا توليد', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    putKV(W.env, KL, {});                                                           /* أشهرٌ مفتوحة: سلسلةٌ في الماضي القريب */
    const c = await mk(W, dm.ck, { title: 'تُنهى', body: { rec: { t: 'daily', to: kOf(10) } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c); assert.ok((await run(W)).j.created >= 4);
    const st = await op(W, dm.ck, { id, op: 'stop' }); assert.equal(st.status, 200, show(st)); assert.ok(st.j.cancelled >= 4, 'القادمةُ غيرُ المبدوءة أُلغيت: ' + show(st));
    const P = protoOf(W, id); assert.equal(P.stop, 1); assert.equal(P.to, DAY, 'النهايةُ = اليوم (أقربُ من نهايتها)');
    assert.ok(ser(W, id).filter((q) => dn(q.dk) > dn(DAY)).every((q) => q.r[23].asg === 'cancelled' && q.r[23].can.why === 'أُنهي التكرار'));
    for (const o of ['resume', 'pause', 'stop']) { const r = await op(W, dm.ck, { id, op: o }); assert.equal(r.status, 409, o + ': ' + show(r)); assert.equal(r.j.err, 'rec-ended'); }
    const ed = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'daily' } }); assert.equal(ed.status, 409, show(ed)); assert.equal(ed.j.err, 'rec-ended');
    assert.equal((await run(W)).j.created, 0, 'المنتهيةُ لا تُولَّد');
    /* سلسلةٌ مضت نهايتُها (قبل يومين) — الإنهاءُ لا يقدّمها إلى اليوم، والاستئنافُ ممنوع */
    const sP = MID(N0) - 5 * 864e5 + 8 * HR, toP = hij(MID(N0) - 2 * 864e5 + 12 * HR);
    const p = await post(W, dm.ck, '/api/tasks/create', { k: hij(sP), t: TAG + ' مضت', s: sP, e: sP + HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'daily', to: toP } });
    assert.equal(p.status, 200, show(p)); const idp = recIdOf(W, p);
    const rs = await op(W, dm.ck, { id: idp, op: 'resume' }); assert.equal(rs.status, 409, show(rs)); assert.equal(rs.j.err, 'rec-ended');
    const sp = await op(W, dm.ck, { id: idp, op: 'stop' }); assert.equal(sp.status, 200, show(sp));
    assert.equal(protoOf(W, idp).to, toP, 'النهايةُ لم تتقدّم إلى اليوم'); assert.equal(protoOf(W, idp).stop, 1);
  });

  test(M + '(ز) شهرٌ معتمدٌ ومقفل: الإيقافُ والتعديلُ والإنهاء تمضي ونسخُه لا تُمسّ · ونموذجٌ وحيدٌ في شهرٍ مقفل ⇒ 409 month-locked', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    let i0 = -1; while (i0 > -45 && ymOf(hij(MID(N0) + i0 * 864e5 + 12 * HR)) !== PMK) i0--;
    assert.equal(ymOf(hij(MID(N0) + i0 * 864e5 + 12 * HR)), PMK, 'آخرُ يومٍ من الشهر الماضي');
    const sP = MID(N0) + i0 * 864e5 + 8 * HR, kP = hij(sP);
    putKV(W.env, KL, {});                                                           /* الشهرُ الماضي مفتوحٌ وقتَ الإنشاء */
    const B = (t) => ({ k: kP, t: TAG + ' ' + t, s: sP, e: sP + HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'daily', open: 1 } });
    const c = await post(W, dm.ck, '/api/tasks/create', B('تعبر شهراً مقفلاً')); assert.equal(c.status, 200, show(c));
    const c2 = await post(W, dm.ck, '/api/tasks/create', B('نموذجُها في شهرٍ مقفل')); assert.equal(c2.status, 200, show(c2));
    const id = recIdOf(W, c), id2 = recIdOf(W, c2);
    assert.equal((await op(W, dm.ck, { id: id2, op: 'pause' })).status, 200, 'النموذجُ الوحيد في شهرٍ مفتوح');
    assert.ok((await run(W)).j.created >= 4);
    putKV(W.env, KL, { [PMK]: true });                                             /* اعتُمد الشهرُ الماضي */
    const lockedOf = (rid) => ser(W, rid).filter((q) => ymOf(q.dk) === PMK);
    const L0 = JSON.stringify(lockedOf(id).map((q) => q.r)); assert.equal(lockedOf(id).length, 1);
    const pz = await op(W, dm.ck, { id, op: 'pause' }); assert.equal(pz.status, 200, 'الإيقافُ يمضي: ' + show(pz));
    assert.equal(JSON.stringify(lockedOf(id).map((q) => q.r)), L0, 'نسخةُ الشهر المقفل لم تُمسّ');
    assert.ok(ser(W, id).filter((q) => dn(q.dk) >= dn(DAY)).every((q) => q.r[23].rec.paused === 1), 'اليومُ وما بعده موقوفة');
    assert.equal(protoOf(W, id).paused, 1); assert.equal((await run(W)).j.created, 0);
    const ed = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'weekly', wd: [wdI(1)] } }); assert.equal(ed.status, 200, 'التعديلُ يمضي: ' + show(ed));
    assert.equal(JSON.stringify(lockedOf(id).map((q) => q.r)), L0, 'ولم تُمسّ');
    const st = await op(W, dm.ck, { id, op: 'stop' }); assert.equal(st.status, 200, 'الإنهاءُ يمضي: ' + show(st));
    assert.equal(JSON.stringify(lockedOf(id).map((q) => q.r)), L0, 'ولم تُمسّ'); assert.equal(protoOf(W, id).stop, 1);
    const L2 = JSON.stringify(lockedOf(id2).map((q) => q.r));
    const rs = await op(W, dm.ck, { id: id2, op: 'resume' }); assert.equal(rs.status, 409, show(rs)); assert.equal(rs.j.err, 'month-locked');
    assert.equal(JSON.stringify(lockedOf(id2).map((q) => q.r)), L2, 'لا كتابة');
  });

  test(M + '(ح) التحويلُ إلى متكررة: مهمةٌ مسندةٌ لمرة ومهمةٌ جماعية تولِّدان كالمنشأة · صاحبُها من حوّلها بسجل الخادم · وما لا يُحوَّل 409', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const one = await mk(W, dm.ck, { title: 'لمرةٍ واحدة' }); assert.equal(one.status, 200, show(one));
    const k = one.j.rows[0].k, rid = one.j.rows[0].id;
    const st = await op(W, dm.ck, { op: 'start', k, id: rid, rec: { t: 'daily', open: 1 } }); assert.equal(st.status, 200, show(st));
    const id = st.j.rec.id; assert.ok(/^r[0-9a-z]+$/.test(id)); assert.equal(st.j.rec.ver, 1); assert.equal(st.j.rec.from, k); assert.deepEqual(st.j.rec.asg, [ME.eid]); assert.ok(!('to' in st.j.rec));
    const r0 = stored(W.env, KT)[k].find((r) => r[13] === rid);
    assert.equal(r0[23].rec.id, id); assert.equal(r0[23].idem, 'r:' + id + ':' + k + ':' + ME.eid); assert.equal(r0[23].rec.by.u, DM_UID); assert.equal(r0[3], 'pending', 'الصفُّ كما هو');
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'rec_start' AND uid = ? AND ctx LIKE ?", KT, DM_UID, '%"rec":"' + id + '"%')[0].n, 1, 'حدثُ التحويل بهوية صاحبه');
    const g1 = await run(W); assert.equal(g1.status, 200, show(g1)); assert.ok(!g1.j.denied.some((q) => q.id === id), 'صاحبُها ثابتٌ بسجل الخادم: ' + JSON.stringify(g1.j.denied));
    for (let i = 1; i <= 4; i++) assert.equal(ser(W, id).filter((q) => q.dk === kOf(i)).length, 1, 'نسخةُ الغد+' + i);
    assert.equal(ser(W, id).filter((q) => q.dk === k).length, 1, 'يومُ البدء نسختُه الحقيقية وحدها');
    assert.ok(ser(W, id).filter((q) => q.r[13] !== rid).every((q) => q.r[23].by.u === DM_UID), 'المولَّدةُ باسم من حوّلها');
    assert.equal((await run(W)).j.created, 0, 'مرّتين ⇒ لا شيء');
    /* الجماعية: بمعرّف مجموعتها — والصفُّ الواحدُ منها لا يُحوَّل وحده */
    const g = await mk(W, dm.ck, { title: 'جماعية', body: { asg: [ME.eid, MATE.eid], grpL: TAG + ' فريق' } }); assert.equal(g.status, 200, show(g));
    const kg = g.j.rows[0].k, grp = stored(W.env, KT)[kg].find((r) => r[13] === g.j.rows[0].id)[17]; assert.ok(grp);
    assert.equal((await op(W, dm.ck, { op: 'start', k: kg, id: g.j.rows[0].id, rec: { t: 'daily' } })).status, 409, 'صفٌّ من مجموعة');
    const sg = await op(W, dm.ck, { op: 'start', k: kg, grp, rec: { t: 'weekly', wd: [wdI(2)] } }); assert.equal(sg.status, 200, show(sg));
    assert.equal(sg.j.n, 2); assert.deepEqual(sg.j.rec.asg.slice().sort(), [ME.eid, MATE.eid].sort());
    assert.equal((await run(W)).status, 200);
    const gg = ser(W, sg.j.rec.id).filter((q) => q.dk === kOf(2)); assert.equal(gg.length, 2, 'نسخةٌ لكل مكلَّف');
    assert.ok(gg[0].r[17] && gg[0].r[17] === gg[1].r[17] && gg[0].r[18] === TAG + ' فريق', 'مجموعةُ اليوم بوسمها');
    /* ما لا يُحوَّل */
    assert.equal((await op(W, dm.ck, { op: 'start', k, id: rid, rec: { t: 'daily' } })).status, 409, 'ضمن سلسلةٍ أصلاً');
    const un = await mk(W, dm.ck, { title: 'عامة', body: { asg: [] } }); assert.equal(un.status, 200, show(un));
    assert.equal((await op(W, dm.ck, { op: 'start', k: un.j.rows[0].k, id: un.j.rows[0].id, rec: { t: 'daily' } })).status, 409, 'غيرُ مسندة');
    const cn = await mk(W, dm.ck, { title: 'ملغاة' }); assert.equal(cn.status, 200);
    assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k: cn.j.rows[0].k, id: cn.j.rows[0].id, why: TAG })).status, 200);
    assert.equal((await op(W, dm.ck, { op: 'start', k: cn.j.rows[0].k, id: cn.j.rows[0].id, rec: { t: 'daily' } })).status, 409, 'ملغاة');
    assert.equal((await op(W, dm.ck, { op: 'start', k: kOf(0), id: 1, rec: { t: 'daily' } })).status, 404);
    assert.equal((await op(W, dm.ck, { op: 'start', k: kOf(0), id: rid })).j.at, 'rec');
    assert.equal((await op(W, dm.ck, { op: 'start', k: kOf(0), id: rid, rec: { t: 'daily', x: 1 } })).j.at, 'rec.x', 'المخطّط: rec بحقوله وحدها');
  });

  test(M + '(ط) H-1 باقٍ: x.rec مزوَّرةٌ بحفظٍ خامّ تُرفض ولا تولِّد · وrec.by مزوَّرٌ باستعادة مدير النظام (ومعه حدثٌ مزوَّر) لا يولِّد باسم غيره', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const one = await mk(W, dm.ck, { title: 'لمرة' }); assert.equal(one.status, 200, show(one));
    const k = one.j.rows[0].k, rid = one.j.rows[0].id;
    const g = await get(W, dm.ck, '/api/get?keys=' + encodeURIComponent(KT)), S = JSON.parse(g.j.keys[KT].v), i = S[k].findIndex((r) => r[13] === rid);
    S[k][i] = S[k][i].slice(); S[k][i][23] = Object.assign({}, S[k][i][23], { rec: { id: 'rforgeraw', ver: 1, t: 'daily', from: k, paused: 0, asg: [ME.eid] }, idem: 'r:rforgeraw:' + k + ':' + ME.eid });
    const sv = await post(W, dm.ck, '/api/save', { set: { [KT]: JSON.stringify(S) }, base: { [KT]: g.j.keys[KT].rev } });
    assert.equal(sv.j && sv.j.denied && sv.j.denied[KT] && sv.j.denied[KT].why, 'task-x', 'الحفظُ الخامّ مرفوض: ' + show(sv));
    assert.equal((await run(W)).status, 200); assert.equal(ser(W, 'rforgeraw').length, 0, 'لا سلسلةَ ولا نُسخ');
    /* مديرُ النظام يكتب باستعادةٍ مخوَّلة نموذجاً صاحبُه (rec.by) المشرف — ومعه حدثُ rec_start مزوَّر (يُكتب بهويته هو لا بهوية المشرف) */
    const g2 = await get(W, W.su.ck, '/api/get?keys=' + encodeURIComponent(KT)), S2 = JSON.parse(g2.j.keys[KT].v), s2 = at(0, 10);
    const x = { v: 2, by: { u: SUP_UID, e: '', n: TAG + ' مزوَّر' }, pol: { m: 'none' }, rv: null, dec: 1, idem: 'r:rforgeby:' + kOf(0) + ':' + MATE.eid,
      rec: { t: 'daily', id: 'rforgeby', ver: 1, from: kOf(0), paused: 0, asg: [MATE.eid], by: { u: SUP_UID, e: '', n: TAG + ' مزوَّر' } } };
    S2[kOf(0)] = (S2[kOf(0)] || []).concat([[TAG + ' سلسلةٌ مزوَّرة', '', 'normal', 'pending', 'normal', 'مضافة', null, ['T'], MATE.name, TAG, 60, null, null, 1790000000333, MATE.eid, s2, s2 + HR, null, null, null, null, null, 'Tforgeby', x]]);
    const w = await post(W, W.su.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S2) }, del: [], base: { [KT]: g2.j.keys[KT].rev },
      aud: [{ cid: 'rforge' + Date.now().toString(36), k: KT, etype: 'dataset', act: 'restore', eid: 'bassam_tasks_v1', ename: 'bassam_tasks_v1' },
        { cid: 'rforgeev' + Date.now().toString(36), k: KT, etype: 'task', act: 'rec_start', eid: 'Tforgeby', ename: 'x', ctx: JSON.stringify({ rec: 'rforgeby', idem: x.idem }) }] }, RST(TAG + ' استعادة')));
    assert.ok(w.j && w.j.revs && w.j.revs[KT], 'النموذجُ مكتوبٌ باستعادةٍ مخوَّلة: ' + show(w));
    const rr = await run(W); assert.equal(rr.status, 200, show(rr));
    assert.equal(ser(W, 'rforgeby').length, 1, 'لا نُسخَ مولَّدة (النموذجُ وحده)');
    assert.ok(rr.j.denied.some((q) => q.id === 'rforgeby' && /سجلَّ إنشائها/.test(q.why)), 'مرفوضةٌ مسمّاة: ' + JSON.stringify(rr.j.denied));
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'created' AND uid = ? AND ctx LIKE '%rforgeby%'", KT, SUP_UID)[0].n, 0, 'ولا حدثَ «أُنشئت» باسم المشرف');
  });

  test(M + '(ي) الصلاحيات: الموظفُ 403 على كلّ عملية · الإنشاءُ بلا الإسناد لا ينشئ متكررةً لمكلَّف · بلا التعديل 403 · بلا الإنشاء لا تحويل · ومن يملك الإضافةَ والتعديل يدير التكرارَ كلَّه', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const c = await mk(W, dm.ck, { title: 'للصلاحيات', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c), one = await mk(W, dm.ck, { title: 'لمرةٍ للتحويل' }); assert.equal(one.status, 200);
    const ops = (rid) => [{ id, op: 'pause' }, { id, op: 'resume' }, { id, op: 'edit', rec: { t: 'daily', open: 1 } }, { op: 'start', k: one.j.rows[0].k, id: rid || one.j.rows[0].id, rec: { t: 'daily' } }, { id, op: 'stop' }];
    for (const b of ops()) { const r = await op(W, me.ck, b); assert.equal(r.status, 403, 'الموظف ⇐ ' + b.op + ': ' + show(r)); }
    /* task.create وحده (الإضافة) — بلا الإسناد ولا التعديل */
    setPerm(W, 'tst_e_emp1', ['view', 'add']); let e1 = await W.login(...EMP1);
    const nc = await mk(W, e1.ck, { title: 'بلا إسناد', body: { rec: { t: 'daily' } } }); assert.equal(nc.status, 403, 'متكررةٌ لمكلَّفٍ بلا task.assign: ' + show(nc));
    for (const b of ops()) { const r = await op(W, e1.ck, b); assert.equal(r.status, 403, 'بلا task.edit ⇐ ' + b.op + ': ' + show(r)); }
    /* التعديلُ بلا الإنشاء: يدير السلسلةَ ولا يحوّل مهمة */
    setPerm(W, 'tst_e_emp1', ['view', 'edit']); e1 = await W.login(...EMP1);
    assert.equal((await op(W, e1.ck, ops()[3])).status, 403, 'التحويلُ يحتاج task.create');
    const pz = await op(W, e1.ck, ops()[0]); assert.equal(pz.status, 200, show(pz));
    const rz = await op(W, e1.ck, ops()[1]); assert.equal(rz.status, 200, show(rz));
    /* الإضافةُ والتعديل: التكرارُ كلُّه */
    setPerm(W, 'tst_e_emp1', ['view', 'add', 'edit']); e1 = await W.login(...EMP1);
    const ce = await mk(W, e1.ck, { title: 'من المخوَّل', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(ce.status, 200, show(ce));
    const ide = recIdOf(W, ce), ge = await run(W); assert.ok(ser(W, ide).length >= 5, 'سلسلتُه تولِّد باسمه: ' + show(ge));
    for (const b of ops()) { const r = await op(W, e1.ck, b); assert.equal(r.status, 200, 'المخوَّل ⇐ ' + b.op + ': ' + show(r)); }
    for (const b of [{ id: ide, op: 'pause' }, { id: ide, op: 'resume' }, { id: ide, op: 'edit', rec: { t: 'weekly', wd: [wdI(1)] } }, { id: ide, op: 'stop' }]) {
      const r = await op(W, e1.ck, b); assert.equal(r.status, 200, 'سلسلتُه ⇐ ' + b.op + ': ' + show(r));
    }
  });
}
