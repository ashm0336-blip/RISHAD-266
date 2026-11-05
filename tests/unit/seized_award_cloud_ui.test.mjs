/* The actual module source and declared logicParts run in a browser VM.
   Synthetic identities/data; no cloud network and no persistent device store. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { parse } from 'acorn';
import { json, clock, bases, item, catalogDto, ack, waitFor, browser, seedForm, save, ROOT } from './business_cloud_ui_fx.mjs';

for (const module of ['seized', 'award']) {
  test(module + ' actual tab presentation hides unread panels and keeps a real denial visible', async t => {
    const B = browser(module, async () => json({ ok: 0, err: module + '-denied' }, 403)); t.after(B.cleanup);
    if (module === 'seized') B.page.props = { solo: 'dash' };
    const flags = module === 'seized' ? ['irOnDash', 'irOnRecords'] : ['awOnNew', 'awOnRes', 'awOnDoc'];
    for (const flag of flags) assert.equal(!!B.page.renderVals()[flag], false, flag + ' unread');
    await waitFor(() => B.page._bcReads?.get(module === 'seized' ? 'dashboard' : 'records')?.failed);
    const values = B.page.renderVals();
    for (const flag of flags) assert.equal(!!values[flag], false, flag + ' denied');
    assert.equal(values.bcNotice, true); assert.match(values.bcMessage, /صلاحيتك/);
  });

  test(module + ' a removed department blocks direct reads and saves while retaining the draft', async t => {
    const B = browser(module, async () => { throw Error('must not send an invalid scope'); }); t.after(B.cleanup);
    seedForm(B, module);
    const draft = JSON.stringify(B.page.state);
    B.KIVO.BassamDepts.has = () => false;
    assert.equal(B.page._bcContext(), null);
    assert.equal((await B.page._bcRead('records')).ok, 0);
    assert.equal((await B.page._bcMutate('create', {})).ok, 0);
    assert.equal(B.calls.length, 0);
    assert.equal(JSON.stringify(B.page.state), draft);
    assert.equal(B.page._bcData('records'), null);
  });

  test(module + ' unread, denied, failed, or inconsistent reads cannot render an empty success', async t => {
    const B = browser(module, async () => json({ ok: 0, err: module + '-denied' }, 403)); t.after(B.cleanup);
    const required = module === 'seized' ? ['catalogs', 'dashboard'] : ['records'];
    assert.equal(B.page._bcStatusVals(required).bcReady, false, 'unread is not empty');
    B.page._bcEnsure(required[0]);
    await waitFor(() => B.page._bcReads.get(required[0])?.done);
    const denied = B.page._bcStatusVals(required);
    assert.equal(denied.bcReady, false); assert.equal(denied.bcNotice, true);
    assert.match(denied.bcMessage, /صلاحيتك/);
    for (const view of required) B.seed(view);
    assert.equal(B.page._bcStatusVals(required).bcReady, true, 'confirmed empty reads are available');
    if (module === 'seized') {
      B.page.state.szDashboard.base.reports++;
      const mixed = B.page._bcStatusVals(required);
      assert.equal(mixed.bcReady, false); assert.equal(mixed.bcNotice, true);
    }
    B.page._bcInvalidate();
    assert.equal(B.page._bcStatusVals(required).bcReady, false, 'refresh cannot retain false empty success');
  });
}

test('award permitted references stay available independently of a denied records tab', async t => {
  const B = browser('award', async url => {
    const view = new URL(url, 'https://example.invalid').searchParams.get('view');
    return view === 'records' ? json({ ok: 0, err: 'award-denied' }, 403) : json({ ok: 1, dept: B.context().dept, view,
      base: B.base, scope: 'dept', references: { docsV1: { present: false }, docsV2: { present: false }, document: null } });
  }); t.after(B.cleanup);
  B.page.renderVals(); await waitFor(() => B.page._bcReads?.get('records')?.failed);
  assert.match(B.page.renderVals().bcMessage, /صلاحيتك/);
  B.page.state.awTab = 'doc'; B.page.renderVals();
  await waitFor(() => B.page._bcReads?.get('references')?.done);
  const doc = B.page.renderVals();
  assert.equal(doc.awOnDoc, true); assert.equal(doc.bcReady, true);
  assert.equal(doc.bcNotice, false, 'an unrelated read denial is not a document error');
  assert.equal(B.calls.filter(call => new URL(call.url, 'https://example.invalid').searchParams.get('view') === 'records').length, 1);
});

test('Seized build-only defaults exactly preserve the established pre-migration literals and the generated Worker defaults', () => {
  const old = execFileSync('git', ['show', '4d8ab1e:src/modules/seized/logic.js'], { cwd: ROOT, encoding: 'utf8' }),
    klass = parse(old, { ecmaVersion: 'latest' }).body.find(node => node.type === 'ClassDeclaration'),
    names = ['SZ_VER', 'SZ_DEF_CATS', 'SZ_DEF_ACTS', 'SZ_DEF_KINDS'], members = klass.body.body.filter(node => names.includes(node.key?.name));
  assert.equal(members.length, 4);
  const established = vm.runInNewContext('new (class {' + members.map(node => old.slice(node.start, node.end)).join('\n') + '})()'),
    expected = JSON.parse(JSON.stringify({ cats: established.SZ_DEF_CATS(), actions: established.SZ_DEF_ACTS, kinds: established.SZ_DEF_KINDS })),
    actual = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/modules/seized/defaults.json'), 'utf8'));
  assert.deepEqual(actual, expected);
  const output = execFileSync(process.execPath, [path.join(ROOT, 'tools/seized_defaults.mjs'), path.join(ROOT, 'src')], { encoding: 'utf8' }),
    generated = JSON.parse(/var SZ_DEFAULTS = (.+);/.exec(output)[1]);
  assert.deepEqual(generated, { catalog: { ver: established.SZ_VER, cats: expected.cats }, actions: expected.actions, kinds: expected.kinds });
});

test('seized cannot clear a record draft or claim success before a confirmed cloud ACK', async t => {
  const B = browser('seized', async () => { throw Error('TEST_ONLY response lost'); }); t.after(B.cleanup);
  B.seed('catalogs', catalogDto());
  B.seed('calendar', { total: 0, yearTotal: 0, months: [], days: [], monthTotals: { reports: 0, qty: 0, sar: 0, actions: {} } });
  const draft = { ...B.page.emptyDraft(), loc: 'TEST_ONLY_location', no: 'TEST_ONLY_record', items: [item()] };
  B.page.state.irDraft = draft;
  const result = await B.page.szSaveRec(draft);
  assert.equal(result, false);
  assert.equal(B.page.state.irDraft.items[0].n, 3);
  assert.equal(B.calls.filter(call => call.options.method === 'POST').length, 1);
  assert.equal(B.notices.some(value => /حُفظ|تم حفظ|تمت إضافة/.test(String(value))), false);
  assert.deepEqual(B.storage, []);
});

test('award cannot clear a nomination wizard or claim success before a confirmed cloud ACK', async t => {
  const B = browser('award', async () => { throw Error('TEST_ONLY response lost'); }); t.after(B.cleanup);
  B.seed('records', { recs: [], total: 0, filteredTotal: 0, page: 1, pageSize: 10, summary: { total: 0, eligible: 0, employeeScoreAverage: null, topScore: null, topRecord: null } });
  B.page.state.ekey = 'TEST_ONLY_employee'; B.page.state.cat = 'emp'; B.page.state.comp = 'TEST_ONLY_001';
  B.page.state.ans = B.page.QUESTIONS.map(() => true); B.page.state.fileOk = true;
  await B.page.awDoSave();
  assert.equal(B.page.state.ekey, 'TEST_ONLY_employee');
  assert.equal(B.calls.filter(call => call.options.method === 'POST').length, 1);
  assert.equal(B.notices.some(value => /حُفظ الترشيح/.test(String(value))), false);
  assert.deepEqual(B.storage, []);
});

for (const module of ['seized', 'award']) {
  test(module + ' explicit retry after a lost response reuses exactly the same id and body without automatic replay', async t => {
    let lost = true;
    const B = browser(module, async (_, options) => { if (lost) { lost = false; throw Error('TEST_ONLY lost ACK'); } return ack(module, JSON.parse(options.body)); }); t.after(B.cleanup);
    seedForm(B, module); await save(B.page, module);
    const wire = B.calls[0].options.body;
    await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(B.calls.length, 1);
    await save(B.page, module); assert.equal(B.calls.length, 2); assert.equal(B.calls[1].options.body, wire);
    assert.equal(B.page._bcTickets.size, 0); assert.deepEqual(B.storage, []);
  });

  test(module + ' incomplete or mismatched receipt leaves the same request uncertain and preserves the draft', async t => {
    for (const bad of [{ requestId: 'TEST_ONLY_wrong' }, { op: 'delete' }, { base: null }, { n: 0 }, { rev: '20' }, { id: null }]) {
      const B = browser(module, async (_, options) => ack(module, JSON.parse(options.body), bad)); t.after(B.cleanup);
      seedForm(B, module); await save(B.page, module);
      assert.equal(B.page._bcTickets.size, 1);
      assert.equal(module === 'award' ? B.page.state.ekey : B.page.state.irDraft.items[0].n, module === 'award' ? 'TEST_ONLY_employee' : 3);
      assert.equal(B.notices.some(value => /حُفظ الترشيح/.test(String(value))), false); assert.deepEqual(B.storage, []);
    }
  });

  test(module + ' changed department or identity during the HTTP request cannot accept a receipt or display old confirmed data', async t => {
    for (const changed of ['dept', 'user']) {
      let release;
      const B = browser(module, async (_, options) => new Promise(resolve => { release = () => resolve(ack(module, JSON.parse(options.body))); })); t.after(B.cleanup);
      seedForm(B, module); const pending = save(B.page, module); await waitFor(() => !!release);
      B[changed]('TEST_ONLY_other'); release(); await pending;
      assert.equal(B.page._bcTickets.size, 1); assert.equal(B.page._bcData(module === 'award' ? 'records' : 'calendar'), null);
      assert.equal(module === 'award' ? B.page.state.ekey : B.page.state.irDraft.items[0].n, module === 'award' ? 'TEST_ONLY_employee' : 3);
      assert.equal(B.notices.some(value => /حُفظ الترشيح/.test(String(value))), false); assert.deepEqual(B.storage, []);
    }
  });

  test(module + ' navigating away while the response is pending retains only a session draft and the exact explicit retry ticket', async t => {
    let release, pendingResponse = true;
    const B = browser(module, async (_, options) => pendingResponse ? new Promise(resolve => { release = () => resolve(ack(module, JSON.parse(options.body))); }) : ack(module, JSON.parse(options.body))); t.after(B.cleanup);
    seedForm(B, module); B.page.componentDidMount(); const pending = save(B.page, module); await waitFor(() => !!release);
    const wire = B.calls[0].options.body; B.page.componentWillUnmount(); release(); await pending;
    pendingResponse = false;
    const next = new B.W.TestComponent(); next.bsToast = value => B.notices.push(value); next.bsAck = next.bsToast;
    next.awEmpList = B.page.awEmpList; next.awKeyOf = B.page.awKeyOf; next.componentDidMount();
    assert.equal(module === 'award' ? next.state.ekey : next.state.irDraft.items[0].n, module === 'award' ? 'TEST_ONLY_employee' : 3);
    assert.equal(B.calls.length, 1, 'mount does not replay a mutation');
    await save(next, module); assert.equal(B.calls[1].options.body, wire); assert.equal(next._bcTickets.size, 0); assert.deepEqual(B.storage, []);
    next.componentWillUnmount();
  });

  test(module + ' permission refusal and CAS conflict preserve input and never schedule mutation replay', async t => {
    for (const status of [403, 409]) {
      const B = browser(module, async () => json({ ok: 0, err: status === 403 ? 'permission' : 'conflict' }, status)); t.after(B.cleanup);
      seedForm(B, module); await save(B.page, module); await new Promise(resolve => setTimeout(resolve, 5));
      assert.equal(B.calls.length, 1); assert.equal(B.page._bcTickets.size, 0);
      assert.equal(module === 'award' ? B.page.state.ekey : B.page.state.irDraft.items[0].n, module === 'award' ? 'TEST_ONLY_employee' : 3);
      assert.deepEqual(B.storage, []);
    }
  });

  test(module + ' remote/authz invalidation is scoped to its department and preserves the draft', t => {
    const B = browser(module, async () => { throw Error('TEST_ONLY no fetch'); }); t.after(B.cleanup);
    seedForm(B, module); B.page.componentDidMount();
    const view = module === 'award' ? 'records' : 'calendar', key = 'bassam_' + (module === 'award' ? 'award' : 'seized') + '_v1';
    const data = B.page._bcData(view);
    B.W.dispatchEvent({ type: 'bassam:remote', detail: { keys: ['bsdept:TEST_ONLY_other:' + key] } }); assert.equal(B.page._bcData(view), data);
    B.W.dispatchEvent({ type: 'bassam:remote', detail: { keys: ['bsdept:TEST_ONLY_department:' + key] } }); assert.equal(B.page._bcData(view), null);
    assert.equal(module === 'award' ? B.page.state.ekey : B.page.state.irDraft.items[0].n, module === 'award' ? 'TEST_ONLY_employee' : 3);
    B.page.componentWillUnmount(); assert.equal(B.events.get('bassam:remote').size, 0); assert.deepEqual(B.storage, []);
  });
}

test('a confirmed image is uploaded once before the seized command and is not uploaded again after a lost business ACK', async t => {
  const order = []; let lost = true;
  const B = browser('seized', async (_, options) => { order.push('command'); if (lost) { lost = false; throw Error('TEST_ONLY lost ACK'); } return ack('seized', JSON.parse(options.body)); }); t.after(B.cleanup);
  seedForm(B, 'seized'); B.page.state.irDraft.items[0].photos = ['TEST_ONLY_image'];
  B.page._szUploads = new Map([['TEST_ONLY_image', { url: 'data:image/jpeg;base64,TEST_ONLY', confirmed: false }]]);
  B.KIVO.BassamIDB = { async set() { order.push('image-confirmed'); return true; } };
  await save(B.page, 'seized'); await save(B.page, 'seized');
  assert.deepEqual(order, ['image-confirmed', 'command', 'command']); assert.equal(B.calls[0].options.body, B.calls[1].options.body);
  assert.equal(JSON.parse(B.calls[1].options.body).data.items[0].photos[0], 'TEST_ONLY_image'); assert.deepEqual(B.storage, []);
});

test('a rejected image ACK retains image bytes and prevents any seized record command', async t => {
  const B = browser('seized', async () => { throw Error('TEST_ONLY unexpected record command'); }); t.after(B.cleanup);
  seedForm(B, 'seized'); B.page.state.irDraft.items[0].photos = ['TEST_ONLY_image'];
  B.page._szUploads = new Map([['TEST_ONLY_image', { url: 'data:image/jpeg;base64,TEST_ONLY', confirmed: false }]]);
  B.KIVO.BassamIDB = { async set() { return false; } };
  assert.equal(await save(B.page, 'seized'), false); assert.equal(B.calls.length, 0); assert.equal(B.page._szUploads.get('TEST_ONLY_image').url, 'data:image/jpeg;base64,TEST_ONLY'); assert.deepEqual(B.storage, []);
});

test('seized ledger keeps SQL month totals and page positions, and Excel traverses the full filtered selection under the same base', async t => {
  const row = number => ({ id: 'TEST_ONLY_record_' + number, y: clock.y, m: clock.m, d: clock.d, ts: number, no: String(number), loc: 'TEST_ONLY_location', actor: 'TEST_ONLY_actor', items: [item()] });
  const B = browser('seized', async url => {
    const query = new URL(url, 'https://test.invalid').searchParams, second = !!query.get('cursor');
    return json({ ok: 1, dept: 'TEST_ONLY_department', view: 'records', clock, base: bases.seized, rows: second ? [row(2), row(3)] : [row(1)],
      total: 3, page: second ? 2 : 1, pageSize: 200, next: second ? '' : 'TEST_ONLY_next', prev: '', facets: { locations: ['TEST_ONLY_location', 'TEST_ONLY_other_location'] } });
  }); t.after(B.cleanup); seedForm(B, 'seized');
  B.page._bcEnsure = () => {}; B.page._szEnsureRetro = () => {};
  B.seed('calendar', { total: 3, yearTotal: 3, months: [{ m: clock.m, n: 3 }], days: [{ d: clock.d, n: 3 }], monthTotals: { reports: 3, qty: 9, sar: 0, actions: { sto: 9 } } });
  B.seed('records', { rows: [row(2)], total: 3, page: 2, pageSize: 1, facets: { locations: ['TEST_ONLY_location', 'TEST_ONLY_other_location'] } });
  B.seed('context', { context: { rep: false, rows: {}, shifts: [], labels: [], present: [], spots: {}, myEmp: null, locked: false, hasRound: false } });
  Object.assign(B.page.state, { irLedgerPage: 2, irLedgerPerPage: 1 });
  let downloaded;
  B.KIVO.BassamXLSX = { download: rows => { downloaded = rows; } };
  const view = B.page._recordsCalVals();
  assert.equal(view.irKpiCount, '3'); assert.equal(view.irKpiBen, '9'); assert.equal(view.irLgShownCount, '3'); assert.equal(view.irLedgerPgRange, '2–2'); assert.equal(view.irLedgerRows.length, 1);
  await view.irLgExportCsv(); assert.equal(downloaded.length, 4, 'header plus all three filtered records, despite current page size one');
  assert.equal(B.calls.length, 2); assert.equal(new URL(B.calls[0].url, 'https://test.invalid').searchParams.get('day'), String(clock.d));
  assert.deepEqual(B.storage, []);
});

test('stable traversal rejects a changed revision and does not emit a partial export', async t => {
  let page = 0;
  const B = browser('seized', async () => json({ ok: 1, dept: 'TEST_ONLY_department', view: 'records', clock,
    base: { ...bases.seized, reports: ++page === 1 ? 3 : 4 }, rows: [{ id: 'TEST_ONLY_' + page, items: [] }], total: 2, page, pageSize: 200,
    next: page === 1 ? 'TEST_ONLY_next' : '', prev: '', facets: { locations: [] } })); t.after(B.cleanup);
  const result = await B.page._bcCollect({ year: clock.y, month: clock.m, day: clock.d });
  assert.equal(result.ok, 0); assert.equal(result.err, 'conflict'); assert.equal(B.calls.length, 2); assert.deepEqual(B.storage, []);
});

test('seized dashboard consumes typed aggregates with the existing SVG presentation and never asks for report history', t => {
  const B = browser('seized', async () => { throw Error('TEST_ONLY no fetch'); }); t.after(B.cleanup); seedForm(B, 'seized');
  B.page._bcEnsure = () => {}; B.page.loadIrshad = () => { throw Error('TEST_ONLY full history forbidden'); }; B.page.loadShiftOptsIr = () => [{ name: 'TEST_ONLY_shift' }];
  const metrics = { reports: 3, qty: 9, sar: 0, employees: 1, actions: { sto: 9 } };
  B.seed('dashboard', { dashboard: { available: { total: 3, years: [clock.y], months: [{ y: clock.y, m: clock.m }], first: clock },
    totals: metrics, previous: { ...metrics, reports: 0, qty: 0, actions: {} }, series: [{ ...clock, ...metrics }], previousSeries: [], heat: [{ ...clock, qty: 9 }],
    categories: [{ name: 'TEST_ONLY_category', value: 9, color: '#000' }], locations: [{ name: 'TEST_ONLY_location', value: 9, previous: 0 }],
    shifts: [{ name: 'TEST_ONLY_shift', ...metrics }], employees: [{ key: 'TEST_ONLY_actor', name: 'TEST_ONLY_actor', shift: 'TEST_ONLY_shift', qty: 9, reports: 3, previous: 0 }],
    shiftSeries: [{ name: 'TEST_ONLY_shift', series: [{ ...clock, qty: 9 }] }], locationSeries: [], summary: { rows: [], totals: metrics, all: 1, matched: 1 } } });
  Object.assign(B.page.state, { irDashYear: clock.y, irDashMonth: String(clock.m), irDashMode: 'month' });
  const view = B.page._dashVals(); assert.equal(view.irDashHeroNum, '٩'); assert.equal(view.irDashSumTotal.reports, '3'); assert.equal(view.irDashSumTotal.ben, '9');
  assert.match(view.irDashHeroLine, /^M/); assert.equal(B.calls.length, 0); assert.deepEqual(B.storage, []);
});

test('seized dashboard category total includes every action and matches category and known-location rows', t => {
  const B = browser('seized', async () => { throw Error('TEST_ONLY no fetch'); }); t.after(B.cleanup); seedForm(B, 'seized');
  const catalog = catalogDto();
  catalog.catalogs.actions.value = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/modules/seized/defaults.json'), 'utf8')).actions;
  B.seed('catalogs', catalog);
  B.page._bcEnsure = () => {};
  const metrics = { reports: 1, qty: 2, sar: 0, employees: 1, actions: { sec: 0, des: 0, sto: 2 } };
  B.seed('dashboard', { dashboard: { available: { total: 1, years: [clock.y], months: [{ y: clock.y, m: clock.m }], first: clock },
    totals: metrics, previous: { ...metrics, reports: 0, qty: 0, actions: {} }, series: [{ ...clock, ...metrics }], previousSeries: [], heat: [{ ...clock, qty: 2 }],
    categories: [{ name: 'TEST_ONLY_category', value: 2, color: '#000' }], locations: [{ name: 'TEST_ONLY_location', value: 2, previous: 0 }],
    shifts: [], employees: [], shiftSeries: [], locationSeries: [], summary: { rows: [], totals: metrics, all: 1, matched: 1 } } });
  Object.assign(B.page.state, { irDashYear: clock.y, irDashMonth: String(clock.m), irDashMode: 'month' });
  const view = B.page._dashVals();
  assert.equal(view.irDashLangTot, '2', 'Category heading must sum categories rather than the zero-valued first action');
  assert.equal(view.irDashLangRows[0].name, 'TEST_ONLY_category');
  assert.equal(view.irDashLangRows[0].val, '2'); assert.equal(view.irDashLangRows[0].pct, '100%');
  assert.equal(view.irDashLocTot, '2'); assert.equal(view.irDashLocRows[0].name, 'TEST_ONLY_location');
  assert.equal(view.irDashLocRows[0].val, '2'); assert.equal(view.irDashLocRows[0].pct, '100%');
  assert.equal(B.calls.length, 0); assert.deepEqual(B.storage, []);
});

test('award references use the confirmed department document, preserve HTML bytes, and never write through a raw global store', async t => {
  const B = browser('award', async (_, options) => ack('award', JSON.parse(options.body))); t.after(B.cleanup);
  const document = Object.fromEntries(['A', 'B', 'C'].map(key => [key, { title: 'TEST_ONLY_' + key, lead: '', foot: '', secs: [{ title: 'TEST_ONLY_section', body: '<h4>TEST_ONLY</h4><ul><li>Arabic العربية</li></ul>' }] }]));
  const references = { docsV1: { present: true, value: {} }, docsV2: { present: false, value: null }, document };
  B.seed('references', { scope: 'dept', references });
  assert.equal(B.page.awDocsGet().A.secs[0].body, document.A.secs[0].body);
  assert.equal(await B.page.awDocsPut(document), true);
  const body = JSON.parse(B.calls[0].options.body); assert.equal(body.op, 'reference-replace'); assert.equal(body.version, 2); assert.equal(body.dept, 'TEST_ONLY_department'); assert.equal(body.document.A.secs[0].body, document.A.secs[0].body);
  B.seed('references', { scope: 'global', references }); assert.equal(await B.page.awDocsPut(document), false); assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []);
  /* outside the unit's ceiling (no 'award'): the reference editor is not offered and nothing is sent (decision هـ) */
  B.seed('references', { scope: 'dept', references }); B.ceiling(['seized']);
  assert.equal(B.page.awCanSetRef(), false); assert.equal(await B.page.awDocsPut(document), false); assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []);
});

