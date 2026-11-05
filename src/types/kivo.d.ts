/* ═══ KIVO — العقودُ البنيوية (SOT-102 · KIVO_258) — مولَّدٌ بـtools/gen_types.mjs من: FIELDS · ENT · RES_REG · OPS (الخادم) ·
   src/api/contracts.json · src/manifests/pages.json · tools/kivo_ns.json. لا يُحرَّر يدوياً؛ `node tools/gen_types.mjs --check` في البوابة. ═══ */
/* eslint-disable */

/* ── (١) الكيانات — عقودُ الحقول (يُفحص المتغيّرُ وحدَه عند الحفظ؛ الإرثُ لا يُعاقَب) ── */
/** bassam_award_v1 · recs[] · حقولٌ إضافية تُحتمل (سجلّاتٌ قديمة) */
export interface AwardRec {
  id: string;
  st: string;
  [field: string]: unknown;
}
/** bassam_custody_v1 · items[] · عقدٌ مغلق */
export interface CustodyItem {
  name: string;
  qty?: number;
  prefix?: string;
  color?: string;
}
/** bassam_custody_v1 · moves[] · عقدٌ مغلق */
export interface CustodyMove {
  t: "out" | "in" | "dmg" | "lost";
  eid: string;
  item: string;
  ser: string;
  color?: string;
  y: number;
  m: number;
  d: number;
  cond?: string;
  note?: string;
  by?: string;
  nid?: string;
  empno?: string;
  name?: string;
}
/** bassam_employees_v1 (الجذر) · حقولٌ إضافية تُحتمل (سجلّاتٌ قديمة) · تفرّد: nid */
export interface Employee {
  eid: string;
  name: string;
  nid?: string;
  phone?: string;
  empno?: string;
  email?: string;
  type?: string;
  work?: string;
  gender?: string;
  shift?: string;
  group?: string;
  account?: string;
  contact?: string;
  [field: string]: unknown;
}
/** bassam_irshad_v1 · reports[] · حقولٌ إضافية تُحتمل (سجلّاتٌ قديمة) */
export interface IrshadReport {
  id: string;
  [field: string]: unknown;
}
/** bassam_perm_tpls_v1 (الجذر) · حقولٌ إضافية تُحتمل (سجلّاتٌ قديمة) */
export interface PermTpl {
  id: string;
  name: string;
  [field: string]: unknown;
}
/** bassam_seized_acts_v1 (الجذر) · حقولٌ إضافية تُحتمل (سجلّاتٌ قديمة) */
export interface SeizedAct {
  id?: string;
  name: string;
  [field: string]: unknown;
}
/** bassam_seized_cat_v1 · cats[] · حقولٌ إضافية تُحتمل (سجلّاتٌ قديمة) */
export interface SeizedCatCat {
  name: string;
  [field: string]: unknown;
}
/** bassam_seized_v1 · reports[] · حقولٌ إضافية تُحتمل (سجلّاتٌ قديمة) */
export interface SeizedReport {
  id: string;
  [field: string]: unknown;
}
/** bassam_shift_options_v1 (الجذر) · عقدٌ مغلق */
export interface ShiftOption {
  name: string;
  color?: string;
  tStart?: string;
  tEnd?: string;
}

