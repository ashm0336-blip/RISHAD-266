/* V7 · 53 (الفحص الحي البند 2) — البحثُ عن جذر الـ500 «تحت كتابات متزامنة» على العامل الحقيقي (Node + D1Shim · بيانات TEST_ONLY).
   خمسةَ عشرَ مساراً متزامناً (ثلاثةٌ لكلّ موردٍ تشغيلي: الخيارات · الجولات «وضعُ موظفٍ على موقع» · الجدول · الموظفون · التقرير اليومي) كلٌّ يقرأ ثم يحفظ
   بغلاف العمليات، وطلبٌ واحدٌ يُرسل ثلاثاً في اللحظة نفسها (المعرّفُ نفسُه). النتيجة: لا 5xx — كلُّ حفظٍ 200 أو تعارضٌ مسمّى 409، والطلبُ المكرَّر
   يُحسم «مكرَّراً» من إيصاله. فالتزامنُ وحدَه لا يُنتج 500 في منطق الخادم؛ والـ500 الحيُّ استثناءُ D1 نفسِه (ملحق 4: سقفُ 32MiB للاستدعاء
   حين يُسقط حفظٌ مرجعَ صورة — مجموعة «periods»)، يصل `save-failed`/`worker-error`. هذا الاختبار حارسٌ يمنع أن يصير التزامنُ مصدراً للـ500. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, operationSaveBody } from './world_fx.mjs';

const P = 'bsdept:tst_d1:';
const MUT = {
  bassam_options_v1: (v, n) => { v.work = (v.work || []).filter((x) => !/^TEST_ONLY w/.test(x)).concat(['TEST_ONLY w' + n]); return v; },
  bassam_rounds_v1: (v, n) => { const z = v[Object.keys(v)[0]].d[0].zones[1]; z.emp = n % 2 ? ['tst_e_emp1'] : []; return v; },
  bassam_staffing_v3: (v) => { const m = v[Object.keys(v)[0]]; const e = m[Object.keys(m)[0]]; e.muk = !e.muk; return v; },
  bassam_employees_v1: (v, n) => { v[0].name = 'TEST_ONLY n' + n; return v; },
  bassam_dreport_v1: (v) => { const r = v[Object.keys(v)[0]].shifts['TST-A'].roster[0]; r.st = r.st === 'pr' ? 'ab' : 'pr'; return v; },
};
test('concurrent operational saves on the real worker: no 5xx — every save is 200 or a named 409; one request sent three times at once is settled once', async () => {
  const { env, C, su } = await world({ mode: 'enforce' });
  const quiet = [console.log, console.warn, console.error]; console.log = console.warn = console.error = () => {};
  try {
    const read = (k) => C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: su.ck });
    const seen = [];
    let n = 0;
    const loop = async (res, times) => { const k = P + res; for (let t = 0; t < times; t++) {
      const r = await read(k); seen.push(['read', r.status, r.j.err || '']); if (r.status !== 200) continue;
      const v = MUT[res](JSON.parse(JSON.stringify(r.j.resources[k])), ++n);
      const s = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: operationSaveBody(env, '/api/save', { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: r.j.base[k] }, ack: 2 }) });
      seen.push([res, s.status, s.j.err || '']);
    } };
    await Promise.all(Object.keys(MUT).flatMap((k) => [loop(k, 6), loop(k, 6), loop(k, 6)]));
    const bad = seen.filter((x) => x[1] >= 500);
    assert.deepEqual(bad, [], 'no 5xx under concurrent writes');
    assert.ok(seen.filter((x) => x[0] !== 'read').every((x) => x[1] === 200 || x[1] === 409), JSON.stringify(seen.filter((x) => x[1] !== 200 && x[1] !== 409)));
    assert.ok(seen.some((x) => x[0] !== 'read' && x[1] === 200), 'saves did go through');
    /* the same request three times at once */
    const k = P + 'bassam_options_v1', r = (await read(k)).j, v = r.resources[k]; v.work = v.work.concat(['TEST_ONLY once']);
    const body = operationSaveBody(env, '/api/save', { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: r.base[k] }, ack: 2 });
    const same = await Promise.all([1, 2, 3].map(() => C.api('/api/save', { method: 'POST', cookie: su.ck, body })));
    assert.deepEqual(same.map((s) => s.status), [200, 200, 200]);
    assert.equal(same.filter((s) => s.j.duplicate).length, 2, 'two answered from the receipt — written once');
    assert.equal((await read(k)).j.resources[k].work.filter((x) => x === 'TEST_ONLY once').length, 1);
  } finally { [console.log, console.warn, console.error] = quiet; }
});
