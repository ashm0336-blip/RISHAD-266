/* V7 · د6 (QA) · البند ١ — لا سببَ إلزامياً لأحد (قرارُ المالك). في متصفحٍ حقيقي على المختبر (TEST_ONLY · وضع الإنفاذ) وبطريق الحفظ الجديد
   نفسِه الذي كشف الخلل (KIVO.__BS_SRV.operations.commit · operationCommit9 — لا يعرض نافذة سبب أبداً، فكان الخادم يرفض: 403 …=reason[staff.reopen] …):
     · مديرُ الإدارة (mgrA) وموظفٌ بدورٍ يحمل المفاتيح (empA بدور «حسّاس» على الجدول الشهري والمهام) يعتمدان الشهر ثم يفتحانه
       (staff.reopen · task.month.reopen) ⇒ يُحفظ (ok=1) وتتغيّر القيمةُ المخزَّنة فعلاً · لا نافذةَ سبب · لا رفضَ reason
     · فتحُ نافذة الاستدراك (/api/retro) بلا سبب يُقبل لمدير الإدارة
     · طبقةُ التخزين تعدّ كلَّ حسابٍ «معفًى» (reasonExempt) فلا تُفتح نافذةُ السبب من أيّ صفحة */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', REASON_DLG = 'هذا الإجراء يتطلب سبباً';
const kv = (lab, k) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('') || 'null');

/* اعتمادُ الشهر ثم فتحُه عبر operations.commit — كما تفعل صفحتا الجدول الشهري والمهام (_opsSave · _tkChange) */
const lockCycle = (page, action, name, intent) => page.evaluate(async ([action, name, intent]) => {
  const S = KIVO.__BS_SRV.operations, H = KIVO.BassamCal.hParts(new Date()), ym = H.y + '-' + H.m, owner = {};
  const run = async (lock) => {
    await S.read([S.key(name)]);   /* المحرِّر يقرأ مفتاحه قبل الحفظ كما تفعل الصفحة */
    const r = await S.commit(owner, action + (lock ? '-lock' : '-open'), Object.assign({ year: H.y, month: H.m, reopen: !lock }, intent), (draft) => {
      const v = Object.assign({}, draft.get(name) || {}); if (lock) v[ym] = true; else delete v[ym]; draft.set(name, v);
    });
    return { ok: r && r.ok, why: r && (r.why || r.err || ''), denied: r && r.denied ? JSON.stringify(r.denied).slice(0, 300) : '' };
  };
  const a = await run(true), b = await run(false);
  return { ym, lock: a, open: b, dialog: document.body.innerText.includes('هذا الإجراء يتطلب سبباً'), exempt: KIVO.__BS_SRV.reasonExempt() };
}, [action, name, intent]);

test('البند ١: مديرُ الإدارة وموظفٌ بدور يفتحان الشهر المعتمد بلا سبب (الجدول الشهري · المهام) والاستدراكُ بلا سبب', { timeout: 420000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    /* دورٌ بمستوى «حسّاس» (كلُّ مفاتيح النظام) على الجدول الشهري والمهام للموظف empA — من مدير المنصة عبر KIVO.Perm44 */
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw); await su.go('#/admin', 3000);
    const role = await su.page.evaluate(async ([d]) => {
      const E = KIVO.Perm44, dr = E.draft(d), rec = E.rolesOf(d);
      rec.roles = rec.roles.filter((r) => r.id !== 'TEST_ONLY_qa_role').concat([{ id: 'TEST_ONLY_qa_role', name: 'TEST_ONLY دور الفحص', sys: { staff: { lvl: 'sensitive' }, tasks: { lvl: 'sensitive' } } }]);
      rec.people.TEST_ONLY_eA1 = { role: 'TEST_ONLY_qa_role', ex: [] };
      const r = E.setRoles(dr, d, rec); if (!r.ok) return r; return E.commit(dr);
    }, [A]);
    assert.ok(role && role.ok, 'الدورُ حُفظ: ' + JSON.stringify(role)); await lab.idle(); await su.ctx.close();

    for (const [who, un] of [['مدير الإدارة', LAB.mgrA], ['موظف بدور', LAB.empA]]) {
      const s = await openAs(b, lab, un, LAB.pw); await s.go('#/staff', 4000);
      const refusals = []; s.page.on('response', async (r) => { if (r.status() === 403) refusals.push(r.url() + ' ' + (await r.text().catch(() => '')).slice(0, 200)); });
      for (const [action, name] of [['staff-editor', 'bassam_staffing_locks_v1'], ['tasks-month', 'bassam_tasks_locks_v1']]) {
        const r = await lockCycle(s.page, action, name, { op: 'month-approval' });
        assert.equal(r.exempt, true, who + ': لا يُسأل عن سبب');
        assert.equal(r.lock.ok, 1, who + ' · ' + name + ' اعتماد: ' + JSON.stringify(r.lock));
        assert.equal(r.open.ok, 1, who + ' · ' + name + ' فتحُ الشهر المعتمد بلا سبب: ' + JSON.stringify(r.open));
        assert.doesNotMatch(r.open.denied + r.open.why, /reason/, who + ': لا رفضَ reason');
        await lab.idle();
        const stored = kv(lab, 'bsdept:' + A + ':' + name) || {};
        assert.equal(stored[r.ym], undefined, who + ' · ' + name + ': الشهرُ مفتوحٌ فعلاً في الخادم');
        assert.equal(r.dialog, false, who + ': لا نافذةَ سبب');
      }
      assert.deepEqual(refusals.filter((x) => /reason/.test(x)), [], who + ': لا ردَّ 403 لنقص السبب');
      assert.equal((await s.page.evaluate(() => document.body.innerText)).includes(REASON_DLG), false);
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
    /* الاستدراك بلا سبب (مدير الإدارة) */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    const r = await m.page.evaluate(async (d) => { const H = KIVO.BassamCal.hParts(new Date()); const p = H.m === 1 ? { y: H.y - 1, m: 12 } : { y: H.y, m: H.m - 1 };
      const x = await fetch('/api/retro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ res: 'staff', dept: d, act: 'open', scope: p, hours: 1 }) }); return { st: x.status, j: await x.json().catch(() => null) }; }, A);
    assert.notEqual(r.j && r.j.err, 'reason', 'الاستدراك: لا رفضَ لنقص السبب — ' + JSON.stringify(r));
    await m.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
