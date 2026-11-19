#!/usr/bin/env python3
"""V7 · د5-ب — سجلُّ العقود وماسحُ العزل.
  python3 tools/contracts.py --src src --check   يتحقق من كل العقود (شكلاً واتساقاً) — يُنادى من tools/generate.py --check؛ عقدٌ ناقص أو متناقض ⇒ خروج 1
  python3 tools/contracts.py --src src --scan    يطبع (JSON) كلَّ خرقٍ للعزل في المصدر الحالي — يقرؤه tests/isolation/isolation.test.mjs
العقد: src/systems/<key>/contract.json لكل برنامجٍ مفصول، وsrc/contracts/<key>.json لبرنامجٍ لم يُفصل بعد (يُنقل مع برنامجه).
  owns        مفاتيحُ البيانات التي يملكها البرنامج (لا يملك المفتاحَ برنامجان)
  provides    { read · events · commands · participants } بأسماءٍ مُصدَّرة «<key>.شيء@N»
  consumes    ما يستهلكه من غيره: اسمٌ مُصدَّر يوفّره عقدٌ آخر، أو «key:<مفتاح>» لقراءة مفتاحٍ يملكه غيرُه أو القاعدة — ولكلٍّ سلوكُ الغياب (absent)
  crossEffects  آثارُه العابرة (نصّ)
الماسح (تقريبٌ ساكن بالمفتاح الحرفي — حدٌّ أدنى): لكل برنامجٍ وملفاته، كلُّ سطرٍ يذكر مفتاحاً يملكه برنامجٌ آخر ولم يُعلَن في consumes خرقٌ
(read أو write بحسب نمط السطر)، وكلُّ إشارةٍ إلى مجلد برنامجٍ آخر (import)، وكلُّ نداءٍ للناقل باسمٍ غير معلن (bus)."""
import json, os, re, sys

KEY = re.compile(r'bassam_[a-z0-9_]+_v[0-9]+')
NAME = re.compile(r'^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+@[1-9][0-9]*$')
PENDING_DIRS = {'staff': 'modules/staff', 'plan': 'modules/plan', 'rounds': 'modules/daily', 'dreport': 'modules/dreport'}   # برامجُ لم تُفصل بعد: مجلدُ وحدتها
SCAN_EXT = ('.js', '.html', '.json', '.frag', '.css')
WRITE = [r'draft\.set\(\s*["\']%s', r'_opWrite\(\s*["\']%s', r'(?:related|_opRelated)\.%s\s*=', r'\.\.\.related,\s*%s\s*:', r'(?<![.\w"\'])%s\s*:\s*[A-Za-z_]', r'setItem\(\s*["\'][^"\']*%s', r'kvPut[A-Za-z]*\([^)]*%s']
GLOBAL_DEF = re.compile(r'(?:KIVO|window)\.([A-Z][A-Za-z0-9_]{3,})\s*=(?!=)')
GLOBAL_USE = re.compile(r'KIVO\.([A-Z][A-Za-z0-9_]{3,})\b')
ROLE_STAFF = re.compile(r'role\b[^;\n]{0,40}["\']staff["\']|["\']staff["\'][^;\n]{0,25}\brole\b')
# ── base-name (د5-د · قرار المراجع 4): الاسمُ يُعدّ **فقط حيث يُستعمل اسمَ برنامج**. %s = الاسم.
#    كلُّ قاعدةٍ هنا لها حالةٌ في tests/isolation/isolation.test.mjs. ما يطابق قاعدةَ استعمالٍ يُعدّ ولو طابق استبعاداً (الأحوط).
NAME_USE = [
    ('system-key',   r'\b\w*[oO]n\(\s*["\']%s["\']'),                                   # bsOn("x") · _on("x") · impOn("x") — سؤالُ «هل النظام مفعَّل» بمفتاحه
    ('system-field', r'\bsystem\s*(?::|={2,3}|!={1,2})\s*["\']%s["\']'),               # system: "x" · system === "x"
    ('pk',           r'\bpk\s*(?::|={1,3}|!={1,2})\s*["\']%s["\']|["\']%s["\']\s*(?:={2,3}|!={1,2})\s*pk\b'),   # pk: "x" · pk === "x"
    ('registry',     r'\b(?:module|page|nav)\s*:\s*["\']%s["\']'),                     # اسمُ صفحةٍ أو نظامٍ في سجل: module: "x" · page: "x" · nav: "x"
    ('go',           r'\b_?(?:bsGo|go|goto)\(\s*["\']%s["\']'),                        # الانتقالُ إلى صفحة البرنامج باسمها
    ('page-key',     r'\.key\s*(?:={2,3}|!={1,2})\s*["\']%s["\']|["\']%s["\']\s*(?:={2,3}|!={1,2})\s*\w+(?:\.\w+)*\.key\b'),   # البحثُ عن صفحة البرنامج في سجل الصفحات: "x" === p.key
    ('go-map',       r'["\']افتح[^"\']*["\']\s*:\s*["\']%s["\']'),                    # خريطةُ «افتح …» ← صفحة البرنامج (أزرار التنبيهات)
]
#    المستبعَد (ليس اسمَ برنامج وإن طابقه حرفاً) — يُصنَّف ليُكتب عددُه، ولا يُعدّ:
NAME_NOT = [
    ('perm-key', r'\bcap\s*:|\bcan\(|\b\w*[cC]ap\w*\(|\bleafOn\(|\b_?p(?:OK|Any|tOk)\(|\bk\s*:\s*["\']%s["\']|^\s*[\'"]bassam_\w+[\'"]\s*:\s*\['),   # مفتاحُ صلاحية: cap: · can( · capOnDept( · _bsCapOk( · leafOn( · _pOK( · k: "x" (شجرة) · قائمةُ أوراق القراءة
    ('role',     r'\brole\b'),                                                            # دورُ حساب: role === "staff"
]
def name_class(line, nm):
    """صنفُ ورود الاسم في السطر: ('use', القاعدة) يُعدّ · ('not', القاعدة) مستبعَد بقاعدته · ('other', '') كلمةٌ بالحروف نفسها لمعنى آخر."""
    q = re.escape(nm)
    for rid, pat in NAME_USE:
        if re.search(pat.replace('%s', q), line): return ('use', rid)
    for rid, pat in NAME_NOT:
        if re.search(pat.replace('%s', q), line): return ('not', rid)
    return ('other', '')