/* ── (٢) الموارد — نوعُ القيمة المخزَّنة لكل مفتاح (bsdept:<إدارة>:<المورد> لموارد الإدارة) ── */
export interface KivoResources {
  /** device */
  "bassam_active_dept_v1": unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */;
  /** global · قاعدة: users */
  "bassam_auth_users_v1": unknown;
  /** dept · الورقة: award/doc */
  "bassam_award_docs_v1": Record<string, unknown>;
  /** dept · الورقة: award/doc */
  "bassam_award_docs_v2": Record<string, unknown>;
  /** dept · الورقة: award/res · اعتماد: recs.*.st */
  "bassam_award_v1": { recs: AwardRec[]; [field: string]: unknown };
  /** global · قاعدة: super */
  "bassam_bc_v1": unknown;
  /** dept · الورقة: staff */
  "bassam_callsigns_v1": string[];
  /** dept · الورقة: emps/custody */
  "bassam_custody_v1": { items: CustodyItem[]; moves: CustodyMove[]; [field: string]: unknown };
  /** dept · الورقة: daily/rounds | dreport */
  "bassam_dayfocus_v1": Record<string, unknown>;
  /** dept · الورقة: daily/rounds | dreport */
  "bassam_dayshift_v1": Record<string, unknown>;
  /** dept · قاعدة: tech */
  "bassam_demo_purged_v1": unknown;
  /** global · قاعدة: super */
  "bassam_depts_v1": unknown;
  /** dept · الورقة: dreport */
  "bassam_dr_grp_v1": Record<string, unknown>;
  /** dept · الورقة: dreport · اعتماد: *.shifts.*.ap، *.shifts.*.apAt، *.shifts.*.apBy، *.dopen، *.dopen.*، *.dshut، *.dshut.* */
  "bassam_dreport_v1": Record<string, unknown>;
  /** global · قاعدة: dstats */
  "bassam_dstats_v1": unknown;
  /** dept · الورقة: emps/data */
  "bassam_employees_v1": Employee[];
  /** dept · قاعدة: tech */
  "bassam_first_boot_v1": unknown;
  /** device */
  "bassam_fresh_login_v1": unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */;
  /** dept · الورقة: plan */
  "bassam_gate_opts_v1": { loc?: string[]; gtype?: string[]; kind?: string[]; route?: string[]; cls?: string[]; cat?: string[]; [field: string]: unknown };
  /** global · قاعدة: super */
  "bassam_gdepts_v1": unknown;
  /** dept · الورقة: irshad/records */
  "bassam_irshad_langs_v1": string[];
  /** dept · الورقة: irshad/records */
  "bassam_irshad_locs_v1": string[];
  /** dept · الورقة: irshad/records */
  "bassam_irshad_v1": { reports: IrshadReport[]; [field: string]: unknown };
  /** dept · الورقة: admin/backup */
  "bassam_last_export_v1": number;
  /** global · قاعدة: super */
  "bassam_last_full_export_v1": number;
  /** dept · الورقة: dreport */
  "bassam_leave_kinds_v1": string[];
  /** dept · الورقة: plan */
  "bassam_mark_kinds_v1": string[];
  /** global · قاعدة: super */
  "bassam_notif_cfg_v1": unknown;
  /** dept · قاعدة: selfdev */
  "bassam_notif_dev_v1": unknown;
  /** device */
  "bassam_notif_mute_v1": unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */;
  /** global · قاعدة: super */
  "bassam_notif_sys_v1": unknown;
  /** dept · قاعدة: notif */
  "bassam_notif_v1": unknown;
  /** dept · الورقة: emps/data */
  "bassam_options_v1": { type?: string[]; work?: string[]; [field: string]: unknown };
  /** device */
  "bassam_page_v1": unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */;
  /** global · قاعدة: super */
  "bassam_perm_admsubs_v2": unknown;
  /** global · قاعدة: super */
  "bassam_perm_help_v1": unknown;
  /** global · قاعدة: super */
  "bassam_perm_irshad_cap_v1": unknown;
  /** global · قاعدة: super */
  "bassam_perm_leaf_v1": unknown;
  /** dept · الورقة: staff | dreport · اعتماد: ** */
  "bassam_perm_limit_v1": unknown;
  /** global · قاعدة: super */
  "bassam_perm_mgr_explicit_v1": unknown;
  /** global · قاعدة: super */
  "bassam_perm_seized_cap_v1": unknown;
  /** dept · الورقة: admin/ptpls */
  "bassam_perm_tpls_named_v1": Record<string, unknown>;
  /** dept · الورقة: admin/ptpls */
  "bassam_perm_tpls_v1": PermTpl[];
  /** global · قاعدة: perms */
  "bassam_perms_v1": unknown;
  /** dept · الورقة: plan · اعتماد: floors.*.approved، months.*.mo، months.*.d.*.approved */
  "bassam_plan_v1": { gates: Record<string, unknown>[]; zones: Record<string, unknown>[]; marks: Record<string, unknown>[]; floors: Record<string, unknown>[]; months?: Record<string, unknown>; [field: string]: unknown };
  /** global · قاعدة: super */
  "bassam_platform_v1": unknown;
  /** dept · قاعدة: tech */
  "bassam_profile_v1": unknown;
  /** dept · الورقة: daily/rounds · اعتماد: *.shAp، *.shAp.*، *.ap، *.auto، *.mo، *.d.*.ap، *.dopen، *.dopen.*، *.dshut، *.dshut.* */
  "bassam_rounds_v1": Record<string, unknown>;
  /** dept · الورقة: seized/records */
  "bassam_seized_acts_v1": SeizedAct[];
  /** dept · الورقة: seized/records */
  "bassam_seized_cat_v1": { cats: SeizedCatCat[]; [field: string]: unknown };
  /** dept · الورقة: seized/records */
  "bassam_seized_jew_v1": string[];
  /** dept · الورقة: seized/records */
  "bassam_seized_locs_v1": string[];
  /** dept · الورقة: seized/records */
  "bassam_seized_v1": { reports: SeizedReport[]; [field: string]: unknown };
  /** device */
  "bassam_session_v1": unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */;
  /** dept · الورقة: admin/shifts */
  "bassam_shift_options_v1": ShiftOption[];
  /** device */
  "bassam_st_grp_v1": unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */;
  /** dept · الورقة: staff · اعتماد: ** */
  "bassam_staffing_locks_v1": Record<string, unknown>;
  /** dept · الورقة: staff */
  "bassam_staffing_snap_v1": Record<string, unknown>;
  /** dept · الورقة: staff */
  "bassam_staffing_v2": Record<string, Record<string, unknown>>;
  /** dept · الورقة: staff */
  "bassam_staffing_v3": Record<string, Record<string, unknown>>;
  /** global · قاعدة: super */
  "bassam_struct_seed_v1": unknown;
  /** dept · الورقة: tasks · اعتماد: ** */
  "bassam_tasks_locks_v1": Record<string, unknown>;
  /** dept · الورقة: tasks */
  "bassam_tasks_v1": Record<string, unknown[]>;
  /** device */
  "bassam_theme": unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */;
  /** dept · الورقة: plan */
  "bassam_zone_opts_v1": Record<string, unknown>;
  /** device */
  "bslg_v1": unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */;
}
export type KivoResourceName = keyof KivoResources;
export type KivoDeptKey<R extends KivoResourceName = KivoResourceName> = `bsdept:${string}:${R & string}`;

