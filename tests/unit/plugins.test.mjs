/* KIVO_259 · AUD-030 · SOT-089 · SOT-069 (ADR-018) — العدساتُ إضافات: كلُّ عدسةٍ manifest (المفاتيح · الموارد · الحرّاس · الاختبارات)،
   والواجهةُ وطبقةُ الإنفاذ في الخادم تأخذان قائمتَها ومواردَها بالتوليد. هنا (Node · بلا متصفح ولا D1):
   ① المولَّدُ = الإضافات: KIVO_LENS_PLUGINS في العامل · LENS_REG في كتلة الواجهة (KIVO_MANIFEST.lenses) · لا قائمةَ عدساتٍ حرفيّةً في 331 ولا في طبقة الإنفاذ.
   ② الحرّاس: الحارسُ المرجعي (KIVO_GUARDS.classify) يصنّف كلَّ موردٍ معلن بمفتاحه المعلن — لكل عدسة (إنشاءٌ · حذفٌ · هندسةٌ · حالةٌ · تعديلٌ عام ·
      حقولُ العناصر · حقولُ الطابق) على الخطة والجولات.
   ③ التفاضل: الإسقاطُ والدمجُ (061) بعد جعلهما من الإضافات = نسختُهما قبل ذلك (tests/unit/fixtures/061-enf-read.k258.js) حرفاً في JSON
      لكل تراكيب العدسات الـ64 × قيودِ النطاق × بياناتٍ عشوائيةٍ حتمية — الخطةُ (الطوابق · الأشهر · الجذر) والجولاتُ وعناصرُها وحقولُ العدسات.
   ④ إعادةُ التصنيف (enfPlugOps) لا تمسّ العدساتِ المضمَّنة: جدولُها فارغ والعملياتُ كما هي. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WORKER, SRC, ROOT } from './harness.mjs';
import { internals } from './internals.mjs';

const PLUG = path.join(SRC, 'plugins', 'lenses');
const M = fs.readdirSync(PLUG).filter(k => fs.existsSync(path.join(PLUG, k, 'manifest.json'))).map(k => JSON.parse(fs.readFileSync(path.join(PLUG, k, 'manifest.json'), 'utf8'))).sort((a, b) => a.order - b.order || (a.key < b.key ? -1 : 1));
const NAMES = ['KIVO_LENS_PLUGINS', 'KIVO_GUARDS', 'KIVO_BUILD', 'enfPlugOps', 'enfFloorProj', 'enfFloorMerge', 'enfElemMask', 'ENF_PROJ', 'enfPlugLensOf', 'enfIx'];
const W = await internals(NAMES);
/* الأساس: العاملُ نفسُه بجزء 061 قبل الإضافات (المثبَّت في fixtures) — كلُّ ما سواه مشترك */
const wsrc = fs.readFileSync(WORKER, 'utf8'), cur061 = fs.readFileSync(path.join(ROOT, 'workers', 'parts', '061-enf-read.js'), 'utf8'), old061 = fs.readFileSync(path.join(ROOT, 'tests', 'unit', 'fixtures', '061-enf-read.k258.js'), 'utf8');
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);

