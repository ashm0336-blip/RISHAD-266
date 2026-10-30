/* KIVO_264 · KIVO-Tasks — عُدّةُ بيانات المهام الاصطناعية (TEST_ONLY) لاختبارات tests/unit/tasks_*.test.mjs
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   شكلُ العطل الإنتاجيّ P0 (نسخةُ الإدارة: 17 سجلَّ موظف · 56 مهمة · 54 منها مسندةٌ بمعرّفاتٍ تطابق سجلّات الموظفين) مبنيٌّ هنا
   ببياناتٍ اصطناعيةٍ وحدها — لا شيءَ من Production: الأسماءُ والأرقامُ والمعرّفاتُ كلُّها tst_/TEST_ONLY.
   الأساس: المُثبِّتُ القياسيّ tests/fixtures/gen_fixture.py (إدارة tst_d1 بعشرة موظفين وحساباتهم ومدير الإدارة tst_dm1)، ويُضاف:
     • سبعةُ موظفين جدد tst_e_p0_1…7 (فتصير الإدارةُ 17 سجلاً) ولكلٍّ حسابُ دخولٍ نشط tst_p0e1…7 — «موظفٌ عادي» بلا ورقة صلاحيات أصلاً
       (لا task.view ولا غيره) كما هو الموظفُ في الإدارة الحقيقية.
     • مخزنُ مهامٍ جديد بـ56 صفاً: 54 مسنداً (العمود 14 = eid الموظف) على الموظفين الـ17 · 2 عامّة (بلا مسند) — عبر أيامٍ وأشهر:
       اليوم · غداً · أمس (منتهية المهلة) · الشهر الماضي (منجزة بتوثيقٍ وصورة · معتذَر عنها) · صفٌّ قديمُ الشكل (14 عموداً فقط).
     • صورةُ توثيقٍ مخزّنة (imgs) مملوكةٌ لمخزن المهام (imgown bound) لمهمّةٍ منجزة لكلٍّ من الموظف tst_e_p0_1 وزميله tst_e_p0_2.
   الحتمية: الصفوفُ والمعرّفاتُ ثابتة؛ الطوابعُ الزمنية نسبيّةٌ إلى «الآن» (لازمةٌ لدلالة: قادمة/جارية/منتهية المهلة). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { PYTHON, makeTestEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client, applySql, ROOT, DIST } from './harness.mjs';
import {installIrshadFixture} from './irshad_legacy_seed_fx.mjs';
import {installBusinessFixture} from './business_legacy_seed_fx.mjs';
import {installOperationalFixture,inspectOperationalFixture,isOperationalFixtureKey,replaceOperationalFixture} from './operational_legacy_seed_fx.mjs';
export {replaceOperationalFixture};

export const TAG = 'TEST_ONLY';
export const D = 'tst_d1';
export const KT = 'bsdept:' + D + ':bassam_tasks_v1';
export const KN = 'bsdept:' + D + ':bassam_notif_v1';
export const KE = 'bsdept:' + D + ':bassam_employees_v1';
/* اليومُ الهجريّ للخادم (أم القرى · الرياض · مهلةُ 3 ساعات) — كما تفعل اختباراتُ المُثبِّت */
export const T = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; }); return { y: o.year, m: o.month, d: o.day }; })();
export const hij = (ms) => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(ms)).forEach(p => { o[p.type] = +p.value; }); return o.year + '-' + o.month + '-' + o.day; };
export const DAY = T.y + '-' + T.m + '-' + T.d;
const NOW = Date.now(), H = 3600 * 1000;
export const TOMORROW = hij(NOW - 3 * H + 24 * H), YESTERDAY = hij(NOW - 3 * H - 24 * H);
const PM = T.m === 1 ? { y: T.y - 1, m: 12 } : { y: T.y, m: T.m - 1 };
export const PDAY = PM.y + '-' + PM.m + '-10';            /* يومٌ في الشهر الماضي */
export const ODAY = PM.y + '-' + PM.m + '-3';             /* صفٌّ قديمُ الشكل */

