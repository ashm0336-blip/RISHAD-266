/* KIVO_264 · «ملفي» — مسارا القراءة الذاتية (قرارُ المالك OD-3): GET /api/me/today · GET /api/me/history?ym=YYYY-M
   على العامل الحقيقي فوق المُثبِّت (tests/fixtures/gen_fixture.py) — والحالةُ المخزَّنة تُعدَّل بـSQL كما يزرعها المُثبِّت:
   (١) الموظفُ المرتبط (tst_emp1): يومُه من صفوفه وحدها — والردُّ لا يحمل مفتاحَ موظفٍ آخر ولا اسمَه ولا اسمَ دخولٍ ولا بصمة
   (٢) الزملاء (OD-4) لراصد الميدان: العنصرُ نفسُه · ورديتُه · ليس في راحة · لا غياب · لا تحويل — بالاسم وحده
   (٣) مديرُ الإدارة المعيَّن · المديرُ العام · مديرُ النظام: linked=false ولا حقائقَ يوم · والموظفُ بصفة مدير يرى يومَه (OD-6)
   (٤) حسابٌ مفتاحُه اسمُ موظف: لا ربطَ ولا بيانات (لا ربطَ بالاسم أبداً) · حسابٌ قديمٌ مفتاحُه رقمُ الهوية: يرتبط (OD-9)
   (٥) «السجل»: فئةُ الدليل لكل يوم (تقريرٌ معتمد ⇒ saved_approved · مسحوبٌ ⇒ saved_open · بلا تقرير ⇒ none · بعد اليوم ⇒ future) —
       لا إعادةَ بناءٍ من الحالة الحالية · التغييراتُ المسجّلة (aud) على صفّه وحده بفاعلها ووقتها · والتنقّلُ بين الإدارات «لا أدلة» صراحةً
   (٦) العقد: 400 bad-ym · 405 لغير GET · 401 بلا جلسة · جولاتُ D1 محدودة
   (٧) حسابٌ بمفتاحٍ ثابتٍ لا سجلَّ له (غيرُ مرتبط): حقائقُه من صفوف مفتاحه — بلا زملاء (OD-4: لموظفٍ مرتبطٍ وحده) ولا اسمَ لأحد
   (٨) حدُّ المعدّل: 120 طلباً/دقيقة لكل حساب للمسارين معاً ⇒ 429 بمهلة إعادة (retry) — ولا يمسّ حساباً آخر. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, WORKER, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const HAS = (() => { try { return fs.readFileSync(WORKER, 'utf8').includes('function meSelfRoutes('); } catch (e) { return false; } })();
const G = HAS ? {} : { skip: 'العاملُ المختبَر بلا مساري /api/me/today · /api/me/history (أقدمُ من KIVO_264)' };
const WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
/* يومُ الرياض التقويميّ (أم القرى) — كما يحسبه المساران (لا مهلةَ ثلاث ساعات: اليومُ التشغيليّ تحدّده الورديةُ الليلية وحدها — OD-10) */
const hij = (ts) => { const o = {}; new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(ts)).forEach((p) => { o[p.type] = +p.value; }); return { y: o.year, m: o.month, d: o.day, wd: WD[new Date(ts + 3 * 3600000).getUTCDay()] }; };
const T = hij(Date.now());
const MK = T.y + '-' + T.m, DAY = MK + '-' + T.d, PM = T.m === 1 ? { y: T.y - 1, m: 12 } : { y: T.y, m: T.m - 1 }, PMK = PM.y + '-' + PM.m, PDAY = PMK + '-10';
const TAG = 'TEST_ONLY', SA = 'TST-A', SB = 'TST-B';
const K = (r) => 'bsdept:tst_d1:' + r;
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const stored = (env, k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k); return r.length ? JSON.parse(r.map((x) => x.v).join('')) : null; };
const BUMP = (k) => ["INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);",
  'INSERT INTO revs (k, rev) VALUES (' + q(k) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;"];
async function putKey(env, k, v) {
  await applySql(env.DB, ['DELETE FROM kv WHERE k = ' + q(k) + ';', 'INSERT INTO kv (k, seq, v) VALUES (' + q(k) + ', 0, ' + q(JSON.stringify(v)) + ');'].concat(BUMP(k)).join('\n'));
  assert.deepEqual(stored(env, k), v, 'الزرع: ' + k);
}
async function edit(env, k, fn) { const v = stored(env, k); fn(v); await putKey(env, k, v); }
function seedSql() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_me_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', DAY, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
/* أسماءُ المُثبِّت ومفاتيحُه — لفحص «لا يظهر في الردّ» */
const NM = (s) => TAG + ' · ' + s;
const OTHERS = ['مشرف الوردية أ', 'مشرف الوردية ب', 'راصد ميدان', 'موظف بعدسة المصليات', 'موظف بلا عدسة المصليات', 'موظف بصلاحية بلا نطاق', 'موظف بنطاق بلا صلاحية', 'موظف الاستيراد', 'مدخل إحصائيات الحرم', 'موظف الإدارة ٢'];
async function world(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'admin');
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, seedSql());
  await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const login = async (u, p) => { const r = await C.login(u, p); assert.ok(r.ok, 'دخول ' + u + ': ' + JSON.stringify(r.j).slice(0, 120)); return r.ck; };
  const get = (p, ck) => C.api(p, { cookie: ck });
  return { env, C, su, login, get };
}
const txt = (j) => JSON.stringify(j);

