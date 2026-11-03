/* KIVO_264 · مسبارُ المراجعة المستقلة rev264b (2026-10-14) مُدرَجاً في المستودع كما كتبه المراجع — يشغّله k264_gate335_e2e.test.mjs.
   Derived from revsec/p2_cur_e2e.mjs.
   Difference from p2: (c) no longer re-implements the gate. It loads the REAL block 335-identity-gate.js (after 280/310/320/330/440)
   with a tiny lazy DOM (getElementById creates elements on demand; MutationObserver stub; location.href setter recorded),
   fills bsUn1/bsPw1/bsPw2 and fires the real click handler of bsPwSave.
   S1  forced change with session > 15 min (server denies)         — expect: message + navigation to /api/logout, mc kept, no reload
   S2  forced change with fresh session (control)                  — expect: reload, mc cleared, new credentials work, admin/admin dead
   S3  forced change that HOLDS + an unrelated denied write         — probes the global denied() counter (false "did not hold"?)
   S4  F4: changeOwnAccount(un) whose first /api/save hits a network error  → retry carries cur?
   S5  F4: changeOwnAccount(un) whose save meets a conflict on the users key → merge resend carries cur?
   S6  F6: pw guard locked → what changeOwnAccount returns (checkpw path)
   Usage: KIVO_DIST=<dist> node p3_gate335.mjs <worktree> */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const WT = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const H = await import(pathToFileURL(path.join(WT, 'tests/unit/harness.mjs')).href);