/* ── الموظفون الجدد وحساباتهم (أرقامٌ اصطناعية) ── */
export const P0 = [1, 2, 3, 4, 5, 6, 7].map(n => ({ uid: 'tst_p0e' + n, un: String(2000000200 + n), pw: String(70200 + n), eid: 'tst_e_p0_' + n, name: TAG + ' · موظف مهام ' + n }));
export const ME = P0[0], MATE = P0[1];
const FX_EIDS = ['tst_e_sup1', 'tst_e_supB', 'tst_e_emp1', 'tst_e_lens_on', 'tst_e_lens_off', 'tst_e_pnos', 'tst_e_snop', 'tst_e_field', 'tst_e_imp', 'tst_e_ds'];
export const ALL_EIDS = FX_EIDS.concat(P0.map(p => p.eid));   /* 17 */
function pbkdf2(pw, uid) { const salt = crypto.createHash('sha256').update('kivo-264-tasks-fixture|' + uid).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); }

/* صفُّ مهمة بالشكل القائم (22 عموداً): [0 عنوان,1 وصف,2 أولوية,3 حالة,4 «normal»,5 «مضافة»,6 أداء,7 حرفُ المسند,8 اسمُ المسند,9 المنشئ,10 المدة(د),
   11 وقتُ القبول,12 وقتُ الإنهاء,13 وقتُ الإنشاء (هويةُ الصف),14 مفتاحُ المسند (eid),15 البداية,16 النهاية,17 مجموعة,18 وسمُ المجموعة,19 نوعُ العمل,20 اعتذار/انقضاء,21 التوثيق] */
