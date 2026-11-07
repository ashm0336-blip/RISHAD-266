
/* ═══ سجلُّ الأنشطة والتغييرات — المعرّفاتُ الثابتة وعرضُ السجل في المتصفح (Candidate 205 / R169) ═══
   الأحداثُ تُحسب وتُدوَّن على الخادم؛ وهذا الملفّ يبقي في المتصفح ما يلزم الكتابةَ والعرض فقط:
   · المعرّفاتُ الثابتة: legacyId حتميٌّ من حقولٍ مستقرّة (تُحسب متطابقةً في كل متصفح لكيانٍ قديم)، وnewId عشوائيٌّ للجديد،
     وstampList/stampSite/stampPlan/stampRounds تختم الكيانات الناقصة قبل الحفظ.
   · عرضُ السجل للقراءة فقط: rowVM/describe/detailRows ونصوصُ الأفعال والأنواع، والجلبُ عند الطلب من /api/aud. */
(function () {
  function fnv(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function hash(str) { str = String(str); var a = fnv(str), b = fnv('\u0001' + str.length + '\u0002' + str); return a.toString(36) + b.toString(36); }
  function newId(p) { return (p || 'e') + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  var MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  function mLabel(key) { var m = /^(\d+)-(\d+)$/.exec(String(key || '')); return m ? (MONTHS[+m[2] - 1] || m[2]) + ' ' + m[1] : String(key || ''); }
  function dLabel(key) { var m = /^(\d+)-(\d+)-(\d+)$/.exec(String(key || '')); return m ? 'يوم ' + m[3] + ' ' + (MONTHS[+m[2] - 1] || m[2]) + ' ' + m[1] : String(key || ''); }

  /* ── المعرّفاتُ الثابتة ── */
  var STABLE = {
    zone: ['code', 'ser', 'name', 'cat'], gate: ['num', 'label', 'x', 'y'], mark: ['label', 'kind', 'x', 'y'],
    path: ['id', 'name', 'label'], sector: ['id', 'code', 'name'], site: ['name', 'num', 'iid']
  };
  function ptsSig(e) {
    if (!e) return '';
    if (typeof e.d === 'string') return e.d.slice(0, 40);
    if (Array.isArray(e.pts) && e.pts.length) { var p = e.pts[0] || {}; return e.pts.length + ':' + (p.x == null ? '' : Math.round(+p.x)) + ',' + (p.y == null ? '' : Math.round(+p.y)); }
    return '';
  }
  function legacyId(et, e) {
    if (!isObj(e)) return '';
    var f = STABLE[et] || ['name'], parts = [];
    for (var i = 0; i < f.length; i++) parts.push(e[f[i]] == null ? '' : String(e[f[i]]));
    if (et === 'zone' || et === 'path' || et === 'sector') parts.push(ptsSig(e));
    return 'L' + hash(et + '|' + parts.join('|'));
  }
  /* معرّفُ المهمة القديمة: من طابع إنشائها والمكلَّف — لا من عنوانها (العنوانُ يُعدَّل) */
  function taskId(t) { return Array.isArray(t) ? 'T' + hash(String(t[13] || '') + '|' + String(t[14] || '') + '|' + String(t[8] || '') + '|' + (Array.isArray(t[7]) ? t[7].join(',') : '')) : ''; }
  /* ختمُ قائمةٍ من الكيانات: الموجودُ يبقى، والناقصُ يأخذ معرّفاً حتميّاً (قديم) أو عشوائيّاً (جديد) — مع فضّ التصادم */
  function stampList(arr, et, field, fresh) {
    var n = 0; if (!Array.isArray(arr)) return 0;
    var seen = {};
    for (var i = 0; i < arr.length; i++) { var e = arr[i]; if (isObj(e) && e[field]) seen[String(e[field])] = 1; }
    for (var j = 0; j < arr.length; j++) {
      var x = arr[j]; if (!isObj(x) || x[field]) continue;
      var id = fresh ? newId(et.charAt(0) + '_') : legacyId(et, x), base = id, c = 1;
      while (seen[id]) id = base + '_' + (c++);
      x[field] = id; seen[id] = 1; n++;
    }
    return n;
  }
  var SITE_LISTS = [['zones', 'zone', 'eid'], ['gates', 'gate', 'eid'], ['marks', 'mark', 'eid'], ['paths', 'path', 'id'], ['sectors', 'sector', 'id']];
  function stampSite(f, fresh) { var n = 0; if (!isObj(f)) return 0; for (var i = 0; i < SITE_LISTS.length; i++) n += stampList(f[SITE_LISTS[i][0]], SITE_LISTS[i][1], SITE_LISTS[i][2], fresh); return n; }
  /* خطةُ التشغيل الميداني: المواقع (sid) وكيانات كلِّ شهرٍ وكيانات المواقع الحيّة */
  function stampPlan(p, fresh) {
    var n = 0; if (!isObj(p)) return 0;
    n += stampList(p.floors, 'site', 'sid', fresh);
    (p.floors || []).forEach(function (f) { n += stampSite(f, fresh); });
    var M = p.months || p.planMonths;
    if (isObj(M)) Object.keys(M).forEach(function (mk) { var m = M[mk]; var d = m ? (Array.isArray(m) ? m : m.d) : null; if (Array.isArray(d)) d.forEach(function (f) { n += stampSite(f, fresh); }); });
    [['zones', 'zone', 'eid'], ['gates', 'gate', 'eid'], ['marks', 'mark', 'eid'], ['paths', 'path', 'id']].forEach(function (L) { n += stampList(p[L[0]], L[1], L[2], fresh); });
    return n;
  }
  function stampRounds(R, fresh) {
    var n = 0; if (!isObj(R)) return 0;
    Object.keys(R).forEach(function (rk) { var r = R[rk]; if (!r || !Array.isArray(r.d)) return; r.d.forEach(function (f) { n += stampSite(f, fresh); }); if (r.shAp && isObj(r.shAp)) Object.keys(r.shAp).forEach(function (s) { var sn = r.shAp[s]; if (sn && Array.isArray(sn.snap)) sn.snap.forEach(function (f) { n += stampSite(f, fresh); }); }); });
    return n;
  }

  /* ── العرض: نصٌّ عربيّ للحدث، وصفوفٌ للوحة ── */
  var ACT_AR = { created: 'أُنشئ', edited: 'عُدِّل', deleted: 'حُذف', status_changed: 'تغيّرت حالته', enabled: 'أُعيد تفعيله', disabled: 'عُطِّل', geometry_changed: 'عُدِّل شكله', moved: 'نُقل موضعه', reassigned: 'أُعيد توزيعه', approved: 'اعتُمد', approval_revoked: 'أُلغي اعتماده', locked: 'أُقفل', unlocked: 'فُتح', completed: 'أُنجز', declined: 'اعتُذر عنه', synced: 'حُدِّث من الخطة', restore: 'استُعيدت نسخة', import: 'استُورد', wipe: 'مُسحت بيانات', reset: 'تهيئة المنصة', bulk: 'تغييرات كثيرة',
    /* رموزُ الخادم لأحداث مجموعات البيانات (054 · 019e · 063 · 019 · 020 · 019a/i/m) — بالعربية لا بالرمز */
    changed: 'عُدِّل', updated: 'حُدِّث', added: 'أُضيف', migrated: 'رُحِّل', rolled_back: 'أُعيد إلى ما قبل التعديل', emitted: 'أُرسل تنبيه', remind: 'أُرسل تذكير', config: 'عُدِّلت إعداداته', state: 'حُدِّثت حالته',
    create: 'أُنشئ', edit: 'عُدِّل', delete: 'حُذف', status: 'تغيّرت حالته', issue: 'سُلِّم', close: 'أُغلق' };
  var ET_AR = { zone: 'المصلى', gate: 'الباب', mark: 'المعلم', path: 'المسار', sector: 'النطاق', site: 'الموقع', plan: 'خطة الشهر', plan_site: 'خطة الموقع', round: 'جولة اليوم', round_site: 'موقع الجولة', round_month: 'جولات الشهر', round_shift: 'جولة الوردية', round_lock: 'قفل اليوم', task: 'المهمة', employee: 'الموظف', staffing: 'التسكين الشهري', dreport: 'التقرير اليومي', seized: 'محضر المضبوطات', irshad: 'تقرير الاسترشاد', award: 'ترشيح الجائزة', dataset: 'مجموعة البيانات', system: 'المنصة' };
  var ET_FILTER = [['zone', 'المصليات'], ['gate', 'الأبواب'], ['mark', 'المعالم'], ['path', 'المسارات'], ['sector', 'النطاقات'], ['site', 'المواقع'], ['plan', 'خطط الشهور'], ['round', 'الجولات'], ['task', 'المهام'], ['employee', 'الموظفون'], ['staffing', 'التسكين الشهري'], ['dreport', 'التقرير اليومي'], ['seized', 'المضبوطات'], ['irshad', 'الاسترشاد'], ['award', 'الجائزة'], ['dataset', 'مجموعات البيانات']];
  var ACT_FILTER = [['created', 'إنشاء'], ['edited', 'تعديل'], ['geometry_changed', 'تعديل الشكل'], ['moved', 'نقل'], ['enabled', 'تفعيل'], ['disabled', 'تعطيل'], ['status_changed', 'تغيير حالة'], ['reassigned', 'إعادة توزيع'], ['approved', 'اعتماد'], ['approval_revoked', 'إلغاء اعتماد'], ['locked', 'قفل'], ['unlocked', 'فتح'], ['completed', 'إنجاز'], ['deleted', 'حذف'], ['restore', 'استعادة'], ['import', 'استيراد'], ['wipe', 'مسح بيانات']];
  var FIELD_AR = { name: 'الاسم', code: 'الرمز', ser: 'التسلسل', cat: 'الفئة', label: 'التسمية', num: 'الرقم', kind: 'النوع', loc: 'الموقع', gtype: 'نوع الباب', route: 'المسار', cls: 'التصنيف', pri: 'الأولوية', cats: 'الفئات', needN: 'الاحتياج', hideLabel: 'إخفاء التسمية', region: 'المنطقة', level: 'الدور', ztype: 'النوع', zcat: 'الفئة', yard: 'الساحة', off: 'معطَّل', closed: 'مغلق', active: 'مفعَّل', color: 'اللون', line: 'الخط', w: 'العرض', lead: 'المسؤول', note: 'ملاحظة', showLbl: 'إظهار التسمية', chip: 'الشارة', iid: 'الخريطة', phone: 'الجوال', email: 'البريد', type: 'النوع', work: 'نوع العمل', gender: 'الجنس', shift: 'الوردية', group: 'المجموعة', nid: 'الهوية', empno: 'الرقم الوظيفي', title: 'العنوان', desc: 'الوصف', prio: 'الأولوية', dur: 'المدة', from: 'من', until: 'إلى', wt: 'نوع العمل', rest: 'الراحة', muk: 'مكلَّف', cs: 'رمز النداء', status: 'الحالة', st: 'الحالة', ok: 'مقبول', score: 'الدرجة', items: 'الأصناف', langs: 'اللغات', bro: 'مطويات', pros: 'نشرات', pol: 'استطلاع', actor: 'المنفّذ', lsz: 'حجم الخط', lang: 'دوران الخط', hideSectors: 'إخفاء النطاقات' };
  function fieldAr(q) { return FIELD_AR[q] || q; }
  function ctxText(ctx) {
    var c = ctx; if (typeof c === 'string') { try { c = JSON.parse(c); } catch (e) { c = null; } }
    if (!isObj(c)) return '';
    var parts = [];
    if (c.plan) parts.push('خطة ' + mLabel(c.plan));
    if (c.day) parts.push(dLabel(c.day));
    if (c.shift) parts.push(c.shift);
    if (c.site) parts.push(c.site);
    return parts.join(' · ');
  }
  /* مراجعة S10: لا يُطبع رمزٌ داخلي — فعلٌ مجهول «تعديل»، واسمُ مجموعة البيانات من KIVO.BassamKeyLabels (المصدرُ الواحد لأسماء المفاتيح) */
  function actAr(a) { return ACT_AR[a] || (/^[a-z_]+$/.test(String(a || '')) ? 'تعديل' : String(a || '')); }
  function dsName(r) {
    var n = String(r.ename || ''), KL = KIVO.BassamKeyLabels;
    if (n && !/^[A-Za-z0-9_:.-]+$/.test(n)) return n;
    if (!KL) return ET_AR[r.etype] || '';
    var known = function (k) { return !!KL.all[String(k || '').replace(/^bsdept:[^:]+:/, '').replace(/:.*$/, '')]; };
    return KL.label(known(n) || !known(r.k) ? n : r.k);
  }
  function describe(r) {
    var et = ET_AR[r.etype] || r.etype, act = actAr(r.act);
    var nm = r.ename ? ' «' + r.ename + '»' : '';
    if (r.etype === 'dataset' || r.etype === 'system') return act + ' — ' + dsName(r);
    return act + ' ' + et + nm;
  }
  function parseJ(s) { if (s == null || s === '') return null; if (typeof s !== 'string') return s; try { return JSON.parse(s); } catch (e) { return s; } }
  function valTxt(v) { if (v == null || v === '') return '—'; if (v === true) return 'نعم'; if (v === false) return 'لا'; if (Array.isArray(v)) return v.map(valTxt).join('، '); if (isObj(v)) return Object.keys(v).map(function (q) { return fieldAr(q) + ': ' + valTxt(v[q]); }).join(' · '); return String(v); }
  /* تفصيلُ الحدث: أسطرُ قبل/بعد مقروءة */
  function detailRows(r) {
    var b = parseJ(r.bef != null ? r.bef : r.before), a = parseJ(r.aft != null ? r.aft : r.after), rows = [];
    if (r.act === 'edited' && isObj(a) && isObj(a.f)) { Object.keys(a.f).forEach(function (q) { var pr = a.f[q]; rows.push({ f: fieldAr(q), from: valTxt(pr && pr[0]), to: valTxt(pr && pr[1]) }); }); return rows; }
    if ((r.act === 'geometry_changed' || r.act === 'moved') && (isObj(b) || isObj(a))) { var g = function (o) { return o ? (o.w != null ? 'مربّع الإحاطة ' + o.x + '،' + o.y + ' — ' + o.w + '×' + o.h + (o.n ? ' (' + KIVO.BassamCount(o.n, "نقطة") + ')' : '') : 'الموضع ' + o.x + '،' + o.y) : '—'; }; rows.push({ f: 'الشكل', from: g(b), to: g(a) }); return rows; }
    if ((r.act === 'enabled' || r.act === 'disabled') && isObj(a)) { rows.push({ f: fieldAr(a.field || 'status'), from: valTxt(b && b.value), to: valTxt(a.value) }); if (a.why) rows.push({ f: 'السبب', from: '', to: String(a.why) }); return rows; }
    if (r.act === 'reassigned' && isObj(a)) { rows.push({ f: 'التوزيع', from: valTxt(b && (b.emp != null ? KIVO.BassamCount(b.emp, "موظف") : b.to != null ? b.to : b.shift)), to: valTxt(a.emp != null ? KIVO.BassamCount(a.emp, "موظف") + (a.list && a.list.length ? ' (' + a.list.join('، ') + ')' : '') : a.to != null ? a.to : a.shift) }); return rows; }
    if (r.act === 'created' && isObj(a)) { Object.keys(a).slice(0, 14).forEach(function (q) { rows.push({ f: fieldAr(q), from: '', to: valTxt(a[q]) }); }); return rows; }
    if (r.act === 'deleted' && isObj(b)) { Object.keys(b).slice(0, 14).forEach(function (q) { rows.push({ f: fieldAr(q), from: valTxt(b[q]), to: '' }); }); return rows; }
    if (isObj(a) || isObj(b)) { var ks = {}; Object.keys(isObj(b) ? b : {}).concat(Object.keys(isObj(a) ? a : {})).forEach(function (q) { ks[q] = 1; }); Object.keys(ks).slice(0, 14).forEach(function (q) { rows.push({ f: fieldAr(q), from: valTxt(b && b[q]), to: valTxt(a && a[q]) }); }); }
    return rows;
  }
  function clock(ts) { try { var d = new Date(+ts); var h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h >= 12 ? ' م' : ' ص'); } catch (e) { return ''; } }
  function dateTxt(ts) { try { var d = new Date(+ts); var H = KIVO.BassamHijri && KIVO.BassamHijri.now ? KIVO.BassamHijri.now(d) : null; return (H ? H.d + ' ' + (MONTHS[H.m - 1] || H.m) + ' ' + H.y : d.toLocaleDateString('ar-SA')); } catch (e) { return ''; } }
  function rowVM(r) {
    return { id: r.id, ts: r.ts, t: clock(r.ts), date: dateTxt(r.ts), by: r.name || r.un || '—', act: describe(r), actKey: r.act, etype: r.etype, eid: r.eid, ename: r.ename || '', ctx: ctxText(r.ctx), deleted: r.act === 'deleted', details: detailRows(r), dev: r.dev === 'm' ? 'جوال' : r.dev === 'd' ? 'حاسوب' : '', city: r.city || '', dept: r.dept || '' };
  }
  /* جلبٌ عند الطلب (لا استطلاع): سجلُّ كيانٍ واحد أو استعلامٌ مرشَّح */
  function fetchAud(params) {
    var q = [];
    Object.keys(params || {}).forEach(function (k) { if (params[k] != null && params[k] !== '') q.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k]))); });
    return fetch('/api/aud?' + q.join('&')).then(function (r) { return r.ok ? r.json() : { ok: 0, err: 'HTTP ' + r.status }; }).then(function (j) { return { ok: !!(j && j.ok), rows: (j && j.rows) || [], next: (j && j.next) || 0, err: j && j.err || '' }; }).catch(function (e) { return { ok: false, rows: [], next: 0, err: String(e && e.message || e) }; });
  }
  function entityHistory(etype, eid, dept) { return fetchAud({ etype: etype, eid: eid, dept: dept || (KIVO.BassamDepts ? KIVO.BassamDepts.active() : ''), limit: 120 }); }
  function panelNodes(R, rows, opts) {
    opts = opts || {}; var h = R.createElement;
    var vm = (rows || []).map(rowVM);
    var kids = vm.map(function (v, i) {
      return h('div', { key: 'a' + (v.id || i), style: { display: 'flex', gap: 7, fontSize: opts.fs || 9, color: 'var(--text-secondary)', lineHeight: 1.85, borderTop: '1px solid var(--border-subtle)', padding: '3px 0', alignItems: 'flex-start' } },
        h('span', { style: { color: 'var(--text-faint)', minWidth: 74, fontFeatureSettings: "'tnum'", whiteSpace: 'nowrap' }, title: v.date }, v.date + ' ' + v.t),
        h('span', { style: { minWidth: 70, maxWidth: 110, color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: v.by }, v.by),
        h('span', { style: { flex: 1, minWidth: 0 } }, v.act + (v.ctx ? ' — ' + v.ctx : ''),
          v.deleted ? h('span', { style: { marginRight: 6, padding: '0 6px', borderRadius: 6, fontSize: 8.5, fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' } }, 'محذوف') : null,
          v.details.length && opts.details !== false ? h('div', { style: { color: 'var(--text-muted)', fontSize: (opts.fs || 9) - 0.5 } }, v.details.slice(0, 6).map(function (d, j) { return h('div', { key: 'd' + j }, d.f + ': ' + (d.from ? d.from + ' → ' : '') + (d.to || '')); })) : null));
    });
    if (!vm.length) kids.push(h('div', { key: 'e', style: { fontSize: opts.fs || 9, color: 'var(--text-faint)' } }, opts.empty || 'لا أحداث مسجّلة لهذا الكيان بعد'));
    return h('div', { style: { margin: '2px 0 4px', padding: '7px 9px', borderRadius: 8, border: '1px dashed var(--border-default)', background: 'var(--bg-surface-2)' } },
      h('div', { style: { fontSize: (opts.fs || 9) - 0.5, fontWeight: 700, color: 'var(--brand-text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 } }, opts.title || 'سجل الحركة', opts.loading ? h('span', { style: { color: 'var(--text-faint)', fontWeight: 400 } }, '— جارٍ التحميل…') : null, opts.err ? h('span', { style: { color: 'var(--danger-text)', fontWeight: 400 } }, '— ' + opts.err) : null),
      kids);
  }

  KIVO.BassamAudit = { VER: 1, hash: hash, newId: newId, legacyId: legacyId, taskId: taskId, stampPlan: stampPlan, stampRounds: stampRounds, stampList: stampList, stampSite: stampSite,
    describe: describe, rowVM: rowVM, detailRows: detailRows, ctxText: ctxText, fetch: fetchAud, entityHistory: entityHistory, panelNodes: panelNodes,
    ACT_AR: ACT_AR, ET_AR: ET_AR, ET_FILTER: ET_FILTER, ACT_FILTER: ACT_FILTER, MONTHS: MONTHS, mLabel: mLabel, dLabel: dLabel, clock: clock, dateTxt: dateTxt, fieldAr: fieldAr };
})();

