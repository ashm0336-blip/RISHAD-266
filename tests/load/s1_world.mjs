/* V7 · 53 · عالمُ S1 (ملحق 53 (2) §أ.4) — TEST_ONLY، بياناتٌ مولَّدة في الذاكرة وحدها.
   إدارةٌ بـ500 موظف وسنتين: خطة PLAN_M شهراً (موقعان بمصلياتٍ وأبواب ومعالم ومسارات، مع احتياج وأولوية) · جدولٌ شهري STF_M شهراً (4 ورديات وراحات
   وإجازات واستئذان) · تقريرٌ يومي كلَّ يوم (الحضورُ بالوردية لكل الموظفين) · جولاتٌ كلَّ يوم بقراءات الصلوات · مهام.
   البذر بالمرمِّز نفسِه (ocConvert · ocPhysicalRows) مباشرةً إلى SQLite — لا عبر /api/save: الحفظُ الحيّ بالوثيقة كلها ينهار على هذا الحجم
   (وهذا وحده دليلُ الإخفاق قبل الإصلاح، §5.6). يعمل على العامل الحالي وعلى عاملٍ أقدم (KIVO_WORKER — المخطّط 12). */
import { startLab, LAB } from '../browser/local_server.mjs';
import { client } from '../unit/v7_d6_import_fx.mjs';

