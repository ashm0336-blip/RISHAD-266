# -*- coding: utf-8 -*-
"""KIVO_258 · SOT-124/143 — المراقبةُ معرَّفةٌ مركزياً ومتّسقةٌ مع العامل، والمقاييسُ قابلةٌ للحساب:
   (أ) كلُّ حدثٍ يكتبه العامل (logEv في workers/parts) معرَّفٌ في src/observability/events.json بمستواه، وحقولُه ⊆ المعرَّفة · ولا تعريفَ ميتاً
   (ب) المقاييسُ تشير إلى أحداثٍ معرَّفة · التنبيهاتُ تشير إلى مقاييسَ معرَّفة وإلى أدلةٍ تشغيلية موجودة · وdocs/observability.md يذكر كلَّ حدث
   (ج) tools/obs/metrics_report.py على سجلٍّ اصطناعيٍّ معلوم: الأعدادُ والنِّسَبُ والمئينات صحيحة · التنبيهاتُ تُطلق حين يجب ولا تُطلق حين لا يجب
       python3 tests/source/obs_check.py"""
import os, re, sys, json, glob, subprocess, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:400]) if x else ''))
D = json.load(open(os.path.join(ROOT, 'src/observability/events.json'), encoding='utf-8'))
print('╔═ (أ) العاملُ ↔ التعريفُ المركزي ═╗')
emit = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'workers/parts/*.js'))):
    t = open(f, encoding='utf-8').read()
    for m in re.finditer(r"logEv\('(info|warn|error)', '([a-z0-9-]+)'(?:, \{((?:[^{}]|\{[^{}]*\})*)\})?", t):
        lvl, ev, body = m.group(1), m.group(2), m.group(3) or ''
        fields = re.findall(r'(?:^|,)\s*([a-z][A-Za-z0-9]*)\s*:', body)
        emit.setdefault(ev, {'lvl': set(), 'fields': set(), 'at': os.path.basename(f)}); emit[ev]['lvl'].add(lvl); emit[ev]['fields'].update(fields)
