/* KIVO_264 · KIVO-Tasks — P0 (بوابةُ قبولٍ إلزامية): «المدير يُسند المهمة · يصل التنبيهُ للموظف · ولا تظهر المهمة في ملفي ← مهامي».
   بياناتٌ اصطناعيةٌ وحدها (tests/unit/tasks_fx.mjs — شكلُ النسخة: 17 سجلَّ موظف · 56 مهمة · 54 مسندةً بالمعرّف) على العامل الحقيقي فوق D1 بديل،
   بالوضعين (legacy · enforce). العاملُ المختبَر: workers/_worker.js المولَّد (أو KIVO_WORKER):
     • KIVO_WORKER=/home/claude/kivo/dist242/dist/_worker.js  ⇒ Production 242 (legacy): تُخفق اختباراتُ المسار الذاتي — دليلُ العطل
     • KIVO_WORKER=pk263/_worker.js                           ⇒ 263 (Preview): كذلك بالوضعين
     • العاملُ المولَّد بعد KIVO-Tasks (062c + رقعةُ موزِّع 062a)    ⇒ تنجح كلُّها
   الأسبابُ الجذرية المثبتة هنا (تفصيلُها في reports/k264/tasks/AS_IS.md):
     RC-1 قراءةُ مخزن المهام مربوطةٌ بـtask.view وحده (050 RD_REG · 061 readBindings) ولا مسارَ ذاتياً للقراءة — والتنبيهُ مخزنُه قاعدةٌ يقرؤها الجميع.
     RC-2 «ملفي» القديمة تعرض مهامَ «اليوم» وحدَه في البطاقة وتُسقط المنقضيةَ والقادمة (_tkVals: day === today) — تُثبَت على منطق الصفحة الحقيقي.
     RC-3 صورُ التوثيق تُربط بمخزن المهام فتُقرأ بـcanRead(المخزن): صاحبُها لا يراها بعد الإنهاء، وحاملُ task.view يرى صورَ الجميع.
     RC-4 الالتفافُ الوحيد (منحُ task.view) يكشف مهامَ الزملاء وصورَهم — ممنوع. */
