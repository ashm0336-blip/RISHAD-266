/* V7 · د6 (رصد الحالات · ر3 · ر6) — نسخةُ إدارةٍ بشكل Production القديم فيها بيانات رصد الحالات (bassam_rasd_v1 · bassam_rasd_opts_v1 نصّاً في data
   كما يكتبهما Production، ومرفقُ حالةٍ في idbImages) تُستورد بالاستيراد على أجزاء (د1–د3) بلا تحويلٍ يدوي، وتُطابَق مفتاحاً مفتاحاً وصورةً صورة.
   النسخةُ من عُدّة الاستيراد نفسِها (tests/unit/v7_d6_import_fx.mjs · oldFile small) — يُضاف إليها مفتاحا النظام هنا ولا يُمسّ مولِّدُها. TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { target, oldFile, protocol, png, readImage, NOT_TRANSFERRED } from '../../../../tests/unit/v7_d6_import_fx.mjs';
import { A, REC, OPT, key, readK, REPORTS, OPTS, report } from './rasd_fx.mjs';

const IMG = 'img_rzdtestonly_d6';

async function copyWithRasd() {
  const file = await oldFile({ small: true });
  const doc = REPORTS(5);
  doc.reports.push(report(5, { att: IMG, impact: 'حرج', type: 'ممنوعات' }));
  /* سجلٌّ قديم يحمل حقولاً تجاوزها Production (st/cAt/cBy — «حالة الحالة» المرفوضة): يبقى كما هو ولا يُقرأ منه شيء */
  doc.reports.push(report(6, { st: 'open', cAt: 1795000000000, cBy: 'TEST_ONLY_u1' }));
  file.data[REC] = JSON.stringify(doc);
  file.data[OPT] = JSON.stringify(OPTS());
  file.idbImages[IMG] = png(1400, 77);
  return { file, doc };
}

test('rasd · نسخةُ Production القديمة فيها رصد الحالات تُستورد كاملةً (استبدالٌ في إدارةٍ قائمة) وتُطابَق مفتاحاً مفتاحاً وصورةً صورة', async () => {
  const T = await target();
  try {
    const { file, doc } = await copyWithRasd();
    const P = protocol(T, T.su, file, { scope: { kind: 'dept', departmentId: A }, mode: 'replace' });
    const out = await P.run();
    assert.equal(out.begin.status, 200, out.begin.t.slice(0, 300));
    /* مفتاحا النظام ليسا مما «لن يُنقل» */
    const skip = (out.begin.j && out.begin.j.skip) || [];
    assert.ok(!skip.some((x) => x.k === REC || x.k === OPT), 'rasd keys were listed as not transferred: ' + JSON.stringify(skip));
    assert.deepEqual(skip.map((x) => x.k).sort(), Object.keys(NOT_TRANSFERRED).sort());
    assert.equal(out.inspect && out.inspect.status, 200, out.inspect && out.inspect.t.slice(0, 400));
    assert.equal(out.commit && out.commit.status, 200, out.commit && out.commit.t.slice(0, 400));
    /* مفتاحاً مفتاحاً: القيمةُ في القاعدة = النصُّ في النسخة (بلا تحويل) */
    assert.deepEqual(readK(T.DB, key(A, REC)), doc);
    assert.deepEqual(readK(T.DB, key(A, OPT)), OPTS());
    assert.deepEqual(readK(T.DB, key(A, REC)).reports.map((r) => Object.keys(r).sort().join(',')), doc.reports.map((r) => Object.keys(r).sort().join(',')));
    /* المرفقُ: الصورةُ التي يذكرها سجلُّ الحالة كُتبت بايتاً */
    const img = await readImage(T, T.su, IMG);
    assert.equal(img.status, 200, img.t.slice(0, 200));
    assert.equal(img.t, file.idbImages[IMG]);
  } finally { await T.close(); }
});
