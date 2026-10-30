/* R3-REC · سجلُّ الإيماءة في طبقة الإدخال (src/components/560-canvas-input.js: note · back) — ما كتبه الإصبعُ الأوّل يعود وحدَه
   ولو زحزح كاتبٌ آخر (تحديثٌ حيّ · صورةُ الموقع) عناصرَ المصفوفة بين كتابتين للإيماءة: أدرج · حذف · عكس الترتيب · نسخ العناصر · كتب حقلاً.
   كان عنصرُ المصفوفة يُعرف بفهرسه: صار للعنصر الواحد سجلّان بفهرسين فيعود إلى موضعٍ وسيط (أو يُكتب على عنصرٍ آخر).
   الدالتان من المصدر نفسِه (ما بين plain و wrote) داخل node:vm، وفحصٌ عشوائيٌّ حتميّ (بذرةٌ ثابتة) مقابل حقيقةٍ على مستوى الحقل:
     ما كتبته الإيماءةُ آخراً يعود إلى ما قبل آخر سلسلةٍ متّصلة من كتاباتها فيه (كتابةُ غيرها بينها تصير نقطةَ العودة) · وما كتبه غيرُها آخراً يبقى ·
     العضويةُ والترتيبُ كما هما الآن · وما لم تكتبه الإيماءةُ يُعاد بمرجعه نفسِه.
   العنصرُ ذو الهوية (uid · eid · id · sid) يعود بالضبط؛ وبلا هويةٍ يُتبَع بمرجع ما كتبته الإيماءة (ثمّ بفهرسه إن كان ما فيه نسخةً منه):
   يعود بالضبط أو يبقى كما هو الآن — لا موضعَ وسيطاً ولا عنصرَ غيرَه.
   CANVAS_SRC=<مسار> يبدّل ملفَّ الطبقة (لإثبات الإخفاق على السابق). بياناتٌ اصطناعية. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { CANVAS } from './canvas_world.mjs';

const SRC = fs.readFileSync(CANVAS, 'utf8'), A = SRC.indexOf('  function plain('), B = SRC.indexOf('  function wrote(');
function recorder() {
  assert.ok(A > 0 && B > A, 'دوالُّ السجلّ في موضعها من الطبقة (plain … wrote)');
  return vm.runInNewContext(SRC.slice(A, B) + '\n;({ note: note, back: back });');
}
/* mulberry32 — دورةٌ كاملة لا تتكرّر خلال الفحص */
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FIELDS = ['a', 'b', 'pts'];

/* إيماءةٌ عشوائية: الإيماءةُ تكتب حقلاً أو حقلين من هدفٍ أو هدفين (كتابةً غير متحوّلة كالصفحة) · وبين كتاباتها كاتبٌ آخر:
   حقلٌ في أيّ عنصر · نسخُ العناصر كلِّها (كالصورة) · إدراجٌ · حذفٌ (الهدفُ أيضاً) · عكسُ الترتيب · وختمُ eid في موضعه (كما يختم الحفظ) */
