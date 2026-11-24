/* Existing save workflows use the SAME private applySave preparation and the
   SAME atomic rsCommit executor. No client may select a trusted transition. */
function rsSaveNeedsAtomic(body) {
  return Object.keys((body && body.set) || {})
    .concat((body && body.del) || [])
    .some(function (k) {
      return k === K_DEPTS || k === K_USERS || k === K_PERM || opIsResource(k);
    });
}
function rsImageIn(column, values, args) {
  var selects = [];
  rsChunks(
    values.map(function (value) {
      return { value: value };
    }),
  ).forEach(function (part) {
    args.push(JSON.stringify(part));
    selects.push("SELECT json_extract(value,'$.value') FROM json_each(?" + args.length + ')');
  });
  return column + ' IN (' + (selects.length ? selects.join(' UNION ALL ') : 'SELECT NULL WHERE 0') + ')';
}
/* Backup bodies may only prove reuse of an already bound image. Never call
   imgResolve/imgVerdict (which can adopt ownership), image writes or R2 GC.
   R2 equality is checked at validation; concurrent R2 changes remain current. */
function rsImageArchiveShape(images) {
  if (!isObj(images)) throw rsError('backup-image-reuse-rejected', 409);
  var ids = Object.keys(images);
  if (
    ids.length > IMG_CAP ||
    ids.some(function (id) {
      return !/^(?:img|szp)_[a-z0-9]+_[a-z0-9]+$/.test(id) || typeof images[id] !== 'string' || !imgTypeOk(images[id]);
    })
  )
    throw rsError('backup-image-reuse-rejected', 409);
  return ids;
}
async function rsImageArchivePlan(env, A, plan, reference, archive) {
  /* V7 · د6: الاستيرادُ على أجزاء (019g) يسلّم صورَ النسخة من المنطقة المؤقتة لا في الذاكرة: archive.rsiStage — المعرّفاتُ من بيان البدء (فُحصت صيغتُها جزءاً جزءاً
     عند الرفع)، ونصُّ الصورة يُقرأ عند المقارنة وحدها. والصورةُ التي لا تحملها المنصة إطلاقاً (لا صفَّ ملكية ولا جسم) ويشير إليها سجلٌّ تكتبه هذه العملية
     «جديدة»: يُكتب جسمُها من المؤقت في دفعة الاعتماد نفسِها وتُربط بسجلّها (rsImageMetadataPlan). مسارُ الاستعادة القديم (بلا rsiStage) كما كان حرفاً. */
  var stage = archive && archive.rsiStage ? archive : null,
    images = stage ? stage.ids : archive || {},
    ids = stage ? Object.keys(images) : rsImageArchiveShape(images);
  function reject() {
    throw rsError('backup-image-reuse-rejected', 409);
  }
  if (!ids.length) {
    plan.imagesReused = 0;
    return;
  }
  var finalKeys = Object.assign(Object.create(null), reference.inputKeys, plan.relationalImageBefore || {}, plan.relationalImageReferences || {}),
    mentions = new Map(
      ids.map(function (id) {
        return [id, []];
      }),
    );
  plan.kv.pend.forEach(function (pd) {
    if (pd.act === 'del') delete finalKeys[pd.k];
    else finalKeys[pd.k] = pd.v;
  });
  (plan.imgTouch||[]).forEach(function(t){finalKeys[t.k]=t.v;});
  Object.keys(finalKeys).forEach(function (key) {
    if (
      isDeviceKey(key) ||
      !resOf(key) ||
      (plan.body.scope.kind === 'dept' && parseKey(key).dept !== plan.body.scope.departmentId) ||
      !canRead(A, key)
    )
      return;
    var found = imgIdsIn(finalKeys[key]);
    ids.forEach(function (id) {
      if (found[id]) mentions.get(id).push(key);
    });
  });
  if (stage) {
    stage.unref = ids.filter(function (id) { return !mentions.get(id).length; });
    ids = ids.filter(function (id) { return mentions.get(id).length; });
    if (!ids.length) { plan.imagesReused = 0; return; }
  } else if (
    ids.some(function (id) {
      return !mentions.get(id).length;
    })
  )
    reject();
  var ownArgs = [],
    ownWhere = rsImageIn('img', ids, ownArgs),
    metadata = await env.DB.batch([
      rsBound(env.DB.prepare('SELECT img,st,k,uid,dept,ts FROM imgown WHERE ' + ownWhere), ownArgs),
      rsBound(env.DB.prepare('SELECT img,k FROM imgref WHERE ' + ownWhere), ownArgs),
    ]),
    owners = metadata[0].results || [],
    refs = metadata[1].results || [],
    ownerMap = new Map(
      owners.map(function (row) {
        return [row.img, row];
      }),
    );
  /* V7-F · owner decision 2 (ii): an archived image the platform no longer holds at all — no owner row and no body row (swept), or condemned —
     proves no reuse and is NOT restored from the file (no restore writes image bytes): it is left out, the restore goes on and the reference
     reads as missing. Everything else keeps the gate: unknown-but-present, pending, orphan, foreign, mismatching ⇒ the whole restore is refused. */
  var presentArgs = [],
    presentWhere = rsImageIn("CASE WHEN substr(k,1,5)='~stg~' THEN substr(k,6,instr(substr(k,6),'~')-1) ELSE k END", ids, presentArgs),
    presentRows = (await rsBound(env.DB.prepare("SELECT DISTINCT CASE WHEN substr(k,1,5)='~stg~' THEN substr(k,6,instr(substr(k,6),'~')-1) ELSE k END AS id FROM imgs WHERE " + presentWhere), presentArgs).all()).results || [],
    present = new Set(presentRows.map(function (row) { return row.id; })),
    gone = new Set(ids.filter(function (id) { var own = ownerMap.get(id); return own ? own.st === 'dead' : !present.has(id); })),
    touched = new Set((plan.imgTouch || []).map(function (t) { return t.k; })),
    fresh = !stage ? [] : ids.filter(function (id) { return !ownerMap.get(id) && !present.has(id) && mentions.get(id).some(function (k) { return touched.has(k); }); });
  if (stage) { stage.fresh = fresh; plan.imagesFresh = new Set(fresh); }
  var checkedKeys = new Set();
  for (var id of ids) {
    if (gone.has(id)) continue;
    var owner = ownerMap.get(id);
    /* V7-F (independent review, finding 7): an archived image that is still here as an ORPHAN is accepted exactly when the restoring actor may re-bind
       it (decision 1: a record of its original unit, or the platform admin) — its stored bytes must still equal the file's (below), nothing is
       written to the image store, and rsImageMetadataPlan binds it to the restored record. Any other actor keeps the refusal. */
    var orphanOk = !!owner && owner.st === 'orphan' && mentions.get(id).every(function (key) { return imgOrphanRebindOk(A, owner, key); });
    if (!orphanOk && (!owner || owner.st !== 'bound' || !owner.k || !resOf(owner.k) || isDeviceKey(owner.k) || !canRead(A, owner.k))) reject();
    for (var key of mentions.get(id))
      if (!checkedKeys.has(key)) {
        checkedKeys.add(key);
        if (await imgForeignIn(env, A, key, finalKeys[key], (plan.relationalImageCurrent||{})[key] || (plan.relationalImageBefore||{})[key] || reference.inputKeys[key] || '')) reject();
      }
  }
  /* V7 · د6: الاستيرادُ على أجزاء لا يحمّل أجسامَ الصور القائمة كلَّها معاً (21MB في النسخة المقيسة): صورةً صورة — القائمُ يُقارن بالمودَع ثم يُحرَّر،
     والسياجُ عددُ صفوف جسمها ومجموعُ أطوالها (لا نصُّها)، وللغائبة «لا صفّ»؛ وجزءُ رفعٍ معلّق لمعرّفٍ منها يرفض كما كان. */
  if (stage) {
    var sArgs = [], sWhere = rsImageIn("CASE WHEN substr(k,1,5)='~stg~' THEN substr(k,6,instr(substr(k,6),'~')-1) ELSE k END", ids, sArgs);
    if (await rsBound(env.DB.prepare("SELECT 1 x FROM imgs WHERE substr(k,1,5)='~stg~' AND " + sWhere + ' LIMIT 1'), sArgs).first()) reject();
    for (var sid9 of ids) {
      if (!gone.has(sid9)) { var held9 = await imgLoad(env, sid9); if (held9 == null || held9 !== (await stage.text(sid9))) reject(); held9 = null; }
      var sig9 = await env.DB.prepare("SELECT COUNT(*)||':'||COALESCE(SUM(length(v)),0) s FROM imgs WHERE k=?1").bind(sid9).first('s');
      plan.guards.push(env.DB.prepare("SELECT CASE WHEN (SELECT COUNT(*)||':'||COALESCE(SUM(length(v)),0) FROM imgs WHERE k=?1)!=?2 THEN json_extract('{}','KIVO_REV_CONFLICT') END AS g").bind(sid9, sig9));
    }
  } else {
  /* V7 · 53 (ملحق 4): كانت أجسامُ كلِّ الصور المذكورة تُقرأ في استدعاءٍ واحد ثم تُرسل كلُّها شاهداً (rsWitness) — استعادةٌ فيها خرائطُ بحجمها الحقيقي
     (عشرُ صورٍ من 3MB) تتجاوز سقفَ D1 (32MiB للاستدعاء). الآن كما الاستيرادُ على أجزاء: صورةً صورة (استدعاءٌ بحجم صورةٍ واحدة)، والسياجُ عددُ صفوف
     جسمها ومجموعُ أطوالها داخل الدفعة؛ وجزءُ رفعٍ معلّق لمعرّفٍ منها يرفض كما كان، والغائبةُ تبقى «لا صفّ». */
  var bodyArgs = [],
    bodyWhere = rsImageIn("CASE WHEN substr(k,1,5)='~stg~' THEN substr(k,6,instr(substr(k,6),'~')-1) ELSE k END", ids, bodyArgs);
  if (await rsBound(env.DB.prepare("SELECT 1 x FROM imgs WHERE substr(k,1,5)='~stg~' AND " + bodyWhere + ' LIMIT 1'), bodyArgs).first()) reject();
  var sigAll = "SELECT COALESCE(group_concat(k||'='||c||':'||n,','),'') s FROM (SELECT k,COUNT(*) c,SUM(length(v)) n FROM imgs WHERE " + bodyWhere + ' GROUP BY k ORDER BY k)',
    sigHave = String((await rsBound(env.DB.prepare(sigAll), bodyArgs).first('s')) || ''),
    haveIds = new Set(sigHave.split(',').filter(Boolean).map(function (x) { return x.slice(0, x.lastIndexOf('=')); }));
  plan.guards.push(rsBound(env.DB.prepare('SELECT CASE WHEN (' + sigAll + ')!=?' + (bodyArgs.length + 1) + " THEN json_extract('{}','KIVO_REV_CONFLICT') END AS g"), bodyArgs.concat([sigHave])));
  for (var id of ids) {
    if (gone.has(id)) continue;
    if (!haveIds.has(id)) reject();
    // Inline content is the exact ordered D1 concatenation (imgLoad); the R2 marker reads the object.
    var actual;
    try { actual = await imgLoad(env, id); } catch (e) { reject(); }
    if (actual !== images[id]) reject();
    actual = null;
  }
  }
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgown', ['img', 'st', 'k', 'uid', 'dept', 'ts'], owners, ownWhere, ownArgs));
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgref', ['img', 'k'], refs, ownWhere, ownArgs));
  plan.imagesReused = ids.length - gone.size;
  for (var freshId of fresh) { gone.delete(freshId); plan.statements.push.apply(plan.statements, await stage.store(freshId)); }
  if (gone.size) { rsImageMissingNote(plan, Array.from(gone)); plan.imagesMissing = Math.max(plan.imagesMissing || 0, gone.size); plan.warnings = Array.from(new Set((plan.warnings || []).concat(['images-missing']))); }
}
/* V7-F · owner decision 3 (and the independent review's low item): whenever the unit list changes — a unit removed (unit delete, or a full
   replace-restore that no longer carries it) or a unit id (re)appearing — the orphans carrying that unit id are stamped: their original unit
   is gone for good, so only the platform admin re-binds them (054 imgOrphanRebindOk), whoever now holds the id. */
