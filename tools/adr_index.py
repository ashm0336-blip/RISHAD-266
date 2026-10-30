#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_258 · AUD-031 — فهرسُ سجلّ القرارات المعمارية (docs/adr/README.md) مولَّدٌ من رؤوس ملفات ADR نفسِها (العنوان · الحالة · البنود).
   python3 tools/adr_index.py [--check]     — --check: الفهرسُ المُلتزَم = التوليد بايتاً (وإلا خروجٌ غيرُ صفري)."""
import os, re, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADR = os.path.join(ROOT, 'docs', 'adr')
OUT = os.path.join(ADR, 'README.md')
def rows():
    out = []
    for f in sorted(glob.glob(os.path.join(ADR, 'ADR-*.md'))):
        t = open(f, encoding='utf-8').read().split('\n')
        title = re.sub(r'^#\s*', '', t[0]).strip()
        num, _, name = title.partition(' — ')
        st = next((l for l in t if l.startswith('- الحالة')), '- الحالة: —')
        st = re.sub(r'^- الحالة:\s*', '', st).strip()
        upd = [re.sub(r'^- تحديثُ الحالة[^:]*:\s*', '', l).strip() for l in t if l.startswith('- تحديثُ الحالة')]
        refs = sorted(set(re.findall(r'\b(?:SOT|AUD|ENG)-\d{3}\b', '\n'.join(t[:3]))))
        out.append((num.strip(), name.strip(), st.split(' · ')[0].strip(), (upd[-1] if upd else ''), os.path.basename(f), refs))
    return out
def render():
    L = ['# سجلُّ القرارات المعمارية (ADR) — الفهرس', '',
         '> مولَّدٌ من رؤوس الملفات بـ`tools/adr_index.py` (لا يُحرَّر يدوياً) · `--check` في البوابة. الصيغة: [ADR-000](ADR-000-record-format.md).', '',
         '| القرار | العنوان | الحالة | آخرُ تحديث | البنود |', '|---|---|---|---|---|']
    for num, name, st, upd, f, refs in rows():
        L.append('| [%s](%s) | %s | %s | %s | %s |' % (num, f, name.replace('|', '\\|'), st.replace('|', '\\|'), upd.replace('|', '\\|') or '—', ' · '.join(refs) or '—'))
    L.append('')
    return '\n'.join(L)
if __name__ == '__main__':
    txt = render()
    if '--check' in sys.argv:
        cur = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
        ok = cur == txt
        print(('✔' if ok else '✘') + ' docs/adr/README.md ' + ('= التوليد (' + str(len(rows())) + ' قراراً)' if ok else '≠ التوليد — شغّل tools/adr_index.py'))
        sys.exit(0 if ok else 1)
    open(OUT, 'w', encoding='utf-8').write(txt); print('✎ docs/adr/README.md (' + str(len(rows())) + ' قراراً)')
