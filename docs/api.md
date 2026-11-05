# KIVO — عقود الواجهة البرمجية `/api/*` (KIVO_259 · المصدرُ المقروء آلياً `src/api/contracts.json` · الشرحُ أدناه منذ KIVO_244 ومحدَّثٌ بالفروق)

> **KIVO_255 (SOT-127 · SOT-100 · AUD-026)**: العقدُ المقروء آلياً في `src/api/contracts.json` (68 مساراً: الطرائق · مستوى الوصول · الجسم · مفاتيحُ الردّ لكل حالة)، و`tests/unit/api_contracts.test.mjs` يثبت أن قائمتَه = مساراتِ العامل حرفاً وأن الردودَ الفعلية (legacy وenforce) تحمل مفاتيحَ عقدها، وأن غيرَ العامّ بلا كوكي ⇒ 401 موحَّد. كلُّ ردّ يحمل `X-Kivo-Rid`، وكلُّ ردّ `/api/*` يحمل `Server-Timing: app;dur=<ms>`.

كل المسارات على الأصل نفسه (`same-origin`)؛ الطلبات المغيِّرة (POST/PUT/DELETE) يجب أن تحمل `Origin` مطابقاً أو `Sec-Fetch-Site ≠ cross-site`، وإلا 403 `{ok:0, err:'origin'}`. حدود الجسم: `/api/save` و`/api/dstats` و`/api/notifications/act` و`/api/irshad/act` و`/api/employees/transition` و`/api/backup/restore` حتى 8 MB؛ `/api/custody/act` و`/api/admin/dept-wipe` و`/api/admin/dept-delete` حتى 1 MB؛ `/api/img/*` حتى 512 KB؛ غيرها 64 KB (413). الردود JSON بـ`Cache-Control: no-store` وترويسات الأمن (`nosniff` · `X-Frame-Options: SAMEORIGIN` · HSTS خارج localhost). الجلسة بكوكي `bs_tok` (HttpOnly · Secure · SameSite=Lax).

مستويات الوصول: **عام** (بلا جلسة) · **جلسة** (أي حساب) · **فاعل** (جلسة + حساب قائم غير مجمَّد؛ تُفرض الصلاحيات والنطاق) · **مدير النظام** (`role=super`) · **إنفاذ** (يظهر فقط حين `KIVO_AUTHZ_MODE=enforce` — Preview). المسارات الإدارية (`presence · sec · sess/kill · guard · policy · overview · recovery · reset · permv2 · scope-dryrun · identity-*`) في وضع الإنفاذ لمدير النظام وحده (403 لغيره)؛ وفي النظام القديم بعضها مقصورٌ على `super` في معالجه وبعضها نطاقيّ (`scopeOk`: المستخدم نفسه أو مديرُ إدارته لموظفيها). العقود مثبتة في `tests/unit/api_contracts.test.mjs`.

