import { app, dialog, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  ExportOrphanFileListResult,
  FileIntegrityReport,
  QuarantineOrphanFilesResult
} from '../electron-api';
import { ensureDir, formatExportTimestamp } from './file-helpers';

const EXAMPLE_LIMIT = 10;
const QUARANTINE_ROOT_NAME = '_scidata_quarantine';
const IGNORED_FILE_NAMES = new Set(['.DS_Store', 'Thumbs.db']);
const IGNORED_DIR_NAMES = new Set([QUARANTINE_ROOT_NAME]);

function isIgnoredFileName(fileName: string) {
  return IGNORED_FILE_NAMES.has(fileName) || fileName.startsWith('._');
}

function isIgnoredDirName(dirName: string) {
  return IGNORED_DIR_NAMES.has(dirName);
}

function isPathInsideRoot(filePath: string, storageRoot: string) {
  const relativePath = path.relative(storageRoot, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function resolveSafeRelativePath(storageRoot: string, filePath: string) {
  const relativePath = path.relative(storageRoot, filePath);

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return '';
  }

  return relativePath;
}

function resolveUniqueTargetPath(targetPath: string) {
  if (!fs.existsSync(targetPath)) {
    return targetPath;
  }

  const parsed = path.parse(targetPath);
  let index = 1;
  let nextPath = path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`);

  while (fs.existsSync(nextPath)) {
    index += 1;
    nextPath = path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`);
  }

  return nextPath;
}

function collectRegularFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (isIgnoredFileName(entry.name)) {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (isIgnoredDirName(entry.name)) {
        continue;
      }

      files.push(...collectRegularFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.resolve(entryPath));
    }
  }

  return files;
}

export async function scanManagedFileIntegrity(
  prisma: PrismaClient,
  storageRoot: string
): Promise<FileIntegrityReport> {
  const resolvedStorageRoot = path.resolve(storageRoot);
  const [referencedItems, referencedBlocks] = await Promise.all([
    prisma.experimentDataItem.findMany({
      where: {
        sourceFilePath: {
          not: null
        }
      },
      select: {
        id: true,
        itemName: true,
        sourceFileName: true,
        originalFileName: true,
        sourceFilePath: true,
        experiment: {
          select: {
            id: true,
            displayName: true,
            sampleCode: true,
            testProject: true,
            testTime: true
          }
        }
      }
    }),
    prisma.experimentTemplateBlock.findMany({
      where: {
        sourceFilePath: {
          not: null
        }
      },
      select: {
        id: true,
        blockTitle: true,
        templateType: true,
        sourceFileName: true,
        originalFileName: true,
        sourceFilePath: true,
        experiment: {
          select: {
            id: true,
            displayName: true,
            sampleCode: true,
            testProject: true,
            testTime: true
          }
        }
      }
    })
  ]);

  const referencedItemsByPath = new Map<
    string,
    FileIntegrityReport['missingReferencedFiles'][number]['affectedRecords']
  >();

  for (const item of referencedItems) {
    const filePath = item.sourceFilePath?.trim() || '';
    if (!filePath) {
      continue;
    }

    const resolvedPath = path.resolve(filePath);
    if (!isPathInsideRoot(resolvedPath, resolvedStorageRoot)) {
      continue;
    }

    const existingRecords = referencedItemsByPath.get(resolvedPath) || [];
    existingRecords.push({
      experimentId: item.experiment.id,
      displayName: item.experiment.displayName,
      sampleCode: item.experiment.sampleCode,
      testProject: item.experiment.testProject,
      testTime: item.experiment.testTime,
      recordType: 'dataItem',
      dataItemId: item.id,
      itemName: item.itemName,
      templateBlockId: null,
      blockTitle: null,
      templateType: null,
      sourceFileName: item.sourceFileName,
      originalFileName: item.originalFileName
    });
    referencedItemsByPath.set(resolvedPath, existingRecords);
  }

  for (const block of referencedBlocks) {
    const filePath = block.sourceFilePath?.trim() || '';
    if (!filePath) {
      continue;
    }

    const resolvedPath = path.resolve(filePath);
    if (!isPathInsideRoot(resolvedPath, resolvedStorageRoot)) {
      continue;
    }

    const existingRecords = referencedItemsByPath.get(resolvedPath) || [];
    existingRecords.push({
      experimentId: block.experiment.id,
      displayName: block.experiment.displayName,
      sampleCode: block.experiment.sampleCode,
      testProject: block.experiment.testProject,
      testTime: block.experiment.testTime,
      recordType: 'templateBlock',
      dataItemId: null,
      itemName: null,
      templateBlockId: block.id,
      blockTitle: block.blockTitle,
      templateType: block.templateType,
      sourceFileName: block.sourceFileName,
      originalFileName: block.originalFileName
    });
    referencedItemsByPath.set(resolvedPath, existingRecords);
  }

  const referencedManagedPaths = Array.from(referencedItemsByPath.keys());
  const referencedPathSet = new Set(referencedManagedPaths);
  const missingPaths = referencedManagedPaths.filter((filePath) => !fs.existsSync(filePath));
  const missingReferencedFiles = missingPaths.map((filePath) => ({
    filePath,
    affectedRecords: referencedItemsByPath.get(filePath) || []
  }));
  const storageRootExists =
    fs.existsSync(resolvedStorageRoot) && fs.statSync(resolvedStorageRoot).isDirectory();
  const scannedFiles = storageRootExists
    ? collectRegularFiles(resolvedStorageRoot)
    : [];
  const orphanPaths = scannedFiles.filter((filePath) => !referencedPathSet.has(filePath));
  const orphanFiles = orphanPaths.map((filePath) => ({
    filePath,
    relativePath: resolveSafeRelativePath(resolvedStorageRoot, filePath) || path.basename(filePath)
  }));

  return {
    storageRoot: resolvedStorageRoot,
    storageRootExists,
    referencedManagedFileCount: referencedManagedPaths.length,
    missingReferencedFileCount: missingPaths.length,
    scannedManagedFileCount: scannedFiles.length,
    orphanManagedFileCount: orphanPaths.length,
    missingExamples: missingPaths.slice(0, EXAMPLE_LIMIT),
    orphanExamples: orphanPaths.slice(0, EXAMPLE_LIMIT),
    missingReferencedFiles,
    orphanFiles
  };
}