test('(١) tst_emp1: يومُه من صفوفه وحدها — بالمعرّف الثابت · ولا مفتاحَ ولا اسمَ لغيره ولا اسمَ دخول ولا بصمة', G, async () => {
  for (const mode of ['legacy', 'enforce']) {
    const W = await world(mode), ck = await W.login('0000000113', '70113');
    const r = await W.get('/api/me/today', ck), j = r.j;
    assert.equal(r.status, 200, mode + ': ' + txt(j).slice(0, 200));
    assert.deepEqual(Object.keys(j).sort(), ['account', 'day', 'facts', 'identity', 'mates', 'matesN', 'mon', 'ok', 'site', 'v', 'week'], 'مفاتيحُ العقد بالضبط');
    assert.deepEqual(j.day, Object.assign({ dk: DAY, ym: MK, op: 'calendar' }, T, { wd: T.wd }), 'اليومُ يومُ الرياض (ورديةٌ نهارية ⇒ تقويميّ)');
    assert.deepEqual(j.identity, { rec: { name: NM('موظف الوردية أ'), empno: '70113', type: TAG + ' رسمي', work: TAG + ' مراقب' }, linked: true, by: 'eid', keyed: true });
    assert.deepEqual(j.account, { id: 'tst_emp1', role: 'staff', deptId: 'tst_d1', dept: TAG + ' · إدارة اختبار ١', mgr: false, appointed: false });
    assert.equal(j.facts.shift.name, SA); assert.equal(j.facts.shift.src, 'report'); assert.deepEqual(j.facts.shift.def, { tStart: '06:00', tEnd: '14:00', src: 'current' });
    assert.equal(j.facts.status.st, 'pr'); assert.equal(j.facts.report.mine, true); assert.equal(j.facts.report.approved, false);
    assert.deepEqual(j.facts.month, { locked: false, has: true });
    assert.equal(j.site.official, null); assert.equal(j.site.draft, null); assert.equal(j.site.today, null, 'لا عنصرَ له في الخطة ولا الجولة');
    assert.deepEqual(j.mates, []); assert.equal(j.week.length, 7); assert.equal(j.week[6].dk, DAY); assert.deepEqual(j.week[6].act, { code: 'pr', approved: false });
    assert.deepEqual(j.mon, { pr: 1, ab: 0, pm: 0, lv: 0, tout: 0, n: 1, ap: 0 });
    const t = txt(j);
    assert.ok(!/tst_e_/.test(t), 'لا مفتاحَ موظفٍ في الردّ (ولا مفتاحُه هو)');
    for (const n of OTHERS) assert.ok(!t.includes(n), 'لا اسمَ لغيره: ' + n);
    assert.ok(!/0000000\d{3}/.test(t) && !/"ph"|"un"|p2\$/.test(t), 'لا اسمَ دخولٍ ولا بصمة');
  }
});