| المسار | الطريقة | الوصول | الغرض | ملاحظات KIVO_244 |
|---|---|---|---|---|
| `/api/brand` | GET | عام | الهوية العامة لشاشة الدخول `{ok, brand, ver, rk}` | متاح حتى في وضع الحماية |
| `/api/ping` | GET | عام | نبض `{ok, cf, ver, fresh}`؛ في وضع الحماية يُضاف `ready:0, mode:'protect'` (KIVO_261 · ADR-025)؛ لمدير النظام يُضاف `users, rev, sess, schema, schemaDb, schemaOk, ready` (إصدارُ المخطّط المعروف والمختوم · KIVO_249) | AUD-004: لا أعداد بلا جلسة |
| `/api/recover` | POST | عام | استعادة دخول مدير النظام بمفتاح الاستعادة (`{key, pw}`) | محروس بحارس المحاولات |
| `/api/login` | POST | عام | `{u, p}` → `{ok, uid, role, deptId, mustChange}` + كوكي | قفل بعد 5 محاولات |
| `/api/logout` | GET / POST | عام | إنهاء الجلسة ومسح الكوكي (GET يعيد توجيهاً 303 إلى `/`؛ بلا جلسة: 200 عاطل) | متاح في وضع الحماية · POST بلا جسم (KIVO_264) |
| `/api/whoami` | GET | جلسة | `{ok, uid}` — جسّ الكوكي | |
| `/api/me` | GET | جلسة | جلساتي وأحداثي الأمنية (نطاق المستخدم نفسه) | |
| `/api/me/sess/kill` | POST | جلسة | إنهاءُ جلساتي الأخرى (كلِّها عدا الحالية) | بلا جسم: الفارغُ أو `{}` (KIVO_264 — كان معقوداً `{tok}` والمعالجُ لا يقرأ جسماً) |
| `/api/me/today` | GET | جلسة | «صفحتي» (KIVO_264 · OD-3): يومُ صاحب الجلسة من صفوفه وحدها — الهويةُ بمعرّفٍ ثابت (`ekey = eid` ثم `nid`، لا اسم) · الحقائق · الموقع (الرسمي المعتمد · تسكينُ اليوم · المسودة) · الزملاء بالاسم وحده (OD-4) · الأسبوع · إحصاءُ الشهر | قراءةٌ فقط (405 `read-only` لغير GET) · 120 طلباً/دقيقة لكل حساب للمسارين معاً (429) |
| `/api/me/history` | GET | جلسة | «السجل»: شهرٌ هجريّ `?ym=YYYY-M` (من 1400-1 إلى الشهر الجاري + 1؛ غيابُه = الشهرُ الجاري) من صفوف صاحب الجلسة وحدها، ولكل عنصرٍ فئةُ دليله | 400 `bad-ym` · ≤ 60 KB (يُقصّ `changes` أولاً ويُضاف `truncated:1`) · قراءةٌ فقط |
| `/api/me/tasks` | GET | جلسة | «مهامي» (KIVO_264 · P0 · KIVO-Tasks): صفوفُ صاحب الجلسة وحده في إدارته — العمودُ 14 = معرّفُه الثابت `eid` (أو رقمُ الهوية `nid` للحسابات القديمة قراءةً)، والمعرّفُ يحمله سجلٌّ واحدٌ وحده (SR-2.2 · F-1) — بلا `task.view` ولا صفوفِ زملاء؛ `?ym=` شهرُ «سجل مهامك» · `?since=` ردٌّ رخيص `{same:1}` · `?uid=` هويةُ التبويب (C1) | `me.linked=false` لحسابٍ بلا سجلّ · `me.off=1` وصفوفٌ فارغة حين لا تُفعَّل صفحةُ المهام للإدارة أو تُطفأ للمنصة (F-7) · 400 `bad-ym` · 409 `session-changed` |
| `/api/me/tasks/act` | POST | جلسة | أفعالُ الموظف على صفّه هو `{k, id, i?, act, why?, note?, imgs?, rm?, steps?}`: `ack` · `start` · `decline` · `stall` · `resume` · `doc` · `submit` · `finish` · `expire` — تُبنى القيمةُ في الخادم وتمرّ بالحفظ المركزي (أعمدةُ الذات وحدها 3 · 6 · 11 · 12 · 20 · 21 + حدثُ تدقيق `etype=task`) | `noop:1` لتأكيدٍ مكرَّر ولانقضاءٍ مضى على نهايته أكثرُ من 48 ساعة (F-3) · 409 للحالة والهوية · 413 · 429 |
| `/api/me/tasks/img` | GET | جلسة | صورةُ إثباتٍ `?id=` مذكورةٌ في العمود 21 لصفٍّ من صفوف صاحب الجلسة وحده | 403 لغير صاحبها (P0) · 400 `bad-id` |
| `/api/me/tasks/log` | GET | جلسة | سجلُّ مهمتي: أحداثُ تدقيق `etype=task` لصفّي وحده `{at, act, txt, by, why}` — بلا معرّفات (`by` أنت أو اسمُ المسؤول) | الصفُّ القديم بطوابعه `src:row` |
| `/api/checkpw` | POST | جلسة | فحص كلمة المرور الحالية قبل تغييرها | |
| `/api/save` | POST | فاعل | الحفظ الذري `{set, del, base, aud?, ops?, uid?}` → `{ok, v, revs, denied, conflicts}`؛ كل مفتاح يمرّ بـ`canWrite` (أو الإنفاذ) | 503 `authz_unavailable` في وضع الحماية · **KIVO_264 · C1**: `uid` (هويةُ الجلسة التي بُني لها الطابور) يخالف صاحبَ الجلسة ⇒ **409** `{ok:0, err:'session-changed'}` قبل أيّ قراءةٍ أو كتابة؛ الغائبُ و`null` كما كان · **D14**: `cur` (كلمةُ المرور الحالية) شرطٌ لتغيير اسم دخول صاحب الحساب في `bassam_auth_users_v1` — وإلا `denied[…].why = 'self-cur'` (أو `self-un` للصيغة · `self` لحقلٍ خارج قائمة الدور — `docs/security.md` §الحقولُ الذاتية) |
| `/api/get?keys=` | GET | فاعل | أحدث قيم مفاتيح بعينها (مرشّحة بالنطاق) | 503 في وضع الحماية · الحدُّ 80 مفتاحاً كما كان — **KIVO_264 · C2**: ما زاد يُقطع ويُعلَن `more:1` (كان يُسقط صامتاً) · **C1 للقراءة**: `&uid=` اختياري (هويةُ التبويب `BOOT.uid`) يخالف صاحبَ الجلسة ⇒ **409** `{ok:0, err:'session-changed'}` قبل أيّ قراءة؛ الغائبُ كما كان · **QA-264-D1**: في الإنفاذ كالقديم — موردٌ صفحتُه خارج سقف الإدارة أو وحدتُه مطفأة لا قيمةَ له لأحدٍ غيرِ مدير النظام (ولا عبر `backup.view`) |
| `/api/changes?since=` | GET | فاعل | ما تغيّر منذ نسختي (+ `am` وضع الإنفاذ و`az` في بيئة الإنفاذ) · `&wait=1` ينتظر تغييراً حتى 25 ث | KIVO_261 · AUD-050: 3 انتظاراتٍ متزامنة لكل حساب (و400 للمعزول) — ما زاد يُجاب فوراً بلا انتظار · **KIVO_264 · C2**: المفاتيحُ مرتّبةٌ بالمراجعة وتُقطع بعد 80 مفتاحاً مرئياً على حدود مراجعةٍ كاملة ⇒ `more:1` و`v` = آخرُ مراجعةٍ مضمَّنة (يُطلب الباقي بـ`since=v` فوراً)؛ حفظةٌ واحدة لا تُشطر · **C1 للقراءة**: `&uid=` كـ`/api/get` (409 قبل الانتظار) · **`az`** = تغيّر ما تُحسب منه مجموعةُ قراءة الفاعل: الصلاحيات · الحسابات · الهيكل · المنصة · نطاقُ إداراته ومنحُها، و(KIVO_264) **الجدولُ الشهري** `bassam_staffing_v3` لإدارةٍ ورديتُه فيها مربوطةٌ به (`Shift: staffing-bound` — لا لفاعلي السقف ولا لـ`n/a` والقائمة) |
| `/api/retro` | GET / POST | فاعل | نافذة الاستدراك (حالة خادمية لكل إدارة/نظام) | |
| `/api/dstats` | GET / POST | فاعل | قراءة الإحصاءات اليومية وحفظ لقطة ضمن نطاق الفاعل؛ POST `{base, data, uid?, operation?, reason?}` → `{ok, rev, data}` | `base` مراجعة مطلوبة؛ 409 `conflict` يعيد المراجعة والبيانات المرشحة بالنطاق. `historical-import` لمدير النظام مع سبب؛ الاستعادة الكاملة عبر مسار الاستعادة |
| `/api/notifications` | GET | فاعل | موجز الإشعارات الخاص بالفاعل مع الأعداد غير المقيدة بفلتر العرض؛ `dept?`, `filter=all/act/un`, `kinds?`, `summary=1`, `limit=1…200`, `cursor?` | `all=1` و`manage=1` لمدير النظام؛ `rev`, `configRev`, `broadcastRev` مستقلة؛ مؤشرات الصفحات مرتبطة بالمراجعة |
| `/api/notifications/act` | POST | فاعل | `{op, uid?, …}`: `emit`, `emit-batch`, `state`, `config`, `broadcast`, `dept-broadcast`, `withdraw`, `remind`, `targets`, `security-poll` → `{ok, rev, …}` | حالة القراءة/الإقرار لصاحب الجلسة وحده؛ إدارة الإعدادات والتعميم العام لمدير النظام، والتعميم الإداري بصلاحيته؛ `base` مطلوب للعمليات التي تفرض CAS |
| `/api/notifications/export` | GET | فاعل | تصدير المجال `{ok, rev, domain}`؛ `dept?` يحدد إدارة | تصدير الإدارة يتطلب نطاقها و`backup.view` في الإنفاذ؛ غياب `dept` لمدير النظام وحده |
| `/api/custody` | GET | فاعل | قراءة عهد الإدارة `dept`؛ `view=month/holder/moves/catalog`, `year?`, `month?`, `q?`, `holderKey?`, `kind?`, `limit?`, `cursor?` | صلاحية قراءة العهد؛ الحد 1…200 (عرض الشهر حتى 100)؛ 409 `custody-cursor-stale` عند تغيّر المراجعة أو سياق المؤشر |
| `/api/custody/act` | POST | فاعل | `{dept, base, requestId, op, uid?, …}`: `type-create`, `type-edit`, `type-delete`, `issue`, `issue-batch`, `close`؛ رد مؤكد `{ok, rev, requestId, op, n, outputs}` | صلاحية العملية ونطاق الإدارة؛ CAS على `base` وإيصال يمنع تكرار التنفيذ عند إعادة الطلب نفسه |
| `/api/custody/export` | GET | فاعل | تصدير `{ok, domains, globalRev}`؛ `dept?` يحدد إدارة | تصدير الإدارة يتطلب نطاقها و`backup.view` في الإنفاذ؛ غياب `dept` لمدير النظام وحده |
| `/api/employees/transition` | GET / POST | فاعل | GET `?dept=&intent=delete/import` يعيد سياق الانتقال و`base`؛ POST يطبق حذف الموظفين أو الاستيراد مع الآثار التابعة ذريًا | صلاحيات الموظفين والاستيراد الحالية؛ POST يحمل `requestId` و`base` و`finalRows` وحقول النية المحددة في مخطط الجسم؛ 409 عند تغيّر المراجعات أو `epoch` |
| `/api/admin/dept-wipe` | GET / POST | مدير النظام | GET `?dept=` يجرد الموارد والمراجعات والأعداد؛ POST `{dept, requestId, base, uid?, reason?}` يفرغ بيانات الإدارة ذريًا | يحفظ تعريف الإدارة وحساباتها؛ `base` من الجرد، ويشمل `epoch` ومراجعات KV والعهد والإشعارات |
| `/api/admin/dept-delete` | GET / POST | مدير النظام | GET `?dept=` يجرد أثر الحذف؛ POST `{dept, requestId, base, uid?, reason?}` يحذف الإدارة وحسابات مديرها وموظفيها وبياناتها التابعة ذريًا | إيصال `requestId` مرتبط بنوع العملية ومحتوى الطلب؛ لا يعاد استخدام طلب الحذف كطلب تفريغ |
| `/api/backup/restore` | GET / POST | فاعل | GET `?kind=full/dept&dept=&departments=<JSON array>` يجرد `base`؛ POST استعادة تطبيقية `version:1`, `scope`, `mode:merge/replace`, `reason`, `requestId`, `base` وبيانات النسخة | الشامل لمدير النظام؛ استعادة الإدارة لمديرها مع `backup.restore` في الإنفاذ أو لمدير النظام؛ الاستعادة ونسخة ما قبلها والإيصال في معاملة واحدة |
| `/api/aud` | GET | فاعل | سجل الأنشطة مرقَّماً ومرشَّحاً؛ النطاق يُفرض في الخادم · `first=1`: بدايةُ تشغيل المنصة (أقدمُ حدث) لتنبيه `sy_nobk` — لمدير النظام وحده `{ok, first}` | |
| `/api/imgs` | GET | فاعل | جرد الصور (بلا أجسام) | |
| `/api/img/<id>` | GET / PUT / DELETE | فاعل | جسم الصورة · رفع (≤512 KB للطلب · ≤24 MB مقطَّعاً بـ`?p=&n=`) · حذف — ملكية الصور (`imgown`) | KIVO_261 · SOT-068: الجسمُ `data:image/…;base64,` وأبجديةُ base64 بعدها وحدها (صيغةُ العميل) — غيرُها 415 `{ok:0, err}` قبل أيّ كتابة؛ في المقطَّع: الجزءُ الأوّل بالترويسة والتالي base64 وحده، وجزءٌ تالٍ بلا أوّلٍ مرحَّل ⇒ 409 `{ok:0, err:'part0-missing'}` · حصّةُ رفعٍ يومية 256 MB لكل حساب غير مدير النظام (شاملةً الأجزاء) ⇒ 429 `{ok:0, err, retry}` |
| `/api/presence` | GET | مدير النظام (إنفاذ) · نطاقي (قديم) | الحضور والجلسات؛ في النظام القديم يرى الموظف نفسه فقط والمدير موظفي إدارته (`scopeOk`)، وفي الإنفاذ 403 لغير مدير النظام | |
| `/api/sec` | GET | مدير النظام (الوضعان) | سجل أحداث الأمن — **لمدير النظام وحده في الوضعين** (KIVO_264: تصحيحُ وثيقة — كان مكتوباً «نطاقي (قديم)» والكودُ يردّ 403 لغير مدير النظام في القديم أيضاً: `063` بعد `if (!superX) return 403`) | يحوي `authz_unavailable` في KIVO_244 |
| `/api/sess/kill` | POST | مدير النظام (إنفاذ) · نطاقي (قديم) | إنهاء جلسات مستخدم `{uid}` (`all:1` لمدير النظام)؛ خارج النطاق أو مستخدم مجهول: 403 | |
| `/api/guard` · `/api/guard/unlock` | GET · POST | مدير النظام (الوضعان) | حارس المحاولات وفكّ القفل (KIVO_264: تصحيحُ وثيقة — لمدير النظام وحده في القديم أيضاً كـ`/api/sec`) | KIVO_261 · AUD-052: `unlock {gk, gks:[…]}` — `gks` أقفالُ اسمٍ بعينه كما في `/api/overview` (`u:` · `ip:` · `p:` · ≤20)؛ قائمةٌ بلا مفتاحٍ صالح ⇒ `{ok:1, n:0}` بلا حذف · `gk` المفرد ببادئةٍ معروفة وإلا 400 · «فكُّ الكلّ» بـ`{all:1}` صريحاً (جسمٌ بلا `gk`/`gks`/`all` ⇒ 400) · قفلُ المصدر يُرفع مع الاسم فقط إن لم يكن مقفلاً على أسماءٍ أخرى |
| `/api/policy` | GET / POST | مدير النظام | سياسات الأمن القابلة للضبط (عمر الجلسة · الخمول · القفل · طول كلمة المرور) | |
| `/api/overview` | GET | مدير النظام | ملخص مدير النظام | KIVO_261 · AUD-052: صفوفُ `fails` تحمل `until` من قفل الزوج والمصدر (لا من `u:` الذي لا يُقفل) و`gks` |
| `/api/recovery` · `/api/recovery/new` | GET · POST | مدير النظام | حالة مفتاح الاستعادة · توليد مفتاح جديد | |
| `/api/reset` | POST | مدير النظام | إعادة ضبط (محروسة) | |
| `/api/permv2` | GET | مدير النظام | سجل v24.9 وإحصاءات الظل | |
| `/api/identity-rehearsal` | GET | مدير النظام | بروفة ترحيل الهوية (قراءة فقط) · التمهيد المدمج `/api/identity-preflight` حُذف (RISHAD-266 P6) | |
| `/api/authz` | GET | إنفاذ · جلسة | حالة الإنفاذ `{mode: enforce|legacy|unavailable, env, d1, me}` — `me.depts[d] = {h, lens, ceil, me, p, sb?}` (والوصفُ نفسُه في `__BS_BOOT.authz`) | `unavailable` جديد · **KIVO_264**: `sb = {'<y>-<m>': وردية}` ورديةُ الفاعل الفعلية من الجدول الشهري حين نطاقُه `staffing-bound` (صفُّه وحده) — يتغيّر الوصفُ بتغيّرها فيجدّد العميلُ الموارد المُسقَطة بعد `az` |
| `/api/authz/log` · `/api/authz/snaps` | GET | إنفاذ · مدير النظام | سجل قرارات الصلاحية · نسخ ما قبل العملية | |
| `/api/authz-migrate` | POST | إنفاذ · مدير النظام | خطة الترحيل الحتمية · التطبيق بالبصمة · الرجوع · الأجزاء: `perm` (الافتراضي) · و`parts=scope-retire` وحدها: حذفُ سقف النطاق القديم بلقطة (RISHAD-266) · جزءُ `identity` حُذف مع 011/012/015/016 (P6) | |
| `/api/authz-test` | POST | إنفاذ + `KIVO_TEST_FIXTURE=allow` · مدير النظام | تنفيذ طلب واحد بهوية حساب اختبار `tst_*` عبر المسار الكامل | ADR-004: مضيف Preview فقط · TTL 5 دقائق · كنس دفاعي |
| `/api/tasks/create` | POST | فاعل | إنشاءُ مهمة (`task.create` · و`task.assign` مع مكلَّفين): هويةٌ فريدة (13) وطابعٌ (22) وإعداداتُ الخادم (23) عبر الحفظ المركزي (CAS · تدقيق) + تنبيه `task_new` من الخادم. `rec` (اختياري): `{t: daily \| weekly \| monthly \| every, wd?, md? (1…30 أو `'last'` آخرُ يومٍ في الشهر الهجري — KIVO_265 البند 16), n? (every: كل n يوماً من البدء · 2…30 — البند 16), to? \| open:1}` — نهايةٌ ≤ ثلاث سنواتٍ هجرية أو «حتى الإيقاف» (بلا `to`)، وبلا أيّهما سنةٌ هجرية؛ ومخطّطُ `rec` نفسُه في `/api/tasks/recur` (لا مفاتيحَ زائدة · `to` نصٌّ — srv2 · S7) | KIVO_265 البند 4: كلُّ مكلَّفٍ بحسابِ مستخدمٍ نشط مربوطٍ بمعرّفه — وإلا 409 `acct` (لا يتجاوزه `force`) · المتكررةُ بلا مكلَّف 400 `rec-asg` (`at: rec`) · KIVO_265 البند 12: `shift: {name}` بدل `asg` — الورديةُ كيانٌ: مكلَّفوها يومَ `k` من الجدول الشهري وتقرير اليوم (072 `tkShiftAsg`) بالقواعد نفسِها وسقف 500 صفّ، والمتخطَّون بأسبابهم في `skipped` (بلا حسابٍ نشط · بلا معرّف · المراجِعُ نفسُه · فوق السقف) |
| `/api/tasks/review` | POST | فاعل | مراجعةُ التسليم الحاليّ وحده (المراجِعُ المسمّى · مديرُ الإدارة · مديرُ النظام): اعتمادٌ ⇒ منجزة · إعادةٌ ⇒ «أُعيدت للاستكمال» + تنبيه | |
| `/api/tasks/extend` | POST | فاعل | تمديدُ المهلة (`task.edit`) — يُمسح علَمُ «انقضت» ويُسجَّل `x.ext` | |
| `/api/tasks/reassign` | POST | فاعل | إعادةُ الإسناد (`task.assign`): صفٌّ جديدٌ للمكلَّف الجديد (`x.from`) والقديمُ «أُعيد إسنادها» يبقى في سجلّه بإثباته | المراجِعُ لا يكون المكلَّف (400 `bad-body`) · الحسابُ النشط (409 `acct`) |
| `/api/tasks/cancel` | POST | فاعل | إلغاءٌ بسببٍ يبقى في السجل — لا حذف (`task.delete` أو `task.edit`) | |
| `/api/tasks/relink` | POST | فاعل | ربطٌ يدويٌّ لصفٍّ قديمٍ «غير مرتبط» (لا إعادةَ كتابةٍ تلقائية) — `x.relink` يحفظ القيمةَ السابقة | KIVO_265: المرتبطُ برقم هويةٍ وما فيه نشاطٌ لصاحب رمزه وحده (409 `linked`) · والمفتوحُ بحسابٍ نشط (409 `acct`) · والمراجِعُ لا يكون المكلَّف (400) |
| `/api/tasks/settings` | POST | فاعل | إعداداتُ المهمة في العمود 23 من الخادم وحده (`task.edit`) | الحفظُ الخامّ الذي يغيّر العمودَ 23 يُرفض `task-x` (H-1) |
| `/api/tasks/reopen` | POST | فاعل | إعادةُ فتح منجزة ⇒ جارية (`task.reopen` في الإنفاذ) وقرارُ المراجعة «أُعيدت» في العمود 23 — من الخادم وحده | |
| `/api/tasks/recur` | POST | فاعل | التكرار — `op`: `pause` · `resume` · `stop` · `edit` (`task.edit`) و`start` (`task.create` + `task.edit` + `task.assign`: مهمةٌ مسندةٌ لمرةٍ واحدة بـ`id`، أو مهمةٌ جماعية بـ`grp`، تصير نسخةَ يوم البدء لسلسلة). القاعدةُ الجديدة (بإصدارٍ أعلى) على نُسخ اليوم وما بعده في الأشهر المفتوحة وحدها — والسابقةُ وما في شهرٍ معتمدٍ وإثباتُها وسجلُّها لا تُمسّ. `stop`: `rec.stop=1` والنهايةُ لا تتقدّم (أقربُها واليوم) وتُلغى القادمةُ المعلّقة غيرُ المبدوءة · `edit {rec}`: تُلغى القادمةُ المعلّقة غيرُ المبدوءة التي خرجت من القاعدة («عُدّل التكرار») وحدثُ `rec_edit` واحد، وتعود القادمةُ التي ألغاها تعديلٌ سابق إن صارت موعداً (`restored` — لا يعود إلغاءُ الإنهاء ولا المسؤول) · `stop {k, row}`: نسخةُ السلسلة في اليوم `k` بالعمود 13 = `row` تبقى آخرَ موعدٍ لها (`kept: 1`) · لكل نسخةٍ ملغاة حدثُ «أُلغيت» على هويتها (بلا تنبيه) · الردّ `{ok, rev, n, cancelled, ver, restored, kept}` | بلا Cron · KIVO_265 (srvrec): 409 `rec-ended` لاستئناف السلسلة المنتهية أو إيقافها أو تعديلها (ومنها ما أنهاه الإصدارُ السابق بحدث `rec_stop` من الخادم) · 409 `month-locked` إن لم تبقَ نسخةٌ في شهرٍ مفتوح — لا تجاوزَ للقفل ورسالتُه تقول ما العمل · `row` لغير `stop` 400 `at: row` |
| `/api/tasks/recur/run` | POST | فاعل | توليدُ نسخ التكرار متساوي القوى (مفتاحُ `idem` لكل يومٍ ومكلَّف) باسم صاحب القالب لا المستدعي — ويُستدعى كسولاً من `GET /api/me/tasks` · KIVO_265 البند 15: الأفقُ 30 يوماً قادمة (كان 7) بسقف 600 صفّ للتشغيل الواحد — Cloudflare Pages بلا مشغّلات Cron فالتوليدُ كسولٌ بأفقٍ أطول | KIVO_265 (srvrec): الموقوفةُ والمنتهية (`stop`) لا تُولَّد · `rec.to` الغائبُ = «حتى الإيقاف» · الشهريُّ في شهرٍ بلا يومه (29 يوماً واليومُ 30) لا نسخةَ فيه · srv2: صاحبُ القالب بلا `task.create` و`task.assign` معاً لا يُولَّد باسمه (denied) · صاحبُه ونُسخُه المحذوفة من أحداث الخادم وحدها (`cid` يبدأ بـ`tk` — والحفظُ الخامّ لا يكتبه) · كلُّ موعدٍ يُعاد الحكمُ فيه على السلسلة الطازجة قبل الكتابة · الوردية الليلية في يومها التالي لكل موعد |
| `/api/tasks/group` | GET | فاعل | المهمةُ الجماعية: حالةُ كلِّ مكلَّف (`asg` · `exe` · `rev`) ونسبةُ الإنجاز — لقارئ مخزن المهام | |
| `/api/tasks/linkage` | GET | فاعل | ربطُ الصفوف بسجلّ الموظفين وقتَ القراءة (`eid` · `nid` · ملتبس · «غير مرتبطة» · مجهول) — بلا كتابة | |
| `/api/tasks/eligibility` | GET | فاعل | الأهليةُ وقتَ التنفيذ من الجدول الشهري (الوردية · الراحة · الإجازة · الغياب · التعارض · الصلاحية): متاح · بانتظار التحقق · غير متاح — والتفصيلُ لقارئ الجدول وحده | KIVO_265 البند 4: بلا حسابٍ نشط ⇒ غير متاح قاطعاً (`no_acct` · `acct_disabled` · `acct_nid`) |

