/* ═══ /api/retro — نافذةُ الاستدراك (ir.rec.retro.open · sz.rec.retro.open): حالةٌ خادمية لكل (إدارة · نظام)، محدودةُ النطاق (شهرٌ أو يومٌ منقضٍ) والزمن (≤ RETRO_MAX_H) والفاعل (من الجلسة)، بسجلّ تدقيقٍ مستقل ═══
   لا تُنفَّذ قاعدةُ الرفض على الكتابات (Phase 3 ظلّ)؛ النافذةُ تُقاس بها wouldAllowRetro/wouldBlock فقط. الوصولُ: مدير النظام أو حاملُ approve (ذرّةُ G‑08 نفسُها). */
async function retroApi(env, request, A, url, meta) {
  try { return await retroApiRun(env, request, A, url, meta); }
  catch (error) { return irErrorResponse(error); }
}
async function retroApiRun(env, request, A, url, meta) {
  var now = Date.now(), T = dsToday(now), b = null, sys, d;
  if (request.method === 'GET') { sys = String(url.searchParams.get('res') || ''); d = String(url.searchParams.get('dept') || A.u.deptId || ''); }
  else { var rb = await bodyRead(request, '/api/retro'); if (rb.res) return rb.res; b = rb.v; sys = String(b.res || ''); d = String(b.dept || A.u.deptId || ''); }   /* KIVO_264 · SOT-101: مخطّطُ الجسم (src/schemas/api/bodies.schema.json) */
  if (!Object.prototype.hasOwnProperty.call(RETRO, sys)) return json({ ok: 0, err: 'res' }, 400);   /* KIVO_264: «__proto__» وأمثالُه ليست نظاماً (كانت تمرّ فتنهار 500) */
  if (!d || !(A.depts || []).some(function (x) { return x && x.id === d; })) return json({ ok: 0, err: 'dept' }, 400);
  var irCtx = null, irState = null;
  if (sys === 'irshad') {
    await irGuardRetired(env);
    irCtx = await irQueryContext(env, A, d, { write: true }); env = irCtx.env; A = irCtx.A;
    irState = await irRetroSnapshot(env, d);
    irCtx.guards.push(irRetiredGuard(env));
    irCtx.guards.push.apply(irCtx.guards, rsWitness(env, IR_TABLES.windows[0], IR_TABLES.windows[1], irState.rows, 'department_id=?1', [d]));
    irCtx.guards.push.apply(irCtx.guards, rsWitness(env, 'meta', ['k', 'v'], irState.metaRows, 'k=?1 OR k=?2', [irMetaKey(d), irMetaKey(d) + ':retro-version']));
  }
  var RS = PERMV3.retro[sys], may = retroMay(A, d, sys);
  var tob = A.u.role === 'super' ? { ok: true, why: 'super' } : KIVO_GUARDS.decide(RETRO[sys].key, permv2Ctx(A, d));
  if (!!tob.ok === may) RS.openDecisions.agree++; else RS.openDecisions.disagree++;
  if (request.method === 'GET') {
    if (!may && !canRead(A, 'bsdept:' + d + ':' + RETRO[sys].res)) return json({ ok: 0, err: 'perm' }, 403);
    var stG = irCtx ? irState.state : await retroState(env, d, sys);
    if (irCtx) await env.DB.batch(irCtx.guards);
    return json({ ok: 1, res: sys, dept: d, today: T, now: now, maxHours: KIVO_BUILD.RETRO_MAX_H, defHours: KIVO_BUILD.RETRO_DEF_H, may: may, windows: stG.windows });
  }
  if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
  var act = b.act === 'close' ? 'close' : 'open';
  if (!may && A.enf) { try { await enfInitDb(env); await enfLogStmt(env, { uid: A.u.id, un: String(A.u.un || ''), role: A.u.role, dept: d, k: retroKey(d, sys), res: RETRO[sys].state, keys: RETRO[sys].key, decision: 'deny', why: 'perm', path: '/api/retro', ip: meta.ip }).run(); } catch (eL9) { swallow('retro-authz-log', eL9, env.__rid); } }
  if (!may) { RS.missingRetroPermission++; await secLog(env, { ts: now, uid: A.u.id, un: A.u.un, act: 'denied', target: retroKey(d, sys), detail: 'retro.' + act + ':perm', ip: meta.ip, city: meta.city, dev: meta.dev }); return json({ ok: 0, err: 'perm', key: RETRO[sys].key }, 403); }
  var st9 = irCtx ? irState.state : await retroState(env, d, sys), w, scope;
  if (act === 'open') {
    var sc0 = isObj(b.scope) ? b.scope : {}, y = parseInt(sc0.y, 10), m = parseInt(sc0.m, 10), dd0 = (sc0.d == null || sc0.d === '') ? null : parseInt(sc0.d, 10);
    if (!(y > 1300 && y < 1700 && m >= 1 && m <= 12) || (dd0 !== null && !(dd0 >= 1 && dd0 <= 30))) return json({ ok: 0, err: 'scope' }, 400);
    scope = { y: y, m: m, d: dd0 };
    if (!T) return json({ ok: 0, err: 'today' }, 500);
    if (!KIVO_BUILD.retroClosed(T, y, m, dd0)) return json({ ok: 0, err: 'not-closed', today: T }, 400);          /* الفترةُ المفتوحة لا تحتاج استدراكاً */
    var hours = Number(b.hours); if (!(hours > 0)) hours = KIVO_BUILD.RETRO_DEF_H; hours = Math.min(KIVO_BUILD.RETRO_MAX_H, Math.max(1 / 3600, hours));
    var reason = String(b.reason == null ? '' : b.reason).trim().slice(0, 300); if (!reason) RS.missingReason++;
    if (!reason && A.enf) return json({ ok: 0, err: 'reason', key: RETRO[sys].key }, 400);      /* KIVO_243 · D3-03: السببُ إلزاميٌّ عند الإنفاذ */
    w = { id: 'rw' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36), scope: scope, by: { id: A.u.id, un: String(A.u.un || ''), ekey: String(A.u.ekey || ''), name: String(A.u.name || '') }, at: now, until: now + Math.round(hours * 3600000), hours: hours, reason: reason, reasonMissing: !reason };
    st9.windows.push(w); if (st9.windows.length > 200) st9.windows = st9.windows.slice(-200);
    RS.opens++;
  } else {
    var id = String(b.id || ''); w = null; for (var q = 0; q < st9.windows.length; q++) if (st9.windows[q] && st9.windows[q].id === id) w = st9.windows[q];
    if (!w) return json({ ok: 0, err: 'not-found' }, 404);
    if (w.closedAt) { if (irCtx) await env.DB.batch(irCtx.guards); return json({ ok: 1, window: w, already: 1 }); }
    w.closedAt = now; w.closedBy = { id: A.u.id, un: String(A.u.un || ''), ekey: String(A.u.ekey || '') }; scope = w.scope; RS.closes++;
  }
  if (irCtx) {
    await irRetroCommit(irCtx, st9, w, scope, act, meta, now);
    return json({ ok: 1, window: w, today: T, now: now, decision: { asis: may, toBe: !!tob.ok, why: tob.why || '' } });
  }
  var rev = await nextRev(env), key = retroKey(d, sys), stm = kvPutStmts(env, 'kv', key, JSON.stringify(st9));
  stm.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').bind(key, rev));
  stm.push(audEvStmt(env, { cid: 'retro_' + w.id + '_' + act, ts: now, uid: A.u.id, un: String(A.u.un || ''), dept: d, k: key, rev: rev, etype: 'retro', eid: sys + ':' + retroScopeKey(scope),
    ename: 'استدراك ' + RETRO[sys].name + ' ' + retroScopeKey(scope), act: act === 'open' ? 'opened' : 'closed', ctx: JSON.stringify({ sys: sys, scope: scope, key: RETRO[sys].key }), bef: '',
    aft: JSON.stringify(act === 'open' ? { until: w.until, hours: w.hours, reason: w.reason, by: w.by.un } : { closedAt: w.closedAt, by: String(A.u.un || '') }), ip: meta.ip, dev: meta.dev, city: meta.city }));
  await env.DB.batch(stm);
  if (A.enf) { try { await enfInitDb(env); await enfLogStmt(env, { uid: A.u.id, un: String(A.u.un || ''), role: A.u.role, dept: d, k: key, res: RETRO[sys].state, keys: RETRO[sys].key, scope: retroScopeKey(scope), decision: 'allow', why: act, reason: act === 'open' ? (w.reason || '') : '', path: '/api/retro', ip: meta.ip }).run(); } catch (eL8) { swallow('retro-authz-log', eL8, env.__rid); } }
  return json({ ok: 1, window: w, today: T, now: now, decision: { asis: may, toBe: !!tob.ok, why: tob.why || '' } });
}
async function irRetroCommit(ctx, state, window, scope, act, meta, now) {
  var env = ctx.env, A = ctx.A, key = retroKey(ctx.d, 'irshad'), domain = irConvert(ctx.d, { retro: state }),
    statements = [env.DB.prepare('DELETE FROM irshad_retro_windows WHERE department_id=?1').bind(ctx.d)];
  statements.push.apply(statements, rsBulk(env, IR_TABLES.windows[0], IR_TABLES.windows[1], domain.rows.windows));
  statements.push.apply(statements, irMarkResourceStatements(env, ctx.d, 'retro'));
  statements.push.apply(statements, irBumpStatements(env, key, false));
  statements.push(env.DB.prepare("INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,ename,act,ctx,bef,aft,ip,dev,city)VALUES(?1,?2,?3,?4,?5,?6,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER),'retro',?7,?8,?9,?10,'',?11,?12,?13,?14)")
    .bind('retro_' + window.id + '_' + act, now, A.u.id, String(A.u.un || ''), ctx.d, key, 'irshad:' + retroScopeKey(scope),
      'استدراك ' + RETRO.irshad.name + ' ' + retroScopeKey(scope), act === 'open' ? 'opened' : 'closed',
      JSON.stringify({ sys: 'irshad', scope: scope, key: RETRO.irshad.key }),
      JSON.stringify(act === 'open' ? { until: window.until, hours: window.hours, reason: window.reason, by: window.by.un } : { closedAt: window.closedAt, by: String(A.u.un || '') }),
      meta.ip || '', meta.dev || '', meta.city || ''));
  if (A.enf) statements.push(enfLogStmt(env, { uid: A.u.id, un: String(A.u.un || ''), role: A.u.role, dept: ctx.d,
    k: key, res: RETRO.irshad.state, keys: RETRO.irshad.key, scope: retroScopeKey(scope), decision: 'allow', why: act,
    reason: act === 'open' ? (window.reason || '') : '', path: '/api/retro', ip: meta.ip }));
  await env.DB.batch(ctx.guards.concat(statements));
  preOff(env);
}
