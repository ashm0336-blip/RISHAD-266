# -*- coding: utf-8 -*-
"""KIVO_258 · AUD-013 (نواةُ الطباعة المشتركة) · AUD-016 (الواجهةُ العامة الواحدة window.KIVO) — إثباتُ الفرق بالضبط عن KIVO_257
   (الوسم git؛ KIVO_PREV_TAG يبدّله — مثلاً الفرع k257 قبل وسمه). السلسلة: الوسم ─(AUD-013 يدوياً · معلن)→ مرجعُ التحويل (tools/kivo_ns.json ref)
   ─(tools/kivo_ns.mjs آلياً · مُثبَت)→ الشجرة ─(رقمُ الإصدار يدوياً · spec.after)→ الآن.
   (أ) الشجرة = الوسم عدا: الملفاتِ اليدوية (CODE · ببصمة فرقٍ مراجَعة في k258diff.json — تُحسب على الصورة القانونية للملفات التي مسّها التحويل،
       فلا تختلط تهجئةُ الوصول KIVO.X بالفرق الحقيقي) · المولَّدةِ بالأدوات (GEN) · الجديدةِ (NEW) — ولا ملفَّ كودٍ غيرَ متتبَّع.
   (ب) AUD-013: 566-print-core كتلةٌ بعد 565 · بانيا الوحدتين ولاقطاهما تفويضٌ من سطرٍ واحد إلى BassamPrintCore بخياراتٍ صريحة ·
       إطارُ الطباعة (bs-print-frame) في النواة وحدها (كان في الوحدتين) · حذفُ النسختين المكرَّرتين (≥ 1,100 سطر).
   (ج) AUD-016: kivo_ns --check (الطبقةُ = التوليد · الكتابةُ تامّةٌ ودقيقة · الصورةُ القانونية = المرجع عدا spec.after) · المرجعُ سلفٌ للشجرة
       وفرقُه عن الوسم = ملفاتُ AUD-013 وحدها · 005-kivo-ns أوّلُ كتلةٍ وأوّلُ سكربتٍ في الغلاف (قبل React) · لا «window.X =» لاسمٍ من الأسماء
       في المصدر المحرَّر يدوياً (AST) · في الحزمة: 005 أوّلُ سكربت.
   (د) AUD-024 مستمرّ: كلُّ كتلة js مخدومة = تصغيرٌ حافظٌ للرموز لمصدرها.
   (هـ) الرموز = الوسم · المشتقّات (generate --check) · الفهرس · الإصدار 158/258 · catch الفارغ · البيئة · السقّاطات · أجزاءُ الخادم: سطرا الإصدار.
       python3 tests/source/k258src.py [pk258] [--freeze]"""
import os, sys, hashlib, subprocess, json, re, difflib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk258'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_257')
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
NSL = json.loads(run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--list']).stdout or '{}')
NSREF, NAMES, NSFILES = NSL.get('ref', ''), NSL.get('names', []), NSL.get('files', [])

print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا المعلن ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   المرجعُ ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q and os.path.exists(os.path.join(ROOT, q))}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
CODE13 = ['src/modules/daily/logic.js', 'src/modules/plan/logic.js', 'src/blocks.json', 'src/layouts/index.template.html']
CODE = sorted(CODE13 + ['src/core/270-bs-ver.js', 'workers/parts/002-seclog.js', 'workers/parts/056-enforce.js'])
NEW = sorted(['src/services/566-print-core.js', 'src/core/005-kivo-ns.js', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json',
              'tools/engine_coverage.mjs', 'tools/engine_coverage.json', 'tools/adr_index.py', 'tools/gen_types.mjs', 'src/types/kivo.d.ts', 'src/types/README.md',
              'src/observability/events.json', 'tools/obs/metrics_report.py', 'tools/sec/secrets_scan.py'])   # SOT-124/143: التعريفُ المركزي للمراقبة · المقاييسُ من السجل   # AUD-025: قياسُ تغطية المحرّكات · AUD-031: فهرسُ القرارات · SOT-102: العقودُ البنيوية (مولَّدة)
GEN = sorted(set(['workers/_worker.js'] + [q for q in diff if q.startswith('src/pages/')] + NSFILES) - set(CODE) - set(NEW))
want = sorted(set(CODE + GEN + NEW))
ok(len(NAMES) >= 90 and len(NSFILES) >= 60, '   tools/kivo_ns.mjs --list: ' + str(len(NAMES)) + ' اسماً · ' + str(len(NSFILES)) + ' ملفاً معاد كتابتُه · المرجع ' + NSREF[:12])
ok(diff == want and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = المعلنة فقط (' + str(len(CODE)) + ' يدوياً · ' + str(len(GEN)) + ' بالأدوات · ' + str(len(NEW)) + ' جديدة) · لا غيرَ متتبَّع',
   json.dumps({'extra': [k for k in diff if k not in want], 'missing': [k for k in want if k not in diff], 'untracked': untracked}, ensure_ascii=False))