test('award defaults appear only after a complete confirmed references response and no read triggers migration writes', async t => {
  const B = browser('award', async () => json({ ok: 1, dept: 'TEST_ONLY_department', scope: 'dept', view: 'references', base: bases.award,
    references: { docsV1: { present: false, value: null }, docsV2: { present: false, value: null }, document: null } })); t.after(B.cleanup);
  assert.equal(B.page.awDocsGet().A.secs.length, 0, 'unread is not treated as absent');
  const read = await B.page._bcRead('references'); assert.equal(read.ok, 1); B.seed('references', read.data);
  assert.ok(B.page.awDocsGet().A.secs.length > 0); assert.equal(B.calls.length, 1); assert.equal(B.calls[0].options.method, 'GET'); assert.deepEqual(B.storage, []);
});

for (const module of ['seized', 'award']) {
  test(module + ' cannot mint a fresh request after an uncertain commit is followed by CAS/authority refusal', async t => {
    let attempt = 0;
    const B = browser(module, async (_, options) => { if (++attempt === 1) throw Error('TEST_ONLY committed response lost'); if (attempt === 2) return json({ ok: 0, err: 'restore-epoch-changed' }, 409); return ack(module, JSON.parse(options.body)); }); t.after(B.cleanup);
    seedForm(B, module); await save(B.page, module); const original = B.calls[0].options.body;
    await save(B.page, module); assert.equal(B.page._bcTickets.size, 1, 'a later 409 cannot prove the earlier commit did not happen');
    await save(B.page, module); assert.equal(B.calls.length, 3); assert.ok(B.calls.every(call => call.options.body === original)); assert.equal(B.page._bcTickets.size, 0); assert.deepEqual(B.storage, []);
  });

  test(module + ' a permission change abandons an in-flight read without caching its old authority result', async t => {
    let release;
    const B = browser(module, async () => new Promise(resolve => { release = () => resolve(json({ ok: 1, dept: 'TEST_ONLY_department', scope: 'dept', view: 'records', clock, base: bases[module],
      ...(module === 'award' ? { recs: [], total: 0, filteredTotal: 0, page: 1, pageSize: 10, next: null, prev: null, summary: { total: 0, eligible: 0 } } : { rows: [], total: 0, page: 1, next: '', prev: '', facets: { locations: [] } }) })); })); t.after(B.cleanup);
    B.page.componentDidMount(); B.page._bcEnsure('records', { limit: 10 }); await waitFor(() => !!release);
    B.W.dispatchEvent({ type: 'bassam:authz', detail: {} }); release(); await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(B.page._bcData('records'), null); assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []); B.page.componentWillUnmount();
  });
}

