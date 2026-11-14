/* RISHAD-266 · P0 — every #/<page>/<tab> address a page writes (history.replaceState in _bsHT) is registered in pages.json tabAddr,
   and every registered address points at a real sub/tab (not an off-page tab) or a page under that container.
   tabAddr is documentation only (read by 333 siteMap · admin t24Struct · tools/route_registry.py); it does not drive routing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { moduleDirs } from '../../tools/systems_paths.mjs';   /* V7 · الحزمة ب */

const SRC = process.env.KIVO_SRC || path.resolve('src');
const M = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests/pages.json'), 'utf8'));
const byNav = {}, byKey = {};
for (const p of M.pages) { byNav[p.nav || p.key] = p; byKey[p.key] = p; }
const covers = (key, tail) => { const a = M.tabAddr[key]; return a === 1 || !!(a && a[tail]); };
/* The «dash» tab of irshad/seized is shown only inside «مؤشرات الإدارة» (solo): on the page itself only «records» exists, so
   #/<page>/dash falls back to records and the page's own dash switch is unreachable. Remove when the dashboards move into
   their pages (architecture map P11). */
const SOLO_ONLY = { irshad: ['dash'], seized: ['dash'] };

function writers() {
  const out = [];
  const dirs = moduleDirs(SRC);   /* src/modules/<slug> و src/systems/<key>/client بترتيب الـslug */
  for (const m of Object.keys(dirs).sort()) {
    const f = path.join(dirs[m], 'logic.js');
    if (!fs.existsSync(f)) continue;
    const s = fs.readFileSync(f, 'utf8');
    if (!/_bsHT\s*\(/.test(s) || !/history\.replaceState/.test(s)) continue;
    const navs = [...new Set([...s.matchAll(/p\s*=\s*"#\/([a-z]+)"/g)].map((x) => x[1]))];
    const tails = new Set([...s.matchAll(/_bsHT\(\s*"([A-Za-z]+)"\s*\)/g)].map((x) => x[1]));
    for (const line of s.split('\n').filter((l) => /\bhv\s*=\s*\(x\)/.test(l))) for (const x of line.matchAll(/"([A-Za-z]+)"\s*===\s*x/g)) tails.add(x[1]);
    out.push({ module: m, navs, tails: [...tails] });
  }
  return out;
}

test('every page that writes #/<page>/<tab> is in tabAddr, with each literal tab it writes', () => {
  const W = writers();
  assert.ok(W.length >= 6, 'found the writing pages: ' + W.map((w) => w.module).join(','));
  for (const w of W) {
    assert.equal(w.navs.length, 1, w.module + ' writes one page prefix: ' + w.navs);
    const p = byNav[w.navs[0]];
    assert.ok(p, w.module + ': #/' + w.navs[0] + ' is a registered page');
    assert.ok(M.tabAddr[p.key], w.module + ': ' + p.key + ' is in tabAddr');
    for (const t of w.tails.filter((x) => !(SOLO_ONLY[p.key] || []).includes(x))) assert.ok(covers(p.key, t), w.module + ': #/' + w.navs[0] + '/' + t + ' is in tabAddr');
  }
  /* admin writes through _hashTab("<page>", tab); sysadmin is outside the page registry by nature (platform administration) */
  const adm = fs.readFileSync(path.join(SRC, 'modules/admin/logic.js'), 'utf8');
  const hp = [...new Set([...adm.matchAll(/_hashTab\("([a-z]+)"/g)].map((x) => x[1]))];
  assert.ok(hp.includes('admin'), 'admin writes #/admin/<tab>');
  for (const nav of hp.filter((n) => n !== 'sysadmin')) assert.equal(M.tabAddr[byNav[nav].key], 1, '#/' + nav + '/<tab> is in tabAddr');
});

test('every tabAddr entry names a real page and real, on-page tabs or pages under it', () => {
  for (const [k, a] of Object.entries(M.tabAddr)) {
    const p = byKey[k];
    assert.ok(p, 'tabAddr.' + k + ' is a page key');
    if (a === 1) continue;
    const onPage = (p.subs || []).concat((p.tabs || []).filter((t) => !t.offPage)).map((t) => t.key);
    const under = M.pages.filter((q) => q.under === k).map((q) => q.key);
    for (const t of Object.keys(a)) {
      assert.ok(onPage.includes(t) || under.includes(t), 'tabAddr.' + k + '.' + t + ' is an on-page tab or a page under ' + k);
      assert.ok(!(SOLO_ONLY[k] || []).includes(t), 'tabAddr.' + k + '.' + t + ' is not a solo-only tab');
    }
  }
});
