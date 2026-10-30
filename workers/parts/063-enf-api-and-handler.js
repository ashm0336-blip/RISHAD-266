/* ══ (6) الواجهات: حالةُ الإنفاذ · سجلُّ القرارات · الترحيلُ والرجوع (هوية → نطاق → صلاحيات) · جلسةُ اختبارٍ داخلية (Preview) ══ */
/* ما يُرسل للواجهة عن فاعلٍ: المفاتيحُ المحمولة لكل إدارة (bitset على ترتيب السجل) · العدساتُ المفعّلة · نطاقُه الفعلي */
function enfBits(A, d) {
  var ix = enfIx(), n = ix.order.length, bytes = new Uint8Array(Math.ceil(n / 8)), i, s = '';
  for (i = 0; i < n; i++) if (enfHeld(A, d, ix.order[i])) bytes[i >> 3] |= (1 << (i & 7));
  for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function enfDeptsOf(A) {
  var u = A.u, out = [], i;
  if (u.role === 'super' || u.role === 'gm') { for (i = 0; i < (A.depts || []).length; i++) { var d = A.depts[i] && A.depts[i].id; if (d && deptInScope(A, d)) out.push(d); } }
  else if (u.deptId) out.push(u.deptId);
  return out;
}
/* KIVO_264 · ورديةُ الفاعل المربوطةُ بالجدول الشهري (Shift: staffing-bound — enfEmpScopeOf · 058): تُقرأ من bsdept:<d>:bassam_staffing_v3 لحظةَ الإسقاط
   (enfViewCtx.shiftOk · 061)، فالجدولُ جزءٌ مما تُحسب منه مجموعةُ قراءته — بلا قيدِ ورديةٍ لفاعلي السقف (R4) ولا لـn/a ولا للقائمة الصريحة. */
var ENF_STAFF_RES = 'bassam_staffing_v3';
function enfShiftBound(A, recs, d) {
  if (!A || !A.u || !A.u.ekey || A.u.role === 'super' || KIVO_SCOPE.isCeiling(permv4Actor(A).actor)) return false;
  var es = enfEmpScopeOf({ recs: recs || {} }, d, String(A.u.ekey), 'Shift');
  return !!es && es.mode === 'staffing-bound';
}
/* sb في وصف الفاعل: ورديتُه الفعلية لكل شهرٍ في الجدول { '<y>-<m>': وردية } (صفُّه هو وحده) — فيتغيّر الوصفُ حين تتغيّر ورديتُه وحدها،
   والعميلُ يجدّد الموارد المُسقَطة حين يتغيّر الوصفُ بعد az (/api/changes · enfStaffAz) */
function enfShiftSig(A, refs, d) {
  if (!refs || !enfShiftBound(A, refs.recs, d)) return null;
  var st = refs.staffing ? refs.staffing[d] : null, ek = String(A.u.ekey), out = {}, mk;
  if (isObj(st)) for (mk in st) { if (!/^\d{4}-\d{1,2}$/.test(mk) || !isObj(st[mk])) continue; var r = st[mk][ek]; if (isObj(r) && r.shift) out[mk] = String(r.shift); }
  return out;
}
function enfMe(A, refs) {
  var ds = enfDeptsOf(A), out = { ver: ENF_VER, mode: 'enforce', n: enfIx().order.length, perm: enfPermMigrated(A), depts: {} }, i, L;
  for (i = 0; i < ds.length; i++) {
    var d = ds[i], rec = refs && refs.recs ? refs.recs[d] : null, lens = [];
    for (var li = 0; li < KIVO_LENS_PLUGINS.keys.length; li++) { L = KIVO_LENS_PLUGINS.keys[li]; if (KIVO_BUILD.lensGate(A.perms, A.u, d, L).on) lens.push(L); }   /* KIVO_259 · AUD-030: العدساتُ من الإضافات (الترتيبُ نفسُه) */
    var me = rec && isObj(rec.emp) && A.u.ekey ? rec.emp[A.u.ekey] || null : null;
    /* p: مفاتيحُ المنح الصريح (plus) المحمولة فعلاً — لتُضاف أفعالُها إلى الواجهة (الورقةُ القديمة لا تعرفها) */
    var gr = A.__grants && A.__grants[d] && A.u.ekey ? A.__grants[d].emp[A.u.ekey] : null, plus = [];
    if (isObj(gr) && Array.isArray(gr.plus)) gr.plus.forEach(function (k) { k = String(k); if (enfHeld(A, d, k) && plus.indexOf(k) === -1) plus.push(k); });
    out.depts[d] = { h: enfBits(A, d), lens: lens, ceil: rec && isObj(rec.ceiling) ? rec.ceiling : null, me: me, p: plus };
    var sb = enfShiftSig(A, refs, d); if (sb) out.depts[d].sb = sb;   /* KIVO_264: ورديتُه الفعلية من الجدول (للمربوط به وحده) */
  }
  return out;
}
async function enfAuthzApi(env, request, A, url, path) {
  var M = env.__enfm || await enfModeOf(env);
  if (path === '/api/authz') {
    var out = { ok: 1, ver: ENF_VER, mode: M.mode, env: M.env, d1: M.d1 || null, perm: M.perm, scope: M.scope, ident: M.ident, fixture: M.fixture };
    if (A.enf) out.me = enfMe(A, await enfRefsFor(env, enfDeptsOf(A), null));
    return json(out);
  }
  if (A.u.role !== 'super') return json({ ok: 0, err: 'forbidden' }, 403);
  if (!M.env) return json({ ok: 0, err: 'not-enforce-env' }, 404);
  await enfInitDb(env);
  if (path === '/api/authz/log') {
    var q = url.searchParams, lim = Math.min(500, Math.max(1, parseInt(q.get('limit') || '100', 10) || 100)), before = parseInt(q.get('before') || '0', 10) || 0;
    var dec = String(q.get('decision') || ''), uid = String(q.get('uid') || ''), res = String(q.get('res') || '');
    var r = await env.DB.prepare("SELECT id, ts, uid, role, dept, k, res, keys, scope, decision, why, reason, path, mode FROM authz WHERE (?2 = 0 OR id < ?2) AND (?3 = '' OR decision = ?3) AND (?4 = '' OR uid = ?4) AND (?5 = '' OR res = ?5) ORDER BY id DESC LIMIT ?1").bind(lim, before, dec, uid, res).all();
    var c = await env.DB.prepare("SELECT decision, COUNT(*) AS n FROM authz GROUP BY decision").all();
    return json({ ok: 1, rows: (r && r.results) || [], totals: (c && c.results) || [] });
  }
  if (path === '/api/authz/snaps') {
    var s = await env.DB.prepare('SELECT snap, ts, uid, un, kind, n, meta, restored, rts, ruid FROM authz_snaps ORDER BY ts DESC LIMIT 200').all();
    return json({ ok: 1, rows: (s && s.results) || [] });
  }
  return json({ ok: 0, err: 'not-found' }, 404);
}
/* ── الترحيل: خطةٌ حتمية (بذرة · بصمة) ثم تطبيقٌ بالبصمة نفسِها بعد نسخةٍ كاملة لما سيُكتب، ورجوعٌ كامل من النسخة ── */
async function enfSha(s) { var h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); var b = new Uint8Array(h), o = ''; for (var i = 0; i < b.length; i++) o += ('0' + b[i].toString(16)).slice(-2); return o; }
function enfSeed() { var b = new Uint8Array(32), s = '', i; crypto.getRandomValues(b); for (i = 0; i < 32; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
async function enfMigPlan(env, seed, opts) {
  opts = opts || {};
  /* الخطةُ دالّةٌ حتمية في (البذرة · لحظةِ التوليد · البيانات): التطبيقُ يعيد بناءها بلحظة الخطة نفسِها فتتطابق البصمةُ ما لم تتغيّر البيانات */
  var now = opts.now || Date.now(), T = dsToday(now), keys = await kvAll(env, 'kv'), revs = await revsAll(env), i, d, ek, dm;
  var depts = parseJson(keys[K_DEPTS], []), users = parseJson(keys[K_USERS], []), perms = parseJson(keys[K_PERM], {}), gd = parseJson(keys[K_GDEPTS], []);
  if (!Array.isArray(depts)) depts = []; if (!Array.isArray(users)) users = []; if (!isObj(perms)) perms = {}; if (!Array.isArray(gd)) gd = [];
  var byDept = {}, raw = {};
  for (i = 0; i < depts.length; i++) { d = depts[i] && depts[i].id; if (!d) continue; var pre = 'bsdept:' + d + ':';
    byDept[d] = { plan: parseJson(keys[pre + 'bassam_plan_v1'], null), rounds: parseJson(keys[pre + 'bassam_rounds_v1'], null), staffing: parseJson(keys[pre + 'bassam_staffing_v3'], null), dreport: parseJson(keys[pre + 'bassam_dreport_v1'], null), employees: parseJson(keys[pre + 'bassam_employees_v1'], []) }; }
  Object.keys(keys).forEach(function (kk) { if (/^bsdept:[^:]+:bassam_(plan|rounds)_v1$/.test(kk)) raw[kk] = keys[kk]; });
  var plan = { version: ENF_VER, seed: seed, today: T, generated: now, writes: [], identity: null, scope: { ceilings: [], employees: [], kept: [], decisions: [], inferable: [] }, perm: { grants: [], decisions: [] }, warnings: [] };
  var W = {};                                                                  /* k → قيمةٌ جديدة (نصّ) */
  /* (١) الهوية — tier A وحده (tier B يبقى معلّقاً للقرار) */
  var rh = KIVO_IDENTITY_MIGRATION.rehearse({ depts: depts, users: users, byDept: byDept }, { seed: seed, seedSource: 'authz-migrate', now: now, today: T, raw: raw, revs: revs });
  var ap = KIVO_IDENTITY_PREFLIGHT.applyTierA(byDept, rh);
  plan.identity = { applied: ap.applied, tierB: ap.tierB, pending: (rh.pending || []).slice(0, 60), gates: rh.gates || null, summary: rh.summary || null };
  for (d in ap.byDept) {
    ['plan', 'rounds'].forEach(function (res) { var a0 = byDept[d] && byDept[d][res], b0 = ap.byDept[d] && ap.byDept[d][res]; if (b0 == null || deq(a0, b0)) return; W['bsdept:' + d + ':bassam_' + res + '_v1'] = { v: JSON.stringify(b0), kind: 'identity' }; });
  }
  /* (٢) النطاق — على بيانات ما بعد الهوية؛ المحسومُ (exact) يُكتب، والاستنتاجُ عالي الثقة اختياريٌّ بمفتاح، والباقي قائمةُ قرار */
  var mkA = function (u) { return actorFromKeys(keys, u.id); };
  var hooks = { today: T, now: now, maxActors: 0, actorOf: mkA, ctxOf: function (A, dd) { return permv2Ctx(A, dd); }, fieldOnly: function (A, dd) { return dailyFieldOnly(A, dd); } };
  var dr = KIVO_SCOPE_MIGRATION.dryRun({ depts: depts, gdepts: gd, users: users, perms: perms, byDept: ap.byDept }, hooks);
  var take = function (cls) { return cls === 'exact' || (cls === 'inferable-high-confidence' && !!opts.inferable); };
  var recs = {};
  for (d in dr.departments) {
    var cur = parseJson(keys[enfScopeKey(d)], null), rec = isObj(cur) ? JSON.parse(JSON.stringify(cur)) : { v: 1 }, changed = false;
    if (!isObj(rec.ceiling)) rec.ceiling = {}; if (!isObj(rec.emp)) rec.emp = {};
    ['Site', 'Zone/Element'].forEach(function (dim) {
      var D = dr.departments[d][dim];
      if (isObj(rec.ceiling[dim]) && rec.ceiling[dim].mode && rec.ceiling[dim].mode !== 'unknown') { plan.scope.kept.push({ dept: d, dim: dim, mode: rec.ceiling[dim].mode }); return; }
      if (take(D.cls) && D.proposed.mode === 'ALL') { rec.ceiling[dim] = { mode: 'ALL', basis: String(D.basis || '').slice(0, 300), src: 'migration', cls: D.cls, at: now }; changed = true; plan.scope.ceilings.push({ dept: d, dim: dim, mode: 'ALL', cls: D.cls }); }
      else if (D.cls === 'inferable-high-confidence') plan.scope.inferable.push({ kind: 'ceiling', dept: d, dim: dim, proposed: D.proposed.mode, basis: D.basis });
      else plan.scope.decisions.push({ kind: 'ceiling', dept: d, dim: dim, cls: D.cls, basis: D.basis });
    });
    var E = dr.employees[d] || {};
    for (ek in E) {
      var e = E[ek]; if (!e || e.outOfScope || !e.scope) continue;
      for (dm in e.scope) {
        var sc = e.scope[dm]; if (!sc) continue;
        var have = isObj(rec.emp[ek]) && isObj(rec.emp[ek][dm]) && rec.emp[ek][dm].mode && rec.emp[ek][dm].mode !== 'unknown';
        if (have) { plan.scope.kept.push({ dept: d, ekey: ek, dim: dm, mode: rec.emp[ek][dm].mode }); continue; }
        if (!take(sc.cls)) { (sc.cls === 'inferable-high-confidence' ? plan.scope.inferable : plan.scope.decisions).push({ kind: 'employee', dept: d, ekey: ek, dim: dm, cls: sc.cls, proposed: sc.proposed, basis: sc.basis }); continue; }
        var p = sc.proposed || {}, val;
        if (dm === 'Shift') val = p.mode === 'staffing-bound' ? { mode: 'staffing-bound' } : null;
        else if (p.mode === 'inherit') val = { mode: 'inherit' };
        else if (p.mode === 'single' || p.mode === 'list') val = { mode: 'list', list: (p.engineIds && p.engineIds.length ? p.engineIds : (p.list || [])).map(String) };
        if (!val) { plan.scope.decisions.push({ kind: 'employee', dept: d, ekey: ek, dim: dm, cls: sc.cls, proposed: p, basis: 'proposed mode not writable' }); continue; }
        val.src = 'migration'; val.cls = sc.cls; val.at = now;
        rec.emp[ek] = isObj(rec.emp[ek]) ? rec.emp[ek] : {}; rec.emp[ek][dm] = val; changed = true;
        plan.scope.employees.push({ dept: d, ekey: ek, dim: dm, mode: val.mode, n: val.list ? val.list.length : 0, cls: sc.cls });
      }
    }
    if (changed) { rec.v = 1; rec.mig = { at: now, seed: seed.slice(0, 12) }; W[enfScopeKey(d)] = { v: JSON.stringify(rec), kind: 'scope' }; recs[d] = rec; }
  }
  /* (٣) الصلاحيات — D3-01: ينتهي توافقُ approve → retro.open بمنح المفتاح صراحةً لمن يحمله اليوم (يُحفظ السلوك ثم يصير المنحُ الصريحُ وحده)
     يُكتب في سجلّ المنح لكل إدارة (bsdept:<d>:bassam_grants_v1) — لا يُمسّ bassam_perms_v1، فالرجوعُ عنه لا يمسّ أوراقَ الصلاحيات */
  var GW = {};
  for (i = 0; i < users.length; i++) {
    var u = users[i]; if (!u || u.dis || !u.id || u.role === 'super' || !u.ekey) continue;
    var A = actorFromKeys(keys, u.id); if (!A) continue;
    var ds = enfDeptsOf(A);
    for (var j = 0; j < ds.length; j++) {
      d = ds[j]; var gk = enfGrantsKey(d);
      if (!GW[gk]) { var g0 = enfGrantRec(keys[gk]); GW[gk] = { rec: g0 ? JSON.parse(JSON.stringify(g0)) : { v: 1, emp: {} }, changed: false }; }
      var GR = GW[gk].rec, T9 = enfTranslated(A, d), g = isObj(GR.emp[u.ekey]) ? GR.emp[u.ekey] : null;
      var plus = g && Array.isArray(g.plus) ? g.plus.map(String) : [], minus = g && Array.isArray(g.minus) ? g.minus.map(String) : [];
      for (var ck in ENF_COMPAT) {
        if (!T9.keys[ck] || plus.indexOf(ck) !== -1 || minus.indexOf(ck) !== -1) continue;   /* منحٌ قائم أو إسقاطٌ صريح: يُحترم */
        if (!enfKeyOnCeiling(A, d, ck)) continue;
        var gp = GR.emp[u.ekey] = isObj(GR.emp[u.ekey]) ? GR.emp[u.ekey] : {};
        gp.plus = Array.isArray(gp.plus) ? gp.plus : []; gp.plus.push(ck); gp.src = 'migration'; gp.at = now;
        GW[gk].changed = true; plan.perm.grants.push({ dept: d, ekey: u.ekey, key: ck, basis: 'D3-01: ' + ENF_COMPAT[ck] + ' (compat) → explicit' });
      }
      /* backup.restore: لا ذرّةَ له في AS‑IS — مَن يملك «النسخة الاحتياطية» كتابةً اليوم مرشَّحٌ فقط (قرارٌ لا يُكتب آلياً) */
      if (isMgrOf(A, d) && T9.keys['backup.create'] && plus.indexOf('backup.restore') === -1) plan.perm.decisions.push({ dept: d, ekey: u.ekey, key: 'backup.restore', basis: 'F-13: super ∨ (role:mgr ∧ backup.restore) — no AS-IS atom; candidate holds admin/backup write today' });
    }
  }
  for (var gk2 in GW) if (GW[gk2].changed) W[gk2] = { v: JSON.stringify(GW[gk2].rec), kind: 'perm' };
  var parts = opts.parts || ['identity', 'scope', 'perm'];
  var ks = Object.keys(W).sort(), sig = [];
  for (i = 0; i < ks.length; i++) { if (parts.indexOf(W[ks[i]].kind) === -1) continue; plan.writes.push({ k: ks[i], kind: W[ks[i]].kind, bytes: W[ks[i]].v.length, existed: keys[ks[i]] != null, rev: revs[ks[i]] || 0 }); sig.push(ks[i] + '\u0001' + (revs[ks[i]] || 0) + '\u0001' + W[ks[i]].v); }
  plan.hash = await enfSha(sig.join('\u0002'));
  plan.parts = parts; plan.inferableOptIn = !!opts.inferable;
  plan.counts = { writes: plan.writes.length, identityKeys: plan.writes.filter(function (w) { return w.kind === 'identity'; }).length, scopeKeys: plan.writes.filter(function (w) { return w.kind === 'scope'; }).length, ceilings: plan.scope.ceilings.length, employeeValues: plan.scope.employees.length, kept: plan.scope.kept.length, decisions: plan.scope.decisions.length, inferable: plan.scope.inferable.length, grants: plan.perm.grants.length, permDecisions: plan.perm.decisions.length };
  return { plan: plan, W: W, keys: keys, revs: revs };
}
async function enfMigrateApi(env, request, A, url, meta) {
  if (A.u.role !== 'super') return json({ ok: 0, err: 'forbidden' }, 403);
  if (!enfEnvOn(env)) return json({ ok: 0, err: 'not-enforce-env' }, 404);
  await enfInitDb(env);
  var q = url.searchParams, b = {};
  if (request.method === 'POST') { var rb = await bodyRead(request, '/api/authz-migrate'); if (rb.res) return rb.res; b = rb.v; }   /* KIVO_264 · SOT-101: مخطّطُ الجسم (كان غيرُ الكائن يُحوَّل {} صامتاً) */
  var act = String(request.method === 'POST' ? b.act : (q.get('act') || 'status'));
  if (act === 'status') {
    var M = await enfModeOf(env), s = await env.DB.prepare('SELECT snap, ts, uid, un, kind, n, restored, rts FROM authz_snaps ORDER BY ts DESC LIMIT 50').all();
    return json({ ok: 1, mode: M.mode, env: M.env, d1: M.d1, perm: M.perm, scope: M.scope, ident: M.ident, snaps: (s && s.results) || [] });
  }
  if (act === 'plan') {
    var seedQ = String(q.get('seed') || ''), seed = /^[0-9a-f]{64}$/i.test(seedQ) ? seedQ.toLowerCase() : enfSeed();
    var parts = String(q.get('parts') || 'identity,scope,perm').split(',').filter(function (x) { return x === 'identity' || x === 'scope' || x === 'perm'; });
    var r = await enfMigPlan(env, seed, { inferable: q.get('inferable') === '1', parts: parts });
    return json({ ok: 1, plan: r.plan });
  }
  if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
  var now = Date.now(), ident = { uid: A.u.id, un: String(A.u.un || ''), ip: meta.ip || '', dev: meta.dev || '', city: meta.city || '' };
  if (act === 'apply') {
    if (!/^[0-9a-f]{64}$/i.test(String(b.seed || '')) || !/^[0-9a-f]{64}$/.test(String(b.hash || ''))) return json({ ok: 0, err: 'seed-hash' }, 400);
    var gen = +b.generated; if (!(gen > 0) || gen > now || now - gen > 24 * 3600 * 1000) return json({ ok: 0, err: 'generated' }, 400);   /* لحظةُ الخطة: خلال 24 ساعة */
    var parts2 = Array.isArray(b.parts) ? b.parts.filter(function (x) { return x === 'identity' || x === 'scope' || x === 'perm'; }) : ['identity', 'scope', 'perm'];
    var R2 = await enfMigPlan(env, String(b.seed).toLowerCase(), { inferable: !!b.inferable, parts: parts2, now: gen });
    if (R2.plan.hash !== b.hash) return json({ ok: 0, err: 'plan-changed', hash: R2.plan.hash }, 409);
    if (!R2.plan.writes.length) return json({ ok: 1, applied: 0, plan: R2.plan.counts });
    var rev = await nextRev(env), st2 = [], i;
    var snap = enfSnapId('migration'), items = R2.plan.writes.map(function (w) { return { k: w.k, cur: R2.keys[w.k] == null ? null : R2.keys[w.k] }; });
    var st = enfSnapStmts(env, snap, 'migration', A, items, R2.revs, { hash: b.hash, parts: parts2, inferable: !!b.inferable, counts: R2.plan.counts, rev: rev, generated: gen });
    for (var j0 = 0; j0 < st.length; j0 += 90) await env.DB.batch(st.slice(j0, j0 + 90));
    for (i = 0; i < R2.plan.writes.length; i++) {
      var w = R2.plan.writes[i];
      st2 = st2.concat(kvPutStmts(env, 'kv', w.k, R2.W[w.k].v));
      st2.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').bind(w.k, rev));
      st2.push(audEvStmt(env, { cid: 'mig_' + snap.slice(-12) + '_' + i, ts: now, uid: ident.uid, un: ident.un, dept: parseKey(w.k).dept || '', k: w.k, rev: rev, etype: 'dataset', eid: resName(w.k), ename: resName(w.k), act: 'migrated', ctx: JSON.stringify({ kind: w.kind, snap: snap }), bef: '', aft: '', ip: ident.ip, dev: ident.dev, city: ident.city }));
    }
    var flag = JSON.stringify({ applied: true, at: now, by: ident.uid, snap: snap, hash: b.hash, inferable: !!b.inferable });   /* المعرّفُ لا اسمُ المستخدم */
    parts2.forEach(function (p0) { var mk = p0 === 'identity' ? 'authz_id_mig' : (p0 === 'scope' ? 'authz_scope_mig' : 'authz_perm_mig'); st2.push(env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind(mk, flag)); });
    st2.push(enfLogStmt(env, { ts: now, uid: ident.uid, un: ident.un, role: 'super', k: 'authz-migrate', res: 'migration', keys: parts2.join(','), scope: 'writes=' + R2.plan.writes.length, decision: 'allow', why: 'apply', reason: snap, path: '/api/authz-migrate', ip: ident.ip }));
    for (var j1 = 0; j1 < st2.length; j1 += 90) await env.DB.batch(st2.slice(j1, j1 + 90));
    return json({ ok: 1, applied: R2.plan.writes.length, snap: snap, rev: rev, counts: R2.plan.counts });
  }
  if (act === 'rollback') {
    var sid = String(b.snap || ''); if (!/^[a-z]+_[a-z0-9]+_[a-z0-9]+$/.test(sid)) return json({ ok: 0, err: 'snap' }, 400);
    var sm = await env.DB.prepare('SELECT snap, kind, restored, meta FROM authz_snaps WHERE snap = ?1').bind(sid).first();
    if (!sm) return json({ ok: 0, err: 'not-found' }, 404);
    /* This rollback only understands the existing KV snapshot kinds. Typed or
       future snapshots require the atomic domain restore planner, never this
       direct KV writer. force bypasses drift only, not a storage contract. */
    if (['migration', 'restore', 'replace'].indexOf(sm.kind) === -1) return json({ ok: 0, err: 'typed-kind-unsupported' }, 400);
    var rows = await env.DB.prepare('SELECT k, seq, existed, rev, v FROM authz_snap WHERE snap = ?1 ORDER BY k, seq').bind(sid).all();
    /* Reject the WHOLE snapshot before nextRev or any write, including a
       tombstone for a retired key: mixed rollback must not partially succeed. */
    if (((rows && rows.results) || []).some(function (r0) { return resName(r0.k) === K_DSTATS || nfLegacyKey(r0.k) || cuLegacyKey(r0.k); })) return json({ ok: 0, err: 'domain-moved' }, 400);
    var byK = {}; ((rows && rows.results) || []).forEach(function (r0) { var o = byK[r0.k] = byK[r0.k] || { existed: r0.existed, v: '' }; if (r0.existed) o.v += r0.v; });
    /* الانجراف: مفتاحٌ تغيّر بعد العملية (رقمُ مراجعته ≠ رقمِ العملية) — الرجوعُ يمحو ما بعدها، فلا يُنفَّذ إلا بتأكيدٍ صريح (force) */
    var smMeta = parseJson(sm.meta, {}) || {}, opRev = +smMeta.rev || 0, drift = [], kk0;
    var revNow = await revsAll(env);
    for (kk0 in byK) if (!opRev || (revNow[kk0] || 0) !== opRev) drift.push({ k: kk0, rev: revNow[kk0] || 0 });
    if ((drift.length || sm.restored) && b.force !== true) return json({ ok: 0, err: sm.restored ? 'already-restored' : 'drift', opRev: opRev, drift: drift.slice(0, 50) }, 409);
    var rev2 = await nextRev(env), st3 = [], n = 0, kk;
    for (kk in byK) {
      n++;
      if (byK[kk].existed) st3 = st3.concat(kvPutStmts(env, 'kv', kk, byK[kk].v)); else st3.push(env.DB.prepare('DELETE FROM kv WHERE k = ?1').bind(kk));
      st3.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').bind(kk, rev2));
      st3.push(audEvStmt(env, { cid: 'rb_' + sid.slice(-12) + '_' + n + '_' + rev2, ts: now, uid: ident.uid, un: ident.un, dept: parseKey(kk).dept || '', k: kk, rev: rev2, etype: 'dataset', eid: resName(kk), ename: resName(kk), act: 'rolled_back', ctx: JSON.stringify({ snap: sid }), bef: '', aft: '', ip: ident.ip, dev: ident.dev, city: ident.city }));
    }
    if (sm.kind === 'migration') {
      var flags = await env.DB.prepare("SELECT k, v FROM meta WHERE k IN ('authz_perm_mig', 'authz_scope_mig', 'authz_id_mig')").all();
      ((flags && flags.results) || []).forEach(function (f) { var fv = parseJson(f.v, null); if (fv && fv.snap === sid) st3.push(env.DB.prepare('DELETE FROM meta WHERE k = ?1').bind(f.k)); });
    }
    st3.push(env.DB.prepare('UPDATE authz_snaps SET restored = restored + 1, rts = ?2, ruid = ?3 WHERE snap = ?1').bind(sid, now, ident.uid));
    st3.push(enfLogStmt(env, { ts: now, uid: ident.uid, un: ident.un, role: 'super', k: 'authz-migrate', res: sm.kind, keys: 'rollback', scope: 'keys=' + n, decision: 'allow', why: 'rollback', reason: sid, path: '/api/authz-migrate', ip: ident.ip }));
    for (var j2 = 0; j2 < st3.length; j2 += 90) await env.DB.batch(st3.slice(j2, j2 + 90));
    return json({ ok: 1, restored: n, snap: sid, rev: rev2 });
  }
  return json({ ok: 0, err: 'act' }, 400);
}
/* ── جلسةُ اختبارٍ داخلية (Preview وحدها: KIVO_TEST_FIXTURE=allow ∧ KIVO_AUTHZ_MODE=enforce · مديرُ النظام وحده):
   تنفّذ طلباً واحداً بهوية حسابِ اختبارٍ موسوم TEST_ONLY عبر المسار الكامل نفسِه (الجلسة · الحكم · D1) — والرمزُ لا يغادر الخادم ويُحذف فوراً ── */
function enfIsTestUser(u) { return !!(u && u.id && /^tst_/.test(String(u.id)) && u.test === 'TEST_ONLY' && !u.dis); }
/* @@KIVO_TEST_TOOL_BEGIN — KIVO_263 · SOT-173: تُستبدل في حزمة الإنتاج (tools/prod_strip.py) بدالةٍ تردّ 404 دائماً — الأداةُ لا تصل Production كوداً لا تفعيلاً فقط */
async function enfTestApi(self, env, request, A, url) {
  if (!enfFixtureOn(env)) return json({ ok: 0, err: 'not-found' }, 404);
  if (!enfTestHostOk(env, url)) return json({ ok: 0, err: 'not-found' }, 404);   /* KIVO_244 · ADR-004: مضيفُ Preview المعلن وحده — ولا Production أبداً */
  if (A.u.role !== 'super' || A.enfTest) return json({ ok: 0, err: 'forbidden' }, 403);
  await enfTestSweep(env);                                                         /* كنسٌ دفاعي لجلسات اختبارٍ تركها طلبٌ مقطوع */
  var rb = await bodyRead(request, '/api/authz-test'); if (rb.res) return rb.res; var b = rb.v;   /* KIVO_264 · SOT-101: مخطّطُ الجسم بعد حرّاس الأداة (البيئة · المضيف · مدير النظام) */
  var users = (await usersList(env)) || [], tu = users.filter(function (x) { return x && x.id === String(b.uid || ''); })[0];
  if (!enfIsTestUser(tu)) return json({ ok: 0, err: 'not-a-test-user' }, 403);
  var p = String(b.path || '/'); if (p.charAt(0) !== '/' || p.indexOf('/api/authz-test') === 0 || p.indexOf('/api/reset') === 0 || p.indexOf('/api/recover') === 0) return json({ ok: 0, err: 'path' }, 400);
  var m = String(b.method || 'GET').toUpperCase(); if (['GET', 'POST', 'PUT', 'DELETE'].indexOf(m) === -1) return json({ ok: 0, err: 'method' }, 400);
  var tok = randTok(), now = Date.now();
  await env.DB.prepare('INSERT INTO sess (tok, uid, ts, la, dev, city) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(tok, tu.id, now, now, 'test', 'TEST_ONLY').run();
  var res, out = { ok: 1, uid: tu.id, path: p, method: m };
  try {
    var init = { method: m, headers: { 'Cookie': COOKIE + '=' + tok, 'Origin': url.origin, 'Content-Type': 'application/json' } };
    if (m !== 'GET' && b.body !== undefined) init.body = typeof b.body === 'string' ? b.body : JSON.stringify(b.body);
    res = await self.handle(new Request(url.origin + p, init), env);
    out.status = res.status;
    var txt = await res.text();
    if (p === '/' || p.indexOf('/index.html') === 0) {
      var mm = /window\.__BS_BOOT=(\{[\s\S]*?\});<\/script>/.exec(txt), boot = mm ? parseJson(mm[1], null) : null;
      out.boot = boot ? { auth: boot.auth || '', keys: Object.keys(boot.keys || {}), authz: boot.authz || null, vals: b.vals ? (function () { var o = {}; (b.vals || []).forEach(function (k) { if (boot.keys && boot.keys[k] != null) o[k] = boot.keys[k]; }); return o; })() : undefined } : null;
    } else out.json = parseJson(txt, null) || { text: txt.slice(0, 400) };
  } catch (e) { out.ok = 0; out.err = String(e && e.message || e).slice(0, 200); }
  finally { try { await env.DB.prepare('DELETE FROM sess WHERE tok = ?1').bind(tok).run(); } catch (e2) { swallow('sess-delete', e2, env.__rid); } }
  return json(out);
}
/* @@KIVO_TEST_TOOL_END */
/* الاستدراك في وضع الإنفاذ: super ∨ المفتاحُ الصريح (D3-01 — بعد ترحيل الصلاحيات لا يكفي approve) */
function enfRetroMay(A, d, sys) { if (A.u.role === 'super') return true; return !!d && deptInScope(A, d) && enfHeld(A, d, RETRO[sys].key); }
/* سجلُّ الأنشطة: الإدارةُ كاملةً لحامل audit.view فيها (أو مدير النظام) · تاريخُ كيانٍ واحد لمن في نطاق الإدارة (والأسطرُ تمرّ بعقد القراءة) */
function enfAudCanDept(AA, d, entMode) {
  if (!d) return AA.u.role === 'super';
  if (entMode) return deptInScope(AA, d);
  return enfHeld(AA, d, 'audit.view');
}
/* KIVO_264 · C3 (التدقيقُ المعماري D-2 · fail-closed للغلاف): تعذّرُ القاعدة (ارتباطٌ غائب · عطلٌ في مسار D1 لـ GET /) كان يُقدِّم الغلافَ بلا __BS_BOOT
   فيعمل النظامُ المحلي القديم في المتصفح (قاعدةٌ في localStorage · جلساتٌ محلية · كتاباتٌ لا تغادر الجهاز). الآن صفحةٌ عربيةٌ قصيرة
   503 بلا غلافٍ ولا سكربت — برؤوس الغلاف نفسِها (withSec: CSP · nosniff · …) و no-store و Retry-After. لم يُستعمل «وضعُ الحماية» (ADR-003) هنا: ذاك يُقدِّم
   الغلافَ بحقنٍ authz:'unavailable' ويحتاج القاعدةَ نفسَها (الهوية · fresh · rk) لبيئة الإنفاذ وحدها؛ أمّا هنا فالقاعدةُ نفسُها غائبة ولا غلافَ آمناً بلا حقن. */
function shellDown(rid) {
  var html = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">'
    + '<title>المنصة غير متاحة مؤقتاً</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;background:#f8fafc;color:#1e293b}'
    + 'main{max-width:30rem;margin:16px;padding:28px 24px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;text-align:center}h1{font-size:1.2rem;margin:0 0 12px}p{margin:8px 0;line-height:1.8}a{color:#0f766e}small{color:#64748b}'
    + '@media (prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}main{background:#111827;border-color:#334155}a{color:#5eead4}small{color:#94a3b8}}</style></head>'
    + '<body><main><h1>المنصة غير متاحة مؤقتاً</h1><p>تعذّر الوصول إلى قاعدة البيانات، فلم تُفتح المنصة حفاظاً على سلامة البيانات — لا يُعرض شيءٌ ولا يُحفظ حتى يعود الاتصال.</p>'
    + '<p>أعد المحاولة بعد قليل: <a href="/">إعادة المحاولة</a></p>' + (rid ? '<p><small>رمز الطلب: ' + String(rid).replace(/[^0-9a-f]/gi, '') + '</small></p>' : '') + '</main></body></html>';
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Retry-After': '30' } });
}
function isShellPath(p) { return p === '/' || p === '/index.html'; }
/* KIVO_264 · C2: صفحةُ /api/changes — rows مرتّبةٌ بالمراجعة (مما يراه الفاعل وحده)؛ تُقطع بعد بلوغ max عند أوّل حدّ مراجعة (مراجعةٌ واحدة لا تُشطر)
   ⇒ { keys, more, v: آخرُ مراجعةٍ مضمَّنة }. 80 = حدُّ /api/get وسحبِ العميل (pull9) — فالعميلُ القديمُ يسحب الصفحةَ كاملةً ولا يسبق مؤشّرُه ما لم يسحبه. */
var CHANGES_MAX = 80, GET_MAX = 80;
function changesCut(rows, max) {
  var keys = [], i, last = 0;
  for (i = 0; i < rows.length; i++) {
    if (keys.length >= max && rows[i].rev !== last) return { keys: keys, more: true, v: last };
    keys.push(rows[i].k); last = rows[i].rev;
  }
  return { keys: keys, more: false, v: last };
}
/* /api/changes في بيئة الإنفاذ: am = وضعُ الخادم الآن · az = تغيّر ما تُحسب منه مفاتيحُ الفاعل (الصلاحيات · الحسابات · الهيكل · المنصة · منحُ إداراته ونطاقُها) */
var ENF_AZ_GLOBAL = { bassam_perms_v1: 1, bassam_auth_users_v1: 1, bassam_depts_v1: 1, bassam_gdepts_v1: 1, bassam_platform_v1: 1 };
function enfChangesOut(env, A, v, keys, all) {
  var out = { v: v, keys: keys, am: env.__enfm ? env.__enfm.mode : 'legacy' }, ds = {}, i;
  enfDeptsOf(A).forEach(function (d) { ds[d] = 1; });
  for (i = 0; i < all.length; i++) {
    var k = String(all[i]), P = parseKey(k);
    if (!P.dept ? ENF_AZ_GLOBAL[P.name] : (ds[P.dept] && (P.name === ENF_SCOPE_RES || P.name === ENF_GRANTS_RES))) { out.az = 1; break; }
  }
  return out;
}
/* KIVO_264 · az للوردية المربوطة بالجدول: حفظةٌ تمسّ الجدولَ الشهري لإدارةٍ من إداراته ⇒ az لمن ورديتُه فيها مربوطةٌ به (enfShiftBound) — فمجموعةُ قراءته
   تُحسب منه (الاسترشاد · التقرير · الجولات · الجدولُ نفسُه بإسقاط الوردية) ومراجعاتُ تلك الموارد لا تتغيّر، فكان تبويبُه يبقى على إسقاطه القديم
   (وتُرفض كتاباتُه «scope») حتى إعادة التحميل. سجلُّ النطاق يُقرأ للإدارات التي تغيّر جدولُها وحدها — ولا قراءةَ إن لم يتغيّر جدول. */
async function enfStaffAz(env, A, all) {
  if (!A || !A.enf || !A.u.ekey || A.u.role === 'super' || KIVO_SCOPE.isCeiling(permv4Actor(A).actor)) return false;
  var ds = enfDeptsOf(A).filter(function (d) { return all.indexOf('bsdept:' + d + ':' + ENF_STAFF_RES) !== -1; });
  if (!ds.length) return false;
  var recs = await enfScopeRecs(env, ds, null), i;
  for (i = 0; i < ds.length; i++) if (enfShiftBound(A, recs, ds[i])) return true;
  return false;
}
/* أسبابُ الرفض المفصّلة للعميل (بلا قيم): المفاتيحُ المطلوبة · الناقصة · أبعادُ النطاق · مفاتيحُ السبب */
function enfDenyInfo(o, ev) {
  var x = ev && ev.x; if (!x) return o;
  if (x.keys && x.keys.length) o.keys = x.keys.slice(0, 12);
  if (x.missing && x.missing.length) o.missing = x.missing.slice(0, 12);
  if (x.reasonKeys && x.reasonKeys.length) o.reasonKeys = x.reasonKeys.slice(0, 12);
  if (x.dims && x.dims.length) o.dims = x.dims.slice(0, 8);
  if (x.detail) o.detail = String(x.detail).slice(0, 240);
  return o;
}
/* ── الحفظ المركزي — قلب المنظومة (KIVO_264: جسمُ المسار نُقل من handle حرفاً — سقّاطةُ حجم الموزِّع) ── */
async function saveRoute(env, request, path, ss) {
  /* الترويسة ظنٌّ لا دليل: الطلبُ المقطَّع (chunked) لا يحملها. فالحدُّ
     يُفرض على البايتات الفعلية بعد القراءة وقبل أيّ تحليلٍ أو كتابة. */
  var rawS = await request.arrayBuffer();
  if (rawS.byteLength > bodyLimit('/api/save'))
    return json({ ok: 0, err: 'الطلب أكبر من الحد المسموح (' + Math.round(bodyLimit('/api/save') / 1048576) + 'MB)' }, 413);
  var bs; try { bs = JSON.parse(new TextDecoder().decode(rawS)); } catch (e) { return json({ ok: 0, err: 'طلب غير مفهوم' }, 400); }
  var badS = bodyCheck('/api/save', bs); if (badS) return json({ ok: 0, err: 'bad-body', at: badS }, 400);   /* SOT-101 · src/schemas/api/bodies.schema.json */
  /* KIVO_264 · C1 (التدقيقُ المعماري D-3): الطابورُ يحمل هويةَ الجلسة التي بُني لها (uid = BOOT.uid). خروجٌ ثم دخولٌ بحسابٍ آخر في المتصفح نفسِه
     كان يُرسل تعديلاتِ الأوّل باسم الثاني (aud.uid = الثاني) — الآن 409 قبل أيّ قراءةٍ أو كتابة، فيحتفظ العميلُ بطابوره ويعيد التحميل.
     الغائبُ وnull = السلوكُ القديم (عملاءُ ما قبل 264 · نافذةُ الإصدارين). لا سطرَ أمنٍ في sec: حالةٌ متوقّعة لا رفضُ صلاحية. */
  if (bs.uid != null && String(bs.uid) !== String(ss.uid)) { logEv('warn', 'session-changed', { rid: env.__rid, p: path, st: 409 }); return json({ ok: 0, err: 'session-changed' }, 409); }
  try {
    var A1 = await actorOf(env, ss.uid);
    if (!A1) return json({ ok: 0, err: 'session' }, 401);        /* حسابٌ حُذف والجلسة حيّة */
    A1.tok = ss.tok;   /* KIVO_252 · AUD-035: جلسةُ الطالب تبقى عند تغيير كلمته بنفسه */
    A1.sessTs = ss.ts;   /* KIVO_264 · D14: لحظةُ الدخول — «الدخولُ الأوّل الإجباري» بجلسةٍ حديثة وحدها (selfCurState) */
    var rlS = await rlHit(env, 'sv', A1.u.id, RL_SAVE);
    if (rlS) return tooMany(rlS);
    var r2 = await applySave(env, bs, A1, reqMeta(request));
    return json({ ok: 1, v: r2.v, revs: r2.revs, denied: r2.denied, conflicts: r2.conflicts, atomic: r2.atomic || '' });
  } catch (eS) {
    var guardSave=dbGuardFailure(eS);if(guardSave)return json({ok:0,err:guardSave.err},guardSave.status);
    /* فشل الحفظ يظهر باسمه في سجلات المشروع وفي فاحص الشبكة — لا صمت */
    if(eS.rs||eS.cuCode||eS.nf)return json({ok:0,err:eS.rs||eS.cuCode||eS.nf},eS.status||eS.cuStatus||400);if(/KIVO_RESTORE_EPOCH/.test(String(eS)))return json({ok:0,err:'restore-epoch-changed'},409);if(/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_CUSTODY_TARGET_CHANGED/.test(String(eS)))return json({ok:0,err:'conflict'},409); logEv('error', 'save-failed', { rid: env.__rid, p: path, st: 500, err: errMsg(eS) }); return json({ ok: 0, err: 'save-failed', rid: env.__rid }, 500);   /* KIVO_259 · SR-6: نصُّ الخطأ الداخلي في السجل وحده (بالمعرّف rid) — لا في الاستجابة */
  }
}
/* KIVO_264 · C1 للقراءة (اختياري — العقدُ نفسُه لـ/api/save): ?uid= على /api/changes و/api/get = هويةُ الجلسة التي بُني لها التبويب (BOOT.uid)؛
   إن حضر وخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ (وقبل الانتظار الطويل) — فلا يسحب تبويبٌ بُني لحسابٍ بياناتِ حسابٍ آخر دخل في
   المتصفح نفسِه. الغائبُ = السلوكُ القديم حرفاً. */
function sessUidMismatch(env, url, ss, path) {
  if (!url.searchParams.has('uid') || url.searchParams.get('uid') === String(ss.uid)) return null;
  logEv('warn', 'session-changed', { rid: env.__rid, p: path, st: 409 });
  return json({ ok: 0, err: 'session-changed' }, 409);
}
/* ── ماذا تغيّر منذ نسختي؟ — تستعمله لافتة «تحديثات جديدة» (KIVO_264: نُقل من handle حرفاً + C2) ── */
async function changesRoute(env, url, ss) {
  var sxC = sessUidMismatch(env, url, ss, '/api/changes'); if (sxC) return sxC;
  var since = parseInt(url.searchParams.get('since') || '0', 10) || 0;
  var rv2 = await curRev(env);
  /* wait=1: الطلب ينتظر عند الخادم حتى يقع تغيير (فحص كل ثانية، ٢٥ ثانية كحد أقصى) فيصل التعديل
     للزملاء خلال ثانية بدل دورة الخمس والعشرين — بلا قناة جديدة ولا بنية إضافية */
  var lpT = 0; if (url.searchParams.get('wait') === '1' && rv2 <= since && (lpT = lpEnter(ss.uid))) {   /* KIVO_261 · AUD-050: حدُّ الانتظار المتزامن (lpEnter) — ما زاد يُجاب فوراً */
    try {
      preOff(env);   /* KIVO_255 · AUD-037: الانتظارُ يقرأ رقمَ المراجعة حيّاً كلَّ ثانية — لا من لقطة أوّل الطلب */
      for (var wi = 0; wi < 25 && rv2 <= since; wi++) {
        await new Promise(function (rs) { setTimeout(rs, 1000); });
        rv2 = await curRev(env);
      }
    } finally { lpLeave(ss.uid, lpT); }
  }
  if (rv2 <= since) return json(enfEnvOn(env) ? { v: rv2, keys: [], am: env.__enfm ? env.__enfm.mode : 'legacy' } : { v: rv2, keys: [] });
  var AC = await actorOf(env, ss.uid);
  if (!AC) return json({ ok: 0, err: 'session' }, 401);
  var ch = await env.DB.prepare('SELECT k, rev FROM revs WHERE rev > ?1 ORDER BY rev, k').bind(since).all();
  /* الأسماءُ أيضاً بيان: تمرّ بعقد القراءة نفسه الذي يحكم الحقن و/api/get.
     والعدّاد rv2 يبقى الرقم الحقيقي فلا يتغيّر since ولا آليةُ التعارض. */
  var rowsC = ((ch && ch.results) || []).filter(function (r) { return !isDeviceKey(r.k) && canSee(AC, r.k); });
  /* KIVO_264 · C2 (التدقيقُ المعماري D-1): كانت القائمةُ بلا حدّ والعميلُ يسحب أوّلَ 80 ويقدّم مؤشّرَه إلى المراجعة الحالية فيبقى الباقي قديماً
     إلى الأبد (استعادة · استيراد · تبويبٌ خامل). الآن: مرتّبةٌ بالمراجعة وتُقطع عند CHANGES_MAX مما يراه الفاعلُ على حدود مراجعةٍ كاملة
     (حفظةٌ واحدة لا تُشطر — قد تتجاوز الحدَّ وحدها) ⇒ more:1 و v = آخرُ مراجعةٍ مضمَّنة: مؤشّرٌ آمن يُطلب به الباقي فوراً. بلا قطع: الشكلُ كما كان. */
  var cutC = changesCut(rowsC, CHANGES_MAX), ksC = cutC.keys, vC = cutC.more ? cutC.v : rv2, allC = ((ch && ch.results) || []).map(function (r) { return r.k; });
  var outC = enfEnvOn(env) ? enfChangesOut(env, AC, vC, ksC, allC) : { v: vC, keys: ksC };
  if (enfEnvOn(env) && !outC.az && await enfStaffAz(env, AC, allC)) outC.az = 1;   /* KIVO_264: الورديةُ المربوطةُ بالجدول الشهري */
  if (cutC.more) outC.more = 1;
  return json(outC);
}
/* ── سحب مفاتيح بعينها بأحدث قيمها — للتحديث الحي بلا إعادة تحميل (KIVO_264: نُقل من handle حرفاً + C2) ── */
async function getRoute(env, url, ss) {
  var sxG = sessUidMismatch(env, url, ss, '/api/get'); if (sxG) return sxG;   /* KIVO_264 · C1 للقراءة */
  var AG = await actorOf(env, ss.uid);
  if (!AG) return json({ ok: 0, err: 'session' }, 401);
  var wantAll = String(url.searchParams.get('keys') || '').split(',').filter(Boolean), want = wantAll.slice(0, GET_MAX);
  /* KIVO_264 · C2: الحدُّ 80 كما كان — والقطعُ صار معلَناً (more:1) بدل أن يُسقط الباقي صامتاً */
  var moreG = wantAll.length > GET_MAX && wantAll.slice(GET_MAX).some(function (k8) { return want.indexOf(k8) === -1; });
  var rvG = await revsAll(env), got = {}, pv4rg = pv4ReadBudget(), refsG = null;
  /* KIVO_255 · AUD-037: قيمُ المفاتيح المقروءة تُجلب في جولةٍ واحدة بدل جولةٍ لكل مفتاح — الحكمُ لكل مفتاح كما هو */
  var rdKeys = want.filter(function (k9) { return !isDeviceKey(k9) && resName(k9) !== K_DSTATS && !nfLegacyKey(k9) && !cuLegacyKey(k9) && canRead(AG, k9); }), valsG = await kvMany(env, 'kv', rdKeys);
  for (var gi = 0; gi < want.length; gi++) {
    var gk = want[gi];
    if (isDeviceKey(gk)) continue;
    var rdG = canRead(AG, gk);
    if (!rdG && !canSee(AG, gk)) continue;
    if (nfLegacyKey(gk)) { got[gk] = { v: null, rev: rvG[gk] || 0, moved: '/api/notifications' }; continue; }
    if (cuLegacyKey(gk)) { got[gk] = { v: null, rev: rvG[gk] || 0, moved: '/api/custody' }; continue; }
    if (resName(gk) === K_DSTATS) { got[gk] = { v: null, rev: rvG[gk] || 0, moved: '/api/dstats' }; continue; }
    var gv = rdG ? valsG[gk] : null;      /* لا قيمةَ لمن لا يقرأ — الرقمُ وحدَه */
    if (rdG && gk === K_USERS && gv != null) gv = usersScopeOut(usersNoOut(stripPh(gv), AG), AG);   /* KIVO_259 · SR-1: ولا رقمَ وظيفيَّ لحساب غيره · الفحصُ العميق (R4): ولا حسابَ خارج نطاقه (054) */
    /* D4‑01 (v24.5): ظلُّ نطاق القراءة على ما سيُرجَع (أو على المورد وحده حين لا قيمة) — لا يمسّ got ولا الحكم */
    if (AG.enf && rdG && gv != null) { try { if (!refsG) refsG = await enfRefsFor(env, enfDeptsOf(AG), null); gv = enfProjectStr(AG, gk, gv, refsG); } catch (eGP) { continue; } }   /* fail-closed: لا قيمةَ ولا رقم — كمن لا يقرأ */
    try { if (!AG.enf) permv4Read(AG, gk, gv, rdG, 'get', pv4rg, null); } catch (e4rg) { swallow('permv4-read-get', e4rg, env.__rid); }
    got[gk] = { v: gv, rev: rvG[gk] || 0 };
  }
  var outG = { ok: 1, v: await curRev(env), keys: got }; if (moreG) outG.more = 1;
  /* مراجعةُ التكامل W1-R1: بصمةُ العدسة التي أُسقطت بها قائمةُ الحسابات المُرجَعة (054 usersLensFp) — يعيدها العميلُ مع حفظها · لا شيءَ لمدير النظام */
  if (got[K_USERS] && got[K_USERS].v != null) { var usG = usersLensFp(AG); if (usG) outG.uscope = usG; }
  return json(outG);
}
export default {
  async fetch(request, env, ctx) {
    var url0 = new URL(request.url);
    var m0 = request.method;
    var rid = ridNew();   /* KIVO_250 · SOT-144: معرّفُ الطلب — في الرأس X-Kivo-Rid وأجسام الأخطاء والسجل المنظَّم */
    var nonce = nonceNew();   /* KIVO_253 · AUD-005: nonce الطلب — في رأس CSP وفي سكربت __BS_BOOT المحقون و<meta> الغلاف */
    env = Object.assign({}, env, { __rid: rid, __nonce: nonce, __ctx: ctx || null });   /* KIVO_255 · AUD-037: سياقُ التنفيذ لإتمام لمس الجلسة بعد الردّ */
    if (m0 === 'POST' || m0 === 'PUT' || m0 === 'DELETE') {
      /* المصدر: إن أرسل المتصفح Origin فيجب أن يكون الموقع نفسه */
      var org = request.headers.get('Origin'), sfs = request.headers.get('Sec-Fetch-Site');
      if ((org && org !== url0.origin) || sfs === 'cross-site') { logEv('warn', 'origin-reject', { rid: rid, m: m0, p: url0.pathname, st: 403 }); return withSec(json({ ok: 0, err: 'origin', rid: rid }, 403), url0, rid, nonce); }
      var cl = parseInt(request.headers.get('Content-Length') || '0', 10) || 0;
      if (cl > bodyLimit(url0.pathname)) {
        /* يُستهلك الجسم قبل الردّ حتى لا يُقطع الاتصال في منتصف الإرسال (وحتى لا يشتكي خادم التطوير المحلي) */
        try { await request.arrayBuffer(); } catch (eB) { swallow('drain-body', eB, rid); }
        logEv('warn', 'body-too-large', { rid: rid, m: m0, p: url0.pathname, st: 413, cl: cl });
        return withSec(json({ ok: 0, err: limMsg(url0.pathname), rid: rid }, 413), url0, rid, nonce);
      }
    }
    var t0 = Date.now();
    var res0 = await this.handle(request, env);
    var out0 = withSec(res0, url0, rid, nonce);
    /* KIVO_255 · SOT-143/149 (SOT-142): سطرُ طلبٍ واحد لكل /api/* — المدةُ داخل العامل (D1 ضمناً) بالملّي ثانية، والمسارُ بلا استعلام، بلا هوية؛
       منه تُشتقّ المقاييسُ التقنية (المعدّل · نسبةُ الأخطاء · p50/p95 لكل مسار) في Workers Logs/Logpush؛ ورأسُ Server-Timing يُظهر المدةَ نفسَها للمتصفح
       فيُفصل زمنُ الخادم عن زمن الشبكة في قياسات AUD-037 */
    if (url0.pathname.indexOf('/api/') === 0 || (res0.headers.get('Content-Type') || '').indexOf('text/html') >= 0) {
      var dur0 = Date.now() - t0;
      try { out0.headers.set('Server-Timing', 'app;dur=' + dur0); } catch (eST) { /* رأسٌ تشخيصي — غيابُه لا يمسّ الردّ */ }
      logEv('info', 'req', { rid: rid, m: m0, p: url0.pathname, st: out0.status, dur: dur0 });
    }
    return out0;
  },
  async handle(request, env) {
    var url = new URL(request.url);
    var path = url.pathname;

    /* تثبيت القراءة على النسخة الأصلية: لو كان التكرار الجغرافي مفعّلاً على
       القاعدة فبدونه قد يقرأ طلبٌ نسخةً طرفية لم يصلها آخر حفظ بعد — فيُرفض
       دخولٌ صحيح. ومع قاعدة بلا تكرار هذا السطر بلا أي أثر. */
    if (env.DB && typeof env.DB.withSession === 'function')
      env = Object.assign({}, env, { DB: env.DB.withSession('first-primary') });   /* R169-CC: بقيّةُ الارتباطات تبقى (ومنها IMG_R2) */

    try {

    /* ── منصة داخلية: لا فهرسة في محركات البحث ── */
    if (path === '/robots.txt')
      return new Response('User-agent: *\nDisallow: /\n', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

    /* ── درع غياب القاعدة: ملفا الموقع رُفعا وD1 لم تُربط بعد؟ واجهةُ الخادم
       تجيب بوضوح (no-db) حتى يدلّ الدليل صاحبها على خطوة الربط الناقصة.
       KIVO_264 · C3: وصفحةُ المنصة لا تُقدَّم بلا حقن (كانت تعمل بوضع تخزين المتصفح) — صفحةُ 503. */
    if (!env.DB) {
      if (path.indexOf('/api/') === 0)
        return json({ ok: 0, err: 'no-db', hint: 'اربط قاعدة D1 باسم DB من إعدادات المشروع ثم أعد النشر' }, 503);
      /* KIVO_264 · C3: الغلافُ بلا قاعدة = النظامُ المحلي القديم في المتصفح — صفحةُ 503 بدلَه؛ والأصولُ الثابتة تُخدم كما كانت (بلا بيانات) */
      if (isShellPath(path)) { logEv('error', 'shell-no-db', { rid: env.__rid, p: path, st: 503 }); return shellDown(env.__rid); }
      return env.ASSETS.fetch(request);
    }

    /* ═══ واجهة الخادم ‎/api/* ═══ */
    if (path.indexOf('/api/') === 0) {
      await initDb(env);
      env = await preAttach(env, request, 'api');   /* KIVO_255 · AUD-037: لقطةُ مقدّمة الطلب في جولةِ D1 واحدة (السياسة · الإنفاذ · الجلسة · الحسابات · الصلاحيات · الإدارات · المنصة · المراجعات) */
      var POL = await loadPolicy(env);
      /* KIVO_243: وضعُ الإنفاذ = ENV ∧ D1 — يُقرأ لكل طلبٍ في بيئة الإنفاذ وحدها؛ Production بلا المتغيّر لا تقرأ شيئاً ولا يتغيّر فيها مسار */
      if (enfEnvOn(env)) { var ENFM = await enfModeOf(env); env = Object.assign({}, env, { __enfm: ENFM, __enf: ENFM.mode === 'enforce' ? ENFM : null }); if (ENFM.mode === 'unavailable') { var uaR = await enfUnavailable(env, request, path); if (uaR) return uaR; } }   /* KIVO_244 · ADR-003 */

      /* نبض التعرف — تستعمله الاختبارات ولا يكشف شيئاً */
      /* الهوية العامة — لشاشة الدخول وأي عميل قبل الجلسة */
      if (path === '/api/brand') return json({ ok: 1, brand: brandPublic(await platGet(env)), ver: WORKER_VER, rk: (await metaGet(env, 'rk')) ? 1 : 0 });

      if (path === '/api/ping') {
        var us0 = await usersList(env), pingOut = { ok: 1, cf: 1, ver: WORKER_VER, fresh: isVirgin(us0) ? 1 : 0 };
        /* KIVO_244 · AUD-004: الأعدادُ (الحسابات · الجلسات · المراجعة) لمدير النظام وحده — لا إفشاءَ بلا جلسة؛ وفي وضع الحماية النبضُ المختصر فقط */
        /* KIVO_261 · SOT-145 (الجاهزية): في وضع الحماية الخادمُ حيٌّ (ok:1) لكنه غيرُ جاهز — كلُّ قراءةٍ وكتابة 503 — فيُعلَن ready:0 · mode:'protect'
           (كان النبضُ «ok:1» وحده فلا يفرّق المراقبُ بين السليم والمعطَّل) · ولمدير النظام: schemaOk = المخطّطُ المختوم في D1 = المعروفُ لهذا الإصدار */
        if (env.__enfm && env.__enfm.mode === 'unavailable') { pingOut.ready = 0; pingOut.mode = 'protect'; }
        else {
          var sP = await session(env, request), aP = sP ? await actorOf(env, sP.uid) : null;
          if (aP && aP.u && aP.u.role === 'super') { var sc = await env.DB.prepare('SELECT COUNT(*) AS n FROM sess').first(); pingOut.users = us0 ? us0.length : 0; pingOut.rev = await curRev(env); pingOut.sess = sc ? sc.n : 0; pingOut.schema = KIVO_SCHEMA_VERSION; pingOut.schemaDb = await metaGet(env, 'schema_version'); pingOut.schemaOk = String(pingOut.schemaDb) === String(KIVO_SCHEMA_VERSION) ? 1 : 0; pingOut.ready = pingOut.schemaOk; }   /* KIVO_249: إصدارُ المخطّط (المعروف · المختوم في meta) لمدير النظام */
        }
        return json(pingOut);
      }

      /* ── المصادقة قبل الجلسة: الاستعادة · الدخول · الخروج — workers/parts/062a-auth-routes.js (SOT-096) ── */
      var nbP = await bodyNone(request, path, 'public'); if (nbP) return nbP;   /* KIVO_264 · SOT-101: «بلا جسم» (051b) */
      var authPub = await authPublicRoutes(request, env, path, url);
      if (authPub) return authPub;

      /* من هنا فصاعداً: جلسة صالحة شرط */
      var ss = await session(env, request);
      if (!ss) return json({ ok: 0, err: 'session' }, 401);

      /* الجلسةُ وحدها لا تكفي: الحسابُ نفسه يجب أن يكون قائماً غيرَ مجمَّد.
         (الخروج وحده مستثنى — يُمسح الكوكي دائماً.) */
      var uLive = ((await usersList(env)) || []).filter(function (x) { return x && x.id === ss.uid; })[0];
      if (!uLive || uLive.dis) return json({ ok: 0, err: 'session' }, 401);

      /* ── مساراتُ الجلسة: whoami · «صفحتي» · جلساتي · فحصُ كلمة المرور — workers/parts/062a-auth-routes.js (SOT-096) ── */
      var nbS = await bodyNone(request, path, 'session'); if (nbS) return nbS;   /* KIVO_264 · SOT-101: «بلا جسم» (051b) */
      var authSes = await authSessionRoutes(request, env, path, ss);
      if (authSes) return authSes;

      /* ── الحفظ المركزي — قلب المنظومة ── */
      if (path === '/api/notifications' || path === '/api/notifications/act' || path === '/api/notifications/export') return await nfRoute(env, request, url, ss);
      if(path === '/api/backup/restore')return await rsRoute(env,request,url,ss);if(path === '/api/admin/dept-wipe'||path === '/api/admin/dept-delete')return await rsWipeRoute(env,request,url,ss);if(path === '/api/employees/transition')return await rsEmployeeRoute(env,request,url,ss);
      if (path === '/api/custody' || path === '/api/custody/act' || path === '/api/custody/export') return await cuRoute(env, request, url, ss);
      if (path === '/api/dstats') return await dsDomainRoute(env, request, url, ss);
      if (path === '/api/save' && request.method === 'POST') return await saveRoute(env, request, path, ss);

      /* ── ماذا تغيّر منذ نسختي؟ — تستعمله لافتة «تحديثات جديدة» ── */
      if (path === '/api/changes') return await changesRoute(env, url, ss);

      /* R196 · Phase 3 — نافذةُ الاستدراك (حالةٌ خادمية؛ قاعدةُ الرفض على الكتابات ظلٌّ فقط) */
      if (path === '/api/retro') {
        var AR = await actorOf(env, ss.uid);
        if (!AR) return json({ ok: 0, err: 'session' }, 401);
        if (request.method === 'POST') { var rlR = await rlHit(env, 'sv', AR.u.id, RL_SAVE); if (rlR) return tooMany(rlR); }
        return await retroApi(env, request, AR, url, reqMeta(request));
      }
      /* ═══ شاشة مدير النظام: الحضور · الجلسات · الأمن · السياسات · الملخّص ═══ */
      var isAdminPath = path === '/api/presence' || path === '/api/sec' || path === '/api/sess/kill' || path === '/api/guard' || path === '/api/guard/unlock' || path === '/api/policy' || path === '/api/overview'
        || path === '/api/recovery' || path === '/api/recovery/new' || path === '/api/reset' || path === '/api/permv2' || path === '/api/scope-dryrun' || path === '/api/identity-rehearsal' || path === '/api/identity-preflight';
      if (isAdminPath) {
        var AX = await actorOf(env, ss.uid);
        if (!AX) return json({ ok: 0, err: 'session' }, 401);
        var nowX = Date.now();
        var superX = AX.u.role === 'super';
        if (AX.enf && !superX) return json({ ok: 0, err: 'forbidden', why: 'sys' }, 403);       /* KIVO_243: sys.security.view · sys.sessions.kill = role:super */
        var scopeOk = function (u) { if (superX) return true; if (!u) return false; return u.id === AX.u.id || (u.role === 'staff' && isMgrOf(AX, u.deptId || '')); };
        var byId = nmap(); AX.users.forEach(function (u) { if (u && u.id) byId[u.id] = u; });   /* KIVO_261: null-prototype */
        var pubU = function (u) { return u ? { id: u.id, name: u.name || u.un || '', un: u.un || '', role: u.role || '', deptId: u.deptId || '', ekey: u.ekey || '', mgr: !!u.mgr, dis: !!u.dis } : null; };

        /* R193…R203: سجلُّ v24.9 — نسختُه وبصمتُه وتحقّقُه الداخلي وعدّاداتُ الظلّ (Phase 1 · 2.1 · 3 · 4 · 4.1 · 4.1.1 · 4.2 · 4.3 · 4.4 · 4.5 — كتابةً وقراءةً + ربطُ القراءة + موديلُ الترحيل + موديلُ الهوية + بروفةُ ترحيل الهوية + التمهيدُ المُدمَج هوية→نطاق) — مدير النظام وحده؛ قراءةٌ لا أثر لها */
        if (path === '/api/permv2') {
          if (!superX) return json({ ok: 0, err: 'لمدير النظام وحده' }, 403);
          if (!PERMV2.validation) { try { PERMV2.validation = KIVO_REGISTRY.validate(); } catch (e9) { PERMV2.validation = { ok: false, err: String(e9 && e9.message || e9) }; } }
          var scopeV = null; try { scopeV = KIVO_SCOPE.validate(); } catch (e4v) { scopeV = { ok: false, err: String(e4v && e4v.message || e4v) }; }
          return json({ ok: 1, version: KIVO_REGISTRY.version, docSha256: KIVO_REGISTRY.docSha256, status: KIVO_REGISTRY.status, phase: 4.1, mode: 'shadow', worker: WORKER_VER, counts: KIVO_REGISTRY.counts, validation: PERMV2.validation, stats: PERMV2.stats,
                        scope: { version: KIVO_SCOPE.version, docSha256: KIVO_SCOPE.docSha256, phase: KIVO_SCOPE.phase, mode: KIVO_SCOPE.mode, dims: KIVO_SCOPE.DIMS, counts: KIVO_SCOPE.counts, validation: scopeV, migration: KIVO_SCOPE.migration, interpretations: KIVO_SCOPE.interpretations, conflicts: KIVO_SCOPE.conflicts, terminology: KIVO_SCOPE.terminology, readPolicy: KIVO_SCOPE.readPolicy, readMaxItems: PV4_READ_MAX, readBudget: PV4_READ_BUDGET, readBudgetPolicy: KIVO_SCOPE.readBudgetPolicy, bindings: KIVO_SCOPE.bindings.length,
                                 scopeMigration: { version: KIVO_SCOPE_MIGRATION.version, docSha256: KIVO_SCOPE_MIGRATION.docSha256, phase: KIVO_SCOPE_MIGRATION.phase, mode: KIVO_SCOPE_MIGRATION.mode, endpoint: '/api/scope-dryrun', writes: 0, dims: KIVO_SCOPE_MIGRATION.dims, classes: KIVO_SCOPE_MIGRATION.classes, rules: KIVO_SCOPE_MIGRATION.rules.length, readiness: KIVO_SCOPE_MIGRATION.readiness.table.length, nf01: KIVO_SCOPE_MIGRATION.nf01.id, telemetryNote: KIVO_SCOPE_MIGRATION.telemetryNote, identity: KIVO_SCOPE_MIGRATION.identity, identityPhase: 4.3,
                                                  identityRehearsal: { endpoint: '/api/identity-rehearsal', version: KIVO_IDENTITY_MIGRATION.version, docSha256: KIVO_IDENTITY_MIGRATION.docSha256, phase: KIVO_IDENTITY_MIGRATION.phase, mode: KIVO_IDENTITY_MIGRATION.mode, writes: 0, classes: KIVO_IDENTITY_MIGRATION.classes, auto: KIVO_IDENTITY_MIGRATION.auto, pending: KIVO_IDENTITY_MIGRATION.pending, thresholds: KIVO_IDENTITY_MIGRATION.model && KIVO_IDENTITY_MIGRATION.model.thresholds || null, sidClosureGates: KIVO_IDENTITY_MIGRATION.sidClosureGates || null, gates: (KIVO_IDENTITY_MIGRATION.gatesSpec || []).length, validation: (function () { try { return KIVO_IDENTITY_MIGRATION.validate(); } catch (eIV) { return { ok: false, err: String(eIV && eIV.message || eIV) }; } })() },
                                                  identityPreflight: { endpoint: '/api/identity-preflight', version: KIVO_IDENTITY_PREFLIGHT.version, docSha256: KIVO_IDENTITY_PREFLIGHT.docSha256, phase: 4.5, mode: KIVO_IDENTITY_PREFLIGHT.mode, writes: 0, rules: (KIVO_IDENTITY_PREFLIGHT.rules || []).length, gates: (KIVO_IDENTITY_PREFLIGHT.gatesSpec || []).length, decisions: (KIVO_IDENTITY_PREFLIGHT.decisions || []).length, rank: KIVO_IDENTITY_PREFLIGHT.rank, validation: (function () { try { return KIVO_IDENTITY_PREFLIGHT.validate(); } catch (eIPV) { return { ok: false, err: String(eIPV && eIPV.message || eIPV) }; } })() } },
                                 readBindings: { meta: KIVO_SCOPE.readBindings.meta, byResource: KIVO_SCOPE.readBindings.byResource, special: KIVO_SCOPE.readBindings.special, noReadKey: KIVO_SCOPE.readBindings.noReadKey, readKindOutsideRoutes: KIVO_SCOPE.readBindings.readKindOutsideRoutes || [] }, readBindingCheck: (function () { try { return permv4ReadBindingCheck(); } catch (e4c) { return { ok: false, err: String(e4c && e4c.message || e4c) }; } })(),
                                 write: PERMV4.write, read: PERMV4.read, stats: PERMV4.write },
                        guards: { version: KIVO_GUARDS.version, phase: KIVO_GUARDS.phase, mode: KIVO_GUARDS.mode, counts: KIVO_GUARDS.counts, covers: KIVO_GUARDS.covers, bindings: KIVO_GUARDS.bindings.length, shadowOnly: KIVO_GUARDS.shadowOnly.length, decisions: KIVO_GUARDS.decisions.length },
                        bind: PERMV2.bind,
                        build: { version: KIVO_BUILD.version, phase: KIVO_BUILD.phase, mode: KIVO_BUILD.mode, counts: KIVO_BUILD.counts, bindings: KIVO_BUILD.bindings.map(function (x) { return { key: x.key, group: x.group, status: x.status, impl: x.impl }; }), lenses: KIVO_BUILD.LENSES, importRes: KIVO_BUILD.IMPORT_RES, retroMaxH: KIVO_BUILD.RETRO_MAX_H, stats: PERMV3 } });
        }
        /* R200 · Phase 4.2 — Scope Migration Dry-Run (مدير النظام وحده · GET · قراءةٌ فقط · writes = 0): يحمّل بيانات D1 الفعلية (الإدارات · الحسابات · الصلاحيات · الخطة · الجولات · الجدولُ الشهري · التقريرُ اليومي · الموظفون)
           ويستدعي KIVO_SCOPE_MIGRATION.dryRun بخطّافات AS‑IS الحيّة (actorFromKeys · permv2Ctx · dailyFieldOnly · permv4Ctx) — لا يكتب قيمةَ نطاقٍ ولا يمسّ أي حكم */
        if (path === '/api/scope-dryrun') {
          if (!superX) return json({ ok: 0, err: 'لمدير النظام وحده' }, 403);
          if (request.method !== 'GET') return json({ ok: 0, err: 'dry-run is read-only (GET)' }, 405);
          try {
            var keysM = await kvAll(env, 'kv'), byDeptM = {}, deptsM = parseJson(keysM[K_DEPTS], []), usersM = parseJson(keysM[K_USERS], []), permsM = parseJson(keysM[K_PERM], {}), gdM = parseJson(keysM[K_GDEPTS], []), dmi;
            if (!Array.isArray(deptsM)) deptsM = []; if (!Array.isArray(usersM)) usersM = []; if (!Array.isArray(gdM)) gdM = [];
            for (dmi = 0; dmi < deptsM.length; dmi++) { var dIdM = deptsM[dmi] && deptsM[dmi].id; if (!dIdM) continue; var preM = 'bsdept:' + dIdM + ':';
              byDeptM[dIdM] = { plan: parseJson(keysM[preM + 'bassam_plan_v1'], null), rounds: parseJson(keysM[preM + 'bassam_rounds_v1'], null), staffing: parseJson(keysM[preM + 'bassam_staffing_v3'], null), dreport: parseJson(keysM[preM + 'bassam_dreport_v1'], null), employees: parseJson(keysM[preM + 'bassam_employees_v1'], []) }; }
            var hooksM = { today: dsToday(nowX), now: nowX, maxActors: 300,
              actorOf: function (u) { return actorFromKeys(keysM, u.id); },
              ctxOf: function (A, d) { return permv2Ctx(A, d); },
              fieldOnly: function (A, d) { return dailyFieldOnly(A, d); },
              pv4Ctx: function (A, d, kn, okMap, data) { var cM = permv4Ctx(A, d, kn, okMap, { pv4: { staffing: data && data.staffing } }); cM.read = true; cM.readMaxItems = PV4_READ_MAX; return cM; },
              telemetry: PERMV4 };
            var rpM = KIVO_SCOPE_MIGRATION.dryRun({ depts: deptsM, gdepts: gdM, users: usersM, perms: isObj(permsM) ? permsM : {}, byDept: byDeptM }, hooksM);
            return json({ ok: 1, worker: WORKER_VER, dryRun: rpM });
          } catch (eDR) { return json({ ok: 0, err: String(eDR && eDR.message || eDR) }, 500); }
        }
        /* R202 · Phase 4.4 — Identity Migration Rehearsal (مدير النظام وحده · GET · قراءةٌ فقط · writes = 0): يحمّل بيانات D1 الفعلية (الإدارات · الحسابات · الخطة · الجولات · الموظفون) ونصوصَها الخام وأرقامَ مراجعاتها
           ويستدعي KIVO_IDENTITY_MIGRATION.rehearse ببذرةٍ آمنة (crypto.getRandomValues · 32 بايت؛ أو seed=<64 hex> في الاستعلام لإعادة إنتاج بروفةٍ سابقة حرفاً بحرف) — لا يكتب شيئاً في D1 ولا يمسّ أي حكم؛ الناتجُ مجموعةُ كتابةٍ مقترحة وتصنيفُ نسبٍ وتصميمُ رجوع فحسب */
        if (path === '/api/identity-rehearsal') {
          if (!superX) return json({ ok: 0, err: 'لمدير النظام وحده' }, 403);
          if (request.method !== 'GET') return json({ ok: 0, err: 'rehearsal is read-only (GET)' }, 405);
          try {
            var keysR = await kvAll(env, 'kv'), revsR = await revsAll(env), byDeptR = {}, deptsR = parseJson(keysR[K_DEPTS], []), usersR = parseJson(keysR[K_USERS], []), dri;
            if (!Array.isArray(deptsR)) deptsR = []; if (!Array.isArray(usersR)) usersR = [];
            for (dri = 0; dri < deptsR.length; dri++) { var dIdR = deptsR[dri] && deptsR[dri].id; if (!dIdR) continue; var preR = 'bsdept:' + dIdR + ':';
              byDeptR[dIdR] = { plan: parseJson(keysR[preR + 'bassam_plan_v1'], null), rounds: parseJson(keysR[preR + 'bassam_rounds_v1'], null), employees: parseJson(keysR[preR + 'bassam_employees_v1'], []) }; }
            var seedQ = String(url.searchParams.get('seed') || ''), seedR = '', seedSrcR = 'crypto.getRandomValues';
            if (/^[0-9a-f]{64}$/i.test(seedQ)) { seedR = seedQ.toLowerCase(); seedSrcR = 'query (replay)'; }
            else { var sbR = new Uint8Array(32), sbi; crypto.getRandomValues(sbR); for (sbi = 0; sbi < 32; sbi++) seedR += (sbR[sbi] < 16 ? '0' : '') + sbR[sbi].toString(16); }
            var rawR = {}; Object.keys(keysR).forEach(function (kk) { if (/^bsdept:[^:]+:bassam_(plan|rounds)_v1$/.test(kk)) rawR[kk] = keysR[kk]; });
            var rpR = KIVO_IDENTITY_MIGRATION.rehearse({ depts: deptsR, users: usersR, byDept: byDeptR }, { seed: seedR, seedSource: seedSrcR, now: nowX, today: dsToday(nowX), raw: rawR, revs: revsR });
            return json({ ok: 1, worker: WORKER_VER, rehearsal: rpR });
          } catch (eIR) { return json({ ok: 0, err: String(eIR && eIR.message || eIR) }, 500); }
        }
        /* R203 · Phase 4.5 — Integrated Identity→Scope Preflight (مدير النظام وحده · GET · قراءةٌ فقط · writes = 0): يحمّل بيانات D1 الفعلية (كما في /api/scope-dryrun) ونصوصَها الخام وأرقامَ مراجعاتها، ويُجري بروفةَ الهوية v24.9 (uid · sid · ekey + إقفالُ sid للطوابق الحالية ولقطة الشهر الجاري) ببذرةٍ آمنة أو seed=<64 hex>،
           ثم يطبّق مجموعةَ الكتابة النهائية (tier A) على نسخٍ في الذاكرة فقط (tier B كما هو)، ويُجري KIVO_SCOPE_MIGRATION.dryRun نفسَه مرتَين (قبل الهوية · بعدها) بالخطّافات AS‑IS نفسِها (actorFromKeys · permv2Ctx · dailyFieldOnly · permv4Ctx) ويقارنهما بقواعد IP الثماني — لا يكتب شيئاً في D1 ولا يمسّ أي حكم؛ الناتجُ تقريرُ تمهيدٍ مضغوط */
        if (path === '/api/identity-preflight') {
          if (!superX) return json({ ok: 0, err: 'لمدير النظام وحده' }, 403);
          if (request.method !== 'GET') return json({ ok: 0, err: 'preflight is read-only (GET)' }, 405);
          try {
            var keysP = await kvAll(env, 'kv'), revsP = await revsAll(env), byDeptP = {}, deptsP = parseJson(keysP[K_DEPTS], []), usersP = parseJson(keysP[K_USERS], []), permsP = parseJson(keysP[K_PERM], {}), gdP = parseJson(keysP[K_GDEPTS], []), dpi;
            if (!Array.isArray(deptsP)) deptsP = []; if (!Array.isArray(usersP)) usersP = []; if (!Array.isArray(gdP)) gdP = [];
            for (dpi = 0; dpi < deptsP.length; dpi++) { var dIdP = deptsP[dpi] && deptsP[dpi].id; if (!dIdP) continue; var preP = 'bsdept:' + dIdP + ':';
              byDeptP[dIdP] = { plan: parseJson(keysP[preP + 'bassam_plan_v1'], null), rounds: parseJson(keysP[preP + 'bassam_rounds_v1'], null), staffing: parseJson(keysP[preP + 'bassam_staffing_v3'], null), dreport: parseJson(keysP[preP + 'bassam_dreport_v1'], null), employees: parseJson(keysP[preP + 'bassam_employees_v1'], []) }; }
            var rawP = {}; Object.keys(keysP).forEach(function (kk) { if (/^bsdept:[^:]+:bassam_(plan|rounds)_v1$/.test(kk)) rawP[kk] = keysP[kk]; });
            var seedQP = String(url.searchParams.get('seed') || ''), seedP = '', seedSrcP = 'crypto.getRandomValues';
            if (/^[0-9a-f]{64}$/i.test(seedQP)) { seedP = seedQP.toLowerCase(); seedSrcP = 'query (replay)'; }
            else { var sbP = new Uint8Array(32), sbj; crypto.getRandomValues(sbP); for (sbj = 0; sbj < 32; sbj++) seedP += (sbP[sbj] < 16 ? '0' : '') + sbP[sbj].toString(16); }
            var hooksP = { today: dsToday(nowX), now: nowX, maxActors: 300,
              actorOf: function (u) { return actorFromKeys(keysP, u.id); },
              ctxOf: function (A, d) { return permv2Ctx(A, d); },
              fieldOnly: function (A, d) { return dailyFieldOnly(A, d); },
              pv4Ctx: function (A, d, kn, okMap, data) { var cP = permv4Ctx(A, d, kn, okMap, { pv4: { staffing: data && data.staffing } }); cP.read = true; cP.readMaxItems = PV4_READ_MAX; return cP; } };
            var rhP = KIVO_IDENTITY_MIGRATION.rehearse({ depts: deptsP, users: usersP, byDept: byDeptP }, { seed: seedP, seedSource: seedSrcP, now: nowX, today: hooksP.today, raw: rawP, revs: revsP });
            var apP = KIVO_IDENTITY_PREFLIGHT.applyTierA(byDeptP, rhP);
            var drPre = KIVO_SCOPE_MIGRATION.dryRun({ depts: deptsP, gdepts: gdP, users: usersP, perms: isObj(permsP) ? permsP : {}, byDept: byDeptP }, hooksP);
            var drPost = KIVO_SCOPE_MIGRATION.dryRun({ depts: deptsP, gdepts: gdP, users: usersP, perms: isObj(permsP) ? permsP : {}, byDept: apP.byDept }, hooksP);
            var cmpP = KIVO_IDENTITY_PREFLIGHT.compare(drPre, drPost, { legacy: KIVO_IDENTITY_PREFLIGHT.legacyIdMap(byDeptP, rhP), unlinked: KIVO_IDENTITY_PREFLIGHT.unlinkedReachability(apP.byDept, drPost), tierB: apP.tierB, tierBExpected: rhP.pending.length, applied: apP.applied });
            return json({ ok: 1, worker: WORKER_VER, preflight: { version: KIVO_IDENTITY_PREFLIGHT.version, docSha256: KIVO_IDENTITY_PREFLIGHT.docSha256, phase: 4.5, mode: KIVO_IDENTITY_PREFLIGHT.mode, writes: 0, seed: seedP, seedSource: seedSrcP, today: hooksP.today,
              rehearsal: { version: rhP.version, phase: rhP.phase, summary: rhP.summary, counts: { depts: rhP.counts.depts, plan: rhP.counts.plan, planFloors: rhP.counts.planFloors, sidClosure: rhP.counts.sidClosure, mirror: rhP.counts.mirror, emp: rhP.counts.emp }, gates: rhP.gates, writeSet: { keys: rhP.writeSet.keys.length, ops: rhP.writeSet.ops, tierA: rhP.writeSet.tierA, tierB: rhP.writeSet.tierB, byOp: rhP.writeSet.byOp, byKind: rhP.writeSet.byKind, hash: rhP.writeSet.hash, tierAHash: rhP.writeSet.tierAHash, tierBHash: rhP.writeSet.tierBHash }, pending: rhP.pending.length, rollback: rhP.rollback },
              applied: apP.applied, tierB: apP.tierB, pre: KIVO_IDENTITY_PREFLIGHT.compact(drPre), post: KIVO_IDENTITY_PREFLIGHT.compact(drPost), comparison: cmpP } });
          } catch (eIP) { return json({ ok: 0, err: String(eIP && eIP.message || eIP) }, 500); }
        }
        /* الحضور: كل جلسة حيّة مع صاحبها وآخر نشاطه وجهازه */
        if (path === '/api/presence') {
          var rs = await env.DB.prepare('SELECT tok, uid, ts, la, dev, city FROM sess WHERE la > ?1').bind(nowX - IDLE_MAX).all();
          var rows = ((rs && rs.results) || []).filter(function (r) { return scopeOk(byId[r.uid]); });
          var lastAct = {};
          try { var la = await env.DB.prepare("SELECT uid, MAX(ts) AS t, k, CASE WHEN act IN ('del', 'deleted') THEN 'del' ELSE 'set' END AS act FROM aud WHERE ts > ?1 GROUP BY uid").bind(nowX - 86400000).all();   /* KIVO_259 (إصلاح — كشفه التقييمُ المستقل): جدولُ audit لم يعد يُكتب منذ R169-CC (السجلُّ الموحّد aud) فكان «آخرُ نشاط» فارغاً دائماً */ ((la && la.results) || []).forEach(function (r) { lastAct[r.uid] = { t: r.t, k: r.k, act: r.act }; }); } catch (e) { swallow('audit-lastActive', e, env.__rid); }
          var byU = {};
          rows.forEach(function (r) { var o = byU[r.uid] || (byU[r.uid] = { u: pubU(byId[r.uid]) || { id: r.uid, name: r.uid }, la: 0, since: r.ts, n: 0, devs: {}, city: r.city || '', mine: false }); o.n++; o.devs[r.dev || 'd'] = 1; if (r.la > o.la) { o.la = r.la; o.city = r.city || o.city; } if (r.ts < o.since) o.since = r.ts; if (r.tok === readCookie(request, COOKIE)) o.mine = true; });
          var list = Object.keys(byU).map(function (id) { var o = byU[id]; return { u: o.u, la: o.la, since: o.since, n: o.n, devs: Object.keys(o.devs), city: o.city, mine: o.mine, active: nowX - o.la <= PRESENCE_MS, last: lastAct[id] || null }; })
            .sort(function (a, b) { return b.la - a.la; });
          return json({ ok: 1, now: nowX, active: list.filter(function (x) { return x.active; }).length, list: url.searchParams.get('count') ? [] : list });
        }
        /* إنهاء جلسات مستخدم (كلها) — لمدير النظام؛ ولا يُنهي جلسته هو من هنا */
        if (path === '/api/sess/kill' && request.method === 'POST') {
          var rbk = await bodyRead(request, path); if (rbk.res) return rbk.res; var bk = rbk.v;   /* SOT-101 · src/schemas/api/bodies.schema.json (KIVO_264: JSON غيرُ مفهوم ⇒ bad-body أيضاً) */
          var tgt = byId[String(bk.uid || '')];
          if (!tgt || !scopeOk(tgt) || (!superX && tgt.id === AX.u.id)) return json({ ok: 0, err: 'forbidden' }, 403);
          var rmK = reqMeta(request);
          if (bk.all && superX) {
            await env.DB.prepare('DELETE FROM sess WHERE tok <> ?1').bind(readCookie(request, COOKIE) || '').run();
            await secLog(env, { uid: AX.u.id, un: AX.u.un, act: 'sess_kill', target: JSON.stringify({ id: '*', name: 'الجميع' }), ip: rmK.ip, city: rmK.city, dev: rmK.dev });
            return json({ ok: 1 });
          }
          var q = tgt.id === AX.u.id ? env.DB.prepare('DELETE FROM sess WHERE uid = ?1 AND tok <> ?2').bind(tgt.id, readCookie(request, COOKIE) || '') : env.DB.prepare('DELETE FROM sess WHERE uid = ?1').bind(tgt.id);
          await q.run();
          await secLog(env, { uid: AX.u.id, un: AX.u.un, act: 'sess_kill', target: JSON.stringify(pubU(tgt)), ip: rmK.ip, city: rmK.city, dev: rmK.dev });
          return json({ ok: 1 });
        }
        if (!superX) return json({ ok: 0, err: 'forbidden' }, 403);
        /* سجل أحداث الأمن */
        if (path === '/api/sec') {
          var limS = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
          var sinceS = parseInt(url.searchParams.get('since') || '0', 10) || 0, beforeS = parseInt(url.searchParams.get('before') || '0', 10) || 0;
          var kind = url.searchParams.get('kind') || '';
          var acts = { login: ['login_ok', 'login_fail', 'lock', 'logout', 'sess_kill', 'guard_unlock'], pw: ['pw_change'], acct: ['acct_add', 'acct_del', 'acct_freeze', 'acct_unfreeze'], perm: ['perm_change'], denied: ['denied'], admin: ['admin', 'policy_change', 'sess_kill', 'guard_unlock'] }[kind];
          var q2 = 'SELECT id, ts, uid, un, act, target, detail, ip, city, dev FROM sec WHERE (?2 = 0 OR ts >= ?2) AND (?3 = 0 OR ts < ?3)' + (acts ? ' AND act IN (' + acts.map(function (a) { return "'" + a + "'"; }).join(',') + ')' : '') + ' ORDER BY ts DESC, id DESC LIMIT ?1';
          var rsS = await env.DB.prepare(q2).bind(limS, sinceS, beforeS).all();
          var rowsS = ((rsS && rsS.results) || []).map(function (r) { var u = byId[r.uid]; return Object.assign({}, r, { name: u ? (u.name || u.un) : (r.un || ''), role: u ? u.role : '', deptId: u ? (u.deptId || '') : '' }); });
          return json({ ok: 1, rows: rowsS });
        }
        /* الأقفال الحالية ومحاولات اليوم */
        if (path === '/api/guard') {
          var gs = await env.DB.prepare('SELECT gk, n, until FROM guard').all();
          return json({ ok: 1, now: nowX, rows: ((gs && gs.results) || []).filter(function (g) { return String(g.gk).indexOf('rl:') !== 0; }).map(function (g) { return { gk: g.gk, n: g.n, until: g.until, locked: (g.until || 0) > nowX }; }) });   /* KIVO_255 · SOT-139: نوافذُ حدّ المعدّل (rl:) ليست أقفالاً — كانت تظهر «مقفل» في القائمة */
        }
        if (path === '/api/guard/unlock' && request.method === 'POST') {
          var rbg = await bodyRead(request, path); if (rbg.res) return rbg.res; var bg = rbg.v;   /* KIVO_264 · SOT-101: مخطّطُ الجسم (null ⇒ 400 — كان 500 ثم {} منذ 261) */
          var gk2 = String(bg.gk || '');
          /* KIVO_261 (المراجعةُ المستقلة): gk مفردٌ ببادئةٍ معروفة وحدها؛ و«فكُّ الكلّ» بطلبٍ صريح {all:1} لا بجسمٍ فارغ */
          if (gk2 && !/^(u|ip|p):/.test(gk2)) return json({ ok: 0, err: 'gk' }, 400);
          if (!gk2 && !Array.isArray(bg.gks) && bg.all !== 1) return json({ ok: 0, err: 'gk' }, 400);
          /* KIVO_261 (AUD-052): gks — أقفالُ اسمٍ بعينه كما يعيدها /api/overview (أزواجُه ومصادرُها · ≤ 20 · بادئةٌ معروفة) */
          var gks2 = Array.isArray(bg.gks) ? bg.gks.filter(function (x) { return typeof x === 'string' && x.length < 200 && /^(u|ip|p):/.test(x); }).slice(0, 20) : [];
          if (Array.isArray(bg.gks) && !gks2.length) return json({ ok: 1, n: 0 });   /* قائمةٌ بلا مفتاحٍ صالح ⇒ لا شيء (لا «فكَّ الكلّ» بالخطأ) */
          if (gks2.length) { var all2 = gks2.concat(gk2 && gks2.indexOf(gk2) === -1 ? [gk2] : []); await env.DB.batch(all2.map(function (x) { return env.DB.prepare('DELETE FROM guard WHERE gk = ?1').bind(x); })); gk2 = all2.join(','); }
          else if (gk2) await env.DB.prepare('DELETE FROM guard WHERE gk = ?1').bind(gk2).run(); else await env.DB.prepare('DELETE FROM guard').run();
          var rmG = reqMeta(request);
          await secLog(env, { uid: AX.u.id, un: AX.u.un, act: 'guard_unlock', target: gk2 || '*', ip: rmG.ip, city: rmG.city, dev: rmG.dev });
          return json({ ok: 1 });
        }
        /* السياسات */
        /* ── مفتاح الاستعادة: الحالة · إنشاء مفتاح جديد (يُعرض مرة واحدة) ── */
        if (path === '/api/recovery') {
          if (!superX) return json({ ok: 0, err: 'forbidden' }, 403);
          var rkM = parseJson(await metaGet(env, 'rk_meta'), null), rkUsed = parseJson(await metaGet(env, 'rk_used'), null);
          var hasK = !!(await metaGet(env, 'rk'));
          var bks = AX.users.filter(function (x) { return x.role === 'super' && x.bk; }).map(pubU);
          var lastBk = bks.length ? await env.DB.prepare('SELECT ts FROM sec WHERE act = ?1 AND uid = ?2 ORDER BY ts DESC LIMIT 1').bind('login_ok', bks[0].id).first() : null;
          return json({ ok: 1, key: hasK ? { ts: rkM ? rkM.ts : 0, by: rkM ? rkM.by : '', uid: rkM ? rkM.uid : '' } : null, used: rkUsed, backups: bks, backupLastLogin: lastBk ? lastBk.ts : 0 });
        }
        if (path === '/api/recovery/new' && request.method === 'POST') {
          if (!superX) return json({ ok: 0, err: 'forbidden' }, 403);
          var rbn = await bodyRead(request, path); if (rbn.res) return rbn.res; var bn = rbn.v;   /* KIVO_264 · SOT-101 · E5: null كان 500 */
          var gkN = 'pw:' + AX.u.id;
          if (await guardLeft(env, gkN) > 0) return json({ ok: 0, err: 'محاولات كثيرة — انتظر قليلاً' });
          var okN = await verifyPw(String(bn.pw == null ? '' : bn.pw), AX.u.ph);
          if (okN === 'unsupported') return json({ ok: 0, err: ERR_ITER });
          if (okN !== true) { await guardFail(env, gkN); return json({ ok: 0, err: 'كلمة المرور غير صحيحة' }); }
          await guardReset(env, gkN);
          var keyN = newRecoveryKey(), hN = await hashKey(keyN), rmN = reqMeta(request);
          /* المفتاح يفتح حساب مدير النظام الرئيسي (لا الاحتياطي) */
          var mainSu = AX.users.filter(function (x) { return x.role === 'super' && !x.bk; })[0] || AX.u;
          await env.DB.batch([
            env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rk', hN),
            env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rk_uid', mainSu.id),
            env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rk_meta', JSON.stringify({ ts: nowX, by: AX.u.un, uid: mainSu.id })),
            env.DB.prepare('DELETE FROM meta WHERE k = ?1').bind('rk_used')
          ]);
          await secLog(env, { uid: AX.u.id, un: AX.u.un, act: 'recovery_key', detail: 'new', ip: rmN.ip, city: rmN.city, dev: rmN.dev });
          return json({ ok: 1, key: keyN, uid: mainSu.id, un: mainSu.un });
        }
        /* ── تهيئة منصة جديدة: مسح كامل بتأكيد مزدوج ── */
        if (path === '/api/reset' && request.method === 'POST') {
          if (!superX) return json({ ok: 0, err: 'forbidden' }, 403);
          var rbz = await bodyRead(request, path); if (rbz.res) return rbz.res; var bz = rbz.v;   /* KIVO_264 · SOT-101 · E5: null كان 500 */
          var gkZ = 'pw:' + AX.u.id;
          if (await guardLeft(env, gkZ) > 0) return json({ ok: 0, err: 'محاولات كثيرة — انتظر قليلاً' });
          var okZ = await verifyPw(String(bz.pw == null ? '' : bz.pw), AX.u.ph);
          if (okZ === 'unsupported') return json({ ok: 0, err: ERR_ITER });
          if (okZ !== true) { await guardFail(env, gkZ); return json({ ok: 0, err: 'كلمة المرور غير صحيحة' }); }
          var rkZ = await metaGet(env, 'rk');
          if (!rkZ) return json({ ok: 0, err: 'أنشئ مفتاح استعادة أولاً — التهيئة لا تُنفَّذ بدونه' });
          if ((await verifyPw('rk:' + normKey(bz.key), rkZ)) !== true) { await guardFail(env, gkZ); return json({ ok: 0, err: 'مفتاح الاستعادة غير صحيح' }); }
          if (String(bz.confirm || '') !== 'تهيئة') return json({ ok: 0, err: 'اكتب كلمة «تهيئة» للتأكيد' });
          var adZ = isObj(bz.admin) ? bz.admin : {};
          var unZ = String(adZ.un || '').trim(), nmZ = String(adZ.name || '').trim() || 'مدير النظام', pwZ = String(adZ.pw || '');
          if (!unCheck(unZ)) return json({ ok: 0, err: 'اسم مستخدم مدير النظام: رقم جوال أو هوية من 10 أرقام' });
          if (!pwCheck(pwZ, 'super')) return json({ ok: 0, err: 'كلمة مرور مدير النظام الجديد ضعيفة — 6 أرقام' });
          await guardReset(env, gkZ);
          var rmZ = reqMeta(request);
          var keepBrand = !!bz.keepBrand, platZ = keepBrand ? await kvGet(env, 'kv', K_PLAT) : null;
          var phZ = await hashPw(pwZ);
          var usersZ = [{ id: 'su', un: unZ, ph: phZ, name: nmZ, role: 'super', mc: 1 }];
          var stZ = [
            env.DB.prepare('DELETE FROM notification_user_state'), env.DB.prepare('DELETE FROM notification_targets'), env.DB.prepare('DELETE FROM notification_messages'),
            env.DB.prepare('DELETE FROM notification_dedup'), env.DB.prepare('DELETE FROM notification_type_overrides'), env.DB.prepare('DELETE FROM notification_checkpoints'),
            env.DB.prepare('DELETE FROM custody_request_outputs'), env.DB.prepare('DELETE FROM custody_requests'), env.DB.prepare('DELETE FROM custody_movements'), env.DB.prepare('DELETE FROM custody_issues'), env.DB.prepare('DELETE FROM custody_items'),
            env.DB.prepare('DELETE FROM restore_operations'), env.DB.prepare('DELETE FROM restore_preimage'), env.DB.prepare('DELETE FROM restore_snapshot_manifest'),
            env.DB.prepare('DELETE FROM daily_stats_day_locks'), env.DB.prepare('DELETE FROM daily_stats_month_locks'), env.DB.prepare('DELETE FROM daily_stats_days'),
            env.DB.prepare('DELETE FROM kv'), env.DB.prepare('DELETE FROM imgs'), env.DB.prepare('DELETE FROM revs'),
            env.DB.prepare('DELETE FROM imgown'), env.DB.prepare('DELETE FROM imgref'), env.DB.prepare("DELETE FROM meta WHERE k = 'imgown'"),
            env.DB.prepare('DELETE FROM audit'), env.DB.prepare('DELETE FROM sess'), env.DB.prepare('DELETE FROM guard'),
            env.DB.prepare('DELETE FROM meta WHERE k IN (?1, ?2, ?3, ?4, ?5)').bind('rev', 'rk', 'rk_uid', 'rk_meta', 'rk_used')
          ];
          stZ = stZ.concat(kvPutStmts(env, 'kv', K_USERS, JSON.stringify(usersZ)));
          stZ.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2)').bind(K_USERS, 1));
          if (platZ) { stZ = stZ.concat(kvPutStmts(env, 'kv', K_PLAT, platZ)); stZ.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2)').bind(K_PLAT, 1)); }
          stZ.push(env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rev', '1'));
          if(!Number.isSafeInteger(env.__restoreEpoch)||env.__restoreEpoch>=Number.MAX_SAFE_INTEGER)throw dbGuardError('db-restore-epoch-invalid');
          stZ.push(env.DB.prepare("INSERT INTO meta(k,v) VALUES('restore_epoch',?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(String(env.__restoreEpoch+1)),env.DB.prepare('DELETE FROM sec'),audEvStmt(env, { cid: 'reset_' + Date.now().toString(36), ts: Date.now(), uid: AX.u.id, un: AX.u.un, dept: '', k: 'system', rev: 1, etype: 'system', eid: 'platform', ename: 'المنصة', act: 'reset', ctx: JSON.stringify({ keepBrand: keepBrand, newAdmin: unZ }), bef: '', aft: '' }),secStmt(env, { uid: AX.u.id, un: AX.u.un, act: 'reset', detail: JSON.stringify({ keepBrand: keepBrand, newAdmin: unZ, byName: AX.u.name || '' }), ip: rmZ.ip, city: rmZ.city, dev: rmZ.dev }));
          await env.DB.batch(stZ);
          return json({ ok: 1 }, 200, clearCookie(url));
        }
        if (path === '/api/policy') {
          if (request.method === 'POST') {
            var rbp = await bodyRead(request, path); if (rbp.res) return rbp.res; var bp = rbp.v;   /* KIVO_264 · SOT-101 · E5: null كان 500 */
            var np = {}; Object.keys(POLICY_DEF).forEach(function (k) { var v = +bp[k]; if (isFinite(v) && v > 0) np[k] = v; });
            np.sessH = Math.min(72, Math.max(1, np.sessH || POL.sessH)); np.idleH = Math.min(24, Math.max(0.25, np.idleH || POL.idleH));
            np.lockN = Math.min(20, Math.max(3, np.lockN || POL.lockN)); np.lockMin = Math.min(60, Math.max(1, np.lockMin || POL.lockMin)); np.pwMin = 6;   /* KIVO_259 (إصلاح — كشفه التدقيقُ المستقل): رقمُ مدير النظام 6 أرقام بالضبط (pwCheck) — كان المدخلُ يُقبل حتى 32 فيجعل كلَّ رقمٍ غيرَ صالح (قفلٌ تامّ) */ np.wrMin = Math.min(5000, Math.max(30, np.wrMin || POL.wrMin));   /* KIVO_255 · SOT-139 */
            await env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('policy', JSON.stringify(np)).run();
            var rmP = reqMeta(request);
            await secLog(env, { uid: AX.u.id, un: AX.u.un, act: 'policy_change', detail: JSON.stringify(np), ip: rmP.ip, city: rmP.city, dev: rmP.dev });
            return json({ ok: 1, policy: np });
          }
          return json({ ok: 1, policy: POL });
        }
        /* ملخّص نظرة عامة */
        if (path === '/api/overview') {
          var day0 = new Date(nowX); day0.setHours(0, 0, 0, 0); var dayTs = day0.getTime();
          /* Read independent dashboard aggregates in two batches, not sixteen
             sequential edge-to-D1 round trips. Image diagnostics stay optional. */
          var overviewReads = await Promise.allSettled([
            env.DB.batch([
              env.DB.prepare('SELECT COUNT(*) AS n FROM sec WHERE act = ?1 AND ts >= ?2').bind('login_fail', dayTs),
              env.DB.prepare('SELECT COUNT(*) AS n FROM sec WHERE act = ?1 AND ts >= ?2').bind('denied', dayTs),
              env.DB.prepare("SELECT COUNT(*) AS n FROM guard WHERE until > ?1 AND gk NOT LIKE 'rl:%'").bind(nowX),
              env.DB.prepare('SELECT COUNT(*) AS n FROM sess WHERE la > ?1').bind(nowX - PRESENCE_MS),
              env.DB.prepare('SELECT COUNT(*) AS n FROM sess WHERE la > ?1').bind(nowX - IDLE_MAX),
              env.DB.prepare('SELECT uid, MAX(ts) AS t FROM sec WHERE act = ?1 GROUP BY uid').bind('login_ok'),
              env.DB.prepare('SELECT un, COUNT(*) AS n, MAX(ts) AS t, MAX(city) AS city, MAX(dev) AS dev, MAX(detail) AS detail FROM sec WHERE act = ?1 AND ts >= ?2 GROUP BY un ORDER BY n DESC LIMIT 20').bind('login_fail', dayTs),
              env.DB.prepare('SELECT ts, uid, un, target FROM sec WHERE act = ?1 AND ts >= ?2 ORDER BY ts DESC LIMIT 200').bind('acct_add', nowX - 30 * 86400000),
              env.DB.prepare('SELECT ts, uid, un, target FROM sec WHERE act = ?1 ORDER BY ts DESC LIMIT 100').bind('acct_freeze'),
              env.DB.prepare('SELECT uid, COUNT(*) AS n, MAX(ts) AS t FROM sec WHERE act = ?1 AND ts >= ?2 GROUP BY uid ORDER BY n DESC LIMIT 10').bind('denied', dayTs),
              env.DB.prepare('SELECT gk, n, until FROM guard WHERE until > ?1').bind(nowX)
            ]),
            env.DB.batch([
              env.DB.prepare('SELECT st, COUNT(*) AS n FROM imgown GROUP BY st'),
              env.DB.prepare('SELECT COUNT(DISTINCT k) AS n FROM imgs WHERE k NOT LIKE ?1').bind(IMG_STG + '%'),
              env.DB.prepare('SELECT COUNT(DISTINCT k) AS n FROM imgs WHERE k LIKE ?1').bind(IMG_STG + '%'),
              env.DB.prepare("SELECT img, uid, dept, ts FROM imgown WHERE st = 'claim' ORDER BY ts DESC LIMIT 30"),
              env.DB.prepare("SELECT img, dept, ts FROM imgown WHERE st = 'orphan' ORDER BY ts DESC LIMIT 30")
            ])
          ]);
          if (overviewReads[0].status !== 'fulfilled') throw overviewReads[0].reason;
          var ov = overviewReads[0].value;
          var firstOv = function (i) { return ov[i] && ov[i].results && ov[i].results[0] || null; };
          var f1 = firstOv(0), d1 = firstOv(1), l1 = firstOv(2), s1 = firstOv(3), sN = firstOv(4), ll = ov[5];
          var lastLogin = {}; ((ll && ll.results) || []).forEach(function (r) { lastLogin[r.uid] = r.t; });
          var fails = ov[6], added = ov[7];
          var oldHash = AX.users.filter(function (u) { var p = String(u.ph || '').split('$'); return p[0] === 'p2' && (parseInt(p[1], 10) || 0) > PBKDF2_MAX; }).map(function (u) { return u.id; });
          var frozen = ov[8], deniedBy = ov[9], guards = ov[10];
          var nameOf = function (uid) { var u = byId[uid]; return u ? (u.name || u.un) : ''; };
          /* KIVO_265 · حادثةُ الصور (البند 6 من قائمة صفحة المهام): تشخيصُ مخزن الصور لمدير النظام — ربطُ R2 · عدُّ الصور بحالاتها (مربوطة · رفعٌ لم يُربط claim ·
             يتيمةٌ في مهلة السماح · غيرُ محسومة) · رفوعٌ لم تكتمل (أجزاءٌ مرحَّلة) · قائمةُ غير المربوطة بأصحابها وإداراتهم · واليتيماتُ بما بقي لكنسها — قراءةٌ خفيفة */
          var imgDiag = null;
          try {
            if (overviewReads[1].status !== 'fulfilled') throw overviewReads[1].reason;
            var im = overviewReads[1].value, ownC = im[0], cnt9 = { bound: 0, claim: 0, orphan: 0, amb: 0 };
            ((ownC && ownC.results) || []).forEach(function (r) { cnt9[String(r.st)] = r.n; });
            var stored9 = im[1].results && im[1].results[0], staged9 = im[2].results && im[2].results[0];
            var claims9 = im[3], orph9 = im[4];
            imgDiag = { r2: !!imgBucket(env), stored: stored9 ? stored9.n : 0, staged: staged9 ? staged9.n : 0, counts: cnt9, grace: IMG_ORPHAN_GRACE,
              claims: ((claims9 && claims9.results) || []).map(function (r) { return { img: r.img, uid: r.uid, name: nameOf(r.uid), dept: r.dept, ts: r.ts }; }),
              orphans: ((orph9 && orph9.results) || []).map(function (r) { return { img: r.img, dept: r.dept, ts: r.ts }; }) };
          } catch (eI9) { imgDiag = { err: errMsg(eI9) }; }
          return json({ ok: 1, now: nowX, policy: POL, oldHash: oldHash, imgs: imgDiag,
            failsToday: f1 ? f1.n : 0, deniedToday: d1 ? d1.n : 0, lockedNow: l1 ? l1.n : 0, activeNow: s1 ? s1.n : 0, sessions: sN ? sN.n : 0,
            lastLogin: lastLogin,
            /* KIVO_261 (إصلاح — كشفه k261sys · AUD-052): القفلُ على المصدر والزوج (ip: · p:<un>|<ip>) لا على الحساب (u: عدّادُ إنذارٍ لا يُقفل) —
               فكان القفلُ هنا يُقرأ من u: وحده فلا يظهر «فكّ القفل» أبداً (ولا يفكّ شيئاً لو ظهر). الآن: أقفالُ الاسم الفعلية (أزواجُه ومصادرُها) ومفاتيحُها */
            fails: ((fails && fails.results) || []).map(function (r) {
              var unL = String(r.un).toLowerCase(), act = (guards && guards.results) || [], pre = 'p:' + unL + '|';
              /* زوجُ الاسم: ما بعد «p:<الاسم>|» عنوانٌ بلا «|» (لا يلتبس اسمٌ مكتوب فيه «|» باسمٍ آخر) */
              var mine = act.filter(function (x) { var g = String(x.gk); return g === 'u:' + unL || (g.indexOf(pre) === 0 && g.slice(pre.length).indexOf('|') === -1); });
              /* قفلُ المصدر يُرفع مع الاسم فقط إن لم يكن المصدرُ مقفلاً على أسماءٍ أخرى — مصدرٌ يخمّن على حساباتٍ عدّة يبقى مقفلاً (تصويبُ المراجعة المستقلة) */
              var ipk = mine.filter(function (x) { return String(x.gk).indexOf('p:') === 0; }).map(function (x) { return String(x.gk).slice(pre.length); })
                .filter(function (ip) { return !act.some(function (y) { var g = String(y.gk); return g.indexOf('p:') === 0 && g.slice(g.lastIndexOf('|') + 1) === ip && g.indexOf(pre) !== 0; }); })
                .map(function (ip) { return 'ip:' + ip; });
              var lk = act.filter(function (x) { return mine.indexOf(x) !== -1 || ipk.indexOf(x.gk) !== -1; });
              return { un: r.un, n: r.n, t: r.t, city: r.city, dev: r.dev, known: !!AX.users.filter(function (u) { return String(u.un || '').toLowerCase() === unL; })[0],
                       until: lk.reduce(function (m, x) { return Math.max(m, x.until || 0); }, 0), gks: lk.map(function (x) { return x.gk; }) };
            }),
            added: ((added && added.results) || []).map(function (r) { var tg = parseJson(r.target, {}); return { ts: r.ts, by: nameOf(r.uid) || r.un, tg: tg, lastLogin: lastLogin[tg.id] || 0 }; }),
            frozen: ((frozen && frozen.results) || []).map(function (r) { var tg = parseJson(r.target, {}); return { ts: r.ts, by: nameOf(r.uid) || r.un, tg: tg }; }),
            deniedBy: ((deniedBy && deniedBy.results) || []).map(function (r) { return { uid: r.uid, name: nameOf(r.uid), n: r.n, t: r.t }; }) });
        }
      }

      /* KIVO_243 — حالةُ الإنفاذ · سجلُّ القرارات · الترحيلُ والرجوع · جلسةُ الاختبار الداخلية (بيئة الإنفاذ وحدها) */
      if (enfEnvOn(env) && (path === '/api/authz' || path === '/api/authz/log' || path === '/api/authz/snaps')) {
        var AZ = await actorOf(env, ss.uid); if (!AZ) return json({ ok: 0, err: 'session' }, 401);
        return await enfAuthzApi(env, request, AZ, url, path);
      }
      if (enfEnvOn(env) && path === '/api/authz-migrate') {
        var AMG = await actorOf(env, ss.uid); if (!AMG) return json({ ok: 0, err: 'session' }, 401);
        return await enfMigrateApi(env, request, AMG, url, reqMeta(request));
      }
      if (enfEnvOn(env) && path === '/api/authz-test' && request.method === 'POST') {
        var ATS = await actorOf(env, ss.uid); if (!ATS) return json({ ok: 0, err: 'session' }, 401);
        return await enfTestApi(this, env, request, ATS, url);
      }
      /* ── سحب مفاتيح بعينها بأحدث قيمها — للتحديث الحي بلا إعادة تحميل ── */
      if (path === '/api/get') return await getRoute(env, url, ss);

      /* ── سجل التدقيق: من غيّر ماذا ومتى — لمدير النظام، ولمدير الإدارة على مفاتيح إدارته ── */
      /* ══ R169: سجلُّ الأنشطة والتغييرات — استعلامٌ مرشَّحٌ مرقَّم، والنطاقُ يُفرض هنا لا في الواجهة ══ */
      if (path === '/api/aud') {
        /* R169-CC: السجلُّ إلحاقٌ فقط — القراءةُ وحدَها تُقبل على هذه النقطة، ولا طريقَ فيها لتعديلٍ أو حذف */
        if (request.method !== 'GET') return json({ ok: 0, err: 'read-only' }, 405);
        var AU = await actorOf(env, ss.uid);
        if (!AU) return json({ ok: 0, err: 'session' }, 401);
        var qA = url.searchParams;
        var limA = Math.min(200, Math.max(1, parseInt(qA.get('limit') || '60', 10) || 60));
        var deptA = String(qA.get('dept') || ''), etA = String(qA.get('etype') || ''), eidA = String(qA.get('eid') || '').slice(0, 80), actA = String(qA.get('act') || ''), uidA = String(qA.get('uid') || '');
        var qqA = audLike(qA.get('q')).slice(0, 80), siteA = audLike(qA.get('site')).slice(0, 80), planA = audLike(qA.get('plan')).slice(0, 20), dayA = audLike(qA.get('day')).slice(0, 20);
        var kA9 = String(qA.get('k') || '').slice(0, 160);   /* تاريخُ مجموعة بياناتٍ بعينها — يشمل أسطرَ legacy المرحَّلة */
        var sinceA9 = parseInt(qA.get('since') || '0', 10) || 0, beforeA9 = parseInt(qA.get('before') || '0', 10) || 0, curA = parseInt(qA.get('cursor') || '0', 10) || 0;
        if (etA && !AUD_TOK_RE.test(etA)) etA = ''; if (actA && !AUD_TOK_RE.test(actA)) actA = '';
        var entMode = !!(etA && eidA);
        if (AU.u.role !== 'super') { if (!deptA || !audCanDept(AU, deptA, entMode)) return json({ ok: 0, err: 'forbidden' }, 403); }
        var raA = await env.DB.prepare('SELECT id, ts, uid, un, dept, k, rev, etype, eid, ename, act, ctx, bef, aft, dev, city FROM aud WHERE (?2 = \'\' OR dept = ?2) AND (?3 = \'\' OR etype = ?3) AND (?4 = \'\' OR eid = ?4) AND (?5 = \'\' OR act = ?5) AND (?6 = \'\' OR uid = ?6) AND (?7 = 0 OR ts >= ?7) AND (?8 = 0 OR ts < ?8) AND (?9 = 0 OR id < ?9) AND (?10 = \'\' OR ename LIKE ?11 ESCAPE \'\\\' OR eid LIKE ?11 ESCAPE \'\\\') AND (?12 = \'\' OR ctx LIKE ?13 ESCAPE \'\\\') AND (?14 = \'\' OR ctx LIKE ?15 ESCAPE \'\\\') AND (?16 = \'\' OR ctx LIKE ?17 ESCAPE \'\\\') AND (?18 = \'\' OR k = ?18) ORDER BY id DESC LIMIT ?1')
          .bind(limA + 1, deptA, etA, eidA, actA, uidA, sinceA9, beforeA9, curA, qqA, '%' + qqA + '%', siteA, '%"site":"' + siteA + '"%', planA, '%"plan":"' + planA + '"%', dayA, '%"day":"' + dayA + '"%', kA9).all();
        var rowsA = ((raA && raA.results) || []);
        var moreA = rowsA.length > limA; if (moreA) rowsA = rowsA.slice(0, limA);
        var byIdU = nmap(); AU.users.forEach(function (u) { if (u && u.id) byIdU[u.id] = u; });   /* KIVO_261: null-prototype */
        /* READ-01: السجلُّ يتبع عقدَ القراءة نفسَه — لا يُعرض حدثٌ عن مجموعةِ بياناتٍ لا يقرؤها صاحبُ الجلسة */
        var nRawA = rowsA.length;
        rowsA = rowsA.filter(function (r) { return !r.k || r.k === 'system' || canRead(AU, r.k); });
        /* سجلُّ كيانٍ في صفحةٍ لا يقرؤها صاحبُ الجلسة: رفضٌ صريحٌ لا قائمةٌ فارغةٌ مُلبِسة */
        if (entMode && nRawA > 0 && rowsA.length === 0) return json({ ok: 0, err: 'forbidden' }, 403);
        rowsA = rowsA.map(function (r) { var u = byIdU[r.uid]; return Object.assign({}, r, { name: u ? (u.name || u.un) : (r.un || ''), role: u ? u.role : '' }); });
        return json({ ok: 1, rows: rowsA, next: moreA && rowsA.length ? rowsA[rowsA.length - 1].id : 0 });
      }
      /* R169-CC: نقطةُ /api/audit أُزيلت — الواجهةُ الواحدة هي /api/aud، وأسطرُ الجدول القديم رُحِّلت إليها نوعاً legacy. */

      if (path === '/api/imgs' && request.method === 'GET') {
        var AL = await actorOf(env, ss.uid);
        if (!AL) return json({ ok: 0, err: 'session' }, 401);
        /* لم يعُد للعقد القديم (الصورُ بأجسامها دفعةً واحدة) أثرٌ هنا ولا تحت
           أيِّ اسمٍ آخر: الصيغتان — العاريةُ و ?list=1 — نداءٌ واحدٌ لدالّةٍ
           واحدة، فلا يفترق حكمُهما ولا تُنسى إحداهما عند تعديلٍ لاحق. */
        return json(await imgListFor(env, AL));
      }
      if (path.indexOf('/api/img/') === 0) {
       try {
        var ik = decodeURIComponent(path.slice('/api/img/'.length));
        if (!ik) return json({ ok: 0 }, 400);
        var AI = await actorOf(env, ss.uid);
        if (!AI) return json({ ok: 0, err: 'session' }, 401);          /* حسابٌ حُذف أو جُمّد والجلسة حيّة */
        var mode = request.method === 'PUT' ? 'put' : (request.method === 'DELETE' ? 'del' : 'read');
        var vI = await imgVerdict(env, AI, ik, mode);
        if (!vI.ok) return json({ ok: 0, err: 'forbidden', why: vI.why }, 403);
        if (request.method === 'PUT') {
          if (!imgCtypeOk(request.headers.get('Content-Type'))) return json({ ok: 0, err: IMG_TYPE_ERR }, 415);   /* KIVO_264 · SOT-101: العقدُ الخامّ — النوعُ قبل قراءة الجسم */
          var rlI = await rlHit(env, 'im', AI.u.id, Math.max(30, Math.floor(RL_SAVE / 4))); if (rlI) return tooMany(rlI);   /* KIVO_255 · SOT-139: رفعُ الصور محدودٌ بربع سقف الحفظ (نافذةُ دقيقة · لكل حساب) */
          var rawI = await request.arrayBuffer();
          if (rawI.byteLength > bodyLimit('/api/img/')) return json({ ok: 0, err: limMsg('/api/img/') }, 413);
          var qI = AI.u.role === 'super' ? 0 : await imgQuotaHit(env, AI.u.id, rawI.byteLength);   /* KIVO_261: حصّةُ الرفع اليومية (المراجعةُ المستقلة · البند 5) */
          if (qI) return json({ ok: 0, err: IMG_QUOTA_ERR, retry: qI }, 429, { 'Retry-After': String(qI) });
          var txtI = new TextDecoder().decode(rawI);
          /* ══ الرفعُ المقطَّع: ?p=<الجزء>&n=<العدد> ══
             الأجزاءُ تُخزَّن مرحَّلةً تحت بادئةٍ لا تُقرأ ولا تُجرَد، والمفتاحُ الحقيقيُّ لا يُكتب إلا
             عند آخر جزءٍ بعد التجميع — في دفعةٍ واحدةٍ مع حذف المرحَّل، فلا وجودَ لصورةٍ نصفِ مكتوبة.
             وبلا معاملاتٍ: نفسُ السلوك القديم حرفياً. */
          var pI = parseInt(url.searchParams.get('p') || '-1', 10), nI = parseInt(url.searchParams.get('n') || '0', 10);
          if (nI > 0) {
            if (!(nI <= IMG_PARTS_MAX) || !(pI >= 0 && pI < nI)) return json({ ok: 0, err: 'part' }, 400);
            if (pI === 0 && !imgTypeOk(txtI)) return json({ ok: 0, err: IMG_TYPE_ERR }, 415);   /* KIVO_261 · SOT-068: الجزءُ الأوّل يحمل الترويسة */
            if (pI > 0 && !imgPartOk(txtI)) return json({ ok: 0, err: IMG_TYPE_ERR }, 415);   /* والتالي base64 وحدها */
            var sgK = IMG_STG + ik + '~';
            if (pI > 0 && !(await env.DB.prepare('SELECT 1 AS x FROM imgs WHERE k = ?1 LIMIT 1').bind(sgK + '0').first())) return json({ ok: 0, err: 'part0-missing' }, 409);   /* لا مرحَّلَ بلا جزءٍ أوّل سليم — لا تخزينَ يتيماً */
            var stP = [];
            if (pI === 0) stP.push(env.DB.prepare('DELETE FROM imgs WHERE k LIKE ?1').bind(sgK + '%'));   /* رفعٌ سابقٌ مهجور */
            stP = stP.concat(kvPutStmts(env, 'imgs', sgK + pI, txtI));
            await env.DB.batch(stP);
            if (pI < nI - 1) return json({ ok: 1, part: pI, of: nI });
            /* آخرُ جزء: تُجمَّع الأجزاءُ بترتيبها ويُكتب المفتاحُ مرّةً واحدة */
            var allP = '';
            for (var q9 = 0; q9 < nI; q9++) {
              var vq = await kvGet(env, 'imgs', sgK + q9);
              if (vq == null) return json({ ok: 0, err: 'part-missing', part: q9 }, 409);
              allP += vq;
              if (allP.length > IMG_TOTAL_MAX) return json({ ok: 0, err: 'الصورة أكبر من الحد المسموح (' + Math.round(IMG_TOTAL_MAX / 1048576) + 'MB)' }, 413);
            }
            if (!imgTypeOk(allP)) { await env.DB.prepare('DELETE FROM imgs WHERE k LIKE ?1').bind(sgK + '%').run(); return json({ ok: 0, err: IMG_TYPE_ERR }, 415); }
            var stC = await imgStoreStmts(env, ik, allP);
            stC.push(env.DB.prepare('DELETE FROM imgs WHERE k LIKE ?1').bind(sgK + '%'));
            stC.push(ownStmt(env, ik, 'claim', '', AI.u.id, String(AI.u.deptId || '')));
            for (var j9 = 0; j9 < stC.length; j9 += 90) await env.DB.batch(stC.slice(j9, j9 + 90));
            return json({ ok: 1, n: allP.length, parts: nI });
          }
          if (!imgTypeOk(txtI)) return json({ ok: 0, err: IMG_TYPE_ERR }, 415);   /* KIVO_261 · SOT-068 */
          var stI = await imgStoreStmts(env, ik, txtI);
          /* رفعٌ لم يُربط بعد: يُسجَّل صاحبه مؤقتاً حتى أول ربطٍ مشروع بمورد */
          stI.push(ownStmt(env, ik, 'claim', '', AI.u.id, String(AI.u.deptId || '')));
          await env.DB.batch(stI);
          return json({ ok: 1, n: txtI.length });
        }
        if (request.method === 'DELETE') {
          await imgDropR2(env, ik);
          await env.DB.batch([env.DB.prepare('DELETE FROM imgs WHERE k = ?1').bind(ik),
            env.DB.prepare('DELETE FROM imgs WHERE k LIKE ?1').bind(IMG_STG + ik + '~%'),
            env.DB.prepare('DELETE FROM imgown WHERE img = ?1').bind(ik),
            env.DB.prepare('DELETE FROM imgref WHERE img = ?1').bind(ik)]);
          return json({ ok: 1 });
        }
        var iv = await imgLoad(env, ik);
        if (iv == null) return new Response('', { status: 404, headers: { 'Cache-Control': 'no-store' } });
        return new Response(iv, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
       } catch (eIM) {
        var guardImage=dbGuardFailure(eIM);if(guardImage)return json({ok:0,err:guardImage.err},guardImage.status);
        /* فشلُ الصور يظهر باسمه كما في الحفظ — لا صمتَ ولا خطأ منصّةٍ عارٍ */
        logEv('error', 'img-failed', { rid: env.__rid, p: path, st: 500, err: errMsg(eIM) }); return json({ ok: 0, err: 'img-failed', rid: env.__rid }, 500);   /* KIVO_259 · SR-6 */
       }
      }

      return json({ ok: 0, err: 'not-found' }, 404);
    }

    /* ═══ صفحة المنصة: تقديم index.html مع حقن __BS_BOOT ═══
       حارسٌ أول: ما ليس صفحة المنصة (أيقونة · ملف ثابت · مسار غير موجود) يُخدَم من
       الملفات مباشرة بلا قاعدة ولا حقن. كان ردّ ٤٠٤ من Pages نوعه text/html فيمرّ
       من مسار الحقن الكامل، فتُقرأ القاعدة كلها لأجل أيقونةٍ غير موجودة. */
    if (path !== '/' && path !== '/index.html') return await env.ASSETS.fetch(request);
    var res = await env.ASSETS.fetch(request);
    var ct = res.headers.get('Content-Type') || '';
    if (!res.ok || ct.indexOf('text/html') < 0) return res;

    await initDb(env);
    env = await preAttach(env, request, 'shell');   /* KIVO_255 · AUD-037: الغلافُ بجلسة — السياسةُ والإنفاذُ والجلسةُ والمراجعاتُ في جولةٍ واحدة (kv كلُّها تُجلب بجولةٍ واحدة أصلاً) */
    await loadPolicy(env);
    var enfUA = false;
    if (enfEnvOn(env)) { var ENFP = await enfModeOf(env); enfUA = ENFP.mode === 'unavailable'; env = Object.assign({}, env, { __enfm: ENFP, __enf: ENFP.mode === 'enforce' ? ENFP : null }); }   /* KIVO_243 · KIVO_244 ADR-003 */
    if (enfUA) { try { var rmUA = reqMeta(request); await secLog(env, { act: 'authz_unavailable', detail: 'GET /', ip: rmUA.ip, city: rmUA.city, dev: rmUA.dev }); } catch (eUA) { swallow('unavailable-seclog', eUA, env.__rid); } }
    var s3 = enfUA ? null : await session(env, request);   /* وضعُ الحماية: لا جلسةَ ولا بيانات — شاشةُ الدخول مع الإشعار (boot.authz = 'unavailable') */
    var boot;
    /* معاينة شاشة الدخول (داخل إطار في مدير النظام ← المنصة): تُقدَّم كزائر بلا بيانات مهما كانت الجلسة */
    if (url.searchParams.get('bsPreview') === 'login') s3 = null;
    if (s3) {
      /* مسجّل دخول: البيانات كلها تُحقن في نفس الاستجابة — كخادم الجهاز */
      var keys = await kvAll(env, 'kv');
      for (var retiredNf in keys) if (nfLegacyKey(retiredNf)) delete keys[retiredNf];
      for (var retiredCu in keys) if (cuLegacyKey(retiredCu)) delete keys[retiredCu];
      for (var retiredDs in keys) if (resName(retiredDs) === K_DSTATS) delete keys[retiredDs];
      for (var dk in keys) if (isDeviceKey(dk)) delete keys[dk];
      if (keys[K_USERS] != null) keys[K_USERS] = stripPh(keys[K_USERS]);
      /* نطاق القراءة: كلٌّ يحمل بيانات إدارته (ومدير النظام الكل) — لا تُحقن إدارات الغير */
      var AB = actorFromKeys(keys, s3.uid) || await actorOf(env, s3.uid);
      if (AB && env.__enf) { AB.enf = env.__enf; if (!AB.__grants) enfAttachGrantsKeys(AB, keys); }   /* KIVO_243 */
      if (!AB) {
        /* جلسةٌ حيّة لحسابٍ حُذف أو جُمّد: لا فاعل ⇒ لا بيانات. وكان الشرط
           «if (AB && !canRead(...))» يُسقط التصفية كلها عند غياب الفاعل فتُحقن
           القاعدة كاملةً في صفحةِ من لا حساب له — كوكي صالح وحساب محذوف. */
        var usZ = await usersList(env);
        boot = { srv: 1, cf: 1, auth: 'need', fresh: isVirgin(usZ) ? 1 : 0, keys: {}, brand: brandPublic(await platGet(env)), rk: (await metaGet(env, 'rk')) ? 1 : 0 };
      } else {
      if (keys[K_USERS] != null) keys[K_USERS] = usersNoOut(keys[K_USERS], AB);   /* KIVO_259 · SR-1: الرقمُ الوظيفي (كلمةُ المرور الأولى للمديرين) لصاحبه ولمدير النظام وحدهما */
      /* الفحصُ العميق 2026-10-21 (R4 · IRSZ-3 · DG-07 · AUX-14): والقائمةُ نفسُها بأقلّ امتياز — لا هويةَ ولا جوالَ ولا حسابَ لموظفي غير نطاقه (054 usersScopeOut) */
      if (keys[K_USERS] != null) keys[K_USERS] = usersScopeOut(keys[K_USERS], AB);
      var rvB = await revsAll(env), revsOut = {}, pv4rb = pv4ReadBudget();
      var enfRB = AB.enf ? await enfRefsFor(env, enfDeptsOf(AB), keys) : null;
      for (var bk in keys) {
        var okB = canRead(AB, bk);
        /* D4‑01 (v24.5): ظلُّ نطاق القراءة — بعد الحكم، على القيمة كما ستُحقن أو كما كانت ستُحذف؛ لا يمسّ keys ولا الحكم */
        try { if (!AB.enf) permv4Read(AB, bk, keys[bk], okB, 'boot', pv4rb, keys); } catch (e4rb) { swallow('permv4-read-boot', e4rb, env.__rid); }
        if (!okB) { delete keys[bk]; continue; }
        if (AB.enf) { try { keys[bk] = enfProjectStr(AB, bk, keys[bk], enfRB); } catch (eBP) { delete keys[bk]; continue; } }
        revsOut[bk] = rvB[bk] || 0;
      }
      boot = { srv: 1, cf: 1, v: await curRev(env), uid: s3.uid, keys: keys, revs: revsOut, rk: (await metaGet(env, 'rk')) ? 1 : 0 };
      if (AB.enf) boot.authz = enfMe(AB, enfRB);                                     /* KIVO_243: المفاتيحُ المحمولة لكل إدارة · العدسات · النطاق */
      if (keys[K_USERS] != null) { var usB = usersLensFp(AB); if (usB) boot.uscope = usB; }   /* مراجعةُ التكامل W1-R1: بصمةُ عدسة القائمة المحقونة (054 usersLensFp) */
      }
    } else {
      /* زائر بلا جلسة: لا بيانات — شاشة الدخول تعمل في رملٍ مؤقت */
      var usX = await usersList(env);
      boot = { srv: 1, cf: 1, auth: 'need', fresh: isVirgin(usX) ? 1 : 0, keys: {}, brand: brandPublic(await platGet(env)), rk: (await metaGet(env, 'rk')) ? 1 : 0 };
      if (enfUA) { boot.authz = 'unavailable'; boot.notice = ENF_UNAVAIL_MSG; }   /* KIVO_244 · ADR-003 */
    }
    /* الحقن بالبثّ: HTMLRewriter محرّكٌ أصليّ يمرّ على البايتات مروراً ولا يبني نصاً
       جديداً — فيسقط أثقل ثلاث عمليات كانت في الطلب: فكّ ترميز ٢.٥ مليون حرف،
       والاستبدال على النصّ كاملاً، وإعادة ترميزه. والعلامة <!--BS_BOOT--> تُستبدل
       في موضعها نفسه فلا يتغيّر ترتيب تعريف __BS_BOOT عمّا كان. */
    var bootJs = redactPh(JSON.stringify(boot), 'boot').replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    var hdrH = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
    /* احتياطٌ لبيئةٍ بلا HTMLRewriter (اختبارٌ محليّ مثلاً): السلوك القديم حرفاً بحرف.
       ويُفحص قبل تمرير الجسم، إذ لا يُقرأ جسمُ استجابةٍ مرّتين. */
    var nonceH = env.__nonce || '';   /* KIVO_253 · AUD-005 خطوة ٢ */
    if (typeof HTMLRewriter === 'undefined') return new Response(inject(await res.text(), boot, nonceH), { status: res.status, headers: hdrH });
    var out = new Response(res.body, { status: res.status, headers: hdrH });
    return new HTMLRewriter().on('meta[http-equiv="Content-Security-Policy"]', {
      element: function (el) { el.setAttribute('content', cspMeta(nonceH)); }
    }).onDocument({
      comments: function (c) {
        if (c.text === 'BS_BOOT') c.replace('<script' + (nonceH ? ' nonce="' + nonceH + '"' : '') + '>window.__BS_BOOT=' + bootJs + ';</script>\n<!--BS_BOOT-->', { html: true });
      }
    }).transform(out);

    } catch (eF) {
      var guardFault=dbGuardFailure(eF);if(guardFault){logEv('error',guardFault.err,{rid:env.__rid,p:path,st:guardFault.status});if(path.indexOf('/api/')===0)return json({ok:0,err:guardFault.err},guardFault.status);if(isShellPath(path))return shellDown(env.__rid);}
      /* درع الأعطال الأخير: واجهة الخادم تجيب بعلّتها بدل صفحة انهيار.
         KIVO_264 · C3: وصفحةُ المنصة (/ · /index.html) لا تُقدَّم بلا حقن بعد اليوم (كانت «وضعَ المتصفح» = النظامَ المحلي القديم: fail-open) —
         صفحةُ 503 بلا غلاف. ما سواها لا يمسّ القاعدة أصلاً (الأصولُ تُخدم قبل أيّ قراءة) فيبقى كما كان. */
      logEv('error', 'worker-error', { rid: env.__rid, m: request.method, p: path, st: 500, err: errMsg(eF), stack: String((eF && eF.stack) || '').split('\n').slice(1, 4).join(' | ').slice(0, 300) });   /* KIVO_250 · SOT-142 */
      if(path.indexOf('/api/')===0 && /KIVO_RESTORE_EPOCH/.test(String(eF && eF.message || eF)))return json({ok:0,err:'restore-epoch-changed'},409);
      if (path.indexOf('/api/') === 0)
        return json({ ok: 0, err: 'worker-error', rid: env.__rid }, 500);   /* KIVO_259 · SR-6 */
      if (isShellPath(path)) return shellDown(env.__rid);
      try { return await env.ASSETS.fetch(request); } catch (e2) { logEv('error', 'assets-error', { rid: env.__rid, p: path, err: errMsg(e2) }); return new Response('خلل مؤقت — أعد المحاولة', { status: 500 }); }
    }
  }
};
