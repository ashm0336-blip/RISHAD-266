/* V7 · 53 تقويم (cal-import · REVIEW 24 · 25): ملفُّ Production (fixture مجهّلة TEST_ONLY بالبنية نفسِها — v7_d6_import_fx.mjs oldFile:
   app=bassam-crowd · version 3 · kind=dept · 29 مفتاحَ بيانات · idbImages · preImport · تواريخُ هجرية) يُستورد لأي عقدة، وكلُّ مفتاحٍ يذهب لنظامه آلياً.
   ① إدارتان مختلفتان (مدير المنصة يختار العقدة) — على دفعات وبالمسار الواحد: الـ29 كلُّها لها مصير (موردٌ تشغيلي يُقرأ · KV · أدوار · عهدة · تنبيهات · أو «لن يُنقل» بسببه) ·
      كلُّ موردٍ يُقرأ بـ200 ويطابق الوثيقةَ المحوَّلة (calConvDoc) · لا مفتاحَ هجرياً باقٍ · كلُّ صورةٍ تُقرأ بجسمها.
   ② ملفٌّ متعدد الإدارات لمدير المنصة: يتوزّع كلٌّ في عقدته · كلُّ إدارةٍ ميلادية بعده.
   ③ إدارةٌ صغيرة (قسمٌ تحت إدارة) يستورد إليها مديرُ الإدارة الأم (عقدتُه وما تحتها) · ونظامٌ مطفأٌ للعقدة: بياناتُه محفوظة (لا تُسقط).
   ⑤ الخادمُ يرفض تاريخاً بصيغةٍ حرّة تجاوز الواجهة (calendar-unmapped بموضعه). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ROOT, WORKER, hasSystem, D1Shim } from './harness.mjs';
import { target, oldFile, protocol, readBack, wantOf, setLegacyDocs, readImage, NOT_TRANSFERRED, LAB } from './v7_d6_import_fx.mjs';
import { fullOf } from './v7_d7_fullcopy_fx.mjs';
import { load, oldDemoDocs } from './v7_cal_migrate_fx.mjs';

const OLD_REV = process.env.KIVO_UPGRADE14_REV || '5f1411e';
let oldSource = null;
try { oldSource = execFileSync('git', ['-C', ROOT, 'show', OLD_REV + ':workers/_worker.js'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { oldSource = null; }
const need = !oldSource ? { skip: 'يحتاج تاريخ git للمرجع ' + OLD_REV } : hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج الأنظمة' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };
let docsOnce = null;
async function oldDocs() { if (!docsOnce) docsOnce = await oldDemoDocs(oldSource, D1Shim); setLegacyDocs(docsOnce); }
const CALR = ['bassam_rounds_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_staffing_v3', 'bassam_plan_v1', 'bassam_tasks_locks_v1', 'bassam_staffing_locks_v1', 'bassam_dayshift_v1', 'bassam_dayfocus_v1'];
const HKEY = /^(?:m:)?1[345]\d\d-\d{1,2}(?:-\d{1,2})?(?:-.+)?$/;
/* المفتاحُ ⇐ مصيرُه المتوقَّع (كما يجريه الاستيراد اليوم — مثبَتٌ هنا مفتاحاً مفتاحاً) */
const KV_KEEP = ['bassam_first_boot_v1', 'bassam_last_export_v1'];
function fates(T, file, dept, inspection) {
  const nt = new Set(inspection.summary.notTransferred.map((x) => x.k)), out = {};
  const ops = new Set(T.DB.q('SELECT DISTINCT resource r FROM ops_nodes WHERE department_id=?1', dept).map((r) => r.r));
  const kv = new Set(T.DB.q("SELECT DISTINCT k FROM kv WHERE k GLOB ?1", 'bsdept:' + dept + ':*').map((r) => r.k.split(':').pop()));
  for (const k of Object.keys(file.data)) {
    if (nt.has(k)) out[k] = 'لن يُنقل: ' + inspection.summary.notTransferred.find((x) => x.k === k).why;
    else if (ops.has(k)) out[k] = 'مورد';
    else if (KV_KEEP.includes(k) && kv.has(k)) out[k] = 'kv';
    else if (k === 'bassam_perm_tpls_v1' && kv.has('bassam_roles_v1') && inspection.counts.perms.roles === JSON.parse(file.data[k]).length) out[k] = 'أدوار';
    else if (k === 'bassam_custody_v1' && inspection.counts.custody >= 1) out[k] = 'العهد';
    else if (k === 'bassam_notif_v1' && inspection.counts.notifications >= 1 && T.DB.q('SELECT COUNT(*) n FROM notification_messages')[0].n >= 1) out[k] = 'التنبيهات';
    else out[k] = null;
  }
  return out;
}
function distinct(file, tag) {
  const ren = (v) => v.split('img_testonly').join('img_testonly' + tag).split('tst_demo_e').join('tst_demo_' + tag + 'e').replace(/"(nid|empno)":"(\d)\d/g, (m, f, x) => '"' + f + '":"' + x + (tag === 'a' ? 3 : 4));
  for (const k of Object.keys(file.data)) if (typeof file.data[k] === 'string') file.data[k] = ren(file.data[k]);
  file.perms = JSON.parse(ren(JSON.stringify(file.perms)));
  file.idbImages = Object.fromEntries(Object.entries(file.idbImages).map(([id, b]) => [ren(id), b]));
  return file;
}
async function importDept(T, NEW, who, file, dept, slice) {
  const Tday = new Date().toISOString().slice(0, 10), want = wantOf(T, file, dept);
  const P = protocol(T, who, file, { scope: { kind: 'dept', departmentId: dept }, mode: 'replace', slice: slice ? 1 : false, sliceTarget: 6000 }), out = await P.run();
  assert.equal(out.begin.status, 200, out.begin.t.slice(0, 300));
  assert.equal(out.inspect && out.inspect.status, 200, (out.inspect || out.part || out.begin).t.slice(0, 400));
  assert.equal(out.commit && out.commit.status, 200, out.commit && out.commit.t.slice(0, 400));
  const expect = {};
  for (const [r, doc] of Object.entries(want)) expect[r] = CALR.includes(r) ? NEW.calConvDoc(r, doc, { T: Tday, rep: null }) : doc;
  const got = await readBack(T, dept, Object.fromEntries(Object.entries(expect).filter(([r]) => r !== 'bassam_rounds_v1')));
  const rounds = { ...(got.bassam_rounds_arc_v1 || {}), ...(got.bassam_rounds_v1 || {}) };
  if (expect.bassam_rounds_v1) assert.deepEqual(Object.keys(rounds).sort(), Object.keys(expect.bassam_rounds_v1).sort(), dept + ': الجولات — الأيامُ كلُّها (الحيُّ + الأرشيف)');
  for (const [r, doc] of Object.entries(got)) if (doc && typeof doc === 'object' && !Array.isArray(doc)) {
    const left = Object.keys(doc).filter((k) => HKEY.test(k)).concat(r === 'bassam_plan_v1' && doc.months ? Object.keys(doc.months).filter((k) => HKEY.test(k)) : []);
    assert.deepEqual(left, [], dept + ' · ' + r + ': لا مفتاحَ هجرياً باقٍ');
  }
  return { out, got };
}

for (const slice of [true, false]) test('① ملفُّ Production (29 مفتاحاً · هجري) لإدارتين مختلفتين (' + (slice ? 'على دفعات' : 'المسارُ الواحد') + '): كلُّ مفتاحٍ إلى نظامه · ميلاديٌّ بعده · الصورُ تُقرأ', { ...need, timeout: 900000 }, async () => {
  await oldDocs();
  const NEW = await load(fs.readFileSync(WORKER, 'utf8'), 'new'), T = await target();
  try {
    for (const [dept, opt] of [['TEST_ONLY_A', { small: true, openDays: 3 }], ['TEST_ONLY_B', { small: true, planRows: 2 }]]) {
      const file = distinct(await oldFile(opt), dept.slice(-1).toLowerCase());   /* إدارتان مختلفتان: موظفوها وصورُها غيرُ موظفي الأخرى (الهويةُ فريدةٌ على المنصة) */
      assert.deepEqual([file.app, file.version, file.kind, file.preImport, Object.keys(file.data).length], ['bassam-crowd', 3, 'dept', false, 29], 'بنيةُ ملف Production: app · version 3 · kind dept · 29 مفتاحاً');
      assert.ok(Object.keys(file.data).some((k) => k === 'bassam_staffing_v3') && Object.keys(file.idbImages).length >= 2);
      const { out } = await importDept(T, NEW, T.su, file, dept, slice);
      const f = fates(T, file, dept, out.inspect.j.inspection), lost = Object.entries(f).filter(([, v]) => !v).map(([k]) => k);
      assert.deepEqual(lost, [], dept + ': كلُّ مفتاحٍ من الـ29 له نظامٌ أو سببٌ مذكور: ' + JSON.stringify(f));
      for (const [k, why] of Object.entries(NOT_TRANSFERRED)) assert.equal(f[k], 'لن يُنقل: ' + why, dept + ': ' + k + ' — لن يُنقل بسببه');
      for (const [id, body] of Object.entries(file.idbImages)) { const r = await readImage(T, T.su, id); assert.equal(r.status, 200, dept + ': الصورة ' + id); assert.ok(r.t.length > 100 || body.length < 200, 'جسمُ الصورة'); }
    }
  } finally { await T.close(); }
});

test('② ملفٌّ متعدد الإدارات لمدير المنصة يتوزّع آلياً كلٌّ في عقدته — وكلُّ إدارةٍ ميلاديةٌ بعده', { ...need, timeout: 900000 }, async () => {
  await oldDocs();
  const T = await target();
  try {
    const { full } = await fullOf(T, [['TEST_ONLY_A', { small: true }, 'a'], ['TEST_ONLY_B', { small: true, openDays: 1 }, 'b']]);
    const out = await protocol(T, T.su, full, { scope: { kind: 'full' }, slice: 1, sliceTarget: 5000 }).run();
    assert.equal(out.commit && out.commit.status, 200, JSON.stringify((out.commit || out.inspect || out.begin).j).slice(0, 400));
    for (const d of ['TEST_ONLY_A', 'TEST_ONLY_B']) {
      const got = await readBack(T, d);
      assert.ok(got.bassam_rounds_v1 || got.bassam_rounds_arc_v1, d + ': جولاتُه في عقدته');
      for (const [r, doc] of Object.entries(got)) if (doc && typeof doc === 'object' && !Array.isArray(doc)) assert.deepEqual(Object.keys(doc).filter((k) => HKEY.test(k)), [], d + ' · ' + r + ': ميلادي');
    }
  } finally { await T.close(); }
});

test('③ إدارةٌ صغيرة: مديرُ الإدارة الأم يستورد إلى قسمٍ تحتها (عقدتُه وما تحتها) · ونظامٌ مطفأٌ للعقدة: مديرُ المنصة تُحفظ بياناتُه «محفوظة — غير مفعّلة»', { ...need, timeout: 600000 }, async () => {
  await oldDocs();
  const NEW = await load(fs.readFileSync(WORKER, 'utf8'), 'new'), T = await target(), S1 = 'TEST_ONLY_A_S1';
  try {
    const small = async (keep) => { const file = await oldFile({ small: true }); for (const k of Object.keys(file.data)) if (!keep.includes(k)) delete file.data[k];
      file.idbImages = Object.fromEntries(Object.entries(file.idbImages).filter(([id]) => Object.values(file.data).some((v) => typeof v === 'string' && v.includes(id)))); return file; };
    const mgrA = await T.login(LAB.mgrA, LAB.pw);
    /* (أ) مديرُ الإدارة أ ⇒ قسمُها أ١: الموظفون والجدول والإعدادات */
    const a = await importDept(T, NEW, mgrA, await small(['bassam_employees_v1', 'bassam_staffing_v3', 'bassam_shift_options_v1', 'bassam_options_v1']), S1, false);
    assert.ok(a.got.bassam_employees_v1 && a.got.bassam_staffing_v3, 'الموظفون والجدول في القسم');
    /* الخطةُ مطفأةٌ للقسم */
    const p0 = JSON.parse(T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_perms_v1' ORDER BY seq)")[0].v);
    p0.caps[S1] = p0.caps[S1].filter((x) => x !== 'plan');
    await T.DB.batch([...T.lab.W.kvPutStmts(T.lab.env, 'kv', 'bassam_perms_v1', JSON.stringify(p0)), T.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
    const withPlan = await small(['bassam_employees_v1', 'bassam_staffing_v3', 'bassam_plan_v1']);
    /* (ب) REVIEW 24 · القاعدتان 2 و5: مديرُ العقدة يملك ما فُعِّل لعقدته — نسختُه ببيانات نظامٍ مطفأ تُرفض كلُّها بلا أثر، ورسالتُها تقول السببَ وما العمل */
    const before = T.DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', S1)[0].n;
    const b = await protocol(T, mgrA, withPlan, { scope: { kind: 'dept', departmentId: S1 }, slice: false }).run(), lastB = b.commit || b.inspect || b.begin;
    assert.equal(lastB.status, 403); assert.equal(lastB.j.err, 'restore-operations-resource-denied');
    assert.equal(T.DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', S1)[0].n, before, 'لا أثر');
    const kitText = fs.readFileSync(new URL('../../src/services/548-import-kit.js', import.meta.url), 'utf8');
    assert.match(/'restore-operations-resource-denied': '([^']*)'/.exec(kitText)[1], /نظامٍ مطفأ.*لم يتغيّر شيء.*مدير المنصة.*«محفوظة — غير مفعّلة».*فعّل النظام/, 'رسالةُ الرفض بالعربي: السببُ وما العمل');
    /* (ج) مديرُ المنصة: تُحفظ الخطةُ «محفوظة — غير مفعّلة» ولا يُسقط شيء */
    const c = await importDept(T, NEW, T.su, withPlan, S1, false);
    assert.ok(c.got.bassam_plan_v1 && c.got.bassam_plan_v1.floors.length, 'الخطةُ محفوظةٌ في القسم والنظامُ مطفأ');
  } finally { await T.close(); }
});

/* ⑤ (شرطُ المراجع على REVIEW 28): الخادمُ لا يحفظ تاريخاً بصيغةٍ حرّة تجاوزت الواجهة (عميلٌ قديم · طلبٌ مباشر) — يقبل ISO الميلادي أو يوماً هجرياً يحوّله calConvDay،
   وما سواهما يُرفض calendar-unmapped بموضعه، ولا يتغيّر شيء */
for (const [label, edit, at] of [
  ['مفتاحُ يومٍ dd/mm/yyyy في الجولات', (f) => { const r = JSON.parse(f.data.bassam_rounds_v1); r['24/11/2026'] = r[Object.keys(r).find((k) => /^\d{4}-/.test(k))]; f.data.bassam_rounds_v1 = JSON.stringify(r); }, /bassam_rounds_v1.*24\/11\/2026/],
  ['rec.from بصيغة dd/mm/yyyy في المهام', (f) => { const t = JSON.parse(f.data.bassam_tasks_v1), d = Object.keys(t)[0]; t[d][0][23] = { ...t[d][0][23], rec: { id: 'TEST_ONLY_r9', ver: 1, t: 'weekly', from: '24/11/2026', to: '', paused: 0 } }; f.data.bassam_tasks_v1 = JSON.stringify(t); }, /rec\.from/],
]) for (const slice of [true, false]) test('⑤ ' + label + ' (' + (slice ? 'دفعات' : 'مسارٌ واحد') + '): الخادمُ يرفضه calendar-unmapped بموضعه ولا يتغيّر شيء', { ...need, timeout: 600000 }, async () => {
  await oldDocs();
  const T = await target(), dept = 'TEST_ONLY_A';
  try {
    const file = await oldFile({ small: true }); edit(file);
    const before = T.DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', dept)[0].n;
    const out = await protocol(T, T.su, file, { scope: { kind: 'dept', departmentId: dept }, slice: slice ? 1 : false, sliceTarget: 6000 }).run();
    const last = out.commit || out.inspect || out.slice || out.part || out.begin;
    assert.notEqual(last.status, 200, 'لا يُحفظ: ' + last.t.slice(0, 300));
    assert.equal(last.j && last.j.err, 'calendar-unmapped', last.t.slice(0, 300));
    assert.match(JSON.stringify(last.j), at, 'الموضعُ مذكور: ' + last.t.slice(0, 300));
    assert.equal(T.DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', dept)[0].n, before, 'لا أثر');
  } finally { await T.close(); }
});
