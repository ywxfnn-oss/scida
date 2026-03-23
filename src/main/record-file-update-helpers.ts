import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  UpdateExperimentDataItemPayload,
  UpdateExperimentPayload
} from '../electron-api';
import { getSettingValue } from './auth-settings';
import {
  buildManagedTargetPath,
  createManagedBackupPath,
  createManagedTempPath,
  ensureDir,
  fileExists
} from './file-helpers';
import {
  normalizeTemplateBlocks,
  serializeTemplateBlockMeta,
  validateTemplateBlockPayloads,
  type TemplateBlockPayload
} from '../template-blocks';

type UpdateFilePlan = {
  index: number;
  dataItemId?: number;
  currentSourcePath: string;
  targetPath: string;
  targetFileName: string;
  replacementSourcePath: string;
  replacementOriginalName: string;
  action: 'rename' | 'replace' | 'create';
};

type ManagedTargetConflictOptions = {
  excludeDataItemId?: number;
  currentSourcePath?: string;
};

type UpdateExperimentFlowOptions = {
  prisma: PrismaClient;
  getDefaultStorageRoot: () => string;
};

type OldExperimentRecord = {
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  sampleOwner: string | null;
  displayName: string;
  customFields: Array<{
    fieldName: string;
    fieldValue: string;
    sortOrder: number;
  }>;
  dataItems: Array<{
    id: number;
    itemName: string;
    itemValue: string;
    itemUnit: string | null;
    sourceFileName: string | null;
    sourceFilePath: string | null;
    originalFileName: string | null;
    originalFilePath: string | null;
    rowOrder: number;
  }>;
  templateBlocks: Array<{
    templateType: string;
    blockTitle: string;
    blockOrder: number;
    metaJson: string;
    dataJson: string;
    sourceFileName: string | null;
    sourceFilePath: string | null;
    originalFileName: string | null;
    originalFilePath: string | null;
  }>;
};

type OldDataItemRecord = {
  sourceFilePath: string | null;
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
    }
  });
}

async function findConflictingTemplateBlock(
  prisma: PrismaClient,
  targetPath: string
) {
  return prisma.experimentTemplateBlock.findFirst({
    where: {
      sourceFilePath: targetPath
    }
  });
}

export async function getManagedTargetConflictError(
  prisma: PrismaClient,
  targetPath: string,
  options?: ManagedTargetConflictOptions
) {
  const conflictingItem = await findConflictingDataItem(
    prisma,
    targetPath,
    options?.excludeDataItemId
  );

  if (conflictingItem) {
    return '保存文件名与其他实验记录冲突，请调整后重试';
  }

  const conflictingBlock = await findConflictingTemplateBlock(prisma, targetPath);

  if (conflictingBlock && targetPath !== options?.currentSourcePath) {
    return '保存文件名与其他实验记录冲突，请调整后重试';
  }

  if (fileExists(targetPath) && targetPath !== options?.currentSourcePath) {
    return '目标保存文件已存在，无法覆盖，请调整后重试';
  }

  return '';
}

function normalizeStep2Items(payload: UpdateExperimentPayload) {
  return payload.step2.map((item) => ({
    ...item,
    sourceFileName: item.sourceFileName || '',
    sourceFilePath: item.sourceFilePath || '',
    originalFileName: item.originalFileName || '',
    originalFilePath: item.originalFilePath || ''
  }));
}

