# Scida

Scida is a local-first Electron desktop application for managing scientific and experimental data.

The app stores structured experiment records in SQLite through Prisma, keeps raw files on disk, and exports experiment data to Excel or ZIP bundles.

On a true first launch, the app now shows a local-only onboarding flow before login to collect legal acknowledgement, storage-root setup, and the initial local admin account.

## Tech Stack

- Electron
- TypeScript
- Prisma
- SQLite
- ExcelJS
- Vite
- Electron Forge

## Current Architecture

- `src/main.ts` hosts the Electron main process, startup database preparation, IPC handlers, filesystem access, and export logic.
- `src/preload.ts` exposes a typed `window.electronAPI` bridge to the renderer.
- `src/renderer.ts` renders the UI, manages view state, and calls preload APIs.
- `prisma/schema.prisma` defines the SQLite schema and `prisma/migrations/` contains migration history.
- `storage/raw_files/` is a sample data directory in the repo, not a source-code storage module.

## Database Behavior

- The runtime database lives at `app.getPath('userData')/scidata.db`.
- On first launch, the app copies `dev.db` into the runtime location if needed.
- On startup, the app checks pending migrations from `prisma/migrations/`, applies any missing schema changes, and performs auth settings migration before Prisma connects.
- Existing runtime databases are backed up before startup migrations or auth-setting upgrades are applied.

## Authentication

- Fresh installs complete onboarding before the login screen is used.
- Login verification happens in the main process.
- The renderer does not receive stored password material.
- App settings store `loginUsername` plus a hashed `loginPasswordHash`.

## Release Shell

- The login/onboarding shell shows the visible app version.
- Settings includes a minimal `关于` page for version info plus placeholders for changelog/update info and third-party notices.

## Useful Commands

```bash
npm install
npm run start
npm run lint
npm run docs:structure
npm run make
```

## Additional Docs

- `CODEX.md`
- `PROJECT_STRUCTURE.md`
- `ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/MODULE_GUIDE.md`
