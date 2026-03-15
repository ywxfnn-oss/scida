# PROJECT_STRUCTURE.md

> Auto-generated project structure document.  
> Generated at: `2026-03-15T06:51:19.470Z`

## Project Summary

- Project name: `Scidata Manager`
- Package name: `scidata-manager`
- Version: `1.0.0`
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
│   ├── AI_GUIDE.md
│   ├── DATABASE.md
│   ├── EXPORT_FLOW.md
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
│   │   └── migration_lock.toml
│   └── schema.prisma
├── scripts/
│   └── generate-project-structure.mjs
├── src/
│   ├── better-sqlite3.d.ts
│   ├── electron-api.ts
│   ├── global.d.ts
│   ├── index.css
│   ├── main.ts
│   ├── preload.ts
│   └── renderer.ts
├── storage/
│   └── raw_files/
│       ├── 1/
│       │   └── 1/
│       │       └── 1-1-1-1-2026-03-14-11-27.pdf
│       ├── neng/
│       │   └── 1/
│       │       └── neng-1-1-1-2026-03-14-11-24.pdf
│       ├── xrd/
│       │   └── 20250719/
│       │       └── xrd-20250719-ywx-xrd系统-2026-03-14-13-06.pdf
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
├── CODEX.md
├── dev.db
├── forge.config.ts
├── forge.env.d.ts
├── index.html
├── package-lock.json
├── package.json
├── prisma.config.ts
├── PROJECT_STRUCTURE.md
├── README.md
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
- `storage/raw_files/` 是数据目录，不是 `src/storage/` 代码模块。
- 运行时数据库默认位于 `app.getPath('userData')/scidata.db`，不是仓库根目录下的 `dev.db`。

## Recommended Maintenance

每次目录结构有明显变化后，重新执行：

```bash
npm run docs:structure
```
