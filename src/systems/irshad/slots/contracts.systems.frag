    {
      "path": "/api/irshad",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "dept",
            "base"
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
      "note": "Typed Irshad domain: unchanged resource authorization, scoped SQL reads and atomic acknowledged commands; retired JSON is refused."
    },
