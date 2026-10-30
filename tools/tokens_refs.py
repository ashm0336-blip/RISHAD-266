#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_263 · AUD-017 — مراجعُ الرموز الحرفية (--bg-x… · --fg-a… · --bd-…) تُنقل إلى أسمائها الدلالية تدريجياً، بلا تغييرٍ محسوب:
   كلُّ رمزٍ حرفيٍّ في design/tokens.json (literal) قيمتُه var(--<دلالي>) ولا تعيد السمةُ الداكنة تعريفَه (0 من 1,352) — فاستبدالُ
   var(--<حرفي>) بـvar(--<دلالي>) يعطي القيمةَ نفسَها في السمتين حرفاً (والرموزُ الحرفية تبقى معرَّفةً لخريطة وقت التشغيل __BS_TOK).
     python3 tools/tokens_refs.py                 يعدّ المراجع لكل ملف
     python3 tools/tokens_refs.py --rewrite-css   يحوّل مراجعَ ملفات CSS (الخطوة ١ — القوالبُ وJS تثبّت حزمُ البوابة أسماءها الحرفية)
     python3 tools/tokens_refs.py --check         سقّاطة: CSS بلا مرجعٍ حرفي · والمجموعُ في المصدر ≤ خطّ الأساس (tools/tokens_refs.json)"""
import os, re, sys, json, glob, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src'); BL = os.path.join(ROOT, 'tools', 'tokens_refs.json')
lay = json.load(open(os.path.join(SRC, 'layout.json'), encoding='utf-8'))
T = json.load(open(os.path.join(SRC, lay.get('tokens', 'design/tokens.json')), encoding='utf-8'))
dark = {d['name'] for d in T['dark']}
ALIAS = {}
for x in T['literal']:
    m = re.fullmatch(r'var\(--([a-z0-9-]+)\)', x['value'])
    if m and x['name'] not in dark: ALIAS[x['name']] = m.group(1)
RX = re.compile(r'var\(--((?:bg|fg|bd)-[a-z0-9]+)\)')
SKIP = ('070-theme-tokens.css', '080-theme-dark.css')
def files():
    for f in sorted(glob.glob(os.path.join(SRC, '**', '*'), recursive=True)):
        if os.path.isfile(f) and f.endswith(('.css', '.js', '.html', '.txt')) and not f.endswith(SKIP): yield f
def refs(t): return [m for m in RX.finditer(t) if m.group(1) in ALIAS]
def main(a):
    per = collections.Counter(); css = 0
    for f in files():
        t = open(f, encoding='utf-8').read(); n = len(refs(t))
        if '--rewrite-css' in a and f.endswith('.css') and n:
            t2 = RX.sub(lambda m: 'var(--' + ALIAS[m.group(1)] + ')' if m.group(1) in ALIAS else m.group(0), t)
            open(f, 'w', encoding='utf-8').write(t2); n = len(refs(t2))
        if n: per[os.path.relpath(f, ROOT)] = n
        if f.endswith('.css'): css += n
    tot = sum(per.values()); bad = []
    if '--write-baseline' in a: json.dump({'note': 'KIVO_263 · AUD-017: مراجعُ الرموز الحرفية في المصدر — تُخفَّض ولا تُرفع', 'total': tot}, open(BL, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if '--check' in a:
        b = json.load(open(BL, encoding='utf-8'))['total']
        if css: bad.append('مراجعُ حرفيةٌ في CSS: %d' % css)
        if tot > b: bad.append('زادت المراجعُ الحرفية: %d > %d' % (tot, b))
    if '--list' in a:
        for f, n in per.most_common(): print('  %6d  %s' % (n, f))
    for x in bad: print('  ✘', x)
    print('النتيجة: مراجعُ الرموز الحرفية — %d في %d ملفاً (CSS: %d) · الرموزُ القابلة للتحويل %d · %d مخالفة' % (tot, len(per), css, len(ALIAS), len(bad)))
    return 1 if bad else 0
if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
