/* V7 · 53 (ملحق 6 · البندان 2 و4): نقلُ سلوك البرودكشن (19d047f · ceaba3b · b295c41) — لا كودِه.
   (2) رمزُ خيار المنطقة/الدور/النوع يقبل سالباً في أوّله (دور -1) ولا يقبله في وسطه، والسالبُ وحده لا يُحفظ.
       الرمزُ المخزَّن يبقى بشرطاتٍ (هويّةُ الربط والاستيراد)؛ العرضُ وحده بفاصل « / » (KIVO.zoneCode · ZSEP)، والبحثُ يقبل الكتابتين،
       وطبقةُ الأرقام العربية (120) لا تقطع الرمزَ المعروض: يبقى مقطعاً واحداً بترتيبه.
   (4) حجمُ خط رمز المصلى على الخريطة ينزل إلى 0.5 (كان 4–40) — في الخطة والجولات.
   منطقُ الصفحتين الحقيقيّ (node:vm · canvas_world) فوق نسخةٍ بشكل Production (oldFile({small:true}): طوابقُ بـsid وiid ومصلياتٌ بلا eid ·
   رموزُها بشرطات D6Z0-1) · بياناتٌ TEST_ONLY. PLAN_LOGIC / DAILY_LOGIC / KIVO_KIT / KIVO_DIGITS تبدّل الملفات لإثبات الإخفاق على السابق. */
import './clock.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';
import { world } from './canvas_world.mjs';
import { operations } from './operational_ui_fx.mjs';
import { oldFile } from './v7_d6_import_fx.mjs';

const T = ' ';
const PLAN = process.env.PLAN_LOGIC ? fs.readFileSync(process.env.PLAN_LOGIC, 'utf8') : undefined;
const DAILY = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
const KIT = process.env.KIVO_KIT || path.join(SRC, 'components', '565-page-kit.js');
const DIGITS = process.env.KIVO_DIGITS || path.join(SRC, 'i18n', '120-arabic-digits.js');
const clone = (v) => JSON.parse(JSON.stringify(v));
const OPTS = { region: [{ n: 'TEST_ONLY الشرقية', c: 'A' }, { n: 'TEST_ONLY الغربية', c: 'ش' }], level: [{ n: 'TEST_ONLY قبو', c: '-1', r: 'TEST_ONLY الشرقية' }, { n: 'TEST_ONLY أرضي', c: '0', r: 'TEST_ONLY الغربية' }],
  ztype: [{ n: 'TEST_ONLY رجال', k: 'M' }, { n: 'TEST_ONLY نساء', k: 'ص' }], zcat: [] };

let PROD = null;
async function prod() {
  if (!PROD) { const f = await oldFile({ small: true }); PROD = { plan: JSON.parse(f.data.bassam_plan_v1), rounds: JSON.parse(f.data.bassam_rounds_v1) }; }
  return clone(PROD);
}
/* صفحةٌ حقيقيّة بالخدمة الاصطناعية للعمليات (الحفظ يُقرّ ok:1) — الصفحةُ تُبنى بملف الطقم المختار (KIVO_KIT) */
function page(slug, docs, src) {
  const W = world();
  const c = (() => {
    if (KIT === path.join(SRC, 'components', '565-page-kit.js')) return W.logic(slug, src);
    /* الطقمُ السابق: يُحمَّل بعد الخدمات فيحلّ محلّ الحالي */
    const read0 = fs.readFileSync; fs.readFileSync = function (p, ...a) { return String(p).endsWith('565-page-kit.js') ? read0.call(fs, KIT, ...a) : read0.call(fs, p, ...a); };
    try { return W.logic(slug, src); } finally { fs.readFileSync = read0; }
  })();
  const op = operations(docs);
  W.KIVO.__BS_SRV = { ...(W.KIVO.__BS_SRV || {}), operations: op.service, rev: () => 0 };
  const toasts = []; c.bsToast = (m) => toasts.push(String(m)); c.bsAck = async () => true;
  return { W, c, op, toasts };
}
/* يومٌ من جولات النسخة بمفتاح الصفحة: الصفحةُ ميلادية (V7 · 53 تقويم) فيُنقل اليومُ إلى اليوم التشغيليّ الجاري (clock.mjs) بمفتاح
   BassamCal الميلادي (YYYY-MM-DD) — يومٌ حيٌّ قابلٌ للتحرير كما كان — وموقعُه الأول بإظهار الرموز */