مصدر بيانات الإحصاءات والإشعارات والعهد هو جداول D1 العلائقية. مفاتيحها القديمة عبر `/api/get` تعيد `v:null` مع `moved` إلى مسار المجال؛ كتابتها عبر `/api/save` ترفض بـ`domain-moved`. وجود مصدر KV متقاعد يمنع تشغيل المجال بـ503 (`dstats-legacy-source-present` أو `notification-legacy-source-present` أو `custody-legacy-source-present`)؛ لا رجوع تشغيليًا إليه.

في عمليات العهد وانتقال الموظفين وتفريغ/حذف الإدارة والاستعادة، احتفظ بـ`requestId` ومحتوى الطلب نفسه عند إعادة المحاولة الصريحة بعد فقد الرد؛ الإيصال يعيد نتيجة التنفيذ السابق، وإعادة استخدام المعرّف بمحتوى مختلف تُرفض. راجع `base` و`epoch` من GET المناسب قبل إنشاء عملية جديدة؛ لا تتجاوز 409 بتحديث أعمى. `uid` الاختياري في الجسم أو الاستعلام يحمي هوية الجلسة في المسارات التي تفحصه، ولا يمنح صلاحية إضافية.

استعادة `/api/backup/restore` تطبيقية ضمن النطاق والسياسة الحالية، وتختلف عن Time Travel لقاعدة D1 كاملة في [دليل النسخ والاستعادة](runbooks/backup-restore.md). تقبل الصيغة المعيارية `keys` و`domains` و`manifest` أو غلاف `backup`؛ في صيغة الغلاف فقط يتيح `phase:'inspect'` الفحص دون اعتماد، وقد يلزم `legacyConsent:true` لنسخة قديمة. لا تُنشئ كلمات مرور افتراضية؛ تُطبق مدققات الحسابات والصلاحيات، ويشير `reauthRequired` إلى الحاجة لدخول جديد عند إبطال جلسة المستدعي.

