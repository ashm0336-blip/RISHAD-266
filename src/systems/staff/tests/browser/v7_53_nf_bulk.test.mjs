/* V7 · 53 (FIX_53_LIVEQA ١ · ٣): «سيلُ التنبيهات» — إسنادُ ورديةٍ لـ500 موظف في الجدول الشهري، في متصفحٍ حقيقي على المختبر المعزول
   (العاملُ الحقيقي · الإنفاذ · TEST_ONLY). الفاعلُ موظفٌ بدورٍ يملك الجدول (empA)، والحفظُ من منطق الصفحة نفسِه (saveStaffing — ما يستدعيه
   الإسنادُ الجماعي) فيمرّ بالمراقب الحقيقي (442) إلى الخادم:
   · مديرُ الإدارة يستلم تنبيهاً مجمّعاً واحداً «أُسندت <الوردية> لـ500 موظف…» — كان 365 تنبيه st_shift (دليلُ الفحص الحي)
   · كلُّ موظفٍ من الـ500 هدفُ تنبيهٍ واحد هو ورديتُه · الفاعلُ لا يُنبَّه بفعله · الموظفُ خارجَ الفعل لا يصله شيء */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, LAB, A, chromium, openAs, logicOf, until } from '../../../../../tests/browser/d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../../../../../tests/unit/world_fx.mjs';

const K = 'bsdept:' + A + ':bassam_staffing_v3', KE = 'bsdept:' + A + ':bassam_employees_v1';
const N = 500, OLD = 365, ek = (i) => 'TEST_ONLY_eN' + i;
const L = (p, fn, arg) => p.evaluate(async ([src, fn, arg]) => { const x = new Function('return ' + src)(); return new Function('L', 'arg', 'return (async () => {' + fn + '})()')(x, arg); }, [logicOf('Staffing'), fn, arg]);
const feed = async (s) => { const r = await s.api('/api/notifications?limit=200'); assert.equal(r.status, 200); return r.j.items.filter((x) => /^st_/.test(x.type)); };

test('53 · ١: bulk shift for 500 from the page → the unit manager ONE grouped notice; each of the 500 exactly one (his shift); the actor and the employee outside the action nothing', { timeout: 600000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const emps = [{ eid: 'TEST_ONLY_eA1', name: 'TEST_ONLY موظف أ', nid: LAB.empA }, { eid: 'TEST_ONLY_eA2', name: 'TEST_ONLY موظف أ٢', nid: '1200000002' }];
    for (let i = 0; i < N; i++) emps.push({ eid: ek(i), name: 'TEST_ONLY موظف ' + i, nid: String(1250000000 + i) });
    await replaceOperationalFixture(lab.env, KE, emps);
    await grant(b, lab, { staff: 'sensitive' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page; p.setDefaultTimeout(20000);
    await s.go('#/staffing', 5000);
    const { key, sh } = await L(p, 'return { key: L.monthKey(), sh: (L.state.shiftOpts || []).map((x) => x.name) };');
    assert.ok(sh.length >= 2, 'two shifts defined: ' + JSON.stringify(sh));
    /* 365 لهم الوردية الثانية من قبل */
    const before = {}; for (let i = 0; i < OLD; i++) before[ek(i)] = { shift: sh[1], rest: [] };
    await replaceOperationalFixture(lab.env, K, { [key]: before });
    await s.go('#/staffing', 5000);
    const n0 = lab.env.DB.q('SELECT COUNT(*) n FROM notification_messages')[0].n;
    /* الفعلُ الجماعي: الوردية الأولى للـ500 — بالحفظ الذي يستدعيه الإسنادُ الجماعي */
    const ok = await L(p, `const st = JSON.parse(JSON.stringify(L.state.staffing || {})), k = L.monthKey(); st[k] = st[k] || {};
      for (const e of arg.eks) st[k][e] = Object.assign({}, st[k][e] || {}, { shift: arg.sh }); return await L.saveStaffing(st);`, { eks: Array.from({ length: N }, (_, i) => ek(i)), sh: sh[0] });
    assert.equal(ok, true, 'saved');
    let last = -1;
    await until(async () => { await lab.idle(); const c = lab.env.DB.q('SELECT COUNT(*) n FROM notification_messages')[0].n; const st = c === last && c > n0; last = c; await new Promise((r) => setTimeout(r, 400)); return st; }, 'the notifications settle', 60000);
    const sent = lab.env.DB.q("SELECT id,type,body FROM notification_messages WHERE type GLOB 'st_*'");
    assert.ok(sent.length <= 5, 'a handful of messages, not one per employee: ' + sent.length);
    /* مديرُ الإدارة */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    const mi = await feed(m);
    assert.equal(mi.length, 1, 'one notice to the unit manager: ' + JSON.stringify(mi.map((x) => x.type + ' ' + x.b).slice(0, 3)));
    assert.equal(mi[0].type, 'st_shiftm');
    assert.match(mi[0].b, new RegExp('^أُسندت ' + sh[0] + ' لـ500 موظف في جدول .+ — بواسطة TEST_ONLY موظف أ$'), mi[0].b);
    /* كلُّ موظف: هدفُ تنبيهٍ واحد (ورديتُه) */
    const ids = new Set(sent.map((x) => x.id)), per = {};
    for (const t of lab.env.DB.q("SELECT message_id,value FROM notification_targets WHERE kind='employee'")) if (ids.has(t.message_id)) per[t.value] = (per[t.value] || 0) + 1;
    for (let i = 0; i < N; i++) assert.equal(per[ek(i)], 1, ek(i));
    assert.equal(per.TEST_ONLY_eA2, undefined, 'the employee outside the action'); assert.equal(per.TEST_ONLY_eA1, undefined, 'the actor');
    for (const x of sent.filter((x) => x.type === 'st_myshift')) assert.match(x.body, new RegExp('^ورديتك في جدول .+: ' + sh[0] + ' — بواسطة TEST_ONLY موظف أ$'), x.body);
    /* الفاعلُ لا يُنبَّه بفعله */
    assert.deepEqual((await feed(s)).map((x) => x.type), [], 'the actor gets nothing');
    assert.deepEqual(s.errs, [], 'no page errors');
    await m.ctx.close(); await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
