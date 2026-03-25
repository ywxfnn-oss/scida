# MODULE_GUIDE.md

Module guide for the current Scidata Manager main branch.

## Main Process Composition

**Primary file:** `src/main.ts`

Current responsibilities:

- app lifecycle
- `BrowserWindow` creation
- runtime database preparation and Prisma initialization
- IPC registration
- remaining high-risk startup, delete, and update-file-mutation flows

`src/main.ts` is smaller than earlier revisions, but it still owns the highest-risk runtime and mutation paths.

## Main Process Helpers

**Primary folder:** `src/main/`

Current helper modules:

- `auth-settings.ts`
  - login verification
  - app settings reads and writes
  - password hashing and verification helpers
- `delete-helpers.ts`
  - managed-file-aware experiment delete flow
  - shared-reference protection during delete
- `record-file-update-helpers.ts`
  - managed-file-aware experiment update flow
  - update rollback and finalize ordering
- `export-helpers.ts`
  - full export
  - item-name export
  - workbook and ZIP helpers
- `file-helpers.ts`
  - managed file naming
  - path building
  - filesystem helper utilities
- `runtime-db-helpers.ts`
  - runtime DB path resolution
  - migration discovery helpers
- `import-format-registry.ts`
  - parser registration contracts for import preview
- `import-parsers.ts`
  - generic XY parsing
  - manual XY remap support
  - XRD text parsing
- `import-preview-service.ts`
  - import file preview orchestration
  - parser selection and preview result generation
- `managed-file-conflicts.ts`
  - collision checks for managed-file save/update paths
- `template-block-file-helpers.ts`
  - structured-block managed-file copy and replacement preparation
- `file-integrity.ts`
  - read-only managed-file scan and report generation
- `duplicate-check.ts`
  - read-only exact-match duplicate lookup used before save/update warnings

These helpers reduce low-risk clutter in `src/main.ts`, but they do not remove the need to review main-process mutation flows carefully.

## Preload Bridge

**Primary file:** `src/preload.ts`

Current responsibilities:

- expose a typed `window.electronAPI`
- bridge renderer requests to main-process IPC handlers
- keep direct Node/Electron access out of the renderer

Current additive safety-related APIs include:

- duplicate check before save/update warning
- file integrity scan report
- structured-block import preview and manual remap preview

## Shared IPC Contract

**Primary file:** `src/electron-api.ts`

Current responsibilities:

- define the preload contract
- keep `preload.ts`, renderer usage, and global typings aligned

When changing renderer/main communication, update the shared types first and keep the preload bridge additive and explicit.

## Renderer Composition

**Primary files:**

- `src/renderer.ts`
- `src/renderer/render-helpers.ts`

Current renderer responsibilities:

- render the UI
- manage view state and form state
- call preload APIs
- surface user-visible success and error states
- apply Step 1 `testProject`-driven default template guidance in Step 2 for recommended conditions, metrics, and structured data starting points
- keep create Step 2 and detail-edit aligned around the same secondary-item editing model

Current renderer helper responsibilities:

- pure formatting helpers
- parameterized HTML string builders
- reusable render fragments with no preload access

Current user-facing safety features:

- Settings includes a file integrity scan report
- create and update flows include duplicate warning prompts

Current concentration risk:

- `src/renderer.ts` still owns most orchestration, event binding, and DOM/state collection

## Database and Runtime DB Layer

**Primary locations:**

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma.config.ts`
- `dev.db`
- `src/main.ts`
- `src/main/runtime-db-helpers.ts`
- `src/main/auth-settings.ts`

Current runtime behavior:

1. resolve `app.getPath('userData')/scidata.db`
2. copy `dev.db` on first launch if needed
3. inspect and apply pending SQL migrations from `prisma/migrations/`
4. migrate legacy auth settings to hashed-password storage
5. connect Prisma

Database access stays in the main process. Startup and migration safety remain high-risk areas.

## Runtime Storage and File Operations

Current runtime storage concerns:

- managed source-file storage under the configured storage root
- managed structured-block source files copied from imported originals
- exported workbooks and ZIPs
- runtime SQLite database under the user-data directory

Key current behavior:

- `storage/raw_files/` in the repository is data, not a reusable code module
- managed file naming and path generation are centralized in `src/main/file-helpers.ts`
- delete and update flows still coordinate database state with filesystem mutations in high-risk code paths

## Build and Packaging

**Primary files:**

- `vite.*.config.ts`
- `forge.config.ts`

Current responsibilities:

- build each Electron target
- preserve Prisma and native SQLite runtime compatibility in packaged builds

Packaging changes should be treated as high-risk because they can break startup, Prisma resolution, or native module loading.

## Current High-Risk Areas

Plan carefully before touching:

- `src/main.ts`
- `src/renderer.ts`
- `src/main/export-helpers.ts`
- `prisma/schema.prisma`
- `prisma/migrations/`
- startup migration/bootstrap logic
- delete logic and update-file rollback paths
- managed-file naming and copy behavior
- packaging configuration

## Safe Extension Guidance

When extending the current main branch:

1. preserve the Electron main/preload/renderer boundary
2. prefer focused helper extraction over broad rewrites
3. keep privileged filesystem and database access in the main process
4. preserve current export behavior unless explicitly changing it
5. treat schema, startup, delete, update-file mutation, and packaging changes as high-risk
6. keep documentation aligned with current code, not planned architecture
