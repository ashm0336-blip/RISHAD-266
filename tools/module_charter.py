#!/usr/bin/env python3
"""KIVO_263 · SOT-092 — ميثاقُ كل وحدة مقروءٌ آلياً ومُتحقَّقٌ منه: src/modules/<وحدة>/meta.json → "charter".

  python3 tools/module_charter.py --write   → يملأ ما يُشتقّ من المصدر (الصفحة · المسار · الواجهة/المنطق · البيانات · أوراق الصلاحية · الاختبارات)
                                              ويُبقي ما كتبه الإنسان (owner · purpose) كما هو
  python3 tools/module_charter.py --check   → يُخفق إن نقص حقل، أو اختلف المشتقُّ عن المصدر (البياناتُ من logic.js ومن قراءات Operations في الخدمات المشتركة والموروثة ·
                                              الأوراقُ الموجودة في perm-tree24 · الاختباراتُ الموجودة والمشغَّلة في البوابة أو الوحدة)

المعيار (SOT-092): «كل Module له owner وUI/domain/data/permissions/tests واضحة». المصدرُ الوصفيُّ الكامل docs/module-charters.md.
"""
import glob, json, os, re, subprocess, sys
try:
    from . import deps_check
except ImportError:
    import deps_check

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
PAGE_OF = {'employees': 'emps'}          # slug ⇒ مفتاحُ الصفحة في الشجرة/pages.json حين يختلف
NAV_OF = {'employees': 'employees', 'staff': 'staffing', 'admin': 'admin'}
# المالكُ التشغيلي والغاية — من docs/module-charters.md (§3 «المستخدمون والأدوار» · «الغاية التشغيلية») — يُكتب يدوياً ويُحفظ
HUMAN = {
    'admin':     ('مدير النظام (الحوكمة) · مدير الإدارة (إعدادات إدارته)', 'حوكمةُ المنصة والإدارة: الهيكل والسقوف والحسابات والصلاحيات والورديات والقوالب والنسخ والسياسات'),
    'employees': ('مدير الإدارة', 'سجلُّ القوة (البيانات الأساسية · التوظيف · حساب الدخول) والعُهد ومؤشرات الجاهزية'),
    'staff':     ('مدير الإدارة', 'الجدولُ الشهري للورديات واعتمادُه (يفتح سحب التقرير اليومي)'),
    'planning':  ('مدير الإدارة', 'حاويةُ الخطة التشغيلية (الحلقات ٤–٦)'),
    'plan':      ('مدير الإدارة', 'التشغيلُ الميداني: المواقع وخرائطها وعدساتها والاحتياج والتسكين'),
    'daily':     ('مدير الإدارة · المشرفون الميدانيون', 'المتابعةُ اليومية: الجولات ولوحاتها'),
    'dreport':   ('مدير الإدارة · المشرفون', 'التقريرُ اليومي: الحضور واعتماد الوردية'),
    'tasks':     ('مدير الإدارة', 'المهام: التكليف والمتابعة'),
    'profile':   ('الموظف نفسُه', 'صفحتي: المتابعةُ من الميدان للموظف'),
    'irshad':    ('مدير الإدارة · موظفو الاسترشاد', 'نظامُ الاسترشاد: سجلٌّ ميداني يومي بالوردية والموظف'),
    'seized':    ('مدير الإدارة · موظفو الضبط', 'نظامُ المضبوطات: سجلٌّ ميداني يومي بالوردية والموظف'),
    'dstats':    ('مدير النظام · مدخلو الإحصاءات', 'الإحصائياتُ اليومية: أرقام الحرمين (سجلٌّ عام)'),
    'award':     ('مدير الإدارة · لجنة التقييم', 'جائزةُ التميز: ترشيحُ الموظفين وتقييمُهم'),
    'kpis':      ('مدير الإدارة (عارض — المالكُ هو الصفحةُ الأصلية)', 'مؤشراتُ الإدارة: عارضٌ لا مالك (SOT-012)'),
}
NODATA = {'planning': 'none — حاويةٌ لا تكتب ولا تقرأ مفتاحاً بنفسها (التبويباتُ في وحداتها)', 'kpis': 'none — عارضٌ يرسم لوحاتِ الوحدات الأخرى بمحرّكاتها (المالكُ هو الصفحةُ الأصلية)'}
KEY_RX = re.compile(r"\bbassam_[a-z0-9_]+_v\d+\b")
JS_TOKEN_RX = re.compile(r"(?P<comment>/\*[\s\S]*?\*/|//[^\r\n]*)|(?P<string>'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`)")
# These providers describe/transport every resource. Referring to the provider
# is not evidence that a page reads its complete registry or metadata labels.
DATA_INFRASTRUCTURE = {'api/280-server-storage.js', 'services/320-dept-storage.js'}
OPS_LITERAL_CACHE = {}
OPS_LITERAL_PROGRAM = r'''
const fs=require('node:fs'),acorn=require('acorn');
const sources=JSON.parse(fs.readFileSync(0,'utf8')),output={};
for(const [file,text]of Object.entries(sources)){
 const root={bindings:new Map(),parent:null},scopes=new WeakMap(),functions=[],calls=[];root.functionScope=root;
 const get=(s,n)=>s&&(s.bindings.get(n)||get(s.parent,n));
 function walk(node,scope,fn){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){for(const child of node)walk(child,scope,fn);return;}
  scopes.set(node,scope);
  if(node.type==='BlockStatement'){
   scope={bindings:new Map(),parent:scope,functionScope:scope.functionScope};scopes.set(node,scope);
  }
  if(/^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)){
   if(node.type==='FunctionDeclaration'&&node.id)scope.bindings.set(node.id.name,{function:node,scope});
   const inner={bindings:new Map(),parent:scope},record={node,scope:inner,returns:[],reads:new Set()};inner.functionScope=inner;
   functions.push(record);node.params.forEach((parameter,index)=>{if(parameter.type==='Identifier')inner.bindings.set(parameter.name,{parameter:index,owner:node,scope:inner});});
   if(node.body.type!=='BlockStatement')record.returns.push(node.body);
   walk(node.body,inner,record);return;
  }
  if(node.type==='VariableDeclaration'){
   const destination=node.kind==='var'?scope.functionScope:scope;
   for(const declaration of node.declarations){
    if(declaration.id.type==='Identifier')destination.bindings.set(declaration.id.name,{init:declaration.init,scope});
    walk(declaration.init,scope,fn);
   }
   return;
  }
  if(node.type==='ReturnStatement'&&fn&&node.argument)fn.returns.push(node.argument);
  if(node.type==='CallExpression')calls.push({node,scope,fn});
  for(const [key,child]of Object.entries(node))if(key!=='start'&&key!=='end'&&key!=='loc')walk(child,scope,fn);
 }
 walk(acorn.parse(text,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true}),root,null);
 const recordOf=node=>functions.find(record=>record.node===node);
 function functionOf(node,scope){
  if(!node)return null;
  if(/^(?:FunctionExpression|ArrowFunctionExpression)$/.test(node.type))return recordOf(node);
  if(node.type==='Identifier'){const binding=get(scope,node.name);return binding&&(binding.function?recordOf(binding.function):binding.init&&functionOf(binding.init,binding.scope));}
  return null;
 }
 const property=node=>node&&node.type==='MemberExpression'&&(node.computed?node.property.value:node.property.name);
 function operations(node,scope,seen=new Set()){
  if(!node||seen.has(node))return false;seen.add(node);
  if(property(node)==='operations')return true;
  if(node.type==='Identifier'){const binding=get(scope,node.name);return !!(binding&&binding.init&&operations(binding.init,binding.scope,seen));}
  if(node.type==='CallExpression'){const fn=functionOf(node.callee,scope);return !!(fn&&fn.returns.some(value=>operations(value,scopes.get(value)||fn.scope,new Set(seen))));}
  if(node.type==='LogicalExpression'||node.type==='BinaryExpression')return operations(node.left,scope,new Set(seen))||operations(node.right,scope,new Set(seen));
  if(node.type==='ConditionalExpression')return operations(node.consequent,scope,new Set(seen))||operations(node.alternate,scope,new Set(seen));
  return false;
 }
 const keys=new Set();let changed=true;
 function consume(node,scope,caller,seen=new Set()){
  if(!node||seen.has(node))return;seen.add(node);
  if(node.type==='Literal'&&typeof node.value==='string'){for(const key of node.value.match(/\bbassam_[a-z0-9_]+_v\d+\b/g)||[])keys.add(key);return;}
  if(node.type==='Identifier'){
   const binding=get(scope,node.name);if(!binding)return;
   if(binding.parameter!==undefined&&caller&&binding.owner===caller.node){if(!caller.reads.has(binding.parameter)){caller.reads.add(binding.parameter);changed=true;}return;}
   if(binding.init)consume(binding.init,binding.scope,caller,seen);return;
  }
  if(node.type==='ArrayExpression'){for(const value of node.elements)consume(value,scope,caller,new Set(seen));return;}
  if(node.type==='BinaryExpression'||node.type==='LogicalExpression'){consume(node.left,scope,caller,new Set(seen));consume(node.right,scope,caller,new Set(seen));return;}
  if(node.type==='ConditionalExpression'){consume(node.consequent,scope,caller,new Set(seen));consume(node.alternate,scope,caller,new Set(seen));return;}
  if(node.type==='TemplateLiteral'){for(const quasi of node.quasis)consume({type:'Literal',value:quasi.value.cooked},scope,caller,new Set(seen));for(const expression of node.expressions)consume(expression,scope,caller,new Set(seen));}
 }
 while(changed){changed=false;for(const call of calls){
  const {node,scope,fn}=call;
  if(['get','text','value','read','state'].includes(property(node.callee))&&operations(node.callee.object,scope))consume(node.arguments[0],scope,fn);
  const target=functionOf(node.callee,scope);if(target)for(const index of target.reads)consume(node.arguments[index],scope,fn);
 }}
 output[file]=[...keys].sort();
}
process.stdout.write(JSON.stringify(output));
'''