function buildOldSnapshot(oldExperiment: OldExperimentRecord | null) {
  if (!oldExperiment) {
    return null;
  }

  return {
    testProject: oldExperiment.testProject,
    sampleCode: oldExperiment.sampleCode,
    tester: oldExperiment.tester,
    instrument: oldExperiment.instrument,
    testTime: oldExperiment.testTime,
    sampleOwner: oldExperiment.sampleOwner,
    displayName: oldExperiment.displayName,
    customFields: oldExperiment.customFields.map((field) => ({
      fieldName: field.fieldName,
      fieldValue: field.fieldValue,
      sortOrder: field.sortOrder
    })),
    dataItems: oldExperiment.dataItems.map((item) => ({
      itemName: item.itemName,
      itemValue: item.itemValue,
      itemUnit: item.itemUnit,
      sourceFileName: item.sourceFileName,
      sourceFilePath: item.sourceFilePath,
      originalFileName: item.originalFileName,
      originalFilePath: item.originalFilePath,
      rowOrder: item.rowOrder
    })),
    templateBlocks: oldExperiment.templateBlocks.map((block) => ({
      templateType: block.templateType,
      blockTitle: block.blockTitle,
      blockOrder: block.blockOrder,
      metaJson: block.metaJson,
      dataJson: block.dataJson,
      sourceFileName: block.sourceFileName,
      sourceFilePath: block.sourceFilePath,
      originalFileName: block.originalFileName,
      originalFilePath: block.originalFilePath
    }))
  };
}

function buildNewSnapshot(
  payload: UpdateExperimentPayload,
  normalizedTemplateBlocks: TemplateBlockPayload[],
  resolvedStep2: Array<
    UpdateExperimentDataItemPayload & {
      sourceFileName: string;
      sourceFilePath: string;
      originalFileName: string;
      originalFilePath: string;
    }
  >
) {
  return {
    testProject: payload.step1.testProject,
    sampleCode: payload.step1.sampleCode,
    tester: payload.step1.tester,
    instrument: payload.step1.instrument,
    testTime: payload.step1.testTime,
    sampleOwner: payload.step1.sampleOwner || null,
    displayName: payload.displayName,
    customFields: payload.step1.dynamicFields.map((field, index) => ({
      fieldName: field.name,
      fieldValue: field.value,
      sortOrder: index + 1
    })),
    dataItems: resolvedStep2.map((item, index) => ({
      itemName: item.itemName,
      itemValue: item.itemValue,
      itemUnit: item.itemUnit || null,
      sourceFileName: item.sourceFileName || null,
      sourceFilePath: item.sourceFilePath || null,
      originalFileName: item.originalFileName || null,
      originalFilePath: item.originalFilePath || null,
      rowOrder: index + 1
    })),
    templateBlocks: normalizedTemplateBlocks.map((block, index) => ({
      templateType: block.templateType,
      blockTitle: block.blockTitle,
      blockOrder: index + 1,
      metaJson: serializeTemplateBlockMeta(block),
      dataJson: JSON.stringify(block.points),
      sourceFileName: block.sourceFileName || null,
      sourceFilePath: block.sourceFilePath || null,
      originalFileName: block.originalFileName || null,
      originalFilePath: block.originalFilePath || null
    }))
  };
}

function buildFileOperationDetails(
  filePlans: UpdateFilePlan[],
  resolvedStep2: Array<
    UpdateExperimentDataItemPayload & {
      sourceFileName: string;
      sourceFilePath: string;
      originalFileName: string;
      originalFilePath: string;
    }
  >
) {
  return filePlans.map((plan) => ({
    action: plan.action,
    dataItemId: plan.dataItemId || null,
    itemName: resolvedStep2[plan.index]?.itemName || '',
    previousManagedFilePath: plan.currentSourcePath || null,
    previousManagedFileName: plan.currentSourcePath
      ? path.basename(plan.currentSourcePath)
      : null,
    nextManagedFilePath: plan.targetPath,
    nextManagedFileName: plan.targetFileName,
    replacementOriginalFileName: plan.replacementOriginalName || null
  }));
}