ok(all(k in cur and k not in prev for k in NEW), '   الجديدةُ جديدة (' + ', '.join(os.path.basename(x) for x in NEW) + ')')
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'KIVO.__BS_VER = "2026.10.10-258";', '   الإصدار 2026.10.10-258 (بالوصول KIVO — window.__BS_VER موصِّلٌ إليه)')

print('\n╔═ (ب) AUD-013: نواةُ الطباعة المشتركة ═╗')
blocks = json.load(open(ROOT + '/src/blocks.json', encoding='utf-8')); ids = [b['id'] for b in blocks['blocks']]
tpl = rd(ROOT + '/src/layouts/index.template.html'); seq = re.findall(r'@@KIVO_BLOCK:([^@]+)@@', tpl)
ok('services/566-print-core.js' in ids and ids.index('services/566-print-core.js') == ids.index('components/565-page-kit.js') + 1
   and seq.index('services/566-print-core.js') == seq.index('components/565-page-kit.js') + 1, '   566-print-core كتلةٌ في الغلاف بعد 565 (في blocks.json والقالب) — قبل أيّ صفحةٍ كسولة')
core = rd(ROOT + '/src/services/566-print-core.js')
ok(re.search(r'KIVO\.BassamPrintCore = \{\s*build: build,\s*capture: capture', core) is not None, '   النواةُ تعرّف KIVO.BassamPrintCore = { build, capture }', '')
DEL = {'daily': ('round', '!0', 'svg[data-ds-zoom]'), 'plan': ('today', '!1', 'svg[data-map-zoom]')}   # KIVO_258 (إفصاح — تصحيح): لا خيارَ footI — قاعدةُ .ft .fp i في البانيين كليهما (كشفها k258print)
for m, (date, kpi, zoom) in DEL.items():
    t = rd(ROOT + '/src/modules/%s/logic.js' % m)
    b1 = re.search(r'_buildPrintDoc\(t\) \{\s*(?:/\*.*?\*/\s*)?return KIVO\.BassamPrintCore\.build\(this, t, \{ date: "%s", kpi: %s, ver: "v1\.0\.\d+", logo: \'[^\']+\' \}\);\s*\}' % (date, re.escape(kpi)), t, re.S)
    b2 = re.search(r'_capturePrintPage\(t\) \{\s*return KIVO\.BassamPrintCore\.capture\(this, t, "%s"\);\s*\}' % re.escape(zoom), t)
    ok(b1 is not None and b2 is not None, '★ ' + m + ': _buildPrintDoc و_capturePrintPage تفويضٌ إلى النواة بالخيارات الصريحة (التاريخ «' + date + '» · المؤشرات ' + kpi + ' · ' + zoom + ')')
frames = [q for q in cur if q.startswith('src/') and not q.startswith('src/pages/') and q.endswith(('.js', '.html')) and 'bs-print-frame' in rd(os.path.join(ROOT, q))]
ok(frames == ['src/services/566-print-core.js'], '★ إطارُ الطباعة bs-print-frame في النواة وحدها (كان في daily وplan)', json.dumps(frames))
lt = lambda rev, f: len((git('show', rev + ':' + f) if rev else rd(os.path.join(ROOT, f))).split('\n'))
cut = sum(lt(TAG, 'src/modules/%s/logic.js' % m) - lt(None, 'src/modules/%s/logic.js' % m) for m in DEL)
ok(cut >= 1100 and lt(None, 'src/services/566-print-core.js') < cut, '★ القبول: ذهبت النسختان المكرَّرتان (−' + str(cut) + ' سطراً من الوحدتين) وحلّت محلَّهما نواةٌ واحدة (' + str(lt(None, 'src/services/566-print-core.js')) + ' سطراً)')

