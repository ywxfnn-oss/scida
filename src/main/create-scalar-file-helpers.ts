import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type {
  ManagedSectionLabel,
  SaveExperimentPayload,
  ScalarItemRole
} from '../electron-api';
import { createManagedTempPath, ensureDir, fileExists } from './file-helpers';
import {
  formatIndexedManagedFileWarning,
  resolveManagedFileTarget
} from './managed-file-naming';

type ResolveCreateScalarFilesOptions = {
  prisma: PrismaClient;
  storageRoot: string;
  payload: SaveExperimentPayload;
};

type ResolveCreateScalarFilesResult = {
  error: string;
  resolvedStep2: SaveExperimentPayload['step2'];
  rollbackActions: Array<() => void>;
  warning?: string;
};

type ScalarRenamePlan = {
  index: number;
  currentSourcePath: string;
  targetPath: string;
  targetFileName: string;
};

function getScalarSectionLabel(role?: ScalarItemRole): ManagedSectionLabel {
  return role === 'condition' ? '实验条件' : '结果指标';
}

function buildWarningMessage(warnings: Set<string>) {
  return warnings.size ? Array.from(warnings).join('\n') : undefined;
}

function rollbackPreparedScalarFiles(
  rollbackActions: Array<() => void>,
  context: { displayName: string }
) {
  for (const rollback of rollbackActions) {
    try {
      rollback();
    } catch (rollbackError) {
      console.error('rollbackPreparedScalarFile failed:', {
        displayName: context.displayName,
        rollbackError
      });
    }
  }
}

export async function resolveManagedCreateScalarFiles(
  options: ResolveCreateScalarFilesOptions
): Promise<ResolveCreateScalarFilesResult> {
  const { prisma, storageRoot, payload } = options;
  const resolvedStep2 = payload.step2.map((item) => ({
    ...item,
    scalarRole: item.scalarRole || 'metric',
    sourceFileName: item.sourceFileName || '',
    sourceFilePath: item.sourceFilePath || '',
    originalFileName: item.originalFileName || '',
    originalFilePath: item.originalFilePath || ''
  }));
  const warnings = new Set<string>();
  const plannedTargetSlots = new Set<string>();
  const renamePlans: ScalarRenamePlan[] = [];
  const rollbackActions: Array<() => void> = [];

  try {
    for (const [index, item] of resolvedStep2.entries()) {
      const currentSourcePath = item.sourceFilePath.trim();

      if (!currentSourcePath) {
        continue;
      }

      if (!fileExists(currentSourcePath)) {
        throw new Error('当前已导入的原始文件不存在，无法保存实验记录');
      }

      const sectionLabel = getScalarSectionLabel(item.scalarRole);
      const target = await resolveManagedFileTarget({
        prisma,
        storageRoot,
        sourcePath: currentSourcePath,
        testProject: payload.step1.testProject,
        sampleCode: payload.step1.sampleCode,
        displayName: payload.displayName,
        sectionLabel,
        secondaryItemName: item.itemName,
        currentSourcePath,
        reservedTargetSlots: plannedTargetSlots
      });

      if (target.indexed && target.fullPath !== currentSourcePath) {
        warnings.add(formatIndexedManagedFileWarning(sectionLabel, item.itemName));
      }

      resolvedStep2[index] = {
        ...item,
        sourceFileName: target.fileName,
        sourceFilePath: target.fullPath
      };

      if (target.fullPath !== currentSourcePath) {
        renamePlans.push({
          index,
          currentSourcePath,
          targetPath: target.fullPath,
          targetFileName: target.fileName
        });
      }
    }

    const stagedPlans = renamePlans.map((plan) => ({
      ...plan,
      tempPath: createManagedTempPath(plan.currentSourcePath)
    }));

    for (const plan of stagedPlans) {
      ensureDir(path.dirname(plan.targetPath));
      fs.renameSync(plan.currentSourcePath, plan.tempPath);

      rollbackActions.unshift(() => {
        if (fileExists(plan.tempPath) && !fileExists(plan.currentSourcePath)) {
          ensureDir(path.dirname(plan.currentSourcePath));
          fs.renameSync(plan.tempPath, plan.currentSourcePath);
        }
      });
    }

    for (const plan of stagedPlans) {
      fs.renameSync(plan.tempPath, plan.targetPath);

      rollbackActions.unshift(() => {
        if (fileExists(plan.targetPath) && !fileExists(plan.currentSourcePath)) {
          ensureDir(path.dirname(plan.currentSourcePath));
          fs.renameSync(plan.targetPath, plan.currentSourcePath);
        }
      });

      resolvedStep2[plan.index] = {
        ...resolvedStep2[plan.index],
        sourceFileName: plan.targetFileName,
        sourceFilePath: plan.targetPath
      };
    }
  } catch (error) {
    rollbackPreparedScalarFiles(rollbackActions, { displayName: payload.displayName });
    return {
      error:
        error instanceof Error && error.message
          ? error.message
          : '处理二级数据项原始文件失败，请检查文件状态后重试',
      resolvedStep2: payload.step2,
      rollbackActions: [],
      warning: buildWarningMessage(warnings)
    };
  }

  return {
    error: '',
    resolvedStep2,
    rollbackActions,
    warning: buildWarningMessage(warnings)
  };
}
