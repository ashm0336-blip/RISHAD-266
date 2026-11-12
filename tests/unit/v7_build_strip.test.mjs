/* V7 · build strip — page templates ship without their comments, and lose nothing else.
   tools/build.py passes every page (src/pages/<Name>.dc.html) through tools/strip_comments.py: HTML comments out of the template and CSS
   comments out of its <style> elements, in both build modes. Sources keep their comments.
   Part 1 drives the stripper itself: what goes, what must stay byte for byte, the unsafe inputs it leaves alone.
   Part 2 reads the actual build (KIVO_DIST): no comment is left in any page; each shipped page is its source minus comment spans
   and nothing else (checked by an aligner written here, independent of the stripper); the monolith bundles the same bytes; and the
   dist ↔ monolith equivalence check (tests/source/k265eq.py) still fails when the two modes really differ. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { ROOT, SRC, PYTHON, srcDir } from './harness.mjs';

const TOOL = path.join(ROOT, 'tools', 'strip_comments.py');
const run = (kind, text) => {
  const r = spawnSync(PYTHON, [TOOL, kind], { input: Buffer.from(text, 'utf8'), env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 << 20 });
  assert.equal(r.status, 0, String(r.stderr));
  return r.stdout.toString('utf8');
};
const page = (t) => run('page', t);
const same = (t, why) => assert.equal(page(t), t, why);

test('stripper · HTML comments leave the template, CSS comments leave its <style>; no other byte moves', () => {
  assert.equal(page('<div>\n  <!-- note -->\n  <p>a<!-- x -->b</p>\n</div>'), '<div>\n  \n  <p>ab</p>\n</div>');
  assert.equal(page('<p>a</p><!-- one --><!--two--><p>b</p>'), '<p>a</p><p>b</p>');
  assert.equal(page('<!-- multi\n line\n --><i>x</i>'), '<i>x</i>');
  assert.equal(page('<i>x</i><!---->'), '<i>x</i>');
  assert.equal(page('<helmet>\n<style>\n/* head */\n.a{color:red} /* tail */\n.b{margin:0/* in */ auto}\n</style>\n</helmet>'),
    '<helmet>\n<style>\n\n.a{color:red} \n.b{margin:0 auto}\n</style>\n</helmet>');
  assert.equal(page('<style>.a{border:1px/**/solid}</style>'), '<style>.a{border:1px solid}</style>', 'two tokens never fuse into one');
  assert.equal(page('<STYLE media="print">/* c */.a{}</STYLE>'), '<STYLE media="print">.a{}</STYLE>');
  const ws = '<div>\n\t  <span>  a  </span>   \n\n   <b>\tc</b>\n</div>\n';
  assert.equal(page(ws), ws, 'whitespace and indentation are not collapsed');
});

test('stripper · comment-like text in protected contexts stays byte for byte', () => {
  same('<a title="<!-- not a comment -->" data-x=\'<!-- nor this -->\'>k</a>', 'attribute values');
  same('<div style="background:url(a.png) /* kept */;color:red">k</div>', 'a CSS comment inside a style attribute');
  same('<input accept="image/*" data-y="*/"><input accept="image/*">', 'accept="image/*" twice is not a comment');
  same('<a data-v=a"<!--x-->"b>k</a>', 'an unquoted value that holds quotes');
  same('<a title="a>b" data-n="<!--">k</a><p title="-->">z</p>', "'>' inside a quoted value does not end the tag");
  same('<script>var a = "<\\!-- x -->"; /* js */ var b = 1 /* c */;</script>', 'script text');
  same('<script type="text/x-dc" data-dc-script data-props="{}">/* KIVO · precompiled — logic in *.logic.js */</script>', 'the logic stub');
  same('<style>.a::before{content:"/* x */"}.b::after{content:\'<!-- y -->\'}.c{background:url(/img/*/a.png)}.d{background:url( "/*" )}</style>', 'CSS strings and url()');
  same('<style>.a{content:"a\\"/* still a string */"}</style>', 'an escaped quote inside a CSS string');
  same('<p>{{ a + "<!-- x -->" }}</p>', 'a template expression that holds a comment opener (the rest is left alone)');
  same('<p>{{ cond ? "/* a */" : b }}</p><p>{{ x }} {{ y }}</p>', 'template expressions');
  same('<pre>keep <!-- this --> here</pre>', '<pre>');
  same('<textarea><!-- typed by a user --> /* x */</textarea>', '<textarea>');
  same('<title><!-- t --></title><xmp><!-- x --></xmp><noscript><!-- n --></noscript>', 'other non-markup elements');
  same('<svg><style>/* svg css */.a{}</style><title>t<!-- c --></title></svg>', 'style and title inside <svg> are left whole');
  same('<!DOCTYPE html>\n<html><body><x-dc></x-dc></body></html>', 'doctype');
  same('<p>1 < 2 and a <b>b</b> </> <3</p>', "a lone '<' is text");
  same('<!--BS_BOOT--><!--[if IE]>x<![endif]--><!-- sc-mark --><!-- dc-slot:a --><!--$--><!--/$--><!--$?--><!-- react-mount-point-unstable -->', 'markers a runtime could read');
  assert.equal(page('<a title="<!-- k -->">k</a><!-- gone --><textarea><!-- k --></textarea><!-- gone -->{{ "/* k */" }}<!-- gone -->'),
    '<a title="<!-- k -->">k</a><textarea><!-- k --></textarea>{{ "/* k */" }}', 'real comments around protected text still go');
  assert.equal(page('<svg><path d="M0 0"/></svg><!-- after svg --><style>/* c */.a{}</style>'), '<svg><path d="M0 0"/></svg><style>.a{}</style>', 'back in HTML after </svg>');
});

