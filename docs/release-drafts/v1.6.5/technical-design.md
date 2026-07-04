# Scida v1.6.5 Technical Design

## Terminology Note

User-facing surfaces should prefer:

- `新建记录 / New Record`
- `记录信息 / Record Info`
- `测试数据 / Test Data`
- `测试模板库 / Test Template Library`
- `溯源要素 / Provenance Elements`

Internal names such as `testProject`, `ScientificTestTemplate`, and `purposeType` remain unchanged for compatibility.

## 1. Persistence Model

`v1.6.5` continues to use `templateLibrary:v1` AppSetting storage.

No runtime DB schema change is required because the existing template-library state already supports:

- `userTemplates.scientificTemplates`
- `userOverrides`
- `disabledTemplateIds`

The database schema is unchanged. Record Info continues storing the selected Test Type in the existing `testProject` field for compatibility.

## 2. Test Type Entity

```ts
type ScientificTestTemplate = {
  id: string;
  version: number;
  displayName: string;
  aliases: TemplateAlias[];
  enabled: boolean;
  description?: string;
  sourceType: 'builtin' | 'user' | 'userOverride';
  createdAt?: string;
  updatedAt?: string;
};
```

`ScientificTestTemplate` remains the internal type name to avoid a risky broad rename. User-facing UI and documentation should call this entity `测试类型 / Test Type`.

## 3. Renderer-State Direction

The Test Template Library renderer editor must treat Test Types as first-class editable entities alongside:

- structured curve templates
- condition templates
- result metric templates

The editor draft therefore needs to support:

- `templateType = scientific`
- display name
- aliases
- description
- enabled state

Provenance Elements no longer act as the primary manager for record-level test categories. Its legacy `testProject` values remain readable for compatibility only.

## 4. Override Behavior

Built-in Test Types should reuse the existing override path:

- local edit writes an override patch
- reset-to-built-in removes only that Test Type override
- built-in source data remains immutable

## 5. Delete Behavior

Deleting a user Test Type should cascade through user-owned child templates only:

- user curve templates with matching `familyId`
- user condition/result metric templates with matching `familyId`
- user import parsing templates with matching `familyId`

Additionally:

- exact import-memory `curveTemplateId` references to deleted user curves should be cleared
- disabled ids and overrides for deleted user-owned entities should be pruned

## 6. Record Info / Test Data Alignment

### Record Info

- keep `testProject` as stored text
- user-facing label becomes `测试类型 / Test Type`
- suggestions come from recent values plus active Test Template Library Test Types
- manual entry remains available
- exact normalized match against active Test Type `displayName` / `id` / aliases determines downstream recommendation activation
- legacy dictionary `testProject` entries should migrate or bridge into Test Template Library Test Types idempotently

### Test Data

- infer active Test Type from the current `testProject`
- use that Test Type to filter condition templates
- use that Test Type to filter metric templates
- use that Test Type to filter structured curve templates
- do not apply loose substring fallback when deciding recommendation ownership
- remove the per-block family dropdown from structured curve editing

### Record Detail

- keep detail view read-only
- show the record-level Record Info Test Type context as curve/spectrum ownership
- keep internal `purposeType` secondary to the visible Test Type ownership model

## 7. Structured Curve Internal Compatibility

Structured curve blocks still preserve `purposeType` internally for:

- import memory ranking
- legacy compatibility
- analysis/export continuity

User-facing ownership remains the Record Info Test Type, not `purposeType`.
