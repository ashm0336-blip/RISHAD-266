/* ══ PRIVACY batch (SV09 · IP07 · IP10 · IP39 · SV01): least-privilege projection of personal data and of the permissions registry ══
   One place for the rule; every read route calls privOut() on the value it is about to send (both modes, every role but super),
   and applySave calls privIn() before any rule so a client that saves what it received projected never erases the hidden parts.

   (1) Employee register bsdept:<d>:bassam_employees_v1 — personal fields of a record reach only:
         super · the employee himself (record eid/nid = his account ekey) · managers of the unit (isMgrOf: dept manager, manager badge,
         gm of a branch above) · holders of a write action on the employees-data page (emp.record.create|edit · legacy emps/data add|edit).
       Everyone else who reads the register for an operational page (schedule, daily report, rounds, plan, tasks, irshad, seized,
       award, readiness, emps/data view) gets the working fields: eid, name, type, work, shift, group, job, account.
         PRIV_EMP_F: nid, phone, email, empno (initial password), contact.
       (1b) A historical record WITHOUT eid (reachable: the client gives every new record an eid, but older records were kept as they
            were — the typed codec stores eid as optional (019q ops_employee_record), the cutover 019s copies records verbatim and assigns
            none, 019c keys such a record by name) used to keep its nid, its only identity. For these readers its nid is sent as an
            opaque token 'nx:'+20 hex of SHA-256('nx|'+unit+'|'+name+'|'+ordinal among the eid-less records of that name) (privNx): it
            is derived from the name the reader already sees, never from the nid, so it cannot be reversed to the nid; it is stable
            across reads while the name is unchanged. Every exact occurrence of that nid in the references of (4) is sent as the same
            token; on save the token is mapped back to the stored nid (the record by its token in the stored register; references as
            in (4)). A token that names no stored record (stale after a rename, forged) is refused (privacy-hidden); exports carry the
            token too and are marked redacted.
         gender: kept also for readers of the monthly schedule (staff) and the daily report (dreport): both pages count and show the
                 male/female distribution of the shift (modules/staff/logic.js · modules/dreport/logic.js). Removed elsewhere.
   (2) Daily report bsdept:<d>:bassam_dreport_v1 — roster rows carry a copy of empno (pulled from the register): same rule as (1).
   (2b) Custody read (/api/custody · 019a): each row carries the holder's nid/empno snapshot — same rule as (1).
   (3) Permissions registry bassam_perms_v1 — a non-super actor receives: caps/subs/lenses of the units in his scope and their
       ancestor nodes; emps/tplOf/empLens of a unit he manages for himself and for every employee he may administer (permTargetOk ·
       018); of any other unit in scope, his own entries only. Other top-level keys (lensZ, patterns) unchanged.
       Race (privPermsFp · 054): the projection depends on the actor's rights at read time. /api/get and boot return its fingerprint
       (pscope, like uscope for the accounts list) and the client echoes it on save; a save built on another projection is a conflict
       (why perms-scope-changed) carrying the current projection — an entry that became visible after the read is never taken as deleted,
       one that left his scope is never deleted by him. A save without pscope that omits a hidden entry (a projection) AND a visible one
       is refused (perms-stale-client): it cannot be told whether the visible one was deleted or never received.
   (4) Old references by nid (staffing buckets, plan/rounds emp lists, report rows, tasks): for a reader who does not receive the
       colleague's nid, every exact occurrence of that nid (object key or scalar) is sent as the record's eid (the client resolves eid
       first, BassamEmp.entry); on save it is mapped back where the stored value held the nid, and a nid-keyed entry hidden by an eid
       entry of the same person is kept. A hidden nid sent with a value other than the stored one is refused (privacy-hidden).
   (5) Award records (019m): contact fields phone/email/comp and the search by employee number reach (1)'s audience, the person
       himself and the award-results managers (award.res.edit|approve|reject|delete|status · legacy award/res edit|approve|del).
       Exports (custody holder snapshots, award records) follow the same rules.
   (8) Closure (after 2cf985f): the employee delete context (019e GET /api/employees/transition) is projected like (1) and its commit
       (019c) restores hidden fields from storage, refusing a changed one (privEmpIn strict); the custody search (019a) matches the holder
       nid/empno snapshots only for (1)'s audience; custody holder keys that are a hidden nid (old data) are sent as the (4) token
       (privCustodyRows · privCustodyHolder maps an 'nx:' filter back); task commands resolve the token the reader got to the row's stored
       assignee key (071 tkTokBack). NOT changed: the accounts list ekey (the session/authz/permission-registry binding key) — see report.
   Write (privIn): a hidden part ABSENT from the incoming value is restored from the current value (field order of the stored record
   kept: a record equal to the stored one is the stored object); a hidden part PRESENT in the incoming value is left as sent, so the
   existing rules judge it (an unauthorised change is denied, never silently applied). Super: unchanged both ways. */
