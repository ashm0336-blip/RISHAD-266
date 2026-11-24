/* V7 · 53 (uiqa) — الأقفالُ في الخادم (المختبرُ المعزول · العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   البند 9: موظفٌ بصلاحية «مشاهدة فقط» يكتب على الأقفال (الجدول الشهري · المهام · الإحصائيات اليومية) ⇒ 403 صريح ولا يتغيّر شيء.
   قرارا المالك ٧ و٨ (REPLY_52_3): المهام — الشهرُ الماضي مقفلٌ اعتُمد أو لم يُعتمد ولا يُفتح إلا للاستدراك ({mo:1})؛ موظفٌ بدور «حسّاس» يحذف في شهرٍ ماضٍ
   غيرِ معتمد ⇒ يُرفض برسالة؛ والرسالةُ بحسب القارئ: لمدير الإدارة «الشهر مقفل — افتحه للاستدراك أولاً»، وللموظف «راجع مدير الإدارة». */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, LAB, openAs, chromium, A } from './d7_cov_lib.mjs';
import { replaceOperationalFixture, inspectOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';

const K = (r) => 'bsdept:' + A + ':' + r, EP = (lab) => Number(lab.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0);
let seq = 0;
const read = async (s, k) => { const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(k)); return { v: (r.j && r.j.resources && r.j.resources[k]) || null, rev: (r.j && r.j.base && r.j.base[k]) || 0 }; };
const save = (s, lab, k, v, rev) => s.api('/api/save', { method: 'POST', body: JSON.stringify(v === undefined
  ? { requestId: 'TEST_ONLY_d53_' + (++seq) + '_xxxx', epoch: EP(lab), del: [k], base: { [k]: rev } }
  : { requestId: 'TEST_ONLY_d53_' + (++seq) + '_xxxx', epoch: EP(lab), set: { [k]: JSON.stringify(v) }, base: { [k]: rev } }) });
/* اليومُ الهجريّ للخادم (أم القرى · الرياض − 3 ساعات) والشهرُ الماضي */
const T = (() => { const o = {}; new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(Date.now() - 3 * 3600e3)).forEach((p) => { o[p.type] = p.value; }); return { y: parseInt(o.year, 10), m: +o.month, d: +o.day }; })();
const PM = T.m === 1 ? { y: T.y - 1, m: 12 } : { y: T.y, m: T.m - 1 }, PMK = PM.y + '-' + PM.m, PDAY = PMK + '-10';
const taskRow = (id, title) => ['TEST_ONLY ' + title, '', 'normal', 'pending', 'normal', 'مضافة', null, ['T'], 'TEST_ONLY موظف أ٢', 'TEST_ONLY مدير أ', 60, null, null, id, 'TEST_ONLY_eA2', null, null, null, null, null, null, null];

