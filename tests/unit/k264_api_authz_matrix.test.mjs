/* KIVO_264 · AUD-026 — عقدُ الصلاحية لمسارات «الفاعل» العشرة: المسار × الهوية × الوضع ⇒ الحالةُ ونطاقُ البيانات (أيُّ مفاتيح/صفوف/صور تعود)،
   لا شكلُ الجسم العارض (الشكلُ في api_contracts/api_shapes · الأخطاءُ المعقودة في api_contract_matrix).
   المسارات: save · get · changes · retro · aud · imgs (+ img/<id>) · presence · sec · sess/kill · me (+ me/sess/kill)
   الهويات (12 — tests/fixtures/gen_fixture.py · TEST_ONLY):
     su admin (مديرُ النظام الأول) · sa tst_sa (مديرُ نظامٍ من البذرة: كلمتُه غيرُ صالحةٍ للدخول — جلستُه مزروعةٌ في الجدول كجلسة الاختبار الداخلية)
     gm tst_gm1 (مديرُ عموم الفرع g1 = d1 + d2) · dm1 · dm2 · dm3 (مديرو الإدارات؛ d3 خارج الفرع وبلا سقفٍ مُرحَّل) · sup1 (مشرف الوردية أ)
     emp1 (موظف الوردية أ) · fld (راصدُ ميدان — daily/field وحدها) · emp2 (موظف d2 — له صفحةٌ خارج سقف إدارته) · frozen tst_supB (مجمَّد) · anon (بلا جلسة)
   الوضعان: legacy (بلا KIVO_AUTHZ_MODE — كما Production) · enforce (ENV ∧ meta.authz_mode — كما Preview).
   المتوقَّع = سلوكُ 263 حيث هو صحيحٌ بوضوح (docs/api.md · ADR · قراءةُ الكود). ما ستغيّره تيّاراتُ 264 المتوازية معلَّمٌ «KIVO_264-merge».
   التعرّضان المعروفان E1/E2 (scratchpad triage §4.2 — قرارُ المالك معلّق) لا يُؤكَّدان صحيحَين: يُطبعان تشخيصاً (t.diagnostic) فقط. */
import { test } from 'node:test';
import { installIrshadFixture } from './irshad_legacy_seed_fx.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT, since } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const MODES = ['legacy', 'enforce'];
const ACC = { gm: ['0000000103', '70103', 'tst_gm1'], dm1: ['0000000101', '70101', 'tst_dm1'], dm2: ['0000000102', '70102', 'tst_dm2'], dm3: ['0000000104', '70104', 'tst_dm3'],
  sup1: ['0000000111', '70111', 'tst_sup1'], emp1: ['0000000113', '70113', 'tst_emp1'], fld: ['0000000118', '70118', 'tst_fld'], emp2: ['0000000121', '70121', 'tst_emp2'], frozen: ['0000000112', '70112', 'tst_supB'] };
const SUPERS = ['su', 'sa'], ACTIVE = ['su', 'sa', 'gm', 'dm1', 'dm2', 'dm3', 'sup1', 'emp1', 'fld', 'emp2'], NON_SUPER = ACTIVE.filter(w => !SUPERS.includes(w));
const DEPTS_OF = { gm: ['tst_d1', 'tst_d2'], dm1: ['tst_d1'], dm2: ['tst_d2'], dm3: ['tst_d3'], sup1: ['tst_d1'], emp1: ['tst_d1'], fld: ['tst_d1'], emp2: ['tst_d2'] };
const dk = (d, r) => 'bsdept:' + d + ':bassam_' + r;
/* مفاتيحُ المسبار (كلٌّ بقيمةٍ مخزَّنة — فالمقروءُ ⇔ v ≠ null) */
const PK = { users: 'bassam_auth_users_v1', depts: 'bassam_depts_v1', perms: 'bassam_perms_v1', nsys: 'bassam_notif_sys_v1', dstats: 'bassam_dstats_v1',
  'd1.employees': dk('tst_d1', 'employees_v1'), 'd1.tasks': dk('tst_d1', 'tasks_v1'), 'd1.irshad': dk('tst_d1', 'irshad_v1'), 'd1.seized': dk('tst_d1', 'seized_v1'), 'd1.custody': dk('tst_d1', 'custody_v1'),
  'd1.award': dk('tst_d1', 'award_v1'), 'd1.plan': dk('tst_d1', 'plan_v1'), 'd1.rounds': dk('tst_d1', 'rounds_v1'), 'd1.dreport': dk('tst_d1', 'dreport_v1'), 'd1.staffing': dk('tst_d1', 'staffing_v3'),
  'd1.scope': dk('tst_d1', 'scope_v1'), 'd1.grants': dk('tst_d1', 'grants_v1'), 'd2.employees': dk('tst_d2', 'employees_v1'), 'd2.irshad': dk('tst_d2', 'irshad_v1'),
  'd2.seized': dk('tst_d2', 'seized_v1'),   /* صفحةٌ خارج سقف d2 — بياناتٌ قديمة مزروعةٌ في الجدول مباشرةً (الحفظُ يرفضها حتى لمدير النظام) */
  'd2.scope': dk('tst_d2', 'scope_v1'), 'd3.plan': dk('tst_d3', 'plan_v1') };
const G3 = ['users', 'depts', 'perms'], D1_OPS = ['d1.employees', 'd1.tasks', 'd1.irshad', 'd1.seized', 'd1.custody', 'd1.award', 'd1.plan', 'd1.rounds', 'd1.dreport', 'd1.staffing'];
/* نطاقُ القراءة (المفاتيحُ التي تعود بقيمتها) — الوضعان، وما يزيده الإنفاذ: سجلّا النطاق والمنح لمدير الإدارة (canReadEnf · isMgrOf) */
const READ = { su: Object.keys(PK), sa: Object.keys(PK),
  gm: [...G3, 'dstats', ...D1_OPS, 'd2.employees', 'd2.irshad'], dm1: [...G3, 'dstats', ...D1_OPS], dm2: [...G3, 'dstats', 'd2.employees', 'd2.irshad'], dm3: [...G3, 'dstats', 'd3.plan'],
  sup1: [...G3, 'd1.employees', 'd1.tasks', 'd1.irshad', 'd1.award', 'd1.plan', 'd1.rounds', 'd1.dreport', 'd1.staffing'],
  emp1: [...G3, 'd1.employees', 'd1.tasks', 'd1.irshad', 'd1.plan', 'd1.rounds', 'd1.dreport', 'd1.staffing'],
  fld: [...G3, 'd1.employees', 'd1.plan', 'd1.rounds', 'd1.dreport', 'd1.staffing'], emp2: [...G3, 'd2.employees', 'd2.irshad'] };
