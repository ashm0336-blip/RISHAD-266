    {
      "path": "/api/irshad/act",
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
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/irshad/act",
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
      "note": "Typed Irshad domain: unchanged resource authorization, scoped SQL reads and atomic acknowledged commands; retired JSON is refused."
    },