## وضع الحماية (KIVO_244 · ADR-003)
في بيئة الإنفاذ، إذا تعذّرت قراءة `meta.authz_mode` من D1: كل المسارات عدا `brand` · `ping` · `logout` تعيد **503** `{ok:0, err:'authz_unavailable', msg}` مع `Retry-After: 10`، وتُسجَّل في `sec` بـ`act=authz_unavailable`؛ صفحة `/` تُقدَّم كشاشة دخول مع `__BS_BOOT.authz='unavailable'` وإشعار. الإيقاف المقصود (`authz_mode=legacy` يُقرأ بنجاح) يعيد النظام القديم.

## مخطّطاتُ أجسام الطلبات — المساراتُ المغيِّرة كلُّها (SOT-101 · ADR-032 · KIVO_264 · `tests/unit/k264_sec_bodies.test.mjs`)
المصدرُ الواحد `src/schemas/api/bodies.schema.json` (نسختُه في الخادم `051b-body-schemas.js` حرفاً — `body_schemas.test.mjs`)؛ المخالفةُ ⇒ **400** `{ok:0, err:'bad-body', at}` قبل أيّ قراءةٍ أو كتابة، و JSON غيرُ المفهوم ⇒ `at:'$'`. كانت 5 مساراتٍ من 15 مغيِّراً؛ الآن كلُّها:

