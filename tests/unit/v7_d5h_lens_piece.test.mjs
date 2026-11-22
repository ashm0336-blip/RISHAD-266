/* V7 · د5-ح — العدساتُ الست قطعةٌ مشتركة (src/systems/_shared/lenses، مالكاها plan · daily): تبقى ما حضر أحدُهما وتغيب بغيابهما.
   (1) صفوفُها خارج وثائق القاعدة (السجلّ · روابطُ النطاق والحراسة والبناء) وفي permissions.json القطعة، وما يمسّها من عمليات الأنظمة ينتظرها.
   (2) tools/perm_parts.py: بغياب المضيفَين لا مالكَ عدسةٍ ولا مفتاحَ عدسةٍ ولا ربطَ لها في الوثائق المجموعة، وهي صالحة؛ وبحضور أحدهما كما كانت.
   (3) إضافاتُها قوالبُ القطعة، وجداولُ المحرّكات قطعُ slots — تخرج فارغةً بغيابها؛ وأدواتُ الفحص تقبل «لا عدسة». */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SRC, ROOT, PYTHON, SYSTEMS } from './harness.mjs';

const LENS = /lens\.(zones|paths|gates|marks|dist|dens)\b|ref\.(zone|gate|mark)\.|ff\.lens\./;
const BASES = ['src/permissions/registry/registry.base.json', 'workers/bindings/scope-bindings/data.base.json', 'workers/bindings/guard-bindings/data.base.json', 'workers/bindings/build-bindings/data.base.json'];

test('(1) lens rows live in the shared piece, not in the base permission documents', () => {
  for (const b of BASES) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, b), 'utf8'));
    const rows = [].concat(d.registry || [], d.bindings || [], d.owners || []).filter((x) => LENS.test(String(x.key || x.id || '')) || String(x.owner || '').startsWith('lens.') || x.kind === 'lens');
    assert.deepEqual(rows.map((x) => x.key || x.id), [], b + ': no lens row in the base');
  }
  const piece = path.join(SRC, 'systems', '_shared', 'lenses');
  if (!fs.existsSync(piece)) return;
  const sh = JSON.parse(fs.readFileSync(path.join(piece, 'shared.json'), 'utf8')), P = JSON.parse(fs.readFileSync(path.join(piece, 'permissions.json'), 'utf8'));
  assert.deepEqual(sh.owners, ['daily', 'plan']); assert.equal(P.system, '_shared/lenses');
  assert.equal(P.docs.registry.filter((op) => op.value && op.value.owner && op.value.owner.startsWith('lens.')).length, 61, '61 lens-owned registry rows');
  assert.equal(P.docs.registry.filter((op) => op.path.join() === 'owners' && op.value.kind === 'lens').length, 6, 'six lens owners');
  assert.deepEqual(fs.readdirSync(path.join(piece, 'plugins')).sort(), ['dens', 'dist', 'gates', 'marks', 'paths', 'zones']);
});

test('(2) perm_parts: without both hosts the assembled documents carry no lens and stay valid; with one host present the lens rows are there', { skip: ['plan', 'daily'].every((k) => SYSTEMS.includes(k)) ? false : 'يُفحص على الشجرة الكاملة' }, () => {
  const code = `
import json, os, re, perm_parts as PP
os.chdir(${JSON.stringify(ROOT)}); D = PP.declared('src'); out = {}
L = re.compile(r'lens\\.(zones|paths|gates|marks|dist|dens)\\b|ref\\.(zone|gate|mark)\\.|ff\\.lens\\.')
for name, gone in (('plan', ['plan']), ('daily', ['daily']), ('both', ['plan', 'daily'])):
    sub = {k: v for k, v in D.items() if k not in gone}
    if name == 'both': sub.pop('_shared/lenses')
    r = {}
    for doc, (b, o) in PP.DOCS.items():
        X = PP.finish(doc, PP.apply(PP._load(b), {k: v.get(doc, []) for k, v in sub.items()}, doc), True)
        rows = [x for x in (X.get('registry') or []) + (X.get('bindings') or []) if L.search(str(x.get('key', ''))) or str(x.get('owner', '')).startswith('lens.')]
        refs = sorted({v for x in (X.get('registry') or []) for v in x.get('references', []) if str(v).startswith('lens.')})
        r[doc] = {'rows': len(rows), 'refs': refs, 'lensOwners': [o['id'] for o in X.get('owners') or [] if o.get('kind') == 'lens'], 'plugin': (X.get('counts') or {}).get('plugin')}
    out[name] = r
print(json.dumps(out))`;
  const r = spawnSync(PYTHON, ['-c', code], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONPATH: path.join(ROOT, 'tools') }) });
  assert.equal(r.status, 0, r.stderr); const o = JSON.parse(r.stdout);
  for (const k of ['plan', 'daily']) { assert.ok(o[k].registry.rows >= 61, k + ': lens rows present'); assert.equal(o[k].registry.lensOwners.length, 6, k); }
  for (const [doc, v] of Object.entries(o.both)) { assert.equal(v.rows, 0, doc + ': no lens row'); assert.deepEqual(v.refs, [], doc + ': no reference to a lens'); assert.deepEqual(v.lensOwners, [], doc); }
  assert.equal(o.both.registry.plugin, 0, 'counts.plugin = 0');
});

test('(3) engines and checks: lens tables are slots of the piece; the tools accept «no lens»', () => {
  const T = (p) => fs.readFileSync(path.join(SRC, 'slots', p), 'utf8');
  assert.match(T('workers/bindings/build-bindings/engine.js.tpl'), /var LENSES = \[@@SYS:build\.lenses@@\];/);
  const g = T('workers/bindings/guard-bindings/engine.js.tpl');
  for (const n of ['GEOM = {@@SYS:guard.lens.geom@@}', 'LENS_COLS = {@@SYS:guard.lens.cols@@}', 'EDIT_KEY = {@@SYS:guard.lens.editKey@@}']) assert.ok(g.includes(n), n);
  assert.match(T('workers/bindings/scope-bindings/engine.js.tpl'), /LENS_COLS = \[@@SYS:scope\.lens\.cols@@\], EMP_COLS = \{@@SYS:scope\.lens\.empCols@@\}/);
  assert.match(T('workers/parts/057-enf-index.js.tpl'), /var ENF_REASON_OFF = \{@@SYS:enf\.reasonOff\.lens@@\};/);
  const P = fs.readFileSync(path.join(ROOT, 'tools', 'plugins.py'), 'utf8'), G = fs.readFileSync(path.join(ROOT, 'tools', 'generate.py'), 'utf8');
  assert.match(P, /لا عدسة: قطعةُ العدسات غائبةٌ بغياب مضيفَيها/); assert.match(G, /return M\.get\('lenses', \[\]\)/);
  assert.ok(!fs.existsSync(path.join(SRC, 'slots', 'plugins', 'lenses')), 'the lens templates left src/slots');
});
