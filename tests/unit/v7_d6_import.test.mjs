/* V7 · د6 — استيرادُ نسخة الإدارة على أجزاء (POST /api/backup/import) على العامل المبنيّ الحقيقي وقاعدةٍ في الذاكرة.
   البياناتُ كلُّها مولَّدة TEST_ONLY بالشكل القديم وبالتوزيع المقيس على الملف الحقيقي (v7_d6_import_fx.mjs) — الملفُّ الحقيقي لا يُستعمل ولا يدخل المستودع.
   (١) نسخةٌ ≈31MB (مفتاحٌ ≈8.4MB · صورةٌ 3.37MB) تُستورد كاملة وتُطابَق مفتاحاً مفتاحاً وصورةً صورة — وكلُّ طلبٍ دون حدّ الـ8MB · [ثقيل ≈ 10 ث]
   (٢) نسخةٌ بضعف الحجم (≈62MB) · [ثقيل ≈ 20 ث]
   (٣) قطعٌ في منتصف الأجزاء · فشلُ جزء · إغلاقُ الصفحة (الإلغاء) · انقضاءُ المهلة ⇒ لم يتغيّر شيء والمؤقتُ نُظّف
   (٤) إعادةُ المحاولة بعد فشل · طلبٌ مكرَّر للجزء نفسِه · اعتمادٌ مكرَّر ⇒ نتيجةٌ واحدة وسطرُ سجلٍّ واحد
   (٥) حسابٌ بلا صلاحية يُرفض في كل جزء ولو بطلبٍ مصنوع يدوياً · ولا يمسّ مؤقتَ غيره
   (٦) الشكلُ القديم كما هو كان مرفوضاً في المسار القديم (400 backup-data-shape) — والحدُّ 8MB لم يُرفع
   (٧) النسخةُ الشاملة (kind:'full') تمرّ بالمسار نفسِه · واستيرادُ الموظفين (/api/employees/transition) لم يُمسّ */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { hasSystem } from './harness.mjs';
import { internals } from './internals.mjs';
import { target, oldFile, sizeOf, protocol, staged, snapshot, changed, readOps, readImage, NOT_TRANSFERRED, LAB, SEG, withoutDropped, fieldDrops, fieldDropsOf, remapOf, nfDropsOf, SRC_DEPT, readBack, readAll, wantOf, dayKeys } from './v7_d6_import_fx.mjs';

const B = 'TEST_ONLY_B', A = 'TEST_ONLY_A', SCOPE = { kind: 'dept', departmentId: B }, LIMIT = 8 * 1024 * 1024;
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام والتشغيل والتقرير والعهد (بياناتُ العرض المصدر)' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };   /* سطورُ سجلّ الطلبات لا تُغرق المخرجات */
after(() => { console.log = quiet; });

