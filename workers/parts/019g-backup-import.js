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
/* سببُ عدم نقل مفتاحٍ من نسخةٍ قديمة ('' = يُنقل): null قيمةٌ فارغة في الملف · device تفضيلُ جهازٍ أو مستخدم · tpls قوالبُ الصلاحيات (حُذفت — الأدوارُ بديلُها) ·
   grants منحٌ صريحة لموظفين (لا تُفتح صلاحيةٌ لم تكن) · unknown لا موردَ له في سجل الموارد الحالي */
function rsiSkipWhy(k, v) {
  var n = resName(k), r = resOf(k);
  return v === null ? 'null' : rsBCForbiddenKey(k) || (r && (r.rule === 'selfdev' || r.scope === 'device')) ? 'device' : ENF_TPLS_RES[n] ? 'tpls' : n === ENF_GRANTS_RES ? 'grants' : r ? '' : 'unknown';
}
function rsiSweepStmt(env, now, uid) {
  return env.DB.prepare('DELETE FROM ' + RSI_T + ' WHERE snapshot_id IN (SELECT snapshot_id FROM ' + RSI_T + " WHERE domain='meta' AND snapshot_id>='stage:' AND snapshot_id<'stage;' AND (row_number<?1 OR table_key=?2))").bind(now - RSI_TTL, uid);
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
      if (b.dry) return json({ ok: 1, skip: skip });
      var im = b.images || {}, ids = Object.keys(im), total = b.n, meta = { scope: s, n: b.n, f: b.f, images: {} };
      ids.forEach(function (k) {
        if (!/^(?:img|szp)_[a-z0-9]+_[a-z0-9]+$/.test(k) || !(im[k] > 0) || im[k] > IMG_TOTAL_MAX) throw rsError('import-shape');
        meta.images[k] = [im[k], Math.ceil(im[k] / RSI_SEG.i)];
        total += im[k];
      });
      if (!(b.n > 1) || !(b.f > 0) || b.f > Math.ceil(b.n / (RSI_SEG.f - 1)) || ids.length > IMG_CAP || total > RSI_MAX) throw rsError(total > RSI_MAX ? 'import-too-large' : 'import-shape', total > RSI_MAX ? 413 : 400);
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
        var dom = it.k ? 'i' : 'f', t = it.t;
        if (!(it.s < (it.k ? (M.images[it.k] || [])[1] : M.f)) || !t || t.length > RSI_SEG[dom] || (it.k ? !(it.s ? imgPartOk(t) : imgTypeOk(t)) : /^[\udc00-\udfff]|[\ud800-\udbff]$/.test(t))) throw rsError('import-part');
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
    if ((op !== 'inspect' && op !== 'commit') || !deq(M.scope, s)) throw rsError('restore-shape');
    /* الاكتمال: كلُّ جزءٍ معلَن أُودِع وطولُ المجموع كما أُعلن — وإلا فلا تخطيطَ ولا كتابة */
    var got = await rsiText(env, id, 'f', ''), file = null, drop = [],
      sizes = (await D.prepare("SELECT table_key k,COUNT(DISTINCT row_number/1000) c,SUM(length(json_extract(row_json,'$'))) n FROM " + T + " WHERE snapshot_id=?1 AND domain='i' GROUP BY table_key").bind(id).all()).results || [];
    if (got.segs === M.f && got.text.length === M.n) { try { file = JSON.parse(got.text); } catch (e) { file = null; } }
    got = null;
    if (!isObj(file) || sizes.length !== Object.keys(M.images).length || sizes.some(function (r) { var d = M.images[r.k]; return !d || d[0] !== r.n || d[1] !== r.c; })) throw rsError('import-incomplete', 409);
    delete file.idbImages;
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
        if (!B) return [D.prepare('INSERT INTO imgs(k,seq,v) SELECT ?2,row_number,json_extract(row_json,\'$\') FROM ' + T + " WHERE snapshot_id=?1 AND domain='i' AND table_key=?2").bind(id, k)];
        if (op !== 'commit') return [];
        stage.put.push(k);
        return await imgStoreStmts(env, k, await stage.text(k));
      },
      done: function (plan, summary) {
        summary.notTransferred = drop.concat(stage.unref.map(function (k) { return { k: k, why: 'image-unreferenced' }; }));
        summary.imagesNew = stage.fresh.length;
        if (op === 'commit') plan.statements.push(rsiDrop(env, id));
      },
    };
    var reference = await rsReferenceSnapshot(env, A.u.id);
    if (rsScopeDenied(reference.A, s)) throw rsError('restore-policy', 403);
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
