/* KIVO_265 · البند 16 (قائمةُ صفحة المهام) — أنماطُ تكرارٍ إضافية في 073 (tkRecIn · tkRecDue · tkRecSum) ونموذجِ الواجهة:
     · t:'every' مع n (2–30): كل n يوماً من يوم البدء (from) بعدّ الأيام المدنية (tkHijMid — لا تحويلَ هجريّ⇐ميلاديّ في العامل فيُشتقّ من tkHij)
     · في الشهري md:'last': آخرُ يومٍ في الشهر الهجري (29 أو 30) — لا يُتخطّى شهرٌ (كان md:30 يُتخطّى في شهر 29)
   (أ) القواعدُ وحدها في vm (070 + 073 كما هما): التحقّق (n خارج المدى · md) · every يعدّ الأيام من البدء · 'last' في شهر 29 وشهر 30 بأم القرى
   (ب) على العامل الحقيقي بالوضعين: التوليدُ يولّد مواعيدَ القاعدة وحدها في الأفق (every n=3 · last) · لا تكرارَ عند إعادة التشغيل · 400 at rec.n/rec.md ·
       التعديلُ إلى every والتحويلُ (start) يحملان n · وملخّصُ التدقيق (tkRecSum) يذكر n */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';
import { world, workerUnderTest, ME, KT, D, TAG, stored, hij, MID, HR, wdOf, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body:operationSaveBody(W.env,p,taskCommandBody(W.env, p, body)) });
const op = (W, ck, body) => post(W, ck, '/api/tasks/recur', body);
const run = (W) => post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D, {});
const show = (r) => JSON.stringify({ st: r.status, j: r.j }).slice(0, 500);
const N0 = Date.now(), TM = MID(N0) + 864e5;
const at = (i, h) => TM + i * 864e5 + (h == null ? 8 : h) * HR;
const kOf = (i) => hij(at(i, 12)), mOf = (k) => +k.split('-')[1];
/* آخرُ يومٍ في أفق التوليد (30 يوماً من اليوم التشغيلي = الآن − 3 ساعات): بعد منتصف الليل وقبل الثالثة يكون الأفقُ يوماً أقصر بحساب الغد (070 tkToday) */
const HMAX = 28 - Math.round((MID(N0) - MID(N0 - 3 * HR)) / 864e5), inH = (L) => L.filter((i) => i <= HMAX);
const allRows = (W) => { const S = stored(W.env, KT) || {}, o = []; for (const dk in S) (S[dk] || []).forEach((r, i) => { if (Array.isArray(r)) o.push({ dk, i, r }); }); return o; };
const ser = (W, id) => allRows(W).filter((q) => q.r[23] && q.r[23].rec && q.r[23].rec.id === id);
const recIdOf = (W, c) => { const q = c.j.rows[0]; return stored(W.env, KT)[q.k].find((r) => r[13] === q.id)[23].rec.id; };
const mk = (W, ck, o = {}) => post(W, ck, '/api/tasks/create', Object.assign({ k: kOf(0), t: TAG + ' ' + (o.title || 'نمط'), s: at(0), e: at(0) + HR, asg: [ME.eid], rv: 'none', force: true }, o.body || {}));
const gen = (W, id, c) => ser(W, id).filter((q) => q.r[13] !== c.j.rows[0].id).map((q) => q.dk).sort();
/* أيامُ الأفق [اليوم … اليوم+29] = kOf(-1) … kOf(28) — وآخرُ الشهر فيها: يومٌ غدُه في شهرٍ آخر (من يوم البدء kOf(0) فصاعداً) */
const lastDays = () => { const o = []; for (let i = 0; i <= HMAX; i++) if (mOf(kOf(i + 1)) !== mOf(kOf(i))) o.push(kOf(i)); return o.sort(); };

