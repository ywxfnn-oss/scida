# Scida v1.6.4 Scalar Template Plan

## Version Theme

`v1.6.4 = Scalar Templates & Step 2 Scalar Assist`

Companion technical design:

- [technical-design.md](/Users/yangwenxuan/Desktop/scidata-manager/docs/release-drafts/v1.6.4/technical-design.md)

## Product Rationale

After `v1.6.3`, Scida can already assist with structured curve entry and import reuse. The next workflow gap is scalar entry:

- experimental conditions are still repeatedly typed by hand
- result metrics are still repeatedly typed by hand
- family-specific scalar fields are known in advance for many workflows
- users need a reusable scalar-template layer before any future formula or derived-metric system

`v1.6.4` should therefore implement scalar templates only, not computed metrics.

## Workflow Model

Step 2 is not a single curve-owned workflow. It contains three parallel and independent data-entry sections:

1. Experimental Conditions
2. Result Metrics
3. Structured Curves / Raw Data

These sections can be related, but during entry they must remain independent:

- one section must not own another section
- one section must not overwrite another section
- one section must not require another section to exist first

`v1.6.4` improves the scalar sides of this model only: Experimental Conditions and Result Metrics.

## Product Hierarchy

### Level 1: Scientific Test Family

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

### Level 2: Template Kind / Step 2 Section

- Experimental conditions
- Result metrics
- Structured curves
- Future calculations
- Future bundles

### Level 3: Concrete Template Item

Concrete template items live under one family and one section.

Important correction:

- `StructuredCurveTemplate` is not the canonical owner of experimental conditions
- `StructuredCurveTemplate` is not the canonical owner of result metrics
- canonical scalar ownership belongs to `ScalarItemTemplate`

## Starter Examples

### I-V / Experimental Conditions

- Bias voltage
- Sweep range
- Sweep direction
- Sweep step
- Temperature
- Device area
- Illumination state

### I-V / Result Metrics

- Dark current
- Photocurrent
- Current density
- On/off ratio
- Rectification ratio
- Hysteresis

### Responsivity / EQE / Experimental Conditions

- Bias voltage
- Wavelength range
- Incident optical power
- Reference detector
- Illuminated area
- Modulation frequency
- Temperature

### Responsivity / EQE / Result Metrics

- Peak responsivity
- Peak EQE
- Spectral cutoff
- Wavelength of peak response

### XRD / Experimental Conditions

- Scan range
- Step size
- Scan speed
- X-ray source
- Sample state

### XRD / Result Metrics

- Peak position
- FWHM
- Phase assignment
- Crystallinity note

### PL / Experimental Conditions

- Excitation wavelength
- Excitation power
- Integration time
- Temperature
- Sample state

### PL / Result Metrics

- Peak wavelength
- Peak intensity
- FWHM
- Integrated intensity

Phase 2 implementation note:

- built-in conservative starter scalar templates now live in `src/shared/default-template-library.ts`
- they are organized strictly by `familyId + section`
- they do not attach canonical scalar ownership to any `StructuredCurveTemplate`

## v1.6.4 Scope

### In Scope

1. `ScalarItemTemplate` data contract
2. condition scalar templates
3. result metric scalar templates
4. built-in starter scalar templates for major test families
5. Settings Template Library support for `Conditions` tab
6. Settings Template Library support for `Result Metrics` tab
7. Step 2 add experimental condition from template
8. Step 2 add result metric from template
9. Settings Template Library user-template delete support
10. manual editing always remains available

### Explicit Non-Goals

1. formula calculation
2. automatic result metrics from curve data
3. calculation recipe templates
4. entry bundle templates
5. automatic raw-file-to-record creation
6. Step 2 `保存为模板 / Save as template`
7. schema changes
8. export behavior changes
9. analysis behavior changes
10. multi-Y support
11. cloud/team workflows
12. custom scientific family creation

## Canonical Scalar Model

Experimental Conditions:

- `ScalarItemTemplate(section = 'condition')`

Result Metrics:

- `ScalarItemTemplate(section = 'metric')`

Canonical keys:

- `familyId`
- `section`

This means the scalar-template layer is organized around Step 2 sections first, not around individual curve templates.

## Legacy Transitional Curve Suggestions

`v1.6.3` already has:

- `StructuredCurveTemplate.recommendedConditions`
- `StructuredCurveTemplate.recommendedMetrics`

