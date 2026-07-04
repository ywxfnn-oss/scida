# Scida v1.6.5 Release Draft

`v1.6.5 = Test Type Consolidation + Custom Test Types`

This folder captures the release draft, implementation notes, and closure materials for `v1.6.5`.

## Product Goal

Make first-level Test Types user-manageable so that Scida's Test Template Library and Test Data recommendations can extend beyond the built-in set while preserving the current local-first, manual-first workflow.

## Canonical User-Facing Terminology

- `新建记录 / New Record`
- `记录信息 / Record Info`
- `测试数据 / Test Data`
- `测试类型 / Test Type`
- `测试条件 / Test Conditions`
- `结果指标 / Result Metrics`
- `曲线/谱图数据 / Curve/Spectrum Data`
- `测试条件模板 / Condition Templates`
- `结果指标模板 / Result Metric Templates`
- `曲线/谱图模板 / Curve/Spectrum Templates`
- `测试模板库 / Test Template Library`
- `溯源要素 / Provenance Elements`
- `数据记录 / Records`

Deprecated or internal terminology:

- `Step 1 / Step 2`: internal workflow numbering only
- `Scientific Family / 科学测试族`: internal concept, user-facing name is Test Type
- `Test Project / 测试项目`: legacy wording for Test Type
- `Structured Curve / 结构化曲线`: legacy wording, use Curve/Spectrum Data
- `Structured Data Block / 结构化数据块`: legacy wording, use Curve/Spectrum Item/Data
- `Scalar / 标量`: internal data-model concept
- `purposeType`: internal / advanced curve data type
- `Axis Defaults / 轴默认值`: legacy wording, use Axis Settings

## Active Scope

1. Record Info owns record-level Test Type context through the existing internal `testProject` field
2. Test Data curve/spectrum ownership display aligns to the Record Info Test Type context
3. Settings Test Template Library is the canonical manager for Test Types
4. Settings Test Template Library supports:
   - Test Types
   - Test Condition Templates
   - Result Metric Templates
   - Curve/Spectrum Templates
5. User Test Types can own:
   - condition templates
   - result metric templates
   - curve/spectrum templates
6. Record Info suggestions include enabled Test Types
7. Test Data supports:
   - add Test Conditions from templates
   - add Result Metrics from templates
   - filter Curve/Spectrum Templates by the current Record Info Test Type
8. User template deletion is supported in the Test Template Library
9. Legacy dictionary `testProject` entries bridge into the Test Template Library without schema change
10. Provenance Elements manage tester, instrument, owner, and sample code entries only

## Out of Scope

1. formula calculation
2. calculation recipe templates
3. entry bundle templates
4. Test Data save-as-template
5. schema changes unless separately justified
6. export behavior changes
7. analysis behavior changes
8. multi-Y support

## Product Rules Preserved

- one structured block = one X/Y curve
- analysis remains read-only
- export semantics remain stable
- manual entry remains fully available
- user-facing first-level terminology is `测试类型 / Test Type`
- Provenance Elements no longer manage test types directly
- purposeType remains internal/advanced, not the user-facing ownership concept

## Included Files

- `custom-scientific-family-plan.md`
- `technical-design.md`
- `checklist.md`
- `final-release-candidate-status.md`
