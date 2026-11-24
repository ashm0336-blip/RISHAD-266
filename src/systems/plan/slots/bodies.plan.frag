    "/api/plan/opt-ref": {
      "type": "object",
      "properties": {
        "uid": {
          "type": "string",
          "maxLength": 200
        },
        "dept": {
          "type": "string",
          "maxLength": 200
        },
        "kind": {
          "type": "string",
          "maxLength": 10
        },
        "was": {
          "type": "string",
          "maxLength": 160
        },
        "reg": {
          "type": "string",
          "maxLength": 160
        },
        "name": {
          "type": "string",
          "maxLength": 160
        },
        "code": {
          "type": "string",
          "maxLength": 40
        },
        "base": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "dept",
        "kind",
        "was",
        "name",
        "base"
      ],
      "additionalProperties": false
    }