# Architecture and migration notes

## Existing (LIVE 3.0)

- Static HTML/CSS and `app.js`; UI is hosted on Vercel.
- `/api/state` GET returns all stages, results, holds, mapping and revision.
- `/api/state` POST applies assignment/hold/undo/order edits/import/reset using `revision` optimistic checks.
- Private Blob stores a **single mutable JSON state document**.
- Browser polls every ~4 seconds. One admin session and a readonly broadcast session use separate shared access keys.

The UI and server are currently not guaranteed to be consistent after the first write. A confirmed first draw, then failing second draw, was reported by the user.

## Proposed stable model

```text
Browser admin --POST command+idempotencyKey--> Authenticated API
                                          |
                                     DB transaction
                                          |
       event -- 1:N --> stages -- 1:N --> entrants
                      |                  |
                      |                 assignments (unique entrant/event)
                      +------ tickets (unique stage/ticket/event)
                                          |
                      read-only broadcast subscriptions/queries
```

Recommended tables:
- events (year, event status, isolation mode, active stage)
- stages (ordered stage definitions, number range, event FK)
- entrants (stage, ordered roster, role/category, PII protected)
- ticket_mappings (stage/ticket to battalion/district, verification flag)
- assignments (event/stage/person/ticket, unique constraints)
- command_log (idempotency_key, request/response hash, actor, timestamp)
- event_snapshots (reset/migration restoration)
- audit_log (all configuration/assignment changes)

Never include PII or credentials in public code. Add authenticated API rows and database access restrictions before importing real names.

## Historical Vercel

- Project name: `segero-draw-mvp`
- Team: `sumin1766-7023`
- Preview: `segero-draw-gjx77cdux-sumin1766-7023.vercel.app`
- Production: `segero-draw-mvp.vercel.app`
- Storage region: Seoul (private Blob); existing token is an environment secret.
- **This GitHub repository is intentionally NOT linked to the existing production Vercel project yet.** A Git push should not trigger production without an explicit release plan.

## Known migration constraints

- Do not equate per-stage draw entries with unique people. Roles can overlap.
- Some older stage ticket mappings are unverified; block assignment until confirmed.
- Use 2027 as the display/default year, but require actual 2027 rosters uploaded by admins.
- Reset should preserve roster, stage ordering, and mapping while clearing assignments/holds only.
- Preserve an independent backup before migrations or reset.
