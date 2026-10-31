/* ═══ KIVO_264 · «ملفي» — مسارا القراءة الذاتية (OD-3): GET /api/me/today · GET /api/me/history?ym=YYYY-M ═══
   كلُّ صاحب جلسةٍ يقرأ صفوفَه وحدها مهما كانت أوراقُه (D15): الهويةُ بمعرّفٍ ثابت (eid ثم nid — OD-9) لا بالاسم · GET وحده · ym مُتحقَّق ·
   حدُّ معدّل · سقفُ حجم · لا مفتاحَ ولا هويةَ لموظفٍ آخر (الزملاءُ بالاسم وحده — OD-4) · لكل عنصرٍ فئةُ دليله. العقدُ في docs/api.md. */
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
/* ── KIVO_264 · مسارا القراءة الذاتية: التوجيهُ والقراءةُ والإخراج ── */
var ME_RL = 120;                 /* طلباتٌ في الدقيقة لكل حساب (المساران معاً) — قراءةٌ ذاتيةٌ لا كتابة */
var ME_HIST_MAX = 60000;         /* سقفُ حجم ردّ «السجل» بالبايت — ما زاد يُقصّ من التغييرات المسجّلة أولاً */
var ME_KEYS = ['bassam_employees_v1', 'bassam_staffing_v3', 'bassam_staffing_locks_v1', 'bassam_dreport_v1', 'bassam_plan_v1', 'bassam_rounds_v1', 'bassam_shift_options_v1'];
function meStaffEligible(u) { return !!(u && u.role === 'staff' && u.deptId && !pfIsMgrKey(u.ekey)); }
/* A private snapshot is readable independently of operational-page grants.
   Signal only its existing dependencies, never their names or business data. */
