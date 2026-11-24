/* V7 · 53 تقويم · الترحيل 0014 (التقويمُ الميلادي) على قاعدةٍ بالمخطط 13 يبنيها العاملُ السابق نفسُه (قاعدةُ فرع التقويم) بطريق كتابته الحقيقية (/api/save)،
   ببياناتٍ اصطناعية TEST_ONLY بشكلين: وثائقُ العرض كما يصدّرها Preview (legacyDocs) · وعالمُ إدارةٍ بشكل الإنتاج (s1_world)، ومعها صفوفٌ علائقية
   (الإحصائيات وأقفالُها · العهدةُ بيوم 0 · الاسترشاد ونوافذُه السارية والمنتهية · المضبوطات · الجائزة · dedup حديث · الرصد في KV).
   الأوراكل مستقلٌّ عن الكود: التقويمُ من Intl (أم القرى) هنا، وقاعدةُ القفل نسخةٌ من 010 lockedIn — يوماً يوماً، قبل الترحيل وبعده.
   ① بلا تصريح: يرفض ولا يكتب · ⑥ فشلُ الدفعة: لا أثر · ② بالتصريح 13 ← 14: الأعمدةُ greg_* · الصفوفُ صفّاً بصف · foreign_key_check فارغ · القائمةُ المعلَّقة
   ③ الإدارةُ المعلَّقة: الكتابةُ والقراءةُ 503 calendar-pending برسالة · ④ المرحلةُ ٢ (على أجزاءٍ تُستأنف): لا يُسقط يوم ولا يتغيّر قفلُ يوم · الإعادةُ لا تغيّر شيئاً ·
   ⑤ الرجوع: نقطةُ الاسترجاع + الحزمةُ السابقة ⇒ كلُّ شيءٍ كما كان. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { D1Shim, ROOT, WORKER, CURRENT_SCHEMA, allowTestSchemaUpgrade, hasSystem } from './harness.mjs';
import { build } from '../load/s1_world.mjs';
import { legacyDocs } from './v7_d6_import_fx.mjs';
import { load, H2G, G2H, oracle } from './v7_cal_migrate_fx.mjs';

const OLD_REV = process.env.KIVO_UPGRADE14_REV || '5f1411e';
const D1 = 'tst_demo_d1', D2 = 'TEST_ONLY_c14_prod', G = 'TEST_ONLY_c14_group', SUPER = 'TEST_ONLY_c14_super', TOK = 'TEST_ONLY_c14_session';
let oldSource = null, why = '';
try { oldSource = execFileSync('git', ['-C', ROOT, 'show', OLD_REV + ':workers/_worker.js'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); }
catch (e) { why = 'يحتاج تاريخ git للمرجع ' + OLD_REV; }
const need = !oldSource ? { skip: why } : hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام والجدول والتقرير' };
let inst = 0;
const pad = (n) => String(n).padStart(2, '0');
function env(DB) { return { DB: DB || new D1Shim(), KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow', KIVO_TEST_HOST: 'x', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } }; }
function api(W, E) {
  return async (route, { method = 'GET', body } = {}) => {
    const headers = new Headers({ Cookie: 'bs_tok=' + TOK });
    if (method !== 'GET') { headers.set('Origin', 'http://x'); headers.set('Content-Type', 'application/json'); }
    const r = await W.default.fetch(new Request('http://x' + route, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), E);
    let json = null; try { json = await r.json(); } catch (e) { /* ليس JSON */ }
    return { status: r.status, json };
  };
}
const key = (d, r) => 'bsdept:' + d + ':' + r;
const CAL = ['bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_staffing_v3', 'bassam_plan_v1', 'bassam_tasks_locks_v1', 'bassam_staffing_locks_v1', 'bassam_dayshift_v1'];
const ALL = CAL.concat(['bassam_employees_v1', 'bassam_shift_options_v1']);
async function readAll(call, d, list = ALL) {
  const r = await call('/api/operations/read?' + new URLSearchParams({ uid: SUPER, keys: list.map((x) => key(d, x)).join(',') }));
  assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300));
  return r.json;
}
let rq = 0;
async function saveDoc(call, d, r, v) {
  const r0 = await call('/api/operations/read?' + new URLSearchParams({ uid: SUPER, keys: key(d, r) }));
  return call('/api/save', { method: 'POST', body: { uid: SUPER, requestId: 'TEST_ONLY_c14_' + ++rq, epoch: r0.json.epoch, base: r0.json.base, set: { [key(d, r)]: JSON.stringify(v) }, del: [] } });
}
/* مديرُ المنصة وجلستُه · ثم بياناتُ العرض يولّدها العاملُ السابق نفسُه (/api/demo-data — نسخةُ Preview بأنظمتها كلِّها وصفوفِها العلائقية) · ثم إدارةُ الإنتاج */
function seedSuper(E) {
  E.DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?) ON CONFLICT DO NOTHING').run('bassam_auth_users_v1', JSON.stringify([{ id: SUPER, un: '1000000978', name: 'TEST_ONLY مدير المنصة', role: 'super', ph: 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64), mc: 0, dis: 0 }]));
  E.DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  E.DB.db.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?,?,?,?,?,?)').run(TOK, SUPER, Date.now(), Date.now(), 'TEST_ONLY', 'TEST_ONLY');
}
function addProdDept(E) {
  const caps = ['plan', 'daily', 'dreport', 'tasks', 'staff', 'emps', 'admin'], get = (k, d) => { const r = E.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : d; };
  const put = (k, v) => { E.DB.db.prepare('DELETE FROM kv WHERE k=?').run(k); E.DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?)').run(k, JSON.stringify(v)); E.DB.db.prepare('INSERT INTO revs(k,rev) VALUES(?,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').run(k); };
  put('bassam_gdepts_v1', get('bassam_gdepts_v1', []).concat([{ id: G, name: 'TEST_ONLY إدارة عامة', kind: 'إدارة عامة' }]));
  put('bassam_depts_v1', get('bassam_depts_v1', []).concat([{ id: D2, name: 'TEST_ONLY إدارة بشكل الإنتاج', gid: G }]));
  const pm = get('bassam_perms_v1', {}); pm.caps = { ...(pm.caps || {}), [G]: caps, [D2]: caps }; pm.emps = { ...(pm.emps || {}), [D2]: {} }; put('bassam_perms_v1', pm);
}
function snapshot(DB) { const f = path.join(os.tmpdir(), 'kivo_c14_bookmark_' + process.pid + '_' + ++inst + '.db'); DB.db.exec("VACUUM INTO '" + f + "'"); return f; }
function restore(file) { const S = new D1Shim(); S.db = new DatabaseSync(file); return S; }

/* بياناتُ العرض كما يولّدها ويصدّرها العاملُ السابق (Preview) — legacyDocs بالحزمة السابقة (الحاليةُ تكتب greg_* قبل أن تنتقل أنظمتُها) */
async function oldDemo() {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_c14w_')), 'old_worker.js'), was = process.env.KIVO_WORKER;
  fs.writeFileSync(f, oldSource); process.env.KIVO_WORKER = f;
  try { return await legacyDocs(); } finally { if (was === undefined) delete process.env.KIVO_WORKER; else process.env.KIVO_WORKER = was; fs.rmSync(path.dirname(f), { recursive: true, force: true }); }
}
/* صفوفُ الجداول العلائقية التقويمية بمعرّفها و(y,m,d) — التاريخُ النصّي يُفكّ أجزاءً */
function relRows(DB, p) {
  const spec = { custody_movements: 'move_id', irshad_reports: 'report_id', seized_reports: 'report_id', irshad_retro_windows: 'window_id', seized_retro_windows: 'window_id', award_records: 'record_id', daily_stats_days: "site||'|'||" + p + 'date' };
  const out = {};
  for (const [t, id] of Object.entries(spec)) {
    out[t] = /date$/.test(id) || t === 'award_records'
      ? DB.q('SELECT ' + (t === 'award_records' ? 'department_id||record_id' : id) + ' id,' + p + 'date x FROM ' + t).map((r) => { const q = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(r.x || ''); return { id: t === 'daily_stats_days' ? r.id.split('|')[0] + (q ? '' : r.x) : r.id, y: q ? +q[1] : null, m: q ? +q[2] : null, d: q ? +q[3] : null }; })
      : DB.q('SELECT department_id||' + id + ' id,' + p + 'year y,' + p + 'month m,' + p + 'day d FROM ' + t);
  }
  /* الإحصائيات: مفتاحُها التاريخُ نفسُه ⇒ يُطابَق بالترتيب الزمني داخل كل موقع */
  ['daily_stats_days'].forEach((t) => { const n = {}; out[t] = out[t].sort((a, b) => (a.id + (a.y * 1e4 + a.m * 100 + a.d)).localeCompare(b.id + (b.y * 1e4 + b.m * 100 + b.d))).map((r) => ({ ...r, id: r.id + '#' + (n[r.id] = (n[r.id] || 0) + 1) })); });
  return out;
}
const merged = (o, d) => ({ ...(o[key(d, 'bassam_rounds_arc_v1')] || {}), ...(o[key(d, 'bassam_rounds_v1')] || {}) });

test('53 تقويم · 0014 على قاعدةٍ بالمخطط 13 بناها العاملُ السابق: التصريح · المرحلة ١ صفّاً بصف · التعليق · المرحلة ٢ يوماً يوماً · الإعادة · الرجوع', { ...need, timeout: 1800000 }, async () => {
  const OLD = await load(oldSource, 'old'), E = env(), call0 = api(OLD, E);
  assert.equal((await call0('/api/ping')).status, 200);
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA - 1), 'العاملُ السابق بالمخطط 13');
  seedSuper(E);
  const sd = await call0('/api/demo-data', { method: 'POST', body: { act: 'seed' } });
  assert.equal(sd.status, 200, 'بياناتُ العرض ' + JSON.stringify(sd.json).slice(0, 200));
  addProdDept(E);
  const demo = Object.fromEntries(Object.entries((await readAll(call0, D1)).resources).filter(([, v]) => v != null).map(([k, v]) => [k.split(':').pop(), v])), cur = (await call0('/api/me?uid=' + SUPER)).json?.day?.ym || '1448-6';
  const [cy, cm] = cur.split('-').map(Number), prev = cm > 1 ? cy + '-' + (cm - 1) : (cy - 1) + '-12', prev2 = cm > 2 ? cy + '-' + (cm - 2) : (cy - 1) + '-' + (cm + 10);
  const world = build({ EMP: 24, PLAN_M: 3, STF_M: 3, DAYS: 75, ZONES: 3, TASKS: 2 }, cur).docs;
  /* علاماتٌ بكل حالات ق3: شهرٌ معتمد · ماضٍ مفتوحٌ للاستدراك بيومٍ مفتوح · جارٍ بيومٍ مغلقٍ يدوياً وآخرَ مفتوح */
  const rounds = { ...demo.bassam_rounds_v1, ['m:' + prev2]: { ap: 1, auto: 1 }, ['m:' + prev]: { mo: 1, dopen: { 3: 1, 17: 1 } }, ['m:' + cur]: { dshut: { 25: 1 } } };
  const st = demo.bassam_staffing_v3, sm = Object.keys(st)[0], [sy, smm] = sm.split('-').map(Number), sn = smm < 12 ? sy + '-' + (smm + 1) : (sy + 1) + '-1';
  const emp0 = Object.keys(st[sm]).find((k) => k.indexOf('__') !== 0);
  const staffing = { ...st, [sn]: { ...JSON.parse(JSON.stringify(st[sm])), [emp0]: { ...st[sm][emp0], shift: 'TEST_ONLY_وردية_أخرى' } } };
  const setD1 = { bassam_plan_v1: demo.bassam_plan_v1, bassam_rounds_v1: rounds, bassam_dreport_v1: { ...demo.bassam_dreport_v1, ['m:' + prev]: { ap: 1 } }, bassam_staffing_v3: staffing,
    bassam_employees_v1: demo.bassam_employees_v1, bassam_shift_options_v1: demo.bassam_shift_options_v1,
    bassam_staffing_locks_v1: { [sm]: true, [sn]: true }, bassam_tasks_locks_v1: { [prev]: true, [cur]: { mo: 1 } }, bassam_dayshift_v1: { [cur + '-2']: 'TEST_ONLY صباحية' } };
  for (const [d, docs] of [[D1, setD1], [D2, world]]) for (const r of ['bassam_employees_v1', 'bassam_shift_options_v1'].concat(CAL)) {
    if (docs[r] === undefined || r === 'bassam_tasks_v1' || r === 'bassam_rounds_arc_v1') continue;
    const s = await saveDoc(call0, d, r, docs[r]);
    assert.equal(s.status, 200, d + ' ' + r + ': ' + JSON.stringify(s.json).slice(0, 300));
  }
  /* الصفوفُ العلائقية (المخطط 13: hijri_*) — اصطناعية */
  const H = (y, m, d) => [y, m, d];
  E.DB.exec("INSERT INTO custody_items VALUES('" + D1 + "','TEST_ONLY_i1','TEST_ONLY عهدة c14',3,NULL,NULL,0); INSERT INTO custody_issues(department_id,issue_id,item_id,serial,serial_number) VALUES('" + D1 + "','TEST_ONLY_s1','TEST_ONLY_i1','',0)");
  const cus = [[9001, ...H(cy, cm, 0)], [9002, ...H(cy, cm, 14)], [9003, ...H(prev2.split('-').map(Number)[0], +prev2.split('-')[1], 30)]];
  cus.forEach(([q, y, m, d]) => E.DB.db.prepare("INSERT INTO custody_movements(department_id,move_id,issue_id,item_id,sequence,kind,holder_key,hijri_year,hijri_month,hijri_day,presence_mask) VALUES(?,?,?,?,?,'out','TEST_ONLY_h',?,?,?,0)").run(D1, 'TEST_ONLY_m' + q, 'TEST_ONLY_s1', 'TEST_ONLY_i1', q, y, m, H2G.has(y + '-' + m + '-' + d) || d === 0 ? d : 29));
  E.DB.db.prepare('INSERT INTO irshad_reports(department_id,report_id,sequence,hijri_year,hijri_month,hijri_day,presence_mask,languages_null) VALUES(?,?,?,?,?,?,0,0)').run(D1, 'TEST_ONLY_r1', 9001, cy, cm, 14);
  E.DB.db.prepare('INSERT INTO seized_reports(department_id,sequence,report_id,hijri_year,hijri_month,hijri_day,presence_mask,items_kind) VALUES(?,?,?,?,?,?,0,0)').run(D1, 9001, 'TEST_ONLY_z1', cy, cm, 1);
  E.DB.db.prepare('INSERT INTO award_records(department_id,record_id,sequence,hijri_date,presence_mask,case_text_kind,answers_kind,scores_kind) VALUES(?,?,?,?,0,0,0,0)').run(D1, 'TEST_ONLY_a1', 9001, cy + '-' + pad(cm) + '-05');
  E.DB.db.prepare("INSERT OR REPLACE INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES('nabawi',?,1,1234)").run(cy + '-' + pad(cm) + '-02');
  E.DB.db.prepare("INSERT OR REPLACE INTO daily_stats_month_locks VALUES('nabawi',?,?,0,1,0)").run(+prev.split('-')[0], +prev.split('-')[1]);
  E.DB.db.prepare("INSERT OR REPLACE INTO daily_stats_day_locks VALUES('nabawi',?,?,4,1,0)").run(+prev.split('-')[0], +prev.split('-')[1]);
  E.DB.db.prepare("INSERT OR REPLACE INTO daily_stats_month_locks VALUES('nabawi',?,?,1,0,1)").run(+prev2.split('-')[0], +prev2.split('-')[1]);
  const now = Date.now(), win = (id, q, y, m, d, until, closed) => E.DB.db.prepare('INSERT INTO irshad_retro_windows(department_id,window_id,sequence,hijri_year,hijri_month,hijri_day,scope_mask,until_at,closed_at,presence_mask,by_kind,by_mask,closed_by_kind,closed_by_mask) VALUES(?,?,?,?,?,?,0,?,?,0,0,0,0,0)').run(D1, id, q, y, m, d, until, closed);
  win('TEST_ONLY_w_live', 9001, cy, cm, null, now + 36e5, null); win('TEST_ONLY_w_old', 9002, cy, cm, null, now - 36e5, null); win('TEST_ONLY_w_day', 9003, cy, cm, 9, now + 36e5, null);
  const today = G2H.get(new Date(now).toISOString().slice(0, 10));
  E.DB.db.prepare('INSERT INTO notification_dedup(scope,once_key,created_at,message_id) VALUES(?,?,?,NULL)').run('d:' + D1, 'ir_day:' + today, now - 6e5);
  E.DB.db.prepare('INSERT INTO notification_dedup(scope,once_key,created_at,message_id) VALUES(?,?,?,NULL)').run('d:' + D1, 'rep_late:' + today + ':TEST_ONLY_sh', now - 6e5);
  E.DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?)').run(key(D1, 'bassam_rasd_v1'), JSON.stringify({ reports: [{ id: 'TEST_ONLY_rs1', y: cy, m: cm, d: 7 }] }));
  const relBefore = { cus: E.DB.q('SELECT move_id,hijri_year y,hijri_month m,hijri_day d FROM custody_movements ORDER BY move_id') }, REL = relRows(E.DB, 'hijri_');
  assert.ok(REL.irshad_reports.length > 10 && REL.custody_movements.length > 4 && REL.daily_stats_days.length > 5 && REL.seized_reports.length > 5 && REL.award_records.length > 4, 'صفوفُ العرض العلائقية: ' + Object.entries(REL).map(([k, v]) => k + ' ' + v.length).join(' · '));
  const before = { [D1]: (await readAll(call0, D1)).resources, [D2]: (await readAll(call0, D2)).resources };
  /* ① بلا تصريح: يرفض ولا يكتب */
  const NEWSRC = fs.readFileSync(WORKER, 'utf8'), NEW = await load(NEWSRC, 'new');
  assert.ok((await api(NEW, E)('/api/ping')).status >= 500, 'بلا تصريح لا ترقية');
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA - 1));
  const bookmark = snapshot(E.DB);
  /* ⑥ فشلُ الدفعة الذرّية: لا عمودَ أُعيدت تسميتُه ولا جدولَ مطابقةٍ ولا تعليق */
  allowTestSchemaUpgrade(E.DB);
  E.DB.failIf = (sql) => /cal_ops_pending/.test(sql) && /^INSERT/.test(sql);
  assert.ok((await api(await load(NEWSRC, 'new'), E)('/api/ping')).status >= 500);
  E.DB.failIf = null;
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA - 1));
  assert.equal(E.DB.q("SELECT COUNT(*) n FROM sqlite_master WHERE name='cal_hg_days'")[0].n, 0);
  assert.ok(E.DB.q('PRAGMA table_info(custody_movements)').some((c) => c.name === 'hijri_day'));
  /* ② بالتصريح: 13 ← 14 في أول طلب */
  const permit = JSON.parse(allowTestSchemaUpgrade(E.DB));
  assert.deepEqual(permit.migrations, ['0014_gregorian_calendar']);
  const call = api(await load(NEWSRC, 'new'), E);
  assert.equal((await call('/api/ping')).status, 200);
  assert.equal(E.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA));
  assert.equal(E.DB.q('SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1')[0].name, '0014_gregorian_calendar');
  assert.equal(E.DB.q("SELECT COUNT(*) n FROM meta WHERE k='schema_upgrade_permit_v1'")[0].n, 0, 'التصريحُ استُهلك');
  assert.deepEqual(JSON.parse(E.DB.q("SELECT v FROM meta WHERE k='cal_ops_pending'")[0].v), E.DB.q("SELECT DISTINCT department_id d FROM ops_nodes WHERE resource IN (SELECT value FROM json_each(?1)) ORDER BY d", JSON.stringify(CAL.concat(['bassam_tasks_v1', 'bassam_staffing_v2', 'bassam_dayfocus_v1']))).map((r) => r.d));
  assert.ok(JSON.parse(E.DB.q("SELECT v FROM meta WHERE k='cal_ops_pending'")[0].v).includes(D1) && JSON.parse(E.DB.q("SELECT v FROM meta WHERE k='cal_ops_pending'")[0].v).includes(D2));
  assert.deepEqual(E.DB.q('PRAGMA foreign_key_check'), []);
  for (const t of ['custody_movements', 'irshad_reports', 'seized_reports', 'irshad_retro_windows', 'seized_retro_windows', 'daily_stats_day_locks']) {
    const cols = E.DB.q('PRAGMA table_info(' + t + ')').map((c) => c.name);
    assert.ok(cols.includes('greg_year') && !cols.some((c) => /^hijri_/.test(c)), t + ': greg_* ولا hijri_*');
  }
  assert.ok(E.DB.q('PRAGMA index_list(custody_movements)').some((i) => i.name === 'custody_move_timeline'), 'أسماءُ الفهارس كما هي');
  const T = E.DB.q("SELECT v FROM meta WHERE k='cal_mig_t'")[0].v, gOf = (y, m, d) => H2G.get(y + '-' + m + '-' + d);
  /* كلُّ صفٍّ علائقيٍّ صفّاً بصف: عددُه محفوظ · كلُّ يومٍ هجريٍّ ⇐ يومُه الميلادي بأوراكل Intl (يومُ 0/المجهول في شهر اليوم الأول) · أقفالُ الإحصائيات تُفحص يوماً يوماً أدناه */
  const RELA = relRows(E.DB, 'greg_');
  for (const t of Object.keys(REL)) {
    if (t === 'daily_stats_month_locks' || t === 'daily_stats_day_locks') continue;
    const extra = t.endsWith('retro_windows') ? RELA[t].filter((r) => /~g\d$/.test(r.id)).length : 0;
    assert.equal(RELA[t].length - extra, REL[t].length, t + ': عددُ الصفوف');
    const byId = Object.fromEntries(RELA[t].map((r) => [r.id, r]));
    for (const r of REL[t]) {
      const a = byId[r.id]; assert.ok(a, t + ' ' + r.id);
      if (r.y == null) { assert.equal(a.y, null); continue; }
      const g = H2G.get(r.y + '-' + r.m + '-' + (r.d == null || +r.d === 0 ? 1 : r.d)); assert.ok(g, t + ' ' + r.id + ' يومٌ معروف');
      assert.deepEqual([+a.y, +a.m, a.d == null ? null : +a.d], [+g.slice(0, 4), +g.slice(5, 7), r.d == null ? null : +r.d === 0 ? 0 : +g.slice(8)], t + ' ' + r.id);
    }
  }
  /* العهدة: كلُّ حركةٍ بيومها الميلادي، ويومُ 0 يبقى 0 في شهر اليوم الأول (ق10) — صفّاً بصف */
  const cusAfter = E.DB.q('SELECT move_id,greg_year y,greg_month m,greg_day d FROM custody_movements ORDER BY move_id');
  assert.equal(cusAfter.length, relBefore.cus.length);
  relBefore.cus.forEach((r, i) => { const g = gOf(r.y, r.m, Math.max(1, r.d)); assert.deepEqual([cusAfter[i].y, cusAfter[i].m, cusAfter[i].d], [+g.slice(0, 4), +g.slice(5, 7), r.d === 0 ? 0 : +g.slice(8)], 'العهدة ' + r.move_id); });
  const g14 = gOf(cy, cm, 14);
  assert.deepEqual({ ...E.DB.q("SELECT greg_year y,greg_month m,greg_day d FROM irshad_reports WHERE report_id='TEST_ONLY_r1'")[0] }, { y: +g14.slice(0, 4), m: +g14.slice(5, 7), d: +g14.slice(8) });
  assert.equal(E.DB.q("SELECT greg_date g FROM award_records WHERE record_id='TEST_ONLY_a1'")[0].g, gOf(cy, cm, 5));
  assert.ok(E.DB.q("SELECT greg_date g FROM daily_stats_days WHERE site='nabawi'").some((r) => r.g === gOf(cy, cm, 2)));
  /* نوافذُ الاستدراك (ق7): الساريةُ الشهرية في الشهرين · المنتهيةُ في شهر يومها الأول · نافذةُ اليوم بيومها */
  const w = Object.fromEntries(E.DB.q('SELECT window_id i,greg_year y,greg_month m,greg_day d FROM irshad_retro_windows').map((r) => [r.i, [r.y, r.m, r.d]]));
  const g1 = gOf(cy, cm, 1), gl = gOf(cy, cm, 29), g9 = gOf(cy, cm, 9);
  assert.deepEqual(w.TEST_ONLY_w_live, [+g1.slice(0, 4), +g1.slice(5, 7), null]);
  assert.deepEqual(w['TEST_ONLY_w_live~g2'], [+gl.slice(0, 4), +gl.slice(5, 7), null], 'النافذةُ السارية مكرّرةٌ في الشهر الثاني بالمهلة نفسِها');
  assert.equal(E.DB.q("SELECT until_at u FROM irshad_retro_windows WHERE window_id='TEST_ONLY_w_live~g2'")[0].u, E.DB.q("SELECT until_at u FROM irshad_retro_windows WHERE window_id='TEST_ONLY_w_live'")[0].u);
  assert.deepEqual(w.TEST_ONLY_w_old, [+g1.slice(0, 4), +g1.slice(5, 7), null]); assert.equal(w['TEST_ONLY_w_old~g2'], undefined, 'المنتهيةُ لا تُكرَّر');
  assert.deepEqual(w.TEST_ONLY_w_day, [+g9.slice(0, 4), +g9.slice(5, 7), +g9.slice(8)]);
  /* أقفالُ الإحصائيات: يوماً يوماً كما كانت (ق3) */
  const ml = E.DB.q('SELECT greg_year y,greg_month m,approved a,reopened r FROM daily_stats_month_locks'), dl = E.DB.q('SELECT greg_year y,greg_month m,greg_day d,is_open o,is_shut s FROM daily_stats_day_locks');
  const recG = {}; ml.forEach((r) => { recG[r.y + '-' + pad(r.m)] = { ...(r.a ? { ap: 1 } : {}), ...(r.r ? { mo: 1 } : {}) }; });
  dl.forEach((r) => { const o = recG[r.y + '-' + pad(r.m)]; if (r.o) (o.dopen = o.dopen || {})[r.d] = 1; if (r.s) (o.dshut = o.dshut || {})[r.d] = 1; });
  const recH = { ['m:' + prev]: { mo: 1, dopen: { 4: 1 } }, ['m:' + prev2]: { ap: 1 } };
  oracle(recH, Object.fromEntries(Object.entries(recG).map(([k, v]) => ['m:' + k, v])), T, 'الإحصائيات');
  /* dedup: نسخةٌ ميلادية لمفاتيح اليوم (لا يتكرر تنبيهُ يوم الترحيل) · والأصلُ باق */
  const keysNow = E.DB.q('SELECT once_key k FROM notification_dedup ORDER BY k').map((r) => r.k), gToday = H2G.get(today);
  assert.ok(keysNow.includes('ir_day:' + gToday) && keysNow.includes('ir_day:' + today) && keysNow.includes('rep_late:' + gToday + ':TEST_ONLY_sh'), keysNow.join(' '));
  const rasd = JSON.parse(E.DB.q('SELECT v FROM kv WHERE k=?1', key(D1, 'bassam_rasd_v1'))[0].v), g7 = gOf(cy, cm, 7);
  assert.deepEqual([rasd.reports[0].y, rasd.reports[0].m, rasd.reports[0].d], [+g7.slice(0, 4), +g7.slice(5, 7), +g7.slice(8)]);
  /* ③ الإدارةُ المعلَّقة: كتابتُها وقراءتُها التقويميةُ مرفوضةٌ برسالةٍ واضحة · والحزمةُ السابقة لا تعمل على 14 */
  const e0 = (await call('/api/operations/read?' + new URLSearchParams({ uid: SUPER, keys: key(D2, 'bassam_employees_v1') }))).json, kd = key(D2, 'bassam_dayshift_v1');
  const refused = await call('/api/save', { method: 'POST', body: { uid: SUPER, requestId: 'TEST_ONLY_c14_pend', epoch: e0.epoch, base: { [kd]: (E.DB.q('SELECT rev FROM revs WHERE k=?1', kd)[0] || { rev: 0 }).rev }, set: { [kd]: JSON.stringify({ '2026-11-02': 'x' }) }, del: [] } });
  assert.equal(refused.status, 503, JSON.stringify(refused.json)); assert.match(JSON.stringify(refused.json), /calendar-pending/);
  const rd = await call('/api/operations/read?' + new URLSearchParams({ uid: SUPER, keys: key(D2, 'bassam_rounds_v1') }));
  assert.match(JSON.stringify(rd.json), /calendar-pending|جارٍ تحويل التقويم/, 'القراءةُ تقول «جارٍ تحويل التقويم»');
  assert.equal((await api(await load(oldSource, 'old'), E)('/api/ping')).status, 503, 'الحزمةُ السابقة لا تعمل على 14');
  /* ④ المرحلة ٢ — على أجزاءٍ صغيرة تُستأنف من حالتها (ميزانيةُ وقتٍ قصيرة) */
  let calls = 0, last = null;
  for (;;) {
    last = await call('/api/operations/calendar-migrate', { method: 'POST', body: { dept: 'all', budgetMs: 1000 } }); calls++;
    assert.equal(last.status, 200, JSON.stringify(last.json).slice(0, 600));
    if (!last.json.more) break;
    assert.ok(calls < 400, 'تتقدّم');
  }
  assert.equal(last.json.ok, 1, JSON.stringify(last.json).slice(0, 800));
  assert.deepEqual(last.json.pending, []);
  assert.ok(calls > 1, 'استُؤنفت المرحلةُ ٢ على أكثر من نداء (' + calls + ')');
  assert.deepEqual(E.DB.q('PRAGMA foreign_key_check'), []);
  const after = { [D1]: (await readAll(call, D1)).resources, [D2]: (await readAll(call, D2)).resources };
  let checked = 0;
  for (const d of [D1, D2]) {
    checked += oracle(merged(before, d), merged(after, d), T, d + ' الجولات');
    if (before[d][key(d, 'bassam_dreport_v1')]) checked += oracle(before[d][key(d, 'bassam_dreport_v1')], after[d][key(d, 'bassam_dreport_v1')], T, d + ' التقرير');
    /* كلُّ موردٍ حرفاً (بترتيب مفاتيحه) ما تكتبه الدالةُ الواحدة للوثيقة كلِّها — الطريقُ الذي يسلكه الاستيرادُ أيضاً */
    for (const r of CAL.filter((x) => x !== 'bassam_rounds_v1' && x !== 'bassam_rounds_arc_v1')) {
      const b = before[d][key(d, r)]; if (b == null) continue;
      assert.equal(JSON.stringify(after[d][key(d, r)]), JSON.stringify(NEW.calMigDoc(r, b, { T, rep: null })), d + ' ' + r);
    }
    const wantR = NEW.calMigDoc('bassam_rounds_v1', merged(before, d), { T, rep: null }), gotR = merged(after, d);
    assert.deepEqual(Object.keys(gotR).sort(), Object.keys(wantR).sort(), d + ' الجولات: المفاتيح'); for (const k of Object.keys(wantR)) assert.deepEqual(gotR[k], wantR[k], d + ' الجولات ' + k);
    for (const r of ['bassam_employees_v1', 'bassam_shift_options_v1']) assert.equal(JSON.stringify(after[d][key(d, r)]), JSON.stringify(before[d][key(d, r)]), d + ' ' + r + ' لم يُمسّ');
  }
  assert.ok(checked > 100, 'أوراكلُ الأقفال على ' + checked + ' يوماً'); console.log('cal14 oracle days', checked, 'phase-2 calls', calls);
  /* ق4: الموظفُ الذي تغيّرت ورديتُه في نصف الشهر يُذكر لمدير الإدارة في الشهر المشترك */
  const dep1 = last.json.departments.find((x) => x.dept === D1) || {}, sum1 = JSON.parse(E.DB.q('SELECT v FROM meta WHERE k=?1', 'cal_migration_summary:' + D1)[0].v);
  assert.ok(sum1.conflicts.some((c) => c.items.some((q) => q.e === emp0 && q.f === 'shift')), 'تعارضُ الوردية في الملخّص: ' + JSON.stringify(sum1.conflicts).slice(0, 300));
  assert.ok(dep1.ok === 1 || dep1.dept === undefined);
  /* إعادتُها لا تغيّر شيئاً */
  const fp = { ...E.DB.q('SELECT COUNT(*) n, SUM(length(row_key)) s FROM ops_nodes')[0] }, again = await call('/api/operations/calendar-migrate', { method: 'POST', body: { dept: 'all' } });
  assert.deepEqual([again.status, again.json.departments.length], [200, 0], 'الإعادةُ لا تفعل شيئاً');
  assert.deepEqual({ ...E.DB.q('SELECT COUNT(*) n, SUM(length(row_key)) s FROM ops_nodes')[0] }, fp);
  /* الحفظُ يعمل بعد الترحيل */
  const ok = await saveDoc(call, D2, 'bassam_dayshift_v1', { [T]: 'TEST_ONLY مسائية' });
  assert.equal(ok.status, 200, JSON.stringify(ok.json).slice(0, 300));
  /* ⑤ الرجوع: نقطةُ الاسترجاع + الحزمةُ السابقة ⇒ المخطط 13 والبياناتُ كما كانت */
  const E0 = env(restore(bookmark)), back = api(await load(oldSource, 'old'), E0);
  assert.equal((await back('/api/ping')).status, 200);
  assert.equal(E0.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA - 1));
  for (const d of [D1, D2]) { const rb = (await readAll(back, d)).resources; for (const r of ALL) assert.equal(JSON.stringify(rb[key(d, r)]), JSON.stringify(before[d][key(d, r)]), 'بعد الرجوع: ' + d + ' ' + r); }
  assert.equal(JSON.stringify(E0.DB.q('SELECT move_id,hijri_year y,hijri_month m,hijri_day d FROM custody_movements ORDER BY move_id')), JSON.stringify(relBefore.cus), 'بعد الرجوع: العهدة هجرية كما كانت');
  fs.rmSync(bookmark, { force: true });
});

