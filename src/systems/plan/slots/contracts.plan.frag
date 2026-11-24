    {
      "path": "/api/plan/opt-ref",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "department id (actor's department)",
        "kind": "region · level · ztype · zcat",
        "was": "the option's stored name",
        "reg?": "level: its region · zcat: its type",
        "name": "the new name",
        "code?": "the new code (region · level · ztype)",
        "base": "integer revision of bassam_zone_opts_v1 the editor read",
        "uid?": "session uid"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "kind",
            "was",
            "name",
            "zones",
            "rev"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/plan/opt-ref",
          "note": "bad-body carries at; opt-unchanged when neither name nor code changes"
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
          ],
          "note": "forbidden (another department) or denied (the atomic save refused: the actor lacks a permission it touches)"
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
          ],
          "note": "conflict (the catalogue moved since base) · opt-missing · opt-duplicate · opt-code-duplicate · session-changed"
        },
        "429": {
          "keys": [
            "ok",
            "err"
          ]
        }
      },
      "note": "V7 · 53 (owner decision 24 Nov): the one declared reference edit «plan.optRef». The server reads the stored catalogue, plan and rounds (archive under live) and renames the option and its references (zones' region · level · ztype · zcat and the code of the zones that follow it; region carries its levels, type carries its categories and their colours) in every month and day — open, locked, approved and past — in one atomic save with the actor's permissions; it proves the plan and rounds are unchanged outside those fields (poOnly), lifts only the DateRange (period/approval lock) refusal of those two resources, opens no lock and cancels no approval, and logs one activity event per resource under the actor."
    },
