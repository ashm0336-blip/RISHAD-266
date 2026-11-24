/* V7 · 53 تقويم (rimp · مانعُ Preview): استيرادُ ملف Production (≈31MB، TEST_ONLY) استبدالاً على إدارةٍ فيها فتراتٌ هجرية معلَّقة التحويل (cal_pend — حالُ Preview بعد 0014)
   تحت سقوف D1 (D1Shim.limits). يطبع نتيجةَ كل مرحلة وأكبرَ استدعاء — قياسٌ وتشخيص.
   node --max-old-space-size=6144 tests/load/cal_import_pending_run.mjs   (EMP · DAYS … كما في s1_world · SMALL=1 ملفٌّ صغير · LIMITS=0 بلا سقوف) */
import { cfg, build, seed, open, DEPT } from './s1_world.mjs';
import { oldFile, protocol } from '../unit/v7_d6_import_fx.mjs';
const C = cfg(), W0 = await open(), { lab } = W0, DB = lab.env.DB;
const quiet = console.log; console.log = (...a) => { const s = a.join(' '); if (/"lvl":"error"|worker-error/.test(s)) process.stderr.write(s.slice(0, 1500) + '\n'); };
const HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }), o = {};
HF.formatToParts(new Date()).forEach((p) => { o[p.type] = +p.value; });
const HV = new Set(); for (let t = Date.UTC(2015, 0, 1); t < Date.UTC(2035, 0, 1); t += 864e5) { const q = {}; HF.formatToParts(new Date(t)).forEach((p) => { q[p.type] = +p.value; }); HV.add(q.year + '-' + q.month + '-' + q.day); }
const okDay = (k) => !/^\d{4}-\d{1,2}-\d{1,2}$/.test(k) || HV.has(k.split('-').map(Number).join('-'));
const w0 = build(C, o.year + '-' + o.month), world = { ...w0, specs: Object.fromEntries(Object.entries(w0.specs).filter(([r]) => !(process.env.SKIP || '').split(',').includes(r)).map(([r, sp]) => [r, { ...sp, periods: function* () { for (const pv of sp.periods()) if (okDay(pv[0])) yield pv; } }])) };
/* البذرُ بمفاتيحه الهجرية كما بقيت في D1 قبل التحويل الكسول — بالمخطّط الموسَّع (019v1 calWideRegistry) */
const WIDE = lab.W.calWideRegistry(), labH = { ...lab, W: { ...lab.W, opInfo: (k) => { const i = lab.W.opInfo(k); return i && WIDE[i.resource] ? { ...i, prepared: WIDE[i.resource] } : i; } } };
if (process.env.NOSEED !== '1') seed(labH, { bassam_employees_v1: world.docs.bassam_employees_v1, bassam_staffing_v3: world.docs.bassam_staffing_v3 }, world.specs);
const CAL = ['bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_staffing_v3', 'bassam_plan_v1'];
process.stderr.write('NODES ' + JSON.stringify(DB.q('SELECT resource r, COUNT(*) n FROM ops_nodes WHERE department_id=?1 GROUP BY resource', DEPT)) + '\n');
const pend = CAL.filter((r) => DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2', DEPT, r)[0].n);
if (process.env.PEND !== '0') DB.exec("INSERT INTO meta(k,v) VALUES('cal_pend','" + JSON.stringify({ [DEPT]: pend }) + "') ON CONFLICT(k) DO UPDATE SET v=excluded.v");
DB.limits = process.env.LIMITS !== '0';
/* كلُّ طلبِ استيراد يُقاس: زمنُ المعالج (process.cpuUsage — في العملية نفسِها، ويشمل SQLite المحلي الذي لا يُحسب على Workers) · الكومةُ قبل وبعد (بعد gc) */
const meas = [];
const call = async (p, o = {}) => {
  if (global.gc) global.gc();
  const op = o.body && (o.body.op || o.body.phase), h0 = process.memoryUsage(), c0 = process.cpuUsage(), w0 = performance.now();
  let peak = h0.heapUsed; const iv = setInterval(() => { const h = process.memoryUsage().heapUsed; if (h > peak) peak = h; }, 5);
  const r = await W0.call(p, o); clearInterval(iv);
  const c = process.cpuUsage(c0), h1 = process.memoryUsage();
  if (op) meas.push({ op, i: o.body.i, st: r.status, cpuMs: Math.round((c.user + c.system) / 1000), wallMs: Math.round(performance.now() - w0), heapBeforeMB: +(h0.heapUsed / 1048576).toFixed(1), heapAfterMB: +(h1.heapUsed / 1048576).toFixed(1), peakSampledMB: +(Math.max(peak, h1.heapUsed) / 1048576).toFixed(1), rssMB: +(h1.rss / 1048576).toFixed(0) });
  return r;
};
const T = { lab, DB, call, su: W0.su };
const file = await oldFile(process.env.SMALL === '1' ? { small: true } : process.env.NOIMG === '1' ? { images: false } : {});
const P = protocol(T, T.su, file, { scope: { kind: 'dept', departmentId: DEPT }, mode: 'replace', ...(process.env.SLICE_ALL === '1' ? { slice: 1 } : {}) });
const t0 = performance.now(); DB.peak = 0;
const out = await P.run();
const last = out.commit || out.inspect || out.slice || out.part || out.begin;
quiet(JSON.stringify({ world: C, pend, rowsBefore: null, slices: P.sliceCount, failedAt: out.failedAt, step: out.commit ? 'commit' : out.inspect ? 'inspect' : out.slice ? 'slice' : out.part ? 'part' : 'begin', status: last.status, body: last.t.slice(0, 400), ms: Math.round(performance.now() - t0), peakMB: +(DB.peak / 1048576).toFixed(2), pendAfter: (DB.q("SELECT v FROM meta WHERE k='cal_pend'")[0] || {}).v }, null, 1));
process.stderr.write('MEAS ' + JSON.stringify(meas.filter((m) => m.op === 'slice' || m.op === 'inspect' || m.op === 'commit' || m.op === 'begin')) + '\n');
process.exit(0);
