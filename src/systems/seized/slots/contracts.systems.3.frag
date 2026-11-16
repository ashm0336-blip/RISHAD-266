    {
      "path": "/api/seized/export",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "domains"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ]
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
      "note": "Relational seized: existing resource policy, scoped SQL, acknowledged atomic commands, explicit manifest3 backup; no legacy KV runtime."
    },
