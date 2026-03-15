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

## Architecture Rules

- Keep the Electron split intact: `src/main.ts`, `src/preload.ts`, `src/renderer.ts`.
- Prefer minimal changes over broad refactors.
- Keep privileged logic in the main process.
- Treat `storage/raw_files/` as a data directory, not a source module.

## Database Rules

- Runtime DB path: `app.getPath('userData')/scidata.db`
- Bundled seed DB: `dev.db`
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`

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

## Validation

Before finishing code changes, prefer to run:

```bash
npm run lint
```

Run packaging or additional smoke checks when the change touches startup, Prisma, or packaging behavior.
