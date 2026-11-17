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
