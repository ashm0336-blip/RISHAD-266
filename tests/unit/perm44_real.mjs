/* V7 · د5-هـ (44) — المحرّكُ الحقيقيُّ للأدوار KIVO.Perm44 في عالم اختبار (node:vm): السجلُّ 340 ثم 345 المولَّد، فوق مخزنٍ صغير
   (localStorage — كما يقرؤه المحرّكُ من مخزن 280 في الصفحة). حلّ محلّ بديل الاختبار perm44_stub.mjs (حُذف) — TEST_ONLY.
   ctx: سياقُ vm فيه KIVO · store: {مفتاح: قيمة} — يعيد KIVO.Perm44 ومخزنَه */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC } from './harness.mjs';

export function perm44Real(ctx, store = {}) {
  const S = new Map(Object.entries(store).map(([k, v]) => [k, JSON.stringify(v)]));
  const prev = ctx.localStorage;
  ctx.localStorage = { getItem: (k) => (S.has(k) ? S.get(k) : prev && prev.getItem ? prev.getItem(k) : null), setItem: (k, v) => { S.set(k, String(v)); }, removeItem: (k) => { S.delete(k); } };
  const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
  if (!ctx.KIVO_REGISTRY && !(ctx.KIVO && ctx.KIVO.KIVO_REGISTRY)) vm.runInContext(rd('permissions/340-registry-v24-9.js'), ctx, { filename: '340-registry-v24-9.js' });
  vm.runInContext(rd('permissions/345-perm44.js'), ctx, { filename: '345-perm44.js' });
  return { P4: ctx.KIVO.Perm44, store: S };
}
/* سجلّا الوحدة كما يكتبهما المحرّك: الأدوار {v, roles, people} والمنحُ المترجَم {v, emp} */
export const rolesKey = (d) => 'bsdept:' + d + ':bassam_roles_v1';
export const grantsKey = (d) => 'bsdept:' + d + ':bassam_grants_v1';
