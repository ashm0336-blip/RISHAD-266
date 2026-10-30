/* KIVO_265 — إعادةُ المراجعة المستقلة لإصلاحات c2df109 (reports/k265/reviews/rereview_265_unified.md · FIX FIRST: متوسط 2 · منخفض 4 · معلومة 2)
   على العامل المولَّد بالوضعين — بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). تُخفق على c2df109 أولاً (reports/k265/unified/*_on_c2df109.txt):
     (N-1 متوسط · انحدار) حذفُ موظفٍ عضوٍ في مجموعةٍ قديمة تتشارك الهوية 13 وكتب الخادمُ عمودَها 23 (إعداداتُ المجموعة) — ذرّياً (الموظفون + تنظيفُ المهام)
                          وعلى دفعتين ⇒ يُكتب كما في 264 (كان task-x فيبقى الموظفُ في السجل)
     (N-3) حكمُ الحساب في الخادم بفهرسٍ واحد (لا O(U·E) لكل رمز) — حفظةٌ خامّة تُسند 300 صفٍّ جديد في زمنٍ معقول
     (N-4) الربطُ اليدوي لا يجعل المراجِعَ مكلَّفاً (400 at:to) — كإعادة الإسناد والحفظ الخامّ (R-7)
     (N-5) حفظٌ خامٌّ مصنوع ينقل إنجازَ الموظف وإثباتَه (20 · 21) إلى زميلٍ بهويةٍ جديدة (نقلاً أو نسخاً) ⇒ task-asg والزميلُ لا يقرأ الصورة (P0) —
          والمسارُ الذاتي يكتب 20/21 كما كان
     (N-6) علامةُ الاستعادة تُستثنى بها مخزنُ المهام إن كانت على مفتاحه نفسِه — لا علامةُ مفتاحٍ آخر في الحفظة */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, P0, KT, KE, TAG, DAY, stored, putKV, row, hij, HR } from './tasks_fx.mjs';
