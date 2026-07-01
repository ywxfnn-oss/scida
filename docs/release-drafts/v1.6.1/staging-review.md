# Scida v1.6.1 Staging Review

Use this file before creating the `v1.6.1` release-prep commit.

Goal:

- stage the intended release scope only
- avoid mixing in temp files, old artifacts, or unrelated local notes

## 1. Start with status review

Run:

```bash
git status --short
```

Then sort the worktree into three buckets:

- expected release files
- needs-human-judgment files
- must-not-stage files

## 2. Expected release files

These files are expected for the current `v1.6.1` release if the local worktree still reflects the completed release scope:

- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `README.md`
- `PROJECT_STATUS.md`
- `HANDOFF.md`
- `ARCHITECTURE.md`
- `docs/HANDOFF.md`
- `docs/DATABASE.md`
- `docs/DEFAULT_TEMPLATES.md`
- `docs/EXPORT_FLOW.md`
- `docs/MODULE_GUIDE.md`
- `docs/RELEASE_PROCESS.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/release-notes/v1.5.0.md`
- `docs/release-notes/v1.6.0.md`
- `docs/release-notes/v1.6.1.md`
- `docs/release-templates/`
- `docs/release-drafts/v1.6.1/`
- `forge.config.ts`
- `src/electron-api.ts`
- `src/index.css`
- `src/main.ts`
- `src/preload.ts`
- `src/renderer.ts`
- `src/renderer/i18n.ts`
- `src/renderer/render-helpers.ts`
- `src/main/dictionary-settings.ts`
- `src/main/import-format-registry.ts`
- `src/main/import-parsers.ts`
- `src/main/import-preview-service.ts`
- `src/main/database-related-records.ts`
- `src/main/database-workspace-settings.ts`
- `src/main/entry-workflow-settings.ts`

## 3. Needs-human-judgment files

Check these carefully before staging:

- any file not listed above
- any newly created doc draft outside `docs/release-drafts/v1.6.1/`
- any local test helper or ad-hoc script
- any new asset whose release purpose is not obvious from diff context

If a file is needed for the actual shipped `v1.6.1` behavior, keep it.
If it is only a local experiment, leave it out.

## 4. Must-not-stage files

Do not stage these by accident:

- `out/`
- packaged zips and `.app` bundles
- screenshots
- `.DS_Store`
- temp clipboard images
- local notes unrelated to shipped release behavior

## 5. Pre-commit check

Before committing:

```bash
git diff --cached --stat
git diff --cached
```

Confirm:

- staged files match the intended `v1.6.1` shipped scope
- no old build artifact is staged
- no screenshot or temp file is staged
- release docs and release metadata match the shipped content

## 6. If unsure

If the staged scope looks wider than expected:

- unstage first
- rebuild the staged set with explicit paths
- do not use `git add .` just to save time