let TODAY = null;
const today = () => { if (!TODAY) { const W = world(); W.logic('daily', DAILY); TODAY = W.KIVO.BassamCal.gToday(); } return TODAY; };
function liveDay(D) {
  const rounds = D.rounds, k0 = Object.keys(rounds).find((k) => /^\d+-\d+-\d+$/.test(k) && rounds[k].d), { y, m, d, k: day } = today();
  if (day !== k0) { rounds[day] = rounds[k0]; delete rounds[k0]; }
  rounds[day].d.forEach((f) => (f.showCodes = true));
  return { rounds, day, y, m, d };
}
const textOf = (n) => (n == null ? '' : typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : n.ch ? textOf(n.ch) : '');
const labels = (nodes) => (nodes || []).filter(Boolean).map((g) => { const t = (g.ch || []).flat().find((x) => x && x.t === 'text'); return t ? { text: textOf(t.ch), fs: t.p.fontSize } : null; }).filter(Boolean);

test('ملحق 6 · 2 — رمزُ الخيار: سالبٌ في أوّله وحده، والسالبُ وحده لا يُحفظ — في الخطة والجولات', async () => {
  const D = await prod();
  for (const [slug, src] of [['plan', PLAN], ['daily', DAILY]]) {
    const { c, toasts } = page(slug, { bassam_plan_v1: D.plan, bassam_zone_opts_v1: clone(OPTS), bassam_rounds_v1: D.rounds }, src);
    assert.equal(c._codeSan('-1'), '-1', slug + ': سالبٌ في الأوّل يبقى');
    assert.equal(c._codeSan('−٢'), '-2', slug + ': علامةُ الطرح والرقمُ العربي');
    assert.equal(c._codeSan('1-2'), '12', slug + ': لا سالبَ في الوسط');
    assert.equal(c._codeSan('--1'), '-1', slug);
    assert.equal(c._codeSan('A b'), 'Ab', slug);
    /* إضافةُ دورٍ برمز -2 في منطقته، ثم سالبٌ وحده */
    c.state = { ...c.state, zoneOpts: clone(OPTS), zEdit: { region: 'TEST_ONLY الشرقية' }, zDdNew: 'TEST_ONLY قبو ثانٍ', zDdNewC: c._codeSan('-2') };
    c.addZoneOpt('level');
    const lv = (c.state.zoneOpts.level || []).find((o) => o.n === 'TEST_ONLY قبو ثانٍ');
    assert.ok(lv && lv.c === '-2', slug + ': الدورُ محفوظٌ برمز -2: ' + JSON.stringify(c.state.zoneOpts.level));
    const n0 = c.state.zoneOpts.region.length;
    c.state = { ...c.state, zDdNew: 'TEST_ONLY منطقة بلا رمز', zDdNewC: c._codeSan('-') };
    c.addZoneOpt('region');
    assert.equal(c.state.zoneOpts.region.length, n0, slug + ': سالبٌ وحده لا يُحفظ');
    assert.match(toasts.join(' | '), /اكتب الرمز/, slug);
  }
});

