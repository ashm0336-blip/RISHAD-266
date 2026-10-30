# -*- coding: utf-8 -*-
"""KIVO_252 · RM-5 (SOT-137 · AUD-034/035) — إثباتُ الفرق بالضبط عن KIVO_251 (الوسم git KIVO_251 · Python · بلا خادم):
   (أ) الشجرةُ المتتبَّعة = KIVO_251 بايتاً عدا: 270-bs-ver · workers/_worker.js · أجزاء 002 (WORKER_VER) · 051 (usersSessStmts) · 054 (استدعاؤها في الحفظ) · 056 (ENF_VER) · 063 (A1.tok)
       + ما يُضاف من اختبارات/وثائق (tests/ docs/ CHANGELOG — تُعلن)
   (ب) كلُّ جزءٍ متغيّر = جزءُ 251 بعد عكس التحويل المعلن وحده
   (ج) المشتقّات (20) = مصادرها · الخادم = ضمُّ الأجزاء · لا catch فارغاً
   (د) الحزمة pk252 = pk251 الخاصة عدا الإصدار و_worker.js · بناءٌ حتمي · نافذةُ الإصدارين
       python3 tests/source/k252src.py [pk252]"""
import os, sys, hashlib, subprocess, tempfile, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.abspath(os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else 'pk252'))
PREV_PK = os.environ.get('KIVO_PREV_PK', os.path.join(os.path.dirname(ROOT), 'h', 'pk251'))
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rb = lambda p: open(p, 'rb').read(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
gitb = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, cwd=ROOT).stdout
tmp = tempfile.mkdtemp(prefix='k252src_')
TAG = 'KIVO_251'
print('╔═ (أ) الشجرةُ = KIVO_251 عدا الملفات المعلنة ═╗')
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
def blob(path):   # بصمةُ git للملف على القرص (كما يراه الوسم)
    return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q}   # المتتبَّع على القرص (الجديدُ غيرُ المتتبَّع يُعلَن أدناه)
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
CODE = ['src/core/270-bs-ver.js', 'workers/_worker.js', 'workers/parts/002-seclog.js', 'workers/parts/051-audit-diff.js', 'workers/parts/054-image-contract.js', 'workers/parts/056-enforce.js', 'workers/parts/063-enf-api-and-handler.js']
NEW_OK = ('src/schemas/', 'tools/validate_schemas.py', 'tools/generate.py')   # مخطّطاتُ JSON (SOT-101) + مُحقِّقُها + ربطُه في generate --check — أدواتٌ لا كودَ منصة
diff = [k for k in diff if not k.startswith(NEW_OK)]; untracked = [k for k in untracked if not k.startswith(NEW_OK)]
ok(diff == CODE and not untracked, '★ ملفاتُ الكود المتغيّرة عن الوسم KIVO_251 (على القرص) = السبعة المعلنة فقط · لا ملفَّ كودٍ جديداً (عدا src/schemas المعلنة)', json.dumps([x for x in diff if x not in CODE][:6] + ['missing:' + x for x in CODE if x not in diff] + ['new:' + x for x in untracked][:4]))
ok(sorted(f for f in os.listdir(os.path.join(ROOT, 'src/schemas')) if f.endswith('.json')) == ['blocks.schema.json', 'layout.schema.json', 'pages.schema.json', 'tokens.schema.json'], '   src/schemas: المخطّطاتُ الأربعة')
rg0 = subprocess.run([sys.executable, ROOT + '/tools/validate_schemas.py', ROOT + '/src'], capture_output=True, text=True); ok(rg0.returncode == 0, '   المخطّطاتُ تمرّ على ملفات الإعداد', rg0.stdout.strip().splitlines()[-1][:100] if rg0.stdout else rg0.stderr[:100])
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'window.__BS_VER = "2026.10.10-252";', '   الإصدار 2026.10.10-252')
print('\n╔═ (ب) عكسُ التحويلات المعلنة يعيد أجزاءَ 251 حرفاً ═╗')
SESS = re.compile(r"/\* KIVO_252 · AUD-034/035 \(SOT-137\).*?\n\}\n", re.S)
def revert(name, t):
    if name == '002-seclog.js': t = t.replace("var WORKER_VER = '2026.10.10-152';", "var WORKER_VER = '2026.10.09-151';", 1)
    if name == '051-audit-diff.js': t = SESS.sub('', t)
    if name == '054-image-contract.js': t = t.replace(" st = st.concat(usersSessStmts(env, parseJson(cur, []), parseJson(v, []), A.u.id, A.tok || '')); }   /* KIVO_252 · AUD-034/035 */", "", 1).replace("    if (k === K_USERS) { usersSecEvents(", "    if (k === K_USERS) usersSecEvents(", 1)
    if name == '056-enforce.js': t = t.replace("var ENF_VER = 'KIVO_252 · enforce 2 (fail-closed · host-guard · ph-strip · schema · logs · sess)';", "var ENF_VER = 'KIVO_251 · enforce 2 (fail-closed · host-guard · ph-strip · schema · logs)';", 1)
    if name == '063-enf-api-and-handler.js': t = re.sub(r"          A1\.tok = ss\.tok;[^\n]*\n", '', t)
    return t
