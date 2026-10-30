/* Synthetic source-shaped values. No fixture normalizes or authorizes them. */
export function peopleTaskDocuments(department = 'TEST_ONLY_DEPT') {
  const who = { u: 'TEST_ONLY_manager', e: 'TEST_ONLY_e1', n: 'TEST_ONLY manager' };
  const cancel = { at: 1100, by: { u: who.u, n: who.n }, why: 'TEST_ONLY recurrence narrowing', rec: 1 };
  const decision = { st: 'returned', at: 1200, by: { u: who.u, n: who.n }, sub: 1150, why: 'TEST_ONLY review' };
  const proof = { imgs: ['IMG_TEST_ONLY_task'], note: '<b>TEST_ONLY proof</b>', at: 1150, st: { 'TEST_ONLY step': 1140 }, sub: 1150, draft: false,
    h: [{ at: 1000, imgs: ['IMG_TEST_ONLY_old'], note: 'TEST_ONLY earlier proof' }], meta: [{ img: 'IMG_TEST_ONLY_task', at: 1140, lat: null, lng: 0, acc: 0 }] };
  const management = { v: 2, by: who, pol: { m: 'both', n: 1, steps: ['TEST_ONLY step'] }, rv: null, dec: 1, needs: ['tasks'],
    elig: { res: 'متاح', code: 'available', at: 900 }, win: { early: 0, late: 2 }, ext: [{ at: 1000, by: { u: who.u, n: who.n }, from: null, to: 4000, why: '' }],
    rev: decision, revh: [decision], asg: 'assigned', can: cancel, canh: [cancel],
    re: { at: 800, by: { u: who.u, n: who.n }, why: 'TEST_ONLY reassign', to: { e: 'TEST_ONLY_e2', n: 'TEST_ONLY second' } },
    from: { id: 'legacy-identity', e: 'TEST_ONLY_e0', at: 700 }, relink: [{ at: 750, by: { u: who.u, n: who.n }, from: 'TEST_ONLY old', to: 'TEST_ONLY_e1' }],
    rec: { id: 'rTEST_ONLY', ver: 2, t: 'weekly', wd: [0, 2, 6], md: 'last', n: 2, from: '1448-5-1', to: '1448-6-1', paused: 0, stop: false, by: who, asg: ['TEST_ONLY_e1'] },
    idem: 'r:rTEST_ONLY:1448-5-1:TEST_ONLY_e1', det: true };
  const row = ['TEST_ONLY title', 'TEST_ONLY description', 'normal', 'in_progress', 'normal', 'added', ['on_time', 'في الوقت'], ['T'], 'TEST_ONLY employee', who.n, 30,
    1000, null, 101, 'TEST_ONLY_e1', 900, 4000, 'TEST_ONLY_group', 'TEST_ONLY group', null,
    { at: 1000, why: '', exp: 0, ack: 950, stall: { at: 1050, why: 'TEST_ONLY stall' }, q: ['TEST_ONLY_idem'] }, proof, 'TEST_ONLY_entity', management];
  const shift = { pulled: true, roster: [{ ekey: 'TEST_ONLY_e1', name: 'TEST_ONLY employee', empno: '001', shift: 'night', st: 'pr', pmk: '', lvk: '', tin: 1, tfrom: 'day', treason: 'TEST_ONLY transfer', loc: 'TEST_ONLY historical location' }],
    leaders: { chief: 'TEST_ONLY_e1', deputy: '', coord: 'TEST_ONLY historical leader' }, sig: 'TEST_ONLY signature', def: { color: '#000000', tStart: '22:00', tEnd: '06:00' },
    rest: { TEST_ONLY_e1: ['الجمعة'] }, muk: { TEST_ONLY_e1: true }, restSrc: { TEST_ONLY_e1: 'day' }, tout: { TEST_ONLY_e2: { to: 'day', why: 'TEST_ONLY transfer' } },
    ap: false, apBy: 'TEST_ONLY manager', apAt: 'TEST_ONLY approval stamp', cont: 'TEST_ONLY historical continuation' };
  const values = {
    bassam_employees_v1: ['TEST_ONLY legacy name', { eid: 'TEST_ONLY_e1', name: 'TEST_ONLY employee', nid: 'TEST_ONLY_nid', phone: '', empno: '001', email: '', type: 'employee', work: 'TEST_ONLY work', gender: 'male', shift: 'night', group: 'بدون مجموعة', account: 'بانتظار التفعيل', contact: 'غير متوفر', job: null }],
    bassam_options_v1: { type: ['employee', 'TEST_ONLY other'], work: [] },
    bassam_tasks_v1: { '1448-5-1': [row, []], '1448-5-2': [] },
    bassam_tasks_locks_v1: { '1448-5': true, '1448-5-1': { mo: 1 }, '1448-5-2': false },
    bassam_dreport_v1: { __ldcs: { chief: 'TEST_ONLY leader callsign', deputy: '' }, 'm:1448-5': { ap: false, mo: 1, auto: false, dopen: { 1: true }, dshut: {}, perm: { TEST_ONLY_e1: [1, '2', null] } },
      '1448-5-1': { created: 1, shifts: { night: shift } }, '1448-5-2': { pulled: true, roster: [], ap: false, apBy: '', apAt: '' }, 'm:1448-6': true },
    bassam_leave_kinds_v1: ['TEST_ONLY leave', 'TEST_ONLY second'],
    bassam_dr_grp_v1: { on: true, closed: { 'TEST_ONLY_group': false } },
  };
  return Object.fromEntries(Object.entries(values).map(([resource, value]) => ['bsdept:' + department + ':' + resource, value]));
}
