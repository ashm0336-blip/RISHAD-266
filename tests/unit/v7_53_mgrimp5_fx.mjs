/* V7 · 53 (mgrimp5 · ملحق 5) — نسخةُ إدارةٍ بشكل Production الحقيقي في صلاحياتها (TEST_ONLY · مجهولةُ الهوية · مولَّدةٌ في الذاكرة وحدها — الملفُّ الحقيقي
   فيه بياناتُ أشخاص ولا يدخل المستودع). فوق oldFile (v7_d6_import_fx: ≈31MB · 29 مجموعة بيانات · 10 صور · الشكلُ القديم):
     · سجلُّ الموظفين 12 موظفاً بأسماءٍ عربية مصطنعة (TEST_ONLY) · وأوراقُ صلاحياتهم الاثنتا عشرة في perms.emps كما صدّرها Production:
       admin/ptpls (صفحةٌ أُلغيت) · admin/oplog · admin/shifts · emps/data:export · rasd/records (خارج سقف الإدارة الهدف) — مع ما يملكه المدير المستورِد.
     · perms.capSet/cap أوسعُ من سقف الإدارة الهدف (كلُّ الصفحات) · perms.lenses = عدساتُ Production الثلاث · وصحيفةُ مدير المصدر.
   المديرُ المستورِد كما في Production: يرث سقفَ إدارته (بلا ورقة) وقد ضيّق عليه مديرُ المنصة بالمنح الصريح (MGR_MINUS: سجلُّ التشغيل وعرضُ الورديات وتعديلُها)،
   وسقفُ الإدارة الهدف أضيقُ من سقف النسخة (بلا rasd) — فلا يملك: admin/ptpls (صفحةٌ أُلغيت) · rasd/records · admin/oplog · admin/shifts:view|edit. */
import { oldFile, SRC_DEPT, PROD_LENSES } from './v7_d6_import_fx.mjs';

const ALL = ['view', 'add', 'edit', 'del', 'approve', 'export'];
export const MGR_MINUS = ['audit.view', 'ref.shift.view', 'ref.shift.edit'];
/* ما لا يملكه المديرُ مما في النسخة (الصفحة:الإجراء) — كلُّه يُسقط في استيراده، ولا يُسقط شيءٌ لمدير المنصة */
export const NOT_HELD = ['admin/ptpls:view', 'rasd/records:view', 'admin/oplog:view', 'admin/shifts:view', 'admin/shifts:edit'];
export const NEW_EMPS = Array.from({ length: 8 }, (_, i) => 'tst_m5_e' + (i + 1));
export const AR = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'];
/* ورقةُ الموظف i (0..11) — مزيجٌ مما يملكه المدير وما لا يملكه */
export function sheetOf(i) {
  const s = { plan: ['view', 'edit'], 'daily/rounds': ['view'], 'emps/data': ['view', 'export'], 'admin/ptpls': ['view'], 'admin/oplog': ['view'] };
  if (i % 2) s['admin/shifts'] = ['view', 'edit'];
  if (i % 3 === 0) s['rasd/records'] = ['view'];
  if (i % 4 === 0) s.tasks = ['view', 'add'];
  return s;
}
export const capWide = ['dstats', 'emps', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'rasd', 'award', 'links', 'help', 'admin'];
export async function prodFile({ small = false } = {}) {
  const file = await oldFile({ small });
  const emps = JSON.parse(file.data.bassam_employees_v1).map((e, i) => ({ ...e, name: 'موظف تجريبي ' + AR[i] + ' TEST_ONLY' }));
  NEW_EMPS.forEach((eid, i) => emps.push({ eid, name: 'موظف تجريبي ' + AR[emps.length] + ' TEST_ONLY', empno: '99500' + (10 + i), nid: '19500000' + (10 + i), type: 'TEST_ONLY · رسمي', work: 'TEST_ONLY · مراقب' }));
  file.data.bassam_employees_v1 = JSON.stringify(emps);
  const sheets = {};
  emps.forEach((e, i) => { sheets[e.eid] = sheetOf(i); });
  file.perms = { capSet: true, cap: capWide.slice(), emps: { ...sheets, ['mgr:' + SRC_DEPT]: { plan: ALL, admin: ALL } }, lenses: PROD_LENSES.slice() };
  return file;
}
export const empIds = (file) => Object.keys(file.perms.emps).filter((k) => !k.startsWith('mgr:'));
/* ما يُتوقَّع أن يُكتب لمدير الإدارة: ورقةُ كلِّ موظفٍ بلا ما لا يملكه (NOT_HELD) — والمُسقَطُ بنداً بنداً «e|p|a» */
export function expectFor(file) {
  const kept = {}, drops = [];
  for (const ek of empIds(file)) {
    const s = file.perms.emps[ek], o = {};
    for (const [p, acts] of Object.entries(s)) {
      const ok = acts.filter((a) => !NOT_HELD.includes(p + ':' + a));
      acts.filter((a) => !ok.includes(a)).forEach((a) => drops.push(ek + '|' + p + '|' + a));
      if (ok.length) o[p] = ok;
    }
    kept[ek] = o;
  }
  return { kept, drops: drops.sort() };
}
