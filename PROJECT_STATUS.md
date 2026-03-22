# Project Status

## Current Status

Scidata Manager is currently in a stable local-desktop state for core lab data workflows:

- login and settings management work
- experiment search, detail view, edit, and save work
- full export and item-name export flows work
- managed file integrity scanning is available from Settings
- duplicate-record warnings run before create and update saves

The project has also moved away from a fully monolithic main process. Some low-risk helpers are now extracted into focused modules under `src/main/` and `src/renderer/`.

## Recently Completed

- Fixed Prisma client generation and startup resolution by restoring a valid `prisma.config.ts` and adding a `postinstall` generate step.
- Extracted low-risk main-process helpers from `src/main.ts`:
  - auth and settings logic
  - runtime DB discovery helpers
  - file/path/name helpers
  - export helpers
- Extracted low-risk renderer formatting and HTML string helpers into `src/renderer/render-helpers.ts`.
- Added a minimal file integrity scan and report in Settings:
  - scans the configured `storageRoot`
  - reports missing referenced files
  - reports orphan managed files
- Added a minimal non-blocking duplicate-record warning before save and update.

## Current Technical Debt / Limitations

- `src/main.ts` is smaller than before, but still owns high-risk startup, migration, delete, and update rollback flows.
- `src/renderer.ts` still owns most screen orchestration, event binding, and DOM/state collection logic.
- Duplicate detection is exact-match only on `sampleCode`, `testProject`, and stored `testTime`.
- File integrity scan is read-only and synchronous, so very large storage roots may feel slow.
- Some architecture docs still need periodic updates as extraction work continues.

## Immediate Next Priorities

- Continue safe, low-risk structural cleanup of `src/renderer.ts`, especially DOM/query and view-state helpers.
- Continue reducing `src/main.ts` only in low-coupling areas, without changing startup or file-mutation behavior.
- Improve documentation so module boundaries and current capabilities stay aligned with the code.
- Add more targeted manual smoke coverage around startup, file integrity reporting, and duplicate warnings after future refactors.
