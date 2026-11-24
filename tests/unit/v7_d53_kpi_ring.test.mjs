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
test('③ الأرقام من مجاميع الشهر (الخادم) — وأصفارٌ في الشهر الفارغ', () => {
  const P = kit(), sz = Object.assign(Object.create(P), { loadActs: () => [{ k: 'sec', name: 'TEST_ONLY تحريز', color: '#a00' }, { k: 'des', name: 'TEST_ONLY إتلاف', color: '#0a0' }, { k: 'sto', name: 'TEST_ONLY حفظ', color: '#00a' }] });
  const S = method('src/systems/seized/client/logic.js', '_szKpiCards', sz);
  const [c] = S({ reports: 4, qty: 10, sar: 1500, actions: { sec: 3, des: 2, sto: 5 } }, 4);
  assert.equal(c.val, '10'); assert.equal(c.chip, '50٪', 'ما تُصُرِّف فيه'); same(c.rows.map((r) => [r.label, r.n, r.pct]), [['TEST_ONLY تحريز', '3', '30٪'], ['TEST_ONLY إتلاف', '2', '20٪'], ['TEST_ONLY حفظ', '5', '50٪']]);
  assert.match(c.sub, /4 محضر · 1,500 ريال/); assert.equal(c.ring.length, 3);
  const [z] = S({ reports: 0, qty: 0, sar: 0, actions: {} }, 0);
  assert.equal(z.val, '0'); assert.equal(z.chip, '—'); assert.equal(z.ring.length, 0); assert.equal(z.rows.length, 3, 'الشرائحُ ظاهرةٌ بأصفار');
  const ir = Object.create(P), I = method('src/systems/irshad/client/logic.js', '_irKpiCards', ir);
  const [b, r] = I({ reports: 3, ben: 20, trans: 10, bro: 5, pros: 3, pol: 2 }, 3);
  assert.equal(b.val, '20'); assert.equal(b.chip, '50٪'); same(b.rows.map((x) => x.n), ['10', '5', '3', '2']); assert.match(b.sub, /3 تقرير/);
  assert.equal(r.val, '5'); assert.equal(r.chip, '25٪'); same(r.rows.map((x) => [x.n, x.pct]), [['3', '60٪'], ['2', '40٪']]);
  const [b0] = I({ reports: 0 }, 0); assert.equal(b0.val, '0'); assert.equal(b0.ring.length, 0);
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
