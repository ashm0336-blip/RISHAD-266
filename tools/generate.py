# -*- coding: utf-8 -*-
"""KIVO_249 · RM-4 (+ RM-2 خطوة ٣ و٢) — المولِّدُ الواحد للملفات المشتقّة داخل المصدر (حتميّ · بايتاً):
   python3 tools/generate.py --src src            يكتب الملفات المشتقّة في مكانها
   python3 tools/generate.py --src src --check    لا يكتب شيئاً: يولّد في الذاكرة ويقارن بالمُلتزَم (exit 1 عند أي فرق) — فحصُ CI
   المشتقّات (مصدرُ الحقيقة → الناتج):
     registry/registry-v24.9.json + registry/engine.js + registry/targets.json → client/js/340-registry-v24-9.js · workers/parts/004-registry-2.js   (AUD-011)
     workers/parts/*.js بترتيب workers/parts.json                              → root/_worker.js                                                     (ADR-006 · الأجزاءُ مصدرُ الحقيقة)
     modules/<slug>/{meta.json,helmet.css,view.html,logic.js}                  → client/pages/<name>.dc.html (esbuild minify للمضغوطة أصلاً)         (AUD-007)
     migrations/NNNN_<name>.sql (KIVO_249)                                     → workers/parts/051a-schema-migrations.js (KIVO_MIGRATIONS · KIVO_SCHEMA_VERSION)  (AUD-022 · ADR-011)
     schemas/api/bodies.schema.json                                         → workers/parts/051b-body-schemas.js (KIVO_BODY_SCHEMAS)
     services/332-find-day.js (pure marked search block)                    → workers/parts/018a-find-engine.js (KIVO_FIND)
     plugins/lenses/<key>/manifest.json (KIVO_259)                              → KIVO_MANIFEST.lenses (الواجهة) · workers/parts/006a-lens-plugins.js (KIVO_LENS_PLUGINS)  (AUD-030 · ADR-018)
   الترتيبُ مهم: السجلُّ قبل الضمّ لأن جزءَ الخادم 004 مشتقٌّ هو نفسُه."""
import os, sys, json, hashlib, subprocess, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# KIVO_251 · ADR-012: تخطيطُ المصدر من <src>/layout.json؛ غيابُه = التخطيطُ الانتقالي (k2NN/src). المساراتُ نسبيةٌ إلى <src> (وقد تبدأ بـ../ للجذر).
LEGACY = {'registry': 'registry', 'workersParts': 'workers/parts', 'workerOut': 'root/_worker.js', 'modules': 'modules', 'pages': 'client/pages', 'pagesManifest': 'manifests/pages.json', 'pageManifestBlock': 'client/js/255-page-manifest.js', 'migrations': 'migrations'}
def layout(S):
    L = dict(LEGACY); p = os.path.join(S, 'layout.json')
    if os.path.exists(p): L.update(json.load(open(p, encoding='utf-8'))); L.setdefault('pageManifestBlock', 'manifests/255-page-manifest.js')
    return L
def norm(rel): return os.path.normpath(rel).replace(os.sep, '/')
sha = lambda b: hashlib.sha256(b).hexdigest()
def rd(p): return open(p, encoding='utf-8', newline='').read()
def rb(p): return open(p, 'rb').read()

def gen_registry(S):
    R = layout(S)['registry']
    spec = json.load(open(os.path.join(S, R, 'targets.json'), encoding='utf-8'))
    obj = json.load(open(os.path.join(S, R, spec['source']), encoding='utf-8'))
    engine = rd(os.path.join(S, R, spec['engine']))
    data = 'var KIVO_REGISTRY_DATA = ' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';\n'
    return {norm(t['file']): (t['header'] + data + engine + t['tail']).encode('utf-8') for t in spec['targets']}