test('(٢) OD-4 · راصدُ الميدان: الزملاءُ بالاسم وحده — العنصرُ نفسُه وورديتُه، لا راحة ولا غياب ولا تحويل · والمسودةُ ليست إسناداً رسمياً (OD-5)', G, async () => {
  const W = await world();
  /* بابُ الجولة الأول لراصد الميدان ومعه: زميلٌ حاضرٌ في ورديته · مشرفُ الوردية ب · مشرفُ أ غائب · موظفٌ في راحته اليوم · موظفٌ محوَّل إلى ب */
  await edit(W.env, K('bassam_rounds_v1'), (v) => { v[DAY].d[0].gates[0].emp = ['tst_e_field', 'tst_e_lens_on', 'tst_e_supB', 'tst_e_sup1', 'tst_e_pnos', 'tst_e_snop']; });
  await edit(W.env, K('bassam_dreport_v1'), (v) => {
    const a = v[DAY].shifts[SA], b = v[DAY].shifts[SB];
    a.roster = a.roster.filter((r) => r.ekey !== 'tst_e_snop').map((r) => (r.ekey === 'tst_e_sup1' ? Object.assign({}, r, { st: 'ab' }) : r));
    a.tout = { tst_e_snop: { to: SB, why: TAG } }; b.roster.push({ ekey: 'tst_e_snop', st: 'pr', shift: SB, tin: 1, tfrom: SA });
  });
  await edit(W.env, K('bassam_staffing_v3'), (v) => { v[MK].tst_e_pnos.rest = [T.wd]; });
  const ck = await W.login('0000000118', '70118');
  const j = (await W.get('/api/me/today', ck)).j, t = txt(j);
  assert.deepEqual(j.mates, [NM('موظف بعدسة المصليات')], t.slice(0, 400)); assert.equal(j.matesN, 1);
  for (const n of ['مشرف الوردية ب', 'مشرف الوردية أ', 'موظف بصلاحية بلا نطاق', 'موظف بنطاق بلا صلاحية']) assert.ok(!t.includes(n), 'مستبعَد: ' + n);
  assert.ok(!/tst_e_/.test(t), 'الزملاءُ بلا مفاتيح');
  assert.equal(j.site.official, null, 'خطةُ الشهر مسودة ⇒ لا إسنادَ رسمي'); assert.equal(j.site.draft.label, 'باب 1'); assert.equal(j.site.draftN, 4);
  assert.equal(j.site.today.label, 'باب 1'); assert.equal(j.site.todayN, 4); assert.equal(j.site.round, true);
});

test('(٣) مديرُ الإدارة المعيَّن · المديرُ العام · مديرُ النظام: لا ربط ولا حقائقَ يوم — والموظفُ بصفة مدير يرى يومَه (OD-6)', G, async () => {
  const W = await world();
  const ph = stored(W.env, 'bassam_auth_users_v1').find((u) => u.id === 'tst_emp1').ph;
  await edit(W.env, 'bassam_auth_users_v1', (v) => { v.push({ id: 'tst_em264', un: '0000000197', ph, name: NM('موظف بصفة مدير'), role: 'staff', deptId: 'tst_d1', ekey: 'tst_e_ds', mgr: true, dis: 0, test: TAG }); v.find((u) => u.id === 'tst_ds').dis = 1; });   /* KIVO_265 · R-24: حسابٌ نشطٌ واحدٌ للسجلّ (حسابُ المُثبِّت tst_ds معطَّل) — حسابان نشطان لسجلٍّ واحد لا يُربط أيٌّ منهما */
  for (const [un, pw, id, role] of [['0000000101', '70101', 'tst_dm1', 'staff'], ['0000000103', '70103', 'tst_gm1', 'gm'], [null, null, 'admin', 'super']]) {
    const ck = un ? await W.login(un, pw) : W.su.ck;
    const a = (await W.get('/api/me/today', ck)).j, h = (await W.get('/api/me/history', ck)).j;
    assert.equal(a.ok, 1, id); assert.equal(a.account.role, role, id);
    assert.deepEqual([a.identity.linked, a.identity.keyed, a.identity.rec, a.facts, a.site], [false, false, null, null, null], id + ': ' + txt(a).slice(0, 200));
    assert.equal(h.ok, 1); assert.equal(h.month, null, id); assert.deepEqual(h.days, []); assert.deepEqual(h.changes, []);
    for (const n of OTHERS.concat(['موظف الوردية أ'])) assert.ok(!txt(a).includes(n) && !txt(h).includes(n), id + ': لا بياناتِ موظفين — ' + n);
    assert.ok(!/"ph"|"tok"|p1\$|p2\$/.test(txt(a) + txt(h)), id + ': لا بصماتٍ ولا رموزَ جلسة');
    if (id === 'tst_dm1') assert.deepEqual([a.account.mgr, a.account.appointed], [true, true]);
  }
  const em = (await W.get('/api/me/today', await W.login('0000000197', '70113'))).j;
  assert.equal(em.identity.linked, true); assert.equal(em.account.mgr, true); assert.equal(em.account.appointed, false);
  assert.equal(em.facts.shift.name, SA, 'الموظفُ بصفة مدير يبقى موظفاً بيومه');
});

