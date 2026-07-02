# Scida v1.6.3 Release Checklist

## Scope Guardrails

- [x] keep one structured data block = one X/Y curve
- [x] keep raw import as a helper that only fills existing `XY 数据`
- [x] keep `写入当前块` as the only write action into `XY 数据`
- [x] keep database detail read-only
- [x] keep analysis read-only
- [x] keep export semantics unchanged
- [x] do not introduce multi-Y
- [x] do not introduce batch multi-block creation
- [x] do not add AI parsing
- [x] do not change schema

## Completed in v1.6.3

- [x] template persistence foundation
- [x] built-in structured curve starter templates
- [x] Settings Template Library stacked UI
- [x] global search
- [x] structured curve template management
- [x] local override save behavior
- [x] reset to built-in
- [x] Step 2 curve template selector
- [x] template-assisted autofill for block name, `purposeType`, X/Y labels, and units
- [x] structured import metadata preservation fix
- [x] write-success import memory
- [x] explicit `使用上次导入设置 / Use last import settings`
- [x] unit-loss bug fix after `写入当前块`
- [x] manual smoke completed for Template Library + Import Assist scope

## Explicitly Future, Not v1.6.3

- [ ] `ScalarItemTemplate`
- [ ] experimental condition templates
- [ ] result metric templates
- [ ] save scalar item as template
- [ ] calculation recipes
- [ ] entry bundle templates
- [ ] raw-file automatic recognition / automatic raw-file-to-record creation

## Validation Closeout

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] manual regression spot-check for database detail
- [x] manual regression spot-check for analysis
- [x] manual regression spot-check for export