test('ملحق 6 · 2 — الرمزُ المخزَّن بشرطاتٍ كما هو، والعرضُ بـ« / »: ملصقُ الخريطة ومعاينةُ المحرّر ورمزُ الخيار — على نسخةٍ بشكل Production', async () => {
  const D = await prod();
  assert.equal(D.plan.floors[0].zones[0].code, 'D6Z0-0', 'رموزُ النسخة بشرطات كما في Production');
  /* الخطة: مصلى من النسخة + مصلى بدورٍ سالب */
  {
    const plan = D.plan, f0 = plan.floors[0];
    f0.zones[1] = { ...f0.zones[1], region: 'TEST_ONLY الشرقية', level: 'TEST_ONLY قبو', ztype: 'TEST_ONLY رجال', ser: '05', code: 'A--1-M-05' };
    const { c, op } = page('plan', { bassam_plan_v1: plan, bassam_zone_opts_v1: clone(OPTS) }, PLAN);
    c.state = { ...c.state, year: 2026, month: 10, floor: 0, floors: plan.floors, zones: clone(f0.zones), gates: [], marks: [], paths: [], zoneOpts: clone(OPTS), tool: 'select', lens: 'plan', view: { x: 0, y: 0, w: 1000, h: 600 }, sel: null, selMulti: [],
      zEdit: { i: 1, region: 'TEST_ONLY الشرقية', level: 'TEST_ONLY قبو', ztype: 'TEST_ONLY رجال', ser: '05' } };
    const v = c.renderVals(), L = labels(v.zoneLabelNodes);
    assert.ok(L.some((x) => x.text === 'D6Z0' + T + '/' + T + '0'), 'ملصقُ مصلى النسخة: ' + JSON.stringify(L.map((x) => x.text)));
    assert.ok(L.some((x) => x.text === 'A' + T + '/' + T + '-1' + T + '/' + T + 'M' + T + '/' + T + '05'), 'السالبُ ملتصقٌ برقمه: ' + JSON.stringify(L.map((x) => x.text)));
    assert.equal(v.zeCodePreview, 'A' + T + '/' + T + '-1' + T + '/' + T + 'M' + T + '/' + T + '05', 'معاينةُ المحرّر');
    assert.equal(c._composeZoneCode('TEST_ONLY الشرقية', 'TEST_ONLY قبو', '05', null, 'TEST_ONLY رجال'), 'A--1-M-05', 'الرمزُ المخزَّن بشرطات');
    assert.equal(c.state.zones[1].code, 'A--1-M-05');
    assert.equal(op.control.stages.length, 0, 'العرضُ لا يكتب شيئاً');
  }
  /* الجولات: يومٌ من النسخة بمصلياته */
  {
    const { rounds, day, y, m, d } = liveDay(D);
    rounds[day].d[0].zones[0] = { ...rounds[day].d[0].zones[0], code: 'ش--2-ص-12' };
    const { c } = page('daily', { bassam_plan_v1: D.plan, bassam_zone_opts_v1: clone(OPTS), bassam_rounds_v1: rounds }, DAILY);
    c.state = { ...c.state, year: y, month: m, day: d, floor: 0, rounds, lens: 'zones', panelTab: 'zones', tool: 'select', dsTab: 'rounds', dview: { x: 0, y: 0, w: 1000, h: 600 }, zoneOpts: clone(OPTS),
      zEdit: { i: 0, region: 'TEST_ONLY الشرقية', level: 'TEST_ONLY قبو', ztype: 'TEST_ONLY رجال', ser: '7' } };
    const v = c.renderVals(), L = labels(v.dsZoneLabelNodes);
    assert.ok(L.some((x) => x.text === 'ش' + T + '/' + T + '-2' + T + '/' + T + 'ص' + T + '/' + T + '12'), 'ملصقُ الجولة: ' + JSON.stringify(L.map((x) => x.text).slice(0, 4)));
    assert.ok(L.some((x) => x.text === 'D6R0' + T + '/' + T + '1'), 'ملصقُ مصلى النسخة في الجولة');
    assert.equal(v.zeCodePreview, 'A' + T + '/' + T + '-1' + T + '/' + T + 'M' + T + '/' + T + '7');
    assert.equal(rounds[day].d[0].zones[0].code, 'ش--2-ص-12', 'المخزَّن كما هو');
  }
  /* رمزُ الخيار في القوائم المنسدلة يسبقه « / » لا # (المصدر نفسُه — مرّتان في كل صفحة) */
  for (const f of [path.join(SRC, 'systems', 'plan', 'client', 'logic.js'), path.join(SRC, 'systems', 'daily', 'client', 'logic.js')]) {
    const s = process.env.PLAN_LOGIC && f.includes('plan') ? PLAN : process.env.DAILY_LOGIC && f.includes('daily') ? DAILY : fs.readFileSync(f, 'utf8');
    assert.equal(s.split('"/\\u2009" + ').length - 1, 2, path.basename(path.dirname(path.dirname(f))) + ': رمزُ الخيار يسبقه « / »');
  }
});

