/* ══ (5) الحفظة — سياقُ الإنفاذ لكل طلب حفظ · سياساتُ الدفعة (الاستيراد · الاستعادة) · السبب · سجلُّ قرارات الصلاحية · نسخةُ ما قبل العملية ══ */
/* KIVO_249 · AUD-022 · ADR-011: جداولُ الإنفاذ (authz · authz_snap · authz_snaps) صارت الترحيلَ 0002 في migrations/ — المخطّطُ واحدٌ في كل البيئات،
   ووجودُ الجدول لا يغيّر سلوكاً (وضعُ الإنفاذ يقرّره ENV ∧ meta.authz_mode). الاسمُ يبقى لمواضع الاستدعاء الخمسة ويعود إلى initDb. */
function enfInitDb(env) { return initDb(env); }
var ENF_LOG_MAX = 60000;
function enfLogStmt(env, r) {
  return env.DB.prepare('INSERT INTO authz (ts, uid, role, dept, k, res, keys, scope, decision, why, reason, path, mode, cid) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)')
    .bind(r.ts || Date.now(), r.uid || '', r.role || '', r.dept || '', String(r.k || '').slice(0, 160), r.res || '', String(r.keys || '').slice(0, 600), String(r.scope || '').slice(0, 600),
          r.decision, String(r.why || '').slice(0, 300), String(r.reason || '').slice(0, 300), r.path || '', r.mode || 'enforce', r.cid || '');
}
/* تقليمٌ كسول يحمي حجمَ القاعدة: كلَّ ~500 سطرٍ يُحذف ما زاد على السقف من الأقدم */
var _enfLogN = 0;
async function enfLogPrune(env) { if (++_enfLogN % 500) return; try { await env.DB.prepare('DELETE FROM authz WHERE id <= (SELECT MAX(id) FROM authz) - ?1').bind(ENF_LOG_MAX).run(); } catch (e) { swallow('authz-prune', e, env.__rid); } }
/* سطرُ قرار — يُسجَّل الرفضُ دائماً، والقبولُ حين يمسّ مفتاحاً حسّاساً (§12) أو يحمل سبباً */
function enfLogRow(A, k, v, path, meta) {
  var ix = enfIx(), keys = v.keys || [], sens = false, i;
  for (i = 0; i < keys.length; i++) if (ix.sens[keys[i]]) sens = true;
  if (v.ok && !sens && !v.reason) return null;
  var P = parseKey(k);
  return { ts: Date.now(), uid: A.u.id, role: A.u.role + (A.u.mgr ? '/mgr' : ''), dept: P.dept || '', k: k, res: resName(k), keys: enfUniq(keys.concat(v.missing || [])).join(','),
           scope: v.ok ? ('items=' + (v.items || 0)) : [(v.dims || []).join('/'), v.detail || ''].filter(Boolean).join(' · '), decision: v.ok ? 'allow' : 'deny', why: v.ok ? (v.path || 'keys') : v.why, reason: v.reason || '',
           path: path || '/api/save', cid: (meta && meta.cid) || '' };
}
function enfReasonMap(body, keysOk) {
  var w = body && body.why, out = {}, k;
  if (!isObj(w)) return out;
  for (k in w) if (keysOk[k] && typeof w[k] === 'string') { var s = w[k].trim(); if (s) out[k] = s.slice(0, 300); }
  return out;
}
/* سياقُ الإنفاذ لطلب الحفظ: سجلّاتُ النطاق وجداولُ الورديات للإدارات المعنية · الأسباب · سياساتُ الدفعة */
async function enfSavePrep(env, A, body, set, del, keysOk, markers, restoreMarker, audRestore, audHist, retroCtx, pv4Refs) {
  await enfInitDb(env);
  var depts = {}, k, i, ks = Object.keys(set || {}).concat((del || []).map(String));
  for (i = 0; i < ks.length; i++) { var d0 = parseKey(ks[i]).dept; if (d0) depts[d0] = 1; }
  if (A.u.deptId) depts[A.u.deptId] = 1;
  var refs = await enfRefsFor(env, Object.keys(depts), null);
  await enfEmpsLoad(env, refs, ks);   /* F24: هويّاتُ الفاعل في تسكين الجولات والخطة (061 enfToksOf) */
  var X = { refs: refs, why: enfReasonMap(body, keysOk), markers: markers, retroWin: retroCtx || {}, pv4: pv4Refs || {}, batchDeny: null, restore: false, snapKind: '', log: [] };
  /* D3-05: علامةُ الاستيراد — موردٌ خارج allowlist ⇒ رفضُ الدفعة · import.run محمولٌ في كل إدارةٍ تمسّها العلامة */
  var impKeys = []; for (k in markers.ops) if (markers.ops[k].op === 'import.run') impKeys.push(k);
  for (i = 0; i < impKeys.length && !X.batchDeny; i++) {
    var rn = resName(impKeys[i]), di = parseKey(impKeys[i]).dept;
    if (!KIVO_BUILD.isImportRes(rn)) X.batchDeny = { why: 'import-allowlist', detail: rn, keys: ['import.run'] };
    else if (A.u.role !== 'super' && !(rn === 'bassam_perms_v1' ? enfHeld(A, A.u.deptId || '', 'import.run') : enfHeld(A, di, 'import.run'))) X.batchDeny = { why: 'perm', missing: ['import.run'], keys: ['import.run'] };
  }
  /* F-13 / D3-03: الاستعادة = super ∨ (role:mgr ∧ backup.restore في كل إدارةٍ تمسّها الحفظة) ∧ سببٌ إلزامي */
  if (!X.batchDeny && (restoreMarker || audRestore)) {
    X.restore = true; X.snapKind = 'restore';
    var touched = {}, glob = false;
    for (i = 0; i < ks.length; i++) { var dr = parseKey(ks[i]).dept; if (dr) touched[dr] = 1; else glob = true; }
    var isSup = A.u.role === 'super', nT = Object.keys(touched).length, isMgr = !glob && nT > 0, hasKey = isSup || (!glob && nT > 0), dd;
    for (dd in touched) { if (!isMgrOf(A, dd)) isMgr = false; if (!isSup && !enfHeld(A, dd, 'backup.restore')) hasKey = false; }   /* المفتاحُ في كل إدارةٍ تمسّها الحفظة */
    var reason = (restoreMarker && restoreMarker.reason) || '', wk; if (!String(reason).trim()) for (wk in X.why) { reason = X.why[wk]; break; }
    var pol = KIVO_BUILD.restorePolicy(isSup, isMgr, hasKey, reason), fullMk = false, fk;
    /* KIVO_263 · SOT-190 (قرارُ المالك 2026-10-12): «الاستعادةُ الشاملة لمدير النظام فقط» — أيُّ علامة استعادةٍ بنطاق full من غيره تُرفض ولو مسّت مفاتيحَ إداراته وحدها */
    if (markers && markers.ops) for (fk in markers.ops) if (markers.ops[fk].op === 'backup.restore' && markers.ops[fk].scope === 'full') fullMk = true;
    if (fullMk && !isSup) X.batchDeny = { why: 'restore-policy', detail: 'full-super-only', keys: ['backup.restore'] };
    else if (!pol.ok) X.batchDeny = { why: 'restore-policy', detail: pol.why, keys: ['backup.restore'] };
    else if (pol.missingReason) X.batchDeny = { why: 'reason', reasonKeys: ['backup.restore'], keys: ['backup.restore'] };
    else X.restoreReason = String(reason).trim().slice(0, 300);
  }
  /* استيرادُ البيانات التاريخية (sys.histimp.run): لمدير النظام وحده بسبب */
  if (!X.batchDeny && audHist) {
    if (A.u.role !== 'super') X.batchDeny = { why: 'super', keys: ['sys.histimp.run'] };
    else { var hr = ''; for (wk in X.why) { hr = X.why[wk]; break; } if (!hr) X.batchDeny = { why: 'reason', reasonKeys: ['sys.histimp.run'], keys: ['sys.histimp.run'] }; else X.histReason = hr; }
  }
  return X;
}
/* سياقُ مفتاحٍ واحد تراه canWriteEnf (ctx.enf) */
function enfCtxFor(X, k, d) {
  var op = X.markers.ops[k] || null, why = X.why[k] || X.restoreReason || X.histReason || '';
  return { recs: X.refs.recs, emps: X.refs.emps, pv4: X.pv4[d] || {}, retroWin: X.retroWin, why: why, op: op, restore: X.restore };
}
/* نسخةُ ما قبل العملية (§12: «نسخة احتياطية تلقائية قبل التنفيذ» للاستعادة والاستبدال · ولكل ترحيل) */
function enfSnapId(kind) { return kind + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e9).toString(36); }
function enfSnapStmts(env, snap, kind, A, items, revs, meta) {
  var st = [], i, j;
  for (i = 0; i < items.length; i++) {
    var it = items[i], v = it.cur;
    if (v == null) { st.push(env.DB.prepare('INSERT OR REPLACE INTO authz_snap (snap, k, seq, existed, rev, v) VALUES (?1, ?2, 0, 0, ?3, NULL)').bind(snap, it.k, revs[it.k] || 0)); continue; }
    v = String(v); var n = Math.max(1, Math.ceil(v.length / CHUNK));
    for (j = 0; j < n; j++) st.push(env.DB.prepare('INSERT OR REPLACE INTO authz_snap (snap, k, seq, existed, rev, v) VALUES (?1, ?2, ?3, 1, ?4, ?5)').bind(snap, it.k, j, revs[it.k] || 0, v.slice(j * CHUNK, (j + 1) * CHUNK)));
  }
  st.push(env.DB.prepare('INSERT OR REPLACE INTO authz_snaps (snap, ts, uid, un, kind, n, meta, restored) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0)').bind(snap, Date.now(), A.u.id, '', kind, items.length, JSON.stringify(meta || {}).slice(0, 4000)));   /* بلا اسم المستخدم (بياناتٌ شخصية) — المعرّفُ يكفي */
  return st;
}