import './clock.mjs';   /* V7 P3: ساعةُ الاختبار المثبَّتة (1448-5-9) — كان يُخفق في أول الشهر الهجري وبعد تبدّل الشهر (يُستورد أولاً) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, notificationMessages, assertNotificationKVRetired, KE, D, DAY, TOMORROW, YESTERDAY, PDAY, ODAY, row, stored, rowsOf, count, putKV, addAccount, IMG_ME, IMG_MATE, PNG, P0, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
/* منطقُ «ملفي» كما شُحن في KIVO_263 (الوسم) — لتوصيف الواجهة القديمة بعد دمج رقعة «ملفي» (k265-tasks: الملفُّ الحاليّ يقرأ KIVO.BassamMyTasks) */
const PF263 = (() => { try { return execFileSync('git', ['show', 'KIVO_263:src/modules/profile/logic.js'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }); } catch (e) { return null; } })();
const NEW_ID = 1760000077777;
const MY_IDS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110].map(n => 1760000000000 + n);
const listOf = async (W, ck, q = '') => W.C.api('/api/me/tasks' + q, { cookie: ck });
const actOf = (W, ck, body) => W.C.api('/api/me/tasks/act', { method: 'POST', cookie: ck, body });
/* ما يفعله المدير: حفظُ صفٍّ جديدٍ مسنَدٍ للموظف ثم أمر emit المعتمد من 442؛ لا snapshot KV متقاعد. */
async function managerAssigns(W, dm, title = 'P0 — مهمة جديدة من المدير') {
  const current = await W.C.api('/api/operations/read?keys='+encodeURIComponent(KT),{cookie:dm.ck});
  assert.equal(current.status,200);const S = current.j.resources[KT]; const r = row({ id: NEW_ID, title, eid: ME.eid, s: Date.now() - 60e3, e: Date.now() + 3 * 3600e3 });   /* KIVO_265 · نافذةُ التنفيذ: بدأ موعدُها (لا بدءَ قبل الموعد بلا سماح) */
  S[DAY] = (S[DAY] || []).concat([r]);
  const sv = await W.C.api('/api/save',{method:'POST',cookie:dm.ck,body:operationSaveBody(W.env,'/api/save',{set:{ [KT]: JSON.stringify(S) },del:[],base:{[KT]:current.j.base[KT]}})});
  assert.ok(sv.j.revs && sv.j.revs[KT], 'المدير يحفظ المهمة: ' + JSON.stringify(sv.j).slice(0, 200));
  assert.ok(rowsOf(stored(W.env, KT), ME.eid).some(x => x.r[13] === NEW_ID), 'المهمةُ في المخزن بالعمود 14 = eid الموظف');
  const sn = await W.C.api('/api/notifications/act', { method: 'POST', cookie: dm.ck, body: { op: 'emit', type: 'task_new', dept: D, own: [ME.eid], vars: { 'المهمة': title, 'الوقت': 'TEST_ONLY' } } });
  assert.equal(sn.status, 200); assert.equal(sn.j.ok, 1); assert.ok(sn.j.id && sn.j.n === 1, 'الخادم يؤكد حفظ التنبيه في المجال العلائقي');
  assertNotificationKVRetired(W.env);
  assert.ok(notificationMessages(W.env).some(message => message.type === 'task_new' && message.employee_targets.includes(ME.eid)), 'المستهدف محفوظ في notification_targets');
  return sn.j.id;
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + (WU.patched ? ' · موزِّعُ 062a مطبَّقٌ للاختبار' : '') + '] ';

  test(M + 'P0 — السلسلة: إنشاء ← إسناد ← حفظ ← تنبيه ← «مهامي» للموظف بلا task.view', async () => {
    const W = await world({ worker: WU.file, mode });
    assert.deepEqual(count(W.store), { n: 56, a: 54 }, 'شكلُ النسخة: 56 مهمة · 54 مسندة');
    const me = await W.login(ME.un, ME.pw), dm = await W.login('0000000101', '70101');
    const notificationId = await managerAssigns(W, dm);
    /* القراءة الذاتية الفعلية تثبت وصوله بلا منح task.view أو كشف قائمة المستهدفين. */
    const g = await W.C.api('/api/notifications?dept=' + encodeURIComponent(D), { cookie: me.ck }); assert.equal(g.status, 200); assert.equal(g.j.ok, 1);
    const items = g.j.items.filter(x => x.type === 'task_new' && x.id === notificationId);
    assert.equal(items.length, 1, 'التنبيهُ مقروءٌ للموظف ومسنَدٌ إلى معرّفه');
    assert.equal(items[0].to, undefined, 'تحديد الجمهور يبقى في SQL ولا يُكشف للمستلم'); assertNotificationKVRetired(W.env);
    /* و«مهامي» من المسار الذاتي تحمل المهمة — كانت 404 على 242/263 */
    const l = await listOf(W, me.ck);
    assert.equal(l.status, 200, 'GET /api/me/tasks — ' + JSON.stringify(l.j).slice(0, 120));
    assert.equal(l.j.me.linked, true); assert.equal(l.j.me.by, 'eid', 'الربطُ بالمعرّف الثابت eid (لا بالاسم)');
    const nw = l.j.rows.find(r => r.id === NEW_ID);
    assert.ok(nw, 'المهمةُ الجديدة في «مهامي»'); assert.equal(nw.ph, 'new', 'موعدُها بدأ (KIVO_265: لا بدءَ قبل الموعد)'); assert.equal(nw.w, 1, 'قابلةٌ للفعل من صاحبها');
  });

  test(M + 'P0 — لا صلاحيةَ إدارية مُنحت: المخزنُ الكامل ما زال محجوباً عن الموظف (الإقلاع · /api/get) ولا شيءَ في صلاحياته تغيّر', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw);
    const b = (await W.C.boot(me.ck)).boot;
    assert.ok(b && b.keys, 'إقلاع'); assert.ok(!(KT in b.keys), 'لا مخزنَ مهامٍ في إقلاع الموظف');
    const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT), { cookie: me.ck });
    assert.ok(g.j.denied.includes(KT) && !Object.hasOwn(g.j.resources,KT) && !Object.hasOwn(g.j.base,KT), 'operations/read لا يعطيه المخزنَ ولا رقمَه');
    const perms = JSON.parse(b.keys.bassam_perms_v1 || '{}');
    assert.equal(((perms.emps || {})[D] || {})[ME.eid], undefined, 'لا ورقةَ صلاحياتٍ للموظف (موظفٌ عادي)');
    /* ولا يكتب المخزنَ كلَّه بحفظٍ مصنوع: إضافةُ صفٍّ ⇒ رفض */
    const S = stored(W.env, KT); S[DAY].push(row({ id: 1760000088888, title: 'صفٌّ مصنوع', eid: ME.eid }));
    const sv = await W.C.api('/api/save',{method:'POST',cookie:me.ck,body:operationSaveBody(W.env,'/api/save',Object.assign({set:{ [KT]: JSON.stringify(S) },del:[],base:{ [KT]: 0 }},{}))});
    assert.ok(!(sv.j.revs && sv.j.revs[KT]), 'الموظف لا ينشئ مهمة: ' + JSON.stringify(sv.j).slice(0, 160));
  });

  test(M + 'P0 — القديمةُ والجديدة كلُّها ظاهرة: لا إخفاءَ لانقضاء الموعد ولا للأشهر السابقة ولا للصفّ القديم الشكل', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw);
    const l = await listOf(W, me.ck);
    assert.equal(l.status, 200);
    const ids = l.j.rows.map(r => r.id).sort();
    assert.deepEqual(ids, MY_IDS.slice().sort(), 'صفوفي العشرة كلُّها — ولا صفَّ لغيري');
    const ph = Object.fromEntries(l.j.rows.map(r => [r.id, r.ph]));
    assert.equal(ph[1760000000105], 'expired', 'المنقضيةُ بلا قبول تبقى ظاهرة');
    assert.equal(ph[1760000000104], 'upcoming', 'مهمةُ الغد ظاهرةٌ اليوم');
    assert.equal(ph[1760000000108], 'declined'); assert.equal(ph[1760000000107], 'done');
    const old = l.j.rows.find(r => r.id === 1760000000109); assert.ok(old && old.k === ODAY && old.st === 'done', 'الصفُّ القديم الشكل (15 عموداً) يُقرأ');
    const grp = l.j.rows.find(r => r.id === 1760000000110); assert.ok(grp && grp.grp && grp.grp.label === 'TST-A', 'المهمةُ الجماعية بوسمها');
    assert.ok(!JSON.stringify(l.j).includes(MATE.eid) && !JSON.stringify(l.j).includes(MATE.name), 'لا مفتاحَ ولا اسمَ زميلٍ في الردّ (حتى في الجماعية)');
    const m = await listOf(W, me.ck, '?ym=' + PDAY.split('-').slice(0, 2).join('-'));
    assert.deepEqual(m.j.rows.map(r => r.id).sort(), [1760000000107, 1760000000108, 1760000000109], 'تصفيةُ الشهر (السجل): صفّا الشهر الماضي والصفُّ القديم الشكل فيه');
    assert.ok(l.j.months.length >= 2, 'أشهرُ السجل');
    const same = await listOf(W, me.ck, '?since=' + l.j.rev); assert.equal(same.j.same, 1, 'استطلاعٌ رخيص بلا تغيّر');
  });

  test(M + 'P0 — العزل: الزميلُ لا يرى مهامي ولا يفعل فيها ولا يقرأ صوري · وأنا لا أقرأ صوره · ومدير الإدارة غيرُ مرتبطٍ بسجلّ', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw), dm = await W.login('0000000101', '70101');
    const lm = await listOf(W, mate.ck);
    assert.equal(lm.status, 200);
    assert.ok(lm.j.rows.length > 0 && lm.j.rows.every(r => !MY_IDS.includes(r.id) || r.id === 1760000000110), 'الزميلُ يرى صفوفَه وحده');
    assert.ok(!JSON.stringify(lm.j).includes(ME.eid), 'لا مفتاحي في ردّ الزميل');
    const a = await actOf(W, mate.ck, { k: DAY, id: 1760000000101, act: 'accept' });
    assert.equal(a.status, 404, 'فعلُ الزميل على مهمتي ⇒ «غير موجود» (لا كشفَ لوجودها)');
    assert.equal((await W.C.api('/api/me/tasks/img?id=' + IMG_ME, { cookie: mate.ck })).status, 403, 'الزميلُ لا يقرأ صورةَ توثيقي');
    assert.equal((await W.C.api('/api/me/tasks/img?id=' + IMG_MATE, { cookie: me.ck })).status, 403, 'ولا أقرأ صورتَه');
    const mine = await W.C.api('/api/me/tasks/img?id=' + IMG_ME, { cookie: me.ck });
    assert.equal(mine.status, 200, 'أقرأ صورةَ توثيقي القديمة (bound لمخزن المهام)'); assert.equal(mine.j.__text, PNG, 'جسمُ الصورة كما خُزّن');
    const ld = await listOf(W, dm.ck);
    assert.equal(ld.j.me.linked, false, 'مدير الإدارة المعيَّن (mgr:) بلا سجلّ ⇒ غيرُ مرتبط — لا «لا مهام» مضلِّلة'); assert.deepEqual(ld.j.rows, []);
    const su = await listOf(W, W.su.ck); assert.equal(su.j.me.linked, false, 'مدير النظام غيرُ مرتبط');
    const gm = await W.login('0000000103', '70103'); assert.equal((await listOf(W, gm.ck)).j.me.linked, false, 'مدير العقدة غيرُ مرتبط');
    const e2 = await W.login('0000000121', '70121'); const l2 = await listOf(W, e2.ck);
    assert.equal(l2.j.me.linked, true); assert.equal(l2.j.me.dept, 'tst_d2'); assert.deepEqual(l2.j.rows, [], 'موظفُ إدارةٍ أخرى لا يرى شيئاً من tst_d1');
  });

  test(M + 'P0 — الأفعالُ الذاتية في الخادم: قبول ← إنهاء بصورة · اعتذار بسبب · انقضاء — أعمدةُ الذات وحدها · والمديرُ يرى التوثيق من جلسته', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login('0000000101', '70101');
    const before = rowsOf(stored(W.env, KT), ME.eid).find(x => x.r[13] === 1760000000101);
    assert.equal((await actOf(W, me.ck, { k: DAY, id: 1760000000101, act: 'finish', note: 'x' })).status, 409, 'لا إنهاءَ قبل القبول');
    const acc = await actOf(W, me.ck, { k: DAY, id: 1760000000101, i: before.i, act: 'accept' });
    assert.equal(acc.status, 200, JSON.stringify(acc.j)); assert.equal(acc.j.row.ph, 'running');
    assert.equal((await actOf(W, me.ck, { k: DAY, id: 1760000000101, act: 'accept' })).status, 409, 'لا قبولَ مكرّر');
    /* صورةُ التوثيق: رفعٌ بالمسار القائم (self.task.proof.upload) ثم الإنهاء */
    const id = 'img_tskp0new_abc123';
    const put = await W.C.api('/api/img/' + id, { method: 'PUT', cookie: me.ck, body: PNG, headers: { 'Content-Type': 'text/plain' } });
    assert.equal(put.status, 200, 'الرفع');
    const forged = await actOf(W, me.ck, { k: DAY, id: 1760000000101, act: 'finish', imgs: [IMG_MATE] });
    assert.equal(forged.status, 409, 'لا إنهاءَ بصورة زميل: ' + JSON.stringify(forged.j));
    const fin = await actOf(W, me.ck, { k: DAY, id: 1760000000101, act: 'finish', imgs: [id], note: 'TEST_ONLY أُنجز' });
    assert.equal(fin.status, 200, JSON.stringify(fin.j)); assert.equal(fin.j.row.ph, 'done'); assert.ok(fin.j.row.perf, 'الأداءُ محسوب');
    const after = rowsOf(stored(W.env, KT), ME.eid).find(x => x.r[13] === 1760000000101).r;
    const changed = after.map((v, j) => JSON.stringify(v) !== JSON.stringify(before.r[j] === undefined ? null : before.r[j]) ? j : -1).filter(j => j >= 0);
    /* أعمدةُ الذات وحدها (TASK_SELF {3,6,11,12,20,21}): القبولُ والإنهاءُ 3·6·11·12·21 — والمرحلةُ الثانية تسجّل تأكيدَ الاستلام مع البدء (r20.ack · TO_BE §2)
       فيتغيّر 20 أيضاً؛ عاملُ المرحلة الأولى (حزمةُ 242 SR-2) لا يمسّه — والاختبارُ يقبل الاثنين ويشترط ألا يكون 20 سببَ اعتذار */
    assert.deepEqual(changed.filter(j => j !== 20), [3, 6, 11, 12, 21], 'تغيّرت أعمدةُ الذات وحدها (TASK_SELF)');
    assert.ok(!changed.includes(20) || (after[20] && after[20].ack && !after[20].why), 'العمود 20 = r20.ack وحده (لا سببَ اعتذار)');
    assert.equal(W.env.DB.q('SELECT st, k FROM imgown WHERE img = ?', id)[0].st, 'bound', 'الصورةُ رُبطت بمخزن المهام');
    assert.equal((await W.C.api('/api/me/tasks/img?id=' + id, { cookie: me.ck })).status, 200, 'أقرأ صورتي بعد الربط (من جهازٍ آخر/بعد إعادة الدخول)');
    const me2 = await W.login(ME.un, ME.pw); assert.equal((await W.C.api('/api/me/tasks/img?id=' + id, { cookie: me2.ck })).status, 200, 'جلسةٌ ثانية');
    /* المديرُ من جلسته: الحالةُ والتوثيقُ والصورة */
    const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT), { cookie: dm.ck });
    const dr = Object.values(g.j.resources[KT]).flat().find(r => r[13] === 1760000000101 && r[14] === ME.eid);
    assert.equal(dr[3], 'done'); assert.deepEqual(dr[21].imgs, [id]);
    assert.equal((await W.C.api('/api/img/' + id, { cookie: dm.ck })).status, 200, 'المديرُ يقرأ صورةَ التوثيق');
    /* الاعتذارُ بسببٍ إلزامي · والانقضاء */
    assert.equal((await actOf(W, me.ck, { k: DAY, id: 1760000000102, act: 'decline' })).status, 400, 'الاعتذارُ بلا سبب ⇒ 400');
    const dec = await actOf(W, me.ck, { k: DAY, id: 1760000000102, act: 'decline', why: 'ظرف طارئ' });
    assert.equal(dec.status, 200); assert.equal(dec.j.row.dec.why, 'ظرف طارئ');
    assert.equal((await actOf(W, me.ck, { k: DAY, id: 1760000000102, act: 'accept' })).status, 409, 'المعتذَرُ عنها لا تُقبل');
    const ex = await actOf(W, me.ck, { k: YESTERDAY, id: 1760000000105, act: 'expire' });
    assert.equal(ex.status, 200); assert.ok(ex.j.row.dec.exp, 'الانقضاءُ مسجَّل');
    assert.equal((await actOf(W, me.ck, { k: YESTERDAY, id: 1760000000105, act: 'accept' })).status, 409, 'المنقضيةُ لا تُقبل (يعيد المدير إسنادها)');
    /* السجل: أحداثُ كيانٍ بفاعلها الموظف */
    /* RISHAD266: قراءةُ المدير لمخزن المهام تجري مسحَ المواعيد (074 · via:'due' · sys) كما كان طلبُ صفحة المهام يفعل — أحداثُه للنظام لا للموظف فتُستثنى هنا */
    const ev = W.env.DB.q("SELECT uid, act FROM aud WHERE k = ? AND etype = 'task' AND (ctx IS NULL OR ctx NOT LIKE '%\"via\":\"due\"%') ORDER BY id", KT).map(r => r.uid + ':' + r.act);
    /* الصفُّ الفائت (105) انقضى بمسح الخادم عند قراءة المدير قبل فعل الموظف — ففعلُه يُقبل بلا حدثٍ ثانٍ: حدثُ انقضاءٍ واحدٌ له */
    assert.deepEqual(ev, [ME.uid + ':accepted', ME.uid + ':finished', ME.uid + ':declined']);
    const xr = rowsOf(stored(W.env, KT), ME.eid).find(x => x.r[13] === 1760000000105).r;
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'expired' AND ename = ?", KT, String(xr[0]).slice(0, 160))[0].n, 1, 'حدثُ انقضاءٍ واحد للصف الفائت');
  });

  test(M + 'P0 — تجاوزُ الواجهة: جسمٌ مصنوع · فعلٌ مجهول · شهرٌ مقفل · صفٌّ بمعرّفٍ قديم · GET على مسار الفعل', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw);
    for (const [b, at] of [[{ k: '1448/1/1', id: 1, act: 'accept' }, 'k'], [{ k: DAY, id: {}, act: 'accept' }, 'id'], [{ k: DAY, id: 1760000000101, act: 'approve' }, 'act'], [{ k: DAY, id: 1760000000101, act: 'finish', imgs: ['../x'] }, 'imgs'], [{ k: DAY, id: 1760000000101, act: 'decline', why: 'x'.repeat(201) }, 'why']])
      assert.equal((await actOf(W, me.ck, b)).j.at, at, 'رفضُ الشكل: ' + at);
    assert.equal((await W.C.api('/api/me/tasks/act', { cookie: me.ck })).status, 405, 'GET على مسار الفعل');
    assert.equal((await W.C.api('/api/me/tasks', { method: 'POST', cookie: me.ck, body: {} })).status, 405, 'POST على مسار القراءة');
    assert.equal((await W.C.api('/api/me/tasks')).status, 401, 'بلا جلسة');
    const x = await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, headers: { origin: 'http://evil.example' }, body: { k: DAY, id: 1760000000101, act: 'accept' } });
    assert.equal(x.status, 403, 'CSRF: مصدرٌ أجنبيّ ⇒ 403 (الحارسُ العامّ قبل الموزِّع)');
    assert.equal(rowsOf(stored(W.env, KT), ME.eid).find(r => r.r[13] === 1760000000101).r[11], null, 'ولم يُكتب شيء');
    const lockKey='bsdept:tst_d1:bassam_tasks_locks_v1',locks=stored(W.env,lockKey),previousMonth=PDAY.split('-').slice(0,2).join('-');
    locks[previousMonth]=true;await replaceOperationalFixture(W.env,lockKey,locks);
    const r = await actOf(W, me.ck, { k: PDAY, id: 1760000000107, act: 'expire' });
    assert.ok(r.status === 409 && r.j.err === 'locked', 'الشهرُ المعتمد (true) مقفل: ' + JSON.stringify(r.j));
    /* SR-2.1 · المرحلة الثانية: {mo:1} شهرٌ منقضٍ فتحه المدير — ليس قفلاً (lockState في 010: true|1 وحدهما) — فيُحكم بحالة الصفّ لا بالقفل */
    locks[previousMonth]={mo:1};await replaceOperationalFixture(W.env,lockKey,locks);
    const r2 = await actOf(W, me.ck, { k: PDAY, id: 1760000000108, act: 'accept' });
    assert.ok(r2.status === 409 && r2.j.err === 'state', 'الشهرُ المفتوح ({mo:1}) لا يُعدّ مقفلاً — الرفضُ لحالة الصفّ (معتذَرٌ عنها): ' + JSON.stringify(r2.j));
    /* صفٌّ مسنَدٌ برقم الهوية (حسابٌ قديم) — يُقرأ بالمعرّف الثابت nid ولا يُكتب من المسار الذاتي (selfTaskOnly حرفي) */
    const employees=stored(W.env,KE);employees.push({eid:'tst_e_nidonly',nid:'1099999999',name:'TEST_ONLY · صاحب رقم الهوية'});await replaceOperationalFixture(W.env,KE,employees);
    const S = stored(W.env, KT); S[DAY].push(row({ id: 1760000066666, title: 'مسندةٌ بالهوية', eid: '1099999999' }));
    await replaceOperationalFixture(W.env,KT,S);
    W.env.DB.exec("UPDATE kv SET v = json_insert(v, '$[#]', json('{\"id\":\"tst_nidacct\",\"un\":\"2000000299\",\"ph\":\"x\",\"name\":\"TEST_ONLY nid\",\"role\":\"staff\",\"deptId\":\"tst_d1\",\"ekey\":\"tst_e_nidonly\",\"dis\":0,\"test\":\"TEST_ONLY\"}')) WHERE k = 'bassam_auth_users_v1'");
    /* (الحسابُ أعلاه لا يدخل — كلمةُ مروره غيرُ صالحة؛ يكفي أن صفَّه لا يظهر لغيره) */
    const l = await listOf(W, me.ck); assert.ok(!l.j.rows.some(x => x.id === 1760000066666), 'صفُّ غيري المسنَدُ بالهوية لا يظهر لي');
  });

  /* SR-2.2 · F-1 (المراجعةُ المستقلة — عالٍ · review_sr2.md): رقمُ هويةٍ يحمله سجلّان في الإدارة (خطأُ إدخال) — كان الحسابُ المفتاحُ به يُربط بأوّل سجلٍّ مطابِق
     ويُضاف معرّفُه الثابت إلى رموزه بلا فحصِ تفرّد، فيقرأ مهامَ الزميل وصورةَ توثيقه. الآن: الربطُ بمعرّفٍ يحمله سجلٌّ واحدٌ بالضبط (eid ثم nid) — وإلا «غيرُ مرتبط» */
  test(M + 'F-1 — رقمُ هويةٍ مكرَّر: الحسابُ المفتاحُ به غيرُ مرتبط (لا صفوف · لا صورةَ زميل · لا فعل) · وصاحبُ المعرّف الثابت يرى صفوفَه وحدها · والمعرّفُ الثابتُ المكرَّر لا يربط', async () => {
    const W = await world({ worker: WU.file, mode });
    const DUP = '1777777771', E = stored(W.env, KE);
    E.find(x => x.eid === MATE.eid).nid = DUP;                                                   /* سجلُّ الزميل أوّلاً … */
    E.push({ eid: 'tst_e_dupB', name: 'TEST_ONLY · صاحبُ الرقم المكرَّر', nid: DUP });            /* … ثم سجلٌّ آخر بالرقم نفسِه */
    await replaceOperationalFixture(W.env, KE, E);
    addAccount(W.env, { uid: 'tst_dupB', un: '2000000298', pw: '70298', ekey: DUP });           /* حسابٌ قديمٌ مفتاحُه رقمُ الهوية المكرَّر */
    const S = stored(W.env, KT); S[DAY].push(row({ id: 1760000000777, title: 'مسنَدةٌ برقم الهوية المكرَّر', eid: DUP, s: Date.now() - 60e3, e: Date.now() + 3 * 3600e3 })); await replaceOperationalFixture(W.env, KT, S);
    const b = await W.login('2000000298', '70298'), lb = await listOf(W, b.ck);
    assert.equal(lb.status, 200, JSON.stringify(lb.j).slice(0, 160));
    assert.equal(lb.j.me.linked, false, 'رقمُ هويةٍ مكرَّر ⇒ غيرُ مرتبط: ' + JSON.stringify(lb.j.me) + ' · صفوف ' + (lb.j.rows || []).length);
    assert.deepEqual(lb.j.rows, [], 'لا صفوف');
    const im = await W.C.api('/api/me/tasks/img?id=' + IMG_MATE, { cookie: b.ck });
    assert.ok(im.status === 403 || im.status === 404, 'صورةُ توثيق الزميل ⇒ ' + im.status);
    const ab = await actOf(W, b.ck, { k: DAY, id: 1760000000202, act: 'finish', note: 'TEST_ONLY' });
    assert.ok(ab.status === 403 || ab.status === 404, 'فعلٌ على صفّ الزميل ⇒ ' + ab.status);
    const mate = await W.login(MATE.un, MATE.pw), lm = await listOf(W, mate.ck);
    assert.equal(lm.j.me.linked, true); assert.equal(lm.j.me.by, 'eid', 'الزميلُ مرتبطٌ بمعرّفه الثابت');
    const mateIds = new Set(rowsOf(stored(W.env, KT), MATE.eid).map(x => x.r[13]));
    assert.ok(lm.j.rows.length > 0 && lm.j.rows.every(r => mateIds.has(r.id)), 'صفوفُه بمعرّفه وحده');
    assert.ok(!lm.j.rows.some(r => r.id === 1760000000777), 'لا الصفَّ المسنَدَ بالرقم المكرَّر (ملتبس)');
    /* معرّفٌ ثابتٌ مكرَّر (سجلٌّ آخر بمعرّفي — خطأُ استيراد) ⇒ لا ربطَ بأوّل مطابِق */
    const E2 = stored(W.env, KE); E2.push({ eid: ME.eid, name: 'TEST_ONLY · سجلٌّ بمعرّفٍ مكرَّر' }); await replaceOperationalFixture(W.env, KE, E2);
    const me = await W.login(ME.un, ME.pw), l2 = await listOf(W, me.ck);
    assert.equal(l2.j.me.linked, false, 'eid مكرَّر ⇒ غيرُ مرتبط'); assert.deepEqual(l2.j.rows, []);
  });

  /* SR-2.2 · F-3 (متوسط): أوّلُ زيارةٍ لـ«ملفي» بعد النشر كانت تُسجّل «انقضاءَ» كلِّ متأخرةٍ قديمة (كتابةٌ للمخزن كاملاً وتنبيهٌ للمدير لكلٍّ منها) —
     الآن انقضاءٌ أقدمُ من 48 ساعة ⇒ noop بلا كتابةٍ ولا تدقيقٍ ولا تنبيه (دفاعٌ في العمق مع مرشِّح الواجهة)؛ والحديثُ يُسجَّل مرةً كما كان */
  test(M + 'F-3 — «انقضاء» صفٍّ انتهت مهلتُه قبل أكثر من 48 ساعة ⇒ noop بلا كتابة ولا تنبيه · والحديثُ (24 ساعة) يُسجَّل', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), OLD = 1760000000778, t0 = Date.now() - 20 * 864e5;
    const S = stored(W.env, KT); S[PDAY].push(row({ id: OLD, title: 'منقضيةٌ قديمة بلا ردّ', eid: ME.eid, s: t0, e: t0 + 3600e3 })); await replaceOperationalFixture(W.env, KT, S);
    await replaceOperationalFixture(W.env, 'bsdept:tst_d1:bassam_tasks_locks_v1', {});   /* الشهرُ الماضي غيرُ معتمدٍ صراحةً (المُثبِّت يعتمده) — كما أغلبُ الأشهر في Production (F-9) */
    const rev = () => W.env.DB.q('SELECT rev FROM revs WHERE k = ?', KT)[0].rev, nN = () => notificationMessages(W.env).length;
    const rev0 = rev(), n0 = nN();
    const x = await actOf(W, me.ck, { k: PDAY, id: OLD, act: 'expire' });
    assert.equal(x.status, 200, JSON.stringify(x.j)); assert.equal(x.j.noop, 1, 'noop: ' + JSON.stringify(x.j).slice(0, 160));
    assert.equal(rev(), rev0, 'لا كتابةَ في مخزن المهام');
    const r = rowsOf(stored(W.env, KT), ME.eid).find(q => q.r[13] === OLD).r; assert.ok(!(r[20] && r[20].exp), 'لا علامةَ انقضاء');
    assert.equal(nN(), n0, 'لا تنبيه');
    const y = await actOf(W, me.ck, { k: YESTERDAY, id: 1760000000105, act: 'expire' });
    assert.equal(y.status, 200, JSON.stringify(y.j)); assert.ok(!y.j.noop, 'الحديثُ يُسجَّل');
    assert.ok(rowsOf(stored(W.env, KT), ME.eid).find(q => q.r[13] === 1760000000105).r[20].exp, 'علامةُ الانقضاء على الحديث');
  });

  /* SR-2.2 · F-7 (منخفض — سياسةُ المالك «الصفحةُ غيرُ المفعّلة لا تُظهر أيَّ بياناتٍ تخصّها»): سقفُ الإدارة بلا «المهام» أو الوحدةُ مطفأةٌ على مستوى المنصة ⇒
     المسارُ الذاتي لا يُظهر شيئاً (me.off) ولا يقبل فعلاً ولا يقرأ صورةً — كما writePages — ويعود بعودة الصفحة */
  test(M + 'F-7 — صفحةُ المهام غيرُ مفعّلةٍ للإدارة أو مطفأةٌ للمنصة ⇒ «مهامي» فارغةٌ (off) · الفعلُ والصورةُ 403 · وتعود بعودتها', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw);
    const P = stored(W.env, 'bassam_perms_v1'), caps0 = P.caps[D].slice();
    const check = async (why) => {
      const l = await listOf(W, me.ck);
      assert.equal(l.status, 200, why); assert.equal(l.j.me.linked, false, why + ': ' + JSON.stringify(l.j.me)); assert.equal(l.j.me.off, 1, why); assert.deepEqual(l.j.rows, [], why);
      const a = await actOf(W, me.ck, { k: DAY, id: 1760000000101, act: 'accept' }); assert.equal(a.status, 403, why + ' — الفعل'); assert.equal(a.j.err, 'off', why);
      assert.equal((await W.C.api('/api/me/tasks/img?id=' + IMG_ME, { cookie: me.ck })).status, 403, why + ' — الصورة');
    };
    P.caps[D] = caps0.filter(k => k !== 'tasks'); putKV(W.env, 'bassam_perms_v1', P);
    await check('سقفُ الإدارة بلا المهام');
    P.caps[D] = caps0; putKV(W.env, 'bassam_perms_v1', P);
    const PL = stored(W.env, 'bassam_platform_v1') || {}; PL.mods = Object.assign({}, PL.mods || {}, { off: ['tasks'] }); putKV(W.env, 'bassam_platform_v1', PL);
    await check('الوحدةُ مطفأةٌ على مستوى المنصة');
    PL.mods.off = []; putKV(W.env, 'bassam_platform_v1', PL);
    const l = await listOf(W, me.ck); assert.equal(l.j.me.linked, true, 'تعود بعودة الصفحة'); assert.ok(l.j.rows.length > 0);
    assert.equal(rowsOf(stored(W.env, KT), ME.eid).find(q => q.r[13] === 1760000000101).r[11], null, 'لم يُقبل شيءٌ أثناء الإطفاء');
  });

  test(M + 'P0 — الواجهة: طبقةُ «مهامي» (src/services/545-task-self.js) في المتصفح على الخادم الحقيقي — كلُّ صفٍّ في قسم · الفشلُ لا يُعلَن نجاحاً', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login('0000000101', '70101');
    const B = browser(W, me.ck);
    await B.MT.load(true);
    const T = { y: +DAY.split('-')[0], m: +DAY.split('-')[1], d: +DAY.split('-')[2] };
    let v = B.MT.view(Date.now(), T);
    assert.equal(v.linked, true); assert.equal(v.n, 10, 'عشرُ مهامٍ لي');
    /* أقسامُ المرحلة الثانية (أُعيدت · بانتظار المراجعة) تُعدّ معها — ونسخةُ المرحلة الأولى (حزمةُ 242 SR-2) بأقسامها الخمسة */
    assert.equal((v.sections || ['today', 'running', 'upcoming', 'overdue', 'history']).reduce((a, k) => a + v[k].length, 0), v.n, 'لا صفَّ يسقط');
    assert.ok(v.upcoming.some(r => r.id === 1760000000104), 'مهمةُ الغد في «قادمة»');
    assert.ok(v.overdue.some(r => r.id === 1760000000105), 'المنقضيةُ ظاهرة');
    await managerAssigns(W, dm);
    await B.MT.load();
    v = B.MT.view(Date.now(), T);
    assert.ok(v.today.some(r => r.id === NEW_ID), 'المهمةُ الجديدة من المدير ظاهرةٌ بعد إعادة القراءة (تنبيهٌ ⇒ load)');
    const nw = v.today.find(r => r.id === NEW_ID);
    const a = await B.MT.act(nw, 'accept'); assert.equal(a.ok, true, JSON.stringify(a));
    const id = await B.MT.uploadProof(PNG); assert.match(id, /^img_tsk[a-z0-9]+_[a-z0-9]+$/);
    const f = await B.MT.act(B.MT.view(Date.now(), T).today.find(r => r.id === NEW_ID), 'finish', { imgs: [id], note: 'تم' });
    assert.equal(f.ok, true, JSON.stringify(f));
    assert.equal(await B.MT.img(IMG_ME), PNG, 'صورةُ توثيقي القديمة');
    /* انقطاعُ الاتصال أثناء الحفظ: لا ادّعاءَ بحفظٍ لم يحدث */
    B.offline = true;
    const o = await B.MT.act(B.MT.view(Date.now(), T).today.find(r => r.id === 1760000000110), 'accept');
    /* KIVO_265 · البند 9: بلا اتصالٍ يُصطفّ الفعلُ محلياً (queued) — وبلا مخزنٍ محلي (هذا المتصفحُ المصغَّر بلا localStorage) يُعلَن 'queue' — ولا ادّعاءَ بحفظٍ في الحالين */
    assert.equal(o.ok, false); assert.ok(o.err === 'offline' || o.err === 'queued' || o.err === 'queue', o.err); assert.match(o.msg, /لم يُحفظ/);
    B.offline = false;
    assert.equal(rowsOf(stored(W.env, KT), ME.eid).find(x => x.r[13] === 1760000000110).r[11], null, 'لم يُكتب شيء');
  });

  test(M + 'P0 — صورةُ توثيقٍ قديمة بلا سجلّ ملكية (قبل imgown) يذكرها صفّي وحده ⇒ تُحسم لمخزن المهام وتُقرأ لي · ولا تُقرأ لزميل', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
    const OLD = 'img_tsklegacy_zz9';
    const S = stored(W.env, KT); const r = S[YESTERDAY].find(x => x[13] === 1760000000106); r[21].imgs.push(OLD);
    await replaceOperationalFixture(W.env,KT,S);
    // A migrated historical image has the canonical relational reference even
    // when its ownership row is absent; no retired document is recreated.
    W.env.DB.db.prepare('INSERT INTO imgref(img,k)VALUES(?,?)').run(OLD,KT);
    W.env.DB.exec("INSERT INTO imgs (k, seq, v) VALUES ('" + OLD + "', 0, '" + PNG + "')");
    assert.equal(W.env.DB.q('SELECT * FROM imgown WHERE img = ?', OLD).length, 0, 'بلا سجلّ ملكية');
    assert.equal((await W.C.api('/api/me/tasks/img?id=' + OLD, { cookie: mate.ck })).status, 403, 'الزميل ⇒ 403');
    const g = await W.C.api('/api/me/tasks/img?id=' + OLD, { cookie: me.ck });
    assert.equal(g.status, 200, 'صاحبُ الصفّ يقرؤها'); assert.equal(W.env.DB.q('SELECT st, k FROM imgown WHERE img = ?', OLD)[0].k, KT, 'حُسمت لمخزن المهام');
  });

  /* RC-3/RC-4 · توصيفٌ (يصحّ على 242 و263 وبعد الإصلاح — لأن الإصلاح لا يمسّ task.view ولا /api/img): لماذا لا يُعالَج العطل بمنح task.view */
  test(M + 'RC-3/RC-4 (توصيف): /api/img يحجب عن الموظف صورةَ توثيقه بعد ربطها · وحاملُ task.view يقرأ مهامَ الزملاء وصورَهم', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), e1 = await W.login('0000000113', '70113');   /* tst_emp1: ورقتُه tasks:view (المُثبِّت) */
    assert.equal((await W.C.api('/api/img/' + IMG_ME, { cookie: me.ck })).status, 403, 'RC-3: صاحبُ الصورة لا يقرؤها من المسار العامّ (canRead المخزن)');
    const b = (await W.C.boot(e1.ck)).boot;
    assert.ok(!Object.hasOwn(b.keys,KT),'الإقلاع لا يحمل وثيقة أعمال متقاعدة حتى لحامل view');
    const read=await W.C.api('/api/operations/read?keys='+encodeURIComponent(KT),{cookie:e1.ck}),S=read.j.resources[KT];
    assert.ok(rowsOf(S, MATE.eid).length >= 3 && rowsOf(S, ME.eid).length === 10, 'RC-4: حاملُ task.view ما زال يقرأ الصفوف المخوّل بها عبر SQL');
    assert.equal((await W.C.api('/api/img/' + IMG_MATE, { cookie: e1.ck })).status, 200, 'RC-4: ويقرأ صورةَ توثيق زميل');
  });

  /* RC-2 · توصيفٌ لمنطق «ملفي» القائم (263) — يُثبت أن الصفحة القديمة تُسقط القادمةَ والمنقضيةَ من البطاقة حتى لو وصلها المخزن،
     وأنها بلا المخزن (الموظفُ العاديّ) تقول «لا مهام». يُستبدل برقعة «ملفي» (patches/03) التي تقرأ KIVO.BassamMyTasks. */
  test(M + 'RC-1/RC-2 (توصيفُ الواجهة القديمة): «ملفي» 263 بإقلاع الموظف ⇒ لا مهام · وبالمخزن كاملاً ⇒ بطاقةُ اليوم وحده', { skip: PF263 ? false : 'منطقُ «ملفي» 263 غيرُ متاح (لا تاريخَ git للوسم KIVO_263)' }, async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw);
    const boot = (await W.C.boot(me.ck)).boot;
    const P = profileLogic((k) => k === 'bassam_tasks_v1' ? (boot.resources[KT] == null ? null : boot.resources[KT]) : null, PF263);
    const T = { y: +DAY.split('-')[0], m: +DAY.split('-')[1], d: +DAY.split('-')[2] };
    const e = { isStaff: true, T, myKey: ME.eid, keyOfTok: (x) => x, myRec: { name: ME.name } };
    const t = P._tkVals({}, e, P.state);
    assert.equal(t.tkEmpty, true, 'RC-1: الإقلاعُ بلا مخزن ⇒ «لا مهام» رغم التنبيه');
    const full = JSON.stringify(stored(W.env, KT));
    const P2 = profileLogic((k) => k === 'bassam_tasks_v1' ? full : null, PF263);
    const t2 = P2._tkVals({}, e, P2.state);
    const shown = [t2.tkFTitle].concat((t2.tkRest || []).map(x => x.title)).filter(Boolean);
    assert.ok(!shown.some(s => /غداً|أمس/.test(s)), 'RC-2: البطاقةُ تُسقط مهمةَ الغد والمنقضيةَ أمس: ' + shown.join(' | '));
  });
}

