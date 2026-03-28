# Changelog

## Unreleased

## v1.2.2 - 2026-03-28

### Changed

- Polished analysis empty and weak-state wording for:
  - no-chart state
  - empty-chart state
  - all-series-hidden state
  - no-usable-data state
  - no-filter-match state
- Refined lightweight analysis empty-state styling and spacing for cleaner, more consistent readability.
- Polished analysis interaction clarity by keeping draggable chart background and clickable data/legend targets visually distinct.

## v1.2.1 - 2026-03-28

### Added

- Added manual chart-title editing for scalar and structured analysis charts.
- Added lightweight restore-default actions for:
  - chart title
  - per-series display name
  - per-series color

### Changed

- Polished chart-local legend layout so rename, color, order, hide/show, remove, and restore-default actions stay compact and local.
- Extended lightweight analysis persistence so custom chart titles and per-series display overrides restore across restart.

## v1.2.0 - 2026-03-28

### Added

- Added the new `数据分析` entry as a read-only workspace for comparing existing experiment records without modifying source data.
- Added analysis chart support for:
  - `标量图`
  - `结构化图`
- Added the right-side `详情` panel for readable record, condition, metric, and structured-block inspection in analysis flows.
- Added mouse-driven chart interaction in analysis:
  - wheel zoom
  - drag pan
  - reset view
  - single-chart expand view
- Added lightweight analysis UI persistence for:
  - global sidebar collapsed state
  - analysis detail-panel collapsed state
  - analysis chart configuration rebuild state
- Added per-series analysis controls for:
  - hide / show
  - remove
  - rename
  - color adjustment
  - order adjustment

### Changed

- Changed analysis legend behavior so series can be controlled directly from the chart-local legend area.
- Changed `导出当前图数据` in the analysis workspace to export only the currently visible series in the chart.
- Changed analysis persistence to store chart configuration only; no raw-data snapshots or rendered point caches are written.

## v1.1.0 - 2026-03-26

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
- Made detail-edit `数据名称` an auto-generated preview derived from Step 1 fields instead of an independently editable input.
- Updated edit-log wording for derived record-name changes to `记录名称（自动生成）`.
- Unified full-export `详情说明表` wording between the export UI label and exported workbook filename.
- Unified managed raw-file naming for new imports and replacements to:
  - `<displayName>-实验条件-<secondaryItemName><ext>`
  - `<displayName>-结果指标-<secondaryItemName><ext>`
  - `<displayName>-结构化数据块-<secondaryItemName><ext>`
- Made Step 2 scalar-section labels more explicit by using role-specific wording for recommendations, add actions, and editable table headers.
- Aligned structured-block editor wording to `数据块名称（二级数据项名称）`.
- Renamed structured-data secondary-item export workbook filenames to lead with `结构化数据`, keeping `XY` and `光谱` only as secondary qualifiers.

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
