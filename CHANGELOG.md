# Changelog

## v1.0.1

### Fixed
- Replaced plain-text password storage with hashed password storage
- Migrated legacy `loginPassword` settings to `loginPasswordHash`
- Moved authentication verification into the Electron main process
- Prevented sensitive auth data from being exposed to the renderer
- Improved startup database migration safety with runtime DB backup
- Improved renderer and IPC error handling for safer failure behavior

### Verified
- `npm run lint`
- `npm run package`
- `npm run make`
- local auth migration and login flow