/* V7 · 53 (REVIEW 44 · bug 3): the a11y enhancer (660) names a clickable div (role=button) from its text. The Admin trim (20032693) removed the
   whitespace between tags, and textContent glued the spans («👥موظفو الإدارةحاوية…»), so the screen-reader name of every «حاوية … تنبيهات» row was
   wrong (core02_admin_functions: 9 groups «not reachable»). The name now has a space at every element boundary. Real 660 code on a TEST_ONLY tree. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './harness.mjs';

const src = fs.readFileSync(path.join(ROOT, 'src/components/660-a11y-enhancer.js'), 'utf8');
const fn = (name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && !--d) break; } return src.slice(i, j + 1); };
const { clean, words } = new Function(fn('clean') + '\n' + fn('words') + '\nreturn { clean, words };')();
const T = (v) => ({ nodeType: 3, nodeValue: v }), E = (...k) => { const n = { nodeType: 1, kids: k }; k.forEach((c, i) => (c.nextSibling = k[i + 1] || null)); n.firstChild = k[0] || null; return n; };

test('660: the name of a clickable row keeps the words of its spans apart when the template has no whitespace between tags', () => {
  const row = E(E(T('👥')), E(T('TEST_ONLY موظفو الإدارة')), E(T('حاوية')), E(), E(T('٢٣ من ٢٤ تنبيهاً')));
  assert.equal(clean(words(row)), '👥 TEST_ONLY موظفو الإدارة حاوية ٢٣ من ٢٤ تنبيهاً');
  assert.equal(clean(words(E(T('TEST_ONLY a'), E(T('b')), T('c')))), 'TEST_ONLY a b c', 'text nodes and elements in order');
  assert.equal(clean(words(E(T('TEST_ONLY نص واحد')))), 'TEST_ONLY نص واحد', 'one text node: unchanged');
  assert.match(src, /var kn=clean\(words\(e2\)\)\|\|clean\(e2\.getAttribute\("title"\)\);/, 'the enhancer uses it for role=button names');
});
