# Scida v1.6.3 Final Release Candidate Status

Date: `2026-07-02`

## 1. Release Scope Summary

`v1.6.3 = Template Library & Import Assist`

Completed release scope:

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

## 2. Version Metadata Status

Version metadata is now aligned to `1.6.3` in:

- `package.json`
- `package-lock.json`

Electron app version metadata is driven by `app.getVersion()`, so packaged app version reporting should now resolve to `1.6.3`.

## 3. Validation Results

Commands run:

```bash
npx tsc --noEmit
npm run lint
npm run package
```

Results:

- `npx tsc --noEmit`: passed
- `npm run lint`: passed with known existing renderer warnings only
- `npm run package`: passed

## 4. Manual Smoke Status

Manual smoke is marked passed for:

- Settings Template Library stacked UI
- global search
- structured curve template management
- built-in override save
- duplicate user template
- reset to built-in
- Step 2 curve template selector
- unit preservation after `写入当前块`
- import memory
- `使用上次导入设置`
- database detail
- analysis
- export

## 5. Packaging Result

Packaging completed successfully in the current local environment:

- target platform: `darwin`
- target architecture: `arm64`

Classification:

- packaging result is not blocked
- no code-related packaging failure was observed
- no environment-related packaging failure was observed in this run

## 6. Known Warnings

Existing lint warnings remain in `src/renderer.ts`:

- `setAnalysisChartVisibleRatio`
- `zoomAnalysisChart`
- `panAnalysisChart`
- `getAnalysisViewportCoverage`

These are pre-existing warnings and are not treated as release blockers for `v1.6.3`.

## 7. Known Limitations

Still not implemented in `v1.6.3`:

- `ScalarItemTemplate`
- experimental condition templates
- result metric templates
- save scalar item as template
- calculation recipes
- entry bundle templates
- automatic raw-file-to-record creation

## 8. Explicit Product Boundaries Preserved

- no schema change
- no multi-Y
- no automatic raw-file-to-record creation
- no formula calculation
- no export behavior change
- no analysis behavior change
- manual input remains fully available
- one structured block = one X/Y curve

## 9. Future Work

Recommended follow-up after `v1.6.3`:

- scalar template architecture and UI
- condition/metric template implementation
- save-scalar-as-template workflow
- calculation recipe design
- entry bundle design
- conservative raw-file recognition improvements without changing manual-confirmation boundaries

## 10. Release Readiness Decision

Decision: `release-go candidate`

Reason:

- implementation scope is complete for the intended `v1.6.3` slice
- manual smoke passed for the intended user workflows
- TypeScript validation passed
- lint has only known non-blocking warnings
- local packaging passed successfully

Current blocker status:

- no confirmed release blockers in the current local `darwin arm64` RC verification run