For `v1.6.4`, treat those fields as legacy/transitional suggestion fields only.

Rules:

- do not expand them as the primary scalar editing model
- do not rely on them as the canonical scalar starter source
- keep them for backward compatibility with built-in templates and persisted local state
- move any real scalar starter-library growth into canonical `ScalarItemTemplate` planning

## Settings UI Plan

Keep the `v1.6.3` stacked Template Library layout.

Planned behavior:

- keep top global search
- keep scientific family selector
- keep `Structured Curves` as implemented
- activate `Conditions` tab
- activate `Result Metrics` tab
- keep the same management pattern for scalar templates:
  - list
  - detail editor
  - new
  - duplicate
  - delete user templates
  - disable
  - local override for built-in
  - reset built-in default

The Template Library should stay one system, not become separate pages for each template type.

Important architecture boundary:

- `Conditions`, `Result Metrics`, and `Structured Curves` are sibling template kinds under one scientific family
- Template Library UI must not imply that scalar templates live under a selected curve template

## Step 2 Plan

### Experimental Conditions

Add a compact `从模板添加 / Add from template` entry point.

Behavior:

- show templates matching current `testProject` / inferred family
- add scalar row with template values
- fill:
  - name
  - unit
  - optional default value
  - optional note
- do not lock any field

### Result Metrics

Add the same `从模板添加 / Add from template` entry point.

Behavior is the same as conditions, but scoped to metric templates.

### Structured Curves

Structured curves remain independently managed:

- curve template selection stays focused on curve metadata
- raw import stays focused on writing XY data only after explicit `写入当前块`
- scalar-template work must not turn the curve section into a canonical scalar container

### Manual Entry

Manual scalar entry remains unchanged and always available.

## Deferred Step 2 Save-As-Template

`v1.6.4` defers Step 2 `保存为模板 / Save as template`.

Current product decision:

- template creation, editing, duplication, deletion, enable/disable live in `Settings → 模板库`
- Step 2 uses templates, but does not manage the template library directly
- no new Step 2 template-management action should be added in this version

Deferred future flow:

1. user manually enters a scalar item in Step 2
2. user chooses `保存为模板 / Save as template`
3. Scida creates a user `ScalarItemTemplate`
4. the template is stored under the inferred/current family and section
5. the user can later edit/disable/duplicate/reset it in Settings Template Library

This should be explicit and local-only. It should not auto-promote every scalar row into a template.
It is deferred beyond the current `v1.6.4` scope.

## Future Relationship Model

If a future workflow needs to combine conditions, metrics, and curves into a reusable package, that should be modeled by a future `EntryBundleTemplate`.

Example future bundle:

- `I-V low-voltage full entry bundle`
- condition scalar templates:
  - Bias voltage
  - Sweep range
  - Temperature
- result metric scalar templates:
  - Dark current
  - Current density
- structured curve templates:
  - IV-低压

This relationship model is future-only and not part of `v1.6.4`.

## Future Custom Scientific Families

Custom first-level scientific family creation is future scope, not part of this phase.

It should be handled as a separate version because it affects:

- `familyId` generation and ownership
- Step 1 family inference
- Template Library search and grouping
- Step 2 recommendations and template matching

Suggested future title:

- `v1.6.5 Custom Scientific Families`

## Risks

- too many built-in scalar templates may create noisy suggestions
- family inference from `testProject` may be ambiguous for generic projects
- conditions and metrics need clear separation or users may add values to the wrong section
- future work can regress architecture if it keeps editing scalar suggestions through curve templates
- future save-as-template can create duplicate or low-quality templates if naming rules are too loose
- local override handling must stay aligned with the `v1.6.3` curve-template override model
- expanding Template Library beyond curves can increase renderer complexity if not kept narrow

## Open Questions

1. Should Step 2 `Add from template` open a picker immediately, or first show a small recommended chip row?
2. When save-as-template is eventually introduced, should it require explicit confirmation of family and section, or infer first and allow quick save?
3. How much `valueType` support is truly needed in `v1.6.4` if current scalar rows are still mostly string-based?
4. Should built-in scalar templates include notes/default values aggressively, or start with minimal name + unit defaults only?
5. Should global search surface scalar templates alongside curves by default, or keep scalar results visually grouped by section?
6. When custom scientific families are introduced later, should they inherit the same family-level structure for conditions, metrics, and curves from day one?
