# DATABASE.md

Database guide for the current Scidata Manager main branch.

## Stack

- Prisma ORM
- SQLite
- runtime DB at `app.getPath('userData')/scidata.db`

This file is limited to current main-branch runtime database behavior and safety rules.

Current `v1.1.0` release boundary:

- no schema changes were introduced for the naming-consolidation work
- derived record naming, export naming, Step 2 wording, and managed-file naming changes were implemented without DB-table changes
- there is no historical managed-file batch rename migration in this release

## Key Files

- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/migrations/`
- `dev.db` for the bundled seed database
- runtime database at `app.getPath('userData')/scidata.db`
- `src/main.ts` for startup preparation and Prisma initialization
- `src/main/runtime-db-helpers.ts` for runtime DB path and migration discovery helpers
- `src/main/auth-settings.ts` for settings and password-related data access

## Startup and Migration Behavior

At startup the main process:

1. resolves the runtime DB path
2. copies `dev.db` on first launch if needed
3. inspects `_prisma_migrations`
4. applies any missing SQL migrations from `prisma/migrations/`
5. migrates legacy auth settings from `loginPassword` to `loginPasswordHash`
6. connects Prisma

If startup needs to mutate an existing runtime DB, it creates a backup first.

## Prisma Client Generation

Current setup:

- `@prisma/client` is generated with `npm run prisma:generate`
- `postinstall` runs Prisma generate automatically after install
- `prisma.config.ts` points Prisma at:
  - `prisma/schema.prisma`
  - `prisma/migrations/`
  - `DATABASE_URL` from the environment

This matters because startup depends on Prisma Client being generated correctly. A missing generated client can surface as module resolution errors under `@prisma/client`.

## Change Rules

When changing database behavior:

1. preserve existing user data
2. justify every schema change explicitly
3. keep startup and migration behavior safe and idempotent
4. keep privileged reads and writes in the main process

## Risk Areas

- `prisma/schema.prisma`
- `prisma/migrations/`
- runtime DB bootstrap in `src/main.ts`
- auth-settings migration flow
- managed-file path and copy logic
- update/delete flows that coordinate DB state with filesystem state
