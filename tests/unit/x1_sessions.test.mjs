/* V7 · د5-هـ (x1 · الجلسات) — على العامل الحقيقي (Node + D1 بديل · بيانات TEST_ONLY):
   (١) تنبيهُ الجهاز الجديد يحمل مِقبضَ الجلسة الجديدة ويصدر مرةً لكل جهاز · «ليس أنا» يُنهي تلك الجلسة وحدها · غيرُ صاحبها لا يُنهيها
   (٢) /api/me: لكل جلسةٍ sid · المتصفح · المدينة · البدء · آخرُ نشاط · «الحالية» — بلا رمزٍ ولا IP
   (٣) «شاشة العرض» (role:'display'): تقرأ إدارتَها وحدها · كلُّ مسارٍ مغيِّر يُرفض (الحفظ والمساراتُ المكتوبة من العقد) · عمرُ جلستها dispH ·
       لا تغييرَ إجباريَّ لكلمة المرور ولا تنبيهَ جهاز ولا حضور · ينشئها مديرُ النظام وحده
   (٤) جلسةٌ أُنهيت أثناء انتظار /api/changes?wait=1 تأخذ 401 خلال ثوانٍ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, workerUnderTest, notificationMessages, addAccount, stored, D, TAG, ME } from './world_fx.mjs';
import { SRC } from './harness.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const UA = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
const DISP = { uid: 'tst_disp1', un: '0000000901', pw: '70901' };
const dvOf = (r) => { const m = /bs_dv=([0-9a-f]{16})/.exec(r.headers.get('set-cookie') || ''); return m && m[1]; };
async function loginDv(W, cred, dv) {
  const r = await W.C.req('/api/login', { method: 'POST', body: { u: cred[0], p: cred[1] }, headers: Object.assign({ 'User-Agent': UA }, dv ? { cookie: 'bs_dv=' + dv } : {}) });
  const j = await r.json(); assert.equal(j.ok, 1, JSON.stringify(j));
  return { j, ck: (r.headers.get('set-cookie') || '').split(';')[0], dv: dvOf(r) || dv, sc: r.headers.get('set-cookie') || '' };
}
const who = async (W, ck) => (await W.C.api('/api/whoami', { cookie: ck })).status;
const me = async (W, ck) => (await W.C.api('/api/me', { cookie: ck })).j;
const scDev = (W) => notificationMessages(W.env).filter((m) => m.type === 'sc_dev');
const killOne = (W, ck, body) => W.C.api('/api/me/sess/kill-one', { method: 'POST', cookie: ck, body });

test('(١) sc_dev يحمل مِقبضَ الجلسة الجديدة · مرةً لكل جهاز · «ليس أنا» يُنهي تلك الجلسة وحدها · غيرُ صاحبها لا يُنهيها', async () => {
  const W = await world({ worker: WU.file });
  const A = await loginDv(W, DM, null);                 /* أولُ دخولٍ بمعرّف: صامت */
  const n0 = scDev(W).length;
  const B = await loginDv(W, DM, null);                 /* متصفحٌ جديد ⇒ تنبيهٌ واحد */
  const al = scDev(W); assert.equal(al.length, n0 + 1, 'تنبيهٌ واحد للجهاز الجديد');
  const link = al[al.length - 1].link; assert.match(link, /^sess:[0-9a-f]{16}$/, 'المِقبضُ في التنبيه');
  assert.ok(!link.includes(B.ck.split('=')[1]), 'لا رمزَ جلسة في التنبيه');
  const mine = (await me(W, A.ck)).sess; const sidB = link.slice(5);
  assert.ok(mine.some((s) => s.sid === sidB && !s.mine), 'المِقبضُ هو جلسةُ الجهاز الجديد في قائمة صاحبه');
  await loginDv(W, DM, B.dv); assert.equal(scDev(W).length, n0 + 1, 'الجهازُ نفسُه ثانيةً: لا تنبيه');
  /* غيرُ صاحب الجلسة: 404 كالمجهول، والجلسةُ باقية */
  const other = await W.login(ME.un, ME.pw);
  const rx = await killOne(W, other.ck, { sid: sidB, why: 'not-me' }); assert.equal(rx.status, 404, JSON.stringify(rx.j)); assert.equal(await who(W, B.ck), 200, 'جلسةُ الغير باقية');
  assert.equal((await killOne(W, A.ck, { sid: 'zz' })).status, 400, 'مِقبضٌ مشوَّه');
  assert.equal((await killOne(W, A.ck, { sid: mine.find((s) => s.mine).sid })).status, 409, 'الحاليةُ لا تُنهى هنا');
  /* «ليس أنا»: تلك الجلسة وحدها */
  const r = await killOne(W, A.ck, { sid: sidB, why: 'not-me' }); assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.equal(await who(W, B.ck), 401, 'الجلسةُ المعنيّة أُنهيت'); assert.equal(await who(W, A.ck), 200, 'الطالبُ باقٍ');
  assert.ok(W.env.DB.q("SELECT detail FROM sec WHERE act = 'sess_kill' ORDER BY id DESC LIMIT 1")[0].detail === 'self-not-me', 'سُجّل في سجل الأمن');
  assert.equal((await killOne(W, A.ck, { sid: sidB })).status, 404, 'لا تُنهى مرتين');
});

