/* RISHAD CORE-02 S9 — «مركز إدارة رشاد»: one visual system for the console pages (client only).
     (1) the role name: no «مدير نظام» in what the UI says (view, shell template, platform defaults; comments excluded);
     (2) typography: one page title (h2 in the console header, --fs-xl), section titles are h3 (no aria-level patches),
         the platform sections use token classes, and the inline-style counts of the console view only go down;
     (3) components: every console dialog is a .bs-dlg-box with role=dialog, aria-modal and a name (no hand-made overlays);
         the platform save actions are .bs-btn (primary for «حفظ ونشر للجميع») and become a bottom bar on phones;
     (4) tokens: --fs-xl defined in tokens.json and emitted; the new classes use semantic tokens only (dark mode follows);
     (5) the unit manager's #/admin block is not touched by any of it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rd } from './core01_root_world.mjs';

const V = rd('modules/admin/view.html'), C = rd('modules/admin/helmet.css'), T = rd('layouts/index.template.html'), P = rd('layouts/260-bassam-plat.js');
const TK = JSON.parse(rd('styles/tokens/tokens.json')), E070 = rd('styles/070-theme-tokens.css');
const a = V.indexOf('<sc-if value="{{admModeSite}}"'), b = V.indexOf('<sc-if value="{{dTabBarShow}}"');
const SITE = V.slice(a, b).replace(/<!--[\s\S]*?-->/g, ''), DEPT = V.slice(b);
const n = (s, re) => (s.match(re) || []).length;

test('(1) no «مدير نظام» in what the console and the shell say (comments excluded)', () => {
  const noHtmlC = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
  const noJsC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
  for (const [name, src] of [['view.html', noHtmlC(V)], ['index.template.html', noHtmlC(T)], ['260-bassam-plat.js', noJsC(P)]]) {
    assert.ok(!/مدير (ال)?نظام/.test(src), name + ': «مسؤول المنصة», not «مدير نظام»');
  }
  assert.ok(V.includes('١ · مسؤول منصة احتياطي'), 'the backup account card names the role');
});

test('(2) one page title, section titles h3, platform sections on token classes; inline styles only go down', () => {
  assert.equal(n(SITE, /<h2\b/g), 1, 'one h2 in the console view: the page title');
  assert.match(SITE, /<div class="\{\{conPhCls\}\}">[\s\S]*?<h2 tabindex="-1">\{\{conTitle\}\}<\/h2>/, 'the h2 is the console header title');
  assert.equal(n(SITE, /aria-level=/g), 0, 'no aria-level patches: real heading levels');
  assert.ok(n(SITE, /<h3 class="adm-pl-h">/g) >= 24, 'every platform section title is an h3');
  assert.equal(n(SITE, /<h2 style=/g), 0);
  assert.equal(n(SITE, /class="adm-pl-sec"/g), 24, 'the platform sections use .adm-pl-sec');
  assert.ok(n(SITE, /class="adm-pl-in"/g) >= 34, 'platform text fields use .adm-pl-in');
  /* ratchet: S9 took the console view from 878 inline styles / 377 inline font sizes to these; they may only go down */
  const st = n(SITE, /\sstyle="/g), fs = n(SITE, /font-size/g);
  assert.ok(st <= 566, 'inline style attributes in the console view: ' + st + ' (≤ 566)');
  assert.ok(fs <= 190, 'inline font sizes in the console view: ' + fs + ' (≤ 190)');
  assert.match(C, /\.con-ph h2\{[^}]*font-size:var\(--fs-xl\)/, 'the page title uses --fs-xl');
  /* card titles are h3 (the one <b> left is inside the «صحة التخزين» toggle button, where a heading is not allowed) */
  const cardB = SITE.match(/<div class="adm-ov-hd[^"]*"[^>]*>\s*<div><b>/g) || [];
  assert.equal(cardB.length, 0, 'card header titles are h3, not <b>');
  assert.equal(n(SITE, /<button type="button" class="adm-ov-hd adm-ov-tg"[^>]*><div><b>/g), 1);
  assert.match(C, /\.adm-ov-hd b,\.adm-ov-hd h3\{[^}]*font-size:var\(--fs-lg\)/, 'card titles use --fs-lg');
  /* the spacers left over from the old tab strip are gone: the page's own gap spaces the blocks */
  assert.equal(n(SITE, /class="adm-gap"|<div style="height:\d+px"><\/div>/g), 0, 'no spacer divs between console blocks');
  assert.ok(!/\.adm-gap\{/.test(C), '.adm-gap rule removed with its last use');
  for (const k of ['adm-pl-sec', 'adm-pl-h', 'adm-pl-help', 'adm-pl-lbl', 'adm-pl-in', 'adm-pl-row', 'adm-pl-g2', 'adm-pl-lk']) {
    const m = C.match(new RegExp('\\.' + k + '\\{([^}]*)\\}'));
    assert.ok(m, '.' + k + ' defined');
    assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|--(fg|bg|bd)-x/i.test(m[1]), '.' + k + ' uses semantic tokens only (dark mode follows)');
  }
});

