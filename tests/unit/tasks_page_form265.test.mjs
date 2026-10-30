/* KIVO_265 · طلبُ المالك 2026-10-20: تصميمُ نافذة «مهمة جديدة / تعديل مهمة» — حارسُ البنية:
     · رأسٌ وجسمٌ يتمرّر وتذييلٌ ثابت يحمل «إنشاء المهمة» و«إلغاء» (الزرُّ ظاهرٌ دائماً ولو طال النموذج)
     · أبناءُ الجسم لا ينكمشون (flex-shrink:0) — كانت «إعدادات متقدمة» تنكمش إلى 2px حين يطول النموذج (الإسنادُ الموجَّه مفتوح) فلا تُفتح
     · ورقةٌ بملء الشاشة على الجوال · الأقسامُ الثلاثة وبطاقةُ الإعدادات المتقدمة · لا ربطَ ضاع من النموذج القديم */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.env.KIVO_SRC || path.resolve('src');
const view = fs.readFileSync(path.join(SRC, 'modules', 'tasks', 'view.html'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'modules', 'tasks', 'helmet.css'), 'utf8');
const modal = view.slice(view.indexOf('<sc-if value="{{newTaskOpen}}"'), view.indexOf('</sc-if>', view.indexOf('<div class="tkf-ft">')) + 8);

test('نافذة «مهمة جديدة»: رأسٌ · جسمٌ يتمرّر · تذييلٌ ثابت بزرّي الحفظ والإلغاء', () => {
  assert.ok(modal.includes('class="tkf-ov"') && modal.includes('class="tkf"') && modal.includes('role="dialog"'), 'الغلاف');
  const hd = modal.indexOf('class="tkf-hd"'), bd = modal.indexOf('class="tkf-bd"'), ft = modal.indexOf('class="tkf-ft"');
  assert.ok(hd > 0 && bd > hd && ft > bd, 'الترتيب: رأس ⇒ جسم ⇒ تذييل');
  const foot = modal.slice(ft);
  assert.match(foot, /onClick="\{\{submitTask\}\}"[^>]*class="tkf-pri"/); assert.match(foot, /onClick="\{\{closeNewTask\}\}"[^>]*class="tkf-sec2"/);
  assert.equal((modal.match(/<section class="tkf-sec">/g) || []).length, 3, 'ثلاثة أقسام'); assert.ok(modal.includes('class="tkf-adv"'), 'بطاقة الإعدادات المتقدمة');
  for (const b of ['newTitle', 'onNewTitle', 'newDesc', 'onTkStartDay', 'onTkEndDay', 'tkTpSToggle', 'tkTpEToggle', 'tkTpSOpts', 'tkTpEOpts', 'tkTpApply', 'onTkTpKey', 'onTkTpQ', 'tkDurTxt', 'tkRecTypes', 'prioOpts', 'asgOpts', 'advToggle', 'advOpen', 'modalBtnLabel', 'modalTitle'])
    assert.ok(modal.includes('{{' + b), 'الربط باقٍ: ' + b);
});

test('الأنماط: أبناءُ الجسم لا ينكمشون · الجسمُ يتمرّر · ورقةٌ بملء الشاشة على الجوال · رموزٌ دلالية', () => {
  assert.match(css, /\.tkf-bd>\*\{flex-shrink:0\}/, 'حارسُ الانكماش');
  assert.match(css, /\.tkf-bd\{[^}]*flex:1;min-height:0;overflow-y:auto/);
  assert.match(css, /\.tkf\{[^}]*max-height:calc\(100dvh - 48px\)/);
  assert.match(css, /@media \(max-width:640px\)\{[^\n]*\.tkf\{[^}]*height:100dvh/);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css.slice(css.indexOf('.tkf-ov'))), 'لا لونَ حرفيّاً في أنماط النافذة');
});
