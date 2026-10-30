import { attachTaskOperations } from './tasks_vm_operations_fx.mjs';
/* KIVO_265 · البند 18 (المسار D) — عرضُ بيانات ختم الإثبات للمسؤول في نافذة «عرض توثيق المهمة» بصفحة المهام (src/modules/tasks في vm + 565 الحقيقي):
   r21.meta = [{img, at, lat, lng, acc}] بترتيب الصور (يحفظها 062c كما ختمتها واجهةُ «ملفي») ⇒ تحت كل صورة سطرٌ: الوقتُ بتوقيت الرياض (لا بتوقيت
   جهاز المسؤول) والإحداثياتُ رابطَ خرائط https://maps.google.com/?q=lat,lng أو «بلا موقع»؛ وصورةٌ بلا بيانات بلا سطر. بياناتٌ اصطناعية (tasks_fx row). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { ME, D, DAY, row, PNG } from './tasks_fx.mjs';

const LOGIC = moduleLogic('tasks');
const IMG1 = 'img_tskpm1_a1', IMG2 = 'img_tskpm1_b2', IMG3 = 'img_tskpm1_c3';
async function page(storeJson) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify([{ eid: ME.eid, name: ME.name }])]]);
  const KIVO = {}, toasts = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, isFinite, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 }, fetch: async () => ({ status: 0, text: async () => '' }) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => [] };
  KIVO.BassamDepts = { active: () => D }; KIVO.BassamSup = { isSup: () => false };
  /* مخزنُ الصور (360): الصورتان الأولى والثالثة موجودتان · الثانية 404 */
  KIVO.BassamIDB = { getInfo: (id) => Promise.resolve(id === IMG2 ? { ok: false, status: 404 } : { ok: true, v: PNG }) };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic(+parts).js' });
  const opsFixture = await attachTaskOperations(ctx, { store });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  return { c, opsFixture, toasts };
}
function allRows(V) { const out = [], seen = new Set(); const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4 || seen.has(o)) return; seen.add(o); if (o.tkcT && Array.isArray(o.tkcT)) out.push(o); for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1)); else if (v && typeof v === 'object' && k !== 'tkcT') walk(v, d + 1); } }; walk(V, 0); return out; }
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
const [Y, M] = DAY.split('-').map(Number);
const AT = Date.UTC(2026, 9, 20, 7, 5, 0);   /* 10:05 بالرياض (UTC+3) — مستقلٌّ عن منطقة الجهاز */
const WITH = 1760000077001, NONE = 1760000077002;

