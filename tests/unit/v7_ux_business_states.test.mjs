/* V7 UX states · step 4 (seized and award) — loading, refresh and load failure of the two business pages go through the one
   page-states component; the notice bar keeps only its non-loading messages. The actual module source and its logicParts run in a
   VM (tests/unit/business_cloud_ui_fx.mjs); the component is a recording double. Synthetic data, no network, no device store.
   Pinned here on purpose (it replaces what tests pinned before): the bar no longer carries «جارٍ قراءة البيانات من الخادم», and a
   refresh keeps the last content on screen while every save guard still sees «not confirmed» exactly as before. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { json, bases, catalogDto, ack, waitFor, browser, seedForm, save, ROOT } from './business_cloud_ui_fx.mjs';

const DTO = {
  seized: (view, B) => ({ ok: 1, dept: B.context().dept, view, base: { ...B.base }, ...(view === 'catalogs' ? catalogDto() : {}),
    ...(view === 'dashboard' ? { dashboard: { available: { years: [], months: [], total: 0, first: null }, totals: { reports: 0, qty: 0, actions: {} }, previous: { reports: 0, qty: 0, actions: {} },
      series: [], previousSeries: [], heat: [], categories: [], locations: [], shifts: [], shiftSeries: [], locationSeries: [], employees: [], summary: { rows: [], totals: { reports: 0, qty: 0, employees: 0, actions: {} } } } } : {}) }),
  award: (view, B) => ({ ok: 1, dept: B.context().dept, view, base: { ...B.base }, recs: [], total: 0, filteredTotal: 0, page: 1, pageSize: 10, next: null, prev: null,
    summary: { total: 0, eligible: 0, employeeScoreAverage: null, topScore: null, topRecord: null } }),
};
const REQ = { seized: ['catalogs', 'dashboard'], award: ['records'] };
/* the page is driven the way the runtime drives it; reads are answered by `answer` (swappable), validity checks are not under test */
function open(module, answer) {
  const box = { answer }, B = browser(module, async (url, options) => box.answer(url, options, B));
  B.page._businessReadValid = () => true;
  const specs = []; B.KIVO.PageStates = { host: (el, spec) => { specs.push(spec); return {}; } };
  const draw = () => { const v = B.page.renderVals(); assert.equal(typeof v.bcStates, 'function', 'the view gets the component host callback'); v.bcStates({}); return { v, spec: specs[specs.length - 1] }; };
  const loaded = async () => { draw(); await waitFor(() => REQ[module].every((view) => B.page._bcReads?.get(view)?.done)); return draw(); };
  return { B, box, draw, loaded, view: (url) => new URL(url, 'https://example.invalid').searchParams.get('view') };
}
const ok = (module) => async (url, options, B) => json(DTO[module](new URL(url, 'https://example.invalid').searchParams.get('view'), B));

