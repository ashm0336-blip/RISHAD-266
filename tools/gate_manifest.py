#!/usr/bin/env python3
"""KIVO_263 — القائمةُ الإلزامية للبوابة الدائمة، مستخرَجةً من نصّ البوابة نفسِه.

  python3 tools/gate_manifest.py gateallN.sh               → يطبع الأسماءَ الإلزامية سطراً سطراً
  python3 tools/gate_manifest.py gateallN.sh --write MAN   → يكتبها في MAN
  python3 tools/gate_manifest.py gateallN.sh --check MAN   → يُخفق إن اختلفت القائمةُ عن النصّ

الاستثناءُ الوحيد: حزمةٌ يعلّمها قرارُ المالك «غيرَ إلزامية مؤقتاً» (# gate:optional-by-owner <تاريخ> في سطر اسمها) — تُطبع ولا تُحسب في القائمة.
ويُخفق (في كل الأوضاع) إن:
  • قطّع الفاصلُ «:» اسماً في حلقة «for t in» إلى حقولٍ أكثرَ أو أقلّ مما تقرؤه الحلقة (عيبُ k261tree في 261: الاسمُ فيه «1:1»
    فصار الملفُّ «1 إلى …» ولم تُشغَّل الحزمةُ قط)،
  • أشار عنصرٌ إلى ملفّ اختبارٍ غير موجود،
  • تكرّر اسمٌ (الحكمُ يُسجَّل بالاسم، فالمكرّرُ يُخفي غيابَ أحدهما).
"""
import os, re, sys

def parse(path):
    root = os.path.dirname(os.path.abspath(path))
    lines = open(path, encoding='utf-8').read().split('\n')
    names, errs, optional = [], [], []
    # مواضعُ ملفات الحزم: الجذر · cfbench · tests · tools · وأجيالُ المختبر kNNN (ومجلدُ tests فيها) — تُكتشف ولا تُكتب أسماؤها (AUD-029)
    gens = sorted(d for d in os.listdir(root) if re.fullmatch(r'k\d{3}', d) and os.path.isdir(os.path.join(root, d)))
    DIRS = ['.', 'cfbench', 'tests/source', 'tests', 'tools'] + [os.path.join(g, 'tests') for g in gens] + gens
    i = 0
    while i < len(lines):
        ln = lines[i]
        m = re.match(r'\s*for t in (.*); do', ln)
        if m:
            items = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))
            body = lines[i + 1] if i + 1 < len(lines) else ''
            # عددُ الحقول الذي تقرؤه الحلقة = عددُ عمليات التقطيع على t وr + 1
            nf = len([v for v in re.findall(r'\b(\w+)=\$\{[tr][#%]', body) if v != 'r'])   # n · f · to/d/a — r متغيّرُ عملٍ لا حقل
            for it in items:
                parts = it.split(':')
                if len(parts) != nf:
                    errs.append(f'سطر {i + 1}: «{it[:70]}…» = {len(parts)} حقول والحلقةُ تقرأ {nf} — الفاصلُ «:» داخل الاسم؟')
                    continue
                n, f = parts[0], parts[1]
                base = f[2:] if f.startswith('x/') else f   # x/<حزمة> ⇒ k243xdiff على <حزمة>.mjs
                cands = [os.path.join(root, d, g) for d in DIRS for g in (base, base + '.mjs')]
                if not any(os.path.isfile(c) for c in cands):
                    errs.append(f'سطر {i + 1}: «{n}» يشير إلى ملفٍّ غير موجود: {f}')
                names.append(n)
            i += 1; continue
        m = re.match(r'\s*n="([^"]+)"; printf', ln)
        if m:
            # KIVO_263 · قرارُ المالك (2026-10-13): حزمةٌ «غيرُ إلزامية مؤقتاً» تُعلَّم في سطر اسمها صراحةً «# gate:optional-by-owner <تاريخ>»
            # فتُستثنى من القائمة الإلزامية وتُطبع هنا وفي خلاصة البوابة — لا استثناءَ صامت
            (optional if '# gate:optional-by-owner' in ln else names).append(m.group(1))
        i += 1
    seen, dup = set(), []
    for n in names:
        if n in seen: dup.append(n)
        seen.add(n)
    for d in dup: errs.append('اسمٌ مكرّر: ' + d)
    return names, errs, optional

def main(a):
    if not a: print(__doc__); return 2
    names, errs, optional = parse(a[0])
    for e in errs: print('✘', e)
    for o in optional: print('· غيرُ إلزامي بقرار المالك:', o)
    if len(a) >= 3 and a[1] == '--write':
        open(a[2], 'w', encoding='utf-8').write('\n'.join(names) + '\n')
    elif len(a) >= 3 and a[1] == '--check':
        man = [x for x in open(a[2], encoding='utf-8').read().split('\n') if x]
        miss, extra = [n for n in names if n not in man], [n for n in man if n not in names]
        for n in miss: print('✘ في البوابة وليس في القائمة:', n)
        for n in extra: print('✘ في القائمة وليس في البوابة:', n)
        if miss or extra: errs.append('x')
    else:
        print('\n'.join(names))
    print(f'النتيجة: {len(names)} اختباراً إلزامياً · {len(optional)} غيرُ إلزامي بقرار المالك · {len(errs)} خطأ')
    return 1 if errs else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
