# Scidata Manager Handoff

## Release Baseline

Scidata Manager is now at the point of a first complete usable release candidate.

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

## Recommended Working Style

1. Inspect the current capability first.
2. Identify one concrete gap.
3. Propose the smallest useful improvement.
4. Implement narrowly.
5. Validate manually after the change.
