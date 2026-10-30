/* KIVO_261 · SOT-009 (Default Deny) · SOT-134 (Data Integrity) · SOT-008 — مسحُ أعطال D1 عبارةً عبارة.
   لكلّ طلبٍ ممثِّل (قراءةٌ بجلسة موظف · كتابةٌ مسموحة · كتابةٌ ممنوعة · الغلافُ بجلسة) تُسجَّل عباراتُ SQL التي ينفّذها، ثم يُعاد الطلبُ مرّةً
   لكلّ عبارةٍ مميَّزة مع حقن عطلٍ فيها وحدها (env.DB.failIf) — في الوضعين (legacy · enforce). الثوابتُ بعد زوال العطل:
   ① القراءة: لا قيمةَ لمفتاحٍ خارج نطاق الموظف أبداً، وما يُعاد من نطاقه يساوي قيمتَه الحقيقية حرفاً (لا نصفَ قيمة)
   ② الكتابةُ المسموحة: ok:1 ⇒ القيمةُ الجديدة محفوظةٌ فعلاً (لا «نجاحٌ» بلا أثر)؛ وفي كل حال القيمةُ إمّا القديمةُ كما هي وإمّا الجديدةُ كاملة،
      ورقمُ المراجعة يتبعها (+1 مع الجديدة · كما هو مع القديمة) — لا كتابةَ جزئية
   ③ الكتابةُ الممنوعة (bassam_perms_v1 · مفتاحُ إدارةٍ أخرى): لا تُحفظ أبداً مهما تعطّل
   ④ الغلاف: لا يحقن قيمةَ مفتاحٍ خارج النطاق (العلامة: السجلُّ tstir21 الذي لا تحمله إلا tst_d2 في العُدّة)
   (المصدرُ الوحيد لحقن العطل عُدّةُ الوحدة — D1 الحقيقي لا يتيحه؛ وD1Shim.batch ذرّيةٌ كالحقيقية.) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const TODAY = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); return o; })();
function seedSql() {
  const o = TODAY;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_flt_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const K1 = 'bsdept:tst_d1:bassam_irshad_v1';      /* tst_emp1: irshad/records view·add·edit */
