/* مراجعةُ التكامل W1-R3 — «طباعةُ الصفحات الطويلة: الأولى بيضاء وما بعدها كتلٌ بيج»:
   الموجة 1 (R3) أضافت إلى رأس القالب نمطاً حرجاً html,body{background:var(--bg-app)} بلا استعلام وسائط. على الورق صار للجذر html
   خلفيةٌ بيج خاصّةٌ به، فلا تنتقل خلفيةُ الجسم إلى اللوحة (CSS 2.1 §14.2: تنتقل خلفيةُ body إلى اللوحة فقط إن كانت خلفيةُ html شفّافة)،
   وقاعدةُ الطباعة body{background:var(--bg-surface)!important} (helmet-global) لا تغطّي إلا صندوقَ الجسم: الصفحةُ الأولى بيضاء
   والصفحاتُ التالية بيج (طباعةُ الموظفين/المهام/التسكين/الاسترشاد/المضبوطات/الإحصائيات/سجلّ الخطة بـwindow.print()).
   يُثبت هنا على CSS الحقيقيّ للمستند الرئيسيّ (نمطُ القالب الحرج + كتلُ الأنماط المضمَّنة في القالب + helmet-global + أنماطُ الوحدات):
     · في الطباعة: لا قاعدةَ تعطي الجذرَ (html · :root · html[data-theme]) خلفيةً — فتبلغ خلفيةُ الجسم البيضاء اللوحةَ كلَّها.
     · على الشاشة: الجذرُ والجسمُ بخلفية التطبيق من أوّل رسم (ضمانُ R3 فاتحاً وداكناً باقٍ). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');

/* محلّلُ CSS صغير: قواعدُ الأنماط مع سياق وسائطها (@media متداخلة) — التعليقاتُ تُحذف والنصوصُ المقتبسة تُتجاوز */
function rules(css, file) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<\/?style\b[^>]*>/g, ' ');   /* أنماطُ الوحدات (helmet.css) ملفوفةٌ بوسم style */
  const out = [];
  let i = 0;
  const close = (k) => { let d = 0, q = ''; for (; k < css.length; k++) { const c = css[k]; if (q) { if (c === '\\') k++; else if (c === q) q = ''; continue; } if (c === '"' || c === "'") q = c; else if (c === '{') d++; else if (c === '}' && --d === 0) return k; } return css.length; };
  const walk = (from, to, media) => {
    let k = from;
    while (k < to) {
      const ob = css.indexOf('{', k); if (ob < 0 || ob >= to) break;
      const pre = css.slice(k, ob).replace(/^[\s;}]+/, '').trim(), cb = close(ob);
      if (/^@media\b/i.test(pre)) walk(ob + 1, cb, media.concat([pre.replace(/^@media\s*/i, '')]));
      else if (/^@supports\b/i.test(pre)) walk(ob + 1, cb, media);
      else if (!/^@/.test(pre)) out.push({ file, sel: pre.split(',').map((s) => s.trim()), body: css.slice(ob + 1, cb), media });
      k = cb + 1;
    }
  };
  walk(0, css.length, []);
  return out;
}
/* هل تنطبق قائمةُ الاستعلامات (كلُّها معاً) على وسيطٍ بعينه؟ print/screen/all صريحة · الاستعلامُ بالخصائص وحدها يُعدّ منطبقاً (الأسوأ) */
const appliesTo = (medium) => (list) => list.every((q) => q.split(',').some((one) => {
  const t = one.trim().toLowerCase(), m = /^(not\s+|only\s+)?(print|screen|all)\b/.exec(t);
  if (!m) return true;
  const hit = m[2] === 'all' || m[2] === medium;
  return m[1] && m[1].trim() === 'not' ? !hit : hit;
}));
/* محدِّدٌ يصيب الجذرَ دون شرطِ حالةٍ عابرة (السمةُ حالةٌ دائمة: html[data-theme=…] يُعدّ) */
const ROOT_SEL = /^(html|:root)(\[data-theme[^\]]*\])?$/;
const bgOf = (body) => { const m = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i.exec(body); return m ? m[1].trim() : null; };
const clear = (v) => /^(transparent|none|initial|unset)(\s*!important)?$/i.test(v);

