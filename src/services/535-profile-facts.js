/* ═══ KIVO_264 · «ملفي» — خدمةُ حقائق الموظف الذاتية (KIVO.BassamProfileFacts) — نقيّةٌ بلا تخزينٍ ولا اعتمادٍ على خدماتٍ أخرى ═══
   القواعدُ المشتركة (PF-CORE) نصٌّ واحدٌ حرفاً مع الخادم (workers/parts/062b-me-history.js — /api/me/today · /api/me/history) فلا تختلف
   «ملفي» محلياً عمّا يعيده الخادم: الربطُ بمعرّفٍ ثابت (لا اسم) · مصدرُ الموقع (الشهريُّ المعتمد + تسكينُ اليوم بطبقةٍ مستقلة) · ترشيحُ الزملاء ·
   طبقتا «أسبوعك» (المجدول والفعلي بلا سقوطٍ إلى شهرٍ آخر) · نموذجُ عرض «السجل» بوسم الدليل لكل عنصر. يختبرها tests/unit/profile_facts.test.mjs. */
(function () {
/* ══ PF-CORE:BEGIN — قواعدُ «ملفي» المشتركة (KIVO_264). النصُّ نفسُه حرفاً في workers/parts/062b-me-history.js (الخادم: /api/me/today ·
   /api/me/history) وفي src/services/535-profile-facts.js (الواجهة) — يثبت التطابقَ tests/unit/profile_facts.test.mjs. دوالٌّ نقيّة بلا تخزين.
   القواعد: (١) الربطُ بمعرّفٍ ثابت وحده (ekey = eid، وللحسابات القديمة nid — OD-9) والاسمُ ممنوعٌ أبداً · (٢) اليومُ المسحوبُ تقريرُه مكتفٍ بتقريره لمن
   ورد فيه، ومن لم يرد فيه تُقرأ حقائقُه من الجدول الشهري · (٣) الإسنادُ الرسمي = خطةُ الشهر المعتمدة، وتسكينُ جولة اليوم طبقةٌ مستقلة، والمسودةُ لا تُعرض
   موقعاً (OD-5) · (٤) الزملاء: العنصرُ نفسُه · ورديةُ اليوم نفسُها · ليسوا في راحة · لا غياب ولا إجازة ولا تحويل — بالاسم وحده (OD-4) ·
   (٥) الورديةُ الليلية تتبع يومَ بدئها (OD-10 — افتراضٌ موثَّق) · (٦) التوقيتُ توقيتُ الرياض (UTC+3 بلا توقيتٍ صيفي). ══ */
var PF_WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
var PF_KINDS = ['gates', 'zones', 'marks'];
var PF_EP = Date.UTC(622, 6, 19, 12);
var PF_HF = null;
function pfNoAl(s) { return String(s == null ? '' : s).replace(/^ال/, ''); }
function pfRestOn(rest, wd) {
  var w = pfNoAl(wd), i;
  if (!w || !Array.isArray(rest)) return false;
  for (i = 0; i < rest.length; i++) if (pfNoAl(rest[i]) === w) return true;
  return false;
}
function pfIsMgrKey(k) { return String(k == null ? '' : k).slice(0, 4) === 'mgr:'; }
function pfHas(list, toks) {
  var i;
  if (!Array.isArray(list)) return false;
  for (i = 0; i < list.length; i++) if (list[i] != null && toks.indexOf(String(list[i])) !== -1) return true;
  return false;
}
/* الحسابُ ← سجلُّ الموظف: { rec, by: 'eid' | 'nid' | 'none' } — تطابقٌ وحيدٌ وإلا «غيرُ مرتبط» */
function pfLink(u, emps) {
  var a = [], b = [], i, e, k;
  if (!u || u.role !== 'staff' || u.ekey == null || u.ekey === '' || pfIsMgrKey(u.ekey) || !Array.isArray(emps)) return { rec: null, by: 'none' };
  k = String(u.ekey);
  for (i = 0; i < emps.length; i++) {
    e = emps[i];
    if (!e || typeof e !== 'object') continue;
    if (e.eid != null && String(e.eid) === k) a.push(e);
    else if (e.nid != null && String(e.nid).trim() !== '' && String(e.nid).trim() === k) b.push(e);
  }
  if (a.length === 1) return { rec: a[0], by: 'eid' };
  if (!a.length && b.length === 1) return { rec: b[0], by: 'nid' };
  return { rec: null, by: 'none' };
}
/* رموزُ المطابقة داخل البيانات: eid ثم nid للسجل المرتبط · والحسابُ غيرُ المرتبط بمفتاحه نفسِه إن كان معرّفاً لا اسماً
   رقمُ الهوية رمزٌ فقط إن تفرّد في سجلّ الإدارة: المكرَّرُ (خطأُ إدخال) لا يُسند صفوفَ زميلٍ إلى أحد — ومفتاحُ غيرِ المرتبط
   لا يُقرأ به إن طالب به سجلٌّ (اسماً أو eid أو nid): لو تفرّد لارتبط، فبلوغُ هذا الموضع معه = التباس ⇒ لا شيء (مراجعةُ SR-2.1 · F-1)
   KIVO_265 · M-2: رقمُ الهوية رمزٌ إن لم يحمله سجلٌّ آخر في الحقلين معاً (eid ∪ nid) — رقمُ هويةِ سجلّي المساوي لمعرّف زميلٍ ثابت (خطأُ إدخال)
   كان يُعطيني جدولَه وتقريرَه. والمعرّفُ الثابت يبقى أولاً (OD-9 — قاعدةُ 264) */
function pfTokN(emps, v) {
  var c = 0, i, e;
  for (i = 0; i < (emps || []).length; i++) { e = emps[i]; if (e && typeof e === 'object' && ((e.eid != null && String(e.eid) === v) || (e.nid != null && String(e.nid).trim() === v))) c++; }
  return c;
}
function pfTokens(u, rec, emps) {
  var t = [], k, i, n, e;
  if (rec) {
    if (rec.eid != null && String(rec.eid) !== '') t.push(String(rec.eid));
    n = rec.nid != null ? String(rec.nid).trim() : '';
    if (n !== '' && t.indexOf(n) === -1 && pfTokN(emps, n) < 2) t.push(n);
    return t;
  }
  if (!u || u.role !== 'staff' || u.ekey == null || u.ekey === '' || pfIsMgrKey(u.ekey)) return t;
  k = String(u.ekey);
  if (/\s/.test(k)) return t;
  for (i = 0; i < (emps || []).length; i++) {
    e = emps[i];
    if (!e || typeof e !== 'object') continue;
    if ((e.name != null && String(e.name) === k) || (e.eid != null && String(e.eid) === k) || (e.nid != null && String(e.nid).trim() === k)) return t;
  }
  t.push(k);
  return t;
}
function pfEntry(bucket, toks) {
  var i;
  for (i = 0; i < toks.length; i++) if (bucket && bucket[toks[i]] && typeof bucket[toks[i]] === 'object') return bucket[toks[i]];
  return null;
}
function pfMins(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s == null ? '' : s).trim()); return m ? 60 * +m[1] + +m[2] : null; }
function pfRiyadhMins(ts) { return Math.floor((((ts + 3 * 3600000) % 86400000) + 86400000) % 86400000 / 60000); }
/* التاريخُ الهجري (أم القرى) لِلحظةٍ بتوقيت الرياض + اسمُ يوم الأسبوع */
function pfHijriAt(ts) {
  var o = {}, d = new Date(ts + 3 * 3600000);
  if (!PF_HF) PF_HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
  PF_HF.formatToParts(new Date(ts)).forEach(function (p) { o[p.type] = +p.value; });
  return { y: o.year, m: o.month, d: o.day, ym: o.year + '-' + o.month, dk: o.year + '-' + o.month + '-' + o.day, wd: PF_WD[d.getUTCDay()] };
}
/* أيامُ الشهر الهجري: [{ d, wd }] — بمسحٍ حول تقديرٍ ميلادي (لا جداولَ تحويل) */
function pfMonthDays(y, m) {
  var c = PF_EP + Math.round(((y - 1) * 12 + (m - 1)) * 29.530588853) * 86400000, out = [], k, ts, h;
  for (k = -25; k <= 45; k++) {
    ts = c + k * 86400000; h = pfHijriAt(ts - 3 * 3600000);
    if (h.y === y && h.m === m) out.push({ d: h.d, wd: h.wd });
  }
  return out;
}
function pfDef(bucket, name, opts) {
  var L = bucket && Array.isArray(bucket.__shifts) && bucket.__shifts.length ? bucket.__shifts : null, src = L ? 'month' : 'current', i;
  if (!L) L = Array.isArray(opts) ? opts : [];
  for (i = 0; i < L.length; i++) if (L[i] && name && L[i].name === name) return { tStart: L[i].tStart || '', tEnd: L[i].tEnd || '', src: src };
  return null;
}
/* حقائقُ يومٍ واحد: الجدولُ (bucket) + تقريرُ اليوم (rep) + اسمُ يوم الأسبوع */
function pfDay(o) {
  var toks = o.toks || [], bucket = o.bucket || {}, rep = o.rep || null, wd = o.wd || '';
  var ent = pfEntry(bucket, toks), sh = rep && rep.shifts && typeof rep.shifts === 'object' ? rep.shifts : {};
  var pulled = Object.keys(sh).filter(function (s) { return sh[s] && sh[s].pulled; }), row = null;
  var mine = function (k) { return k != null && toks.indexOf(String(k)) !== -1; };
  pulled.forEach(function (s) {
    (sh[s].roster || []).forEach(function (r) { if (r && mine(r.ekey)) row = { st: r.st || 'pr', sh: s, kind: r.st === 'pm' ? (r.pmk || '') : r.st === 'lv' ? (r.lvk || '') : '' }; });
  });
  Object.keys(sh).forEach(function (s) {
    (sh[s] && sh[s].roster || []).forEach(function (r) { if (r && r.tin && mine(r.ekey)) row = { st: r.st || 'pr', sh: s, tin: 1, tfrom: r.tfrom || '', kind: '' }; });
  });
  if (!row) pulled.forEach(function (s) {
    var to = sh[s].tout && typeof sh[s].tout === 'object' ? sh[s].tout : {};
    Object.keys(to).forEach(function (k) { if (!row && mine(k)) row = { st: 'tout', sh: s, to: (to[k] && to[k].to) || '', kind: '' }; });
  });
  var fromRep = function (field) {
    var order = row && row.sh && sh[row.sh] ? [row.sh] : [], v = null;
    order.forEach(function (s) {
      var m0 = sh[s] && sh[s][field] && typeof sh[s][field] === 'object' ? sh[s][field] : {}, j;
      for (j = 0; j < toks.length && v === null; j++) if (Object.prototype.hasOwnProperty.call(m0, toks[j])) v = m0[toks[j]];
    });
    return v;
  };
  var restR = fromRep('rest'), mukR = fromRep('muk'), restSrcR = fromRep('restSrc');
  var schedRest = ent && Array.isArray(ent.rest) ? ent.rest.slice() : [];
  var rest = row && Array.isArray(restR) ? restR.slice() : schedRest;
  var restToday = pfRestOn(rest, wd) && !(row && row.st && row.st !== 'pr');
  var name = row ? row.sh : (ent && ent.shift) || '', sr = row ? sh[row.sh] : null;
  var def = sr && sr.def && (sr.def.tStart || sr.def.tEnd) ? { tStart: sr.def.tStart || '', tEnd: sr.def.tEnd || '', src: 'report' } : pfDef(bucket, name, o.opts);
  return {
    known: !!(ent || row),
    cs: ent && typeof ent.cs === 'string' ? ent.cs.trim() : '',
    shift: { name: name, src: row ? 'report' : name ? 'schedule' : 'none', sched: (ent && ent.shift) || '', def: def },
    rest: { days: rest, sched: schedRest, today: restToday, src: row && Array.isArray(restR) ? 'report' : ent ? 'schedule' : 'none', dayChanged: !!row && restSrcR === 'day' },
    muk: { v: row && mukR != null ? mukR === true : !!(ent && ent.muk === true), src: row && mukR != null ? 'report' : ent ? 'schedule' : 'none' },
    status: { code: restToday ? 'rest' : row ? row.st : '', st: row ? row.st : '', src: row ? 'report' : 'none', to: (row && row.to) || '', tin: !!(row && row.tin), tfrom: (row && row.tfrom) || '', kind: (row && row.kind) || '' },
    report: { any: pulled.length > 0, mine: !!row, approved: !!(sr && sr.pulled && sr.ap), sh: row ? row.sh : '' }
  };
}
/* اليومُ التشغيلي: الورديةُ الليلية (نهايتُها ≤ بدايتها) التي بدأت أمس ولم تنتهِ بعد تجعل «اليوم» يومَ بدئها (OD-10) */
function pfOpDay(ts, dayOf) {
  var C = pfHijriAt(ts), P = pfHijriAt(ts - 86400000), f = dayOf ? dayOf(P) : null, df = f && f.shift ? f.shift.def : null;
  var a = pfMins(df && df.tStart), b = pfMins(df && df.tEnd), n = pfRiyadhMins(ts);
  if (f && f.shift.name && !f.rest.today && a != null && b != null && b <= a && n < b) { P.op = 'night'; return P; }
  C.op = 'calendar';
  return C;
}
function pfFloors(v) { return v ? (Array.isArray(v) ? v : Array.isArray(v.d) ? v.d : null) : null; }
/* عناصرُ الموظف في مواقعَ (طوابق): ترتيبٌ حتميّ — الموقع ثم الأبواب فالمصليات فالمعالم ثم الفهرس */
function pfEls(floors, toks) {
  var out = [];
  (Array.isArray(floors) ? floors : []).forEach(function (f, fi) {
    if (!f || typeof f !== 'object') return;
    PF_KINDS.forEach(function (kind) {
      (Array.isArray(f[kind]) ? f[kind] : []).forEach(function (el, i) { if (el && pfHas(el.emp, toks)) out.push({ fi: fi, kind: kind, i: i, el: el, floor: f }); });
    });
  });
  return out;
}
function pfLabel(kind, el) {
  if (kind === 'marks') return String(el.label || el.kind || 'معلم');
  if (kind === 'zones') return String(el.code || el.name || 'مصلى');
  var n = String(el.pOf ? (el.label || el.num || '') : (el.num || '')).trim(), t = el.pOf ? '' : String(el.label || el.name || '').trim();
  return (n ? 'باب ' + n : 'باب') + (t ? ' — ' + t : '');
}
function pfShort(kind, el) {
  if (kind !== 'gates') return pfLabel(kind, el);
  var n = String(el.pOf ? (el.label || el.num || '') : (el.num || '')).trim();
  return n ? 'باب ' + n : 'باب';
}
function pfClosed(x) { return x.kind === 'gates' ? !!x.el.closed : !!x.el.off; }
function pfSiteOut(x) {
  return { fi: x.fi, kind: x.kind, i: x.i, uid: String(x.el.uid || x.el.eid || ''), label: pfLabel(x.kind, x.el), short: pfShort(x.kind, x.el),
    floor: String(x.floor.name || ('الموقع ' + (x.fi + 1))), sid: String(x.floor.sid || ''), loc: String((x.kind === 'zones' ? x.el.region || x.el.yard : x.el.loc) || ''),
    closed: pfClosed(x) };
}
function pfSame(a, b) { return !!(a && b && a.kind === b.kind && (a.uid && b.uid ? a.uid === b.uid : a.fi === b.fi && a.i === b.i)); }
/* الموقع: الإسنادُ الرسمي (خطةُ الشهر — الموقعُ المعتمد) · المسودة · تسكينُ جولة اليوم (المغلقُ أولاً) */
function pfSite(o) {
  var toks = o.toks || [], plan = o.plan && typeof o.plan === 'object' ? o.plan : {}, pmd = pfFloors(plan.months && o.ym ? plan.months[o.ym] : null);
  var off = [], dr = [], rd = o.round && Array.isArray(o.round.d) ? o.round.d : null, td = rd ? pfEls(rd, toks) : [];
  pfEls(pmd, toks).forEach(function (x) { (x.floor.approved === true ? off : dr).push(x); });
  td.sort(function (a, b) { return (pfClosed(b) ? 1 : 0) - (pfClosed(a) ? 1 : 0); });
  var O = off.length ? pfSiteOut(off[0]) : null, D = dr.length ? pfSiteOut(dr[0]) : null, R = td.length ? pfSiteOut(td[0]) : null;
  return { official: O, officialN: off.length, draft: D, draftN: dr.length, today: R, todayN: td.length, same: pfSame(O, R), plan: !!pmd, round: !!rd, planYm: o.ym || '',
    els: { official: off.length ? off[0].el : null, today: td.length ? td[0].el : null, todayAll: td } };
}
/* زملاءُ الموقع (OD-4): بالاسم وحده — لا مفاتيح ولا حالاتِ حضور */
function pfMates(o) {
  var el = o.el, toks = o.toks || [], emps = Array.isArray(o.emps) ? o.emps : [], by = {}, seen = {}, out = [];
  if (!el || !Array.isArray(el.emp) || !o.myShift) return out;
  emps.forEach(function (e) {
    if (!e || typeof e !== 'object') return;
    if (e.eid != null && e.eid !== '') by['e:' + e.eid] = e;
    if (e.nid != null && String(e.nid).trim() !== '') by['n:' + String(e.nid).trim()] = e;
  });
  el.emp.forEach(function (t) {
    if (t == null || toks.indexOf(String(t)) !== -1) return;
    var e = by['e:' + t] || by['n:' + t], ct, f, id;
    if (!e) return;
    ct = pfTokens(null, e, emps); id = ct.join('|');
    if (seen[id] || pfHas(ct, toks)) return;
    f = pfDay({ bucket: o.bucket, rep: o.rep, toks: ct, wd: o.wd, opts: o.opts });
    if (f.shift.name !== o.myShift || f.rest.today) return;
    if (f.status.st === 'ab' || f.status.st === 'lv' || f.status.st === 'tout') return;
    seen[id] = 1;
    if (String(e.name || '').trim()) out.push(String(e.name).trim());
  });
  return out;
}
/* «أسبوعك»: سبعةُ أيامٍ تنتهي باليوم التشغيلي، بطبقتين — المجدول (جدولُ شهر ذلك اليوم وحده؛ null = لا جدول — بلا سقوطٍ إلى شهرٍ آخر) والفعلي (تقريرُ اليوم إن ورد فيه) */
function pfWeek(o) {
  var out = [], t, T, bk, ent, f, toks = o.toks || [];
  for (t = 6; t >= 0; t--) {
    T = pfHijriAt(o.end - t * 86400000); bk = (o.staffing && o.staffing[T.ym]) || {}; ent = pfEntry(bk, toks);
    f = pfDay({ bucket: bk, rep: (o.dreport && o.dreport[T.dk]) || null, toks: toks, wd: T.wd, opts: o.opts });
    out.push({ dk: T.dk, ym: T.ym, d: T.d, m: T.m, y: T.y, wd: T.wd, today: t === 0, sched: ent ? pfRestOn(ent.rest, T.wd) : null,
      act: f.report.mine ? { code: f.status.code, approved: f.report.approved } : null, any: f.report.any });
  }
  return out;
}
/* إحصاءُ الشهر من التقارير اليومية التي ورد فيها الموظف وحده */
function pfMon(o) {
  var c = { pr: 0, ab: 0, pm: 0, lv: 0, tout: 0, n: 0, ap: 0 }, pre = o.ym + '-', toks = o.toks || [], bk = (o.staffing && o.staffing[o.ym]) || {};
  Object.keys(o.dreport || {}).forEach(function (k) {
    if (k.indexOf(pre) !== 0 || !/^\d+$/.test(k.slice(pre.length))) return;
    var f = pfDay({ bucket: bk, rep: o.dreport[k], toks: toks, wd: '', opts: o.opts });
    if (!f.report.mine) return;
    c.n++; if (f.report.approved) c.ap++;
    if (c[f.status.st] != null) c[f.status.st]++;
  });
  return c;
}
/* سجلُّ شهرٍ واحد من الحالة المحفوظة — كلُّ عنصرٍ بفئة دليله (saved_approved · saved_open · derived · current · none) */
function pfHist(o) {
  var toks = o.toks || [], ym = o.ym, bucket = (o.staffing && o.staffing[ym]) || {}, ent = pfEntry(bucket, toks);
  var locked = !!(o.locks && o.locks[ym] === true), def = ent && ent.shift ? pfDef(bucket, ent.shift, o.opts) : null;
  var month = { has: !!ent, locked: locked, shift: (ent && ent.shift) || '', rest: ent && Array.isArray(ent.rest) ? ent.rest.slice() : [], muk: ent ? ent.muk === true : null,
    def: def ? { tStart: def.tStart, tEnd: def.tEnd } : null, defEv: def ? (def.src === 'month' ? (locked ? 'saved_approved' : 'saved_open') : 'current') : 'none', ev: ent ? (locked ? 'saved_approved' : 'saved_open') : 'none' };
  var days = [], runs = [], last = null, nRep = 0, nAp = 0, nRnd = 0, upto = o.upto == null ? 31 : o.upto;
  (o.days || []).forEach(function (x) {
    var dk = ym + '-' + x.d, f = pfDay({ bucket: bucket, rep: (o.dreport && o.dreport[dk]) || null, toks: toks, wd: x.wd, opts: o.opts });
    var row = { d: x.d, wd: x.wd, sched: { rest: ent ? pfRestOn(ent.rest, x.wd) : null, shift: (ent && ent.shift) || '' }, act: null, rep: 'none', ev: x.d > upto ? 'future' : 'none' };
    if (x.d <= upto && f.report.mine) {
      row.act = { st: f.status.st, kind: f.status.kind, sh: f.shift.name, rest: f.rest.src === 'report' ? pfRestOn(f.rest.days, x.wd) : null, restSrc: f.rest.dayChanged ? 'day' : f.rest.src === 'report' ? 'sched' : '',
        muk: f.muk.src === 'report' ? f.muk.v : null, to: f.status.to, tin: f.status.tin, tfrom: f.status.tfrom };
      row.rep = f.report.approved ? 'approved' : 'pulled'; row.ev = f.report.approved ? 'saved_approved' : 'saved_open';
      nRep++; if (f.report.approved) nAp++;
    }
    days.push(row);
    var r = x.d <= upto && o.rounds ? o.rounds[dk] : null, sa, src, els, key, s0, ev;
    if (!r || !Array.isArray(r.d)) { last = null; return; }
    nRnd++;
    sa = f.shift.name && r.shAp && r.shAp[f.shift.name] ? r.shAp[f.shift.name] : null;
    src = sa && sa.ap && Array.isArray(sa.snap) ? sa.snap : r.d; els = pfEls(src, toks);
    if (!els.length) { last = null; return; }
    s0 = pfSiteOut(els[0]); ev = sa && sa.ap ? 'saved_approved' : 'saved_open';
    key = els.map(function (e) { return e.kind + ':' + (e.el.uid || e.el.eid || e.fi + '/' + e.i); }).join(',') + '|' + ev;
    if (last && last.k === key && last.to === x.d - 1) { last.to = x.d; return; }
    last = { k: key, from: x.d, to: x.d, label: s0.label + (els.length > 1 ? ' +' + (els.length - 1) : ''), kind: s0.kind, floor: s0.floor, ev: ev };
    runs.push(last);
  });
  runs.forEach(function (q) { delete q.k; });
  var pmd = pfFloors(o.plan && o.plan.months ? o.plan.months[ym] : null);
  var ms = pfEls(pmd, toks).map(function (x) { var s = pfSiteOut(x); s.approved = x.floor.approved === true; s.ev = s.approved ? 'saved_approved' : 'saved_open'; delete s.uid; return s; });
  return { month: month, days: days, sites: { month: ms, runs: runs, plan: !!pmd, planApproved: pmd ? pmd.length > 0 && pmd.every(function (f) { return !!(f && f.approved === true); }) : null },
    evidence: { reports: nRep, approved: nAp, rounds: nRnd } };
}
/* ══ PF-CORE:END ══ */
/* ── KIVO_264 · ما تحتاجه الواجهةُ وحدها فوق القواعد المشتركة ── */
var PF_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
var PF_ST = { pr: 'حاضر', ab: 'غائب', pm: 'مستأذن', lv: 'إجازة', tout: 'محوَّل', rest: 'راحة' };
var PF_GL = { pr: '✓', ab: 'غ', pm: 'م', lv: 'إ', tout: '⇄', rest: 'ر' };
var PF_EV = { saved_approved: 'محفوظ · معتمد', saved_open: 'محفوظ · غير معتمد', logged_change: 'تغيير مسجَّل', derived: 'مشتق', current: 'بيانات حالية', none: 'لا أدلة تاريخية', future: 'لم يحن بعد' };
function pfMonthLabel(ym) { var p = /^(\d+)-(\d+)$/.exec(String(ym || '')); return p ? (PF_MONTHS[+p[2] - 1] || p[2]) + ' ' + p[1] : String(ym || ''); }
function pfYmAdd(ym, k) { var p = /^(\d+)-(\d+)$/.exec(String(ym || '')), v; if (!p) return ym; v = +p[1] * 12 + (+p[2] - 1) + k; return Math.floor(v / 12) + '-' + (v % 12 + 1); }
function pfYmCmp(a, b) { var p = /^(\d+)-(\d+)$/.exec(String(a || '')), q = /^(\d+)-(\d+)$/.exec(String(b || '')); return p && q ? (+p[1] * 12 + +p[2]) - (+q[1] * 12 + +q[2]) : 0; }
/* «اليوم» محلياً بالشكل نفسِه الذي يعيده الخادم (/api/me/today) — لمن تصله المفاتيح، وللوضع المحلي */
function pfTodayLocal(o) {
  var u = o.user, emps = Array.isArray(o.emps) ? o.emps : [], L = pfLink(u, emps), toks = pfTokens(u, L.rec, emps), st = o.staffing || {}, dr = o.dreport || {};
  var dayOf = function (T0) { return pfDay({ bucket: st[T0.ym] || {}, rep: dr[T0.dk] || null, toks: toks, wd: T0.wd, opts: o.opts }); };
  var T = toks.length ? pfOpDay(o.now, dayOf) : (function () { var x = pfHijriAt(o.now); x.op = 'calendar'; return x; })();
  var out = { ok: 1, v: 1, local: 1, day: { y: T.y, m: T.m, d: T.d, dk: T.dk, ym: T.ym, wd: T.wd, op: T.op }, identity: { linked: !!L.rec, by: L.by, keyed: toks.length > 0, rec: L.rec },
    facts: null, site: null, mates: [], matesN: 0, week: [], mon: null, toks: toks, els: null };
  if (!toks.length) return out;
  var f = dayOf(T), S = pfSite({ plan: o.plan, round: (o.rounds || {})[T.dk] || null, ym: T.ym, toks: toks }), el = S.els.today || S.els.official;
  f.month = { locked: !!(o.locks && o.locks[T.ym] === true), has: !!pfEntry(st[T.ym] || {}, toks) };
  /* الزملاءُ (OD-4) لموظفٍ مرتبطٍ بسجلّه وحده — كما في الخادم */
  var ms = el && L.rec ? pfMates({ el: el, toks: toks, emps: emps, bucket: st[T.ym] || {}, rep: dr[T.dk] || null, wd: T.wd, opts: o.opts, myShift: f.shift.name }) : [];
  out.els = S.els; delete S.els;
  out.facts = f; out.site = S; out.mates = ms.slice(0, 20); out.matesN = ms.length;
  out.week = pfWeek({ end: T.op === 'night' ? o.now - 86400000 : o.now, toks: toks, staffing: st, dreport: dr, opts: o.opts });
  out.mon = pfMon({ ym: T.ym, toks: toks, staffing: st, dreport: dr, opts: o.opts });
  return out;
}
/* نموذجُ عرض «السجل» من ردّ /api/me/history — أقسامٌ بعناصرَ لكلٍّ منها وسمُ دليله الإلزامي */
function pfHistView(H, filter) {
  var F = filter || 'all', on = function (k) { return F === 'all' || F === k; }, S = [], M = H && H.month, days = (H && H.days) || [], i;
  var item = function (t, ev, sub) { return { t: t, ev: ev, evl: PF_EV[ev] || ev, sub: sub || '' }; };
  var dl = function (d) { return 'يوم ' + d; };
  if (!H || !H.ok) return { sections: [], grid: [], empty: true };
  var linked = !!(H.identity && (H.identity.linked || H.identity.keyed));
  if (on('shift') && linked) {
    var it = [];
    if (M && M.has) {
      it.push(item('الوردية المجدولة: ' + (M.shift || '—'), M.ev, M.locked ? 'الجدول الشهري معتمد' : 'الجدول الشهري لم يُعتمد بعد'));
      if (M.def && (M.def.tStart || M.def.tEnd)) it.push(item('وقتها: ' + (M.def.tStart || '؟') + ' ← ' + (M.def.tEnd || '؟'), M.defEv, M.defEv === 'current' ? 'من تعريفات الورديات الحالية — لا لقطةَ محفوظةً مع الشهر' : ''));
    } else it.push(item('لا صفَّ لك في جدول هذا الشهر', 'none'));
    for (i = 0; i < days.length; i++) {
      var a = days[i].act;
      if (a && a.tin) it.push(item(dl(days[i].d) + ': حُوّلت إلى وردية ' + (a.sh || '—') + (a.tfrom ? ' من ' + a.tfrom : ''), days[i].ev));
      else if (a && a.st === 'tout') it.push(item(dl(days[i].d) + ': حُوّلت من وردية ' + (a.sh || '—') + (a.to ? ' إلى ' + a.to : ''), days[i].ev));
      else if (a && M && M.shift && a.sh && a.sh !== M.shift) it.push(item(dl(days[i].d) + ': عملت في وردية ' + a.sh + ' (المجدولة ' + M.shift + ')', days[i].ev));
    }
    S.push({ key: 'shift', title: 'الورديات وفترات العمل', items: it });
  }
  if (on('rest') && linked) {
    var ir = [], dd = [];
    if (M && M.has) {
      ir.push(item('أيام الراحة المجدولة: ' + (M.rest.length ? M.rest.join(' · ') : 'لا أيام راحة'), M.ev));
      for (i = 0; i < days.length; i++) if (days[i].sched.rest) dd.push(days[i].d);
      if (dd.length) ir.push(item('تواريخها هذا الشهر: ' + dd.join(' · '), 'derived', 'محسوبةٌ من نمط الأسبوع في الجدول — لا تسجيلَ لكل تاريخ'));
    } else ir.push(item('لا جدولَ لك في هذا الشهر — لا راحةَ مجدولةً مسجّلة', 'none'));
    for (i = 0; i < days.length; i++) {
      var b = days[i].act;
      if (b && b.restSrc === 'day') ir.push(item(dl(days[i].d) + ': ' + (b.rest ? 'راحةٌ أُضيفت في تقرير اليوم' : 'عُدّلت الراحة في تقرير اليوم'), days[i].ev));
      else if (b && b.rest === true && days[i].sched.rest === false) ir.push(item(dl(days[i].d) + ': راحةٌ في التقرير خلافاً للجدول', days[i].ev));
    }
    S.push({ key: 'rest', title: 'أيام الراحة', items: ir, grid: true });
  }
  if (on('sites') && linked) {
    var is = [], sm = (H.sites && H.sites.month) || [], rn = (H.sites && H.sites.runs) || [];
    if (sm.length) sm.forEach(function (x) { is.push(item('الإسنادُ الشهري: ' + x.label + ' — ' + x.floor, x.ev, x.approved ? 'التشغيل الميداني معتمد' : 'مسودة — لم يُعتمد')); });
    else is.push(item(H.sites && H.sites.plan ? 'لا إسنادَ لك في التشغيل الميداني لهذا الشهر' : 'لا تشغيلَ ميدانيّاً محفوظاً لهذا الشهر', 'none'));
    rn.forEach(function (x) { is.push(item((x.from === x.to ? dl(x.from) : 'الأيام ' + x.from + '–' + x.to) + ': ' + x.label + ' — ' + x.floor, x.ev, 'تسكينُ الجولة اليومية')); });
    S.push({ key: 'sites', title: 'المواقع المسندة', items: is });
  }
  if (on('muk') && linked) {
    var im = [];
    if (M && M.has) im.push(item(M.muk ? 'مكلف هذا الشهر' : 'غير مكلف هذا الشهر', M.ev));
    else im.push(item('لا تكليفَ مسجّلاً لهذا الشهر', 'none'));
    for (i = 0; i < days.length; i++) { var c = days[i].act; if (c && c.muk != null && M && M.has && c.muk !== M.muk) im.push(item(dl(days[i].d) + ': ' + (c.muk ? 'مكلف' : 'غير مكلف') + ' في تقرير اليوم', days[i].ev)); }
    S.push({ key: 'muk', title: 'التكليف (ساعات العمل الإضافية)', items: im });
  }
  if (on('status') && linked) {
    var cnt = { pr: 0, ab: 0, pm: 0, lv: 0, tout: 0 }, n = 0, nAp = 0, ist = [];
    for (i = 0; i < days.length; i++) { var x0 = days[i].act; if (!x0) continue; n++; if (days[i].rep === 'approved') nAp++; if (cnt[x0.st] != null) cnt[x0.st]++; }
    ist.push(item(n ? 'حالاتٌ مسجّلة في ' + n + ' تقريراً (' + nAp + ' معتمد): حاضر ' + cnt.pr + ' · غائب ' + cnt.ab + ' · مستأذن ' + cnt.pm + ' · إجازة ' + cnt.lv + (cnt.tout ? ' · محوَّل ' + cnt.tout : '') : 'لا تقارير يوميةً مسحوبةً لك في هذا الشهر',
      n ? (nAp === n ? 'saved_approved' : 'saved_open') : 'none', n ? 'الأيامُ بلا تقريرٍ لا دليلَ فيها على الحالة الفعلية' : ''));
    S.push({ key: 'status', title: 'الحالات التشغيلية الفعلية', items: ist, grid: true });
  }
  if (on('moves')) {
    var iv = [];
    ((H.moves && H.moves.items) || []).forEach(function (x) {
      var A = { acct_add: 'أُنشئ حسابُ دخولك', acct_del: 'حُذف حسابُ دخولك', acct_freeze: 'جُمّد حسابُك', acct_unfreeze: 'أُعيد تفعيلُ حسابك', mgr_on: 'عُيّنت مديراً للإدارة', mgr_off: 'أُلغي تعيينُك مديراً', pw_change: 'غُيّرت كلمةُ المرور' };
      iv.push(item((A[x.act] || x.act) + (x.dept ? ' — ' + x.dept : ''), 'logged_change', pfWhen(x.ts)));
    });
    iv.push(item((H.moves && H.moves.note) || 'لا يوجد تاريخُ تنقّلٍ بين الإدارات — النقلُ بين الإدارات غيرُ مدعومٍ في النظام حالياً', 'current'));   /* KIVO_264 (المراجعة F8): حقيقةٌ عن النظام لا «غيابُ دليل» */
    S.push({ key: 'moves', title: 'التنقلات بين الإدارات وأحداثُ الحساب', items: iv });
  }
  if ((F === 'all' || F === 'shift' || F === 'rest' || F === 'muk') && linked) {
    var ic = [];
    ((H.changes) || []).forEach(function (x) {
      var p = [], f = x.f || {}, show = function (v) { return Array.isArray(v) ? (v.length ? v.join(' · ') : '—') : v === true ? 'مكلف' : v === false ? 'غير مكلف' : v == null || v === '' ? '—' : String(v); };
      if (f.shift && (F === 'all' || F === 'shift')) p.push('الوردية: ' + show(f.shift[0]) + ' ← ' + show(f.shift[1]));
      if (f.rest && (F === 'all' || F === 'rest')) p.push('الراحة: ' + show(f.rest[0]) + ' ← ' + show(f.rest[1]));
      if (f.muk && (F === 'all' || F === 'muk')) p.push('التكليف: ' + show(f.muk[0]) + ' ← ' + show(f.muk[1]));
      if (p.length) ic.push(item(p.join(' · '), 'logged_change', (x.by || '') + ' · ' + pfWhen(x.ts)));
    });
    if (ic.length || F === 'all') {
      if (!ic.length) ic.push(item(H.evidence && H.evidence.auditSince ? 'لا تغييراتٍ مسجّلةً على صفّك في هذا الشهر' : 'سجلُّ التغييرات لا يغطي هذه الفترة', 'none'));
      S.push({ key: 'changes', title: 'التغييرات المسجّلة على صفّك', items: ic });
    }
  }
  var grid = days.map(function (x) {
    var a = x.act, code = a ? (a.rest ? 'rest' : a.st) : '';
    return { d: x.d, wd: pfNoAl(x.wd), sched: x.sched.rest, code: code, txt: a ? (PF_GL[code] || '—') : x.ev === 'future' ? '' : '—', rep: x.rep, ev: x.ev, evl: PF_EV[x.ev] || '', tip: dl(x.d) + ' · ' + x.wd + ' — ' + (a ? (PF_ST[code] || code) + ' (' + (x.rep === 'approved' ? 'تقريرٌ معتمد' : 'تقريرٌ غير معتمد') + ')' : x.ev === 'future' ? 'لم يحن بعد' : 'لا تقرير') + (x.sched.rest ? ' · راحةٌ مجدولة' : '') };
  });
  var E = (H && H.evidence) || {};
  var src = [M && M.has ? 'الجدول الشهري (' + (M.locked ? 'معتمد' : 'غير معتمد') + ')' : 'لا جدول', 'التقارير اليومية (' + (E.reports || 0) + ' يوماً · ' + (E.approved || 0) + ' معتمد)',
    H.sites && H.sites.plan ? 'التشغيل الميداني (' + (H.sites.planApproved ? 'معتمد' : 'مسودة') + ')' : 'لا تشغيلَ ميدانيّاً', 'الجولات (' + (E.rounds || 0) + ')', E.auditSince ? 'سجلُّ التغييرات منذ ' + pfWhen(E.auditSince) : 'لا سجلَّ تغييرات'];
  return { sections: S, grid: linked ? grid : [], sources: linked ? src.join(' · ') : '', linked: linked, empty: !S.length };
}
function pfWhen(ts) {
  if (!ts) return '';
  try { var h = pfHijriAt(+ts), m = pfRiyadhMins(+ts), z = function (n) { return (n < 10 ? '0' : '') + n; }; return h.d + ' ' + PF_MONTHS[h.m - 1] + ' ' + h.y + ' · ' + z(Math.floor(m / 60)) + ':' + z(m % 60); }
  catch (e) { return ''; }
}
KIVO.BassamProfileFacts = {
  link: pfLink, tokens: pfTokens, entry: pfEntry, day: pfDay, opDay: pfOpDay, site: pfSite, mates: pfMates, hist: pfHist, monthDays: pfMonthDays, hijriAt: pfHijriAt,
  restOn: pfRestOn, label: pfLabel, same: pfSame, today: pfTodayLocal, week: pfWeek, histView: pfHistView, monthLabel: pfMonthLabel, ymAdd: pfYmAdd, ymCmp: pfYmCmp, when: pfWhen,
  ST: PF_ST, GL: PF_GL, EV: PF_EV, MONTHS: PF_MONTHS, WD: PF_WD
};
})();
