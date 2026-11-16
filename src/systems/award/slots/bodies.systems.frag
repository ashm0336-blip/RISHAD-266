    "/api/award/act": {
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
            "records": {
              "type": "integer",
              "minimum": 0
            },
            "docsV1": {
              "type": "integer",
              "minimum": 0
            },
            "docsV2": {
              "type": "integer",
              "minimum": 0
            }
          },
          "required": [
            "epoch",
            "records",
            "docsV1",
            "docsV2"
          ],
          "additionalProperties": false
        },
        "id": {
          "type": "string"
        },
        "status": {
          "type": "string"
        },
        "version": {
          "type": "integer"
        },
        "document": {
          "type": "object"
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