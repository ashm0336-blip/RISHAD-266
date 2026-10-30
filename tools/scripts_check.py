#!/usr/bin/env python3
"""KIVO_263 · SOT-119 — «كل script له help وsafe defaults ولا يلمس production افتراضيًا».

  python3 tools/scripts_check.py [--check]

لكل سكربتٍ في tools/ (وأدلّتها الفرعية) وscripts/:
  (١) رأسٌ يشرح الاستعمال في أوّل 25 سطراً (سطرُ تشغيلٍ «python3 tools/…» · «node tools/…» · «bash tools/…» أو docstring بالاستعمال)؛
  (٢) لا أمرَ تنفيذيٌّ يلمس Production (أوامرُ D1 على قاعدةٍ مُعطاة مقبولةٌ حين يرفض السكربتُ bassam-db صراحةً افتراضياً): لا استدعاءَ لـwrangler deploy/d1 execute/pages deploy، ولا طلبَ HTTP إلى kivo-d81.pages.dev بلا «test.»،
      ولا اسمَ قاعدة الإنتاج bassam-db في أمرٍ تنفيذي — ذكرُها في نصٍّ إرشاديٍّ أو تعليقٍ مسموح (تعليماتٌ للمالك لا أفعال).
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = ('.py', '.sh', '.mjs', '.js')
HELP = re.compile(r'(python3|node|bash)\s+(tools|scripts)/|usage|الاستعمال|Usage|^\s*"""', re.I | re.M)
EXEC_CALL = re.compile(r'(subprocess\.(run|call|Popen|check_output)|execFileSync|execSync|spawnSync|spawn\(|os\.system|fetch\(|urlopen\(|requests\.)')
PROD = re.compile(r'wrangler\s+(pages\s+)?deploy|d1\s+execute|(?<!test\.)kivo-d81\.pages\.dev|bassam-db(?!-preview)\b')

def files():
    for base in ('tools', 'scripts'):
        b = os.path.join(ROOT, base)
        if not os.path.isdir(b): continue
        for d, ds, fs in os.walk(b):
            ds[:] = [x for x in ds if x not in ('__pycache__', 'node_modules')]
            for f in fs:
                if f.endswith(EXT): yield os.path.relpath(os.path.join(d, f), ROOT)

def main(a):
    bad, n = [], 0
    for rel in sorted(files()):
        n += 1
        t = open(os.path.join(ROOT, rel), encoding='utf-8', errors='replace').read()
        head = '\n'.join(t.split('\n')[:25])
        if not HELP.search(head): bad.append(rel + ': بلا رأسِ استعمال في أوّل 25 سطراً')
        guarded = bool(re.search(r'\[\s*"\$DB"\s*=\s*"bassam-db"\s*\][^\n]*(exit|\{)', t))   # حارسٌ صريح: قاعدةُ الإنتاج مرفوضةٌ افتراضياً
        for i, ln in enumerate(t.split('\n'), 1):
            s = ln.strip()
            if not PROD.search(s) or s.startswith(('#', '//', '/*', '*')): continue
            if guarded and '"$DB"' in s and 'bassam-db' not in s.replace('"$DB"', ''): continue   # الهدفُ مُعطًى ومحروس
            if EXEC_CALL.search(s) or re.match(r'^(wrangler|npx\s+wrangler|curl|wget)\b', s) or re.search(r'(^|[;&|]\s*|do\s+)wrangler\s', s):
                bad.append('%s:%d أمرٌ تنفيذيٌّ يلمس Production: %s' % (rel, i, s[:120]))
    for b in bad: print('  ✘', b)
    print('النتيجة: %d سكربتاً — لكلٍّ رأسُ استعمال · ولا أمرَ يلمس Production · %d مخالفة' % (n, len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
