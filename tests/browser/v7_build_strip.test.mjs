/* V7 · build strip — in a real browser, every shipped page template builds the same DOM as its source.
   The build removes comments from the page texts (tools/strip_comments.py). Here Chromium parses both texts the way dc-runtime does
   (the text between <x-dc> and the last </x-dc>, set as a <template>'s innerHTML — once as written and once with the runtime's
   table/select/helmet renames) and the two trees must be identical once the source's comment nodes are taken out: same elements,
   same attributes, same text, character for character. Each <style> must give the same CSS rules (CSSOM), and the whole
   documents must agree the same way under DOMParser (what parseDcText uses to find the logic script). No server, no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lab_browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
assert.ok(process.env.KIVO_DIST, 'Set KIVO_DIST to the current tested build');
const DIST = path.resolve(ROOT, process.env.KIVO_DIST), SRC = process.env.KIVO_SRC || path.join(ROOT, 'src');
const ORDER = JSON.parse(fs.readFileSync(path.join(SRC, 'blocks.json'), 'utf8')).pages.order;
const PAGES = path.join(SRC, JSON.parse(fs.readFileSync(path.join(SRC, 'layout.json'), 'utf8')).pages);
const manifest = JSON.parse(fs.readFileSync(DIST + '.build.json', 'utf8')), retained = new Set(manifest.retainedFiles || []);
const built = (name) => {
  const hit = Object.keys(manifest.files).filter((f) => !retained.has(f) && new RegExp('^assets/pages/' + name.replace(/ /g, '-') + '\\.[0-9a-f]{10}\\.dc\\.txt$').test(f));
  assert.equal(hit.length, 1, name);
  return fs.readFileSync(path.join(DIST, hit[0]), 'utf8');
};
const STUB = '/* KIVO · precompiled — logic in *.logic.js */';
const source = (name) => fs.readFileSync(path.join(PAGES, name + '.dc.html'), 'utf8')
  .replace(/(<script(?: type="text\/x-dc")? data-dc-script[^>]*>)([\s\S]*?)(<\/script>)/g, (m, a, b, c) => a + STUB + c);

