/* KIVO_265 · F-3 (تدقيقُ الصلاحيات RBAC_AUDIT_265 — منخفض · بالوضعين): فحصُ الأهلية (/api/tasks/eligibility — ومثلُه elig في ردّي الإنشاء وإعادة الإسناد)
   يشترط task.assign أو task.create وحدهما، وكان يضع في conf عناوينَ مهام الزميل المتعارضة وأوقاتَها — فيقرأ حاملُ task.create بلا task.view مهامَ الزملاء
   (بتكرار النوافذ يُعاد بناءُ الجدول). الآن العنوانُ لمن يقرأ مخزنَ المهام وحده (072 tkEligCtx · C.view) — وبقيةُ الردّ كما هي:
     (أ) حاملُ task.create بلا task.view ⇒ conf بلا عناوين (والعددُ والتحذيرُ والحكمُ كما هي)
     (ب) ولا تراجع: من يقرأ المخزن (مديرُ الإدارة) يرى العناوين كما كان
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, D, stored, putKV, HR } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const elig = (W, ck) => { const now = Date.now(); return W.C.api('/api/tasks/eligibility?ekeys=' + encodeURIComponent(ME.eid) + '&s=' + (now - 2 * HR) + '&e=' + (now + 5 * HR), { cookie: ck }); };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) حاملُ task.create بلا task.view ⇒ conf بلا عناوين مهام الزميل — والعددُ والتحذيرُ كما هما', async () => {
    const W = await world({ worker: WU.file, mode });
    const P = stored(W.env, 'bassam_perms_v1'); P.emps = P.emps || {}; P.emps[D] = P.emps[D] || {}; P.emps[D][MATE.eid] = { tasks: ['add'] }; putKV(W.env, 'bassam_perms_v1', P);
    const mate = await W.login(MATE.un, MATE.pw);
    const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT), { cookie: mate.ck });
    assert.ok(g.j.denied.includes(KT) && !Object.hasOwn(g.j.resources,KT) && !Object.hasOwn(g.j.base,KT), 'لا يقرأ مخزنَ المهام أو رقم نسخته');
    const r = await elig(W, mate.ck); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
    const it = r.j.items[0];
    assert.ok(Array.isArray(it.conf) && it.conf.length > 0, 'التعارضُ محسوب: ' + JSON.stringify(it).slice(0, 300));
    assert.ok(it.conf.every((c) => c.t === undefined), 'بلا عناوين: ' + JSON.stringify(it.conf));
    assert.ok(it.warn.some((w) => /تتعارض مع/.test(w)), 'والتحذيرُ بالعدد باقٍ');
  });

  test(M + '(ب) ولا تراجع: من يقرأ مخزنَ المهام (مديرُ الإدارة) يرى عناوينَ التعارض', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const r = await elig(W, dm.ck); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
    const it = r.j.items[0];
    assert.ok(it.conf.length > 0 && it.conf.every((c) => typeof c.t === 'string' && c.t), 'بعناوينها: ' + JSON.stringify(it.conf).slice(0, 300));
  });
}
