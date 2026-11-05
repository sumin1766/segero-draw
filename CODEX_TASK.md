# Codex task — 2027 Segero draw stability and DB migration

## Project

- Public-safe code: https://github.com/sumin1766/segero-draw
- Deployed 2027 preview (inspect only): https://segero-draw-gjx77cdux-sumin1766-7023.vercel.app/
- Existing production alias (do not change): https://segero-draw-mvp.vercel.app/
- Vercel project name: `segero-draw-mvp`
- UI: `index.html`, `app.js`
- API: `api/state.js`
- Fixture (fake names): `api/_data.js`
- Existing backend: Vercel Blob private JSON, optimistic `revision` and ETag check

## Actual problem

User verified:
- Admin and broadcast logins work.
- First captain number **21** for first person succeeded.
- Number **22** and later submissions failed to register. UI showed **“자동저장 충돌”**.
- Some older preview API calls timed out in Vercel logs; precise cause of the consecutive-write error is not yet conclusively proved.

Root-cause hypotheses to verify (do not assume):
1. Blob JSON overwrite + CDN/cache read returns stale ETag/state.
2. `GET` polling and `POST` concurrent updates diverge on `revision`.
3. The client overwrites fresh state with older polling response.
4. `ifMatch`/Blob SDK behavior causes conflicts after the initial creation.
5. Post-submission timeout/retry does not distinguish committed from failed writes.

## Required engineering work, in order

### P0 — Reproduce, test, fix the save path
- Add tests which reproduce draw 21 then 22, through 30 sequentially, and concurrent same-number submissions.
- Separate immutable client display state from an authoritative server event state.
- Replace the single mutable Blob JSON document with a **transactional database** (Supabase PostgreSQL is recommended but not mandatory; use an atomic storage strategy with demonstrable guarantees).
- Add unique constraints on `(event_id,stage_id,ticket_number)` and `(event_id,person_id)`.
- Add a unique client-generated idempotency/request ID to every command. Replays return the original result rather than drawing twice.
- Guarantee a committed draw cannot be lost on network timeout, refresh, duplicate click or two admins acting simultaneously.
- Never auto-repeat a failed-looking write unless idempotency is guaranteed; display an explicit retry/reconcile UI.

### P1 — Keep existing functionality
- Maintain existing 2027 title, one-page operator view and dedicated broadcast `?screen=1`.
- Keep admin-only settings: stage order, person call order, per-stage ticket range, person CRUD, mapping editor, CSV roster template/download/import, reset.
- Keep distinct admin and readonly broadcast permissions. Move to stronger authentication/session handling if appropriate; no tokens in the URL.
- Network polling / realtime subscription must avoid overlapping requests and stale response overwrite; show last successful sync time and connection loss.
- Reset requires deliberate confirmation, stores a recoverable snapshot, and preserves configuration. Add separate sandbox / rehearsal event isolation.
- Roster import should validate headers, per-stage duplicate names, ticket capacity, text encoding, and CSV injection when exported.

### P2 — Test and release
- Automated Node tests and HTTP integration tests for all critical commands.
- Browser E2E: admin + broadcast on two sessions, 21..30 sequence, lost network/recovery, hold, undo, reset, config changes.
- Verify real **2027** roster is not in this repository; only provided fixture is synthetic.
- Create a PR and a Vercel preview deployment. Do **not** promote or reassign the production alias until tests pass and user explicitly approves.
- Provide an exact migration plan for existing private state and how to back up or roll back.

## Data & constraints

- Stages: captain 10, leader4 4, leaders 20, elder 46, middle 69, young 25, pastor 10 **in the previous-year example**. These numbers are not automatically the final 2027 allocations.
- Original prior-year mapping has ambiguous numbers (middle 67–69, young 25) and `leader4` rules to verify. Do not invent mappings; block unsafe assignment.
- The public repository uses synthetic names and generated mapping for local testing only. Generated mappings are **NOT** verified real event rules.
- Source of truth for the older real roster: connected private 2026 Google Sheet `26년도 교구 및 구역 뽑기`; access should be explicitly authorized before import.
- Production must not depend on a public spreadsheet.
- Use transactions for assignment, undo, reset, bulk import and migration operations.
- Export final results in a form administratively compatible with the existing 10-battalion / 30-district summary.

## Handoff notes

Vercel preview state may already contain a single assigned captain record (21) and potentially changes made during testing. Do not reset or overwrite it until a backup has been taken and the owner agrees.
Security: GitHub repo was found PUBLIC; turn Private before any real data is introduced. Rotate existing admin/view keys before actual live use.

## Definition of done

Codex reports:
- Root cause with evidence and test reproduction
- PR diff and completed automated test logs
- Preview URL with verified sequential draw and two-session sync
- No leaked secrets or real names in the repo
- Explicit remaining issues and rollback instructions
- No production deployment unless separately approved
