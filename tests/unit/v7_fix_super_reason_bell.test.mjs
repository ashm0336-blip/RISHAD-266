/* V7 fix — a refusal for a missing reason is not a security event (real worker, enforce, TEST_ONLY data).
   A unit manager replaces a site map without a reason: the save is refused (why = reason) and logged in sec as before.
   The platform admin's bell then carries ONE notice for it whose text is «… — رُفض: هذه العملية تتطلب ذكر السبب.», whose category is the
   platform («sys») and not security («sec»), with ordinary priority — and a refusal for lack of permission stays a security notice.
   The audit page (admin/logic.js) words the same sec row without «خارج الصلاحية» and without «حدث أمني».
   V7 · د6 (QA) · البند ١ (قرارُ المالك): لا سببَ إلزامياً — استبدالُ الخريطة بلا سبب من مدير الإدارة يُحفظ الآن ولا يُكتب صفُّ رفض.
   أما صفوفُ «رُفض لنقص السبب» القديمة في سجل الأمن فتبقى معروضةً بصياغتها (السجلاتُ القديمة لا تنكسر): يُدرج هنا صفٌّ قديمٌ مثلُها. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, workerUnderTest, D, stored, replaceOperationalFixture } from './world_fx.mjs';
import { SRC } from './harness.mjs';

const WU = workerUnderTest(), KP = 'bsdept:' + D + ':bassam_plan_v1', DM = ['0000000101', '70101'];
const clone = (v) => JSON.parse(JSON.stringify(v));
let seq = 0;
const save = (W, ck, key, v, rev) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: { requestId: 'TEST_ONLY_reason_bell_' + (++seq),
  epoch: Number(W.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0), set: { [key]: JSON.stringify(v) }, base: { [key]: rev } } });

test('V7 · د6 (QA): استبدالُ الخريطة بلا سبب يُحفظ · صفُّ «لنقص السبب» القديم يبقى في الجرس بفئة المنصة لا الأمان', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' }), dm = await W.login(...DM);
  const P0 = clone(stored(W.env, KP)); Object.assign(P0.floors[0], { iid: 'tst_img_a', imgW: 100, imgH: 100 }); await replaceOperationalFixture(W.env, KP, P0);
  /* the fixture accounts are tst_*; the security poll skips tst_ uids (019 nfSecurityPoll) — the refused row is re-attributed to a
     synthetic non-tst uid so the poll reads it as it reads a real account's row */
  const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(KP), { cookie: dm.ck }), v = g.j.resources[KP];
  Object.assign(v.floors[0], { iid: 'tst_img_b', imgW: 200, imgH: 200 });
  const r = await save(W, dm.ck, KP, v, g.j.base[KP]);
  assert.ok(!(r.j.denied && r.j.denied[KP]), 'V7 · د6 (QA): بلا سبب يُحفظ — ' + JSON.stringify(r.j).slice(0, 300));
  assert.equal(stored(W.env, KP).floors[0].iid, 'tst_img_b', 'written without a reason');
  assert.equal(W.env.DB.q("SELECT id FROM sec WHERE act='denied'").length, 0, 'no refusal row');
  /* صفٌّ قديمٌ من قبل القرار (رُفض لنقص السبب) — يُعرض كما كان */
  W.env.DB.db.prepare("INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(?,?,?,?,?,?,?,?,?)").run(Date.now(), 'TEST_ONLY_actor', '', 'denied', KP, 'reason', '', '', '');
  /* a second refused row of another kind (no permission) for contrast */
  W.env.DB.db.prepare("INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(?,?,?,?,?,?,?,?,?)").run(Date.now() + 5, 'TEST_ONLY_actor2', '', 'denied', KP, 'perm', '', '', '');
  /* the bell reads the security log through the «security-poll» action of the platform admin (019 nfSecurityPoll) */
  const superId = stored(W.env, 'bassam_auth_users_v1').find((u) => u.role === 'super').id;
  const poll = await W.C.api('/api/notifications/act', { method: 'POST', cookie: W.su.ck, body: { uid: superId, op: 'security-poll' } }); assert.equal(poll.status, 200, JSON.stringify(poll.j).slice(0, 200));
  const n = await W.C.api('/api/notifications?all=1', { cookie: W.su.ck }); assert.equal(n.status, 200, JSON.stringify(n.j).slice(0, 200));
  const msgs = W.env.DB.q("SELECT type,category,priority,title,body FROM notification_messages WHERE type='sc_deny' ORDER BY created_at,id");
  assert.equal(msgs.length, 2, JSON.stringify(msgs));
  const reason = msgs.find((m) => /تتطلب ذكر السبب/.test(m.body)), perm = msgs.find((m) => m !== reason);
  assert.ok(reason, 'a notice for the missing reason: ' + JSON.stringify(msgs));
  assert.match(reason.body, /— رُفض: هذه العملية تتطلب ذكر السبب\.$/); assert.doesNotMatch(reason.body, /ورُفض الطلب|خارج الصلاحية|\{/);
  assert.equal(reason.category, 'sys', 'not a security notice'); assert.equal(reason.priority, 'info'); assert.equal(reason.title, 'عملية تتطلب ذكر السبب');
  assert.equal(perm.category, 'sec', 'a permission refusal stays a security notice'); assert.match(perm.body, /ورُفض الطلب:/);
  const item = (n.j.items || []).find((x) => x.type === 'sc_deny' && (x.k || x.category) === 'sys');
  assert.ok(item, 'the platform admin sees it in the bell under the platform kind: ' + JSON.stringify((n.j.items || []).map((x) => [x.type, x.k || x.category])).slice(0, 300));
  assert.ok(Object.values(item).some((v) => typeof v === 'string' && /رُفض: هذه العملية تتطلب ذكر السبب/.test(v)), 'with the new wording: ' + JSON.stringify(item).slice(0, 400));
});

test('سجل التدقيق في الإعدادات: صفُّ الرفض لنقص السبب بلا «خارج الصلاحية» وبلا «حدث أمني»', () => {
  const s = fs.readFileSync(path.join(SRC, 'modules', 'admin', 'logic.js'), 'utf8'), i = s.indexOf('case "denied":'), blk = s.slice(i, s.indexOf('case "policy_change":', i));
  assert.ok(i > 0 && blk.length > 100);
  const m = /"reason" === t\.detail\s*\?\s*\{([^}]*)\}\s*:\s*\{([^}]*)\}/.exec(blk); assert.ok(m, 'the reason branch exists: ' + blk.slice(0, 300));
  assert.match(m[1], /رُفض: هذه العملية تتطلب ذكر السبب/); assert.doesNotMatch(m[1], /خارج الصلاحية|حدث أمني|k: "sec"/);
  assert.match(m[2], /خارج الصلاحية/); assert.match(m[2], /k: "sec"/);
});
