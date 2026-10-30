/* KIVO_264 · KIVO-Tasks — الاستعلاماتُ الثلاثة للقراءة وحدها في حزمة SR-2.2 (tools/hotfix242_sr2/legacy_rows_count.sql ⇒ hotfix/KIVO_242_HOTFIX_SR2/):
   مصدرُها المراجعةُ المستقلة لـSR-2.1 (review_sr2.md §3 · scripts/sql_validate.mjs) مكيَّفةً لقواعد SR-2.2 — F-1 الربطُ بمعرّفٍ يحمله سجلٌّ واحدٌ وحده
   (eid ثم رقمُ الهوية) · F-3 الانقضاءُ التلقائيّ لِما انتهت مهلتُه خلال 48 ساعة وحده. هنا تُثبَت على بياناتٍ اصطناعية (tasks_fx · node:sqlite):
   (أ) قراءةٌ وحدها (total_changes ثابت) · القيمةُ المقسومةُ على أجزاء (seq) تُجمع كما هي
   (ب) الاستعلام 1 = تصنيفٌ مستقلٌّ في JS حرفاً · والخادمُ (عاملُ الحزمة) يوافقه: يرى الموظفُ صفَّ رقم هويته الفريد ولا يرى المسنَدَ بالاسم ولا بمعرّفٍ مكرَّر
   (ج) الاستعلام 2: الحسابُ غيرُ المرتبط · والمفتاحُ برقم هويةٍ مكرَّر «غيرُ مرتبط» (لا RISK) · ولا بياناتِ كلمات مرور
   (د) الاستعلام 3 = عدٌّ مستقلٌّ في JS (المرشَّحاتُ للانقضاء · ما يُعلَّم في أوّل زيارة ≤ 48 ساعة · ما يبقى كما هو) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './harness.mjs';
import { world, ME, KT, KE, DAY, stored, putKV } from './tasks_fx.mjs';

const SQLF = path.join(ROOT, 'tools/hotfix242_sr2/legacy_rows_count.sql');
const W242 = process.env.KIVO_WORKER || path.join(ROOT, 'hotfix/KIVO_242_HOTFIX_SR2/dist/_worker.js');
const SKIP = fs.existsSync(W242) && fs.existsSync(SQLF) ? {} : { skip: 'حزمةُ SR-2.2 غيرُ مبنية — python3 tools/hotfix242.py --sr2' };
const stmts = () => fs.readFileSync(SQLF, 'utf8').split(/^-- ─+$/m).map((q) => q.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim().replace(/;\s*$/, ''));

test('(أ)(ب)(ج)(د) الاستعلاماتُ الثلاثة: قراءةٌ وحدها · تطابق تصنيفاً مستقلاً وقواعدَ SR-2.2 · والخادمُ يوافق', SKIP, async () => {
  const [s1, s2, s3] = stmts(); assert.ok(s1 && s2 && s3, 'ثلاثةُ استعلامات');
  for (const s of [s1, s2, s3]) assert.ok(/^WITH RECURSIVE/.test(s) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i.test(s), 'SELECT وحده');
  const W = await world({ worker: W242, mode: 'legacy' }), DB = W.env.DB;
  /* أشكالٌ قديمة اصطناعية: رقمُ هويةٍ فريد لموظفنا · رقمٌ مكرَّر بين سجلّين · معرّفٌ ثابتٌ مكرَّر · مسنَدٌ بالاسم وحده · اسمٌ في العمود 14 */
  const E = stored(W.env, KE); E.find((x) => x.eid === ME.eid).nid = '1999999991';
  E.push({ eid: 'tst_e_dupA', name: 'TEST_ONLY dupA', nid: '1888888881' }, { eid: 'tst_e_dupB', name: 'TEST_ONLY dupB', nid: '1888888881' },
    { eid: 'tst_e_twin', name: 'TEST_ONLY twin 1' }, { eid: 'tst_e_twin', name: 'TEST_ONLY twin 2' });
  putKV(W.env, KE, E);
  const S = stored(W.env, KT), now = Date.now(), old = now - 5 * 864e5;
  const mk = (id, a, nm, st = 'pending', s = now - 1e5, e = now + 9e6) => ['TEST_ONLY legacy ' + id, '', 'normal', st, 'normal', 'مضافة', null, [], nm, 'x', 60, null, null, id, a, s, e];
  S[DAY].push(mk(1760000099001, '1999999991', ME.name), mk(1760000099002, null, ME.name), mk(1760000099003, ME.name, ME.name), mk(1760000099004, '1888888881', 'TEST_ONLY dupA'),
    mk(1760000099005, null, ME.name, 'done'), mk(1760000099006, 'tst_e_twin', 'TEST_ONLY twin'), mk(1760000099007, ME.eid, ME.name, 'pending', old - 3600e3, old));
  putKV(W.env, KT, S);
  putKV(W.env, 'bsdept:tst_d1:bassam_tasks_locks_v1', {});   /* لا شهرَ معتمد: كلُّ المتأخرات مرشَّحة (الاستعلام 3) */
  const U = stored(W.env, 'bassam_auth_users_v1');
  U.push({ id: 'tst_unlinked1', un: '2000000999', name: 'TEST_ONLY unlinked', role: 'staff', deptId: 'tst_d1', ekey: 'tst_e_gone', dis: 0 },
    { id: 'tst_dupnid1', un: '2000000998', name: 'TEST_ONLY dup nid', role: 'staff', deptId: 'tst_d1', ekey: '1888888881', dis: 0 },
    { id: 'tst_twin1', un: '2000000997', name: 'TEST_ONLY twin', role: 'staff', deptId: 'tst_d1', ekey: 'tst_e_twin', dis: 0 });
  putKV(W.env, 'bassam_auth_users_v1', U);
  /* القيمةُ على ثلاثة أجزاء (القيمُ فوق 700,000 حرف تُخزَّن هكذا) */
  const full = DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', KT).map((x) => x.v).join('');
  DB.exec("DELETE FROM kv WHERE k = '" + KT + "'");
  const n3 = Math.ceil(full.length / 3), ins = DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, ?, ?)');
  for (let i = 0; i < 3; i++) ins.run(KT, i, full.slice(i * n3, (i + 1) * n3));
  assert.equal(JSON.stringify(stored(W.env, KT)), JSON.stringify(JSON.parse(full)), 'الأجزاءُ تُجمع إلى القيمة نفسِها');
  /* (أ) */
  const c0 = DB.q('SELECT total_changes() AS c')[0].c;
  /* KIVO_265 (عُدّة · run-unit 2026-10-15): «الآن» في الاستعلام 3 = strftime('%s','now')×1000 — بدقّة الثانية ويُقرأ لحظةَ تنفيذه، و«الآن» في JS كان
     Date.now() بالملّي ثانية من أوّل الاختبار ⇒ صفٌّ مهلتُه في أوّل الثانية الجارية يعدّه أحدُهما دون الآخر (20 ⇆ 21 متقطّعاً). المرجعُ المستقلّ يُحسب
     الآن بساعة الاستعلام نفسِها قبله وبعده: إن لم تتغيّر الثانية فالحكمُ واحدٌ حرفاً، وإن تغيّرت فيجب أن يطابق العدُّ إحدى الحافتين — لا تخفيف. */
  const sqlNow = () => DB.q("SELECT CAST(strftime('%s', 'now') AS INTEGER) * 1000 AS t")[0].t;
  const r1 = DB.db.prepare(s1).all(), r2 = DB.db.prepare(s2).all(), tq0 = sqlNow(), r3 = DB.db.prepare(s3).all(), tq1 = sqlNow();
  assert.equal(DB.q('SELECT total_changes() AS c')[0].c, c0, 'لا كتابة');
  /* (ب) التصنيفُ المستقلّ بقواعد SR-2.2 */
  const emps = stored(W.env, KE), tasks = JSON.parse(full), cnt = {}, n = (f, a) => emps.filter((e) => e[f] != null && e[f] !== '' && String(e[f]) === a).length;
  for (const d in tasks) { if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(d) || !Array.isArray(tasks[d])) continue; for (const r of tasks[d]) { if (!Array.isArray(r)) continue;
    const a = r[14] == null ? '' : String(r[14]); let c;
    if (!a) c = r[8] && String(r[8]).trim() ? 'name_only_r8_hidden' : 'general_unassigned';
    else if (n('eid', a) === 1) c = 'eid_ok'; else if (n('eid', a) > 1) c = 'eid_shared_hidden';
    else c = n('nid', a) === 1 ? 'nid_unique_readonly' : n('nid', a) > 1 ? 'nid_shared_hidden' : 'r14_name_or_unknown';
    cnt[c] = (cnt[c] || 0) + 1; } }
  const sq = {}; for (const x of r1) sq[x.assignment_class] = x.rows_total;
  assert.deepEqual(Object.entries(sq).sort(), Object.entries(cnt).sort(), 'الاستعلام 1 = التصنيفُ المستقلّ');
  for (const k of ['eid_shared_hidden', 'nid_shared_hidden', 'nid_unique_readonly', 'name_only_r8_hidden', 'r14_name_or_unknown']) assert.ok(sq[k] >= 1, 'الصنفُ ممثَّل: ' + k);
  const me = await W.login(ME.un, ME.pw), ids = (await W.C.api('/api/me/tasks', { cookie: me.ck })).j.rows.map((x) => x.id);
  assert.ok(ids.includes(1760000099001) && ids.includes(1760000099007), 'الخادمُ يوافق: صفُّ رقم الهوية الفريد وصفُّ المعرّف ظاهران');
  for (const h of [1760000099002, 1760000099003, 1760000099004, 1760000099005, 1760000099006]) assert.ok(!ids.includes(h), 'والمخفيُّ مخفيّ: ' + h);
  /* (ج) */
  const st = (id) => (r2.find((x) => String(x.account_ids).split(' ').includes(id)) || {}).link_state || '';
  assert.match(st('tst_unlinked1'), /^NOT_LINKED \(no matching/); assert.match(st('tst_dupnid1'), /^NOT_LINKED \(national id shared/); assert.match(st('tst_twin1'), /^NOT_LINKED \(employee id shared/);
  assert.equal(st('tst_p0e1'), 'linked_by_eid'); assert.ok(!r2.some((x) => /RISK/.test(x.link_state)), 'لا RISK تحت SR-2.2');
  assert.ok(!JSON.stringify(r2).includes('p2$'), 'لا بياناتِ كلمات مرور');
  /* (د) */
  const LK = stored(W.env, 'bsdept:tst_d1:bassam_tasks_locks_v1') || {};
  const count3 = (tNow) => { let js = 0, recent = 0;
    for (const d in tasks) { if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(d) || !Array.isArray(tasks[d])) continue; for (const r of tasks[d]) { if (!Array.isArray(r)) continue;
      const a = r[14] == null ? '' : String(r[14]); if (!a) continue;
      const vis = n('eid', a) === 1 || n('nid', a) === 1, ymk = d.split('-').slice(0, 2).map(Number).join('-'), locked = LK[ymk] === true || LK[ymk] === 1;
      if (!locked && vis && r[3] !== 'done' && r[3] !== 'declined' && !r[11] && r[16] && r[16] < tNow && !(r[20] && r[20].exp)) { js++; if (r[16] >= tNow - 2 * 864e5) recent++; } } }
    return { js, recent }; };
  assert.equal(r3.length, 1);
  const edges = [...new Set([tq0, tq1])].map(count3), hit = edges.find((c) => c.js === r3[0].expired_unanswered_rows && c.recent === r3[0].marked_on_first_visit) || edges[0];
  const { js, recent } = hit;
  assert.equal(r3[0].expired_unanswered_rows, js, 'الاستعلام 3 = العدُّ المستقلّ');
  assert.equal(r3[0].marked_on_first_visit, recent); assert.equal(r3[0].left_as_is_older_than_48h, js - recent); assert.ok(js - recent >= 1, 'متأخرةٌ قديمةٌ ممثَّلة');
});
