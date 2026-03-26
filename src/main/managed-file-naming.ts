import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { ManagedSectionLabel } from '../electron-api';
import { sanitizeFileNamePart } from './file-helpers';
import { getManagedTargetConflictError } from './managed-file-conflicts';

export type ManagedFileNamingContext = {
  sourcePath: string;
  storageRoot: string;
  testProject: string;
  sampleCode: string;
  displayName: string;
  sectionLabel: ManagedSectionLabel;
  secondaryItemName: string;
};

type ManagedFileTargetBase = {
  targetDir: string;
  fileName: string;
  fullPath: string;
};

export type ManagedFileTargetResolution = ManagedFileTargetBase & {
  slotIndex: number;
  indexed: boolean;
};

type ResolveManagedFileTargetOptions = ManagedFileNamingContext & {
  prisma: PrismaClient;
  currentSourcePath?: string;
  excludeDataItemId?: number;
  excludeTemplateBlockId?: number;
  preferredSlotIndex?: number;
  preserveSlot?: boolean;
  reservedTargetSlots?: Set<string>;
};

function sanitizeManagedFileSegment(value: string, fallback: string) {
  const trimmed = value.trim();
  const sanitized = (trimmed || fallback)
    .split('')
    .map((char) => {
      const charCode = char.charCodeAt(0);

      if ('<>:"/\\|?*'.includes(char) || (charCode >= 0 && charCode <= 31)) {
        return '_';
      }

      return char;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || fallback;
}

function buildManagedFileTargetBase(
  context: ManagedFileNamingContext,
  slotIndex: number
): ManagedFileTargetBase {
  const projectDir = sanitizeFileNamePart(context.testProject || '未分类项目');
  const sampleDir = sanitizeFileNamePart(context.sampleCode || '未分类样品');
  const targetDir = path.join(context.storageRoot, projectDir, sampleDir);
  const ext = path.extname(context.sourcePath);
  const baseName = [
    sanitizeManagedFileSegment(context.displayName, '未命名数据'),
    sanitizeManagedFileSegment(context.sectionLabel, '未分类'),
    sanitizeManagedFileSegment(context.secondaryItemName, '未命名条目')
  ].join('-');
  const slotSuffix = slotIndex > 0 ? `-${String(slotIndex).padStart(2, '0')}` : '';
  const fileName = `${baseName}${slotSuffix}${ext}`;
  const fullPath = path.join(targetDir, fileName);

  return {
    targetDir,
    fileName,
    fullPath
  };
}

function buildManagedSlotKey(candidate: ManagedFileTargetBase) {
  return `${candidate.targetDir}::${path.parse(candidate.fileName).name}`;
}

async function hasReservedManagedSlotConflict(
  prisma: PrismaClient,
  candidate: ManagedFileTargetBase,
  options: {
    currentSourcePath?: string;
    excludeDataItemId?: number;
    excludeTemplateBlockId?: number;
  }
) {
  const candidateSlotKey = buildManagedSlotKey(candidate);
  const currentSlotKey = options.currentSourcePath
    ? buildManagedSlotKey({
        targetDir: path.dirname(options.currentSourcePath),
        fileName: path.basename(options.currentSourcePath),
        fullPath: options.currentSourcePath
      })
    : '';

  if (candidateSlotKey === currentSlotKey) {
    return false;
  }

  const targetDirPrefix = `${candidate.targetDir}${path.sep}`;
  const [dataItems, templateBlocks] = await Promise.all([
    prisma.experimentDataItem.findMany({
      where: {
        sourceFilePath: {
          startsWith: targetDirPrefix
        },
        ...(options.excludeDataItemId ? { NOT: { id: options.excludeDataItemId } } : {})
      },
      select: {
        sourceFilePath: true
      }
    }),
    prisma.experimentTemplateBlock.findMany({
      where: {
        sourceFilePath: {
          startsWith: targetDirPrefix
        },
        ...(options.excludeTemplateBlockId ? { NOT: { id: options.excludeTemplateBlockId } } : {})
      },
      select: {
        sourceFilePath: true
      }
    })
  ]);

  const hasReferencedConflict = [...dataItems, ...templateBlocks].some((entry) => {
    const sourceFilePath = entry.sourceFilePath || '';
    if (!sourceFilePath || sourceFilePath === options.currentSourcePath) {
      return false;
    }

    return buildManagedSlotKey({
      targetDir: path.dirname(sourceFilePath),
      fileName: path.basename(sourceFilePath),
      fullPath: sourceFilePath
    }) === candidateSlotKey;
  });

  if (hasReferencedConflict) {
    return true;
  }

  if (!fs.existsSync(candidate.targetDir)) {
    return false;
  }

  return fs.readdirSync(candidate.targetDir).some((entryName) => {
    const entryPath = path.join(candidate.targetDir, entryName);
    if (entryPath === options.currentSourcePath) {
      return false;
    }

    return buildManagedSlotKey({
      targetDir: candidate.targetDir,
      fileName: entryName,
      fullPath: entryPath
    }) === candidateSlotKey;
  });
}

export function parseManagedFileSlotIndex(filePath: string) {
  const baseName = path.parse(filePath).name;
  const match = baseName.match(/-(\d{2})$/);

  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIndexedManagedFileWarning(
  sectionLabel: ManagedSectionLabel,
  secondaryItemName: string
) {
  const itemLabel = sanitizeManagedFileSegment(secondaryItemName, '未命名条目');
  return `${sectionLabel}「${itemLabel}」已有相关文件，新文件将使用编号命名。`;
}

export async function resolveManagedFileTarget(
  options: ResolveManagedFileTargetOptions
): Promise<ManagedFileTargetResolution> {
  const {
    prisma,
    currentSourcePath,
    excludeDataItemId,
    excludeTemplateBlockId,
    preferredSlotIndex = 0,
    preserveSlot = false,
    reservedTargetSlots
  } = options;

  const checkCandidate = async (slotIndex: number) => {
    const candidate = buildManagedFileTargetBase(options, slotIndex);
    const reservationKey = buildManagedSlotKey(candidate);
    const reservedConflict = reservedTargetSlots?.has(reservationKey);

    if (reservedConflict) {
      return {
        candidate,
        conflictError: '保存文件名与当前编辑中的其他文件冲突，请调整后重试'
      };
    }

    const slotConflict = await hasReservedManagedSlotConflict(prisma, candidate, {
      currentSourcePath,
      excludeDataItemId,
      excludeTemplateBlockId
    });

    if (slotConflict) {
      return {
        candidate,
        conflictError: '保存文件名与其他实验记录冲突，请调整后重试'
      };
    }

    const conflictError = await getManagedTargetConflictError(prisma, candidate.fullPath, {
      excludeDataItemId,
      excludeTemplateBlockId,
      currentSourcePath
    });

    return {
      candidate,
      conflictError
    };
  };

  if (preserveSlot) {
    const { candidate, conflictError } = await checkCandidate(preferredSlotIndex);

    if (conflictError) {
      throw new Error(conflictError);
    }

    reservedTargetSlots?.add(buildManagedSlotKey(candidate));

    return {
      ...candidate,
      slotIndex: preferredSlotIndex,
      indexed: preferredSlotIndex > 0
    };
  }

  for (let slotIndex = 0; slotIndex < 1000; slotIndex += 1) {
    const { candidate, conflictError } = await checkCandidate(slotIndex);

    if (conflictError) {
      continue;
    }

    reservedTargetSlots?.add(buildManagedSlotKey(candidate));

    return {
      ...candidate,
      slotIndex,
      indexed: slotIndex > 0
    };
  }

  throw new Error('未能为保存文件分配可用名称，请调整后重试');
}