test('(٢) /api/me: الجهاز والمتصفح والمدينة والبدء وآخرُ نشاط و«الحالية» — بلا رمزٍ ولا IP', async () => {
  const W = await world({ worker: WU.file });
  const A = await loginDv(W, DM, null); await loginDv(W, DM, null);
  const j = await me(W, A.ck); assert.equal(j.ok, 1);
  assert.equal(j.sess.length, 2); assert.equal(j.sess.filter((s) => s.mine).length, 1);
  for (const s of j.sess) {
    assert.deepEqual(Object.keys(s).sort(), ['active', 'br', 'city', 'dev', 'la', 'mine', 'sid', 'ts'], JSON.stringify(s));
    assert.equal(s.br, 'Chrome'); assert.match(s.sid, /^[0-9a-f]{16}$/);
  }
  const toks = W.env.DB.q('SELECT tok FROM sess').map((r) => r.tok);
  assert.ok(!toks.some((t) => JSON.stringify(j).includes(t)), 'لا رمزَ في الردّ');
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM sess WHERE dv IS NOT NULL AND br = ?', 'Chrome')[0].n >= 2, true, 'المعرّفُ والمتصفحُ على صفّ الجلسة');
});

test('(٣) شاشةُ العرض: قراءةُ إدارتها وحدها · كلُّ مسارٍ مغيِّر 403 · عمرُ الجلسة dispH · بلا تغييرٍ إجباري ولا تنبيه ولا حضور', async () => {
  const W = await world({ worker: WU.file });
  addAccount(W.env, { uid: DISP.uid, un: DISP.un, pw: DISP.pw, name: TAG + ' · شاشة', ekey: undefined, role: 'display' });
  const n0 = scDev(W).length;
  const L = await loginDv(W, [DISP.un, DISP.pw], null); assert.equal(L.j.role, 'display'); assert.equal(L.j.mustChange, 0, 'لا تغييرَ إجباري');
  await loginDv(W, [DISP.un, DISP.pw], null); assert.equal(scDev(W).length, n0, 'لا تنبيهَ جهاز لشاشة العرض');
  assert.match(L.sc, /Max-Age=86400/, 'كعكةُ الجلسة بعمر dispH (24 س افتراضياً)');
  /* القراءة: مفاتيحُ إدارتها وحدها */
  const ch = await W.C.api('/api/changes?since=0', { cookie: L.ck }); assert.equal(ch.status, 200);
  const dk = ch.j.keys.filter((k) => k.startsWith('bsdept:'));
  assert.ok(dk.length > 0 && dk.every((k) => k.startsWith('bsdept:' + D + ':')), 'تقرأ إدارتَها وحدها: ' + dk.slice(0, 4).join(','));
  /* الكتابة: الحفظ + كلُّ مسارٍ مغيِّر في العقد (عدا الخروج والدخول والاستعادة العامة وإنهاء جلساتها هي) */
  const C = JSON.parse(fs.readFileSync(path.join(SRC, 'api', 'contracts.json'), 'utf8'));
  const skip = new Set(['/api/login', '/api/logout', '/api/recover', '/api/me/sess/kill', '/api/me/sess/kill-one']);
  const writes = C.routes.filter((r) => !skip.has(r.path) && r.methods.some((m) => m !== 'GET'));
  assert.ok(writes.some((r) => r.path === '/api/save') && writes.length >= 10, 'المساراتُ المكتوبة من العقد: ' + writes.length);
  const before = JSON.stringify(stored(W.env, 'bassam_auth_users_v1'));
  for (const r of writes) for (const m of r.methods.filter((x) => x !== 'GET')) {
    const p = r.path.endsWith('/') ? r.path + 'TEST_ONLY_x' : r.path;
    const x = await W.C.api(p, { method: m, cookie: L.ck, body: r.path === '/api/save' ? { set: { bassam_auth_users_v1: '[]' }, del: [], base: {} } : { dept: D, TEST_ONLY: 1 } });
    assert.equal(x.status, 403, m + ' ' + p + ' ⇒ ' + x.status + ' ' + JSON.stringify(x.j).slice(0, 120)); assert.equal(x.j.why, 'display');
  }
  assert.equal(JSON.stringify(stored(W.env, 'bassam_auth_users_v1')), before, 'لا شيءَ تغيّر');
  assert.equal(await who(W, L.ck), 200, 'والجلسةُ باقية');
  /* العمر: 13 ساعة تمرّ لشاشة العرض (dispH 24) وتسقط للموظف (sessH 12) · 25 ساعة تسقط */
  const H = 3600e3, now = Date.now(), tokD = L.ck.split('=')[1];
  const S = await W.login(ME.un, ME.pw), tokS = S.ck.split('=')[1];
  W.env.DB.exec(`UPDATE sess SET ts = ${now - 13 * H}, la = ${now - 60000} WHERE tok IN ('${tokD}', '${tokS}')`);
  assert.equal(await who(W, L.ck), 200, 'شاشةُ العرض بعد 13 س'); assert.equal(await who(W, S.ck), 401, 'الموظفُ بعد 13 س (كما كان)');
  W.env.DB.exec(`UPDATE sess SET ts = ${now - 25 * H}, la = ${now - 60000} WHERE tok = '${tokD}'`);
  assert.equal(await who(W, L.ck), 401, 'شاشةُ العرض بعد 25 س');
  /* الحضور: لا تظهر */
  const L2 = await loginDv(W, [DISP.un, DISP.pw], null);
  const pr = await W.C.api('/api/presence', { cookie: W.su.ck }); assert.equal(pr.status, 200);
  assert.ok(!pr.j.list.some((x) => x.u && x.u.id === DISP.uid), 'شاشةُ العرض ليست حضوراً'); assert.equal(await who(W, L2.ck), 200);
});

