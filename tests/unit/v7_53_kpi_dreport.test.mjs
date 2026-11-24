/* V7 · 53 (ملحق مؤشرات الكانفس: ك18 · ك19) — التقرير اليومي يعامل الاحتياج والموقع الميت بقاعدة «الجولات اليومية» نفسِها.
   منطقُ الصفحة الحقيقي (src/systems/dreport/client/logic.js داخل node:vm · tests/unit/canvas_world.mjs) ببياناتٍ اصطناعية (TEST_ONLY).
   DREPORT_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world } from './canvas_world.mjs';
import { moduleLogic } from './harness.mjs';

const SRC = process.env.DREPORT_LOGIC ? fs.readFileSync(process.env.DREPORT_LOGIC, 'utf8') : moduleLogic('dreport');
const page = () => { const W = world(); return { W, c: W.logic('dreport', SRC) }; };
const REC = { d: [{ name: 'TEST_ONLY_F', zones: [{ uid: 'TEST_ONLY_z1', code: 'TEST_ONLY_Z1', off: true, needN: 2 }, { uid: 'TEST_ONLY_z2', code: 'TEST_ONLY_Z2', needN: 2 }], gates: [{ gid: 'TEST_ONLY_g1', num: '1', closed: true }], marks: [{ label: 'TEST_ONLY_M', kind: 'k', off: true }] }] };

test('ك18: احتياجُ الوردية 0 قيمةٌ حقيقية في التقرير اليومي كما في الكانفس (KIVO.BassamNeed.of) — لا رجوعَ للاحتياج العام', () => {
  const { W, c } = page();
  const el = { needN: 3, needS: { 'الوردية الثانية': 0 } };
  assert.equal(typeof c.drNeedOf, 'function', 'قاعدةُ الاحتياج في الصفحة');
  assert.equal(c.drNeedOf(el, 'الوردية الثانية'), 0, 'كان 3 (يُعدّ 0 «غير محدد»)');
  assert.equal(c.drNeedOf(el, 'الوردية الأولى'), 3, 'وردية بلا استثناء: الاحتياج العام');
  assert.equal(c.drNeedOf(el, 'الوردية الثانية'), W.KIVO.BassamNeed.of(el, 'الوردية الثانية'), 'المصدرُ الواحد مع الكانفس');
  /* حساب الصفوف في renderVals يمرّ من القاعدة نفسِها */
  assert.match(SRC, /er = function \(t\) \{[\s\S]{0,700}?return rr0\.drNeedOf\(r, o\);/);
});

test('ك19: المصلّى المعطّل ميّتٌ في التقرير اليومي كما في الكانفس (المعطّل والمغلق ميّتان في كل الصفحات)', () => {
  const { c } = page();
  const spots = c.drRoundSpots(REC);
  const z1 = spots.find((s) => s.kk === 'zones' && /Z1/.test(s.name)), z2 = spots.find((s) => s.kk === 'zones' && /Z2/.test(s.name));
  assert.ok(z1 && z2, 'المصليات في مواقع التسكين');
  assert.equal(z1.off, true, 'حالةُ التعطيل تصل المصلّى (كانت للمعلم وحده)');
  assert.equal(typeof c.drDead, 'function');
  assert.equal(c.drDead(z1), true, 'المصلّى المعطّل ميّت');
  assert.equal(c.drDead(z2), false);
  assert.equal(c.drDead(spots.find((s) => s.kk === 'gates')), true, 'الباب المغلق ميّت');
  assert.equal(c.drDead(spots.find((s) => s.kk === 'marks')), true, 'المعلم المعطّل ميّت');
  assert.match(c.drDeadMsg('zones'), /^المصلّى معطّل/);
});
