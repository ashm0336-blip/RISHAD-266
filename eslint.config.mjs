// KIVO · AUD-014 — ESLint (قواعدُ السلامة المختارة في SOT: eqeqeq · no-empty · no-unused-vars · no-undef) على المصدر الحيّ.
// لا يُفشل البناءَ اليوم إلا عند تجاوز الخط الأساسي (tests/baselines/baseline.json — «السقّاطة»: العددُ لا يزيد، ويُنقَص تدريجياً).
// KIVO_251 · ADR-012: الشجرةُ المستهدفة في الجذر (src/ · workers/parts) — KIVO_SRC=k2NN/src يعيد التخطيطَ الانتقالي.
import globals from 'globals';
import fs from 'node:fs';
const legacy = process.env.KIVO_SRC;   // k2NN/src
const browserGlobals = { ...globals.browser, React: 'readonly', ReactDOM: 'readonly', DCLogic: 'readonly', StreamableLogic: 'readonly', Component: 'writable', fflate: 'readonly', KIVO_REGISTRY: 'readonly', KIVO_REGISTRY_DATA: 'readonly', KIVO_MANIFEST: 'readonly', KIVO: 'readonly' };   /* KIVO_258 · AUD-016: الفضاءُ العام الواحد (005-kivo-ns — غيرُ قابلٍ للكتابة) */
const rules = { eqeqeq: ['warn', 'always', { null: 'ignore' }], 'no-empty': ['warn', { allowEmptyCatch: true }], 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }], 'no-undef': 'warn', 'no-redeclare': 'warn', 'no-dupe-keys': 'error', 'no-unreachable': 'warn', 'no-fallthrough': 'warn' };
const workerRules = { eqeqeq: ['warn', 'always', { null: 'ignore' }], 'no-empty': ['error', { allowEmptyCatch: false }],   /* KIVO_250 · AUD-021: لا catch فارغاً في الخادم — swallow('وسم', e) */
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }], 'no-dupe-keys': 'error', 'no-unreachable': 'warn' };
const generated = ['010-react.js', '020-react-dom.js', '030-pages-loader.js', '340-registry-v24-9.js', '255-page-manifest.js'];
export default legacy ? [
  { ignores: ['**/node_modules/**', 'pk*/**', '**/*.min.js', ...generated.map(f => legacy + '/client/js/' + f), legacy + '/workers/parts/051a-schema-migrations.js', legacy + '/client/pages/**', legacy + '/root/**'] },
  { files: [legacy + '/client/js/*.js', legacy + '/shell/xdc/*.js', legacy + '/modules/*/logic*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: browserGlobals }, rules },
  { files: [legacy + '/workers/parts/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.serviceworker, ...globals.es2021 } }, rules: workerRules },
] : [
  /* KIVO_252: الخادمُ يُفحص مضموماً (workers/_worker.js = ضمُّ الأجزاء بايتاً) لا جزءاً جزءاً — فالدالةُ المعرَّفة في جزءٍ والمستعملة في آخر ليست «غيرَ مستعملة»؛ الأجزاءُ نفسُها تبقى المصدر */
  { ignores: ['**/node_modules/**', 'pk*/**', '**/*.min.js', 'src/systems/*/server/**', 'src/systems/*/tests/**', 'src/core/010-react.js', 'src/core/020-react-dom.js', 'src/core/030-pages-loader.js', 'src/permissions/340-registry-v24-9.js', 'src/manifests/255-page-manifest.js', 'workers/parts/**', 'src/pages/**', 'k2*/**', 'cfbench/**', 'lab/**'] },
  { files: ['src/{core,layouts,components,services,i18n,api,auth,permissions,manifests}/*.js', 'src/modules/*/logic*.js', 'src/systems/*/client/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: browserGlobals }, rules },
  { files: ['workers/_worker.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.serviceworker, ...globals.es2021, HTMLRewriter: 'readonly' } }, rules: { ...workerRules, 'no-undef': 'error' } },
];
