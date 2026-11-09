/* RISHAD-266 · browser acceptance — department/section delete dialog (root confirm #bsCfm) in the isolated lab, desktop and phone.
   Root cause fixed: the dialog panel's click-stopper (bkcStop) was a no-op whenever the import dialog was closed, so any click inside
   the panel (field, label, message) bubbled to the cancelling backdrop. Checks: open · click/tap the field · type · label/message ·
   mismatch · cancel · backdrop · Escape · confirmed delete verified on the server · department with sections refused · populated
   section typed delete · manager and department-role refusal (UI + server 403) · no page errors. TEST_ONLY data, no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
for (const VP of ['desktop', 'phone']) test('delete dialog (' + VP + ')', { timeout: 300000 }, async () => {
const vp = VP === 'phone' ? { width: 390, height: 844 } : undefined;
const lab = await startLab();
{ /* TEST_ONLY: give the section one manager account so the server inventory is populated (typed-confirm path) */
  const K = 'bassam_auth_users_v1', us = JSON.parse(lab.env.DB.q("SELECT v FROM kv WHERE k='" + K + "' ORDER BY seq").map(r => r.v).join(''));
  const a = us.find(u => u.id === 'TEST_ONLY_mgrA'); us.push({ ...a, id: 'TEST_ONLY_mgrS1', un: '1100000009', name: 'TEST_ONLY مدير قسم', deptId: 'TEST_ONLY_A_S1', ekey: 'mgr:TEST_ONLY_A_S1' });
  await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind(K), ...lab.W.kvPutStmts(lab.env, 'kv', K, JSON.stringify(us)), lab.env.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind(K)]);
}
const b = await chromium.launch();
const res = []; const ok = (n, c, x) => { res.push((c ? 'PASS ' : 'FAIL ') + n + (x ? ' ' + JSON.stringify(x) : '')); };
const dlg = (p) => p.evaluate(() => { const d = document.getElementById('bsCfm'), i = document.getElementById('bsCfmTyped'), o = document.getElementById('bsCfmOk'); return { open: !!d, title: d && d.querySelector('h3').textContent, val: i && i.value, okOpacity: o && getComputedStyle(o).opacity, focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }; });
const depts = () => JSON.parse(lab.env.DB.q("SELECT v FROM kv WHERE k='bassam_depts_v1' ORDER BY seq").map(r => r.v).join('')).map(d => d.id);
const keysOf = (id) => lab.env.DB.q("SELECT count(*) n FROM ops_nodes WHERE department_id='" + id + "'")[0].n + lab.env.DB.q("SELECT count(*) n FROM kv WHERE k LIKE 'bsdept:" + id + ":%'")[0].n;
const usersOf = (id) => JSON.parse(lab.env.DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq").map(r => r.v).join('')).filter(u => u.deptId === id).length;
const tap = (p, sel) => p.click(sel);
try {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: vp, ...(vp ? {} : {}) });
  const p = s.page;
  await s.go('#/sysadmin/depts');   /* the recorded address: it becomes #/sysadmin/org (V7 P0) */
  const open = async (name) => {
    /* V7 P1: the structure page (#/sysadmin/org) is the tree; a row opens the unit's own page, whose «البيانات» tab holds the delete
       (it was the last item of the «بيانات الإدارة» row menu). Each open starts from the structure page */
    await s.go('#/sysadmin/org', 1500);
    await p.locator('main .tr-sb a', { hasText: 'فرد الكل' }).click(); await p.waitForTimeout(400);
    await p.locator('main .tr-rw', { hasText: name }).first().click(); await p.waitForTimeout(1200);
    const tab = p.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: 'البيانات' }).first();
    if (await tab.count()) { await tab.click(); await p.waitForTimeout(400); await p.locator('main .ov7 button.dz').first().click(); }
    else res.push('DEBUG no data tab: ' + JSON.stringify(await p.evaluate(() => [location.hash].concat([...document.querySelectorAll('main [aria-label="أقسام صفحة العقدة"] button')].map(x => x.textContent.trim().slice(0, 30))))));
    await p.waitForSelector('#bsCfm', { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(300);
    const dd = await dlg(p); if (!dd.open) res.push('DEBUG no dialog: ' + JSON.stringify(await p.evaluate(() => ({ toast: (document.querySelector('#bs-toast')||{}).textContent, mbk: document.querySelectorAll('main span.mbk').length, mi: [...document.querySelectorAll('main button.mi.dz, main button.dz')].map(x => x.className + '|' + x.title) }))));
    return dd;
  };
  const B = 'TEST_ONLY إدارة ب';
  ok('B present before', depts().includes('TEST_ONLY_B') && keysOf('TEST_ONLY_B') > 0, { keys: keysOf('TEST_ONLY_B'), users: usersOf('TEST_ONLY_B') });
  let d = await open(B); ok('dialog opens, focus on cancel', d.open && d.focus === 'bsCfmNo', d);
  await tap(p, '#bsCfmTyped'); await p.waitForTimeout(300); d = await dlg(p); ok('click/tap field keeps dialog open + focuses field', d.open && d.focus === 'bsCfmTyped', d);
  for (const ch of B) { await p.keyboard.type(ch); }
  await p.waitForTimeout(200); d = await dlg(p); ok('typing char by char keeps open, value tracks', d.open && d.val === B && d.okOpacity === '1', d);
  await p.click('label[for=bsCfmTyped]'); await p.click('#bsCfmMsg'); await p.waitForTimeout(200); d = await dlg(p); ok('click label/message keeps open', d.open, d);
  await p.fill('#bsCfmTyped', B.slice(0, 5)); await p.click('#bsCfmOk'); await p.waitForTimeout(500); d = await dlg(p); ok('disabled confirm (mismatch) does nothing, stays open', d.open && d.okOpacity !== '1', d);
  await p.click('#bsCfmNo'); await p.waitForTimeout(800); d = await dlg(p); ok('cancel closes', !d.open, d);
  await lab.idle(); ok('after cancel server unchanged', depts().includes('TEST_ONLY_B') && keysOf('TEST_ONLY_B') > 0 && !s.writes.some(w => /dept-delete/.test(w) && w.startsWith('POST')), s.writes.filter(w => /dept/.test(w)));
  d = await open(B); await p.mouse.click(5, 5); await p.waitForTimeout(400); d = await dlg(p); ok('backdrop click still cancels', !d.open, d);
  d = await open(B); await p.keyboard.press('Escape'); await p.waitForTimeout(400); d = await dlg(p); ok('Escape cancels', !d.open, d);
  d = await open(B); await tap(p, '#bsCfmTyped'); await p.keyboard.type(B, { delay: 30 }); d = await dlg(p);
  ok('ready to confirm', d.open && d.val === B && d.okOpacity === '1', d);
  await p.click('#bsCfmOk'); await p.waitForTimeout(4000); await lab.idle();
  ok('confirmed delete: server removed B (defn, keys, accounts)', !depts().includes('TEST_ONLY_B') && keysOf('TEST_ONLY_B') === 0 && usersOf('TEST_ONLY_B') === 0, { depts: depts(), keys: keysOf('TEST_ONLY_B'), users: usersOf('TEST_ONLY_B'), writes: s.writes.filter(w => /dept/.test(w)) });
  ok('A and S1 untouched', depts().includes('TEST_ONLY_A') && depts().includes('TEST_ONLY_A_S1') && keysOf('TEST_ONLY_A') > 0, { keysA: keysOf('TEST_ONLY_A') });
  // A has a section -> refused before any dialog
  d = await open('TEST_ONLY إدارة أ'); ok('dept with section: no dialog (refused)', !d.open, d);
  ok('A still on server', depts().includes('TEST_ONLY_A'));
  // section S1
  d = await open('TEST_ONLY قسم أ١');
  if (d.open) { await tap(p, '#bsCfmTyped'); const nm = d.title.replace(/^.*«|».*$/g, ''); await p.keyboard.type(nm, { delay: 30 }); const d2 = await dlg(p); ok('section dialog stays open while typing', d2.open && d2.val === nm, d2); await p.click('#bsCfmOk'); }
  else { res.push('INFO section S1 empty -> no typed dialog'); }
  await p.waitForTimeout(4000); await lab.idle();
  ok('section deleted on server', !depts().includes('TEST_ONLY_A_S1') && keysOf('TEST_ONLY_A_S1') === 0, depts());
  ok('no page errors (super)', !s.errs.length, s.errs);
  // manager: UI and server refusal
  const m = await openAs(b, lab, LAB.mgrA, LAB.pw, { viewport: vp });
  await m.go('#/admin');
  const mUi = await m.page.evaluate(() => [...document.querySelectorAll('main button')].filter(x => /حذف إدارة|حذف الإدارة|حذف القسم/.test((x.title || '') + x.textContent)).length);
  ok('manager sees no dept/section delete control', mUi === 0, { mUi });
  const r1 = await m.api('/api/admin/dept-delete?dept=TEST_ONLY_A'); const r2 = await m.api('/api/admin/dept-delete', { method: 'POST', body: JSON.stringify({ dept: 'TEST_ONLY_A', ticket: 'x' }) });
  await lab.idle();
  ok('manager delete refused by server', r1.status >= 400 && r2.status >= 400 && depts().includes('TEST_ONLY_A'), { r1: r1.status, r1j: r1.j && (r1.j.err || r1.j.error), r2: r2.status, r2j: r2.j && (r2.j.err || r2.j.error) });
  const e = await openAs(b, lab, LAB.dmA, LAB.pw, { viewport: vp });
  const r3 = await e.api('/api/admin/dept-delete?dept=TEST_ONLY_A');
  ok('role dept delete refused by server', r3.status >= 400 && depts().includes('TEST_ONLY_A'), { r3: r3.status });
} catch (e) { res.push('ERROR ' + (e.stack || e).toString().slice(0, 500)); }
finally { await b.close(); await lab.close(); }
const bad = res.filter((l) => !l.startsWith('PASS ') && !l.startsWith('INFO ') && !l.startsWith('DEBUG '));   /* DEBUG = diagnostic context printed on expected refusals */
assert.deepEqual(bad, [], res.join('\n'));
assert.ok(res.filter((l) => l.startsWith('PASS ')).length >= 18, res.join('\n'));
});
