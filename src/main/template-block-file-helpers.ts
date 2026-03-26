import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { ManagedSectionLabel, SaveExperimentTemplateBlockPayload } from '../electron-api';
import {
  createManagedBackupPath,
  createManagedTempPath,
  ensureDir,
  fileExists
} from './file-helpers';
import {
  formatIndexedManagedFileWarning,
  parseManagedFileSlotIndex,
  resolveManagedFileTarget
} from './managed-file-naming';

type TemplateBlockStorageContext = {
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  displayName: string;
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
  warning?: string;
};

function shouldCopyImportedTemplateBlockFile(block: SaveExperimentTemplateBlockPayload) {
  return !block.sourceFilePath.trim() && !!block.originalFilePath.trim();
}

function hasPendingTemplateBlockReplacement(block: SaveExperimentTemplateBlockPayload) {
  return !!block.replacementSourcePath?.trim();
}

function buildWarningMessage(warnings: Set<string>) {
  return warnings.size ? Array.from(warnings).join('\n') : undefined;
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
  const plannedTargetSlots = new Set<string>();
  const warnings = new Set<string>();
  const sectionLabel: ManagedSectionLabel = '结构化数据块';

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

      const nextSourcePath = replacementSourcePath || originalFilePath;

      if (!fileExists(nextSourcePath)) {
        throw new Error('导入原始文件不存在或路径无效');
      }

      const target = await resolveManagedFileTarget({
        prisma,
        storageRoot,
        sourcePath: nextSourcePath,
        testProject: step1.testProject,
        sampleCode: step1.sampleCode,
        displayName: step1.displayName,
        sectionLabel,
        secondaryItemName: block.blockTitle,
        currentSourcePath,
        excludeTemplateBlockId: block.blockId,
        preferredSlotIndex: hasPendingReplacement
          ? parseManagedFileSlotIndex(currentSourcePath)
          : 0,
        preserveSlot: hasPendingReplacement,
        reservedTargetSlots: plannedTargetSlots
      });

      if (!hasPendingReplacement && target.indexed) {
        warnings.add(formatIndexedManagedFileWarning(sectionLabel, block.blockTitle));
      }

      if (hasPendingReplacement && currentSourcePath) {
        if (!fileExists(currentSourcePath)) {
          throw new Error('当前模板块保存文件不存在，无法替换为新文件');
        }

        const tempPath = createManagedTempPath(target.fullPath);
        const backupPath = createManagedBackupPath(currentSourcePath);

        try {
          ensureDir(path.dirname(target.fullPath));
          fs.renameSync(currentSourcePath, backupPath);
          fs.copyFileSync(replacementSourcePath, tempPath);
          fs.renameSync(tempPath, target.fullPath);
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
          if (fileExists(target.fullPath)) {
            fs.rmSync(target.fullPath, { force: true });
          }

          if (fileExists(backupPath) && !fileExists(currentSourcePath)) {
            ensureDir(path.dirname(currentSourcePath));
            fs.renameSync(backupPath, currentSourcePath);
          }
        });
      } else {
        const tempPath = createManagedTempPath(target.fullPath);

        try {
          ensureDir(path.dirname(target.fullPath));
          fs.copyFileSync(nextSourcePath, tempPath);
          fs.renameSync(tempPath, target.fullPath);
        } finally {
          if (fileExists(tempPath)) {
            fs.rmSync(tempPath, { force: true });
          }
        }

        rollbackActions.unshift(() => {
          if (fileExists(target.fullPath)) {
            fs.rmSync(target.fullPath, { force: true });
          }
        });
      }

      resolvedTemplateBlocks[index] = {
        ...block,
        sourceFileName: target.fileName,
        sourceFilePath: target.fullPath,
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
      finalizeActions: [],
      warning: buildWarningMessage(warnings)
    };
  }

  return {
    error: '',
    resolvedTemplateBlocks,
    rollbackActions,
    finalizeActions,
    warning: buildWarningMessage(warnings)
  };
}
