#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · SOT-115 — فحصُ مخطّط البيئة: كلُّ env.<NAME> في workers/parts معلنٌ في config/env.schema.json (properties أو bindings) والعكس؛ لا قيمَ سرّية في المخطّط.
   python3 tools/env_check.py [src]"""
import os, re, sys, json
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(H, sys.argv[1] if len(sys.argv) > 1 else 'src')   # KIVO_259 · AUD-029: الافتراضيُّ مصدرُ المستودع الرسمي (كان k249/src)
NEW = os.path.exists(os.path.join(S, 'layout.json'))   # KIVO_251 · ADR-012: config/ وworkers/ في الجذر بجوار src/
CFG = os.path.join(S, '..', 'config', 'env.schema.json') if NEW else os.path.join(S, 'config/env.schema.json')
PARTS = os.path.join(S, '..', 'workers', 'parts') if NEW else os.path.join(S, 'workers/parts')
sch = json.load(open(CFG, encoding='utf-8'))
declared = set(sch['properties']) | set(sch['bindings'])
used = set()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import systems_paths   # V7 · الحزمة ب: ومنها أجزاءُ الأنظمة المنقولة
for f, fp in sorted((os.path.basename(n), p) for n, p in systems_paths.worker_parts(PARTS)):
    t = open(fp, encoding='utf-8').read()
    used |= set(re.findall(r'\benv\.([A-Z][A-Z0-9_]+)\b', t))
undeclared = sorted(used - declared); unused = sorted(declared - used)
secretish = [k for k, v in sch['properties'].items() if v.get('secret')]
bad = []
if undeclared: bad.append('مستعملٌ في العامل وغيرُ معلن: ' + ', '.join(undeclared))
if unused: bad.append('معلنٌ وغيرُ مستعمل: ' + ', '.join(unused))
if secretish: bad.append('متغيّرٌ موسوم secret في مخطّطٍ عام: ' + ', '.join(secretish))
for k, v in sch['properties'].items():
    if 'value' in v: bad.append('قيمةٌ مضمَّنة في المخطّط: ' + k)
# KIVO_255 · AUD-023: config/wrangler.toml (تهيئةُ Pages غيرُ السرّية) — الروابطُ والمتغيّراتُ فيه ⊆ المعلن، ولا سرَّ (api token/secret) فيه
WR = os.path.join(os.path.dirname(CFG), 'wrangler.toml')
if os.path.exists(WR):
    w = open(WR, encoding='utf-8').read()
    bind = set(re.findall(r'^binding\s*=\s*"([A-Z][A-Z0-9_]+)"', w, re.M)); varsw = set(re.findall(r'^#?\s*([A-Z][A-Z0-9_]+)\s*=\s*"', w, re.M)) - bind
    extra = sorted((bind | varsw) - declared)
    if extra: bad.append('wrangler.toml يذكر ما ليس في المخطّط: ' + ', '.join(extra))
    if re.search(r'(?i)(api[_-]?token|secret|password)\s*=', w): bad.append('wrangler.toml يحمل سرّاً')
print(('✔ البيئة: %d متغيّرات + %d روابط معلنة = المستعمل في العامل (%s)' % (len(sch['properties']), len(sch['bindings']), ', '.join(sorted(used))) + (' · wrangler.toml متّسق' if os.path.exists(os.path.join(os.path.dirname(CFG), 'wrangler.toml')) else '')) if not bad else '✘ ' + ' · '.join(bad))
sys.exit(1 if bad else 0)
