/* ملف مولَّد — لا يُحرَّر يدوياً، المصدر: src/slots/workers/parts/019g-backup-import.js.tpl */
/* V7 · د6: استيرادُ النسخة على أجزاء — POST /api/backup/import (نسخةُ الإدارة والنسخةُ الشاملة).
   لماذا: حدُّ الطلب 8MB لا يُرفع، ونسخةُ إدارةٍ حقيقية 31MB (بياناتُها وحدها 9.9MB، ومفتاحٌ واحد 8.4MB، وصورُها 21MB).
   كيف: op:'begin' يفتح منطقةً مؤقتة باسم الطلب ← op:'part' يودِع الأجزاء (نصُّ الملف بلا صوره مقطَّعاً · ثم الصورُ واحدةً واحدة) ←
        phase:'inspect' يجمع ويخطّط بلا كتابة ← phase:'commit' يطبّق كلَّ شيءٍ في دفعةٍ واحدة (rsCommit القائمة) ومعها حذفُ المؤقت · op:'cancel' يحذفه
        (inspect/commit باسم phase كما في /api/backup/restore).
   · المؤقت: صفوفٌ في restore_preimage (جدولُ لقطات الاستعادة — لا ترحيلَ مخطّط) باسم 'stage:<requestId>': صفُّ بيانٍ (domain 'meta' · table_key = الحساب ·
     row_number = لحظةُ البدء) وصفوفُ نصٍّ (domain 'f' للملف · 'i' للصور بمعرّفها) كلٌّ ≤ RSI_ROW حرفاً — دون حدِّ قيمة الصف في طبقة التخزين (CHUNK = 700,000).
   · لا يتغيّر شيءٌ قبل الاعتماد: الأجزاءُ لا تمسّ إلا المؤقت، والاعتمادُ دفعةٌ واحدة بحرّاسها (كما /api/backup/restore). انقطاعٌ أو إغلاقُ صفحة ⇒ مؤقتٌ يتيم
     يُزال: بالإلغاء · برفضٍ نهائي · ببدء استيرادٍ آخر للحساب نفسِه · وبعد ساعة (RSI_TTL — هنا ومع كل جولة كنسٍ في 054).
   · كلُّ طلبٍ (كلُّ جزء) يُفحص بصلاحية الاستعادة نفسِها (rsScopeDenied) وبمالك المؤقت؛ والسجلُّ سطرٌ واحد يكتبه rsCommit.
   · إعادةُ جزءٍ أو تكرارُه: يُحذف صفُّه ثم يُكتب (النتيجةُ واحدة) · تكرارُ الاعتماد بعد نجاحه: يُعاد الإيصالُ نفسُه (restore_operations).
   · النسخةُ بالشكل القديم (بلا manifest): ما لا مقابلَ له لا يُسقط بصمت — يُعاد في skip (عند البدء) وفي summary.notTransferred (عند الفحص): المفتاح وسببُه. */
var RSI_TTL = 3600e3, RSI_ROW = 200000, RSI_SEG = { f: 1000000, i: 4000000 }, RSI_MAX = 256e6, RSI_T = 'restore_preimage';
/* المفتاحُ الكبير لا يُحمل كلُّه في الذاكرة: موردٌ تشغيليٌّ جذرُه خريطةٌ (يومٌ ← قيمة) يعلنه نظامُه هنا — [نمطُ الأعضاء التي تُقسم دفعاتٍ · أسرةُ الموارد: تُقسم معاً إن كبر أحدُها،
   ويجب أن تكون كلُّها فارغةً في الهدف]. نمطٌ null = موردٌ لا ينقسم بأعضائه: يُرسل كلُّه دفعةً واحدة في طلبه (محدودةً بحجمه هو، لا تُضاف إلى بقية النسخة) ويُطبَّق كغيره داخل القاعدة.
   العميلُ يقسمه دفعاتٍ (≤ 1M حرف: الأعضاءُ المشتركة + مجموعةُ أيام)؛ وكلُّ دفعةٍ طلبٌ (phase:'slice'): أحكامُ الحفظ القائمة (applySave بعلامة الاستعادة) ثم تحويلُها
   صفوفاً بالمرمِّز القائم (ocConvert · ocPhysicalRows) تودَع في المؤقت؛ والاعتمادُ ينسخها بعباراتٍ تقرأ المؤقت نفسَه (لا يحمل العاملُ أجسامَها) داخل الدفعة الذرّية.
   الشروط: نسخةٌ قديمة · مديرُ المنصة · الموردُ فارغٌ في الهدف (وإلا فالمسارُ الواحد كما كان). */
var RSI_SLICE = {
  'bassam_rounds_v1': ['^\\d{4}-\\d{1,2}-\\d{1,2}(?:-.+)?$', ['bassam_rounds_v1', 'bassam_rounds_arc_v1']],
  'bassam_rounds_arc_v1': ['^\\d{4}-\\d{1,2}-\\d{1,2}(?:-.+)?$', ['bassam_rounds_v1', 'bassam_rounds_arc_v1']],
  'bassam_plan_v1': [null, ['bassam_plan_v1']],   /* V7 · د6: المخططُ كلُّه في طلبه (جذرُه ليس خريطةَ أعضاء) — لا يُضاف إلى بقية النسخة */
  'bassam_staffing_v3': [null, ['bassam_staffing_v3']],   /* V7 · د6: جدولُ الورديات كلُّه في طلبه — لا يُضاف إلى بقية النسخة */
  'bassam_tasks_v1': ['^.', ['bassam_tasks_v1']],   /* V7 · د6: المهامُ خريطةُ أيام — تُقسم أياماً فلا تكبر كلفةُ طلبٍ بطول السجل */
  'bassam_dreport_v1': ['^.', ['bassam_dreport_v1']],   /* V7 · د6: التقريرُ اليومي خريطةُ أيام — يُقسم أياماً */
};
var RSI_SLICE_MIN = 1500000;
/* V7 · د6 (QA ٦ — قرارُ المالك): الدفعاتُ (مسارُ الذاكرة المحدودة) لمدير المنصة ولمدير الإدارة على إدارته (057 enfDeptMgrFull) — كان لمدير المنصة وحده فتُرفض نسخةُ Production لمديرها */
function rsiSliceOk(A, d) { return A.u.role === 'super' || enfDeptMgrFull(A, d); }
async function rsiSliceSpec(env, A, s, keys, mode) {
  var out = {};
  /* V7 · د7: النسخةُ الشاملة — استبدالٌ كامل بمدير المنصة: كلُّ أسرةٍ تُقسم لكل إدارة (الاستبدالُ يطرح القائم) · الدمجُ كما كان (لا دفعات) */
  if (s.kind === 'full') return A.u.role === 'super' && mode === 'replace' ? RSI_SLICE : out;
  if (s.kind !== 'dept' || !rsiSliceOk(A, s.departmentId)) return out;   /* V7 · د6 (QA ٦): مديرُ الإدارة على إدارته بالمسار نفسِه وحدوده */
  for (var n in RSI_SLICE) {
    if (!ocOwn(keys, n) || keys[n]) continue;
    /* الاستبدالُ يطرح القائم فيُقسم دائماً؛ وغيرُه (الدمج) يُقسم إن كانت الأسرةُ فارغةً في الهدف — يُعرف بعدٍّ لا بتحميل */
    var free = mode === 'replace' || !(await env.DB.prepare('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND parent_key IS NOT NULL AND resource IN (SELECT value FROM json_each(?2))').bind(s.departmentId, JSON.stringify(RSI_SLICE[n][1])).first('n'));
    if (free) out[n] = RSI_SLICE[n];
  }
  return out;
}
/* كلفةُ التخطيط في طلبٍ واحد (حيث لا دفعات): مقيسةٌ ≈16MB كومةً لكل مليون حرف من نسخةٍ قديمة و≈7MB من حديثة، و≈0.02MB لكل عقدةٍ قائمة يحمّلها المرجع.
   ما فوق RSI_BUDGET يُرفض عند البدء — قبل أي رفعٍ أو عملٍ ثقيل — بسببٍ واضح، ولا يُحاوَل فيموت العازل. */