/* مطابقةُ ما في القاعدة بما في الملف: مفتاحاً مفتاحاً وصورةً صورة */
async function compare(T, who, file, dept = B) {
  const W = T.lab.W, names = Object.keys(file.data), ops = names.filter((k) => file.data[k] !== null && W.opInfo('bsdept:' + dept + ':' + k));
  /* V7 · د6 (posfix): كلُّ موردٍ تشغيليٍّ للإدارة يُقرأ وحده بـ200 · صفوفُه قانونية · ويطابق النسخةَ مفتاحاً مفتاحاً وبترتيبها */
  await readBack(T, dept, wantOf(T, file, dept));
  const got = await readOps(T, who, dept, ops.concat(['bassam_rounds_arc_v1']));
  for (const k of ops) {
    /* V7 · د6 (schemafix): حقولُ المصلى العابرة/غير المعروفة (nNow · capNow · share · shareName) يُسقطها الاستيراد ويذكرها — وكلُّ ما سواها كما في النسخة */
    const want = withoutDropped(JSON.parse(remapped(file.data[k], dept)));
    /* الجولات: أيامُ الأشهر المنقضية ينقلها الخادمُ إلى أرشيفها (د5-ح) — المطابقةُ على مجموع الموردين */
    if (k === 'bassam_rounds_v1') assert.deepEqual({ ...(got.bassam_rounds_arc_v1 || {}), ...(got[k] || {}) }, want, 'الجولات (مع أرشيفها) كما في النسخة');
    else assert.deepEqual(got[k], want, k + ' كما في النسخة');
  }
  const kv = Object.fromEntries(T.DB.q("SELECT k, group_concat(v,'') v FROM (SELECT k,v FROM kv WHERE k GLOB ?1 ORDER BY k,seq) GROUP BY k", 'bsdept:' + dept + ':*').map((r) => [r.k.split(':').slice(2).join(':'), r.v]));
  for (const k of ['bassam_first_boot_v1', 'bassam_last_export_v1']) assert.equal(kv[k], file.data[k], k + ' كما في النسخة');
  /* التنبيهات: كلُّ بندٍ برسالته — إلا ما يُسقط بنداً بنداً (pm_tpl · تنبيهُ إدارةٍ أخرى: V7 · د6 remap) */
  const items = JSON.parse(file.data.bassam_notif_v1).items.filter((x) => x.type !== 'pm_tpl' && (x.dept == null || x.dept === SRC_DEPT)), rows = T.DB.q('SELECT id,title,body FROM notification_messages WHERE scope=?1', 'd:' + dept);
  assert.equal(rows.length, items.length, 'عددُ التنبيهات');
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const it of items) { const r = byId.get(it.id); assert.ok(r, 'تنبيه ' + it.id); assert.equal(r.title, it.t); assert.equal(r.body, it.b); }
  /* ما لا مقابلَ له لم يُكتب */
  for (const k of Object.keys(NOT_TRANSFERRED)) assert.equal(k in kv, false, k + ' لم يُنقل');
  assert.equal(T.DB.q("SELECT COUNT(*) n FROM kv WHERE k GLOB '*bassam_grants_v1' OR k GLOB '*bassam_perm_tpls*'")[0].n, 0, 'لا منحَ ولا قوالب');
  /* V7 · د7 (قرار المالك — 51ب): القوالبُ صارت أدواراً للوحدة الهدف (بلا أشخاص — الملفُّ المقيس بلا tplOf، فلا منح) */
  assert.deepEqual(JSON.parse(kv.bassam_roles_v1).roles.map((r) => r.id), JSON.parse(file.data.bassam_perm_tpls_v1).map((t) => t.id), 'القوالبُ أدوارٌ بمعرّفاتها');
  /* الصور: بايتاتُها ومالكُها ومرجعُها */
  for (const [id, body] of Object.entries(file.idbImages)) {
    const g = await readImage(T, who, id);
    assert.equal(g.status, 200, 'الصورة ' + id); assert.equal(g.t === body, true, 'بايتاتُ ' + id + ' كما في النسخة (' + body.length + ' حرفاً)');
  }
  const own = T.DB.q('SELECT img,st,k,dept FROM imgown ORDER BY img').map((r) => ({ ...r }));
  assert.deepEqual(own, Object.keys(file.idbImages).sort().map((img) => ({ img, st: 'bound', k: 'bsdept:' + dept + ':bassam_plan_v1', dept })), 'كلُّ صورةٍ مربوطةٌ بسجلّ المخطط');
  assert.equal(T.DB.q('SELECT COUNT(*) n FROM imgref')[0].n, Object.keys(file.idbImages).length);
  return ops.length;
}
/* V7 · د6 (remap): النسخةُ كما يُتوقَّع بعد إعادة ربط معرّف إدارة المصدر بالوحدة الهدف — في مواضعه المعدودة وحدها (مفتاحُ المدير في المهام) */
const remapped = (raw, dept) => raw.split('"mgr:' + SRC_DEPT + '"').join('"mgr:' + dept + '"');
const permsOf = (T) => JSON.parse(T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_perms_v1' ORDER BY seq)")[0].v);
const audits = (T) => T.DB.q("SELECT COUNT(*) n FROM aud WHERE k='atomic_restore'")[0].n;

async function heavy(scale, t, { inline = false } = {}) {
  /* inline: بلا مستودعٍ كائنيّ — أجسامُ الصور في D1 مقطَّعةً (تُنسخ من المؤقت داخل دفعة الاعتماد) · وإلا فالمستودعُ الكائنيّ (يوضع الكائنُ عند الاعتماد) */
  const t0 = Date.now(), file = await oldFile({ scale }), size = sizeOf(file), T = await target(inline ? { IMG_R2: null } : {});
  try {
    /* الشكلُ والتوزيع المقيسان */
    assert.deepEqual(Object.keys(file).sort(), ['app', 'data', 'dept', 'exportedAt', 'idbImages', 'kind', 'perms', 'preImport', 'version']);
    assert.equal('manifest' in file || 'domains' in file, false); assert.equal(file.version, 3); assert.equal(file.kind, 'dept'); assert.equal(file.preImport, false);
    assert.ok(Object.values(file.data).every((v) => v === null || typeof v === 'string'), 'كلُّ قيمةٍ نصُّ JSON أو null');
    assert.equal(Object.keys(file.data).length, 29); assert.equal(Object.keys(file.idbImages).length, 10 * scale);
    assert.ok(size.total > 31e6 * scale * 0.98, 'الحجم ≈ ' + 31 * scale + 'MB: ' + size.total);
    assert.ok(size.maxKey > 8.2e6 * scale, 'مفتاحٌ واحد يتجاوز حدَّ الطلب: ' + size.maxKey); assert.ok(size.maxImage >= 3.36e6, 'أكبرُ صورة: ' + size.maxImage);
    assert.ok(size.data > LIMIT, 'البياناتُ وحدها تتجاوز 8MB');
    const before = permsOf(T), users = T.DB.q("SELECT group_concat(v,'') v FROM kv WHERE k='bassam_auth_users_v1'")[0].v;
    const P = protocol(T, T.su, file, { scope: SCOPE });
    await P.build();
    assert.ok(P.sliceCount >= 12 * scale, 'المفتاحُ الكبير يُرسل دفعاتٍ لا نصاً واحداً (' + P.sliceCount + ' دفعة)');
    assert.equal(P.text.includes('"bassam_rounds_v1"'), false, 'ولا يبقى في نصّ الملف');
    const biggest = Math.max(...P.parts.map((p) => Buffer.byteLength(JSON.stringify({ requestId: P.id, op: 'part', items: [p] }))));
    assert.ok(biggest < LIMIT, 'كلُّ جزءٍ دون حدّ الطلب (أكبرُها ' + biggest + ' بايتاً)');
    const t1 = Date.now(), out = await P.run();
    assert.equal(out.begin.status, 200, JSON.stringify(out.begin.j));
    assert.deepEqual(Object.fromEntries(out.begin.j.skip.map((x) => [x.k, x.why])), NOT_TRANSFERRED, 'ما لن يُنقل يُعاد عند البدء: المفتاحُ وسببُه');
    assert.equal(out.inspect.status, 200, JSON.stringify(out.inspect.j).slice(0, 400));
    const s = out.inspect.j.inspection.summary;
    assert.equal(s.legacy, true); assert.equal(s.imagesNew, 10 * scale); assert.equal(s.imagesReused, 0); assert.equal(s.imagesMissing, 0);
    const keyLevel = s.notTransferred.filter((x) => !['transient', 'field', 'field-type', 'mgr-sheet'].includes(x.why) && !/^nf-/.test(x.why));
    assert.deepEqual(s.notTransferred.filter((x) => x.why === 'mgr-sheet'), [{ k: 'perms · mgr', why: 'mgr-sheet', n: 1 }], 'صحيفةُ مدير المصدر لا تنتقل وتُذكر (د6 QA ٦ — ب1)');
    /* V7 · د6 (remap): التنبيهاتُ المُسقطة بنداً بنداً بعددها ونوعها · وإعادةُ ربط معرّف الإدارة بعددها */
    assert.deepEqual(nfDropsOf(s.notTransferred), remapOf(file).nfDrops, 'تنبيهاتٌ لن تُنقل بعددها ونوعها');
    assert.deepEqual({ from: s.remap.from, to: s.remap.to, n: s.remap.n, by: s.remap.by, foreign: s.remap.foreign, left: s.remap.left }, { from: SRC_DEPT, to: B, n: remapOf(file).n, by: remapOf(file).by, foreign: remapOf(file).foreign, left: {} }, 'أُعيد ربط كلِّ إشارة');
    assert.deepEqual(Object.fromEntries(keyLevel.map((x) => [x.k, x.why])), NOT_TRANSFERRED, 'وعند الفحص كذلك');
    /* V7 · د6 (schemafix): وما لا يعرفه المخطّط من حقول الموارد يُذكر قبل التأكيد بمساره وعدده — الفارغُ «عابر» والذي بقيمة «لا مقابل له» — ولا يُرفض به الاستيراد */
    assert.deepEqual(fieldDropsOf(s.notTransferred), fieldDrops(file), 'الحقولُ التي لن تُنقل وعددُها');
    t.diagnostic('حقولٌ لن تُنقل: ' + JSON.stringify(fieldDropsOf(s.notTransferred)));
    assert.equal(out.commit.status, 200, JSON.stringify(out.commit.j).slice(0, 400));
    assert.equal(out.commit.j.ok, 1); assert.deepEqual(out.commit.j.warnings, []); assert.equal(out.commit.j.imagesNew, 10 * scale);
    const ms = Date.now() - t1, n = await compare(T, T.su, file);
    assert.equal(staged(T.DB), 0, 'المؤقتُ حُذف مع الاعتماد'); assert.equal(audits(T), 1, 'سُجّل الاستيراد مرةً واحدة');
    assert.equal(T.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
    const perms1 = permsOf(T);
    assert.ok(T.DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id GLOB 'atomic_*'")[0].n > 0, 'لقطةُ ما قبل الاستيراد محفوظة على الخادم');
    /* الصلاحيات: السقفُ والأوراقُ المرفقة بالنسخة بقاعدة الشريحة القائمة — ولا شيءَ خارج الإدارة الهدف، ولا حساباتٍ ولا منحاً */
    const now = perms1;
    assert.deepEqual(now.caps[B], before.caps[B], 'سقفُ الوحدة كما في الهدف (د6 QA ٦ — ب3: لا سقفَ النسخة)'); assert.deepEqual(now.emps[B], Object.fromEntries(Object.entries(file.perms.emps).filter(([k]) => !k.startsWith('mgr:'))), 'أوراقُ الموظفين انتقلت · وصحيفةُ مدير المصدر لم تنتقل (د6 QA ٦ — ب1؛ كانت تصير صحيفةَ مدير الوحدة)');
    for (const d of Object.keys(before.caps)) if (d !== B) assert.deepEqual(now.caps[d], before.caps[d], 'سقفُ ' + d + ' لم يُمسّ');
    assert.deepEqual(Object.keys(now.emps), [B]); assert.equal(T.DB.q("SELECT group_concat(v,'') v FROM kv WHERE k='bassam_auth_users_v1'")[0].v, users, 'الحساباتُ كما هي');
    /* أين استقرّت أجسامُ الصور — وحدُّ قيمة الصف في طبقة التخزين (CHUNK = 700,000 حرفاً) محترم */
    const bodies = T.DB.q('SELECT COUNT(*) n, MAX(length(v)) m, SUM(length(v)) c FROM imgs')[0];
    if (inline) { assert.equal(bodies.c, size.images, 'أجسامُ الصور كلُّها في D1'); assert.ok(bodies.m <= 200000, 'صفُّ الصورة ≤ 200,000 حرف (' + bodies.m + ')'); }
    else { assert.equal(bodies.n, 10 * scale); assert.equal(bodies.m, 4, 'في D1 سطرُ المرجع وحده — الجسمُ في المستودع الكائنيّ'); }
    if (scale === 1) {
      /* نسخةُ ما قبل الاستيراد مع الأحجام الكبيرة: استيرادٌ ثانٍ فوق إدارةٍ تحمل الجولاتِ كلَّها (≈8.4MB) بنسخةٍ معدَّلة ⇒ اللقطةُ الخادمية تحمل ما كان قبله كاملاً */
      const rounds = JSON.parse(file.data.bassam_rounds_v1);
      for (const day of dayKeys(rounds).map((k) => rounds[k])) { day.t += 1; for (const fl of day.d) for (const z of fl.zones) z.name += ' (معدَّل)'; }
      const v2 = { ...file, data: { ...file.data, bassam_rounds_v1: JSON.stringify(rounds) } }, t2 = Date.now(), second = await protocol(T, T.su, v2, { scope: SCOPE }).run();
      assert.equal(second.commit && second.commit.status, 200, JSON.stringify((second.commit || second.inspect).j).slice(0, 300));
      assert.equal(second.inspect.j.inspection.summary.imagesNew, 0); assert.equal(second.inspect.j.inspection.summary.imagesReused, 10, 'الصورُ الموجودة المطابقة يُعاد استعمالُها');
      await compare(T, T.su, v2);
      const pre = T.DB.q('SELECT COUNT(*) n, SUM(length(row_json)) c FROM restore_preimage WHERE snapshot_id=?1', second.commit.j.snapshot)[0];
      assert.ok(pre.c > 8e6, 'لقطةُ ما قبل الاستيراد تحمل الجولاتِ السابقة كاملة (' + pre.n + ' صفاً · ' + pre.c + ' حرفاً)');
      assert.equal(audits(T), 2); assert.equal(staged(T.DB), 0);
      t.diagnostic('استيرادٌ ثانٍ فوق بياناتٍ قائمة: ' + (Date.now() - t2) + ' ms · لقطةُ ما قبله ' + pre.n + ' صفاً / ' + pre.c + ' حرفاً');
    }
    t.diagnostic('scale ' + scale + (inline ? ' · صور D1' : ' · صور المستودع') + ': ' + JSON.stringify(size) + ' · ' + P.parts.length + ' جزءاً · أكبرُ طلب ' + biggest + ' بايتاً · ' + n + ' مورداً تشغيلياً · استيراد ' + ms + ' ms · الكل ' + (Date.now() - t0) + ' ms');
  } finally { await T.close(); }
}
test('(١) [ثقيل] نسخةٌ بالشكل القديم ≈31MB (مفتاحٌ ≈8.4MB · صورةٌ 3.37MB) تُستورد كاملة وتُطابَق مفتاحاً مفتاحاً وصورةً صورة', { timeout: 300000, ...need }, (t) => heavy(1, t));
test('(٢) [ثقيل] نسخةٌ بضعف الحجم ≈62MB — وأجسامُ الصور في D1 (بلا مستودعٍ كائنيّ)', { timeout: 600000, ...need }, (t) => heavy(2, t, { inline: true }));

test('(٣) قطعٌ في منتصف الأجزاء · فشلُ جزء · إغلاقُ الصفحة · انقضاءُ المهلة ⇒ لم يتغيّر شيء والمؤقتُ نُظّف', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target();
  try {
    const base = snapshot(T.DB), same = (m) => assert.deepEqual(changed(snapshot(T.DB), base), [], m);
    /* قطع: أُودِع جزءٌ من ثلاثة ثم انقطع — لا شيء تغيّر؛ والفحصُ والاعتمادُ على مؤقتٍ ناقص مرفوضان ويُنظَّف */
    let P = protocol(T, T.su, file, { scope: SCOPE });
    assert.equal((await P.begin()).status, 200); assert.equal((await P.part(0)).status, 200);
    assert.ok(staged(T.DB) > 1); same('قطعٌ في منتصف الأجزاء');
    const inv = await P.inventory(), early = await P.commit(inv.base);
    assert.equal(early.status, 409); assert.equal(early.j.err, 'import-incomplete'); same('اعتمادٌ على مؤقتٍ ناقص لا يكتب');
    assert.equal(staged(T.DB), 0, 'المؤقتُ الناقص نُظّف عند الرفض');
    /* إغلاق الصفحة / الإلغاء: طلبُ الإلغاء يحذف المؤقت كلَّه */
    P = protocol(T, T.su, file, { scope: SCOPE });
    await P.begin(); await P.part(0); await P.part(1);
    assert.equal((await P.cancel()).status, 200); assert.equal(staged(T.DB), 0, 'الإلغاءُ حذف المؤقت'); same('الإلغاء');
    assert.equal((await P.part(2)).status, 404, 'جزءٌ يصل بعد الإلغاء لا يُودَع'); assert.equal(staged(T.DB), 0);
    /* فشلُ جزء: خطأُ قاعدةٍ في منتصف الإيداع ⇒ 500 ولا صفَّ ناقصاً من ذلك الجزء؛ لم يتغيّر شيء؛ والمؤقتُ يبقى لإعادة المحاولة */
    P = protocol(T, T.su, file, { scope: SCOPE });
    await P.begin(); await P.part(0);
    const rowsBefore = staged(T.DB);
    T.DB.failIf = (sql) => /INSERT INTO restore_preimage SELECT/.test(sql);
    const bad = await P.part(1);
    T.DB.failIf = null;
    assert.ok(bad.status >= 500, 'فشلُ الجزء: ' + bad.status); assert.equal(staged(T.DB), rowsBefore, 'الجزءُ الفاشل لم يترك صفاً'); same('فشلُ جزء');
    /* انقضاءُ المهلة (ساعة): المؤقتُ القديم لا يُقبل له جزءٌ ولا اعتماد ويُحذف */
    T.DB.exec("UPDATE restore_preimage SET row_number = row_number - 3600001 WHERE domain='meta'");
    const late = await P.part(1);
    assert.equal(late.status, 410); assert.equal(late.j.err, 'import-expired'); assert.equal(staged(T.DB), 0, 'المؤقتُ المنقضي حُذف'); same('انقضاءُ المهلة');
    /* ومؤقتٌ يتيمٌ منقضٍ (صفحةٌ أُغلقت ولم يصل إلغاؤها) يزيله أيُّ بدءٍ لاحق — ولو من حسابٍ آخر — وجولةُ الكنس بعد أي كتابة */
    P = protocol(T, T.su, file, { scope: SCOPE });
    await P.begin(); await P.part(0);
    T.DB.exec("UPDATE restore_preimage SET row_number = row_number - 3600001 WHERE domain='meta'");
    const mgr = await T.login(LAB.mgrB, LAB.pw), Q = protocol(T, mgr, file, { scope: SCOPE });
    const other = await Q.begin();
    if (other.status === 200) { assert.equal(T.DB.q("SELECT COUNT(DISTINCT snapshot_id) n FROM restore_preimage WHERE snapshot_id GLOB 'stage:*'")[0].n, 1, 'بقي مؤقتُ البدء الجديد وحده'); await Q.cancel(); }
    else { T.DB.exec("DELETE FROM guard WHERE gk='rl:img-sweep'"); const w = await T.call('/api/policy', { ck: T.su.ck, body: (await T.call('/api/policy', { ck: T.su.ck })).j.policy || {} }); assert.equal(w.status, 200); await T.lab.idle(); }
    assert.equal(staged(T.DB), 0, 'اليتيمُ المنقضي أُزيل'); same('بعد تنظيف اليتيم');
    /* بدءٌ جديد للحساب نفسِه يزيل مؤقتَه السابق (لا استكمالَ بعد إغلاق الصفحة) */
    P = protocol(T, T.su, file, { scope: SCOPE }); await P.begin(); await P.part(0);
    const P2 = protocol(T, T.su, file, { scope: SCOPE }); await P2.begin();
    assert.equal(T.DB.q("SELECT COUNT(DISTINCT snapshot_id) n FROM restore_preimage WHERE snapshot_id GLOB 'stage:*'")[0].n, 1);
    assert.equal((await P.part(1)).status, 404, 'المؤقتُ السابق زال'); await P2.cancel(); assert.equal(staged(T.DB), 0);
    assert.equal(audits(T), 0, 'لا سطرَ استيرادٍ في السجل: لم يُعتمد شيء'); assert.equal(T.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0);
  } finally { await T.close(); }
});

test('(٣ب) كنسُ المؤقت المنقضي مع جولة الكنس بعد كتابةٍ عادية (بلا أي طلب استيراد)', { timeout: 120000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target();
  try {
    const P = protocol(T, T.su, file, { scope: SCOPE });
    await P.begin(); await P.part(0);
    T.DB.exec("UPDATE restore_preimage SET row_number = row_number - 3600001 WHERE domain='meta'");
    T.DB.exec("DELETE FROM guard WHERE gk='rl:img-sweep'");
    const pol = await T.call('/api/policy', { ck: T.su.ck }), w = await T.call('/api/policy', { ck: T.su.ck, body: pol.j.policy || pol.j || {} });
    assert.equal(w.status, 200, JSON.stringify(w.j).slice(0, 200));
    await T.lab.idle();
    assert.equal(staged(T.DB), 0, 'جولةُ الكنس أزالت المؤقتَ المنقضي');
  } finally { await T.close(); }
});

test('(٣ج) المهلةُ بساعةٍ مضبوطة: مؤقتٌ انقضت ساعتُه لا يُعتمد أبداً · ويكنسه أولُ حفظٍ عاديٍّ ناجح بعد الساعة (جولةُ الكنس بعد الكتابات) بلا استيرادٍ جديد — وقبل الساعة يبقى مهما كثرت الطلبات (القراءةُ لا تكنس: لا تزيد جولةَ قاعدة)', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target(), realNow = Date.now;
  let shift = 0;
  Date.now = () => realNow() + shift;
  try {
    const base = snapshot(T.DB), other = await T.login(LAB.mgrA, LAB.pw), read = () => T.call('/api/get?keys=bassam_platform_v1', { ck: other.ck }),
      write = async () => { const w = await T.call('/api/policy', { ck: T.su.ck, body: (await T.call('/api/policy', { ck: T.su.ck })).j.policy || {} }); await T.lab.idle(); return w; };
    /* (أ) كاملُ الأجزاء، ثم تمرّ ساعةٌ ودقيقة: الاعتمادُ مرفوض 410 ولا شيء يُكتب */
    let P = protocol(T, T.su, file, { scope: SCOPE });
    await P.begin(); for (let i = 0; i < P.parts.length; i++) assert.equal((await P.part(i)).status, 200);
    for (let i = 0; i < P.sliceCount; i++) assert.equal((await P.sliceStep(i)).status, 200);
    const ins = await P.inspect(); assert.equal(ins.status, 200);
    shift = 61 * 60e3;
    const late = await P.commit(ins.j.inspection.base);
    assert.equal(late.status, 410); assert.equal(late.j.err, 'import-expired'); assert.deepEqual(changed(snapshot(T.DB), base), [], 'المنقضي لم يُعتمد'); assert.equal(audits(T), 0); assert.equal(staged(T.DB), 0);
    /* (ب) مؤقتٌ يتيم: قبل الساعة يبقى مهما كثرت الطلبات · وبعدها يكنسه أولُ طلبٍ عاديٍّ ناجح */
    P = protocol(T, T.su, file, { scope: SCOPE });
    await P.begin(); await P.part(0);
    const rows = staged(T.DB); assert.ok(rows > 1);
    shift += 30 * 60e3;
    for (let i = 0; i < 3; i++) assert.equal((await read()).status, 200);
    assert.equal((await write()).status, 200);
    assert.equal(staged(T.DB), rows, 'قبل انقضاء الساعة: باقٍ (قراءاتٌ وحفظٌ وجولةُ كنس)');
    shift += 31 * 60e3;
    for (let i = 0; i < 3; i++) assert.equal((await read()).status, 200);
    assert.equal(staged(T.DB), rows, 'القراءةُ لا تكنس — لا تزيد جولةَ قاعدة');
    assert.equal((await write()).status, 200);
    assert.equal(staged(T.DB), 0, 'بعد الساعة: كنسه أولُ حفظٍ عاديٍّ ناجح');
    assert.equal((await P.part(1)).status, 404, 'ولا يُقبل له جزءٌ بعدها'); assert.deepEqual(changed(snapshot(T.DB), base), []);
  } finally { Date.now = realNow; await T.close(); }
});

test('(٤) إعادةُ المحاولة بعد فشل · طلبٌ مكرَّر للجزء نفسِه · اعتمادٌ مكرَّر ⇒ نتيجةٌ واحدة وسطرُ سجلٍّ واحد', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target();
  try {
    const P = protocol(T, T.su, file, { scope: SCOPE });
    assert.equal((await P.begin()).status, 200);
    /* كلُّ جزءٍ يُرسل مرتين (مكرَّر)، وأحدُها يفشل أولاً ثم يُعاد */
    for (let i = 0; i < P.parts.length; i++) {
      if (i === 1) { T.DB.failIf = (sql) => /INSERT INTO restore_preimage SELECT/.test(sql); assert.ok((await P.part(i)).status >= 500); T.DB.failIf = null; }
      assert.equal((await P.part(i)).status, 200); const rows = staged(T.DB);
      assert.equal((await P.part(i)).status, 200, 'الطلبُ المكرَّر مقبول'); assert.equal(staged(T.DB), rows, 'ولا يضيف صفاً');
    }
    for (let i = 0; i < P.sliceCount; i++) assert.equal((await P.sliceStep(i)).status, 200);
    const ins = await P.inspect(); assert.equal(ins.status, 200, JSON.stringify(ins.j).slice(0, 300));
    const c1 = await P.commit(ins.j.inspection.base); assert.equal(c1.status, 200, JSON.stringify(c1.j).slice(0, 300));
    await compare(T, T.su, file);
    const after1 = snapshot(T.DB);
    /* الاعتمادُ نفسُه ثانيةً (ردٌّ ضاع فأُعيد الطلب): الإيصالُ نفسُه ولا كتابةَ ثانية */
    const c2 = await P.commit(ins.j.inspection.base);
    assert.equal(c2.status, 200); assert.equal(c2.j.duplicate, 1); assert.equal(c2.j.rev, c1.j.rev); assert.equal(c2.j.snapshot, c1.j.snapshot);
    assert.deepEqual(changed(snapshot(T.DB), after1), [], 'الاعتمادُ المكرَّر لا يكتب'); assert.equal(audits(T), 1, 'سطرُ سجلٍّ واحد');
    /* واسمُ الطلب نفسُه بمحتوى اعتمادٍ آخر مرفوض */
    const c3 = await P.commit(ins.j.inspection.base, { mode: 'merge' });
    assert.equal(c3.status, 409); assert.equal(c3.j.err, 'restore-request-reused');
    /* استيرادُ النسخة نفسِها ثانيةً (طلبٌ جديد): الصورُ الآن موجودةٌ مطابقة تُعاد استعمالُها ولا تُكتب */
    const again = await protocol(T, T.su, file, { scope: SCOPE }).run();
    assert.equal(again.commit.status, 200, JSON.stringify((again.inspect || again.commit).j).slice(0, 300));
    assert.equal(again.inspect.j.inspection.summary.imagesNew, 0); assert.equal(again.inspect.j.inspection.summary.imagesReused, 2);
    await compare(T, T.su, file); assert.equal(audits(T), 2);
    /* صورةٌ في الملف تخالف الموجودة بالمعرّف نفسِه: الرفضُ القائم (لا تُستبدل صورةٌ قائمة) ولا شيء يتغيّر */
    const tampered = { ...file, idbImages: { ...file.idbImages, [Object.keys(file.idbImages)[0]]: 'data:image/png;base64,VEVTVF9PTkxZ' } }, before = snapshot(T.DB);
    const refused = await protocol(T, T.su, tampered, { scope: SCOPE }).run();
    assert.equal(refused.inspect.status, 409); assert.equal(refused.inspect.j.err, 'backup-image-reuse-rejected');
    assert.deepEqual(changed(snapshot(T.DB), before), []); assert.equal(staged(T.DB), 0, 'الرفضُ النهائي ينظّف المؤقت');
  } finally { await T.close(); }
});

