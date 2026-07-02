# Scida v1.6.3 Import Memory Plan

This document is now a **sub-plan** under the broader `v1.6.3 = Template Library & Import Assist` direction.

It should be read together with:

- [template-library-plan.md](/Users/yangwenxuan/Desktop/scidata-manager/docs/release-drafts/v1.6.3/template-library-plan.md)

Its role is narrower:

- define how import parsing memory should work
- define how recent structured block names should work
- define how those memories fit inside the larger template-library system

## 1. Current Implementation Audit

### Step 2 structured import entry point

Current Step 2 structured-data import lives primarily in:

- [src/renderer.ts](/Users/yangwenxuan/Desktop/scidata-manager/src/renderer.ts)
- [src/main/import-preview-service.ts](/Users/yangwenxuan/Desktop/scidata-manager/src/main/import-preview-service.ts)
- [src/main/import-parsers.ts](/Users/yangwenxuan/Desktop/scidata-manager/src/main/import-parsers.ts)
- [src/electron-api.ts](/Users/yangwenxuan/Desktop/scidata-manager/src/electron-api.ts)

Current behavior:

- user selects a source file for one structured block
- import preview and manual mapping state are prepared per block
- preview updates the mapping/table review state
- user must still click `写入当前块`
- only that explicit action writes mapped XY text into the block's existing `dataText` / `XY 数据`

### Current renderer-side block state

Structured block editing currently uses block-level renderer state in `TemplateBlockFormData`.

Relevant fields already present on the block:

- `purposeType`
- `blockTitle`
- `primaryLabel`
- `primaryUnit`
- `secondaryLabel`
- `secondaryUnit`
- `dataText`
- `sourceFileName`
- `sourceFilePath`
- `originalFileName`
- `originalFilePath`
- `importPreviewSelectedName`
- `importPreviewSelectedPath`
- `importPreviewCandidate`
- `importManualReview`

### Current import control state

Current manual import controls are stored in `ImportReviewManualState` on each block.

Confirmed current control fields:

- `textEncoding`
- `delimiter`
- `dataStartRow`
- `dataEndRow`
- `dataStartColumn`
- `dataEndColumn`
- `xSourceMode`
- `xColumnIndex`
- `yColumnIndex`
- `generatedXStart`
- `generatedXStep`
- `ignoreEmptyRows`
- `ignoreNonNumericRows`
- `collapseWhitespace`

The X/Y names and units are not stored in `importManualReview`; they are already the block's normal editable fields:

- `primaryLabel`
- `primaryUnit`
- `secondaryLabel`
- `secondaryUnit`

This separation is useful and should be preserved.

### Current persistence mechanisms

Confirmed persistence patterns already used in the repository:

- `AppSetting`-backed JSON persistence via [src/main/auth-settings.ts](/Users/yangwenxuan/Desktop/scidata-manager/src/main/auth-settings.ts)
- dedicated setting modules built on that pattern:
  - [src/main/entry-workflow-settings.ts](/Users/yangwenxuan/Desktop/scidata-manager/src/main/entry-workflow-settings.ts)
  - [src/main/database-workspace-settings.ts](/Users/yangwenxuan/Desktop/scidata-manager/src/main/database-workspace-settings.ts)
  - [src/main/ui-state-settings.ts](/Users/yangwenxuan/Desktop/scidata-manager/src/main/ui-state-settings.ts)

Observed current persistence usage:

- entry draft state
- recent Step 1 suggestions
- database saved views / frequent filters / starred state
- persisted analysis UI state

Confirmed absence:

- no active `localStorage` persistence for this feature area
- no existing structured-import memory persistence
- no database-schema-backed import profile model

## 2. Import Memory Within the Larger Template System

Recommended responsibility split:

- scientific test templates define what kind of experiment is being recorded
- structured curve templates define which curve/block is being added
- import memory / parsing templates define how a raw file should be read

Important:

- import memory must not become a hidden replacement for scientific templates
- import parsing defaults must remain distinct from scientific reporting expectations
- remembered parsing settings should assist Step 2 input, not silently take control of it

## 3. Recommended Persistence Strategy

### Safest location

Recommended persistence location:

- `AppSetting` JSON storage
- implemented through a small dedicated main-process helper, parallel to `entry-workflow-settings.ts` and `database-workspace-settings.ts`

Recommended reasons:

- no schema change required
- consistent with current local-first product behavior
- already proven in the app for user-local workflow memory
- safer than introducing renderer-only ad hoc persistence
- easier to validate and migrate conservatively than a new database table

### Recommended stored payload categories

Keep the stored memory narrow and explicit:

1. import configuration memories
- encoding
- delimiter
- row range
- selected X/Y column info
- cleaning toggles
- optional generated-X settings when used

2. recent structured block names
- ordered recent list
- capped length

3. optional axis suggestion reinforcement
- block-level last-used labels/units
- but only as suggestions, never forced overwrite

## 4. Import-Memory Key Strategy

### Recommended matching order

Use conservative fallback matching from most specific to least specific:

1. `testProject + blockName + purposeType + fileExtension`
2. `testProject + blockName + purposeType`
3. `blockName + purposeType + fileExtension`
4. `blockName + purposeType`
5. `purposeType + fileExtension`
6. `purposeType`

### Why this order

- `testProject + blockName + purposeType` is the safest “same recurring workflow” signal
- `blockName + purposeType` is still useful across projects
- `fileExtension` should only refine matching, not dominate it
- `purposeType` alone is a last-resort suggestion layer, not a strong automatic profile

