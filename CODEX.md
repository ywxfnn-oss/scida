# CODEX.md

AI Guide for Scidata Manager

## Project Baseline

Scidata Manager is a local Electron + TypeScript scientific data manager with:

- Step 1 dictionary-driven standardized entry
- Step 2 unified secondary-item entry
- scalar secondary data
- XY and spectrum structured blocks
- unified secondary-item export for scalar, XY, and spectrum
- full-record export and managed raw-file packaging

## Development Rules

1. No schema changes without explicit justification.
2. The export system must not be broken.
3. The `二级数据项` concept is a core abstraction.
4. Structured blocks are not separate systems; they are part of the secondary-item system.
5. The export system is unified and must not be split again casually.
6. Structured-data export has no strict alignment requirement by default.
7. Avoid adding new export modes unless explicitly justified.
8. Avoid scope expansion.
9. Prefer the smallest necessary change.
10. Do not refactor unrelated modules during feature work.
11. Keep privileged logic in the main process.

## Workflow

Use this order by default:

1. plan
2. audit
3. implement
4. validate

Execution rules:

- work in small safe steps only
- avoid scope creep
- update docs when product semantics change
- validate with the narrowest relevant checks
- do not auto-commit unless explicitly asked

## Architecture Rules

- Keep the Electron split intact:
  - `src/main.ts`
  - `src/preload.ts`
  - `src/renderer.ts`
- Prefer focused helpers under `src/main/` and `src/renderer/`
- Keep export logic centralized in `src/main/export-helpers.ts`
- Keep template-block rules centralized in `src/template-blocks.ts`
- Keep dictionary persistence centralized in `src/main/dictionary-settings.ts`

## Database Rules

- Runtime DB path: `app.getPath('userData')/scidata.db`
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`

When changing database behavior:

1. preserve user data
2. keep startup upgrades safe and idempotent
3. do not use schema changes to solve export-only naming issues
4. justify any new migration in the task report

## High-Risk Areas

Plan first before changing:

- `src/main.ts`
- `src/renderer.ts`
- `src/main/export-helpers.ts`
- `src/template-blocks.ts`
- `prisma/schema.prisma`
- `prisma/migrations/`
- managed-file naming/copy logic
- delete and update rollback paths

## Validation

Before finishing code changes, prefer to run:

```bash
npx tsc --noEmit
npm run lint
```

If the change touches export, storage, or structured blocks, also do a focused manual smoke check when possible.
