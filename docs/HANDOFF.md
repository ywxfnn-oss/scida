# Scidata Manager Handoff

## Current Branch

- Primary branch: `codex/document-electron-app-architecture`

## Current State

Scidata Manager is now in a stable-core phase:

- core write paths are hardened
- day-to-day list workflow is usable and faster
- export and diagnostics are operational
- detail view now includes recent edit-history visibility

The current direction should stay narrow:

- prefer small, safe, high-value improvements
- avoid schema changes unless clearly necessary
- avoid large refactors or broad UI redesigns

## Recent Completed Work

- P6: hardened delete and update write-path recovery semantics
- P7: added search-state consistency and minimal filters
- P8: added newest/oldest list sorting
- P9: added list interaction polish for search/reset/empty state
- P10: added clear-selection and selected-count feedback
- P11: added post-export open-folder action
- P12: added detail-page recent edit history

## Current Product Capabilities

- safer delete/update file handling
- search, filter, sort, grouping, selection, batch delete/export
- file integrity scan and recent operation logs in Settings
- duplicate warning before save
- recent edit history on the detail page

## Guardrails

- keep main / preload / renderer boundaries intact
- prefer renderer-only changes when possible
- do not change Prisma schema lightly
- do not expand scope without a capability audit first

## Recommended Working Style

1. Inspect the current capability first.
2. Identify one concrete gap.
3. Propose the smallest useful improvement.
4. Implement narrowly.
5. Validate manually after the change.