/* ── (٣) الواجهةُ البرمجية /api/* — العقدُ الآلي (المسار · الطرائق · الوصول · مفاتيحُ الردّ لكل حالة) ── */
export interface KivoApi {
  "/api/brand": { methods: "GET"; access: "public"; responses: { "200": { ok: unknown; brand: unknown; ver: unknown; rk: unknown } } };
  "/api/ping": { methods: "GET"; access: "public"; responses: { "200": { ok: unknown; cf: unknown; ver: unknown; fresh: unknown } } };
  "/api/recover": { methods: "POST"; access: "public"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown } } };
  "/api/login": { methods: "POST"; access: "public"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown } } };
  "/api/logout": { methods: "GET" | "POST"; access: "public"; responses: { "200": { ok: unknown }; "303": { [k: string]: unknown }; "400": { ok: unknown; err: unknown; at: unknown } } };
  "/api/whoami": { methods: "GET"; access: "session"; responses: { "200": { ok: unknown; uid: unknown } } };
  "/api/me": { methods: "GET"; access: "session"; responses: { "200": { ok: unknown; now: unknown; sess: unknown; events: unknown; lastLogin: unknown; thisLogin: unknown } } };
  "/api/me/sess/kill": { methods: "POST"; access: "session"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown } } };
  "/api/me/today": { methods: "GET"; access: "session"; responses: { "200": { ok: unknown; v: unknown; day: unknown; account: unknown; identity: unknown; facts: unknown; site: unknown; mates: unknown; matesN: unknown; week: unknown; mon: unknown }; "405": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/me/history": { methods: "GET"; access: "session"; responses: { "200": { ok: unknown; v: unknown; ym: unknown; today: unknown; account: unknown; identity: unknown; range: unknown; month: unknown; days: unknown; sites: unknown; changes: unknown; evidence: unknown; moves: unknown }; "400": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/me/tasks": { methods: "GET"; access: "session"; responses: { "200": { ok: unknown; now: unknown; me: unknown; rev: unknown }; "400": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown } } };
  "/api/me/tasks/act": { methods: "POST"; access: "session"; responses: { "200": { ok: unknown; rev: unknown; row: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/me/tasks/img": { methods: "GET"; access: "session"; responses: { "200": { [k: string]: unknown }; "400": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown } } };
  "/api/me/tasks/log": { methods: "GET"; access: "session"; responses: { "200": { ok: unknown; k: unknown; id: unknown; events: unknown }; "400": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown } } };
  "/api/tasks/create": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; rows: unknown; elig: unknown; skipped: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/review": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; st: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/extend": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; e: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/reassign": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; row: unknown; elig: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/cancel": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/relink": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; row: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/settings": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; n: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/reopen": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; st: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/recur": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; n: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/recur/run": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; created: unknown; skipped: unknown; denied: unknown; series: unknown; due: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/group": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; id: unknown; title: unknown; label: unknown; summary: unknown; members: unknown }; "400": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/linkage": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; counts: unknown; rows: unknown; more: unknown }; "400": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/tasks/eligibility": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; s: unknown; e: unknown; items: unknown }; "400": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/checkpw": { methods: "POST"; access: "session"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown } } };
  "/api/save": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; v: unknown; revs: unknown; denied: unknown; conflicts: unknown; atomic: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown; rid: unknown }; "503": { ok: unknown; err: unknown; msg: unknown } } };
  "/api/get": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; v: unknown; keys: unknown }; "409": { ok: unknown; err: unknown } } };
  "/api/changes": { methods: "GET"; access: "actor"; responses: { "200": { v: unknown; keys: unknown }; "409": { ok: unknown; err: unknown } } };
  "/api/retro": { methods: "GET" | "POST"; access: "actor"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown } } };
  "/api/aud": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; rows: unknown; next: unknown }; "405": { ok: unknown; err: unknown } } };
  "/api/imgs": { methods: "GET"; access: "actor"; responses: { "200": { [k: string]: unknown } } };
  "/api/img/": { methods: "GET" | "PUT" | "DELETE"; access: "actor"; responses: { "200": { ok: unknown }; "409": { ok: unknown; err: unknown }; "415": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown } } };
  "/api/presence": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; now: unknown; active: unknown; list: unknown } } };
  "/api/sec": { methods: "GET"; access: "super"; responses: { "200": { ok: unknown; rows: unknown } } };
  "/api/sess/kill": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "403": { ok: unknown; err: unknown } } };
  "/api/guard": { methods: "GET"; access: "super"; responses: { "200": { ok: unknown; now: unknown; rows: unknown } } };
  "/api/guard/unlock": { methods: "POST"; access: "super"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown } } };
  "/api/policy": { methods: "GET" | "POST"; access: "super"; responses: { "200": { ok: unknown; policy: unknown }; "400": { ok: unknown; err: unknown; at: unknown } } };
  "/api/overview": { methods: "GET"; access: "super"; responses: { "200": { ok: unknown; now: unknown; policy: unknown; oldHash: unknown; imgs: unknown; failsToday: unknown; deniedToday: unknown; lockedNow: unknown; activeNow: unknown; sessions: unknown; lastLogin: unknown; fails: unknown; added: unknown } } };
  "/api/recovery": { methods: "GET"; access: "super"; responses: { "200": { ok: unknown; key: unknown; used: unknown; backups: unknown; backupLastLogin: unknown } } };
  "/api/recovery/new": { methods: "POST"; access: "super"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown } } };
  "/api/reset": { methods: "POST"; access: "super"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown } } };
  "/api/permv2": { methods: "GET"; access: "super"; responses: { "200": { ok: unknown; version: unknown; docSha256: unknown; status: unknown; phase: unknown; mode: unknown; worker: unknown; counts: unknown; validation: unknown; stats: unknown; scope: unknown; guards: unknown } } };
  "/api/identity-rehearsal": { methods: "GET"; access: "super"; responses: { "200": { ok: unknown; worker: unknown; rehearsal: unknown } } };
  "/api/authz": { methods: "GET"; access: "enforce"; responses: { "200": { ok: unknown; ver: unknown; mode: unknown; env: unknown; d1: unknown; perm: unknown; scope: unknown; ident: unknown; fixture: unknown; me: unknown }; "404": { ok: unknown; err: unknown } } };
  "/api/authz/log": { methods: "GET"; access: "enforce"; responses: { "200": { ok: unknown; rows: unknown; totals: unknown }; "404": { ok: unknown; err: unknown } } };
  "/api/authz/snaps": { methods: "GET"; access: "enforce"; responses: { "200": { ok: unknown; rows: unknown }; "404": { ok: unknown; err: unknown } } };
  "/api/authz-migrate": { methods: "POST"; access: "enforce"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown } } };
  "/api/authz-test": { methods: "POST"; access: "enforce"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown } } };
  "/api/dstats": { methods: "GET" | "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; data: unknown }; "400": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown } } };
  "/api/notifications": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; items: unknown; total: unknown; unread: unknown; actionable: unknown; urgentUnread: unknown; unreadAll: unknown; byKind: unknown; next: unknown; cfg: unknown; configRev: unknown; broadcastRev: unknown; counters: unknown; pendingAck: unknown }; "400": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/notifications/act": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown }; "400": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "404": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "429": { ok: unknown; err: unknown; retry: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/notifications/export": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown; domain: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/custody": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown }; "400": { ok: unknown; err: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/custody/act": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; rev: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/custody/export": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; domains: unknown }; "400": { ok: unknown; err: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/employees/transition": { methods: "GET" | "POST"; access: "actor"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/admin/dept-wipe": { methods: "GET" | "POST"; access: "super"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/admin/dept-delete": { methods: "GET" | "POST"; access: "super"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/backup/restore": { methods: "GET" | "POST"; access: "actor"; responses: { "200": { ok: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/irshad": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; dept: unknown; base: unknown }; "400": { ok: unknown; err: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/irshad/act": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; requestId: unknown; op: unknown; rev: unknown; n: unknown; base: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/irshad/export": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; domains: unknown }; "400": { ok: unknown; err: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/seized": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; base: unknown }; "400": { ok: unknown; err: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/seized/act": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; requestId: unknown; op: unknown; rev: unknown; n: unknown; base: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/seized/export": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; domains: unknown }; "400": { ok: unknown; err: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/award": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; base: unknown }; "400": { ok: unknown; err: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/award/act": { methods: "POST"; access: "actor"; responses: { "200": { ok: unknown; requestId: unknown; op: unknown; rev: unknown; n: unknown; base: unknown }; "400": { ok: unknown; err: unknown; at: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/award/export": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; domains: unknown }; "400": { ok: unknown; err: unknown }; "401": { ok: unknown; err: unknown }; "403": { ok: unknown; err: unknown }; "405": { ok: unknown; err: unknown }; "409": { ok: unknown; err: unknown }; "413": { ok: unknown; err: unknown }; "503": { ok: unknown; err: unknown } } };
  "/api/operations/read": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; uid: unknown; v: unknown; epoch: unknown; resources: unknown; absent: unknown; denied: unknown; base: unknown }; "400": { ok: unknown; err: unknown } } };
  "/api/operations/export": { methods: "GET"; access: "actor"; responses: { "200": { ok: unknown; version: unknown; globalRev: unknown; epoch: unknown; domains: unknown }; "400": { ok: unknown; err: unknown } } };
}
export type KivoApiPath = keyof KivoApi;

