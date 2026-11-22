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
import { target, oldFile, sizeOf, protocol, staged, snapshot, changed, readOps, readImage, NOT_TRANSFERRED, LAB, SEG } from './v7_d6_import_fx.mjs';

const B = 'TEST_ONLY_B', A = 'TEST_ONLY_A', SCOPE = { kind: 'dept', departmentId: B }, LIMIT = 8 * 1024 * 1024;
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام والتشغيل والتقرير والعهد (بياناتُ العرض المصدر)' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };   /* سطورُ سجلّ الطلبات لا تُغرق المخرجات */
after(() => { console.log = quiet; });

/* مطابقةُ ما في القاعدة بما في الملف: مفتاحاً مفتاحاً وصورةً صورة */
async function compare(T, who, file, dept = B) {
  const W = T.lab.W, names = Object.keys(file.data), ops = names.filter((k) => file.data[k] !== null && W.opInfo('bsdept:' + dept + ':' + k));
  const got = await readOps(T, who, dept, ops.concat(['bassam_rounds_arc_v1']));
  for (const k of ops) {
    const want = JSON.parse(file.data[k]);
    /* الجولات: أيامُ الأشهر المنقضية ينقلها الخادمُ إلى أرشيفها (د5-ح) — المطابقةُ على مجموع الموردين */
    if (k === 'bassam_rounds_v1') assert.deepEqual({ ...(got.bassam_rounds_arc_v1 || {}), ...(got[k] || {}) }, want, 'الجولات (مع أرشيفها) كما في النسخة');
    else assert.deepEqual(got[k], want, k + ' كما في النسخة');
  }
  const kv = Object.fromEntries(T.DB.q("SELECT k, group_concat(v,'') v FROM (SELECT k,v FROM kv WHERE k GLOB ?1 ORDER BY k,seq) GROUP BY k", 'bsdept:' + dept + ':*').map((r) => [r.k.split(':').slice(2).join(':'), r.v]));
  for (const k of ['bassam_first_boot_v1', 'bassam_last_export_v1']) assert.equal(kv[k], file.data[k], k + ' كما في النسخة');
  /* التنبيهات: كلُّ بندٍ برسالته */
  const items = JSON.parse(file.data.bassam_notif_v1).items, rows = T.DB.q('SELECT id,title,body FROM notification_messages WHERE scope=?1', 'd:' + dept);
  assert.equal(rows.length, items.length, 'عددُ التنبيهات');
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const it of items) { const r = byId.get(it.id); assert.ok(r, 'تنبيه ' + it.id); assert.equal(r.title, it.t); assert.equal(r.body, it.b); }
  /* ما لا مقابلَ له لم يُكتب */
  for (const k of Object.keys(NOT_TRANSFERRED)) assert.equal(k in kv, false, k + ' لم يُنقل');
  assert.equal(T.DB.q("SELECT COUNT(*) n FROM kv WHERE k GLOB '*bassam_grants_v1' OR k GLOB '*bassam_perm_tpls*'")[0].n, 0, 'لا منحَ ولا قوالب');
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
    assert.deepEqual(Object.fromEntries(s.notTransferred.map((x) => [x.k, x.why])), NOT_TRANSFERRED, 'وعند الفحص كذلك');
    assert.equal(out.commit.status, 200, JSON.stringify(out.commit.j).slice(0, 400));
    assert.equal(out.commit.j.ok, 1); assert.deepEqual(out.commit.j.warnings, []); assert.equal(out.commit.j.imagesNew, 10 * scale);
    const ms = Date.now() - t1, n = await compare(T, T.su, file);
    assert.equal(staged(T.DB), 0, 'المؤقتُ حُذف مع الاعتماد'); assert.equal(audits(T), 1, 'سُجّل الاستيراد مرةً واحدة');
    assert.equal(T.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
    const perms1 = permsOf(T);
    assert.ok(T.DB.q("SELECT COUNT(*) n FROM restore_preimage WHERE snapshot_id GLOB 'atomic_*'")[0].n > 0, 'لقطةُ ما قبل الاستيراد محفوظة على الخادم');
    /* الصلاحيات: السقفُ والأوراقُ المرفقة بالنسخة بقاعدة الشريحة القائمة — ولا شيءَ خارج الإدارة الهدف، ولا حساباتٍ ولا منحاً */
    const now = perms1;
    assert.deepEqual(now.caps[B], file.perms.cap); assert.deepEqual(now.emps[B], file.perms.emps);
    for (const d of Object.keys(before.caps)) if (d !== B) assert.deepEqual(now.caps[d], before.caps[d], 'سقفُ ' + d + ' لم يُمسّ');
    assert.deepEqual(Object.keys(now.emps), [B]); assert.equal(T.DB.q("SELECT group_concat(v,'') v FROM kv WHERE k='bassam_auth_users_v1'")[0].v, users, 'الحساباتُ كما هي');
    /* أين استقرّت أجسامُ الصور — وحدُّ قيمة الصف في طبقة التخزين (CHUNK = 700,000 حرفاً) محترم */
    const bodies = T.DB.q('SELECT COUNT(*) n, MAX(length(v)) m, SUM(length(v)) c FROM imgs')[0];
    if (inline) { assert.equal(bodies.c, size.images, 'أجسامُ الصور كلُّها في D1'); assert.ok(bodies.m <= 200000, 'صفُّ الصورة ≤ 200,000 حرف (' + bodies.m + ')'); }
    else { assert.equal(bodies.n, 10 * scale); assert.equal(bodies.m, 4, 'في D1 سطرُ المرجع وحده — الجسمُ في المستودع الكائنيّ'); }
    if (scale === 1) {
      /* نسخةُ ما قبل الاستيراد مع الأحجام الكبيرة: استيرادٌ ثانٍ فوق إدارةٍ تحمل الجولاتِ كلَّها (≈8.4MB) بنسخةٍ معدَّلة ⇒ اللقطةُ الخادمية تحمل ما كان قبله كاملاً */
      const rounds = JSON.parse(file.data.bassam_rounds_v1);
      for (const day of Object.values(rounds)) { day.t += 1; for (const fl of day.d) for (const z of fl.zones) z.name += ' (معدَّل)'; }
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

test('(٣ج) المهلةُ بساعةٍ مضبوطة: مؤقتٌ انقضت ساعتُه لا يُعتمد أبداً · ويكنسه أيُّ طلبٍ عاديٍّ ناجح (قراءةٌ من حسابٍ آخر) بلا استيرادٍ جديد ولا كتابة — وقبل الساعة يبقى', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true }), T = await target(), realNow = Date.now;
  let shift = 0;
  Date.now = () => realNow() + shift;
  try {
    const base = snapshot(T.DB), other = await T.login(LAB.mgrA, LAB.pw), read = () => T.call('/api/get?keys=bassam_platform_v1', { ck: other.ck });
    /* (أ) كاملُ الأجزاء، ثم تمرّ ساعةٌ ودقيقة: الاعتمادُ مرفوض 410 ولا شيء يُكتب */
    let P = protocol(T, T.su, file, { scope: SCOPE });
    await P.begin(); for (let i = 0; i < P.parts.length; i++) assert.equal((await P.part(i)).status, 200);
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
    assert.equal(staged(T.DB), rows, 'قبل انقضاء الساعة: باقٍ');
    shift += 31 * 60e3;
    assert.equal((await read()).status, 200);
    assert.equal(staged(T.DB), 0, 'بعد الساعة: كنسته قراءةٌ عادية من حسابٍ آخر');
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
    /* الهدفُ الآن غيرُ فارغ: الخادمُ لا يعلن دفعاتٍ، والاستيرادُ يجري بالمسار الواحد كما كان */
    const again = protocol(T, T.su, file, opt), dry = await again.post({ op: 'begin', dry: true, scope: SCOPE, keys: { bassam_rounds_v1: 0 } });
    assert.deepEqual(dry.j.slice, {}, 'هدفٌ غير فارغ: لا دفعات');
    const r2 = await again.run(); assert.equal(again.sliceCount, 0); assert.equal(r2.commit.status, 200); await compare(T, T.su, file);
    /* وبيانُ دفعاتٍ يُفرض على هدفٍ غير فارغ مرفوضٌ عند البدء */
    const forcedBegin = await again.post({ op: 'begin', scope: SCOPE, n: 10, f: 1, slices: { 'bassam_rounds_v1#0': 50 }, keys: { bassam_rounds_v1: 0 } });
    assert.equal(forcedBegin.status, 400); assert.equal(forcedBegin.j.err, 'import-shape');
  } finally { await T.close(); }
  /* مديرُ الإدارة (ولو بمفتاح الاستعادة): لا دفعات — مسارُه كما كان */
  const T2 = await target();
  try {
    const GK = 'bsdept:' + B + ':bassam_grants_v1';
    await T2.DB.batch([...T2.lab.W.kvPutStmts(T2.lab.env, 'kv', GK, JSON.stringify({ v: 1, emp: { ['mgr:' + B]: { plus: ['backup.restore'], minus: [] } } })), T2.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(GK)]);
    const mgrB = await T2.login(LAB.mgrB, LAB.pw), dry = await protocol(T2, mgrB, file, opt).post({ op: 'begin', dry: true, scope: SCOPE, keys: { bassam_rounds_v1: 0 } });
    assert.equal(dry.status, 200); assert.deepEqual(dry.j.slice, {}, 'غيرُ مدير المنصة: لا دفعات');
  } finally { await T2.close(); }
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
    assert.equal(began.status, 403); assert.equal(invB.status, 403);
    assert.deepEqual(changed(snapshot(T.DB), base), [], 'لم يتغيّر شيء'); assert.equal(audits(T), 0);
    /* وبالمفتاح الممنوح صراحةً (backup.restore) يبدأ ويودِع — ثم يُنزع المفتاح في منتصف الاستيراد فيُرفض الجزءُ التالي ويُنظَّف مؤقتُه */
    const GK = 'bsdept:' + B + ':bassam_grants_v1', grant = (on) => T.DB.batch([...T.lab.W.kvPutStmts(T.lab.env, 'kv', GK, JSON.stringify({ v: 1, emp: on ? { ['mgr:' + B]: { plus: ['backup.restore'], minus: [] } } : {} })),
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
    const run = await protocol(T, mgrB, file, { scope: SCOPE, reason: 'TEST_ONLY استيراد مدير الإدارة' }).run();
    assert.ok(run.inspect, 'وصل الفحص: ' + JSON.stringify((run.part || run.begin).j));
    assert.equal(run.inspect.status, oldRoute.status, 'حكمُ الاستيراد = حكمُ الاستعادة القائم'); assert.equal(run.inspect.j.err, oldRoute.j.err);
    assert.deepEqual(Object.keys((run.inspect.j.details || {}).denied || {}).sort(), Object.keys((oldRoute.j.details || {}).denied || {}).sort(), 'والمفاتيحُ المرفوضة هي هي');
    t.diagnostic('مديرُ الإدارة بالمفتاح: الفحص ' + run.inspect.status + ' ' + run.inspect.j.err + ' (كالمسار القديم)');
    assert.equal(staged(T.DB), 0, 'الرفضُ النهائي نظّف المؤقت'); assert.deepEqual(changed(snapshot(T.DB), state), []); assert.equal(audits(T), 0);
    /* وبلا سبب يُرفض مديرُ الإدارة (كما اليوم — مديرُ المنصة وحده معفى) */
    const noReason = await protocol(T, mgrB, file, { scope: SCOPE, reason: '' }).run();
    assert.equal(noReason.inspect.status, 400); assert.equal(noReason.inspect.j.err, 'restore-reason'); assert.equal(staged(T.DB), 0);
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
