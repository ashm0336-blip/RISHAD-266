#!/usr/bin/env python3
"""KIVO_263 · SOT-095 — سجلُّ المسارات الواحد: كلُّ مسارٍ في الواجهة له عنوانٌ وصفحةٌ مالكة وحارسٌ وسلوكُ تنقّل —
مشتقٌّ من المصادر نفسِها (src/manifests/pages.json · perm-tree24.json · مواثيقُ الوحدات · حارسُ الغلاف root-logic._pageAllowed)
ومكتوبٌ في docs/routes.md. لا مسارَ سرّياً ولا يتيماً: ما يقبله الغلافُ = ما في السجل، والعكس.

  python3 tools/route_registry.py --write   → يكتب docs/routes.md
  python3 tools/route_registry.py --check   → يُخفق إن نقص عنوانٌ/مالكٌ/حارس، أو اختلف ما يقبله الغلاف، أو تقادمت الوثيقة
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
OUT = os.path.join(ROOT, 'docs/routes.md')
SPECIAL = {  # مساراتٌ خارج سجلّ الصفحات بحكم طبيعتها — حارسُها في الغلاف نفسِه (root-logic._pageAllowed)
    'profile':  ('صفحتي', 'profile', 'كلُّ صاحب جلسة (الصفحةُ الشخصية · المرتدُّ الأخير)', 'خارج القائمة — من قائمة المستخدم'),
    'sysadmin': ('مركز إدارة رشاد', 'admin', 'مسؤول المنصة وحده (isSuper) — وإلا لا يُفتح', 'من القائمة الجانبية «🛡 مركز إدارة رشاد» · #/sysadmin/<تبويب>'),
    'kpis':     ('مؤشرات الإدارة', 'kpis', 'من يملك ورقةً من أوراق لوحاتها (navLeaves("kpis") · kpiPanelOk) — مدير النظام دائماً', 'حاويةُ عرضٍ في القائمة (navOrder)'),
}

def build():
    M = J('src/manifests/pages.json'); T = J('src/manifests/perm-tree24.json')
    mods = {}
    for slug in [p['slug'] for p in J('src/modules/modules.json')['pages']]:
        ch = J('src/modules/%s/meta.json' % slug).get('charter') or {}
        for r in ch.get('routes', []): mods[r[2:]] = slug
    view = {}
    for c in T['containers']:
        for lf in c.get('leaves', []):
            pg = lf.get('page')
            if pg: view.setdefault(pg, []).extend(k for k in lf.get('keys', []) if k.endswith('.view'))
    rows, bad = [], []
    for p in M['pages']:
        nav, key = p['nav'], p['key']
        title = M['routeNames'].get(nav)
        owner = mods.get(nav) or ('shell (src/layouts)' if nav in ('links', 'help') else None)
        vk = sorted(set(view.get(key, [])))
        if key in ('links', 'help'): guard = 'ورقةُ الصفحة «' + key + '» (P.can("' + key + '","view")) — ' + ('، '.join(vk) if vk else 'بلا مفاتيح عرضٍ في الشجرة')
        else: guard = 'P.can("' + key + '","view")' + (' ⇐ ' + '، '.join(vk[:6]) + (' …' if len(vk) > 6 else '') if vk else '')
        tabs = [t['key'] for t in p.get('tabs', [])] + [s['key'] for s in p.get('subs', [])]
        beh = ('تحت «' + M['routeNames'].get(dict((x['key'], x['nav']) for x in M['pages'])[p['under']], p['under']) + '»' if p.get('under') else ('في القائمة' if key in M['navOrder'] or nav in M['navOrder'] else 'رابطٌ في التذييل/القائمة الثانوية'))
        ta = M['tabAddr'].get(key, M['tabAddr'].get(nav))
        if ta == 1: beh += ' · العنوانُ يحمل التبويب #/' + nav + '/<تبويب>'
        elif ta: beh += ' · العنوانُ يحمل ' + ' · '.join('#/' + nav + '/' + t for t in ta)
        rows.append((nav, title, key, owner, guard, beh, tabs))
        if not title: bad.append('#/' + nav + ': بلا عنوان في routeNames')
        if not owner: bad.append('#/' + nav + ': بلا وحدةٍ مالكة (ميثاقُ الوحدة لا يذكر المسار)')
        if key not in ('links', 'help') and not vk: bad.append('#/' + nav + ': بلا مفتاح عرضٍ في الشجرة (الحارس)')
    for c in M['containers']:
        if c['nav'] in SPECIAL: continue
        bad.append('حاويةٌ بلا حارسٍ معلن: ' + c['nav'])
    for nav, (title, owner, guard, beh) in SPECIAL.items():
        if M['routeNames'].get(nav) != title: bad.append('#/' + nav + ': العنوانُ في routeNames ≠ ' + title)
        rows.append((nav, title, nav if nav != 'sysadmin' else 'sysadmin', owner, guard, beh, []))
    # ما يقبله الغلاف فعلاً: NAV2PERM (من PAGE_REG = pages.json) + الثلاثةُ الخاصة في _pageAllowed
    rl = open(os.path.join(ROOT, 'src/layouts/root-logic.js'), encoding='utf-8').read()
    m = re.search(r'const OK = Object\.assign\(\{([^}]*)\}', rl)
    special = sorted(re.findall(r'(\w+): null', m.group(1))) if m else []
    if special != sorted(SPECIAL): bad.append('الغلافُ يقبل مساراتٍ خاصة ' + str(special) + ' ≠ السجل ' + str(sorted(SPECIAL)))
    extra = sorted(set(M['routeNames']) - {r[0] for r in rows})
    if extra: bad.append('routeNames بأسماءٍ لا مسارَ لها (يتيمة): ' + str(extra))
    return rows, bad

def md(rows):
    L = ['# سجلُّ المسارات — KIVO (مولَّد: `python3 tools/route_registry.py --write` — لا يُحرَّر يدوياً)', '',
         '> SOT-095: «كل route له page owner, guard, title, nav behavior» · الغلافُ يقبل هذه المسارات وحدها (`src/layouts/root-logic.js` `_pageAllowed`) — ',
         '> وما لا يمرّ بحارسه يرتدّ إلى أول صفحةٍ متاحة أو «صفحتي». الخادمُ يحرس البيانات نفسَها بالمفاتيح (`docs/api.md`) — الحارسُ هنا حارسُ العرض.', '',
         '| المسار | العنوان | مفتاحُ الصفحة | الوحدةُ المالكة | الحارس | سلوكُ التنقّل | التبويبات/الفروع |', '|---|---|---|---|---|---|---|']
    for nav, title, key, owner, guard, beh, tabs in rows:
        L.append('| `#/%s` | %s | `%s` | `%s` | %s | %s | %s |' % (nav, title, key, owner, guard.replace('|', '¦'), beh, ' · '.join('`%s`' % t for t in tabs) or '—'))
    return '\n'.join(L) + '\n'

def main(a):
    rows, bad = build()
    text = md(rows)
    if '--write' in a:
        open(OUT, 'w', encoding='utf-8').write(text)
    elif not os.path.exists(OUT) or open(OUT, encoding='utf-8').read() != text:
        bad.append('docs/routes.md متقادمة — أعد --write')
    for b in bad: print('  ✘', b)
    print('النتيجة: %d مساراً بعنوانٍ ومالكٍ وحارسٍ وسلوكِ تنقّل · %d مخالفة' % (len(rows), len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