const READ_ENF = { gm: ['d1.scope', 'd1.grants', 'd2.scope'], dm1: ['d1.scope', 'd1.grants'], dm2: ['d2.scope'] };
/* KIVO_264-merge — عيبٌ مثبَّتٌ بالدليل QA-264-D1 (انظر الاختبار المخصَّص في آخر الملف): في الإنفاذ يقرأ مديرُ الإدارة ومديرُ الفرع بياناتِ صفحةٍ خارج سقف
   الإدارة (ووحدةٍ مطفأةٍ على مستوى المنصة) عبر backup.view — والقديمُ يمنعها («ولا صاحبُ النسخ الاحتياطية» · canRead0). مثبَّتٌ هنا كما هو (توصيفٌ لا اعتماد)؛
   عند إصلاح canReadEnf (061-enf-read · تيّارُ الخادم أو قرارُ المالك) يُحذف هذا السطرُ ويُعكس الاختبارُ المخصَّص. */
const DEFECT_D1_ENF = {};   /* KIVO_264 (دمج): QA-264-D1 أُصلح في الخادم (k264-sec f54933f · resOnCeiling في canReadEnf) — لا قراءةَ خارج السقف في الإنفاذ كالقديم */
const readSet = (who, mode) => new Set(READ[who].concat(mode === 'enforce' ? (READ_ENF[who] || []).concat(DEFECT_D1_ENF[who] || []) : []));
const IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const val = (r, k) => { const it = ((r.j && r.j.keys) || {})[k]; return it && it.v != null ? JSON.parse(it.v) : null; };
const sorted = (a) => [...a].sort();

function seed() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264am_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return { sql: fs.readFileSync(out + '/test_seed.sql', 'utf8'), fx: JSON.parse(fs.readFileSync(out + '/fixture.json', 'utf8')) };
}
const WORLDS = new Map();
function world(mode) { if (!WORLDS.has(mode)) WORLDS.set(mode, build(mode)); return WORLDS.get(mode); }
async function build(mode) {
  const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok, 'admin');
  const { sql, fx } = seed(); await applySql(env.DB, sql); await installCurrentSchemaFixture(env);
  /* The fixture now seeds typed daily-statistics rows and never recreates retired KV. */
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  // Typed create validates a real employee/shift reference. Department two's
  // existing TEST_ONLY employee needs the same current-month assignment as the
  // old matrix's TST-A record; no account, permission or scope changes.
  const staffing2 = { [fx.MK]: { tst_e_emp2: { shift: fx.shifts[0], rest: [] } } };
  env.DB.db.prepare('INSERT INTO kv(k,seq,v)VALUES(?,0,?)').run(dk('tst_d2','staffing_v3'), JSON.stringify(staffing2));
  const W = { mode, env, C, fx, S: { su: su.ck }, UID: { su: su.j.uid, sa: 'tst_sa' } };
  W.irRecords = (who, dept) => C.api('/api/irshad?' + new URLSearchParams({ uid: W.UID[who], dept, view: 'records', year: fx.today.y, month: fx.today.m, limit: 200 }), { cookie: W.S[who] });
  W.mintSa = (tok) => { const n = Date.now(); env.DB.exec(`INSERT OR REPLACE INTO sess (tok, uid, ts, la, dev, city) VALUES ('${tok}', 'tst_sa', ${n}, ${n}, 'd', 'TEST_ONLY')`); return 'bs_tok=' + tok; };
  W.S.sa = W.mintSa('tok_k264_sa');
  W.relogin = async (who) => { if (who === 'su') { const l = await C.login('admin', 'admin'); W.S.su = l.ck; return; } if (who === 'sa') { W.S.sa = W.mintSa('tok_k264_sa'); return; } const [u, p] = ACC[who]; const l = await C.login(u, p); assert.ok(l.ok, 'login ' + who); W.S[who] = l.ck; };
  for (const w of Object.keys(ACC)) { await W.relogin(w); W.UID[w] = ACC[w][2]; }
  W.nSess = (uid) => env.DB.q('SELECT COUNT(*) AS n FROM sess WHERE uid = ?', uid)[0].n;
  /* البيانات: صورتان لمدير النظام مربوطتان بمهام d1 واسترشاد d2 · صورةٌ مرفوعةٌ لموظف d1 لم تُربط (claim) · تنبيهاتُ النظام ·
     بياناتٌ قديمة لصفحةٍ خارج سقف d2 (المضبوطات) */
  /* KIVO_264 (دمج · SOT-101): عقدُ الصورة الخامّ — Content-Type: text/plain أو غائب (application/json ⇒ 415) */
  for (const id of ['img_k264_t1', 'img_k264_i2', 'img_k264_u4']) assert.equal((await C.api('/api/img/' + id, { method: 'PUT', body: IMG, cookie: W.S.su, headers: { 'Content-Type': 'text/plain' } })).status, 200);
  assert.equal((await C.api('/api/img/img_k264_c3', { method: 'PUT', body: IMG, cookie: W.S.emp1, headers: { 'Content-Type': 'text/plain' } })).status, 200, 'emp1 uploads (claim)');
  const g = await C.api('/api/get?keys=' + encodeURIComponent(PK['d1.tasks']), { cookie: W.S.su });
  const t1 = val(g, PK['d1.tasks']); t1[fx.DAY][0][1] = 'img_k264_t1';
  const sv = await C.save(W.S.su, { [PK['d1.tasks']]: JSON.stringify(t1) });
  // Isolated image ACL fixture: the migrated Irshad record DTO has no image
  // field. Bind this existing image to its logical resource independently of
  // report data, and leave another stored image without a claim/reference.
  const bound = env.DB.db.prepare("UPDATE imgown SET st='bound',k=?,uid='',dept=? WHERE img=? AND st='claim'").run(PK['d2.irshad'], 'tst_d2', 'img_k264_i2');
  assert.equal(Number(bound.changes), 1);
  env.DB.db.prepare('INSERT INTO imgref(img,k)VALUES(?,?)').run('img_k264_i2', PK['d2.irshad']);
  env.DB.db.prepare('DELETE FROM imgown WHERE img=?').run('img_k264_u4');
  const irCatalog = await C.api('/api/irshad?' + new URLSearchParams({ uid: W.UID.su, dept: 'tst_d2', view: 'catalogs' }), { cookie: W.S.su });
  assert.equal(irCatalog.status, 200);
  const irAudit = await C.api('/api/irshad/act', { method: 'POST', cookie: W.S.su, body: { uid: W.UID.su, dept: 'tst_d2', requestId: 'TEST_ONLY_matrix_catalog_' + mode, base: irCatalog.j.base, op: 'catalog-replace', kind: 'locations', values: ['TEST_ONLY موقع'], reason: 'TEST_ONLY canonical d2 audit setup' } });
  assert.equal(irAudit.status, 200); assert.equal(irAudit.j.n, 1, 'A real typed command supplies the department-two audit witness');
  assert.equal(sv.status, 200); assert.deepEqual(sv.j.denied, {}, 'setup writes');
  const nf = await C.api('/api/notifications/act', { method: 'POST', cookie: W.S.su, body: { uid: W.UID.su, op: 'emit', type: 'sc_deny', title: 'TEST_ONLY k264 system notification' } });
  assert.equal(nf.status, 200); assert.equal(nf.j.ok, 1, 'notification setup uses the typed API');
  env.DB.exec(`INSERT INTO kv (k, seq, v) VALUES ('${PK['d2.seized']}', 0, '{"reports":[{"id":"tstsz2","loc":"TEST_ONLY","test":"TEST_ONLY"}]}')`);
  env.DB.exec(`INSERT OR REPLACE INTO revs (k, rev) VALUES ('${PK['d2.seized']}', 1)`);
  /* التجميد بمسار مدير النظام (حفظُ الحسابات) — الكوكي القديمة تبقى في يد الاختبار */
  W.frozenOldCk = W.S.frozen;
  const us = val(await C.api('/api/get?keys=' + PK.users, { cookie: W.S.su }), PK.users); us.find(u => u.id === 'tst_supB').dis = 1;
  const fr = await C.save(W.S.su, { [PK.users]: JSON.stringify(us) }); assert.equal(fr.status, 200); assert.deepEqual(fr.j.denied, {}, 'freeze');
  delete W.S.frozen;
  return W;
}

