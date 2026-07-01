import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  CrossFilterChip,
  CrossFilterField,
  CrossFilterOperator,
  DatabaseWorkspaceState,
  DeleteSavedDatabaseViewPayload,
  ExperimentListSortOrder,
  FrequentDatabaseFilter,
  GroupByType,
  RecordDatabaseWorkspaceUsagePayload,
  RenameSavedDatabaseViewPayload,
  SaveDatabaseViewPayload,
  SaveDatabaseViewResult,
  SavedDatabaseView,
  ToggleStarredExperimentPayload,
  ToggleStarredExperimentResult
} from '../electron-api';
import { getSettingValue, upsertSetting } from './auth-settings';

const SAVED_DATABASE_VIEWS_SETTING_KEY = 'databaseWorkspace:savedViewsV1';
const FREQUENT_DATABASE_FILTERS_SETTING_KEY = 'databaseWorkspace:frequentFiltersV1';
const STARRED_EXPERIMENT_IDS_SETTING_KEY = 'databaseWorkspace:starredExperimentIdsV1';
const VALID_GROUP_BY_VALUES = new Set<GroupByType>([
  'sampleCode',
  'testProject',
  'testTime',
  'instrument',
  'tester',
  'sampleOwner'
]);
const VALID_SORT_ORDER_VALUES = new Set<ExperimentListSortOrder>(['newest', 'oldest']);
const VALID_CROSS_FILTER_FIELDS = new Set<CrossFilterField>([
  'sampleCode',
  'testTime',
  'testProject',
  'tester',
  'instrument',
  'sampleOwner',
  'conditionName',
  'conditionValue',
  'metricName',
  'metricValue',
  'secondaryName',
  'secondaryValue',
  'structuredBlockName'
]);
const VALID_CROSS_FILTER_OPERATORS = new Set<CrossFilterOperator>([
  'eq',
  'gte',
  'lte',
  'between'
]);

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text || undefined;
}

function normalizeGroupBy(value: unknown): GroupByType {
  return VALID_GROUP_BY_VALUES.has(value as GroupByType)
    ? (value as GroupByType)
    : 'sampleCode';
}

function normalizeSortOrder(value: unknown): ExperimentListSortOrder {
  return VALID_SORT_ORDER_VALUES.has(value as ExperimentListSortOrder)
    ? (value as ExperimentListSortOrder)
    : 'newest';
}

function normalizeCrossFilterOperator(value: unknown) {
  return VALID_CROSS_FILTER_OPERATORS.has(value as CrossFilterOperator)
    ? (value as CrossFilterOperator)
    : undefined;
}

function normalizeCrossFilterChip(value: unknown): CrossFilterChip | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const chip = value as Record<string, unknown>;
  const field = normalizeText(chip.field);
  const normalizedValue = normalizeText(chip.value);

  if (!VALID_CROSS_FILTER_FIELDS.has(field as CrossFilterField) || !normalizedValue) {
    return null;
  }

  return {
    id: normalizeText(chip.id) || randomUUID(),
    field: field as CrossFilterField,
    operator: normalizeCrossFilterOperator(chip.operator),
    value: normalizedValue,
    value2: normalizeOptionalText(chip.value2)
  };
}

function normalizeSavedDatabaseView(value: unknown): SavedDatabaseView | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const view = value as Record<string, unknown>;
  const id = normalizeText(view.id) || randomUUID();
  const name = normalizeText(view.name);

  if (!name) {
    return null;
  }

  const createdAt = normalizeText(view.createdAt) || new Date().toISOString();
  const updatedAt = normalizeText(view.updatedAt) || new Date().toISOString();

  return {
    id,
    name,
    query: normalizeText(view.query),
    groupBy: normalizeGroupBy(view.groupBy),
    sortOrder: normalizeSortOrder(view.sortOrder),
    starredOnly: Boolean(view.starredOnly),
    crossFilters: Array.isArray(view.crossFilters)
      ? view.crossFilters
          .map((chip) => normalizeCrossFilterChip(chip))
          .filter((chip): chip is CrossFilterChip => Boolean(chip))
      : [],
    createdAt,
    updatedAt
  };
}

function normalizeSavedDatabaseViews(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((view) => normalizeSavedDatabaseView(view))
    .filter((view): view is SavedDatabaseView => Boolean(view))
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt);
      const rightTime = Date.parse(right.updatedAt);
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    });
}

function normalizeFrequentDatabaseFilter(value: unknown): FrequentDatabaseFilter | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  const id = normalizeText(item.id) || randomUUID();
  const createdAt = normalizeText(item.createdAt) || new Date().toISOString();
  const lastUsedAt = normalizeText(item.lastUsedAt) || createdAt;
  const useCount = Math.max(1, Number(item.useCount) || 1);

  return {
    id,
    query: normalizeText(item.query),
    groupBy: normalizeGroupBy(item.groupBy),
    sortOrder: normalizeSortOrder(item.sortOrder),
    starredOnly: Boolean(item.starredOnly),
    crossFilters: Array.isArray(item.crossFilters)
      ? item.crossFilters
          .map((chip) => normalizeCrossFilterChip(chip))
          .filter((chip): chip is CrossFilterChip => Boolean(chip))
      : [],
    useCount,
    createdAt,
    lastUsedAt
  };
}