test('① المولَّدُ = الإضافات: KIVO_LENS_PLUGINS (المفاتيح · الأعمدة بترتيب seq · حقولُ العناصر والطابق · مفاتيحُ التعديل العام) · LENS_REG في الواجهة · لا قوائمَ حرفيّة', () => {
  assert.ok(M.length >= 6, 'ستُّ عدساتٍ على الأقل');
  same(W.KIVO_LENS_PLUGINS.keys, M.map(m => m.key), 'المفاتيحُ بترتيب order');
  same(W.KIVO_LENS_PLUGINS.cols, M.filter(m => m.resources.column).sort((a, b) => a.resources.column.seq - b.resources.column.seq).map(m => m.resources.column.name), 'الأعمدةُ بترتيب seq');
  same(W.KIVO_LENS_PLUGINS.elem, M.flatMap(m => (m.resources.elementFields || []).map(f => ({ lens: m.key, cols: f.cols, fields: f.fields, op: f.op }))));
  same(W.KIVO_LENS_PLUGINS.floor, M.flatMap(m => (m.resources.floorFields || []).map(f => ({ lens: m.key, field: f.field, op: f.op }))));
  const blk = fs.readFileSync(path.join(SRC, 'manifests', '255-page-manifest.js'), 'utf8'), data = JSON.parse(blk.slice(blk.lastIndexOf('})(') + 3, blk.lastIndexOf(');')));
  same(data.lenses, M.map(m => ({ key: m.key, name: m.name })), 'LENS_REG (KIVO_MANIFEST.lenses) = الإضافات');
  const p331 = fs.readFileSync(path.join(SRC, 'permissions', '331-perm-model.js'), 'utf8');
  assert.ok(/P24_LENSES = LENS_KEYS\.slice\(\);/.test(p331) && !/\[\s*'zones',\s*'paths'/.test(p331), '331: P24_LENSES = LENS_KEYS (لا قائمةَ حرفيّة)');
  for (const f of ['057-enf-index.js', '059-protected-ops-2.js', '061-enf-read.js', '063-enf-api-and-handler.js']) {
    const t = fs.readFileSync(path.join(ROOT, 'workers', 'parts', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/zones:\s*1,\s*paths|'zones',\s*'gates',\s*'marks'|V\.lens\.(zones|dens|dist)\b|ENF_D(IST|ENS)_KEYS/.test(t), 'طبقةُ الإنفاذ ' + f + ': لا قائمةَ عدساتٍ ولا حقلَ عدسةٍ حرفيّاً');
  }
  same(W.KIVO_BUILD.LENSES.filter(k => W.KIVO_LENS_PLUGINS.keys.includes(k)), W.KIVO_BUILD.LENSES, 'كلُّ عدسةٍ مرجعية لها إضافة');
});

test('② الحرّاس: الحارسُ المرجعي يصنّف كلَّ موردٍ معلن في كل إضافة بمفتاحه المعلن (الخطة والجولات)', () => {
  const G = W.KIVO_GUARDS, ctx = { dept: 'd1', actor: { id: 'u', ekey: 'e1', role: 'staff' } };
  const plan = (fl) => ({ floors: [Object.assign({ sid: 'S1', name: 'الدور' }, fl)] });
  const rounds = (fl) => ({ '1447-3-5': { d: [Object.assign({ sid: 'S1', name: 'الدور' }, fl)] } });
  const keysOf = (res, a, b) => G.classify(res, a, b, ctx).keys();
  let n = 0;
  for (const m of M) {
    const c = m.resources.column;
    for (const res of m.guards.resources) {
      const wrap = res === 'bassam_plan_v1' ? plan : rounds;
      if (c) {
        const col = c.name, base = { uid: 'u1', name: 'أ', label: 'أ' };
        same(keysOf(res, wrap({ [col]: [] }), wrap({ [col]: [base] })), ['lens.' + m.key + '.create'], m.key + ' إنشاء · ' + res);
        same(keysOf(res, wrap({ [col]: [base] }), wrap({ [col]: [] })), ['lens.' + m.key + '.delete'], m.key + ' حذف · ' + res);
        for (const g of c.geometry.slice(0, 2)) same(keysOf(res, wrap({ [col]: [Object.assign({}, base, { [g]: 1 })] }), wrap({ [col]: [Object.assign({}, base, { [g]: 2 })] })), ['lens.' + m.key + '.geometry.edit'], m.key + ' هندسة ' + g);
        for (const s of c.status.fields.slice(0, 3)) same(keysOf(res, wrap({ [col]: [Object.assign({}, base, { [s]: 'a' })] }), wrap({ [col]: [Object.assign({}, base, { [s]: 'b' })] })), [c.status.op], m.key + ' حالة ' + s);
        same(keysOf(res, wrap({ [col]: [Object.assign({}, base, { note: 'a' })] }), wrap({ [col]: [Object.assign({}, base, { note: 'b' })] })), [c.editKey], m.key + ' تعديلٌ عام');
        for (const d of c.derived || []) same(keysOf(res, wrap({ [col]: [Object.assign({}, base, { [d]: 1 })] }), wrap({ [col]: [Object.assign({}, base, { [d]: 2 })] })), [], m.key + ' مشتقّ ' + d + ' لا يُصنَّف');
        n += 4 + c.geometry.slice(0, 2).length + c.status.fields.slice(0, 3).length;
      }
      for (const f of m.resources.elementFields || []) for (const col of f.cols) for (const x of f.fields) {
        const a = x === 'emp' ? ['e1'] : 1, b = x === 'emp' ? ['e1', 'e2'] : 2;
        same(keysOf(res, wrap({ [col]: [{ uid: 'u1', [x]: a }] }), wrap({ [col]: [{ uid: 'u1', [x]: b }] })), [f.op], m.key + ' حقلُ عنصر ' + col + '.' + x + ' · ' + res); n++;
      }
      for (const f of m.resources.floorFields || []) {
        const got = keysOf(res, wrap({ [f.field]: 1 }), wrap({ [f.field]: 2 }));
        same(got, res === 'bassam_plan_v1' ? [f.op] : ['round.edit'], m.key + ' حقلُ طابق ' + f.field + ' · ' + res + (res === 'bassam_rounds_v1' ? ' (الجولة: تعديلُ الجولة — المرجع)' : '')); n++;
      }
    }
  }
  assert.ok(n >= 90, 'مسابيرُ الحرّاس ' + n);
});

/* ── ③ التفاضل ── */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const FIELDS = ['fst', 'flow', 'closed', 'cBy', 'emp', 'needN', 'needS', 'uniNeed', 'count', 'pc', 'name', 'x', 'y', 'pts', 'active', 'cap', 'note'];
function elem(R, col, i) {
  const e = { uid: R() < 0.85 ? 'u' + col[0] + i : undefined, name: col + i };
  if (e.uid === undefined) delete e.uid;
  for (const f of FIELDS) if (R() < 0.35) e[f] = f === 'emp' ? (R() < 0.5 ? ['e1'] : ['e2', 'e3']) : (f === 'needS' ? { 'صباح': Math.floor(R() * 5) } : Math.floor(R() * 9));
  return e;
}
function floor(R, sid) {
  const f = { sid, name: 'دور ' + sid };
  for (const col of ['zones', 'gates', 'marks', 'paths']) if (R() < 0.8) f[col] = Array.from({ length: Math.floor(R() * 4) }, (_, i) => elem(R, col, i));
  if (R() < 0.5) f.dens = { th: Math.floor(R() * 9) };
  if (R() < 0.3) f.hideZones = true;
  return f;
}
function planOf(R) {
  const v = { floors: [floor(R, 'S1'), floor(R, 'S2')], months: { '1447-3': { d: [floor(R, 'S1')] }, '1447-4': [floor(R, 'S2')] }, cfg: { a: 1 } };
  for (const col of ['zones', 'gates', 'marks', 'paths']) if (R() < 0.6) v[col] = Array.from({ length: Math.floor(R() * 3) }, (_, i) => elem(R, col, i));
  return v;
}
function roundsOf(R) { return { '1447-3-5': { d: [floor(R, 'S1'), floor(R, 'S2')], ap: R() < 0.5 }, '1447-3-6': { d: [floor(R, 'S1')] }, meta: { x: 1 } }; }
function V(mask, rs, R) {
  const L = {}; ['zones', 'gates', 'marks', 'paths', 'dist', 'dens'].forEach((k, i) => { L[k] = !!(mask & (1 << i)); });
  const outSite = R() < 0.5 ? 'f:S2' : 'f:S1', outZone = 'u' + 'z' + Math.floor(R() * 3);
  return { lens: L, restrict: { Site: !!(rs & 1), 'Zone/Element': !!(rs & 2), Assigned: !!(rs & 4), Shift: false }, ekey: 'e1', ceil: false,
           siteOk: (s) => s !== outSite, zoneOk: (id) => id !== outZone };
}
test('③ التفاضل: الإسقاطُ والدمجُ من الإضافات = نسختُهما قبلها (64 تركيبةَ عدسات × 8 قيودِ نطاق × بياناتٍ عشوائية) — JSON حرفاً', async () => {
  assert.equal(wsrc.split(cur061).length - 1, 1, 'جزءُ 061 الحالي في العامل مرّةً واحدة');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_plug_')), basePath = path.join(dir, 'w_base.js');
  fs.writeFileSync(basePath, wsrc.replace(cur061, () => old061));
  const B = await internals(['enfFloorProj', 'enfFloorMerge', 'enfElemMask', 'ENF_PROJ'], basePath);
  fs.rmSync(dir, { recursive: true, force: true });
  let cases = 0, diffOn = 0;
  for (let mask = 0; mask < 64; mask++) for (let rs = 0; rs < 8; rs++) {
    const R = rng(mask * 131 + rs * 7 + 1), v = V(mask, rs, R);
    for (const res of ['bassam_plan_v1', 'bassam_rounds_v1']) {
      const mk = res === 'bassam_plan_v1' ? planOf : roundsOf, c = mk(R), n = mk(R);
      same(W.ENF_PROJ[res].on(v), B.ENF_PROJ[res].on(v), res + ' on · ' + mask + '/' + rs);
      if (W.ENF_PROJ[res].on(v)) diffOn++;
      same(W.ENF_PROJ[res].proj(c, v), B.ENF_PROJ[res].proj(c, v), res + ' proj · ' + mask + '/' + rs);
      same(W.ENF_PROJ[res].merge(c, n, v), B.ENF_PROJ[res].merge(c, n, v), res + ' merge · ' + mask + '/' + rs);
      cases += 3;
    }
    const f1 = floor(R, 'S1'), f2 = floor(R, 'S1');
    for (const site of [undefined, 'f:S1', 'f:S2', '?']) for (const rounds of [false, true]) {
      same(W.enfFloorProj(v, f1, site, rounds), B.enfFloorProj(v, f1, site, rounds), 'enfFloorProj');
      same(W.enfFloorMerge(v, f2, f1, site, rounds), B.enfFloorMerge(v, f2, f1, site, rounds), 'enfFloorMerge');
      for (const col of ['zones', 'gates', 'marks', 'paths']) for (const e of (f1[col] || []).slice(0, 2)) same(W.enfElemMask(v, col, e, site, rounds), B.enfElemMask(v, col, e, site, rounds), 'enfElemMask ' + col);
      cases += 2;
    }
  }
  assert.ok(cases > 5000 && diffOn > 900, 'حالات ' + cases + ' (الإسقاطُ فاعلٌ في ' + diffOn + ')');
});

test('④ إعادةُ التصنيف لا تمسّ العدساتِ المضمَّنة · ربطُ المفتاح بعدسته = المرجع', () => {
  const G = W.KIVO_GUARDS, ctx = { dept: 'd1', actor: { id: 'u', ekey: 'e1', role: 'staff' } };
  const a = { floors: [{ sid: 'S1', zones: [{ uid: 'z1', note: 1, count: 1, emp: ['e1'] }], dens: 1, gates: [{ uid: 'g1', x: 1 }] }] };
  const b = { floors: [{ sid: 'S1', zones: [{ uid: 'z1', note: 2, count: 2, emp: ['e1', 'e2'] }], dens: 2, gates: [{ uid: 'g1', x: 2 }] }] };
  const r0 = G.classify('bassam_plan_v1', a, b, ctx), before = JSON.stringify(r0.ops), r1 = W.enfPlugOps(r0);
  assert.equal(JSON.stringify(r1.ops), before, 'العملياتُ كما هي');
  same(r1.keys().sort(), ['lens.dens.reading.record', 'lens.dens.threshold.configure', 'lens.dist.assign.edit', 'lens.gates.geometry.edit', 'lens.zones.data.edit'].sort());
  assert.equal(W.enfPlugOps(null), null);
  for (const m of M) for (const k of m.keys.own.filter(x => x.startsWith('lens.'))) {
    assert.equal(W.KIVO_BUILD.lensOf(k) || W.enfPlugLensOf(k), m.key, k);
    assert.equal(W.enfIx().lens[k], m.key, 'enfIx.lens ' + k);
  }
});
