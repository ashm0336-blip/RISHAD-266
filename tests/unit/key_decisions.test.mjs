/* KIVO_259 · AUD-027 · SOT-097 — قرارُ الخادم لكل مفتاحٍ نشط في سجلّ v24.9 (255) على حدة: enfHeld (طبقةُ الإنفاذ) بتوقّعاتٍ مكتوبةٍ من بيانات السجلّ
   نفسِها (النوع · المالك · asisMap) لا من الدالة المختبَرة — لكل مفتاح:
     · الذات (grant self): محمولٌ دائماً (نطاقُ Own في المحرّك)
     · مديرُ النظام وحده (role:super): لمدير النظام لا لمدير الإدارة ولا للموظف
     · الدورُ مديراً (role:mgr): لمدير الإدارة في إدارته وحدها
     · القابلُ للمنح: بالمنح الصريح (plus) يُحمل · بلا منحٍ ولا ورقة لا · منحٌ مع إسقاطٍ (minus) لا · في إدارةٍ أخرى لا · خارج سقف الإدارة (صفحةُ مالكه خارجه) لا ·
       مفاتيحُ «مدير الإدارة» (role:mgr + ورقة) لا تُحمل لموظفٍ غير مدير ولو مُنحت · وما لا ذرّةَ له (perm.assign) يحمله مديرُ الإدارة بالدور
     · العدسات: بوابةُ العدسة (سقفُ عدسات الإدارة ∧ عدساتُ الموظف) شرطٌ لكل مفتاح — enable محمولٌ متى كانت البوابةُ مفتوحة · ومضيفاها (الخطة · الجولات) خارج السقف ⇒ لا
     · المحجوزُ والمجهول: لا يُحمل لأحد (Default Deny) ولو لمدير النظام
   ومعه: لا مفتاحَ نشطاً خارج التصنيف (فالـ255 كلُّها مقرَّرةٌ هنا) — ويُكتب تقريرُ التغطية reports/key_coverage.json (القرار لكل مفتاح + أثرُه في حزم الاختبار). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SRC } from './harness.mjs';
import { internals } from './internals.mjs';

const W = await internals(['enfHeld', 'KIVO_REGISTRY', 'enfIx', 'PG_REG']);
const R = W.KIVO_REGISTRY, ACT = R.keys.map(k => R.byKey[k]).filter(e => e.status === 'active'), RES = R.keys.map(k => R.byKey[k]).filter(e => e.status !== 'active');
const PAGES = W.PG_REG.map(p => p.key), LENSES = (() => { const b = fs.readFileSync(path.join(SRC, 'manifests', '255-page-manifest.js'), 'utf8'); return JSON.parse(b.slice(b.lastIndexOf('})(') + 3, b.lastIndexOf(');'))).lenses.map(x => x.key); })();   /* V7 P4: a lens entry now carries arrays (hosts · indicators) — read the block as JSON, not by a flat-array pattern */
const ownersById = {}; (Array.isArray(R.owners) ? R.owners : Object.values(R.owners)).forEach(o => { ownersById[o.id] = o; });
const roleSuper = (e) => (e.asisMap || []).includes('role:super'), roleMgr = (e) => (e.asisMap || []).includes('role:mgr');
const leaves = (e) => (e.asisMap || []).filter(x => /^[A-Za-z]+(\/[A-Za-z]+)?:(view|add|edit|del|approve|export)$/.test(x));
const pageOf = (e) => { if (e.ownerKind === 'page') return e.owner.split('/')[0]; if (e.ownerKind === 'reference') { const m = (ownersById[e.owner] || {}).managedIn || ''; return m.split('/')[0] || null; } return null; };
const lensOf = (e) => e.ownerKind === 'lens' ? e.owner.slice(5) : null;
/* فاعلٌ بسجلّ صلاحياتٍ صريح (لا قيمَ ضمنية في الاختبار) */
function A({ role = 'staff', dept = 'd1', mgr = false, plus = [], minus = [], caps = null, lenses = null, empLens = null, sheet = {} } = {}) {
  const perms = { caps: caps ? { d1: caps } : {}, emps: { d1: { e1: sheet } }, subs: {}, tabs: {}, lenses: lenses ? { d1: lenses } : {}, empLens: empLens ? { d1: { e1: empLens } } : {} };
  return { u: { role, id: 'u1', ekey: 'e1', deptId: dept, mgr, un: 'x' }, perms, __grants: { d1: { v: 1, emp: plus.length || minus.length ? { e1: { plus, minus } } : {} }, d2: null }, depts: [{ id: 'd1' }, { id: 'd2' }] };
}
const held = (a, k, d = 'd1') => W.enfHeld(a, d, k);
const COV = {};
const mark = (k, why) => { (COV[k] = COV[k] || []).push(why); };

