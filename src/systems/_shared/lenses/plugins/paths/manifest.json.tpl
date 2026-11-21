{
 "schema": 1,
 "kind": "lens",
 "key": "paths",
 "name": "المسارات",
 "label": "عدسة المسارات",
 "order": 2,
 "owner": "lens.paths",
 "hosts": [@@SYS:lens.hosts.plan@@@@SYS:lens.hosts.daily@@],
 "keys": {
  "own": ["lens.paths.enable", "lens.paths.view", "lens.paths.create", "lens.paths.edit", "lens.paths.geometry.edit", "lens.paths.status.change", "lens.paths.delete"],
  "managedRefs": [],
  "reserved": ["lens.paths.kpi.view", "lens.paths.report.view"]
 },
 "resources": {
  "column": {
   "name": "paths",
   "seq": 4,
   "hideFlag": "hidePaths",
   "identity": "builtin:paths",
   "geometry": ["pts"],
   "editKey": "lens.paths.edit",
   "status": {
    "fields": ["active"],
    "op": "lens.paths.status.change"
   }
  }
 },
 "guards": {
  "enable": "lens.paths.enable",
  "resources": [@@SYS:lens.res|sep=", "@@]
 },
 "tests": ["tests/unit/plugins.test.mjs", "cfbench/k256perm.mjs", "cfbench/p41scope.mjs", "cfbench/p41term.mjs"]
}
