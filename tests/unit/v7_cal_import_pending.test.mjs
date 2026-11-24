/* V7 · 53 تقويم (rimp · مانعُ Preview 265): استيرادُ ملف Production (TEST_ONLY بالبنية والحجم الحقيقيين ≈31MB، وبلا صور ≈9.9MB) استبدالاً على إدارةٍ
   فيها فتراتٌ هجرية معلَّقة التحويل (cal_pend — حالُ الإدارات على Preview بعد 0014) — تحت سقوف D1 الحقيقية (D1Shim.limits).
   قبل الإصلاح: أولُ دفعة (op=slice) تحوّل تاريخَ الإدارة في طلبها (calLazyEnsure من opLoadMany) ⇒ 409 conflict كلَّ مرة (وصفوفُها القديمة تُفكّ بالمخطّط المضيَّق ⇒ 400) —
   ويظهر على Preview 500 worker-error. بعده: ما يُطرح بالاستبدال لا يُحوَّل ويُقرأ بالمخطّط الموسَّع، والاستيرادُ يعتمد ذرّياً ويُقرأ كلُّ موردٍ ميلادياً.
   والدمجُ (لا استبدال) يبقى على القاعدة العادية: التحويلُ الكسول قبل الكتابة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasSystem } from './harness.mjs';
import { build, seed, DEPT } from '../load/s1_world.mjs';
import { target, oldFile, protocol, readBack } from './v7_d6_import_fx.mjs';

const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport') ? {} : { skip: 'يحتاج الأنظمة' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };
const HKEY = /^(?:m:)?1[345]\d\d-\d{1,2}(?:-\d{1,2})?(?:-.+)?$/;
const HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
const HV = new Set(); for (let t = Date.UTC(2015, 0, 1); t < Date.UTC(2035, 0, 1); t += 864e5) { const q = {}; HF.formatToParts(new Date(t)).forEach((p) => { q[p.type] = +p.value; }); HV.add(q.year + '-' + q.month + '-' + q.day); }
/* إدارةٌ بتاريخٍ هجريٍّ مخزَّن كما بقي في D1 بعد 0014 (يُبذر بالمخطّط الموسَّع 019v1 calWideRegistry) ومعلَّمةٌ cal_pend */
async function pendingWorld() {
  const T = await target(), o = {};
  HF.formatToParts(new Date()).forEach((p) => { o[p.type] = +p.value; });
  const w0 = build({ EMP: 40, PLAN_M: 2, STF_M: 2, DAYS: 40, ZONES: 12, TASKS: 0 }, o.year + '-' + o.month);
  const ok = (k) => !/^\d{4}-\d{1,2}-\d{1,2}$/.test(k) || HV.has(k.split('-').map(Number).join('-'));
  const specs = Object.fromEntries(Object.entries(w0.specs).filter(([r]) => r !== 'bassam_dreport_v1').map(([r, sp]) => [r, { ...sp, periods: function* () { for (const pv of sp.periods()) if (ok(pv[0])) yield pv; } }]));
  const WIDE = T.lab.W.calWideRegistry(), lab = { ...T.lab, W: { ...T.lab.W, opInfo: (k) => { const i = T.lab.W.opInfo(k); return i && WIDE[i.resource] ? { ...i, prepared: WIDE[i.resource] } : i; } } };
  seed(lab, { bassam_employees_v1: w0.docs.bassam_employees_v1, bassam_staffing_v3: w0.docs.bassam_staffing_v3 }, specs);
  const res = T.DB.q('SELECT DISTINCT resource r FROM ops_nodes WHERE department_id=?1', DEPT).map((r) => r.r).filter((r) => r !== 'bassam_employees_v1');
  T.DB.exec("INSERT INTO meta(k,v) VALUES('cal_pend','" + JSON.stringify({ [DEPT]: res }) + "') ON CONFLICT(k) DO UPDATE SET v=excluded.v");
  const hijri = T.DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND member_key GLOB '1[3-5]*'", DEPT)[0].n;
  const nodes = T.DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', DEPT)[0].n;
  if (!(hijri >= 40 && nodes > 10000)) { await T.close(); assert.fail('الإدارةُ تحمل تاريخاً هجرياً معلَّقاً (' + hijri + ' عضواً هجرياً · ' + nodes + ' عقدة)'); }
  T.DB.limits = true;
  return T;
}

for (const [label, opt] of [['≈31MB', {}], ['≈9.9MB بلا صور', { images: false }]]) test('ملفُّ Production ' + label + ' يستبدل إدارةً بتاريخٍ هجريٍّ معلَّق تحت سقوف D1: كلُّ دفعةٍ 200 · الاعتمادُ ذرّي · كلُّ موردٍ ميلادي يُقرأ', { ...need, timeout: 1200000 }, async () => {
  const T = await pendingWorld();
  try {
    const file = await oldFile(opt), P = protocol(T, T.su, file, { scope: { kind: 'dept', departmentId: DEPT }, mode: 'replace' }), out = await P.run();
    assert.ok(P.sliceCount >= 10, 'دفعاتٌ عدّة: ' + P.sliceCount);
    const last = out.commit || out.inspect || out.slice || out.part || out.begin;
    assert.equal(last.status, 200, 'الخطوة ' + (out.failedAt != null ? 'slice ' + out.failedAt : '') + ': ' + last.t.slice(0, 300));
    assert.equal(out.commit.j.ok, 1);
    const got = await readBack(T, DEPT);
    for (const [r, doc] of Object.entries(got)) if (doc && typeof doc === 'object' && !Array.isArray(doc)) assert.deepEqual(Object.keys(doc).filter((k) => HKEY.test(k)), [], r + ': لا مفتاحَ هجرياً باقٍ');
    assert.ok(Object.keys(got.bassam_rounds_v1 || {}).length + Object.keys(got.bassam_rounds_arc_v1 || {}).length >= 26, 'أيامُ النسخة في الجولات');
  } finally { await T.close(); }
});

test('الدمجُ (لا استبدال) على إدارةٍ معلَّقة يبقى على القاعدة العادية: لا يُتخطّى التحويلُ الكسول', { ...need, timeout: 600000 }, async () => {
  const T = await pendingWorld();
  try {
    const before = T.DB.q("SELECT v FROM meta WHERE k='cal_pend'")[0].v;
    const out = await protocol(T, T.su, await oldFile({ small: true }), { scope: { kind: 'dept', departmentId: DEPT }, mode: 'merge', slice: false }).run();
    const last = out.commit || out.inspect || out.begin;
    /* الدمجُ يمرّ بالتحويل العادي قبل الكتابة: إمّا يُحوَّل ما يلمسه (تقصر cal_pend) وإمّا يُرفض بسببٍ مسمّى — لا 500 ولا كتابةَ فوق صفوفٍ هجرية */
    assert.ok(last.status !== 500, last.t.slice(0, 300));
    if (last.status === 200) assert.notEqual(T.DB.q("SELECT v FROM meta WHERE k='cal_pend'")[0].v, before, 'ما لمسه الدمجُ حُوِّل');
  } finally { await T.close(); }
});
