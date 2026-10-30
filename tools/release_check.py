#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · SOT-074 / SOT-162 — فحصُ جاهزية الإصدار قبل أي نشر (Preview) أو تسليم: لا يُنشر مرشّحٌ بلا دليل.
   python3 tools/release_check.py 252 [--pk pk252] [--gate reports/k252/gate_252_run1.txt]
   يتحقق: CHANGELOG يحمل [KIVO_NNN] · الإصدارُ في الحزمة (brand ver · __BS_VER) يطابق · MANIFEST.sha256 يطابق الحزمة · سجلُّ البوابة موجود وخلاصتُه PASS (أو FAIL معلَن مع ملف الإخفاقات)
   · اختباراتُ الوحدة تمرّ على عامل الحزمة · براهينُ المصدر (check:NNN) · SBOM/البيئة/المخطّطات · لا catch فارغاً في الخادم · STATE.md يذكر المرشّح
   · (KIVO_263 · N13) لا عناصرَ نائبةً غيرَ مملوءة {{…}} في CHANGELOG وSTATE وreports/k<N>/decisions.md."""
import os, sys, re, json, subprocess, hashlib
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = sys.argv[1]; a = sys.argv[1:]
PK = os.path.join(H, a[a.index('--pk') + 1] if '--pk' in a else 'pk' + N)
GATE = os.path.join(H, a[a.index('--gate') + 1] if '--gate' in a else ('reports/k%s/gate_%s_run1.txt' % (N, N)))
P = F = 0
# KIVO_260 (كشفته البطاقةُ المستقلة النهائية — §٤ بند 13: «release_check 15/0» بلا سجلٍّ محفوظ): المخرجُ يُكتب أيضاً في reports/k<N>/release_check_<N>.txt
class _Tee:
    def __init__(self, s): self.s, self.buf = s, []
    def write(self, x): self.buf.append(x); return self.s.write(x)
    def flush(self): self.s.flush()
sys.stdout = _Tee(sys.stdout)
def _save_log():
    try:
        import datetime as _dt
        d = os.path.join(H, 'reports', 'k' + N); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'release_check_' + N + '.txt'), 'w', encoding='utf-8').write('# ' + _dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ') + ' · ' + ' '.join(['tools/release_check.py'] + sys.argv[1:]) + '\n' + ''.join(sys.stdout.buf))
    except Exception: pass
def ok(c, n, x=''):
    global P, F
    P += c; F += (not c); print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:300]) if x else ''))
rd = lambda p: open(p, encoding='utf-8', errors='ignore').read()
print('══ فحصُ جاهزية الإصدار KIVO_%s ══' % N)
ok(('## [KIVO_%s]' % N) in rd(os.path.join(H, 'CHANGELOG.md')), 'CHANGELOG يحمل قسم [KIVO_%s]' % N)
ok(('KIVO_%s' % N) in rd(os.path.join(H, 'STATE.md')), 'STATE.md يذكر KIVO_%s' % N)
# KIVO_263 · N13: لا إصدارَ ووثائقُه فيها عناصرُ نائبةٌ غيرُ مملوءة (مثل {{A_COUNTS}} · {{GATE_STATUS}} — تُملأ بعد حكم البوابة) · decisions.md إن وُجد
_ph = [f + ': ' + m for f in ('CHANGELOG.md', 'STATE.md', 'reports/k%s/decisions.md' % N) if os.path.exists(os.path.join(H, f)) for m in dict.fromkeys(re.findall(r'\{\{[A-Z][A-Z0-9_]*\}\}', rd(os.path.join(H, f))))]
ok(not _ph, 'لا عناصرَ نائبةً غيرَ مملوءة ({{…}}) في CHANGELOG وSTATE وقرارات الإصدار', _ph[:3])
w = rd(os.path.join(PK, '_worker.js')); mv = re.search(r"var WORKER_VER = '([\d.]+-(\d+))';", w)
# ملفُّ الإصدار الذي يشير إليه الغلافُ وحده (المجلدُ يحمل أيضاً ملفات الإصدارين السابقين --retain) · منذ KIVO_258 (AUD-016) يُكتب KIVO.__BS_VER — وwindow.__BS_VER موصِّلٌ إليه
_ref = re.search(r'src="/?(assets/js/270-bs-ver\.[0-9a-f]+\.js)"', rd(os.path.join(PK, 'index.html')))
bv = re.search(r'(?:window|KIVO)\.__BS_VER = "([\d.]+-(\d+))";', rd(os.path.join(PK, _ref.group(1))) if _ref else '')
ok(mv and bv and int(mv.group(2)) == int(N) - 100 and bv.group(2) == N, 'إصدارُ الحزمة: الخادم %s · الواجهة %s' % (mv and mv.group(1), bv and bv.group(1)))
man = os.path.join(H, 'pk%s.MANIFEST.sha256' % N)
if os.path.exists(man):
    bad = [l.split()[1] for l in rd(man).split('\n') if l.strip() and hashlib.sha256(open(os.path.join(H, l.split()[1]), 'rb').read()).hexdigest() != l.split()[0]]
    ok(not bad, 'MANIFEST.sha256 يطابق الحزمة (%d ملفاً)' % len([l for l in rd(man).split('\n') if l.strip()]), bad[:3])
else: ok(False, 'pk%s.MANIFEST.sha256 غيرُ موجود (شغّل tools/build_chain.sh %s)' % (N, N))
if os.path.exists(GATE):
    g = rd(GATE); tail = g[-600:]
    ok('البوابة الدائمة: PASS' in tail, 'سجلُّ البوابة PASS: ' + os.path.relpath(GATE, H), re.findall(r'══ البوابة الدائمة: [^═]*══', tail)[-1:] or 'لم تنتهِ')
    fails = [l for l in g.split('\n') if l.rstrip().endswith('FAIL')]
    # ملفُّ الإفصاح: <gate>_fixes.txt أو بلا لاحقة المقطع (run1a → run1_fixes.txt)
    _fx = [GATE.replace('.txt', '_fixes.txt'), re.sub(r'(run\d+)[a-z]+\.txt$', r'\1_fixes.txt', GATE)]
    ok(not fails or any(os.path.exists(x) for x in _fx), 'الإخفاقاتُ (%d) معلنةٌ في ملف _fixes إن وُجدت' % len(fails), [f[:60] for f in fails[:3]] if not any(os.path.exists(x) for x in _fx) else os.path.relpath([x for x in _fx if os.path.exists(x)][0], H))
else: ok(False, 'سجلُّ البوابة غيرُ موجود: ' + os.path.relpath(GATE, H))
r = subprocess.run(['node', '--no-warnings', '--test'] + sorted(os.path.join('tests/unit', f) for f in os.listdir(os.path.join(H, 'tests/unit')) if f.endswith('.test.mjs')), cwd=H, capture_output=True, text=True, env=dict(os.environ, KIVO_WORKER=os.path.join(PK, '_worker.js'), KIVO_DIST=PK))
m = re.search(r'# pass (\d+)\n# fail (\d+)', r.stdout); ok(m and m.group(2) == '0', 'اختباراتُ الوحدة على عامل الحزمة: ' + (m.group(0).replace('\n', ' · ') if m else r.stdout[-200:]))
r2 = subprocess.run(['npm', 'run', '-s', 'check:' + N], cwd=H, capture_output=True, text=True); ok(r2.returncode == 0, 'براهينُ المصدر check:%s' % N, (r2.stdout + r2.stderr).strip().splitlines()[-1][:120] if (r2.stdout + r2.stderr).strip() else '')
for name, cmd in [('SBOM', [sys.executable, 'tools/sbom.py', '--src', 'src', '--check']), ('البيئة', [sys.executable, 'tools/env_check.py', 'src']), ('catch الفارغ', [sys.executable, 'tools/empty_catch_ratchet.py', 'src']), ('الألوان الخام', [sys.executable, 'tools/color_ratchet.py', 'src']), ('نقاطُ الكسر', [sys.executable, 'tools/bp_ratchet.py', 'src']), ('الأيقونات', [sys.executable, 'tools/icons.py', 'check', '--src', 'src']), ('ESLint (السقّاطة)', ['bash', '-c', 'npm run -s lint 2>&1 | tail -1 | grep -q "✔"'])]:   # KIVO_258: سقّاطةُ ESLint قبل النشر (كانت في CI وحدها)
    rr = subprocess.run(cmd, cwd=H, capture_output=True, text=True); ok(rr.returncode == 0, name, (rr.stdout or rr.stderr).strip().splitlines()[0][:100] if (rr.stdout or rr.stderr).strip() else '')
print('══ النتيجة: نجح %d | أخفق %d — %s ══' % (P, F, 'جاهزٌ للنشر على Preview' if not F else 'غيرُ جاهز'))
_save_log()
sys.exit(1 if F else 0)
