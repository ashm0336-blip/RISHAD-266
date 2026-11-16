    "/api/seized/act": {
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
        "op": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        },
        "data": {
          "type": "object"
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
            "catalog": {
              "type": "integer",
              "minimum": 0
            },
            "actions": {
              "type": "integer",
              "minimum": 0
            },
            "locations": {
              "type": "integer",
              "minimum": 0
            },
            "jew": {
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
            "catalog",
            "actions",
            "locations",
            "jew",
            "retro"
          ],
          "additionalProperties": false
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
        "index": {
          "type": "integer"
        },
        "act": {
          "type": "string"
        },
        "image": {
          "type": "string"
        },
        "kind": {
          "type": "string"
        },
        "value": {
          "type": [
            "object",
            "array"
          ]
        },
        "from": {
          "type": "string"
        },
        "to": {
          "type": "string"
        },
        "day": {
          "type": "integer",
          "minimum": 1
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