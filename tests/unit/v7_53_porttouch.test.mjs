/* V7 · 53 · REVIEW item 10 (group «porttouch») — Production wave 2 KD-09 in the daily zones KPI («مؤشرات المصليات» of the daily logic).
   The demo data of the browser test has every zone at 100٪, so the amber chip (< 80٪) of this pane is proven here on the real daily
   logic in node:vm (TEST_ONLY synthetic numbers): the chip text follows its fill — amber takes --warning-on-strong (dark text on the
   light dark-theme amber, white in light), green and gold keep white. The dstats chips are measured live in
   tests/browser/v7_53_porttouch.test.mjs (KD-09). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { moduleLogic } from './harness.mjs';

/* the chip helpers h (fill) and hOn (text) of _kPaneZn, cut from the real logic and evaluated as written */
function helpers() {
  const src = moduleLogic('daily');
  const i = src.indexOf('_kPaneZn(t) {');
  assert.ok(i >= 0, '_kPaneZn');
  const body = src.slice(i, src.indexOf('\n  _k', i + 10));
  const h = /\n\s*h = \(t\) => (\(t >= 90 \? "#15803d" : t < 80 \? "#C9702A" : e\)),/.exec(body);
  const on = /\n\s*hOn = \(t\) => (\([^\n]*\)),/.exec(body);
  return { body, h: h && vm.runInNewContext('(e) => (t) => ' + h[1])('#8A6F35'), hOn: on && vm.runInNewContext('(t) => ' + on[1]) };
}

test('KD-09 · «مؤشرات المصليات»: the coverage chip text follows its fill — amber (< 80٪) takes --warning-on-strong, green and gold keep white', () => {
  const { body, h, hOn } = helpers();
  assert.ok(h, 'the fill helper h');
  assert.ok(hOn, 'the text helper hOn next to h');
  for (const [p, fill, txt] of [[95, '#15803d', 'var(--fg-xffffff)'], [85, '#8A6F35', 'var(--fg-xffffff)'], [79.9, '#C9702A', 'var(--warning-on-strong)'], [0, '#C9702A', 'var(--warning-on-strong)']]) {
    assert.equal(h(p), fill, p + '٪ fill'); assert.equal(hOn(p), txt, p + '٪ text');
  }
  /* both chips of the pane (per zone row and the total row) take their text from hOn — no white literal left on an h() fill */
  assert.equal((body.match(/font-weight:800;color:" \+\n\s+hOn\((a|r)\.onP\) \+\n\s+";background:" \+\n\s+h\(\1\.onP\) \+/g) || []).length, 2);
  assert.doesNotMatch(body, /font-weight:800;color:var\(--fg-xffffff\);background:" \+\n\s+h\(/);
});
