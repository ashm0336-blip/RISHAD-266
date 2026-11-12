/* ═══ KIVO_263 · SOT-096 — مساراتُ المصادقة والجلسة في طبقةٍ واحدةٍ معروفة (كانت أسطراً داخل handle في 063) ═══
   النقلُ حرفيّ: الكتلُ نفسُها بترتيبها وبالدوال نفسِها (json · guard* · secLog · verifyPw · hashPw · setCookie · …)، فالسلوكُ واحد —
   يثبته tests/unit/{session_lifecycle,adversarial,auth_routes}.test.mjs وحزمُ البوابة. دورةُ حياة الجلسة كاملةً في docs/security.md §الجلسة.
   authPublicRoutes: قبل الجلسة — استعادةُ مدير النظام بالمفتاح · الدخول دون تهيئة حساب تلقائي · الخروج (GET تنقّلاً · POST)
   authSessionRoutes: بجلسةٍ صالحة وحسابٍ قائم — whoami · «صفحتي» (/api/me) · إنهاءُ جلساتي الأخرى · فحصُ كلمة المرور الحالية */
async function authPublicRoutes(request, env, path, url) {
  /* ── استعادة دخول مدير النظام بمفتاح الاستعادة — من شاشة الدخول، بلا جلسة ── */
  if (path === '/api/recover' && request.method === 'POST') {
    var br; try { br = await request.json(); } catch (e) { return json({ ok: 0, err: 'طلب غير مفهوم' }, 400); }
    var badR = bodyCheck('/api/recover', br); if (badR) return json({ ok: 0, err: 'bad-body', at: badR }, 400);   /* SOT-101 · src/schemas/api/bodies.schema.json */
    var ipR = request.headers.get('CF-Connecting-IP') || 'x', gkR = 'rk:' + ipR, rmR = reqMeta(request);
    var leftR = await guardLeft(env, gkR);
    if (leftR > 0) return json({ ok: 0, err: 'محاولات كثيرة — انتظر ' + secAr(leftR / 1000), wait: Math.ceil(leftR / 1000) });   /* KIVO_260: صيغةُ العدد + الثواني رقماً */
    var rkH = await metaGet(env, 'rk'), rkU = await metaGet(env, 'rk_uid');
    var keyIn = normKey(br.key);
    if (!rkH || keyIn.length !== 20 || (await verifyPw('rk:' + keyIn, rkH)) !== true) {
      await guardFail(env, gkR); await secLog(env, { act: 'recover_fail', detail: rkH ? 'bad-key' : 'no-key', ip: rmR.ip, city: rmR.city, dev: rmR.dev });
      return json({ ok: 0, err: 'مفتاح الاستعادة غير صحيح' });
    }
    var npw = String(br.pw == null ? '' : br.pw);
    if (!pwCheck(npw, 'super')) return json({ ok: 0, err: 'كلمة المرور الجديدة ضعيفة — 6 أرقام (غير مكررة ولا متتابعة)' });
    var usRv = (await revsAll(env))[K_USERS] || 0, usR = (await usersList(env)) || [];   /* the revision read before the list guards the write below */
    var tgt = usR.filter(function (x) { return x.id === rkU && x.role === 'super'; })[0] || usR.filter(function (x) { return x.role === 'super' && !x.bk; })[0] || usR.filter(function (x) { return x.role === 'super'; })[0];
    if (!tgt) return json({ ok: 0, err: 'لا يوجد حساب مدير نظام' });
    var phR = await hashPw(npw);
    var usR2 = usR.map(function (x) { return x.id === tgt.id ? Object.assign({}, x, { ph: phR, dis: 0, mc: 0 }) : x; });
    var stR = [revGuard(env, K_USERS, usRv)].concat(kvPutStmts(env, 'kv', K_USERS, JSON.stringify(usR2)));   /* a concurrent account save or recovery since the read ⇒ nothing written, key kept */
    var rvR = await nextRev(env);
    stR.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').bind(K_USERS, rvR));
    stR.push(env.DB.prepare('DELETE FROM meta WHERE k IN (?1, ?2, ?3)').bind('rk', 'rk_uid', 'rk_meta'));   /* يُبطل بعد الاستعمال */
    stR.push(env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rk_used', JSON.stringify({ ts: Date.now(), uid: tgt.id, city: rmR.city, dev: rmR.dev })));
    stR.push(env.DB.prepare('DELETE FROM sess WHERE uid = ?1').bind(tgt.id));
    stR.push(env.DB.prepare('DELETE FROM guard WHERE gk IN (?1, ?2)').bind('u:' + String(tgt.un).toLowerCase(), gkR));
    try { await env.DB.batch(stR); }
    catch (eR) { if (isRevConflict(eR)) return json({ ok: 0, err: 'تغيّرت الحسابات أثناء الاستعادة — لم يُحفظ شيء، أعد المحاولة' }, 409); throw eR; }
    await secLog(env, { uid: tgt.id, un: tgt.un, act: 'recover_ok', detail: 'password-reset-by-recovery-key', ip: rmR.ip, city: rmR.city, dev: rmR.dev });
    return json({ ok: 1, un: tgt.un });
  }

  /* ── تسجيل الدخول ── */
  if (path === '/api/login' && request.method === 'POST') {
    var b;
    try { b = await request.json(); } catch (e) { return json({ ok: 0, err: 'طلب غير مفهوم' }, 400); }
    var badL = bodyCheck('/api/login', b); if (badL) return json({ ok: 0, err: 'bad-body', at: badL }, 400);   /* SOT-101 · src/schemas/api/bodies.schema.json */
    var un = String(b.u || '').trim().toLowerCase();
    var pw = String(b.p == null ? '' : b.p);
    if (!un) return json({ ok: 0, err: 'اسم المستخدم مطلوب' });
    var ip = request.headers.get('CF-Connecting-IP') || 'x';
    /* القفلُ على اسم الحساب كان بابَ حرمانٍ لا بابَ حماية: مهاجمٌ من أيِّ
       مصدرٍ يقفل حسابَ ضحيةٍ بخمس محاولاتٍ خاطئة. فصار الحجبُ على المصدر
       وعلى الزوج (حساب+مصدر)، وبقي عدّادُ الحساب إنذاراً لمدير النظام.
       وبهذا يبقى التخمينُ مكلفاً — كلُّ مصدرٍ يُقفل بعد LOCK_N — ويدخل
       صاحبُ الحساب بكلمته الصحيحة من مصدرٍ سليمٍ في كل حال. */
    var gkU = 'u:' + un, gkI = 'ip:' + ip, gkP = 'p:' + un + '|' + ip;
    /* v7-C · Issue 2 (ب): إبطاءٌ بلا قفل — مطفأ افتراضياً (سياسةُ الأمن thrOn)؛ مطفأً لا يُنفَّذ من هذا السطر شيء */
    if (THR_ON) { var slowL = await loginSlow(env, un); if (slowL) await new Promise(function (res) { setTimeout(res, slowL); }); }
    var left = Math.max(await guardLeft(env, gkI), await guardLeft(env, gkP));
    var rmF = reqMeta(request);
    if (left > 0) return json({ ok: 0, err: 'محاولات كثيرة — انتظر ' + secAr(left / 1000), wait: Math.ceil(left / 1000) });   /* KIVO_260: صيغةُ العدد + الثواني رقماً (العدّادُ في الواجهة يقرؤها) */

    /* Every issued session is bound atomically to the identity revision just verified.
       A bounded retry rechecks credentials after concurrent edits; a stale snapshot never authenticates. */
    for (var loginAttempt = 0; loginAttempt < 3; loginAttempt++) {
      if (loginAttempt && env.__pre) env.__pre.live = false;
      var usersRev = (await revsAll(env))[K_USERS] || 0;
      var users = await usersList(env);
      /* لا تهيئة حسابات عبر مسار الدخول: قاعدة فارغة تبقى مغلقة حتى تهيئة إدارية خارج المسار العام. */
      if (!users) {
        await verifyPw(pw, PW_DUMMY());
        await guardFail(env, gkP); await guardFail(env, gkI); await guardCount(env, gkU);
        return json({ ok: 0, err: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }
      var u = users.filter(function (x) {
        return String(x.un || '').toLowerCase() === un || String(x.alt || '').toLowerCase() === un;
      })[0];
      /* v7-C · Issue 2 (التوقيت): الاسمُ المجهول كان يُردّ بلا PBKDF2 — فرقُ زمنٍ يكشف وجودَ الحساب. الآن كلُّ إخفاقٍ يدفع اشتقاقاً واحداً
         بالتكرارات الحالية ضد تجزئةٍ وهمية لا تطابق شيئاً (والحسابُ بتجزئةٍ قديمة p1 كذلك)؛ الردُّ نفسُه حرفاً. */
      if (!u) { await verifyPw(pw, PW_DUMMY()); await guardFail(env, gkP); await guardFail(env, gkI); await guardCount(env, gkU); await secLog(env, { un: un, act: 'login_fail', detail: 'no-user', ip: rmF.ip, city: rmF.city, dev: rmF.dev }); return json({ ok: 0, err: 'اسم المستخدم أو كلمة المرور غير صحيحة' }); }
      var good = await verifyPw(pw, u.ph);
      if (good === 'unsupported') return json({ ok: 0, err: ERR_ITER });
      if (good !== true) { if (isLegacy(u.ph)) await verifyPw(pw, PW_DUMMY()); await guardFail(env, gkP); await guardFail(env, gkI); await guardCount(env, gkU); await secLog(env, { uid: u.id, un: un, act: 'login_fail', detail: 'bad-pw', ip: rmF.ip, city: rmF.city, dev: rmF.dev }); return json({ ok: 0, err: 'اسم المستخدم أو كلمة المرور غير صحيحة' }); }
      if (u.dis) { await secLog(env, { uid: u.id, un: un, act: 'login_fail', detail: 'frozen', ip: rmF.ip, city: rmF.city, dev: rmF.dev }); return json({ ok: 0, err: 'الحساب غير نشط — راجع مدير الإدارة' }); }

      var loginStmts = [revGuard(env, K_USERS, usersRev)];
      if (isLegacy(u.ph)) {
        var nh = await hashPw(pw);
        var upgraded = users.map(function (x) { return x.id === u.id ? Object.assign({}, x, { ph: nh }) : x; });
        loginStmts = loginStmts.concat(kvPutStmts(env, 'kv', K_USERS, JSON.stringify(upgraded)));
        /* The upgrade remains observable by clients, while its guard and session commit together. */
        var rv2 = await nextRev(env);
        loginStmts.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').bind(K_USERS, rv2));
      }
      var tok = randTok(), now = Date.now(), rm = reqMeta(request);
      loginStmts.push(env.DB.prepare('INSERT INTO sess (tok, uid, ts, la, dev, city) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(tok, u.id, now, now, rm.dev, rm.city));
      try { await env.DB.batch(loginStmts); }
      catch (eL) { if (isRevConflict(eL)) continue; throw eL; }

      await guardReset(env, gkU); await guardOk(env, gkI); await guardReset(env, gkP);   /* v7-C · Issue 2 (ج): الزوجُ وعدّادُ الإنذار يُحذفان كما كانا؛ المصدرُ يُردّ حجزُه فقط (guardOk) */
      /* RISHAD266 · دخولٌ من جهازٍ جديد يُحكم هنا عند الدخول (كان المتصفحُ يرسله عند فتح الصفحة بذاكرة المتصفح — فتكرّر): معرّفُ جهازٍ عشوائيّ لكل متصفح
         (كعكةُ bs_dv · HttpOnly) يُقارن بدخولات الحساب في 180 يوماً من سجل الأمن؛ أولُ دخولٍ مسجَّل بمعرّفٍ يمرّ بلا تنبيه، وفشلُ التنبيه لا يُسقط الدخول */
      var dvB = /Edg\//.test(rm.ua) ? 'Edge' : /Chrome\//.test(rm.ua) ? 'Chrome' : /Safari\//.test(rm.ua) ? 'Safari' : 'متصفح', dvC = readCookie(request, 'bs_dv'), dvN = !/^[0-9a-f]{16}$/.test(dvC || '');
      if (dvN) dvC = crypto.randomUUID().replace(/-/g, '').slice(0, 16); var dvS = 'dv:' + dvC;
      try { if (u.role !== 'super' && u.ekey && u.deptId) { var dvR = await env.DB.prepare("SELECT MAX(detail = ?2) n FROM sec WHERE act = 'login_ok' AND ts > ?3 AND uid = ?1 AND detail LIKE 'dv:%'").bind(u.id, dvS, now - 15552e6).first();
        if (dvR && dvR.n === 0) { var Adv = await actorOf(env, u.id); if (Adv) await nfEmitEvents(env, Adv, [{ type: 'sc_dev', dept: u.deptId, own: [String(u.ekey)], vars: { 'الجهاز': (rm.dev === 'm' ? 'هاتف' : 'حاسوب') + ' · ' + dvB + (rm.city ? ' · ' + rm.city : ''), 'المدينة': rm.city || '' } }], true); } } } catch (eDv) { swallow('sc-dev', eDv, env.__rid); }
      await secLog(env, { uid: u.id, un: u.un, act: 'login_ok', detail: dvS, ip: rm.ip, city: rm.city, dev: rm.dev });
      /* mc على السجل: كلمة مؤقتة عيّنها مدير النظام — تُفرض على أي دور */
      var mustChange = !!u.mc || ((u.role === 'staff' || u.role === 'gm') ? false : (!pwCheck(pw, u.role) || !unCheck(u.un)));
      var resL = json({ ok: 1, uid: u.id, role: u.role || '', deptId: u.deptId || '', mustChange: mustChange ? 1 : 0 }, 200, setCookie(tok, url));
      if (dvN) resL.headers.append('Set-Cookie', setCookie(dvC, url)['Set-Cookie'].replace(/^[^=]*/, 'bs_dv').replace(/Max-Age=\d+/, 'Max-Age=63072000'));   /* سماتُ كعكة الجلسة نفسُها (Secure خارج المحلي) باسمها ومدّتها */
      return resL;
    }
    return json({ ok: 0, err: 'تغيّر الحساب أثناء تسجيل الدخول — أعد المحاولة' });
  }

  /* ── الخروج ── */
  /* الخروج بالتنقّل: GET /api/logout يُنهي الجلسة ويمسح الكوكي ويعيد التوجيه إلى الجذر في طلبٍ واحد —
     فلا ينتظر المستخدم طلباً متزامناً ثم إعادة تحميل (كان يبدو كأن الصفحة «تعلّق» قبل الخروج) */
  if (path === '/api/logout' && request.method === 'GET') {
    /* التنقّلُ من موقعٍ آخر لا يُخرج المستخدم: الحارسُ العام يفحص POST/PUT/DELETE
       وحدها، وهذا مسارُ تنقّلٍ يغيّر الحالة — فيُفحص مصدرُه هنا. وغيابُ الإشارة
       (تنقّلٌ مباشر · none · عميلٌ بلا Origin) يمرّ كما كان. */
    var orgG = request.headers.get('Origin'), sfsG = request.headers.get('Sec-Fetch-Site');
    if ((orgG && orgG !== url.origin) || sfsG === 'cross-site' || sfsG === 'same-site')
      return json({ ok: 0, err: 'origin' }, 403);
    var tkG = readCookie(request, COOKIE);
    if (tkG) {
      try { var sxG = await env.DB.prepare('SELECT uid FROM sess WHERE tok = ?1').bind(tkG).first(); await env.DB.prepare('DELETE FROM sess WHERE tok = ?1').bind(tkG).run();
        if (sxG) { var rmG = reqMeta(request); var uG = ((await usersList(env)) || []).filter(function (x) { return x.id === sxG.uid; })[0]; await secLog(env, { uid: sxG.uid, un: uG ? uG.un : '', act: 'logout', ip: rmG.ip, city: rmG.city, dev: rmG.dev }); } } catch (eG) { swallow('logout-seclog', eG, env.__rid); }
    }
    var hG = new Headers(clearCookie(url)); hG.set('Location', '/'); hG.set('Cache-Control', 'no-store');
    return new Response(null, { status: 303, headers: hG });
  }
  if (path === '/api/logout' && request.method === 'POST') {
    var tk = readCookie(request, COOKIE);
    if (tk) {
      var sx = await env.DB.prepare('SELECT uid FROM sess WHERE tok = ?1').bind(tk).first();
      await env.DB.prepare('DELETE FROM sess WHERE tok = ?1').bind(tk).run();
      if (sx) { var rmL = reqMeta(request); var uL = ((await usersList(env)) || []).filter(function (x) { return x.id === sx.uid; })[0]; await secLog(env, { uid: sx.uid, un: uL ? uL.un : '', act: 'logout', ip: rmL.ip, city: rmL.city, dev: rmL.dev }); }
    }
    return json({ ok: 1 }, 200, clearCookie(url));
  }

  return null;
}
async function authSessionRoutes(request, env, path, ss) {
  /* جسّ الجلسة: هل كوكي هذا المتصفح حي عند الخادم؟ */
  if (path === '/api/whoami') return json({ ok: 1, uid: ss.uid });
  /* ── KIVO_264 · «ملفي»: القراءةُ الذاتية (يومي · سجلّي — صفوفُ صاحب الجلسة وحدها) — workers/parts/062b-me-history.js ── */
  if (path === '/api/me/today' || path === '/api/me/history') return meSelfRoutes(request, env, path, ss);
  /* ── KIVO_264 · KIVO-Tasks: «ملفي ← مهامي» ومساراتُ المهام — /api/me/tasks* و/api/tasks/* (workers/parts/062c-me-tasks.js · 071–073 · tkRoutePath) ── */
  if (tkRoutePath(path)) { var tkRes = await meTasksRoutes(request, env, path, ss); if (tkRes) return tkRes; }

  /* ── «صفحتي»: جلساتي وأحداثي الأمنية — بنطاق المستخدم نفسه فقط (لا يرى غيره) ── */
  if (path === '/api/me') {
    var nowM = Date.now(), tokM = readCookie(request, COOKIE) || '';
    /* KIVO_255 · AUD-037: الاستعلاماتُ الثلاثة مستقلةٌ — دفعةٌ واحدة بدل ثلاث جولات */
    var bM = await env.DB.batch([
      env.DB.prepare('SELECT tok, ts, la, dev, city FROM sess WHERE uid = ?1 AND la > ?2 ORDER BY la DESC').bind(ss.uid, nowM - IDLE_MAX),
      env.DB.prepare("SELECT ts, act, detail, city, dev FROM sec WHERE uid = ?1 AND act IN ('login_ok','login_fail','pw_change','sess_kill','logout') ORDER BY ts DESC, id DESC LIMIT 8").bind(ss.uid),
      env.DB.prepare("SELECT ts, city, dev FROM sec WHERE uid = ?1 AND act = 'login_ok' ORDER BY ts DESC LIMIT 2").bind(ss.uid)]);
    var rsM = bM[0], evM = bM[1], lastOk = bM[2];
    var sessM = ((rsM && rsM.results) || []).map(function (r) { return { mine: r.tok === tokM, ts: r.ts, la: r.la, dev: r.dev || 'd', city: r.city || '', active: nowM - r.la <= PRESENCE_MS }; });
    var lo = ((lastOk && lastOk.results) || []);
    return json({ ok: 1, now: nowM, sess: sessM, events: ((evM && evM.results) || []), lastLogin: lo[1] || null, thisLogin: lo[0] || null });
  }
  if (path === '/api/me/sess/kill' && request.method === 'POST') {
    var tokK = readCookie(request, COOKIE) || '';
    await env.DB.prepare('DELETE FROM sess WHERE uid = ?1 AND tok <> ?2').bind(ss.uid, tokK).run();
    var rmMe = reqMeta(request); var uMe = ((await usersList(env)) || []).filter(function (x) { return x.id === ss.uid; })[0];
    await secLog(env, { uid: ss.uid, un: uMe ? uMe.un : '', act: 'sess_kill', target: JSON.stringify({ id: ss.uid, name: uMe ? (uMe.name || uMe.un) : '', self: 1 }), detail: 'self-others', ip: rmMe.ip, city: rmMe.city, dev: rmMe.dev });
    return json({ ok: 1 });
  }

  /* ── فحص كلمة المرور الحالية (لتغيير كلمة المرور من داخل الحساب) ── */
  if (path === '/api/checkpw' && request.method === 'POST') {
    var bc; try { bc = await request.json(); } catch (e) { return json({ ok: 0 }, 400); }
    var badC = bodyCheck('/api/checkpw', bc); if (badC) return json({ ok: 0, err: 'bad-body', at: badC }, 400);   /* SOT-101 · src/schemas/api/bodies.schema.json */
    var gkC = 'pw:' + ss.uid;
    if (await guardLeft(env, gkC) > 0) return json({ ok: 0, err: 'محاولات كثيرة — انتظر قليلاً' });
    var us2 = (await usersList(env)) || [];
    var me = us2.filter(function (x) { return x.id === ss.uid; })[0];
    if (!me) return json({ ok: 0 });
    var g2 = await verifyPw(String(bc.p == null ? '' : bc.p), me.ph);
    if (g2 === 'unsupported') return json({ ok: 0, err: ERR_ITER });
    if (g2 !== true) { await guardFail(env, gkC); return json({ ok: 0 }); }
    await guardReset(env, gkC);
    return json({ ok: 1 });
  }

  return null;
}
