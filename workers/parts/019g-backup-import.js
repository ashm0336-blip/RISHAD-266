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
};
var RSI_SLICE_MIN = 1500000;
async function rsiSliceSpec(env, A, s, keys, mode) {
  var out = {};
  if (A.u.role !== 'super' || s.kind !== 'dept') return out;
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
async function rsiHeavy(env, s, n, legacy, sliced) {
  var fam = [];
  sliced.forEach(function (k) { fam = fam.concat(RSI_SLICE[k][1]); });
  var nodes = await (s.kind === 'dept' ? env.DB.prepare('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource NOT IN (SELECT value FROM json_each(?2))').bind(s.departmentId, JSON.stringify(fam)) : env.DB.prepare('SELECT COUNT(*) n FROM ops_nodes')).first('n'),
    cost = (n / 1e6) * (legacy ? 16 : 7) + nodes * 0.02;
  if (cost > RSI_BUDGET) throw Object.assign(rsError('import-too-heavy', 413), { details: { cost: Math.round(cost), budget: RSI_BUDGET, chars: n, nodes: nodes, kind: s.kind } });
}
/* دفعةٌ واحدة: حكمٌ ثم صفوف — مواضعُ الأعضاء تُرقَّم على المجموع (المشتركةُ أولاً ثم الأيامُ بترتيب الدفعات) */
async function rsiSlice(env, A, request, id, M, b) {
  var D = env.DB, T = RSI_T, name = Object.keys(M.slices)[b.i], base = name && name.replace(/#\d+$/, '');
  if (!name) throw rsError('import-part');
  var done = (await D.prepare('SELECT row_number r,row_json j FROM ' + T + " WHERE snapshot_id=?1 AND domain='sr' AND row_number<?2").bind(id, b.i).all()).results || [],
    got = await rsiText(env, id, 's', name);
  if (done.length !== b.i || got.text.length !== M.slices[name]) throw rsError('import-incomplete', 409);
  /* مرجعُ الإدارة وحدها، وبلا تحميل مواردها التشغيلية: مواردُ الأسرة تُعرض للحكم فارغةً — الاستبدالُ يطرح القائمَ منها كلَّه (كما يفعل المسارُ الواحد:
     الموردُ الغائب عن النسخة يُستعاد فارغاً)، وفي غير الاستبدال هي فارغةٌ شرطاً. والقائمُ منها يُعرف بعدٍّ: موردٌ قائمٌ لم تنتج له الدفعاتُ شيئاً يُكتب فارغاً. */
  var dept = M.scope.departmentId, reference = await rsReferenceSnapshot(env, A.u.id, { departments: [dept], operationalKeys: [] }), key = 'bsdept:' + dept + ':' + base, set = {}, bs = {}, ops = {}, why = {}, held = [];
  env = reference.env; A = reference.A;
  if (A.u.role !== 'super' || rsScopeDenied(A, M.scope) || !RSI_SLICE[base]) throw rsError('restore-policy', 403);
  for (var fr of RSI_SLICE[base][1]) {
    reference.operational.keys['bsdept:' + dept + ':' + fr] = null;
    if (await D.prepare('SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2').bind(dept, fr).first('n')) held.push('bsdept:' + dept + ':' + fr);
  }
  /* دفعةٌ من نسخةٍ حديثة: صفوفُ المجال التشغيلي لمجموعة أعضاء (بفحص النسخ القائم opBackupDecode) تعود وثيقةً ثم تمرّ بالطريق نفسِه */
  var text = got.text, first = parseJson(text, null);
  if (isObj(first) && isObj(first.rows) && isObj(first.scope)) {
    var dec = opBackupDecode(first);
    if (dec.info.resource !== base) throw rsError('import-part');
    text = JSON.stringify(ocInflate(dec.info.prepared, dec.domain).value);
  }
  first = null;
  set[key] = text; bs[key] = reference.inputRevs[key] || 0; ops[key] = { op: 'backup.restore', scope: 'dept', mode: 'replace', reason: b.reason || '' }; why[key] = b.reason || '';
  got = null;
  var kv = await applySave(env, { set: set, del: [], base: bs, ops: ops, why: why }, A, reqMeta(request), { quiet: true, __restorePlan: RESTORE_INTERNAL_TOKEN, __srvRestore: RESTORE_INTERNAL_TOKEN });
  if (!kv.__plan || !kv.ok) throw Object.assign(rsError(Object.keys(kv.conflicts || {}).length ? 'conflict' : 'restore-key-denied', Object.keys(kv.conflicts || {}).length ? 409 : 403), { details: { denied: kv.denied, conflicts: Object.keys(kv.conflicts || {}) } });
      await dailyArcPend(env, kv, reference);   /* V7 · د6: دفعةُ الأيام تُقسم بين الحيّ والأرشيف بالخطوة نفسِها (019p3) */
  var rx = RSI_SLICE[base][0] ? new RegExp(RSI_SLICE[base][0]) : null, before = {}, out = { keys: {}, have: {}, imgs: {}, rows: [] }, seq = 0,
    st = [D.prepare('DELETE FROM ' + T + " WHERE snapshot_id=?1 AND domain='q' AND row_number/100000=?2").bind(id, b.i)];
  done.forEach(function (r) { var o = JSON.parse(r.j); Object.keys(o.keys).forEach(function (k) { before[k] = (before[k] || 0) + o.keys[k]; }); });
  if (!b.i || Object.keys(M.slices)[b.i - 1].replace(/#\d+$/, '') !== base) out.authz = kv.authzRows || [];
  /* أولُ دفعةٍ لموردها: ما كان قائماً من الأسرة ولم يرد في حكمها يُكتب فارغاً (جذرُه وحده) — فيُستبدل القائمُ ولو لم تأتِ له أيام */
  if (out.authz) held.forEach(function (k) { if (!kv.pend.some(function (pd) { return pd.k === k; })) kv.pend.push({ k: k, act: 'set', v: (ENT[resName(k)] && ENT[resName(k)].empty) || '{}', have: reference.inputRevs[k] || 0 }); });
  kv.pend.forEach(function (pd) {
    var info = opInfo(pd.k), doc = JSON.parse(pd.v), mine = 0;
    if (!info || pd.act !== 'set' || RSI_SLICE[base][1].indexOf(info.resource) < 0) throw rsError('import-slice-target', 409);
    var dom = ocConvert(info.prepared, info.dept, info.resource, doc, true), shared = 0, root = null, tables = ocPhysicalTables(info.prepared);
    doc = null;
    Object.keys(dom.rows).forEach(function (t) { dom.rows[t].forEach(function (r) { if (r.parent_key == null) root = r.row_key; }); });
    /* المواضعُ متّصلةٌ من الصفر كما يشترط المرمِّز: المشتركةُ أولاً (هي هي في كل دفعة) ثم الأيامُ بترتيب وصولها على مجموع الدفعات */
    var kids = [];
    Object.keys(dom.rows).forEach(function (t) { dom.rows[t].forEach(function (r) { if (r.parent_key === root && r.member_key != null) kids.push(r); }); });
    kids.sort(function (x, y) { return x.position - y.position; });
    if (rx) {
      kids.forEach(function (r) { if (!rx.test(r.member_key)) r.position = shared++; });
      kids.forEach(function (r) { if (rx.test(r.member_key)) r.position = shared + (before[pd.k] || 0) + mine++; });
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
/* سببُ عدم نقل مفتاحٍ من نسخةٍ قديمة ('' = يُنقل): null قيمةٌ فارغة في الملف · device تفضيلُ جهازٍ أو مستخدم · tpls قوالبُ الصلاحيات (حُذفت — الأدوارُ بديلُها) ·
   grants منحٌ صريحة لموظفين (لا تُفتح صلاحيةٌ لم تكن) · unknown لا موردَ له في سجل الموارد الحالي */
function rsiSkipWhy(k, v) {
  var n = resName(k), r = resOf(k);
  return v === null ? 'null' : rsBCForbiddenKey(k) || (r && (r.rule === 'selfdev' || r.scope === 'device')) ? 'device' : ENF_TPLS_RES[n] ? 'tpls' : n === ENF_GRANTS_RES ? 'grants' : r ? '' : 'unknown';
}
function rsiSweepStmt(env, now, uid) {
  return env.DB.prepare('DELETE FROM ' + RSI_T + ' WHERE snapshot_id IN (SELECT snapshot_id FROM ' + RSI_T + " WHERE domain='meta' AND snapshot_id>='stage:' AND snapshot_id<'stage;' AND (row_number<?1 OR table_key=?2))").bind(now - RSI_TTL, uid);
}
/* الكنسُ الدوريّ: لا ينتظر استيراداً آخر ولا كتابة — أيُّ طلب API ناجح يطلبه، ويُجاب مرةً كل RSI_SWEEP_EVERY لكل عازل (أولُها بعد المدة من بدء العازل)؛
   بعد الردّ إن وفّر التشغيلُ waitUntil. وكنسُ الكتابات (054) وكنسُ البدء باقيان. */
var RSI_SWEEP_EVERY = 300e3, rsiSweptAt = Date.now();
function rsiSweepLater(env) {
  var now = Date.now();
  if (now - rsiSweptAt < RSI_SWEEP_EVERY) return null;
  rsiSweptAt = now;
  var p = rsiSweepStmt(env, now, '').run().catch(function (e) { swallow('import-sweep', e, env && env.__rid); });
  if (env && env.__ctx && typeof env.__ctx.waitUntil === 'function') { env.__ctx.waitUntil(p); return null; }
  return p;
}
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
      var skip = Object.keys(b.keys || {}).map(function (k) { return { k: k, why: rsiSkipWhy(k, b.keys[k] ? null : '') }; }).filter(function (x) { return x.why; });
      var spec = await rsiSliceSpec(env, A, s, b.resources || b.keys || {}, b.mode);
      if (b.dry) return json({ ok: 1, skip: skip, slice: spec, sliceMin: RSI_SLICE_MIN });
      var im = b.images || {}, ids = Object.keys(im), total = b.n, meta = { scope: s, n: b.n, f: b.f, images: {}, slices: b.slices || {}, mode: b.mode || '' }, bases = {};
      Object.keys(meta.slices).forEach(function (k) {
        var sb = k.replace(/#\d+$/, '');
        if (!ocOwn(spec, sb) || !(meta.slices[k] > 1) || (spec[sb][0] && meta.slices[k] > RSI_SEG.f)) throw rsError('import-shape');
        if ((meta.slices[k] / 1e6) * 16 > RSI_BUDGET) throw Object.assign(rsError('import-too-heavy', 413), { details: { cost: Math.round((meta.slices[k] / 1e6) * 16), budget: RSI_BUDGET, chars: meta.slices[k], k: sb, kind: s.kind } });
        total += meta.slices[k]; bases[k.replace(/#\d+$/, '')] = 1;
      });
      ids.forEach(function (k) {
        if (!/^(?:img|szp)_[a-z0-9]+_[a-z0-9]+$/.test(k) || !(im[k] > 0) || im[k] > IMG_TOTAL_MAX) throw Object.assign(rsError('import-shape'), { details: { k: k.slice(0, 80) } });   /* الصورةُ المرفوضة تُسمّى */
        meta.images[k] = [im[k], Math.ceil(im[k] / RSI_SEG.i)];
        total += im[k];
      });
      if (!(b.n > 1) || !(b.f > 0) || b.f > Math.ceil(b.n / (RSI_SEG.f - 1)) || ids.length > IMG_CAP || total > RSI_MAX) throw rsError(total > RSI_MAX ? 'import-too-large' : 'import-shape', total > RSI_MAX ? 413 : 400);
      await rsiHeavy(env, s, b.n, Object.keys(b.keys || {}).length > 0, Object.keys(bases));
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
    if (isObj(file.data) && Object.keys(M.slices).some(function (k) { return file.data[k.replace(/#\d+$/, '')] != null; })) throw rsError('import-shape');
    if (isObj(file.data) && !rsBCOwn(file, 'manifest'))
      Object.keys(file.data).forEach(function (k) {
        var why = rsiSkipWhy(k, file.data[k]);
        if (why) { drop.push({ k: k, why: why }); delete file.data[k]; }
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
        sr.forEach(function (o) { Object.keys(o.imgs).forEach(function (k) { o.imgs[k].forEach(function (x) { (ids[k] = ids[k] || {})[x] = 1; }); }); });
        Object.keys(ids).forEach(function (k) { (plan.imgTouch || (plan.imgTouch = [])).push({ k: k, v: Object.keys(ids[k]).join(' ') }); });
      },
      done: function (plan, summary) {
        /* مواردُ الدفعات في دفعة الاعتماد — كلُّها عباراتٌ تقرأ القاعدة نفسَها، لا يحمل العاملُ صفاً منها:
           حارسُ نسخة المورد كما قرأتها دفعاتُه · لقطةُ ما قبله (صفوفُه القائمة تُنسخ إلى restore_preimage) · إزالةُ القائم منه · ثم عبارةٌ لكل صفٍّ مودَع (≤ 500KB)
           بترتيب إيداعه · نسخةُ المورد تتقدّم · سطرُ قرار الصلاحية. */
        var keys = {}, rows = [], imgs = {};
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
        Object.keys(M.slices).forEach(function (k) { var gone = 'operations:bsdept:' + s.departmentId + ':' + k.replace(/#\d+$/, ''); summary.emptyDomains = summary.emptyDomains.filter(function (x) { return x !== gone; }); });
        summary.notTransferred = drop.concat(stage.unref.map(function (k) { return { k: k, why: 'image-unreferenced' }; }));
        summary.imagesNew = stage.fresh.length;
        if (op === 'commit') plan.statements.push(rsiDrop(env, id));
      },
    };
    /* مرجعُ استيراد الإدارة: الإدارةُ وحدها (لا مواردَ الإدارات الأخرى)، وبلا أسرة الموارد المودَعة على دفعات — فلا يُحمَّل القائمُ منها ولا تمسّها الخطةُ العامة */
    var fam = [], famKeys = [];
    Object.keys(M.slices).forEach(function (k) { fam = fam.concat(RSI_SLICE[k.replace(/#\d+$/, '')][1]); });
    fam.forEach(function (r) { var fk = 'bsdept:' + s.departmentId + ':' + r; if (famKeys.indexOf(fk) < 0) famKeys.push(fk); });
    stage.skip = famKeys;
    var reference = await rsReferenceSnapshot(env, A.u.id, s.kind === 'dept' ? { departments: [s.departmentId], operationalKeys: opDefinitions().map(function (def) { return 'bsdept:' + s.departmentId + ':' + def.resource; }).filter(function (k) { return famKeys.indexOf(k) < 0; }) } : undefined);
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
