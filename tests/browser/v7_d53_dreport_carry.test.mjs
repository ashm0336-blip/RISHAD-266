/* V7 · 53 (writers · جرد الكتّاب 53-ج: التقرير اليومي — «يحتاج تحقّقاً: هل تُبنى أقسام اليوم من أنظمة مفعّلة وحدها حين يُطفأ الجولات أو المهام؟»).
   الجواب من الشفرة: وثيقةُ التقرير (bassam_dreport_v1) لا تحمل قسماً للجولات ولا للمهام — يُقرآن عرضاً من مالكَيهما (daily.days@1 · المهام)، فلا يسقط
   منها شيء بإطفائهما. لكنّ rpLoad يطبّع كلَّ أيام الوثيقة عند القراءة (يحذف leaders.coord ويحوّل شكلَ «pulled» القديم) ثم يرسلها rpSave كلَّها —
   فيومٌ ماضٍ مقفل بشكلٍ قديم (نسخةُ Production) يُرسَل «معدَّلاً» لم يعدّله أحد. الرحلة (TEST_ONLY · بذرُ العرض): تقريرٌ قائم فيه يومٌ ماضٍ بشكلٍ قديم
   ← مديرُ المنصة يطفئ «المتابعة اليومية» و«المهام» ← مديرُ الإدارة ينشئ تقريرَ اليوم من الصفحة ← الحفظُ 200 ← اليومُ الماضي مخزَّنٌ كما كان بايتاً
   ← التشغيل ← كلُّ شيءٍ كما حُفظ. مختبرٌ معزول بلا شبكة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { kv, put } from './d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../unit/world_fx.mjs';

const DD = 'tst_demo_d1', RK = 'bsdept:' + DD + ':bassam_dreport_v1', OFF = ['daily', 'tasks'];

test('53 · التقرير اليومي: «المتابعة اليومية» و«المهام» مطفأتان ⇒ إنشاءُ تقرير اليوم يُحفظ، واليومُ الماضي بشكله القديم مخزَّنٌ كما كان، والتشغيلُ يعيد كلَّ شيء', { timeout: 400000 }, async (t) => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
    const sa = await openAs(b, lab, LAB.superUn, LAB.superPw), seed = await sa.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
    const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1');
    const H = await sa.page.evaluate(() => KIVO.BassamCal.hNow(new Date(), null)), today = H.y + '-' + H.m + '-' + H.d;
    const prev = H.m > 1 ? H.y + '-' + (H.m - 1) + '-5' : (H.y - 1) + '-12-5';
    const read = async (s) => (await s.api('/api/operations/read?keys=' + encodeURIComponent(RK))).j.resources[RK];
    const doc = (await read(sa)) || {};
    delete doc[today];
    /* يومٌ ماضٍ بالشكل القديم (Production): رمزُ «المنسّق» في القيادة · وتقريرٌ «pulled» بلا shifts */
    doc[prev] = { created: 1, shifts: { 'TEST_ONLY_S': { pulled: true, roster: [{ ekey: 'tst_demo_e11', st: 'pr' }], leaders: { chief: '', deputy: '', coord: 'TEST_ONLY' } } } };
    const prev2 = prev.replace(/-5$/, '-6');
    doc[prev2] = { pulled: true, roster: [{ ekey: 'tst_demo_e11', st: 'pr', shift: 'TEST_ONLY_S' }] };
    await replaceOperationalFixture(lab.env, RK, doc);
    const before = await read(sa);
    assert.ok(before[prev].shifts.TEST_ONLY_S.leaders.coord && before[prev2].pulled, 'المخزَّن: اليومان الماضيان بشكلهما القديم');
    const caps = (on) => { const P = kv(lab, 'bassam_perms_v1'), c = P.caps[DD]; assert.ok(Array.isArray(c)); P.caps[DD] = on ? c.concat(OFF.filter((x) => c.indexOf(x) === -1)) : c.filter((x) => OFF.indexOf(x) === -1); return put(lab, 'bassam_perms_v1', P); };
    const cap0 = kv(lab, 'bassam_perms_v1').caps[DD].slice();
    await caps(false);
    const s = await openAs(b, lab, m1.un, m1.pw), p = s.page, saves = [];
    p.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save\b/.test(r.url())) { let j = null; try { j = await r.json(); } catch (e) { /* بلا جسم */ } saves.push({ st: r.status(), j }); } });
    await s.go('#/dreport', 3000);
    await p.waitForFunction(() => { for (const el of document.querySelectorAll('main *')) { const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let x = fk ? el[fk] : null; while (x) { const n = x.stateNode; for (const c of [n, n && n.logic]) if (c && typeof c.rpCreate === 'function') { window.__dr = c; return true; } x = x.return; } } return false; }, null, { timeout: 60000, polling: 250 });
    const n0 = saves.length;
    await p.evaluate(() => window.__dr.rpCreate());
    const t0 = Date.now(); while (saves.length === n0 && Date.now() - t0 < 15000) await p.waitForTimeout(200); await p.waitForTimeout(1200);
    t.diagnostic('saves ' + JSON.stringify(saves.slice(n0)).slice(0, 600));
    assert.ok(saves.length > n0, 'إنشاءُ التقرير أرسل حفظاً');
    for (const x of saves.slice(n0)) assert.equal(x.st, 200, 'POST /api/save مقبول: ' + JSON.stringify(x.j).slice(0, 600));
    const after = await read(sa);
    assert.ok(after[today] && after[today].created, 'تقريرُ اليوم أُنشئ');
    assert.deepEqual(after[prev], before[prev], 'اليومُ الماضي (leaders.coord) مخزَّنٌ كما كان');
    assert.deepEqual(after[prev2], before[prev2], 'واليومُ الماضي بشكل «pulled» القديم كما كان');
    for (const k of Object.keys(before)) if (k !== today) assert.deepEqual(after[k], before[k], k + ': ما لم يعدّله المستخدم كما خُزِّن');
    /* التشغيل ← كما حُفظ */
    await caps(true);
    assert.deepEqual([...kv(lab, 'bassam_perms_v1').caps[DD]].sort(), cap0.slice().sort(), 'السقفُ عاد كما كان');
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
    assert.deepEqual(await read(sa), after, 'بعد التشغيل كلُّ شيءٍ كما حُفظ');
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close(); await sa.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
