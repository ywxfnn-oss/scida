# CODEX.md

AI Guide for Scidata Manager

## Project Overview

Scidata Manager is a desktop scientific data management application built with Electron and TypeScript.

Primary capabilities:

- manage experiment records locally
- store structured data in SQLite through Prisma
- keep raw files on disk under a configurable storage root
- export experiment data to Excel and ZIP
- package the app through Electron Forge

## Workflow Rules

- Read `README.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` before proposing changes when they are relevant.
- Prefer the smallest necessary change.
- Avoid unrelated edits, new frameworks, and major architecture changes.
- Explain a brief plan first when the request is ambiguous, spans multiple modules, or touches a high-risk area.
- Wait for approval before large changes.
- Do not auto-commit unless explicitly asked.

## Architecture Rules

- Keep the Electron split intact: `src/main.ts`, `src/preload.ts`, `src/renderer.ts`.
- Preserve the current helper split under `src/main/` and `src/renderer/`.
- Prefer minimal changes over broad refactors.
- Keep privileged logic in the main process.
- Treat `storage/raw_files/` as a data directory, not a source module.

Current extracted modules:

- `src/main/auth-settings.ts`
- `src/main/export-helpers.ts`
- `src/main/file-helpers.ts`
- `src/main/runtime-db-helpers.ts`
- `src/main/file-integrity.ts`
- `src/main/duplicate-check.ts`
- `src/renderer/render-helpers.ts`

## Database Rules

- Runtime DB path: `app.getPath('userData')/scidata.db`
- Bundled seed DB: `dev.db`
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Prisma config: `prisma.config.ts`
- Prisma Client generation: `npm run prisma:generate`

When changing database behavior:

1. preserve existing user data
2. keep startup upgrade logic safe and idempotent
3. back up runtime databases before destructive or schema-changing work
4. use Prisma for app queries and writes unless startup migration work requires lower-level SQL

## Security Rules

- Do not expose stored password material to the renderer.
- Keep authentication checks in the main process.
- Store only hashed passwords in app settings.

## Packaging Rules

- Do not break the Vite + Electron Forge pipeline.
- Preserve Prisma and `better-sqlite3` runtime compatibility in packaged builds.
- Avoid unnecessary new dependencies.

## High-Risk Areas

Treat these as high-risk and plan first before changing them:

- `src/main.ts`
- `src/renderer.ts`
- `prisma/schema.prisma`
- `prisma/migrations/`
- startup migration/bootstrap internals in `src/main.ts`
- delete logic in `src/main.ts`
- `experiment:update` file mutation and rollback logic in `src/main.ts`
- managed file storage logic and naming
- export workflows

## Validation

Before finishing code changes, prefer to run:

```bash
npx tsc --noEmit
npm run package
npm test
npm run lint
```

Use the narrowest relevant checks the repo supports. In this repository, `npx tsc --noEmit`, `npm run package`, and `npm run lint` are commonly relevant; run `npm test` only if a test script exists. Startup, Prisma, packaging, delete, storage, and export changes should also get focused manual smoke testing when possible.
