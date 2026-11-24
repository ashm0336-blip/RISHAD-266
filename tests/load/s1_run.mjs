/* V7 · 53 · اختبارُ حِمل عالم S1 — القياس (لا تأكيد): كلُّ صفحةٍ وكلُّ حفظ يومٍ وشهرٍ في أول السنتين وآخرها، تحت سقوف D1 في D1Shim (limits).
   node tests/load/s1_run.mjs                      العاملُ الحالي (workers/_worker.js)
   KIVO_WORKER=<old>/_worker.js node tests/load/s1_run.mjs     «قبل» (عاملٌ أقدم — قراءاتٌ وحفظٌ بالوثيقة كلها وحدها)
   البيئة: EMP · PLAN_M · STF_M · DAYS · ZONES · TASKS (s1_world.mjs) · REPEAT (عددُ الفتحات لكل صفحة، 3) · LIMITS=0 بلا سقوف · OUT=<ملف JSON>.
   المخرج: سطرٌ لكل قياس + ملخّصٌ JSON (الحالة · الزمن p95 · أكبرُ استدعاء D1 بالبايت · حجمُ الرد). */
import fs from 'node:fs';
import { cfg, build, seed, open, K } from './s1_world.mjs';

const C = cfg(), REPEAT = +(process.env.REPEAT || 3);
const W0 = await open(), { lab, call, su, emp } = W0, DB = lab.env.DB, W = lab.W;
const period = typeof W.opSplit === 'function';
const quiet = console.log; console.log = (...a) => { const s = a.join(' '); if (process.env.VERBOSE || /"lvl":"error"/.test(s)) process.stderr.write(s.slice(0, 600) + '\n'); };
const T = (await call('/api/me?uid=' + encodeURIComponent(su.uid), { ck: su.ck })).j || {};
const cur = T.day && T.day.ym ? T.day.ym : '1448-6', today = T.day && T.day.dk ? T.day.dk : cur + '-14';
const t0 = performance.now(), world = build(C, cur), counts = seed(lab, { bassam_employees_v1: world.docs.bassam_employees_v1, bassam_staffing_v3: world.docs.bassam_staffing_v3 }, world.specs);
const seedMs = Math.round(performance.now() - t0);
DB.limits = process.env.LIMITS !== '0';
const results = [];
async function measure(name, fn, n = REPEAT) {
  const runs = [];
  for (let i = 0; i < n; i++) {
    DB.peak = 0; const a = performance.now(); let r;
    try { r = await fn(i); } catch (e) { r = { status: 'throw', t: String(e && e.message || e) }; }
    runs.push({ ms: Math.round(performance.now() - a), status: r.status, err: r.j && r.j.err, peak: DB.peak, bytes: (r.t || '').length, failed: r.j && r.j.failed ? Object.keys(r.j.failed).length : 0 });
  }
  const ms = runs.map((x) => x.ms).sort((a, b) => a - b), p95 = ms[Math.min(ms.length - 1, Math.ceil(ms.length * 0.95) - 1)];
  const out = { name, status: [...new Set(runs.map((x) => x.status))].join('/'), err: [...new Set(runs.map((x) => x.err).filter(Boolean))].join('/'), p95ms: p95, peakMB: +(Math.max(...runs.map((x) => x.peak)) / 1048576).toFixed(2), respKB: Math.round(Math.max(...runs.map((x) => x.bytes)) / 1024), failed: runs[0].failed };
  results.push(out); quiet(JSON.stringify(out)); return runs;
}
const read = (keys, extra = '') => call('/api/operations/read?keys=' + encodeURIComponent(keys.join(',')) + extra + '&uid=' + encodeURIComponent(su.uid), { ck: su.ck });
const R = { plan: K('bassam_plan_v1'), rounds: K('bassam_rounds_v1'), dreport: K('bassam_dreport_v1'), staffing: K('bassam_staffing_v3'), emps: K('bassam_employees_v1'), shifts: K('bassam_shift_options_v1'), tasks: K('bassam_tasks_v1') };
let rid = 0;
const epoch = () => Number(DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0);
const save = (set, base, del = []) => call('/api/save', { ck: su.ck, body: { uid: su.uid, requestId: 'TEST_ONLY_load_' + Date.now() + '_' + ++rid, epoch: epoch(), set, del, base } });
const first = world.dayKeys[0], last = world.dayKeys[world.dayKeys.length - 1], m0 = world.months[world.months.length - C.STF_M], mL = world.months[world.months.length - 1];
quiet(JSON.stringify({ mode: period ? 'periods' : 'legacy', worker: process.env.KIVO_WORKER || 'workers/_worker.js', cfg: C, today, seedMs, counts }));

