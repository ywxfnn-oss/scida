# Scida v1.6.3 Template Library Technical Design

Status:

- started as a planning/design artifact
- now retained as the technical reference for the shipped `v1.6.3` Template Library + Import Assist slice
- scalar templates, calculation recipes, and entry bundles remain future design only

## 1. Goal and Boundaries

This document updates the `v1.6.3` Template Library design to match Scida's real long-term data-entry workflow:

1. enter experimental conditions
2. enter result metrics if already known
3. import or enter raw structured curve data
4. later compute result metrics from raw curves using editable formulas and selectable data ranges

Implemented release scope in `v1.6.3`:

- Template Library persistence foundation
- built-in structured curve starter templates
- Settings Template Library stacked UI
- global template search
- structured curve template management
- local override save behavior
- reset to built-in
- Step 2 curve template selector
- template-assisted autofill for block name, `purposeType`, X/Y labels, and units
- structured import metadata preservation after `写入当前块`
- write-success import memory
- explicit `使用上次导入设置 / Use last import settings`

Not in this task:

- no app code change
- no formula calculation implementation
- no Step 2 automation implementation
- no schema change
- no export behavior change
- no analysis behavior change
- no multi-Y support
- no scalar template implementation yet
- no calculation recipe implementation yet
- no entry bundle implementation yet

Product rules preserved:

- Scida is a local-first personal scientific data workspace
- templates assist entry but never lock fields
- manual entry remains fully available
- one structured data block = one X/Y curve
- raw-file import fills `XY 数据` only after user clicks `写入当前块`
- database detail remains read-only review
- analysis remains read-only comparison
- export semantics remain stable

## 2. Long-Term Entry Workflow Direction

Scida should gradually move toward a conservative automation pipeline:

`raw file import -> template match -> curve parsing -> user-adjustable formula/range selection -> computed result metrics -> record save`

Important clarification:

- this is long-term direction only
- `v1.6.3` does not implement formula-driven metric calculation
- `v1.6.3` does not create records automatically from raw files
- `v1.6.3` remains a manual-first, user-confirmed workflow

## 3. Template Hierarchy

The long-term template system should use three conceptual levels.

### Level 1: Scientific Test Family

This answers:

- what scientific workflow family is this?

Starter families:

- `I-V`
- `Dark I-V`
- `Responsivity / EQE`
- `Linearity / LDR`
- `Noise`
- `NEP / Detectivity`
- `Speed response`
- `Stability`
- `XRD`
- `PL`

Responsibilities:

- define the scientific family identity
- provide family-level aliases/search terms
- group all template kinds under one workflow umbrella
- support future family-level search, recommendation, and reuse

### Level 2: Template Kind / Step 2 Section

This answers:

- which kind of entry object is being templated?

Template kinds:

- experimental condition scalar templates
- result metric scalar templates
- structured curve templates
- future calculation recipe templates
- future entry bundle templates

Important:

- scalar templates are not top-level scientific families
- scalar templates belong to a family and a Step 2 section
- structured curves remain one block = one X/Y curve

### Level 3: Concrete Template Item

This answers:

- what specific thing should be added or suggested?

Examples under `I-V`:

- structured curve templates:
  - `IV-低压`
  - `IV-高压`
  - `IV-暗态`
  - `IV-光照`
- condition scalar templates:
  - `Bias voltage`
  - `Sweep range`
  - `Sweep direction`
  - `Temperature`
  - `Device area`
- result metric scalar templates:
  - `Dark current`
  - `Photocurrent`
  - `Current density`
  - `On/off ratio`
  - `Hysteresis`

Examples under `XRD`:

- condition scalar templates:
  - `Scan range`
  - `Step size`
  - `X-ray source`
- result metric scalar templates:
  - `Peak position`
  - `FWHM`
  - `Phase assignment`

## 4. Template Type Definitions

The long-term design should explicitly separate multiple template types instead of treating everything as a structured-curve template.

### 4.1 ScientificTestFamilyTemplate

Purpose:

- define a high-level workflow family

Suggested fields:

```ts
export interface ScientificTestFamilyTemplate {
  id: string;
  version: number;
  displayName: string;
  aliases: TemplateAlias[];
  enabled: boolean;
  description?: string;
  sourceType: TemplateSourceType;
  createdAt?: string;
  updatedAt?: string;
}
```

