/* RISHAD V7 P4 — answer to the independent review (low follow-up 1): the lens hosts have two sources.
   The client reads them from the lens manifests (src/plugins/lenses/<k>/manifest.json:hosts ← KIVO_MANIFEST.lenses, 331 lensHosts),
   while the server keeps a literal fallback list in two worker parts (057 enfIx · 018 permLensHosted). They are equal today; this test
   reads both from the source and fails the gate if a manifest changes its hosts and the server does not follow (or the reverse). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC } from './harness.mjs';

const ROOT = path.resolve(SRC, '..');
const LDIR = path.join(SRC, 'plugins', 'lenses');
const LENSES = fs.readdirSync(LDIR).filter((d) => fs.existsSync(path.join(LDIR, d, 'manifest.json')))
  .map((d) => ({ dir: d, m: JSON.parse(fs.readFileSync(path.join(LDIR, d, 'manifest.json'), 'utf8')) }));
const part = (f) => fs.readFileSync(path.join(ROOT, 'workers', 'parts', f), 'utf8');
/* a literal JS array of quoted strings → its items */
const items = (lit) => { const out = []; lit.replace(/['"]([^'"]*)['"]/g, (_, s) => (out.push(s), '')); return out; };
function serverLists() {
  const a = /ix\.hosts\[key\]\s*=\s*leaves\.length\s*\?\s*leaves\s*:\s*\[([^\]]*)\]/.exec(part('057-enf-index.js'));
  const b = /enfIx\(\)\.hosts\['lens\.' \+ L \+ '\.view'\]\s*\|\|\s*\[([^\]]*)\]/.exec(part('018-ancestry.js'));
  assert.ok(a, '057-enf-index.js: the literal lens-host fallback of enfIx is where this test reads it');
  assert.ok(b, '018-ancestry.js: the literal lens-host fallback of permLensHosted is where this test reads it');
  return { '057-enf-index.js (enfIx)': items(a[1]), '018-ancestry.js (permLensHosted)': items(b[1]) };
}

test('lens hosts: every lens manifest declares the hosts the server keeps literally (057 · 018)', () => {
  assert.ok(LENSES.length >= 1, 'there are lens manifests');
  const S = serverLists();
  for (const [where, list] of Object.entries(S)) {
    assert.ok(list.length >= 1, where + ': a non-empty literal list');
    for (const { dir, m } of LENSES) {
      assert.ok(Array.isArray(m.hosts) && m.hosts.length, 'plugins/lenses/' + dir + '/manifest.json declares hosts');
      assert.deepEqual(m.hosts, list, 'plugins/lenses/' + dir + '/manifest.json hosts = the server list in ' + where + ' — change both together');
    }
  }
  assert.deepEqual(S['057-enf-index.js (enfIx)'], S['018-ancestry.js (permLensHosted)'], 'the two worker parts agree');
});

test('lens hosts: the extraction is not vacuous — the assembled worker carries the same literals, and the client reads the manifest', () => {
  const W = fs.readFileSync(path.join(ROOT, 'workers', '_worker.js'), 'utf8');
  const lit = JSON.stringify(serverLists()['057-enf-index.js (enfIx)']).replace(/"/g, "'").replace(/,/g, ', ');
  assert.ok(W.includes('leaves.length ? leaves : ' + lit), 'workers/_worker.js (generated) holds the 057 literal');
  assert.ok(W.includes("|| " + lit), 'workers/_worker.js (generated) holds the 018 literal');
  const P331 = fs.readFileSync(path.join(SRC, 'permissions', '331-perm-model.js'), 'utf8');
  assert.match(P331, /function lensHosts\(L\)\{ var x = LENS_REG\.filter\(function\(z\)\{ return z\.key === L; \}\)\[0\]; return \(x && Array\.isArray\(x\.hosts\)\) \? x\.hosts\.slice\(\) : \[\]; \}/);
});
