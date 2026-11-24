/* KIVO_259 (إصلاح) — شريحةُ صلاحيات نسخة الإدارة عند الاستعادة: KIVO.BassamDepts.permSlice (320 — مُستخرَجةٌ من منطق الغلاف كما هي عدا القائمتين).
   كان الغلافُ يصفّي السقفَ المستعاد بقائمةٍ حرفيّة من 6 صفحات والعدساتِ بـ5 بلا «المصليات» — فاستعادةُ «استبدال» لنسخة إدارةٍ حديثة كانت تُسقط من سقفها
   التخطيطَ والروابطَ والمساعدةَ والتقريرَ اليومي والاسترشادَ والمضبوطاتِ والجائزةَ وعدسةَ المصليات. الآن: مفاتيحُ المنصة الحالية (PAGE_KEYS · LENS_KEYS). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { blockFile, SRC, ROOT } from './harness.mjs';
import { needs } from './harness.mjs';

function load() {
  class Storage {
    constructor() { this._m = new Map(); }
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
    setItem(k, v) { this._m.set(String(k), String(v)); }
    removeItem(k) { this._m.delete(k); }
    clear() { this._m.clear(); }
    key(i) { return [...this._m.keys()][i] ?? null; }
    get length() { return this._m.size; }
  }
  const ls = new Storage();
  const w = { __BS_BOOT: { srv: 1, cf: 1 }, addEventListener() {}, localStorage: ls, console };
  const ctx = vm.createContext({ window: w, Storage, localStorage: ls, console, setTimeout, clearTimeout,
    document: { body: null, addEventListener() {}, getElementById() { return null; }, createElement() { return { remove() {}, addEventListener() {} }; } } });
  let ns = null; try { ns = blockFile('005-kivo-ns.js'); } catch (e) { ns = null; }
  if (ns) { vm.runInContext(fs.readFileSync(ns, 'utf8'), ctx, { filename: '005-kivo-ns.js' }); ctx.KIVO = w.KIVO; } else ctx.KIVO = w;
  ctx.KIVO.__BS_SRV = { flushAsync: async () => true }; // Explicit in-memory adapter stub; this unit tests the permission model only.
  vm.runInContext(fs.readFileSync(blockFile('320-dept-storage.js'), 'utf8'), ctx, { filename: '320-dept-storage.js' });
  return (w.KIVO || w).BassamDepts;
}
const D = load();
const pages = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests', 'pages.json'), 'utf8')).pages.map(p => p.key);
const PL = path.join(SRC, 'plugins', 'lenses');
const lenses = fs.readdirSync(PL).map(k => JSON.parse(fs.readFileSync(path.join(PL, k, 'manifest.json'), 'utf8'))).sort((a, b) => a.order - b.order).map(m => m.key);
const J = (x) => JSON.parse(JSON.stringify(x));

test('استعادة شريحة بلا عدسات تحفظ غياب الفرع أو null وبايتات الفروع الأجنبية', () => {
  for (const branch of [undefined, null, {}, { d2: ['zones'] }]) {
    const current = { caps: { d1: ['emps'] }, emps: { d1: {} }, ...(branch === undefined ? {} : { lenses: branch }) };
    const before = JSON.stringify(current);
    const restored = D.permSlice(J(current), 'd1', { capSet: true, cap: ['emps'], emps: {} }, 'replace', pages, lenses);
    assert.equal(JSON.stringify(restored), before, 'لا يُنشأ فرع عدسات فارغ لاستعادة بلا عدسات');
  }
  const restored = D.permSlice({ caps: {}, emps: {}, lenses: { d1: ['paths'], d2: ['zones'] } }, 'd1', { capSet: false, emps: {} }, 'replace', pages, lenses);
  assert.deepEqual(J(restored.lenses), { d2: ['zones'] }, 'يزال قيد الإدارة وحده من الفرع الموجود');
});

test('permSlice الأصلية نفسها مولدة للخادم؛ الاستعادة تمرر مفاتيح المنصة والعدسات القائمة', () => {
  assert.equal(typeof D.permSlice, 'function');
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'workers/parts/051c-department-permission-slice.js'), 'utf8'), context);
  assert.equal(context.rsPermSlice.toString(), D.permSlice.toString(), 'الوظيفة المولدة هي نص السياسة الأصلية نفسه');
  const rs = fs.readFileSync(path.join(ROOT, 'workers/parts/019d-atomic-restore.js'), 'utf8'), noCm0 = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ''), noCm = noCm0;
  /* V7 · د6 (QA) — قرارُ المالك ب3 (mgrimport): الاستيرادُ لا يغيّر السقفَ ولا العدسات ولا صحيفةَ المدير؛ الخادمُ يطبّق rsDeptPermsKeep على نسخ الإدارة
     (كان هنا: «rsPermSlice(… body.mode, PG_KEYS, KIVO_LENS_PLUGINS.keys)» — القاعدةُ السابقة). المشتق: الشريحةُ المولَّدة = نصُّ العميل (أعلاه) باقية،
     وطريقُ الاستعادة يمرّ بـ rsDeptPermsKeep بوضع الطلب، ولا يستدعي rsPermSlice على نسخ الإدارة؛ السلوكُ نفسه في v7_d6_mgrimport (٣). */
  /* V7 · 53 (ملحق 5 — «التضييق بدل الرفض»): وبمُضيِّق الأوراق narrowPerms — لغير مدير المنصة وحده، وهو permsImportNarrow (018c) ← perm44 narrowSheets لا غيرُه */
  assert.match(rs, /rsDeptPermsKeep\([\s\S]*?inputKeys\[K_PERM\][\s\S]*?dept,\s*requestedPerms,\s*body\.mode,\s*narrowPerms\)/, 'طريقُ الاستعادة يحفظ السقفَ والمدير: rsDeptPermsKeep بوضع الطلب ومُضيِّق الأوراق');
  assert.match(rs, /var narrowPerms = A\.u\.role === 'super' \? null : function \(c0, i0\) \{ var nr = permsImportNarrow\(A, dept, c0, i0, parseJson\(inputKeys\[K_PERM\], \{\}\)\); permDrops = nr\.drops; return nr\.out; \};/, 'المُضيِّق لغير مدير المنصة وحده، ونتيجتُه ما يعيده permsImportNarrow');
  const ar = fs.readFileSync(path.join(ROOT, 'workers/parts/018c-ancestry-rules.js'), 'utf8'), pin = /function permsImportNarrow\([\s\S]*?\n}\n/.exec(ar);
  assert.ok(pin, 'permsImportNarrow موجودة');
  assert.match(pin[0], /var r = perm44E\(\)\.narrowSheets\(cur, inc, \{/, 'الأوراقُ من narrowSheets (المحرّكُ المشترك)');
  assert.doesNotMatch(noCm0(pin[0]), /\.(caps|subs|capOwn|capSeed|lenses|empLens|tplOf)\s*(\[[^\]]*\])?\s*=(?!=)/, 'permsImportNarrow لا تكتب سقفاً ولا عدساتٍ ولا قوالب');

  assert.doesNotMatch(noCm(rs), /rsPermSlice\s*\(/, 'لا يطبّق الخادمُ شريحةَ السقف على نسخ الإدارة (قرار المالك ب3)');
  const keep = /function rsDeptPermsKeep\([\s\S]*?\n}\n/.exec(rs); assert.ok(keep, 'rsDeptPermsKeep موجودة');
  assert.doesNotMatch(keep[0], /\.(caps|subs|capOwn|capSeed)\b/, 'rsDeptPermsKeep لا تمسّ السقف');
  /* V7 · د7 (52 · ك1): العدساتُ لا تُمسّ إلا تضييقاً من قائمة النسخة (rsDeptLensNarrow = ما قبلُ ∩ النسخة) — لا كتابةَ أخرى للعدسات؛
     والسلوكُ (لا تُفعَّل عدسةٌ لم تكن مفعّلة · نسخةٌ بلا قائمة لا تغيّر شيئاً) في v7_d7_lensimp ①②③. */
  const lensW = keep[0].match(/\.lenses\b[^;\n]*/g) || [];
  assert.deepEqual(lensW.filter((w) => /=(?!=)/.test(w) && !/^\.lenses = isObj\(pm\.lenses\)/.test(w) && !/^\.lenses\[id\] = lens$/.test(w)), [], 'لا كتابةَ للعدسات إلا نتيجةَ rsDeptLensNarrow');
  assert.match(keep[0], /var lens = rsDeptLensNarrow\(pm, id, PP\)/, 'العدساتُ من rsDeptLensNarrow وحدها');
  /* V7 · 53 (ملحق 5): لا كتابةَ في pm إلا الأوراقُ والعدساتُ بالإدارة نفسِها — والأوراقُ: صحائفُ المديرين من القائم، وأوراقُ الموظفين من النسخة ثم من narrow وحده */
  const pmW = noCm(keep[0]).match(/\bpm\.\w+(\[[^\]]*\])?\s*=(?!=)[^;]*/g) || [];
  assert.deepEqual(pmW.map((w) => w.replace(/\s+/g, ' ')), ['pm.emps = isObj(pm.emps) ? pm.emps : {}', 'pm.emps[id] = out', 'pm.lenses = isObj(pm.lenses) ? pm.lenses : {}', 'pm.lenses[id] = lens'], 'rsDeptPermsKeep تكتب أوراقَ الإدارة وعدساتِها وحدها');
  const outW = noCm(keep[0]).match(/\bout\[ek\] = [^;]*/g) || [], i0W = noCm(keep[0]).match(/\bi0(\[ek\])? = [^;]*/g) || [];
  assert.deepEqual(outW, ['out[ek] = cur[ek]', 'out[ek] = i0[ek]'], 'الأوراقُ: صحائفُ المديرين من القائم وما سواها من i0');
  assert.deepEqual(i0W, ['i0 = {}', 'i0[ek] = inc[ek]', 'i0 = narrow(c0, i0)'], 'i0: فارغٌ ثم أوراقُ موظفي النسخة (بلا صحائف المديرين) ثم المُضيِّق وحده');
  assert.match(keep[0], /if \(narrow\) i0 = narrow\(c0, i0\);/, 'المُضيِّق يُطبَّق متى مُرِّر');
  const narrow = /function rsDeptLensNarrow\([\s\S]*?\n}\n/.exec(rs); assert.ok(narrow, 'rsDeptLensNarrow موجودة');
});

