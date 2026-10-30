#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · SOT-141 / AUD-028 — قائمةُ مكوّنات البرمجيات (SBOM · CycloneDX 1.5) وملخّصُ التراخيص:
   python3 tools/sbom.py [--src k249/src] [--out docs/compliance/sbom]   (docs/compliance/LICENSES.md)
   ① runtime.cdx.json  — ما يُشحن إلى المتصفح/العامل فعلاً: المكوّناتُ المضمَّنة (React · ReactDOM · fflate · الخطوط) ببصماتها SHA-256 من المصدر الحيّ + مكوّناتُ المشروع
   ② tooling-root.cdx.json · tooling-cfbench.cdx.json — اعتمادياتُ البناء والاختبار من package-lock (npm sbom)؛ تُحذف serialNumber/timestamp ليكون الناتجُ حتمياً
   ③ LICENSES.md — جدولُ الرخص (وقتُ التشغيل اسماً اسماً · الأدواتُ عدّاً بحسب الرخصة) — لا رخصةَ copyleft في ما يُشحن.
   المنصةُ بلا اعتمادياتٍ وقتَ التشغيل على npm: كلُّ ما يُشحن مضمَّنٌ في client/ (لا CDN · لا خطوطَ خارجية)."""
import os, sys, json, hashlib, subprocess, collections, datetime
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(H, sys.argv[sys.argv.index('--src') + 1] if '--src' in sys.argv else 'src')
NEW = os.path.exists(os.path.join(SRC, 'layout.json'))   # KIVO_251 · ADR-012
PATHS = ({'react': 'core/010-react.js', 'react-dom': 'core/020-react-dom.js', 'loader': 'core/030-pages-loader.js', 'fonts': 'assets/fonts/', 'dc': 'core/050-dc-runtime.js', 'ver': 'core/270-bs-ver.js', 'worker': '../workers/_worker.js'}
         if NEW else {'react': 'client/js/010-react.js', 'react-dom': 'client/js/020-react-dom.js', 'loader': 'client/js/030-pages-loader.js', 'fonts': 'client/fonts/', 'dc': 'client/js/050-dc-runtime.js', 'ver': 'client/js/270-bs-ver.js', 'worker': 'root/_worker.js'})
OUT0 = os.path.join(H, sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'docs/compliance/sbom')
CHECK = '--check' in sys.argv
import tempfile
OUT = tempfile.mkdtemp(prefix='kivo_sbom_') if CHECK else OUT0
os.makedirs(OUT, exist_ok=True)
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
def comp(name, version, license_, files, kind='library', supplier='', purl='', note=''):
    c = {'type': kind, 'name': name, 'version': version, 'licenses': [{'license': {'id': license_}}] if license_ and license_ != 'proprietary' else [{'license': {'name': license_}}],
         'hashes': [{'alg': 'SHA-256', 'content': sha(os.path.join(SRC, f))} for f in files], 'properties': [{'name': 'kivo:files', 'value': ' · '.join(files)}]}
    if supplier: c['supplier'] = {'name': supplier}
    if purl: c['purl'] = purl
    if note: c['properties'].append({'name': 'kivo:note', 'value': note})
    return c
# ── ① وقتُ التشغيل: ما يُشحن فعلاً ──
rt = [
  comp('react', '18.3.1', 'MIT', [PATHS['react']], supplier='Meta Platforms, Inc.', purl='pkg:npm/react@18.3.1', note='react.production.min.js مضمَّن (UMD) — بلا تعديل'),
  comp('react-dom', '18.3.1', 'MIT', [PATHS['react-dom']], supplier='Meta Platforms, Inc.', purl='pkg:npm/react-dom@18.3.1', note='react-dom.production.min.js مضمَّن؛ يحمل مقطع Modernizr 3.0.0pre (MIT)'),
  comp('fflate', '0.8.3', 'MIT', [PATHS['loader']], supplier='Arjun Barrett', purl='pkg:npm/fflate@0.8.3', note='KIVO_261: السطرُ 5 من محمِّل الصفحات = umd/index.js من fflate@0.8.3 بايتاً (SHA-256 462ef8041fc970e3…؛ قورن بحزم npm ‏0.7.4–0.8.3) · في المصدر ووضع المونوليث وحدهما — البناءُ المنشور (الكسول) لا يشحنه (tools/build.py lazy_loader)'),
  comp('Cairo (variable font)', '3.130', 'OFL-1.1', [PATHS['fonts'] + f for f in ('cairo-arabic.woff2', 'cairo-latin.woff2', 'cairo-latin-ext.woff2')], kind='file', supplier='The Cairo Project Authors (Google Fonts)', note='ثلاث شرائح يونيكود؛ مضمَّنةٌ محلياً — لا طلبَ خارجياً · الإصدارُ وحقُّ النسخ من جدول name في الخط · نصُّ الرخصة في THIRD-PARTY-NOTICES.txt'),
  comp('KIVO bullet glyph', '1.000', 'proprietary', [PATHS['fonts'] + 'cairo-bullet.woff2'], kind='file', supplier='KIVO', note='رمزٌ أصليٌّ رُسم لـKIVO (R188) لـU+2022 وحده — ليس من Cairo وإن حمل اسمَ عائلتها في CSS (جدول name: «Original glyph drawn for KIVO»)'),
  comp('Almarai', '1.10', 'OFL-1.1', [PATHS['fonts'] + f for f in ('almarai-800-arabic.woff2', 'almarai-800-latin.woff2')], kind='file', supplier='Boutros Fonts (Google Fonts)', note='الوزن 800 للأرقام/التقارير · الإصدارُ وحقُّ النسخ من جدول name · نصُّ الرخصة في THIRD-PARTY-NOTICES.txt'),
  comp('dc-runtime', 'KIVO_246+', 'proprietary', [PATHS['dc']], kind='library', supplier='KIVO', note='مكوّنٌ يُصان في المشروع (ADR-008): المصدرُ المقروء هنا هو المصدر؛ رأسُ الملف يذكر أنه وُلِّد أصلاً من مصادر TypeScript غيرِ موجودة في المستودع — سندُ الملكية/الترخيص يؤكّده المالك (docs/threat-model.md §4 بند 7)'),
  comp('kivo-worker', open(os.path.join(SRC, PATHS['ver']), encoding='utf-8').read().split('"')[1], 'proprietary', [PATHS['worker']], kind='application', supplier='KIVO', note='عاملُ Cloudflare Pages المولَّد من workers/parts (ADR-009)'),
]
bom_rt = {'$schema': 'http://cyclonedx.org/schema/bom-1.5.schema.json', 'bomFormat': 'CycloneDX', 'specVersion': '1.5', 'version': 1,
          'metadata': {'component': {'type': 'application', 'name': 'KIVO — المنصة التشغيلية (runtime)', 'version': rt[-1]['version']}, 'tools': [{'name': 'tools/sbom.py', 'vendor': 'KIVO'}],
                       'properties': [{'name': 'kivo:source', 'value': os.path.relpath(SRC, H)}, {'name': 'kivo:no-runtime-npm-deps', 'value': 'true'}]},
          'components': rt}
json.dump(bom_rt, open(os.path.join(OUT, 'runtime.cdx.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# ── ② الأدوات: npm sbom (حتمي بعد حذف serialNumber/timestamp) ──
lic_count = {}
HAVE_CFB = os.path.isfile(os.path.join(H, 'cfbench', 'package.json'))   # KIVO_259 · AUD-029: عُدّةُ cfbench في المختبر الانتقالي — المستودعُ الرسمي وحده بلاها
for name, d in (('tooling-root', H),) + ((('tooling-cfbench', os.path.join(H, 'cfbench')),) if HAVE_CFB else ()):
    r = subprocess.run(['npm', 'sbom', '--sbom-format', 'cyclonedx', '--package-lock-only'], cwd=d, capture_output=True, text=True)
    if r.returncode: raise SystemExit('npm sbom failed in ' + d + ': ' + r.stderr[-300:])
    b = json.loads(r.stdout); b.pop('serialNumber', None); b.get('metadata', {}).pop('timestamp', None)
    pj = json.load(open(os.path.join(d, 'package.json'), encoding='utf-8'))
    if b.get('metadata', {}).get('component'): b['metadata']['component']['name'] = pj.get('name', b['metadata']['component']['name'])   # npm يضع اسمَ المجلد — نثبّت اسمَ الحزمة ليكون الناتجُ واحداً في أي استنساخ
    json.dump(b, open(os.path.join(OUT, name + '.cdx.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    c = collections.Counter()
    for x in b.get('components', []):
        ids = [l.get('license', {}).get('id') or l.get('license', {}).get('name') or l.get('expression') for l in x.get('licenses', [])] or ['(غير معلن)']
        c[' / '.join(ids)] += 1
    lic_count[name] = (len(b.get('components', [])), c)
# ── ③ الملخّص ──
L = ['# التراخيص وقائمةُ المكوّنات (SBOM) — KIVO', '', 'المصدر: `tools/sbom.py` (CycloneDX 1.5 في `docs/compliance/sbom/`؛ هذا الملفُ مولَّد — لا يُحرَّر يدوياً). وقتُ التشغيل بلا اعتماديات npm: كلُّ ما يُشحن مضمَّنٌ في `client/` ومُعرَّفٌ ببصمته.', '',
     '## ما يُشحن إلى المستخدم (runtime.cdx.json)', '', '| المكوّن | الإصدار | الرخصة | الملفات | ملاحظة |', '|---|---|---|---|---|']
for c in rt:
    lic = c['licenses'][0]['license'].get('id') or c['licenses'][0]['license'].get('name')
    L.append('| %s | %s | %s | %s | %s |' % (c['name'], c['version'], lic, [p['value'] for p in c['properties'] if p['name'] == 'kivo:files'][0], ([p['value'] for p in c['properties'] if p['name'] == 'kivo:note'] or [''])[0]))
L += ['', 'لا رخصةَ copyleft (GPL/AGPL/LGPL) في ما يُشحن؛ React/ReactDOM بترخيص MIT، والخطوط OFL-1.1 (تضمينُها في الويب مسموحٌ بشرط عدم بيعها منفردة). نصوصُ الرخص كاملةً مع حقوق النسخ في `public/THIRD-PARTY-NOTICES.txt` المنشور مع كل إصدار (`/THIRD-PARTY-NOTICES.txt`) — لأن التصغيرَ يحذف رأسَ `@license` من ملفات React المشحونة. fflate (MIT) في المصدر وحده ولا يُشحن.', '', '## أدواتُ البناء والاختبار (لا تُشحن)', '']
for name, (n, c) in lic_count.items():
    L.append('- `%s.cdx.json`: %d مكوّناً — ' % (name, n) + ' · '.join('%s: %d' % (k, v) for k, v in sorted(c.items(), key=lambda x: -x[1])[:12]))
L += ['', '## البنية التحتية وأدواتٌ خارج npm', '', '- Cloudflare Pages (Workers) · D1 · R2 — خاضعة لشروط Cloudflare؛ لا مكتباتٍ خارجية وقتَ التشغيل (CSP `default-src \'self\'`).', '- workerd (ضمن miniflare) Apache-2.0 · Playwright Apache-2.0 · Chromium BSD-3-Clause (اختبارٌ فقط) · Python 3 (المكتبة القياسية للبناء والأدوات) PSF-2.0.', '- كودُ KIVO (كلُّ ما عدا المذكور أعلاه): ملكيةُ المالك.']
L += ['', '## التحديث', '', '`python3 tools/sbom.py --src k2NN/src` بعد كل مرشّح؛ الفحصُ في CI: `python3 tools/sbom.py --check` يعيد التوليد ويقارن (`runtime.cdx.json` يتغيّر مع بصمات الملفات).']
NOTICES = os.path.join(H, 'public', 'THIRD-PARTY-NOTICES.txt')   # KIVO_261 · SOT-141: كلُّ مكوّنٍ مشحونٍ من طرفٍ ثالث يحمل رخصتَه في الملف المنشور
if os.path.isdir(os.path.join(H, 'public')) and not os.path.exists(NOTICES): raise SystemExit('✘ public/THIRD-PARTY-NOTICES.txt غائب — رخصُ ما يُشحن لا تُنشر')   # KIVO_261 (المراجعةُ المستقلة)
if os.path.exists(NOTICES):
    _nt = open(NOTICES, encoding='utf-8').read()
    _miss = [c['name'] for c in rt if c['licenses'][0]['license'].get('id') in ('MIT', 'OFL-1.1') and c['name'] != 'fflate' and c['name'].split(' ')[0].replace('react-dom', 'ReactDOM').replace('react', 'React') not in _nt]
    if 'Permission is hereby granted' not in _nt or 'SIL OPEN FONT LICENSE Version 1.1' not in _nt: _miss.append('(نصُّ MIT/OFL الكامل)')
    if _miss: raise SystemExit('✘ THIRD-PARTY-NOTICES.txt لا يحمل: ' + ', '.join(_miss))
open(os.path.join(OUT, 'LICENSES.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')   # يُنقل إلى الجذر أدناه
print('✔ SBOM:', ', '.join(sorted(os.listdir(OUT))), '· runtime components:', len(rt), '· tooling:', {k: v[0] for k, v in lic_count.items()})
LIC_ROOT = os.path.join(H, 'docs', 'compliance', 'LICENSES.md')
if not CHECK: os.replace(os.path.join(OUT, 'LICENSES.md'), LIC_ROOT)
if CHECK:
    if not HAVE_CFB: print('   (المستودعُ الرسمي وحده: LICENSES.md يعدّ عُدّةَ المختبر أيضاً — يُقارَن في المستودع الانتقالي)')
    elif open(LIC_ROOT, 'rb').read() != open(os.path.join(OUT, 'LICENSES.md'), 'rb').read(): print('✘ LICENSES.md differs from generated'); sys.exit(1)
    os.remove(os.path.join(OUT, 'LICENSES.md'))
    bad = [f for f in sorted(os.listdir(OUT)) if not os.path.exists(os.path.join(OUT0, f)) or open(os.path.join(OUT0, f), 'rb').read() != open(os.path.join(OUT, f), 'rb').read()]
    print(('✔ SBOM committed = generated' ) if not bad else ('✘ SBOM differs from generated: ' + ', '.join(bad)))
    sys.exit(1 if bad else 0)