var PRIV_EMP_F = ['nid', 'phone', 'email', 'empno', 'contact'];
var PRIV_EMP_RES = 'bassam_employees_v1', PRIV_DR_RES = 'bassam_dreport_v1', PRIV_PERM_KEY = 'bassam_perms_v1';
var PRIV_PERM_EMPK = { emps: 1, tplOf: 1, empLens: 1 }, PRIV_PERM_UNITK = { caps: 1, subs: 1, lenses: 1, capOwn: 1 };   /* capOwn: caps-own per-unit mode (021) */
function privOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function privPut(o, k, v) { Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true }); }   /* «__proto__» stays data */
function privCopy(o) { var r = {}, k; for (k in o) if (privOwn(o, k)) privPut(r, k, o[k]); return r; }
/* per-actor, per-unit decision cache · one of the enforcement keys ek (or legacy 'page:act' lk) held in unit d */
function privMemo(A, slot, d, fn) { var c = A[slot] || (A[slot] = nmap()); return c[d] !== undefined ? c[d] : (c[d] = !!fn()); }
function privHeld(A, d, ek, lk) { return A.enf ? ek.some(function (k) { return enfHeld(A, d, k); }) : lk.some(function (k) { var i = k.lastIndexOf(':'); return actsHeldOn(A, d, k.slice(0, i), [k.slice(i + 1)]); }); }
/* arr.map(fn), the same array when no element changed */
function privMap(arr, fn) { var ch = 0, o = arr.map(function (x, i) { var y = fn(x, i); if (y !== x) ch++; return y; }); return ch ? o : arr; }
/* holder of the employees-data write actions, or manager of the unit */
function privPersonalOk(A, d) {
  if (!A || !A.u) return false;
  if (A.u.role === 'super') return true;
  if (!d || !deptInScope(A, d)) return false;
  return privMemo(A, '__privP', d, function () { return isMgrOf(A, d) || privHeld(A, d, ['emp.record.create', 'emp.record.edit'], ['emps/data:add', 'emps/data:edit']); });
}
/* readers of the two pages that use gender operationally (distribution of the shift) */
function privGenderOk(A, d) {
  return privPersonalOk(A, d) || privMemo(A, '__privG', d, function () { return privHeld(A, d, ['staff.view', 'report.view'], ['staff:view', 'dreport:view']); });
}
function privSelfRec(A, e) {
  var ek = String((A && A.u && A.u.ekey) || '');
  if (!ek || !isObj(e)) return false;
  return (e.eid != null && String(e.eid) === ek) || (e.nid != null && e.nid !== '' && String(e.nid) === ek);
}
/* hidden fields of record e for the actor in unit d ([] = sees all) */
function privEmpHidden(A, d, e) {
  if (!isObj(e) || privPersonalOk(A, d) || privSelfRec(A, e)) return [];
  var out = PRIV_EMP_F.slice();
  if (!privGenderOk(A, d)) out.push('gender');
  return out;
}
function privStrip(e, hid) {
  if (!hid.length || !isObj(e)) return e;
  var any = false, i; for (i = 0; i < hid.length; i++) if (privOwn(e, hid[i])) { any = true; break; }
  if (!any) return e;
  var o = privCopy(e); for (i = 0; i < hid.length; i++) delete o[hid[i]]; return o;
}
/* restore hidden fields absent from n from the stored record c */
function privRestore(n, c, hid) {
  if (!hid.length || !isObj(n) || !isObj(c)) return n;
  var o = null, i, f;
  for (i = 0; i < hid.length; i++) { f = hid[i]; if (!privOwn(n, f) && privOwn(c, f)) { if (!o) o = privCopy(n); privPut(o, f, c[f]); } }
  if (!o) return n;
  return deq(o, c) ? c : o;
}
/* (1b) tokens of the eid-less records of list L that carry a nid: [i] = 'nx:…' (else undefined) */
var PRIV_NX = /^nx:[0-9a-f]{20}$/;
function privNoEid(e) { return isObj(e) && (e.eid == null || e.eid === '') && e.nid != null && e.nid !== ''; }
function privNx(d, L) {
  var seen = nmap();
  return (Array.isArray(L) ? L : []).map(function (e) {
    if (!privNoEid(e)) return;
    var nm = String(e.name == null ? '' : e.name), k = seen[nm] = (seen[nm] || 0) + 1;
    return 'nx:' + KIVO_IDENTITY_MIGRATION.sha256Hex('nx|' + d + '|' + nm + '|' + k).slice(0, 20);
  });
}
function privEmpOut(A, d, v) {
  if (!Array.isArray(v)) return v;
  var X = privNx(d, v);
  return privMap(v, function (e, i) {
    var h = privEmpHidden(A, d, e), o = privStrip(e, h);
    if (X[i] && h.indexOf('nid') >= 0) privPut(o, 'nid', X[i]);   /* o is a copy: nid was stripped */
    return o;
  });
}
/* strict (employee transition 019c): a hidden field sent with a value other than the stored one ⇒ st.bad (not judged by rules there) */
function privEmpIn(A, d, n, c, st, strict) {
  if (!Array.isArray(n) || !Array.isArray(c)) return n;
  var by = nmap(), X = privNx(d, c), R = nmap(), i, ck = function (e) { return e.eid != null && e.eid !== '' ? String(e.eid) : e.nid == null || e.nid === '' ? '\u0001' + String(e.name == null ? '' : e.name) : ''; };
  for (i = 0; i < c.length; i++) {
    if (isObj(c[i]) && ck(c[i]) && by[ck(c[i])] === undefined) by[ck(c[i])] = c[i];   /* eid · else (no nid either) the name, as 019c */
    if (X[i]) R[X[i]] = c[i];
  }
  return privMap(n, function (e) {
    var s = isObj(e) && ck(e) ? by[ck(e)] : null, h;
    if (isObj(e) && typeof e.nid === 'string' && PRIV_NX.test(e.nid)) {   /* (1b) the token back to the stored nid of that record */
      var t = R[e.nid];
      if (!t || (s && s !== t)) { st.bad = 1; return e; }
      s = t; e = privCopy(e); e.nid = s.nid;
    }
    if (!s) return e;
    h = privEmpHidden(A, d, s);
    if (strict && h.some(function (f) { return privOwn(e, f) && !deq(e[f], s[f]); })) st.bad = 1;
    return privRestore(e, s, h);
  });
}
/* daily report: roster rows (days → shifts → roster[]) carry empno */
function privDrRoster(v, fn) {
  if (!isObj(v)) return v;
  var o = null, dk, sh;
  for (dk in v) {
    if (!privOwn(v, dk) || !KIVO_SCOPE._h.parseDay(dk) || !isObj(v[dk]) || !isObj(v[dk].shifts)) continue;
    var x = v[dk], s2 = null;
    for (sh in x.shifts) {
      if (!privOwn(x.shifts, sh) || !isObj(x.shifts[sh]) || !Array.isArray(x.shifts[sh].roster)) continue;
      var R = x.shifts[sh].roster, R2 = fn(R, dk, sh);
      if (R2 === R) continue;
      if (!s2) s2 = privCopy(x.shifts);
      var shx = privCopy(x.shifts[sh]); shx.roster = R2; privPut(s2, sh, shx);
    }
    if (!s2) continue;
    if (!o) o = privCopy(v);
    var x2 = privCopy(x); x2.shifts = s2; privPut(o, dk, x2);
  }
  return o || v;
}
function privDrHidden(A, d, r) { return isObj(r) && !privPersonalOk(A, d) && String(r.ekey == null ? '' : r.ekey) !== String(A.u.ekey || '\u0000') ? ['empno'] : []; }
function privDrOut(A, d, v) {
  if (privPersonalOk(A, d)) return v;
  return privDrRoster(v, function (R) { return privMap(R, function (r) { return privStrip(r, privDrHidden(A, d, r)); }); });
}
function privDrIn(A, d, n, c) {
  if (privPersonalOk(A, d) || !isObj(c)) return n;
  return privDrRoster(n, function (R, dk, sh) {
    var cx = isObj(c[dk]) && isObj(c[dk].shifts) && isObj(c[dk].shifts[sh]) && Array.isArray(c[dk].shifts[sh].roster) ? c[dk].shifts[sh].roster : null;
    if (!cx) return R;
    var by = nmap(), i;
    for (i = 0; i < cx.length; i++) if (isObj(cx[i]) && cx[i].ekey != null && by[String(cx[i].ekey)] === undefined) by[String(cx[i].ekey)] = cx[i];
    return privMap(R, function (r) { var s = isObj(r) && r.ekey != null ? by[String(r.ekey)] : null; return s ? privRestore(r, s, privDrHidden(A, d, s)) : r; });
  });
}
/* permissions registry */
function privUnits(A) {
  if (A.__privU) return A.__privU;
  var U = nmap(), ds = (A.depts || []).map(function (x) { return x && x.id != null ? String(x.id) : ''; }).filter(Boolean);
  if (A.u.deptId) ds.push(String(A.u.deptId));
  ds.forEach(function (d) { if (!deptInScope(A, d)) return; U[d] = 1; ancChain(A, d).forEach(function (a) { U[String(a)] = 1; }); });
  return (A.__privU = U);
}
/* may the actor see entry ek of unit d in emps/tplOf/empLens? */
function privPermEntryOk(A, d, ek) {
  if (!deptInScope(A, d)) return false;
  var me = String(A.u.ekey || '');
  if (me && String(ek) === me) return true;
  return isMgrOf(A, d) && permTargetOk(A, ek, d);
}
function privPermsOut(A, v) {
  if (!isObj(v)) return v;
  var o = privCopy(v), U = privUnits(A), K, u, ek;
  for (K in v) {
    if (!privOwn(v, K) || !isObj(v[K])) continue;
    if (PRIV_PERM_UNITK[K]) { var m = {}; for (u in v[K]) if (privOwn(v[K], u) && U[u]) privPut(m, u, v[K][u]); privPut(o, K, m); }
    else if (PRIV_PERM_EMPK[K]) {
      var m2 = {};
      for (u in v[K]) {
        if (!privOwn(v[K], u) || !deptInScope(A, u)) continue;
        if (!isObj(v[K][u])) { privPut(m2, u, v[K][u]); continue; }
        var e2 = {}; for (ek in v[K][u]) if (privOwn(v[K][u], ek) && privPermEntryOk(A, u, ek)) privPut(e2, ek, v[K][u][ek]);
        privPut(m2, u, e2);
      }
      privPut(o, K, m2);
    }
  }
  return o;
}
/* copy-on-write container o[K] (o is a copy of n) */
function privCow(o, n, K) { if (!isObj(o[K])) privPut(o, K, {}); else if (o[K] === n[K]) privPut(o, K, privCopy(n[K])); return o[K]; }
function privPermsIn(A, n, c) {
  if (!isObj(n) || !isObj(c)) return n;
  var o = privCopy(n), U = privUnits(A), K, u, ek, put = 0, m;
  for (K in c) {
    if (!privOwn(c, K) || !isObj(c[K])) continue;
    if (PRIV_PERM_UNITK[K]) {
      for (u in c[K]) {
        if (!privOwn(c[K], u) || U[u] || (isObj(o[K]) && privOwn(o[K], u))) continue;
        privPut(privCow(o, n, K), u, c[K][u]); put++;
      }
    } else if (PRIV_PERM_EMPK[K]) {
      for (u in c[K]) {
        if (!privOwn(c[K], u)) continue;
        if (!deptInScope(A, u)) {
          if (isObj(o[K]) && privOwn(o[K], u)) continue;
          privPut(privCow(o, n, K), u, c[K][u]); put++; continue;
        }
        if (!isObj(c[K][u])) continue;
        for (ek in c[K][u]) {
          if (!privOwn(c[K][u], ek) || privPermEntryOk(A, u, ek)) continue;
          if (isObj(o[K]) && isObj(o[K][u]) && privOwn(o[K][u], ek)) continue;
          m = privCow(o, n, K);
          if (!isObj(m[u])) privPut(m, u, {}); else if (!isObj(n[K]) || m[u] === n[K][u]) privPut(m, u, privCopy(m[u]));
          privPut(m[u], ek, c[K][u][ek]); put++;
        }
      }
    }
  }
  return put ? o : n;
}
/* FNV-1a 32-bit, base 36 (usersLensFp · privPermsFp) */
function fpHash(s) { var h = 0x811c9dc5, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
/* (3) race: fingerprint of the decisions privPermsOut takes — units (scope · managed), targets he may not administer, nodes below a gm */
function privPermsFp(A) {
  if (!A || !A.u || A.u.role === 'super') return '';
  var U = privUnits(A), u = A.u, mg = false, s = [u.id, u.role, u.deptId, u.gid, u.ekey].map(function (x) { return x == null ? '' : String(x); }).join('\u0001');
  Object.keys(U).sort().forEach(function (d) { var m = isMgrOf(A, d); if (m) mg = true; s += '\u0002' + d + ':' + (deptInScope(A, d) ? 1 : 0) + (m ? 1 : 0); });
  if (mg) Object.keys(permEkIx(A)).sort().forEach(function (ek) { if (!permTargetOk(A, ek)) s += '\u0003' + ek; });
  /* F01: مديرُ الإدارة الأم يدير مديرَ قسمها (018 permTargetOk بالوحدة) — الأقسامُ التي يديرها بأهدافها المضافة */
  Object.keys(U).sort().forEach(function (d) { if (!secMgrOf(A, d)) return; Object.keys(permEkIx(A)).sort().forEach(function (ek) { if (!permTargetOk(A, ek) && permTargetOk(A, ek, d)) s += '\u0005' + d + ':' + ek; }); });
  if (u.role === 'gm') (A.nodes || []).map(function (x) { return x && x.id != null ? String(x.id) : ''; }).sort().forEach(function (g) { if (g && permGidBelow(A, g, u.gid)) s += '\u0004' + g; });
  return fpHash(s);
}
/* does n omit a stored entry he sees now AND one hidden from him (a projection of unknown age)? */
function privPermsOmits(A, n, c) {
  if (!isObj(n) || !isObj(c)) return false;
  var U = privUnits(A), vis = 0, hid = 0, K, u, ek, has = function (o, a, b) { return isObj(o) && privOwn(o, a) && (b === undefined || (isObj(o[a]) && privOwn(o[a], b))); };
  for (K in c) {
    if (!privOwn(c, K) || !isObj(c[K]) || !(PRIV_PERM_UNITK[K] || PRIV_PERM_EMPK[K])) continue;
    for (u in c[K]) {
      if (!privOwn(c[K], u)) continue;
      if (PRIV_PERM_UNITK[K] || !deptInScope(A, u) || !isObj(c[K][u])) { if (!has(n[K], u)) { if (PRIV_PERM_UNITK[K] ? U[u] : deptInScope(A, u)) vis++; else hid++; } continue; }
      for (ek in c[K][u]) if (privOwn(c[K][u], ek) && !has(n[K], u, ek)) { if (privPermEntryOk(A, u, ek)) vis++; else hid++; }
    }
  }
  return vis > 0 && hid > 0;
}
/* 054: '' (go on) · 'scope' (built on another projection ⇒ conflict) · 'perms-stale-client' (refused) */
function privPermsStale(A, ps, nRaw, cRaw) {
  if (!A || !A.u || A.u.role === 'super') return '';
  if (typeof ps === 'string' && ps !== '') return ps === privPermsFp(A) ? '' : 'scope';
  return privPermsOmits(A, parseJson(String(nRaw), null), parseJson(String(cRaw), null)) ? 'perms-stale-client' : '';
}
/* (4) references by nid */
var PRIV_TOK_RES = { bassam_staffing_v3: 1, bassam_staffing_v2: 1, bassam_staffing_snap_v1: 1, bassam_plan_v1: 1, bassam_rounds_v1: 1, bassam_dreport_v1: 1, bassam_tasks_v1: 1 };
var PRIV_NO = { privacy: 'hidden' };   /* privIn: the incoming value changes a hidden reference ⇒ refused (054) */
/* { M: nid→eid, R: eid→nid } of the records of unit d whose nid the actor does not receive, or null; have: raw values by key */
function privTok(A, d, have) {
  var c = A.__privTok || (A.__privTok = nmap()), rk = 'bsdept:' + d + ':' + PRIV_EMP_RES;
  if (c[d] !== undefined) return c[d];
  if (privPersonalOk(A, d)) return (c[d] = null);
  if (!have || !privOwn(have, rk)) return null;
  var L = parseJson(have[rk], null), M = null, R = null, X = privNx(d, L);
  if (Array.isArray(L)) L.forEach(function (e, i) {
    if (!isObj(e) || e.nid == null || e.nid === '' || privEmpHidden(A, d, e).indexOf('nid') < 0) return;
    var n = String(e.nid), x = X[i] || String(e.eid);   /* (1b) an eid-less record: its token */
    if (n === x) return;
    if (!M) { M = nmap(); R = nmap(); }
    if (M[n] === undefined) M[n] = x;
    if (R[x] === undefined) R[x] = n;
  });
  return (c[d] = M ? { M: M, R: R } : null);
}
/* loads the registers the projections of these keys need (save path · denied/conflict values) */
async function privPrep(env, A, keys) {
  if (!A || !A.u || A.u.role === 'super') return;
  for (var i = 0; i < keys.length; i++) {
    var P = parseKey(keys[i]), d = P.dept, h = {};
    if (!d || !PRIV_TOK_RES[resName(keys[i])] || (A.__privTok && A.__privTok[d] !== undefined)) continue;
    h['bsdept:' + d + ':' + PRIV_EMP_RES] = await opResourceGet(env, 'bsdept:' + d + ':' + PRIV_EMP_RES);
    privTok(A, d, h);
  }
}
function privScalar(x) { return typeof x === 'string' || typeof x === 'number'; }
function privTokOut(v, M) {
  var ch = 0, o, k, y, f = function (x) { return privScalar(x) ? (M[String(x)] !== undefined ? M[String(x)] : x) : privTokOut(x, M); };
  if (Array.isArray(v)) return privMap(v, f);
  if (!isObj(v)) return v;
  o = {};
  for (k in v) {
    if (!privOwn(v, k)) continue;
    y = f(v[k]);
    if (M[k] !== undefined) { ch++; if (!privOwn(v, M[k])) privPut(o, M[k], y); continue; }   /* an eid entry of the same person wins, as on the client */
    if (y !== v[k]) ch++;
    privPut(o, k, y);
  }
  return ch ? o : v;
}
function privTokIn(n, c, T, st) {
  var M = T.M, R = T.R, ch = 0, o, k, kk, y;
  var f = function (x, cx, cA) {
    if (!privScalar(x)) return privTokIn(x, cx, T, st);
    var s = String(x), N = R[s], h = function (t) { for (var j = 0; cA && j < cA.length; j++) if (privScalar(cA[j]) && String(cA[j]) === t) return cA[j]; };
    if (M[s] !== undefined) { if (!((privScalar(cx) && String(cx) === s) || h(s) !== undefined)) st.bad = 1; return x; }
    if (N === undefined) { if (PRIV_NX.test(s) && !(privScalar(cx) && String(cx) === s)) st.bad = 1; return x; }   /* (1b) a token of no record */
    if (privScalar(cx) && String(cx) === N) return cx;
    return cA && h(s) === undefined && h(N) !== undefined ? h(N) : PRIV_NX.test(s) ? N : x;   /* (1b) a token is never stored */
  };
  if (Array.isArray(n)) { var cA = Array.isArray(c) ? c : []; return privMap(n, function (x, i) { return f(x, cA[i], cA); }); }
  if (!isObj(n)) return n;
  var cO = isObj(c) ? c : null; o = {};
  for (k in n) {
    if (!privOwn(n, k)) continue;
    kk = k;
    if (M[k] !== undefined) { if (!cO || !privOwn(cO, k) || !deq(cO[k], n[k])) st.bad = 1; }
    else if (R[k] !== undefined ? PRIV_NX.test(k) || (cO && privOwn(cO, R[k]) && !privOwn(cO, k)) : PRIV_NX.test(k) && !(cO && privOwn(cO, k))) { if (R[k] === undefined) st.bad = 1; else kk = R[k]; }
    y = f(n[k], cO && privOwn(cO, kk) ? cO[kk] : undefined, null);
    if (kk !== k || y !== n[k]) ch++;
    privPut(o, kk, y);
  }
  if (cO) for (k in cO) if (privOwn(cO, k) && M[k] !== undefined && privOwn(cO, M[k]) && !privOwn(o, k)) { privPut(o, k, cO[k]); ch++; }   /* hidden behind the eid entry: kept */
  return ch ? o : n;
}
/* (9) login/permission keys (ekey) as identities: the stored key never changes; where another person's ekey reaches a reader who does
   not receive that colleague's nid (accounts list rows · staffAccountKeys · award record ekey · task group rows), an ekey equal to a
   hidden nid is sent as the token of (4) (eid · 'nx:') and mapped back by account id on save (054 usersScopeIn). privPrepDepts loads the
   registers once per request (privTok cache); privKeyOut is then synchronous. Not projected: the permissions registry keys
   (emps/tplOf/empLens — another person's entry reaches only a manager of the unit, who receives nids: (3) privPermEntryOk) and the
   grants register (read by the managers' permission page only). */
async function privPrepDepts(env, A, ds) {
  if (!A || !A.u || A.u.role === 'super') return;
  await privPrep(env, A, (ds || []).filter(function (d) { return d && deptInScope(A, d) && !privPersonalOk(A, d); }).map(function (d) { return 'bsdept:' + d + ':bassam_tasks_v1'; }));
}
function privKeyOut(A, d, k) { var T = A && A.__privTok && A.__privTok[d]; return T && k != null && T.M[String(k)] !== undefined ? T.M[String(k)] : k; }
/* an account row as a reader sees it (054 usersLens): its ekey projected */
function privUserRow(A, d, u) { var k = privKeyOut(A, d, u.ekey); if (k === u.ekey) return u; u = privCopy(u); u.ekey = k; return u; }
/* (5) award records */
var PRIV_AW_F = ['phone', 'email', 'comp'];
function privAwardOk(A, d) {
  return privPersonalOk(A, d) || privMemo(A, '__privAw', d, function () { return privHeld(A, d, ['award.res.edit', 'award.res.approve', 'award.res.reject', 'award.res.delete', 'award.res.status'], ['award/res:edit', 'award/res:approve', 'award/res:del']); });
}
function privAwardRec(A, d, r) { return !isObj(r) || privAwardOk(A, d) || (r.ekey != null && String(r.ekey) === String(A.u.ekey || '\u0000')) ? r : privUserRow(A, d, privStrip(r, PRIV_AW_F)); }   /* (9) a plain reader: ekey too */
/* export domain rows dom.rows[kind]: personal columns blanked (presence kept, so the copy stays valid) unless the row is the actor's own
   (keyCol); a domain so changed is marked redacted — no restore accepts it (privRedacted) */
function privRowsBlank(A, dom, kind, cols, keyCol) {
  var me = String(A.u.ekey || '\u0000'), R = dom.rows[kind] || [];
  dom.rows[kind] = privMap(R, function (r) {
    if (!isObj(r) || String(r[keyCol]) === me) return r;
    var o = null; cols.forEach(function (x) { if (r[x] != null && r[x] !== '') { o = o || privCopy(r); o[x] = ''; } });
    return o || r;
  });
  if (dom.rows[kind] !== R) dom.redacted = true;
  return !!dom.redacted;
}
/* (6) a copy exported without personal data (domain.redacted · envelope redacted[] · manifest.redacted) is refused by every restore before any write */
function privRedacted(b) {
  var D = isObj(b) && isObj(b.domains) ? b.domains : {};
  return !!(isObj(b) && isObj(b.manifest) && b.manifest.redacted) || Object.keys(D).some(function (k) { return [].concat(D[k]).some(function (x) { return isObj(x) && !!x.redacted; }); });
}
/* (7) restore guard. The marker of (6) can be removed by hand, so a restore (019d rsPrepare — the 019f conversion path ends there too)
   also compares the copy with what is stored, before any plan or write, for every actor (super included — no override): a record
   present in both whose stored personal field is non-empty and is empty, missing or an 'nx:' token (1b) in the copy ⇒ restore-personal-blank
   (409, details: count and the first places as key:record:field — never a value). Records are matched by: register eid, else name
   (019c empRecordKey) — fields PRIV_EMP_F + gender · report roster day/shift/ekey — empno · custody movement move_id — holder
   nid/empno snapshot · award record record_id — phone/email/employee_number (the fields (2)/(1)/privRowsBlank remove).
   Limits: a copy that CHANGES such a value (non-empty) restores normally; a record absent from the copy (deleted since, added after the
   export, a roster day/shift the copy lacks) is not judged. EXPLICIT LIMIT (owner decision): a copy older than the entry of a personal
   field (the field was empty when it was exported, filled since) cannot be restored through this path — it is indistinguishable from a
   stripped copy — until a separate review of legacy-copy transfer (not built). No override, super included; the remedy is a full copy
   exported by the unit manager or the system administrator after that data was entered (never blanking stored fields). Merge: the
   documents applied. */
function privFull(x) { return x != null && x !== '' && !(typeof x === 'string' && PRIV_NX.test(x)); }
function privLoses(c, n, kf, F, out, tag) {
  if (!Array.isArray(c) || !Array.isArray(n)) return;
  var by = nmap();
  n.forEach(function (r) { var k = isObj(r) && kf(r); if (k && by[k] === undefined) by[k] = r; });
  c.forEach(function (s) { var k = isObj(s) && kf(s), r = k && by[k]; if (isObj(r)) F.forEach(function (f) { if (privFull(s[f]) && !privFull(r[f])) out.push(tag + ':' + k + ':' + f); }); });
}
async function privRestoreBlanks(env, cur, keys, domains) {
  var out = [], k, rn, c, n, i, D, x, q = function (sql, d) { return env.DB.prepare(sql).bind(d).all().then(function (r) { return r.results || []; }); };
  for (k in keys) {
    rn = resName(k);
    if (!parseKey(k).dept || cur[k] == null || (rn !== PRIV_EMP_RES && rn !== PRIV_DR_RES)) continue;
    c = parseJson(cur[k], null); n = parseJson(keys[k], null);
    if (rn === PRIV_EMP_RES) privLoses(c, n, function (e) { return String(e.eid || e.name || ''); }, PRIV_EMP_F.concat('gender'), out, k);
    else privDrRoster(c, function (R, dk, sh) {
      var y = isObj(n) && isObj(n[dk]) && isObj(n[dk].shifts) && isObj(n[dk].shifts[sh]) ? n[dk].shifts[sh].roster : [];
      privLoses(R, y, function (r) { return r.ekey == null ? '' : String(r.ekey); }, ['empno'], out, k + ':' + dk + ':' + sh);
      return R;
    });
  }
  D = [].concat(domains.custody || []);
  for (i = 0; i < D.length; i++) if (isObj(D[i]) && isObj(D[i].rows) && (x = bdScope(D[i])))
    privLoses(await q('SELECT move_id,holder_nid_snapshot,holder_empno_snapshot FROM custody_movements WHERE department_id=?1', x), D[i].rows.moves, function (r) { return String(r.move_id); }, ['holder_nid_snapshot', 'holder_empno_snapshot'], out, 'custody:' + x);
  D = [].concat(domains.awards || []);
  for (i = 0; i < D.length; i++) if (isObj(D[i]) && isObj(D[i].rows) && (x = bdScope(D[i])))
    privLoses(await q('SELECT record_id,phone,email,employee_number FROM award_records WHERE department_id=?1', x), D[i].rows.records, function (r) { return String(r.record_id); }, ['phone', 'email', 'employee_number'], out, 'awards:' + x);
  return out;
}
/* custody read (019a cuRead): each row carries the holder's nid/empno snapshot — same rule (unit managers · employees-data writers · himself) */
/* (10) custody holders outside the register (a person deleted since; old data may have keyed him by his nid). Whether such a key is a
   nid cannot be known without the record, so for a reader not allowed personal data EVERY holder key that names no register record
   (not an eid/name key, not a register nid — those are (4)) is sent as 'nx:'+20 hex of SHA-256('nxc|'+unit+'|'+the earliest move id
   stored under that key). The move id is random ('move-'+randTok · 'legacy-move-N'), never the key, so the token cannot be reversed to
   it; it is stable while that movement exists (the earliest by sequence — UNIQUE per unit; later movements get higher sequences; a
   restore keeps ids and sequences) and unique per key. The name the
   reader sees comes from the movement's name snapshot as before. The holder filter maps it back; an 'nx:' that names neither a register
   record nor such a holder is refused (privacy-hidden); issuing to a token is refused (a hand-out needs a register record). Authorised
   readers: raw keys. privCustodyOrph caches the map per request (A.__privCuO). */
function privCustodyOrph(A, d, pairs, empRaw) {
  var c = A.__privCuO || (A.__privCuO = nmap()), L = parseJson(empRaw, []), known = nmap(), M = nmap(), R = nmap();
  if (!A.u || privPersonalOk(A, d)) return (c[d] = null);
  (Array.isArray(L) ? L : []).forEach(function (e) { if (isObj(e)) [e.eid || e.name, e.nid].forEach(function (k) { if (k != null && k !== '') known[String(k)] = 1; }); });
  pairs.forEach(function (p) {
    var k = p.k == null ? '' : String(p.k), t;
    if (!k || known[k] || PRIV_NX.test(k)) return;
    t = 'nx:' + KIVO_IDENTITY_MIGRATION.sha256Hex('nxc|' + d + '|' + p.mv).slice(0, 20); M[k] = t; R[t] = k;
  });
  return (c[d] = { M: M, R: R });
}
/* empRaw: the register as read (019a) — a holder key that is a hidden nid (old data) is sent as the token of (1b)/(4) (eid · 'nx:');
   one outside the register as the token of (10) */
function privCustodyRows(A, d, rows, empRaw) {
  if (!Array.isArray(rows) || !A || !A.u || privPersonalOk(A, d)) return rows;
  var me = String(A.u.ekey || ''), H = {}; H['bsdept:' + d + ':' + PRIV_EMP_RES] = empRaw;
  var T = empRaw == null ? null : privTok(A, d, H), O = A.__privCuO && A.__privCuO[d], m = function (v) { v = String(v); return T && T.M[v] !== undefined ? T.M[v] : O && O.M[v] !== undefined ? O.M[v] : undefined; };
  var tk = function (o, k) { if (o[k] != null && m(o[k]) !== undefined) o[k] = m(o[k]); };
  return rows.map(function (r) {
    if (isObj(r) && !isObj(r.snapshot) && m(r.holderKey) !== undefined) { r = privCopy(r); tk(r, 'holderKey'); return r; }   /* summary.topHolders */
    if (!isObj(r) || !isObj(r.snapshot)) return r;
    var hk = String(r.holderKey != null ? r.holderKey : (r.eid != null ? r.eid : ''));
    if (me && (hk === me || String(r.snapshot.eid || '') === me)) return r;
    var o = privCopy(r), s = privCopy(r.snapshot); if (privOwn(s, 'nid')) s.nid = ''; if (privOwn(s, 'empno')) s.empno = ''; o.snapshot = s;
    ['holderKey', 'eid', 'hid'].forEach(function (k) { tk(o, k); }); tk(s, 'eid');
    return deq(o, r) ? r : o;
  });
}
/* the holder filter of the custody read → the resolved holder key (019a hkey = register eid, else name — old rows stored under a nid
   resolve to it through the alias): an 'nx:' token the reader got → its record; a raw nid → its record only for a reader who sees nids
   (else a filter by nid would be an oracle) */
function privCustodyHolder(A, d, h, empRaw) {
  var L = parseJson(empRaw, []), X = privNx(d, L), ok = A && A.u && privPersonalOk(A, d), hit = [], O = A.__privCuO && A.__privCuO[d];
  if (!Array.isArray(L) || !h) return h;
  if (O && O.R[h] !== undefined) return O.R[h];   /* (10) */
  L.forEach(function (e, i) { if (isObj(e) && ((PRIV_NX.test(h) && X[i] === h) || (ok && e.nid != null && e.nid !== '' && String(e.nid) === h && String(e.eid || e.name || '') !== h))) hit.push(e); });
  if (hit.length === 1) return String(hit[0].eid || hit[0].name || '');
  if (PRIV_NX.test(h)) throw cuError('privacy-hidden', 409);   /* a token of no record and no holder */
  return h;
}
/* ── entry points: raw JSON text in, raw JSON text out (unchanged text when nothing is hidden) ── */
function privOut(A, k, raw, have) {
  if (raw == null || !A || !A.u || A.u.role === 'super') return raw;
  var P = parseKey(k), rn = resName(k), v, p, T;
  if (!P.dept && P.name === PRIV_PERM_KEY) { v = parseJson(raw, undefined); if (v === undefined) return raw; p = privPermsOut(A, v); }
  else if (P.dept && (rn === PRIV_EMP_RES || rn === PRIV_DR_RES || PRIV_TOK_RES[rn])) {
    T = PRIV_TOK_RES[rn] ? privTok(A, P.dept, have) : null;
    if (!T && rn !== PRIV_EMP_RES && (rn !== PRIV_DR_RES || privPersonalOk(A, P.dept))) return raw;
    v = parseJson(raw, undefined); if (v === undefined) return raw;
    p = rn === PRIV_EMP_RES ? privEmpOut(A, P.dept, v) : v;
    if (T) p = privTokOut(p, T.M);
    if (rn === PRIV_DR_RES) p = privDrOut(A, P.dept, p);
  }
  else return raw;
  return p === v ? raw : JSON.stringify(p);
}
/* nextRaw as it will be judged and written · PRIV_NO (a hidden reference changed). Old nid references need privPrep first. */
function privIn(A, k, nextRaw, curRaw) {
  if (nextRaw == null || curRaw == null || !A || !A.u || A.u.role === 'super') return nextRaw;
  var P = parseKey(k), rn = resName(k), T = P.dept && PRIV_TOK_RES[rn] && A.__privTok ? A.__privTok[P.dept] : null, n, c, m, st = {};
  if (!T && !(!P.dept && P.name === PRIV_PERM_KEY) && !(P.dept && (rn === PRIV_EMP_RES || rn === PRIV_DR_RES))) return nextRaw;
  n = parseJson(String(nextRaw), undefined); c = parseJson(String(curRaw), undefined);
  if (n === undefined || c === undefined) return nextRaw;
  m = T ? privTokIn(n, c, T, st) : n;
  m = !P.dept ? privPermsIn(A, m, c) : rn === PRIV_EMP_RES ? privEmpIn(A, P.dept, m, c, st) : rn === PRIV_DR_RES ? privDrIn(A, P.dept, m, c) : m;
  if (st.bad) return PRIV_NO;
  if (m === n) return nextRaw;
  return deq(m, c) ? String(curRaw) : JSON.stringify(m);
}
/* ── IP39: exporting a department (backup file · domain exports) and the backup page's read of every department collection ──
   backup.view alone (status of the copies) no longer opens the department's data: export/read-all needs super, or the backup
   page (backup.view, within the unit ceiling as before) together with being a manager of the unit or holding the backup
   create/restore capability (backup.create = admin/backup add|edit · backup.restore). */
function bkExportOk(A, d) {
  if (!A || !A.u) return false;
  if (A.u.role === 'super') return true;
  if (!d || !deptInScope(A, d)) return false;
  return privMemo(A, '__bkX', d, function () {
    if (!privHeld(A, d, ['backup.view'], ['admin/backup:view'])) return false;
    if (isMgrOf(A, d) || privHeld(A, d, ['backup.create', 'backup.restore'], ['admin/backup:add', 'admin/backup:edit'])) return true;
    if (A.enf) return false;
    try { return KIVO_GUARDS.decide('backup.restore', permv2Ctx(A, d)).ok; } catch (e) { return false; }
  });
}
/* backup.view as a read key of every department collection (RD_ANY · readKeysFor): only for its own stamp, or for an exporter */
function bkReadAnyOk(A, d, rn) { return rn === 'bassam_last_export_v1' || bkExportOk(A, d); }
