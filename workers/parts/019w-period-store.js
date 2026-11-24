/* ═══ V7 · 53 · التخزين بالفترة (§3ب، الشروط في رد المراجع §4) — طبقةٌ لا تعرف شكلَ التاريخ ═══════════════════════════════════════════════
   المورد الشهري/اليومي (تعريفُه يحمل period: { root | field, index, ctx, summary } — 019p1/019p3/019p4/019q) يبقى وثيقةً منطقية واحدة بمفتاحها،
   وصفوفُه في ops_nodes وجداول الكيانات كما يكتبها المرمِّز (019o). الفترةُ = عضوٌ من «الحاوية» (جذرُ الخريطة، أو حقل months في الخطة) واسمُها
   نصُّ المفتاح القائم كما هو ('1448-6-14' · 'm:1448-6' · '1448-6')، وصفوفُها شجرةٌ تحت row_key = <الحاوية>/e:<الاسم مرمَّزاً> — فتُقرأ وتُكتب
   بمدى على المفتاح الأساسي (department_id, resource, row_key) لا بالوثيقة كلها. «الرأس» ما سوى الفترات (الجذرُ وحقوله الثابتة).
   لا تحليلَ لتاريخٍ هنا: الترتيبُ والمجموعة (grp) من دالة التعريف index (019p0)، والمقارنةُ عددية (seq) لا نصّية.
   المراجعات: K (الوثيقة كلها) ترتفع مع كل كتابة كما كانت · K@<p> مراجعةُ الفترة · K@ مراجعةُ الرأس · K@* كتابةٌ بالجملة لا تعرف فتراتها
   (استيرادٌ على دفعات): مراجعةُ الفترة الفعلية = MAX(K@p, K@*). وكلُّ كتابةٍ على ops_* ترفع مراجعةَ مفتاحها في الدفعة نفسِها (052 dbGuard يفرضه). */
