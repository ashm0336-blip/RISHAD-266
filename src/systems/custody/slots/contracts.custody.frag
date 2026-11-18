    {
      "path": "/api/custody",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev"
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
      "note": "Server-owned operations. Existing resource authority, session identity, revision/epoch checks and operation-specific closed validation apply. GET inspects; POST commits atomically where supported."
    },
    {
      "path": "/api/custody/act",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/custody/act",
          "note": "الجلسة وهوية الفاعل قبل فحص الشكل؛ تظل حراسة العملية والنطاق كما هي بعده."
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
      "note": "Server-owned operations. Existing resource authority, session identity, revision/epoch checks and operation-specific closed validation apply. GET inspects; POST commits atomically where supported."
    },
    {
      "path": "/api/custody/export",
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
      "note": "Server-owned operations. Existing resource authority, session identity, revision/epoch checks and operation-specific closed validation apply. GET inspects; POST commits atomically where supported."
    },