def operation_literals(sources):
    """Track only literals reaching a real Operations reader, including wrappers.

    Acorn parses installed source; no page/service JavaScript is executed. The
    local scope binding avoids confusing DayShift's K with device DayFocus's K.
    """
    missing = {path: text for path, text in sources.items() if OPS_LITERAL_CACHE.get(path, (None,))[0] != text}
    if missing:
        result = subprocess.run(['node', '-e', OPS_LITERAL_PROGRAM], input=json.dumps(missing), text=True,
                                encoding='utf-8', capture_output=True, cwd=os.path.dirname(__file__))
        if result.returncode:
            raise ValueError('Cannot derive shared Operations literals: ' + result.stderr[:300])
        for path, keys in json.loads(result.stdout).items():
            OPS_LITERAL_CACHE[path] = (missing[path], set(keys))
    return {path: OPS_LITERAL_CACHE[path][1] for path in sources}

def operation_resources():
    """Use the transport's canonical resource registry as a filter, never a read set."""
    with open(os.path.join(ROOT, 'src/api/280-server-storage.js'), encoding='utf-8') as stream:
        source = stream.read()
    match = re.search(r'\boperationResources9\s*=\s*Object\.freeze\(\s*(\[[\s\S]*?\])\s*\)', source)
    if not match:
        raise ValueError('Canonical Operations resource registry is missing')
    return {token.group('string')[1:-1] for token in JS_TOKEN_RX.finditer(match.group(1))
            if token.group('string') and KEY_RX.fullmatch(token.group('string')[1:-1])}

