# Scida v1.6.1 Release-Day Runbook

Use this as the human-facing release sequence for `v1.6.1`.

## Phase 1: Pre-flight

1. Confirm that `v1.6.1` is still the target version.
2. Confirm that no unrelated feature work should be included.
3. Open these files before starting:
   - `docs/release-drafts/v1.6.1/checklist.md`
   - `docs/release-drafts/v1.6.1/staging-review.md`
   - `docs/release-drafts/v1.6.1/release-closeout.md`
   - `docs/release-drafts/v1.6.1/commit-message.txt`
   - `docs/release-drafts/v1.6.1/tag-message.txt`
   - `docs/release-drafts/v1.6.1/github-release-body.md`
4. Confirm the working tree is understood before committing.

## Phase 2: Local validation

1. Run TypeScript check.
2. Run lint.
3. Run local packaging.
4. Run local distributable build if needed.
5. Inspect `out/make` and confirm the intended `v1.6.1` artifact path explicitly.
6. Record whether failures are:
   - code/config failures
   - environment/infrastructure failures

Do not continue as though packaging passed if it did not.
Do not publish by filename guesswork if old zips from earlier versions still exist under `out/make`.

## Phase 3: Release metadata review

Check that the release-facing files are all consistent:

- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `README.md`
- `PROJECT_STATUS.md`
- `HANDOFF.md`
- `docs/HANDOFF.md`
- `docs/release-notes/v1.6.1.md`

Also confirm that:

- `v1.5.0` and `v1.6.0` backfill notes are present
- About summary wording is acceptable for the current release line

## Phase 4: Release commit

1. Stage only the intended release-prep files.
2. Use `staging-review.md` to confirm no build artifact, screenshot, or temp file is included.
3. Check the staged diff.
4. Create the release-prep commit using:
   - `docs/release-drafts/v1.6.1/commit-message.txt`
5. Verify the resulting commit message and changed-file scope.

## Phase 5: Tagging

1. Create annotated tag `v1.6.1`.
2. Use:
   - `docs/release-drafts/v1.6.1/tag-message.txt`
3. Inspect the tag locally before push.
4. Confirm `HEAD` and the tag resolve to the same intended release-prep commit.

## Phase 6: Remote trigger

1. Push the branch.
2. Push the tag.
3. Confirm GitHub Actions started:
   - workflow: `Build Release Artifacts`
   - ref: `v1.6.1`

## Phase 7: Artifact review

When the workflow runs:

1. Check macOS job result.
2. Check Windows job result.
3. Check uploaded artifacts exist.
4. If mac signing/notarization is intended, confirm those validations actually passed.

If mac signing/notarization did not pass, the public release text must not claim that it did.

## Phase 8: GitHub Release

1. Create or edit the GitHub Release for tag `v1.6.1`.
2. Paste the body from:
   - `docs/release-drafts/v1.6.1/github-release-body.md`
3. Adjust only the binary trust statement if needed to match the real artifact state.

## Phase 9: Final release closure

Before declaring the release complete, confirm:

1. package version and tag match
2. changelog and release notes match the shipped scope
3. no undocumented workflow changes slipped into the release
4. checklist is updated with the real validation outcome
5. the artifact selected for upload is the current `v1.6.1` build, not a stale older zip
6. final release status is backfilled with the real outcome, not the pre-release expectation

## Quick references

- generic process: `docs/RELEASE_PROCESS.md`
- generic checklist: `docs/RELEASE_CHECKLIST.md`
- current version draft pack: `docs/release-drafts/v1.6.1/`
