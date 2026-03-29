# Scida

Scida is a local-first desktop application for managing scientific and experimental data.

I built it around my own graduate and future PhD research workflow: recording experiments, keeping raw files organized on disk, and being able to come back later to search, compare, and export results without pushing the data into a cloud service first.

My research background is in photodetectors and optoelectronic experiments, so the current semantic templates and workflow defaults are centered on that direction. The app is still general enough to be useful outside that area, but that research context is what shaped the first practical release.

AI tools helped a lot during development, especially Codex. I still treat Scida as a personal research tool that I want to make solid and genuinely useful, not as a generic demo project.

The app stores structured experiment records in SQLite through Prisma, keeps managed raw files on disk, and exports experiment data to Excel or ZIP bundles.

On a true first launch, Scida shows a local-only onboarding flow before login to collect legal acknowledgement, storage-root setup, and the initial local admin account.

## What Scida Focuses On

- local-first experiment record management
- managed raw-file storage with a configurable storage root
- guided Step 1 / Step 2 data entry for structured lab workflows
- read-only analysis views for comparing existing results
- export to practical local files instead of a hosted dashboard

## Current Status

- The current public releases are focused on macOS first, with automated build preparation for both macOS and Windows.
- The packaged app is designed to stay local-first: no cloud account, no activation, and no forced online dependency.
- Analysis remains read-only by design, and export behavior stays file-oriented.

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

## Releases

- GitHub Actions can build release artifacts for macOS and Windows and upload them as workflow artifacts.
- Code signing and notarization are not configured in this repository yet, so generated binaries should currently be treated as unsigned build artifacts.

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
