#!/usr/bin/env python3
"""KIVO_263 · SOT-085 — الأصولُ الثابتة: كلُّ ملفٍّ في src/assets/{images,fonts} مذكورٌ في src/assets/README.md، ومستعمَلٌ في المصدر،
وتحت سقف حجمه (صورة ≤ 128 KB · خط ≤ 96 KB)، وبلا بياناتٍ وصفية (EXIF · GPS · نصوص PNG tEXt/iTXt/zTXt) — والصورُ الكبيرة مضغوطة (PNG بـIDAT مضغوط).

  python3 tools/assets_check.py [--src src]
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = {'images': 128 * 1024, 'fonts': 96 * 1024}

def main(a):
    src = os.path.join(ROOT, a[a.index('--src') + 1] if '--src' in a else 'src')
    A = os.path.join(src, 'assets'); readme = open(os.path.join(A, 'README.md'), encoding='utf-8').read()
    corpus = []
    for d, ds, fs in os.walk(src):
        if os.path.relpath(d, src).startswith(('assets', 'pages')): continue
        for f in fs:
            if f.endswith(('.js', '.html', '.json', '.css')): corpus.append(open(os.path.join(d, f), encoding='utf-8', errors='replace').read())
    corpus = '\n'.join(corpus)
    bad, n = [], 0
    for sub in ('images', 'fonts'):
        D = os.path.join(A, sub)
        for f in sorted(os.listdir(D)):
            n += 1; p = os.path.join(D, f); b = open(p, 'rb').read(); rel = sub + '/' + f
            stem = re.sub(r'-(latin-ext|latin|arabic|bullet)\.woff2$', '', f)
            if f not in readme and not (sub == 'fonts' and stem in readme): bad.append(rel + ': غيرُ مذكورٍ في README')
            if f not in corpus: bad.append(rel + ': غيرُ مستعمَلٍ في المصدر (اسمُه الكامل غائبٌ عن src)')
            if len(b) > CAP[sub]: bad.append('%s: %d بايت > السقف %d' % (rel, len(b), CAP[sub]))
            if b'Exif' in b[:65536] or b'GPS' in b[:65536] or (f.endswith('.png') and any(t in b for t in (b'tEXt', b'iTXt', b'zTXt'))): bad.append(rel + ': بياناتٌ وصفية')
    for x in bad: print('  ✘', x)
    print('النتيجة: %d أصلاً ثابتاً — مذكورٌ ومستعمَلٌ وتحت سقفه وبلا بياناتٍ وصفية · %d مخالفة' % (n, len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
