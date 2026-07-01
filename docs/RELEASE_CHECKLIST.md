# RELEASE_CHECKLIST.md

Use this checklist when preparing a Scida release.

## A. Release Identity

- [ ] Target version confirmed, for example `v1.6.1`
- [ ] Headline release theme confirmed
- [ ] Scope freeze confirmed for the release-prep pass

## B. Version and Docs

- [ ] `package.json` version updated
- [ ] `package-lock.json` version updated
- [ ] `CHANGELOG.md` updated
- [ ] matching `docs/release-notes/vX.Y.Z.md` exists and is complete
- [ ] `README.md` current-release pointers updated if needed
- [ ] `PROJECT_STATUS.md` updated if the release baseline changed
- [ ] `HANDOFF.md` updated if the release baseline changed
- [ ] `docs/HANDOFF.md` updated if the release baseline changed
- [ ] About / current-release summary updated if needed

## C. Local Validation

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm run package`
- [ ] `npm run make`
- [ ] manual smoke pass completed for affected workflows

## D. Packaging Review

- [ ] local packaging result classified correctly:
  - [ ] code/config failure
  - [ ] environment/infrastructure failure
- [ ] artifact output path inspected if packaging succeeded
- [ ] current release artifact selected explicitly if older zip artifacts still exist in `out/make`
- [ ] packaged app startup spot-check completed if relevant

## E. Release Commit

- [ ] staged file scope reviewed before commit
- [ ] no build artifact, screenshot, or temp file staged accidentally
- [ ] release-prep commit created
- [ ] commit message follows the standard template
- [ ] commit contains release metadata and docs only, or any extra changes are intentionally justified

## F. Tag and Push

- [ ] annotated tag created, for example `v1.6.1`
- [ ] tag target verified against the intended release-prep commit
- [ ] branch pushed
- [ ] tag pushed

## G. GitHub Actions

- [ ] `Build Release Artifacts` workflow started for the tag
- [ ] macOS job reviewed
- [ ] Windows job reviewed
- [ ] uploaded artifacts confirmed

## H. macOS Distribution Review

- [ ] signing secrets configured if public signed mac release is intended
- [ ] notarization credentials configured if public notarized mac release is intended
- [ ] CI codesign validation passed
- [ ] CI stapler validation passed
- [ ] CI `spctl` validation passed

## I. GitHub Release

- [ ] GitHub Release created or updated for the tag
- [ ] release body copied from the matching release-notes document
- [ ] binary trust status stated accurately:
  - [ ] signed/notarized
  - [ ] unsigned / conservative-use note

## J. Final Archive Integrity

- [ ] package version matches tag
- [ ] pushed tag resolves to the intended release-prep commit
- [ ] changelog entry matches release notes
- [ ] release notes match shipped scope
- [ ] no undocumented headline workflow changes remain
- [ ] published artifact filename/path checked to avoid shipping a stale older build

## K. Release Closeout

- [ ] version-specific checklist updated with actual release outcomes
- [ ] version-specific final release status updated with the real final state
- [ ] final blocker or release-go result recorded explicitly
