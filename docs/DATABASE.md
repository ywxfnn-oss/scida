# DATABASE.md

Database Guide for Scidata Manager

## Stack

- Prisma ORM
- SQLite
- local runtime database at `app.getPath('userData')/scidata.db`

## Core Data Model

Current experiment storage is split into three layers:

- `Experiment`
  - first-level standardized metadata
  - `testProject`, `sampleCode`, `tester`, `instrument`, `testTime`, `displayName`
- `ExperimentDataItem`
  - scalar secondary data items
  - stores `itemName`, `itemValue`, `itemUnit`, and optional managed/source file metadata
- `ExperimentTemplateBlock`
  - structured secondary data items
  - currently supports:
    - `templateType = "xy"`
    - `templateType = "spectrum"`
  - stores `blockTitle`, `blockOrder`, `metaJson`, `dataJson`, and optional managed/source file metadata

Related tables:

- `ExperimentCustomField`
- `EditLog`
- `OperationLog`
- `AppSetting`

## Unified Secondary-Item Concept

The product now uses one user-facing abstraction:

- `二级数据项`

This unified concept maps to two storage forms:

- scalar secondary item
  - stored in `ExperimentDataItem`
  - user-facing name comes from `itemName`
- structured secondary item
  - stored in `ExperimentTemplateBlock`
  - user-facing name comes from `blockTitle`
  - UI label is `二级数据项名称`

Important rule:

- export grouping uses the full original secondary-item name exactly as entered by the user
- filesystem-safe renaming happens only during export path generation
- sanitization must never change grouping semantics

Examples:

- `iv（-100，100）` and `iv（-1，1）` are different secondary items
- they remain different groups even if their filesystem-safe names need suffixes

## Structured Block Storage

Structured blocks reuse one table:

- `ExperimentTemplateBlock`

Current fields:

- `templateType`
- `blockTitle`
- `blockOrder`
- `metaJson`
- `dataJson`
- `sourceFileName`
- `sourceFilePath`
- `originalFileName`
- `originalFilePath`

Current semantics:

- `blockTitle` is the stored value behind the UI label `二级数据项名称`
- `metaJson` stores template-specific metadata
- `dataJson` stores ordered point arrays for XY and spectrum blocks
- `blockOrder` preserves display and export order inside one experiment

## Uniqueness Rules

There is no schema-level uniqueness layer for the unified `二级数据项` concept across scalar and structured items.

That means:

- scalar `itemName` values are not globally unique
- the same user-facing secondary-item name may exist across many experiments
- the same name may exist in both scalar and structured forms
- export-time naming collisions are resolved during export, not in the database

Implementation note:

- structured blocks currently also keep a storage-level uniqueness constraint on
  `experimentId + templateType + blockTitle`
  to prevent duplicate same-type block titles inside one experiment
- this is narrower than the user-facing unified secondary-item concept and should not be treated as a global naming rule

## Step 1 Dictionary Data

Step 1 standardized fields are backed by dictionary settings stored in `AppSetting` JSON blobs:

- `dictionary:testProject`
- `dictionary:tester`
- `dictionary:instrument`

The dictionary layer is separate from experiment records:

- deleting a dictionary item removes it from future suggestions only
- historical experiment records are never mutated

## Startup and Migration Behavior

At startup the main process:

1. ensures the runtime database file exists
2. copies `dev.db` on first launch if needed
3. checks applied migrations
4. applies any missing SQL migrations from `prisma/migrations/`
5. performs required runtime setting migrations
6. connects Prisma

If startup needs to mutate an existing runtime database, it creates a backup first.

## Change Rules

When changing database behavior:

1. preserve existing user data
2. justify every schema change explicitly
3. do not treat export-time naming problems as database uniqueness problems by default
4. keep first-level dictionaries, scalar items, and structured blocks conceptually separate
5. keep all privileged reads and writes in the main process

## Risk Areas

- `prisma/schema.prisma`
- `prisma/migrations/`
- runtime DB bootstrap in `src/main.ts`
- managed-file path and copy logic
- update/delete flows that coordinate DB state with filesystem state
- any change that blurs scalar vs structured storage semantics
