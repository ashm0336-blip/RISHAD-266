# -*- coding: utf-8 -*-
"""KIVO_251 · ADR-012 (SOT-080/081/… الشجرةُ المستهدفة) — إثباتُ أن إعادة الهيكلة نقلٌ لا تغيير (Python · بلا خادم):
   (أ) إعادةُ تطبيق tools/restructure.py على k250/src في مجلدٍ مؤقت = الشجرةُ المُلتزَمة (src/ public/ workers/ migrations/ config/) بايتاً —
       عدا أسطر الإصدار الثلاثة (WORKER_VER 151 · ENF_VER · __BS_VER 251) والمشتقِّ الذي يحملها (workers/_worker.js) وملفات README البنيوية
   (ب) كلُّ ملفٍ في الشجرة الجديدة = ملفُه الأصلي في k250/src بايتاً (عدا الخمسةِ التي يعدّلها النقلُ نصاً: blocks.json · القالب · targets.json · parts.json · الإصدار)،
       وتعديلُها = استبدالُ المسارات بالخريطة لا غير
   (ج) الأدواتُ الجديدة (build/build.py · tools/generate.py · tools/tokens.py) على التخطيط القديم k250/src تُخرج pk250 والمشتقّات بايتاً (لا تغييرَ في السلوك)
   (د) الحزمة pk251 = pk250 بايتاً عدا الفروق المعلنة: الإصدارُ في 270-bs-ver و_worker.js · سطرُ تعليقٍ يذكر مسارَ المصدر في root-logic والـ14 ملفَّ منطق (فتتغيّر بصماتُها)
       وما يشير إليها في index.html · بناءٌ حتمي · نافذةُ الإصدارين (pk250 · pk249)
       python3 tests/source/k251src.py [pk251]"""