test('★ الاستبدال: السقفُ والعدساتُ المستعادة = ما في النسخة (مصفّاةً بمفاتيح المنصة الحالية وحدها) — لا تسقط صفحةٌ ولا عدسةٌ أُضيفت لاحقاً', needs('award', 'seized'), () => {
  const PP = { capSet: true, cap: ['emps', 'planning', 'irshad', 'seized', 'award', 'links', 'help', 'dreport', 'plan', 'daily', 'bogus'], emps: { e1: { plan: ['view'] } }, lenses: ['zones', 'dens', 'gates', 'bogus'] };
  const cur = { caps: { d1: ['emps'] }, emps: { d1: { e9: { emps: ['view'] } } }, lenses: { d1: ['paths'] }, caps2: 1 };
  const out = D.permSlice(J(cur), 'd1', PP, 'replace', pages, lenses);
  assert.deepEqual(J(out.caps.d1), ['emps', 'planning', 'irshad', 'seized', 'award', 'links', 'help', 'dreport', 'plan', 'daily'], 'السقفُ كما في النسخة عدا المجهول');
  assert.deepEqual(J(out.lenses.d1), ['zones', 'dens', 'gates'], 'العدساتُ كما في النسخة (ومنها المصليات) عدا المجهول');
  assert.deepEqual(J(out.emps.d1), { e1: { plan: ['view'] } }, 'منحُ الموظفين كما في النسخة');
  assert.equal(out.caps2, 1, 'ما سوى الإدارة لا يُمسّ');
  /* الخلل السابق (للتوثيق): بالقائمتين الحرفيّتين نفسهما كانت النتيجة تُسقط 7 صفحات وعدسةَ المصليات */
  const old = D.permSlice(J(cur), 'd1', PP, 'replace', null, null);
  assert.deepEqual(J(old.caps.d1), ['emps', 'plan', 'daily'], 'القائمتان القديمتان (احتياطٌ إن غاب BassamPerm)');
  assert.deepEqual(J(old.lenses.d1), ['dens', 'gates']);
});

