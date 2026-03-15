# MODULE_GUIDE.md

Module Guide for Scidata Manager

## Core Modules

### 1. Main Process
**Location:** `src/main.ts`

Responsibilities:

- app lifecycle
- BrowserWindow creation
- runtime DB preparation and Prisma setup
- IPC registration
- file operations
- export workflows

### 2. Preload Bridge
**Location:** `src/preload.ts`

Responsibilities:

- expose the typed `window.electronAPI`
- bridge renderer requests to IPC
- keep privileged APIs out of the renderer

### 3. Shared IPC Types
**Location:** `src/electron-api.ts`

Responsibilities:

- define the preload contract
- keep `preload.ts`, renderer usage, and global typings aligned

### 4. Renderer
**Location:** `src/renderer.ts`

Responsibilities:

- render the UI
- manage view state and form state
- call preload APIs
- surface user-visible success and error states

### 5. Database Layer
**Location:** `prisma/`

Responsibilities:

- schema definition
- migration history
- database evolution for packaged and existing users

### 6. Runtime Storage
**Locations:** runtime user-data directory and optional configured storage root

Responsibilities:

- raw source-file storage
- exported files
- runtime SQLite database

Note: `storage/raw_files/` in the repository is data, not a reusable code module.

### 7. Build and Packaging
**Locations:** `vite.*.config.ts`, `forge.config.ts`

Responsibilities:

- compile each Electron target
- keep Prisma and native SQLite runtime assets available in packaged builds