/* the ids a restore leaves missing, named (the first 50, sorted) — the inspection and the receipt's warning carry the count; the names let the admin find them */
function rsImageMissingNote(plan, ids) {
  plan.imagesMissingIds = Array.from(new Set((plan.imagesMissingIds || []).concat(ids))).sort().slice(0, 50);
}
function rsImageUnitStamp(env, A, plan, finalDepartments) {
  var was = (A.depts || []).map(function (d) { return d && d.id; }).filter(Boolean),
    now = (Array.isArray(finalDepartments) ? finalDepartments : []).map(function (d) { return d && d.id; }).filter(Boolean),
    changed = was.filter(function (id) { return now.indexOf(id) < 0; }).concat(now.filter(function (id) { return was.indexOf(id) < 0; }));
  if (changed.length)
    plan.statements.push(env.DB.prepare("UPDATE imgown SET uid = ?2 WHERE st = 'orphan' AND dept IN (SELECT value FROM json_each(?1))").bind(JSON.stringify(changed), IMG_GONE));
}
function rsImageFinalValues(plan, reference) {
  var values = Object.assign(Object.create(null), reference.inputKeys);
  plan.kv.pend.forEach(function (pd) {
    if (pd.act === 'del') delete values[pd.k];
    else values[pd.k] = pd.v;
  });
  (plan.imgTouch || []).forEach(function(t){values[t.k]=t.v;});
  return values;
}
/* V7 · 53 (ملحق 4): أيُّ المعرّفات ids (بشكل الماسح وحده) يذكره نصٌّ خارج المفاتيح keys — عبارةٌ واحدة تجيب بالمعرّفات لا بالنصوص.
   kv: الصفُّ كلُّه وحدودُ الصفوف (كما IMG_KV_JOIN) · السجلاتُ التشغيلية: نصوصُ كلِّ جدول ops_* (كما opstxt — 054 imgOpsCols) خارج موارد keys
   (والموردُ المخزَّن بالفترة res@<الفترة> من المورد نفسِه). الحدُّ بعد المطابقة كدلالة imgIdsIn ([^a-z0-9] أو نهايةُ النص).
   الجواب: المعرّفاتُ الممسوكة مرتّبةً بفواصل؛ أو — إن حمل نصٌّ خارجها هروبَ \u00XX (قد يخفي معرّفاً لا تراه المطابقةُ الحرفية) — '!' ثم بصمةُ
   تلك النصوص (مفتاحٌ وطولٌ لكلٍّ) فيقرؤها rsImageHeldEsc ويفكّها كما يفعل الحفظ (imgDeep)، والسياجُ البصمةُ نفسُها. */
function rsImageHeldSql(ids, keys) {
  var ops = keys.filter(opIsResource).map(function (k) { var i = opInfo(k); return [i.dept, i.resource]; }),
    mine = "EXISTS(SELECT 1 FROM json_each(?3) p WHERE json_extract(p.value,'$[0]')=o.d AND (json_extract(p.value,'$[1]')=o.r OR substr(o.r,1,length(json_extract(p.value,'$[1]'))+1)=json_extract(p.value,'$[1]')||'@'))",
    txt = imgOpsCols().map(function (x, j) { return 'SELECT ' + j + ' AS j, department_id AS d, resource AS r, row_key AS k, ' + imgOpsJoin(x[1]) + ' AS t FROM ' + x[0]; }).join(' UNION ALL '),
    out = 'k NOT IN (SELECT value FROM json_each(?2))',
    has = function (t) { return 'instr(' + t + ', j.value) > 0 AND (' + t + " GLOB '*' || j.value || '[^a-z0-9]*' OR " + t + " GLOB '*' || j.value)"; },
    pair = 'FROM kv b JOIN kv a ON a.k = b.k AND a.seq = b.seq - 1 WHERE b.seq > 0 AND b.' + out;
  return { args: [JSON.stringify(ids), JSON.stringify(keys), JSON.stringify(ops)],
    sql: 'WITH opstxt(j, d, r, k, t) AS MATERIALIZED (' + txt + '), ops(j, d, r, k, t) AS MATERIALIZED (SELECT * FROM opstxt o WHERE NOT ' + mine + ')' +
      ', esck(k) AS MATERIALIZED (SELECT k FROM kv WHERE ' + out + ' AND ' + imgEscCond('v') + ' UNION SELECT b.k ' + pair + ' AND ' + imgEscCond(IMG_ESC_WIN) + ')' +
      ", esc(s) AS MATERIALIZED (SELECT 'k' || k || char(2) || (SELECT SUM(length(CAST(x.v AS BLOB))) FROM kv x WHERE x.k = esck.k) FROM esck" +
      " UNION ALL SELECT 'o' || j || char(2) || d || char(2) || r || char(2) || k || char(2) || length(CAST(t AS BLOB)) FROM ops WHERE " + imgEscCond('t') + ')' +
      " SELECT CASE WHEN EXISTS(SELECT 1 FROM esc) THEN '!' || (SELECT group_concat(s, char(1)) FROM (SELECT s FROM esc ORDER BY s))" +
      " ELSE COALESCE((SELECT group_concat(id, ',') FROM (SELECT j.value AS id FROM json_each(?1) j WHERE" +
      ' EXISTS(SELECT 1 FROM kv WHERE ' + out + ' AND ' + has('v') + ')' +
      ' OR EXISTS(SELECT 1 ' + pair + ' AND instr(substr(CAST(a.v AS BLOB), -(length(CAST(j.value AS BLOB)) - 1)) || substr(CAST(b.v AS BLOB), 1, length(CAST(j.value AS BLOB)) - 1), j.value) > 0)' +
      " OR EXISTS(SELECT 1 FROM ops WHERE " + has('t') + ") ORDER BY j.value)), '') END AS h" };
}
/* '!' من rsImageHeldSql: تُقرأ النصوصُ التي تحمل الهروبَ (وحدها، صفحاتٍ ≤ IMG_ESC_PAGE بايت، ومجموعها ≤ IMG_ESC_CHARS) وتُفكّ — يعيد المعرّفاتِ
   التي يذكرها أحدُها، أو null إن لم يُحسم (أكبرُ من الحد · فكٌّ لم ينتهِ) فيبقى كلُّ شيءٍ كما هو (لا يتيم). */
