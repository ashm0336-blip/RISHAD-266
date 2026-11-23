/* V7 · د6 (QA ١٢ · ١٣) — المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY · بلا شبكة):
   ١٢: حذفُ موظف (⋮ ← حذف ← «تأكيد الحذف») و«حذف المحدد» ينجحان في الإدارة المبذورة (بيانات العرض) وفي إدارةٍ صفوفُها بشكل الاستيراد
       (eid «e…» · «بانتظار التفعيل» · هوية + رقم وظيفي بلا حساب) — يُرسل POST /api/employees/transition ويُحذف الصفّ في الخادم،
       ولا يُفعَّل حسابٌ لموظفٍ آخر بقي. وكلُّ رفضٍ يُعرض سببُه في النافذة (لا نافذة صامتة).
   ١٣: إضافةُ موظفٍ بالاسم وحده لا تغيّر حساباتِ الآخرين (لا «فُعّل تلقائياً» ولا حفظَ لجدول الحسابات) — والتفعيلُ الصريح يبقى يعمل.
   السببُ الجذري لـ١٢: transitionPrepare (590) يقترح حساباً لكل معلّقٍ باقٍ ويطلب BassamAuth.hashPw غيرَ المُصدَّرة ⇒ «crypto» قبل أي POST،
   والرسالةُ تُحفظ في الحالة ولا تُعرض. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';

const KU = 'bassam_auth_users_v1';
const kv = (lab, k) => { const r = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : null; };
const staffOf = (lab, d) => (kv(lab, KU) || []).filter((u) => u.role === 'staff' && u.deptId === d && !String(u.ekey || '').startsWith('mgr:')).map((u) => u.ekey).sort();
const empsOf = async (s, d) => { const r = await s.api('/api/operations/read?keys=' + encodeURIComponent('bsdept:' + d + ':bassam_employees_v1')); const v = r.j && r.j.resources && r.j.resources['bsdept:' + d + ':bassam_employees_v1']; return Array.isArray(v) ? v : (v && Array.isArray(v.value) ? v.value : v); };
const until = async (fn, what, ms = 20000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 150)); } };

/* الصفحةُ تعرض الأرقام هنديةً مع علامات اتجاه — يُطبَّع النصّ قبل المطابقة، ويُعلَّم الصفُّ المطلوب لمحدِّدٍ ثابت */
const norm = (x) => x.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/·/g, '-').replace(/\s+/g, ' ').trim();
async function rowNames(p) { return (await p.evaluate(() => [...document.querySelectorAll('main table tbody tr')].map((tr) => tr.innerText))).map(norm).filter(Boolean); }
async function rowOf(p, name) {
  name = norm(name);
  await until(() => p.evaluate(([n, src]) => { const nm = new Function('return ' + src)(); const tr = [...document.querySelectorAll('main table tbody tr')].find((r) => nm(r.innerText).includes(n));
    document.querySelectorAll('[data-qa-row]').forEach((x) => x.removeAttribute('data-qa-row')); if (tr) tr.setAttribute('data-qa-row', '1'); return !!tr; }, [name, norm.toString()]), 'row ' + name).catch(async (e) => { throw new Error(e.message + ' — rows: ' + JSON.stringify(await rowNames(p))); });
  return p.locator('main tr[data-qa-row="1"]');
}
async function deleteOne(s, name) {
  const p = s.page, row = await rowOf(p, name);
  await row.locator('button[title="إجراءات هذا السجل"]').click();
  await row.locator('button[title="حذف"]').click();
  const ok = p.locator('button', { hasText: 'تأكيد الحذف' });
  await ok.waitFor();
  await until(async () => !(await ok.isDisabled()) || (await p.locator('[data-emp-del-err]').count()), 'the delete review to finish');
  const err = await p.locator('[data-emp-del-err]').count() ? await p.locator('[data-emp-del-err]').innerText() : '';
  assert.equal(err, '', 'no refusal in the dialog: ' + err);
  const post = p.waitForRequest((r) => /\/api\/employees\/transition/.test(r.url()) && r.method() === 'POST', { timeout: 15000 });
  await ok.click(); await post;
  await until(async () => !(await p.locator('button', { hasText: 'تأكيد الحذف' }).count()), 'the dialog to close after the server acknowledged');
}

