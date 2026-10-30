# -*- coding: utf-8 -*-
"""KIVO_257 · AUD-010 (فصلُ 330/440 بالمسؤولية) · AUD-012 (مناهجُ الصفحات المشتركة) · AUD-014 (الكودُ الميت) · AUD-007 (الختام: لا سطرَ > 1,500)
   · AUD-024 (تصغيرُ الواجهة الحافظُ للرموز) — إثباتُ الفرق بالضبط عن KIVO_256 (الوسم git؛ KIVO_PREV_TAG يبدّله — مثلاً الفرع k256 قبل وسمه).
   كلُّ تحويلٍ آليٌّ تعيد أداتُه توليدَه من الوسم وتقارنه بالمُلتزَم بايتاً، مع برهانها الداخلي:
   (أ) الشجرة = الوسم عدا: الملفاتِ المعلنة يدوياً (CODE · ببصمة فرقٍ مراجَعة في k257diff.json) · المولَّدةِ بالأدوات (GEN · تُثبت في ب–هـ)
       · المحذوفَين (330 · 440) · الجديدةِ المعلنة (NEW) — ولا ملفَّ كودٍ غيرَ متتبَّع.
   (ب) AUD-010: tools/split_iife.mjs --check للمواصفتين (330 → 6 أجزاء · IIFE 440 الثالثة → جزءان) · 440-count.js = الأسطر 10–220 من الوسم حرفاً
       · لا اسمَ غيرَ محلول جديداً في الأجزاء (no-undef) · كلُّ ملفٍّ عميل < 100 KB عدا المولَّد والمورَّد · ترتيبُ الكتل في blocks.json والقالب = ترتيبُ الأقسام.
   (ج) AUD-012/014: tools/page_kit.mjs --check (المناهجُ الخاصة ∪ السمات = الوسم بعد حذف الميت · الوحداتُ والسمات = إعادةُ التوليد) ·
       أسماءُ الأعضاء الميتة الاثني عشر غائبةٌ من src كلِّه · لا منهجَ باسمٍ وجسدٍ متطابقين في وحدتين (القبول).
   (د) AUD-007: wrap_long_lines --from-ref للقوالب و110 · لا سطرَ > 1,500 بايت في المصادر المحرَّرة يدوياً (المولَّدُ والمورَّد مستثنيان بالاسم).
   (هـ) AUD-024: كلُّ كتلة js في الحزمة = تصغيرٌ حافظٌ للرموز لمصدرها (تيّارُ الرموز وفواصلُ الأسطر بينها حرفاً · نصوصُ @@KIVO_ASSET@@ تُقارن بعد الحلّ)
       · blocks.json «minify»: «tokens» · محمِّلُ الصفحات خارج التصغير.
   (و) الرموزُ = الوسم · المشتقّات (generate --check) · الفهرس · الإصدار 157/257 · catch الفارغ · البيئة · العقد = مساراتُ العامل.
       python3 tests/source/k257src.py [pk257] [--freeze]"""
import os, sys, hashlib, subprocess, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk257'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_256')
FREEZE = '--freeze' in sys.argv
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
gitb = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, cwd=ROOT).stdout
run = lambda cmd, env=None: subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=dict(os.environ, **(env or {})))
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')
print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا المعلن ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   المرجعُ ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q and os.path.exists(os.path.join(ROOT, q))}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
MODS_KIT = ['admin', 'award', 'daily', 'dreport', 'dstats', 'employees', 'irshad', 'plan', 'planning', 'profile', 'seized', 'staff', 'tasks']
VIEWS_WRAP = ['admin', 'award', 'daily', 'dreport', 'employees', 'plan']
PARTS330 = ['src/auth/330-auth.js', 'src/permissions/331-perm-model.js', 'src/services/332-find-day.js', 'src/manifests/333-platform-map.js', 'src/permissions/334-perm-tree-tpl.js', 'src/auth/335-identity-gate.js']
PARTS440 = ['src/services/440-count.js', 'src/services/441-notif-core.js', 'src/services/442-notif-observer.js']
CODE = sorted(['src/core/270-bs-ver.js', 'workers/parts/002-seclog.js', 'workers/parts/056-enforce.js', 'build/build.py', 'src/blocks.json', 'src/layouts/index.template.html'])
GEN = sorted(['workers/_worker.js', 'src/core/110-theme-prepaint.js'] + ['src/modules/%s/logic.js' % m for m in MODS_KIT] + ['src/modules/%s/view.html' % m for m in VIEWS_WRAP]
             + [q for q in diff if q.startswith('src/pages/')])
