/* مسبارٌ مؤقت (لا يُلتزَم) */
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
const OUT = process.env.SHOTS;
const lab = await startLab(); const b = await chromium.launch();
try {
  const W = +(process.env.W || 1366), H = +(process.env.H || 900);
  const who = process.env.WHO === 'mgr' ? [LAB.mgrA, LAB.pw] : [LAB.superUn, LAB.superPw];
  const s = await openAs(b, lab, who[0], who[1], { viewport: { width: W, height: H } }); const p = s.page;
  const cons = []; p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') cons.push(m.type() + ': ' + m.text().slice(0, 300)); });
  const steps = (process.env.STEPS || '#/sysadmin/org').split(',');
  let i = 0;
  for (const h of steps) {
    await s.go(h, 3000);
    console.log(h, '→', await p.evaluate(() => location.hash));
    console.log('  og:', await p.evaluate(() => { const e = document.querySelector('main .og'); return e ? JSON.stringify({ mode: e.dataset.ogMode, unit: e.dataset.ogUnit, tab: e.dataset.ogTab, rows: [...e.querySelectorAll('.og-rw')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()), tabs: [...e.querySelectorAll('.og-tab')].map((t) => t.innerText.trim() + (t.getAttribute('aria-selected') === 'true' ? '*' : '')), txt: (e.querySelector('.og-unit') || e).innerText.replace(/\s+/g, ' ').slice(0, 700) }) : 'NO .og — main: ' + (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 400); }));
    await p.screenshot({ path: OUT + '/' + (process.env.TAG || 'p') + '_' + (i++) + '.png', fullPage: true });
  }
  console.log('errs', JSON.stringify(s.errs), 'console', JSON.stringify(cons.slice(0, 12)));
} finally { await b.close(); await lab.close(); }