test('(٤) لا ربطَ بالاسم أبداً — وحسابٌ قديمٌ مفتاحُه رقمُ الهوية يرتبط بسجلّه (OD-9)', G, async () => {
  const W = await world();
  const ph = stored(W.env, 'bassam_auth_users_v1').find((u) => u.id === 'tst_emp1').ph;
  await edit(W.env, K('bassam_employees_v1'), (v) => { v.find((e) => e.eid === 'tst_e_imp').nid = '1999999999'; });
  await edit(W.env, 'bassam_auth_users_v1', (v) => {
    v.push({ id: 'tst_nm264', un: '0000000199', ph, name: NM('حساب مفتاحه اسم'), role: 'staff', deptId: 'tst_d1', ekey: NM('موظف الوردية أ'), dis: 0, test: TAG });
    v.push({ id: 'tst_nid264', un: '0000000198', ph, name: NM('حساب قديم'), role: 'staff', deptId: 'tst_d1', ekey: '1999999999', dis: 0, test: TAG });
    v.find((u) => u.id === 'tst_imp').dis = 1;   /* KIVO_265 · R-24: الحسابُ القديم وحده نشطٌ لسجلّه (حسابُ المُثبِّت tst_imp بمعرّفه الثابت معطَّل) */
  });
  const a = (await W.get('/api/me/today', await W.login('0000000199', '70113'))).j;
  assert.deepEqual([a.identity.linked, a.identity.by, a.identity.keyed, a.facts], [false, 'none', false, null], txt(a).slice(0, 300));
  assert.ok(!txt(a).includes('70113') && !txt(a).includes(SA), 'لا شيءَ من سجلّ السَّميّ');
  const b = (await W.get('/api/me/today', await W.login('0000000198', '70113'))).j;
  assert.deepEqual([b.identity.linked, b.identity.by, b.identity.rec.name, b.identity.rec.nid], [true, 'nid', NM('موظف الاستيراد'), '1999999999']);
  assert.equal(b.facts.shift.name, SB, 'صفوفُه بالمعرّف الثابت (eid) بعد الربط برقم الهوية');
});

test('(٤ب) رقمُ هويةٍ مكرَّر في سجلّ الإدارة (خطأُ إدخال) لا يُسند بياناتِ زميلٍ إلى أحد — لا رمزاً للمرتبط ولا مفتاحاً لغير المرتبط (مراجعةُ SR-2.1 · F-1)', G, async () => {
  for (const mode of ['legacy', 'enforce']) {
    const W = await world(mode), DUP = '1888888888';
    const ph = stored(W.env, 'bassam_auth_users_v1').find((u) => u.id === 'tst_emp1').ph;
    await edit(W.env, K('bassam_employees_v1'), (v) => { v.find((e) => e.eid === 'tst_e_emp1').nid = DUP; v.find((e) => e.eid === 'tst_e_imp').nid = DUP; });
    /* صفُّ الزميل (tst_e_imp · ورديته ب) محفوظٌ برقم الهوية المكرَّر وحده — وصفُّ tst_e_emp1 بمعرّفه غائب */
    await edit(W.env, K('bassam_staffing_v3'), (v) => { v[MK][DUP] = v[MK].tst_e_imp; delete v[MK].tst_e_imp; delete v[MK].tst_e_emp1; });
    await edit(W.env, 'bassam_auth_users_v1', (v) => { v.push({ id: 'tst_dup264', un: '0000000196', ph, name: NM('حساب برقم هوية مكرر'), role: 'staff', deptId: 'tst_d1', ekey: DUP, dis: 0, test: TAG }); });
    /* (أ) المرتبطُ بمعرّفه (tst_emp1): رقمُ هويته المكرَّر ليس رمزاً له ⇒ لا يرى صفَّ الزميل المحفوظ به */
    const ckA = await W.login('0000000113', '70113');
    const hA = (await W.get('/api/me/history', ckA)).j, aA = (await W.get('/api/me/today', ckA)).j;
    assert.equal(aA.identity.linked, true, mode); assert.equal(aA.identity.by, 'eid', mode);
    assert.ok(!(hA.month && hA.month.has), mode + ': لا صفَّ شهرٍ له — المحفوظُ بالرقم المكرَّر ليس له: ' + txt(hA.month));
    assert.ok(!(hA.month && hA.month.shift === SB), mode + ': لا ورديةَ الزميل');
    /* (ب) حسابٌ مفتاحُه الرقمُ المكرَّر: غيرُ مرتبط ولا يقرأ بمفتاحه (يطالب به سجلّان) */
    const ckB = await W.login('0000000196', '70113');
    const aB = (await W.get('/api/me/today', ckB)).j, hB = (await W.get('/api/me/history', ckB)).j;
    assert.deepEqual([aB.identity.linked, aB.identity.by, aB.identity.keyed, aB.facts], [false, 'none', false, null], mode + ': ' + txt(aB).slice(0, 300));
    assert.ok(!(hB.month && hB.month.has), mode + ': لا شهرَ بمفتاحٍ يطالب به سجلّان: ' + txt(hB.month));
    assert.ok(!txt(aB).includes(SB) && !txt(hB).includes(SB), mode + ': لا شيءَ من صفّ الزميل');
  }
});