test('stripper · unsafe input is left exactly as it is; the result is stable', () => {
  same('<p>a</p><!-- never closed <p>b</p>', 'unterminated HTML comment');
  assert.equal(page('<!-- ok --><p>a</p><!-- never closed <p>b</p>'), '<p>a</p><!-- never closed <p>b</p>', 'comments before the unterminated one still go');
  same('<style>.a{} /* never closed .b{}</style><p>x</p>', 'unterminated CSS comment');
  assert.equal(page('<style>/* ok */.a{} /* open .b{}</style><!-- html -->'), '<style>.a{} /* open .b{}</style>', 'the open CSS comment and what follows it in the style stay');
  same('<div title="never closed <!-- a -->', 'unterminated tag');
  same('<script>var a = 1; <!-- x --> ', 'unterminated script');
  same('<textarea><!-- a -->', 'unterminated textarea');
  same('<p>a<!--> b <!-- c --></p>', 'abruptly closed comment: everything after it is left alone');
  same('<p>a<!-- b --!> c <!-- d --></p>', 'a comment closed by --!>');
  same('<script><!-- <script> </script> --> <!-- x --></script><!-- y -->', 'legacy script escapes');
  same('<p>{{ a <!-- b }} c --> d <!-- e --></p>', 'an expression that opens a comment');
  same('<![CDATA[ <!-- a --> ]]><!-- b -->', 'CDATA');
  for (const t of ['<div>\n <!-- a -->\n <style>/* b */.x{}</style><p title="<!-- c -->">{{ d }}</p></div>', '<p>a</p><!-- open', '<style>.a{}/* open</style>', '<p>{{ a <!-- b }}</p><!-- c -->']) {
    const once = page(t); assert.equal(page(once), once, 'idempotent: ' + t);
  }
  assert.equal(run('css', '/* a */.x{color:red}/* b */'), '.x{color:red}');
});

/* ── Part 2: the actual build ─────────────────────────────────────────────────────────────────────────────────────────────── */
assert.ok(process.env.KIVO_DIST, 'Set KIVO_DIST to the current tested build');
const DIST = path.resolve(ROOT, process.env.KIVO_DIST);
const META = JSON.parse(fs.readFileSync(path.join(SRC, 'blocks.json'), 'utf8'));
const ORDER = META.pages.order;
const manifest = JSON.parse(fs.readFileSync(DIST + '.build.json', 'utf8'));
const retained = new Set(manifest.retainedFiles || []);
const built = (name) => {
  const stem = name.replace(/ /g, '-');
  const hit = Object.keys(manifest.files).filter((f) => !retained.has(f) && new RegExp('^assets/pages/' + stem + '\\.[0-9a-f]{10}\\.dc\\.txt$').test(f));
  assert.equal(hit.length, 1, name + ': one shipped page text');
  return fs.readFileSync(path.join(DIST, hit[0]), 'utf8');
};
/* the build's other, older transformation: the logic body is replaced by a short stub (KIVO_253) */
const STUB = '/* KIVO · precompiled — logic in *.logic.js */';
const source = (name) => fs.readFileSync(path.join(srcDir('pages'), name + '.dc.html'), 'utf8')
  .replace(/(<script(?: type="text\/x-dc")? data-dc-script[^>]*>)([\s\S]*?)(<\/script>)/g, (m, a, b, c) => a + STUB + c);

/* Independent of the stripper: `out` must be `src` with whole comment spans deleted and nothing else changed. Walks both texts; at a
   difference the source must be standing in a comment that starts at most three characters back ("<!-" can match the next tag). */
function onlyCommentsRemoved(src, out) {
  let i = 0, j = 0, spans = 0;
  while (j < out.length || i < src.length) {
    if (i < src.length && j < out.length && src[i] === out[j]) { i++; j++; continue; }
    let k = -1;
    for (let b = 0; b <= 3 && b <= j && k < 0; b++) if (src.startsWith('<!--', i - b) || src.startsWith('/*', i - b)) k = i - b;
    if (k < 0) return { ok: false, at: i, src: src.slice(Math.max(0, i - 60), i + 60), out: out.slice(Math.max(0, j - 60), j + 60) };
    const html = src.startsWith('<!--', k), e = src.indexOf(html ? '-->' : '*/', k + (html ? 4 : 2));
    if (e < 0) return { ok: false, at: k, src: src.slice(k, k + 120), out: 'unterminated comment in the source' };
    j -= i - k; i = e + (html ? 3 : 2); spans++;
  }
  return { ok: true, spans };
}