for (const module of ['seized', 'award']) {
  const flag = module === 'seized' ? 'irOnDash' : 'awOnNew';
  const setup = (answer) => { const T = open(module, answer); if (module === 'seized') T.B.page.props = { solo: 'dash' }; return T; };

  test(module + ': first load is the component skeleton — the bar says nothing about loading', async (t) => {
    const T = setup(ok(module)); t.after(T.B.cleanup);
    const first = T.draw();
    assert.equal(first.spec.state, 'loading'); assert.ok('page' in first.spec, 'the page names itself to the component (name and shape come from the manifest)');
    assert.equal(!!first.v[flag], false, 'content is not shown before the first confirmed read');
    assert.equal(first.v.bcNotice, false, 'no loading text in the notice bar'); assert.equal(first.v.bcCanRefresh, false, 'and no refresh button while loading');
    const done = await T.loaded();
    assert.equal(done.spec.state, 'ready'); assert.equal(done.v[flag], true); assert.equal(done.v.bcNotice, false);
    assert.equal(T.B.storage.length, 0, 'no device storage');
  });

  test(module + ': a refresh keeps the last content on screen, shows the refresh state, and every save guard still sees «not confirmed»', async (t) => {
    const T = setup(ok(module)); t.after(T.B.cleanup);
    await T.loaded();
    const calls = T.B.calls.length, held = []; T.box.answer = (url, options, B) => new Promise((resolve) => { held.push(() => resolve(json(DTO[module](T.view(url), B)))); });
    T.B.page._bcInvalidate();                                     // what a colleague's change, a confirmed save or the refresh path does
    const during = T.draw();
    assert.equal(during.v[flag], true, 'the content stays visible during the refresh'); assert.equal(during.v.bcReady, true);
    assert.equal(during.spec.state, 'refreshing'); assert.equal(during.v.bcNotice, false, 'no loading text in the bar');
    await new Promise((r) => setTimeout(r, 5));
    /* outside the render the guards are exactly as before: nothing confirmed ⇒ no stamp base ⇒ the save is refused without a request */
    for (const view of REQ[module]) assert.equal(T.B.page._bcData(view), null, view + ' is not confirmed during the refresh');
    assert.equal(T.B.page._bcStamp().base, null);
    const sent = T.B.calls.filter((c) => c.options.method === 'POST').length;
    const result = await T.B.page._bcMutate('create', { data: {} });
    assert.equal(result.ok, 0); assert.equal(result.err, 'invalid'); assert.equal(result.message, 'لم يصل تأكيد كامل من الخادم؛ أعد الإجراء نفسه لتأكيد طلبك');
    assert.equal(T.B.calls.filter((c) => c.options.method === 'POST').length, sent, 'a save during the refresh is refused before any request');
    assert.ok(T.B.calls.length > calls, 'the refresh re-read went out');
    await waitFor(() => held.length === REQ[module].length); held.forEach((release) => release());
    await waitFor(() => REQ[module].every((view) => T.B.page._bcReads.get(view)?.done));
    const after = T.draw(); assert.equal(after.spec.state, 'ready'); assert.equal(after.v[flag], true);
    for (const view of REQ[module]) assert.ok(T.B.page._bcData(view), view + ' confirmed again');
  });

  test(module + ': a network failure, a 5xx and an invalid answer are the component failure card with the page retry; they are not in the bar', async (t) => {
    for (const [what, answer] of [['network', async () => { throw Error('TEST_ONLY offline'); }], ['5xx', async () => json({ ok: 0, err: 'TEST_ONLY_down' }, 503)], ['invalid', async () => ({ ok: true, status: 200, json: async () => { throw Error('not json'); } })]]) {
      const T = setup(answer); t.after(T.B.cleanup);
      T.draw(); await waitFor(() => REQ[module].some((view) => T.B.page._bcReads?.get(view)?.failed));
      const failed = T.draw();
      assert.equal(failed.spec.state, 'error', what); assert.equal(typeof failed.spec.retry, 'function'); assert.equal(!!failed.v[flag], false);
      assert.equal(failed.v.bcNotice, false, what + ': the bar does not repeat the load failure'); assert.equal(failed.v.bcCanRefresh, false, what + ': the only retry is the card');
      T.box.answer = ok(module); const before = T.B.calls.length;
      failed.spec.retry();                                          // the card button and the online event call this
      const again = await T.loaded();
      assert.ok(T.B.calls.length > before, what + ': the retry re-reads'); assert.equal(again.spec.state, 'ready'); assert.equal(again.v[flag], true);
    }
  });

  test(module + ': a failed refresh drops the kept content (no stale success) and shows the failure card', async (t) => {
    const T = setup(ok(module)); t.after(T.B.cleanup);
    await T.loaded();
    T.box.answer = async () => { throw Error('TEST_ONLY offline'); };
    T.B.page._bcInvalidate(); assert.equal(T.draw().spec.state, 'refreshing');
    await waitFor(() => REQ[module].some((view) => T.B.page._bcReads.get(view)?.failed));
    const failed = T.draw(); assert.equal(failed.spec.state, 'error'); assert.equal(!!failed.v[flag], false);
  });

  test(module + ': permission, session and conflict refusals stay outside the component, in the slim bar', async (t) => {
    const T = setup(async () => json({ ok: 0, err: module + '-denied' }, 403)); t.after(T.B.cleanup);
    T.draw(); await waitFor(() => REQ[module].some((view) => T.B.page._bcReads?.get(view)?.failed));
    const denied = T.draw();
    assert.notEqual(denied.spec.state, 'error', 'a 403 is not a load failure'); assert.notEqual(denied.spec.state, 'loading');
    assert.equal(denied.v.bcNotice, true); assert.match(denied.v.bcMessage, /صلاحيتك/); assert.equal(denied.v.bcCanRefresh, true, 'the bar keeps its refresh for a refused read');
    const C = setup(ok(module)); t.after(C.B.cleanup); await C.loaded();
    C.B.page.setState({ bcMessage: C.B.page._bcFailure('conflict').message });
    let v = C.draw().v; assert.equal(v.bcNotice, true); assert.equal(v.bcCanRefresh, true, 'a conflict keeps the refresh button (it is the way out)');
    C.B.page.setState({ bcMessage: 'مسودتك باقية في هذه الجلسة؛ راجعها قبل الحفظ' });
    v = C.draw().v; assert.equal(v.bcNotice, true); assert.equal(v.bcCanRefresh, false, 'a draft notice has no button');
    C.B.page.setState({ bcMessage: '', bcPending: true });
    v = C.draw().v; assert.equal(v.bcNotice, true); assert.equal(v.bcMessage, 'جارٍ تأكيد العملية — مسودتك باقية حتى يصل التأكيد'); assert.equal(v.bcCanRefresh, false);
    C.B.page.setState({ bcPending: false }); assert.equal(C.draw().v.bcNotice, false);
  });
}