### Recommended normalized key parts

Normalize before matching:

- trim whitespace
- lowercase ASCII where applicable
- preserve Chinese labels but normalize repeated spaces
- treat empty values as missing, not as literal key parts

## 5. Fallback and Apply Behavior

Recommended behavior:

- only apply remembered settings to import controls
- never auto-write `XY 数据`
- never auto-save the block
- user still confirms by clicking `写入当前块`

### Matching UI behavior

If an exact or near-exact memory exists:

- show a small `使用上次导入设置` action
- after use, show a small `已应用上次设置` status

Do not:

- auto-apply silently on file select
- auto-rewrite row ranges without user awareness
- auto-overwrite names/units if the user already typed custom values

## 6. Built-In Axis Suggestions

Built-in suggestion presets should be small and explicit:

- `IV` / `Dark I-V`
  - X = `Voltage (V)`
  - Y = `Current (A)`
- `XRD`
  - X = `2θ (°)`
  - Y = `Intensity (a.u.)`
- `PL`
  - X = `Wavelength (nm)`
  - Y = `Intensity (a.u.)`
- `EQE`
  - X = `Wavelength (nm)`
  - Y = `EQE (%)`
- `Responsivity`
  - X = `Wavelength (nm)`
  - Y = `Responsivity (A/W)`
- `Time response`
  - X = `Time (s)`
  - Y = `Current (A)` or `Response (a.u.)`

Recommendation source priority:

1. exact remembered import/template memory
2. selected structured curve template default
3. purposeType preset
4. currently active Step 2 recommendation default

## 7. Minimal UI Proposal

Keep the UI small and local to existing Step 2 cards.

### Proposed additions

- recently used block-name chips near the existing structured recommendation area
- small `使用上次导入设置` action in the import panel when a matching memory exists
- small passive status like `已应用上次设置`
- optional subtle axis suggestion chips if labels/units are still empty
- no large new import memory management surface in Step 2 itself

### Explicit non-goals for UI

- no new full-screen import preset manager inside Step 2
- no large new side panel
- no new multi-mode import workflow
- no extra final-result table

## 8. Implementation Phases

### Phase 1: planning-safe persistence surface

- define `v1.6.3` memory payload shape
- define normalization and matching rules
- add a small main-process settings helper for import memory
- add preload / electron API bridge for:
  - read matching memory
  - record successful memory
  - read recent block names

### Phase 2: renderer integration

- load available memory for the current block context
- expose `使用上次导入设置`
- apply settings to import controls only
- add recent block-name chips
- add purposeType-based axis suggestions
- align with the selected structured curve template if one was applied

### Phase 3: write path and safety

- only save/update memory after user successfully clicks `写入当前块`
- optionally require the candidate result to contain valid points before saving memory
- cap memory list sizes and trim stale entries conservatively

### Phase 4: polish and validation

- status wording
- no-surprise fallback behavior
- regression checks around:
  - structured import
  - saved XY content
  - database detail review
  - analysis naming and export boundaries

This phase plan should now be interpreted as one track inside the larger `template-library-plan.md` phase model.

## 9. Risks and Mitigations

### Risk: wrong remembered row range

Mitigation:

- never auto-write XY data
- only apply to controls
- keep row range visibly editable
- require explicit `写入当前块`

### Risk: different file formats under the same block name

Mitigation:

- include `purposeType` and optionally file extension in key fallback
- avoid treating `blockName` alone as strong enough for silent behavior

### Risk: stale memories become misleading

Mitigation:

- use capped local memory lists
- prefer explicit “use last settings” over silent auto-application
- optionally store `lastUsedAt` and trim oldest / least-used memories

### Risk: confusing auto-application

Mitigation:

- do not auto-write
- do not hide the fact that settings were applied
- show `已应用上次设置`

### Risk: migration / compatibility issues

Mitigation:

- use a new versioned `AppSetting` key
- keep parser tolerant
- fall back to empty memory on parse failure

## 10. Recommended Storage Shape

Recommended key names:

- `importMemory:profilesV1`
- `importMemory:recentStructuredBlockNamesV1`

Recommended profile shape:

- `id`
- `testProject?`
- `blockName`
- `purposeType?`
- `fileExtension?`
- `encoding`
- `delimiter`
- `dataStartRow`
- `dataEndRow?`
- `dataStartColumn?`
- `dataEndColumn?`
- `xSourceMode`
- `xColumnIndex`
- `yColumnIndex`
- `generatedXStart?`
- `generatedXStep?`
- `ignoreEmptyRows`
- `ignoreNonNumericRows`
- `collapseWhitespace`
- `suggestedXLabel?`
- `suggestedXUnit?`
- `suggestedYLabel?`
- `suggestedYUnit?`
- `lastUsedAt`
- `useCount`

## 11. Open Questions

1. Should `blockTitle` memory be capped globally, or also scoped by `purposeType`?
2. Should file extension participate only in ranking, or also in exact-key matching?
3. Should label/unit suggestions auto-fill only when fields are blank, or also when they still equal template defaults?
4. Should successful memory recording happen only after `写入当前块`, or also after user explicitly edits labels/units before writing?
5. For `Time response`, should the built-in default Y label prefer `Current (A)` or a more neutral `Response (a.u.)`?
6. Should import memory update the selected template default immediately, or remain a separate recent-memory layer until explicitly promoted?
