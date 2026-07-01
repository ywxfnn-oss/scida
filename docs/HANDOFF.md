# Scida Handoff

## Release Baseline

Scida is now documented for the `v1.6.1` baseline.

## Current State

Current release-level capabilities:

- local-first onboarding, login, and Settings workflow
- Step 1 / Step 2 guided experiment entry
- one active local draft with:
  - save draft and return
  - resume draft
  - discard draft
- `Copy as New Draft` from database detail
- completeness guidance for missing Step 1 fields and incomplete Step 2 content
- database workspace with:
  - saved filter views
  - starred records
  - related records
  - direct open-selected-in-analysis handoff
- structured-data import helper that fills the existing XY field instead of creating a second final-result editor
- compact structured-data review in database detail
- read-only analysis workspace for scalar and structured comparison
- unchanged export semantics from the record/export model

## Current Product Boundaries

- `数据`
  - source-of-truth workflow for create, edit, delete, draft-resume, and managed-file-aware record lifecycle
- `数据分析`
  - read-only comparison layer only
  - persists UI/chart configuration only
  - does not edit source records and does not replace the database workflow
- `导出`
  - remains record-driven
  - keeps existing workbook and ZIP semantics

## Documentation Pointers

Primary docs for the current release baseline:

- `README.md`
- `CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/EXPORT_FLOW.md`
- `docs/DEFAULT_TEMPLATES.md`
- `docs/RELEASE_PROCESS.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/release-notes/v1.5.0.md`
- `docs/release-notes/v1.6.0.md`
- `docs/release-notes/v1.6.1.md`

## Guardrails

- keep main / preload / renderer boundaries intact
- do not change Prisma schema lightly
- keep analysis read-only
- keep export semantics stable
- prefer narrow, evidence-based workflow improvements over broad redesigns

## Current Release Notes

- `v1.5.0`
  - high-frequency record entry improvements
  - drafts, resume flow, completeness guidance, repeated-entry reuse
- `v1.6.0`
  - database workspace upgrade
  - saved views, stars, related records, faster analysis handoff
- `v1.6.1`
  - polish and consistency pass
  - database workspace hierarchy, 24-hour datetime picker, structured-data import/detail polish, analysis naming consistency

## Recommended Working Style

1. Inspect the current capability first.
2. Identify one concrete workflow gap.
3. Propose the smallest useful improvement.
4. Implement narrowly.
5. Validate with both command-level checks and focused manual smoke coverage.
