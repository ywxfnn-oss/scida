# Scidata Manager Handoff

## Release Baseline

Scidata Manager is now prepared for the `v1.1.0` naming-consolidation release.

## Current State

Current release-level capabilities:

- login and Settings workflow are usable
- Step 1 supports standardized first-level metadata entry with dictionary guidance
- Step 2 now uses three semantic sections:
  - 实验条件
  - 结果指标
  - 结构化数据块
- structured data blocks support in-block file import, parse adjustment, explicit write, and normal save/update flow
- database list acts as the main workspace for browse, filter, grouping, selection, detail open, and export
- detail view, detail edit, duplicate warning, and edit history are operational
- export remains available from selected experiments in the database list
- Step 1 `testProject` can guide Step 2 through default template recommendations
- record naming is explicitly derived from Step 1 rather than treated as an independent editable field
- managed raw/source naming for new imports and replacements is unified across create and update
- export-facing workbook naming now aligns with:
  - `详情说明表`
  - `结构化数据（XY）`
  - `结构化数据（光谱）`

Current direction should stay narrow:

- prefer small, safe, high-value improvements
- avoid schema changes unless clearly necessary
- avoid large refactors or broad UI redesigns

## Recent Completed Work

- hardened delete/update managed-file mutation paths
- unified Step 2 around conditions, metrics, and structured data blocks
- added structured block import preview, manual remap, XRD parsing, and apply-to-block flow
- integrated imported structured-block files into managed storage on save/update
- aligned create Step 2 and detail-edit around the same block-centered structured-data workflow
- simplified database list search/filter controls and clarified export-from-selection workflow
- added Step 1-driven Step 2 default template guidance and documentation
- completed the naming-consolidation round for:
  - derived record naming in detail-edit
  - full-export `详情说明表` naming
  - managed raw-file naming for new imports and replacements
  - Step 2 scalar-section wording
  - structured-data export naming
  - edit-log wording for derived record-name changes

## Current Product Capabilities

- safer delete/update file handling
- dictionary-guided Step 1 input
- semantic Step 2 entry for conditions, metrics, and structured data
- structured-data import/replace/parse/write workflow inside the block editor
- search, filter, grouping, selection, batch delete/export
- file integrity scan and recent operation logs in Settings
- duplicate warning before create/update save
- detail edit with edit-history visibility
- Step 1-driven Step 2 default template guidance for first-release photodetector workflows
- consistent naming behavior across detail-edit, managed file storage, full export, secondary-item export, and edit history

## Documentation Pointers

Primary docs for the current release baseline:

- `docs/MODULE_GUIDE.md`
- `docs/DATABASE.md`
- `docs/EXPORT_FLOW.md`
- `docs/DEFAULT_TEMPLATES.md`
- `CODEX.md`

## Guardrails

- keep main / preload / renderer boundaries intact
- prefer renderer-only changes when possible
- do not change Prisma schema lightly
- do not break export semantics
- do not expand scope without a capability audit first

## Intentionally Not Included In v1.1.0

- no schema changes
- no database-table redesign
- no historical managed-file batch rename migration
- no broad structured-data internal refactor
- no template-semantic persistence redesign
- no export-builder redesign

## Next Recommended Direction

- add repeatable smoke-test automation around create, detail-edit, managed-file replacement, and export flows
- continue low-risk extraction from `src/renderer.ts` and `src/main.ts` only where behavior stays unchanged
- keep future work narrow and evidence-based rather than reopening the completed naming decisions

## Recommended Working Style

1. Inspect the current capability first.
2. Identify one concrete gap.
3. Propose the smallest useful improvement.
4. Implement narrowly.
5. Validate manually after the change.