ok(len(emit) >= 13, 'أحداثُ العامل: ' + str(len(emit)) + ' — ' + ' · '.join(sorted(emit)))
undef = sorted(e for e in emit if e not in D['events'])
ok(not undef, '★ كلُّ حدثٍ يكتبه العامل معرَّفٌ مركزياً', json.dumps(undef))
lvlbad = sorted(e for e in emit if e in D['events'] and emit[e]['lvl'] != {D['events'][e]['lvl']})
ok(not lvlbad, '★ والمستوى نفسُه', json.dumps({e: sorted(emit[e]['lvl']) for e in lvlbad}))
fbad = {e: sorted(emit[e]['fields'] - set(D['events'][e]['fields'])) for e in emit if e in D['events'] and emit[e]['fields'] - set(D['events'][e]['fields'])}
ok(not fbad, '★ وحقولُه ⊆ المعرَّفة (لا حقلَ غيرَ معلن — ولا بياناتٍ شخصية تتسلّل)', json.dumps(fbad, ensure_ascii=False))
dead = sorted(e for e in D['events'] if e not in emit)
ok(not dead, '   لا تعريفَ ميتاً (كلُّ حدثٍ معرَّف يكتبه العامل)', json.dumps(dead))
PII = {'un', 'uid', 'ip', 'name', 'pw', 'phone', 'nid', 'email', 'v', 'val', 'value', 'key', 'k'}
leak = {e: sorted(set(D['events'][e]['fields']) & PII) for e in D['events'] if set(D['events'][e]['fields']) & PII}
ok(not leak, '★ لا حقلَ هويةٍ أو قيمةٍ في أيّ حدث (سياسةُ السجلّ v1)', json.dumps(leak))
print('\n╔═ (ب) المقاييسُ والتنبيهاتُ والوثائق ═╗')
mids = {m['id'] for m in D['metrics']}
mref = [m['id'] for m in D['metrics'] for s in ([m['from']] if isinstance(m['from'], str) else m['from']) if s not in D['events']]
ok(not mref, 'كلُّ مقياسٍ يُحسب من أحداثٍ معرَّفة (' + str(len(mids)) + ' مقياساً)', json.dumps(mref))
aref = [a['id'] for a in D['alerts'] if a['metric'] not in mids or not os.path.exists(os.path.join(ROOT, a['runbook']))]
ok(not aref and len(D['alerts']) >= 5, '★ كلُّ تنبيهٍ على مقياسٍ معرَّف ومعه دليلٌ تشغيليٌّ موجود (' + str(len(D['alerts'])) + ')', json.dumps(aref))
doc = open(os.path.join(ROOT, 'docs/observability.md'), encoding='utf-8').read()
nodoc = sorted(e for e in D['events'] if '`' + e + '`' not in doc)
ok(not nodoc, '   docs/observability.md يذكر كلَّ حدث', json.dumps(nodoc))
print('\n╔═ (ج) حسابُ المقاييس على سجلٍّ معلوم ═╗')
tmp = tempfile.mkdtemp(prefix='k258obs_'); L = os.path.join(tmp, 'log.ndjson')
import datetime
t0 = datetime.datetime(2026, 10, 10, 12, 0, 0, tzinfo=datetime.timezone.utc)
iso = lambda s: (t0 + datetime.timedelta(seconds=s)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
lines = []
for i in range(100): lines.append({'v': 1, 't': iso(i * 3), 'lvl': 'info', 'ev': 'req', 'ver': 'x', 'rid': 'r%d' % i, 'm': 'GET', 'p': '/api/get' if i % 2 else '/api/changes', 'st': 500 if i < 2 else (403 if i < 5 else 200), 'dur': i + 1})
lines.append({'v': 1, 't': iso(10), 'lvl': 'error', 'ev': 'worker-error', 'ver': 'x', 'rid': 'r0', 'st': 500})
lines.append({'v': 1, 't': iso(400), 'lvl': 'warn', 'ev': 'swallowed', 'ver': 'x', 'op': 'touch'})
with open(L, 'w', encoding='utf-8') as f:
    f.write('noise line from runtime\n')
    for o in lines: f.write('[wrangler:info] ' + json.dumps(o, ensure_ascii=False, separators=(',', ':')) + '\n')   # كما JSON.stringify في العامل
r = subprocess.run([sys.executable, 'tools/obs/metrics_report.py', L, '--json', os.path.join(tmp, 'm.json'), '--html', os.path.join(tmp, 'm.html')], cwd=ROOT, capture_output=True, text=True)
M = json.load(open(os.path.join(tmp, 'm.json'), encoding='utf-8')) if os.path.exists(os.path.join(tmp, 'm.json')) else {}
mm = M.get('metrics', {}); al = {a['id']: a for a in M.get('alerts', [])}
ok(r.returncode == 0 and M.get('lines') == 102, 'التقرير يقرأ أسطرَ المخطّط v1 وسط الضجيج (102 سطراً)', (r.stdout + r.stderr)[-300:])
ok(mm.get('req_rate', {}).get('total') == 100 and mm.get('error_ratio', {}).get('n') == 2 and abs(mm['error_ratio']['ratio'] - 0.02) < 1e-9 and mm.get('denied_ratio', {}).get('n') == 3,
   '★ الطلبات 100 · الأخطاء 2 (2٪) · الرفض 3 — بالحساب', json.dumps({k: mm.get(k) for k in ('req_rate', 'error_ratio', 'denied_ratio')})[:200])
lt = mm.get('latency', {})
ok(lt.get('p50') == 50 and lt.get('p95') == 95 and lt.get('p99') == 99 and lt.get('max') == 100 and set(lt.get('byPath', {})) == {'/api/get', '/api/changes'},
   '★ الكمون: p50 50 · p95 95 · p99 99 · max 100 (المئينُ الأعلى الأقرب) · ولكل مسار', json.dumps({k: lt.get(k) for k in ('p50', 'p95', 'p99', 'max')}))
ok(mm.get('server_errors') == 1 and mm.get('swallowed_errors') == {'touch': 1} and mm.get('unknownEvents') == [], '   أخطاءُ الخادم 1 · المبتلَع {touch: 1} · لا حدثَ مجهول')
ok(al.get('A1', {}).get('fired') is True and al.get('A2', {}).get('fired') is False and al.get('A3', {}).get('fired') is False and al.get('A5', {}).get('fired') is False and al.get('A4', {}).get('fired') is False,
   '★ التنبيهات: A1 (الأخطاء > 1٪ في 5 د) أُطلق · A2 A3 A4 A5 هادئة', json.dumps({k: [v['fired'], v['value']] for k, v in al.items()}))
ok(os.path.exists(os.path.join(tmp, 'm.html')) and 'صحةُ المنصة' in open(os.path.join(tmp, 'm.html'), encoding='utf-8').read(), '   صفحةُ الصحة HTML تُولَّد (لوحةٌ مستقلة)')
import shutil; shutil.rmtree(tmp, ignore_errors=True)
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
