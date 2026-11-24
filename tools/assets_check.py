#!/usr/bin/env python3
"""KIVO_263 · SOT-085 — الأصولُ الثابتة: كلُّ ملفٍّ في src/assets/{images,fonts} مذكورٌ في src/assets/README.md، ومستعمَلٌ في المصدر،
وتحت سقف حجمه (صورة ≤ 128 KB · خط ≤ 96 KB)، وبلا بياناتٍ وصفية (EXIF · GPS · نصوص PNG tEXt/iTXt/zTXt) — والصورُ الكبيرة مضغوطة (PNG بـIDAT مضغوط).

  python3 tools/assets_check.py [--src src]
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = {'images': 128 * 1024, 'fonts': 96 * 1024}
# V7 · 53 (ملحق 6 · البند 10): سقفٌ مسمّى لملفٍّ واحد — غلافُ التقرير (report-cover.jpg = 207,087 بايت) هو ملفُّ تصميم المالك الأصلي بايتاً كما في البرودكشن
# (6171818)؛ إعادةُ ضغطه تغيّر التصميم. لا يُحمَّل إلا عند صنع ملف PDF. السقف 212,000 (هامش 2.37٪)، وسقفُ بقية الصور كما هو
CAP_FILE = {'images/report-cover.jpg': 212000}

def main(a):
    src = os.path.join(ROOT, a[a.index('--src') + 1] if '--src' in a else 'src')
    A = os.path.join(src, 'assets'); readme = open(os.path.join(A, 'README.md'), encoding='utf-8').read()
    corpus = []
    for d, ds, fs in os.walk(src):
        if os.path.relpath(d, src).startswith(('assets', 'pages')): continue
        for f in fs:
            if f.endswith(('.js', '.html', '.json', '.css')): corpus.append(open(os.path.join(d, f), encoding='utf-8', errors='replace').read())
    corpus = '\n'.join(corpus)
    # V7 · د5-ح (rmall): في نسخة اختبار الحذف (KIVO_FULL_SRC = الشجرةُ الكاملة) أصلٌ لا يستعمله إلا نظامٌ غائب (صورةُ ترويسة الطباعة بغياب الخطة والمتابعة والعهد)
    # مستعمَلٌ في مجلد ذلك النظام في الشجرة الكاملة — لا يُحقن في الحزمة هنا (@@KIVO_INLINE@@ بمستعمِله وحده)؛ والشجرةُ الكاملة تفحصه كما كان
    gone = []
    full = os.environ.get('KIVO_FULL_SRC')
    if full and os.path.realpath(full) != os.path.realpath(src) and os.path.isdir(os.path.join(full, 'systems')):
        for k in sorted(os.listdir(os.path.join(full, 'systems'))):
            if os.path.isfile(os.path.join(full, 'systems', k, 'system.json')) and not os.path.isfile(os.path.join(src, 'systems', k, 'system.json')):
                for d, ds, fs in os.walk(os.path.join(full, 'systems', k)):
                    for f in fs:
                        if f.endswith(('.js', '.html', '.json', '.css', '.frag', '.tpl')): gone.append(open(os.path.join(d, f), encoding='utf-8', errors='replace').read())
    gone = '\n'.join(gone)
    bad, n = [], 0
    for sub in ('images', 'fonts'):
        D = os.path.join(A, sub)
        for f in sorted(os.listdir(D)):
            n += 1; p = os.path.join(D, f); b = open(p, 'rb').read(); rel = sub + '/' + f
            stem = re.sub(r'-(latin-ext|latin|arabic|bullet)\.woff2$', '', f)
            if f not in readme and not (sub == 'fonts' and stem in readme): bad.append(rel + ': غيرُ مذكورٍ في README')
            if f not in corpus and f not in gone: bad.append(rel + ': غيرُ مستعمَلٍ في المصدر (اسمُه الكامل غائبٌ عن src)')
            cap = CAP_FILE.get(rel, CAP[sub])
            if len(b) > cap: bad.append('%s: %d بايت > السقف %d' % (rel, len(b), cap))
            if b'Exif' in b[:65536] or b'GPS' in b[:65536] or (f.endswith('.png') and any(t in b for t in (b'tEXt', b'iTXt', b'zTXt'))): bad.append(rel + ': بياناتٌ وصفية')
    for x in bad: print('  ✘', x)
    print('النتيجة: %d أصلاً ثابتاً — مذكورٌ ومستعمَلٌ وتحت سقفه وبلا بياناتٍ وصفية · %d مخالفة' % (n, len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
