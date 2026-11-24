/* V7 · د7 — استيراد الموظفين من Excel: الصفُّ المرفوض يُذكر (المختبر المعزول · العاملُ الحقيقي · الإنفاذ · TEST_ONLY · بلا شبكة).
   قبل: الصفُّ المخالف يُعدّ «رُفض N صف مخالف…» بلا رقم ولا سبب، والهويةُ أو الجوالُ المخالف يُفرَّغ صامتاً ويُستورد الصف،
   والتكرارُ مع إدارةٍ أخرى يردّه الخادم «تكرار» مجرّداً. بعد:
   · المعاينةُ قبل الاختيار تسرد كلَّ صفٍّ سيُرفض برقم صفّه في الملف وسببه (الهوية والجوال 10 أرقام · الرقم الوظيفي 5–6 · التكرارُ ومع من)؛
   · ملخّصُ ما بعد الاعتماد يذكر الصفوفَ نفسها؛ والخادمُ يردّ تكرارَ إدارةٍ أخرى أو حسابِ دخول بتفصيله فيُذكر الصفُّ وأين.
   كلُّ مرحلةٍ تُقرأ من الخادم بعد الاعتماد (لا شيءَ من المرفوض يُحفظ). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'd7imp-'));
const HEAD = ['اسم الموظف', 'الجنس', 'رقم الهوية', 'الرقم الوظيفي', 'رقم الجوال', 'البريد الإلكتروني', 'نوع التوظيف', 'نوع العمل'];
const R = (name, nid, empno, phone) => [name, 'ذكر', nid || '', empno || '', phone || '', '', '', ''];
const lat = (t) => String(t).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[‎‏‪-‮⁦-⁩]/g, '');
async function emps(s) { const k = 'bsdept:' + A + ':bassam_employees_v1'; const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(k)); return (r.j && r.j.resources && r.j.resources[k]) || []; }
async function xlsx(p, rows, name) {
  const b64 = await p.evaluate(async (rows) => { const out = await KIVO.BassamXLSX.build(rows); const u = out instanceof Uint8Array ? out : new Uint8Array(out.buffer || out); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }, rows);
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f;
}
async function upload(p, file) {
  await p.locator('main button', { hasText: 'ملفات' }).first().click(); await p.waitForTimeout(500);
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 20000 }), p.locator('[data-emp-imp="menu"]').first().click()]);
  await fc.setFiles(file);
}
const until = async (fn, what, ms = 20000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 150)); } };
/* نافذةُ المعاينة بعد مراجعة الخادم (الأزرارُ متاحة) — وقائمةُ الصفوف المرفوضة فيها */
async function preview(p) {
  await until(() => p.evaluate(() => !!document.querySelector('[data-imp="add"]') && !/جارٍ تأكيد/.test(document.body.innerText)), 'the preview');
  return p.evaluate(() => [...document.querySelectorAll('[data-emp-imp-rej-row]')].map((li) => ({ row: +li.getAttribute('data-emp-imp-rej-row'), text: li.textContent })));
}
/* رسائلُ الصفحة: #bs-toast (تُنشأ عند أول رسالة) تُرصد بمراقِبٍ على الجسم، مع رسائل المنصة */
const toastsOf = (p) => p.evaluate(() => (window.__toasts || []).concat((() => { const n = document.getElementById('bs-toast'); return n && n.textContent ? [n.textContent] : []; })()));
async function choose(p, k) {
  const res = p.waitForResponse((r) => /\/api\/employees\/transition/.test(r.url()) && r.request().method() === 'POST', { timeout: 20000 });
  await p.locator('[data-imp="' + k + '"]').click();
  const r = await res; await p.waitForTimeout(1500); return r.status();
}

