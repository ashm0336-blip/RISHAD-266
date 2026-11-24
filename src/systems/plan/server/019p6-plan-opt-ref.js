/* V7 · 53 (port-sync · بند 3 · قرار المالك 24 نوفمبر): تعديلُ اسم خيار المصلى أو رمزه (المنطقة · الدور · النوع · الفئة) يسري على كل ما يتبعه —
   الأشهرُ والجولاتُ المفتوحة والمقفلة والمعتمدة والمنقضية (والمؤرشفة) — بأمرٍ خادميٍّ واحد معلن «plan.optRef» (POST /api/plan/opt-ref · العقد src/api/contracts.json).
   حدودُه (ليس باباً عاماً على القفل):
     ① العميلُ لا يرسل وثيقة: يرسل الخيارَ وحده { kind, was, reg?, name, code? } — والخادمُ يقرأ المخزَّن ويحسب التعديلَ بنفسه (poApply).
     ② لا يمسّ إلا مراجعَ الخيار: في كل عنصرٍ من مصفوفة «zones» (الخطة: الجذر · المواقع · الأشهر — الجولات: الأيام · لقطاتُ الاعتماد) حقولُ
        region · level · ztype · zcat بالاسم القديم، ورمزُ code لمن يتبع الخيار — وفي كتالوج الخيارات مدخلُه ومراجعُه (أدوارُ المنطقة r · فئاتُ النوع r ·
        مفاتيحُ ألوانها zcatStyle · قوائمُ فئات النوع c). قبل الحفظ يُثبت الخادمُ (poOnly) أن الخطةَ والجولاتِ بعد حذف هذه الحقول وحدها مطابقتان حرفاً
        لما قبله — فلا قفلٌ يُفتح (mo · approved · ap · shAp كما هي) ولا اعتمادٌ يُلغى ولا حقلٌ آخر يتغيّر.
     ③ الحفظُ الذرّيُّ نفسُه (019e rsSaveCommit) بصلاحيات الفاعل كلِّها (تعديلُ الخيارات · المصليات في الخطة والجولات) — الأمرُ لا يمنح صلاحية؛
        يرفع وحده رفضَ بُعد DateRange (قفلُ الفترة/الاعتماد) لموردَي الخطة والجولات، بالرمز الداخلي ENF_OPTREF (057) الذي لا يصل إليه طلبٌ من العميل.
     ④ يُسجَّل في سجل النشاط باسم الفاعل (aud: uid — يعرضه السجلُّ باسمه): الخيارُ قبل/بعد وعددُ المصليات والأشهر والأيام. */
