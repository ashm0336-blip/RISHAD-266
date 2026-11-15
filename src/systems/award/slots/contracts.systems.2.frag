    {
      "path": "/api/award/act",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "requestId",
            "op",
            "rev",
            "n",
            "base"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/award/act",
          "note": "Closed typed command envelope; domain validation also applies."
        },
        "401": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ]
        }
      },
      "note": "Relational award: existing resource policy, scoped SQL, acknowledged atomic commands, explicit manifest3 backup; no legacy KV runtime."
    },