async function rsImageHeldEsc(env, ids, held) {
  var T = imgOpsCols(), kvs = [], ops = {}, total = 0, found = new Set(), undecided = false;
  held.slice(1).split('\u0001').forEach(function (e) {
    var f = e.slice(1).split('\u0002'), n = Number(f[f.length - 1]) || 0; total += n;
    if (e.charAt(0) === 'k') kvs.push({ k: f.slice(0, -1).join('\u0002'), n: n });
    else (ops[f[0]] = ops[f[0]] || []).push({ at: [f[1], f[2], f[3]], n: n });
  });
  if (total > IMG_ESC_CHARS) return null;
  var see = function (t) {
    var o = {};
    if (imgEsc(t)) { var dd = imgDeep(t); if (dd.und) undecided = true; o = dd.ids; } else imgScanInto(t, o);
    ids.forEach(function (id) { if (o[id]) found.add(id); });
  };
  var pages = function (list) { var out = [], cur = [], n = 0; list.forEach(function (x) { if (cur.length && n + x.n > IMG_ESC_PAGE) { out.push(cur); cur = []; n = 0; } cur.push(x); n += x.n; }); if (cur.length) out.push(cur); return out; };
  for (var page of pages(kvs)) {
    var rows = (await env.DB.prepare('SELECT k, json_quote(v) AS q FROM kv WHERE k IN (SELECT value FROM json_each(?1)) ORDER BY k, seq').bind(JSON.stringify(page.map(function (x) { return x.k; }))).all()).results || [];
    for (var i = 0, got; i < rows.length; i = got) { var text = ''; for (got = i; got < rows.length && rows[got].k === rows[i].k; got++) text += JSON.parse(rows[got].q); see(text); }
  }
  for (var j of Object.keys(ops)) {
    var tb = T[Number(j)]; if (!tb) return null;
    for (var part of pages(ops[j])) {
      var got2 = (await env.DB.prepare('SELECT json_quote(' + imgOpsJoin(tb[1]) + ') AS q FROM ' + tb[0] + " WHERE (department_id, resource, row_key) IN (SELECT json_extract(value,'$[0]'), json_extract(value,'$[1]'), json_extract(value,'$[2]') FROM json_each(?1))")
        .bind(JSON.stringify(part.map(function (x) { return x.at; }))).all()).results || [];
      got2.forEach(function (r) { JSON.parse(r.q).split('\u0001').forEach(see); });
    }
  }
  return undecided ? null : found;
}
/* Same image ownership/reference semantics as imgSync, prepared before commit.
   Bodies and R2 garbage collection are deliberately never called by this path: V7-F — the sweep runs AFTER the commit
   (063 fetch → 054 imgSweep), decides in one statement that re-checks every reference, and deletes R2 outside any transaction. */