allok = True
for p in ['002-seclog.js', '051-audit-diff.js', '054-image-contract.js', '056-enforce.js', '063-enf-api-and-handler.js']:
    r = revert(p, rd(ROOT + '/workers/parts/' + p)); o = gitb('show', TAG + ':workers/parts/' + p).decode('utf-8')
    if r != o:
        allok = False; import difflib; d = [l for l in difflib.unified_diff(o.split('\n'), r.split('\n'), lineterm='', n=0) if l.startswith(('+', '-')) and not l.startswith(('+++', '---'))]
        print('     ✘ ' + p + ': ' + ' ‖ '.join(x[:110] for x in d[:4]))
ok(allok, '★ 5 أجزاء: عكسُ التحويلات المعلنة = أجزاءُ 251 حرفاً')
w = rd(ROOT + '/workers/_worker.js')
ok('function usersSessStmts(env, a, b, actorUid, actorTok)' in w and w.count('usersSessStmts(') == 2 and 'A1.tok = ss.tok;' in w, '   الدالةُ الجديدة واستدعاؤها الوحيد ومرورُ الرمز')
print('\n╔═ (ج) المشتقّاتُ والخادم ═╗')
rg = subprocess.run([sys.executable, ROOT + '/tools/generate.py', '--src', ROOT + '/src', '--check'], capture_output=True, text=True)
ok(rg.returncode == 0 and 'all 20' in rg.stdout, '★ 20 مشتقاً = مصادرها بايتاً')
ok(w == ''.join(rd(ROOT + '/workers/parts/' + p['file']) for p in json.load(open(ROOT + '/workers/parts.json', encoding='utf-8'))['parts']), '   الخادم = ضمُّ الأجزاء (65)')
ok(not re.search(r'catch \(\w*\) \{\s*\}', w), '   لا catch فارغاً')
print('\n╔═ (د) الحزمة ═╗')
def own(d):
    bj = json.load(open(d + '.build.json', encoding='utf-8')); ret = set(bj.get('retainedFiles', [])); return {k: v['sha256'] for k, v in bj['files'].items() if k not in ret}
stem = lambda f: re.sub(r'\.[0-9a-f]{10}\.(js|css|dc\.txt)$', r'.\1', f)
if os.path.exists(PREV_PK + '.build.json'):
    O0, O1 = own(PREV_PK), own(DIR); S0 = {stem(k): k for k in O0}; S1 = {stem(k): k for k in O1}
    changed = sorted(s for s in S0 if s in S1 and O0[S0[s]] != O1[S1[s]])
    ok(sorted(S0) == sorted(S1) and changed == ['_worker.js', 'assets/js/270-bs-ver.js', 'index.html'], '★ أصولُ 252 الخاصة = أصولُ 251 عدا الإصدار و_worker.js وindex.html (مرجعُ الإصدار)', json.dumps(changed))
    h0 = rd(PREV_PK + '/index.html'); h1 = rd(DIR + '/index.html')
    ok(re.sub(r'270-bs-ver\.[0-9a-f]{10}\.js', 'V', h0) == re.sub(r'270-bs-ver\.[0-9a-f]{10}\.js', 'V', h1), '   index.html: مرجعُ الإصدار وحده')
else: print('   (pk251 غيرُ متاح هنا — المقارنةُ بالحزمة السابقة تُجرى في مجلد العمل الرئيس)')
def retain_path(r): return os.path.join(ROOT, r) if os.path.exists(os.path.join(ROOT, r)) else os.path.join(os.path.dirname(PREV_PK), r)
r2 = subprocess.run([sys.executable, ROOT + '/build/build.py', '--src', ROOT + '/src', '--mode', 'split', '--pages', 'lazy', '--out', tmp + '/dist2'] + sum([['--retain', retain_path(r)] for r in json.load(open(DIR + '.build.json'))['retained']], []), capture_output=True, text=True, cwd=ROOT)
def walk(d):
    out = {}
    for base, dirs, files in os.walk(d):
        for f in files: p = os.path.join(base, f); out[os.path.relpath(p, d)] = sha(rb(p))
    return out
ok(r2.returncode == 0 and walk(tmp + '/dist2') == walk(DIR), '★ إعادةُ البناء حتمية (' + str(len(walk(DIR))) + ' ملفاً)', (r2.stdout or r2.stderr).strip()[-120:])
rc = subprocess.run([sys.executable, ROOT + '/scripts/empty_catch_ratchet.py', ROOT + '/src'], capture_output=True, text=True); ok(rc.returncode == 0, '★ سقّاطةُ catch الفارغ', (rc.stdout or rc.stderr).strip().splitlines()[0][:120])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