test('a late seized ACK retains newer inputs and a later explicit save edits the confirmed id instead of creating a duplicate', async t => {
  let release, first = true;
  const B = browser('seized', async (_, options) => first ? new Promise(resolve => { release = () => { first = false; resolve(ack('seized', JSON.parse(options.body))); }; }) : ack('seized', JSON.parse(options.body))); t.after(B.cleanup);
  seedForm(B, 'seized'); const pending = save(B.page, 'seized'); await waitFor(() => !!release);
  B.page.state.irDraft = { ...B.page.state.irDraft, note: 'TEST_ONLY_newer_input' }; release(); assert.equal(await pending, false);
  assert.equal(B.page.state.irDraft.note, 'TEST_ONLY_newer_input'); assert.equal(B.page.state.irEditId, 'TEST_ONLY_created');
  await save(B.page, 'seized'); assert.equal(JSON.parse(B.calls[1].options.body).op, 'edit'); assert.equal(JSON.parse(B.calls[1].options.body).id, 'TEST_ONLY_created');
  assert.equal(JSON.parse(B.calls[1].options.body).data.items[0].sourceIndex, 0); assert.deepEqual(B.storage, []);
});

test('a late Award ACK retains newer inputs and starting another nomination requires explicit review through the existing confirmation dialog', async t => {
  let release;
  const B = browser('award', async (_, options) => new Promise(resolve => { release = () => resolve(ack('award', JSON.parse(options.body))); })); t.after(B.cleanup);
  seedForm(B, 'award'); const pending = save(B.page, 'award'); await waitFor(() => !!release);
  B.page.state.comp = 'TEST_ONLY_newer_input'; release(); await pending;
  assert.equal(B.page.state.comp, 'TEST_ONLY_newer_input'); assert.equal(B.page._awConfirmedCreate, 'TEST_ONLY_created');
  await save(B.page, 'award'); assert.equal(B.calls.length, 1, 'the acknowledged create cannot become a second automatic nomination');
  B.KIVO.bsConfirm = async () => false; await B.page._awNew(); assert.equal(B.page.state.comp, 'TEST_ONLY_newer_input');
  B.KIVO.bsConfirm = async () => true; await B.page._awNew(); assert.equal(B.page.state.ekey, ''); assert.equal(B.page._awConfirmedCreate, null); assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []);
});

