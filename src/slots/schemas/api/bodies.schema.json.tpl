{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "kivo:api/bodies",
  "title": "KIVO — أجسامُ طلبات /api المغيِّرة (SOT-101 · KIVO_263 · KIVO_264: المساراتُ المغيِّرة كلُّها)",
  "description": "المصدرُ الواحد لقواعد شكل الطلب: يقرؤه الخادمُ (workers/parts/051b-body-schemas.js — نسخةٌ مطابقةٌ يفرضها tests/unit/body_schemas.test.mjs) ويُرفض ما يخالفه 400 {ok:0, err:'bad-body', at} قبل أيّ كتابة. المجموعةُ المدعومة من JSON Schema: type · properties · additionalProperties · items · required · maxLength · minimum · maxItems.",
  "bodies": {
    "/api/save": {
      "type": "object",
      "properties": {
        "requestId": {
          "type": "string",
          "maxLength": 100
        },
        "epoch": {
          "type": "integer",
          "minimum": 0
        },
        "set": {
          "type": "object",
          "additionalProperties": {
            "type": "string"
          }
        },
        "del": {
          "type": "array",
          "items": {
            "type": "string",
            "maxLength": 300
          },
          "maxItems": 5000
        },
        "base": {
          "type": "object",
          "additionalProperties": {
            "type": "integer",
            "minimum": 0
          }
        },
        "aud": {
          "type": [
            "array",
            "object",
            "null"
          ]
        },
        "ops": {
          "type": [
            "object",
            "array",
            "null"
          ]
        },
        "why": {
          "type": [
            "object",
            "null"
          ]
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "cur": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        },
        "ack": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9
        }
      }
    },
    "/api/login": {
      "type": "object",
      "properties": {
        "u": {
          "type": "string",
          "maxLength": 200
        },
        "p": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        }
      }
    },
    "/api/recover": {
      "type": "object",
      "properties": {
        "key": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "pw": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        }
      }
    },
@@SYS:bodies.tasks@@    "/api/operations/periods-migrate": {
      "type": "object",
      "required": [
        "dept"
      ],
      "additionalProperties": false,
      "properties": {
        "uid": {
          "type": "string",
          "maxLength": 80
        },
        "dept": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "budgetMs": {
          "type": [
            "number",
            "null"
          ]
        },
        "from": {
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "properties": {
            "r": {
              "type": "string",
              "maxLength": 80
            },
            "i": {
              "type": "integer",
              "minimum": 0
            }
          }
        }
      }
    },
    "/api/checkpw": {
      "type": "object",
      "properties": {
        "p": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        }
      }
    },
    "/api/sess/kill": {
      "type": "object",
      "properties": {
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "all": {
          "type": [
            "boolean",
            "integer",
            "null"
          ]
        }
      }
    },
    "/api/logout": {
      "type": "object",
      "additionalProperties": false
    },
    "/api/me/sess/kill": {
      "type": "object",
      "additionalProperties": false
    },
    "/api/me/sess/kill-one": {
      "type": "object",
      "properties": {
        "sid": {
          "type": "string",
          "maxLength": 16
        },
        "why": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 16
        }
      },
      "required": [
        "sid"
      ],
      "additionalProperties": false
    },
    "/api/retro": {
      "type": "object",
      "properties": {
        "act": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "res": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 64
        },
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "scope": {
          "type": [
            "object",
            "null"
          ],
          "properties": {
            "y": {
              "type": [
                "integer",
                "string",
                "null"
              ],
              "maxLength": 8
            },
            "m": {
              "type": [
                "integer",
                "string",
                "null"
              ],
              "maxLength": 8
            },
            "d": {
              "type": [
                "integer",
                "string",
                "null"
              ],
              "maxLength": 8
            }
          }
        },
        "hours": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "reason": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 4000
        },
        "id": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 100
        }
      }
    },
    "/api/guard/unlock": {
      "type": "object",
      "properties": {
        "gk": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 300
        },
        "gks": {
          "type": [
            "array",
            "null"
          ],
          "items": {
            "type": "string",
            "maxLength": 300
          },
          "maxItems": 1000
        },
        "all": {
          "type": [
            "integer",
            "boolean",
            "null"
          ]
        }
      }
    },
    "/api/policy": {
      "type": "object",
      "properties": {
        "sessH": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "dispH": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "idleH": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "lockN": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "lockMin": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "pwMin": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "wrMin": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "thrOn": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "thrN": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "thrWin": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        },
        "thrSec": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 16
        }
      }
    },
    "/api/recovery/new": {
      "type": "object",
      "properties": {
        "pw": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        }
      }
    },
    "/api/reset": {
      "type": "object",
      "properties": {
        "pw": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        },
        "key": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "confirm": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 50
        },
        "keepBrand": {
          "type": [
            "boolean",
            "integer",
            "null"
          ]
        },
        "admin": {
          "type": [
            "object",
            "null"
          ],
          "properties": {
            "un": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 64
            },
            "name": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 120
            },
            "pw": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 1000
            }
          }
        }
      }
    },
    "/api/authz-migrate": {
      "type": "object",
      "properties": {
        "act": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 32
        },
        "seed": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 128
        },
        "hash": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 128
        },
        "generated": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 20
        },
        "parts": {
          "type": [
            "array",
            "null"
          ],
          "items": {
            "type": "string",
            "maxLength": 16
          },
          "maxItems": 8
        },
        "inferable": {
          "type": [
            "boolean",
            "integer",
            "null"
          ]
        },
        "snap": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 128
        },
        "force": {
          "type": [
            "boolean",
            "null"
          ]
        }
      }
    },
    "/api/demo-data": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "act": {
          "type": "string",
          "maxLength": 10
        },
        "reveal": {
          "type": "boolean"
        },
        "force": {
          "type": "boolean"
        }
      }
    },
    "/api/authz-test": {
      "type": "object",
      "properties": {
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "path": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 2000
        },
        "method": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 10
        },
        "vals": {
          "type": [
            "array",
            "null"
          ],
          "items": {
            "type": "string",
            "maxLength": 300
          },
          "maxItems": 200
        }
      }
    },
