/* V7 · 53 تقويم (cal-rest · القاعدة 10 · 4): الكرتُ الواحد يقبل «hint» اختيارياً — سطراً رابعاً في التلميح بعد أسطر حالة الكرت (التمييزُ الإداري وإرشادُ الصلاحية)،
   نصّاً عادياً بلا حالةٍ ولا نمطٍ جديد. بغيابه ثلاثةُ أسطرٍ كما كان. TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadClientCal } from './cal_fx.mjs';

const React = { createElement: (t, p, ...ch) => ({ t, p, ch }) };

test('card hint: absent ⇒ the three state lines as before; present ⇒ a fourth line, same style and state', () => {
  const W = { KIVO: {}, React, Intl, Date, Math, Object, JSON, Error };
  W.window = W;
  const C = loadClientCal(W), K = W.KIVO.BassamCalCard;
  assert.ok(C && K, 'the one card component');
  for (const [kind, p] of [['day', { k: '2026-11-24' }], ['month', { ym: '2026-11' }], ['year', { y: 2026 }]]) {
    const base = { ...p, closed: true, why: 'past', T: '2026-12-01' };
    const a = K.model(kind, base), b = K.model(kind, { ...base, hint: 'فتحه يحتاج صلاحية الاعتماد — راجع مدير الإدارة' });
    assert.equal(a.title.split('\n').length, 3, kind + ': three lines without a hint');
    assert.equal(b.title.split('\n').length, 4, kind + ': four lines with a hint');
    assert.equal(b.title.split('\n')[3], 'فتحه يحتاج صلاحية الاعتماد — راجع مدير الإدارة');
    assert.equal(b.title.split('\n').slice(0, 3).join('\n'), a.title, kind + ': the state lines are unchanged');
    assert.deepEqual(b.style, a.style, kind + ': no new style'); assert.equal(b.state, a.state); assert.equal(b.closed, a.closed);
    assert.equal(K.model(kind, { ...base, hint: '   ' }).title, a.title, kind + ': a blank hint adds nothing');
    const el = K[kind]({ ...base, hint: 'TEST_ONLY hint' });
    assert.equal(el.p.title.split('\n')[3], 'TEST_ONLY hint'); assert.match(el.p['aria-label'], / · TEST_ONLY hint$/);
  }
});
