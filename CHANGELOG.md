# Changelog

## Unreleased

### Added

- Added Step 1 dictionary management, quick-add, dictionary validation, and searchable suggestions for standardized fields.
- Added semantic Step 2 sections for:
  - `实验条件`
  - `结果指标`
  - `结构化数据块`
- Added unified structured-data blocks with in-block import preview, parse adjustment, explicit write, and managed-file save integration.
- Added unified secondary-item export support for scalar, XY, and spectrum data.
- Added default-template documentation for Step 1-driven Step 2 guidance, including the first-release photodetector template families.
- Added Step 1 `testProject`-driven Step 2 default template guidance for recommended conditions, metrics, structured data blocks, units, and value-nature hints.

### Changed

- Renamed the structured block title field in the UI to `二级数据项名称`.
- Unified scalar item names and structured block titles under one user-facing `二级数据项` concept.
- Renamed the user-facing structured entry concept to `结构化数据块` and de-emphasized low-level XY naming in the main workflow.
- Moved database-list filtering into a cleaner search-plus-filter-panel workflow and removed obsolete always-visible filter rows.
- Added workflow guidance on Home, Step 1, Step 2, and database export entry points to clarify first-use setup and selection-driven export.
- Restructured export modes to:
  - `完整资料导出`
  - `导出单个二级数据项`
  - `导出全部二级数据项`
- Folded XY and spectrum export into the unified secondary-item export flow.

### Removed

- Removed the standalone strict XY compare export mode from the UI and IPC flow.

### Fixed

- Fixed unified secondary-item export so XY items generate workbooks instead of copying only raw/source files.
- Added export-time collision handling for:
  - secondary-item folders
  - workbook filenames
  - structured workbook column headers
  - raw/source file copies
- Preserved same-name scalar + XY + spectrum export by writing separate workbooks in the same top-level folder.