export async function exportOrphanFileList(
  storageRoot: string,
  orphanPaths: string[]
): Promise<ExportOrphanFileListResult> {
  const resolvedStorageRoot = path.resolve(storageRoot);
  const normalizedPaths = Array.from(
    new Set(
      orphanPaths
        .map((filePath) => path.resolve(filePath))
        .filter((filePath) => isPathInsideRoot(filePath, resolvedStorageRoot))
    )
  );

  const saveResult = await dialog.showSaveDialog({
    title: '导出孤儿文件清单',
    defaultPath: path.join(
      app.getPath('documents'),
      `ScidataManager_orphan_files_${formatExportTimestamp()}.txt`
    ),
    filters: [
      { name: 'Text', extensions: ['txt'] }
    ]
  });

  if (saveResult.canceled || !saveResult.filePath) {
    return { canceled: true, success: false };
  }

  const lines = [
    'Scidata Manager orphan file list',
    `Generated at: ${new Date().toISOString()}`,
    `Storage root: ${resolvedStorageRoot}`,
    `Total orphan files: ${normalizedPaths.length}`,
    '',
    ...normalizedPaths.map((filePath) => {
      const relativePath = resolveSafeRelativePath(resolvedStorageRoot, filePath) || path.basename(filePath);
      return `${relativePath}\n${filePath}`;
    })
  ];

  fs.writeFileSync(saveResult.filePath, lines.join('\n'), 'utf8');

  return {
    success: true,
    exportPath: saveResult.filePath
  };
}

export async function quarantineOrphanFiles(
  storageRoot: string,
  orphanPaths: string[]
): Promise<QuarantineOrphanFilesResult> {
  const resolvedStorageRoot = path.resolve(storageRoot);
  const normalizedPaths = Array.from(
    new Set(
      orphanPaths
        .map((filePath) => path.resolve(filePath))
        .filter((filePath) => isPathInsideRoot(filePath, resolvedStorageRoot))
    )
  );

  if (!normalizedPaths.length) {
    return { success: false, error: '没有可隔离的孤儿文件' };
  }

  const quarantinePath = path.join(
    resolvedStorageRoot,
    QUARANTINE_ROOT_NAME,
    `integrity-scan-${formatExportTimestamp()}`
  );
  let movedCount = 0;
  let skippedCount = 0;

  for (const filePath of normalizedPaths) {
    if (!fs.existsSync(filePath)) {
      skippedCount += 1;
      continue;
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      skippedCount += 1;
      continue;
    }

    const relativePath = resolveSafeRelativePath(resolvedStorageRoot, filePath);
    if (!relativePath) {
      skippedCount += 1;
      continue;
    }

    const targetPath = resolveUniqueTargetPath(path.join(quarantinePath, relativePath));
    ensureDir(path.dirname(targetPath));
    fs.renameSync(filePath, targetPath);
    movedCount += 1;
  }

  return {
    success: movedCount > 0,
    movedCount,
    skippedCount,
    quarantinePath,
    ...(movedCount > 0 ? {} : { error: '没有文件被移动到隔离目录' })
  };
}

export async function openPathLocation(targetPath: string): Promise<ActionResult> {
  const trimmedPath = targetPath.trim();
  if (!trimmedPath) {
    return { success: false, error: '路径为空' };
  }

  const resolvedPath = path.resolve(trimmedPath);

  if (fs.existsSync(resolvedPath)) {
    const stat = fs.statSync(resolvedPath);

    if (stat.isDirectory()) {
      const result = await shell.openPath(resolvedPath);
      return result ? { success: false, error: result } : { success: true };
    }

    shell.showItemInFolder(resolvedPath);
    return { success: true };
  }

  let currentPath = path.dirname(resolvedPath);

  while (currentPath !== path.dirname(currentPath)) {
    if (fs.existsSync(currentPath) && fs.statSync(currentPath).isDirectory()) {
      const result = await shell.openPath(currentPath);
      return result ? { success: false, error: result } : { success: true };
    }

    currentPath = path.dirname(currentPath);
  }

  return { success: false, error: '路径不存在且找不到可打开的上级目录' };
}