test('(3) dialogs are .bs-dlg-box with a name; platform save actions are .bs-btn and a bottom bar on phones', () => {
  assert.equal(n(SITE, /position:fixed;inset:0/g), 0, 'no hand-made overlays in the console view');
  const dl = SITE.match(/<div[^>]*role="dialog"[^>]*>/g) || [];
  assert.ok(dl.length >= 5, 'the console dialogs are found');
  for (const d of dl) {
    assert.match(d, /class="bs-dlg-box\b/, 'dialog box: ' + d.slice(0, 90));
    assert.match(d, /aria-modal="true"/);
    assert.match(d, /aria-label="[^"]+"/);
  }
  for (const c of ['mgrClose', 'wpClose', 'upClose']) assert.match(SITE, new RegExp('<div class="bs-dlg" onClick="\\{\\{' + c + '\\}\\}">'), c + ' overlay is .bs-dlg');
  assert.match(SITE, /<button type="button" onClick="\{\{plSave\}\}" class="bs-btn bs-btn--primary adm-pl-btn">✓ حفظ ونشر للجميع<\/button>/);
  assert.match(SITE, /<button type="button" onClick="\{\{plDiscard\}\}" class="bs-btn adm-pl-btn">تجاهل<\/button>/);
  assert.match(SITE, /<div class="adm-pl-bar">[\s\S]*?plDiscard[\s\S]*?plSave[\s\S]*?<\/div>/, 'save state and buttons in one bar');
  assert.match(C, /@media \(max-width:640px\)\{[^@]*\.adm-pl-bar\{[^}]*position:fixed;[^}]*bottom:0/, 'the bar sits at the bottom on phones');
  assert.ok(!/style-hover="[^"]*"[^>]*class="bs-btn|class="bs-btn[^"]*"[^>]*style-hover=/.test(SITE), 'no inline hover on .bs-btn');
  /* filters are chips (aria-pressed) in a group; on a phone each group is one row that scrolls sideways inside its card */
  for (const g of ['نوع الحدث', 'الفترة', 'تصفية الحسابات']) assert.match(SITE, new RegExp('<div role="group" aria-label="' + g + '" class="adm-tools adm-chips"><sc-for [^>]*><button type="button" class="adm-chip" aria-pressed='), g);
  assert.equal(n(SITE, /role="tab"/g), 0, 'no tabs in the console view: filters are chips');
  assert.match(C, /@media \(max-width:640px\)\{\.adm-chips\{[^}]*flex-wrap:nowrap;overflow-x:auto/, 'one scrolling row on phones');
  assert.match(C, /\.adm-chips>\.adm-chip\{flex-shrink:0\}/, 'chips keep their width in the row');
});

test('(4) --fs-xl is a token, emitted', () => {
  const all = JSON.stringify(TK);
  assert.ok(/"name":\s*"fs-xl",\s*"value":\s*"20px"/.test(JSON.stringify(TK, null, 1)) || all.includes('"name":"fs-xl","value":"20px"'), 'fs-xl in tokens.json');
  assert.match(E070, /--fs-xl:20px/, 'emitted into 070-theme-tokens.css');
});

test('(5) the unit manager\'s #/admin block is untouched by the console classes', () => {
  assert.ok(DEPT.includes('class="adm-tabbar adm-tabbar--d"'), 'dept tab strip present');
  assert.ok(!/adm-pl-|con-ph|adm-dlg-col/.test(DEPT), 'no console classes in the dept block');
});