let SEQ = 0;
export function row(o) {
  const id = o.id || (1760000000000 + (++SEQ) * 1000);
  const nm = o.eid ? (ALL_EIDS.indexOf(o.eid) >= 10 ? P0[ALL_EIDS.indexOf(o.eid) - 10].name : TAG + ' · ' + o.eid) : '';
  return [TAG + ' ' + (o.title || 'مهمة'), o.desc || '', o.prio || 'normal', o.st || 'pending', 'normal', 'مضافة', o.perf || null,
    o.eid ? [nm.charAt(0)] : [], o.eid ? nm : '', TAG + ' · مدير الإدارة ١', o.dur == null ? 60 : o.dur, o.acc || null, o.fin || null, id, o.eid || null,
    o.s || null, o.e || null, o.grp || null, o.grpL || null, o.wt || null, o.r20 || null, o.r21 || null];
}
export const IMG_ME = 'img_tsk' + 'p0me1' + '_' + 'a1b2c3', IMG_MATE = 'img_tsk' + 'p0mate' + '_' + 'd4e5f6';
export const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
/* ── مخزنُ المهام: 56 صفاً (54 مسنداً · 2 عامّة) ── */
export function tasksStore() {
  SEQ = 0;
  const S = {}, put = (day, r) => { (S[day] = S[day] || []).push(r); };
  const at = (h) => NOW + h * H;
  /* موظفُنا tst_e_p0_1 — عشرُ مهام تغطي الحالات كلها */
  put(DAY, row({ id: 1760000000101, title: 'مهمتي اليوم — تنتظر القبول', eid: ME.eid, s: at(-1), e: at(+3) }));
  put(DAY, row({ id: 1760000000102, title: 'مهمتي اليوم — قادمة', eid: ME.eid, s: at(+2), e: at(+4) }));
  put(DAY, row({ id: 1760000000103, title: 'مهمتي اليوم — جارية', eid: ME.eid, st: 'in_progress', acc: at(-0.5), s: at(-1), e: at(+2) }));
  put(TOMORROW, row({ id: 1760000000104, title: 'مهمتي غداً — مستقبلية', eid: ME.eid, s: at(+24), e: at(+26) }));
  put(YESTERDAY, row({ id: 1760000000105, title: 'مهمتي أمس — انقضت مهلتها بلا قبول', eid: ME.eid, s: at(-26), e: at(-24) }));
  put(YESTERDAY, row({ id: 1760000000106, title: 'مهمتي أمس — منجزة بصورة', eid: ME.eid, st: 'done', acc: at(-25), fin: at(-24.5), perf: ['on_time', 'في الوقت'], s: at(-26), e: at(-24), r21: { imgs: [IMG_ME], note: TAG + ' تم', at: at(-24.5) } }));
  put(PDAY, row({ id: 1760000000107, title: 'مهمتي الشهر الماضي — منجزة', eid: ME.eid, st: 'done', acc: at(-24 * 20), fin: at(-24 * 20 + 1), perf: ['early', 'مبكر'], s: at(-24 * 20 - 1), e: at(-24 * 20 + 2) }));
  put(PDAY, row({ id: 1760000000108, title: 'مهمتي الشهر الماضي — اعتذرت', eid: ME.eid, st: 'declined', s: at(-24 * 20), e: at(-24 * 20 + 1), r20: { at: at(-24 * 20), why: 'ظرف طارئ' } }));
  /* صفٌّ قديمُ الشكل (قبل أعمدة 15…21) — مسندٌ بالمعرّف */
  put(ODAY, [TAG + ' مهمتي القديمة (شكل قديم)', '', 'normal', 'done', 'normal', 'مضافة', null, ['م'], ME.name, TAG + ' مدير', 30, at(-24 * 27), at(-24 * 27 + 0.5), 1760000000109, ME.eid]);
  /* مهمةٌ جماعية: صفٌّ لموظفنا وصفٌّ لزميله بالمجموعة نفسها */
  put(DAY, row({ id: 1760000000110, title: 'مهمة جماعية', eid: ME.eid, s: at(-1), e: at(+5), grp: 'gTST1', grpL: 'TST-A' }));
  put(DAY, row({ id: 1760000000110, title: 'مهمة جماعية', eid: MATE.eid, s: at(-1), e: at(+5), grp: 'gTST1', grpL: 'TST-A' }));
  /* زميلُه tst_e_p0_2: منجزةٌ بصورةٍ له + جارية */
  put(YESTERDAY, row({ id: 1760000000201, title: 'مهمة الزميل — منجزة بصورة', eid: MATE.eid, st: 'done', acc: at(-25), fin: at(-24.6), perf: ['on_time', 'في الوقت'], s: at(-26), e: at(-24), r21: { imgs: [IMG_MATE], note: TAG + ' خاص بالزميل', at: at(-24.6) } }));
  put(DAY, row({ id: 1760000000202, title: 'مهمة الزميل — جارية', eid: MATE.eid, st: 'in_progress', acc: at(-0.2), s: at(-1), e: at(+2) }));
  /* بقيةُ الـ54: موزّعةٌ على الموظفين الـ17 (ومنهم موظفُنا لا يُزاد له شيء) */
  const others = ALL_EIDS.filter(e => e !== ME.eid);
  let n = 0, k = 300;
  while (Object.values(S).reduce((a, x) => a + x.length, 0) < 54) {
    const e = others[n++ % others.length], day = [DAY, YESTERDAY, PDAY, TOMORROW][n % 4];
    put(day, row({ id: 1760000000000 + (++k), title: 'مهمة ' + e, eid: e, st: n % 3 === 0 ? 'done' : 'pending', acc: n % 3 === 0 ? at(-30) : null, fin: n % 3 === 0 ? at(-29) : null, s: at(-31 + n), e: at(-28 + n) }));
  }
  /* عامّتان بلا مسند */
  put(DAY, row({ id: 1760000000901, title: 'عامة ١', wt: TAG + ' مراقب', s: at(-1), e: at(+3) }));
  put(TOMORROW, row({ id: 1760000000902, title: 'عامة ٢', s: at(+20), e: at(+22) }));
  return S;
}
export const count = (S) => { let n = 0, a = 0; for (const d in S) for (const r of S[d]) { n++; if (r[14]) a++; } return { n, a }; };