test('seized effective catalogs do not apply a second default fallback and lossless nullable items remain valid in a read DTO', async t => {
  const B = browser('seized', async url => json({ ok: 1, dept: 'TEST_ONLY_department', view: new URL(url, 'https://test.invalid').searchParams.get('view'), clock, base: bases.seized,
    rows: [{ id: 'TEST_ONLY_null', items: null }, { id: 'TEST_ONLY_absent' }], total: 2, page: 1, pageSize: 10, next: '', prev: '', facets: { locations: [] } })); t.after(B.cleanup);
  assert.equal(B.page.loadCat().cats.length, 0, 'unread catalog is not confirmed absence');
  B.seed('catalogs', catalogDto()); assert.deepEqual(Array.from(B.page.loadKinds()), [], 'effective [] from a nonempty raw filtered jewel list must remain empty');
  const result = await B.page._bcRead('records', { limit: 10 }); assert.equal(result.ok, 1);
  B.seed('records', result.data); const rows = B.page.loadIrshad().reports;
  assert.equal(rows[0].items, null); assert.equal(Object.hasOwn(rows[1], 'items'), false); assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []);
});

test('a seized retro POST response alone never opens a period; a lost response reads back the actual window without replaying the POST', async t => {
  let releaseGet;
  const window = { id: 'TEST_ONLY_window', scope: { y: 1447, m: 1, d: null }, until: clock.now + 3600000 };
  const B = browser('seized', async (_, options) => options.method === 'POST' ? Promise.reject(Error('TEST_ONLY response lost after commit')) : new Promise(resolve => { releaseGet = () => resolve(json({ ok: 1, dept: 'TEST_ONLY_department', res: 'seized', now: clock.now, may: true, windows: [window] })); })); t.after(B.cleanup);
  B.seed('retro', { res: 'seized', now: clock.now, _received: Date.now(), may: true, windows: [] });
  B.KIVO.__BS_SRV.askReason = (_, __, callback) => callback('TEST_ONLY_reason');
  await B.page._szRetroToggle({ y: 1447, m: 1 }); assert.equal(Object.keys(B.page._szRetroFlags().months).length, 0);
  await waitFor(() => !!releaseGet); assert.equal(B.calls.filter(call => call.options.method === 'POST').length, 1);
  assert.equal(new URL(B.calls[0].url, 'https://test.invalid').searchParams.get('uid'), 'TEST_ONLY_owner');
  releaseGet(); await waitFor(() => !!B.page._bcData('retro')); assert.equal(B.page._szRetroFlags().months['1447-1'], true);
  assert.equal(B.calls.filter(call => call.options.method === 'POST').length, 1); assert.deepEqual(B.storage, []);
});