for (const mode of MODES) {
  /* ══ GET /api/get — نطاقُ القراءة بالمفتاح ══ */
  test(`[${mode}] /api/get — المفاتيحُ المقروءة لكل هوية · لا قيمةَ لغير المقروء · لا اسمَ لمفتاح إدارةٍ أخرى · الحسابات بلا بصمة ولا رقمِ غيره`, since(163), async (t) => {
    const W = await world(mode), { C } = W, keys = Object.values(PK);
    for (const who of ACTIVE) {
      const r = await C.api('/api/get?keys=' + encodeURIComponent(keys.join(',')), { cookie: W.S[who] }); assert.equal(r.status, 200, who);
      const exp = readSet(who, mode), got = r.j.keys || {};
      const read = Object.keys(PK).filter(l => got[PK[l]] && got[PK[l]].v != null);
      assert.deepEqual(sorted(read), sorted([...exp].filter(l => !['dstats', 'nsys', 'd1.custody', 'd1.irshad', 'd2.irshad'].includes(l))), `${who}: المقروء من KV بعد نقل المجالات إلى واجهاتها`);
      for (const label of ['d1.irshad', 'd2.irshad']) {
        const entry = got[PK[label]], dept = 'tst_' + label.split('.')[0];
        if (entry) assert.deepEqual(entry, { v: null, rev: entry.rev, moved: '/api/irshad' }, `${who}: لا IRJSON في المفتاح المتقاعد`);
        if (exp.has(label)) assert.ok(entry, `${who}: المورد المسموح يعلن انتقاله`);
        const ir = await W.irRecords(who, dept);
        assert.equal(ir.status, exp.has(label) ? 200 : 403, `${who}: صلاحية الاسترشاد نفسها في API العلائقي ${dept}`);
        if (exp.has(label)) {
          assert.equal(ir.j.ok, 1); assert.equal(ir.j.dept, dept);
          const expected = label === 'd2.irshad' ? ['tstir21'] : mode === 'enforce' && ['sup1','emp1'].includes(who) ? ['tstir1','tstir4'] : ['tstir1','tstir2','tstir4'];
          assert.deepEqual(sorted(ir.j.rows.map(row => row.id)), sorted(expected), `${who}: صفوف SQL بنفس إسقاط الوردية`);
        } else assert.equal(ir.j.rows, undefined, `${who}: لا صفوف استرشاد بلا صلاحية`);
      }
      const boot = await C.boot(W.S[who]); assert.equal(boot.status, 200);
      assert.deepEqual(Object.keys(boot.boot?.keys || {}).filter(key => /(?:^|:)bassam_irshad(?:_langs|_locs|_retro)?_v1$/.test(key)), [], `${who}: BOOT لا يعيد وثائق الاسترشاد المتقاعدة`);
      if (exp.has('d1.custody')) assert.deepEqual(got[PK['d1.custody']], {v:null,rev:got[PK['d1.custody']].rev,moved:'/api/custody'}, `${who}: لا عهد من وثيقة KV المتقاعدة`);
      const custody = await C.api('/api/custody?' + new URLSearchParams({dept:'tst_d1',view:'catalog'}), {cookie:W.S[who]});
      assert.equal(custody.status, exp.has('d1.custody') ? 200 : 403, `${who}: صلاحية العهد نفسها في API العلائقي`);
      if (exp.has('d1.custody')) {
        assert.equal(custody.j.ok, 1);
        assert.deepEqual(custody.j.items.map(item => ({name:item.name,qty:item.qty})), [{name:'TEST_ONLY جهاز',qty:5}], `${who}: بيانات الجرد من SQL`);
      } else assert.equal(custody.j.items, undefined, `${who}: لا جرد بلا صلاحية`);
      if (exp.has('nsys')) assert.deepEqual(got[PK.nsys], { v: null, rev: got[PK.nsys].rev, moved: '/api/notifications' }, `${who}: تنبيهات النظام لا تُقرأ من المفتاح القديم`);
      if (exp.has('dstats')) assert.deepEqual(got[PK.dstats], { v: null, rev: got[PK.dstats].rev, moved: '/api/dstats' }, `${who}: المفتاح القديم يعلن الانتقال دون بيانات`);
      if (got[PK.dstats]) { assert.equal(got[PK.dstats].v, null); assert.equal(got[PK.dstats].moved, '/api/dstats'); }
      const stats = await C.api('/api/dstats', { cookie: W.S[who] });
      assert.equal(stats.status, exp.has('dstats') ? 200 : 403, `${who}: صلاحية القراءة نفسها في واجهة الإحصائيات`);
      if (exp.has('dstats')) {
        assert.equal(stats.j.ok, 1); assert.ok(Number.isSafeInteger(stats.j.rev));
        assert.deepEqual(stats.j.data, W.fx.dstatsAdd, `${who}: الأرقام والأقفال مصدرها الصفوف العلائقية وحدها`);
      } else { assert.equal(stats.j.err, 'denied'); assert.equal(stats.j.data, undefined, `${who}: لا بيانات بلا صلاحية`); }
      if (!SUPERS.includes(who)) {
        const outside = (l) => l === 'nsys' || (/^d\d\./.test(l) && !DEPTS_OF[who].includes('tst_' + l.split('.')[0]));
        const foreign = Object.keys(PK).filter(l => outside(l) && (PK[l] in got));
        assert.deepEqual(foreign, [], `${who}: لا اسمَ ولا رقمَ مراجعةٍ لمفتاح إدارةٍ أخرى أو لتنبيهات مدير النظام`);
      }
      /* الحسابات: لكل جلسة (السجلُّ العام) — بلا ph لأحد · «no» (كلمةُ المديرين الأولى · SR-1) لصاحبه وحده ولمدير النظام */
      const us = JSON.parse(got[PK.users].v);
      assert.equal(us.filter(u => 'ph' in u).length, 0, `${who}: لا بصمة`);
      const noIds = sorted(us.filter(u => 'no' in u).map(u => u.id));
      assert.deepEqual(noIds, SUPERS.includes(who) ? ['tst_dm1', 'tst_dm2', 'tst_dm3', 'tst_gm1'] : (['gm', 'dm1', 'dm2', 'dm3'].includes(who) ? [W.UID[who]] : []), `${who}: no`);
      /* KIVO_264-merge (إسقاطُ الحقول الشخصية · تيّارُ الخادم · قرارُ المالك): E2 — un/alt لكل حسابات المنصة لأي جلسة. بعد الدمج يُضاف هنا:
         غيرُ مدير النظام يرى un/alt لنفسه (ولمن يديره) وحده. حتى ذلك تشخيصٌ لا تأكيد. */
      if (!SUPERS.includes(who)) t.diagnostic(`${mode} ${who}: E2 un ظاهرٌ لـ${us.filter(u => u.un && u.id !== W.UID[who]).length} حساباً غيرَه من ${us.length}`);
      const ev = got[PK['d1.employees']] && got[PK['d1.employees']].v != null ? JSON.parse(got[PK['d1.employees']].v) : null;
      if (ev) {
        assert.equal(ev.length, 10, `${who}: دليلُ موظفي d1 كاملُ الصفوف لقارئه التشغيلي (RD_OPS — بالتصميم)`);   /* KIVO_264-merge: الإسقاطُ يُسقط حقولاً لا صفوفاً */
        const myEkey = (us.find(u => u.id === W.UID[who]) || {}).ekey;
        if (!SUPERS.includes(who) && !['gm', 'dm1'].includes(who)) t.diagnostic(`${mode} ${who}: E1 empno ظاهرٌ لـ${ev.filter(e => e.empno && e.eid !== myEkey).length} زميلاً`);
      }
    }
  });

  /* ══ GET /api/changes — أسماءُ ما تغيّر تمرّ بعقد القراءة نفسِه ══ */
  test(`[${mode}] /api/changes — الأسماءُ بنطاق الهوية: كلُّ مقروءٍ يظهر · لا اسمَ لإدارةٍ أخرى ولا لتنبيهات مدير النظام`, since(163), async () => {
    const W = await world(mode), { C } = W;
    for (const who of ACTIVE) {
      const r = await C.api('/api/changes?since=0', { cookie: W.S[who] }); assert.equal(r.status, 200, who);
      const names = new Set(r.j.keys || []);
      const miss = [...readSet(who, mode)].filter(l => !names.has(l === 'nsys' ? 'bassam_notifications_domain_v1' : PK[l])); assert.deepEqual(miss, [], `${who}: كلُّ موردٍ مقروء يُعلَن تغيّرُه`);
      if (SUPERS.includes(who)) continue;
      const bad = [...names].filter(k => k === PK.nsys || (/^bsdept:/.test(k) && !DEPTS_OF[who].includes(k.split(':')[1])));
      assert.deepEqual(bad, [], `${who}: لا اسمَ خارج نطاقه`);
    }
  });

  test(`[${mode}] /api/save — مفاتيح التنبيهات والاسترشاد المتقاعدة تُرفض صراحةً دون إعادة إنشائها`, since(163), async () => {
    const W = await world(mode);
    for (const [key, route] of [[PK.nsys, '/api/notifications'], [PK['d1.irshad'], '/api/irshad'], [PK['d2.irshad'], '/api/irshad']]) {
      const result = await W.C.save(W.S.su, { [key]: JSON.stringify([{ id: 'TEST_ONLY_retired', msg: 'TEST_ONLY' }]) });
      assert.equal(result.status, 200); assert.equal(result.j.atomic, 'domain-moved');
      assert.deepEqual(result.j.denied[key], { why: 'domain-moved', path: route });
      assert.equal(W.env.DB.q('SELECT COUNT(*) AS n FROM kv WHERE k = ?', key)[0].n, 0);
    }
  });

  /* ══ /api/retro — حالةُ نافذة الاستدراك (GET) وفتحُها/إغلاقُها (POST) ══ */
  test(`[${mode}] /api/retro — GET لحامل الاستدراك (may) ولقارئ السجلّ · 403 لغيرهما · POST open/close لحامل الاستدراك وحده`, since(163), async () => {
    const W = await world(mode), { C, fx } = W;
    /* «may» = ir.rec.retro.open (المديرون بالسقف · sup1 بالمنح الصريح plus) — قارئُ الاسترشاد بلا الصلاحية يرى الحالة may:false */
    const GET = { su: ['may', 'may'], sa: ['may', 'may'], gm: ['may', 'may'], dm1: ['may', 403], dm2: [403, 'may'], dm3: [403, 403], sup1: ['may', 403], emp1: ['read', 403], fld: [403, 403], emp2: [403, 'read'] };
    for (const who of ACTIVE) {
      for (const [i, d] of ['tst_d1', 'tst_d2'].entries()) {
        const r = await C.api('/api/retro?res=irshad&dept=' + d, { cookie: W.S[who] }), e = GET[who][i];
        if (e === 403) { assert.equal(r.status, 403, `${who} ${d}`); assert.equal(r.j.err, DEPTS_OF[who]?.includes(d) ? 'perm' : 'irshad-denied'); continue; }
        assert.equal(r.status, 200, `${who} ${d}`); assert.equal(r.j.may, e === 'may', `${who} ${d}: may`); assert.ok(Array.isArray(r.j.windows));
      }
      /* KIVO_264-merge (SOT-101 مخطّطُ جسم /api/retro — تيّارُ الخادم): جسمُ الفتح = ما يرسله العميلُ حرفاً (src/api/280-server-storage.js) ·
         وجسمُ الإغلاق = ما يرسله مشغّلُ مصفوفة الأدوار (SOT-187) — يجب أن يبقيا مقبولَين بعد المخطّط */
      const op = await C.api('/api/retro', { method: 'POST', cookie: W.S[who], body: { res: 'irshad', dept: 'tst_d1', act: 'open', scope: { y: fx.prevMonth.y, m: fx.prevMonth.m }, reason: 'TEST_ONLY k264 matrix' } });
      if (GET[who][0] === 'may') {
        assert.equal(op.status, 200, `${who}: open ${JSON.stringify(op.j).slice(0, 120)}`); assert.equal(op.j.window.by.id, W.UID[who], `${who}: الفاعلُ من الجلسة`);
        const cl = await C.api('/api/retro', { method: 'POST', cookie: W.S[who], body: { act: 'close', res: 'irshad', dept: 'tst_d1', id: op.j.window.id } });
        assert.equal(cl.status, 200, `${who}: close`); assert.ok(cl.j.window.closedAt > 0);
      } else { assert.equal(op.status, 403, `${who}: open`); assert.equal(op.j.err, DEPTS_OF[who]?.includes('tst_d1') ? 'perm' : 'irshad-denied'); }
    }
  });

  /* ══ /api/aud — سجلُّ الإدارة كاملاً · تاريخُ مجموعةٍ واحدة · ولا سطرَ لا يقرؤه الطالب ══ */
  test(`[${mode}] /api/aud — الإدارةُ كاملةً لمديرها ومدير الفرع ومدير النظام · بلا إدارة لمدير النظام وحده · تاريخُ مجموعةٍ لمن يقرؤها (READ-01)`, since(163), async () => {
    const W = await world(mode), { C } = W;
    const DEPT = { su: ['tst_d1', 'tst_d2'], sa: ['tst_d1', 'tst_d2'], gm: ['tst_d1', 'tst_d2'], dm1: ['tst_d1'], dm2: ['tst_d2'], dm3: [], sup1: [], emp1: [], fld: [], emp2: [] };
    const ENT = { su: 200, sa: 200, gm: 200, dm1: 200, dm2: 403, dm3: 403, sup1: 200, emp1: 200, fld: 403, emp2: 403 };   /* تاريخُ مهام d1: نطاقُ الإدارة ∧ قراءةُ المهام */
    for (const who of ACTIVE) {
      for (const d of ['tst_d1', 'tst_d2']) {
        const r = await C.api('/api/aud?limit=200&dept=' + d, { cookie: W.S[who] });
        if (!DEPT[who].includes(d)) { assert.equal(r.status, 403, `${who} ${d}`); continue; }
        assert.equal(r.status, 200, `${who} ${d}`); assert.ok(r.j.rows.length > 0, `${who} ${d}: صفوف`);
        const foreign = r.j.rows.filter(x => x.dept !== d || (x.k && x.k !== 'system' && !x.k.startsWith('bsdept:' + d + ':'))).map(x => x.k);
        assert.deepEqual(foreign, [], `${who} ${d}: كلُّ سطرٍ من الإدارة المطلوبة`);
      }
      const all = await C.api('/api/aud?limit=200', { cookie: W.S[who] });
      if (SUPERS.includes(who)) { assert.equal(all.status, 200); assert.ok(all.j.rows.some(x => x.k === PK.users), 'سطرُ الحسابات (عامٌّ) لمدير النظام'); } else assert.equal(all.status, 403, `${who}: بلا إدارة`);
      const en = await C.api('/api/aud?dept=tst_d1&etype=dataset&eid=bassam_tasks_v1', { cookie: W.S[who] });
      assert.equal(en.status, ENT[who], `${who}: تاريخُ مهام d1`);
      if (en.status === 200) assert.ok(en.j.rows.length > 0 && en.j.rows.every(x => x.k === PK['d1.tasks']), `${who}: أسطرُ المجموعة وحدها`);
    }
  });

  /* ══ /api/imgs و /api/img/<id> — الصورةُ تتبع مالكها: claim لرافعها · bound بقراءة مفتاحها ══ */
  test(`[${mode}] /api/imgs · /api/img/<id> — الجردُ والقراءةُ بحكم المالك (claim لرافعها · bound بقراءة مفتاحه)`, since(163), async () => {
    const W = await world(mode), { C } = W;
    const VIS = { su: ['c3', 'i2', 't1', 'u4'], sa: ['c3', 'i2', 't1', 'u4'], gm: ['i2', 't1'], dm1: ['t1'], dm2: ['i2'], dm3: [], sup1: ['t1'], emp1: ['c3', 't1'], fld: [], emp2: ['i2'] };
    for (const who of ACTIVE) {
      const l = await C.api('/api/imgs', { cookie: W.S[who] }); assert.equal(l.status, 200, who);
      assert.deepEqual(sorted(Object.keys(l.j).filter(k => k.startsWith('img_k264_')).map(k => k.slice(9))), VIS[who], `${who}: الجرد`);
      for (const id of ['t1', 'i2', 'c3', 'u4']) { const r = await C.req('/api/img/img_k264_' + id, { cookie: W.S[who] }); assert.equal(r.status, VIS[who].includes(id) ? 200 : 403, `${who}: img ${id}`); }
    }
  });

  /* ══ /api/presence — القديم: نفسُه + موظفو إدارته (scopeOk) · الإنفاذ: مديرُ النظام وحده ══ */
  test(`[${mode}] /api/presence — ${mode === 'legacy' ? 'نطاقي (نفسُه · ومديرُ الإدارة/الفرع موظفيه)' : 'مديرُ النظام وحده (403 لغيره)'}`, since(163), async () => {
    const W = await world(mode), { C } = W;
    const everyone = sorted(ACTIVE.map(w => W.UID[w]));
    const LIST = { su: everyone, sa: everyone, gm: sorted(['tst_gm1', 'tst_dm1', 'tst_dm2', 'tst_sup1', 'tst_emp1', 'tst_fld', 'tst_emp2']), dm1: sorted(['tst_dm1', 'tst_sup1', 'tst_emp1', 'tst_fld']),
      dm2: sorted(['tst_dm2', 'tst_emp2']), dm3: ['tst_dm3'], sup1: ['tst_sup1'], emp1: ['tst_emp1'], fld: ['tst_fld'], emp2: ['tst_emp2'] };
    for (const who of ACTIVE) {
      const r = await C.api('/api/presence', { cookie: W.S[who] });
      if (mode === 'enforce' && !SUPERS.includes(who)) { assert.equal(r.status, 403, who); continue; }
      assert.equal(r.status, 200, who); assert.deepEqual(sorted(r.j.list.map(x => x.u.id)), LIST[who], `${who}: من يرى`);   /* KIVO_264-merge: الإسقاطُ قد يُسقط un من صفوفه (لا يُؤكَّد هنا) */
    }
  });

  /* ══ /api/sec — مديرُ النظام وحده في الوضعين (الكود · 063) ══ */
  test(`[${mode}] /api/sec — مديرُ النظام وحده (403 لكل غيره في الوضعين)`, since(163), async () => {
    const W = await world(mode), { C } = W;
    /* KIVO_264-merge (الوثائق · مالكُ WP1): docs/api.md يقول «نطاقي (قديم)» — الكودُ لمدير النظام وحده في الوضعين، وهو الأضيق؛ يُصحَّح النصُّ لا الكود */
    for (const who of ACTIVE) {
      const r = await C.api('/api/sec?limit=5', { cookie: W.S[who] });
      if (SUPERS.includes(who)) { assert.equal(r.status, 200, who); assert.ok(Array.isArray(r.j.rows) && r.j.rows.length > 0); } else assert.equal(r.status, 403, who);
    }
  });

  /* ══ /api/me و /api/me/sess/kill — بنطاق صاحب الجلسة وحده ══ */
  test(`[${mode}] /api/me · /api/me/sess/kill — جلساتي وأحداثي وحدها · إنهاءُ جلساتي الأخرى لا يمسّ الحالية ولا جلساتِ غيري`, since(163), async () => {
    const W = await world(mode), { C, env } = W;
    for (const who of ACTIVE) {
      const uid = W.UID[who], second = who === 'sa' ? W.mintSa('tok_k264_sa2') : (who === 'su' ? (await C.login('admin', 'admin')).ck : (await C.login(ACC[who][0], ACC[who][1])).ck);
      const own = W.nSess(uid), others = env.DB.q('SELECT COUNT(*) AS n FROM sess WHERE uid <> ?', uid)[0].n;
      const me = await C.api('/api/me', { cookie: W.S[who] }); assert.equal(me.status, 200, who);
      assert.equal(me.j.sess.length, own, `${who}: جلساتي وحدها`); assert.equal(me.j.sess.filter(s => s.mine).length, 1, `${who}: الحاليةُ واحدة`);
      const evN = env.DB.q("SELECT COUNT(*) AS n FROM sec WHERE uid = ? AND act IN ('login_ok','login_fail','pw_change','sess_kill','logout')", uid)[0].n;
      assert.equal(me.j.events.length, Math.min(8, evN), `${who}: أحداثي وحدها`);
      const k = await C.api('/api/me/sess/kill', { method: 'POST', cookie: W.S[who], body: {} }); assert.equal(k.status, 200, who);
      assert.equal(W.nSess(uid), 1, `${who}: تبقى الحالية وحدها`); assert.equal(env.DB.q('SELECT COUNT(*) AS n FROM sess WHERE uid <> ?', uid)[0].n, others, `${who}: جلساتُ غيري كما هي`);
      assert.equal((await C.api('/api/whoami', { cookie: W.S[who] })).status, 200, `${who}: الحالية حيّة`);
      assert.equal((await C.api('/api/whoami', { cookie: second })).status, 401, `${who}: الأخرى انتهت`);
    }
  });

  /* ══ POST /api/save — حكمُ كلّ مفتاح (مكتوبٌ/مرفوض) وأثرُه في المخزن ══ */
  test(`[${mode}] /api/save — الكتابةُ لكل هوية: العامّ · إدارتُه · إدارةٌ أخرى · ورديةٌ أخرى · المهام · الحسابات (نفسُه وغيرُه)`, since(163), async () => {
    const W = await world(mode), { C, fx } = W, enf = mode === 'enforce';
    /* W مكتوب · D مرفوض. S2b: سجلٌّ في الوردية ب — الإنفاذُ يقيّد المشرفَ والموظفَ بورديتهما (D4-09 staffing-bound) والقديمُ لا يعرف الوردية */
    const X = { su: 'WWWWW', sa: 'WWWWW', gm: 'DWWWW', dm1: 'DWWDW', dm2: 'DDDWD', dm3: 'DDDDD', sup1: enf ? 'DWDDW' : 'DWWDW', emp1: enf ? 'DWDDD' : 'DWWDD', fld: 'DDDDD', emp2: 'DDDWD' };
    const outcome = (s, k) => (s.j.revs && s.j.revs[k] ? 'W' : 'D');
    /* KIVO_264-merge (تيّارُ الخادم — «save uid 409» · قيودُ الحقول الذاتية): عقدُ 263 = 200 وحكمُ كلّ مفتاحٍ في revs/denied. إن صار جسمُ /api/save
       يحمل uid الجلسة (يُرسَل هنا من W.UID) أو صار بعضُ الرفض 409/4xx، يُعدَّل هذا السطرُ بقرار التيّار — والحكمُ بالأثر أدناه يبقى كما هو */
    const save = async (who, k, mut) => { const g = await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: W.S[who] }); const cur = val(g, k);
      const s = await C.save(W.S[who], { [k]: JSON.stringify(mut(cur)) }, [], { [k]: ((g.j.keys || {})[k] || {}).rev || 0 }); assert.equal(s.status, 200, who + ' ' + k + ': ' + JSON.stringify(s.j).slice(0, 120)); return s; };
    const irData = (dept, shift) => ({ y: fx.today.y, m: fx.today.m, d: fx.today.d, shift,
      eid: dept === 'tst_d2' ? 'tst_e_emp2' : shift === 'TST-B' ? 'tst_e_supB' : 'tst_e_emp1',
      loc: 'TEST_ONLY موقع', langs: [], bro: 1, pros: 0, pol: 0 });
    const stored = async (k) => val(await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: W.S.su }), k);
    for (const who of ACTIVE) {
      const got = [];
      let s = await save(who, PK.depts, v => { v.find(d => d.id === 'tst_d3').k264 = who; return v; }); got.push(outcome(s, PK.depts));
      for (const [tag, k, sh] of [['a', PK['d1.irshad'], 'TST-A'], ['b', PK['d1.irshad'], 'TST-B'], ['c', PK['d2.irshad'], 'TST-A']]) {
        const dept = k.split(':')[1], before = await W.irRecords('su', dept);
        assert.equal(before.status, 200);
        const requestId = 'TEST_ONLY_matrix_' + mode + '_' + who + '_' + tag, data = irData(dept, sh);
        s = await C.api('/api/irshad/act', { method: 'POST', cookie: W.S[who], body: { uid: W.UID[who], dept, requestId, base: before.j.base, op: 'create', data, reason: 'TEST_ONLY matrix role/scope check' } });
        assert.ok([200, 403].includes(s.status), `${who} ${tag}: ${JSON.stringify(s.j)}`);
        const o = s.status === 200 ? 'W' : 'D'; got.push(o);
        const after = await W.irRecords('su', dept); assert.equal(after.status, 200);
        if (o === 'W') {
          assert.equal(s.j.ok, 1); assert.equal(s.j.requestId, requestId); assert.equal(s.j.op, 'create'); assert.equal(s.j.n, 1);
          assert.equal(s.j.base.reports, s.j.rev); assert.ok(s.j.rev > before.j.base.reports);
          const saved = after.j.rows.find(row => row.id === s.j.id); assert.ok(saved, `${who} ${tag}: المخزن يطابق ACK`);
          assert.equal(saved.eid, data.eid); assert.equal(saved.shift, sh); assert.equal(saved.bro, 1); assert.equal(after.j.total, before.j.total + 1);
        } else assert.deepEqual(after.j.rows, before.j.rows, `${who} ${tag}: الرفض لا يغيّر صفوف SQL`);
      }
      s = await save(who, PK['d1.tasks'], v => { v = v || {}; (v[fx.DAY] = v[fx.DAY] || []).push(['TEST_ONLY k264 ' + who, '', 'med', 'pending', null, null, null, [], '', null, null, null, null, Date.now() + Math.floor(Math.random() * 1e6), '', null, null, null, null, null, null, null]); return v; });
      got.push(outcome(s, PK['d1.tasks']));
      assert.equal(got.join(''), X[who], `${who}: depts · d1 ورديةُ أ · d1 ورديةُ ب · d2 · مهامُ d1`);
      if (SUPERS.includes(who)) continue;
      const uid = W.UID[who];
      /* KIVO_264-merge (قيودُ الحقول الذاتية — تيّارُ الخادم): قد يصير الرفضُ 4xx بدل denied — الحكمُ هنا بالأثر (الدورُ كما هو) */
      s = await save(who, PK.users, v => { const me = v.find(u => u.id === uid); me.role = 'super'; delete me.deptId; return v; });
      assert.notEqual(outcome(s, PK.users), 'W', `${who}: ترقيةُ نفسه إلى مدير النظام`); assert.notEqual((await stored(PK.users)).find(u => u.id === uid).role, 'super', `${who}: الدورُ كما هو`);
      const far = { gm: 'tst_dm3', dm2: 'tst_emp1', emp2: 'tst_emp1' }[who] || 'tst_emp2';   /* حسابٌ خارج نطاقه */
      /* الفحصُ العميق 2026-10-21 · R4 (إفصاح — تعديلُ اختبار): حسابُ موظفٍ خارج نطاقه لم يعد يصله أصلاً (usersScopeOut — ومديرُ إدارةٍ أخرى صفُّ دليلٍ
         بلا اسم دخول) — فالتعديلُ هنا سجلٌّ مزوَّرٌ بمعرّفه يُلحق بالقائمة: يبقى مرفوضاً ولا يمسّ المخزَّن (tests/unit/users_scope_w1.test.mjs) */
      s = await save(who, PK.users, v => { const f = v.find(u => u.id === far); assert.ok(!f || (!f.un && !f.alt), `${who}: ${far} بلا اسم دخولٍ ولا جوال`); if (f) f.name = 'TEST_ONLY k264 by ' + who; else v.push({ id: far, role: 'staff', name: 'TEST_ONLY k264 by ' + who }); return v; });
      assert.notEqual(outcome(s, PK.users), 'W', `${who}: تعديلُ حسابٍ خارج نطاقه (${far})`); assert.notEqual((await stored(PK.users)).find(u => u.id === far).name, 'TEST_ONLY k264 by ' + who, `${who}: ${far} كما هو`);
      const near = { gm: ['tst_emp2', 'W'], dm1: ['tst_emp1', 'W'], dm2: ['tst_emp2', 'W'], sup1: ['tst_emp1', 'D'], emp1: ['tst_fld', 'D'], fld: ['tst_emp1', 'D'] }[who];   /* حسابُ موظفٍ في نطاقه: للمدير بورقة emps/data */
      if (near) { s = await save(who, PK.users, v => { v.find(u => u.id === near[0]).name = 'TEST_ONLY k264 near ' + who; return v; }); assert.equal(outcome(s, PK.users), near[1], `${who}: تعديلُ حساب ${near[0]}`); }
      /* KIVO_264 (دمج · D14/OD-7): الاسمُ الظاهر لم يعد حقلاً ذاتياً لغير مدير النظام (SELF_FIELDS_BY_ROLE: staff [ph] · gm [ph,email,phone]) ⇒ مرفوض 'self' */
      s = await save(who, PK.users, v => { v.find(u => u.id === uid).name = 'TEST_ONLY k264 self ' + who; return v; }); assert.equal(outcome(s, PK.users), 'D', `${who}: اسمُه الظاهر (D14)`);
    }
  });

  /* ══ POST /api/sess/kill — القديم: scopeOk (موظفو إدارته/فرعه · لا نفسَه) · الإنفاذ: مديرُ النظام وحده ══ */
  test(`[${mode}] /api/sess/kill — ${mode === 'legacy' ? 'نطاقي: المديرُ لموظفي إدارته والفرعُ لإداراته' : 'مديرُ النظام وحده'} · لا نفسَه · المجهولُ 403 · والجلساتُ تُحذف فعلاً`, since(163), async () => {
    const W = await world(mode), { C } = W;
    const T = { emp1: 'tst_emp1', fld: 'tst_fld', emp2: 'tst_emp2', dm1: 'tst_dm1', dm2: 'tst_dm2', dm3: 'tst_dm3', gm: 'tst_gm1', su: W.UID.su, sa: 'tst_sa' };
    const LEG = { gm: ['emp1', 'fld', 'emp2', 'dm1', 'dm2'], dm1: ['emp1', 'fld'], dm2: ['emp2'], dm3: [], sup1: [], emp1: [], fld: [], emp2: [] };   /* scopeOk: role=staff ∧ isMgrOf — الفرعُ g1 = d1+d2؛ dm3 خارجه */
    for (const who of ACTIVE) {
      for (const tgt of [...Object.keys(T), 'nobody']) {
        const uid = T[tgt] || 'nobody', self = uid === W.UID[who];
        const allow = SUPERS.includes(who) ? tgt !== 'nobody' : (mode === 'legacy' && LEG[who].includes(tgt));
        const before = W.nSess(uid), r = await C.api('/api/sess/kill', { method: 'POST', cookie: W.S[who], body: { uid } });
        assert.equal(r.status, allow ? 200 : 403, `${who} ⇐ ${tgt}`);
        if (allow && self) assert.equal(W.nSess(uid), 1, `${who}: نفسُه — تبقى الجلسةُ الحالية`);
        else if (allow) { assert.ok(before > 0); assert.equal(W.nSess(uid), 0, `${who} ⇐ ${tgt}: حُذفت جلساتُه`); await W.relogin(tgt); }
        else assert.equal(W.nSess(uid), before, `${who} ⇐ ${tgt}: لم يُمسّ شيء`);
        assert.equal((await C.api('/api/whoami', { cookie: W.S[who] })).status, 200, `${who}: جلستُه حيّة`);
      }
    }
  });

  /* ══ المجمَّد وبلا جلسة — 401 على كلّ مسارات الفاعل (طبقتان: حذفُ الجلسات عند التجميد AUD-034 · وحارسُ dis لجلسةٍ باقية) ══ */
  test(`[${mode}] المجمَّد وبلا جلسة — 401 على المسارات العشرة (+ img/ · me/sess/kill) · وجلسةٌ باقيةٌ للمجمَّد لا تُفيده`, since(163), async () => {
    const W = await world(mode), { C, env } = W;
    assert.equal(W.nSess('tst_supB'), 0, 'التجميدُ حذف جلساته (AUD-034)');
    const n = Date.now(); env.DB.exec(`INSERT INTO sess (tok, uid, ts, la, dev, city) VALUES ('tok_k264_stale', 'tst_supB', ${n}, ${n}, 'd', 'TEST_ONLY')`);
    try {
      const CALLS = [['GET', '/api/irshad?dept=tst_d1&view=records'], ['POST', '/api/irshad/act', { op:'create',dept:'tst_d1' }], ['GET', '/api/get?keys=' + PK.users], ['GET', '/api/changes?since=0'], ['GET', '/api/retro?res=irshad&dept=tst_d1'], ['POST', '/api/retro', { act: 'open', res: 'irshad', dept: 'tst_d1' }],
        ['GET', '/api/aud?dept=tst_d1'], ['GET', '/api/imgs'], ['GET', '/api/img/img_k264_t1'], ['GET', '/api/presence'], ['GET', '/api/sec'], ['POST', '/api/sess/kill', { uid: 'tst_emp1' }],
        ['GET', '/api/me'], ['POST', '/api/me/sess/kill', {}], ['POST', '/api/save', { set: { [PK['d1.irshad']]: '{"reports":[]}' }, del: [], base: {} }]];
      for (const [who, ck] of [['anon', undefined], ['frozen-old-cookie', W.frozenOldCk], ['frozen-stale-session', 'bs_tok=tok_k264_stale']]) {
        for (const [m, p, b] of CALLS) { const r = await C.api(p, m === 'GET' ? { cookie: ck } : { method: m, body: b, cookie: ck }); assert.equal(r.status, 401, `${who} ⇐ ${m} ${p}`); }
      }
      assert.equal(W.nSess('tst_emp1') > 0, true, 'لم يُنهِ المجمَّدُ جلسةَ أحد');
    } finally { env.DB.exec("DELETE FROM sess WHERE tok = 'tok_k264_stale'"); }
  });
}

