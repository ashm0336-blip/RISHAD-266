/* V7 · 53 تقويم (REVIEW 45 · الحفظُ العادي على إدارةٍ معلَّقة) — مبنيٌّ على cal_migrate_run: قياسُ المرحلة ٢ من 0014 على عالم S1 (500 موظف · سنتان) تحت سقوف D1 (D1Shim.limits) — قياسٌ لا تأكيد، TEST_ONLY.
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
/* البذرُ بمفاتيحه الهجرية يحتاج المخطّطَ الموسَّع (calWideRegistry، كما يقرأ 0014 صفوفَه) — المخطّطُ الحالي ISO وحده (calops) */
const labWide = { ...lab, W: new Proxy(lab.W, { get(o, p) { return p === 'opInfo' ? (k) => { const i = o.opInfo(k); return i && { ...i, prepared: o.calWideRegistry()[i.resource] }; } : o[p]; } }) };
const t0 = performance.now(), counts = seed(labWide, { bassam_employees_v1: world.docs.bassam_employees_v1, bassam_staffing_v3: world.docs.bassam_staffing_v3 }, world.specs);
const seedMs = Math.round(performance.now() - t0);
const CAL = ['bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_staffing_v3', 'bassam_plan_v1'];
const members = (res, cal) => DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key=?3 AND member_key GLOB ?4", DEPT, res, res === 'bassam_plan_v1' ? '$/f:months' : '$', cal === 'h' ? '1[3-5]*' : '2[0-1]*')[0].n;
const marks = (res, cal) => DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key='$' AND member_key GLOB ?3", DEPT, res, cal === 'h' ? 'm:1[3-5]*' : 'm:2[0-1]*')[0].n;
const before = Object.fromEntries(CAL.map((r) => [r, { h: members(r, 'h'), mk: marks(r, 'h') }]));
const rows0 = DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1', DEPT)[0].n;
DB.exec("INSERT INTO meta(k,v) VALUES('cal_pend','" + JSON.stringify({ [DEPT]: CAL.concat(['bassam_staffing_v3']).filter((r, i, a) => a.indexOf(r) === i && DB.q('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2', DEPT, r)[0].n) }) + "') ON CONFLICT(k) DO UPDATE SET v=excluded.v; INSERT INTO meta(k,v) VALUES('cal_mig_t','" + Tg + "') ON CONFLICT(k) DO UPDATE SET v=excluded.v");
if (process.env.NOPEND === "1") DB.exec("DELETE FROM meta WHERE k='cal_pend'");
if (process.env.ONLY_TASKS === "1") { const ep0 = (await call("/api/operations/read?keys=" + encodeURIComponent(K("bassam_employees_v1")), { ck: su.ck })).j.epoch; const r = await call("/api/tasks/create", { ck: su.ck, body: { requestId: "TEST_ONLY_r45_x", epoch: ep0, dept: DEPT, k: Tg, t: "TEST_ONLY r45", s: Date.now() - 60e3, e: Date.now() + 7200e3, asg: [], rv: "none", force: true } }); quiet(JSON.stringify({ pend: (DB.q("SELECT v FROM meta WHERE k='cal_pend'")[0] || {}).v, st: r.status, j: r.j })); process.exit(0); }
DB.limits = process.env.LIMITS !== '0';