async function rsImageMetadataPlan(env, A, plan, reference) {
  if (!plan.imgTouch || !plan.imgTouch.length) return;
  var list = plan.imgTouch,
    keys = list.map(function (v) {
      return v.k;
    }),
    keySet = new Set(keys),
    ids = new Set(),
    values = rsImageFinalValues(plan, reference);
  list.forEach(function (v) {
    Object.keys(imgIdsIn((plan.relationalImageBefore||{})[v.k] || reference.inputKeys[v.k] || ''))
      .concat(Object.keys(imgIdsIn(v.v || '')))
      .forEach(function (id) {
        ids.add(id);
      });
  });
  var args = [],
    where = rsImageIn('k', keys, args) + ' OR ' + rsImageIn('img', Array.from(ids), args),
    oldRefs = (await rsBound(env.DB.prepare('SELECT img,k FROM imgref WHERE ' + where), args).all()).results || [];
  oldRefs.forEach(function (r) {
    ids.add(r.img);
  });
  if (plan.operation !== 'save') {
    var newIds = Array.from(
        new Set(
          list.flatMap(function (v) {
            return Object.keys(imgIdsIn(v.v || ''));
          }),
        ),
      ),
      bodyArgs = [],
      bodyWhere = rsImageIn('k', newIds, bodyArgs),
      /* V7 · د6: الاستيرادُ على أجزاء لا يحمّل أجسامَ الصور المذكورة ليعرف القائمَ منها — يسأل عن معرّفاتها وتوقيعها (عددُ الصفوف ومجموعُ الأطوال)، وسياجُه التوقيعُ نفسُه */
      bodySig = "SELECT COALESCE(group_concat(k||'='||c||':'||n,','),'') s FROM (SELECT k,COUNT(*) c,SUM(length(v)) n FROM imgs WHERE " + bodyWhere + ' GROUP BY k ORDER BY k)',
      /* V7 · 53 (ملحق 4): المعرّفاتُ والتوقيعُ وحدهما دائماً (لا أجسامُ الصور ولا شاهدُها — استعادةٌ بخرائط حقيقية كانت تتجاوز 32MiB للاستدعاء) */
      sigNow = String((await rsBound(env.DB.prepare(bodySig), bodyArgs).first('s')) || ''),
      known = new Set(sigNow.split(',').filter(Boolean).map(function (x) { return x.slice(0, x.lastIndexOf('=')); }));
    /* V7-F · owner decision 2 (ii): a backup that mentions an image the platform no longer holds (swept after its grace) is still restored —
       the reference is written as it is and READS AS MISSING (054 imgVerdict → 404); the witness below still fences that the body is absent
       at commit, and the receipt carries the warning. No image body is ever written by a restore. */
    var missing = newIds.filter(function (id) { return !known.has(id) && !(plan.imagesFresh && plan.imagesFresh.has(id)); });   /* V7 · د6: الصورةُ الجديدة يُكتب جسمُها في الدفعة نفسِها (019g) فليست مفقودة */
    if (missing.length) { rsImageMissingNote(plan, missing); plan.imagesMissing = Math.max(plan.imagesMissing || 0, missing.length); plan.warnings = Array.from(new Set((plan.warnings || []).concat(['images-missing']))); }
    plan.guards.push(rsBound(env.DB.prepare("SELECT CASE WHEN (" + bodySig + ")!=?" + (bodyArgs.length + 1) + " THEN json_extract('{}','KIVO_REV_CONFLICT') END AS g"), bodyArgs.concat([sigNow])));
  }
  var ownArgs = [],
    ownWhere = rsImageIn('img', Array.from(ids), ownArgs),
    oldOwn = (await rsBound(env.DB.prepare('SELECT img,st,k,uid,dept,ts FROM imgown WHERE ' + ownWhere), ownArgs).all()).results || [],
    owners = new Map(
      oldOwn.map(function (r) {
        return [r.img, r];
      }),
    );
  /* V7 · د6: الصورةُ الجديدة تُعامل كرفعٍ من المستورِد نفسِه لم يُربط بعد ('claim') — فيربطها بسجلّها الحكمُ القائمُ أدناه، والشاهدُ يبقى على الصفوف الحقيقية (لا صفَّ لها) */
  if (plan.imagesFresh) plan.imagesFresh.forEach(function (id) { if (!owners.has(id)) owners.set(id, { img: id, st: 'claim', k: '', uid: A.u.id, dept: '', ts: Date.now() }); });
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgref', ['img', 'k'], oldRefs, where, args));
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgown', ['img', 'st', 'k', 'uid', 'dept', 'ts'], oldOwn, ownWhere, ownArgs));
  if (plan.snapshotRequired) {
    plan.snapshots.push({ domain: 'images', table: 'imgref', rows: oldRefs }, { domain: 'images', table: 'imgown', rows: oldOwn });
  }
  var live = new Set();
  Object.keys(values).forEach(function (k) {
    Object.keys(imgIdsIn(values[k] || '')).forEach(function (id) {
      live.add(id);
    });
  });
  /* V7 · 53 (ملحق 4 · السبب الجذري لـ500 على Preview): صورةٌ لم تعد القيمُ المنطاقة تذكرها قد يذكرها مفتاحٌ آخر في القاعدة. كان الحكمُ يوسّع المرجعَ
     إلى القاعدة كلها (rsReferenceWiden: كلُّ kv خارج النطاق وكلُّ الموارد التشغيلية لكل الإدارات إلى العامل، ثم كلُّها شاهداً في دفعة الحفظ) —
     فيكبر الاستدعاءُ بحجم القاعدة لا بحجم الحفظ، ويتجاوز سقفَ D1 (32MiB للاستدعاء) فيعود 500 save-failed. الآن يسأل D1 نفسَها بعبارةٍ واحدة
     (rsImageHeldSql) أيُّ هذه المعرّفات ما زال نصٌّ خارج المفاتيح المحفوظة يذكره — kv صفّاً صفّاً وعبر حدود الصفوف · نصوصُ السجلات التشغيلية —
     فلا يعبر إلا المعرّفات. والسياجُ العبارةُ نفسُها داخل دفعة الحفظ: أيُّ كتابةٍ متزامنة تغيّر الجواب ⇒ KIVO_REV_CONFLICT (كما كان الشاهد).
     نصٌّ قديم يحمل هروبَ \u00XX (قد يخفي معرّفاً) خارج المحفوظ ⇒ لا يُحكم: كلُّها تبقى كما هي (لا يتيم) — والكنسُ (054 imgSweep) يقرّر وحده بعد ذلك. */
  var lost = Array.from(ids).filter(function (id) { return !live.has(id); }), scope = reference.scope;
  if (lost.length && scope && !scope.all && !reference.noWiden) {
    lost.filter(function (id) { return !IMG_SCAN_ID_RX.test(id); }).forEach(function (id) { live.add(id); });
    var ask = lost.filter(function (id) { return IMG_SCAN_ID_RX.test(id); });
    if (ask.length) {
      var proof = rsImageHeldSql(ask, keys), held = String((await rsBound(env.DB.prepare(proof.sql), proof.args).first('h')) || '');
      var heldIds = held.charAt(0) !== '!' ? held.split(',').filter(Boolean) : await rsImageHeldEsc(env, ask, held);
      (heldIds ? Array.from(heldIds) : ask).forEach(function (id) { live.add(id); });
      plan.guards.push(rsBound(env.DB.prepare('SELECT CASE WHEN (' + proof.sql + ') IS NOT ?' + (proof.args.length + 1) + " THEN json_extract('{}','KIVO_REV_CONFLICT') END AS g"), proof.args.concat([held])));
    }
  }
  var refs = [],
    updates = new Map(),
    now = Date.now();
  list.forEach(function (v) {
    Object.keys(imgIdsIn(v.v || '')).forEach(function (id) {
      refs.push({ img: id, k: v.k });
      var o = owners.get(id);
      /* V7-F · owner decisions 1+3: an orphan returns only to a record of its original unit, or by the platform admin (054 imgOrphanRebindOk) */
      if (o && ((o.st === 'orphan' && imgOrphanRebindOk(A, o, v.k)) || (o.st === 'claim' && (o.uid === A.u.id || A.u.role === 'super'))))
        updates.set(id, Object.assign({}, o, { st: 'bound', k: v.k, dept: parseKey(v.k).dept || '', uid: o.st === 'orphan' ? '' : o.uid }));
    });
  });
  ids.forEach(function (id) {
    if (
      live.has(id) ||
      oldRefs.some(function (r) {
        return r.img === id && !keySet.has(r.k);
      })
    )
      return;
    var o = owners.get(id);
    if (o && o.st === 'bound' && !keySet.has(o.k)) return;
    if (o && o.st === 'dead') return;                                       /* V7-F: condemned by the sweep — never revived by a dropped reference */
    updates.set(id, Object.assign({ img: id, uid: '', dept: '' }, o || {}, { st: 'orphan', k: '', ts: now }));
  });
  var dropArgs = [],
    dropWhere = rsImageIn('k', keys, dropArgs);
  plan.statements.push(rsBound(env.DB.prepare('DELETE FROM imgref WHERE ' + dropWhere), dropArgs));
  plan.statements.push.apply(plan.statements, rsBulk(env, 'imgref', ['img', 'k'], refs));
  plan.statements.push.apply(plan.statements, rsBulk(env, 'imgown', ['img', 'st', 'k', 'uid', 'dept', 'ts'], Array.from(updates.values())));
  plan.imgTouch = [];
}
function rsSaveAudit(env, plan, A, meta, sid) {
  var allowed = Object.create(null);
  plan.kv.pend.forEach(function (p) {
    allowed[p.k] = 1;
  });
  var supplied = audClean(plan.sourceBody.aud, allowed),
    rows = [],
    now = Date.now();
  if (!A.__tkSrv && !plan.serverTrusted)
    supplied = supplied.filter(function (e) {
      return !/^tk/i.test(e.cid);
    });
  supplied = supplied.filter(function (e) { return e.etype !== 'perm44'; });   /* V7 · د5-هـ (44): «سجل الصلاحيات» يكتبه الخادمُ وحده */
  plan.kv.pend.forEach(function (pd) {
    var incoming = supplied.filter(function (e) {
      return e.k === pd.k;
    });
    if (resName(pd.k) === PERM44_RES || pd.k === K_PERM) { try { var p44 = perm44AudEv(pd.k, pd.cur, pd.act === 'del' ? null : pd.v, sid + '_' + rows.length); if (p44) incoming = incoming.concat([p44]); } catch (e44) { swallow('perm44-aud', e44); } }
    if (!incoming.length)
      incoming = [
        {
          cid: sid + '_' + rows.length,
          k: pd.k,
          etype: 'dataset',
          eid: resName(pd.k),
          ename: resName(pd.k),
          act: pd.act === 'del' ? 'deleted' : 'changed',
          ctx: JSON.stringify({ atomic: true, snapshot: plan.snapshotRequired ? sid : undefined }),
          bef: '',
          aft:
            pd.act === 'del'
              ? ''
              : audClip(pd.k === K_USERS ? jsonDiff(stripPh(pd.cur || '[]'), stripPh(pd.v || '[]')) : jsonDiff(pd.cur, pd.v), AUD_STR),
        },
      ];
    incoming.forEach(function (e) {
      rows.push(
        Object.assign({}, e, {
          ts: now,
          uid: A.u.id,
          un: String(A.u.un || ''),
          dept: parseKey(pd.k).dept || '',
          ip: (meta && meta.ip) || '',
          dev: (meta && meta.dev) || '',
          city: (meta && meta.city) || '',
        }),
      );
    });
  });
  var cols = ['cid', 'ts', 'uid', 'un', 'dept', 'k', 'rev', 'etype', 'eid', 'ename', 'act', 'ctx', 'bef', 'aft', 'ip', 'dev', 'city'],
    st = [];
  rsChunks(rows).forEach(function (part) {
    st.push(
      env.DB.prepare(
        'INSERT OR IGNORE INTO aud(' +
          cols.join(',') +
          ') SELECT ' +
          cols
            .map(function (c) {
              return c === 'rev' ? "CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER)" : "json_extract(j.value,'$." + c + "')";
            })
            .join(',') +
          ' FROM json_each(?1) j',
      ).bind(JSON.stringify(part)),
    );
  });
  return st;
}
/* This is the existing super-only whole-department lifecycle, not a public
   per-resource delete override. Fence all resource revisions, including absent
   resources, and compile physical deletion through the same atomic save plan. */
function rsDepartmentOperationalDeletes(env, reference, A, body, departments) {
  if (!Array.isArray(departments) || departments.length !== 1 || A.u.role !== 'super' ||
      !A.depts.some(function (d) { return d.id === departments[0]; })) throw rsError('forbidden', 403);
  var pending = [], guards = [], keys = [];
  opDefinitions().forEach(function (definition) {
    var key = 'bsdept:' + departments[0] + ':' + definition.resource,
      have = reference.inputRevs[key] || 0, base = (body.base || {})[key], current = reference.inputKeys[key];
    if (!Number.isSafeInteger(base) || base < 0 || base !== have) throw rsError('conflict', 409);
    keys.push(key); guards.push(revGuard(env, key, have));
    if (current != null) pending.push({k:key,act:'del',cur:current,v:null,have:have});
  });
  return {pending:pending,guards:guards,keys:keys};
}
/* RISHAD-266 · s1: a save whose keys all belong to departments references those departments (019d scoped
   reference); a save of a platform-global key (accounts, permissions, departments) keeps the full reference. */