function fuzz(R, seed, runs, kinds) {
  const rnd = rng(seed), pick = (a) => a[Math.floor(rnd() * a.length)];
  let val = 0, tag = 0, fails = 0, first = '';
  const nv = (f) => (f === 'pts' ? { v: ++val } : ++val);
  const mk = () => { const z = { _t: ++tag, a: nv('a'), b: nv('b'), pts: nv('pts') }, k = pick(kinds);
    if (k === 'uid') z.uid = 'u' + tag; else if (k === 'eid') z.eid = 'e' + tag; else if (k === 'id') z.id = 'i' + tag; return z; };
  const cp = (z, o) => Object.assign({}, z, o || {});
  for (let run = 0; run < runs; run++) {
    let zones = []; for (let i = 0, n = 1 + Math.floor(rnd() * 5); i < n; i++) zones.push(mk());
    const targets = new Set([pick(zones)._t]); if (rnd() < 0.3) targets.add(pick(zones)._t);
    const T = {}, wroteT = new Set(), log = []; let N = null;
    for (let s = 0, steps = 1 + Math.floor(rnd() * 8); s < steps; s++) {
      const r = rnd();
      if (r < 0.45) {
        const before = zones; zones = zones.slice(); let any = false;
        for (const t of targets) {
          const i = zones.findIndex((z) => z._t === t); if (i < 0) continue;
          const z = zones[i], fs2 = FIELDS.filter(() => rnd() < 0.6), o = {}; if (!fs2.length) fs2.push('pts');
          for (const f of fs2) { const q = T[t + '|' + f]; if (!q || !q.last) T[t + '|' + f] = { o: z[f], last: true }; o[f] = nv(f); }
          zones[i] = cp(z, o); wroteT.add(t); any = true;
        }
        if (!any) { zones = before; continue; }
        N = R.note(N, before, zones, 2); log.push('g');
      } else if (r < 0.58) {
        if (!zones.length) continue; const i = Math.floor(rnd() * zones.length), f = pick(FIELDS), z = zones[i];
        zones = zones.slice(); zones[i] = cp(z, { [f]: nv(f) }); if (T[z._t + '|' + f]) T[z._t + '|' + f].last = false; log.push('f');
      } else if (r < 0.68) { zones = zones.map((z) => cp(z)); log.push('spread');
      } else if (r < 0.76) { zones = zones.slice(); zones.splice(Math.floor(rnd() * (zones.length + 1)), 0, mk()); log.push('ins');
      } else if (r < 0.84) { if (!zones.length) continue; const u = pick(zones)._t; zones = zones.filter((z) => z._t !== u); log.push('del');
      } else if (r < 0.92) { zones = zones.slice().reverse(); log.push('rev');
      } else { const c = zones.filter((z) => z.uid == null && z.eid == null && z.id == null); if (!c.length) continue; const z = pick(c); z.eid = 'st' + z._t; log.push('stamp'); }
    }
    if (!N) continue;
    const out = R.back(N, zones), errs = [];
    if (out.length !== zones.length || out.some((z, i) => z._t !== zones[i]._t)) errs.push('membership/order');
    else zones.forEach((z, i) => {
      const oz = out[i];
      if (!wroteT.has(z._t)) { if (oz !== z) errs.push(z._t + ' untouched but replaced'); return; }
      const truth = {}; for (const f of FIELDS) { const q = T[z._t + '|' + f]; truth[f] = q && q.last ? q.o : z[f]; }
      const isTruth = FIELDS.every((f) => oz[f] === truth[f]), isCur = FIELDS.every((f) => oz[f] === z[f]);
      const identified = z.uid != null || z.id != null || (z.eid != null && !String(z.eid).startsWith('st'));
      if (identified ? !isTruth : !(isTruth || isCur)) errs.push(z._t + (identified ? ' (identified)' : ' (id-less)') + ' got ' + JSON.stringify(FIELDS.map((f) => oz[f])) + ' truth ' + JSON.stringify(FIELDS.map((f) => truth[f])));
    });
    if (errs.length && !fails++) first = 'run ' + run + ' [' + log.join(' ') + '] ' + errs.join('; ');
  }
  return { fails, first };
}

test('R3-REC: عشرون ألف إيماءةٍ عشوائية بعناصرَ ذات هوية (uid · eid · id) يزحزحها كاتبٌ آخر بين كتاباتها ⇒ يعود ما كتبته وحدَه حقلاً بحقل', () => {
  const r = fuzz(recorder(), 20261021, 20000, ['uid', 'eid', 'id']);
  assert.equal(r.fails, 0, 'إخفاقات: ' + r.fails + ' — أوّلها ' + r.first);
});

test('R3-REC: عناصرُ بلا هوية بينها (وختمُ eid في موضعه أثناء الإيماءة) ⇒ يعود العنصرُ تماماً أو يبقى كما هو الآن — لا موضعَ وسيطاً ولا عنصرَ غيرَه', () => {
  const r = fuzz(recorder(), 1448, 20000, ['uid', 'eid', 'id', null]);
  assert.equal(r.fails, 0, 'إخفاقات: ' + r.fails + ' — أوّلها ' + r.first);
});