test('aligner · accepts comment removal only (self-check of the test instrument)', () => {
  assert.deepEqual(onlyCommentsRemoved('a<!-- x --><b>c</b>/* y */d', 'a<b>c</b>d'), { ok: true, spans: 2 });
  assert.equal(onlyCommentsRemoved('a<!-- x --><b>c</b>', 'a<b>C</b>').ok, false, 'a changed character');
  assert.equal(onlyCommentsRemoved('a <!-- x --> <b>c</b>', 'a <b>c</b>').ok, false, 'a removed space');
  assert.equal(onlyCommentsRemoved('a<!-- x --><b>c</b>', 'a<b>c</b> ').ok, false, 'an added character');
  assert.equal(onlyCommentsRemoved('<p>one</p><p>two</p>', '<p>one</p>').ok, false, 'removed markup');
});

test('build · no comment is left in any shipped page; the sources keep theirs', () => {
  let withComments = 0;
  for (const name of ORDER) {
    const out = built(name), src = source(name);
    /* no page needs a protected "<!--" today; if one ever does, narrow this to text outside the protected contexts */
    assert.ok(!out.includes('<!--') && !out.includes('-->'), name + ': an HTML comment is still shipped');
    const styles = [...out.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    assert.ok(styles.length >= 1, name + ' keeps its <style>');
    for (const css of styles) {
      const bare = css.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');     /* strings out, then no comment opener may remain */
      assert.ok(!bare.includes('/*') && !bare.includes('*/'), name + ': a CSS comment is still shipped');
    }
    assert.ok(out.includes(STUB), name + ': the logic stub stays (dc-runtime needs a non-empty script body)');
    if (src.includes('<!--') || /<style\b[^>]*>[\s\S]*?\/\*[\s\S]*?<\/style>/.test(src)) withComments++;
  }
  assert.ok(withComments >= 10, 'the sources keep their comments (' + withComments + ' pages)');
});

test('build · each shipped page is its source minus comments — nothing else added, removed or moved', () => {
  let spans = 0;
  for (const name of ORDER) {
    const src = source(name), out = built(name);
    const r = onlyCommentsRemoved(src, out);
    assert.ok(r.ok, name + ': differs from its source by more than comments ' + JSON.stringify(r));
    spans += r.spans;
    assert.equal(out, page(src), name + ': exactly what tools/strip_comments.py gives for the source');
    const anchors = (t) => t.match(/<x-dc(?:\s[^>]*)?>|<\/x-dc>/g);
    assert.deepEqual(anchors(out), anchors(src), name + ': the same <x-dc> boundaries (what dc-runtime slices the template on)');
  }
  assert.ok(spans >= 300, 'comment spans removed across the pages: ' + spans);
});

test('build · the monolith bundles the same stripped page bytes as the split build', (t) => {
  const mono = DIST + '.mono/index.html';
  if (!fs.existsSync(mono)) return t.skip('no monolith next to ' + DIST);
  const m = /var pages = (\{[^\n]*\});/.exec(fs.readFileSync(mono, 'utf8'));
  assert.ok(m, 'the monolith carries its bundled pages');
  const pages = JSON.parse(m[1]);
  assert.deepEqual(Object.keys(pages), ORDER);
  for (const name of ORDER) assert.equal(zlib.inflateSync(Buffer.from(pages[name], 'base64')).toString('utf8'), built(name), name + ': identical in both modes');
});

test('build · the dist ↔ monolith equivalence check still catches a real difference (a monolith page that kept its comments)', (t) => {
  const monoDir = DIST + '.mono';
  if (!fs.existsSync(path.join(monoDir, 'index.html'))) return t.skip('no monolith next to ' + DIST);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v7strip-'));
  try {
    const pk = path.join(tmp, 'pk');
    fs.cpSync(DIST, pk, { recursive: true }); fs.cpSync(monoDir, pk + '.mono', { recursive: true }); fs.copyFileSync(DIST + '.build.json', pk + '.build.json');
    const eq = () => spawnSync(PYTHON, [path.join(ROOT, 'tests', 'source', 'k265eq.py'), pk], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 << 20 });
    const good = eq();
    assert.equal(good.status, 0, 'control: the untouched copy passes\n' + good.stdout.slice(-1500));
    const name = ORDER.find((n) => source(n) !== built(n));
    assert.ok(name, 'a page whose source carries comments');
    const file = path.join(pk + '.mono', 'index.html'), html = fs.readFileSync(file, 'utf8');
    const m = /var pages = (\{[^\n]*\});/.exec(html), pages = JSON.parse(m[1]);
    pages[name] = zlib.deflateSync(Buffer.from(source(name), 'utf8'), { level: 9 }).toString('base64');
    fs.writeFileSync(file, html.slice(0, m.index) + 'var pages = ' + JSON.stringify(pages) + ';' + html.slice(m.index + m[0].length));
    const bad = eq();
    assert.equal(bad.status, 1, 'the check fails when the monolith ships an unstripped page');
    assert.match(bad.stdout, /✘ ★ إعادةُ تركيب dist\//, 'and it is the byte-for-byte reassembly that fails');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