/* ── (٤) سجلُّ الصفحات (src/manifests/pages.json) ── */
export type KivoPageKey = "dstats" | "emps" | "planning" | "staff" | "plan" | "daily" | "dreport" | "tasks" | "irshad" | "seized" | "award" | "links" | "help" | "admin";
export type KivoNavKey = "kpis" | "dstats" | "emps" | "planning" | "daily" | "irshad" | "seized" | "award";
export type KivoLensKey = "zones" | "paths" | "gates" | "marks" | "dist" | "dens";
/** عدسةٌ كإضافة — src/plugins/lenses/<key>/manifest.json (المخطّط src/schemas/lens-plugin.schema.json) */
export interface KivoLensPlugin { schema: 1; kind: "lens"; key: KivoLensKey; name: string; label: string; order: number; owner: string; hosts: string[];
  keys: { own: string[]; managedRefs: string[]; reserved: string[] };
  resources: { column?: { name: string; seq: number; hideFlag?: string; identity: string; geometry: string[]; derived?: string[]; editKey: string; status: { fields: string[]; op: string } };
    elementFields?: { cols: string[]; fields: string[]; op: string }[]; floorFields?: { field: string; op: string }[]; indicators?: string[] };
  guards: { enable: string; resources: ("bassam_plan_v1" | "bassam_rounds_v1")[] }; tests: string[] }
