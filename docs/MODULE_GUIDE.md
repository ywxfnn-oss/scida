# MODULE_GUIDE.md

Module Guide for Scidata Manager

## Core Modules

### 1. Main Process Composition
**Location:** `src/main.ts`

Responsibilities:

- app lifecycle
- `BrowserWindow` creation
- runtime DB preparation and Prisma setup
- IPC registration
- remaining high-risk delete and update-file-mutation flows

### 2. Main Process Helpers
**Location:** `src/main/`

Current modules:

- `auth-settings.ts`
  - login verification
  - app settings reads and writes
  - password hashing helpers
- `export-helpers.ts`
  - full export
  - item-name export
  - workbook and ZIP helpers
- `file-helpers.ts`
  - managed file/path naming helpers
  - directory creation and temp/backup path helpers
- `runtime-db-helpers.ts`
  - runtime DB path helpers
  - migration discovery helpers
- `file-integrity.ts`
  - read-only scan of referenced and orphan managed files
- `duplicate-check.ts`
  - read-only exact-match duplicate lookup for warning prompts

### 3. Preload Bridge
**Location:** `src/preload.ts`

Responsibilities:

- expose the typed `window.electronAPI`
- bridge renderer requests to IPC
- keep privileged APIs out of the renderer

Current additive safety-related APIs include:

- duplicate check before save/update warning
- file integrity scan report

The preload contract remains defined by shared types in `src/electron-api.ts`.

### 4. Shared IPC Types
**Location:** `src/electron-api.ts`

Responsibilities:

- define the preload contract
- keep `preload.ts`, renderer usage, and global typings aligned

### 5. Renderer Composition
**Location:** `src/renderer.ts`

Responsibilities:

- render the UI
- manage view state and form state
- call preload APIs
- surface user-visible success and error states

Current user-facing safety features:

- Settings includes file integrity scan v1
- create and update flows include duplicate warning v1

### 6. Renderer Helpers
**Location:** `src/renderer/render-helpers.ts`

Responsibilities:

- pure formatting helpers
- parameterized HTML string builders
- reusable render fragments with no preload access

`src/renderer.ts` still owns orchestration, event binding, and DOM/state collection.

### 7. Database Layer
**Location:** `prisma/`

Responsibilities:

- schema definition
- migration history
- database evolution for packaged and existing users

### 8. Runtime Storage
**Locations:** runtime user-data directory and optional configured storage root

Responsibilities:

- raw source-file storage
- exported files
- runtime SQLite database

Note: `storage/raw_files/` in the repository is data, not a reusable code module.

### 9. Build and Packaging
**Locations:** `vite.*.config.ts`, `forge.config.ts`

Responsibilities:

- compile each Electron target
- keep Prisma and native SQLite runtime assets available in packaged builds
