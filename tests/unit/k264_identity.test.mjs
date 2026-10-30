/* KIVO_264 · D-3 (متوسط · شقُّ الواجهة) — طابورُ الكتابة غيرُ مربوطٍ بهوية الجلسة التي أنتجته (دليلُ التدقيق t3 مُكيَّفاً).
   العيب: تعديلُ X المعلَّق (انقطاعٌ في الشبكة) يُرسَل بعد أن خرج X ودخل Y في المتصفح نفسِه — فيُحفظ باسم Y وبصلاحياته (aud.uid = Y)؛
   جسمُ /api/save لا يحمل هويةً والخادمُ يأخذها من الكوكي وحده. الشقُّ المطلوب من الواجهة (العقد C1): كلُّ حفظٍ يحمل uid من __BS_BOOT
   (لا من علامة الجهاز)، وعند 409 {err:'session-changed'} لا يُعاد إرسالُ الطابور باسم الهوية الجديدة: يُعزل ويُبلَّغ المستخدم ويُعاد التحميل.
   ودفاعٌ في العمق بلا خادم: دخولُ حسابٍ آخر في تبويبٍ آخر من المتصفح نفسِه (تتبدّل علامةُ الجلسة) يعزل الطابورَ قبل أيّ إرسال. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLegacyTestEnv as makeEnv, client, applySql } from './harness.mjs';
import { loadClient, shareNative, asWriter, sleep, until, fixture, pageText, TODAY } from './k264_vm.mjs';

/* خادمٌ وهميٌّ بعقد C1: uid في الجسم ≠ هوية الجلسة ⇒ 409 session-changed */
function c1Server() {
  const S = { cur: 'u_x', rev: 10, saved: [] };
  S.C = { req: async (p, o) => {
    const J = (x, st = 200) => new Response(JSON.stringify(x), { status: st, headers: { 'Content-Type': 'application/json' } });
    if (p.startsWith('/api/save')) {
      const b = JSON.parse(o.body || '{}');
      if (b.uid !== undefined && b.uid !== S.cur) return J({ ok: 0, err: 'session-changed' }, 409);
      const revs = {}; for (const k in (b.set || {})) { revs[k] = ++S.rev; S.saved.push({ k, by: S.cur, uid: b.uid }); }
      return J({ ok: 1, revs });
    }
    if (p.startsWith('/api/changes')) return J({ v: S.rev, keys: [] });
    if (p.startsWith('/api/get')) return J({ ok: 1, v: S.rev, keys: {} });
    return J({ ok: 1 });
  } };
  return S;
}
const K1 = 'bsdept:d1:bassam_irshad_v1', K2 = 'bsdept:d1:bassam_tasks_v1', K3 = 'bsdept:d1:bassam_options_v1';
const bootX = { srv: 1, cf: 1, v: 10, uid: 'u_x', keys: { [K1]: '{}', [K2]: '{}', [K3]: '{}' }, revs: { [K1]: 1, [K2]: 2, [K3]: 3 } };

test('D-3: كلُّ حفظٍ يحمل uid من __BS_BOOT — لا من علامة الجهاز (ولو كانت لحسابٍ آخر)', async () => {
  const S = c1Server(); const now = Date.now();
  const T = loadClient({ C: S.C, boot: bootX, blocks: [] });
  T.W.localStorage.setItem('bassam_session_v1', JSON.stringify({ uid: 'su', ts: now, la: now, mc: 0 }));   /* علامةٌ قديمة على الجهاز */
  T.run(['280-server-storage.js']);
  try {
    T.set(K1, JSON.stringify({ reports: [{ id: 'k264a', test: 'TEST_ONLY' }] }));
    assert.ok(await until(() => T.saves().length >= 1, 3000), 'أُرسل الحفظ');
    const body = JSON.parse(T.saves()[0].body);
    assert.equal(body.uid, 'u_x', 'الجسمُ يحمل هويةَ الجلسة من الإقلاع: ' + T.saves()[0].body.slice(0, 160));
    assert.equal(S.saved[0].by, 'u_x');
  } finally { T.dispose(); }
});