import os, sys, hashlib, subprocess, tempfile, json, re, shutil
ROOT = '/home/claude/kivo/h'
DIR = os.path.abspath(os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else 'pk251'))
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rb = lambda p: open(p, 'rb').read(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
tmp = tempfile.mkdtemp(prefix='k251src_')
def walk(d, skip=()):
    out = {}
    for base, dirs, files in os.walk(d):
        dirs[:] = [x for x in dirs if x not in skip and x != '__pycache__']
        for f in files: p = os.path.join(base, f); out[os.path.relpath(p, d)] = sha(rb(p))
    return out
TREE = ['src', 'public', 'workers', 'migrations', 'config']
VER = {'workers/parts/002-seclog.js': ("var WORKER_VER = '2026.10.09-151';", "var WORKER_VER = '2026.10.09-150';"),
       'workers/parts/056-enforce.js': ("var ENF_VER = 'KIVO_251 · enforce 2 (fail-closed · host-guard · ph-strip · schema · logs)';", "var ENF_VER = 'KIVO_250 · enforce 2 (fail-closed · host-guard · ph-strip · schema · logs)';"),
       'src/core/270-bs-ver.js': ('window.__BS_VER = "2026.10.09-251";', 'window.__BS_VER = "2026.10.09-250";')}
print('╔═ (أ) إعادةُ تطبيق النقل على k250/src = الشجرةُ المُلتزَمة ═╗')
# نسخةٌ من المستودع (الأدوات + k250/src فقط) في مجلد مؤقت ثم النقل فيه
T = tmp + '/repo'; os.makedirs(T + '/tools'); shutil.copytree(ROOT + '/k250/src', T + '/k250/src'); shutil.copy(ROOT + '/tools/restructure.py', T + '/tools/'); shutil.copy(ROOT + '/tools/restructure_map.json', T + '/tools/')
r = subprocess.run([sys.executable, T + '/tools/restructure.py', 'k250/src'], capture_output=True, text=True, cwd=T)
ok(r.returncode == 0, '   النقلُ يعمل في مستودعٍ مؤقت', (r.stdout + r.stderr)[-150:])
A = {}; B = {}
for d in TREE: A.update({d + '/' + k: v for k, v in walk(T + '/' + d).items()}); B.update({d + '/' + k: v for k, v in walk(ROOT + '/' + d).items()})
diff = sorted(k for k in set(A) | set(B) if A.get(k) != B.get(k))
EXPECT = sorted(list(VER) + ['workers/_worker.js'])
ok(diff == EXPECT, '★ الفرقُ بين النقل المُعاد والشجرة المُلتزَمة = أسطرُ الإصدار الثلاثة + المشتقُّ الحامل لها فقط', json.dumps([x for x in diff if x not in EXPECT][:6] + ['missing:' + x for x in EXPECT if x not in diff]))
for f, (new, old) in VER.items():
    cur = rd(ROOT + '/' + f); ok(cur.replace(new, old, 1) == rd(T + '/' + f), '   ' + f + ': سطرُ الإصدار وحده')
rgen = subprocess.run([sys.executable, ROOT + '/tools/generate.py', '--src', T + '/src', '--check'], capture_output=True, text=True)
ok(rgen.returncode == 0 and 'all 20' in rgen.stdout, '   المشتقّاتُ في الشجرة المُعادة = مصادرها (20) — فـ_worker.js المختلف يختلف بأسطر الإصدار وحدها', rgen.stdout.strip()[-80:])
ok(rd(ROOT + '/workers/_worker.js') == ''.join(rd(ROOT + '/workers/parts/' + p['file']) for p in json.load(open(ROOT + '/workers/parts.json', encoding='utf-8'))['parts']), '   workers/_worker.js = ضمُّ الأجزاء (65)')

print('\n╔═ (ب) كلُّ ملفٍ نُقل بايتاً عدا ما يعدّله النقلُ نصاً ═╗')
MAP = json.load(open(ROOT + '/tools/restructure_applied.json', encoding='utf-8'))['map']
TEXT = {'blocks.json', 'shell/index.template.html', 'registry/targets.json', 'workers/parts.json'}
moved_same = [o for o, n in MAP.items() if o not in TEXT and n not in VER and n != 'workers/_worker.js' and rb(ROOT + '/k250/src/' + o) == rb(ROOT + '/' + n)]
ok(len(moved_same) == len(MAP) - len(TEXT) - 3 - 1, '★ ' + str(len(moved_same)) + ' ملفاً نُقل بايتاً (من ' + str(len(MAP)) + ' · عدا 4 نصوصِ مسارات + 3 إصدار + المشتق)', str(len(MAP) - len(moved_same)))
old_ids = [b['id'] for b in json.load(open(ROOT + '/k250/src/blocks.json', encoding='utf-8'))['blocks']]; new_ids = [b['id'] for b in json.load(open(ROOT + '/src/blocks.json', encoding='utf-8'))['blocks']]
ok(all(MAP[o] == 'src/' + n for o, n in zip(old_ids, new_ids)) and len(old_ids) == len(new_ids) == 73, '   blocks.json: 73 معرّفاً بالخريطة وبالترتيب نفسِه')
bo = json.load(open(ROOT + '/k250/src/blocks.json', encoding='utf-8')); bn = json.load(open(ROOT + '/src/blocks.json', encoding='utf-8'))
for b in bo['blocks']: b['id'] = MAP[b['id']][4:]
bo['gateBlock'] = MAP[bo['gateBlock']][4:]
ok(bo == bn, '   blocks.json: ما عدا المعرّفات متطابق (assets · pages · counts · dcLogic …)')
tplo = rd(ROOT + '/k250/src/shell/index.template.html'); tpln = rd(ROOT + '/src/layouts/index.template.html')
ok(re.sub(r'@@KIVO_(BLOCK|INLINE):([^@]+)@@', lambda m: '@@KIVO_' + m.group(1) + ':' + MAP[m.group(2)][4:] + '@@', tplo) == tpln, '   القالب: 73 مرجعاً بالخريطة لا غير')

print('\n╔═ (ج) الأدواتُ الجديدة على التخطيط القديم = الناتجُ القديم بايتاً ═╗')
r5 = subprocess.run([sys.executable, ROOT + '/build/build.py', '--src', ROOT + '/k250/src', '--mode', 'split', '--pages', 'lazy', '--out', tmp + '/pk250b', '--retain', ROOT + '/pk249', '--retain', ROOT + '/pk248'], capture_output=True, text=True)
ok(r5.returncode == 0 and walk(tmp + '/pk250b') == walk(ROOT + '/pk250'), '★ build/build.py (layout-aware) على k250/src = pk250 بايتاً (119 ملفاً)')
r6 = subprocess.run([sys.executable, ROOT + '/tools/generate.py', '--src', ROOT + '/k250/src', '--check'], capture_output=True, text=True)
ok(r6.returncode == 0 and 'all 20' in r6.stdout, '   tools/generate.py على k250/src: 20 مشتقاً = المُلتزَم')
r7 = subprocess.run([sys.executable, ROOT + '/tools/tokens.py', 'verify', ROOT + '/src', ROOT + '/k250/src'], capture_output=True, text=True)
ok(r7.returncode == 0 and 'فاتح: 0 فرق · داكن: 0 فرق' in r7.stdout, '   tokens.py verify: الرموزُ في الشجرة الجديدة = 250 حرفاً')

print('\n╔═ (د) الحزمة pk251 = pk250 عدا الفروق المعلنة (أصولُ كل إصدار «الخاصة» — بلا المُبقى من نافذة الإصدارين) ═╗')
def own(d):
    bj = json.load(open(d + '.build.json', encoding='utf-8')); ret = set(bj.get('retainedFiles', []))
    return {k: v['sha256'] for k, v in bj['files'].items() if k not in ret}
O0, O1 = own(ROOT + '/pk250'), own(DIR)
stem = lambda f: re.sub(r'\.[0-9a-f]{10}\.(js|css|dc\.txt)$', r'.\1', f)
S0 = {stem(k): k for k in O0}; S1 = {stem(k): k for k in O1}
ok(sorted(S0) == sorted(S1) and len(O0) == len(O1), '★ أصولُ 251 الخاصة = أصولُ 250 الخاصة اسماً (بلا البصمات) · ' + str(len(O1)) + ' ملفاً', json.dumps(sorted(set(S0) ^ set(S1))[:6]))
changed = sorted(s for s in S0 if s in S1 and O0[S0[s]] != O1[S1[s]])
EXP = sorted(['assets/pages/' + n + '.logic.js' for n in set(re.sub(r'\.logic\.[0-9a-f]{10}\.js$', '', f).split('/')[-1] for f in O1 if '.logic.' in f)] + ['assets/js/root-logic.js', 'assets/js/030-pages-loader.js', 'assets/js/270-bs-ver.js', 'index.html', '_worker.js'])
ok(changed == EXP, '★ المتغيّر = 14 منطقَ صفحة + root-logic + محمِّلُ الصفحات (خريطةُ عناوينها) + الإصدار + index.html + _worker.js فقط (' + str(len(changed)) + ')', json.dumps([x for x in changed if x not in EXP][:5] + ['missing:' + x for x in EXP if x not in changed][:5]))
def norm_js(p):
    t = rd(p); t = re.sub(r'^/\* KIVO · (.+?) — منطقُ (الصفحة|الغلاف) مُصرَّفٌ عند البناء من [^*]*\*/', r'/* KIVO · \1 — منطق مُصرَّف */', t, count=1)
    return re.sub(r'\.logic\.[0-9a-f]{10}\.js', '.logic.HASH.js', t)
ok(all(norm_js(ROOT + '/pk250/' + S0[s]) == norm_js(DIR + '/' + S1[s]) for s in changed if s.endswith('.js') and s not in ('assets/js/270-bs-ver.js', '_worker.js')), '★ منطقُ الصفحات والغلاف والمحمِّل: متطابقةٌ حرفاً بعد توحيد سطر التعليق (مسارُ المصدر) ومراجع البصمات')
ok(rd(DIR + '/' + S1['assets/js/270-bs-ver.js']) == 'window.__BS_VER = "2026.10.09-251";', '   270-bs-ver: الإصدار 251')
w0 = rd(ROOT + '/pk250/_worker.js'); w1 = rd(DIR + '/_worker.js')
ok(w1.replace(VER['workers/parts/002-seclog.js'][0], VER['workers/parts/002-seclog.js'][1], 1).replace(VER['workers/parts/056-enforce.js'][0], VER['workers/parts/056-enforce.js'][1], 1) == w0, '   _worker.js: سطرا الإصدار وحدهما')
h0 = rd(ROOT + '/pk250/index.html'); h1 = rd(DIR + '/index.html')
norm_html = lambda t: re.sub(r'(root-logic|\.logic|030-pages-loader|270-bs-ver)\.[0-9a-f]{10}\.js', r'\1.HASH.js', t)
ok(norm_html(h0) == norm_html(h1), '   index.html: مراجعُ البصمات (المنطق · root-logic · المحمِّل · الإصدار) وحدها')
r2 = subprocess.run([sys.executable, ROOT + '/build/build.py', '--src', ROOT + '/src', '--mode', 'split', '--pages', 'lazy', '--out', tmp + '/dist2', '--retain', ROOT + '/pk250', '--retain', ROOT + '/pk249'], capture_output=True, text=True)
ok(r2.returncode == 0 and walk(tmp + '/dist2') == walk(DIR), '★ إعادةُ البناء حتمية (' + str(len(walk(DIR))) + ' ملفاً)', (r2.stdout or r2.stderr).strip()[-120:])
bj = json.load(open(DIR + '.build.json', encoding='utf-8')); ok(bj.get('retained') == ['pk250', 'pk249'], '   نافذةُ الإصدارين pk250 · pk249')
r3 = subprocess.run([sys.executable, ROOT + '/build/build.py', '--src', ROOT + '/src', '--mode', 'monolith', '--out', tmp + '/mono.html'], capture_output=True, text=True)
ok(r3.returncode == 0 and rb(tmp + '/mono.html') == rb(DIR + '.mono/index.html'), '   المونوليث حتمي')
rc = subprocess.run([sys.executable, ROOT + '/scripts/color_ratchet.py', ROOT + '/src'], capture_output=True, text=True); ok(rc.returncode == 0, '★ سقّاطةُ الألوان الخام: لا زيادة', (rc.stdout or rc.stderr).strip().splitlines()[0][:120])
re_ = subprocess.run([sys.executable, ROOT + '/scripts/empty_catch_ratchet.py', ROOT + '/src'], capture_output=True, text=True); ok(re_.returncode == 0, '★ سقّاطةُ catch الفارغ: لا زيادة · الخادم صفر', (re_.stdout or re_.stderr).strip().splitlines()[0][:140])
shutil.rmtree(tmp, ignore_errors=True)
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
