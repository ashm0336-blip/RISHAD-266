/* V7 · د7 — «النسخة الشاملة — كل الإدارات» الكبيرة تُقسم بالمسار نفسِه الذي تُقسم به نسخةُ الإدارة (POST /api/backup/import).
   البياناتُ كلُّها مولَّدة TEST_ONLY (v7_d6_import_fx.mjs oldFile لكل إدارة، بأسماء صورٍ مميَّزة لكل إدارة) — لا ملفَّ حقيقياً.
   (١) الدفعاتُ = المسارُ الواحد صفاً بصف: نسخةٌ شاملة لثلاث إدارات تستبدل منصةً فيها بياناتٌ قائمة · ونسخةٌ تحذف إدارتين وتضيف إدارةً جديدة —
       كلُّ جدول تشغيلٍ وكلُّ صفٍّ في KV والتنبيهات والصور كما في المسار الواحد · كلُّ موردٍ لكل إدارةٍ يُقرأ بـ200 ويطابق النسخة · والإدارةُ المحذوفة لا يبقى لها صفّ
   (٢) الذرّية: قطعٌ · دفعةٌ فاشلة تُعاد وحدها · دفعةٌ مكرَّرة · اعتمادٌ يفشل داخل الدفعة ⇒ لا شيء تغيّر · اعتمادٌ مكرَّر ⇒ الإيصالُ نفسُه وسطرُ سجلٍّ واحد · الإلغاءُ ينظّف المؤقت
   (٣) لمدير المنصة وحده · الدمجُ لا يُقسم (كما كان) · اسمُ دفعةٍ بلا إدارة أو بإدارةٍ في نسخة إدارة يُرفض عند البدء
   (٤) [ثقيل] نسخةٌ شاملة لثلاث إدارات بالشكل المقيس (≈93MB) تُستورد وتُقرأ كلُّها، وكلُّ طلبٍ دون 8MB · وفوق منصةٍ تحملها تُستبدل */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasSystem } from './harness.mjs';
import { target, oldFile, protocol, staged, snapshot, changed, readBack, LAB, sizeOf } from './v7_d6_import_fx.mjs';
import { fullOf, rowsOf } from './v7_d7_fullcopy_fx.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1', C = 'TEST_ONLY_C7', FULL = { kind: 'full' }, LIMIT = 8 * 1024 * 1024;
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام والتشغيل والتقرير والعهد (بياناتُ العرض المصدر)' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };
after(() => { console.log = quiet; });
const audits = (T) => T.DB.q("SELECT COUNT(*) n FROM aud WHERE k='atomic_restore'")[0].n;
/* استيرادٌ كامل بالبروتوكول ⇒ النتيجة · مع قراءة كلِّ موردٍ لكل إدارةٍ في النسخة ومطابقته */
async function importFull(T, full, want, opt = {}) {
  const P = protocol(T, T.su, full, { scope: FULL, ...opt }), out = await P.run();
  assert.equal(out.begin.status, 200, 'begin ' + JSON.stringify(out.begin.j).slice(0, 300));
  assert.equal(out.inspect && out.inspect.status, 200, 'inspect ' + JSON.stringify((out.inspect || out.part || {}).j).slice(0, 400));
  assert.equal(out.commit && out.commit.status, 200, 'commit ' + JSON.stringify((out.commit || {}).j).slice(0, 400));
  for (const d of Object.keys(want)) await readBack(T, d, want[d]);
  assert.equal(staged(T.DB), 0, 'المؤقتُ حُذف مع الاعتماد');
  return { P, out };
}
const opsOf = (T, d) => T.DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', d)[0].n;

