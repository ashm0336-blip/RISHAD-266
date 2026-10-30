/* KIVO_265 · قرارُ المالك (2026-10-14 15:13 · البند 4): «اجعل وجود حساب مستخدم نشط شرطًا لإسناد مهمة إلكترونية جديدة للموظف. يُمنع الإسناد لمن لا يمتلك
   حسابًا أو حسابه معطّل، مع بيان السبب في الواجهة وتطبيق المنع في الخادم. أما الموظف الذي يمتلك حسابًا نشطًا لكنه غير متصل حاليًا، فيمكن إسناد المهمة
   له إذا كان متاحًا للعمل وفق خطته.» — في الخادم بالوضعين (العاملُ المولَّد · بياناتٌ اصطناعية وحدها: tests/unit/tasks_fx.mjs):
     (أ) الأهلية: بلا حساب ⇒ «غير متاح» قاطع (no_acct · hard) بسببه · حسابٌ معطَّل ⇒ acct_disabled · حسابٌ نشطٌ لم يدخل قطّ ⇒ acct:1 وليس قاطعاً
     (ب) الإنشاء: بلا حساب أو بحسابٍ معطَّل ⇒ 409 acct ولو بالتأكيد (force) — ولا يُكتب صفٌّ ولا حدث · المجموعةُ التي فيها واحدٌ منهما تُرفض كلُّها
     (ج) الإنشاء لموظفٍ حسابُه نشطٌ ولم يتصل (لا جلسةَ له) ⇒ يُنشأ — والاتصالُ لا يُشترط
     (د) إعادةُ الإسناد: إلى من لا حسابَ له أو حسابُه معطَّل ⇒ 409 acct ولو بالتأكيد · بعد تفعيل الحساب ⇒ تمضي
     (هـ) الحسابُ «له» بقاعدة «ملفي» نفسِها: رقمُ هويةٍ يحمله سجلّان ⇒ لا حساب (لن يرى المهمة) · والمراجعةُ الموحّدة (R-3 · review_265_unified.md):
         مفتاحُه رقمُ هويةٍ يحمله سجلُّه وحده ⇒ «حسابُه برقم الهوية» قاطعٌ (acct_nid) — كان «نشطاً» فيُسند إليه بالمعرّف الثابت ثم يراها ولا ينفّذها
         (062c: العمود 14 = مفتاحُ الحساب حرفاً) — والتفصيلُ في tasks_unified265 (R-3)
     (و) التكرار: نسخةٌ جديدة لمكلَّفٍ عُطِّل حسابُه بعد إنشاء السلسلة لا تُولَّد (والسببُ في ردّ التوليد) ويُولَّد لغيره */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, P0, KT, KE, TAG, stored, putKV, addAccount, hij, HR, taskCommandBody, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const NOACCT = 'tst_e_noacct', NIDACCT = 'tst_e_nidacct', DUP1 = 'tst_e_dupnid1', DUP2 = 'tst_e_dupnid2';
