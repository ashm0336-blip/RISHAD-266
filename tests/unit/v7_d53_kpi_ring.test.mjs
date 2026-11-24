/* V7 · 53 (port-sync · بند 8 · 0013) — كروتُ المؤشرات الحلقية في سجلات المضبوطات والاسترشاد بكرت «رصد الحالات» نفسِه (بطاقة المؤشرات الموحّدة — لا يُبنى مرتين)،
   والسجلُّ الموحَّد: التاريخ رقميٌّ هجريٌّ وميلادي · الوقت بأربعٍ وعشرين · عمودُ «المسجِّل» منفصل. بيانات TEST_ONLY.
   ① البانِي واحد: القطعةُ المشتركة src/systems/_shared/kpiring تُخرج ما كان يُخرجه بانِي «رصد الحالات» حرفاً، والصفحاتُ الثلاث تضمّها ولا تبني غيرها
   ② القالبُ واحد: كرتُ المضبوطات والاسترشاد هو كرتُ «رصد الحالات» نفسُه (القائمةُ وحدها تختلف)، مكانَ المؤشرات السريعة
   ③ الأرقام: من مجاميع الشهر التي يحسبها الخادم — وأصفارٌ في الشهر الفارغ
   ④ السجلّ: سنة/شهر/يوم هـ · ميلاديٌّ رقمي · ساعةٌ بأربعٍ وعشرين · «المسجِّل» عمودٌ مستقلّ في الصفحتين */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';

const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const KIVO = { BassamCount: (n, w) => n + ' ' + w };
function kit() {
  const ctx = vm.createContext({ KIVO, Math, String, Object, Array, JSON });
  vm.runInContext('class Component {}\n' + rd('src/systems/_shared/kpiring/kpi-ring.js') + '\nthis.C = Component;', ctx);
  return ctx.C.prototype;
}
/* بانِي «رصد الحالات» قبل النقل (src/systems/rasd/client/logic.js _rzKpiCards — ring/card) نسخةٌ مرجعية حرفية */
function oldRasdCard(o, T) {
  const C = 2 * Math.PI * 41, pct = (k) => (T ? Math.round((100 * k) / T) + '٪' : '—'),
    ring = (parts) => { const live = parts.filter((p) => p.n > 0), gap = live.length > 1; let off = 0;
      return live.map((p) => { const len = (C * p.n) / (T || 1), g = gap ? Math.min(3, 0.12 * len) : 0,
        r = { color: p.color, dash: Math.round(10 * Math.max(0.5, len - g)) / 10 + ' ' + Math.round(10 * C) / 10, off: String(-Math.round(10 * off) / 10), tip: p.label + ': ' + p.n + ' (' + pct(p.n) + ')' }; off += len; return r; }); };
  return { ...o, ring: ring(o.parts), rows: o.parts.map((p) => ({ label: p.label, color: 'width:8px;height:8px;border-radius:3px;flex-shrink:0;background:' + p.color, n: String(p.n), pct: pct(p.n), tip: p.label + ' — ' + KIVO.BassamCount(p.n, 'حالة') + ' (' + pct(p.n) + ')' })),
    lineStyle: 'display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,transparent,' + o.accent + ',transparent);opacity:.5' };
}

test('① البانِي واحد: ما يُخرجه _kpiRing = بانِي «رصد الحالات» حرفاً · والصفحاتُ الثلاث تضمّ القطعة ولا تبني غيرها', () => {
  const P = kit();
  const o = { title: 'TEST_ONLY', tip: 't', val: '9', chip: '33٪', sub: 's', accent: 'var(--danger)', parts: [{ label: 'أ', color: '#111', n: 3 }, { label: 'ب', color: '#222', n: 0 }, { label: 'ج', color: '#333', n: 6 }] };
  const { T: _t, ...got } = P._kpiRing.call(P, { ...o, T: 9 });
  same(got, oldRasdCard(o, 9));
  same(P._kpiRing.call(P, { ...o, parts: [], T: 0 }).ring, []);
  for (const s of ['rasd', 'seized', 'irshad']) {
    const meta = JSON.parse(rd('src/systems/' + s + '/client/meta.json')), sys = JSON.parse(rd('src/systems/' + s + '/system.json'));
    assert.ok(meta.logicParts.includes('../../_shared/kpiring/kpi-ring.js') && sys.shared.includes('kpiring'), s + ': يضمّ القطعة');
    const L = rd('src/systems/' + s + '/client/logic.js');
    assert.doesNotMatch(L, /2 \* Math\.PI \* 41/, s + ': لا بانِيَ حلقةٍ ثانٍ في الصفحة');
  }
  assert.match(rd('src/systems/rasd/client/logic.js'), /card = \(o\) => this\._kpiRing\(\{ \.\.\.o, T \}\)/);
});

