/* KIVO_265 · نافذةُ التنفيذ (قرارُ المالك 2026-10-19 — «تصحيحٌ لمنطقٍ قائم» · البند 1 من قائمة صفحة المهام) — على العامل الحقيقي بالوضعين:
     · x.win من «إعدادات متقدمة» في الإنشاء والتعديل (win {early, late}) · الحدودُ 0–240 د · 0–24 س · null = الافتراضي (لا بدء مبكر · تسليم حتى ساعتين)
     · البدء: قبل الموعد مرفوضٌ 409 early إلا بما سمح به early · القبولُ (ack) حرٌّ في أيّ وقت
     · التسليم: بعد المهلة + late مرفوضٌ 409 late (والمسودّةُ doc تبقى) · وداخل السماح يُقبل ويُسجَّل «متأخر»
     · المهمةُ غيرُ المبدوءة «منقضية» بعد المهلة + late لا بعد المهلة وحدها (late 0 ⇒ expired فور المهلة)
     · الأداءُ (العمود 6) من المهلة: قبلها «في الوقت/مبكر» · بعدها «متأخر» · وإعادةُ الإسناد تنقل win */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, TAG, stored, putKV, hij, HR } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const MIN = 60e3;
async function mk(W, ck, o) {
  const c = await post(W, ck, '/api/tasks/create', Object.assign({ k: hij(o.s), t: TAG + ' ' + o.t, s: o.s, e: o.e, asg: [ME.eid], rv: 'none' }, o.win === undefined ? {} : { win: o.win }));
  assert.equal(c.status, 200, JSON.stringify(c.j)); return { k: c.j.rows[0].k, id: c.j.rows[0].id };
}
const rowOf = (W, id) => Object.values(stored(W.env, KT)).flat().find((r) => Array.isArray(r) && r[13] === id);
const mine = async (W, ck, id) => ((await get(W, ck, '/api/me/tasks')).j.rows || []).find((r) => String(r.id) === String(id));

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + 'الإنشاء: win يُحفظ في العمود 23 ويظهر للموظف (from/to) · الحدودُ تُرفض 400 · null = الافتراضي · ويُعدَّل من /api/tasks/settings', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const s = Date.now() + 3 * HR, e = s + HR;
    const a = await mk(W, dm.ck, { t: 'win', s, e, win: { early: 15, late: 1 } });
    const r = rowOf(W, a.id); assert.deepEqual(r[23].win, { early: 15, late: 1 });
    const v = await mine(W, me.ck, a.id);
    assert.equal(v.win.early, 15); assert.equal(v.win.late, 1); assert.equal(v.win.from, s - 15 * MIN); assert.equal(v.win.to, e + HR); assert.equal(v.win.set, 1);
    const b = await mk(W, dm.ck, { t: 'def', s, e });
    assert.ok(!rowOf(W, b.id)[23].win, 'بلا win ⇒ لا حقلَ'); const vb = await mine(W, me.ck, b.id);
    assert.equal(vb.win.early, 0); assert.equal(vb.win.late, 2); assert.equal(vb.win.from, s); assert.equal(vb.win.to, e + 2 * HR); assert.equal(vb.win.set, 0);
    for (const bad of [{ early: 241 }, { late: 25 }, { early: -1 }, { early: 'x' }, { late: 1, foo: 1 }, 'x'])
      assert.equal((await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' bad', s, e, asg: [ME.eid], rv: 'none', win: bad })).status, 400, JSON.stringify(bad));
    assert.equal((await post(W, dm.ck, '/api/tasks/settings', { k: a.k, id: a.id, ekey: ME.eid, win: { early: 0, late: 0 } })).status, 200);
    assert.deepEqual(rowOf(W, a.id)[23].win, { early: 0, late: 0 });
    assert.equal((await post(W, dm.ck, '/api/tasks/settings', { k: a.k, id: a.id, ekey: ME.eid, win: null })).status, 200);
    assert.ok(!rowOf(W, a.id)[23].win, 'null يعيد الافتراضي');
    assert.equal((await post(W, dm.ck, '/api/tasks/settings', { k: a.k, id: a.id, ekey: ME.eid, win: { late: 99 } })).status, 400);
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'edited'", KT)[0].n >= 2, true, 'حدثُ تعديلٍ لكل حفظ');
  });

  test(M + 'البدء: قبل الموعد 409 early (الافتراضي) · داخل سماح early يُقبل · القبولُ (ack) حرٌّ قبل الموعد', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const s = Date.now() + 30 * MIN, e = s + HR;
    const a = await mk(W, dm.ck, { t: 'exact', s, e });
    const x = await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'start' });
    assert.equal(x.status, 409); assert.equal(x.j.err, 'early'); assert.match(x.j.msg, /قبل موعد المهمة/);
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'ack' })).status, 200, 'الاستلامُ حرّ');
    assert.ok(!rowOf(W, a.id)[11], 'لم يبدأ');
    const b = await mk(W, dm.ck, { t: 'early20', s, e, win: { early: 20 } });
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: b.k, id: b.id, act: 'start' })).status, 409, 'بقي 30 د > 20 د');
    const c = await mk(W, dm.ck, { t: 'early45', s, e, win: { early: 45 } });
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: c.k, id: c.id, act: 'start' })).status, 200, '45 د تسمح');
    assert.ok(rowOf(W, c.id)[11], 'بدأ');
    const v = await mine(W, me.ck, b.id); assert.equal(v.ph, 'upcoming'); assert.equal(v.win.from, s - 20 * MIN);
  });

  test(M + 'التسليم: بعد المهلة + late مرفوضٌ 409 late والمسودّةُ تبقى · داخل السماح يُقبل «متأخر» · late 0 ⇒ منقضيةٌ فور المهلة ولا بدء', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const now = Date.now();
    /* المهلةُ قبل ساعةٍ ونصف · الافتراضيُّ late 2 ⇒ داخل السماح: يبدأ ويسلّم ويُسجَّل «متأخر» */
    const a = await mk(W, dm.ck, { t: 'grace', s: now - 3 * HR, e: now - 1.5 * HR });
    assert.equal((await mine(W, me.ck, a.id)).ph, 'new', 'ليست منقضية داخل السماح');
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'start' })).status, 200);
    const sub = await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'submit', note: TAG + ' تم' });
    assert.equal(sub.status, 200, JSON.stringify(sub.j)); const ra = rowOf(W, a.id);
    assert.equal(ra[3], 'done'); assert.equal(ra[6][0], 'late'); assert.match(ra[6][1], /متأخر/);
    /* المهلةُ قبل ثلاث ساعات · late 2 ⇒ خارج السماح: منقضيةٌ ولا بدء */
    const b = await mk(W, dm.ck, { t: 'late-expired', s: now - 5 * HR, e: now - 3 * HR });
    assert.equal((await mine(W, me.ck, b.id)).ph, 'expired');
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: b.k, id: b.id, act: 'start' })).j.err, 'expired');
    /* late 0: المهلةُ قبل دقيقتين ⇒ منقضيةٌ فوراً */
    const c = await mk(W, dm.ck, { t: 'late0', s: now - HR, e: now - 2 * MIN, win: { late: 0 } });
    assert.equal((await mine(W, me.ck, c.id)).ph, 'expired'); assert.equal((await mine(W, me.ck, c.id)).win.to, now - 2 * MIN);
    /* بدأ في وقته ثم انقضى سماحُ التسليم: التسليمُ 409 late · المسودّةُ doc تُقبل */
    const d = await mk(W, dm.ck, { t: 'late1', s: now - 4 * HR, e: now - 2 * HR, win: { late: 1 } });
    const S = stored(W.env, KT); const rd = Object.values(S).flat().find((r) => Array.isArray(r) && r[13] === d.id); rd[11] = now - 3 * HR; rd[3] = 'in_progress';
    putKV(W.env, KT, S);
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: d.k, id: d.id, act: 'doc', note: TAG + ' مسودّة' })).status, 200, 'المسودّةُ تبقى');
    const l = await post(W, me.ck, '/api/me/tasks/act', { k: d.k, id: d.id, act: 'submit', note: TAG + ' تم' });
    assert.equal(l.status, 409); assert.equal(l.j.err, 'late'); assert.match(l.j.msg, /1 س بعد المهلة/);
    assert.equal(rowOf(W, d.id)[3], 'in_progress');
  });

  test(M + 'الأداءُ من المهلة: تسليمٌ قبل المهلة بعُشر النافذة فأكثر «مبكر» · قربَها «في الوقت» — لا من القبول + المدة · وإعادةُ الإسناد تنقل win', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const now = Date.now();
    /* نافذةٌ 10 ساعات والمهلةُ بعد 8 ساعات ⇒ التسليمُ الآن مبكرٌ (قبلها بـ8 س ≥ ساعة) — بالقاعدة القديمة (مدة 600 د من القبول) كان «في الوقت» */
    const a = await mk(W, dm.ck, { t: 'early', s: now - 2 * HR, e: now + 8 * HR });
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'start' })).status, 200);
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'submit', note: TAG + ' تم' })).status, 200);
    const ra = rowOf(W, a.id); assert.equal(ra[6][0], 'early'); assert.match(ra[6][1], /مبكر/);
    /* المهلةُ بعد دقيقتين من نافذة ساعتين ⇒ «في الوقت» */
    const b = await mk(W, dm.ck, { t: 'ontime', s: now - 2 * HR, e: now + 2 * MIN, win: { early: 0, late: 2 } });
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: b.k, id: b.id, act: 'start' })).status, 200);
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: b.k, id: b.id, act: 'submit', note: TAG + ' تم' })).status, 200);
    assert.equal(rowOf(W, b.id)[6][0], 'on_time');
    /* إعادةُ الإسناد: النسخةُ الجديدة تحمل win نفسَها */
    const c = await mk(W, dm.ck, { t: 'reasg', s: now + HR, e: now + 2 * HR, win: { early: 30, late: 0 } });
    const re = await post(W, dm.ck, '/api/tasks/reassign', { k: c.k, id: c.id, from: ME.eid, to: MATE.eid, why: TAG + ' نقل', force: true });
    assert.equal(re.status, 200, JSON.stringify(re.j));
    const nr = Object.values(stored(W.env, KT)).flat().find((r) => Array.isArray(r) && r[14] === MATE.eid && r[0] === TAG + ' reasg' && r[23] && r[23].from);
    assert.ok(nr, 'النسخةُ الجديدة'); assert.deepEqual(nr[23].win, { early: 30, late: 0 });
  });
}