test('(٣ب) حسابُ شاشة العرض ينشئه مديرُ النظام وحده — مديرُ الإدارة يُرفض', async () => {
  const W = await world({ worker: WU.file });
  const users = () => JSON.parse(W.env.DB.q("SELECT v FROM kv WHERE k = 'bassam_auth_users_v1' ORDER BY seq").map((r) => r.v).join(''));
  const pub = (u) => { const o = Object.assign({}, u); delete o.ph; return o; };
  const disp = { id: 'TEST_ONLY_disp2', un: '0000000902', name: TAG + ' · شاشة ٢', role: 'display', deptId: D };
  const dm = await W.login(...DM);
  const bad = await W.C.save(dm.ck, { bassam_auth_users_v1: JSON.stringify(users().map(pub).concat([disp])) });
  assert.ok(bad.j.ok !== 1 || (bad.j.denied && bad.j.denied.bassam_auth_users_v1 && bad.j.denied.bassam_auth_users_v1.why === 'mgr'), 'مديرُ الإدارة لا ينشئ شاشةَ عرض: ' + JSON.stringify(bad.j).slice(0, 160));
  assert.ok(!users().some((u) => u.id === disp.id));
  const good = await W.C.save(W.su.ck, { bassam_auth_users_v1: JSON.stringify(users().map(pub).concat([disp])) });
  assert.equal(good.j.ok, 1, JSON.stringify(good.j).slice(0, 200)); assert.equal(Object.keys(good.j.denied || {}).length, 0, JSON.stringify(good.j.denied)); assert.ok(users().some((u) => u.id === disp.id && u.role === 'display'));
});

