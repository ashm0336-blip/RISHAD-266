#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · AUD-033 (ج) — حزمةُ إصلاحٍ إنتاجيّ مستقلة لـKIVO_242 (المنشورة على Production) · لا تُنشر ولا تمسّ k242/src المجمَّد.
   python3 tools/hotfix242.py [--out <dir>]      الافتراضي: hotfix/KIVO_242_HOTFIX_AUD033
   المصدر: حزمةُ KIVO_242 المسلَّمة (dist/ من KIVO_242_dist_Candidate.zip = k242/src/root/_worker.js بايتاً) — يُبدَّل ملفٌ واحد (_worker.js) بأربع لُصَقٍ نصّية
   مُعلَنة ومعكوسة (عكسُها يعيد بايتات 242 حرفاً)، وكلُّ ملفٍ آخر يبقى بايتاً بايتاً. المخرجات: dist/ · MANIFEST.sha256 · README_AR.txt · zip + SHA256SUMS.
   اللُّصَق: ① curSafe تنزع ph من denied/conflicts.cur لكل الأدوار (كان الخامُ يُسلَّم لكل من يقرأ المفتاح — أي موظفٍ مسجَّل) ② stripPh لا تعيد الخامَ عند تعذّر
   التحليل ③ redactPh حارسٌ أخير في json() والإقلاع (حجبٌ + سطرُ سجلٍّ بلا محتوى) ④ /api/brand يحمل hf لتعرف اللوحةُ أن الإصلاحَ حيّ."""
import os, sys, io, json, hashlib, zipfile, shutil, datetime
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_ZIP = '/home/claude/bundle_raw/KIVO_242_dist_Candidate.zip'
BASE_WORKER = os.path.join(H, 'k242/src/root/_worker.js')
# KIVO_259 (--sr1): كشفت البطاقةُ المستقلة النهائية (reports/k259/scorecard_final_2026-10-11.md) أن هذه الحزمةَ تنزع ph وحده وتترك SR-1 (عالية)
# قائماً في 242: الرقمُ الوظيفي «no» — كلمةُ المرور الأولى لمديري الإدارات والعموم — يُرسل لكل جلسة. --sr1 يضيف إصلاحَ 259 نفسَه (usersNoOut/usersNoIn).
SR1 = '--sr1' in sys.argv
# KIVO_264 · KIVO-Tasks (--sr2): فوق SR-1 حرفاً — عطلُ P0 «ملفي ← مهامي» (RC-1/2/3/4) + فقدُ الإثبات عند تعديل المهمة (RC-12). يمسّ العاملَ والواجهة:
# العاملُ = لُصَقُ SR-1 نفسُها + لُصقتان (موزِّعٌ + المسارُ الذاتي workers/parts/062c-me-tasks.js مكيَّفاً لـ240) · الواجهةُ = k242/src + لُصَقٌ معلنةٌ
# معكوسة في صفحتي «ملفي» و«المهام» + كتلةٌ جديدة (src/services/545-task-self.js بايتاً) مبنيّةً بباني 242 نفسِه مع --retain حزمةِ 242 المسلَّمة؛
# وكلُّ ملفٍّ آخر = حزمةُ SR-1 بايتاً (يتحقّق منه الباني ويرفض أيَّ فرقٍ غيرِ معلن).
SR2 = '--sr2' in sys.argv
if SR2: SR1 = True
NAME = 'KIVO_242_HOTFIX_SR2' if SR2 else ('KIVO_242_HOTFIX_AUD033_SR1' if SR1 else 'KIVO_242_HOTFIX_AUD033')
HF = 'AUD-033c+SR-1+SR-2.2 · 2026-10-14' if SR2 else ('AUD-033c+SR-1 · 2026-10-11' if SR1 else 'AUD-033c · 2026-10-10')
OUT = os.path.abspath(sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(H, 'hotfix', NAME))
sha = lambda b: hashlib.sha256(b).hexdigest()
HUNKS = [
 ("curSafe (كل الأدوار)",
  "  var curSafe = function (kq, cq) { return canRead(A, kq) ? cq : null; };\n",
  "  var curSafe = function (kq, cq) { if (!canRead(A, kq)) return null; if (kq === K_USERS && cq != null) cq = stripPh(cq); return cq; };   /* HOTFIX AUD-033 (ج): القيمةُ الحالية في denied/conflicts بلا بصمات — لكل الأدوار */\n"),
 ("stripPh (لا خامَ عند الفشل)",
  "function stripPh(rawJson) {\n  /* نسخة العرض: بلا بصمات. إن تعذّر التحليل تُعاد كما هي كي لا يتعطل شيء */\n  try {\n    var v = JSON.parse(rawJson);\n    if (!Array.isArray(v)) return rawJson;\n    return JSON.stringify(v.map(function (u) { var c = {}; for (var k in u) if (k !== 'ph') c[k] = u[k]; return c; }));\n  } catch (e) { return rawJson; }\n}\n",
  "function stripPh(rawJson) {\n  /* نسخة العرض: بلا بصمات. HOTFIX AUD-033 (ج): إن تعذّر التحليل لا تُعاد القيمةُ خاماً أبداً — قائمةٌ فارغة + تحذيرٌ بلا محتوى */\n  try {\n    var v = JSON.parse(rawJson);\n    if (!Array.isArray(v)) { hfWarn('users-unparseable', 'not-array'); return '[]'; }\n    return JSON.stringify(v.map(function (u) { var c = {}; for (var k in u) if (k !== 'ph') c[k] = u[k]; return c; }));\n  } catch (e) { hfWarn('users-unparseable', 'parse'); return '[]'; }\n}\n/* HOTFIX AUD-033 (ج) — الحارسُ الأخير: أيُّ بصمةٍ في أيّ استجابةٍ تُحجب قبل الإرسال ويُسجَّل الحدثُ بلا محتوى */\nvar HOTFIX_ID = '" + HF + "';\nvar PH_REDACT_RE = /\"ph\"\\s*:\\s*\"(?:p1\\$|p2\\$)[^\"]*\"|p2\\$\\d+\\$[A-Za-z0-9+\\/=._-]{16,}|p1\\$[a-z0-9]{4,}\\.[a-z0-9]{4,}/g;\nfunction hfWarn(ev, kind) { try { console.warn(JSON.stringify({ v: 1, t: new Date().toISOString(), lvl: 'warn', ev: ev, kind: kind, hf: HOTFIX_ID })); } catch (e) {} }\nfunction redactPh(s, where) {\n  if (typeof s !== 'string' || s.indexOf('p1$') < 0 && s.indexOf('p2$') < 0) return s;\n  var n = 0, out = s.replace(PH_REDACT_RE, function (m) { n++; return m.charAt(0) === '\"' ? '\"ph\":\"\"' : '[redacted]'; });\n  if (n) hfWarn('ph-redacted', (where || '') + ':' + n);\n  return out;\n}\n"),
 ("json() (حارس)",
  "function json(o, status, extra) {\n  var h = Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {});\n  return new Response(JSON.stringify(o), { status: status || 200, headers: h });\n}\n",
  "function json(o, status, extra) {\n  var h = Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {});\n  return new Response(redactPh(JSON.stringify(o), 'json'), { status: status || 200, headers: h });   /* HOTFIX AUD-033 (ج) */\n}\n"),
 ("الإقلاع inject()",
  "  var js = JSON.stringify(boot).replace(/</g, '\\\\u003c').replace(/\\u2028/g, '\\\\u2028').replace(/\\u2029/g, '\\\\u2029');\n",
  "  var js = redactPh(JSON.stringify(boot), 'inject').replace(/</g, '\\\\u003c').replace(/\\u2028/g, '\\\\u2028').replace(/\\u2029/g, '\\\\u2029');\n"),
 ("الإقلاع HTMLRewriter",
  "    var bootJs = JSON.stringify(boot).replace(/</g, '\\\\u003c')",
  "    var bootJs = redactPh(JSON.stringify(boot), 'boot').replace(/</g, '\\\\u003c')"),
 ("/api/brand يحمل hf",
  "      if (path === '/api/brand') return json({ ok: 1, brand: brandPublic(await platGet(env)), ver: WORKER_VER, rk: (await metaGet(env, 'rk')) ? 1 : 0 });\n",
  "      if (path === '/api/brand') return json({ ok: 1, brand: brandPublic(await platGet(env)), ver: WORKER_VER, hf: HOTFIX_ID, rk: (await metaGet(env, 'rk')) ? 1 : 0 });\n"),
]
if SR1:
    HUNKS[0] = ("curSafe (كل الأدوار · بلا ph ولا no لغير صاحبه)", HUNKS[0][1],
      "  var curSafe = function (kq, cq) { if (!canRead(A, kq)) return null; if (kq === K_USERS && cq != null) cq = usersNoOut(stripPh(cq), A); return cq; };   /* HOTFIX AUD-033 (ج) + SR-1: القيمةُ الحالية في denied/conflicts بلا بصمات — ولا رقمَ وظيفيَّ لحساب غير صاحبه */\n")
    HUNKS += [
     ("SR-1 · usersNoOut/usersNoIn (تعريف — نصُّ 259 نفسُه)",
      "/* دمج الحفظ القادم من المتصفح: سجل وصل بلا ph يرث بصمته المخزونة */\nfunction mergeUsers(incomingJson, currentList) {\n",
      "/* HOTFIX SR-1 (= KIVO_259 · workers/parts/054): الرقمُ الوظيفي «no» في حسابات مديري الإدارات ومديري العموم هو كلمةُ مرورهم الأولى\n"
      "   (ph = hash(no) بلا إلزامٍ بالتغيير) وكان يُرسل نصّاً لكل جلسة ⇒ يدخل أيُّ موظفٍ بحساب أيِّ مدير. لا يغادر الخادمَ إلا لمدير النظام ولصاحبه؛\n"
      "   وكتابةُ غيرِ مدير النظام لقائمةٍ بلا «no» ترثه من القيمة الحالية (كما تُورَث البصمة). */\n"
      "function usersNoOut(json, A) {\n"
      "  if (json == null || !A || !A.u || A.u.role === 'super') return json;\n"
      "  var v = parseJson(json, null); if (!Array.isArray(v)) return json;\n"
      "  var me = A.u.id, cut = 0;\n"
      "  var o = v.map(function (u) { if (!u || u.id === me || !Object.prototype.hasOwnProperty.call(u, 'no')) return u; var c = {}; for (var k in u) if (k !== 'no') c[k] = u[k]; cut++; return c; });\n"
      "  return cut ? JSON.stringify(o) : json;\n"
      "}\n"
      "function usersNoIn(incJson, curJson, A) {\n"
      "  if (incJson == null || curJson == null || !A || !A.u || A.u.role === 'super') return incJson;\n"
      "  var inc = parseJson(incJson, null), cur = parseJson(curJson, null);\n"
      "  if (!Array.isArray(inc) || !Array.isArray(cur)) return incJson;\n"
      "  var byId = {}, put = 0; cur.forEach(function (u) { if (u && u.id && Object.prototype.hasOwnProperty.call(u, 'no')) byId[u.id] = u.no; });\n"
      "  var o = inc.map(function (u) {\n"
      "    if (!u || !u.id || Object.prototype.hasOwnProperty.call(u, 'no') || !Object.prototype.hasOwnProperty.call(byId, u.id)) return u;\n"
      "    var c = {}; for (var k in u) c[k] = u[k]; c.no = byId[u.id]; put++; return c;\n"
      "  });\n"
      "  return put ? JSON.stringify(o) : incJson;\n"
      "}\n"
      "/* دمج الحفظ القادم من المتصفح: سجل وصل بلا ph يرث بصمته المخزونة */\nfunction mergeUsers(incomingJson, currentList) {\n"),
     ("SR-1 · /api/get",
      "          if (rdG && gk === K_USERS && gv != null) gv = stripPh(gv);\n",
      "          if (rdG && gk === K_USERS && gv != null) gv = usersNoOut(stripPh(gv), AG);   /* HOTFIX SR-1: ولا رقمَ وظيفيَّ لحساب غيره */\n"),
     ("SR-1 · الإقلاع",
      "      } else {\n      var rvB = await revsAll(env), revsOut = {}, pv4rb = pv4ReadBudget();\n",
      "      } else {\n      if (keys[K_USERS] != null) keys[K_USERS] = usersNoOut(keys[K_USERS], AB);   /* HOTFIX SR-1: الرقمُ الوظيفي لا يُحقن إلا لمدير النظام ولصاحبه */\n      var rvB = await revsAll(env), revsOut = {}, pv4rb = pv4ReadBudget();\n"),
     ("SR-1 · الحفظ يورّث no قبل الحكم",
      "    var cur0 = await kvGet(env, 'kv', k0), P00 = parseKey(k0), d00 = P00 ? P00.dept : '';\n",
      "    var cur0 = await kvGet(env, 'kv', k0), P00 = parseKey(k0), d00 = P00 ? P00.dept : '';\n    if (it0.act === 'set' && k0 === K_USERS) it0.v = usersNoIn(it0.v, cur0, A);   /* HOTFIX SR-1: قائمةٌ بلا «no» من غير مدير النظام ترثه (قبل usersRule) */\n"),
    ]
CLIENT_HUNKS, CLIENT_NEW, CLIENT_PIN = {}, {}, {}
if SR2:
    # المصدرُ مثبَّتٌ للحزمة (لا يتبع تطويرَ المرحلة الثانية في workers/parts/062c): نسخةُ 062c و545 كما شُحنت في SR-2 · 2026-10-13
    # SR-2.1 · 2026-10-14: سطرٌ واحد في 062c — قفلُ الشهر = الاعتمادُ الصريح (true) وحده؛ {mo:1} (شهرٌ منقضٍ فتحه المدير) كان يُعدّ قفلاً
    _PART = open(os.path.join(H, 'tools/hotfix242_sr2/062c-me-tasks.js.pin'), encoding='utf-8').read()
    # تكييفُ 240: nmap (KIVO_261) غائبة ⇒ Object.create(null) · bodyCheck (KIVO_263 · SOT-101) غائبة ⇒ حارسُ وجود — وما عداهما نصُّ الجزء حرفاً
    _PART240 = _PART.replace("toks: nmap() }", "toks: Object.create(null) }").replace(
        "var badB = bodyCheck('/api/me/tasks/act', b);", "var badB = typeof bodyCheck === 'function' ? bodyCheck('/api/me/tasks/act', b) : null;")
    assert 'nmap()' not in _PART240 and _PART240.count('Object.create(null)') == 1 and _PART240.count("typeof bodyCheck === 'function'") == 1
    _WHOAMI = "      if (path === '/api/whoami') return json({ ok: 1, uid: ss.uid });\n"
    HUNKS += [
     ("SR-2 · P0 «مهامي» — الموزِّع (بعد /api/whoami بجلسةٍ صالحة وحسابٍ قائم)", _WHOAMI,
      _WHOAMI + "      if (path === '/api/me/tasks' || path === '/api/me/tasks/act' || path === '/api/me/tasks/img') return await meTasksRoutes(request, env, path, ss);   /* HOTFIX SR-2 (KIVO-Tasks P0): «ملفي ← مهامي» من الخادم */\n"),
     ("SR-2 · P0 «مهامي» — المسارُ الذاتي (workers/parts/062c-me-tasks.js · مكيَّفٌ لـ240)", "\nexport default {",
      "\n/* ═══ HOTFIX SR-2 · " + HF + " — مصدرُه workers/parts/062c-me-tasks.js (KIVO_264) بتكييفين لـ240: nmap ⇒ Object.create(null) · bodyCheck محروس ═══ */\n" + _PART240 + "\nexport default {"),
    ]
    _MT = 'window.BassamMyTasks'
    CLIENT_HUNKS['client/pages/Profile.dc.html'] = [
     ("«مهامي» · _tkAll من الخادم (BassamMyTasks ⇒ GET /api/me/tasks)",
      '_tkAll(){try{const s=localStorage.getItem("bassam_tasks_v1");',
      '_tkAll(){const MT=' + _MT + ';if(MT){const S=MT.state();if(S.rows===this._tkRows0&&this._tkObj0)return this._tkObj0;const e={};(S.rows||[]).forEach(x=>{(e[x.k]=e[x.k]||[])[x.i]=this._tkRowOf(x)});return this._tkRows0=S.rows,this._tkObj0=e,e}try{const s=localStorage.getItem("bassam_tasks_v1");'),
     ("«مهامي» · _tkRowOf + _tkAct (الفعلُ في الخادم — لا تحديثَ متفائل)",
      '\n_tkSave(t){try{return localStorage.setItem("bassam_tasks_v1"',
      '\n_tkRowOf(x){const r=[x.t,x.desc,x.prio,x.st,"normal","مضافة",x.perf,[],"",x.by,x.dur,x.acc,x.fin,x.at!=null?x.at:x.id,"__me",x.s,x.e,x.grp?x.grp.id:null,x.grp?x.grp.label:null,null,x.dec,x.proof];return r.__x=x,r}'
      '\n_tkAct(d,i,a,x){const MT=' + _MT + ',r=(this._tkAll()[d]||[])[i];return MT&&r&&r.__x?MT.act(r.__x,a,x).then(res=>(this.setState({pfTick:(this.state.pfTick||0)+1,tkNow:Date.now()}),res)):Promise.resolve({ok:!1,msg:"تعذّر الحفظ — حدّث الصفحة وأعد المحاولة"})}'
      '\n_tkSave(t){try{return localStorage.setItem("bassam_tasks_v1"'),
     ("«مهامي» · _tkMine بلا مطابقةٍ بالاسم (D16) — والوضعُ المحليّ بلا خادم بمفتاحي حرفاً (SR-2.2 · F-1: لا تحويلَ رمزٍ قد يكون مكرَّراً)",
      'a=t.myRec&&t.myRec.name||"",r=[];return Object.keys(e).forEach(t=>{const i=t.split("-");3===i.length&&(e[t]||[]).forEach((e,o)=>{if(!Array.isArray(e))return;(e[14]?n(e[14])===s:!!a&&e[8]===a)&&r.push(',
      'mt=!!' + _MT + ',r=[];return Object.keys(e).forEach(t=>{const i=t.split("-");3===i.length&&(e[t]||[]).forEach((e,o)=>{if(!Array.isArray(e))return;(mt||!!e[14]&&e[14]===s)&&r.push('),
     ("«مهامي» · القبول من الخادم",
      'tkAccept(t,e){this._tkMut(t,e,t=>{',
      'tkAccept(t,e){if(' + _MT + ')return void this._tkAct(t,e,"accept").then(r=>r.ok?(this.setState({tkFocus:t+"#"+e}),this.bsAck("قُبلت المهمة وبدأ العدّ — وفّقك الله","ok")):this.bsToast(r.msg,"warn"));this._tkMut(t,e,t=>{'),
     ("«مهامي» · الاعتذار من الخادم",
      'if(!s)return void this.bsToast("اختر سبب الاعتذار أولاً","warn");this._tkMut(e.day,e.idx,t=>{',
      'if(!s)return void this.bsToast("اختر سبب الاعتذار أولاً","warn");if(' + _MT + ')return void this._tkAct(e.day,e.idx,"decline",{why:s.slice(0,200)}).then(r=>r.ok?(this.setState({pfPanel:"",tkRef:null,tkFocus:null}),this.bsAck("وصل اعتذارك للمدير — وستُعاد المهمة لغيرك","ok")):this.bsToast(r.msg,"warn"));this._tkMut(e.day,e.idx,t=>{'),
     ("«مهامي» · الإنهاء: رفعُ الإثبات ثم الإنهاء في الخادم",
      'if(t.tkBusy)return;this.setState({tkBusy:!0});const n=s.map(()=>"img_tsk"',
      'if(t.tkBusy)return;this.setState({tkBusy:!0});const MT=' + _MT + ';if(MT){const note=String(this.state.tkNote||"").trim();return void Promise.all(s.map(d=>MT.uploadProof(d))).then(ids=>this._tkAct(e.day,e.idx,"finish",{imgs:ids,note:note.slice(0,1e3)}).then(r=>{if(this.setState({tkBusy:!1}),!r.ok)return void this.bsToast(r.msg,"warn");this._tkImgCache=Object.assign(this._tkImgCache||{},Object.fromEntries(ids.map((x,i)=>[x,s[i]]))),this.setState({pfPanel:"",tkRef:null,tkImgs:[],tkNote:"",tkFocus:e.day+"#"+e.idx}),this.bsAck("أُنجزت المهمة ووصل توثيقك للمدير — شكراً لجهدك","ok")}),x=>{this.setState({tkBusy:!1}),this.bsToast("لم تُرفع الصورة — "+(x&&x.message||"تعذّر الرفع")+" · أعد المحاولة","warn")})}const n=s.map(()=>"img_tsk"'),
     ("«مهامي» · صورُ التوثيق من GET /api/me/tasks/img",
      'e[t]="";const s=window.BassamIDB;return s&&s.get&&s.get(t)',
      'e[t]="";const MT=' + _MT + ';if(MT)return MT.img(t).then(s=>{s&&(e[t]=s,this._pfAlive&&this.setState({tkImgTick:(this.state.tkImgTick||0)+1}))}),"";const s=window.BassamIDB;return s&&s.get&&s.get(t)'),
     ("«مهامي» · البوابة (موظفٌ أو حسابٌ مرتبطٌ بسجلّه — وSR-2.2 · F-7: لا بطاقةَ لصفحة المهام غيرِ المفعّلة me.off) والتحميل",
      '_tkVals(t,e,s){const n=e.isStaff;if(t.tkOn=!!n,!n)return t;',
      '_tkVals(t,e,s){const MT=' + _MT + ',MS=MT?MT.state():null,lk=!!(MS&&MS.me&&MS.me.linked),n=!(MS&&MS.me&&MS.me.off)&&(e.isStaff||lk);if(MT&&!this._tkSub){this._tkSub=1;const u=MT.subscribe(()=>{if(!this._pfAlive)return void u();this._tkObj0=null,this.setState({pfTick:(this.state.pfTick||0)+1})})}MT&&!MS.loading&&!this._tkLoadQ&&(null===MS.rows||!this._tkSeen||Date.now()-MS.at>6e4)&&(this._tkLoadQ=1,this._tkSeen=1,setTimeout(()=>MT.load().then(()=>{this._tkLoadQ=0,this._tkObj0=null,this._pfAlive&&this.setState({pfTick:(this.state.pfTick||0)+1})}),0));if(t.tkOn=!!n,!n)return t;'),
     ("«مهامي» · البطاقة: اليومُ وكلُّ ما ينتظر من أيامٍ أخرى (RC-2)",
      'l=o.filter(t=>t.day===i),f=this.MONTHS()',
      'l=o.filter(t=>t.day===i||"new"===t.st||"upcoming"===t.st||"running"===t.st),f=this.MONTHS()'),
     ("«مهامي» · انقضاءُ المهلة من الخادم",
      'setTimeout(()=>this._tkMut(t.day,t.i,t=>{t[20]=Object.assign({},t[20]||{},{exp:Date.now()})}),50)',
      'setTimeout(()=>MT?this._tkAct(t.day,t.i,"expire"):this._tkMut(t.day,t.i,t=>{t[20]=Object.assign({},t[20]||{},{exp:Date.now()})}),50)'),
     ("«مهامي» · SR-2.2 · F-3: الانقضاءُ التلقائيّ لما انتهت مهلتُه خلال 48 ساعة وحده (لا موجةَ للمتأخرات القديمة عند أوّل زيارة)",
      'o.filter(t=>"expired"===t.st&&!(t.r[20]&&t.r[20].exp)&&!this._tkExp[t.day+"#"+t.i])',
      'o.filter(t=>"expired"===t.st&&a-t.r[16]<1728e5&&!(t.r[20]&&t.r[20].exp)&&!this._tkExp[t.day+"#"+t.i])'),
     ("«مهامي» · حالاتٌ صريحة: غيرُ مرتبط ≠ تعذّر التحميل ≠ لا مهام",
      ',t.tkSub=w?',
      ',t.tkEmptyT=MS&&MS.me&&!lk?"حسابك غير مرتبط بسجل موظف بمعرّف ثابت":MS&&MS.err?"تعذّر تحميل مهامك":"لا مهام مسندة إليك الآن",t.tkEmptyS=MS&&MS.me&&!lk?"لا تظهر المهام إلا لحسابٍ مرتبطٍ بسجلّه الوظيفي — راجع مدير الإدارة":MS&&MS.err?"تحقّق من الاتصال — تُعاد المحاولة تلقائياً":"حين يُسند إليك شيء يظهر هنا فوراً ويصلك تنبيه في الجرس",t.tkSub=w?'),
     ("«مهامي» · نصُّ الحالة الفارغة من المنطق",
      '<b style="display:block;color:var(--fg-x141414);font-size:13px">لا مهام مسندة إليك الآن</b><div style="font-size:11px;margin-top:2px">حين يُسند إليك شيء يظهر هنا فوراً ويصلك تنبيه في الجرس</div>',
      '<b style="display:block;color:var(--fg-x141414);font-size:13px">{{tkEmptyT}}</b><div style="font-size:11px;margin-top:2px">{{tkEmptyS}}</div>'),
     ("«مهامي» · «قادمة» (لا «قادمة اليوم»)", '<div class="tk-m"><small>قادمة اليوم</small><b>{{tkUpN}}</b></div>', '<div class="tk-m"><small>قادمة</small><b>{{tkUpN}}</b></div>'),
     ("«مهامي» · «بقية مهامك»", '<div class="tk-rowh">بقية مهامك اليوم</div>', '<div class="tk-rowh">بقية مهامك</div>'),
    ]
    CLIENT_HUNKS['client/pages/Tasks.dc.html'] = [
     ("RC-12 · تعديلُ مهمةٍ فردية يحفظ الاعتذار (20) والتوثيق (21) — كان يُسقطهما فتُكنس صورةُ الإثبات",
      'null,null,D?null:String(e.pickWt||"")||null]',
      'null,null,D?null:String(e.pickWt||"")||null,i&&i[20]||null,i&&i[21]||null]'),
    ]
    CLIENT_HUNKS['shell/index.template.html'] = [
     ("تسجيلُ الكتلة 545 في الغلاف (بعد 530)", '@@KIVO_BLOCK:client/js/530-emp-day-facts.js@@\n',
      '@@KIVO_BLOCK:client/js/530-emp-day-facts.js@@\n@@KIVO_BLOCK:client/js/545-task-self.js@@\n'),
    ]
    CLIENT_NEW['client/js/545-task-self.js'] = 'src/services/545-task-self.js'          # الاسمُ المعلَن في HUNKS.json (مصدرُه في KIVO_264)
    CLIENT_PIN['src/services/545-task-self.js'] = 'tools/hotfix242_sr2/545-task-self.js.pin'  # …والبايتاتُ من النسخة المثبَّتة كما شُحنت
def apply_hunks(text, hunks, label):
    t = text
    for name, old, new in hunks:
        n = t.count(old)
        if n != 1: print('✘ %s · لُصقة «%s»: الموضعُ %d (يجب 1)' % (label, name, n)); sys.exit(2)
        t = t.replace(old, new)
    r = t
    for name, old, new in hunks:
        assert r.count(new) == 1, label + ' · ' + name
        r = r.replace(new, old)
    assert r == text, label + ': العكسُ لا يعيد الأصل'
    return t
def sr2_client(tmp, z):
    """الواجهة: k242/src + لُصَقُ الواجهة + الكتلةُ الجديدة ⇒ باني 242 (split · lazy · --retain حزمة 242 المسلَّمة) ⇒ {المسار: البايتات}
       ويُرفض أيُّ فرقٍ عن حزمة 242 غيرُ: الغلاف index.html · الصفحتان المعدَّلتان والكتلةُ الجديدة بأسماءٍ جديدة (والقديمةُ باقيةٌ بايتاً)"""
    import subprocess
    src = os.path.join(tmp, 'src'); shutil.copytree(os.path.join(H, 'k242/src'), src)
    for rel, hunks in sorted(CLIENT_HUNKS.items()):
        p = os.path.join(src, rel); t0 = open(p, encoding='utf-8', newline='').read()
        open(p, 'w', encoding='utf-8', newline='').write(apply_hunks(t0, hunks, rel))
    for rel, s_rel in sorted(CLIENT_NEW.items()): shutil.copyfile(os.path.join(H, CLIENT_PIN.get(s_rel, s_rel)), os.path.join(src, rel))
    bp = os.path.join(src, 'blocks.json'); braw = open(bp, encoding='utf-8').read(); B = json.loads(braw)
    ind = None
    for i0 in (1, 2, None):
        if json.dumps(B, ensure_ascii=False, indent=i0) + ('\n' if braw.endswith('\n') else '') == braw: ind = i0 or 0; break
    assert ind is not None, 'blocks.json: صيغةٌ غيرُ معروفة'
    ids = [b['id'] for b in B['blocks']]; at = ids.index('client/js/530-emp-day-facts.js')
    for rel in sorted(CLIENT_NEW):
        if not rel.endswith('.js'): continue
        B['blocks'].insert(at + 1, {'closeTag': '</script>', 'id': rel, 'kind': 'js', 'line': B['blocks'][at]['line'], 'openTag': '<script>', 'origBytes': None, 'origSha256': None, 'new': 'HOTFIX SR-2 · KIVO-Tasks P0'})
        B['counts']['js'] += 1
    open(bp, 'w', encoding='utf-8').write(json.dumps(B, ensure_ascii=False, indent=ind or None) + ('\n' if braw.endswith('\n') else ''))
    prev = os.path.join(tmp, 'prev')
    for n in z.namelist():
        if n.startswith('dist/') and not n.endswith('/'):
            p = os.path.join(prev, n[len('dist/'):]); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(z.read(n))
    out = os.path.join(tmp, 'dist')
    r = subprocess.run([sys.executable, os.path.join(H, 'k242/build/build.py'), '--src', src, '--mode', 'split', '--pages', 'lazy', '--out', out, '--retain', prev], capture_output=True, text=True)
    if r.returncode != 0: print('✘ باني 242: ' + (r.stderr or r.stdout)[-600:]); sys.exit(2)
    # --mono <ملف>: النصُّ الكامل المكافئ (build --mode monolith من المصدر نفسِه) لعُدّة المتصفح (cfbench/split242.mjs: <dist>.mono/index.html) — لا يدخل الحزمة
    if '--mono' in sys.argv:
        mp = os.path.abspath(sys.argv[sys.argv.index('--mono') + 1]); os.makedirs(os.path.dirname(mp), exist_ok=True)
        r2 = subprocess.run([sys.executable, os.path.join(H, 'k242/build/build.py'), '--src', src, '--mode', 'monolith', '--out', mp], capture_output=True, text=True)
        if r2.returncode != 0: print('✘ باني 242 (monolith): ' + (r2.stderr or r2.stdout)[-600:]); sys.exit(2)
    files = {}
    for root, ds, fs in os.walk(out):
        for f in fs: p = os.path.join(root, f); files[os.path.relpath(p, out).replace(os.sep, '/')] = open(p, 'rb').read()
    old = {}
    for root, ds, fs in os.walk(prev):
        for f in fs: p = os.path.join(root, f); old[os.path.relpath(p, prev).replace(os.sep, '/')] = open(p, 'rb').read()
    for rel, data in old.items():
        if rel in ('index.html',): continue
        assert rel in files and files[rel] == data, 'فرقٌ غيرُ معلن عن حزمة 242: ' + rel
    added = sorted(set(files) - set(old)); changed = sorted(r for r in old if files.get(r) != old[r])
    import re as _re
    # الصفحتان المعدَّلتان بأسماءٍ جديدة ⇒ بيانُ الصفحات في محمِّلها (030-pages-loader) يتغيّر فيُسمّى من جديد — والقديمُ باقٍ بايتاً
    want = [r'^assets/js/030-pages-loader\.[0-9a-f]{10}\.js$', r'^assets/js/545-task-self\.[0-9a-f]{10}\.js$', r'^assets/pages/Profile\.[0-9a-f]{10}\.dc\.txt$', r'^assets/pages/Tasks\.[0-9a-f]{10}\.dc\.txt$']
    assert len(added) == len(want) and all(any(_re.match(w, a) for a in added) for w in want), 'الأصولُ المضافة غيرُ المعلنة: ' + str(added)
    assert changed == ['index.html'], 'المتغيّرُ في الحزمة غيرُ الغلاف: ' + str(changed)
    return files, added, changed
def sr2_readme(nh, diff_bytes, man, added):
    """README_AR.txt لحزمة SR-2.2 — قائمةُ تحقّقٍ لمالكٍ غيرِ مبرمج (المراجعةُ المستقلة review_sr2.md §4 + F-2/F-4/F-5/F-6/F-8/F-9/F-10)"""
    nc = sum(len(v) for v in CLIENT_HUNKS.values())
    js545 = [a for a in added if a.startswith('assets/js/545-task-self.')][0]
    L = [
      "KIVO_242 — حزمةُ إصلاحٍ لـProduction · المراجعة SR-2.2 · 2026-10-14   (hf = " + HF + ")",
      "تحلّ محلّ SR-2 وSR-2.1 وSR-1 (وتتضمّن SR-1 حرفاً) — لا تُستعمل حزمةٌ قبلها. مرشَّحٌ غيرُ منشور: النشرُ بقرار المالك وحده.",
      "═══════════════════════════════════════════════════════════════════════════",
      "",
      "■ ماذا تُصلح",
      "  (أ) P0: المديرُ يُسند مهمةً لموظفٍ له حسابٌ نشط ⇒ يصله التنبيه ولا تظهر المهمة في «ملفي ← مهامي». الآن يرى الموظفُ مهامَه هو وحده من الخادم",
      "      (القديمةُ والجديدة) ويقبلها ويعتذر عنها ويُنهيها بصورةٍ أو ملاحظة — دون منحه «عرض المهام» ودون أن يرى مهامَ زملائه أو صورَهم.",
      "  (ب) RC-12: تعديلُ مهمةٍ فردية من صفحة «المهام» كان يُسقط الاعتذارَ والتوثيق ويكنس صورةَ الإثبات — الآن يُحفظان.",
      "  (ج) ما أضافته المراجعةُ المستقلة إلى SR-2.2:",
      "      · F-1 (أمني): حسابٌ مفتاحُه رقمُ هويةٍ مكرَّرٌ في سجلّ الإدارة (خطأُ إدخال) كان يُربط بأوّل سجلٍّ مطابِق فيرى مهامَ زميلٍ وصورَه —",
      "        الآن لا يُربط الحسابُ إلا بمعرّفٍ يحمله سجلٌّ واحدٌ وحده؛ وإلا ظهرت له رسالة «حسابك غير مرتبط» (يُصحَّح السجلّ ثم يعمل).",
      "      · F-3: أوّلُ فتحٍ لـ«ملفي» كان يُسجّل «انقضاءَ» كلِّ مهمةٍ قديمةٍ لم يُردّ عليها فتصل المديرين موجةُ تنبيهات — الآن لِما انقضى خلال 48 ساعة وحده.",
      "      · F-7: إذا كانت صفحةُ «المهام» غيرَ مفعّلةٍ لإدارة الموظف (أو مطفأةً للمنصة) فلا تظهر بطاقةُ «مهامك» ولا تُعطى بياناتُها.",
      "      · F-2: ملفُّ الرفع صار ملفاً مستقلاً جذرُه محتوياتُ dist/ وحدها (انظر «الملفات»).",
      "  تقنياً: dist/_worker.js = لُصَقُ SR-1 نفسُها + لُصقتان (%d لُصقة إجمالاً · +%d بايت عن 242) · الواجهة %d لُصقة معلنةٌ ومعكوسة + كتلةٌ جديدة." % (nh, diff_bytes, nc),
      "  لا تغييرَ في مخطط قاعدة البيانات ولا ترحيلَ ولا إعادةَ كتابةٍ للمهام القائمة. كلُّ ملفٍّ آخر في dist/ = حزمةُ 242 المنشورة بايتاً (MANIFEST.sha256).",
      "",
      "■ الملفات — اقرأ هذا قبل أيّ شيء",
      "  ✔ للرفع:  KIVO_242_HOTFIX_SR2_2_Production_upload.zip   (جذرُه _worker.js وindex.html وassets/ — محتوياتُ dist/ وحدها)",
      "           أو مجلدُ dist نفسُه بعد فكّ ضغط الأرشيف.",
      "  ✘ ليس للرفع أبداً: KIVO_242_HOTFIX_SR2_2_ARCHIVE_not_for_upload.zip — أرشيفٌ للحفظ والتدقيق (فيه dist/ داخل مجلد + هذا الملفّ + HUNKS.json",
      "           + MANIFEST.sha256 + legacy_rows_count.sql). رفعُه يُعطّل المنصة (العاملُ لا يكون في الجذر) أو يكشف ملفاتٍ داخلية للعموم.",
      "  ✘ ولا تُرفع: README_AR.txt · HUNKS.json · MANIFEST.sha256 · SHA256SUMS.txt · legacy_rows_count.sql.",
      "  البصمات في SHA256SUMS.txt (الملفّان والعاملُ والغلاف). للتحقق من ملفّ الرفع قبل رفعه:",
      "     ويندوز (موجّه الأوامر):  certutil -hashfile KIVO_242_HOTFIX_SR2_2_Production_upload.zip SHA256",
      "     ماك (Terminal):          shasum -a 256 KIVO_242_HOTFIX_SR2_2_Production_upload.zip",
      "  يجب أن يطابق الناتجُ سطرَه في SHA256SUMS.txt حرفاً؛ وإلا فلا ترفع.",
      "",
      "■ قبل النشر (يومَ النشر)",
      "  1) الاستعلاماتُ الثلاثة (قراءةٌ وحدها — لا تكتب شيئاً): Cloudflare ← Storage & Databases ← D1 ← قاعدة bassam-db ← Console.",
      "     افتح legacy_rows_count.sql وانسخ كلَّ استعلامٍ وحده (الفاصلُ بينها سطرُ ─────)، شغّله، واحفظ صورةَ نتيجته.",
      "     · الاستعلام 1: صفوفُ eid_shared_hidden وnid_shared_hidden وname_only_r8_hidden وr14_name_or_unknown لن يراها أصحابُها في «ملفي»",
      "       (مسندةٌ بالاسم أو بمعرّفٍ لا يدلّ على شخصٍ واحد) — يعيد المديرُ إسنادَ المفتوح منها (rows_still_open) من صفحة «المهام».",
      "     · الاستعلام 2: الحساباتُ NOT_LINKED سترى «حسابك غير مرتبط بسجل موظف بمعرّف ثابت». منها ما مفتاحُه معرّفٌ يحمله سجلّان (shared by 2+ records):",
      "       كانت SR-2.1 تربطه بأوّل سجلٍّ مطابِق (F-1)، وSR-2.2 ترفض ربطَه — تُصحَّح سجلاتُ الموظفين (رقمُ هويةٍ صحيحٌ لكلٍّ) فيُربط تلقائياً.",
      "     · الاستعلام 3: marked_on_first_visit = عددُ تنبيهات «لم تُقبل … أعِد إسنادها» المتوقَّع وصولُها للمديرين عند أوّل فتحٍ لـ«ملفي»",
      "       (ما انقضى خلال 48 ساعة). left_as_is_older_than_48h = متأخراتٌ قديمة لا تُسجَّل ولا تُرسل شيئاً (تبقى ظاهرةً للموظف «منقضية»).",
      "  2) أبلغ مديري الإدارات كتابةً: «لا تعدّلوا أيَّ مهمةٍ منجزة أو معتذَرٍ عنها حتى نطلب منكم تحديثَ الصفحة بعد النشر» (عيبُ RC-12 قائمٌ اليوم).",
      "  3) النسخةُ الاحتياطية:",
      "     (أ) من المنصة بحساب مدير النظام: «النسخة الاحتياطية» ← تنزيلُ نسخةٍ شاملة، واحفظ الملفّ خارج الجهاز.",
      "     (ب) سجّل الوقتَ الدقيق الآن بتوقيت UTC. استرجاعُ قاعدة D1 إلى ما قبل النشر يكون بخاصية Time Travel بأوامر Wrangler ممّن يملكه:",
      "         npx wrangler d1 time-travel info bassam-db      ⇐ يعطي «bookmark» — احفظه",
      "         npx wrangler d1 time-travel restore bassam-db --bookmark=<القيمة>",
      "         لا يُستعمل إلا إذا ثبت تلفُ بيانات (يمحو كلَّ ما كُتب بعده). توفّرُه من لوحة التحكم ومدةُ الاحتفاظ لم يُتحقَّق منهما هنا.",
      "  4) Cloudflare ← Workers & Pages ← المشروع «0» (عنوانه kivo-d81.pages.dev) ← Deployments: دوّن رقمَ النشر الحاليّ على Production",
      "     (آخرُ قراءة: 152c5dfb = KIVO_242 — تحقّق أنه هو اليوم قبل النشر). هذا هدفُ الرجوع.",
      "",
      "■ النشر",
      "  5) في المشروع «0» نفسِه: Create deployment. تحقّق قبل الرفع أن البيئة المختارة Production (الفرع main) — النموذجُ يختارها افتراضاً، لكن",
      "     تأكّد أنها ليست Preview وأن اسمَ المشروع «0».",
      "  6) ارفع KIVO_242_HOTFIX_SR2_2_Production_upload.zip (أو اسحب مجلدَ dist نفسَه) ثم Deploy. لا ترفع الأرشيفَ ولا أيَّ ملفٍّ آخر.",
      "",
      "■ التحقق (خلال 10 دقائق)",
      "  7)  https://kivo-d81.pages.dev/api/brand  ⇐ يظهر \"ver\":\"2026.10.06-140\" و\"hf\":\"" + HF + "\"",
      "  8)  https://kivo-d81.pages.dev/HUNKS.json  ⇐ «غير موجود» (404). وكذلك /README_AR.txt (تأكيدُ أنك لم ترفع الملفاتِ الداخلية).",
      "  9)  https://kivo-d81.pages.dev/" + js545 + "  ⇐ يظهر نصٌّ برمجيّ لا «غير موجود».",
      "  10) أغلق تبويبَ المنصة وافتحه من جديد. ادخل بحساب مدير ⇐ صفحةُ «المهام» تعمل كما كانت.",
      "  11) ادخل بحساب موظفٍ ليس له «المهام: عرض» وله مهمةٌ مسندة: «ملفي ← مهامك» تعرض مهامَه · العدّادُ مكتوبٌ «قادمة» لا «قادمة اليوم»",
      "      (دليلُ أن الواجهة الجديدة هي المحمَّلة) · وفي تبويبٍ جديد https://kivo-d81.pages.dev/api/me/tasks ⇐ \"linked\":true ومهامُه وحده.",
      "  12) (اختياري وبحذر) مهمةُ اختبارٍ لموظف اختبار أُنجزت بصورة: يعدّل المديرُ عنوانَها فقط ويحفظ ⇐ الصورةُ والملاحظة باقيتان.",
      "  13) اطلب من الجميع — المديرين أولاً — إغلاقَ المنصة وفتحَها من جديد (التبويبُ المفتوح قبل النشر يبقى على الصفحات القديمة حتى يُحدَّث).",
      "      رقمُ «الإصدار» الظاهر في المنصة لا يتغيّر (2026.10.07-241) فلا تعتمد عليه؛ اعتمد على الخطوات 7–11.",
      "  14) في الساعة الأولى: تنبيهاتُ «لم تُقبل … أعِد إسنادها» في جرس المديرين متوقَّعةٌ بقدر الاستعلام 3 (marked_on_first_visit) وحده.",
      "",
      "■ الرجوع (Rollback) — عند خللٍ ظاهر",
      "  15) Deployments ← النشرُ المدوَّن في الخطوة 4 (152c5dfb · KIVO_242) ← Rollback. يعود العاملُ والواجهةُ معاً خلال ثوانٍ.",
      "  16) الرجوعُ في Pages لا يمسّ قاعدة D1: لا تسترجع القاعدةَ لمجرد الرجوع — لا تغييرَ في المخطط، وما كتبه الموظفون عبر المسار الجديد يقرؤه 242",
      "      ويحفظ فوقه بلا رفض (مُثبَتٌ في المراجعة المستقلة).",
      "  17) تحقّق: /api/brand بلا hf. اطلب من الجميع تحديثَ الصفحة (تبويباتُ SR-2.2 المفتوحة تطلب ملفاتٍ غيرَ موجودةٍ في نشر 242 فتتعطّل حتى التحديث)،",
      "      وأعِد تنبيهَ المديرين: لا تعديلَ للمهام المنجزة (RC-12 عاد).",
      "  18) استرجاعُ D1 بالـTime Travel فقط إذا ثبت تلفُ بيانات — وبعد تنزيل نسخةٍ شاملةٍ جديدة أولاً.",
      "",
      "■ بعد النشر",
      "  19) تبقى توصيةُ SR-1: تدويرُ كلمات المرور لحسابات مديري الإدارات ومديري العموم إن لم يُنفَّذ.",
      "",
      "■ حدودٌ معلنة (ليست عيوباً جديدة — للعلم والقرار)",
      "  · F-4 التبويباتُ المفتوحة قبل النشر تبقى على «المهام» و«ملفي» القديمتين حتى التحديث (يبقى فيها RC-12 والعطلُ القديم)، ورقمُ الإصدار الظاهر لا يتغيّر.",
      "  · F-5 المهامُ القديمة المسندة بالاسم وحده (أو بمعرّفٍ لا يدلّ على شخصٍ واحد) لا تظهر للموظفين بعد النشر — عددُها في الاستعلام 1؛ يعيد المديرُ إسنادَها.",
      "  · F-8 تعديلُ مهمةٍ من صفحة «المهام» يُعيد ختمَ هويتها في سجلّ النشاط فتظهر كيانًا جديداً (سلوكُ 242 نفسُه — لا فقدَ بيانات).",
      "  · F-9 قفلُ الأشهر: الموظفُ يُمنع من الفعل على مهام شهرٍ «معتمدٍ» صراحةً وحده؛ الأشهرُ الماضية غيرُ المعتمدة تظهر للمدير مقفلةً لكن الموظفَ",
      "        يستطيع الردَّ عليها (أشدُّ مما كان: «ملفي» في 242 لم تفحص القفلَ أصلاً).",
      "  · F-10 حفظان متزامنان في اللحظة نفسِها قد يمرّان معاً (حارسُ النسخة في التطبيق لا في القاعدة — سلوكُ 242)، ومساراتُ القراءة الذاتية بلا حدٍّ لمعدّل الطلبات.",
      "  · «ملفي» ما زالت تشترط صورةً للإنهاء (الخادمُ يقبل صورةً أو ملاحظة) · لا حالةَ مراجعةٍ أو استلامٍ منفصلة · لا تكرار — كلُّها في KIVO_264.",
      "",
      "■ لم يُتحقَّق منه هنا (بيئةُ المختبر لا تصل إليه)",
      "  سلوكُ لوحة Cloudflare نفسِها (أسماءُ الأزرار · Time Travel من اللوحة) · نسخةُ SQLite في D1 · أحجامُ بيانات Production · تشغيلُ Cloudflare الحقيقي.",
      "  كلُّ الاختبارات على بياناتٍ اصطناعية (Node/Miniflare + Chromium) — أدلّتُها في المستودع reports/k264/tasks/hotfix_sr2/.",
    ]
    return '\n'.join(L) + '\n'
def main():
    base = open(BASE_WORKER, encoding='utf-8').read()
    patched = base
    for name, old, new in HUNKS:
        n = patched.count(old)
        if n != 1: print('✘ لُصقة «%s»: الموضعُ %d (يجب 1)' % (name, n)); sys.exit(2)
        patched = patched.replace(old, new)
    # قابليةُ العكس: إعادةُ اللُّصَق تعيد الأصلَ حرفاً
    rev = patched
    for name, old, new in HUNKS:
        assert rev.count(new) == 1, name
        rev = rev.replace(new, old)
    assert rev == base, 'العكسُ لا يعيد الأصل'
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    z = zipfile.ZipFile(BASE_ZIP)
    names = [n for n in z.namelist() if n.startswith('dist/') and not n.endswith('/')]
    man = []
    if SR2:
        import tempfile
        tmp = tempfile.mkdtemp(prefix='hf242sr2_')
        try: files, added, changed = sr2_client(tmp, z)
        finally: shutil.rmtree(tmp, ignore_errors=True)
        assert sha(files['_worker.js']) == sha(base.encode('utf-8')), 'عاملُ البناء ≠ k242/src/root/_worker.js'
        files['_worker.js'] = patched.encode('utf-8')
        for rel in sorted(files):
            p = os.path.join(OUT, 'dist', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(files[rel]); man.append((sha(files[rel]), 'dist/' + rel))
        names = []
    for n in sorted(names):
        rel = n[len('dist/'):]
        data = z.read(n)
        if rel == '_worker.js':
            assert sha(data) == sha(base.encode('utf-8')), 'عاملُ الحزمة المسلَّمة ≠ k242/src/root/_worker.js'
            data = patched.encode('utf-8')
        p = os.path.join(OUT, 'dist', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(data); man.append((sha(data), 'dist/' + rel))
    open(os.path.join(OUT, 'MANIFEST.sha256'), 'w', encoding='utf-8').write(''.join('%s  %s\n' % m for m in man))
    diff_bytes = len(patched.encode('utf-8')) - len(base.encode('utf-8'))
    readme = ("KIVO_242 — حزمةُ إصلاحٍ إنتاجيّ مستقلة · AUD-033 (ج) · " + datetime.date.today().isoformat() + "\n"
      "═══════════════════════════════════════════════════════════════\n"
      "ما المشكلة: في KIVO_242 (المنشورة على kivo-d81.pages.dev) تُعاد قائمةُ الحسابات كاملةً — ببصمات كلمات المرور (ph) — داخل\n"
      "denied/conflicts.cur في /api/save لكل مستخدمٍ مسجَّل يقرأ المفتاح (أي موظف)؛ وإن تعذّر تحليلُ القائمة أعادتها stripPh خاماً.\n"
      "ما الإصلاح (ملفٌ واحد: dist/_worker.js · %d لُصَقٍ نصّية · +%d بايت · لا تغييرَ في الواجهة ولا في المخطط ولا في البيانات):\n"
      "  ① curSafe تنزع ph من denied/conflicts.cur لكل الأدوار  ② stripPh لا تعيد الخامَ عند الفشل ('[]' + تحذير)\n"
      "  ③ redactPh حارسٌ أخير في json() والإقلاع: يحجب أيَّ بصمةٍ ويسجّل ph-redacted بلا محتوى  ④ /api/brand يحمل hf = '%s'\n"
      "كلُّ ملفٍ آخر في dist/ = KIVO_242 بايتاً بايتاً (MANIFEST.sha256). عكسُ اللُّصَق يعيد عاملَ 242 حرفاً (مثبتٌ في tools/hotfix242.py).\n\n"
      "الاختبارات (في المستودع): tests/unit/ph_exfil.test.mjs على هذا العامل 7/7 (كلُّ مسار × كلُّ دور × legacy/enforce × أجسامٌ عدائية × بياناتٌ تالفة ×\n"
      "سجلُّ التدقيق) · بقيةُ اختبارات الوحدة المنطبقة على 140 · مصفوفةُ k243all (242 ↔ الإصلاح حالةً بحالة) · الأدلةُ في reports/hotfix242/.\n\n"
      "النشر (بقرار المالك وحده · لا يُنفَّذ من المختبر):\n"
      "  1) نسخةٌ احتياطية: Time Travel bookmark لـbassam-db (لا ترحيلَ في هذه الحزمة — احتياطٌ فقط).\n"
      "  2) Cloudflare → Workers & Pages → المشروع 0 → Deployments → Create deployment → Production (main) → إسقاطُ محتويات dist/ (أو zip محتواه في الجذر).\n"
      "  3) التحقق: GET /api/brand → hf = '%s' و ver = 2026.10.06-140 · الدخولُ بحسابٍ حقيقي · الشاشات · لا سطرَ ph-redacted في السجل في الاستعمال الطبيعي.\n"
      "  4) الرجوع: Deployments → النشرُ السابق (KIVO_242) → Rollback (ثوانٍ؛ لا بيانات تتأثر).\n"
      "  5) بعد النشر: تدويرُ كلمات المرور لكل الحسابات غير super (AUD-033: البصماتُ كانت قابلةً للوصول لكل مستخدمٍ مسجَّل منذ نشر 242).\n") % (len(HUNKS), diff_bytes, HF, HF)
    if SR1:
        readme = ("KIVO_242 — حزمةُ إصلاحٍ إنتاجيّ مستقلة · AUD-033 (ج) + SR-1 · 2026-10-11 (تحلّ محلَّ KIVO_242_HOTFIX_AUD033 — لا تُنشر تلك)\n"
          "═══════════════════════════════════════════════════════════════\n"
          "ما المشكلتان (كلتاهما قائمةٌ في KIVO_242 المنشورة على kivo-d81.pages.dev):\n"
          "  (أ) AUD-033: قائمةُ الحسابات تُعاد ببصمات كلمات المرور (ph) داخل denied/conflicts.cur في /api/save لكل مستخدمٍ مسجَّل يقرأ المفتاح،\n"
          "      وإن تعذّر تحليلُ القائمة أعادتها stripPh خاماً.\n"
          "  (ب) SR-1 (عالية — المراجعةُ الأمنية المستقلة reports/k259/secreview_259.md): الرقمُ الوظيفي «no» في حسابات مديري الإدارات ومديري العموم\n"
          "      هو كلمةُ مرورهم الأولى (ph = hash(no) بلا إلزامٍ بالتغيير) ويُرسل نصّاً لكل جلسة (الإقلاع · /api/get · denied/conflicts) ⇒ يدخل أيُّ موظفٍ\n"
          "      بحساب أيِّ مدير عبر الإدارات.\n"
          "ما الإصلاح (ملفٌ واحد: dist/_worker.js · %d لُصَقٍ نصّية · +%d بايت · لا تغييرَ في الواجهة ولا في المخطط ولا في البيانات):\n"
          "  ① curSafe تنزع ph — و«no» لغير صاحبه — من denied/conflicts.cur لكل الأدوار  ② stripPh لا تعيد الخامَ عند الفشل ('[]' + تحذير)\n"
          "  ③ redactPh حارسٌ أخير في json() والإقلاع  ④ /api/brand يحمل hf = '%s'\n"
          "  ⑤ usersNoOut/usersNoIn (نصُّ KIVO_259 نفسُه): «no» لا يغادر الخادمَ إلا لمدير النظام ولصاحب الحساب — في /api/get والإقلاع والرفض/التعارض —\n"
          "     وكتابةُ غيرِ مدير النظام لقائمةٍ بلا «no» ترثه من القيمة الحالية قبل الحكم (فلا يُمحى ولا يُرفض حفظُ مديرٍ لحسابات إدارته).\n"
          "  أثرٌ في الواجهة (كما في 259): مديرُ الإدارة لا يرى الرقمَ الوظيفي لزميله المدير في «حسابات الإدارة»؛ صاحبُ الحساب ومديرُ النظام يريانه.\n"
          "كلُّ ملفٍ آخر في dist/ = KIVO_242 بايتاً بايتاً (MANIFEST.sha256). عكسُ اللُّصَق يعيد عاملَ 242 حرفاً (مثبتٌ في tools/hotfix242.py --sr1).\n\n"
          "الاختبارات (أدلّتُها في reports/hotfix242/ بتاريخ 2026-10-11): tests/unit/ph_exfil.test.mjs · tests/unit/users_no.test.mjs (أ)(ب) — SR-1 —\n"
          "على هذا العامل · بقيةُ اختبارات الوحدة (لا إخفاقَ جديداً عن عامل 242) · مصفوفةُ k243all (242 ↔ الإصلاح) · دخانُ المتصفح.\n"
          "خارجَ هذه الحزمة (في KIVO_259 وحدها): SR-8 تفرّدُ اسم الدخول · SR-2 · SR-6 · قفلُ الدخول المتزامن · التحديثُ الضائع.\n\n"
          "النشر (بقرار المالك وحده · لا يُنفَّذ من المختبر):\n"
          "  1) نسخةٌ احتياطية: Time Travel bookmark لـbassam-db (لا ترحيلَ في هذه الحزمة — احتياطٌ فقط).\n"
          "  2) Cloudflare → Workers & Pages → المشروع 0 → Deployments → Create deployment → Production (main) → إسقاطُ محتويات dist/ (أو zip محتواه في الجذر).\n"
          "  3) التحقق: GET /api/brand → hf = '%s' و ver = 2026.10.06-140 · الدخولُ بحسابٍ حقيقي · الشاشات · لا سطرَ ph-redacted في السجل في الاستعمال الطبيعي.\n"
          "  4) الرجوع: Deployments → النشرُ السابق (KIVO_242) → Rollback (ثوانٍ؛ لا بيانات تتأثر).\n"
          "  5) بعد النشر فوراً: تدويرُ كلمات المرور لكل الحسابات غير super — وأوّلُها حساباتُ مديري الإدارات ومديري العموم (كلمتُهم الأولى = الرقمُ\n"
          "     الوظيفي الذي كان مكشوفاً) — بإعادة التعيين من مدير النظام مع «كلمة مؤقتة» (mc) تُلزم بالتغيير عند الدخول.\n") % (len(HUNKS), diff_bytes, HF, HF)
    if SR2: readme = sr2_readme(len(HUNKS), diff_bytes, man, added)
    open(os.path.join(OUT, 'README_AR.txt'), 'w', encoding='utf-8').write(readme)
    if SR2: shutil.copyfile(os.path.join(H, 'tools/hotfix242_sr2/legacy_rows_count.sql'), os.path.join(OUT, 'legacy_rows_count.sql'))   # SR-2.2 · F-5: الاستعلاماتُ الثلاثة للقراءة وحدها (خارج dist — لا تُرفع)
    hj = [{'name': n, 'old': o, 'new': w} for n, o, w in HUNKS]
    if SR2: hj = {'worker': hj, 'client': {rel: [{'name': n, 'old': o, 'new': w} for n, o, w in hs] for rel, hs in sorted(CLIENT_HUNKS.items())}, 'clientNew': CLIENT_NEW}
    open(os.path.join(OUT, 'HUNKS.json'), 'w', encoding='utf-8').write(json.dumps(hj, ensure_ascii=False, indent=1))
    # zip (حتمي: ترتيبٌ ثابت · تاريخٌ ثابت)
    # SR-2.2 · F-2 (المراجعةُ المستقلة — عالٍ): أرشيفُ الحزمة (dist/ + README_AR + HUNKS + MANIFEST) ليس جذراً للنشر — رفعُه في «Create deployment» يضع العاملَ
    # في dist/_worker.js (فيتعطّل كلُّ /api) أو يكشف الملفاتِ الداخلية (/HUNKS.json). فيُسمّى الأرشيفُ «ليس للرفع» صراحةً، ويُشحن بجانبه ملفُّ رفعٍ جذرُه
    # محتوياتُ dist/ وحدها (لا README ولا HUNKS ولا MANIFEST ولا مجلدٌ متداخل). --sr1 وما قبله كما كانا حرفاً.
    FIXED = (1980, 1, 1, 0, 0, 0)
    ARCH = (NAME + '_2_ARCHIVE_not_for_upload.zip') if SR2 else (NAME + '.zip')
    UPZ = (NAME + '_2_Production_upload.zip') if SR2 else None
    def zput(zo, rel, data):
        zi = zipfile.ZipInfo(rel, FIXED); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
        zo.writestr(zi, data)
    # الأرشيفُ بقائمةٍ صريحة: ملفاتُ الجذر المعلنة + dist/ وحده — فلا يدخله ما يُوضع بجانبه في OUT (مثل <OUT>/dist.mono من --mono لعُدّة المتصفح)
    # (الملفاتُ نفسُها وبالترتيب نفسِه كما كان ⇒ أرشيفُ --sr1 وما قبله بايتاتٌ واحدة)
    KEEP = ('HUNKS.json', 'MANIFEST.sha256', 'README_AR.txt', 'legacy_rows_count.sql')
    zp = os.path.join(OUT, ARCH)
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as zo:
        for root, ds, fs in os.walk(OUT):
            if root == OUT: ds[:] = [d for d in ds if d == 'dist']
            ds.sort()
            for f in sorted(fs):
                if root == OUT and f not in KEEP: continue
                p = os.path.join(root, f); rel = os.path.relpath(p, OUT)
                zput(zo, rel.replace(os.sep, '/'), open(p, 'rb').read())
    with zipfile.ZipFile(zp) as zc:
        nm = zc.namelist()
        assert len(nm) == len(set(nm)) and set(nm) == set(f for f in KEEP if os.path.isfile(os.path.join(OUT, f))) | set(m[1] for m in man), 'الأرشيف = ملفاتُ الجذر المعلنة + dist/ ملفاً بملف'
    zb = open(zp, 'rb').read()
    sums = '%s  %s\n' % (sha(zb), ARCH)
    if UPZ:
        up, DD = os.path.join(OUT, UPZ), os.path.join(OUT, 'dist')
        with zipfile.ZipFile(up, 'w', zipfile.ZIP_DEFLATED) as zo:
            for root, ds, fs in os.walk(DD):
                ds.sort()
                for f in sorted(fs):
                    p = os.path.join(root, f); zput(zo, os.path.relpath(p, DD).replace(os.sep, '/'), open(p, 'rb').read())
        ub = open(up, 'rb').read()
        with zipfile.ZipFile(up) as zc:
            nm = zc.namelist()
            assert '_worker.js' in nm and 'index.html' in nm and not any(n.startswith('dist/') or n in ('README_AR.txt', 'HUNKS.json', 'MANIFEST.sha256') or n.endswith('.zip') for n in nm), 'ملفُّ الرفع: الجذرُ = محتوياتُ dist/ وحدها'
            assert sorted(nm) == sorted(m[1][len('dist/'):] for m in man), 'ملفُّ الرفع = dist/ ملفاً بملف'
        sums += '%s  %s\n' % (sha(ub), UPZ)
    sums += '%s  %s\n' % (sha(open(os.path.join(OUT, 'dist/_worker.js'), 'rb').read()), 'dist/_worker.js')
    if SR2: sums += '%s  %s\n' % (sha(open(os.path.join(OUT, 'dist/index.html'), 'rb').read()), 'dist/index.html')
    open(os.path.join(OUT, 'SHA256SUMS.txt'), 'w').write(sums)
    print('✔ %s: %d ملفاً في dist/ · العاملُ المعدَّل %s (+%d بايت) · %s %d بايت sha256 %s' % (NAME, len(man), sha(patched.encode('utf-8'))[:16], diff_bytes, ARCH, len(zb), sha(zb)))
    if UPZ: print('✔ ملفُّ الرفع (الجذرُ = dist/): %s %d بايت sha256 %s' % (UPZ, len(ub), sha(ub)))
if __name__ == '__main__': main()