/* ── SQL: إضافةُ الموظفين والحسابات ومخزنِ المهام والصورتين إلى المُثبِّت القياسي ── */
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const BUMP = (k) => ["INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);",
  'INSERT INTO revs (k, rev) VALUES (' + q(k) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;"];
export function stdSeed() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_tasks_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', T.y + '-' + T.m + '-' + T.d, '--out', out], { stdio: 'pipe' });
  const s = fs.readFileSync(out + '/test_seed.sql', 'utf8'); try { fs.rmSync(out, { recursive: true, force: true }); } catch (e) {}
  return s;
}
export function p0Sql(store) {
  const L = [];
  for (const p of P0) {
    const u = { id: p.uid, un: p.un, ph: pbkdf2(p.pw, p.uid), name: p.name, role: 'staff', deptId: D, ekey: p.eid, dis: 0, test: TAG };
    L.push("UPDATE kv SET v = json_insert(v, '$[#]', json(" + q(JSON.stringify(u)) + ")) WHERE k = 'bassam_auth_users_v1' AND seq = 0;");
    const e = { eid: p.eid, name: p.name, empno: p.pw, type: TAG + ' رسمي', work: TAG + ' مراقب' };
    L.push('UPDATE kv SET v = json_insert(v, ' + q('$[#]') + ', json(' + q(JSON.stringify(e)) + ')) WHERE k = ' + q(KE) + ' AND seq = 0;');
  }
  L.push('DELETE FROM kv WHERE k = ' + q(KT) + ';', 'INSERT INTO kv (k, seq, v) VALUES (' + q(KT) + ', 0, ' + q(JSON.stringify(store)) + ');');
  for (const [img, st] of [[IMG_ME, 'bound'], [IMG_MATE, 'bound']]) {
    L.push('INSERT INTO imgs (k, seq, v) VALUES (' + q(img) + ', 0, ' + q(PNG) + ');');
    L.push('INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (' + q(img) + ', ' + q(st) + ', ' + q(KT) + ", '', " + q(D) + ', 1760000000000);');
    L.push('INSERT OR IGNORE INTO imgref (img, k) VALUES (' + q(img) + ', ' + q(KT) + ');');
  }
  return L.concat(BUMP('bassam_auth_users_v1'), BUMP(KE), BUMP(KT)).join('\n');
}

/* ── العالَم: عاملٌ بعينه + index.html لحزمته + الوضع (legacy | enforce) ──
   العاملُ المختبَر: KIVO_WORKER (كما في harness.mjs) وإلا workers/_worker.js المولَّد من الأجزاء (python3 tools/generate.py --src src).
   سطرُ الموزِّع في 062a يملكه وكيلٌ آخر (reports/k264/tasks/patches/01-062a-dispatch-me-tasks.patch): ما دام لم يُدمج يُطبَّق هنا على نسخةٍ
   مؤقتة من العامل المولَّد — حرفاً كما في الرقعة — ولا يُمسّ الملفُّ نفسُه. عاملا 242 و263 (بلا 062c) يُختبران كما هما: دليلُ العطل. */
/* KIVO_265 (AUD-029 · كشفته البوابة run1): أُزيل W242 — لم يستعمله اختبار، وافتراضيُّه مسارُ مختبرٍ مطلق؛ عاملُ 242 يُمرَّر بـKIVO_WORKER عند الحاجة */
export const W263 = process.env.KIVO_W263 || path.join(ROOT, 'pk263', '_worker.js');
export const WCUR = process.env.KIVO_WORKER ? path.resolve(process.env.KIVO_WORKER) : path.join(ROOT, 'workers', '_worker.js');   /* 242: ومعه KIVO_DIST=<حزمة 242> (makeEnv في harness يقرأ غلافَها) */
const ANCHOR = "  if (path === '/api/whoami') return json({ ok: 1, uid: ss.uid });\n";
/* الرقعة 01 (المرحلة الأولى — ثلاثةُ مساراتٍ بأسمائها) ثم الرقعة 04 (المرحلة الثانية — كلُّ /api/me/tasks* و/api/tasks/* عبر tkRoutePath في 071) */
export const DISPATCH01 = "\n  /* ── KIVO_264 · KIVO-Tasks P0: «ملفي ← مهامي» — قراءةُ الموظف لمهامه هو وحده وأفعالُه الذاتية (workers/parts/062c-me-tasks.js) ── */\n" +
  "  if (path === '/api/me/tasks' || path === '/api/me/tasks/act' || path === '/api/me/tasks/img') return await meTasksRoutes(request, env, path, ss);\n";
