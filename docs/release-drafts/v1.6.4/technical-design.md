# Scida v1.6.4 Technical Design

## 1. Goal

Add the scalar-template layer to Scida's existing Template Library and Step 2 workflow without changing schema, export semantics, analysis semantics, or the existing structured-curve model.

## 2. Preserved Product Rules

- manual input remains primary and always available
- templates assist entry but never lock fields
- Step 2 contains three parallel and independent entry sections:
  - experimental conditions
  - result metrics
  - structured curves / raw data
- one Step 2 section must not own, overwrite, or require another section during entry
- scalar templates belong to a scientific family and a Step 2 section
- scalar templates are not top-level scientific families
- scientific family remains Level 1
- template kind / Step 2 section remains Level 2
- concrete template item remains Level 3
- one structured block = one X/Y curve
- no schema change for this version

## 3. Correct Step 2 Architecture

Scida Step 2 is not a single linear form owned by curve templates. It is a page with three parallel, independent entry sections:

1. Experimental Conditions
2. Result Metrics
3. Structured Curves / Raw Data

These sections can be related conceptually, but they must remain independent during entry:

- conditions do not own metrics
- metrics do not own curves
- curves do not own conditions or metrics
- one section must not overwrite another section's data model

The correct product hierarchy is:

- Level 1: scientific test family
- Level 2: Step 2 section / template kind
  - Experimental Conditions
  - Result Metrics
  - Structured Curves
- Level 3: concrete template item

This architecture is the basis for `v1.6.4`. Scalar templates are therefore modeled canonically as section-scoped items, not as fields hanging off a curve template.

## 4. Proposed Data Contract

### ScalarItemTemplate

```ts
export type ScalarTemplateSection = 'condition' | 'metric';

export interface ScalarItemTemplate {
  id: string;
  version: number;
  familyId: string;
  section: ScalarTemplateSection;
  displayName: string;
  aliases: TemplateAlias[];
  unitDefault?: string;
  defaultValue?: string;
  valueType?: 'number' | 'text' | 'date' | 'boolean' | 'option';
  note?: string;
  enabled: boolean;
  sourceType: 'builtin' | 'user' | 'userOverride';
  createdAt?: string;
  updatedAt?: string;
}
```

### Why this contract is narrow enough

- matches current scalar row structure closely
- matches Step 2's parallel section model directly
- supports both conditions and metrics through `section`
- leaves room for future richer value typing without forcing schema work now
- aligns with current built-in/user/override model from `v1.6.3`

## 5. Canonical Ownership Decision

`ScalarItemTemplate` is the canonical scalar template source in `v1.6.4`.

Canonical ownership rules:

- experimental conditions come from `ScalarItemTemplate(section = 'condition')`
- result metrics come from `ScalarItemTemplate(section = 'metric')`
- both are keyed primarily by `familyId + section`
- `StructuredCurveTemplate` remains focused on curve identity, axis defaults, filename hints, and import parsing defaults

This means `StructuredCurveTemplate` is not the canonical owner of scalar items.

## 6. Legacy Transitional Curve Fields

`v1.6.3` introduced:

- `StructuredCurveTemplate.recommendedConditions`
- `StructuredCurveTemplate.recommendedMetrics`

For `v1.6.4`, these fields should be treated as legacy transitional suggestion fields only.

Rules:

- do not expand them as the primary editable scalar-template surface
- do not treat them as the canonical source of condition/metric templates
- do not delete them yet
- keep them readable so existing built-in templates and persisted local user state remain backward-compatible
- use later extraction/migration work to seed canonical `ScalarItemTemplate` starters where needed

## 7. Persistence Strategy

Recommended direction:

- keep using the existing `templateLibrary:v1` AppSetting storage location
- do not introduce a new database table
- do not introduce Prisma/schema changes
- broaden the template-library state payload to include scalar templates

Recommended internal versioning approach:

- keep the AppSetting key stable: `templateLibrary:v1`
- keep additive state normalization backward-compatible
- only bump the internal normalized state version later if a non-additive shape change becomes necessary

Reasoning:

- stable local-only persistence is already working for curve templates
- avoids migration pressure on the runtime DB
- keeps scalar templates inside the same local-first template system
- allows additive normalization logic in shared helpers

## 8. Template Library State Expansion

Current direction for state shape:

```ts
type TemplateLibraryUserTemplates = {
  scientificTemplates: ScientificTestTemplate[];
  curveTemplates: StructuredCurveTemplate[];
  scalarTemplates: ScalarItemTemplate[];
  importParsingTemplates: ImportParsingTemplate[];
};
```

Likewise, resolved-library state would gain:

- `scalarTemplates`
- `activeScalarTemplates`

No new schema is required because this remains serialized AppSetting state.

## 9. Override Model

Recommended behavior:

- built-in scalar templates can be overridden locally
- user scalar templates can be created, duplicated, disabled, and edited
- built-in scalar templates can be reset to built-in default
- override storage should reuse the existing patch-based override pattern

This should stay aligned with `v1.6.3` behavior so the Template Library remains one coherent system.

## 10. Recommendation / Matching Strategy

Scalar templates should be matched through the same family-first approach already used for curve templates.

Recommended sources:

