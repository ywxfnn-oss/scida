import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  ManagedSectionLabel,
  UpdateExperimentDataItemPayload,
  UpdateExperimentPayload,
  ScalarItemRole
} from '../electron-api';
import { getSettingValue } from './auth-settings';
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
import { resolveManagedTemplateBlockFiles } from './template-block-file-helpers';
import { serializeTemplateBlockMeta } from '../template-blocks';

type UpdateFilePlan = {
  index: number;
  dataItemId?: number;
  currentSourcePath: string;
  targetPath: string;
  targetFileName: string;
  replacementSourcePath: string;
  replacementOriginalName: string;
  action: 'replace' | 'create';
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
    scalarRole: string | null;
    itemName: string;
    itemValue: string;
    itemUnit: string | null;
    sourceFileName: string | null;
    sourceFilePath: string | null;
    originalFileName: string | null;
    originalFilePath: string | null;
    rowOrder: number;
  }>;
};

type OldDataItemRecord = {
  sourceFilePath: string | null;
};

function getScalarSectionLabel(role?: ScalarItemRole): ManagedSectionLabel {
  return role === 'condition' ? '实验条件' : '结果指标';
}

function normalizeScalarRole(role?: string | null): ScalarItemRole | null {
  return role === 'condition' || role === 'metric' ? role : null;
}

function buildWarningMessage(warnings: Set<string>) {
  return warnings.size ? Array.from(warnings).join('\n') : '';
}

function normalizeStep2Items(payload: UpdateExperimentPayload) {
  return payload.step2.map((item) => ({
    ...item,
    scalarRole: normalizeScalarRole(item.scalarRole) || 'metric',
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
      scalarRole: normalizeScalarRole(item.scalarRole),
      itemName: item.itemName,
      itemValue: item.itemValue,
      itemUnit: item.itemUnit,
      sourceFileName: item.sourceFileName,
      sourceFilePath: item.sourceFilePath,
      originalFileName: item.originalFileName,
      originalFilePath: item.originalFilePath,
      rowOrder: item.rowOrder
    }))
  };
}

function buildNewSnapshot(
  payload: UpdateExperimentPayload,
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
      scalarRole: normalizeScalarRole(item.scalarRole),
      itemName: item.itemName,
      itemValue: item.itemValue,
      itemUnit: item.itemUnit || null,
      sourceFileName: item.sourceFileName || null,
      sourceFilePath: item.sourceFilePath || null,
      originalFileName: item.originalFileName || null,
      originalFilePath: item.originalFilePath || null,
      rowOrder: index + 1
    }))
  };
}

async function buildUpdateFilePlans(
  prisma: PrismaClient,
  payload: UpdateExperimentPayload,
  storageRoot: string,
  oldDataItemMap: Map<number, OldDataItemRecord>
) {
  const plannedTargetSlots = new Set<string>();
  const filePlans: UpdateFilePlan[] = [];
  const warnings = new Set<string>();

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

    if (!hasReplacement) {
      continue;
    }

    if (!fileExists(replacementSourcePath)) {
      return {
        error: '新选择的原始文件不存在或路径无效',
        filePlans: [],
        warning: buildWarningMessage(warnings)
      };
    }

    try {
      const target = await resolveManagedFileTarget({
        prisma,
        storageRoot,
        sourcePath: replacementSourcePath,
        testProject: payload.step1.testProject,
        sampleCode: payload.step1.sampleCode,
        displayName: payload.displayName,
        sectionLabel: getScalarSectionLabel(item.scalarRole),
        secondaryItemName: item.itemName,
        currentSourcePath,
        excludeDataItemId: item.dataItemId,
        preferredSlotIndex: hasManagedFile
          ? parseManagedFileSlotIndex(currentSourcePath)
          : 0,
        preserveSlot: hasManagedFile,
        reservedTargetSlots: plannedTargetSlots
      });

      if (!hasManagedFile && target.indexed) {
        warnings.add(
          formatIndexedManagedFileWarning(
            getScalarSectionLabel(item.scalarRole),
            item.itemName
          )
        );
      }

      filePlans.push({
        index,
        dataItemId: item.dataItemId,
        currentSourcePath,
        targetPath: target.fullPath,
        targetFileName: target.fileName,
        replacementSourcePath,
        replacementOriginalName,
        action: hasManagedFile ? 'replace' : 'create'
      });
    } catch (error) {
      return {
        error:
          error instanceof Error && error.message
            ? error.message
            : '处理二级数据项原始文件失败，请检查文件状态后重试',
        filePlans: [],
        warning: buildWarningMessage(warnings)
      };
    }
  }

  return {
    error: '',
    filePlans,
    warning: buildWarningMessage(warnings)
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
      dataItems: { orderBy: { rowOrder: 'asc' } }
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
  const {
    error: filePlanError,
    filePlans,
    warning: filePlanWarning
  } = await buildUpdateFilePlans(
    prisma,
    payload,
    storageRoot,
    oldDataItemMap
  );

  if (filePlanError) {
    return { success: false, error: filePlanError };
  }

  const resolvedStep2 = normalizeStep2Items(payload);
  let resolvedTemplateBlocks = payload.templateBlocks.map((block) => ({ ...block }));
  let rollbackActions: Array<() => void> = [];
  let finalizeActions: Array<() => void> = [];
  let templateBlockWarning = '';

  try {
    const filePlanResult = applyFilePlans(payload, filePlans, resolvedStep2);
    rollbackActions = filePlanResult.rollbackActions;
    finalizeActions = filePlanResult.finalizeActions;

    if (filePlanResult.error) {
      return { success: false, error: filePlanResult.error };
    }

    const templateBlockResult = await resolveManagedTemplateBlockFiles(
      {
        prisma,
        storageRoot,
        step1: {
          ...payload.step1,
          displayName: payload.displayName
        },
        templateBlocks: payload.templateBlocks
      },
      { experimentId: payload.experimentId }
    );

    rollbackActions = [...templateBlockResult.rollbackActions, ...rollbackActions];
    finalizeActions = [...finalizeActions, ...templateBlockResult.finalizeActions];
    resolvedTemplateBlocks = templateBlockResult.resolvedTemplateBlocks;
    templateBlockWarning = templateBlockResult.warning || '';

    if (templateBlockResult.error) {
      for (const rollback of rollbackActions) {
        try {
          rollback();
        } catch (rollbackError) {
          console.error('rollbackUpdatedSavedFileAfterTemplateBlockFailure failed:', {
            experimentId: payload.experimentId,
            rollbackError
          });
        }
      }

      return { success: false, error: templateBlockResult.error };
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
            scalarRole: normalizeScalarRole(item.scalarRole) || 'metric',
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

      await tx.experimentTemplateBlock.deleteMany({
        where: { experimentId: payload.experimentId }
      });

      if (resolvedTemplateBlocks.length) {
        await tx.experimentTemplateBlock.createMany({
          data: resolvedTemplateBlocks.map((block, index) => ({
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

      const newSnapshot = buildNewSnapshot(payload, resolvedStep2);

      await tx.editLog.create({
        data: {
          experimentId: payload.experimentId,
          editor: payload.editor,
          editReason: payload.editReason,
          editedFieldsJson: JSON.stringify({
            before: oldSnapshot,
            after: newSnapshot
          })
        }
      });
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
      success: false,
      error: '实验记录已更新，但旧的保存文件清理失败，可能需要手动处理'
    };
  }

  const warning = [filePlanWarning, templateBlockWarning].filter(Boolean).join('\n');
  return warning ? { success: true, warning } : { success: true };
}
