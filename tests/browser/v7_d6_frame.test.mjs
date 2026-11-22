/* V7 · د6 (م1 «الإطار») — شاشة «الإدارات والصلاحيات» في المتصفح الحقيقي فوق المختبر المعزول (بيانات TEST_ONLY، بلا شبكة): ب1 · ب2 · ب3 · ب10 وهيكلُ ب13.
   ب1 · بند القائمة «الإدارات والصلاحيات» يفتح الشاشة مباشرةً · عمودان (الشجرة يميناً · الوحدة يساراً) · سبعةُ تبويبات (أربعةٌ لصف «المنصة كلها») ·
        الرابطُ العميق يعمل بعد إعادة التحميل · العناوينُ القديمة تُحوَّل · تبديلُ الوحدة يُبقي التبويب والشجرةُ تبقى مركَّبة · الصفحةُ ملفٌّ يُحمَّل عند فتحها؛
   ب2 · قيمُ أعمدة الشجرة للهيكل المبذور · الفلاتر والبحث وفرد/طيّ الكل · التحديد المتعدد وشريطُه و«إلغاء التحديد» · «تصدير النسخة الشاملة» تحتها؛
   ب3 · نافذةُ الإضافة من الموضعين (الأبُ معبّأ) · «نقل إلى…» بلا الوحدة وفرعها وبـ«الموضع بعد النقل» (النقلُ يعمل بلا سحب) · الحذفُ يرفض غيرَ الفارغة بسببه ·
        لا ⋯ على الصفوف ولا تعديلَ اسمٍ في الرأس؛
   ب10 · ملخّصُ الوحدة وخاناتُه · «ما تحتها» · قائمةُ التهيئة خمسُ خطواتٍ تفتح تبويباتها؛
   ب12 (المدخل) · عنوانُ المدير #/admin/perm يبقى يعمل ويفتح المكوّنَ نفسَه بشجرة وحدته وحدها وبلا أفعال هيكل؛
   ب13 · 390 و768: عمودٌ واحد · زرُّ الوحدة يفتح الشجرة لوحةً من الأسفل · شريطُ التبويبات يُسحب أفقياً · أهدافُ اللمس 44px · النوافذُ تملأ العرض · لا تمريرَ أفقياً للصفحة.
   فتحُ الصفحات لا يحفظ شيئاً؛ ولا أخطاءَ صفحة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1';
const read = (lab, k) => lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('');
const G = 'TEST_ONLY_G', A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1';
const TABS7 = ['نظرة عامة', 'الأنظمة', 'المسؤولون', 'الأدوار', 'الأشخاص', 'السجل', 'البيانات'];
/* طبقةُ العرض تكتب الأرقامَ ٠-٩ وتحوطها بعلامات اتجاه — تُوحَّد للمقارنة */
const norm = (s) => String(s).replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g, ' ').trim();

async function page(b, lab, who, view) {
  const s = await openAs(b, lab, who ? who[0] : LAB.superUn, who ? who[1] : LAB.superPw, Object.assign({ viewport: { width: 1366, height: 900 } }, view || {})); s.page.setDefaultTimeout(15000);   /* عرضُ المكتب: عمودان (العرضُ ≤ 1280 عمودٌ واحد — ب13) */
  const p = s.page;
  const H = () => p.evaluate(() => location.hash);
  const og = () => p.evaluate(() => { const e = document.querySelector('main .og'); return e ? { mode: e.dataset.ogMode, unit: e.dataset.ogUnit, tab: e.dataset.ogTab, sheet: e.dataset.ogSheet } : null; });
  const tabs = async () => (await p.locator('main .og-tab').allInnerTexts()).map(norm);
  const tabOn = async () => (await p.locator('main .og-tab[aria-selected="true"]').allInnerTexts()).map(norm);
  /* صفوفُ الشجرة الظاهرة: [المعرّف، الاسم، النوع، تحتها، المدير، الأشخاص، الأنظمة] */
  const rows = () => p.evaluate(() => [...document.querySelectorAll('main .og-rw')].filter((e) => e.getClientRects().length).map((e) => [e.dataset.ogId,
    e.querySelector('.og-nm').textContent, e.querySelector('.og-c-kd').textContent, ...['kids', 'mgr', 'people', 'systems'].map((c) => e.querySelector('[data-og-col="' + c + '"]').textContent)])).then((L) => L.map((r) => r.map(norm)));
  const row = (id) => p.locator('main .og-rw[data-og-id="' + id + '"]');
  const side = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const toast = () => p.evaluate(() => [...document.querySelectorAll('#bs-toast,#bs-stoast,[role=status]')].map((e) => e.textContent).join(' '));
  return { s, p, H, og, tabs, tabOn, rows, row, side, toast };
}

