/* V7 · 53 (ملحق 6 · طلبا المنسّق أ و ب):
   (أ) لوحةُ الكثافة: حقولُ القراءة (عدد المصلين · نسبة الإشغال · أسهمُها) كانت قابلةً للكتابة لدور «مشاهدة» فيرفض الخادمُ الحفظ —
       الآن للعرض فقط (disabled) لمن لا يملك تعديلَ المتابعة اليومية أو مفتاحَ lens.dens.reading.record، ولا تكتب ولو استُدعيت.
   (ب) «سجل الحركة»: زرُّ تصفيةِ نوعٍ تملكه عدسةٌ مطفأةٌ للوحدة («المسارات») كان يظهر — يُخفى بفحص الخريطة نفسِه (BassamPerm.lensOn).
   منطقُ «المتابعة اليومية» الحقيقيّ (canvas_world) فوق نسخةٍ بشكل Production (oldFile({small:true})) · خدمةُ السجلّ الحقيقية (290) · TEST_ONLY.
   DAILY_LOGIC / KIVO_AUDIT=<مسار> يبدّلان الملفين لإثبات الإخفاق على السابق. */
import './clock.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';
import { world } from './canvas_world.mjs';
import { operations } from './operational_ui_fx.mjs';
import { oldFile } from './v7_d6_import_fx.mjs';

const DAILY = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
const AUDIT = process.env.KIVO_AUDIT || path.join(SRC, 'services', '290-activity-log.js');
const clone = (v) => JSON.parse(JSON.stringify(v));

async function densPage(perm) {
  const f = await oldFile({ small: true }), plan = JSON.parse(f.data.bassam_plan_v1), src = JSON.parse(f.data.bassam_rounds_v1);
  const k0 = Object.keys(src).find((k) => /^\d+-\d+-\d+$/.test(k) && src[k].d), rounds = { 'm:1448-5': { ap: 0 }, '1448-5-9': { ...clone(src[k0]), ap: 0 } };
  rounds['1448-5-9'].d.forEach((x) => delete x.ap);
  const W = world(), c = W.logic('daily', DAILY);
  const op = operations({ bassam_plan_v1: plan, bassam_rounds_v1: rounds, bassam_zone_opts_v1: {} });
  W.KIVO.__BS_SRV = { ...(W.KIVO.__BS_SRV || {}), operations: op.service, rev: () => 0 };
  W.KIVO.BassamPerm = { ...W.KIVO.BassamPerm, ...perm };
  c.bsToast = () => {};
  c.state = { ...c.state, year: 1448, month: 5, day: 9, floor: 0, rounds, lens: 'density', panelTab: 'zones', tool: 'select', dsTab: 'rounds', dsAsn: false, dview: { x: 0, y: 0, w: 1000, h: 600 }, dsSel: { t: 'zone', i: 0 }, selMulti: [0], prayer: 'fajr' };
  return { W, c, op };
}
const ev = (v) => ({ target: { value: v }, preventDefault() {}, stopPropagation() {} });

test('ملحق 6 · أ — لوحةُ الكثافة: «مشاهدة» يرى القراءة للعرض فقط ولا يكتب · المحرِّرُ يكتب', async () => {
  /* مشاهدة: daily:view وحده */
  {
    const { c, op } = await densPage({ can: (k, a) => k === 'daily' && (a || 'view') === 'view', key: () => false });
    const v = c.renderVals();
    assert.equal(v.selDensityPanel, true, 'لوحةُ القراءة معروضة');
    assert.equal(v.occRO, true, 'حقولُ القراءة للعرض فقط');
    v.onOccPct(ev('55')); v.onOccN && v.onOccN(ev('12'));
    await new Promise((r) => setImmediate(r));
    assert.equal(op.control.stages.length, 0, 'لا محاولةَ حفظٍ يرفضها الخادم');
  }
  /* تعديلٌ بلا مفتاح تسجيل القراءة */
  {
    const { c } = await densPage({ can: () => true, key: (k) => k !== 'lens.dens.reading.record' });
    assert.equal(c.renderVals().occRO, true, 'بلا lens.dens.reading.record: للعرض فقط');
  }
  /* المحرِّر */
  {
    const { c, op } = await densPage({ can: () => true, key: () => true });
    const v = c.renderVals();
    assert.equal(v.occRO, false, 'المحرِّرُ يكتب');
    v.onOccPct(ev('55'));
    for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
    assert.equal(op.control.stages.length, 1, 'وتُحفظ قراءتُه');
  }
});

function audit(lensOn) {
  const ctx = { KIVO: { BassamPerm: { lensOn, platOff: () => [] }, BassamDepts: { active: () => 'tst_d1' } }, console, setTimeout: () => 0, clearTimeout() {}, Date, JSON, Math };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(AUDIT, 'utf8'), ctx, { filename: '290-activity-log.js' });
  return ctx.KIVO.BassamAudit.ET_FILTER.map((o) => o[0]);
}
test('ملحق 6 · ب — «سجل الحركة»: زرُّ تصفية العدسة المطفأة للوحدة لا يُعرض (فحصُ الخريطة نفسُه)', () => {
  const on = audit(() => true);
  assert.ok(['zone', 'gate', 'mark', 'path'].every((k) => on.includes(k)), 'العدساتُ كلُّها مفعّلة: الأزرارُ كلُّها');
  const off = audit((k) => k !== 'paths');
  assert.equal(off.includes('path'), false, '«المسارات» لا يظهر والعدسةُ مطفأة');
  assert.ok(['zone', 'gate', 'mark', 'site', 'round'].every((k) => off.includes(k)), 'وما سواها باقٍ');
  const none = audit((k) => !['zones', 'gates', 'marks', 'paths'].includes(k));
  assert.deepEqual(['zone', 'gate', 'mark', 'path'].filter((k) => none.includes(k)), [], 'كلُّ زرٍّ لعدسةٍ مطفأة يُخفى');
});
