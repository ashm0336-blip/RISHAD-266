# -*- coding: utf-8 -*-
"""KIVO_255 · AUD-037 (لقطةُ المقدّمة) · SOT-130 (الرسمةُ الأولى) · SOT-139 (سقفُ الحفظ من السياسة) · SOT-143/149 (سطرُ الطلب · Server-Timing)
   · SOT-127 (العقود) · SOT-134 (السلامة) · AUD-023 (التهيئة) — إثباتُ الفرق بالضبط عن KIVO_254 (الوسم git؛ KIVO_PREV_TAG يبدّله).
   (أ) الشجرةُ المتتبَّعة = KIVO_254 بايتاً عدا الملفاتِ المعلنة (CODE) والجديدةِ المعلنة (NEW_OK)؛ لا ملفَّ كودٍ غيرَ متتبَّع.
   (ب) الخادم: ثوابتُ AUD-037 في مواضعها (preAttach في /api/* والغلاف · dbGuard يطفئ اللقطة · لمسُ الجلسة على القاعدة الخام بـwaitUntil ·
       مفاتيحُ الإنفاذ في اللقطة ببيئة الإنفاذ وحدها) · سطرُ الطلب وServer-Timing · سقفُ الحفظ من السياسة · نوافذُ rl: ليست أقفالاً · _worker.js = ضمُّ الأجزاء.
   (ج) الرموز: لا فرقَ في أيّ رمز عن KIVO_254 (255 لا يغيّر المظهر) — tokens.py verify بلا إعلان.
   (د) بصمةُ فرق كلّ ملفٍّ معلن (sha256 لناتج git diff عن الوسم) = المسجَّلةُ في k255diff.json بعد المراجعة؛ --freeze يعيد التسجيل عمداً.
   (هـ) المشتقّات = مصادرها · الفهرس · الإصدار 155/255 · لا catch فارغاً جديداً · مخطّطُ البيئة وwrangler.toml متّسقان · العقدُ = مساراتُ العامل.
       python3 tests/source/k255src.py [pk255] [--freeze]"""
import os, sys, hashlib, subprocess, tempfile, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk255'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_254')
FREEZE = '--freeze' in sys.argv
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')
print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا الملفات المعلنة ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   الوسمُ المرجعي ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
CODE = sorted(['src/core/270-bs-ver.js', 'workers/_worker.js', 'workers/parts/001-policy.js', 'workers/parts/002-seclog.js', 'workers/parts/052-aud-events.js',
               'workers/parts/054-image-contract.js', 'workers/parts/056-enforce.js', 'workers/parts/063-enf-api-and-handler.js',
               'src/modules/admin/logic.js', 'src/modules/dstats/logic.js', 'src/pages/Admin.dc.html', 'src/pages/Daily Stats.dc.html', 'tools/tokens.py'])
NEW_OK = ('config/wrangler.toml', 'src/api/contracts.json', 'tools/d1/integrity.py')
diffC = [k for k in diff if k not in NEW_OK]; untracked = [k for k in untracked if k not in NEW_OK]
ok(diffC == CODE and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = الـ' + str(len(CODE)) + ' المعلنة فقط · لا ملفَّ كودٍ غيرَ متتبَّع',
   json.dumps({'extra': [k for k in diffC if k not in CODE], 'missing': [k for k in CODE if k not in diffC], 'untracked': untracked}, ensure_ascii=False))
ok(all(k in cur and k not in prev for k in NEW_OK), '   الملفّاتُ الجديدة الثلاثة متتبَّعة وجديدة', NEW_OK)
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'window.__BS_VER = "2026.10.10-255";', '   الإصدار 2026.10.10-255')

print('\n╔═ (ب) الخادم: ثوابتُ AUD-037 · سطرُ الطلب · السياسة ═╗')
p052 = rd(ROOT + '/workers/parts/052-aud-events.js'); p054 = rd(ROOT + '/workers/parts/054-image-contract.js'); p063 = rd(ROOT + '/workers/parts/063-enf-api-and-handler.js'); p056 = rd(ROOT + '/workers/parts/056-enforce.js'); p001 = rd(ROOT + '/workers/parts/001-policy.js')
ok(p063.count("env = await preAttach(env, request, 'api');") == 1 and p063.count("env = await preAttach(env, request, 'shell');") == 1, '★ لقطةُ المقدّمة في /api/* وفي الغلاف — موضعٌ واحد لكلٍّ بعد initDb')
ok(re.search(r"function dbGuard\(DB, pre\)[\s\S]*?batch: function \(a\) \{ pre\.live = false;[\s\S]*?exec: function \(q\) \{ pre\.live = false;", p052) is not None and "SQL_WRITE_RE = /^\\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\\b/i" in p052,
   '★ dbGuard يطفئ اللقطةَ عند batch/exec/أيّ عبارةِ تعديل')