def gen_worker(S, produced):
    L = layout(S); PD = norm(L['workersParts'])
    manifest = json.load(open(os.path.join(S, PD, '..', 'parts.json'), encoding='utf-8'))
    order = manifest['parts']
    def part(f):
        rel = PD + '/' + f
        return produced[rel] if rel in produced else rb(os.path.join(S, rel))
    worker = b''.join(part(p['file']) for p in order)
    line = 1
    for entry in order:
        data = part(entry['file'])
        count = len(data.splitlines())
        entry.update({'lines': [line, line + count - 1], 'bytes': len(data), 'sha256': sha(data)})
        line += count
    manifest['sha256'] = sha(worker)
    return {
        norm(L['workerOut']): worker,
        norm(PD + '/../parts.json'): (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8'),
    }

def gen_pages(S):
    import tempfile, shutil
    t = tempfile.mkdtemp(prefix='k246gen_')
    L = layout(S)
    r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'page_modules.py'), 'join', os.path.join(S, L['modules']), t, '--minify'], capture_output=True, text=True, encoding='utf-8')
    if r.returncode != 0: raise SystemExit('pages join failed: ' + (r.stderr or r.stdout)[-400:])
    out = {norm(L['pages']) + '/' + f: rb(os.path.join(t, f)) for f in sorted(os.listdir(t))}
    shutil.rmtree(t); return out

def main():
    S = os.path.abspath(sys.argv[sys.argv.index('--src') + 1]); check = '--check' in sys.argv
    produced = {}
    produced.update(gen_registry(S)); produced.update(gen_worker(S, produced)); produced.update(gen_pages(S))
    bad = []
    for rel, data in sorted(produced.items()):
        p = os.path.join(S, rel); cur = rb(p) if os.path.exists(p) else None
        if cur == data: print('  = ' + rel + '  ' + sha(data)[:12] + '  (' + str(len(data)) + ' B)'); continue
        if check: bad.append(rel); print('  ✘ ' + rel + '  committed ' + (sha(cur)[:12] if cur else '(missing)') + ' ≠ generated ' + sha(data)[:12]); continue
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(data); print('  → ' + rel + '  written ' + sha(data)[:12] + '  (' + str(len(data)) + ' B)')
    if check:
        print(('✔ generated = committed for all %d derived files' % len(produced)) if not bad else ('✘ %d derived file(s) differ from their source: %s' % (len(bad), ', '.join(bad))))
        sys.exit(1 if bad else 0)
    print('generated', len(produced), 'derived files →', S)
# (الاستدعاء في الأسفل بعد توسعة 247)

# ── KIVO_247 · AUD-015: manifest الصفحات → كتلة الواجهة + PG_REG في جزء الخادم ─────────────────────────────────────────
def gen_manifest(S):
    M = json.load(open(os.path.join(S, layout(S)['pagesManifest']), encoding='utf-8'))
    data = {k: (M[k] if k != 'lenses' else lenses_of(S, M)) for k in ('version', 'pages', 'containers', 'lenses', 'tabAddr', 'navOrder', 'navNames', 'routeNames')}
    js = ('/* ═══ KIVO_247 · AUD-015 — manifest الصفحات: المصدرُ الواحد لسجل الصفحات (PAGE_REG) والحاويات (NAV_REG) والعدسات (LENS_REG) وعناوين التبويبات\n'
          '   (TAB_ADDR) وترتيب القائمة وأسمائها (NAVKEYS · NAVNAMES) وأسماء المسارات (_pageNames) — مولَّدٌ من manifests/pages.json بأداة tools/generate.py؛ لا يُحرَّر يدوياً.\n'
          '   المستهلكون (330-auth-perm · 260-bassam-plat · root-logic) يأخذون نسخاً عميقة clone(key) فتبقى مستقلةً كما كانت أدبياتُهم. الخادم يُولَّد منه PG_REG (البنية وحدها). ═══ */\n'
          'window.KIVO_MANIFEST = (function (M) {\n'
          '  function clone(x) { return JSON.parse(JSON.stringify(x)); }\n'
          '  return { version: M.version, clone: function (k) { if (!(k in M)) throw new Error("KIVO_MANIFEST: unknown key " + k); return clone(M[k]); }, keys: Object.keys(M) };\n'
          '})(' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ');\n')
    # PG_REG في الخادم: السطور بين لافتة «سجل الصفحات» و var PG_OF — بالصيغة الحرفية القائمة
    def pg(p):
        o = "  { key: '" + p['key'] + "'"
        if p.get('subs'): o += ", subs: [" + ', '.join("'" + x['key'] + "'" for x in p['subs']) + "]"
        if p.get('tabs'): o += ", tabs: [" + ', '.join("'" + x['key'] + "'" for x in p['tabs']) + "]"
        # KIVO_261 (SOT-003): offPage على الأوراق كلِّها (subs وtabs) — الواجهةُ (isOffPage) تقرأ الاثنين، فالخادمُ مثلُها (كان tabs وحدها)
        off = [x['key'] for x in (p.get('subs') or []) + (p.get('tabs') or []) if x.get('offPage')]
        if off: o += ", off: [" + ', '.join("'" + x + "'" for x in off) + "]"
        if p.get('under'): o += ", under: '" + p['under'] + "'"
        return o + ' }'
    reg = 'var PG_REG = [\n' + ',\n'.join(pg(p) for p in M['pages']) + '\n];\n'
    return {norm(layout(S)['pageManifestBlock']): js.encode('utf-8')}, reg

