import type { PrismaClient } from '@prisma/client';
import type {
  ExperimentEditHistoryEntry,
  ListExperimentEditLogsPayload
} from '../electron-api';

const DEFAULT_EDIT_LOG_LIMIT = 5;
const MAX_EDIT_LOG_LIMIT = 10;

const EDIT_FIELD_LABELS: Record<string, string> = {
  testProject: '测试项目',
  sampleCode: '样品编号',
  tester: '测试人',
  instrument: '测试仪器',
  testTime: '测试时间',
  sampleOwner: '样品所属人员',
  displayName: '记录名称（自动生成）',
  customFields: '动态字段',
  dataItems: '二级数据项',
  templateBlocks: '模板块'
};

function clampEditLogLimit(limit?: number) {
  if (!limit) {
    return DEFAULT_EDIT_LOG_LIMIT;
  }

  return Math.min(Math.max(limit, 1), MAX_EDIT_LOG_LIMIT);
}

function parseEditedFieldsJson(editedFieldsJson: string) {
  try {
    const parsed = JSON.parse(editedFieldsJson) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getChangedFieldNames(parsed: Record<string, unknown>) {
  const before =
    parsed.before && typeof parsed.before === 'object'
      ? (parsed.before as Record<string, unknown>)
      : null;
  const after =
    parsed.after && typeof parsed.after === 'object'
      ? (parsed.after as Record<string, unknown>)
      : null;

  if (!before || !after) {
    return [];
  }

  return Object.entries(EDIT_FIELD_LABELS)
    .filter(([fieldName]) => JSON.stringify(before[fieldName]) !== JSON.stringify(after[fieldName]))
    .map(([, label]) => label);
}

function formatChangedFieldsSummary(changedFieldNames: string[]) {
  if (!changedFieldNames.length) {
    return '';
  }

  const visibleNames = changedFieldNames.slice(0, 5).join('、');

  if (changedFieldNames.length <= 5) {
    return `修改字段：${visibleNames}`;
  }

  return `修改字段：${visibleNames} 等 ${changedFieldNames.length} 项`;
}

function formatFileOperationSummary(parsed: Record<string, unknown>) {
  const fileOperations = Array.isArray(parsed.fileOperations) ? parsed.fileOperations : [];

  if (!fileOperations.length) {
    return '';
  }

  return `文件操作 ${fileOperations.length} 项`;
}

function formatEditSummary(editedFieldsJson: string) {
  const parsed = parseEditedFieldsJson(editedFieldsJson);

  if (!parsed) {
    return '修改内容记录不可解析';
  }

  const parts = [
    formatChangedFieldsSummary(getChangedFieldNames(parsed)),
    formatFileOperationSummary(parsed)
  ].filter(Boolean);

  return parts.length ? parts.join('；') : '修改记录';
}

export async function listExperimentEditLogs(
  prisma: PrismaClient,
  payload: ListExperimentEditLogsPayload
): Promise<ExperimentEditHistoryEntry[]> {
  const limit = clampEditLogLimit(payload.limit);

  const rows = await prisma.editLog.findMany({
    where: {
      experimentId: payload.experimentId
    },
    orderBy: [
      { editedAt: 'desc' },
      { id: 'desc' }
    ],
    take: limit
  });

  return rows.map((row) => ({
    id: row.id,
    editedAt: row.editedAt.toISOString(),
    editor: row.editor,
    editReason: row.editReason,
    summaryText: formatEditSummary(row.editedFieldsJson)
  }));
}