| المسار | القاعدة | ملاحظة |
|---|---|---|
| `/api/save` · `/api/login` · `/api/recover` · `/api/checkpw` · `/api/sess/kill` | مخطّطاتُ KIVO_263 (+ `uid` · `cur` في `/api/save`) | |
| `/api/logout` (POST) · `/api/me/sess/kill` | **بلا جسم**: الفارغُ أو `{}` وحدهما (`additionalProperties:false`) | يُفحص في `063` (`bodyNone`) — الخروجُ قبل الجلسة، وجلساتي بعدها؛ GET الخروج تنقّلٌ بلا جسم |
| `/api/retro` (POST) | `{act, res, dept, scope:{y,m,d}, hours, reason, id}` — الأرقامُ تُقبل نصاً | `res` يُطابَق بـ`hasOwnProperty` (كان `__proto__` ⇒ 500) |
| `/api/guard/unlock` | `{gk, gks:[string ≤1000], all}` | `null` كان `{}` (261) ⇒ 400 الآن |
| `/api/policy` (POST) | `{sessH, idleH, lockN, lockMin, pwMin, wrMin}` أرقامٌ أو نصوصٌ رقمية (حقولُ النموذج) | **E5**: `null` كان 500 |
| `/api/recovery/new` · `/api/reset` | `{pw}` · `{pw, key, confirm, keepBrand, admin:{un, name, pw}}` | **E5**: `null` كان 500 |
| `/api/authz-migrate` · `/api/authz-test` | `{act, seed, hash, generated, parts[], inferable, snap, force}` · `{uid, path, method, body, vals[]}` | بعد حرّاسهما (مديرُ النظام · البيئة · المضيف) |
| `/api/dstats` (POST) · `/api/notifications/act` | `{base, data, uid?, operation?, reason?}` · `{op, uid?, …}` | الحقول والعمليات محددة في المخطط؛ تحقق النطاق وCAS في معالج المجال |
| `/api/custody/act` · `/api/employees/transition` | `{dept, base, requestId, op, …}` · `{dept, intent, requestId, base, finalRows, …}` | لا حقول زائدة؛ لكل عملية/نية حقولها وحراسة صلاحياتها |
| `/api/admin/dept-wipe` · `/api/admin/dept-delete` · `/api/backup/restore` | `{dept, requestId, base, uid?, reason?}` · استعادة `version:1` بالنطاق والوضع والسبب والنسخة | مدير النظام قبل الشكل لمساري الإدارة؛ بقية صلاحيات العملية وفحص المراجعات في المعالج |
| `/api/img/<id>` (PUT) | **عقدٌ خامّ** `raw['/api/img/']`: `Content-Type` إن حضر فـ`text/plain` (وإلا 415 قبل قراءة الجسم) · ≤ 512 KB · `data:image/…;base64,` · الأجزاء `?p=&n=` (≤ 64 · ≤ 24 MB) | العقدُ المكتوب = ثوابتُ الخادم (`BODY_MAX` · `IMG_TOTAL_MAX` · `IMG_PARTS_MAX` · `imgTypeOk` · `imgCtypeOk`) باختبار |

