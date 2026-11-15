    "/api/irshad/act": {
      "type": "object",
      "properties": {
        "uid": {
          "type": "string"
        },
        "dept": {
          "type": "string"
        },
        "requestId": {
          "type": "string"
        },
        "base": {
          "type": "object",
          "properties": {
            "epoch": {
              "type": "integer",
              "minimum": 0
            },
            "reports": {
              "type": "integer",
              "minimum": 0
            },
            "languages": {
              "type": "integer",
              "minimum": 0
            },
            "locations": {
              "type": "integer",
              "minimum": 0
            },
            "retro": {
              "type": "integer",
              "minimum": 0
            }
          },
          "required": [
            "epoch",
            "reports",
            "languages",
            "locations",
            "retro"
          ],
          "additionalProperties": false
        },
        "op": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        },
        "data": {
          "type": "object"
        },
        "id": {
          "type": "string"
        },
        "year": {
          "type": "integer"
        },
        "month": {
          "type": "integer"
        },
        "kind": {
          "type": "string"
        },
        "values": {
          "type": "array"
        }
      },
      "required": [
        "dept",
        "requestId",
        "base",
        "op"
      ],
      "additionalProperties": false
    }