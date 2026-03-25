import type { PrismaClient } from '@prisma/client';
import { fileExists } from './file-helpers';

type ManagedTargetConflictOptions = {
  excludeDataItemId?: number;
  excludeTemplateBlockId?: number;
  currentSourcePath?: string;
};

async function findConflictingDataItem(
  prisma: PrismaClient,
  targetPath: string,
  excludeDataItemId?: number
) {
  return prisma.experimentDataItem.findFirst({
    where: {
      sourceFilePath: targetPath,
      ...(excludeDataItemId ? { NOT: { id: excludeDataItemId } } : {})
    },
    select: {
      id: true
    }
  });
}

async function findConflictingTemplateBlock(
  prisma: PrismaClient,
  targetPath: string,
  excludeTemplateBlockId?: number
) {
  return prisma.experimentTemplateBlock.findFirst({
    where: {
      sourceFilePath: targetPath,
      ...(excludeTemplateBlockId ? { NOT: { id: excludeTemplateBlockId } } : {})
    },
    select: {
      id: true
    }
  });
}

export async function getManagedTargetConflictError(
  prisma: PrismaClient,
  targetPath: string,
  options?: ManagedTargetConflictOptions
) {
  const [conflictingItem, conflictingBlock] = await Promise.all([
    findConflictingDataItem(prisma, targetPath, options?.excludeDataItemId),
    findConflictingTemplateBlock(prisma, targetPath, options?.excludeTemplateBlockId)
  ]);

  if (conflictingItem || conflictingBlock) {
    return '保存文件名与其他实验记录冲突，请调整后重试';
  }

  if (fileExists(targetPath) && targetPath !== options?.currentSourcePath) {
    return '目标保存文件已存在，无法覆盖，请调整后重试';
  }

  return '';
}