test('ملحق 6 · 2 — KIVO.zoneCode: الفاصلُ بين الأجزاء والسالبُ ملتصقٌ برقمه · طولُ الملصق · البحثُ بالكتابتين', async () => {
  const { c } = page('plan', { bassam_plan_v1: (await prod()).plan }, PLAN);
  const zc = (s) => c._zc(s);
  assert.equal(zc('A-2-M-05'), `A${T}/${T}2${T}/${T}M${T}/${T}05`);
  assert.equal(zc('A--1-M-05'), `A${T}/${T}-1${T}/${T}M${T}/${T}05`);
  assert.equal(zc('-1-M-05'), `-1${T}/${T}M${T}/${T}05`);
  assert.equal(zc('05'), '05'); assert.equal(zc('-1'), '-1'); assert.equal(zc(''), ''); assert.equal(zc(null), '');
});

/* طبقةُ الأرقام العربية الحقيقية (120) في vm بلا DOM — fmt(نص, سياقُ الفقرة) */
function digits() {
  const ctx = { KIVO: {}, WeakMap, document: { addEventListener() {}, createTreeWalker() {}, body: null }, MutationObserver: class { observe() {} disconnect() {} } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(DIGITS, 'utf8'), ctx, { filename: '120-arabic-digits.js' });
  return ctx.KIVO.BassamDigits;
}
test('ملحق 6 · 2 — طبقةُ الأرقام العربية لا تقطع الرمزَ المعروض: مقطعٌ واحد بترتيبه في فقرةٍ من اليمين', () => {
  const D = digits(), Z = (s) => s.replace(/([^-])-/g, '$1' + T + '/' + T);
  const iso = (t) => (t.match(/⁦/g) || []).length;   /* LRI: كلُّ عزلٍ مقطعٌ مستقلّ يرتّبه سياقُ الفقرة */
  /* رمزٌ رقميّ كلُّه: كان «1-2-05» مقطعاً واحداً بالشرطات — ويبقى واحداً بالفاصل */
  const num = D.fmt(Z('1-2-05'), 'R');
  assert.equal(iso(num), 1, 'رقمُ المصلى الرقميّ مقطعٌ واحد: ' + JSON.stringify(num));
  assert.equal(D.plain(num), '١' + T + '/' + T + '٢' + T + '/' + T + '٠٥');
  const neg = D.fmt(Z('-1-2-05'), 'R');
  assert.equal(iso(neg), 1, 'والسالبُ في أوّله منه: ' + JSON.stringify(neg));
  assert.equal(D.plain(neg), '-١' + T + '/' + T + '٢' + T + '/' + T + '٠٥');
  assert.equal(iso(D.fmt(Z('1--1-05'), 'R')), 1, 'دورٌ سالب في الوسط');
  /* ما فيه حرفٌ لاتيني يبقى كما كُتب — كلمةً واحدة كما كان بالشرطات (المسافةُ الرفيعة لا تقطعها) */
  for (const code of ['A-2-M-05', 'A--1-M-05', 'D6Z0-1']) assert.equal(D.fmt(Z(code), 'R'), Z(code), code);
  /* وما سوى الرمز كما كان: تاريخٌ ونسبةٌ وجملةٌ عربية */
  assert.equal(D.plain(D.fmt('اليوم 12/5', 'R')), 'اليوم ١٢/٥');
  assert.equal(D.plain(D.fmt('القيمة 3 / 4', 'R')), 'القيمة ٣ / ٤', 'الشرطة المائلة بمسافةٍ عادية ليست فاصلَ الرمز');
});