DELETED = sorted(['src/auth/330-auth-perm.js', 'src/services/440-notifications.js'])
NEW = sorted(PARTS330 + PARTS440 + ['src/components/565-page-kit.js', 'tools/split_iife.mjs', 'tools/split/330-auth-perm.json', 'tools/split/440-notifications.json',
              'tools/jsmin_tokens.mjs', 'tools/wrap_long_lines.mjs', 'tools/page_kit.mjs', 'tools/page_kit.json'])
want = sorted(CODE + GEN + DELETED + NEW)
ok(diff == want and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = المعلنة فقط (' + str(len(CODE)) + ' يدوياً · ' + str(len(GEN)) + ' بالأدوات · 2 محذوفان · ' + str(len(NEW)) + ' جديدة) · لا غيرَ متتبَّع',
   json.dumps({'extra': [k for k in diff if k not in want], 'missing': [k for k in want if k not in diff], 'untracked': untracked}, ensure_ascii=False))
ok(all(k in prev and k not in cur for k in DELETED) and all(k in cur and k not in prev for k in NEW), '   المحذوفان غائبان والجديدةُ جديدة')
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'window.__BS_VER = "2026.10.10-257";', '   الإصدار 2026.10.10-257')

print('\n╔═ (ب) AUD-010: 330 و440 مقسومةً بالمسؤولية ═╗')
for spec in ('tools/split/330-auth-perm.json', 'tools/split/440-notifications.json'):
    r = run(['node', 'tools/split_iife.mjs', spec, '--check'], {'KIVO_SPLIT_REF': TAG})
    ok(r.returncode == 0, '★ split_iife --check ' + spec + ': الأجزاءُ = التقسيمُ من ' + TAG + ' بايتاً (الأسماءُ المصدَّرة/المستوردة · الموصِّلات · الخروجُ المبكّر)', (r.stdout.strip().split('\n') or [''])[-1][:200])
old440 = git('show', TAG + ':src/services/440-notifications.js').split('\n')
c440 = rd(ROOT + '/src/services/440-count.js').split('\n')
ok(c440[2:] == old440[9:220] + [''] or c440[2:] == old440[9:220], '★ 440-count.js = الأسطرُ 10–220 من ' + TAG + ' حرفاً (صيغةُ العدد والمعدود · حلقةُ الكرت) + سطرا رأس', str(len(c440)))
un = run(['node', '-e', r'''
const { createRequire } = require('module'); const r = createRequire(process.cwd() + '/package.json');
const { Linter } = r('eslint'); const globals = r('globals'); const fs = require('fs'); const cp = require('child_process');
const L = new Linter({ configType: 'flat' }); const cfg = [{ languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } }, rules: { 'no-undef': 'error' } }];
const names = (t) => new Set(L.verify(t, cfg, 'x.js').map(m => m.message));
const tag = process.argv[1]; const a = new Set([...names(cp.execFileSync('git', ['show', tag + ':src/auth/330-auth-perm.js']).toString()), ...names(cp.execFileSync('git', ['show', tag + ':src/services/440-notifications.js']).toString())]);
const b = new Set(process.argv.slice(2).flatMap(f => [...names(fs.readFileSync(f, 'utf8'))]));
const extra = [...b].filter(x => !a.has(x)); console.log(JSON.stringify({ before: a.size, after: b.size, extra })); process.exit(extra.length ? 1 : 0);
''', TAG] + PARTS330 + PARTS440)
ok(un.returncode == 0, '★ لا اسمَ غيرَ محلولٍ جديداً في الأجزاء التسعة (no-undef: كلُّ مرجعٍ عابرٍ للأجزاء صار استيراداً صريحاً)', un.stdout.strip()[:200])
GENERATED = {'src/permissions/340-registry-v24-9.js', 'src/styles/070-theme-tokens.css', 'src/styles/080-theme-dark.css', 'src/manifests/255-page-manifest.js', 'src/assets/icons/catalog.json'}
VENDORED = {'src/core/010-react.js', 'src/core/020-react-dom.js'}
blocks = json.load(open(ROOT + '/src/blocks.json', encoding='utf-8'))
big = [(b['id'], os.path.getsize(ROOT + '/src/' + b['id'])) for b in blocks['blocks'] if b['kind'] == 'js' and os.path.getsize(ROOT + '/src/' + b['id']) > 100 * 1024 and 'src/' + b['id'] not in GENERATED | VENDORED]
ok(not big, '★ القبول: لا كتلةَ عميلٍ > 100 KB عدا المولَّد (340 السجلّ) والمورَّد (React) — كان 330 (240 KB) و440 (140 KB)', json.dumps(big))
ids = [b['id'] for b in blocks['blocks']]; tpl = rd(ROOT + '/src/layouts/index.template.html')
seq = re.findall(r'@@KIVO_BLOCK:([^@]+)@@', tpl)
p330 = [p[4:] for p in PARTS330]; p440 = [p[4:] for p in PARTS440]
consec = lambda arr, sub: any(arr[i:i + len(sub)] == sub for i in range(len(arr)))
ok(consec(ids, p330) and consec(ids, p440) and consec(seq, p330) and consec(seq, p440), '   الأجزاءُ متتاليةٌ بترتيب الأقسام في blocks.json والقالب (مكانَ الكتلة الأصلية)')
ok(blocks.get('gateBlock') == 'auth/335-identity-gate.js', '   gateBlock = آخرُ أجزاء 330 (ما بعده لا تحتاجه شاشةُ الدخول — كما كان بعد 330)')