DCIMPORT = re.compile(r'<dc-import\s+name="([^"{]+)"')
BASE_EXT = ('.js', '.html', '.json', '.css', '.tpl')
BASE_SKIP_DIRS = ('pages', 'contracts', 'systems', 'schemas', 'fonts', 'img', 'assets')   # صفحاتٌ مولَّدة · العقود نفسُها · مجلدات البرامج (تُمسح مع برامجها)
BUS = re.compile(r'KIVO\.bus\.(provide|read|command|call|subscribe|publish|participant|participate|has)\(\s*["\']([^"\']+)["\']')

def load(S):
    out = {}
    sysdir = os.path.join(S, 'systems')
    for k in sorted(os.listdir(sysdir)):
        p = os.path.join(sysdir, k, 'contract.json')
        if not k.startswith('_') and os.path.isdir(os.path.join(sysdir, k)): out[k] = (p, 'systems/' + k)
    cdir = os.path.join(S, 'contracts')
    if os.path.isdir(cdir):
        for f in sorted(os.listdir(cdir)):
            if f.endswith('.json'): out[f[:-5]] = (os.path.join(cdir, f), PENDING_DIRS.get(f[:-5], ''))
    docs = {}
    for k, (p, d) in out.items():
        docs[k] = {'path': p, 'dir': d, 'doc': json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None}
    return docs

def provided(doc):
    names = {}
    for kind in ('read', 'events', 'commands'):
        for n in (doc.get('provides') or {}).get(kind) or {}: names[n] = kind
    return names

