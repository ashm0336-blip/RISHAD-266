# -*- coding: utf-8 -*-
"""KIVO_261 · شجرةُ صلاحيات الموظف وسقفُ الإدارة = المنصة 1:1 (ADR-024 · كشفها k261tree) · مدير النظام بالنقر (k261sys: فكُّ القفل AUD-052) ·
   العبثُ بالواجهة (k261tamper: lensZ AUD-054) · نوعُ الصورة في الخادم (SOT-068) · سقفُ الانتظار الطويل (AUD-050) · الجاهزية (SOT-145) ·
   إشعاراتُ النظام بلا حسابات الاختبار (SOT-183) · الرخص (THIRD-PARTY-NOTICES · fflate 0.8.3) ·
   تشديدُ المراجعة الأمنية المستقلة (AUD-055 lenses · AUD-056 بادئةُ tst_ · AUD-057 حدودُ الشكل · base64/الجزءُ الأوّل · عمرُ مقعد الانتظار · نطاقُ الفكّ) —
   إثباتُ الفرق بالضبط عن KIVO_260
   (الوسم git؛ KIVO_PREV_TAG يبدّله).
   (أ) الشجرة = الوسم عدا المعلن: اليدويةُ (CODE · ببصمة فرقٍ مراجَعة في k261diff.json) · المولَّدةُ بالأدوات (GEN) · الجديدةُ (NEW) — ولا غيرها.
   (ب) ثوابتُ 260 كما هي: الإضافات (AUD-030) · الوحداتُ المرجعية v24.9 بايتاً · شجرةُ v24.9 = الاشتقاق · طبقتا الرموز بلا رمزٍ جديد ·
       قواعدُ الاعتماد (SOT-091) · AUD-016 (kivo_ns --check · الملفاتُ المحرَّرة في 261 معلنةٌ في after) · قفلُ الدخول المؤقّت وصيغةُ الثواني (260).
   (ج) 261 نفسُه ساكناً (السلوكُ نفسُه تثبته الوحدة والمتصفح: tests/unit/{guard_unlock,img_type,perms_lensz,longpoll_cap,rm1_failclosed,global_keys,
       d1_fault_sweep,admin_routes,hardening_261} · cfbench/{k261tree,k261sys,k261tamper} — هذا الفحصُ للشكل وحده).
   (د) المشتقّات · الإصدار 161/261 · السقّاطات · البيئة · العقد = مساراتُ العامل · الحزمةُ من هذا المصدر · البنيةُ الرسمية · SOT v6.
       python3 tests/source/k261src.py [pk261] [--freeze]"""
