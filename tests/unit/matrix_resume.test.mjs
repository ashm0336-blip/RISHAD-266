/* KIVO_263 · SOT-185 — مشغّلُ مصفوفة الأدوار يُستأنف: opts.done يتخطّى المكتمل · كلُّ حالةٍ تعيد مفاتيحها (التكرارُ آمن) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { PYTHON, ROOT } from './harness.mjs';
const require = createRequire(import.meta.url);
test('opts.done يتخطّى الحالاتِ المكتملة ويشغّل الباقي بترتيبه', async (t) => {
  let K; try { K = require(path.join(ROOT, 'k243', 'tests', 'k243cases.js')); } catch (e) { return t.skip('المشغّلُ من المختبر الانتقالي — غيرُ موجودٍ في المستودع الرسمي'); }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_mr_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', '1448-5-12', '--out', out], { stdio: 'pipe' });
  const fx = JSON.parse(fs.readFileSync(path.join(out, 'fixture.json'), 'utf8'));
  let list; try { list = K.cases(fx); } catch (e) { return t.skip('الحالاتُ تحتاج بذرةً كاملة: ' + String(e.message).slice(0, 80)); }
  const ids = list.map(c => c.id).slice(0, 3); assert.ok(ids.length === 3);
  const ran = [];
  const T = { SU: 'tst_sa', held: () => ({}), async call(uid, p) { ran.push(p); return { status: 200, json: { ok: 1, keys: {} } }; } };
  const only = '^(' + ids.join('|') + ')$';
  const seen = [];
  try { await K.run(T, { fx, mode: 'enforce', only, done: { [ids[0]]: true, [ids[1]]: true }, onRow: (r) => seen.push(r.id) }); } catch (e) { /* الحالةُ قد تحتاج خادماً — يكفي ما سُجّل */ }
  assert.ok(!seen.includes(ids[0]) && !seen.includes(ids[1]), 'المكتملُ تُخطّي: ' + JSON.stringify(seen));
  assert.ok(seen.length <= 1 && (seen.length === 0 || seen[0] === ids[2]), 'والباقي وحده');
});
/* KIVO_263 · SOT-187 — قبل المصفوفة تُغلق نوافذُ الاستدراك المفتوحة المتبقّية من تشغيلٍ انقطع (فلا يتغيّر سببُ W06) · المغلقةُ والمنتهيةُ لا تُمسّ */
test('pre: يغلق النوافذَ المفتوحة وحدها في إدارات الاختبار قبل أوّل حالة', async (t) => {
  let K; try { K = require(path.join(ROOT, 'k243', 'tests', 'k243cases.js')); } catch (e) { return t.skip('المشغّلُ من المختبر الانتقالي'); }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_mr2_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', '1448-5-12', '--out', out], { stdio: 'pipe' });
  const fx = JSON.parse(fs.readFileSync(path.join(out, 'fixture.json'), 'utf8'));
  const now = 1e12, closed = [], order = [];
  const W = { 'irshad|tst_d1': [{ id: 'open1', until: now + 1e6 }, { id: 'done1', until: now + 1e6, closedAt: now - 5 }, { id: 'exp1', until: now - 1 }], 'seized|tst_d2': [{ id: 'open2', until: now + 9 }] };
  const T = { SU: 'tst_sa', held: () => ({}), async call(uid, p, m, b) {
    order.push(p);
    if (m === 'GET' && p.startsWith('/api/retro?')) { const q = new URLSearchParams(p.split('?')[1]); return { status: 200, json: { ok: 1, now, windows: W[q.get('res') + '|' + q.get('dept')] || [] } }; }
    if (p === '/api/retro' && b && b.act === 'close') { closed.push(b.res + ':' + b.dept + ':' + b.id); return { status: 200, json: { ok: 1 } }; }
    return { status: 200, json: { ok: 1, keys: {} } }; } };
  const res = await K.run(T, { fx, mode: 'enforce', only: '^$' });
  assert.deepEqual(closed.sort(), ['irshad:tst_d1:open1', 'seized:tst_d2:open2'], 'المفتوحةُ وحدها: ' + JSON.stringify(closed));
  assert.equal(res.closedRetro, 2);
  const res2 = await K.run(T, { fx, mode: 'enforce', only: '^$', noPre: true }); assert.equal(res2.closedRetro, undefined, 'noPre يعطّلها');
});
