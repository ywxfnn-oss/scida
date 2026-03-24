# Project Status

## Current Status

Scidata Manager is currently in a stable local-desktop state for core lab data workflows:

- login and settings management work
- experiment search, detail view, edit, and save work
- full export and item-name export flows work
- managed file integrity scanning is available from Settings
- duplicate-record warnings run before create and update saves

## Current Technical Debt / Limitations

- `src/main.ts` is smaller than before, but still owns high-risk startup, migration, delete, and update rollback flows.
- `src/renderer.ts` still owns most screen orchestration, event binding, and DOM/state collection logic.
- duplicate detection is exact-match only on `sampleCode`, `testProject`, and stored `testTime`.
- file integrity scan is read-only and synchronous, so very large storage roots may feel slow.
- some architecture docs still need periodic updates as extraction work continues.

## Recommended Next Priorities

- continue safe, low-risk structural cleanup of `src/renderer.ts`
- continue reducing `src/main.ts` only in low-coupling areas, without changing startup or file-mutation behavior
- improve documentation so module boundaries and current capabilities stay aligned with the code
- add more targeted manual smoke coverage around startup, file integrity reporting, and duplicate warnings after future refactors