async function buildUpdateFilePlans(
  prisma: PrismaClient,
  payload: UpdateExperimentPayload,
  storageRoot: string,
  oldDataItemMap: Map<number, OldDataItemRecord>
) {
  const plannedTargetPaths = new Set<string>();
  const filePlans: UpdateFilePlan[] = [];

  for (const [index, item] of payload.step2.entries()) {
    const oldItem = item.dataItemId ? oldDataItemMap.get(item.dataItemId) : undefined;
    const currentSourcePath = oldItem?.sourceFilePath?.trim() || item.sourceFilePath.trim() || '';
    const replacementSourcePath = item.replacementSourcePath?.trim() || '';
    const replacementOriginalName = item.replacementOriginalName?.trim() || '';
    const hasManagedFile = !!currentSourcePath;
    const hasReplacement = !!replacementSourcePath;

    if (!hasManagedFile && !hasReplacement) {
      continue;
    }

    const namingSourcePath = hasReplacement ? replacementSourcePath : currentSourcePath;
    const { fileName, fullPath } = buildManagedTargetPath(storageRoot, {
      sourcePath: namingSourcePath,
      testProject: payload.step1.testProject,
      sampleCode: payload.step1.sampleCode,
      tester: payload.step1.tester,
      instrument: payload.step1.instrument,
      testTime: payload.step1.testTime
    });

    if (plannedTargetPaths.has(fullPath)) {
      return {
        error: '保存文件名与当前编辑中的其他数据项冲突，请调整后重试',
        filePlans: []
      };
    }

    plannedTargetPaths.add(fullPath);

    const conflictError = await getManagedTargetConflictError(prisma, fullPath, {
      excludeDataItemId: item.dataItemId,
      currentSourcePath
    });

    if (conflictError) {
      return {
        error: conflictError,
        filePlans: []
      };
    }

    if (hasReplacement && !fileExists(replacementSourcePath)) {
      return {
        error: '新选择的原始文件不存在或路径无效',
        filePlans: []
      };
    }

    if (hasReplacement) {
      filePlans.push({
        index,
        dataItemId: item.dataItemId,
        currentSourcePath,
        targetPath: fullPath,
        targetFileName: fileName,
        replacementSourcePath,
        replacementOriginalName,
        action: hasManagedFile ? 'replace' : 'create'
      });
      continue;
    }

    if (currentSourcePath && fullPath !== currentSourcePath) {
      filePlans.push({
        index,
        dataItemId: item.dataItemId,
        currentSourcePath,
        targetPath: fullPath,
        targetFileName: fileName,
        replacementSourcePath: '',
        replacementOriginalName: '',
        action: 'rename'
      });
    }
  }

  return {
    error: '',
    filePlans
  };
}