export const DISPATCH04 = "\n  /* ── KIVO_264 · KIVO-Tasks: «ملفي ← مهامي» ومساراتُ المهام — /api/me/tasks* و/api/tasks/* (workers/parts/062c-me-tasks.js · 071–073 · tkRoutePath) ── */\n" +
  "  if (tkRoutePath(path)) { var tkRes = await meTasksRoutes(request, env, path, ss); if (tkRes) return tkRes; }\n";
export function workerUnderTest(w = WCUR) {
  const src = fs.readFileSync(w, 'utf8'), has = /^async function meTasksRoutes\(/m.test(src), p2 = /^function tkRoutePath\(/m.test(src);
  if (!has || src.includes('if (tkRoutePath(path)) { var tkRes = await meTasksRoutes(request, env, path, ss); if (tkRes) return tkRes; }')) return { file: w, patched: false, has };
  if (!p2 && src.includes('return await meTasksRoutes(request, env, path, ss)')) return { file: w, patched: false, has };   /* عاملُ المرحلة الأولى بموزِّعه */
  let out;
  if (src.includes(DISPATCH01)) out = src.replace(DISPATCH01, p2 ? DISPATCH04 : DISPATCH01);                           /* الرقعة 01 مدمجة ⇒ تُطبَّق 04 فوقها */
  else { if (src.split(ANCHOR).length !== 2) throw new Error('062a anchor not found — rebase the dispatch patch'); out = src.replace(ANCHOR, ANCHOR + (p2 ? DISPATCH04 : DISPATCH01)); }
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_tasks_w_')), 'worker_dispatch.mjs');
  fs.writeFileSync(f, out);
  return { file: f, patched: true, has: true };
}
/* رقعةٌ لملفّ مالكٍ آخر (reports/k264/tasks/patches/NN-*.patch) تُطبَّق نصّاً على نسخةٍ مؤقتة من العامل المولَّد — الأجزاءُ فيه حرفية،
   فكلُّ مقطعٍ (سياقٌ + حذف) يُستبدل بنظيره (سياقٌ + إضافة) مرّةً واحدةً بالضبط؛ وإن كانت مدمجةً (نصُّ الإضافة قائم) يُعاد العاملُ كما هو */
/* KIVO_265 (AUD-029 · كشفته البوابة run3: «pass 657 · fail 1» في المستودع الرسمي المصدَّر): كانت الرقعةُ تُقرأ من reports/ — وهو من المختبر
   لا يُصدَّر — فيسقط ملفُّ tasks_selfwrite_guard كلُّه عند التحميل (ENOENT). تُقرأ الآن من نسختها في tests/fixtures/tasks_patches/
   (= reports/k264/tasks/patches/<الاسم> بايتاً · 06: SHA-256 5d0e01870417bfad…) — المنطقُ والتحقّقُ كما هما (كلُّ مقطعٍ مدمجٌ أو فريد) */
const PATCHES = path.join(ROOT, 'tests', 'fixtures', 'tasks_patches');
export function withPatch(w, patchFile) {
  const src = fs.readFileSync(w, 'utf8'), P = fs.readFileSync(path.join(PATCHES, patchFile), 'utf8').split('\n');
  const hunks = []; let cur = null;
  for (const l of P) {
    if (l.startsWith('@@')) { cur = { a: [], b: [] }; hunks.push(cur); continue; }
    if (!cur || l.startsWith('--- ') || l.startsWith('+++ ')) { if (l.startsWith('--- ')) cur = null; continue; }
    if (l.startsWith('+')) cur.b.push(l.slice(1)); else if (l.startsWith('-')) cur.a.push(l.slice(1)); else if (l.startsWith(' ')) { cur.a.push(l.slice(1)); cur.b.push(l.slice(1)); } else if (l === '') { /* سطرٌ فارغٌ في نهاية الرقعة */ }
  }
  let out = src, merged = 0;
  for (const h of hunks) {
    const A = h.a.join('\n'), B = h.b.join('\n');
    if (out.split(B).length === 2 && out.split(A).length !== 2) { merged++; continue; }
    if (out.split(A).length !== 2) throw new Error(patchFile + ': مقطعٌ غيرُ فريد أو غائب — أعد بناء الرقعة على خط الأساس');
    out = out.replace(A, () => B);
  }
  if (merged === hunks.length) return { file: w, patched: false };
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_tasks_p_')), 'worker_' + patchFile.replace(/\W+/g, '_') + '.mjs');
  fs.writeFileSync(f, out);
  return { file: f, patched: true };
}
/* KIVO_265 (AUD-029 · كشفته البوابة run1): غلافُ العامل من حزمته إن جاورته، وإلا غلافُ الحزمة المختبَرة نفسِها (KIVO_DIST ⇐ harness.DIST) — كان pk263 من المختبر
   فتسقط اختباراتُ المهام كلُّها (160) في المستودع الرسمي المصدَّر حيث لا pk263 */
const SHELL = (w) => { const d = path.join(path.dirname(w), 'index.html'); return fs.existsSync(d) ? d : path.join(DIST, 'index.html'); };
let inst = 0;
export async function world({ worker, mode = 'legacy' } = {}) {
  const EX = mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : {};
  const env = makeTestEnv(EX);
  if (worker) {
    env.__worker = (await import(pathToFileURL(path.resolve(worker)).href + '?tasks_inst=' + (++inst))).default;
    const html = fs.readFileSync(SHELL(worker), 'utf8');
    env.ASSETS = { fetch: async (req) => { const u = new URL(req.url); return (u.pathname === '/' || u.pathname === '/index.html') ? new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }) : new Response('not found', { status: 404 }); } };
  }
  const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); if (!su.ok) throw new Error('admin login');
  await applySql(env.DB, stdSeed());
  // The historical SQL seed must not recreate a retired business document in a
  // current database. Its actual canonical cutover preserves task/identity data.
  const schema = env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v;
  if (['8','9','10'].includes(schema)) await installIrshadFixture(env);
  if (['9','10'].includes(schema)) await installBusinessFixture(env);
  const store = tasksStore();
  await applySql(env.DB, p0Sql(store));
  if (env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v === '10') await installOperationalFixture(env);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const login = async (un, pw) => { const r = await C.login(un, pw); if (!r.ok) throw new Error('login ' + un + ' ' + JSON.stringify(r.j)); return r; };
  return { env, C, su, login, store, mode };
}
export const stored = (env, k) => { if (isOperationalFixtureKey(env,k)) return inspectOperationalFixture(env,k); const r = env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k); return r.length ? JSON.parse(r.map(x => x.v).join('')) : null; };
let taskRequestSequence = 0;
/* Explicit request construction, never an api/save wrapper. Metadata inspection
   gives ACL-negative tests a valid protocol envelope without granting data read.
   Provided malformed fields and non-object bodies are deliberately unchanged. */
