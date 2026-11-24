/* V7 · 53 تقويم · قياسُ خطة 0014 العلائقية عند التهيئة على عالمٍ علائقيٍّ 1000 موظف × 5 سنوات (REVIEW 29) — TEST_ONLY، قياسٌ لا تأكيد.
   القاعدةُ بالمخطط 13 يبنيها العاملُ السابق (KIVO_OLD_WORKER) ثم تُملأ جداولُها مباشرةً بصفوفٍ هجرية، ثم أولُ طلبٍ بالعامل الحالي بالتصريح:
   الزمن · عددُ العبارات في الدفعة · أكبرُ استدعاء D1 (سقوف D1 في D1Shim) · وصحةُ عيّنة. */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { D1Shim, WORKER, allowTestSchemaUpgrade } from '../unit/harness.mjs';
const N = +(process.env.EMP || 1000), YEARS = +(process.env.YEARS || 5);
const load = async (src) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calrel_')), 'w.mjs'); fs.writeFileSync(f, src); return import(pathToFileURL(f).href); };
const OLD = await load(fs.readFileSync(process.env.KIVO_OLD_WORKER, 'utf8')), E = { DB: new D1Shim(), ASSETS: { fetch: async () => new Response('x') } };
await OLD.default.fetch(new Request('http://x/api/ping'), E);
const db = E.DB.db, H0 = 1444, depts = Array.from({ length: Math.max(1, Math.round(N / 100)) }, (_, i) => 'TEST_ONLY_rel' + i);
db.exec('BEGIN');
const ir = db.prepare('INSERT INTO irshad_reports(department_id,report_id,sequence,hijri_year,hijri_month,hijri_day,presence_mask,languages_null) VALUES(?,?,?,?,?,?,0,0)');
const sz = db.prepare('INSERT INTO seized_reports(department_id,sequence,report_id,hijri_year,hijri_month,hijri_day,presence_mask,items_kind) VALUES(?,?,?,?,?,?,0,0)');
const aw = db.prepare('INSERT INTO award_records(department_id,record_id,sequence,hijri_date,presence_mask,case_text_kind,answers_kind,scores_kind) VALUES(?,?,?,?,0,0,0,0)');
const ds = db.prepare("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES(?,?,1,1)");
let seq = 0, n = { ir: 0, sz: 0, aw: 0, ds: 0, cu: 0, win: 0, ml: 0 };
const days = []; for (let y = H0; y < H0 + YEARS; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 29; d++) days.push([y, m, d]);
/* الاسترشاد: 1000 موظف ⇒ ≈ 0.1 تقرير لكل موظف يومياً · المضبوطات ≈ ربعها · الجائزة ≈ موظفٌ في الشهر لكل إدارة */
for (const [i, [y, m, d]] of days.entries()) {
  for (let k = 0; k < N / 10; k++) { const dep = depts[k % depts.length]; ir.run(dep, 'r' + (++seq), seq, y, m, d); n.ir++; if (k % 4 === 0) { sz.run(dep, seq, 's' + seq, y, m, d); n.sz++; } }
  for (const site of ['haram', 'nabawi']) { ds.run(site, y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')); n.ds++; }
  if (d === 1) depts.forEach((dep, j) => { aw.run(dep, 'a' + i + '_' + j, ++seq, y + '-' + String(m).padStart(2, '0') + '-05'); n.aw++; });
}
depts.forEach((dep) => { db.prepare("INSERT INTO custody_items VALUES(?,'TEST_ONLY_i','TEST_ONLY',1,NULL,NULL,0)").run(dep); db.prepare("INSERT INTO custody_issues(department_id,issue_id,item_id,serial,serial_number) VALUES(?,'TEST_ONLY_s','TEST_ONLY_i','',0)").run(dep); });
const cm = db.prepare("INSERT INTO custody_movements(department_id,move_id,issue_id,item_id,sequence,kind,holder_key,hijri_year,hijri_month,hijri_day,presence_mask) VALUES(?,?,'TEST_ONLY_s','TEST_ONLY_i',?,'out','h',?,?,?,0)");
for (let k = 0; k < N * 4; k++) { const [y, m, d] = days[(k * 7) % days.length]; cm.run(depts[k % depts.length], 'm' + k, ++seq, y, m, k % 9 ? d : 0); n.cu++; }
for (let y = H0; y < H0 + YEARS; y++) for (let m = 1; m <= 12; m++) for (const site of ['haram', 'nabawi']) { db.prepare('INSERT INTO daily_stats_month_locks VALUES(?,?,?,?,?,0)').run(site, y, m, m % 3 ? 1 : 0, m % 3 ? 0 : 1); n.ml++; if (!(m % 3)) db.prepare('INSERT INTO daily_stats_day_locks VALUES(?,?,?,?,1,0)').run(site, y, m, 5); }
db.exec('COMMIT');
allowTestSchemaUpgrade(E.DB);
const NEW = await load(fs.readFileSync(WORKER, 'utf8'));
E.DB.limits = true; E.DB.peak = 0; const before = E.DB.log.length, t0 = performance.now();
const r = await NEW.default.fetch(new Request('http://x/api/ping'), E);
const ms = Math.round(performance.now() - t0), stmts = E.DB.log.length - before;
const sample = E.DB.q('SELECT greg_year y,greg_month m,greg_day d FROM irshad_reports ORDER BY sequence LIMIT 1')[0];
console.log(JSON.stringify({ rows: n, status: r.status, schema: E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, ms, statements: stmts, peakMB: +(E.DB.peak / 1048576).toFixed(2), sample: { ...sample }, hijriLeft: E.DB.q('SELECT COUNT(*) n FROM irshad_reports WHERE greg_year<1700')[0].n }));
process.exit(0);
