# Changelog

## Unreleased

### Fixed
- Fixed Prisma client generation and startup resolution by restoring a valid `prisma.config.ts`.
- Added `prisma generate` support to install/setup flow so Prisma Client is regenerated automatically after install.

### Changed
- Extracted low-risk main-process helpers from `src/main.ts` into focused modules for auth/settings, runtime DB discovery, file/path helpers, and export helpers.
- Extracted low-risk renderer formatting and HTML string helpers into `src/renderer/render-helpers.ts`.

### Added
- Added a minimal Settings-based file integrity scan that reports the scanned `storageRoot`, missing referenced files, orphan managed files, and example paths.
- Added a minimal non-blocking duplicate-record warning before create and update save flows.

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
