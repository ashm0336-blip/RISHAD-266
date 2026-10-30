/* KIVO_264 · نطاقُ الوردية المربوطُ بالجدول الشهري (Shift: staffing-bound) في الإنفاذ:
   ورديةُ الموظف تُقرأ من bsdept:<d>:bassam_staffing_v3 لحظةَ الإسقاط (enfViewCtx.shiftOk) — فحفظةٌ في الجدول تنقله من ورديةٍ إلى أخرى تغيّر ما يراه من
   الاسترشاد والتقرير والجولات والجدول نفسِه، ومراجعاتُ تلك الموارد لا تتغيّر؛ و/api/changes كان لا يرفع az إلا للصلاحيات/الحسابات/الهيكل/المنصة
   ونطاقِ إداراته ومنحِها — فيبقى التبويبُ على إسقاطه القديم (وتُرفض كتاباتُه «scope» لأن ما يرسله لم يعد إسقاطَ المخزَّن) حتى إعادة التحميل.
   العقد: (١) حفظةٌ تمسّ الجدول الشهري لإدارةٍ من إداراته ⇒ az:1 لمن ورديتُه مربوطةٌ بالجدول فيها (لا لفاعلي السقف R4 ولا لـn/a ولا للقائمة الصريحة)
          (٢) وصفُ صلاحياته (/api/authz و__BS_BOOT.authz — enfMe) يحمل ورديتَه الفعلية sb = { '<y>-<m>': وردية } فيتغيّر حين تتغيّر هي وحدها —
              وعميلُ 264 (280 · D-4) يجدّد الموارد المُسقَطة حين يتغيّر الوصف بعد az؛ وزميلٌ لم تتغيّر ورديتُه يأخذ az ووصفُه كما هو فلا يُعاد جلبُ شيء. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, WORKER, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installIrshadFixture } from './irshad_legacy_seed_fx.mjs';
const FIX = fs.readFileSync(WORKER, 'utf8').includes('enfShiftBound') || process.env.KIVO_K264_STRICT ? {} : { skip: 'العاملُ المختبَر قبل KIVO_264 (az للوردية المربوطة بالجدول)' };
const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); return o; })();
const MK = T.year + '-' + T.month, PMK = T.month === 1 ? (T.year - 1) + '-12' : T.year + '-' + (T.month - 1);
const KST = 'bsdept:tst_d1:bassam_staffing_v3', KIR = 'bsdept:tst_d1:bassam_irshad_v1';
function seedSql() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_k264az_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.year + '-' + T.month + '-' + T.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const curRev = (env) => +(env.DB.q("SELECT v FROM meta WHERE k = 'rev'")[0] || { v: 0 }).v || 0;
const revOf = (env, k) => { const r = env.DB.q('SELECT rev FROM revs WHERE k = ?1', k)[0]; return r ? r.rev : 0; };

test('[enforce] الجدولُ الشهري يغيّر ورديةَ موظفٍ مربوطٍ به ⇒ az · ووصفُ صلاحياته (sb) يتغيّر له وحده · لا az لفاعل السقف ولا لـn/a ولا لحفظةٍ خارج الجدول', FIX, async () => {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await applySql(env.DB, seedSql());
  await installIrshadFixture(env);
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const L = {}; for (const [w, u, p] of [['supB', '0000000112', '70112'], ['emp1', '0000000113', '70113'], ['imp', '0000000119', '70119'], ['dm1', '0000000101', '70101']]) { const l = await C.login(u, p); assert.ok(l.ok, w); L[w] = l.ck; }
  const meOf = async (w) => { const r = await C.api('/api/authz', { cookie: L[w] }); assert.equal(r.status, 200, w + ' /api/authz'); return r.j.me.depts.tst_d1; };
  const irRead = async w => { const r = await C.api('/api/irshad?dept=tst_d1&view=records', { cookie: L[w] }); assert.equal(r.status, 200, JSON.stringify(r.j)); return r.j; };
  const irIds = async w => (await irRead(w)).rows.map(r => r.id).sort();
  const changes = async (w, since) => (await C.api('/api/changes?since=' + since, { cookie: L[w] })).j;

  /* (٢) الوصفُ قبل: ورديةُ مشرف ب الفعلية من الجدول — والإقلاعُ يحمل الوصفَ نفسَه */
  const supB0 = await meOf('supB'), emp10 = await meOf('emp1');
  assert.deepEqual(supB0.sb, { [MK]: 'TST-B', [PMK]: 'TST-B' }, 'sb = ورديتُه في كلّ شهرٍ من الجدول');
  assert.deepEqual(emp10.sb, { [MK]: 'TST-A', [PMK]: 'TST-A' });
  assert.deepEqual((await C.boot(L.supB)).boot.authz.depts.tst_d1, supB0, 'الإقلاعُ = /api/authz');
  assert.ok(!('sb' in (await meOf('imp'))), 'n/a: لا sb'); assert.ok(!('sb' in (await meOf('dm1'))), 'فاعلُ السقف: لا sb');
  assert.deepEqual(await irIds('supB'), ['tstir2'], 'قبل: الاسترشادُ بإسقاط TST-B');

  /* ضابط: حفظةٌ خارج الجدول (الاسترشاد) لا ترفع az للمربوط */
  const v0 = curRev(env);
  const s0 = await C.api('/api/irshad/act', { cookie: L.dm1, method: 'POST', body: { uid: 'tst_dm1', dept: 'tst_d1', requestId: 'TEST_ONLY_k264_staffing_control', base: (await irRead('dm1')).base, op: 'create', data: { y: T.year, m: T.month, d: T.day, loc: 'TEST_ONLY موقع', shift: 'TST-A', eid: 'tst_e_emp1', langs: [{ lang: 'TEST_ONLY لغة', count: 1 }], bro: 0, pros: 0, pol: 0 }, reason: 'TEST_ONLY staffing unrelated mutation' } });
  assert.equal(s0.status, 200, JSON.stringify(s0.j)); assert.equal(s0.j.ok, 1, 'مديرُ الإدارة يضيف محضراً بالواجهة العلائقية'); assert.ok(s0.j.id);
  const c0 = await changes('supB', v0); assert.ok(c0.keys.includes(KIR), 'يرى تغيّرَ الاسترشاد'); assert.ok(!c0.az, 'لا az لحفظةٍ خارج الجدول');

  /* (١) مديرُ الإدارة ينقل مشرف ب إلى TST-A في الشهر الحالي */
  const v1 = curRev(env), irRev = revOf(env, KIR);
  const st = JSON.parse((await C.api('/api/get?keys=' + encodeURIComponent(KST), { cookie: L.dm1 })).j.keys[KST].v);
  st[MK].tst_e_supB.shift = 'TST-A';
  const s1 = await C.save(L.dm1, { [KST]: JSON.stringify(st) }); assert.deepEqual(s1.j.denied, {}, 'حفظُ الجدول'); assert.deepEqual(s1.j.conflicts, {});
  const c1 = await changes('supB', v1);
  assert.ok(c1.keys.includes(KST), 'الجدولُ في التغيّرات'); assert.equal(c1.az, 1, 'az: ورديتُه مربوطةٌ بالجدول الذي تغيّر');
  assert.equal(c1.am, 'enforce');
  /* السببُ: ما يُعاد له من الاسترشاد تغيّر ومراجعتُه لم تتغيّر — فلا يجلبه تبويبٌ قائم بلا az */
  assert.deepEqual(await irIds('supB'), ['tstir1', 'tstir4', s0.j.id].sort(), 'بعد: الاسترشادُ بإسقاط TST-A'); assert.equal(revOf(env, KIR), irRev, 'ومراجعتُه كما هي');
  /* (٢) الوصفُ بعد: تغيّر له وحده */
  const supB1 = await meOf('supB');
  assert.deepEqual(supB1.sb, { [MK]: 'TST-A', [PMK]: 'TST-B' }); assert.notDeepEqual(supB1, supB0, 'وصفُه تغيّر ⇒ يجدّد العميلُ الموارد المُسقَطة');
  assert.deepEqual({ h: supB1.h, lens: supB1.lens, ceil: supB1.ceil, me: supB1.me, p: supB1.p }, { h: supB0.h, lens: supB0.lens, ceil: supB0.ceil, me: supB0.me, p: supB0.p }, 'ولا شيءَ سوى الوردية');
  const ce = await changes('emp1', v1); assert.equal(ce.az, 1, 'زميلٌ مربوطٌ بالجدول نفسِه: az'); assert.deepEqual(await meOf('emp1'), emp10, '…ووصفُه كما هو (ورديتُه لم تتغيّر) فلا يُعاد جلبُ شيء');
  const ci = await changes('imp', v1); assert.ok(ci.keys.includes(KST), 'n/a يرى الجدول'); assert.ok(!ci.az, 'n/a: لا az');
  const cm = await changes('dm1', v1); assert.ok(cm.keys.includes(KST)); assert.ok(!cm.az, 'فاعلُ السقف (R4): لا az');
});
