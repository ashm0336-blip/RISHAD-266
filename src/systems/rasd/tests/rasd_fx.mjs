/* V7 · د6 (رصد الحالات) — عُدّةُ اختبارات النظام (TEST_ONLY · بياناتٌ مولَّدة في الذاكرة وحدها، لا بياناتِ أشخاص ولا كلماتِ مرور).
   · lab(): العاملُ المبنيُّ الحقيقي على SQLite في الذاكرة (مختبرُ tests/browser/local_server.mjs) وعميلُ طلباتٍ بكعكة الجلسة.
   · rasdOn(T, unit, on): يكتب سقفَ الوحدة في سجلّ الصلاحيات مع «rasd» أو بدونه (تهيئةُ اختبارٍ مباشرةً في القاعدة كعُدّة المختبر نفسِها).
   · REPORTS / OPTS: سجلاتٌ وقوائمُ بصيغة Production نفسِها (bassam_rasd_v1 · bassam_rasd_opts_v1) — كلُّ نصٍّ حرٍّ يحمل TEST_ONLY. */
import { target } from '../../../../tests/unit/v7_d6_import_fx.mjs';

export const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', G = 'TEST_ONLY_G', S1 = 'TEST_ONLY_A_S1';
export const REC = 'bassam_rasd_v1', OPT = 'bassam_rasd_opts_v1';
export const key = (d, k) => 'bsdept:' + d + ':' + k;

export function readK(DB, k) { const rows = DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k); return rows.length ? JSON.parse(rows.map((r) => r.v).join('')) : null; }
export async function putK(T, k, v) {
  const DB = T.DB;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...T.lab.W.kvPutStmts(T.lab.env, 'kv', k, JSON.stringify(v)), DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
}
export const revOf = (DB, k) => { const r = DB.q('SELECT rev FROM revs WHERE k=?1', k)[0]; return r ? r.rev : 0; };

/* سقفُ الوحدات في المختبر كما يبذره (tests/browser/local_server.mjs) — و«rasd» يُضاف أو يُزال لوحدةٍ واحدة */
export const LAB_CAP = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan'];
/* السقفُ تقاطعُ الوحدة وأصولها: التشغيلُ يفتحه في الوحدة وأصولها (الإدارة العامة) · الإطفاءُ في الوحدة وحدها */
const UP = { [A]: [G], [B]: [G], [S1]: [A, G], [G]: [] };
export async function rasdOn(T, units, on) {
  const P = readK(T.DB, 'bassam_perms_v1');
  for (const u of [].concat(units).flatMap((x) => (on ? [x].concat(UP[x] || []) : [x]))) {
    const c = (P.caps[u] || LAB_CAP).filter((k) => k !== 'rasd');
    P.caps[u] = on ? c.concat(['rasd']) : c;
  }
  await putK(T, 'bassam_perms_v1', P);
}

export async function lab() {
  const T = await target();
  T.as = async (un, pw) => { const s = await T.login(un, pw); s.uid = s.uid || T.DB.q('SELECT uid FROM sess ORDER BY rowid DESC LIMIT 1')[0].uid; return s; };
  /* حفظٌ مصنوعٌ يدوياً (بلا الواجهة) لمفتاحٍ واحد بمراجعته الحالية */
  T.save = (who, k, value) => T.call('/api/save', { ck: who.ck, body: { uid: who.uid, set: { [k]: JSON.stringify(value) }, del: [], base: { [k]: revOf(T.DB, k) } } });
  /* اليومُ الهجري للخادم (dsToday) كما يعلنه /api/retro — الحالاتُ المكتوبة فيه في فترةٍ مفتوحة */
  T.today = async () => { const r = await T.call('/api/retro?res=rasd&dept=' + A, { ck: T.su.ck }); if (!r.j || !r.j.today) throw new Error('today: ' + r.t.slice(0, 200)); return r.j.today; };
  T.retro = (who, body) => T.call('/api/retro', { ck: who.ck, body: { uid: who.uid, res: 'rasd', dept: A, ...body } });
  T.get = (who, keys) => T.call('/api/get?keys=' + encodeURIComponent([].concat(keys).join(',')), { ck: who.ck });
  return T;
}

/* حالةٌ بالحقول كلِّها كما يكتبها المحضر — أسماءُ المفاتيح وقيمُها الثابتة («لم يتم الإبلاغ» · «أخرى: …») كما في Production */
export function report(i, over = {}) {
  return Object.assign({
    id: 'zTEST_ONLY' + i, y: 2026, m: 5, d: 1 + (i % 20), t: '09:1' + (i % 10), lt: '09:2' + (i % 10), by: 'TEST_ONLY_u' + (i % 3), byName: 'TEST_ONLY راصد ' + (i % 3),
    dept: 'TEST_ONLY إدارة أ', zone: 'الأبواب', floor: 'الأرضي', spot: 'باب ' + [1, 5, 45][i % 3], type: ['ازدحام', 'ممنوعات', 'أخرى: TEST_ONLY وصف'][i % 3],
    impact: ['منخفض', 'متوسط', 'عالٍ', 'حرج'][i % 4], act: i % 2 ? 'إبلاغ جهة مختصة' : 'تنظيم حركة', party: i % 2 ? 'العمليات المشتركة' : 'لم يتم الإبلاغ', notes: i % 2 ? 'TEST_ONLY ملاحظة ' + i : '', att: null,
  }, over);
}
export const REPORTS = (n = 6, day) => ({ reports: Array.from({ length: n }, (_, i) => report(i, day ? { y: day.y, m: day.m, d: day.d } : {})) });
export const OPTS = () => ({
  zone: [{ n: 'الأبواب', c: '#0e7490' }, { n: 'TEST_ONLY منطقة', c: '#9c3d6b' }, { n: 'أخرى', c: '#b45309' }],
  floor: [{ n: 'الأرضي', c: '#0e7490' }], type: [{ n: 'ممنوعات', c: '#0e7490' }, { n: 'ازدحام', c: '#9c3d6b' }, { n: 'أخرى', c: '#b45309' }],
  act: [{ n: 'تنظيم حركة', c: '#0e7490' }, { n: 'إبلاغ جهة مختصة', c: '#9c3d6b' }, { n: 'لم يتخذ إجراء بعد', c: '#b45309' }, { n: 'أخرى', c: '#1e9a66' }],
  party: [{ n: 'العمليات المشتركة', c: '#0e7490' }, { n: 'أخرى', c: '#9c3d6b' }, { n: 'لم يتم الإبلاغ', c: '#b45309' }],
  spot: [{ n: 'باب 1', z: 'الأبواب', g: 'باب' }, { n: 'TEST_ONLY موقع', z: 'TEST_ONLY منطقة', g: 'مضاف' }],
});
