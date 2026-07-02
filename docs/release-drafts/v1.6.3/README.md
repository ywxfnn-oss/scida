# Scida v1.6.3 Release Draft

`v1.6.3 = Template Library & Import Assist`

This folder now tracks the closed release-draft scope for `v1.6.3`, not only the original planning work.

## Release Scope

`v1.6.3` covers these completed areas:

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

## Verified Status

Manual smoke has passed for:

- Settings Template Library stacked layout
- global search
- family selector
- template kind tabs
- structured curve template list
- full-width detail editor
- built-in override save
- duplicate user template
- reset to built-in
- enable/disable behavior
- Step 2 curve template selector
- `IV-低压` autofill
- metadata/unit preservation after `写入当前块`
- write-success import memory
- explicit reuse of last import settings
- manual custom structured block path
- database detail
- analysis
- export

## Product Rules Preserved

- no schema change
- no multi-Y
- no automatic raw-file-to-record creation
- no formula calculation
- no scalar template implementation yet
- no calculation recipe implementation yet
- no entry bundle implementation yet
- no export behavior change
- no analysis behavior change
- manual input remains fully available
- one structured block = one X/Y curve

## Included Files

- `template-library-plan.md`
  - release-scope summary and near-term backlog split
- `template-library-technical-design.md`
  - technical foundation, implemented boundaries, and future non-v1.6.3 directions
- `import-memory-plan.md`
  - focused import-memory subsystem notes retained for reference
- `checklist.md`
  - completed items vs future items for release closeout