test('Default Deny: المحجوزُ (' + RES.length + ') والمجهولُ لا يُحملان لأحد — ولو لمدير النظام', () => {
  for (const e of RES) { assert.equal(held(A({ role: 'super', plus: [e.key] }), e.key), false, e.key); assert.equal(held(A({ plus: [e.key] }), e.key), false, e.key); }
  assert.equal(held(A({ role: 'super' }), 'no.such.key'), false);
});

test('★ قرارُ الخادم لكل مفتاحٍ نشط (' + ACT.length + ') بتوقّعاتٍ من بيانات السجلّ', () => {
  let n = 0;
  for (const e of ACT) {
    const k = e.key, L = lensOf(e), pg = pageOf(e), ok = (got, want, why) => { assert.equal(got, want, k + ' — ' + why); n++; };
    if (e.grant === 'self') { ok(held(A(), k), true, 'الذات: محمولٌ للموظف'); ok(held(A({ dept: 'd2' }), k), true, 'والذات في أيّ إدارة'); mark(k, 'self'); continue; }
    if (roleSuper(e)) { ok(held(A({ role: 'super' }), k), true, 'مديرُ النظام'); ok(held(A({ role: 'dept' }), k), false, 'لا لمدير الإدارة'); ok(held(A({ plus: [k] }), k), false, 'لا لموظفٍ ولو مُنح'); mark(k, 'superOnly'); continue; }
    if (e.grant === 'role') {
      if (roleMgr(e)) { ok(held(A({ role: 'dept' }), k), true, 'مديرُ الإدارة في إدارته'); ok(held(A({ role: 'dept', dept: 'd2' }), k), false, 'لا في إدارةٍ أخرى'); ok(held(A(), k), false, 'لا للموظف'); mark(k, 'roleMgr'); }
      else { ok(held(A({ role: 'super' }), k), true, 'دورٌ لمدير النظام'); ok(held(A({ role: 'dept' }), k), false, 'لا لمدير الإدارة'); mark(k, 'role'); }
      continue;
    }
    assert.equal(e.grant, 'assignable', k + ': تصنيفٌ معروف');
    if (L) {
      const isEnable = k === 'lens.' + L + '.enable';
      ok(held(A({ plus: [k] }), k), true, 'عدسة: بالمنح والبوابةُ مفتوحة');
      ok(held(A(), k), isEnable, isEnable ? 'enable = البوابةُ نفسُها (مفتوحةٌ افتراضاً)' : 'عدسة: بلا منحٍ ولا ورقة لا');
      /* بوابةُ العدسة لمفاتيح lens.<L>.* (KIVO_BUILD.lensOf — المرجع) · ومراجعُ تديرها العدسةُ (ref.zone.type.* …) تتبع مضيفيها وحدهم كما في الواجهة (p24LensOf) */
      const gated = k.startsWith('lens.' + L + '.');
      ok(held(A({ plus: [k], lenses: LENSES.filter(x => x !== L) }), k), !gated, gated ? 'عدسةُ الإدارة مطفأةٌ في سقفها' : 'مرجعٌ تديره العدسة: لا تحجبه بوابتُها (يتبع مضيفيها)');
      ok(held(A({ plus: [k], empLens: LENSES.filter(x => x !== L) }), k), !gated, gated ? 'عدسةُ الموظف غيرُ مسنَدةٍ إليه' : 'مرجعٌ تديره العدسة: لا تحجبه عدساتُ الموظف');
      const hostPages = [...new Set(leaves(e).map(x => x.split(':')[0].split('/')[0]))];
      if (hostPages.length) ok(held(A({ plus: [k], caps: PAGES.filter(p => !hostPages.includes(p)) }), k), false, 'مضيفاها خارج سقف الإدارة');
      ok(held(A({ plus: [k], minus: [k] }), k), isEnable, isEnable ? 'enable لا يُسقطه minus (البوابة)' : 'المنحُ مع الإسقاط لا');
      ok(held(A({ plus: [k], dept: 'd2' }), k), false, 'في إدارةٍ أخرى لا');
      mark(k, 'lens:' + L); continue;
    }
    if (roleMgr(e)) {
      ok(held(A({ plus: [k] }), k), false, 'مفتاحُ مدير الإدارة: لا لموظفٍ غير مدير ولو مُنح');
      const atomless = !W.enfIx().atomless[k] ? false : true;
      ok(held(A({ role: 'dept', plus: atomless ? [] : [k] }), k), true, atomless ? 'ما لا ذرّةَ له: لمدير الإدارة بالدور' : 'لمدير الإدارة بالمنح');
      ok(held(A({ role: 'dept', dept: 'd2', plus: [k] }), k), false, 'لا في إدارةٍ أخرى');
      mark(k, 'mgrAssignable'); continue;
    }
    ok(held(A({ plus: [k] }), k), true, 'بالمنح الصريح');
    ok(held(A(), k), false, 'بلا منحٍ ولا ورقة');
    ok(held(A({ plus: [k], minus: [k] }), k), false, 'المنحُ مع الإسقاط');
    ok(held(A({ plus: [k], dept: 'd2' }), k), false, 'في إدارةٍ أخرى');
    ok(held(A({ role: 'super' }), k), true, 'مديرُ النظام داخل السقف');
    if (pg && PAGES.includes(pg)) ok(held(A({ plus: [k], caps: PAGES.filter(p => p !== pg) }), k), false, 'صفحةُ مالكه «' + pg + '» خارج سقف الإدارة');
    mark(k, 'assignable' + (pg ? ':' + pg : ':platform'));
  }
  assert.equal(Object.keys(COV).length, ACT.length, 'كلُّ مفتاحٍ نشط مقرَّر');
  assert.ok(n >= 1200, 'تأكيدات ' + n);
});

