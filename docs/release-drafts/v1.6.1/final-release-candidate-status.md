# Scida v1.6.1 Final Release Candidate Status

Last updated: `2026-07-02`

## Current Recommendation

`v1.6.1` is **released**. The published release uses the successful Windows CI artifacts plus a **manually uploaded unsigned macOS arm64 zip**. The signed/notarized macOS CI route remains blocked by missing signing/notarization secrets, but that no longer blocks this specific release from being publicly available.

Current state:

- version metadata is prepared
- release notes are prepared
- release process docs are prepared
- release-day command/runbook docs are prepared
- TypeScript check passes
- lint passes with existing warnings only
- `package` was executed successfully
- `make` now executes successfully
- local distributable output is available
- release-prep commit is created
- annotated tag `v1.6.1` is created
- branch and tag are pushed to `origin`
- Windows CI artifact is uploaded
- macOS CI signing/notarization path is blocked
- GitHub Release is published
- published release URL: `https://github.com/ywxfnn-oss/scida/releases/tag/v1.6.1`

## What Is Already Complete

### Release metadata

- `package.json` updated to `1.6.1`
- `package-lock.json` updated to `1.6.1`
- `CHANGELOG.md` updated through `v1.6.1`
- `README.md` updated with current release-track info
- `PROJECT_STATUS.md` updated to the `v1.6.1` baseline
- `HANDOFF.md` updated to the `v1.6.1` baseline
- `docs/HANDOFF.md` updated to the `v1.6.1` baseline
- About summary updated in `src/renderer/i18n.ts`

### Release notes

- `docs/release-notes/v1.5.0.md`
- `docs/release-notes/v1.6.0.md`
- `docs/release-notes/v1.6.1.md`

### Release process materials

- generic process: `docs/RELEASE_PROCESS.md`
- generic checklist: `docs/RELEASE_CHECKLIST.md`
- generic templates:
  - `docs/release-templates/release-commit-message.txt`
  - `docs/release-templates/release-tag-message.txt`
  - `docs/release-templates/github-release-body-template.md`
- version-specific draft pack:
  - `docs/release-drafts/v1.6.1/`

## Current Validation Evidence

### Passed

- `npx tsc --noEmit`
- `npm run lint`
- `npm run package`
- `npm run make`

### Lint status detail

Current lint result has **0 errors** and **4 existing warnings** in `src/renderer.ts`:

- `setAnalysisChartVisibleRatio`
- `zoomAnalysisChart`
- `panAnalysisChart`
- `getAnalysisViewportCoverage`

These are existing warnings, not new release-blocking errors introduced by the release-doc work.

### Packaging result detail

`npm run package`

- classification: passed
- outcome: Electron Forge package completed successfully in a network-enabled environment
- local artifact observed at: `out/Scida-darwin-arm64/Scida.app`

`npm run make`

- classification: passed after the minimal build-config fix in `forge.config.ts`
- outcome: Electron Forge make completed successfully
- local artifacts observed at: `out/make`

## Post-Release Follow-Up

### Local packaging/distribution follow-up

- package validation is closed for this execution pass
- make/distributable validation is closed for this execution pass
- optional packaged-app startup spot-check is still recommended for post-release confidence

### Manual release smoke review

Focused manual checks are still recommended for the main `v1.6.1` workflow theme:

- database workspace hierarchy and interaction grouping
- 24-hour test-time input behavior
- structured-data import/review workflow
- Analysis structured-series naming consistency

### Release operations

- post the final release link where needed
- optionally improve the release page if download guidance needs clarification
- decide whether the next release should restore a signed/notarized macOS path

## Final Outcome

`v1.6.1` shipped with these public assets:

- `RELEASES`
- `Scida-1.6.1.Setup.exe`
- `scidata_manager-1.6.1-full.nupkg`
- `Scida-darwin-arm64-1.6.1.zip`

Release page:

- `https://github.com/ywxfnn-oss/scida/releases/tag/v1.6.1`

macOS trust state:

- unsigned / not notarized
- conservative-use note included in the published release text

## Known Current Blockers / Unresolved Items

There is no longer a confirmed local packaging blocker for `v1.6.1`.

Resolved build issue:

- previous `npm run make` failures with `The server aborted pending request`
- current status: resolved locally by supplying cached Electron download checksum data during Forge packaging

Remaining follow-up items:

- focused manual smoke review for the `v1.6.1` workflow themes
- future release improvement: restore signed/notarized macOS CI path

### Remote CI blocker

Observed final GitHub Actions state for tag `v1.6.1`:

- workflow: `Build Release Artifacts`
- run: `28520961130`
- URL: `https://github.com/ywxfnn-oss/scida/actions/runs/28520961130`
- Windows job: passed
- uploaded artifact confirmed:
  - `scida-Windows-v1.6.1`
- macOS job: failed
- failure stage:
  - `Validate mac signing secrets`

Current classification:

- not a product-code blocker
- not a local packaging blocker
- macOS signed/notarized distribution infrastructure blocker for CI

### Binary trust state

Confirmed published trust state:

- Windows: published from CI artifacts
- macOS: unsigned / not notarized local zip with conservative-use note

## Suggested Next Action

Use `v1.6.1` as the baseline public release, and treat the next release-process improvement item as:

1. configure macOS signing/notarization secrets on GitHub
2. restore signed/notarized macOS CI artifacts
3. complete the deferred manual smoke review checklist for archival confidence