def splice_pg(S, produced, reg):
    """يضع PG_REG المولَّد في جزء الخادم الذي يحمل اللافتة (بين اللافتة و var PG_OF) — ويعيد الجزء المعدَّل ضمن المشتقّات."""
    MARK = '/* ── سجل الصفحات: مرآة PAGE_REG في الواجهة (البنية وحدها، بلا أسماء العرض) ── */\n'
    PD = norm(layout(S)['workersParts'])
    for f in sorted(os.listdir(os.path.join(S, PD))):
        rel = PD + '/' + f; t = rd(os.path.join(S, rel))
        if MARK in t:
            i = t.index(MARK) + len(MARK); j = t.index('var PG_OF = {}', i)
            produced[rel] = (t[:i] + reg + t[j:]).encode('utf-8'); return
    raise SystemExit('PG_REG marker not found in worker parts')

# ── KIVO_259 · AUD-030 · SOT-089: العدساتُ إضافات (plugins/lenses/<key>/manifest.json · ADR-018) ─────────────────────────────────────
# الواجهة: LENS_REG = KIVO_MANIFEST.lenses من الإضافات (كان pages.json.lenses) · الخادم: جزءٌ مشتقّ KIVO_LENS_PLUGINS تستهلكه طبقةُ الإنفاذ.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plugins as _PL
LENS_PART = '006a-lens-plugins.js'
def lenses_of(S, M):
    P = _PL.load(S)
    if not P: return M['lenses']                      # التخطيطُ الانتقالي: pages.json.lenses
    if 'lenses' in M: raise SystemExit('pages.json.lenses and plugins/lenses both present — one source only (ADR-018)')
    return [{'key': m['key'], 'name': m['name']} for m in P]
def gen_lens_part(S):
    if not _PL.load(S): return {}
    js = ('/* ═══ KIVO_259 · AUD-030 · SOT-089 — العدساتُ إضافات: مولَّدٌ من plugins/lenses/<key>/manifest.json بأداة tools/generate.py (tools/plugins.py)؛ لا يُحرَّر يدوياً.\n'
          '   تستهلكه طبقةُ الإنفاذ وحدها: ربطُ مفتاح العدسة بعدستها (enfIx) · أعمدةُ العناصر وأقنعةُ حقول العدسات في الإسقاط والدمج (061) · عدساتُ /api/authz me · إعادةُ تصنيف\n'
          '   حقول العدسات الجديدة. الوحداتُ المرجعية v24.9 (الحرّاس 006 · البناء 008) كما هي — وجداولُها = هذا الملف للعدسات المضمَّنة فيها (tools/plugins.py ④). ═══ */\n'
          'var KIVO_LENS_PLUGINS = ' + json.dumps(_PL.table(S), ensure_ascii=False, separators=(',', ':')) + ';\n')
    return {norm(layout(S)['workersParts']) + '/' + LENS_PART: js.encode('utf-8')}

