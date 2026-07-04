# Scida v1.6.4 Planning Checklist

## Scope Guardrails

- [ ] keep manual input primary and always available
- [ ] keep templates assistive, not locking
- [ ] keep Step 2 as three parallel independent sections: conditions, metrics, structured curves
- [ ] keep one Step 2 section from owning, overwriting, or requiring another section
- [ ] keep scalar templates under family + section hierarchy
- [ ] keep scientific family as Level 1 classification
- [ ] keep scalar templates as the canonical source for conditions and metrics
- [ ] keep curve recommendedConditions/recommendedMetrics as legacy transitional compatibility fields only
- [ ] keep one structured block = one X/Y curve
- [ ] do not change schema
- [ ] do not change export behavior
- [ ] do not change analysis behavior
- [ ] do not introduce multi-Y
- [ ] do not add cloud/team workflows

## Planned v1.6.4 Scope

- [x] `ScalarItemTemplate` data contract defined
- [x] condition scalar template layer planned
- [x] result metric scalar template layer planned
- [x] canonical scalar ownership model documented
- [x] built-in starter scalar templates planned for major families
- [x] Settings `Conditions` tab implemented
- [x] Settings `Result Metrics` tab implemented
- [x] Step 2 add experimental condition from template implemented
- [x] Step 2 add result metric from template implemented
- [x] Settings user-template delete support implemented
- [x] manual editing preserved in all flows

## Explicit Future, Not v1.6.4

- [ ] formula calculation
- [ ] automatic result metrics from curve data
- [ ] calculation recipe templates
- [ ] entry bundle templates
- [ ] automatic raw-file-to-record creation
- [ ] Step 2 save manual scalar item as template
- [ ] custom scientific family creation
- [ ] schema changes
- [ ] export behavior changes
- [ ] analysis behavior changes

## Data / Persistence Planning

- [x] reuse `templateLibrary:v1` AppSetting storage direction evaluated
- [x] internal template-library state versioning strategy proposed
- [x] scalar template source types aligned with builtin / user / userOverride
- [x] override and reset-to-built-in strategy aligned with `v1.6.3`
- [x] legacy curve suggestion fields retained for backward compatibility only
- [x] no database schema dependency introduced

## Validation Planning

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] manual smoke for Settings scalar template management
- [x] manual smoke for Step 2 add condition from template
- [x] manual smoke for Step 2 add metric from template
- [ ] manual smoke for Settings user-template delete support
- [ ] manual smoke for deferred Step 2 save manual scalar as template
- [ ] regression smoke for structured curve template flow
- [ ] regression smoke for structured import memory
- [ ] regression smoke for database detail
- [ ] regression smoke for analysis
- [ ] regression smoke for export