/* ══ QA-264-D1 — بياناتُ صفحةٍ خارج سقف الإدارة/وحدةٍ مطفأةٍ على مستوى المنصة: القديمُ لا يعطي قيمتها لأحدٍ في الإدارة (canRead0: «سقفُ الإدارة أولاً …
   ولا صاحبُ النسخ الاحتياطية»)؛ الإنفاذُ يعطيها لمدير الإدارة ومدير الفرع عبر backup.view (canReadEnf: أيُّ مفتاح قراءةٍ محمول يكفي ولا يُسأل عن صفحة المورد نفسِه)
   — في /api/get وفي حقن الإقلاع. الكتابةُ مرفوضةٌ في الوضعين. عالمٌ مستقلّ (يطفئ وحدةً على مستوى المنصة فلا يمسّ المصفوفة).
   KIVO_264-merge: عند الإصلاح يُعكس DEF_ENF إلى المتوقَّع الصحيح ({} = لا قيمةَ لأحد) ويُحذف DEFECT_D1_ENF أعلاه. ══ */
test('QA-264-D1 · الوحدةُ المطفأة وصفحةُ خارج السقف — القديمُ: لا قيمةَ لأحدٍ في الإدارة · الإنفاذُ: عيبٌ مثبَّت (المديرُ ومديرُ الفرع يقرآنها عبر backup.view)', since(163), async (t) => {
  for (const mode of MODES) {
    const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
    const su = await C.login('admin', 'admin'); assert.ok(su.ok); const { sql } = seed(); await applySql(env.DB, sql); await installCurrentSchemaFixture(env);
    if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
    env.DB.exec(`INSERT INTO kv (k, seq, v) VALUES ('${PK['d2.seized']}', 0, '{"reports":[{"id":"tstsz2","loc":"TEST_ONLY","test":"TEST_ONLY"}]}')`);   /* بياناتٌ من قبل إطفاء الصفحة لـd2 */
    env.DB.exec(`INSERT OR REPLACE INTO revs (k, rev) VALUES ('${PK['d2.seized']}', 1)`);
    const pv = val(await C.api('/api/get?keys=bassam_platform_v1', { cookie: su.ck }), 'bassam_platform_v1') || {}; pv.mods = Object.assign({}, pv.mods, { off: ['seized'] });
    assert.deepEqual((await C.save(su.ck, { bassam_platform_v1: JSON.stringify(pv) })).j.denied, {}, 'مديرُ النظام يطفئ «المضبوطات» على مستوى المنصة');
    const DEF_ENF = {};   /* KIVO_264 (دمج): بعد الإصلاح لا قيمةَ لأحدٍ في الإدارة في الوضعين (كان في 263: dm1 [d1] · gm [d1 · d2] · dm2 [d2] — عيب) */
    for (const who of ['dm1', 'gm', 'dm2', 'sup1', 'emp2']) {
      const l = await C.login(ACC[who][0], ACC[who][1]); assert.ok(l.ok, who);
      const r = await C.api('/api/get?keys=' + encodeURIComponent(PK['d1.seized'] + ',' + PK['d2.seized']), { cookie: l.ck }); assert.equal(r.status, 200);
      const read = ['d1.seized', 'd2.seized'].filter(x => r.j.keys[PK[x]] && r.j.keys[PK[x]].v != null);
      const bk = ((await C.boot(l.ck)).boot || {}).keys || {}, inBoot = ['d1.seized', 'd2.seized'].filter(x => bk[PK[x]] != null);
      const exp = mode === 'enforce' ? (DEF_ENF[who] || []) : [];
      assert.deepEqual(read, exp, `${mode} ${who}: /api/get`); assert.deepEqual(inBoot, exp, `${mode} ${who}: حقنُ الإقلاع`);
      if (read.length) t.diagnostic(`QA-264-D1 [${mode}] ${who} يقرأ قيمةَ ${read.join(' · ')} (وحدةٌ مطفأة/خارج سقف الإدارة) — القديمُ يمنعها`);
      const k = PK[DEPTS_OF[who][0] === 'tst_d2' ? 'd2.seized' : 'd1.seized'], cur = r.j.keys[k] && r.j.keys[k].v ? JSON.parse(r.j.keys[k].v) : { reports: [] };
      cur.reports.push({ id: 'szk264' + who, ts: Date.now(), loc: 'TEST_ONLY', shift: 'TST-A' });
      const s = await C.save(l.ck, { [k]: JSON.stringify(cur) }, [], { [k]: (r.j.keys[k] || {}).rev || 0 });
      assert.equal(s.status, 200); assert.ok(s.j.denied && s.j.denied[k], `${mode} ${who}: الكتابةُ مرفوضة`);
    }
  }
});