/* قاعدةٌ بشكل Production قديمةٌ جداً (المخطط 5: العهدةُ وثيقةُ KV {y,m,d} هجرية) ← 14 في تشغيلٍ واحد بتصريحٍ واحد: خطوةُ 0006 تكتب صفوفَها
   (hijri_*، بالقاعدة التي تعيد أسماءَ greg_* — calLegacyEnv، قرارُ الاقتران مع cal-rest) ثم 0014 يحوّلها بالمطابقة نفسِها: greg_* ميلادية · لا حركةَ سقطت ·
   يومُ 0 يبقى 0 في شهر يومه الأول (ق10). */
test('53 تقويم · قاعدةٌ بالمخطط 5 (Production قديم) ← 14 في تشغيلٍ واحد: صفوفُ العهدة greg_* ميلادية · لا يومَ سقط', { timeout: 600000, ...(hasSystem('custody') ? {} : { skip: 'يحتاج نظام العهد' }) }, async () => {
  const { legacyWorld, D1: CD } = await import('./canonical_fx.mjs'), B = await legacyWorld();
  const moves = [[1400, 1, 1], [1447, 9, 30], [1448, 5, 0], [1448, 6, 14]].map(([y, m, d], i) => ({ t: i % 2 ? 'in' : 'out', eid: 'TEST_ONLY_h' + i, item: 'TEST_ONLY radio c14', ser: 'C14-' + i, y, m, d: H2G.has(y + '-' + m + '-' + d) || d === 0 ? d : 29 }));
  const doc = { items: [{ name: 'TEST_ONLY radio c14', qty: 4, prefix: 'C14', color: '#123456' }], moves };
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bsdept:' + CD + ':bassam_custody_v1', JSON.stringify(doc)));
  await B.W.initDb(B.env);
  assert.equal(B.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(CURRENT_SCHEMA));
  assert.deepEqual(B.DB.q('SELECT name FROM d1_migrations ORDER BY id').map((r) => r.name).slice(-2), ['0013_period_storage', '0014_gregorian_calendar']);
  const rows = B.DB.q('SELECT greg_year y,greg_month m,greg_day d FROM custody_movements WHERE department_id=?1 ORDER BY sequence', CD);
  assert.equal(rows.length, moves.length, 'لا حركةَ سقطت');
  moves.forEach((mv, i) => { const g = H2G.get(mv.y + '-' + mv.m + '-' + Math.max(1, mv.d)); assert.deepEqual([rows[i].y, rows[i].m, rows[i].d], [+g.slice(0, 4), +g.slice(5, 7), mv.d === 0 ? 0 : +g.slice(8)], 'الحركة ' + i + ' ' + mv.y + '-' + mv.m + '-' + mv.d + ' ← ' + g); });
  assert.deepEqual(B.DB.q('PRAGMA foreign_key_check'), []);
});