function normalizeFrequentDatabaseFilters(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeFrequentDatabaseFilter(item))
    .filter((item): item is FrequentDatabaseFilter => Boolean(item))
    .sort((left, right) => {
      if (right.useCount !== left.useCount) {
        return right.useCount - left.useCount;
      }

      const leftTime = Date.parse(left.lastUsedAt);
      const rightTime = Date.parse(right.lastUsedAt);
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    });
}

function normalizeStarredExperimentIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  ).sort((left, right) => left - right);
}

async function getSavedDatabaseViews(prisma: PrismaClient) {
  const savedValue = await getSettingValue(prisma, SAVED_DATABASE_VIEWS_SETTING_KEY, '');
  if (!savedValue.trim()) {
    return [];
  }

  try {
    return normalizeSavedDatabaseViews(JSON.parse(savedValue));
  } catch (error) {
    console.error('parse saved database views failed:', error);
    return [];
  }
}

async function saveSavedDatabaseViews(prisma: PrismaClient, views: SavedDatabaseView[]) {
  await upsertSetting(
    prisma,
    SAVED_DATABASE_VIEWS_SETTING_KEY,
    JSON.stringify(normalizeSavedDatabaseViews(views))
  );
}

async function getFrequentDatabaseFilters(prisma: PrismaClient) {
  const savedValue = await getSettingValue(prisma, FREQUENT_DATABASE_FILTERS_SETTING_KEY, '');
  if (!savedValue.trim()) {
    return [];
  }

  try {
    return normalizeFrequentDatabaseFilters(JSON.parse(savedValue));
  } catch (error) {
    console.error('parse frequent database filters failed:', error);
    return [];
  }
}

async function saveFrequentDatabaseFilters(prisma: PrismaClient, filters: FrequentDatabaseFilter[]) {
  await upsertSetting(
    prisma,
    FREQUENT_DATABASE_FILTERS_SETTING_KEY,
    JSON.stringify(normalizeFrequentDatabaseFilters(filters).slice(0, 12))
  );
}

export async function getStarredExperimentIds(prisma: PrismaClient) {
  const savedValue = await getSettingValue(prisma, STARRED_EXPERIMENT_IDS_SETTING_KEY, '');
  if (!savedValue.trim()) {
    return [];
  }

  try {
    return normalizeStarredExperimentIds(JSON.parse(savedValue));
  } catch (error) {
    console.error('parse starred experiment ids failed:', error);
    return [];
  }
}

async function saveStarredExperimentIds(prisma: PrismaClient, experimentIds: number[]) {
  await upsertSetting(
    prisma,
    STARRED_EXPERIMENT_IDS_SETTING_KEY,
    JSON.stringify(normalizeStarredExperimentIds(experimentIds))
  );
}

export async function getDatabaseWorkspaceState(
  prisma: PrismaClient
): Promise<DatabaseWorkspaceState> {
  const [savedViews, frequentFilters, starredExperimentIds] = await Promise.all([
    getSavedDatabaseViews(prisma),
    getFrequentDatabaseFilters(prisma),
    getStarredExperimentIds(prisma)
  ]);

  return {
    savedViews,
    frequentFilters,
    starredExperimentIds
  };
}

function buildFrequentFilterSignature(payload: {
  query: string;
  groupBy: GroupByType;
  sortOrder: ExperimentListSortOrder;
  starredOnly: boolean;
  crossFilters: CrossFilterChip[];
}) {
  return JSON.stringify({
    query: payload.query,
    groupBy: payload.groupBy,
    sortOrder: payload.sortOrder,
    starredOnly: payload.starredOnly,
    crossFilters: payload.crossFilters.map((chip) => ({
      field: chip.field,
      operator: chip.operator || 'eq',
      value: chip.value,
      value2: chip.value2 || ''
    }))
  });
}

