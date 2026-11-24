    "/api/me/tasks/act": {
      "type": "object",
      "required": [
        "k",
        "id",
        "act"
      ],
      "additionalProperties": false,
      "properties": {
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "id": {
          "type": [
            "number",
            "string"
          ],
          "maxLength": 40
        },
        "i": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "act": {
          "type": "string",
          "maxLength": 8
        },
        "why": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "note": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 1000
        },
        "imgs": {
          "type": [
            "array",
            "null"
          ],
          "maxItems": 4,
          "items": {
            "type": "string",
            "maxLength": 80
          }
        },
        "steps": {
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": {
            "type": "boolean"
          }
        },
        "rm": {
          "type": [
            "array",
            "null"
          ],
          "maxItems": 12,
          "items": {
            "type": "string",
            "maxLength": 80
          }
        },
        "meta": {
          "type": [
            "array",
            "null"
          ],
          "maxItems": 4,
          "items": {
            "type": "object",
            "required": [
              "at"
            ],
            "additionalProperties": false,
            "properties": {
              "img": {
                "type": [
                  "string",
                  "null"
                ],
                "maxLength": 80
              },
              "at": {
                "type": "number",
                "minimum": 1
              },
              "lat": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "lng": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "acc": {
                "type": [
                  "number",
                  "null"
                ],
                "minimum": 0
              }
            }
          }
        },
        "idem": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 40
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      }
    },
    "/api/tasks/create": {
      "type": "object",
      "required": [
        "k",
        "t",
        "s",
        "e",
        "requestId",
        "epoch"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "t": {
          "type": "string",
          "maxLength": 300
        },
        "desc": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 4000
        },
        "prio": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 10
        },
        "s": {
          "type": "number"
        },
        "e": {
          "type": "number"
        },
        "asg": {
          "type": [
            "array",
            "null"
          ],
          "maxItems": 50,
          "items": {
            "type": "string",
            "maxLength": 80
          }
        },
        "shift": {
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "properties": {
            "name": {
              "type": "string",
              "maxLength": 80
            }
          }
        },
        "grpL": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 120
        },
        "wt": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "dec": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "pol": {
          "type": [
            "object",
            "null"
          ]
        },
        "win": {
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "properties": {
            "early": {
              "type": [
                "number",
                "null"
              ],
              "minimum": 0,
              "maximum": 240
            },
            "late": {
              "type": [
                "number",
                "null"
              ],
              "minimum": 0,
              "maximum": 24
            }
          }
        },
        "rv": {
          "type": [
            "string",
            "object",
            "null"
          ],
          "maxLength": 10
        },
        "needs": {
          "type": [
            "array",
            "null"
          ],
          "maxItems": 8,
          "items": {
            "type": "string",
            "maxLength": 80
          }
        },
        "rec": {
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "properties": {
            "t": {
              "type": "string",
              "maxLength": 8
            },
            "wd": {
              "type": [
                "array",
                "null"
              ],
              "maxItems": 7,
              "items": {
                "type": "integer",
                "minimum": 0
              }
            },
            "md": {
              "type": [
                "integer",
                "string",
                "null"
              ],
              "minimum": 1,
              "maxLength": 4
            },
            "n": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 1
            },
            "to": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 10
            },
            "open": {
              "type": [
                "integer",
                "boolean",
                "null"
              ],
              "minimum": 0
            }
          }
        },
        "force": {
          "type": [
            "boolean",
            "null"
          ]
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "requestId": {
          "type": "string",
          "minLength": 8,
          "maxLength": 100
        },
        "epoch": {
          "type": "integer",
          "minimum": 0
        },
        "base": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "/api/tasks/review": {
      "type": "object",
      "required": [
        "k",
        "id",
        "ekey",
        "decision"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "id": {
          "type": [
            "number",
            "string"
          ],
          "maxLength": 40
        },
        "ekey": {
          "type": "string",
          "maxLength": 80
        },
        "decision": {
          "type": "string",
          "maxLength": 8
        },
        "why": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      }
    },
    "/api/tasks/extend": {
      "type": "object",
      "required": [
        "k",
        "id",
        "e"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "id": {
          "type": [
            "number",
            "string"
          ],
          "maxLength": 40
        },
        "ekey": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "e": {
          "type": "number"
        },
        "why": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      }
    },
    "/api/tasks/reassign": {
      "type": "object",
      "required": [
        "k",
        "id",
        "from",
        "to"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "id": {
          "type": [
            "number",
            "string"
          ],
          "maxLength": 40
        },
        "from": {
          "type": "string",
          "maxLength": 80
        },
        "to": {
          "type": "string",
          "maxLength": 80
        },
        "why": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "e": {
          "type": [
            "number",
            "null"
          ]
        },
        "force": {
          "type": [
            "boolean",
            "null"
          ]
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      }
    },
    "/api/tasks/cancel": {
      "type": "object",
      "required": [
        "k",
        "id"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "id": {
          "type": [
            "number",
            "string"
          ],
          "maxLength": 40
        },
        "ekey": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "why": {
          "type": "string",
          "maxLength": 200
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      }
    },
    "/api/tasks/relink": {
      "type": "object",
      "required": [
        "k",
        "id",
        "from",
        "to"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "id": {
          "type": [
            "number",
            "string"
          ],
          "maxLength": 40
        },
        "from": {
          "type": "string",
          "maxLength": 160
        },
        "to": {
          "type": "string",
          "maxLength": 80
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      }
    },
    "/api/tasks/settings": {
      "type": "object",
      "required": [
        "k",
        "requestId",
        "epoch",
        "base"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "id": {
          "type": [
            "number",
            "string",
            "null"
          ],
          "maxLength": 40
        },
        "grp": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 60
        },
        "ekey": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "pol": {
          "type": [
            "object",
            "null"
          ]
        },
        "rv": {
          "type": [
            "string",
            "object",
            "null"
          ],
          "maxLength": 10
        },
        "dec": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "win": {
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "properties": {
            "early": {
              "type": [
                "number",
                "null"
              ],
              "minimum": 0,
              "maximum": 240
            },
            "late": {
              "type": [
                "number",
                "null"
              ],
              "minimum": 0,
              "maximum": 24
            }
          }
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "requestId": {
          "type": "string",
          "minLength": 8,
          "maxLength": 100
        },
        "epoch": {
          "type": "integer",
          "minimum": 0
        },
        "base": {
          "type": "integer",
          "minimum": 0
        },
        "why": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "edit": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "k": {
              "type": "string",
              "maxLength": 10
            },
            "t": {
              "type": "string",
              "maxLength": 300
            },
            "desc": {
              "type": "string",
              "maxLength": 4000
            },
            "prio": {
              "type": [
                "string",
                "null"
              ]
            },
            "s": {
              "type": "number"
            },
            "e": {
              "type": "number"
            },
            "ekey": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 80
            },
            "wt": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 80
            }
          },
          "required": [
            "k",
            "t",
            "desc",
            "prio",
            "s",
            "e"
          ]
        },
        "recur": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "op": {
              "type": "string",
              "maxLength": 8
            },
            "id": {
              "type": [
                "number",
                "string"
              ],
              "maxLength": 40
            },
            "rec": {
              "type": [
                "object",
                "null"
              ],
              "additionalProperties": false,
              "properties": {
                "t": {
                  "type": "string",
                  "maxLength": 8
                },
                "wd": {
                  "type": [
                    "array",
                    "null"
                  ],
                  "maxItems": 7,
                  "items": {
                    "type": "integer",
                    "minimum": 0
                  }
                },
                "md": {
                  "type": [
                    "integer",
                    "string",
                    "null"
                  ],
                  "minimum": 1,
                  "maxLength": 4
                },
                "n": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 1
                },
                "to": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "maxLength": 10
                },
                "open": {
                  "type": [
                    "integer",
                    "boolean",
                    "null"
                  ],
                  "minimum": 0
                }
              }
            },
            "row": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 40
            }
          },
          "required": [
            "op"
          ]
        }
      }
    },
    "/api/tasks/reopen": {
      "type": "object",
      "required": [
        "k",
        "id"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "k": {
          "type": "string",
          "maxLength": 10
        },
        "id": {
          "type": [
            "number",
            "string"
          ],
          "maxLength": 40
        },
        "ekey": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "why": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      }
    },
    "/api/tasks/recur": {
      "type": "object",
      "required": [
        "op",
        "requestId",
        "epoch",
        "base"
      ],
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "id": {
          "type": [
            "number",
            "string"
          ],
          "maxLength": 40
        },
        "op": {
          "type": "string",
          "maxLength": 8
        },
        "k": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 10
        },
        "grp": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 60
        },
        "row": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 40
        },
        "rec": {
          "type": [
            "object",
            "null"
          ],
          "additionalProperties": false,
          "properties": {
            "t": {
              "type": "string",
              "maxLength": 8
            },
            "wd": {
              "type": [
                "array",
                "null"
              ],
              "maxItems": 7,
              "items": {
                "type": "integer",
                "minimum": 0
              }
            },
            "md": {
              "type": [
                "integer",
                "string",
                "null"
              ],
              "minimum": 1,
              "maxLength": 4
            },
            "n": {
              "type": [
                "integer",
                "null"
              ],
              "minimum": 1
            },
            "to": {
              "type": [
                "string",
                "null"
              ],
              "maxLength": 10
            },
            "open": {
              "type": [
                "integer",
                "boolean",
                "null"
              ],
              "minimum": 0
            }
          }
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        },
        "requestId": {
          "type": "string",
          "minLength": 8,
          "maxLength": 100
        },
        "epoch": {
          "type": "integer",
          "minimum": 0
        },
        "base": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "/api/tasks/recur/run": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "dept": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 80
        },
        "day": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 10
        },
        "uid": {
          "type": [
            "string",
            "null"
          ],
          "maxLength": 200
        }
      }
    },
