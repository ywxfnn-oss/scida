import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { ActionResult } from '../electron-api';
import { createManagedDeleteStagingPath, ensureDir, fileExists } from './file-helpers';
import { getOperationActor, writeOperationLog } from './operation-log';

type StagedDeleteEntry = {
  originalPath: string;
  stagedPath: string;
};

function restoreStagedFiles(entries: StagedDeleteEntry[], experimentId: number) {
  let restoreFailed = false;

  for (const entry of [...entries].reverse()) {
    if (!fileExists(entry.stagedPath) || fileExists(entry.originalPath)) {
      continue;
    }

    try {
      ensureDir(path.dirname(entry.originalPath));
      fs.renameSync(entry.stagedPath, entry.originalPath);
    } catch (error) {
      restoreFailed = true;
      console.error('restoreDeletedManagedFile failed:', {
        experimentId,
        originalPath: entry.originalPath,
        stagedPath: entry.stagedPath,
        error
      });
    }
  }

  return restoreFailed;
}

function purgeStagedFiles(entries: StagedDeleteEntry[], experimentId: number) {
  let cleanupFailed = false;

  for (const entry of entries) {
    if (!fileExists(entry.stagedPath)) {
      continue;
    }

    try {
      fs.rmSync(entry.stagedPath, { force: true });
    } catch (error) {
      cleanupFailed = true;
      console.error('purgeDeletedManagedFile failed:', {
        experimentId,
        stagedPath: entry.stagedPath,
        error
      });
    }
  }

  return cleanupFailed;
}

export async function deleteExperimentPermanently(
  prisma: PrismaClient,
  experimentId: number
): Promise<ActionResult> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      dataItems: true,
      templateBlocks: true
    }
  });

  if (!experiment) {
    return { success: false, error: '未找到对应实验记录' };
  }

  const savedFilePaths = Array.from(
    new Set(
      [...experiment.dataItems, ...experiment.templateBlocks]
        .map((item) => item.sourceFilePath?.trim() || '')
        .filter(Boolean)
    )
  );

  for (const filePath of savedFilePaths) {
    const sharedReferenceCount = await prisma.experimentDataItem.count({
      where: {
        sourceFilePath: filePath,
        experimentId: {
          not: experimentId
        }
      }
    });

    const sharedTemplateBlockCount = await prisma.experimentTemplateBlock.count({
      where: {
        sourceFilePath: filePath,
        experimentId: {
          not: experimentId
        }
      }
    });

    if (sharedReferenceCount + sharedTemplateBlockCount > 0) {
      return {
        success: false,
        error: `无法删除：保存文件“${path.basename(filePath)}”仍被其他实验记录引用`
      };
    }
  }

  const stagedEntries: StagedDeleteEntry[] = [];

  for (const filePath of savedFilePaths) {
    if (!fileExists(filePath)) {
      continue;
    }

    try {
      const stagedPath = createManagedDeleteStagingPath(filePath);
      ensureDir(path.dirname(stagedPath));
      fs.renameSync(filePath, stagedPath);
      stagedEntries.push({
        originalPath: filePath,
        stagedPath
      });
    } catch (error) {
      const restoreFailed = restoreStagedFiles(stagedEntries, experimentId);

      console.error('deleteExperiment file staging failed:', {
        experimentId,
        filePath,
        stagedEntries,
        error
      });

      return {
        success: false,
        error: restoreFailed
          ? `删除保存文件失败：${path.basename(filePath)}。实验记录未删除，已转移的保存文件可能需要手动恢复`
          : `删除保存文件失败：${path.basename(filePath)}。实验记录未删除`
      };
    }
  }

  try {
    await prisma.experiment.delete({
      where: { id: experimentId }
    });

    try {
      await writeOperationLog(prisma, {
        operationType: 'experiment_delete',
        experimentId,
        actor: await getOperationActor(prisma),
        summary: JSON.stringify({
          experimentId,
          displayName: experiment.displayName,
          sampleCode: experiment.sampleCode,
          testProject: experiment.testProject,
          testTime: experiment.testTime,
          deletedManagedFileCount: stagedEntries.length,
          deletedManagedFilePaths: stagedEntries.map((entry) => entry.originalPath)
        })
      });
    } catch (error) {
      console.error('writeDeleteOperationLog failed:', {
        experimentId,
        error
      });
    }

    const cleanupFailed = purgeStagedFiles(stagedEntries, experimentId);

    return cleanupFailed
      ? {
          success: true,
          warning: '实验记录已删除，但待删除的保存文件清理失败，可能需要手动处理'
        }
      : { success: true };
  } catch (error) {
    const restoreFailed = restoreStagedFiles(stagedEntries, experimentId);

    console.error('deleteExperiment database removal failed after file staging:', {
      experimentId,
      stagedEntries,
      error
    });

    return {
      success: false,
      error: restoreFailed
        ? '数据库记录删除失败，已转移的保存文件可能需要手动恢复'
        : '数据库记录删除失败，保存文件已恢复'
    };
  }
}