test('D-3: 409 session-changed ⇒ لا يُعاد إرسالُ الطابور باسم الهوية الجديدة · يُعزل · يُبلَّغ المستخدم · يُعاد التحميل', async () => {
  const S = c1Server();
  const T = loadClient({ C: S.C, boot: bootX, blocks: ['280-server-storage.js'] });
  try {
    T.set(K1, JSON.stringify({ reports: [{ id: 'k264a', test: 'TEST_ONLY' }] }));
    assert.ok(await until(() => S.saved.length === 1, 3000), 'حفظُ X الأول قُبل');
    /* انقطاع: تعديلُ X يبقى في الطابور */
    T.net.down = true; T.W.dispatchEvent(new Event('offline'));
    T.set(K2, JSON.stringify({ [TODAY.year + '-1-1']: [['TEST_ONLY مهمة X']] }));
    await sleep(400);
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), true, 'التعديلُ معلَّق');
    /* في تبويبٍ آخر خرج X ودخل Y — الكوكي الآن لـY */
    S.cur = 'u_y';
    T.net.down = false; T.W.dispatchEvent(new Event('online'));
    assert.ok(await until(() => typeof T.W.KIVO.__BS_SRV.sesChanged === 'function' && T.W.KIVO.__BS_SRV.sesChanged(), 3000), 'رُدّ الحفظ 409 فعرف التبويبُ أن الجلسة تبدّلت');
    const n0 = T.saves().length;
    T.set(K3, JSON.stringify({ items: [{ name: 'TEST_ONLY بعد التبدّل' }] }));
    try { T.W.dispatchEvent(new Event('pagehide')); } catch (e) {}
    await sleep(1200);
    assert.equal(S.saved.length, 1, 'لا شيءَ حُفظ باسم Y: ' + JSON.stringify(S.saved));
    assert.equal(T.saves().length, n0, 'ولا إرسالَ بعد 409 (ولا نبضةَ عند الإغلاق)');
    const orph = T.W.KIVO.__BS_SRV.orphaned();
    assert.ok(orph && orph.set.includes(K2), 'تعديلُ X معزولٌ لا يُرسل: ' + JSON.stringify(orph));
    assert.match(pageText(T.W), /تغيّر الحسابُ المسجَّل في هذا المتصفح/, 'المستخدمُ يُبلَّغ صراحةً');
    assert.ok(await until(() => T.log.includes('reload'), 5000), 'ثم تُعاد الصفحةُ على الحساب الحالي');
  } finally { T.dispose(); }
});

test('D-3: دخولُ حسابٍ آخر في تبويبٍ آخر (تتبدّل علامةُ الجلسة) يعزل الطابورَ قبل أيّ إرسال — ولو بلا عقد الخادم', async () => {
  const S = c1Server(); S.C0 = S.C; let saves = 0;
  const C = { req: async (p, o) => { if (p.startsWith('/api/save')) { saves++; return new Response(JSON.stringify({ ok: 1, revs: {} }), { status: 200 }); } return S.C0.req(p, o); } };   /* خادمٌ قديم: لا يعرف uid */
  const now = Date.now();
  const A = loadClient({ C, boot: bootX, blocks: [] }), Other = loadClient({ C, boot: bootX, blocks: [] });
  const shared = shareNative([A, Other]);
  shared.set('bassam_session_v1', JSON.stringify({ uid: 'u_x', ts: now, la: now, mc: 0 }));
  A.run(['280-server-storage.js']);
  try {
    /* لمسُ النشاط بالهوية نفسِها لا يعني شيئاً */
    asWriter(shared, Other, () => Other.W.localStorage.setItem('bassam_session_v1', JSON.stringify({ uid: 'u_x', ts: now, la: now + 61000, mc: 0 })));
    assert.equal(A.W.KIVO.__BS_SRV.sesChanged(), false);
    A.net.down = true;
    A.set(K2, JSON.stringify({ x: 'TEST_ONLY X' }));
    await sleep(300);
    /* التبويبُ الآخر: X خرج ودخل Y */
    asWriter(shared, Other, () => Other.W.localStorage.setItem('bassam_session_v1', JSON.stringify({ uid: 'u_y', ts: now, la: now, mc: 0 })));
    assert.equal(A.W.KIVO.__BS_SRV.sesChanged(), true, 'التبويبُ عرف أن هويته لم تعد هوية المتصفح');
    const s0 = saves; A.net.down = false; A.W.dispatchEvent(new Event('online'));
    await sleep(900);
    assert.equal(saves, s0, 'لا إرسالَ لتعديل X بعد دخول Y');
    assert.ok(A.W.KIVO.__BS_SRV.orphaned().set.includes(K2));
  } finally { A.dispose(); Other.dispose(); }
});

