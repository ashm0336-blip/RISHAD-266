/* V7 · د1-ب · مستلمو تنبيهات الصفحات الحاوية (irshad · seized · award) في وضع الإنفاذ = مستلموها في الوضع القديم لنفس الصلاحيات.
   قبل الإصلاح: nfPage في الإنفاذ يبحث عن ذرّة «الصفحة:view»، والحاويات لا ذرّة لها (ذرّاتها على أوراقها)، فلا يُحسب مستلمٌ غيرُ مدير المنصة.
   العالمُ نفسه (TEST_ONLY · SQLite في الذاكرة) يُقرأ مرّتين: مرةً في الوضع القديم ومرةً في الإنفاذ. لكلّ قارئ، مجموعةُ تنبيهات الحاويات
   في جرسه يجب أن تتطابق في الوضعين. emps لها معالجةٌ خاصة لم تتغيّر؛ تُقارن هنا شاهداً فقط. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { D1Shim, WORKER } from './harness.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';

let loads = 0;   /* initDb يهاجر مرّةً لكل وحدة ⇒ لكل عالمٍ نسختُه من العامل */
async function load() {
  const src = fs.readFileSync(WORKER, 'utf8');
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'd1b-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, src + '\nexport { initDb, kvPutStmts, NF_TYPES, opLegacyPrepare, opGuardRetired };\n');
  try { return await import(pathToFileURL(f).href + '?n=' + (++loads)); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const D = ['TEST_ONLY_d0', 'TEST_ONLY_d1'], G = 'TEST_ONLY_grp', NOW = Date.now() - 60000;
const CONTAINER = ['irshad', 'box', 'award'];
async function world(W, mode) {
  const DB = new D1Shim();
  /* ENV على الإنفاذ في الحالتين؛ الوضعُ يختاره مفتاحُ D1 (meta.authz_mode) — كما في مفتاح الإيقاف */
  const env = { DB, KIVO_AUTHZ_MODE: 'enforce', ASSETS: { fetch: async () => new Response('<!doctype html><html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html' } }) } };
  await W.initDb(env);
  const ph = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
  const users = [{ id: 'TEST_ONLY_super', un: '1000000001', name: 'TEST_ONLY super', role: 'super', ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_gm', un: '1000000002', name: 'TEST_ONLY gm', role: 'gm', gid: G, ekey: 'gm:' + G, ph, mc: 0, dis: 0 }];
  const emps = {};
  D.forEach((d, di) => {
    users.push({ id: 'TEST_ONLY_m' + di, un: String(1100000000 + di), name: 'TEST_ONLY mgr ' + di, role: 'staff', deptId: d, ekey: 'mgr:' + d, mgr: 1, ph, mc: 0, dis: 0 });
    emps[d] = [];
    for (let e = 0; e < 4; e++) {
      users.push({ id: 'TEST_ONLY_u' + di + '_' + e, un: String(1200000000 + di * 100 + e), name: 'TEST_ONLY emp ' + di + '_' + e, role: 'staff', deptId: d, ekey: 'TEST_ONLY_e' + di + '_' + e, ph, mc: 0, dis: 0 });
      emps[d].push({ eid: 'TEST_ONLY_e' + di + '_' + e, name: 'TEST_ONLY emp ' + di + '_' + e, nid: String(1200000000 + di * 100 + e) });
    }
  });
  /* d0: الحاوياتُ الثلاث في سقفه · d1: الاسترشاد وحده */
  const caps = { [G]: ['irshad', 'seized', 'award', 'emps'], [D[0]]: ['irshad', 'seized', 'award', 'emps'], [D[1]]: ['irshad', 'emps'] };
  /* أوراقٌ متنوّعة: الحاويةُ نفسها · ورقتُها وحدها · لا شيء */
  const sheet = {
    [D[0]]: { TEST_ONLY_e0_0: { irshad: ['view'], 'irshad/records': ['view'] }, TEST_ONLY_e0_1: { 'seized/records': ['view'] }, TEST_ONLY_e0_2: { seized: ['view'], award: ['view'] }, TEST_ONLY_e0_3: { emps: ['view'] } },
    [D[1]]: { TEST_ONLY_e1_0: { irshad: ['view'] }, TEST_ONLY_e1_1: { seized: ['view'] } } };
  const keys = { bassam_auth_users_v1: users, bassam_gdepts_v1: [{ id: G, name: 'TEST_ONLY group', kind: 'إدارة عامة' }],
    bassam_depts_v1: D.map((d, i) => ({ id: d, name: 'TEST_ONLY dept ' + i, gid: G })),
    bassam_perms_v1: { caps, emps: sheet }, bassam_platform_v1: {} };
  D.forEach((d) => { keys['bsdept:' + d + ':bassam_employees_v1'] = emps[d]; });
  const st = [];
  for (const [k, v] of Object.entries(keys)) { st.push(...W.kvPutStmts(env, 'kv', k, JSON.stringify(v))); st.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(k)); }
  st.push(DB.prepare("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v='1'"),
    DB.prepare("INSERT INTO meta(k,v) VALUES('authz_mode',?1) ON CONFLICT(k) DO UPDATE SET v=?1").bind(mode === 'enforce' ? 'enforce' : 'legacy'));
  const who = ['TEST_ONLY_super', 'TEST_ONLY_gm', 'TEST_ONLY_m0', 'TEST_ONLY_m1'].concat(D.flatMap((d, di) => [0, 1, 2, 3].map((e) => 'TEST_ONLY_u' + di + '_' + e)));
  who.forEach((uid) => st.push(DB.prepare('INSERT INTO sess(tok,uid,ts,la,dev,city) VALUES(?1,?2,?3,?3,?4,?4)').bind('TEST_ONLY_s_' + uid, uid, NOW, 'TEST_ONLY')));
  await DB.batch(st);
  await installOperationalFixture(env, W);
  /* لكلّ نوعٍ من الحاويات (ومن emps شاهداً) × كلّ إدارة × كلّ هدفِ دور */
  const types = Object.keys(W.NF_TYPES).filter((t) => CONTAINER.concat('emp').includes(W.NF_TYPES[t].k));
  const ins = DB.db.prepare("INSERT INTO notification_messages(scope,id,kind,department,type,category,priority,channel,title,body,created_at,expires_at,withdrawn_at,requires_ack,pinned,target_mode) VALUES(?,?,?,?,?,?,?,?,?,?,?,0,0,0,0,'message')");
  const tg = DB.db.prepare('INSERT INTO notification_targets(scope,message_id,kind,value) VALUES(?,?,?,?)');
  DB.db.exec('BEGIN'); let n = 0;
  for (const d of D) for (const type of types) for (const role of ['all', 'mgr', 'staff']) {
    const id = 'TEST_ONLY_n' + (n++);
    ins.run('d:' + d, id, 'event', d, type, W.NF_TYPES[type].k, 'info', 'bell', 'TEST_ONLY', 'TEST_ONLY', NOW - n * 1000);
    tg.run('d:' + d, id, 'role', role);
  }
  DB.db.exec('COMMIT');
  return { env, who };
}
async function feed(W, env, uid, dept, kind) {   /* فئةٌ واحدة في كلّ طلب: الصفحةُ محدودة، فلا تُزاحم فئةٌ أخرى */
  const r = await W.default.fetch(new Request('http://x/api/notifications?limit=200&kinds=' + kind + (dept ? '&dept=' + dept : ''), { headers: { Cookie: 'bs_tok=TEST_ONLY_s_' + uid } }), env, { waitUntil() {}, passThroughOnException() {} });
  const j = JSON.parse(await r.text());
  return { status: r.status, items: (j.items || []).map((x) => x.type + '@' + (x.dept || '') + '#' + x.id).sort() };
}

test('V7 · د1-ب: irshad · seized · award — نفسُ الصلاحيات في الوضعين ⇒ نفسُ المستلمين', { timeout: 300000 }, async () => {
  const W = await load(), WE = await load();
  const L = await world(W, 'legacy'), E = await world(WE, 'enforce');
  const cat = (it) => W.NF_TYPES[it.split('@')[0]].k;
  const seenLegacy = { irshad: 0, box: 0, award: 0 }; let compared = 0;
  for (const uid of L.who) for (const dept of ['', ...D]) {
    for (const c of CONTAINER) {
      const a = await feed(W, L.env, uid, dept, c), b = await feed(WE, E.env, uid, dept, c);
      assert.equal(b.status, a.status, uid + ' ' + dept + ' status');   /* قارئُ إدارةٍ أخرى يُرفض (403) في الوضعين */
      if (a.status === 200) compared++;
      const x = a.items.filter((i) => cat(i) === c), y = b.items.filter((i) => cat(i) === c);
      if (uid !== 'TEST_ONLY_super') seenLegacy[c] += x.length;
      assert.deepEqual(y, x, uid + ' dept=' + (dept || '-') + ' فئة ' + c + ': مستلمو الإنفاذ ≠ مستلمي الوضع القديم');
    }
  }
  /* الاختبارُ ذو معنى: في الوضع القديم يستلم غيرُ مدير المنصة تنبيهاتٍ من الحاويات الثلاث */
  assert.ok(compared >= 30, 'مقارناتٌ ناجحة: ' + compared);
  for (const c of CONTAINER) assert.ok(seenLegacy[c] > 0, 'الوضع القديم يسلّم ' + c + ' لغير مدير المنصة');
});

test('V7 · د1-ب: emps (المعالجةُ الخاصة) لم تتغيّر — مستلموها في الإنفاذ = في القديم، والمدير يقرؤها', { timeout: 300000 }, async () => {
  const W = await load(), WE = await load(); const L = await world(W, 'legacy'), E = await world(WE, 'enforce');
  let mgr = 0;
  for (const uid of L.who) { const a = await feed(W, L.env, uid, D[0], 'emp'), b = await feed(WE, E.env, uid, D[0], 'emp');
    assert.equal(b.status, a.status, uid); assert.deepEqual(b.items, a.items, uid + ': emps');
    if (uid === 'TEST_ONLY_m0') mgr = b.items.length; }
  assert.ok(mgr > 0, 'مديرُ الإدارة يقرأ تنبيهات الموظفين في الإنفاذ');
});
