/* ══ (6) الواجهات: حالةُ الإنفاذ · سجلُّ القرارات · الترحيلُ والرجوع (هوية → نطاق → صلاحيات) · جلسةُ اختبارٍ داخلية (Preview) ══ */
var REG_VALIDATION = null;   /* V7 · د5-هـ (44): تحقّقُ السجلّ مرّةً لكل نسخةٍ من الخادم (تقريرُ /api/permv2) */
/* ما يُرسل للواجهة عن فاعلٍ: المفاتيحُ المحمولة لكل إدارة (bitset على ترتيب السجل) · العدساتُ المفعّلة · مفاتيحُ المنح الصريح
   (RISHAD-266: ceil · me · sb — سقفُ النطاق القديم ونطاقُ الفاعل فيه وورديتُه المربوطة — أُزيلت مع تقاعده؛ لم تقرأها الواجهة) */
function enfBits(A, d) {
  var ix = enfIx(), n = ix.order.length, bytes = new Uint8Array(Math.ceil(n / 8)), i, s = '';
  for (i = 0; i < n; i++) if (enfHeld(A, d, ix.order[i])) bytes[i >> 3] |= (1 << (i & 7));
  for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function enfDeptsOf(A) {
  var u = A.u, out = [], i;
  if (u.role === 'super' || u.role === 'gm') { for (i = 0; i < (A.depts || []).length; i++) { var d = A.depts[i] && A.depts[i].id; if (d && deptInScope(A, d)) out.push(d); } }
  else {
    if (u.deptId) out.push(u.deptId);
    for (i = 0; i < (A.depts || []).length; i++) { var s9 = A.depts[i] && A.depts[i].id; if (s9 && s9 !== u.deptId && secMgrOf(A, s9)) out.push(s9); }   /* F01: أقسامُ إدارته */
  }
  return out;
}
function enfMe(A, refs) {
  var ds = enfDeptsOf(A), out = { ver: ENF_VER, mode: 'enforce', n: enfIx().order.length, perm: enfPermMigrated(A), depts: {} }, i, L;
  for (i = 0; i < ds.length; i++) {
    var d = ds[i], lens = [];
    for (var li = 0; li < KIVO_LENS_PLUGINS.keys.length; li++) { L = KIVO_LENS_PLUGINS.keys[li]; if (KIVO_BUILD.lensGate(A.perms, A.u, d, L).on) lens.push(L); }   /* KIVO_259 · AUD-030: العدساتُ من الإضافات (الترتيبُ نفسُه) */
    /* p: مفاتيحُ المنح الصريح (plus) المحمولة فعلاً — لتُضاف أفعالُها إلى الواجهة (الورقةُ القديمة لا تعرفها) */
    var gr = A.__grants && A.__grants[d] && A.u.ekey ? A.__grants[d].emp[A.u.ekey] : null, plus = [];
    if (isObj(gr) && Array.isArray(gr.plus)) gr.plus.forEach(function (k) { k = String(k); if (enfHeld(A, d, k) && plus.indexOf(k) === -1) plus.push(k); });
    out.depts[d] = { h: enfBits(A, d), lens: lens, p: plus };
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
  var now = opts.now || Date.now(), T = dsToday(now), reference = opts.reference,
    capture = reference ? reference.operational : await opCaptureReferences(env, await kvAll(env, 'kv')),
    keys = reference ? reference.inputKeys : capture.keys,
    revs = reference ? reference.inputRevs : Object.assign({},await revsAll(env),capture.revs), i, d;
  if (capture.guards.length) await env.DB.batch(capture.guards);
  if (opts.parts && opts.parts.indexOf('scope-retire') !== -1) return await enfRetirePlan(env, seed, now, T, keys, revs, capture, reference);
  if (opts.parts && opts.parts.indexOf(ENF_SID_PART) !== -1) return await enfSidPlan(env, seed, now, T, keys, revs, capture);   /* د5-هـ */
  if (opts.parts && opts.parts.indexOf(ENF_ROLES_PART) !== -1) return await enfRolesPlan(env, seed, now, T, keys, revs, capture);   /* د5-هـ (44) */
  var users = parseJson(keys[K_USERS], []);
  if (!Array.isArray(users)) users = [];
  var plan = { version: ENF_VER, seed: seed, today: T, generated: now, writes: [], identity: null, perm: { grants: [], decisions: [] }, warnings: [] };
  var W = {};                                                                  /* k → قيمةٌ جديدة (نصّ) */
  /* (١) الهوية — RISHAD-266 P6: بروفةُ ترحيل الهوية القديمة وتمهيدُها (011/012/015/016) حُذفا؛ plan.identity يبقى null للتوافق في الشكل */
  /* (٢) النطاق — RISHAD-266: بذرُ سقف النطاق القديم (bassam_scope_v1) أُزيل مع تقاعده؛ حذفُ ما بقي منه خطوةُ «scope-retire» (enfRetirePlan) */
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
  var parts = opts.parts || ['perm'];
  var ks = Object.keys(W).sort(), sig = [];
  for (i = 0; i < ks.length; i++) { if (parts.indexOf(W[ks[i]].kind) === -1) continue; plan.writes.push({ k: ks[i], kind: W[ks[i]].kind, bytes: W[ks[i]].v.length, existed: keys[ks[i]] != null, rev: revs[ks[i]] || 0 }); sig.push(ks[i] + '\u0001' + (revs[ks[i]] || 0) + '\u0001' + W[ks[i]].v); }
  plan.hash = await enfSha(sig.join('\u0002'));
  plan.parts = parts; plan.inferableOptIn = !!opts.inferable;
  plan.counts = { writes: plan.writes.length, identityKeys: plan.writes.filter(function (w) { return w.kind === 'identity'; }).length, grants: plan.perm.grants.length, permDecisions: plan.perm.decisions.length };
  return { plan: plan, W: W, keys: keys, revs: revs, guards:capture.guards, snapshots:capture.snapshots };
}
/* RISHAD-266 · «scope-retire»: تقاعدُ بيانات سقف النطاق القديم — كلُّ مفتاح kv بصيغة bsdept:%:bassam_scope_v1 وعلامةُ meta.authz_scope_mig.
   الخطةُ حتمية (البذرة · لحظةُ التوليد · القيم ونسخُها) وبصمتُها تشمل القيمَ والعلامة — فأيُّ تغيّرٍ بين الخطة والتطبيق ⇒ plan-changed.
   التطبيقُ (enfMigrateApi · apply): لقطةٌ كاملة في authz_snaps/authz_snap (والعلامةُ في meta اللقطة) ثم الحذفُ ورفعُ النسخ في دفعةٍ واحدةٍ محروسة؛
   والرجوعُ بالمسار القائم (rollback) يعيد المفاتيحَ وقيمَها والعلامةَ كما كانت. لا يمسّ مفتاحاً غيرَها. */
var ENF_RETIRE_PART = 'scope-retire', ENF_RETIRE_META = 'authz_scope_mig', ENF_RETIRE_SUFFIX = ':' + ENF_SCOPE_RES;
function enfRetireKey(k) { k = String(k); return k.indexOf('bsdept:') === 0 && k.length > 7 + ENF_RETIRE_SUFFIX.length && k.slice(-ENF_RETIRE_SUFFIX.length) === ENF_RETIRE_SUFFIX; }
async function enfRetirePlan(env, seed, now, T, keys, revs, capture, reference) {
  var mv = reference ? (Object.prototype.hasOwnProperty.call(reference.inputMeta, ENF_RETIRE_META) ? reference.inputMeta[ENF_RETIRE_META] : null)
    : await metaGet(env, ENF_RETIRE_META);
  var ks = Object.keys(keys).filter(enfRetireKey).sort(), W = {}, sig = [ENF_RETIRE_PART, seed], i;
  var plan = { version: ENF_VER, seed: seed, today: T, generated: now, parts: [ENF_RETIRE_PART], writes: [], retire: { keys: ks.slice(0, 200), meta: mv != null } };
  for (i = 0; i < ks.length; i++) {
    W[ks[i]] = { v: null, kind: ENF_RETIRE_PART };
    plan.writes.push({ k: ks[i], kind: ENF_RETIRE_PART, op: 'delete', bytes: String(keys[ks[i]]).length, existed: true, rev: revs[ks[i]] || 0 });
    sig.push(ks[i] + '\u0001' + (revs[ks[i]] || 0) + '\u0001' + keys[ks[i]]);
  }
  sig.push('meta:' + ENF_RETIRE_META + '\u0001' + (mv == null ? '\u0000' : String(mv)));
  plan.hash = await enfSha(sig.join('\u0002'));
  plan.counts = { writes: ks.length, scopeRecords: ks.length, metaFlag: mv != null ? 1 : 0 };
  return { plan: plan, W: W, keys: keys, revs: revs, guards: capture.guards, snapshots: capture.snapshots, retireMeta: mv };
}
/* أجزاءُ الترحيل المقبولة: perm (الهوية حُذفت · RISHAD-266 P6) — و«scope-retire» وحدها لا تُخلط بغيرها (scope: بذرُ السقف القديم أُزيل · RISHAD-266) */
function enfMigParts(raw) {
  var p = raw.filter(function (x) { return x === 'perm' || x === ENF_RETIRE_PART || x === ENF_SID_PART || x === ENF_ROLES_PART; });
  if ((p.indexOf(ENF_RETIRE_PART) !== -1 || p.indexOf(ENF_SID_PART) !== -1 || p.indexOf(ENF_ROLES_PART) !== -1) && p.length > 1) return null;   /* د5-هـ: «site-sid» و«perm44-roles» وحدها كذلك */
  return p;
}
/* V7 · د5-هـ (م3) · «site-sid»: ترحيلُ هوية الموقع — كلُّ طابقٍ في الجولات ولقطةِ الشهر يحمل sid طابقه في الخطة، فتُطابَق الجولاتُ بالمعرّف لا بالموضع.
   مجموعةُ الكتابة من KIVO_IDENTITY_MIGRATION.sidMigration (الطبقةُ المؤكدة وحدها: exact · high · assign)؛ medium وambiguous وunlinked تُبلَّغ ولا تُكتب.
   المسارُ نفسُه: الخطةُ حتمية (البذرة · لحظةُ التوليد · القيم ونسخُها) فتغيّرٌ بينها وبين التطبيق ⇒ plan-changed؛ لقطةٌ كاملة قبل الكتابة،
   والرجوعُ بالمسار القائم (rollback). الثانيةُ على بياناتٍ مرحَّلة بلا كتابة (applied:0). مُدخلُ البروفة واحدٌ لها وللبروفة (/api/identity-rehearsal). */
var ENF_SID_PART = 'site-sid';
function enfIdentInput(keysR) {
  var byDeptR = {}, deptsR = parseJson(keysR[K_DEPTS], []), usersR = parseJson(keysR[K_USERS], []), dri;
  if (!Array.isArray(deptsR)) deptsR = []; if (!Array.isArray(usersR)) usersR = [];
  for (dri = 0; dri < deptsR.length; dri++) { var dIdR = deptsR[dri] && deptsR[dri].id; if (!dIdR) continue; var preR = 'bsdept:' + dIdR + ':';
    byDeptR[dIdR] = { plan: parseJson(keysR[preR + 'bassam_plan_v1'], null), rounds: parseJson(keysR[preR + 'bassam_rounds_v1'], null), employees: parseJson(keysR[preR + 'bassam_employees_v1'], []) }; }
  var rawR = {}; Object.keys(keysR).forEach(function (kk) { if (/^bsdept:[^:]+:bassam_(plan|rounds)_v1$/.test(kk)) rawR[kk] = keysR[kk]; });
  return { depts: deptsR, users: usersR, byDept: byDeptR, raw: rawR };
}
async function enfSidPlan(env, seed, now, T, keys, revs, capture) {
  var I = enfIdentInput(keys), W = {}, sig = [ENF_SID_PART, seed];
  var M = KIVO_IDENTITY_MIGRATION.sidMigration({ depts: I.depts, users: I.users, byDept: I.byDept }, { seed: seed, seedSource: 'authz-migrate', now: now, today: T, raw: I.raw, revs: revs });
  var plan = { version: ENF_VER, seed: seed, today: T, generated: now, parts: [ENF_SID_PART], writes: [],
    sid: { hash: M.hash, ops: M.ops, rows: M.rows.slice(0, 500), pending: M.pending.slice(0, 200), gates: M.gates } };
  M.keys.forEach(function (k) { var v = JSON.stringify(k.after); W[k.key] = { v: v, kind: ENF_SID_PART };
    plan.writes.push({ k: k.key, kind: ENF_SID_PART, bytes: v.length, existed: true, rev: revs[k.key] || 0, ops: k.ops.length });
    sig.push(k.key + '\u0001' + (revs[k.key] || 0) + '\u0001' + v); });
  plan.hash = await enfSha(sig.join('\u0002'));
  plan.counts = { writes: plan.writes.length, sidOps: M.ops, pending: M.pending.length, rollbackVerified: !!M.rollbackVerified };
  return { plan: plan, W: W, keys: keys, revs: revs, guards: capture.guards, snapshots: capture.snapshots };
}
/* V7 · د5-هـ (44) · «perm44-roles»: ترحيلٌ لمرّةٍ واحدة من قوالب الصلاحيات (bsdept:<d>:bassam_perm_tpls_v1 · الإسنادُ bassam_perms_v1.tplOf[d][ekey])
   إلى أدوار الإدارة (bsdept:<d>:bassam_roles_v1 = { v:1, roles:[{ id, name, desc, sup, sys:{ <نظام>: { lvl:'custom', keys:[…] } } }], people:{ <ekey>: { role, ex:[] } } }).
   كلُّ قالبٍ دورٌ بمعرّفه واسمه؛ مفاتيحُه keys24 إن وُجدت وإلا ترجمةُ ورقته (KIVO_REGISTRY.translate) — مقسومةً على الأنظمة بمالك المفتاح (owner قبل «/»)
   ومستواها «مخصّص»؛ والإشرافيُّ sup = tp.sup صراحةً، وإلا الاستنتاجُ القديم من الاسم (رئيس|نائب|إداري|مراقب) — لمرّةٍ واحدة هنا فلا استنتاجَ وقتَ التشغيل.
   كلُّ إسنادٍ tplOf لقالبٍ موجود يصير دورَ الشخص. ما في سجلّ الأدوار من قبل يبقى كما هو (دورٌ بالمعرّف نفسه · شخصٌ له دور) — فالثانيةُ بلا كتابة.
   لا يمسّ المنحَ ولا السقفَ ولا القوالبَ نفسَها (القرارُ النافذ لا يتغيّر)؛ عدساتُ القالب لا مقابلَ لها في الدور فتُبلَّغ ولا تُكتب.
   المسارُ نفسُه: خطةٌ حتمية · لقطةٌ كاملة قبل الكتابة · رجوعٌ بالمسار القائم (rollback). */
var ENF_ROLES_PART = 'perm44-roles', ENF_ROLES_RES = 'bassam_roles_v1', ENF_ROLES_SUP_RX = /رئيس|نائب|إداري|اداري|مراقب/;
function enfRolesFromTpls(tpls, tplOf, prev) {
  var R = KIVO_REGISTRY, rec = isObj(prev) ? JSON.parse(JSON.stringify(prev)) : { v: 1, roles: [], people: {} }, have = {}, rep = { roles: 0, people: 0, lensDropped: 0, unknownTpl: 0 }, i;
  if (!Array.isArray(rec.roles)) rec.roles = []; if (!isObj(rec.people)) rec.people = {}; rec.v = 1;
  rec.roles.forEach(function (r) { if (r && r.id) have[r.id] = 1; });
  var ids = {};
  for (i = 0; i < (Array.isArray(tpls) ? tpls : []).length; i++) {
    var tp = tpls[i]; if (!isObj(tp) || !tp.id || typeof tp.id !== 'string') continue;
    ids[tp.id] = 1; if (have[tp.id]) continue;
    var ks = Array.isArray(tp.keys24) ? tp.keys24.map(String) : Object.keys(R.translate(isObj(tp.perms) ? tp.perms : {}).keys), sys = {};
    ks.filter(function (k, n, a) { return a.indexOf(k) === n && R.byKey[k]; }).sort().forEach(function (k) {
      var s = String(R.byKey[k].owner || '').split('/')[0]; if (!s) return;
      (sys[s] = sys[s] || { lvl: 'custom', keys: [] }).keys.push(k);
    });
    var nm = String(tp.name || '').trim() || tp.id;
    rec.roles.push({ id: tp.id, name: nm, desc: '', sup: tp.sup === true || (tp.sup !== false && ENF_ROLES_SUP_RX.test(nm)), sys: sys });
    have[tp.id] = 1; rep.roles++;
    if (Array.isArray(tp.lens) && tp.lens.length) rep.lensDropped++;
  }
  Object.keys(isObj(tplOf) ? tplOf : {}).sort().forEach(function (ek) {
    var tid = tplOf[ek]; if (typeof tid !== 'string' || !tid) return;
    if (!ids[tid]) { rep.unknownTpl++; return; }
    var p = rec.people[ek]; if (isObj(p) && p.role) return;
    rec.people[ek] = { role: tid, ex: isObj(p) && Array.isArray(p.ex) ? p.ex : [] }; rep.people++;
  });
  return { rec: rec, rep: rep };
}
async function enfRolesPlan(env, seed, now, T, keys, revs, capture) {
  var W = {}, sig = [ENF_ROLES_PART, seed], perms = parseJson(keys[K_PERM], {}) || {}, tplOfAll = isObj(perms.tplOf) ? perms.tplOf : {}, ds = {}, i;
  (parseJson(keys[K_DEPTS], []) || []).forEach(function (d) { if (d && d.id) ds[d.id] = 1; });
  Object.keys(keys).forEach(function (k) { var m = /^bsdept:([^:]+):bassam_perm_tpls_v1$/.exec(k); if (m) ds[m[1]] = 1; });
  var plan = { version: ENF_VER, seed: seed, today: T, generated: now, parts: [ENF_ROLES_PART], writes: [], roles: [] }, tot = { roles: 0, people: 0, lensDropped: 0, unknownTpl: 0 };
  Object.keys(ds).sort().forEach(function (d) {
    var tk = 'bsdept:' + d + ':bassam_perm_tpls_v1', rk = 'bsdept:' + d + ':' + ENF_ROLES_RES, tpls = parseJson(keys[tk], []), prev = parseJson(keys[rk], null);
    if (!Array.isArray(tpls) || !tpls.length) return;
    var X = enfRolesFromTpls(tpls, tplOfAll[d], prev), v = JSON.stringify(X.rec);
    for (var q in tot) tot[q] += X.rep[q];
    if (!X.rep.roles && !X.rep.people) return;
    W[rk] = { v: v, kind: ENF_ROLES_PART };
    plan.writes.push({ k: rk, kind: ENF_ROLES_PART, bytes: v.length, existed: keys[rk] != null, rev: revs[rk] || 0 });
    plan.roles.push({ dept: d, roles: X.rep.roles, people: X.rep.people, lensDropped: X.rep.lensDropped, unknownTpl: X.rep.unknownTpl });
    sig.push(rk + '\u0001' + (revs[rk] || 0) + '\u0001' + v);
  });
  for (i = 0; i < plan.writes.length; i++) { var tk2 = plan.writes[i].k.replace(':' + ENF_ROLES_RES, ':bassam_perm_tpls_v1'); sig.push(tk2 + '\u0001' + (revs[tk2] || 0)); }
  sig.push(K_PERM + '\u0001' + (revs[K_PERM] || 0));
  plan.hash = await enfSha(sig.join('\u0002'));
  plan.counts = { writes: plan.writes.length, roles: tot.roles, people: tot.people, lensDropped: tot.lensDropped, unknownTpl: tot.unknownTpl };
  return { plan: plan, W: W, keys: keys, revs: revs, guards: capture.guards, snapshots: capture.snapshots };
}
var ENF_PARTS_MIXED = { ok: 0, err: 'parts-mixed', msg: 'خطواتُ تقاعد سقف النطاق القديم (scope-retire) وترحيل هوية الموقع (site-sid) وترحيل القوالب إلى الأدوار (perm44-roles) تُطلب كلٌّ منها وحدها — أعد الطلب بها فقط، ثم اطلب أجزاء الترحيل الأخرى في طلب منفصل' };
/* Pure revision preparation: allocation is written only after every source
   witness, inside the same batch as migration/snapshot/audit or rollback. */
async function enfMigCounterPlan(env) {
  var out = await env.DB.batch([
      env.DB.prepare("SELECT k,v FROM meta WHERE k='rev'"),
      env.DB.prepare('SELECT COALESCE(MAX(rev),0)n FROM revs')
    ]), rows = out[0].results || [], highest = (out[1].results || [])[0],
    current = rows.length ? Number(rows[0].v) : 0, max = highest && Number(highest.n);
  if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(max) || max < 0 || !Number.isSafeInteger(Math.max(current,max)+1))
    throw rsError('domain-revision',503);
  var rev = Math.max(current,max)+1;
  return {
    rev:rev,
    guards:rsWitness(env,'meta',['k','v'],rows,"k='rev'").concat([
      env.DB.prepare("SELECT CASE WHEN COALESCE((SELECT MAX(rev)FROM revs),0) IS NOT ?1 THEN json_extract('{}','KIVO_REV_CONFLICT')END").bind(max)
    ]),
    statement:env.DB.prepare("INSERT INTO meta(k,v)VALUES('rev',?1)ON CONFLICT(k)DO UPDATE SET v=excluded.v").bind(String(rev))
  };
}
function enfMigReferenceGuards(env, reference) {
  return rsReferenceGuards(env, reference, true);
}
async function enfMigBatch(env, statements) {
  try { await env.DB.batch(statements); return null; }
  catch(error) {
    if(/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_RESTORE_EPOCH/.test(String(error)))
      return json({ok:0,err:'conflict'},409);
    throw error;
  }
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
    var parts = enfMigParts(String(q.get('parts') || 'perm').split(','));
    if (!parts) return json(ENF_PARTS_MIXED, 400);
    var r = await enfMigPlan(env, seed, { inferable: q.get('inferable') === '1', parts: parts });
    return json({ ok: 1, plan: r.plan });
  }
  if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
  var now = Date.now(), ident = { uid: A.u.id, un: String(A.u.un || ''), ip: meta.ip || '', dev: meta.dev || '', city: meta.city || '' };
  if (act === 'apply') {
    if (!/^[0-9a-f]{64}$/i.test(String(b.seed || '')) || !/^[0-9a-f]{64}$/.test(String(b.hash || ''))) return json({ ok: 0, err: 'seed-hash' }, 400);
    var gen = +b.generated; if (!(gen > 0) || gen > now || now - gen > 24 * 3600 * 1000) return json({ ok: 0, err: 'generated' }, 400);   /* لحظةُ الخطة: خلال 24 ساعة */
    var parts2 = Array.isArray(b.parts) ? enfMigParts(b.parts) : ['perm'];
    if (!parts2) return json(ENF_PARTS_MIXED, 400);
    var retire2 = parts2.indexOf(ENF_RETIRE_PART) !== -1;
    var reference2 = await rsReferenceSnapshot(env,A.u.id);
    env = reference2.env; A = reference2.A;
    if(A.u.role !== 'super')return json({ok:0,err:'forbidden'},403);
    var R2 = await enfMigPlan(env, String(b.seed).toLowerCase(), { inferable: !!b.inferable, parts: parts2, now: gen, reference:reference2 });
    if (R2.plan.hash !== b.hash) return json({ ok: 0, err: 'plan-changed', hash: R2.plan.hash }, 409);
    if (!R2.plan.writes.length && !(retire2 && R2.retireMeta != null)) return json({ ok: 1, applied: 0, plan: R2.plan.counts });
    if (retire2 && R2.retireMeta != null && String(R2.retireMeta).length > 2000) return json({ ok: 0, err: 'retire-meta-large', msg: 'علامة authz_scope_mig أطول من أن تُحفظ في اللقطة — لم يُحذف شيء؛ راجع قيمتها في جدول meta قبل إعادة المحاولة' }, 409);
    var counter2 = await enfMigCounterPlan(env), rev = counter2.rev,
      guards2 = enfMigReferenceGuards(env,reference2).concat(counter2.guards), st2 = [], i;
    var snap = enfSnapId('migration'), items = R2.plan.writes.map(function (w) { return { k: w.k, cur: R2.keys[w.k] == null ? null : R2.keys[w.k] }; });
    var snapMeta = { hash: b.hash, parts: parts2, inferable: !!b.inferable, counts: R2.plan.counts, rev: rev, generated: gen };
    if (retire2) snapMeta.retire = { meta: ENF_RETIRE_META, v: R2.retireMeta == null ? null : String(R2.retireMeta) };   /* تعيدها rollback */
    var st = enfSnapStmts(env, snap, 'migration', A, items, R2.revs, snapMeta);
    for (i = 0; i < R2.plan.writes.length; i++) {
      var w = R2.plan.writes[i];
      if (R2.W[w.k].v === null) {   /* scope-retire: حذفٌ (المفتاحُ ليس مورداً تشغيلياً) */
        guards2.push(revGuard(env, w.k, w.rev));
        st2.push(env.DB.prepare('DELETE FROM kv WHERE k = ?1').bind(w.k));
      }else if(opIsResource(w.k)){
        var add2=await opChangeStatements(env,w.k,R2.W[w.k].v,{base:w.rev});
        guards2.push.apply(guards2,add2.guards);st2.push.apply(st2,add2.statements);
      }else{
        guards2.push(revGuard(env,w.k,w.rev));
        st2 = st2.concat(kvPutStmts(env, 'kv', w.k, R2.W[w.k].v));
      }
      st2.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').bind(w.k, rev));
      st2.push(audEvStmt(env, { cid: 'mig_' + snap.slice(-12) + '_' + i, ts: now, uid: ident.uid, un: ident.un, dept: parseKey(w.k).dept || '', k: w.k, rev: rev, etype: 'dataset', eid: resName(w.k), ename: resName(w.k), act: 'migrated', ctx: JSON.stringify({ kind: w.kind, snap: snap }), bef: '', aft: '', ip: ident.ip, dev: ident.dev, city: ident.city }));
    }
    var flag = JSON.stringify({ applied: true, at: now, by: ident.uid, snap: snap, hash: b.hash, inferable: !!b.inferable });   /* المعرّفُ لا اسمُ المستخدم */
    if (retire2 && R2.retireMeta != null) st2.push(env.DB.prepare('DELETE FROM meta WHERE k = ?1').bind(ENF_RETIRE_META));
    if (!retire2 && parts2.length && parts2[0] !== ENF_ROLES_PART) st2.push(env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind(parts2[0] === ENF_SID_PART ? 'authz_id_mig' : 'authz_perm_mig', flag));   /* د5-هـ: علامةُ الهوية لـ«site-sid» */
    st2.push(enfLogStmt(env, { ts: now, uid: ident.uid, un: ident.un, role: 'super', k: 'authz-migrate', res: 'migration', keys: parts2.join(','), scope: 'writes=' + R2.plan.writes.length, decision: 'allow', why: 'apply', reason: snap, path: '/api/authz-migrate', ip: ident.ip }));
    var conflict2=await enfMigBatch(env,guards2.concat([counter2.statement],st,st2));
    if(conflict2)return conflict2;
    preOff(env);
    return json({ ok: 1, applied: R2.plan.writes.length, snap: snap, rev: rev, counts: R2.plan.counts });
  }
  if (act === 'rollback') {
    var sid = String(b.snap || ''); if (!/^[a-z]+_[a-z0-9]+_[a-z0-9]+$/.test(sid)) return json({ ok: 0, err: 'snap' }, 400);
    var reference3=await rsReferenceSnapshot(env,A.u.id);
    env=reference3.env;A=reference3.A;
    if(A.u.role!=='super')return json({ok:0,err:'forbidden'},403);
    var sm = await env.DB.prepare('SELECT snap, kind, restored, meta FROM authz_snaps WHERE snap = ?1').bind(sid).first();
    if (!sm) return json({ ok: 0, err: 'not-found' }, 404);
    /* This rollback only understands the existing KV snapshot kinds. Typed or
       future snapshots require the atomic domain restore planner, never this
       direct KV writer. force bypasses drift only, not a storage contract. */
    if (['migration', 'restore', 'replace'].indexOf(sm.kind) === -1) return json({ ok: 0, err: 'typed-kind-unsupported' }, 400);
    var rows = await env.DB.prepare('SELECT k, seq, existed, rev, v FROM authz_snap WHERE snap = ?1 ORDER BY k, seq').bind(sid).all();
    /* Reject the WHOLE snapshot before nextRev or any write, including a
       tombstone for a retired key: mixed rollback must not partially succeed. */
    if (((rows && rows.results) || []).some(function (r0) { return resName(r0.k) === K_DSTATS || nfLegacyKey(r0.k) || cuLegacyKey(r0.k) || (irLegacyKey(r0.k) || bdLegacyKey(r0.k)); })) return json({ ok: 0, err: 'domain-moved' }, 400);
    var byK = {}; ((rows && rows.results) || []).forEach(function (r0) { var o = byK[r0.k] = byK[r0.k] || { existed: r0.existed, v: '' }; if (r0.existed) o.v += r0.v; });
    /* الانجراف: مفتاحٌ تغيّر بعد العملية (رقمُ مراجعته ≠ رقمِ العملية) — الرجوعُ يمحو ما بعدها، فلا يُنفَّذ إلا بتأكيدٍ صريح (force) */
    var smMeta = parseJson(sm.meta, {}) || {}, opRev = +smMeta.rev || 0, drift = [], kk0;
    var revNow = reference3.inputRevs;
    for (kk0 in byK) if (!opRev || (revNow[kk0] || 0) !== opRev) drift.push({ k: kk0, rev: revNow[kk0] || 0 });
    if ((drift.length || sm.restored) && b.force !== true) return json({ ok: 0, err: sm.restored ? 'already-restored' : 'drift', opRev: opRev, drift: drift.slice(0, 50) }, 409);
    var counter3=await enfMigCounterPlan(env),rev2=counter3.rev,st3=[],n=0,kk,
      guards3=enfMigReferenceGuards(env,reference3).concat(counter3.guards)
        .concat(rsWitness(env,'authz_snaps',['snap','kind','restored','meta'],[sm],'snap=?1',[sid]))
        .concat(rsWitness(env,'authz_snap',['k','seq','existed','rev','v'],rows.results||[],'snap=?1',[sid]));
    for (kk in byK) {
      n++;
      if(opIsResource(kk)){
        var add3=await opChangeStatements(env,kk,byK[kk].existed?byK[kk].v:null,{base:revNow[kk]||0});
        guards3.push.apply(guards3,add3.guards);st3.push.apply(st3,add3.statements);
      }else{
        guards3.push(revGuard(env,kk,revNow[kk]||0));
        if (byK[kk].existed) st3 = st3.concat(kvPutStmts(env, 'kv', kk, byK[kk].v)); else st3.push(env.DB.prepare('DELETE FROM kv WHERE k = ?1').bind(kk));
      }
      st3.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').bind(kk, rev2));
      st3.push(audEvStmt(env, { cid: 'rb_' + sid.slice(-12) + '_' + n + '_' + rev2, ts: now, uid: ident.uid, un: ident.un, dept: parseKey(kk).dept || '', k: kk, rev: rev2, etype: 'dataset', eid: resName(kk), ename: resName(kk), act: 'rolled_back', ctx: JSON.stringify({ snap: sid }), bef: '', aft: '', ip: ident.ip, dev: ident.dev, city: ident.city }));
    }
    /* RISHAD-266: لقطةُ scope-retire تعيد علامةَ authz_scope_mig كما كانت */
    if (sm.kind === 'migration' && isObj(smMeta.retire) && smMeta.retire.meta === ENF_RETIRE_META && smMeta.retire.v != null)
      st3.push(env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind(ENF_RETIRE_META, String(smMeta.retire.v)));
    if (sm.kind === 'migration') {
      var flags = await env.DB.prepare("SELECT k, v FROM meta WHERE k IN ('authz_perm_mig', 'authz_scope_mig', 'authz_id_mig')").all();
      ((flags && flags.results) || []).forEach(function (f) { var fv = parseJson(f.v, null); if (fv && fv.snap === sid) st3.push(env.DB.prepare('DELETE FROM meta WHERE k = ?1').bind(f.k)); });
    }
    st3.push(env.DB.prepare('UPDATE authz_snaps SET restored = restored + 1, rts = ?2, ruid = ?3 WHERE snap = ?1').bind(sid, now, ident.uid));
    st3.push(enfLogStmt(env, { ts: now, uid: ident.uid, un: ident.un, role: 'super', k: 'authz-migrate', res: sm.kind, keys: 'rollback', scope: 'keys=' + n, decision: 'allow', why: 'rollback', reason: sid, path: '/api/authz-migrate', ip: ident.ip }));
    var conflict3=await enfMigBatch(env,guards3.concat([counter3.statement],st3));
    if(conflict3)return conflict3;
    preOff(env);
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
  if (url.pathname === '/api/demo-data') return await enfDemoApi(env, request, A);   /* V7 · د5-هـ (م6): بياناتُ العرض — الحرّاسُ أعلاه نفسُها */
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
/* ── V7 · د5-هـ (م6): بياناتُ عرضٍ تجريبية TEST_ONLY تملأ كلَّ نظامٍ حاضر وتُحذف بأمرٍ واحد يعيد القاعدةَ كما كانت ──
   POST /api/demo-data {act:'preview'|'seed'|'remove'|'status', reveal?, force?} — خلف حرّاس أداة الاختبار نفسِها (enfTestApi: الإنفاذ ∧ KIVO_TEST_FIXTURE=allow
   ∧ مضيفُ الاختبار ∧ مديرُ المنصة) وداخلَ منطقتها، فتنزعها tools/prod_strip.py من حزمة الإنتاج. المعرّفاتُ tst_demo_* والأسماءُ «TEST_ONLY · ».
   الزرع: شجرةُ إداراتٍ تجريبية (عامة · إدارتان · قسم) · حساباتٌ موسومة test:'TEST_ONLY' (كلماتُ مرورها تُولَّد هنا وتُعاد مرةً واحدة لمن طلبها) · موظفون ·
   ومحتوى كلِّ نظامٍ حاضر بكاتبه الحقيقي (قطعةُ demo.provide في مجلد النظام — النظامُ الغائب لا يقدّم شيئاً). قبل الكتابة وبعدها تُمسح الجداول
   (غيرُ السجلات) فيُحفظ بيانٌ (meta 'tst_demo_manifest'): الصفوفُ المضافة · القيمُ السابقة لما تغيّر · بصمةُ السجلات المشتركة قبل الدمج.
   الحذف: ما في البيان وحده، والسجلاتُ المشتركة تُعاد بنزع عناصر العرض ثم مطابقةِ بصمتها السابقة — انحرافٌ ⇒ رفضٌ إلا بـforce. */
var DEMO_PRE = 'tst_demo_', DEMO_GLOB = 'tst_demo_*', DEMO_KGLOB = 'bsdept:tst_demo_*', DEMO_TAG = 'TEST_ONLY · ', DEMO_MK = 'tst_demo_manifest';
/* السجلاتُ والأدلةُ والجلساتُ والعدّاداتُ الذاتية والصورُ خارج المقارنة (السجلاتُ قد تبقى بعد الحذف) */
var DEMO_SKIP = { aud: 1, audit: 1, sec: 1, authz: 1, authz_snap: 1, authz_snaps: 1, restore_operations: 1, restore_preimage: 1, restore_snapshot_manifest: 1,
  sess: 1, guard: 1, imgs: 1, imgown: 1, imgref: 1, d1_migrations: 1, sqlite_sequence: 1 };
var DEMO_SHARED = [K_USERS, K_DEPTS, K_GDEPTS, K_PERM];
var DEMO_PROVIDERS = [];
function demoProvide(p) { DEMO_PROVIDERS.push(p); }
function demoH(s) { s = String(s); var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c; for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'); }
function demoIsDemo(x) { return typeof x === 'string' && x.indexOf(DEMO_PRE) === 0; }
/* ── المسح: الجداولُ بأعمدتها ومفتاحها؛ «النطاق» = صفوفُ إدارات العرض (department_id · مفاتيحُ bsdept:tst_demo_*)، و«العام» = بقيةُ الجداول كاملةً ── */
async function demoTables(env) {
  var names = ((await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all()).results || [])
    .map(function (r) { return r.name; }).filter(function (n) { return !DEMO_SKIP[n] && /^[A-Za-z0-9_]+$/.test(n); });
  var info = await env.DB.batch(names.map(function (n) { return env.DB.prepare('PRAGMA table_info(' + n + ')'); }));
  return names.map(function (n, i) {
    var cols = (info[i].results || []).map(function (c) { return { name: c.name, pk: c.pk }; }), pk = cols.filter(function (c) { return c.pk > 0; }).sort(function (a, b) { return a.pk - b.pk; }).map(function (c) { return c.name; });
    var hasDept = cols.some(function (c) { return c.name === 'department_id'; });
    /* scoped: صفوفُ العرض وحدها · global: ما سواها كاملاً (لا يُمسح عامُّ جدولٍ ذي إدارة ولا kv — لا يكتب الزرعُ فيهما خارج نطاقه، والسجلاتُ المشتركة بالدمج) */
    var scoped = hasDept ? 'department_id GLOB ?1' : (n === 'kv' || n === 'revs') ? 'k GLOB ?1' : null, scopedArg = hasDept ? DEMO_GLOB : DEMO_KGLOB;
    var global = hasDept || n === 'kv' ? null : n === 'revs' ? 'NOT (k GLOB ?1)' : n === 'meta' ? 'k <> ?1' : '1 = 1', globalArg = n === 'revs' ? DEMO_KGLOB : n === 'meta' ? DEMO_MK : null;
    return { name: n, cols: cols.map(function (c) { return c.name; }), pk: pk.length ? pk : ['rowid'], scoped: scoped, scopedArg: scopedArg, global: global, globalArg: globalArg };
  });
}
async function demoScan(env, tables) {
  var st = [], at = [];
  tables.forEach(function (t) {
    var sel = 'SELECT ' + (t.pk[0] === 'rowid' ? 'rowid AS __rowid, ' : '') + '* FROM ' + t.name + ' WHERE ';
    if (t.scoped) { st.push(env.DB.prepare(sel + t.scoped).bind(t.scopedArg)); at.push([t, 'scoped']); }
    if (t.global) { var q = env.DB.prepare(sel + t.global); st.push(t.globalArg == null ? q : q.bind(t.globalArg)); at.push([t, 'global']); }
  });
  var res = st.length ? await env.DB.batch(st) : [], out = {};
  at.forEach(function (x, i) {
    var t = x[0], o = out[t.name] = out[t.name] || { scoped: {}, global: {} };
    (res[i].results || []).forEach(function (r) {
      var key = JSON.stringify(t.pk.map(function (c) { return c === 'rowid' ? r.__rowid : r[c]; })), row = t.cols.map(function (c) { return r[c] === undefined ? null : r[c]; });
      o[x[1]][key] = { h: demoH(JSON.stringify(row)), row: row };
    });
  });
  return out;
}
/* ── السجلاتُ المشتركة: نزعُ عناصر العرض (عنصرُ مصفوفةٍ معرّفُه tst_demo_* · مفتاحُ كائنٍ tst_demo_*) وحذفُ ما أنشأه الزرعُ من حاوياتٍ إن فرغت ── */
function demoStrip(v, created) {
  if (Array.isArray(v)) return v.filter(function (x) { return !(isObj(x) && demoIsDemo(x.id)); });
  if (!isObj(v)) return v;
  var o = {};
  Object.keys(v).forEach(function (k) {
    if (demoIsDemo(k)) return;
    var x = v[k];
    if (isObj(x)) { var y = {}; Object.keys(x).forEach(function (q) { if (!demoIsDemo(q)) y[q] = x[q]; }); x = y; if ((created || []).indexOf(k) >= 0 && !Object.keys(x).length) return; }
    o[k] = x;
  });
  return o;
}
async function demoKvRows(env, keys) {
  var r = (await env.DB.prepare('SELECT k, seq, v FROM kv WHERE k IN (SELECT value FROM json_each(?1)) ORDER BY k, seq').bind(JSON.stringify(keys)).all()).results || [], out = {};
  keys.forEach(function (k) { out[k] = { raw: null, lens: [] }; });
  r.forEach(function (x) { var o = out[x.k]; o.raw = (o.raw || '') + x.v; o.lens.push(String(x.v).length); });
  return out;
}
/* كتابةُ قيمةٍ بتقطيعٍ معلوم (أطوالُ القطع السابقة) فتعود صفوفُ kv بايتاً — وإلا تقطيعُ الكاتب المعتاد */
function demoKvPut(env, k, text, lens) {
  var sum = (lens || []).reduce(function (a, b) { return a + b; }, 0);
  if (!lens || !lens.length || sum !== text.length) return kvPutStmts(env, 'kv', k, text);
  var st = [env.DB.prepare('DELETE FROM kv WHERE k = ?1').bind(k)], at = 0;
  lens.forEach(function (n, i) { st.push(env.DB.prepare('INSERT INTO kv (k, seq, v) VALUES (?1, ?2, ?3)').bind(k, i, text.slice(at, at + n))); at += n; });
  return st;
}
function demoRandDigits(n) { var b = new Uint8Array(n), s = '', i; crypto.getRandomValues(b); for (i = 0; i < n; i++) s += String(b[i] % 10); return s.charAt(0) === '0' ? '7' + s.slice(1) : s; }
/* ── السياق: ما يحتاجه كلُّ نظامٍ ليكتب محتواه — اليومُ الهجري · الإدارات · الموظفون · الورديات · المواقعُ (نموذجُ الطوابق المشترك) ── */
function demoContext(now) {
  var t = pfHijriAt(now); if (!t || !t.y) throw new Error('demo-clock');
  var T = { y: t.y, m: t.m, d: t.d }, P = T.m > 1 ? { y: T.y, m: T.m - 1 } : { y: T.y - 1, m: 12 }, days = [];
  for (var i = 0; i < 3 && T.d - i >= 1; i++) days.push({ y: T.y, m: T.m, d: T.d - i });
  var D = { g: DEMO_PRE + 'g', d1: DEMO_PRE + 'd1', d2: DEMO_PRE + 'd2', s1: DEMO_PRE + 's1' };
  var shifts = [{ name: 'TEST_ONLY-A', color: '#2563eb', tStart: '06:00', tEnd: '14:00' }, { name: 'TEST_ONLY-B', color: '#16a34a', tStart: '14:00', tEnd: '22:00' }];
  var emps = {}; [[D.d1, 1, 4], [D.d2, 2, 2], [D.s1, 3, 1]].forEach(function (x) {
    var list = []; for (var j = 1; j <= x[2]; j++) list.push({ eid: DEMO_PRE + 'e' + x[1] + j, name: DEMO_TAG + 'موظف ' + x[1] + '-' + j, empno: '99' + x[1] + '000' + j, nid: '19' + x[1] + '000000' + j,
      type: DEMO_TAG + 'رسمي', work: DEMO_TAG + 'مراقب' });
    emps[x[0]] = list; });
  function zone(k, i, emp) { var x0 = i * 20; return { uid: 'tstdz' + k + i, code: 'DZ' + k + i, name: DEMO_TAG + 'مصلى ' + k + '-' + (i + 1), d: 'M' + x0 + ' 0 L' + (x0 + 10) + ' 0 L' + (x0 + 10) + ' 10 L' + x0 + ' 10 Z', cx: x0 + 5, cy: 5, area: 100, emp: emp }; }
  function site(d, k, nm, num) {
    var e = (emps[d] || []).map(function (x) { return x.eid; });
    return { sid: 'tstds' + k, name: DEMO_TAG + nm, num: num, zones: [zone(k, 0, e.slice(0, 2)), zone(k, 1, e.slice(2, 3)), zone(k, 2, [])],
      gates: [{ uid: 'tstdg' + k, id: 'DG' + k, num: String(num), x: 10 * num, y: 10, emp: e.slice(0, 1) }],
      marks: [{ uid: 'tstdm' + k, id: 'DM' + k, label: DEMO_TAG + 'معلم ' + k, x: 3, y: 4 * num, emp: [] }],
      paths: [{ uid: 'tstdp' + k, id: 'DP' + k, pts: [{ x: 0, y: 0 }, { x: 5, y: 5 * num }], active: true }] };
  }
  var sites = {}; sites[D.d1] = [site(D.d1, 11, 'موقع تجريبي ١', 1), site(D.d1, 12, 'موقع تجريبي ٢', 2)]; sites[D.d2] = [site(D.d2, 21, 'موقع الإدارة ٢', 1)];
  return { now: now, today: T, prev: P, days: days, mk: T.y + '-' + T.m, pmk: P.y + '-' + P.m, pre: DEMO_PRE, tag: DEMO_TAG, depts: D, units: [D.d1, D.d2], emps: emps, shifts: shifts, sites: sites,
    copy: function (o) { return JSON.parse(JSON.stringify(o)); } };
}
/* ── الخطة: الإداراتُ والحساباتُ والصلاحياتُ (دمجاً) ثم قطعُ الأنظمة — بلا كتابة ── */
async function demoBuild(env, A, opt) {
  var C = demoContext(Date.now()), D = C.depts, out = { guards: [], st: [], revKeys: [], counts: {}, caps: ['emps', 'admin', 'planning', 'kpis'], users: [], secrets: [] };
  var cur = await demoKvRows(env, DEMO_SHARED), revRows = (await env.DB.prepare('SELECT k, rev FROM revs WHERE k IN (SELECT value FROM json_each(?1))').bind(JSON.stringify(DEMO_SHARED)).all()).results || [];
  var revOf = {}; revRows.forEach(function (r) { revOf[r.k] = r.rev; });
  var users = parseJson(cur[K_USERS].raw || '[]', null), depts = parseJson(cur[K_DEPTS].raw || '[]', null), gdepts = parseJson(cur[K_GDEPTS].raw || '[]', null), perms = parseJson(cur[K_PERM].raw || '{}', null);
  if (!Array.isArray(users) || !Array.isArray(depts) || !Array.isArray(gdepts) || !isObj(perms)) throw new Error('demo-shared-shape');
  /* لا يُزرع فوق بقايا: أيُّ معرّفٍ tst_demo_* أو اسمِ دخولٍ مستعمل ⇒ رفض */
  var taken = {}; users.forEach(function (u) { if (u && u.un) taken[String(u.un)] = 1; });
  if (users.concat(depts, gdepts).some(function (x) { return x && demoIsDemo(x.id); })) throw new Error('demo-residue');
  /* الحسابات: مديرا الإدارتين + موظفان (حسابُ الموظف مربوطٌ بسجله) — كلمةُ المرور تُولَّد ولا تُكتب إلا بصمتُها */
  var acc = [['m1', D.d1, 'mgr:' + D.d1, { mgr: 1 }, 'مدير الإدارة التجريبية ١'], ['m2', D.d2, 'mgr:' + D.d2, { mgr: 1 }, 'مدير الإدارة التجريبية ٢'],
    ['e11', D.d1, C.emps[D.d1][0].eid, {}, 'موظف 1-1'], ['e12', D.d1, C.emps[D.d1][1].eid, {}, 'موظف 1-2'], ['e21', D.d2, C.emps[D.d2][0].eid, {}, 'موظف 2-1']];
  var newUsers = [];
  for (var i = 0; i < acc.length; i++) {
    var a = acc[i], un = '00000990' + String(10 + i), pw = demoRandDigits(6);   /* شكلُ كلمات مرور المنصة (6 أرقام) */
    if (taken[un]) throw new Error('demo-username-taken');
    var u = { id: DEMO_PRE + 'u_' + a[0], un: un, name: DEMO_TAG + a[4], role: 'staff', deptId: a[1], ekey: a[2], ph: opt.dry ? '' : await hashPw(pw), mc: 0, dis: 0, test: 'TEST_ONLY' };
    Object.assign(u, a[3]); newUsers.push(u); out.users.push(u.id);
    if (opt.reveal) out.secrets.push({ id: u.id, un: un, pw: pw, role: a[3].mgr ? 'mgr' : 'staff', dept: a[1] });
  }
  C.users = newUsers.map(function (u) { return { id: u.id, un: u.un, name: u.name, ekey: u.ekey, deptId: u.deptId, mgr: !!u.mgr }; });
  /* الأنظمة: كلُّ قطعةٍ تضيف جملها بكاتبها، وصفحاتِها إلى caps */
  C.op = async function (key, value) {   /* موردٌ تشغيلي: كاتبُه الحقيقي (opChangeStatements) على إدارةٍ جديدة */
    var p = await opChangeStatements(env, key, JSON.stringify(value), { base: 0 });
    out.guards.push.apply(out.guards, p.guards); out.st.push.apply(out.st, p.statements); out.revKeys.push.apply(out.revKeys, p.revisionKeys);
  };
  C.count = function (sys, what, n) { (out.counts[sys] = out.counts[sys] || {})[what] = ((out.counts[sys] || {})[what] || 0) + n; };
  C.out = out;
  /* القاعدة: الموظفون وخياراتهم والورديات لكل إدارة */
  for (var d in C.emps) {
    await C.op('bsdept:' + d + ':bassam_employees_v1', C.emps[d]); C.count('base', 'employees', C.emps[d].length);
    await C.op('bsdept:' + d + ':bassam_shift_options_v1', C.shifts); C.count('base', 'shifts', C.shifts.length);
    await C.op('bsdept:' + d + ':bassam_options_v1', { type: [DEMO_TAG + 'رسمي'], work: [DEMO_TAG + 'مراقب'] });
  }
  for (var p = 0; p < DEMO_PROVIDERS.length; p++) {
    var P = DEMO_PROVIDERS[p]; (P.caps || []).forEach(function (c) { if (out.caps.indexOf(c) < 0) out.caps.push(c); });
    await P.seed(env, C, out); if (!out.counts[P.sys]) out.counts[P.sys] = {};
  }
  /* إشعاراتٌ لحسابات العرض وحدها (نوعُ القاعدة «إضافة موظف») */
  var plans = [];
  C.units.forEach(function (d) { (C.emps[d] || []).slice(0, 2).forEach(function (e, j) {
    var m = nfMessage(nfScope(d), DEMO_PRE + 'n' + d.slice(DEMO_PRE.length) + j, 'event', { department: d, type: 'emp_add', category: 'emp', priority: 'info', channel: 'bell', title: DEMO_TAG + 'إضافة موظف',
      body: DEMO_TAG + 'أُضيف ' + e.name + ' إلى موظفي الإدارة', created_at: C.now - j * 60000, author_key: String(A.u.ekey || A.u.id), author_name: DEMO_TAG + 'أداة العرض', action_text: '', link: '', server_origin: 1 });
    plans.push({ m: m, targets: nfTargetRows(m.scope, m.id, { e: [], r: ['mgr'] }), once: '' }); }); });
  if (plans.length) { out.st.push.apply(out.st, nfInsertPlans(env, plans)); C.count('base', 'notifications', plans.length); }
  /* السجلاتُ المشتركة: دمجٌ يُتحقَّق أنه يُنزع فيعود كما كان */
  var created = [];
  var nextPerms = JSON.parse(JSON.stringify(perms));
  ['caps', 'emps'].forEach(function (s) { if (!isObj(nextPerms[s])) { nextPerms[s] = {}; created.push(s); } });
  [D.g, D.d1, D.d2, D.s1].forEach(function (d) { nextPerms.caps[d] = out.caps.slice(); });
  var next = {};
  next[K_USERS] = users.concat(newUsers);
  next[K_GDEPTS] = gdepts.concat([{ id: D.g, name: DEMO_TAG + 'إدارة عامة تجريبية', kind: 'إدارة عامة' }]);
  next[K_DEPTS] = depts.concat([{ id: D.d1, name: DEMO_TAG + 'إدارة تجريبية ١', gid: D.g }, { id: D.d2, name: DEMO_TAG + 'إدارة تجريبية ٢', gid: D.g }, { id: D.s1, name: DEMO_TAG + 'قسم تجريبي ١', gid: D.d1, kind: 'قسم' }]);
  next[K_PERM] = nextPerms;
  var shared = {};
  DEMO_SHARED.forEach(function (k) {
    var raw = cur[k].raw, prevNorm = raw == null ? null : JSON.stringify(JSON.parse(raw)), text = JSON.stringify(next[k]);
    if (JSON.stringify(demoStrip(next[k], k === K_PERM ? created : [])) !== (prevNorm == null ? JSON.stringify(k === K_PERM ? {} : []) : prevNorm)) throw new Error('demo-irreversible-merge');
    shared[k] = { prevSha: raw == null ? null : demoH(raw), prevNormSha: prevNorm == null ? null : demoH(prevNorm), prevLens: cur[k].lens, created: k === K_PERM ? created : [], afterSha: demoH(text), rev: revOf[k] || 0 };
    out.guards.push(revGuard(env, k, revOf[k] || 0));
    out.st.push.apply(out.st, kvPutStmts(env, 'kv', k, text)); out.revKeys.push(k);
  });
  out.shared = shared; out.C = C;
  out.counts.base = Object.assign(out.counts.base || {}, { departments: 4, accounts: newUsers.length });
  return out;
}
function demoRevStmts(env, keys) {
  var st = [env.DB.prepare("INSERT INTO meta(k,v)VALUES('rev',CAST((SELECT MAX(n)+1 FROM(SELECT COALESCE(MAX(rev),0)n FROM revs UNION ALL SELECT COALESCE(CAST(v AS INTEGER),0)FROM meta WHERE k='rev'))AS TEXT))ON CONFLICT(k)DO UPDATE SET v=excluded.v")];
  enfUniq(keys).forEach(function (k) { st.push(env.DB.prepare("INSERT INTO revs(k,rev)VALUES(?1,(SELECT CAST(v AS INTEGER)FROM meta WHERE k='rev'))ON CONFLICT(k)DO UPDATE SET rev=excluded.rev").bind(k)); });
  return st;
}
async function demoManifest(env) { var r = await env.DB.prepare('SELECT v FROM meta WHERE k = ?1').bind(DEMO_MK).first(); return r ? parseJson(r.v, null) : null; }
function demoManifestStmt(env, m) { return env.DB.prepare('INSERT INTO meta(k,v) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(DEMO_MK, JSON.stringify(m)); }
/* الفرقُ بين مسحين: المضافُ (مفتاحُه وبصمتُه) · المتغيّرُ (قيمتُه السابقة وبصمتُه بعد) · المحذوفُ (قيمتُه السابقة) */
function demoDiff(tables, a, b, own) {
  var m = { added: {}, changed: {}, deleted: {}, foreign: 0 };
  tables.forEach(function (t) {
    var A0 = a[t.name] || { scoped: {}, global: {} }, B0 = b[t.name] || { scoped: {}, global: {} };
    ['scoped', 'global'].forEach(function (part) {
      var x = A0[part], y = B0[part];
      Object.keys(y).forEach(function (k) {
        if (!x[k]) {
          /* صفٌّ عامٌّ أُضيف بلا وسم العرض = كتابةٌ متزامنةٌ من غيرنا ⇒ لا يدخل البيان (لا يُحذف أبداً) */
          var mine = t.name === 'revs' && (own || []).indexOf(y[k].row[t.cols.indexOf('k')]) >= 0;   /* نسخةُ مفتاحٍ كتبه الزرعُ نفسُه */
          if (part === 'global' && !mine && JSON.stringify(y[k].row).indexOf(DEMO_PRE) < 0 && JSON.stringify(y[k].row).indexOf('TEST_ONLY') < 0) { m.foreign++; return; }
          (m.added[t.name] = m.added[t.name] || []).push([k, y[k].h, part]);
        } else if (x[k].h !== y[k].h) (m.changed[t.name] = m.changed[t.name] || []).push([k, y[k].h, x[k].row]);
      });
      Object.keys(x).forEach(function (k) { if (!y[k]) (m.deleted[t.name] = m.deleted[t.name] || []).push([k, x[k].row]); });
    });
  });
  return m;
}
function demoPkWhere(t) { return '(' + t.pk.map(function (c, i) { return t.name + '.' + c + " IS json_extract(j.value, '$[" + i + "]')"; }).join(' AND ') + ')'; }
function demoChunks(list, n) { var o = []; for (var i = 0; i < list.length; i += n) o.push(list.slice(i, i + n)); return o; }
async function demoSeed(env, A, b) {
  var have = await demoManifest(env);
  if (have) return { status: 409, body: { ok: 0, err: 'demo-already-seeded', msg: 'بياناتُ العرض مزروعةٌ مسبقاً — احذفها أولاً (act:remove)', at: have.at, counts: have.counts } };
  var tables = await demoTables(env), before = await demoScan(env, tables);
  var residue = tables.filter(function (t) { return Object.keys((before[t.name] || {}).scoped || {}).length; }).map(function (t) { return t.name; });
  if (residue.length) return { status: 409, body: { ok: 0, err: 'demo-residue', msg: 'في القاعدة صفوفُ عرضٍ بلا بيان — لا يُزرع فوقها', tables: residue } };
  var plan;
  try { plan = await demoBuild(env, A, { reveal: !!b.reveal }); } catch (e) { return { status: 409, body: { ok: 0, err: String(e && e.message || e).slice(0, 80) } }; }
  var pending = { v: 1, state: 'pending', at: Date.now(), by: A.u.id, depts: [plan.C.depts.g, plan.C.depts.d1, plan.C.depts.d2, plan.C.depts.s1], users: plan.users, shared: plan.shared, counts: plan.counts };
  var st = plan.guards.concat([env.DB.prepare('SELECT CASE WHEN EXISTS(SELECT 1 FROM meta WHERE k = ?1) THEN json_extract(\'{}\', \'KIVO_REV_CONFLICT\') END').bind(DEMO_MK)], plan.st, demoRevStmts(env, plan.revKeys), [demoManifestStmt(env, pending)]);
  try { await env.DB.batch(st); } catch (e) { if (isRevConflict(e)) return { status: 409, body: { ok: 0, err: 'conflict' } }; throw e; }
  var after = await demoScan(env, tables), diff = demoDiff(tables, before, after, plan.revKeys);
  var man = Object.assign({}, pending, { state: 'seeded', added: diff.added, changed: diff.changed, deleted: diff.deleted });
  await env.DB.batch([demoManifestStmt(env, man)]);
  var out = { ok: 1, act: 'seed', counts: plan.counts, rows: demoCountRows(diff.added), foreign: diff.foreign, depts: pending.depts, accounts: plan.C.users.map(function (u) { return { id: u.id, un: u.un, dept: u.deptId, mgr: u.mgr }; }) };
  if (b.reveal) out.secrets = plan.secrets;   /* مرةً واحدة، في جسم الردّ وحده — لا تُسجَّل ولا تُحفظ */
  return { status: 200, body: out };
}
function demoCountRows(added) { var o = {}; Object.keys(added || {}).forEach(function (t) { o[t] = added[t].length; }); return o; }
async function demoRemove(env, A, b) {
  var man = await demoManifest(env);
  if (!man) return { status: 200, body: { ok: 1, act: 'remove', noop: 1, msg: 'لا بياناتَ عرضٍ مزروعة' } };
  var tables = await demoTables(env), now = await demoScan(env, tables), byName = {}, drift = [], st = [], kept = [];
  tables.forEach(function (t) { byName[t.name] = t; });
  var force = !!b.force, partial = man.state !== 'seeded';
  if (partial && !force) drift.push({ kind: 'manifest-pending' });
  /* (1) صفوفُ النطاق: ما ليس في البيان (أضافه مختبِرٌ في إدارات العرض) انحراف */
  tables.forEach(function (t) {
    if (!t.scoped) return;
    var listed = {}; ((man.added || {})[t.name] || []).forEach(function (x) { if (x[2] === 'scoped') listed[x[0]] = x[1]; });
    var extra = Object.keys((now[t.name] || {}).scoped || {}).filter(function (k) { return listed[k] === undefined; });
    if (extra.length && !partial) drift.push({ kind: 'extra-rows', table: t.name, n: extra.length });
    if (Object.keys((now[t.name] || {}).scoped || {}).length) st.push(env.DB.prepare('DELETE FROM ' + t.name + ' WHERE ' + t.scoped).bind(t.scopedArg));
  });
  /* (2) الصفوفُ العامة المضافة: تُحذف بمفاتيحها · المتغيّرة تُعاد إن لم يمسّها أحدٌ بعد الزرع (العدّادات تمضي) · المحذوفة تُعاد */
  var later = 0;
  tables.forEach(function (t) {
    if (!t.global) return;
    var n = t.name, listed = {};
    ((man.added || {})[n] || []).forEach(function (x) { if (x[2] === 'global') listed[x[0]] = x[1]; });
    /* صفٌّ عامٌّ مفتاحُه يحمل tst_demo_ ملكُ العرض (ومنه ما كتبه النظامُ بعد الزرع: نقاطُ تشغيلٍ لإدارةٍ تجريبية · إشعاراتُها) ⇒ يُحذف دائماً؛
       وصفٌّ مضافٌ بلا ذلك يُحذف بمفتاحه — إلا نسخةً أو عدّاداً تغيّر بعد الزرع (كتبه غيرُنا بعده) فيبقى */
    var keys = Object.keys(listed).filter(function (k) { var c = ((now[n] || {}).global || {})[k]; if (k.indexOf(DEMO_PRE) < 0 && (n === 'revs' || n === 'meta') && c && c.h !== listed[k]) { kept.push(n + ' ' + k); return false; } return true; });
    Object.keys((now[n] || {}).global || {}).forEach(function (k) { if (k.indexOf(DEMO_PRE) >= 0 && listed[k] === undefined) { keys.push(k); later++; } });
    demoChunks(keys.map(function (k) { return JSON.parse(k); }), 200).forEach(function (part) { st.push(env.DB.prepare('DELETE FROM ' + n + ' WHERE EXISTS (SELECT 1 FROM json_each(?1) AS j WHERE ' + demoPkWhere(t) + ')').bind(JSON.stringify(part))); });
  });
  function putRow(t, row) { var cols = t.cols; return env.DB.prepare('INSERT OR REPLACE INTO ' + t.name + ' (' + cols.join(',') + ') SELECT ' + cols.map(function (c, i) { return "json_extract(?1, '$[" + i + "]')"; }).join(',')).bind(JSON.stringify(row)); }
  Object.keys(man.changed || {}).forEach(function (n) {
    var t = byName[n]; if (!t) return;
    man.changed[n].forEach(function (x) { var c = ((now[n] || {}).global || {})[x[0]] || ((now[n] || {}).scoped || {})[x[0]]; if (c && c.h === x[1]) st.push(putRow(t, x[2])); else kept.push(n + ' ' + x[0]); });
  });
  Object.keys(man.deleted || {}).forEach(function (n) { var t = byName[n]; if (!t) return; man.deleted[n].forEach(function (x) { var c = ((now[n] || {}).global || {})[x[0]]; if (!c) st.push(putRow(t, x[1])); }); });
  /* (3) السجلاتُ المشتركة: نزعُ عناصر العرض ثم مطابقةُ البصمة السابقة */
  var cur = await demoKvRows(env, DEMO_SHARED), sharedOut = {};
  DEMO_SHARED.forEach(function (k) {
    var info = (man.shared || {})[k]; if (!info) return;
    var v = parseJson(cur[k].raw == null ? 'null' : cur[k].raw, null), stripped = demoStrip(v, info.created), text = JSON.stringify(stripped);
    if (info.prevSha == null) {   /* لم يكن السجلُّ قبل الزرع: يُحذف إن لم يبقَ فيه إلا العرض، وإلا فانحراف (force يُبقي ما أُضيف بعده) */
      if (cur[k].raw == null || text === JSON.stringify(k === K_PERM ? {} : [])) { st.push(env.DB.prepare('DELETE FROM kv WHERE k = ?1').bind(k)); sharedOut[k] = 'deleted'; return; }
      if (!force) drift.push({ kind: 'shared-drift', key: k });
      st.push.apply(st, kvPutStmts(env, 'kv', k, text)); sharedOut[k] = 'stripped'; return;
    }
    var exact = demoH(text) === info.prevSha, same = exact || demoH(text) === info.prevNormSha;
    if (!same && !force) drift.push({ kind: 'shared-drift', key: k, note: 'تغيّر السجلُّ المشترك بعد الزرع — force يكتب الحاليَّ منزوعاً منه العرضُ وحده' });
    st.push.apply(st, demoKvPut(env, k, text, exact ? info.prevLens : null)); sharedOut[k] = exact ? 'exact' : same ? 'equal-json' : 'stripped';
  });
  if (drift.length && !force) return { status: 409, body: { ok: 0, err: 'demo-drift', msg: 'تغيّرت بياناتُ العرض أو السجلاتُ المشتركة بعد الزرع — لم يُحذف شيء (force للحذف رغم ذلك)', drift: drift } };
  /* جلساتُ حسابات العرض (إن دخلها أحد) تُنهى، ثم البيانُ نفسُه — في دفعةٍ واحدة */
  st.push(env.DB.prepare('DELETE FROM sess WHERE uid GLOB ?1').bind(DEMO_GLOB));
  st.push(env.DB.prepare('DELETE FROM meta WHERE k = ?1').bind(DEMO_MK));
  await env.DB.batch([env.DB.prepare('PRAGMA defer_foreign_keys = ON')].concat(st));
  return { status: 200, body: { ok: 1, act: 'remove', removed: demoCountRows(man.added), laterRows: later, shared: sharedOut, keptCounters: kept, forced: force && drift.length ? drift : undefined } };
}
async function demoStatus(env) {
  var man = await demoManifest(env), tables = await demoTables(env), now = await demoScan(env, tables), rows = {};
  tables.forEach(function (t) { var n = Object.keys((now[t.name] || {}).scoped || {}).length; if (n) rows[t.name] = n; });
  return { status: 200, body: { ok: 1, act: 'status', seeded: !!man, state: man ? man.state : null, at: man ? man.at : null, counts: man ? man.counts : null, demoRows: rows,
    systems: DEMO_PROVIDERS.map(function (p) { return p.sys; }) } };
}
async function enfDemoApi(env, request, A) {
  var rb = await bodyRead(request, '/api/demo-data'); if (rb.res) return rb.res; var b = rb.v || {};
  var act = String(b.act || 'status'), r;
  if (act === 'status') r = await demoStatus(env);
  else if (act === 'preview') {   /* معاينةٌ بلا كتابة */
    var p; try { p = await demoBuild(env, A, { dry: 1 }); } catch (e) { return json({ ok: 0, err: String(e && e.message || e).slice(0, 80) }, 409); }
    r = { status: 200, body: { ok: 1, act: 'preview', counts: p.counts, statements: p.st.length, systems: DEMO_PROVIDERS.map(function (x) { return x.sys; }), seeded: !!(await demoManifest(env)) } };
  } else if (act === 'seed') r = await demoSeed(env, A, b);
  else if (act === 'remove') r = await demoRemove(env, A, b);
  else return json({ ok: 0, err: 'act' }, 400);
  return json(r.body, r.status);
}
/* V7 · د5-هـ (م6): بياناتُ العرض — الجائزة: ترشيحاتُ موظفي الإدارة (awConvert → awInstallStatements) */
demoProvide({ sys: 'award', caps: ['award'], seed: async function (env, C, out) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], recs = emps.slice(0, 3).map(function (e, j) {
      return { id: C.pre + 'aw_' + d.slice(C.pre.length) + '_' + j, ekey: e.eid, cat: C.tag + 'فئة', hij: C.today.y + '-' + C.today.m + '-' + C.today.d, score: 70 + j, st: 'قيد التحكيم', declName: e.name };
    });
    if (!recs.length) continue;
    var domain = awConvert(d, { records: { recs: recs } });
    out.st.push.apply(out.st, awInstallStatements(env, domain)); C.count('award', 'nominations', recs.length);
  }
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — العُهَد: أصنافٌ وتسليمٌ لموظفي الإدارة (cuConvert → cuBulk) */
demoProvide({ sys: 'custody', caps: [], seed: async function (env, C, out) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], T = C.today;
    var doc = { items: [{ name: C.tag + 'جهاز لاسلكي', qty: 5 }, { name: C.tag + 'سترة', qty: 10 }],
      moves: emps.slice(0, 2).map(function (e, j) { return { t: 'out', eid: e.eid, item: j ? C.tag + 'سترة' : C.tag + 'جهاز لاسلكي', ser: 'TST-D' + (i + 1) + '0' + (j + 1), y: T.y, m: T.m, d: T.d }; }) };
    var rows = cuConvert(d, doc);
    Object.keys(CU_TABLES).forEach(function (k) { out.st.push.apply(out.st, cuBulk(env, CU_TABLES[k][0], CU_TABLES[k][1], rows[k])); });
    C.count('custody', 'items', rows.items.length); C.count('custody', 'issued', rows.moves.length);
  }
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — الجولاتُ اليومية: أيامٌ من الشهر الحالي على مواقع الإدارة، بحالات رصدٍ مفتوحة ومغلقة */
demoProvide({ sys: 'daily', caps: ['daily'], seed: async function (env, C) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], floors = C.sites[d] || [], doc = {}; if (!floors.length) continue;
    C.days.forEach(function (day, k) {
      var fs = C.copy(floors);
      fs.forEach(function (f) { if (f.zones[0]) Object.assign(f.zones[0], { fst: 'open', fAt: C.now - k * 864e5 }); if (f.zones[1]) Object.assign(f.zones[1], { fst: 'closed', cWhy: C.tag + 'صيانة', fAt: C.now - k * 864e5 + 1000 }); });
      doc[day.y + '-' + day.m + '-' + day.d] = { t: C.now - k * 864e5, d: fs, shAp: {} };
    });
    await C.op('bsdept:' + d + ':bassam_rounds_v1', doc); C.count('daily', 'days', C.days.length);
  }
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — التقريرُ اليومي: أيامٌ بورديتين وحضورِ موظفي الإدارة (الأقدمُ معتمَد) */
demoProvide({ sys: 'dreport', caps: ['dreport'], seed: async function (env, C) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], doc = {}; if (!emps.length) continue;
    C.days.forEach(function (day, k) {
      var shifts = {};
      C.shifts.forEach(function (s, j) {
        var roster = emps.filter(function (e, q) { return q % C.shifts.length === j; }).map(function (e) { return { ekey: e.eid, st: 'pr', shift: s.name }; });
        shifts[s.name] = Object.assign({ pulled: true, roster: roster }, k > 0 ? { ap: 1, apAt: day.d + '/' + day.m, apBy: C.tag + 'مدير' } : {});
      });
      doc[day.y + '-' + day.m + '-' + day.d] = { created: C.now - k * 864e5, shifts: shifts };
    });
    await C.op('bsdept:' + d + ':bassam_dreport_v1', doc); C.count('dreport', 'days', C.days.length);
  }
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — الإحصائياتُ اليومية (سجلٌّ عامٌّ للمنصة): أيامٌ من الشهر الحالي الخاليةُ وحدها تُملأ بقيمٍ موسومة TEST_ONLY،
   ولا يُمسّ يومٌ له قيمة (dsDomainStatements من فارغٍ إلى أيام العرض — إدراجٌ لا استبدال) */
demoProvide({ sys: 'dstats', caps: ['dstats'], seed: async function (env, C, out) {
  var cur = (await dsDomainRead(env)).data, next = { haram: {}, nabawi: {}, locks: {} }, n = 0;
  DS_SITES.forEach(function (site, s) {
    C.days.forEach(function (day, k) {
      var key = day.y + '-' + String(day.m).padStart(2, '0') + '-' + String(day.d).padStart(2, '0');
      if (cur[site] && cur[site][key] !== undefined) return;
      next[site][key] = { worshippers: 1000 * (s + 1) + 10 * k, umrah: 100 + k, __m: { t: 'TEST_ONLY' } }; n++;
    });
  });
  if (!n) return;
  out.st.push.apply(out.st, dsDomainStatements(env, { haram: {}, nabawi: {}, locks: {} }, next)); out.revKeys.push(K_DSTATS); C.count('dstats', 'days', n);
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — الإرشاد: تقاريرُ اليوم والأيام السابقة بلغاتها ومواقعها، بكاتب النظام (irConvert → irInstallStatements) */
demoProvide({ sys: 'irshad', caps: ['irshad'], seed: async function (env, C, out) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], reports = [];
    C.days.forEach(function (day, k) {
      emps.slice(0, 3).forEach(function (e, j) {
        reports.push({ id: C.pre + 'ir_' + d.slice(C.pre.length) + '_' + k + j, y: day.y, m: day.m, d: day.d, ts: C.now - k * 864e5 - j * 60000, shift: C.shifts[j % C.shifts.length].name,
          eid: e.eid, name: e.name, loc: C.tag + 'موقع إرشاد', actor: C.tag + 'أداة العرض', bro: 2 + j, pros: j % 2, pol: 0, langs: [{ lang: C.tag + 'لغة', count: 3 + j }] });
      });
    });
    var domain = irConvert(d, { reports: { reports: reports }, languages: [C.tag + 'لغة'], locations: [C.tag + 'موقع إرشاد'] });
    out.st.push.apply(out.st, irInstallStatements(env, domain)); C.count('irshad', 'reports', reports.length);
  }
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — الخطةُ التشغيلية: مواقعُ (طوابق) بمصلياتها وبواباتها ومعالمها ومساراتها لكل إدارةٍ تجريبية، وخطةُ الشهر */
demoProvide({ sys: 'plan', caps: ['plan'], seed: async function (env, C) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], floors = C.sites[d] || []; if (!floors.length) continue;
    var doc = { floors: C.copy(floors), months: {}, zones: C.copy(floors[0].zones), gates: C.copy(floors[0].gates), marks: C.copy(floors[0].marks), paths: C.copy(floors[0].paths) };
    doc.months[C.mk] = { c: 1, d: C.copy(floors) };
    await C.op('bsdept:' + d + ':bassam_plan_v1', doc); C.count('plan', 'sites', floors.length);
    C.count('plan', 'zones', floors.reduce(function (n, f) { return n + f.zones.length; }, 0));
  }
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — المضبوطات: فهرسٌ وإجراءات ومواقع، وتقاريرُ بأصنافها لأيام الشهر (szConvert → szInstallStatements) */
demoProvide({ sys: 'seized', caps: ['seized'], seed: async function (env, C, out) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], reports = [];
    C.days.forEach(function (day, k) {
      reports.push({ id: C.pre + 'sz_' + d.slice(C.pre.length) + '_' + k, y: day.y, m: day.m, d: day.d, ts: C.now - k * 864e5, loc: C.tag + 'موقع ضبط', no: C.tag + 'محضر ' + (k + 1), note: '',
        shift: C.shifts[0].name, eid: emps[0] ? emps[0].eid : '', name: emps[0] ? emps[0].name : '', actor: C.tag + 'أداة العرض',
        items: [{ id: 23, n: 2 + k, val: 0, act: 'sto', kind: '', kindTxt: '', photos: [] }, { id: 24, n: 1, val: 100, act: 'sto', kind: '', kindTxt: '', photos: [] }] });
    });
    var domain = szConvert(d, { catalog: { ver: 1, cats: [{ name: C.tag + 'نقد', color: '#123456', items: [{ id: 23, name: C.tag + 'عملة', unit: 'sar' }, { id: 24, name: C.tag + 'جهاز', unit: 'pc' }] }] },
      actions: [{ k: 'sto', name: C.tag + 'محفوظ' }], locations: [C.tag + 'موقع ضبط'], jew: [C.tag + 'نوع'], reports: { reports: reports } });
    out.st.push.apply(out.st, szInstallStatements(env, domain)); C.count('seized', 'reports', reports.length);
  }
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — جدولُ التشغيل: وردياتُ موظفي كلِّ إدارةٍ تجريبية للشهر الحالي والسابق */
demoProvide({ sys: 'staff', caps: ['staff'], seed: async function (env, C) {
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], month = {}, n = 0;
    (C.emps[d] || []).forEach(function (e, j) { month[e.eid] = { shift: C.shifts[j % C.shifts.length].name, rest: [], leaves: {}, perm: {}, cs: '', muk: false }; n++; });
    var doc = {}; doc[C.mk] = month; doc[C.pmk] = C.copy(month);
    await C.op('bsdept:' + d + ':bassam_staffing_v3', doc); C.count('staff', 'assignments', n * 2);
  }
} });
/* V7 · د5-هـ (م6): بياناتُ العرض — المهام: مهامٌ اليوم وأمس لموظفي الإدارة (تنتظر · جارية · منجزة) ومهمةٌ عامة */
demoProvide({ sys: 'tasks', caps: ['tasks'], seed: async function (env, C) {
  var H = 3600 * 1000, seq = 0;
  function row(o) {   /* الشكلُ القائم (22 عموداً) — العمود 13 هويةُ الصف · 14 مفتاحُ المسند */
    var nm = o.e ? o.e.name : '';
    return [C.tag + o.title, '', 'normal', o.st || 'pending', 'normal', 'مضافة', o.perf || null, o.e ? [nm.charAt(0)] : [], nm, C.tag + 'أداة العرض', 60, o.acc || null, o.fin || null,
      C.now - 864e5 * 30 + (++seq) * 1000, o.e ? o.e.eid : null, o.s || null, o.f || null, null, null, null, null, null];
  }
  for (var i = 0; i < C.units.length; i++) {
    var d = C.units[i], emps = C.emps[d] || [], doc = {}, n = 0, T = C.days[0], Y = C.days[1] || C.days[0];
    var DT = T.y + '-' + T.m + '-' + T.d, DY = Y.y + '-' + Y.m + '-' + Y.d;
    doc[DT] = []; if (DY !== DT) doc[DY] = [];
    emps.forEach(function (e, j) {
      doc[DT].push(row({ title: 'مهمة اليوم ' + (j + 1), e: e, st: j % 2 ? 'in_progress' : 'pending', acc: j % 2 ? C.now - H / 2 : null, s: C.now - H, f: C.now + 3 * H })); n++;
      doc[DY].push(row({ title: 'مهمة أمس ' + (j + 1), e: e, st: 'done', acc: C.now - 25 * H, fin: C.now - 24.5 * H, perf: ['on_time', 'في الوقت'], s: C.now - 26 * H, f: C.now - 24 * H })); n++;
    });
    doc[DT].push(row({ title: 'مهمة عامة', s: C.now - H, f: C.now + 5 * H })); n++;
    await C.op('bsdept:' + d + ':bassam_tasks_v1', doc); C.count('tasks', 'tasks', n);
  }
} });
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
/* /api/changes في بيئة الإنفاذ: am = وضعُ الخادم الآن · az = تغيّر ما تُحسب منه مفاتيحُ الفاعل (الصلاحيات · الحسابات · الهيكل · المنصة · منحُ إداراته) */
var ENF_AZ_GLOBAL = { bassam_perms_v1: 1, bassam_auth_users_v1: 1, bassam_depts_v1: 1, bassam_gdepts_v1: 1, bassam_platform_v1: 1 };
function enfChangesOut(env, A, v, keys, all) {
  var out = { v: v, keys: keys, am: env.__enfm ? env.__enfm.mode : 'legacy' }, ds = {}, i;
  enfDeptsOf(A).forEach(function (d) { ds[d] = 1; });
  for (i = 0; i < all.length; i++) {
    var k = String(all[i]), P = parseKey(k);
    if (!P.dept ? ENF_AZ_GLOBAL[P.name] : (ds[P.dept] && P.name === ENF_GRANTS_RES)) { out.az = 1; break; }
  }
  return out;
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
    var operationKeys=Object.keys(bs.set||{}).concat(bs.del||[]), operationalSave=operationKeys.some(opIsResource);
    if(operationalSave && (typeof bs.requestId!=='string'||!/^[-A-Za-z0-9_]{8,100}$/.test(bs.requestId)||!Number.isSafeInteger(bs.epoch)||bs.epoch<0||operationKeys.some(function(k){return !bs.base||!Number.isSafeInteger(bs.base[k])||bs.base[k]<0;})))
      return json({ok:0,err:'operations-request-envelope'},400);
    /* V7 · د5-هـ (أمن ٣): حفظُ موردٍ تشغيلي يُعاد مرّةً واحدة إن أخفق سياجُ مرجعه بكتابةٍ متزامنة (لم يُكتب شيء — الدفعةُ ذرّية): الإعادةُ لقطةٌ جديدة
       تعيد الحكمَ بالسلطة الحالية وتقارن «base» العميل بالنسخة الحالية — فتعديلُ المورد نفسِه يبقى تعارضاً (409)، والكتابةُ غيرُ ذات الصلة لا تُفشله. */
    for (var svTry = 0; ; svTry++) {
      try { var r2 = await applySave(env, bs, A1, reqMeta(request)); break; }
      catch (eT) { if (svTry || !operationalSave || !opFenceRetry(eT)) throw eT; }
    }
    if(operationalSave) return json(Object.assign({},r2,{ok:r2.ok===1?1:0,requestId:bs.requestId,epoch:bs.epoch,atomic:1}),r2.ok===1?200:Object.keys(r2.conflicts||{}).length?409:403);
    /* V7 · د5-هـ (أمن ١): لا ok:1 لحفظٍ لم يُكتب منه مفتاح — كلُّ مفتاحٍ طُلب رُفض أو تعارض ⇒ ok:0 (والنتيجةُ لكل مفتاح كما هي).
       للعميل الذي يعلن فهمه (ack ≥ 2) وحده: صفحةٌ قديمة في نافذة الإصدارين ترى ok:0 إقراراً غيرَ صالح فتعيد الإرسالَ بلا نهاية (caps_own_stale) */
    var svStop = Object.keys(r2.denied || {}).length + Object.keys(r2.conflicts || {}).length;
    return json({ ok: bs.ack >= 2 && operationKeys.length && !Object.keys(r2.revs || {}).length && svStop ? 0 : 1, v: r2.v, revs: r2.revs, denied: r2.denied, conflicts: r2.conflicts, atomic: r2.atomic || '' });
  } catch (eS) {
    var guardSave=dbGuardFailure(eS);if(guardSave)return json({ok:0,err:guardSave.err},guardSave.status);
    /* فشل الحفظ يظهر باسمه في سجلات المشروع وفي فاحص الشبكة — لا صمت */
    if(eS.rs||eS.cuCode||eS.nf||eS.ocCode)return json({ok:0,err:eS.rs||eS.cuCode||eS.nf||eS.ocCode},eS.status||eS.cuStatus||400);if(/KIVO_RESTORE_EPOCH/.test(String(eS)))return json({ok:0,err:'restore-epoch-changed'},409);if(/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_CUSTODY_TARGET_CHANGED/.test(String(eS)))return json({ok:0,err:'conflict'},409); logEv('error', 'save-failed', { rid: env.__rid, p: path, st: 500, err: errMsg(eS) }); return json({ ok: 0, err: 'save-failed', rid: env.__rid }, 500);   /* KIVO_259 · SR-6: نصُّ الخطأ الداخلي في السجل وحده (بالمعرّف rid) — لا في الاستجابة */
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
var LP_SESS_TICK = 2;   /* V7 · د5-هـ (x1): ثواني مراجعة الجلسة في انتظار /api/changes */
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
        /* V7 · د5-هـ (x1): الجلسةُ تُراجَع داخل الانتظار كلَّ LP_SESS_TICK ثانية — جلسةٌ أُنهيت (خروج · «إنهاء» · «ليس أنا» · تجميد) تأخذ 401 خلال ثوانٍ لا بعد 25 */
        if ((wi + 1) % LP_SESS_TICK === 0 && !(await (env.__rawDB || env.DB).prepare('SELECT 1 AS n FROM sess WHERE tok = ?1').bind(ss.tok).first())) return json({ ok: 0, err: 'session' }, 401);
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
  if (meSnapshotChanged(AC, (ch && ch.results) || [], vC)) outC.meChanged = 1;
  if (meTasksChanged(AC, (ch && ch.results) || [], vC)) outC.tasksChanged = 1;
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
  var rvG = await revsAll(env), got = {}, refsG = null;
  /* KIVO_255 · AUD-037: قيمُ المفاتيح المقروءة تُجلب في جولةٍ واحدة بدل جولةٍ لكل مفتاح — الحكمُ لكل مفتاح كما هو */
  var rdKeys = want.filter(function (k9) { return !isDeviceKey(k9) && resName(k9) !== K_DSTATS && !nfLegacyKey(k9) && !cuLegacyKey(k9) && !irLegacyKey(k9) && !bdLegacyKey(k9) && !opIsResource(k9) && canRead(AG, k9); }), valsG = await kvMany(env, 'kv', rdKeys);
  if (want.indexOf(K_USERS) >= 0) await privPrepDepts(env, AG, (AG.depts || []).map(function (x) { return x && x.id; }));   /* 019u (9): the accounts lens maps an ekey that is a hidden nid */
  for (var gi = 0; gi < want.length; gi++) {
    var gk = want[gi];
    if (isDeviceKey(gk)) continue;
    var rdG = canRead(AG, gk);
    if (!rdG && !canSee(AG, gk)) continue;
    if (nfLegacyKey(gk)) { got[gk] = { v: null, rev: rvG[gk] || 0, moved: '/api/notifications' }; continue; }
    if (cuLegacyKey(gk)) { got[gk] = { v: null, rev: rvG[gk] || 0, moved: '/api/custody' }; continue; }
    if (irLegacyKey(gk)) { got[gk] = { v: null, rev: rvG[gk] || 0, moved: '/api/irshad' }; continue; }
    if (bdLegacyKey(gk)) { got[gk] = { v: null, rev: rvG[gk] || 0, moved: szLegacyKey(gk) ? '/api/seized' : '/api/award' }; continue; }
    if (opIsResource(gk)) { got[gk] = { v:null, rev:rvG[gk]||0, moved:'/api/operations/read' }; continue; }
    if (resName(gk) === K_DSTATS) { got[gk] = { v: null, rev: rvG[gk] || 0, moved: '/api/dstats' }; continue; }
    var gv = rdG ? valsG[gk] : null;      /* لا قيمةَ لمن لا يقرأ — الرقمُ وحدَه */
    if (rdG && gk === K_USERS && gv != null) gv = usersScopeOut(usersNoOut(stripPh(gv), AG), AG);   /* KIVO_259 · SR-1: ولا رقمَ وظيفيَّ لحساب غيره · الفحصُ العميق (R4): ولا حسابَ خارج نطاقه (054) */
    /* D4‑01 (v24.5): ظلُّ نطاق القراءة على ما سيُرجَع (أو على المورد وحده حين لا قيمة) — لا يمسّ got ولا الحكم */
    if (AG.enf && rdG && gv != null) { try { if (!refsG) refsG = await enfRefsFor(env, enfDeptsOf(AG), null); gv = enfProjectStr(AG, gk, gv, refsG); } catch (eGP) { continue; } }   /* fail-closed: لا قيمةَ ولا رقم — كمن لا يقرأ */
    if (rdG && gv != null) gv = privOut(AG, gk, gv);   /* PRIVACY batch (019u): bassam_perms_v1 by units/targets · personal fields by purpose */
    got[gk] = { v: gv, rev: rvG[gk] || 0 };
  }
  var outG = { ok: 1, v: await curRev(env), keys: got }; if (moreG) outG.more = 1;
  /* مراجعةُ التكامل W1-R1: بصمةُ العدسة التي أُسقطت بها قائمةُ الحسابات المُرجَعة (054 usersLensFp) — يعيدها العميلُ مع حفظها · لا شيءَ لمدير النظام */
  if (got[K_USERS] && got[K_USERS].v != null) { var usG = usersLensFp(AG); if (usG) outG.uscope = usG; }
  if (got[K_PERM] && got[K_PERM].v != null) { var psG = privPermsFp(AG); if (psG) outG.pscope = psG; }   /* PRIVACY batch (019u): the registry projection's fingerprint, echoed on save */
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
    /* V7-F · owner decision 2: the image sweep runs after every accepted write — the typed/atomic save path included (054 imgSweep: a small batch, after the response when waitUntil exists) */
    if ((m0 === 'POST' || m0 === 'PUT' || m0 === 'DELETE') && res0 && res0.status === 200 && url0.pathname.indexOf('/api/') === 0 && url0.pathname.indexOf('/api/img/') !== 0 && url0.pathname !== '/api/login') await (url0.pathname === '/api/reset' ? imgSweepLater(env, IMG_SWEEP_RESET, 0, IMG_SWEEP_DEAD_ADMIN) : imgSweepLater(env, IMG_SWEEP_SAVE));   /* one compare-and-set per write; a pass at most once per IMG_SWEEP_EVERY · a reset condemns every R2 image (019e) and forces its first pass (chunked: every chunk R2 confirmed is finished, whatever cuts the invocation) */
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
      /* V7 · د5-هـ: لا إصدارَ للخادم في الهوية العامة (لا يقرؤه عميل؛ الواجهةُ تحمل KIVO.__BS_VER وrelease_check يقرأ الحزمة) */
      if (path === '/api/brand') return json({ ok: 1, brand: brandPublic(await platGet(env)), rk: (await metaGet(env, 'rk')) ? 1 : 0 });

      if (path === '/api/ping') {
        var us0 = await usersList(env), pingOut = { ok: 1, cf: 1, fresh: isVirgin(us0) ? 1 : 0 };   /* V7 · د5-هـ: الإصدارُ والالتزام (002 WORKER_VER · WORKER_COMMIT) في فرع مدير النظام وحده */
        /* KIVO_244 · AUD-004: الأعدادُ (الحسابات · الجلسات · المراجعة) لمدير النظام وحده — لا إفشاءَ بلا جلسة؛ وفي وضع الحماية النبضُ المختصر فقط */
        /* KIVO_261 · SOT-145 (الجاهزية): في وضع الحماية الخادمُ حيٌّ (ok:1) لكنه غيرُ جاهز — كلُّ قراءةٍ وكتابة 503 — فيُعلَن ready:0 · mode:'protect'
           (كان النبضُ «ok:1» وحده فلا يفرّق المراقبُ بين السليم والمعطَّل) · ولمدير النظام: schemaOk = المخطّطُ المختوم في D1 = المعروفُ لهذا الإصدار */
        if (env.__enfm && env.__enfm.mode === 'unavailable') { pingOut.ready = 0; pingOut.mode = 'protect'; }
        else {
          var sP = await session(env, request), aP = sP ? await actorOf(env, sP.uid) : null;
          if (aP && aP.u && aP.u.role === 'super') { var sc = await env.DB.prepare('SELECT COUNT(*) AS n FROM sess').first(); pingOut.users = us0 ? us0.length : 0; pingOut.rev = await curRev(env); pingOut.sess = sc ? sc.n : 0; pingOut.schema = KIVO_SCHEMA_VERSION; pingOut.schemaDb = await metaGet(env, 'schema_version'); pingOut.schemaOk = String(pingOut.schemaDb) === String(KIVO_SCHEMA_VERSION) ? 1 : 0; pingOut.ready = pingOut.schemaOk; pingOut.ver = WORKER_VER; pingOut.commit = WORKER_COMMIT; }   /* KIVO_249: إصدارُ المخطّط (المعروف · المختوم في meta) لمدير النظام */
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
      /* V7 · د5-هـ (x1): «شاشة العرض» (role:'display') تقرأ وحدها — كلُّ طلبٍ مغيِّر يُرفض هنا قبل أيّ معالج (الحفظ · المساراتُ المكتوبة · الصور ·
         التنبيهات · الاستدراك) مهما حمل الجسم؛ ولا يبقى لها إلا إنهاءُ جلساتها هي (والخروجُ مسارٌ عام قبل هذا) */
      if (uLive.role === 'display' && request.method !== 'GET' && request.method !== 'HEAD' && path !== '/api/me/sess/kill' && path !== '/api/me/sess/kill-one') {
        logEv('warn', 'display-write', { rid: env.__rid, p: path, st: 403 });
        return json({ ok: 0, err: 'forbidden', why: 'display' }, 403);
      }

      /* ── مساراتُ الجلسة: whoami · «صفحتي» · جلساتي · فحصُ كلمة المرور — workers/parts/062a-auth-routes.js (SOT-096) ── */
      var nbS = await bodyNone(request, path, 'session'); if (nbS) return nbS;   /* KIVO_264 · SOT-101: «بلا جسم» (051b) */
      var authSes = await authSessionRoutes(request, env, path, ss);
      if (authSes) return authSes;

      /* ── الحفظ المركزي — قلب المنظومة ── */
      if (path === '/api/notifications' || path === '/api/notifications/act' || path === '/api/notifications/export') return await nfRoute(env, request, url, ss);
      if(path === '/api/backup/restore')return await rsRoute(env,request,url,ss);if(path === '/api/admin/dept-wipe'||path === '/api/admin/dept-delete')return await rsWipeRoute(env,request,url,ss);if(path === '/api/employees/transition')return await rsEmployeeRoute(env,request,url,ss);
      if (path === '/api/custody' || path === '/api/custody/act' || path === '/api/custody/export') return await cuRoute(env, request, url, ss);
      if (path === '/api/irshad' || path === '/api/irshad/act' || path === '/api/irshad/export') return await irRoute(env, request, url, ss);
      if (path === '/api/seized' || path === '/api/seized/act' || path === '/api/seized/export') return await bdRoute(env, request, url, ss, 'seized');
      if (path === '/api/award' || path === '/api/award/act' || path === '/api/award/export') return await bdRoute(env, request, url, ss, 'awards');
      if (path === '/api/dstats') return await dsDomainRoute(env, request, url, ss);
      /* RISHAD266: توليدُ المواعيد المتكررة ومسحُ المواعيد (التذكير · التأخر · الانقضاء) تشغيلُ نظامٍ يجري عند قراءة مخزن مهام الإدارة — كما كان طلبُ الصفحة المحذوف.
         يجري بعد أن تقبل القراءةُ نفسُها الطلبَ (الطريقة · الجلسة uid · المفاتيح · الصلاحية: 019r) ولم تحجب مفتاحَ المهام عن القارئ، وبالحارس المشترك 074؛
         فالطلبُ المرفوض لا يمسّ شيئاً. وإن جرى عملٌ أُعيدت القراءةُ ليصل أثرُه في الردّ نفسِه */
      if (path === '/api/operations/read') { var rsp = await opReadRoute(env,request,url,ss), tkRd = /(?:^|,)bsdept:([^,:]+):bassam_tasks_v1(?:,|$)/.exec(url.searchParams.get('keys') || ''), d9 = tkRd && tkRd[1];
        if (d9 && rsp.status === 200 && typeof tkLazyJobs === 'function' && (Date.now() - (TK_REC_LAST[d9] || 0) >= TK_REC_GAP || Date.now() - (TK_DUE_LAST[d9] || 0) >= TK_DUE_GAP)) try {
          var jr = await rsp.clone().json(), r0 = TK_REC_LAST[d9], u0 = TK_DUE_LAST[d9];
          if (jr.ok === 1 && (jr.denied || []).indexOf(tkK(d9)) < 0) { await tkLazyJobs(env, request, d9, true); if (TK_REC_LAST[d9] !== r0 || TK_DUE_LAST[d9] !== u0) rsp = await opReadRoute(env,request,url,ss); }
        } catch (eTk) { swallow('tk-lazy-read', eTk, env.__rid); }
        return rsp; }
      if (path === '/api/operations/export') return await opExport(env,request,url,ss);
      if (path === '/api/save' && request.method === 'POST') return await saveRoute(env, request, path, ss);

      /* ── ماذا تغيّر منذ نسختي؟ — تستعمله لافتة «تحديثات جديدة» ── */
      if (path === '/api/changes') return await changesRoute(env, url, ss);

      /* R196 · Phase 3 — نافذةُ الاستدراك (حالةٌ خادمية؛ قاعدةُ الرفض على الكتابات ظلٌّ فقط) */
      if (path === '/api/retro') {
        var retroMismatch = sessUidMismatch(env, url, ss, path); if (retroMismatch) return retroMismatch;
        var AR = await actorOf(env, ss.uid);
        if (!AR) return json({ ok: 0, err: 'session' }, 401);
        if (request.method === 'POST') { var rlR = await rlHit(env, 'sv', AR.u.id, RL_SAVE); if (rlR) return tooMany(rlR); }
        return await retroApi(env, request, AR, url, reqMeta(request));
      }
      /* ═══ شاشة مدير النظام: الحضور · الجلسات · الأمن · السياسات · الملخّص ═══ */
      var isAdminPath = path === '/api/presence' || path === '/api/sec' || path === '/api/sess/kill' || path === '/api/guard' || path === '/api/guard/unlock' || path === '/api/policy' || path === '/api/overview'
        || path === '/api/recovery' || path === '/api/recovery/new' || path === '/api/reset' || path === '/api/permv2' || path === '/api/identity-rehearsal';
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
          /* V7 · د5-هـ (44): تقريرُ السجلّ وروابطه (التحقق · الأعداد · النطاق · الحراسة · البناء) — عدّاداتُ القياس الظلّية (PERMV2 · PERMV3 · PERMV4) حُذفت معها */
          if (!REG_VALIDATION) { try { REG_VALIDATION = KIVO_REGISTRY.validate(); } catch (e9) { REG_VALIDATION = { ok: false, err: String(e9 && e9.message || e9) }; } }
          var scopeV = null; try { scopeV = KIVO_SCOPE.validate(); } catch (e4v) { scopeV = { ok: false, err: String(e4v && e4v.message || e4v) }; }
          return json({ ok: 1, version: KIVO_REGISTRY.version, docSha256: KIVO_REGISTRY.docSha256, status: KIVO_REGISTRY.status, phase: 4.1, mode: 'shadow', worker: WORKER_VER, counts: KIVO_REGISTRY.counts, validation: REG_VALIDATION,
                        scope: { version: KIVO_SCOPE.version, docSha256: KIVO_SCOPE.docSha256, phase: KIVO_SCOPE.phase, mode: KIVO_SCOPE.mode, dims: KIVO_SCOPE.DIMS, counts: KIVO_SCOPE.counts, validation: scopeV, migration: KIVO_SCOPE.migration, interpretations: KIVO_SCOPE.interpretations, conflicts: KIVO_SCOPE.conflicts, terminology: KIVO_SCOPE.terminology, readPolicy: KIVO_SCOPE.readPolicy, readBudgetPolicy: KIVO_SCOPE.readBudgetPolicy, bindings: KIVO_SCOPE.bindings.length,
                                 identityRehearsal: { endpoint: '/api/identity-rehearsal', version: KIVO_IDENTITY_MIGRATION.version, docSha256: KIVO_IDENTITY_MIGRATION.docSha256, phase: KIVO_IDENTITY_MIGRATION.phase, mode: KIVO_IDENTITY_MIGRATION.mode, writes: 0, classes: KIVO_IDENTITY_MIGRATION.classes, auto: KIVO_IDENTITY_MIGRATION.auto, pending: KIVO_IDENTITY_MIGRATION.pending, thresholds: KIVO_IDENTITY_MIGRATION.model && KIVO_IDENTITY_MIGRATION.model.thresholds || null, sidClosureGates: KIVO_IDENTITY_MIGRATION.sidClosureGates || null, gates: (KIVO_IDENTITY_MIGRATION.gatesSpec || []).length, validation: (function () { try { return KIVO_IDENTITY_MIGRATION.validate(); } catch (eIV) { return { ok: false, err: String(eIV && eIV.message || eIV) }; } })() },
                                 readBindings: { meta: KIVO_SCOPE.readBindings.meta, byResource: KIVO_SCOPE.readBindings.byResource, special: KIVO_SCOPE.readBindings.special, noReadKey: KIVO_SCOPE.readBindings.noReadKey, readKindOutsideRoutes: KIVO_SCOPE.readBindings.readKindOutsideRoutes || [] }, readBindingCheck: (function () { try { return permv4ReadBindingCheck(); } catch (e4c) { return { ok: false, err: String(e4c && e4c.message || e4c) }; } })()},
                        guards: { version: KIVO_GUARDS.version, phase: KIVO_GUARDS.phase, mode: KIVO_GUARDS.mode, counts: KIVO_GUARDS.counts, covers: KIVO_GUARDS.covers, bindings: KIVO_GUARDS.bindings.length, shadowOnly: KIVO_GUARDS.shadowOnly.length, decisions: KIVO_GUARDS.decisions.length },
                        build: { version: KIVO_BUILD.version, phase: KIVO_BUILD.phase, mode: KIVO_BUILD.mode, counts: KIVO_BUILD.counts, bindings: KIVO_BUILD.bindings.map(function (x) { return { key: x.key, group: x.group, status: x.status, impl: x.impl }; }), lenses: KIVO_BUILD.LENSES, importRes: KIVO_BUILD.IMPORT_RES, retroMaxH: KIVO_BUILD.RETRO_MAX_H } });
        }
        /* RISHAD-266: /api/scope-dryrun (R200 · جردُ سقف النطاق القديم) أُزيل مع تقاعده، وتمهيدُ الهوية (/api/identity-preflight) مع 011/012/015/016 (RISHAD-266 P6) */
        /* R202 · Phase 4.4 — Identity Migration Rehearsal (مدير النظام وحده · GET · قراءةٌ فقط · writes = 0): يحمّل بيانات D1 الفعلية (الإدارات · الحسابات · الخطة · الجولات · الموظفون) ونصوصَها الخام وأرقامَ مراجعاتها
           ويستدعي KIVO_IDENTITY_MIGRATION.rehearse ببذرةٍ آمنة (crypto.getRandomValues · 32 بايت؛ أو seed=<64 hex> في الاستعلام لإعادة إنتاج بروفةٍ سابقة حرفاً بحرف) — لا يكتب شيئاً في D1 ولا يمسّ أي حكم؛ الناتجُ مجموعةُ كتابةٍ مقترحة وتصنيفُ نسبٍ وتصميمُ رجوع فحسب */
        if (path === '/api/identity-rehearsal') {
          if (!superX) return json({ ok: 0, err: 'لمدير النظام وحده' }, 403);
          if (request.method !== 'GET') return json({ ok: 0, err: 'rehearsal is read-only (GET)' }, 405);
          try {
            var captureR = await opCaptureReferences(env, await kvAll(env, 'kv')), keysR = captureR.keys, revsR = Object.assign({},await revsAll(env),captureR.revs), IR = enfIdentInput(keysR);
            var seedQ = String(url.searchParams.get('seed') || ''), seedR = '', seedSrcR = 'crypto.getRandomValues';
            if (/^[0-9a-f]{64}$/i.test(seedQ)) { seedR = seedQ.toLowerCase(); seedSrcR = 'query (replay)'; }
            else { var sbR = new Uint8Array(32), sbi; crypto.getRandomValues(sbR); for (sbi = 0; sbi < 32; sbi++) seedR += (sbR[sbi] < 16 ? '0' : '') + sbR[sbi].toString(16); }
            var rpR = KIVO_IDENTITY_MIGRATION.rehearse({ depts: IR.depts, users: IR.users, byDept: IR.byDept }, { seed: seedR, seedSource: seedSrcR, now: nowX, today: dsToday(nowX), raw: IR.raw, revs: revsR });
            if (captureR.guards.length) await env.DB.batch(captureR.guards);
            return json({ ok: 1, worker: WORKER_VER, rehearsal: rpR });
          } catch (eIR) { return json({ ok: 0, err: String(eIR && eIR.message || eIR) }, 500); }
        }
        /* الحضور: كل جلسة حيّة مع صاحبها وآخر نشاطه وجهازه */
        if (path === '/api/presence') {
          var rs = await env.DB.prepare('SELECT tok, uid, ts, la, dev, city FROM sess WHERE la > ?1').bind(nowX - IDLE_MAX).all();
          var rows = ((rs && rs.results) || []).filter(function (r) { return scopeOk(byId[r.uid]) && !(byId[r.uid] && byId[r.uid].role === 'display'); });   /* V7 · د5-هـ (x1): شاشةُ العرض ليست حضوراً */
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
          var gkN = 'pw:' + AX.u.id, rkPrev = await metaGet(env, 'rk');   /* V7 · د5-هـ: المفتاحُ السابق كما قُرئ أوّلَ الطلب — يُحرس في الدفعة */
          if (await guardLeft(env, gkN) > 0) return json({ ok: 0, err: 'محاولات كثيرة — انتظر قليلاً' });
          var okN = await verifyPw(String(bn.pw == null ? '' : bn.pw), AX.u.ph);
          if (okN === 'unsupported') return json({ ok: 0, err: ERR_ITER });
          if (okN !== true) { await guardFail(env, gkN); return json({ ok: 0, err: 'كلمة المرور غير صحيحة' }); }
          await guardReset(env, gkN);
          var keyN = newRecoveryKey(), hN = await hashKey(keyN), rmN = reqMeta(request);
          /* المفتاح يفتح حساب مدير النظام الرئيسي (لا الاحتياطي) */
          var mainSu = AX.users.filter(function (x) { return x.role === 'super' && !x.bk; })[0] || AX.u;
          /* V7 · د5-هـ (أمن ٢): إصداران متزامنان ⇒ واحدٌ يفوز والآخر 409 — لا يُعرض مفتاحٌ أبطله إصدارٌ آخر صامتاً */
          try { await env.DB.batch([
            rkGuard(env, rkPrev),
            env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rk', hN),
            env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rk_uid', mainSu.id),
            env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rk_meta', JSON.stringify({ ts: nowX, by: AX.u.un, uid: mainSu.id })),
            env.DB.prepare('DELETE FROM meta WHERE k = ?1').bind('rk_used')
          ]); } catch (eN) { if (isRkConflict(eN)) return json({ ok: 0, err: 'تغيّر مفتاح الاستعادة أثناء الإصدار (إصدارٌ آخر أو استعمال) — لم يُنشأ مفتاح، أعد التحميل', why: 'rk-changed' }, 409); throw eN; }
          await secLog(env, { uid: AX.u.id, un: AX.u.un, act: 'recovery_key', detail: 'new', ip: rmN.ip, city: rmN.city, dev: rmN.dev });
          return json({ ok: 1, key: keyN, uid: mainSu.id, un: mainSu.un });
        }
        /* ── تهيئة منصة جديدة: مسح كامل بتأكيد مزدوج ── */
        if (path === '/api/reset' && request.method === 'POST') return await rsResetRoute(env,request,path,url,AX,superX);
        if (path === '/api/policy') {
          if (request.method === 'POST') {
            var rbp = await bodyRead(request, path); if (rbp.res) return rbp.res; var bp = rbp.v;   /* KIVO_264 · SOT-101 · E5: null كان 500 */
            /* CORE-02 (B2): a value outside its range is refused by name (400 policy-invalid) — it was clamped or dropped silently while the
               answer said «saved». Same ranges as before; a field left out keeps the current value; pwMin stays fixed at 6 (KIVO_259). */
            var badP = policyBad(bp); if (badP) return json(Object.assign({ ok: 0, err: 'policy-invalid' }, badP), 400);
            var np = {}; Object.keys(POLICY_DEF).forEach(function (k) { var v = +bp[k]; if (isFinite(v) && v > 0) np[k] = v; });
            np.sessH = Math.min(72, Math.max(1, np.sessH || POL.sessH)); np.idleH = Math.min(24, Math.max(0.25, np.idleH || POL.idleH));
            np.lockN = Math.min(20, Math.max(3, np.lockN || POL.lockN)); np.lockMin = Math.min(60, Math.max(1, np.lockMin || POL.lockMin)); np.pwMin = 6;   /* KIVO_259 (إصلاح — كشفه التدقيقُ المستقل): رقمُ مدير النظام 6 أرقام بالضبط (pwCheck) — كان المدخلُ يُقبل حتى 32 فيجعل كلَّ رقمٍ غيرَ صالح (قفلٌ تامّ) */ np.wrMin = Math.min(5000, Math.max(30, np.wrMin || POL.wrMin));   /* KIVO_255 · SOT-139 */
            /* v7-C · Issue 2 (ب): thrOn يقبل الصفر (إطفاء) — الحلقةُ أعلاه تُسقط الصفر؛ المتروكُ يبقى على قيمته */
            np.thrOn = bp.thrOn === undefined || bp.thrOn === null ? (POL.thrOn === 1 ? 1 : 0) : ((bp.thrOn === 1 || bp.thrOn === '1') ? 1 : 0);   /* the admin form posts its fields as text, like every other knob here (+bp[k]); true / 2 / '01' stay off */
            np.dispH = Math.min(72, Math.max(1, np.dispH || POL.dispH || POLICY_DEF.dispH));   /* V7 · د5-هـ (x1): مدةُ جلسة شاشة العرض — بحدود sessH */
            np.thrN = Math.min(100, Math.max(5, np.thrN || POL.thrN)); np.thrWin = Math.min(120, Math.max(5, np.thrWin || POL.thrWin)); np.thrSec = Math.min(10, Math.max(1, np.thrSec || POL.thrSec));
            await env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('policy', JSON.stringify(np)).run();
            var rmP = reqMeta(request);
            await secLog(env, { uid: AX.u.id, un: AX.u.un, act: 'policy_change', detail: JSON.stringify(np), ip: rmP.ip, city: rmP.city, dev: rmP.dev });
            return json({ ok: 1, policy: np });
          }
          return json({ ok: 1, policy: POL });
        }
        /* ملخّص نظرة عامة */
        if (path === '/api/overview') {
          if (superX) await imgSweepLater(env, IMG_SWEEP_ADMIN, IMG_SWEEP_EVERY_ADMIN, IMG_SWEEP_DEAD_ADMIN);   /* V7-F · owner decision 2: the admin's overview also asks for a pass (a larger batch, at most one a minute) — never waited for when the runtime gives waitUntil */
          var day0 = new Date(nowX); day0.setHours(0, 0, 0, 0); var dayTs = day0.getTime();
          var overviewDepartments = superX ? AX.depts.filter(function (d) { return d && typeof d.id === 'string' && d.id; }).map(function (d) { return d.id; }) : [];
          var overviewAccounts = superX ? AX.users.filter(function (u) { return u && u.role === 'staff' && typeof u.deptId === 'string' && typeof u.ekey === 'string' && u.ekey; })
            .map(function (u) { return [u.deptId, u.ekey]; }) : [];
          var overviewEmployeeSpec = opPrepared('bassam_employees_v1').resources.bassam_employees_v1.spec;
          /* Registered employee-array entries include the accepted string
             union branch. Names/IDs stay in typed columns. A manager without an
             employee row cannot reduce the number of employees without accounts.
             Keep independent aggregates in the existing two read batches. */
          var overviewReads = await Promise.allSettled([
            env.DB.batch([
              env.DB.prepare('SELECT COUNT(*) AS n FROM sec WHERE act = ?1 AND ts >= ?2').bind('login_fail', dayTs),
              env.DB.prepare('SELECT COUNT(*) AS n FROM sec WHERE act = ?1 AND ts >= ?2').bind('denied', dayTs),
              env.DB.prepare("SELECT COUNT(*) AS n FROM guard WHERE until > ?1 AND gk NOT LIKE 'rl:%'").bind(nowX),
              /* V7 · د5-هـ (x1): شاشاتُ العرض ليست حضوراً */
              env.DB.prepare('SELECT COUNT(*) AS n FROM sess WHERE la > ?1 AND uid NOT IN (SELECT value FROM json_each(?2))').bind(nowX - PRESENCE_MS, JSON.stringify(AX.users.filter(function (u) { return u && u.role === 'display'; }).map(function (u) { return u.id; }))),
              env.DB.prepare('SELECT COUNT(*) AS n FROM sess WHERE la > ?1 AND uid NOT IN (SELECT value FROM json_each(?2))').bind(nowX - IDLE_MAX, JSON.stringify(AX.users.filter(function (u) { return u && u.role === 'display'; }).map(function (u) { return u.id; }))),
              env.DB.prepare('SELECT uid, MAX(ts) AS t FROM sec WHERE act = ?1 GROUP BY uid').bind('login_ok'),
              env.DB.prepare('SELECT un, COUNT(*) AS n, MAX(ts) AS t, MAX(city) AS city, MAX(dev) AS dev, MAX(detail) AS detail FROM sec WHERE act = ?1 AND ts >= ?2 GROUP BY un ORDER BY n DESC LIMIT 20').bind('login_fail', dayTs),
              env.DB.prepare('SELECT ts, uid, un, target FROM sec WHERE act = ?1 AND ts >= ?2 ORDER BY ts DESC LIMIT 200').bind('acct_add', nowX - 30 * 86400000),
              env.DB.prepare('SELECT ts, uid, un, target FROM sec WHERE act = ?1 ORDER BY ts DESC LIMIT 100').bind('acct_freeze'),
              env.DB.prepare('SELECT uid, COUNT(*) AS n, MAX(ts) AS t FROM sec WHERE act = ?1 AND ts >= ?2 GROUP BY uid ORDER BY n DESC LIMIT 10').bind('denied', dayTs),
              env.DB.prepare('SELECT gk, n, until FROM guard WHERE until > ?1').bind(nowX),
              env.DB.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(CASE WHEN json_array(i.department_id,' +
                "COALESCE(s.value_text,NULLIF(e.f_eid_text,''),NULLIF(e.f_nid_text,''),e.f_name_text,'')) NOT IN " +
                '(SELECT json(a.value) FROM json_each(?2) a) THEN 1 ELSE 0 END),0) AS noAccount ' +
                'FROM ops_nodes i JOIN ops_nodes r ON r.department_id=i.department_id AND r.resource=i.resource AND r.row_key=i.parent_key AND r.parent_key IS NULL AND r.node_kind=4 ' +
                "LEFT JOIN ops_employee_record e ON e.department_id=i.department_id AND e.resource=i.resource AND e.row_key=i.row_key||'/v:'||i.variant " +
                'LEFT JOIN ' + overviewEmployeeSpec.entry.choices[0].entityTable + " s ON s.department_id=i.department_id AND s.resource=i.resource AND s.row_key=i.row_key||'/v:'||i.variant " +
                "WHERE i.resource='bassam_employees_v1' AND i.schema_id=?3 AND r.schema_id=?4 AND i.department_id IN(SELECT d.value FROM json_each(?1) d)")
                .bind(JSON.stringify(overviewDepartments), JSON.stringify(overviewAccounts), overviewEmployeeSpec.entry.table, overviewEmployeeSpec.table)
            ]),
            env.DB.batch([
              env.DB.prepare('SELECT st, COUNT(*) AS n FROM imgown GROUP BY st'),
              env.DB.prepare("SELECT COUNT(DISTINCT k) AS n FROM imgs WHERE k NOT LIKE ?1 AND k NOT IN (SELECT img FROM imgown WHERE st = 'dead')").bind(IMG_STG + '%'),
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
          var frozen = ov[8], deniedBy = ov[9], guards = ov[10], employeeOverview = firstOv(11);
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
            imgDiag = { r2: !!imgBucket(env), stored: stored9 ? stored9.n : 0, staged: staged9 ? staged9.n : 0, counts: cnt9, grace: IMG_ORPHAN_GRACE, claimGrace: IMG_CLAIM_TTL,
              claims: ((claims9 && claims9.results) || []).map(function (r) { return { img: r.img, uid: r.uid, name: nameOf(r.uid), dept: r.dept, ts: r.ts }; }),
              orphans: ((orph9 && orph9.results) || []).map(function (r) { return { img: r.img, dept: r.dept, ts: r.ts }; }) };
          } catch (eI9) { imgDiag = { err: errMsg(eI9) }; }
          return json({ ok: 1, now: nowX, policy: POL, oldHash: oldHash, imgs: imgDiag,
            failsToday: f1 ? f1.n : 0, deniedToday: d1 ? d1.n : 0, lockedNow: l1 ? l1.n : 0, activeNow: s1 ? s1.n : 0, sessions: sN ? sN.n : 0,
            employeeCount: superX ? employeeOverview.n : null, employeeNoAccountCount: superX ? employeeOverview.noAccount : null,
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
      if (enfEnvOn(env) && (path === '/api/authz-test' || path === '/api/demo-data') && request.method === 'POST') {
        var ATS = await actorOf(env, ss.uid); if (!ATS) return json({ ok: 0, err: 'session' }, 401);
        return await enfTestApi(this, env, request, ATS, url);
      }
      /* ── سحب مفاتيح بعينها بأحدث قيمها — للتحديث الحي بلا إعادة تحميل ── */
      /* V7 · د5-هـ (44): «اختبار الوصول» و«سجل الصلاحيات» — للقراءة فقط (مديرُ المنصة أو مديرُ الوحدة) — 057b perm44Route */
      if (path === '/api/perm44/check' || path === '/api/perm44/log') {
        var AP44 = await actorOf(env, ss.uid); if (!AP44) return json({ ok: 0, err: 'session' }, 401);
        return await perm44Route(env, request, url, AP44, path);
      }
      if (path === '/api/get') return await getRoute(env, url, ss);

      /* ── سجل التدقيق: من غيّر ماذا ومتى — لمدير النظام، ولمدير الإدارة على مفاتيح إدارته ── */
      /* ══ R169: سجلُّ الأنشطة والتغييرات — استعلامٌ مرشَّحٌ مرقَّم، والنطاقُ يُفرض هنا لا في الواجهة ══ */
      if (path === '/api/aud') {
        /* R169-CC: السجلُّ إلحاقٌ فقط — القراءةُ وحدَها تُقبل على هذه النقطة، ولا طريقَ فيها لتعديلٍ أو حذف */
        if (request.method !== 'GET') return json({ ok: 0, err: 'read-only' }, 405);
        var AU = await actorOf(env, ss.uid);
        if (!AU) return json({ ok: 0, err: 'session' }, 401);
        var qA = url.searchParams;
        /* بدايةُ تشغيل المنصة لتنبيه «لم تُنشأ نسخة احتياطية» (sy_nobk): آخرُ تهيئةٍ للمنصة إن وُجدت (السجلُّ يبقى بعدها) وإلا أقدمُ حدثٍ في السجلّ —
           مرجعٌ سحابيٌّ للقراءة وحدها، لمدير النظام وحده */
        if (qA.get('first') === '1') {
          if (AU.u.role !== 'super') return json({ ok: 0, err: 'forbidden' }, 403);
          var fA = await env.DB.prepare("SELECT COALESCE((SELECT MAX(ts) FROM aud WHERE k = 'system' AND etype = 'system' AND act = 'reset'), (SELECT MIN(ts) FROM aud)) AS t").first();
          return json({ ok: 1, first: (fA && fA.t) || 0 });
        }
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
        /* V7-F · owner decision 4: one refusal for every id the caller is not entitled to (no such id · orphan · another's upload · another unit's image) —
           the reason is named only to the image's own unit (imgNo); an id his own record mentions with nothing behind it is MISSING (404), as a lost body is */
        if (!vI.ok && vI.why === 'missing') return new Response('', { status: 404, headers: { 'Cache-Control': 'no-store' } });
        if (!vI.ok) return json(vI.open ? { ok: 0, err: 'forbidden', why: vI.why } : { ok: 0, err: 'forbidden' }, 403);
        if (vI.dead && mode === 'read') return new Response('', { status: 404, headers: { 'Cache-Control': 'no-store' } });   /* condemned by the sweep: gone, for the platform admin too */
        if (request.method === 'PUT') {
          /* V7-F (independent review, finding 2): an id outside the upload shape never becomes a row — judged AFTER the verdict, so a caller with no right to upload
             gets the one refusal above whatever the id looks like, and the 400 says nothing the caller did not type himself */
          if (!IMG_ID_RX.test(ik)) return json({ ok: 0, err: 'img-id' }, 400);
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
            if (pI === 0) { stP.push(env.DB.prepare('DELETE FROM imgs WHERE k LIKE ?1').bind(sgK + '%')); stP.push(imgStageStmt(env, ik)); }   /* رفعٌ سابقٌ مهجور · V7-F: the staged parts get a clock (054 IMG_STAGE_TTL) */
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
            var lsC = vI.dead ? await imgDeadTake(env, ik) : -1; if (lsC === 0) return json({ ok: 0, err: 'img-busy' }, 409, { 'Retry-After': '20' });
            /* V7-F (finding 6): the owner row is written BEFORE the object and before the body rows — whatever fails afterwards (the R2 put, a later batch of
               a large inline body) leaves a row with a clock that the sweep condemns, never an object or rows nothing points at */
            if (lsC < 0) await ownStmt(env, ik, 'claim', '', AI.u.id, String(AI.u.deptId || '')).run();
            var stC = await imgStoreStmts(env, ik, allP);
            if (lsC > 0) stC.push(imgDeadFlip(env, ik, lsC, AI.u.id, String(AI.u.deptId || '')));
            stC.push(env.DB.prepare('DELETE FROM imgs WHERE k LIKE ?1').bind(sgK + '%'));
            stC.push(imgStageDropStmt(env, ik));
            for (var j9 = 0; j9 < stC.length; j9 += 90) await env.DB.batch(stC.slice(j9, j9 + 90));
            return json({ ok: 1, n: allP.length, parts: nI });
          }
          if (!imgTypeOk(txtI)) return json({ ok: 0, err: IMG_TYPE_ERR }, 415);   /* KIVO_261 · SOT-068 */
          var lsI = vI.dead ? await imgDeadTake(env, ik) : -1; if (lsI === 0) return json({ ok: 0, err: 'img-busy' }, 409, { 'Retry-After': '20' });   /* V7-F: the sweep is deleting this id's old object right now */
          /* رفعٌ لم يُربط بعد: يُسجَّل صاحبه مؤقتاً حتى أول ربطٍ مشروع بمورد — V7-F (finding 6): before the object is written, so a failed batch leaves no object without a row */
          if (lsI < 0) await ownStmt(env, ik, 'claim', '', AI.u.id, String(AI.u.deptId || '')).run();
          var stI = await imgStoreStmts(env, ik, txtI);
          if (lsI > 0) stI.push(imgDeadFlip(env, ik, lsI, AI.u.id, String(AI.u.deptId || '')));
          for (var jI = 0; jI < stI.length; jI += 90) await env.DB.batch(stI.slice(jI, jI + 90));
          return json({ ok: 1, n: txtI.length });
        }
        if (request.method === 'DELETE') {
          await imgDropR2(env, ik);
          await env.DB.batch([env.DB.prepare('DELETE FROM imgs WHERE k = ?1').bind(ik),
            imgStageRowsStmt(env, ik), imgStageDropStmt(env, ik),
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
      for (var retiredIr in keys) if (irLegacyKey(retiredIr)) delete keys[retiredIr];
      for (var retiredBusiness in keys) if (bdLegacyKey(retiredBusiness)) delete keys[retiredBusiness];
      for (var retiredOperational in keys) if (opIsResource(retiredOperational)) delete keys[retiredOperational];
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
      if (keys[K_USERS] != null) { await privPrepDepts(env, AB, (AB.depts || []).map(function (x) { return x && x.id; })); keys[K_USERS] = usersScopeOut(keys[K_USERS], AB); }   /* 019u (9) */
      var rvB = await revsAll(env), revsOut = {};
      var enfRB = AB.enf ? await enfRefsFor(env, enfDeptsOf(AB), keys) : null;
      for (var bk in keys) {
        var okB = canRead(AB, bk);
        /* D4‑01 (v24.5): ظلُّ نطاق القراءة — بعد الحكم، على القيمة كما ستُحقن أو كما كانت ستُحذف؛ لا يمسّ keys ولا الحكم */
        if (!okB) { delete keys[bk]; continue; }
        if (AB.enf) { try { keys[bk] = enfProjectStr(AB, bk, keys[bk], enfRB); } catch (eBP) { delete keys[bk]; continue; } }
        keys[bk] = privOut(AB, bk, keys[bk]);   /* PRIVACY batch (019u): SV01 — the permissions registry by units/targets */
        revsOut[bk] = rvB[bk] || 0;
      }
      boot = { srv: 1, cf: 1, v: await curRev(env), uid: s3.uid, keys: keys, revs: revsOut, rk: (await metaGet(env, 'rk')) ? 1 : 0 };
      if (AB.enf) boot.authz = enfMe(AB, enfRB);                                     /* KIVO_243: المفاتيحُ المحمولة لكل إدارة · العدسات · النطاق */
      if (keys[K_USERS] != null) { var usB = usersLensFp(AB); if (usB) boot.uscope = usB; }
      if (keys[K_PERM] != null) { var psB = privPermsFp(AB); if (psB) boot.pscope = psB; }   /* PRIVACY batch (019u) */   /* مراجعةُ التكامل W1-R1: بصمةُ عدسة القائمة المحقونة (054 usersLensFp) */
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
