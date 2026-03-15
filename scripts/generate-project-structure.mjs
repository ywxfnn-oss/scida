import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'PROJECT_STRUCTURE.md');

const MAX_DEPTH = 4;

// 这些目录/文件默认忽略
const IGNORE_DIRS = new Set([
    '.git',
    'node_modules',
    '.vite',
    'dist',
    'out',
    'release',
    'coverage',
    '.DS_Store',
    '.idea',
    '.vscode',
    'tmp',
    'temp',
    'logs'
]);

const IGNORE_FILES = new Set([
    '.DS_Store'
]);

// 优先显示的重要文件
const IMPORTANT_FILES = [
    'package.json',
    'forge.config.ts',
    'vite.config.ts',
    'tsconfig.json',
    'prisma/schema.prisma',
    'README.md',
    'CODEX.md'
];

function safeStat(targetPath) {
    try {
        return fs.statSync(targetPath);
    } catch {
        return null;
    }
}

function shouldIgnore(name) {
    return IGNORE_DIRS.has(name) || IGNORE_FILES.has(name);
}

function listTree(dir, prefix = '', depth = 0) {
    if (depth > MAX_DEPTH) return [];

    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }

    entries = entries
        .filter((entry) => !shouldIgnore(entry.name))
        .sort((a, b) => {
            // 目录优先，再按名字排序
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

    const lines = [];

    entries.forEach((entry, index) => {
        const isLast = index === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            lines.push(`${prefix}${connector}${entry.name}/`);
            if (depth < MAX_DEPTH) {
                lines.push(...listTree(fullPath, nextPrefix, depth + 1));
            }
        } else {
            lines.push(`${prefix}${connector}${entry.name}`);
        }
    });

    return lines;
}

function detectProjectInfo() {
    const info = {
        packageName: null,
        productName: null,
        version: null,
        mainEntry: null,
        scripts: [],
        detectedTech: []
    };

    const packageJsonPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            info.packageName = pkg.name || null;
            info.productName = pkg.productName || null;
            info.version = pkg.version || null;
            info.mainEntry = pkg.main || null;
            info.scripts = pkg.scripts ? Object.keys(pkg.scripts) : [];

            const deps = {
                ...pkg.dependencies,
                ...pkg.devDependencies
            };

            if (deps.electron) info.detectedTech.push('Electron');
            if (deps.typescript) info.detectedTech.push('TypeScript');
            if (deps['@prisma/client'] || deps.prisma) info.detectedTech.push('Prisma');
            if (deps.exceljs) info.detectedTech.push('ExcelJS');
            if (deps.archiver) info.detectedTech.push('Archiver');
            if (deps.vite) info.detectedTech.push('Vite');
            if (deps['electron-forge'] || deps['@electron-forge/cli']) {
                info.detectedTech.push('Electron Forge');
            }
            if (deps.react) info.detectedTech.push('React');
            if (deps.vue) info.detectedTech.push('Vue');
        } catch {
            // ignore
        }
    }

    return info;
}

function findExistingPaths() {
    const candidates = [
        'src/main',
        'src/renderer',
        'src/preload',
        'src',
        'prisma',
        'prisma/schema.prisma',
        'forge.config.ts',
        'vite.config.ts',
        '.vite/build/main.js'
    ];

    return candidates.filter((relativePath) =>
        fs.existsSync(path.join(rootDir, relativePath))
    );
}

function buildImportantFilesSection() {
    const existing = IMPORTANT_FILES.filter((relativePath) =>
        fs.existsSync(path.join(rootDir, relativePath))
    );

    if (existing.length === 0) {
        return '- 暂未检测到预设的重要文件\n';
    }

    return existing.map((file) => `- \`${file}\``).join('\n') + '\n';
}

function buildDetectedPathsSection(paths) {
    if (paths.length === 0) {
        return '- 暂未检测到常见目录结构\n';
    }

    return paths.map((p) => `- \`${p}\``).join('\n') + '\n';
}

function buildMarkdown() {
    const info = detectProjectInfo();
    const treeLines = listTree(rootDir);
    const detectedPaths = findExistingPaths();
    const generatedAt = new Date().toISOString();

    const projectTitle =
        info.productName || info.packageName || path.basename(rootDir);

    return `# PROJECT_STRUCTURE.md

> Auto-generated project structure document.  
> Generated at: \`${generatedAt}\`

## Project Summary

- Project name: \`${projectTitle}\`
- Package name: \`${info.packageName || 'unknown'}\`
- Version: \`${info.version || 'unknown'}\`
- Main entry: \`${info.mainEntry || 'unknown'}\`

## Detected Tech Stack

${info.detectedTech.length
            ? info.detectedTech.map((item) => `- ${item}`).join('\n')
            : '- 暂未自动识别到常见技术栈'
        }

## Detected Key Paths

${buildDetectedPathsSection(detectedPaths)}
## Important Files

${buildImportantFilesSection()}## Available npm Scripts

${info.scripts.length
            ? info.scripts.map((script) => `- \`${script}\``).join('\n')
            : '- 未检测到 scripts'
        }

## Directory Tree

\`\`\`text
${path.basename(rootDir)}/
${treeLines.join('\n')}
\`\`\`

## Notes

- 此文件由脚本自动生成，适合给 AI 或新协作者快速理解项目结构。
- 默认忽略了 \`node_modules\`、\`.git\`、\`.vite\`、\`dist\`、\`out\` 等构建或缓存目录。
- 如需查看更多层级，可修改脚本中的 \`MAX_DEPTH\`。
- 如需排除更多目录，可修改 \`IGNORE_DIRS\`。

## Recommended Maintenance

每次目录结构有明显变化后，重新执行：

\`\`\`bash
npm run docs:structure
\`\`\`
`;
}

function main() {
    const markdown = buildMarkdown();
    fs.writeFileSync(outputFile, markdown, 'utf8');
    console.log(`Generated: ${outputFile}`);
}

main();