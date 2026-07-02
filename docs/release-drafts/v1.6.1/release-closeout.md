# Scida v1.6.1 Release Closeout

Use this after the release-prep commit exists and before/after the final push.

Goal:

- confirm the tag points to the intended commit
- confirm the pushed release state matches what is documented
- backfill the draft pack with the real final outcome

## 1. Pre-push final consistency check

Run:

```bash
git rev-parse HEAD
git rev-list -n 1 v1.6.1
git show --stat --summary v1.6.1
git status --short
```

Confirm:

- `HEAD` is the intended release-prep commit
- tag `v1.6.1` resolves to that same intended release-prep commit
- the tag message and changed-file scope look correct
- there is no last-minute accidental staged or unstaged release-scope surprise

## 2. Post-push remote confirmation

After pushing branch and tag, confirm:

- the branch push succeeded
- the tag push succeeded
- GitHub Actions started for tag `v1.6.1`
- the workflow ref is the tag, not the wrong branch head

If available, record:

- workflow run URL
- artifact run URL

## 3. Artifact and trust-state confirmation

When CI artifacts are ready, record:

- macOS artifact reviewed: yes/no
- Windows artifact reviewed: yes/no
- binary trust state:
  - signed/notarized
  - unsigned/conservative-use
- any release-note wording that was adjusted to match the real trust state

## 4. GitHub Release confirmation

After publishing or updating the GitHub Release, record:

- GitHub Release created/updated: yes/no
- release body source used:
  - `github-release-body.md`
  - manually adjusted only for trust-state accuracy

## 5. Backfill required files

Update these files with the real final outcome:

- `docs/release-drafts/v1.6.1/checklist.md`
- `docs/release-drafts/v1.6.1/final-release-candidate-status.md`

The final status should clearly state one of:

- released
- release-go but not yet published
- blocked after validation
- partially released

## 6. Final record

Before closing the release work, make sure the draft pack answers:

- what was validated locally
- what was validated on CI
- what artifact was actually published
- what trust state was actually claimed
- what blocker remained, if any

## Actual v1.6.1 outcome

Final recorded outcome:

- released
- Windows CI artifacts published
- macOS arm64 zip published via manual upload
- macOS signed/notarized CI path remained blocked by missing signing/notarization secrets
- GitHub Release published with unsigned/conservative-use macOS wording
