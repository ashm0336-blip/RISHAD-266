/* Explicit synthetic Operations contract; no browser/network/Worker. */
import assert from "node:assert/strict";
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function operations(initial = {}) {
  const data = clone(initial),
    revs = Object.fromEntries(Object.keys(initial).map((k) => [k, 1])),
    entries = new WeakMap(),
    tickets = new Map();
  const control = {
    mode: "ok",
    gate: null,
    stages: [],
    sends: [],
    edits: 0,
    context: { uid: "TEST_ONLY_UID", dept: "TEST_ONLY_DEPT", generation: 0 },
  };
  const service = {
    resources: Object.keys(initial),
    context: () => clone(control.context),
    get: (name) => {
      if (!(name in data)) throw Error("operations-read-required");
      return clone(data[name]);
    },
    draft() {
      const context = JSON.stringify(control.context),
        base = { ...revs },
        changes = {};
      function check(name) {
        if (
          context !== JSON.stringify(control.context) ||
          !(name in base) ||
          base[name] !== revs[name]
        )
          throw Error("operations-draft-review-required");
      }
      return {
        get(name) {
          check(name);
          return name in changes ? clone(changes[name]) : service.get(name);
        },
        set(name, value) {
          check(name);
          changes[name] = clone(value);
        },
        stage() {
          if (control.validate) control.validate(changes);
          const ticket = Object.freeze({
              requestId: "TEST_ONLY_REQ_" + (control.stages.length + 1),
            }),
            record = { changes: clone(changes), state: "staged" };
          tickets.set(ticket, record);
          control.stages.push({ ticket, body: JSON.stringify(changes) });
          return ticket;
        },
      };
    },
    begin(owner, action) {
      let map = entries.get(owner);
      if (!map) {
        map = {};
        entries.set(owner, map);
      }
      if (
        map[action]?.ticket &&
        tickets.get(map[action].ticket)?.state === "uncertain"
      )
        return { ok: 0, err: "pending" };
      map[action] = { draft: service.draft() };
      return { ok: 1 };
    },
    async commit(owner, action, intent, edit) {
      let map = entries.get(owner);
      if (!map?.[action]) {
        service.begin(owner, action);
        map = entries.get(owner);
      }
      const entry = map[action],
        signature = JSON.stringify(intent);
      if (entry.ticket) {
        if (entry.intent !== signature)
          return {
            ok: 0,
            err: "review-required",
            uncertain: true,
            ticket: entry.ticket,
          };
      } else {
        control.edits++;
        edit(entry.draft);
        entry.ticket = entry.draft.stage();
        entry.intent = signature;
      }
      const result = await (entry.result?.uncertain
        ? service.retry(entry.ticket)
        : service.flush(entry.ticket));
      entry.result = result;
      if (result.ok === 1) delete map[action];
      return { ...result, ticket: entry.ticket };
    },
    async flush(ticket) {
      const record = tickets.get(ticket);
      assert.ok(record);
      if (record.state === "sending")
        return { ok: 0, err: "pending", status: 409, uncertain: false };
      record.state = "sending";
      control.sends.push(ticket);
      if (control.gate) await control.gate;
      const mode = control.mode;
      if (mode !== "ok") {
        record.state = mode;
        return {
          ok: 0,
          err: mode,
          status: mode === "denied" ? 403 : mode === "conflict" ? 409 : 0,
          uncertain: mode === "uncertain",
        };
      }
      for (const [name, value] of Object.entries(record.changes)) {
        data[name] = clone(value);
        revs[name]++;
      }
      record.state = "confirmed";
      return { ok: 1 };
    },
    async retry(ticket) {
      return service.flush(ticket);
    },
    status: (ticket) => ({ state: tickets.get(ticket)?.state || "idle" }),
  };
  return { service, data, revs, control };
}
export const floor = () => ({
  sid: "TEST_ONLY_SITE",
  name: "TEST_ONLY site",
  num: 0,
  iid: "img_test_original",
  zones: [],
  gates: [
    {
      uid: "TEST_ONLY_GATE",
      x: 1,
      y: 2,
      loc: "TEST_ONLY loc",
      emp: ["TEST_ONLY_EMP"],
    },
  ],
  marks: [],
  paths: [],
});