import { upImg, act } from './tasks_conc_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const allRows = (W) => Object.values(stored(W.env, KT) || {}).flat().filter(Array.isArray);
const find = (W, id, ek) => allRows(W).find((r) => r[13] === id && (ek === undefined || r[14] === ek)) || null;
const saved = (r, k) => !!(r.j && r.j.revs && r.j.revs[k || KT]);
const deniedWhy = (r, k) => (r.j && r.j.denied && r.j.denied[k || KT] ? r.j.denied[k || KT].why : '');
const show = (r) => JSON.stringify(r.j || r).slice(0, 260);
async function cur(W, ck) { const g = await get(W, ck, '/api/get?keys=' + encodeURIComponent(KT)); return { S: JSON.parse(g.j.keys[KT].v), rev: g.j.keys[KT].rev }; }
async function raw(W, ck, mut, extra) { const c = await cur(W, ck); mut(c.S); return post(W, ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(c.S) }, del: [], base: { [KT]: c.rev } }, extra || {})); }
const G = 1760000000110;                                                               /* مجموعةُ العُدّة القديمة: صفّان (ME · MATE) يتشاركان 13 */
/* تنظيفُ حذف الموظف كما تكتبه الواجهة (590 cleanupAssignments): خاناتُ الإسناد 7 · 8 · 14 تُفرَّغ لصفوف المحذوف */
const cleanup = (S, eid, name) => { let n = 0; for (const d in S) S[d] = S[d].map((r) => { if (!Array.isArray(r) || !(r[14] === eid || r[8] === name)) return r; n++; const q = r.slice(); q[7] = []; q[8] = ''; q[14] = ''; return q; }); return n; };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';
  const WHY = (ks) => (mode === 'enforce' ? { why: Object.fromEntries(ks.map((k) => [k, 'TEST_ONLY سببٌ كما ترسله نافذةُ السبب'])) } : {});

  test(M + '(N-1) حذفُ موظفٍ عضوٍ في مجموعةٍ قديمة بعمودها 23 — ذرّياً وعلى دفعتين ⇒ يُكتب (لا task-x) وصفوفُه بلا إسناد', async () => {
    for (const twoBatches of [false, true]) {
      const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
      assert.equal((await post(W, dm.ck, '/api/tasks/settings', { k: DAY, grp: 'gTST1', pol: { m: 'note' } })).status, 200, 'إعداداتُ المجموعة (x على صفّيها)');
      assert.ok(stored(W.env, KT)[DAY].filter((r) => r[13] === G).every((r) => r[23]), 'صفّا المجموعة بعمودهما 23');
      const g = await get(W, dm.ck, '/api/get?keys=' + encodeURIComponent(KT + ',' + KE));
      const E = JSON.parse(g.j.keys[KE].v).filter((e) => e.eid !== MATE.eid), S = JSON.parse(g.j.keys[KT].v);
      assert.ok(cleanup(S, MATE.eid, MATE.name) >= 2, 'للزميل صفوف');
      if (!twoBatches) {
        const r = await post(W, dm.ck, '/api/save', Object.assign({ set: { [KE]: JSON.stringify(E), [KT]: JSON.stringify(S) }, del: [], base: { [KE]: g.j.keys[KE].rev, [KT]: g.j.keys[KT].rev } }, WHY([KE, KT])));
        assert.equal(r.status, 200, show(r));
        assert.ok(saved(r, KE) && saved(r, KT), 'ذرّياً: الموظفون والمهامُ معاً — ' + show(r));
        assert.equal(r.j.atomic, 'empDelete', 'حذف الموظف وتنظيف المهام في المعاملة المحمية');
        assert.equal(r.j.revs[KE], r.j.revs[KT], 'مراجعة واحدة للمفتاحين');
        assert.deepEqual(r.j.denied, {}, 'لا رفض جزئي');
        assert.deepEqual(r.j.conflicts, {}, 'لا تعارض جزئي');
      } else {
        const r1 = await post(W, dm.ck, '/api/save', Object.assign({ set: { [KE]: JSON.stringify(E) }, del: [], base: { [KE]: g.j.keys[KE].rev } }, WHY([KE])));
        assert.ok(saved(r1, KE), 'الدفعةُ الأولى (الموظفون): ' + show(r1));
        const r2 = await post(W, dm.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g.j.keys[KT].rev } }, WHY([KT])));
        assert.ok(saved(r2), 'الدفعةُ الثانية (تنظيفُ المهام وحده): ' + show(r2));
      }
      assert.ok(!stored(W.env, KE).some((e) => e.eid === MATE.eid), 'حُذف من السجل');
      assert.equal(allRows(W).filter((r) => r[14] === MATE.eid).length, 0, 'ولا صفَّ بمعرّفه');
      const gr = stored(W.env, KT)[DAY].filter((r) => r[13] === G);
      assert.ok(gr.length === 2 && gr.every((r) => r[23]) && gr.some((r) => r[14] === ''), 'صفُّه في المجموعة بلا إسناد وعمودُ 23 كما هو: ' + JSON.stringify(gr.map((r) => [r[14], !!r[23]])));
    }
  });

  test(M + '(N-1) والحدُّ قائم: تفريغُ إسناد موظفٍ حيّ في الهوية المشتركة · نزعُ 23 من صفّ المحذوف ⇒ رفض', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    assert.equal((await post(W, dm.ck, '/api/tasks/settings', { k: DAY, grp: 'gTST1', pol: { m: 'note' } })).status, 200);
    const a = await raw(W, dm.ck, (S) => { S[DAY] = S[DAY].map((r) => (r[13] === G && r[14] === MATE.eid ? Object.assign(r.slice(), { 7: [], 8: '', 14: '' }) : r)); }, WHY([KT]));
    assert.equal(deniedWhy(a), 'task-x', 'موظفٌ حيّ — لا يُفرَّغ صفُّه في هويةٍ مشتركة بعمودها 23: ' + show(a));
    const g = await get(W, dm.ck, '/api/get?keys=' + encodeURIComponent(KT + ',' + KE));
    const E = JSON.parse(g.j.keys[KE].v).filter((e) => e.eid !== MATE.eid), S = JSON.parse(g.j.keys[KT].v);
    S[DAY] = S[DAY].map((r) => (r[13] === G && r[14] === MATE.eid ? r.slice(0, 23).map((v, j) => (j === 7 ? [] : j === 8 || j === 14 ? '' : v)) : r));
    const b = await post(W, dm.ck, '/api/save', Object.assign({ set: { [KE]: JSON.stringify(E), [KT]: JSON.stringify(S) }, del: [], base: { [KE]: g.j.keys[KE].rev, [KT]: g.j.keys[KT].rev } }, WHY([KE, KT])));
    assert.equal(deniedWhy(b), 'task-x', 'تنظيفٌ ينزع 23: ' + show(b));
    assert.ok(stored(W.env, KE).some((e) => e.eid === MATE.eid), 'ذرّياً: الموظفُ باقٍ');
  });

  test(M + '(N-3) حفظةٌ خامّة تُسند 600 صفٍّ لـ600 صاحب حسابٍ نشط ⇒ كلفةُ حكم الحساب صغيرةٌ أمام الحفظة نفسِها (فهرسٌ واحد للحسابات)', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const E = stored(W.env, KE), U = stored(W.env, 'bassam_auth_users_v1'), base = E.find((e) => e.eid === ME.eid), N = 600;
    for (let i = 0; i < N; i++) {
      const eid = 'tst_e_bulk_' + i;
      E.push(Object.assign({}, base, { eid, name: TAG + ' · جماعي ' + i, empno: '', nid: String(1990000000 + i) }));
      U.push({ id: 'tst_bulk_' + i, un: String(2100000000 + i), ph: 'p2$100000$00$00', name: TAG + ' · جماعي ' + i, role: 'staff', deptId: 'tst_d1', ekey: eid, dis: 0, test: TAG });
    }
    putKV(W.env, KE, E); putKV(W.env, 'bassam_auth_users_v1', U);
    const s = Date.now() + 2 * HR, ids = Array.from({ length: N }, (_, i) => 1760000300000 + i);
    /* خطُّ الأساس: الحفظةُ نفسُها حجماً — 600 صفٍّ عامّ بلا مكلَّف (لا حكمَ حساب) */
    let t0 = Date.now();
    const g0 = await raw(W, dm.ck, (S) => { ids.forEach((id, i) => S[DAY].push(row({ id, title: 'جماعي ' + i, s, e: s + HR }))); }, WHY([KT]));
    const base0 = Date.now() - t0; assert.ok(saved(g0), show(g0));
    /* إسنادُها كلِّها (600 زوجٍ جديد ⇒ 600 حكمِ حساب) */
    t0 = Date.now();
    const r = await raw(W, dm.ck, (S) => { S[DAY] = S[DAY].map((q) => { const i = ids.indexOf(q[13]); if (i < 0) return q; const x = q.slice(); x[14] = 'tst_e_bulk_' + i; x[8] = TAG + ' · جماعي ' + i; return x; }); }, WHY([KT]));
    const ms = Date.now() - t0;
    assert.ok(saved(r), 'يُكتب: ' + show(r));
    assert.ok(ms - base0 < 900, 'كلفةُ الحكم ' + (ms - base0) + ' ms فوق الحفظة نفسِها (' + base0 + ' ms) — كانت تكعيبية (≈ 2 ث لـ600 على c2df109 · 45 ث في مجسّ المراجِع)');
    const r2 = await raw(W, dm.ck, (S) => { S[DAY].push(row({ id: 1760000399999, title: 'لمن لا حسابَ له', eid: 'tst_e_nobody', s, e: s + HR })); }, WHY([KT]));
    assert.equal(deniedWhy(r2), 'task-acct', 'والقاعدةُ كما هي');
  });

  test(M + '(N-4) الربطُ اليدوي لا يجعل المراجِعَ المسمّى مكلَّفاً ⇒ 400 at:to — ولغيره يمضي', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), s = Date.now() + 2 * HR;
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' بمراجِع', s, e: s + HR, asg: [ME.eid], rv: { u: 'tst_sup1' }, force: true });
    assert.equal(c.status, 200, show(c)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    /* صارت «غيرَ مرتبطة» (مكلَّفُها برمزٍ لا يطابق سجلّاً — كأن حُذف سجلُّه) */
    const S = stored(W.env, KT); const i = S[k].findIndex((r) => r[13] === id); S[k][i][14] = TAG + ' رمزٌ قديم'; putKV(W.env, KT, S);
    const a = await post(W, dm.ck, '/api/tasks/relink', { k, id, from: TAG + ' رمزٌ قديم', to: 'tst_e_sup1' });
    assert.equal(a.status, 400, 'إلى المراجِع: ' + show(a)); assert.ok(/المراجِعُ لا يكون المكلَّفَ/.test(a.j.msg || ''), a.j.msg);
    assert.equal(find(W, id)[14], TAG + ' رمزٌ قديم', 'لم يُربط');
    const b = await post(W, dm.ck, '/api/tasks/relink', { k, id, from: TAG + ' رمزٌ قديم', to: ME.eid });
    assert.equal(b.status, 200, 'لغيره: ' + show(b)); assert.equal(find(W, id)[14], ME.eid);
  });

  test(M + '(N-5) حفظٌ خامٌّ ينقل إنجازَ الموظف وإثباتَه إلى زميلٍ بهويةٍ جديدة ⇒ task-asg والزميلُ لا يقرأ الصورة — والمسارُ الذاتي كما هو', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
    const s = Date.now() - 10 * 60e3, c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' للنقل', s, e: s + 3 * HR, asg: [ME.eid], rv: 'none', force: true });
    assert.equal(c.status, 200, show(c)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const img = await upImg(W, me.ck, 'n5');
    assert.equal((await act(W, me.ck, { k, id, act: 'start' })).status, 200, 'المسارُ الذاتي يبدأ');
    assert.equal((await act(W, me.ck, { k, id, act: 'submit', imgs: [img], note: TAG + ' أنجزتُها' })).status, 200, 'ويُنهي بإثباته');
    const nid = 1760000500001, copyTo = (S, keep) => { const i = S[k].findIndex((r) => r[13] === id); const r = S[k][i].slice(); r[13] = nid; r[22] = null; r[14] = MATE.eid; r[8] = MATE.name; r.length = 22; if (!keep) S[k].splice(i, 1); S[k].push(r); };
    for (const keep of [false, true]) {
      const r = await raw(W, dm.ck, (S) => copyTo(S, keep), WHY([KT]));
      assert.equal(deniedWhy(r), 'task-asg', (keep ? 'نسخاً' : 'نقلاً') + ' بهويةٍ جديدة: ' + show(r));
    }
    assert.equal(find(W, nid), null, 'لا صفَّ للزميل'); assert.ok(find(W, id, ME.eid)[21].imgs.includes(img), 'والإثباتُ لصاحبه');
    assert.equal((await get(W, mate.ck, '/api/me/tasks/img?id=' + encodeURIComponent(img))).status, 403, 'ولا يقرأ الزميلُ الصورة (P0)');
  });

  test(M + '(N-6) علامةُ الاستعادة على مفتاحٍ آخر في الحفظة لا تُستثنى بها المهام — وعلى مفتاحها نفسِه تُستثنى', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), s = Date.now() + 2 * HR;
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' للعلامة', s, e: s + HR, asg: [ME.eid], rv: 'none' }); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const op = { op: 'backup.restore', scope: 'dept', mode: 'replace', reason: TAG + ' استعادة' };
    const g = await get(W, dm.ck, '/api/get?keys=' + encodeURIComponent(KT + ',' + KE));
    const S = JSON.parse(g.j.keys[KT].v), i = S[k].findIndex((r) => r[13] === id); S[k][i] = S[k][i].slice(); S[k][i][23] = Object.assign({}, S[k][i][23], { by: { u: 'admin', n: 'TEST_ONLY مزوَّر' } });
    const E = JSON.parse(g.j.keys[KE].v); E.push({ eid: 'tst_e_marker', name: TAG + ' · للعلامة' });
    const why = { why: { [KT]: TAG + ' استعادة', [KE]: TAG + ' استعادة' } };
    const a = await post(W, dm.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S), [KE]: JSON.stringify(E) }, del: [], base: { [KT]: g.j.keys[KT].rev, [KE]: g.j.keys[KE].rev }, ops: { [KE]: op } }, why));
    assert.ok(!saved(a), 'علامةُ مفتاح الموظفين وحده لا تفتح المهام: ' + show(a));
    if (mode === 'legacy') assert.equal(deniedWhy(a), 'task-x', show(a));
    assert.ok(!(find(W, id)[23].by && find(W, id)[23].by.u === 'admin'), 'x كما هي');
    if (mode === 'legacy') {                                                           /* على مفتاح المهام نفسِه: لمدير النظام وحده في القديم (F-2/R-21 — كانت لمدير الإدارة كما في 264) */
      const g2 = await get(W, dm.ck, '/api/get?keys=' + encodeURIComponent(KT));
      const b0 = await post(W, dm.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g2.j.keys[KT].rev }, ops: { [KT]: op } }, why));
      assert.equal(deniedWhy(b0), 'task-x', 'علامةُ مفتاح المهام من مدير الإدارة (F-2): ' + show(b0));
      const g3 = await get(W, W.su.ck, '/api/get?keys=' + encodeURIComponent(KT));
      const b = await post(W, W.su.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g3.j.keys[KT].rev }, ops: { [KT]: op } }, why));
      assert.ok(saved(b), 'علامةُ مفتاح المهام من مدير النظام: ' + show(b));
    }
  });
}