test('(٤ب) فشلُ الاعتماد نفسِه (خطأُ قاعدةٍ داخل الدفعة) ⇒ لا شيء من النسخة كُتب — لا بياناتٍ ولا صوراً — ثم إعادةُ الاعتماد تنجح · بالمستودعين', { timeout: 300000, ...need }, async () => {
  for (const inline of [false, true]) {
    const file = await oldFile({ small: true }), T = await target(inline ? { IMG_R2: null } : {}), tag = inline ? 'D1' : 'R2';
    try {
      const P = protocol(T, T.su, file, { scope: SCOPE });
      await P.begin(); for (let i = 0; i < P.parts.length; i++) assert.equal((await P.part(i)).status, 200);
      for (let i = 0; i < P.sliceCount; i++) assert.equal((await P.sliceStep(i)).status, 200);
      const ins = await P.inspect(); assert.equal(ins.status, 200);
      const base = snapshot(T.DB), rows = staged(T.DB);
      assert.equal(T.DB.q('SELECT COUNT(*) n FROM imgs')[0].n, 0, tag + ': الفحصُ لا يكتب صورة');
      T.DB.failIf = (sql) => /INSERT INTO restore_operations/.test(sql);
      const bad = await P.commit(ins.j.inspection.base);
      T.DB.failIf = null;
      assert.ok(bad.status >= 500, tag + ': فشلُ الاعتماد ' + bad.status);
      assert.deepEqual(changed(snapshot(T.DB), base), [], tag + ': الدفعةُ كلُّها تراجعت'); assert.equal(T.DB.q('SELECT COUNT(*) n FROM imgs')[0].n, 0, tag + ': ولا صفَّ صورة');
      if (!inline) for (const id of Object.keys(file.idbImages)) assert.equal(await T.lab.env.IMG_R2.get('img/' + id), null, tag + ': كائنُ الصورة الموضوع للاعتماد الفاشل أُزيل');
      assert.equal(staged(T.DB), rows, tag + ': المؤقتُ باقٍ لإعادة الاعتماد'); assert.equal(audits(T), 0);
      const ok = await P.commit(ins.j.inspection.base);
      assert.equal(ok.status, 200, JSON.stringify(ok.j).slice(0, 300)); assert.equal(ok.j.imagesNew, 2);
      await compare(T, T.su, file); assert.equal(staged(T.DB), 0); assert.equal(audits(T), 1);
    } finally { await T.close(); }
  }
});

/* لقطةُ الصفوف التشغيلية والصور والتنبيهات — للمقارنة بين مسارين على قاعدتين */
const rowsOf = (T) => Object.fromEntries(T.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'ops_*' OR name IN ('imgref','notification_messages')) ORDER BY name").map(({ name }) => [name, T.DB.q('SELECT * FROM ' + name).map((r) => JSON.stringify(r)).sort()]));

test('(٨) الدفعاتُ = المسارُ الواحد: النسخةُ نفسُها بالطريقين تنتهي إلى الصفوف نفسِها حرفاً (كل جداول التشغيل · مراجع الصور · التنبيهات) والوثائق نفسِها بترتيب أيامها', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), A = await target(), Z = await target();
  try {
    const mono = await protocol(A, A.su, file, { scope: SCOPE, slice: false }).run();
    const P = protocol(Z, Z.su, file, { scope: SCOPE, slice: 1000, sliceTarget: 5000 }), cut = await P.run();
    assert.equal(mono.commit.status, 200); assert.equal(cut.commit && cut.commit.status, 200, JSON.stringify((cut.commit || cut.inspect || cut.part || cut.begin).j).slice(0, 300));
    assert.ok(P.sliceCount >= 3, 'الجولاتُ قُسمت (' + P.sliceCount + ')');
    assert.deepEqual(cut.commit.j.counts, mono.commit.j.counts, 'العدّادُ واحد'); assert.deepEqual(cut.inspect.j.inspection.counts, cut.commit.j.counts);
    assert.deepEqual(cut.inspect.j.inspection.summary.emptyDomains, mono.inspect.j.inspection.summary.emptyDomains, 'والمجالاتُ الفارغة المعلنة هي هي');
    assert.deepEqual(Object.keys(cut.commit.j.revs).sort(), Object.keys(mono.commit.j.revs).sort(), 'والمواردُ التي تقدّمت نسختُها');
    const a = rowsOf(A), z = rowsOf(Z);
    for (const t of Object.keys(a)) assert.deepEqual(z[t], a[t], 'جدول ' + t);
    const names = ['bassam_rounds_v1', 'bassam_rounds_arc_v1'], da = await readOps(A, A.su, B, names), dz = await readOps(Z, Z.su, B, names);
    assert.equal(JSON.stringify(dz), JSON.stringify(da), 'الوثيقتان بترتيب أعضائهما');
    await compare(Z, Z.su, file); assert.equal(staged(Z.DB), 0); assert.equal(audits(Z), 1);
  } finally { await A.close(); await Z.close(); }
});

test('(٩) دفعاتُ المفتاح الكبير: بالترتيب · المكرَّرةُ لا تضيف · الفاشلةُ تُعاد وحدها · الناقصةُ تمنع الاعتماد · الإلغاءُ ينظّف · ولغير مدير المنصة أو لهدفٍ غير فارغ لا دفعات', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target(), opt = { scope: SCOPE, slice: 1000, sliceTarget: 5000 };
  try {
    const q = () => T.DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id GLOB 'stage:*' AND domain='q'")[0].n, base = snapshot(T.DB);
    let P = protocol(T, T.su, file, opt);
    assert.equal((await P.begin()).status, 200); for (let i = 0; i < P.parts.length; i++) assert.equal((await P.part(i)).status, 200);
    assert.ok(P.sliceCount >= 3);
    /* الاعتمادُ قبل الدفعات مرفوض (ناقص) وينظَّف */
    const early = await P.inspect(); assert.equal(early.status, 409); assert.equal(early.j.err, 'import-incomplete'); assert.equal(staged(T.DB), 0);
    P = protocol(T, T.su, file, opt); await P.begin(); for (let i = 0; i < P.parts.length; i++) await P.part(i);
    /* خارج الترتيب مرفوض */
    const skip = await P.sliceStep(1); assert.equal(skip.status, 409); assert.equal(skip.j.err, 'import-incomplete'); assert.equal(staged(T.DB), 0, 'ونُظّف');
    P = protocol(T, T.su, file, opt); await P.begin(); for (let i = 0; i < P.parts.length; i++) await P.part(i);
    assert.equal((await P.sliceStep(0)).status, 200); const rows0 = q(); assert.ok(rows0 > 0, 'صفوفُ الدفعة في المؤقت');
    assert.equal((await P.sliceStep(0)).status, 200, 'الدفعةُ المكرَّرة مقبولة'); assert.equal(q(), rows0, 'ولا تضيف صفاً');
    /* دفعةٌ تفشل (خطأُ قاعدة) ثم تُعاد وحدها */
    T.DB.failIf = (sql) => /INSERT OR REPLACE INTO restore_preimage/.test(sql);
    const bad = await P.sliceStep(1); T.DB.failIf = null;
    assert.ok(bad.status >= 500); assert.equal(q(), rows0, 'الفاشلةُ لم تترك صفاً');
    /* طلبٌ مصنوع من حسابٍ آخر على المؤقت نفسِه */
    const mgr = await T.login(LAB.mgrA, LAB.pw), forged = await protocol(T, mgr, file, { ...opt, requestId: P.id }).sliceStep(1);
    assert.ok(forged.status === 404 || forged.status === 403, 'مصنوع: ' + forged.status); assert.equal(q(), rows0);
    for (let i = 1; i < P.sliceCount; i++) assert.equal((await P.sliceStep(i)).status, 200);
    assert.deepEqual(changed(snapshot(T.DB), base), [], 'الدفعاتُ كلُّها في المؤقت — لم يتغيّر شيء في الإدارة');
    /* الإلغاءُ يحذف صفوفَ الدفعات كذلك */
    assert.equal((await P.cancel()).status, 200); assert.equal(staged(T.DB), 0); assert.deepEqual(changed(snapshot(T.DB), base), []);
    /* اعتمادٌ يفشل داخل الدفعة الذرّية: لا صفَّ من صفوف الدفعات كُتب — ثم ينجح */
    P = protocol(T, T.su, file, opt); await P.begin(); for (let i = 0; i < P.parts.length; i++) await P.part(i); for (let i = 0; i < P.sliceCount; i++) await P.sliceStep(i);
    const ins = await P.inspect(); assert.equal(ins.status, 200, JSON.stringify(ins.j).slice(0, 300));
    T.DB.failIf = (sql) => /INSERT INTO restore_operations/.test(sql);
    const fail = await P.commit(ins.j.inspection.base); T.DB.failIf = null;
    assert.ok(fail.status >= 500); assert.deepEqual(changed(snapshot(T.DB), base), [], 'الدفعةُ الذرّية تراجعت كلُّها'); assert.equal(T.DB.q('SELECT COUNT(*) n FROM ops_round_day')[0].n, 0);
    assert.equal((await P.commit(ins.j.inspection.base)).status, 200); await compare(T, T.su, file); assert.equal(staged(T.DB), 0);
    /* الهدفُ الآن غيرُ فارغ: الدمجُ لا دفعاتَ له (مسارُه الواحد كما كان) · والاستبدالُ يُقسم دفعاتٍ كذلك (اختبار ١٠) */
    const again = protocol(T, T.su, file, { ...opt, mode: 'merge' }), dryMerge = await again.post({ op: 'begin', dry: true, scope: SCOPE, keys: { bassam_rounds_v1: 0 }, mode: 'merge' });
    assert.deepEqual(dryMerge.j.slice, {}, 'دمجٌ في هدفٍ غير فارغ: لا دفعات');
    const dryReplace = await again.post({ op: 'begin', dry: true, scope: SCOPE, keys: { bassam_rounds_v1: 0 }, mode: 'replace' });
    assert.deepEqual(Object.keys(dryReplace.j.slice), ['bassam_rounds_v1'], 'استبدالٌ في هدفٍ غير فارغ: دفعات');
    /* وبيانُ دفعاتٍ يُفرض على دمجٍ في هدفٍ غير فارغ مرفوضٌ عند البدء */
    const forcedBegin = await again.post({ op: 'begin', scope: SCOPE, mode: 'merge', n: 10, f: 1, slices: { 'bassam_rounds_v1#0': 50 }, keys: { bassam_rounds_v1: 0 } });
    assert.equal(forcedBegin.status, 400); assert.equal(forcedBegin.j.err, 'import-shape');
    /* والطريقةُ ثابتةٌ من البدء: دفعاتٌ بدأت استبدالاً لا تُعتمد دمجاً */
    const R = protocol(T, T.su, file, opt); await R.begin(); for (let i = 0; i < R.parts.length; i++) await R.part(i); for (let i = 0; i < R.sliceCount; i++) assert.equal((await R.sliceStep(i)).status, 200);
    const sw = await R.post({ phase: 'inspect', scope: SCOPE, mode: 'merge', reason: 'TEST_ONLY', base: (await R.inventory()).base, legacyConsent: false });
    assert.equal(sw.status, 400); assert.equal(sw.j.err, 'restore-shape'); assert.equal(staged(T.DB), 0);
  } finally { await T.close(); }
  /* مديرُ الإدارة (ولو بمفتاح الاستعادة): لا دفعات — مسارُه كما كان */
  const T2 = await target();
  try {
    const GK = 'bsdept:' + B + ':bassam_grants_v1';
    await T2.DB.batch([...T2.lab.W.kvPutStmts(T2.lab.env, 'kv', GK, JSON.stringify({ v: 1, emp: { ['mgr:' + B]: { plus: ['backup.restore'], minus: [] } } })), T2.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(GK)]);
    const mgrB = await T2.login(LAB.mgrB, LAB.pw), dry = await protocol(T2, mgrB, file, opt).post({ op: 'begin', dry: true, scope: SCOPE, keys: { bassam_rounds_v1: 0 } });
    assert.equal(dry.status, 200); assert.deepEqual(Object.keys(dry.j.slice), ['bassam_rounds_v1'], 'مديرُ الإدارة على إدارته: الدفعاتُ نفسُها (د6 QA ٦ — قرارُ المالك؛ كانت: لا دفعات لغير مدير المنصة)');
  } finally { await T2.close(); }
});

/* نسخةٌ ثانية تختلف عن الأولى: يومٌ يُحذف، يومٌ يتغيّر، يومٌ جديد — لاستبدالٍ فوق بياناتٍ قائمة */
function variant(file) {
  const rounds = JSON.parse(file.data.bassam_rounds_v1), days = dayKeys(rounds), out = Object.fromEntries(Object.entries(rounds).filter(([k]) => !days.includes(k)));   /* V7 · د6 (posfix): الحقلُ الثابت والعلاماتُ تبقى */
  days.slice(1).forEach((d) => { out[d] = JSON.parse(JSON.stringify(rounds[d])); out[d].t += 7; out[d].d[0].zones[0].name += ' (معدَّل)'; });
  out['1448-2-20'] = JSON.parse(JSON.stringify(rounds[days[0]])); out['1448-2-20'].t += 99;
  return { ...file, data: { ...file.data, bassam_rounds_v1: JSON.stringify(out) } };
}
test('(١٠) استبدالٌ فوق إدارةٍ فيها جولات: الدفعاتُ = المسارُ الواحد صفاً بصف (القائمُ من الجولات وأرشيفها يُطرح كلُّه) · لقطةُ ما قبله في القاعدة · وفشلُ الاعتماد لا يغيّر شيئاً', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), next = variant(file), A = await target(), Z = await target();
  try {
    for (const T of [A, Z]) assert.equal((await protocol(T, T.su, file, { scope: SCOPE, slice: false }).run()).commit.status, 200, 'الإدارةُ تحمل النسخةَ الأولى');
    const first = rowsOf(Z), nodes0 = Z.DB.q("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND (resource GLOB 'bassam_rounds*' OR resource IN ('bassam_plan_v1','bassam_staffing_v3'))", B)[0].n;
    assert.ok(nodes0 > 50, 'في الهدف جولاتٌ قائمة (' + nodes0 + ' عقدة)');
    const mono = await protocol(A, A.su, next, { scope: SCOPE, slice: false }).run();
    assert.equal(mono.commit.status, 200, JSON.stringify((mono.commit || mono.inspect).j).slice(0, 300));
    const P = protocol(Z, Z.su, next, { scope: SCOPE, slice: 1000, sliceTarget: 5000 });
    assert.equal((await P.begin()).status, 200); for (let i = 0; i < P.parts.length; i++) assert.equal((await P.part(i)).status, 200);
    assert.ok(P.sliceCount >= 3, 'هدفٌ غير فارغ والاستبدالُ على دفعات (' + P.sliceCount + ')');
    for (let i = 0; i < P.sliceCount; i++) { const r = await P.sliceStep(i); assert.equal(r.status, 200, JSON.stringify(r.j)); }
    assert.deepEqual(rowsOf(Z), first, 'الدفعاتُ في المؤقت: الإدارةُ كما هي');
    const ins = await P.inspect(); assert.equal(ins.status, 200, JSON.stringify(ins.j).slice(0, 300));
    /* الكلُّ أو لا شيء: اعتمادٌ يفشل داخل الدفعة ⇒ الجولاتُ القائمة كما هي حرفاً (لا حذفَ ولا إدراج) */
    Z.DB.failIf = (sql) => /INSERT INTO restore_operations/.test(sql);
    const bad = await P.commit(ins.j.inspection.base); Z.DB.failIf = null;
    assert.ok(bad.status >= 500); assert.deepEqual(rowsOf(Z), first, 'فشلُ الاعتماد: لم يُحذف القائم ولم يُدرج الجديد');
    const done = await P.commit(ins.j.inspection.base);
    assert.equal(done.status, 200, JSON.stringify(done.j).slice(0, 300));
    /* فرقٌ واحد معلوم: ما يُطبَّق على دفعات (الجولاتُ الحيّة · المخطط · جدولُ الورديات) يُعاد كتابتُه دائماً ولو لم يتغيّر محتواه فتتقدّم نسختُه — والصفوفُ هي هي */
    const live = 'bsdept:' + B + ':bassam_rounds_v1', extra = Object.keys(done.j.revs).filter((k) => !(k in mono.commit.j.revs));
    assert.deepEqual(Object.keys(mono.commit.j.revs).filter((k) => !(k in done.j.revs)), []); assert.ok(extra.map((k) => k.replace(/@\*$/, '')).every((k) => k === live || k === 'bsdept:' + B + ':bassam_plan_v1' || k === 'bsdept:' + B + ':bassam_staffing_v3'), JSON.stringify(extra));   /* V7 · 53: ومراجعةُ الكتابة بالجملة (K@*) للموارد نفسِها */
    assert.deepEqual({ ...done.j.counts, operations: 0 }, { ...mono.commit.j.counts, operations: 0 }, 'العدّاداتُ الأخرى واحدة'); assert.ok(done.j.counts.operations >= mono.commit.j.counts.operations && done.j.counts.operations <= mono.commit.j.counts.operations + extra.length, 'المواردُ التشغيلية: ما أُعيدت كتابتُه بلا تغيير يُعدّ');
    const a = rowsOf(A), z = rowsOf(Z);
    for (const t of Object.keys(a)) assert.deepEqual(z[t], a[t], 'جدول ' + t + ' بعد الاستبدال');
    const names = ['bassam_rounds_v1', 'bassam_rounds_arc_v1'], da = await readOps(A, A.su, B, names), dz = await readOps(Z, Z.su, B, names);
    assert.equal(JSON.stringify(dz), JSON.stringify(da), 'الوثيقتان بترتيب أعضائهما');
    const arc = Object.keys(dz.bassam_rounds_arc_v1);
    assert.equal(arc.includes(dayKeys(JSON.parse(file.data.bassam_rounds_v1))[0]), false, 'يومٌ قائم ليس في النسخة الجديدة يزول (استبدال — كالمسار الواحد)'); assert.ok(arc.includes('1448-2-20'), 'واليومُ الجديد أُضيف');
    /* لقطةُ ما قبل الاستيراد: صفوفُ الموردين القائمة نُسخت داخل القاعدة تحت معرّف لقطة هذا الاعتماد */
    const snap = Z.DB.q("SELECT table_key k, COUNT(*) n FROM restore_preimage WHERE snapshot_id=?1 AND domain='operations-sql' GROUP BY table_key", done.j.snapshot), total = snap.reduce((n, r) => n + r.n, 0);
    const manifest = Z.DB.q("SELECT SUM(row_count) n FROM restore_snapshot_manifest WHERE snapshot_id=?1 AND domain='operations-sql'", done.j.snapshot)[0].n;
    assert.equal(total, manifest); assert.ok(snap.some((r) => /bassam_rounds_arc_v1:ops_nodes$/.test(r.k)), 'لقطةُ عقد الأرشيف القائم');
    assert.equal(snap.filter((r) => /:ops_nodes$/.test(r.k)).reduce((n, r) => n + r.n, 0), nodes0, 'اللقطةُ تحمل كلَّ عقد الجولات والمخطط وجدول الورديات التي كانت قبل الاستبدال (' + nodes0 + ')');
    assert.equal(staged(Z.DB), 0); await compare(Z, Z.su, next);
  } finally { await A.close(); await Z.close(); }
});

