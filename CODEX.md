# CODEX.md

Workflow Guide for Scidata Manager

## Project Baseline

Scidata Manager is a local Electron + TypeScript scientific data manager with:

- local experiment record storage in SQLite through Prisma
- scalar experiment data entry, detail, edit, and save flows
- full export and item-name export
- managed raw-file storage
- Settings-based file integrity scan and duplicate-record warning support

Current `v1.1.0` baseline details that should be treated as stable unless a task explicitly changes them:

- record-level `displayName` is derived from Step 1 fields and is not an independent business field
- detail-edit shows record naming as `数据名称（自动生成）`
- Step 2 uses three semantic sections:
  - `实验条件`
  - `结果指标`
  - `结构化数据块`
- new or replaced managed raw/source files use `<displayName>-<sectionLabel>-<secondaryItemName><ext>`
- same-group indexing only applies within the same `displayName + sectionLabel + secondaryItemName`
- full export writes `<displayName>_详情说明表.xlsx`
- structured-data secondary-item export writes:
  - `<name>_结构化数据（XY）.xlsx`
  - `<name>_结构化数据（光谱）.xlsx`
- edit-log summaries describe derived record-name changes as `记录名称（自动生成）`

## Development Rules

1. No schema changes without explicit justification.
2. The export system must not be broken.
3. Preserve current item-name export behavior unless explicitly changing it.
4. Avoid adding new product-level abstractions or export modes without explicit justification.
5. Avoid scope expansion.
6. Prefer the smallest necessary change.
7. Do not refactor unrelated modules during feature work.
8. Keep privileged logic in the main process.

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
- keep `CODEX.md` as the single active workflow-guide document
- keep `docs/DEFAULT_TEMPLATES.md` aligned when Step 1-driven Step 2 template guidance changes
- validate with the narrowest relevant checks
- do not auto-commit unless explicitly asked

## Architecture Rules

- Keep the Electron split intact:
  - `src/main.ts`
  - `src/preload.ts`
  - `src/renderer.ts`
- Prefer focused helpers under `src/main/` and `src/renderer/`
- Keep export logic centralized in `src/main/export-helpers.ts`

## Database Rules

- Runtime DB path: `app.getPath('userData')/scidata.db`
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`

When changing database behavior:

1. preserve user data
2. keep startup upgrades safe and idempotent
3. do not use schema changes to solve export-only naming issues
4. justify any new migration in the task report

## Security Rules

- Do not expose stored password material to the renderer.
- Keep authentication checks in the main process.
- Store only hashed passwords in app settings.

## Packaging Rules

- Do not break the Vite + Electron Forge pipeline.
- Preserve Prisma and `better-sqlite3` runtime compatibility in packaged builds.
- Avoid unnecessary new dependencies.

## High-Risk Areas

Plan first before changing:

- `src/main.ts`
- `src/renderer.ts`
- `src/main/export-helpers.ts`
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

If the change touches export, storage, or startup/runtime DB behavior, also do a focused manual smoke check when possible.
