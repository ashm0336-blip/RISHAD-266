/* V7 UX states — the display-only tab field (pages.json `shellTabs`: «مستودع العهد» for the fixed header) must not enter the permission
   tree, the registry or the server. Proof against develop@5add483, by digests recorded from that commit (no git needed to run):
     · pages.json without `shellTabs` is, value for value, develop's pages.json — everything the tree is built from is unchanged;
     · the registry (source JSON and its generated client block) is byte-identical to develop's, and still has its 255 active keys;
     · the server's page structure (PG_REG in the worker) is develop's text and knows nothing of the field;
     · no code reads `shellTabs` but the page-states component (the shell header).
   Digests were taken with: git show 5add483:<file> | sha256sum — and, for pages.json, the canonical JSON (sorted keys, no spaces). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = new URL('../../', import.meta.url).pathname, read = (p) => fs.readFileSync(path.join(ROOT, p));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const DEVELOP = {
  pages: '5b61666d77701f2043360bc4a83d4db6408fece898b802c69e0ad54188857528',
  registryJson: '3d21b3c7fe6ed9a7fa5894f880aaa14087828b699abb0e31f2e31ba758da32d1',
  registryBlock: '3bfd4d8c9c485368847ea91cfbed762b5d7acf064a680873f4d0fef9499c3797',
  serverPages: '39f49c1feda6098ce929b3ea41eee6c4795bbb4224be2c169896e411a56e5678',
};

test('pages.json without the display-only field is develop\'s pages.json; the field sits on one page and names a leaf that exists', () => {
  const M = JSON.parse(read('src/manifests/pages.json')), withField = M.pages.filter((p) => p.shellTabs);
  assert.deepEqual(withField.map((p) => p.key), ['emps']);
  assert.deepEqual(withField[0].shellTabs, [{ name: 'مستودع العهد', as: 'custody' }]);
  assert.ok(withField[0].subs.some((s) => s.key === 'custody' && !s.offPage), 'it follows an existing leaf of its page');
  for (const p of M.pages) delete p.shellTabs;
  assert.equal(sha(Buffer.from(canon(M))), DEVELOP.pages, 'every other value of pages.json is as on develop');
});

test('the permission registry is byte-identical to develop and keeps its 255 active keys', () => {
  assert.equal(sha(read('src/permissions/registry/registry-v24.9.json')), DEVELOP.registryJson);
  assert.equal(sha(read('src/permissions/340-registry-v24-9.js')), DEVELOP.registryBlock);
  const R = JSON.parse(read('src/permissions/registry/registry-v24.9.json'));
  assert.equal(R.registry.filter((k) => k.status === 'active').length, 255); assert.equal(R.counts.securityActive, 255); assert.equal(R.registry.length, 269);
});

test('the server page structure (PG_REG) is develop\'s and does not carry the field', () => {
  const W = read('workers/_worker.js').toString('utf8'), m = /(?:const|var|let) PG_REG\s*=\s*(\[[\s\S]*?\]);\n/.exec(W);
  assert.ok(m, 'PG_REG found'); assert.equal(sha(Buffer.from(m[1])), DEVELOP.serverPages);
  assert.equal(W.includes('shellTabs'), false);
});

test('only the shell header reads the field: no permission, auth, scope or module code mentions it', () => {
  const hits = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = dir + '/' + f.name;
      if (f.isDirectory()) { if (rel !== 'src/pages') walk(rel); continue; }
      if (/\.(js|html|json)$/.test(f.name) && read(rel).includes('shellTabs')) hits.push(rel);
    }
  })('src');
  assert.deepEqual(hits.sort(), ['src/components/555-page-states.js', 'src/manifests/255-page-manifest.js', 'src/manifests/pages.json', 'src/schemas/pages.schema.json']);
});
