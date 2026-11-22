#!/usr/bin/env node
/* V7 · د6 — مِسبارُ قياس الاستيراد على أجزاء (قرارُ المالك REPLY2_D6 بند 10).
   أداةٌ مستقلّة لموقع الاختبار وحده: تولّد في الذاكرة نسخةَ إدارةٍ اصطناعية بالشكل القديم (≈31MB أو ≈62MB — بياناتٌ TEST_ONLY، لا ملفَّ حقيقياً)
   وتقود الاستيرادَ على أجزاء عبر واجهة HTTP نفسِها التي يستعملها المتصفح، وتطبع زمنَ كل مرحلة وما يُبلغه الخادمُ من أرقام.

   التشغيل (من جذر المستودع بعد البناء):
     D6_BASE=https://test.example  D6_COOKIE='<اسم الكعكة>=<قيمتها>'  node tools/d6_import_probe.mjs --dept <معرّف إدارة الاختبار> [--size 31|62|small] [--commit]

   · D6_COOKIE كعكةُ جلسةِ مديرِ المنصة — تُقرأ من متغيّر البيئة وحده: لا تُكتب في ملف ولا تُطبع.
   · بلا ‎--commit: رفعٌ وتحقّقٌ ثم إلغاء — لا يتغيّر في الإدارة شيء (القياسُ يشمل الرفعَ والدفعات والفحص).
   · مع ‎--commit: الاعتمادُ يستبدل بياناتِ الإدارة المسمّاة كلَّها بالبيانات الاصطناعية — على إدارةِ اختبارٍ فارغة فقط، وليس على Production أبداً.
   · لا يُجري أيَّ اتصالٍ بغير D6_BASE. */
import { performance } from 'node:perf_hooks';
import { oldFile, protocol, sizeOf } from '../tests/unit/v7_d6_import_fx.mjs';

const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i < 0 ? dflt : process.argv[i + 1]; };
const BASE = String(process.env.D6_BASE || '').replace(/\/+$/, ''), COOKIE = process.env.D6_COOKIE || '', dept = arg('dept', ''), size = String(arg('size', '31')), commit = process.argv.includes('--commit');
if (!/^https?:\/\//.test(BASE) || !COOKIE || !dept || !['31', '62', 'small'].includes(size)) {
  console.error('الاستعمال: D6_BASE=<عنوان موقع الاختبار> D6_COOKIE=<كعكة الجلسة> node tools/d6_import_probe.mjs --dept <معرّف الإدارة> [--size 31|62|small] [--commit]');
  process.exit(2);
}
const origin = new URL(BASE).origin, mb = (n) => (n / 1e6).toFixed(2) + 'MB', ms = (n) => Math.round(n) + 'ms';
const timings = [];
/* طلبٌ واحد: الكعكةُ في الترويسة وحدها · لا إعادةَ توجيهٍ تُتبع (حتى لا تخرج الكعكة إلى عنوانٍ آخر) */
async function call(path, o = {}) {
  const headers = { cookie: COOKIE };
  if (o.body !== undefined) { headers.origin = origin; headers['Content-Type'] = 'application/json'; }
  const body = o.body === undefined ? undefined : typeof o.body === 'string' ? o.body : JSON.stringify(o.body), t0 = performance.now();
  const r = await fetch(BASE + path, { method: o.method || (body !== undefined ? 'POST' : 'GET'), headers, body, redirect: 'manual' });
  const t = await r.text(), took = performance.now() - t0;
  let j = null;
  try { j = JSON.parse(t); } catch (e) { /* ليس JSON */ }
  timings.push({ path, phase: o.body && typeof o.body === 'object' ? (o.body.phase || o.body.op) : 'get', sent: body ? body.length : 0, status: r.status, took });
  return { status: r.status, j, t, h: r.headers };
}
const stop = (what, r) => { console.error('✘ ' + what + ': ' + r.status + ' ' + JSON.stringify(r.j || String(r.t).slice(0, 200))); };
const group = (phase) => { const L = timings.filter((x) => x.phase === phase); if (!L.length) return null; const sum = L.reduce((n, x) => n + x.took, 0); return { n: L.length, total: ms(sum), max: ms(Math.max(...L.map((x) => x.took))), biggest: mb(Math.max(...L.map((x) => x.sent))) }; };

const t0 = performance.now();
const file = await oldFile(size === 'small' ? { small: true } : { scale: size === '62' ? 2 : 1 }), sz = sizeOf(file);
console.log('النسخةُ الاصطناعية: ' + mb(sz.total) + ' (بيانات ' + mb(sz.data) + ' · صور ' + mb(sz.images) + ' · أكبرُ مفتاح ' + mb(sz.maxKey) + ' · أكبرُ صورة ' + mb(sz.maxImage) + ') — وُلّدت في ' + ms(performance.now() - t0));
const scope = { kind: 'dept', departmentId: dept }, P = protocol({ call }, { ck: COOKIE }, file, { scope, mode: 'replace', reason: 'TEST_ONLY د6 · قياس', requestId: 'TEST_ONLY_d6_probe_' + Date.now().toString(36) });
let failed = false;
try {
  const b = await P.begin();
  if (b.status !== 200) { stop('البدء', b); failed = true; }
  console.log('الأجزاء: ' + P.parts.length + ' · دفعاتُ المفاتيح الكبيرة: ' + P.sliceCount + ' · نصُّ الملف بعد الفصل: ' + mb(P.text.length));
  for (let i = 0; !failed && i < P.parts.length; i++) { const r = await P.part(i); if (r.status !== 200) { stop('الجزء ' + (i + 1), r); failed = true; } }
  for (let i = 0; !failed && i < P.sliceCount; i++) { const r = await P.sliceStep(i); if (r.status !== 200) { stop('الدفعة ' + (i + 1), r); failed = true; } }
  if (!failed) {
    const ins = await P.inspect();
    if (ins.status !== 200) { stop('التحقّق', ins); failed = true; } else {
      const s = ins.j.inspection.summary || {};
      console.log('ملخّصُ الخادم: ' + JSON.stringify({ ...s, notTransferred: (s.notTransferred || []).length }));
      if (commit) { const c = await P.commit(ins.j.inspection.base); if (c.status !== 200) { stop('الاعتماد', c); failed = true; } else console.log('اعتُمد: ' + JSON.stringify({ rev: c.j.rev, snapshot: c.j.snapshot, mem: c.j.mem })); }
    }
  }
} finally {
  /* بلا اعتمادٍ ناجح: يُلغى المؤقتُ على الخادم دائماً */
  if (failed || !commit) { const c = await P.cancel(); console.log('الإلغاء: ' + c.status); }
}
for (const [name, phase] of [['البدء', 'begin'], ['الأجزاء', 'part'], ['الدفعات', 'slice'], ['التحقّق', 'inspect'], ['الاعتماد', 'commit'], ['الإلغاء', 'cancel']]) { const g = group(phase); if (g) console.log(name.padEnd(9) + ' · عدد ' + g.n + ' · المجموع ' + g.total + ' · الأطول ' + g.max + ' · أكبرُ طلب ' + g.biggest); }
console.log('المجموعُ الكلي: ' + ms(performance.now() - t0) + (failed ? ' — فشل' : commit ? ' — اعتُمد' : ' — تحقّقٌ بلا اعتماد'));
process.exit(failed ? 1 : 0);