export function taskCommandBody(env, path, body) {
  const route = String(path).split('?')[0];
  if (!['/api/tasks/create','/api/tasks/settings','/api/tasks/recur'].includes(route) || !body || typeof body !== 'object' || Array.isArray(body) ||
      env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v !== '10') return body;
  const next = { ...body }, own = key => Object.prototype.hasOwnProperty.call(body, key);
  if (!own('requestId')) next.requestId = 'TEST_ONLY_task_fixture_' + ++taskRequestSequence;
  if (!own('epoch')) next.epoch = Number(env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0);
  if (route !== '/api/tasks/create' && !own('base')) next.base = env.DB.q('SELECT rev FROM revs WHERE k=?', 'bsdept:' + (body.dept || D) + ':bassam_tasks_v1')[0]?.rev ?? 0;
  return next;
}
/* Explicit /api/save envelope for typed resources. Preserve every supplied
   value (including malformed metadata) so protocol/ACL negatives stay real. */
export function operationSaveBody(env, path, body) {
  if (String(path).split('?')[0] !== '/api/save' || !body || typeof body !== 'object' || Array.isArray(body) ||
      env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v !== '10') return body;
  const keys = Object.keys(body.set && typeof body.set === 'object' && !Array.isArray(body.set) ? body.set : {}).concat(Array.isArray(body.del) ? body.del : []);
  if (!keys.some(key => isOperationalFixtureKey(env,key))) return body;
  const next = { ...body }, own = key => Object.prototype.hasOwnProperty.call(body,key);
  if (!own('requestId')) next.requestId = 'TEST_ONLY_operations_fixture_' + ++taskRequestSequence;
  if (!own('epoch')) next.epoch = Number(env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0);
  return next;
}
/* Server-side inspection of the actual typed notification rows. This does not
   reconstruct a retired KV document or its user-state maps. Public recipient
   visibility is tested separately through /api/notifications. */
