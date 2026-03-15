# AI_GUIDE.md

AI Working Guide for Scidata Manager

## Purpose

This document helps AI agents safely analyze and modify this repository.

Read these files first before making any code changes:

1. `CODEX.md`
2. `PROJECT_STRUCTURE.md`
3. `ARCHITECTURE.md`
4. `docs/MODULE_GUIDE.md`
5. `docs/DATABASE.md`
6. `docs/EXPORT_FLOW.md`

---

## Primary Goals

When working on this project, prioritize:

- Stability
- Minimal modifications
- Data safety
- Cross-platform compatibility
- Clear separation between renderer and main process

---

## Rules for AI Agents

1. Do not introduce new dependencies unless explicitly approved
2. Do not refactor unrelated code
3. Do not move files unless necessary
4. Do not change build or packaging configuration unless required
5. Do not break Prisma schema compatibility
6. Do not access filesystem or database from renderer directly
7. Keep Electron security boundaries intact

---

## Safe Change Workflow

Before modifying code:

1. Identify the target feature or bug
2. Identify involved files
3. Explain the planned change
4. Make the smallest possible code change
5. Explain how to verify the change

---

## Typical File Roles

- `src/main.ts` → Electron main process
- `src/preload.ts` → secure API bridge
- `src/renderer.ts` → renderer/UI logic
- `src/storage/` → persistence/data helpers
- `prisma/schema.prisma` → database schema
- `prisma/migrations/` → schema migration history
- `forge.config.ts` → Electron Forge packaging
- `vite.*.config.ts` → build configuration

---

## Typical Dangerous Changes

Avoid changing these casually:

- IPC channel names
- preload API signatures
- Prisma schema field names
- packaging configuration
- file export paths
- database initialization logic

---

## Expected Response Style for AI

When suggesting code changes, AI should:

- name the files to change
- explain why each file is involved
- prefer minimal diffs
- mention possible side effects
- include a verification method