export interface KivoPage { key: KivoPageKey; nav?: string; name: string; under?: string; seq?: string[]; subs?: { key: string; name: string }[]; tabs?: { key: string; name: string; offPage?: boolean }[] }

/* ── (٥) الفضاءُ العام window.KIVO (AUD-016 · ADR-017) — 102 اسماً؛ الأسماءُ نفسُها على window موصِّلاتٌ غيرُ قابلةٍ للعدّ (توافقٌ خلفي) ── */
export interface KivoNamespace {
  BassamAck: any;
  BassamAudit: any;
  BassamAuth: any;
  BassamBkTime: any;
  BassamBusy: any;
  BassamConfirm: any;
  BassamCount: any;
  BassamCrypt: any;
  BassamCssText: any;
  BassamCurve: any;
  BassamDay: any;
  BassamDayFocus: any;
  BassamDayShift: any;
  BassamDeptBackup: any;
  BassamDepts: any;
  BassamDigits: any;
  BassamEmp: any;
  BassamEmpImp: any;
  BassamField: any;
  BassamFind: any;
  BassamHijri: any;
  BassamHistImport: any;
  BassamIDB: any;
  BassamIdent: any;
  BassamImgCache: any;
  BassamImgFit: any;
  BassamImgPut: any;
  BassamImgRefs: any;
  BassamImgVerify: any;
  BassamKeyLabels: any;
  BassamLeaf: any;
  BassamLink: any;
  BassamMapNight: any;
  BassamMix: any;
  BassamMyShift: any;
  BassamNav: any;
  BassamNeed: any;
  BassamNotif: any;
  BassamPageKit: any;
  BassamPerm: any;
  BassamPermV2: any;
  BassamPick: any;
  BassamPlat: any;
  BassamPointer: any;
  BassamPrintCore: any;
  BassamRing: any;
  BassamRound: any;
  BassamSup: any;
  BassamTheme: any;
  BassamTip: any;
  BassamXLSX: any;
  DCLogic: any;
  KIVO_MANIFEST: any;
  KIVO_REGISTRY: any;
  KIVO_REGISTRY_DATA: any;
  StreamableLogic: any;
  __ADMIN_MODE: any;
  __ADMIN_OPEN_DTAB: any;
  __ADMIN_OPEN_TAB: any;
  __BS_AUTHZ: any;
  __BS_I: any;
  __BS_IMG_INFLIGHT: any;
  __BS_OPEN_TAB: any;
  __BS_QUOTA_WARN: any;
  __BS_RAWLS: any;
  __BS_RES_EMPTY: any;
  __BS_SRV: any;
  __BS_STORAGE_FAIL: any;
  __BS_TOK: any;
  __BS_VER: any;
  __bsAfterQuiet: any;
  __bsDirtySince: any;
  __bsFromStore: any;
  __bsMemo: any;
  __bsMixOn: any;
  __bsParseScope: any;
  __bsQuiet: any;
  __bsReadHook: any;
  __bsSilentSet: any;
  __bsThemeSet: any;
  __bsTick: any;
  __bsTokVal: any;
  __dcAnnotatedTemplate: any;
  __dcBoot: any;
  __dcContentKeyed: any;
  __dcKeyVer: any;
  __dcLogic: any;
  __dcLogicDefs: any;
  __dcRegistry: any;
  __dcRootName: any;
  __dcSetProps: any;
  __dcStreaming: any;
  __dcTemplateSource: any;
  __dcUpdate: any;
  __dcWorld: any;
  __dcWrite: any;
  __resourceBlobs: any;
  __resources: any;
  bsAskPassword: any;
  bsConfirm: any;
  bsPct: any;
  getDC: any;
  Custody: any;
  BackupRestore: any;
}
declare global {
  var KIVO: KivoNamespace;
  interface Window extends Omit<KivoNamespace, "Custody" | "BackupRestore"> { KIVO: KivoNamespace }
}
export {};
