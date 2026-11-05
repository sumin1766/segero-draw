# Codex workspace instructions

This repository contains the **public-safe 2027 Segero draw system baseline**. Work from a branch, never push real people data or credentials to GitHub, and never deploy to the existing production alias without explicit approval.

## Non-negotiable guardrails

- Repository is currently **PUBLIC**. Before importing actual church rosters, the owner must switch its visibility to **Private**.
- Treat the bundled `api/_data.js` as **synthetic demo fixtures only**. Real 2026 or 2027 names must remain in authorized private storage. Do not include exported sheets or spreadsheets containing people in commits, logs, PRs or test snapshots.
- Never hardcode `DRAW_ADMIN_KEY`, `DRAW_VIEW_KEY`, `BLOB_READ_WRITE_TOKEN`, database service keys, or private URLs. Rotate shared keys before production release; historical keys have already been circulated in chat.
- The current LIVE 3.0 source has been migrated as a **public-safe baseline**. The backend `api/state.js` was reconstructed from the previously deployed design, not independently confirmed byte-for-byte. Review live behavior and compare where possible.
- Existing Vercel production: `segero-draw-mvp.vercel.app`. Keep that deployment unchanged. Deploy changes to preview only, then test and request production approval.
- Prefer a transactional DB with unique constraints instead of mutable Vercel Blob JSON. Do not hide 409 errors or silently retry a possibly committed draw without an idempotency key.
- Keep 2027 year default. Prior-year names are not 2027 confirmed roster.
- Every code change must pass `npm run check` and relevant browser/API tests. Verify entrypoint and static assets work when deployed.

## Useful acceptance checks

1. Captain 21 through 30 entered sequentially without revision/ETag conflict.
2. Two browsers: admin writes and readonly broadcast sees the same result without reload.
3. Simultaneous attempts for the same stage/ticket never assign twice.
4. After a timed-out submission, retry is safe and does not duplicate a draw.
5. Admin settings: reorder stages/people, import CSV, edit mapping and reset safely.
6. Rehearsal state isolated from a live event; reset cannot destroy a production event.
7. Runtime errors expose a useful UI and leave the user able to continue.

See [CODEX_TASK.md](CODEX_TASK.md) for full scope.