/* poN اسمُ الخيار · poC رمزُه · poR مرجعُه (r) · poL قائمةُ نوعٍ من الكتالوج */
function poN(o) { return typeof o === 'string' ? o : isObj(o) && typeof o.n === 'string' ? o.n : ''; }
function poC(o) { return !isObj(o) ? '' : typeof o.c === 'string' ? o.c : typeof o.k === 'string' ? o.k : ''; }
function poR(o) { return isObj(o) && typeof o.r === 'string' ? o.r : ''; }
function poL(O, k) { return isObj(O) && Array.isArray(O[k]) ? O[k] : []; }
/* رمزُ المصلى من خياراته — مرآةُ _composeZoneCode في الصفحتين (منطقة-دور-نوع-تسلسل) */
function poCode(O, z) {
  var f = function (k, t) { return poL(O, k).filter(function (o) { return poN(o) === z[k] && (!t || t(o)); })[0]; }, out = [];
  [f('region'), z.level && (f('level', function (o) { return poR(o) === z.region; }) || f('level', function (o) { return !poR(o); }) || f('level')), f('ztype')]
    .forEach(function (o) { if (poC(o)) out.push(poC(o)); });
  return out.concat(z.ser || '00').join('-');
}
/* كلُّ مصفوفة «zones» في الوثيقة عنصراً عنصراً (نسخةٌ جديدة) */
function poZ(v, fn, key) {
  if (Array.isArray(v)) return v.map(function (x) { return key === 'zones' && isObj(x) ? fn(x) : poZ(x, fn); });
  if (!isObj(v)) return v;
  var o = {}; Object.keys(v).forEach(function (k) { o[k] = poZ(v[k], fn, k); }); return o;
}
/* الحدّ ②: الوثيقةُ بلا حقول الخيار — ما يبقى يطابق ما قبل الأمر حرفاً */
function poOnly(a, b) { var s = function (z) { z = Object.assign({}, z); ['region', 'level', 'ztype', 'zcat', 'code'].forEach(function (f) { delete z[f]; }); return z; }; return deq(poZ(a, s), poZ(b, s)); }
function poE(code, st, at) { var e = Error(code); e.po = [code, st || 409, at]; return e; }
/* الحسابُ الخالص: { O, P, R, n } من المخزَّن ومواصفة الأمر S = { kind, was, reg, name, code } */
function poApply(S, O, P, R) {
  var k = S.kind, was = S.was, nm = S.name, reg = S.reg, list = poL(O, k), z = k === 'zcat', at = -1;
  list.forEach(function (o, j) { if (at < 0 && poN(o) === was && (k === 'level' ? poR(o) === reg : !z || !poR(o) || poR(o) === reg)) at = j; });
  if (at < 0) throw poE('opt-missing', 409, 'was');
  var own = z ? poR(list[at]) : reg, oc = poC(list[at]), ren = nm !== was;
  if (list.some(function (o, j) { return j !== at && poN(o) === nm && (k !== 'level' && !z || poR(o) === own); })) throw poE('opt-duplicate', 409, 'name');
  if ((k === 'region' || k === 'ztype') && list.some(function (o, j) { return j !== at && poC(o) === S.code; })) throw poE('opt-code-duplicate', 409, 'code');
  if (!ren && (z || S.code === oc)) throw poE('opt-unchanged', 400, 'name');
  var O2 = JSON.parse(JSON.stringify(O)), rr = function (q) { O2[q] = poL(O2, q).map(function (o) { return isObj(o) && o.r === was ? Object.assign({}, o, { r: nm }) : o; }); },
    st = isObj(O2.zcatStyle) ? O2.zcatStyle : null, mv = function (a, b) { if (st && st[a] && a !== b) { st[b] = st[a]; delete st[a]; return 1; } };
  O2[k] = list.map(function (o, j) {
    if (j !== at) return o;
    if (z) return typeof o === 'string' ? nm : Object.assign({}, o, { n: nm });
    o = Object.assign({}, isObj(o) ? o : {}, { n: nm });
    if (k === 'ztype') { o.k = S.code; if (typeof o.c === 'string') delete o.c; } else o.c = S.code;
    return o;
  });
  if (ren && k === 'region') rr('level');                                                                   /* المنطقةُ تحمل أدوارَها */
  if (ren && k === 'ztype') { rr('zcat'); if (st) Object.keys(st).forEach(function (q) { if (q.indexOf(was + ' · ') === 0) mv(q, nm + q.slice(was.length)); }); }   /* والنوعُ فئاتِه وألوانَها */
  if (ren && z) {
    mv(own ? own + ' · ' + was : was, own ? own + ' · ' + nm : nm) || mv(was, own ? own + ' · ' + nm : nm);
    O2.ztype = poL(O2, 'ztype').map(function (o) { return isObj(o) && Array.isArray(o.c) && (!own || o.n === own) ? Object.assign({}, o, { c: o.c.map(function (c) { return c === was ? nm : c; }) }) : o; });
  }
  var n = { plan: 0, rounds: 0 }, one = function (t) {
    return function (q) {
      if (q[k] !== was || (k === 'level' && q.region !== reg) || (z && own && q.ztype !== own)) return q;
      var o = Object.assign({}, q); o[k] = nm;
      if (!z && o.ser != null && o.ser !== '') o.code = poCode(O2, o);                                       /* الرمزُ لمن يتبع الخيار وحده */
      n[t]++; return o;
    };
  };
  var P2 = poZ(P, one('plan')), R2 = poZ(R, one('rounds'));
  if (!poOnly(P, P2) || !poOnly(R, R2)) throw poE('opt-ref-bound', 500);
  return { O: O2, P: P2, R: R2, n: n, oc: oc };
}
async function poRoute(env, request, url, ss) {
  try {
    if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
    var bad = sessUidMismatch(env, url, ss, '/api/plan/opt-ref'); if (bad) return bad;
    var A = await actorOf(env, ss.uid); if (!A) return json({ ok: 0, err: 'session' }, 401);
    var rd = await bodyRead(request, '/api/plan/opt-ref'); if (rd.res) return rd.res;
    var b = rd.v, S = { kind: b.kind, was: b.was, name: b.name, reg: b.reg || '', code: b.code || '' }, d = b.dept, ok = function (v) { return typeof v === 'string' && v && v.trim() === v; };
    if (b.uid != null && String(b.uid) !== String(ss.uid)) return json({ ok: 0, err: 'session-changed' }, 409);
    ['kind', 'was', 'name'].concat(S.kind === 'zcat' ? [] : ['code'], S.kind === 'level' ? ['reg'] : []).forEach(function (f) { if (!ok(S[f]) || (f === 'kind' && !/^(region|level|ztype|zcat)$/.test(S.kind))) throw poE('bad-body', 400, f); });
    if (!(A.depts || []).some(function (x) { return x && x.id === d; }) || !deptInScope(A, d)) return json({ ok: 0, err: 'forbidden', why: 'dept' }, 403);
    var lim = await rlHit(env, 'sv', A.u.id, RL_SAVE); if (lim) return tooMany(lim);
    var K = function (r) { return 'bsdept:' + d + ':' + r; }, ks = [K('bassam_zone_opts_v1'), K('bassam_plan_v1'), K('bassam_rounds_v1')], rv = [], v = [], i;
    for (i = 0; i < 3; i++) { var row = await env.DB.prepare('SELECT rev FROM revs WHERE k = ?1').bind(ks[i]).first(); rv[i] = (row && row.rev) || 0; v[i] = parseJson(await opResourceGet(env, ks[i]), null); }
    if (rv[0] !== b.base) return json({ ok: 0, err: 'conflict', at: 'base' }, 409);                       /* الكتالوجُ تغيّر منذ قرأه المعدِّل */
    var arc = parseJson(await opResourceGet(env, K(DAILY_ARC_RES)), null);                                 /* الجولاتُ وثيقةٌ منطقية: الأرشيفُ تحت الحيّ (019p3) */
    if (isObj(arc)) v[2] = Object.assign({}, arc, isObj(v[2]) ? v[2] : {});
    var X = poApply(S, isObj(v[0]) ? v[0] : {}, v[1], v[2]), out = [X.O, X.n.plan && X.P, X.n.rounds && X.R], set = {}, base = {}, aud = [], f = {}, cid = 'po' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    f[S.kind] = [S.was, S.name]; if (S.kind !== 'zcat' && X.oc !== S.code) f.code = [X.oc, S.code];
    for (i = 0; i < 3; i++) if (out[i]) {
      set[ks[i]] = JSON.stringify(out[i]); base[ks[i]] = rv[i];
      aud.push({ cid: cid + i, k: ks[i], etype: 'dataset', act: 'edited', eid: resName(ks[i]), ename: resName(ks[i]), after: JSON.stringify({ f: f }),
        ctx: JSON.stringify({ cmd: 'plan.optRef', kind: S.kind, reg: S.reg || undefined, zones: X.n, by: String(A.u.name || A.u.un || '') }) });
    }
    var res = await rsSaveCommit(env, A, { set: set, del: [], base: base, aud: aud }, reqMeta(request), { srv: 1, __optRef: ENF_OPTREF, __optRefRes: { bassam_plan_v1: 1, bassam_rounds_v1: 1 } });
    if (!res || res.ok !== 1) { var dn = Object.keys((res && res.denied) || {}).length; return json({ ok: 0, err: dn ? 'denied' : 'conflict', denied: res && res.denied, conflicts: res && res.conflicts }, dn ? 403 : 409); }
    return json({ ok: 1, kind: S.kind, was: S.was, name: S.name, code: S.code, zones: X.n, rev: res.v, revs: res.revs || {} });
  } catch (e) {
    if (e && e.po) return json({ ok: 0, err: e.po[0], at: e.po[2] }, e.po[1]);
    if (/KIVO_RESTORE_EPOCH|KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT/.test(String(e)) || (e && e.rs)) return json({ ok: 0, err: e.rs || 'conflict' }, (e && e.status) || 409);
    throw e;
  }
}