async function scenario(t, lab, s, d, names) {
  const p = s.page; p.setDefaultTimeout(15000);
  const accountsBefore = staffOf(lab, d), before = await empsOf(s, d);
  await s.go('#/employees', 4000);
  await rowOf(p, names[0]);
  /* ١٣ (أولاً — قبل الحذف): إضافة موظف بالاسم وحده لا تغيّر حسابات الآخرين */
  const writes0 = s.writes.length, acks = [];
  await p.locator('main button[title="إضافة موظف"]').click();
  await p.locator('input[placeholder="مثال: أحمد بن سالم الحربي"]').fill('TEST_ONLY موظف بالاسم وحده');
  const save = p.waitForRequest((r) => /\/api\/(save|operations)/.test(r.url()) && r.method() === 'POST');
  await p.locator('button', { hasText: /^\s*(إضافة|إضافة الموظف|حفظ)\s*$/ }).last().click(); await save;
  await until(async () => (await rowNames(p)).some((x) => x.includes('TEST_ONLY موظف بالاسم وحده')), 'the added row').catch(async (e) => { throw new Error(e.message + ' — ' + JSON.stringify({ rows: await rowNames(p), w: s.writes.slice(writes0), body: norm(await p.evaluate(() => document.body.innerText)).slice(0, 1500) })); });
  await p.waitForTimeout(3000); await lab.idle();
  const toast = await p.evaluate(() => document.body.innerText);
  assert.doesNotMatch(toast, /فُعّل تلقائياً/, 'no automatic activation of other accounts');
  for (const k of staffOf(lab, d)) assert.ok(accountsBefore.includes(k), 'adding an employee created no account for another employee: ' + k);
  const userSaves = s.writes.slice(writes0).filter((w) => w === 'POST /api/save');
  t.diagnostic('writes after add: ' + JSON.stringify(s.writes.slice(writes0)));
  acks.push(userSaves.length);
  const before1 = await empsOf(s, d);
  /* (١) ⋮ ← حذف ← تأكيد الحذف */
  await deleteOne(s, names[0]); await lab.idle();
  let now = await empsOf(s, d);
  assert.equal(now.length, before1.length - 1, 'one record removed on the server');
  assert.ok(!now.some((e) => e.name === names[0]), 'the deleted record is gone');
  assert.deepEqual(staffOf(lab, d), accountsBefore.filter((k) => k !== before.find((e) => e.name === names[0]).eid), 'no account of a remaining employee was created or changed');
  /* (٢) «حذف المحدد» */
  await until(async () => (await rowNames(p)).some((x) => x.includes(norm(names[1]))), 'the list to refresh');
  const r1 = await rowOf(p, names[1]);
  await r1.locator('input[type=checkbox]').check();
  await p.locator('main button', { hasText: 'حذف المحدد' }).click();
  const ok = p.locator('button', { hasText: 'تأكيد الحذف' }); await ok.waitFor();
  await until(async () => !(await ok.isDisabled()) || (await p.locator('[data-emp-del-err]').count()), 'the bulk review');
  assert.equal(await p.locator('[data-emp-del-err]').count(), 0, 'bulk: no refusal');
  const post = p.waitForRequest((r) => /\/api\/employees\/transition/.test(r.url()) && r.method() === 'POST');
  await ok.click(); await post;
  await until(async () => !(await p.locator('button', { hasText: 'تأكيد الحذف' }).count()), 'the bulk dialog to close');
  await lab.idle();
  now = await empsOf(s, d);
  assert.equal(now.length, before1.length - 2, 'bulk: one more record removed');
  for (const k of staffOf(lab, d)) assert.ok(accountsBefore.includes(k), 'no new account after the deletes: ' + k);

  assert.deepEqual(s.errs, [], 'no page errors');
  return { pending: (await empsOf(s, d)).filter((e) => e.nid && e.empno && !staffOf(lab, d).includes(e.eid)) };
}

test('V7 · د6 QA ١٢ · ١٣ — the seeded (demo) department: delete · bulk delete · add by name only', { timeout: 600000 }, async (t) => {
  const lab = await startLab(), b = await chromium.launch();
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const seed = await su.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
    const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1');
    await su.ctx.close();
    const s = await openAs(b, lab, m1.un, m1.pw);
    const out = await scenario(t, lab, s, 'tst_demo_d1', ['TEST_ONLY · موظف 1-1', 'TEST_ONLY · موظف 1-2']);
    assert.equal(out.pending.length, 2, 'the two pending seeded records (1-3 · 1-4) stay pending: ' + out.pending.map((e) => e.eid));
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 QA ١٢ · ١٣ — a department with the import\'s row shape (pending accounts): delete · bulk delete · add by name only', { timeout: 600000 }, async (t) => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const D = 'TEST_ONLY_A';
    /* صفوفٌ بشكل محرّك الاستيراد (590: eid «e…» · group · account «بانتظار التفعيل» · contact) — بلا حسابات */
    const imp = [1, 2, 3, 4].map((i) => ({ name: 'TEST_ONLY مستورد ' + i, nid: '18000000' + (10 + i), empno: '7700' + i, phone: '', email: '', type: 'رسمي', work: 'مراقب', gender: 'ذكر',
      eid: 'eTESTONLYimp' + i, group: 'بدون مجموعة', account: 'بانتظار التفعيل', contact: 'غير متوفر' }));
    const su0 = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const cur = await empsOf(su0, D); await su0.ctx.close();
    await replaceOperationalFixture(lab.env, 'bsdept:' + D + ':bassam_employees_v1', (cur || []).concat(imp));
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw);
    await scenario(t, lab, s, D, ['TEST_ONLY مستورد 1', 'TEST_ONLY مستورد 2']);
    /* the explicit manager action still activates a pending account (13: deferred activation is explicit) */
    const pending = (await empsOf(s, D)).filter((e) => /^eTESTONLYimp/.test(e.eid));
    assert.equal(pending.length, 2, 'two imported records still pending');
    const r = await s.page.evaluate((e) => KIVO.BassamAuth.activateStaff({ ekey: e.eid, nid: e.nid, phone: e.phone, empno: e.empno, name: e.name }), pending[0]);
    assert.equal(r && r.ok, true, 'explicit activation: ' + JSON.stringify(r));
    await lab.idle();
    assert.ok(staffOf(lab, D).includes(pending[0].eid), 'the explicitly activated account exists');
    assert.ok(!staffOf(lab, D).includes(pending[1].eid), '… and only that one');
  } finally { await b.close(); await lab.close(); }
});
