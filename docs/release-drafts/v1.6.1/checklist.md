# Release Checklist Copy: Scida v1.6.1

## A. Release Identity

- [x] Target version confirmed: `v1.6.1`
- [x] Headline theme confirmed: workflow polish and consistency pass
- [x] Scope freeze confirmed for the release-prep pass

## B. Version and Docs

- [x] `package.json` version updated to `1.6.1`
- [x] `package-lock.json` version updated to `1.6.1`
- [x] `CHANGELOG.md` updated
- [x] `docs/release-notes/v1.6.1.md` exists
- [x] `README.md` current-release pointers updated
- [x] `PROJECT_STATUS.md` updated to the `v1.6.1` baseline
- [x] `HANDOFF.md` updated to the `v1.6.1` baseline
- [x] `docs/HANDOFF.md` updated to the `v1.6.1` baseline
- [x] About / current-release summary updated in `src/renderer/i18n.ts`

## C. Local Validation

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `npm run package`
- [x] `npm run make`
- [ ] focused manual smoke pass completed for:
  - database workspace hierarchy
  - 24-hour test-time input
  - structured-data import/review
  - analysis naming consistency

## D. Packaging Review

- [x] local packaging result classified correctly
- [x] local make/distributable result classified correctly
- [x] artifact output inspected if packaging succeeds
- [ ] packaged app startup spot-check completed if relevant

## E. Release Commit

- [x] release-prep commit created
- [x] commit message follows the version-specific draft in `commit-message.txt`
- [x] commit scope checked for release metadata consistency

## F. Tag and Push

- [x] annotated tag created: `v1.6.1`
- [x] branch pushed
- [x] tag pushed

## G. GitHub Actions

- [ ] `Build Release Artifacts` started for `v1.6.1`
- [ ] macOS job reviewed
- [ ] Windows job reviewed
- [ ] uploaded artifacts confirmed

## H. macOS Distribution Review

- [ ] signing secrets configured if signed public mac release is intended
- [ ] notarization credentials configured if notarized public mac release is intended
- [ ] CI codesign validation passed
- [ ] CI stapler validation passed
- [ ] CI `spctl` validation passed

## I. GitHub Release

- [ ] GitHub Release created or updated for `v1.6.1`
- [ ] release body copied from `github-release-body.md`
- [ ] binary trust status stated accurately:
  - [ ] signed / notarized
  - [ ] unsigned / conservative-use note

## J. Final Archive Integrity

- [x] package version matches tag
- [ ] changelog entry matches release notes
- [ ] release notes match shipped scope
- [ ] no undocumented headline workflow changes remain