var RSI_BUDGET = 40;
async function rsiHeavy(env, s, n, legacy, sliced, present) {
  var fam = [], load = [], cut = [];
  sliced.forEach(function (k) { var p = rsiName(s, k); fam = fam.concat(RSI_SLICE[p[1]][1]); cut = cut.concat(rsiFam(p[0], p[1])); });
  /* V7 · د7: الشاملة — يُعدّ ما سيحمّله المرجعُ وحده: كلُّ عقدةٍ خارج الأُسر · ومن الأُسر مفتاحٌ في بقية النسخة لم يُقسم (الغائبُ والإدارةُ المحذوفة يُطرحان داخل القاعدة — rsiGone) */
  if (s.kind === 'full') Object.keys(present).forEach(function (k) { var i = opInfo(k); if (!present[k] && i && RSI_SLICE[i.resource] && cut.indexOf(k) < 0) load = load.concat(rsiFam(i.dept, i.resource)); });   /* الأسرةُ كلُّها: الجولاتُ في بقية النسخة تكتب أرشيفَها */
  /* V7 · د6: وتنبيهاتُ الإدارة القائمة (خطةُ تنبيهات الإدارة تقرأ نطاقَها وحده — 019d rsNFPlan) تُعدّ كالعقد */
  var nodes = await (s.kind === 'dept' ? env.DB.prepare("SELECT (SELECT COUNT(*) FROM ops_nodes WHERE department_id=?1 AND resource NOT IN (SELECT value FROM json_each(?2)))+(SELECT COUNT(*) FROM notification_messages WHERE scope=?3)+(SELECT COUNT(*) FROM notification_targets WHERE scope=?3)+(SELECT COUNT(*) FROM notification_user_state WHERE message_scope=?3) n").bind(s.departmentId, JSON.stringify(fam), 'd:' + s.departmentId) : env.DB.prepare("SELECT COUNT(*) n FROM ops_nodes WHERE resource NOT IN (SELECT value FROM json_each(?1)) OR 'bsdept:'||department_id||':'||resource IN (SELECT value FROM json_each(?2))").bind(JSON.stringify(Object.keys(RSI_SLICE)), JSON.stringify(load))).first('n'),
    cost = (n / 1e6) * (legacy ? 16 : 7) + nodes * 0.02;
  if (cost > RSI_BUDGET) throw Object.assign(rsError('import-too-heavy', 413), { details: { cost: Math.round(cost), budget: RSI_BUDGET, chars: n, nodes: nodes, kind: s.kind } });
}
/* دفعةٌ واحدة: حكمٌ ثم صفوف — مواضعُ الأعضاء تُرقَّم على المجموع (المشتركةُ أولاً ثم الأيامُ بترتيب الدفعات) */
async function rsiSlice(env, A, request, id, M, b) {
  var D = env.DB, T = RSI_T, name = Object.keys(M.slices)[b.i];
  if (!name) throw rsError('import-part');
  var nm = rsiName(M.scope, name), dept = nm[0], base = nm[1];   /* V7 · د7: دفعةُ النسخة الشاملة تحمل إدارتها في اسمها (<إدارة>/<مورد>#n) */
  var done = (await D.prepare('SELECT row_number r,row_json j FROM ' + T + " WHERE snapshot_id=?1 AND domain='sr' AND row_number<?2").bind(id, b.i).all()).results || [],
    got = await rsiText(env, id, 's', name);
  if (done.length !== b.i || got.text.length !== M.slices[name]) throw rsError('import-incomplete', 409);
  /* مرجعُ الإدارة وحدها، وبلا تحميل مواردها التشغيلية: مواردُ الأسرة تُعرض للحكم فارغةً — الاستبدالُ يطرح القائمَ منها كلَّه (كما يفعل المسارُ الواحد:
     الموردُ الغائب عن النسخة يُستعاد فارغاً)، وفي غير الاستبدال هي فارغةٌ شرطاً. والقائمُ منها يُعرف بعدٍّ: موردٌ قائمٌ لم تنتج له الدفعاتُ شيئاً يُكتب فارغاً. */
  var reference = await rsReferenceSnapshot(env, A.u.id, { departments: [dept], operationalKeys: [] }), key = 'bsdept:' + dept + ':' + base, set = {}, bs = {}, ops = {}, why = {}, held = [];
  env = reference.env; A = reference.A;
  if (!dept || !rsiSliceOk(A, dept) || rsScopeDenied(A, M.scope) || !RSI_SLICE[base]) throw rsError('restore-policy', 403);
  for (var fr of RSI_SLICE[base][1]) {
    reference.operational.keys['bsdept:' + dept + ':' + fr] = null;
    if (await D.prepare('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2').bind(dept, fr).first('n')) held.push('bsdept:' + dept + ':' + fr);
  }
  /* دفعةٌ من نسخةٍ حديثة: صفوفُ المجال التشغيلي لمجموعة أعضاء (بفحص النسخ القائم opBackupDecode) تعود وثيقةً ثم تمرّ بالطريق نفسِه */
  var text = got.text, first = parseJson(text, null), legacy = true;
  if (isObj(first) && isObj(first.rows) && isObj(first.scope)) {
    legacy = false;
    var dec = opBackupDecode(first);
    if (dec.info.resource !== base) throw rsError('import-part');
    text = JSON.stringify(ocInflate(dec.info.prepared, dec.domain).value);
  }
  first = null;
  /* V7 · د6 (remap): دفعةُ موردٍ يعلن مواضعَ إشاراتٍ (RS_DEPT_REFS) من نسخةٍ قديمة — إدارةُ النسخة تُعرف من بقية الملف (أُودِعت كلُّها قبل الدفعات) بالحكم نفسِه (019f rsBCDeptFind) فتُربط إشاراتُها بالوحدة */
  var remap = null;
  if (legacy && RS_DEPT_REFS[base] && M.scope.kind === 'dept') {
    var rest = await rsiText(env, id, 'f', ''), rf = rest.segs === M.f && rest.text.length === M.n ? parseJson(rest.text, null) : null;
    rest = null;
    if (!isObj(rf) || !isObj(rf.data)) throw rsError('import-incomplete', 409);
    var from = rsBCDeptFind({ bassam_notif_v1: parseJson(rf.data.bassam_notif_v1 || 'null', null) }, rf.perms);
    rf = null;
    if (from) {
      var sd = {};
      sd[base] = JSON.parse(text);
      remap = rsBCDeptRemap(sd, null, from, dept, rsBCRemapRec(from, dept));
      text = JSON.stringify(sd[base]);
      var lc = from !== dept ? text.split(from).length - 1 : 0;
      if (lc) remap.left[base] = lc;
    }
  }
  set[key] = text; bs[key] = reference.inputRevs[key] || 0; ops[key] = { op: 'backup.restore', scope: 'dept', mode: 'replace', reason: b.reason || '' }; why[key] = b.reason || '';
  got = null;
  var kv = await applySave(env, { set: set, del: [], base: bs, ops: ops, why: why }, A, reqMeta(request), { quiet: true, __restorePlan: RESTORE_INTERNAL_TOKEN, __srvRestore: RESTORE_INTERNAL_TOKEN });
  if (!kv.__plan || !kv.ok) throw Object.assign(rsError(Object.keys(kv.conflicts || {}).length ? 'conflict' : 'restore-key-denied', Object.keys(kv.conflicts || {}).length ? 409 : 403), { details: { denied: kv.denied, conflicts: Object.keys(kv.conflicts || {}) } });
      await dailyArcPend(env, kv, reference);   /* V7 · د6: دفعةُ الأيام تُقسم بين الحيّ والأرشيف بالخطوة نفسِها (019p3) */
  var rx = RSI_SLICE[base][0] ? new RegExp(RSI_SLICE[base][0]) : null, before = {}, out = { keys: {}, have: {}, imgs: {}, rows: [] }, seq = 0,
    st = [D.prepare('DELETE FROM ' + T + " WHERE snapshot_id=?1 AND domain='q' AND row_number/100000=?2").bind(id, b.i)];
  done.forEach(function (r) { var o = JSON.parse(r.j); Object.keys(o.keys).forEach(function (k) { before[k] = (before[k] || 0) + o.keys[k]; }); });
  if (!b.i || Object.keys(M.slices)[b.i - 1].replace(/#\d+$/, '') !== name.replace(/#\d+$/, '')) out.authz = kv.authzRows || [];
  /* أولُ دفعةٍ لموردها: ما كان قائماً من الأسرة ولم يرد في حكمها يُكتب فارغاً (جذرُه وحده) — فيُستبدل القائمُ ولو لم تأتِ له أيام */
  if (out.authz) held.forEach(function (k) { if (!kv.pend.some(function (pd) { return pd.k === k; })) kv.pend.push({ k: k, act: 'set', v: (ENT[resName(k)] && ENT[resName(k)].empty) || '{}', have: reference.inputRevs[k] || 0 }); });
  out.fields = {};
  if (remap) out.remap = remap;
  kv.pend.forEach(function (pd) {
    if (legacy && pd.act === 'set') pd.v = rsiFields(out.fields, pd.k, pd.v);   /* V7 · د6 (schemafix): ما لا يعرفه المخطّط يُذكر ولا يُرفض به الاستيراد */
    var info = opInfo(pd.k), doc = JSON.parse(pd.v), mine = 0;
    if (!info || pd.act !== 'set' || RSI_SLICE[base][1].indexOf(info.resource) < 0) throw rsError('import-slice-target', 409);
    var dom = ocConvert(info.prepared, info.dept, info.resource, doc, true), shared = 0, root = null, tables = ocPhysicalTables(info.prepared);
    doc = null;
    Object.keys(dom.rows).forEach(function (t) { dom.rows[t].forEach(function (r) { if (r.parent_key == null) root = r.row_key; }); });
    /* المواضعُ متّصلةٌ من الصفر كما يشترط المرمِّز: المشتركةُ أولاً (هي هي في كل دفعة) ثم الأيامُ بترتيب وصولها على مجموع الدفعات.
       V7 · د6 (posfix): أعضاءُ الجذر كلُّهم — لا الصفوفُ وحدها: الحقلُ الثابت القياسي (__pMig في الجولات وأرشيفها · 019p3 fixed) لا صفَّ له، موضعُه عمودٌ
       في صفّ الجذر (أو في صفّ تفاصيله /p:n) — rsiMembers. كان يبقى على موضعه في الدفعة (0) والمداخلُ تُرقَّم من 0 فوقه ⇒ صفوفٌ لا تُقرأ (member-position).
       الآن هي حرفاً ما يكتبه ocConvert للوثيقة المجمَّعة كلِّها (المشتركةُ بترتيبها ثم الأيام) — يثبته اختبارُ (٢٠). */
    if (rx) {
      var kids = rsiMembers(info.prepared.resources[info.resource].spec, dom, root);
      /* حقلٌ ثابتٌ قياسي يطابق نمطَ الدفعات لا يأتي في كل دفعة وصفُّ الجذر واحدٌ لها كلِّها ⇒ لا يُقسم المورد بهذا النمط (لا موردَ اليوم كذلك — حارسٌ لا سلوك) */
      kids.forEach(function (m) { if (m.scalar && rx.test(m.key)) throw rsError('import-slice-target', 409); });
      kids.forEach(function (m) { if (!rx.test(m.key)) m.at(shared++); });
      kids.forEach(function (m) { if (rx.test(m.key)) m.at(shared + (before[pd.k] || 0) + mine++); });
    }
    var phys = ocPhysicalRows(info.prepared, dom);
    dom = null;
    Object.keys(tables).forEach(function (t) {
      rsChunks(phys[t] || []).forEach(function (part) {
        out.rows.push([pd.k, t, b.i * 100000 + seq]);
        st.push(D.prepare('INSERT INTO ' + T + ' SELECT ?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM ' + T + " WHERE snapshot_id=?1 AND domain='meta')").bind(id, 'q', pd.k + '|' + t, b.i * 100000 + seq++, JSON.stringify(part)));
      });
    });
    out.keys[pd.k] = mine; out.have[pd.k] = pd.have || 0; out.imgs[pd.k] = Object.keys(imgIdsIn(pd.v));
  });
  st.push(D.prepare('INSERT OR REPLACE INTO ' + T + ' SELECT ?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM ' + T + " WHERE snapshot_id=?1 AND domain='meta')").bind(id, 'sr', '', b.i, JSON.stringify(out)));
  await env.DB.batch(st);
}
/* V7 · د7: اسمُ الدفعة ⇒ [الإدارة · المورد]: «<مورد>#n» لنسخة الإدارة (إدارتُها النطاق) · «<إدارة>/<مورد>#n» للنسخة الشاملة. غيرُ ذلك ⇒ إدارةٌ فارغة (يُرفض) */
function rsiName(s, k) {
  var b = k.replace(/#\d+$/, ''), j = b.lastIndexOf('/'), d = j < 0 ? s.departmentId : b.slice(0, j);
  return [(j < 0) === (s.kind === 'dept') && rsScopeDepartments([d]) ? d : '', b.slice(j + 1)];
}
/* V7 · د6 (posfix): أعضاءُ جذر الخريطة في صفوف المرمِّز (ocConvert) بمواضعها — كما يعدّها ocInflate عند القراءة حرفاً:
   صفٌّ ابنٌ للجذر بمفتاح عضو (مدخلٌ · أو حقلٌ ثابتٌ غيرُ قياسي) موضعُه r.position؛ وحقلٌ ثابتٌ قياسيٌّ حاضر (kind ≠ 0) موضعُه عمودُ <الحقل>_position
   في صفّ الجذر أو صفّ تفاصيله (fieldSpecs). ⇒ [{ key, pos, scalar, at(n) }] مرتّبةً بالموضع. */
function rsiMembers(spec, dom, root) {
  var out = [];
  Object.keys(dom.rows).forEach(function (t) { dom.rows[t].forEach(function (r) { if (r.parent_key === root && r.member_key != null) out.push({ key: r.member_key, pos: r.position, scalar: false, at: function (n) { r.position = n; } }); }); });
  Object.keys(spec.fields).forEach(function (f) {
    if (spec.fields[f].kind !== 'scalar') return;
    var fs = spec.fieldSpecs[f], key = fs === spec ? root : root + '/p:' + spec.segments.indexOf(fs), c = ocField(f), row = (dom.rows[fs.table] || []).filter(function (r) { return r.row_key === key; })[0];
    if (row && row[c + '_kind'] !== 0) out.push({ key: f, pos: row[c + '_position'], scalar: true, at: function (n) { row[c + '_position'] = n; } });
  });
  return out.sort(function (x, y) { return x.pos - y.pos; });
}
/* V7 · د6 (schemafix): الاستيرادُ لا يُرفض كلُّه بسبب حقل. وثيقةُ موردٍ تشغيلي من نسخةٍ قديمة تُطابَق بمخطّطها قبل الترميز مباشرةً:
   حقلٌ لا يعرفه المخطّط · أو قيمةٌ بشكلٍ لا يحمله — يُزال من الوثيقة ويُسجَّل (المورد · المسار · الحقل · العدد · وكم منها بقيمة)، والباقي يُنقل كما هو.
   transient: حقلٌ عابر للعرض بلا قيمة في النسخة (nNow · capNow · share · shareName فارغة: null · 0 · "") — يُسقط ويُذكر بعدده.
   field: حقلٌ لا مقابل له يحمل قيمة (منه العابرُ بقيمة) — لا يُسقط بصمت: يُذكر في «ما لن يُنقل» قبل التأكيد بعدده.
   field-type: حقلٌ معروف بقيمةٍ لا يقبلها شكلُه. القائمةُ في summary.notTransferred (والنصُّ عند العميل 548). مدخلُ مصفوفةٍ أو جذرٌ لا يطابق يبقى خطأً (المرمِّز). */
var RSI_TRANSIENT = { nNow: 1, capNow: 1, share: 1, shareName: 1 };
function rsiEmpty(v) { return v === null || v === 0 || v === '' || (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length); }
function rsiFits(spec, v) {
  if (v === null) return true;
  if (spec.node.kind === 'union') return spec.choices.filter(function (c) { return ocKindMatches(c.node, v); }).length === 1;
  return ocKindMatches(spec.node, v);
}
function rsiFields(rec, k, raw) {
  var entry = opRegistry()[resName(k)], doc;
  if (!entry || typeof raw !== 'string') return raw;
  try { doc = JSON.parse(raw); } catch (e) { return raw; }
  var res = entry.definition.resource, root = entry.prepared.resources[res].spec, hit = 0;
  function note(path, f, why) {
    hit++;
    var label = res + ' · ' + (path ? path + '.' : '') + f, id = label + '|' + why, r = rec[id] || (rec[id] = { k: label, why: why, n: 0 });
    r.n++;
  }
  function walk(spec, v, path) {
    if (v === null || typeof v !== 'object') return;
    var kind = spec.node.kind;
    if (kind === 'union') { var ch = spec.choices.filter(function (c) { return ocKindMatches(c.node, v); }); if (ch.length === 1) walk(ch[0], v, path); return; }
    if (kind === 'array') { if (Array.isArray(v)) v.forEach(function (x) { walk(spec.entry, x, path + '[]'); }); return; }
    if (kind === 'tuple') { if (Array.isArray(v)) v.forEach(function (x, i) { if (ocOwn(spec.children, String(i))) walk(spec.children[String(i)], x, path + '[' + i + ']'); }); return; }
    if ((kind !== 'object' && kind !== 'map') || !ocObj(v)) return;
    Object.keys(v).forEach(function (f) {
      var field = ocOwn(spec.fields, f) ? spec.fields[f] : null, child = field ? (field.kind === 'scalar' ? { node: field } : spec.children[f]) : null, name = f;
      if (!child && kind === 'map') { try { child = ocEntry(spec, f); name = '{}'; } catch (e) { child = null; } }
      if (!child) { note(path, f, RSI_TRANSIENT[f] && rsiEmpty(v[f]) ? 'transient' : 'field'); delete v[f]; return; }
      if (!rsiFits(child, v[f])) { note(path, name, 'field-type'); delete v[f]; return; }
      walk(child, v[f], (path ? path + '.' : '') + name);
    });
  }
  walk(root, doc, '');
  return hit ? JSON.stringify(doc) : raw;
}
function rsiFieldRec(list) {
  var rec = {};
  (list || []).forEach(function (r) { if (r && (RSI_FIELD_WHY[r.why] || /^nf-/.test(r.why))) rec[r.k + '|' + r.why] = r; });   /* V7 · د6 (remap): وبنودُ التنبيهات المُسقطة nf-* */
  return rec;
}
var RSI_FIELD_WHY = { transient: 1, field: 1, 'field-type': 1, 'mgr-sheet': 1 };   /* V7 · د6 (QA ٦): وصحيفةُ مدير المصدر (019f rsBCMgrSheetDrop) */
function rsiFieldList(recs) {
  var all = {};
  recs.forEach(function (rec) { Object.keys(rec || {}).forEach(function (id) { var r = rec[id]; if (!all[id]) all[id] = { k: r.k, why: r.why, n: 0 }; all[id].n += r.n; }); });
  return Object.keys(all).sort().map(function (id) { return all[id]; });
}
/* سببُ عدم نقل مفتاحٍ من نسخةٍ قديمة ('' = يُنقل): null قيمةٌ فارغة في الملف · device تفضيلُ جهازٍ أو مستخدم · tpls قوالبُ الصلاحيات (حُذفت — الأدوارُ بديلُها) ·
   grants منحٌ صريحة لموظفين (لا تُفتح صلاحيةٌ لم تكن) · unknown لا موردَ له في سجل الموارد الحالي */
/* V7 · د7: قوالبُ نسخة الإدارة تصير أدواراً (019f) */
function rsiSkipWhy(k, v, kind) {
  var n = resName(k), r = resOf(k);
  return v === null ? 'null' : rsBCForbiddenKey(k) || (r && (r.rule === 'selfdev' || r.scope === 'device')) ? 'device' : ENF_TPLS_RES[n] ? ((kind === 'dept' || kind === 'full') && n === ENF_TPLS_ROLES_RES ? '' : 'tpls') : n === ENF_GRANTS_RES ? 'grants' : r ? '' : 'unknown';
}
function rsiSweepStmt(env, now, uid) {
  return env.DB.prepare('DELETE FROM ' + RSI_T + ' WHERE snapshot_id IN (SELECT snapshot_id FROM ' + RSI_T + " WHERE domain='meta' AND snapshot_id>='stage:' AND snapshot_id<'stage;' AND (row_number<?1 OR table_key=?2))").bind(now - RSI_TTL, uid);
}
/* الكنسُ: مع كل جولة كنسٍ بعد الكتابات العادية (054 imgSweepSafe — مرةً كل مدةٍ للمنصة) ومع كل بدء. لا كنسَ على القراءات:
   القراءةُ لا تزيد جولةَ قاعدة (ميزانيةُ قراءة التنبيهات سبعُ جولات — notifications_due_gate). المؤقتُ المنقضي لا يُعتمد أبداً (410) حتى يُكنس. */
function rsiDrop(env, id) {
  return env.DB.prepare('DELETE FROM ' + RSI_T + ' WHERE snapshot_id=?1').bind(id);
}
/* نصُّ بندٍ من المؤقت بترتيب صفوفه (صفحاتٌ صغيرة — لا ردَّ يتجاوز 3.2M حرفاً) وعددُ أجزائه المودَعة */
async function rsiText(env, id, dom, key) {
  var out = '', seen = new Set(), after = -1, rows;
  do {
    rows = (await env.DB.prepare("SELECT row_number r,json_extract(row_json,'$') v FROM " + RSI_T + ' WHERE snapshot_id=?1 AND domain=?2 AND table_key=?3 AND row_number>?4 ORDER BY row_number LIMIT 16').bind(id, dom, key, after).all()).results || [];
    rows.forEach(function (r) { out += r.v; seen.add(Math.floor(r.r / 1000)); after = r.r; });
  } while (rows.length === 16);
  return { text: out, segs: seen.size };
}
/* V7 · د7: الشاملة — أسرةُ المورد لإدارة · إداراتُ النسخة والهدف (ما له صفوف) ومفاتيحُ الأسر القائمة فيه (بعدٍّ لا بتحميل) · وهل المفتاحُ في بقية النسخة (قديمةٌ: data · حديثة: صفوفُه في domains.operations) */
function rsiFam(d, r) { return RSI_SLICE[r][1].map(function (x) { return 'bsdept:' + d + ':' + x; }); }
async function rsiHeld(env, file) {
  var rows = (await env.DB.prepare('SELECT DISTINCT department_id d,resource r FROM ops_nodes WHERE parent_key IS NULL').all()).results || [], ds = [];
  [].concat(parseJson((file.data || {})[K_DEPTS] || '[]', []), rows).forEach(function (x) { x = x && (x.id || x.d); if (rsScopeDepartments([x]) && ds.indexOf(x) < 0) ds.push(x); });
  return { ds: ds, held: rows.filter(function (x) { return RSI_SLICE[x.r]; }).map(function (x) { return 'bsdept:' + x.d + ':' + x.r; }) };
}
function rsiInRest(file, k) {
  var i = opInfo(k), o = isObj(file.domains) && file.domains.operations;
  return (isObj(file.data) && file.data[k] != null) || (Array.isArray(o) && o.some(function (d) { return isObj(d) && d.resource === i.resource && isObj(d.scope) && d.scope.departmentId === i.dept && isObj(d.rows) && (d.rows.ops_nodes || []).length > 0; }));
}
async function rsImportRoute(env, request, ss) {
  var A = await actorOf(env, ss.uid), sid = '', stage = null;
  if (!A) return json({ ok: 0, err: 'session' }, 401);
  try {
    if (request.method !== 'POST') throw rsError('method', 405);
    var bytes = await request.arrayBuffer(), b;
    if (bytes.byteLength > bodyLimit('/api/backup/import')) throw rsError('body-large', 413);
    try { b = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { throw rsError('bad-body'); }
    var bad = bodyCheck('/api/backup/import', b);
    if (bad) return json({ ok: 0, err: 'bad-body', at: bad }, 400);
    if (!isObj(b) || !/^[-A-Za-z0-9_]{8,100}$/.test(b.requestId || '')) throw rsError('restore-shape');
    var now = Date.now(), id = 'stage:' + b.requestId, op = b.op || b.phase, D = env.DB, s = b.scope, T = RSI_T;
    if (op === 'begin') {
      if (!isObj(s) || ['full', 'dept'].indexOf(s.kind) < 0 || rsScopeDenied(A, s) || (s.kind === 'dept' && !A.depts.some(function (d) { return d.id === s.departmentId; }))) throw rsError('restore-policy', 403);
      var skip = Object.keys(b.keys || {}).map(function (k) { return { k: k, why: rsiSkipWhy(k, b.keys[k] ? null : '', s.kind) }; }).filter(function (x) { return x.why; });
      var spec = await rsiSliceSpec(env, A, s, b.resources || b.keys || {}, b.mode);
      if (b.dry) return json({ ok: 1, skip: skip, slice: spec, sliceMin: RSI_SLICE_MIN });
      var im = b.images || {}, ids = Object.keys(im), total = b.n, meta = { scope: s, n: b.n, f: b.f, images: {}, slices: b.slices || {}, mode: b.mode || '' }, bases = {};
      Object.keys(meta.slices).forEach(function (k) {
        var sb = k.replace(/#\d+$/, ''), sn = rsiName(s, k);
        if (!sn[0] || !ocOwn(spec, sb = sn[1]) || !(meta.slices[k] > 1) || (spec[sb][0] && meta.slices[k] > RSI_SEG.f)) throw rsError('import-shape');
        if ((meta.slices[k] / 1e6) * 16 > RSI_BUDGET) throw Object.assign(rsError('import-too-heavy', 413), { details: { cost: Math.round((meta.slices[k] / 1e6) * 16), budget: RSI_BUDGET, chars: meta.slices[k], k: sb, kind: s.kind } });
        total += meta.slices[k]; bases[k.replace(/#\d+$/, '')] = 1;   /* V7 · د7: باسمها كاملاً (بإدارتها في الشاملة) */
      });
      ids.forEach(function (k) {
        if (!/^(?:img|szp)_[a-z0-9]+_[a-z0-9]+$/.test(k) || !(im[k] > 0) || im[k] > IMG_TOTAL_MAX) throw Object.assign(rsError('import-shape'), { details: { k: k.slice(0, 80) } });   /* الصورةُ المرفوضة تُسمّى */
        meta.images[k] = [im[k], Math.ceil(im[k] / RSI_SEG.i)];
        total += im[k];
      });
      if (!(b.n > 1) || !(b.f > 0) || b.f > Math.ceil(b.n / (RSI_SEG.f - 1)) || ids.length > IMG_CAP || total > RSI_MAX) throw Object.assign(rsError(total > RSI_MAX ? 'import-too-large' : 'import-shape', total > RSI_MAX ? 413 : 400), { details: { chars: total, limit: RSI_MAX } });
      /* ما كان يقبله المسارُ القديم أصلاً (النسخةُ كلُّها ≤ حدِّ طلبه 8MB) لا يُرفض هنا — لا تراجعَ عمّا كان يُستعاد قبل د6 */
      if (total > 8e6) await rsiHeavy(env, s, b.n, Object.keys(b.keys || {}).length > 0, Object.keys(bases), b.resources || b.keys || {});
      await D.batch([rsiSweepStmt(env, now, A.u.id), D.prepare('INSERT INTO ' + T + " VALUES(?1,'meta',?2,?3,?4)").bind(id, A.u.id, now, JSON.stringify(meta))]);
      return json({ ok: 1, skip: skip, seg: RSI_SEG });
    }
    var fp = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['import', b.requestId, s, b.mode, b.reason]))));
    if (op === 'commit') {
      var done = await D.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2').bind(A.u.id, b.requestId).first();
      if (done) {
        if (rsScopeDenied(A, s)) throw rsError('restore-policy', 403);
        if (done.fingerprint !== fp) throw rsError('restore-request-reused', 409);
        return json(await rsCommit(env, A, { receipt: done }, reqMeta(request)));
      }
    }
    var row = await D.prepare('SELECT table_key u,row_number t,row_json j FROM ' + T + " WHERE snapshot_id=?1 AND domain='meta'").bind(id).first();
    if (!row || row.u !== A.u.id) throw rsError('import-unknown', 404);
    var M = JSON.parse(row.j);
    sid = id;
    if (rsScopeDenied(A, M.scope)) throw rsError('restore-policy', 403);
    if (op === 'cancel') { sid = ''; await rsiDrop(env, id).run(); return json({ ok: 1 }); }
    if (now - row.t > RSI_TTL) throw rsError('import-expired', 410);
    if (op === 'part') {
      var st = [];
      (b.items || []).forEach(function (it) {
        var sl = it.k.charAt(0) === '#', dom = sl ? 's' : it.k ? 'i' : 'f', t = it.t;
        if (sl) { it.k = it.k.slice(1); if (!ocOwn(M.slices || {}, it.k) || !(it.s < Math.ceil(M.slices[it.k] / (RSI_SEG.f - 1))) || !t || t.length > RSI_SEG.f || /^[\udc00-\udfff]|[\ud800-\udbff]$/.test(t)) throw rsError('import-part'); }
        else if (!(it.s < (it.k ? (M.images[it.k] || [])[1] : M.f)) || !t || t.length > RSI_SEG[dom] || (it.k ? !(it.s ? imgPartOk(t) : imgTypeOk(t)) : /^[\udc00-\udfff]|[\ud800-\udbff]$/.test(t))) throw rsError('import-part');
        st.push(D.prepare('DELETE FROM ' + T + ' WHERE snapshot_id=?1 AND domain=?2 AND table_key=?3 AND row_number/1000=?4').bind(id, dom, it.k, it.s));
        for (var at = 0, j = 0; at < t.length; j++) {
          var end = Math.min(t.length, at + RSI_ROW);
          if (end < t.length && (t.charCodeAt(end - 1) & 0xfc00) === 0xd800) end--;
          /* الإيداعُ مشروطٌ ببقاء بيان المؤقت في العبارة نفسِها: إلغاءٌ سبق هذا الجزءَ بلحظة لا يترك صفاً يتيماً */
          st.push(D.prepare('INSERT INTO ' + T + ' SELECT ?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM ' + T + " WHERE snapshot_id=?1 AND domain='meta')").bind(id, dom, it.k, it.s * 1000 + j, JSON.stringify(t.slice(at, end))));
          at = end;
        }
      });
      if (!st.length) throw rsError('import-part');
      await D.batch(st);
      return json({ ok: 1 });
    }
    M.slices = M.slices || {};
    if (op === 'slice') { await rsiSlice(env, A, request, id, M, b); return json({ ok: 1 }); }
    if ((op !== 'inspect' && op !== 'commit') || !deq(M.scope, s) || (Object.keys(M.slices).length && M.mode !== b.mode)) throw rsError('restore-shape');
    var sr = (await D.prepare('SELECT row_json j FROM ' + T + " WHERE snapshot_id=?1 AND domain='sr' ORDER BY row_number").bind(id).all()).results || [];
    if (sr.length !== Object.keys(M.slices).length) throw rsError('import-incomplete', 409);
    sr = sr.map(function (r) { return JSON.parse(r.j); });
    /* الاكتمال: كلُّ جزءٍ معلَن أُودِع وطولُ المجموع كما أُعلن — وإلا فلا تخطيطَ ولا كتابة */
    var got = await rsiText(env, id, 'f', ''), file = null, drop = [],
      sizes = (await D.prepare("SELECT table_key k,COUNT(DISTINCT row_number/1000) c,SUM(length(json_extract(row_json,'$'))) n FROM " + T + " WHERE snapshot_id=?1 AND domain='i' GROUP BY table_key").bind(id).all()).results || [];
    if (got.segs === M.f && got.text.length === M.n) { try { file = JSON.parse(got.text); } catch (e) { file = null; } }
    got = null;
    if (!isObj(file) || sizes.length !== Object.keys(M.images).length || sizes.some(function (r) { var d = M.images[r.k]; return !d || d[0] !== r.n || d[1] !== r.c; })) throw rsError('import-incomplete', 409);
    delete file.idbImages;
    var full = s.kind === 'full', fk = function (k) { var p = rsiName(s, k); return 'bsdept:' + p[0] + ':' + p[1]; };   /* V7 · د7: مفتاحُ الدفعة كاملاً بإدارتها */
    if (isObj(file.data) && Object.keys(M.slices).some(function (k) { return file.data[full ? fk(k) : rsiName(s, k)[1]] != null; })) throw rsError('import-shape');
    if (isObj(file.data) && !rsBCOwn(file, 'manifest'))
      Object.keys(file.data).forEach(function (k) {
        var why = rsiSkipWhy(k, file.data[k], M.scope && M.scope.kind);
        if (why) { drop.push(why === 'grants' ? { k: k, why: why, n: Object.keys((parseJson(file.data[k], null) || {}).emp || {}).length } : { k: k, why: why }); delete file.data[k]; }   /* المنحُ تُذكر بعددها */
      });
    stage = {
      rsiStage: 1, ids: M.images, fresh: [], unref: [], put: [],
      text: async function (k) { return (await rsiText(env, id, 'i', k)).text; },
      /* جسمُ الصورة الجديدة: في D1 يُنسخ من المؤقت بعبارةٍ واحدة داخل دفعة الاعتماد (لا تمرّ بايتاتُه بالعامل) · مع مستودعٍ كائنيّ يوضع الكائنُ عند الاعتماد وحده ثم سطرُ مرجعه */
      store: async function (k) {
        var B = imgBucket(env);
        if (!B) return ((await D.prepare('SELECT row_number r FROM ' + T + " WHERE snapshot_id=?1 AND domain='i' AND table_key=?2 ORDER BY row_number").bind(id, k).all()).results || []).map(function (x) {
          return D.prepare("INSERT INTO imgs(k,seq,v) SELECT ?2,row_number,json_extract(row_json,'$') FROM " + T + " WHERE snapshot_id=?1 AND domain='i' AND table_key=?2 AND row_number=?3").bind(id, k, x.r);
        });
        if (op !== 'commit') return [];
        stage.put.push(k);
        return await imgStoreStmts(env, k, await stage.text(k));
      },
      /* مراجعُ الصور في المفاتيح المودَعة على دفعات: تدخل حسابَ الصور كما لو كانت وثائقُها في الخطة */
      touch: function (plan) {
        var ids = {};
        gone.forEach(function (k) { ids[k] = {}; });   /* V7 · د7: ما يُطرح لا يذكر صورة */
        sr.forEach(function (o) { Object.keys(o.imgs).forEach(function (k) { o.imgs[k].forEach(function (x) { (ids[k] = ids[k] || {})[x] = 1; }); }); });
        Object.keys(ids).forEach(function (k) { (plan.imgTouch || (plan.imgTouch = [])).push({ k: k, v: Object.keys(ids[k]).join(' ') }); });
      },
      done: function (plan, summary) {
        /* مواردُ الدفعات في دفعة الاعتماد — كلُّها عباراتٌ تقرأ القاعدة نفسَها، لا يحمل العاملُ صفاً منها:
           حارسُ نسخة المورد كما قرأتها دفعاتُه · لقطةُ ما قبله (صفوفُه القائمة تُنسخ إلى restore_preimage) · إزالةُ القائم منه · ثم عبارةٌ لكل صفٍّ مودَع (≤ 500KB)
           بترتيب إيداعه · نسخةُ المورد تتقدّم · سطرُ قرار الصلاحية. */
        var keys = {}, rows = [], imgs = {};
        /* V7 · د7: الشاملة — مفتاحُ أسرةٍ قائمٌ في الهدف غائبٌ عن النسخة (أو إدارتُه حذفتها النسخة): لقطتُه وإزالتُه داخل القاعدة بلا تحميل (rsiGone) */
        gone.forEach(function (k) { keys[k] = reference.inputRevs[k] || 0; });
        sr.forEach(function (o) {
          Object.keys(o.have).forEach(function (k) { if (ocOwn(keys, k) && keys[k] !== o.have[k]) throw rsError('conflict', 409); keys[k] = o.have[k]; });
          rows = rows.concat(o.rows);
          Object.keys(o.imgs).forEach(function (k) { o.imgs[k].forEach(function (x) { (imgs[k] = imgs[k] || {})[x] = 1; }); });
          (o.authz || []).forEach(function (r) { plan.authz.push(r); });
        });
        /* حدودُ الوثيقة كلِّها تُحسب على مجموع دفعاتها: سقفُ الصور في السجل الواحد (IMG_CAP) لا يُتجاوز بالتقسيم */
        Object.keys(imgs).forEach(function (k) { if (Object.keys(imgs[k]).length > IMG_CAP) { var den = {}; den[k] = { why: 'img-limit' }; throw Object.assign(rsError('restore-key-denied', 403), { details: { denied: den, conflicts: [] } }); } });
        plan.snapshotSql = plan.snapshotSql || [];
        Object.keys(keys).forEach(function (k) {
          var info = opInfo(k), tables = ocPhysicalTables(info.prepared), names = Object.keys(tables), where = ' WHERE department_id=?1 AND resource=?2';
          if (plan.kv.pend.some(function (pd) { return pd.k === k; })) throw rsError('conflict', 409);
          plan.guards.push(revGuard(env, k, keys[k]));
          names.forEach(function (t) {
            var cols = tables[t], packs = [];
            for (var c = 0; c < cols.length; c += 40) packs.push('json_array(' + cols.slice(c, c + 40).join(',') + ')');
            plan.snapshotSql.push(function (snap) {
              return [D.prepare("INSERT INTO restore_snapshot_manifest(snapshot_id,domain,table_key,row_count) SELECT ?3,'operations-sql',?4,COUNT(*) FROM " + t + where).bind(info.dept, info.resource, snap, k + ':' + t),
                D.prepare('INSERT INTO ' + T + "(snapshot_id,domain,table_key,row_number,row_json) SELECT ?3,'operations-sql',?4,ROW_NUMBER() OVER (ORDER BY row_key),json_array(" + packs.join(',') + ') FROM ' + t + where).bind(info.dept, info.resource, snap, k + ':' + t)];
            });
          });
          plan.statements.push(D.prepare('UPDATE ops_nodes SET parent_key=NULL' + where).bind(info.dept, info.resource));
          names.slice().reverse().forEach(function (t) { plan.statements.push(D.prepare('DELETE FROM ' + t + where).bind(info.dept, info.resource)); });
          plan.revisionKeys.push(k); plan.counts.operations++;
        });
        rows.sort(function (x, y) { return x[2] - y[2]; }).forEach(function (r) {
          var cols = ocPhysicalTables(opInfo(r[0]).prepared)[r[1]], mutable = cols.filter(function (c) { return c !== 'department_id' && c !== 'resource' && c !== 'row_key'; });
          plan.statements.push(D.prepare('INSERT INTO ' + r[1] + '(' + cols.join(',') + ') SELECT ' + cols.map(function (c) { return "json_extract(j.value,'$." + c + "')"; }).join(',') + ' FROM ' + T +
            " s, json_each(s.row_json) j WHERE s.snapshot_id=?1 AND s.domain='q' AND s.row_number=?2 ON CONFLICT(department_id,resource,row_key) DO UPDATE SET " + mutable.map(function (c) { return c + '=excluded.' + c; }).join(',')).bind(id, r[2]));
        });
        /* ما أُخرج من نصّ الملف ليُرسل دفعاتٍ ليس «مجموعةً غائبة عن النسخة» */
        Object.keys(M.slices).forEach(function (k) { var gone = 'operations:' + fk(k); summary.emptyDomains = summary.emptyDomains.filter(function (x) { return x !== gone; }); });
        /* V7 · د6 (schemafix): وما لا يعرفه المخطّط من حقول الموارد: من بقية الملف (019t) ومن الدفعات — بعدده */
        /* V7 · د6 (remap): إشاراتُ المعرّف المصدر في الدفعات تُجمع إلى إشارات بقية الملف */
        sr.forEach(function (o) {
          var x = o.remap, y;
          if (!x) return;
          y = summary.remap = summary.remap || rsBCRemapRec(x.from, x.to);
          y.n += x.n;
          ['by', 'foreign', 'left'].forEach(function (f) { Object.keys(x[f]).forEach(function (k) { y[f][k] = (y[f][k] || 0) + x[f][k]; }); });
        });
        summary.notTransferred = drop.concat(rsiFieldList([rsiFieldRec(summary.notTransferred)].concat(sr.map(function (o) { return o.fields; }))), stage.unref.map(function (k) { return { k: k, why: 'image-unreferenced' }; }));
        summary.imagesNew = stage.fresh.length;
        if (op === 'commit') plan.statements.push(rsiDrop(env, id));
      },
    };
    /* مرجعُ استيراد الإدارة: الإدارةُ وحدها (لا مواردَ الإدارات الأخرى)، وبلا أسرة الموارد المودَعة على دفعات — فلا يُحمَّل القائمُ منها ولا تمسّها الخطةُ العامة */
    var famKeys = [], gone = [], h = full && await rsiHeld(env, file), ds = h ? h.ds : [s.departmentId];
    Object.keys(M.slices).forEach(function (k) { var p = rsiName(s, k); rsiFam(p[0], p[1]).forEach(function (x) { if (famKeys.indexOf(x) < 0) famKeys.push(x); }); });
    /* V7 · د7: النسخةُ الشاملة استبدالاً: مفتاحُ أسرةٍ غيرُ مقسوم وغائبٌ عن بقية النسخة وله صفوفٌ في الهدف (إدارةٌ تحذفها النسخة · أو موردٌ لا تحمله) يُطرح داخل القاعدة كالمقسوم —
       فلا يحمّل المرجعُ أسرةَ أيِّ إدارة. والحاضرُ في بقية النسخة (أصغرُ من أن يُقسم) يمرّ بالخطة العامة كما كان */
    if (h && M.mode === 'replace') gone = h.held.filter(function (k) { var i = opInfo(k); return famKeys.indexOf(k) < 0 && !rsiFam(i.dept, i.resource).some(function (x) { return rsiInRest(file, x); }); });   /* الأسرةُ وحدة: عضوٌ منها في بقية النسخة ⇒ الخطةُ العامة لها كلِّها */
    stage.skip = famKeys.concat(gone);
    var reference = await rsReferenceSnapshot(env, A.u.id, s.kind === 'dept' || stage.skip.length ? { departments: full ? null : ds, operationalKeys: rsScopeOperationalKeys(ds).filter(function (k) { return stage.skip.indexOf(k) < 0; }) } : undefined);
    if (rsScopeDenied(reference.A, s)) throw rsError('restore-policy', 403);
    reference.noWiden = s.kind === 'dept';
    var run = { version: 1, uid: A.u.id, requestId: b.requestId, scope: s, mode: b.mode, reason: b.reason, base: b.base, backup: file, legacyConsent: b.legacyConsent === true, phase: op };
    file = null;
    var out = await rsBackupRun(reference.env, reference.A, request, run, reference, fp, stage);
    if (op === 'commit') out.imagesNew = stage.fresh.length;
    return json(out);
  } catch (e) {
    var failed = rsErrorResponse(e), final = failed && failed.status < 500 && (failed.status !== 409 || (!!e.rs && e.rs !== 'conflict' && e.rs !== 'restore-epoch-changed'));
    try {
      /* كائناتٌ وُضعت لاعتمادٍ لم يتمّ: تُزال ما لم يظهر لمعرّفها صفٌّ (رفعٌ آخر سبق) */
      for (var k of (stage && stage.put) || []) if ((await kvGet(env, 'imgs', k)) === null) await imgDropR2(env, k);
      if (sid && final) await rsiDrop(env, sid).run();   /* رفضٌ نهائي ⇒ يُنظَّف المؤقت؛ تعارضُ النسخ (conflict · restore-epoch-changed) وخطأُ الخادم يُبقيانه لإعادة المحاولة */
    } catch (e2) { swallow('import-clean', e2, env && env.__rid); }
    if (failed) return failed;
    throw e;
  }
}