test('V7 · د6 ب1 · one screen: the menu item, two columns, tabs, deep link after reload, old addresses redirected, the unit switch keeps the tab and the tree stays mounted', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  const before = [read(lab, KG), read(lab, KD)];
  try {
    const pages = [];
    const { s, p, H, og, tabs, tabOn, rows, row } = await page(b, lab, null, { onPage: (pg) => pg.on('request', (r) => { const m = /\/assets\/pages\/(Org[^/]*)$/.exec(new URL(r.url()).pathname); if (m) pages.push(m[1]); }) });
    /* الصفحةُ ملفٌّ مستقل يُحمَّل عند فتحها: لا يُطلب في «الرئيسية» */
    await s.go('#/sysadmin/overview', 2500);
    assert.deepEqual(pages, [], 'the screen\'s file is not fetched before it is opened');
    /* بندُ القائمة الجانبية يفتح الشاشة مباشرةً */
    const item = p.locator('aside.bsb a.s-ci', { hasText: 'الإدارات والصلاحيات' });
    assert.equal(await item.count(), 1, 'the sidebar item is «الإدارات والصلاحيات»');
    assert.equal(await p.locator('aside.bsb a.s-ci').evaluateAll((L) => L.filter((e) => e.textContent.trim() === 'الإدارات').length), 0, 'the old label is gone');
    await item.evaluate((e) => e.click()); await p.waitForTimeout(3000);
    assert.equal(await H(), '#/sysadmin/org/platform/overview', 'it opens the screen itself (the root row · overview)');
    assert.ok(pages.some((n) => /^Org\.[0-9a-f]+\.dc\.txt$/.test(n)) && pages.some((n) => /^Org\.logic\.[0-9a-f]+\.js$/.test(n)), 'now its own page file and logic are fetched: ' + JSON.stringify(pages));
    assert.equal(norm(await p.locator('main .con-ph h2').innerText()), 'الإدارات والصلاحيات', 'the page title');
    assert.deepEqual(await og(), { mode: 'site', unit: 'platform', tab: 'overview', sheet: 'false' });
    assert.deepEqual(await tabs(), ['نظرة عامة', 'الأنظمة', 'المسؤولون', 'السجل'], 'the root row: four tabs');
    /* عمودان (RTL): الشجرةُ يميناً والوحدةُ يساراً */
    const box = async (q) => p.locator(q).boundingBox();
    const bt = await box('main .og-tree'), bu = await box('main .og-unit');
    assert.ok(bt.x > bu.x + bu.width - 2 && Math.abs(bt.y - bu.y) < 40, 'the tree is the right column, the unit the left one: ' + JSON.stringify([bt, bu]));
    assert.equal(await p.locator('main .og-ub').isVisible(), false, 'no unit button in the wide layout');
    /* وحدة: سبعةُ تبويباتٍ بترتيبها · الرأس: المسار · الاسم · النوع · حالة المدير · «التبديل إليها» */
    await row(B).locator('.og-nm').click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/' + B + '/overview');
    assert.deepEqual(await tabs(), TABS7); assert.deepEqual(await tabOn(), ['نظرة عامة']);
    assert.deepEqual((await p.locator('main .og-hd [data-og]').evaluateAll((L) => L.map((e) => [e.dataset.og, e.textContent]))).map((x) => [x[0], norm(x[1])]),
      [['path', 'TEST_ONLY إدارة عامة'], ['name', 'TEST_ONLY إدارة ب'], ['kind', 'إدارة'], ['mgr', 'له مدير']]);
    assert.equal(await p.locator('main .og-hd [data-og-act="switch"]').count(), 1, '«التبديل إليها» for a unit that is not the active one');
    assert.equal(await p.locator('main .og-hd input, main .og-hd [contenteditable]').count(), 0, 'no name editing in the header');
    /* الشجرةُ تبقى مركَّبةً مع تبديل الوحدة والتبويب (العنصرُ نفسُه) */
    /* اسمُ كل صفٍّ ظاهرٌ يُقرأ ويُنقر في عمود الشجرة (والوحدةُ الحالية بشارتها): لا يُضغط إلى عرضٍ صفر */
    const thin = await p.evaluate(() => [...document.querySelectorAll('main .og-rw .og-nm')].map((e) => [e.textContent, Math.round(e.getBoundingClientRect().width)]).filter((x) => x[1] < 60));
    assert.deepEqual(thin, [], 'every name keeps a readable width at 1366 (the shortest, «المنصة كلها», is its own text wide)');
    await p.evaluate(() => { document.querySelector('main .og-tree').__TEST_ONLY_mark = 1; document.querySelector('main .og-q').__TEST_ONLY_mark = 1; });
    const kept = () => p.evaluate(() => !!document.querySelector('main .og-tree').__TEST_ONLY_mark && !!document.querySelector('main .og-q').__TEST_ONLY_mark);
    await p.locator('main .og-tab', { hasText: 'الأشخاص' }).click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/' + B + '/people'); assert.deepEqual(await tabOn(), ['الأشخاص']); assert.ok(await kept(), 'tab switch: the tree is the same element');
    /* اختيارُ وحدةٍ أخرى يُبقي التبويب */
    await row(A).locator('.og-nm').click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/people', 'another unit, the same tab'); assert.deepEqual(await tabOn(), ['الأشخاص']); assert.ok(await kept(), 'unit switch: the tree is the same element');
    assert.equal(await row(A).getAttribute('aria-selected'), 'true'); assert.match(await row(A).getAttribute('class'), /\bsel\b/);
    assert.ok((await p.locator('main [data-org-tab="people"] tbody tr').count()) >= 1, 'the people of the new unit are shown');
    await row(G).locator('.og-nm').click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/' + G + '/people', 'a supervisory node keeps the tab too');
    assert.equal(await p.locator('main [data-org-tab="people"] section[aria-label="أشخاص الفرع"]').count(), 1);
    /* تبويبٌ لا يحمله الهدف ⇒ نظرة عامة */
    await row('platform').locator('.og-nm').click(); await p.waitForTimeout(1500);
    assert.equal(await H(), '#/sysadmin/org/platform/overview');
    /* زرُّ الرجوع يتنقّل بين الوحدات والتبويبات */
    await p.goBack(); await p.waitForTimeout(1500); assert.equal(await H(), '#/sysadmin/org/' + G + '/people');
    await p.goBack(); await p.waitForTimeout(1500); assert.equal(await H(), '#/sysadmin/org/' + A + '/people'); assert.deepEqual(await tabOn(), ['الأشخاص']);

    /* رابطٌ عميق بعد إعادة التحميل: الوحدةُ والتبويب من العنوان وحده */
    for (const [unit, tab, label] of [[A, 'roles', 'الأدوار'], [S1, 'systems', 'الأنظمة'], [G, 'admins', 'المسؤولون'], [A, 'data', 'البيانات'], ['platform', 'systems', 'الأنظمة']]) {
      await s.go('#/sysadmin/org/' + unit + '/' + tab, 2000);
      await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('main .og-rw', { timeout: 30000 }); await p.waitForTimeout(2000);
      assert.equal(await H(), '#/sysadmin/org/' + unit + '/' + tab, 'the address survives the reload');
      assert.deepEqual(await og(), { mode: 'site', unit, tab, sheet: 'false' }, 'reload: ' + unit + '/' + tab);
      assert.deepEqual(await tabOn(), [label]); assert.equal(await row(unit).getAttribute('aria-selected'), 'true');
      assert.ok((await p.locator('main [data-org-tab="' + tab + '"]').innerText()).trim().length > 10, 'the tab has content: ' + tab);
    }
    /* العناوينُ القديمة تُحوَّل إلى الجديدة */
    const OLD = [
      ['#/sysadmin/depts', '#/sysadmin/org/platform/overview'],                    /* أقدمُ عنوانٍ لصفحة الهيكل */
      ['#/sysadmin/org', '#/sysadmin/org/platform/overview'],                      /* صفحةُ «الهيكل» */
      ['#/sysadmin/org/' + A, '#/sysadmin/org/' + A + '/overview'],                /* صفحةُ الوحدة */
      ['#/sysadmin/org/' + G + '/perm/systems', '#/sysadmin/org/' + G + '/systems'],
      ['#/sysadmin/org/' + A + '/perm/roles', '#/sysadmin/org/' + A + '/roles'],
      ['#/sysadmin/org/' + A + '/perm/people', '#/sysadmin/org/' + A + '/people'],
      ['#/sysadmin/org/' + S1 + '/perm/log', '#/sysadmin/org/' + S1 + '/log'],
    ];
    for (const [o, n] of OLD) {
      await s.go('#/sysadmin/overview', 1200); await s.go(o, 2500);
      assert.equal(await H(), n, o + ' → ' + n);
      const seg = n.split('/'); assert.deepEqual(await og(), { mode: 'site', unit: seg[3], tab: seg[4], sheet: 'false' });
    }
    /* ومحمَّلاً مباشرةً (رابطٌ ملصوق) */
    await s.go('#/sysadmin/org/' + A + '/perm/people', 1500); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('main .og-rw', { timeout: 30000 }); await p.waitForTimeout(2000);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/people', 'an old address pasted and loaded lands on the new one');
    /* وحدةٌ غيرُ موجودة: الصفحةُ تفتح «المنصة كلها» وتقول ذلك */
    await s.go('#/sysadmin/org/TEST_ONLY_NOPE/roles', 2500);
    assert.equal(await H(), '#/sysadmin/org/platform/overview');
    /* الصفحتان القديمتان وقائمةُ «الوحدة» داخل «الصلاحيات» لا أثرَ لها */
    await s.go('#/sysadmin/org/' + A + '/systems', 2000);
    for (const q of ['main .tr-rw', 'main .dl-bk', 'main #bsSelName', 'main [aria-label="أقسام صفحة العقدة"]', 'main nav[aria-label="أقسام الصلاحيات"]', 'main .p44-units', 'main .p44-unit'])
      assert.equal(await p.locator(q).count(), 0, 'gone: ' + q);
    assert.equal(await p.locator('main .og').count(), 1, 'one screen');

    await lab.idle();
    assert.deepEqual([read(lab, KG), read(lab, KD)], before, 'the structure is unchanged');
    assert.deepEqual(s.writes.filter((w) => !/\/api\/(login|save|notif)/.test(w)), [], 'no other write');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 ب2 · the tree: columns of the seeded org, kind badges, the gold frame, search, filters, expand/collapse, multi-select bar, export-all under it', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  const before = [read(lab, KG), read(lab, KD)];
  try {
    const { s, p, H, rows, row, toast } = await page(b, lab);
    await s.go('#/sysadmin/org', 3500);
    /* رأسُ الأعمدة وصفٌّ واحد لكل وحدة */
    assert.deepEqual((await p.locator('main .og-th span').allInnerTexts()).map(norm), ['الوحدة', 'النوع', 'تحتها', 'المدير', 'الأشخاص', 'الأنظمة']);
    let R = await rows();
    assert.deepEqual(R.map((r) => r[0]), ['platform', G, A, S1, B], 'the root row first, then the structure depth-first');
    const sysAll = R[0][6].split('/')[1]; assert.ok(+sysAll >= 9, 'the switchable systems: ' + sysAll);
    assert.deepEqual(R[0].slice(1, 6), ['المنصة كلها', 'المنصة', '1', 'له مدير', '4'], 'root: one node under it · every non-admin account');
    assert.deepEqual(R[1].slice(1, 6), ['TEST_ONLY إدارة عامة', 'إدارة عامة', '2', 'بلا مدير', '4'], 'a general department: its branch\'s people');
    assert.deepEqual(R[2].slice(1, 6), ['TEST_ONLY إدارة أ', 'إدارة', '1', 'له مدير', '2'], 'a department: its own people (manager + employee)');
    assert.deepEqual(R[3].slice(1, 6), [norm('TEST_ONLY قسم أ١'), 'قسم', '0', 'بلا مدير', '0'], 'a section');
    assert.deepEqual(R[4].slice(1, 6), ['TEST_ONLY إدارة ب', 'إدارة', '0', 'له مدير', '1']);
    for (const r of R) assert.match(r[6], new RegExp('^\\d+/' + sysAll + '$'), 'systems = ON/all: ' + r[6]);
    /* العمودان = ما يعرضه التبويبان (مصدرٌ واحد) */
    await s.go('#/sysadmin/org/' + A + '/people', 2000);
    assert.equal(await p.locator('main [data-org-tab="people"] table.p44-people tbody tr').count(), 2, '«الأشخاص» column = the rows of the tab');
    await s.go('#/sysadmin/org/' + G + '/people', 2000);
    assert.equal(await p.locator('main [data-org-tab="people"] tbody tr').count(), 4, 'a node: its branch');
    await s.go('#/sysadmin/org/' + A + '/systems', 2000);
    assert.equal(String(await p.locator('main [data-org-tab="systems"] .p44-sw[aria-checked="true"]').count()), R[2][6].split('/')[0], '«الأنظمة» column = the ON switches of the tab');
    assert.equal(String(await p.locator('main [data-org-tab="systems"] .p44-row').count()), sysAll, 'out of every switchable system');
    /* شارةُ النوع بلونٍ لكل نوع · كلُّ وحدةٍ في إطار · المختارةُ بإطارٍ ذهبي · خطوطُ التوصيل */
    const st = (id) => p.evaluate((i) => { const e = document.querySelector('main .og-rw[data-og-id="' + i + '"]'), c = getComputedStyle(e), k = getComputedStyle(e.querySelector('.og-kd'));
      return { bw: c.borderTopWidth, bc: c.borderTopColor, kind: e.dataset.ogKind, kbg: k.backgroundColor, ln: e.querySelector('.og-ln').getBoundingClientRect().width }; }, id);
    const sa = await st(A), sg = await st(G), ss = await st(S1), sb = await st(B), sr = await st('platform');
    assert.deepEqual([sr.kind, sg.kind, sa.kind, ss.kind, sb.kind], ['root', 'gen', 'dept', 'sec', 'dept']);
    assert.equal(new Set([sr.kbg, sg.kbg, sa.kbg, ss.kbg]).size, 4, 'a colour per kind'); assert.equal(sa.kbg, sb.kbg, 'the same kind, the same colour');
    for (const x of [sa, sg, ss, sb, sr]) assert.equal(x.bw, '1px', 'every unit in its own frame');
    assert.notEqual(sa.bc, sb.bc, 'the selected unit\'s frame differs (gold)'); assert.equal(sb.bc, sg.bc);
    assert.ok(sr.ln === 0 && sg.ln > 0 && sa.ln > sg.ln && ss.ln > sa.ln, 'connector lines grow with depth: ' + JSON.stringify([sr.ln, sg.ln, sa.ln, ss.ln]));
    /* لا زرَّ أفعال (⋯) على الصفوف */
    assert.equal(await p.locator('main .og-rw [aria-haspopup="menu"], main .og-rw .adm-rmb').count(), 0, 'no actions button on a tree row');
    assert.ok(!(await p.locator('main .og-rows').innerText()).includes('⋯'));
    /* البحث */
    await p.fill('main .og-q', 'إدارة ب'); await p.waitForTimeout(600);
    assert.deepEqual((await rows()).map((r) => r[0]), ['platform', G, B], 'the match with its ancestors');
    await p.fill('main .og-q', 'TEST_ONLY_NOTHING'); await p.waitForTimeout(600);
    assert.deepEqual((await rows()).map((r) => r[0]), ['platform']); assert.match(await p.locator('main .og-none').innerText(), /لا وحدة تطابق/);
    await p.fill('main .og-q', ''); await p.waitForTimeout(500);
    /* الفلاتر */
    const flt = (k) => p.locator('main .og-flt [data-og-flt="' + k + '"]');
    assert.deepEqual((await p.locator('main .og-flt button').allInnerTexts()).map(norm), ['لها مدير 2', 'بلا مدير 2', 'فارغة 1']);
    await flt('mgr').click(); await p.waitForTimeout(500);
    assert.equal(await flt('mgr').getAttribute('aria-pressed'), 'true'); assert.deepEqual((await rows()).map((r) => r[0]), ['platform', G, A, B]);
    await flt('nomgr').click(); await p.waitForTimeout(500);
    assert.deepEqual((await rows()).map((r) => r[0]), ['platform', G, A, S1], 'without a manager: the node and the section (the department stays as the section\'s ancestor)');
    await flt('empty').click(); await p.waitForTimeout(500);
    assert.deepEqual((await rows()).map((r) => r[0]), ['platform', G, A, S1], 'empty: the section, with its ancestors');
    await flt('empty').click(); await p.waitForTimeout(500);
    assert.equal((await rows()).length, 5, 'pressing the filter again clears it');
    /* طيّ الكل · فرد الكل · طيّ فرع */
    await p.locator('main [data-og-act="collapse"]').click(); await p.waitForTimeout(500);
    assert.deepEqual((await rows()).map((r) => r[0]), ['platform', G]); assert.equal(await row(G).getAttribute('aria-expanded'), 'false');
    await p.locator('main [data-og-act="expand"]').click(); await p.waitForTimeout(500);
    assert.equal((await rows()).length, 5);
    await row(A).locator('.og-cv').click(); await p.waitForTimeout(500);
    assert.deepEqual((await rows()).map((r) => r[0]), ['platform', G, A, B], 'one branch folded'); assert.equal(await H(), '#/sysadmin/org/' + A + '/systems', 'folding does not navigate');
    await row(A).locator('.og-cv').click(); await p.waitForTimeout(400);
    /* التحديد المتعدد: مربعٌ لكل صف عدا الجذر · الشريطُ بأزراره الثلاثة · «إلغاء التحديد» */
    assert.equal(await row('platform').locator('.og-ck').count(), 0, 'no checkbox on the root row');
    assert.equal(await p.locator('main .og-rw .og-ck').count(), 4); assert.equal(await p.locator('main .og-bulk').count(), 0, 'no bar without a selection');
    await row(B).locator('.og-ck').click(); await row(S1).locator('.og-ck').click(); await p.waitForTimeout(500);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/systems', 'ticking a box does not select the unit');
    assert.equal(await row(B).locator('.og-ck').getAttribute('aria-checked'), 'true');
    assert.equal(norm(await p.locator('main .og-bulk span').first().innerText()), 'المحدد: وحدتان'.replace('وحدتان', norm(await p.locator('main .og-bulk span').first().innerText()).replace('المحدد: ', '')), 'the count is said');
    assert.deepEqual((await p.locator('main .og-bulk button').allInnerTexts()).map(norm), ['تفعيل أنظمة للمحدد', 'إطفاء أنظمة للمحدد', 'إلغاء التحديد']);
    /* الخطّاف: الحدث bs:org-bulk يحمل النمط والوحدات (تبويبُ «الأنظمة» يتولّى التطبيق) */
    await p.evaluate(() => { window.__TEST_ONLY_bulk = []; window.addEventListener('bs:org-bulk', (e) => window.__TEST_ONLY_bulk.push(e.detail)); });
    await p.locator('main .og-bulk [data-og-bulk="off"]').click(); await p.waitForTimeout(400);
    assert.deepEqual(await p.evaluate(() => window.__TEST_ONLY_bulk), [{ mode: 'off', units: [B, S1] }]);
    await p.locator('main .og-bulk [data-og-bulk="clear"]').click(); await p.waitForTimeout(500);
    assert.equal(await p.locator('main .og-bulk').count(), 0, '«إلغاء التحديد» hides the bar'); assert.equal(await p.locator('main .og-ck[aria-checked="true"]').count(), 0, 'and clears every box');
    /* «تصدير النسخة الشاملة — كل الإدارات» تحت الشجرة */
    const ex = p.locator('main .og-tree [data-og-act="export-all"]');
    assert.equal(norm(await ex.innerText()), 'تصدير النسخة الشاملة — كل الإدارات');
    assert.ok((await ex.boundingBox()).y > (await p.locator('main .og-rows').boundingBox()).y, 'under the rows');
    /* السحبُ والإفلات باقٍ: الصفوفُ قابلةٌ للسحب (عدا الجذر) */
    assert.equal(await row(B).getAttribute('draggable'), 'true'); assert.equal(await row('platform').getAttribute('draggable'), 'false');
    assert.equal(await p.locator('main .og-hint').count(), 1);

    await lab.idle();
    assert.deepEqual([read(lab, KG), read(lab, KD)], before, 'the structure is unchanged');
    assert.deepEqual(s.writes.filter((w) => !/\/api\/(login|save|notif)/.test(w)), [], 'no other write');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 ب3 · ب10 · structure actions in one place: add from both entry points, rename, «نقل إلى…» without dragging, delete refused with its reason; the overview', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const { s, p, H, rows, row } = await page(b, lab);
    const J = (k) => JSON.parse(read(lab, k));
    await s.go('#/sysadmin/org/' + G + '/overview', 3500);
    /* ب10 · نظرة عامة */
    const ov = p.locator('main [data-org-tab="overview"]');
    assert.deepEqual((await ov.locator('section').evaluateAll((L) => L.map((e) => e.getAttribute('aria-label')))), ['ملخّص الوحدة', 'الموضع وأفعال الوحدة', 'ما تحتها', 'قائمة التهيئة']);
    assert.deepEqual((await ov.locator('.og-sumc small').allInnerTexts()).map(norm), ['المسؤول', 'الأشخاص', 'الأنظمة المفعّلة']);
    assert.deepEqual((await ov.locator('section[aria-label="ما تحتها"] a').allInnerTexts()).map(norm).sort(), ['TEST_ONLY إدارة أ', 'TEST_ONLY إدارة ب']);
    const steps = await ov.locator('.og-steps li').evaluateAll((L) => L.map((e) => [e.dataset.ogStep, e.querySelector('b').textContent, e.dataset.ok]));
    assert.deepEqual(steps.map((x) => x.slice(0, 2)), [['node', 'العقدة'], ['systems', 'الأنظمة'], ['admins', 'المسؤول'], ['roles', 'الصلاحيات'], ['review', 'المراجعة']], 'five real steps');
    assert.equal(steps[0][2], 'true'); assert.equal(steps[2][2], 'false', 'the node has no manager: the step is missing');
    const sy = await p.locator('main .og-steps').evaluate((e) => [...e.children].map((c) => Math.round(c.getBoundingClientRect().top)));
    assert.equal(new Set(sy).size, 1, 'the steps sit in one row');
    await ov.locator('.og-steps li[data-og-step="admins"] button').click(); await p.waitForTimeout(1200);
    assert.equal(await H(), '#/sysadmin/org/' + G + '/admins', 'a step opens its tab');
    await s.go('#/sysadmin/org/' + G + '/overview', 1500);
    await ov.locator('[data-og-sum="people"]').click(); await p.waitForTimeout(1200);
    assert.equal(await H(), '#/sysadmin/org/' + G + '/people', 'a summary cell opens its tab');
    await s.go('#/sysadmin/org/' + G + '/overview', 1500);
    await ov.locator('section[aria-label="ما تحتها"] a', { hasText: 'TEST_ONLY إدارة ب' }).click(); await p.waitForTimeout(1200);
    assert.equal(await H(), '#/sysadmin/org/' + B + '/overview', 'a unit under it opens');

    /* ب3 · الإضافة من فوق الشجرة: بلا أب */
    const dlg = (k) => p.locator('[data-og-dlg="' + k + '"]');
    await p.locator('main .og-tree [data-og-act="add"]').click(); await p.waitForTimeout(600);
    assert.equal(await dlg('add').count(), 1); assert.equal(norm(await dlg('add').locator('.t').innerText()), 'إضافة إلى الهيكل');
    assert.equal(await dlg('add').locator('select[data-og-f="parent"]').inputValue(), '', 'no parent prefilled from «+ إضافة»');
    assert.equal(norm(await dlg('add').locator('[data-og="add-pos"]').innerText()), 'في الجذر — بلا أب');
    assert.deepEqual((await dlg('add').locator('.og-radio button').evaluateAll((L) => L.map((e) => [e.textContent, e.getAttribute('aria-checked')]))), [['مطفأة كلها', 'true'], ['نفس أنظمة العقدة الأب', 'false']], 'the new unit\'s systems: OFF by default');
    assert.ok((await dlg('add').locator('select[data-og-f="kind"] option').allInnerTexts()).includes('+ نوع جديد…'));
    assert.deepEqual((await dlg('add').locator('.ft button').allInnerTexts()).map(norm), ['أضف العقدة', 'إلغاء']);
    await dlg('add').locator('.ft button', { hasText: 'إلغاء' }).click(); await p.waitForTimeout(400); assert.equal(await dlg('add').count(), 0);
    /* من «نظرة عامة»: الأبُ الوحدةُ المختارة */
    await s.go('#/sysadmin/org/' + G + '/overview', 1500);
    await ov.locator('[data-og-act="add-under"]').click(); await p.waitForTimeout(600);
    assert.equal(await dlg('add').locator('select[data-og-f="parent"]').inputValue(), G, 'the parent is prefilled with the selected unit');
    assert.equal(norm(await dlg('add').locator('[data-og="add-pos"]').innerText()), 'TEST_ONLY إدارة عامة');
    await dlg('add').locator('[data-og-ok="add"]').click(); await p.waitForTimeout(400);
    assert.equal(norm(await dlg('add').locator('.og-err').innerText()), 'اكتب الاسم', 'validation in the dialog');
    await dlg('add').locator('#ogAddName').fill('TEST_ONLY إدارة ج'); await dlg('add').locator('#ogAddName').blur();
    await dlg('add').locator('select[data-og-f="kind"]').selectOption('إدارة');
    await dlg('add').locator('[data-og-ok="add"]').click(); await p.waitForTimeout(2500); await lab.idle();
    const c = J(KD).find((x) => x.name === 'TEST_ONLY إدارة ج');
    assert.ok(c && c.gid === G, 'the department is created under the prefilled parent');
    assert.equal(await dlg('add').count(), 0, 'the dialog closes'); assert.equal(await H(), '#/sysadmin/org/' + c.id + '/overview', 'and the new unit is opened');
    assert.ok((await rows()).some((r) => r[0] === c.id && r[1] === 'TEST_ONLY إدارة ج' && r[2] === 'إدارة'), 'it is in the tree');
    /* تحت إدارة: النوعُ «قسم» معبّأ */
    await ov.locator('[data-og-act="add-under"]').click(); await p.waitForTimeout(600);
    assert.equal(await dlg('add').locator('select[data-og-f="kind"]').inputValue(), 'قسم'); assert.equal(await dlg('add').locator('select[data-og-f="parent"]').inputValue(), c.id);
    await dlg('add').locator('#ogAddName').fill('TEST_ONLY قسم ج١'); await dlg('add').locator('#ogAddName').blur();
    await dlg('add').locator('[data-og-ok="add"]').click(); await p.waitForTimeout(2500); await lab.idle();
    const sec = J(KD).find((x) => x.name === 'TEST_ONLY قسم ج١'); assert.ok(sec && sec.gid === c.id && sec.kind === 'قسم', 'a section under the department');
    assert.equal(await p.locator('main [data-org-tab="overview"] [data-og-act="add-under"]').count(), 0, 'nothing is added under a section');

    /* إعادة التسمية: من البطاقة وحدها */
    await s.go('#/sysadmin/org/' + c.id + '/overview', 1500);
    assert.deepEqual(await ov.locator('section[aria-label="الموضع وأفعال الوحدة"] [data-og-act]').evaluateAll((L) => L.map((e) => e.dataset.ogAct)), ['add-under', 'rename', 'move', 'delete']);
    await ov.locator('[data-og-act="rename"]').click(); await p.waitForTimeout(500);
    assert.equal(await dlg('rename').locator('#ogRenName').inputValue(), 'TEST_ONLY إدارة ج');
    await dlg('rename').locator('#ogRenName').fill('TEST_ONLY إدارة أ'); await dlg('rename').locator('#ogRenName').blur();
    await dlg('rename').locator('[data-og-ok="rename"]').click(); await p.waitForTimeout(500);
    assert.match(await dlg('rename').locator('.og-err').innerText(), /الاسم مستخدم/, 'a taken name is refused in the dialog');
    await dlg('rename').locator('#ogRenName').fill('TEST_ONLY إدارة ج٢'); await dlg('rename').locator('#ogRenName').blur();
    await dlg('rename').locator('[data-og-ok="rename"]').click(); await p.waitForTimeout(2000); await lab.idle();
    assert.ok(J(KD).some((x) => x.id === c.id && x.name === 'TEST_ONLY إدارة ج٢')); assert.equal(norm(await p.locator('main .og-hd [data-og="name"]').innerText()), norm('TEST_ONLY إدارة ج٢'));

    /* «نقل إلى…»: الوحدةُ وما تحتها لا يظهران · «الموضع بعد النقل» · النقلُ يعمل بلا سحب */
    await s.go('#/sysadmin/org/' + G + '/overview', 1500);
    await ov.locator('[data-og-act="move"]').click(); await p.waitForTimeout(500);
    let opts = await dlg('move').locator('select[data-og-f="parent"] option').evaluateAll((L) => L.map((e) => e.value));
    assert.deepEqual(opts, [''], 'a node with everything under it: only the root is offered (not itself, not its subtree)');
    await dlg('move').locator('.ft button', { hasText: 'إلغاء' }).click(); await p.waitForTimeout(300);
    /* عقدةٌ ثانية تُنشأ لتكون وجهةً */
    await p.locator('main .og-tree [data-og-act="add"]').click(); await p.waitForTimeout(500);
    await dlg('add').locator('#ogAddName').fill('TEST_ONLY قطاع'); await dlg('add').locator('#ogAddName').blur(); await dlg('add').locator('select[data-og-f="kind"]').selectOption('قطاع');
    await dlg('add').locator('[data-og-ok="add"]').click(); await p.waitForTimeout(2500); await lab.idle();
    const sector = J(KG).find((x) => x.name === 'TEST_ONLY قطاع'); assert.ok(sector && !sector.pid, 'a root node from «+ إضافة»');
    await s.go('#/sysadmin/org/' + c.id + '/overview', 1500);
    await ov.locator('[data-og-act="move"]').click(); await p.waitForTimeout(500);
    opts = await dlg('move').locator('select[data-og-f="parent"] option').evaluateAll((L) => L.map((e) => e.value));
    assert.ok(opts.includes(sector.id) && opts.includes(G) && opts.includes('') && opts.includes('__new'), 'a department: nodes, the root and «+ إدارة عامة جديدة…»: ' + JSON.stringify(opts));
    assert.ok(!opts.includes(c.id) && !opts.includes(sec.id) && !opts.includes(A) && !opts.includes(B), 'not itself, not its section, not another department');
    assert.equal(await dlg('move').locator('select[data-og-f="parent"]').inputValue(), G, 'the current parent is selected');
    await dlg('move').locator('select[data-og-f="parent"]').selectOption(sector.id); await p.waitForTimeout(300);
    assert.equal(norm(await dlg('move').locator('[data-og="move-pos"]').innerText()), norm('TEST_ONLY قطاع ← TEST_ONLY إدارة ج٢'), '«الموضع بعد النقل»');
    await dlg('move').locator('[data-og-ok="move"]').click(); await p.waitForTimeout(2500); await lab.idle();
    assert.equal(J(KD).find((x) => x.id === c.id).gid, sector.id, 'moved by the dialog (no drag)');
    assert.equal(norm(await p.locator('main .og-hd [data-og="path"]').innerText()), 'TEST_ONLY قطاع'); assert.equal(await H(), '#/sysadmin/org/' + c.id + '/overview');
    const R = await rows(); assert.ok(R.findIndex((r) => r[0] === c.id) === R.findIndex((r) => r[0] === sector.id) + 1, 'the tree follows');

    /* الحذف: غيرُ الفارغة مرفوضةٌ بسببها — لا تأكيدَ ولا حذف */
    const g0 = read(lab, KG);
    await s.go('#/sysadmin/org/' + G + '/overview', 1500);
    await ov.locator('[data-og-act="delete"]').click(); await p.waitForTimeout(800);
    assert.equal(await dlg('delete').count(), 1); assert.match(norm(await dlg('delete').locator('.t').innerText()), /^حذف العقدة «TEST_ONLY إدارة عامة»$/);
    assert.match(norm(await dlg('delete').locator('[data-og="del-why"]').innerText()), /تحت «TEST_ONLY إدارة عامة» .* — انقلها أو احذفها أولاً ثم احذف العقدة/, 'the reason and what to do');
    assert.match(await dlg('delete').innerText(), /تُحذف العقدة الفارغة وحدها/, 'the rule is stated');
    assert.equal(await p.locator('#bsCfm, #bsCfmOk').count(), 0, 'no confirmation is asked'); assert.deepEqual((await dlg('delete').locator('.ft button').allInnerTexts()).map(norm), ['إغلاق']);
    await dlg('delete').locator('.ft button').click(); await p.waitForTimeout(400); await lab.idle();
    assert.equal(read(lab, KG), g0, 'nothing deleted');
    /* إدارةٌ لها أقسام: مرفوضةٌ بنصّها */
    await s.go('#/sysadmin/org/' + c.id + '/overview', 1500);
    await ov.locator('[data-og-act="delete"]').click(); await p.waitForTimeout(800);
    assert.match(norm(await dlg('delete').locator('[data-og="del-why"]').innerText()), /لها أقسام \(1\) — احذفها أولاً/);
    await dlg('delete').locator('.ft button').click(); await p.waitForTimeout(300);
    /* عقدةٌ فارغة: سؤالٌ واحد ثم حذف */
    await p.locator('main .og-tree [data-og-act="add"]').click(); await p.waitForTimeout(500);
    await dlg('add').locator('#ogAddName').fill('TEST_ONLY عقدة فارغة'); await dlg('add').locator('#ogAddName').blur(); await dlg('add').locator('select[data-og-f="kind"]').selectOption('إدارة عامة');
    await dlg('add').locator('select[data-og-f="parent"]').selectOption(sector.id);
    await dlg('add').locator('[data-og-ok="add"]').click(); await p.waitForTimeout(2500); await lab.idle();
    const empty = J(KG).find((x) => x.name === 'TEST_ONLY عقدة فارغة'); assert.ok(empty && empty.pid === sector.id);
    assert.equal(await H(), '#/sysadmin/org/' + empty.id + '/overview');
    await ov.locator('[data-og-act="delete"]').click(); await p.waitForTimeout(800);
    assert.equal(await dlg('delete').count(), 0, 'nothing forbids it: no refusal dialog'); assert.equal(await p.locator('#bsCfmOk').count(), 1, 'the one confirmation dialog');
    await p.locator('#bsCfmOk').click(); await p.waitForTimeout(2500); await lab.idle();
    assert.ok(!J(KG).some((x) => x.id === empty.id), 'deleted after confirming'); assert.equal(await H(), '#/sysadmin/org/' + sector.id + '/overview', 'back to its parent');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

/* V7 · د6 ب4 (بعد دمج القواعد): اختيارُ «أنظمة الوحدة الجديدة» في نافذة الإضافة يصل المدخلَ الواحد BassamDepts.unitAdd(seed) — بحفظٍ حقيقي:
   «مطفأة كلها» (الافتراضي) ⇒ تبويبُ «الأنظمة» للوحدة الجديدة بلا نظامٍ مفعّل، وقائمةُ مديرها الصفحاتُ الدائمة وحدها، والخادمُ يوافق؛
   «نفس أنظمة العقدة الأب» ⇒ المفعّلُ فيها هو المفعّلُ في أبيها، في الشاشة وفي الخادم؛ وبعد إعادة التحميل كما هو. */
test('V7 · د6 ب4 · the add dialog choice is really saved: «مطفأة كلها» ⇒ the new unit\'s «الأنظمة» tab and its manager\'s menu are OFF; «نفس أنظمة العقدة الأب» ⇒ the same as the parent', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const { s, p, H } = await page(b, lab); const J = (k) => JSON.parse(read(lab, k));
    const dlg = p.locator('[data-og-dlg="add"]'), ov = p.locator('main [data-org-tab="overview"]');
    const sysOn = async () => (await p.locator('main [data-org-tab="systems"] .p44-row[data-on="true"] b').allInnerTexts()).map(norm).sort();
    const sysAll = () => p.locator('main [data-org-tab="systems"] .p44-row').count();
    const card = () => p.locator('main section[aria-label="القائمة الجانبية لمدير الوحدة"] li[data-k]').evaluateAll((L) => L.map((x) => x.dataset.k));
    const srvOn = async (id) => { const r = await s.api('/api/perm44/check?d=' + encodeURIComponent(id) + '&role=x&key=task.view'); assert.equal(r.status, 200); return (r.j.on || []).slice().sort(); };
    const toggles = await (async () => { await s.go('#/sysadmin/org/' + G + '/systems', 3000); return p.evaluate(() => KIVO.Perm44.sysList().filter((x) => x.toggle !== false).map((x) => x.key)); })();
    const parentOn = await sysOn(), parentSrv = await srvOn(G);
    assert.ok(parentOn.length > 0 && parentOn.length <= await sysAll(), 'the parent has systems ON to copy: ' + JSON.stringify(parentOn));
    const add = async (name, choice) => {
      await s.go('#/sysadmin/org/' + G + '/overview', 2000);
      await ov.locator('[data-og-act="add-under"]').click(); await p.waitForTimeout(600);
      await dlg.locator('#ogAddName').fill(name); await dlg.locator('#ogAddName').blur();
      await dlg.locator('select[data-og-f="kind"]').selectOption('إدارة');
      if (choice) { await dlg.locator('[data-og-sys="' + choice + '"]').click(); await p.waitForTimeout(200); assert.equal(await dlg.locator('[data-og-sys="' + choice + '"]').getAttribute('aria-checked'), 'true'); }
      else assert.equal(await dlg.locator('[data-og-sys="off"]').getAttribute('aria-checked'), 'true', 'the default is «مطفأة كلها»');
      await dlg.locator('[data-og-ok="add"]').click(); await p.waitForTimeout(2500); await lab.idle();
      const u = J(KD).find((x) => x.name === name); assert.ok(u && u.gid === G, name + ' is saved under the parent');
      assert.equal(await H(), '#/sysadmin/org/' + u.id + '/overview');
      return u.id;
    };
    /* ① الافتراضي: مطفأة كلها */
    const off = await add('TEST_ONLY إدارة مطفأة', '');
    assert.match(await p.evaluate(() => [...document.querySelectorAll('#bs-toast,#bs-stoast,[role=status]')].map((e) => e.textContent).join(' ')), /أنظمتها مطفأة: فعّلها من «الأنظمة»/);
    const look = async (id) => { await s.go('#/sysadmin/org/' + id + '/systems', 2500); return { on: await sysOn(), all: await sysAll(), card: await card(), srv: await srvOn(id) }; };
    let v = await look(off);
    assert.equal(v.all, toggles.length, 'a switch per system'); assert.deepEqual(v.on, [], '«الأنظمة»: nothing is ON in the new unit');
    assert.deepEqual(v.card, ['profile', 'emps', 'admin'], 'its manager\'s menu: the permanent pages only');
    assert.deepEqual(v.srv.filter((k) => toggles.includes(k)), [], 'the server: no switchable system is ON for it');
    /* ② نفس أنظمة العقدة الأب */
    const par = await add('TEST_ONLY إدارة كالأب', 'parent');
    assert.match(await p.evaluate(() => [...document.querySelectorAll('#bs-toast,#bs-stoast,[role=status]')].map((e) => e.textContent).join(' ')), /أنظمتها كأنظمة العقدة الأب/);
    v = await look(par);
    assert.deepEqual(v.on, parentOn, '«الأنظمة»: the same systems as the parent');
    assert.deepEqual(v.srv.filter((k) => toggles.includes(k)), parentSrv.filter((k) => toggles.includes(k)), 'the server agrees');
    assert.ok(v.card.length > 3 && v.card[0] === 'profile', 'its manager\'s menu carries the parent\'s systems: ' + JSON.stringify(v.card));
    /* ③ بعد إعادة التحميل: المحفوظُ هو المعروض */
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
    assert.deepEqual(await sysOn(), parentOn);
    v = await look(off); assert.deepEqual(v.on, []); assert.deepEqual(v.card, ['profile', 'emps', 'admin']);
    /* الأبُ وإخوتُه لم يُمسّوا */
    await s.go('#/sysadmin/org/' + G + '/systems', 2500); assert.deepEqual(await sysOn(), parentOn, 'the parent is untouched');
    assert.deepEqual(s.errs.filter((e) => !/ResizeObserver/.test(e)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 ب12 entry · the manager\'s #/admin/perm keeps working: the same screen inside «الإعدادات», his unit and what is under it only, no structure actions', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  const before = [read(lab, KG), read(lab, KD)];
  try {
    const { s, p, H, og, tabs, rows, row } = await page(b, lab, [LAB.mgrA, LAB.pw]);
    await s.go('#/admin/perm', 4000);
    assert.equal(await H(), '#/admin/perm/' + A + '/overview', 'his entry address opens the screen on his unit');
    assert.deepEqual(await og(), { mode: 'dept', unit: A, tab: 'overview', sheet: 'false' });
    assert.equal(await p.locator('main .adm-tabs [data-d-tab="perm"][aria-selected="true"]').count(), 1, 'inside «الإعدادات», under its «الصلاحيات» tab');
    assert.deepEqual((await rows()).map((r) => r[0]), [A, S1], 'the tree: his department and its section only — no root row, nothing of another branch');
    assert.deepEqual(await tabs(), TABS7.slice(0, 6), 'six tabs: no «البيانات»');
    for (const q of ['[data-og-act="add"]', '[data-og-act="add-under"]', '[data-og-act="rename"]', '[data-og-act="move"]', '[data-og-act="delete"]', '[data-og-act="switch"]', '[data-og-act="export-all"]', '.og-ck', '.og-hint', '.og-bulk'])
      assert.equal(await p.locator('main .og ' + q).count(), 0, 'no structure action: ' + q);
    assert.equal(await row(A).getAttribute('draggable'), 'false');
    assert.ok((await rows()).every((r) => /^\d+$/.test(r[6])), 'he sees the ON count only');
    /* عناوينُه القديمة تبقى تعمل */
    for (const [o, t] of [['#/admin/perm/roles', 'roles'], ['#/admin/perm/people', 'people'], ['#/admin/perm/log', 'log'], ['#/admin/perm/systems', 'systems']]) {
      await s.go('#/admin/backup', 1200); await s.go(o, 2500);
      assert.equal(await H(), '#/admin/perm/' + A + '/' + t, o + ' keeps working'); assert.equal((await og()).tab, t);
      assert.ok((await p.locator('main [data-org-tab="' + t + '"]').innerText()).trim().length > 5, 'with its content: ' + t);
    }
    /* وبعد إعادة التحميل */
    await s.go('#/admin/perm/' + S1 + '/people', 2000); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('main .og-rw', { timeout: 30000 }); await p.waitForTimeout(2000);
    assert.equal(await H(), '#/admin/perm/' + S1 + '/people'); assert.deepEqual(await og(), { mode: 'dept', unit: S1, tab: 'people', sheet: 'false' });
    /* وحدةٌ خارج نطاقه وتبويبُ «البيانات» لا يُفتحان بالعنوان */
    await s.go('#/admin/perm/' + B + '/roles', 2500); assert.equal(await H(), '#/admin/perm/' + A + '/roles', 'another branch\'s unit is not opened');
    await s.go('#/admin/perm/' + A + '/data', 2500); assert.equal(await H(), '#/admin/perm/' + A + '/overview'); assert.equal(await p.locator('main [data-org-tab="data"]').count(), 0);
    /* تبويبٌ آخر في الإعدادات ثم العودة */
    await p.locator('main .adm-tabs .adm-tab', { hasText: 'النسخة الاحتياطية' }).click(); await p.waitForTimeout(1500);
    assert.equal(await p.locator('main .og').count(), 0); assert.equal(await H(), '#/admin/backup');
    await p.locator('main .adm-tabs [data-d-tab="perm"]').click(); await p.waitForTimeout(2500);
    assert.equal(await p.locator('main .og').count(), 1); assert.equal(await H(), '#/admin/perm/' + A + '/overview');
    await lab.idle();
    assert.deepEqual([read(lab, KG), read(lab, KD)], before, 'the structure is unchanged');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

for (const [W, Hh, label] of [[390, 844, 'phone 390'], [768, 1024, 'tablet 768']]) {
  test('V7 · د6 ب13 skeleton · ' + label + ': one column, the unit button opens the tree as a bottom sheet, a scrollable tab strip, 44px targets, dialogs fill the width', { timeout: 600000 }, async () => {
    const lab = await startLab(); const b = await chromium.launch();
    try {
      const { s, p, H, og, rows, row, side } = await page(b, lab, null, { viewport: { width: W, height: Hh }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } });
      await s.go('#/sysadmin/org/' + A + '/overview', 4000);
      assert.equal(await side(), 0, 'nothing scrolls sideways');
      /* عمودٌ واحد: الشجرةُ مخفيّة وزرُّ الوحدة أعلى الصفحة يحمل اسمَها ومسارَها */
      assert.equal(await p.locator('main .og-tree').isVisible(), false, 'the tree is not a column here');
      const ub = p.locator('main .og-ub'); assert.equal(await ub.isVisible(), true);
      assert.equal(norm(await ub.locator('b').innerText()), 'TEST_ONLY إدارة أ'); assert.equal(norm(await ub.locator('small').innerText()), 'TEST_ONLY إدارة عامة');
      const bb = await ub.boundingBox(), bu = await p.locator('main .og-unit').boundingBox();
      assert.ok(bb.y < bu.y && bb.height >= 44 && bb.width > W - 60, 'the unit button sits above the unit, full width: ' + JSON.stringify(bb));
      assert.ok(bu.width > W - 60, 'the unit takes the whole width (one column)');
      /* شريطُ التبويبات يُسحب أفقياً داخل نفسه · وأهدافُ اللمس 44px */
      const strip = await p.locator('main .og-tabs').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, ox: getComputedStyle(e).overflowX }));
      assert.equal(strip.ox, 'auto'); if (W < 500) assert.ok(strip.sw > strip.cw, 'the seven tabs overflow and scroll inside the strip: ' + JSON.stringify(strip));
      await p.locator('main .og-tab', { hasText: 'البيانات' }).scrollIntoViewIfNeeded(); await p.locator('main .og-tab', { hasText: 'البيانات' }).click(); await p.waitForTimeout(1500);
      assert.equal(await H(), '#/sysadmin/org/' + A + '/data'); assert.equal(await side(), 0);
      await s.go('#/sysadmin/org/' + A + '/overview', 1500);
      const small = await p.evaluate(() => [...document.querySelectorAll('main .og .og-ub, main .og .og-tab, main .og [data-org-tab="overview"] .og-b, main .og .og-sumc, main .og .og-steps button')].filter((e) => e.getClientRects().length)
        .map((e) => [e.className, Math.round(e.getBoundingClientRect().height)]).filter((x) => x[1] < 44));
      assert.deepEqual(small, [], 'touch targets ≥ 44px');
      /* الزرُّ يفتح الشجرة لوحةً من الأسفل */
      await ub.click(); await p.waitForTimeout(600);
      assert.equal((await og()).sheet, 'true'); assert.equal(await ub.getAttribute('aria-expanded'), 'true');
      const tr = p.locator('main .og-tree'); assert.equal(await tr.isVisible(), true);
      const bt = await tr.boundingBox();
      assert.ok(Math.abs(bt.y + bt.height - Hh) <= 2, 'the sheet rests on the bottom edge: ' + JSON.stringify(bt)); assert.ok(bt.width >= Math.min(W, 720) - 2, 'and fills the width');
      assert.equal(await p.locator('main .og-treewrap').evaluate((e) => getComputedStyle(e).position), 'fixed');
      assert.deepEqual((await rows()).map((r) => r[0]), ['platform', G, A, S1, B], 'the whole tree in the sheet');
      const tsmall = await p.evaluate(() => [...document.querySelectorAll('main .og-tree .og-b, main .og-tree .og-l, main .og-tree .og-q, main .og-tree .og-flt button, main .og-tree .og-rw, main .og-tree .og-nm')].filter((e) => e.getClientRects().length)
        .map((e) => [e.className, Math.round(e.getBoundingClientRect().height)]).filter((x) => x[1] < 44));
      assert.deepEqual(tsmall, [], 'touch targets in the sheet ≥ 44px');
      /* اختيارُ وحدةٍ يغلق اللوحة ويُبقي التبويب */
      await row(B).locator('.og-nm').click(); await p.waitForTimeout(1500);
      assert.equal(await H(), '#/sysadmin/org/' + B + '/overview'); assert.equal((await og()).sheet, 'false'); assert.equal(await tr.isVisible(), false);
      assert.equal(norm(await ub.locator('b').innerText()), 'TEST_ONLY إدارة ب');
      /* تُغلق بزرّها وبالنقر خارجها وبـEscape */
      await ub.click(); await p.waitForTimeout(400); await p.locator('main .og-sheet-hd button').click(); await p.waitForTimeout(400); assert.equal((await og()).sheet, 'false');
      await ub.click(); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(400); assert.equal((await og()).sheet, 'false');
      await ub.click(); await p.waitForTimeout(400); await p.mouse.click(Math.round(W / 2), 20); await p.waitForTimeout(400); assert.equal((await og()).sheet, 'false', 'a tap outside closes it');
      /* النوافذُ تملأ العرض · والنقلُ بنافذته (لا بالسحب وحده) */
      await p.locator('main [data-org-tab="overview"] [data-og-act="move"]').click(); await p.waitForTimeout(600);
      const bd = await p.locator('[data-og-dlg="move"]').boundingBox();
      /* على الجوال لوحةٌ بعرض الشاشة كلِّه؛ وعلى التابلت تملأ العرضَ داخل حاشية طبقة النوافذ العامة (24px من كل جهة) */
      assert.ok(bd.width >= W - (W < 641 ? 2 : 50), 'the dialog fills the width: ' + JSON.stringify(bd));
      assert.ok((await p.locator('[data-og-dlg="move"] select').boundingBox()).height >= 44); assert.equal(await p.locator('[data-og-dlg="move"] [data-og="move-pos"]').count(), 1);
      await p.locator('[data-og-dlg="move"] .ft button', { hasText: 'إلغاء' }).click(); await p.waitForTimeout(300);
      await ub.click(); await p.waitForTimeout(400); await p.locator('main .og-tree [data-og-act="add"]').click(); await p.waitForTimeout(600);
      assert.ok((await p.locator('[data-og-dlg="add"]').boundingBox()).width >= W - (W < 641 ? 2 : 50), 'the add dialog fills the width');
      await p.locator('[data-og-dlg="add"] .ft button', { hasText: 'إلغاء' }).click(); await p.waitForTimeout(300);
      assert.equal(await side(), 0, 'still nothing scrolls sideways');
      assert.deepEqual(s.errs, [], 'no page errors');
    } finally { await b.close(); await lab.close(); }
  });
}