test('الدمج: لا يكتب فوق سقفٍ أو منحٍ قائمة (null) · ويكتب إن لم يكن للإدارة شيء', () => {
  const PP = { capSet: true, cap: ['emps', 'planning'], emps: {}, lenses: ['zones'] };
  assert.equal(D.permSlice({ caps: { d1: ['emps'] } }, 'd1', PP, 'merge', pages, lenses), null);
  assert.equal(D.permSlice({ emps: { d1: { e1: {} } } }, 'd1', PP, 'merge', pages, lenses), null);
  const out = D.permSlice({ caps: { d2: ['x'] } }, 'd1', PP, 'merge', pages, lenses);
  assert.deepEqual(J(out.caps), { d2: ['x'], d1: ['emps', 'planning'] });
});

test('لا سجلَّ سقفٍ في النسخة = الإدارةُ على افتراضها (يُحذف سقفُها) · غيابُ العدسات = «الكل مفعّل» · مدخلاتٌ تالفة لا تكتب', () => {
  const cur = () => ({ caps: { d1: ['emps'] }, emps: {}, lenses: { d1: ['zones'] } });
  let o = D.permSlice(cur(), 'd1', { capSet: false, cap: ['emps'], emps: {} }, 'replace', pages, lenses);
  assert.ok(!('d1' in o.caps) && !('d1' in o.lenses), 'capSet:false ⇒ لا سقف · لا عدسات في النسخة ⇒ الكل');
  o = D.permSlice(cur(), 'd1', { cap: [], emps: {} }, 'replace', pages, lenses);
  assert.ok(!('d1' in o.caps), 'ملفٌّ قديم بسقفٍ فارغٍ ومنحٍ فارغة ⇒ لا سقف');
  o = D.permSlice(cur(), 'd1', { cap: null, emps: [] , lenses: [] }, 'replace', pages, lenses);
  assert.ok(!('d1' in o.caps) && Array.isArray(o.lenses.d1) && o.lenses.d1.length === 0 && JSON.stringify(o.emps.d1) === '{}', 'cap null ⇒ لا سقف · lenses [] ⇒ كلُّها مطفأة · emps مصفوفة ⇒ {}');
  assert.equal(D.permSlice(cur(), '', { cap: [] }, 'replace', pages, lenses), null);
  assert.equal(D.permSlice(cur(), 'd1', null, 'replace', pages, lenses), null);
  assert.equal(D.permSlice(cur(), 'd1', ['emps'], 'replace', pages, lenses), null);
  const o2 = D.permSlice('garbage', 'd1', { capSet: true, cap: ['emps'] }, 'replace', pages, lenses);
  assert.deepEqual(J(o2.caps), { d1: ['emps'] }, 'سجلٌّ حاليٌّ تالف ⇒ يبدأ من فارغ');
});
