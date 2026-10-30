#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO SOT — أداة تحديث المرجع الرسمي (JSON) وإعادة توليد مخرجاته (HTML · CSV) والتحقق من تطابقها.
   الاستعمال:
     python3 tools/sot.py set <ID> --status <الحالة> --version KIVO_244 --level <Preview|محلي|ساكن|إجراء|لا تحقق> \
         --impl <KIVO_244|...> [--evidence "..."]... [--note "..."] [--action "..."] [--prod "..."]
     python3 tools/sot.py add <ID> --parent <ID> --area .. --title .. --priority P1 --phase Hardening --acceptance ..   # متطلب فرعي جديد
     python3 tools/sot.py render        # يعيد توليد HTML/CSV من JSON ويتحقق من التطابق
     python3 tools/sot.py show <ID>
   القواعد: لا تغيير في هوية البنود · «مكتمل» يحتاج دليلاً واحداً على الأقل · كل تحديث يُضاف إلى history وverifications ولا يحذف السابق."""
import os, sys, json, argparse, datetime, subprocess, hashlib
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOT_DIR = os.path.join(H, 'docs', 'sot'); JP = os.path.join(SOT_DIR, 'KIVO_MASTER_REQUIREMENTS_v6.json')
STATUSES = ['مكتمل', 'جزئي', 'غير منفذ', 'يحتاج إثبات', 'معلّق بقرار', 'متعارض']
LEVELS = ['Preview', 'محلي', 'ساكن', 'إجراء', 'لا تحقق']
def load(): return json.load(open(JP, encoding='utf-8'))
def recount(S):
    """KIVO_260 (كشفته البطاقةُ المستقلة النهائية — §٤ بند 14): META.counts كان لقطةَ إنشاء v6 (58/77/71/11/7 · p0_open 68) يخالف البنودَ بعد كل تحديث.
       الآن يُعاد حسابُه عند كل حفظ، وتُحفظ لقطةُ الإنشاء مرّةً واحدة في counts_v6_creation كما كانت."""
    D = S['DATA']; M = S['META']; c0 = dict(M.get('counts', {}))
    if 'counts_v6_creation' not in M: M['counts_v6_creation'] = dict(c0, note='لقطةُ إنشاء v6 (2026-10-09) كما كانت — لا تُحدَّث؛ العدُّ الحالي في counts')
    snap = M['counts_v6_creation']
    def lvl(x):
        v = x.get('verifications') or []
        if v: return v[-1].get('level') or 'لا تحقق'
        av = ((x.get('audit_2026_10_09') or {}).get('verification') or {})
        return av.get('level') or 'لا تحقق'
    M['counts'] = {'total': len(D), 'sot': sum(1 for x in D if x['id'].startswith('SOT-')), 'aud': sum(1 for x in D if x['id'].startswith('AUD-')),
                   'by_status': {st: sum(1 for x in D if x['status'] == st) for st in STATUSES if any(x['status'] == st for x in D)},
                   'p0_open': sum(1 for x in D if x.get('priority') == 'P0' and x['status'] != 'مكتمل'),
                   'security': sum(1 for x in D if x.get('security')), 'security_open': sum(1 for x in D if x.get('security') and x['status'] != 'مكتمل'),
                   'decisions': sum(1 for x in D if x['status'] == 'معلّق بقرار'),
                   'by_level': {l: n for l, n in ((l, sum(1 for x in D if lvl(x) == l)) for l in sorted({lvl(x) for x in D})) if n},
                   'by_status_v5': snap.get('by_status_v5'), 'by_gap': snap.get('by_gap'),
                   'note': 'يُحسب من البنود عند كل حفظ (tools/sot.py) — by_status_v5 وby_gap من لقطة التدقيق (2026-10-09)'}
    # KIVO_261 (كشفته البطاقةُ المستقلة): قائمةُ P0 المفتوحة كانت لقطةَ الإنشاء (68) تخالف العدّاد — تُعاد مع كل حفظ لتطابقه
    M['p0_open_ids'] = [x['id'] for x in D if x.get('priority') == 'P0' and x['status'] != 'مكتمل']
def save(S):
    recount(S)
    S['META']['updated'] = datetime.date.today().isoformat(); S['META']['revision'] = int(S['META'].get('revision', 0)) + 1
    json.dump(S, open(JP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
def find(S, id_):
    for x in S['DATA']:
        if x['id'] == id_: return x
    sys.exit(f'لا يوجد بند {id_}')
def cmd_set(a):
    S = load(); x = find(S, a.id)
    if a.status not in STATUSES: sys.exit('حالة غير معروفة')
    if a.status == 'مكتمل' and not a.evidence: sys.exit('«مكتمل» يحتاج دليلاً واحداً على الأقل (--evidence)')
    rec = {'version': a.version, 'date': datetime.date.today().isoformat(), 'status': a.status, 'level': a.level, 'implementation': a.impl, 'evidence': a.evidence or [], 'note': a.note or '', 'action': a.action or '', 'production': a.prod or 'غير منشور على Production', 'by': 'KIVO Engineering (Claude)'}
    x.setdefault('verifications', []).append(rec)
    x['history'].append({'version': a.version, 'status': a.status, 'date': rec['date'], 'basis': 'verification'})
    x['status'] = a.status
    if a.action: x['audit_2026_10_09']['action'] = a.action
    save(S); print('✔', x['id'], x['status_v5'], '→', a.status, '|', a.version, a.level)
def cmd_add(a):
    S = load(); parent = find(S, a.parent)
    nxt = max(int(x['id'].split('-')[1]) for x in S['DATA'] if x['id'].startswith('AUD-')) + 1
    id_ = f'AUD-{nxt:03d}'
    item = {'id': id_, 'n': len(S['DATA']) + 1, 'added_in': a.version, 'area': a.area, 'title': a.title, 'status': 'غير منفذ', 'priority': a.priority, 'evidence': '', 'next': '', 'phase': a.phase, 'note': '', 'acceptance': a.acceptance, 'source': f'متطلب فرعي مستحدث أثناء تنفيذ {a.parent} ({a.version})', 'owner': 'Engineering', 'kind': 'متطلب فرعي', 'status_v5': '—', 'security': bool(a.security), 'decision': False, 'blocked_by': [], 'blocks': [], 'parent': a.parent,
            'history': [{'version': a.version, 'status': 'غير منفذ', 'date': datetime.date.today().isoformat(), 'basis': 'added'}],
            'audit_2026_10_09': {'status': '—', 'gap': 'بندٌ جديد', 'evidence': [], 'source': '—', 'action': '', 'note': 'أُضيف بعد التدقيق كمتطلب فرعي لـ' + a.parent, 'verification': {'implementation': '—', 'level': 'لا تحقق', 'production': 'لا ينطبق'}, 'findings': [], 'risks': [], 'roadmap': []}}
    S['DATA'].append(item); parent.setdefault('children', []).append(id_); S['META']['counts']['total'] = len(S['DATA']); S['META']['counts']['aud'] = S['META']['counts'].get('aud', 32) + 1
    save(S); print('✔ أُضيف', id_, 'تحت', a.parent)
def cmd_show(a):
    x = find(load(), a.id); print(json.dumps({k: x[k] for k in ('id', 'title', 'status_v5', 'status', 'priority', 'phase', 'history')}, ensure_ascii=False, indent=1)); print(json.dumps(x.get('verifications', []), ensure_ascii=False, indent=1))
def cmd_render(a):
    S0 = load(); c_before = json.dumps(S0['META'].get('counts'), ensure_ascii=False, sort_keys=True); recount(S0)
    if json.dumps(S0['META'].get('counts'), ensure_ascii=False, sort_keys=True) != c_before: save(S0)   # KIVO_260: العدُّ الحالي قبل التوليد
    env = dict(os.environ, SOT_DIR=SOT_DIR)
    # KIVO_259 (إفصاح — خللٌ أُصلح): CSV يُكتب من JSON أوّلاً (لم يُعَد توليدُه منذ RM-0)، ثم اللوحةُ، ثم التحقّقُ المستمرّ — وأيُّ إخفاقٍ يُفشل العرض
    # (كان المحقِّقُ محقِّقَ لقطة الإنشاء في k243/audit يُخفق منذ أوّل تحديثٍ ويخرج بـ0). الأدواتُ كلُّها في المستودع الرسمي (AUD-029).
    for s, args in (('sot_verify.py', ['--write-csv']), ('sot_render.py', []), ('sot_verify.py', [])):
        r = subprocess.run([sys.executable, os.path.join(H, 'tools', s)] + args, env=env, capture_output=True, text=True)
        if s == 'sot_verify.py' and args: continue                  # كتابةُ CSV وحدها (التحقّقُ الكامل بعد اللوحة)
        print(r.stdout[-2500:])
        if r.returncode: print(r.stderr[-1500:]); sys.exit(1)
    with open(os.path.join(SOT_DIR, 'SHA256SUMS_v6.txt'), 'w') as f:
        for n in ['KIVO_MASTER_SOURCE_OF_TRUTH_v6.html', 'KIVO_MASTER_REQUIREMENTS_v6.json', 'KIVO_MASTER_REQUIREMENTS_v6.csv', 'KIVO_SOT_v5_to_v6_CHANGELOG.html']:
            p = os.path.join(SOT_DIR, n)
            if os.path.exists(p): f.write(hashlib.sha256(open(p, 'rb').read()).hexdigest() + '  ' + n + '\n')
    # KIVO_259 · SOT-128: مصفوفةُ التتبّع تُولَّد مع كل عرضٍ للمرجع (المتطلب → الكود → الاختبار → الدليل)
    tp = os.path.join(H, 'tools', 'trace.py')
    if os.path.exists(tp):
        r = subprocess.run([sys.executable, tp], capture_output=True, text=True); print(r.stdout.strip()[-400:])
        if r.returncode: print(r.stderr[-800:]); sys.exit(1)
    print('✔ render + verify + SHA256SUMS_v6.txt' + (' + traceability' if os.path.exists(tp) else ''))
ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest='cmd', required=True)
p = sp.add_parser('set'); p.add_argument('id'); p.add_argument('--status', required=True); p.add_argument('--version', required=True); p.add_argument('--level', required=True, choices=LEVELS); p.add_argument('--impl', required=True); p.add_argument('--evidence', action='append'); p.add_argument('--note'); p.add_argument('--action'); p.add_argument('--prod'); p.set_defaults(f=cmd_set)
p = sp.add_parser('add'); p.add_argument('id', nargs='?'); p.add_argument('--parent', required=True); p.add_argument('--area', required=True); p.add_argument('--title', required=True); p.add_argument('--priority', default='P1'); p.add_argument('--phase', default='Hardening'); p.add_argument('--acceptance', required=True); p.add_argument('--version', default='KIVO_244'); p.add_argument('--security', action='store_true'); p.set_defaults(f=cmd_add)
p = sp.add_parser('show'); p.add_argument('id'); p.set_defaults(f=cmd_show)
p = sp.add_parser('render'); p.set_defaults(f=cmd_render)
a = ap.parse_args(); a.f(a)