test('ملحق 6 · 4 — حجمُ خط رمز المصلى ينزل إلى 0.5 في الخطة والجولات (كان 4) ويُرسم به', async () => {
  const D = await prod();
  /* الخطة */
  {
    const plan = D.plan, f0 = plan.floors[0];
    const { c } = page('plan', { bassam_plan_v1: plan, bassam_zone_opts_v1: clone(OPTS) }, PLAN);
    c.state = { ...c.state, year: 2026, month: 10, floor: 0, floors: plan.floors, zones: clone(f0.zones), gates: [], marks: [], paths: [], zoneOpts: clone(OPTS), tool: 'select', lens: 'plan', view: { x: 0, y: 0, w: 1000, h: 600 }, sel: null, selMulti: [] };
    c.savePlan = () => {};
    c.state = { ...c.state, zEdit: { i: 0, ser: '00', lsz: '0.5', lang: '' } };
    c.saveZoneEdit();
    assert.equal(c.state.zones[0].lsz, 0.5, 'الخطة: lsz = 0.5 (كان يُرفع إلى 4)');
    c.state = { ...c.state, zEdit: { i: 1, ser: '00', lsz: '0.2', lang: '' } }; c.saveZoneEdit();
    assert.equal(c.state.zones[1].lsz, 0.5, 'الخطة: ما دون 0.5 يُرفع إلى 0.5');
    c.state = { ...c.state, zEdit: null };
    const L = labels(c.renderVals().zoneLabelNodes);
    assert.ok(L.some((x) => x.fs === 0.5), 'الخطة: الملصقُ مرسومٌ بالحجم 0.5: ' + JSON.stringify(L.map((x) => x.fs)));
  }
  /* الجولات */
  {
    const { rounds, day, y, m, d } = liveDay(D);
    const { c } = page('daily', { bassam_plan_v1: D.plan, bassam_zone_opts_v1: clone(OPTS), bassam_rounds_v1: rounds }, DAILY);
    c.state = { ...c.state, year: y, month: m, day: d, floor: 0, rounds, lens: 'zones', panelTab: 'zones', tool: 'select', dsTab: 'rounds', dview: { x: 0, y: 0, w: 1000, h: 600 }, zoneOpts: clone(OPTS) };
    let saved = null; c.saveRounds = (v) => { saved = v; c.state = { ...c.state, rounds: v }; return Promise.resolve({ ok: 1 }); };
    c.state = { ...c.state, zEdit: { i: 0, ser: '00', lsz: '0.5', lang: '' } };
    c.saveZoneEdit();
    assert.ok(saved, 'الجولات: حُفظت الجولة');
    assert.equal(saved[day].d[0].zones[0].lsz, 0.5, 'الجولات: lsz = 0.5 (كان يُرفع إلى 4)');
    const L = labels(c.renderVals().dsZoneLabelNodes);
    assert.ok(L.some((x) => x.fs === 0.5), 'الجولات: الملصقُ مرسومٌ بالحجم 0.5: ' + JSON.stringify(L.map((x) => x.fs)));
  }
  /* حقلُ الإدخال يعلن المدى الجديد (المصدر) */
  for (const s of [PLAN || fs.readFileSync(path.join(SRC, 'systems', 'plan', 'client', 'logic.js'), 'utf8'), DAILY || fs.readFileSync(path.join(SRC, 'systems', 'daily', 'client', 'logic.js'), 'utf8')])
    assert.match(s, /\("lsz", "حجم الخط \(0\.5–40\)", 0\.5, 40, 0\.5\)/);
});