test('(٤) جلسةٌ أُنهيت أثناء انتظار /api/changes?wait=1 تأخذ 401 خلال ثوانٍ (لا بعد 25)', async () => {
  const W = await world({ worker: WU.file });
  const A = await loginDv(W, DM, null), B = await loginDv(W, DM, null);
  const v = (await W.C.api('/api/changes?since=0', { cookie: B.ck })).j.v;
  const sidB = (await me(W, A.ck)).sess.find((s) => !s.mine).sid;
  const t0 = Date.now(); const wait = W.C.api('/api/changes?since=' + v + '&wait=1', { cookie: B.ck });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal((await killOne(W, A.ck, { sid: sidB })).status, 200);
  const r = await wait, ms = Date.now() - t0;
  assert.equal(r.status, 401, JSON.stringify(r.j)); assert.equal(r.j.err, 'session');
  assert.ok(ms < 3500, 'خلال ثوانٍ: ' + ms + ' ms');
  /* وجلسةٌ سليمة تبقى تنتظر (لا 401 زائف) — ثم الخروجُ نفسُه يقطع انتظارَها خلال ثوانٍ */
  const w2 = W.C.api('/api/changes?since=' + v + '&wait=1', { cookie: A.ck }); let done2 = null; w2.then((x) => { done2 = x; });
  await new Promise((r2) => setTimeout(r2, 2600));
  assert.equal(done2, null, 'السليمةُ ما زالت تنتظر بعد مراجعة الجلسة');
  const t1 = Date.now(); assert.equal((await W.C.api('/api/logout', { method: 'POST', cookie: A.ck, body: {} })).status, 200);
  const r2 = await w2; assert.equal(r2.status, 401); assert.ok(Date.now() - t1 < 3500, 'بعد الخروج خلال ثوانٍ: ' + (Date.now() - t1) + ' ms');
});

test('(٣ج) وضعُ الإنفاذ: شاشةُ العرض تقرأ إدارتَها وحدها والحفظُ 403', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' });
  addAccount(W.env, { uid: DISP.uid, un: DISP.un, pw: DISP.pw, ekey: undefined, role: 'display' });
  const L = await loginDv(W, [DISP.un, DISP.pw], null);
  const ch = await W.C.api('/api/changes?since=0', { cookie: L.ck }); assert.equal(ch.status, 200, JSON.stringify(ch.j).slice(0, 200));
  const dk = ch.j.keys.filter((k) => k.startsWith('bsdept:'));
  assert.ok(dk.length > 0 && dk.every((k) => k.startsWith('bsdept:' + D + ':')), 'إدارتُها وحدها: ' + dk.slice(0, 4).join(','));
  const x = await W.C.api('/api/save', { method: 'POST', cookie: L.ck, body: { set: {}, del: [], base: {} } }); assert.equal(x.status, 403); assert.equal(x.j.why, 'display');
});