def base_registry(S):
    p = os.path.join(S, 'contracts', '_base.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None

def check(S):
    docs, bad, owner, every = load(S), [], {}, {}
    docs.pop('_base', None)
    for k, e in docs.items():
        d, rel = e['doc'], os.path.relpath(e['path'], S)
        if d is None: bad.append(rel + ': العقد غائب — لكل برنامجٍ عقد'); continue
        if d.get('schema') != 1 or d.get('system') != k: bad.append(rel + ': schema يجب أن يكون 1 وsystem = «%s»' % k)
        if not isinstance(d.get('version'), int) or d['version'] < 1: bad.append(rel + ': version عددٌ صحيح ≥ 1')
        for f, t in (('owns', list), ('provides', dict), ('consumes', dict), ('crossEffects', list)):
            if not isinstance(d.get(f), t): bad.append(rel + ': الحقل «%s» ناقص أو بنوعٍ خاطئ' % f)
        if any(not isinstance(d.get(f), t) for f, t in (('owns', list), ('provides', dict), ('consumes', dict))): continue
        for key in d['owns']:
            if not KEY.fullmatch(str(key)): bad.append(rel + ': مفتاحٌ بشكلٍ غير صحيح في owns: %s' % key)
            elif key in owner: bad.append(rel + ': المفتاح %s يملكه «%s» أيضاً — لا يملك المفتاحَ برنامجان' % (key, owner[key]))
            else: owner[key] = k
        for kind, table in d['provides'].items():
            if kind not in ('read', 'events', 'commands', 'participants') or not isinstance(table, dict): bad.append(rel + ': provides.%s غير معروف' % kind); continue
            for n in table:
                if kind == 'participants': continue
                if not NAME.match(n) or not n.startswith(k + '.'): bad.append(rel + ': الاسم «%s» يجب أن يكون «%s.شيء@N»' % (n, k))
                elif n in every: bad.append(rel + ': الاسم «%s» يوفّره «%s» أيضاً' % (n, every[n]))
                else: every[n] = k
    for k, e in docs.items():
        d, rel = e['doc'], os.path.relpath(e['path'], S)
        if not d or not isinstance(d.get('consumes'), dict) or not isinstance(d.get('provides'), dict): continue
        for n, spec in d['consumes'].items():
            if not isinstance(spec, dict) or not str(spec.get('absent', '')).strip(): bad.append(rel + ': «%s» بلا سلوك غياب (absent)' % n)
            if n.startswith('key:'):
                if not KEY.fullmatch(n[4:]): bad.append(rel + ': مفتاحٌ بشكلٍ غير صحيح: %s' % n)
                elif owner.get(n[4:]) == k: bad.append(rel + ': يستهلك مفتاحاً يملكه هو: %s' % n)
            elif not NAME.match(n): bad.append(rel + ': اسمٌ بشكلٍ غير صحيح في consumes: %s' % n)
            elif n not in every: bad.append(rel + ': يستهلك «%s» ولا عقدَ يوفّره' % n)
            elif every[n] == k: bad.append(rel + ': يستهلك ما يوفّره هو: %s' % n)
        for n in (d['provides'].get('participants') or {}):
            if not NAME.match(n) or every.get(n) is None or provided(docs[every[n]]['doc']).get(n) != 'events': bad.append(rel + ': يشارك في «%s» وليس حدثاً معلناً في عقد مالكه' % n)
    # موارد القاعدة المعلنة (src/contracts/_base.json): مفتاحٌ عامٌّ بلا مالكِ برنامج — لا يملكه عقدٌ ولا يُكرَّر
    B = base_registry(S)
    if B is not None:
        seen = set()
        if B.get('schema') != 1 or B.get('kind') != 'base' or not isinstance(B.get('resources'), list): bad.append('contracts/_base.json: schema 1 · kind base · resources قائمة')
        for r in (B.get('resources') or []):
            key = (r or {}).get('key', '')
            if not KEY.fullmatch(str(key)) or not str((r or {}).get('why', '')).strip(): bad.append('contracts/_base.json: موردٌ بلا مفتاحٍ صحيح أو بلا دليل (why): %s' % key)
            elif key in owner: bad.append('contracts/_base.json: %s معلنٌ موردَ قاعدة ويملكه «%s»' % (key, owner[key]))
            elif key in seen: bad.append('contracts/_base.json: %s مكرَّر' % key)
            seen.add(key)
    # عقدٌ في src/contracts لبرنامجٍ نُقل إلى مجلد نظامه يجب أن يُحذف (قرار المراجع 1 على د5-ب)
    cdir = os.path.join(S, 'contracts')
    if os.path.isdir(cdir):
        for f in sorted(os.listdir(cdir)):
            if f.endswith('.json') and not f.startswith('_') and os.path.isdir(os.path.join(S, 'systems', f[:-5])): bad.append('contracts/%s: البرنامج نُقل إلى systems/%s — احذف عقده من src/contracts' % (f, f[:-5]))
    # ملفاتُ برنامجٍ خارج مجلده (خدماتُه في القاعدة ريثما يُنقل): موجودةٌ ولا يدّعيها برنامجان
    claimed = {}
    for k, e in docs.items():
        for rel in ((e['doc'] or {}).get('files') or []):
            if not os.path.exists(os.path.join(S, rel)): bad.append('%s: الملف المعلن غير موجود: %s' % (os.path.relpath(e['path'], S), rel))
            elif rel in claimed: bad.append('%s: الملف %s يدّعيه «%s» أيضاً' % (os.path.relpath(e['path'], S), rel, claimed[rel]))
            else: claimed[rel] = k
    return docs, owner, every, bad

def files_of(S, d, extra=()):
    for rel in extra:
        p = os.path.join(S, rel)
        if os.path.exists(p): yield p
    root = os.path.join(S, d)
    for base, dirs, names in os.walk(root):
        dirs[:] = sorted(x for x in dirs if x != 'tests')
        for n in sorted(names):
            if n.endswith(SCAN_EXT) and n != 'contract.json': yield os.path.join(base, n)

def components(S, docs):
    """اسمُ مكوّن الصفحة ← البرنامج المالك (system.json للمفصول · modules.json بالـslug لغير المفصول)."""
    out = {}
    slugs = {os.path.basename(e['dir']): k for k, e in docs.items() if e['dir'].startswith('modules/')}
    try:
        for pg in json.load(open(os.path.join(S, 'modules', 'modules.json'), encoding='utf-8')).get('pages', []):
            if pg.get('slug') in slugs: out[pg['name']] = slugs[pg['slug']]
    except Exception: pass
    for k, e in docs.items():
        sj = os.path.join(S, e['dir'], 'system.json')
        if e['dir'].startswith('systems/') and os.path.exists(sj):
            c = (json.load(open(sj, encoding='utf-8')).get('client') or {}).get('component')
            if c: out[c] = k
    return out

def derived(S):
    """الملفاتُ المولَّدة (لا تُمسح: مصدرُها قالبٌ أو مولِّد) — من tools/generate.py --check نفسِه."""
    import subprocess
    r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'generate.py'), '--src', S, '--check'], capture_output=True, text=True, encoding='utf-8')
    out = set()
    for line in r.stdout.split('\n'):
        m = re.match(r'^  [=✘→] (\S(?:.*?\S)?)  ', line)
        if m: out.add(os.path.normpath(os.path.join(S, m.group(1))))
    return out

