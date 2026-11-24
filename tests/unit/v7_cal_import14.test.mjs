/* V7 · 53 تقويم · ف٧: استيرادُ ملف Production قديم (هجري، TEST_ONLY بشكل الملف المقيس: __pMig أولاً · m:1448-5/6 · أيام · مهام · جدول · مخطط) إلى قاعدةٍ بالمخطط 14:
   يُحوَّل في الخادم قبل applySave/ocConvert بالدالة الواحدة نفسِها التي يرحّل بها 0014 — على الدفعات (019g rsiSlice: المشتركةُ __pMig وكلُّ علامات m:
   تتحوّل في كل دفعةٍ بالنتيجة نفسِها) وبالمسار الواحد (019f rsConvertBackup). بعد الاعتماد يُقرأ كلُّ موردٍ بـ200 (readBack) ويطابق الوثيقةَ المحوَّلة المتوقعة
   مفتاحاً مفتاحاً، والأوراكلُ المستقل (Intl + lockedIn) يثبت: لا يومَ سقط · لا قفلَ تغيّر. والملخّصُ قبل التأكيد يذكر ما حُوِّل. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ROOT, WORKER, hasSystem, D1Shim } from './harness.mjs';
import { target, oldFile, protocol, readBack, wantOf, setLegacyDocs } from './v7_d6_import_fx.mjs';
import { load, oracle, oldDemoDocs } from './v7_cal_migrate_fx.mjs';

const OLD_REV = process.env.KIVO_UPGRADE14_REV || '5f1411e';
let oldSource = null;
try { oldSource = execFileSync('git', ['-C', ROOT, 'show', OLD_REV + ':workers/_worker.js'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { oldSource = null; }
const need = !oldSource ? { skip: 'يحتاج تاريخ git للمرجع ' + OLD_REV } : hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport') ? {} : { skip: 'يحتاج الأنظمة' };
/* بياناتُ العرض التي يبني منها المولّدُ الملفَّ: من العامل السابق (هجرية كما يصدّرها Preview قبل التقويم) */
async function oldDocs() { setLegacyDocs(await oldDemoDocs(oldSource, D1Shim)); }
const CALR = ['bassam_rounds_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_staffing_v3', 'bassam_plan_v1', 'bassam_tasks_locks_v1', 'bassam_staffing_locks_v1', 'bassam_dayshift_v1', 'bassam_dayfocus_v1'];

for (const mode of ['slice', 'single']) test('53 تقويم · ف٧ ملفُّ Production قديم ⇐ ميلادي عند الاستيراد (' + (mode === 'slice' ? 'على دفعات' : 'المسارُ الواحد') + ') · readBack لكل مورد · لا يومَ سقط · لا قفلَ تغيّر', { ...need, timeout: 900000 }, async () => {
  await oldDocs();
  const NEW = await load(fs.readFileSync(WORKER, 'utf8'), 'new'), T = await target(), dept = 'TEST_ONLY_A';
  try {
    const file = await oldFile({ small: true, openDays: 4 }), Tday = new Date().toISOString().slice(0, 10);
    /* ق6: مهمةٌ متكررةٌ شهرياً يومَ 15 الهجري ⇒ يومُ أول موعدٍ قادم ميلادياً — تُذكر في الملخّص */
    const tasks = JSON.parse(file.data.bassam_tasks_v1), td = Object.keys(tasks)[0];
    if (td && tasks[td][0]) tasks[td][0][23] = { ...tasks[td][0][23], rec: { id: 'TEST_ONLY_rec1', ver: 1, t: 'monthly', md: 15, from: td, to: '1449-1-1', paused: 0 }, idem: 'r:TEST_ONLY_rec1:' + td + ':TEST_ONLY_e' };
    file.data.bassam_tasks_v1 = JSON.stringify(tasks);
    file.data.bassam_tasks_locks_v1 = JSON.stringify({ '1448-5': true, '1448-6': { mo: 1 }, '1448-6-3': 1 });
    file.data.bassam_staffing_locks_v1 = JSON.stringify({ '1448-5': true, '1448-6': true });
    file.data.bassam_dayshift_v1 = JSON.stringify({ '1448-6-2': 'TEST_ONLY صباحية' });
    const want = wantOf(T, file, dept);
    const P = protocol(T, T.su, file, { scope: { kind: 'dept', departmentId: dept }, mode: 'replace', slice: mode === 'slice' ? 1 : false, sliceTarget: 6000 });
    const out = await P.run();
    assert.equal(out.begin.status, 200, out.begin.t.slice(0, 300));
    if (mode === 'slice') assert.ok(P.sliceCount >= 3, 'دفعاتٌ عدّة: ' + P.sliceCount);
    assert.equal(out.inspect.status, 200, out.inspect.t.slice(0, 400));
    const cal = out.inspect.j.inspection.summary.calendar;
    assert.ok(cal && cal.days > 0 && cal.months > 0, 'سطرُ «حُوِّل إلى الميلادي» في الملخّص: ' + JSON.stringify(cal));
    assert.ok(cal.recurring.some((x) => x.id === 'TEST_ONLY_rec1' && x.from === 15), 'المهمةُ المتكررة التي تغيّر يومها مذكورة (ق6)');
    assert.equal(out.commit.status, 200, out.commit.t.slice(0, 400));
    const expect = {};
    for (const [r, doc] of Object.entries(want)) expect[r] = CALR.includes(r) ? NEW.calMigDoc(r, doc, { T: Tday, rep: null }) : doc;
    const got = await readBack(T, dept, Object.fromEntries(Object.entries(expect).filter(([r]) => r !== 'bassam_rounds_v1')));
    const rounds = { ...(got.bassam_rounds_arc_v1 || {}), ...(got.bassam_rounds_v1 || {}) };
    assert.deepEqual(Object.keys(rounds).sort(), Object.keys(expect.bassam_rounds_v1).sort(), 'الجولات: المفاتيح'); for (const k of Object.keys(expect.bassam_rounds_v1)) assert.deepEqual(rounds[k], expect.bassam_rounds_v1[k], 'الجولات ' + k);
    const n = oracle(want.bassam_rounds_v1, rounds, Tday, 'الجولات') + oracle(want.bassam_dreport_v1, got.bassam_dreport_v1, Tday, 'التقرير');
    assert.ok(n > 50, 'أوراكلُ ' + n + ' يوماً');
    const tl = got.bassam_tasks_locks_v1; assert.ok(Object.keys(tl).every((k) => /^20\d\d-\d\d(?:-\d\d)?$/.test(k)), 'أقفالُ المهام ميلادية: ' + Object.keys(tl).join(' '));
    const tk = got.bassam_tasks_v1, row = tk[Object.keys(tk)[0]][0][23];
    assert.match(row.idem, /^r:TEST_ONLY_rec1:20\d\d-\d\d-\d\d:TEST_ONLY_e$/, 'مفتاحُ عدم التكرار ميلادي (لا نسخةَ مكررة)');
    assert.ok(row.rec.md >= 1 && row.rec.md <= 31 && /^20/.test(row.rec.from), 'التكرارُ الشهري يومٌ ميلادي');
  } finally { await T.close(); }
});