test('legacy Award detail uses its external recordKey and preserves absent business id while status/delete use the transport identity', async t => {
  const recordKey = 'TEST_ONLY_legacy_transport';
  const B = browser('award', async (_, options) => options.method === 'GET'
    ? json({ ok: 1, dept: 'TEST_ONLY_department', scope: 'dept', view: 'record', base: bases.award, recordKey, record: { ekey: 'TEST_ONLY_employee', cat: 'emp', declName: 'TEST_ONLY_legacy' } })
    : ack('award', JSON.parse(options.body))); t.after(B.cleanup);
  const result = await B.page._bcRead('record', { id: recordKey }); assert.equal(result.ok, 1); assert.equal(Object.hasOwn(result.data.record, 'id'), false);
  B.seed('record', result.data); await B.page.awSetStatus(recordKey, 'معتمد');
  assert.equal(JSON.parse(B.calls[1].options.body).id, recordKey);
  B.seed('record', { ...result.data, base: { ...bases.award, records: 20 } });
  B.page.state.awArm = { id: recordKey, ts: Date.now() }; await B.page.awDel(recordKey, 'TEST_ONLY_legacy');
  assert.equal(JSON.parse(B.calls[2].options.body).id, recordKey); assert.equal(Object.hasOwn(result.data.record, 'id'), false); assert.deepEqual(B.storage, []);
});

