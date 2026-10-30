# مساراتُ الخادم ومالكوها — KIVO (مولَّد: `python3 tools/api_routes.py --write` — لا يُحرَّر يدوياً)

> SOT-106: «كل route له owner» — المالكُ هو الجزءُ والدالةُ اللذان يعالجان المسار في `workers/parts/` (يُجمَعان في `workers/_worker.js` بترتيب `workers/parts.json`)،
> والحارسُ مستوى الوصول في العقد `src/api/contracts.json` (الشكلُ والأخطاء في `docs/api.md`).

| المسار | الطرائق | الحارس | المالك (الجزء · الدالة) |
|---|---|---|---|
| `/api/admin/dept-delete` | GET / POST | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/admin/dept-wipe` | GET / POST | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/aud` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/authz` | GET | enforce — بيئةُ الإنفاذ (enfEnvOn) ∧ مديرُ النظام — Preview فقط | `063-enf-api-and-handler.js` `enfAuthzApi` · `063-enf-api-and-handler.js` `handle` |
| `/api/authz-migrate` | POST | enforce — بيئةُ الإنفاذ (enfEnvOn) ∧ مديرُ النظام — Preview فقط | `063-enf-api-and-handler.js` `handle` |
| `/api/authz-test` | POST | enforce — بيئةُ الإنفاذ (enfEnvOn) ∧ مديرُ النظام — Preview فقط | `063-enf-api-and-handler.js` `handle` |
| `/api/authz/log` | GET | enforce — بيئةُ الإنفاذ (enfEnvOn) ∧ مديرُ النظام — Preview فقط | `063-enf-api-and-handler.js` `enfAuthzApi` · `063-enf-api-and-handler.js` `handle` |
| `/api/authz/snaps` | GET | enforce — بيئةُ الإنفاذ (enfEnvOn) ∧ مديرُ النظام — Preview فقط | `063-enf-api-and-handler.js` `enfAuthzApi` · `063-enf-api-and-handler.js` `handle` |
| `/api/award` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/award/act` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/award/export` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/backup/restore` | GET / POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/brand` | GET | public — بلا جلسة (حارسُ المحاولات/المصدر حيث يلزم) | `063-enf-api-and-handler.js` `handle` |
| `/api/changes` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/checkpw` | POST | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062a-auth-routes.js` `authSessionRoutes` |
| `/api/custody` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/custody/act` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/custody/export` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/dstats` | GET / POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/employees/transition` | GET / POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/get` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/guard` | GET | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/guard/unlock` | POST | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/identity-preflight` | GET | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/identity-rehearsal` | GET | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/img/` | GET / PUT / DELETE | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/imgs` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/irshad` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/irshad/act` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/irshad/export` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/login` | POST | public — بلا جلسة (حارسُ المحاولات/المصدر حيث يلزم) | `062a-auth-routes.js` `authPublicRoutes` |
| `/api/logout` | GET / POST | public — بلا جلسة (حارسُ المحاولات/المصدر حيث يلزم) | `062a-auth-routes.js` `authPublicRoutes` |
| `/api/me` | GET | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062a-auth-routes.js` `authSessionRoutes` |
| `/api/me/history` | GET | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062a-auth-routes.js` `authSessionRoutes` · `062b-me-history.js` `meSelfRoutes` |
| `/api/me/sess/kill` | POST | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062a-auth-routes.js` `authSessionRoutes` |
| `/api/me/tasks` | GET | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062c-me-tasks.js` `meTasksRoutes` |
| `/api/me/tasks/act` | POST | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062c-me-tasks.js` `meTasksRoutes` |
| `/api/me/tasks/img` | GET | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062c-me-tasks.js` `meTasksRoutes` |
| `/api/me/tasks/log` | GET | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062c-me-tasks.js` `meTasksRoutes` |
| `/api/me/today` | GET | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062a-auth-routes.js` `authSessionRoutes` |
| `/api/notifications` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/notifications/act` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/notifications/export` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/overview` | GET | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/permv2` | GET | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/ping` | GET | public — بلا جلسة (حارسُ المحاولات/المصدر حيث يلزم) | `063-enf-api-and-handler.js` `handle` |
| `/api/policy` | GET / POST | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/presence` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/recover` | POST | public — بلا جلسة (حارسُ المحاولات/المصدر حيث يلزم) | `062a-auth-routes.js` `authPublicRoutes` |
| `/api/recovery` | GET | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/recovery/new` | POST | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/reset` | POST | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/retro` | GET / POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/save` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `055-sec-headers.js` `bodyLimit` · `063-enf-api-and-handler.js` `handle` |
| `/api/scope-dryrun` | GET | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/sec` | GET | super — مديرُ النظام وحده (isAdminPath ⇒ role super) | `063-enf-api-and-handler.js` `handle` |
| `/api/seized` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/seized/act` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/seized/export` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/sess/kill` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `063-enf-api-and-handler.js` `handle` |
| `/api/tasks/cancel` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/create` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/eligibility` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/extend` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/group` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/linkage` | GET | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/reassign` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/recur` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/recur/run` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/relink` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/reopen` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/review` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/tasks/settings` | POST | actor — جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead) | `071-task-mgmt.js` `tasksMgmtRoutes` |
| `/api/whoami` | GET | session — جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد | `062a-auth-routes.js` `authSessionRoutes` |
