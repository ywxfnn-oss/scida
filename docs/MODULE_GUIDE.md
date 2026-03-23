# MODULE_GUIDE.md

Module Guide for Scidata Manager

## Main User Flows

The product now has two core data-entry layers:

- Step 1: dictionary-driven first-level metadata
- Step 2: unified secondary-item entry

## Step 1: Dictionary-Driven Entry

Primary files:

- `src/renderer.ts`
- `src/preload.ts`
- `src/main.ts`
- `src/main/dictionary-settings.ts`

Step 1 currently standardizes three fields:

- `testProject`
- `tester`
- `instrument`

Behavior:

- fields support typing
- active dictionary suggestions appear while typing
- `+` explicitly adds the current input into the matching dictionary
- `下一步` validates that non-empty values exist in the dictionary
- values are never auto-added silently

Dictionary management lives inside Settings and is intentionally separate from experiment records.

## Step 2: Secondary-Item Entry

Primary files:

- `src/renderer.ts`
- `src/template-blocks.ts`
- `src/main.ts`

Step 2 now supports one unified product concept:

- `二级数据项`

Users define the secondary-item name in two ways:

- scalar row: `itemName`
- structured block: `blockTitle`, shown in the UI as `二级数据项名称`

### Scalar Secondary Items

Storage:

- `ExperimentDataItem`

Use when the result is a single scalar value plus optional unit and optional source file.

### XY Secondary Items

Storage:

- `ExperimentTemplateBlock` with `templateType = "xy"`

Use when the result is an ordered XY dataset.

Current behavior:

- one card per XY block
- user provides `二级数据项名称`
- user enters axis labels/units
- user pastes XY pairs into a textarea
- optional note and optional source file are supported

### Spectrum Secondary Items

Storage:

- `ExperimentTemplateBlock` with `templateType = "spectrum"`

Use when the result is a single-trace spectrum dataset.

Current behavior mirrors XY:

- one card per spectrum block
- user provides `二级数据项名称`
- user enters spectrum-axis and signal labels/units
- user pastes XY-format point pairs
- optional note and optional source file are supported

## Renderer/Main Split

### Renderer

`src/renderer.ts` currently owns:

- view-state orchestration
- Step 1 and Step 2 form state
- export modal interaction
- template block card rendering
- DOM binding and validation feedback

`src/renderer/render-helpers.ts` owns:

- pure render fragments
- modal HTML
- reusable formatted list/detail fragments

### Main process

`src/main.ts` owns:

- IPC registration
- save/detail/update orchestration
- privileged file operations

Focused helpers:

- `src/main/dictionary-settings.ts`
  - dictionary persistence and validation
- `src/main/export-helpers.ts`
  - full export
  - unified secondary-item export
- `src/template-blocks.ts`
  - template-block parsing, normalization, and validation rules

## Export-Oriented Module Boundaries

The current export system is intentionally split into:

- unified name discovery
- scalar writer
- XY writer
- raw/source file packaging
- collision-safe path generation

This matters because scalar and structured items share one user-facing naming layer, but their workbook shapes are different.

## Development Guidance

When extending Step 2:

1. preserve the `二级数据项` abstraction
2. do not merge scalar and structured storage casually
3. keep renderer validation aligned with main-process validation
4. avoid redesigning Step 2 unless the user explicitly asks for it