export async function recordDatabaseWorkspaceUsage(
  prisma: PrismaClient,
  payload: RecordDatabaseWorkspaceUsagePayload
): Promise<ActionResult> {
  const normalizedPayload = {
    query: normalizeText(payload.query),
    groupBy: normalizeGroupBy(payload.groupBy),
    sortOrder: normalizeSortOrder(payload.sortOrder),
    starredOnly: Boolean(payload.starredOnly),
    crossFilters: Array.isArray(payload.crossFilters)
      ? payload.crossFilters
          .map((chip) => normalizeCrossFilterChip(chip))
          .filter((chip): chip is CrossFilterChip => Boolean(chip))
      : []
  };

  const isDefaultState =
    !normalizedPayload.query &&
    normalizedPayload.groupBy === 'sampleCode' &&
    normalizedPayload.sortOrder === 'newest' &&
    !normalizedPayload.starredOnly &&
    !normalizedPayload.crossFilters.length;

  const hasMeaningfulSearchOrFilters = Boolean(
    normalizedPayload.query || normalizedPayload.crossFilters.length
  );

  if (isDefaultState || !hasMeaningfulSearchOrFilters) {
    return { success: true };
  }

  const existingFilters = await getFrequentDatabaseFilters(prisma);
  const signature = buildFrequentFilterSignature(normalizedPayload);
  const now = new Date().toISOString();

  const targetIndex = existingFilters.findIndex(
    (item) =>
      buildFrequentFilterSignature({
        query: item.query,
        groupBy: item.groupBy,
        sortOrder: item.sortOrder,
        starredOnly: item.starredOnly,
        crossFilters: item.crossFilters
      }) === signature
  );

  const nextFilters = [...existingFilters];

  if (targetIndex >= 0) {
    const current = nextFilters[targetIndex];
    nextFilters[targetIndex] = {
      ...current,
      useCount: current.useCount + 1,
      lastUsedAt: now
    };
  } else {
    nextFilters.unshift({
      id: randomUUID(),
      ...normalizedPayload,
      useCount: 1,
      createdAt: now,
      lastUsedAt: now
    });
  }

  await saveFrequentDatabaseFilters(prisma, nextFilters);
  return { success: true };
}

export async function saveDatabaseView(
  prisma: PrismaClient,
  payload: SaveDatabaseViewPayload
): Promise<SaveDatabaseViewResult> {
  const name = normalizeText(payload.name);
  if (!name) {
    return { success: false, error: '请填写视图名称' };
  }

  const existingViews = await getSavedDatabaseViews(prisma);
  const duplicate = existingViews.find(
    (view) => view.id !== payload.id && view.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { success: false, error: '已存在同名视图，请修改后重试' };
  }

  const existingView = payload.id
    ? existingViews.find((view) => view.id === payload.id)
    : null;
  const now = new Date().toISOString();
  const nextView: SavedDatabaseView = {
    id: existingView?.id || randomUUID(),
    name,
    query: normalizeText(payload.query),
    groupBy: normalizeGroupBy(payload.groupBy),
    sortOrder: normalizeSortOrder(payload.sortOrder),
    starredOnly: Boolean(payload.starredOnly),
    crossFilters: Array.isArray(payload.crossFilters)
      ? payload.crossFilters
          .map((chip) => normalizeCrossFilterChip(chip))
          .filter((chip): chip is CrossFilterChip => Boolean(chip))
      : [],
    createdAt: existingView?.createdAt || now,
    updatedAt: now
  };

  const nextViews = existingView
    ? existingViews.map((view) => (view.id === existingView.id ? nextView : view))
    : [nextView, ...existingViews];

  await saveSavedDatabaseViews(prisma, nextViews);
  return { success: true, view: nextView };
}

export async function renameSavedDatabaseView(
  prisma: PrismaClient,
  payload: RenameSavedDatabaseViewPayload
): Promise<ActionResult> {
  const name = normalizeText(payload.name);
  if (!name) {
    return { success: false, error: '请填写视图名称' };
  }

  const existingViews = await getSavedDatabaseViews(prisma);
  const targetView = existingViews.find((view) => view.id === payload.id);
  if (!targetView) {
    return { success: false, error: '未找到要重命名的视图' };
  }

  const duplicate = existingViews.find(
    (view) => view.id !== payload.id && view.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { success: false, error: '已存在同名视图，请修改后重试' };
  }

  await saveSavedDatabaseViews(
    prisma,
    existingViews.map((view) =>
      view.id === payload.id
        ? {
            ...view,
            name,
            updatedAt: new Date().toISOString()
          }
        : view
    )
  );

  return { success: true };
}

export async function deleteSavedDatabaseView(
  prisma: PrismaClient,
  payload: DeleteSavedDatabaseViewPayload
): Promise<ActionResult> {
  const existingViews = await getSavedDatabaseViews(prisma);
  const targetView = existingViews.find((view) => view.id === payload.id);
  if (!targetView) {
    return { success: false, error: '未找到要删除的视图' };
  }

  await saveSavedDatabaseViews(
    prisma,
    existingViews.filter((view) => view.id !== payload.id)
  );
  return { success: true };
}

export async function toggleStarredExperiment(
  prisma: PrismaClient,
  payload: ToggleStarredExperimentPayload
): Promise<ToggleStarredExperimentResult> {
  const experimentId = Number(payload.experimentId);
  if (!Number.isInteger(experimentId) || experimentId <= 0) {
    return { success: false, error: '无效的实验记录编号' };
  }

  const starredExperimentIds = await getStarredExperimentIds(prisma);
  const currentlyStarred = starredExperimentIds.includes(experimentId);
  const nextExperimentIds = currentlyStarred
    ? starredExperimentIds.filter((id) => id !== experimentId)
    : [...starredExperimentIds, experimentId];

  await saveStarredExperimentIds(prisma, nextExperimentIds);
  return {
    success: true,
    starred: !currentlyStarred
  };
}
