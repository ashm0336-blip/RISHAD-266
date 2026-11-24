/* V7 · 53 (ملحق مؤشرات الكانفس: ك21–ك23) — صفحة المؤشرات («مؤشرات الإشغال» و«مؤشرات المصليات») على منطق الصفحة الحقيقي
   (src/systems/daily/client/logic.js: _kData · _kPaneZn · _dsKpiVals داخل node:vm) بجولاتٍ اصطناعية (TEST_ONLY).
   DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { covWorld } from './v7_53_kpi_world.mjs';

const z = (uid, code, o = {}) => Object.assign({ uid: 'TEST_ONLY_' + uid, code }, o);
/* يومان: u1 رمزُه تغيّر (A ← B) · u2 معطّلٌ في اليوم الثاني · u3 يشترك مع u2 في الرمز A */
const DAY1 = [z('u1', 'A', { off: true, pc: { fajr: { n: 10, cap: 100 } } }), z('u2', 'A', { pc: { fajr: { n: 90, cap: 100 } } }), z('u3', 'A', { off: true })];
const DAY2 = [z('u1', 'B', { pc: { fajr: { n: 1, cap: 10 } } }), z('u2', 'A', { off: true }), z('u3', 'A', { off: true })];
const days = (order) => order.map((d, i) => ({ rec: { d: [{ zones: JSON.parse(JSON.stringify(d)) }] }, d: i + 1, y: 1448, m: 6, k: 14480600 + i + 1 }));

test('ك21: «إجمالي المصليات المفعّلة» يعدّ بالمعرّف الفريد — والحالة بقاعدةٍ ثابتة لا يغيّرها ترتيبُ الأيام · والتلميح يذكر معنى الرقم', () => {
  const { c } = covWorld({});
  const a = c._kData(days([DAY1, DAY2]), [1, 2]), b = c._kData(days([DAY2, DAY1]), [1, 2]);
  assert.equal(a.Z, 3, '3 مصليات مميَّزة بالمعرّف (الرمزُ المتغيّر لا يضخّم والمشترَك لا يُدمج)');
  assert.equal(a.ZON, 2, 'u1 وu2 فُعِّلا في يومٍ على الأقل · u3 معطّلٌ دائماً');
  assert.deepEqual([b.Z, b.ZON, b.ZOFF], [a.Z, a.ZON, a.ZOFF], 'لا يتغيّر بترتيب الأيام');
  const html = c._kPaneZn(a);
  assert.match(html, /title="المصليات المميَّزة بمعرّفها في الفترة المختارة — المصلّى مفعّل إن فُعِّل في يومٍ واحدٍ منها على الأقل"/);
});

function ticker(st = {}) {
  const { c, h } = covWorld({});
  c._h2n = (x) => ({ html: x });
  c.state = Object.assign({}, c.state, { dsKpiSub: 'ov', rounds: { [h.y + '-' + h.m + '-1']: { d: [{ zones: JSON.parse(JSON.stringify(DAY1)) }] }, [h.y + '-' + h.m + '-2']: { d: [{ zones: JSON.parse(JSON.stringify(DAY2)) }] } } }, st);
  return c._dsKpiVals().dsTicker;
}

test('ك22: «المصليات» في شريط المؤشرات عددُ المصليات (بالمعرّف) لا سجلاتُ مصلى-يوم — والسجلاتُ في التلميح', () => {
  const t = ticker(), m = t.find((x) => x.n === 'المصليات');
  assert.ok(m, 'المؤشر «المصليات»');
  assert.equal(m.v, '3', 'ثلاثة مصليات (كان 6 = سجلات مصلى-يوم)');
  assert.match(m.tip, /سجلات مصلى-يوم: 6/);
});

test('ك23: رقمٌ واحد للإشغال في الصفحة هو الموزون — لا «متوسط الإشغال» البسيط', () => {
  const t = ticker();
  assert.ok(!t.some((x) => x.n === 'متوسط الإشغال'), 'لا متوسطَ بسيطاً باسم الإشغال');
  const w = t.find((x) => x.n === 'الإشغال الموزون');
  assert.ok(w, '«الإشغال الموزون» في الشريط');
  /* (10 + 90 + 1) ÷ (100 + 100 + 10) = 48.1٪ — والبسيط (10 + 90 + 10) ÷ 3 = 36.7٪ */
  assert.equal(w.v, '48٪');
  const { c } = covWorld({});
  assert.equal(c._kData(days([DAY1, DAY2]), [1, 2]).occ, 48.1, 'الرقمُ نفسُه في «الإشغال الموزون» بلوحة الإشغال');
});
