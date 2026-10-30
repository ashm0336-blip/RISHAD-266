
class Component extends KIVO.BassamPageKit.base(DCLogic, ["daily+dreport+dstats+irshad+plan+seized+staff+tasks","dstats+irshad"]) {
  KEY = "bassam_dstats_v1";
  SN = { haram:"المسجد الحرام", nabawi:"المسجد النبوي" };
  SC = { haram:"var(--bg-xb99751)", nabawi:"var(--bg-x0e7490)" };
  CC = ["var(--bg-xb99751)","var(--bg-x0e7490)","var(--bg-x008450)","var(--bg-x7c3aed)","var(--bg-xb45309)","var(--bg-x6366f1)"];
  DOT = ["#b99751","#0e7490","#047857","#7c3aed","#b45309","#4a97cf"];
  IC = {
    date:  ["M8 2v4M16 2v4M3 10h18","M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
    people:["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8"],
    kaaba: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",""],
    hijr:  ["M12 3a9 9 0 0 1 0 18","M3 12h6"],
    cart:  ["M11 4.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2","M11 6v6h5l3 6M9 12a5 5 0 1 0 5 5"],
    door:  ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","m16 17 5-5-5-5M21 12H9"],
    rawdah:["m12 3 2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 13.8l-4.2 2.2.8-4.7L5.2 8.3l4.7-.7z",""],
    sum:   ["M18 7V4H6l6 8-6 8h12v-3",""],
    pie:   ["M12 2a10 10 0 1 0 10 10H12z","M21.2 8A10 10 0 0 0 16 2.8"],
    mosque:["M3 21h18","M6 21V9l6-5 6 5v12"],
    diff:  ["m16 3 4 4-4 4M20 7H4","m8 21-4-4 4-4M4 17h16"],
    trend: ["m22 7-8.5 8.5-5-5L2 17","M16 7h6v6"],
    layer: ["m12 2 9 5-9 5-9-5z","m3 12 9 5 9-5"],
    clock: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20","M12 6v6l4 2"]
  };
  F = {
    haram: [{k:"worshippers",l:"المصلين",i:"people",d:"إجمالي المصلين داخل المسجد الحرام"},{k:"umrah",l:"المعتمرين",i:"kaaba",d:"من أدّى العمرة في اليوم"},
            {k:"hijr_ismail",l:"حجر إسماعيل",i:"hijr",d:"الداخلون إلى حجر إسماعيل"},{k:"carts",l:"عربات المعاقين",i:"cart",d:"العربات المستخدمة في اليوم"}],
    nabawi:[{k:"worshippers",l:"المصلين",i:"people",d:"إجمالي المصلين داخل المسجد النبوي"},{k:"salam_corridor",l:"ممر السلام",i:"door",d:"العابرون لممر السلام"},
            {k:"rawdah_men_published",l:"منشور",g:"men",i:"rawdah",d:"السعة اليومية المعلنة — رجال"},{k:"rawdah_men_reserved",l:"محجوز",g:"men",i:"rawdah",d:"التصاريح المحجوزة — رجال"},{k:"rawdah_men_actual",l:"فعلي",g:"men",i:"rawdah",d:"من دخل الروضة فعلاً — رجال"},
            {k:"rawdah_women_published",l:"منشور",g:"women",i:"rawdah",d:"السعة اليومية المعلنة — نساء"},{k:"rawdah_women_reserved",l:"محجوز",g:"women",i:"rawdah",d:"التصاريح المحجوزة — نساء"},{k:"rawdah_women_actual",l:"فعلي",g:"women",i:"rawdah",d:"من دخلت الروضة فعلاً — نساء"}]
  };
  /* مؤشّراتُ المقارنة الزمنية ونطاقاتُها — كما في موقع الإحصائيات حرفاً بحرف */
  TCM = [
    {id:"worshippers",        l:"المصلين",              sc:["haram","nabawi","both"]},
    {id:"umrah",              l:"المعتمرين",            sc:["haram","both"]},
    {id:"hijr_ismail",        l:"حجر إسماعيل",          sc:["haram","both"]},
    {id:"carts",              l:"العربات",               sc:["haram","both"]},
    {id:"salam_corridor",     l:"ممر السلام",           sc:["nabawi","both"]},
    {id:"rawdah_men_actual",  l:"الروضة رجال فعلي",     sc:["nabawi","both"]},
    {id:"rawdah_women_actual",l:"الروضة نساء فعلي",     sc:["nabawi","both"]},
    {id:"haram_total",        l:"إجمالي الحرم",          sc:["haram","both"]},
    {id:"nabawi_op_total",    l:"إجمالي النبوي الفعلي",  sc:["nabawi","both"]},
    {id:"grand_total",        l:"الإجمالي العام",         sc:["both"]}
  ];
  TCS = [{v:"both",l:"الحرمان معًا"},{v:"haram",l:"المسجد الحرام"},{v:"nabawi",l:"المسجد النبوي"}];
  TCT = [{v:"day",l:"يوم مقابل يوم"},{v:"month",l:"شهر مقابل شهر"},{v:"year",l:"سنة مقابل سنة"}];

  state = { site:"haram", year:0, month:0, day:0, draft:null, tick:0,
            /* R191: القائمةُ المنسدلة مغلقةٌ افتراضاً ولا تُفتح إلا بيد المستخدم */
            lgOpen:false, lgSearch:"", lgFilesOpen:false, lgFs:"all", lgFsOpen:false, lgPage:1, lgPer:50,
            rowMenu:null,
            retroAsk:null, lockAsk:null,
            anY:0, anM:"", anMode:null, anFrom:"", anTo:"",
            tcType:"month", tcScope:"both", tcMetric:"grand_total", tcA:null, tcB:null,
            anMetH:"qaasideen", anMetN:"total", dzW:0, anTblOpen:false };

  /* ══ التقويم ══ */
  _hf(){ try { return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn",{year:"numeric",month:"numeric",day:"numeric"}); } catch(e){ return null; } }
  hToday(){ const f=this._hf(); if(!f) return {y:1448,m:1,d:1}; const o={}; f.formatToParts(new Date()).forEach(p=>o[p.type]=+p.value); return {y:o.year,m:o.month,d:o.day}; }
  hOfDate(dt){ const f=this._hf(); const o={}; f.formatToParts(dt).forEach(p=>o[p.type]=+p.value); return o; }
  gOf(y,m,d){ const ck=this.__g||(this.__g={}), key=y+"|"+m+"|"+d; if(key in ck) return ck[key];
    const f=this._hf(); if(!f) return (ck[key]=null); let lo=-40000,hi=40000,k=y*10000+m*100+d;
    while(lo<=hi){ const mid=(lo+hi)>>1, dt=new Date(Date.UTC(1970,0,1+mid)), o=this.hOfDate(dt), kk=o.year*10000+o.month*100+o.day;
      if(kk===k) return (ck[key]=dt); kk<k ? lo=mid+1 : hi=mid-1; } return (ck[key]=null); }
  dim(y,m){ const ck=this.__dim||(this.__dim={}), key=y+"|"+m; if(ck[key]) return ck[key];
    for(let d=31;d>=28;d--){ const g=this.gOf(y,m,d); if(g){ const o=this.hOfDate(g); if(o.year===y&&o.month===m&&o.day===d) return (ck[key]=d); } } return (ck[key]=29); }
  mStart(y,i){ return this.gOf(y,i+1,1) || new Date(); }
  gTxt(y,m,d){ const g=this.gOf(y,m,d); return g ? g.getUTCDate()+"/"+(g.getUTCMonth()+1)+"/"+g.getUTCFullYear() : "—"; }
  gLong(y,m,d){ const g=this.gOf(y,m,d); if(!g) return "—";
    try { return g.toLocaleDateString("ar-u-ca-gregory-nu-latn",{day:"numeric",month:"long",year:"numeric"}); } catch(e){ return this.gTxt(y,m,d); } }
  iso(dt){ return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"); }

  /* ══ المخزن ══ */
  load(){ return KIVO.DailyStats ? KIVO.DailyStats.read() : {}; }
  async save(o,opts){ const D=KIVO.DailyStats; if(this._dsSaving) return false; this._dsSaving=true; try { const ok=!!D&&await D.save(o,opts); if(!ok) this.bsToast(D?D.message():"خدمة الإحصائيات غير متاحة","err"); return ok; } finally { this._dsSaving=false; } }
  async refreshStats(){ try { await KIVO.DailyStats.refresh(); if(!this._dsGone) this.setState(p=>({tick:(p.tick||0)+1})); return true; } catch(e){ if(!this._dsGone) this.bsToast(KIVO.DailyStats?KIVO.DailyStats.message():"تعذّرت قراءة الإحصائيات","err"); return false; } }
  dk(y,m,d){ return y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0"); }
  rec(site,y,m,d){ const all=this.load(); const s=all[site]||{}; return s[this.dk(y,m,d)]||{}; }
  /* السنواتُ التي فيها أرقامٌ فعلاً — قائمةُ «السنة» تُبنى منها لا من فراغ */
  YEARS(){ const all=this.load(), set={}, T=this.hToday();
    ["haram","nabawi"].forEach(st=>{ const s=all[st]||{}; Object.keys(s).forEach(k=>{ const y=+String(k).slice(0,4); if(y) set[y]=1; }); });
    set[T.y]=1;
    return Object.keys(set).map(Number).sort((a,b)=>b-a); }

  /* ══ الصلاحية ══
     R180: لكل مسجدٍ ورقتُه في شجرة الصلاحيات وسقف الصفحات (dstats/haram · dstats/nabawi)، فالإدخالُ والسجلُّ
     والأقفالُ والتصديرُ تُسأل عن ورقة المسجد المعروض لا عن الصفحة كلِّها — والخادمُ يحكم بالأوراق نفسِها.
     وتحليلاتُ «مؤشرات الإدارة» الأربعُ أوراقٌ مستقلّةٌ تحكمها صفحةُ المؤشرات. */
  PC(a,site){ try { const P=KIVO.BassamPerm; if(!P||!P.can) return true; return !!P.can("dstats/"+(site||this.SITE()), a); } catch(e){ return true; } }
  /* المسجدان الممنوحان للعرض — وتبويبُ الصفحة لا يعرض إلا ما مُنح */
  SITES(){ return ["haram","nabawi"].filter(k=>this.PC("view",k)); }
  SITE(){ const ok=this.SITES(), s=this.state.site; return ok.indexOf(s)>=0 ? s : (ok[0]||s); }
  /* يومٌ بلا أرقامٍ يُملأ إضافةً، ويومٌ فيه أرقامٌ يُغيَّر تعديلاً — تصنيفُ الخادم نفسُه */
  NEEDOF(site,prev){ return (prev && this.F[site].some(f=>prev[f.k]!=null)) ? "edit" : "add"; }
  SOLO(){ try { return (this.props && this.props.solo) ? String(this.props.solo) : ""; } catch(e){ return ""; } }

  /* ══ الأقفالُ والاعتماد — معيارُ كروت المنصة نفسُه (الخطة · الجدول · المهامّ · الجولات) ══
     رايات العرض تُقرأ من جداول أقفال D1 وتُحفظ عبر واجهة المجال بإقرار الخادم:
       locks["haram|1448-4"] === true   ← معتمدٌ بقرارك (الاعتمادُ وحدَه يُسمّى معتمداً)
       locks["haram|1448-4"] = {mo:1}   ← شهرٌ منقضٍ فُتح بأثر رجعي
     والقفلُ يحرس تعديلاتِ الشهر كلَّها لا الكرتَ وحده. */
  MKEY(site,y,m){ return site+"|"+y+"-"+m; }
  _locks(){ const o=this.load(); const L=o&&o.locks; return (L&&typeof L==="object")?L:{}; }
  _rec(site,y,m){ const v=this._locks()[this.MKEY(site,y,m)];
    if(v===true) return {ap:1};                       /* شكلٌ قديمٌ من 208 — يُقرأ ولا يُكسر */
    return (v&&typeof v==="object")?v:{}; }
  mPast(y,m){ const T=this.hToday(); return (y<T.y)||(y===T.y&&m<T.m); }
  mOpenFlag(site,y,m){ return !!this._rec(site,y,m).mo; }
  mApproved(site,y,m){ return !!this._rec(site,y,m).ap; }

  /* ══ قفلُ اليوم — نموذجُ «المتابعة اليومية» نفسُه ══
     منقضٍ ⇒ مقفولٌ ما لم يُفتح (dopen) · لم ينقضِ ⇒ مفتوحٌ ما لم يُقفل يدوياً (dshut) */
  dPast(y,m,d){ const T=this.hToday();
    return (y<T.y)||(y===T.y&&m<T.m)||(y===T.y&&m===T.m&&d<T.d); }
  isDayOpen(site,y,m,d){ const r=this._rec(site,y,m); return !!(r.dopen&&r.dopen[d]); }
  isDayShut(site,y,m,d){ const r=this._rec(site,y,m); return !!(r.dshut&&r.dshut[d]); }
  dayLocked(site,y,m,d){ return this.dPast(y,m,d)?!this.isDayOpen(site,y,m,d):this.isDayShut(site,y,m,d); }
  /* القفلُ والفتحُ بفعلٍ واحدٍ يفهم أيَّ رايةٍ يمسّ */
  async setDayLock(site,y,m,d,lock){
    const past=this.dPast(y,m,d), key=this.MKEY(site,y,m), L=Object.assign({},this._locks()), r=Object.assign({},this._rec(site,y,m));
    const open=Object.assign({},r.dopen||{}), shut=Object.assign({},r.dshut||{});
    if(lock){ if(past) delete open[d]; else shut[d]=1; }
    else { delete shut[d]; if(past) open[d]=1; }
    if(Object.keys(open).length) r.dopen=open; else delete r.dopen;
    if(Object.keys(shut).length) r.dshut=shut; else delete r.dshut;
    if(Object.keys(r).length) L[key]=r; else delete L[key];
    const ok=await this._saveLocks(L,site);
    if(ok) this.bsToast(lock?("أُقفل يومُ "+d+" "+this.MONTHS[m-1]):("فُتح يومُ "+d+" "+this.MONTHS[m-1]+" — التعديلُ متاح"),"ok");
    return ok; }
  mAutoLocked(site,y,m){ return this.mPast(y,m)&&!this.mOpenFlag(site,y,m)&&!this.mApproved(site,y,m); }
  mLocked(site,y,m){ return this.mApproved(site,y,m)||this.mAutoLocked(site,y,m); }
  async _saveLocks(next,site){
    if(!this.PC("approve",site)){ this.bsToast("الاعتمادُ والقفل يحتاج صلاحية الاعتماد","warn"); return false; }
    const all=this.load(); all.locks=next; const ok=await this.save(all);
    if(ok) this.setState(pr=>({tick:(pr.tick||0)+1})); else this.bsToast("تعذّر حفظُ حالة القفل","err");
    return ok; }
  async setMonthOpen(site,y,m,on){ const k=this.MKEY(site,y,m), L=Object.assign({},this._locks());
    const r=Object.assign({}, this._rec(site,y,m)); delete r.ap;
    if(on) r.mo=1; else delete r.mo;
    if(Object.keys(r).length) L[k]=r; else delete L[k];
    const ok=await this._saveLocks(L,site); if(ok) this.bsToast(on?"فُتح الشهرُ بأثر رجعي — التعديلُ متاح":"أُعيد قفلُ الشهر","ok"); return ok; }
  async setMonthApproved(site,y,m,on){ const k=this.MKEY(site,y,m), L=Object.assign({},this._locks());
    const r=Object.assign({}, this._rec(site,y,m));
    if(on){ r.ap=1; delete r.mo; } else { delete r.ap; r.mo=1; }
    L[k]=r;
    const ok=await this._saveLocks(L,site); if(ok) this.bsToast(on?"اعتُمد الشهرُ وأُغلق":"فُكَّ الاعتماد — الشهرُ مفتوحٌ للتعديل","ok"); return ok; }

  /* ══ شريطُ أدوات السجل ونوافذُه — مكوّنُ «سجل الحركة الشهري» المعتمد ══
     R177: القوائمُ تُرفع فوق الجداول بمُصلِح القشرة (الوسمُ data-bs-dd) كما في «موظفو الإدارة»،
     وتُغلَق بالضغط خارجها بقاعدة المنصّة نفسِها (bsMenusPatch · _bsOutsideMenus — منسوختان من
     سجلّ الاسترشاد حرفاً)، لا بمستمعٍ خاصٍّ بالصفحة. */
  bsMenusPatch(){return{rowMenu:null,lgFilesOpen:!1,lgFsOpen:!1}}
  /* قائمةُ «إجراءات» في صفّ السجل — مكوّنُ المنصّة (الاسترشاد · المضبوطات · المهام · الموظفون) حرفاً */

  /* ══ R177: بصمةُ المُدخِل — مَن أدخل كلَّ رقمٍ ومتى ══
     rec.__m  بصمةُ الأساس: تسري على كل حقلٍ فيه رقمٌ ولا استثناءَ له (السجلُّ المعتاد بصمةٌ واحدة)
     rec.__f  استثناءاتٌ لكل حقلٍ بعينه حين عدّله غيرُ مُدخِله أو في وقتٍ آخر (0 = رقمٌ قديمٌ بلا بصمة)
     البصمة { n: اسمُ المستخدم وقتَ الإدخال · u: مفتاحُه · t: الوقت (ms) · x:1 إن جاءت من استيراد Excel }
     والرقمُ الذي لم يتغيّر يحتفظ ببصمته — الحفظُ مرّةً ثانيةً لا ينسبه إلى من ضغط «حفظ». */
  dsActor(){ try { if(KIVO.BassamAuth&&KIVO.BassamAuth.display){ const t=KIVO.BassamAuth.display(); if(t&&t.name) return t.name; } } catch(t){} return "—"; }
  dsActorKey(){ try { const u=KIVO.BassamAuth&&KIVO.BassamAuth.user&&KIVO.BassamAuth.user(); if(u) return String(u.ekey||u.id||u.un||""); } catch(e){} return ""; }
  STAMP(imp){ const o={ n:this.dsActor(), u:this.dsActorKey(), t:Date.now() }; if(imp) o.x=1; return o; }
  STOF(r,k){ if(!r||r[k]==null||r[k]==="") return null; const f=r.__f;
    if(f&&typeof f==="object"&&Object.prototype.hasOwnProperty.call(f,k)) return (f[k]&&f[k].t)?f[k]:null;
    return (r.__m&&r.__m.t)?r.__m:null; }
  STEQ(a,b){ return a===b || (!!a&&!!b&&a.n===b.n&&a.u===b.u&&a.t===b.t&&(a.x||0)===(b.x||0)); }
  _stamp(prev,next,st,keys){
    prev=prev||{}; const self=this, per={};
    keys.forEach(k=>{ if(next[k]==null) return;
      per[k]=(prev[k]==null||prev[k]===""||Number(prev[k])!==Number(next[k])) ? st : self.STOF(prev,k); });
    delete next.__m; delete next.__f;
    const ks=Object.keys(per); if(!ks.length) return next;
    const groups=[]; ks.forEach(k=>{ const v=per[k]; let g=null;
      for(let i=0;i<groups.length;i++) if(self.STEQ(groups[i].s,v)){ g=groups[i]; break; }
      if(!g){ g={s:v,n:0}; groups.push(g); } g.n++; });
    groups.sort((a,b)=>(b.n-a.n)||(((b.s&&b.s.t)||0)-((a.s&&a.s.t)||0)));
    const base=groups[0].s; if(base) next.__m=base;
    const ov={}; ks.forEach(k=>{ if(!self.STEQ(per[k],base)) ov[k]=per[k]||0; });
    if(Object.keys(ov).length) next.__f=ov;
    return next; }
  /* نصوصُ البصمة: الاسم · اليومُ والهجريّ · الميلاديُّ والساعة (صيغةُ وقت سجلّ الاسترشاد نفسُها) */
  STX(st){ if(!st||!st.t) return null;
    const ck=this.__stx||(this.__stx={}), key=st.t+"|"+(st.x||0)+"|"+st.n; if(ck[key]) return ck[key];
    const dt=new Date(st.t); if(isNaN(dt.getTime())) return null;
    let h={}; try { const f=this.__stf||(this.__stf=new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn",{year:"numeric",month:"numeric",day:"numeric"}));
      f.formatToParts(dt).forEach(p=>h[p.type]=+p.value); } catch(e){ h={}; }
    const wd=this.WDAYS[dt.getDay()]||"";
    let a=dt.getHours(); const mi=dt.getMinutes(), ap=a>=12?"م":"ص"; a%=12; if(a===0) a=12;
    const tm=String(a).padStart(2,"0")+":"+String(mi).padStart(2,"0")+" "+ap;
    const hs=h.day?(h.day+"/"+h.month+"/"+h.year):"—", gs=dt.getDate()+"/"+(dt.getMonth()+1)+"/"+dt.getFullYear();
    const nm=String(st.n||"—");
    return (ck[key]={ n:nm+(st.x?" · استيراد":""), s1:wd+" "+hs, s2:gs+" · "+tm,
      tip:"أدخله: "+nm+(st.x?" (استيراد Excel)":"")+" — يوم "+wd+" "+hs+" هـ الموافق "+gs+" م — الساعة "+tm }); }
  /* خليّةُ رقمٍ في السجل: الرقمُ ثم بصمتُه تحته */
  VCELL(r,k){ const v=(r[k]==null||r[k]==="")?null:Number(r[k]), o=this.STX(this.STOF(r,k));
    return { v:v==null?"—":this.NM(v), vst:"font-size:12px;font-weight:400;color:var(--fg-x141414)"+(v==null?";opacity:.4":""),
      has:!!o, sn:o?o.n:"", s1:o?o.s1:"", s2:o?o.s2:"", tip:o?o.tip:"" }; }

  /* «تعديل»: اليومُ يُفتح في نموذج الإدخال نفسِه — والأقفالُ تُشرح لا تُتجاوز */
  lgEditDay(d){
    const s=this.state, site=this.SITE(), nm=this.MONTHS[s.month-1];
    this.setState({day:d,draft:null,rowMenu:null});
    try { setTimeout(()=>{ try { const el=document.querySelector("[data-ds-entry]"); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:"smooth",block:"center"}); } catch(x){} },60); } catch(e){}
    /* يومُ السجل فيه أرقامٌ — فتغييرُها تعديل (R180) */
    if(!this.PC("edit")) return this.bsToast(this.PC("add")?"تعديلُ أرقامٍ قائمةٍ يحتاج صلاحية التعديل":"صلاحيتك على "+this.SN[site]+" عرضٌ فقط","warn");
    if(this.mLocked(site,s.year,s.month)) return this.bsToast("شهرُ "+nm+" مقفل — افتحه بأثر رجعي من كرت الشهر ثم عدّل","warn");
    if(this.dayLocked(site,s.year,s.month,d)) return this.bsToast("يومُ "+d+" "+nm+" مقفل — افتحه بنقرتين على كرته ثم عدّل","warn");
    this.bsToast("أرقامُ يوم "+d+" "+nm+" في نموذج الإدخال — عدّلها ثم احفظ","ok"); }
  /* «حذف»: أرقامُ اليوم وحدَه — بنافذة التأكيد المعتمدة، ولصاحب صلاحية الحذف، وفي يومٍ غير مقفل */
  lgDelAsk(d){
    const self=this, s=this.state, site=this.SITE(), nm=this.MONTHS[s.month-1], y=s.year, m=s.month;
    if(!this.PC("del",site)){ this.bsToast("الحذفُ يحتاج صلاحية الحذف","warn"); return; }
    if(this.mLocked(site,y,m)){ this.bsToast("الشهرُ مقفل — افتحه بأثر رجعي أوّلاً","warn"); return; }
    if(this.dayLocked(site,y,m,d)){ this.bsToast("يومُ "+d+" "+nm+" مقفل — افتحه بنقرتين على كرته أوّلاً","warn"); return; }
    const go=async(ok)=>{ if(!ok) return;
      const all=self.load(), st=Object.assign({},all[site]||{}), k=self.dk(y,m,d);
      if(!st[k]){ self.bsToast("لا أرقامَ لهذا اليوم","warn"); return; }
      delete st[k]; all[site]=st;
      if(await self.save(all)){ self.setState(p=>({tick:(p.tick||0)+1,draft:(p.day===d&&p.month===m&&p.year===y)?null:p.draft})); self.bsToast("حُذفت أرقامُ يوم "+d+" "+nm,"ok"); }
      else self.bsToast("تعذّر الحذف","err"); };
    try { const C=KIVO.bsConfirm;
      if(C) C({ title:"حذفُ أرقام يوم "+d+" "+nm+" "+y+" هـ",
                msg:"ستُمحى أرقامُ هذا اليوم في "+this.SN[site]+" ("+d+"/"+m+"/"+y+" هـ الموافق "+this.gTxt(y,m,d)+" م) نهائياً، ولا يمكن التراجع. بقيّةُ أيام الشهر لا تتأثّر.",
                ok:"حذف أرقام اليوم", cancel:"إلغاء", danger:true }).then(go);
      else go(window.confirm("حذفُ أرقام يوم "+d+" "+nm+" نهائياً؟")); } catch(e){} }
  MBTN(on){ return "height:34px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;"+
    "font-family:'Cairo',sans-serif;border-radius:10px;cursor:pointer;transition:all .2s;box-sizing:border-box;border:1px solid "+
    (on?"var(--bd-a185151810p45);background:var(--bg-a185151810p08);color:var(--fg-xb99751)"
       :"var(--bd-xe2e8f0);background:var(--bg-xffffff);color:var(--fg-x53565a)"); }
  MCHEV(on){ return "transition:transform .2s;flex-shrink:0;"+(on?"transform:rotate(180deg)":""); }
  PGBTN(dis){ return "height:28px;min-width:28px;padding:0 7px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);"+
    "font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;"+
    (dis?"color:var(--fg-xcbd5e1);cursor:default":"color:var(--fg-x53565a);cursor:pointer"); }
  PGNUM(cur){ return "height:28px;min-width:28px;padding:0 7px;border:0;border-right:1px solid var(--bd-xe1e1e1);"+
    "font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;"+
    (cur?"background:var(--bg-a185151810p12);color:var(--fg-xb99751)":"background:var(--bg-xffffff);color:var(--fg-x53565a)"); }

  _lgVals(site,total,pages,page,from,to){
    const self=this, s=this.state;
    const FS=[["all","كل الأيام"],["full","مكتملةُ الحقول"],["part","ناقصةُ الحقول"]];
    const cur=FS.filter(f=>f[0]===(s.lgFs||"all"))[0]||FS[0];
    const nums=[]; const push=(n)=>nums.push({ dots:false, plain:true, label:String(n), style:self.PGNUM(n===page),
      click:()=>self.setState({lgPage:n}) });
    if(pages<=7){ for(let i=1;i<=pages;i++) push(i); }
    else { push(1);
      if(page>3) nums.push({dots:true,plain:false,label:"",style:"",click:()=>{}});
      for(let i=Math.max(2,page-1);i<=Math.min(pages-1,page+1);i++) push(i);
      if(page<pages-2) nums.push({dots:true,plain:false,label:"",style:"",click:()=>{}});
      push(pages); }
    return {
      lgOpen:!!s.lgOpen, lgChev:"transition:transform .2s;flex-shrink:0;"+(s.lgOpen?"transform:rotate(180deg)":""),
      lgToggle:()=>self.setState(p=>({lgOpen:!p.lgOpen})),
      lgSearch:s.lgSearch||"", lgSetSearch:(e)=>self.setState({lgSearch:(e&&e.target?e.target.value:""),lgPage:1}),
      lgFilesOpen:!!s.lgFilesOpen, lgFilesChev:this.MCHEV(!!s.lgFilesOpen), lgFilesBtnStyle:this.MBTN(!!s.lgFilesOpen),
      lgFilesToggle:()=>{ const on=!self.state.lgFilesOpen; self.setState({lgFilesOpen:on,lgFsOpen:false,rowMenu:null}); },
      lgFsOpen:!!s.lgFsOpen, lgFsChev:this.MCHEV(!!s.lgFsOpen), lgFsBtnStyle:this.MBTN((s.lgFs||"all")!=="all"||!!s.lgFsOpen),
      lgFsLabel:cur[1],
      lgFsToggle:()=>{ const on=!self.state.lgFsOpen; self.setState({lgFsOpen:on,lgFilesOpen:false,rowMenu:null}); },
      lgFsOpts:FS.map(f=>({ label:f[1], click:()=>self.setState({lgFs:f[0],lgFsOpen:false,lgPage:1}),
        style:"display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;"+
          ((s.lgFs||"all")===f[0]?"background:var(--bg-a185151810p1);color:var(--fg-xb99751);font-weight:600":"color:var(--fg-x141414);font-weight:400") })),
      /* R180: التصديرُ والطباعةُ بفعل «تصدير» على ورقة المسجد — كسجلّ الاسترشاد حرفاً */
      lgExport:()=>{ if(!self.PC("export",site)) return; self.setState({lgFilesOpen:false}); self.expXlsx(); },
      lgImport:()=>{ self.setState({lgFilesOpen:false}); self.impXlsx(); },
      lgPrint:()=>{ if(!self.PC("export",site)) return; self.setState({lgFilesOpen:false}); setTimeout(()=>{ try { window.print(); } catch(e){} },150); },
      lgClearItemStyle:"display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;color:var(--fg-x141414);transition:background .15s",
      lgClearAsk:()=>{ self.setState({lgFilesOpen:false}); self.clearMonthAsk(); },
      lgFootOn: total>0,
      lgPgRange:(total?(from+1):0)+"–"+to, ...KIVO.BassamCount.pair("lgPgTotal",String(total),"يوم","g"),
      lgPerPage:String(s.lgPer==null?50:s.lgPer),
      lgOnPerPage:(e)=>self.setState({lgPer:+(e&&e.target?e.target.value:50),lgPage:1}),
      lgPgNums:nums,
      lgPgFirst:()=>self.setState({lgPage:1}), lgPgPrev:()=>self.setState({lgPage:Math.max(1,page-1)}),
      lgPgNext:()=>self.setState({lgPage:Math.min(pages,page+1)}), lgPgLast:()=>self.setState({lgPage:pages}),
      lgPgFirstStyle:this.PGBTN(page<=1), lgPgPrevStyle:this.PGBTN(page<=1),
      lgPgNextStyle:this.PGBTN(page>=pages), lgPgLastStyle:this.PGBTN(page>=pages) }; }

  /* حذفُ أرقام الشهر للمسجد المعروض — بنافذة التأكيد المعتمدة، ولصاحب صلاحية الحذف */
  clearMonthAsk(){
    const self=this, s=this.state, nm=this.MONTHS[s.month-1], site=this.SITE();
    const siteName = site==="haram"?"المسجد الحرام":"المسجد النبوي";
    if(!this.PC("del",site)){ this.bsToast("الحذفُ يحتاج صلاحية الحذف","warn"); return; }
    if(this.mLocked(site,s.year,s.month)){ this.bsToast("الشهرُ مقفل — افتحه بأثر رجعي أوّلاً","warn"); return; }
    /* R181 (أخٌ لاستيراد Excel): اليومُ المقفلُ داخل الشهر لا يُمسّ — كما يُرفض حذفُه يوماً يوماً */
    const pre=s.year+"-"+String(s.month).padStart(2,"0")+"-";
    const lockedIn=(st)=>Object.keys(st).filter(k=>k.indexOf(pre)===0&&self.dayLocked(site,s.year,s.month,+k.slice(8,10)));
    const st0=(this.load()[site])||{}, nLk0=lockedIn(st0).length, nAll0=Object.keys(st0).filter(k=>k.indexOf(pre)===0).length;
    if(nAll0&&nLk0===nAll0){ this.bsToast("أيامُ "+nm+" التي فيها أرقامٌ كلُّها مقفلة — افتح اليومَ بنقرتين على كرته أوّلاً","warn"); return; }
    const go=async(ok)=>{ if(!ok) return;
      if(self.mLocked(site,s.year,s.month)){ self.bsToast("الشهرُ مقفل — افتحه بأثر رجعي أوّلاً","warn"); return; }
      const all=self.load(), st=Object.assign({},all[site]||{}), keep=lockedIn(st); let n=0;
      Object.keys(st).forEach(k=>{ if(k.indexOf(pre)===0&&keep.indexOf(k)<0){ delete st[k]; n++; } });
      all[site]=st;
      if(await self.save(all)){ self.setState(p=>({tick:(p.tick||0)+1,draft:null})); self.bsToast("حُذفت أرقامُ "+nm+" ("+KIVO.BassamCount(n,"يوم")+")"+(keep.length?" — وبقي "+KIVO.BassamCount(keep.length,"يوم|مقفل")+" "+KIVO.BassamCount.agr(keep.length,"كما هو","كما هما","كما هي"):""),"ok"); }
      else self.bsToast("تعذّر الحذف","err"); };
    try { const C=KIVO.bsConfirm;
      if(C) C({ title:"حذفُ أرقام "+nm+" "+s.year+" هـ", msg:"سيُمحى كلُّ ما أُدخل لهذا الشهر في "+siteName+" نهائياً، ولا يمكن التراجع."+(nLk0?" ويبقى "+KIVO.BassamCount(nLk0,"يوم|مقفل")+" "+KIVO.BassamCount.agr(nLk0,"كما هو — افتحه بنقرتين على كرته إن أردت حذفَه.","كما هما — افتحهما بنقرتين على كرتيهما إن أردت حذفَهما.","كما هي — افتحها بنقرتين على كروتها إن أردت حذفَها."):""),
                ok:"حذف الكل نهائياً", cancel:"إلغاء", danger:true }).then(go);
      else go(window.confirm("حذفُ أرقام "+nm+" نهائياً؟")); } catch(e){} }

  /* نوافذُ معيار الكروت: «فتح بأثر رجعي/إعادة القفل» و«اعتماد وإغلاق/فكّ الاعتماد» */
  _dlgVals(site,flds){
    const self=this, s=this.state, R=s.retroAsk, K=s.lockAsk;
    const out={ retroOn:false, lockOn2:false, retroStop:(e)=>{ try{ e.stopPropagation(); }catch(x){} } };
    if(R&&R.d){                                   /* ══ مستوى اليوم ══ */
      const nm=this.MONTHS[R.m-1]||"", past=this.dPast(s.year,R.m,R.d), lbl=R.d+" "+nm+" "+s.year+" هـ";
      out.retroOn=true;
      out.retroTitle=R.open?("فتح يوم "+lbl+(past?" بأثر رجعي":"")):("قفل يوم "+lbl);
      out.retroMsg=R.open
        ? (past?"هذا اليومُ انقضى وأُقفل تلقائياً. فتحُه يتيح لك إدخالَ أرقامه أو تصحيحَها بأثر رجعي."
               :"هذا اليومُ مقفولٌ يدوياً. فتحُه يعيد إليه التحريرَ والحفظ.")
        : "سيُقفل اليومُ أمام أيّ تعديل حتى تفتحه من جديد، وأرقامُه تبقى كما هي.";
      out.retroB1=R.open?"ما تُدخله يُسجَّل في هذا اليوم وحدَه":"ما أُدخل فيه يبقى محفوظاً كما هو";
      out.retroB2=R.open?"يبقى مفتوحاً حتى تقفله من جديد":"يمكنك فتحه في أي وقت بنقرة مزدوجة على كرته";
      out.retroB3=R.open?"بقيّةُ أيام الشهر لا تتأثّر":"بقيّةُ أيام الشهر لا تتأثّر";
      out.retroBtn=R.open?(past?"فتح بأثر رجعي":"فتح اليوم"):"قفل اليوم";
      out.retroBtnStyle="height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:"+(R.open?"var(--bg-xb45309)":"var(--bg-x64748b)");
      out.retroDo=async()=>{ if(await self.setDayLock(site,s.year,R.m,R.d,!R.open)) self.setState({retroAsk:null}); };
      out.retroCancel=()=>self.setState({retroAsk:null}); }
    else if(R){ const nm=this.MONTHS[R.m-1]||"";
      out.retroOn=true;
      out.retroTitle=R.open?("فتح شهر "+nm+" "+s.year+" هـ بأثر رجعي"):("إعادة قفل شهر "+nm+" "+s.year+" هـ");
      out.retroMsg=R.open?"هذا الشهر انقضى وأُقفل تلقائياً. فتحه يتيح لك إدخالَ أرقامه أو تصحيحَها بأثر رجعي."
                         :"سيعود الشهر إلى حالته المقفلة بانقضائه، ولن يمكن تعديلُ أرقامه حتى تفتحه من جديد.";
      out.retroB1=R.open?"ما تُدخله يُسجَّل ضمن هذا الشهر المنقضي":"ما أدخلته يبقى محفوظاً كما هو";
      out.retroB2=R.open?"يبقى مفتوحاً حتى تعتمده أو تعيد قفله":"يمكنك فتحه مجدداً في أي وقت بنقرة مزدوجة";
      out.retroB3=R.open?"يمكنك إعادة قفله في أي وقت بنقرة مزدوجة على كرته":"إن أردت اعتماده بدل قفله، افتحه ثم أغلقه بنافذة الاعتماد";
      out.retroBtn=R.open?"فتح بأثر رجعي":"إعادة القفل";
      out.retroBtnStyle="height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:"+(R.open?"var(--bg-xb45309)":"var(--bg-x64748b)");
      out.retroDo=async()=>{ if(await self.setMonthOpen(site,s.year,R.m,!!R.open)) self.setState({retroAsk:null}); };
      out.retroCancel=()=>self.setState({retroAsk:null}); }
    if(K){ const nm=this.MONTHS[K.m-1]||"";
      out.lockOn2=true;
      out.lcIconBox="width:52px;height:52px;border-radius:15px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;"+
        (K.on?"background:var(--bg-a0132800p1);color:var(--fg-x047857);border:1px solid rgba(0,132,80,0.3)"
             :"background:var(--bg-a245158110p12);color:var(--fg-xb45309);border:1px solid rgba(180,83,9,0.3)");
      out.lcIconPath=K.on?"M7 11V7a5 5 0 0 1 10 0v4":"M7 11V7a5 5 0 0 1 9.9-1";
      out.lcTitle=K.on?("اعتماد شهر "+nm+" وإغلاقه"):("فكُّ اعتماد شهر "+nm);
      out.lcMsg=K.on?("سيُعتمد ما أُدخل في "+nm+" ("+KIVO.BassamCount(K.has,"يوم")+" "+KIVO.BassamCount.agr(K.has,"فيه","فيهما","فيها")+" أرقام) ويُغلق الشهر أمام أي تعديل.")
                    :("سيعود الشهر مفتوحاً للتعديل، ويزول وصفُ «معتمد» عن كرته.");
      out.lcNote=K.on?"يمكنك فكُّ الاعتماد لاحقاً بنقرة مزدوجة على كرت الشهر":"أرقامُ الشهر تبقى كما هي — الفكُّ لا يمسّ بياناتٍ";
      out.lcNoteColor=K.on?"var(--fg-x94a3b8)":"var(--fg-x94a3b8)";
      out.lcDoLabel=K.on?"اعتماد وإغلاق":"فكُّ الاعتماد";
      out.lcDoStyle="height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:"+(K.on?"var(--bg-x008450)":"var(--bg-xb45309)");
      out.lockDo=async()=>{ if(await self.setMonthApproved(site,s.year,K.m,!!K.on)) self.setState({lockAsk:null}); };
      out.lockCancel=()=>self.setState({lockAsk:null}); }
    return out; }

  /* ══ تنبيهُ المنصّة ══ */
  bsToast(msg,kind){ try {
    const k=kind||"err"; let n=document.getElementById("bs-toast");
    if(!n){ n=document.createElement("div"); n.id="bs-toast"; document.body.appendChild(n); }
    const a = k==="ok"   ? ["var(--toast-ok)","var(--bg-toast)","var(--toast-ok-bd)","✓"]
            : k==="warn" ? ["var(--toast-warn)","var(--bg-toast)","var(--toast-warn-bd)","⚠"]
            :              ["var(--toast-err)","var(--bg-toast)","var(--toast-err-bd)","⚠"];
    n.setAttribute("style","position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483000;max-width:min(560px,92vw);direction:rtl;text-align:right;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;line-height:1.9;color:"+a[0]+";background:"+a[1]+";border:1px solid "+a[2]+";border-radius:14px;padding:12px 18px;box-shadow:var(--shadow-elevated);opacity:0;transition:opacity .22s ease, transform .22s ease;pointer-events:none");
    n.textContent=a[3]+"  "+String(msg==null?"":msg);
    requestAnimationFrame(()=>{ try { n.style.opacity="1"; n.style.transform="translateX(-50%) translateY(0)"; } catch(e){} });
    clearTimeout(this._bsToastT); this._bsToastT=setTimeout(()=>{ try { n.style.opacity="0"; n.style.transform="translateX(-50%) translateY(-8px)"; } catch(e){} }, 4200);
  } catch(e){} }

  _bsLiveReload(K){
    const hit=(K||[]).some(k=>{ k=String(k); return k===this.KEY || k.slice(-this.KEY.length-1)===":"+this.KEY; });
    if(!hit) return true;
    if(this.state.draft) return false;
    this.refreshStats();
    return true;
  }

  /* ══ إحصاء ══ */
  ST(v){ const h=v.filter(x=>x!=null&&x!==""); if(!h.length) return {total:0,avg:null,peak:null,low:null,days:0};
    const n=h.map(Number), t=n.reduce((a,b)=>a+b,0), p=n.filter(x=>x>0);
    return {total:t,avg:t/n.length,peak:Math.max.apply(null,n),low:p.length?Math.min.apply(null,p):null,days:n.length}; }
  GP(s){ return (s.peak==null||s.low==null||s.peak<=s.low||s.avg==null)?null:Math.max(0,Math.min(100,(s.avg-s.low)/(s.peak-s.low)*100)); }
  TOT(site,r){ const v = site==="haram" ? [r.worshippers,r.umrah,r.carts,r.hijr_ismail]
      : [r.worshippers,r.salam_corridor,r.rawdah_men_actual,r.rawdah_women_actual];
    return v.some(x=>x!=null&&x!=="") ? v.reduce((a,b)=>a+(Number(b)||0),0) : null; }
  NM(n){ return (n==null||n==="")?"—":Number(n).toLocaleString("en-US"); }
  PCT(n){ return n==null?"—":Math.round(n)+"٪"; }
  SGN(n){ return n==null?"—":"‎"+(n>0?"+":n<0?"−":"")+Math.abs(Math.round(n))+"٪"; }
  SNM(n){ return n==null?"—":"‎"+(n>0?"+":n<0?"−":"")+Math.abs(n).toLocaleString("en-US"); }
  /* R188: «ألف/مليون» كلمةً بدل «ك/م» — والعبارةُ معزولةٌ «من اليمين» (⁧…⁩ كعُرف ٪ في المنصة) فتُقرأ «١٫٤ مليون» صحيحةً
     حتى داخل الحاويات ذات dir="ltr" (كبسولاتُ المكوّنات · الحلقة · محورُ الاتجاه · جدولُ التركيب) */
  CMP(n){ if(n==null) return "—"; const a=Math.abs(n);
    if(a>=1e6) return "\u2067"+(n/1e6).toFixed(1)+" مليون\u2069";
    if(a>=1000) return "\u2067"+Math.round(n/1000)+" ألف\u2069";
    return String(Math.round(n)); }
  /* R188: حيث يضيق المكان تنزل «ألف/مليون» سطراً تحت الرقم (يصغّرها الصنفُ dz-u2) */
  CMP2(n){ return this.CMP(n).replace(" ","\n"); }
  RT(a,b){ return b ? a/b*100 : null; }
  /* R188: شارةُ سجلّ التحليل بصيغة شارة «سجل الشهر» — والسنةُ مؤنّثةٌ ليست في قاموس العدد فتُمرَّر صيغُها */
  ATBLC(k,n,W){ const C=KIVO.BassamCount, yr=W.one==="سنة";
    const f=yr?["سنة واحدة","سنتان","سنتين","سنوات","سنةً","سنة"]:W.one;
    return C(k,f)+" "+(yr?C.agr(k,"فيها","فيهما","فيها"):C.agr(k,"فيه","فيهما","فيها"))+" أرقام"+(n>1?" من "+n:""); }
  DAYW(n){ return KIVO.BassamCount(n,"يوم|مسجّل"); }

  /* مكوّناتُ الإجمالي — بأسماء موقع الإحصائيات نفسِها: أربعةٌ للحرم وأربعةٌ للنبويّ */
  COMPS(site){ return site==="haram"
    ? this.F.haram.map(f=>({k:f.k,l:f.l,d:f.d,i:f.i}))
    : [{k:"worshippers",l:"المصلين",d:"إجمالي المصلين داخل المسجد النبوي",i:"people"},
       {k:"salam_corridor",l:"ممر السلام",d:"العابرون لممر السلام",i:"door"},
       {k:"rawdah_men_actual",l:"الروضة رجال فعلي",d:"من دخل الروضة الشريفة فعلاً — رجال",i:"rawdah"},
       {k:"rawdah_women_actual",l:"الروضة نساء فعلي",d:"من دخلت الروضة الشريفة فعلاً — نساء",i:"rawdah"}]; }
  VOF(r,k){ if(k==="__r") return (r.rawdah_men_actual!=null||r.rawdah_women_actual!=null)
      ? (Number(r.rawdah_men_actual)||0)+(Number(r.rawdah_women_actual)||0) : null;
    return (r[k]==null||r[k]==="") ? null : Number(r[k]); }

  /* ══ وحداتُ الفترة ══ */
  /* R189: num = تاريخُ الوحدة بالأرقام (يومٌ ١٤٤٨-٠٤-٢٠ · شهرٌ ١٤٤٨-٠٤ · سنةٌ كما هي) — لعمود التاريخ في سجلّ التحليل ولتاريخَي «أدنى/ذروة» */
  _mkUnit(site,label,full,rec,days,full2,num){ return { label:label, full:full, num:num||full, rec:rec, tot:this.TOT(site,rec), days:days, full2:full2 }; }
  _aggDays(site,keys){ const store=(this.load()[site])||{}, flds=this.F[site], ag={}; let days=0, full=0;
    keys.forEach(k=>{ const r=store[k]; if(!r) return; let h=false;
      flds.forEach(f=>{ if(r[f.k]!=null){ ag[f.k]=(ag[f.k]||0)+Number(r[f.k]); h=true; } });
      if(h){ days++; if(flds.every(f=>r[f.k]!=null)) full++; } });
    return { rec: days?ag:{}, days:days, full:full }; }
  MKEYS(y,m){ const nd=this.dim(y,m), a=[]; for(let d=1;d<=nd;d++) a.push(this.dk(y,m,d)); return a; }

  /* وحداتُ شاشة التحليل بحسب شريط التقويم: مخصّص ← أيام · كل السنوات ← سنوات · كل الأشهر ← أشهر · وإلّا أيام الشهر */
  AUNITS(site){
    const s=this.state, flds=this.F[site], store=(this.load()[site])||{}, out=[];
    if(s.anMode==="custom" && s.anFrom && s.anTo){
      let a=new Date(s.anFrom+"T12:00:00"), b=new Date(s.anTo+"T12:00:00");
      if(isNaN(a)||isNaN(b)) return out;
      if(a>b){ const t=a; a=b; b=t; }
      /* لا يُسمّى المتغيّرُ باسم وسمٍ هنا: حارسُ التوازن يعدّ ما بعد «أصغر من» وسماً مفتوحاً */
      const nDays=Math.min(400, Math.round((b-a)/86400000)+1);
      for(let i=0;i<nDays;i++){ const dt=new Date(a.getTime()+i*86400000), o=this.hOfDate(dt);
        const r=store[this.dk(o.year,o.month,o.day)]||{};
        out.push(this._mkUnit(site, String(o.day), o.day+" "+this.MONTHS[o.month-1]+" "+o.year,
          r, flds.some(f=>r[f.k]!=null)?1:0, flds.every(f=>r[f.k]!=null)?1:0, this.dk(o.year,o.month,o.day))); }
      return out;
    }
    if(s.anY==="all"){
      this.YEARS().slice().sort((x,z)=>x-z).forEach(y=>{ let keys=[];
        for(let m=1;m<=12;m++) keys=keys.concat(this.MKEYS(y,m));
        const g=this._aggDays(site,keys);
        out.push(this._mkUnit(site, String(y), y+" هـ", g.rec, g.days, g.full?1:0)); });
      return out;
    }
    const y=s.anY;
    if(s.anM==="all"){
      for(let m=1;m<=12;m++){ const g=this._aggDays(site,this.MKEYS(y,m));
        out.push(this._mkUnit(site, this.MONTHS[m-1], this.MONTHS[m-1]+" "+y, g.rec, g.days, g.full?1:0, y+"-"+String(m).padStart(2,"0"))); }
      return out;
    }
    const m=+s.anM, nd=this.dim(y,m);
    for(let d=1;d<=nd;d++){ const r=store[this.dk(y,m,d)]||{};
      out.push(this._mkUnit(site, String(d), d+" "+this.MONTHS[m-1],
        r, flds.some(f=>r[f.k]!=null)?1:0, flds.every(f=>r[f.k]!=null)?1:0, this.dk(y,m,d))); }
    return out;
  }
  APER(){ const s=this.state;
    if(s.anMode==="custom" && s.anFrom && s.anTo) return "من "+s.anFrom+" إلى "+s.anTo;
    if(s.anY==="all") return "كل السنوات";
    if(s.anM==="all") return s.anY+" هـ — كل الأشهر";
    return this.MONTHS[(+s.anM)-1]+" "+s.anY+" هـ"; }
  AUNITW(){ const s=this.state;
    if(s.anMode==="custom") return {one:"يوم", many:"يوماً", al:"الأيّام"};
    if(s.anY==="all") return {one:"سنة", many:"سنةً", al:"السنوات"};
    if(s.anM==="all") return {one:"شهر", many:"شهراً", al:"الأشهر"};
    return {one:"يوم", many:"يوماً", al:"الأيّام"}; }

  /* ══ مكوّناتُ المنصّة: نفسُ صيغِها حرفاً بحرف ══ */
  TABST(on){ return "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:150px;cursor:pointer;font-family:'Cairo',sans-serif;"
    +(on?"background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45);border:2px solid var(--bd-a185151810p45)":"background:transparent;border:2px solid transparent"); }
  TABIC(on){ return "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;"
    +(on?"background:var(--bg-a185151810p1);color:var(--fg-xb99751)":"background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)"); }
  TABLB(on){ return "font-size:12px;transition:color .3s;"+(on?"font-weight:600;color:var(--fg-xb99751)":"font-weight:400;color:var(--fg-x53565a)"); }
  /* زرُّ المجموعة في شريط التقويم المعتمد */
  MODEBTN(on){ return "border:0;font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;"
    +(on?"background:var(--bg-xffffff);color:var(--fg-x8a6f35);box-shadow:var(--shadow-card)":"background:transparent;color:var(--fg-x94a3b8)"); }
  YMBOX(dim){ return "display:flex;align-items:center;gap:7px;border:1px solid "+(dim?"var(--bd-xe6e9ed)":"var(--bd-a185151810p45)")
    +";background:"+(dim?"var(--bg-xf8f9fb)":"var(--bg-a185151810p07)")+";border-radius:12px;padding:4px 11px;flex-shrink:0;opacity:"+(dim?".55":"1"); }
  HBAR(pct){ return "display:block;height:"+Math.max(4,Math.round(1.3*Math.max(0,Math.min(100,pct||0))))+"px;margin:3px auto 0;max-width:70px;border-radius:7px 7px 2px 2px;background:linear-gradient(180deg,var(--bg-xa98f4f),var(--bg-x6e5626));box-shadow:inset 0 2px 3px rgba(255,255,255,0.3),0 3px 7px -2px rgba(70,52,15,0.45)"; }
  HVST(low){ return "font-size:13.5px;font-weight:900;color:"+(low?"var(--fg-x9b3a25)":"var(--fg-x5e491a)"); }
  CROW(chip,nm,pct,val,color,tip){ return { chip:chip, nm:nm, tip:tip||"",
    bar:"display:block;height:100%;border-radius:99px;background:"+color+";width:"+Math.max(0,Math.min(100,pct||0)).toFixed(0)+"%",
    val:val, valSt:"font-size:11px;font-weight:800;white-space:nowrap;color:"+color }; }
  KPI(title,sub,vals,opt){ opt=opt||{};
    const st=this.ST(vals), g=this.GP(st), f=opt.pct ? (v=>this.PCT(v)) : (v=>this.NM(v));
    const gg = g==null ? 0 : g;
    /* R189: تاريخُ الوحدة التي سُجّل فيها الأدنى (أصغرُ رقمٍ موجب — كما يحسبه ST) والذروة — أوّلُها عند التساوي، كمراقبة الاتجاه */
    let iLo=-1, iPk=-1; vals.forEach((v,i)=>{ if(v==null||v==="") return; const n=Number(v);
      if(iPk<0||n>Number(vals[iPk])) iPk=i; if(n>0&&(iLo<0||n<Number(vals[iLo]))) iLo=i; });
    const D=opt.dates, lowD=D?(iLo>=0?String(D[iLo]):"—"):"", peakD=D?(iPk>=0?String(D[iPk]):"—"):"";
    return { title:title, sub:sub,
      value: opt.mode==="avg" ? f(st.avg==null?null:Math.round(st.avg)) : f(st.total),
      vSt:"font-size:31px;font-weight:900;line-height:1.2;margin-top:2px;color:var(--fg-x141414);",
      vTip: opt.vTip || (sub+" — والعدّادُ يقيس موضعَ المتوسّط بين القاع والذروة: "+this.PCT(g)),
      off:(263.9*(1-gg/100)).toFixed(1),
      ndl:"transform-origin:100px 104px;transition:transform 1.2s cubic-bezier(.3,.9,.28,1.05);transform:rotate("+(1.8*gg-90).toFixed(1)+"deg)",
      low:f(st.low), avg:f(st.avg==null?null:Math.round(st.avg)), peak:f(st.peak), lowD:lowD, peakD:peakD,
      f1t:"أدنى قيمةٍ موجبةٍ قيست — الصفرُ لا يُعدّ قاعاً بل غياباً للقياس",
      f2t:"المتوسّط = الإجمالي ÷ عددِ ما فيه أرقام ("+st.days+") لا ÷ كلِّ الفترة",
      f3t:"أعلى قيمةٍ قيست في الفترة" }; }

  /* ══ هندسةُ الرسم ══ */
  CH0 = 18; CH1 = 212; CVB = 230;
  GRID(mx){ const a=[]; for(let g=0;g<=4;g++){ const y=this.CH0+(this.CH1-this.CH0)*g/4;
    a.push({ y:y.toFixed(1), lp:"left:93.2%;top:"+(y/this.CVB*100).toFixed(2)+"%", label:this.CMP(Math.round(mx-mx*g/4)) }); } return a; }
  LX(i,n){ return 12 + (n<2 ? 316 : 632*i/(n-1)); }
  BX(i,n){ return 12 + 632*(i+0.5)/n; }
  YV(v,mx){ return this.CH1 - (this.CH1-this.CH0)*(mx?Math.max(0,Number(v))/mx:0); }
  XP(x){ return "left:"+(x/700*100).toFixed(2)+"%"; }
  SEGS(vals,mx,color,af){ const self=this, n=vals.length, segs=[], solo=[]; let cur=[];
    const push=()=>{ if(cur.length>1) segs.push(cur); else if(cur.length===1) solo.push(cur[0]); cur=[]; };
    vals.forEach((v,i)=>{ if(v==null) push(); else cur.push([self.LX(i,n), self.YV(v,mx)]); });
    push();
    const B=this.CH1;
    const out=segs.map(g=>({ c:color, af:af||"transparent",
      line:"M"+g.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" L"),
      area:"M"+g[0][0].toFixed(1)+","+B+" L"+g.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" L")+" L"+g[g.length-1][0].toFixed(1)+","+B+" Z" }));
    out.solo=solo.map(p=>({x:p[0].toFixed(1), y:p[1].toFixed(1), c:color}));
    return out; }
  XLAB(units,fx){ const n=units.length||1, st=Math.max(1,Math.ceil(n/13)), a=[];
    for(let i=0;i<n;i+=st) a.push({ lp:this.XP(fx(i,n)), t:units[i].label }); return a; }

  /* ══ خلايا الجدول ══ */
  TH(n,ic){ const p=this.IC[ic]||this.IC.sum; return { n:n, d1:p[0], d2:p[1] }; }
  TD(v,o){ o=o||{};
    return { v:v, dir:o.rtl?"rtl":"ltr",
      style:"padding:11px 8px;text-align:center;font-size:"+(o.fs||"12px")+";font-weight:"+(o.w||400)+";color:"+(o.c||"var(--fg-x141414)")+(o.nowrap?";white-space:nowrap":"")+(o.faint?";opacity:.4":"") }; }
  TDN(v,o){ return this.TD(v==null?"—":this.NM(v), Object.assign({faint:v==null}, o||{})); }

  /* الفحص العميق 2026-10-21 (R2): اليومُ المحفوظ (يُزرع قبل أول رسم من حالة العرض) لا يُستبدل باليوم الجاري عند التركيب */
  componentDidMount(){ this._dsGone=false; this.refreshStats(); this._dsEvent=()=>{ if(!this.state.draft) this.refreshStats(); }; window.addEventListener("daily-stats-refresh",this._dsEvent); const t=this.hToday(), s0=this.state, kept=!!(s0.year&&s0.month&&s0.day);
    const prev = t.m>1 ? {y:t.y,m:t.m-1} : {y:t.y-1,m:12};
    this.setState({ year:kept?s0.year:t.y, month:kept?s0.month:t.m, day:kept?s0.day:t.d, anY:t.y, anM:String(t.m),
      tcA:{y:prev.y,m:prev.m,d:1}, tcB:{y:t.y,m:t.m,d:t.d} });
    /* قاعدةُ المنصّة: نقرةٌ خارج أيّ قائمةٍ تُغلق القوائمَ المفتوحة (كما في سجلّ الاسترشاد) */
    this._bsOutM=t=>this._bsOutsideMenus(t),document.addEventListener("click",this._bsOutM,!0); }

  /* R182: اليومُ المقفل لا يُكتب في حقوله ولا يُحفظ — الحارسُ هنا كما في الشاشة */
  _dayLockMsg(site){ const s=this.state, nm=this.MONTHS[s.month-1];
    if(this.mLocked(site,s.year,s.month)) return "شهرُ "+nm+" مقفل — افتحه بأثر رجعي من كرت الشهر ثم عدّل";
    if(this.dayLocked(site,s.year,s.month,s.day)) return "يومُ "+s.day+" "+nm+" مقفل — افتحه بنقرتين على كرته ثم عدّل";
    return ""; }
  setField(k,v){ if(this._dsSaving) return; if(!KIVO.DailyStats||!KIVO.DailyStats.ready()) return this.bsToast("انتظر قراءة الإحصائيات من الخادم","warn"); if(!this.state.draft) this._draftRev=KIVO.DailyStats.revision(); const site=this.SITE(), s=this.state; if(this._dayLockMsg(site)) return;
    /* R182 (أخو القفل): قاعدةُ الحفظ نفسُها — يومٌ فيه أرقامٌ يحتاج «تعديل» ويومٌ فارغٌ يحتاج «إضافة» */
    if(!this.PC(this.NEEDOF(site,this.rec(site,s.year,s.month,s.day)),site)) return;
    const d=Object.assign({},s.draft||{}); d[k]=v; this.setState({draft:d}); }
  async saveDay(){
    const s=this.state, site=this.SITE();
    if(!this.PC("edit",site)&&!this.PC("add",site)) return this.bsToast("صلاحيتك على "+this.SN[site]+" عرضٌ فقط","warn");
    const dr=s.draft||{}, cur=this.rec(site,s.year,s.month,s.day), flds=this.F[site], out={};
    let any=false;
    flds.forEach(f=>{ const raw=(f.k in dr)?dr[f.k]:cur[f.k];
      const v=(raw===""||raw==null)?null:Number(raw);
      out[f.k]=(v==null||isNaN(v))?null:v; if(out[f.k]!=null) any=true; });
    if(!any) return this.bsToast("لم تُدخل أيّ قيمة — لا شيء يُحفظ","warn");
    const all=this.load(); if(!all[site]) all[site]={};
    const key=this.dk(s.year,s.month,s.day);
    /* R180: يومٌ بلا أرقامٍ يُملأ بفعل «إضافة»، ويومٌ فيه أرقامٌ يُغيَّر بفعل «تعديل» — تصنيفُ الخادم نفسُه */
    const need=this.NEEDOF(site, all[site][key]);
    if(!this.PC(need,site)) return this.bsToast(need==="edit"?"تعديلُ أرقامٍ قائمةٍ يحتاج صلاحية التعديل":"إدخالُ أرقام يومٍ جديدٍ يحتاج صلاحية الإضافة","warn");
    const lk=this._dayLockMsg(site); if(lk) return this.bsToast(lk,"warn");
    /* R177: بصمةُ المُدخِل — ما تغيّر يُنسب إليك الآن، وما لم يتغيّر يبقى لصاحبه */
    all[site][key]=this._stamp(all[site][key]||null, out, this.STAMP(false), flds.map(f=>f.k));
    const draftAtSend=this.state.draft;
    if(!await this.save(all,{base:this._draftRev===undefined?all.__dsbase:this._draftRev})) return;
    this._draftRev=undefined;
    this.setState(p=>({draft:p.draft===draftAtSend?null:p.draft,tick:(p.tick||0)+1}));
    this.bsToast("حُفظت أرقام "+s.day+" "+this.MONTHS[s.month-1],"ok");
  }

  /* ══════════ إكسل ══════════ */
  XCOLS(site){ return site==="haram"
    ? [["__site","الموقع"],["__hd","التاريخ الهجري"],["__gd","التاريخ الميلادي"],
       ["worshippers","المصلين"],["umrah","المعتمرين"],["hijr_ismail","حجر إسماعيل"],["carts","عربات المعاقين"]]
    : [["__site","الموقع"],["__hd","التاريخ الهجري"],["__gd","التاريخ الميلادي"],
       ["worshippers","المصلين"],["salam_corridor","ممر السلام"],
       ["rawdah_men_published","الروضة رجال منشور"],["rawdah_men_reserved","الروضة رجال محجوز"],["rawdah_men_actual","الروضة رجال فعلي"],
       ["rawdah_women_published","الروضة نساء منشور"],["rawdah_women_reserved","الروضة نساء محجوز"],["rawdah_women_actual","الروضة نساء فعلي"]]; }
  NRM(t){ return String(t==null?"":t)
    .replace(/[ـ‎‏]/g,"").replace(/[أإآٱ]/g,"ا")
    .replace(/ى/g,"ي").replace(/ة/g,"ه")
    .replace(/[^0-9A-Za-z؀-ۿ]/g,"").toLowerCase(); }
  DIG(t){ return String(t==null?"":t)
    .replace(/[٠-٩]/g,c=>String.fromCharCode(c.charCodeAt(0)-1632+48))
    .replace(/[۰-۹]/g,c=>String.fromCharCode(c.charCodeAt(0)-1776+48)); }
  NUMV(t){ if(t==null) return null;
    const x=this.DIG(t).replace(/[,\s٫٬،]/g,"").trim();
    if(x==="") return null; const n=Number(x); return isNaN(n)?null:n; }
  HD(t){ const x=this.DIG(t).trim(); if(!x) return null;
    let m=x.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})/); if(m) return {y:+m[1],m:+m[2],d:+m[3]};
    m=x.match(/^(\d{1,2})\D(\d{1,2})\D(\d{4})/);     if(m) return {y:+m[3],m:+m[2],d:+m[1]};
    m=x.match(/^(\d{1,2})\s+(\S+)\s+(\d{4})/);
    if(m){ const i=this.MONTHS.map(v=>this.NRM(v)).indexOf(this.NRM(m[2])); if(i>=0) return {y:+m[3],m:i+1,d:+m[1]}; }
    return null; }
  SITEOF(t){ const x=this.NRM(t); if(!x) return null;
    if(x.indexOf("حرام")>=0||x.indexOf("مكه")>=0||x==="haram") return "haram";
    if(x.indexOf("نبوي")>=0||x.indexOf("مدينه")>=0||x==="nabawi") return "nabawi";
    return null; }

  expXlsx(){
    const s=this.state, site=this.SITE(), cols=this.XCOLS(site), nd=this.dim(s.year,s.month);
    if(!this.PC("export",site)) return this.bsToast("التصديرُ يحتاج صلاحية التصدير","warn");
    const store=(this.load()[site])||{}, aoa=[cols.map(c=>c[1])];
    for(let d=1;d<=nd;d++){
      const r=store[this.dk(s.year,s.month,d)]||{}, g=this.gOf(s.year,s.month,d);
      aoa.push(cols.map(c=> c[0]==="__site" ? this.SN[site]
        : c[0]==="__hd" ? this.dk(s.year,s.month,d)
        : c[0]==="__gd" ? (g? this.iso(new Date(Date.UTC(g.getUTCFullYear(),g.getUTCMonth(),g.getUTCDate()))) : "")
        : (r[c[0]]==null ? "" : r[c[0]]) ));
    }
    try { KIVO.BassamXLSX.download(aoa, "الإحصائيات-"+this.SN[site]+"-"+this.MONTHS[s.month-1]+"-"+s.year+"هـ.xlsx"); }
    catch(e){ return this.bsToast("تعذّر تجهيز ملف Excel","err"); }
    this.bsToast("صُدِّر "+KIVO.BassamCount(nd,"يوم")+" — الأعمدةُ نفسُها تصلح للاستيراد","ok");
  }

  impXlsx(){
    const self=this, site=this.SITE();
    if(!this.PC("edit",site)&&!this.PC("add",site)) return this.bsToast("صلاحيتك على "+this.SN[site]+" عرضٌ فقط","warn");
    let inp;
    try { inp=document.createElement("input"); inp.type="file"; inp.accept=".xlsx"; inp.style.display="none"; document.body.appendChild(inp); }
    catch(e){ return this.bsToast("تعذّر فتح مُنتقي الملفات","err"); }
    inp.onchange=function(){
      const f=inp.files&&inp.files[0]; try { inp.remove(); } catch(e){}
      if(!f) return;
      const rd=new FileReader();
      rd.onerror=function(){ self.bsToast("تعذّرت قراءة الملف","err"); };
      rd.onload=function(){ try {
        const P=KIVO.BassamXLSX.parse(rd.result);
        Promise.resolve(P).then(rows=>self._impRows(rows||[], f.name))
          .catch(()=>self.bsToast("الملفُ ليس Excel صالحاً (.xlsx)","err"));
      } catch(e){ self.bsToast("الملفُ ليس Excel صالحاً (.xlsx)","err"); } };
      rd.readAsArrayBuffer(f);
    };
    inp.click();
  }

  _hmap(row){
    const self=this, known={}, add=(lbl,site,k)=>{ const c=self.NRM(lbl); (known[c]=known[c]||[]).push({site:site,k:k}); };
    ["haram","nabawi"].forEach(st=>{
      self.XCOLS(st).forEach(c=>{ if(c[0].slice(0,2)!=="__") add(c[1],st,c[0]); });
      self.F[st].forEach(f=>add(f.k,st,f.k)); });
    const dn=["التاريخالهجري","التاريخ","hijri","hijridate","date"].map(x=>self.NRM(x));
    const sn=["الموقع","المسجد","site","mosque"].map(x=>self.NRM(x));
    const m={ date:-1, site:-1, f:{haram:[],nabawi:[]} };
    for(let c=0;c<row.length;c++){
      const t=self.NRM(row[c]); if(!t) continue;
      if(m.date<0 && dn.indexOf(t)>=0){ m.date=c; continue; }
      if(m.site<0 && sn.indexOf(t)>=0){ m.site=c; continue; }
      const K=known[t]; if(K) K.forEach(x=>m.f[x.site].push({c:c,k:x.k}));
    }
    return m;
  }

  _impRows(rows,name){
    const self=this;
    if(!rows.length) return this.bsToast("الملفُ فارغ","warn");
    let hi=-1, map=null;
    for(let i=0;i<Math.min(6,rows.length);i++){ const m=this._hmap(rows[i]||[]);
      if(m.date>=0 && (m.f.haram.length||m.f.nabawi.length)){ hi=i; map=m; break; } }
    if(hi<0) return this.bsToast("لم أجد صفَّ العناوين — يلزم عمودٌ اسمُه «التاريخ الهجري» وعمودُ أرقامٍ واحدٌ على الأقل","err");
    const all=this.load(), out={}, per={haram:0,nabawi:0};
    let bad=0, blank=0, over=0, cells=0;
    /* R180: صفٌّ لا تملك فعلَه على ورقة مسجده يُترك ويُذكر سببُه — يومٌ جديدٌ إضافة، ويومٌ فيه أرقامٌ تعديل */
    const skNo={haram:0,nabawi:0}; let skAd=0, skEd=0;
    /* R181: والأقفالُ تُحترم كما في نموذج الإدخال — يومٌ في شهرٍ مقفلٍ (معتمدٍ أو منقضٍ لم يُفتح) أو يومٌ مقفلٌ يُترك ويُذكر */
    let skLm=0, skLd=0;
    for(let i=hi+1;i<rows.length;i++){
      const row=rows[i]||[]; if(!row.length) continue;
      const hd=this.HD(row[map.date]);
      if(!hd||hd.m<1||hd.m>12||hd.d<1||hd.d>30){ if(row.some(c=>String(c==null?"":c).trim()!=="")) bad++; continue; }
      const site=(map.site>=0 ? this.SITEOF(row[map.site]) : null) || this.SITE();
      const rec={}; let any=false, nc=0;
      map.f[site].forEach(p=>{ const v=this.NUMV(row[p.c]); if(v!=null){ rec[p.k]=v; any=true; nc++; } });
      if(!any){ blank++; continue; }
      const key=this.dk(hd.y,hd.m,hd.d), prev=(all[site]||{})[key], need=this.NEEDOF(site,prev);
      if(!this.PC("add",site)&&!this.PC("edit",site)){ skNo[site]++; continue; }
      if(!this.PC(need,site)){ if(need==="edit") skEd++; else skAd++; continue; }
      if(this.mLocked(site,hd.y,hd.m)){ skLm++; continue; }
      if(this.dayLocked(site,hd.y,hd.m,hd.d)){ skLd++; continue; }
      cells+=nc;
      if(need==="edit") over++;
      if(!out[site]) out[site]={};
      out[site][key]=rec;                       /* الدمجُ والبصمةُ عند الإقرار — على المخزن الحاضر وقتَها */
      per[site]++;
    }
    const n=per.haram+per.nabawi, nSk=skNo.haram+skNo.nabawi+skAd+skEd, nLk=skLm+skLd;
    if(!n&&nLk&&!nSk) return this.bsToast("أيامُ الملف كلُّها مقفلة — افتح الشهرَ بأثر رجعي أو اليومَ بنقرتين على كرته، ثم استورد","warn");
    if(!n&&nLk) return this.bsToast("لا صفَّ في الملف يمكن إدخالُه — بعضُه بلا صلاحيةٍ لك وبعضُه في أيامٍ مقفلة","warn");
    if(!n&&nSk) return this.bsToast("لا صفَّ في الملف تملك صلاحيةَ إدخاله — راجع مدير النظام إن احتجت ذلك","warn");
    if(!n) return this.bsToast("لم أجد صفّاً واحداً صالحاً — تحقّق من عمود التاريخ الهجري","warn");
    const parts=[KIVO.BassamCount(n,"يوم")+" ("+KIVO.BassamCount(cells,"قيمة")+")"];
    if(per.haram&&per.nabawi) parts.push("الحرم "+per.haram+" والنبوي "+per.nabawi);
    else parts.push("الموقع: "+this.SN[per.haram?"haram":"nabawi"]);
    if(over)  parts.push(KIVO.BassamCount(over,"يوم")+" "+KIVO.BassamCount.agr(over,"فيه","فيهما","فيها")+" أرقامٌ ستُستبدل");
    if(bad)   parts.push(KIVO.BassamCount(bad,"صف")+" "+KIVO.BassamCount.agr(bad,"تاريخُه غيرُ مقروءٍ فسيُترك","تاريخُهما غيرُ مقروءٍ فسيُتركان","تاريخُها غيرُ مقروءٍ فستُترك"));
    if(blank) parts.push(KIVO.BassamCount(blank,"صف")+" بلا أرقام");
    ["haram","nabawi"].forEach(k=>{ if(skNo[k]) parts.push(KIVO.BassamCount(skNo[k],"صف")+" لـ«"+this.SN[k]+"» "+KIVO.BassamCount.agr(skNo[k],"سيُترك — لا صلاحية لك على إدخاله","سيُتركان — لا صلاحية لك على إدخالهما","ستُترك — لا صلاحية لك على إدخالها")); });
    if(skEd)  parts.push(KIVO.BassamCount(skEd,"يوم")+" "+KIVO.BassamCount.agr(skEd,"فيه أرقامٌ سيُترك","فيهما أرقامٌ سيُتركان","فيها أرقامٌ ستُترك")+" — تعديلُها يحتاج صلاحية التعديل");
    if(skAd)  parts.push(KIVO.BassamCount(skAd,"يوم|جديد")+" "+KIVO.BassamCount.agr(skAd,"سيُترك — إضافتُه","سيُتركان — إضافتُهما","ستُترك — إضافتُها")+" تحتاج صلاحية الإضافة");
    if(skLm)  parts.push(KIVO.BassamCount(skLm,"يوم")+" في شهرٍ مقفلٍ "+KIVO.BassamCount.agr(skLm,"سيُترك","سيُتركان","ستُترك")+" — افتح الشهرَ بأثر رجعي من كرته أوّلاً");
    if(skLd)  parts.push(KIVO.BassamCount(skLd,"يوم|مقفل")+" "+KIVO.BassamCount.agr(skLd,"سيُترك — افتحه بنقرتين على كرته","سيُتركان — افتحهما بنقرتين على كرتيهما","ستُترك — افتحها بنقرتين على كروتها")+" أوّلاً");
    const ask = KIVO.bsConfirm ? KIVO.bsConfirm({ title:"استيراد أرقام من Excel",
      msg:"من «"+name+"»: "+parts.join(" · ")+". أتمضي؟", ok:"استورد", cancel:"إلغاء", info:!over, danger:!!over })
      : Promise.resolve(true);
    ask.then(async ok=>{ if(!ok) return;
      const cur=self.load(), stI=self.STAMP(true); let done=0;
      Object.keys(out).forEach(st=>{ if(!cur[st]) cur[st]={}; const keys=self.F[st].map(f=>f.k);
        Object.keys(out[st]).forEach(k=>{ const p=cur[st][k]||null;
          /* يومٌ صار فيه أرقامٌ منذ فُتحت النافذة يُحكم عليه من جديد — فلا يُرسَل ما يرفضه الخادم */
          if(!self.PC(self.NEEDOF(st,p),st)) return;
          /* R181: ويومٌ أُقفل (أو أُقفل شهرُه) منذ فُتحت النافذة لا يُمسّ */
          const y=+k.slice(0,4), m=+k.slice(5,7), d=+k.slice(8,10);
          if(self.mLocked(st,y,m)||self.dayLocked(st,y,m,d)) return;
          cur[st][k]=self._stamp(p, Object.assign({}, p||{}, out[st][k]), stI, keys); done++; }); });
      if(!done) return self.bsToast("لم يُستورد شيء — تغيّرت أقفالُ الأيام أو صلاحيتُك منذ المعاينة","warn");
      if(!await self.save(cur)) return self.bsToast("تعذّر الحفظ — المخزنُ ممتلئ","err");
      self.setState(p=>({draft:null,tick:(p.tick||0)+1}));
      self.bsToast("استُوردت أرقامُ "+KIVO.BassamCount(done,"يوم","g")+""+(done<n?" — وتُرك "+(n-done)+" تغيّر حالُه منذ المعاينة":""),"ok");
    });
  }

  COV(units,unitWord){
    const n=units.length, full=units.filter(u=>u.full2).length,
          part=units.filter(u=>u.days&&!u.full2).length, empty=units.filter(u=>!u.days).length;
    const P=(x)=>n?x/n*100:0;
    return [
      this.CROW(this.PCT(P(full)),  unitWord+"ٌ مكتمل", P(full),  full+" من "+n,  "var(--fg-x008450)", "كلُّ حقولِه مملوءة — أساسٌ صالحٌ للمقارنة بلا تحفّظ"),
      this.CROW(this.PCT(P(part)),  unitWord+"ٌ جزئيّ", P(part),  part+" من "+n,  "var(--fg-xb45309)", "بعضُ حقولِه فارغة — إجماليُّه أقلُّ من الحقيقة، فاقرأه بانتباه"),
      this.CROW(this.PCT(P(empty)), unitWord+"ٌ فارغ",  P(empty), empty+" من "+n, "var(--fg-x94a3b8)", "لا أرقامَ فيه إطلاقاً — لا يدخل في متوسّطٍ ولا ذروةٍ ولا قاع"),
      this.CROW(this.PCT(P(full+part)), "تغطيةُ الفترة", P(full+part), (full+part)+" من "+n, "var(--fg-xb99751)", "ما فيه أرقامٌ من الفترة كلِّها — وعليه وحدَه تُحسب كلُّ الأرقام أعلاه")
    ];
  }
  SEGBAR(items,total){ return items.map(x=>{ const p=total?x.v/total*100:0;
    return { w:"width:"+p.toFixed(2)+"%;background:"+x.c, c:x.c, n:x.n, v:this.NM(x.v), p:this.PCT(p),
      tip:x.n+" = "+this.NM(x.v)+" من "+this.NM(total)+" ("+this.PCT(p)+")" }; }); }
  DONUT(items,total){ const C=452.39; let acc=0;
    return items.map(x=>{ const f=total?x.v/total:0, dash=(f*C).toFixed(1)+" "+C.toFixed(1), off=(-acc*C).toFixed(1); acc+=f;
      return { c:x.c, dash:dash, off:off, n:x.n, v:this.NM(x.v), p:this.PCT(f*100),
        tip:x.n+" = "+this.NM(x.v)+" ("+this.PCT(f*100)+")" }; }); }

  /* ══════════ شريطُ التقويم المعتمد ══════════ */
  _barVals(site){
    const self=this, s=this.state, T=this.hToday(), custom=(s.anMode==="custom"), allY=(s.anY==="all");
    const years=this.YEARS();
    const V={};
    V.anYmBoxStyle=this.YMBOX(custom);
    V.anYear=allY?"all":String(s.anY);
    V.anYearOpts=[{v:"all",lbl:"كل السنوات"}].concat(years.map(y=>({v:String(y),lbl:y+" هـ"})));
    V.anSetYear=(e)=>{ const v=e&&e.target?e.target.value:""; self.setState({anY: v==="all"?"all":+v, anMode:null}); };
    V.anMonth=allY?"all":String(s.anM);
    V.anMonthOpts= allY ? [{v:"all",lbl:"كل الأشهر"}]
      : this.MONTHS.map((nm,i)=>({v:String(i+1),lbl:nm+" ("+String(i+1).padStart(2,"0")+")"})).concat([{v:"all",lbl:"كل أشهر السنة"}]);
    V.anSetMonth=(e)=>{ const v=e&&e.target?e.target.value:""; self.setState({anM:v, anMode:null}); };
    V.anModeOpts=[{ lbl:"نطاق مخصص", style:this.MODEBTN(custom),
      click:()=>{ const g=self.gOf(T.y,T.m,T.d)||new Date();
        self.setState({ anMode: custom?null:"custom",
          anFrom: s.anFrom || self.iso(new Date(g.getTime()-29*86400000)),
          anTo:   s.anTo   || self.iso(g) }); } }];
    V.anCustomOn=custom;
    V.anFrom=custom?s.anFrom:""; V.anTo=custom?s.anTo:"";
    V.anSetFrom=(e)=>self.setState({anFrom:e&&e.target?e.target.value:"", anMode:"custom"});
    V.anSetTo=(e)=>self.setState({anTo:e&&e.target?e.target.value:"", anMode:"custom"});
    V.anRangeHint="";
    if(custom && s.anFrom && s.anTo){ const a=new Date(s.anFrom+"T12:00:00"), b=new Date(s.anTo+"T12:00:00");
      if(!isNaN(a)&&!isNaN(b)) V.anRangeHint="= "+KIVO.BassamCount((Math.abs(Math.round((b-a)/86400000))+1),"يوم")+""; }
    return V;
  }
  _ticker(items){ const mk=t=>({ dot:"width:7px;height:7px;border-radius:2px;flex-shrink:0;background:"+t.dot,
    n:t.n, v:t.v, p:t.p||"", tip:t.tip||"" });
    return items.map(mk).concat(items.map(mk)); }

  /* ══════════ شاشةُ التحليل ══════════ */
  _an(solo){
    const self=this, s=this.state;
    const isTime = solo==="time", isCmp = solo==="cmp";
    const site = solo==="nabawi" ? "nabawi" : "haram";
    const A = Object.assign({ anIsTime:isTime, anBarOn:!isTime, anRawdah:false, anHeat:false,
      anBars:[], anChips:[], anKpis:[], anGrid:[], anBarsSvg:[], anSegs:[], anDots:[], anXLabels:[],
      anLegend:[], anCols:[], anRows:[], anSeg:[], anCalc:[], anDonut:[], anHeatCells:[], anHeroUnit:"زائراً",
      tcTypes:[], tcScopeOpts:[], tcMetricOpts:[], tcPickers:[],
      /* R188: سجلُّ آخر الشاشة قائمةٌ منسدلة — مكوّنُ «سجل الشهر» نفسُه، مطويّةٌ افتراضاً */
      anTblOpen:!!s.anTblOpen, anTblChev:"transition:transform .2s;flex-shrink:0;"+(s.anTblOpen?"transform:rotate(180deg)":""),
      anTblToggle:()=>self.setState(p=>({anTblOpen:!p.anTblOpen})), anTblCount:"" }, isTime ? {} : this._barVals(site));

    if(isTime) return this._anTime(A);

    const W=this.AUNITW(), per=this.APER();
    A.anPeriod=per; A.anPerLbl=per;

    if(isCmp){
      const uh=this.AUNITS("haram"), un=this.AUNITS("nabawi"), n=uh.length;
      const th=this.ST(uh.map(u=>u.tot)), tn=this.ST(un.map(u=>u.tot));
      const sum=th.total+tn.total, mx=Math.max(1,th.peak||0,tn.peak||0), rat=this.RT(tn.total,th.total);
      A.anPeriodTxt="الفترة: "+per+" · "+this.DAYW(Math.max(th.days,tn.days))+" · الحرم "+this.NM(th.total)+" · النبوي "+this.NM(tn.total);
      A.anTicker=this._ticker([{dot:this.DOT[0],n:"المسجد الحرام",v:this.NM(th.total),p:"("+this.PCT(sum?th.total/sum*100:null)+")"},
        {dot:this.DOT[1],n:"المسجد النبوي",v:this.NM(tn.total),p:"("+this.PCT(sum?tn.total/sum*100:null)+")"},
        {dot:this.DOT[2],n:"الفرق",v:this.NM(Math.abs(th.total-tn.total)),p:""},
        {dot:this.DOT[3],n:"النبوي ÷ الحرم",v:this.PCT(rat),p:""},
        {dot:this.DOT[4],n:W.al+" ببيانات",v:String(Math.max(th.days,tn.days)),p:"من "+n}]);
      A.anHeroTitle="مقارنة الحرمين";
      A.anHeroEq="إجمالي المسجد الحرام + إجمالي المسجد النبوي — "+per;
      A.anHeroTotal=this.NM(sum);
      A.anBars=[["haram",th],["nabawi",tn]].map(([k,t])=>{ const p=sum?t.total/sum*100:0;
        return { label:this.SN[k], value:this.NM(t.total), pct:this.PCT(p), vSt:this.HVST(p<25), b:this.HBAR(p),
          tip:this.SN[k]+" = "+this.NM(t.total)+" ("+this.PCT(p)+" من مجموع الحرمين) · "+t.days+" "+W.many+" ببيانات" }; });
      A.anChips=[{label:"المسجد الحرام",value:this.NM(th.total),tip:"إجماليُّ الحرم في "+per},
                 {label:"المسجد النبوي",value:this.NM(tn.total),tip:"إجماليُّ النبوي في "+per},
                 {label:"الفرق",value:this.NM(Math.abs(th.total-tn.total)),tip:"فرقُ الإجماليّين لصالح "+(th.total>=tn.total?this.SN.haram:this.SN.nabawi)},
                 {label:"النبوي ÷ الحرم",value:this.PCT(rat),tip:"نسبةُ إجمالي النبوي إلى إجمالي الحرم"}];
      A.anSegTitle="حصّةُ كلِّ مسجدٍ من مجموع الحرمين";
      const seg=[{n:this.SN.haram,v:th.total,c:this.SC.haram},{n:this.SN.nabawi,v:tn.total,c:this.SC.nabawi}];
      A.anSeg=this.SEGBAR(seg,sum);
      A.anDonut=this.DONUT(seg,sum);
      A.anDonutTitle="توزيع الحرمين"; A.anDonutSub="حصّةُ كلِّ مسجدٍ من المجموع";
      A.anDonutMid=this.PCT(sum?th.total/sum*100:null); A.anDonutCap="حصّةُ الحرم";
      const both=uh.filter((u,i)=>u.tot!=null&&un[i].tot!=null).length;
      const onlyH=uh.filter((u,i)=>u.tot!=null&&un[i].tot==null).length;
      const onlyN=uh.filter((u,i)=>u.tot==null&&un[i].tot!=null).length;
      const none=n-both-onlyH-onlyN, P=(x)=>n?x/n*100:0;
      A.anCalcSub="المقارنةُ لا تصحّ إلا حيث قيس الاثنان";
      A.anCalc=[ this.CROW(this.PCT(P(both)), W.one+"ٌ فيه الاثنان", P(both), both+" من "+n, "var(--fg-x008450)", "وحدَها تصلح للمقارنة المباشرة"),
                 this.CROW(this.PCT(P(onlyH)), "الحرمُ وحدَه", P(onlyH), onlyH+" من "+n, "var(--fg-xb99751)", "النبويُّ غيرُ مقيسٍ فيه — لا فرقَ يُحسب"),
                 this.CROW(this.PCT(P(onlyN)), "النبويُّ وحدَه", P(onlyN), onlyN+" من "+n, "var(--fg-x0e7490)", "الحرمُ غيرُ مقيسٍ فيه — لا فرقَ يُحسب"),
                 this.CROW(this.PCT(P(none)), W.one+"ٌ فارغ", P(none), none+" من "+n, "var(--fg-x94a3b8)", "لا أرقامَ لأيٍّ منهما") ];
      const dif=uh.map((u,i)=>(u.tot==null||un[i].tot==null)?null:Math.abs(u.tot-un[i].tot));
      const rts=uh.map((u,i)=>(!u.tot||un[i].tot==null)?null:un[i].tot/u.tot*100);
      const UD=uh.map(u=>u.num);
      A.anKpis=[ this.KPI(this.SN.haram,"إجمالي الحرم في "+per+" · "+th.days+" "+W.many+" ببيانات", uh.map(u=>u.tot), {dates:UD}),
                 this.KPI(this.SN.nabawi,"إجمالي النبوي في "+per+" · "+tn.days+" "+W.many+" ببيانات", un.map(u=>u.tot), {dates:UD}),
                 this.KPI("الفارق بين الحرمين","فرقٌ مطلقٌ لكلِّ "+W.one+" — والمعروضُ متوسّطُه", dif, {mode:"avg",dates:UD}),
                 this.KPI("النبوي من الحرم","نسبةُ النبوي إلى الحرم لكلِّ "+W.one+" — والمعروضُ متوسّطُها", rts, {mode:"avg",pct:true,dates:UD}) ];
      A.anGrid=this.GRID(mx);
      A.anChartTitle="الحرمان جنباً إلى جنب";
      A.anChartSub=per+" — "+(n<=13?"عمودان لكلِّ "+W.one:"خطٌّ لكلِّ مسجد");
      if(n<=13&&n>0){
        const bw=Math.min(17, 632/n*0.34);
        uh.forEach((u,i)=>{ const x=this.BX(i,n);
          if(u.tot!=null){ const yy=this.YV(u.tot,mx); A.anBarsSvg.push({x:(x+1.5).toFixed(1),y:yy.toFixed(1),w:bw.toFixed(1),h:Math.max(1,this.CH1-yy).toFixed(1),c:this.SC.haram,t:this.SN.haram+" · "+u.full+" · "+this.NM(u.tot)}); }
          const v2=un[i].tot; if(v2!=null){ const yy=this.YV(v2,mx); A.anBarsSvg.push({x:(x-bw-1.5).toFixed(1),y:yy.toFixed(1),w:bw.toFixed(1),h:Math.max(1,this.CH1-yy).toFixed(1),c:this.SC.nabawi,t:this.SN.nabawi+" · "+un[i].full+" · "+this.NM(v2)}); } });
        A.anXLabels=this.XLAB(uh,(i,nn)=>this.BX(i,nn));
      } else {
        const g1=this.SEGS(uh.map(u=>u.tot),mx,this.SC.haram);
        const g2=this.SEGS(un.map(u=>u.tot),mx,this.SC.nabawi);
        A.anSegs=g1.concat(g2); A.anDots=(g1.solo||[]).concat(g2.solo||[]);
        A.anXLabels=this.XLAB(uh,(i,nn)=>this.LX(i,nn));
      }
      A.anLegend=[{c:this.SC.haram,t:this.SN.haram},{c:this.SC.nabawi,t:this.SN.nabawi}];
      A.anTblTitle="سجلُّ المقارنة"; A.anTblSub=per+" — "+W.al+" التي فيها أرقامٌ لأحد الحرمين";
      A.anCols=[this.TH(W.one,"date"), this.TH("المسجد الحرام","mosque"), this.TH("المسجد النبوي","mosque"), this.TH("الفرق","diff"), this.TH("النبوي ÷ الحرم","pie")];
      A.anRows=uh.map((u,i)=>{ const a=u.tot, b=un[i].tot;
        const d=(a==null||b==null)?null:a-b, r=this.RT(b,a);
        return { keep:(a!=null||b!=null), trStyle:"border-bottom:1px solid var(--bd-xf1f1f1)",
          cells:[ this.TD(u.num,{rtl:true,w:600,nowrap:true}),
            this.TDN(a,{w:700,c:"var(--fg-x8a6f35)",fs:"12.5px"}),
            this.TDN(b,{w:700,c:"var(--fg-x0e7490)",fs:"12.5px"}),
            this.TD(this.SNM(d),{faint:d==null}),
            this.TD(this.PCT(r),{faint:r==null}) ] }; }).filter(r=>r.keep);
      A.anTblCount=this.ATBLC(A.anRows.length,uh.length,W);
      A.anNote="الفرقُ موجبٌ حين يزيد الحرمُ على النبويّ. و«النبوي ÷ الحرم» تُحسب لكلِّ "+W.one+" على حدة ثمّ يُعرض متوسّطُها — لا نسبةَ الإجماليّين، كيلا يطغى "+W.one+"ٌ واحدٌ ضخمٌ على الصورة.";
      return A;
    }

    /* ── تحليلُ مسجدٍ واحد ── */
    const units=this.AUNITS(site), n=units.length, tots=units.map(u=>u.tot), st=this.ST(tots);
    const mx=Math.max(1, st.peak||0), dataN=units.filter(u=>u.tot!=null).length;
    const comps=this.COMPS(site);
    const cs=comps.map((c,i)=>({ l:c.l, d:c.d, k:c.k, i:c.i, c:this.CC[i%this.CC.length], dot:this.DOT[i%this.DOT.length],
      s:this.ST(units.map(u=>this.VOF(u.rec,c.k))) }));
    A.anRawdah = site==="nabawi";
    A.anPeriodTxt="الفترة: "+per+" · "+this.DAYW(dataN)+" من "+n+" · الإجمالي "+this.NM(st.total);
    A.anTicker=this._ticker(cs.map(c=>({dot:c.dot,n:c.l,v:this.NM(c.s.total),p:"("+this.PCT(st.total?c.s.total/st.total*100:null)+")"}))
      .concat([{dot:"#047857",n:"المتوسط",v:this.NM(st.avg==null?null:Math.round(st.avg)),p:""},
               {dot:"#7b8a94",n:W.al+" ببيانات",v:String(dataN),p:"من "+n}]));
    A.anHeroTitle="تحليل "+this.SN[site];
    A.anHeroEq=(site==="haram"?"المصلين + المعتمرين + العربات + حجر إسماعيل":"المصلين + ممر السلام + زائري الروضة")+" — "+per;
    A.anHeroTotal=this.NM(st.total);
    A.anBars=cs.map(c=>{ const p=st.total?c.s.total/st.total*100:0;
      return { label:c.l, value:this.NM(c.s.total), pct:this.PCT(p), vSt:this.HVST(p<10), b:this.HBAR(p),
        tip:c.d+" = "+this.NM(c.s.total)+" ("+this.PCT(p)+" من الإجمالي) · "+c.s.days+" "+W.many+" ببيانات" }; });
    A.anChips=[{label:"أعلى "+W.one,value:this.NM(st.peak),tip:"أعلى إجماليٍّ قيس في الفترة"},
               {label:"أدنى "+W.one,value:this.NM(st.low),tip:"أدنى إجماليٍّ موجبٍ قيس — الفارغُ لا يُعدّ قاعاً"},
               {label:"متوسط ال"+W.one,value:this.NM(st.avg==null?null:Math.round(st.avg)),tip:"الإجمالي ÷ "+dataN+" — ما قيس لا ما مضى"},
               {label:W.al+" ببيانات",value:String(dataN)+" من "+n,tip:"عددُ الوحدات التي فيها رقمٌ واحدٌ على الأقل"}];
    A.anSegTitle="حصّةُ كلِّ مكوّنٍ من الإجمالي";
    const segs=cs.map(c=>({n:c.l,v:c.s.total,c:c.c}));
    A.anSeg=this.SEGBAR(segs,st.total);
    A.anDonut=this.DONUT(segs,st.total);
    A.anDonutTitle="توزيع عناصر "+this.SN[site];
    A.anDonutSub="حصّةُ كلِّ مكوّنٍ من الإجمالي للفترة";
    A.anDonutMid=this.PCT(st.total?cs[0].s.total/st.total*100:null); A.anDonutCap=cs[0].l;
    A.anCalcSub=dataN+" من "+n+" "+W.many;
    A.anCalc=this.COV(units,W.one);
    A.anKpis=cs.map(c=>this.KPI(c.l, c.d+" · "+c.s.days+" "+W.many+" ببيانات", units.map(u=>this.VOF(u.rec,c.k)), {dates:units.map(u=>u.num)}));
    A.anGrid=this.GRID(mx);
    A.anChartTitle="الإجماليُّ لكلِّ "+W.one;
    A.anChartSub=per+" — الذروةُ خضراءُ والقاعُ أحمر";
    const bw=Math.min(34, 632/Math.max(1,n)*0.66);
    units.forEach((u,i)=>{ if(u.tot==null) return; const yy=this.YV(u.tot,mx);
      A.anBarsSvg.push({ x:(this.BX(i,n)-bw/2).toFixed(1), y:yy.toFixed(1), w:bw.toFixed(1), h:Math.max(1,this.CH1-yy).toFixed(1),
        t:u.full+" · "+this.NM(u.tot),
        c: u.tot===st.peak ? "var(--bg-x008450)" : (st.low!=null&&u.tot===st.low ? "var(--bg-xdc2626)" : this.SC[site]) }); });
    A.anXLabels=this.XLAB(units,(i,nn)=>this.BX(i,nn));
    A.anLegend=[{c:"var(--bg-x008450)",t:"الذروة"},{c:"var(--bg-xdc2626)",t:"القاع"},{c:this.SC[site],t:this.SN[site]}];
    A.anTblTitle="سجلُّ "+per; A.anTblSub=W.al+" التي فيها أرقامٌ — "+dataN+" من "+n;
    A.anCols=[this.TH(W.one,"date")].concat(cs.map(c=>this.TH(c.l,c.i)))
      .concat([this.TH("الإجمالي","sum"), this.TH("الحصة من الفترة","pie")]);
    A.anRows=units.filter(u=>u.tot!=null).map(u=>({ trStyle:"border-bottom:1px solid var(--bd-xf1f1f1)",
      cells:[this.TD(u.num,{rtl:true,w:600,nowrap:true})]
      .concat(cs.map(c=>this.TDN(this.VOF(u.rec,c.k))))
      .concat([this.TD(this.NM(u.tot),{w:700,c:"var(--fg-x8a6f35)",fs:"12.5px"}),
               this.TD(this.PCT(st.total?u.tot/st.total*100:null))]) }));
    A.anTblCount=this.ATBLC(dataN,n,W);
    A.anNote="الذروةُ والقاعُ من "+W.al+" التي فيها أرقامٌ فقط؛ و"+W.al+" الفارغةُ لا عمودَ لها ولا تُحسب في المتوسّط — فالمتوسّطُ متوسّطُ ما قيس لا ما مضى.";
    if(site==="nabawi") A.rawdahBoxes=this._rawdah(units);
    /* R176 — كروتُ موقع الإحصائيات حرفاً بحرف، والمؤشرُ القياديّ بتصميم «مؤشرات المصليات» */
    A.anZn=true; A.anOld=false;
    const zd=this.ADAYS(site);
    this._zHero(site,zd,A); this._zTrend(site,zd,A); this._zDonut(site,zd,A); this._zHeat(site,zd,A);
    return A;
  }

  _rawdah(units){
    const cellSt="text-align:center;border-radius:10px;padding:7px 3px;background:var(--bg-xffffff);border:1px solid var(--bd-xf2eee4)";
    const cellHi="text-align:center;border-radius:10px;padding:7px 3px;background:var(--bg-a185151810p1);border:1px solid var(--bd-a185151810p25)";
    return [["rawdah_men","الروضة الشريفة — رجال"],["rawdah_women","الروضة الشريفة — نساء"]].map(([pre,title])=>{
      const pub=this.ST(units.map(u=>u.rec[pre+"_published"])).total,
            res=this.ST(units.map(u=>u.rec[pre+"_reserved"])).total,
            act=this.ST(units.map(u=>u.rec[pre+"_actual"])).total;
      const f=v=>v==null?["—","var(--fg-x8b8676)"]:(v>100?["تجاوز 100٪","var(--fg-xdc2626)"]:[Math.round(v)+"٪","var(--fg-x141414)"]);
      const a1=f(this.RT(res,pub)), a2=f(this.RT(act,res)), a3=f(this.RT(act,pub));
      return { title:title,
        trio:[{k:"منشور",v:this.NM(pub),c:"var(--fg-x141414)",st:cellSt},{k:"محجوز",v:this.NM(res),c:"var(--fg-x141414)",st:cellSt},{k:"فعلي",v:this.NM(act),c:"var(--fg-xb99751)",st:cellHi}],
        rates:[{k:"محجوز/منشور",v:a1[0],c:a1[1],st:cellSt},{k:"فعلي/محجوز",v:a2[0],c:a2[1],st:cellSt},{k:"فعلي/منشور",v:a3[0],c:a3[1],st:cellSt}] }; });
  }

  /* ══════════ R176 — كروتُ موقع الإحصائيات حرفاً بحرف + المؤشرُ القياديّ بتصميم «مؤشرات المصليات» ══════════
     «مراقبة الاتجاه» و«توزيع العناصر» و«خرائط الكثافة» منقولةٌ من مصدر الموقع نفسِه
     (HaramAnalysis · NabawiAnalysis · AnalyticsDistributionDonut · AnalyticsDensityHeatmap)
     ومقيسةٌ على رسمه الفعليّ في recharts 3.6: المحاورُ والمنحنى والقطاعاتُ بالبكسل، والصيغُ كما هي.
     و«المؤشر القيادي» بتصميم «مؤشرات المصليات» في المنصة: اللوحةُ والكبسولاتُ والحلقةُ والجدولُ والعدّادات. */
  ZMET = {
    haram:[
      {k:"qaasideen",  l:"إجمالي القاصدين", s:"القاصدون", ic:"crown",  c:"hsl(38 41% 67%)"},
      {k:"worshippers",l:"المصلين",          s:"مصلين",    ic:"users",  c:"var(--bg-xb99751)"},
      {k:"umrah",      l:"المعتمرين",        s:"معتمرين",  ic:"spark",  c:"hsl(38 41% 38%)"},
      {k:"carts",      l:"العربات",           s:"عربات",    ic:"access", c:"hsl(38 41% 26%)"},
      {k:"hijr_ismail",l:"حجر إسماعيل",      s:"الحجر",    ic:"bldg",   c:"hsl(38 41% 45%)"} ],
    nabawi:[
      {k:"total",              l:"إجمالي المسجد النبوي", s:"الإجمالي",   ic:"crown",   c:"hsl(38 41% 52%)"},
      {k:"worshippers",        l:"المصلين",               s:"مصلين",      ic:"users",   c:"var(--bg-xb99751)"},
      {k:"salam_corridor",     l:"ممر السلام",             s:"ممر السلام", ic:"compass", c:"hsl(38 41% 38%)"},
      {k:"rawdah_visitors",    l:"زائري الروضة",          s:"الروضة",     ic:"book",    c:"hsl(38 41% 45%)"},
      {k:"rawdah_men_actual",  l:"الروضة رجال فعلي",      s:"روضة رجال",  ic:"book",    c:"hsl(38 41% 28%)"},
      {k:"rawdah_women_actual",l:"الروضة نساء فعلي",      s:"روضة نساء",  ic:"book",    c:"hsl(38 41% 72%)"} ] };
  /* مكوّناتُ «التوزيع» و«خرائط الكثافة» — بأسماء الموقع وألوانه */
  ZDN = {
    haram:[["worshippers","المصلين","var(--bg-xb99751)"],["umrah","المعتمرين","hsl(38 41% 38%)"],["carts","العربات","hsl(38 41% 26%)"],["hijr_ismail","حجر إسماعيل","hsl(38 41% 45%)"]],
    nabawi:[["worshippers","المصلين","var(--bg-xb99751)"],["salam_corridor","ممر السلام","hsl(38 41% 38%)"],["rawdah_visitors","زائري الروضة","hsl(38 41% 45%)"]] };
  /* أيقوناتُ lucide-react 0.507 التي يستعملها الموقع، وأيقوناتُ «مؤشرات المصليات» — مساراتٌ حرفيّة
     (الدائرةُ والمستطيلُ والخطُّ المتكسّر كُتبت مسارات بالهندسة نفسها) */
  ZIC = {
    crown:  ["M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z","M5 21h14"],
    users:  ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M16 3.128a4 4 0 0 1 0 7.744","M22 21v-2a4 4 0 0 0-3-3.87","M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"],
    spark:  ["M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z","M20 3v4","M22 5h-4","M4 17v2","M5 18H3"],
    access: ["M15 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0","m18 19 1-7-6 1","m5 8 3-3 5.5 3-2.36 3.5","M4.24 14.5a5 5 0 0 0 6.88 6","M13.76 17.5a5 5 0 0 0-6.88-6"],
    bldg:   ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z","M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2","M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2","M10 6h4","M10 10h4","M10 14h4","M10 18h4"],
    compass:["m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z","M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"],
    book:   ["M12 7v14","M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"],
    act:    ["M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"],
    layers: ["M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z","M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12","M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"],
    up:     ["M22 7 13.5 15.5 8.5 10.5 2 17","M16 7 22 7 22 13"],
    down:   ["M22 17 13.5 8.5 8.5 13.5 2 7","M16 17 22 17 22 11"],
    hact:   ["M22 12h-4l-3 9L9 3l-3 9H2"],
    hup:    ["m3 17 6-6 4 4 8-8","M17 7h4v4"],
    hdown:  ["m3 7 6 6 4-4 8 8","M17 17h4v-4"] };
  WDAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  ZI(k){ return (this.ZIC[k]||[]).map(d=>({d:d})); }
  /* صيغُ الأرقام كما في الموقع: fmt · fmtCompact · fmtSmart · fmtPct (ar-EG حيث يستعملها) */
  ZF(n){ return (n==null||!isFinite(n))?"—":Math.round(n).toLocaleString("ar-EG"); }
  ZFC(n,dash){ if(n==null||!isFinite(n)) return dash?"—":""; const a=Math.abs(n);
    if(a>=1e6) return "\u2067"+(n/1e6).toFixed(1)+" مليون\u2069"; if(a>=1e3) return "\u2067"+(n/1e3).toFixed(0)+" ألف\u2069";
    return Math.round(n).toLocaleString("ar-EG"); }
  ZFS(n,lg){ if(n==null||!isFinite(n)) return "—"; const a=Math.abs(n);
    if(a>=1e6) return "\u2067"+(n/1e6).toFixed(1)+" مليون\u2069";
    if(a>=1e3) return "\u2067"+(n/1e3).toFixed(0)+" ألف\u2069";
    return Math.round(n).toLocaleString("ar-EG"); }
  ZFP(p){ return (p==null||!isFinite(p))?"—":"٪"+Math.round(p); }
  ZV(site,r,k){ if(!r) return null; if(k==="qaasideen"||k==="total") return this.TOT(site,r);
    if(k==="rawdah_visitors") return this.VOF(r,"__r"); return this.VOF(r,k); }
  /* عرضُ النصّ بالبكسل — كما يقيسه recharts قبل أن يقرّر أيَّ تسميةٍ يُظهر */
  ZTW(t,fs,wt){ t=String(t); const c=this.__tw||(this.__tw={}), k=(wt||400)+"|"+fs+"|"+t;
    if(c[k]!=null) return c[k];
    let w=t.length*fs*0.56, ok=false;
    try { const cv=this.__cv||(this.__cv=document.createElement("canvas")), x=cv.getContext("2d");
      x.font=(wt||400)+" "+fs+"px Cairo"; const m=x.measureText(t).width;
      if(m>0){ w=m; ok=!document.fonts||!document.fonts.check||document.fonts.check(x.font); } } catch(e){}
    if(ok) c[k]=w; return w; }
  /* recharts getNiceTickValues([0,max], 5) — خطوةٌ «لطيفة» تغطّي الذروة بخمس علامات */
  ZNICE(mx){ const cnt=5; if(!(mx>0)) return [0,1,2,3,4];
    const dig=v=>Math.floor(Math.log10(Math.abs(v)))+1;
    const fstep=(rough,cf)=>{ const dc=dig(rough), dv=Math.pow(10,dc), sr=rough/dv, sc=dc!==1?0.05:0.1;
      return +((Math.ceil(+(sr/sc).toFixed(9))+cf)*sc*dv).toPrecision(12); };
    let cf=0, step=0, up=0;
    for(let g=0;g<60;g++){ step=fstep(mx/(cnt-1),cf); up=Math.ceil(+(mx/step).toFixed(9)); const sc=up+1;
      if(sc>cnt){ cf++; continue; } if(sc<cnt) up+=cnt-sc; break; }
    const out=[]; for(let i=0;i<=up;i++) out.push(+(i*step).toPrecision(12)); return out; }
  /* تسمياتُ المحور الأفقي — getTicksStart/getTicksEnd من recharts حرفاً */
  ZTKS(co,sz,start,end,gap,mode){ const n=co.length, show=new Array(n).fill(false), tc=co.slice();
    const vis=(p,s,a,b)=>!(p<a||p>b)&&(p-s/2-a>=0)&&(p+s/2-b<=0);
    if(mode==="pe"){ let e=end;
      for(let i=n-1;i>=0;i--){ let c=co[i]; if(i===n-1){ const g=c+sz[i]/2-e; if(g>0) c-=g; }
        tc[i]=c; if(vis(c,sz[i],start,e)){ e=c-(sz[i]/2+gap); show[i]=true; } }
      return {show:show, tc:tc}; }
    let s=start, e=end;
    if(n){ const i=n-1; let c=co[i]; const g=c+sz[i]/2-e; if(g>0) c-=g; tc[i]=c;
      if(vis(c,sz[i],s,e)){ e=c-(sz[i]/2+gap); show[i]=true; } }
    for(let i=0;i<n-1;i++){ let c=co[i]; if(i===0){ const g=c-sz[i]/2-s; if(g<0) c-=g; }
      tc[i]=c; if(vis(c,sz[i],s,e)){ s=c+(sz[i]/2+gap); show[i]=true; } }
    return {show:show, tc:tc}; }
  /* المنحنى: d3-shape curveMonotoneX حرفاً — ما يرسمه recharts لـ type="monotone" بثلاثة أرقامٍ عشرية */
  ZMONO(P){ const r3=v=>String(Math.round(v*1000)/1000);
    let d="", x0=NaN, y0=NaN, x1=NaN, y1=NaN, t0=NaN, pt=0;
    const sg=v=>v<0?-1:1;
    const s3=(x2,y2)=>{ const h0=x1-x0, h1=x2-x1, s0=(y1-y0)/(h0||(h1<0&&-0)), s1=(y2-y1)/(h1||(h0<0&&-0)), p=(s0*h1+s1*h0)/(h0+h1);
      return (sg(s0)+sg(s1))*Math.min(Math.abs(s0),Math.abs(s1),0.5*Math.abs(p))||0; };
    const s2=t=>{ const h=x1-x0; return h?(3*(y1-y0)/h-t)/2:t; };
    const bz=(ta,tb)=>{ const dx=(x1-x0)/3; d+="C"+r3(x0+dx)+","+r3(y0+dx*ta)+","+r3(x1-dx)+","+r3(y1-dx*tb)+","+r3(x1)+","+r3(y1); };
    for(let i=0;i<P.length;i++){ const x=P[i][0], y=P[i][1]; let t1=NaN;
      if(x===x1&&y===y1) continue;
      if(pt===0){ pt=1; d+="M"+r3(x)+","+r3(y); }
      else if(pt===1){ pt=2; }
      else if(pt===2){ pt=3; t1=s3(x,y); bz(s2(t1),t1); }
      else { t1=s3(x,y); bz(t0,t1); }
      x0=x1; x1=x; y0=y1; y1=y; t0=t1; }
    if(pt===2) d+="L"+r3(x1)+","+r3(y1); else if(pt===3) bz(t0,s2(t0));
    return d; }
  /* مستطيلُ recharts بزوايا [8,8,0,0] */
  ZRECT(x,y,w,h,r){ const f=v=>String(Math.round(v*10000)/10000), rr=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
    if(!(rr>0)) return "M"+f(x)+","+f(y)+"L "+f(x+w)+","+f(y)+"L "+f(x+w)+","+f(y+h)+"L "+f(x)+","+f(y+h)+"Z";
    return "M"+f(x)+","+f(y+rr)+"A "+f(rr)+","+f(rr)+",0,0,1,"+f(x+rr)+","+f(y)+"L "+f(x+w-rr)+","+f(y)+"A "+f(rr)+","+f(rr)+",0,0,1,"+f(x+w)+","+f(y+rr)
      +"L "+f(x+w)+","+f(y+h)+"L "+f(x)+","+f(y+h)+"Z"; }

  /* سجلّاتُ الأيام داخل فترة التحليل — ما يجلبه الموقع من /daily-stats للفترة نفسِها */
  ADAYS(site){ const s=this.state, store=(this.load()[site])||{}, flds=this.F[site], out=[];
    const add=(y,m,d)=>{ const k=this.dk(y,m,d), r=store[k]; if(!r||!flds.some(f=>r[f.k]!=null&&r[f.k]!=="")) return; out.push({y:y,m:m,d:d,k:k,rec:r}); };
    if(s.anMode==="custom" && s.anFrom && s.anTo){ this.PDAYS().forEach(x=>add(x.y,x.m,x.d)); return out; }
    const ys = s.anY==="all" ? this.YEARS().slice().sort((a,b)=>a-b) : [s.anY];
    ys.forEach(y=>{ const ms=(s.anY==="all"||s.anM==="all")?[1,2,3,4,5,6,7,8,9,10,11,12]:[+s.anM];
      ms.forEach(m=>{ const nd=this.dim(y,m); for(let d=1;d<=nd;d++) add(y,m,d); }); });
    return out; }
  /* أيّامُ الفترة كلُّها (مسجّلةً أو فارغة) بيوم الأسبوع وهل انقضت — للتغطية وأيّام الأسبوع */
  PDAYS(){ const s=this.state, T=this.hToday(), tk=T.y*10000+T.m*100+T.d, ck=this.__pd||(this.__pd={});
    let a=null, b=null, key="";
    if(s.anMode==="custom" && s.anFrom && s.anTo){ a=new Date(s.anFrom+"T12:00:00"); b=new Date(s.anTo+"T12:00:00");
      if(isNaN(a)||isNaN(b)) return []; if(a>b){ const t=a; a=b; b=t; } key="c|"+s.anFrom+"|"+s.anTo; }
    else if(s.anY==="all"){ const ys=this.YEARS(), y0=Math.min.apply(null,ys), y1=Math.max.apply(null,ys);
      a=this.gOf(y0,1,1); b=this.gOf(y1,12,this.dim(y1,12)); key="a|"+y0+"|"+y1; }
    else if(s.anM==="all"){ a=this.gOf(s.anY,1,1); b=this.gOf(s.anY,12,this.dim(s.anY,12)); key="y|"+s.anY; }
    else { const m=+s.anM; a=this.gOf(s.anY,m,1); b=this.gOf(s.anY,m,this.dim(s.anY,m)); key="m|"+s.anY+"|"+m; }
    key+="|"+tk; if(ck.k===key) return ck.v;
    const out=[]; if(!a||!b) return out;
    const n=Math.min(4000, Math.round((b-a)/86400000)+1);
    for(let i=0;i<n;i++){ const g=new Date(a.getTime()+i*86400000), o=this.hOfDate(g);
      out.push({ y:o.year, m:o.month, d:o.day, k:this.dk(o.year,o.month,o.day), wd:g.getDay(), past:(o.year*10000+o.month*100+o.day)<=tk }); }
    ck.k=key; ck.v=out; return out; }
  /* metricStats من الموقع: الإجمالي والمتوسط (÷ ما قيس) والذروة والأدنى الموجب بتاريخيهما */
  ZST(days,site,k){ let tot=0, n=0, pk=null, lo=null;
    days.forEach(x=>{ const v=this.ZV(site,x.rec,k); if(v==null) return; tot+=v; n++;
      if(pk===null||v>pk.v) pk={v:v,date:x.k}; if(v>0&&(lo===null||v<lo.v)) lo={v:v,date:x.k}; });
    return { total:tot, avg:n?tot/n:0, peak:pk, low:lo, n:n }; }
  ZMODE(){ const s=this.state; if(s.anMode==="custom"&&s.anFrom&&s.anTo) return "c";
    return s.anY==="all" ? "a" : (s.anM==="all" ? "y" : "m"); }

  /* ── ١) مراقبةُ الاتجاه ── */
  _zTrend(site,days,A){
    const s=this.state, self=this, mets=this.ZMET[site], SK=site==="haram"?"anMetH":"anMetN", md=this.ZMODE();
    let mk=s[SK]; if(!mets.some(m=>m.k===mk)) mk=mets[0].k;
    const M=mets.find(m=>m.k===mk), daily=(md==="m"||md==="c");
    A.trTitle="مراقبة الاتجاه — "+M.l;
    A.trSub=(daily?"إجمالي يومي":md==="y"?"إجمالي شهري":"إجمالي سنوي")+" · علامات الذروة والقاع تظهر تلقائيًا";
    A.trPills=mets.map(m=>{ const on=m.k===mk;
      return { lbl:m.s, ic:self.ZI(m.ic), on:on?"1":"0",
        st:on?"color:var(--text-on-fill);background:linear-gradient(135deg,hsl(38 41% 67%),var(--bg-xb99751));border-color:var(--bd-xb99751);box-shadow:0 4px 16px -4px rgba(185,151,81,.55)":"",
        click:()=>{ if(!on) self.setState({[SK]:m.k}); } }; });
    const st=this.ZST(days,site,mk);
    const tile=(lbl,v,c,ic,sub)=>({ lbl:lbl, vl:self.ZFS(v,true), vs:self.ZFS(v,false), vSt:"color:"+c, icSt:"color:"+c,
      ic:self.ZI(ic), sub:sub||"", hasSub:!!sub });
    A.trTiles=[ tile("الإجمالي",st.total,M.c,"layers"), tile("المتوسط",st.avg,"var(--fg-x53565a)","act"),
      tile("الذروة",st.peak?st.peak.v:null,"#008547","up",st.peak?st.peak.date:""),
      tile("الأدنى",st.low?st.low.v:null,"#AE2929","down",st.low?st.low.date:"") ];
    /* السلسلة: يوميّةٌ = سجلّاتُ الفترة كما يعيدها الخادم؛ شهريّةٌ = اثنا عشر شهراً؛ سنويّةٌ = السنواتُ المسجّلة */
    let pts=[];
    if(daily) pts=days.map(x=>({ x:String(x.d).padStart(2,"0"), full:x.k, v:self.ZV(site,x.rec,mk) }));
    else if(md==="y"){ for(let m=1;m<=12;m++){ let sum=0, has=false;
        days.forEach(x=>{ if(x.m!==m) return; const v=self.ZV(site,x.rec,mk); if(v!=null){ sum+=v; has=true; } });
        pts.push({ x:self.MONTHS[m-1], full:s.anY+"-"+String(m).padStart(2,"0"), v:has?sum:null }); } }
    else this.YEARS().slice().sort((a,b)=>a-b).forEach(y=>{ let sum=0, has=false;
        days.forEach(x=>{ if(x.y!==y) return; const v=self.ZV(site,x.rec,mk); if(v!=null){ sum+=v; has=true; } });
        pts.push({ x:String(y), full:String(y), v:has?sum:null }); });
    A.trHas=pts.length>0; A.trEmpty=!A.trHas; A.trC=M.c;
    /* الهندسةُ بالبكسل كما في ResponsiveContainer: هامشٌ 10/8/0/8 · محورٌ أيمن 60 · محورٌ سفليّ 30 · ارتفاعٌ 288 */
    const W=Math.max(160,Math.round(s.dzW||431)), X0=8, X1=W-68, Y0=10, Y1=258, HH=Y1-Y0;
    const vals=pts.map(p=>p.v).filter(v=>v!=null), dmax=vals.length?Math.max.apply(null,vals):0;
    const tk=this.ZNICE(dmax), top=tk[tk.length-1]||1, yOf=v=>Y1-(v/top)*HH;
    const r3=v=>String(Math.round(v*1000)/1000);
    A.trVB="0 0 "+W+" 288"; A.trX2=String(X1);
    A.trGrid=tk.map(t=>({ y:r3(yOf(t)) }));
    A.trYT=tk.map(t=>({ t:self.ZFC(t,true), st:"left:"+(X1+8)+"px;top:"+(yOf(t)-10.3).toFixed(2)+"px" }));
    const n=pts.length, bars=!daily, band=(X1-X0)/Math.max(1,n);
    const xs=pts.map((p,i)=>bars?X0+(i+0.5)*band:(n>1?X0+i*(X1-X0)/(n-1):(X0+X1)/2));
    const tks=this.ZTKS(xs, pts.map(p=>self.ZTW(p.x,11)), 0, W, 5, bars?"pe":"pse");
    A.trXT=pts.map((p,i)=>tks.show[i]?{ t:p.x, st:"left:"+tks.tc[i].toFixed(2)+"px" }:null).filter(Boolean);
    A.trArea=""; A.trLine=""; A.trBars=[]; A.trDots=[];
    if(!bars){ let seg=[];
      const flush=()=>{ if(seg.length>1){ const c=self.ZMONO(seg);
          A.trLine+=c; A.trArea+=c+"L"+r3(seg[seg.length-1][0])+","+Y1+"L"+r3(seg[0][0])+","+Y1+"Z"; } seg=[]; };
      pts.forEach((p,i)=>{ if(p.v==null) flush(); else seg.push([xs[i],yOf(p.v)]); }); flush();
      const at=dt=>pts.findIndex(p=>p.full===dt);
      if(st.peak){ const i=at(st.peak.date); if(i>=0) A.trDots.push({ x:r3(xs[i]), y:r3(yOf(st.peak.v)), c:"#008547" }); }
      if(st.low){ const i=at(st.low.date); if(i>=0) A.trDots.push({ x:r3(xs[i]), y:r3(yOf(st.low.v)), c:"#AE2929" }); }
    } else { const bw=band*0.8>1?Math.floor(band*0.8):band*0.8;
      pts.forEach((p,i)=>{ if(p.v==null) return; const y=yOf(p.v); A.trBars.push({ d:self.ZRECT(X0+i*band+band*0.1,y,bw,Y1-y,8) }); }); }
    /* التلميح: عمودٌ لكلِّ نقطةٍ يُظهر المؤشّرَ والنقطةَ النشطةَ والبطاقة — بـ CSS وحدَه، بلا إعادة رسم */
    A.trHov=pts.map((p,i)=>{ let L, R;
      if(bars){ L=X0+i*band; R=L+band; } else { L=i?(xs[i-1]+xs[i])/2:X0; R=i<n-1?(xs[i]+xs[i+1])/2:X1; if(n===1){ L=X0; R=X1; } }
      const has=p.v!=null, y=has?yOf(p.v):Y0+HH/2, right=xs[i]>(X0+X1)/2, rx=xs[i]-L;
      return { cls:bars?"dz-hz b":"dz-hz", st:"left:"+L.toFixed(2)+"px;width:"+Math.max(1,R-L).toFixed(2)+"px",
        cur:bars?"display:none":"left:"+rx.toFixed(2)+"px;border-left-color:"+M.c, dot:!bars&&has,
        ad:"left:"+rx.toFixed(2)+"px;top:"+(y-Y0).toFixed(2)+"px;background:"+M.c,
        tip:(right?"right:"+(R-xs[i]+12).toFixed(1)+"px":"left:"+(rx+12).toFixed(1)+"px")+";top:"+Math.max(0,Math.min(HH-64,y-Y0-32)).toFixed(1)+"px",
        full:p.full, nm:M.l, v:self.ZF(p.v) }; });
  }

  /* ── ٢) توزيعُ العناصر — AnalyticsDistributionDonut: Pie بزاوية بدءٍ 0 وحشوة 2° ونصفَي قطر 62٪/92٪ ── */
  _zDonut(site,days,A){
    const self=this, H=site==="haram", SN=this.SN[site];
    const tot=this.ZST(days,site,H?"qaasideen":"total").total;
    const en=this.ZDN[site].map(([k,l,c])=>({ k:k, l:l, c:c, v:self.ZST(days,site,k).total })).filter(x=>isFinite(x.v)&&x.v>0);
    const sum=en.reduce((a,x)=>a+x.v,0);
    A.dnTitle="توزيع عناصر "+SN; A.dnSub="حصة كل مكوّن من إجمالي "+SN+" للفترة"; A.dnTotLbl="إجمالي "+SN;
    A.dnHas=en.length>0; A.dnEmpty=!A.dnHas; A.dnTot=this.ZF(tot);
    let fs=28; while(fs>14 && this.ZTW(A.dnTot,fs,800)>232) fs--;
    A.dnTotSt="font-size:"+fs+"px";
    const cx=120, cy=120, ro=105.8, ri=71.3, pad=2, real=360-en.length*pad, f4=v=>String(Math.round(v*10000)/10000);
    const P=(r,a)=>[cx+Math.cos(-a*Math.PI/180)*r, cy+Math.sin(-a*Math.PI/180)*r];
    let prev=0;
    A.dnSecs=en.map((x,i)=>{ const sa=i?prev+pad:0, ea=sa+(x.v/sum)*real; prev=ea;
      const ang=Math.min(ea-sa,359.999), te=sa+ang, lg=ang>180?1:0, o1=P(ro,sa), o2=P(ro,te), i1=P(ri,sa), i2=P(ri,te);
      return { k:String(i), gid:"dzg"+i, fill:"url(#dzg"+i+")", c:x.c, st:"color:"+x.c,
        d:"M "+f4(o1[0])+","+f4(o1[1])+" A "+ro+","+ro+",0, "+lg+",0, "+f4(o2[0])+","+f4(o2[1])+" L "+f4(i2[0])+","+f4(i2[1])+" A "+ri+","+ri+",0, "+lg+",1, "+f4(i1[0])+","+f4(i1[1])+" Z",
        tip:x.l+" — "+self.ZF(x.v)+" · "+self.ZFP(x.v/sum*100) }; });
    A.dnLeg=en.map((x,i)=>({ k:String(i), l:x.l, dot:"background:"+x.c, v:self.ZF(x.v), p:self.ZFP(x.v/sum*100),
      pSt:"background-color:color-mix(in srgb, "+x.c+" 14%, transparent);color:"+x.c }));
  }

  /* ── ٣) خرائطُ الكثافة — AnalyticsDensityHeatmap: لونٌ = color-mix(اللون 18+٪×78، شفّاف) ── */
  _zHeat(site,days,A){
    const self=this, s=this.state, md=this.ZMODE();
    const SH=["محرم","صفر","ر١","ر٢","ج١","ج٢","رجب","شعبان","رمضان","شوال","ق","ح"];
    A.hmTitle= md==="y"?"خرائط الكثافة الشهرية":md==="a"?"خرائط الكثافة السنوية":"خرائط الكثافة اليومية";
    A.hmSub= md==="y"?"توزيع كل مؤشر شهريًا خلال السنة المختارة. مربعات أغمق = حركة أكبر."
      : md==="a"?"توزيع كل مؤشر سنةً بسنة عبر السنوات المسجّلة. مربعات أغمق = حركة أكبر."
      : md==="c"?"توزيع كل مؤشر يومًا بيوم خلال النطاق المختار. مربعات أغمق = حركة أكبر."
      : "توزيع كل مؤشر يومًا بيوم خلال الشهر المختار. مربعات أغمق = حركة أكبر.";
    /* R177: الحرمُ أربعُ خرائط في سطرٍ واحد (lg:grid-cols-4 في HaramRef) والنبويُّ ثلاث (lg:grid-cols-3) */
    A.hmCls=site==="haram"?"c4":"c3";
    let slots=[], slotOf=()=>null;
    if(md==="m"){ const y=s.anY, m=+s.anM, nd=this.dim(y,m); for(let d=1;d<=nd;d++) slots.push({id:String(d), lbl:String(d)});
      slotOf=x=>(x.y===y&&x.m===m)?String(x.d):null; }
    else if(md==="c"){ this.PDAYS().forEach(x=>slots.push({id:x.k, lbl:String(x.d)})); slotOf=x=>x.k; }
    else if(md==="y"){ for(let m=1;m<=12;m++) slots.push({id:String(m), lbl:SH[m-1]}); slotOf=x=>x.y===s.anY?String(x.m):null; }
    else { this.YEARS().slice().sort((a,b)=>a-b).forEach(y=>slots.push({id:String(y), lbl:String(y)})); slotOf=x=>String(x.y); }
    const yearly=(md==="y"||md==="a");
    A.hmList=this.ZDN[site].map(([k,l,c])=>{ const agg={};
      days.forEach(x=>{ const id=slotOf(x); if(id==null) return; const v=self.ZV(site,x.rec,k); if(v==null) return; agg[id]=(agg[id]||0)+v; });
      const mx=Object.keys(agg).reduce((m,id)=>agg[id]>m?agg[id]:m,0)||1;
      const cells=slots.map(sl=>{ const has=(sl.id in agg), v=has?agg[sl.id]:null, it=(v!=null&&v>0)?Math.min(1,v/mx):0;
        const bg=(!has||it===0)?"color-mix(in srgb, var(--text-primary) 4%, var(--bg-card))":"color-mix(in srgb, "+c+" "+Math.round(18+it*78)+"%, transparent)";
        /* R188: «ألف/مليون» كلمةً في سطرٍ تحت الرقم — الخليّةُ أضيقُ من «١٫٤ مليون» في سطرٍ واحد على الحاسب والجهاز اللوحي */
        return { t:sl.lbl, v:self.ZFC(v).replace(" ","\n"), hv:(v!=null&&v>0),
          tip:sl.lbl+(md==="y"?" ("+s.anY+"هـ)":"")+": "+(v==null?"بدون بيانات":self.ZF(v)),
          st:"background-color:"+bg+";color:"+(it>0.55?"var(--bg-card)":"var(--fg-x53565a)")
            +";box-shadow:"+(has?"inset 0 0 0 1px color-mix(in srgb, "+c+" 35%, transparent)":"none")+";font-size:"+(yearly?10:9)+"px" }; });
      return { lbl:l, gcls:yearly?"dz-hg y":"dz-hg", cells:cells,
        sw:[25,45,65,80,95].map(p=>({ st:"background-color:color-mix(in srgb, "+c+" "+p+"%, transparent)" })) }; });
  }

  /* ── ٤) المؤشرُ القياديّ بتصميم «مؤشرات المصليات» (_kPaneZn): مفعّلة/معطّلة ← مسجّل/فارغ ── */
  ZH(t){ return t>=90?"#15803d":(t<80?"#C9702A":"#8A6F35"); }
  ZP1(a,b){ return b?Math.round(a/b*1000)/10:0; }
  ZPT(v){ return String(v).replace(/\.0$/,"")+"٪"; }
  ZDW(n){ return n===1?"يوم واحد":n===2?"يومين":(n>=3&&n<=10)?n+" أيام":KIVO.BassamCount(n,"يوم")+""; }
  ZE(ic,c,bg,bd,lbl,v,sub,tip){ return { ic:this.ZI(ic), c:c, lbl:lbl, v:v, sub:sub, tip:tip,
    icBox:"width:31px;height:31px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:"+bg+";border:1px solid "+bd,
    vSt:"font-size:14.5px;font-weight:800;color:"+c+";line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" }; }
  ZO(ic,c,bg,bd,lbl,nm,tot,p,tip){ return { ic:this.ZI(ic), lbl:lbl, nm:nm, tot:tot, p:p, tip:tip,
    box:"flex:1;min-width:172px;position:relative;overflow:hidden;display:flex;align-items:center;gap:9px;background:"+bg+";border:1px solid "+bd+";border-radius:13px;padding:7px 11px 7px 9px;box-shadow:0 4px 12px -9px "+c+";cursor:help",
    bar:"position:absolute;top:0;bottom:0;right:0;width:3px;background:"+c,
    icB:"width:27px;height:27px;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:"+c+";box-shadow:0 3px 8px -4px "+c,
    lblSt:"font-size:8.5px;font-weight:700;letter-spacing:.3px;color:"+c+";opacity:.72;white-space:nowrap",
    totSt:"margin-right:auto;flex-shrink:0;font-size:16px;font-weight:800;color:"+c,
    pSt:"flex-shrink:0;font-size:9.5px;font-weight:800;color:var(--fg-xffffff);background:"+c+";border-radius:9999px;padding:2.5px 8px;box-shadow:0 2px 6px -3px "+c }; }
  _zHero(site,days,A){
    const self=this, s=this.state, H=site==="haram", md=this.ZMODE();
    const GOLD="#8A6F35", NAVY="var(--text-secondary)", PAL=["var(--chart-1)","var(--chart-11)","var(--chart-7)","var(--chart-2)","var(--chart-3)","var(--chart-4)"];
    const comps=this.COMPS(site), store=(this.load()[site])||{}, flds=this.F[site];
    const hasRec=k=>{ const r=store[k]; return !!(r&&flds.some(f=>r[f.k]!=null&&r[f.k]!=="")); };
    const pd=this.PDAYS(), past=pd.filter(x=>x.past), el=past.length, recN=past.filter(x=>hasRec(x.k)).length;
    const dayTot=days.map(x=>({ x:x, t:self.TOT(site,x.rec) })).filter(o=>o.t!=null);
    const grand=dayTot.reduce((a,o)=>a+o.t,0), tS=this.ST(dayTot.map(o=>o.t)), cov=this.ZP1(recN,el);
    /* R189: تاريخا «أعلى يوم» و«أدنى يوم» بالأرقام كتاريخ «أدنى/ذروة» في البطاقات تحتهما وعمود السجل */
    const dl=x=>self.dk(x.y,x.m,x.d);
    A.zhSub=H?"إجمالي قاصدي المسجد الحرام · المصلين + المعتمرين + العربات + حجر إسماعيل":"إجمالي المسجد النبوي · المصلين + ممر السلام + زائري الروضة";
    A.zhNum=this.NM(grand); A.zhDays=String(recN); A.zhDaysW="من "+this.ZDW(el); A.zhCov=this.ZPT(cov);
    const pk=dayTot.find(o=>o.t===tS.peak), lo=dayTot.find(o=>tS.low!=null&&o.t===tS.low);
    A.zhStats=[
      this.ZE("hact",GOLD,"rgba(138,111,53,.10)","rgba(138,111,53,.26)","متوسط اليوم", this.NM(tS.avg==null?null:Math.round(tS.avg)), "لكلِّ يومٍ مسجّل",
        "الإجمالي "+this.NM(grand)+" ÷ "+KIVO.BassamCount(dayTot.length,"يوم")+" "+KIVO.BassamCount.agr(dayTot.length,"فيه","فيهما","فيها")+" أرقام — ما قيس لا ما مضى"),
      this.ZE("hup","#15803d","rgba(21,128,61,.10)","rgba(21,128,61,.26)","أعلى يوم", this.NM(tS.peak), pk?dl(pk.x):"—", "أعلى إجماليٍّ يوميٍّ قيس في الفترة"),
      this.ZE("hdown","#6B7280","rgba(107,114,128,.10)","rgba(107,114,128,.24)","أدنى يوم", this.NM(tS.low), lo?dl(lo.x):"—", "أدنى إجماليٍّ يوميٍّ موجبٍ قيس — الفارغُ لا يُعدّ قاعاً") ];
    /* المكوّنات: الإجمالي وأيّامُ التسجيل لكلِّ مكوّن */
    const cs=comps.map((c,i)=>{ let tot=0, on=0;
      days.forEach(x=>{ const v=self.VOF(x.rec,c.k); if(v!=null) tot+=v; });
      past.forEach(x=>{ const r=store[x.k]; if(r&&r[c.k]!=null&&r[c.k]!=="") on++; });
      return { i:i, nm:c.l, tot:tot, on:on, off:Math.max(0,el-on), onP:self.ZP1(on,el), col:PAL[i%PAL.length] }; });
    const mxT=Math.max.apply(null,cs.map(c=>c.tot).concat([1]));
    A.zjHas=recN>0; A.zjNone=!A.zjHas;
    A.zjCaps=cs.map((c,i)=>{ const o=48+82*Math.max(0,Math.min(1,c.tot/mxT)), r=o*(el?c.on/el:0), rc=self.ZH(c.onP), sP=Math.max(0,Math.min(100,c.onP));
      return { dv:i>0, nm:c.nm, tot:self.CMP2(c.tot), on:String(c.on), off:String(c.off), rc:rc,
        tip:c.nm+" — الإجمالي "+self.NM(c.tot)+" ("+self.ZPT(self.ZP1(c.tot,grand))+" من الإجمالي) · مسجّل "+c.on+" من "+self.ZDW(el)+" ("+self.ZPT(c.onP)+") · فارغ "+c.off,
        barSt:"position:relative;width:100%;height:"+o.toFixed(1)+"px;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 3px 8px -5px rgba(138,111,53,.9)",
        offSt:"height:"+(o-r).toFixed(1)+"px;flex-shrink:0;background:"+GOLD+";opacity:.22",
        onSt:"height:"+r.toFixed(1)+"px;flex-shrink:0;background:linear-gradient(180deg,var(--brand-light) 0%,"+GOLD+" 62%,#6B5527 100%)",
        rw:sP>0?"4.5":"0", roff:(106.8*(1-sP/100)).toFixed(1), rtxt:self.ZPT(Math.round(10*c.onP)/10),
        rtSt:"position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:800;color:"+rc,
        offLine:"display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:400;white-space:nowrap;color:"+(c.off?"#6B7280":"#B9B2A2"),
        offDot:"width:5px;height:5px;border-radius:9999px;background:"+(c.off?"#6B7280":"#D8D2C4")+";display:inline-block;flex-shrink:0" }; });
    const srt=cs.slice().sort((a,b)=>b.tot-a.tot);
    const topO=(arr,lblH,lblL,val,pct,tipF)=>arr.length<2?[]:[
      self.ZO("hup",GOLD,"rgba(138,111,53,.12)","rgba(138,111,53,.34)",lblH,arr[0].nm,val(arr[0]),pct(arr[0]),tipF(arr[0])),
      self.ZO("hdown",NAVY,"rgba(37,52,63,.075)","rgba(37,52,63,.24)",lblL,arr[arr.length-1].nm,val(arr[arr.length-1]),pct(arr[arr.length-1]),tipF(arr[arr.length-1])) ];
    A.zjTop=A.zjHas?topO(srt,"الأعلى مكوّناً","الأدنى مكوّناً",c=>self.CMP(c.tot),c=>self.ZPT(self.ZP1(c.tot,grand)),
      c=>c.nm+" — "+self.NM(c.tot)+" · "+self.ZPT(self.ZP1(c.tot,grand))+" من إجمالي الفترة"):[];
    /* أيّامُ الأسبوع: متوسّطُ اليوم المسجّل لكلِّ يوم، وتغطيتُه */
    const wk=[0,1,2,3,4,5,6].map(w=>{ let cnt=0, on=0, sum=0, nn=0;
      past.forEach(x=>{ if(x.wd!==w) return; cnt++; if(hasRec(x.k)){ on++; const t=self.TOT(site,store[x.k]); if(t!=null){ sum+=t; nn++; } } });
      return { nm:self.WDAYS[w], cnt:cnt, on:on, off:cnt-on, onP:self.ZP1(on,cnt), avg:nn?sum/nn:null }; });
    const mxA=Math.max.apply(null,wk.map(x=>x.avg||0).concat([1]));
    A.zwRows=wk.map(x=>({ nm:x.nm, tot:x.avg==null?"—":self.CMP2(x.avg), on:String(x.on), off:String(x.off), p:self.ZPT(x.onP),
      tip:x.nm+" — متوسط "+(x.avg==null?"—":self.NM(Math.round(x.avg)))+" لليوم · مسجّل "+x.on+" من "+x.cnt+" ("+self.ZPT(x.onP)+")",
      barSt:"position:absolute;top:0;bottom:0;right:0;width:"+((x.avg||0)/mxA*100).toFixed(1)+"%;border-radius:7px;overflow:hidden;display:flex;flex-direction:row-reverse",
      onSt:"width:"+x.onP+"%;background:"+GOLD+";display:block",
      offSt:"flex:0 0 62px;text-align:center;font-size:9px;font-weight:400;color:"+(x.off?"var(--fg-x6b7280)":"var(--fg-xb9b2a2)")+";white-space:nowrap",
      pSt:"flex:0 0 46px;text-align:center;font-size:10px;font-weight:800;color:"+self.ZH(x.onP)+";background:var(--bg-a138111530p08);border-radius:9999px;padding:2px 0" }));
    const oa=tS.avg||0, wd=wk.filter(x=>x.avg!=null).sort((a,b)=>b.avg-a.avg);
    A.zwTop=topO(wd,"الأعلى متوسطاً","الأدنى متوسطاً",x=>self.CMP(x.avg),x=>self.ZPT(self.ZP1(x.avg,oa)),
      x=>x.nm+" — متوسطُه "+self.NM(Math.round(x.avg))+" = "+self.ZPT(self.ZP1(x.avg,oa))+" من متوسط اليوم في الفترة");
    /* جدولُ التركيب (يسار اللوحة) — الصفوفُ نفسُها؛ R189: حُذفت الحلقةُ فوقه بطلب المستخدم */
    const rk=cs.slice().sort((a,b)=>b.tot-a.tot);
    A.ztRows=cs.map((c,i)=>{ const v=rk.indexOf(c)+1, tp=v===1&&c.tot>0, sh=self.ZP1(c.tot,grand), pc=self.ZH(c.onP);
      return { nm:c.nm, rk:String(v), share:String(sh), tot:self.CMP2(c.tot), on:String(c.on), off:c.off?String(c.off):"—", p:self.ZPT(c.onP),
        tip:c.nm+" — الإجمالي "+self.NM(c.tot)+" ("+self.ZPT(sh)+") · مسجّل "+KIVO.BassamCount(c.on,"يوم")+" ("+self.ZPT(c.onP)+") · فارغ "+c.off,
        rowSt:"display:flex;align-items:center;gap:6px;padding:4px;border-radius:8px;cursor:help;background:"+(tp?"var(--bg-a138111530p1)":(i%2?"rgba(138,111,53,.035)":"transparent")),
        rkSt:"flex:0 0 17px;height:17px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:800;"+(tp?"background:"+GOLD+";color:var(--fg-xffffff)":"background:var(--bg-a138111530p1);color:var(--fg-xa79878)"),
        swSt:"flex:0 0 10px;height:10px;border-radius:3px;background:"+c.col+";box-shadow:0 0 0 2px var(--bg-card),var(--shadow-card)",
        barSt:"height:100%;width:"+(c.tot/mxT*100).toFixed(0)+"%;background:linear-gradient(90deg,"+c.col+","+c.col+");border-radius:4px;display:block",
        onSt:"flex:0 0 28px;text-align:center;font-size:11px;font-weight:800;color:"+(c.on?"var(--fg-x16a34a)":"var(--fg-xcfc7b4)"),
        offSt:"flex:0 0 28px;text-align:center;font-size:11px;font-weight:800;color:"+(c.off?"var(--fg-x6b7280)":"var(--fg-xcfc7b4)"),
        pSt:"flex:0 0 42px;text-align:center;font-size:9.5px;font-weight:800;color:var(--fg-xffffff);background:"+pc+";border-radius:9999px;padding:2px 0;box-shadow:0 2px 6px -3px "+pc }; });
    const cc=this.ZH(cov);
    A.ztTot=this.CMP2(grand); A.ztOn=String(recN); A.ztOff=String(Math.max(0,el-recN)); A.ztP=this.ZPT(cov);
    A.ztPSt="flex:0 0 42px;text-align:center;font-size:9.5px;font-weight:800;color:var(--fg-xffffff);background:"+cc+";border-radius:9999px;padding:2px 0";
    /* العدّادات: تغطيةُ كلِّ أسبوعٍ (أو شهرٍ أو سنة) من الفترة — نصفُ القوس = نسبةُ الأيام المسجّلة */
    const WN={ w:["أسبوع","أسبوعين","أسابيع","أسبوعاً"], m:["شهر","شهرين","أشهر","شهراً"], y:["سنة","سنتين","سنوات","سنة"] };
    let groups=[], gk="w";
    if(md==="m"||md==="c"){ gk="w"; for(let i=0;i<pd.length;i+=7){ const ch=pd.slice(i,i+7), ps=ch.filter(x=>x.past); if(!ps.length) continue;
        groups.push({ nm:"الأسبوع "+(i/7+1), rng:ch[0].d+" "+self.MONTHS[ch[0].m-1]+" – "+ch[ch.length-1].d+" "+self.MONTHS[ch[ch.length-1].m-1], ps:ps }); } }
    else if(md==="y"){ gk="m"; for(let m=1;m<=12;m++){ const ps=past.filter(x=>x.m===m); if(ps.length) groups.push({ nm:self.MONTHS[m-1], rng:self.MONTHS[m-1]+" "+s.anY, ps:ps }); } }
    else { gk="y"; this.YEARS().slice().sort((a,b)=>a-b).forEach(y=>{ const ps=past.filter(x=>x.y===y); if(ps.length) groups.push({ nm:String(y), rng:y+" هـ", ps:ps }); }); }
    const cnt=groups.length, wn=WN[gk], wl=cnt===1?wn[0]:cnt===2?wn[1]:(cnt>=3&&cnt<=10)?cnt+" "+wn[2]:cnt+" "+wn[3];
    A.zgTitle="مؤشرات التغطية بحسب "+(gk==="w"?"الأسبوع":gk==="m"?"الشهر":"السنة");
    A.zgNote=wl+" · القوس = نسبة التغطية"; A.zgHas=cnt>0; A.zgNone=!A.zgHas;
    A.zgList=groups.map(g=>{ const on=g.ps.filter(x=>hasRec(x.k)).length, n=g.ps.length, off=n-on, t=self.ZP1(on,n), c=self.ZH(t);
      const e=(180-1.8*Math.max(0,Math.min(100,t)))*Math.PI/180, X=60+46*Math.cos(e), Y=64-46*Math.sin(e);
      return { nm:g.nm, n:String(n), on:String(on), off:String(off), c:c,
        tip:g.nm+" ("+g.rng+") — مسجّل "+on+" من "+self.ZDW(n)+" ("+self.ZPT(t)+") · فارغ "+off,
        arc:t>0?"M 14 64 A 46 46 0 0 1 "+X.toFixed(1)+" "+Y.toFixed(1):"M 14 64", aw:t>0?"11":"0",
        kx:t>0?X.toFixed(1):"14", ky:t>0?Y.toFixed(1):"64", p:String(t)+"٪",
        pSt:"font-size:18px;font-weight:800;line-height:1;color:"+c,
        offSt:"display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:400;color:"+(off?"var(--fg-x6b7280)":"var(--fg-xb9b2a2)"),
        offDot:"width:5px;height:5px;border-radius:9999px;background:"+(off?"var(--bg-x6b7280)":"var(--bg-xd8d2c4)")+";display:inline-block" }; });
  }

  /* عرضُ حاوية الرسم يُقاس مرّةً ويُتابَع — كما يفعل ResponsiveContainer — فتبقى المحاورُ بالبكسل */
  _dzObs(){ try {
    const el=document.querySelector("[data-dz-tc]");
    if(el===this._dzEl) return;
    if(this._dzRO) this._dzRO.disconnect();
    this._dzEl=el; this._dzRO=null;
    if(!el||typeof ResizeObserver==="undefined") return;
    const ro=new ResizeObserver(()=>{ const w=Math.round(el.clientWidth);
      if(w>0&&Math.abs(w-(this.state.dzW||0))>=1) this.setState({dzW:w}); });
    ro.observe(el); this._dzRO=ro; } catch(e){} }
  componentDidUpdate(){ this._dzObs(); }
  componentWillUnmount(){ this._dsGone=true; if(this._dsEvent) window.removeEventListener("daily-stats-refresh",this._dsEvent); try { if(this._dzRO) this._dzRO.disconnect(); } catch(e){} this._dzRO=null; this._dzEl=null;
    this._bsOutM&&document.removeEventListener("click",this._bsOutM,!0); }

  /* ══════════ المقارنة الزمنية ══════════ */
  MVAL(mid,scope,hr,nr){
    if(mid==="haram_total")     return this.TOT("haram",hr);
    if(mid==="nabawi_op_total") return this.TOT("nabawi",nr);
    if(mid==="grand_total"){ const a=this.TOT("haram",hr), b=this.TOT("nabawi",nr);
      return (a==null&&b==null)?null:((a||0)+(b||0)); }
    if(mid==="worshippers"){
      if(scope==="haram")  return this.VOF(hr,"worshippers");
      if(scope==="nabawi") return this.VOF(nr,"worshippers");
      const a=this.VOF(hr,"worshippers"), b=this.VOF(nr,"worshippers");
      return (a==null&&b==null)?null:((a||0)+(b||0)); }
    if(mid==="umrah"||mid==="hijr_ismail"||mid==="carts") return this.VOF(hr,mid);
    return this.VOF(nr,mid);
  }
  TCUNITS(p,type,scope,mid){
    const H=(this.load().haram)||{}, N=(this.load().nabawi)||{}, out=[];
    const val=(y,m,d)=>{ const k=this.dk(y,m,d); return this.MVAL(mid,scope,H[k]||{},N[k]||{}); };
    if(type==="day"){ out.push({ label:String(p.d), full:p.d+" "+this.MONTHS[p.m-1]+" "+p.y, num:this.dk(p.y,p.m,p.d), v:val(p.y,p.m,p.d) }); return out; }
    if(type==="month"){ const nd=this.dim(p.y,p.m);
      for(let d=1;d<=nd;d++) out.push({ label:String(d), full:d+" "+this.MONTHS[p.m-1]+" "+p.y, num:this.dk(p.y,p.m,d), v:val(p.y,p.m,d) });
      return out; }
    for(let m=1;m<=12;m++){ const nd=this.dim(p.y,m); let sum=0, any=false;
      for(let d=1;d<=nd;d++){ const v=val(p.y,m,d); if(v!=null){ sum+=v; any=true; } }
      out.push({ label:this.MONTHS[m-1], full:this.MONTHS[m-1]+" "+p.y, num:p.y+"-"+String(m).padStart(2,"0"), v:any?sum:null }); }
    return out;
  }
  PLBL2(p,type){ return type==="day" ? (p.d+" "+this.MONTHS[p.m-1]+" "+p.y+" هـ")
    : type==="month" ? (this.MONTHS[p.m-1]+" "+p.y+" هـ") : (p.y+" هـ"); }

  _anTime(A){
    const self=this, s=this.state, T=this.hToday();
    const type=s.tcType, scope=s.tcScope;
    const mets=this.TCM.filter(m=>m.sc.indexOf(scope)>=0);
    let mid=s.tcMetric; if(!mets.some(m=>m.id===mid)) mid=mets[0].id;
    const pa=s.tcA||{y:T.y,m:1,d:1}, pb=s.tcB||{y:T.y,m:T.m,d:T.d};
    const years=this.YEARS();

    A.tcTypes=this.TCT.map(o=>({ lbl:o.l, style:this.MODEBTN(type===o.v), click:()=>self.setState({tcType:o.v}) }));
    A.tcScope=scope;
    A.tcScopeOpts=this.TCS.map(o=>({v:o.v,lbl:o.l}));
    A.tcSetScope=(e)=>self.setState({tcScope:e&&e.target?e.target.value:"both"});
    A.tcMetric=mid;
    A.tcMetricOpts=mets.map(m=>({v:m.id,lbl:m.l}));
    A.tcSetMetric=(e)=>self.setState({tcMetric:e&&e.target?e.target.value:mid});

    const yOpts=years.map(y=>({v:String(y),lbl:y+" هـ"}));
    const mOpts=this.MONTHS.map((nm,i)=>({v:String(i+1),lbl:nm}));
    const mkPick=(key,p,badge,title)=>{
      const sels=[{ lbl:"السنة", v:String(p.y), opts:yOpts,
        set:(e)=>self.setState(st=>({[key]:Object.assign({},st[key],{y:+((e&&e.target?e.target.value:p.y))})})) }];
      if(type!=="year") sels.push({ lbl:"الشهر", v:String(p.m), opts:mOpts,
        set:(e)=>self.setState(st=>({[key]:Object.assign({},st[key],{m:+((e&&e.target?e.target.value:p.m))})})) });
      if(type==="day"){ const nd=self.dim(p.y,p.m), dOpts=[];
        for(let d=1;d<=nd;d++) dOpts.push({v:String(d),lbl:String(d)});
        sels.push({ lbl:"اليوم", v:String(Math.min(p.d||1,nd)), opts:dOpts,
          set:(e)=>self.setState(st=>({[key]:Object.assign({},st[key],{d:+((e&&e.target?e.target.value:p.d))})})) }); }
      return { badge:badge, title:title, sub:self.PLBL2(p,type), sels:sels };
    };
    A.tcPickers=[ mkPick("tcA",pa,"I","الفترة الأولى — خطُّ الأساس"), mkPick("tcB",pb,"II","الفترة الثانية") ];

    const u1=this.TCUNITS(pa,type,scope,mid), u2=this.TCUNITS(pb,type,scope,mid);
    const s1=this.ST(u1.map(u=>u.v)), s2=this.ST(u2.map(u=>u.v));
    const l1=this.PLBL2(pa,type), l2=this.PLBL2(pb,type);
    const metL=(mets.find(m=>m.id===mid)||{}).l||"";
    const W = type==="year" ? {one:"شهر",many:"شهراً",al:"الأشهر"} : {one:"يوم",many:"يوماً",al:"الأيّام"};
    const chg = s1.total ? (s2.total-s1.total)/s1.total*100 : null;
    const up = chg!=null && chg>0.5, dn = chg!=null && chg<-0.5;
    const col = up ? "var(--fg-x0e7490)" : dn ? "var(--fg-xb45309)" : "var(--fg-x64748b)";
    const scL=(this.TCS.find(x=>x.v===scope)||{}).l||"";

    A.anPerLbl=l1+" ← "+l2;
    A.anPeriod=A.anPerLbl;
    A.tcL1=l1; A.tcV1=this.NM(s1.total); A.tcA1=this.NM(s1.avg==null?null:Math.round(s1.avg)); A.tcQ1=s1.days+" "+W.many+" ببيانات";
    A.tcL2=l2; A.tcV2=this.NM(s2.total); A.tcA2=this.NM(s2.avg==null?null:Math.round(s2.avg)); A.tcQ2=s2.days+" "+W.many+" ببيانات";
    A.tcPct=this.SGN(chg); A.tcColor=col;
    A.tcOff=(402.1*(1-Math.min(1,Math.abs(chg||0)/100))).toFixed(1);
    A.tcDiff=this.SNM(s2.total-s1.total);
    A.tcNote = chg==null ? "لا خطَّ أساس" : up ? "ارتفاع" : dn ? "انخفاض" : "ثبات";
    A.tcNoteStyle="display:inline-flex;align-items:center;gap:6px;margin-top:7px;font-size:11.5px;font-weight:800;border-radius:9999px;padding:4px 13px;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);border:1px solid var(--bd-xe6dcc2);color:"+col;
    A.anHeroTitle="المقارنة الزمنية — "+metL;
    A.anHeroEq=scL+" · "+metL+"  ·  "+l1+"  ←  "+l2;
    A.anHeroTotal=this.NM(s2.total);
    A.anHeroUnit=metL;
    const sum2=s1.total+s2.total;
    A.anBars=[[l1,s1.total,"var(--bg-x94a3b8)"],[l2,s2.total,"var(--bg-xb99751)"]].map(([lb,v])=>{ const p=sum2?v/sum2*100:0;
      return { label:lb, value:this.NM(v), pct:this.PCT(p), vSt:this.HVST(p<25), b:this.HBAR(p), tip:lb+" = "+this.NM(v) }; });
    A.anChips=[{label:"الفترة الأولى",value:this.NM(s1.total),tip:"خطُّ الأساس — وهو المقام في نسبة التغيّر"},
               {label:"الفترة الثانية",value:this.NM(s2.total),tip:"الفترةُ المقيسُ عليها"},
               {label:"الفرق",value:this.SNM(s2.total-s1.total),tip:"الثانية − الأولى"},
               {label:"التغيّر",value:this.SGN(chg),tip:"(الثانية − الأولى) ÷ الأولى × 100"}];
    A.anSegTitle="وزنُ الفترتين";
    const seg=[{n:l1,v:s1.total,c:"var(--bg-x94a3b8)"},{n:l2,v:s2.total,c:"var(--bg-xb99751)"}];
    A.anSeg=this.SEGBAR(seg,sum2);
    A.anDonut=this.DONUT(seg,sum2);
    A.anDonutTitle="وزنُ الفترتين"; A.anDonutSub=metL+" — "+scL;
    A.anDonutMid=this.SGN(chg); A.anDonutCap="نسبةُ التغيّر";
    const P1=u1.length?s1.days/u1.length*100:0, P2=u2.length?s2.days/u2.length*100:0;
    A.anCalcSub="الفترةُ الجاريةُ ناقصةٌ بطبيعتها";
    A.anCalc=[ this.CROW(String(u1.length), "طولُ الفترة الأولى", 100, l1, "var(--fg-x94a3b8)", "عددُ "+W.al+" في الفترة الأولى"),
               this.CROW(String(u2.length), "طولُ الفترة الثانية", u1.length?u2.length/u1.length*100:0, l2, "var(--fg-xb99751)", "عددُ "+W.al+" في الفترة الثانية — وقد يختلف عن الأولى"),
               this.CROW(this.PCT(P1), "تغطيةُ الأولى", P1, s1.days+" من "+u1.length, "var(--fg-x008450)", "ما فيه أرقامٌ من الفترة الأولى"),
               this.CROW(this.PCT(P2), "تغطيةُ الثانية", P2, s2.days+" من "+u2.length, "var(--fg-xb45309)", "ما فيه أرقامٌ من الفترة الثانية — إن كانت جاريةً فالنقصُ طبيعيّ") ];
    /* R189: تاريخُ «أدنى/ذروة» لكل فترةٍ تاريخُها؛ وللفرق والنسبة (موضعٌ في الفترتين معاً) موضعُه كما في عمود «الموضع» بالسجل */
    const PD=u1.map(u=>u.label);
    A.anKpis=[ this.KPI("الفترة الأولى", l1+" · "+metL+" · "+scL, u1.map(u=>u.v), {dates:u1.map(u=>u.num)}),
               this.KPI("الفترة الثانية", l2+" · "+metL+" · "+scL, u2.map(u=>u.v), {dates:u2.map(u=>u.num)}),
               this.KPI("الفرق","الثانية − الأولى = "+this.SNM(s2.total-s1.total),
                 u1.map((u,i)=>(u.v==null||!u2[i]||u2[i].v==null)?null:Math.abs(u2[i].v-u.v)), {mode:"avg",dates:PD}),
               this.KPI("نسبةُ الثانية من الأولى","لكلِّ "+W.one+" على حدة — والمعروضُ متوسّطُها",
                 u1.map((u,i)=>(!u.v||!u2[i]||u2[i].v==null)?null:u2[i].v/u.v*100), {mode:"avg",pct:true,dates:PD}) ];
    const mx=Math.max(1,s1.peak||0,s2.peak||0);
    A.anGrid=this.GRID(mx);
    A.anChartTitle="محاذاةٌ نسبيّة ٪";
    A.anChartSub="الفترتان على مقياسٍ واحد — المحورُ الأفقيُّ نسبةٌ من الفترة لا رقمُ "+W.one;
    const g1=this.SEGS(u1.map(u=>u.v),mx,"var(--bg-x94a3b8)");
    const g2=this.SEGS(u2.map(u=>u.v),mx,"var(--bg-xb99751)");
    A.anSegs=g1.concat(g2); A.anDots=(g1.solo||[]).concat(g2.solo||[]);
    A.anXLabels=[0,25,50,75,100].map(q=>({lp:this.XP(12+632*q/100), t:q+"٪"}));
    A.anLegend=[{c:"var(--bg-x94a3b8)",t:"الفترة الأولى — "+l1},{c:"var(--bg-xb99751)",t:"الفترة الثانية — "+l2}];
    A.anTblTitle=W.al+" بين الفترتين"; A.anTblSub=metL+" · "+scL;
    A.anCols=[this.TH("الموضع","layer"), this.TH(l1,"clock"), this.TH(l2,"clock"), this.TH("الفرق","diff"), this.TH("التغيّر","trend")];
    const rowsN=Math.max(u1.length,u2.length);
    for(let i=0;i<rowsN;i++){
      const a=u1[i]?u1[i].v:null, b=u2[i]?u2[i].v:null;
      if(a==null&&b==null) continue;
      const ch=a?(b==null?null:(b-a)/a*100):null;
      A.anRows.push({ trStyle:"border-bottom:1px solid var(--bd-xf1f1f1)",
        cells:[ this.TD((u1[i]?u1[i].label:(u2[i]?u2[i].label:"—")),{rtl:true,w:600,nowrap:true}),
          this.TDN(a), this.TDN(b,{w:700,c:"var(--fg-x8a6f35)",fs:"12.5px"}),
          this.TD((a==null||b==null)?"—":this.SNM(b-a),{faint:(a==null||b==null)}),
          this.TD(this.SGN(ch),{w:800,c:(ch==null?"var(--fg-x64748b)":ch>0.5?"var(--fg-x0e7490)":ch<-0.5?"var(--fg-xb45309)":"var(--fg-x64748b)")}) ] });
    }
    A.anTblCount=this.ATBLC(A.anRows.length,rowsN,W);
    A.anRows.push({ trStyle:"border-top:2px solid var(--bd-a185151810p3);background:var(--bg-a185151810p05)",
      cells:[ this.TD("الإجمالي",{rtl:true,w:700,c:"var(--fg-x8a6f35)",nowrap:true}), this.TD(this.NM(s1.total),{w:700}),
        this.TD(this.NM(s2.total),{w:700,c:"var(--fg-x8a6f35)",fs:"12.5px"}), this.TD(this.SNM(s2.total-s1.total),{w:700}),
        this.TD(this.SGN(chg),{w:800,c:col}) ] });
    A.anNote="الفترةُ الأولى هي المقام دائماً. والفترتان قد تختلفان طولاً ("+u1.length+" مقابل "+u2.length+" "+W.many+")، فالمحورُ الأفقيُّ نسبةٌ من الفترة لا رقمُ "+W.one+"ٍ — وإلّا بدا الأقصرُ منحسراً وهو ليس كذلك. والفترةُ الجاريةُ ناقصةٌ بطبيعتها، فقارِنها بحذر.";
    return A;
  }

  EMPTY(){ return { viewEntry:true, viewAn:false, siteTabs:[], siteTabsOn:false, noSite:false, roSite:"", lgCanExport:false, lgCanClear:false, lgFilesOn:false,
    mcards:[], dcards:[], rows:[], cols:[], totRow:[],
    fields:[], fieldsMain:[], fieldsMen:[], fieldsWomen:[], hasRows:false, noRows:false,
    clearDraft:()=>{}, lockOn:false, lockApproved:false, lockAuto:false, lockDay:false, lockHint:"", lockHintStyle:"", lockHintP1:"", lockHintP2:"",
    lgOpen:false, lgChev:"", lgToggle:()=>{}, lgSearch:"", lgSetSearch:()=>{}, lgActOn:false,
    lgFilesOpen:false, lgFilesChev:"", lgFilesBtnStyle:"", lgFilesToggle:()=>{},
    lgFsOpen:false, lgFsChev:"", lgFsBtnStyle:"", lgFsLabel:"", lgFsToggle:()=>{}, lgFsOpts:[],
    lgExport:()=>{}, lgImport:()=>{}, lgPrint:()=>{}, lgClearAsk:()=>{}, lgClearItemStyle:"",
    lgFootOn:false, lgPgRange:"", lgPgTotal:"", lgPgTotalW:"", lgPerPage:"50", lgOnPerPage:()=>{}, lgPgNums:[],
    lgPgFirst:()=>{}, lgPgPrev:()=>{}, lgPgNext:()=>{}, lgPgLast:()=>{},
    lgPgFirstStyle:"", lgPgPrevStyle:"", lgPgNextStyle:"", lgPgLastStyle:"",
    retroOn:false, retroTitle:"", retroMsg:"", retroB1:"", retroB2:"", retroB3:"", retroBtn:"", retroBtnStyle:"",
    retroDo:()=>{}, retroCancel:()=>{}, retroStop:()=>{},
    lockOn2:false, lcIconBox:"", lcIconPath:"", lcTitle:"", lcMsg:"", lcNote:"", lcNoteColor:"", lcDoLabel:"", lcDoStyle:"",
    lockDo:()=>{}, lockCancel:()=>{},
    isHaram:true, isNabawi:false, canEdit:false, canSaveDay:false, readOnly:false, rawdahBoxes:[],
    /* KIVO_255 · SOT-130: الرسمةُ الأولى (قبل أن يثبت componentDidMount السنةَ) كانت تترك هذه المواضعَ بلا قيمة فيحذّر dc-runtime «never resolved» — قيمٌ محايدة صريحة */
    yearLabel:"", gregRange:"", monthName:"", filledDays:"", monthDays:"", monthDaysW:"", dayProg:"",
    prevYear:()=>{}, nextYear:()=>{}, goToday:()=>{}, impXlsx:()=>{}, expXlsx:()=>{},
    entTitle:"", entGreg:"", entBadge:"", entBadgeStyle:"", saveDay:()=>{}, logCount:"" }; }
  EMPTY_AN(){ return { anIsTime:false, anBarOn:true, anRawdah:false, anHeat:false, anBars:[], anChips:[], anKpis:[],
    anGrid:[], anBarsSvg:[], anSegs:[], anDots:[], anXLabels:[], anLegend:[], anCols:[], anRows:[], anSeg:[], anCalc:[],
    anDonut:[], anHeatCells:[], anTicker:[], anYearOpts:[], anMonthOpts:[], anModeOpts:[], tcTypes:[], tcScopeOpts:[],
    tcMetricOpts:[], tcPickers:[], anYmBoxStyle:"", anYear:"", anMonth:"", anCustomOn:false, anFrom:"", anTo:"",
    anRangeHint:"", anPerLbl:"", anPeriodTxt:"", anPeriod:"", anHeroTitle:"", anHeroEq:"", anHeroTotal:"", anHeroUnit:"",
    anSegTitle:"", anCalcSub:"", anDonutTitle:"", anDonutSub:"", anDonutMid:"", anDonutCap:"", anChartTitle:"",
    anChartSub:"", anHeatTitle:"", anTblTitle:"", anTblSub:"", anNote:"",
    anTblOpen:false, anTblChev:"", anTblToggle:()=>{}, anTblCount:"",
    anSetYear:()=>{}, anSetMonth:()=>{}, anSetFrom:()=>{}, anSetTo:()=>{},
    tcScope:"both", tcMetric:"", tcSetScope:()=>{}, tcSetMetric:()=>{},
    tcL1:"", tcV1:"", tcA1:"", tcQ1:"", tcL2:"", tcV2:"", tcA2:"", tcQ2:"",
    tcColor:"var(--fg-x64748b)", tcOff:"402.1", tcPct:"—", tcNote:"", tcNoteStyle:"", tcDiff:"",
    anZn:false, anOld:true,
    trTitle:"", trSub:"", trPills:[], trTiles:[], trHas:false, trEmpty:false, trC:"var(--bg-xb99751)", trVB:"0 0 431 288", trX2:"363",
    trGrid:[], trYT:[], trXT:[], trArea:"", trLine:"", trBars:[], trDots:[], trHov:[],
    dnTitle:"", dnSub:"", dnTotLbl:"", dnHas:false, dnEmpty:false, dnTot:"", dnTotSt:"", dnSecs:[], dnLeg:[],
    hmTitle:"", hmSub:"", hmCls:"c2", hmList:[],
    zhSub:"", zhNum:"", zhDays:"", zhDaysW:"", zhCov:"", zhStats:[], zjHas:false, zjNone:false, zjCaps:[], zjTop:[],
    zwRows:[], zwTop:[], ztRows:[], ztTot:"", ztOn:"", ztOff:"", ztP:"", ztPSt:"",
    zgTitle:"", zgNote:"", zgHas:false, zgNone:false, zgList:[] }; }

  /* الفحص العميق 2026-10-21 (KD-03 · R7): المسجدُ المعروض في العنوان #/dstats/<haram|nabawi> — يُكتب عند التبديل، ويُقرأ متزامناً قبل حساب القيم
     (رابطٌ مباشر أو رجوع) بحارس ورقة المسجد نفسِه (SITES) · والمزروعُ من الحالة المحفوظة يُكتب فيه · نسخُ solo (المؤشرات) لا تشارك */
  _bsHT(k){ try { if(this.SOLO()) return; const h=String(location.hash||""), p="#/dstats"; if(h.indexOf(p)!==0) return;
    const w=k?p+"/"+k:p; h!==w && history.replaceState && history.replaceState(null,"",location.pathname+location.search+w); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ } }
  _bsHR(){ try { if(this.SOLO()) return; const o=KIVO.__BS_OPEN_TAB;
    const shown=()=>{ const s=this.SITE(); return s&&s!=="haram"?s:""; };   /* العنوانُ يحمل المسجدَ المعروض فعلاً — والحرمُ (الافتراضي) بلا ذيل */
    if(!o||o.page!=="dstats"){ const sd=this.__bsSeeded; if(sd&&sd.site!==void 0){ this.__bsSeeded=null; this._bsHT(shown()); } return; }
    KIVO.__BS_OPEN_TAB=null; this.__bsSeeded=null;
    const k=o.tab; if(this.SITES().indexOf(k)<0){ this._bsHT(shown()); return; }
    if(this.state.site!==k) this.state=Object.assign({},this.state,{site:k,draft:null});
    this._bsHT(k); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ } }
  renderVals(){
    this._bsHR();
    const self=this, s=this.state, T=this.hToday(), solo=this.SOLO();
    if(!s.year||!s.anY) return Object.assign(this.EMPTY(), this.EMPTY_AN());   /* قبل التركيب (اليومُ مزروعٌ ولوحةُ التحليل لم تُهيَّأ بعد): رسمٌ فارغ لا يُعرض */

    /* ══ شاشةُ تحليلٍ داخل «مؤشرات الإدارة» — ورقتُها تحكمها صفحةُ المؤشرات (R180) ══ */
    if(solo){
      return Object.assign({}, this.EMPTY(), this.EMPTY_AN(),
        { viewEntry:false, viewAn:true, canEdit:false, canSaveDay:false, readOnly:false }, this._an(solo));
    }

    /* ══ صفحةُ الإدخال: تبويبُ كلِّ مسجدٍ ورقتُه (R180) ══ */
    const sites=this.SITES();
    if(!sites.length) return Object.assign(this.EMPTY(), this.EMPTY_AN(), { viewEntry:false, noSite:true });
    const site=this.SITE(), flds=this.F[site], nd=this.dim(s.year,s.month);
    const canEdit=this.PC("edit",site)||this.PC("add",site);
    /* القفلُ يحرس تعديلاتِ الشهر كلَّها — لا الكرتَ وحده */
    const mApp=this.mApproved(site,s.year,s.month), mAuto=this.mAutoLocked(site,s.year,s.month);
    const mLock=mApp||mAuto, canApprove=this.PC("approve",site);
    const dLock=!mLock&&this.dayLocked(site,s.year,s.month,s.day);
    const dPastSel=this.dPast(s.year,s.month,s.day);
    const store=(this.load()[site])||{};
    const rows=[]; for(let d=1;d<=nd;d++){ const r=store[this.dk(s.year,s.month,d)]||{}; rows.push(Object.assign({__d:d},r)); }
    const ts=this.ST(rows.map(r=>this.TOT(site,r)));
    const filled=rows.filter(r=>flds.some(f=>r[f.k]!=null)).length;
    const fullDays=rows.filter(r=>flds.every(f=>r[f.k]!=null)).length;

    const siteTabs=[["haram","المسجد الحرام"],["nabawi","المسجد النبوي"]].filter(([k])=>sites.indexOf(k)>=0).map(([k,n])=>({
      name:n, on:site===k, style:this.TABST(site===k), icon:this.TABIC(site===k), lbl:this.TABLB(site===k),
      click:()=>{ self.setState({site:k,draft:null}); self._bsHT(k==="haram"?"":k); } }));

    const mcards=this.MONTHS.map((nm,i)=>{
      const m=i+1, cur=(s.year===T.y&&m===T.m), sel=(m===s.month);
      const past=(s.year<T.y)||(s.year===T.y&&m<T.m);
      const mnd=this.dim(s.year,m);
      let has=0, allFull=0;
      for(let d=1;d<=mnd;d++){ const r=store[this.dk(s.year,m,d)]||{};
        if(flds.some(f=>r[f.k]!=null)){ has++; if(flds.every(f=>r[f.k]!=null)) allFull++; } }
      const complete = has>=mnd && allFull>=mnd;
      const appr=self.mApproved(site,s.year,m), oflag=self.mOpenFlag(site,s.year,m);
      const autoL=past&&!oflag&&!appr, mlk=appr||autoL;
      let c="position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ";
      let nameColor="var(--fg-x53565a)", footColor="var(--fg-xcbd5e1)", footLabel="—", footIcon=false;
      let p1="M12 3a9 9 0 0 1 9 9", p2="M12 21a9 9 0 0 1-9-9";
      if(appr){ c+=(sel?"solid #008450;box-shadow:0 0 0 2px rgba(0,132,80,0.25);":"solid rgba(0,132,80,0.4);")+"background:var(--bg-a0132800p07)";
        nameColor="#047857"; footColor="#047857"; footLabel="معتمد"; footIcon=true;
        p1="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"; p2="m9 12 2 2 4-4"; }
      else if(complete&&autoL){ c+=(sel?"solid #0e7490;box-shadow:0 0 0 2px rgba(14,116,144,0.25);":"solid rgba(14,116,144,0.4);")+"background:var(--bg-a141161440p07)";
        nameColor="#0e7490"; footColor="#0e7490"; footLabel="مكتمل — مقفل"; footIcon=true;
        p1="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"; p2="m9 12 2 2 4-4"; }
      else if(autoL){ c+=(sel?"solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);":"solid rgba(100,116,139,0.35);")+"background:var(--bg-a1001161390p08)";
        nameColor="#475569"; footColor="#475569"; footLabel=has?("انقضى — مقفل · "+has+"/"+mnd):"انقضى — بلا أرقام"; footIcon=true;
        p1="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"; p2=""; }
      else if(complete){ c+=(sel?"solid #0e7490;box-shadow:0 0 0 2px rgba(14,116,144,0.25);":"solid rgba(14,116,144,0.4);")+"background:var(--bg-a141161440p07)";
        nameColor="#0e7490"; footColor="#0e7490"; footLabel="مكتمل"; footIcon=true;
        p1="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"; p2="m9 12 2 2 4-4"; }
      else if(has){ c+=(sel?"solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);":"solid rgba(245,158,11,0.35);")+"background:var(--bg-a245158110p08)";
        nameColor=sel?"#b99751":"#b45309"; footColor="#b45309"; footLabel=has+"/"+mnd; footIcon=true;
        p1="M7 11V7a5 5 0 0 1 9.9-1"; p2="M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"; }
      else if(sel){ c+="solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"; nameColor="#b99751"; }
      else { c+="dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"; }
      let greg=""; try { greg=this.mStart(s.year,i).toLocaleDateString("ar-u-ca-gregory-nu-latn",{month:"long",year:"numeric"}); } catch(e){}
      const tip = appr ? "شهرٌ معتمدٌ ومغلق — نقرتان لفكّ الاعتماد"
        : autoL ? "شهرٌ منقضٍ مقفول — نقرتان لفتحه بأثر رجعي"
        : oflag&&past ? (has? "مفتوحٌ بأثر رجعي — نقرتان للاعتماد والإغلاق" : "مفتوحٌ بأثر رجعي — نقرتان لإعادة القفل")
        : complete ? "كلُّ أيّام الشهر مكتملةُ الحقول — "+KIVO.BassamCount(mnd,"يوم")+""
        : has ? KIVO.BassamCount(has,"يوم")+" "+KIVO.BassamCount.agr(has,"فيه","فيهما","فيها")+" أرقام من "+mnd+(allFull<has?" · "+(has-allFull)+" منها ناقصةُ الحقول":"")
        : past ? "الشهرُ انقضى ولا أرقامَ فيه" : "لا أرقام لهذا الشهر بعد";
      return { name:nm, greg:greg, nameColor:nameColor, footColor:footColor, footLabel:footLabel, footIcon:footIcon,
        footP1:p1, footP2:p2, isCurrent:cur, style:c, tip:tip,
        click:()=>self.setState({month:m,day:Math.min(s.day,self.dim(s.year,m)),draft:null}),
        /* الرحلةُ الرباعية على النقر المزدوج — لا فتحَ ولا قفلَ ولا اعتمادَ بصمت */
        dbl:()=>{ if(!canApprove){ self.bsToast("الاعتمادُ والقفل يحتاج صلاحية الاعتماد","warn"); return; }
          self.setState({month:m,day:Math.min(s.day,self.dim(s.year,m)),draft:null});
          if(appr) self.setState({lockAsk:{m:m,on:false,has:has}});
          else if(autoL) self.setState({retroAsk:{m:m,open:true}});
          else if(past&&oflag) self.setState(has?{lockAsk:{m:m,on:true,has:has}}:{retroAsk:{m:m,open:false}});
          else if(has) self.setState({lockAsk:{m:m,on:true,has:has}}); } };
    });

    const gA=this.gOf(s.year,s.month,1);
    const base=gA ? new Date(gA.getFullYear(),gA.getMonth(),gA.getDate(),12) : new Date();
    const dcards=rows.map(r=>{ const d=r.__d, cnt=flds.filter(f=>r[f.k]!=null).length;
      const state=cnt===0?"e":(cnt===flds.length?"c":"p");
      const sel=(d===s.day), today=(s.year===T.y&&s.month===T.m&&d===T.d);
      const fut=(s.year>T.y)||(s.year===T.y&&s.month>T.m)||(s.year===T.y&&s.month===T.m&&d>T.d);
      const dlk=self.dayLocked(site,s.year,s.month,d)||mLock;
      let bg="var(--bg-xffffff)", fg="var(--fg-x53565a)", bd="2px solid var(--bd-xe1e1e1)";
      if(state==="c"){ bg=(mApp?"#047857":(dlk?"#64748b":"#b99751")); fg="#fff"; bd="2px solid transparent"; }
      else if(state==="p"){ bg=(dlk?"rgba(148,163,184,0.45)":"rgba(185,151,81,0.55)"); fg="#fff"; bd="2px solid transparent"; }
      else if(fut){ bg="rgba(148,163,184,0.12)"; fg="var(--fg-x94a3b8)"; }
      else if(dlk){ bg="rgba(148,163,184,0.12)"; fg="var(--fg-x94a3b8)"; }
      if(sel) bd="2px solid #b99751";
      const gd=new Date(base.getTime()+86400000*(d-1));
      return { num:String(d), gnum:String(gd.getDate()), isToday:today,
        sepStyle:"display:block;width:9px;height:1px;flex-shrink:0;margin:1px 0;background:"+(state==="e"?"rgba(148,163,184,0.55)":"rgba(255,255,255,0.5)"),
        style:"position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:"+(sel?"900":"700")
          +";display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;user-select:none;background:"+bg+";color:"+fg+";border:"+bd
          +(sel?";box-shadow:var(--shadow-card);z-index:10":"")+(today&&!sel?";box-shadow:0 0 0 2px rgba(185,151,81,0.7)":""),
        tip:d+" "+this.MONTHS[s.month-1]+" "+s.year+" هـ — الموافق "+this.gLong(s.year,s.month,d)+" — "
          +(state==="c"?"مكتمل":(state==="p"?cnt+" من "+KIVO.BassamCount(flds.length,"حقل","g")+"":"لم يُدخل"))
          +(mLock?" · الشهرُ مقفل":(dlk?" · مقفل — نقرتان لفتحه":" · مفتوح — نقرتان لقفله")),
        click:()=>self.setState({day:d,draft:null}),
        /* قفلٌ صغيرٌ على الكرت يحكي حالتَه — كما في كروت أيام المتابعة اليومية */
        lockClosed:dlk, lockOpen:!dlk&&self.dPast(s.year,s.month,d)&&self.isDayOpen(site,s.year,s.month,d),
        /* لا قفلَ ولا فتحَ بصمت: نافذةٌ تشرح الأثرَ ثم تُنفّذ */
        dbl:(e)=>{ try{ e&&e.stopPropagation&&e.stopPropagation(); }catch(x){}
          if(mLock){ self.bsToast("الشهرُ مقفل — افتحه بأثر رجعي أوّلاً من كرت الشهر","warn"); return; }
          if(!canApprove){ self.bsToast("قفلُ اليوم وفتحُه يحتاج صلاحية الاعتماد","warn"); return; }
          self.setState({day:d,draft:null,retroAsk:{d:d,m:s.month,open:self.dayLocked(site,s.year,s.month,d)}}); } };
    });

    const cur=store[this.dk(s.year,s.month,s.day)]||{}, dr=s.draft||{};
    /* R182: اليومُ المقفل (أو شهرُه) تُقفل حقولُه كلُّها — تُعرض أرقامُه المحفوظة ولا يُكتب فيها، كما يُقفل الحفظ */
    /* R182 (أخو القفل): من لا يملك فعلَ هذا اليوم — «تعديل» ليومٍ فيه أرقام، أو «إضافة» ليومٍ فارغ (قاعدةُ الحفظ NEEDOF) —
       تُقفل حقولُه فيه ويقول السطرُ السبب، بدل حقلٍ يُكتب فيه ثم يُردّ حفظُه */
    const pNeed=this.NEEDOF(site,cur), pLock=canEdit&&!mLock&&!dLock&&!this.PC(pNeed,site);
    const fLock=!canEdit||mLock||dLock||pLock;
    const mkF=f=>({ label:f.l, tip:f.d||f.l, value:((!fLock&&(f.k in dr))?dr[f.k]:(cur[f.k]==null?"":cur[f.k])),
      p1:(this.IC[f.i]||["",""])[0], p2:(this.IC[f.i]||["",""])[1]||"",
      locked:fLock, set:(e)=>self.setField(f.k, e && e.target ? e.target.value : "") });
    const entN=flds.filter(f=>cur[f.k]!=null).length;
    const entBadge=entN===0?"لم يُدخل":(entN===flds.length?"مكتمل":"جزئي — "+entN+" من "+flds.length);
    const entBadgeStyle="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;border:1px solid "+
      (entN===flds.length?"rgba(0,132,80,0.35);color:var(--fg-x008450);background:var(--bg-a0132800p1)"
       :entN?"rgba(245,158,11,0.35);color:var(--fg-x92400e);background:var(--bg-a245158110p12)"
       :"rgba(148,163,184,0.35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)");

    const cols=[this.TH("التاريخ","date")].concat(flds.map(f=>this.TH(f.g?((f.g==="men"?"رجال ":"نساء ")+f.l):f.l, f.i))).concat([this.TH("الإجمالي","sum")]);
    const dataRows=rows.filter(r=>flds.some(f=>r[f.k]!=null)).reverse();
    /* الفلترةُ والبحثُ والترقيم — كما في سجلّ الاسترشاد والمضبوطات */
    /* R183 (الملاحظة ١٤): البحثُ يقبل الأرقامَ العربية والفارسية كالغربية — يُطوى الطرفان إلى 0-9 عند المقارنة وحدها */
    const q=KIVO.BassamFind.dig(String(s.lgSearch||"").trim());
    const shown=dataRows.filter(r=>{
      const n=flds.filter(f=>r[f.k]!=null).length;
      if(s.lgFs==="full"&&n<flds.length) return false;
      if(s.lgFs==="part"&&n>=flds.length) return false;
      if(!q) return true;
      /* البحثُ يعرف التاريخين بالأرقام واسمَ المُدخِل أيضاً */
      const hay=r.__d+" "+this.MONTHS[s.month-1]+" "+r.__d+"/"+s.month+"/"+s.year+" "+this.gTxt(s.year,s.month,r.__d)+" "+
        flds.map(f=>r[f.k]==null?"":String(r[f.k])).join(" ")+" "+
        flds.map(f=>{ const x=this.STOF(r,f.k); return x?String(x.n||""):""; }).join(" ");
      return KIVO.BassamFind.dig(hay).indexOf(q)>=0; });
    const per=+s.lgPer||0, total=shown.length;
    const pages=per>0?Math.max(1,Math.ceil(total/per)):1;
    const page=Math.min(Math.max(1,+s.lgPage||1),pages);
    const from=per>0?(page-1)*per:0, to=per>0?Math.min(total,from+per):total;
    const pageRows=shown.slice(from,to);
    /* R177: الصفّ = التاريخُ هجريّاً فوق ميلاديّ بالأرقام (خليّةُ سجلّ الاسترشاد) · كلُّ رقمٍ وتحته بصمتُه
       · الإجمالي · «إجراءات» (تعديل · حذف) بمكوّن المنصّة */
    /* R180: صفُّ السجل يومٌ فيه أرقام — فتغييرُه «تعديل» وحذفُه «حذف»، كلاهما على ورقة المسجد المعروض */
    const canDel=this.PC("del",site), canEd=this.PC("edit",site), actOn=canEd||canDel;
    const tblRows=pageRows.map(r=>{ const d=r.__d;
      return Object.assign({ d:String(d), hd:d+"/"+s.month+"/"+s.year, gd:this.gTxt(s.year,s.month,d),
        vals:flds.map(f=>this.VCELL(r,f.k)), tot:this.NM(this.TOT(site,r)) },
        this._rowMenu("lg"+s.year+"-"+s.month+"-"+d,[
          canEd?{name:"تعديل أرقام اليوم",color:"#b99751",p1:"M12 20h9",p2:"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",run:()=>self.lgEditDay(d)}:null,
          canDel?{name:"حذف أرقام اليوم",color:"#dc2626",danger:!0,p1:"M3 6h18",p2:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",run:()=>self.lgDelAsk(d)}:null ])); });
    const totRow=[this.TD("إجمالي "+this.MONTHS[s.month-1],{rtl:true,w:700,c:"var(--fg-x8a6f35)",nowrap:true})]
      .concat(flds.map(f=>this.TD(this.NM(this.ST(shown.map(r=>r[f.k])).total),{w:700})))
      .concat([this.TD(this.NM(this.ST(shown.map(r=>this.TOT(site,r))).total),{w:700,c:"var(--fg-x8a6f35)",fs:"12.5px"})]);

    return Object.assign({}, this.EMPTY_AN(), {
      viewEntry:true, viewAn:false,
      /* شريطُ تبويبٍ واحدٍ لا يعرض خياراً — قاعدةُ المنصّة: يختفي الإطارُ وتُعرض لوحتُه مباشرةً */
      siteTabs:siteTabs, siteTabsOn:siteTabs.length>1, isHaram:site==="haram", isNabawi:site==="nabawi",
      roSite:this.SN[site], lgCanExport:this.PC("export",site), lgCanClear:canDel&&!mLock&&!dLock,
      /* R190: «ملفات» لمن عنده بندٌ فيها — تصديرٌ أو استيرادٌ أو حذف */
      lgFilesOn:this.PC("export",site)||(canEdit&&!mLock&&!dLock)||(canDel&&!mLock&&!dLock),
      yearLabel: s.year+" هـ",
      gregRange: (()=>{ try { return this.mStart(s.year,0).getFullYear()+" – "+this.mStart(s.year,11).getFullYear()+" م"; } catch(e){ return ""; } })(),
      filledDays:String(filled), ...KIVO.BassamCount.pair("monthDays",String(nd),"يوم|مسجّل"),
      prevYear:()=>self.setState(p=>({year:p.year-1,draft:null})),
      nextYear:()=>self.setState(p=>({year:p.year+1,draft:null})),
      goToday:()=>self.setState({year:T.y,month:T.m,day:T.d,draft:null}),
      impXlsx:()=>self.impXlsx(), expXlsx:()=>self.expXlsx(),
      mcards:mcards, dcards:dcards,
      monthName:this.MONTHS[s.month-1], dayProg: KIVO.BassamCount(fullDays,"يوم|مكتمل")+" · "+filled+" "+KIVO.BassamCount.agr(filled,"فيه","فيهما","فيها")+" أرقام من "+nd,
      entTitle: s.day+" "+this.MONTHS[s.month-1]+" "+s.year+" هـ", entGreg:this.gLong(s.year,s.month,s.day),
      entBadge:entBadge, entBadgeStyle:entBadgeStyle,
      fields: site==="haram"? this.F.haram.map(mkF):[],
      fieldsMain: site==="nabawi"? this.F.nabawi.filter(f=>!f.g).map(mkF):[],
      fieldsMen: site==="nabawi"? this.F.nabawi.filter(f=>f.g==="men").map(mkF):[],
      fieldsWomen: site==="nabawi"? this.F.nabawi.filter(f=>f.g==="women").map(mkF):[],
      canEdit:canEdit&&!mLock&&!dLock, canSaveDay:canEdit&&!mLock&&!dLock&&!pLock, readOnly:!canEdit,
      lockOn:mLock||dLock||pLock, lockApproved:mApp, lockAuto:mAuto, lockDay:dLock,
      lockHint: mApp ? ("شهرُ "+this.MONTHS[s.month-1]+" معتمدٌ ومغلق — انقر كرتَ الشهر مرّتين لفكّ الاعتماد")
                     : mLock ? ("شهرُ "+this.MONTHS[s.month-1]+" انقضى وأُقفل تلقائياً — انقر كرتَ الشهر مرّتين لفتحه بأثر رجعي")
                     : pLock ? ("عرضٌ فقط — "+(pNeed==="edit"?"تعديلُ أرقامٍ قائمةٍ يحتاج صلاحية التعديل":"إدخالُ أرقام يومٍ جديدٍ يحتاج صلاحية الإضافة"))
                     : dPastSel ? "اليومُ انقضى — مقفل تلقائياً · عرضٌ فقط (نقرةٌ مزدوجةٌ على كرت اليوم لفتحه)"
                                : "اليومُ مقفلٌ يدوياً — عرضٌ فقط (نقرةٌ مزدوجةٌ على كرت اليوم لفتحه)",
      lockHintStyle: "display:flex;align-items:center;gap:9px;border-radius:12px;padding:10px 13px;margin-bottom:12px;font-size:11.5px;font-weight:600;font-family:'Cairo',sans-serif;border:1px solid "+
        (mApp?"rgba(0,132,80,0.3);background:var(--bg-a0132800p08);color:var(--fg-x047857)"
             :"rgba(100,116,139,0.3);background:var(--bg-a1001161390p08);color:var(--fg-x475569)"),
      lockHintP1: mApp?"M7 11V7a5 5 0 0 1 10 0v4":"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
      lockHintP2: mApp?"M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z":"",
      saveDay:()=>self.saveDay(),
      clearDraft:()=>{ const d={}; flds.forEach(f=>{ d[f.k]=""; }); self.setState({draft:d}); },
      rawdahBoxes:[],
      cols:cols, rows:tblRows, totRow:totRow, hasRows:tblRows.length>0, noRows:tblRows.length===0, lgActOn:actOn,
      logCount: KIVO.BassamCount(dataRows.length,"يوم")+" "+KIVO.BassamCount.agr(dataRows.length,"فيه","فيهما","فيها")+" أرقام من "+nd
    }, this._lgVals(site,total,pages,page,from,to), this._dlgVals(site,flds));
  }
}