test('(١١) ما لا يُقسم لا يُحاوَل إن كان أثقلَ من الآمن: يُرفض عند البدء (قبل أي رفع) بسببه — دمجٌ في هدفٍ غير فارغ · النسخةُ الشاملة · غيرُ مدير المنصة · والصغيرُ يمرّ', { timeout: 300000, ...need }, async () => {
  const big = await oldFile({ scale: 1, images: false }), small = await oldFile({ small: true }), T = await target();
  try {
    assert.equal((await protocol(T, T.su, small, { scope: SCOPE }).run()).commit.status, 200, 'في الهدف بياناتٌ قائمة');
    const base = snapshot(T.DB), refused = async (P, what) => { const r = await P.begin(); assert.equal(r.status, 413, what + ': ' + JSON.stringify(r.j)); assert.equal(r.j.err, 'import-too-heavy', what); assert.ok(r.j.details.cost > r.j.details.budget, what + ' — الكلفةُ المقدَّرة ' + r.j.details.cost + 'MB فوق ' + r.j.details.budget); assert.equal(staged(T.DB), 0, what + ': لم يُفتح مؤقت'); return r; };
    await refused(protocol(T, T.su, big, { scope: SCOPE, mode: 'merge' }), 'دمجٌ في هدفٍ غير فارغ');
    /* النسخةُ الشاملة بهذا الحجم */
    const full = { app: 'bassam-crowd', version: 3, kind: 'full', exportedAt: '2026-11-21T10:00:00.000Z', preImport: false, data: Object.fromEntries(Object.entries(big.data).filter(([, v]) => v !== null).map(([k, v]) => ['bsdept:' + B + ':' + k, v])) };
    /* V7 · د7: الدمجُ الشامل لا يُقسم (كما كان) فيُرفض بهذا الحجم · والاستبدالُ الشامل صار يُقسم لكل إدارة بمسار نسخة الإدارة (كان يُرفض هنا — بند «النسخة الشاملة» في ج من أمر د7) */
    const fr = await refused(protocol(T, T.su, full, { scope: { kind: 'full' }, mode: 'merge' }), 'النسخةُ الشاملة دمجاً'); assert.equal(fr.j.details.kind, 'full');
    { const fp = protocol(T, T.su, full, { scope: { kind: 'full' } }); assert.equal((await fp.begin()).status, 200, 'الاستبدالُ الشامل: دفعات'); assert.ok(Object.keys(fp.slices).filter((k) => k.startsWith(B + '/bassam_rounds_v1#')).length > 10); await fp.cancel(); }
    /* مديرُ الإدارة بمفتاح الاستعادة: لا دفعاتَ له، فالكبيرُ يُرفض عند البدء */
    const GK = 'bsdept:' + B + ':bassam_grants_v1';
    await T.DB.batch([...T.lab.W.kvPutStmts(T.lab.env, 'kv', GK, JSON.stringify({ v: 1, emp: { ['mgr:' + B]: { plus: ['backup.restore'], minus: [] } } })), T.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(GK)]);
    /* V7 · د6 (QA ٦ — قرارُ المالك): مديرُ الإدارة على إدارته بالدفعات نفسِها — كان يُرفض هنا (لا دفعات لغير مدير المنصة) */
    { const mb = protocol(T, await T.login(LAB.mgrB, LAB.pw), big, { scope: SCOPE, reason: 'TEST_ONLY' }); assert.equal((await mb.begin()).status, 200, 'مديرُ الإدارة: دفعات'); assert.ok(mb.sliceCount > 10); await mb.cancel(); }
    assert.deepEqual(changed(snapshot(T.DB), base).filter((t) => t !== 'kv' && t !== 'revs'), [], 'لم يتغيّر شيء');
    /* والاستبدالُ بحساب مدير المنصة للنسخة نفسِها مقبولٌ (دفعات) · والدمجُ الصغير مقبول */
    const ok = protocol(T, T.su, big, { scope: SCOPE }); assert.equal((await ok.begin()).status, 200); assert.ok(ok.sliceCount > 10); await ok.cancel();
    const sm = protocol(T, T.su, small, { scope: SCOPE, mode: 'merge' }); assert.equal((await sm.begin()).status, 200); await sm.cancel();
  } finally { await T.close(); }
});

test('(١٢) حدُّ الوثيقة كلِّها يُحسب على مجموع دفعاتها: سقفُ الصور في السجل الواحد (5000) لا يُتجاوز بالتقسيم — كلُّ دفعةٍ دونه ومجموعُها فوقه ⇒ يُرفض عند الفحص ولا يتغيّر شيء', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target();
  try {
    /* ثلاثةُ أيام، في كلٍّ منها 1700 معرّفَ صورةٍ مختلفاً (نصاً في اسم مصلى): كلُّ دفعةٍ 1700، والمجموع 5100 */
    const rounds = JSON.parse(file.data.bassam_rounds_v1), days = dayKeys(rounds);
    days.forEach((d, n) => { rounds[d].d[0].zones[0].name = 'TEST_ONLY ' + Array.from({ length: 1700 }, (_, i) => 'img_cap' + n + '_x' + i).join(' '); });
    const heavy = { ...file, data: { ...file.data, bassam_rounds_v1: JSON.stringify(rounds) } }, base = snapshot(T.DB);
    const P = protocol(T, T.su, heavy, { scope: SCOPE, slice: 1000, sliceTarget: 30000 }), out = await P.run();
    assert.ok(P.sliceCount >= 3, 'ثلاثُ دفعات (' + P.sliceCount + ')'); assert.equal(out.slice, undefined, 'كلُّ دفعةٍ وحدها مقبولة');
    assert.equal(out.inspect.status, 403, JSON.stringify(out.inspect.j).slice(0, 300)); assert.equal(out.inspect.j.err, 'restore-key-denied');
    assert.deepEqual(Object.values(out.inspect.j.details.denied).map((x) => x.why), ['img-limit']);
    assert.deepEqual(changed(snapshot(T.DB), base), []); assert.equal(staged(T.DB), 0);
  } finally { await T.close(); }
});

test('(١٦) كلُّ ما يكبر يُقسم: المهامُ والتقريرُ اليومي (خريطتا أيام) وجدولُ الورديات (في طلبه) — الدفعاتُ = المسارُ الواحد صفاً بصف، إلى إدارةٍ فارغة وفوق إدارةٍ تحمل نسخةً أخرى', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), A = await target(), Z = await target(), names = ['bassam_tasks_v1', 'bassam_dreport_v1', 'bassam_staffing_v3', 'bassam_rounds_v1', 'bassam_plan_v1'];
  /* نسخةٌ ثانية: يومٌ يُحذف من التقرير، وشهرٌ يُحذف من الورديات، والمهامُ كما هي (تُطرح وتُكتب من جديد) */
  const drop = (raw) => { const d = JSON.parse(raw), k = Object.keys(d); delete d[k[0]]; return JSON.stringify(d); };
  const next = { ...variant(file), data: { ...variant(file).data, bassam_dreport_v1: drop(file.data.bassam_dreport_v1), bassam_staffing_v3: drop(file.data.bassam_staffing_v3) } };
  try {
    for (const [tag, f] of [['إدارةٌ فارغة', file], ['فوق نسخةٍ قائمة', next]]) {
      const mono = await protocol(A, A.su, f, { scope: SCOPE, slice: false }).run();
      const P = protocol(Z, Z.su, f, { scope: SCOPE, slice: 300, sliceTarget: 400 }), cut = await P.run();
      assert.equal(mono.commit && mono.commit.status, 200, tag + ' (واحد): ' + JSON.stringify((mono.commit || mono.inspect).j).slice(0, 300));
      assert.equal(cut.commit && cut.commit.status, 200, tag + ' (دفعات): ' + JSON.stringify((cut.commit || cut.inspect || cut.part || cut.begin).j).slice(0, 300));
      const sl = Object.keys(P.slices);
      for (const n of ['bassam_tasks_v1#1', 'bassam_dreport_v1#1', 'bassam_staffing_v3#0', 'bassam_plan_v1#0', 'bassam_rounds_v1#1']) assert.ok(sl.includes(n), tag + ': ' + n + ' دفعةٌ (' + sl.join(' ') + ')');
      const a = rowsOf(A), z = rowsOf(Z);
      for (const t of Object.keys(a)) assert.deepEqual(z[t], a[t], tag + ': جدول ' + t);
      assert.equal(JSON.stringify(await readOps(Z, Z.su, B, names)), JSON.stringify(await readOps(A, A.su, B, names)), tag + ': الوثائقُ بترتيب أعضائها');
      assert.deepEqual(cut.commit.j.counts.notifications, mono.commit.j.counts.notifications); assert.equal(staged(Z.DB), 0);
    }
  } finally { await A.close(); await Z.close(); }
});

/* V7 · د6 (قرارُ المالك: الخطةُ المحصورة باقية): استيرادُ الإدارة أو استعادتُها لا تمسّ تنبيهاتِ غيرها أبداً — على المسارين (/api/backup/import · /api/backup/restore)
   وبالوضعين (استبدال · دمج): (أ) كلُّ صفٍّ لغير الإدارة (إدارةٌ أخرى · bc · sys · الإعداداتُ ونقاطُ التتبّع) هو هو بايتاً بعد كل عملية،
   (ب) تنبيهاتُ الإدارة بعد الاستبدال هي ما تحمله النسخةُ صفاً بصف (التحويلُ المتوقَّع = استيرادُ النسخة نفسِها إلى إدارةٍ فارغة) — بلا تكرارٍ ولا نقص؛
   وبعد الدمج كما كانت حرفاً (الدمجُ في الإدارة لا يطبّق مجالَ التنبيهات — قاعدةٌ قائمة).
   ثم على المسار الجديد: تنبيهاتُ إدارةٍ أخرى لا تُقرأ (تعديلُها بين الفحص والاعتماد لا يوقفه ويبقى) وتنبيهاتُ الهدف محروسة بنسختها. */