test('editing a legacy seized item preserves its raw string identity and sourceIndex without sending client history', async t => {
  for (const id of ['23', 'TEST_ONLY_custom_item']) {
    const B = browser('seized', async (_, options) => ack('seized', JSON.parse(options.body))); t.after(B.cleanup); seedForm(B, 'seized');
    const original = { ...item(), id, hist: [{ from: 'sto', to: 'sec', at: 1, by: 'TEST_ONLY_actor' }] };
    B.seed('records', { rows: [{ id: 'TEST_ONLY_legacy_record', items: [original] }] });
    B.page.state.irEditId = 'TEST_ONLY_legacy_record'; B.page.state.irDraft.items = [{ ...original, sourceIndex: 0 }];
    assert.equal(await save(B.page, 'seized'), true);
    const sent = JSON.parse(B.calls[0].options.body).data.items[0];
    assert.equal(sent.id, id); assert.equal(sent.sourceIndex, 0); assert.equal(Object.hasOwn(sent, 'hist'), false);
    assert.equal(original.hist[0].at, 1); assert.deepEqual(B.storage, []);
  }
});

test('a late catalog ACK preserves text entered for the next item', async t => {
  let release;
  const B = browser('seized', async (_, options) => new Promise(resolve => { const body = JSON.parse(options.body); release = () => resolve(ack('seized', body, { n: body.value.length })); })); t.after(B.cleanup); seedForm(B, 'seized');
  B.page._bcEnsure = () => {}; B.page._szEnsureRetro = () => {};
  B.seed('context', { context: { rows: {}, shifts: [], labels: [], present: [], spots: {}, myEmp: null, locked: false } });
  B.page.state.szActNewVal = 'TEST_ONLY_first_action'; const pending = B.page._recordsCalVals().szActAddNew(); await waitFor(() => !!release);
  B.page.state.szActNewVal = 'TEST_ONLY_later_action'; release(); await pending;
  assert.equal(B.page.state.szActNewVal, 'TEST_ONLY_later_action'); assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []);
});

