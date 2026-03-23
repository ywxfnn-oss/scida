# Project Status

## Current Status

Scidata Manager is now in a stable local-desktop baseline for standardized entry, structured storage, and unified export.

Current baseline:

- login and settings management work
- Step 1 dictionary-driven entry works
- Step 2 scalar + XY + spectrum entry works
- detail view, edit, and save work
- full export and unified secondary-item export work
- managed file integrity scanning is available from Settings
- duplicate-record warnings run before create and update saves

## Completed Milestones

- **P13: dictionary system**
  - Settings-based dictionary management
  - Step 1 quick-add with `+`
  - Step 1 dictionary validation on `下一步`
  - Step 1 searchable suggestions for `testProject`, `tester`, `instrument`

- **P15: structured blocks**
  - XY structured secondary-item blocks
  - spectrum structured secondary-item blocks
  - structured block storage and reload
  - mixed scalar + structured records

- **P16: unified export system**
  - standalone strict XY compare export removed
  - XY folded into unified secondary-item export
  - spectrum folded into unified secondary-item export
  - export-time naming collision handling
  - same-name scalar + XY + spectrum export into one folder with separate workbooks

## Current Capabilities

### Data entry

- dictionary-governed Step 1 fields
- explicit quick-add for dictionary values
- scalar secondary data entry
- XY structured entry
- spectrum structured entry

### Structured storage

- scalar data stored in `ExperimentDataItem`
- XY and spectrum stored in `ExperimentTemplateBlock`
- block order, metadata, points, and source files preserved

### Flexible export

- full-record export
- single secondary-item export
- all secondary-item export
- no strict comparison or strict alignment requirement for structured export
- collision-safe folder/file naming
- raw/source file packaging by sample code

## Current Technical Debt / Limitations

- `src/renderer.ts` still owns most page orchestration, form collection, and event binding
- `src/main.ts` still owns startup, IPC registration, and several high-risk write paths
- operation-log code still keeps compatibility with historical XY-compare log entries
- full export remains intentionally separate from unified secondary-item export and still should not be treated as the same packaging path

## Recommended Next Priorities

- keep documentation aligned with the current baseline
- continue safe extraction of renderer/main helper logic only when justified
- add focused manual smoke coverage around export, structured blocks, and file-integrity flows
