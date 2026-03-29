# HANDOFF.md

Release handoff for the current Scidata Manager analysis and filtering milestone.

## Current Product State

Scidata Manager currently has three distinct user-facing areas:

- `数据`
  - experiment creation
  - database list/detail/edit
  - managed-file-aware record lifecycle
- `数据分析`
  - read-only visual comparison of existing records
  - chart configuration, inspection, and local UI persistence only
- shared cross-filter UX for analysis source-record narrowing
- `导出`
  - record-driven workbook and ZIP export
  - still owned by the existing database/export workflow

The record system, managed raw-file naming, and export semantics remain unchanged from the `v1.1.0` baseline unless explicitly documented elsewhere.

## Analysis Module Capabilities

Current analysis-module milestone delivers:

- main entry: `数据分析`
- chart types:
  - `标量图`
  - `结构化图`
- manual chart-title editing with restore-default support
- right-side `详情` panel with record-oriented readable detail
- mouse-wheel zoom
- drag pan
- reset view
- single-chart expand / fullscreen-style overlay
- chart image export
- current-chart data export
- analysis UI config persistence across restart
- per-series:
  - hide / show
  - remove
  - rename
  - restore default name
  - color adjustment
  - restore default color
  - move up / move down
- compact chart-local legend controls
- cleaner empty / weak-state wording for no-chart, empty-chart, all-hidden, and no-usable-data cases

## Filtering Milestone Capabilities

Current branch state also delivers a unified additive filter system shared by `数据` and `数据分析`:

- chip-based filter UX with:
  - persistent `+`
  - removable chips
  - `清空全部`
- Step 1 field filtering for:
  - `样品编号`
  - `测试时间`
  - `测试项目`
  - `测试人`
  - `仪器`
  - `样品所属人员`
- strict semantic scalar filters for:
  - `实验条件名称`
  - `实验条件值`
  - `结果指标名称`
  - `结果指标值`
- separate `结构化数据块名称` filtering using user-visible block names rather than low-level template type
- same-field multi-value filtering for exact-value chips
- numeric range filtering v1 for scalar condition/metric values
- candidate-value picking from the current filtered result set for exact-value filter building

Current database-side filtering behavior:

- filters the record list
- preserves the existing grouping/sorting view after filtering
- keeps export selection record-driven

Current analysis-side filtering behavior:

- filters source-record candidates only
- does not auto-mutate existing charts after filters change
- keeps filtered candidate workflows aligned with current scalar/structured add-series flows

Current scalar-chart rules:

- X axis uses Step 1 fields only
- Y axis uses numeric scalar result metrics only
- same-chart axis compatibility checks still block silent unit mixing

Current structured-chart rules:

- source is structured blocks only
- block-internal X/Y metadata remains authoritative
- unknown `purposeType` is still allowed but treated cautiously

## Guardrails

Important release guardrails:

- analysis changes chart configuration only
- analysis never edits or deletes source experiment records
- deleting a chart or series never deletes source data
- persistence stores UI/chart config only
- persistence does not store raw-data snapshots, point caches, copied records, or viewport caches
- export semantics remain record/chart-state driven, not analysis-snapshot driven
- `导出当前图数据` now exports only currently visible series
- strict scalar semantics now come from persisted `scalarRole` when present
- legacy null-role records remain readable/filterable through compatibility fallback only

## Current Persistence Scope

Current analysis persistence is intentionally narrow and additive:

- global UI:
  - `sidebarCollapsed`
- analysis UI:
  - `analysisDetailCollapsed`
  - `analysisCharts`

Persisted series-level config currently includes:

- hidden state
- renamed display label
- chosen color
- order

Persisted chart rebuild config currently includes:

- chart type
- semantic title
- optional custom title override
- scalar chart source config:
  - Step 1 X field
  - metric name
  - selected record ids
- structured chart source config:
  - source block display key
  - selected record ids

## Current Semantic-Role State

Scalar item roles now have a persisted foundation:

- `ExperimentDataItem.scalarRole` is nullable and stores:
  - `condition`
  - `metric`
- new saves and re-saves write `scalarRole`
- read paths prefer DB role when present
- legacy null-role rows still use fallback inference for compatibility

This means strict semantic filters are now reliable for newly saved or re-saved records, while old records remain supported without forced bulk backfill.

## Remaining Limitations

- only `标量图` and `结构化图` are supported
- chart viewport, zoom level, pan offset, modal state, hover state, and expanded-overlay state are not persisted
- no drag-sort for series; ordering is button-based only
- rename changes the analysis display label only; chart semantic title generation remains source/axis based
- empty / weak-state polish is renderer-only and intentionally lightweight
- unit handling is still lightweight blocking/warning, not full normalization
- structured semantic alignment is still caution-oriented, not normalization-oriented
- no saved chart templates or cross-project analysis presets yet
- numeric range filtering is still plain-numeric only and does not do unit conversion
- legacy null-role rows can still rely on fallback inference until they are re-saved
- filter candidate picking is lightweight and current-result-set based; it is not a full saved dictionary or facet-count system

## Sensible Next Steps

Reasonable next-step options after this release:

1. Persist viewport / restore current visible range if restart continuity becomes important.
2. Strengthen unit compatibility handling for scalar and structured comparison.
3. Add chart duplication or reusable analysis templates without changing source-data ownership.
4. Add richer detail-to-record navigation and optional chart annotation workflows.
5. Add more structured semantic helpers only if they remain additive and do not require schema redesign.
6. Decide when to retire legacy null-role fallback after enough records have been re-saved or safely migrated.
7. Consider lightweight date-range and unit-aware filtering only after the current exact/range baseline is proven stable.
