/* KIVO_262 · CI يتبع الإصدارَ الجاري: لا رقمَ إصدارٍ مثبّتٌ في .github/workflows (كان CI على أوامر 259 بعد إصدار 261) —
   والرقمُ من مصدرٍ واحد tools/release_n.sh = src/core/270-bs-ver.js */
import { BASH } from './harness.mjs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
test('CI: لا رقمَ إصدارٍ مثبّت (pkNNN · gateallNNN · build_chain NNN · test:unit:NNN)', () => {
  const dir = path.join(ROOT, '.github', 'workflows');
  for (const f of fs.readdirSync(dir).filter(x => /\.ya?ml$/.test(x))) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    const hits = s.match(/\bpk2\d\d\b|gateall2\d\d|build_chain\.sh\s+2\d\d|test:unit:2\d\d|gate_2\d\d|KIVO_2\d\d\b/g) || [];
    assert.deepEqual(hits, [], f + ': ' + hits.join(', '));
    assert.match(s, /tools\/release_n\.sh/, f + ' يقرأ الرقم من tools/release_n.sh');
  }
});
test('tools/release_n.sh = رقمُ src/core/270-bs-ver.js', () => {
  const n = execFileSync(BASH, ['--noprofile', '--norc', path.join(ROOT, 'tools', 'release_n.sh').replace(/\\/g, '/')], { encoding: 'utf8', env: Object.assign({}, process.env, path.isAbsolute(BASH) ? { PATH: path.dirname(BASH) + path.delimiter + process.env.PATH } : {}) }).trim();
  const v = /"[0-9.]+-(\d+)"/.exec(fs.readFileSync(path.join(ROOT, 'src', 'core', '270-bs-ver.js'), 'utf8'));
  assert.ok(v && /^\d+$/.test(n)); assert.equal(n, v[1]);
});
test('CI: البوابةُ الكاملة لا تُتخطّى — غيابُ البوابة أو قائمتها الإلزامية إخفاق · pipefail عبر tee', () => {
  const s = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  const step = s.slice(s.indexOf('- name: full gate'), s.indexOf('- uses: actions/upload-artifact@v4', s.indexOf('- name: full gate')));
  assert.match(step, /shell: bash\b/, 'shell: bash ⇒ -eo pipefail');
  assert.doesNotMatch(step, /::notice::/, 'لا «تنبيه» بدل الإخفاق');
  assert.match(step, /gateall\$N\.sh[^\n]*exit 1/, 'غيابُ البوابة ⇒ exit 1');
  assert.match(step, /mandatory_\$N\.txt[^\n]*exit 1/, 'غيابُ القائمة الإلزامية ⇒ exit 1');
  assert.match(step, /gate_manifest\.py "gateall\$N\.sh" --check/, 'القائمةُ = نصُّ البوابة');
});
