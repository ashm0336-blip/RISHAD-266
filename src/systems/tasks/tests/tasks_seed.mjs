/* V7 · د4-ب — بذرةُ نظام المهام لعالَم الاختبار (TEST_ONLY): ما كان في tests/unit/tasks_fx.mjs خاصاً بالمهام.
   مخزنُ مهامٍ بـ56 صفاً: 54 مسنداً (العمود 14 = eid الموظف) على الموظفين الـ17 · 2 عامّة — عبر أيامٍ وأشهر: اليوم · غداً · أمس (منتهية المهلة) ·
   الشهر الماضي (منجزة بتوثيقٍ وصورة · معتذَر عنها) · صفٌّ قديمُ الشكل (14 عموداً). وصورةُ توثيقٍ مخزّنة مملوكةٌ لمخزن المهام لكلٍّ من tst_e_p0_1 وزميله.
   العُدّةُ العامة (tests/unit/world_fx.mjs) تستورد هذه البذرةَ إن حضر النظام. */
import { TAG, D, T, hij, DAY, TOMORROW, YESTERDAY, PDAY, ODAY, P0, ME, MATE, ALL_EIDS } from '../../../../tests/unit/world_fx.mjs';
const NOW = Date.now(), H = 3600 * 1000;
export const KT = 'bsdept:' + D + ':bassam_tasks_v1';
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

/* SQL: مخزنُ المهام والصورتان (تضيفها world_fx.p0Sql إلى المُثبِّت القياسي) */
export function storeSql(store, { q, PNG, D }) {
  const L = ['DELETE FROM kv WHERE k = ' + q(KT) + ';', 'INSERT INTO kv (k, seq, v) VALUES (' + q(KT) + ', 0, ' + q(JSON.stringify(store)) + ');'];
  for (const [img, st] of [[IMG_ME, 'bound'], [IMG_MATE, 'bound']]) {
    L.push('INSERT INTO imgs (k, seq, v) VALUES (' + q(img) + ', 0, ' + q(PNG) + ');');
    L.push('INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (' + q(img) + ', ' + q(st) + ', ' + q(KT) + ", '', " + q(D) + ', 1760000000000);');
    L.push('INSERT OR IGNORE INTO imgref (img, k) VALUES (' + q(img) + ', ' + q(KT) + ');');
  }
  return L;
}
export const rowsOf = (S, eid) => { const o = []; for (const d in S) (S[d] || []).forEach((r, i) => { if (Array.isArray(r) && r[14] === eid) o.push({ day: d, i, r }); }); return o; };
