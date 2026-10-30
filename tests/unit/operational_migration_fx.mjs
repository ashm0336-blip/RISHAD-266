/* Explicit source-derived business fixtures only. No codec, storage, user
   credentials, cloud transport, generated Worker or .cache dependency. */
export const cloneOperationsFixture = (value) =>
  JSON.parse(JSON.stringify(value));
export function operationalMigrationFixture({ employees = 100 } = {}) {
  if (!Number.isInteger(employees) || employees < 2 || employees > 1000)
    throw Error("TEST_ONLY_fixture_employee_count");
  const departments = [1, 2].map((i) => ({
    id: "TEST_ONLY_OPERATIONS_D" + i,
    name: "TEST_ONLY department " + i,
  }));
  const shifts = [
    {
      name: "TEST_ONLY morning",
      color: "#123456",
      tStart: "06:00",
      tEnd: "14:00",
    },
    {
      name: "TEST_ONLY night",
      color: "#654321",
      tStart: "22:00",
      tEnd: "06:00",
    },
  ];
  const result = {
    departments,
    employeeCount: employees,
    byDepartment: {},
    documents: {},
  };
  for (let i = 0; i < departments.length; i++) {
    const department = departments[i].id,
      count = Math.floor(employees / 2) + (i === 0 ? employees % 2 : 0),
      list = [];
    for (let n = 0; n < count; n++)
      list.push({
        eid: "TEST_ONLY_E" + (i + 1) + "_" + String(n + 1).padStart(3, "0"),
        name: "TEST_ONLY employee " + i + "/" + n,
        nid: String(1000000000 + i * 10000 + n),
        work: n % 2 ? "إداريـ / ـة" : "ميدانيـ / ـة",
        type: "دائم",
      });
    const monthly = {},
      oldMonth = {};
    list.forEach((employee, n) => {
      monthly[employee.eid] = {
        shift: shifts[n % shifts.length].name,
        rest: n % 3 ? [] : ["الجمعة"],
        muk: n % 5 === 0,
        cs: "TEST_ONLY_" + n,
        perm: n % 2 ? ["2", 4] : [],
        leaves:
          n % 7
            ? []
            : [
                {
                  fd: "1",
                  fm: 1,
                  td: 3,
                  tm: "1",
                  fy: 1448,
                  ty: "1448",
                  kind: "TEST_ONLY leave",
                },
              ],
      };
      oldMonth[employee.eid] = {
        shift: shifts[(n + 1) % shifts.length].name,
        rest: [],
        perm: {},
        leaves: {},
        muk: false,
        cs: "",
      };
    });
    monthly.__shifts = cloneOperationsFixture(shifts);
    const assigned = list.slice(0, 2).map((e) => e.eid);
    const floor = {
      sid: "TEST_ONLY_SITE_" + i,
      name: "TEST_ONLY site " + i,
      num: i + 1,
      iid: null,
      imgW: 1000,
      imgH: 800,
      mpu: 0.5,
      approved: true,
      chip: "",
      chipTone: "ok",
      showCodes: true,
      dens: null,
      zones: [
        {
          uid: "TEST_ONLY_ZONE_" + i,
          eid: "TEST_ONLY_OLD_ZONE_" + i,
          code: "Z01",
          ser: "01",
          kind: "TEST_ONLY",
          d: "M0 0L100 0L0 100Z",
          cx: 33,
          cy: 33,
          rawA: 5000,
          yard: "",
          region: "TEST_ONLY region",
          level: "TEST_ONLY level",
          ztype: "TEST_ONLY type",
          zcat: "TEST_ONLY category",
          pri: "أ",
          off: false,
          hideLabel: false,
          needN: 2,
          needS: { [shifts[1].name]: 0 },
          emp: assigned.slice(),
          count: null,
          pc: { fajr: 0, isha: null },
          hs: [
            { in: { x: -1, y: 0 }, out: { x: 1, y: 0 } },
            { out: { x: 0, y: 1 } },
          ],
        },
      ],
      gates: [
        {
          uid: "TEST_ONLY_GATE_" + i,
          eid: "TEST_ONLY_OLD_GATE_" + i,
          x: 5,
          y: 6,
          label: "TEST_ONLY gate",
          num: "01",
          hideLabel: false,
          hideNum: false,
          loc: "TEST_ONLY location",
          gtype: "TEST_ONLY gate type",
          kind: "",
          route: "",
          cls: "",
          pri: "",
          gid: "TEST_ONLY_PARENT",
          pOf: "TEST_ONLY_PARENT",
          leafNo: 1,
          leafN: 2,
          uniNeed: false,
          needN: 1,
          needS: {},
          cats: ["TEST_ONLY category", ""],
          emp: [],
          closed: false,
        },
      ],
      marks: [
        {
          uid: "TEST_ONLY_MARK_" + i,
          eid: "TEST_ONLY_OLD_MARK_" + i,
          x: 20,
          y: 30,
          label: "TEST_ONLY mark",
          kind: "TEST_ONLY kind",
          pri: "",
          off: false,
          hideLabel: true,
          needN: null,
          needS: {},
          emp: [],
        },
      ],
      paths: [
        {
          uid: "TEST_ONLY_PATH_" + i,
          id: "TEST_ONLY_OLD_PATH_" + i,
          name: "TEST_ONLY path",
          code: "P01",
          type: "in",
          dir: "fwd",
          line: "dash",
          w: "thin",
          active: true,
          anim: false,
          hideLabel: true,
          pts: [
            { x: 0, y: 0 },
            { x: 20, y: 30 },
          ],
        },
      ],
      sectors: [
        {
          id: "TEST_ONLY_SECTOR_" + i,
          code: "N01",
          name: "TEST_ONLY sector",
          cat: "",
          color: "#123456",
          lead: "",
          note: "",
          showLbl: false,
          pts: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 0, y: 100 },
          ],
          emp: assigned.slice(0, 1),
        },
      ],
      hideSectors: false,
    };
    const historical = cloneOperationsFixture(floor);
    historical.name += " historical";
    historical.zones[0].emp = [];
    const round = cloneOperationsFixture(floor),
      approved = cloneOperationsFixture(floor);
    round.zones[0].pc.fajr = 3;
    round.gates[0].closed = true;
    round.gates[0].cWhy = "TEST_ONLY closure";
    round.gates[0].cAt = "07:30";
    round.gates[0].cAtMs = 1;
    round.gates[0].cBy = "TEST_ONLY actor";
    round.gates[0].fst = "closed";
    round.gates[0].flow = "in";
    round.gates[0].fAt = 1;
    round.gates[0].fBy = "TEST_ONLY actor";
    round.gates[0].fKind = "gates";
    round.gates[0].fLog = [
      {
        at: 1,
        st: "closed",
        flow: "in",
        by: "TEST_ONLY actor",
        why: "TEST_ONLY closure",
        kind: "gates",
      },
      {
        at: 2,
        a: "TEST_ONLY assignment",
        by: "TEST_ONLY actor",
        kind: "gates",
      },
    ];
    const documents = {
      bassam_staffing_v3: { "1448-01": oldMonth, "1448-1": monthly },
      bassam_staffing_v2:
        i === 0
          ? cloneOperationsFixture(oldMonth)
          : { "1448-1": cloneOperationsFixture(monthly) },
      bassam_staffing_snap_v1: {
        "1448-1": { bucket: cloneOperationsFixture(oldMonth) },
      },
      bassam_staffing_locks_v1: { "1448-01": true, "1448-1": { mo: 1 } },
      bassam_callsigns_v1: ["TEST_ONLY_A", "", "TEST_ONLY_A"],
      bassam_perm_limit_v1: i === 0 ? "7" : 7,
      bassam_shift_options_v1: cloneOperationsFixture(shifts),
      bassam_plan_v1: {
        pMig: 3,
        zones: cloneOperationsFixture(floor.zones),
        gates: [],
        marks: [],
        paths: [],
        floors: [floor],
        months: {
          "1448-01": [historical],
          "1448-1": { c: 1, mo: 1, d: [cloneOperationsFixture(floor)] },
        },
        cfg: {},
        delMonths: { "1447-12": 0 },
      },
      bassam_zone_opts_v1: {
        region: ["TEST_ONLY old region", { n: "TEST_ONLY region", c: "R" }],
        level: [{ n: "TEST_ONLY level", c: "L", r: "TEST_ONLY region" }],
        ztype: [{ n: "TEST_ONLY type", k: "T", c: ["TEST_ONLY category"] }],
        zcat: [
          "TEST_ONLY old category",
          { n: "TEST_ONLY category", r: "TEST_ONLY type" },
          { n: "TEST_ONLY attached", c: ["A", "B"] },
        ],
        hMig: 3,
        zcatStyle: {
          "TEST_ONLY type|TEST_ONLY category": {
            f: "#123456",
            s: "#654321",
            sAuto: false,
            o: 50,
            bs: "dash",
            bw: 1,
            h: "none",
            hc: "",
            hw: 0.3,
            hg: 1.6,
          },
        },
      },
      bassam_gate_opts_v1: {
        loc: ["TEST_ONLY location"],
        gtype: ["TEST_ONLY gate type"],
        kind: [],
        route: [],
        cls: [],
        cat: ["TEST_ONLY category"],
      },
      bassam_mark_kinds_v1: ["TEST_ONLY kind", "", "TEST_ONLY kind"],
      bassam_rounds_v1: {
        __pMig: 2,
        "m:1448-1": { ap: 0, mo: 1, dopen: { 2: 1 }, dshut: { 3: 1 } },
        "1448-1-2": {
          t: 1,
          ap: 0,
          auto: 1,
          from: "1448-1-1",
          synced: 1,
          d: [round],
          shAp: {
            [shifts[0].name]: {
              ap: 1,
              at: "07:30",
              snap: [approved],
              byRep: 1,
            },
            [shifts[1].name]: { ap: 0 },
          },
          mvLog: [
            {
              t: "07:00",
              kind: "gates",
              key: list[0].eid,
              tok: list[0].eid,
              fromI: -1,
              toI: 0,
              fromLbl: "",
              toLbl: "TEST_ONLY gate",
              by: "TEST_ONLY actor",
              name: list[0].name,
            },
          ],
        },
        "1448-1-2-legacy": { t: 1, d: [] },
      },
      bassam_dayshift_v1: { "1448-1-2": shifts[0].name },
      bassam_dayfocus_v1: { d: 2, m: 1, y: 1448 },
    };
    result.byDepartment[department] = { employees: list, documents };
    for (const [resource, value] of Object.entries(documents))
      result.documents["bsdept:" + department + ":" + resource] = value;
  }
  return result;
}