export const DEPT = 'TEST_ONLY_A';   /* فيها موظفُ المختبر (LAB.empA ⇐ TEST_ONLY_eA1) لـ«صفحتي» */
export const K = (r) => 'bsdept:' + DEPT + ':' + r;
export function cfg(env = process.env) {
  const n = (k, d) => (env[k] == null || env[k] === '' ? d : +env[k]);
  return { EMP: n('EMP', 500), PLAN_M: n('PLAN_M', 26), STF_M: n('STF_M', 24), DAYS: n('DAYS', 730), ZONES: n('ZONES', 12), TASKS: n('TASKS', 6) };
}
/* أشهرٌ تنتهي بالشهر الجاري (نصُّ المفتاح القائم 'y-m' غيرُ مبطَّن) */
export function monthsEnding(ym, count) {
  let [y, m] = ym.split('-').map(Number); const out = [];
  for (let i = 0; i < count; i++) { out.unshift(y + '-' + m); m--; if (m < 1) { m = 12; y--; } }
  return out;
}
export function build(c, curYm) {
  const months = monthsEnding(curYm, Math.max(c.PLAN_M, c.STF_M, Math.ceil(c.DAYS / 30)));
  const dayKeys = []; for (const ym of months.slice(-Math.ceil(c.DAYS / 30))) for (let d = 1; d <= 30 && dayKeys.length < c.DAYS; d++) dayKeys.push(ym + '-' + d);
  const eids = ['TEST_ONLY_eA1'].concat(Array.from({ length: c.EMP - 1 }, (_, i) => 'TEST_ONLY_e' + i)), shifts = ['TEST_ONLY-A', 'TEST_ONLY-B', 'TEST_ONLY-C', 'TEST_ONLY-D'];
  const employees = eids.map((eid, i) => ({ eid, name: 'TEST_ONLY · موظف ' + i, empno: String(9900000 + i), nid: i ? String(1900000000 + i) : LAB.empA, type: 'TEST_ONLY · رسمي', work: 'TEST_ONLY · مراقب', shift: shifts[i % 4] }));
  const staffing = {};
  for (const [mi, ym] of months.slice(-c.STF_M).entries()) {
    const [y, m] = ym.split('-').map(Number), b = {};
    eids.forEach((e, i) => { b[e] = { shift: shifts[(i + mi) % 4], rest: [['fri', 'sat', 'sun'][i % 3]], leaves: i % 17 ? {} : [{ fd: 3, fm: m, fy: y, td: 9, tm: m, ty: y, kind: 'annual' }], perm: i % 11 ? {} : [5, 12], cs: '', muk: false }; });
    staffing[ym] = b;
  }
  const zone = (s, z, extra) => ({ uid: 'tz' + s + 'x' + z, code: 'Z' + s + '-' + z, name: 'TEST_ONLY · مصلى ' + s + '-' + z, d: 'M' + z + ' 0 L' + (z + 10) + ' 0 L' + (z + 10) + ' 10 Z', cx: z, cy: s, area: 100 + z, needN: 2 + (z % 3), pri: z % 4, emp: [eids[(s * 40 + z * 3) % c.EMP], eids[(s * 40 + z * 3 + 1) % c.EMP]], ...(extra || {}) });
  const site = (s, extra) => ({ sid: 'ts' + s, name: 'TEST_ONLY · موقع ' + s, num: s + 1,
    zones: Array.from({ length: c.ZONES }, (_, z) => zone(s, z, extra && extra(z))),
    gates: Array.from({ length: 6 }, (_, g) => ({ uid: 'tg' + s + 'x' + g, id: 'G' + s + g, kind: 'gate', x: g * 10, y: 10, emp: [eids[(g * 7 + s) % c.EMP]] })),
    marks: Array.from({ length: 3 }, (_, g) => ({ uid: 'tm' + s + 'x' + g, id: 'M' + s + g, label: 'TEST_ONLY · معلم ' + g, emp: [] })),
    paths: Array.from({ length: 2 }, (_, g) => ({ uid: 'tp' + s + 'x' + g, id: 'P' + s + g, active: true })) });
  const PR = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'], liveMonths = months.slice(-Math.ceil(c.DAYS / 30));
  const shiftsOf = (k, n) => Object.fromEntries(shifts.map((sh, si) => [sh, { pulled: true, roster: eids.filter((_, i) => i % 4 === si).map((e, i) => ({ ekey: e, st: (i + n) % 23 ? 'pr' : 'ab', shift: sh })) }]));
  const row = (n, i) => ['TEST_ONLY · مهمة ' + n + '-' + i, '', 'normal', i % 3 ? 'pending' : 'done', 'normal', 'مضافة', null, ['T'], 'TEST_ONLY · موظف', 'TEST_ONLY · أداة', 60, null, null, 1790000000000, eids[(n + i) % c.EMP], 1790000000000 + n * 86400000, 1790000000000 + n * 86400000 + 3600000, null, null, null, null, null];
  /* الوثائقُ الكبيرة فتراتٍ تُولَّد عند الطلب (spec: head + periods()) — البذرُ يرمّزها دفعاتٍ فلا تُحمل سنتان في الذاكرة معاً */
  const specs = {
    bassam_plan_v1: { field: 'months', head: { floors: [site(0), site(1)], months: {}, delMonths: {} }, periods: function* () { for (const ym of months.slice(-c.PLAN_M)) yield [ym, { c: 1, d: [site(0), site(1)] }]; } },
    bassam_rounds_v1: { head: { __pMig: 2 }, periods: function* () {
      for (const ym of liveMonths) { yield ['m:' + ym, { ap: 0 }]; for (const k of dayKeys.filter((x) => x.startsWith(ym + '-'))) { const n = dayKeys.indexOf(k); yield [k, { t: 1790000000000 + n * 86400000, d: [0, 1].map((s) => site(s, (z) => ({ fst: z % 3 ? 'open' : 'closed', fAt: 1790000000000 + n * 86400000 + z, pc: Object.fromEntries(PR.map((p, pi) => [p, { n: 20 + ((n + z + pi) % 50), cap: 100 }])) }))) }]; } } } },
    bassam_dreport_v1: { head: { __ldcs: {} }, periods: function* () {
      for (const ym of liveMonths) { yield ['m:' + ym, { ap: 0 }]; for (const k of dayKeys.filter((x) => x.startsWith(ym + '-'))) { const n = dayKeys.indexOf(k); yield [k, { created: 1790000000000 + n * 86400000, shifts: shiftsOf(k, n) }]; } } } },
    bassam_tasks_v1: { head: {}, periods: function* () { for (const [n, k] of dayKeys.entries()) yield [k, Array.from({ length: c.TASKS }, (_, i) => row(n, i))]; } },
  };
  /* الوثيقةُ كاملةً (للعوالم الصغيرة والمقارنة) */
  const whole = (sp) => { const d = JSON.parse(JSON.stringify(sp.head)), box = sp.field ? d[sp.field] : d; for (const [p, v] of sp.periods()) box[p] = v; return d; };
  const docs = { bassam_employees_v1: employees, bassam_staffing_v3: staffing };
  Object.defineProperties(docs, Object.fromEntries(Object.keys(specs).map((r) => [r, { enumerable: true, get: () => whole(specs[r]) }])));
  return { months, dayKeys, eids, docs, specs };
}
/* البذرُ بصفوف المرمِّز نفسِه، في معاملةٍ واحدة لكل مورد (SQLite مباشرةً) */
export function seed(lab, docs, specs = {}, dept = DEPT) {
  const K = (r) => 'bsdept:' + dept + ':' + r, DEPT_ = dept;
  const { W, env } = lab, db = env.DB.db, stmts = {}, counts = {};
  const ins = (table, cols) => stmts[table] || (stmts[table] = db.prepare('INSERT INTO ' + table + '(' + cols.map((c) => '"' + c + '"').join(',') + ') VALUES(' + cols.map(() => '?').join(',') + ')'));
  const put = (info, tables, phys, keep, shift) => {
    let n = 0;
    for (const t of ['ops_nodes'].concat(Object.keys(tables).filter((x) => x !== 'ops_nodes'))) {
      const cols = tables[t], st = ins(t, cols);
      for (const r of phys[t] || []) {
        if (!keep(r.row_key)) continue;
        const v = cols.map((c) => (c === 'position' && shift && r.parent_key === shift.parent ? r[c] + shift.by : r[c] === undefined ? null : typeof r[c] === 'boolean' ? (r[c] ? 1 : 0) : r[c]));
        st.run(...v); n++;
      }
    }
    return n;
  };
  for (const res of Object.keys(docs).filter((r) => !specs[r]).concat(Object.keys(specs))) {
    const info = W.opInfo(K(res)), tables = W.ocPhysicalTables(info.prepared), sp = specs[res];
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE ops_nodes SET parent_key=NULL WHERE department_id=? AND resource=?').run(DEPT_, res);
      for (const t of Object.keys(tables).reverse()) db.prepare('DELETE FROM ' + t + ' WHERE department_id=? AND resource=?').run(DEPT_, res);
      let n = 0, json = 0;
      if (!sp) { const doc = docs[res], dom = W.ocConvert(info.prepared, DEPT_, res, doc, true); n = put(info, tables, W.ocPhysicalRows(info.prepared, dom), () => true); json = JSON.stringify(doc).length; }
      else {
        /* الرأسُ أولاً، ثم الفتراتُ دفعاتٍ: صفوفُ الدفعة تحت الحاوية وحدها، ومواضعُ أعضائها بعد ما كُتب */
        const C = sp.field ? '$/f:' + encodeURIComponent(sp.field) : '$', E = C + '/e:', h = sp.field ? 0 : Object.keys(sp.head).length;
        const head = W.ocConvert(info.prepared, DEPT_, res, sp.head, true); n += put(info, tables, W.ocPhysicalRows(info.prepared, head), () => true); json += JSON.stringify(sp.head).length;
        let chunk = [], written = 0;
        const flush = () => {
          if (!chunk.length) return;
          const doc = JSON.parse(JSON.stringify(sp.head)), box = sp.field ? doc[sp.field] : doc; chunk.forEach(([p, v]) => { box[p] = v; json += JSON.stringify(v).length; });
          const dom = W.ocConvert(info.prepared, DEPT_, res, doc, true);
          n += put(info, tables, W.ocPhysicalRows(info.prepared, dom), (rk) => rk.startsWith(E), { parent: C, by: written });
          written += chunk.length; chunk = [];
        };
        for (const pv of sp.periods()) { chunk.push(pv); if (chunk.length >= 20) flush(); }
        flush();
      }
      db.prepare("INSERT INTO revs(k,rev) VALUES(?,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1").run(K(res));
      db.exec('COMMIT'); counts[res] = { rows: n, jsonKB: Math.round(json / 1024) };
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  db.prepare("INSERT INTO meta(k,v) VALUES('rev',(SELECT CAST(MAX(rev)+1 AS TEXT) FROM revs)) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run();
  return counts;
}
export async function open() {
  const lab = await startLab();
  lab.env.KIVO_TEST_FIXTURE = 'allow';
  const C = client(lab), su = await C.login(LAB.superUn, LAB.superPw);
  su.uid = su.uid || lab.env.DB.q('SELECT uid FROM sess LIMIT 1')[0].uid;
  const emp = await C.login(LAB.empA, LAB.pw);
  return { lab, ...C, su, emp };
}
