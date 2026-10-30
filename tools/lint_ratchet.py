#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · AUD-014 — سقّاطةُ ESLint: العددُ لكل قاعدة لا يزيد على الخط الأساسي (tests/baselines/baseline.json)؛ ويُحدَّث بـ--update بعد كل خفض.
   python3 tools/lint_ratchet.py <eslint.json> [--update]"""
import sys, json, collections, os
rep = json.load(open(sys.argv[1], encoding='utf-8')); base_p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tests', 'baselines', 'baseline.json')
c = collections.Counter(); files = collections.Counter()
for f in rep:
    for m in f['messages']: c[m['ruleId'] or 'parse-error'] += 1; files[f['filePath'].split('/src/')[-1]] += 1
cur = {'total': sum(c.values()), 'byRule': dict(sorted(c.items())), 'filesWithFindings': len(files), 'top': sorted(files.items(), key=lambda x: -x[1])[:10]}
if '--update' in sys.argv: json.dump(cur, open(base_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('baseline updated:', cur['total'], cur['byRule']); sys.exit(0)
base = json.load(open(base_p, encoding='utf-8')) if os.path.exists(base_p) else {'total': 0, 'byRule': {}}
worse = {r: (base['byRule'].get(r, 0), n) for r, n in cur['byRule'].items() if n > base['byRule'].get(r, 0)}
better = {r: (base['byRule'].get(r, 0), cur['byRule'].get(r, 0)) for r in base['byRule'] if cur['byRule'].get(r, 0) < base['byRule'][r]}
errors = cur['byRule'].get('no-dupe-keys', 0) + cur['byRule'].get('parse-error', 0) + cur['byRule'].get('no-undef', 0)
print('ESLint: ' + str(cur['total']) + ' نتيجة (الخط الأساسي ' + str(base['total']) + ') · ' + json.dumps(cur['byRule'], ensure_ascii=False))
if better: print('   ↓ تحسّن: ' + json.dumps(better, ensure_ascii=False) + ' — حدّث الخط الأساسي بـ--update')
if worse: print('✘ زيادة عن الخط الأساسي: ' + json.dumps(worse, ensure_ascii=False)); sys.exit(1)
if errors: print('✘ نتائجُ مستوى خطأ (no-dupe-keys · no-undef · parse-error) يجب أن تكون صفراً: ' + str(errors)); sys.exit(1)
print('✔ لا زيادة عن الخط الأساسي ولا أخطاء')
