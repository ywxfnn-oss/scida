# Project Status

## Current Status

Scida is currently in a stable local-desktop state for the `v1.6.1` release baseline.

Current user-facing capability baseline:

- onboarding, login, and Settings workflows are usable
- Step 1 / Step 2 experiment entry is operational
- repeated-entry workflow now supports one active local draft
- database detail can copy an existing record into a new draft
- database browse now supports:
  - saved local filter views
  - starred records
  - related-record navigation
  - direct handoff to read-only analysis
- structured-data import now follows a simpler one-block-one-curve flow
- analysis remains read-only and supports scalar + structured comparison
- export workflows remain record-driven and unchanged in semantics

## Current Technical Debt / Limitations

- `src/main.ts` is smaller than early versions, but still owns high-risk startup, migration, packaging-adjacent runtime setup, delete, and update rollback flows.
- `src/renderer.ts` still owns most screen orchestration, event binding, and DOM/state collection logic.
- packaged build reliability still needs continued environment and distribution hardening, especially around reproducible public packaging confidence.
- duplicate detection is still exact-match only on `sampleCode`, `testProject`, and stored `testTime`.
- one active draft is intentionally narrow and does not provide multi-draft management.

## Recommended Next Priorities

- add repeatable smoke automation around create, draft-resume, detail-edit, structured-data import, analysis handoff, and export flows
- keep packaging confidence, signing/notarization readiness, and release validation as a parallel quality track
- continue safe, low-risk structural cleanup of `src/renderer.ts` and `src/main.ts` only where behavior stays unchanged
- keep documentation aligned with release boundaries, especially for database workspace, structured-data review, and analysis naming
- add more targeted manual smoke coverage around startup, draft recovery, structured-data save/review, and database-to-analysis flows