def shared_data(slug, parts, dependency_graph=None):
    """Follow real KIVO ownership; collect literal keys of used Ops services.

    deps_check owns name resolution. A visited set handles service cycles, and
    module navigation contracts never pull another page's complete read set.
    """
    definitions, references = dependency_graph or deps_check.scan()
    source_root = os.path.join(ROOT, 'src')
    files = [os.path.relpath(os.path.normpath(os.path.join(source_root, 'modules', slug, name)), source_root).replace(os.sep, '/') for name in ['logic.js'] + parts]
    pending = [name for file in files for name in references.get(file, [])]
    visited, sources, allowed = set(), {}, operation_resources()
    while pending:
        owner = definitions.get(pending.pop())
        if not owner or owner in visited or owner in DATA_INFRASTRUCTURE or not owner.startswith(('services/', 'components/')):
            continue
        visited.add(owner)
        with open(os.path.join(source_root, owner), encoding='utf-8') as stream:
            text = stream.read()
        sources[os.path.join(source_root, owner)] = text
        pending.extend(references.get(owner, []))
    return set().union(*operation_literals(sources).values()) & allowed if sources else set()

def derive(slug, G='', dependency_graph=None):
    d = os.path.join(ROOT, 'src/modules', slug)
    parts = (json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8')) if os.path.exists(os.path.join(d, 'meta.json')) else {}).get('logicParts') or []   # KIVO_265 · البند 19
    logic = ''.join(open(os.path.join(d, f), encoding='utf-8').read() for f in ['logic.js'] + parts)
    view = open(os.path.join(d, 'view.html'), encoding='utf-8').read() if os.path.exists(os.path.join(d, 'view.html')) else ''
    page = PAGE_OF.get(slug, slug)
    tree = J('src/manifests/perm-tree24.json')
    leaves = sorted({lf['owner'] for c in tree['containers'] for lf in c.get('leaves', []) if lf.get('page') == page})
    shown = sorted(k for k, v in tree.get('shownIn', {}).items() if slug == 'kpis' and v.get('container') == 'مؤشرات الإدارة')
    nav = NAV_OF.get(slug, slug)
    routes = ['#/' + nav] + (['#/sysadmin'] if slug == 'admin' else [])
    pat = re.compile(r"#/" + re.escape(nav) + r"\b|go\(\s*\w+\s*,\s*'" + re.escape(nav) + r"'|PAGES\s*=\s*\[[^\]]*'" + re.escape(nav) + r"'")   # المسار · go(p,'x') · قائمةُ صفحاتٍ تُزار كلُّها
    tests = []
    for sub in ('cfbench', 'tests/unit'):
        if not os.path.isdir(os.path.join(ROOT, sub)): continue   # المستودعُ الرسمي وحده: بلا cfbench (المختبر)
        for f in sorted(os.listdir(os.path.join(ROOT, sub))):
            if not f.endswith('.mjs'): continue
            try: s = open(os.path.join(ROOT, sub, f), encoding='utf-8').read()
            except OSError: continue
            if pat.search(s) and (sub == 'tests/unit' or f in G): tests.append(('gate:' + f) if sub == 'cfbench' else (sub + '/' + f))   # حزمُ البوابة باسمها لا بمسار المختبر (AUD-029)   # المشغَّلُ فعلاً: البوابةُ الدائمة أو اختبارُ وحدة
    return {
        'page': page, 'routes': routes,
        'ui': ['src/modules/%s/view.html' % slug, 'src/modules/%s/helmet.css' % slug],
        'domain': 'src/modules/%s/logic.js' % slug if not parts else ['src/modules/%s/%s' % (slug, f) for f in ['logic.js'] + parts],   # KIVO_265 · البند 19: الأجزاءُ مع الأصل
        'data': sorted(set(KEY_RX.findall(logic + view)) | shared_data(slug, parts, dependency_graph)) or [NODATA.get(slug, 'none')],
        'permissions': leaves if leaves else (['shownIn:' + k for k in shown] if shown else ['self (no tree leaf — every signed-in user)']),
        'tests': tests,
    }

def gate_files():
    gs = sorted(glob.glob(os.path.join(ROOT, 'gateall2[0-9][0-9].sh'))); g = gs[-1] if gs else ''   # أحدثُ بوابةٍ دائمة في المختبر (لا اسمَ مثبّتاً — AUD-029)
    return open(g, encoding='utf-8').read() if g and os.path.exists(g) else ''

def main(argv):
    mods = [p['slug'] for p in J('src/modules/modules.json')['pages']]
    write, bad = '--write' in argv, []
    G = gate_files()
    dependency_graph = deps_check.scan()
    gate_available = bool(G) and os.path.isdir(os.path.join(ROOT, 'cfbench'))
    for slug in mods:
        mp = os.path.join(ROOT, 'src/modules', slug, 'meta.json')
        meta = json.load(open(mp, encoding='utf-8'))
        ch = meta.get('charter') or {}
        der = derive(slug, G, dependency_graph)
        if write:
            if not gate_available:
                der['tests'] = sorted(set(ch.get('tests') or []) | set(der['tests']))
            own, pur = HUMAN[slug]
            meta['charter'] = dict({'owner': ch.get('owner') or own, 'purpose': ch.get('purpose') or pur}, **der)
            open(mp, 'w', encoding='utf-8').write(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
            continue
        for k in ('owner', 'purpose', 'page', 'routes', 'ui', 'domain', 'data', 'permissions', 'tests'):
            if not ch.get(k): bad.append(slug + ': الحقل «' + k + '» غائب أو فارغ')
        for k in ('page', 'routes', 'ui', 'domain', 'data', 'permissions', 'tests'):
            if k == 'tests' and not gate_available:   # المستودعُ الرسمي بلا البوابة الدائمة (المختبر): الاختباراتُ المعلنة موجودةٌ وحسب
                miss = [t for t in ch.get(k) or [] if not os.path.exists(os.path.join(ROOT, t)) and not t.startswith(('cfbench/', 'gate:'))]
                if miss: bad.append(slug + ': اختبارٌ معلنٌ غائب ' + ', '.join(miss))
                continue
            if ch.get(k) and ch.get(k) != der[k]: bad.append(slug + ': «' + k + '» لا يطابق المصدر (أعد --write) — المصدر: ' + json.dumps(der[k], ensure_ascii=False)[:160])
        for f in (ch.get('ui') or []) + (ch.get('domain') if isinstance(ch.get('domain'), list) else [ch.get('domain') or '']):
            if f and not os.path.exists(os.path.join(ROOT, f)) and not f.endswith('helmet.css'): bad.append(slug + ': ملفٌّ غائب ' + f)
        if gate_available and ch.get('tests') and not any(t.split(':', 1)[-1] in G or t.startswith('tests/unit/') for t in ch['tests']):
            bad.append(slug + ': لا اختبارَ من اختباراتها في البوابة الدائمة ولا اختبارَ وحدة')
    if write: print('كُتب الميثاقُ في ' + str(len(mods)) + ' وحدة'); return 0
    for b in bad: print('  ✘', b)
    print('النتيجة: ' + str(len(mods)) + ' وحدة بميثاقٍ كامل (owner · UI · domain · data · permissions · tests) · ' + str(len(bad)) + ' مخالفة')
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