# ── KIVO_249 · AUD-022: الترحيلاتُ المرقَّمة → جزءُ الخادم (KIVO_MIGRATIONS) ───────────────────────────────────────────────
MIG_PART = '051a-schema-migrations.js'
def split_sql(text):
    """يقسم ملف SQL إلى عبارات: يُسقط أسطر التعليق (--) والفراغ، ويقطع عند ; في نهاية السطر. (لا فاصلةَ منقوطة داخل القيم في ملفاتنا — يُتحقَّق منه)"""
    stmts, cur = [], []
    for line in text.split('\n'):
        s = line.rstrip()
        if not s.strip() or s.strip().startswith('--'): continue
        cur.append(s.strip())
        if s.rstrip().endswith(';'):
            st = ' '.join(cur); stmts.append(st[:-1].strip()); cur = []
    if cur: raise SystemExit('migration statement without terminating ; → ' + ' '.join(cur)[:120])
    return stmts
def gen_migrations(S):
    d = os.path.join(S, layout(S)['migrations'])
    if not os.path.isdir(d): return {}
    files = sorted(f for f in os.listdir(d) if f.endswith('.sql'))
    for i, f in enumerate(files):
        m = __import__('re').match(r'^(\d{4})_[a-z0-9_]+\.sql$', f)
        if not m or int(m.group(1)) != i + 1: raise SystemExit('migrations must be NNNN_name.sql, contiguous from 0001: ' + f)
    migs = [{'name': f[:-4], 'sql': split_sql(rd(os.path.join(d, f)))} for f in files]
    for m in migs:
        if not m['sql']: raise SystemExit('empty migration ' + m['name'])
        for st in m['sql']:
            if ';' in st: raise SystemExit('semicolon inside statement in ' + m['name'] + ': ' + st[:80])
    js = ('/* ═══ KIVO_249 · AUD-022 — الترحيلاتُ المرقَّمة (schema): مولَّدةٌ من migrations/NNNN_<name>.sql بأداة tools/generate.py؛ لا تُحرَّر يدوياً.\n'
          '   يطبّقها initDb (052) مرّةً لكل قاعدة بترتيبها ويسجّل كلَّ اسمٍ في d1_migrations (جدولُ wrangler نفسُه) — فيتبادل العاملُ وwrangler d1 migrations apply السجلَّ نفسَه.\n'
          '   KIVO_SCHEMA_VERSION = عددُ الترحيلات المعروفة لهذا الإصدار؛ meta.schema_version يختمه آخرُ ترحيلٍ مطبَّق. ═══ */\n'
          'var KIVO_MIGRATIONS = ' + json.dumps(migs, ensure_ascii=False, indent=1) + ';\n'
          'var KIVO_SCHEMA_VERSION = ' + str(len(migs)) + ';\n')
    return {norm(layout(S)['workersParts']) + '/' + MIG_PART: js.encode('utf-8')}

