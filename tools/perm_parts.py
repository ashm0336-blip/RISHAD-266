#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V7 · د3 — صلاحياتُ كل نظامٍ من مجلده: جمعُ السجلّ وملفات الروابط من «القاعدة + الأنظمة الحاضرة».
   المصادر:
     · القاعدة: src/permissions/registry/registry.base.json  ·  workers/bindings/<name>/data.base.json   (صفوفُ القاعدة وحدها)
     · النظام:  src/systems/<key>/permissions.json  — «إضافات» إلى وثائق القاعدة (docs.<اسم الوثيقة> = قائمةُ عمليات)
   الناتج (مولَّد · ملتزَم · tools/generate.py --check يحرسه):
     · src/permissions/registry/registry-v24.9.json  ·  workers/bindings/<name>/data.json   — ومنها تُولَّد 340 و004 و006 و008 و010 كما كانت.
   العمليةُ الواحدة:
     {"path": [...], "after": n, "seq": i, "value": v}              إدراجُ عنصرٍ في مصفوفة: بعد n عنصراً من عناصر القاعدة · seq يرتّب الإضافات
     {"path": [...], "key": k, "after": n, "seq": i, "value": v}    إدراجُ مفتاحٍ في كائن: بعد n مفتاحاً من مفاتيح القاعدة
     {"path": [...], "set": v, "with": [أنظمة أخرى]}                استبدالُ قيمةٍ نصية (تُطبَّق بحضور النظام ومن في with؛ وإلا يبقى نصُّ القاعدة)
   path: مفاتيحُ كائنات · أو {"by": حقل, "eq": قيمة} لعنصر مصفوفةٍ في القاعدة · أو رقمٌ (موضعٌ في مصفوفة القاعدة).
   الأعدادُ (counts) تُحسب من المجموع — بالأنظمة الأربعة تساوي المكتوبَ في الوثيقة المرجعية حرفاً.
     python3 tools/perm_parts.py --check     الناتجُ المجموع = الملتزَم (0 = مطابق)
     python3 tools/perm_parts.py --list      ما يصرّح به كل نظام (عدداً)"""
import os, sys, json, copy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = {   # اسم الوثيقة ← (ملف القاعدة · الناتج) نسبةً إلى جذر المستودع
    'registry': ('src/permissions/registry/registry.base.json', 'src/permissions/registry/registry-v24.9.json'),
    'scope-bindings': ('workers/bindings/scope-bindings/data.base.json', 'workers/bindings/scope-bindings/data.json'),
    'guard-bindings': ('workers/bindings/guard-bindings/data.base.json', 'workers/bindings/guard-bindings/data.json'),
    'build-bindings': ('workers/bindings/build-bindings/data.base.json', 'workers/bindings/build-bindings/data.json'),
}

def _root(S): return os.path.dirname(os.path.abspath(S))
def _load(p): return json.load(open(p, encoding='utf-8'))
def dump(obj): return (json.dumps(obj, ensure_ascii=False, indent=1) + '\n').encode('utf-8')

def systems(S):
    d = os.path.join(S, 'systems'); out = []
    for k in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if os.path.isfile(os.path.join(d, k, 'system.json')): out.append(k)
    return out

def declared(S):
    """{النظام: {الوثيقة: [عمليات]}} للأنظمة الحاضرة التي لها permissions.json"""
    out = {}
    for k in systems(S):
        p = os.path.join(S, 'systems', k, 'permissions.json')
        if os.path.isfile(p):
            d = _load(p)
            if d.get('system') != k: raise SystemExit('✘ %s: system = %r ≠ اسم المجلد' % (p, d.get('system')))
            out[k] = d.get('docs', {})
    return out

def _walk(node, path, where):
    for step in path:
        if isinstance(step, dict):
            hit = [x for x in node if isinstance(x, dict) and x.get(step['by']) == step['eq']]
            if len(hit) != 1: raise SystemExit('✘ %s: المسار %s — %d عنصراً يطابق %s=%r' % (where, json.dumps(path, ensure_ascii=False), len(hit), step['by'], step['eq']))
            node = hit[0]
        else:
            try: node = node[step]
            except (KeyError, IndexError, TypeError): raise SystemExit('✘ %s: المسار %s غير موجود في القاعدة عند %r' % (where, json.dumps(path, ensure_ascii=False), step))
    return node

def apply(base, ops_by_sys, name='?'):
    """القاعدة + عمليات الأنظمة الحاضرة → الوثيقة المجموعة. المسارات تُحلّ على القاعدة قبل أي إدراج."""
    doc = copy.deepcopy(base); present = set(ops_by_sys)
    ins = {}; sets = []; holders = {}
    for sysk in sorted(ops_by_sys):
        for op in ops_by_sys[sysk]:
            where = '%s/permissions.json (%s)' % (sysk, name)
            if 'set' in op:
                if all(w in present for w in op.get('with', [])):
                    parent = _walk(doc, op['path'][:-1], where); sets.append((parent, op['path'][-1], op['set'], where))
                continue
            cont = _walk(doc, op['path'], where)
            if ('key' in op) != isinstance(cont, dict): raise SystemExit('✘ %s: المسار %s — نوعُ الحاوية لا يطابق العملية' % (where, json.dumps(op['path'], ensure_ascii=False)))
            holders[id(cont)] = cont; ins.setdefault(id(cont), []).append((op['after'], op['seq'], sysk, op))
    for parent, last, val, where in sets:
        tgt = _walk(parent, [last], where)   # يتحقق من الوجود
        if isinstance(last, dict): parent[parent.index(tgt)] = val
        else: parent[last] = val
    for cid, items in ins.items():
        cont = holders[cid]; items.sort(key=lambda x: (x[0], x[1], x[2]))
        if isinstance(cont, list):
            base_items = list(cont); out = []; i = 0
            for n in range(len(base_items) + 1):
                while i < len(items) and items[i][0] == n: out.append(items[i][3]['value']); i += 1
                if n < len(base_items): out.append(base_items[n])
            if i != len(items): raise SystemExit('✘ %s: after أكبر من طول مصفوفة القاعدة (%d)' % (name, len(base_items)))
            cont[:] = out
        else:
            base_keys = list(cont.items()); cont.clear(); i = 0
            for n in range(len(base_keys) + 1):
                while i < len(items) and items[i][0] == n:
                    k = items[i][3]['key']
                    if k in cont or k in dict(base_keys): raise SystemExit('✘ %s: المفتاح %r مكرّر' % (name, k))
                    cont[k] = items[i][3]['value']; i += 1
                if n < len(base_keys): cont[base_keys[n][0]] = base_keys[n][1]
            if i != len(items): raise SystemExit('✘ %s: after أكبر من عدد مفاتيح القاعدة (%d)' % (name, len(base_keys)))
    return doc

# ── الأعداد: تُحسب من المجموع (بالأنظمة الأربعة = المكتوب في الوثيقة المرجعية) ──────────────────────────────────────
def counts_registry(D):
    R = D['registry']; act = [e for e in R if e['status'] == 'active']; kinds = {}
    for o in D['owners']: kinds[o['kind']] = kinds.get(o['kind'], 0) + 1
    g = {}
    for e in act: g[e['guard']['status']] = g.get(e['guard']['status'], 0) + 1
    by = lambda kind: sum(1 for e in act if e['ownerKind'] == kind)
    return {'securityActive': len(act), 'assignable': sum(1 for e in act if e['grant'] == 'assignable'), 'roleOrSelf': sum(1 for e in act if e['grant'] != 'assignable'),
            'reserved': sum(1 for e in R if e['status'] == 'reserved'), 'reference': sum(1 for e in R if e['key'].startswith('ref.')), 'referenceOwned': by('reference'),
            'plugin': by('lens'), 'pageOwned': by('page'), 'platform': by('platform'), 'owners': len(D['owners']),
            'ownersByKind': {k: kinds[k] for k in ('page', 'platform', 'lens', 'reference') if k in kinds}, 'atoms': len(D['atoms']),
            'references': sum(len(e['references']) for e in R), 'guards': {'exists': g.get('exists', 0), 'toBind': g.get('to-bind', 0), 'toBuild': g.get('to-build', 0)}}

def counts_scope(S, old):
    by = {}
    for b in S['bindings']:
        for dn, dv in b['dims'].items():
            x = by.setdefault(dn, {'keys': 0, 'evaluator': 0, 'na': 0}); x['keys'] += 1; x['na' if dv[0] == 'na' else 'evaluator'] += 1
    c = dict(old)
    c.update({'keys': len(S['bindings']), 'pairs': sum(len(b['dims']) for b in S['bindings']), 'dims': len(S['dims']), 'resources': len(S['byResource']),
              'byDim': {dn: by[dn] for dn in old['byDim'] if dn in by}, 'evaluatorPairs': sum(v['evaluator'] for v in by.values()), 'naPairs': sum(v['na'] for v in by.values())})
    for dn in by:
        if dn not in c['byDim']: c['byDim'][dn] = by[dn]
    return c

def meta_read(RB, old):
    cls = {}; src = {}
    for v in RB['byResource'].values():
        cls[v['cls']] = cls.get(v['cls'], 0) + 1
        for r in v.get('routes', []):
            s = r['source'].split(':')[0]; src[s] = src.get(s, 0) + 1
    m = dict(old)
    m.update({'resources': len(RB['byResource']), 'routes': sum(len(v.get('routes', [])) for v in RB['byResource'].values()),
              'byClass': {k: cls[k] for k in list(old['byClass']) + [k for k in cls if k not in old['byClass']] if k in cls},
              'bySource': {k: src[k] for k in list(old['bySource']) + [k for k in src if k not in old['bySource']] if k in src},
              'readKindOutsideRoutes': len(RB['readKindOutsideRoutes'])})
    return m

def finish(name, doc, full):
    """يحسب الأعداد في الوثيقة المجموعة. full = هل الأنظمة المصرِّحة كلها حاضرة (للأعداد التي لا صيغةَ لها)."""
    if name == 'registry': doc['counts'] = counts_registry(doc)
    elif name == 'scope-bindings':
        doc['counts'] = counts_scope(doc, doc['counts']); doc['readBindings']['meta'] = meta_read(doc['readBindings'], doc['readBindings']['meta'])
    elif name == 'guard-bindings':
        c = dict(doc['counts']); c.update({'bindings': len(doc['bindings']), 'toBind': len(doc['bindings']), 'shadowOnly': len(doc['shadowOnly']), 'decisions': len(doc['decisions']),
                                          'duplicatesJustified': sum(1 for b in doc['bindings'] if b.get('dup'))}); doc['counts'] = c; doc['toBind'] = len(doc['bindings'])
    elif name == 'build-bindings':
        c = dict(doc['counts']); n = len(doc['bindings']); c.update({'toBuild': n, 'built': n, 'implFns': n}); doc['counts'] = c
    return doc

def assemble(S, name):
    base = _load(os.path.join(_root(S), DOCS[name][0])); D = declared(S)
    return finish(name, apply(base, {k: v.get(name, []) for k, v in D.items()}, name), True)

def outputs(S):
    """{المسار نسبةً إلى الجذر: بايتات} — الوثائق المجموعة (تُكتب قبل بقية التوليد، فما بعدها يقرأ منها)"""
    out = {}
    for name, (b, o) in DOCS.items():
        if os.path.isfile(os.path.join(_root(S), b)): out[o] = dump(assemble(S, name))
    return out

def main(argv):
    S = os.path.join(ROOT, 'src')
    if '--list' in argv:
        for k, docs in declared(S).items(): print('%-8s %s' % (k, ' · '.join('%s: %d' % (n, len(v)) for n, v in docs.items())))
        return 0
    bad = 0
    for rel, data in outputs(S).items():
        cur = open(os.path.join(ROOT, rel), 'rb').read() if os.path.exists(os.path.join(ROOT, rel)) else None
        print(('  = ' if cur == data else '  ✘ ') + rel); bad += cur != data
    print('✔ وثائقُ الصلاحيات المجموعة = الملتزَم' if not bad else '✘ %d وثيقةً تخالف الملتزَم (شغّل tools/generate.py --src src)' % bad)
    return 1 if bad else 0

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