function rsSaveScope(body) {
  var keys = Object.keys((body && body.set) || {}).concat((body && body.del) || []).map(String);
  if (!keys.length || !keys.every(function (k) { return parseKey(k).dept; })) return undefined;
  return { departments: keys.map(function (k) { return parseKey(k).dept; }) };
}
async function rsSaveCommit(env, A, body, meta, opt) {
  opt = opt || {};
  var reference = opt.__reference || (await rsReferenceSnapshot(env, A.u.id, rsSaveScope(body))),
    actor = reference.A;
  ['tok', 'sessTs', '__tkSrv', '__tkSelf'].forEach(function (k) {
    if (A[k] !== undefined) actor[k] = A[k];
  });
  env = reference.env;
  A = actor;
  var operationKeys = Object.keys(body.set || {}).concat(body.del || []),
    operationalSave = operationKeys.some(opIsResource), referenceDependentSave = operationKeys.includes(K_USERS) || operationKeys.includes(K_PERM), operationFingerprint, operationRequestId, operationReadGuards=[];
  if (operationalSave && !opt.__employeeRequestId && !opt.__wipeRequestId) {
    operationRequestId = opt.__operationRequestId || body.requestId || (opt.srv ? enfSnapId('ops') : '');
    if (typeof operationRequestId !== 'string' || !/^[-A-Za-z0-9_]{8,100}$/.test(operationRequestId)) throw rsError('operations-request-id');
    if (!opt.srv && (!Number.isSafeInteger(body.epoch) || body.epoch < 0)) throw rsError('operations-epoch');
    operationFingerprint = opt.__operationFingerprint || await cuFingerprint({uid:A.u.id,body:body});
    var oldOperation = await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2').bind(A.u.id,operationRequestId).first();
    if (oldOperation) {
      if (oldOperation.fingerprint !== operationFingerprint || oldOperation.mode !== 'operations') throw rsError('operations-request-reused',409);
      if (!opt.srv&&operationKeys.some(function(k){return !canRead(A,k);})) throw rsError('operations-denied',403);
      await env.DB.batch(rsReferenceGuards(env, reference));
      return Object.assign(JSON.parse(oldOperation.result_json),{duplicate:1,v:oldOperation.revision});
    }
    if (!opt.srv && body.epoch !== Number(reference.inputMeta.restore_epoch || 0)) throw rsError('restore-epoch-changed',409);
    opt = Object.assign({},opt,{__allRequestedKeysRequired:true});
  }
  if(operationalSave){
    for(var readKey of Object.keys(body.base||{}).filter(opIsResource)){
      var readBase=body.base[readKey],writeKey=operationKeys.find(opIsResource),denied={},conflicts={};
      opInfo(readKey);
      if(!Number.isSafeInteger(readBase)||readBase<0)throw rsError('operations-base');
      if(!opt.srv&&!opt.__employeeRequestId&&!canRead(A,readKey)){   // RISHAD-266: employee-route references are the exact server context (019c); revision guard below still applies
        denied[writeKey]={why:'read-reference-denied'};
        return {ok:0,requestId:operationRequestId,epoch:body.epoch,revs:{},denied:denied,conflicts:{},atomic:1};
      }
      if(readBase!==(reference.inputRevs[readKey]||0)){
        conflicts[writeKey]={why:'read-reference-changed'};
        return {ok:0,requestId:operationRequestId,epoch:body.epoch,revs:{},denied:{},conflicts:conflicts,atomic:1};
      }
      operationReadGuards.push(revGuard(env,readKey,readBase));
    }
  }
@@SYS:save.pre.daily@@  var kv = await applySave(env, body, A, meta, Object.assign({}, opt, { quiet: true, __restorePlan: RESTORE_INTERNAL_TOKEN }));
  kv.revs = kv.revs || reference.inputRevs;
  if (opt.__serverDepartmentWipes) {
    var wipeOperations = rsDepartmentOperationalDeletes(env, reference, A, body, opt.__serverDepartmentWipes);
    kv.serverDepartmentWipes = opt.__serverDepartmentWipes;
    /* A refused KV plan carries no pend list: the department delete must still reach the atomic refusal below (never a 500, never a partial save) */
    kv.pend = (kv.pend || []).concat(wipeOperations.pending);
    operationReadGuards.push.apply(operationReadGuards, wipeOperations.guards);
    operationKeys = operationKeys.concat(wipeOperations.keys);
    operationalSave = true;
  }
  if (opt.__serverEmployeeIntent) kv.serverEmployeeIntent = opt.__serverEmployeeIntent;
  var transition = await cuPlanSaveTransition(env, A, body, kv);
  if (transition.blocked || !kv.ok) {
    if (transition.coupled || opt.__allRequestedKeysRequired || operationalSave) {
      var denied = Object.assign({}, kv.denied || (kv.out && kv.out.denied) || {}),
        conflicts = kv.conflicts || (kv.out && kv.out.conflicts) || {};
      var logs = Object.keys(denied).map(function (k) {
        return secStmt(env, { uid: A.u.id, act: 'denied', target: k, detail: denied[k].why || 'custody-transition' });
      });
      (kv.authzRows || []).forEach(function (r) {
        logs.push(enfLogStmt(env, r));
      });
      if (logs.length) await env.DB.batch(logs);
      return { ok:0, requestId:operationRequestId, epoch:body.epoch, v: await curRev(env), revs: {}, denied: denied, conflicts: conflicts, atomic: operationalSave ? 1 : kv.protectedOp || 'custody-transition' };
    }
    return await applySave(env, body, A, meta, Object.assign({}, opt, { __cuPass: RESTORE_INTERNAL_TOKEN }));
  }
  if (!transition.transitions.length && !opt.__serverDepartmentWipes && !opt.__employeeRequestId && !operationalSave && !referenceDependentSave)
    return await applySave(env, body, A, meta, Object.assign({}, opt, { __cuPass: RESTORE_INTERNAL_TOKEN }));
@@SYS:save.pend.daily@@  kv.pend = kv.pend.filter(function (pd) {
    var changed = pd.act === 'del' ? pd.cur != null : pd.v !== pd.cur;
    // Canonical merges can turn an authorized write into a no-op (notably a
    // credential-redacted account list). Its current revision still settles
    // the requested key; the reference guards below fence that exact value.
    if (!changed) kv.out.revs[pd.k] = pd.have;
    return changed;
  });
  if (opt.__physicalDeleteKeys) rsPhysicalDeletes(kv, reference, opt.__physicalDeleteKeys);
  var departments = Array.from(
      new Set(
        transition.transitions
          .map(function (t) {
            return t.departmentId;
          })
          .concat(opt.__employeeDept ? [opt.__employeeDept] : [])
          .concat(opt.__serverDepartmentWipes || [])
          .concat(operationalSave ? operationKeys.filter(opIsResource).map(function(k){return opInfo(k).dept;}) : []),
      ),
    ),
    scope = { kind: departments.length === 1 ? 'dept' : 'full' };
  if (departments.length === 1) scope.departmentId = departments[0];
  var plan = {
    operation: 'save',
    body: {
      requestId: opt.__wipeRequestId || opt.__employeeRequestId || operationRequestId,
      scope: scope,
      mode: opt.__employeeIntent || (opt.__serverDepartmentWipes ? 'dept-' + (opt.__wipeKind || 'wipe') : operationalSave ? 'operations' : 'save'),
      reason: String(body.reason || ''),
    },
    sourceBody: body,
    serverTrusted: !!opt.srv,
    author: A,
    epoch: env.__restoreEpoch === undefined ? await rsEpoch(env) : env.__restoreEpoch,
    guards: [],
    statements: [],
    snapshots: [],
    revisionKeys: [],
    counts: { keys: kv.pend.length,@@SYS:save.counts.custody@@ notifications: 0 },
    authz: kv.authzRows || [],
    kv: kv,
    reauth: false,
    bumpEpoch: !!(opt.__wipeRequestId || opt.__employeeRequestId || transition.transitions.length),
    receiptRequired: !!(opt.__wipeRequestId || opt.__employeeRequestId || operationRequestId),
    forceFence: !!opt.__wipeRequestId,
    snapshotRequired: transition.transitions.some(function (t) {
      return /wipe|replace/.test(t.intent);
    }),
  };
  if (operationRequestId && kv.out && kv.out.norm) opt = Object.assign({}, opt, { __operationResult: Object.assign({}, opt.__operationResult || {}, { norm: kv.out.norm }) });   /* V7 · 53 (port-sync · بند 12): ما يراه الفاعلُ من المحفوظ (054 enfNorm) مع الإيصال */
  if (operationRequestId) { plan.fingerprint=operationFingerprint; plan.intent='operations'; plan.operationKeys=Array.from(new Set(operationKeys)); plan.operationResult=opt.__operationResult||{}; }
  plan.guards.push.apply(plan.guards,operationReadGuards);
  var referenceMark = rsReferenceMark(reference), referenceOperational = referenceDependentSave || operationalSave;
  if (referenceOperational) plan.guards.push.apply(plan.guards, reference.operational.guards);
  if (opt.__operationSourceGuards) plan.guards.push.apply(plan.guards,opt.__operationSourceGuards);
  plan.guards.push.apply(plan.guards, rsReferenceBase(env, reference));
  plan.guards.push.apply(plan.guards, rsReferenceBase(env, reference, 1));
  if (referenceMark) plan.guards.push.apply(plan.guards, reference.scope.late.slice(0, referenceMark[0]));
  await rsCompileKV(env, A, kv, plan, reference.inputRows);
  plan.guards.push.apply(plan.guards, transition.guards);
  plan.statements.push.apply(plan.statements, transition.statements);
  plan.revisionKeys.push.apply(plan.revisionKeys, transition.revisionKeys);
  var wipeDepartments = Array.from(new Set(transition.transitions.filter(function (t) {
    return t.intent === 'dept-wipe';
  }).map(function (t) { return t.departmentId; }).concat(opt.__serverDepartmentWipes || [])));
  var departmentChange = kv.pend.find(function (pd) { return pd.k === K_DEPTS; }),
    finalDepartments = departmentChange ? (departmentChange.act === 'del' ? [] : parseJson(departmentChange.v, [])) : A.depts;
  plan.snapshotRequired = plan.snapshotRequired || wipeDepartments.length > 0;
@@SYS:save.wipe.irshad@@  await bdWipePlans(env,A,body,plan,wipeDepartments,opt,finalDepartments);
  await bdEmployeeCleanupPlan(env,A,body,plan,reference,opt,wipeDepartments);
  /* RISHAD-266 · issue #1 (owner decision): the server issues the employee notifications of the save it accepts, in the same
     atomic batch (019 nfEmployeePlan) — never the browser. A unit wiped or deleted by this plan gets none (its feed is replaced). */
  var employeeNotifications = await nfEmployeePlan(env, A, kv.pend, plan.body.requestId || enfSnapId('ops'), wipeDepartments);
  plan.guards.push.apply(plan.guards, employeeNotifications.guards);
  plan.statements.push.apply(plan.statements, employeeNotifications.statements);
  if (!plan.snapshotRequired) plan.snapshots = [];
@@SYS:save.snapshot.custody@@  if (opt.__employeeRequestId) {
    plan.fingerprint = opt.__employeeFingerprint;
    plan.intent = opt.__employeeIntent;
    Object.assign(plan.counts, opt.__employeeResult.counts);
    plan.warnings = opt.__employeeResult.warnings || [];
  }
  if (opt.__serverDepartmentWipes) {
    var d = departments[0],
      emptyNF = { version: 1, messages: [], targets: [], states: [], dedup: [], overrides: [], checkpoints: [] },
      np = await rsNFPlan(env, emptyNF, { kind: 'dept', departmentId: d }, opt.__notificationBase, 'replace');
    plan.guards.push.apply(plan.guards, np.guards);
    plan.statements.push.apply(plan.statements, np.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, np.revisionKeys);
    plan.snapshots.push.apply(plan.snapshots, np.snapshots);
    plan.counts.notifications = opt.__notificationCount || 0;
    plan.counts.accounts = opt.__accountCount || 0;
@@SYS:save.wipe.counts@@@@SYS:save.wipe.custodyReceipt@@    plan.fingerprint = opt.__wipeFingerprint;
  }
  await rsImageMetadataPlan(env, A, plan, reference);
  /* V7-F · owner decision 3: the orphans of a unit this plan removes (the ones it makes now and the ones still in their grace) are stamped —
     their original unit is gone for good, so only the platform admin re-binds them (054 imgOrphanRebindOk), whoever later reuses the id */
  rsImageUnitStamp(env, A, plan, finalDepartments);
  // Rows a scoped reference read while the plan was compiled are fenced like the rest (019d).
  plan.guards.push.apply(plan.guards, rsReferenceSince(reference, referenceMark, referenceOperational));
  var ack = await rsCommit(env, A, plan, meta);
  if (operationRequestId) return Object.assign(ack,{v:ack.rev,denied:{},conflicts:{},atomic:1});
  if (opt.__employeeRequestId) return ack;
  if (opt.__serverDepartmentWipes) return Object.assign(ack, { dept: departments[0], requestId: opt.__wipeRequestId });
  var out = kv.out || { revs: {}, denied: {}, conflicts: {} };
  out.v = ack.rev;
  out.atomic = kv.protectedOp || 'custody-transition';
  plan.revisionKeys.forEach(function (k) {
    out.revs[k] = ack.rev;
  });
  return out;
}
async function rsWipeInventory(env, A, dept, kind) {
  kind = kind || 'wipe';
  if (A.u.role !== 'super') throw rsError('forbidden', 403);
@@SYS:wipe.inventory.irshadGuard@@  // RISHAD-266 · s1: the unit's own rows and every operational resource of it, plus the platform-global keys it edits.
  var reference = await rsReferenceSnapshot(env, A.u.id, { departments: [String(dept || '')], operationalKeys: rsScopeDepartments([String(dept || '')]) ? rsScopeOperationalKeys([dept]) : undefined });
  A = reference.A;
  if (
    A.u.role !== 'super' ||
    !A.depts.some(function (d) {
      return d.id === dept;
    })
  )
    throw rsError('forbidden', 403);
  /* F01 · الأقسام: أقسامُ الوحدة المحذوفة — الحذفُ يُرفض ما بقي لها قسم («dept-has-sections»)؛ تُحذف الأقسامُ أولاً كلٌّ بحذفه الذرّي */
  var sections = A.depts.filter(function (d) {
    return d && d.kind === DEPT_SEC_KIND && String(d.gid || '') === dept;
  }).map(function (d) { return { id: String(d.id), name: String(d.name || '') }; });
  var kv = Object.create(null);
  Object.keys(reference.inputKeys).forEach(function (k) {
    if (parseKey(k).dept === dept && !opIsResource(k)) kv[k] = reference.inputRevs[k] || 0;
  });
  var scopedCount = Object.keys(kv).length;
  opDefinitions().forEach(function (definition) {
    var key = 'bsdept:' + dept + ':' + definition.resource;
    kv[key] = reference.inputRevs[key] || 0;
    if (reference.inputKeys[key] != null) scopedCount++;
  });
  var businessBase=await bdRestoreRevisions(env,[dept],false), businessCounts={};
  for(var def of bdDefinitions())businessCounts[def.name]=await bdCount(env,def,dept);
  if (kind === 'delete')
    [K_DEPTS, K_USERS, K_PERM].forEach(function (k) {
      kv[k] = reference.inputRevs[k] || 0;
    });
  var counts = await env.DB.batch([
@@SYS:wipe.inventory.custodyCounts|empty="      env.DB.prepare('SELECT 0 n'),\n      env.DB.prepare('SELECT 0 n'),\n"@@      env.DB.prepare('SELECT COUNT(*) n FROM notification_messages WHERE scope=?1').bind('d:' + dept),
@@SYS:wipe.inventory.irshadCounts@@    ]),
    nf = await nfRead(env);
  return {
    reference: reference,
    public: {
      ok: 1,
      kind: kind,
      dept: dept,
      sections: sections,
      department: {
        kind: secParentOf(A, dept) ? DEPT_SEC_KIND : DEPT_UNIT_KIND,
        id: dept,
        name: String(
          (
            A.depts.find(function (d) {
              return d.id === dept;
            }) || {}
          ).name || '',
        ),
      },
      base: {
        epoch: await rsEpoch(env),
        kv: kv,
@@SYS:wipe.inventory.custodyBase@@@@SYS:wipe.inventory.base@@        notifications: { rev: nf.rev, configRev: nf.configRev, broadcastRev: nf.broadcastRev },
      },
      counts: {
        keys: scopedCount,
        accounts:
          kind === 'delete'
            ? A.users.filter(function (u) {
                return u && (u.role === 'dept' || u.role === 'staff') && u.deptId === dept;
              }).length
            : 0,
@@SYS:wipe.inventory.custodyCount@@        notifications: Number(counts[2].results[0].n),
@@SYS:wipe.inventory.counts@@      },
    },
  };
}
async function rsWipeRoute(env, request, url, ss) {
  var kind = url.pathname === '/api/admin/dept-delete' ? 'delete' : 'wipe';
  try {
    var A = await actorOf(env, ss.uid);
    if (!A) throw rsError('session', 401);
    if (A.u.role !== 'super') throw rsError('forbidden', 403);
    if (request.method === 'GET') return json((await rsWipeInventory(env, A, url.searchParams.get('dept') || '', kind)).public);
    if (request.method !== 'POST') throw rsError('method', 405);
    var bytes = await request.arrayBuffer();
    if (bytes.byteLength > 1024 * 1024) throw rsError('body-large', 413);
    var input;
    try {
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw rsError('bad-body');
    }
    var shapeError = bodyCheck(url.pathname,input); if(shapeError) return json({ok:0,err:'bad-body',at:shapeError},400);
    rsShape(input, ['uid', 'dept', 'requestId', 'base', 'reason']);
    if (input.uid !== undefined && input.uid !== ss.uid) throw rsError('session-changed', 409);
    if (typeof input.dept !== 'string' || typeof input.requestId !== 'string' || !/^[-A-Za-z0-9_]{8,100}$/.test(input.requestId))
      throw rsError('bad-body');
    rsShape(input.base, ['epoch', 'kv', @@SYS:wipe.request.custodyBase@@@@SYS:wipe.request.base|pre="'notifications'"|post="]);"|empty="'notifications']);"@@
    var fingerprint = hex(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ kind: kind, input: cuCanonical(input) }))),
      ),
      old = await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2')
        .bind(A.u.id, input.requestId)
        .first();
    if (old) {
      if (old.fingerprint !== fingerprint) throw rsError('restore-request-reused', 409);
      return json(Object.assign(await rsCommit(env, A, { receipt: old }, reqMeta(request)), { dept: input.dept }));
    }
    var inventory = await rsWipeInventory(env, A, input.dept, kind),
      observed = inventory.public;
    if (kind === 'delete' && observed.sections.length) throw rsError('dept-has-sections', 409);
    if (!deq(cuCanonical(input.base), cuCanonical(observed.base))) throw rsError('conflict', 409);
    var set = Object.create(null),
      del = [],
      base = Object.assign(Object.create(null), input.base.kv),
      why = Object.create(null);
    Object.keys(input.base.kv).forEach(function (k) {
      if (parseKey(k).dept !== input.dept) return;
      if (input.reason !== undefined) {
        if (typeof input.reason !== 'string' || input.reason.length > 300) throw rsError('bad-reason');
        why[k] = input.reason.trim();
      }
      if (opIsResource(k)) return;
      if (@@SYS:wipe.keys.moved.custody@@nfLegacyKey(k) || (@@SYS:wipe.keys.moved.irshad@@bdLegacyKey(k))) throw rsError('domain-moved');
      var e = ENT[resName(k)];
      if (e && typeof e.empty === 'string') set[k] = e.empty;
      else del.push(k);
    });
