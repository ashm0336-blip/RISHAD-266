{
 "schema": 1,
 "kind": "lens",
 "key": "zones",
 "name": "المصليات",
 "label": "عدسة المصليات",
 "order": 1,
 "owner": "lens.zones",
 "hosts": [@@SYS:lens.hosts.plan@@@@SYS:lens.hosts.daily@@],
 "keys": {
  "own": ["lens.zones.enable", "lens.zones.view", "lens.zones.create", "lens.zones.data.edit", "lens.zones.geometry.edit", "lens.zones.status.change", "lens.zones.delete", "lens.zones.indicators.view", "ref.zone.type.view", "ref.zone.type.create", "ref.zone.type.edit", "ref.zone.type.delete"],
  "managedRefs": [],
  "reserved": ["lens.zones.report.view"]
 },
 "resources": {
  "column": {
   "name": "zones",
   "seq": 1,
   "hideFlag": "hideZones",
   "identity": "builtin:zones",
   "geometry": ["d", "hs", "cx", "cy", "rawA", "kind", "unp"],
   "editKey": "lens.zones.data.edit",
   "status": {
    "fields": ["fst", "flow", "fAt", "fBy", "fKind", "fLog", "closed", "off", "cAt", "cAtMs", "cWhy", "cBy"],
    "op": "lens.zones.status.change"
   },
   "derived": ["cap"]
  },
  "indicators": [@@SYS:lens.ind.zones.daily@@]
 },
 "guards": {
  "enable": "lens.zones.enable",
  "resources": [@@SYS:lens.res.plan@@"bassam_rounds_v1"]
 },
 "tests": ["tests/unit/plugins.test.mjs", "cfbench/k256perm.mjs", "cfbench/p41scope.mjs", "cfbench/k243ops.mjs"]
}