test('a definitive catalog-in-use refusal does not mark an unrelated seized record draft as conflicted', async t => {
  const B = browser('seized', async () => json({ ok: 0, err: 'seized-catalog-in-use' }, 409)); t.after(B.cleanup); seedForm(B, 'seized');
  B.page.state.irEditId = 'TEST_ONLY_editing_record';
  assert.equal(await B.page.saveActs([{ k: 'TEST_ONLY_other', name: 'TEST_ONLY_other' }]), false);
  assert.notEqual(B.page._szNeedsReview, true); assert.equal(B.page.state.irDraft.items[0].n, 3); assert.equal(B.page._bcTickets.size, 0); assert.deepEqual(B.storage, []);
});

for (const module of ['seized', 'award']) {
  test(module + ' asks for a required canonical nested reason only on the user explicit retry after a definitive refusal', async t => {
    let first = true, asked = 0;
    const B = browser(module, async (_, options) => {
      if (first) { first = false; return json({ ok: 0, err: module + '-denied', denied: { why: 'reason', reasonKeys: ['TEST_ONLY_permission'] } }, 403); }
      return ack(module, JSON.parse(options.body));
    }); t.after(B.cleanup); seedForm(B, module);
    B.KIVO.__BS_SRV.askReason = (_, keys, done) => { asked++; assert.equal(keys[0], 'TEST_ONLY_permission'); done('TEST_ONLY reviewed reason'); };
    await save(B.page, module); assert.equal(asked, 0); assert.equal(B.calls.length, 1); assert.equal(B.page._bcTickets.size, 0);
    await save(B.page, module); assert.equal(asked, 1); assert.equal(B.calls.length, 2);
    const refused = JSON.parse(B.calls[0].options.body), accepted = JSON.parse(B.calls[1].options.body);
    assert.equal(Object.hasOwn(refused, 'reason'), false); assert.equal(accepted.reason, 'TEST_ONLY reviewed reason'); assert.notEqual(accepted.requestId, refused.requestId);
    assert.equal(B.page._bcTickets.size, 0); assert.deepEqual(B.storage, []);
  });
}
