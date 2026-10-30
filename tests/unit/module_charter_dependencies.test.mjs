import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { PYTHON } from "./harness.mjs";

function python(program) {
  const result = spawnSync(
    PYTHON,
    [
      "-c",
      "import sys,json;sys.path.insert(0,'tools');import module_charter as M\n" +
        program,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}
test("Operations literal flow respects lexical block bindings and function-scoped var", () => {
  const data = python(String.raw`cases={
 'let-shadow':"(function(){var K='bassam_plan_v1';{let K='bassam_dayfocus_v1';localStorage.getItem(K);}return KIVO.__BS_SRV.operations.get(K);})();",
 'var-binding':"(function(){var K='bassam_plan_v1';{var K='bassam_staffing_v3';}return KIVO.__BS_SRV.operations.get(K);})();",
 'const-return':"(function(){const K='bassam_employees_v1';function service(){const S=KIVO.__BS_SRV.operations;return S;}service().get(K);})();"
}
print(json.dumps({name:sorted(keys)for name,keys in M.operation_literals(cases).items()}))`);
  assert.deepEqual(data, {
    "let-shadow": ["bassam_plan_v1"],
    "var-binding": ["bassam_staffing_v3"],
    "const-return": ["bassam_employees_v1"],
  });
});
for (const [slug, required] of [
  ["daily", ["bassam_mark_kinds_v1"]],
  ["seized", ["bassam_shift_options_v1"]],
  ["irshad", ["bassam_employees_v1", "bassam_shift_options_v1"]],
])
  test(
    "source-derived " +
      slug +
      " charter includes its actual shared Operations dependencies",
    () => {
      const data = python(
        "print(json.dumps(M.derive(" + JSON.stringify(slug) + ')["data"]))',
      );
      for (const resource of required)
        assert.ok(data.includes(resource), slug + " omitted " + resource);
      if (slug === "irshad")
        assert.ok(
          !data.includes("bassam_staffing_snap_v1"),
          "A no-op archive KEY is not an Operations read",
        );
      if (slug === "daily")
        assert.ok(
          !data.includes("bassam_dayfocus_v1"),
          "Device DayFocus must not become a cloud read",
        );
    },
  );
test("real dependency scanner follows shared-service cycles and literal reads without inheriting infrastructure registries", () => {
  const data = python(String.raw`import tempfile,pathlib,deps_check
with tempfile.TemporaryDirectory(prefix='rishad-charter-test-') as directory:
 root=pathlib.Path(directory);src=root/'src'
 files={
  'modules/simple/meta.json':json.dumps({}),
  'modules/simple/logic.js':"KIVO.RootShared.run();KIVO.Reflection.inspect();KIVO.__BS_SRV.operations.get('bassam_options_v1');",
  'modules/simple/view.html':'',
  'manifests/perm-tree24.json':json.dumps({'containers':[]}),
  'services/600-root.js':"KIVO.RootShared={run(){return KIVO.ChildShared.read()+KIVO.__BS_SRV.operations.get('bassam_staffing_v3');}};",
  'services/610-child.js':"/* 'bassam_gate_opts_v1' */ (function(){var K='bassam_plan_v1';function ops(){return KIVO.__BS_SRV.operations;}function J(k){return ops().get(k);}KIVO.ChildShared={read(){KIVO.RootShared.noop();return J(K);},KEY:'bassam_staffing_snap_v1'};})();(function(){var K='bassam_dayfocus_v1';localStorage.getItem(K);})();var label='Documentation about bassam_rounds_v1';",
  'services/620-unused.js':"KIVO.Unused={read(){return KIVO.__BS_SRV.operations.get('bassam_employees_v1');}};",
  'services/320-dept-storage.js':"KIVO.Reflection={inspect(){return KIVO.__BS_SRV.operations.resources;}};var registry=['bassam_tasks_v1','bassam_rounds_v1'];",
  'api/280-server-storage.js':"KIVO.__BS_SRV={operations:{}};var operationResources9=Object.freeze(['bassam_options_v1','bassam_staffing_v3','bassam_plan_v1','bassam_tasks_v1','bassam_dreport_v1','bassam_employees_v1','bassam_dayfocus_v1','bassam_staffing_snap_v1']);",
 }
 for relative,text in files.items():
  path=src/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8')
 M.ROOT=str(root);deps_check.SRC=str(src)
 print(json.dumps(M.derive('simple')['data']))
`);
  assert.deepEqual(data, [
    "bassam_options_v1",
    "bassam_plan_v1",
    "bassam_staffing_v3",
  ]);
  assert.ok(
    data.length < 21,
    "A simple page must not preload the complete Operations registry",
  );
});