/* ── (أ) القواعدُ وحدها ── */
function srv() {
  const ctx = { Intl, Date, Math, JSON, Object, Array, String, Number, isNaN, parseInt, console };
  ctx.isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v); ctx.swallow = () => {}; ctx.nmap = () => Object.create(null);
  ctx.parseJson = (s, d) => { try { return JSON.parse(s); } catch (e) { return d; } }; ctx.METK_DAY_RX = /^\d{4}-\d{1,2}-\d{1,2}$/;
  vm.createContext(ctx);
  for (const f of ['workers/parts/070-task-core.js', 'workers/parts/073-task-recur.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: path.basename(f) });
  return ctx;
}
/* أولُ شهرٍ هجريّ طولُه len يوماً بعد الوقت t0 (أم القرى · الرياض): {first: منتصفُ ليل أوّل يومٍ فيه, len} */
function monthOf(S, t0, len) {
  let m = S.tkRiyMid(t0); for (let g = 0; g < 400; g++, m += 864e5) {
    const H = S.tkHij(m + 12 * 36e5); if (!H || H.d !== 1) continue;
    const n = (() => { for (let d = 29; d <= 30; d++) { const H2 = S.tkHij(m + d * 864e5 + 12 * 36e5); if (H2.m !== H.m) return d; } return 0; })();
    if (n === len) return { first: m, len: n, H };
  }
  throw new Error('no month of ' + len);
}

test('(أ) tkRecIn: every بـn من 2 إلى 30 وإلا rec.n · md "last" مقبولٌ وغيرُه مرفوض · tkRecSum يذكر n', () => {
  const S = srv(), k = '1448-5-10';
  for (const n of [1, 31, 2.5, 0, '3', undefined]) { const r = S.tkRecIn({ t: 'every', n, open: 1 }, k); assert.equal(r.bad, 'rec.n', JSON.stringify(n)); assert.match(r.msg, /2/); }
  for (const n of [2, 7, 30]) { const r = S.tkRecIn({ t: 'every', n, open: 1 }, k); assert.ok(r.rec, JSON.stringify(r)); assert.equal(r.rec.n, n); assert.equal(r.rec.t, 'every'); }
  assert.equal(S.tkRecIn({ t: 'monthly', md: 'last', open: 1 }, k).rec.md, 'last');
  for (const md of ['x', 'LAST', 31, 0]) assert.equal(S.tkRecIn({ t: 'monthly', md, open: 1 }, k).bad, 'rec.md', JSON.stringify(md));
  const J = (o) => JSON.parse(JSON.stringify(o));                                   /* كائناتُ vm بنموذجٍ أوليّ آخر */
  assert.deepEqual(J(S.tkRecSum({ t: 'every', n: 4, ver: 1 })), { t: 'every', n: 4, to: '' });
  assert.deepEqual(J(S.tkRecSum({ t: 'monthly', md: 'last' })), { t: 'monthly', md: 'last', to: '' });
});

test('(أ) tkRecDue every: كل n يوماً من يوم البدء بعدّ الأيام المدنية — ولا قبل البدء · tkHijMid يجد منتصفَ ليل اليوم الهجري', () => {
  const S = srv(), T0 = 1790000000000, m0 = S.tkRiyMid(T0), from = S.tkHij(m0 + 12 * 36e5).k;
  assert.equal(S.tkHijMid(from, T0 + 40 * 864e5), m0, 'من بعيدٍ أمامه'); assert.equal(S.tkHijMid(from, T0 - 400 * 864e5), m0, 'ومن بعيدٍ خلفه');
  assert.equal(S.tkHijMid(from.replace(/-(\d)$/, '-0$1'), T0), m0, 'بصفرٍ بادئ');
  const rec = { t: 'every', n: 3, from, ver: 1 }, due = [];
  for (let i = -3; i <= 12; i++) { const D0 = m0 + i * 864e5, H = S.tkHij(D0 + 12 * 36e5); if (S.tkRecDue(rec, H, S.tkWdOf(D0 + 12 * 36e5), D0)) due.push(i); }
  assert.deepEqual(due, [0, 3, 6, 9, 12], 'من البدء كل 3 أيام');
  assert.equal(S.tkRecDue(rec, S.tkHij(m0 + 3 * 864e5 + 12 * 36e5), 0), false, 'بلا منتصف الليل لا حكمَ (لا توليدَ خطأ)');
  assert.equal(S.tkRecDue({ t: 'every', from, ver: 1 }, S.tkHij(m0 + 12 * 36e5), 0, m0), false, 'بلا n لا يولِّد');
});

test('(أ) tkRecDue monthly md "last": آخرُ يومٍ في شهر 29 وشهر 30 — وmd:30 لا يقع في شهر 29 كما كان', () => {
  const S = srv(), T0 = 1790000000000;
  for (const len of [29, 30]) {
    const Mo = monthOf(S, T0, len), rec = { t: 'monthly', md: 'last', from: Mo.H.k, ver: 1 }, hits = [];
    for (let d = 0; d < len + 2; d++) { const D0 = Mo.first + d * 864e5, H = S.tkHij(D0 + 12 * 36e5); if (S.tkRecDue(rec, H, 0, D0)) hits.push(H.k); }
    assert.deepEqual(hits, [Mo.H.y + '-' + Mo.H.m + '-' + len], 'شهرٌ من ' + len + ' يوماً: آخرُ يومٍ وحده (' + hits.join(',') + ')');
    const h30 = []; for (let d = 0; d < len; d++) { const D0 = Mo.first + d * 864e5, H = S.tkHij(D0 + 12 * 36e5); if (S.tkRecDue({ t: 'monthly', md: 30, from: Mo.H.k, ver: 1 }, H, 0, D0)) h30.push(H.k); }
    assert.equal(h30.length, len === 30 ? 1 : 0, 'md:30 في شهر ' + len);
    const D29 = Mo.first + 28 * 864e5, H29 = S.tkHij(D29 + 12 * 36e5); assert.equal(H29.d, 29);
    assert.equal(S.tkRecDue(rec, H29, 0), false, 'يومُ 29 بلا منتصف الليل: لا حكمَ (لا نسخةَ خطأً في شهر 30)');
  }
});

/* ── (ب) على العامل الحقيقي ── */
for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(ب) every n=3: التوليدُ يولّد كلَّ ثالث يومٍ من البدء في الأفق وحده · لا تكرارَ عند إعادة التشغيل · والتعديلُ إلى n=5 يُلغي ما خرج ويولّد الناقص', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const c = await mk(W, dm.ck, { title: 'كل 3 أيام', body: { rec: { t: 'every', n: 3, open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c), rec = ser(W, id)[0].r[23].rec; assert.equal(rec.t, 'every'); assert.equal(rec.n, 3); assert.equal(rec.from, kOf(0).replace(/-0(\d)/g, '-$1'));
    const g1 = await run(W); assert.equal(g1.status, 200, show(g1));
    assert.deepEqual(gen(W, id, c), inH([3, 6, 9, 12, 15, 18, 21, 24, 27]).map(kOf).sort(), 'كلُّ ثالث يومٍ حتى نهاية الأفق (30 يوماً)');
    assert.ok(ser(W, id).every((q) => q.r[14] === ME.eid && q.r[23].idem), 'للمكلَّف وبمفتاح عدم التكرار');
    assert.equal((await run(W)).j.created, 0, 'لا تكرار'); assert.equal((await run(W)).j.created, 0);
    const e = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'every', n: 5, open: 1 } }); assert.equal(e.status, 200, show(e)); assert.equal(e.j.ver, 2);
    const live = () => ser(W, id).filter((q) => !q.r[23].asg).map((q) => q.dk).sort();
    assert.deepEqual(live(), [0, 15].map(kOf).sort(), 'ما لم يعد موعداً أُلغي — والمشتركُ (15) باقٍ: ' + JSON.stringify(live()));
    assert.ok(ser(W, id).filter((q) => q.r[23].asg === 'cancelled').every((q) => q.r[23].can.why === 'عُدّل التكرار'));
    assert.equal((await run(W)).status, 200);
    assert.deepEqual(live(), inH([0, 5, 10, 15, 20, 25]).map(kOf).sort(), 'كل 5 أيام من البدء نفسِه');
    assert.equal((await run(W)).j.created, 0);
    const ev = W.env.DB.q("SELECT ctx FROM aud WHERE k = ? AND act = 'rec_edit'", KT); assert.equal(ev.length, 1);
    const cx = JSON.parse(ev[0].ctx); assert.equal(cx.before.n, 3); assert.equal(cx.after.n, 5);
  });

  test(M + '(ب) التحقّق عبر المسار: n خارج المدى أو غائب 400 at:rec.n · md غيرُ "last" ولا 1…30 400 at:rec.md — ولا كتابة', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM); const n0 = allRows(W).length;
    const bad = async (rec, at2) => { const r = await mk(W, dm.ck, { body: { rec } }); assert.equal(r.status, 400, JSON.stringify(rec) + ' ⇒ ' + show(r)); assert.equal(r.j.err, 'bad-body'); assert.equal(r.j.at, at2, JSON.stringify(rec)); };
    await bad({ t: 'every', n: 1 }, 'rec.n'); await bad({ t: 'every', n: 31 }, 'rec.n'); await bad({ t: 'every' }, 'rec.n'); await bad({ t: 'every', n: 2.5 }, 'rec.n'); await bad({ t: 'every', n: '3' }, 'rec.n');
    await bad({ t: 'monthly', md: 'first' }, 'rec.md'); await bad({ t: 'monthly', md: 'last!' }, 'rec.md'); await bad({ t: 'monthly', md: 31 }, 'rec.md');
    assert.equal(allRows(W).length, n0, 'لم يُكتب شيء');
    const one = await mk(W, dm.ck, { title: 'لمرة' }); assert.equal(one.status, 200);
    const r = await op(W, dm.ck, { op: 'start', k: one.j.rows[0].k, id: one.j.rows[0].id, rec: { t: 'every', n: 40 } }); assert.equal(r.status, 400, show(r)); assert.equal(r.j.at, 'rec.n');
    const s = await op(W, dm.ck, { op: 'start', k: one.j.rows[0].k, id: one.j.rows[0].id, rec: { t: 'every', n: 4, open: 1 } }); assert.equal(s.status, 200, show(s));
    assert.equal(s.j.rec.t, 'every'); assert.equal(s.j.rec.n, 4, 'التحويلُ يحمل n في الردّ');
    assert.equal((await run(W)).status, 200);
    const L = ser(W, s.j.rec.id).map((q) => q.dk).sort(); assert.deepEqual(L, inH([0, 4, 8, 12, 16, 20, 24, 28]).map(kOf).sort(), 'المحوَّلةُ تولِّد كل 4 أيام: ' + L.join(' '));
  });

  test(M + '(ب) monthly md "last": التوليدُ يولّد آخرَ يومٍ في الشهر الهجري وحده في الأفق (29 أو 30) · لا تكرار · وآخرُ الشهر لا يُتخطّى', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const c = await mk(W, dm.ck, { title: 'آخر الشهر', body: { rec: { t: 'monthly', md: 'last', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c); assert.equal(ser(W, id)[0].r[23].rec.md, 'last');
    const g = await run(W); assert.equal(g.status, 200, show(g));
    const exp = lastDays().filter((k) => k !== kOf(0));
    assert.ok(exp.length >= 1, 'في أفق 30 يوماً آخرُ شهرٍ واحدٌ على الأقل');
    assert.deepEqual(gen(W, id, c), exp, 'آخرُ الشهر (29 أو 30) وحده: ' + gen(W, id, c).join(' ') + ' ≠ ' + exp.join(' '));
    assert.ok(exp.every((k) => +k.split('-')[2] === 29 || +k.split('-')[2] === 30), 'يومُه 29 أو 30');
    assert.equal((await run(W)).j.created, 0, 'لا تكرارَ عند إعادة التشغيل');
    assert.ok(ser(W, id).every((q) => q.r[14] === ME.eid), 'للمكلَّف');
  });
}
