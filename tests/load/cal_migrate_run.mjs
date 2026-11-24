/* V7 · 53 تقويم · قياسُ المرحلة ٢ من 0014 على عالم S1 (500 موظف · سنتان) تحت سقوف D1 (D1Shim.limits) — قياسٌ لا تأكيد، TEST_ONLY.
   العالمُ يُبذر بمفاتيحه الهجرية بالمرمِّز نفسِه (s1_world.seed)، ثم تُعلَّق الإدارةُ كما تتركها المرحلة ١ (cal_ops_pending · cal_mig_t)، ثم
   POST /api/operations/calendar-migrate بميزانية 25 ث للنداء حتى تكتمل. يُقاس: زمنُ كل نداء · أكبرُ استدعاء D1 · مجموعُ الزمن · ثم ثوابت:
   عددُ الأيام محفوظٌ لكل مورد · لا مفتاحَ هجريَّ باقٍ · قراءةُ فترةٍ ميلادية 200.
   node --max-old-space-size=6144 tests/load/cal_migrate_run.mjs   (EMP · PLAN_M · STF_M · DAYS · ZONES · TASKS كما في s1_run · LIMITS=0 بلا سقوف) */
import { cfg, build, seed, open, DEPT, K } from './s1_world.mjs';
const C = cfg(), W0 = await open(), { lab, call, su } = W0, DB = lab.env.DB;
const quiet = console.log; console.log = (...a) => { const s = a.join(' '); if (process.env.VERBOSE || /"lvl":"error"/.test(s)) process.stderr.write(s.slice(0, 600) + '\n'); };
const HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }), o = {};
HF.formatToParts(new Date()).forEach((p) => { o[p.type] = +p.value; });
const curH = o.year + '-' + o.month, Tg = new Date().toISOString().slice(0, 10);
const t0 = performance.now(), world = build(C, curH), counts = seed(lab, { bassam_employees_v1: world.docs.bassam_employees_v1, bassam_staffing_v3: world.docs.bassam_staffing_v3 }, world.specs);
const seedMs = Math.round(performance.now() - t0);
const CAL = ['bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_staffing_v3', 'bassam_plan_v1'];
const members = (res, cal) => DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key=?3 AND member_key GLOB ?4", DEPT, res, res === 'bassam_plan_v1' ? '$/f:months' : '$', cal === 'h' ? '1[3-5]*' : '2[0-1]*')[0].n;
const marks = (res, cal) => DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key='$' AND member_key GLOB ?3", DEPT, res, cal === 'h' ? 'm:1[3-5]*' : 'm:2[0-1]*')[0].n;
const before = Object.fromEntries(CAL.map((r) => [r, { h: members(r, 'h'), mk: marks(r, 'h') }]));
const rows0 = DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', DEPT)[0].n;
DB.exec("INSERT INTO meta(k,v) VALUES('cal_ops_pending','[\"" + DEPT + "\"]') ON CONFLICT(k) DO UPDATE SET v=excluded.v; INSERT INTO meta(k,v) VALUES('cal_mig_t','" + Tg + "') ON CONFLICT(k) DO UPDATE SET v=excluded.v");
DB.limits = process.env.LIMITS !== '0';
const calls = []; let last = null; const t1 = performance.now();
for (let i = 0; i < 400; i++) {
  DB.peak = 0; const a = performance.now();
  last = await call('/api/operations/calendar-migrate', { ck: su.ck, body: { dept: DEPT, budgetMs: 25000 } });
  calls.push({ ms: Math.round(performance.now() - a), status: last.status, peakMB: +(DB.peak / 1048576).toFixed(2), at: last.j && last.j.departments && last.j.departments[0] && last.j.departments[0].at, err: last.j && (last.j.err || (last.j.departments[0] || {}).err) });
  if (last.status !== 200 || !last.j.more) break;
}
const totalMs = Math.round(performance.now() - t1);
const after = Object.fromEntries(CAL.map((r) => [r, { h: members(r, 'h'), g: members(r, 'g'), mk: marks(r, 'g') }]));
const dayRes = ['bassam_rounds_v1', 'bassam_rounds_arc_v1'];
const pr = await call('/api/operations/read?keys=' + encodeURIComponent(K('bassam_rounds_v1') + '@' + Tg + ',' + K('bassam_dreport_v1') + '@' + Tg), { ck: su.ck });
const out = { world: C, seedMs, counts, rowsBefore: rows0, rowsAfter: DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', DEPT)[0].n, calls: calls.length, totalMs, perCall: calls, final: last.j, before, after,
  daysKept: { rounds: before.bassam_rounds_v1.h + before.bassam_rounds_arc_v1.h === after.bassam_rounds_v1.g + after.bassam_rounds_arc_v1.g, dreport: before.bassam_dreport_v1.h === after.bassam_dreport_v1.g, tasks: before.bassam_tasks_v1.h === after.bassam_tasks_v1.g },
  noHijriLeft: CAL.every((r) => after[r].h === 0 && marks(r, 'h') === 0), periodRead: pr.status, pending: DB.q("SELECT v FROM meta WHERE k='cal_ops_pending'")[0].v, limits: DB.limits };
void dayRes;
quiet(JSON.stringify(out, null, 1));
await lab.close?.();
process.exit(0);
