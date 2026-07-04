# Scida v1.6.5 Checklist

## Terminology Guardrail

- [x] use `新建记录 / New Record` instead of `Add Data`
- [x] use `记录信息 / Record Info` and `测试数据 / Test Data` instead of `Step 1 / Step 2`
- [x] use `测试模板库 / Test Template Library` instead of generic `Template Library` where page-title clarity matters
- [x] use `溯源要素 / Provenance Elements` instead of `Dictionary Library`
- [x] use `曲线/谱图数据 / Curve/Spectrum Data` instead of `Structured Curve / Structured Data Block` in user-facing UI

## Scope Guardrails

- [x] keep Record Info as the record-level Test Type owner
- [x] keep Test Data conditions / metrics / structured curves parallel and independent
- [x] keep one structured block = one X/Y curve
- [x] keep manual entry fully available
- [x] do not change schema
- [x] do not change export behavior
- [x] do not change analysis behavior
- [x] do not introduce multi-Y
- [x] do not add formula calculation
- [x] do not add calculation recipes
- [x] do not add entry bundles

## Active v1.6.5 Work

- [x] document Test Type consolidation scope
- [x] document Record Info / Test Data Test Type ownership alignment
- [x] remove per-block family dropdown from Test Data curve/spectrum editing
- [x] make structured curve selector Test-Type-scoped
- [x] add user Test Type draft / save foundation
- [x] add Test Type create entry in Test Template Library
- [x] add Test Type edit fields
- [x] add user Test Type cascade delete foundation
- [x] merge enabled Test Types into Record Info suggestions
- [x] hide Provenance Elements `testProject` management in the UI
- [x] bridge legacy dictionary `testProject` entries into Test Template Library Test Types
- [x] switch Test Data recommendation activation to strict exact/alias/id Test Type matching
- [x] add ScalarItemTemplate foundation
- [x] add built-in Test Condition starter templates
- [x] add built-in Result Metric starter templates
- [x] add Step 2 add-from-template for Test Conditions
- [x] add Step 2 add-from-template for Result Metrics
- [x] add user-template deletion in the Test Template Library
- [x] polish Test Template Library card layout, card-click selection, plus-card placement, and status controls
- [x] complete global terminology cleanup for New Record / Record Info / Test Data / Test Type / Curve/Spectrum Data / Provenance Elements

## Still To Verify Manually

- [x] built-in Test Type local override
- [x] reset built-in Test Type to default
- [x] user Test Type create / save / reopen
- [x] user Test Type disable / re-enable
- [x] user Test Type delete with child templates
- [x] Test Data custom-Test-Type condition recommendations
- [x] Test Data custom-Test-Type metric recommendations
- [x] Test Data custom-Test-Type curve template selector
- [x] structured import memory under custom Test Type
- [x] database detail review under custom Test Type
- [x] analysis unchanged
- [x] export unchanged
