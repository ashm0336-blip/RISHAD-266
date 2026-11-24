/* V7 · د6 (QA ٦ — قرارُ المالك): مديرُ الإدارة صلاحيتُه كاملة داخل إدارته — يستورد نسخةَ إدارته ويستبدلها (بالدفعات نفسِها وحدودها · والفتراتُ المقفلة
   في نسخته مقبولةٌ له في الاستيراد) ولا يستورد إلى إدارةٍ غيرها ولا النسخةَ الشاملة. وقرارُ المالك ب: صحيفةُ مدير المصدر لا تنتقل · سقفُ الوحدة ومديرُها
   وحساباتُها لا يغيّرها استيراد · أوراقُ موظفي الإدارة تنتقل ويحكمها السقفُ الهدف. TEST_ONLY — بياناتٌ مولَّدة (v7_d6_import_fx.mjs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasSystem } from './harness.mjs';
import { target, oldFile, protocol, staged, LAB } from './v7_d6_import_fx.mjs';

const B = 'TEST_ONLY_B', SCOPE = { kind: 'dept', departmentId: B };
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة بيانات العرض المصدر' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };
const permsOf = (T) => JSON.parse(T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_perms_v1' ORDER BY seq)")[0].v);
const usersOf = (T) => T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq)")[0].v;
const audits = (T) => T.DB.q("SELECT COUNT(*) n FROM aud WHERE k='atomic_restore'")[0].n;

test('(١) مديرُ الإدارة بلا منحٍ صريح يستبدل إدارتَه بنسخته — بالدفعات (حدودُ مدير المنصة) · فتراتُها المقفلة مقبولة · مرةً ثانية فوق القائم', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target();
  try {
    const mgr = await T.login(LAB.mgrB, LAB.pw), inv = await T.call('/api/backup/restore?kind=dept&departments=%5B%5D&dept=' + B, { ck: mgr.ck });
    assert.equal(inv.status, 200, 'جردُ الاستعادة لإدارته مقبول: ' + JSON.stringify(inv.j));
    for (let round = 0; round < 2; round++) {
      const P = protocol(T, mgr, file, { scope: SCOPE, slice: 1000, sliceTarget: 5000 }), run = await P.run();
      assert.equal(run.begin.status, 200, JSON.stringify(run.begin.j)); assert.ok(P.sliceCount >= 3, 'الدفعاتُ معروضةٌ لمدير الإدارة (' + P.sliceCount + ')');
      assert.equal(run.inspect && run.inspect.status, 200, JSON.stringify((run.inspect || run.part || run.begin).j).slice(0, 600));
      assert.equal(run.commit.status, 200, JSON.stringify(run.commit.j).slice(0, 400)); assert.equal(staged(T.DB), 0);
    }
    assert.equal(audits(T), 2); assert.ok(T.DB.q('SELECT COUNT(*) n FROM ops_round_day')[0].n > 0, 'الجولاتُ في القاعدة');
  } finally { await T.close(); }
});

test('(٢) مديرُ الإدارة يُرفض على إدارةٍ أخرى وعلى النسخة الشاملة — ولا يتغيّر شيء', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target();
  try {
    const mgrA = await T.login(LAB.mgrA, LAB.pw), mgrB = await T.login(LAB.mgrB, LAB.pw);
    const other = await protocol(T, mgrA, file, { scope: SCOPE }).begin();
    assert.equal(other.status, 403); assert.equal(other.j.err, 'restore-policy');
    const full = await protocol(T, mgrB, file, { scope: { kind: 'full' } }).begin();
    assert.equal(full.status, 403, 'النسخةُ الشاملة لمدير المنصة وحده');
    const invFull = await T.call('/api/backup/restore?kind=full&departments=%5B%5D', { ck: mgrB.ck });
    assert.equal(invFull.status, 403);
    assert.equal(staged(T.DB), 0); assert.equal(audits(T), 0);
  } finally { await T.close(); }
});

test('(٣) قرارُ المالك ب: صحيفةُ مدير المصدر لا تنتقل · السقفُ والمديرُ والحساباتُ كما في الهدف · أوراقُ الموظفين تنتقل (خارجُ السقف مخزَّنٌ بلا أثر) — مديرُ المنصة ومديرُ الإدارة', { timeout: 300000, ...need }, async () => {
  for (const as of ['super', 'mgr']) {
    const file = await oldFile({ small: true }), T = await target();
    try {
      /* سقفُ الهدف يختلف عن سقف النسخة (plan · daily · emps · admin): لمدير المنصة بلا «plan» (والنسخةُ تحمل ورقةَ موظفٍ في plan — مخزَّنةٌ بلا أثر) ·
         ولمدير الإدارة بلا «dstats» (بياناتُ نظامٍ مطفأٍ في إدارته لا يكتبها — «المطفأ لا يظهر لأحد») — والنسخةُ تحمل صحيفةَ مدير المصدر */
      const p0 = permsOf(T); p0.caps[B] = as === 'super' ? ['daily', 'emps', 'admin', 'tasks', 'staff', 'dreport'] : ['tasks', 'daily', 'dreport', 'admin', 'emps', 'staff', 'plan']; const MGR0 = as === 'super' ? { ['mgr:' + B]: { tasks: ['view'] } } : {}; p0.emps = { ...(p0.emps || {}), [B]: MGR0 };   /* صحيفةٌ قائمةٌ لمدير الهدف (حالةُ الهدف نفسِه) تبقى كما هي */
      await T.DB.batch([...T.lab.W.kvPutStmts(T.lab.env, 'kv', 'bassam_perms_v1', JSON.stringify(p0)), T.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
      const before = permsOf(T), users = usersOf(T), who = as === 'super' ? T.su : await T.login(LAB.mgrB, LAB.pw);
      const run = await protocol(T, who, file, { scope: SCOPE }).run();
      assert.equal(run.commit && run.commit.status, 200, as + ': ' + JSON.stringify((run.commit || run.inspect || run.begin).j).slice(0, 400));
      const nt = run.inspect.j.inspection.summary.notTransferred.filter((x) => x.why === 'mgr-sheet');
      assert.deepEqual(nt, [{ k: 'perms · mgr', why: 'mgr-sheet', n: 1 }], as + ': صحيفةُ مدير المصدر تُذكر فيما لن يُنقل');
      const now = permsOf(T);
      assert.deepEqual(now.caps[B], before.caps[B], as + ': سقفُ الوحدة كما في الهدف (لا سقفَ النسخة)');
      for (const f of ['subs', 'capOwn', 'capSeed']) assert.deepEqual((now[f] || {})[B], (before[f] || {})[B], as + ': ' + f + ' كما في الهدف');
      /* V7 · د7 (ك1 — ملف المالك 53): العدساتُ = عدساتُ الهدف ∩ عدساتُ النسخة (019d rsDeptLensNarrow) — الهدفُ بلا سجلّ (الستّ) والنسخةُ [zones, paths, dens] */
      assert.equal((before.lenses || {})[B], undefined); assert.deepEqual(now.lenses[B], file.perms.lenses, as + ': lenses = الهدف ∩ النسخة (تضييقٌ لا توسيع)');
      assert.deepEqual(Object.fromEntries(Object.entries(now.emps[B]).filter(([k]) => k.startsWith('mgr:'))), MGR0, as + ': صحيفةُ مدير الهدف كما كانت (أو لا صحيفة) — لا تُستبدل ولا تُضاف');
      assert.deepEqual(now.emps[B].tst_demo_e11, file.perms.emps.tst_demo_e11, as + ': ورقةُ الموظف انتقلت كما هي (مخزَّنة)');
      assert.equal(usersOf(T), users, as + ': الحساباتُ (والمدير) كما هي');
      /* قرارُ المالك ب4: الأدوار · الإسنادات · وما لا أثرَ له لكل نظامٍ مطفأ — في ملخّص ما قبل التأكيد وفي ملخّص النجاح (المصدرُ نفسُه) */
      /* V7 · د7 (51ب): قوالبُ النسخة الثلاثة صارت أدواراً (بلا أشخاص — النسخةُ بلا tplOf) */
      const wantP = { roles: 3, assignments: 1, inert: as === 'super' ? { plan: 1 } : {} };
      assert.deepEqual(run.inspect.j.inspection.counts.perms, wantP, as + ': counts.perms قبل التأكيد'); assert.deepEqual(run.commit.j.counts.perms, wantP, as + ': وفي ملخّص النجاح');
      if (as === 'super') {
        /* ورقةُ plan مخزَّنةٌ والنظامُ مطفأٌ في السقف الهدف: لا مفتاحَ لها في إنفاذ الخادم */
        const held = T.lab.W.enfHeld ? null : null; void held;
        assert.equal(now.caps[B].includes('plan'), false);
      }
      for (const d of Object.keys(before.caps)) if (d !== B) assert.deepEqual(now.caps[d], before.caps[d]);
      /* خارجُ السقف بلا أثر: مديرُ الإدارة نفسُه بعد الاستيراد كاملُ الصلاحية في إدارته (يعيد الاستيراد) */
      const again = await protocol(T, await T.login(LAB.mgrB, LAB.pw), file, { scope: SCOPE }).begin();
      assert.equal(again.status, 200, as + ': مديرُ الهدف ما زال يستورد');
    } finally { await T.close(); }
  }
});