/* REVIEW 45: المساراتُ العادية على إدارةٍ معلَّقة بتاريخٍ واقعي، كما تفعلها الصفحة (قراءةُ الفترة ثم حفظُها بأساسها) — وكتابةٌ بلا قراءة قبلها */
const nodes = DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource='bassam_rounds_v1'", DEPT)[0].n;
let rq = 0; const out = [];
const t = async (name, f) => { DB.peak = 0; const a = performance.now(); let r; try { r = await f(); } catch (e) { r = { status: 'throw', j: { err: String(e && e.message || e).slice(0, 200) } }; } out.push({ name, ms: Math.round(performance.now() - a), status: r.status, err: r.j && (r.j.err || r.j.error), peakMB: +(DB.peak / 1048576).toFixed(2) }); return r; };
const read = (keys) => call('/api/operations/read?keys=' + encodeURIComponent(keys.join(',')), { ck: su.ck });
const save = (r0, key, v, extra) => call('/api/save', { ck: su.ck, body: Object.assign({ requestId: 'TEST_ONLY_r45_' + ++rq, epoch: r0.j.epoch, base: { [key]: r0.j.base[key] || 0 }, set: { [key]: JSON.stringify(v) }, del: [] }, r0.j.logical ? { logical: r0.j.logical } : {}, extra || {}) });
const dayOf = (n) => new Date(Date.parse(Tg) - n * 864e5).toISOString().slice(0, 10);
const readSave = async (label, key, mut) => {
  const r0 = await t(label + ' · first-touch read', () => read([key]));
  if (r0.status !== 200) return;
  const v = r0.j.resources[key]; await t(label + ' · save', () => save(r0, key, mut(v)));
  const r1 = await read([key]); out.push({ name: label + ' · reread', status: r1.status, same: JSON.stringify(r1.j.resources && r1.j.resources[key]) === JSON.stringify(mut(v)) });
};
const tag = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? { ...v, TEST_ONLY_r45: 1 } : v);
await readSave('rounds day (today)', K('bassam_rounds_v1') + '@' + Tg, (v) => (v ? { ...v, t: (v.t || 0) + 1 } : v));
await readSave('staffing month', K('bassam_staffing_v3') + '@' + Tg.slice(0, 7), (v) => v);
await readSave('plan month', K('bassam_plan_v1') + '@' + Tg.slice(0, 7), (v) => v);
await readSave('dreport day (today)', K('bassam_dreport_v1') + '@' + Tg, (v) => v);
/* كتابةٌ أولى بلا قراءة: يومٌ ماضٍ لم يُلمس (base 0) — يُحوَّل قبل أساس الطلب */
{
  const k = K('bassam_rounds_v1') + '@' + dayOf(5), ep = (await read([K('bassam_employees_v1')])).j.epoch;
  const r = await t('rounds day (−5) · write-first base 0', () => call('/api/save', { ck: su.ck, body: { requestId: 'TEST_ONLY_r45_' + ++rq, epoch: ep, base: { [k]: 0 }, set: { [k]: JSON.stringify({ t: 1, d: [] }) }, del: [] } }));
  void r;
}
/* أساسٌ منطقيٌّ أُخذ قبل أن يحوّل طلبٌ آخرُ فترةً أخرى من المورد نفسِه */
{
  const kx = K('bassam_dreport_v1') + '@' + dayOf(10), ky = K('bassam_dreport_v1') + '@' + dayOf(20);
  const rx = await read([kx]); await t('dreport other day converted meanwhile (read)', () => read([ky]));
  await t('dreport day save with logical base from before', () => save(rx, kx, rx.j.resources[kx]));
}
/* أمرُ مهام */
{
  const eid = (DB.q("SELECT v FROM kv WHERE k=?1", K('bassam_employees_v1'))[0] || {}).v;
  let emp = null; try { const L = JSON.parse(eid || 'null'); emp = Array.isArray(L) ? L[0] && (L[0].id || L[0].eid) : null; } catch (e) { emp = null; }
  emp = emp || (world.docs.bassam_employees_v1 && (world.docs.bassam_employees_v1[0] || {}).id);
  const ep = (await read([K('bassam_employees_v1')])).j.epoch;
  await t('tasks create (today)', () => call('/api/tasks/create', { ck: su.ck, body: { requestId: 'TEST_ONLY_r45_' + ++rq, epoch: ep, dept: DEPT, k: Tg, t: 'TEST_ONLY r45', s: Date.now() - 60e3, e: Date.now() + 7200e3, asg: emp ? [emp] : [], rv: 'none', force: true } }));
}
quiet(JSON.stringify({ world: C, limits: DB.limits, roundsNodes: nodes, rowsDept: rows0, seedMs, steps: out, pending: (DB.q("SELECT v FROM meta WHERE k='cal_pend'")[0] || {}).v.slice(0, 300) }, null, 1));
await lab.close?.();
process.exit(0);
