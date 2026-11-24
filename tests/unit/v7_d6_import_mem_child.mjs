/* V7 · د6 — عمليةٌ ابنةٌ لقياس ذاكرة الاستيراد (يشغّلها v7_d6_import_mem.test.mjs بسقف كومةٍ صلب: node --max-old-space-size=…).
   فيها العاملُ المبنيّ وحده خلف خادمٍ محلي (المختبر) — النسخةُ تُولَّد في العملية الأم وتصل هنا طلباتٍ كما تصل العاملَ الحقيقي، فلا يدخل في كومة هذه العملية
   إلا ما يدخل كومةَ العامل: الوحدةُ نفسُها، وأجسامُ الطلبات، وما يقرؤه من القاعدة وما يبنيه. (القاعدةُ SQLite في الذاكرة الأصلية خارج كومة V8 — كما أن D1 خارج العامل.)
   العيّنات: عند كل نداء قاعدة (prepare · batch) وكل 5 مث: heapUsed و external (وفيها arrayBuffers) — وأقصاها يُعاد برسالة. */
import v8 from 'node:v8';
import { startLab, LAB } from '../browser/local_server.mjs';

const lab = await startLab(), DB = lab.env.DB;
if (process.env.D6_NO_R2 === '1') lab.env.IMG_R2 = null;
let peak = { heap: 0, external: 0, total: 0, at: '' }, on = false, label = '';
const sample = (at) => { if (!on) return; const m = process.memoryUsage(), total = m.heapUsed + m.external; if (m.heapUsed > peak.heap) peak.heap = m.heapUsed; if (m.external > peak.external) peak.external = m.external; if (total > peak.total) { peak.total = total; peak.at = label + ':' + at; } };
const prepare = DB.prepare.bind(DB), batch = DB.batch.bind(DB);
DB.prepare = (sql) => { sample('prepare'); return prepare(sql); };
DB.batch = (st) => { sample('batch ' + st.length); return batch(st).then((r) => { sample('batch done'); return r; }); };
setInterval(() => sample('tick'), 5).unref();
process.on('message', (m) => {
  if (m.op === 'reset') { globalThis.gc && globalThis.gc(); const u = process.memoryUsage(); label = m.label || ''; peak = { heap: 0, external: 0, total: 0, at: '' }; on = true; process.send({ op: 'reset', base: u.heapUsed, external: u.external }); }
  else if (m.op === 'report') { on = false; process.send({ op: 'report', peak, limit: v8.getHeapStatistics().heap_size_limit, staged: DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id>='stage:' AND snapshot_id<'stage;'")[0].n, q: DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id>='stage:' AND snapshot_id<'stage;' AND domain='q'")[0].n, i: DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id>='stage:' AND snapshot_id<'stage;' AND domain='i'")[0].n, nodes: DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE resource GLOB 'bassam_rounds*'")[0].n, planNodes: DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE resource='bassam_plan_v1'")[0].n, pre: DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE domain='operations-sql'")[0].n, audits: DB.q("SELECT COUNT(*) n FROM aud WHERE k='atomic_restore'")[0].n, images: DB.q('SELECT COUNT(DISTINCT k) n FROM imgs')[0].n, rounds: DB.q("SELECT COUNT(*) n FROM ops_round_day")[0].n }); }
  else if (m.op === 'sql') process.send({ op: 'sql', rows: DB.q(m.sql) });   /* V7 · د7: السجلاتُ العامة للنسخة الشاملة (v7_d7_fullcopy_mem) */
  else if (m.op === 'exit') lab.close().then(() => process.exit(0));
});
process.send({ op: 'ready', base: lab.base, un: LAB.superUn, pw: LAB.superPw });
