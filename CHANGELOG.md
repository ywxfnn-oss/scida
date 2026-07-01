# Changelog

## Unreleased

## v1.6.1 - 2026-07-01

### Changed

- Polished the database workspace layout so browse controls, saved-filter controls, and batch actions are more clearly separated while preserving existing selection, export, delete, and detail-open behavior.
- Replaced the locale-dependent native test-time behavior with a controlled single-field calendar-style datetime picker that always uses `YYYY-MM-DD HH:mm` and 24-hour time.
- Simplified Step 2 structured-data import so one structured block maps to one explicit X/Y curve, the raw preview stays fully visible, and `写入当前块` is the only action that writes into the saved XY field.
- Compressed structured-data review in database detail so saved curves are easier to scan without letting large XY text dominate the page.
- Aligned Analysis structured-series naming with database detail naming so selection, legend, and inspector all prefer meaningful block names before fallback labels.

### Fixed

- Fixed copied-draft messaging so the UI correctly states that copied drafts clear `testTime`, scalar values, structured XY text, and file attachments.
- Fixed draft-clearing behavior after final save so local draft state is not cleared unless persisted draft deletion succeeds.
- Fixed completeness guidance so partially filled scalar rows are surfaced consistently with final-save validation expectations.
- Fixed create-flow leave paths so Home/sidebar/cancel exits no longer bypass draft-resume handling.

## v1.6.0 - 2026-07-01

### Added

- Added AppSetting-backed saved database filter views with local save, reopen, rename, and delete behavior.
- Added starred records with persistence across restart, plus star toggles from both database list and detail.
- Added a starred-only database filter for faster return-to-important-record workflows.
- Added related-record navigation on detail pages using derived same-project, same-sample, and same-tester relationships.
- Added direct `在分析中打开所选记录` handoff from the database list as a navigation-only shortcut into the read-only analysis workspace.

### Changed

- Upgraded the database page toward a clearer workspace for finding, filtering, selecting, reviewing, and reusing historical records while keeping analysis and export boundaries unchanged.
- Kept `Copy as New Draft` visible from detail as the narrow reuse entry point, without expanding it into a broader relationship or reuse system.
- Preserved export semantics, analysis semantics, and database schema while moving database personalization state into local settings instead of persistent record data.

## v1.5.0 - 2026-07-01

### Added

- Added `Save Draft and Return`, `Resume Draft`, and `Discard Draft` for a single persisted active entry draft.
- Added `Copy as New Draft` from database detail so users can reuse an existing record as a new entry starting point.
- Added completeness / missing-item guidance for:
  - missing required Step 1 fields
  - pending dictionary confirmation
  - empty Step 2 content
  - partially filled scalar or structured entry content
- Added recent suggestions for frequently reused `testProject` and `instrument` values based on experiment usage.
- Added post-save quick actions for:
  - `Create Similar`
  - `Open Saved Record`
  - `Back Home`

### Changed

- Shifted the next main user-value step from generic workflow hardening toward faster high-frequency record entry and safer incomplete-work handling.
- Kept drafts local-only, out of database browse / analysis / export, and clearly distinct from saved experiments.
- Reduced Step 1 repeated-entry friction without changing export behavior, analysis boundaries, or schema.

## v1.4.0 - 2026-03-29

### Added

- Added `Scida` bilingual UI support with persisted `zh-CN` / `en` shell language selection.
- Added broader English-facing localization across the main guided workflows, including:
  - login
  - onboarding
  - Step 1 / Step 2 guidance text
  - database search / filter / grouping workflow text
  - analysis chart / modal / inspector guidance text
  - detail read-only / edit-history guidance text
- Added a standalone `操作日志` Settings tab before `关于` for recent local operation-log review.

### Changed

- Changed the app branding from `Scidata Manager` to `Scida` in the packaged product shell.
- Changed the mac app icon assets to the new clean polished Scida icon set.
- Formalized the `关于` surface, the third-party notices surface, and the Settings backup reminder so the packaged app presents more like a formal desktop release.
- Polished onboarding and first-run guidance copy for clearer local-first positioning.
- Removed the last confirmed Chinese leakage from the English UI for:
  - default scalar / structured analysis chart titles
  - empty analysis chart guidance
  - generic semantic-template naming

## v1.3.0 - 2026-03-29

### Added

- Added unified chip-based cross-filtering across `数据` and `数据分析`, with a persistent `+` entry point, removable chips, and `清空全部`.
- Added Stage 1 additive cross-filter fields for:
  - Step 1 fields
  - `二级名称`
  - `二级值`
  - `结构化数据块名称`
- Added Stage 2 filtered-workflow polish so filtered source-record candidates flow more directly into scalar and structured comparison, and filtered database results are easier to bulk-select for export.
- Added nullable persisted `scalarRole` on scalar data items as the strict semantic foundation for `实验条件` and `结果指标`.
- Added strict semantic scalar-role filters for:
  - `实验条件名称`
  - `实验条件值`
  - `结果指标名称`
  - `结果指标值`
- Added same-field multi-value filtering so multiple exact-value chips on the same field behave as one any-match group.
- Added numeric range filtering v1 for scalar condition/metric values with:
  - `>=`
  - `<=`
  - `between`
- Added filter value candidate picking so exact-value filters can be built from current data rather than manual typing only.
- Added a first-run onboarding flow before login for:
  - welcome
  - license / privacy acknowledgement
  - storage-root setup
  - local admin username / password setup
  - initialization progress
  - completion
- Added a minimal formal-release shell with:
  - visible app version on onboarding/login shell
  - `关于` entry for version info
  - placeholder update / changelog info
  - placeholder third-party notices info

### Changed

- Changed filter matching to treat persisted DB `scalarRole` as authoritative when present, while still allowing safe legacy fallback for null-role records.
- Changed the filter-building workflow so exact-value multi-select and candidate-value picking still resolve to the same applied chip model.
- Changed candidate-value collection to narrow from the current result set and current semantic context where practical, such as `实验条件名称=温度` before choosing multiple temperature values.
- Kept export selection and analysis chart behavior unchanged while making filtered-result workflows easier to use.
- Changed packaged-build runtime asset handling so `dev.db` and Prisma migrations are bundled for clean first-start bootstrap.

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