def gen_body_schemas(S):
    """Keep the worker validator's data in sync with the canonical request contracts."""
    source = os.path.join(S, 'schemas', 'api', 'bodies.schema.json')
    if not os.path.isfile(source): return {}
    bodies = json.load(open(source, encoding='utf-8'))['bodies']
    rel = norm(layout(S)['workersParts']) + '/051b-body-schemas.js'
    declaration = 'var KIVO_BODY_SCHEMAS = ' + json.dumps(bodies, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + ';'
    content, count = re.subn(r'^var KIVO_BODY_SCHEMAS = \{[^\n]*\};$', lambda _: declaration, rd(os.path.join(S, rel)), flags=re.MULTILINE)
    if count != 1: raise SystemExit('expected one KIVO_BODY_SCHEMAS declaration in ' + rel)
    return {rel: content.encode('utf-8')}

def gen_department_permission_slice(S):
    """Reuse the existing department permission slicing policy in the Worker."""
    source = os.path.join(S, 'services', '320-dept-storage.js')
    if not os.path.isfile(source): return {}
    result = subprocess.run([os.environ.get('KIVO_NODE', 'node'), os.path.join(ROOT, 'tools', 'dept_permission_slice.mjs'), S], capture_output=True, text=True, encoding='utf-8')
    if result.returncode: raise SystemExit('permission slice generation failed: ' + result.stderr[-600:])
    return {norm(layout(S)['workersParts']) + '/051c-department-permission-slice.js': result.stdout.encode('utf-8')}

def gen_find_engine(S):
    """Derive the same pure search engine used by the UI; never fork its policy."""
    source_path = os.path.join(S, 'services', '332-find-day.js')
    if not os.path.isfile(source_path): return {}
    source = rd(source_path)
    begin = '/* @@KIVO_FIND_SHARED_BEGIN — the Worker derives this pure engine; one source. */'
    end = '/* @@KIVO_FIND_SHARED_END */'
    if source.count(begin) != 1 or source.count(end) != 1:
        raise SystemExit('expected one marked pure Find engine in services/332-find-day.js')
    body = source.split(begin, 1)[1].split(end, 1)[0].strip()
    if body.count('KIVO.BassamFind = {') != 1 or not body.startswith('(function(){') or not body.endswith('})();'):
        raise SystemExit('shared Find engine boundary/export changed; review generation')
    body = body.replace('KIVO.BassamFind = {', 'return {', 1)
    if re.search(r'\b(?:window|document|localStorage|sessionStorage|KIVO)\s*[.\[]', body):
        raise SystemExit('shared Find engine must remain independent of browser state')
    data = '/* Generated from the marked pure engine in src/services/332-find-day.js. Do not edit. */\nvar KIVO_FIND = ' + body + '\n'
    return {norm(layout(S)['workersParts']) + '/018a-find-engine.js': data.encode('utf-8')}

_main0 = main
def main():
    S = os.path.abspath(sys.argv[sys.argv.index('--src') + 1]); check = '--check' in sys.argv
    produced = {}
    produced.update(gen_registry(S)); produced.update(gen_migrations(S)); produced.update(gen_lens_part(S)); produced.update(gen_body_schemas(S)); produced.update(gen_department_permission_slice(S)); produced.update(gen_find_engine(S))
    if os.path.exists(os.path.join(S, layout(S)['pagesManifest'])):
        mj, reg = gen_manifest(S); produced.update(mj); splice_pg(S, produced, reg)
    produced.update(gen_worker(S, produced)); produced.update(gen_pages(S))
    bad = []
    for rel, data in sorted(produced.items()):
        p = os.path.join(S, rel); cur = rb(p) if os.path.exists(p) else None
        if cur == data: print('  = ' + rel + '  ' + sha(data)[:12] + '  (' + str(len(data)) + ' B)'); continue
        if check: bad.append(rel); print('  ✘ ' + rel + '  committed ' + (sha(cur)[:12] if cur else '(missing)') + ' ≠ generated ' + sha(data)[:12]); continue
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(data); print('  → ' + rel + '  written ' + sha(data)[:12] + '  (' + str(len(data)) + ' B)')
    if check:
        print(('✔ generated = committed for all %d derived files' % len(produced)) if not bad else ('✘ %d derived file(s) differ from their source: %s' % (len(bad), ', '.join(bad))))
        # KIVO_252 · SOT-101: مخطّطاتُ ملفات الإعداد (src/schemas) — تُفحص مع --check حين تكون متاحة
        if _PL.load(S):
            rp = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plugins.py'), 'check', '--src', S], capture_output=True, text=True, encoding='utf-8'); print(rp.stdout.strip().split('\n')[-1])
            if rp.returncode: bad.append('plugins')
        if os.path.isdir(os.path.join(S, 'schemas')):
            rv = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'validate_schemas.py'), S], capture_output=True, text=True, encoding='utf-8'); print(rv.stdout.strip())
            if rv.returncode: bad.append('schemas')
        sys.exit(1 if bad else 0)
    print('generated', len(produced), 'derived files →', S)
if __name__ == '__main__': main()