ok("if (P && P.live && table === 'kv' && Object.prototype.hasOwnProperty.call(P.kv, k)) return P.kv[k];" in p052 and "if (P && P.live && Object.prototype.hasOwnProperty.call(P.meta, k)) return P.meta[k];" in p054 and "if (P && P.live && P.revs) return Object.assign({}, P.revs);" in p054,
   '   kvGet/metaGet/revsAll تقرأ اللقطةَ ما دامت حيّة وإلا القاعدة (revsAll نسخةٌ لا مرجع)')
ok("(env.__rawDB || env.DB).prepare('UPDATE sess SET la = ?2 WHERE tok = ?1')" in p054 and 'env.__ctx.waitUntil(tp.then(' in p054, '★ لمسُ الجلسة على القاعدة الخام (لا يُطفئ اللقطة) وبعد الردّ (waitUntil) عند توفّر السياق')
ok("var withAuthz = enfEnvOn(env), PRE_META = withAuthz ? PRE_META_BASE.concat(PRE_META_AUTHZ) : PRE_META_BASE;" in p052 and "' /* pre:authz */'" in p052, '★ مفاتيحُ الإنفاذ في اللقطة ببيئة الإنفاذ وحدها (Production بلا المتغيّر لا تقرأها — KIVO_243)')
ok("if (P && P.live && P.meta) rows = ['authz_mode'" in p056 and "else { var r = await env.DB.prepare(\"SELECT k, v FROM meta WHERE k IN ('authz_mode'" in p056, '   enfModeOf: من اللقطة أو استعلامُه المباشر عند غيابها (fail-closed كما هو)')
ok("preOff(env);   /* KIVO_255 · AUD-037: الانتظارُ يقرأ رقمَ المراجعة حيّاً" in p063, '   انتظارُ /api/changes?wait=1 يقرأ حيّاً')
ok("logEv('info', 'req', { rid: rid, m: m0, p: url0.pathname, st: out0.status, dur: dur0 });" in p063 and "out0.headers.set('Server-Timing', 'app;dur=' + dur0)" in p063, '★ سطرُ الطلب (بلا هوية · المسارُ بلا استعلام) وServer-Timing')
ok("RL_SAVE = Math.min(5000, Math.max(30, +o.wrMin || 1200));" in p001 and "rlHit(env, 'im', AI.u.id, Math.max(30, Math.floor(RL_SAVE / 4)))" in p063 and "gk NOT LIKE 'rl:%'" in p063 and "indexOf('rl:') !== 0" in p063, '★ سقفُ الحفظ من السياسة wrMin · الصورُ ربعُه · نوافذُ rl: ليست أقفالاً')
ok("if (typeof DB.withSession === 'function') g.withSession = function (x) { return dbGuard(DB.withSession(x), pre); };" in p052 and 'withSession: function (x)' not in p052, '★ dbGuard يعرض withSession حين يملكه الارتباطُ وحده (جلسةُ D1 لا تملكه — الطلبُ المتداخل)')
chk = subprocess.run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'], cwd=ROOT, capture_output=True, text=True)
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات (20) = مصادرها (generate --check) — ومنها _worker.js = ضمُّ الأجزاء')

print('\n╔═ (ج) الرموز: لا فرق عن ' + TAG + ' ═╗')
tv = subprocess.run([sys.executable, 'tools/tokens.py', 'verify', 'src', 'git:' + TAG], cwd=ROOT, capture_output=True, text=True)
ok(tv.returncode == 0 and ' 0 فرق منها 0 ' in tv.stdout, '★ tokens verify مقابل ' + TAG + ': 0 فرق في الفاتح والداكن · 0 رمزٍ جديد', tv.stdout.split('\n')[0][:200])

