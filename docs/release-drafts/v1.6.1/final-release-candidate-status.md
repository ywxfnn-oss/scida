# Scida v1.6.1 Final Release Candidate Status

Last updated: `2026-07-01`

## Current Recommendation

`v1.6.1` is **committed, tagged, pushed, and locally build-validated**, but it is **not yet a full public release-go** because the GitHub Actions macOS path failed before artifact generation. The current remote state is **Windows artifact available, macOS distribution blocked, GitHub Release not yet published**.

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
- macOS CI path is blocked
- GitHub Release entry still does not exist

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

## Still Required Before Release

### Local packaging/distribution follow-up

- package validation is closed for this execution pass
- make/distributable validation is closed for this execution pass
- optional packaged-app startup spot-check is still recommended before public release

### Manual release smoke review

Focused manual checks are still needed for the main `v1.6.1` workflow theme:

- database workspace hierarchy and interaction grouping
- 24-hour test-time input behavior
- structured-data import/review workflow
- Analysis structured-series naming consistency

### Release operations

- review GitHub Actions artifact workflow
- decide whether to:
  - publish a Windows-only / partial release note
  - or block public release until macOS signing secrets are configured
- create/update GitHub Release only after that decision

## Known Current Blockers / Unresolved Items

There is no longer a confirmed local packaging blocker for `v1.6.1`.

Resolved build issue:

- previous `npm run make` failures with `The server aborted pending request`
- current status: resolved locally by supplying cached Electron download checksum data during Forge packaging

Remaining pre-release items:

- focused manual smoke review for the `v1.6.1` workflow themes
- release decision on Windows-only vs full cross-platform release
- GitHub Release publication/update

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
- macOS release-infrastructure / secret-configuration blocker

### Binary trust state not yet confirmed

The final public release text still depends on the actual artifact state at release time:

- signed/notarized
- or unsigned / conservative-use note

Do not finalize the GitHub Release body until that status is known.

## Release-Go Criteria

Treat `v1.6.1` as ready for final release only when all of the following are true:

1. `npm run package` remains recorded as passed.
2. `npm run make` remains recorded as passed.
3. Manual smoke checks for the `v1.6.1` headline workflows are completed.
4. Release-prep commit is created.
5. Annotated tag `v1.6.1` is created and pushed.
6. GitHub Actions artifacts are reviewed.
7. The release strategy is explicitly chosen:
   - Windows-only / partial release
   - or hold release until macOS is unblocked
8. Binary trust wording in the GitHub Release matches reality.

## Suggested Next Action

Use these files in order:

1. `docs/release-drafts/v1.6.1/release-day-commands.md`
2. `docs/release-drafts/v1.6.1/release-day-runbook.md`
3. complete the focused manual smoke review
4. review the GitHub Actions release workflow and artifacts
5. decide whether `v1.6.1` is:
   - Windows-only releasable now
   - or blocked pending macOS release secrets
6. publish/update the GitHub Release accordingly

Then update:

- `docs/release-drafts/v1.6.1/checklist.md`
- this file

with the real packaging and release outcomes.