الترتيب: الجلسةُ والصلاحيةُ قبل الشكل — غيرُ مدير النظام يأخذ 403 على مساراته ولو بجسمٍ خاطئ، وبلا جلسة 401.

## صفحةُ المنصة عند تعذّر القاعدة (KIVO_264 · C3 · التدقيقُ المعماري D-2)
`GET /` و`GET /index.html` حين يغيب ارتباطُ D1 (`env.DB`) أو يتعذّر أيُّ خطوةٍ قاتلة في مسار القاعدة للغلاف (التهيئة · السياسة · الجلسة · `kv` · المراجعات · الحسابات) ⇒ **503** صفحةٌ عربيةٌ قصيرة (`المنصة غير متاحة مؤقتاً` + رابطُ إعادة المحاولة + رمزُ الطلب) **بلا غلافٍ ولا `__BS_BOOT` ولا سكربت**، برؤوس الغلاف (`Content-Security-Policy` · `nosniff` · `X-Frame-Options` · `Cache-Control: no-store` · `X-Robots-Tag`) و`Retry-After: 30`. كان الغلافُ يُقدَّم بلا حقن فيعمل النظامُ المحلي القديم في المتصفح (قاعدةُ `localStorage` · حسابُ `admin/admin` الافتراضي · كتاباتٌ لا تغادر الجهاز) — fail-open. وضعُ الحماية (ADR-003) يبقى كما هو لتعذّر قراءة وضع الإنفاذ وحده (الغلافُ بحقن `authz:'unavailable'`)؛ وعطلُ لقطة المقدّمة وحدها غيرُ قاتل (القراءاتُ المباشرة) فيُقدَّم الغلافُ بحقنٍ سليم. واجهةُ `/api/*` بلا قاعدة ⇒ `503 {ok:0, err:'no-db'}` كما كانت، والأصولُ الثابتة تُخدم. الاختبار: `tests/unit/k264_sec_contracts.test.mjs` (C3 — كلُّ عبارةٍ في مسار الغلاف تُعطَّل فلا غلافَ بلا حقن أبداً).

## أخطاء شائعة
`401` لا جلسة أو جلسة منتهية · `403` أصل غير مطابق / غير مصرَّح · `404` مسار غير موجود أو واجهة إنفاذ خارج بيئتها · `409` `session-changed` (KIVO_264 · C1: `uid` في جسم `/api/save` أو `&uid=` على `/api/get` و`/api/changes`) · `413` جسم أكبر من الحد · `429/قفل` كثرة محاولات · `503` قاعدة غير مربوطة (`no-db`) أو وضع الحماية — والغلافُ `/` صفحةُ 503 (C3).

## معرّفُ الطلب والأخطاء (KIVO_250 · ADR-013)
- كلُّ ردٍّ يحمل الرأس `X-Kivo-Rid` (12 خانة hex). أجسامُ الأخطاء الموحَّدة: `{ok:0, err:'worker-error'|'save-failed'|'img-failed'|'origin'|'authz_unavailable'|<حدُّ الحجم>, detail?, rid}` — `rid` هو مفتاحُ البحث في Workers Logs (سطرُ JSON بالمخطّط v1: `v,t,lvl,ev,ver,rid,m,p,st,err`).
- 500 يُسجَّل `error`؛ 403 المصدر و413 الحجم و503 الحماية تُسجَّل `warn`؛ أخطاءُ 4xx التفويض لا تُسجَّل في console (تُسجَّل في `authz`/`sec` داخل D1 كما كان).

