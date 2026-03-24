import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type {
  ListRecentOperationLogsPayload,
  OperationLogFilter,
  RecentOperationLogEntry
} from '../electron-api';
import { getSettingValue } from './auth-settings';

const DEFAULT_OPERATION_ACTOR = 'admin';
const DEFAULT_RECENT_OPERATION_LOG_LIMIT = 30;
const MAX_RECENT_OPERATION_LOG_LIMIT = 50;

type OperationLogPayload = {
  operationType: string;
  experimentId?: number | null;
  actor?: string | null;
  summary: string;
};

export async function getOperationActor(prisma: PrismaClient) {
  return getSettingValue(prisma, 'loginUsername', DEFAULT_OPERATION_ACTOR);
}

export async function writeOperationLog(
  prisma: PrismaClient,
  payload: OperationLogPayload
) {
  return prisma.operationLog.create({
    data: {
      operationType: payload.operationType,
      experimentId: payload.experimentId ?? null,
      actor: payload.actor ?? null,
      summary: payload.summary
    }
  });
}

function clampRecentOperationLogLimit(limit?: number) {
  if (!limit) {
    return DEFAULT_RECENT_OPERATION_LOG_LIMIT;
  }

  return Math.min(Math.max(limit, 1), MAX_RECENT_OPERATION_LOG_LIMIT);
}

function getOperationLogWhere(filter: OperationLogFilter) {
  if (filter === 'delete') {
    return {
      operationType: 'experiment_delete'
    };
  }

  if (filter === 'export') {
    return {
      operationType: {
        in: ['export_full', 'export_item_compare', 'export_xy_compare']
      }
    };
  }

  return undefined;
}

function parseOperationSummary(summary: string) {
  try {
    const parsed = JSON.parse(summary) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function readStringValue(
  summary: Record<string, unknown>,
  key: string
) {
  const value = summary[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function readNumberValue(
  summary: Record<string, unknown>,
  key: string
) {
  const value = summary[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatDeleteSummary(summary: Record<string, unknown>) {
  const displayName = readStringValue(summary, 'displayName');
  const deletedManagedFileCount = readNumberValue(summary, 'deletedManagedFileCount');
  const experimentId = readNumberValue(summary, 'experimentId');

  const parts = ['删除实验记录'];

  if (displayName) {
    parts.push(displayName);
  } else if (experimentId !== null) {
    parts.push(`#${experimentId}`);
  }

  if (deletedManagedFileCount !== null) {
    parts.push(`托管文件 ${deletedManagedFileCount} 个`);
  }

  return parts.join('，');
}

function formatExportSummary(
  operationType: string,
  summary: Record<string, unknown>
) {
  const experimentCount = readNumberValue(summary, 'experimentCount');
  const exportPath = readStringValue(summary, 'exportPath');
  const compressed = summary.compressed === true;
  const itemNames = Array.isArray(summary.itemNames)
    ? summary.itemNames.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const blockTitle = readStringValue(summary, 'blockTitle');

  const parts = [
    operationType === 'export_item_compare'
      ? '按二级数据项导出'
      : operationType === 'export_xy_compare'
        ? 'XY 导出'
        : '完整导出'
  ];

  if (experimentCount !== null) {
    parts.push(`${experimentCount} 条实验记录`);
  }

  if (itemNames.length) {
    parts.push(`数据项：${itemNames.slice(0, 3).join('、')}`);
  }

  if (blockTitle) {
    parts.push(`模板块：${blockTitle}`);
  }

  if (exportPath) {
    parts.push(`输出：${path.basename(exportPath)}`);
  }

  parts.push(compressed ? '已压缩' : '未压缩');

  return parts.join('，');
}

function formatOperationSummary(
  operationType: string,
  summary: string
) {
  const parsed = parseOperationSummary(summary);

  if (!parsed) {
    return summary;
  }

  if (operationType === 'experiment_delete') {
    return formatDeleteSummary(parsed);
  }

  if (
    operationType === 'export_full' ||
    operationType === 'export_item_compare' ||
    operationType === 'export_xy_compare'
  ) {
    return formatExportSummary(operationType, parsed);
  }

  return summary;
}

export async function listRecentOperationLogs(
  prisma: PrismaClient,
  payload?: ListRecentOperationLogsPayload
): Promise<RecentOperationLogEntry[]> {
  const filter = payload?.filter || 'all';
  const limit = clampRecentOperationLogLimit(payload?.limit);

  const rows = await prisma.operationLog.findMany({
    where: getOperationLogWhere(filter),
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ],
    take: limit
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    operationType: row.operationType,
    experimentId: row.experimentId,
    actor: row.actor,
    summaryText: formatOperationSummary(row.operationType, row.summary)
  }));
}
