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
(read أو write بحسب نمط السطر)، وكلُّ إشارةٍ إلى مجلد برنامجٍ آخر (import)، وكلُّ نداءٍ للناقل باسمٍ غير معلن (bus).
V7 · د5-ح (القفل) — وما كان أعمى عنه: أحداثُ الصفحة (dom · base-dom) · المفتاحُ المبنيُّ بلا ذكره حرفاً (dynkey · base-dynkey) ·
روابطُ سجلّ الصلاحيات في غير المفتاح (perm · base-perm) · سياساتُ via. والإعلاناتُ المقابلة في consumes:
  dom:<الحدث> {from: مالكُه, absent}   (ومالكُه يعلنه في provides.dom)
  perm:<برنامج> {absent}               عملياتُ permissions.json تمسّ صفوفَه أو أوراقَه أو روابطَه (needs/with) — إعلانٌ بلا عمليةٍ تمسّه خلل
  via:<مفتاح> {absent}                 كتابةٌ محدودة (via) في موردٍ يملكه غيري"""
import glob, json, os, re, sys

KEY = re.compile(r'bassam_[a-z0-9_]+_v[0-9]+')
NAME = re.compile(r'^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+@[1-9][0-9]*$')
PENDING_DIRS = {}   # برامجُ لم تُفصل بعد: مجلدُ وحدتها
SCAN_EXT = ('.js', '.html', '.json', '.frag', '.css')
WRITE = [r'draft\.set\(\s*["\']%s', r'_opWrite\(\s*["\']%s', r'(?:related|_opRelated)\.%s\s*=', r'\.\.\.related,\s*%s\s*:', r'(?<![.\w"\'])%s\s*:\s*[A-Za-z_]', r'setItem\(\s*["\'][^"\']*%s', r'kvPut[A-Za-z]*\([^)]*%s']
GLOBAL_DEF = re.compile(r'(?:KIVO|window)\.([A-Z][A-Za-z0-9_]{3,})\s*=(?!=)')
GLOBAL_USE = re.compile(r'KIVO\.([A-Z][A-Za-z0-9_]{3,})\b')
ROLE_STAFF = re.compile(r'role\b[^;\n]{0,40}["\']staff["\']|["\']staff["\'][^;\n]{0,25}\brole\b')
# ── base-name (د5-د · قرار المراجع 4 — ود5-د2 · قرار 3): الاسمُ يُعدّ **فقط حيث يُستعمل اسمَ برنامج**. %s = الاسم.
#    قائمةٌ واحدة مرتَّبة: أولُ قاعدةٍ تطابق السطر تحسم (use = يُعدّ · not = لا يُعدّ). لا ورودَ بلا قاعدة: «معنى آخر» بلا قاعدةٍ ليس دليلاً —
#    الاختبار يفشل إن بقي ورودٌ غير مصنَّف (other). كلُّ قاعدةٍ لها حالةٌ في tests/isolation/isolation.test.mjs.
_Q = r'["\']%s["\']'
NAME_RULES = [
    # ── يُعدّ: الاسمُ اسمُ برنامج (نظامٌ · صفحة · تبويب · نوعُ تنبيه) ──
    ('use', 'system-key',   r'\b\w*[oO]n\(\s*' + _Q),                                             # bsOn("x") · _on("x") · impOn("x") — «هل النظام مفعَّل» بمفتاحه
    ('use', 'system-field', r'\bsystem\s*(?::|={2,3}|!={1,2})\s*' + _Q),                          # system: "x" · system === "x"
    ('use', 'pk',           r'\bpk\s*(?::|={1,3}|!={1,2})\s*' + _Q + r'|' + _Q + r'\s*(?:={2,3}|!={1,2})\s*pk\b'),
    ('use', 'registry',     r'\b(?:module|page|nav|key|tab)\s*:\s*' + _Q),                        # مدخلُ سجل: module/page/nav/key/tab: "x"
    ('use', 'go',           r'\b_?(?:bsGo|go|goto)\(\s*' + _Q),                                   # الانتقالُ إلى صفحة البرنامج
    ('use', 'page-key',     r'\.key\s*(?:={2,3}|!={1,2})\s*' + _Q + r'|' + _Q + r'\s*(?:={2,3}|!={1,2})\s*\w+(?:\.\w+)*\.key\b'),
    ('use', 'go-map',       r'["\']افتح[^"\']*["\']\s*:\s*(?:\[\s*)?' + _Q),                      # «افتح …» ← صفحة البرنامج (نصاً أو [صفحة، تبويب])
    ('use', 'active-page',  r'\bap\s*(?:={2,3}|!={1,2})\s*' + _Q),                                # الصفحةُ النشطة: ap === "x"
    ('use', 'nav-item',     r'\b(?:cls|tip)\(\s*' + _Q + r'|\bcls\(\s*["\']\w+["\']\s*,\s*' + _Q), # عنصرُ القائمة الجانبية: cls("x", …) · tip("x")
    ('use', 'page-list',    r'["\'](?:employees|planning|kpis|links|admin|emps)["\']\s*,[^\]\n]*' + _Q + r'|' + _Q + r'\s*,[^\]\n]*["\'](?:employees|planning|kpis|links|admin)["\']'),   # قائمةُ صفحات/أوراق صفحات (ترتيبُ القائمة · الهبوط · أوراقُ الإدارة)
    ('use', 'nav-perm',     r'\b(?:employees|staffing|plan|daily|rep)\s*:\s*["\']\w+["\']\s*,?[^\n]*\b\w+\s*:\s*' + _Q + r'|(?:^|@@)\s*(?!role\b|kind\b)\w+\s*:\s*' + _Q + r'\s*,\s*$'),   # خريطةُ اسم ← ورقة: { staffing: "staff", plan: "plan" } · سطرُ خريطة «x: "x",»
    ('use', 'notif-leaf',   r'\bL\(\s*["\']\w+["\']\s*,\s*' + _Q),                                # نوعُ تنبيهٍ للبرنامج مكتوبٌ في القاعدة: L('pl_cap','plan',…)
    ('use', 'dept-tabs',    r'\bdeptTabs\([^)]*' + _Q),                                           # تبويباتُ صفحة البرنامج
    ('use', 'shape',        r'\bshape\s*:\s*' + _Q),                                              # شكلُ بيانات البرنامج في سجل عمليات الخادم
    ('use', 'scope-item',   r'\bid\s*:\s*' + _Q + r'\s*,\s*path\b'),                               # عنصرُ نطاقٍ باسم مورد البرنامج
    ('use', 'ident-container', r'\bcontainer\s*:\s*' + _Q + r'|\b(?:propagate|canonEmp)\(\s*' + _Q + r'|,\s*' + _Q + r'\]\]\.forEach'),   # وعاءُ البرنامج في تقرير ترحيل الهوية (014): container: 'rounds' · propagate('rounds', …) · canonEmp('rounds', …) — معرفةُ القاعدة بالبرنامج (تُنقل قطعاً في مجلده حين يُفصل)
    ('use', 'container-tab', r'\b_tabOk\(\s*' + _Q + r'|\bPT_TABS\b'),                            # تبويبُ البرنامج في الحاوية (يبقى حتى يُنقل برنامجُه)
    # ── لا يُعدّ: مفتاحُ صلاحيةٍ مماثل · دورُ حساب · كلمةٌ لمعنى آخر — كلٌّ بقاعدته ──
    ('not', 'role',         r'\brole\b|\bkind\s*(?::|={2,3})\s*["\']staff["\']|["\']staff["\']\s*={2,3}\s*[a-z]\b|\{\s*v\s*:\s*["\']staff["\']'),   # دورُ الحساب staff: role · kind: 'staff' · "staff" === r · خيارُ الدور {v:"staff"}
    ('not', 'perm-key',     r'\bcap\s*:|\bcan\(|\b\w*[cC]ap\w*\(|\bleafOn\(|\b_?p(?:OK|Any|tOk)\(|\bk\s*:\s*' + _Q + r'|^\s*[\'"]?bassam_\w+[\'"]?\s*:\s*[\[\'"]|\bbassam_\w+\s*:\s*' + _Q + r'|["\'][a-z]+/[a-zA-Z]+["\']|\bcap\)?\s*(?:\|\|\s*\[\])?\)?\.indexOf\(|\.indexOf\(\s*' + _Q + r'\s*\)|\bfield\s*={2,3}\s*' + _Q),   # مفتاحُ صلاحية/ورقة: cap: · can( · k: "x" · مورد ← ورقة · قائمةُ أوراق (فيها «صفحة/ورقة») · cap.indexOf("x") · field === 'x'
    ('not', 'local-state',  _Q + r'\s*(?:={2,3}|!={1,2})\s*(?:[a-z]\b|src\b|this\.state\.)|\b(?:[a-z]|src|act|host)\s*(?:={2,3}|!={1,2})\s*' + _Q + r'|\?\s*' + _Q + r'\s*:|:\s*' + _Q + r'\s*\)'),   # حالةٌ محلية تُقارَن بمتغيّرٍ محلي: تبويبٌ معروض · عدسة · مصدرُ عنصر · فعل ("plan" === e · act === 'plan' · P ? "plan" : …)
    ('not', 'guard-path',   _Q + r'\s*,\s*ctx\)'),                                                # وسمُ مسارٍ في مصنِّف الحراسة: classify(…, 'plan', ctx)
    ('not', 'audit-filter', r'\b(?:qA\.get|inp)\(\s*' + _Q + r'|%%"%s":"'),                       # حقلُ تصفيةٍ في سجل التدقيق: inp("plan", …) · qA.get('plan') · LIKE '%%"plan":"…'
    ('not', 'element-kind', r'\bfindEl\([^)]*' + _Q),                                             # نوعُ عنصرٍ على الخريطة
    ('not', 'bound-name',   r'\breturn\s+' + _Q + r'\s*;|\bswallow\(\s*' + _Q),                   # اسمُ حدٍّ/وسمُ خطأ: return 'rounds' (حدُّ الجولات في عقد الصور) · swallow('x', e)
    ('not', 'label-pair',   r'\[\s*' + _Q + r'\s*,\s*["\'][^"\']*[؀-ۿ]'),               # زوجُ (قيمة، تسمية عربية) في قائمة تصفية: ['plan', 'خطط الشهور']
    ('not', 'comment',      r'/\*[^\n]*' + _Q + r'|^\s*(?:\*|//)[^\n]*' + _Q + r'|' + _Q + r'\s*[·:]\s*["\']?\w*["\']?[^\n]*\*/'),   # نصٌّ داخل تعليق
]
def name_class(line, nm):
    """صنفُ ورود الاسم في السطر بأول قاعدةٍ تطابق: ('use', القاعدة) يُعدّ · ('not', القاعدة) لا يُعدّ · ('other', '') بلا قاعدة (الاختبار يرفضه)."""
    q = re.escape(nm)
    for kind, rid, pat in NAME_RULES:
        if re.search(pat.replace('%%', '\0').replace('%s', q).replace('\0', '%'), line): return (kind, rid)
    return ('other', '')
DCIMPORT = re.compile(r'<dc-import\s+name="([^"{]+)"')
BASE_EXT = ('.js', '.html', '.json', '.css', '.tpl')
BASE_SKIP_DIRS = ('pages', 'contracts', 'systems', 'schemas', 'fonts', 'img', 'assets')   # صفحاتٌ مولَّدة · العقود نفسُها · مجلدات البرامج (تُمسح مع برامجها)
BUS = re.compile(r'KIVO\.bus\.(provide|read|command|call|subscribe|publish|participant|participate|has)\(\s*["\']([^"\']+)["\']')
# ── V7 · د5-ح (القفل): ما كان الماسحُ أعمى عنه (44_د5-ب §76 · 45_د5-ج §90) ──
# (1) أحداثُ الصفحة (DOM) بين البرامج: حدثٌ مسمّى (فيه «:» أو «-») يُطلقه برنامجٌ (new CustomEvent/Event("…")) ويستمع له غيرُه (add/removeEventListener("…")).
#     مالكُ الحدث مَن يُطلقه؛ ما تُطلقه القاعدة حدثُ قاعدة يستمع له من شاء. مستمعٌ في برنامجٍ آخر بلا «dom:<الحدث>» في consumes ⇒ dom ·
#     مستمعٌ في القاعدة لحدثٍ لا يُطلقه إلا برنامج ⇒ base-dom.
DOM_FIRE = re.compile(r'\bnew\s+(?:Custom)?Event\(\s*["\']([A-Za-z][\w]*[:\-][\w:\-]+)["\']')
DOM_LISTEN = re.compile(r'\b(?:add|remove)EventListener\(\s*["\']([A-Za-z][\w]*[:\-][\w:\-]+)["\']')
# (2) الوصولُ غيرُ الحرفي للمفاتيح: بديلٌ في تعبيرٍ نمطي (bassam_(st|dr)_grp_v1 · bassam_(?:a|b)_v) وذيلُ مفتاحٍ في قائمةٍ تُبنى منها المفاتيح
#     ("rounds_v1" ثم "bassam_" + s) — يُحلّ إلى مفاتيح ويُعامَل كذكرها: dynkey (برنامج) · base-dynkey (القاعدة).
DYN_ALT = re.compile(r'bassam_\((?:\?:)?([a-z0-9_|]+)\)([a-z0-9_]*)')
DYN_TAIL = re.compile(r'["\'`]([a-z][a-z0-9_]*_v[0-9]+)["\'`]')
# (3) روابطُ سجلّ الصلاحيات في غير المفتاح: عمليةٌ في permissions.json تستهدف صفَّ برنامجٍ آخر أو ورقتَه أو تذكره (needs · with · references ·
#     managedIn · owner · leaf · asisMap · targets) ⇒ perm (بلا «perm:<البرنامج>» في consumes) · وما في بيانات القاعدة يذكر ورقةَ برنامج ⇒ base-perm ·
#     وسياسةُ via: منحُ برنامجٍ كتابةً محدودة في موردٍ يملكه غيرُه (قطعتُه تُحقن في سطر المورد، أو via: { <برنامج>: … }) ⇒ via (بلا «via:<المفتاح>»).
VIA_LIT = re.compile(r'\bvia\s*:\s*\{\s*([^}]*)')
VIA_NAME = re.compile(r'["\']?([A-Za-z][\w/]*)["\']?\s*:')
MARK_USE = re.compile(r'@@SYS:([A-Za-z0-9_.\-]+)')
PERM_FIELDS = ('references', 'managedIn', 'owner', 'leaf', 'asisMap', 'targets', 'mergedFrom', 'splitFrom')

DOM_NAME = re.compile(r'[A-Za-z][\w]*[:\-][\w:\-]+')
_PCTX = {}
def perm_ctx(S, docs):
    if S not in _PCTX: _PCTX[S] = perm_index(S) + (set(docs),)
    return _PCTX[S]
def perm_doc(S, e):
    pp = os.path.join(S, e['dir'], 'permissions.json') if e.get('dir') else ''
    return json.load(open(pp, encoding='utf-8')) if pp and os.path.exists(pp) else {}

def dyn_keys(line, owner):
    """المفاتيحُ المملوكة التي يبنيها السطرُ بلا ذكرها حرفاً."""
    out = set()
    for alts, tail in DYN_ALT.findall(line):
        for a in alts.split('|'):
            cand = 'bassam_' + a + tail
            out |= {k for k in owner if k == cand or (re.fullmatch(r'.*_v', cand) and k.startswith(cand) and re.fullmatch(r'[0-9]+', k[len(cand):]))}
    for t in DYN_TAIL.findall(line):
        if not t.startswith('bassam_') and ('bassam_' + t) in owner: out.add('bassam_' + t)
    return out

def perm_index(S):
    """مالكو بيانات الصلاحيات: {مفتاحُ الصف: البرنامج} و{معرّفُ الورقة/المالك: البرنامج} — القاعدةُ «base»."""
    rows, ids = {}, {}
    bp = os.path.join(S, 'permissions', 'registry', 'registry.base.json')
    if os.path.exists(bp):
        B = json.load(open(bp, encoding='utf-8'))
        for r in B.get('registry') or []: rows[r['key']] = 'base'; ids.setdefault(r.get('owner'), 'base')
        for o in B.get('owners') or []: ids[o['id']] = 'base'
    for p in sorted(glob.glob(os.path.join(S, 'systems', '*', 'permissions.json'))):
        d = json.load(open(p, encoding='utf-8')); k = d.get('system')
        for ops in (d.get('docs') or {}).values():
            for e in ops:
                v = e.get('value')
                if e.get('path') == ['registry'] and isinstance(v, dict): rows[v['key']] = k; ids.setdefault(v.get('owner'), k)
                elif e.get('path') == ['owners'] and isinstance(v, dict): ids[v['id']] = k
                elif e.get('path') == ['bindings'] and isinstance(v, dict) and 'key' in v: rows.setdefault(v['key'], k)
    ids.pop(None, None)
    return rows, ids

def id_owner(v, ids, programs):
    v = str(v).split(':')[0]
    if v in ids: return ids[v]
    head = v.split('/')[0]
    return ids.get(head) or (head if head in programs else None)

def perm_links(k, d, rows, ids, programs):
    """[(البرنامج الآخر, وصف)] لكل عمليةٍ في permissions.json لبرنامج k تمسّ بياناتِ برنامجٍ آخر."""
    out = []
    for doc, ops in (d.get('docs') or {}).items():
        for e in ops:
            hit = set()
            for st in e.get('path') or []:
                if isinstance(st, dict):
                    o = rows.get(st.get('eq')) if st.get('by') == 'key' else id_owner(st.get('eq'), ids, programs)
                    if o: hit.add(o)
            hit |= set(e.get('needs') or []) | set(e.get('with') or [])
            last = [x for x in (e.get('path') or []) if isinstance(x, str)]
            def walk(v, ctx):
                if isinstance(v, dict):
                    for a, b in v.items(): walk(b, a)
                elif isinstance(v, list):
                    for b in v: walk(b, ctx)
                elif isinstance(v, str) and ctx in PERM_FIELDS:
                    o = rows.get(v) if ctx in ('targets', 'mergedFrom', 'splitFrom') else id_owner(v, ids, programs)
                    if o: hit.add(o)
            for f in ('value', 'set'):
                if f in e: walk(e[f], last[-1] if last else '')
            for o in sorted(hit - {k, 'base'}): out.append((o, doc))
    return out

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
            if kind not in ('read', 'events', 'commands', 'participants', 'dom') or not isinstance(table, dict): bad.append(rel + ': provides.%s غير معروف' % kind); continue
            for n in table:
                if kind == 'participants': continue
                if kind == 'dom':   # د5-ح: حدثُ صفحةٍ (DOM) يُطلقه البرنامج ويستمع له غيرُه — اسمُه كما يُطلَق، بوصف
                    if not DOM_NAME.fullmatch(n) or not str(table[n]).strip(): bad.append(rel + ': provides.dom «%s» اسمُ حدثٍ غير صحيح أو بلا وصف' % n)
                    continue
                if not NAME.match(n) or not n.startswith(k + '.'): bad.append(rel + ': الاسم «%s» يجب أن يكون «%s.شيء@N»' % (n, k))
                elif n in every: bad.append(rel + ': الاسم «%s» يوفّره «%s» أيضاً' % (n, every[n]))
                else: every[n] = k
    # د5-د: أحداثُ القاعدة (src/contracts/_base.json ← events): حدثٌ يقع في مورد قاعدة فيشارك فيه برنامجٌ يتأثّر موردُه — «شيء.وقع@N» بلا اسم برنامج
    base_events = (base_registry(S) or {}).get('events') or {}
    for n, text in base_events.items():
        if not NAME.match(n) or not str(text).strip(): bad.append('contracts/_base.json: حدثٌ بشكلٍ غير صحيح أو بلا وصف: %s' % n)
        elif n in every or n.split('.')[0] in docs: bad.append('contracts/_base.json: الحدث «%s» يحمل اسمَ برنامج أو يوفّره «%s»' % (n, every.get(n, n.split('.')[0])))
    for k, e in docs.items():
        d, rel = e['doc'], os.path.relpath(e['path'], S)
        if not d or not isinstance(d.get('consumes'), dict) or not isinstance(d.get('provides'), dict): continue
        for n, spec in d['consumes'].items():
            if not isinstance(spec, dict) or not str(spec.get('absent', '')).strip(): bad.append(rel + ': «%s» بلا سلوك غياب (absent)' % n)
            if n.startswith('key:'):
                if not KEY.fullmatch(n[4:]): bad.append(rel + ': مفتاحٌ بشكلٍ غير صحيح: %s' % n)
                elif owner.get(n[4:]) == k: bad.append(rel + ': يستهلك مفتاحاً يملكه هو: %s' % n)
            elif n.startswith('perm:'):   # د5-ح: عملياتُ صلاحياتي تمسّ بياناتِ صلاحيات برنامجٍ آخر (needs/with) — بغيابه تُهمل
                if not re.fullmatch(r'[a-z]+', n[5:]) or n[5:] == k: bad.append(rel + ': perm:<برنامجٌ آخر> — %s' % n)
                elif n[5:] in docs and not any(o == n[5:] for o, _ in perm_links(k, perm_doc(S, e), *perm_ctx(S, docs))): bad.append(rel + ': «%s» معلنٌ ولا عمليةَ صلاحياتٍ تمسّه — احذفه' % n)
            elif n.startswith('via:'):    # د5-ح: سياسةُ via — كتابةٌ محدودة في موردٍ يملكه غيري
                if not KEY.fullmatch(n[4:]): bad.append(rel + ': مفتاحٌ بشكلٍ غير صحيح: %s' % n)
                elif owner.get(n[4:]) == k: bad.append(rel + ': via على موردٍ يملكه هو: %s' % n)
            elif n.startswith('dom:'):    # د5-ح: الاستماعُ لحدث صفحةٍ يُطلقه برنامجٌ آخر — from مالكُه
                src = str(spec.get('from', '')) if isinstance(spec, dict) else ''
                if not DOM_NAME.fullmatch(n[4:]) or not re.fullmatch(r'[a-z]+', src) or src == k: bad.append(rel + ': dom:<حدث> يلزمه from (برنامجٌ آخر): %s' % n)
                elif src in docs and n[4:] not in (((docs[src]['doc'] or {}).get('provides') or {}).get('dom') or {}): bad.append(rel + ': يستمع لـ«%s» ولا يعلنه عقدُ مالكه الحاضر «%s» (provides.dom)' % (n[4:], src))
            elif not NAME.match(n): bad.append(rel + ': اسمٌ بشكلٍ غير صحيح في consumes: %s' % n)
            elif n not in every:
                # د5-د: مالكُ الاسم (ما قبل النقطة الأولى) برنامجٌ غائب ⇒ ليس خللاً — سلوكُ الغياب (absent) مكتوبٌ أعلاه وهو ما يجري. مالكٌ حاضر لا يوفّره ⇒ خلل.
                if n.split('.')[0] in docs: bad.append(rel + ': يستهلك «%s» ولا يوفّره عقدُ مالكه الحاضر' % n)
            elif every[n] == k: bad.append(rel + ': يستهلك ما يوفّره هو: %s' % n)
        for n in (d['provides'].get('participants') or {}):
            if n in base_events and NAME.match(n): continue
            if NAME.match(n) and every.get(n) is None and n.split('.')[0] not in docs: continue   # د5-هـ: مالكُ الحدث برنامجٌ غائب ⇒ لا ناشرَ فلا مشاركة — كقاعدة consumes أعلاه
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

def pieces(S):
    """{اسمُ الفتحة: [(النظام, النص)]} — قطعُ الأنظمة (system.json ← slots · slots/*.slots.json)، لتتبّع ما يُحقن في سطر موردٍ لغيره (via)."""
    out = {}
    for sj in sorted(glob.glob(os.path.join(S, 'systems', '*', 'system.json'))):
        dd = os.path.dirname(sj); k = os.path.basename(dd)
        try: slots = dict(json.load(open(sj, encoding='utf-8')).get('slots') or {})
        except Exception: continue
        for g in sorted(glob.glob(os.path.join(dd, 'slots', '*.slots.json'))):
            for name, v in json.load(open(g, encoding='utf-8')).items():
                if name != '_note': slots.setdefault(name, []); slots[name] = (slots[name] if isinstance(slots[name], list) else [slots[name]]) + (v if isinstance(v, list) else [v])
        for name, v in slots.items():
            for it in (v if isinstance(v, list) else [v]):
                t = it.get('text') if 'text' in it else (open(os.path.join(dd, it['file']), encoding='utf-8').read() if os.path.exists(os.path.join(dd, it.get('file', ''))) else '')
                out.setdefault(name, []).append((k, t or ''))
    return out

def via_grants(line, owner, frags, programs, ids):
    """[(المستفيد, المفتاح)]: سياسةُ via في سطر موردٍ تمنح برنامجاً غيرَ مالكه — قطعةُ برنامجٍ محقونةٌ في السطر (فيها via أو السطرُ فيه via) أو via: { <برنامج>: … } حرفاً."""
    if '\\n' in line: return [x for sub in line.split('\\n') for x in via_grants(sub, owner, frags, programs, ids)]   # قطعةٌ في JSON: كلُّ سطرٍ من نصّها وحده
    keys = [x for x in KEY.findall(line) if x in owner]
    if not keys or 'via' not in line: return []
    out = []
    for m in MARK_USE.findall(line):
        for sysk, text in frags.get(m, []):
            if 'via' in text or 'via' in line: out += [(sysk, x) for x in keys]
    for body in VIA_LIT.findall(line):
        for g in VIA_NAME.findall(body):
            o = id_owner(g, ids, programs)
            if o and o != 'base': out += [(o, x) for x in keys]
    return [(g, x) for g, x in out if owner.get(x) != g]

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
            if not os.path.exists(twin): twin = p + '.tpl'   # د5-هـ: قالبُ النظام في مجلده (system.json ← templates)
            if os.path.exists(twin): p = twin
            try: texts[p] = open(p, encoding='utf-8').read().split('\n')
            except UnicodeDecodeError: continue
            mine_files[os.path.normpath(p)] = k
    # الخدماتُ العامة (KIVO.X = …) التي يعرّفها كلُّ برنامجٍ في ملفاته
    glob_owner = {}
    for p, lines in texts.items():
        for line in lines:
            for g in GLOBAL_DEF.findall(line): glob_owner.setdefault(g, mine_files[os.path.normpath(p)])
    programs = set(docs)
    frags = pieces(S); prow, pids = perm_index(S)
    dom = []   # (البرنامج أو base, rel, fire|listen, الاسم)
    uses, bdefs = {}, {}   # د5-ح: {الخدمة: {المستعمِل: rel}} · {ملفُّ القاعدة: خدماتُه}
    vias = {}  # (المستفيد, المفتاح) ← rel
    for p, lines in texts.items():
        k = mine_files[os.path.normpath(p)]; d = docs[k]['doc'] or {}
        declared = set(d.get('consumes') or {}); mine = provided(d); parts = set((d.get('provides') or {}).get('participants') or {})
        rel = os.path.relpath(p, S).replace(os.sep, '/')
        for line in lines:
            for key in set(KEY.findall(line)):
                o = owner.get(key)
                if o is None or o == k or ('key:' + key) in declared: continue
                wk = 'write' if any(re.search(w % re.escape(key), line) for w in WRITE) else 'read'
                if wk == 'read' and ('via:' + key) in declared: continue   # د5-ح: سياسةُ via المعلنة تذكر موردَها (لا تُجيز كتابتَه حرفاً)
                add(k, wk, rel, key)
            for key in dyn_keys(line, owner) - set(KEY.findall(line)):   # د5-ح: مفتاحٌ يُبنى بلا ذكره حرفاً
                o = owner.get(key)
                if o is None or o == k or ('key:' + key) in declared: continue
                add(k, 'dynkey', rel, key)
            for n in DOM_FIRE.findall(line): dom.append((k, rel, 'fire', n))
            for n in DOM_LISTEN.findall(line): dom.append((k, rel, 'listen', n))
            for g, key in via_grants(line, owner, frags, programs, pids): vias.setdefault((g, key), []).append(rel)
            for other, folder in folders.items():
                if other != k and (folder + '/') in line.replace('\\', '/'): add(k, 'import', rel, other)
            for g in set(GLOBAL_USE.findall(line)):
                uses.setdefault(g, {}).setdefault(k, rel)   # د5-ح: مَن يستعمل الخدمةَ العامة (لكشف قاعدةٍ لا يستعملها إلا برنامج)
                if g in glob_owner and glob_owner[g] != k: add(k, 'call', rel, g)   # استدعاءُ خدمةِ برنامجٍ آخر
            for c in DCIMPORT.findall(line):
                if c in comp and comp[c] != k: add(k, 'dcimport', rel, c)            # تضمينُ صفحةِ برنامجٍ آخر
            for verb, name in BUS.findall(line):
                ok = name in mine if verb in ('provide', 'command', 'publish') else name in parts if verb == 'participant' else (name in declared or name in mine)
                if not ok: add(k, 'bus', rel, verb + ' ' + name)
    # د5-ح: روابطُ سجلّ الصلاحيات (permissions.json) — عمليةٌ لكل سطر
    for k, e in docs.items():
        pp = os.path.join(S, e['dir'], 'permissions.json') if e['dir'] else ''
        if not pp or not os.path.exists(pp): continue
        declared = set((e['doc'] or {}).get('consumes') or {})
        for o, doc in perm_links(k, json.load(open(pp, encoding='utf-8')), prow, pids, programs):
            if ('perm:' + o) not in declared: add(k, 'perm', e['dir'] + '/permissions.json', o)
    # ── ما تعرفه القاعدة عن البرامج: كلُّ ملفِ مصدرٍ ليس لبرنامجٍ ولا مولَّداً ──
    gen = derived(S)
    skip = set()
    try:
        for x in json.load(open(os.path.join(os.path.dirname(S), 'tests', 'removal', 'names.allow.json'), encoding='utf-8')).get('skipFiles', []): skip.add(os.path.normpath(os.path.join(os.path.dirname(S), x['file'])))
    except Exception: pass
    roots = [S, os.path.join(os.path.dirname(S), 'workers', 'parts'), os.path.join(os.path.dirname(S), 'workers', 'bindings')]   # د5-ح: وبياناتُ روابط الخادم (data.base.json) — كانت خارج المسح فسكن فيها مفتاحُ الجدول (st_grp)
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
                # د5-د2: ميثاقُ صفحة قاعدةٍ (meta.json ← charter.data) مشتقٌّ بأداةٍ من منطقها بعد حقن قطع الأنظمة — يذكر مفاتيحَ القطع المحقونة لا معرفةَ القاعدة؛ منطقُها يُمسح من قالبه
                if n == 'meta.json' and os.path.exists(os.path.join(S, 'slots', os.path.relpath(os.path.join(base, 'logic.js'), S) + '.tpl')): continue
                if any(p.startswith(os.path.normpath(os.path.join(S, f)) + os.sep) for f in folders.values()): continue
                try: text = open(p, encoding='utf-8').read()
                except UnicodeDecodeError: continue
                lines = text.split('\n')
                # د5-د2: اسمُ البرنامج داخل تعليقٍ /* … */ (ولو امتدّ أسطراً) ليس استعمالاً — يُفرَّغ التعليق قبل عدّ الأسماء (المفاتيحُ تُعدّ على النص كما هو)
                bare = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text, flags=re.S).split('\n') if n.endswith(('.js', '.tpl')) else lines
                rel = os.path.relpath(p, os.path.dirname(S)).replace(os.sep, '/')
                for li, line in enumerate(lines):
                    for key in set(KEY.findall(line)):
                        if key in owner: add('base', 'base-key', rel, key)
                    for key in dyn_keys(line, owner) - set(KEY.findall(line)):
                        add('base', 'base-dynkey', rel, key)
                    for nm in DOM_FIRE.findall(line): dom.append(('base', rel, 'fire', nm))
                    for nm in DOM_LISTEN.findall(line): dom.append(('base', rel, 'listen', nm))
                    for g, key in via_grants(line, owner, frags, programs, pids): vias.setdefault((g, key), []).append(rel)
                    for g in set(GLOBAL_USE.findall(line)):
                        if g in glob_owner: add('base', 'base-call', rel, g)
                        uses.setdefault(g, {}).setdefault('base:' + rel, rel)
                    for g in GLOBAL_DEF.findall(bare[li] if n.endswith(('.js', '.tpl')) else line):
                        if g not in glob_owner: bdefs.setdefault(rel, set()).add(g)
                    for c in DCIMPORT.findall(line):
                        if c in comp: add('base', 'base-dcimport', rel, c)
                    if NAMEQ and n.endswith(('.js', '.tpl')) and not n.endswith(('.json.tpl', '.html.tpl')):
                        for nm in set(NAMEQ.findall(bare[li])):
                            kind, rid = name_class(bare[li], nm)
                            tally[(kind, rid)] = tally.get((kind, rid), 0) + 1
                            if kind == 'use': add('base', 'base-name', rel, nm)
    # د5-ح: بياناتُ صلاحيات القاعدة (السجلّ · ملفاتُ الروابط) تذكر ورقةَ برنامجٍ أو صفَّه
    root = os.path.dirname(S)
    for bp in [os.path.join(S, 'permissions', 'registry', 'registry.base.json')] + sorted(glob.glob(os.path.join(root, 'workers', 'bindings', '*', 'data.base.json'))):
        if not os.path.exists(bp): continue
        hits = []
        def bwalk(v, ctx):
            if isinstance(v, dict):
                for a, b in v.items(): bwalk(b, a)
            elif isinstance(v, list):
                for b in v: bwalk(b, ctx)
            elif isinstance(v, str) and ctx in PERM_FIELDS:
                o = prow.get(v) if ctx in ('targets', 'mergedFrom', 'splitFrom') else id_owner(v, pids, programs)
                if o and o != 'base': hits.append(o)
        bwalk(json.load(open(bp, encoding='utf-8')), '')
        for o in hits: add('base', 'base-perm', os.path.relpath(bp, root).replace(os.sep, '/'), o)
    # د5-ح: سياساتُ via — المستفيدُ يعلن «via:<المفتاح>»
    for (g, key), rels in sorted(vias.items()):
        if g not in docs or ('via:' + key) in ((docs[g]['doc'] or {}).get('consumes') or {}): continue
        for rel in rels: add(g, 'via', rel, key)
    # د5-ح (إضافةُ المالك): قاعدةٌ لا يستعملها إلا برنامج — ملفُّ قاعدةٍ يعرّف خدماتٍ عامة (KIVO.X = …) كلُّ مستعمليها خارجه برامج (واحدٌ أو أكثر)
    #    مكانُه مجلدُ ذلك البرنامج أو src/systems/_multi لا القاعدة ⇒ base-only (المستعمِلون في «ما يُمَسّ»). المعلنُ موردَ قاعدةٍ مشتركاً (_base.json ← services) مستثنى.
    shared_ok = {x.get('global') for x in ((base_registry(S) or {}).get('services') or [])} | {os.path.basename(x.get('file', '')) for x in ((base_registry(S) or {}).get('services') or [])}
    for rel, gs in sorted(bdefs.items()):
        if os.path.basename(rel).replace('.tpl', '') in shared_ok or gs & shared_ok: continue
        who = {u for g in gs for u in (uses.get(g) or {}) if u != 'base:' + rel}
        if who and all(not u.startswith('base:') for u in who): add('base', 'base-only', rel, '+'.join(sorted(who)))
    # د5-ح: أحداثُ الصفحة — مالكُ الحدث مَن يُطلقه
    firers = {}
    for who, rel, kind, nm in dom:
        if kind == 'fire': firers.setdefault(nm, set()).add(who)
    for who, rel, kind, nm in dom:
        f = firers.get(nm, set())
        if kind != 'listen' or not f or 'base' in f or who in f: continue
        if who == 'base': add('base', 'base-dom', rel, nm); continue
        if ('dom:' + nm) not in ((docs[who]['doc'] or {}).get('consumes') or {}): add(who, 'dom', rel, nm)
    return {'errors': bad, 'violations': found, 'names': {k[0] + (':' + k[1] if k[1] else ''): v for k, v in sorted(tally.items())}}

def main():
    S = os.path.abspath(sys.argv[sys.argv.index('--src') + 1]) if '--src' in sys.argv else os.path.abspath('src')
    if '--scan' in sys.argv: print(json.dumps(scan(S), ensure_ascii=False, indent=1, sort_keys=True)); return
    docs, owner, every, bad = check(S)
    for b in bad: print('  ✘ ' + b)
    print(('✔ العقود: %d عقداً · %d مفتاحاً مملوكاً · %d اسماً مُصدَّراً' % (len(docs), len(owner), len(every))) if not bad else ('✘ %d خللاً في العقود' % len(bad)))
    sys.exit(1 if bad else 0)
if __name__ == '__main__': main()