test('V7 · د7 — Excel import: the preview names every rejected row before choosing, the summary and the server refusal name the row and the reason', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page; p.setDefaultTimeout(15000);
    await p.evaluate(() => { location.hash = '#/employees'; }); await p.waitForTimeout(3500);
    await p.evaluate(() => { window.__toasts = []; const f = KIVO.bsToast; KIVO.bsToast = function (msg) { try { window.__toasts.push(String(msg)); } catch (e) {} return f.apply(this, arguments); };
      new MutationObserver(() => { const n = document.getElementById('bs-toast'); if (n && n.textContent && window.__toasts[window.__toasts.length - 1] !== n.textContent) window.__toasts.push(n.textContent); }).observe(document.body, { childList: true, characterData: true, subtree: true }); });
    const start = await emps(m);

    /* ── (١) أخطاءُ الصيغة: الهوية · الجوال · الرقم الوظيفي ── */
    await upload(p, await xlsx(p, [HEAD, R('TEST_ONLY صالح أ', '1300000011', '55001', '0500000011'), R('TEST_ONLY هوية قصيرة', '12345'), R('TEST_ONLY جوال قصير', '1300000013', '', '05123'), R('TEST_ONLY وظيفي قصير', '1300000014', '123')], 'format.xlsx'));
    let rej = await preview(p);
    assert.deepEqual(rej.map((x) => x.row), [3, 4, 5], 'the preview lists rows 3·4·5 before any choice: ' + JSON.stringify(rej));
    assert.match(lat(rej[0].text), /رقم الهوية «12345» يجب أن يكون 10 أرقام/);
    assert.match(lat(rej[1].text), /رقم الجوال «05123» يجب أن يكون 10 أرقام/);
    assert.match(lat(rej[2].text), /الرقم الوظيفي «123» يجب أن يكون 5 أو 6 أرقام/);
    assert.equal((await emps(m)).length, start.length, 'nothing is saved before the choice');
    assert.equal(await choose(p, 'add'), 200, 'the valid rows are imported');
    let now = await emps(m);   /* قراءةٌ من الخادم بعد الاعتماد */
    assert.equal(now.length, start.length + 1, 'only the valid row was added');
    assert.ok(now.some((e) => e.name === 'TEST_ONLY صالح أ' && e.nid === '1300000011' && e.phone === '0500000011' && e.empno === '55001'));
    for (const n of ['TEST_ONLY هوية قصيرة', 'TEST_ONLY جوال قصير', 'TEST_ONLY وظيفي قصير']) assert.ok(!now.some((e) => e.name === n), n + ' is not imported (not with a blanked field either)');
    let t = lat((await toastsOf(p)).join(' | '));
    assert.match(t, /رُفض 3 صف/, 'the summary counts the rejected rows: ' + t);
    for (const r of [3, 4, 5]) assert.match(t, new RegExp('الصف ' + r + ' '), 'the summary names row ' + r);

    /* ── (٢) التكرارُ مع موظفٍ قائم في الإدارة ── */
    await p.evaluate(() => { window.__toasts = []; });
    await upload(p, await xlsx(p, [HEAD, R('TEST_ONLY جوال مكرر', '1300000022', '', '0500000011'), R('TEST_ONLY صالح ب', '1300000033')], 'local-dup.xlsx'));
    rej = await preview(p);
    assert.deepEqual(rej.map((x) => x.row), [2], 'row 2 is announced: ' + JSON.stringify(rej));
    assert.match(lat(rej[0].text), /رقم الجوال 0500000011 مكرر مع «TEST_ONLY صالح أ» في هذه الإدارة/);
    assert.equal(await choose(p, 'add'), 200);
    now = await emps(m);
    assert.ok(now.some((e) => e.nid === '1300000033') && !now.some((e) => e.nid === '1300000022'), 'the valid row only');
    t = lat((await toastsOf(p)).join(' | '));
    assert.match(t, /الصف 2 \(TEST_ONLY جوال مكرر\): رقم الجوال 0500000011 مكرر/, 'the summary names row 2 and where: ' + t);

    /* ── (٣) التكرارُ مع إدارةٍ أخرى أو حسابِ دخول: يردّه الخادم بتفصيله، ولا يُحفظ شيء ── */
    await p.evaluate(() => { window.__toasts = []; });
    const before3 = JSON.stringify(await emps(m));
    await upload(p, await xlsx(p, [HEAD, R('TEST_ONLY هوية إدارة أخرى', '1200000101'), R('TEST_ONLY جوال حساب', '1300000055', '', LAB.mgrB), R('TEST_ONLY صالح ج', '1300000044')], 'remote-dup.xlsx'));
    rej = await preview(p);
    assert.deepEqual(rej, [], 'the browser cannot know the other departments — no local warning');
    assert.equal(await choose(p, 'add'), 403, 'the server refuses the duplicates');
    assert.equal(JSON.stringify(await emps(m)), before3, 'nothing was saved (read back from the server)');
    t = lat((await toastsOf(p)).join(' | ') + ' | ' + await p.evaluate(() => document.body.innerText));
    assert.match(t, /الصف 2 \(TEST_ONLY هوية إدارة أخرى\): رقم الهوية 1200000101 مكرر — مسجّل لموظف في إدارة أخرى/, 'row 2 and where: ' + t.slice(0, 600));
    assert.match(t, new RegExp('الصف 3 \\(TEST_ONLY جوال حساب\\): رقم الجوال ' + LAB.mgrB + ' مكرر — مسجّل اسمَ دخول لحساب خارج هذه الإدارة'), 'row 3 and where');
    assert.doesNotMatch(t, /TEST_ONLY_B|TEST_ONLY موظف ب/, 'the other department and its employee are not named');
    assert.deepEqual(m.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
