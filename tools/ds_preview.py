#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_248 · RM-3 — معاينةُ نظام التصميم (صفحةٌ واحدة ذاتية الاكتفاء مولَّدة من design/tokens.json والـCSS الحقيقي):
   python3 tools/ds_preview.py <src> <out.html>
   تعرض: الطبقات والعدّ · لوحة الرموز الدلالية (فاتح/داكن معاً) · الخطوط (Cairo/Almarai مضمَّنة) ومقياس الأحجام المستعمل · الأقطار · مكوّنات نموذجية بالرموز نفسها."""
import os, sys, json, base64, re, collections, glob
src, out = sys.argv[1], sys.argv[2]; ART = '--artifact' in sys.argv
_lay = {'styles': 'client/css', 'tokens': 'design/tokens.json', 'assets': {'fonts': 'client/fonts'}}   # KIVO_251: التخطيطُ من layout.json إن وُجد
if os.path.exists(os.path.join(src, 'layout.json')): _lay.update({k: v for k, v in json.load(open(os.path.join(src, 'layout.json'), encoding='utf-8')).items() if k in _lay})
T = json.load(open(os.path.join(src, _lay['tokens']), encoding='utf-8'))
L = open(os.path.join(src, _lay['styles'], '070-theme-tokens.css'), encoding='utf-8').read(); D = open(os.path.join(src, _lay['styles'], '080-theme-dark.css'), encoding='utf-8').read()
b64 = lambda p: base64.b64encode(open(os.path.join(src, _lay['assets']['fonts'], p), 'rb').read()).decode('ascii')
fonts = ("@font-face{font-family:'Cairo';font-style:normal;font-weight:400 900;font-display:swap;src:url(data:font/woff2;base64," + b64('cairo-arabic.woff2') + ") format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF;}"
         "@font-face{font-family:'Cairo';font-style:normal;font-weight:400 900;font-display:swap;src:url(data:font/woff2;base64," + b64('cairo-latin.woff2') + ") format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}"
         "@font-face{font-family:'Almarai';font-style:normal;font-weight:800;font-display:swap;src:url(data:font/woff2;base64," + b64('almarai-800-arabic.woff2') + ") format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF;}"
         "@font-face{font-family:'Almarai';font-style:normal;font-weight:800;font-display:swap;src:url(data:font/woff2;base64," + b64('almarai-800-latin.woff2') + ") format('woff2');unicode-range:U+0000-00FF;}")
sem = T['semantic']; fam = collections.OrderedDict()
for t in sem: fam.setdefault(t['name'].split('-')[0], []).append(t['name'])
sizes = collections.Counter(); radii = collections.Counter()
for f in [os.path.join(src, _lay['styles'], '100-brand-ui.css')] + glob.glob(os.path.join(src, 'modules/*/helmet.css')):
    s = open(f, encoding='utf-8').read(); sizes.update(re.findall(r'font-size:\s*([0-9.]+px)', s)); radii.update(re.findall(r'border-radius:\s*([0-9.]+px|9999px|50%)', s))
top_sizes = sorted(set(k for k, _ in sizes.most_common(12)), key=lambda x: float(x[:-2]))
top_radii = [k for k, _ in radii.most_common(7)]
def swatch(name):
    return '<div class="sw"><span class="chip" style="background:var(--%s)"></span><code>--%s</code></div>' % (name, name)
palette = ''.join('<section class="fam"><h3>%s <small>%d</small></h3><div class="grid">%s</div></section>' % (k, len(v), ''.join(swatch(n) for n in v if not n.startswith('shadow') and n != 'brand-pattern')) for k, v in fam.items())
DARKCSS = D.replace('@media screen{html[data-theme="dark"]{', '@media screen{html[data-theme="dark"],.dark{')
DARKSYS = '@media (prefers-color-scheme: dark){' + D[len('@media screen{'):].replace('html[data-theme="dark"]{', 'html:not([data-theme="light"]){', 1)
head = ('<title>معاينة نظام تصميم KIVO</title>' if ART else '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KIVO — معاينة نظام التصميم (KIVO_248)</title>')
html = head + '''
<style>''' + fonts + L + DARKCSS + (DARKSYS if ART else '') + '''
html,body{margin:0;background:var(--bg-app);color:var(--text-primary);font-family:'Cairo',sans-serif;font-size:13px;direction:rtl}html[data-theme=dark]{color-scheme:dark}@media (prefers-color-scheme: dark){html:not([data-theme=light]){color-scheme:dark}}
.wrap{max-width:1180px;margin:0 auto;padding:20px 16px 60px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px;border-bottom:1px solid var(--border-subtle);padding-bottom:6px}h3{font-size:13px;margin:12px 0 6px}small{color:var(--text-muted);font-weight:400}
.bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 18px}.pill{border:1px solid var(--border-default);background:var(--bg-surface);border-radius:9999px;padding:4px 12px;font-size:12px}
button.tg{font:inherit;border:1px solid var(--border-brand);background:var(--brand-primary);color:var(--text-on-brand);border-radius:9999px;padding:6px 14px;cursor:pointer;font-weight:700}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:900px){.two{grid-template-columns:1fr}}
.panel{border:1px solid var(--border-subtle);border-radius:12px;padding:14px;background:var(--bg-surface)}.panel.dark{background:var(--bg-surface);color:var(--text-primary)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}.sw{display:flex;gap:8px;align-items:center;font-size:10.5px}.chip{width:26px;height:26px;border-radius:7px;border:1px solid var(--border-subtle);flex:none}
code{font-family:ui-monospace,monospace;font-size:10px;color:var(--text-secondary);direction:ltr}
table{border-collapse:collapse;width:100%}th,td{text-align:right;padding:6px 8px;border-bottom:1px solid var(--border-subtle);font-size:11.5px}th{color:var(--text-secondary);font-weight:700;background:var(--bg-surface-2)}
.btn{font:inherit;font-weight:700;border-radius:8px;padding:6px 12px;border:1px solid transparent;cursor:pointer;margin:2px}.b-pri{background:var(--brand-primary);color:var(--text-on-brand);border-color:var(--border-brand)}.b-sec{background:var(--bg-surface);color:var(--text-primary);border-color:var(--border-default)}.b-dan{background:var(--danger-bg);color:var(--danger-text);border-color:var(--danger-border)}.b-ok{background:var(--success-bg);color:var(--success-text);border-color:var(--success-border)}
.badge{display:inline-block;border-radius:9999px;padding:2px 9px;font-size:10.5px;font-weight:700;margin:2px}.bd-ok{background:var(--success-bg);color:var(--success-text)}.bd-warn{background:var(--warning-bg);color:var(--warning-text)}.bd-err{background:var(--danger-bg);color:var(--danger-text)}.bd-info{background:var(--info-bg);color:var(--info-text)}
.card{border:1px solid var(--border-subtle);background:var(--bg-card);border-radius:12px;padding:12px;box-shadow:var(--shadow-card)}.num{font-family:'Almarai';font-weight:800;font-size:22px;color:var(--brand-text-strong);font-feature-settings:'tnum'}
input,select{font:inherit;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-default);border-radius:8px;padding:6px 10px;width:100%;box-sizing:border-box}input:focus{outline:2px solid var(--brand-ring);border-color:var(--border-brand)}
.toast{background:var(--bg-toast);color:var(--toast-text);border-radius:10px;padding:8px 12px;font-size:12px;display:inline-block;margin:3px}.toast.ok{border-inline-start:3px solid var(--toast-ok)}.toast.err{border-inline-start:3px solid var(--toast-err)}
.type div{padding:4px 0;border-bottom:1px dashed var(--border-subtle)}.rad span{display:inline-block;width:48px;height:32px;background:var(--brand-tint);border:1px solid var(--border-brand-soft);margin:4px;vertical-align:middle}
.side{background:var(--bg-sidebar);border:1px solid var(--border-subtle);border-radius:12px;padding:10px}.side a{display:block;padding:7px 10px;border-radius:8px;color:var(--text-primary);text-decoration:none;font-weight:700;font-size:12px}.side a.on{background:var(--brand-soft);color:var(--brand-text-strong)}
</style>''' + ('' if ART else '</head><body>') + '''<div class="wrap" dir="rtl" lang="ar">
<h1>KIVO — معاينة نظام التصميم <small>KIVO_248 · مولَّدة من design/tokens.json والـCSS الحقيقي — لا تغيير بصري في هذه الخطوة؛ هذه لوحة مرجعية لقرارات المرحلة 3</small></h1>
<div class="bar"><span class="pill">primitives ''' + str(len(T['primitives'])) + '''</span><span class="pill">semantic ''' + str(len(sem)) + '''</span><span class="pill">literal ''' + str(len(T['literal'])) + '''</span><span class="pill">dark overrides ''' + str(len(T['dark'])) + '''</span><button class="tg" onclick="document.documentElement.toggleAttribute('data-theme')||0;document.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')?'dark':'');if(!document.documentElement.getAttribute('data-theme'))document.documentElement.removeAttribute('data-theme')">تبديل فاتح/داكن</button></div>
<h2>١ — اللوحة الدلالية (كل رمز بقيمته الفعلية في السمة الحالية)</h2>''' + palette + '''
<h2>٢ — الخطوط ومقياس الأحجام المستعمل فعلاً</h2><div class="two"><div class="panel type"><div style="font-size:22px;font-weight:800">Cairo 800 — المنصة التشغيلية</div><div style="font-size:16px;font-weight:700">Cairo 700 — عنوان قسم</div><div style="font-size:13px">Cairo 400 — نص المحتوى الاعتيادي ١٢٣٤٥٦٧٨٩٠</div><div class="num">Almarai 800 — ١٤٤٨/٠٤/٢٧ · 12,345</div></div>
<div class="panel"><table><tr><th>الحجم</th><th>مرات الاستعمال (CSS)</th></tr>''' + ''.join('<tr><td style="font-size:%s">%s — نموذج نص</td><td>%d</td></tr>' % (s, s, sizes[s]) for s in top_sizes) + '''</table></div></div>
<h2>٣ — الأقطار والظلال</h2><div class="panel rad">''' + ''.join('<span style="border-radius:%s" title="%s"></span><code>%s</code> ' % (r, r, r) for r in top_radii) + '''</div>
<h2>٤ — مكوّنات نموذجية بالرموز نفسها (فاتح وداكن جنباً إلى جنب)</h2>
<div class="two"><div class="panel"><h3>فاتح</h3>@@COMP@@</div><div class="panel dark" data-theme="dark"><h3>داكن</h3>@@COMP@@</div></div>
<p><small>الداكن في اللوحة اليمنى يُطبَّق بالصنف .dark على اللوحة نفسها لعرض السمتين معاً؛ زر التبديل أعلاه يبدّل الصفحة كلها.</small></p>
</div>''' + ('' if ART else '</body></html>')
comp = '''<div class="side" style="width:180px;float:left;margin:0 0 10px 10px"><a class="on">مؤشرات الإدارة</a><a>الإحصائيات اليومية</a><a>موظفو الإدارة</a><a>الخطة التشغيلية</a><a>المتابعة اليومية</a></div>
<p><button class="btn b-pri">حفظ</button><button class="btn b-sec">إلغاء</button><button class="btn b-ok">اعتماد</button><button class="btn b-dan">حذف</button></p>
<p><span class="badge bd-ok">مكتمل</span><span class="badge bd-warn">قيد التنفيذ</span><span class="badge bd-err">متأخر</span><span class="badge bd-info">معلومة</span></p>
<div class="card" style="margin:8px 0"><div style="font-size:11px;color:var(--text-muted)">إجمالي التغطية اليوم</div><div class="num">٩٤٪</div><div style="font-size:11px;color:var(--text-secondary)">٣١٢ من ٣٣٢ موقعاً مسكَّناً</div></div>
<table><tr><th>الموظف</th><th>الوردية</th><th>الحالة</th></tr><tr><td>أحمد العتيبي</td><td>صباح</td><td><span class="badge bd-ok">حاضر</span></td></tr><tr><td>خالد الزهراني</td><td>مساء</td><td><span class="badge bd-warn">متأخر</span></td></tr></table>
<p style="margin-top:10px"><input placeholder="بحث عن موظف…"></p><p><span class="toast ok">تم الحفظ</span><span class="toast err">تعذّر الاتصال — أُعيدت المحاولة</span></p><div style="clear:both"></div>'''
html = html.replace('@@COMP@@', comp)
html = html.replace('.panel.dark{background:var(--bg-surface);color:var(--text-primary)}', '.panel.dark{background:var(--bg-surface);color:var(--text-primary)}')
os.makedirs(os.path.dirname(out), exist_ok=True); open(out, 'w', encoding='utf-8').write(html); print('preview →', out, len(html), 'B')