const NF_T = [['notification_messages', 'scope'], ['notification_targets', 'scope'], ['notification_user_state', 'message_scope'], ['notification_dedup', 'scope'], ['notification_type_overrides', ''], ['notification_checkpoints', 'scope']];
const nfRows = (T, mine) => Object.fromEntries(NF_T.filter(([, c]) => !mine || c).map(([t, c]) => [t, T.DB.q('SELECT * FROM ' + t + (c ? ' WHERE ' + c + (mine ? '=' : '<>') + "'d:" + B + "'" : '')).map((r) => JSON.stringify(r)).sort()]));
const nfMine = (T) => { const o = nfRows(T, true); delete o.notification_checkpoints; return o; };
test('(١٧) التنبيهات: استيرادُ الإدارة واستعادتُها (المساران · الاستبدال والدمج) لا تمسّ تنبيهاتِ غيرها بايتاً، وتنبيهاتُ الإدارة هي ما تحمله النسخة صفاً بصف — وتنبيهاتُ إدارةٍ أخرى لا تُقرأ وتنبيهاتُ الهدف محروسة', { timeout: 600000, ...need }, async () => {
  const strip = (f) => ({ ...f, data: Object.fromEntries(Object.entries(f.data).filter(([k]) => !(k in NOT_TRANSFERRED))), idbImages: {} });
  const file = await oldFile({ small: true, images: false }), nf = JSON.parse(file.data.bassam_notif_v1);
  /* نسخةٌ ثانية: نصفُ التنبيهات وأحدُها معدَّل العنوان */
  const half = { ...nf, items: nf.items.slice(0, Math.ceil(nf.items.length / 2)).map((x, i) => (i ? x : { ...x, t: x.t + ' (معدَّل)' })) };
  const file2 = { ...file, data: { ...file.data, bassam_notif_v1: JSON.stringify(half) } };
  assert.ok(nf.items.length >= 4 && half.items.length < nf.items.length);
  /* التحويلُ المتوقَّع: النسخةُ نفسُها إلى إدارةٍ فارغة في منصةٍ جديدة */
  const expect = async (f) => { const Z = await target(); try { assert.equal((await protocol(Z, Z.su, f, { scope: SCOPE }).run()).commit.status, 200); return { rows: nfMine(Z), z: Z.DB.q("SELECT * FROM notification_messages WHERE scope='d:" + B + "'"), targets: Z.DB.q("SELECT * FROM notification_targets WHERE scope='d:" + B + "'") }; } finally { await Z.close(); } };
  const E1 = await expect(file), E2 = await expect(file2);
  /* V7 · د6 (remap): ما يُسقط بنداً بنداً (pm_tpl · تنبيهُ إدارةٍ أخرى) لا صفَّ له — وكلُّ ما سواه صفٌّ واحد */
  const kept = new Set(remapOf(file).kept), nKept = (items) => items.filter((x) => kept.has(x.id)).length;
  assert.equal(E1.rows.notification_messages.length, nKept(nf.items), 'كلُّ تنبيهٍ يُنقل في النسخة صفٌّ واحد'); assert.equal(E2.rows.notification_messages.length, nKept(half.items));
  const viaNew = async (T, f, mode) => { const r = await protocol(T, T.su, f, { scope: SCOPE, mode }).run(); assert.equal(r.commit && r.commit.status, 200, 'جديد ' + mode + ': ' + JSON.stringify((r.commit || r.inspect || r.begin).j).slice(0, 300)); };
  const viaOld = async (T, f, mode) => {
    const inv = (await T.call('/api/backup/restore?kind=dept&departments=%5B%5D&dept=' + B, { ck: T.su.ck })).j, id = 'TEST_ONLY_nf_old_' + Math.random().toString(36).slice(2, 12);
    const body = { version: 1, uid: T.su.uid, requestId: id, scope: SCOPE, mode, reason: 'TEST_ONLY د6 تنبيهات', backup: strip(f), legacyConsent: true };
    const ins = await T.call('/api/backup/restore', { ck: T.su.ck, body: { ...body, base: inv.base, phase: 'inspect' } });
    assert.equal(ins.status, 200, 'قديم فحص ' + mode + ': ' + JSON.stringify(ins.j).slice(0, 300));
    const com = await T.call('/api/backup/restore', { ck: T.su.ck, body: { ...body, base: ins.j.inspection.base, phase: 'commit' } });
    assert.equal(com.status, 200, 'قديم اعتماد ' + mode + ': ' + JSON.stringify(com.j).slice(0, 300));
    await readAll(T, SCOPE);   /* V7 · د6 (posfix): وبعد الاستعادة يُقرأ كلُّ شيء */
  };
  for (const [route, run] of [['/api/backup/import', viaNew], ['/api/backup/restore', viaOld]]) {
    const T = await target();
    try {
      /* صفوفٌ لغير الإدارة قبل أي استيراد: إدارةٌ أخرى · bc · sys (رسائلُ وأهدافٌ وحالاتُ قراءة وتكرار) · إعدادُ نوع · نقطةُ تتبّع */
      for (const sc of ['d:' + A, 'bc', 'sys']) {
        for (const m of E1.z) { const r = { ...m, scope: sc, title: 'TEST_ONLY · ' + sc + ' · ' + m.title }; T.DB.q('INSERT INTO notification_messages(' + Object.keys(r).join(',') + ') VALUES(' + Object.keys(r).map((_, i) => '?' + (i + 1)).join(',') + ')', ...Object.values(r)); }
        for (const g of E1.targets) T.DB.q('INSERT INTO notification_targets(scope,message_id,kind,value) VALUES(?1,?2,?3,?4)', sc, g.message_id, g.kind, g.value);
        T.DB.q('INSERT INTO notification_user_state(account_uid,message_scope,message_id,read_at) VALUES(?1,?2,?3,?4)', T.su.uid, sc, E1.z[0].id, 1795000000123);
        T.DB.q('INSERT INTO notification_dedup(scope,once_key,created_at,message_id) VALUES(?1,?2,?3,?4)', sc, 'TEST_ONLY_once', 1795000000124, E1.z[0].id);
      }
      T.DB.q("INSERT INTO notification_type_overrides(type_id,enabled,priority) VALUES('TEST_ONLY_type',1,'urg')");
      T.DB.q("INSERT INTO notification_checkpoints(scope,name,value) VALUES('sys','TEST_ONLY_cp',7)");
      const O = nfRows(T, false);
      assert.ok(O.notification_messages.length >= 3 * E1.z.length && O.notification_type_overrides.length && O.notification_checkpoints.length);
      const step = async (label, f, mode, check) => {
        await run(T, f, mode);
        assert.deepEqual(nfRows(T, false), O, route + ' · ' + label + ': كلُّ صفٍّ لغير الإدارة هو هو بايتاً');
        check(nfMine(T), route + ' · ' + label);
      };
      await step('استبدال', file, 'replace', (m, w) => assert.deepEqual(m, E1.rows, w + ': ما تحمله النسخة صفاً بصف'));
      await step('دمجُ النسخة نفسِها', file, 'merge', (m, w) => assert.deepEqual(m, E1.rows, w + ': كما كانت — بلا تكرار'));
      await step('استبدالٌ بالثانية', file2, 'replace', (m, w) => assert.deepEqual(m, E2.rows, w + ': ما تحمله الثانية وحدها — لا بقيّةَ من الأولى'));
      /* الدمجُ في الإدارة لا يطبّق مجالَ تنبيهات النسخة أصلاً (قاعدةٌ قائمة قبل د6 — 019d rsSelectMerge: «المجالاتُ الموجودة تبقى كما هي»):
         تنبيهاتُ الإدارة تبقى كما كانت حرفاً — لا تُضاف تنبيهاتُ النسخة ولا تتكرّر ولا تنقص */
      await step('دمجُ الأولى فوق الثانية', file, 'merge', (m, w) => assert.deepEqual(m, E2.rows, w + ': تنبيهاتُ الإدارة كما كانت (لا إضافةَ ولا تكرارَ ولا نقص)'));
      if (route === '/api/backup/import') {
        /* تنبيهاتُ إدارةٍ أخرى لا تُقرأ: تعديلُها بين الفحص والاعتماد لا يوقف الاعتمادَ ويبقى كما عُدِّل */
        const go = async (Q) => { assert.equal((await Q.begin()).status, 200); for (let i = 0; i < Q.parts.length; i++) assert.equal((await Q.part(i)).status, 200); for (let i = 0; i < Q.sliceCount; i++) assert.equal((await Q.sliceStep(i)).status, 200); const ins = await Q.inspect(); assert.equal(ins.status, 200, JSON.stringify(ins.j).slice(0, 300)); return ins; };
        const P = protocol(T, T.su, file, { scope: SCOPE }), ins = await go(P);
        T.DB.exec("UPDATE notification_messages SET title='TEST_ONLY · عُدِّل في إدارةٍ أخرى' WHERE scope='d:" + A + "'");
        const edited = nfRows(T, false);
        assert.equal((await P.commit(ins.j.inspection.base)).status, 200, 'تعديلُ تنبيهات إدارةٍ أخرى لا يوقف الاعتماد');
        assert.deepEqual(nfRows(T, false), edited, 'وتبقى كما عُدِّلت — لم تُعَد كتابتُها');
        /* وتغيّرُ نسخة التنبيهات بين الفحص والاعتماد ⇒ تعارض ولا يتغيّر شيء */
        const Q = protocol(T, T.su, file2, { scope: SCOPE }), ins2 = await go(Q);
        T.DB.exec("UPDATE revs SET rev=rev+1 WHERE k='bassam_notifications_domain_v1'");
        const before = snapshot(T.DB), bad = await Q.commit(ins2.j.inspection.base);
        assert.equal(bad.status, 409, JSON.stringify(bad.j).slice(0, 300));
        assert.deepEqual(changed(snapshot(T.DB), before).filter((t) => t !== 'revs'), [], 'لم يتغيّر شيء');
      }
    } finally { await T.close(); }
  }
});

test('(١٣) الصور: غيرُ المذكورة لا تُكتب وتُعدّ · فحوصُ مسار الرفع القائم نفسُها (الحكمُ واحدٌ على البايتات نفسِها) · الأكبرُ من الحد مرفوض · وفشلُ الاستيراد لا يترك صورة', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target({ IMG_R2: null }), ids = Object.keys(file.idbImages), SCOPE2 = SCOPE;
  try {
    /* (أ) صورةٌ في الملف لا يذكرها أيُّ سجل: لا تُكتب، وتُذكر في الملخّص */
    const extra = { ...file, idbImages: { ...file.idbImages, img_testonly_unref: file.idbImages[ids[0]] } }, a = await protocol(T, T.su, extra, { scope: SCOPE2 }).run();
    assert.equal(a.commit.status, 200, JSON.stringify((a.commit || a.inspect).j).slice(0, 300));
    assert.deepEqual(a.inspect.j.inspection.summary.notTransferred.filter((x) => x.why === 'image-unreferenced').map((x) => x.k), ['img_testonly_unref']);
    assert.equal(a.inspect.j.inspection.summary.imagesNew, 2); assert.equal(T.DB.q("SELECT COUNT(*) n FROM imgs WHERE k='img_testonly_unref'")[0].n, 0, 'غيرُ المذكورة لم تُكتب'); assert.equal(T.DB.q("SELECT COUNT(*) n FROM imgown WHERE img='img_testonly_unref'")[0].n, 0);
    assert.equal(a.inspect.j.inspection.summary.notTransferred.filter((x) => x.why === 'grants')[0].n, 1, 'المنحُ القديمة تُذكر بعددها');
    /* (ب) الحكمُ على البايتات هو حكمُ مسار الرفع القائم PUT /api/img — الدالتان نفساهما (imgTypeOk · imgPartOk · IMG_TOTAL_MAX): كلُّ حالةٍ تُرسل للمسارين وتُقارن */
    const put = async (id, body) => (await T.lab.W.default.fetch(new Request('https://lab.local/api/img/' + id, { method: 'PUT', headers: { cookie: T.su.ck, origin: 'https://lab.local', 'Content-Type': 'text/plain' }, body }), T.lab.env, { waitUntil() {}, passThroughOnException() {} })).status;
    const cases = { 'ليست صورة (نص)': 'TEST_ONLY not an image', 'نوعٌ غيرُ صورة': 'data:text/html;base64,VEVTVF9PTkxZ', 'صورةٌ بلا base64': 'data:image/png,<b>TEST_ONLY</b>', 'محارفُ خارج base64': 'data:image/png;base64,VEVTV<script>', 'ادعاءُ png ببايتات jpeg': 'data:image/png;base64,/9j/4AAQSkZJRgABAQ==', 'صورةٌ سليمة': 'data:image/png;base64,VEVTVF9PTkxZ' };
    let n = 0;
    for (const [name, body] of Object.entries(cases)) {
      const id = 'img_testonly_chk' + (++n), up = await put(id, body);
      const P = protocol(T, T.su, { ...file, idbImages: { [id]: body } }, { scope: SCOPE2 }); await P.build();
      assert.equal((await P.begin()).status, 200); const at = P.parts.findIndex((x) => x.k === id), r = await P.part(at);
      assert.equal(r.status === 200, up === 200, name + ': الاستيراد ' + r.status + ' ومسارُ الرفع ' + up + ' — الحكمُ واحد');
      if (r.status !== 200) { assert.equal(r.j.err, 'import-part'); assert.equal(staged(T.DB), 0, name + ': المؤقتُ نُظّف'); } else await P.cancel();
    }
    /* (ب) الحجم: فوق سقف الصورة (IMG_TOTAL_MAX = 24MB) مرفوضٌ عند البدء باسم الصورة */
    const big = await protocol(T, T.su, file, { scope: SCOPE2 }).post({ op: 'begin', scope: SCOPE2, mode: 'replace', n: 100, f: 1, images: { img_testonly_big: 24 * 1024 * 1024 + 1 } });
    assert.equal(big.status, 400); assert.equal(big.j.err, 'import-shape'); assert.equal(big.j.details.k, 'img_testonly_big');
    /* (ج) فشلٌ بعد إيداع الصور: لا صورةَ ولا ملكيةَ ولا مرجعَ يبقى — (اعتمادٌ يفشل ثم إلغاء) */
    const state = { imgs: T.DB.q('SELECT COUNT(*) n FROM imgs')[0].n, own: T.DB.q('SELECT COUNT(*) n FROM imgown')[0].n, ref: T.DB.q('SELECT COUNT(*) n FROM imgref')[0].n };
    const fresh = { ...file, idbImages: Object.fromEntries(ids.map((id, i) => ['img_testonly_new' + i, file.idbImages[id]])), data: { ...file.data, bassam_plan_v1: file.data.bassam_plan_v1.replace(new RegExp(ids[0], 'g'), 'img_testonly_new0').replace(new RegExp(ids[1], 'g'), 'img_testonly_new1') } };
    const P = protocol(T, T.su, fresh, { scope: SCOPE2 }); await P.begin(); for (let i = 0; i < P.parts.length; i++) assert.equal((await P.part(i)).status, 200); for (let i = 0; i < P.sliceCount; i++) assert.equal((await P.sliceStep(i)).status, 200);
    const ins = await P.inspect(); assert.equal(ins.status, 200, JSON.stringify(ins.j).slice(0, 200)); assert.equal(ins.j.inspection.summary.imagesNew, 2);
    T.DB.failIf = (sql) => /INSERT INTO restore_operations/.test(sql);
    assert.ok((await P.commit(ins.j.inspection.base)).status >= 500); T.DB.failIf = null;
    await P.cancel();
    assert.deepEqual({ imgs: T.DB.q('SELECT COUNT(*) n FROM imgs')[0].n, own: T.DB.q('SELECT COUNT(*) n FROM imgown')[0].n, ref: T.DB.q('SELECT COUNT(*) n FROM imgref')[0].n }, state, 'فشلُ الاستيراد لم يترك صورةً ولا ملكيةً ولا مرجعاً'); assert.equal(staged(T.DB), 0);
  } finally { await T.close(); }
});

test('(١٤) صورةٌ يذكرها سجلٌّ في إدارةٍ أخرى لا تزول باستيرادٍ في هذه الإدارة — عند الاعتماد وبعد الكنس', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target({ IMG_R2: null }), ids = Object.keys(file.idbImages), KA = 'bsdept:' + A + ':bassam_plan_v1';
  try {
    assert.equal((await protocol(T, T.su, file, { scope: SCOPE }).run()).commit.status, 200);
    /* إدارةٌ أخرى تذكر الصورةَ نفسَها في مخططها (مرجعٌ مسجَّل في فهرس المراجع) */
    const other = await protocol(T, T.su, { ...file, perms: undefined, data: { bassam_plan_v1: file.data.bassam_plan_v1 } }, { scope: { kind: 'dept', departmentId: A } }).run();
    assert.equal(other.commit && other.commit.status, 200, 'الإدارةُ الأخرى تحمل المخططَ نفسَه: ' + JSON.stringify((other.commit || other.inspect).j).slice(0, 300));
    assert.ok(T.DB.q('SELECT COUNT(*) n FROM imgref WHERE img=?1 AND k=?2', ids[0], KA)[0].n > 0, 'مرجعُ الإدارة الأخرى مسجَّل');
    /* استيرادٌ في B بنسخةٍ لا تذكر الصورة */
    const plan = JSON.parse(file.data.bassam_plan_v1); plan.floors.forEach((f) => { delete f.iid; }); Object.values(plan.months).forEach((m) => (m.d || []).forEach((f) => { delete f.iid; }));
    const without = { ...file, idbImages: {}, data: { ...file.data, bassam_plan_v1: JSON.stringify(plan) } };
    assert.equal((await protocol(T, T.su, without, { scope: SCOPE }).run()).commit.status, 200);
    const alive = async (when) => { for (const id of ids) { const own = T.DB.q('SELECT st FROM imgown WHERE img=?1', id)[0]; assert.ok(own && own.st !== 'dead', when + ': ' + id + ' ليست محكومةً بالحذف (' + (own && own.st) + ')'); assert.ok(T.DB.q('SELECT COUNT(*) n FROM imgs WHERE k=?1', id)[0].n > 0, when + ': جسمُ ' + id + ' باقٍ'); const g = await readImage(T, T.su, id); assert.equal(g.status, 200, when + ': تُقرأ'); assert.equal(g.t, file.idbImages[id]); } };
    await alive('عند الاعتماد');
    /* الكنس نفسُه (imgSweep من العامل المبنيّ) بساعةٍ متقدّمة تتجاوز كلَّ مهلة — وصورةُ ضبطٍ لا يذكرها أحدٌ تثبت أنه يحذف فعلاً */
    const put = await T.lab.W.default.fetch(new Request('https://lab.local/api/img/img_testonly_ctl', { method: 'PUT', headers: { cookie: T.su.ck, origin: 'https://lab.local', 'Content-Type': 'text/plain' }, body: file.idbImages[ids[0]] }), T.lab.env, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(put.status, 200);
    const { imgSweep } = await internals(['imgSweep']);
    for (let i = 1; i <= 8; i++) await imgSweep(T.lab.env, Date.now() + i * 60 * 86400e3, 500, 500);
    assert.equal(T.DB.q("SELECT COUNT(*) n FROM imgs WHERE k='img_testonly_ctl'")[0].n, 0, 'الكنسُ يعمل: صورةُ الضبط غيرُ المذكورة حُذفت');
    await alive('بعد الكنس');
  } finally { await T.close(); }
});

