import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { SaveExperimentTemplateBlockPayload } from '../electron-api';
import {
  buildManagedTargetPath,
  createManagedBackupPath,
  createManagedTempPath,
  ensureDir,
  fileExists
} from './file-helpers';
import { getManagedTargetConflictError } from './managed-file-conflicts';

type TemplateBlockStorageContext = {
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
};

type ResolveTemplateBlockManagedFilesOptions = {
  prisma: PrismaClient;
  storageRoot: string;
  step1: TemplateBlockStorageContext;
  templateBlocks: SaveExperimentTemplateBlockPayload[];
};

type ResolveTemplateBlockManagedFilesResult = {
  error: string;
  resolvedTemplateBlocks: SaveExperimentTemplateBlockPayload[];
  rollbackActions: Array<() => void>;
  finalizeActions: Array<() => void>;
};

function shouldCopyImportedTemplateBlockFile(block: SaveExperimentTemplateBlockPayload) {
  return !block.sourceFilePath.trim() && !!block.originalFilePath.trim();
}

function hasPendingTemplateBlockReplacement(block: SaveExperimentTemplateBlockPayload) {
  return !!block.replacementSourcePath?.trim();
}

function buildTemplateBlockManagedTargetPath(
  storageRoot: string,
  step1: TemplateBlockStorageContext,
  block: SaveExperimentTemplateBlockPayload,
  index: number,
  namingSourcePath: string
) {
  return buildManagedTargetPath(storageRoot, {
    ...step1,
    sourcePath: namingSourcePath,
    nameSuffixParts: [block.templateType, block.blockTitle || 'block', String(index + 1)]
  });
}

function rollbackPreparedTemplateBlockFiles(
  rollbackActions: Array<() => void>,
  context: { experimentId?: number }
) {
  for (const rollback of rollbackActions) {
    try {
      rollback();
    } catch (rollbackError) {
      console.error('rollbackPreparedTemplateBlockFile failed:', {
        experimentId: context.experimentId,
        rollbackError
      });
    }
  }
}

export async function resolveManagedTemplateBlockFiles(
  options: ResolveTemplateBlockManagedFilesOptions,
  context: { experimentId?: number } = {}
): Promise<ResolveTemplateBlockManagedFilesResult> {
  const { prisma, storageRoot, step1, templateBlocks } = options;
  const resolvedTemplateBlocks = templateBlocks.map((block) => ({ ...block }));
  const rollbackActions: Array<() => void> = [];
  const finalizeActions: Array<() => void> = [];
  const plannedTargetPaths = new Set<string>();

  try {
    for (const [index, block] of resolvedTemplateBlocks.entries()) {
      const currentSourcePath = block.sourceFilePath.trim();
      const originalFilePath = block.originalFilePath.trim();
      const originalFileName = block.originalFileName.trim() || (
        originalFilePath ? path.basename(originalFilePath) : ''
      );
      const replacementSourcePath = block.replacementSourcePath?.trim() || '';
      const replacementOriginalName = block.replacementOriginalName?.trim() || '';
      const nextOriginalFilePath = replacementSourcePath || originalFilePath;
      const nextOriginalFileName = replacementOriginalName || originalFileName;
      const hasPendingReplacement = hasPendingTemplateBlockReplacement(block);
      const shouldCopyImportedFile = shouldCopyImportedTemplateBlockFile(block);

      if (!hasPendingReplacement && !shouldCopyImportedFile) {
        resolvedTemplateBlocks[index] = {
          ...block,
          originalFileName,
          originalFilePath,
          replacementSourcePath: undefined,
          replacementOriginalName: undefined
        };
        continue;
      }

      const { fileName, fullPath } = buildTemplateBlockManagedTargetPath(
        storageRoot,
        step1,
        block,
        index,
        replacementSourcePath || originalFilePath
      );

      if (plannedTargetPaths.has(fullPath)) {
        throw new Error('保存文件名与当前编辑中的其他模板块冲突，请调整后重试');
      }
      plannedTargetPaths.add(fullPath);

      const conflictError = await getManagedTargetConflictError(prisma, fullPath, {
        currentSourcePath,
        excludeTemplateBlockId: block.blockId
      });
      if (conflictError) {
        throw new Error(conflictError);
      }

      if (!fileExists(replacementSourcePath || originalFilePath)) {
        throw new Error('导入原始文件不存在或路径无效');
      }

      if (hasPendingReplacement && currentSourcePath) {
        if (!fileExists(currentSourcePath)) {
          throw new Error('当前模板块保存文件不存在，无法替换为新文件');
        }

        const tempPath = createManagedTempPath(fullPath);
        const backupPath = createManagedBackupPath(currentSourcePath);

        try {
          ensureDir(path.dirname(fullPath));
          fs.renameSync(currentSourcePath, backupPath);
          fs.copyFileSync(replacementSourcePath, tempPath);
          fs.renameSync(tempPath, fullPath);
        } catch (error) {
          if (fileExists(tempPath)) {
            fs.rmSync(tempPath, { force: true });
          }

          if (fileExists(backupPath) && !fileExists(currentSourcePath)) {
            try {
              ensureDir(path.dirname(currentSourcePath));
              fs.renameSync(backupPath, currentSourcePath);
            } catch (restoreError) {
              console.error('restoreTemplateBlockSavedFileAfterReplace failed:', {
                experimentId: context.experimentId,
                blockId: block.blockId,
                restoreError
              });
            }
          }

          throw error;
        } finally {
          if (fileExists(tempPath)) {
            fs.rmSync(tempPath, { force: true });
          }
        }

        finalizeActions.push(() => {
          if (fileExists(backupPath)) {
            fs.rmSync(backupPath, { force: true });
          }
        });

        rollbackActions.unshift(() => {
          if (fileExists(fullPath)) {
            fs.rmSync(fullPath, { force: true });
          }

          if (fileExists(backupPath) && !fileExists(currentSourcePath)) {
            ensureDir(path.dirname(currentSourcePath));
            fs.renameSync(backupPath, currentSourcePath);
          }
        });
      } else {
        const tempPath = createManagedTempPath(fullPath);

        try {
          ensureDir(path.dirname(fullPath));
          fs.copyFileSync(replacementSourcePath || originalFilePath, tempPath);
          fs.renameSync(tempPath, fullPath);
        } finally {
          if (fileExists(tempPath)) {
            fs.rmSync(tempPath, { force: true });
          }
        }

        rollbackActions.unshift(() => {
          if (fileExists(fullPath)) {
            fs.rmSync(fullPath, { force: true });
          }
        });
      }

      resolvedTemplateBlocks[index] = {
        ...block,
        sourceFileName: fileName,
        sourceFilePath: fullPath,
        originalFileName: nextOriginalFileName,
        originalFilePath: nextOriginalFilePath,
        replacementSourcePath: undefined,
        replacementOriginalName: undefined
      };
    }
  } catch (error) {
    rollbackPreparedTemplateBlockFiles(rollbackActions, context);
    return {
      error:
        error instanceof Error && error.message
          ? error.message
          : '处理模板块原始文件失败，请检查文件状态后重试',
      resolvedTemplateBlocks: templateBlocks,
      rollbackActions: [],
      finalizeActions: []
    };
  }

  return {
    error: '',
    resolvedTemplateBlocks,
    rollbackActions,
    finalizeActions
  };
}