function applyFilePlans(
  payload: UpdateExperimentPayload,
  filePlans: UpdateFilePlan[],
  resolvedStep2: Array<
    UpdateExperimentDataItemPayload & {
      sourceFileName: string;
      sourceFilePath: string;
      originalFileName: string;
      originalFilePath: string;
    }
  >
) {
  const rollbackActions: Array<() => void> = [];
  const finalizeActions: Array<() => void> = [];

  for (const plan of filePlans) {
    if (plan.action === 'rename') {
      if (!plan.currentSourcePath || !fileExists(plan.currentSourcePath)) {
        return {
          error: '当前保存文件不存在，无法按新名称更新',
          rollbackActions,
          finalizeActions,
          resolvedStep2
        };
      }

      ensureDir(path.dirname(plan.targetPath));
      fs.renameSync(plan.currentSourcePath, plan.targetPath);

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

      continue;
    }

    const tempPath = createManagedTempPath(plan.targetPath);

    if (plan.action === 'create') {
      try {
        ensureDir(path.dirname(plan.targetPath));
        fs.copyFileSync(plan.replacementSourcePath, tempPath);
        fs.renameSync(tempPath, plan.targetPath);
      } finally {
        if (fileExists(tempPath)) {
          fs.rmSync(tempPath, { force: true });
        }
      }

      rollbackActions.unshift(() => {
        if (fileExists(plan.targetPath)) {
          fs.rmSync(plan.targetPath, { force: true });
        }
      });

      resolvedStep2[plan.index] = {
        ...resolvedStep2[plan.index],
        sourceFileName: plan.targetFileName,
        sourceFilePath: plan.targetPath,
        originalFileName: plan.replacementOriginalName,
        originalFilePath: plan.replacementSourcePath
      };

      continue;
    }

    if (!plan.currentSourcePath || !fileExists(plan.currentSourcePath)) {
      return {
        error: '当前保存文件不存在，无法替换为新文件',
        rollbackActions,
        finalizeActions,
        resolvedStep2
      };
    }

    const backupPath = createManagedBackupPath(plan.currentSourcePath);

    try {
      ensureDir(path.dirname(plan.targetPath));
      fs.renameSync(plan.currentSourcePath, backupPath);
      fs.copyFileSync(plan.replacementSourcePath, tempPath);
      fs.renameSync(tempPath, plan.targetPath);
    } catch (error) {
      if (fileExists(tempPath)) {
        fs.rmSync(tempPath, { force: true });
      }

      if (fileExists(backupPath) && !fileExists(plan.currentSourcePath)) {
        try {
          ensureDir(path.dirname(plan.currentSourcePath));
          fs.renameSync(backupPath, plan.currentSourcePath);
        } catch (restoreError) {
          console.error('restoreSavedFileAfterReplace failed:', {
            experimentId: payload.experimentId,
            dataItemId: plan.dataItemId,
            restoreError
          });
        }
      }

      throw error;
    }

    finalizeActions.push(() => {
      if (fileExists(backupPath)) {
        fs.rmSync(backupPath, { force: true });
      }
    });

    rollbackActions.unshift(() => {
      if (fileExists(plan.targetPath)) {
        fs.rmSync(plan.targetPath, { force: true });
      }

      if (fileExists(backupPath) && !fileExists(plan.currentSourcePath)) {
        ensureDir(path.dirname(plan.currentSourcePath));
        fs.renameSync(backupPath, plan.currentSourcePath);
      }
    });

    resolvedStep2[plan.index] = {
      ...resolvedStep2[plan.index],
      sourceFileName: plan.targetFileName,
      sourceFilePath: plan.targetPath,
      originalFileName: plan.replacementOriginalName,
      originalFilePath: plan.replacementSourcePath
    };
  }

  return {
    error: '',
    rollbackActions,
    finalizeActions,
    resolvedStep2
  };
}

