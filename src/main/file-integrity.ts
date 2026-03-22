import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { FileIntegrityReport } from '../electron-api';

const EXAMPLE_LIMIT = 10;
const IGNORED_FILE_NAMES = new Set(['.DS_Store', 'Thumbs.db']);

function isIgnoredFileName(fileName: string) {
  return IGNORED_FILE_NAMES.has(fileName) || fileName.startsWith('._');
}

function isPathInsideRoot(filePath: string, storageRoot: string) {
  const relativePath = path.relative(storageRoot, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
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
  const referencedItems = await prisma.experimentDataItem.findMany({
    where: {
      sourceFilePath: {
        not: null
      }
    },
    select: {
      sourceFilePath: true
    }
  });

  const referencedManagedPaths = Array.from(
    new Set(
      referencedItems
        .map((item) => item.sourceFilePath?.trim() || '')
        .filter(Boolean)
        .map((filePath) => path.resolve(filePath))
        .filter((filePath) => isPathInsideRoot(filePath, resolvedStorageRoot))
    )
  );
  const referencedPathSet = new Set(referencedManagedPaths);
  const missingPaths = referencedManagedPaths.filter((filePath) => !fs.existsSync(filePath));
  const storageRootExists =
    fs.existsSync(resolvedStorageRoot) && fs.statSync(resolvedStorageRoot).isDirectory();
  const scannedFiles = storageRootExists
    ? collectRegularFiles(resolvedStorageRoot)
    : [];
  const orphanPaths = scannedFiles.filter((filePath) => !referencedPathSet.has(filePath));

  return {
    storageRoot: resolvedStorageRoot,
    storageRootExists,
    referencedManagedFileCount: referencedManagedPaths.length,
    missingReferencedFileCount: missingPaths.length,
    scannedManagedFileCount: scannedFiles.length,
    orphanManagedFileCount: orphanPaths.length,
    missingExamples: missingPaths.slice(0, EXAMPLE_LIMIT),
    orphanExamples: orphanPaths.slice(0, EXAMPLE_LIMIT)
  };
}
