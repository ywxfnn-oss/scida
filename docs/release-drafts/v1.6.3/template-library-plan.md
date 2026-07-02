# Scida v1.6.3 Template Library Plan

This document now serves as the release-close summary for what `v1.6.3` actually includes.

## Version Theme

- `v1.6.3 = Template Library & Import Assist`
- Chinese name: `模板库与导入辅助`

Companion technical design:

- [template-library-technical-design.md](/Users/yangwenxuan/Desktop/scidata-manager/docs/release-drafts/v1.6.3/template-library-technical-design.md)

## Product Goal

Reduce repetitive Step 2 work while keeping Scida manual-first and local-first.

In practical terms, `v1.6.3` turns structured-curve entry from fully repeated manual setup into a lighter template-assisted workflow:

- choose a curve template when helpful
- autofill safe starter metadata
- import raw data into the existing XY field only after explicit user confirmation
- remember successful import parsing settings
- let the user explicitly reuse those settings later

## Release Scope

Completed `v1.6.3` scope:

1. Template Library foundation
2. Built-in structured curve starter templates
3. Settings Template Library stacked UI
4. Global template search
5. Structured curve template management
6. Local overrides and reset-to-built-in
7. Step 2 curve template selector
8. Template-assisted autofill for block name, `purposeType`, X/Y labels, and units
9. Structured import metadata preservation fix
10. Write-success import memory
11. Explicit `使用上次导入设置 / Use last import settings` action

## Product Rules Preserved

- one structured data block = one X/Y curve
- raw-file import only fills existing `XY 数据`
- user must still click `写入当前块`
- manual entry remains fully available
- database detail remains read-only review
- analysis remains read-only comparison
- export semantics remain stable
- no schema change
- no multi-Y

## Implemented Structure

### 1. Scientific test families

Implemented as the organizing layer for structured curve templates.

Examples:

- `I-V`
- `Dark current / Dark I-V`
- `Responsivity / EQE`
- `XRD`
- `PL / optical characterization`

### 2. Structured curve templates

Implemented in `v1.6.3`.

These provide:

- template display name
- block title default
- `purposeType`
- X/Y labels
- X/Y units
- enable/disable state
- local override behavior

### 3. Import assist

Implemented conservatively in `v1.6.3`.

Rules:

- import memory is recorded only after successful `写入当前块`
- memory restores import controls only
- memory does not auto-write `XY 数据`
- memory does not auto-save the record
- memory does not become a stable template default automatically

## Explicitly Not in v1.6.3

- scalar templates
- experimental condition templates
- result metric templates
- save scalar item as template
- calculation recipes
- entry bundle templates
- automatic raw-file-to-record creation
- multi-Y model
- export redesign
- analysis redesign

## Future Follow-Up After v1.6.3

Near-term follow-up may continue in later `v1.6.x` work:

- scalar template architecture
- condition/metric template management
- save scalar item as reusable template
- calculation recipe design
- entry bundle design
- more conservative raw-file recognition improvements