test('البند 9: «مشاهدة فقط» يكتب على الأقفال ⇒ 403 صريح ولا يتغيّر شيء (الجدول الشهري · المهام · الإحصائيات اليومية)', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await grant(b, lab, { staff: 'view', tasks: 'view', dstats: 'view' });
    const seed = { [PMK]: true, [T.y + '-' + T.m]: { mo: 1 } };
    for (const r of ['bassam_staffing_locks_v1', 'bassam_tasks_locks_v1']) await replaceOperationalFixture(lab.env, K(r), seed);
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    for (const r of ['bassam_staffing_locks_v1', 'bassam_tasks_locks_v1']) {
      const k = K(r), { v, rev } = await read(e, k);
      assert.deepEqual(v, seed, r + ': the viewer reads the locks');
      for (const [what, nv] of [['lock', Object.assign({}, v, { [T.y + '-' + T.m]: true })], ['reopen', Object.assign({}, v, { [PMK]: { mo: 1 } })], ['remove', {}], ['same', v], ['delete', undefined]]) {
        const s = await save(e, lab, k, nv, rev);
        assert.equal(s.status, 403, r + ' · ' + what + ': explicit 403 — ' + JSON.stringify(s.j).slice(0, 300));
        assert.equal(s.j.ok, 0); assert.ok(s.j.denied && s.j.denied[k], r + ' · ' + what + ': the key is named as denied');
        assert.deepEqual(inspectOperationalFixture(lab.env, k), seed, r + ' · ' + what + ': nothing changed on the server');
      }
    }
    const uid = await e.page.evaluate(() => window.__BS_BOOT.uid), g = await e.api('/api/dstats?uid=' + encodeURIComponent(uid));
    for (const locks of [{ ['haram|' + PMK]: { ap: 1 } }, { ['haram|' + PMK]: { dopen: { 5: 1 } } }, { ['haram|' + PMK]: {} }]) {
      const s = await e.api('/api/dstats', { method: 'POST', body: JSON.stringify({ uid, base: g.j.rev, data: Object.assign({}, g.j.data, { locks }) }) });
      assert.equal(s.status, 403, 'dstats ' + JSON.stringify(locks) + ': ' + JSON.stringify(s.j));
    }
    assert.deepEqual((await e.api('/api/dstats?uid=' + encodeURIComponent(uid))).j.data.locks, g.j.data.locks, 'dstats locks unchanged');
  } finally { await b.close(); await lab.close(); }
});

test('قرار ٧ و٨: حذفُ مهمةٍ في شهرٍ ماضٍ غيرِ معتمد يُرفض لموظفٍ بدور «حسّاس» برسالة — والرسالةُ بحسب القارئ', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await grant(b, lab, { tasks: 'sensitive' });
    const KT = K('bassam_tasks_v1'), KL = K('bassam_tasks_locks_v1');
    await replaceOperationalFixture(lab.env, KT, { [PDAY]: [taskRow(1760000053001, 'مهمة الشهر الماضي'), taskRow(1760000053002, 'مهمة ثانية')] });
    await replaceOperationalFixture(lab.env, KL, {});   /* الشهرُ الماضي غيرُ معتمد ولم يُفتح */
    const tryDel = async (s, id) => { const { v, rev } = await read(s, KT); v[PDAY] = v[PDAY].filter((r) => r[13] !== id); return save(s, lab, KT, v, rev); };
    const msgOf = (s, r) => s.page.evaluate((j) => KIVO.__BS_SRV.operations.explain({ details: { denied: j.denied, conflicts: j.conflicts } }), r.j);
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    const r1 = await tryDel(e, 1760000053001);
    assert.equal(r1.status, 403, 'the employee with a «حسّاس» role is refused: ' + JSON.stringify(r1.j).slice(0, 400));
    assert.equal(inspectOperationalFixture(lab.env, KT)[PDAY].length, 2, 'nothing deleted');
    const t1 = await msgOf(e, r1);
    assert.match(t1, /الشهر مقفل/, t1 + ' · ' + JSON.stringify(r1.j.denied)); assert.match(t1, /راجع مدير الإدارة/, 'for the employee: ' + t1);
    await e.ctx.close();
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    const r2 = await tryDel(m, 1760000053001);
    assert.equal(r2.status, 403, 'the manager too, until he opens the month: ' + JSON.stringify(r2.j).slice(0, 400));
    const t2 = await msgOf(m, r2);
    assert.match(t2, /الشهر مقفل — افتحه للاستدراك أولاً/, 'for the department manager: ' + t2);
    assert.doesNotMatch(t2, /راجع مدير الإدارة/, t2);
    /* بعد فتحه للاستدراك ({mo:1}) يُقبل */
    await replaceOperationalFixture(lab.env, KL, { [PMK]: { mo: 1 } });
    const r3 = await tryDel(m, 1760000053001);
    assert.equal(r3.status, 200, 'opened for retro ⇒ accepted: ' + JSON.stringify(r3.j).slice(0, 300));
    assert.equal(inspectOperationalFixture(lab.env, KT)[PDAY].length, 1);
  } finally { await b.close(); await lab.close(); }
});
