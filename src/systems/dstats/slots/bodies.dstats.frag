    "/api/dstats": {
      "type": "object",
      "required": [
        "base",
        "data"
      ],
      "additionalProperties": false,
      "properties": {
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "base": {
          "type": "integer",
          "minimum": 0
        },
        "data": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "haram": {
              "type": "object"
            },
            "nabawi": {
              "type": "object"
            },
            "locks": {
              "type": "object"
            }
          }
        },
        "operation": {
          "type": "string",
          "maxLength": 40
        },
        "reason": {
          "type": "string",
          "maxLength": 300
        },
        "ops": {
          "type": "object"
        }
      }
    },
