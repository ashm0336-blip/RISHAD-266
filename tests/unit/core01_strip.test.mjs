/* CORE-01 · step 0 — the build ships CSS and shell-template comments nowhere, and loses nothing else.
   tools/build.py strips CSS comments from the inline-CSS blocks (src/blocks.json kind inline-css) and from the <style> elements of the shell
   template, and HTML comments from the template (BS_BOOT stays). Sources keep their comments. This test reads the actual build (KIVO_DIST):
   ① no comment is left inside any <style> of the shell; ② each shipped style element has exactly the rules of its source, where the
   source's comments are removed here by an independent, spec-shaped stripper (a comment is nothing); ③ the monolith shell carries the
   same stripped bodies, so both build modes strip identically. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, SRC, srcDir} from './harness.mjs';

assert.ok(process.env.KIVO_DIST, 'Set KIVO_DIST to the current tested build');
const DIST = path.resolve(ROOT, process.env.KIVO_DIST);
const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const rd = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/* Comments out, strings kept (CSS Syntax §4.3.2: a comment produces no token). */
function specStrip(css) {
  let out = '', i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '"' || c === "'") { let j = i + 1; while (j < css.length && css[j] !== c && css[j] !== '\n') j += css[j] === '\\' ? 2 : 1; out += css.slice(i, j + 1); i = j + 1; }
    else if (css.startsWith('/*', i)) { const e = css.indexOf('*/', i + 2); assert.ok(e >= 0, 'unterminated comment'); i = e + 2; }
    else { out += c; i++; }
  }
  return out;
}
/* The rule list: every qualified rule as "at-rule context › prelude { declarations }", whitespace-normalised; braces inside strings are text. */
function rules(css) {
  const norm = (s) => s.replace(/\s+/g, ' ').replace(/ ?([{};]) ?/g, '$1').trim();
  const list = [], stack = []; let buf = '', i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '"' || c === "'") { let j = i + 1; while (j < css.length && css[j] !== c && css[j] !== '\n') j += css[j] === '\\' ? 2 : 1; buf += css.slice(i, j + 1); i = j + 1; continue; }
    if (c === '{') {
      const pre = norm(buf); buf = '';
      let depth = 1, j = i + 1, body = '';
      const nested = /^@(media|supports|layer|container|document)\b/i.test(pre);
      if (nested) { stack.push(pre); i++; continue; }
      while (j < css.length && depth) { const d = css[j]; if (d === '"' || d === "'") { let k = j + 1; while (k < css.length && css[k] !== d && css[k] !== '\n') k += css[k] === '\\' ? 2 : 1; body += css.slice(j, k + 1); j = k + 1; continue; } if (d === '{') depth++; if (d === '}') depth--; if (depth) body += d; j++; }
      list.push(stack.join(' › ') + ' › ' + pre + '{' + norm(body) + '}'); i = j; continue;
    }
    if (c === '}') { assert.ok(stack.length, 'unbalanced }'); stack.pop(); buf = ''; i++; continue; }
    buf += c; i++;
  }
  assert.equal(norm(buf).replace(/;/g, ''), '', 'no trailing text outside a rule');
  return list;
}
const styles = (html) => [...html.matchAll(/(<style\b[^>]*>)([\s\S]*?)<\/style>/g)].map((m) => ({open: m[1], body: m[2], at: m.index}));

test('CORE-01 · no comment is left inside any <style> of the shipped shell, and BS_BOOT stays the only HTML comment', () => {
  const all = styles(shell);
  assert.ok(all.length >= 4, 'the shell keeps its inline style elements');
  for (const s of all) assert.ok(!s.body.includes('/*') && !s.body.includes('*/'), s.open + ' still carries a comment');
  assert.deepEqual([...shell.matchAll(/<!--[\s\S]*?-->/g)].map((m) => m[0]), ['<!--BS_BOOT-->']);
});

test('CORE-01 · each shipped inline style has exactly the rules of its source (comments removed, nothing else)', () => {
  const blocks = JSON.parse(rd('blocks.json')).blocks.filter((b) => b.kind === 'inline-css');
  assert.ok(blocks.length >= 3, 'inline-css blocks are registered');
  const tpl = fs.readFileSync(path.join(srcDir('shell')), 'utf8');
  const shipped = styles(shell);
  const helmetAt = shell.indexOf('<helmet>');
  const pick = (b) => {
    const m = /\bid="([^"]+)"/.exec(b.openTag);
    if (m) { const hit = shipped.filter((s) => s.open.includes('id="' + m[1] + '"')); assert.equal(hit.length, 1, b.id); return hit[0]; }
    const hit = shipped.filter((s) => s.open === b.openTag && s.at > helmetAt && s.at < shell.indexOf('</helmet>'));
    assert.equal(hit.length, 1, b.id + ' (the <helmet> style)'); return hit[0];
  };
  let checked = 0;
  for (const b of blocks) {
    const source = rd(b.id), got = pick(b).body;
    assert.ok(source.includes('/*') || b.id.endsWith('100-brand-ui.css'), b.id + ': the source keeps its comments');
    const want = rules(specStrip(source));
    assert.ok(want.length > 0, b.id + ' has rules');
    assert.deepEqual(rules(got), want, b.id + ': same rule list as the source');
    checked++;
  }
  /* the template's own <style> elements (bs-critical …) */
  for (const s of styles(tpl)) {
    const id = /\bid="([^"]+)"/.exec(s.open); if (!id) continue;
    const hit = shipped.filter((x) => x.open.includes('id="' + id[1] + '"'));
    assert.equal(hit.length, 1, id[1]);
    assert.deepEqual(rules(hit[0].body), rules(specStrip(s.body)), id[1] + ': same rule list as the template');
    checked++;
  }
  assert.ok(checked >= 4, 'checked ' + checked);
});

test('CORE-01 · the monolith shell carries the same stripped inline styles as the split shell', (t) => {
  const mono = DIST + '.mono/index.html';
  if (!fs.existsSync(mono)) return t.skip('no monolith next to ' + DIST);
  const m = fs.readFileSync(mono, 'utf8');
  for (const s of styles(shell)) assert.ok(m.includes(s.open + s.body + '</style>'), s.open + ' is identical in the monolith');
});
