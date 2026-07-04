# Scida v1.6.5 Final Release Candidate Status

Date: 2026-07-04

Version: `1.6.5`

Release title: `v1.6.5 - Test Types, Template Assist, and Provenance Elements`

## 1. Release Scope Summary

`v1.6.5` closes the unreleased work after `v1.6.3` and delivers:

1. ScalarItemTemplate foundation
2. Built-in Test Condition and Result Metric starter templates
3. Test Template Library support for:
   - Test Types
   - Condition Templates
   - Result Metric Templates
   - Curve/Spectrum Templates
4. Test Data assist:
   - add Test Conditions from templates
   - add Result Metrics from templates
   - filter Curve/Spectrum Templates by the current Record Info Test Type
5. User template deletion in the Test Template Library
6. Test Template Library UI polish:
   - full-card click selection
   - list-end plus cards
   - cleaner delete behavior
   - clearer enable/disable control
   - simpler Template/Data Name wording
   - clearer Axis Settings
   - `purposeType` kept out of the primary user-facing workflow
7. Custom Test Types:
   - user-created first-level Test Types
   - child templates under custom Test Types
   - Step 1 / Step 2 integration
8. Global terminology cleanup:
   - New Record
   - Record Info
   - Test Data
   - Test Type
   - Test Conditions
   - Result Metrics
   - Curve/Spectrum Data
   - Test Template Library
   - Provenance Elements
9. Provenance Elements module redesign:
   - renamed from old Dictionary/Common Terms wording
   - manages tester, instrument, owner, and sample code entries
   - no longer manages Test Type
   - uses search, category tabs, item chips, and list-end add card

## 2. Compatibility Notes

- No runtime DB schema change was introduced.
- Export behavior remains unchanged.
- Analysis behavior remains unchanged.
- No multi-Y support was introduced.
- No formula calculation, calculation recipes, or entry bundles were introduced.
- Existing records remain compatible because internal storage still uses the current `testProject`, `ScientificTestTemplate`, and `purposeType` compatibility model.

## 3. Deferred Features

The following items remain explicitly deferred and are not part of `v1.6.5`:

1. Test Data save-as-template
2. formula calculation
3. calculation recipes
4. entry bundles
5. multi-Y support

## 4. Manual GUI Smoke Status

User-confirmed iterative GUI smoke covered the latest `v1.6.5` UI and terminology work, including:

- Test Template Library layout and interaction polish
- custom Test Type create / edit / delete flow
- Test Data add-from-template flows for Test Conditions and Result Metrics
- Test Type-scoped Curve/Spectrum Template behavior
- Provenance Elements layout and terminology cleanup
- latest wording adjustments around sample code / sample identifier cleanup

Manual smoke during the implementation cycle also confirmed:

- built-in override / reset behavior
- user template duplication and deletion behavior
- import-assist continuity
- no intentional export or analysis scope expansion

## 5. Validation Commands

Commands run:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run package`

Results:

- TypeScript: passed
- Packaging: passed
- Lint: passed with the known existing warnings below only

Known existing lint warnings in `src/renderer.ts`:

- `setAnalysisChartVisibleRatio`
- `zoomAnalysisChart`
- `panAnalysisChart`
- `getAnalysisViewportCoverage`

## 6. Packaging Result

`npm run package` passed successfully on macOS (`darwin`, `arm64`) during release closure.

This is a product-code green result, not an environment-blocked packaging result.

## 7. Release Readiness Decision

`v1.6.5` is ready for commit and tag preparation.

There is no identified release blocker from:

- schema
- export
- analysis
- packaging
- TypeScript validation

The remaining caution is standard final human pass risk around UI wording/layout consistency, not a code or packaging blocker.

## 8. Remaining Release Risks

1. The release includes broad renderer/i18n/UI surface cleanup, so final human review should still scan for stray legacy wording.
2. The release relies on compatibility-preserving internal naming (`testProject`, `ScientificTestTemplate`, `purposeType`), so future work should continue treating those as compatibility internals, not user-facing product terms.
3. The known renderer lint warnings remain pre-existing technical debt and were not changed as part of this release.
