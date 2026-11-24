/* V7 · 53 تقويم · قياسُ المرحلة ٢ من 0014 على عالم S1 (500 موظف · سنتان) تحت سقوف D1 (D1Shim.limits) — قياسٌ لا تأكيد، TEST_ONLY.
   العالمُ يُبذر بمفاتيحه الهجرية بالمرمِّز نفسِه (s1_world.seed)، ثم يُعلَّم كما يتركه 0014 (cal_pend · cal_mig_t)، ثم أولُ لمسٍ لفترات (التحويلُ الكسول، REVIEW 33)،
   ثم المسارُ الخلفي POST /api/operations/periods-migrate بميزانية 25 ث للنداء حتى تكتمل. يُقاس: زمنُ كل نداء · أكبرُ استدعاء D1 · مجموعُ الزمن · ثم ثوابت:
   عددُ الأيام محفوظٌ لكل مورد · لا مفتاحَ هجريَّ باقٍ · قراءةُ فترةٍ ميلادية 200.
   node --max-old-space-size=6144 tests/load/cal_migrate_run.mjs   (EMP · PLAN_M · STF_M · DAYS · ZONES · TASKS كما في s1_run · LIMITS=0 بلا سقوف) */
import { cfg, build, seed, open, DEPT, K } from './s1_world.mjs';
const C = cfg(), W0 = await open(), { lab, call, su } = W0, DB = lab.env.DB;
const quiet = console.log; console.log = (...a) => { const s = a.join(' '); if (process.env.VERBOSE || /"lvl":"error"/.test(s)) process.stderr.write(s.slice(0, 600) + '\n'); };
const HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }), o = {};
HF.formatToParts(new Date()).forEach((p) => { o[p.type] = +p.value; });
const curH = o.year + '-' + o.month, Tg = new Date().toISOString().slice(0, 10);
/* المولّدُ يكتب اليوم 30 لكل شهر — وفي أم القرى أشهرٌ من 29: يومٌ لا وجود له يوقف ترحيلَ إدارته باسمه (§3.1، يُقاس ذلك وحدَه بـ KEEP_BAD=1) — فيُحذف من العالم هنا */
const HV = new Set(); for (let t = Date.UTC(2015, 0, 1); t < Date.UTC(2035, 0, 1); t += 864e5) { const q = {}; HF.formatToParts(new Date(t)).forEach((p) => { q[p.type] = +p.value; }); HV.add(q.year + '-' + q.month + '-' + q.day); }
const okDay = (k) => process.env.KEEP_BAD === '1' || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(k) || HV.has(k.split('-').map(Number).join('-'));
const world0 = build(C, curH), world = { ...world0, specs: Object.fromEntries(Object.entries(world0.specs).map(([r, sp]) => [r, { ...sp, periods: function* () { for (const pv of sp.periods()) if (okDay(pv[0])) yield pv; } }])) };
const t0 = performance.now(), counts = seed(lab, { bassam_employees_v1: world.docs.bassam_employees_v1, bassam_staffing_v3: world.docs.bassam_staffing_v3 }, world.specs);
const seedMs = Math.round(performance.now() - t0);
const CAL = ['bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_staffing_v3', 'bassam_plan_v1'];
const members = (res, cal) => DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key=?3 AND member_key GLOB ?4", DEPT, res, res === 'bassam_plan_v1' ? '$/f:months' : '$', cal === 'h' ? '1[3-5]*' : '2[0-1]*')[0].n;
const marks = (res, cal) => DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key='$' AND member_key GLOB ?3", DEPT, res, cal === 'h' ? 'm:1[3-5]*' : 'm:2[0-1]*')[0].n;
const before = Object.fromEntries(CAL.map((r) => [r, { h: members(r, 'h'), mk: marks(r, 'h') }]));
const rows0 = DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', DEPT)[0].n;
DB.exec("INSERT INTO meta(k,v) VALUES('cal_pend','" + JSON.stringify({ [DEPT]: CAL.concat(['bassam_staffing_v3']).filter((r, i, a) => a.indexOf(r) === i && DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2', DEPT, r)[0].n) }) + "') ON CONFLICT(k) DO UPDATE SET v=excluded.v; INSERT INTO meta(k,v) VALUES('cal_mig_t','" + Tg + "') ON CONFLICT(k) DO UPDATE SET v=excluded.v");
DB.limits = process.env.LIMITS !== '0';
/* أولُ لمسٍ (REVIEW 33): قراءةُ فترةٍ واحدة لم تُحوَّل — يومُ اليوم في الجولات والتقرير · شهرُ الجدول الجاري */
const first = [];
for (const [name, k] of [['rounds today', K('bassam_rounds_v1') + '@' + Tg], ['dreport today', K('bassam_dreport_v1') + '@' + Tg], ['staffing month', K('bassam_staffing_v3') + '@' + Tg.slice(0, 7)]]) {
  DB.peak = 0; const a = performance.now(), r = await call('/api/operations/read?keys=' + encodeURIComponent(k), { ck: su.ck });
  first.push({ name, ms: Math.round(performance.now() - a), status: r.status, err: r.j && r.j.err, peakMB: +(DB.peak / 1048576).toFixed(2) });
}
/* ثم المسارُ الخلفي للمدير حتى يكتمل */
const calls = []; let last = null; const t1 = performance.now();
for (let i = 0; i < (process.env.NO_BATCH === '1' ? 0 : 2000); i++) {
  DB.peak = 0; const a = performance.now();
  last = await call('/api/operations/periods-migrate', { ck: su.ck, body: { dept: DEPT, budgetMs: 25000 } });
  calls.push({ ms: Math.round(performance.now() - a), status: last.status, peakMB: +(DB.peak / 1048576).toFixed(2), progress: last.j && last.j.departments && last.j.departments[0] && last.j.departments[0].calendar });
  if (last.status !== 200 || !last.j.more) break;
}
if (process.env.NO_BATCH === '1') { quiet(JSON.stringify({ world: C, seedMs, first }, null, 1)); process.exit(0); }
const totalMs = Math.round(performance.now() - t1);
const after = Object.fromEntries(CAL.map((r) => [r, { h: members(r, 'h'), g: members(r, 'g'), mk: marks(r, 'g') }]));
const dayRes = ['bassam_rounds_v1', 'bassam_rounds_arc_v1'];
const pr = await call('/api/operations/read?keys=' + encodeURIComponent(K('bassam_rounds_v1') + '@' + Tg + ',' + K('bassam_dreport_v1') + '@' + Tg), { ck: su.ck });
const out = { world: C, first, seedMs, counts, rowsBefore: rows0, rowsAfter: DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', DEPT)[0].n, calls: calls.length, totalMs, perCall: calls, final: last.j, before, after,
  daysKept: { rounds: before.bassam_rounds_v1.h + before.bassam_rounds_arc_v1.h === after.bassam_rounds_v1.g + after.bassam_rounds_arc_v1.g, dreport: before.bassam_dreport_v1.h === after.bassam_dreport_v1.g, tasks: before.bassam_tasks_v1.h === after.bassam_tasks_v1.g },
  noHijriLeft: CAL.every((r) => after[r].h === 0 && marks(r, 'h') === 0), periodRead: pr.status, pending: (DB.q("SELECT v FROM meta WHERE k='cal_pend'")[0] || {}).v, limits: DB.limits };
void dayRes;
quiet(JSON.stringify(out, null, 1));
await lab.close?.();
process.exit(0);