print('\n╔═ (ج) AUD-016: الواجهةُ العامة الواحدة window.KIVO ═╗')
r = run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--check'])
ok(r.returncode == 0, '★ kivo_ns --check: ' + r.stdout.strip()[:260], (r.stdout + r.stderr).strip()[-300:] if r.returncode else '')
anc = subprocess.run(['git', 'merge-base', '--is-ancestor', NSREF, 'HEAD'], cwd=ROOT).returncode == 0
chain = sorted(l.split('\t')[1] for l in git('diff', '--name-status', TAG, NSREF, '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if l)
want13 = sorted(CODE13 + ['src/services/566-print-core.js'] + [q for q in chain if q.startswith('src/pages/')])
ok(anc and chain == want13, '★ السلسلة: مرجعُ التحويل ' + NSREF[:12] + ' سلفٌ للشجرة وفرقُه عن ' + TAG + ' = ملفاتُ AUD-013 وحدها (' + str(len(chain)) + ')', json.dumps({'ancestor': anc, 'extra': [q for q in chain if q not in want13], 'missing': [q for q in want13 if q not in chain]}, ensure_ascii=False))
ok(ids[0] == 'core/005-kivo-ns.js' and seq[0] == 'core/005-kivo-ns.js', '★ 005-kivo-ns أوّلُ كتلةٍ في blocks.json وأوّلُ علامةٍ في القالب (قبل React وكلِّ كتلة)', json.dumps([ids[:2], seq[:2]]))
GENERATED = {'src/permissions/340-registry-v24-9.js', 'src/styles/070-theme-tokens.css', 'src/styles/080-theme-dark.css', 'src/manifests/255-page-manifest.js', 'src/assets/icons/catalog.json', 'src/core/005-kivo-ns.js'}
VENDORED = {'src/core/010-react.js', 'src/core/020-react-dom.js', 'src/core/030-pages-loader.js', 'src/core/030-pages-loader.lazy-guard.js'}   # محمِّلُ الصفحات وحارسُه الكسول يُركَّبان عند البناء مع سطور window.__resources/__dcLogic المولَّدة
hand = sorted(q for q in cur if q.startswith('src/') and not q.startswith('src/pages/') and q.endswith('.js') and q not in GENERATED | VENDORED)
wa = run(['node', '-e', r'''
const fs = require('fs'); const { createRequire } = require('module'); const r = createRequire(process.cwd() + '/package.json'); const acorn = r('acorn'); const es = r('eslint-scope');
const names = new Set(JSON.parse(process.argv[1])); const files = JSON.parse(process.argv[2]); const bad = [];
const walk = (n, f) => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(x => walk(x, f)); f(n); for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'range') walk(n[k], f); };
for (const f of files) { const s = fs.readFileSync(f, 'utf8'); let a; try { a = acorn.parse(s, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, allowReturnOutsideFunction: true }); } catch (e) { bad.push(f + ':parse'); continue; }
  const sm = es.analyze(a, { ecmaVersion: 2022 }); const sh = new Set(); for (const sc of sm.scopes) for (const x of sc.references) if (x.identifier.name === 'window' && x.resolved) sh.add(x.identifier.range[0]);
  walk(a, n => { if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'window' && !sh.has(n.object.range[0]) && names.has(n.property.name)) bad.push(f + ':' + n.property.name); }); }
console.log(JSON.stringify({ n: files.length, bad: bad.slice(0, 8), count: bad.length })); process.exit(bad.length ? 1 : 0);
''', json.dumps(NAMES), json.dumps(hand)])
ok(wa.returncode == 0, '★ القبول: لا وصولَ «window.X» لاسمٍ من الأسماء في ' + str(len(hand)) + ' ملفَّ js محرَّراً يدوياً — كلُّه KIVO.X (المستثنى بالاسم: المولَّدُ والمورَّد ومحمِّلُ الصفحات)', (wa.stdout or wa.stderr).strip()[:300])
if os.path.isdir(DIR):
    shell = rd(DIR + '/index.html'); srcs = re.findall(r'<script[^>]* src="(/assets/js/[^"]+)"></script>', shell)
    ok(bool(srcs) and os.path.basename(srcs[0]).startswith('005-kivo-ns.'), '   في الحزمة: 005-kivo-ns أوّلُ سكربتٍ خارجي في الغلاف', srcs[:2])
else: ok(False, 'الحزمةُ ' + DIR + ' غيرُ موجودة')

print('\n╔═ (د) AUD-024 مستمرّ: التصغيرُ الحافظُ للرموز ═╗')
ok(blocks.get('minify') == 'tokens', '   blocks.json: «minify»: «tokens»')
if os.path.isdir(DIR):
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
    ok(chk.returncode == 0 and len(pairs) >= 62, '★ كلُّ كتلة js مخدومة (' + str(info.get('n')) + ') = مصدرُها رمزاً برمز وفاصلَ سطرٍ بفاصل — وفّر ' + str(round((info.get('saved') or 0) / 1024)) + ' KB خاماً', chk.stdout.strip()[:200] or chk.stderr.strip()[:200])

print('\n╔═ (هـ) الرموز · المشتقّات · الإصدار · catch · البيئة · العقد ═╗')
import tempfile
tmp = tempfile.mkdtemp(prefix='k258src_')
subprocess.run('git archive ' + TAG + ' src | tar -x -C ' + tmp, shell=True, cwd=ROOT, check=True)
tv = run([sys.executable, 'tools/tokens.py', 'verify', 'src', tmp + '/src'])
ok(tv.returncode == 0 and tv.stdout.startswith('✔'), '   الرموز = ' + TAG + ' (tokens verify)', tv.stdout.split('\n')[0][:160])
chk = run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'])
ok(chk.returncode == 0 and '✘' not in chk.stdout, '★ المشتقّاتُ = مصادرها (generate --check): الصفحاتُ = الوحداتُ بعد التحويل · _worker.js = الأجزاء')
ty = run(['node', 'tools/gen_types.mjs', '--check'])
ok(ty.returncode == 0, '★ SOT-102: src/types/kivo.d.ts = التوليدُ من FIELDS/ENT/RES_REG/العقد/الصفحات/الأسماء · وصيغةُ TypeScript صالحة', ty.stdout.strip()[:220])
ic = run([sys.executable, 'tools/icons.py', 'check', '--src', 'src'])
ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
w = rd(ROOT + '/workers/_worker.js')
ok("var WORKER_VER = '2026.10.10-158';" in w and "var ENF_VER = 'KIVO_258 · enforce 2" in w, '   الخادم 2026.10.10-158 · ENF_VER KIVO_258 (الإصدارُ وحده — لا تغييرَ في منطق الخادم)')
wd = subprocess.run(['git', 'diff', '--no-color', TAG, '--', 'workers/parts'], capture_output=True, text=True, cwd=ROOT).stdout
chg = [l for l in wd.split('\n') if (l.startswith('+') or l.startswith('-')) and not l.startswith(('+++', '---'))]
ok(len(chg) == 4 and all('WORKER_VER' in l or 'ENF_VER' in l for l in chg), '   أجزاءُ الخادم: سطرا الإصدار وحدهما', str(len(chg)))
ec = run([sys.executable, 'scripts/empty_catch_ratchet.py', 'src'])
ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
for name, cmd in [('الألوان الخام', 'scripts/color_ratchet.py'), ('نقاطُ الكسر', 'scripts/bp_ratchet.py')]:
    rr = run([sys.executable, cmd, 'src']); ok(rr.returncode == 0, '   سقّاطةُ ' + name, rr.stdout.strip().split('\n')[-1][:140])
env = run([sys.executable, 'scripts/env_check.py', 'src'])
ok(env.returncode == 0, '   البيئة (env_check)', (env.stdout or env.stderr).strip().split('\n')[-1][:120])

print('\n╔═ (و) بصماتُ الفروق اليدوية المراجَعة (على الصورة القانونية لما مسّه التحويل) ═╗')
FP = ROOT + '/tests/source/k258diff.json'
REASONS = {
 'src/core/270-bs-ver.js': 'الإصدار 258 (spec.after: حُرّر بعد التحويل بالوصول KIVO)', 'workers/parts/002-seclog.js': 'WORKER_VER 158', 'workers/parts/056-enforce.js': 'ENF_VER KIVO_258',
 'src/modules/daily/logic.js': 'AUD-013: _buildPrintDoc/_capturePrintPage → تفويضٌ إلى BassamPrintCore (date round · kpi · v1.0.577 · svg[data-ds-zoom])',
 'src/modules/plan/logic.js': 'AUD-013: _buildPrintDoc/_capturePrintPage → تفويضٌ إلى BassamPrintCore (date today · بلا مؤشرات · v1.0.457 · svg[data-map-zoom])',
 'src/blocks.json': 'AUD-016: 005-kivo-ns أوّلاً · AUD-013: 566-print-core بعد 565',
 'src/layouts/index.template.html': 'AUD-013/016: علامتا الكتلتين الجديدتين',
 'src/services/566-print-core.js': 'AUD-013: النواةُ المشتركة (اتحادُ البانيين بخياراتٍ أربعة) — المحتوى كاملاً مراجَع · البرهانُ السلوكي k258print',
}
canon = json.loads(run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--canon', TAG] + [f for f in CODE + ['src/services/566-print-core.js'] if f in NSFILES]).stdout or '{}')
fps = {}
for name in CODE + ['src/services/566-print-core.js']:
    if name in canon:
        c = canon[name]; d = ''.join(difflib.unified_diff((c['ref'] or '').splitlines(True), (c['cur'] or '').splitlines(True), TAG + ':' + name, name, n=3)).encode('utf-8'); kind = 'canonical'
    else:
        d = gitb('diff', '--no-color', TAG, '--', name); kind = 'git'
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'kind': kind, 'why': REASONS.get(name, '')}
if FREEZE:
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k258diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملفٍّ يدوي (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة', json.dumps({'changed-since-review': bad}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب')
cd = canon.get('src/core/270-bs-ver.js', {})
ok(cd and cd.get('ref') == 'window.__BS_VER = "2026.10.10-257";' and cd.get('cur') == 'window.__BS_VER = "2026.10.10-258";', '   270 قانونياً: رقمُ الإصدار وحده (257 → 258)', json.dumps(cd, ensure_ascii=False)[:200])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
