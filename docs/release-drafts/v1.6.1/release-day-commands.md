# Scida v1.6.1 Release-Day Commands

Use this command sequence when actually preparing and shipping the `v1.6.1` release.

## Assumptions

- current branch is the intended release branch
- release docs for `v1.6.1` are already prepared
- no unrelated feature changes should be added during release prep

## 1. Inspect current state

```bash
git status --short
git branch --show-current
git log --oneline -5
```

## 2. Run release validation

```bash
npx tsc --noEmit
npm run lint
npm run package
npm run make
find out/make -type f | sort
```

If `npm run package` or `npm run make` fails:

- classify the failure as code/config vs environment/infrastructure
- record that outcome in `docs/release-drafts/v1.6.1/checklist.md`
- do not pretend packaging passed if it did not

After `npm run make` passes:

- inspect `out/make` and confirm the intended current-version artifact exists
- do not assume the newest visible zip is correct if older release zips are still present in the same directory
- explicitly select the `v1.6.1` artifact path when preparing upload/release notes

## 3. Review release-facing files

```bash
git diff -- package.json package-lock.json CHANGELOG.md README.md PROJECT_STATUS.md HANDOFF.md docs/HANDOFF.md docs/DATABASE.md docs/RELEASE_PROCESS.md docs/RELEASE_CHECKLIST.md docs/release-notes/v1.5.0.md docs/release-notes/v1.6.0.md docs/release-notes/v1.6.1.md docs/release-drafts/v1.6.1 src/renderer/i18n.ts
```

## 4. Review staging scope before commit

Primary reference:

- `docs/release-drafts/v1.6.1/staging-review.md`

Recommended commands:

```bash
git status --short
git diff --cached --stat
git diff --cached
```

Confirm before commit:

- no `out/` artifact is staged
- no screenshot or temp file is staged
- staged files match the intended `v1.6.1` shipped scope

## 5. Create the release-prep commit

Suggested message source:

- `docs/release-drafts/v1.6.1/commit-message.txt`

Commands:

```bash
git add package.json package-lock.json CHANGELOG.md README.md PROJECT_STATUS.md HANDOFF.md docs/HANDOFF.md docs/DATABASE.md docs/RELEASE_PROCESS.md docs/RELEASE_CHECKLIST.md docs/release-notes/v1.5.0.md docs/release-notes/v1.6.0.md docs/release-notes/v1.6.1.md docs/release-templates docs/release-drafts/v1.6.1 src/renderer/i18n.ts
git commit -F docs/release-drafts/v1.6.1/commit-message.txt
```

If you need to inspect before commit:

```bash
git diff --cached
```

## 6. Create the annotated tag

Suggested tag message source:

- `docs/release-drafts/v1.6.1/tag-message.txt`

Commands:

```bash
git tag -a v1.6.1 -F docs/release-drafts/v1.6.1/tag-message.txt
git show v1.6.1 --stat
```

## 7. Confirm tag-to-commit alignment before push

Primary reference:

- `docs/release-drafts/v1.6.1/release-closeout.md`

Commands:

```bash
git rev-parse HEAD
git rev-list -n 1 v1.6.1
git show --stat --summary v1.6.1
git status --short
```

Confirm:

- `HEAD` and `v1.6.1` point to the intended release-prep commit
- tag summary looks correct
- no last-minute accidental worktree surprise remains

## 8. Push branch and tag

```bash
git push origin HEAD
git push origin v1.6.1
```

## 9. Watch GitHub Actions

After tag push, monitor:

```bash
open https://github.com/<owner>/<repo>/actions
```

Or navigate manually to:

- repository Actions
- workflow: `Build Release Artifacts`
- ref: `v1.6.1`

## 10. Prepare GitHub Release body

Draft source:

- `docs/release-drafts/v1.6.1/github-release-body.md`

If you want the text in terminal:

```bash
cat docs/release-drafts/v1.6.1/github-release-body.md
```

## 11. Backfill release result

Primary reference:

- `docs/release-drafts/v1.6.1/release-closeout.md`

Update:

- `docs/release-drafts/v1.6.1/checklist.md`
- `docs/release-drafts/v1.6.1/final-release-candidate-status.md`

Record the real final outcome:

- released
- release-go but not yet published
- blocked after validation
- partially released

## 12. Final archive checks

```bash
git rev-parse HEAD
git rev-list -n 1 v1.6.1
find out/make -type f | sort
```

These two hashes should match the intended release commit.

Also confirm:

- the distributable you plan to publish is the `v1.6.1` file, not a leftover older zip in `out/make`