function meSnapshotChanged(A, rows, through) {
  var u = A && A.u;
  if (!meStaffEligible(u)) return false;
  return rows.some(function (row) {
    return row.rev <= through && (row.k === K_USERS || row.k === K_DEPTS || ME_KEYS.some(function (name) {
      return row.k === 'bsdept:' + u.deptId + ':' + name;
    }));
  });
}
var ME_SEC = ['acct_add', 'acct_del', 'acct_freeze', 'acct_unfreeze', 'admin', 'pw_change'];
/* قرارُ المالك (KIVO_264): لا نقلَ بين الإدارات الآن — «السجل» يصرّح بأن لا تاريخَ تنقّلات (لا «لا أدلة» كأن شيئاً فُقد) */
var ME_NO_MOVES = 'لا يوجد تاريخُ تنقّلٍ بين الإدارات — النقلُ بين الإدارات غيرُ مدعومٍ في النظام حالياً، فلا تنقّلاتٍ مسجّلةً لك';
/* ym بصيغة YYYY-M (أو YYYY-MM) داخل [1400-1 · الشهرُ الجاري + 1] — وإلا null */
function meYm(v, T) {
  var m = /^(\d{4})-(\d{1,2})$/.exec(String(v == null ? '' : v).trim()), y, mo, cur, x;
  if (!m) return null;
  y = +m[1]; mo = +m[2];
  if (mo < 1 || mo > 12 || y < 1400) return null;
  cur = T.y * 12 + T.m; x = y * 12 + mo;
  if (x > cur + 1) return null;
  return y + '-' + mo;
}
function meDeptName(depts, id) {
  var d = (Array.isArray(depts) ? depts : []).filter(function (x) { return x && x.id === id; })[0];
  return d ? String(d.name || '') : '';
}
function meAccount(u, depts) {
  return { id: String(u.id || ''), role: String(u.role || ''), deptId: String(u.deptId || ''), dept: u.deptId ? meDeptName(depts, u.deptId) : '',
    mgr: !!(u.mgr || pfIsMgrKey(u.ekey)), appointed: pfIsMgrKey(u.ekey) };
}
/* سجلُّ الموظف نفسِه — حقولُه هو وحده (الاسم · الجنس · الهوية · الرقم الوظيفي · الجوال · البريد · نوع التوظيف · نوع العمل) */
function meRec(rec) {
  if (!rec) return null;
  var o = {}, F = ['name', 'gender', 'nid', 'empno', 'phone', 'email', 'type', 'work'], i;
  for (i = 0; i < F.length; i++) if (rec[F[i]] != null && String(rec[F[i]]).trim() !== '') o[F[i]] = String(rec[F[i]]).trim().slice(0, 120);
  return o;
}
async function meDeptData(env, deptId, extra) {
  var ks = ME_KEYS.map(function (n) { return 'bsdept:' + deptId + ':' + n; });
  var capture = await opCaptureReferences(env, Object.create(null), ks),
    rs = await env.DB.batch(capture.guards.concat(extra || [])),
    kj = capture.keys, P = function (n, d) { var v = parseJson(kj['bsdept:' + deptId + ':' + n], d); return v && typeof v === 'object' ? v : d; };
  return { emps: (function () { var a = parseJson(kj['bsdept:' + deptId + ':bassam_employees_v1'], []); return Array.isArray(a) ? a : []; })(),
    staffing: P('bassam_staffing_v3', {}), locks: P('bassam_staffing_locks_v1', {}), dreport: P('bassam_dreport_v1', {}), plan: P('bassam_plan_v1', {}),
    rounds: P('bassam_rounds_v1', {}), opts: (function () { var a = parseJson(kj['bsdept:' + deptId + ':bassam_shift_options_v1'], []); return Array.isArray(a) ? a : []; })(), extra: rs.slice(capture.guards.length) };
}
function meIdent(u, D, users) {
  var L = pfLink(u, D ? D.emps : []);
  /* KIVO_265 · F-1/R-24 (المراجعةُ المستقلة · fail-closed — خارج PF-CORE فالمرآةُ 535 كما هي): سجلٌّ يحلّ إليه حسابٌ نشطٌ آخر في الإدارة ⇒ غيرُ مرتبطٍ
     لكليهما (070 tkRecShared) — ورموزُه لا تصل أحداً: مفتاحُ الحساب يطالب به السجلّ فـpfTokens(u, null) فارغة · لا جدولَ ولا تقريرَ ولا سجلّ */
  if (L.rec && tkRecShared(users, D ? D.emps : [], u.deptId, L.rec, u.id)) L = { rec: null, by: 'none' };
  return { L: L, toks: pfTokens(u, L.rec, D ? D.emps : []) };
}
/* أحداثُ «aud» لصفّي في الجدول الشهري: الفاعلُ باسمه الظاهر (لا اسمَ دخوله) · من → إلى */
function meChanges(rows, users) {
  var by = nmap();
  (users || []).forEach(function (x) { if (x && x.id) by[x.id] = x; });
  return (rows || []).map(function (r) {
    var b = parseJson(r.bef, null), a = parseJson(r.aft, null), f = {};
    if (r.act === 'reassigned') f.shift = [b && b.shift != null ? b.shift : '', a && a.shift != null ? a.shift : ''];
    else if (r.act === 'edited' && a && isObj(a.f)) Object.keys(a.f).forEach(function (q) { if (q === 'rest' || q === 'muk' || q === 'cs' || q === 'shift') f[q] = a.f[q]; });
    else if (r.act === 'created' && isObj(a)) { if (a.shift != null) f.shift = ['', a.shift]; if (a.rest != null) f.rest = [null, a.rest]; if (a.muk != null) f.muk = [null, a.muk]; }
    else if (r.act === 'deleted' && isObj(b)) { if (b.shift != null) f.shift = [b.shift, '']; }
    var w = by[r.uid];
    return { ts: r.ts, by: w ? String(w.name || (w.role === 'super' ? 'مدير النظام' : 'مستخدم')) : 'مستخدم سابق', act: String(r.act || ''), f: f, ev: 'logged_change' };
  });
}
/* أحداثُ حسابي (sec) — تُطابَق بالمعرّف داخل الهدف نصّاً ثم تحليلاً (لا LIKE وحده) */
function meMoves(rows, uid, depts) {
  return (rows || []).map(function (r) { var t = parseJson(r.target, null); return { r: r, t: t }; }).filter(function (x) { return x.t && String(x.t.id) === String(uid); }).map(function (x) {
    var act = x.r.act === 'admin' ? String(x.r.detail || 'admin') : String(x.r.act || '');
    return { ts: x.r.ts, act: act, dept: x.t.deptId ? meDeptName(depts, x.t.deptId) || String(x.t.deptId) : '', ev: 'logged_change' };
  });
}
function meRange(D, toks, T) {
  var best = null, see = function (y, m) { var v = y * 12 + m; if (!best || v < best.v) best = { v: v, y: y, m: m }; };
  Object.keys(D.staffing || {}).forEach(function (k) { var p = /^(\d+)-(\d+)$/.exec(k); if (p && pfEntry(D.staffing[k], toks)) see(+p[1], +p[2]); });
  Object.keys(D.dreport || {}).forEach(function (k) { var p = /^(\d+)-(\d+)-(\d+)$/.exec(k); if (!p || (best && +p[1] * 12 + +p[2] >= best.v)) return; if (pfDay({ bucket: {}, rep: D.dreport[k], toks: toks, wd: '' }).report.mine) see(+p[1], +p[2]); });
  return { first: best ? best.y + '-' + best.m : T.ym, cur: T.ym };
}
async function meSelfRoutes(request, env, path, ss) {
  if (request.method !== 'GET') return json({ ok: 0, err: 'read-only' }, 405);
  var url = new URL(request.url), now = Date.now(), hist = path === '/api/me/history';
  /* الحساباتُ والإداراتُ من لقطة مقدّمة الطلب (بلا جولةٍ إضافية) — قبل حدّ المعدّل لأنه كتابةٌ تُطفئ اللقطة */
  var users = (await usersList(env)) || [], depts = parseJson(await kvGet(env, 'kv', K_DEPTS), []);
  var u = users.filter(function (x) { return x && x.id === ss.uid; })[0];
  if (!u) return json({ ok: 0, err: 'session' }, 401);
  var C = pfHijriAt(now), ymQ = null;
  if (hist && url.searchParams.has('ym')) { ymQ = meYm(url.searchParams.get('ym'), C); if (!ymQ) return json({ ok: 0, err: 'bad-ym' }, 400); }
  var rl = await rlHit(env, 'me', u.id, ME_RL);
  if (rl) return tooMany(rl);
  var acct = meAccount(u, depts), staff = meStaffEligible(u);
  var secQ = hist ? env.DB.prepare("SELECT ts, act, detail, target FROM sec WHERE act IN ('" + ME_SEC.join("','") + "') AND target LIKE ?1 ESCAPE '\\' ORDER BY ts DESC, id DESC LIMIT 60")
    .bind('%"id":"' + String(u.id).replace(/[\\%_]/g, function (c) { return '\\' + c; }) + '"%') : null;
  var minQ = hist && staff ? env.DB.prepare('SELECT MIN(ts) AS t FROM aud WHERE dept = ?1').bind(u.deptId) : null;
  var extra = [secQ, minQ].filter(Boolean), D = null, ex = [], I = { L: { rec: null, by: 'none' }, toks: [] };
  if (staff) { D = await meDeptData(env, u.deptId, extra); ex = D.extra; I = meIdent(u, D, users); }
  else if (extra.length) ex = await env.DB.batch(extra);
  var dayOf = function (T0) { return pfDay({ bucket: (D && D.staffing && D.staffing[T0.ym]) || {}, rep: (D && D.dreport && D.dreport[T0.dk]) || null, toks: I.toks, wd: T0.wd, opts: D && D.opts }); };
  var T = I.toks.length ? pfOpDay(now, dayOf) : (function () { var x = pfHijriAt(now); x.op = 'calendar'; return x; })();
  var ident = { linked: !!I.L.rec, by: I.L.by, keyed: I.toks.length > 0 };
  if (!hist) {
    var out = { ok: 1, v: 1, day: { y: T.y, m: T.m, d: T.d, dk: T.dk, ym: T.ym, wd: T.wd, op: T.op }, account: acct, identity: Object.assign({ rec: meRec(I.L.rec) }, ident),
      facts: null, site: null, mates: [], matesN: 0, week: [], mon: null };
    if (I.toks.length) {
      var bk = (D.staffing || {})[T.ym] || {}, rp = (D.dreport || {})[T.dk] || null, f = dayOf(T);
      var S = pfSite({ plan: D.plan, round: (D.rounds || {})[T.dk] || null, ym: T.ym, toks: I.toks });
      f.month = { locked: !!(D.locks && D.locks[T.ym] === true), has: !!pfEntry(bk, I.toks) };
      var el = S.els.today || S.els.official;
      /* الزملاءُ (OD-4) لموظفٍ مرتبطٍ بسجلّه وحده — الحسابُ غيرُ المرتبط (مفتاحٌ بلا سجل) لا يُعطى اسمَ أحد */
      var ms = el && I.L.rec ? pfMates({ el: el, toks: I.toks, emps: D.emps, bucket: bk, rep: rp, wd: T.wd, opts: D.opts, myShift: f.shift.name }) : [];
      delete S.els;
      out.facts = f; out.site = S; out.mates = ms.slice(0, 20); out.matesN = ms.length;
      out.week = pfWeek({ end: T.op === 'night' ? now - 86400000 : now, toks: I.toks, staffing: D.staffing, dreport: D.dreport, opts: D.opts });
      out.mon = pfMon({ ym: T.ym, toks: I.toks, staffing: D.staffing, dreport: D.dreport, opts: D.opts });
    }
    return json(out);
  }
  /* ── /api/me/history ── */
  var ym = ymQ || T.ym, pm = /^(\d+)-(\d+)$/.exec(ym), y = +pm[1], m = +pm[2];
  var upto = y * 12 + m < T.y * 12 + T.m ? 31 : (y === T.y && m === T.m ? T.d : 0);
  var res = { ok: 1, v: 1, ym: ym, today: { ym: T.ym, d: T.d }, account: acct, identity: ident, range: { first: T.ym, cur: T.ym },
    month: null, days: [], sites: { month: [], runs: [], plan: false, planApproved: null }, changes: [], evidence: { reports: 0, approved: 0, rounds: 0, auditSince: null },
    moves: { ev: 'none', items: [], note: ME_NO_MOVES } };
  if (minQ) res.evidence.auditSince = (ex[1] && ex[1].results && ex[1].results[0] && ex[1].results[0].t) || null;
  if (staff && I.toks.length) {
    var H = pfHist({ ym: ym, days: pfMonthDays(y, m), upto: upto, toks: I.toks, staffing: D.staffing, locks: D.locks, dreport: D.dreport, plan: D.plan, rounds: D.rounds, opts: D.opts });
    res.month = H.month; res.days = H.days; res.sites = H.sites;
    res.evidence.reports = H.evidence.reports; res.evidence.approved = H.evidence.approved; res.evidence.rounds = H.evidence.rounds;
    res.range = meRange(D, I.toks, T);
    var q = env.DB.prepare("SELECT ts, uid, act, bef, aft FROM aud WHERE dept = ?1 AND etype = 'staffing' AND ctx LIKE ?2 AND eid IN (" + I.toks.map(function (_, n) { return '?' + (n + 3); }).join(',') + ') ORDER BY ts DESC, id DESC LIMIT 120');
    var ra = await q.bind.apply(q, [u.deptId, '%"plan":"' + ym + '"%'].concat(I.toks)).all();
    res.changes = meChanges((ra && ra.results) || [], users);
  }
  res.moves.items = meMoves(secQ ? ((ex[0] && ex[0].results) || []) : [], u.id, depts);
  var body = JSON.stringify(res);
  while (body.length > ME_HIST_MAX && res.changes.length) { res.changes = res.changes.slice(0, Math.floor(res.changes.length / 2)); res.truncated = 1; body = JSON.stringify(res); }
  return json(res);
}