const allRows = (W) => Object.values(stored(W.env, KT) || {}).flat().filter(Array.isArray);
const rowsOf = (W, ek) => allRows(W).filter((r) => r[14] === ek);
const audN = (W, act) => W.env.DB.q('SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = ?', KT, act)[0].n;
/* موظفون إضافيون اصطناعيون: بلا حساب · بحسابٍ مفتاحُه رقمُ هويته · رقمُ هويةٍ مكرَّر في سجلّين (وحسابٌ به) — ويُعطَّل حسابُ MATE */
async function seed(W) {
  const E = stored(W.env, KE), base = E.find((e) => e.eid === ME.eid);
  const mk = (eid, name, nid) => Object.assign({}, base, { eid, name: TAG + ' · ' + name, empno: '', nid });
  E.push(mk(NOACCT, 'بلا حساب'), mk(NIDACCT, 'حسابُه برقم الهوية', '1999000777'), mk(DUP1, 'هويةٌ مكرّرة ١', '1999000888'), mk(DUP2, 'هويةٌ مكرّرة ٢', '1999000888'));
  await replaceOperationalFixture(W.env, KE, E);
  addAccount(W.env, { uid: 'tst_nidacct', un: '2000000377', pw: '70377', ekey: '1999000777' });
  addAccount(W.env, { uid: 'tst_dupnid', un: '2000000388', pw: '70388', ekey: '1999000888' });
  setDis(W, MATE.uid, 1);
}
function setDis(W, uid, dis) { const U = stored(W.env, 'bassam_auth_users_v1'); U.find((u) => u.id === uid).dis = dis; putKV(W.env, 'bassam_auth_users_v1', U); }
const body = (asg, extra) => { const s = Date.now() + 2 * HR; return Object.assign({ k: hij(s), t: TAG + ' اختبارُ الحساب النشط', s, e: s + HR, asg, rv: 'none' }, extra || {}); };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) الأهلية: بلا حساب ⇒ «غير متاح» قاطع بسببه · حسابٌ معطَّل ⇒ قاطع بسببه · نشطٌ لم يدخل قطّ ⇒ ليس قاطعاً', async () => {
    const W = await world({ worker: WU.file, mode }); await seed(W); const dm = await W.login(...DM);
    const s = Date.now() + 2 * HR, r = await get(W, dm.ck, '/api/tasks/eligibility?ekeys=' + [NOACCT, MATE.eid, ME.eid, NIDACCT, DUP1].join(',') + '&s=' + s + '&e=' + (s + HR));
    assert.equal(r.status, 200, JSON.stringify(r.j));
    const by = Object.fromEntries(r.j.items.map((x) => [x.ekey, x]));
    assert.ok(by[NOACCT].hard === 1 && by[NOACCT].acct === 0 && by[NOACCT].code === 'no_acct' && by[NOACCT].result === 'غير متاح' && /لا يملك حسابَ مستخدم/.test(by[NOACCT].why), 'بلا حساب: ' + JSON.stringify(by[NOACCT]));
    assert.ok(by[MATE.eid].hard === 1 && by[MATE.eid].code === 'acct_disabled' && /معطَّل/.test(by[MATE.eid].why), 'معطَّل: ' + JSON.stringify(by[MATE.eid]));
    assert.ok(by[ME.eid].acct === 1 && !by[ME.eid].hard && !/acct/.test(by[ME.eid].code), 'نشطٌ لم يدخل قطّ: ' + JSON.stringify(by[ME.eid]));
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM sess WHERE uid = ?", ME.uid)[0].n, 0, 'ME بلا جلسةٍ أصلاً (غيرُ متصل)');
    assert.ok(by[NIDACCT].acct === 0 && by[NIDACCT].hard === 1 && by[NIDACCT].code === 'acct_nid' && /رقم الهوية/.test(by[NIDACCT].why), 'حسابٌ مفتاحُه رقمُ هويته الفريد ⇒ قاطعٌ بسببه (R-3): ' + JSON.stringify(by[NIDACCT]));
    assert.ok(by[DUP1].hard === 1 && by[DUP1].code === 'no_acct', 'رقمُ هويةٍ في سجلّين ⇒ لا حساب: ' + JSON.stringify(by[DUP1]));
  });

  test(M + '(ب) الإنشاء: بلا حساب أو بحسابٍ معطَّل ⇒ 409 acct ولو بالتأكيد — بلا صفٍّ ولا حدث · والمجموعةُ المختلطة تُرفض كلُّها', async () => {
    const W = await world({ worker: WU.file, mode }); await seed(W); const dm = await W.login(...DM);
    const n0 = allRows(W).length, c0 = audN(W, 'created');
    for (const [asg, force] of [[[NOACCT], false], [[NOACCT], true], [[MATE.eid], true], [[ME.eid, NOACCT], true]]) {
      const r = await post(W, dm.ck, '/api/tasks/create', body(asg, force ? { force: true } : null));
      assert.equal(r.status, 409, asg.join('+') + (force ? ' (force)' : '') + ': ' + JSON.stringify(r.j).slice(0, 200));
      assert.equal(r.j.err, 'acct', 'الرمز acct');
      assert.ok(/حساب/.test(r.j.msg || ''), 'والسببُ في الرسالة: ' + r.j.msg);
      assert.ok(Array.isArray(r.j.items) && r.j.items.some((x) => x.hard === 1), 'وبنودُ الأهلية للواجهة');
    }
    assert.equal(allRows(W).length, n0, 'لم يُكتب صفّ'); assert.equal(audN(W, 'created'), c0, 'ولا حدثُ «أُنشئت»');
    assert.equal(rowsOf(W, ME.eid).filter((r) => String(r[0]).indexOf('اختبارُ الحساب النشط') !== -1).length, 0, 'ولا نصفَ مجموعة');
  });

  test(M + '(ج) حسابٌ نشطٌ غيرُ متصل (لا جلسةَ له) ⇒ يُنشأ له — والاتصالُ لا يُشترط', async () => {
    const W = await world({ worker: WU.file, mode }); await seed(W); const dm = await W.login(...DM);
    const r = await post(W, dm.ck, '/api/tasks/create', body([ME.eid, P0[2].eid]));
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
    assert.equal(r.j.rows.length, 2); assert.ok(r.j.elig.every((x) => x.acct === 1 && !x.hard), JSON.stringify(r.j.elig));
    assert.equal(W.env.DB.q('SELECT COUNT(*) AS n FROM sess WHERE uid IN (?, ?)', ME.uid, P0[2].uid)[0].n, 0, 'بلا جلسة');
  });

  test(M + '(د) إعادةُ الإسناد: إلى من لا حسابَ له أو حسابُه معطَّل ⇒ 409 acct ولو بالتأكيد · بعد تفعيل الحساب ⇒ تمضي', async () => {
    const W = await world({ worker: WU.file, mode }); await seed(W); const dm = await W.login(...DM);
    const c = await post(W, dm.ck, '/api/tasks/create', body([ME.eid]));
    assert.equal(c.status, 200, JSON.stringify(c.j).slice(0, 200)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    for (const to of [NOACCT, MATE.eid]) {
      const r = await post(W, dm.ck, '/api/tasks/reassign', { k, id, from: ME.eid, to, force: true });
      assert.equal(r.status, 409, to + ': ' + JSON.stringify(r.j).slice(0, 200)); assert.equal(r.j.err, 'acct');
    }
    assert.equal(rowsOf(W, NOACCT).length + rowsOf(W, MATE.eid).filter((r) => r[13] === id).length, 0, 'لم يُكتب شيء');
    setDis(W, MATE.uid, 0);
    const ok = await post(W, dm.ck, '/api/tasks/reassign', { k, id, from: ME.eid, to: MATE.eid, force: true });
    assert.equal(ok.status, 200, 'بعد التفعيل: ' + JSON.stringify(ok.j).slice(0, 200));
  });

  test(M + '(و) التكرار: لا نسخةَ جديدة لمكلَّفٍ عُطِّل حسابُه بعد إنشاء السلسلة — وتُولَّد لغيره، والسببُ في ردّ التوليد', async () => {
    const W = await world({ worker: WU.file, mode }); await seed(W); setDis(W, MATE.uid, 0); const dm = await W.login(...DM);
    const s = Date.now() + 30 * 60e3, to = hij(s + 6 * 864e5);
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' سلسلةُ الحساب النشط', s, e: s + HR, asg: [ME.eid, MATE.eid], rv: 'none', force: true, rec: { t: 'daily', to } });
    assert.equal(c.status, 200, JSON.stringify(c.j).slice(0, 300));
    const gen = (ek) => allRows(W).filter((r) => r[14] === ek && String(r[0]).indexOf('سلسلةُ الحساب النشط') !== -1).length;
    const me0 = gen(ME.eid), mate0 = gen(MATE.eid);
    setDis(W, MATE.uid, 1);
    const run = await post(W, dm.ck, '/api/tasks/recur/run', {});
    assert.equal(run.status, 200, JSON.stringify(run.j).slice(0, 300));
    assert.ok(gen(ME.eid) > me0, 'وُلِّدت نسخٌ جديدة لصاحب الحساب النشط (' + me0 + ' ⇒ ' + gen(ME.eid) + ')');
    assert.equal(gen(MATE.eid), mate0, 'ولا نسخةَ جديدة للمعطَّل');
    const sk = (run.j.skipped || []).filter((x) => x.ekey === MATE.eid);
    assert.ok(sk.length > 0 && sk.every((x) => /معطَّل/.test(x.why)), 'السببُ في ردّ التوليد: ' + JSON.stringify(sk.slice(0, 2)));
  });
}