@@SYS:wipe.request.custodyRev@@    if (kind === 'delete') {
      var current = inventory.reference.A;
      set[K_DEPTS] = JSON.stringify(
        current.depts.filter(function (d) {
          return d.id !== input.dept;
        }),
      );
      set[K_USERS] = JSON.stringify(
        current.users.filter(function (u) {
          return !((u.role === 'dept' || u.role === 'staff') && u.deptId === input.dept);
        }),
      );
      /* F01: وسجلُّ الصلاحيات في الدفعة الذرّية نفسِها — سقفُ الوحدة ووضعُه وتبويباتُها وعدساتُها وأوراقُها وعدساتُ موظفيها وقوالبُهم
         (caps · capOwn · subs · lenses · emps · empLens · tplOf). كان يبقى يتيماً بعد الحذف (والواجهةُ لا تنظّف شيئاً بنفسها) */
      var perms0 = isObj(current.perms) ? current.perms : {}, perms1 = Object.assign({}, perms0), permsHit = false;
      ['caps', 'capOwn', 'capSeed', 'subs', 'lenses', 'emps', 'empLens', 'tplOf'].forEach(function (f) {   /* V7 · د6 (ب4): وعلامةُ البذر */
        if (!isObj(perms0[f]) || !Object.prototype.hasOwnProperty.call(perms0[f], input.dept)) return;
        var m = Object.assign({}, perms0[f]);
        delete m[input.dept];
        perms1[f] = m;
        permsHit = true;
      });
      if (permsHit) set[K_PERM] = JSON.stringify(perms1);
      if (input.reason) {
        why[K_DEPTS] = input.reason.trim();
        why[K_USERS] = input.reason.trim();
        if (permsHit) why[K_PERM] = input.reason.trim();
      }
    }
    var outcome = await rsSaveCommit(
      env,
      A,
      { set: set, del: del, base: base, why: why, reason: typeof input.reason === 'string' ? input.reason.trim() : '' },
      reqMeta(request),
      {
        __reference: inventory.reference,
        __serverDepartmentWipes: [input.dept],
        __wipeRequestId: input.requestId,
        __wipeFingerprint: fingerprint,
        __notificationBase: input.base.notifications,
        __notificationCount: observed.counts.notifications,
@@SYS:wipe.opt.base@@@@SYS:wipe.opt.counts@@        __accountCount: observed.counts.accounts,
        __wipeKind: kind,
        __physicalDeleteKeys:
          kind === 'delete'
            ? Object.keys(input.base.kv).filter(function (k) {
                return parseKey(k).dept === input.dept;
              })
            : [],
      },
    );
    if (outcome.ok !== 1)
      return json(
        {
          ok: 0,
          /* Owner decision (b) 2026-11-03: a unit holding keys the platform does not classify (RES_REG: 044/060 'unknown') is a data-integrity
             problem — the whole delete/wipe is refused and named as such; unknown keys are never deleted silently */
          err: Object.keys(outcome.conflicts || {}).length ? 'conflict' : Object.keys(outcome.denied || {}).some(function (k) { return parseKey(k).dept === input.dept && outcome.denied[k] && outcome.denied[k].why === 'unknown'; }) ? 'unit-unknown-data' : 'denied',
          denied: outcome.denied,
          conflicts: outcome.conflicts,
        },
        Object.keys(outcome.conflicts || {}).length ? 409 : 403,
      );
    return json(outcome);
  } catch (e) {
    if (e.rs) return json({ ok: 0, err: e.rs }, e.status);
    if (e.szCode || e.awCode) return bdErrorResponse(e);
    if (e.irCode) return json({ ok: 0, err: e.irCode, at: e.irPath }, e.irStatus);
    if (e.cuCode) return json({ ok: 0, err: e.cuCode }, e.cuStatus);
    if (e.nf) return json({ ok: 0, err: e.nf }, e.status);
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(e))) return json({ ok: 0, err: 'irshad-legacy-source-present' }, 503);
    if (/KIVO_RESTORE_EPOCH|KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT@@SYS:rs.conflict.custodyTrigger@@/.test(String(e)))
      return json({ ok: 0, err: 'conflict' }, 409);
    throw e;
  }
}
async function rsEmployeeRoute(env, request, url, ss) {
  try {
    var caller = await actorOf(env, ss.uid);
    if (!caller) throw rsError('session', 401);
    var input = null, bytes;
    if (request.method === 'POST') {
      bytes = await request.arrayBuffer();
      if (bytes.byteLength > 8 * 1024 * 1024) throw rsError('body-large', 413);
      try {
        input = JSON.parse(new TextDecoder().decode(bytes));
      } catch (e) {
        throw rsError('bad-body');
      }
    }
    // RISHAD-266 · s1: the transition's department; reads beyond it (other units' employees, grants) are fenced on first read (019d).
    var scopeDept = request.method === 'GET' ? url.searchParams.get('dept') || '' : isObj(input) && typeof input.dept === 'string' ? input.dept : '';
    var reference = await rsReferenceSnapshot(env, ss.uid, { departments: [scopeDept] }),
      A = reference.A;
    env = reference.env;
    env.__employeeReference = { keys: reference.inputKeys, revs: reference.inputRevs, scope: reference.scope };
    if (request.method === 'GET') {
      var context = await empTransitionContext(env, A, url.searchParams.get('dept') || '', url.searchParams.get('intent') || '');
      context.base.epoch = env.__restoreEpoch === undefined ? await rsEpoch(env) : env.__restoreEpoch;
      context.employees = privEmpOut(A, context.dept, context.employees);   // PRIVACY (019u): personal fields by purpose (a delete-only holder)
      await privPrepDepts(env, A, [context.dept]); context.staffAccountKeys = context.staffAccountKeys.map(function (k) { return privKeyOut(A, context.dept, k); });   // 019u (9)
      return json(context);
    }
    if (request.method !== 'POST') throw rsError('method', 405);
    var shapeError = bodyCheck(url.pathname,input); if(shapeError) return json({ok:0,err:'bad-body',at:shapeError},400);
    if (!isObj(input) || (input.uid !== undefined && input.uid !== ss.uid)) throw rsError('session-changed', 409);
    if (typeof input.requestId !== 'string' || !/^[-A-Za-z0-9_]{8,100}$/.test(input.requestId)) throw rsError('employee-request-id');
    var fingerprint = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(cuCanonical(input))))),
      old = await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2')
        .bind(A.u.id, input.requestId)
        .first();
    if (old) {
      if (old.fingerprint !== fingerprint) throw rsError('restore-request-reused', 409);
      return json(await rsCommit(env, A, { receipt: old }, reqMeta(request)));
    }
    if (!isObj(input.base) || input.base.epoch !== +(reference.inputMeta.restore_epoch || 0)) throw rsError('restore-epoch-changed', 409);
    var prepared = await empPrepareTransition(env, A, input),
      outcome = await rsSaveCommit(env, A, prepared.body, reqMeta(request), {
        __reference: reference,
        __serverEmployeeIntent: prepared.context.serverEmployeeIntent,
        __allRequestedKeysRequired: true,
        __employeeRequestId: input.requestId,
        __employeeFingerprint: fingerprint,
        __employeeDept: input.dept,
        __employeeIntent: input.intent,
        __employeeResult: prepared.result,
        __operationSourceGuards: prepared.context.sourceGuards,
@@SYS:emp.opt.awardsBase@@      });
    if (outcome.ok !== 1)
      return json(
        {
          ok: 0,
          err: Object.keys(outcome.conflicts || {}).length ? 'conflict' : 'denied',
          denied: outcome.denied,
          conflicts: outcome.conflicts,
        },
        Object.keys(outcome.conflicts || {}).length ? 409 : 403,
      );
    return json(outcome);
  } catch (e) {
    if (e.rs) return json({ ok: 0, err: e.rs }, e.status);
    if (e.szCode || e.awCode) return bdErrorResponse(e);
    if (e.irCode) return json({ ok: 0, err: e.irCode, at: e.irPath }, e.irStatus);
    if (e.cuCode) return json(Object.assign({ ok: 0, err: e.cuCode }, e.cuDup ? { dup: e.cuDup } : {}), e.cuStatus);
    if (e.nf) return json({ ok: 0, err: e.nf }, e.status);
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(e))) return json({ ok: 0, err: 'irshad-legacy-source-present' }, 503);
    if (/KIVO_RESTORE_EPOCH|KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT@@SYS:rs.conflict.custodyTrigger@@/.test(String(e)))
      return json({ ok: 0, err: 'conflict' }, 409);
    throw e;
  }
}

