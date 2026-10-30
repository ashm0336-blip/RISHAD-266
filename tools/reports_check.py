#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_263 · SOT-122 — بنيةُ reports/ مفحوصةٌ آلياً (كان الفهرس reports/README.md «لا يفحصه شيء»):
   (أ) مدخلاتُ الجذر = حزمُ المرشّحات k<NNN>/ · hotfix242/ · README.md · ملفاتُ الأدوات الأربعة (تُكتب فوق نفسها) — لا تكديسَ في الجذر
   (ب) كلُّ مرشّحٍ k<NNN>/ مذكورٌ في الفهرس README.md
   (ج) سجلّاتُ البوابة بالاصطلاح: gate_<N>_run<K>[حرف|_fixes|_STOPPED|_invalid] و gate_<N>_done[K] — والـ<N> = رقمُ مجلدها
       python3 tools/reports_check.py            (يخرج 1 عند مخالفة)
   لا يحذف ولا ينقل شيئاً — قرارُ المالك: «لا تحذف بيانات أو ملفات قديمة لها اعتماد فعلي قبل التحقق من إمكانية إزالتها بأمان»."""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(ROOT, 'reports')
ROOT_FILES = {'README.md', 'key_coverage.json', 'security_audit.json', 'test_catalog.json', 'traceability.json'}
GATE = re.compile(r'^gate_(\d{3})_(?:run\d+[a-z]?(?:_fixes|_STOPPED|_invalid|_aborted)?|run_w\d+|done\d*|disposition)\.(?:txt|md)$')
bad = []
if not os.path.isdir(R):
    print('النتيجة: لا مجلدَ reports/ (المستودعُ الرسمي وحده) · 0 مخالفة'); sys.exit(0)
idx = open(os.path.join(R, 'README.md'), encoding='utf-8').read() if os.path.exists(os.path.join(R, 'README.md')) else ''
ks = []
for e in sorted(os.listdir(R)):
    p = os.path.join(R, e)
    if os.path.isdir(p):
        if re.fullmatch(r'k\d{3}', e): ks.append(e)
        elif e != 'hotfix242': bad.append('(أ) مجلدٌ غيرُ معروف في جذر reports/: ' + e)
    elif e not in ROOT_FILES: bad.append('(أ) ملفٌّ مكدَّسٌ في جذر reports/: ' + e)
for k in ks:
    if k not in idx and ('k' + k[1:] + '/') not in idx and k[1:] not in idx: bad.append('(ب) المرشّحُ غيرُ مذكورٍ في الفهرس: ' + k)
    for f in os.listdir(os.path.join(R, k)):
        if f.startswith('gate_'):
            m = GATE.match(f)
            if not m: bad.append('(ج) اسمُ سجلّ بوابةٍ خارج الاصطلاح: ' + k + '/' + f)
            elif m.group(1) != k[1:]: bad.append('(ج) سجلُّ بوابة ' + m.group(1) + ' في مجلد ' + k)
for b in bad: print('  ✘', b)
print('النتيجة: reports/ — %d مرشّحاً · %d مخالفة' % (len(ks), len(bad)))
sys.exit(1 if bad else 0)
