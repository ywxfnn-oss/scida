# ARCHITECTURE.md

Application Architecture for **Scidata Manager**

## Overview

Scidata Manager is a local-first Electron application for storing, browsing, editing, and exporting scientific experiment data.

The app keeps structured records in SQLite through Prisma and stores raw experiment files on disk under a configurable storage root.

## Runtime Layers

### Main Process
**File:** `src/main.ts`

Responsibilities:

- app lifecycle and `BrowserWindow` creation
- runtime database preparation
- Prisma initialization
- IPC registration
- file copy/open operations
- Excel and ZIP export workflows

Startup database flow:

1. resolve `app.getPath('userData')/scidata.db`
2. copy `dev.db` on first launch if needed
3. inspect and apply pending SQL migrations from `prisma/migrations/`
4. migrate legacy auth settings to hashed password storage
5. connect Prisma

### Preload Bridge
**File:** `src/preload.ts`

Responsibilities:

- expose a typed `window.electronAPI`
- keep Node/Electron access out of the renderer
- forward renderer requests to main-process IPC handlers

### Renderer
**File:** `src/renderer.ts`

Responsibilities:

- render the app UI
- manage screen/view state
- collect form input
- call preload APIs for data access, exports, and settings

## Database Layer

- Schema: `prisma/schema.prisma`
- Migration history: `prisma/migrations/`
- Bundled seed DB: `dev.db`
- Runtime DB: `app.getPath('userData')/scidata.db`

Prisma is initialized once in the main process and all database access goes through main-process IPC handlers.

## Data Storage

- `storage/raw_files/` in the repository is example/local data, not a source-code module.
- The real runtime raw-file storage root defaults to `app.getPath('userData')/storage/raw_files`.
- Users can change the storage root in app settings.

## Build and Packaging

- Vite builds `main`, `preload`, and `renderer` entrypoints.
- Electron Forge packages the app.
- `forge.config.ts` copies required Prisma and `better-sqlite3` runtime assets into packaged output.

## Current Structure Notes

The implementation is intentionally compact:

- business logic currently lives mostly in `src/main.ts`
- the preload contract is defined in shared TypeScript types
- no dedicated `src/storage/` code layer exists yet