print('\n╔═ (ج) AUD-012/014: مناهجُ الصفحات المشتركة والكودُ الميت ═╗')
r = run(['node', 'tools/page_kit.mjs', 'tools/page_kit.json', '--check'], {'KIVO_KIT_REF': TAG})
ok(r.returncode == 0, '★ page_kit --check: لكل وحدة المناهجُ الخاصة ∪ السمات = ' + TAG + ' بعد حذف الميت · والملفاتُ = إعادةُ التوليد', ' | '.join(l for l in r.stdout.strip().split('\n') if l)[:300])
spec = json.load(open(ROOT + '/tools/page_kit.json', encoding='utf-8')); dead = [n for v in spec['dead'].values() for n in v]
alltext = '\n'.join(rd(os.path.join(ROOT, q)) for q in cur if q.startswith('src/') and q.endswith(('.js', '.html', '.json')) and not q.endswith('page_kit.json'))
left = [n for n in dead if re.search(r'(?<![A-Za-z0-9_$])' + re.escape(n) + r'(?![A-Za-z0-9_$])', alltext)]
ok(len(dead) == 12 and not left, '★ الأعضاءُ الميتة الاثنا عشر (ENG-06) غائبةٌ من src كلِّه', json.dumps(left))
dup = run(['node', '-e', r'''
const fs = require('fs'), path = require('path'), crypto = require('crypto'); const { createRequire } = require('module'); const acorn = createRequire(process.cwd() + '/package.json')('acorn');
const strip = (n) => Array.isArray(n) ? n.map(strip) : (n && typeof n === 'object') ? Object.fromEntries(Object.keys(n).sort().filter(k => !['start','end','loc','range','raw'].includes(k)).map(k => [k, strip(n[k])])) : n;
const g = new Map();
for (const m of fs.readdirSync('src/modules')) { const f = path.join('src/modules', m, 'logic.js'); if (!fs.existsSync(f)) continue; const cls = acorn.parse(fs.readFileSync(f, 'utf8'), { ecmaVersion: 'latest' }).body.find(x => x.type === 'ClassDeclaration');
  for (const x of cls.body.body) { if (x.type !== 'MethodDefinition' || x.kind === 'constructor') continue; const k = (x.key.name || x.key.value) + '#' + crypto.createHash('sha1').update(JSON.stringify(strip(x.value))).digest('hex'); if (!g.has(k)) g.set(k, new Set()); g.get(k).add(m); } }
const d = [...g].filter(([k, s]) => s.size > 1).map(([k, s]) => k.split('#')[0] + ':' + [...s].join(','));
console.log(JSON.stringify({ duplicated: d.length, sample: d.slice(0, 5) })); process.exit(d.length ? 1 : 0);
'''])
ok(dup.returncode == 0, '★ القبول (AUD-012): لا منهجَ باسمٍ وجسدٍ متطابقين في وحدتين', dup.stdout.strip()[:300])
kit = rd(ROOT + '/src/components/565-page-kit.js')
ok(re.search(r'window\.BassamPageKit = \{\s*base: base', kit) is not None and 'components/565-page-kit.js' in ids and ids.index('components/565-page-kit.js') < len(ids), '   565-page-kit كتلةٌ في الغلاف (قبل أيّ صفحةٍ كسولة)')

