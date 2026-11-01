/* ══ PRIVACY batch (SV09 · IP07 · IP10 · IP39 · SV01): least-privilege projection of personal data and of the permissions registry ══
   One place for the rule; every read route calls privOut() on the value it is about to send (both modes, every role but super),
   and applySave calls privIn() before any rule so a client that saves what it received projected never erases the hidden parts.

   (1) Employee register bsdept:<d>:bassam_employees_v1 — personal fields of a record reach only:
         super · the employee himself (record eid/nid = his account ekey) · managers of the unit (isMgrOf: dept manager, manager badge,
         gm of a branch above) · holders of a write action on the employees-data page (emp.record.create|edit · legacy emps/data add|edit).
       Everyone else who reads the register for an operational page (schedule, daily report, rounds, plan, tasks, irshad, seized,
       award, readiness, emps/data view) gets the working fields: eid, name, type, work, shift, group, job, account.
         PRIV_EMP_F: nid (only when the record has an eid — a legacy record without eid is identified by nid on every page),
                     phone, email, empno (initial password), contact.
         gender: kept also for readers of the monthly schedule (staff) and the daily report (dreport): both pages count and show the
                 male/female distribution of the shift (modules/staff/logic.js · modules/dreport/logic.js). Removed elsewhere.
   (2) Daily report bsdept:<d>:bassam_dreport_v1 — roster rows carry a copy of empno (pulled from the register): same rule as (1).
   (2b) Custody read (/api/custody · 019a): each row carries the holder's nid/empno snapshot — same rule as (1).
   (3) Permissions registry bassam_perms_v1 — a non-super actor receives: caps/subs/lenses of the units in his scope and their
       ancestor nodes; emps/tplOf/empLens of a unit he manages for himself and for every employee he may administer (permTargetOk ·
       018); of any other unit in scope, his own entries only. Other top-level keys (lensZ, patterns) unchanged.
   Write (privIn): a hidden part ABSENT from the incoming value is restored from the current value (field order of the stored record
   kept: a record equal to the stored one is the stored object); a hidden part PRESENT in the incoming value is left as sent, so the
   existing rules judge it (an unauthorised change is denied, never silently applied). Super: unchanged both ways. */