test('(١٥) لا تراجعَ عمّا كان يُستعاد قبل د6: نسخةٌ شاملة (ونسخةُ إدارةٍ بالدمج) يقبلها المسارُ القديم بحجمها تُقبل على المسار الجديد — والرفضُ المبكر لما فوق حدّ الطلب القديم وحده · ورسالةُ السقف بحجمه وحدِّه', { timeout: 300000, ...need }, async () => {
  const T = await target();
  try {
    assert.equal((await protocol(T, T.su, await oldFile({ small: true }), { scope: SCOPE }).run()).commit.status, 200);
    /* نسخةٌ شاملة من القاعدة نفسِها مكبَّرةً بمفتاحٍ نصيّ إلى ≈5M حرف (دون 8MB): كانت تُقبل طلباً واحداً — تُقبل الآن وتُعتمد */
    const full = { app: 'bassam-crowd', version: 3, kind: 'full', exportedAt: '2026-11-21T10:00:00.000Z', data: {}, preImport: false };
    for (const r of T.DB.q("SELECT k, group_concat(v,'') v FROM (SELECT k,v FROM kv ORDER BY k,seq) GROUP BY k")) full.data[r.k] = r.v;
    const ops = await readOps(T, T.su, B, ['bassam_plan_v1', 'bassam_employees_v1', 'bassam_rounds_arc_v1']);
    for (const [k, v] of Object.entries(ops)) if (v != null && k !== 'bassam_rounds_arc_v1') full.data['bsdept:' + B + ':' + k] = JSON.stringify(v);
    const rounds = {}; for (let i = 0; i < 600; i++) rounds['1448-6-' + (1 + (i % 28)) + '-x' + i] = Object.values(ops.bassam_rounds_arc_v1)[0];
    full.data['bsdept:' + B + ':bassam_rounds_v1'] = JSON.stringify(rounds);
    for (const k of Object.keys(full.data)) if (/^bassam_(notifications_domain|notif_)/.test(k) || /:bassam_(first_boot|last_export|grants)_v1$/.test(k)) delete full.data[k];
    /* V7 · د7: طلبٌ واحد كما كان (slice:false) — والمسارُ المقسوم للنسخة نفسِها يُعتمد كذلك بعده */
    const P = protocol(T, T.su, full, { scope: { kind: 'full' }, slice: false }); await P.build();
    assert.ok(P.text.length > 3e6 && P.text.length < 8e6, 'النسخةُ الشاملة ≈' + Math.round(P.text.length / 1e5) / 10 + 'M حرف (فوق تقدير الكلفة ودون حدّ الطلب القديم)');
    const out = await P.run();
    assert.equal(out.begin.status, 200, 'لا رفضَ مبكراً لما كان يقبله المسارُ القديم: ' + JSON.stringify(out.begin.j));
    assert.equal(out.commit && out.commit.status, 200, JSON.stringify((out.commit || out.inspect).j).slice(0, 300));
    { const P2 = protocol(T, T.su, full, { scope: { kind: 'full' } }), o2 = await P2.run(); assert.ok(P2.sliceCount > 0, 'د7: الاستبدالُ الشامل نفسُه بدفعات'); assert.equal(o2.commit && o2.commit.status, 200, JSON.stringify((o2.commit || o2.inspect || o2.begin).j).slice(0, 300)); }
    /* وفوق 8MB (لم يكن المسارُ القديم يقبلها أصلاً: 413) تُرفض مبكراً بسببها */
    const over = await protocol(T, T.su, full, { scope: { kind: 'full' } }).post({ op: 'begin', scope: { kind: 'full' }, mode: 'replace', n: 9e6, f: 10, keys: { bassam_depts_v1: 0 } });
    assert.equal(over.status, 413); assert.equal(over.j.err, 'import-too-heavy'); assert.equal(over.j.details.kind, 'full');
    /* سقفُ الاستيراد: الرسالةُ تحمل الحجمَ والحد */
    const huge = await protocol(T, T.su, full, { scope: SCOPE }).post({ op: 'begin', scope: SCOPE, mode: 'replace', n: 2e6, f: 3, images: Object.fromEntries(Array.from({ length: 11 }, (_, i) => ['img_testonly_h' + i, 24 * 1024 * 1024])) });
    assert.equal(huge.status, 413); assert.equal(huge.j.err, 'import-too-large'); assert.equal(huge.j.details.limit, 256e6); assert.ok(huge.j.details.chars > 256e6);
  } finally { await T.close(); }
});

test('(٥) حسابٌ بلا صلاحية يُرفض في كل جزء ولو بطلبٍ مصنوع يدوياً — ولا يمسّ مؤقتَ غيره', { timeout: 300000, ...need }, async (t) => {
  const file = await oldFile({ small: true }), T = await target();
  try {
    const emp = await T.login(LAB.empA, LAB.pw), mgrA = await T.login(LAB.mgrA, LAB.pw), base = snapshot(T.DB);
    for (const [name, who] of [['موظف', emp], ['مدير إدارةٍ أخرى', mgrA]]) {
      /* الحكمُ هو حكمُ الاستعادة اليوم: جردُ الاستعادة القائم (GET /api/backup/restore) يرفضه كذلك */
      const P = protocol(T, who, file, { scope: SCOPE }), inv = await T.call('/api/backup/restore?kind=dept&departments=%5B%5D&dept=' + B, { ck: who.ck });
      assert.equal(inv.status, 403, name + ': جردُ الاستعادة مرفوض اليوم');
      for (const [step, r] of [['begin', await P.begin()], ['begin dry', await P.begin({ dry: true })]]) { assert.equal(r.status, 403, name + ' ' + step); assert.equal(r.j.err, 'restore-policy'); }
      assert.equal((await protocol(T, who, file, { scope: { kind: 'full' } }).begin()).status, 403, name + ': النسخةُ الشاملة لمدير المنصة وحده');
      assert.equal(staged(T.DB), 0, name + ': لم يُفتح مؤقت');
      /* طلبٌ مصنوع يدوياً على مؤقتٍ فتحه مديرُ المنصة (اسمُ الطلب معروفٌ للمهاجم افتراضاً) */
      const S = protocol(T, T.su, file, { scope: SCOPE });
      assert.equal((await S.begin()).status, 200); assert.equal((await S.part(0)).status, 200);
      const rows = staged(T.DB), forged = protocol(T, who, file, { scope: SCOPE, requestId: S.id });
      for (let i = 0; i < forged.parts.length; i++) { const r = await forged.part(i); assert.ok(r.status === 404 || r.status === 403, name + ': جزء ' + i + ' مرفوض (' + r.status + ')'); }
      for (const [step, r] of [['inspect', await forged.inspect()], ['commit', await forged.commit((await S.inventory()).base)], ['cancel', await forged.cancel()]]) assert.ok(r.status === 404 || r.status === 403, name + ' ' + step + ' مرفوض (' + r.status + ')');
      assert.equal(staged(T.DB), rows, name + ': مؤقتُ المالك لم يُمسّ (لا حذفَ ولا إضافة)');
      assert.equal((await S.cancel()).status, 200);
    }
    /* بلا جلسة · وطلبٌ من أصلٍ آخر */
    const anon = await T.call('/api/backup/import', { body: { op: 'begin', requestId: 'TEST_ONLY_anon_1', scope: SCOPE, n: 10, f: 1 } });
    assert.ok(anon.status === 401 || anon.status === 403, 'بلا جلسة: ' + anon.status);
    /* مديرُ الإدارة الهدف: بلا مفتاح الاستعادة مرفوضٌ كما اليوم (حكمُ البدء = حكمُ جرد الاستعادة القائم) */
    const mgrB = await T.login(LAB.mgrB, LAB.pw), inventory = () => T.call('/api/backup/restore?kind=dept&departments=%5B%5D&dept=' + B, { ck: mgrB.ck });
    let M = protocol(T, mgrB, file, { scope: SCOPE }), began = await M.begin(), invB = await inventory();
    t.diagnostic('مديرُ الإدارة الهدف بلا المفتاح: البدء ' + began.status + ' · جردُ الاستعادة ' + invB.status);
    /* V7 · د6 (QA ٦ — قرارُ المالك): مديرُ الإدارة يحمل الاستعادةَ في إدارته بلا منح — كان 403 */
    assert.equal(began.status, 200); assert.equal(invB.status, 200); assert.equal((await M.cancel()).status, 200);
    assert.deepEqual(changed(snapshot(T.DB), base), [], 'لم يتغيّر شيء'); assert.equal(audits(T), 0);
    /* وبالمفتاح الممنوح صراحةً (backup.restore) يبدأ ويودِع — ثم يُنزع المفتاح في منتصف الاستيراد فيُرفض الجزءُ التالي ويُنظَّف مؤقتُه */
    const GK = 'bsdept:' + B + ':bassam_grants_v1', grant = (on) => T.DB.batch([...T.lab.W.kvPutStmts(T.lab.env, 'kv', GK, JSON.stringify({ v: 1, emp: on ? { ['mgr:' + B]: { plus: ['backup.restore'], minus: [] } } : { ['mgr:' + B]: { plus: [], minus: ['backup.restore'] } } })),   /* د6 QA ٦: النزعُ إسقاطٌ صريح (minus) — بلا منحٍ يحمله مديرُ الإدارة */
      T.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(GK)]);
    await grant(true);
    M = protocol(T, mgrB, file, { scope: SCOPE, reason: 'TEST_ONLY استيراد مدير الإدارة' }); began = await M.begin(); invB = await inventory();
    assert.equal(invB.status, 200, 'بالمفتاح: جردُ الاستعادة مقبول'); assert.equal(began.status, 200, 'والبدءُ كذلك: ' + JSON.stringify(began.j));
    assert.equal((await M.part(0)).status, 200);
    await grant(false);
    const cut = await M.part(1);
    assert.equal(cut.status, 403, 'بعد نزع المفتاح: ' + JSON.stringify(cut.j)); assert.equal(cut.j.err, 'restore-policy'); assert.equal(staged(T.DB), 0, 'ومؤقتُه نُظّف');
    assert.equal(audits(T), 0);
    /* وبالمفتاح من أوله إلى آخره: حكمُ الفحص هو حكمُ مسار الاستعادة القائم نفسُه حرفاً — النسخةُ نفسُها (بعد حذف ما لا يُنقل) على /api/backup/restore
       تُرفض لمدير الإدارة بالسبب نفسِه (سياسةُ الاستعادة القائمة لغير مدير المنصة: فتراتٌ مقفلة · شريحةُ الصلاحيات)، فيُرفض الاستيرادُ بمثله ولا يتغيّر شيء */
    await grant(true);
    const state = snapshot(T.DB);
    const clean = { ...file, data: Object.fromEntries(Object.entries(file.data).filter(([k]) => !(k in NOT_TRANSFERRED))), idbImages: {} };
    const oldRoute = await T.call('/api/backup/restore', { ck: mgrB.ck, body: { version: 1, uid: mgrB.uid, requestId: 'TEST_ONLY_old_route_1', scope: SCOPE, mode: 'replace', reason: 'TEST_ONLY استيراد مدير الإدارة', base: (await inventory()).j.base, backup: clean, legacyConsent: false, phase: 'inspect' } });
    /* V7 · د6 (QA): (دمج noreason × mgrimport) كان هنا «بلا سبب يُرفض مديرُ الإدارة (why:'reason')» — نسخه قرارُ المالك (لا سبب في أي مكان)؛ الحكمُ بلا سبب يُفحص أدناه بعد الاعتماد ويساوي حكمَه بالسبب */
    const run = await protocol(T, mgrB, file, { scope: SCOPE, reason: 'TEST_ONLY استيراد مدير الإدارة' }).run();
    assert.ok(run.inspect, 'وصل الفحص: ' + JSON.stringify((run.part || run.begin).j));
    assert.equal(run.inspect.status, oldRoute.status, 'حكمُ الاستيراد = حكمُ الاستعادة القائم'); assert.equal(run.inspect.j.err, oldRoute.j.err);
    assert.deepEqual(Object.keys((run.inspect.j.details || {}).denied || {}).sort(), Object.keys((oldRoute.j.details || {}).denied || {}).sort(), 'والمفاتيحُ المرفوضة هي هي');
    t.diagnostic('مديرُ الإدارة بالمفتاح: الفحص ' + run.inspect.status + ' ' + run.inspect.j.err + ' (كالمسار القديم)');
    /* V7 · د6 (QA ٦ — قرارُ المالك): الحكمان واحدٌ وهو القبول الآن (الفتراتُ المقفلة في نسخته وشريحةُ موظفيه له) — فيُعتمد الاستيراد ويُسجَّل مرةً واحدة */
    assert.equal(run.inspect.status, 200, JSON.stringify(run.inspect.j).slice(0, 300)); assert.equal(run.commit.status, 200); assert.equal(staged(T.DB), 0); assert.equal(audits(T), 1); void state;
    /* V7 · د6 (QA) · البند ١: بلا سبب حكمُ مدير الإدارة هو حكمُه بالسبب نفسُه (كان 400 restore-reason) — السببُ لم يعد شرطاً لأحد */
    const noReason = await protocol(T, mgrB, file, { scope: SCOPE, reason: '' }).run();
    assert.ok(noReason.inspect, 'بلا سبب وصل الفحص');
    assert.equal(noReason.inspect.status, run.inspect.status); assert.equal(noReason.inspect.j.err, run.inspect.j.err); assert.notEqual(noReason.inspect.j.err, 'restore-reason'); assert.equal(staged(T.DB), 0);
  } finally { await T.close(); }
});

test('(٦) التشخيص: الشكلُ القديم كما هو مرفوضٌ في المسار القديم بـ400 backup-data-shape · والحدُّ 8MB قائمٌ على المسارين', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target();
  try {
    const inv = (await T.call('/api/backup/restore?kind=dept&departments=%5B%5D&dept=' + B, { ck: T.su.ck })).j;
    const old = (f) => T.call('/api/backup/restore', { ck: T.su.ck, body: { version: 1, uid: T.su.uid, requestId: 'TEST_ONLY_old_' + Math.random().toString(36).slice(2, 12), scope: SCOPE, mode: 'replace', reason: 'TEST_ONLY', base: inv.base, backup: f, legacyConsent: false, phase: 'inspect' } });
    const a = await old(file);
    assert.equal(a.status, 400); assert.equal(a.j.err, 'backup-data-shape', 'القيمُ null في data هي سببُ الرفض');
    const noNull = { ...file, data: Object.fromEntries(Object.entries(file.data).filter(([, v]) => v !== null)) }, b = await old(noNull);
    assert.equal(b.status, 400); assert.match(b.j.err, /^(backup-unknown-resource|restore-incomplete-manifest)$/, 'ثم مفاتيحُ لا مقابلَ لها: ' + b.j.err);
    /* الحد: طلبٌ فوق 8MB يُرفض 413 على المسارين (لم يُرفع) */
    const big = 'x'.repeat(8 * 1024 * 1024 + 10);
    for (const p of ['/api/backup/restore', '/api/backup/import']) { const r = await T.call(p, { ck: T.su.ck, body: JSON.stringify({ requestId: 'TEST_ONLY_big_1', pad: big }) }); assert.equal(r.status, 413, p + ' ⇒ 413'); }
    /* جزءٌ أكبر من حجم الجزء المعلن مرفوضٌ ولو كان دون حدّ الطلب */
    const P = protocol(T, T.su, file, { scope: SCOPE }); await P.begin();
    const fat = await P.post({ op: 'part', items: [{ k: '', s: 0, t: 'y'.repeat(SEG.f + 1) }] });
    assert.equal(fat.status, 400); assert.equal(fat.j.err, 'import-part'); assert.equal(staged(T.DB), 0);
    /* وبيانٌ يتجاوز سقف الاستيراد */
    const huge = await P.post({ op: 'begin', scope: SCOPE, n: 300e6, f: 300 });
    assert.equal(huge.status, 413); assert.equal(huge.j.err, 'import-too-large');
  } finally { await T.close(); }
});