print('\n╔═ (د) AUD-007: لا سطرَ > 1,500 بايت ═╗')
r = run(['node', 'tools/wrap_long_lines.mjs', '--from-ref', TAG] + ['src/modules/%s/view.html' % m for m in VIEWS_WRAP] + ['src/core/110-theme-prepaint.js'])
ok(r.returncode == 0, '★ القوالبُ الستة و110 = لفُّ نسخة ' + TAG + ' (كسرٌ بين السمات/بعد الفواصل فقط · العكسُ يعيد الأصل بايتاً · AST لـJS)', ' | '.join(r.stdout.strip().split('\n')[-2:])[:200])
EXCL = GENERATED | VENDORED | {'src/core/030-pages-loader.js'}
hand = [q for q in cur if q.startswith('src/') and not q.startswith('src/pages/') and q not in EXCL and q.endswith(('.js', '.html', '.css', '.json'))]
long_ = [(q, i + 1) for q in hand for i, l in enumerate(rd(os.path.join(ROOT, q)).split('\n')) if len(l.encode('utf-8')) > 1500]
ok(not long_, '★ القبول: لا سطرَ > 1,500 بايت في ' + str(len(hand)) + ' ملفاً محرَّراً يدوياً (المستثنى بالاسم: الصفحاتُ والسجلُّ والرموزُ والفهرسُ المولَّدة · React · fflate المضمَّنة في 030)', json.dumps(long_[:5]))

print('\n╔═ (هـ) AUD-024: تصغيرُ الواجهة الحافظُ للرموز ═╗')
ok(blocks.get('minify') == 'tokens', '   blocks.json: «minify»: «tokens»')
if os.path.isdir(DIR):
    shell = rd(DIR + '/index.html')
    srcs = re.findall(r'<script[^>]* src="(/assets/js/[^"]+)"></script>', shell)
    pairs = []
    for b in blocks['blocks']:
        if b['kind'] != 'js' or b['id'].endswith('-pages-loader.js'): continue
        stem = os.path.splitext(os.path.basename(b['id']))[0]
        hit = [u for u in srcs if os.path.basename(u).startswith(stem + '.')]
        if len(hit) == 1: pairs.append((b['id'], DIR + hit[0]))
    chk = run(['node', '-e', r'''
const fs = require('fs'); const { createRequire } = require('module'); const acorn = createRequire(process.cwd() + '/package.json')('acorn');
const LT = new RegExp('[' + String.fromCharCode(10, 13, 0x2028, 0x2029) + ']');
const sig = (s) => { const o = []; let pe = 0; for (const t of acorn.tokenizer(s, { ecmaVersion: 'latest', allowReturnOutsideFunction: true, allowHashBang: true })) { if (t.type === acorn.tokTypes.eof) break; let v = s.slice(t.start, t.end); if (/@@KIVO_ASSET:|\/assets\/(img|fonts)\//.test(v)) v = '<asset>'; o.push((o.length && LT.test(s.slice(pe, t.start)) ? 'NL ' : '') + t.type.label + ' ' + v); pe = t.end; } return o.join('\u0002'); };
const pairs = JSON.parse(process.argv[1]); const bad = []; let saved = 0;
for (const [src, out] of pairs) { const a = fs.readFileSync('src/' + src, 'utf8'), b = fs.readFileSync(out, 'utf8'); if (sig(a) !== sig(b)) bad.push(src); saved += Buffer.byteLength(a) - Buffer.byteLength(b); }
console.log(JSON.stringify({ n: pairs.length, bad, saved })); process.exit(bad.length ? 1 : 0);
''', json.dumps(pairs)])
    info = json.loads(chk.stdout.strip() or '{}') if chk.stdout.strip().startswith('{') else {}
    ok(chk.returncode == 0 and len(pairs) >= 60, '★ كلُّ كتلة js مخدومة (' + str(info.get('n')) + ') = مصدرُها رمزاً برمز وفاصلَ سطرٍ بفاصل — وفّر ' + str(round((info.get('saved') or 0) / 1024)) + ' KB خاماً', chk.stdout.strip()[:200] or chk.stderr.strip()[:200])
