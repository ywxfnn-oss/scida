# EXPORT_FLOW.md

Export Flow Guide for Scidata Manager

## Current Export Modes

The current export modal supports three modes only:

- `完整资料导出`
- `导出单个二级数据项`
- `导出全部二级数据项`

There is no standalone XY compare export mode anymore.

## Core Export Principle

Secondary-item export is now unified around one concept:

- `二级数据项名称`

That unified naming layer includes:

- scalar item names from `ExperimentDataItem.itemName`
- XY item names from `ExperimentTemplateBlock.blockTitle` where `templateType = "xy"`
- spectrum item names from `ExperimentTemplateBlock.blockTitle` where `templateType = "spectrum"`

## Export Entry

The user selects one or more experiments from the database list, opens the export modal, chooses an export mode, and optionally enables ZIP packaging.

Shared behaviors that remain unchanged:

- export root is selected through the same directory picker
- ZIP packaging uses the same post-export compression step
- success feedback still returns the export path

## Full Export

`完整资料导出` remains unchanged.

Output structure:

- one export root folder
- inside it, one folder per experiment
- inside each experiment folder:
  - one detail workbook
  - one `原始文件/<sampleCode>/` directory
  - copied managed/source files referenced by scalar data items

## Secondary-Item Export

### Grouping

Single-item and all-item export both group by the full original secondary-item name.

Examples:

- `iv（-100，100）` and `iv（-1，1）` are treated as different groups
- sanitization happens only after grouping

### Folder Structure

For each secondary-item name:

- create one top-level folder
- copy related raw/source files into sample-code subfolders
- generate one or more Excel workbooks depending on the data type found

Folder layout:

```text
导出根目录/
  二级数据项A/
    二级数据项A.xlsx
    样品A/
      raw-file-1.ext
    样品B/
      raw-file-2.ext

  二级数据项B/
    二级数据项B_标量数据.xlsx
    二级数据项B_XY数据.xlsx
    二级数据项B_光谱数据.xlsx
    样品C/
      raw-file-3.ext
```

### Scalar Workbook Structure

Scalar secondary-item export remains unchanged in shape.

Workbook columns:

- `名称`
- `数值`
- `单位`

Rows:

- one row per matching scalar item across the selected experiments

### XY Workbook Structure

XY export is folded into secondary-item export but keeps its existing writer logic.

Workbook columns:

- per experiment, one `X / Y` column pair

Behavior:

- preserve each experiment’s original XY shape
- no shared X column
- no X alignment requirement
- unequal lengths are padded with blank cells

This is not point-by-point comparison export.

### Spectrum Workbook Structure

Spectrum export follows the same grouped structured-data model as XY.

Workbook columns:

- per experiment, one `X / Y` column pair

Behavior:

- `X` represents the stored spectrum axis
- `Y` represents the stored signal
- each experiment keeps its own original spectrum shape
- unequal lengths are padded with blank cells
- there is no strict alignment requirement

## Same-Name Cross-Type Handling

If scalar, XY, and spectrum data share the same `二级数据项名称`:

- they export into the same top-level folder
- they do not merge into one workbook

File naming rule:

- scalar workbook: `<name>_标量数据.xlsx`
- XY workbook: `<name>_XY数据.xlsx`
- spectrum workbook: `<name>_光谱数据.xlsx`

If only scalar data exists for that name, the scalar workbook keeps the plain item workbook shape.

## Raw/Source File Organization

Secondary-item export copies referenced raw/source files into subfolders by `sampleCode`.

Current rule:

- destination folder = `<secondary-item-folder>/<sampleCode>/`

Applies to:

- scalar item source files
- XY block source files
- spectrum block source files

## Naming Collision Handling

Export-time naming safety is handled only during export. It does not change grouping semantics.

### Folder naming

- base folder name = `sanitize(originalName)`
- if a conflict occurs, append suffixes:
  - `__2`
  - `__3`
  - ...

### Workbook naming

- workbook name follows the resolved folder-safe base name
- if a workbook path still conflicts, append:
  - `__2`
  - `__3`
  - ...

### Column naming

Structured workbook column labels keep the existing experiment-based naming logic first.

If labels still collide after that, a final pass appends:

- `__2`
- `__3`
- ...

### Raw file naming

If a copied raw/source file would overwrite an existing file in the same destination folder:

- keep the original file
- copy the next one with:
  - `__2`
  - `__3`
  - ...

Files are renamed, not silently skipped.

## What Must Stay Stable

- full export behavior
- scalar export workbook shape
- export root selection
- ZIP flow
- secondary-item grouping by full original name

## Current Non-Goals

- no spectrum comparison export
- no plotting
- no interpolation or resampling
- no export-builder redesign
- no database-wide export without explicit selection