/* من طرفٍ إلى طرف على الخادم الحقيقي (t3): يُحكم بالعقد C1 كما في العامل؛ وإن لم يكن فيه بعدُ (يُنفَّذ في الخادم بالتوازي) يُحاكى العقدُ
   بطبقةٍ رفيعة معلَنة أمام العامل الحقيقي (هويةُ الكوكي من /api/whoami) — فيُختبر تكاملُ الواجهة مع العقد الآن لا بعد الدمج */
for (const mode of ['legacy', 'enforce']) test('[' + mode + '] D-3 (طرفٌ لطرف): تعديلُ X المعلَّق لا يُحفظ باسم Y بعد خروجٍ ودخولٍ في المتصفح نفسِه', async (t) => {
  const K = 'bsdept:tst_d1:bassam_irshad_v1';
  const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : { KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const X = await C.login('0000000113', '70113'); assert.ok(X.ok, 'X = tst_emp1');
  const bX = await C.boot(X.ck); assert.ok(bX.boot && bX.boot.keys[K]);
  const probe = await C.api('/api/save', { method: 'POST', cookie: X.ck, body: { set: {}, del: [], base: {}, uid: '__k264_probe__' } });
  const hasC1 = probe.status === 409 && probe.j && probe.j.err === 'session-changed';
  t.diagnostic('C1 (409 session-changed): ' + (hasC1 ? 'في العامل' : 'غائبٌ في هذا العامل — يُحاكى أمامه'));
  const Cx = hasC1 ? C : { req: async (p, o) => {
    if (p.startsWith('/api/save') && o.body) { const b = JSON.parse(o.body); if (b.uid !== undefined) { const w = await C.api('/api/whoami', { cookie: o.cookie }); if (w.j && w.j.uid && w.j.uid !== b.uid) return new Response(JSON.stringify({ ok: 0, err: 'session-changed' }), { status: 409 }); } }
    return C.req(p, o);
  } };
  const jar = { cookie: X.ck };
  const A = loadClient({ C: Cx, boot: bX.boot, jar });
  try {
    await sleep(1500);
    A.net.down = true; A.W.dispatchEvent(new Event('offline'));
    const cur = JSON.parse(A.get(K)); const rec = { id: 'k264x1', y: TODAY.year, m: TODAY.month, d: TODAY.day, loc: 'TEST_ONLY موقع D-3', shift: 'TST-A', lang: 'TEST_ONLY لغة', n: 7, by: 'tst_e_emp1', test: 'TEST_ONLY' };
    A.set(K, JSON.stringify(Object.assign({}, cur, { reports: (cur.reports || []).concat([rec]) })));
    await sleep(400);
    assert.equal(A.W.KIVO.__BS_SRV.dirty(), true);
    const lo = await C.api('/api/logout', { method: 'POST', cookie: X.ck }); assert.ok(lo.status < 400);
    const Y = await C.login('0000000111', '70111'); assert.ok(Y.ok, 'Y = tst_sup1'); jar.cookie = Y.ck;
    A.net.down = false; A.W.dispatchEvent(new Event('online'));
    await sleep(1500);
    const sent = A.saves().map(s => JSON.parse(s.body));
    assert.ok(sent.length && sent.every(b => b.uid === 'tst_emp1'), 'كلُّ حفظٍ أُرسل يحمل هويةَ X من الإقلاع');
    const stored = env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', K).map(r => r.v).join('');
    const audY = env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND uid = 'tst_sup1'", K)[0].n;
    assert.ok(!stored.includes('k264x1') && audY === 0, 'تعديلُ X لم يُحفظ باسم Y (ولا أثرَ له في سجل التدقيق باسمه)');
    assert.equal(A.W.KIVO.__BS_SRV.sesChanged(), true); assert.ok(A.W.KIVO.__BS_SRV.orphaned().set.includes(K), 'ومعزولٌ في التبويب');
  } finally { A.dispose(); }
});