test('(٧) النسخةُ الشاملة تمرّ بالمسار نفسِه (kind:full — لمدير المنصة وحده) · واستيرادُ الموظفين لم يُمسّ', { timeout: 300000, ...need }, async (t) => {
  const T = await target();
  try {
    /* نسخةٌ شاملة حديثة من القاعدة نفسِها (المجالاتُ كما يصدّرها الخادم) تُعاد استيرادُها على أجزاء */
    const file = await oldFile({ small: true });
    const first = await protocol(T, T.su, file, { scope: SCOPE }).run(); assert.equal(first.commit.status, 200);
    const full = { app: 'bassam-crowd', version: 3, kind: 'full', exportedAt: '2026-11-21T10:00:00.000Z', data: {}, preImport: false };
    for (const r of T.DB.q("SELECT k, group_concat(v,'') v FROM (SELECT k,v FROM kv ORDER BY k,seq) GROUP BY k")) full.data[r.k] = r.v;
    const ops = await readOps(T, T.su, B, ['bassam_plan_v1', 'bassam_employees_v1']);
    full.data['bsdept:' + B + ':bassam_plan_v1'] = JSON.stringify(ops.bassam_plan_v1); full.data['bsdept:' + B + ':bassam_employees_v1'] = JSON.stringify(ops.bassam_employees_v1);
    for (const k of Object.keys(full.data)) if (/^bassam_(notifications_domain|notif_)/.test(k) || /:bassam_(first_boot|last_export)_v1$/.test(k)) delete full.data[k];
    const before = audits(T), P = protocol(T, T.su, full, { scope: { kind: 'full' } }), out = await P.run();
    assert.equal(out.begin.status, 200, JSON.stringify(out.begin.j));
    assert.ok(out.inspect, 'وصل الفحص');
    t.diagnostic('النسخة الشاملة: الفحص ' + out.inspect.status + ' ' + JSON.stringify(out.inspect.j.err || out.inspect.j.inspection.counts));
    if (out.inspect.status === 200) { assert.equal(out.commit.status, 200, JSON.stringify(out.commit.j).slice(0, 300)); assert.equal(out.commit.j.scope.kind, 'full'); assert.equal(audits(T), before + 1); }
    else assert.match(String(out.inspect.j.err), /^(backup-|restore-)/, 'رفضٌ بسببٍ من مسار الاستعادة القائم نفسِه: ' + JSON.stringify(out.inspect.j).slice(0, 200));
    assert.equal(staged(T.DB), 0);
    /* استيرادُ الموظفين: حدُّه ومساره كما هما */
    const big = 'x'.repeat(8 * 1024 * 1024 + 10), tr = await T.call('/api/employees/transition', { ck: T.su.ck, body: JSON.stringify({ pad: big }) });
    assert.equal(tr.status, 413, 'حدُّ /api/employees/transition 8MB كما كان');
    const tr2 = await T.call('/api/employees/transition', { ck: T.su.ck, body: {} });
    assert.ok(tr2.status >= 400 && tr2.status < 500, 'ومسارُه يردّ برفضه المعتاد لجسمٍ فارغ: ' + tr2.status);
  } finally { await T.close(); }
});

/* V7 · د6 (schemafix): الملفُ الحقيقي من Production رُفض كلُّه (operations-unknown-field-nNow · capNow · operations-scalar-type في pc · share/shareName).
   الآن: «القراءةُ بالسعة» (pc بالكائن) وسطرُ التقرير اليومي في سجلّ التسكين (rm · src) يُنقلان كما هما · الحقولُ العابرة الفارغة تُسقط وتُذكر بعددها ·
   وما يحمل منها قيمةً لا يُسقط بصمت (يُذكر «لا مقابل له») · والاعتمادُ ذرّيٌّ كما كان — بالمسارين (دفعات · طلبٌ واحد) */
test('(١٨) الأشكالُ كما يكتبها Production: pc بالكائن في الجولات والأرشيف · rm/src · الحقولُ العابرة تُذكر ولا تُرفض بها النسخة — بالمسارين', need, async () => {
  const file = await oldFile({ small: true }), A = await target(), Z = await target(), want = fieldDrops(file);
  try {
    const rounds = JSON.parse(file.data.bassam_rounds_v1), plan = JSON.parse(file.data.bassam_plan_v1);
    assert.ok(dayKeys(rounds).map((k) => rounds[k]).some((d) => d.d.some((f) => f.zones.some((z) => z.pc && z.pc.fajr && typeof z.pc.fajr === 'object'))), 'الملفُ يحمل القراءةَ بالسعة');
    assert.ok(plan.floors.every((f) => f.zones.every((z) => 'share' in z && 'shareName' in z && 'nNow' in z && 'capNow' in z)), 'والحقولَ العابرة على كل مصلى في المخطط');
    for (const [T, opt, tag] of [[A, { scope: SCOPE, slice: false }, 'طلبٌ واحد'], [Z, { scope: SCOPE, slice: 1000, sliceTarget: 5000 }, 'دفعات']]) {
      const base = snapshot(T.DB), P = protocol(T, T.su, file, opt), out = { begin: await P.begin() };
      assert.equal(out.begin.status, 200, tag);
      for (let i = 0; i < P.parts.length; i++) assert.equal((await P.part(i)).status, 200, tag + ': جزء ' + i);
      for (let i = 0; i < P.sliceCount; i++) assert.equal((await P.sliceStep(i)).status, 200, tag + ': دفعة ' + i);
      if (opt.slice) assert.ok(P.sliceCount >= 3, tag + ': قُسمت (' + P.sliceCount + ')');
      out.inspect = await P.inspect();
      assert.equal(out.inspect.status, 200, tag + ': ' + JSON.stringify(out.inspect.j).slice(0, 400));
      assert.deepEqual(fieldDropsOf(out.inspect.j.inspection.summary.notTransferred), want, tag + ': ما لن يُنقل من الحقول بعدده — قبل التأكيد');
      assert.deepEqual(changed(snapshot(T.DB), base), [], tag + ': الفحصُ لا يكتب شيئاً');
      const done = await P.commit(out.inspect.j.inspection.base);
      assert.equal(done.status, 200, tag + ': ' + JSON.stringify(done.j).slice(0, 400));
      if (done.j.summary) assert.deepEqual(fieldDropsOf(done.j.summary.notTransferred), want, tag + ': وفي ملخّص النجاح');
      await compare(T, T.su, file);
      assert.ok(T.DB.q('SELECT COUNT(*) n FROM ops_zone_prayer_capacity')[0].n > 0, tag + ': القراءاتُ بالسعة في جدولها');
      assert.ok(T.DB.q("SELECT COUNT(*) n FROM ops_round_day_move WHERE f_src_text='dr'")[0].n > 0, tag + ': سطرُ التقرير في سجلّ التسكين');
    }
    assert.deepEqual(rowsOf(Z), rowsOf(A), 'المساران ينتهيان إلى الصفوف نفسِها');
  } finally { await A.close(); await Z.close(); }
});

/* V7 · د6 (remap): الملفُ الحقيقي رُفض كلُّه في التنبيهات (400 notification-cutover-shape): كلُّ تنبيهاته تحمل معرّفَ إدارة Production (dept) والوحدةُ الهدف
   بمعرّفٍ آخر — وهي الحالةُ الطبيعية على منصة الشركة · ونوعُ pm_tpl (فئة perm) حُذف · والمهامُ تحمل مفتاحَ مدير المصدر «mgr:<المعرّف>».
   الآن: إشاراتُ إدارة النسخة تُربط بالوحدة الهدف في مواضعها المعدودة بعددٍ مضبوط · وما يخصّ بنداً واحداً يُسقطه وحده ويُذكر — بالمسارين (طلبٌ واحد · دفعات
   تُقسم فيها المهامُ أيضاً) وبالمسار القديم /api/backup/restore · ثم: التنبيهاتُ في خلاصة مدير الوحدة وموظفها الحقيقية · المهامُ تُفتح (مهامّي للموظف ·
   قراءةُ الصفحة للمدير) وتشير إلى الوحدة · لا صفَّ في الوحدة يحمل المعرّفَ المصدر · وإدارةٌ أخرى لم تُمسّ بايتاً */
test('(١٩) معرّفُ الإدارة المصدر غيرُ معرّف الوحدة: يُعاد ربطه بعدده · pm_tpl والتنبيهُ الأجنبي يُسقطان ويُذكران · التنبيهاتُ لمستخدمي الوحدة والمهامُ تُفتح — بالمسارات الثلاثة', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true, images: false }), R = remapOf(file), nf = JSON.parse(file.data.bassam_notif_v1);
  /* سقفُ الوحدة في النسخة يفتح المهام، وللموظف عرضُها — ليقرأ «مهامّي» وتنبيهَ المهمة المسنَدة إليه */
  file.perms.cap.push('tasks'); file.perms.emps.tst_demo_e11.tasks = ['view']; file.perms.emps['mgr:' + SRC_DEPT].tasks = ['view'];   /* صحيفةُ مدير المصدر تصير صحيفةَ مدير الوحدة */
  assert.notEqual(R.from, B); assert.ok(nf.items.every((x) => x.dept && x.dept !== B), 'كلُّ تنبيهٍ يحمل معرّفَ إدارةٍ غيرَ الوحدة الهدف');
  assert.equal(nf.items.filter((x) => x.type === 'pm_tpl' && x.k === 'perm').length, 4);
  assert.ok(file.data.bassam_tasks_v1.includes('"mgr:' + SRC_DEPT + '"'), 'والمهامُ تحمل مفتاحَ مدير المصدر');
  const notThere = (T) => { const hits = []; for (const { name } of T.DB.q("SELECT name FROM sqlite_master WHERE type='table'")) { if (['aud', 'audit', 'sec', 'restore_operations', 'restore_preimage', 'restore_snapshot_manifest'].includes(name)) continue; const n = T.DB.q('SELECT * FROM ' + name).filter((r) => JSON.stringify(r).includes(SRC_DEPT)).length; if (n) hits.push(name + ':' + n); } return hits; };
  const outside = (T) => { const o = {}; for (const { name } of T.DB.q("SELECT name FROM sqlite_master WHERE type='table'")) { const cols = T.DB.q('PRAGMA table_info(' + name + ')').map((c) => c.name), w = cols.includes('department_id') ? " WHERE department_id<>'" + B + "'" : cols.includes('message_scope') ? " WHERE message_scope<>'d:" + B + "'" : ['notification_messages', 'notification_targets', 'notification_dedup'].includes(name) ? " WHERE scope<>'d:" + B + "'" : name === 'kv' ? " WHERE k GLOB 'bsdept:" + A + ":*'" : null; if (w !== null) o[name] = T.DB.q('SELECT * FROM ' + name + w).map((r) => JSON.stringify(r)).sort(); } return o; };
  const routes = [['طلبٌ واحد', { slice: false }], ['دفعات', { slice: 1000, sliceTarget: 1500 }], ['/api/backup/restore', null]];
  const ends = [];
  for (const [tag, opt] of routes) {
    const T = await target();
    try {
      /* موظفٌ في الوحدة الهدف رمزُه رمزُ موظف النسخة (tst_demo_e11) — كما يربط المديرُ حساباتِ موظفيه بعد الاستيراد */
      const users = JSON.parse(T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq)")[0].v), empA = users.find((u) => u.id === 'TEST_ONLY_empA');
      users.push({ ...empA, id: 'TEST_ONLY_empB', un: '1200000102', name: 'TEST_ONLY موظف ب ١', deptId: B, ekey: 'tst_demo_e11' });
      await T.DB.batch([T.DB.prepare("DELETE FROM kv WHERE k='bassam_auth_users_v1'"), ...T.lab.W.kvPutStmts(T.lab.env, 'kv', 'bassam_auth_users_v1', JSON.stringify(users)), T.DB.prepare("UPDATE revs SET rev=rev+1 WHERE k='bassam_auth_users_v1'")]);
      const before = outside(T);
      let s, sumDone;
      if (opt) {
        const P = protocol(T, T.su, file, { scope: SCOPE, ...opt }), out = await P.run();
        assert.equal(out.commit && out.commit.status, 200, tag + ': ' + JSON.stringify((out.commit || out.inspect || out.part || out.begin).j).slice(0, 400));
        if (opt.slice) assert.ok(Object.keys(P.slices).some((k) => /^bassam_tasks_v1#/.test(k)), tag + ': المهامُ قُسمت دفعاتٍ أيضاً');
        s = out.inspect.j.inspection.summary; sumDone = out.commit.j.summary;
      } else {
        const strip = { ...file, data: Object.fromEntries(Object.entries(file.data).filter(([k]) => !(k in NOT_TRANSFERRED))), idbImages: {} };
        const inv = (await T.call('/api/backup/restore?kind=dept&departments=%5B%5D&dept=' + B, { ck: T.su.ck })).j, id = 'TEST_ONLY_remap_' + Math.random().toString(36).slice(2, 12);
        const body = { version: 1, uid: T.su.uid, requestId: id, scope: SCOPE, mode: 'replace', reason: 'TEST_ONLY د6 remap', backup: strip, legacyConsent: true };
        const ins = await T.call('/api/backup/restore', { ck: T.su.ck, body: { ...body, base: inv.base, phase: 'inspect' } });
        assert.equal(ins.status, 200, tag + ': ' + JSON.stringify(ins.j).slice(0, 400));
        const com = await T.call('/api/backup/restore', { ck: T.su.ck, body: { ...body, base: ins.j.inspection.base, phase: 'commit' } });
        assert.equal(com.status, 200, tag + ': ' + JSON.stringify(com.j).slice(0, 400));
        await readBack(T, B, wantOf(T, strip, B));   /* V7 · د6 (posfix): بعد الاستعادة يُقرأ كلُّ شيء ويطابق النسخة */
        s = ins.j.inspection.summary;
      }
      ends.push(rowsOf(T));   /* قبل أي دخول (الدخولُ يكتب تنبيهَ «جهاز جديد») */
      /* (أ) الملخّصُ قبل التأكيد: إعادةُ الربط بعددها المضبوط لكل مورد · الأجنبيُّ يُذكر ولا يُربط · لا موضعَ بقي فيه المعرّف · والتنبيهاتُ المُسقطة بعددها ونوعها */
      assert.deepEqual(s.remap, { from: SRC_DEPT, to: B, n: R.n, by: R.by, foreign: R.foreign, left: {} }, tag + ': إعادةُ الربط');
      assert.deepEqual(nfDropsOf(s.notTransferred), R.nfDrops, tag + ': التنبيهاتُ المُسقطة وحدها');
      if (sumDone) assert.deepEqual(sumDone.remap, s.remap, tag + ': وفي ملخّص النجاح');
      /* (ب) لا صفَّ في القاعدة يحمل المعرّفَ المصدر (السجلاتُ ولقطةُ ما قبل الاستيراد وإيصالُها خارج الفحص: تذكر ما جرى) */
      assert.deepEqual(notThere(T), [], tag + ': لا إشارةَ باقية إلى ' + SRC_DEPT);
      /* (ج) إدارةٌ أخرى وما خارج الوحدة لم يُمسّ بايتاً */
      assert.deepEqual(outside(T), before, tag + ': ما خارج الوحدة الهدف كما كان');
      /* (د) التنبيهات في الخلاصة الحقيقية: مديرُ الوحدة وموظفُها يريان تنبيهاتِ النسخة (لا pm_tpl ولا الأجنبي) · وعلامةُ قراءة مدير المصدر صارت علامتَه */
      /* معرّفُ الخلاصة مرجعٌ مرمَّز «nf:» + base64url([النطاق، المعرّف]) — النطاقُ نطاقُ الوحدة الهدف */
      const mid = (m) => { const [sc, id] = JSON.parse(Buffer.from(m.id.slice(3), 'base64url').toString()); assert.equal(sc, 'd:' + B, tag + ': نطاقُ ' + id); return id; };
      const kept = new Set(R.kept), byType = (t) => nf.items.filter((x) => kept.has(x.id) && x.type === t).map((x) => x.id).sort();
      const feed = async (un, uid) => { const who = await T.login(un, LAB.pw), r = await T.call('/api/notifications?uid=' + uid, { ck: who.ck }); assert.equal(r.status, 200, tag + ' ' + uid + ': ' + r.t.slice(0, 200)); return r.j.items; };
      const mgr = await feed(LAB.mgrB, 'TEST_ONLY_mgrB'), emp = await feed('1200000102', 'TEST_ONLY_empB'), ids = (L, t) => L.filter((m) => m.type === t).map(mid).sort();
      /* V7 · د7 (البند ٨): منشئُ تعميم الإدارة بعد إعادة الربط مديرُ الوحدة نفسُه (mgr:B) — فلا يُنبَّه بفعله؛ يراه موظفُها (أدناه) */
      assert.deepEqual(ids(mgr, 'bc_dept'), [], tag + ': مديرُ الوحدة لا يُنبَّه بتعميمٍ منشئُه هو'); assert.deepEqual(ids(mgr, 'emp_add'), byType('emp_add'), tag + ': ومفتاحُه في الأهداف');
      assert.deepEqual(ids(emp, 'bc_dept'), byType('bc_dept'), tag + ': موظفُ الوحدة — تعميمُ الإدارة'); assert.deepEqual(ids(emp, 'task_new'), byType('task_new'), tag + ': والمسنَدُ إليه باسمه');
      for (const L of [mgr, emp]) assert.equal(L.some((m) => m.type === 'pm_tpl' || mid(m) === 'TEST_ONLY_n5'), false, tag + ': لا pm_tpl ولا تنبيهَ الإدارة الأخرى');
      /* V7 · د7: العلامةُ والمنشئ يُقرآن من القاعدة (التعميمُ خارج خلاصة منشئه — البند ٨) */
      const st = (id) => T.DB.q("SELECT read_at FROM notification_user_state WHERE account_uid='TEST_ONLY_mgrB' AND message_scope=?1 AND message_id=?2", 'd:' + B, id)[0];
      assert.ok(st('TEST_ONLY_n0') && st('TEST_ONLY_n0').read_at > 0, tag + ': علامةُ قراءة مدير المصدر صارت علامةَ مدير الوحدة (مقروء)'); assert.ok(!st('TEST_ONLY_n6') || !st('TEST_ONLY_n6').read_at, tag + ': وغيرُه غيرُ مقروء');
      const m0 = T.DB.q("SELECT author_key,department FROM notification_messages WHERE scope=?1 AND id='TEST_ONLY_n0'", 'd:' + B)[0];
      assert.equal(m0.author_key, 'mgr:' + B, tag + ': منشئُ التنبيه مديرُ الوحدة'); assert.equal(m0.department, B);
      assert.equal(T.DB.q("SELECT COUNT(*) n FROM notification_messages WHERE scope='d:" + B + "' AND department<>'" + B + "'")[0].n, 0, tag + ': كلُّ تنبيهٍ للوحدة الهدف');
      /* (هـ) المهام تُفتح: «مهامّي» للموظف بمسارها الحقيقي · وقراءةُ صفحة المهام للمدير — منشئُها ومراجِعُها مديرُ الوحدة الهدف */
      const ew = await T.login('1200000102', LAB.pw), mine = await T.call('/api/me/tasks?uid=TEST_ONLY_empB', { ck: ew.ck });
      assert.equal(mine.status, 200, tag + ': ' + mine.t.slice(0, 200)); assert.equal(mine.j.me.linked, true, tag + ': الموظفُ مرتبطٌ بمهامه');
      const own = Object.values(JSON.parse(file.data.bassam_tasks_v1)).flat().filter((r) => r[14] === 'tst_demo_e11').length;
      assert.ok(own > 0 && mine.j.rows.length === own, tag + ': مهامُّه كلُّها (' + mine.j.rows.length + '/' + own + ')');
      const mw = await T.login(LAB.mgrB, LAB.pw), rd = await T.call('/api/operations/read?uid=TEST_ONLY_mgrB&keys=' + encodeURIComponent('bsdept:' + B + ':bassam_tasks_v1'), { ck: mw.ck });
      assert.equal(rd.status, 200, tag + ': ' + rd.t.slice(0, 200));
      const rows = Object.values(rd.j.resources['bsdept:' + B + ':bassam_tasks_v1']).flat();
      assert.ok(rows.length && rows.every((r) => r[23].by.e === 'mgr:' + B && r[23].rv.e === 'mgr:' + B), tag + ': منشئُ المهمة ومراجِعُها مديرُ الوحدة');
    } finally { await T.close(); }
  }
  assert.deepEqual(ends[1], ends[0], 'الدفعاتُ = الطلبُ الواحد صفاً بصف');
});