test('every shipped page template parses to the DOM of its source minus comment nodes; styles give the same rules', { timeout: 300000 }, async () => {
  const b = await chromium.launch();
  try {
    const page = await (await b.newContext()).newPage();
    await page.goto('about:blank');
    let comments = 0, elements = 0, rules = 0;
    for (const name of ORDER) {
      const r = await page.evaluate(([src, out]) => {
        const slice = (t) => { const o = /<x-dc(?:\s[^>]*)?>/.exec(t), c = t.lastIndexOf('</x-dc>'); return t.slice(o.index + o[0].length, c); };      /* parseDcText */
        const RAW = ['select', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'caption'];
        const renamed = (h) => { h = h.replace(/<helmet(\s|>)/gi, '<sc-helmet$1').replace(/<\/helmet\s*>/gi, '</sc-helmet>'); for (const t of RAW) h = h.replace(new RegExp('(</?)' + t + '(?=[\\s>])', 'gi'), '$1sc-raw-' + t); return h; };
        const dropComments = (root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT), all = []; while (w.nextNode()) all.push(w.currentNode); all.forEach((n) => n.remove()); return all.length; };
        const inTemplates = (root, fn) => { fn(root); root.querySelectorAll('template').forEach((t) => inTemplates(t.content, fn)); };
        const shape = (root) => {            /* elements with their attributes in order, and every text node, in document order */
          const list = [], w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
          while (w.nextNode()) { const n = w.currentNode; list.push(n.nodeType === 1 ? '<' + n.localName + [...n.attributes].map((a) => ' ' + a.name + '=' + JSON.stringify(a.value)).join('') + '>' : JSON.stringify(n.nodeValue)); }
          return list;
        };
        const cssom = (root) => [...root.querySelectorAll('style')].map((s) => { const sh = new CSSStyleSheet(); sh.replaceSync(s.textContent); return [...sh.cssRules].map((x) => x.cssText); });
        const res = { comments: 0, left: 0, elements: 0, rules: 0, diffs: [] };
        const compare = (label, a, bb) => {
          let ca = 0, cb = 0;
          inTemplates(a, (r) => { ca += dropComments(r); r.normalize(); }); inTemplates(bb, (r) => { cb += dropComments(r); r.normalize(); });
          res.comments += ca; res.left += cb;
          /* a <style>'s text is CSS, not content: it is compared as rules (CSSOM), then emptied on both sides for the tree comparison */
          const ra = cssom(a), rb = cssom(bb);
          res.rules += rb.reduce((n, x) => n + x.length, 0);
          if (JSON.stringify(ra) !== JSON.stringify(rb)) res.diffs.push(label + ': CSS rules differ');
          for (const r of [a, bb]) inTemplates(r, (x) => x.querySelectorAll('style').forEach((st) => { st.textContent = ''; }));
          const sa = shape(a), sb = shape(bb);
          res.elements += sb.filter((x) => x[0] === '<').length;
          if (sa.length !== sb.length) res.diffs.push(label + ': ' + sa.length + ' nodes in the source, ' + sb.length + ' shipped');
          for (let i = 0; i < Math.min(sa.length, sb.length); i++) if (sa[i] !== sb[i]) { res.diffs.push(label + ' node ' + i + ': ' + sa[i].slice(0, 200) + ' ≠ ' + sb[i].slice(0, 200)); break; }
          const ha = (a.innerHTML !== undefined ? a.innerHTML : a.documentElement.outerHTML), hb = (bb.innerHTML !== undefined ? bb.innerHTML : bb.documentElement.outerHTML);
          if (ha !== hb) res.diffs.push(label + ': serialisation differs');
        };
        const tpl = (h) => { const t = document.createElement('template'); t.innerHTML = h; return t.content; };
        const frag = (c) => { const d = document.createElement('div'); d.appendChild(c); return d; };
        compare('template', frag(tpl(slice(src))), frag(tpl(slice(out))));
        compare('template (runtime renames)', frag(tpl(renamed(slice(src)))), frag(tpl(renamed(slice(out)))));
        const doc = (t) => new DOMParser().parseFromString(t, 'text/html');
        const da = doc(src), db = doc(out);
        const sa = da.querySelector('script[data-dc-script]'), sb = db.querySelector('script[data-dc-script]');
        if (!sa || !sb || sa.textContent !== sb.textContent || sa.getAttribute('data-props') !== sb.getAttribute('data-props')) res.diffs.push('document: the logic script or its data-props differ');
        compare('document', da.documentElement, db.documentElement);
        return res;
      }, [source(name), built(name)]);
      assert.deepEqual(r.diffs, [], name + ': the shipped template is not the DOM of its source');
      assert.equal(r.left, 0, name + ': no comment node in the shipped template');
      assert.ok(r.elements > 30, name + ': a real tree was compared (' + r.elements + ' elements)');
      comments += r.comments; elements += r.elements; rules += r.rules;
    }
    assert.ok(comments >= 900, 'comment nodes the sources had and the build removed (three parses): ' + comments);
    assert.ok(rules >= 300, 'CSS rules compared: ' + rules);
    console.log('# pages ' + ORDER.length + ' · elements compared ' + elements + ' · comment nodes removed ' + comments + ' · CSS rules compared ' + rules);

    /* the instrument notices a real change: one attribute value, one text character, one declaration */
    const probe = await page.evaluate(() => {
      const mk = (h) => { const t = document.createElement('template'); t.innerHTML = h; const d = document.createElement('div'); d.appendChild(t.content); return d.innerHTML; };
      const css = (c) => { const s = new CSSStyleSheet(); s.replaceSync(c); return [...s.cssRules].map((x) => x.cssText).join(''); };
      return [mk('<p a="1">x</p>') !== mk('<p a="2">x</p>'), mk('<p>x y</p>') !== mk('<p>xy</p>'), css('.a{color:red}') !== css('.a{color:blue}'), css('/* c */.a{color:red}') === css('.a{color:red}')];
    });
    assert.deepEqual(probe, [true, true, true, true]);
  } finally { await b.close(); }
});
