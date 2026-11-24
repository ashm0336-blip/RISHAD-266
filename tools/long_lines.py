#!/usr/bin/env python3
"""KIVO_263 · AUD-007 — سقّاطةُ «السطر الطويل» في المصدر: كلُّ سطرٍ أطول من 1,500 بايت في src/ يجب أن يقع في ملفٍّ
مولَّدٍ أو مورَّدٍ معلنٍ هنا بسببه — فالمصدرُ الذي يُحرَّر يدوياً مقروءٌ سطراً سطراً، والمضغوطُ (الصفحاتُ المولَّدة) مصدرُه
المقروء في src/modules ويُثبت تساويه tools/generate.py --check.

  python3 tools/long_lines.py [--src src] [--check]     → 0 مخالفة وإلا يُخفق
"""
import fnmatch, os, subprocess, sys

LIMIT = 1500
ALLOW = [  # (نمط · السبب) — المولَّدُ يُعاد توليدُه ولا يُحرَّر · المورَّدُ كما نُشر
    ('pages/*.dc.html',                 'مولَّد: tools/generate.py من src/modules/<وحدة>/{view.html,logic.js,helmet.css} (المصدرُ المقروء)'),
    ('manifests/255-page-manifest.js',  'مولَّد: tools/generate.py من src/manifests/pages.json'),
    ('permissions/340-registry-v24-9.js', 'مولَّد: tools/generate.py من registry/registry-v24.9.json'),
    ('permissions/345-perm44.js', 'مولَّد: tools/generate.py من registry/perm44-levels.json + perm44-core.js (V7 · د5-هـ 44)'),
    ('styles/070-theme-tokens.css',     'مولَّد: tools/tokens.py من src/styles/tokens'),
    ('styles/080-theme-dark.css',       'مولَّد: tools/tokens.py من src/styles/tokens'),
    ('core/020-react-dom.js',           'مورَّد: react-dom 18.3.1 كما نُشر (docs/dependencies-policy.md)'),
    ('core/030-pages-loader.js',        'مورَّد: fflate 0.8.3 مصغَّراً كما نُشر (docs/dependencies-policy.md)'),
    ('assets/vendor/html2canvas-*.min.js', 'مورَّد: html2canvas 1.4.1 مصغَّراً كما نُشر (docs/dependencies-policy.md · V7 · 53)'),
    ('assets/icons/catalog.json',       'بيانات: جسمُ أيقونةٍ (SVG) نصاً واحداً — tools/icons.py extract/index'),
    ('slots/tools/*.tpl',               'قالب: ملفُّ إعدادٍ في tools/ (خارج src) بسطوره كما هي — يُحقن بـtools/systems.py (V7 · د2)'),
]

def tracked(src):
    r = subprocess.run(['git', 'ls-files', '-z', src], capture_output=True, text=True)
    if r.returncode == 0 and r.stdout: return [p for p in r.stdout.split('\0') if p]
    out = []
    for d, _, fs in os.walk(src):
        for f in fs: out.append(os.path.join(d, f))
    return out

def main(argv):
    src = argv[argv.index('--src') + 1] if '--src' in argv else 'src'
    bad, allowed, used = [], 0, set()
    for p in tracked(src):
        if p.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2', '.ico')) or not os.path.isfile(p): continue
        try: lines = open(p, 'rb').read().split(b'\n')
        except OSError: continue
        rel = os.path.relpath(p, src).replace(os.sep, '/')
        for i, ln in enumerate(lines, 1):
            if len(ln) <= LIMIT: continue
            hit = next((pat for pat, _ in ALLOW if fnmatch.fnmatch(rel, pat)), None)
            if hit: allowed += 1; used.add(hit)
            else: bad.append(f'{p}:{i} ({len(ln):,} بايت)')
    stale = [pat for pat, _ in ALLOW if pat not in used]
    # V7 · د5-ح (rmall): في نسخة اختبار الحذف (KIVO_FULL_SRC = الشجرةُ الكاملة) قد يقصر ملفٌّ مولَّد بغياب أنظمةٍ يُولَّد منها (345-perm44.js بغياب العشرة)؛
    # فالاستثناءُ «لا يطابق شيئاً» هناك فقط إن لم يبقَ ملفٌّ يطابق نمطَه — والشجرةُ الكاملة تفحصه كما كان (سطرٌ طويلٌ فعلاً)
    if os.environ.get('KIVO_FULL_SRC') and os.path.realpath(os.environ['KIVO_FULL_SRC']) != os.path.realpath(src):
        files = [os.path.relpath(p, src).replace(os.sep, '/') for p in tracked(src)]
        stale = [pat for pat in stale if not any(fnmatch.fnmatch(f, pat) for f in files)]
    for b in bad: print('  ✘ سطرٌ طويلٌ في مصدرٍ يُحرَّر يدوياً:', b)
    for s in stale: print('  ✘ استثناءٌ لا يطابق شيئاً (يُحذف من القائمة):', s)
    print(f'النتيجة: {allowed} سطراً طويلاً كلُّها في مولَّدٍ/مورَّدٍ معلن ({len(used)} نمطاً) · {len(bad) + len(stale)} مخالفة')
    return 1 if (bad or stale) else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