/* ① الصفحاتُ كما يقرؤها العميلُ الحالي (المفاتيحُ المنطقية) — S1: «خطة+جولات+تقرير» وأخواتها */
const pages = { 'S1 plan+rounds+dreport': [R.plan, R.rounds, R.dreport], plan: [R.plan], rounds: [R.rounds, R.plan, R.emps, R.shifts], dreport: [R.dreport, R.emps, R.shifts], staffing: [R.staffing, R.emps, R.shifts], tasks: [R.tasks, R.emps], employees: [R.emps] };
for (const [n, keys] of Object.entries(pages)) await measure('read(logical) ' + n, () => read(keys));
await measure('me/today (صفحتي، موظف)', () => call('/api/me/today', { ck: emp.ck }));
if (period) {
  /* ② الصفحاتُ بالفترة (ما يطلبه العميلُ الجديد — العقد periods_api.md) */
  const pk = (k, p) => k + '@' + p;
  const ppages = {
    'rounds(today)': [pk(R.rounds, ''), pk(R.rounds, today), pk(R.rounds, 'm:' + cur), pk(R.plan, ''), pk(R.plan, cur), R.emps, R.shifts, pk(R.staffing, cur)],
    'dreport(today)': [pk(R.dreport, ''), pk(R.dreport, today), pk(R.dreport, 'm:' + cur), R.emps, R.shifts, pk(R.staffing, cur)],
    'plan(month)': [pk(R.plan, ''), pk(R.plan, cur)],
    'staffing(month)': [pk(R.staffing, cur), R.emps, R.shifts],
    'tasks(day)': [pk(R.tasks, today), R.emps],
    'archive(first day)': [pk(R.rounds, first), pk(R.rounds, 'm:' + first.split('-').slice(0, 2).join('-'))],
  };
  for (const [n, keys] of Object.entries(ppages)) await measure('read(period) ' + n, () => read(keys));
  await measure('read(range) rounds month', () => read([], '&range=' + encodeURIComponent(R.rounds + '@' + cur)));
  await measure('summary rounds 24 months (KPIs)', () => call('/api/operations/summary?key=' + encodeURIComponent(R.rounds) + '&grp=' + encodeURIComponent(world.months.slice(-24).join(',')) + '&uid=' + encodeURIComponent(su.uid), { ck: su.ck }), 1);
  /* المرحلة ٢ بميزانية زمنٍ لكل طلب (20 ث): تُستأنف بـnext حتى تكتمل — يُقاس كلُّ طلبٍ وعددُها */
  let p2 = { j: { more: 1, next: { dept: 'TEST_ONLY_A' } } }, calls = 0; const p2t = performance.now();
  while (p2.j && p2.j.more && calls < 200) { const nx = p2.j.next; await measure('phase-2 call ' + ++calls, async () => (p2 = await call('/api/operations/periods-migrate', { ck: su.ck, body: nx.from ? { dept: nx.dept, from: nx.from } : { dept: nx.dept } })), 1); }
  results.push({ name: 'phase-2 total', calls, ms: Math.round(performance.now() - p2t), ok: p2.j && p2.j.ok }); quiet(JSON.stringify(results[results.length - 1]));
  await measure('summary rounds 24 months (KPIs, materialized)', () => call('/api/operations/summary?key=' + encodeURIComponent(R.rounds) + '&grp=' + encodeURIComponent(world.months.slice(-24).join(',')) + '&uid=' + encodeURIComponent(su.uid), { ck: su.ck }), 1);
  /* ③ الحفظُ بالفترة: يومٌ وشهرٌ في أول السنتين وآخرها */
  const daySave = (key, p) => async (i) => {
    const r = await read([pk(key, p)]); const v = r.j.resources[pk(key, p)];
    return save({ [pk(key, p)]: JSON.stringify(key === R.rounds ? { ...v, ap: i % 2 } : key === R.dreport ? { ...v, created: 1 + i } : v) }, { [pk(key, p)]: r.j.base[pk(key, p)] });
  };
  await measure('save(period) rounds first day', daySave(R.rounds, first));
  await measure('save(period) rounds last day', daySave(R.rounds, last));
  await measure('save(period) dreport first day', daySave(R.dreport, first));
  await measure('save(period) dreport last day', daySave(R.dreport, last));
  const monSave = (p) => async (i) => { const r = await read([pk(R.staffing, p)]), v = r.j.resources[pk(R.staffing, p)], e = Object.keys(v)[0]; v[e] = { ...v[e], cs: 'TEST_ONLY_' + i }; return save({ [pk(R.staffing, p)]: JSON.stringify(v) }, { [pk(R.staffing, p)]: r.j.base[pk(R.staffing, p)] }); };
  await measure('save(period) staffing first month', monSave(m0));
  await measure('save(period) staffing last month', monSave(mL));
  /* حفظٌ متزامن مع قراءات: لا 500 ولا 503 */
  await measure('concurrent: 2 day saves + 4 reads', async () => {
    const rs = await Promise.all([daySave(R.rounds, last)(1), daySave(R.dreport, last)(1), ...Array.from({ length: 4 }, () => read([pk(R.rounds, today), pk(R.plan, cur)]))]);
    const bad = rs.find((x) => x.status >= 500) || rs.find((x) => x.status !== 200 && x.status !== 409);
    return bad || rs[0];
  }, 1);
}
/* ④ الحفظُ بالوثيقة كلها (العميلُ الحالي): تعديلُ يومٍ واحد في الجولات */
await measure('save(logical) rounds one day changed', async (i) => {
  const r = await read([R.rounds]); if (r.status !== 200 || !r.j.resources[R.rounds]) return r;
  const v = r.j.resources[R.rounds]; v[last] = { ...v[last], ap: i % 2 };
  return save({ [R.rounds]: JSON.stringify(v) }, { [R.rounds]: r.j.base[R.rounds] });
}, 1);
/* ⑤ إسقاطُ مرجع صورة (ملحق 4 · طلبُ المراجع على fc76361): زمنُ عبارة rsImageHeldSql وحدها على هذا العالم، ثم حذفُ موقعٍ بخريطته في إدارةٍ أخرى */
if (typeof W.rsImageHeldSql === 'function') {
  const ids = ['img_testonly_loadmap'], q = W.rsImageHeldSql(ids, ['bsdept:TEST_ONLY_B:bassam_plan_v1']);
  const bind = Object.fromEntries(q.args.map((v, i) => [String(i + 1), v]));
  for (let i = 0; i < 3; i++) { const a = performance.now(); DB.db.prepare(q.sql).get(bind); results.push({ name: 'rsImageHeldSql scan (SQLite, in-process)', ms: Math.round(performance.now() - a), sqlKB: Math.round(q.sql.length / 1024) }); quiet(JSON.stringify(results[results.length - 1])); }
  const AK = 'bsdept:TEST_ONLY_B:bassam_plan_v1', st = [...W.kvPutStmts(lab.env, 'imgs', ids[0], 'data:image/png;base64,' + 'A'.repeat(3000000)), lab.env.DB.prepare("INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,'claim','',?2,'',?3)").bind(ids[0], su.uid, Date.now())];
  DB.limits = false; await lab.env.DB.batch(st); DB.limits = process.env.LIMITS !== '0';
  const pr = await read([AK]), plan = { floors: [{ sid: 'tsA', name: 'TEST_ONLY · موقع', iid: ids[0], zones: [], gates: [], marks: [], paths: [] }], months: {}, delMonths: {} };
  await save({ [AK]: JSON.stringify(plan) }, { [AK]: pr.j.base[AK] || 0 });
  await measure('save(logical) site with real-size map deleted (other dept)', async () => { const r = await read([AK]); return save({ [AK]: JSON.stringify({ ...plan, floors: [] }) }, { [AK]: r.j.base[AK] }); }, 1);
}
const summary = { mode: period ? 'periods' : 'legacy', cfg: C, seedMs, counts, results };
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(summary, null, 1));
await lab.close(); process.exit(0);
