"""Real source audit tools on an isolated synthetic module checkout; no network."""
import importlib.util,json,pathlib,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
def load(name):
 spec=importlib.util.spec_from_file_location('audit_'+name,ROOT/'tools'/f'{name}.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
class SourceAudits(unittest.TestCase):
 def setUp(self):
  cache=ROOT/'.cache';cache.mkdir(exist_ok=True);self.temp=tempfile.TemporaryDirectory(prefix='source-audit-',dir=cache);self.root=pathlib.Path(self.temp.name).resolve();self.assertTrue(self.root.is_relative_to(cache.resolve()));self.addCleanup(self.temp.cleanup)
 def put(self,name,value):
  p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value)if not isinstance(value,str)else value,encoding='utf-8')
 def test_module_writer_preserves_declared_ownership_without_optional_historical_gate(self):
  m=load('module_charter');m.ROOT=str(self.root);m.deps_check.ROOT=str(self.root);m.deps_check.SRC=str(self.root/'src')   # schema10 shared_data: dependency graph from the same synthetic checkout
  self.put('src/modules/modules.json',{'pages':[{'slug':'plan'}]});self.put('src/manifests/perm-tree24.json',{'containers':[{'leaves':[{'owner':'plan','page':'plan'}]}]})
  self.put('src/modules/plan/logic.js','class Component {}');self.put('src/modules/plan/view.html','<div></div>');self.put('tests/unit/declared.test.mjs','// Explicit ownership fixture');self.put('src/api/280-server-storage.js',"var operationResources9 = Object.freeze(['bassam_plan_v1']);")
  self.put('src/modules/plan/meta.json',{'charter':{'owner':'TEST_ONLY owner','purpose':'TEST_ONLY purpose','tests':['gate:historical.mjs','tests/unit/declared.test.mjs']}})
  self.assertEqual(m.main(['--write']),0);out=json.loads((self.root/'src/modules/plan/meta.json').read_text());self.assertEqual(out['charter']['tests'],['gate:historical.mjs','tests/unit/declared.test.mjs']);self.assertEqual(out['charter']['owner'],'TEST_ONLY owner');self.assertEqual(m.main(['--check']),0)
  self.put('gateall265.sh','# historical.mjs — inventory survives without its optional cfbench directory')
  self.assertTrue(m.gate_files());self.assertEqual(m.main(['--write']),0);out=json.loads((self.root/'src/modules/plan/meta.json').read_text());self.assertEqual(out['charter']['tests'],['gate:historical.mjs','tests/unit/declared.test.mjs']);self.assertEqual(m.main(['--check']),0)
 def test_ux_inventory_includes_declared_shared_logic_and_async_error_path(self):
  m=load('ux_states');m.ROOT=str(self.root)
  self.put('src/modules/first/meta.json',{'name':'TEST_ONLY page','logicParts':['../shared.js']});self.put('src/modules/first/logic.js','class Component {}');self.put('src/modules/first/view.html','<div></div>');self.put('src/modules/shared.js','async function load(){try {await read();}catch (error){return false;}}');self.put('src/modules/first/logic-unreferenced.js','// تعذّر تعذّر تعذّر')
  title,counts=m.count('first');self.assertEqual(title,'TEST_ONLY page');self.assertEqual(counts['خطأ'],1,'Only the declared shared async error path is counted, not an unused filename match')
 def test_ux_unified_states_rule_reports_outside_the_component_and_honours_the_allow_list(self):
  m=load('ux_states')
  self.put('src/components/555-page-states.js','var STR={retry:"أعد المحاولة"};// bs-skel');self.put('src/components/550-bassam-busy.js','start("جارٍ تحميل الملف")')
  self.put('src/modules/first/meta.json',{'name':'TEST_ONLY first'});self.put('src/modules/first/logic.js','class Component { r(){ return "جارٍ قراءة البيانات من الخادم"; } s(){ return "تعذّر الحفظ؛ مسودتك باقية، أعد المحاولة"; } }')
  self.put('src/modules/first/view.html','<i class="bs-skel"></i><button>أعد المحاولة</button><button>تحميل المزيد</button><span>جارٍ الحفظ…</span>')
  self.put('src/modules/second/meta.json',{'name':'TEST_ONLY second'});self.put('src/modules/second/logic.js','class Component { v(){ return KIVO.PageStates.host(el,{}); } }')
  self.put('src/manifests/pages.json',{'pages':[{'key':'first','module':'first'},{'key':'second','module':'second'},{'key':'links'},{'key':'ghost'}]})
  found=m.unified_report(str(self.root));got=sorted((rule,rel) for rule,rel,_line,_text in found)
  self.assertEqual(got,[('U1','src/modules/first/logic.js'),('U2','src/modules/first/view.html'),('U3','src/modules/first/view.html'),('U4','src/manifests/pages.json'),('U4','src/modules/first')],'loading text, skeleton and retry button outside the component are reported; the component, operation progress, save sentences, «load more», users of the component and exempt pages are not')
  self.assertEqual(m.print_report.__defaults__,None);self.assertIn("print_report('--report' in sys.argv)",(ROOT/'tools'/'ux_states.py').read_text(encoding='utf-8'),'report mode: printed, never added to the failures')
if __name__=='__main__':unittest.main()
