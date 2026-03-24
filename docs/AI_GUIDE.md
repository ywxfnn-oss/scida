# AI_GUIDE.md

AI working guide for the current Scidata Manager main branch.

## Read First

Before changing the project, read:

1. `CODEX.md`
2. `ARCHITECTURE.md`
3. `PROJECT_STATUS.md`
4. `docs/DATABASE.md`
5. `CHANGELOG.md`

## Current Product Baseline

The current main-branch baseline includes:

- local experiment storage and edit flows
- scalar experiment data export
- full export and item-name export
- Settings-based file integrity scan
- duplicate-record warning before create and update saves

## Core Rules for AI Work

1. Do not break export behavior.
2. Do not introduce schema changes without clear justification.
3. Preserve current startup/runtime DB safety behavior.
4. Prefer the smallest safe change.

## When Extending Export

If the request touches export:

- audit `src/main/export-helpers.ts` first
- preserve full export behavior
- preserve current item-name export workbook behavior unless explicitly asked otherwise
- treat filesystem naming and grouping as export-time concerns
- do not convert export-time naming behavior into database constraints

## Safe Workflow

Preferred execution order:

1. plan
2. audit the current code path
3. implement one bounded change
4. validate with `npx tsc --noEmit` and `npm run lint`
5. note remaining manual checks

## High-Risk Areas

Plan first before touching:

- `src/main.ts`
- `src/renderer.ts`
- `src/main/export-helpers.ts`
- `prisma/schema.prisma`
- `prisma/migrations/`

## Anti-Patterns

Avoid these unless explicitly requested:

- export-system redesign
- schema churn for naming problems
- broad renderer refactors during small feature work
- silent behavior changes to export grouping or export shape