@@SYS:bodies.dstats@@    "/api/notifications/act": {
      "type": "object",
      "required": [
        "op"
      ],
      "additionalProperties": false,
      "properties": {
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "op": {
          "type": "string",
          "maxLength": 40
        },
        "type": {
          "type": "string",
          "maxLength": 80
        },
        "dept": {
          "type": "string",
          "maxLength": 180
        },
        "own": {
          "type": "array",
          "items": {
            "type": "string",
            "maxLength": 200
          },
          "maxItems": 20000
        },
        "vars": {
          "type": "object"
        },
        "title": {
          "type": "string",
          "maxLength": 400
        },
        "once": {
          "type": "string",
          "maxLength": 500
        },
        "link": {
          "type": "string",
          "maxLength": 500
        },
        "at": {
          "type": "integer",
          "minimum": 0
        },
        "events": {
          "type": "array",
          "items": {
            "type": "object"
          },
          "maxItems": 200
        },
        "action": {
          "type": "string",
          "maxLength": 40
        },
        "id": {
          "type": "string",
          "maxLength": 800
        },
        "onlyRead": {
          "type": "boolean"
        },
        "all": {
          "type": "boolean"
        },
        "base": {
          "type": "integer",
          "minimum": 0
        },
        "patch": {
          "type": "object"
        },
        "reset": {
          "type": "boolean"
        },
        "b": {
          "type": "object"
        },
        "preview": {
          "type": "boolean"
        },
        "target": {
          "type": "object"
        }
      }
    },