else: ok(False, 'الحزمةُ ' + DIR + ' غيرُ موجودة')

print('\n╔═ (و) الرموز · المشتقّات · الإصدار · catch · البيئة · العقد ═╗')
import tempfile
tmp = tempfile.mkdtemp(prefix='k257src_')
subprocess.run('git archive ' + TAG + ' src | tar -x -C ' + tmp, shell=True, cwd=ROOT, check=True)
tv = run([sys.executable, 'tools/tokens.py', 'verify', 'src', tmp + '/src'])
ok(tv.returncode == 0 and tv.stdout.startswith('✔'), '   الرموز = ' + TAG + ' (tokens verify)', tv.stdout.split('\n')[0][:160])
chk = run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'])
ok(chk.returncode == 0 and '✘' not in chk.stdout, '★ المشتقّاتُ = مصادرها (generate --check): الصفحاتُ = الوحداتُ بعد الاستخراج واللفّ · _worker.js = الأجزاء')
ic = run([sys.executable, 'tools/icons.py', 'check', '--src', 'src'])
ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
w = rd(ROOT + '/workers/_worker.js')
ok("var WORKER_VER = '2026.10.10-157';" in w and "var ENF_VER = 'KIVO_257 · enforce 2" in w, '   الخادم 2026.10.10-157 · ENF_VER KIVO_257 (الإصدارُ وحده — لا تغييرَ في منطق الخادم)')
wd = subprocess.run(['git', 'diff', '--no-color', TAG, '--', 'workers/parts'], capture_output=True, text=True, cwd=ROOT).stdout
chg = [l for l in wd.split('\n') if (l.startswith('+') or l.startswith('-')) and not l.startswith(('+++', '---'))]
ok(len(chg) == 4 and all('WORKER_VER' in l or 'ENF_VER' in l for l in chg), '   أجزاءُ الخادم: سطرا الإصدار وحدهما', str(len(chg)))
ec = run([sys.executable, 'scripts/empty_catch_ratchet.py', 'src'])
ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
for name, cmd in [('الألوان الخام', 'scripts/color_ratchet.py'), ('نقاطُ الكسر', 'scripts/bp_ratchet.py')]:
    rr = run([sys.executable, cmd, 'src']); ok(rr.returncode == 0, '   سقّاطةُ ' + name + ' (خطُّها الأساسي مُعاد ترقيمُه بالملفات الجديدة نفسِها · المجموعُ كما هو)', rr.stdout.strip().split('\n')[-1][:140])
env = run([sys.executable, 'scripts/env_check.py', 'src'])
ok(env.returncode == 0, '   البيئة (env_check)', (env.stdout or env.stderr).strip().split('\n')[-1][:120])

print('\n╔═ (ز) بصماتُ الفروق اليدوية المراجَعة ═╗')
FP = ROOT + '/tests/source/k257diff.json'
REASONS = {
 'src/core/270-bs-ver.js': 'الإصدار 257', 'workers/parts/002-seclog.js': 'WORKER_VER 157', 'workers/parts/056-enforce.js': 'ENF_VER KIVO_257',
 'build/build.py': 'AUD-024: تصغيرٌ حافظٌ للرموز لكتل js (tools/jsmin_tokens.mjs --serve · برهانٌ داخل البناء لكل كتلة) بعلَم blocks.json',
 'src/blocks.json': 'AUD-010: 6 كتلٍ مكانَ 330 و3 مكانَ 440 (splitFrom) · AUD-012: 565-page-kit · gateBlock = 335 · minify = tokens · counts.js',
 'src/layouts/index.template.html': 'AUD-010/012: علاماتُ الكتل الجديدة بترتيب الأقسام',
}
fps = {}
for name in CODE:
    d = gitb('diff', '--no-color', TAG, '--', name)
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
if FREEZE:
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k257diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملفٍّ يدوي (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة', json.dumps({'changed-since-review': bad}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب')
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
