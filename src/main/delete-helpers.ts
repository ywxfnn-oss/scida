import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { ActionResult } from '../electron-api';
import { fileExists } from './file-helpers';

export async function deleteExperimentPermanently(
  prisma: PrismaClient,
  experimentId: number
): Promise<ActionResult> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      dataItems: true
    }
  });

  if (!experiment) {
    return { success: false, error: '未找到对应实验记录' };
  }

  const savedFilePaths = Array.from(
    new Set(
      experiment.dataItems
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

    if (sharedReferenceCount > 0) {
      return {
        success: false,
        error: `无法删除：保存文件“${path.basename(filePath)}”仍被其他实验记录引用`
      };
    }
  }

  const deletedFilePaths: string[] = [];

  for (const filePath of savedFilePaths) {
    if (!fileExists(filePath)) {
      continue;
    }

    try {
      fs.rmSync(filePath);
      deletedFilePaths.push(filePath);
    } catch (error) {
      console.error('deleteExperiment file removal failed:', {
        experimentId,
        filePath,
        error
      });

      return {
        success: false,
        error: `删除保存文件失败：${path.basename(filePath)}。实验记录未删除`
      };
    }
  }

  try {
    await prisma.experiment.delete({
      where: { id: experimentId }
    });

    return { success: true };
  } catch (error) {
    console.error('deleteExperiment database removal failed after file deletion:', {
      experimentId,
      deletedFilePaths,
      error
    });

    return {
      success: false,
      error: '保存文件已删除，但数据库记录删除失败，可能需要手动恢复数据'
    };
  }
}
