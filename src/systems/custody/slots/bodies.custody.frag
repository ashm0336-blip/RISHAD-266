    "/api/custody/act": {
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
          "type": "integer",
          "minimum": 0
        },
        "reason": {
          "type": "string"
        },
        "op": {
          "type": "string"
        },
        "item": {
          "type": "object"
        },
        "itemId": {
          "type": "string"
        },
        "patch": {
          "type": "object"
        },
        "holderKey": {
          "type": "string"
        },
        "condition": {
          "type": "string"
        },
        "color": {
          "type": "string"
        },
        "lines": {
          "type": "array"
        },
        "issueId": {
          "type": "string"
        },
        "kind": {
          "type": "string"
        },
        "note": {
          "type": "string"
        }
      },
      "additionalProperties": false
    },
