#!/usr/bin/env python3
"""KIVO_263 · SOT-058 — لا اعتمادَ على hover: كلُّ قاعدةٍ تكشف محتوىً بالمرور (display ≠ none · visibility:visible · opacity:1) يجب أن تكشفه
أيضاً بالتركيز (‎:focus/‎:focus-within في المحدِّدات نفسِها) — فاللمسُ ولوحةُ المفاتيح يصلان إليه. تغييرُ لونٍ أو شفافيةٍ جزئية للتغذية البصرية ليس كشفاً.

  python3 tools/hover_check.py [--src src]
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RULE = re.compile(r'([^{}]+)\{([^{}]*)\}')
REVEAL = re.compile(r'display\s*:\s*(?!none)[a-z-]+|visibility\s*:\s*visible|(?<![\w-])opacity\s*:\s*1(?:\.0+)?\s*(?:;|$|!)')

def main(a):
    src = os.path.join(ROOT, a[a.index('--src') + 1] if '--src' in a else 'src')
    bad, n = [], 0
    for d, ds, fs in os.walk(src):
        if os.path.relpath(d, src).startswith('pages'): continue   # مولَّدةٌ من src/modules
        for f in fs:
            if not f.endswith(('.css', '.html', '.js')): continue
            p = os.path.join(d, f); t = open(p, encoding='utf-8', errors='replace').read()
            for m in RULE.finditer(t):
                sel, body = m.group(1), m.group(2)
                if ':hover' not in sel or '@media (hover' in sel or not REVEAL.search(body): continue
                parts = [x.strip() for x in sel.split(',')]
                for h in [x for x in parts if ':hover' in x]:
                    n += 1
                    want = [h.replace(':hover', ':focus'), h.replace(':hover', ':focus-within')]
                    if not any(w in parts for w in want):
                        bad.append('%s:%d «%s» يكشف بالمرور وحده' % (os.path.relpath(p, ROOT), t.count('\n', 0, m.start()) + 1, h[-90:]))
    for b in bad: print('  ✘', b)
    print('النتيجة: %d محدِّداً يكشف محتوىً بالمرور — كلُّها مكشوفةٌ بالتركيز أيضاً · %d مخالفة' % (n, len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