test('(١) الدفعاتُ = المسارُ الواحد صفاً بصف للنسخة الشاملة: استبدالٌ فوق بياناتٍ قائمة · وحذفُ إدارتين وإضافةُ إدارة — وكلُّ موردٍ لكل إدارةٍ يُقرأ ويطابق', { timeout: 600000, ...need }, async (t) => {
  /* الهدف: إدارةُ أ تحمل نسخةً سابقة (جولات · مخطط · مهام · تقرير · ورديات) — فالاستبدالُ يطرح القائم */
  const seed = async (T) => { const r = await protocol(T, T.su, await oldFile({ small: true }), { scope: { kind: 'dept', departmentId: A } }).run(); assert.equal(r.commit.status, 200); };
  for (const [label, list] of [
    ['ثلاثُ إدارات تستبدل القائمة', [[A, { small: true, planRows: 2 }, 'a'], [B, { small: true }, 'b'], [S1, { small: true, openDays: 2 }, 's']]],
    ['إدارتان تُحذفان (أ وقسمُها) وإدارةٌ جديدة', [[B, { small: true }, 'b'], [C, { small: true, openDays: 1 }, 'c']]],
  ]) {
    const ends = [];
    for (const how of ['sliced', 'single']) {
      const T = await target();
      try {
        await seed(T);
        assert.ok(opsOf(T, A) > 0, 'في الهدف بياناتٌ قائمة لإدارة أ');
        const { full, want } = await fullOf(T, list), before = audits(T);
        const { P } = await importFull(T, full, want, how === 'sliced' ? { slice: 1, sliceTarget: 4000 } : { slice: false });
        if (how === 'sliced') {
          const names = Object.keys(P.slices);
          for (const [d] of list) assert.ok(names.some((k) => k.startsWith(d + '/bassam_rounds_v1#')) && names.includes(d + '/bassam_plan_v1#0'), label + ': ' + d + ' قُسمت جولاتُه ومخططُه في دفعاتٍ باسم إدارته');
          assert.ok(names.filter((k) => /\/bassam_rounds_v1#/.test(k)).length >= 2 * list.length, label + ': أكثرُ من دفعةٍ للجولات لكل إدارة (' + names.length + ')');
          assert.equal(P.text.includes('bassam_rounds_v1"'), false, label + ': لا تبقى الجولاتُ في نصّ الملف');
        } else assert.equal(P.sliceCount, 0);
        assert.equal(audits(T), before + 1, 'سطرُ سجلٍّ واحد');
        if (!list.some(([d]) => d === A)) { assert.equal(opsOf(T, A), 0, label + ': الإدارةُ المحذوفة لا يبقى لها صفٌّ تشغيلي'); assert.equal(opsOf(T, S1), 0); }
        ends.push(rowsOf(T));
      } finally { await T.close(); }
    }
    const diff = Object.keys(ends[0]).filter((n) => JSON.stringify(ends[0][n]) !== JSON.stringify(ends[1][n]));
    for (const n of diff) t.diagnostic(label + ' · ' + n + ': بالدفعات وحدها ' + JSON.stringify(ends[0][n].filter((r) => !ends[1][n].includes(r))).slice(0, 600) + ' · بالمسار الواحد وحده ' + JSON.stringify(ends[1][n].filter((r) => !ends[0][n].includes(r))).slice(0, 600));
    assert.deepEqual(diff, [], label + ': المساران ينتهيان إلى الصفوف نفسِها حرفاً في كل جدول');
    t.diagnostic(label + ': ' + Object.keys(ends[0]).filter((n) => /^ops_/.test(n)).reduce((n, k) => n + ends[0][k].length, 0) + ' صفاً تشغيلياً متطابقاً');
  }
});

test('(٢) الذرّية بدفعات النسخة الشاملة: قطعٌ · دفعةٌ بغير ترتيبها · دفعةٌ فاشلة تُعاد وحدها · مكرَّرةٌ لا تضيف · اعتمادٌ يفشل داخل الدفعة ⇒ لا شيء تغيّر · ثم ينجح · ومكرَّرُه يعيد الإيصال', { timeout: 600000, ...need }, async () => {
  const T = await target();
  try {
    assert.equal((await protocol(T, T.su, await oldFile({ small: true }), { scope: { kind: 'dept', departmentId: A } }).run()).commit.status, 200);
    const base = snapshot(T.DB), n0 = audits(T), { full, want } = await fullOf(T, [[A, { small: true }, 'a'], [B, { small: true, openDays: 1 }, 'b']]), opt = { scope: FULL, slice: 1, sliceTarget: 4000 };
    /* قطعٌ في منتصف الأجزاء ثم إلغاء (إغلاقُ الصفحة) */
    const P0 = protocol(T, T.su, full, opt);
    assert.equal((await P0.begin()).status, 200);
    for (let i = 0; i < 2; i++) assert.equal((await P0.part(i)).status, 200);
    assert.ok(staged(T.DB) > 0); assert.equal((await P0.cancel()).status, 200); assert.equal(staged(T.DB), 0, 'الإلغاءُ ينظّف المؤقت');
    assert.deepEqual(changed(snapshot(T.DB), base), [], 'القطعُ لا يغيّر شيئاً');
    /* دفعةٌ قبل سابقتها: رفضٌ نهائي يزيل المؤقت (كما في نسخة الإدارة) */
    const P1 = protocol(T, T.su, full, opt);
    assert.equal((await P1.begin()).status, 200);
    for (let i = 0; i < P1.parts.length; i++) assert.equal((await P1.part(i)).status, 200, 'part ' + i);
    assert.equal((await P1.sliceStep(1)).status, 409, 'دفعةٌ قبل سابقتها تُرفض');
    assert.equal(staged(T.DB), 0, 'والمؤقتُ أُزيل'); assert.equal((await P1.sliceStep(0)).status, 404);
    const P = protocol(T, T.su, full, opt);
    assert.equal((await P.begin()).status, 200);
    for (let i = 0; i < P.parts.length; i++) assert.equal((await P.part(i)).status, 200, 'part ' + i);
    assert.ok(P.sliceCount >= 6, 'دفعاتٌ لكل إدارة (' + P.sliceCount + ')');
    assert.equal((await P.sliceStep(0)).status, 200);
    T.DB.failIf = (sql) => /INSERT OR REPLACE INTO restore_preimage/.test(sql);
    assert.ok((await P.sliceStep(1)).status >= 500, 'دفعةٌ فاشلة');
    T.DB.failIf = null;
    assert.equal((await P.sliceStep(1)).status, 200, 'تُعاد وحدها');
    const q1 = T.DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id=?1 AND domain='q'", 'stage:' + P.id)[0].n;
    assert.equal((await P.sliceStep(1)).status, 200, 'المكرَّرةُ تُقبل');
    assert.equal(T.DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id=?1 AND domain='q'", 'stage:' + P.id)[0].n, q1, 'ولا تضيف صفاً');
    for (let i = 2; i < P.sliceCount; i++) assert.equal((await P.sliceStep(i)).status, 200, 'slice ' + i);
    const ins = await P.inspect();
    assert.equal(ins.status, 200, JSON.stringify(ins.j).slice(0, 300));
    assert.deepEqual(changed(snapshot(T.DB), base), [], 'الفحصُ لا يكتب شيئاً');
    T.DB.failIf = (sql) => /INSERT INTO restore_operations/.test(sql);
    assert.ok((await P.commit(ins.j.inspection.base)).status >= 500, 'اعتمادٌ يفشل داخل الدفعة');
    T.DB.failIf = null;
    assert.deepEqual(changed(snapshot(T.DB), base), [], 'فشلُ الاعتماد لا يترك أثراً (لا جولاتٍ ولا مخططاً لأي إدارة)');
    assert.ok(staged(T.DB) > 0, 'والمؤقتُ باقٍ لإعادة المحاولة');
    const ok = await P.commit(ins.j.inspection.base);
    assert.equal(ok.status, 200, JSON.stringify(ok.j).slice(0, 300));
    for (const d of Object.keys(want)) await readBack(T, d, want[d]);
    assert.equal(staged(T.DB), 0); assert.equal(audits(T), n0 + 1);
    const again = await P.commit(ins.j.inspection.base);
    assert.equal(again.status, 200); assert.deepEqual([again.j.rev, again.j.snapshot], [ok.j.rev, ok.j.snapshot], 'الاعتمادُ المكرَّر يعيد الإيصالَ نفسَه');
    assert.equal(audits(T), n0 + 1, 'سطرُ سجلٍّ واحد');
  } finally { await T.close(); }
});

test('(٣) لمدير المنصة وحده · الدمجُ الشامل لا يُقسم (كما كان) · اسمُ دفعةٍ لا يطابق نطاقه يُرفض عند البدء', { timeout: 300000, ...need }, async () => {
  const T = await target();
  try {
    const { full } = await fullOf(T, [[B, { small: true }, 'b']]), mgr = await T.login(LAB.mgrB, LAB.pw);
    assert.equal((await protocol(T, mgr, full, { scope: FULL, reason: 'TEST_ONLY' }).begin()).status, 403, 'مديرُ الإدارة لا يستورد النسخةَ الشاملة');
    const dry = async (mode) => (await protocol(T, T.su, full, { scope: FULL, mode }).post({ op: 'begin', dry: true, scope: FULL, mode, keys: { bassam_depts_v1: 0 } })).j;
    assert.deepEqual(Object.keys((await dry('replace')).slice).sort(), ['bassam_dreport_v1', 'bassam_plan_v1', 'bassam_rounds_arc_v1', 'bassam_rounds_v1', 'bassam_staffing_v3', 'bassam_tasks_v1'], 'الاستبدالُ الشامل يُعرض تقسيمُه');
    assert.deepEqual((await dry('merge')).slice, {}, 'الدمجُ الشامل بلا دفعات — كما كان');
    const begin = (scope, slices) => protocol(T, T.su, full, { scope }).post({ op: 'begin', scope, mode: 'replace', n: 100, f: 1, slices, keys: { bassam_depts_v1: 0 } });
    for (const [scope, name] of [[FULL, 'bassam_rounds_v1#0'], [FULL, '/bassam_rounds_v1#0'], [FULL, 'a:b/bassam_rounds_v1#0'], [FULL, B + '/bassam_options_v1#0'], [{ kind: 'dept', departmentId: B }, B + '/bassam_rounds_v1#0']]) {
      const r = await begin(scope, { [name]: 50 });
      assert.equal(r.status, 400, scope.kind + ' ' + name + ': ' + r.t.slice(0, 120)); assert.equal(r.j.err, 'import-shape');
    }
    assert.equal(staged(T.DB), 0);
  } finally { await T.close(); }
});

test('(٤) [ثقيل] نسخةٌ شاملة لثلاث إدارات بالشكل المقيس (≈93MB) تُستورد وتُقرأ كلُّها — كلُّ طلبٍ دون 8MB · ثم تستبدل نفسَها فوق المنصة', { timeout: 1800000, ...need }, async (t) => {
  const T = await target();
  try {
    const list = [[A, { scale: 1 }, 'a'], [B, { scale: 1 }, 'b'], [S1, { scale: 1, openDays: 2 }, 's']], { full, want } = await fullOf(T, list);
    const chars = Object.values(full.data).reduce((n, v) => n + v.length, 0) + Object.values(full.idbImages).reduce((n, v) => n + v.length, 0);
    assert.ok(chars > 93e6 * 0.98, 'النسخة ≈93MB: ' + chars); assert.equal(Object.keys(full.idbImages).length, 30);
    for (const round of [1, 2]) {
      const t0 = Date.now(), { P } = await importFull(T, full, want);
      const biggest = Math.max(...P.parts.map((p) => Buffer.byteLength(JSON.stringify({ requestId: P.id, op: 'part', items: [p] }))));
      assert.ok(biggest < LIMIT, 'كلُّ جزءٍ دون حدّ الطلب (أكبرُها ' + biggest + ')');
      for (const [d] of list) assert.ok(Object.keys(P.slices).filter((k) => k.startsWith(d + '/bassam_rounds_v1#')).length >= 12, d + ': الجولاتُ دفعات');
      for (const [id, body] of Object.entries(full.idbImages)) { const g = await T.call('/api/img/' + id, { ck: T.su.ck }); assert.equal(g.status, 200, id); assert.equal(g.t === body, true, 'بايتاتُ ' + id); }
      if (round === 2) assert.ok(T.DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE domain='operations-sql'")[0].n > 3 * 7000, 'لقطةُ ما قبل الاستبدال لكل إدارة داخل القاعدة');
      t.diagnostic('الجولة ' + round + ': ' + P.parts.length + ' جزءاً · ' + P.sliceCount + ' دفعة · أكبرُ طلب ' + biggest + ' بايتاً · ' + (Date.now() - t0) + ' ms');
    }
  } finally { await T.close(); }
});
