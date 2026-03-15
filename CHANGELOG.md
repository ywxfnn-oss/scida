# Changelog

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