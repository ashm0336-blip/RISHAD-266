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

def check(S):
    docs, bad, owner, every = load(S), [], {}, {}
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
    return docs, owner, every, bad

def files_of(S, d):
    root = os.path.join(S, d)
    for base, dirs, names in os.walk(root):
        dirs[:] = sorted(x for x in dirs if x != 'tests')
        for n in sorted(names):
            if n.endswith(SCAN_EXT) and n != 'contract.json': yield os.path.join(base, n)

def scan(S):
    docs, owner, every, bad = check(S)
    found = {}
    def add(program, kind, rel, what):
        key = '|'.join((program, kind, rel, what)); found[key] = found.get(key, 0) + 1
    folders = {k: e['dir'] for k, e in docs.items() if e['dir']}
    for k, e in docs.items():
        d = e['doc'] or {}
        if not e['dir']: continue
        declared = set(d.get('consumes') or {}); mine = provided(d); parts = set((d.get('provides') or {}).get('participants') or {})
        for p in files_of(S, e['dir']):
            rel = os.path.relpath(p, S).replace(os.sep, '/')
            try: lines = open(p, encoding='utf-8').read().split('\n')
            except UnicodeDecodeError: continue
            for line in lines:
                for key in set(KEY.findall(line)):
                    o = owner.get(key)
                    if o is None or o == k or ('key:' + key) in declared: continue
                    add(k, 'write' if any(re.search(w % re.escape(key), line) for w in WRITE) else 'read', rel, key)
                for other, folder in folders.items():
                    if other != k and (folder + '/') in line.replace('\\', '/'): add(k, 'import', rel, other)
                for verb, name in BUS.findall(line):
                    ok = name in mine if verb in ('provide', 'command', 'publish') else name in parts if verb == 'participant' else (name in declared or name in mine)
                    if not ok: add(k, 'bus', rel, verb + ' ' + name)
    return {'errors': bad, 'violations': found}

def main():
    S = os.path.abspath(sys.argv[sys.argv.index('--src') + 1]) if '--src' in sys.argv else os.path.abspath('src')
    if '--scan' in sys.argv: print(json.dumps(scan(S), ensure_ascii=False, indent=1, sort_keys=True)); return
    docs, owner, every, bad = check(S)
    for b in bad: print('  ✘ ' + b)
    print(('✔ العقود: %d عقداً · %d مفتاحاً مملوكاً · %d اسماً مُصدَّراً' % (len(docs), len(owner), len(every))) if not bad else ('✘ %d خللاً في العقود' % len(bad)))
    sys.exit(1 if bad else 0)
if __name__ == '__main__': main()
