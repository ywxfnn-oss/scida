# RELEASE_PROCESS.md

Standard release process for the current Scida repository.

## Scope

This document covers the practical release flow that currently exists in the repository:

- local release validation
- version and release-note preparation
- packaging checks
- Git tag push
- GitHub Actions artifact build trigger
- post-build release material preparation

It is intentionally aligned with the current repository reality rather than an idealized future release system.

## Current Release Trigger

The repository currently builds release artifacts through:

- `.github/workflows/build-release-artifacts.yml`

That workflow is triggered by:

- manual `workflow_dispatch`
- pushing tags matching `v*`

Current workflow outputs:

- macOS artifacts
- Windows artifacts

Current workflow also runs:

- `npm ci`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run make`

## Standard Release Sequence

### 1. Freeze the release scope

Before preparing a release:

- stop merging unrelated feature work into the release branch/state
- confirm the target version number
- confirm the intended headline release theme
- confirm which release notes file will be published

Recommended versioning pattern:

- `v1.6.1`
- `v1.7.0`
- `v2.0.0`

Package version pattern:

- `1.6.1`
- `1.7.0`
- `2.0.0`

## 2. Update release metadata

Release metadata should be updated together in one release-prep pass:

- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- relevant `docs/release-notes/*.md`
- `README.md` if the current release track or download guidance changed
- `PROJECT_STATUS.md`
- `HANDOFF.md`
- `docs/HANDOFF.md`
- `src/renderer/i18n.ts` if About / current-release summary needs updating

Do not update only the package version and leave the release notes behind.

## 3. Run local validation

Minimum required local release validation:

```bash
npx tsc --noEmit
npm run lint
npm run package
npm run make
```

Recommended additional checks:

```bash
npm run start
```

And a focused manual smoke pass for the workflow slices most affected by the release.

## 4. Interpret packaging results correctly

When local packaging fails, classify the failure before proceeding.

### Treat as a code/config failure

Examples:

- TypeScript errors
- lint errors
- missing runtime asset copy
- broken Prisma resolution
- missing preload or renderer build output
- packaged app startup failure caused by code/config changes

### Treat as an environment/distribution failure

Examples:

- network or service interruption during Electron Forge packaging
- notarization credential failure on CI
- GitHub Actions runner infrastructure interruption
- host-specific socket or aborted-request packaging failure when code validation already passed

Environment failures should still be recorded in the release checklist. They should not be misreported as application-code correctness failures.

## 5. Stage the intended release scope only

Before creating the release-prep commit:

- run `git status --short`
- identify whether the worktree contains unrelated local experiments, screenshots, temp files, or old build outputs
- stage only the files that belong to the release
- inspect the staged scope before committing

Recommended commands:

```bash
git status --short
git add <intended release files>
git diff --cached --stat
git diff --cached
```

If the repository is already carrying a large in-progress worktree:

- prefer an explicit path list instead of `git add .`
- keep a version-specific staging review note in the release draft pack
- confirm that old artifacts under `out/` are not being staged accidentally
- confirm that screenshots, temp files, and local notes are not being staged accidentally

## 6. Prepare the release commit

Recommended release-prep commit scope:

- version bump
- changelog update
- release notes update
- release docs update

Do not mix broad product refactors into the release-prep commit if possible.

Recommended commit style:

- `release: prepare v1.6.1`
- `release: prepare v1.7.0`

See:

- `docs/release-templates/release-commit-message.txt`

## 7. Create the Git tag

After the release-prep commit is ready and validated:

```bash
git tag -a v1.6.1 -m "Scida v1.6.1"
git push origin main
git push origin v1.6.1
```

Notes:

- use annotated tags
- tag name should match the workflow trigger pattern `v*`
- keep tag text simple and version-exact

Before push, confirm tag-to-commit alignment:

```bash
git rev-parse HEAD
git rev-list -n 1 v1.6.1
git show --stat --summary v1.6.1
```

The current release commit and the tag target should match the intended release-prep commit.

See:

- `docs/release-templates/release-tag-message.txt`

## 8. Watch GitHub Actions release builds

After pushing the tag:

1. open GitHub Actions
2. confirm `Build Release Artifacts` started for the tag
3. verify both matrix targets:
   - macOS
   - Windows
4. inspect uploaded artifacts
5. inspect signing/notarization validation on macOS if secrets are configured

## 9. Prepare the GitHub Release entry

Once artifacts are confirmed:

- create or update the GitHub Release for the same tag
- use the matching `docs/release-notes/vX.Y.Z.md` file as the source text
- explicitly state if binaries are unsigned or if signing/notarization is incomplete

See:

- `docs/release-templates/github-release-body-template.md`

If a concrete version draft pack already exists, prefer using it directly:

- `docs/release-drafts/v1.6.1/`
- especially:
  - `docs/release-drafts/v1.6.1/release-day-commands.md`
  - `docs/release-drafts/v1.6.1/release-day-runbook.md`
  - `docs/release-drafts/v1.6.1/staging-review.md`
  - `docs/release-drafts/v1.6.1/release-closeout.md`

## 10. Final release archive check

Before considering the release complete, confirm:

- version number matches:
  - package metadata
  - changelog
  - release notes
  - git tag
- pushed tag points to the intended release-prep commit
- release notes match actual shipped scope
- no undocumented headline workflow changes were included
- README current-release pointers still make sense

## 11. Close the release loop

After tag push and GitHub Release publication:

- update the version-specific checklist with actual outcomes
- update the version-specific final release status with the real release result
- record whether the release is:
  - released
  - partially released
  - blocked after tag
- record the actual binary trust state:
  - signed/notarized
  - unsigned/conservative-use
- keep the release draft pack as the audit trail for what really happened, not what was originally planned

## Current macOS release prerequisites

The current CI workflow expects these macOS public-distribution secrets on tagged builds:

- `SCIDA_APPLE_SIGNING_CERTIFICATE_P12_BASE64`
- `SCIDA_APPLE_SIGNING_CERTIFICATE_PASSWORD`
- `SCIDA_APPLE_TEAM_ID`

Notarization:

- preferred API-key path:
  - `SCIDA_APPLE_NOTARY_API_KEY_P8_BASE64`
  - `SCIDA_APPLE_NOTARY_API_KEY_ID`
  - `SCIDA_APPLE_NOTARY_API_ISSUER`
- fallback Apple ID path:
  - `SCIDA_APPLE_ID`
  - `SCIDA_APPLE_APP_SPECIFIC_PASSWORD`

If these are not configured, tagged macOS public-distribution validation should be treated as incomplete.

## Current release discipline rules

- keep release notes honest and scope-matched
- keep package version, changelog, and tag synchronized
- do not silently ship undocumented workflow changes
- do not claim signing/notarization unless the release actually passed that path
- keep packaging quality as a parallel release-quality track, not a substitute for product clarity

## Current concrete draft packs

- `docs/release-drafts/v1.6.1/`