@@SYS:bodies.custody@@    "/api/employees/transition": {
      "type": "object",
      "properties": {
        "uid": {
          "type": "string"
        },
        "requestId": {
          "type": "string"
        },
        "dept": {
          "type": "string"
        },
        "base": {
          "type": "object"
        },
        "reason": {
          "type": "string"
        },
        "intent": {
          "type": "string"
        },
        "deleteMode": {
          "type": "string"
        },
        "finalRows": {
          "type": "array"
        },
        "options": {
          "type": "object"
        },
        "import": {
          "type": "object"
        },
        "accountProposals": {
          "type": "array"
        }
      },
      "additionalProperties": false
    },
    "/api/admin/dept-wipe": {
      "type": "object",
      "properties": {
        "uid": {
          "type": "string"
        },
        "requestId": {
          "type": "string"
        },
        "dept": {
          "type": "string"
        },
        "base": {
          "type": "object"
        },
        "reason": {
          "type": "string"
        }
      },
      "additionalProperties": false
    },
    "/api/admin/dept-delete": {
      "type": "object",
      "properties": {
        "uid": {
          "type": "string"
        },
        "requestId": {
          "type": "string"
        },
        "dept": {
          "type": "string"
        },
        "base": {
          "type": "object"
        },
        "reason": {
          "type": "string"
        }
      },
      "additionalProperties": false
    },
    "/api/backup/import": {
      "type": "object",
      "properties": {
        "op": {
          "type": "string",
          "maxLength": 12
        },
        "phase": {
          "type": "string",
          "maxLength": 12
        },
        "i": {
          "type": "integer",
          "minimum": 0
        },
        "resources": {
          "type": "object",
          "additionalProperties": {
            "type": "integer",
            "minimum": 0
          }
        },
        "slices": {
          "type": "object",
          "additionalProperties": {
            "type": "integer",
            "minimum": 0
          }
        },
        "requestId": {
          "type": "string",
          "maxLength": 100
        },
        "scope": {
          "type": "object"
        },
        "mode": {
          "type": "string",
          "maxLength": 12
        },
        "reason": {
          "type": "string"
        },
        "base": {
          "type": "object"
        },
        "legacyConsent": {
          "type": "boolean"
        },
        "dry": {
          "type": "boolean"
        },
        "n": {
          "type": "integer",
          "minimum": 0
        },
        "f": {
          "type": "integer",
          "minimum": 0
        },
        "keys": {
          "type": "object",
          "additionalProperties": {
            "type": "integer",
            "minimum": 0
          }
        },
        "images": {
          "type": "object",
          "additionalProperties": {
            "type": "integer",
            "minimum": 0
          }
        },
        "items": {
          "type": "array",
          "maxItems": 2000,
          "items": {
            "type": "object",
            "properties": {
              "k": {
                "type": "string",
                "maxLength": 120
              },
              "s": {
                "type": "integer",
                "minimum": 0
              },
              "t": {
                "type": "string"
              }
            },
            "required": [
              "k",
              "s",
              "t"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "requestId"
      ],
      "additionalProperties": false
    },
    "/api/backup/restore": {
      "type": "object",
      "properties": {
        "version": {
          "type": "integer",
          "minimum": 0
        },
        "uid": {
          "type": "string"
        },
        "requestId": {
          "type": "string"
        },
        "scope": {
          "type": "object"
        },
        "mode": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        },
        "base": {
          "type": "object"
        },
        "keys": {
          "type": [
            "object",
            "null"
          ]
        },
        "delete": {
          "type": [
            "array",
            "null"
          ]
        },
        "domains": {
          "type": "object"
        },
        "manifest": {
          "type": "object"
        },
        "permissionSlice": {
          "type": "object"
        },
        "backup": {
          "type": "object"
        },
        "legacyConsent": {
          "type": "boolean"
        },
        "phase": {
          "type": "string"
        }
      },
      "additionalProperties": false
    }@@SYS:bodies.systems|sep=",\n"|pre=",\n"@@
  },
  "raw": {
    "/api/img/": {
      "methods": [
        "PUT"
      ],
      "contentType": "text/plain",
      "contentTypeRule": "رأسُ Content-Type إن حضر فنوعُه الأوّل text/plain (بأيّ معاملات — والعميلُ يرسل text/plain; charset=utf-8) وإلا 415 قبل قراءة الجسم؛ غيابُه مقبول (جسمٌ متدفّق أو بايتات) — الحكمُ النهائي على البايتات بالصيغة (imgCtypeOk · imgTypeOk في 054)",
      "maxBytes": 524288,
      "format": "^data:image/[a-z0-9.+-]{1,40}(?:;[a-z0-9=.+-]{1,60}){0,4};base64,[A-Za-z0-9+/=\\r\\n]*$",
      "formatFlags": "i",
      "parts": {
        "query": "?p=<0..n-1>&n=<1..maxParts>",
        "maxParts": 64,
        "first": "الترويسةُ ثم base64",
        "next": "base64 وحدها",
        "totalMaxChars": 25165824
      },
      "errors": {
        "400": "part — p/n خارج الحدود",
        "409": "part0-missing · part-missing",
        "413": "الجسمُ > maxBytes · المجمَّعُ > totalMaxChars",
        "415": "Content-Type · الصيغة",
        "429": "حدُّ المعدّل · الحصّةُ اليومية 256 MB لغير مدير النظام"
      }
    }
  },
  "notes": {
@@SYS:bodies.notes.tasks@@    "/api/save": "KIVO_264: uid (C1 — 409 session-changed) · cur (D14 — كلمةُ المرور الحالية لتغيير اسم الدخول؛ لا تُخزَّن) · V7 د5-هـ: ack=2 — العميلُ يفهم ok:0 لحفظٍ لم يُكتب منه مفتاح",
    "/api/logout": "بلا جسم: الفارغُ أو {} وحدهما (POST؛ وGET تنقّلٌ بلا جسم) — يُفحص قبل المعالج (063 bodyNone)",
    "/api/me/sess/kill": "بلا جسم: الفارغُ أو {} وحدهما (العميلُ يرسل {}) — يُفحص بعد الجلسة وقبل المعالج (063 bodyNone)",
    "/api/me/sess/kill-one": "V7 · د5-هـ (x1): {sid: مِقبضُ الجلسة من /api/me أو من تنبيه sc_dev (16 hex) · why: 'not-me' من «ليس أنا»} — جلسةُ صاحب الطلب وحده",
    "/api/retro": "أشكالُ العميل: فتحٌ {res, dept, act:'open', scope:{y,m[,d]}, reason[, hours]} (280) · إغلاقٌ {act:'close', res, dept, id} — الأرقامُ تُقبل نصاً (parseInt في المعالج)",
    "/api/policy": "حقولُ نموذج السياسات نصوصٌ من e.target.value أو أرقام (src/modules/admin/logic.js) — المعالجُ يحوّلها ويحدّها",
    "/api/demo-data": "V7 · د5-هـ (م6): act = preview · seed · remove · status (غيرُها 400 act) · reveal: كلماتُ مرور حسابات العرض مرةً واحدة في الرد · force: الحذفُ رغم الانحراف",
    "/api/authz-test": "body (الطلبُ المنفَّذ بهوية حساب الاختبار) بلا قيد شكل — المسارُ المستهدف يفحصه بمخطّطه",
    "/api/img/": "عقدٌ خامّ لا JSON — raw['/api/img/']"
  }
}
