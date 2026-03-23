# AI_GUIDE.md

AI Working Guide for Scidata Manager

## Read First

Before changing the project, read:

1. `CODEX.md`
2. `docs/MODULE_GUIDE.md`
3. `docs/DATABASE.md`
4. `docs/EXPORT_FLOW.md`
5. `PROJECT_STATUS.md`
6. `CHANGELOG.md`

## Current Product Baseline

The current baseline includes:

- Step 1 dictionary-driven standardized entry
- Step 2 unified secondary-item entry
- scalar secondary items
- XY structured secondary items
- spectrum structured secondary items
- unified secondary-item export for scalar and XY

## Core Rules for AI Work

1. Do not break the export system.
2. Do not break the `二级数据项` naming layer.
3. Do not break Step 1 dictionary semantics.
4. Do not introduce schema changes without clear justification.
5. Prefer the smallest safe change.

## When Extending Export

If the request touches export:

- audit `src/main/export-helpers.ts` first
- preserve full export behavior
- preserve scalar workbook behavior unless the user explicitly asks otherwise
- treat filesystem naming and grouping as export-time concerns
- do not convert export-time collision handling into database constraints

When adding a new secondary-item export type:

- keep grouping based on the full original secondary-item name
- do not generalize names like `iv（-100，100）` into `iv`
- keep type-specific workbook writers separate if the data shape differs

## When Extending Structured Blocks

If the request touches XY or spectrum blocks:

- read `src/template-blocks.ts` first
- preserve the current block model
- keep block metadata explicit
- keep point-order preservation intact
- avoid adding plotting, fitting, or calculation engines unless explicitly requested

## When Extending Dictionaries

If the request touches Step 1 dictionaries:

- keep dictionary persistence in `src/main/dictionary-settings.ts`
- do not mutate historical experiment records
- do not silently auto-add unknown values
- keep Settings management and Step 1 quick-add semantics aligned

## Safe Workflow

Preferred execution order:

1. plan
2. audit current code
3. implement one bounded change
4. validate with `npx tsc --noEmit` and `npm run lint`
5. note remaining manual checks

## High-Risk Areas

Plan first before touching:

- `src/main.ts`
- `src/renderer.ts`
- `src/main/export-helpers.ts`
- `src/template-blocks.ts`
- `prisma/schema.prisma`
- `prisma/migrations/`

## Anti-Patterns

Avoid these unless explicitly requested:

- export-system redesign
- schema churn for naming problems
- mixing scalar and structured workbooks into one generic writer
- broad renderer refactors during small feature work
- silent behavior changes to dictionaries or export grouping