import os, sys, hashlib, subprocess, json, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DIR = os.path.abspath(os.path.join(ROOT, ARGS[0] if ARGS else 'pk261'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_260')
FREEZE = '--freeze' in sys.argv
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
run = lambda cmd: subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')

print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا المعلن ═╗')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   المرجعُ ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q and os.path.exists(os.path.join(ROOT, q))}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
CODE = sorted(['src/core/270-bs-ver.js', 'workers/parts/002-seclog.js', 'workers/parts/056-enforce.js',                     # الإصدار
               'src/manifests/pages.json', 'src/schemas/pages.schema.json', 'tools/generate.py', 'tools/perm_tree.py',     # لوحاتُ «مؤشرات الإدارة» offPage
               'src/modules/planning/logic.js', 'src/permissions/334-perm-tree-tpl.js', 'src/layouts/root-logic.js',        # تبويبا الحاوية · kpiPanelOk
               'src/modules/kpis/logic.js', 'src/modules/award/logic.js', 'src/modules/admin/view.html',                    # · award/new · ترتيبُ الإعدادات
               'src/modules/admin/logic.js', 'workers/parts/063-enf-api-and-handler.js',                                    # AUD-052 فكُّ القفل · AUD-050 · SOT-145
               'workers/parts/054-image-contract.js', 'workers/parts/018-ancestry.js', 'src/api/contracts.json',            # SOT-068 · AUD-054 · العقد
               'src/services/442-notif-observer.js',                                                                        # SOT-183
               'workers/parts/020-dstats.js', 'workers/parts/059-protected-ops-2.js', 'src/api/280-server-storage.js',     # المراجعةُ المستقلة: AUD-055 · AUD-057
               'workers/parts/017-authorize-core.js',                                                                       # الجولة الثانية: null-prototype · badAcctId
               'src/services/441-notif-core.js',                                                                            # · «افتح» للوحات المؤشرات
               'src/modules/dreport/logic.js', 'src/modules/dreport/view.html', 'src/assets/icons/catalog.json',           # لافتةُ «عرض فقط» في التقرير اليومي (k261tree)
               'tools/sbom.py', 'tools/kivo_ns.json', 'tools/sec/audit.py', 'config/wrangler.toml', 'tools/onboard_check.sh'])
GEN = sorted(['workers/_worker.js', 'workers/parts/021-authz-core-intro.js', 'src/manifests/255-page-manifest.js', 'src/manifests/perm-tree24.json', 'src/types/kivo.d.ts',
              'src/pages/Admin.dc.html', 'src/pages/Award.dc.html', 'src/pages/Daily Report.dc.html', 'src/pages/KPIs.dc.html', 'src/pages/Planning.dc.html'])
NEW = ['public/THIRD-PARTY-NOTICES.txt']
want = sorted(set(CODE + GEN + NEW))
ok(diff == want and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' = المعلنة فقط (' + str(len(CODE)) + ' يدوياً · ' + str(len(GEN)) + ' بالأدوات · ' + str(len(NEW)) + ' جديدة)',
   json.dumps({'extra': [k for k in diff if k not in want], 'missing': [k for k in want if k not in diff], 'untracked': untracked}, ensure_ascii=False))
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'KIVO.__BS_VER = "2026.10.11-261";', '   الإصدار 2026.10.11-261')
pages_changed = sorted(k for k in cur if k.startswith('src/pages/') and prev.get(k) != cur.get(k))
ok(pages_changed == ['src/pages/Admin.dc.html', 'src/pages/Award.dc.html', 'src/pages/Daily Report.dc.html', 'src/pages/KPIs.dc.html', 'src/pages/Planning.dc.html'], '   الصفحاتُ المولَّدة المتغيّرة = وحداتُها المعدَّلة وحدها (الإعدادات · الجائزة · التقرير اليومي · المؤشرات · التخطيط)', pages_changed)
refp = ['workers/parts/' + f for f in sorted(os.listdir(ROOT + '/workers/parts')) if re.match(r'0(0[4-9]|1[0-6])-', f)]
ok(refp and all(prev.get(f) == cur.get(f) for f in refp), '★ الوحداتُ المرجعية v24.9 (' + str(len(refp)) + ' جزءاً) = الوسم بايتاً', [f for f in refp if prev.get(f) != cur.get(f)])
perm = sorted(k for k in diff if k.startswith(('src/permissions/', 'src/plugins/', 'src/manifests/', 'src/styles/', 'migrations/', 'src/schemas/')))
ok(perm == ['src/manifests/255-page-manifest.js', 'src/manifests/pages.json', 'src/manifests/perm-tree24.json', 'src/permissions/334-perm-tree-tpl.js', 'src/schemas/pages.schema.json'],
   '★ الصلاحياتُ والبياناتُ الوصفية: offPage في pages.json ومخطّطِها ومشتقّاتِها · kpiPanelOk في 334 — ولا إضافاتٍ ولا أنماطٍ ولا ترحيلات', perm)

print('\n╔═ (ب) ثوابتُ 260 كما هي ═╗')
pc = run([sys.executable, 'tools/plugins.py', 'check'])
ok(pc.returncode == 0 and '6 عدسة' in pc.stdout, '★ tools/plugins.py check (AUD-030)', pc.stdout.strip().split('\n')[-1][:200])
sys.path.insert(0, os.path.join(ROOT, 'tools')); import plugins as PL
W = rd(ROOT + '/workers/_worker.js'); m = re.search(r'var KIVO_LENS_PLUGINS = (\{.*?\});\n', W)
ok(m is not None and json.loads(m.group(1)) == PL.table(os.path.join(ROOT, 'src')) and W.count('var KIVO_LENS_PLUGINS = ') == 1, '   KIVO_LENS_PLUGINS في العامل = جدولُ الإضافات (مرّةً واحدة)')
pt = run([sys.executable, 'tools/perm_tree.py', 'check'])
ok(pt.returncode == 0, '★ شجرةُ v24.9 = الاشتقاق (perm-tree24.json من الوثيقة والسجلّ وpages.json)', pt.stdout.strip()[-140:])
tc = run([sys.executable, 'tools/tokens.py', 'check', 'src'])
ok(tc.returncode == 0, '   tools/tokens.py check (AUD-017)', tc.stdout.strip()[:160])
tv = run([sys.executable, 'tools/tokens.py', 'verify', 'src', 'git:' + TAG])
ok(tv.returncode == 0 and ' 0 فرق منها 0 ' in tv.stdout and 'داكن: 0 منها 0' in tv.stdout, '★ tokens verify مقابل ' + TAG + ': 0 فرقٍ محسوب (لا رمزَ جديداً في 261)', tv.stdout.split('\n')[0][:220])
dc = run([sys.executable, 'tools/deps_check.py'])
ok(dc.returncode == 0, '   tools/deps_check.py: 0 مخالفة (SOT-091)', dc.stdout.strip().split('\n')[-1][:160])
ns = run(['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--check'])
ok(ns.returncode == 0, '★ kivo_ns --check (AUD-016)', ns.stdout.strip().split('\n')[-1][:160])
NSJ = json.load(open(ROOT + '/tools/kivo_ns.json', encoding='utf-8'))
ED = ['src/services/442-notif-observer.js', 'src/services/441-notif-core.js', 'src/api/280-server-storage.js', 'src/modules/dreport/logic.js', 'src/modules/planning/logic.js', 'src/permissions/334-perm-tree-tpl.js', 'src/modules/kpis/logic.js', 'src/modules/award/logic.js', 'src/modules/admin/logic.js', 'src/layouts/root-logic.js']
ok(all(f in NSJ['after'] for f in ED), '   الملفاتُ المحرَّرة في 261 معلنةٌ في kivo_ns.json after', [f for f in ED if f not in NSJ['after']])
P54 = rd(ROOT + '/workers/parts/054-image-contract.js'); P63 = rd(ROOT + '/workers/parts/063-enf-api-and-handler.js')
ok(P54.count('var LOCK_PROV_MS = 1500;') == 1 and 'function secAr(n) {' in P54, '   قفلُ الدخول المؤقّت (LOCK_PROV_MS) وsecAr كما في 260')

print('\n╔═ (ج) KIVO_261 ساكناً ═╗')
PJ = json.load(open(ROOT + '/src/manifests/pages.json', encoding='utf-8'))
PAGES = PJ['pages'] if isinstance(PJ, dict) else PJ
offs = sorted(p['key'] + '/' + x['key'] for p in PAGES for x in (p.get('subs') or []) + (p.get('tabs') or []) if x.get('offPage'))
PJ0 = json.loads(git('show', TAG + ':src/manifests/pages.json')); PAGES0 = PJ0['pages'] if isinstance(PJ0, dict) else PJ0
offs0 = sorted(p['key'] + '/' + x['key'] for p in PAGES0 for x in (p.get('subs') or []) + (p.get('tabs') or []) if x.get('offPage'))
ok(sorted(set(offs) - set(offs0)) == ['daily/kpiDaily', 'daily/kpiOcc', 'daily/kpiZones', 'irshad/dash', 'planning/readiness', 'seized/dash'] and set(offs0) <= set(offs),
   '★ offPage الجديدة = لوحاتُ «مؤشرات الإدارة» الستّ وحدها (refs الحاوية kpis) — لا تفتح صفحتَها؛ وما كان offPage قبلُ باقٍ (' + str(len(offs0)) + ')', {'new': sorted(set(offs) - set(offs0)), 'before': offs0})
SCH_T = rd(ROOT + '/src/schemas/pages.schema.json')
ok(re.search(r'"offPage":\s*\{\s*"type":\s*"boolean"\s*\}', SCH_T) is not None, '   المخطّطُ يعرف offPage منطقياً (subs/tabs)')
P21 = rd(ROOT + '/workers/parts/021-authz-core-intro.js')
ok(all(re.search(r"key: '%s'[^\n]*off: \[[^\]]*'%s'" % (a, b), P21) for a, b in (('planning', 'readiness'), ('irshad', 'dash'), ('seized', 'dash'), ('daily', 'kpiDaily'))), '   PG_REG في الخادم يحمل off للحاويات الأربع (مولَّدٌ من pages.json)')
PL0 = rd(ROOT + '/src/modules/planning/logic.js')
ok('_ptOk(k) {' in PL0 and 'return !P || !P.can || !!P.can(k, "view");' in PL0 and 'ptOn: (S ? "sched" : "") + (S && P ? " " : "") + (P ? "plan" : ""),' in PL0 and 'if (!this._ptOk("sched" === t ? "staff" : "plan")) return;' in PL0,
   '★ التخطيط: تبويبا الحاوية بصلاحية المستخدم (on ∧ can view) لا بسقف الإدارة وحده · ptOn بلا فراغٍ أوّل')
T334 = rd(ROOT + '/src/permissions/334-perm-tree-tpl.js')
ok('function kpiPanelOk(pk, sk){' in T334 and 'kpiPanelOk: kpiPanelOk' in T334, '★ kpiPanelOk في 334 مصدراً واحداً لحكم لوحات المؤشرات (ومُصدَّرة)')
RL = rd(ROOT + '/src/layouts/root-logic.js'); KL = rd(ROOT + '/src/modules/kpis/logic.js')
ok(RL.count('P.kpiPanelOk ? P.kpiPanelOk(x[0], x[1])') == 3 and 'if (r && r.kpiPanelOk) return !!r.kpiPanelOk(n, t);' in KL, '   الغلافُ (3 مواضع) وصفحةُ المؤشرات يستعملانها')
AW = rd(ROOT + '/src/modules/award/logic.js')
ok('o = s("new"),' in AW and 's("new") && this.awCan("add")' not in AW, '★ الجائزة: تبويبُ «ترشيح جديد» يُرى بالعرض وحده (لافتةُ «عرضٌ فقط») — كما في الشجرة')
AV = rd(ROOT + '/src/modules/admin/view.html')
ok(0 < AV.index('data-d-tab="ptpls"') < AV.index('data-d-tab="import"'), '★ شريطُ «الإعدادات»: «قوالب الصلاحيات» قبل «استيراد بيانات» = ترتيبُ pages.json والشجرة')
NO = rd(ROOT + '/src/services/442-notif-observer.js')
ok("if (/^tst_/.test(String(r.uid || ''))) return;" in NO and 'TEST_ONLY/.test(String(r.name' not in NO, '★ SOT-183: إشعاراتُ النظام لا تُولَّد من صفوف حسابات الاختبار (بالمعرّف وحده — لا بالاسم الذي يحرّره المدير)')
ok('var LP_MAX_UID = 3, LP_MAX_ALL = 400, LP_TTL = 35000, LP_ACT = new Map();' in P54 and 'function lpEnter(uid)' in P54 and 'function lpLeave(uid, t)' in P54 and 'function lpPrune(now)' in P54
   and "rv2 <= since && (lpT = lpEnter(ss.uid))" in P63 and 'finally { lpLeave(ss.uid, lpT); }' in P63,
   '★ AUD-050: انتظارُ /api/changes محدودٌ (3 لكل حساب · 400 للمثيل) · المقعدُ يتحرّر في finally وعمرُه 35 ث (قطعُ الاتصال لا يحبسه) · Map لا كائن')
ok("pingOut.ready = 0; pingOut.mode = 'protect';" in P63 and 'pingOut.schemaOk = String(pingOut.schemaDb) === String(KIVO_SCHEMA_VERSION) ? 1 : 0; pingOut.ready = pingOut.schemaOk;' in P63, '★ SOT-145: النبضُ يعلن الجاهزية (ready · schemaOk) ووضعَ الحماية')
ok("return g === 'u:' + unL || (g.indexOf(pre) === 0 && g.slice(pre.length).indexOf('|') === -1);" in P63 and 'gks: lk.map(function (x) { return x.gk; })' in P63
   and "g.indexOf('p:') === 0 && g.slice(g.lastIndexOf('|') + 1) === ip && g.indexOf(pre) !== 0" in P63
   and "if (Array.isArray(bg.gks) && !gks2.length) return json({ ok: 1, n: 0 });" in P63 and "/^(u|ip|p):/.test(x)" in P63
   and "if (gk2 && !/^(u|ip|p):/.test(gk2)) return json({ ok: 0, err: 'gk' }, 400);" in P63 and "if (!gk2 && !Array.isArray(bg.gks) && bg.all !== 1) return json({ ok: 0, err: 'gk' }, 400);" in P63
   and 'bg = isObj(bg) ? bg : {};' in P63,
   '★ AUD-052: صفُّ المحاولات الفاشلة يحمل أقفالَ الاسم الفعلية (الزوج · والمصدرُ إن لم يكن مقفلاً على أسماءٍ أخرى) والفكُّ يحذفها · قائمةٌ بلا مفتاحٍ صالح لا تفكّ شيئاً · gk ببادئةٍ معروفة · «فكُّ الكلّ» بـ{all:1} وحده')
AL = rd(ROOT + '/src/modules/admin/logic.js')
ok(AL.count('gks: t.gks || []') == 2, '   الواجهة: زرّا «فكّ القفل» يرسلان gks')
ok("var IMG_TYPE_RX = /^data:image\\/[a-z0-9.+-]{1,40}(?:;[a-z0-9=.+-]{1,60}){0,4};base64,/i;" in P54 and "var B64_RX = /^[A-Za-z0-9+\\/=\\r\\n]*$/;" in P54 and 'function imgPartOk(text)' in P54
   and P63.count('return json({ ok: 0, err: IMG_TYPE_ERR }, 415);') == 4 and "return json({ ok: 0, err: 'part0-missing' }, 409);" in P63,
   '★ SOT-068: ما ليس data:image/…;base64 (وأبجديةَ base64 كلَّه) يُرفض 415 قبل أيّ كتابة (طلبٌ واحد · الجزءُ الأوّل · التالي · المجمَّع) · جزءٌ تالٍ بلا أوّل 409')
A18 = rd(ROOT + '/workers/parts/018-ancestry.js')
ok("if (k === 'lensZ') { if (deq(o.lensZ, n.lensZ) || (n.lensZ === 1 && !o.lensZ)) continue; return { ok: false, why: 'super' }; }" in A18 and "k === 'empLens' || k === 'lensZ') continue;" not in A18,
   '★ AUD-054: lensZ في bassam_perms_v1 كما هي أو 1 من غياب — لا قيمةَ أخرى من غير مدير النظام')
D20 = rd(ROOT + '/workers/parts/020-dstats.js'); P59 = rd(ROOT + '/workers/parts/059-protected-ops-2.js')
ok("if ((b !== undefined && !isObj(b)) || (a !== undefined && a !== null && !isObj(a))) return false;" in D20, '★ AUD-055: ترحيلُ العدسات الآلي يقبل كائناً أو غياباً وحده (لا نصَّ ولا مصفوفةَ بأيّ حجم)')
ok("var USER_FMAX = { name: 120, email: 254, phone: 32, un: 64, alt: 64, ph: 600 };" in A18 and 'return JSON.stringify(b).length <= 4096;' in A18 and 'function deptPermShapeOk(eo, en, to, tn, lo, ln)' in A18
   and "if (!deptPermShapeOk(eo, en, to, tn, lo, ln)) return { ok: false, why: 'shape' };" in A18 and "if (a && b && eqExcept(a, b, SELF_FIELDS) && userRecOk(b)) continue;" in A18
   and "if (b && !userRecOk(b)) return { ok: false, why: 'shape' };" in A18
   and "(sup || userRecOk(b))" in P59 and "if (b && !userRecOk(b)) return enfNo('shape');" in P59,
   '★ AUD-057: حدودُ الشكل في الوضعين — سجلُّ الحساب (حقولٌ نصيةٌ محدودة · ≤ 4 KB) · أوراقُ الموظف والقالبُ وعدساتُ الموظف في bassam_perms_v1 (المتغيّرُ وحده)')
A17 = rd(ROOT + '/workers/parts/017-authorize-core.js')
ok('var c1 = Object.create(null), c2 = Object.create(null), k;' in A17 and 'function nmap() { return Object.create(null); }' in A17
   and 'var BAD_ID_RX = /^(__proto__|prototype|constructor)$/;' in A17 and 'function badAcctId(id)' in A17,
   '★ الجولة الثانية (المراجعةُ المستقلة): eqExcept بكائناتٍ null-prototype · nmap · badAcctId — مفتاحٌ خبيثٌ خاصيّةٌ تُفحص لا مُسنِدٌ صامت')
ok("if (inc.some(function (x) { return !x || !x.id || badAcctId(x.id); })) return { ok: false, why: 'users' };" in A18
   and "if (inc.some(function (x) { return !x || !x.id || badAcctId(x.id); })) return enfNo('users');" in P59
   and 'var byA = nmap(), byB = nmap(), ids = nmap()' in A18 and 'var byA = nmap(), byB = nmap(), ids = nmap()' in P59,
   '★ معرّفُ الحساب الخبيث (__proto__…) مرفوضٌ في usersRule وenfUsersWrite · الخرائطُ بمعرّف الحساب null-prototype (لا تخطّي حلقة الفحص)')
ok('function usersTstNew(inc, cur)' in P54 and "!enfFixtureOn(env) && usersTstNew(parseJson(it0.v, []), parseJson(cur0, []))" in P54,
   '★ AUD-056: حسابٌ جديدٌ بمعرّفٍ يبدأ بـtst_ يُرفض إلا حيث أداةُ الاختبار مفعَّلة (إشعاراتُ النظام تتجاهل هذه البادئة)')
S280 = rd(ROOT + '/src/api/280-server-storage.js')
ok('shape: "قيمةٌ خارج الحدود المسموحة طولاً أو شكلاً"' in S280, '   الواجهة: سببُ الرفض shape برسالةٍ عربية')
N441 = rd(ROOT + '/src/services/441-notif-core.js')
ok("var GO_KPI = { 'افتح مؤشرات الجاهزية': ['planning', 'readiness'], 'افتح المؤشرات': ['daily', 'kpiDaily'], 'افتح الإشغال': ['daily', 'kpiOcc'], 'افتح لوحة المؤشرات': ['seized', 'dash'] };" in N441
   and "if (nav === 'kpis') { var KP = GO_KPI[x.go]; return !!(KP && Pm.kpiPanelOk ? Pm.kpiPanelOk(KP[0], KP[1]) : false); }" in N441
   and "'افتح مؤشرات الجاهزية':'kpis'" in N441 and "'افتح لوحة المؤشرات':'kpis'" in N441,
   '★ «افتح» في التنبيه للوحات المؤشرات يذهب إلى «مؤشرات الإدارة» (حيث تُعرض وحدها) ويُحكم بلوحته (kpiPanelOk)')
ok("} catch (e) { return false; }   /* KIVO_261 (المراجعةُ المستقلة)" in T334, '   kpiPanelOk: العطلُ يُخفي لا يُظهر')
DRL = rd(ROOT + '/src/modules/dreport/logic.js'); DRV = rd(ROOT + '/src/modules/dreport/view.html')
ok('drPmReadOnly: !(this.PC("add") || this.PC("edit") || this.PC("approve") || this.PC("del")),' in DRL and '<sc-if value="{{drPmReadOnly}}"' in DRV and 'صلاحيتك على هذه الصفحة: <b style="font-weight:800">عرض فقط</b>' in DRV,
   '★ التقرير اليومي: لافتةُ «عرض فقط» حين لا يملك المستخدمُ إضافةً ولا تعديلاً ولا اعتماداً ولا حذفاً — كسائر الصفحات (كشفه k261tree)')
ok('var IMG_DAY_MAX = 256 * 1024 * 1024;' in P54 and "bind('rl:iq:' + uid + ':' + day, bytes, end)" in P54
   and "var qI = AI.u.role === 'super' ? 0 : await imgQuotaHit(env, AI.u.id, rawI.byteLength);" in P63 and "if (qI) return json({ ok: 0, err: IMG_QUOTA_ERR, retry: qI }, 429, { 'Retry-After': String(qI) });" in P63,
   '★ حصّةُ رفع الصور اليومية (المراجعةُ المستقلة · البند 5): 256 MB لكل حساب غير مدير النظام — قبل أيّ كتابة · العدّادُ ببادئة rl: (لا يُعدّ قفلاً)')
CT = json.load(open(ROOT + '/src/api/contracts.json', encoding='utf-8')); byp = {r['path']: r for r in CT['routes']}
ok('schemaOk' in json.dumps(byp['/api/ping']) and 'protect_extra' in json.dumps(byp['/api/ping']) and 'gks' in json.dumps(byp['/api/guard/unlock']) and '415' in byp['/api/img/']['responses'], '   العقد: ping (ready · schemaOk · protect) · unlock (gks) · img (415)')
TN = rd(ROOT + '/public/THIRD-PARTY-NOTICES.txt')
ok(all(x in TN for x in ('React 18.3.1', 'ReactDOM 18.3.1', 'Cairo', 'Almarai', 'Permission is hereby granted', 'SIL OPEN FONT LICENSE Version 1.1')) and 'docs/' not in TN and 'fflate' not in TN,
   '★ THIRD-PARTY-NOTICES.txt: React/ReactDOM (MIT) · Cairo/Almarai (OFL-1.1) بنصوصها الكاملة — وبلا مساراتٍ داخلية ولا ما لا يُشحن')
SB = rd(ROOT + '/tools/sbom.py')
ok("comp('fflate', '0.8.3', 'MIT'" in SB and "comp('KIVO bullet glyph', '1.000', 'proprietary'" in SB and 'THIRD-PARTY-NOTICES.txt لا يحمل' in SB and 'THIRD-PARTY-NOTICES.txt غائب' in SB,
   '   tools/sbom.py: fflate 0.8.3 (لا يُشحن) · رمزُ KIVO مستقلٌّ عن Cairo · فحصُ الإشعارات (وغيابُها خطأ)')

print('\n╔═ بصماتُ الفروق المراجَعة ═╗')
FP = ROOT + '/tests/source/k261diff.json'
REASONS = {
 'workers/parts/002-seclog.js': 'الإصدار 2026.10.11-161', 'workers/parts/056-enforce.js': 'ENF_VER KIVO_261',
 'src/manifests/pages.json': 'KIVO_261 (SOT-003 · ADR-024): لوحاتُ «مؤشرات الإدارة» الستّ offPage — لا تفتح صفحتَها (تُعرض في المؤشرات وحدها) · ملاحظةُ الملف',
 'src/schemas/pages.schema.json': 'KIVO_261: offPage منطقيٌّ في subs/tabs',
 'tools/generate.py': 'KIVO_261: PG_REG في الخادم يُولِّد off من offPage (لا تُحتسب صفحةً)',
 'tools/perm_tree.py': 'KIVO_261: أوراقُ offPage في refs الحاوية kpis — kind offpage وroute #/kpis مع حفظ docKind/docRoute من الوثيقة (الشجرةُ = المنصة)',
 'src/modules/planning/logic.js': 'KIVO_261 (كشفه k261tree): تبويبا «الجدول الشهري» و«التشغيل الميداني» بصلاحية المستخدم (_ptOk = on ∧ can view) لا بسقف الإدارة وحده · ptOn بلا فراغٍ أوّل',
 'src/permissions/334-perm-tree-tpl.js': 'KIVO_261: kpiPanelOk — حكمُ لوحات المؤشرات مصدراً واحداً (canSub view · kpiOcc ⇐ zones∧dens · kpiZones ⇐ zones · kpiDaily ⇐ dreport) · العطلُ يُخفي (catch ⇒ false)',
 'src/layouts/root-logic.js': 'KIVO_261: رابطُ «مؤشرات الإدارة» يظهر بـkpiPanelOk (3 مواضع) — كان يظهر للوحةٍ لا تُعرض',
 'src/modules/kpis/logic.js': 'KIVO_261: _okOf يستعمل kpiPanelOk',
 'src/modules/award/logic.js': 'KIVO_261 (كشفه k261tree): «ترشيح جديد» يُرى بالعرض وحده (لافتةُ «عرضٌ فقط») — كان يشترط add فيخفي ورقةً ممنوحة',
 'src/modules/admin/view.html': 'KIVO_261 (كشفه k261tree): شريطُ «الإعدادات» بترتيب pages.json — «قوالب الصلاحيات» قبل «استيراد بيانات»',
 'src/modules/admin/logic.js': 'KIVO_261 (AUD-052 · كشفه k261sys): «فكّ القفل» يرسل gks — أقفالُ الاسم الفعلية من /api/overview',
 'workers/parts/063-enf-api-and-handler.js': 'KIVO_261: AUD-050 (lpEnter/lpLeave(uid, t) حول انتظار /api/changes) · SOT-145 (ping: ready · schemaOk · mode protect) · AUD-052 (fails.until/gks من الزوج والمصدر غير المشترك · unlock: gks مقيَّدة · gk ببادئة · {all:1} صريحاً · null 400) · SOT-068 (415 أربع مرات · الجزءُ التالي base64 وبعد أوّلٍ مرحَّل 409 · المجمَّعُ المرفوض يكنس المرحَّل) · حصّةُ الرفع اليومية قبل الكتابة (429)',
 'workers/parts/054-image-contract.js': 'KIVO_261: AUD-050 (LP_MAX_UID 3 · LP_MAX_ALL 400 · LP_TTL 35 ث · Map · lpPrune) · SOT-068 (IMG_TYPE_RX بـ;base64 · B64_RX · imgTypeOk · imgPartOk · IMG_TYPE_ERR · تعليقُ الاستعادتين) · AUD-056 (usersTstNew وحجزُ tst_ في applySave) · حصّةُ الرفع اليومية (IMG_DAY_MAX · imgQuotaHit · IMG_QUOTA_ERR)',
 'workers/parts/018-ancestry.js': 'KIVO_261 (AUD-054 · كشفه k261tamper): lensZ في permsRule كما هي أو 1 من غياب — كانت تُتخطّى كلياً · AUD-057 (المراجعةُ المستقلة): userRecOk · deptPermShapeOk · sheetShapeOk في usersRule وpermsRule · الجولة الثانية: رفضُ معرّفٍ خبيث (badAcctId) وخرائطُ null-prototype',
 'workers/parts/020-dstats.js': 'KIVO_261 (AUD-055 · المراجعةُ المستقلة): lensesUpgradeOnly يرفض غيرَ الكائن (كان يُعدّ {} فيمرّ نصٌّ أو مصفوفةٌ بأيّ حجم)',
 'workers/parts/059-protected-ops-2.js': 'KIVO_261 (AUD-057 · المراجعةُ المستقلة): enfUsersWrite — سجلُّ الحساب الذاتيّ وسجلُّ الموظف في نطاق المدير بحدود userRecOk · الجولة الثانية: رفضُ معرّفٍ خبيث وخرائطُ null-prototype',
 'src/api/280-server-storage.js': 'KIVO_261 (AUD-057): رسالةُ سبب الرفض shape بالعربية',
 'src/services/441-notif-core.js': 'KIVO_261 (المراجعةُ المستقلة · الشجرةُ = المنصة): «افتح» للوحات المؤشرات (الجاهزية · المؤشرات · الإشغال · لوحة المؤشرات) يذهب إلى kpis ويُحكم بـkpiPanelOk (GO_KPI)',
 'src/modules/dreport/logic.js': 'KIVO_261 (SOT-010 · كشفه k261tree): drPmReadOnly — لا إضافةَ ولا تعديلَ ولا اعتمادَ ولا حذف',
 'src/modules/dreport/view.html': 'KIVO_261 (SOT-010 · كشفه k261tree): لافتةُ «عرض فقط» بنصّ سائر الصفحات وبرموز السمة القائمة (لا رمزَ جديد)',
 'src/assets/icons/catalog.json': 'KIVO_261: عددُ مواضع i-ec9ec7cc (أيقونةُ اللافتة) 10 → 11 (tools/icons.py extract)',
 'src/api/contracts.json': 'KIVO_261: ping super_extra (schemaOk · ready) · protect_extra (ready · mode) · unlock gks/all/400 · img 409/415/429 (base64 · الجزءُ الأوّل · الحصّة)',
 'src/services/442-notif-observer.js': 'KIVO_261 (SOT-183): pollSec يتخطّى صفوفَ حسابات العُدّة بالمعرّف tst_ وحده (لا بالاسم الذي يحرّره المدير)',
 'tools/sbom.py': 'KIVO_261 (SOT-141): fflate 0.8.3 (مطابقٌ بايتاً لحزمة npm · لا يُشحن) · Cairo 3.130 · Almarai 1.10 · رمزُ KIVO مستقلّ · فحصُ THIRD-PARTY-NOTICES (وغيابُه خطأ) · نصُّ LICENSES المصحَّح',
 'tools/kivo_ns.json': 'AUD-016: after += 442 · planning/logic · 334 · kpis/logic · award/logic · 441 · dreport/logic (261) — والملاحظة',
 'tools/sec/audit.py': 'الافتراضيُّ pk261 (كان pk260)',
 'config/wrangler.toml': 'مجلدُ البناء pk261 (كان pk260)',
 'tools/onboard_check.sh': 'الافتراضيُّ 261 (كان 260)',
 'workers/parts/017-authorize-core.js': 'KIVO_261 (المراجعةُ المستقلة · الجولة الثانية): eqExcept بكائناتٍ null-prototype · nmap() · badAcctId — تمتينٌ ضدّ مفاتيح __proto__/constructor/prototype في معرّفات الحسابات وحقولها',
}
fps = {}
for name in CODE:
    if name == 'src/core/270-bs-ver.js': continue
    d = subprocess.run(['git', 'diff', '--no-color', TAG, '--', name], capture_output=True, cwd=ROOT).stdout
    fps[name] = {'sha256': sha(d), 'lines': d.count(b'\n'), 'why': REASONS.get(name, '')}
if FREEZE:
    if not prev: raise SystemExit('✘ لا تجميدَ بلا مرجع ' + TAG)
    json.dump(fps, open(FP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   (تجميد) ' + str(len(fps)) + ' بصمة كُتبت في k261diff.json')
rec = json.load(open(FP, encoding='utf-8')) if os.path.exists(FP) else {}
bad = [n for n in fps if rec.get(n, {}).get('sha256') != fps[n]['sha256']]
ok(bool(rec) and not bad and set(rec) == set(fps), '★ بصمةُ فرق كلّ ملفٍّ يدوي (' + str(len(fps)) + ') = المسجَّلةُ بعد المراجعة في k261diff.json', json.dumps({'changed-since-review': bad[:5]}, ensure_ascii=False))
ok(all(fps[n]['why'] for n in fps), '   لكل ملفٍّ سببٌ مكتوب', [n for n in fps if not fps[n]['why']])

print('\n╔═ (د) المشتقّاتُ والإصدارُ والسقّاطاتُ والعقدُ والبنيةُ الرسمية ═╗')
chk = run([sys.executable, 'tools/generate.py', '--src', 'src', '--check'])
ok(chk.returncode == 0 and '✘' not in chk.stdout, '   المشتقّات = مصادرها (generate --check · ومعه المخطّطات والإضافات)')
ty = run(['node', 'tools/gen_types.mjs', '--check']); ok(ty.returncode == 0, '   src/types/kivo.d.ts = التوليد', ty.stdout.strip()[:120])
ic = run([sys.executable, 'tools/icons.py', 'check', '--src', 'src']); ok(ic.returncode == 0, '   icons check', ic.stdout.strip().split('\n')[-1][:120])
ok("var WORKER_VER = '2026.10.11-161';" in W and "var ENF_VER = 'KIVO_261 · enforce 2" in W, '   الخادم 2026.10.11-161 · ENF_VER KIVO_261')
ec = run([sys.executable, 'tools/empty_catch_ratchet.py', 'src']); ok(ec.returncode == 0, '   لا catch فارغاً جديداً (السقّاطة)', (ec.stdout or ec.stderr).strip().split('\n')[0][:120])
cr = run([sys.executable, 'tools/color_ratchet.py', 'src']); ok(cr.returncode == 0, '   لا لونَ خاماً جديداً (السقّاطة)', (cr.stdout or cr.stderr).strip().split('\n')[0][:120])
ev = run([sys.executable, 'tools/env_check.py', 'src']); ok(ev.returncode == 0 and 'wrangler.toml متّسق' in ev.stdout, '   مخطّطُ البيئة = العامل · wrangler.toml متّسق بلا أسرار', ev.stdout.strip()[:160])
exact = sorted(set(re.findall(r"path === '(/api/[a-z0-9/_-]+)'", W))); pref = sorted(set(re.findall(r"path\.indexOf\('(/api/[a-z0-9_-]+/)'\)", W)))
ok(sorted(r['path'] for r in CT['routes']) == sorted(exact + pref), '★ src/api/contracts.json = مساراتُ العامل حرفاً (' + str(len(CT['routes'])) + ') — لا مسارَ جديد')
if os.path.isdir(DIR):
    bj = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else None
    ok(bj is not None and bj['files']['_worker.js']['sha256'] == sha(open(ROOT + '/workers/_worker.js', 'rb').read()), '   ' + os.path.basename(DIR) + '/_worker.js = workers/_worker.js (الحزمةُ مبنيّةٌ من هذا المصدر)')
    ok(bj is not None and sorted(bj.get('retained', [])) == ['pk259', 'pk260'], '   نافذةُ الإصدارين: pk260 وpk259 (آخرُ إصدارين منشورَين على Preview)', bj and bj.get('retained'))
    ok(bj is not None and 'THIRD-PARTY-NOTICES.txt' in bj['files'], '   الحزمةُ تحمل THIRD-PARTY-NOTICES.txt في جذرها')
rs = run([sys.executable, 'tools/restructure_official.py'])
ok(rs.returncode == 0 and 'مدخلاتُ الجذر الرسمية: 15 ' in rs.stdout, '★ tools/restructure_official.py: مدخلاتُ الجذر الرسمية 15 · لا مرجعَ قديماً', rs.stdout.strip()[-200:])
_doc = os.path.join(ROOT, 'docs/reference/v24_9_FINAL.html')
ok(os.path.exists(_doc) and sha(open(_doc, 'rb').read()) == '6e9aba634577b9ac09498edcb0a5b42453bf44c1509e6ae272281162d2a1cdde', '   وثيقةُ v24.9 = المرجعُ بايتاً (SHA-256 6e9aba63…)')
sv = run([sys.executable, 'tools/sot_verify.py'])
ok(sv.returncode == 0, '★ SOT v6 متّسق (tools/sot_verify.py)', sv.stdout.strip().split('\n')[-1][:200])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
