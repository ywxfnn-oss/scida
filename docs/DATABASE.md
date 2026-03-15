# DATABASE.md

Database Guide for Scidata Manager

## Stack

- Prisma ORM
- SQLite
- local runtime database

## Key Files

- `prisma/schema.prisma`
- `prisma/migrations/`
- `dev.db` for the bundled seed database
- runtime database at `app.getPath('userData')/scidata.db`

## Startup Behavior

At startup the main process:

1. ensures the runtime database file exists
2. copies `dev.db` on first launch if needed
3. inspects `_prisma_migrations`
4. applies any missing SQL migrations from `prisma/migrations/`
5. migrates legacy auth settings from `loginPassword` to `loginPasswordHash`
6. connects Prisma

If startup needs to mutate an existing runtime database, it creates a backup first.

## Principles

1. Use Prisma Client for normal application reads and writes.
2. Keep schema changes intentional and traceable through migrations.
3. Preserve existing user data during upgrades.
4. Do not reintroduce plain-text password storage.
5. Avoid destructive migration behavior without a backup path.

## Migration Workflow

When schema changes are required:

1. update `prisma/schema.prisma`
2. generate a new migration
3. verify startup upgrade compatibility for existing `scidata.db` files
4. test read/write flows after the migration

## Risk Areas

- changing relation definitions
- changing required fields
- altering auth-setting keys used at startup
- modifying migration order or migration detection logic
