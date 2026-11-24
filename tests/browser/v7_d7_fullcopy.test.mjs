/* V7 · د7 — استيرادُ «النسخة الشاملة — كل الإدارات» الكبيرة من الواجهة بحساب مدير المنصة (Admin ← النسخة الاحتياطية ← «استيراد نسخة شاملة»).
   TEST_ONLY — نسخةٌ شاملة مولَّدة بالشكل القديم (v7_d7_fullcopy_fx.mjs): إدارةٌ بالشكل المقيس (جولاتٌ ≈8.4MB · مخططٌ ≈1.2MB · 10 صور) وإدارةٌ صغيرة.
   كانت تُرفض عند البدء (import-too-heavy: «استورد نسخ الإدارات واحدةً واحدة») — الآن تُقسم لكل إدارةٍ بالمسار نفسِه، وبعد الاعتماد يُقرأ كلُّ موردٍ لكل إدارة ويطابق النسخة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';
import { client, readBack, staged } from '../unit/v7_d6_import_fx.mjs';
import { fullOf } from '../unit/v7_d7_fullcopy_fx.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport') ? {} : { skip: 'يحتاج أنظمة المخطط والجولات والمهام' };
const click = async (p, t) => { const el = p.getByText(t, { exact: true }).last(); await el.waitFor({ state: 'visible', timeout: 60000 }); await el.click(); };

test('د7: النسخةُ الشاملة الكبيرة تُستورد من الواجهة بدفعاتٍ لكل إدارة ← كلُّ موردٍ لكل إدارةٍ يُقرأ ويطابق', { timeout: 900000, ...need }, async (t) => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const C = client(lab), T = { lab, DB: lab.env.DB, ...C, su: await C.login(LAB.superUn, LAB.superPw) };
    const { full, want } = await fullOf(T, [[A, { scale: 1 }, 'a'], [B, { small: true }, 'b']]);
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd7-full-')), 'TEST_ONLY-full-copy.json');
    fs.writeFileSync(file, JSON.stringify(full));
    assert.ok(fs.statSync(file).size > 30e6, 'نسخةٌ شاملة أكبر من حدّ الطلب بكثير: ' + fs.statSync(file).size);
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), posts = [];
    s.page.on('request', (r) => { if (/\/api\/backup\/import/.test(r.url())) { try { const q = JSON.parse(r.postData() || '{}'); posts.push({ op: q.op || q.phase, dry: !!q.dry, slices: q.slices ? Object.keys(q.slices) : null, i: q.i, bytes: Buffer.byteLength(r.postData() || '') }); } catch (e) { /* جسمٌ غيرُ JSON */ } } });
    await s.go('#/sysadmin/backup', 3500);
    await s.page.setInputFiles('input[aria-label="استيراد نسخة شاملة"]', file);
    await click(s.page, 'استبدال كامل');
    await click(s.page, 'نعم، استبدل');
    /* التأكيدُ الوحيد بعد الرفع والدفعات والفحص (548 confirm) */
    await click(s.page, 'استعادة النسخة');
    await s.page.getByText(/اكتملت الاستعادة/).first().waitFor({ state: 'visible', timeout: 600000 });
    const begin = posts.find((x) => x.op === 'begin' && !x.dry), sliced = posts.filter((x) => x.op === 'slice');
    assert.ok(begin && begin.slices.some((k) => k.startsWith(A + '/bassam_rounds_v1#')) && begin.slices.includes(A + '/bassam_plan_v1#0'), 'الدفعاتُ باسم إدارتها: ' + JSON.stringify(begin && begin.slices.slice(0, 4)));
    assert.ok(sliced.length >= 12, 'الجولاتُ أُرسلت دفعات (' + sliced.length + ')');
    assert.ok(Math.max(...posts.map((x) => x.bytes)) < 8 * 1024 * 1024, 'كلُّ طلبٍ دون 8MB');
    assert.equal(posts.filter((x) => x.op === 'commit').length, 1);
    for (const d of [A, B]) await readBack(T, d, want[d]);
    for (const id of Object.keys(full.idbImages)) { const g = await T.call('/api/img/' + id, { ck: T.su.ck }); assert.equal(g.status, 200, id); assert.equal(g.t === full.idbImages[id], true, 'بايتاتُ ' + id); }
    assert.equal(staged(lab.env.DB), 0);
    assert.deepEqual(s.errs, [], 'no page errors');
    t.diagnostic(posts.length + ' طلباً · ' + sliced.length + ' دفعة');
  } finally { await b.close(); await lab.close(); }
});