## الحمايةُ من CSRF (SOT-138 · `tests/unit/csrf_origin.test.mjs`)
- كلُّ POST/PUT/DELETE يُرفض 403 `{err:'origin'}` في `fetch` قبل الجلسة والجسم إذا حمل `Origin` مخالفاً لأصل الموقع أو `Sec-Fetch-Site: cross-site`؛ غيابُ `Origin` (عميلٌ غيرُ متصفح) يمرّ إلى المصادقة.
- `GET /api/logout` (تنقّل) يرفض `same-site`/`cross-site`/Origin غريباً؛ القراءاتُ GET لا تُرفض بالمصدر (تحتاج الجلسة؛ الكوكي `SameSite=Lax` لا تُرسل من مواقع أخرى على الطلبات الفرعية).
- الكوكي `bs_tok`: `HttpOnly; SameSite=Lax; Path=/; Max-Age=<عمر الجلسة>` و`Secure` على كل مضيفٍ غير localhost؛ لا تُضبط عند فشل الدخول وتُمحى (`Max-Age=0`) عند الخروج.

## أشكالُ الاستجابة (AUD-026 · `tests/unit/api_shapes.test.mjs`)
| المسار | الشكل |
|---|---|
| `GET /api/brand` | `{ok:1, brand:{login,app}, ver, rk:0|1}` |
| `GET /api/ping` | `{ok:1, cf:1, ver, fresh}` (+ وضعُ الحماية `ready:0, mode` · + لمدير النظام `users, rev, sess, schema, schemaDb, schemaOk, ready`) |
| `POST /api/login` | نجاح `{ok:1, uid, role, deptId, mustChange}` + كوكي · فشل `{ok:0, err}` (رسالةٌ واحدة للحساب المجهول وكلمة المرور الخاطئة) |
| `GET /api/whoami` · `/api/me` | `{ok:1, uid}` · `{ok:1, now, sess:[{mine,ts,la,dev,city,active}], events:[…], lastLogin, thisLogin}` |
| `GET /api/me/today` | `{ok:1, v:1, day:{y,m,d,dk,ym,wd,op:'calendar'|'night'}, account:{id,role,deptId,dept,mgr,appointed}, identity:{linked, by:'eid'|'nid'|'none', keyed, rec:{name?,gender?,nid?,empno?,phone?,email?,type?,work?}|null}, facts:{known, cs, shift:{name,src,sched,def}, rest:{days,sched,today,src,dayChanged}, muk:{v,src}, status:{code,st,src,to,tin,tfrom,kind}, report:{any,mine,approved,sh}, month:{locked,has}}|null, site:{official,officialN,draft,draftN,today,todayN,same,plan,round,planYm}|null, mates:[اسم] (لموظفٍ مرتبطٍ بسجلّه وحده — غيرُ المرتبط `[]`), matesN, week:[7×{dk,ym,d,m,y,wd,today,sched,act:{code,approved}|null,any}], mon:{pr,ab,pm,lv,tout,n,ap}|null}` — عنصرُ الموقع `{fi,kind,i,uid,label,short,floor,sid,loc,closed}`؛ لا مفاتيحَ موظفين ولا أسماءَ دخول؛ وغيرُ الموظف (مديرُ الإدارة المعيَّن · المديرُ العام · مديرُ النظام) `facts/site/mon: null` |
| `GET /api/me/history` | `{ok:1, v:1, ym, today:{ym,d}, account, identity:{linked,by,keyed}, range:{first,cur}, month:{has,locked,shift,rest,muk,def,defEv,ev}|null, days:[{d,wd,sched:{rest,shift},act:{st,kind,sh,rest,restSrc,muk,to,tin,tfrom}|null,rep:'approved'|'pulled'|'none',ev}], sites:{month:[…],runs:[{from,to,label,kind,floor,ev}],plan,planApproved}, changes:[{ts,by,act,f,ev:'logged_change'}], evidence:{reports,approved,rounds,auditSince}, moves:{ev:'none',items:[{ts,act,dept,ev}],note}}` — `ev` ∈ `saved_approved` · `saved_open` · `logged_change` · `derived` · `current` · `none` · `future`؛ اليومُ بلا تقريرٍ `act:null` (لا إعادةَ بناءٍ من الحالة الحالية)؛ `moves.note` يصرّح بأن لا تاريخَ تنقّلٍ بين الإدارات (النقلُ غيرُ مدعومٍ حالياً — قرارُ المالك) و`moves.items` أحداثُ حسابه وحدها من `sec` |
| `GET /api/get?keys=` | `{ok:1, v, keys:{<k>:{v:string|null, rev}}}` (المجهولُ `v:null, rev:0`؛ جدولُ الحسابات بلا `ph` · + `more:1` عند القطع — C2) · `409 {ok:0, err:'session-changed'}` (`&uid=` مخالف — C1) |
| `GET /api/changes?since=` | `{v, keys:[…]}` (+ `am` و`az?` في بيئة الإنفاذ · + `more:1` عند القطع — KIVO_264 · C2) · `409 {ok:0, err:'session-changed'}` (`&uid=` مخالف — C1) |
| `POST /api/save` | `{ok:1, v, revs:{<k>:rev}, denied:{<k>:{why, cur, rev}}, conflicts:{<k>:{cur, rev}}, atomic}` · `409 {ok:0, err:'session-changed'}` (KIVO_264 · C1) |
| `GET /api/aud` · `/api/sec` · `/api/guard` | `{ok:1, rows:[…]}` (+ `now` في guard) |
| `GET /api/presence` | `{ok:1, now, active, list:[{u:{id,name,un,role,deptId,ekey,mgr,dis}, la, since, n, devs, city, mine, active, …}]}` |
| `GET/POST /api/policy` | `{ok:1, policy:{sessH, idleH, lockN, lockMin, pwMin}}` |
| `GET /api/overview` | `{ok:1, now, policy, oldHash, failsToday, deniedToday, lockedNow, activeNow, sessions, lastLogin, fails:[{un, n, t, city, dev, known, until, gks}]}` |
| `GET /api/recovery` | `{ok:1, key:string|null, used:object|null, backups:[…], backupLastLogin}` |
| `GET /api/permv2` · `/api/identity-rehearsal` | `{ok:1, version, docSha256, status, …}` · `{ok:1, worker, rehearsal:{…}}` (قراءةٌ فقط · لا كتابة) |
| الأخطاء | `404 {ok:0, err:'not-found'}` · `401 {ok:0, err:'session'}` · `400 {ok:0, err}` · `403 {ok:0, err:'forbidden'|'origin'}` · `413` · `429 {ok:0, err, retry}` · `500 {ok:0, err, detail, rid}` |

