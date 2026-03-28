# ARCHITECTURE.md

Application Architecture for **Scidata Manager**

## Overview

Scidata Manager is a local-first Electron application for storing, browsing, editing, and exporting scientific experiment data.

The app keeps structured records in SQLite through Prisma and stores raw experiment files on disk under a configurable storage root.

## Product Boundaries

Current product behavior is intentionally split into three adjacent but different areas:

- `数据`
  - owns experiment creation, database list/detail/edit, and managed-file-aware record lifecycle
- `数据分析`
  - owns read-only visual comparison of existing records
  - stores UI/chart configuration only
  - never becomes the source-of-truth path for experiment data
- `导出`
  - owns workbook and ZIP export behavior
  - still runs off the existing record/export model rather than analysis-side snapshots

## Runtime Layers

### Main Process
**Files:** `src/main.ts`, `src/main/*.ts`

Responsibilities:

- `src/main.ts`
  - app lifecycle and `BrowserWindow` creation
  - runtime database preparation and Prisma initialization
  - IPC registration
  - remaining high-risk startup, delete, and update-file-mutation flows
- `src/main/auth-settings.ts`
  - login verification
  - settings reads and writes
  - password hashing and verification helpers
- `src/main/export-helpers.ts`
  - Excel workbook generation
  - ZIP creation
  - full export and item-name export flows
- `src/main/ui-state-settings.ts`
  - lightweight UI-state persistence for global shell state and analysis workspace config
- `src/main/file-helpers.ts`
  - path building
  - filesystem helper utilities
- `src/main/managed-file-naming.ts`
  - managed raw-file naming resolution
  - same-group slot/index handling for new imports and replacements
- `src/main/create-scalar-file-helpers.ts`
  - create-save scalar managed-file finalization against the saved display-name context
- `src/main/edit-log.ts`
  - edit-history summary wording and changed-field labeling
- `src/main/runtime-db-helpers.ts`
  - runtime DB path resolution
  - migration discovery helpers
- `src/main/file-integrity.ts`
  - read-only managed-file scan and report generation
- `src/main/duplicate-check.ts`
  - read-only duplicate-record lookup used before save/update warnings

Startup database flow:

1. resolve `app.getPath('userData')/scidata.db`
2. copy `dev.db` on first launch if needed
3. inspect and apply pending SQL migrations from `prisma/migrations/`
4. migrate legacy auth settings to hashed password storage
5. connect Prisma

Important current reality:

- `src/main.ts` is no longer fully monolithic, but still contains the highest-risk startup and mutation paths.
- delete behavior and `experiment:update` file rename/replace/rollback logic remain concentrated in `src/main.ts`.

### Preload Bridge
**File:** `src/preload.ts`

Responsibilities:

- expose a typed `window.electronAPI`
- keep Node/Electron access out of the renderer
- forward renderer requests to main-process IPC handlers
- include additive APIs for duplicate checks and file integrity scan results
- include additive APIs for read/write of persisted analysis UI configuration

### Renderer
**Files:** `src/renderer.ts`, `src/renderer/render-helpers.ts`

Responsibilities:

- `src/renderer.ts`
  - screen/view orchestration
  - event binding
  - DOM/state collection
  - preload API usage
  - read-only analysis workspace state and chart interaction
- `src/renderer/render-helpers.ts`
  - pure formatting helpers
  - parameterized HTML string builders used by the renderer

Current user-facing safety features:

- Settings includes a minimal file integrity scan report for the configured `storageRoot`.
- create and update save flows include a non-blocking duplicate-record warning.
- analysis remains chart-config-only and does not edit or delete source records.

## Database Layer

- Schema: `prisma/schema.prisma`
- Migration history: `prisma/migrations/`
- Prisma config: `prisma.config.ts`
- Bundled seed DB: `dev.db`
- Runtime DB: `app.getPath('userData')/scidata.db`

Prisma is initialized once in the main process and all database access goes through main-process IPC handlers.
Prisma Client generation is part of repository setup through `npm run prisma:generate` and `postinstall`.

## Data Storage

- `storage/raw_files/` in the repository is example/local data, not a source-code module.
- The real runtime raw-file storage root defaults to `app.getPath('userData')/storage/raw_files`.
- Users can change the storage root in app settings.

Current managed raw-file naming behavior:

- naming authority for records stays in the Step 1-derived `displayName`
- new imports and replacements use `<displayName>-<sectionLabel>-<secondaryItemName><ext>`
- section labels are limited to `实验条件`, `结果指标`, and `结构化数据块`
- unchanged historical managed files are not batch-renamed automatically

## Build and Packaging

- Vite builds `main`, `preload`, and `renderer` entrypoints.
- Electron Forge packages the app.
- `forge.config.ts` copies required Prisma and `better-sqlite3` runtime assets into packaged output.

## Current Structure Notes

The implementation is still intentionally compact:

- high-risk startup and mutation logic still lives mostly in `src/main.ts`
- low-risk helper logic has started moving into `src/main/` and `src/renderer/`
- the preload contract is defined in shared TypeScript types
- no dedicated `src/storage/` code layer exists yet