test('(٥) «السجل»: دليلُ كل يوم — لا إعادةَ بناء · التغييراتُ المسجّلة على صفّه وحده · والتنقّلُ «لا أدلة» صراحةً', G, async () => {
  const W = await world(), ck = await W.login('0000000113', '70113');
  const cur = (await W.get('/api/me/history', ck)).j;
  assert.deepEqual(Object.keys(cur).sort(), ['account', 'changes', 'days', 'evidence', 'identity', 'month', 'moves', 'ok', 'range', 'sites', 'today', 'v', 'ym'], 'مفاتيحُ العقد');
  assert.equal(cur.ym, MK);
  assert.deepEqual([cur.month.has, cur.month.locked, cur.month.shift, cur.month.ev, cur.month.defEv], [true, false, SA, 'saved_open', 'current'], 'الجدولُ غيرُ معتمد · وقتُ الوردية من التعريفات الحالية لا لقطةَ الشهر');
  const dT = cur.days.find((x) => x.d === T.d);
  assert.deepEqual([dT.rep, dT.ev, dT.act.st], ['pulled', 'saved_open', 'pr']);
  cur.days.filter((x) => x.d < T.d).forEach((x) => { assert.equal(x.act, null, 'يوم ' + x.d + ': لا تقرير ⇒ لا حالةَ مفترَضة'); assert.equal(x.ev, 'none'); });
  cur.days.filter((x) => x.d > T.d).forEach((x) => assert.equal(x.ev, 'future'));
  assert.deepEqual([cur.evidence.reports, cur.evidence.approved], [1, 0]);
  assert.equal(cur.moves.ev, 'none'); assert.match(cur.moves.note, /^لا يوجد تاريخُ تنقّلٍ بين الإدارات — النقلُ بين الإدارات غيرُ مدعومٍ في النظام حالياً/, 'قرارُ المالك: لا نقلَ الآن — يُصرَّح بذلك');
  assert.ok(!/OD-1|معلَّق/.test(cur.moves.note), 'لا «قرارٌ معلَّق» بعد حسم المالك');
  const prev = (await W.get('/api/me/history?ym=' + PMK, ck)).j;
  assert.deepEqual([prev.month.locked, prev.month.ev], [true, 'saved_approved'], 'الشهرُ السابق معتمدٌ ومقفل');
  const d10 = prev.days.find((x) => x.d === 10);
  assert.deepEqual([d10.rep, d10.ev, d10.act.st], ['approved', 'saved_approved', 'pr'], 'تقريرٌ معتمد');
  assert.ok(prev.days.filter((x) => x.d !== 10).every((x) => x.act === null && x.ev === 'none'));
  assert.equal(prev.range.first, PMK); assert.equal(prev.range.cur, MK);
  /* مديرُ الإدارة يغيّر ورديةَ tst_emp1 وراحةَ مشرف الوردية أ في حفظةٍ واحدة — كما تُرسل الواجهةُ أحداثَ سجل الأنشطة */
  const dm = await W.login('0000000101', '70101'), k = K('bassam_staffing_v3'), v = stored(W.env, k);
  v[MK].tst_e_emp1.shift = SB; v[MK].tst_e_sup1.rest = ['الجمعة'];
  const base = (await W.C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: dm })).j.keys[k].rev;
  const aud = [{ cid: 'tstme264a01', k, etype: 'staffing', act: 'reassigned', eid: 'tst_e_emp1', ename: NM('موظف الوردية أ'), ctx: { plan: MK }, before: { shift: SA }, after: { shift: SB } },
    { cid: 'tstme264a02', k, etype: 'staffing', act: 'edited', eid: 'tst_e_sup1', ename: NM('مشرف الوردية أ'), ctx: { plan: MK }, before: null, after: { f: { rest: [[], ['الجمعة']] } } }];
  const sv = await W.C.api('/api/save', { method: 'POST', cookie: dm, body: { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: base }, aud } });
  assert.ok(sv.j.revs && sv.j.revs[k], 'الحفظ: ' + txt(sv.j).slice(0, 200));
  const after = (await W.get('/api/me/history', ck)).j;
  assert.equal(after.changes.length, 1, 'تغييرُ صفّه وحده: ' + txt(after.changes));
  const c = after.changes[0];
  assert.deepEqual([c.act, c.f, c.by, c.ev], ['reassigned', { shift: [SA, SB] }, NM('مدير الإدارة ١'), 'logged_change']);
  assert.ok(c.ts > 0 && after.evidence.auditSince > 0);
  assert.ok(!/tst_e_|0000000101/.test(txt(after)), 'لا مفاتيحَ ولا اسمَ دخول الفاعل');
  assert.equal(after.month.shift, SB, 'الجدولُ الآن');
  assert.ok(Buffer.byteLength(txt(after)) <= 60000);
  const pv = (await W.get('/api/me/history?ym=' + PMK, ck)).j;
  assert.equal(pv.changes.length, 0, 'تغييرُ هذا الشهر لا يظهر في شهرٍ آخر');
});

