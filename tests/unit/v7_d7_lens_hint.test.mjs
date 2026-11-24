/* V7 · د7 (52 · قرار المالك ٣) — الدورُ الذي ليس فيه صفٌّ لعدسةٍ يأخذ مستوى نظامها المضيف؛ ولمنع عدسةٍ وحدها «مخصّص» بلا أفعال.
   يُثبت أن محرّر الأدوار يقول ذلك بنصٍّ قصير في كتلة عدسات الدور (المصدر · الصفحة المولَّدة · البناء) — ولا يظهر في كتلة عدسات «الأنظمة». */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const HINT = 'لمنعها وحدها: «مخصّص» بلا أفعال';
const TIP = 'لمنع عدسةٍ وحدها: «مخصّص» بلا أفعال';

function roleBlock(html) {
  const a = html.indexOf('aria-label="تفعيل {{s.n}} لهذا الدور"');
  assert.ok(a > 0, 'صفُّ نظام الدور موجود');
  const b = html.indexOf('</ul></li></sc-if>', a);
  assert.ok(b > a, 'كتلةُ عدسات الدور موجودة');
  return html.slice(a, b);
}

for (const rel of ['src/modules/org/view.html', 'src/pages/Org.dc.html']) {
  test(`تلميحُ «مخصّص بلا أفعال» في عدسات محرّر الأدوار — ${rel}`, () => {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const blk = roleBlock(html);
    assert.ok(blk.includes(HINT), 'النصُّ الظاهر تحت عدسات الدور');
    assert.ok(blk.includes(TIP), 'التلميحُ عند التمرير');
    const sysAt = html.indexOf('<!-- V7 · د7 (أ): عدساتُ النظام المضيف تحته');
    assert.ok(sysAt > 0);
    const sysBlk = html.slice(sysAt, html.indexOf('</ul></li></sc-if>', sysAt));
    assert.equal(sysBlk.includes(HINT), false, 'لا يظهر في كتلة عدسات «الأنظمة»');
  });
}