## الاسترشاد العلائقي — مخطط8

المرشح المحلي ينقل السجلات ولغاتها والقوائم ونوافذ الاستدراك إلى جداول D1؛ حالة النشر المثبتة تُراجع في Playbook.

| المسار | الطريقة | العقد |
| --- | --- | --- |
| `/api/irshad` | GET | `dept` و`view=catalogs/calendar/records/dashboard`؛ قراءة محددة بالصفحة والنطاق، و`base` يحوي `epoch/reports/languages/locations/retro` |
| `/api/irshad/act` | POST | `uid,dept,requestId,base,op` مع حقول العملية؛ `create/edit/delete/delete-month/catalog-replace`؛ التفويض الحالي داخل المعاملة نفسها |
| `/api/irshad/export` | GET | مجال منظم لكل إدارة مصرح بها؛ تصدير كامل لمدير النظام، وإداري وفق `backup.view` وسقف الوحدة ونطاق الإدارة |

حجم `/api/irshad/act` حتى8 MB. تحفظ الإعادة المطابقة إيصال الطلب؛ اختلاف جسم معرّف الطلب نفسه409، وتغير المراجعات أو حقبة الاستعادة409. لا يكتب الحفظ العام مفاتيح الاسترشاد المتقاعدة ولا يعيدها `/api/get` كوثائق؛ يعلن مسار المورد الجديد. `GET/POST /api/retro?res=irshad` يحتفظ بعقده الحالي ويقرأ/يكتب جدول النوافذ مع الحراس والسجل داخل دفعة واحدة؛ المضبوطات باقية بمسارها القائم.

النسخة الحديثة تحمل `manifest.version=2` و`manifest.domains.irshad=1` و`domains.irshad` و`base.irshad` لكل إدارة معلنة، بما فيها المجال الفارغ الصريح. يُفحص الملف الأقدم قبل تحويله إلى العقد المنظم في مدخل الاستعادة فقط؛ لا يوجد مسار KV تشغيلي موازٍ للاستـرشاد.


## المجالات العلائقية للمخطط9 — مرشح محلي

| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/seized` | GET | القوائم والتقويم والسجلات المرقمة والمؤشرات ضمن نطاق المستخدم |
| `/api/seized/act` | POST | الحفظ والتعديل والحذف والإجراء والصورة والقوائم بإيصال وCAS |
| `/api/seized/export` | GET | تصدير المجال المنظم وفق الصلاحيات ونطاق الإدارة |
| `/api/award` | GET | الترشيحات والتفاصيل والمراجع بإصداريها |
| `/api/award/act` | POST | الترشيح والتعديل والحالة والحذف واستبدال مراجع الإدارة |
| `/api/award/export` | GET | تصدير إداري أو شامل؛ المراجع العامة صريحة في الشامل فقط |

تخضع هذه المسارات للجلسة الحالية ومفاتيح الصلاحيات الأصلية؛ الأجسام مغلقة وفق `src/schemas/api/bodies.schema.json`. القراءة المرقمة لا تجلب الصور والتوقيعات في سجل تاريخ الترشيحات؛ تفاصيل السجل تطلبها عند الحاجة. المراجع العامة الموروثة مقروءة وفق السياسة الحالية، ولا يسمح تعديلها عبر مسار أو استعادة غير مطابقة.

Manifest3 يصرح بمجالي `seized` و`awards` بجانب المجالات السابقة؛ يشمل النطاق الكامل عنصر المراجع العامة للتكريم دون نسخه ضمن كل إدارة. يحول مسار استيراد الملفات manifest1/2 مرة عند الحد فقط؛ لا يدعم التطبيق تشغيل KV قديم للمجالين. قبول المرشح ونشره موثقان في Playbook عند اكتمال بوابتهما.

## المجالات التشغيلية للمخطط10 — مقبولة محليًا، Preview قيد التحقق

| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/operations/read` | GET | إسقاطات SQL مصرح بها، مع تصنيف كل مفتاح إلى قيمة أو غياب أو رفض، ومراجعات الموارد وepoch؛ لا BOOT أو KV للأعمال المنقولة |
| `/api/operations/export` | GET | تصدير الصفوف العلائقية للإدارات المعلنة بعد تحقق صلاحيات النسخ والقراءة؛ بلا أجسام صور أو كتابة R2 |

يستخدم `/api/save` مترجم الصفوف والمعاملة الذرية القائمين للموارد التشغيلية. يلزم طلبها `requestId` ثابت و`epoch` ومراجعة `base` لكل مفتاح. الإقرار الكامل يحمل الهوية نفسها و`atomic:1` ومراجعات جميع المفاتيح؛ الإعادة المطابقة تسترجع الإيصال، ولا يُعاد تشغيل المخطط أو توليد هويات أعمال جديدة. يستمر استخدام محرك الصلاحيات والتصنيف الأصلي مع إسقاطات مشتقة في الذاكرة فقط.

يحمل Manifest4 نطاق `operations` بصفوف ثابتة الأعمدة وعلاقات الإدارة والمورد والسياق. تُحوّل ملفات Manifest1–3 عند حد الاستيراد فقط؛ لا توافق تشغيلي دائم أو كتابة مزدوجة. يظل الجرد والالتزام والنسخ السابقة والحسابات تحت المعاملة والسياسة القائمتين. هذا وصف المصدر الجاري، ولا يثبت قبول Preview10؛ الحالة المقبولة تسجل في Playbook بالأدلة بعد بوابات الجودة.

أوامر المهام القائمة تستعمل الإيصال نفسه وepoch. يقبل `/api/tasks/create` الإنشاء الإضافي دون مراجعةbase من العميل حتى لمن يملك الإنشاء دون العرض؛ يبني الخادم التغيير على المرجع الحالي ويحرسه داخل المعاملة. تتطلب إعدادات `/api/tasks/settings` والتكرار `/api/tasks/recur` المراجعات المطابقة؛ تُحفظ المهمة وإعداداتها وتكرارها ضمن إقرار واحد. لا يختار العميل علامة المسار الموثوق. ويراجع مسارا مسح الإدارة وحذفها الموارد التشغيلية الـ21 كلها داخل العملية الشاملة الحالية، بما فيها الغائبة والمقفلة، بصلاحية مدير المنصة والتأكيد القائمين؛ لا يمثل ذلك تنفيذ حذف سحابي.
