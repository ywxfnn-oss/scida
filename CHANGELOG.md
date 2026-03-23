# Changelog

## Unreleased

### Added

- Added Step 1 dictionary management, quick-add, dictionary validation, and searchable suggestions for standardized fields.
- Added structured secondary-item blocks for XY and spectrum data.
- Added unified secondary-item export support for scalar and XY data.

### Changed

- Renamed the structured block title field in the UI to `二级数据项名称`.
- Unified scalar item names and XY block titles under one user-facing `二级数据项` concept.
- Restructured export modes to:
  - `完整资料导出`
  - `导出单个二级数据项`
  - `导出全部二级数据项`
- Folded XY export into the unified secondary-item export flow.

### Removed

- Removed the standalone strict XY compare export mode from the UI and IPC flow.

### Fixed

- Fixed unified secondary-item export so XY items generate workbooks instead of copying only raw/source files.
- Added export-time collision handling for:
  - secondary-item folders
  - workbook filenames
  - XY column headers
  - raw/source file copies
- Preserved same-name scalar + XY export by writing separate workbooks in the same top-level folder.