- current `testProject`
- inferred scientific family
- explicit Template Library family selection in Settings
- optional local search query over:
  - display name
  - aliases
  - id
  - family label
  - section label

This should remain deterministic and local-only.

## 11. Settings UI Plan

Keep the stacked `v1.6.3` Template Library layout.

Extend it by activating:

- `Conditions`
- `Result Metrics`

Each tab should support:

- list of scalar templates for current family + section
- detail editor
- new
- duplicate
- delete user templates
- disable
- local override
- reset to built-in

Suggested editor fields:

- display name
- aliases
- unit default
- default value
- note
- value type
- enabled state

Important boundary:

- this settings surface manages three sibling template kinds under one family
- it must not imply that curve templates own scalar templates

## 12. Step 2 Integration Plan

### Conditions

Add compact `从模板添加 / Add from template`.

Behavior:

- show family-matched condition templates
- insert a scalar condition row
- populate:
  - item name
  - unit
  - optional default value
  - optional note
- keep row fully editable

### Result Metrics

Mirror the same behavior for metric templates.

Important:

- this is a sibling entry path to conditions, not a sub-mode of structured curves
- metric templates must remain independently addable even when no curve block exists

### Manual Entry

Manual row creation remains intact. Template insertion is additive only.

### Structured Curves

Structured-curve entry remains its own parallel section.

Rules preserved:

- one structured block = one X/Y curve
- curve-template selection fills curve metadata only
- raw-file import still only fills the existing XY data field after explicit `写入当前块`
- scalar-template introduction must not let the curve section become the owner of scalar fields

## 13. Deferred Step 2 Save Manual Scalar As Template

`v1.6.4` should not add Step 2 `保存为模板 / Save as template`.

Current product decision:

- template creation, edit, duplicate, delete, disable, and reset live in `Settings → 模板库`
- Step 2 should consume templates, not manage the template library
- save-as-template remains future scope

Deferred future save path:

1. user enters or edits a scalar row manually
2. user selects `保存为模板 / Save as template`
3. user confirms or adjusts:
   - family
   - section
   - display name
4. Scida saves a user `ScalarItemTemplate`
5. template appears later in Settings Template Library

Important:

- this must be explicit, not automatic
- it should not rewrite the current row after save
- it should not require any schema change

## 14. Settings-Side User Template Deletion

User-created templates can be deleted inside `Settings → 模板库`.

Rules:

- delete appears only for `sourceType = user`
- built-in templates are not truly deleted
- built-in templates with local override still use `Reset to built-in`
- deleting a user template removes only that local template
- deleting a user template must not delete saved records, managed raw files, or change export / analysis behavior
- after delete, the resolved library reloads and the UI safely selects a nearby template or clears selection
- deleted user templates must disappear from Settings lists and Step 2 pickers/selectors

## 15. Future Combined Workflow Model

If a future workflow needs to package conditions, metrics, and curves together, that relationship should be modeled by a future `EntryBundleTemplate`, not by overloading `StructuredCurveTemplate`.

Example future bundle:

- family: `I-V`
- condition scalar templates:
  - Bias voltage
  - Sweep range
  - Temperature
- result metric scalar templates:
  - Dark current
  - Current density
- structured curve templates:
  - IV-低压

Not in `v1.6.4`:

- bundle authoring
- bundle application
- bundle persistence beyond planning

## 16. Risks

- scalar-template suggestions can become noisy if built-in starter sets are too broad
- family inference can be ambiguous for generic projects
- conditions vs metrics must stay visually distinct
- Step 2 hierarchy can regress if future work starts hanging scalar ownership back onto curve templates
- future save-as-template can create duplicate clutter if naming rules are too loose
- state-shape expansion inside the existing AppSetting requires careful normalization to avoid breaking `v1.6.3` template data
- renderer complexity may increase if scalar-template UI is not added using the existing Template Library patterns

## 17. Suggested Implementation Phases

### Phase 0

- finalize data contract
- finalize Step 2 parallel-section architecture
- finalize persistence strategy
- finalize built-in starter families and starter scalar lists

### Phase 1

- add scalar-template types and state normalization
- extend resolved Template Library helpers
- keep UI unchanged

### Phase 2

- activate Settings `Conditions` and `Result Metrics` tabs
- support create/edit/duplicate/disable/override/reset

### Phase 3

- add Step 2 `Add from template` for conditions and metrics
- preserve fully manual entry
- keep these entry points independent from structured-curve creation/import

### Phase 4

- add Settings-side user template delete support
- validate end-to-end local persistence and picker visibility after delete

### Future Phase

- consider Step 2 `Save as template` only after the Settings-side library workflow is stable
- defer custom scientific family creation to a later version because it changes family ownership, Step 1 inference, and template matching

## 18. Open Questions

1. Should `valueType` stay only advisory in `v1.6.4`, or should it influence Step 2 input rendering immediately?
2. When save-as-template is eventually added, should it default to inferred family silently, or always show a confirm sheet?
3. Should search results mix curves and scalars in one list, or group them by section for readability?
4. How aggressive should built-in default values and notes be in the first scalar-template release?
5. When custom scientific families are introduced later, should they reuse the same family-level ownership model for conditions, metrics, and curves without special cases?