/* V7 · د6 (posfix · FIX_IMPORT3_D6): ملفُّ Production الحقيقي — جذرُ الجولات يبدأ بالحقل الثابت __pMig (019p3 fixed) ثم علاماتِ الأشهر ثم الأيام —
   كان يُستورد بنجاح (الاعتمادُ 200) ثم تردّ كلُّ قراءةٍ للجولات 400 operations-member-position: الدفعاتُ (019g rsiSlice) ترقّم المداخلَ من 0 فوق موضع الحقل الثابت.
   هنا: بعد الاستيراد يُقرأ كلُّ موردٍ تشغيليٍّ للإدارة بـ200، وصفوفُه هي ما يكتبه ocConvert للوثيقة كلِّها، ويطابق النسخةَ مفتاحاً مفتاحاً وبترتيبها —
   (أ) بالحجم المقيس ودفعاتٍ تلقائية (أيامٌ حيّة في أكثر من دفعة مع __pMig) ثم حفظٌ في الجولات 200 · (ب) المسارُ الواحد والدفعاتُ و/api/backup/restore على النسخة نفسِها
   (صفاً بصف بين المسارين) · (ج) استيرادٌ ثانٍ بالبناء نفسِه فوق الإدارة نفسِها (استبدالٌ كامل) يكتب الجولاتَ من جديد فتُقرأ. */
test('(٢٠) [posfix] الحقلُ الثابت __pMig أولُ مفتاحٍ في جذر الجولات (كملف Production) ⇒ بعد الاستيراد يُقرأ كلُّ شيء بـ200 ويطابق النسخة — بالمسارين و/api/backup/restore', { timeout: 600000, ...need }, async (t) => {
  const big = await oldFile({ openDays: 3 }), T = await target();
  try {
    assert.deepEqual(Object.keys(JSON.parse(big.data.bassam_rounds_v1)).slice(0, 4), ['__pMig', 'm:1448-5', 'm:1448-6', '1448-1-1'], 'جذرُ الجولات كملف Production: __pMig أولاً');
    const P = protocol(T, T.su, big, { scope: SCOPE }), out = await P.run();
    assert.equal(out.commit && out.commit.status, 200, JSON.stringify((out.commit || out.inspect || out.part || out.begin).j).slice(0, 300));
    const live = P.parts.filter((p) => /^#bassam_rounds_v1#/.test(p.k) && p.t.includes('"1448-6-')).length;
    assert.ok(P.sliceCount > 2 && live >= 2, 'أكثرُ من دفعة، والأيامُ الحيّة في دفعتين على الأقل (' + P.sliceCount + ' · ' + live + ')');
    const t0 = Date.now(), got = await readBack(T, B, wantOf(T, big, B));
    t.diagnostic('قراءةُ كلِّ موارد الإدارة بعد الاستيراد: ' + Object.keys(got).length + ' مورداً في ' + (Date.now() - t0) + ' ms');
    assert.deepEqual(Object.keys(got.bassam_rounds_v1), ['__pMig', 'm:1448-5', 'm:1448-6', '1448-6-1', '1448-6-2', '1448-6-3'], 'الحيُّ: الحقلُ الثابت ثم العلامات ثم أيامُ الشهر المفتوح');
    assert.equal(got.bassam_rounds_v1.__pMig, 2);
    /* الحفظُ في الجولات بعد الاستيراد 200 (كان 400 مع الخلل) — والقراءةُ بعده كذلك */
    const k = 'bsdept:' + B + ':bassam_rounds_v1', cur = (await T.call('/api/operations/read?keys=' + encodeURIComponent(k), { ck: T.su.ck })).j, doc = cur.resources[k];
    doc['1448-6-2'].d[0].zones[0].name += ' (حُفظ بعد الاستيراد)';
    const sv = await T.call('/api/save', { ck: T.su.ck, body: { uid: T.su.uid, requestId: 'TEST_ONLY_posfix_save', epoch: cur.epoch, set: { [k]: JSON.stringify(doc) }, del: [], base: cur.base } });
    assert.equal(sv.status, 200, sv.t.slice(0, 300)); assert.equal(sv.j.ok, 1, sv.t.slice(0, 300));
    assert.match((await readBack(T, B)).bassam_rounds_v1['1448-6-2'].d[0].zones[0].name, /حُفظ بعد الاستيراد/);
    /* (ج) استبدالٌ كامل فوق الإدارة نفسِها بالنسخة نفسِها: يعيد كتابة الجولات كلِّها فتطابق النسخة */
    const again = await protocol(T, T.su, big, { scope: SCOPE }).run();
    assert.equal(again.commit && again.commit.status, 200, JSON.stringify((again.commit || again.inspect || again.begin).j).slice(0, 300));
    await readBack(T, B, wantOf(T, big, B));
  } finally { await T.close(); }
  /* (ب) نسخةٌ صغيرة بالشكل نفسِه: المسارُ الواحد · الدفعات (مفروضة صغيرة) · /api/backup/restore — كلٌّ إلى منصةٍ جديدة */
  const file = await oldFile({ small: true, images: false, openDays: 2 }), ends = [];
  for (const how of ['single', 'sliced', 'restore']) {
    const Z = await target();
    try {
      if (how === 'restore') {
        const f = { ...file, data: Object.fromEntries(Object.entries(file.data).filter(([x]) => !(x in NOT_TRANSFERRED))), idbImages: {} };
        const inv = (await Z.call('/api/backup/restore?kind=dept&departments=%5B%5D&dept=' + B, { ck: Z.su.ck })).j, body = { version: 1, uid: Z.su.uid, requestId: 'TEST_ONLY_posfix_rs', scope: SCOPE, mode: 'replace', reason: 'TEST_ONLY د6 posfix', backup: f, legacyConsent: true };
        const ins = await Z.call('/api/backup/restore', { ck: Z.su.ck, body: { ...body, base: inv.base, phase: 'inspect' } });
        assert.equal(ins.status, 200, 'restore فحص: ' + ins.t.slice(0, 300));
        const com = await Z.call('/api/backup/restore', { ck: Z.su.ck, body: { ...body, base: ins.j.inspection.base, phase: 'commit' } });
        assert.equal(com.status, 200, 'restore اعتماد: ' + com.t.slice(0, 300));
      } else {
        const P = protocol(Z, Z.su, file, { scope: SCOPE, slice: how === 'sliced' ? 1000 : false, sliceTarget: 5000 }), r = await P.run();
        assert.equal(r.commit && r.commit.status, 200, how + ': ' + JSON.stringify((r.commit || r.inspect || r.part || r.begin).j).slice(0, 300));
        if (how === 'sliced') assert.ok(Object.keys(P.slices).filter((x) => /^bassam_rounds_v1#/.test(x)).length >= 3, 'الجولاتُ قُسمت (' + Object.keys(P.slices).join(' ') + ')');
      }
      const got = await readBack(Z, B, wantOf(Z, file, B));
      assert.deepEqual(Object.keys(got.bassam_rounds_v1).slice(0, 3), ['__pMig', 'm:1448-5', 'm:1448-6'], how);
      ends.push(Object.fromEntries(Object.entries(rowsOf(Z)).filter(([n]) => /^ops_/.test(n))));
    } finally { await Z.close(); }
  }
  assert.deepEqual(ends[1], ends[0], 'الدفعاتُ = المسارُ الواحد صفاً بصف (مواضعُ الأعضاء كلُّها)');
  assert.deepEqual(ends[2], ends[0], '/api/backup/restore = المسارُ الواحد صفاً بصف');
});

/* V7 · د6 (posfix): صفوفٌ كتبها الخلل قبل الإصلاح (Preview إن جُرّب عليه الاستيراد) — شكلُها حرفاً كما كتبه 954914d (مقيسٌ على بنائه:
   __pMig في صفّ الجذر بالموضع 0 والمداخلُ من 0 — المداخلُ مزاحةٌ واحداً إلى الأسفل عمّا يكتبه ocConvert). القراءةُ ترفضها كما هي (member-position — لا يُرخى الفحص)، و:
   (أ) استبدالٌ كامل بالبناء المصلَح على دفعات (كملف Production: الجولاتُ ≥ 1.5M حرف ⇒ دفعاتٌ دائماً) لا يقرأ القائمَ من الأسرة فيكتبها من جديد وتُقرأ؛
   (ب) المسارُ الواحد (نسخةٌ أصغر من حدّ الدفعات) يقرأ القائمَ فيُرفض 400 ولا يتغيّر شيء — ثم تصحيحُ SQL الموثّق (POSFIX_REPAIR_SQL) يعيد المواضعَ حرفاً،
       محروسٌ (لا يمسّ إلا جذرَ جولاتٍ فيه التصادمُ بعينه · تكرارُه لا يغيّر شيئاً)، وبعده تُقرأ ويمرّ المسارُ الواحد. */
const POSFIX_REPAIR_SQL = (d) => "UPDATE ops_nodes SET position = position + 1 WHERE department_id = '" + d + "' AND resource = 'bassam_rounds_v1' AND parent_key = '$' AND member_key IS NOT NULL" +
  " AND EXISTS (SELECT 1 FROM ops_rounds WHERE department_id = '" + d + "' AND resource = 'bassam_rounds_v1' AND row_key = '$' AND f_____p_u4d_ig_kind <> 0 AND f_____p_u4d_ig_position = 0)" +
  " AND (SELECT MIN(position) FROM ops_nodes WHERE department_id = '" + d + "' AND resource = 'bassam_rounds_v1' AND parent_key = '$' AND member_key IS NOT NULL) = 0";
test('(٢١) [posfix] صفوفُ الخلل القائمة: القراءةُ ترفضها ولا تُرخى · استبدالٌ كامل بالدفعات يعيد كتابتها · والمسارُ الواحد يُرفض بلا أثر حتى تصحيح SQL المحروس', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true, images: false, openDays: 2 }), k = 'bsdept:' + B + ':bassam_rounds_v1';
  const pos = (T) => T.DB.q("SELECT row_key,position FROM ops_nodes WHERE department_id=?1 AND resource='bassam_rounds_v1' ORDER BY row_key", B).map((r) => ({ ...r }));
  for (const how of ['دفعات', 'طلبٌ واحد ثم SQL']) {
    const T = await target();
    try {
      assert.equal((await protocol(T, T.su, file, { scope: SCOPE, slice: 1000, sliceTarget: 5000 }).run()).commit.status, 200);
      const good = pos(T);
      /* شكلُ الخلل حرفاً */
      T.DB.exec("UPDATE ops_nodes SET position=position-1 WHERE department_id='" + B + "' AND resource='bassam_rounds_v1' AND parent_key='$' AND member_key IS NOT NULL");
      const bad = await T.call('/api/operations/read?keys=' + encodeURIComponent(k), { ck: T.su.ck });
      assert.equal(bad.status, 400, how + ': صفوفُ الخلل لا تُقرأ'); assert.equal(bad.j.err, 'operations-member-position', how);
      if (how === 'دفعات') {
        const r = await protocol(T, T.su, file, { scope: SCOPE, slice: 1000, sliceTarget: 5000 }).run();
        assert.equal(r.commit && r.commit.status, 200, how + ': ' + JSON.stringify((r.commit || r.inspect || r.part || r.begin).j).slice(0, 300));
      } else {
        const before = snapshot(T.DB), mono = await protocol(T, T.su, file, { scope: SCOPE, slice: false }).run(), stop = mono.commit || mono.inspect;
        assert.equal(stop.status, 400, 'المسارُ الواحد يقرأ القائمَ فيُرفض: ' + JSON.stringify(stop.j).slice(0, 200)); assert.equal(stop.j.err, 'operations-member-position');
        assert.deepEqual(changed(snapshot(T.DB), before), [], 'ولا يتغيّر شيء'); assert.equal(staged(T.DB), 0);
        T.DB.exec(POSFIX_REPAIR_SQL(B));
        assert.deepEqual(pos(T), good, 'التصحيحُ يعيد المواضعَ حرفاً كما يكتبها ocConvert');
        const once = rowsOf(T); T.DB.exec(POSFIX_REPAIR_SQL(B)); T.DB.exec(POSFIX_REPAIR_SQL(A));
        assert.deepEqual(rowsOf(T), once, 'محروس: تكرارُه (وعلى إدارةٍ بلا تصادم) لا يغيّر شيئاً');
        await readBack(T, B, wantOf(T, file, B));
        const again = await protocol(T, T.su, file, { scope: SCOPE, slice: false }).run();
        assert.equal(again.commit && again.commit.status, 200, 'وبعده يمرّ المسارُ الواحد: ' + JSON.stringify((again.commit || again.inspect || again.begin).j).slice(0, 300));
      }
      await readBack(T, B, wantOf(T, file, B));
    } finally { await T.close(); }
  }
});