print('\n╔═ (د) بصماتُ الفروق المراجَعة ═╗')
FP = ROOT + '/tests/source/k255diff.json'
REASONS = {
 'workers/parts/001-policy.js': 'SOT-139: wrMin في السياسة (30–5000 · الافتراضي 1200) يضبط RL_SAVE',
 'workers/parts/002-seclog.js': 'الإصدار 2026.10.10-155',
 'workers/parts/052-aud-events.js': 'AUD-037: لقطةُ المقدّمة (preload · preAttach · dbGuard · kvJoin · kvMany) · kvGet من اللقطة · dbGuard يعرض withSession/dump حين يملكهما الارتباطُ وحده (تصحيح: الطلبُ المتداخل /api/authz-test فوق جلسة D1 — tests/unit/d1_session_shape)',
 'workers/parts/054-image-contract.js': 'AUD-037: metaGet/revsAll/session من اللقطة · لمسُ الجلسة بـwaitUntil على القاعدة الخام · RL_SAVE من السياسة (تعليق)',
 'workers/parts/056-enforce.js': 'AUD-037: enfModeOf من اللقطة · ENF_VER KIVO_255',
 'workers/parts/063-enf-api-and-handler.js': 'AUD-037: preAttach في /api/* والغلاف · ctx · /api/get بجولةٍ واحدة · /api/me دفعة · preOff عند الانتظار — SOT-143/149: ev=req + Server-Timing — SOT-139: الصور بربع السقف · نوافذُ rl: خارج قائمة الأقفال وlockedNow · wrMin في حفظ السياسة',
 'src/modules/admin/logic.js': 'SOT-139: حقلُ «سقفُ الحفظ لكل حساب في الدقيقة» في سياسات الأمن',
 'src/modules/dstats/logic.js': 'SOT-130: قيمٌ محايدة للرسمة الأولى (EMPTY) — لا تحذيرَ never resolved',
 'src/pages/Admin.dc.html': 'مولَّدةٌ من admin/{view,logic}', 'src/pages/Daily Stats.dc.html': 'مولَّدةٌ من dstats/{view,logic}',
 'tools/tokens.py': 'verify يقبل مرجعاً git:<وسم>',
}
fps = {}
for name in CODE:
    if name in ('workers/_worker.js', 'src/core/270-bs-ver.js'): continue
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
if FREEZE:
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k255diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملف (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في k255diff.json', json.dumps({'changed-since-review': bad[:5], 'unknown': [n for n in rec if n not in fps][:3]}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب')

print('\n╔═ (هـ) الفهرسُ والإصدارُ والسقّاطاتُ والعقد ═╗')
ic = subprocess.run([sys.executable, 'tools/icons.py', 'check', '--src', 'src'], cwd=ROOT, capture_output=True, text=True)
ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
w = rd(ROOT + '/workers/_worker.js')
ok("var WORKER_VER = '2026.10.10-155';" in w and "var ENF_VER = 'KIVO_255 · enforce 2" in w, '   الخادم 2026.10.10-155 · ENF_VER KIVO_255')
ec = subprocess.run([sys.executable, 'scripts/empty_catch_ratchet.py', 'src'], cwd=ROOT, capture_output=True, text=True)
ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
ev = subprocess.run([sys.executable, 'scripts/env_check.py', 'src'], cwd=ROOT, capture_output=True, text=True)
ok(ev.returncode == 0 and 'wrangler.toml متّسق' in ev.stdout, '   مخطّطُ البيئة = العامل · wrangler.toml متّسق بلا أسرار', ev.stdout.strip()[:160])
CT = json.load(open(ROOT + '/src/api/contracts.json', encoding='utf-8'))
exact = sorted(set(re.findall(r"path === '(/api/[a-z0-9/_-]+)'", w))); pref = sorted(set(re.findall(r"path\.indexOf\('(/api/[a-z0-9_-]+/)'\)", w)))
ok(sorted(r['path'] for r in CT['routes']) == sorted(exact + pref), '★ src/api/contracts.json = مساراتُ العامل حرفاً (' + str(len(CT['routes'])) + ')')
if os.path.isdir(DIR):
    bj = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else None
    ok(bj is not None and bj['files']['_worker.js']['sha256'] == sha(open(ROOT + '/workers/_worker.js', 'rb').read()), '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js (الحزمةُ مبنيّةٌ من هذا المصدر)')
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