def scan(S):
    docs, owner, every, bad = check(S)
    found = {}
    def add(program, kind, rel, what):
        key = '|'.join((program, kind, rel, what)); found[key] = found.get(key, 0) + 1
    folders = {k: e['dir'] for k, e in docs.items() if e['dir']}
    comp = components(S, docs)
    texts, mine_files = {}, {}
    for k, e in docs.items():
        if not e['dir']: continue
        for p in files_of(S, e['dir'], (e['doc'] or {}).get('files') or ()):
            # ملفٌ يولَّد من قالب (src/slots/<المسار>.tpl): مصدرُ البرنامج هو القالب — المولَّدُ يحمل قطعَ أنظمةٍ أخرى محقونةً فلا يُمسح
            twin = os.path.join(S, 'slots', os.path.relpath(p, S) + '.tpl')
            if os.path.exists(twin): p = twin
            try: texts[p] = open(p, encoding='utf-8').read().split('\n')
            except UnicodeDecodeError: continue
            mine_files[os.path.normpath(p)] = k
    # الخدماتُ العامة (KIVO.X = …) التي يعرّفها كلُّ برنامجٍ في ملفاته
    glob_owner = {}
    for p, lines in texts.items():
        for line in lines:
            for g in GLOBAL_DEF.findall(line): glob_owner.setdefault(g, mine_files[os.path.normpath(p)])
    for p, lines in texts.items():
        k = mine_files[os.path.normpath(p)]; d = docs[k]['doc'] or {}
        declared = set(d.get('consumes') or {}); mine = provided(d); parts = set((d.get('provides') or {}).get('participants') or {})
        rel = os.path.relpath(p, S).replace(os.sep, '/')
        for line in lines:
            for key in set(KEY.findall(line)):
                o = owner.get(key)
                if o is None or o == k or ('key:' + key) in declared: continue
                add(k, 'write' if any(re.search(w % re.escape(key), line) for w in WRITE) else 'read', rel, key)
            for other, folder in folders.items():
                if other != k and (folder + '/') in line.replace('\\', '/'): add(k, 'import', rel, other)
            for g in set(GLOBAL_USE.findall(line)):
                if g in glob_owner and glob_owner[g] != k: add(k, 'call', rel, g)   # استدعاءُ خدمةِ برنامجٍ آخر
            for c in DCIMPORT.findall(line):
                if c in comp and comp[c] != k: add(k, 'dcimport', rel, c)            # تضمينُ صفحةِ برنامجٍ آخر
            for verb, name in BUS.findall(line):
                ok = name in mine if verb in ('provide', 'command', 'publish') else name in parts if verb == 'participant' else (name in declared or name in mine)
                if not ok: add(k, 'bus', rel, verb + ' ' + name)
    # ── ما تعرفه القاعدة عن البرامج: كلُّ ملفِ مصدرٍ ليس لبرنامجٍ ولا مولَّداً ──
    gen = derived(S)
    skip = set()
    try:
        for x in json.load(open(os.path.join(os.path.dirname(S), 'tests', 'removal', 'names.allow.json'), encoding='utf-8')).get('skipFiles', []): skip.add(os.path.normpath(os.path.join(os.path.dirname(S), x['file'])))
    except Exception: pass
    roots = [S, os.path.join(os.path.dirname(S), 'workers', 'parts')]
    names = sorted(set(os.path.basename(f) for f in folders.values()) | set(folders))   # أسماءُ البرامج ومجلداتها (staff · plan · daily · rounds · dreport · tasks …)
    tally = {}
    NAMEQ = re.compile(r'["\'](' + '|'.join(re.escape(n) for n in names) + r')["\']') if names else None
    for root in roots:
        for base, dirs, fnames in os.walk(root):
            relb = os.path.relpath(base, S).replace(os.sep, '/')
            if root == S:
                dirs[:] = sorted(x for x in dirs if not (relb == '.' and x in BASE_SKIP_DIRS))
            for n in sorted(fnames):
                p = os.path.normpath(os.path.join(base, n))
                if not n.endswith(BASE_EXT) or p in mine_files or p in gen or p in skip: continue
                if any(p.startswith(os.path.normpath(os.path.join(S, f)) + os.sep) for f in folders.values()): continue
                try: lines = open(p, encoding='utf-8').read().split('\n')
                except UnicodeDecodeError: continue
                rel = os.path.relpath(p, os.path.dirname(S)).replace(os.sep, '/')
                for line in lines:
                    for key in set(KEY.findall(line)):
                        if key in owner: add('base', 'base-key', rel, key)
                    for g in set(GLOBAL_USE.findall(line)):
                        if g in glob_owner: add('base', 'base-call', rel, g)
                    for c in DCIMPORT.findall(line):
                        if c in comp: add('base', 'base-dcimport', rel, c)
                    if NAMEQ and n.endswith(('.js', '.tpl')) and not n.endswith(('.json.tpl', '.html.tpl')):
                        for nm in set(NAMEQ.findall(line)):
                            kind, rid = name_class(line, nm)
                            tally[(kind, rid)] = tally.get((kind, rid), 0) + 1
                            if kind == 'use': add('base', 'base-name', rel, nm)
    return {'errors': bad, 'violations': found, 'names': {k[0] + (':' + k[1] if k[1] else ''): v for k, v in sorted(tally.items())}}

def main():
    S = os.path.abspath(sys.argv[sys.argv.index('--src') + 1]) if '--src' in sys.argv else os.path.abspath('src')
    if '--scan' in sys.argv: print(json.dumps(scan(S), ensure_ascii=False, indent=1, sort_keys=True)); return
    docs, owner, every, bad = check(S)
    for b in bad: print('  ✘ ' + b)
    print(('✔ العقود: %d عقداً · %d مفتاحاً مملوكاً · %d اسماً مُصدَّراً' % (len(docs), len(owner), len(every))) if not bad else ('✘ %d خللاً في العقود' % len(bad)))
    sys.exit(1 if bad else 0)
if __name__ == '__main__': main()