### 4.2 StructuredCurveTemplate

Purpose:

- define one explicit X/Y curve block

Suggested fields:

```ts
export interface AxisDefaults {
  primaryLabel: string;
  primaryUnit: string;
  secondaryLabel: string;
  secondaryUnit: string;
}

export interface StructuredCurveTemplate {
  id: string;
  version: number;
  familyId: string;
  displayName: string;
  aliases: TemplateAlias[];
  purposeType: string;
  blockTitleDefault: string;
  axisDefaults: AxisDefaults;
  enabled: boolean;
  sourceType: TemplateSourceType;
  filenameHints?: string[];
  createdAt?: string;
  updatedAt?: string;
}
```

### 4.3 ScalarItemTemplate

Purpose:

- define a reusable scalar field suggestion for Step 2
- used for either experimental conditions or result metrics

Important:

- scalar templates belong to a scientific family
- scalar templates also belong to a Step 2 section

Suggested fields:

```ts
export type ScalarTemplateSection = "condition" | "metric";

export interface ScalarItemTemplate {
  id: string;
  version: number;
  familyId: string;
  section: ScalarTemplateSection;
  displayName: string;
  aliases: TemplateAlias[];
  unitDefault?: string;
  defaultValue?: string;
  valueType?: "text" | "number" | "enum" | "boolean";
  note?: string;
  enabled: boolean;
  sourceType: TemplateSourceType;
  createdAt?: string;
  updatedAt?: string;
}
```

### 4.4 CalculationRecipeTemplate

Purpose:

- define how future result metrics can be computed from structured curve data

Examples:

- current density from I-V current and device area
- on/off ratio from dark/light current
- responsivity from photocurrent and incident power
- LDR from power-dependent photocurrent
- rise time from time response curve
- FWHM from PL or XRD curve

Suggested fields:

```ts
export interface CalculationRecipeTemplate {
  id: string;
  version: number;
  familyId: string;
  displayName: string;
  aliases: TemplateAlias[];
  sourceCurveTemplateIds: string[];
  targetMetricTemplateId: string;
  formulaExpression: string;
  parameterDefinitions?: Array<{
    key: string;
    label: string;
    defaultValue?: string;
    unit?: string;
  }>;
  rangeSelectionMode?: "manual" | "preset" | "fullCurve";
  note?: string;
  enabled: boolean;
  sourceType: TemplateSourceType;
  createdAt?: string;
  updatedAt?: string;
}
```

Later capabilities may include:

- editable formula
- selectable data range
- user-adjustable parameters
- source curve selection
- generated scalar metric target

Do not implement this in `v1.6.3`.

### 4.5 EntryBundleTemplate

Purpose:

- define one recommended set of Step 2 entry items for a repeat workflow

Example:

`I-V low-voltage full entry template`

- conditions:
  - `Bias range`
  - `Sweep direction`
  - `Temperature`
  - `Device area`
- curve:
  - `IV-低压`
- metrics:
  - `Dark current`
  - `Current density`
  - `On/off ratio`
- future calculations:
  - `current density from IV and area`

Suggested fields:

```ts
export interface EntryBundleTemplate {
  id: string;
  version: number;
  familyId: string;
  displayName: string;
  aliases: TemplateAlias[];
  conditionTemplateIds: string[];
  metricTemplateIds: string[];
  curveTemplateIds: string[];
  calculationRecipeIds?: string[];
  note?: string;
  enabled: boolean;
  sourceType: TemplateSourceType;
  createdAt?: string;
  updatedAt?: string;
}
```

Do not implement this in `v1.6.3` unless separately requested later.

## 5. Result Metric Provenance Design

Result metrics must be understood as potentially coming from three sources:

- manually entered
- computed from curve data in the future
- computed first, then manually edited

This provenance is not required for current `v1.6.3` implementation, but it should shape future design.

Suggested future provenance structure:

```ts
export interface ComputedMetricProvenance {
  sourceCurveTemplateId?: string;
  sourceStructuredBlockId?: string;
  formulaRecipeId?: string;
  selectedDataRange?: {
    mode?: string;
    start?: string;
    end?: string;
    note?: string;
  };
  parameters?: Record<string, string>;
  computedAt?: string;
  userEditedAfterCompute?: boolean;
}
```

