# HANDOFF.md

Release handoff for the current Scida `v1.6.1` baseline.

## Current Product State

Scida currently has three distinct user-facing areas:

- `数据`
  - experiment creation
  - draft / resume / discard flow
  - database list / detail / edit
  - managed-file-aware record lifecycle
- `数据分析`
  - read-only visual comparison of existing records
  - chart configuration, inspection, and local UI persistence only
- `导出`
  - record-driven workbook and ZIP export
  - still owned by the existing database / export workflow

The record system, managed raw-file semantics, and export boundaries remain local-first and source-record-driven.

## Current Capability Summary

### Entry Workflow

- one active persisted local draft
- `Copy as New Draft` from database detail
- completeness guidance for missing and incomplete content
- repeated-entry suggestions for common Step 1 fields
- post-save quick actions for fast continuation
- controlled 24-hour test-time picker using `YYYY-MM-DD HH:mm`

### Database Workspace

- search, grouping, sorting, and cross-filtering
- saved local filter views
- star / unstar from list and detail
- starred-only filtering
- related-record navigation on detail
- direct open-selected-in-analysis handoff

### Structured Data

- one structured block = one explicit X/Y curve
- raw-file import acts as a helper that fills the existing XY field
- raw preview remains visible for mapping review
- compact saved-curve review in database detail

### Analysis

- `标量图`
- `结构化图`
- read-only inspector
- chart image export
- current-chart data export
- local chart/UI persistence
- structured-series naming aligned with database detail fallback naming

## Guardrails

- analysis changes chart configuration only
- analysis never edits or deletes source experiment records
- deleting a chart or series never deletes source data
- persistence stores UI/chart config only
- drafts never become database records until a normal final save succeeds
- export semantics remain record-driven rather than analysis-snapshot-driven
- no schema change was introduced across the `v1.5.0` / `v1.6.0` / `v1.6.1` line

## Remaining Limitations

- only one active draft is supported
- `src/renderer.ts` still carries most UI orchestration complexity
- structured analysis remains a lightweight comparison layer, not a semantic normalization system
- packaging confidence still needs a separate quality track beyond feature delivery

## Sensible Next Steps

1. Strengthen smoke automation around create, draft-resume, detail-edit, structured-data import, database-to-analysis handoff, and export.
2. Continue packaging/signing/notarization readiness as a release-quality track rather than a feature theme.
3. Keep extracting low-coupling renderer/main helpers only where behavior stays unchanged.
4. Continue updating release notes, handoff docs, and product docs together whenever new workflow slices ship.
5. Keep using the repository release checklist and release templates instead of ad-hoc tag or release-body wording.
