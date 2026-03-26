# PROJECT_STRUCTURE.md

> Auto-generated project structure document.  
> Generated at: `2026-03-26T03:09:35.562Z`

## Project Summary

- Project name: `Scidata Manager`
- Package name: `scidata-manager`
- Version: `1.1.0`
- Main entry: `.vite/build/main.js`

## Detected Tech Stack

- Electron
- TypeScript
- Prisma
- ExcelJS
- Archiver
- Vite
- Electron Forge

## Detected Key Paths

- `src/main`
- `src/renderer`
- `src`
- `prisma`
- `prisma/schema.prisma`
- `forge.config.ts`
- `.vite/build/main.js`

## Important Files

- `package.json`
- `forge.config.ts`
- `tsconfig.json`
- `prisma/schema.prisma`
- `README.md`
- `CODEX.md`
## Available npm Scripts

- `prisma:generate`
- `postinstall`
- `start`
- `package`
- `make`
- `publish`
- `lint`
- `docs:structure`

## Directory Tree

```text
scidata-manager/
├── docs/
│   ├── DATABASE.md
│   ├── DEFAULT_TEMPLATES.md
│   ├── EXPORT_FLOW.md
│   ├── HANDOFF.md
│   └── MODULE_GUIDE.md
├── prisma/
│   ├── migrations/
│   │   ├── 20260313161434_init/
│   │   │   └── migration.sql
│   │   ├── 20260314023620_add_experiment_tables/
│   │   │   └── migration.sql
│   │   ├── 20260314035050_add_edit_logs/
│   │   │   └── migration.sql
│   │   ├── 20260314043854_add_app_settings/
│   │   │   └── migration.sql
│   │   ├── 20260322103000_add_operation_logs/
│   │   │   └── migration.sql
│   │   ├── 20260323170000_add_experiment_template_blocks/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── scripts/
│   └── generate-project-structure.mjs
├── skills/
│   └── scidata-manager-safe-changes/
│       ├── agents/
│       │   └── openai.yaml
│       └── SKILL.md
├── src/
│   ├── main/
│   │   ├── auth-settings.ts
│   │   ├── create-scalar-file-helpers.ts
│   │   ├── delete-helpers.ts
│   │   ├── dictionary-settings.ts
│   │   ├── duplicate-check.ts
│   │   ├── edit-log.ts
│   │   ├── export-helpers.ts
│   │   ├── file-helpers.ts
│   │   ├── file-integrity.ts
│   │   ├── import-format-registry.ts
│   │   ├── import-parsers.ts
│   │   ├── import-preview-service.ts
│   │   ├── managed-file-conflicts.ts
│   │   ├── managed-file-naming.ts
│   │   ├── operation-log.ts
│   │   ├── record-file-update-helpers.ts
│   │   ├── runtime-db-helpers.ts
│   │   └── template-block-file-helpers.ts
│   ├── renderer/
│   │   ├── import-review-helpers.ts
│   │   ├── render-helpers.ts
│   │   └── step2-template-registry.ts
│   ├── better-sqlite3.d.ts
│   ├── electron-api.ts
│   ├── global.d.ts
│   ├── index.css
│   ├── main.ts
│   ├── preload.ts
│   ├── renderer.ts
│   └── template-blocks.ts
├── storage/
│   └── raw_files/
│       └── 能谱/
│           └── 1/
│               ├── 能谱-1-杨文轩-能谱测试仪-2026-03-14-10-46.pdf
│               ├── 能谱-1-杨文轩-能谱测试仪-2026-03-14-11-29_01.pdf
│               ├── 能谱-1-杨文轩-能谱测试仪-2026-03-14-11-29.pdf
│               ├── 能谱-1-杨文轩-能谱测试仪器-2026-03-14-10-58.pdf
│               └── 能谱-1-杨文轩-能谱测试仪器-2026-03-14-11-19.pdf
├── .env
├── .eslintrc.json
├── .gitignore
├── ARCHITECTURE.md
├── CHANGELOG.md
├── CODEX.md
├── dev.db
├── forge.config.ts
├── forge.env.d.ts
├── index.html
├── LICENSE
├── package-lock.json
├── package.json
├── prisma.config.ts
├── PROJECT_STATUS.md
├── PROJECT_STRUCTURE.md
├── README.md
├── ROADMAP.md
├── tsconfig.json
├── vite.main.config.ts
├── vite.preload.config.ts
└── vite.renderer.config.ts
```

## Notes

- 此文件由脚本自动生成，适合给 AI 或新协作者快速理解项目结构。
- 默认忽略了 `node_modules`、`.git`、`.vite`、`dist`、`out` 等构建或缓存目录。
- 如需查看更多层级，可修改脚本中的 `MAX_DEPTH`。
- 如需排除更多目录，可修改 `IGNORE_DIRS`。

## Recommended Maintenance

每次目录结构有明显变化后，重新执行：

```bash
npm run docs:structure
```