export async function updateExperimentWithManagedFiles(
  payload: UpdateExperimentPayload,
  options: UpdateExperimentFlowOptions
): Promise<ActionResult> {
  const { prisma, getDefaultStorageRoot } = options;
  const oldExperiment = await prisma.experiment.findUnique({
    where: { id: payload.experimentId },
    include: {
      customFields: { orderBy: { sortOrder: 'asc' } },
      dataItems: { orderBy: { rowOrder: 'asc' } },
      templateBlocks: { orderBy: { blockOrder: 'asc' } }
    }
  });

  if (!oldExperiment) {
    return { success: false, error: '未找到对应实验记录' };
  }

  const storageRoot = await getSettingValue(
    prisma,
    'storageRoot',
    getDefaultStorageRoot()
  );
  const oldDataItemMap = new Map(
    oldExperiment.dataItems.map((item) => [item.id, item])
  );
  const normalizedTemplateBlocks = normalizeTemplateBlocks(payload.templateBlocks || []);
  const templateBlockValidation = validateTemplateBlockPayloads(normalizedTemplateBlocks);

  if ('error' in templateBlockValidation) {
    return {
      success: false,
      error: templateBlockValidation.error
    };
  }
  const { error: filePlanError, filePlans } = await buildUpdateFilePlans(
    prisma,
    payload,
    storageRoot,
    oldDataItemMap
  );

  if (filePlanError) {
    return { success: false, error: filePlanError };
  }

  const resolvedStep2 = normalizeStep2Items(payload);
  let rollbackActions: Array<() => void> = [];
  let finalizeActions: Array<() => void> = [];

  try {
    const filePlanResult = applyFilePlans(payload, filePlans, resolvedStep2);
    rollbackActions = filePlanResult.rollbackActions;
    finalizeActions = filePlanResult.finalizeActions;

    if (filePlanResult.error) {
      return { success: false, error: filePlanResult.error };
    }
  } catch (error) {
    for (const rollback of rollbackActions) {
      try {
        rollback();
      } catch (rollbackError) {
        console.error('rollbackUpdatedSavedFile failed:', {
          experimentId: payload.experimentId,
          rollbackError
        });
      }
    }

    console.error('prepareUpdatedSavedFiles failed:', {
      experimentId: payload.experimentId,
      error
    });
    return { success: false, error: '更新保存文件失败，请检查文件状态后重试' };
  }

  const oldSnapshot = buildOldSnapshot(oldExperiment);
  const newSnapshot = buildNewSnapshot(payload, normalizedTemplateBlocks, resolvedStep2);
  const fileOperations = buildFileOperationDetails(filePlans, resolvedStep2);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.experiment.update({
        where: { id: payload.experimentId },
        data: {
          testProject: payload.step1.testProject,
          sampleCode: payload.step1.sampleCode,
          tester: payload.step1.tester,
          instrument: payload.step1.instrument,
          testTime: payload.step1.testTime,
          sampleOwner: payload.step1.sampleOwner || null,
          displayName: payload.displayName
        }
      });

      await tx.experimentCustomField.deleteMany({
        where: { experimentId: payload.experimentId }
      });

      await tx.experimentDataItem.deleteMany({
        where: { experimentId: payload.experimentId }
      });

      await tx.experimentTemplateBlock.deleteMany({
        where: { experimentId: payload.experimentId }
      });

      if (payload.step1.dynamicFields.length) {
        await tx.experimentCustomField.createMany({
          data: payload.step1.dynamicFields.map((field, index) => ({
            experimentId: payload.experimentId,
            fieldName: field.name,
            fieldValue: field.value,
            sortOrder: index + 1
          }))
        });
      }

      if (resolvedStep2.length) {
        await tx.experimentDataItem.createMany({
          data: resolvedStep2.map((item, index) => ({
            experimentId: payload.experimentId,
            itemName: item.itemName,
            itemValue: item.itemValue,
            itemUnit: item.itemUnit || null,
            sourceFileName: item.sourceFileName || null,
            sourceFilePath: item.sourceFilePath || null,
            originalFileName: item.originalFileName || null,
            originalFilePath: item.originalFilePath || null,
            rowOrder: index + 1
          }))
        });
      }

      if (normalizedTemplateBlocks.length) {
        await tx.experimentTemplateBlock.createMany({
          data: normalizedTemplateBlocks.map((block, index) => ({
            experimentId: payload.experimentId,
            templateType: block.templateType,
            blockTitle: block.blockTitle,
            blockOrder: index + 1,
            metaJson: serializeTemplateBlockMeta(block),
            dataJson: JSON.stringify(block.points),
            sourceFileName: block.sourceFileName || null,
            sourceFilePath: block.sourceFilePath || null,
            originalFileName: block.originalFileName || null,
            originalFilePath: block.originalFilePath || null
          }))
        });
      }
    });
  } catch (error) {
    for (const rollback of rollbackActions) {
      try {
        rollback();
      } catch (rollbackError) {
        console.error('rollbackUpdatedSavedFileAfterDbFailure failed:', {
          experimentId: payload.experimentId,
          rollbackError
        });
      }
    }

    throw error;
  }

  try {
    for (const finalize of finalizeActions) {
      finalize();
    }
  } catch (error) {
    console.error('cleanupReplacedSavedFile failed:', {
      experimentId: payload.experimentId,
      error
    });

    return {
      success: true,
      warning: '实验记录已更新，但旧的保存文件清理失败，可能需要手动处理'
    };
  }

  try {
    await prisma.editLog.create({
      data: {
        experimentId: payload.experimentId,
        editor: payload.editor,
        editReason: payload.editReason,
        editedFieldsJson: JSON.stringify({
          before: oldSnapshot,
          after: newSnapshot,
          ...(fileOperations.length ? { fileOperations } : {})
        })
      }
    });
  } catch (error) {
    console.error('createEditLogAfterSuccessfulUpdate failed:', {
      experimentId: payload.experimentId,
      error
    });
  }

  return { success: true };
}
