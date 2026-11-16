    {
      "path": "/api/dstats",
      "methods": [
        "GET",
        "POST"
      ],
      "access": "actor",
      "request": {
        "base": "integer revision (required POST)",
        "data": "daily statistics snapshot in actor scope",
        "uid?": "session uid",
        "operation?": "historical-import: super-only, reason required",
        "reason?": "operation reason"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "data"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/dstats",
          "err": "bad-body",
          "note": "bad-body يحمل at عند مخالفة مخطط الجسم؛ operation وdstats-shape وfull-restore-unsupported أخطاء تحقق مستقلة بحالة 400"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "conflict carries rev + scoped data; session-changed carries no data"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
