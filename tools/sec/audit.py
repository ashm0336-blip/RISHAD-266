#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · SOT-165 — التدقيقُ الأمني النهائي آلياً من الأدلة (لا رأيَ بلا دليل): docs/security-audit.md + reports/security_audit.json
     python3 tools/sec/audit.py --pk pk265 --gate reports/k265/gate_265_run1.txt [--gate …run2.txt] --preview reports/k264/preview/verify_264_preview_….json
   الأقسام (كلٌّ بحكمه):
     ① الأسرار — tools/sec/secrets_scan.py على المصدر الرسمي والعُدّة والحزمة: 0 اكتشاف.
     ② الاعتماديات — npm audit للجذر (أدواتُ البناء والفحص) والعُدّة (Miniflare/Playwright للاختبار المحلي): ما يُشحن إلى المتصفح والعامل (SBOM runtime)
        بلا ثغرةٍ معروفة؛ ثغراتُ أدوات التطوير تُعدّ وتُصنَّف (لا تُشحن ولا تعمل في Cloudflare).
     ③ اختباراتُ الأمن في الوحدة (عاملُ الحزمة نفسُه داخل Node): fail-closed · قيدُ المضيف وTTL · ping · بصماتُ كلمات المرور (AUD-033) · CSP nonce ·
        Origin/CSRF · المعدّل · دورةُ الجلسة · العدائية · ترقيةُ البصمة · سلامةُ البيانات · قرارُ كلّ مفتاح.
     ④ حزمُ الأمن في البوابة الكاملة (من سجلّها): الأمن · XSS المخزَّن · قائمةُ المزامنة · CSP بلا unsafe · التحصين · التفويض · الحماية · المصفوفة · العدائية …
     ⑤ Preview (من سجلّ التحقق): الرؤوس · CSP بـnonce لكل طلب بلا unsafe-inline/eval · 401 بلا جلسة · ping بلا أعداد.
     ⑥ نموذجُ التهديد: كلُّ اختبارٍ مثبِتٍ مُشارٍ إليه موجود (tests/source/docs_check.py).
     ⑦ بنودُ المرجع الأمنية (security: true) غيرُ المكتملة — بحالتها وسببها.
   الحكم: PASS ⇔ ①–⑥ ناجحة ولا ثغرةَ حرجة/عالية في ما يُشحن. وحالةُ Production تُذكر منفصلة (لا تُمسّ قبل الاعتماد)."""
import os, re, sys, json, glob, subprocess, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = sys.argv[1:]
def opt(n, d=None): return A[A.index(n) + 1] if n in A else d
def opts(n): return [A[i + 1] for i, x in enumerate(A) if x == n and i + 1 < len(A)]
PK = os.path.join(ROOT, opt('--pk', 'pk265')); GATES = [os.path.join(ROOT, g) for g in opts('--gate')]; PREV = opt('--preview')
run = lambda cmd, **k: subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, **k)
R = {'date': datetime.date.today().isoformat(), 'pk': os.path.relpath(PK, ROOT), 'sections': []}
def sec(key, title, ok, detail, items=None):
    R['sections'].append({'key': key, 'title': title, 'ok': bool(ok), 'detail': detail, 'items': items or []}); print(('  ✔ ' if ok else '  ✘ ') + title + ' — ' + detail[:200])
# ① الأسرار
ss = run([sys.executable, 'tools/sec/secrets_scan.py', os.path.relpath(PK, ROOT)])
sec('secrets', '① الأسرار', ss.returncode == 0, ss.stdout.strip().split('\n')[0])
# ② الاعتماديات
dep = {}
for name, d in (('root (أدواتُ البناء والفحص)', ROOT), ('cfbench (عُدّةُ الاختبار المحلي)', os.path.join(ROOT, 'cfbench'))):
    r = subprocess.run(['npm', 'audit', '--json'], cwd=d, capture_output=True, text=True)
    try: j = json.loads(r.stdout or '{}')
    except Exception: j = {}
    v = (j.get('metadata') or {}).get('vulnerabilities') or {}
    dep[name] = {'counts': v, 'items': [{'name': n, 'severity': x.get('severity'), 'via': [y.get('title') if isinstance(y, dict) else y for y in x.get('via', [])][:3], 'fix': x.get('fixAvailable')} for n, x in (j.get('vulnerabilities') or {}).items()],
                 'error': (j.get('error') or {}).get('summary') if isinstance(j.get('error'), dict) else None}
sb = os.path.join(ROOT, 'docs', 'compliance', 'sbom', 'runtime.cdx.json')
if not os.path.exists(sb): sb = os.path.join(ROOT, 'sbom', 'runtime.cdx.json')
runtime = [c.get('name') + '@' + str(c.get('version')) for c in (json.load(open(sb, encoding='utf-8')).get('components') or [])] if os.path.exists(sb) else []
# ما يُشحن: مكوّناتُ SBOM runtime المضمَّنة (مورَّدة لا اعتماديةَ npm) — تُدقَّق بإصداراتها الدقيقة في سجلّ npm advisories: حزمةٌ مؤقتة بها وحدها ثم npm audit
import tempfile
shipped = {c['name']: c['version'] for c in (json.load(open(sb, encoding='utf-8')).get('components') or []) if str(c.get('purl', '')).startswith('pkg:npm/') and re.match(r'^\d+\.\d+\.\d+$', str(c.get('version', '')))} if os.path.exists(sb) else {}
td = tempfile.mkdtemp(prefix='kivo_ship_'); json.dump({'name': 'kivo-shipped', 'version': '1.0.0', 'private': True, 'dependencies': shipped}, open(os.path.join(td, 'package.json'), 'w'))
i1 = subprocess.run(['npm', 'install', '--package-lock-only', '--ignore-scripts', '--no-fund'], cwd=td, capture_output=True, text=True)
i2 = subprocess.run(['npm', 'audit', '--json'], cwd=td, capture_output=True, text=True)
try: sj = json.loads(i2.stdout or '{}')
except Exception: sj = {}
sv = (sj.get('metadata') or {}).get('vulnerabilities') or {}
shipChecked = i1.returncode == 0 and bool(sj.get('metadata'))
shipHigh = int(sv.get('high', 0)) + int(sv.get('critical', 0)) if shipChecked else None
devHigh = sum(int((x['counts'] or {}).get('high', 0)) + int((x['counts'] or {}).get('critical', 0)) for x in dep.values())
sec('deps', '② الاعتماديات', shipHigh == 0, 'ما يُشحن (' + ', '.join(k + '@' + v for k, v in shipped.items()) + ' — npm advisories: ' + (json.dumps({k: v for k, v in sv.items() if v}) if shipChecked else 'تعذّر الفحص') + ' · وبقيةُ SBOM runtime: ' + ', '.join(x for x in runtime if x.split('@')[0] not in shipped) + ') · أدواتُ التطوير/الاختبار (لا تُشحن): ' +
    ' · '.join(n + ' ' + json.dumps({k: v for k, v in (x['counts'] or {}).items() if v}, ensure_ascii=False) for n, x in dep.items()), [dict(scope=n, **i) for n, x in dep.items() for i in x['items']])
# ③ اختباراتُ الأمن في الوحدة
UNIT = ['rm1_failclosed', 'rm1_testapi_guard', 'rm1_ping', 'ph_exfil', 'csp_nonce', 'csrf', 'csrf_origin', 'rate_limits', 'rate_policy', 'session_lifecycle', 'adversarial', 'pw_upgrade_rev', 'integrity', 'key_decisions', 'plugins']
files = [os.path.join('tests/unit', u + '.test.mjs') for u in UNIT if os.path.exists(os.path.join(ROOT, 'tests/unit', u + '.test.mjs'))]
ur = run(['node', '--no-warnings', '--test'] + files, env=dict(os.environ, KIVO_WORKER=os.path.join(PK, '_worker.js'), KIVO_DIST=PK))
m = re.search(r'# pass (\d+)\n# fail (\d+)', ur.stdout)
sec('unit', '③ اختباراتُ الأمن في الوحدة (' + str(len(files)) + ' ملفاً على عامل الحزمة)', bool(m) and m.group(2) == '0', (m.group(0).replace('\n', ' · ') if m else ur.stdout[-200:]), [os.path.basename(f) for f in files])
# ④ حزمُ الأمن في البوابة
SECRX = re.compile(r'(أمن|الأمن|XSS|CSP|المزامنة|التحصين|إحكام|التفويض|الحماية|الإنفاذ|المصفوفة|الحرّاس|العدائي|ثغر|AUD-00[1-6]|AUD-03[3-6]|RM-1|الجلسة|الدخول|المعدّل|كلمة المرور|البصمات|سلامةُ|الحساب)')
gl = []
for g in GATES:
    if not os.path.exists(g): continue
    for line in open(g, encoding='utf-8').read().split('\n'):
        if SECRX.search(line) and ('النتيجة' in line or line.rstrip().endswith('FAIL')):
            mm = re.search(r'نجح (\d+) \| أخفق (\d+)', line) or re.search(r'(\d+) نجاح · (\d+) إخفاق', line)   # KIVO_260: الصيغتان (كانت ثلاثُ حزمٍ بلا عدد — scorecard_final §٤ بند 8)
            gl.append({'suite': re.split(r'══|FAIL|\s{3,}', line)[0].strip()[:90], 'pass': int(mm.group(1)) if mm else None, 'fail': int(mm.group(2)) if mm else ('FAIL' if line.rstrip().endswith('FAIL') else None), 'log': os.path.relpath(g, ROOT)})
last = {}
for x in gl: last[x['suite']] = x                                         # الجولةُ اللاحقة (استئناف) تحسم
bad = [x for x in last.values() if x['fail'] not in (0, None)]
sec('gate', '④ حزمُ الأمن في البوابة (' + str(len(last)) + ' حزمة · ' + str(sum(x['pass'] or 0 for x in last.values())) + ' تأكيداً)', bool(last) and not bad, 'مخفقة: ' + str(len(bad)), list(last.values()))
# ⑤ Preview
pv = json.load(open(os.path.join(ROOT, PREV), encoding='utf-8')) if PREV and os.path.exists(os.path.join(ROOT, PREV)) else None
if pv:
    o = pv.get('anon') or pv
    c = o.get('csp') or {}; h = o.get('secHeaders') or {}; az = o.get('authzAnon') or {}; pg = o.get('pingAnon') or {}; n = o.get('noncePerRequest') or {}
    okp = c.get('hasNonce') and c.get('noUnsafeInline') and c.get('noUnsafeEval') and n.get('differ') and h.get('xcto') == 'nosniff' and h.get('hsts') and az.get('authz') == 401 and az.get('whoami') == 401 and not pg.get('hasUsers')
    sec('preview', '⑤ Preview (' + os.path.basename(PREV) + ')', okp, 'CSP nonce لكل طلب · بلا unsafe-inline/eval · nosniff · HSTS · 401 بلا جلسة · ping بلا أعداد')
else:
    sec('preview', '⑤ Preview', False, 'لا سجلَّ تحقق (--preview)')
# ⑥ نموذجُ التهديد
dc = run([sys.executable, 'tests/source/docs_check.py'])
line = [l for l in dc.stdout.split('\n') if 'نموذجُ التهديد' in l]
sec('threat', '⑥ نموذجُ التهديد', bool(line) and line[0].strip().startswith('✔'), (line[0].strip() if line else dc.stdout[-160:])[:200])
# ⑦ بنودُ المرجع الأمنية
S = json.load(open(os.path.join(ROOT, 'docs', 'sot', 'KIVO_MASTER_REQUIREMENTS_v6.json'), encoding='utf-8'))
open_sec = [{'id': x['id'], 'title': x['title'], 'priority': x['priority'], 'status': x['status'], 'next': x.get('next', '')} for x in S['DATA'] if x.get('security') and x['status'] != 'مكتمل']
R['sections'].append({'key': 'sot', 'title': '⑦ بنودُ المرجع الأمنية غيرُ المكتملة', 'ok': None, 'detail': str(len(open_sec)) + ' بنداً', 'items': open_sec}); print('  · ⑦ بنودٌ أمنية مفتوحة: ' + str(len(open_sec)))
verdict = all(s['ok'] for s in R['sections'] if s['ok'] is not None)
R['verdict'] = 'PASS' if verdict else 'FAIL'
os.makedirs(os.path.join(ROOT, 'reports'), exist_ok=True)
json.dump(R, open(os.path.join(ROOT, 'reports', 'security_audit.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
L = ['# التدقيقُ الأمني النهائي — SOT-165', '', '> مولَّدٌ بـ`python3 tools/sec/audit.py` من الأدلة (الحزمة `' + R['pk'] + '` · سجلاتُ البوابة · سجلُّ تحقق Preview) — ' + R['date'] + '.', '',
     '**الحكم: ' + R['verdict'] + '** — ' + ('كلُّ الأقسام ①–⑥ ناجحة ولا ثغرةَ حرجة/عالية في ما يُشحن.' if verdict else 'قسمٌ أو أكثر لم ينجح (أدناه).'), '']
for s in R['sections']:
    L += ['## ' + s['title'] + (' — ' + ('✔' if s['ok'] else '✘') if s['ok'] is not None else ''), '', s['detail'], '']
    if s['key'] == 'deps' and s['items']:
        L += ['| النطاق | الحزمة | الخطورة | المصدر | الإصلاح |', '|---|---|---|---|---|'] + ['| ' + ' | '.join([i['scope'], i['name'], str(i['severity']), '؛ '.join(str(v) for v in i['via'])[:120], str(i['fix'])[:60]]) + ' |' for i in s['items']] + ['']
    if s['key'] == 'gate' and s['items']:
        L += ['| الحزمة | نجح | أخفق | السجل |', '|---|---|---|---|'] + ['| ' + ' | '.join([str(i['suite']), str(i['pass']), str(i['fail']), i['log']]) + ' |' for i in s['items']] + ['']
    if s['key'] == 'sot' and s['items']:
        L += ['| البند | العنوان | الأولوية | الحالة | التالي |', '|---|---|---|---|---|'] + ['| ' + ' | '.join([i['id'], i['title'][:60], i['priority'], i['status'], (i['next'] or '')[:90]]) + ' |' for i in s['items']] + ['']
L += ['## Production (منفصلة — لا تُمسّ قبل الاعتماد النهائي)', '',
      '- KIVO_242 منشورة. ثغرةُ AUD-033 (بصماتُ كلمات المرور لغير مدير النظام عبر denied/conflicts.cur) **قائمةٌ فيها** حتى يُنشر الإصلاح:',
      '  حزمةُ `hotfix/KIVO_242_HOTFIX_AUD033/` جاهزةٌ غيرُ منشورة، والمرشّحُ الحالي يحمل الإصلاح. بعد أيّ نشرٍ معتمد: **تدويرُ كلمات المرور** (البصماتُ ربما كُشفت).', '']
open(os.path.join(ROOT, 'docs', 'security-audit.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(('✔' if verdict else '✘') + ' التدقيقُ الأمني: ' + R['verdict'] + ' → docs/security-audit.md · reports/security_audit.json')
sys.exit(0 if verdict else 1)