Design intent:

- preserve trust in where a metric came from
- allow manual override without pretending the value is still purely computed
- support future auditability in a local-first way

## 6. Persistence Strategy

### Recommended Direction

Use `AppSetting` JSON for template-library state.

Why:

- no schema change required
- consistent with current Scida local-first settings patterns
- safe for conservative `v1.6.x` iteration
- suitable for built-in templates plus user overrides

Recommended split:

- built-in starter templates: source-controlled TypeScript/JSON assets
- user-created templates, user overrides, disabled flags, and future memories: persisted in `AppSetting`

Important clarification:

- future calculation recipes and entry bundles may eventually share the same storage family
- they should still remain separate template types in the payload shape

## 7. Library Merge Behavior

Built-in starter library and user modifications must merge without mutating source files.

Required rules:

- built-in templates provide defaults
- user-created templates are appended
- user overrides modify built-in templates at read time
- disabled templates do not appear in future recommendation surfaces
- disabled templates may still be resolvable for historical display
- future built-in updates must not erase user overrides

Recommended merge order:

1. load built-in family templates
2. load built-in scalar/curve templates
3. later load built-in calculation and bundle templates if introduced
4. load user-created templates
5. load user overrides
6. resolve active library view in memory
7. filter disabled items only for recommendation surfaces, not for historical compatibility

## 8. Template Library UI Information Architecture

The long-term Template Library management UI should no longer be planned as a cramped three-column layout.

Preferred direction:

- top global search
- scientific family selector
- template kind tabs:
  - `all`
  - `conditions`
  - `result metrics`
  - `structured curves`
  - `future calculations`
  - `future bundles`
- template list / search results
- full-width selected template detail editor

Why:

- search should span all template kinds, not only structured curves
- scalar templates and future recipe/bundle templates need to coexist cleanly
- a stacked full-width layout scales better than forcing all management into a permanent 3-column grid

### Global Search Expectations

Global search should match:

- family names
- template names
- aliases
- IDs
- `purposeType`
- section labels
- future formula labels
- future bundle labels

Examples:

- searching `XRD` should show:
  - `XRD` family
  - `XRD` curve template
  - `XRD` condition scalar templates
  - `XRD` result metric templates
- searching `IV-低压` should show that specific curve template
- searching `dark current` should show matching metric templates and related curve templates

## 9. Future Step 2 Interaction Direction

Future Step 2 should eventually support:

- adding structured curves from template
- adding experimental conditions from template
- adding result metrics from template
- saving a manually entered scalar item as a template
- later generating computed result metrics from curve data

Rules that must remain:

- manual editing must always remain available
- template application must not auto-write `XY 数据`
- template application must not lock fields
- one structured block still equals one X/Y curve

## 10. v1.6.3 Implementation Boundary

For `v1.6.3`, keep the implementation narrow:

- do not implement formula calculation
- do not implement raw-file automatic record creation
- do not implement full automation
- do not change export behavior
- do not change analysis behavior
- do not change schema
- keep manual input primary
- keep one structured block = one X/Y curve

Current `v1.6.3` should be understood as:

- template library foundation
- curve-template usability improvements
- narrow import-assist improvements
- future architecture preparation

Not as:

- an automated scientific calculation engine
- a raw-file-to-record pipeline
- a full multi-object Step 2 template orchestrator

Manual release verification has passed for:

- Settings Template Library layout and search
- built-in override save
- duplicate user template
- reset to built-in
- enable/disable behavior
- Step 2 curve template selector
- `IV-低压` metadata autofill
- unit preservation after `写入当前块`
- import memory and explicit reuse action
- database detail
- analysis
- export

## 11. Open Questions

1. When scalar templates are later added, should Scida surface them as recommendations only, or allow one-click insertion into Step 2 sections?
2. Should future calculation recipes be family-scoped only, or also optionally curve-template-scoped?
3. Should future entry bundles be manually curated only, or can users save a current Step 2 composition as a reusable bundle?
4. How much provenance should be shown in the UI once computed metrics exist?
5. When global search returns mixed result types, what ranking should dominate: exact template-name match, family relevance, or recent usage?