var OP_LIM = { day: 524288, mctl: 524288, month: 1572864, head: 1048576, readPeriods: 40, readNodes: 60000, batchBytes: 6291456, batchStmts: 400, rangeGroups: 26, summaryRows: 800 };
var OP_LIM_MSG = {
  'read-too-large': 'طُلبت فترات أكثر من المسموح في قراءة واحدة. اختر مدى أقصر.',
  'period-too-large': 'بيانات هذه الفترة تجاوزت الحد المسموح. راجع الإدخال أو تواصل مع مدير المنصة.',
  'batch-budget': 'العملية أكبر من أن تُنفَّذ مرة واحدة. احفظ شهراً واحداً أو يوماً واحداً في كل مرة.',
  'ops-layout-pending': 'جارٍ تحويل تخزين بيانات هذه الإدارة. أعد المحاولة بعد دقائق.',
  'operations-period-required': 'حُدِّثت المنصة. أعد تحميل الصفحة ثم احفظ.'
};
var OP_PERIOD_RX = /^[^,@*;\u0000-\u001f\u007f]{1,64}$/, OP_LAYOUT_KEY = 'ops_layout_pending';
function opLimError(code, status, extra) { var e = rsError(code, status || 413); e.msg = OP_LIM_MSG[code] || ''; if (extra) e.details = extra; return e; }
function opPeriodDef(info) { return (info && info.definition && info.definition.period) || null; }
function opSplitResource(key) { var info = null; try { info = opInfo(key); } catch (e) { info = null; } return info && opPeriodDef(info) ? info : null; }
/* 'bsdept:<d>:<res>@<p>' ⇒ { key, period, info } — '' الرأس · '*' علامةُ الكتابة بالجملة (للمراجعات وحدها) */
function opPeriodKey(k) {
  var s = String(k), i = s.indexOf('@'); if (i < 0) return null;
  var key = s.slice(0, i), p = s.slice(i + 1), info = opSplitResource(key);
  if (!info || (p !== '' && p !== '*' && !OP_PERIOD_RX.test(p))) return null;
  return { key: key, period: p, info: info };
}
function opContainerKey(def) { return def.field ? '$/f:' + encodeURIComponent(def.field) : '$'; }
function opPeriodRoot(def, p) { return opContainerKey(def) + '/e:' + encodeURIComponent(p); }
function opContainerSpec(info) { var spec = info.prepared.resources[info.resource].spec, def = opPeriodDef(info); return def.field ? spec.children[def.field] : spec; }
function opPeriodIdx(def, p) {
  var x = typeof def.index === 'function' ? def.index(p) : null;
  return { grp: x && typeof x.grp === 'string' ? x.grp : '', seq: x && Number.isSafeInteger(x.seq) ? x.seq : 0, kind: (x && x.kind) || 'day' };
}
function opPeriodOrder(def, list) {
  return list.slice().sort(function (a, b) { var x = opPeriodIdx(def, a), y = opPeriodIdx(def, b); return x.seq - y.seq || (a < b ? -1 : a > b ? 1 : 0); });
}
function opPeriodCtx(def, p) { var c = typeof def.ctx === 'function' ? def.ctx(p) : []; return Array.isArray(c) ? c.filter(function (x) { return typeof x === 'string' && x !== p; }) : []; }
/* الرأسُ والفترات من الوثيقة، مع موضع كل عضوٍ في حاويته (opJoin يعيدها حرفاً بترتيبها) */
function opSplit(info, doc) {
  var def = opPeriodDef(info), out = { head: doc, hpos: {}, periods: {}, pos: {} };
  if (doc === undefined || doc === null) return out;
  if (def.field) {
    if (!ocObj(doc) || !ocObj(doc[def.field])) return out;
    var head = {}; Object.keys(doc).forEach(function (k) { ocSet(head, k, k === def.field ? {} : doc[k]); });
    Object.keys(doc[def.field]).forEach(function (p, i) { ocSet(out.periods, p, doc[def.field][p]); out.pos[p] = i; });
    out.head = head; return out;
  }
  if (!ocObj(doc)) return out;
  var spec = opContainerSpec(info), h = {};
  Object.keys(doc).forEach(function (k, i) {
    if (ocOwn(spec.fields, k)) { ocSet(h, k, doc[k]); out.hpos[k] = i; }
    else { ocSet(out.periods, k, doc[k]); out.pos[k] = i; }
  });
  out.head = h; return out;
}
function opJoin(info, parts) {
  var def = opPeriodDef(info), head = parts.head, names = Object.keys(parts.periods || {});
  if (head === undefined || head === null) { if (names.length) throw ocError('period-without-head'); return head; }
  var byPos = function (pos) { return function (a, b) { var x = ocOwn(pos, a) ? pos[a] : Infinity, y = ocOwn(pos, b) ? pos[b] : Infinity; return x - y; }; };
  if (def.field) {
    if (!ocObj(head) || !ocObj(head[def.field])) { if (names.length) throw ocError('period-container'); return head; }
    var out = {}, box = {};
    names.slice().sort(byPos(parts.pos || {})).forEach(function (p) { ocSet(box, p, parts.periods[p]); });
    Object.keys(head).forEach(function (k) { ocSet(out, k, k === def.field ? box : head[k]); });
    return out;
  }
  if (!ocObj(head)) { if (names.length) throw ocError('period-container'); return head; }
  var pos = Object.assign({}, parts.pos || {}), all = Object.keys(head).concat(names);
  Object.keys(head).forEach(function (k) { pos[k] = parts.hpos && ocOwn(parts.hpos, k) ? parts.hpos[k] : -1; });
  var r = {}; all.slice().sort(byPos(pos)).forEach(function (k) { ocSet(r, k, ocOwn(head, k) ? head[k] : parts.periods[k]); });
  return r;
}
/* مدياتُ row_key: الرأس (ما سوى الحاوية/e:) وفترةٌ بعينها (جذرُها وشجرتُها) — كلُّ مدى [من، إلى) على المفتاح الأساسي */
function opHeadRanges(def) { var e = opContainerKey(def) + '/e'; return [['', e + ':'], [e + ';', '￿']]; }
function opPeriodRanges(def, p) { var r = opPeriodRoot(def, p); return [[r, r + '\u0001'], [r + '/', r + '0']]; }
/* مراجعةُ الفترة الفعلية: MAX(K@p, K@*) — والرأس: MAX(K@, K@*) */
function opPeriodRev(revs, key, p) { return Math.max(rsNat(revs[key + '@' + p] || 0), rsNat(revs[key + '@*'] || 0)); }
function opPeriodRevGuards(env, items) {   // items: [[key, period, rev]]
  return rsChunks(items.map(function (x) { return { a: x[0] + '@' + x[1], b: x[0] + '@*', r: x[2] }; })).map(function (part) {
    return env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(?1)j WHERE MAX(COALESCE((SELECT rev FROM revs WHERE k=json_extract(j.value,'$.a')),0),COALESCE((SELECT rev FROM revs WHERE k=json_extract(j.value,'$.b')),0))<>json_extract(j.value,'$.r'))THEN json_extract('{}','KIVO_REV_CONFLICT')END").bind(JSON.stringify(part));
  });
}
/* حدُّ حجم الفترة عند الحفظ (JSON) */
function opPeriodSizeCheck(def, p, value) {
  var kind = p === '' ? 'head' : opPeriodIdx(def, p).kind, cap = OP_LIM[kind] || OP_LIM.day, n = value === undefined ? 0 : JSON.stringify(value).length;
  if (n > cap) throw opLimError('period-too-large', 413, { period: p, bytes: n, cap: cap });
}
/* ملخّصُ الفترة (ops_period_summary): يُكتب في دفعة حفظها بمراجعتها (meta.rev بعد رفعه)، ويُحذف بحذفها */
function opSummaryValue(info, p, value) {
  var def = opPeriodDef(info); if (p === '' || typeof def.summary !== 'function') return null;
  try { return def.summary(p, value); } catch (e) { return null; }
}
function opSummaryStatements(env, info, changes) {   // changes: [{p, value|undefined}]
  var put = [], drop = [];
  changes.forEach(function (c) { if (c.p === '') return; var v = c.value === undefined ? undefined : opSummaryValue(info, c.p, c.value); if (v == null) drop.push(c.p); else put.push({ p: c.p, v: JSON.stringify(v) }); });
  var st = [];
  if (drop.length) st.push(opTag(env.DB.prepare('DELETE FROM ops_period_summary WHERE department_id=?1 AND resource=?2 AND period IN(SELECT value FROM json_each(?3))').bind(info.dept, info.resource, JSON.stringify(drop)), [opKeyOf(info)]));
  rsChunks(put).forEach(function (part) {
    st.push(opTag(env.DB.prepare("INSERT INTO ops_period_summary(department_id,resource,period,rev,v_json) SELECT ?1,?2,json_extract(j.value,'$.p'),COALESCE((SELECT CAST(v AS INTEGER) FROM meta WHERE k='rev'),0),json_extract(j.value,'$.v') FROM json_each(?3)j WHERE 1 ON CONFLICT(department_id,resource,period) DO UPDATE SET rev=excluded.rev,v_json=excluded.v_json")
      .bind(info.dept, info.resource, JSON.stringify(part)), [opKeyOf(info)]));
  });
  return st;
}
function opKeyOf(info) { return 'bsdept:' + info.dept + ':' + info.resource; }
/* وسمُ عبارة كتابةٍ على ops_* بمفاتيحها المنطقية — 052 dbGuard يرفض دفعةً فيها كتابةٌ لا ترفع مراجعةَ مفتاحها */
function opTag(statement, keys) { try { statement.__opKeys = keys; } catch (e) { /* عبارةٌ مجمَّدة: الفحصُ في dbGuard يعدّها غيرَ موسومة */ } return statement; }
/* الإدارات التي لم تُتمَّ المرحلةَ الثانية من 0013 — كتابتُها التشغيلية مرفوضة 503 ops-layout-pending حتى يُتمّها مديرُ المنصة */
function opLayoutPendingOf(row) { var v = parseJson(row && row.v, []); return Array.isArray(v) ? v.filter(function (d) { return typeof d === 'string'; }) : []; }
function opLayoutStatement(env) { return env.DB.prepare("SELECT v FROM meta WHERE k='" + OP_LAYOUT_KEY + "'"); }
/* 0013 المرحلة ١ (052 migrateDb): الإداراتُ التي لها صفوفٌ في الموارد المقسَّمة ⇒ meta.ops_layout_pending — في دفعة الترحيل الذرّية نفسِها، بـSQL وحده */
function opSplitResources() { return opDefinitions().filter(function (d) { return !!d.period; }).map(function (d) { return d.resource; }); }
function opPeriodsLegacyPrepare(env) {
  return { before: [], after: [env.DB.prepare("INSERT INTO meta(k,v) SELECT '" + OP_LAYOUT_KEY + "',x FROM (SELECT json_group_array(d) x,COUNT(*) n FROM (SELECT DISTINCT department_id d FROM ops_nodes WHERE resource IN (SELECT value FROM json_each(?1)) ORDER BY d)) WHERE n>0 ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(JSON.stringify(opSplitResources()))] };
}