test('البند 18 · نافذةُ التوثيق: تحت كل صورة وقتُ الختم بالرياض ورابطُ الخرائط (±الدقة) أو «بلا موقع» — بهوية الصورة لا بموضعها · وبلا بيانات لا سطر', async () => {
  const now = Date.now(), HR = 36e5;
  const meta = [
    { img: IMG2, at: AT + 60e3, lat: null, lng: null, acc: null },                  /* بلا موقع (رُتّبت قبل الأولى عمداً — القراءةُ بالهوية) */
    { img: IMG1, at: AT, lat: 21.4225, lng: 39.8262, acc: 12.4 },
  ];
  const S = { [DAY]: [
    row({ id: WITH, title: 'بختم', eid: ME.eid, st: 'done', dur: 60, acc: now - 2 * HR, fin: now - HR, s: now - 3 * HR, e: now, r21: { imgs: [IMG1, IMG2, IMG3], note: 'تم', at: now - HR, sub: now - HR, meta } }),
    row({ id: NONE, title: 'بلا ختم', eid: ME.eid, st: 'done', dur: 60, acc: now - 2 * HR, fin: now - HR, s: now - 3 * HR, e: now, r21: { imgs: [IMG3], note: '', at: now - HR, sub: now - HR } }),
  ] };
  const P = await page(JSON.stringify(S));
  P.c.setState({ year: Y, month: M, perPage: 0 });
  let V = P.c.renderVals(); const by = (id) => allRows(V).find((t) => t.tkcT[13] === id);
  assert.equal(V.tkProofOn, false);
  by(WITH).proofOpen(); V = P.c.renderVals();
  assert.equal(V.tkProofOn, true); assert.equal(V.tkProofImgs.length, 3);
  const [a, b, c] = V.tkProofImgs;
  /* الأولى: وقتٌ وموقع — بتوقيت الرياض صراحةً (10:05 ص) ورابطُ الخرائط بالإحداثيات نفسِها والدقةُ مقرَّبة */
  assert.equal(a.stampOn, true); assert.match(a.stampAt, /10:05/); assert.match(a.stampAt, /ص/); assert.match(a.stampAt, /1448/);
  assert.equal(a.geoOn, true); assert.equal(a.geoOff, false); assert.equal(a.geoUrl, 'https://maps.google.com/?q=21.4225,39.8262'); assert.equal(a.geoTxt, 'الموقع على الخريطة (±12 م)');
  /* الثانية: وقتٌ و«بلا موقع» — ولو كانت الصورةُ نفسُها تعذّر جلبُها (السطرُ لا يتعلّق بتحميل الصورة) */
  assert.equal(b.stampOn, true); assert.match(b.stampAt, /10:06/); assert.equal(b.geoOn, false); assert.equal(b.geoOff, true); assert.equal(b.geoUrl, ''); assert.equal(b.geoTxt, 'بلا موقع');
  /* الثالثة: لا بياناتٍ لها (لا بالهوية ولا بالموضع) ⇒ لا سطر */
  assert.equal(c.stampOn, false); assert.equal(c.stampAt, ''); assert.equal(c.geoOn, false); assert.equal(c.geoOff, false);
  /* بعد جلب الصور: الحالاتُ كما كانت (الأولى تُعرض · الثانية خطأٌ بسببه) والسطرُ باقٍ */
  await flush(); V = P.c.renderVals();
  assert.equal(V.tkProofImgs[0].on, true); assert.equal(V.tkProofImgs[1].err, true); assert.match(V.tkProofImgs[1].errTxt, /غير موجودة/);
  assert.equal(V.tkProofImgs[0].geoUrl, 'https://maps.google.com/?q=21.4225,39.8262'); assert.equal(V.tkProofImgs[1].geoTxt, 'بلا موقع');
  /* مهمةٌ بلا meta أصلاً: لا سطرَ ولا خطأ */
  V.tkProofClose(); V = P.c.renderVals(); assert.equal(V.tkProofOn, false);
  by(NONE).proofOpen(); V = P.c.renderVals();
  assert.equal(V.tkProofImgs.length, 1); assert.equal(V.tkProofImgs[0].stampOn, false);
  /* من قائمة الصف («عرض التوثيق») تصل meta كذلك */
  V.tkProofClose(); V = P.c.renderVals();
  const menu = (by(WITH).tkcMenu || by(WITH).menu || []).find((m) => m && /توثيق/.test(m.label || m.t || ''));
  if (menu && menu.run) { menu.run(); assert.deepEqual(P.c.state.tkProof.meta, meta, 'meta من قائمة الصف'); }
  else assert.ok(P.c.state.tkProof === null || P.c.state.tkProof === undefined, 'لا قائمةَ توثيق في الصف لهذه الصلاحيات');
});

test('القالب: سطرُ الختم داخل عنصر الصورة في نافذة التوثيق (وقتٌ · رابطٌ أو «بلا موقع») — بالرموز الدلالية', async () => {
  const v = fs.readFileSync(path.join(ROOT, 'src/modules/tasks/view.html'), 'utf8');
  const i0 = v.indexOf('<sc-for list="{{tkProofImgs}}"'), i1 = v.indexOf('</sc-for>', i0); assert.ok(i0 > 0 && i1 > i0);
  const s = v.slice(i0, i1);
  assert.ok(s.includes('<sc-if value="{{im.stampOn}}"') && s.includes('{{im.stampAt}}') && s.includes('href="{{im.geoUrl}}"') && s.includes('{{im.geoTxt}}'), 'سطرُ الختم');
  assert.ok(s.indexOf('{{im.on}}') < s.indexOf('{{im.stampOn}}') && s.indexOf('{{im.err}}') < s.indexOf('{{im.stampOn}}'), 'تحت الصورة وحالاتِها');
  assert.ok(s.includes('<div><sc-if value="{{im.on}}"') && s.trimEnd().endsWith('</div>'), 'غلافٌ واحد لكل صورة (خليةُ الشبكة)');
  assert.doesNotMatch(s.slice(s.indexOf('{{im.stampOn}}')), /#[0-9a-fA-F]{3,6}\b/, 'لا hex جديد');
});