export function assertNotificationKVRetired(env) {
  assert.deepEqual(env.DB.q("SELECT k FROM kv WHERE k IN ('bassam_notif_v1','bassam_notif_sys_v1','bassam_notif_cfg_v1','bassam_bc_v1') OR k GLOB 'bsdept:*:bassam_notif_v1'"), [], 'No retired notification document may be read or recreated by a task operation');
}
export function notificationMessages(env, department = D) {
  assertNotificationKVRetired(env);
  const targets = env.DB.q('SELECT message_id,kind,value FROM notification_targets WHERE scope=? ORDER BY message_id,kind,value', 'd:' + department);
  return env.DB.q('SELECT * FROM notification_messages WHERE scope=? ORDER BY created_at,id', 'd:' + department).map(message => ({
    ...message,
    employee_targets: targets.filter(target => target.message_id === message.id && target.kind === 'employee').map(target => target.value),
    role_targets: targets.filter(target => target.message_id === message.id && target.kind === 'role').map(target => target.value),
  }));
}
export function notificationDedup(env, department = D) {
  assertNotificationKVRetired(env);
  return env.DB.q('SELECT * FROM notification_dedup WHERE scope=? ORDER BY once_key', 'd:' + department);
}
export const rowsOf = (S, eid) => { const o = []; for (const d in S) (S[d] || []).forEach((r, i) => { if (Array.isArray(r) && r[14] === eid) o.push({ day: d, i, r }); }); return o; };
/* ── المرحلة الثانية: كتابةُ مفتاحٍ كاملٍ في D1 البديل (بنسخةٍ جديدة — كما يفعل الحفظ) · منتصفُ ليل الرياض · أسماءُ أيام الأسبوع ── */
export function putKV(env, k, v) {
  assert.equal(isOperationalFixtureKey(env,k),false,'Retired resource: use await replaceOperationalFixture for an explicit typed test mutation');
  env.DB.exec('DELETE FROM kv WHERE k = ' + q(k) + ';');
  env.DB.exec('INSERT INTO kv (k, seq, v) VALUES (' + q(k) + ', 0, ' + q(JSON.stringify(v)) + ');');
  for (const s of BUMP(k)) env.DB.exec(s);
}
/* حسابُ دخولٍ اصطناعيّ يُضاف إلى سجلّ الحسابات (لحالاتِ الهوية الحدّية — رقمُ هويةٍ مكرَّر · معرّفٌ مكرَّر · KIVO-Tasks SR-2.2 · F-1) */
export function addAccount(env, { uid, un, pw, name, ekey, dept = D, role = 'staff' }) {
  const U = stored(env, 'bassam_auth_users_v1') || [];
  U.push({ id: uid, un, ph: pbkdf2(pw, uid), name: name || TAG + ' · ' + uid, role, deptId: dept, ekey, dis: 0, test: TAG });
  putKV(env, 'bassam_auth_users_v1', U);
}
export const HR = 3600 * 1000;
export const MID = (t) => Math.floor((t + 3 * HR) / 864e5) * 864e5 - 3 * HR;          /* منتصفُ ليل الرياض لليوم المدنيّ الذي فيه t */
export const WD_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const wdOf = (t) => new Date(t + 3 * HR).getUTCDay();
export const ymOf = (k) => k.split('-').slice(0, 2).join('-');