/* calLegacyEnv (قرارُ الاقتران): يعيد معرّفاتِ greg_* إلى hijri_* في نصّ العبارة وحده — مساراتُ json_extract ('$.greg_year') تقرأ مفاتيحَ الصفوف المربوطة
   كما هي، فلا تعود NULL (كما في rsBulk/dsDomainStatements: «NOT NULL constraint failed: …hijri_year» قبل الإصلاح) */
test('53 تقويم · calLegacyEnv: المعرّفاتُ hijri_* ومساراتُ json_extract كما هي — لا NULL', async () => {
  const W = await load(fs.readFileSync(WORKER, 'utf8'), 'new'), DB = new D1Shim(), E = W.calLegacyEnv({ DB });
  DB.exec('CREATE TABLE t(hijri_year INTEGER NOT NULL,hijri_month INTEGER NOT NULL,hijri_day INTEGER,hijri_date TEXT)');
  await E.DB.batch([E.DB.prepare("INSERT INTO t(greg_year,greg_month,greg_day,greg_date) SELECT json_extract(j.value,'$.greg_year'),json_extract(j.value,'$.greg_month'),json_extract(j.value,'$.greg_day'),json_extract(j.value,'$.greg_date') FROM json_each(?1) j").bind(JSON.stringify([{ greg_year: 1448, greg_month: 6, greg_day: 14, greg_date: '1448-06-14' }]))]);
  assert.deepEqual({ ...DB.q('SELECT * FROM t')[0] }, { hijri_year: 1448, hijri_month: 6, hijri_day: 14, hijri_date: '1448-06-14' });
});
