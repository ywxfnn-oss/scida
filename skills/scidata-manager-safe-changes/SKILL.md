---
name: scidata-manager-safe-changes
description: Guardrails for making small, safe changes in the local Electron-based Scidata Manager app. Use when modifying or reviewing this repository, especially before touching src/main.ts, src/renderer.ts, Prisma schema or migrations, file storage logic, or export flows, and when Codex should propose a short plan first, verify changes after editing, and avoid auto-commits.
---

# Scidata Manager Safe Changes

## Overview

Use this skill to keep changes narrow and safe in this repository. Read the relevant files first, prefer the smallest necessary edit, and preserve the existing Electron, Prisma, storage, and export boundaries.

## Working Rules

- Read the affected files before proposing code.
- Read `README.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` before proposing changes when they are relevant to the request.
- Prefer the smallest necessary change.
- Avoid unrelated edits, new frameworks, and major architecture changes.
- Keep the Electron split intact across `src/main.ts`, `src/preload.ts`, and `src/renderer.ts`.
- Keep privileged logic in the main process.
- Do not auto-commit.

## Plan First

Explain a brief plan before implementation when any of the following apply:

- The request is ambiguous.
- The change spans multiple modules or workflows.
- The change touches a high-risk area.
- The change looks large enough that approval is appropriate first.

Wait for approval before large changes.

## High-Risk Areas

- `src/main.ts`
- `src/renderer.ts`
- `prisma/schema.prisma`
- `prisma/migrations/`
- File storage logic under `storage/` or any code that moves, names, imports, or deletes stored files
- Export logic, including Excel and ZIP flows

For higher-risk changes in these areas, or for multi-file refactors, recommend using a worktree first.

## Verification

After changes:

- Run the narrowest relevant verification available.
- Prefer verification in this order when the repo supports it: `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`.
- State if a requested or relevant check could not be run.
- Summarize files changed, what was fixed, and potential risks.
