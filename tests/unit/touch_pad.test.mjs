/* KIVO_259 — الحاشيةُ اللمسية (src/components/660-a11y-enhancer.js · padOf): اختبارُ انحدارٍ لخللٍ كشفه k258layout على اللوحي —
   كانت الحاشيةُ متناظرةً (نصفُ النقص في كل جهة) فتتراكب حاشيتا هدفين متجاورين ويسرق اللاحقُ في الوثيقة نقراتِ سابقه:
   زرّا الزيادة/الإنقاص (26×14.5 متلاصقان) في الإرشاد والمضبوطات — حاشيةُ «إنقاص» تغطي «زيادة» كلَّه فنقرُ «+» يُنقص.
   الدالةُ محضة (مستطيلٌ + مستطيلاتُ الجيران ⇒ حاشيةُ كلِّ جهة) فتُستخرج من المصدر وتُختبر هنا بلا متصفح:
     ① الحالتان الحقيقيتان (الزرّان المتلاصقان · زرّان أفقيّان بفجوة 4) · ② خاصيّةٌ على 3,000 تخطيطٍ عشوائي: الحاشيةُ لا تمسّ مستطيلَ جارٍ أبداً
     (فمركزُ كلِّ هدفٍ ومستطيلُه له) · ③ ويبلغ الهدفُ 44 في كل محورٍ متى اتّسع المحورُ له */
/* SOT-054 · SOT-154: جزء محلي من أهداف اللمس: حاشية 44px بلا سرقة هدف جار، لا اعتماد جهاز أو شاشة فعلية. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC } from './harness.mjs';

const src = fs.readFileSync(path.join(SRC, 'components', '660-a11y-enhancer.js'), 'utf8');
const m = src.match(/function padOf\(r,nb\)\{[\s\S]*?\n {2}\}/);
const padOf = m ? new Function(m[0] + '; return padOf;')() : null;
const R = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h });
const grow = (r, p) => ({ left: r.left - p[2], top: r.top - p[0], right: r.right + p[3], bottom: r.bottom + p[1] });
const hits = (a, b) => a.left < b.right - 1e-9 && b.left < a.right - 1e-9 && a.top < b.bottom - 1e-9 && b.top < a.bottom - 1e-9;

test('padOf موجودةٌ في المصدر ودالةٌ محضة', () => { assert.ok(padOf, 'لم تُستخرج padOf من 660-a11y-enhancer.js'); });

test('① زرّا الزيادة/الإنقاص المتلاصقان: لا تغطي حاشيةُ أحدهما الآخر · وكلٌّ يبلغ 44 ارتفاعاً من جهته الحرّة', () => {
  const up = R(100, 100, 26, 14.5), dn = R(100, 114.5, 26, 14.5);
  const pu = padOf(up, [{ r: dn }]), pd = padOf(dn, [{ r: up }]);
  assert.equal(pu[1], 0, 'حاشيةُ «زيادة» السفلى (نحو «إنقاص») صفر');
  assert.equal(pd[0], 0, 'حاشيةُ «إنقاص» العليا (نحو «زيادة») صفر — كانت 14.75 فتغطي «زيادة» كلَّه');
  assert.ok(!hits(grow(dn, pd), up) && !hits(grow(up, pu), dn), 'لا تراكبَ مع مستطيل الجار');
  assert.ok(Math.abs(up.height + pu[0] + pu[1] - 44) < 1e-9 && Math.abs(dn.height + pd[0] + pd[1] - 44) < 1e-9, 'كلٌّ 44 ارتفاعاً');
});

test('① زرّان أفقيّان (28×28 بفجوة 4): لا تبلغ حاشيةُ أحدهما مستطيلَ الآخر · والنقصُ يُعوَّض من الجهة الحرّة', () => {
  const a = R(0, 0, 28, 28), b = R(32, 0, 28, 28);
  const pa = padOf(a, [{ r: b }]), pb = padOf(b, [{ r: a }]);
  assert.ok(pa[3] <= 4 && pb[2] <= 4, 'داخلَ الفجوة وحدها: ' + JSON.stringify([pa, pb]));
  assert.ok(!hits(grow(a, pa), b) && !hits(grow(b, pb), a), 'لا تمسّ مستطيلَ الجار');
  assert.ok(Math.abs(a.width + pa[2] + pa[3] - 44) < 1e-9 && Math.abs(b.width + pb[2] + pb[3] - 44) < 1e-9, 'كلٌّ 44 عرضاً');
});

test('① هدفٌ منفرد: حاشيةٌ متناظرة كما كانت · وهدفٌ ≥ 44 بلا حاشية', () => {
  assert.deepEqual(padOf(R(0, 0, 20, 20), []), [12, 12, 12, 12]);
  assert.deepEqual(padOf(R(0, 0, 50, 48), []).map(x => Math.max(0, x)), [0, 0, 0, 0]);
});

test('② خاصيّة (3,000 تخطيط عشوائي): حاشيةُ كلِّ هدفٍ لا تمسّ مستطيلَ أيِّ جار — فمركزُ كلِّ هدفٍ لا يقع في حاشية غيره', () => {
  let seed = 259; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let n = 0;
  for (let t = 0; t < 3000; t++) {
    const rs = [];
    for (let k = 0; k < 2 + Math.floor(rnd() * 6); k++) {
      for (let tries = 0; tries < 20; tries++) {
        const c = R(Math.floor(rnd() * 160), Math.floor(rnd() * 160), 8 + Math.floor(rnd() * 40), 8 + Math.floor(rnd() * 40));
        if (!rs.some(x => hits(x, c))) { rs.push(c); break; }
      }
    }
    for (const r of rs) {
      const nb = rs.filter(x => x !== r).map(x => ({ r: x })); const p = padOf(r, nb); const g = grow(r, p);
      for (const x of nb) { n++; assert.ok(!hits(g, x.r), 'حاشيةٌ تمسّ جاراً: ' + JSON.stringify({ r, p, nb: x.r })); }
      assert.ok(p.every(v => v >= 0), 'لا حاشيةَ سالبة');
    }
  }
  assert.ok(n > 10000, 'عددُ الأزواج المفحوصة ' + n);
});

test('③ يبلغ الهدفُ 44 في كل محورٍ متى اتّسع له (جارٌ واحد في جهة)', () => {
  for (const gap of [0, 3, 10, 40]) {
    const a = R(0, 0, 20, 20), b = R(20 + gap, 0, 20, 20); const pa = padOf(a, [{ r: b }]);
    assert.ok(Math.abs(a.width + pa[2] + pa[3] - 44) < 1e-9, 'عرضُ a = 44 بفجوة ' + gap + ': ' + JSON.stringify(pa));
    assert.ok(pa[3] <= gap, 'لا يتجاوز الفجوةَ إلى الجار: ' + pa[3] + ' ≤ ' + gap);
  }
});
