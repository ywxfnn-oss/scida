# Changelog

## Unreleased

### Added
- Added a Settings-based file integrity tool that reports missing referenced files, orphan files, exportable orphan lists, and quarantine actions.
- Added in-app duplicate warnings before save with clearer matched-record context and recent-record viewing.
- Added a recent operation log view in Settings for delete and export activity.
- Added recent edit-history visibility in the experiment detail page, including time, editor, reason, and compact change summaries.

### Improved
- Improved experiment list workflow with stable search state, minimal filters for test project and tester, newest/oldest sorting, Enter-to-search, reset controls, and clearer empty-result messaging.
- Improved database list selection workflow with clear-selection control and visible selected-count feedback.
- Improved export completion flow by allowing users to open the export output location immediately after success.
- Improved write-path safety for delete and update flows so recoverable failures are handled more explicitly.

### Fixed
- Fixed Prisma client generation and startup resolution by restoring a valid `prisma.config.ts`.
- Added `prisma generate` support to install/setup flow so Prisma Client is regenerated automatically after install.
- Fixed renderer same-page update jumps by preserving scroll position during in-place rerenders.
- Fixed delete and update cleanup semantics so committed state and cleanup warnings are distinguished more safely.

## v1.0.1

### Fixed
- Replaced plain-text password storage with hashed password storage
- Migrated legacy `loginPassword` settings to `loginPasswordHash`
- Moved authentication verification into the Electron main process
- Prevented sensitive auth data from being exposed to the renderer
- Added runtime DB backup before auth migration
- Improved startup/runtime error handling
- Fixed TypeScript module resolution for Vite and Forge config types

### Verified
- `npx tsc --noEmit`
- `npm run lint`
- `npm run package`
- `npm run make`
- local auth migration and login flow

## v1.0.0

Initial working version of Scidata Manager.