test('award: a different query is a load, never the previous answer under a new question; returning to the page is a first load', async (t) => {
  const T = open('award', ok('award')); t.after(T.B.cleanup);
  await T.loaded();
  let release; T.box.answer = (url, options, B) => new Promise((resolve) => { release = () => resolve(json(DTO.award(T.view(url), B))); });
  T.B.page.state.awTab = 'res'; T.B.page.state.awQ = 'TEST_ONLY_search';
  const searching = T.draw();
  assert.equal(searching.spec.state, 'loading', 'a new query does not show the old rows'); assert.equal(!!searching.v.awOnRes, false);
  await waitFor(() => !!release); release(); await waitFor(() => T.B.page._bcReads.get('records')?.done);
  assert.equal(T.draw().spec.state, 'ready');
  /* a new component instance (the page was left and opened again) starts with nothing kept */
  const again = open('award', async () => new Promise(() => {})); t.after(again.B.cleanup);
  const first = again.draw(); assert.equal(first.spec.state, 'loading'); assert.equal(!!first.v.awOnNew, false);
});

test('seized: the save path is unchanged after a completed refresh (stamp from the confirmed read, one POST, same body shape)', async (t) => {
  const T = open('seized', async (url, options, B) => options.method === 'POST' ? ack('seized', JSON.parse(options.body)) : json(DTO.seized(new URL(url, 'https://example.invalid').searchParams.get('view'), B)));
  t.after(T.B.cleanup);
  seedForm(T.B, 'seized');
  assert.equal(await save(T.B.page, 'seized'), true);
  const posts = T.B.calls.filter((c) => c.options.method === 'POST');
  assert.equal(posts.length, 1); const body = JSON.parse(posts[0].options.body);
  assert.deepEqual(body.base, bases.seized); assert.equal(body.op, 'create');
});

test('the two views: the bar is the slim one with its conditional refresh button, and the component host sits in the page', () => {
  for (const module of ['seized', 'award']) {
    const view = fs.readFileSync(new URL('../../src/modules/' + module + '/view.html', import.meta.url), 'utf8');
    assert.match(view, /<sc-if value="\{\{bcNotice\}\}" hint-placeholder-val="\{\{ false \}\}"><div class="ps-bar" role="status"><span>\{\{bcMessage\}\}<\/span><sc-if value="\{\{bcCanRefresh\}\}"><button onClick="\{\{bcRefresh\}\}">تحديث البيانات<\/button><\/sc-if><\/div><\/sc-if>/);
    assert.equal(view.split('ref="{{bcStates}}"').length, 2, module + ': one component host');
  }
  const cloud = fs.readFileSync(new URL('../../src/modules/business-cloud.js', import.meta.url), 'utf8');
  assert.doesNotMatch(cloud, /جارٍ قراءة البيانات من الخادم/, 'the loading text left the bar');
  assert.doesNotMatch(cloud, /localStorage|sessionStorage|indexedDB/, 'kept content lives in the component instance only');
  assert.ok(ROOT);
});