test('② القالبُ واحد: كرتُ المضبوطات والاسترشاد = كرتُ «رصد الحالات» مكانَ المؤشرات السريعة', () => {
  const block = (s, list) => { const a = s.indexOf('<div class="bs-hscroll"', s.indexOf('{{' + list + '}}') - 400); return s.slice(a, s.indexOf('</sc-for>', a)); };
  const rz = block(rd('src/systems/rasd/client/view.html'), 'rzKpiCards');
  for (const [f, list] of [['seized', 'szKpiCards'], ['irshad', 'irKpiCards']]) {
    const v = rd('src/systems/' + f + '/client/view.html');
    assert.ok(v.includes('{{' + list + '}}'), f);
    assert.equal(block(v, list).replace(list, 'rzKpiCards'), rz, f + ': الكرتُ نفسُه حرفاً');
    assert.doesNotMatch(v, /مؤشرات سريعة للشهر المحدد/, f + ': مكانَ المؤشرات السريعة');
  }
});

/* منهجُ الصفحة من ملفّها (نصّ المنهج كما هو) على كائنٍ يحمل القطعةَ المشتركة */
function method(file, name, self) {
  const s = rd(file), a = s.indexOf('  ' + name + '('), b = s.indexOf('\n  }\n', a), head = s.slice(a, s.indexOf('{', a));
  const args = head.slice(head.indexOf('(') + 1, head.lastIndexOf(')'));
  const ctx = vm.createContext({ KIVO, Math, String, Object, Array, JSON, self });
  return (...x) => vm.runInContext('(function (' + args + ') {' + s.slice(s.indexOf('{', a) + 1, b) + '\n})', ctx).apply(self, x);
}
test('③ الكروتُ كلُّها كما في Production (0013) — أرقامُها من مجاميع الشهر في الخادم، وأصفارٌ في الشهر الفارغ', () => {
  const P = kit(), rows = (c) => c.rows.map((r) => [r.label, r.n]);
  const sz = Object.assign(Object.create(P), { loadActs: () => [{ k: 'sec', name: 'TEST_ONLY تحريز', color: '#a00' }, { k: 'des', name: 'TEST_ONLY إتلاف', color: '#0a0' }, { k: 'sto', name: 'TEST_ONLY حفظ', color: '#00a' }],
    loadCat: () => ({ cats: [{ name: 'TEST_ONLY نقد', color: '#123456' }, { name: 'TEST_ONLY ذهب', color: '#654321' }] }), loadIrshadLocs: () => ['TEST_ONLY بوابة'] });
  const S = method('src/systems/seized/client/logic.js', '_szKpiCards', sz);
  const M = { reports: 4, qty: 10, sar: 1500, actions: { sec: 3, des: 2, sto: 5 },
    by: [['c', 'TEST_ONLY نقد', 7], ['c', 'TEST_ONLY ذهب', 3], ['i', 'TEST_ONLY ريال', 7], ['i', 'TEST_ONLY خاتم', 3], ['l', 'TEST_ONLY بوابة', 3], ['l', '', 1], ['b', 'TEST_ONLY سالم', 3], ['b', 'TEST_ONLY فهد', 1]] };
  const C = S(M, 4);
  same(C.map((c) => c.title), ['الإجراء على القطع', 'التصنيف', 'البنود', 'مواقع الضبط', 'المسجّلون']);
  assert.equal(C[0].val, '10'); assert.equal(C[0].chip, '50٪'); same(rows(C[0]), [['TEST_ONLY تحريز', '3'], ['TEST_ONLY إتلاف', '2'], ['TEST_ONLY حفظ', '5']]); assert.match(C[0].sub, /4 محضر · 1,500 ريال/);
  assert.equal(C[1].val, '7'); assert.equal(C[1].chip, '70٪'); assert.equal(C[1].sub, 'الأكثر: TEST_ONLY نقد'); same(rows(C[1]), [['TEST_ONLY نقد', '7'], ['TEST_ONLY ذهب', '3']]);
  assert.match(C[1].rows[0].color, /#123456$/, 'لونُ التصنيف من الكتالوج');
  assert.equal(C[2].val, '7'); same(rows(C[2]), [['TEST_ONLY ريال', '7'], ['TEST_ONLY خاتم', '3']]);
  assert.equal(C[3].val, '4'); assert.equal(C[3].chip, '75٪'); same(rows(C[3]), [['TEST_ONLY بوابة', '3'], ['—', '1']]);
  assert.equal(C[4].val, '2'); assert.equal(C[4].chip, '75٪'); assert.equal(C[4].sub, 'الأكثر: TEST_ONLY سالم');
  const Z = S({ reports: 0, qty: 0, sar: 0, actions: {}, by: [] }, 0);
  assert.equal(Z.length, 5); same(Z.map((c) => c.val), ['0', '0', '0', '0', '0']); assert.ok(Z.every((c) => c.ring.length === 0));
  same(rows(Z[1]), [['TEST_ONLY نقد', '0'], ['TEST_ONLY ذهب', '0']], 'الشهرُ الفارغ: التصنيفاتُ المعتمدة بصفر'); same(rows(Z[3]), [['TEST_ONLY بوابة', '0']]);
  const ir = Object.assign(Object.create(P), { loadIrshadLangs: () => ['TEST_ONLY عربية'], loadShiftOptsIr: () => [{ name: 'TEST_ONLY أ' }], loadIrshadLocs: () => ['TEST_ONLY موقع'] }),
    I = method('src/systems/irshad/client/logic.js', '_irKpiCards', ir);
  const R = I({ reports: 3, ben: 20, trans: 10, bro: 5, pros: 3, pol: 2,
    by: [['g', 'TEST_ONLY عربية', 6], ['g', 'TEST_ONLY أردية', 4], ['s', 'TEST_ONLY أ', 2], ['s', 'TEST_ONLY ب', 1], ['l', 'TEST_ONLY موقع', 15], ['l', 'TEST_ONLY آخر', 5]] }, 3);
  same(R.map((c) => c.title), ['المستفيدون', 'اللغات', 'الإحالات', 'الورديات', 'مواقع الإرشاد']);
  assert.equal(R[0].val, '20'); assert.equal(R[0].chip, '50٪'); same(R[0].rows.map((x) => x.n), ['10', '5', '3', '2']); assert.match(R[0].sub, /3 تقرير/);
  assert.equal(R[1].val, '10'); assert.equal(R[1].chip, '60٪'); same(rows(R[1]), [['TEST_ONLY عربية', '6'], ['TEST_ONLY أردية', '4']]); assert.equal(R[1].sub, 'الأكثر: TEST_ONLY عربية');
  assert.equal(R[2].val, '5'); assert.equal(R[2].chip, '25٪');
  assert.equal(R[3].val, '3'); assert.equal(R[3].chip, '67٪'); same(rows(R[3]), [['TEST_ONLY أ', '2'], ['TEST_ONLY ب', '1']]);
  assert.equal(R[4].val, '2'); assert.equal(R[4].chip, '75٪'); same(rows(R[4]), [['TEST_ONLY موقع', '15'], ['TEST_ONLY آخر', '5']]);
  const R0 = I({ reports: 0, by: [] }, 0);
  assert.equal(R0.length, 5); assert.ok(R0.every((c) => c.ring.length === 0)); same(rows(R0[1]), [['TEST_ONLY عربية', '0']]); same(rows(R0[3]), [['TEST_ONLY أ', '0']]);
  /* الأعلى أربعٌ — أو ثلاثٌ ثم «غيرها» */
  const many = S({ reports: 5, qty: 5, actions: {}, by: [1, 2, 3, 4, 5].map((n) => ['i', 'TEST_ONLY ' + n, n]) }, 5)[2];
  same(rows(many), [['TEST_ONLY 5', '5'], ['TEST_ONLY 4', '4'], ['TEST_ONLY 3', '3'], ['غيرها', '3']]);
});

test('④ السجلّ الموحَّد: سنة/شهر/يوم هـ · ميلاديٌّ رقمي · ساعةٌ بأربعٍ وعشرين · «المسجِّل» عمودٌ مستقل', () => {
  for (const f of ['seized', 'irshad']) {
    const L = rd('src/systems/' + f + '/client/logic.js'), V = rd('src/systems/' + f + '/client/view.html');
    assert.match(L, /dayLabel: t\.y \+ "\/" \+ String\(t\.m\)\.padStart\(2, "0"\) \+ "\/" \+ String\(t\.d\)\.padStart\(2, "0"\)/, f + ': هجريٌّ رقمي');
    assert.match(L, /\.getFullYear\(\) \+ "\/" \+ String\([a-z]\.getMonth\(\) \+ 1\)\.padStart\(2, "0"\) \+ "\/" \+ String\([a-z]\.getDate\(\)\)\.padStart\(2, "0"\)/, f + ': ميلاديٌّ رقمي');
    assert.match(L, /String\(e\.getHours\(\)\)\.padStart\(2, "0"\) \+ ":" \+ String\(e\.getMinutes\(\)\)\.padStart\(2, "0"\);/, f + ': ٢٤ ساعة');
    assert.doesNotMatch(L, /\? "م" : "ص"/, f + ': لا ص/م في السجل');
    assert.match(V, /\{\{v\.dayLabel\}\} هـ<\/span>/); assert.doesNotMatch(V, /\{\{v\.gregLabel\}\} · \{\{v\.timeLabel\}\}/);
    assert.match(V, />المسجِّل<\/span><\/div><\/th>/, f + ': رأسُ العمود');
    const row = V.slice(V.indexOf('<sc-for list="{{irLedgerRows}}"')), dateCell = row.slice(0, row.indexOf('</td>'));
    assert.doesNotMatch(dateCell, /\{\{v\.actor\}\}/, f + ': المسجِّلُ خارج خلية التاريخ');
    assert.match(row, /<td[^>]*><span[^>]*>\{\{v\.actor\}\}<\/span><\/td>/, f + ': في عموده');
  }
});