/* ── متصفحٌ مصغّر: KIVO + fetch بجلسة الموظف إلى العامل نفسه ── */
function browser(W, ck) {
  const ctx = { console, JSON, Date, Math, Promise, Object, Array, String, Number, RegExp, Error, encodeURIComponent, decodeURIComponent, setTimeout, clearTimeout };
  const B = { offline: false };
  ctx.window = ctx; ctx.KIVO = {}; ctx.__BS_BOOT = { srv: 1, cf: 1 };
  ctx.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
  ctx.addEventListener = () => {}; ctx.dispatchEvent = () => true;
  ctx.fetch = async (url, opt = {}) => {
    if (B.offline) throw new TypeError('Failed to fetch');
    const r = await W.C.req(url, { method: opt.method || 'GET', cookie: ck, headers: opt.headers, body: opt.body });
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: () => r.text(), json: () => r.json() };
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/545-task-self.js'), 'utf8'), ctx, { filename: '545-task-self.js' });
  B.MT = ctx.KIVO.BassamMyTasks;
  return B;
}
/* ── منطقُ «ملفي» الحقيقي (src/modules/profile/logic.js) في vm بتخزينٍ محليٍّ مُعطى ── */
function profileLogic(getItem, src) {
  const KIVO = {};
  const ctx = { KIVO, console, Intl, Date, Math, JSON, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt,
    localStorage: { getItem, setItem: () => {}, removeItem: () => {} }, document: { hidden: false, querySelector: () => null }, navigator: { userAgent: 'node' } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  KIVO.BassamCount = (n, w) => n + ' ' + w;
  class DCLogic { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } }
  KIVO.BassamPageKit = { base: (B) => class extends B { bsOn() { return true; } bsToast() {} bsAck() { return Promise.resolve(true); } MONTHS() { return ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢']; } } };
  ctx.DCLogic = DCLogic;
  vm.runInContext((src || fs.readFileSync(path.join(ROOT, 'src/modules/profile/logic.js'), 'utf8')) + '\n;globalThis.__C = Component;', ctx, { filename: 'profile/logic.js' });
  const c = new ctx.__C(); c.state = Object.assign({ pfPanel: '' }, c.state || {}); if (!c.MONTHS) c.MONTHS = () => ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'];
  return c;
}
