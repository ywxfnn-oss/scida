import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  PersistedAnalysisUIState,
  PersistedAnalysisUIStateChartConfig,
  PersistedAnalysisUIStateScalarSeriesConfig,
  PersistedAnalysisUIStateStructuredSeriesConfig
} from '../electron-api';
import { getSettingValue, upsertSetting } from './auth-settings';

const ANALYSIS_UI_STATE_SETTING_KEY = 'analysisUiStateV1';
const ANALYSIS_STEP1_FIELD_KEYS = new Set([
  'testProject',
  'sampleCode',
  'tester',
  'instrument',
  'testTime',
  'sampleOwner'
]);
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function normalizeOptionalDisplayName(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function normalizeOptionalTitle(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function normalizeOptionalColor(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR_PATTERN.test(text) ? text.toLowerCase() : undefined;
}

function normalizeRecordIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
}

function normalizeScalarSeriesConfig(
  value: unknown
): PersistedAnalysisUIStateScalarSeriesConfig | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const config = value as Record<string, unknown>;
  const xFieldKey = typeof config.xFieldKey === 'string' ? config.xFieldKey.trim() : '';
  const yMetricName = typeof config.yMetricName === 'string' ? config.yMetricName.trim() : '';
  const selectedRecordIds = normalizeRecordIds(config.selectedRecordIds);

  if (!ANALYSIS_STEP1_FIELD_KEYS.has(xFieldKey) || !yMetricName || !selectedRecordIds.length) {
    return null;
  }

  return {
    xFieldKey: xFieldKey as PersistedAnalysisUIStateScalarSeriesConfig['xFieldKey'],
    yMetricName,
    selectedRecordIds,
    hidden: Boolean(config.hidden),
    displayName: normalizeOptionalDisplayName(config.displayName),
    color: normalizeOptionalColor(config.color)
  };
}

function normalizeStructuredSeriesConfig(
  value: unknown
): PersistedAnalysisUIStateStructuredSeriesConfig | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const config = value as Record<string, unknown>;
  const blockDisplayName =
    typeof config.blockDisplayName === 'string' ? config.blockDisplayName.trim() : '';
  const selectedRecordIds = normalizeRecordIds(config.selectedRecordIds);

  if (!blockDisplayName || !selectedRecordIds.length) {
    return null;
  }

  return {
    blockDisplayName,
    selectedRecordIds,
    hidden: Boolean(config.hidden),
    displayName: normalizeOptionalDisplayName(config.displayName),
    color: normalizeOptionalColor(config.color)
  };
}

function normalizeChartConfig(value: unknown): PersistedAnalysisUIStateChartConfig | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const config = value as Record<string, unknown>;
  const chartType = config.chartType === 'structured' ? 'structured' : config.chartType === 'scalar' ? 'scalar' : '';
  const semanticTitle = typeof config.semanticTitle === 'string' ? config.semanticTitle.trim() : '';
  const customTitle = normalizeOptionalTitle(config.customTitle);

  if (chartType === 'scalar') {
    return {
      chartType,
      semanticTitle,
      customTitle,
      scalarSeries: Array.isArray(config.scalarSeries)
        ? config.scalarSeries
            .map((series) => normalizeScalarSeriesConfig(series))
            .filter(
              (series): series is PersistedAnalysisUIStateScalarSeriesConfig => Boolean(series)
            )
        : []
    };
  }

  if (chartType === 'structured') {
    return {
      chartType,
      semanticTitle,
      customTitle,
      structuredSeries: Array.isArray(config.structuredSeries)
        ? config.structuredSeries
            .map((series) => normalizeStructuredSeriesConfig(series))
            .filter(
              (series): series is PersistedAnalysisUIStateStructuredSeriesConfig => Boolean(series)
            )
        : []
    };
  }

  return null;
}

export function normalizePersistedAnalysisUIState(
  value: unknown
): PersistedAnalysisUIState {
  if (!value || typeof value !== 'object') {
    return {
      sidebarCollapsed: false,
      analysisDetailCollapsed: false,
      analysisCharts: []
    };
  }

  const state = value as Record<string, unknown>;

  return {
    sidebarCollapsed: Boolean(state.sidebarCollapsed),
    analysisDetailCollapsed: Boolean(state.analysisDetailCollapsed),
    analysisCharts: Array.isArray(state.analysisCharts)
      ? state.analysisCharts
          .map((chart) => normalizeChartConfig(chart))
          .filter((chart): chart is PersistedAnalysisUIStateChartConfig => Boolean(chart))
      : []
  };
}

export async function getPersistedAnalysisUIState(
  prisma: PrismaClient
): Promise<PersistedAnalysisUIState> {
  const savedValue = await getSettingValue(prisma, ANALYSIS_UI_STATE_SETTING_KEY, '');

  if (!savedValue.trim()) {
    return normalizePersistedAnalysisUIState(null);
  }

  try {
    return normalizePersistedAnalysisUIState(JSON.parse(savedValue));
  } catch (error) {
    console.error('parse persisted analysis ui state failed:', error);
    return normalizePersistedAnalysisUIState(null);
  }
}

export async function savePersistedAnalysisUIState(
  prisma: PrismaClient,
  payload: PersistedAnalysisUIState
): Promise<ActionResult> {
  const normalized = normalizePersistedAnalysisUIState(payload);
  await upsertSetting(
    prisma,
    ANALYSIS_UI_STATE_SETTING_KEY,
    JSON.stringify(normalized)
  );
  return { success: true };
}