test('(٦) العقد: 400 bad-ym · 405 لغير GET · 401 بلا جلسة · جولاتُ D1 محدودة · tst_emp2 بلا جدول ⇒ «لا جدول» لا حقائقَ مختلقة', G, async () => {
  const W = await world(), ck = await W.login('0000000113', '70113');
  const nx = T.m >= 11 ? (T.y + 1) + '-' + (T.m - 10) : T.y + '-' + (T.m + 2);
  for (const ym of ['1448-13', 'abc', '1399-12', '1448-0', nx, MK + '-1', ' ']) {
    const r = await W.get('/api/me/history?ym=' + encodeURIComponent(ym), ck);
    assert.equal(r.status, 400, ym); assert.deepEqual(r.j, { ok: 0, err: 'bad-ym' });
  }
  assert.equal((await W.get('/api/me/history?ym=' + MK, ck)).status, 200);
  for (const p of ['/api/me/today', '/api/me/history']) {
    const r = await W.C.api(p, { method: 'POST', cookie: ck, body: {} });
    assert.equal(r.status, 405, p); assert.deepEqual(r.j, { ok: 0, err: 'read-only' });
    assert.equal((await W.C.api(p)).status, 401, p + ' بلا جلسة');
    assert.equal((await W.C.api(p, { headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' } })).status, 401, p + ' من أصلٍ آخر بلا جلسة');
    assert.notEqual((await W.C.api(p, { method: 'POST', cookie: ck, body: {}, headers: { origin: 'https://evil.example' } })).status, 200, p + ' POST من أصلٍ آخر');
  }
  const count = async (fn) => { W.env.DB.trips = 0; const r = await fn(); return { n: W.env.DB.trips, r }; };
  /* +1 مسموحة: كنسُ نوافذ حدّ المعدّل (احتمالُه 3% في أول طلبٍ من النافذة) */
  const a = await count(() => W.get('/api/me/today', ck)); assert.equal(a.r.status, 200); assert.ok(a.n <= 4, '/api/me/today = ' + a.n + ' جولة');
  const b = await count(() => W.get('/api/me/history', ck)); assert.equal(b.r.status, 200); assert.ok(b.n <= 5, '/api/me/history = ' + b.n + ' جولة');
  const e2 = await W.login('0000000121', '70121');
  const t2 = (await W.get('/api/me/today', e2)).j, h2 = (await W.get('/api/me/history', e2)).j;
  assert.deepEqual([t2.identity.linked, t2.facts.known, t2.facts.shift.name, t2.facts.status.code], [true, false, '', '']);
  assert.deepEqual([h2.month.has, h2.month.ev], [false, 'none']); assert.ok(h2.days.every((x) => x.act === null && (x.ev === 'none' || x.ev === 'future')));
  assert.ok(!txt(t2).includes(TAG + ' · موظف الوردية أ') && !/tst_e_/.test(txt(t2) + txt(h2)), 'إدارةٌ أخرى: لا شيءَ من tst_d1');
});

test('(٧) OD-4: الزملاءُ لموظفٍ مرتبطٍ بسجلّه وحده — حسابٌ بمفتاحٍ لا سجلَّ له يرى حقائقَ صفوفه بلا اسمِ أحد', G, async () => {
  const W = await world();
  const ph = stored(W.env, 'bassam_auth_users_v1').find((u) => u.id === 'tst_emp1').ph;
  /* حسابٌ مفتاحُه معرّفٌ ثابت لا سجلَّ له في «موظفو الإدارة» — مسكَّنٌ على بابٍ معه زميلان حاضران في ورديته */
  await edit(W.env, 'bassam_auth_users_v1', (v) => { v.push({ id: 'tst_gone264', un: '0000000196', ph, name: NM('حساب بلا سجل'), role: 'staff', deptId: 'tst_d1', ekey: 'tst_e_gone264', dis: 0, test: TAG }); });
  await edit(W.env, K('bassam_staffing_v3'), (v) => { v[MK].tst_e_gone264 = { shift: SA, rest: [] }; });
  await edit(W.env, K('bassam_rounds_v1'), (v) => { v[DAY].d[0].gates[0].emp = ['tst_e_gone264', 'tst_e_field', 'tst_e_lens_on']; });
  const j = (await W.get('/api/me/today', await W.login('0000000196', '70113'))).j, t = txt(j);
  assert.deepEqual([j.identity.linked, j.identity.by, j.identity.keyed, j.identity.rec], [false, 'none', true, null], t.slice(0, 300));
  assert.equal(j.facts.shift.name, SA, 'حقائقُه من صفوف مفتاحه (D11)'); assert.ok(j.site.today, 'تسكينُ اليوم من صفوف مفتاحه');
  assert.deepEqual([j.mates, j.matesN], [[], 0], 'غيرُ المرتبط لا يُعطى أسماءَ زملاء');
  for (const n of OTHERS.concat(['موظف الوردية أ'])) assert.ok(!t.includes(n), 'لا اسمَ لأحد: ' + n);
  assert.ok(!/tst_e_(?!gone264)/.test(t), 'لا مفتاحَ لموظفٍ آخر');
  /* والموظفُ المرتبطُ على الباب نفسِه يرى زميلَه (القاعدةُ نفسُها كما في (٢)) */
  const f = (await W.get('/api/me/today', await W.login('0000000118', '70118'))).j;
  assert.equal(f.identity.linked, true); assert.deepEqual(f.mates, [NM('موظف بعدسة المصليات')]);
});

test('(٨) حدُّ المعدّل: 120 طلباً في الدقيقة لكل حساب للمسارين معاً ⇒ 429 بمهلة إعادة — ولا يمسّ حساباً آخر', G, async () => {
  const W = await world(), ck = await W.login('0000000113', '70113');
  const win = Math.floor(Date.now() / 60000);
  /* النافذةُ الجارية والتالية (حدُّ الدقيقة لا يُفلت الاختبار) مُستنفدتان لحساب tst_emp1 وحده */
  await applySql(W.env.DB, [win, win + 1].map((w) => "INSERT INTO guard (gk, n, until) VALUES ('rl:me:tst_emp1:" + w + "', 120, " + ((w + 1) * 60000) + ') ON CONFLICT(gk) DO UPDATE SET n = 120;').join('\n'));
  for (const p of ['/api/me/today', '/api/me/history']) {
    const r = await W.get(p, ck);
    assert.equal(r.status, 429, p + ': ' + txt(r.j).slice(0, 120)); assert.equal(r.j.ok, 0); assert.ok(+r.j.retry >= 1, p + ': retry');
    assert.deepEqual(Object.keys(r.j).sort(), ['err', 'ok', 'retry'], p + ': مفاتيحُ العقد');
  }
  assert.equal((await W.get('/api/me/history?ym=abc', ck)).status, 400, 'الصيغةُ تُفحص قبل العدّ');
  assert.equal((await W.get('/api/me/today', await W.login('0000000118', '70118'))).status, 200, 'حسابٌ آخر لا يتأثر');
});
