/* V7 · د7 — عُدّةُ النسخة الشاملة (TEST_ONLY · مولَّدة في الذاكرة): fullOf(T, [[إدارة, خياراتُ oldFile, وسم]...]) ⇒ { full, want }
   نسخةٌ شاملة بالشكل القديم (version 3 · kind:'full') سجلاتُها العامة من المنصة الهدف نفسِها (T.DB) ولكل إدارةٍ نسخةُ إدارةٍ قديمة (oldFile) بمفاتيح «bsdept:<إدارة>:…»
   وصورٍ وموظفين بأسمائها · want: لكل إدارةٍ ما يُتوقَّع أن يُقرأ (readBack) · rowsOf(T): كلُّ ما يكتبه الاستيراد — للمقارنة بين مسارين. */
import { oldFile, withoutDropped } from './v7_d6_import_fx.mjs';

/* ما لا تحمله النسخةُ الشاملة القديمة من مفاتيح الإدارة هنا (التنبيهاتُ القديمة لكل إدارة · المنحُ والقوالب · الطوابع) — كما في اختبار د6 (٧) و(١٥) */
const DROP = /:bassam_(notif_v1|notif_dev_v1.*|grants_v1|perm_tpls_v1|first_boot_v1|last_export_v1|dr_grp_v1)$/;

/* نسخةٌ شاملة بالشكل القديم (version 3 · kind:'full'): السجلاتُ العامة من المنصة الهدف نفسِها + لكل إدارةٍ نسخةُ إدارةٍ قديمة (oldFile) بمفاتيح «bsdept:<إدارة>:…» وصورٍ بأسمائها */
/* السجلاتُ العامة للمنصة (الحسابات · الإدارات · الصلاحيات …) كما في KV — T.globals إن أُعطيت (العاملُ في عمليةٍ أخرى: اختبارُ الذاكرة) */
export const GLOBALS_SQL = "SELECT k, group_concat(v,'') v FROM (SELECT k,v FROM kv ORDER BY k,seq) GROUP BY k";
export const globalsOf = (T) => (T.globals || T.DB.q(GLOBALS_SQL)).filter((r) => !/^bsdept:/.test(r.k) && !/^bassam_(notifications_domain|notif_)/.test(r.k));
export async function fullOf(T, list) {
  const full = { app: 'bassam-crowd', version: 3, kind: 'full', exportedAt: '2026-11-24T10:00:00.000Z', data: {}, idbImages: {}, preImport: false };
  for (const r of globalsOf(T)) full.data[r.k] = r.v;
  const known = JSON.parse(full.data.bassam_depts_v1), depts = list.map(([d]) => known.find((x) => x.id === d) || { id: d, name: 'TEST_ONLY إدارة جديدة ' + d, gid: 'TEST_ONLY_G' });
  full.data.bassam_depts_v1 = JSON.stringify(depts);
  const want = {};
  for (const [i, [d, opt, tag]] of list.entries()) {
    /* لكل إدارةٍ صورُها وموظفوها (رقمُ الهوية والرقمُ الوظيفي فريدان على المنصة) */
    const f = await oldFile(opt), ren = (v) => v.split('img_testonly').join('img_testonly' + tag).split('tst_demo_e').join('tst_demo_' + tag + 'e').replace(/"(nid|empno)":"(\d)\d/g, (m, f, x) => '"' + f + '":"' + x + (3 + i));
    want[d] = {};
    for (const [k, v] of Object.entries(f.data)) {
      const dk = 'bsdept:' + d + ':' + k;
      if (v === null || DROP.test(dk)) continue;
      full.data[dk] = ren(v);
      if (T.lab && T.lab.W.opInfo(dk)) want[d][k] = withoutDropped(JSON.parse(full.data[dk]));
    }
    for (const [id, body] of Object.entries(f.idbImages)) full.idbImages[ren(id)] = body;
  }
  return { full, want };
}
/* كلُّ ما يكتبه الاستيراد في القاعدة — جدولاً جدولاً، صفوفاً مرتّبة (للمقارنة بين المسارين) */
export function rowsOf(T) {
  const skip = new Set(['aud', 'audit', 'sec', 'authz', 'authz_snap', 'authz_snaps', 'sess', 'guard', 'sqlite_sequence', 'restore_preimage', 'restore_snapshot_manifest', 'restore_operations', 'd1_migrations', 'notification_checkpoints', 'revs', 'meta']), out = {};
  /* خارج المقارنة ما يختلف بين مختبرين لا بين المسارين: لحظةُ ربط الصورة · ملحُ كلمات المرور (الحساباتُ تُقارن بمعرّفها وإدارتها) */
  const sel = { imgown: 'SELECT img,st,k,dept FROM imgown', kv: "SELECT k,seq,v FROM kv WHERE k<>'bassam_auth_users_v1'" };
  for (const { name } of T.DB.q("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")) if (!skip.has(name)) out[name] = T.DB.q(sel[name] || 'SELECT * FROM ' + name).map((r) => JSON.stringify(Object.values(r))).sort();
  out.accounts = JSON.parse(T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq)")[0].v).map((u) => u.id + '@' + (u.deptId || '')).sort();
  return out;
}
