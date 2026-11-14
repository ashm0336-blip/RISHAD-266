#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V7 · د1 — مقارنةُ حزمتين ملفاً ملفاً، متجاهلةً سطرَ رقم الالتزام وحده:
     python3 tools/pkg_compare.py <A.zip|A/> <B.zip|B/>        exit 0 = متطابقتان (عدا سطر الرقم) · 1 = فرق
   سطرُ الرقم في _worker.js وحده: «var WORKER_COMMIT = '…';» (ومعه التعليقُ «// @@KIVO_COMMIT@@» في العامل غيرِ المضغوط · يحقنه tools/pack.py). يُشترط أن يوجد مرّةً واحدة
   بالضبط في كلٍّ من الطرفين — وإلا فرق. كلُّ ما عداه (كلُّ ملفٍّ آخر وكلُّ سطرٍ آخر في _worker.js) يُقارَن بايتاً ببايت."""
import os, re, sys, zipfile, hashlib
LINE = re.compile(rb"^var WORKER_COMMIT = '[^'\n]*';((?:   // @@KIVO_COMMIT@@)?)$", re.M)   # في الحزمة العاملُ مضغوطٌ بلا التعليق
def load(p):
    if os.path.isdir(p):
        out = {}
        for r, _ds, fs in os.walk(p):
            for f in fs:
                q = os.path.join(r, f); out[os.path.relpath(q, p).replace(os.sep, '/')] = open(q, 'rb').read()
        return out
    with zipfile.ZipFile(p) as z: return {n: z.read(n) for n in z.namelist() if not n.endswith('/')}
def commit_of(b):
    m = LINE.findall(b); return None if len(m) != 1 else re.search(rb"'([^']*)'", LINE.search(b).group(0)).group(1).decode('ascii', 'replace')
def main(a, b):
    A, B = load(a), load(b); bad = []
    for n in sorted(set(A) | set(B)):
        if n not in A or n not in B: bad.append('موجودٌ في طرفٍ واحد: ' + n); continue
        x, y = A[n], B[n]
        if n == '_worker.js':
            ca, cb = commit_of(x), commit_of(y)
            if ca is None or cb is None: bad.append('_worker.js: سطرُ الرقم ليس مرّةً واحدة (' + str(len(LINE.findall(x))) + ' · ' + str(len(LINE.findall(y))) + ')'); continue
            print('  رقمُ الالتزام: ' + ca + '  ·  ' + cb)
            x, y = LINE.sub(b"var WORKER_COMMIT = '';\\1", x), LINE.sub(b"var WORKER_COMMIT = '';\\1", y)
        if x != y: bad.append('يختلف: ' + n + '  ' + hashlib.sha256(x).hexdigest()[:12] + ' ≠ ' + hashlib.sha256(y).hexdigest()[:12])
    for m in bad: print('  ✘ ' + m)
    print(('✔ متطابقتان في %d ملفاً (عدا سطر رقم الالتزام)' % len(A)) if not bad else ('✘ %d فرق' % len(bad)))
    return 1 if bad else 0
if __name__ == '__main__':
    if len(sys.argv) != 3: sys.exit(__doc__)
    sys.exit(main(sys.argv[1], sys.argv[2]))