/* Existing reset transaction, delegated from the authenticated admin router. */
async function rsResetRoute(env, request, path, url, AX, superX) {
  if (!superX) return json({ ok: 0, err: 'forbidden' }, 403);
  var rbz = await bodyRead(request, path); if (rbz.res) return rbz.res; var bz = rbz.v;   /* KIVO_264 · SOT-101 · E5: null كان 500 */
  var gkZ = 'pw:' + AX.u.id;
  if (await guardLeft(env, gkZ) > 0) return json({ ok: 0, err: 'محاولات كثيرة — انتظر قليلاً' });
  var okZ = await verifyPw(String(bz.pw == null ? '' : bz.pw), AX.u.ph);
  if (okZ === 'unsupported') return json({ ok: 0, err: ERR_ITER });
  if (okZ !== true) { await guardFail(env, gkZ); return json({ ok: 0, err: 'كلمة المرور غير صحيحة' }); }
  var rkZ = await metaGet(env, 'rk');
  if (!rkZ) return json({ ok: 0, err: 'أنشئ مفتاح استعادة أولاً — التهيئة لا تُنفَّذ بدونه' });
  if ((await verifyPw('rk:' + normKey(bz.key), rkZ)) !== true) { await guardFail(env, gkZ); return json({ ok: 0, err: 'مفتاح الاستعادة غير صحيح' }); }
  if (String(bz.confirm || '') !== 'تهيئة') return json({ ok: 0, err: 'اكتب كلمة «تهيئة» للتأكيد' });
  var adZ = isObj(bz.admin) ? bz.admin : {};
  var unZ = String(adZ.un || '').trim(), nmZ = String(adZ.name || '').trim() || 'مدير النظام', pwZ = String(adZ.pw || '');
  if (!unCheck(unZ)) return json({ ok: 0, err: 'اسم مستخدم مدير النظام: رقم جوال أو هوية من 10 أرقام' });
  if (!pwCheck(pwZ, 'super')) return json({ ok: 0, err: 'كلمة مرور مدير النظام الجديد ضعيفة — 6 أرقام' });
  await guardReset(env, gkZ);
  var rmZ = reqMeta(request);
  var keepBrand = !!bz.keepBrand, platZ = keepBrand ? await kvGet(env, 'kv', K_PLAT) : null;
  var phZ = await hashPw(pwZ);
  var usersZ = [{ id: 'su', un: unZ, ph: phZ, name: nmZ, role: 'super', mc: 1 }];
  var stZ = [
    rkGuard(env, rkZ),   /* V7 · د5-هـ (أمن ٢): المفتاحُ الذي أجاز التهيئة ما زال المخزَّن (لم تستهلكه استعادةٌ ولا تهيئةٌ متزامنة) */
    env.DB.prepare('DELETE FROM notification_user_state'), env.DB.prepare('DELETE FROM notification_targets'), env.DB.prepare('DELETE FROM notification_messages'),
    env.DB.prepare('DELETE FROM notification_dedup'), env.DB.prepare('DELETE FROM notification_type_overrides'), env.DB.prepare('DELETE FROM notification_checkpoints'),
@@SYS:reset.irshad@@@@SYS:reset.custody@@    env.DB.prepare('DELETE FROM restore_operations'), env.DB.prepare('DELETE FROM restore_preimage'), env.DB.prepare('DELETE FROM restore_snapshot_manifest'),
@@SYS:reset.dstats@@    env.DB.prepare('DELETE FROM kv'), env.DB.prepare('DELETE FROM revs'),
    /* V7-F · owner decision 2 (iv): the reset used to drop the image rows and leave every R2 object behind, unreachable and never deleted. Now, in the same
       batch, each image held in R2 becomes a condemned row ('dead' — no image for anyone, the new admin included) and the sweep deletes the objects:
       a first pass right after the commit (063 fetch · IMG_SWEEP_RESET), the rest (or a failed delete) on the following writes. Inline bodies and staged parts go here as before. */
    env.DB.prepare('DELETE FROM imgown'), env.DB.prepare('DELETE FROM imgref'), env.DB.prepare("DELETE FROM meta WHERE k = 'imgown'"),
    imgBucket(env) ? env.DB.prepare("INSERT OR IGNORE INTO imgown (img, st, k, uid, dept, ts) SELECT DISTINCT k, 'dead', '', '', '', 0 FROM imgs WHERE seq = 0 AND v = ?1 AND substr(k, 1, 5) != ?2").bind(IMG_R2_MARK, IMG_STG) : env.DB.prepare('SELECT 1'),
    env.DB.prepare('DELETE FROM imgs WHERE k NOT IN (SELECT img FROM imgown)'),
    env.DB.prepare('DELETE FROM audit'), env.DB.prepare('DELETE FROM sess'), env.DB.prepare('DELETE FROM guard'),
    env.DB.prepare('DELETE FROM meta WHERE k IN (?1, ?2, ?3, ?4, ?5)').bind('rev', 'rk', 'rk_uid', 'rk_meta', 'rk_used')
  ];
  stZ = opResetStatements(env).concat(bdResetStatements(env),stZ);
  stZ = stZ.concat(kvPutStmts(env, 'kv', K_USERS, JSON.stringify(usersZ)));
  stZ.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2)').bind(K_USERS, 1));
  if (platZ) { stZ = stZ.concat(kvPutStmts(env, 'kv', K_PLAT, platZ)); stZ.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2)').bind(K_PLAT, 1)); }
  stZ.push(env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rev', '1'));
  if(!Number.isSafeInteger(env.__restoreEpoch)||env.__restoreEpoch>=Number.MAX_SAFE_INTEGER)throw dbGuardError('db-restore-epoch-invalid');
  stZ.push(env.DB.prepare("INSERT INTO meta(k,v) VALUES('restore_epoch',?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(String(env.__restoreEpoch+1)),env.DB.prepare('DELETE FROM sec'),audEvStmt(env, { cid: 'reset_' + Date.now().toString(36), ts: Date.now(), uid: AX.u.id, un: AX.u.un, dept: '', k: 'system', rev: 1, etype: 'system', eid: 'platform', ename: 'المنصة', act: 'reset', ctx: JSON.stringify({ keepBrand: keepBrand, newAdmin: unZ }), bef: '', aft: '' }),secStmt(env, { uid: AX.u.id, un: AX.u.un, act: 'reset', detail: JSON.stringify({ keepBrand: keepBrand, newAdmin: unZ, byName: AX.u.name || '' }), ip: rmZ.ip, city: rmZ.city, dev: rmZ.dev }));
  try { await env.DB.batch(stZ); } catch (eZ) { if (isRkConflict(eZ)) return json({ ok: 0, err: 'مفتاح الاستعادة استُعمل أو تغيّر أثناء التهيئة — لم يُنفَّذ شيء', why: 'rk-changed' }, 409); throw eZ; }
  return json({ ok: 1 }, 200, clearCookie(url));
}
