/* التنبيهات والتعاميم: سجل العرض والعمليات الخادمة المؤكدة.
 * الرسائل وحالات المستخدم والإعدادات ومنع التكرار ملك للخادم؛ الواجهة
 * تحتفظ بنموذج قراءة مؤقت في الذاكرة فقط وتنتظر ACK لكل تعديل. */
(function(){
  var I0 = KIVO.__BS_I; if (!I0) { I0 = {}; try { Object.defineProperty(KIVO, "__BS_I", { value: I0 }); } catch (e) { KIVO.__BS_I = I0; } }
  var I = I0.notif = {};
  /* F01: «mgr» مديرُ الوحدة التي وقع فيها الحدث — إدارةً كانت أو قسماً */
  var TO = { own:'صاحبه', lead:'رئيس الوردية', mgr:'مدير الإدارة أو القسم', sys:'مسؤول المنصة' };
  var LV = { info:'معلومة', act:'يحتاج إجراء', urg:'عاجل' };
  var CH = { bell:'الجرس', toast:'الجرس + توست فوري' };
  var KC = { emp:'#7c3aed', acct:'#dc2626', task:'#0e7490', cust:'#8b6a5a', staff:'#b45309', plan:'#0f8f80', ready:'#4d7c0f', rep:'#b45309', round:'#1d6fd6', kpi:'#9f1239', irshad:'#166534', box:'#475569', award:'#c9a227', perm:'#8A6F35', sec:'#dc2626', sys:'#334155', bc:'#1d6fd6' };
  var KN = { emp:'الموظفون', acct:'الحسابات', task:'المهام', cust:'العهد', staff:'الجدول', plan:'الميداني', ready:'الجاهزية', rep:'التقارير', round:'الجولات', kpi:'المؤشرات', irshad:'الاسترشاد', box:'المضبوطات', award:'الجائزة', perm:'الصلاحيات', sec:'الأمان', sys:'المنصة', bc:'التعاميم' };
  var KI = { emp:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', acct:'M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M3 21v-2a4 4 0 0 1 4-4h4M16 16l2 2 4-4', task:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', cust:'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2', staff:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', plan:'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4zM8 2v16M16 6v16', ready:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4l3 3', rep:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4', round:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01', kpi:'M3 3v18h18M7 14l4-4 4 4 5-5', irshad:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM16 8l-2 6-6 2 2-6z', box:'M21 8v13H3V8M1 3h22v5H1zM10 12h4', award:'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.2 13.9 7 23l5-3 5 3-1.2-9.1', perm:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', sec:'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
      sys:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z', bc:'M3 11l18-5v12L3 13v-2zM11.6 16.8a3 3 0 1 1-5.8-1.6' };
  function L(id,k,name,when,on,to,lvl,chan,txt,go){ return { id:id, k:k, name:name, when:when, on:on, to:to, lvl:lvl, chan:chan, txt:txt, go:go }; }
var REG = [
 {key:'emps',name:'موظفو الإدارة',icon:'👥',subs:[
  {name:'بيانات الموظفين',k:'emp',leaves:[
   L('emp_add','emp','إضافة موظف جديد','فور الإضافة',true,['mgr'],'info','bell','أُضيف {الاسم} ({النوع}) إلى موظفي الإدارة','افتح الموظفين'),
   L('emp_edit','emp','تعديل بيانات موظف','فور الحفظ',true,['own','mgr'],'info','bell','عُدّلت بياناتك: {الحقول} — بواسطة {المُعدّل}',''),
   L('emp_type','emp','تغيير نوع التوظيف','فور الحفظ',true,['own','mgr'],'info','bell','تغيّر {الحقل} إلى «{القيمة}»',''),
   L('emp_del','emp','حذف موظف','فور الحذف',true,['mgr','sys'],'act','bell','حُذف {الاسم} من الإدارة بواسطة {المُعدّل}','افتح سجل الحركة'),
   L('emp_gap','emp','بيانات ناقصة تمنع تفعيل الحساب','عند اكتشافها',false,['mgr'],'info','bell','{العدد} موظفاً بلا {الحقل} — يتعذّر تفعيل حساباتهم','افتح الموظفين'),
   L('emp_imp','emp','استيراد موظفين من ملف Excel','فور الاستيراد',true,['mgr','sys'],'info','bell','استُورد {المضافون} موظفاً جديداً وحُدّث {المحدثون} — بواسطة {المُعدّل}','افتح الموظفين'),
   L('emp_wipe','emp','حذف جميع الموظفين (تصفير شامل)','فور التنفيذ',true,['sys'],'urg','toast','حُذف كل موظفي إدارة {الإدارة} ونُظّفت بياناتها — بواسطة {المُعدّل}','افتح سجل الحركة')]},
  {name:'حساب الدخول',k:'acct',leaves:[
   L('acct_on','acct','تفعيل حساب دخولك','فور التفعيل',true,['own'],'info','toast','فُعّل حساب دخولك — اسم المستخدم {المستخدم}',''),
   L('acct_frz','acct','تجميد حساب / إعادة تفعيله','فور التغيير',true,['mgr','sys'],'act','bell','{الحالة} حساب {الاسم} بواسطة {المُعدّل}','افتح الموظفين'),
   L('acct_pw','acct','إعادة تعيين كلمة المرور','فور التعيين',true,['own','sys'],'act','bell','أُعيد تعيين كلمة مرورك بواسطة {المُعدّل} — غيّرها عند أول دخول',''),
   L('acct_mgr','acct','تعيين مدير إدارة أو إلغاؤه','فور التغيير',true,['own','sys'],'act','toast','{الفعل} مديراً لإدارة {الإدارة}',''),
   L('acct_bulk','acct','تجميد أو تفعيل جماعي للحسابات','فور التنفيذ',true,['mgr','sys'],'act','bell','{الفعل} {العدد} حساباً دفعة واحدة — بواسطة {المُعدّل}','افتح الموظفين'),
   L('acct_tpl','acct','منح قالب صلاحيات لموظف','فور المنح',true,['own'],'info','bell','مُنحت قالب «{القالب}» — {العدد} صفحات','')]},
  {name:'المهام',k:'task',leaves:[
   L('task_new','task','مهمة أُسندت إليك','فور الإسناد',true,['own'],'act','toast','أُسندت إليك «{المهمة}» — حتى {الوقت}','افتح المهمة'),
   L('task_soon','task','موعد المهمة يقترب','قبل الموعد بساعة',true,['own'],'act','toast','بقي {المدة} على «{المهمة}»','افتح المهمة'),
   L('task_late','task','مهمة متأخرة','عند تجاوز الموعد',true,['own','lead','mgr'],'urg','toast','تأخّرت «{المهمة}» المسندة إلى {الاسم} عن موعدها {الوقت}','افتح المهام'),
   L('task_done','task','إنجاز مهمة','فور الإنجاز',true,['mgr'],'info','bell','أنجز {الاسم} «{المهمة}»','افتح المهام'),
   L('task_chg','task','تعديل مهمة أو إلغاؤها أو إعادة إسنادها','فور التغيير',true,['own'],'act','bell','{الفعل} مهمة «{المهمة}» — {التفصيل}','افتح المهمة')]},
  {name:'عهد الموظفين',k:'cust',leaves:[
   L('cu_out','cust','تسليم عهدة','فور التسليم',true,['own'],'info','bell','سُلّمت لك عهدة «{العهدة}» ({الرقم}) — بتاريخ {التاريخ}','افتح العهد'),
   L('cu_in','cust','استرجاع عهدة','فور الاسترجاع',true,['own','mgr'],'info','bell','استُرجعت عهدة «{العهدة}» من {الاسم}',''),
   L('cu_late','cust','عهدة متأخرة الإرجاع','عند تجاوز الموعد',true,['own','mgr'],'act','bell','عهدة «{العهدة}» لدى {الاسم} تجاوزت موعد إرجاعها {التاريخ}','افتح العهد'),
   L('cu_lost','cust','عهدة تالفة أو مفقودة','فور التسجيل',true,['mgr','sys'],'urg','toast','سُجّلت عهدة «{العهدة}» {الحالة} — {الاسم}','افتح العهد'),
   L('cu_bond','cust','اعتماد سند تسليم / استلام','فور الاعتماد',true,['own','mgr'],'info','bell','اعتُمد سند {النوع} رقم {الرقم} — {العدد} أصناف','افتح السند'),
   L('cu_stock','cust','نفاد صنف من المستودع','عند آخر قطعة',true,['mgr'],'act','bell','لم يبقَ من «{الصنف}» قطع متاحة في المستودع','افتح المستودع')]}]},
 {key:'planning',name:'الخطة التشغيلية',icon:'🗓',subs:[
  {name:'الجدول الشهري',k:'staff',leaves:[
   L('st_shift','staff','تغيير وردية موظف في الجدول','فور الحفظ',true,['lead','mgr'],'info','bell','تغيّرت وردية {الاسم} في {الشهر} من {القديم} إلى {الجديد} — بواسطة {المُعدّل}','افتح الجدول الشهري'),
   L('st_rest','staff','تغيير أيام راحة موظف في الجدول','فور الحفظ',true,['lead','mgr'],'info','bell','أيام راحة {الاسم} في {الشهر} صارت: {الأيام} — بواسطة {المُعدّل}','افتح الجدول الشهري'),
   L('st_loc','staff','تغيير موقع موظف في الجدول','فور الحفظ',true,['lead','mgr'],'info','bell','موقع {الاسم} في {اليوم} صار «{الموقع}» بدل «{القديم}»','افتح الجدول الشهري'),
   L('st_leave','staff','تسجيل استئذان أو إجازة في الجدول','فور التسجيل',true,['lead','mgr'],'info','bell','سُجّل لـ{الاسم} {النوع} يوم {اليوم} بواسطة {المُعدّل}','افتح الجدول الشهري'),
   L('st_lead','staff','تعيين رئيس أو نائب في الجدول','فور التعيين',true,['lead','mgr'],'info','bell','عُيّن {الاسم} {الدور} لـ{الوردية} في {الشهر}','افتح الجدول الشهري'),
   L('st_pub','staff','نشر جدول شهر جديد','فور النشر',true,['lead','mgr'],'info','toast','نُشر جدول {الشهر} — {العدد} موظفاً موزَّعين','افتح الجدول الشهري'),
   L('st_lock','staff','اعتماد الشهر وقفله / فك الاعتماد','فور التغيير',true,['lead','mgr'],'info','bell','{الفعل} جدول {الشهر} بواسطة {المُعدّل}',''),
   L('st_gap','staff','نقص في تسكين وردية الغد','الساعة 16:00 يومياً',true,['lead','mgr'],'act','toast','الوردية {الوردية} غداً ينقصها {العدد} على المواقع الحرجة','افتح الجدول الشهري'),
   L('st_dup','staff','تعارض تسكين (موظف في موقعين)','عند الحفظ',true,['mgr'],'urg','toast','{الاسم} مسكّن في «{الموقع1}» و«{الموقع2}» يوم {اليوم}','افتح الجدول الشهري'),
   L('st_rest2','staff','تجاوز حدّ الراحات الأسبوعي','عند المحاولة',false,['lead','mgr'],'info','bell','محاولة منح راحة ثالثة في أسبوع لـ{الاسم} — رُفضت',''),
   L('st_shdef','staff','تعريف وردية أُضيف أو عُدّل أو حُذف','فور الحفظ',true,['lead','mgr'],'info','bell','{الفعل} وردية «{الوردية}» — {التفصيل} · بواسطة {المُعدّل}','افتح الإعدادات')]},
  {name:'التشغيل الميداني',k:'plan',leaves:[
   L('pl_chg','plan','تعديل الخطة الميدانية لموقع','فور الحفظ',true,['lead','mgr'],'info','bell','عُدّلت خطة «{الموقع}»: {التفصيل}','افتح التشغيل الميداني'),
   L('pl_cap','plan','تغيير سعة موقع أو إغلاقه','فور الحفظ',true,['lead','mgr'],'act','toast','{الموقع}: {التفصيل} بواسطة {المُعدّل}','افتح التشغيل الميداني'),
   L('pl_mark','plan','علامة أو مسار جديد','فور الإضافة',false,['lead'],'info','bell','أُضيف {النوع} «{الاسم}» في {الموقع}',''),
   L('pl_ok','plan','اعتماد الخطة الميدانية للشهر','فور الاعتماد',true,['lead','mgr'],'info','toast','اعتُمدت خطة {الشهر} وأُنشئت أول جولة — {العدد} موقعاً','افتح الجولات'),
   L('pl_place','plan','تسكينك على موقع في التشغيل الميداني','فور التسكين',true,['own','lead'],'act','toast','سُكِّنت على «{إلى}» في التشغيل الميداني — {الوقت} · {المُعدّل}','افتح صفحتي'),
   L('pl_move','plan','نقلك إلى موقع آخر على الخريطة','فور النقل',true,['own','lead'],'act','toast','نُقلت من «{من}» إلى «{إلى}» — {الوقت} · {المُعدّل}','افتح صفحتي'),
   L('pl_unplace','plan','رفع تسكينك من موقع','فور الرفع',true,['own','lead'],'info','bell','رُفع تسكينك من «{من}» في التشغيل الميداني — {الوقت} · {المُعدّل}','افتح صفحتي'),
   L('pl_sup','plan','رفع موظف إلى إشرافي / إعادته','فور التغيير',true,['own','mgr'],'info','bell','{الفعل}: {الاسم} — لا يُحسب في التغطية','')]},
  {name:'مؤشرات الجاهزية',k:'ready',leaves:[
   L('rd_low','ready','انخفاض الجاهزية تحت الحد','عند الحساب اليومي',true,['mgr'],'act','bell','جاهزية {الشهر} {النسبة}٪ — تحت الحد {الحد}٪ ({السبب})','افتح مؤشرات الجاهزية')]}]},
 {key:'daily',name:'المتابعة اليومية',icon:'📆',subs:[
  {name:'التقرير اليومي',k:'rep',leaves:[
   L('rep_pull','rep','سحب تقرير الوردية','فور السحب',true,['lead','mgr'],'info','bell','سُحب تقرير {الوردية} ليوم {اليوم} بواسطة {المُعدّل}','افتح التقرير'),
   L('rep_late','rep','تقرير مسحوب لم يُعتمد','قبل انتهاء الوردية بساعة',true,['lead','mgr'],'urg','toast','تقرير {الوردية} لم يُعتمد — تنتهي الوردية {الوقت}','افتح التقرير'),
   L('rep_ok','rep','اعتماد التقرير / فك الاعتماد','فور التغيير',true,['mgr'],'info','bell','{الفعل} تقرير {الوردية} · حضور {النسبة}٪','افتح التقرير'),
   L('rep_att','rep','تأشيرك في التقرير (غياب / تأخر / استئذان)','فور التأشير',true,['own'],'act','toast','أُشّر لك «{الحالة}» في تقرير {الوردية} {اليوم} — اعترض خلال 24 ساعة','افتح التقرير'),
   L('rep_diff','rep','تغيّر الجدول بعد سحب التقرير','عند الاكتشاف',true,['lead','mgr'],'act','bell','جدول {الوردية} تغيّر بعد سحب التقرير: {التفصيل}','افتح التقرير'),
   L('rep_here','rep','تسكينك اليوم في موقع مختلف','عند السحب',true,['own'],'act','toast','اليوم أنت في «{الموقع}» ({الوردية})','افتح التقرير'),
   L('rep_mv','rep','تحويلك إلى وردية أو موقع آخر من التقرير','فور التحويل',true,['own','lead'],'act','toast','حُوّلت إلى {الوردية} — «{الموقع}» بواسطة {المُعدّل}','افتح التقرير'),
   L('rep_today','rep','ورديتك اليوم (عند سحب التقرير)','فور السحب',true,['own'],'info','toast','ورديتك اليوم {الوردية} {الوقت} · القيادة: {القيادة}','افتح صفحتي'),
   L('rep_restday','rep','اليوم راحتك (عند سحب التقرير)','فور السحب',true,['own'],'info','bell','اليوم {اليوم} راحتك — لست على وردية {الوردية}','افتح صفحتي'),
   L('rep_rest','rep','تغيير أيام راحتك في التقرير','فور التغيير',true,['own','lead'],'act','toast','أيام راحتك في تقرير {الوردية} صارت: {الأيام} — بواسطة {المُعدّل}','افتح صفحتي'),
   L('rep_ap','rep','اعتماد تقرير ورديتك — حالتك','فور الاعتماد',true,['own'],'info','bell','اعتُمد تقرير {الوردية} ليوم {اليوم} — حالتك: {الحالة}','افتح صفحتي'),
   L('rep_quota','rep','اكتمال نصاب استئذانات الشهر (من التقارير)','عند التأشير',true,['own','lead','mgr'],'act','bell','{الاسم} بلغ نصاب الاستئذان لشهر {الشهر} ({العدد} من {الحد})','افتح التقرير'),
   L('rep_cont','rep','متابعة تقرير من يوم سابق','فور المتابعة',false,['mgr'],'info','bell','تقرير {الوردية} تُوبع من تقرير يوم {اليوم}','افتح التقرير'),
   L('rep_lead','rep','تغيير قيادة الوردية في التقرير','فور التغيير',true,['own','mgr'],'act','bell','{الدور} {الوردية} اليوم: {الاسم}','افتح التقرير')]},
  {name:'الجولات اليومية',k:'round',leaves:[
   L('rn_start','round','بدء جولة / إغلاقها','فور التغيير',false,['mgr'],'info','bell','{الفعل} جولة {الوردية} بواسطة {المُعدّل}','افتح الجولات'),
   L('rn_red','round','موقع بعجز كامل (أحمر)','عند تأشير الجولة',true,['lead','mgr'],'urg','toast','«{الموقع}» بلا تغطية في جولة {الوقت}','افتح الخريطة'),
   L('rn_full','round','اكتمال تغطية كل المواقع','عند التأشير',true,['mgr'],'info','bell','اكتملت تغطية {العدد} موقعاً في جولة {الوقت}',''),
   L('rn_loc','round','موقعك في جولة اليوم','فور التسكين أو التغيير',true,['own','lead'],'act','toast','{الفعل} {الموقع} — جولة {اليوم}','افتح صفحتي'),
   L('rn_close','round','إغلاق موقعك في الجولة','فور الإغلاق',true,['own','lead'],'act','toast','أُغلق موقعك «{الموقع}» في جولة {اليوم} — راجع رئيس الوردية لموقعك الجديد','افتح صفحتي'),
   L('fd_obs','round','رصد ميداني: حالة موقع أو مساره','فور الرصد',true,['own','lead','mgr'],'act','toast','{الموظف} رصد {الباب}: {الحالة}{السبب} — {الوقت}','افتح الجولات')]},
  {name:'مؤشرات المتابعة',k:'kpi',leaves:[
   L('kp_att','kpi','الحضور الفعلي تحت النسبة المحددة','عند الاعتماد',true,['mgr'],'act','bell','حضور {الوردية} {النسبة}٪ — تحت الحد {الحد}٪','افتح المؤشرات'),
   L('kp_occ','kpi','إشغال مصلى تجاوز الحد','عند التسجيل',true,['lead','mgr'],'urg','toast','إشغال «{المصلى}» {النسبة}٪','افتح الإشغال')]}]},
 {key:'irshad',name:'نظام الاسترشاد',icon:'🧭',subs:[
  {name:'السجلات',k:'irshad',leaves:[
   L('ir_new','irshad','محضر استرشاد جديد','فور الحفظ',false,['mgr'],'info','bell','محضر {الرقم}: {العدد} مستفيداً · {الموقع} · {الموظف}','افتح السجلات'),
   L('ir_edit','irshad','تعديل أو حذف محضر','فور التغيير',true,['mgr'],'act','bell','{الفعل} محضر {الرقم} بواسطة {المُعدّل}','افتح السجلات'),
   L('ir_day','irshad','ملخص اليوم','نهاية اليوم 23:30',true,['mgr'],'info','bell','اليوم: {المحاضر} محضراً · {المستفيدون} مستفيداً · أعلى موقع {الموقع}','افتح لوحة المؤشرات')]}]},
 {key:'seized',name:'نظام المضبوطات',icon:'📦',subs:[
  {name:'السجلات',k:'box',leaves:[
   L('bx_new','box','محضر مضبوطات جديد','فور الحفظ',false,['mgr'],'info','bell','محضر {الرقم}: {القطع} قطعة · {الموقع} · {الموظف}','افتح السجلات'),
   L('bx_sec','box','محضر بإحالة أمنية','فور الحفظ',true,['mgr','sys'],'urg','toast','محضر {الرقم}: {البند} أُحيل للجهة الأمنية من {الموظف}','افتح المحضر'),
   L('bx_cash','box','مبلغ نقدي أو قيمة تتجاوز الحد','فور الحفظ',true,['mgr'],'act','toast','محضر {الرقم}: {المبلغ} ريال — يتجاوز حد {الحد}','افتح المحضر'),
   L('bx_upd','box','تحديث إجراء بند','فور التحديث',true,['mgr'],'info','bell','محضر {الرقم}: {البند} {من} ← {إلى} بواسطة {المُعدّل}','افتح المحضر'),
   L('bx_del','box','حذف محضر','فور الحذف',true,['mgr','sys'],'act','bell','حُذف محضر {الرقم} بواسطة {المُعدّل}','افتح سجل الحركة')]},
  {name:'المستودع',k:'box',leaves:[
   L('bx_old','box','قطع تجاوزت 30 يوماً بلا إجراء','الساعة 09:00 يومياً',true,['mgr'],'act','bell','{العدد} قطعة محفوظة بلا إجراء منذ أكثر من {الأيام} يوماً','افتح السجلات'),
   L('bx_wk','box','ملخص المستودع الأسبوعي','السبت 08:00',false,['mgr'],'info','bell','بالمستودع {العدد} قطعة · أقدمها {الأيام} يوماً · قيمة تقديرية {المبلغ} ريال','افتح لوحة المؤشرات')]}]},
 {key:'award',name:'جائزة التميز',icon:'🏅',subs:[
  {name:'الترشيحات',k:'award',leaves:[
   L('aw_new','award','ترشيح بانتظار الاعتماد','فور التقديم',true,['mgr'],'act','bell','ترشيح {الاسم} قدّمه {المرشِّح} بانتظار اعتمادك','افتح الترشيح'),
   L('aw_res','award','اعتماد ترشيحك أو رفضه','فور القرار',true,['own'],'info','toast','{القرار} ترشيحك لجائزة {الجائزة}','افتح الترشيح'),
   L('aw_pub','award','إعلان النتائج','فور الإعلان',true,['own','lead','mgr'],'info','toast','أُعلنت نتائج {الجائزة} — {التفصيل}','افتح لوحة النتائج'),
   L('aw_ref','award','تحديث المراجع المعتمدة','فور الحفظ',true,['lead','mgr'],'info','bell','حُدّث قسم «{القسم}» في المراجع المعتمدة','افتح المراجع'),
   L('aw_del','award','حذف ترشيح','فور الحذف',true,['own','mgr'],'act','bell','حُذف ترشيح {الاسم} بواسطة {المُعدّل}','')]}]},
 {key:'account',name:'الحساب والأمان',icon:'🔐',subs:[
  {name:'الأمان',k:'sec',leaves:[
   L('sc_dev','sec','دخول من جهاز جديد','فور الدخول',true,['own'],'act','toast','{الجهاز} — إن لم يكن أنت فأنهِ الجلسة','الأمان'),
   L('sc_fail','sec','محاولات دخول فاشلة متكررة','5 محاولات في دفعة، أو 3 عناوين مختلفة على حساب واحد خلال ساعة',true,['own','sys'],'urg','toast','{العدد} محاولات فاشلة على حساب {الاسم} من {IP}','سجل الأمن'),
   L('sc_pw','sec','تغيير كلمة المرور','فور التغيير',true,['own'],'info','bell','غُيّرت كلمة مرورك من {الجهاز}',''),
   L('sc_kill','sec','إنهاء جلساتك من مسؤول المنصة','فور الإنهاء',true,['own'],'act','toast','أُنهيت جلساتك الأخرى بواسطة {المُعدّل}',''),
   L('sc_deny','sec','محاولة كتابة مرفوضة من الخادم','فور الرفض',true,['sys'],'act','bell','رفض الخادم كتابة {المفتاح} من {الاسم} — السبب: {السبب}','سجل الأمن'),
   L('sc_guard','sec','قفل حارس الدخول / فكه','فور التغيير',true,['sys'],'urg','toast','{الفعل} حارس الدخول — {التفصيل}','سجل الأمن'),
   L('sc_policy','sec','تغيير سياسة الأمان','فور الحفظ',true,['sys'],'act','bell','غُيّرت سياسة الأمان: {التفصيل} — بواسطة {المُعدّل}','الأمن'),
   L('sc_rk','sec','مفتاح الاستعادة أُنشئ / استُخدم','فور الحدث',true,['sys'],'urg','toast','{الفعل} مفتاح الاستعادة من {IP} — {النتيجة}','الأمن')]},
  {name:'الصلاحيات',k:'perm',leaves:[
   L('pm_chg','perm','تغيّرت صلاحياتك','فور التغيير',true,['own'],'info','toast','{الفعل} {الصفحات} — بواسطة {المُغيّر}',''),
   L('pm_cap','perm','تغيّر سقف صفحات الإدارة','فور التغيير',true,['mgr'],'act','bell','سقف إدارتك: {الفعل} {الصفحات} — بواسطة مسؤول المنصة','افتح الصلاحيات'),
   L('pm_tpl','perm','قالب صلاحيات أُنشئ أو عُدّل أو حُذف','فور الحفظ',true,['mgr'],'info','bell','{الفعل} قالب «{القالب}» — {التفصيل} · بواسطة {المُعدّل}','افتح الإعدادات')]}]},
 {key:'sys',name:'الإدارة والمنصة',icon:'⚙️',subs:[
  {name:'الإدارات',k:'sys',leaves:[
   L('sy_dept','sys','إنشاء إدارة أو قسم / تعيين مديرها','فور التغيير',true,['sys'],'info','bell','{الفعل}: {الإدارة} — {التفصيل}',''),
   L('sy_wipe','sys','مسح بيانات إدارة','فور المسح',true,['sys'],'urg','toast','مُسحت بيانات إدارة {الإدارة} بواسطة {المُعدّل}','افتح سجل الحركة'),
   L('sy_ddel','sys','حذف إدارة أو قسم أو إدارة عامة','فور الحذف',true,['sys'],'urg','toast','حُذفت {النوع} «{الإدارة}» — بواسطة {المُعدّل}','افتح الإدارات'),
   L('sy_bkacc','sys','حساب احتياطي لمسؤول المنصة أُنشئ / حُذف','فور التغيير',true,['sys'],'act','bell','{الفعل} الحساب الاحتياطي «{المستخدم}»','الأمن'),
   L('sy_mods','sys','إطفاء وحدة أو تفعيلها على مستوى المنصة','فور الحفظ',true,['mgr'],'act','toast','{الفعل} وحدة «{الوحدة}» لكل المنصة — بواسطة مسؤول المنصة',''),
   L('sy_plat','sys','تغيير إعدادات المنصة (الهوية، الدخول، القوائم)','فور النشر',true,['sys'],'info','bell','نُشرت إعدادات المنصة: {التفصيل}','المنصة')]},
  {name:'النسخ الاحتياطي والمزامنة',k:'sys',leaves:[
   L('sy_bk','sys','نسخة احتياطية أُنشئت / استيراد بيانات','فور التنفيذ',true,['sys'],'info','bell','{الفعل} بواسطة {المُعدّل} — {الحجم}','النسخة الاحتياطية'),
   L('sy_nobk','sys','لم تُنشأ نسخة احتياطية منذ 7 أيام','فحص يومي 08:00',true,['sys'],'act','toast','آخر نسخة احتياطية منذ {الأيام} يوماً','النسخة الاحتياطية'),
   L('sy_sync','sys','انقطاع المزامنة مع الخادم','بعد 5 دقائق انقطاع',true,['own','sys'],'urg','toast','تعذّر الحفظ في الخادم منذ {المدة} — تعديلاتك محفوظة محلياً',''),
   L('sy_ver','sys','إصدار جديد من المنصة','عند النشر',true,['own'],'info','toast','نُشر الإصدار {الإصدار} — {الجديد}','ما الجديد')]}]},
 {key:'bc',name:'التعاميم',icon:'📣',subs:[
  {name:'التعاميم',k:'bc',leaves:[
   L('bc_new','bc','تعميم جديد','فور الإرسال',true,['own'],'info','toast','{العنوان}','افتح التعميم'),
   L('bc_rem','bc','تذكير بتعميم لم تقرأه','بعد 24 ساعة',true,['own'],'act','bell','لم تقرأ بعد: «{العنوان}»','افتح التعميم'),
   L('bc_ack','bc','تعميم يتطلب تأكيدك','فور الإرسال',true,['own'],'act','toast','«{العنوان}» يتطلب تأكيد القراءة','قرأت وفهمت'),
   L('bc_wd','bc','سحب تعميم','فور السحب',false,['own'],'info','bell','سُحب تعميم «{العنوان}» — لم يعد سارياً','')]}]}
];
  var LEAVES = []; var LEAF_OF = {};
  REG.forEach(function(c){ c.subs.forEach(function(s){ s.leaves.forEach(function(l){ l.page = c.key; l.sub = s.name; LEAVES.push(l); LEAF_OF[l.id] = l; }); }); });
  /* أين تُفتح كل صفحة من زر «افتح» */
  var GO_NAV = { 'افتح الموظفين':'employees', 'افتح المهمة':(function(){ try { var u = KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user(); return u && u.role === 'staff' && !u.mgr ? 'profile' : 'tasks'; } catch(e){ return 'tasks'; } })(), 'افتح المهام':'tasks', 'افتح العهد':'employees', 'افتح السند':'employees', 'افتح المستودع':'employees', 'افتح الجدول الشهري':'staffing', 'افتح التشغيل الميداني':'plan', 'افتح الجولات':'daily', 'افتح الخريطة':'daily', 'افتح مؤشرات الجاهزية':'kpis', 'افتح التقرير':'dreport', 'افتح المؤشرات':'kpis', 'افتح الإشغال':'kpis', 'افتح السجلات':'seized', 'افتح المحضر':'seized', 'افتح لوحة المؤشرات':'kpis', 'افتح الترشيح':'award', 'افتح لوحة النتائج':'award', 'افتح المراجع':'award', 'الأمان':'profile', 'سجل الأمن':'sysadmin', 'الأمن':'sysadmin', 'افتح الصلاحيات':'employees', 'افتح سجل الحركة':'admin', 'النسخة الاحتياطية':'admin', 'افتح الإعدادات':'admin', 'افتح الإدارات':'sysadmin', 'المنصة':'sysadmin', 'ما الجديد':'help', 'افتح صفحتي':'profile', 'افتح التعميم':'',
      'قرأت وفهمت':'' };

  var GO_KPI = { 'افتح مؤشرات الجاهزية': ['planning', 'readiness'], 'افتح المؤشرات': ['daily', 'kpiDaily'], 'افتح الإشغال': ['daily', 'kpiOcc'], 'افتح لوحة المؤشرات': ['seized', 'dash'] };
  var RAW = { get: Storage.prototype.getItem, set: Storage.prototype.setItem };
  function rawGet(k){ try { return RAW.get.call(localStorage, k); } catch(e){ return null; } }
  function rawSet(k, v){ try { RAW.set.call(localStorage, k, v); } catch(e){} }
  function J(s, d){ if (s == null) return d; try { var v = JSON.parse(s); return v == null ? d : v; } catch(e){ return d; } }
  /* قارئُ وقتِ النسخة الواحد: النسخُ الحديثة تكتب ISO، والقديمةُ رقمَ ملّي.
     كان الحسابُ يقسر النصَّ رقماً (+"2026-09-19T…" = NaN) فيصير صفراً،
     فتُقرأ نسخةٌ أُخذت اليومَ كأنها لم تُؤخذ قط. */
  function bkTime(v){
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s9 = String(v).trim();
    if (/^\d+$/.test(s9)) { var n9 = +s9; return isFinite(n9) ? n9 : 0; }
    var t9 = Date.parse(s9);
    return isFinite(t9) ? t9 : 0;
  }
  KIVO.BassamBkTime = bkTime;
  var D = function(){ return KIVO.BassamDepts; }, A = function(){ return KIVO.BassamAuth; }, P = function(){ return KIVO.BassamPerm; };
  function me(){ try { return A() && A().user ? A().user() : null; } catch(e){ return null; } }
  function isSuper(){ var u = me(); return !!(u && u.role === 'super'); }
  function myDept(){ try { return D().active(); } catch(e){ return ''; } }
  function isMgr(){ var u = me(); return !!(u && (u.role === 'dept' || u.role === 'gm' || (u.role === 'staff' && u.mgr))); }
  var HMON = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
  function monLbl(mk){ var m = /^(\d{3,4})[-\/](\d{1,2})$/.exec(String(mk || '')); return m && HMON[+m[2] - 1] ? HMON[+m[2] - 1] + ' ' + m[1] + ' هـ' : String(mk || ''); }
  /* R183 (الملاحظة ١٢): «{العدد} قطعة» في نصّ التنبيه ← صيغةُ العدّ للعدد الفعلي، والصفةُ التالية تتبعه؛
     وبعد حرف الجرّ المثنى مجرور («منذ يومين»). غيرُ العدد («{الفعل} مهمة») يبقى كما هو. */
  var CNT_ADJ = { 'موظف': { 'جديداً': 'موظف|جديد', 'موزَّعين': 'موظف|موزَّع' }, 'قطعة': { 'محفوظة': 'قطعة|محفوظة' }, 'محاولة': { 'فاشلة': 'محاولة|فاشلة' } };
  var CNT_PREP = { 'من': 1, 'منذ': 1, 'في': 1, 'قبل': 1, 'بعد': 1, 'على': 1, 'عن': 1, 'إلى': 1, 'خلال': 1 };
  var _cntIdx = null;
  function cntIdx(){
    if (_cntIdx) return _cntIdx; _cntIdx = {};
    try { var F = KIVO.BassamCount && KIVO.BassamCount.forms; Object.keys(F || {}).forEach(function(k){ if (k.indexOf('|') !== -1 || k.indexOf(' ') !== -1) return; F[k].forEach(function(w){ if (w.indexOf(' ') === -1 && !_cntIdx[w]) _cntIdx[w] = k; }); }); } catch(e){}
    return _cntIdx;
  }
  function cntFill(s, vars){
    try {
      var BC = KIVO.BassamCount; if (!BC || !vars) return s;
      var ix = cntIdx();
      return s.replace(/(^|[\s(«—·•])\{([^}]+)\}\s([\u0621-\u064A\u064B-\u0652\u0640]+)(\s[\u0621-\u064A\u064B-\u0652\u0640]+)?/g, function(m0, lead, k, w, adj, off, all){
        var v = vars[k] != null ? vars[k] : vars['{' + k + '}'];
        var key = ix[w]; if (v == null || v === '' || !key || !isFinite(BC.num(v))) return m0;
        var prev = String(all.slice(0, off + lead.length)).trim().split(/\s+/).pop() || '';
        var mode = CNT_PREP[prev] ? 'g' : '';
        var a = adj ? adj.trim() : '', pk = a && CNT_ADJ[key] && CNT_ADJ[key][a];
        return lead + (pk ? BC(v, pk, mode) : BC(v, key, mode) + (adj || ''));
      });
    } catch(e){ return s; }
  }
  function fill(txt, vars){ var s = cntFill(String(txt || ''), vars); Object.keys(vars || {}).forEach(function(k){ var kk = k.charAt(0) === '{' ? k : '{' + k + '}'; s = s.split(kk).join(String(vars[k] == null ? '' : vars[k])); });
    /* حقلٌ لم يُملأ لا يترك شرطةً معلّقة: تُحذف الأقواس والفواصل الفارغة */
    s = s.replace(/\{[^}]+\}/g, '').replace(/\s*\(\s*\)/g, '').replace(/(?:\s*[·•]|\s+-)\s*(?=([·•]|-\s|—|–|$))/g, ' ').replace(/^\s*(?:[·•—–]\s*|-\s+)|(?:\s*[·•—–]|\s+-)\s*$/g, '').replace(/\s{2,}/g, ' ').trim();
    return s; }

  /* ═══ الإطلاق: يمرّ بالإعدادات ثم يُكتب للمستهدفين ═══
     opts: { own:[ekeys], vars:{}, title, dept, once (مفتاح عدم التكرار), link, at } */
  /* الدفعة ٥ — التنبيه يحترم سقف الإدارة: الحدث الذي مجاله خارج سقف الإدارة لا يُولَّد أصلاً */
  function goOk(x){
    try {
      var nav = x && x.go ? (GO_NAV[x.go] || '') : ''; if (!nav) return true;
      var u = me(); if (!u) return false;
      if (u.role === 'super' || nav === 'profile' || nav === 'help') return true;
      if (nav === 'sysadmin') return false;
      if (nav === 'admin') return isMgr();
      var Pm = P(); if (!Pm || !Pm.can) return true;
      /* KIVO_261 (المراجعةُ المستقلة · الشجرةُ = المنصة): لوحاتُ المؤشرات تُعرض في «مؤشرات الإدارة» وحدها (offPage) — فزرُّ «افتح» يذهب إليها ويُحكم بلوحته */
      if (nav === 'kpis') { var KP = GO_KPI[x.go]; return !!(KP && Pm.kpiPanelOk ? Pm.kpiPanelOk(KP[0], KP[1]) : false); }
      return !!Pm.can((Pm.NAV2PERM && Pm.NAV2PERM[nav]) || nav, 'view');
    } catch(e){ return true; }
  }

  function depts(){ try { return D().list() || []; } catch(e){ return []; } }
  function deptName(did){ var d = depts().filter(function(x){ return x.id === did; })[0]; return d ? d.name : ''; }
  /* Server-owned notifications. This read model is page-memory only; no business
     document, per-user state, configuration, or dedup marker is written to Storage. */
  var view = null, generation = 0, readEpoch = 0, refreshFlight = null, manageFlight = null, eventQueue = [], eventTimer = null;
  function principal(){
    var b = window.__BS_BOOT, u = me();
    return b && b.srv === 1 && b.cf === 1 && b.uid && u && String(u.id) === String(b.uid) ? String(b.uid) : '';
  }
  function current(){
    var uid = principal(), dept = myDept();
    if (!view || view.uid !== uid || view.dept !== dept) {
      generation++;
      readEpoch++;
      view = { uid:uid, dept:dept, rev:null, configRev:null, broadcastRev:null, query:{all:false,filter:'all',kinds:[]},next:'',pages:0,hasUpdates:false,counters:null,bcNext:'',bcTotal:0,bcReady:false,bcLoading:false,items:[], cfg:{t:{}}, broadcasts:[], stats:{}, ready:false, loading:false, error:'' };
      refreshFlight = null; manageFlight=null;
    }
    return { uid:uid, dept:dept, generation:generation };
  }
  function same(c){ var n = current(); return !!c.uid && n.uid === c.uid && n.dept === c.dept && n.generation === c.generation; }
  function event(name, detail){ try { window.dispatchEvent(new CustomEvent(name, { detail:detail || {} })); } catch(e){} }
  function failed(message, c){
    var text = message || 'تعذّر تأكيد العملية — حاول مجددًا';
    if (same(c)) { view.error = text; event('bassam:notif-error', { message:text }); }
    try { console.warn('[notifications] request was not acknowledged'); } catch(e){}
    return { ok:0, err:text };
  }
  function validRev(v){ return Number.isSafeInteger(v) && v >= 0; }
  async function request(path, body, c){
    if (!c.uid || !same(c)) return { ok:0, err:'انتهت جلسة التنبيهات أو تغيّر نطاقها' };
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var tm = ctl ? setTimeout(function(){ ctl.abort(); }, 15000) : null;
    try {
      var r = await fetch(path, Object.assign({ credentials:'same-origin', cache:'no-store', signal:ctl ? ctl.signal : undefined }, body ? {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.assign({uid:c.uid}, body))
      } : {}));
      var j = await r.json();
      if (!same(c)) return { ok:0, err:'تغيّرت الجلسة أو الإدارة قبل وصول التأكيد' };
      if (r.status === 401 || (j && j.err === 'session-changed')) {
        view.items=[]; view.broadcasts=[]; view.stats={}; view.cfg={t:{}}; view.ready=false; view.rev=null; view.configRev=null; view.broadcastRev=null;
        view.counters=null;view.next='';view.pages=0;view.hasUpdates=false;view.bcNext='';view.bcTotal=0;view.bcReady=false;
        var expired=failed('انتهت الجلسة — سجّل الدخول',c);
        generation++; readEpoch++; refreshFlight=null;
        event('bassam:notif',{refreshed:true,expired:true});
        return expired;
      }
      if (!r.ok || !j || j.ok !== 1 || !validRev(j.rev)) return failed(j && typeof j.err === 'string' ? j.err : 'تعذّر تأكيد العملية — حاول مجددًا', c);
      return j;
    } catch(e){ return failed('لا اتصال — حاول مجددًا بعد قليل', c); }
    finally { if (tm) clearTimeout(tm); }
  }
  function itemShape(x){ return !!(x && typeof x.id === 'string' && x.id && typeof x.t === 'string' && typeof x.b === 'string' && typeof x.at === 'number' && Number.isFinite(x.at)); }
  function status(){ current(); return {ready:view.ready,loading:view.loading,error:view.error,rev:view.rev,configRev:view.configRev,broadcastRev:view.broadcastRev,next:view.next,hasUpdates:view.hasUpdates,counters:view.counters ? JSON.parse(JSON.stringify(view.counters)) : null,bcNext:view.bcNext,bcTotal:view.bcTotal,bcReady:view.bcReady,bcLoading:view.bcLoading}; }
  function validCounters(c){ return !!c && ['total','unread','actionable','urgentUnread','unreadAll','pendingAck'].every(function(k){return validRev(c[k]);}) && c.byKind && typeof c.byKind === 'object' && !Array.isArray(c.byKind); }
  function feedURL(c,more,summary){
    var q=view.query;
    return '/api/notifications?uid='+encodeURIComponent(c.uid)+'&dept='+encodeURIComponent(c.dept)+'&all='+(q.all ? 1 : 0)+'&limit=200&filter='+encodeURIComponent(q.filter)+'&kinds='+encodeURIComponent(q.kinds.join(','))+(more ? '&cursor='+encodeURIComponent(view.next) : '')+(summary ? '&summary=1' : '');
  }
  async function refresh(options){
    options=options || {};
    var c=current();
    if (!c.uid) return {ok:0,err:'جلسة مطلوبة'};
    var query=Object.assign({},view.query);
    if (options.all != null) query.all=!!options.all;
    if (options.filter != null) query.filter=options.filter;
    if (options.kinds) query.kinds=options.kinds.slice().sort();
    var queryChanged=JSON.stringify(query)!==JSON.stringify(view.query);
    if (queryChanged) {readEpoch++;refreshFlight=null;view.query=query;view.items=[];view.next='';view.pages=0;view.ready=false;view.counters=null;}
    var more=!!options.more;
    if (more && !view.next) return {ok:1,rev:view.rev};
    if (refreshFlight) return refreshFlight;
    view.loading=true;event('bassam:notif',{loading:true,changed:false});
    var ticket=readEpoch,expected=more ? view.rev : null;
    var task=(async function(){
      var j=await request(feedURL(c,more,false),null,c);
      if (ticket!==readEpoch) return {ok:0,superseded:true};
      if (!j.ok) return j;
      if (!Array.isArray(j.items) || j.items.length>200 || !j.items.every(itemShape) || !validCounters(j.counters) || !j.cfg || !j.cfg.t || typeof j.cfg.t !== 'object' || Array.isArray(j.cfg.t) || !validRev(j.configRev) || !validRev(j.broadcastRev) || (j.next && typeof j.next !== 'string')) return failed('تعذّر عرض التنبيهات الآن',c);
      if ((expected!=null && j.rev!==expected) || (view.rev!=null && j.rev<view.rev) || (view.configRev!=null && j.configRev<view.configRev) || (view.broadcastRev!=null && j.broadcastRev<view.broadcastRev)) return failed('وصلت تنبيهات جديدة — اعرض الجديد',c);
      var items=more ? view.items.concat(j.items) : j.items,unique=Object.create(null);
      if (items.some(function(x){if(unique[x.id])return true;unique[x.id]=1;return false;})) return failed('تعذّر عرض التنبيهات الآن',c);
      if (!same(c)) return {ok:0,err:'تغيّر نطاق التنبيهات'};
      var initial=!view.ready,changed=view.rev!==j.rev;
      view.items=items;view.cfg=j.cfg;view.counters=j.counters;view.next=j.next || '';view.pages=more ? view.pages+1 : 1;
      view.rev=j.rev;view.configRev=j.configRev;view.broadcastRev=j.broadcastRev;view.ready=true;view.error='';view.hasUpdates=false;
      event('bassam:notif',{refreshed:true,initial:initial,more:more,queryChanged:queryChanged,changed:changed,rev:view.rev});
      return {ok:1,rev:view.rev};
    })();
    refreshFlight=task;
    try{return await task;}finally{if(same(c) && refreshFlight===task){refreshFlight=null;view.loading=false;}}
  }
  function loadMore(){return refresh({more:true});}
  async function poll(){
    var c=current();if(!c.uid)return {ok:0};
    if(!view.ready)return refresh();
    var ticket=readEpoch,j=await request(feedURL(c,false,true),null,c);
    if(ticket!==readEpoch || !same(c))return {ok:0,superseded:true};
    if(!j.ok)return j;
    if(!validCounters(j.counters) || j.rev<view.rev)return failed('تعذّر عرض التنبيهات الآن',c);
    view.counters=j.counters;
    if(j.rev!==view.rev){
      if(view.pages<=1)return refresh();
      view.hasUpdates=true;
    }
    event('bassam:notif',{counters:true,changed:false,rev:view.rev});
    return {ok:1,rev:j.rev};
  }
  async function refreshManagement(options){
    options=options || {};
    var c=current();if(!c.uid || !isSuper())return {ok:0,err:'لمسؤول المنصة فقط'};
    var more=!!options.more;
    if(more && !view.bcNext)return {ok:1,rev:view.rev};
    if(manageFlight)return manageFlight;
    view.bcLoading=true;event('bassam:notif',{management:true,loading:true,changed:false});
    var previous=more ? view.broadcastRev : null;
    var task=(async function(){
      var q='/api/notifications?uid='+encodeURIComponent(c.uid)+'&dept='+encodeURIComponent(c.dept)+'&manage=1&limit=1'+(more ? '&bcCursor='+encodeURIComponent(view.bcNext) : '');
      var j=await request(q,null,c);
      if(!j.ok)return j;
      if(!Array.isArray(j.broadcasts) || j.broadcasts.length>25 || !j.stats || typeof j.stats!=='object' || !validRev(j.bcTotal) || !validRev(j.broadcastRev) || (j.bcNext && typeof j.bcNext!=='string') || (previous!=null && j.broadcastRev!==previous) || (view.broadcastRev!=null && j.broadcastRev<view.broadcastRev))return failed('تعذّر استكمال سجل التعاميم — حدّثه',c);
      view.broadcasts=more ? view.broadcasts.concat(j.broadcasts) : j.broadcasts;
      view.stats=Object.assign({},more ? view.stats : {},j.stats);view.bcNext=j.bcNext || '';view.bcTotal=j.bcTotal;view.bcReady=true;view.broadcastRev=j.broadcastRev;
      event('bassam:notif',{management:true,changed:false});return {ok:1,rev:j.rev};
    })();
    manageFlight=task;
    try{return await task;}finally{if(same(c) && manageFlight===task){manageFlight=null;view.bcLoading=false;}}
  }
  function loadMoreBroadcasts(){return refreshManagement({more:true});}
  function list(opts){
    var c = current(); if (!c.uid || !view.ready) return [];
    var all = !!(opts && opts.all), sup = isSuper();
    return view.items.filter(function(x){
      if (x.exp && x.exp < Date.now()) return false;
      if (x.at > Date.now()) return false;
      return !sup || all || !x.dept || x.dept === c.dept || x.k === 'sys' || x.k === 'sec' || x.isBc;
    }).map(function(x){return JSON.parse(JSON.stringify(x));}).sort(function(a,b){ return ((b.pin && b.un) ? 1 : 0) - ((a.pin && a.un) ? 1 : 0) || b.at - a.at; });
  }
  function unread(){ return list().filter(function(x){ return x.un; }).length; }
  function cfg(){ current(); return JSON.parse(JSON.stringify(view.cfg)); }
  function typeOf(id){ current(); var l = LEAF_OF[id]; if (!l) return null; var o = view.cfg.t[id] || {}; return { id:id, k:l.k, page:l.page, sub:l.sub, name:l.name, when:l.when, on:o.on != null ? !!o.on : l.on, to:Array.isArray(o.to) ? o.to.slice() : l.to.slice(), lvl:o.lvl || l.lvl, chan:o.chan || l.chan, txt:typeof o.txt === 'string' ? o.txt : l.txt, go:l.go, isDef:!Object.keys(o).length }; }
  function types(){ return LEAVES.map(function(l){ return typeOf(l.id); }); }
  async function act(body, needsBase){
    var c = current();
    if (needsBase && (!view.ready || view.rev == null)) { var ready = await refresh(); if (!ready.ok) return ready; }
    if (!same(c)) return { ok:0, err:'تغيّر نطاق العملية' };
    var feedBase=view.rev, resource=body.op === 'config' ? 'configRev' : 'broadcastRev';
    if (needsBase) body = Object.assign({base:view[resource]}, body);
    var j = await request('/api/notifications/act', body, c);
    if (!j.ok) return j;
    if ((body.op === 'broadcast' || body.op === 'dept-broadcast') &&
        (typeof j.id !== 'string' || !j.id || !Number.isSafeInteger(j.n) || j.n < 0)) return failed('تأكيد إرسال التعميم غير مكتمل',c);
    if ((body.op === 'remind' || body.op === 'withdraw' || (body.op === 'state' && /-all$/.test(body.action))) &&
        (!Number.isSafeInteger(j.n) || j.n < 0)) return failed('تأكيد عدد التنبيهات غير مكتمل',c);
    if (feedBase != null && j.rev < feedBase) return failed('تأكيد التنبيهات أقدم من العملية المطلوبة', c);
    if (needsBase && (!validRev(j[resource]) || j[resource] < body.base)) return failed('تأكيد مراجعة مورد التنبيهات غير مكتمل',c);
    if (needsBase) view[resource]=Math.max(view[resource],j[resource]);
    view.rev = view.rev == null ? j.rev : Math.max(view.rev, j.rev);
    readEpoch++; refreshFlight = null;
    // A successful mutation stays acknowledged if the subsequent read fails.
    // The cache is replaced only by a complete authoritative response.
    var pulled = await refresh();
    if (needsBase && resource === 'broadcastRev' && same(c)) await refreshManagement();
    if (!same(c)) return {ok:0,err:'تغيّرت الجلسة أو الإدارة قبل تحديث الشاشة'};
    return Object.assign({}, j, !pulled.ok ? { refreshError:pulled.err } : {});
  }
  function setCfg(patch,base){ return act(Object.assign({op:'config',patch:patch || {}},validRev(base) ? {base:base} : {}), true); }
  function resetCfg(){ return act({op:'config',patch:{},reset:true}, true); }
  function state(action, id, opts){ return act(Object.assign({op:'state',action:action,dept:myDept(),all:!!(opts && opts.all)}, id ? {id:id} : {}, opts && opts.onlyRead ? {onlyRead:true} : {})); }
  function markRead(id){ return state('read',id); }
  function ack(id){ return state('ack',id); }
  function dismiss(id){ return state('dismiss',id); }
  function markAll(opts){ return state('read-all',null,opts); }
  function dismissAll(onlyRead,opts){ return state('dismiss-all',null,Object.assign({},opts || {},{onlyRead:!!onlyRead})); }
  function bcAll(){ current(); return JSON.parse(JSON.stringify(view.broadcasts)); }
  function bcStats(id){ current(); var s = view.stats[id]; return s ? Object.assign({},s) : {n:0,read:0,ack:0,unreadCount:0}; }
  function bcSend(b){ return act({op:'broadcast',b:b},true); }
  function bcPreviewMe(b){ return act({op:'broadcast',b:b,preview:true},true); }
  function bcSendDept(b){ return act({op:'dept-broadcast',dept:myDept(),b:b}); }
  function bcWithdraw(id){ return act({op:'withdraw',id:id},true); }
  function bcRemind(id){ return act({op:'remind',id:id},true); }
  function targets(target){ return request('/api/notifications/act',{op:'targets',target:target},current()); }
  function securityPoll(){ return act({op:'security-poll'}); }
  function bcDue(){ return poll(); }
  async function exportDomain(dept){
    var c = current(), j = await request('/api/notifications/export?uid=' + encodeURIComponent(c.uid) + (dept ? '&dept=' + encodeURIComponent(dept) : ''),null,c);
    if (!j.ok) return j;
    if (!j.domain || j.domain.version !== 1 || !['messages','targets','states','dedup','overrides'].every(function(k){ return Array.isArray(j.domain[k]); })) return failed('نسخة التنبيهات غير مكتملة',c);
    return j;
  }
  function emit(type, opts){
    opts = opts || {};
    if (!LEAF_OF[type]) return Promise.resolve({ok:0,err:'نوع التنبيه غير معروف'});
    var c = current(), payload = {type:type};
    ['dept','own','vars','title','once','link','at'].forEach(function(k){ if (opts[k] != null) payload[k] = opts[k]; });
    try {payload=JSON.parse(JSON.stringify(payload));} catch(e) {return Promise.resolve(failed('تعذّر تجهيز حدث التنبيه',c));}
    return new Promise(function(resolve){
      eventQueue.push({payload:payload,context:c,resolve:resolve});
      if (!eventTimer) eventTimer = setTimeout(flushEvents,0);
    });
  }
  async function flushEvents(){
    if (eventTimer) clearTimeout(eventTimer); eventTimer = null;
    var batch = eventQueue.splice(0,100);
    if (!batch.length) return;
    var c = batch[0].context, live = batch.filter(function(x){ return same(x.context) && x.context.uid === c.uid && x.context.dept === c.dept; });
    batch.filter(function(x){return live.indexOf(x) === -1;}).forEach(function(x){x.resolve({ok:0,err:'تغيّرت جلسة التنبيه'});});
    if (live.length) {
      var result = await act(live.length === 1 ? Object.assign({op:'emit'},live[0].payload) : {op:'emit-batch',events:live.map(function(x){return x.payload;})});
      live.forEach(function(x){x.resolve(result);});
    }
    if (eventQueue.length && !eventTimer) eventTimer = setTimeout(flushEvents,0);
  }
  /* Device-only preference; never a source of messages or server read state. */
  function muteGet(){ try { return rawGet('bassam_notif_mute_v1') === '1'; } catch(e){ return false; } }
  function muteSet(v){ rawSet('bassam_notif_mute_v1',v ? '1' : '0'); }

  I.CH=CH; I.D=D; I.GO_NAV=GO_NAV; I.J=J; I.KC=KC; I.KI=KI; I.KN=KN; I.LEAVES=LEAVES; I.LV=LV; I.P=P; I.REG=REG; I.TO=TO;
  I.ack=ack; I.act=act; I.bcAll=bcAll; I.bcDue=bcDue; I.bcPreviewMe=bcPreviewMe; I.bcRemind=bcRemind; I.bcSend=bcSend; I.bcSendDept=bcSendDept; I.bcStats=bcStats; I.bcWithdraw=bcWithdraw;
  I.bkTime=bkTime; I.cfg=cfg; I.deptName=deptName; I.depts=depts; I.dismiss=dismiss; I.dismissAll=dismissAll; I.emit=emit; I.exportDomain=exportDomain; I.fill=fill; I.flushEvents=flushEvents; I.goOk=goOk;
  I.isMgr=isMgr; I.isSuper=isSuper; I.list=list; I.markAll=markAll; I.markRead=markRead; I.me=me; I.monLbl=monLbl; I.muteGet=muteGet; I.muteSet=muteSet; I.myDept=myDept;
  I.rawGet=rawGet; I.rawSet=rawSet; I.refresh=refresh; I.poll=poll; I.loadMore=loadMore; I.refreshManagement=refreshManagement; I.loadMoreBroadcasts=loadMoreBroadcasts; I.resetCfg=resetCfg; I.securityPoll=securityPoll; I.setCfg=setCfg; I.status=status; I.targets=targets; I.typeOf=typeOf; I.types=types; I.unread=unread;
})();