/* CSS المستند الرئيسيّ كما يجمعه القالب: كلُّ <style> في القالب · كلُّ كتلة .css (BLOCK/INLINE) · وأنماطُ الوحدات (تُركَّب في المستند نفسِه) */
function documentCss() {
  const tpl = rd('layouts/index.template.html'), parts = [];
  for (const m of tpl.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) parts.push(['index.template.html <style>', m[1]]);
  for (const m of tpl.matchAll(/@@KIVO_(?:BLOCK|INLINE):([^@]+\.css)@@/g)) parts.push([m[1], rd(m[1])]);
  for (const d of fs.readdirSync(path.join(SRC, 'modules'))) { const p = path.join('modules', d, 'helmet.css'); if (fs.existsSync(path.join(SRC, p))) parts.push([p, rd(p)]); }
  return parts;
}

test('W1-R3: في الطباعة لا خلفيةَ للجذر (html) — فتنتقل خلفيةُ الجسم (بلون السطح) إلى اللوحة في كل الصفحات', () => {
  const parts = documentCss();
  assert.ok(parts.length > 10, 'القالبُ وكتلُ أنماطه وأنماطُ الوحدات مقروءة');
  const all = parts.flatMap(([f, css]) => rules(css, f));
  const paint = all.filter((r) => r.sel.some((s) => ROOT_SEL.test(s)) && bgOf(r.body) && !clear(bgOf(r.body)));
  const onPrint = paint.filter((r) => appliesTo('print')(r.media));
  assert.deepEqual(onPrint.map((r) => r.file + ' · ' + (r.media.length ? '@media ' + r.media.join(' & ') + ' ' : '') + r.sel.join(',') + '{background:' + bgOf(r.body) + '}'), [],
    'خلفيةٌ للجذر على الورق تحبس خلفيةَ الجسم في صندوقه: الصفحةُ الأولى بيضاء وما بعدها بيج');
  /* قاعدةُ طباعة الجسم نفسُها (helmet-global): لونُ السطح وبـ!important فوق body{background:var(--bg-app)} في أنماط الوحدات */
  const body = rules(rd('layouts/helmet-global.css'), 'helmet-global.css').filter((r) => r.sel.includes('body') && r.media.length && appliesTo('print')(r.media) && !appliesTo('screen')(r.media));
  assert.ok(body.some((r) => /^var\(--bg-surface\)\s*!important$/.test(bgOf(r.body) || '')), 'body{background:var(--bg-surface)!important} في @media print');
  /* هيكلُ الإقلاع لا يُطبع */
  const crit = /<style id="bs-critical">([\s\S]*?)<\/style>/.exec(rd('layouts/index.template.html'))[1];
  assert.ok(rules(crit, 'bs-critical').some((r) => r.sel.includes('#bs-boot') && r.media.join() === 'print' && /display:none/.test(r.body)));
});

test('W1-R3: على الشاشة — الجذرُ والجسمُ بخلفية التطبيق من النمط الحرج في الرأس (ضمانُ الرسم الأول R3 فاتحاً وداكناً)', () => {
  const crit = /<style id="bs-critical">([\s\S]*?)<\/style>/.exec(rd('layouts/index.template.html'))[1];
  const rs = rules(crit, 'bs-critical'), scr = appliesTo('screen');
  for (const el of ['html', 'body']) {
    const r = rs.filter((x) => x.sel.includes(el) && scr(x.media) && bgOf(x.body));
    assert.ok(r.length && r.every((x) => bgOf(x.body) === 'var(--bg-app)'), el + ' بخلفية التطبيق على الشاشة');
  }
  assert.deepEqual(rs.filter((x) => x.sel.includes('html') && bgOf(x.body)).map((x) => x.media.join(' & ')), ['screen'], 'للشاشة وحدها — لا للورق');
  /* الرمزُ نفسُه للفاتح وللداكن: الداكنُ تحت @media screen أيضاً (080) فالورقُ بألوان الفاتح دائماً */
  const dark = rules(rd('styles/080-theme-dark.css'), '080').filter((r) => r.sel.includes('html[data-theme="dark"]') && /--bg-app:/.test(r.body));
  assert.ok(dark.length && dark.every((r) => scr(r.media)), 'خلفيةُ الداكن مُعرَّفةٌ للشاشة');
  assert.ok(rules(rd('styles/070-theme-tokens.css'), '070').some((r) => r.sel.includes(':root') && /--bg-app:var\(--p-f2f0eb\)/.test(r.body)), 'وبيجُ الفاتح');
});