test('تقريرُ التغطية: لكل مفتاحٍ نشط قرارٌ مختبَر هنا + أثرُه في حزم الاختبار (reports/key_coverage.json)', () => {
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, f.name); if (f.isDirectory()) { if (!['node_modules', 'fixtures'].includes(f.name)) walk(q); } else if (/\.(mjs|py)$/.test(f.name)) files.push(q); } };
  walk(path.join(ROOT, 'tests')); for (const f of (fs.existsSync(path.join(ROOT, 'cfbench')) ? fs.readdirSync(path.join(ROOT, 'cfbench')) : []))   // AUD-029: حزمُ المختبر إن وُجدت (المستودعُ الرسمي وحده بلا cfbench)
    if (/^(k25\d|k26\d|p\d|r1\d\d)[a-z0-9]*\.mjs$/.test(f)) files.push(path.join(ROOT, 'cfbench', f));
  const texts = files.filter(f => !f.endsWith('key_decisions.test.mjs')).map(f => [path.relative(ROOT, f), fs.readFileSync(f, 'utf8')]);
  const rows = ACT.map(e => { const by = texts.filter(([, t]) => t.includes("'" + e.key + "'") || t.includes('"' + e.key + '"')).map(([f]) => f); return { key: e.key, owner: e.owner, decision: COV[e.key] || [], suites: by.slice(0, 8), suitesN: by.length }; });
  const noDecision = rows.filter(r => !r.decision.length).map(r => r.key), noSuite = rows.filter(r => !r.suitesN).map(r => r.key);
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'key_coverage.json'), JSON.stringify({ note: 'KIVO_259 · AUD-027 — لكل مفتاحٍ نشط: قرارُ الخادم مختبَرٌ في tests/unit/key_decisions.test.mjs (decision) · وذكرُه الحرفي في حزم الاختبار الأخرى (suites) للعلم', counts: { active: ACT.length, reserved: RES.length, uncov: noDecision.length, withSuiteMention: rows.length - noSuite.length, decisionOnly: noSuite.length }, decisionOnly: noSuite, rows }, null, 1) + '\n');
  assert.equal(noDecision.length, 0, 'uncov = 0');
});