var PRIV_EMP_F = ['nid', 'phone', 'email', 'empno', 'contact'];
var PRIV_EMP_RES = 'bassam_employees_v1', PRIV_DR_RES = 'bassam_dreport_v1', PRIV_PERM_KEY = 'bassam_perms_v1';
var PRIV_PERM_EMPK = { emps: 1, tplOf: 1, empLens: 1 }, PRIV_PERM_UNITK = { caps: 1, subs: 1, lenses: 1 };
function privOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function privPut(o, k, v) { Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true }); }   /* «__proto__» stays data */
function privCopy(o) { var r = {}, k; for (k in o) if (privOwn(o, k)) privPut(r, k, o[k]); return r; }
/* holder of the employees-data write actions, or manager of the unit */
function privPersonalOk(A, d) {
  if (!A || !A.u) return false;
  if (A.u.role === 'super') return true;
  if (!d || !deptInScope(A, d)) return false;
  var c = A.__privP || (A.__privP = nmap());
  if (c[d] !== undefined) return c[d];
  var v = isMgrOf(A, d) || (A.enf ? (enfHeld(A, d, 'emp.record.create') || enfHeld(A, d, 'emp.record.edit'))
                                  : (actsHeldOn(A, d, 'emps/data', ['add']) || actsHeldOn(A, d, 'emps/data', ['edit'])));
  return (c[d] = !!v);
}
/* readers of the two pages that use gender operationally (distribution of the shift) */
function privGenderOk(A, d) {
  if (privPersonalOk(A, d)) return true;
  var c = A.__privG || (A.__privG = nmap());
  if (c[d] !== undefined) return c[d];
  var v = A.enf ? (enfHeld(A, d, 'staff.view') || enfHeld(A, d, 'report.view'))
                : (actsHeldOn(A, d, 'staff', ['view']) || actsHeldOn(A, d, 'dreport', ['view']));
  return (c[d] = !!v);
}
function privSelfRec(A, e) {
  var ek = String((A && A.u && A.u.ekey) || '');
  if (!ek || !isObj(e)) return false;
  return (e.eid != null && String(e.eid) === ek) || (e.nid != null && e.nid !== '' && String(e.nid) === ek);
}
/* hidden fields of record e for the actor in unit d ([] = sees all) */
function privEmpHidden(A, d, e) {
  if (!isObj(e) || privPersonalOk(A, d) || privSelfRec(A, e)) return [];
  var out = [], i, f;
  for (i = 0; i < PRIV_EMP_F.length; i++) { f = PRIV_EMP_F[i]; if (f === 'nid' && (e.eid == null || e.eid === '')) continue; out.push(f); }
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
function privEmpOut(A, d, v) {
  if (!Array.isArray(v)) return v;
  var cut = 0, o = v.map(function (e) { var w = privStrip(e, privEmpHidden(A, d, e)); if (w !== e) cut++; return w; });
  return cut ? o : v;
}
function privEmpIn(A, d, n, c) {
  if (!Array.isArray(n) || !Array.isArray(c)) return n;
  var by = nmap(), put = 0, i;
  for (i = 0; i < c.length; i++) if (isObj(c[i]) && c[i].eid != null && c[i].eid !== '' && by[String(c[i].eid)] === undefined) by[String(c[i].eid)] = c[i];
  var o = n.map(function (e) {
    if (!isObj(e) || e.eid == null || e.eid === '') return e;
    var s = by[String(e.eid)]; if (!s) return e;
    var w = privRestore(e, s, privEmpHidden(A, d, s)); if (w !== e) put++; return w;
  });
  return put ? o : n;
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
  return privDrRoster(v, function (R) { var cut = 0, o = R.map(function (r) { var w = privStrip(r, privDrHidden(A, d, r)); if (w !== r) cut++; return w; }); return cut ? o : R; });
}
function privDrIn(A, d, n, c) {
  if (privPersonalOk(A, d) || !isObj(c)) return n;
  return privDrRoster(n, function (R, dk, sh) {
    var cx = isObj(c[dk]) && isObj(c[dk].shifts) && isObj(c[dk].shifts[sh]) && Array.isArray(c[dk].shifts[sh].roster) ? c[dk].shifts[sh].roster : null;
    if (!cx) return R;
    var by = nmap(), i, put = 0;
    for (i = 0; i < cx.length; i++) if (isObj(cx[i]) && cx[i].ekey != null && by[String(cx[i].ekey)] === undefined) by[String(cx[i].ekey)] = cx[i];
    var o = R.map(function (r) { if (!isObj(r) || r.ekey == null) return r; var s = by[String(r.ekey)]; if (!s) return r; var w = privRestore(r, s, privDrHidden(A, d, s)); if (w !== r) put++; return w; });
    return put ? o : R;
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
  return isMgrOf(A, d) && permTargetOk(A, ek);
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
function privPermsIn(A, n, c) {
  if (!isObj(n) || !isObj(c)) return n;
  var o = privCopy(n), U = privUnits(A), K, u, ek, put = 0;
  for (K in c) {
    if (!privOwn(c, K) || !isObj(c[K])) continue;
    if (PRIV_PERM_UNITK[K]) {
      for (u in c[K]) {
        if (!privOwn(c[K], u) || U[u] || (isObj(o[K]) && privOwn(o[K], u))) continue;
        if (!isObj(o[K])) privPut(o, K, {}); else if (o[K] === n[K]) privPut(o, K, privCopy(n[K]));
        privPut(o[K], u, c[K][u]); put++;
      }
    } else if (PRIV_PERM_EMPK[K]) {
      for (u in c[K]) {
        if (!privOwn(c[K], u)) continue;
        if (!deptInScope(A, u)) {
          if (isObj(o[K]) && privOwn(o[K], u)) continue;
          if (!isObj(o[K])) privPut(o, K, {}); else if (o[K] === n[K]) privPut(o, K, privCopy(n[K]));
          privPut(o[K], u, c[K][u]); put++; continue;
        }
        if (!isObj(c[K][u])) continue;
        for (ek in c[K][u]) {
          if (!privOwn(c[K][u], ek) || privPermEntryOk(A, u, ek)) continue;
          if (isObj(o[K]) && isObj(o[K][u]) && privOwn(o[K][u], ek)) continue;
          if (!isObj(o[K])) privPut(o, K, {}); else if (o[K] === n[K]) privPut(o, K, privCopy(n[K]));
          if (!isObj(o[K][u])) privPut(o[K], u, {}); else if (!isObj(n[K]) || o[K][u] === n[K][u]) privPut(o[K], u, privCopy(o[K][u]));
          privPut(o[K][u], ek, c[K][u][ek]); put++;
        }
      }
    }
  }
  return put ? o : n;
}
/* custody read (019a cuRead): each row carries the holder's nid/empno snapshot — same rule (unit managers · employees-data writers · himself) */
function privCustodyRows(A, d, rows) {
  if (!Array.isArray(rows) || !A || !A.u || privPersonalOk(A, d)) return rows;
  var me = String(A.u.ekey || '');
  return rows.map(function (r) {
    if (!isObj(r) || !isObj(r.snapshot)) return r;
    var hk = String(r.holderKey != null ? r.holderKey : (r.eid != null ? r.eid : ''));
    if (me && (hk === me || String(r.snapshot.eid || '') === me)) return r;
    if (!r.snapshot.nid && !r.snapshot.empno) return r;
    var o = privCopy(r), s = privCopy(r.snapshot); if (privOwn(s, 'nid')) s.nid = ''; if (privOwn(s, 'empno')) s.empno = ''; o.snapshot = s; return o;
  });
}
/* ── entry points: raw JSON text in, raw JSON text out (unchanged text when nothing is hidden) ── */
function privOut(A, k, raw) {
  if (raw == null || !A || !A.u || A.u.role === 'super') return raw;
  var P = parseKey(k), rn = resName(k), v, p;
  if (!P.dept && P.name === PRIV_PERM_KEY) { v = parseJson(raw, undefined); if (v === undefined) return raw; p = privPermsOut(A, v); }
  else if (P.dept && rn === PRIV_EMP_RES) { v = parseJson(raw, undefined); if (v === undefined) return raw; p = privEmpOut(A, P.dept, v); }
  else if (P.dept && rn === PRIV_DR_RES) { v = parseJson(raw, undefined); if (v === undefined) return raw; p = privDrOut(A, P.dept, v); }
  else return raw;
  return p === v ? raw : JSON.stringify(p);
}
function privIn(A, k, nextRaw, curRaw) {
  if (nextRaw == null || curRaw == null || !A || !A.u || A.u.role === 'super') return nextRaw;
  var P = parseKey(k), rn = resName(k), n, c, m;
  if (!(!P.dept && P.name === PRIV_PERM_KEY) && !(P.dept && (rn === PRIV_EMP_RES || rn === PRIV_DR_RES))) return nextRaw;
  n = parseJson(String(nextRaw), undefined); c = parseJson(String(curRaw), undefined);
  if (n === undefined || c === undefined) return nextRaw;
  m = !P.dept ? privPermsIn(A, n, c) : rn === PRIV_EMP_RES ? privEmpIn(A, P.dept, n, c) : privDrIn(A, P.dept, n, c);
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
  var c = A.__bkX || (A.__bkX = nmap());
  if (c[d] !== undefined) return c[d];
  var v;
  if (A.enf) v = enfHeld(A, d, 'backup.view') && (isMgrOf(A, d) || enfHeld(A, d, 'backup.create') || enfHeld(A, d, 'backup.restore'));
  else if (!actsHeldOn(A, d, 'admin/backup', ['view'])) v = false;
  else if (isMgrOf(A, d) || actsHeldOn(A, d, 'admin/backup', ['add']) || actsHeldOn(A, d, 'admin/backup', ['edit'])) v = true;
  else { try { v = !!KIVO_GUARDS.decide('backup.restore', permv2Ctx(A, d)).ok; } catch (e) { v = false; } }
  return (c[d] = !!v);
}
/* backup.view as a read key of every department collection (RD_ANY · readKeysFor): only for its own stamp, or for an exporter */
function bkReadAnyOk(A, d, rn) { return rn === 'bassam_last_export_v1' || bkExportOk(A, d); }