const V = await import(pathToFileURL(path.join(WT, 'tests/unit/k264_vm.mjs')).href);
const { makeLegacyTestEnv: makeEnv, client, applySql } = H; const { loadClient, sleep, until, fixture } = V;
const { installCurrentSchemaFixture } = await import(pathToFileURL(path.join(WT, 'tests/unit/current_schema_fx.mjs')).href);
const K = 'bassam_auth_users_v1';
const ph = (pw) => { const s = crypto.randomBytes(16); return 'p2$100000$' + s.toString('hex') + '$' + crypto.pbkdf2Sync(pw, s, 100000, 32, 'sha256').toString('hex'); };
const dbUsers = (env) => JSON.parse(env.DB.q('SELECT v FROM kv WHERE k = ?1 ORDER BY seq', K).map(r => r.v).join(''));
const BLOCKS = ['280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '440-count.js'];
const GATE = ['335-identity-gate.js'];   /* 331-334 need the page manifest; the only thing 335's forced path takes from them is I.u0, set below exactly as 334:486-491 does (u0 = cur()) */
const out = []; const ok = (c, m, x) => { out.push((c ? 'PASS ' : 'FAIL ') + m + (x ? ' — ' + x : '')); };
const info = (m) => out.push('INFO ' + m);
async function world(mode) {
  const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {}); const C = client(env);
  const su = await C.login('admin', 'admin'); await applySql(env.DB, fixture().seed); await installCurrentSchemaFixture(env);   /* RISHAD-266: legacy seed → current D1 storage */
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  return { env, C, su };
}
/* a tab with a lazy DOM so that 335 can run */
function tab(C, ck, boot, uid, mc = 0, extra = []) {
  const T = loadClient({ C, boot, jar: { cookie: ck }, blocks: [] });
  const W = T.W, now = Date.now(); W.localStorage._m.set('bassam_session_v1', JSON.stringify({ uid, ts: now, la: now, mc }));
  const ids = new Map(); const mk = W.document.createElement;
  const find9 = (n, id) => { if (!n) return null; if (n.id === id) return n; for (const c of n.children || []) { const r = find9(c, id); if (r) return r; } return null; };
  const inHtml9 = (n, id) => !!n && ((n._html || '').includes('id="' + id + '"') || (n.children || []).some(c => inHtml9(c, id)));
  /* only ids that exist: appended elements by .id, or ids present in some innerHTML (lazy element per id) — so bsUn1 exists only when 335 rendered it */
  W.document.getElementById = (id) => { const d = find9(W.document.body, id); if (d) return d; if (!ids.has(id) && !inHtml9(W.document.body, id)) return null; if (!ids.has(id)) { const e = mk('div'); e.id = id; e.value = ''; e.classList.toggle = function (c, f) { if (f === undefined ? !this._s.has(c) : f) this._s.add(c); else this._s.delete(c); }; ids.set(id, e); } return ids.get(id); };
  W.MutationObserver = class { observe() {} disconnect() {} };
  const nav = []; let href = W.location.href;
  Object.defineProperty(W.location, 'href', { get: () => href, set: (v) => { nav.push(String(v)); href = String(v); }, configurable: true });
  T.ids = ids; T.nav = nav;
  T.run(BLOCKS); if (extra.length) { const I = W.KIVO.__BS_I.auth; I.u0 = I.cur(); T.run(extra); } return T;
}
const gateText = (T) => { const e = T.ids.get('bsGateErr'); return e ? (e._text || '') : ''; };
async function gateSave(T, un, pw) {
  const g = (id) => T.W.document.getElementById(id);
  if (un != null) g('bsUn1').value = un; g('bsPw1').value = pw; g('bsPw2').value = pw;
  const sv = g('bsPwSave'); const L = (sv.listeners.click || []);
  if (!L.length) throw new Error('bsPwSave has no click handler — gate not in forced mode');
  L[0]();
}
for (const mode of ['legacy', 'enforce']) {
  /* S1 — > 15 min */
  {
    const { env, C, su } = await world(mode);
    env.DB.exec('UPDATE sess SET ts = ts - 16 * 60000');
    const b = await C.boot(su.ck); const T = tab(C, su.ck, b.boot, 'su', 1, GATE);
    try {
      await sleep(400);
      const I = T.W.KIVO.__BS_I.auth;
      ok(I.needsPwChange() === true && !!T.ids.get('bsUn1'), `[${mode}] S1 setup: forced gate shown with the username field (admin/admin, mc:1)`);
      await gateSave(T, '0500000777', '135790');
      await until(() => T.nav.length || T.log.includes('reload'), 6000);
      const st = dbUsers(env).find(u => u.id === 'su');
      info(`[${mode}] S1 after save: nav=${JSON.stringify(T.nav)} reload=${T.log.includes('reload')} msg=«${gateText(T)}» denied=${T.W.KIVO.__BS_SRV.denied()} stored.un=${st.un} needsPwChange=${I.needsPwChange()}`);
      ok(T.nav.includes('/api/logout') && !T.log.includes('reload'), `[${mode}] S1 denied forced change ⇒ logout navigation, no reload-as-success`);
      ok(I.needsPwChange() === true, `[${mode}] S1 must-change marker kept`);
      ok(/انتهت مهلةُ تغيير كلمة المرور الأولى/.test(gateText(T)), `[${mode}] S1 message shown`, gateText(T));
      const lgA = await C.login('admin', 'admin'), lgN = await C.login('0500000777', '135790');
      ok(st.un === 'admin' && lgA.ok && !lgN.ok, `[${mode}] S1 server state: admin/admin still the stored credential (expected — change refused), new creds rejected`, `admin=${lgA.ok} new=${lgN.ok}`);
      /* what /api/logout does with the cookie when the page navigates */
      const lo = await C.api('/api/logout', { cookie: su.ck }); const p2 = await C.api('/api/ping', { cookie: su.ck });
      info(`[${mode}] S1 GET /api/logout → ${lo.status}; ping with old cookie afterwards → ${p2.status}`);
    } finally { T.dispose(); }
  }
  /* S2 — fresh session (control) */
  {
    const { env, C, su } = await world(mode);
    const b = await C.boot(su.ck); const T = tab(C, su.ck, b.boot, 'su', 1, GATE);
    try {
      await sleep(400);
      const I = T.W.KIVO.__BS_I.auth;
      await gateSave(T, '0500000778', '135791');
      await until(() => T.nav.length || T.log.includes('reload'), 6000);
      const st = dbUsers(env).find(u => u.id === 'su');
      info(`[${mode}] S2 after save: nav=${JSON.stringify(T.nav)} reload=${T.log.includes('reload')} msg=«${gateText(T)}» stored.un=${st.un} mc=${st.mc} needsPwChange=${I.needsPwChange()}`);
      ok(T.log.includes('reload') && !T.nav.length && I.needsPwChange() === false, `[${mode}] S2 fresh forced change ⇒ reload, marker cleared (no false "did not hold")`);
      const lgA = await C.login('admin', 'admin'), lgN = await C.login('0500000778', '135791');
      ok(st.un === '0500000778' && !lgA.ok && lgN.ok && lgN.j.mustChange === 0, `[${mode}] S2 server: new creds work (mustChange 0), admin/admin dead`, JSON.stringify(lgN.j));
    } finally { T.dispose(); }
  }
  /* S3 — staff with mc (valid un ⇒ ph only), change HOLDS, plus one unrelated denied write between click and check */
  {
    const { env, C, su } = await world(mode);
    const g = await C.api('/api/get?keys=' + K, { cookie: su.ck }); const list = JSON.parse(g.j.keys[K].v);
    const me = list.find(u => u.id === 'tst_emp1');
    const f = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: { [K]: JSON.stringify(list.map(u => u.id === 'tst_emp1' ? Object.assign({}, u, { mc: 1 }) : u)) }, del: [], base: { [K]: g.j.keys[K].rev } } });
    const lg = await C.login(me.un, '70113'); const b = await C.boot(lg.ck);
    info(`[${mode}] S3 setup: mc on tst_emp1 saved=${!(f.j.denied || {})[K]} · login mustChange=${lg.j && lg.j.mustChange}`);
    const T = tab(C, lg.ck, b.boot, 'tst_emp1', 1, GATE);
    try {
      await sleep(400);
      const I = T.W.KIVO.__BS_I.auth;
      ok(I.needsPwChange() === true && !T.ids.has('bsUn1') && T.ids.has('bsPwSave'), `[${mode}] S3 forced gate (password only)`);
      const d0 = T.W.KIVO.__BS_SRV.denied();
      await gateSave(T, null, '246813');
      T.set('bassam_platform_v1', JSON.stringify({ login: { state: 'x' } }));   /* unrelated write this account may not make */
      await until(() => T.nav.length || T.log.includes('reload'), 7000);
      const st = dbUsers(env).find(u => u.id === 'tst_emp1');
      const lgN = await C.login(me.un, '246813');
      info(`[${mode}] S3 after save: denied ${d0}→${T.W.KIVO.__BS_SRV.denied()} nav=${JSON.stringify(T.nav)} reload=${T.log.includes('reload')} msg=«${gateText(T)}» stored.mc=${st.mc} new-pw login ok=${lgN.ok} mustChange=${lgN.j && lgN.j.mustChange}`);
      const held = lgN.ok && lgN.j.mustChange === 0;
      ok(!(held && T.nav.includes('/api/logout')), `[${mode}] S3 a change that HELD is not reported as "did not hold" because of an unrelated denial`, held ? 'change held on the server' : 'change did not hold');
    } finally { T.dispose(); }
  }
  /* S4/S5/S6 — changeOwnAccount (super, valid un) */
  for (const sc of ['S4-network', 'S5-conflict', 'S6-locked']) {
    const { env, C, su } = await world(mode);
    const g = await C.api('/api/get?keys=' + K, { cookie: su.ck }); const list = JSON.parse(g.j.keys[K].v);
    await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: { [K]: JSON.stringify(list.map(u => u.id === 'su' ? Object.assign({}, u, { un: '0500000000', ph: ph('482917') }) : u)) }, del: [], base: { [K]: g.j.keys[K].rev } } });
    const s2 = await C.login('0500000000', '482917'); const b = await C.boot(s2.ck);
    const T = tab(C, s2.ck, b.boot, 'su');
    try {
      await sleep(400);
      const A = T.W.KIVO.__BS_I.auth; const notes = [];
      if (sc === 'S4-network') {
        const f0 = T.W.fetch; let failed = 0;
        T.W.fetch = async (u, init = {}) => { if (!failed && /\/api\/save/.test(String(u)) && init.body && /"cur"/.test(String(init.body))) { failed = 1; throw new TypeError('Failed to fetch'); } return f0(u, init); };
      }
      if (sc === 'S5-conflict') {
        T.W.document.hidden = true;                                   /* stop /api/changes polling so the tab's base rev stays stale */
        const s3 = await C.login('admin', 'admin').catch(() => null);  /* not valid any more — use the same super via a second session */
        const s4 = await C.login('0500000000', '482917');
        const g2 = await C.api('/api/get?keys=' + K, { cookie: s4.ck }); const l2 = JSON.parse(g2.j.keys[K].v);
        const r2 = await C.api('/api/save', { method: 'POST', cookie: s4.ck, body: { set: { [K]: JSON.stringify(l2.map(u => u.id === 'tst_emp1' ? Object.assign({}, u, { email: 'x@y.zz' }) : u)) }, del: [], base: { [K]: g2.j.keys[K].rev } } });
        info(`[${mode}] S5 setup: concurrent edit of another account by a 2nd session saved=${!!(r2.j.revs || {})[K]}`);
      }
      if (sc === 'S6-locked') env.DB.exec("INSERT INTO guard (gk, n, until) VALUES ('pw:su', 99, " + (Date.now() + 3600000) + ") ON CONFLICT(gk) DO UPDATE SET n = 99, until = excluded.until");
      const r = await A.changeOwnAccount({ un: '0511111111', currentPw: '482917' });
      await sleep(sc === 'S4-network' ? 2500 : 600);
      const st = dbUsers(env).find(u => u.id === 'su');
      const bodies = T.saves().map(s => { try { return JSON.parse(s.body); } catch (e) { return {}; } }).filter(x => x.set && x.set[K]).map(x => 'cur=' + (x.cur ? 'yes' : 'no'));
      info(`[${mode}] ${sc}: changeOwnAccount → ${JSON.stringify(r)} · users saves sent: [${bodies.join(', ')}] · denied=${T.W.KIVO.__BS_SRV.denied()} · stored.un=${st.un}`);
      if (sc !== 'S6-locked') ok(st.un === '0511111111', `[${mode}] ${sc}: a legitimate username change (correct current password) is stored after the transient failure`, 'stored un=' + st.un + ' result=' + JSON.stringify(r));
      else ok(/محاولات/.test(String(r.err || '')), `[${mode}] S6: locked guard ⇒ user is told "too many attempts" (F6 intent)`, 'err=' + r.err);
    } finally { T.dispose(); }
  }
}
console.log(out.join('\n'));
console.log('RESULT ' + out.filter(l => l.startsWith('PASS')).length + ' pass / ' + out.filter(l => l.startsWith('FAIL')).length + ' fail');
process.exit(out.some(l => l.startsWith('FAIL')) ? 1 : 0);