const K2 = 'bsdept:tst_d2:bassam_irshad_v1';      /* إدارةٌ أخرى */
const KP = 'bassam_perms_v1';
for (const mode of ['legacy', 'enforce']) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
  test('[' + mode + '] مسحُ أعطال D1 عبارةً عبارة: لا قراءةَ خارج النطاق · لا كتابةَ ممنوعة · لا كتابةَ جزئية · لا نجاحَ بلا أثر', async () => {
    const env = makeTestEnv(EX); const C = client(env);
    const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
    await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
    await applySql(env.DB, seedSql());
    if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
    const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok, 'tst_emp1');
    const truth = (k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ?1', k)[0]; return r ? r.v : null; };
    const revOf = (k) => { const r = env.DB.q('SELECT rev FROM revs WHERE k = ?1', k)[0]; return r ? r.rev : 0; };
    const sec0 = truth(K2), perms0 = truth(KP);
    assert.ok(sec0 && /"tstir21"/.test(sec0), 'قيمةُ الإدارة الأخرى (السجلُّ tstir21 من العُدّة) في kv');   /* علامةٌ لا توجد إلا في tst_d2 */
    /* ── الطلباتُ الممثِّلة: prep بلا عطل (ما يتوقّعه العميل) · run تحت العطل · check بعد زواله ──
       في الإنفاذ تُسقَط صفوفٌ خارج نطاق الموظف من القراءة (ENF_PROJ) وتُدمج عند الكتابة — فالمتوقَّع من منظور الموظف لا من kv الخام */
    const view = async () => { const g = await C.api('/api/get?keys=' + encodeURIComponent(K1), { cookie: emp.ck }); return ((g.j.keys || {})[K1] || {}); };
    const ids = (v) => ((JSON.parse(v || '{"reports":[]}').reports) || []).map(x => x.id).sort().join(',');
    let seq = 0;
    const REQ = {
      read: {
        prep: async () => ({ exp: (await view()).v }),
        run: async () => C.api('/api/get?keys=' + encodeURIComponent([K1, K2, KP].join(',')), { cookie: emp.ck }),
        check: (r, x) => {
          const ks = (r.j && r.j.keys) || {};
          assert.ok(!(ks[K2] && ks[K2].v != null), 'لا قيمةَ لمفتاح الإدارة الأخرى (' + r.status + ')');
          if (ks[K1] && ks[K1].v != null) assert.equal(ks[K1].v, x.exp, 'قيمةُ النطاق كاملةٌ مطابقةٌ لما يراه الموظف بلا عطل');
          assert.ok(!JSON.stringify(r.j || {}).includes('tstir21'), 'لا أثرَ لسجلّ الإدارة الأخرى في الردّ');
          return { ok: !!(ks[K1] && ks[K1].v != null) };
        }
      },
      write: {
        prep: async () => {
          const vw = await view(); const cur = JSON.parse(vw.v || '{"reports":[]}'); const id = 'flt' + (++seq);
          /* جسدٌ فريد: الجسدُ المطابق لسجلٍّ قائم بمعرّفٍ آخر «تبديلُ هوية» يُرفض (034-name-swap) */
          const rec = { id, y: TODAY.year, m: TODAY.month, d: TODAY.day, loc: 'TEST_ONLY موقع الفحص ' + seq, shift: 'TST-A', lang: 'TEST_ONLY لغة', n: 1 + seq, by: 'tst_e_emp1', test: 'TEST_ONLY' };
          const old = truth(K1);
          return { id, rec, nv: JSON.stringify({ reports: (cur.reports || []).concat([rec]) }), base: vw.rev, old, oldIds: ids(old), newIds: ids(JSON.stringify({ reports: JSON.parse(old).reports.concat([rec]) })), rev0: revOf(K1) };
        },
        run: async (x) => C.save(emp.ck, { [K1]: x.nv }, [], { [K1]: x.base }),
        check: (r, x) => {
          const now = truth(K1), rv = revOf(K1);
          const okAll = r.status === 200 && r.j && r.j.ok === 1 && !((r.j.denied || {})[K1]) && !((r.j.conflicts || {})[K1]);
          const isOld = now === x.old && rv === x.rev0;
          const isNew = ids(now) === x.newIds && rv > x.rev0 && JSON.stringify((JSON.parse(now).reports || []).find(q => q.id === x.id)) === JSON.stringify(x.rec);
          /* رقمُ المراجعة تسلسلٌ عامّ (v) لا عدّادٌ لكل مفتاح: الجديدةُ ⇒ أكبر · القديمةُ ⇒ كما هو؛ والصفوفُ المخفية تبقى كلُّها (الدمج) */
          if (okAll) assert.ok(isNew, 'ok:1 ⇒ الجديدةُ محفوظةٌ كاملة بكل الصفوف القديمة (' + ids(now) + ')');
          else assert.ok(isOld || isNew, 'لا كتابةَ جزئية: القيمةُ قديمةٌ كاملة أو جديدةٌ كاملة (status ' + r.status + ' · ' + ids(now) + ')');
          return { ok: okAll, persisted: isNew };
        }
      },
      deny: {
        prep: async () => ({ b2: revOf(K2), bp: revOf(KP) }),
        run: async (x) => C.save(emp.ck, { [K2]: JSON.stringify({ reports: [] }), [KP]: JSON.stringify({ caps: {}, emps: {} }) }, [], { [K2]: x.b2, [KP]: x.bp }),
        check: (r) => { assert.equal(truth(K2), sec0, 'مفتاحُ الإدارة الأخرى لم يُكتب'); assert.equal(truth(KP), perms0, 'bassam_perms_v1 لم يُكتب'); return { ok: true }; }
      },
      boot: {
        prep: async () => ({}),
        run: async () => { const b = await C.boot(emp.ck); return { status: b.status, b }; },
        check: (r) => { const keys = (r.b && r.b.boot && r.b.boot.keys) || {}; assert.ok(!(K2 in keys) && !(r.b && r.b.html || '').includes('tstir21'), 'الغلافُ لا يحقن الإدارة الأخرى (' + r.status + ')'); return { ok: true }; }
      }
    };
    const stats = { cases: 0, byReq: {}, statuses: {}, falseFail: 0, okUnderFault: 0 };
    for (const [name, R] of Object.entries(REQ)) {
      /* خطُّ الأساس بلا عطل: العباراتُ المنفَّذة · والقراءةُ والكتابةُ المسموحتان تنجحان فعلاً */
      env.DB.failIf = null; const x0 = await R.prep(); env.DB.log = [];
      const r0 = await R.run(x0); const c0 = R.check(r0, x0);
      if (name === 'write') assert.ok(c0.ok && c0.persisted, 'خطُّ الأساس: الكتابةُ المسموحة تنجح بلا عطل — ' + JSON.stringify(r0.j).slice(0, 300));
      if (name === 'read') assert.ok(c0.ok, 'خطُّ الأساس: الموظفُ يقرأ مفتاحَ نطاقه');
      const sqls = [...new Set(env.DB.log)];
      assert.ok(sqls.length >= 2, name + ': عباراتٌ منفَّذة ' + sqls.length);
      stats.byReq[name] = sqls.length;
      for (const q of sqls) {
        env.DB.failIf = null; const x = await R.prep();
        env.DB.failIf = (sq) => sq === q;
        let r; try { r = await R.run(x); } catch (e) { r = { status: 'throw', j: {}, err: String(e && e.message || e).slice(0, 80) }; }
        env.DB.failIf = null;
        const c = R.check(r, x) || {};
        if (name === 'write' && !c.ok && c.persisted) stats.falseFail++;
        if (c.ok && name !== 'deny' && name !== 'boot') stats.okUnderFault++;
        stats.cases++; const st = String(r.status); stats.statuses[st] = (stats.statuses[st] || 0) + 1;
      }
    }
    /* بعد المسح كلِّه: الخدمةُ تعود سليمة (لا حالةَ عالقة في الوحدة) */
    const g = await C.api('/api/get?keys=' + encodeURIComponent(K1), { cookie: emp.ck });
    assert.equal(g.status, 200); assert.ok(g.j.keys[K1].v && g.j.keys[K1].v.includes('flt1'), 'بعد زوال الأعطال: القراءةُ سليمة وتحمل ما كُتب');
    console.log('   [' + mode + '] حالاتُ العطل: ' + stats.cases + ' · العباراتُ لكل طلب ' + JSON.stringify(stats.byReq) + ' · الحالات ' + JSON.stringify(stats.statuses) + ' · نجاحٌ رغم العطل (عبارةٌ غيرُ حرجة) ' + stats.okUnderFault + ' · «فشلٌ معلَن والقيمةُ حُفظت كاملة» ' + stats.falseFail);
    assert.ok(stats.cases >= 20, 'المسحُ غطّى ' + stats.cases + ' حالة');
  });
}
