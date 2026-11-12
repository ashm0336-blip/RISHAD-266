/* RISHAD V7 P4 — the default landing does not move because of the «مؤشرات المهام» ref.
   P4 made the tasks panel a page-level ref of the «مؤشرات الإدارة» container ("tasks", no «/»), so a holder of tasks:view gets the link
   and the route (_kpisOk · kpiPanelOk). The one place that PREFERS «مؤشرات الإدارة» as a landing is _goOps (the default page of the
   operational workspace): before P4 it preferred it only for a holder of one of the container's leaves. Owner decision: the link stays,
   the landing is as before P4. The real root-logic.js runs in vm (core01_root_world.mjs); the container's refs are the real ones
   (manifests/pages.json), the grants are a small stand-in with kpiPanelOk's real rule for a page-level ref (can(page,'view')). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, rd } from './core01_root_world.mjs';

const M = JSON.parse(rd('manifests/pages.json'));
const REFS = M.containers.filter((c) => c.key === 'kpis')[0].refs;
const NAV2PERM = { dstats: 'dstats', employees: 'emps', planning: 'planning', daily: 'daily', tasks: 'tasks', irshad: 'irshad', seized: 'seized', award: 'award' };

/* held: page keys and leaves the account holds (view) */
function ops(held, o = {}) {
  const W = world(Object.assign({ user: { id: 'TEST_ONLY_u', role: 'staff' }, hash: '#' }, o)), went = [];
  const has = (k) => held.indexOf(k) !== -1;
  Object.assign(W.KIVO.BassamPerm, { NAV2PERM, PERM2NAV: Object.fromEntries(Object.entries(NAV2PERM).map(([n, p]) => [p, n])), can: (pk) => has(pk),
    navLeaves: () => REFS.map((r) => r.split('/')).map((x) => [x[0], x[1] || '']), kpiPanelOk: (pk, sk) => (sk ? has(pk + '/' + sk) : has(pk)),
    visiblePages: () => M.pages.map((p) => p.key).filter(has) });
  W.KIVO.BassamNav = { go: (k) => went.push(k) };
  return { W, went };
}

test('the container really carries the page-level tasks ref (the case under test exists)', () => {
  assert.ok(REFS.includes('tasks'), '«مؤشرات المهام» is a ref without «/»');
  assert.ok(REFS.filter((r) => r.includes('/')).length >= 6, 'and the leaves are still there');
});

test('tasks only (with its container «المتابعة اليومية»): link and route stay, the default landing is not «مؤشرات الإدارة»', async () => {
  const { W, went } = ops(['tasks', 'daily']);
  assert.equal(W.c._kpisOk(), true, 'the link is shown');
  assert.equal(W.c._pageAllowed('kpis'), 'kpis', 'the route opens');
  assert.equal(W.c._kpisOk(1), false, 'no leaf of the container is held');
  await W.c._goOps();
  assert.deepEqual(went, ['daily'], 'the workspace default is the first available page, as before P4');
  assert.equal(W.c._loadPage(), 'daily', 'a session with no saved page and no address opens the first visible page, as before P4');
});

test('tasks plus another page: lands on that page, not on «مؤشرات الإدارة»', async () => {
  const { W, went } = ops(['tasks', 'daily', 'emps']);
  await W.c._goOps();
  assert.deepEqual(went, ['employees']);
  assert.equal(W.c._kpisOk(), true);
});

test('a real leaf of the container still makes «مؤشرات الإدارة» the workspace default (unchanged)', async () => {
  for (const held of [['dstats/anHaram'], ['tasks', 'daily', 'irshad/dash'], ['planning', 'planning/readiness']]) {
    const { W, went } = ops(held);
    assert.equal(W.c._kpisOk(1), true, held.join());
    await W.c._goOps();
    assert.deepEqual(went, ['kpis'], held.join());
  }
});

test('no grant: neither link nor preference — «صفحتي»', async () => {
  const { W, went } = ops([]);
  assert.equal(W.c._kpisOk(), false); assert.equal(W.c._pageAllowed('kpis'), '');
  await W.c._goOps();
  assert.deepEqual(went, ['profile']);
});

test('the last operational page still wins over the default', async () => {
  const { W, went } = ops(['tasks', 'daily', 'dstats/anHaram']);
  W.c.__lastOps = 'tasks';
  await W.c._goOps();
  assert.deepEqual(went, ['tasks']);
});