test('R3-REC: حالاتٌ مسمّاة — إدراجٌ بين كتابتين · حذفُ الهدف · هويةٌ مكرّرة · عنصرٌ بلا هوية أعاد غيرُها كتابتَه أو نسخه · ختمٌ في موضعه', () => {
  const R = recorder();
  const z = (o) => Object.assign({ a: 1, b: 2 }, o);
  /* إدراجٌ في الأوّل بين كتابتين: يعود إلى ما قبل الضغط في موضعه الجديد · والمُدرَجُ بمرجعه */
  let s0 = [z({ uid: 'A' }), z({ uid: 'B' })], s1 = [z({ uid: 'A', a: 10 }), s0[1]];
  let N = R.note(null, s0, s1, 2);
  const X = z({ uid: 'X' }), s2 = [X].concat(s1), s3 = [X, z({ uid: 'A', a: 20 }), s0[1]];
  N = R.note(N, s2, s3, 2);
  let out = R.back(N, s3);
  assert.deepEqual(out.map((e) => e.uid + e.a), ['X1', 'A1', 'B1']); assert.equal(out[0], X); assert.equal(out[2], s0[1]);
  /* حذفُ الهدف من غيرها: يبقى محذوفاً والباقي بمرجعه */
  N = R.note(null, s0, s1, 2);
  out = R.back(N, [s0[1]]); assert.equal(out.length, 1); assert.equal(out[0], s0[1]);
  /* هويةٌ مكرّرة في المصفوفة الحالية: لا يُعرف أيُّهما — يبقيان */
  const d = [z({ uid: 'A', a: 10 }), z({ uid: 'A', a: 30 })];
  N = R.note(null, s0, s1, 2); out = R.back(N, d); assert.equal(out, d);
  /* بلا هوية: أعاد غيرُها كتابتَه بين كتابتين ⇒ لا يُعرف ما قبل الإيماءة — يبقى كما هو الآن (لا الموضعُ الوسيط) */
  const p0 = [z({}), z({ b: 5 })], p1 = [z({ a: 10 }), p0[1]];
  N = R.note(null, p0, p1, 2);
  const p2 = [Object.assign({}, p1[0], { b: 9 }), p0[1]], p3 = [Object.assign({}, p2[0], { a: 20 }), p0[1]];
  N = R.note(N, p2, p3, 2);
  out = R.back(N, p3); assert.equal(out[0], p3[0], 'باقٍ كما هو'); assert.equal(out[1], p0[1]);
  /* بلا هوية: نسخه غيرُها بعد آخر كتابةٍ للإيماءة (كالصورة) في موضعه ⇒ يعود بفهرسه · وإن تزحزح أيضاً فلا يُعرف ⇒ يبقى ولا يُمسّ غيرُه */
  N = R.note(null, p0, p1, 2);
  const c1 = p1.map((e) => Object.assign({}, e));
  out = R.back(N, c1); assert.equal(out[0].a, 1, 'عاد بفهرسه'); assert.equal(out[1], c1[1]);
  const c2 = [z({ b: 7 })].concat(c1);
  out = R.back(N, c2); assert.equal(out, c2, 'تزحزح بعد النسخ: يبقى كما هو ولا يُكتب على العنصر الذي حلّ في موضعه');
  /* بلا هوية لم يمسّه غيرُها: يعود تماماً ولو خُتم (eid) في موضعه أثناء الإيماءة ثمّ تزحزح */
  N = R.note(null, p0, p1, 2); p1[0].eid = 'L1';
  const q2 = [z({ uid: 'X' })].concat(p1), q3 = [q2[0], Object.assign({}, p1[0], { a: 30 }), p0[1]];
  N = R.note(N, q2, q3, 2);
  out = R.back(N, q3); assert.equal(out[1].a, 1, 'عاد إلى ما قبل الضغط'); assert.equal(out[0], q2[0]); assert.equal(out[2], p0[1]);
});
