  var tkCtx9 = {}, tkUs9 = null, tkUs9b = null;
  if (!A.__tkSrv) for (k in set) {
    if (resName(k) !== 'bassam_tasks_v1') continue;
    var dT9 = parseKey(k).dept; if (!dT9 || tkCtx9[dT9]) continue;
    if (tkUs9 === null) { tkUs9 = Array.isArray(A.users) ? A.users : parseJson(await kvGet(env, 'kv', K_USERS), []); if (!Array.isArray(tkUs9)) tkUs9 = []; }
    /* KIVO_265 · G-2 (تحقّقُ الخلفية): والحساباتُ كما بعد هذه الدفعة إن حملت سجلَّ الحسابات — users2 (018 taskAcctWhy: نشطٌ في القائمتين) */
    /* الفحصُ العميق (R4): الحفظةُ تحمل القائمةَ كما رآها الفاعل — فتُكمَّل بما حُجب عنه (usersNoIn · usersScopeIn) كما ستُكتب */
    /* مراجعةُ التكامل W1-R1: قائمةٌ من إسقاطٍ قديم لا تُكتب (تعارض) ⇒ الحساباتُ بعد الدفعة هي الحالية */
    if (tkUs9b === null) { if (Object.prototype.hasOwnProperty.call(set, K_USERS) && !usStale9) { var tkUc9 = await kvGet(env, 'kv', K_USERS); tkUs9b = parseJson(usersScopeIn(usersNoIn(String(set[K_USERS]), tkUc9, A), tkUc9, A), []); } else tkUs9b = false; if (tkUs9b !== false && !Array.isArray(tkUs9b)) tkUs9b = []; }
    tkCtx9[dT9] = { users: tkUs9, users2: tkUs9b || null, emps: tkEmps(Object.prototype.hasOwnProperty.call(empRaw9, dT9) ? empRaw9[dT9] : await opResourceGet(env, 'bsdept:' + dT9 + ':bassam_employees_v1')) };
  }
