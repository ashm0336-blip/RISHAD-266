/* V7 UX states — the display-only tab field (pages.json `shellTabs`: «مستودع العهد» for the fixed header) must not enter the permission
   tree, the registry or the server. Proof against develop@5add483, by digests recorded from that commit (no git needed to run):
     · pages.json without `shellTabs` is, value for value, develop's pages.json — everything the tree is built from is unchanged;
     · the registry (source JSON and its generated client block) is byte-identical to develop's, and still has its 255 active keys;
     · the server's page structure (PG_REG in the worker) is develop's text and knows nothing of the field;
     · no code reads `shellTabs` but the page-states component (the shell header).
   Digests were taken with: git show 5add483:<file> | sha256sum — and, for pages.json, the canonical JSON (sorted keys, no spaces). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { needs } from './harness.mjs';

const ROOT = new URL('../../', import.meta.url).pathname, read = (p) => fs.readFileSync(path.join(ROOT, p));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const DEVELOP = {
  pages: '5b61666d77701f2043360bc4a83d4db6408fece898b802c69e0ad54188857528',
  /* V7 · د5-ح (القفل): السجلُّ وPG_REG بعد حذف ورقة «قوالب الصلاحيات» ومفاتيحِ tpl.* الخمسة (وحدها — v7_d5h_deleted_residue) */
  registryJson: 'd7902f2507161e3a13be7ae811494fe671aab04abcec62e9d0944debf05e66d3',
  registryBlock: 'c23c0f7a43edafd6f47d04d2b3299c7f3d31855dcdfef0f1af0e0abba60197c3',
  serverPages: 'b1301f52ef6ade487c101cd90bdd431f67763a614e109556d426bf3e60785d34',
};

test('pages.json without the display-only field is develop\'s pages.json; the field sits on one page and names a leaf that exists', needs('award', 'custody', 'dstats', 'seized', 'tasks'), () => {
  const M = JSON.parse(read('src/manifests/pages.json')), withField = M.pages.filter((p) => p.shellTabs);
  /* V7 · د5-ح: وحقلٌ على «الإعدادات» — تبويبُ «الصلاحيات» الذي ترسمه الصفحةُ لمدير الوحدة (when: unitMgr = KIVO.Perm44.unitMgr)، لا ورقةَ له في الشجرة */
  assert.deepEqual(withField.map((p) => p.key).sort(), ['admin', 'emps']);
  const emps = withField.find((p) => p.key === 'emps'), adm = withField.find((p) => p.key === 'admin');
  assert.deepEqual(emps.shellTabs, [{ name: 'مستودع العهد', as: 'custody' }]);
  assert.ok(emps.subs.some((s) => s.key === 'custody' && !s.offPage), 'it follows an existing leaf of its page');
  assert.deepEqual(adm.shellTabs, [{ name: 'الصلاحيات', when: 'unitMgr', tab: 'perm' }]);
  assert.ok(!adm.subs.some((s) => s.key === 'perm'), 'the manager tab is not a permission leaf');
  /* V7 · د1-د: حقلُ عرضٍ ثانٍ — noTab على ورقةٍ واحدة (admin/import: ورقةُ صلاحيةٍ باقية بلا تبويبٍ مرسوم بعد نقل الاستيراد إلى صفحة الموظفين) */
  const noTab = M.pages.flatMap((p) => (p.subs || []).filter((x) => x.noTab !== undefined).map((x) => p.key + '/' + x.key + '=' + x.noTab));
  /* V7 · د5-ح (القفل): ورقةُ admin/ptpls حُذفت من pages.json مع موردها — الترحيلُ perm44-roles يقرأ القوالبَ خاماً من D1 */
  assert.deepEqual(noTab, ['admin/import=true']);
  for (const p of M.pages) { delete p.shellTabs; for (const x of p.subs || []) delete x.noTab; }
  delete M.$comment;   /* V7 · د5-ح: ترويسةُ «ملف مولَّد» (tools/systems.py) — تعليقٌ لا قيمة */
  /* V7 · د5-ح: تُعاد الورقةُ المحذوفة (admin/ptpls بعد shifts) فيطابق الباقي pages.json على develop بايتاً */
  M.pages.find((p) => p.key === 'admin').subs.splice(3, 0, { key: 'ptpls', name: 'قوالب الصلاحيات' });
  assert.equal(sha(Buffer.from(canon(M))), DEVELOP.pages, 'every other value of pages.json is as on develop');
});

test('the permission registry is the pinned one: develop minus the five tpl.* keys (250 active keys)', needs('award', 'custody', 'dstats', 'irshad', 'seized', 'tasks'), () => {
  assert.equal(sha(read('src/permissions/registry/registry-v24.9.json')), DEVELOP.registryJson);
  assert.equal(sha(read('src/permissions/340-registry-v24-9.js')), DEVELOP.registryBlock);
  const R = JSON.parse(read('src/permissions/registry/registry-v24.9.json'));
  assert.equal(R.registry.filter((k) => k.status === 'active').length, 250); assert.equal(R.counts.securityActive, 250); assert.equal(R.registry.length, 264);
  assert.ok(!R.registry.some((k) => /^tpl\./.test(k.key)), 'tpl.* removed');
});

test('the server page structure (PG_REG) is develop\'s and does not carry the field', needs('award', 'custody', 'dstats', 'seized', 'tasks'), () => {
  const W = read('workers/_worker.js').toString('utf8'), m = /(?:const|var|let) PG_REG\s*=\s*(\[[\s\S]*?\]);\n/.exec(W);
  assert.ok(m, 'PG_REG found'); assert.equal(sha(Buffer.from(m[1])), DEVELOP.serverPages);
  assert.equal(W.includes('shellTabs'), false);
});

test('only the shell header reads the field: no permission, auth, scope or module code mentions it', needs('custody'), () => {
  const hits = [], hits2 = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = dir + '/' + f.name;
      if (f.isDirectory()) { if (rel !== 'src/pages') walk(rel); continue; }
      if (/\.(js|html|json)$/.test(f.name) && read(rel).includes('shellTabs')) hits.push(rel);
      if (/\.(js|html|json)$/.test(f.name) && read(rel).includes('noTab')) hits2.push(rel);
    }
  })('src');
  /* V7 · د4-ج: تصريحُ التبويب نفسُه («مستودع العهد» في صفحة الموظفين) صار قطعةً في تعريف نظام العهد تُحقن في pages.json — ملفُّ تصريحٍ لا كودَ يقرأ الحقل */
  assert.deepEqual(hits.sort(), ['src/components/555-page-states.js', 'src/manifests/255-page-manifest.js', 'src/manifests/pages.json', 'src/schemas/pages.schema.json', 'src/systems/custody/system.json']);
  assert.deepEqual(hits2.sort(), ['src/components/555-page-states.js', 'src/manifests/255-page-manifest.js', 'src/manifests/pages.json', 'src/schemas/pages.schema.json'], 'noTab: the same four files only');
});
