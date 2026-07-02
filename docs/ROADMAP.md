# Roadmap

## 1. Current Product Positioning

Scida is a **local-first personal scientific data workspace** for individual research use.

It is intentionally not positioned as:

- a team LIMS
- a cloud ELN
- an Origin replacement
- a broad scientific processing platform

Near-term product work should stay conservative, focused, and workflow-driven.

## 2. Current Completed Core Workflow

The current `v1.6.1` baseline already provides a complete core record workflow:

- Step 1 / Step 2 experiment entry
- one active local draft with save / resume / discard flow
- copy existing record as new draft from database detail
- completeness guidance for missing or incomplete content
- structured-data import helper for one block = one X/Y curve
- compact structured-data review in database detail
- database browsing, filtering, starring, related-record navigation, and saved local views
- direct handoff from database selection into read-only analysis
- record-driven export with stable workbook / ZIP semantics

The next roadmap steps should build on this workflow rather than replace it.

## 3. Product Boundaries

The following product rules stay in force:

- Scida remains local-first
- one structured data block = one X/Y curve
- analysis is read-only
- export semantics must remain stable
- schema changes should be avoided unless clearly justified
- no cloud / team / LIMS expansion for now
- avoid broad UI redesigns unless a narrowly scoped workflow gain clearly requires them

## 4. v1.6.2 Stability Patch Direction

### Purpose

Post-release bug fixes and stability only.

### Scope

- packaging / install / startup issues
- export regression fixes
- structured-data save/read regression fixes
- database detail display fixes
- analysis naming / restoration fixes
- release documentation corrections

### Do Not Include

- new product features
- schema changes
- new export modes
- multi-Y
- analysis redesign

## 5. v1.6.3 Import Memory and High-Frequency Entry Direction

### Purpose

Reduce repetitive work when importing similar instrument files and entering common structured curves.

### Scope

- import setting memory
- recently used structured block names
- axis name / unit suggestions
- reuse import configuration by test project, block name, or file type
- Step 2 high-frequency entry polish

### Example Behaviors

- `IV-低压` remembers row range, X column, Y column, `Voltage (V)`, `Current (A)`
- `XRD` suggests `2θ (°)` and `Intensity (a.u.)`
- `PL` suggests `Wavelength (nm)` and `Intensity (a.u.)`

### Do Not Include

- multi-Y model
- automatic batch creation of multiple structured blocks
- AI-based complex file parsing
- schema change unless separately justified

## 6. v1.6.4 Analysis Workspace Polish Direction

### Purpose

Improve read-only comparison quality and chart usability without changing source data semantics.

### Scope

- better chart and image export quality
- chart title and axis title polish
- log axis option
- line width and point size options
- legend and inspector polish
- read-only derived display such as normalization or offset view

### Do Not Include

- editable analysis
- source-record mutation from analysis
- processing-pipeline expansion
- analysis redesign into a second database/editor surface

## 7. v1.6.5 Research Memory / Database Workspace Direction

### Purpose

Improve reuse, recall, and navigation of existing records without changing source data.

### Scope

- recently viewed records
- better starred / frequent records entry
- same-sample history
- same-test-project history
- better related-record navigation in database detail
- lighter-weight recall of useful prior record context

### Do Not Include

- cloud sync
- multi-user collaboration
- authored relationship graphs with broad new data model complexity
- team workflow expansion

## 8. Features Explicitly Not Planned Soon

- multi-Y as the default structured-data model
- automatic batch creation of many structured blocks from one import
- AI-based scientific conclusions
- AI-based complex file parsing as a primary workflow
- broad LIMS expansion
- cloud sync
- team collaboration
- comments / approval workflow
- full Origin replacement
- broad export redesign

## 9. Technical Debt and Release-Quality Priorities

These remain important, but should run as a parallel quality track rather than replace user-facing roadmap progress:

- reduce orchestration density in `src/renderer.ts` only where behavior stays unchanged
- continue low-risk extraction from `src/main.ts`
- improve packaging confidence and startup reliability
- strengthen release repeatability and artifact verification
- keep release docs, handoff docs, and shipped workflow behavior aligned
- improve confidence around structured-data save/review and database-to-analysis handoff

## 10. Validation Strategy for Future Versions

Each future `v1.6.x` version should be validated with a narrow, workflow-first approach:

- command checks:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run package`
  - `npm run make` when relevant
- focused manual smoke checks only for the workflow slice changed by that version
- explicit regression checks for:
  - analysis read-only boundary
  - export semantics
  - structured-data save/read integrity
  - database detail and related-record behavior
  - startup / packaging behavior when touched

Release validation should stay honest:

- classify code blockers vs environment / infrastructure blockers correctly
- do not treat release hardening as the headline product theme unless the version is intentionally a patch release
- prefer conservative scope closure over broad unfinished expansion
