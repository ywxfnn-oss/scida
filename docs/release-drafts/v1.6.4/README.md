# Scida v1.6.4 Planning Pack

`v1.6.4 = Scalar Templates & Step 2 Scalar Assist`

This folder starts the focused planning set for `v1.6.4`.

## Product Goal

Implement the scalar-template layer of Scida's Step 2 workflow while preserving the existing manual-first entry model.

The intended real workflow remains:

1. enter experimental conditions
2. enter result metrics if known
3. import or enter raw structured curve data
4. in the future, compute result metrics from curves using formulas and selectable ranges

`v1.6.4` covers only the scalar-template layer. Formula calculation and automatic derived metrics remain future scope.

## In Scope

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

## Out of Scope

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

## Product Boundaries Preserved

- manual input remains primary and always available
- templates assist entry but never lock fields
- scalar templates belong to a scientific family and a Step 2 section
- scalar templates are not top-level scientific families
- scientific family remains Level 1 classification
- template kind / Step 2 section is Level 2
- concrete template item is Level 3
- one structured block still equals one X/Y curve
- no schema change should be introduced for this version

## Future Scope Note

Custom first-level scientific family creation is explicitly deferred.

Suggested future scope:

- `v1.6.5 Custom Scientific Families`
- user-defined first-level families
- family-scoped condition templates
- family-scoped result metric templates
- family-scoped structured curve templates

## Included Files

- `scalar-template-plan.md`
  - product scope, hierarchy, family examples, Settings/Step 2 plan, deferred save-as-template note, risks
- `technical-design.md`
  - proposed TypeScript data model, persistence strategy, resolved-library merge behavior, and renderer/main integration plan
- `checklist.md`
  - scope guardrails, planned items, explicit non-goals, and validation plan
