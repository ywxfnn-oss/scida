import './index.css';
import type {
  AnalysisStep1FieldKey,
  AppLanguage,
  AppBootstrapState,
  AppRuntimeInfo,
  AppSettings,
  CrossFilterChip,
  CrossFilterField,
  CrossFilterOperator,
  DictionaryItemsByType,
  DictionaryType,
  DuplicateExperimentMatch,
  ExperimentEditHistoryEntry,
  ExperimentDetail,
  ExperimentGroup,
  ExperimentListItem,
  ImportManualDelimiter,
  ImportManualXAxisSourceMode,
  ImportPreviewFileResult,
  ExperimentListSortOrder,
  FileIntegrityReport,
  GroupByType,
  OperationLogFilter,
  PersistedAnalysisUIState,
  PersistedAnalysisUIStateChartConfig,
  PreviewManualImportXYResult,
  RecentOperationLogEntry,
  SaveExperimentPayload,
  SaveExperimentTemplateBlockPayload,
  UpdateExperimentPayload
} from './electron-api';
import {
  buildDisplayName,
  escapeHtml,
  generateId,
  getErrorMessage,
  getPendingOriginalName,
  renderDeleteModal,
  renderDetailDerivedPreview,
  renderDetailEditInput,
  renderDetailPair,
  renderDuplicateWarningModal,
  renderExperimentEditHistory,
  renderDynamicFields,
  renderExportModal,
  renderGroupTabs,
  renderOperationLogFilterButtons,
  renderRecentOperationLogs
} from './renderer/render-helpers';
import {
  collectCrossFilterCandidateValues,
  matchesCrossFilterSet,
  supportsCrossFilterCandidatePicker,
  type CrossFilterRecordLike
} from './cross-filters';
import {
  getStructuredBlockPurposeLabel,
  getValueNatureLabelText,
  resolveStep2TemplateFamily,
  STRUCTURED_BLOCK_PURPOSE_OPTIONS,
  type Step2RecommendedScalarItem,
  type Step2RecommendedStructuredBlock,
  type Step2TemplateFamily,
  type StructuredBlockPurpose
} from './renderer/step2-template-registry';
import {
  getTemplateBlockTypeLabel,
  formatXYPointInput,
  normalizeTemplateBlocks,
  parseTemplateBlockPointInput,
  SPECTRUM_TEMPLATE_TYPE,
  trimBlockTitle,
  type TemplateBlockType,
  XY_TEMPLATE_TYPE
} from './template-blocks';
import { getDictionarySectionLabel, translate } from './renderer/i18n';

let appSettings: AppSettings = {
  storageRoot: '',
  loginUsername: 'admin',
  appLanguage: 'en'
};
let appBootstrapState: AppBootstrapState | null = null;
let appBootstrapStateLoadPromise: Promise<void> | null = null;
let appRuntimeInfo: AppRuntimeInfo | null = null;
let appRuntimeInfoLoadPromise: Promise<void> | null = null;
let currentAppVersion = '';
let aboutDialogVisible = false;
let thirdPartyNoticesVisible = false;

type ViewType =
  | 'onboarding'
  | 'login'
  | 'home'
  | 'analysis'
  | 'add-step1'
  | 'add-step2'
  | 'save-success'
  | 'database-list'
  | 'database-detail'
  | 'settings';

type ExportModeType = 'full' | 'single-item' | 'all-items';

type DynamicField = {
  id: string;
  name: string;
  value: string;
};

type DataItem = {
  id: string;
  dataItemId?: number;
  scalarRole?: ScalarItemRole;
  itemName: string;
  itemValue: string;
  itemUnit: string;
  sourceFileName: string;
  sourceFilePath: string;
  originalFileName: string;
  originalFilePath: string;
  replacementSourcePath?: string;
  replacementOriginalName?: string;
};

type ScalarItemRole = 'condition' | 'metric';

type ScalarItemEditContext = 'create-step2' | 'detail-edit';

type Step1FormData = {
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  sampleOwner: string;
  dynamicFields: DynamicField[];
};

type TemplateBlockFormData = {
  id: string;
  blockId?: number;
  templateType: TemplateBlockType;
  purposeType?: StructuredBlockPurpose;
  blockTitle: string;
  primaryLabel: string;
  primaryUnit: string;
  secondaryLabel: string;
  secondaryUnit: string;
  dataText: string;
  note: string;
  sourceFileName: string;
  sourceFilePath: string;
  originalFileName: string;
  originalFilePath: string;
  replacementSourcePath?: string;
  replacementOriginalName?: string;
  importPreviewLoading?: boolean;
  importPreviewError?: string;
  importParserLabel?: string;
  importWarnings?: string[];
  importPreviewCandidate?: ImportPreviewFileResult['candidates'][number];
  importPreviewSelectedName?: string;
  importPreviewSelectedPath?: string;
  importManualReview?: ImportReviewManualState;
  createdAt?: string;
};

type ImportReviewManualState = {
  available: boolean;
  delimiter: ImportManualDelimiter;
  suggestedDelimiter: ImportManualDelimiter;
  previewRows: Array<{
    rowNumber: number;
    columns: string[];
  }>;
  maxColumnCount: number;
  dataStartRow: number;
  xSourceMode: ImportManualXAxisSourceMode;
  xColumnIndex: number;
  yColumnIndex: number;
  generatedXStart: number;
  generatedXStep: number;
  previewLoading: boolean;
  previewError: string;
};

type TemplateBlockEditContext = 'create-step2' | 'detail-edit';

type DuplicateWarningState =
  | {
      mode: 'create';
      matches: DuplicateExperimentMatch[];
      sampleCode: string;
      testProject: string;
      testTime: string;
      payload: SaveExperimentPayload;
    }
  | {
      mode: 'update';
      matches: DuplicateExperimentMatch[];
      sampleCode: string;
      testProject: string;
      testTime: string;
      payload: UpdateExperimentPayload;
    };

type SettingsSubView = 'general' | 'dictionary' | 'logs' | 'about';
type OnboardingStep = 'welcome' | 'legal' | 'storage' | 'admin' | 'progress' | 'complete';

type AnalysisChartType = 'scalar' | 'structured';
type AnalysisScalarAxisMode = 'numeric' | 'categorical';

type AnalysisRecordCatalogEntry = {
  listItem: ExperimentListItem;
  detail: ExperimentDetail;
};

type AnalysisScalarPoint = {
  recordId: number;
  recordDisplayName: string;
  xNumeric: number;
  xLabel: string;
  xRaw: string;
  yValue: number;
};

type AnalysisScalarSeries = {
  id: string;
  name: string;
  defaultName: string;
  color: string;
  defaultColor: string;
  hidden: boolean;
  recordIds: number[];
  xSourceLabel: string;
  xSourceValue: string;
  xMode: AnalysisScalarAxisMode;
  xUnit: string;
  yItemName: string;
  yUnit: string;
  points: AnalysisScalarPoint[];
  skippedRecordIds: number[];
};

type AnalysisStructuredSeries = {
  id: string;
  name: string;
  defaultName: string;
  color: string;
  defaultColor: string;
  hidden: boolean;
  sourceBlockDisplayName: string;
  experimentId: number;
  recordDisplayName: string;
  blockId: number;
  blockTitle: string;
  purposeType: StructuredBlockPurpose;
  templateType: TemplateBlockType;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
  note: string;
  points: Array<{ x: number; y: number }>;
};

type AnalysisViewport = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

type AnalysisChartCard = {
  id: string;
  chartType: AnalysisChartType;
  title: string;
  customTitle: string | null;
  scalarSeries: AnalysisScalarSeries[];
  structuredSeries: AnalysisStructuredSeries[];
  viewport: AnalysisViewport | null;
  selectionNotice: string;
  statusMessages: string[];
};

type AnalysisInspectorState =
  | {
      kind: 'scalar-point';
      chartId: string;
      chartTitle: string;
      seriesName: string;
      xLabel: string;
      xValue: string;
      xUnit: string;
      yLabel: string;
      yValue: string;
      yUnit: string;
      recordId: number;
      recordDisplayName: string;
      metricName: string;
    }
  | {
      kind: 'structured-series';
      chartId: string;
      chartTitle: string;
      seriesName: string;
      purposeType: StructuredBlockPurpose;
      pointCount: number;
      xLabel: string;
      xUnit: string;
      yLabel: string;
      yUnit: string;
      note: string;
      recordId: number;
      recordDisplayName: string;
      blockTitle: string;
      blockId: number;
    };

type AnalysisComposerState =
  | {
      chartId: string;
      chartType: 'scalar';
      searchQuery: string;
      appliedSearchQuery: string;
      resultScrollTop: number;
      crossFilters: CrossFilterChip[];
      filterDraftOpen: boolean;
      filterDraftField: CrossFilterField;
      filterDraftOperator: CrossFilterOperator;
      filterDraftValue: string;
      filterDraftValue2: string;
      filterDraftPendingValues: string[];
      selectedRecordIds: number[];
      step1FieldKey: AnalysisStep1FieldKey;
      yItemName: string;
      pending: boolean;
      error: string;
    }
  | {
      chartId: string;
      chartType: 'structured';
      searchQuery: string;
      appliedSearchQuery: string;
      resultScrollTop: number;
      crossFilters: CrossFilterChip[];
      filterDraftOpen: boolean;
      filterDraftField: CrossFilterField;
      filterDraftOperator: CrossFilterOperator;
      filterDraftValue: string;
      filterDraftValue2: string;
      filterDraftPendingValues: string[];
      selectedRecordIds: number[];
      selectedBlockName: string;
      pending: boolean;
      error: string;
    };

type CrossFilterDraftState = {
  open: boolean;
  field: CrossFilterField;
  operator: CrossFilterOperator;
  value: string;
  value2: string;
  pendingValues: string[];
};

type AppSidebarItem = {
  id?: string;
  label: string;
  icon: string;
  active?: boolean;
};

type OnboardingFormState = {
  step: OnboardingStep;
  acceptedLicense: boolean;
  acceptedPrivacy: boolean;
  storageRoot: string;
  loginUsername: string;
  password: string;
  confirmPassword: string;
  error: string;
};

type AnalysisChartDragState = {
  chartId: string;
  startClientX: number;
  startClientY: number;
  originViewport: AnalysisViewport;
  plotWidth: number;
  plotHeight: number;
};

const DICTIONARY_TYPES: DictionaryType[] = ['testProject', 'tester', 'instrument'];
const STEP1_SUGGESTION_LIMIT = 8;
const ANALYSIS_CHART_COLORS = [
  '#1d4ed8',
  '#b91c1c',
  '#047857',
  '#a16207',
  '#7c3aed',
  '#0f766e',
  '#c2410c',
  '#be185d'
];
const ANALYSIS_STEP1_FIELD_OPTIONS: AnalysisStep1FieldKey[] = [
  'testProject',
  'sampleCode',
  'tester',
  'instrument',
  'testTime',
  'sampleOwner'
];
function getCrossFilterFieldOptions(): Array<{
  field: CrossFilterField;
  label: string;
}> {
  return [
    { field: 'sampleCode', label: t('database.filterField.sampleCode') },
    { field: 'testTime', label: t('database.filterField.testTime') },
    { field: 'testProject', label: t('database.filterField.testProject') },
    { field: 'tester', label: t('database.filterField.tester') },
    { field: 'instrument', label: t('database.filterField.instrument') },
    { field: 'sampleOwner', label: t('database.filterField.sampleOwner') },
    { field: 'conditionName', label: t('database.filterField.conditionName') },
    { field: 'conditionValue', label: t('database.filterField.conditionValue') },
    { field: 'metricName', label: t('database.filterField.metricName') },
    { field: 'metricValue', label: t('database.filterField.metricValue') },
    { field: 'structuredBlockName', label: t('database.filterField.structuredBlockName') }
  ];
}

function getCrossFilterOperatorOptions(): Array<{
  operator: CrossFilterOperator;
  label: string;
}> {
  return [
    { operator: 'eq', label: t('database.filterOperator.eq') },
    { operator: 'gte', label: t('database.filterOperator.gte') },
    { operator: 'lte', label: t('database.filterOperator.lte') },
    { operator: 'between', label: t('database.filterOperator.between') }
  ];
}
const CONDITION_NAME_KEYWORDS = [
  '温度',
  '偏压',
  '光功率',
  '波长',
  '频率',
  '环境气氛',
  '测试气氛',
  '条件',
  '气压',
  '湿度',
  'bias',
  'temperature',
  'power',
  'wavelength',
  'frequency',
  'condition',
  'atmosphere',
  'humidity'
];
const METRIC_NAME_KEYWORDS = [
  'rise time',
  'fall time',
  'responsivity',
  'eqe',
  'dark current',
  'd*',
  'detectivity',
  'nep',
  'on/off',
  'on off',
  '峰值响应',
  '截止波长',
  '响应度',
  '暗电流',
  '上升时间',
  '下降时间'
];
const DICTIONARY_SECTION_META: DictionaryType[] = ['testProject', 'tester', 'instrument'];

function buildEmptyDictionaryItems(): DictionaryItemsByType {
  return {
    testProject: [],
    tester: [],
    instrument: []
  };
}

function buildEmptyDictionaryInputState(): Record<DictionaryType, string> {
  return {
    testProject: '',
    tester: '',
    instrument: ''
  };
}

function buildEmptyDictionaryErrorState(): Record<DictionaryType, string> {
  return {
    testProject: '',
    tester: '',
    instrument: ''
  };
}

function inferScalarItemRole(itemName: string): ScalarItemRole {
  const normalized = itemName.trim().toLowerCase();
  if (!normalized) {
    return 'metric';
  }

  if (CONDITION_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return 'condition';
  }

  if (METRIC_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return 'metric';
  }

  return 'metric';
}

function resolveScalarItemRole(item: {
  itemName: string;
  scalarRole?: ScalarItemRole | null;
}): ScalarItemRole {
  return item.scalarRole || inferScalarItemRole(item.itemName);
}

function isScalarValueLikelyNumeric(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return Number.isFinite(Number(trimmed));
}

function buildAnalysisPreparationWarnings(
  rows: Array<{
    itemName: string;
    itemValue: string;
    itemUnit: string;
  }>,
  templateBlocks: SaveExperimentTemplateBlockPayload[]
) {
  const warnings = new Set<string>();
  const unitsByItem = new Map<string, Set<string>>();

  rows
    .filter((row) => row.itemName.trim() && row.itemValue.trim())
    .forEach((row) => {
      const itemName = row.itemName.trim();
      const itemUnit = row.itemUnit.trim();

      if (isScalarValueLikelyNumeric(row.itemValue) && !itemUnit) {
        warnings.add(`标量数据“${itemName}”为数值，但未填写单位；后续分析比较可能受限。`);
      }

      if (!isScalarValueLikelyNumeric(row.itemValue) && itemUnit) {
        warnings.add(`标量数据“${itemName}”更像文本值，但填写了单位；后续分析会将其视为不可绘制文本。`);
      }

      if (!itemUnit) {
        return;
      }

      const existingUnits = unitsByItem.get(itemName) || new Set<string>();
      existingUnits.add(itemUnit);
      unitsByItem.set(itemName, existingUnits);
    });

  unitsByItem.forEach((units, itemName) => {
    if (units.size > 1) {
      warnings.add(
        `标量数据“${itemName}”在当前记录内存在多个单位（${Array.from(units).join(' / ')}）；后续分析需谨慎。`
      );
    }
  });

  templateBlocks.forEach((block) => {
    const purposeType = block.purposeType || '';
    if (!purposeType) {
      return;
    }

    const primaryUnit =
      block.templateType === XY_TEMPLATE_TYPE ? block.xUnit.trim() : block.spectrumAxisUnit.trim();
    const secondaryUnit =
      block.templateType === XY_TEMPLATE_TYPE ? block.yUnit.trim() : block.signalUnit.trim();

    if (!primaryUnit || !secondaryUnit) {
      warnings.add(
        t('analysis.status.incompleteStructuredUnits', {
          title: block.blockTitle
        })
      );
    }
  });

  return Array.from(warnings);
}

function confirmAnalysisPreparationWarnings(warnings: string[]) {
  if (!warnings.length) {
    return true;
  }

  return window.confirm(
    t('analysis.status.confirmPreparation', {
      warnings: warnings.join('\n')
    })
  );
}

function buildEmptyDataItem(role: ScalarItemRole = 'metric'): DataItem {
  return {
    id: generateId(),
    scalarRole: role,
    itemName: '',
    itemValue: '',
    itemUnit: '',
    sourceFileName: '',
    sourceFilePath: '',
    originalFileName: '',
    originalFilePath: ''
  };
}

function getScalarSectionLabel(role?: ScalarItemRole) {
  return role === 'condition' ? '实验条件' : '结果指标';
}

let currentView: ViewType = 'login';
let lastSavedExperimentId: number | null = null;
let settingsSubView: SettingsSubView = 'general';
const onboardingState: OnboardingFormState = {
  step: 'welcome',
  acceptedLicense: false,
  acceptedPrivacy: false,
  storageRoot: '',
  loginUsername: 'admin',
  password: '',
  confirmPassword: '',
  error: ''
};

let databaseSearchKeyword = '';
let databaseGroupBy: GroupByType = 'sampleCode';
const databaseSortOrder: ExperimentListSortOrder = 'newest';
let databaseCrossFilters: CrossFilterChip[] = [];
let databaseFilterDraft: CrossFilterDraftState = {
  open: false,
  field: 'sampleCode',
  operator: 'eq',
  value: '',
  value2: '',
  pendingValues: []
};
let databaseFilterCandidateQuery = '';
let databaseFilterCandidateValues: string[] = [];
let databaseFilterCandidateLoading = false;
let databaseFilterCandidateKey = '';
let databaseGroups: ExperimentGroup[] = [];
let currentDetail: ExperimentDetail | null = null;
let currentEditHistory: ExperimentEditHistoryEntry[] = [];

let detailEditMode = false;
let detailEditReason = '';
let detailEditor = '';
let detailEditStep1: Step1FormData | null = null;
let detailEditStep2: DataItem[] = [];
let detailEditTemplateBlocks: TemplateBlockFormData[] = [];
let detailActiveTemplateBlockImportId = '';
let step2ActiveTemplateBlockImportId = '';

let selectedExperimentIds: number[] = [];
let exportModalVisible = false;
let exportCompressAfter = false;
let exportLoading = false;
let exportMode: ExportModeType = 'full';
let exportAvailableItemNames: string[] = [];
let exportSelectedItemName = '';
let deleteModalVisible = false;
let deleteLoading = false;
let deleteTargetIds: number[] = [];
let fileIntegrityLoading = false;
let fileIntegrityActionLoading = false;
let fileIntegrityError = '';
let fileIntegrityReport: FileIntegrityReport | null = null;
let dictionaryLoading = false;
let dictionaryLoadError = '';
let dictionaryLoaded = false;
let dictionaryItems = buildEmptyDictionaryItems();
const dictionaryInputValues = buildEmptyDictionaryInputState();
const dictionarySectionErrors = buildEmptyDictionaryErrorState();
let dictionarySubmittingType: DictionaryType | null = null;
let dictionaryDeletingId: string | null = null;
let selectedOrphanPaths: string[] = [];
let operationLogLoading = false;
let operationLogError = '';
let operationLogFilter: OperationLogFilter = 'all';
let recentOperationLogs: RecentOperationLogEntry[] | null = null;
let duplicateWarningState: DuplicateWarningState | null = null;
let duplicateWarningSubmitting = false;
let analysisLoading = false;
let analysisLoadError = '';
let analysisRecords: AnalysisRecordCatalogEntry[] = [];
let analysisCharts: AnalysisChartCard[] = [];
let analysisInspector: AnalysisInspectorState | null = null;
let analysisComposer: AnalysisComposerState | null = null;
let analysisFilterCandidateQuery = '';
let analysisExportMenuChartId: string | null = null;
let analysisChartDragState: AnalysisChartDragState | null = null;
let analysisInspectorCollapsed = false;
let analysisExpandedChartId: string | null = null;
let analysisChartTitleEditState: {
  chartId: string;
  value: string;
} | null = null;
let analysisSeriesRenameState: {
  chartId: string;
  seriesId: string;
  value: string;
} | null = null;
let sidebarCollapsed = false;
let persistedAnalysisUiStateLoaded = false;
let persistedAnalysisUiStateLoadPromise: Promise<void> | null = null;
let persistedAnalysisUiSaveTimer: number | null = null;
let lastPersistedAnalysisUiStateSerialized = '';
let pendingPersistedAnalysisUiStateSerialized: string | null = null;
let persistedAnalysisChartConfigs: PersistedAnalysisUIStateChartConfig[] = [];
let analysisChartsRestoredFromPersistence = false;

let step1FormData: Step1FormData = {
  testProject: '',
  sampleCode: '',
  tester: '',
  instrument: '',
  testTime: '',
  sampleOwner: '',
  dynamicFields: []
};

let step2DataItems: DataItem[] = [];
let step2TemplateBlocks: TemplateBlockFormData[] = [];

const root = document.getElementById('app');

function getCurrentLanguage(): AppLanguage {
  return appSettings.appLanguage;
}

function t(key: Parameters<typeof translate>[1], variables?: Record<string, string | number>) {
  return translate(getCurrentLanguage(), key, variables);
}

function getCrossFilterFieldLabel(field: CrossFilterField) {
  const labels: Record<CrossFilterField, string> = {
    sampleCode: t('database.filterField.sampleCode'),
    testTime: t('database.filterField.testTime'),
    testProject: t('database.filterField.testProject'),
    tester: t('database.filterField.tester'),
    instrument: t('database.filterField.instrument'),
    sampleOwner: t('database.filterField.sampleOwner'),
    conditionName: t('database.filterField.conditionName'),
    conditionValue: t('database.filterField.conditionValue'),
    metricName: t('database.filterField.metricName'),
    metricValue: t('database.filterField.metricValue'),
    secondaryName: t('database.filterField.secondaryName'),
    secondaryValue: t('database.filterField.secondaryValue'),
    structuredBlockName: t('database.filterField.structuredBlockName')
  };

  return labels[field];
}

function getLocalizedCrossFilterFieldPlaceholder(field: CrossFilterField) {
  const placeholders: Record<CrossFilterField, string> = {
    sampleCode: t('database.filterPlaceholder.sampleCode'),
    testTime: t('database.filterPlaceholder.testTime'),
    testProject: t('database.filterPlaceholder.testProject'),
    tester: t('database.filterPlaceholder.tester'),
    instrument: t('database.filterPlaceholder.instrument'),
    sampleOwner: t('database.filterPlaceholder.sampleOwner'),
    conditionName: t('database.filterPlaceholder.conditionName'),
    conditionValue: t('database.filterPlaceholder.conditionValue'),
    metricName: t('database.filterPlaceholder.metricName'),
    metricValue: t('database.filterPlaceholder.metricValue'),
    secondaryName: t('database.filterPlaceholder.secondaryName'),
    secondaryValue: t('database.filterPlaceholder.secondaryValue'),
    structuredBlockName: t('database.filterPlaceholder.structuredBlockName')
  };

  return placeholders[field];
}

function formatLocalizedCrossFilterChipLabel(chip: CrossFilterChip) {
  const operator = chip.operator || 'eq';
  const normalizedValue = chip.value.trim();
  const normalizedValue2 = (chip.value2 || '').trim();

  if (operator === 'gte') {
    return `${getCrossFilterFieldLabel(chip.field)}: >= ${normalizedValue}`;
  }

  if (operator === 'lte') {
    return `${getCrossFilterFieldLabel(chip.field)}: <= ${normalizedValue}`;
  }

  if (operator === 'between') {
    return `${getCrossFilterFieldLabel(chip.field)}: ${normalizedValue} ~ ${normalizedValue2}`;
  }

  return `${getCrossFilterFieldLabel(chip.field)}: ${normalizedValue}`;
}

function getScalarRoleMeta(role: ScalarItemRole) {
  if (role === 'condition') {
    return {
      title: t('step2.condition.title'),
      subtitle: t('step2.condition.subtitle'),
      addButtonLabel: t('step2.condition.addButton'),
      recommendationLabel: t('step2.condition.recommendationLabel'),
      nameHeader: t('step2.table.nameHeader'),
      valueHeader: t('step2.condition.valueHeader'),
      fileHeader: t('step2.table.fileHeader'),
      emptyText: t('step2.condition.empty')
    };
  }

  return {
    title: t('step2.metric.title'),
    subtitle: t('step2.metric.subtitle'),
    addButtonLabel: t('step2.metric.addButton'),
    recommendationLabel: t('step2.metric.recommendationLabel'),
    nameHeader: t('step2.table.nameHeader'),
    valueHeader: t('step2.metric.valueHeader'),
    fileHeader: t('step2.table.fileHeader'),
    emptyText: t('step2.metric.empty')
  };
}

function handleAsyncError(error: unknown, fallbackMessage = '操作失败，请稍后重试') {
  console.error(error);
  alert(`${fallbackMessage}\n${getErrorMessage(error)}`);
}

function syncOnboardingDefaults() {
  if (!appSettings.storageRoot) {
    return;
  }

  if (!onboardingState.storageRoot) {
    onboardingState.storageRoot = appSettings.storageRoot;
  }

  if (!onboardingState.loginUsername) {
    onboardingState.loginUsername = appSettings.loginUsername || 'admin';
  }
}

async function ensureBootstrapStateLoaded() {
  if (appBootstrapState) {
    return;
  }

  if (!appBootstrapStateLoadPromise) {
    appBootstrapStateLoadPromise = (async () => {
      appBootstrapState = await window.electronAPI.getAppBootstrapState();
      appSettings = appBootstrapState.appSettings;
      syncOnboardingDefaults();

      if (appBootstrapState.requiresOnboarding && currentView === 'login') {
        currentView = 'onboarding';
      }
    })();
  }

  await appBootstrapStateLoadPromise;
}

async function ensureAppSettingsLoaded() {
  if (!appSettings.storageRoot) {
    if (appBootstrapState?.appSettings) {
      appSettings = appBootstrapState.appSettings;
    } else {
      appSettings = await window.electronAPI.getAppSettings();
    }

    syncOnboardingDefaults();
  }
}

async function ensureRuntimeInfoLoaded() {
  if (appRuntimeInfoLoadPromise) {
    await appRuntimeInfoLoadPromise;
    return;
  }

  appRuntimeInfoLoadPromise = (async () => {
    try {
      appRuntimeInfo = await window.electronAPI.getAppRuntimeInfo();
    } catch (error) {
      console.error('load runtime info failed:', error);
      appRuntimeInfo = null;
    }
  })();

  await appRuntimeInfoLoadPromise;
}

function buildPersistedAnalysisUIStateSnapshot(): PersistedAnalysisUIState {
  return {
    sidebarCollapsed,
    analysisDetailCollapsed: analysisInspectorCollapsed,
    analysisCharts: analysisCharts.map((chart) => {
      const autoTitle = getAnalysisAutoChartTitle(chart);
      if (chart.chartType === 'scalar') {
        return {
          chartType: 'scalar',
          semanticTitle: autoTitle,
          customTitle:
            chart.customTitle?.trim() && chart.customTitle.trim() !== autoTitle
              ? chart.customTitle.trim()
              : undefined,
          scalarSeries: chart.scalarSeries.map((series) => ({
            xFieldKey: series.xSourceValue.replace('step1:', '') as AnalysisStep1FieldKey,
            yMetricName: series.yItemName,
            selectedRecordIds: [...series.recordIds],
            hidden: series.hidden,
            displayName: series.name !== series.defaultName ? series.name : undefined,
            color: series.color !== series.defaultColor ? series.color : undefined
          }))
        };
      }

      return {
        chartType: 'structured',
        semanticTitle: autoTitle,
        customTitle:
          chart.customTitle?.trim() && chart.customTitle.trim() !== autoTitle
            ? chart.customTitle.trim()
            : undefined,
        structuredSeries: chart.structuredSeries.map((series) => ({
          blockDisplayName: series.sourceBlockDisplayName,
          selectedRecordIds: [series.experimentId],
          hidden: series.hidden,
          displayName: series.name !== series.defaultName ? series.name : undefined,
          color: series.color !== series.defaultColor ? series.color : undefined
        }))
      };
    })
  };
}

async function persistAnalysisUIState(serialized: string) {
  try {
    const result = await window.electronAPI.savePersistedAnalysisUIState(
      JSON.parse(serialized) as PersistedAnalysisUIState
    );

    if (!result.success) {
      console.error(result.error || '保存分析界面状态失败');
      return;
    }

    lastPersistedAnalysisUiStateSerialized = serialized;
  } catch (error) {
    console.error('persistAnalysisUIState failed:', error);
  }
}

function schedulePersistedAnalysisUIStateSave() {
  if (!persistedAnalysisUiStateLoaded) {
    return;
  }

  const serialized = JSON.stringify(buildPersistedAnalysisUIStateSnapshot());

  if (
    serialized === lastPersistedAnalysisUiStateSerialized ||
    serialized === pendingPersistedAnalysisUiStateSerialized
  ) {
    return;
  }

  pendingPersistedAnalysisUiStateSerialized = serialized;

  if (persistedAnalysisUiSaveTimer) {
    window.clearTimeout(persistedAnalysisUiSaveTimer);
  }

  persistedAnalysisUiSaveTimer = window.setTimeout(() => {
    const nextSerialized = pendingPersistedAnalysisUiStateSerialized;
    pendingPersistedAnalysisUiStateSerialized = null;
    persistedAnalysisUiSaveTimer = null;

    if (!nextSerialized) {
      return;
    }

    void persistAnalysisUIState(nextSerialized);
  }, 180);
}

async function ensurePersistedAnalysisUIStateLoaded() {
  if (persistedAnalysisUiStateLoaded) {
    return;
  }

  if (!persistedAnalysisUiStateLoadPromise) {
    persistedAnalysisUiStateLoadPromise = (async () => {
      let loadedState: PersistedAnalysisUIState = {
        sidebarCollapsed: false,
        analysisDetailCollapsed: false,
        analysisCharts: []
      };

      try {
        const state = await window.electronAPI.getPersistedAnalysisUIState();
        loadedState = state;
        sidebarCollapsed = state.sidebarCollapsed;
        analysisInspectorCollapsed = state.analysisDetailCollapsed;
        persistedAnalysisChartConfigs = Array.isArray(state.analysisCharts)
          ? state.analysisCharts
          : [];
      } catch (error) {
        console.error('load persisted analysis ui state failed:', error);
        persistedAnalysisChartConfigs = [];
      } finally {
        persistedAnalysisUiStateLoaded = true;
        lastPersistedAnalysisUiStateSerialized = JSON.stringify(loadedState);
      }
    })();
  }

  await persistedAnalysisUiStateLoadPromise;
}

async function reloadFileIntegrityReport() {
  fileIntegrityReport = await window.electronAPI.scanFileIntegrity();
  const validPaths = new Set(fileIntegrityReport.orphanFiles.map((entry) => entry.filePath));
  selectedOrphanPaths = selectedOrphanPaths.filter((filePath) => validPaths.has(filePath));

  if (!selectedOrphanPaths.length && fileIntegrityReport.orphanFiles.length) {
    selectedOrphanPaths = fileIntegrityReport.orphanFiles.map((entry) => entry.filePath);
  }
}

async function reloadRecentOperationLogs(filter = operationLogFilter) {
  recentOperationLogs = await window.electronAPI.listRecentOperationLogs({
    filter,
    limit: 30
  });
}

async function reloadDictionaryItems() {
  dictionaryItems = await window.electronAPI.listDictionaryItems();
  dictionaryLoaded = true;
  dictionaryLoadError = '';
}

function saveDictionaryInputsToState() {
  DICTIONARY_TYPES.forEach((dictionaryType) => {
    const input = document.getElementById(
      `dictionary-input-${dictionaryType}`
    ) as HTMLInputElement | null;

    if (input) {
      dictionaryInputValues[dictionaryType] = input.value;
    }
  });
}

async function openSettingsView(subView: SettingsSubView = 'general') {
  currentView = 'settings';
  settingsSubView = subView;
  await render();
}

async function switchSettingsSubView(nextSubView: SettingsSubView) {
  if (settingsSubView === nextSubView) {
    return;
  }

  saveDictionaryInputsToState();
  settingsSubView = nextSubView;

  if (nextSubView !== 'dictionary' || dictionaryLoaded) {
    requestRender(true);
    return;
  }

  dictionaryLoading = true;
  dictionaryLoadError = '';
  requestRender(true);

  try {
    await reloadDictionaryItems();
  } catch (error) {
    dictionaryLoadError = getErrorMessage(error) || t('dictionary.loadFailed');
  } finally {
    dictionaryLoading = false;
    requestRender(true);
  }
}

async function openPathLocation(targetPath: string) {
  const result = await window.electronAPI.openPathLocation({ targetPath });

  if (!result.success) {
    alert(result.error || t('common.openPathFailed'));
  }
}

function isExperimentSelected(id: number) {
  return selectedExperimentIds.includes(id);
}

function toggleExperimentSelection(id: number) {
  if (isExperimentSelected(id)) {
    selectedExperimentIds = selectedExperimentIds.filter((item) => item !== id);
  } else {
    selectedExperimentIds = [...selectedExperimentIds, id];
  }
}

function getVisibleExperimentIds() {
  return databaseGroups.flatMap((group) => group.items.map((item) => item.id));
}

function areAllVisibleSelected() {
  const visibleIds = getVisibleExperimentIds();
  return visibleIds.length > 0 && visibleIds.every((id) => selectedExperimentIds.includes(id));
}

function toggleSelectAllVisible() {
  const visibleIds = getVisibleExperimentIds();

  if (!visibleIds.length) return;

  if (areAllVisibleSelected()) {
    selectedExperimentIds = selectedExperimentIds.filter((id) => !visibleIds.includes(id));
  } else {
    const merged = new Set<number>([...selectedExperimentIds, ...visibleIds]);
    selectedExperimentIds = Array.from(merged);
  }
}

function closeExportModal() {
  exportModalVisible = false;
  exportLoading = false;
}

function openDeleteModal(targetIds: number[]) {
  deleteTargetIds = [...targetIds];
  deleteModalVisible = true;
  deleteLoading = false;
}

function closeDeleteModal() {
  deleteModalVisible = false;
  deleteLoading = false;
  deleteTargetIds = [];
}

function closeDuplicateWarning() {
  duplicateWarningState = null;
  duplicateWarningSubmitting = false;
}

async function openExperimentDetail(experimentId: number) {
  const [detail, editHistory] = await Promise.all([
    window.electronAPI.getExperimentDetail(experimentId),
    window.electronAPI.listExperimentEditLogs({
      experimentId,
      limit: 5
    })
  ]);

  currentDetail = detail;
  currentEditHistory = editHistory;
  detailEditMode = false;
  detailEditReason = '';
  detailEditor = '';
  detailEditStep1 = null;
  detailEditStep2 = [];
  detailEditTemplateBlocks = [];
  resetTemplateBlockImportState('detail-edit');
  currentView = 'database-detail';
  void render();
}

function getAnalysisChartColor(index: number) {
  return ANALYSIS_CHART_COLORS[index % ANALYSIS_CHART_COLORS.length];
}

function getAnalysisSeriesDefaultName(
  series: AnalysisScalarSeries | AnalysisStructuredSeries
) {
  return series.defaultName.trim() || series.name.trim();
}

function getAnalysisSeriesDefaultColor(
  series: AnalysisScalarSeries | AnalysisStructuredSeries
) {
  return series.defaultColor.trim().toLowerCase() || series.color.trim().toLowerCase();
}

function hasAnalysisCustomSeriesName(
  series: AnalysisScalarSeries | AnalysisStructuredSeries
) {
  return series.name.trim() !== getAnalysisSeriesDefaultName(series);
}

function hasAnalysisCustomSeriesColor(
  series: AnalysisScalarSeries | AnalysisStructuredSeries
) {
  return series.color.trim().toLowerCase() !== getAnalysisSeriesDefaultColor(series);
}

function normalizeAnalysisUnit(unit: string) {
  return unit.trim().toLowerCase();
}

function getAnalysisStep1FieldLabel(fieldKey: AnalysisStep1FieldKey) {
  switch (fieldKey) {
    case 'testProject':
      return t('step1.field.testProject');
    case 'sampleCode':
      return t('step1.field.sampleCode');
    case 'tester':
      return t('step1.field.tester');
    case 'instrument':
      return t('step1.field.instrument');
    case 'testTime':
      return t('step1.field.testTime');
    case 'sampleOwner':
      return t('step1.field.sampleOwner');
    default:
      return fieldKey;
  }
}

function buildDefaultCrossFilterDraft(): CrossFilterDraftState {
  return {
    open: false,
    field: 'sampleCode',
    operator: 'eq',
    value: '',
    value2: '',
    pendingValues: []
  };
}

function supportsCrossFilterRangeOperator(field: CrossFilterField) {
  return field === 'conditionValue' || field === 'metricValue';
}

function supportsCrossFilterPendingMultiValue(operator: CrossFilterOperator) {
  return operator === 'eq';
}

function createCrossFilterChip(
  field: CrossFilterField,
  value: string,
  operator: CrossFilterOperator = 'eq',
  value2 = ''
): CrossFilterChip {
  return {
    id: generateId(),
    field,
    operator,
    value: value.trim(),
    value2: value2.trim() || undefined
  };
}

function addCrossFilterChip(
  chips: CrossFilterChip[],
  field: CrossFilterField,
  value: string,
  operator: CrossFilterOperator = 'eq',
  value2 = ''
) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return chips;
  }

  if (operator === 'between' && !value2.trim()) {
    return chips;
  }

  return [...chips, createCrossFilterChip(field, trimmedValue, operator, value2)];
}

function addCrossFilterChipBatch(
  chips: CrossFilterChip[],
  field: CrossFilterField,
  operator: CrossFilterOperator,
  values: string[],
  value2 = ''
) {
  let nextChips = [...chips];

  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const duplicate = nextChips.some(
        (chip) =>
          chip.field === field &&
          (chip.operator || 'eq') === operator &&
          chip.value.trim() === value &&
          (chip.value2 || '').trim() === value2.trim()
      );

      if (!duplicate) {
        nextChips = [...nextChips, createCrossFilterChip(field, value, operator, value2)];
      }
    });

  return nextChips;
}

function addPendingCrossFilterValue(values: string[], value: string) {
  const trimmed = value.trim();

  if (!trimmed || values.includes(trimmed)) {
    return values;
  }

  return [...values, trimmed];
}

function removePendingCrossFilterValue(values: string[], value: string) {
  return values.filter((entry) => entry !== value);
}

function removeCrossFilterChip(chips: CrossFilterChip[], chipId: string) {
  return chips.filter((chip) => chip.id !== chipId);
}

function buildCrossFilterCandidateBaseChips(
  chips: CrossFilterChip[],
  field: CrossFilterField,
  operator: CrossFilterOperator
) {
  if (!supportsCrossFilterCandidatePicker(field, operator)) {
    return chips;
  }

  return chips.filter(
    (chip) => !(chip.field === field && (chip.operator || 'eq') === 'eq')
  );
}

function filterCrossFilterCandidateValues(values: string[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return values;
  }

  return values.filter((value) => value.toLowerCase().includes(normalizedQuery));
}

function togglePendingCrossFilterCandidateValue(
  values: string[],
  value: string,
  checked: boolean
) {
  return checked ? addPendingCrossFilterValue(values, value) : removePendingCrossFilterValue(values, value);
}

function resetDatabaseFilterCandidateState() {
  databaseFilterCandidateQuery = '';
  databaseFilterCandidateValues = [];
  databaseFilterCandidateLoading = false;
  databaseFilterCandidateKey = '';
}

function getDatabaseFilterCandidateValues() {
  return filterCrossFilterCandidateValues(
    databaseFilterCandidateValues,
    databaseFilterCandidateQuery
  );
}

async function refreshDatabaseFilterCandidateValues(force = false) {
  if (
    !databaseFilterDraft.open ||
    !supportsCrossFilterCandidatePicker(databaseFilterDraft.field, databaseFilterDraft.operator)
  ) {
    if (databaseFilterCandidateValues.length || databaseFilterCandidateLoading || databaseFilterCandidateQuery) {
      resetDatabaseFilterCandidateState();
    }
    return;
  }

  const baseCrossFilters = buildCrossFilterCandidateBaseChips(
    databaseCrossFilters,
    databaseFilterDraft.field,
    databaseFilterDraft.operator
  );
  const requestKey = JSON.stringify({
    query: databaseSearchKeyword.trim(),
    field: databaseFilterDraft.field,
    crossFilters: baseCrossFilters.map((chip) => ({
      field: chip.field,
      operator: chip.operator || 'eq',
      value: chip.value,
      value2: chip.value2 || ''
    }))
  });

  if (!force && requestKey === databaseFilterCandidateKey) {
    return;
  }

  databaseFilterCandidateKey = requestKey;
  databaseFilterCandidateLoading = true;
  void renderPreservingContentScroll();

  try {
    const values = await window.electronAPI.listExperimentFilterValueCandidates({
      query: databaseSearchKeyword.trim(),
      crossFilters: baseCrossFilters,
      field: databaseFilterDraft.field
    });

    if (databaseFilterCandidateKey !== requestKey) {
      return;
    }

    databaseFilterCandidateValues = values;
  } catch (error) {
    console.error(error);
    if (databaseFilterCandidateKey === requestKey) {
      databaseFilterCandidateValues = [];
    }
  } finally {
    if (databaseFilterCandidateKey === requestKey) {
      databaseFilterCandidateLoading = false;
      void renderPreservingContentScroll();
    }
  }
}

function buildAnalysisCrossFilterRecord(
  entry: AnalysisRecordCatalogEntry
): CrossFilterRecordLike {
  return {
    sampleCode: entry.detail.sampleCode,
    testTime: entry.detail.testTime,
    testProject: entry.detail.testProject,
    tester: entry.detail.tester,
    instrument: entry.detail.instrument,
    sampleOwner: entry.detail.sampleOwner,
    dataItems: entry.detail.dataItems.map((item) => ({
      scalarRole: item.scalarRole,
      itemName: item.itemName,
      itemValue: item.itemValue,
      itemUnit: item.itemUnit
    })),
    templateBlocks: entry.detail.templateBlocks.map((block) => {
      if (block.templateType === XY_TEMPLATE_TYPE) {
        return {
          templateType: XY_TEMPLATE_TYPE,
          blockTitle: block.blockTitle,
          purposeType: block.purposeType,
          xLabel: block.xLabel,
          yLabel: block.yLabel
        };
      }

      return {
        templateType: SPECTRUM_TEMPLATE_TYPE,
        blockTitle: block.blockTitle,
        purposeType: block.purposeType,
        spectrumAxisLabel: block.spectrumAxisLabel,
        signalLabel: block.signalLabel
      };
    })
  };
}

function matchesAnalysisRecordSearch(entry: AnalysisRecordCatalogEntry, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    entry.listItem.displayName,
    entry.listItem.sampleCode,
    entry.listItem.testProject,
    entry.listItem.tester,
    entry.listItem.instrument
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function getAnalysisFilterCandidateValues(composer: AnalysisComposerState) {
  if (!supportsCrossFilterCandidatePicker(composer.filterDraftField, composer.filterDraftOperator)) {
    return [];
  }

  const baseCrossFilters = buildCrossFilterCandidateBaseChips(
    composer.crossFilters,
    composer.filterDraftField,
    composer.filterDraftOperator
  );
  const filteredRecords = analysisRecords
    .filter((entry) => matchesAnalysisRecordSearch(entry, composer.appliedSearchQuery))
    .map((entry) => buildAnalysisCrossFilterRecord(entry))
    .filter((record) => matchesCrossFilterSet(record, baseCrossFilters));

  return filterCrossFilterCandidateValues(
    collectCrossFilterCandidateValues(filteredRecords, composer.filterDraftField, baseCrossFilters),
    analysisFilterCandidateQuery
  );
}

function renderCrossFilterControls(params: {
  scope: 'database' | 'analysis';
  chips: CrossFilterChip[];
  draftOpen: boolean;
  draftField: CrossFilterField;
  draftOperator: CrossFilterOperator;
  draftValue: string;
  draftValue2: string;
  draftPendingValues: string[];
  draftCandidateQuery: string;
  candidateValues: string[];
  candidateLoading?: boolean;
}) {
  const prefix = params.scope === 'database' ? 'db' : 'analysis-composer';
  const fieldOptions = getCrossFilterFieldOptions();
  const operatorOptions = getCrossFilterOperatorOptions();
  const supportsRange = supportsCrossFilterRangeOperator(params.draftField);
  const supportsPendingValues = supportsCrossFilterPendingMultiValue(params.draftOperator);
  const supportsCandidatePicker = supportsCrossFilterCandidatePicker(
    params.draftField,
    params.draftOperator
  );

  return `
    <div class="cross-filter-chip-row">
      ${
        params.chips.length
          ? params.chips
              .map(
                (chip) => `
                  <span class="cross-filter-chip">
                    <span class="cross-filter-chip-label">${escapeHtml(formatLocalizedCrossFilterChipLabel(chip))}</span>
                    <button
                      class="cross-filter-chip-remove"
                      type="button"
                      title="${escapeHtml(t('database.filter.removeCondition'))}"
                      data-cross-filter-remove="${params.scope}::${chip.id}"
                    >
                      ×
                    </button>
                  </span>
                `
              )
              .join('')
          : `<span class="cross-filter-chip-placeholder">${escapeHtml(t('database.filter.emptyConditions'))}</span>`
      }
      ${
        params.chips.length
          ? `
              <button
                id="${prefix}-filter-clear-btn"
                class="text-btn cross-filter-clear-btn"
                type="button"
              >
                ${escapeHtml(t('database.filter.clearAll'))}
              </button>
            `
          : ''
      }
    </div>
    ${
      params.draftOpen
        ? `
            <div class="cross-filter-draft-row ${supportsRange ? 'cross-filter-draft-row-range' : ''}">
              <select id="${prefix}-filter-field" class="form-input cross-filter-field-select">
                ${fieldOptions.map(
                  (option) => `
                    <option value="${option.field}" ${params.draftField === option.field ? 'selected' : ''}>
                      ${option.label}
                    </option>
                  `
                ).join('')}
              </select>
              ${supportsRange
                ? `
                    <select id="${prefix}-filter-operator" class="form-input cross-filter-operator-select">
                      ${operatorOptions.map(
                        (option) => `
                          <option value="${option.operator}" ${params.draftOperator === option.operator ? 'selected' : ''}>
                            ${option.label}
                          </option>
                        `
                      ).join('')}
                    </select>
                  `
                : ''}
              <input
                id="${prefix}-filter-value"
                class="form-input cross-filter-value-input"
                placeholder="${escapeHtml(
                  supportsRange && params.draftOperator !== 'eq'
                    ? params.draftOperator === 'between'
                      ? t('database.filter.rangeStart')
                      : t('database.filter.threshold')
                    : getLocalizedCrossFilterFieldPlaceholder(params.draftField)
                )}"
                value="${escapeHtml(params.draftValue)}"
              />
              ${
                supportsPendingValues
                  ? `
                      <button id="${prefix}-filter-pending-add-btn" class="secondary-btn cross-filter-pending-add-btn" type="button">
                        ${escapeHtml(t('database.filter.addValue'))}
                      </button>
                    `
                  : ''
              }
              ${
                supportsRange && params.draftOperator === 'between'
                  ? `
                      <input
                        id="${prefix}-filter-value2"
                        class="form-input cross-filter-value-input"
                        placeholder="${escapeHtml(t('database.filter.rangeEnd'))}"
                        value="${escapeHtml(params.draftValue2)}"
                      />
                    `
                  : ''
              }
              <button id="${prefix}-filter-apply-btn" class="primary-btn" type="button">
                ${escapeHtml(supportsPendingValues ? t('database.filter.apply') : t('database.filter.addCondition'))}
              </button>
              <button id="${prefix}-filter-cancel-btn" class="secondary-btn" type="button">${escapeHtml(t('database.filter.cancel'))}</button>
            </div>
            ${
              supportsPendingValues
                ? `
                    <div class="cross-filter-draft-hint">
                      ${
                        supportsCandidatePicker
                          ? escapeHtml(t('database.filter.multiValueHint'))
                          : escapeHtml(t('database.filter.manualMultiValueHint'))
                      }
                    </div>
                    <div class="cross-filter-pending-row">
                      ${
                        params.draftPendingValues.length
                          ? params.draftPendingValues
                              .map(
                                (value) => `
                                  <span class="cross-filter-pending-chip">
                                    <span class="cross-filter-pending-chip-label">${escapeHtml(value)}</span>
                                    <button
                                      class="cross-filter-chip-remove"
                                      type="button"
                                      title="${escapeHtml(t('database.filter.removePendingValue'))}"
                                      data-cross-filter-pending-remove="${params.scope}::${encodeURIComponent(value)}"
                                    >
                                      ×
                                    </button>
                                  </span>
                                `
                              )
                              .join('')
                          : `<span class="cross-filter-chip-placeholder">${escapeHtml(t('database.filter.emptyPendingValues'))}</span>`
                      }
                    </div>
                    ${
                      supportsCandidatePicker
                        ? `
                            <div class="cross-filter-candidate-shell">
                              <div class="cross-filter-candidate-search-row">
                                <input
                                  id="${prefix}-filter-candidate-search"
                                  class="form-input cross-filter-candidate-search"
                                  placeholder="${escapeHtml(t('database.filter.candidateSearchPlaceholder'))}"
                                  value="${escapeHtml(params.draftCandidateQuery)}"
                                />
                                <span class="cross-filter-candidate-count">${escapeHtml(t('database.filter.candidateCount', { count: params.candidateValues.length }))}</span>
                              </div>
                              <div class="cross-filter-candidate-list">
                                ${
                                  params.candidateLoading
                                    ? `<div class="cross-filter-candidate-empty">${escapeHtml(t('database.filter.candidateLoading'))}</div>`
                                    : params.candidateValues.length
                                      ? params.candidateValues
                                          .map(
                                            (value) => `
                                              <label class="cross-filter-candidate-option">
                                                <input
                                                  type="checkbox"
                                                  data-cross-filter-candidate-toggle="${params.scope}::${encodeURIComponent(value)}"
                                                  ${params.draftPendingValues.includes(value) ? 'checked' : ''}
                                                />
                                                <span>${escapeHtml(value)}</span>
                                              </label>
                                            `
                                          )
                                          .join('')
                                      : `<div class="cross-filter-candidate-empty">${escapeHtml(t('database.filter.candidateEmpty'))}</div>`
                                }
                              </div>
                            </div>
                          `
                        : ''
                    }
                  `
                : supportsRange
                  ? `<div class="cross-filter-draft-hint">${escapeHtml(t('database.filter.numericHint'))}</div>`
                  : ''
            }
          `
        : ''
    }
  `;
}

function openDatabaseFilterDraft() {
  databaseFilterDraft = {
    ...databaseFilterDraft,
    open: true
  };
  databaseFilterCandidateQuery = '';
}

function closeDatabaseFilterDraft() {
  databaseFilterDraft = buildDefaultCrossFilterDraft();
  resetDatabaseFilterCandidateState();
}

async function applyDatabaseFilterDraft() {
  const supportsPendingValues = supportsCrossFilterPendingMultiValue(databaseFilterDraft.operator);
  const pendingValues = supportsPendingValues
    ? addPendingCrossFilterValue(databaseFilterDraft.pendingValues, databaseFilterDraft.value)
    : [];

  if (!supportsPendingValues && !databaseFilterDraft.value.trim()) {
    return;
  }

  if (databaseFilterDraft.operator === 'between' && !databaseFilterDraft.value2.trim()) {
    return;
  }

  databaseCrossFilters = supportsPendingValues
    ? addCrossFilterChipBatch(
        databaseCrossFilters,
        databaseFilterDraft.field,
        databaseFilterDraft.operator,
        pendingValues
      )
    : addCrossFilterChip(
        databaseCrossFilters,
        databaseFilterDraft.field,
        databaseFilterDraft.value,
        databaseFilterDraft.operator,
        databaseFilterDraft.value2
      );
  closeDatabaseFilterDraft();
  await loadDatabaseList();
  void render();
}

function openAnalysisComposerFilterDraft() {
  if (!analysisComposer) {
    return;
  }

  analysisComposer = {
    ...analysisComposer,
    filterDraftOpen: true
  } as AnalysisComposerState;
  analysisFilterCandidateQuery = '';
}

function closeAnalysisComposerFilterDraft() {
  if (!analysisComposer) {
    return;
  }

  analysisComposer = {
    ...analysisComposer,
    filterDraftOpen: false,
    filterDraftField: 'sampleCode',
    filterDraftOperator: 'eq',
    filterDraftValue: '',
    filterDraftValue2: '',
    filterDraftPendingValues: [],
    error: ''
  } as AnalysisComposerState;
  analysisFilterCandidateQuery = '';
}

function applyAnalysisComposerFilterDraft() {
  if (!analysisComposer) {
    return;
  }

  const supportsPendingValues = supportsCrossFilterPendingMultiValue(
    analysisComposer.filterDraftOperator
  );
  const pendingValues = supportsPendingValues
    ? addPendingCrossFilterValue(
        analysisComposer.filterDraftPendingValues,
        analysisComposer.filterDraftValue
      )
    : [];

  if (!supportsPendingValues && !analysisComposer.filterDraftValue.trim()) {
    return;
  }

  if (analysisComposer.filterDraftOperator === 'between' && !analysisComposer.filterDraftValue2.trim()) {
    return;
  }

  const nextComposer = reconcileAnalysisComposerSelection({
    ...analysisComposer,
    crossFilters: supportsPendingValues
      ? addCrossFilterChipBatch(
          analysisComposer.crossFilters,
          analysisComposer.filterDraftField,
          analysisComposer.filterDraftOperator,
          pendingValues
        )
      : addCrossFilterChip(
          analysisComposer.crossFilters,
          analysisComposer.filterDraftField,
          analysisComposer.filterDraftValue,
          analysisComposer.filterDraftOperator,
          analysisComposer.filterDraftValue2
        ),
    filterDraftOpen: false,
    filterDraftField: 'sampleCode' as CrossFilterField,
    filterDraftOperator: 'eq' as CrossFilterOperator,
    filterDraftValue: '',
    filterDraftValue2: '',
    filterDraftPendingValues: [],
    resultScrollTop: 0,
    error: ''
  } as AnalysisComposerState);
  analysisComposer = nextComposer as AnalysisComposerState;
  requestRender(true);
}

function getAnalysisStructuredBlockDisplayName(block: ExperimentDetail['templateBlocks'][number]) {
  const purposeLabel = getStructuredBlockPurposeLabel(block.purposeType || '');
  const hasKnownPurpose = purposeLabel && purposeLabel !== '未指定';
  const trimmedTitle = trimBlockTitle(block.blockTitle);
  const hasSpecificTitle = trimmedTitle && trimmedTitle !== '结构化数据块';
  const xLabel = block.templateType === XY_TEMPLATE_TYPE ? block.xLabel : block.spectrumAxisLabel;
  const yLabel = block.templateType === XY_TEMPLATE_TYPE ? block.yLabel : block.signalLabel;
  const axisSummary = [yLabel.trim(), xLabel.trim()].filter(Boolean).join(' - ') || '结构化数据';

  if (hasKnownPurpose && hasSpecificTitle) {
    return trimmedTitle === purposeLabel ? trimmedTitle : `${trimmedTitle} · ${purposeLabel}`;
  }

  if (hasSpecificTitle) {
    return trimmedTitle;
  }

  if (hasKnownPurpose) {
    return purposeLabel;
  }

  return axisSummary;
}

function getAnalysisStructuredBlockNameOptions(recordIds: number[]) {
  if (!recordIds.length) {
    return [];
  }

  const nameSet = new Set<string>();
  analysisRecords
    .filter((entry) => recordIds.includes(entry.listItem.id))
    .forEach((entry) => {
      entry.detail.templateBlocks.forEach((block) => {
        nameSet.add(getAnalysisStructuredBlockDisplayName(block));
      });
    });

  return Array.from(nameSet).sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function matchesAnalysisRecordFilters(
  entry: AnalysisRecordCatalogEntry,
  chips: CrossFilterChip[]
) {
  return matchesCrossFilterSet(buildAnalysisCrossFilterRecord(entry), chips);
}

function getAnalysisComposerFilteredRecords(composer: AnalysisComposerState) {
  return analysisRecords.filter((entry) => {
    if (!matchesAnalysisRecordSearch(entry, composer.appliedSearchQuery)) {
      return false;
    }

    return matchesAnalysisRecordFilters(entry, composer.crossFilters);
  });
}

function reconcileAnalysisComposerSelection(composer: AnalysisComposerState) {
  const filteredRecordIds = new Set(
    getAnalysisComposerFilteredRecords(composer).map((entry) => entry.listItem.id)
  );
  const selectedRecordIds = composer.selectedRecordIds.filter((recordId) => filteredRecordIds.has(recordId));

  if (composer.chartType === 'scalar') {
    const scalarMetricOptions = getAnalysisScalarMetricOptions(selectedRecordIds);
    return {
      ...composer,
      selectedRecordIds,
      yItemName: pickSingleAnalysisOption(scalarMetricOptions, composer.yItemName)
    };
  }

  const structuredBlockOptions = getAnalysisStructuredBlockNameOptions(selectedRecordIds);
  return {
    ...composer,
    selectedRecordIds,
    selectedBlockName: pickSingleAnalysisOption(structuredBlockOptions, composer.selectedBlockName)
  };
}

function pickSingleAnalysisOption(options: string[], currentValue: string) {
  if (options.includes(currentValue)) {
    return currentValue;
  }

  return options.length === 1 ? options[0] : '';
}

function getVisibleAnalysisScalarSeries(chart: AnalysisChartCard) {
  return chart.scalarSeries.filter((series) => !series.hidden);
}

function getVisibleAnalysisStructuredSeries(chart: AnalysisChartCard) {
  return chart.structuredSeries.filter((series) => !series.hidden);
}

function isAnalysisSeriesRenameActive(chartId: string, seriesId: string) {
  return (
    analysisSeriesRenameState?.chartId === chartId &&
    analysisSeriesRenameState?.seriesId === seriesId
  );
}

function renderAppSidebar(appName: string, items: AppSidebarItem[]) {
  return `
    <aside class="sidebar ${sidebarCollapsed ? 'collapsed' : ''}">
      <button id="app-sidebar-toggle" class="sidebar-toggle-btn" type="button" aria-label="切换侧边栏">
        ${sidebarCollapsed ? '»' : '«'}
      </button>
      <div class="sidebar-title">${sidebarCollapsed ? 'SD' : escapeHtml(appName)}</div>
      <div class="sidebar-menu">
        ${items
          .map(
            (item) => `
              <div
                ${item.id ? `id="${item.id}"` : ''}
                class="menu-item ${item.active ? 'active' : ''}"
                title="${escapeHtml(item.label)}"
              >
                <span class="menu-item-icon">${item.icon}</span>
                <span class="menu-item-label">${escapeHtml(item.label)}</span>
              </div>
            `
          )
          .join('')}
      </div>
      <div class="sidebar-footer">
        ${
          sidebarCollapsed
            ? escapeHtml(currentAppVersion)
            : escapeHtml(t('common.versionLabel', { version: currentAppVersion }))
        }
      </div>
    </aside>
  `;
}

function bindAppSidebarEvents() {
  document.getElementById('app-sidebar-toggle')?.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    schedulePersistedAnalysisUIStateSave();
    void render();
  });
}

function renderAboutDialog(appName: string, version: string) {
  if (!aboutDialogVisible) {
    return '';
  }

  return `
    <div class="about-modal-mask" id="about-dialog-mask">
      <div class="about-modal-card" role="dialog" aria-modal="true" aria-labelledby="about-dialog-title">
        <div class="about-modal-header">
          <div>
            <div id="about-dialog-title" class="about-modal-title">${escapeHtml(t('about.dialogTitle', { appName }))}</div>
            <div class="about-modal-subtitle">${escapeHtml(t('about.dialogSubtitle'))}</div>
          </div>
          <button id="about-dialog-close-btn" class="secondary-btn" type="button">${escapeHtml(t('common.close'))}</button>
        </div>

        ${renderAboutSurface(appName, version)}
      </div>
    </div>
  `;
}

function renderAboutSurface(appName: string, version: string) {
  return `
    <div class="detail-section">
      <div class="detail-section-title">${escapeHtml(t('about.section.productInfo'))}</div>
      <div class="about-info-card">
        <div class="about-info-title">${escapeHtml(appName)}</div>
        <div class="about-info-text">${escapeHtml(t('about.productDescription'))}</div>
      </div>
      <div class="info-row">
        <span>${escapeHtml(t('about.productNameLabel'))}</span>
        <strong>${escapeHtml(appName)}</strong>
      </div>
      <div class="info-row">
        <span>${escapeHtml(t('about.versionLabel'))}</span>
        <strong>${escapeHtml(version)}</strong>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">${escapeHtml(t('about.section.releaseNotes'))}</div>
      <div class="about-info-card">
        <div class="about-info-title">${escapeHtml(t('about.releaseSummaryTitle'))}</div>
        <div class="about-info-text">${escapeHtml(t('about.releaseSummary'))}</div>
        <div class="about-info-footnote">${escapeHtml(t('about.changelogPointer'))}</div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">${escapeHtml(t('about.section.thirdParty'))}</div>
      <div class="about-info-card">
        <div class="about-info-text">
          ${escapeHtml(t('about.thirdPartyIntro'))}
        </div>
        <div class="form-action-row about-action-row">
          <button type="button" class="secondary-btn action-btn" data-open-third-party-notices>
            ${escapeHtml(t('about.thirdPartyButton'))}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderThirdPartyNoticesDialog() {
  if (!thirdPartyNoticesVisible) {
    return '';
  }

  const entries = [
    {
      name: 'Electron',
      purpose: t('thirdParty.electron.purpose'),
      notice: t('thirdParty.electron.notice')
    },
    {
      name: 'Electron Forge',
      purpose: t('thirdParty.forge.purpose'),
      notice: t('thirdParty.forge.notice')
    },
    {
      name: 'Vite',
      purpose: t('thirdParty.vite.purpose'),
      notice: t('thirdParty.vite.notice')
    },
    {
      name: 'Prisma',
      purpose: t('thirdParty.prisma.purpose'),
      notice: t('thirdParty.prisma.notice')
    },
    {
      name: 'better-sqlite3',
      purpose: t('thirdParty.betterSqlite3.purpose'),
      notice: t('thirdParty.betterSqlite3.notice')
    }
  ] as const;

  return `
    <div class="about-modal-mask" id="third-party-notices-mask">
      <div
        class="about-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="third-party-notices-title"
      >
        <div class="about-modal-header">
          <div>
            <div id="third-party-notices-title" class="about-modal-title">${escapeHtml(t('thirdParty.dialogTitle'))}</div>
            <div class="about-modal-subtitle">${escapeHtml(t('thirdParty.dialogSubtitle'))}</div>
          </div>
          <button id="third-party-notices-close-btn" class="secondary-btn" type="button">${escapeHtml(t('common.close'))}</button>
        </div>

        <div class="about-info-card">
          <div class="about-info-text">
            ${escapeHtml(t('thirdParty.summary'))}
          </div>
        </div>

        <div class="third-party-notices-list">
          ${entries.map(
            (entry) => `
              <div class="third-party-notice-card">
                <div class="third-party-notice-header">
                  <strong>${escapeHtml(entry.name)}</strong>
                  <span>${escapeHtml(entry.purpose)}</span>
                </div>
                <div class="third-party-notice-text">${escapeHtml(entry.notice)}</div>
              </div>
            `
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

function bindAboutDialogEvents() {
  document.getElementById('about-dialog-close-btn')?.addEventListener('click', () => {
    aboutDialogVisible = false;
    requestRender(true);
  });

  document.getElementById('about-dialog-mask')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      aboutDialogVisible = false;
      requestRender(true);
    }
  });
}

function bindThirdPartyNoticesEvents(preserveContentScroll = false) {
  document.getElementById('third-party-notices-close-btn')?.addEventListener('click', () => {
    thirdPartyNoticesVisible = false;
    requestRender(preserveContentScroll);
  });

  document.getElementById('third-party-notices-mask')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      thirdPartyNoticesVisible = false;
      requestRender(preserveContentScroll);
    }
  });
}

function buildAnalysisChartTitle(chartType: AnalysisChartType) {
  return chartType === 'scalar'
    ? t('analysis.chartTitle.scalarDefault')
    : t('analysis.chartTitle.structuredDefault');
}

function getAnalysisAutoChartTitle(chart: AnalysisChartCard, fallbackTitle = '') {
  const hasSeries =
    chart.chartType === 'scalar' ? chart.scalarSeries.length > 0 : chart.structuredSeries.length > 0;

  if (!hasSeries) {
    return fallbackTitle.trim() || buildAnalysisChartTitle(chart.chartType);
  }

  return composeAnalysisChartTitle(chart);
}

function getAnalysisEffectiveChartTitle(chart: AnalysisChartCard, fallbackTitle = '') {
  const customTitle = chart.customTitle?.trim();
  if (customTitle) {
    return customTitle;
  }

  return getAnalysisAutoChartTitle(chart, fallbackTitle);
}

function composeAnalysisChartTitle(chart: AnalysisChartCard) {
  if (chart.chartType === 'scalar') {
    const visibleScalarSeries = getVisibleAnalysisScalarSeries(chart);
    const referenceSeries = visibleScalarSeries[0] || chart.scalarSeries[0];
    const xLabel = referenceSeries?.xSourceLabel || '横轴字段';
    const yLabels = Array.from(
      new Set((visibleScalarSeries.length ? visibleScalarSeries : chart.scalarSeries).map((series) => series.yItemName))
    );

    if (!yLabels.length) {
      return `数值指标 - ${xLabel}`;
    }

    return `${yLabels.join(' / ')} - ${xLabel}`;
  }

  const visibleStructuredSeries = getVisibleAnalysisStructuredSeries(chart);
  const firstSeries = visibleStructuredSeries[0] || chart.structuredSeries[0];
  if (!firstSeries) {
    return '结构化数据比较';
  }

  const knownPurposeLabels = Array.from(
    new Set(
      (visibleStructuredSeries.length ? visibleStructuredSeries : chart.structuredSeries)
        .map((series) => getStructuredBlockPurposeLabel(series.purposeType))
        .filter((label) => label && label !== '未指定')
    )
  );

  if (knownPurposeLabels.length === 1) {
    return `${knownPurposeLabels[0]} 数据比较`;
  }

  return `${firstSeries.yLabel} - ${firstSeries.xLabel}`;
}

function buildAnalysisChart(chartType: AnalysisChartType): AnalysisChartCard {
  return {
    id: generateId(),
    chartType,
    title: buildAnalysisChartTitle(chartType),
    customTitle: null,
    scalarSeries: [],
    structuredSeries: [],
    viewport: null,
    selectionNotice: '',
    statusMessages: []
  };
}

function getAnalysisRecordEntry(experimentId: number) {
  return analysisRecords.find((entry) => entry.listItem.id === experimentId) || null;
}

function getAnalysisScalarMetricOptions(recordIds: number[]) {
  if (!recordIds.length) {
    return [];
  }

  const nameSet = new Set<string>();

  analysisRecords
    .filter((entry) => recordIds.includes(entry.listItem.id))
    .forEach((entry) => {
      entry.detail.dataItems.forEach((item) => {
        if (!item.itemName.trim()) return;
        if (resolveScalarItemRole(item) !== 'metric') return;
        if (!isScalarValueLikelyNumeric(item.itemValue)) return;
        nameSet.add(item.itemName.trim());
      });
    });

  return Array.from(nameSet).sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function buildAnalysisStep1Value(
  detail: ExperimentDetail,
  fieldKey: AnalysisStep1FieldKey
): {
  mode: AnalysisScalarAxisMode;
  xNumeric: number;
  xLabel: string;
  xRaw: string;
  xUnit: string;
} | null {
  const rawValueMap: Record<AnalysisStep1FieldKey, string> = {
    testProject: detail.testProject,
    sampleCode: detail.sampleCode,
    tester: detail.tester,
    instrument: detail.instrument,
    testTime: detail.testTime,
    sampleOwner: detail.sampleOwner || '未填写'
  };

  const rawValue = rawValueMap[fieldKey] || '';

  if (fieldKey === 'testTime') {
    const timestamp = Date.parse(rawValue);

    if (!Number.isFinite(timestamp)) {
      return null;
    }

    return {
      mode: 'numeric',
      xNumeric: timestamp,
      xLabel: rawValue,
      xRaw: rawValue,
      xUnit: 'datetime'
    };
  }

  return {
    mode: 'categorical',
    xNumeric: 0,
    xLabel: rawValue || '未填写',
    xRaw: rawValue || '未填写',
    xUnit: ''
  };
}

function buildAnalysisScalarSeries(
  chart: AnalysisChartCard,
  composer: Extract<AnalysisComposerState, { chartType: 'scalar' }>
): { series?: AnalysisScalarSeries; error?: string } {
  if (!composer.selectedRecordIds.length) {
    return { error: '请至少勾选一条来源记录' };
  }

  if (!composer.yItemName.trim()) {
    return { error: '请选择 Y 轴结果指标' };
  }

  const points: AnalysisScalarPoint[] = [];
  const skippedRecordIds: number[] = [];
  const xUnits = new Set<string>();
  const yUnits = new Set<string>();
  let xMode: AnalysisScalarAxisMode = 'categorical';

  composer.selectedRecordIds.forEach((recordId) => {
    const entry = getAnalysisRecordEntry(recordId);
    if (!entry?.detail) {
      skippedRecordIds.push(recordId);
      return;
    }

    let xValue:
      | {
          mode: AnalysisScalarAxisMode;
          xNumeric: number;
          xLabel: string;
          xRaw: string;
          xUnit: string;
        }
      | null = null;

    xValue = buildAnalysisStep1Value(entry.detail, composer.step1FieldKey);

    const yItem = entry.detail.dataItems.find(
      (item) =>
        item.itemName.trim() === composer.yItemName.trim() &&
        resolveScalarItemRole(item) === 'metric' &&
        isScalarValueLikelyNumeric(item.itemValue)
    );

    if (!xValue || !yItem) {
      skippedRecordIds.push(recordId);
      return;
    }

    xMode = xValue.mode;
    xUnits.add(xValue.xUnit);
    yUnits.add(yItem.itemUnit || '');

    points.push({
      recordId,
      recordDisplayName: entry.detail.displayName,
      xNumeric: xValue.xNumeric,
      xLabel: xValue.xLabel,
      xRaw: xValue.xRaw,
      yValue: Number(yItem.itemValue)
    });
  });

  if (!points.length) {
    return { error: '当前选择下没有可绘制的数据点，请更换记录或结果指标。' };
  }

  if (xUnits.size > 1 || yUnits.size > 1) {
    return { error: '所选记录中的轴单位不一致，当前标量图不会自动混合不兼容单位' };
  }

  const xUnit = Array.from(xUnits)[0] || '';
  const yUnit = Array.from(yUnits)[0] || '';
  const xSourceLabel = getAnalysisStep1FieldLabel(composer.step1FieldKey);
  const xSourceValue = `step1:${composer.step1FieldKey}`;

  if (chart.scalarSeries.length) {
    const firstSeries = chart.scalarSeries[0];

    if (firstSeries.xMode !== xMode || firstSeries.xSourceValue !== xSourceValue) {
      return { error: '同一张标量图中的多条序列必须共享相同的 X 轴来源' };
    }

    if (
      normalizeAnalysisUnit(firstSeries.xUnit) !== normalizeAnalysisUnit(xUnit) ||
      normalizeAnalysisUnit(firstSeries.yUnit) !== normalizeAnalysisUnit(yUnit)
    ) {
      return { error: '同一张标量图中的多条序列不能静默混用不同单位' };
    }
  }

  const sortedPoints = [...points].sort((left, right) => {
    if (xMode === 'numeric') {
      return left.xNumeric - right.xNumeric;
    }

    return left.xLabel.localeCompare(right.xLabel, 'zh-CN');
  });

  return {
    series: {
      id: generateId(),
      name: composer.yItemName.trim(),
      defaultName: composer.yItemName.trim(),
      color: getAnalysisChartColor(chart.scalarSeries.length),
      defaultColor: getAnalysisChartColor(chart.scalarSeries.length),
      hidden: false,
      recordIds: [...composer.selectedRecordIds],
      xSourceLabel,
      xSourceValue,
      xMode,
      xUnit,
      yItemName: composer.yItemName.trim(),
      yUnit,
      points: sortedPoints,
      skippedRecordIds
    }
  };
}

function buildAnalysisStructuredSeriesFromBlock(
  chart: AnalysisChartCard,
  recordId: number,
  blockId: number
): { series?: AnalysisStructuredSeries; error?: string } {
  const entry = getAnalysisRecordEntry(recordId);
  if (!entry?.detail) {
    return { error: t('analysis.composer.recordMissing') };
  }

  const block = entry.detail.templateBlocks.find((item) => item.id === blockId);
  if (!block) {
    return { error: t('analysis.composer.blockMissing') };
  }

  const xLabel = block.templateType === XY_TEMPLATE_TYPE ? block.xLabel : block.spectrumAxisLabel;
  const xUnit = block.templateType === XY_TEMPLATE_TYPE ? block.xUnit : block.spectrumAxisUnit;
  const yLabel = block.templateType === XY_TEMPLATE_TYPE ? block.yLabel : block.signalLabel;
  const yUnit = block.templateType === XY_TEMPLATE_TYPE ? block.yUnit : block.signalUnit;
  const defaultName = getAnalysisStructuredBlockDisplayName(block);
  const defaultColor = getAnalysisChartColor(chart.structuredSeries.length);

  return {
    series: {
      id: generateId(),
      name: defaultName,
      defaultName,
      color: defaultColor,
      defaultColor,
      hidden: false,
      sourceBlockDisplayName: defaultName,
      experimentId: entry.detail.id,
      recordDisplayName: entry.detail.displayName,
      blockId: block.id,
      blockTitle: block.blockTitle,
      purposeType: block.purposeType || '',
      templateType: block.templateType,
      xLabel,
      xUnit,
      yLabel,
      yUnit,
      note: block.note,
      points: [...block.points]
    }
  };
}

function buildAnalysisStructuredSeries(
  chart: AnalysisChartCard,
  composer: Extract<AnalysisComposerState, { chartType: 'structured' }>
): { seriesList?: AnalysisStructuredSeries[]; error?: string; skippedRecordIds: number[] } {
  if (!composer.selectedRecordIds.length || !composer.selectedBlockName.trim()) {
    return { error: t('analysis.composer.selectionRequired'), skippedRecordIds: [] };
  }

  const seriesList: AnalysisStructuredSeries[] = [];
  const skippedRecordIds: number[] = [];

  composer.selectedRecordIds.forEach((recordId) => {
    const entry = getAnalysisRecordEntry(recordId);
    const matchedBlock = entry?.detail.templateBlocks.find(
      (block) => getAnalysisStructuredBlockDisplayName(block) === composer.selectedBlockName
    );

    if (!matchedBlock) {
      skippedRecordIds.push(recordId);
      return;
    }

    const buildResult = buildAnalysisStructuredSeriesFromBlock(
      {
        ...chart,
        structuredSeries: [...chart.structuredSeries, ...seriesList]
      },
      recordId,
      matchedBlock.id
    );

    if (buildResult.series) {
      seriesList.push(buildResult.series);
      return;
    }

    skippedRecordIds.push(recordId);
  });

  if (!seriesList.length) {
    return { error: '当前选择下没有可绘制的结构化数据，请更换记录或数据块。', skippedRecordIds };
  }

  return { seriesList, skippedRecordIds };
}

function buildAnalysisChartStatusMessages(chart: AnalysisChartCard) {
  const messages: string[] = [];
  const hiddenSeriesCount =
    chart.chartType === 'scalar'
      ? chart.scalarSeries.filter((series) => series.hidden).length
      : chart.structuredSeries.filter((series) => series.hidden).length;

  if (chart.chartType === 'scalar') {
    chart.scalarSeries.forEach((series) => {
      if (series.skippedRecordIds.length) {
        messages.push(`序列“${series.name}”已跳过 ${series.skippedRecordIds.length} 条不含可用数值的记录`);
      }
    });

    if (hiddenSeriesCount === chart.scalarSeries.length && chart.scalarSeries.length) {
      messages.push('当前序列都已隐藏，可在图例中重新显示。');
    }

    return messages;
  }

  if (chart.selectionNotice.trim()) {
    messages.push(chart.selectionNotice.trim());
  }

  const purposeSet = new Set(
    chart.structuredSeries.map((series) => series.purposeType).filter(Boolean)
  );
  const unknownPurposeCount = chart.structuredSeries.filter((series) => !series.purposeType).length;
  const xMetaSet = new Set(
    chart.structuredSeries.map((series) => `${series.xLabel}||${series.xUnit}`)
  );
  const yMetaSet = new Set(
    chart.structuredSeries.map((series) => `${series.yLabel}||${series.yUnit}`)
  );

  if (unknownPurposeCount) {
    messages.push('包含未指定数据用途的结构化块，请谨慎解释叠加结果');
  }

  if (purposeSet.size > 1) {
    messages.push('当前结构化图混合了多种 purposeType，v1 仅提供并列可视化，不做自动语义对齐');
  }

  if (xMetaSet.size > 1 || yMetaSet.size > 1) {
    messages.push('当前结构化图的坐标标签或单位不完全一致，图中仍按各序列原始元数据显示');
  }

  if (hiddenSeriesCount === chart.structuredSeries.length && chart.structuredSeries.length) {
    messages.push('当前序列都已隐藏，可在图例中重新显示。');
  }

  return messages;
}

function restoreAnalysisChartFromPersistedConfig(
  config: PersistedAnalysisUIStateChartConfig
): AnalysisChartCard {
  let chart = buildAnalysisChart(config.chartType);
  const fallbackTitle = config.semanticTitle.trim() || chart.title;
  const customTitle = config.customTitle?.trim() || null;

  if (config.chartType === 'scalar') {
    config.scalarSeries.forEach((seriesConfig) => {
      const buildResult = buildAnalysisScalarSeries(chart, {
        chartId: chart.id,
        chartType: 'scalar',
        searchQuery: '',
        appliedSearchQuery: '',
        resultScrollTop: 0,
        crossFilters: [],
        filterDraftOpen: false,
        filterDraftField: 'sampleCode',
        filterDraftOperator: 'eq',
        filterDraftValue: '',
        filterDraftValue2: '',
        filterDraftPendingValues: [],
        selectedRecordIds: [...seriesConfig.selectedRecordIds],
        step1FieldKey: seriesConfig.xFieldKey,
        yItemName: seriesConfig.yMetricName,
        pending: false,
        error: ''
      });

      if (!buildResult.series) {
        return;
      }

      chart = {
        ...chart,
        scalarSeries: [
          ...chart.scalarSeries,
          {
            ...buildResult.series,
            hidden: Boolean(seriesConfig.hidden),
            name: seriesConfig.displayName?.trim() || buildResult.series.defaultName,
            color: seriesConfig.color || buildResult.series.defaultColor
          }
        ],
        selectionNotice: ''
      };
    });
  } else {
    const selectionNotices: string[] = [];

    config.structuredSeries.forEach((seriesConfig) => {
      const buildResult = buildAnalysisStructuredSeries(chart, {
        chartId: chart.id,
        chartType: 'structured',
        searchQuery: '',
        appliedSearchQuery: '',
        resultScrollTop: 0,
        crossFilters: [],
        filterDraftOpen: false,
        filterDraftField: 'sampleCode',
        filterDraftOperator: 'eq',
        filterDraftValue: '',
        filterDraftValue2: '',
        filterDraftPendingValues: [],
        selectedRecordIds: [...seriesConfig.selectedRecordIds],
        selectedBlockName: seriesConfig.blockDisplayName,
        pending: false,
        error: ''
      });

      if (!buildResult.seriesList?.length) {
        return;
      }

      if (buildResult.skippedRecordIds.length) {
        selectionNotices.push(
          t('analysis.composer.skippedMissingBlock', {
            count: buildResult.skippedRecordIds.length
          })
        );
      }

      chart = {
        ...chart,
        structuredSeries: [
          ...chart.structuredSeries,
          ...buildResult.seriesList.map((series) => ({
            ...series,
            hidden: Boolean(seriesConfig.hidden),
            name: seriesConfig.displayName?.trim() || series.defaultName,
            color: seriesConfig.color || series.defaultColor
          }))
        ]
      };
    });

    chart = {
      ...chart,
      selectionNotice: Array.from(new Set(selectionNotices)).join('；')
    };
  }

  const nextChart = {
    ...chart,
    customTitle,
    title: customTitle || getAnalysisAutoChartTitle(chart, fallbackTitle),
    statusMessages: [] as string[]
  };

  return {
    ...nextChart,
    statusMessages: buildAnalysisChartStatusMessages(nextChart)
  };
}

function refreshAnalysisChartsFromCatalog() {
  analysisCharts = analysisCharts.map((chart) => {
    if (chart.chartType === 'scalar') {
      const rebuiltSeries: AnalysisScalarSeries[] = [];

      chart.scalarSeries.forEach((series) => {
        const buildResult = buildAnalysisScalarSeries(
          {
            ...chart,
            scalarSeries: rebuiltSeries
          },
          {
            chartId: chart.id,
            chartType: 'scalar',
            searchQuery: '',
            appliedSearchQuery: '',
            resultScrollTop: 0,
            crossFilters: [],
            filterDraftOpen: false,
            filterDraftField: 'sampleCode',
            filterDraftOperator: 'eq',
            filterDraftValue: '',
            filterDraftValue2: '',
            filterDraftPendingValues: [],
            selectedRecordIds: [...series.recordIds],
            step1FieldKey: series.xSourceValue.startsWith('step1:')
              ? (series.xSourceValue.replace('step1:', '') as AnalysisStep1FieldKey)
              : 'testTime',
            yItemName: series.yItemName,
            pending: false,
            error: ''
          }
        );

        if (buildResult.series) {
          rebuiltSeries.push({
            ...buildResult.series,
            hidden: series.hidden,
            name: series.name,
            color: series.color,
            defaultName: buildResult.series.defaultName,
            defaultColor: buildResult.series.defaultColor
          });
        }
      });

      const nextChart: AnalysisChartCard = {
        ...chart,
        scalarSeries: rebuiltSeries,
        viewport: null
      };

      return {
        ...nextChart,
        title: getAnalysisEffectiveChartTitle(nextChart, chart.title),
        statusMessages: buildAnalysisChartStatusMessages(nextChart)
      };
    }

    const rebuiltSeries: AnalysisStructuredSeries[] = [];

    chart.structuredSeries.forEach((series) => {
      const buildResult = buildAnalysisStructuredSeriesFromBlock(
        {
          ...chart,
            structuredSeries: rebuiltSeries
        },
        series.experimentId,
        series.blockId
      );

      if (buildResult.series) {
        rebuiltSeries.push({
          ...buildResult.series,
          hidden: series.hidden,
          name: series.name,
          color: series.color,
          defaultName: buildResult.series.defaultName,
          defaultColor: buildResult.series.defaultColor,
          sourceBlockDisplayName: series.sourceBlockDisplayName
        });
      }
    });

    const nextChart: AnalysisChartCard = {
      ...chart,
      structuredSeries: rebuiltSeries,
      viewport: null
    };

    return {
      ...nextChart,
      title: getAnalysisEffectiveChartTitle(nextChart, chart.title),
      statusMessages: buildAnalysisChartStatusMessages(nextChart)
    };
  });
}

function restoreAnalysisChartsFromPersistence() {
  analysisCharts = persistedAnalysisChartConfigs.map((config) =>
    restoreAnalysisChartFromPersistedConfig(config)
  );
  analysisChartsRestoredFromPersistence = true;
}

function updateAnalysisChart(
  chartId: string,
  updater: (chart: AnalysisChartCard) => AnalysisChartCard
) {
  let updatedChart: AnalysisChartCard | null = null;
  analysisCharts = analysisCharts.map((chart) => {
    if (chart.id !== chartId) {
      return chart;
    }

    const nextChart = updater(chart);
    updatedChart = {
      ...nextChart,
      title: getAnalysisEffectiveChartTitle(nextChart, chart.title),
      statusMessages: buildAnalysisChartStatusMessages(nextChart)
    };
    return updatedChart;
  });

  if (updatedChart && analysisInspector?.chartId === chartId) {
    analysisInspector = {
      ...analysisInspector,
      chartTitle: updatedChart.title
    };
  }
}

async function loadAnalysisWorkspaceData() {
  const groups = await window.electronAPI.listExperiments({
    groupBy: 'sampleCode',
    sortOrder: 'newest'
  });
  const items = groups.flatMap((group) => group.items);
  const details = await Promise.all(
    items.map((item) => window.electronAPI.getExperimentDetail(item.id))
  );

  analysisRecords = items
    .map((item, index) => ({
      listItem: item,
      detail: details[index]
    }))
    .filter(
      (entry): entry is AnalysisRecordCatalogEntry =>
        Boolean(entry.detail)
    );
  analysisLoadError = '';
}

async function openAnalysisWorkspace() {
  currentView = 'analysis';
  analysisChartDragState = null;
  analysisExportMenuChartId = null;
  analysisExpandedChartId = null;
  analysisChartTitleEditState = null;

  await ensurePersistedAnalysisUIStateLoaded();

  if (!analysisLoading) {
    analysisLoading = true;
    analysisLoadError = '';
    requestRender(true);

    try {
      await loadAnalysisWorkspaceData();
      if (!analysisChartsRestoredFromPersistence) {
        restoreAnalysisChartsFromPersistence();
      } else {
        refreshAnalysisChartsFromCatalog();
      }
    } catch (error) {
      analysisLoadError = getErrorMessage(error) || '加载分析工作区失败';
    } finally {
      analysisLoading = false;
    }
  }

  void render();
}

function closeAnalysisComposer() {
  analysisComposer = null;
  analysisFilterCandidateQuery = '';
}

function openAnalysisComposer(chartId: string, chartType: AnalysisChartType) {
  analysisFilterCandidateQuery = '';
  analysisComposer =
    chartType === 'scalar'
      ? {
          chartId,
          chartType,
          searchQuery: '',
          appliedSearchQuery: '',
          resultScrollTop: 0,
          crossFilters: [],
          filterDraftOpen: false,
          filterDraftField: 'sampleCode',
          filterDraftOperator: 'eq',
          filterDraftValue: '',
          filterDraftValue2: '',
          filterDraftPendingValues: [],
          selectedRecordIds: [],
          step1FieldKey: 'testTime',
          yItemName: '',
          pending: false,
          error: ''
        }
      : {
          chartId,
          chartType,
          searchQuery: '',
          appliedSearchQuery: '',
          resultScrollTop: 0,
          crossFilters: [],
          filterDraftOpen: false,
          filterDraftField: 'sampleCode',
          filterDraftOperator: 'eq',
          filterDraftValue: '',
          filterDraftValue2: '',
          filterDraftPendingValues: [],
          selectedRecordIds: [],
          selectedBlockName: '',
          pending: false,
          error: ''
        };
}

function removeAnalysisChart(chartId: string) {
  analysisCharts = analysisCharts.filter((chart) => chart.id !== chartId);

  if (analysisInspector?.chartId === chartId) {
    analysisInspector = null;
  }

  if (analysisComposer?.chartId === chartId) {
    analysisComposer = null;
  }

  if (analysisExportMenuChartId === chartId) {
    analysisExportMenuChartId = null;
  }

  if (analysisExpandedChartId === chartId) {
    analysisExpandedChartId = null;
  }

  if (analysisChartTitleEditState?.chartId === chartId) {
    analysisChartTitleEditState = null;
  }

  if (analysisSeriesRenameState?.chartId === chartId) {
    analysisSeriesRenameState = null;
  }

  schedulePersistedAnalysisUIStateSave();
}

function toggleAnalysisSeriesVisibility(chartId: string, seriesId: string) {
  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  if (chart.chartType === 'scalar') {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      scalarSeries: currentChart.scalarSeries.map((series) =>
        series.id === seriesId ? { ...series, hidden: !series.hidden } : series
      ),
      viewport: null
    }));
  } else {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      structuredSeries: currentChart.structuredSeries.map((series) =>
        series.id === seriesId ? { ...series, hidden: !series.hidden } : series
      ),
      viewport: null
    }));
  }

  if (analysisInspector?.chartId === chartId) {
    analysisInspector = null;
  }

  if (
    analysisSeriesRenameState?.chartId === chartId &&
    analysisSeriesRenameState.seriesId === seriesId
  ) {
    analysisSeriesRenameState = null;
  }

  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function removeAnalysisSeries(chartId: string, seriesId: string) {
  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  if (chart.chartType === 'scalar') {
    const remainingSeries = chart.scalarSeries.filter((series) => series.id !== seriesId);

    if (!remainingSeries.length) {
      removeAnalysisChart(chartId);
      requestRender(true);
      return;
    }

    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      scalarSeries: currentChart.scalarSeries.filter((series) => series.id !== seriesId),
      viewport: null
    }));
  } else {
    const remainingSeries = chart.structuredSeries.filter((series) => series.id !== seriesId);

    if (!remainingSeries.length) {
      removeAnalysisChart(chartId);
      requestRender(true);
      return;
    }

    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      structuredSeries: currentChart.structuredSeries.filter((series) => series.id !== seriesId),
      viewport: null,
      selectionNotice: currentChart.selectionNotice
    }));
  }

  if (analysisInspector?.chartId === chartId) {
    analysisInspector = null;
  }

  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function renameAnalysisChart(chartId: string, nextTitle: string) {
  const trimmedTitle = nextTitle.trim();
  if (!trimmedTitle) {
    return;
  }

  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  updateAnalysisChart(chartId, (currentChart) => ({
    ...currentChart,
    customTitle: trimmedTitle
  }));

  analysisChartTitleEditState = null;
  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function restoreDefaultAnalysisChartTitle(chartId: string) {
  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  updateAnalysisChart(chartId, (currentChart) => ({
    ...currentChart,
    customTitle: null
  }));

  if (analysisChartTitleEditState?.chartId === chartId) {
    analysisChartTitleEditState = null;
  }

  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function renameAnalysisSeries(chartId: string, seriesId: string, nextName: string) {
  const trimmedName = nextName.trim();
  if (!trimmedName) {
    return;
  }

  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  if (chart.chartType === 'scalar') {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      scalarSeries: currentChart.scalarSeries.map((series) =>
        series.id === seriesId ? { ...series, name: trimmedName } : series
      )
    }));
  } else {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      structuredSeries: currentChart.structuredSeries.map((series) =>
        series.id === seriesId ? { ...series, name: trimmedName } : series
      )
    }));
  }

  analysisSeriesRenameState = null;
  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function restoreDefaultAnalysisSeriesName(chartId: string, seriesId: string) {
  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  if (chart.chartType === 'scalar') {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      scalarSeries: currentChart.scalarSeries.map((series) =>
        series.id === seriesId ? { ...series, name: getAnalysisSeriesDefaultName(series) } : series
      )
    }));
  } else {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      structuredSeries: currentChart.structuredSeries.map((series) =>
        series.id === seriesId ? { ...series, name: getAnalysisSeriesDefaultName(series) } : series
      )
    }));
  }

  if (
    analysisSeriesRenameState?.chartId === chartId &&
    analysisSeriesRenameState.seriesId === seriesId
  ) {
    analysisSeriesRenameState = null;
  }

  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function updateAnalysisSeriesColor(chartId: string, seriesId: string, color: string) {
  const normalizedColor = color.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(normalizedColor)) {
    return;
  }

  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  if (chart.chartType === 'scalar') {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      scalarSeries: currentChart.scalarSeries.map((series) =>
        series.id === seriesId ? { ...series, color: normalizedColor } : series
      )
    }));
  } else {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      structuredSeries: currentChart.structuredSeries.map((series) =>
        series.id === seriesId ? { ...series, color: normalizedColor } : series
      )
    }));
  }

  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function restoreDefaultAnalysisSeriesColor(chartId: string, seriesId: string) {
  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  if (chart.chartType === 'scalar') {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      scalarSeries: currentChart.scalarSeries.map((series) =>
        series.id === seriesId ? { ...series, color: getAnalysisSeriesDefaultColor(series) } : series
      )
    }));
  } else {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      structuredSeries: currentChart.structuredSeries.map((series) =>
        series.id === seriesId ? { ...series, color: getAnalysisSeriesDefaultColor(series) } : series
      )
    }));
  }

  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function moveAnalysisSeries(chartId: string, seriesId: string, direction: 'up' | 'down') {
  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  const moveSeriesInList = <T extends { id: string }>(items: T[]) => {
    const index = items.findIndex((item) => item.id === seriesId);
    if (index < 0) {
      return items;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return items;
    }

    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(targetIndex, 0, moved);
    return nextItems;
  };

  if (chart.chartType === 'scalar') {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      scalarSeries: moveSeriesInList(currentChart.scalarSeries)
    }));
  } else {
    updateAnalysisChart(chartId, (currentChart) => ({
      ...currentChart,
      structuredSeries: moveSeriesInList(currentChart.structuredSeries)
    }));
  }

  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

async function addAnalysisChart(chartType: AnalysisChartType) {
  if (!analysisRecords.length && !analysisLoading) {
    analysisLoading = true;
    analysisLoadError = '';
    requestRender(true);

    try {
      await loadAnalysisWorkspaceData();
    } catch (error) {
      analysisLoadError = getErrorMessage(error) || '加载分析工作区失败';
    } finally {
      analysisLoading = false;
    }
  }

  const chart = buildAnalysisChart(chartType);
  analysisCharts = [...analysisCharts, chart];
  openAnalysisComposer(chart.id, chartType);
  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function getAnalysisChart(chartId: string) {
  return analysisCharts.find((chart) => chart.id === chartId) || null;
}

async function confirmAddAnalysisSeries() {
  if (!analysisComposer) {
    return;
  }

  const composer = analysisComposer;

  const chart = getAnalysisChart(composer.chartId);
  if (!chart) {
    analysisComposer = null;
    requestRender(true);
    return;
  }

  analysisComposer = {
    ...composer,
    pending: true,
    error: ''
  };
  requestRender(true);

  if (composer.chartType === 'scalar') {
    const buildResult = buildAnalysisScalarSeries(chart, composer);
    if (buildResult.error || !buildResult.series) {
      analysisComposer = {
        ...composer,
        pending: false,
        error: buildResult.error || t('analysis.composer.addSeriesFailed')
      };
      requestRender(true);
      return;
    }

    updateAnalysisChart(chart.id, (currentChart) => ({
      ...currentChart,
      scalarSeries: [...currentChart.scalarSeries, buildResult.series],
      viewport: null,
      selectionNotice: ''
    }));
  } else {
    const buildResult = buildAnalysisStructuredSeries(chart, composer);
    if (buildResult.error || !buildResult.seriesList?.length) {
      analysisComposer = {
        ...composer,
        pending: false,
        error: buildResult.error || t('analysis.composer.addSeriesFailed')
      };
      requestRender(true);
      return;
    }

    updateAnalysisChart(chart.id, (currentChart) => ({
      ...currentChart,
      structuredSeries: [...currentChart.structuredSeries, ...buildResult.seriesList],
      viewport: null,
      selectionNotice: buildResult.skippedRecordIds.length
        ? t('analysis.composer.skippedMissingBlock', {
            count: buildResult.skippedRecordIds.length
          })
        : ''
    }));
  }

  analysisComposer = null;
  schedulePersistedAnalysisUIStateSave();
  requestRender(true);
}

function formatAnalysisNumber(value: number, forceScientific = false) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (forceScientific || Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)) {
    return value.toExponential(2);
  }

  return value.toFixed(3).replace(/\.?0+$/, '');
}

function formatAnalysisAxisValue(value: number, unit: string, span = 0, forceScientific = false) {
  if (unit === 'datetime') {
    const date = new Date(value);
    if (span <= 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { hour12: false });
    }
    if (span <= 3 * 24 * 60 * 60 * 1000) {
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    if (span <= 120 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  return formatAnalysisNumber(value, forceScientific);
}

function escapeCsvCell(value: string | number) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function getAnalysisChartGeometry() {
  return {
    width: 760,
    height: 340,
    marginLeft: 82,
    marginRight: 22,
    marginTop: 22,
    marginBottom: 64
  };
}

function buildAnalysisBaseViewport(chart: AnalysisChartCard) {
  if (chart.chartType === 'scalar') {
    const visibleScalarSeries = getVisibleAnalysisScalarSeries(chart);
    const sourceSeries = visibleScalarSeries.length ? visibleScalarSeries : [];
    const categories: string[] = [];
    const categoryIndexMap = new Map<string, number>();
    const xValues: number[] = [];
    const yValues: number[] = [];

    sourceSeries.forEach((series) => {
      series.points.forEach((point) => {
        const xValue =
          series.xMode === 'numeric'
            ? point.xNumeric
            : (() => {
                if (!categoryIndexMap.has(point.xLabel)) {
                  categoryIndexMap.set(point.xLabel, categories.length);
                  categories.push(point.xLabel);
                }
                return categoryIndexMap.get(point.xLabel) || 0;
              })();

        xValues.push(xValue);
        yValues.push(point.yValue);
      });
    });

    if (!xValues.length || !yValues.length) {
      return null;
    }

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const xPadding = sourceSeries[0]?.xMode === 'categorical' ? 0.5 : (xMax - xMin || 1) * 0.08;
    const yPadding = (yMax - yMin || 1) * 0.12;

    return {
      viewport: {
        xMin: xMin - xPadding,
        xMax: xMax + xPadding,
        yMin: yMin - yPadding,
        yMax: yMax + yPadding
      },
      categories
    };
  }

  const xValues: number[] = [];
  const yValues: number[] = [];
  const visibleStructuredSeries = getVisibleAnalysisStructuredSeries(chart);

  visibleStructuredSeries.forEach((series) => {
    series.points.forEach((point) => {
      xValues.push(point.x);
      yValues.push(point.y);
    });
  });

  if (!xValues.length || !yValues.length) {
    return null;
  }

  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xPadding = (xMax - xMin || 1) * 0.08;
  const yPadding = (yMax - yMin || 1) * 0.12;

  return {
    viewport: {
      xMin: xMin - xPadding,
      xMax: xMax + xPadding,
      yMin: yMin - yPadding,
      yMax: yMax + yPadding
    },
    categories: [] as string[]
  };
}

function getActiveAnalysisViewport(chart: AnalysisChartCard) {
  const base = buildAnalysisBaseViewport(chart);

  if (!base) {
    return null;
  }

  return {
    fullViewport: base.viewport,
    viewport: chart.viewport || base.viewport,
    categories: base.categories
  };
}

function clampAnalysisViewport(chart: AnalysisChartCard, viewport: AnalysisViewport) {
  const active = getActiveAnalysisViewport(chart);
  if (!active) {
    return viewport;
  }

  const full = active.fullViewport;
  const xSpan = Math.min(viewport.xMax - viewport.xMin, full.xMax - full.xMin);
  const ySpan = Math.min(viewport.yMax - viewport.yMin, full.yMax - full.yMin);

  let xMin = viewport.xMin;
  let xMax = viewport.xMax;
  let yMin = viewport.yMin;
  let yMax = viewport.yMax;

  if (xMin < full.xMin) {
    xMin = full.xMin;
    xMax = xMin + xSpan;
  }
  if (xMax > full.xMax) {
    xMax = full.xMax;
    xMin = xMax - xSpan;
  }
  if (yMin < full.yMin) {
    yMin = full.yMin;
    yMax = yMin + ySpan;
  }
  if (yMax > full.yMax) {
    yMax = full.yMax;
    yMin = yMax - ySpan;
  }

  return { xMin, xMax, yMin, yMax };
}

function setAnalysisChartVisibleRatio(chartId: string, axis: 'x' | 'y', coveragePercent: number) {
  updateAnalysisChart(chartId, (chart) => {
    const active = getActiveAnalysisViewport(chart);
    if (!active) {
      return chart;
    }

    const clampedPercent = Math.max(5, Math.min(100, coveragePercent));
    const { fullViewport, viewport } = active;
    const centerX = (viewport.xMin + viewport.xMax) / 2;
    const centerY = (viewport.yMin + viewport.yMax) / 2;
    const fullXSpan = fullViewport.xMax - fullViewport.xMin || 1;
    const fullYSpan = fullViewport.yMax - fullViewport.yMin || 1;
    const nextXSpan = axis === 'x' ? fullXSpan * (clampedPercent / 100) : viewport.xMax - viewport.xMin;
    const nextYSpan = axis === 'y' ? fullYSpan * (clampedPercent / 100) : viewport.yMax - viewport.yMin;

    return {
      ...chart,
      viewport: clampAnalysisViewport(chart, {
        xMin: centerX - nextXSpan / 2,
        xMax: centerX + nextXSpan / 2,
        yMin: centerY - nextYSpan / 2,
        yMax: centerY + nextYSpan / 2
      })
    };
  });
  requestRender(true);
}

function scaleAnalysisValue(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number
) {
  if (domainMax === domainMin) {
    return (rangeMin + rangeMax) / 2;
  }

  const ratio = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + ratio * (rangeMax - rangeMin);
}

function buildAnalysisTickValues(
  min: number,
  max: number,
  pixelLength: number,
  targetPixelGap = 96,
  minTickCount = 2,
  maxTickCount = 8
) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  if (min === max) {
    return [min];
  }

  const span = max - min;
  const desiredTickCount = Math.min(
    maxTickCount,
    Math.max(minTickCount, Math.round(pixelLength / targetPixelGap) + 1)
  );
  const roughStep = span / Math.max(1, desiredTickCount - 1);
  let step = roughStep;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const magnitude = 10 ** Math.floor(Math.log10(Math.abs(step) || 1));
    const normalized = step / magnitude;
    const niceBase = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    const niceStep = niceBase * magnitude;
    const start = Math.ceil(min / niceStep) * niceStep;
    const end = Math.floor(max / niceStep) * niceStep;
    const values: number[] = [];

    for (let value = start; value <= end + niceStep * 0.25; value += niceStep) {
      values.push(Number(value.toFixed(12)));
    }

    if (values.length >= minTickCount && values.length <= maxTickCount) {
      return values;
    }

    step = values.length < minTickCount ? niceStep / 2 : niceStep * 1.25;
  }

  return [min, max];
}

function buildAnalysisCategoryTicks(categories: string[], viewport: AnalysisViewport, maxTickCount: number) {
  const visible = categories
    .map((label, index) => ({ label, value: index }))
    .filter((item) => item.value >= viewport.xMin && item.value <= viewport.xMax);

  if (visible.length <= maxTickCount) {
    return visible;
  }

  const step = Math.max(1, Math.ceil(visible.length / maxTickCount));
  return visible.filter((item, index) => index % step === 0 || index === visible.length - 1);
}

function buildAnalysisChartSvg(chart: AnalysisChartCard, exportMode = false) {
  const geometry = getAnalysisChartGeometry();
  const plotWidth = geometry.width - geometry.marginLeft - geometry.marginRight;
  const plotHeight = geometry.height - geometry.marginTop - geometry.marginBottom;
  const active = getActiveAnalysisViewport(chart);

  if (!active) {
    return `
      <svg viewBox="0 0 ${geometry.width} ${geometry.height}" class="analysis-chart-svg" ${
        exportMode ? 'xmlns="http://www.w3.org/2000/svg"' : ''
      }>
        <rect x="0" y="0" width="${geometry.width}" height="${geometry.height}" fill="#ffffff" />
        <text x="${geometry.width / 2}" y="${geometry.height / 2}" text-anchor="middle" fill="#64748b" font-size="14">
          ${
            chart.chartType === 'scalar'
              ? chart.scalarSeries.length
                ? t('analysis.chartHiddenSeriesNote')
                : t('analysis.chartNoVisibleData')
              : chart.structuredSeries.length
                ? t('analysis.chartHiddenSeriesNote')
                : t('analysis.chartNoVisibleData')
          }
        </text>
      </svg>
    `;
  }

  const { viewport, categories } = active;
  const xAxisTitle =
    chart.chartType === 'scalar'
      ? chart.scalarSeries[0]
        ? `${chart.scalarSeries[0].xSourceLabel}${chart.scalarSeries[0].xUnit ? ` (${chart.scalarSeries[0].xUnit})` : ''}`
        : '横轴'
      : chart.structuredSeries[0]
        ? `${chart.structuredSeries[0].xLabel}${chart.structuredSeries[0].xUnit ? ` (${chart.structuredSeries[0].xUnit})` : ''}`
        : '横轴';
  const yAxisTitle =
    chart.chartType === 'scalar'
      ? chart.scalarSeries[0]
        ? `${chart.scalarSeries[0].yItemName}${chart.scalarSeries[0].yUnit ? ` (${chart.scalarSeries[0].yUnit})` : ''}`
        : '纵轴'
      : chart.structuredSeries[0]
        ? `${chart.structuredSeries[0].yLabel}${chart.structuredSeries[0].yUnit ? ` (${chart.structuredSeries[0].yUnit})` : ''}`
        : '纵轴';
  const xTickMaxCount = Math.max(2, Math.floor(plotWidth / 96));
  const yTickTargetGap = 54;
  const xAxisUnit =
    chart.chartType === 'scalar' && chart.scalarSeries[0]?.xUnit
      ? chart.scalarSeries[0].xUnit
      : chart.chartType === 'structured' && chart.structuredSeries[0]?.xUnit
        ? chart.structuredSeries[0].xUnit
        : '';
  const xTicks =
    chart.chartType === 'scalar' && chart.scalarSeries[0]?.xMode === 'categorical'
      ? buildAnalysisCategoryTicks(categories, viewport, xTickMaxCount)
      : buildAnalysisTickValues(viewport.xMin, viewport.xMax, plotWidth, xAxisUnit === 'datetime' ? 120 : 96);
  const yTicks = buildAnalysisTickValues(viewport.yMin, viewport.yMax, plotHeight, yTickTargetGap, 4, 6);
  const useScientificYTicks = yTicks.some(
    (tick) => Math.abs(tick) >= 1000 || (Math.abs(tick) > 0 && Math.abs(tick) < 0.01)
  );
  const shouldRotateXLabels = xTicks.length > 6 || xTicks.some((tick) => {
    const label =
      typeof tick === 'number'
        ? formatAnalysisAxisValue(tick, xAxisUnit, viewport.xMax - viewport.xMin)
        : tick.label;
    return label.length > 10;
  });

  const xScale = (value: number) =>
    scaleAnalysisValue(
      value,
      viewport.xMin,
      viewport.xMax,
      geometry.marginLeft,
      geometry.marginLeft + plotWidth
    );
  const yScale = (value: number) =>
    scaleAnalysisValue(
      value,
      viewport.yMin,
      viewport.yMax,
      geometry.marginTop + plotHeight,
      geometry.marginTop
    );

  const seriesMarkup =
    chart.chartType === 'scalar'
      ? getVisibleAnalysisScalarSeries(chart)
          .map((series) => {
            const categoryIndexMap = new Map(categories.map((label, index) => [label, index]));
            const plotPoints = series.points
              .map((point) => ({
                ...point,
                plotX:
                  series.xMode === 'numeric'
                    ? point.xNumeric
                    : categoryIndexMap.get(point.xLabel) || 0
              }))
              .filter(
                (point) =>
                  point.plotX >= viewport.xMin &&
                  point.plotX <= viewport.xMax &&
                  point.yValue >= viewport.yMin &&
                  point.yValue <= viewport.yMax
              );

            const polylinePoints = plotPoints
              .map((point) => `${xScale(point.plotX)},${yScale(point.yValue)}`)
              .join(' ');

            return `
              ${plotPoints.length > 1
                ? `<polyline points="${polylinePoints}" fill="none" stroke="${series.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`
                : ''}
              ${plotPoints
                .map(
                  (point) => `
                    <circle
                      cx="${xScale(point.plotX)}"
                      cy="${yScale(point.yValue)}"
                      r="4.5"
                      fill="${series.color}"
                      stroke="#ffffff"
                      stroke-width="1.5"
                      ${exportMode ? '' : `data-analysis-scalar-point="${chart.id}::${series.id}::${point.recordId}"`}
                    />
                  `
                )
                .join('')}
            `;
          })
          .join('')
      : getVisibleAnalysisStructuredSeries(chart)
          .map((series) => {
            const plotPoints = series.points.filter(
              (point) =>
                point.x >= viewport.xMin &&
                point.x <= viewport.xMax &&
                point.y >= viewport.yMin &&
                point.y <= viewport.yMax
            );
            const polylinePoints = plotPoints
              .map((point) => `${xScale(point.x)},${yScale(point.y)}`)
              .join(' ');

            return `
              <polyline
                points="${polylinePoints}"
                fill="none"
                stroke="${series.color}"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
              ${exportMode
                ? ''
                : `
                    <polyline
                      points="${polylinePoints}"
                      fill="none"
                      stroke="transparent"
                      stroke-width="14"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                      pointer-events="stroke"
                      data-analysis-structured-series="${chart.id}::${series.id}"
                    />
                  `}
              ${plotPoints
                .map(
                  (point) => `
                    <circle
                      cx="${xScale(point.x)}"
                      cy="${yScale(point.y)}"
                      r="2.2"
                      fill="${series.color}"
                      opacity="0.75"
                    />
                  `
                )
                .join('')}
            `;
          })
          .join('');

  return `
    <svg
      viewBox="0 0 ${geometry.width} ${geometry.height}"
      class="analysis-chart-svg"
      ${exportMode ? 'xmlns="http://www.w3.org/2000/svg"' : ''}
    >
      <rect x="0" y="0" width="${geometry.width}" height="${geometry.height}" fill="#ffffff" />
      <rect
        x="${geometry.marginLeft}"
        y="${geometry.marginTop}"
        width="${plotWidth}"
        height="${plotHeight}"
        fill="#fbfcfe"
        stroke="#cfd8e3"
      />
      ${yTicks
        .map((tick) => {
          const y = yScale(tick);
          return `
            <line x1="${geometry.marginLeft}" y1="${y}" x2="${geometry.marginLeft + plotWidth}" y2="${y}" stroke="#d7dee8" stroke-dasharray="3 4" />
            <line x1="${geometry.marginLeft - 6}" y1="${y}" x2="${geometry.marginLeft}" y2="${y}" stroke="#4b5c71" />
            <text x="${geometry.marginLeft - 10}" y="${y + 4}" text-anchor="end" fill="#344256" font-size="11">
              ${escapeHtml(formatAnalysisAxisValue(tick, '', 0, useScientificYTicks))}
            </text>
          `;
        })
        .join('')}
      ${xTicks
        .map((tick) => {
          const tickValue = typeof tick === 'number' ? tick : tick.value;
          const tickLabel =
            typeof tick === 'number'
              ? formatAnalysisAxisValue(tick, xAxisUnit, viewport.xMax - viewport.xMin)
              : tick.label;
          const x = xScale(tickValue);
          const tickTextY = geometry.marginTop + plotHeight + (shouldRotateXLabels ? 28 : 20);

          return `
            <line x1="${x}" y1="${geometry.marginTop}" x2="${x}" y2="${geometry.marginTop + plotHeight}" stroke="#e0e6ee" />
            <line x1="${x}" y1="${geometry.marginTop + plotHeight}" x2="${x}" y2="${geometry.marginTop + plotHeight + 6}" stroke="#4b5c71" />
            <text
              x="${x}"
              y="${tickTextY}"
              text-anchor="${shouldRotateXLabels ? 'end' : 'middle'}"
              fill="#344256"
              font-size="11"
              ${shouldRotateXLabels ? `transform="rotate(-28 ${x} ${tickTextY})"` : ''}
            >
              ${escapeHtml(tickLabel)}
            </text>
          `;
        })
        .join('')}
      <line
        x1="${geometry.marginLeft}"
        y1="${geometry.marginTop + plotHeight}"
        x2="${geometry.marginLeft + plotWidth}"
        y2="${geometry.marginTop + plotHeight}"
        stroke="#3f5269"
        stroke-width="1.25"
      />
      <line
        x1="${geometry.marginLeft}"
        y1="${geometry.marginTop}"
        x2="${geometry.marginLeft}"
        y2="${geometry.marginTop + plotHeight}"
        stroke="#3f5269"
        stroke-width="1.25"
      />
      ${seriesMarkup}
      <text
        x="${geometry.marginLeft + plotWidth / 2}"
        y="${geometry.height - 8}"
        text-anchor="middle"
        fill="#233246"
        font-size="12"
        font-weight="600"
      >
        ${escapeHtml(xAxisTitle)}
      </text>
      <text
        x="18"
        y="${geometry.marginTop + plotHeight / 2}"
        text-anchor="middle"
        fill="#233246"
        font-size="12"
        font-weight="600"
        transform="rotate(-90 18 ${geometry.marginTop + plotHeight / 2})"
      >
        ${escapeHtml(yAxisTitle)}
      </text>
    </svg>
  `;
}

function buildAnalysisChartDataCsv(chart: AnalysisChartCard) {
  if (chart.chartType === 'scalar') {
    const rows = [
      ['seriesName', 'recordId', 'recordDisplayName', 'xSource', 'xValue', 'xUnit', 'yName', 'yValue', 'yUnit']
    ];

    getVisibleAnalysisScalarSeries(chart).forEach((series) => {
      series.points.forEach((point) => {
        rows.push([
          series.name,
          String(point.recordId),
          point.recordDisplayName,
          series.xSourceLabel,
          point.xRaw,
          series.xUnit,
          series.yItemName,
          String(point.yValue),
          series.yUnit
        ]);
      });
    });

    return rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n');
  }

  const rows = [
    ['seriesName', 'recordId', 'recordDisplayName', 'blockTitle', 'purposeType', 'xLabel', 'xUnit', 'yLabel', 'yUnit', 'x', 'y']
  ];

  getVisibleAnalysisStructuredSeries(chart).forEach((series) => {
    series.points.forEach((point) => {
      rows.push([
        series.name,
        String(series.experimentId),
        series.recordDisplayName,
        series.blockTitle,
        series.purposeType || '',
        series.xLabel,
        series.xUnit,
        series.yLabel,
        series.yUnit,
        String(point.x),
        String(point.y)
      ]);
    });
  });

  return rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n');
}

function buildAnalysisExportBaseName(chart: AnalysisChartCard) {
  const safeTitle = chart.title.replace(/[\\/:*?"<>|]/g, '-');
  return `${safeTitle || 'analysis-chart'}-${chart.id.slice(0, 8)}`;
}

async function exportAnalysisChartImage(chartId: string) {
  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  const result = await window.electronAPI.saveGeneratedFile({
    title: '导出图像',
    defaultFileName: `${buildAnalysisExportBaseName(chart)}.svg`,
    filters: [{ name: 'SVG Image', extensions: ['svg'] }],
    textContent: buildAnalysisChartSvg(chart, true)
  });

  if (!result.success && !result.canceled) {
    alert(result.error || '导出图像失败');
  }
}

async function exportAnalysisChartData(chartId: string) {
  const chart = getAnalysisChart(chartId);
  if (!chart) {
    return;
  }

  const result = await window.electronAPI.saveGeneratedFile({
    title: '导出当前图表数据',
    defaultFileName: `${buildAnalysisExportBaseName(chart)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    textContent: buildAnalysisChartDataCsv(chart)
  });

  if (!result.success && !result.canceled) {
    alert(result.error || '导出图表数据失败');
  }
}

function zoomAnalysisChart(chartId: string, factor: number) {
  updateAnalysisChart(chartId, (chart) => {
    const active = getActiveAnalysisViewport(chart);
    if (!active) {
      return chart;
    }

    const { viewport } = active;
    const centerX = (viewport.xMin + viewport.xMax) / 2;
    const centerY = (viewport.yMin + viewport.yMax) / 2;
    const nextWidth = Math.max((viewport.xMax - viewport.xMin) * factor, 0.0001);
    const nextHeight = Math.max((viewport.yMax - viewport.yMin) * factor, 0.0001);

    return {
      ...chart,
      viewport: clampAnalysisViewport(chart, {
        xMin: centerX - nextWidth / 2,
        xMax: centerX + nextWidth / 2,
        yMin: centerY - nextHeight / 2,
        yMax: centerY + nextHeight / 2
      })
    };
  });
  requestRender(true);
}

function zoomAnalysisChartAt(chartId: string, factor: number, xRatio: number, yRatio: number) {
  updateAnalysisChart(chartId, (chart) => {
    const active = getActiveAnalysisViewport(chart);
    if (!active) {
      return chart;
    }

    const { viewport } = active;
    const width = viewport.xMax - viewport.xMin;
    const height = viewport.yMax - viewport.yMin;
    const anchorX = viewport.xMin + width * xRatio;
    const anchorY = viewport.yMax - height * yRatio;
    const nextWidth = Math.max(width * factor, 0.0001);
    const nextHeight = Math.max(height * factor, 0.0001);

    return {
      ...chart,
      viewport: clampAnalysisViewport(chart, {
        xMin: anchorX - nextWidth * xRatio,
        xMax: anchorX + nextWidth * (1 - xRatio),
        yMin: anchorY - nextHeight * (1 - yRatio),
        yMax: anchorY + nextHeight * yRatio
      })
    };
  });
  requestRender(true);
}

function panAnalysisChart(chartId: string, xRatio: number, yRatio: number) {
  updateAnalysisChart(chartId, (chart) => {
    const active = getActiveAnalysisViewport(chart);
    if (!active) {
      return chart;
    }

    const { viewport } = active;
    const xShift = (viewport.xMax - viewport.xMin) * xRatio;
    const yShift = (viewport.yMax - viewport.yMin) * yRatio;

    return {
      ...chart,
      viewport: clampAnalysisViewport(chart, {
        xMin: viewport.xMin + xShift,
        xMax: viewport.xMax + xShift,
        yMin: viewport.yMin + yShift,
        yMax: viewport.yMax + yShift
      })
    };
  });
  requestRender(true);
}

function resetAnalysisChartViewport(chartId: string) {
  updateAnalysisChart(chartId, (chart) => ({
    ...chart,
    viewport: null
  }));
  requestRender(true);
}

function renderAnalysisDataList(
  items: Array<{ label: string; value: string }>,
  emptyText = t('analysis.emptyGeneric')
) {
  if (!items.length) {
    return `<div class="empty-tip">${emptyText}</div>`;
  }

  return `
    <div class="detail-list analysis-detail-list">
      ${items.map((item) => renderDetailPair(item.label, item.value || '-')).join('')}
    </div>
  `;
}

function renderAnalysisEmptyState(title: string, note?: string, compact = false) {
  return `
    <div class="analysis-empty-state ${compact ? 'compact' : ''}">
      <div class="analysis-empty-title">${escapeHtml(title)}</div>
      ${note ? `<div class="analysis-empty-note">${escapeHtml(note)}</div>` : ''}
    </div>
  `;
}

function renderAnalysisSection(title: string, body: string) {
  return `
    <section class="analysis-detail-section">
      <div class="analysis-detail-section-title">${escapeHtml(title)}</div>
      ${body}
    </section>
  `;
}

function renderAnalysisScalarSummaryList(
  items: ExperimentDetail['dataItems'],
  activeName?: string
) {
  const metrics = items.filter((item) => resolveScalarItemRole(item) === 'metric');

  if (!metrics.length) {
    return `<div class="empty-tip">${escapeHtml(t('analysis.emptyMetrics'))}</div>`;
  }

  return `
    <div class="analysis-summary-list">
      ${metrics
        .map((item) => {
          const isActive = item.itemName.trim() === (activeName || '').trim();
          return `
            <div class="analysis-summary-item ${isActive ? 'active' : ''}">
              <div class="analysis-summary-key">${escapeHtml(item.itemName)}</div>
              <div class="analysis-summary-value">
                ${escapeHtml(item.itemValue)}${item.itemUnit ? ` ${escapeHtml(item.itemUnit)}` : ''}
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderAnalysisBlockSummaryList(
  blocks: ExperimentDetail['templateBlocks'],
  activeBlockId?: number
) {
  if (!blocks.length) {
    return `<div class="empty-tip">${escapeHtml(t('analysis.emptyBlocks'))}</div>`;
  }

  return `
    <div class="analysis-summary-list">
      ${blocks
        .map((block) => {
          const xLabel = block.templateType === XY_TEMPLATE_TYPE ? block.xLabel : block.spectrumAxisLabel;
          const xUnit = block.templateType === XY_TEMPLATE_TYPE ? block.xUnit : block.spectrumAxisUnit;
          const yLabel = block.templateType === XY_TEMPLATE_TYPE ? block.yLabel : block.signalLabel;
          const yUnit = block.templateType === XY_TEMPLATE_TYPE ? block.yUnit : block.signalUnit;

          return `
            <div class="analysis-summary-item ${block.id === activeBlockId ? 'active' : ''}">
              <div class="analysis-summary-key">${escapeHtml(getAnalysisStructuredBlockDisplayName(block))}</div>
              <div class="analysis-summary-value">
                ${escapeHtml(getStructuredBlockPurposeLabel(block.purposeType || ''))}
                · ${escapeHtml(xLabel)}${xUnit ? ` (${escapeHtml(xUnit)})` : ''}
                → ${escapeHtml(yLabel)}${yUnit ? ` (${escapeHtml(yUnit)})` : ''}
                · ${block.points.length} 点
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderAnalysisSourceInfo(pairs: Array<{ label: string; value: string }>) {
  return renderAnalysisDataList(
    pairs.filter((pair) => pair.value.trim()),
    t('analysis.sourceInfoEmpty')
  );
}

function getAnalysisViewportCoverage(chart: AnalysisChartCard, axis: 'x' | 'y') {
  const active = getActiveAnalysisViewport(chart);
  if (!active) {
    return 100;
  }

  const fullMin = axis === 'x' ? active.fullViewport.xMin : active.fullViewport.yMin;
  const fullMax = axis === 'x' ? active.fullViewport.xMax : active.fullViewport.yMax;
  const currentMin = axis === 'x' ? active.viewport.xMin : active.viewport.yMin;
  const currentMax = axis === 'x' ? active.viewport.xMax : active.viewport.yMax;
  const fullSpan = fullMax - fullMin || 1;
  const currentSpan = currentMax - currentMin || 1;

  return Math.max(5, Math.min(100, Math.round((currentSpan / fullSpan) * 100)));
}

function renderAnalysisChartCard(chart: AnalysisChartCard, expanded = false) {
  const legendItems =
    chart.chartType === 'scalar'
      ? chart.scalarSeries
      : chart.structuredSeries;
  const isChartTitleEditing = analysisChartTitleEditState?.chartId === chart.id;
  const primaryScalarSeries = getVisibleAnalysisScalarSeries(chart)[0] || chart.scalarSeries[0];
  const primaryStructuredSeries =
    getVisibleAnalysisStructuredSeries(chart)[0] || chart.structuredSeries[0];
  const axisSummary =
    chart.chartType === 'scalar'
      ? primaryScalarSeries
        ? t('analysis.axisSummary.scalar', {
            xLabel: primaryScalarSeries.xSourceLabel,
            xUnit: primaryScalarSeries.xUnit
              ? ` (${primaryScalarSeries.xUnit})`
              : '',
            yUnit: primaryScalarSeries.yUnit
              ? ` (${primaryScalarSeries.yUnit})`
              : ''
          })
        : t('analysis.axisSummary.scalarEmpty')
      : primaryStructuredSeries
        ? t('analysis.axisSummary.structured', {
            xLabel: primaryStructuredSeries.xLabel,
            xUnit: primaryStructuredSeries.xUnit
              ? ` (${primaryStructuredSeries.xUnit})`
              : '',
            yLabel: primaryStructuredSeries.yLabel,
            yUnit: primaryStructuredSeries.yUnit
              ? ` (${primaryStructuredSeries.yUnit})`
              : ''
          })
        : t('analysis.axisSummary.structuredEmpty');

  return `
    <section class="analysis-chart-card ${expanded ? 'expanded' : ''}">
      <div class="analysis-card-header">
        <div class="analysis-card-heading">
          <div class="analysis-card-eyebrow">${escapeHtml(
            chart.chartType === 'scalar'
              ? t('analysis.chartType.scalar')
              : t('analysis.chartType.structured')
          )}</div>
          <div class="analysis-card-title-row">
            <div class="analysis-card-title">${escapeHtml(chart.title)}</div>
            <div class="analysis-card-title-actions">
              <button
                class="analysis-card-title-btn"
                type="button"
                title="${escapeHtml(t('analysis.chart.editTitle'))}"
                aria-label="${escapeHtml(t('analysis.chart.editTitle'))}"
                data-analysis-chart-title-edit="${chart.id}"
              >
                ✎
              </button>
              ${chart.customTitle
                ? `
                    <button
                      class="analysis-card-title-btn"
                      type="button"
                      title="${escapeHtml(t('analysis.chart.resetTitle'))}"
                      aria-label="${escapeHtml(t('analysis.chart.resetTitle'))}"
                      data-analysis-chart-title-reset="${chart.id}"
                    >
                      ↺
                    </button>
                  `
                : ''}
            </div>
          </div>
          ${isChartTitleEditing
            ? `
                <div class="analysis-card-title-edit-row">
                  <input
                    class="form-input analysis-card-title-input"
                    value="${escapeHtml(analysisChartTitleEditState?.value || chart.title)}"
                    data-analysis-chart-title-input="${chart.id}"
                  />
                  <button
                    class="analysis-legend-save-btn"
                    type="button"
                    data-analysis-chart-title-save="${chart.id}"
                  >
                    ${escapeHtml(t('analysis.chartTitle.save'))}
                  </button>
                  <button
                    class="analysis-legend-cancel-btn"
                    type="button"
                    data-analysis-chart-title-cancel="${chart.id}"
                  >
                    ${escapeHtml(t('analysis.chartTitle.cancel'))}
                  </button>
                  <button
                    class="analysis-legend-cancel-btn"
                    type="button"
                    data-analysis-chart-title-restore="${chart.id}"
                  >
                    ${escapeHtml(t('analysis.chartTitle.default'))}
                  </button>
                </div>
              `
            : ''}
          <div class="analysis-card-meta">${axisSummary}</div>
        </div>
        <div class="analysis-card-actions">
          <button class="analysis-icon-btn" type="button" title="${escapeHtml(t('analysis.chart.addSeries'))}" data-analysis-add-series="${chart.id}">＋</button>
          <button class="analysis-icon-btn" type="button" title="${escapeHtml(t('analysis.chart.resetView'))}" data-analysis-reset="${chart.id}">↺</button>
          <div class="analysis-export-menu-shell">
            <button
              class="analysis-icon-btn"
              type="button"
              title="${escapeHtml(t('analysis.chart.export'))}"
              data-analysis-export-toggle="${chart.id}"
            >
              ⤓
            </button>
            ${analysisExportMenuChartId === chart.id
              ? `
                  <div class="analysis-export-menu">
                    <button class="analysis-export-menu-item" type="button" data-analysis-export-image="${chart.id}">${escapeHtml(t('analysis.chart.exportImage'))}</button>
                    <button class="analysis-export-menu-item" type="button" data-analysis-export-data="${chart.id}">${escapeHtml(t('analysis.chart.exportData'))}</button>
                  </div>
                `
              : ''}
          </div>
          <button
            class="analysis-icon-btn danger"
            type="button"
            title="${escapeHtml(t('analysis.chart.delete'))}"
            data-analysis-remove-chart="${chart.id}"
          >
            ×
          </button>
        </div>
      </div>

      ${chart.statusMessages.length
        ? `
            <div class="analysis-status-list">
              ${chart.statusMessages
                .map((message) => `<div class="analysis-status-item">${escapeHtml(message)}</div>`)
                .join('')}
            </div>
          `
        : ''}

      <div class="analysis-plot-layout">
        <div class="analysis-chart-shell" data-analysis-chart-shell="${chart.id}">
          <button
            class="analysis-icon-btn analysis-expand-btn"
            type="button"
            title="${escapeHtml(expanded ? t('analysis.chart.collapse') : t('analysis.chart.expand'))}"
            data-analysis-expand="${chart.id}"
          >
            ${expanded ? '⤡' : '⤢'}
          </button>
          ${buildAnalysisChartSvg(chart)}
        </div>
      </div>

      <div class="analysis-legend-list">
        ${legendItems.length
          ? legendItems
              .map(
                (series, index) => `
                  <div class="analysis-legend-item ${series.hidden ? 'hidden-series' : ''}">
                    <div class="analysis-legend-primary-row">
                      <button
                        class="analysis-legend-main"
                        type="button"
                        title="${escapeHtml(series.hidden ? t('analysis.legend.showSeries') : t('analysis.legend.hideSeries'))}"
                        data-analysis-legend-toggle="${chart.id}::${series.id}"
                      >
                        <span class="analysis-legend-swatch" style="background:${series.color}"></span>
                        <span>${escapeHtml(series.name)}</span>
                      </button>
                      <div class="analysis-legend-actions">
                        <label class="analysis-legend-color-label" title="${escapeHtml(t('analysis.legend.adjustColor'))}">
                          <input
                            class="analysis-legend-color-input"
                            type="color"
                            value="${escapeHtml(series.color)}"
                            data-analysis-series-color="${chart.id}::${series.id}"
                          />
                        </label>
                        ${hasAnalysisCustomSeriesColor(series)
                          ? `
                              <button
                                class="analysis-legend-icon-btn"
                                type="button"
                                title="${escapeHtml(t('analysis.legend.resetColor'))}"
                                aria-label="${escapeHtml(t('analysis.legend.resetColor'))}"
                                data-analysis-series-color-reset="${chart.id}::${series.id}"
                              >
                                ↺
                              </button>
                            `
                          : ''}
                        <button
                          class="analysis-legend-icon-btn"
                          type="button"
                          title="${escapeHtml(t('analysis.legend.moveUp'))}"
                          aria-label="${escapeHtml(t('analysis.legend.moveUp'))}"
                          data-analysis-series-move-up="${chart.id}::${series.id}"
                          ${index === 0 ? 'disabled' : ''}
                        >
                          ↑
                        </button>
                        <button
                          class="analysis-legend-icon-btn"
                          type="button"
                          title="${escapeHtml(t('analysis.legend.moveDown'))}"
                          aria-label="${escapeHtml(t('analysis.legend.moveDown'))}"
                          data-analysis-series-move-down="${chart.id}::${series.id}"
                          ${index === legendItems.length - 1 ? 'disabled' : ''}
                        >
                          ↓
                        </button>
                        <button
                          class="analysis-legend-icon-btn"
                          type="button"
                          title="${escapeHtml(t('analysis.legend.rename'))}"
                          aria-label="${escapeHtml(t('analysis.legend.rename'))}"
                          data-analysis-series-rename-start="${chart.id}::${series.id}"
                        >
                          ✎
                        </button>
                        ${hasAnalysisCustomSeriesName(series)
                          ? `
                              <button
                                class="analysis-legend-icon-btn"
                                type="button"
                                title="${escapeHtml(t('analysis.legend.resetName'))}"
                                aria-label="${escapeHtml(t('analysis.legend.resetName'))}"
                                data-analysis-series-name-reset="${chart.id}::${series.id}"
                              >
                                ↺
                              </button>
                            `
                          : ''}
                        <button
                          class="analysis-legend-remove"
                          type="button"
                          title="${escapeHtml(t('analysis.legend.removeSeries'))}"
                          aria-label="${escapeHtml(t('analysis.legend.removeSeries'))}"
                          data-analysis-series-remove="${chart.id}::${series.id}"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    ${isAnalysisSeriesRenameActive(chart.id, series.id)
                      ? `
                          <div class="analysis-legend-edit-row">
                            <input
                              class="form-input analysis-legend-edit-input"
                              value="${escapeHtml(analysisSeriesRenameState?.value || series.name)}"
                              data-analysis-series-rename-input="${chart.id}::${series.id}"
                            />
                            <button
                              class="analysis-legend-save-btn"
                              type="button"
                              data-analysis-series-rename-save="${chart.id}::${series.id}"
                            >
                              ${escapeHtml(t('analysis.chartTitle.save'))}
                            </button>
                            <button
                              class="analysis-legend-cancel-btn"
                              type="button"
                              data-analysis-series-rename-cancel="${chart.id}::${series.id}"
                            >
                              ${escapeHtml(t('analysis.chartTitle.cancel'))}
                            </button>
                          </div>
                        `
                      : ''}
                  </div>
                `
              )
              .join('')
          : renderAnalysisEmptyState(
              t('analysis.chartNoSeriesTitle'),
              t('analysis.chartNoSeriesNote'),
              true
            )}
      </div>
    </section>
  `;
}

function renderAnalysisExpandedOverlay() {
  if (!analysisExpandedChartId) {
    return '';
  }

  const chart = getAnalysisChart(analysisExpandedChartId);
  if (!chart) {
    return '';
  }

  return `
    <div class="analysis-expanded-overlay">
      <div class="analysis-expanded-stage">
        ${renderAnalysisChartCard(chart, true)}
      </div>
    </div>
  `;
}

function renderAnalysisInspector() {
  if (!analysisInspector) {
    return `
        <div class="analysis-inspector-empty">
        ${escapeHtml(t('analysis.inspector.selectPrompt'))}
      </div>
    `;
  }

  const entry = getAnalysisRecordEntry(analysisInspector.recordId);
  if (!entry?.detail) {
    return `
        <div class="analysis-inspector-empty">
        ${escapeHtml(t('analysis.inspector.notFound'))}
      </div>
    `;
  }

  const detail = entry.detail;
  const inspector = analysisInspector;
  const conditionItems = detail.dataItems
    .filter((item) => resolveScalarItemRole(item) === 'condition')
    .map((item) => ({
      label: item.itemName,
      value: `${item.itemValue}${item.itemUnit ? ` ${item.itemUnit}` : ''}`
    }));

  const metadataSection = renderAnalysisDataList([
    { label: t('analysis.label.experimentId'), value: String(detail.id) },
    { label: t('analysis.label.displayName'), value: detail.displayName },
    { label: t('analysis.label.createdAt'), value: detail.createdAt },
    { label: t('analysis.label.updatedAt'), value: detail.updatedAt }
  ]);

  const step1Section = renderAnalysisDataList([
    { label: t('step1.field.testProject'), value: detail.testProject },
    { label: t('step1.field.sampleCode'), value: detail.sampleCode },
    { label: t('step1.field.tester'), value: detail.tester },
    { label: t('step1.field.instrument'), value: detail.instrument },
    { label: t('step1.field.testTime'), value: detail.testTime },
    { label: t('step1.field.sampleOwner'), value: detail.sampleOwner || '-' },
    ...detail.customFields.map((field) => ({
      label: field.fieldName,
      value: field.fieldValue
    }))
  ]);

  if (inspector.kind === 'scalar-point') {
    const currentMetric = detail.dataItems.find(
      (item) => item.itemName.trim() === inspector.metricName.trim()
    );

    return `
      <div class="analysis-inspector-title">${escapeHtml(t('analysis.inspector.currentScalar'))}</div>
      ${renderAnalysisSection(t('analysis.section.recordOverview'), metadataSection)}
      ${renderAnalysisSection(t('analysis.section.primaryInfo'), step1Section)}
      ${renderAnalysisSection(t('analysis.section.conditions'), renderAnalysisDataList(conditionItems, t('step2.condition.empty')))}
      ${renderAnalysisSection(
        t('analysis.section.currentMetric'),
        renderAnalysisDataList([
          {
            label: t('analysis.label.chart'),
            value: inspector.chartTitle
          },
          {
            label: t('analysis.label.xField'),
            value: `${inspector.xLabel}${inspector.xUnit ? ` (${inspector.xUnit})` : ''}`
          },
          {
            label: t('analysis.label.xValue'),
            value: inspector.xValue
          },
          {
            label: currentMetric?.itemName || inspector.metricName,
            value: `${currentMetric?.itemValue || inspector.yValue}${currentMetric?.itemUnit ? ` ${currentMetric.itemUnit}` : inspector.yUnit ? ` ${inspector.yUnit}` : ''}`
          }
        ])
      )}
      ${renderAnalysisSection(
        t('analysis.section.otherMetrics'),
        renderAnalysisScalarSummaryList(detail.dataItems, inspector.metricName)
      )}
      ${renderAnalysisSection(
        t('analysis.section.relatedBlocks'),
        renderAnalysisBlockSummaryList(detail.templateBlocks)
      )}
      ${renderAnalysisSection(
        t('analysis.section.sourceInfo'),
        renderAnalysisSourceInfo([
          { label: t('analysis.label.savedFile'), value: currentMetric?.sourceFileName || '' },
          { label: t('analysis.label.savedPath'), value: currentMetric?.sourceFilePath || '' },
          { label: t('analysis.label.originalFile'), value: currentMetric?.originalFileName || '' },
          { label: t('analysis.label.originalPath'), value: currentMetric?.originalFilePath || '' }
        ])
      )}
      <div class="analysis-detail-footer">
        <button class="secondary-btn" type="button" data-analysis-open-record="${inspector.recordId}">
          ${escapeHtml(t('analysis.openSourceRecord'))}
        </button>
      </div>
    `;
  }

  const currentBlock = detail.templateBlocks.find((block) => block.id === inspector.blockId);
  const xLabel = currentBlock
    ? currentBlock.templateType === XY_TEMPLATE_TYPE
      ? currentBlock.xLabel
      : currentBlock.spectrumAxisLabel
    : inspector.xLabel;
  const xUnit = currentBlock
    ? currentBlock.templateType === XY_TEMPLATE_TYPE
      ? currentBlock.xUnit
      : currentBlock.spectrumAxisUnit
    : inspector.xUnit;
  const yLabel = currentBlock
    ? currentBlock.templateType === XY_TEMPLATE_TYPE
      ? currentBlock.yLabel
      : currentBlock.signalLabel
    : inspector.yLabel;
  const yUnit = currentBlock
    ? currentBlock.templateType === XY_TEMPLATE_TYPE
      ? currentBlock.yUnit
      : currentBlock.signalUnit
    : inspector.yUnit;

  return `
    <div class="analysis-inspector-title">${escapeHtml(t('analysis.inspector.currentStructured'))}</div>
    ${renderAnalysisSection(t('analysis.section.recordOverview'), metadataSection)}
    ${renderAnalysisSection(t('analysis.section.primaryInfo'), step1Section)}
    ${renderAnalysisSection(t('analysis.section.conditions'), renderAnalysisDataList(conditionItems, t('step2.condition.empty')))}
    ${renderAnalysisSection(
      t('analysis.section.currentStructured'),
      renderAnalysisDataList([
        { label: t('analysis.label.chart'), value: inspector.chartTitle },
        { label: t('analysis.label.block'), value: currentBlock?.blockTitle || inspector.blockTitle },
        {
          label: t('analysis.label.dataPurpose'),
          value: getStructuredBlockPurposeLabel(currentBlock?.purposeType || inspector.purposeType)
        },
        { label: t('analysis.label.xAxis'), value: `${xLabel}${xUnit ? ` (${xUnit})` : ''}` },
        { label: t('analysis.label.yAxis'), value: `${yLabel}${yUnit ? ` (${yUnit})` : ''}` },
        { label: t('analysis.label.pointCount'), value: String(currentBlock?.points.length || inspector.pointCount) },
        { label: t('analysis.label.note'), value: currentBlock?.note || inspector.note || '-' }
      ])
    )}
    ${renderAnalysisSection(
      t('analysis.section.otherBlocks'),
      renderAnalysisBlockSummaryList(detail.templateBlocks, inspector.blockId)
    )}
    ${renderAnalysisSection(
      t('analysis.section.metricSummary'),
      renderAnalysisScalarSummaryList(detail.dataItems)
    )}
    ${renderAnalysisSection(
      t('analysis.section.sourceInfo'),
      renderAnalysisSourceInfo([
        { label: t('analysis.label.savedFile'), value: currentBlock?.sourceFileName || '' },
        { label: t('analysis.label.savedPath'), value: currentBlock?.sourceFilePath || '' },
        { label: t('analysis.label.originalFile'), value: currentBlock?.originalFileName || '' },
        { label: t('analysis.label.originalPath'), value: currentBlock?.originalFilePath || '' }
      ])
    )}
    <div class="analysis-detail-footer">
      <button class="secondary-btn" type="button" data-analysis-open-record="${inspector.recordId}">
        ${escapeHtml(t('analysis.openSourceRecord'))}
      </button>
    </div>
  `;
}

function renderAnalysisComposerModal() {
  if (!analysisComposer) {
    return '';
  }

  const composer = analysisComposer;
  const filteredRecords = getAnalysisComposerFilteredRecords(composer);

  if (composer.chartType === 'scalar') {
    const scalarMetricOptions = getAnalysisScalarMetricOptions(composer.selectedRecordIds);
    const selectedCount = composer.selectedRecordIds.filter((recordId) =>
      filteredRecords.some((entry) => entry.listItem.id === recordId)
    ).length;
    const scalarMetricPrompt = !composer.selectedRecordIds.length
      ? t('analysis.composer.selectRecordsFirst')
      : scalarMetricOptions.length
        ? ''
        : t('analysis.composer.noScalarMetrics');
    const canConfirm =
      !composer.pending &&
      composer.selectedRecordIds.length > 0 &&
      scalarMetricOptions.length > 0 &&
      Boolean(composer.yItemName.trim());

    return `
      <div class="analysis-modal-backdrop">
        <div class="analysis-modal-card">
          <div class="analysis-modal-title">${escapeHtml(t('analysis.composer.scalarTitle'))}</div>
          <div class="search-row analysis-search-row">
            <input
              id="analysis-composer-search"
              class="form-input"
              placeholder="${escapeHtml(t('analysis.composer.searchPlaceholder'))}"
              value="${escapeHtml(composer.searchQuery)}"
            />
            <button id="analysis-composer-search-btn" class="primary-btn search-btn" type="button">${escapeHtml(t('common.search'))}</button>
            <button id="analysis-composer-filter-add-btn" class="secondary-btn search-btn filter-add-btn" type="button" title="${escapeHtml(t('database.filter.addTooltip'))}">＋</button>
          </div>
          ${renderCrossFilterControls({
            scope: 'analysis',
            chips: composer.crossFilters,
            draftOpen: composer.filterDraftOpen,
            draftField: composer.filterDraftField,
            draftOperator: composer.filterDraftOperator,
            draftValue: composer.filterDraftValue,
            draftValue2: composer.filterDraftValue2,
            draftPendingValues: composer.filterDraftPendingValues,
            draftCandidateQuery: analysisFilterCandidateQuery,
            candidateValues: getAnalysisFilterCandidateValues(composer)
          })}
          <div class="analysis-modal-toolbar">
            <div class="analysis-filter-result-summary">${escapeHtml(t('analysis.composer.resultSummary', { results: filteredRecords.length, selected: selectedCount }))}</div>
            <button
              id="analysis-composer-toggle-select-btn"
              class="secondary-btn analysis-compact-toggle-btn"
              type="button"
              ${filteredRecords.length ? '' : 'disabled'}
            >
              ${
                filteredRecords.length &&
                filteredRecords.every((entry) => composer.selectedRecordIds.includes(entry.listItem.id))
                  ? t('analysis.composer.unselectCurrent')
                  : t('analysis.composer.selectCurrent')
              }
            </button>
          </div>
          <div id="analysis-record-picker" class="analysis-record-picker">
            ${filteredRecords.length
              ? filteredRecords
                  .map(
                    (entry) => `
                      <label class="analysis-record-option">
                        <input
                          type="checkbox"
                          data-analysis-composer-record-id="${entry.listItem.id}"
                          ${composer.selectedRecordIds.includes(entry.listItem.id) ? 'checked' : ''}
                        />
                        <span>${escapeHtml(entry.listItem.displayName)}</span>
                      </label>
                    `
                  )
                  .join('')
              : `<div class="analysis-picker-empty">${escapeHtml(t('analysis.composer.emptyFiltered'))}</div>`}
          </div>
          <div class="template-block-grid">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('analysis.composer.xAxisField'))}</label>
              <select id="analysis-composer-step1-field" class="form-input">
                ${ANALYSIS_STEP1_FIELD_OPTIONS.map(
                  (optionKey) => `
                    <option value="${optionKey}" ${composer.step1FieldKey === optionKey ? 'selected' : ''}>
                      ${escapeHtml(getAnalysisStep1FieldLabel(optionKey))}
                    </option>
                  `
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('analysis.composer.yMetric'))}</label>
              <select id="analysis-composer-y-item" class="form-input" ${scalarMetricOptions.length ? '' : 'disabled'}>
                <option value="">${escapeHtml(scalarMetricOptions.length ? t('analysis.composer.yMetricPlaceholder') : t('analysis.composer.yMetricEmpty'))}</option>
                ${scalarMetricOptions
                  .map(
                    (name) => `
                      <option value="${escapeHtml(name)}" ${composer.yItemName === name ? 'selected' : ''}>
                        ${escapeHtml(name)}
                      </option>
                    `
                  )
                  .join('')}
              </select>
              ${scalarMetricPrompt ? `<div class="field-feedback-message">${escapeHtml(scalarMetricPrompt)}</div>` : ''}
            </div>
          </div>
          ${composer.error ? `<div class="error-message">${escapeHtml(composer.error)}</div>` : ''}
          <div class="form-action-row">
            <button id="analysis-composer-cancel-btn" class="secondary-btn" type="button">${escapeHtml(t('common.cancelAction'))}</button>
            <button id="analysis-composer-confirm-btn" class="primary-btn action-btn" type="button" ${canConfirm ? '' : 'disabled'}>
              ${escapeHtml(composer.pending ? t('analysis.composer.confirmAdding') : t('analysis.composer.confirmAdd'))}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const structuredBlockOptions = getAnalysisStructuredBlockNameOptions(composer.selectedRecordIds);
  const selectedCount = composer.selectedRecordIds.filter((recordId) =>
    filteredRecords.some((entry) => entry.listItem.id === recordId)
  ).length;
  const structuredBlockPrompt = !composer.selectedRecordIds.length
    ? t('analysis.composer.selectRecordsFirst')
    : structuredBlockOptions.length
      ? ''
      : t('analysis.composer.noStructuredBlocks');
  const canConfirm =
    !composer.pending &&
    composer.selectedRecordIds.length > 0 &&
    structuredBlockOptions.length > 0 &&
    Boolean(composer.selectedBlockName.trim());

  return `
    <div class="analysis-modal-backdrop">
      <div class="analysis-modal-card">
        <div class="analysis-modal-title">${escapeHtml(t('analysis.composer.structuredTitle'))}</div>
        <div class="search-row analysis-search-row">
          <input
            id="analysis-composer-search"
            class="form-input"
            placeholder="${escapeHtml(t('analysis.composer.searchPlaceholder'))}"
            value="${escapeHtml(composer.searchQuery)}"
          />
          <button id="analysis-composer-search-btn" class="primary-btn search-btn" type="button">${escapeHtml(t('common.search'))}</button>
          <button id="analysis-composer-filter-add-btn" class="secondary-btn search-btn filter-add-btn" type="button" title="${escapeHtml(t('database.filter.addTooltip'))}">＋</button>
        </div>
        ${renderCrossFilterControls({
          scope: 'analysis',
          chips: composer.crossFilters,
          draftOpen: composer.filterDraftOpen,
          draftField: composer.filterDraftField,
          draftOperator: composer.filterDraftOperator,
          draftValue: composer.filterDraftValue,
          draftValue2: composer.filterDraftValue2,
          draftPendingValues: composer.filterDraftPendingValues,
          draftCandidateQuery: analysisFilterCandidateQuery,
          candidateValues: getAnalysisFilterCandidateValues(composer)
        })}
        <div class="analysis-modal-toolbar">
          <div class="analysis-filter-result-summary">${escapeHtml(t('analysis.composer.resultSummary', { results: filteredRecords.length, selected: selectedCount }))}</div>
          <button
            id="analysis-composer-toggle-select-btn"
            class="secondary-btn analysis-compact-toggle-btn"
            type="button"
            ${filteredRecords.length ? '' : 'disabled'}
          >
            ${
              filteredRecords.length &&
              filteredRecords.every((entry) => composer.selectedRecordIds.includes(entry.listItem.id))
                ? t('analysis.composer.unselectCurrent')
                : t('analysis.composer.selectCurrent')
            }
          </button>
        </div>
        <div id="analysis-record-picker" class="analysis-record-picker">
          ${filteredRecords.length
            ? filteredRecords
                .map(
                  (entry) => `
                    <label class="analysis-record-option">
                      <input
                        type="checkbox"
                        data-analysis-composer-structured-record-id="${entry.listItem.id}"
                        ${composer.selectedRecordIds.includes(entry.listItem.id) ? 'checked' : ''}
                      />
                      <span>${escapeHtml(entry.listItem.displayName)}</span>
                    </label>
                  `
                )
                .join('')
            : `<div class="analysis-picker-empty">${escapeHtml(t('analysis.composer.emptyFiltered'))}</div>`}
        </div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('analysis.composer.structuredBlock'))}</label>
          <select id="analysis-composer-structured-block" class="form-input" ${structuredBlockOptions.length ? '' : 'disabled'}>
            <option value="">${escapeHtml(structuredBlockOptions.length ? t('analysis.composer.structuredBlockPlaceholder') : t('analysis.composer.structuredBlockEmpty'))}</option>
            ${structuredBlockOptions
              .map(
                (blockName) => `
                  <option value="${escapeHtml(blockName)}" ${composer.selectedBlockName === blockName ? 'selected' : ''}>
                    ${escapeHtml(blockName)}
                  </option>
                `
              )
              .join('')}
          </select>
          ${structuredBlockPrompt ? `<div class="field-feedback-message">${escapeHtml(structuredBlockPrompt)}</div>` : ''}
        </div>
        ${composer.error ? `<div class="error-message">${escapeHtml(composer.error)}</div>` : ''}
        <div class="form-action-row">
          <button id="analysis-composer-cancel-btn" class="secondary-btn" type="button">${escapeHtml(t('common.cancelAction'))}</button>
          <button id="analysis-composer-confirm-btn" class="primary-btn action-btn" type="button" ${canConfirm ? '' : 'disabled'}>
            ${escapeHtml(composer.pending ? t('analysis.composer.confirmAdding') : t('analysis.composer.confirmAdd'))}
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindDatabaseCrossFilterEvents() {
  document.getElementById('db-filter-add-btn')?.addEventListener('click', () => {
    openDatabaseFilterDraft();
    void renderPreservingContentScroll();
    void refreshDatabaseFilterCandidateValues(true);
  });

  document.querySelectorAll('[data-cross-filter-remove^="database::"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const encoded = (button as HTMLElement).dataset.crossFilterRemove;
      const chipId = encoded?.split('::')[1];
      if (!chipId) {
        return;
      }

      databaseCrossFilters = removeCrossFilterChip(databaseCrossFilters, chipId);
      await loadDatabaseList();
      void render();
    });
  });

  document.getElementById('db-filter-clear-btn')?.addEventListener('click', async () => {
    databaseCrossFilters = [];
    closeDatabaseFilterDraft();
    await loadDatabaseList();
    void render();
  });

  document.getElementById('db-filter-field')?.addEventListener('change', (event) => {
    const nextField = (event.target as HTMLSelectElement).value as CrossFilterField;
    databaseFilterDraft = {
      ...databaseFilterDraft,
      field: nextField,
      operator: supportsCrossFilterRangeOperator(nextField) ? databaseFilterDraft.operator : 'eq',
      value2: supportsCrossFilterRangeOperator(nextField) ? databaseFilterDraft.value2 : '',
      pendingValues: []
    };
    databaseFilterCandidateQuery = '';
    void renderPreservingContentScroll();
    void refreshDatabaseFilterCandidateValues(true);
  });

  document.getElementById('db-filter-operator')?.addEventListener('change', (event) => {
    const nextOperator = (event.target as HTMLSelectElement).value as CrossFilterOperator;
    databaseFilterDraft = {
      ...databaseFilterDraft,
      operator: nextOperator,
      pendingValues: [],
      value2: nextOperator === 'between' ? databaseFilterDraft.value2 : ''
    };
    databaseFilterCandidateQuery = '';
    void renderPreservingContentScroll();
    void refreshDatabaseFilterCandidateValues(true);
  });

  document.getElementById('db-filter-pending-add-btn')?.addEventListener('click', () => {
    databaseFilterDraft = {
      ...databaseFilterDraft,
      pendingValues: addPendingCrossFilterValue(databaseFilterDraft.pendingValues, databaseFilterDraft.value),
      value: ''
    };
    void renderPreservingContentScroll();
  });

  document.querySelectorAll('[data-cross-filter-pending-remove^="database::"]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.crossFilterPendingRemove;
      const value = encoded?.split('::')[1];
      if (!value) {
        return;
      }

      databaseFilterDraft = {
        ...databaseFilterDraft,
        pendingValues: removePendingCrossFilterValue(
          databaseFilterDraft.pendingValues,
          decodeURIComponent(value)
        )
      };
      void renderPreservingContentScroll();
    });
  });

  document.getElementById('db-filter-value')?.addEventListener('input', (event) => {
    databaseFilterDraft = {
      ...databaseFilterDraft,
      value: (event.target as HTMLInputElement).value
    };
  });

  document.getElementById('db-filter-candidate-search')?.addEventListener('input', (event) => {
    databaseFilterCandidateQuery = (event.target as HTMLInputElement).value;
    void renderPreservingContentScroll();
  });

  document.querySelectorAll('[data-cross-filter-candidate-toggle^="database::"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const encoded = (input as HTMLElement).dataset.crossFilterCandidateToggle;
      const value = encoded?.split('::')[1];
      if (!value) {
        return;
      }

      databaseFilterDraft = {
        ...databaseFilterDraft,
        pendingValues: togglePendingCrossFilterCandidateValue(
          databaseFilterDraft.pendingValues,
          decodeURIComponent(value),
          (event.target as HTMLInputElement).checked
        )
      };
      void renderPreservingContentScroll();
    });
  });

  document.getElementById('db-filter-apply-btn')?.addEventListener('click', async () => {
    await applyDatabaseFilterDraft();
  });

  document.getElementById('db-filter-cancel-btn')?.addEventListener('click', () => {
    closeDatabaseFilterDraft();
    void renderPreservingContentScroll();
  });

  document.getElementById('db-filter-value')?.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    if (supportsCrossFilterPendingMultiValue(databaseFilterDraft.operator)) {
      databaseFilterDraft = {
        ...databaseFilterDraft,
        pendingValues: addPendingCrossFilterValue(databaseFilterDraft.pendingValues, databaseFilterDraft.value),
        value: ''
      };
      void renderPreservingContentScroll();
      return;
    }

    await applyDatabaseFilterDraft();
  });

  document.getElementById('db-filter-value2')?.addEventListener('input', (event) => {
    databaseFilterDraft = {
      ...databaseFilterDraft,
      value2: (event.target as HTMLInputElement).value
    };
  });

  document.getElementById('db-filter-value2')?.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    await applyDatabaseFilterDraft();
  });
}

function bindAnalysisComposerFilterEvents() {
  if (!analysisComposer) {
    return;
  }

  document.getElementById('analysis-composer-filter-add-btn')?.addEventListener('click', () => {
    openAnalysisComposerFilterDraft();
    requestRender(true);
  });

  document.querySelectorAll('[data-cross-filter-remove^="analysis::"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!analysisComposer) {
        return;
      }

      const encoded = (button as HTMLElement).dataset.crossFilterRemove;
      const chipId = encoded?.split('::')[1];
      if (!chipId) {
        return;
      }

      const nextComposer = reconcileAnalysisComposerSelection({
        ...analysisComposer,
        crossFilters: removeCrossFilterChip(analysisComposer.crossFilters, chipId),
        resultScrollTop: 0,
        error: ''
      } as AnalysisComposerState);
      analysisComposer = nextComposer as AnalysisComposerState;
      requestRender(true);
    });
  });

  document.getElementById('analysis-composer-filter-clear-btn')?.addEventListener('click', () => {
    if (!analysisComposer) {
      return;
    }

    const nextComposer = reconcileAnalysisComposerSelection({
      ...analysisComposer,
      crossFilters: [],
      filterDraftOpen: false,
      filterDraftField: 'sampleCode',
      filterDraftOperator: 'eq',
      filterDraftValue: '',
      filterDraftValue2: '',
      filterDraftPendingValues: [],
      resultScrollTop: 0,
      error: ''
    } as AnalysisComposerState);
    analysisComposer = nextComposer as AnalysisComposerState;
    requestRender(true);
  });

  document.getElementById('analysis-composer-filter-field')?.addEventListener('change', (event) => {
    if (!analysisComposer) {
      return;
    }

    const nextField = (event.target as HTMLSelectElement).value as CrossFilterField;
    analysisComposer = {
      ...analysisComposer,
      filterDraftField: nextField,
      filterDraftOperator: supportsCrossFilterRangeOperator(nextField)
        ? analysisComposer.filterDraftOperator
        : 'eq',
      filterDraftValue2: supportsCrossFilterRangeOperator(nextField)
        ? analysisComposer.filterDraftValue2
        : '',
      filterDraftPendingValues: []
    } as AnalysisComposerState;
    analysisFilterCandidateQuery = '';
    requestRender(true);
  });

  document.getElementById('analysis-composer-filter-operator')?.addEventListener('change', (event) => {
    if (!analysisComposer) {
      return;
    }

    const nextOperator = (event.target as HTMLSelectElement).value as CrossFilterOperator;
    analysisComposer = {
      ...analysisComposer,
      filterDraftOperator: nextOperator,
      filterDraftPendingValues: []
    } as AnalysisComposerState;
    analysisFilterCandidateQuery = '';
    requestRender(true);
  });

  document.getElementById('analysis-composer-filter-pending-add-btn')?.addEventListener('click', () => {
    if (!analysisComposer) {
      return;
    }

    analysisComposer = {
      ...analysisComposer,
      filterDraftPendingValues: addPendingCrossFilterValue(
        analysisComposer.filterDraftPendingValues,
        analysisComposer.filterDraftValue
      ),
      filterDraftValue: ''
    } as AnalysisComposerState;
    requestRender(true);
  });

  document.querySelectorAll('[data-cross-filter-pending-remove^="analysis::"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!analysisComposer) {
        return;
      }

      const encoded = (button as HTMLElement).dataset.crossFilterPendingRemove;
      const value = encoded?.split('::')[1];
      if (!value) {
        return;
      }

      analysisComposer = {
        ...analysisComposer,
        filterDraftPendingValues: removePendingCrossFilterValue(
          analysisComposer.filterDraftPendingValues,
          decodeURIComponent(value)
        )
      } as AnalysisComposerState;
      requestRender(true);
    });
  });

  document.getElementById('analysis-composer-filter-value')?.addEventListener('input', (event) => {
    if (!analysisComposer) {
      return;
    }

    analysisComposer = {
      ...analysisComposer,
      filterDraftValue: (event.target as HTMLInputElement).value
    } as AnalysisComposerState;
  });

  document.getElementById('analysis-composer-filter-candidate-search')?.addEventListener('input', (event) => {
    analysisFilterCandidateQuery = (event.target as HTMLInputElement).value;
    requestRender(true);
  });

  document
    .querySelectorAll('[data-cross-filter-candidate-toggle^="analysis::"]')
    .forEach((input) => {
      input.addEventListener('change', (event) => {
        if (!analysisComposer) {
          return;
        }

        const encoded = (input as HTMLElement).dataset.crossFilterCandidateToggle;
        const value = encoded?.split('::')[1];
        if (!value) {
          return;
        }

        analysisComposer = {
          ...analysisComposer,
          filterDraftPendingValues: togglePendingCrossFilterCandidateValue(
            analysisComposer.filterDraftPendingValues,
            decodeURIComponent(value),
            (event.target as HTMLInputElement).checked
          )
        } as AnalysisComposerState;
        requestRender(true);
      });
    });

  document.getElementById('analysis-composer-filter-apply-btn')?.addEventListener('click', () => {
    applyAnalysisComposerFilterDraft();
  });

  document.getElementById('analysis-composer-filter-cancel-btn')?.addEventListener('click', () => {
    closeAnalysisComposerFilterDraft();
    requestRender(true);
  });

  document.getElementById('analysis-composer-filter-value')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    if (
      analysisComposer &&
      supportsCrossFilterPendingMultiValue(analysisComposer.filterDraftOperator)
    ) {
      analysisComposer = {
        ...analysisComposer,
        filterDraftPendingValues: addPendingCrossFilterValue(
          analysisComposer.filterDraftPendingValues,
          analysisComposer.filterDraftValue
        ),
        filterDraftValue: ''
      } as AnalysisComposerState;
      requestRender(true);
      return;
    }

    applyAnalysisComposerFilterDraft();
  });

  document.getElementById('analysis-composer-filter-value2')?.addEventListener('input', (event) => {
    if (!analysisComposer) {
      return;
    }

    analysisComposer = {
      ...analysisComposer,
      filterDraftValue2: (event.target as HTMLInputElement).value
    } as AnalysisComposerState;
  });

  document.getElementById('analysis-composer-filter-value2')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    applyAnalysisComposerFilterDraft();
  });
}

function bindAnalysisWorkspaceEvents() {
  document.getElementById('analysis-add-scalar-chart-btn')?.addEventListener('click', async () => {
    await addAnalysisChart('scalar');
  });

  document.getElementById('analysis-add-structured-chart-btn')?.addEventListener('click', async () => {
    await addAnalysisChart('structured');
  });

  document.getElementById('analysis-menu-home')?.addEventListener('click', () => {
    currentView = 'home';
    void render();
  });

  document.getElementById('analysis-menu-data')?.addEventListener('click', async () => {
    await loadDatabaseListView();
    currentView = 'database-list';
    void render();
  });

  document.getElementById('analysis-menu-settings')?.addEventListener('click', () => {
    void openSettingsView();
  });

  document.querySelectorAll('[data-analysis-add-series]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const chartId = target.dataset.analysisAddSeries;
      const chart = chartId ? getAnalysisChart(chartId) : null;
      if (!chart) return;

      openAnalysisComposer(chart.id, chart.chartType);
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-remove-chart]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const chartId = target.dataset.analysisRemoveChart;
      if (!chartId) return;

      removeAnalysisChart(chartId);
      if (analysisExportMenuChartId === chartId) {
        analysisExportMenuChartId = null;
      }
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-export-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const chartId = (button as HTMLElement).dataset.analysisExportToggle;
      if (!chartId) return;

      analysisExportMenuChartId = analysisExportMenuChartId === chartId ? null : chartId;
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-export-image]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button as HTMLElement;
      const chartId = target.dataset.analysisExportImage;
      if (!chartId) return;

      analysisExportMenuChartId = null;
      await exportAnalysisChartImage(chartId);
    });
  });

  document.querySelectorAll('[data-analysis-export-data]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button as HTMLElement;
      const chartId = target.dataset.analysisExportData;
      if (!chartId) return;

      analysisExportMenuChartId = null;
      await exportAnalysisChartData(chartId);
    });
  });

  document.querySelectorAll('[data-analysis-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      const chartId = (button as HTMLElement).dataset.analysisReset;
      if (!chartId) return;
      resetAnalysisChartViewport(chartId);
    });
  });

  document.querySelectorAll('[data-analysis-chart-title-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const chartId = (button as HTMLElement).dataset.analysisChartTitleEdit;
      const chart = chartId ? getAnalysisChart(chartId) : null;
      if (!chartId || !chart) {
        return;
      }

      analysisChartTitleEditState = {
        chartId,
        value: chart.title
      };
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-chart-title-input]').forEach((input) => {
    input.addEventListener('input', (event) => {
      if (!analysisChartTitleEditState) {
        return;
      }

      analysisChartTitleEditState = {
        ...analysisChartTitleEditState,
        value: (event.target as HTMLInputElement).value
      };
    });

    input.addEventListener('keydown', (event) => {
      const encoded = (input as HTMLElement).dataset.analysisChartTitleInput;
      const keyboardEvent = event as KeyboardEvent;
      if (!encoded) {
        return;
      }

      if (keyboardEvent.key === 'Enter') {
        renameAnalysisChart(encoded, (event.target as HTMLInputElement).value);
      }

      if (keyboardEvent.key === 'Escape') {
        analysisChartTitleEditState = null;
        requestRender(true);
      }
    });
  });

  if (analysisChartTitleEditState) {
    const activeChartTitleInput = document.querySelector(
      `[data-analysis-chart-title-input="${analysisChartTitleEditState.chartId}"]`
    ) as HTMLInputElement | null;

    if (activeChartTitleInput) {
      activeChartTitleInput.focus();
      activeChartTitleInput.select();
    }
  }

  document.querySelectorAll('[data-analysis-chart-title-save]').forEach((button) => {
    button.addEventListener('click', () => {
      const chartId = (button as HTMLElement).dataset.analysisChartTitleSave;
      if (!chartId || !analysisChartTitleEditState) {
        return;
      }

      renameAnalysisChart(chartId, analysisChartTitleEditState.value);
    });
  });

  document.querySelectorAll('[data-analysis-chart-title-cancel]').forEach((button) => {
    button.addEventListener('click', () => {
      analysisChartTitleEditState = null;
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-chart-title-reset], [data-analysis-chart-title-restore]').forEach((button) => {
    button.addEventListener('click', () => {
      const chartId =
        (button as HTMLElement).dataset.analysisChartTitleReset ||
        (button as HTMLElement).dataset.analysisChartTitleRestore;
      if (!chartId) {
        return;
      }

      restoreDefaultAnalysisChartTitle(chartId);
    });
  });

  document.querySelectorAll('[data-analysis-legend-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.analysisLegendToggle;
      if (!encoded) return;

      const [chartId, seriesId] = encoded.split('::');
      if (!chartId || !seriesId) {
        return;
      }

      toggleAnalysisSeriesVisibility(chartId, seriesId);
    });
  });

  document.querySelectorAll('[data-analysis-series-rename-start]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.analysisSeriesRenameStart;
      if (!encoded) return;

      const [chartId, seriesId] = encoded.split('::');
      const chart = chartId ? getAnalysisChart(chartId) : null;
      const series =
        chart?.chartType === 'scalar'
          ? chart.scalarSeries.find((item) => item.id === seriesId)
          : chart?.structuredSeries.find((item) => item.id === seriesId);

      if (!chart || !series) {
        return;
      }

      analysisSeriesRenameState = {
        chartId,
        seriesId,
        value: series.name
      };
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-series-rename-input]').forEach((input) => {
    input.addEventListener('input', (event) => {
      if (!analysisSeriesRenameState) {
        return;
      }

      analysisSeriesRenameState = {
        ...analysisSeriesRenameState,
        value: (event.target as HTMLInputElement).value
      };
    });

    input.addEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      const encoded = (input as HTMLElement).dataset.analysisSeriesRenameInput;
      if (!encoded) {
        return;
      }

      const [chartId, seriesId] = encoded.split('::');
      if (keyboardEvent.key === 'Enter') {
        renameAnalysisSeries(chartId, seriesId, (event.target as HTMLInputElement).value);
      }

      if (keyboardEvent.key === 'Escape') {
        analysisSeriesRenameState = null;
        requestRender(true);
      }
    });
  });

  if (analysisSeriesRenameState) {
    const activeRenameInput = document.querySelector(
      `[data-analysis-series-rename-input="${analysisSeriesRenameState.chartId}::${analysisSeriesRenameState.seriesId}"]`
    ) as HTMLInputElement | null;

    if (activeRenameInput) {
      activeRenameInput.focus();
      activeRenameInput.select();
    }
  }

  document.querySelectorAll('[data-analysis-series-rename-save]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.analysisSeriesRenameSave;
      if (!encoded || !analysisSeriesRenameState) {
        return;
      }

      const [chartId, seriesId] = encoded.split('::');
      renameAnalysisSeries(chartId, seriesId, analysisSeriesRenameState.value);
    });
  });

  document.querySelectorAll('[data-analysis-series-rename-cancel]').forEach((button) => {
    button.addEventListener('click', () => {
      analysisSeriesRenameState = null;
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-series-color]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const encoded = (input as HTMLElement).dataset.analysisSeriesColor;
      if (!encoded) return;

      const [chartId, seriesId] = encoded.split('::');
      updateAnalysisSeriesColor(chartId, seriesId, (event.target as HTMLInputElement).value);
    });
  });

  document.querySelectorAll('[data-analysis-series-color-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.analysisSeriesColorReset;
      if (!encoded) return;

      const [chartId, seriesId] = encoded.split('::');
      restoreDefaultAnalysisSeriesColor(chartId, seriesId);
    });
  });

  document.querySelectorAll('[data-analysis-series-move-up]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.analysisSeriesMoveUp;
      if (!encoded) return;

      const [chartId, seriesId] = encoded.split('::');
      moveAnalysisSeries(chartId, seriesId, 'up');
    });
  });

  document.querySelectorAll('[data-analysis-series-move-down]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.analysisSeriesMoveDown;
      if (!encoded) return;

      const [chartId, seriesId] = encoded.split('::');
      moveAnalysisSeries(chartId, seriesId, 'down');
    });
  });

  document.querySelectorAll('[data-analysis-series-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.analysisSeriesRemove;
      if (!encoded) return;

      const [chartId, seriesId] = encoded.split('::');
      if (!chartId || !seriesId) {
        return;
      }

      removeAnalysisSeries(chartId, seriesId);
    });
  });

  document.querySelectorAll('[data-analysis-series-name-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      const encoded = (button as HTMLElement).dataset.analysisSeriesNameReset;
      if (!encoded) {
        return;
      }

      const [chartId, seriesId] = encoded.split('::');
      restoreDefaultAnalysisSeriesName(chartId, seriesId);
    });
  });

  document.querySelectorAll('[data-analysis-chart-shell]').forEach((shell) => {
    shell.addEventListener('wheel', (rawEvent) => {
      const event = rawEvent as WheelEvent;
      const chartId = (shell as HTMLElement).dataset.analysisChartShell;
      if (!chartId) return;

      event.preventDefault();
      const rect = (shell as HTMLElement).getBoundingClientRect();
      const xRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const yRatio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      zoomAnalysisChartAt(chartId, event.deltaY < 0 ? 0.88 : 1.14, xRatio, yRatio);
    }, { passive: false });

    shell.addEventListener('mousedown', (rawEvent) => {
      const event = rawEvent as MouseEvent;
      if (event.button !== 0) {
        return;
      }

      const eventTarget = event.target as HTMLElement | null;
      if (eventTarget?.closest('[data-analysis-scalar-point], [data-analysis-structured-series]')) {
        return;
      }

      const chartId = (shell as HTMLElement).dataset.analysisChartShell;
      if (!chartId) return;

      const chart = getAnalysisChart(chartId);
      const active = chart ? getActiveAnalysisViewport(chart) : null;
      if (!chart || !active) {
        return;
      }

      const rect = (shell as HTMLElement).getBoundingClientRect();
      const geometry = getAnalysisChartGeometry();
      const plotWidth = rect.width * ((geometry.width - geometry.marginLeft - geometry.marginRight) / geometry.width);
      const plotHeight = rect.height * ((geometry.height - geometry.marginTop - geometry.marginBottom) / geometry.height);

      analysisChartDragState = {
        chartId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originViewport: { ...active.viewport },
        plotWidth,
        plotHeight
      };
    });
  });

  document.onmousemove = (event) => {
    if (!analysisChartDragState) {
      return;
    }

    const chart = getAnalysisChart(analysisChartDragState.chartId);
    if (!chart) {
      analysisChartDragState = null;
      return;
    }

    const xSpan =
      analysisChartDragState.originViewport.xMax - analysisChartDragState.originViewport.xMin;
    const ySpan =
      analysisChartDragState.originViewport.yMax - analysisChartDragState.originViewport.yMin;
    const deltaX = event.clientX - analysisChartDragState.startClientX;
    const deltaY = event.clientY - analysisChartDragState.startClientY;

    updateAnalysisChart(chart.id, (currentChart) => ({
      ...currentChart,
      viewport: clampAnalysisViewport(currentChart, {
        xMin: analysisChartDragState.originViewport.xMin - (deltaX / analysisChartDragState.plotWidth) * xSpan,
        xMax: analysisChartDragState.originViewport.xMax - (deltaX / analysisChartDragState.plotWidth) * xSpan,
        yMin: analysisChartDragState.originViewport.yMin + (deltaY / analysisChartDragState.plotHeight) * ySpan,
        yMax: analysisChartDragState.originViewport.yMax + (deltaY / analysisChartDragState.plotHeight) * ySpan
      })
    }));
    requestRender(true);
  };

  document.onmouseup = () => {
    if (!analysisChartDragState) {
      return;
    }

    analysisChartDragState = null;
    requestRender(true);
  };

  document.querySelectorAll('[data-analysis-scalar-point]').forEach((node) => {
    node.addEventListener('click', () => {
      const encoded = (node as HTMLElement).dataset.analysisScalarPoint;
      if (!encoded) return;

      const [chartId, seriesId, recordIdText] = encoded.split('::');
      const chart = getAnalysisChart(chartId);
      const series = chart?.scalarSeries.find((item) => item.id === seriesId);
      const point = series?.points.find((item) => item.recordId === Number(recordIdText));
      if (!chart || !series || !point) {
        return;
      }

      analysisInspector = {
        kind: 'scalar-point',
        chartId,
        chartTitle: chart.title,
        seriesName: series.name,
        xLabel: series.xSourceLabel,
        xValue: point.xRaw,
        xUnit: series.xUnit,
        yLabel: series.yItemName,
        yValue: formatAnalysisNumber(point.yValue),
        yUnit: series.yUnit,
        recordId: point.recordId,
        recordDisplayName: point.recordDisplayName,
        metricName: series.yItemName
      };
      analysisInspectorCollapsed = false;
      schedulePersistedAnalysisUIStateSave();
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-structured-series]').forEach((node) => {
    node.addEventListener('click', () => {
      const encoded = (node as HTMLElement).dataset.analysisStructuredSeries;
      if (!encoded) return;

      const [chartId, seriesId] = encoded.split('::');
      const chart = getAnalysisChart(chartId);
      const series = chart?.structuredSeries.find((item) => item.id === seriesId);
      if (!chart || !series) {
        return;
      }

      analysisInspector = {
        kind: 'structured-series',
        chartId,
        chartTitle: chart.title,
        seriesName: series.name,
        purposeType: series.purposeType,
        pointCount: series.points.length,
        xLabel: series.xLabel,
        xUnit: series.xUnit,
        yLabel: series.yLabel,
        yUnit: series.yUnit,
        note: series.note,
        recordId: series.experimentId,
        recordDisplayName: series.recordDisplayName,
        blockTitle: series.blockTitle,
        blockId: series.blockId
      };
      analysisInspectorCollapsed = false;
      schedulePersistedAnalysisUIStateSave();
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-analysis-open-record]').forEach((button) => {
    button.addEventListener('click', async () => {
      const recordId = Number((button as HTMLElement).dataset.analysisOpenRecord);
      if (!recordId) return;

      await openExperimentDetail(recordId);
    });
  });

  document.getElementById('analysis-inspector-toggle')?.addEventListener('click', () => {
    analysisInspectorCollapsed = !analysisInspectorCollapsed;
    schedulePersistedAnalysisUIStateSave();
    requestRender(true);
  });

  document.querySelectorAll('[data-analysis-expand]').forEach((button) => {
    button.addEventListener('click', () => {
      const chartId = (button as HTMLElement).dataset.analysisExpand;
      if (!chartId) return;
      analysisExpandedChartId = analysisExpandedChartId === chartId ? null : chartId;
      requestRender(true);
    });
  });

  document.onkeydown = (event) => {
    if (event.key === 'Escape' && analysisExpandedChartId) {
      analysisExpandedChartId = null;
      requestRender(true);
    }
  };

  if (!analysisComposer) {
    return;
  }

  bindAnalysisComposerFilterEvents();

  document.getElementById('analysis-composer-cancel-btn')?.addEventListener('click', () => {
    closeAnalysisComposer();
    requestRender(true);
  });

  document.getElementById('analysis-composer-search')?.addEventListener('input', (event) => {
    if (!analysisComposer) return;

    const target = event.target as HTMLInputElement;
    analysisComposer = {
      ...analysisComposer,
      searchQuery: target.value,
      error: ''
    } as AnalysisComposerState;
  });

  const applyAnalysisComposerSearch = () => {
    if (!analysisComposer) {
      return;
    }

    const nextComposer = reconcileAnalysisComposerSelection({
      ...analysisComposer,
      appliedSearchQuery: analysisComposer.searchQuery.trim(),
      resultScrollTop: 0,
      error: ''
    } as AnalysisComposerState);
    analysisComposer = nextComposer as AnalysisComposerState;
    requestRender(true);
  };

  document.getElementById('analysis-composer-search-btn')?.addEventListener('click', () => {
    applyAnalysisComposerSearch();
  });

  document.getElementById('analysis-composer-search')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    applyAnalysisComposerSearch();
  });

  const recordPicker = document.getElementById('analysis-record-picker') as HTMLDivElement | null;
  if (analysisComposer && recordPicker) {
    recordPicker.scrollTop = analysisComposer.resultScrollTop;
    recordPicker.addEventListener('scroll', () => {
      if (!analysisComposer) return;
      analysisComposer = {
        ...analysisComposer,
        resultScrollTop: recordPicker.scrollTop
      } as AnalysisComposerState;
    });
  }

  if (analysisComposer.chartType === 'scalar') {
    document.querySelectorAll('[data-analysis-composer-record-id]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!analysisComposer || analysisComposer.chartType !== 'scalar') return;

        const selectedRecordIds = Array.from(
          document.querySelectorAll('[data-analysis-composer-record-id]:checked')
        ).map((element) => Number((element as HTMLInputElement).dataset.analysisComposerRecordId));
        const scalarMetricOptions = getAnalysisScalarMetricOptions(selectedRecordIds);

        analysisComposer = {
          ...analysisComposer,
          selectedRecordIds,
          yItemName: pickSingleAnalysisOption(scalarMetricOptions, analysisComposer.yItemName),
          error: ''
        };

        requestRender(true);
      });
    });

    document.getElementById('analysis-composer-toggle-select-btn')?.addEventListener('click', () => {
      if (!analysisComposer || analysisComposer.chartType !== 'scalar') return;
      const composer = analysisComposer;

      const currentResultIds = Array.from(
        document.querySelectorAll('[data-analysis-composer-record-id]')
      ).map((element) => Number((element as HTMLInputElement).dataset.analysisComposerRecordId));
      const currentResultIdSet = new Set(
        currentResultIds
      );
      const allCurrentSelected =
        currentResultIds.length > 0 &&
        currentResultIds.every((recordId) => composer.selectedRecordIds.includes(recordId));
      const selectedRecordIds = allCurrentSelected
        ? composer.selectedRecordIds.filter((recordId) => !currentResultIdSet.has(recordId))
        : Array.from(new Set([...composer.selectedRecordIds, ...currentResultIds]));
      const scalarMetricOptions = getAnalysisScalarMetricOptions(selectedRecordIds);

      analysisComposer = {
        ...composer,
        selectedRecordIds,
        yItemName: pickSingleAnalysisOption(scalarMetricOptions, composer.yItemName),
        error: ''
      };

      document.querySelectorAll('[data-analysis-composer-record-id]').forEach((element) => {
        (element as HTMLInputElement).checked = !allCurrentSelected;
      });

      requestRender(true);
    });

    document.getElementById('analysis-composer-step1-field')?.addEventListener('change', (event) => {
      if (!analysisComposer || analysisComposer.chartType !== 'scalar') return;

      analysisComposer = {
        ...analysisComposer,
        step1FieldKey: (event.target as HTMLSelectElement).value as AnalysisStep1FieldKey,
        error: ''
      };
      requestRender(true);
    });

    document.getElementById('analysis-composer-y-item')?.addEventListener('change', (event) => {
      if (!analysisComposer || analysisComposer.chartType !== 'scalar') return;

      analysisComposer = {
        ...analysisComposer,
        yItemName: (event.target as HTMLSelectElement).value,
        error: ''
      };
      requestRender(true);
    });
  } else {
    document.querySelectorAll('[data-analysis-composer-structured-record-id]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!analysisComposer || analysisComposer.chartType !== 'structured') return;

        const selectedRecordIds = Array.from(
          document.querySelectorAll('[data-analysis-composer-structured-record-id]:checked')
        ).map((element) =>
          Number((element as HTMLInputElement).dataset.analysisComposerStructuredRecordId)
        );
        const structuredBlockOptions = getAnalysisStructuredBlockNameOptions(selectedRecordIds);

        analysisComposer = {
          ...analysisComposer,
          selectedRecordIds,
          selectedBlockName: pickSingleAnalysisOption(
            structuredBlockOptions,
            analysisComposer.selectedBlockName
          ),
          error: ''
        };
        requestRender(true);
      });
    });

    document.getElementById('analysis-composer-toggle-select-btn')?.addEventListener('click', () => {
      if (!analysisComposer || analysisComposer.chartType !== 'structured') return;
      const composer = analysisComposer;
      const currentResultIds = Array.from(
        document.querySelectorAll('[data-analysis-composer-structured-record-id]')
      ).map((element) =>
        Number((element as HTMLInputElement).dataset.analysisComposerStructuredRecordId)
      );
      const currentResultIdSet = new Set(currentResultIds);
      const allCurrentSelected =
        currentResultIds.length > 0 &&
        currentResultIds.every((recordId) => composer.selectedRecordIds.includes(recordId));
      const selectedRecordIds = allCurrentSelected
        ? composer.selectedRecordIds.filter((recordId) => !currentResultIdSet.has(recordId))
        : Array.from(new Set([...composer.selectedRecordIds, ...currentResultIds]));
      const structuredBlockOptions = getAnalysisStructuredBlockNameOptions(selectedRecordIds);

      analysisComposer = {
        ...composer,
        selectedRecordIds,
        selectedBlockName: pickSingleAnalysisOption(
          structuredBlockOptions,
          composer.selectedBlockName
        ),
        error: ''
      };

      document.querySelectorAll('[data-analysis-composer-structured-record-id]').forEach((element) => {
        (element as HTMLInputElement).checked = !allCurrentSelected;
      });

      requestRender(true);
    });

    document.getElementById('analysis-composer-structured-block')?.addEventListener('change', (event) => {
      if (!analysisComposer || analysisComposer.chartType !== 'structured') return;

      analysisComposer = {
        ...analysisComposer,
        selectedBlockName: (event.target as HTMLSelectElement).value,
        error: ''
      };
      requestRender(true);
    });
  }

  document.getElementById('analysis-composer-confirm-btn')?.addEventListener('click', async () => {
    await confirmAddAnalysisSeries();
  });
}

async function getLikelyDuplicateMatches(payload: {
  sampleCode: string;
  testProject: string;
  testTime: string;
  excludeExperimentId?: number;
}) {
  const result = await window.electronAPI.checkDuplicateExperiments(payload);
  return result.matches;
}

async function performCreateSave(payload: SaveExperimentPayload) {
  const errorBox = document.getElementById('step2-error');
  const result = await window.electronAPI.saveExperiment(payload);

  if (!result.success || !result.experimentId) {
    if (errorBox) errorBox.textContent = result.error || '保存实验数据失败';
    return;
  }

  lastSavedExperimentId = result.experimentId;
  currentView = 'save-success';
  void render();

  if (result.warning) {
    alert(result.warning);
  }
}

async function performUpdateSave(payload: UpdateExperimentPayload) {
  const errorBox = document.getElementById('detail-edit-error');
  const result = await window.electronAPI.updateExperiment(payload);

  if (!result.success) {
    if (errorBox) errorBox.textContent = result.error || '修改失败';
    return;
  }

  const [detail, editHistory] = await Promise.all([
    window.electronAPI.getExperimentDetail(payload.experimentId),
    window.electronAPI.listExperimentEditLogs({
      experimentId: payload.experimentId,
      limit: 5
    })
  ]);

  currentDetail = detail;
  currentEditHistory = editHistory;
  detailEditMode = false;
  detailEditReason = '';
  detailEditor = '';
  detailEditStep1 = null;
  detailEditStep2 = [];
  detailEditTemplateBlocks = [];
  resetTemplateBlockImportState('detail-edit');
  void render();

  if (result.warning) {
    alert(result.warning);
  }
}

async function continueDuplicateWarningSave() {
  if (!duplicateWarningState || duplicateWarningSubmitting) {
    return;
  }

  const pendingState = duplicateWarningState;
  duplicateWarningSubmitting = true;
  requestRender(true);

  try {
    closeDuplicateWarning();
    requestRender(true);

    if (pendingState.mode === 'create') {
      await performCreateSave(pendingState.payload);
      return;
    }

    await performUpdateSave(pendingState.payload);
  } catch (error) {
    const errorBox = document.getElementById(
      pendingState.mode === 'create' ? 'step2-error' : 'detail-edit-error'
    );

    if (errorBox) {
      errorBox.textContent =
        pendingState.mode === 'create'
          ? '保存实验数据失败，请稍后重试'
          : '修改失败，请稍后重试';
    }

    console.error(error);
  }
}

async function openDuplicateWarningForCreate(payload: SaveExperimentPayload) {
  const matches = await getLikelyDuplicateMatches({
    sampleCode: payload.step1.sampleCode,
    testProject: payload.step1.testProject,
    testTime: payload.step1.testTime
  });

  if (!matches.length) {
    return false;
  }

  duplicateWarningState = {
    mode: 'create',
    matches,
    sampleCode: payload.step1.sampleCode,
    testProject: payload.step1.testProject,
    testTime: payload.step1.testTime,
    payload
  };
  duplicateWarningSubmitting = false;
  requestRender(true);
  return true;
}

async function openDuplicateWarningForUpdate(payload: UpdateExperimentPayload) {
  const matches = await getLikelyDuplicateMatches({
    sampleCode: payload.step1.sampleCode,
    testProject: payload.step1.testProject,
    testTime: payload.step1.testTime,
    excludeExperimentId: payload.experimentId
  });

  if (!matches.length) {
    return false;
  }

  duplicateWarningState = {
    mode: 'update',
    matches,
    sampleCode: payload.step1.sampleCode,
    testProject: payload.step1.testProject,
    testTime: payload.step1.testTime,
    payload
  };
  duplicateWarningSubmitting = false;
  requestRender(true);
  return true;
}

function bindDuplicateWarningModalHandlers() {
  document.getElementById('duplicate-warning-cancel-btn')?.addEventListener('click', () => {
    closeDuplicateWarning();
    requestRender(true);
  });

  document.getElementById('duplicate-warning-continue-btn')?.addEventListener('click', async () => {
    await continueDuplicateWarningSave();
  });

  document.querySelectorAll('[data-open-duplicate-match-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button as HTMLElement;
      const experimentId = Number(target.dataset.openDuplicateMatchId);
      if (!experimentId || duplicateWarningSubmitting) return;

      closeDuplicateWarning();
      await openExperimentDetail(experimentId);
    });
  });
}

async function openExportModal() {
  if (!selectedExperimentIds.length) {
    alert('请先勾选至少一条实验数据');
    return;
  }

  exportMode = 'full';
  exportSelectedItemName = '';
  exportAvailableItemNames = await window.electronAPI.getExportItemNames({
    experimentIds: selectedExperimentIds
  });
  if (exportAvailableItemNames.length) {
    exportSelectedItemName = exportAvailableItemNames[0];
  }
  exportModalVisible = true;
  void render();
}

async function renderPreservingContentScroll() {
  const contentArea = document.querySelector('.content-area') as HTMLElement | null;
  const scrollTop = contentArea?.scrollTop || 0;

  await render();

  const nextContentArea = document.querySelector('.content-area') as HTMLElement | null;
  if (nextContentArea) {
    nextContentArea.scrollTop = scrollTop;
  }
}

function requestRender(preserveContentScroll = false) {
  if (preserveContentScroll) {
    void renderPreservingContentScroll();
    return;
  }

  void render();
}

function setFieldFeedback(
  feedbackElementId: string,
  message: string,
  tone: 'success' | 'error'
) {
  const feedbackElement = document.getElementById(feedbackElementId);
  if (!feedbackElement) {
    return;
  }

  feedbackElement.textContent = message;
  feedbackElement.className = `field-feedback-message ${tone === 'success' ? 'field-feedback-success' : 'field-feedback-error'}`;
}

function clearFieldFeedback(feedbackElementId: string) {
  const feedbackElement = document.getElementById(feedbackElementId);
  if (!feedbackElement) {
    return;
  }

  feedbackElement.textContent = '';
  feedbackElement.className = 'field-feedback-message';
}

async function ensureDictionaryItemsLoaded() {
  if (dictionaryLoaded) {
    return dictionaryItems;
  }

  await reloadDictionaryItems();
  return dictionaryItems;
}

function getStep1SuggestionMatches(dictionaryType: DictionaryType, rawValue: string) {
  const query = rawValue.trim();
  if (!query) {
    return [];
  }

  return dictionaryItems[dictionaryType]
    .filter((item) => item.isActive && item.value.includes(query))
    .slice(0, STEP1_SUGGESTION_LIMIT);
}

function hideStep1Suggestions(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  container.innerHTML = '';
  container.classList.remove('visible-step1-suggestions');
}

function renderStep1Suggestions(params: {
  containerId: string;
  dictionaryType: DictionaryType;
  query: string;
}) {
  const container = document.getElementById(params.containerId);
  if (!container) {
    return;
  }

  const matches = getStep1SuggestionMatches(params.dictionaryType, params.query);
  if (!matches.length) {
    hideStep1Suggestions(params.containerId);
    return;
  }

  container.innerHTML = matches
    .map(
      (item) => `
        <button
          type="button"
          class="step1-suggestion-item"
          data-step1-suggestion-value="${escapeHtml(item.value)}"
        >
          ${escapeHtml(item.value)}
        </button>
      `
    )
    .join('');
  container.classList.add('visible-step1-suggestions');
}

function buildEmptyTemplateBlock(templateType: TemplateBlockType): TemplateBlockFormData {
  return {
    id: generateId(),
    templateType,
    purposeType: '',
    blockTitle: '',
    primaryLabel: '',
    primaryUnit: '',
    secondaryLabel: '',
    secondaryUnit: '',
    dataText: '',
    note: '',
    sourceFileName: '',
    sourceFilePath: '',
    originalFileName: '',
    originalFilePath: '',
    replacementSourcePath: '',
    replacementOriginalName: '',
    importPreviewLoading: false,
    importPreviewError: '',
    importParserLabel: '',
    importWarnings: [],
    importPreviewSelectedName: '',
    importPreviewSelectedPath: ''
  };
}

function buildRecommendedScalarItem(
  role: ScalarItemRole,
  recommendation?: Step2RecommendedScalarItem
) {
  return {
    ...buildEmptyDataItem(role),
    itemName: recommendation?.name || '',
    itemUnit: recommendation?.defaultUnit || ''
  };
}

function buildRecommendedTemplateBlock(
  templateType: TemplateBlockType,
  recommendation?: Step2RecommendedStructuredBlock
): TemplateBlockFormData {
  const block = buildEmptyTemplateBlock(templateType);
  if (!recommendation) {
    return block;
  }

  return {
    ...block,
    purposeType: recommendation.purposeType || '',
    blockTitle: recommendation.titleSuggestion || '',
    primaryLabel: recommendation.primaryLabel || '',
    primaryUnit: recommendation.primaryUnit || '',
    secondaryLabel: recommendation.secondaryLabel || '',
    secondaryUnit: recommendation.secondaryUnit || ''
  };
}

function getTemplateBlocksForContext(context: TemplateBlockEditContext) {
  return context === 'detail-edit' ? detailEditTemplateBlocks : step2TemplateBlocks;
}

function getScalarItemsForContext(context: ScalarItemEditContext) {
  return context === 'detail-edit' ? detailEditStep2 : step2DataItems;
}

function setScalarItemsForContext(context: ScalarItemEditContext, rows: DataItem[]) {
  if (context === 'detail-edit') {
    detailEditStep2 = rows;
    return;
  }

  step2DataItems = rows;
}

function setTemplateBlocksForContext(context: TemplateBlockEditContext, blocks: TemplateBlockFormData[]) {
  if (context === 'detail-edit') {
    detailEditTemplateBlocks = blocks;
    return;
  }

  step2TemplateBlocks = blocks;
}

function getActiveTemplateBlockImportId(context: TemplateBlockEditContext) {
  return context === 'detail-edit'
    ? detailActiveTemplateBlockImportId
    : step2ActiveTemplateBlockImportId;
}

function setActiveTemplateBlockImportId(context: TemplateBlockEditContext, blockId: string) {
  if (context === 'detail-edit') {
    detailActiveTemplateBlockImportId = blockId;
    return;
  }

  step2ActiveTemplateBlockImportId = blockId;
}

function getStep2TemplateContext(context: ScalarItemEditContext | TemplateBlockEditContext | 'detail-readonly') {
  if (context === 'detail-edit') {
    return detailEditStep1?.testProject || currentDetail?.testProject || '';
  }

  if (context === 'detail-readonly') {
    return currentDetail?.testProject || '';
  }

  return step1FormData.testProject;
}

function getActiveStep2TemplateFamily(
  context: ScalarItemEditContext | TemplateBlockEditContext | 'detail-readonly'
) {
  return resolveStep2TemplateFamily(getStep2TemplateContext(context));
}

function getLocalizedTemplateFamilyLabel(family: Step2TemplateFamily) {
  if (family.id === 'generic') {
    return t('step2.templateContext.family.generic');
  }

  return family.label;
}

function renderStep2TemplateContextHint(
  context: ScalarItemEditContext | TemplateBlockEditContext | 'detail-readonly'
) {
  const family = getActiveStep2TemplateFamily(context);
  if (!family) {
    return '';
  }

  const testProject = getStep2TemplateContext(context);

  return `
    <div class="step2-template-context-hint">
      <div class="step2-template-context-title">${escapeHtml(
        t('step2.templateContext.title', {
          family: getLocalizedTemplateFamilyLabel(family)
        })
      )}</div>
      <div class="step2-template-context-body">
        ${escapeHtml(t('step2.templateContext.body', { project: testProject || t('step2.templateContext.unspecifiedProject') }))}
      </div>
    </div>
  `;
}

function renderScalarRecommendationButtons(
  context: ScalarItemEditContext,
  role: ScalarItemRole,
  items: Step2RecommendedScalarItem[]
) {
  if (!items.length) {
    return '';
  }

  return `
    <div class="step2-template-recommendation-row">
      <div class="step2-template-recommendation-label">${escapeHtml(
        getScalarRoleMeta(role).recommendationLabel
      )}</div>
      <div class="step2-template-recommendation-list">
        ${items
          .map((item) => {
            const defaultUnit = item.defaultUnit ? ` · ${item.defaultUnit}` : '';
            const valueNature = getValueNatureLabelText(item.valueNatures);

            return `
              <button
                class="step2-template-pill"
                type="button"
                data-template-scalar-context="${context}"
                data-template-scalar-role="${role}"
                data-template-scalar-name="${escapeHtml(item.name)}"
                data-template-scalar-unit="${escapeHtml(item.defaultUnit)}"
              >
                <span>${escapeHtml(item.name)}${escapeHtml(defaultUnit)}</span>
                ${valueNature
                  ? `<span class="step2-template-pill-meta">${escapeHtml(valueNature)}</span>`
                  : ''}
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderStructuredRecommendationButtons(
  context: TemplateBlockEditContext,
  family: Step2TemplateFamily | null
) {
  if (!family?.recommendedStructuredBlocks.length) {
    return '';
  }

  return `
    <div class="step2-template-recommendation-row">
      <div class="step2-template-recommendation-label">${escapeHtml(t('step2.structured.recommendationLabel'))}</div>
      <div class="step2-template-recommendation-list">
        ${family.recommendedStructuredBlocks
          .map(
            (item, index) => `
              <button
                class="step2-template-pill"
                type="button"
                data-template-block-context="${context}"
                data-template-block-recommendation-index="${index}"
              >
                <span>${escapeHtml(item.label)}</span>
                <span class="step2-template-pill-meta">${escapeHtml(
                  getStructuredBlockPurposeLabel(item.purposeType)
                )}</span>
              </button>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}

function getDefaultStructuredRecommendation(context: TemplateBlockEditContext) {
  return getActiveStep2TemplateFamily(context)?.recommendedStructuredBlocks[0];
}

function renderEditableStructuredSectionContent(
  context: TemplateBlockEditContext,
  blocks: TemplateBlockFormData[],
  addButtonId: string
) {
  return `
    <div class="template-block-toolbar">
      <button id="${addButtonId}" class="secondary-btn" type="button">${escapeHtml(t('step2.structured.addButton'))}</button>
    </div>
    ${renderStructuredRecommendationButtons(context, getActiveStep2TemplateFamily(context))}
    ${renderTemplateBlockCards(blocks, context)}
  `;
}

function resetTemplateBlockImportState(context: TemplateBlockEditContext) {
  setActiveTemplateBlockImportId(context, '');
  setTemplateBlocksForContext(
    context,
    getTemplateBlocksForContext(context).map((block) => ({
      ...block,
      importPreviewLoading: false,
      importPreviewError: '',
      importParserLabel: '',
      importWarnings: [] as string[],
      importPreviewCandidate: undefined as ImportPreviewFileResult['candidates'][number] | undefined,
      importPreviewSelectedName: '',
      importPreviewSelectedPath: '',
      importManualReview: undefined as ImportReviewManualState | undefined
    }))
  );
}

function buildManualReviewState(
  block: TemplateBlockFormData,
  file: ImportPreviewFileResult
): ImportReviewManualState | undefined {
  if (!file.manualReview) {
    return undefined;
  }

  return {
    available: true,
    delimiter: file.manualReview.suggestedDelimiter,
    suggestedDelimiter: file.manualReview.suggestedDelimiter,
    previewRows: file.manualReview.previewRows,
    maxColumnCount: file.manualReview.maxColumnCount,
    dataStartRow: file.manualReview.previewRows.length > 1 ? 2 : 1,
    xSourceMode: file.manualReview.maxColumnCount > 1 ? 'column' : 'generated',
    xColumnIndex: 0,
    yColumnIndex: file.manualReview.maxColumnCount > 1 ? 1 : 0,
    generatedXStart: 0,
    generatedXStep: 1,
    previewLoading: false,
    previewError: ''
  };
}

function updateManualReviewPreviewRows(
  existing: ImportReviewManualState,
  next: NonNullable<PreviewManualImportXYResult['manualReview']>
): ImportReviewManualState {
  const nextMaxColumnCount = next.maxColumnCount;
  const nextXSourceMode =
    nextMaxColumnCount > 1
      ? existing.xSourceMode
      : 'generated';

  return {
    ...existing,
    delimiter: next.suggestedDelimiter,
    suggestedDelimiter: next.suggestedDelimiter,
    previewRows: next.previewRows,
    maxColumnCount: nextMaxColumnCount,
    xSourceMode: nextXSourceMode,
    yColumnIndex:
      nextMaxColumnCount > 1
        ? Math.min(existing.yColumnIndex, nextMaxColumnCount - 1)
        : 0
  };
}

function syncTemplateBlockImportInputsToState(context: TemplateBlockEditContext) {
  setTemplateBlocksForContext(
    context,
    getTemplateBlocksForContext(context).map((block) => {
      if (!block.importManualReview) {
        return block;
      }

      return {
        ...block,
        importManualReview: {
          ...block.importManualReview,
          xSourceMode:
            ((document.getElementById(
              `template-block-import-x-source-${block.id}`
            ) as HTMLSelectElement | null)?.value as ImportManualXAxisSourceMode | undefined) ||
            block.importManualReview.xSourceMode,
          delimiter:
            ((document.getElementById(
              `template-block-import-delimiter-${block.id}`
            ) as HTMLSelectElement | null)?.value as ImportManualDelimiter | undefined) ||
            block.importManualReview.delimiter,
          dataStartRow:
            Number(
              (document.getElementById(
                `template-block-import-start-row-${block.id}`
              ) as HTMLInputElement | null)?.value || block.importManualReview.dataStartRow
            ) || block.importManualReview.dataStartRow,
          xColumnIndex:
            Math.max(
              0,
              Number(
                (document.getElementById(
                  `template-block-import-x-column-${block.id}`
                ) as HTMLInputElement | null)?.value || block.importManualReview.xColumnIndex + 1
              ) - 1
            ),
          yColumnIndex:
            Math.max(
              0,
              Number(
                (document.getElementById(
                  `template-block-import-y-column-${block.id}`
                ) as HTMLInputElement | null)?.value || block.importManualReview.yColumnIndex + 1
              ) - 1
            ),
          generatedXStart:
            Number(
              (document.getElementById(
                `template-block-import-generated-start-${block.id}`
              ) as HTMLInputElement | null)?.value || block.importManualReview.generatedXStart
            ) || 0,
          generatedXStep:
            Number(
              (document.getElementById(
                `template-block-import-generated-step-${block.id}`
              ) as HTMLInputElement | null)?.value || block.importManualReview.generatedXStep
            ) || block.importManualReview.generatedXStep,
        }
      };
    })
  );
}

function applyTemplateBlockImportCandidate(params: {
  context: TemplateBlockEditContext;
  blockId: string;
}) {
  setTemplateBlocksForContext(
    params.context,
    getTemplateBlocksForContext(params.context).map((block) => {
      if (block.id !== params.blockId) {
        return block;
      }

      const candidate = block.importPreviewCandidate;
      if (!candidate || candidate.candidateType !== 'templateBlock') {
        return block;
      }

      const nextImportManualReview = block.importManualReview
        ? {
            ...block.importManualReview,
            previewLoading: false,
            previewError: ''
          }
        : undefined;

      return {
        ...block,
        purposeType: candidate.templateBlock.purposeType || block.purposeType || '',
        blockTitle: candidate.templateBlock.blockTitle,
        primaryLabel: candidate.templateBlock.xLabel,
        primaryUnit: candidate.templateBlock.xUnit,
        secondaryLabel: candidate.templateBlock.yLabel,
        secondaryUnit: candidate.templateBlock.yUnit,
        dataText: formatXYPointInput(candidate.templateBlock.points),
        note: candidate.templateBlock.note,
        originalFileName: block.importPreviewSelectedName || block.originalFileName,
        originalFilePath: block.importPreviewSelectedPath || block.originalFilePath,
        replacementSourcePath: block.sourceFilePath
          ? block.importPreviewSelectedPath || block.replacementSourcePath || ''
          : '',
        replacementOriginalName: block.sourceFilePath
          ? block.importPreviewSelectedName || block.replacementOriginalName || ''
          : '',
        sourceFileName: block.sourceFilePath ? block.sourceFileName : '',
        sourceFilePath: block.sourceFilePath ? block.sourceFilePath : '',
        importParserLabel: candidate.parserLabel,
        importWarnings: candidate.warnings,
        importPreviewError: '',
        importManualReview: nextImportManualReview
      };
    })
  );
  setActiveTemplateBlockImportId(params.context, '');
}

async function handleTemplateBlockImportSelection(
  context: TemplateBlockEditContext,
  blockId: string
) {
  if (context === 'detail-edit') {
    collectDetailEditState();
  } else {
    saveStep2InputsToState();
  }

  syncTemplateBlockImportInputsToState(context);
  setActiveTemplateBlockImportId(context, blockId);
  setTemplateBlocksForContext(
    context,
    getTemplateBlocksForContext(context).map((block) => ({
      ...block,
      importPreviewError: block.id === blockId ? '' : block.importPreviewError,
      importPreviewLoading: block.id === blockId,
      importParserLabel: block.id === blockId ? '' : block.importParserLabel,
      importWarnings: block.id === blockId ? [] : block.importWarnings,
      importManualReview: block.id === blockId ? block.importManualReview : block.importManualReview
    }))
  );
  requestRender(true);

  try {
    const selected = await window.electronAPI.selectSourceFile();
    if (!selected) {
      setTemplateBlocksForContext(
        context,
        getTemplateBlocksForContext(context).map((block) => ({
          ...block,
          importPreviewLoading: block.id === blockId ? false : block.importPreviewLoading
        }))
      );
      requestRender(true);
      return;
    }

    const previewResult = await window.electronAPI.previewImportFiles({
      filePaths: [selected.originalPath]
    });
    const previewFile = previewResult.files[0];

    if (!previewFile) {
      setTemplateBlocksForContext(
        context,
        getTemplateBlocksForContext(context).map((block) => ({
          ...block,
          importPreviewLoading: block.id === blockId ? false : block.importPreviewLoading,
          importPreviewError: block.id === blockId ? '导入预览失败' : block.importPreviewError
        }))
      );
      requestRender(true);
      return;
    }

    setTemplateBlocksForContext(
      context,
      getTemplateBlocksForContext(context).map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        return {
          ...block,
          importPreviewLoading: false,
          importPreviewError: previewFile.error || '',
          importParserLabel: previewFile.parserLabel || '',
          importWarnings: previewFile.warnings,
          importPreviewCandidate: previewFile.candidates[0],
          importPreviewSelectedName: selected.originalName,
          importPreviewSelectedPath: selected.originalPath,
          importManualReview: buildManualReviewState(block, previewFile),
        };
      })
    );
  } catch (error) {
    setTemplateBlocksForContext(
      context,
      getTemplateBlocksForContext(context).map((block) => ({
        ...block,
        importPreviewLoading: block.id === blockId ? false : block.importPreviewLoading,
        importPreviewError:
          block.id === blockId
            ? getErrorMessage(error) || '导入预览失败'
            : block.importPreviewError
      }))
    );
  }

  requestRender(true);
}

async function regenerateTemplateBlockImportFromManualReview(
  context: TemplateBlockEditContext,
  blockId: string
) {
  if (context === 'detail-edit') {
    collectDetailEditState();
  } else {
    saveStep2InputsToState();
  }

  syncTemplateBlockImportInputsToState(context);
  const targetBlock = getTemplateBlocksForContext(context).find((block) => block.id === blockId);
  if (!targetBlock?.importManualReview) {
    return;
  }

  const importFilePath = targetBlock.importPreviewSelectedPath || targetBlock.originalFilePath;
  const importFileName = targetBlock.importPreviewSelectedName || targetBlock.originalFileName;
  if (!importFilePath) {
    setTemplateBlocksForContext(
      context,
      getTemplateBlocksForContext(context).map((block) => {
        if (block.id !== blockId || !block.importManualReview) {
          return block;
        }

        return {
          ...block,
          importManualReview: {
            ...block.importManualReview,
            previewLoading: false,
            previewError: '导入文件不存在或者路径无效'
          }
        };
      })
    );
    requestRender(true);
    return;
  }

  targetBlock.importManualReview.previewLoading = true;
  targetBlock.importManualReview.previewError = '';
  requestRender(true);

  try {
    const result = await window.electronAPI.previewManualImportXY({
      filePath: importFilePath,
      delimiter: targetBlock.importManualReview.delimiter,
      dataStartRow: targetBlock.importManualReview.dataStartRow,
      xSourceMode: targetBlock.importManualReview.xSourceMode,
      xColumnIndex: targetBlock.importManualReview.xColumnIndex,
      yColumnIndex: targetBlock.importManualReview.yColumnIndex,
      generatedXStart: targetBlock.importManualReview.generatedXStart,
      generatedXStep: targetBlock.importManualReview.generatedXStep,
      purposeType: targetBlock.purposeType || '',
      blockTitle: targetBlock.blockTitle,
      xLabel: targetBlock.primaryLabel,
      xUnit: targetBlock.primaryUnit,
      yLabel: targetBlock.secondaryLabel,
      yUnit: targetBlock.secondaryUnit
    });

    if (!result.success || !result.candidate) {
      setTemplateBlocksForContext(
        context,
        getTemplateBlocksForContext(context).map((block) => {
          if (block.id !== blockId || !block.importManualReview) {
            return block;
          }

          return {
            ...block,
            importManualReview: {
              ...block.importManualReview,
              previewLoading: false,
              previewError: result.error || '手动预览生成失败'
            }
          };
        })
      );
      requestRender(true);
      return;
    }

    setTemplateBlocksForContext(
      context,
      getTemplateBlocksForContext(context).map((block) => {
        if (block.id !== blockId || !block.importManualReview) {
          return block;
        }

        return {
          ...block,
          importManualReview: {
            ...(result.manualReview
              ? updateManualReviewPreviewRows(block.importManualReview, result.manualReview)
              : block.importManualReview),
            previewLoading: false,
            previewError: ''
          },
          importPreviewCandidate: result.candidate,
          importParserLabel: result.candidate.parserLabel,
          importWarnings: result.candidate.warnings,
          importPreviewSelectedPath: importFilePath,
          importPreviewSelectedName: importFileName
        };
      })
    );
  } catch (error) {
    setTemplateBlocksForContext(
      context,
      getTemplateBlocksForContext(context).map((block) => {
        if (block.id !== blockId || !block.importManualReview) {
          return block;
        }

        return {
          ...block,
          importManualReview: {
            ...block.importManualReview,
            previewLoading: false,
            previewError: getErrorMessage(error) || '手动预览生成失败'
          }
        };
      })
    );
  }

  requestRender(true);
}

function addTemplateBlockForContext(
  context: TemplateBlockEditContext,
  templateType: TemplateBlockType = XY_TEMPLATE_TYPE,
  recommendation?: Step2RecommendedStructuredBlock
) {
  const block = buildRecommendedTemplateBlock(templateType, recommendation);
  if (context === 'detail-edit') {
    detailEditTemplateBlocks = [...detailEditTemplateBlocks, block];
    return;
  }

  step2TemplateBlocks = [...step2TemplateBlocks, block];
}

function bindTemplateBlockEditorEvents(params: {
  context: TemplateBlockEditContext;
  addButtonId?: string;
}) {
  if (params.addButtonId) {
    document.getElementById(params.addButtonId)?.addEventListener('click', () => {
      if (params.context === 'detail-edit') {
        collectDetailEditState();
      } else {
        saveStep2InputsToState();
      }

      addTemplateBlockForContext(
        params.context,
        XY_TEMPLATE_TYPE,
        getDefaultStructuredRecommendation(params.context)
      );
      requestRender(true);
    });
  }

  document.querySelectorAll('[data-template-block-recommendation-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const context = target.dataset.templateBlockContext as TemplateBlockEditContext | undefined;
      const recommendationIndex = Number(target.dataset.templateBlockRecommendationIndex);
      if (context !== params.context || Number.isNaN(recommendationIndex)) {
        return;
      }

      if (params.context === 'detail-edit') {
        collectDetailEditState();
      } else {
        saveStep2InputsToState();
      }

      const recommendation =
        getActiveStep2TemplateFamily(params.context)?.recommendedStructuredBlocks[recommendationIndex];
      addTemplateBlockForContext(params.context, XY_TEMPLATE_TYPE, recommendation);
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-remove-template-block-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const blockId = target.dataset.removeTemplateBlockId;
      if (!blockId) return;

      if (params.context === 'detail-edit') {
        collectDetailEditState();
        detailEditTemplateBlocks = detailEditTemplateBlocks.filter((block) => block.id !== blockId);
        if (detailActiveTemplateBlockImportId === blockId) {
          detailActiveTemplateBlockImportId = '';
        }
      } else {
        saveStep2InputsToState();
        step2TemplateBlocks = step2TemplateBlocks.filter((block) => block.id !== blockId);
        if (step2ActiveTemplateBlockImportId === blockId) {
          step2ActiveTemplateBlockImportId = '';
        }
      }

      requestRender(true);
    });
  });

  document.querySelectorAll('[data-template-file-block-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button as HTMLElement;
      const blockId = target.dataset.templateFileBlockId;
      if (!blockId) return;

      await handleTemplateBlockImportSelection(params.context, blockId);
    });
  });

  document.querySelectorAll('[data-template-block-apply-import-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const blockId = target.dataset.templateBlockApplyImportId;
      if (!blockId) return;

      if (params.context === 'detail-edit') {
        collectDetailEditState();
      } else {
        saveStep2InputsToState();
      }

      applyTemplateBlockImportCandidate({
        context: params.context,
        blockId
      });
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-template-block-toggle-import-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const blockId = target.dataset.templateBlockToggleImportId;
      if (!blockId) return;

      if (params.context === 'detail-edit') {
        collectDetailEditState();
      } else {
        saveStep2InputsToState();
      }

      syncTemplateBlockImportInputsToState(params.context);
      setActiveTemplateBlockImportId(
        params.context,
        getActiveTemplateBlockImportId(params.context) === blockId ? '' : blockId
      );
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-template-block-manual-preview-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button as HTMLElement;
      const blockId = target.dataset.templateBlockManualPreviewId;
      if (!blockId) return;

      await regenerateTemplateBlockImportFromManualReview(params.context, blockId);
    });
  });

  document.querySelectorAll('[data-template-block-import-x-source-id]').forEach((select) => {
    select.addEventListener('change', () => {
      if (params.context === 'detail-edit') {
        collectDetailEditState();
      } else {
        saveStep2InputsToState();
      }

      syncTemplateBlockImportInputsToState(params.context);
      requestRender(true);
    });
  });
}

function refreshDetailEditTemplateRecommendations() {
  if (!detailEditMode || !detailEditStep1) {
    return;
  }

  const collected = collectDetailEditState();
  if (!collected) {
    return;
  }

  const scalarSectionsContainer = document.getElementById('detail-edit-scalar-sections');
  const structuredSectionContainer = document.getElementById('detail-edit-structured-section-body');
  if (!scalarSectionsContainer || !structuredSectionContainer) {
    return;
  }

  scalarSectionsContainer.innerHTML = renderScalarSections('detail-edit', detailEditStep2);
  structuredSectionContainer.innerHTML = renderEditableStructuredSectionContent(
    'detail-edit',
    detailEditTemplateBlocks,
    'detail-add-template-block-btn'
  );

  bindScalarItemEditorEvents({
    context: 'detail-edit',
    addConditionButtonId: 'detail-add-condition-row-btn',
    addMetricButtonId: 'detail-add-metric-row-btn'
  });

  bindTemplateBlockEditorEvents({
    context: 'detail-edit',
    addButtonId: 'detail-add-template-block-btn'
  });
}

function syncDetailEditStep1InputsToState() {
  if (!detailEditStep1) {
    return null;
  }

  detailEditStep1.testProject =
    (document.getElementById('edit-testProject') as HTMLInputElement)?.value.trim() || '';
  detailEditStep1.sampleCode =
    (document.getElementById('edit-sampleCode') as HTMLInputElement)?.value.trim() || '';
  detailEditStep1.tester =
    (document.getElementById('edit-tester') as HTMLInputElement)?.value.trim() || '';
  detailEditStep1.instrument =
    (document.getElementById('edit-instrument') as HTMLInputElement)?.value.trim() || '';
  detailEditStep1.testTime =
    (document.getElementById('edit-testTime') as HTMLInputElement)?.value || '';
  detailEditStep1.sampleOwner =
    (document.getElementById('edit-sampleOwner') as HTMLInputElement)?.value.trim() || '';

  detailEditStep1.dynamicFields = detailEditStep1.dynamicFields.map((field, index) => ({
    ...field,
    name:
      (document.getElementById(`edit-dynamic-name-${index}`) as HTMLInputElement)?.value.trim() ||
      '',
    value:
      (document.getElementById(`edit-dynamic-value-${index}`) as HTMLInputElement)?.value.trim() ||
      ''
  }));

  return detailEditStep1;
}

function refreshDetailEditDerivedNamePreview() {
  const syncedStep1 = syncDetailEditStep1InputsToState();
  if (!syncedStep1) {
    return;
  }

  const derivedDisplayName = buildDisplayName(syncedStep1);
  const heading = document.getElementById('detail-display-name-heading');
  const preview = document.getElementById('detail-edit-display-name-preview');

  if (heading) {
    heading.textContent = derivedDisplayName;
  }

  if (preview) {
    preview.textContent = derivedDisplayName;
  }
}

function bindDetailEditTemplateContextReactivity() {
  const testProjectInput = document.getElementById('edit-testProject') as HTMLInputElement | null;
  const previewFieldIds = ['edit-sampleCode', 'edit-tester', 'edit-instrument', 'edit-testTime'];

  previewFieldIds.forEach((fieldId) => {
    const input = document.getElementById(fieldId) as HTMLInputElement | null;
    if (!input) {
      return;
    }

    input.addEventListener('input', refreshDetailEditDerivedNamePreview);
    input.addEventListener('change', refreshDetailEditDerivedNamePreview);
  });

  if (testProjectInput) {
    const refreshRecommendations = () => {
      refreshDetailEditDerivedNamePreview();
      refreshDetailEditTemplateRecommendations();
    };

    testProjectInput.addEventListener('input', refreshRecommendations);
    testProjectInput.addEventListener('change', refreshRecommendations);
  }

  refreshDetailEditDerivedNamePreview();
}

function getScalarFileButtonLabel(item: DataItem) {
  if (item.sourceFileName || item.originalFileName || item.replacementOriginalName) {
    return t('step2.scalar.replaceFile');
  }

  return t('step2.scalar.selectFile');
}

function renderEditableScalarSection(
  context: ScalarItemEditContext,
  role: ScalarItemRole,
  rows: DataItem[]
) {
  const meta = getScalarRoleMeta(role);
  const family = getActiveStep2TemplateFamily(context);
  const oppositeRole: ScalarItemRole = role === 'condition' ? 'metric' : 'condition';
  const contextPrefix = context === 'detail-edit' ? 'detail' : 'create';
  const addButtonId =
    role === 'condition'
      ? `${contextPrefix}-add-condition-row-btn`
      : `${contextPrefix}-add-metric-row-btn`;

  return `
    <div class="detail-section">
      <div class="dynamic-header">
        <div>
          <div class="dynamic-title">${meta.title}</div>
          <div class="dynamic-subtitle">${meta.subtitle}</div>
        </div>
        <div class="table-toolbar">
          <button id="${addButtonId}" class="secondary-btn" type="button">${meta.addButtonLabel}</button>
        </div>
      </div>

      ${renderScalarRecommendationButtons(
        context,
        role,
        role === 'condition'
          ? family?.recommendedConditions || []
          : family?.recommendedMetrics || []
      )}

      ${rows.length
        ? `
            <div class="data-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(meta.nameHeader)}</th>
                    <th>${escapeHtml(meta.valueHeader)}</th>
                    <th>${escapeHtml(t('step2.table.unitHeader'))}</th>
                    <th>${escapeHtml(meta.fileHeader)}</th>
                    <th>${escapeHtml(t('step2.table.actionsHeader'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map((row) => {
                      const fileMeta = [
                        `${t('step2.import.originalFileLabel')}：${escapeHtml(getPendingOriginalName(row))}`,
                        row.sourceFileName ? `${t('step2.import.savedFileLabel')}：${escapeHtml(row.sourceFileName)}` : ''
                      ]
                        .filter(Boolean)
                        .join(' · ');

                      return `
                        <tr>
                          <td>
                            <input
                              id="scalar-item-name-${row.id}"
                              class="table-input"
                              placeholder="${escapeHtml(role === 'condition' ? t('step2.condition.namePlaceholder') : t('step2.metric.namePlaceholder'))}"
                              value="${escapeHtml(row.itemName)}"
                            />
                          </td>
                          <td>
                            <input
                              id="scalar-item-value-${row.id}"
                              class="table-input"
                              placeholder="${escapeHtml(t('step2.table.valuePlaceholder'))}"
                              value="${escapeHtml(row.itemValue)}"
                            />
                          </td>
                          <td>
                            <input
                              id="scalar-item-unit-${row.id}"
                              class="table-input"
                              placeholder="${escapeHtml(t('step2.table.unitPlaceholder'))}"
                              value="${escapeHtml(row.itemUnit)}"
                            />
                          </td>
                          <td>
                            <div class="detail-file-edit-cell">
                              <button
                                class="file-btn"
                                type="button"
                                data-scalar-file-row-id="${row.id}"
                                data-scalar-file-context="${context}"
                                title="${escapeHtml(row.sourceFilePath || row.originalFilePath || row.replacementSourcePath || '')}"
                              >
                                ${escapeHtml(getScalarFileButtonLabel(row))}
                              </button>
                              <div>${fileMeta || `${escapeHtml(t('step2.import.originalFileLabel'))}：-`}</div>
                            </div>
                          </td>
                          <td>
                            <div class="detail-file-edit-cell">
                              <button
                                class="secondary-btn detail-replace-file-btn"
                                type="button"
                                data-move-scalar-row-id="${row.id}"
                                data-move-scalar-context="${context}"
                                data-target-scalar-role="${oppositeRole}"
                              >
                                ${escapeHtml(role === 'condition' ? t('step2.scalar.moveToMetric') : t('step2.scalar.moveToCondition'))}
                              </button>
                              <button
                                class="danger-btn small-danger-btn"
                                type="button"
                                data-remove-scalar-row-id="${row.id}"
                                data-remove-scalar-context="${context}"
                              >
                                ${escapeHtml(t('dictionary.delete'))}
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
        : `<div class="empty-tip">${meta.emptyText}</div>`}
    </div>
  `;
}

function renderReadonlyScalarSection(role: ScalarItemRole, rows: ExperimentDetail['dataItems']) {
  const meta = getScalarRoleMeta(role);

  return `
    <div class="detail-section">
      <div class="detail-section-title">${meta.title}</div>
      <div class="detail-section-subtitle">${meta.subtitle}</div>
      ${rows.length
        ? `
            <div class="data-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(t('step2.table.nameHeader'))}</th>
                    <th>${escapeHtml(t('step2.table.valueHeader'))}</th>
                    <th>${escapeHtml(t('step2.table.unitHeader'))}</th>
                    <th>${escapeHtml(t('step2.table.savedFileHeader'))}</th>
                    <th>${escapeHtml(t('step2.table.originalFileHeader'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (item) => `
                        <tr>
                          <td>${escapeHtml(item.itemName)}</td>
                          <td>${escapeHtml(item.itemValue)}</td>
                          <td>${escapeHtml(item.itemUnit || '-')}</td>
                          <td>
                            ${item.sourceFileName && item.sourceFilePath
                              ? `
                                  <div class="saved-file-cell">
                                    <button
                                      class="file-link-btn"
                                      type="button"
                                      data-open-saved-file="${escapeHtml(item.sourceFilePath)}"
                                    >
                                      ${escapeHtml(item.sourceFileName)}
                                    </button>
                                    <button
                                      class="file-folder-btn"
                                      type="button"
                                      data-open-saved-folder="${escapeHtml(item.sourceFilePath)}"
                                      title="${escapeHtml(t('databaseDetail.openFolderTitle'))}"
                                    >
                                      ${escapeHtml(t('databaseDetail.openFolder'))}
                                    </button>
                                  </div>
                                `
                              : '-'}
                          </td>
                          <td>${escapeHtml(item.originalFileName || '-')}</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
        : `<div class="empty-tip">${meta.emptyText}</div>`}
    </div>
  `;
}

function renderScalarSections(
  context: ScalarItemEditContext,
  rows: DataItem[]
) {
  const conditionRows = rows.filter((row) => (row.scalarRole || 'metric') === 'condition');
  const metricRows = rows.filter((row) => (row.scalarRole || 'metric') === 'metric');

  return `
    ${renderStep2TemplateContextHint(context)}
    ${renderEditableScalarSection(context, 'condition', conditionRows)}
    ${renderEditableScalarSection(context, 'metric', metricRows)}
  `;
}

function validateScalarItems(rows: DataItem[]) {
  for (const row of rows) {
    const hasName = !!row.itemName;
    const hasValue = !!row.itemValue;
    const hasUnit = !!row.itemUnit;
    const hasFile = !!row.sourceFileName || !!row.replacementOriginalName || !!row.originalFileName;

    if ((hasName || hasValue || hasUnit || hasFile) && !hasName) {
      return t('step2.validation.missingName');
    }

    if ((hasName || hasValue || hasUnit || hasFile) && !hasValue) {
      return t('step2.validation.missingValue');
    }
  }

  return '';
}

async function handleScalarFileSelection(context: ScalarItemEditContext, rowId: string) {
  if (context === 'detail-edit') {
    collectDetailEditState();
  } else {
    saveStep2InputsToState();
  }

  try {
    const selected = await window.electronAPI.selectSourceFile();
    if (!selected) return;

    if (context === 'detail-edit') {
      setScalarItemsForContext(
        context,
        getScalarItemsForContext(context).map((item) =>
          item.id !== rowId
            ? item
            : {
                ...item,
                replacementSourcePath: selected.originalPath,
                replacementOriginalName: selected.originalName
              }
        )
      );
      requestRender(true);
      return;
    }

    const copied = await window.electronAPI.copyFileToStorage({
      sourcePath: selected.originalPath,
      testProject: step1FormData.testProject,
      sampleCode: step1FormData.sampleCode,
      tester: step1FormData.tester,
      instrument: step1FormData.instrument,
      testTime: step1FormData.testTime,
      displayName: buildDisplayName(step1FormData),
      sectionLabel: getScalarSectionLabel(
        getScalarItemsForContext(context).find((row) => row.id === rowId)?.scalarRole
      ),
      secondaryItemName:
        getScalarItemsForContext(context).find((row) => row.id === rowId)?.itemName || ''
    });

    if (!copied.success || !copied.savedFileName || !copied.savedPath) {
      alert(copied.error || '复制原始文件失败');
      return;
    }

    setScalarItemsForContext(
      context,
      getScalarItemsForContext(context).map((row) =>
        row.id !== rowId
          ? row
          : {
              ...row,
              sourceFileName: copied.savedFileName,
              sourceFilePath: copied.savedPath,
              originalFileName: selected.originalName,
              originalFilePath: selected.originalPath
            }
      )
    );

    requestRender(true);

    if (copied.warning) {
      alert(copied.warning);
    }
  } catch (error) {
    handleAsyncError(error, context === 'detail-edit' ? '选择替换文件失败' : '处理原始文件失败');
  }
}

function bindScalarItemEditorEvents(params: {
  context: ScalarItemEditContext;
  addConditionButtonId: string;
  addMetricButtonId: string;
}) {
  const syncStateBeforeMutation = () => {
    if (params.context === 'detail-edit') {
      collectDetailEditState();
    } else {
      saveStep2InputsToState();
    }
  };

  document.getElementById(params.addConditionButtonId)?.addEventListener('click', () => {
    syncStateBeforeMutation();

    setScalarItemsForContext(params.context, [
      ...getScalarItemsForContext(params.context),
      buildEmptyDataItem('condition')
    ]);
    requestRender(true);
  });

  document.getElementById(params.addMetricButtonId)?.addEventListener('click', () => {
    syncStateBeforeMutation();

    setScalarItemsForContext(params.context, [
      ...getScalarItemsForContext(params.context),
      buildEmptyDataItem('metric')
    ]);
    requestRender(true);
  });

  document.querySelectorAll('[data-template-scalar-name]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const context = target.dataset.templateScalarContext as ScalarItemEditContext | undefined;
      const role = target.dataset.templateScalarRole as ScalarItemRole | undefined;
      const name = target.dataset.templateScalarName || '';
      const unit = target.dataset.templateScalarUnit || '';
      if (context !== params.context || !role) {
        return;
      }

      syncStateBeforeMutation();
      setScalarItemsForContext(params.context, [
        ...getScalarItemsForContext(params.context),
        buildRecommendedScalarItem(role, { name, defaultUnit: unit })
      ]);
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-remove-scalar-row-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const rowId = target.dataset.removeScalarRowId;
      const rowContext = target.dataset.removeScalarContext as ScalarItemEditContext | undefined;
      if (!rowId || rowContext !== params.context) return;

      syncStateBeforeMutation();

      setScalarItemsForContext(
        params.context,
        getScalarItemsForContext(params.context).filter((row) => row.id !== rowId)
      );
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-move-scalar-row-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const rowId = target.dataset.moveScalarRowId;
      const rowContext = target.dataset.moveScalarContext as ScalarItemEditContext | undefined;
      const targetRole = target.dataset.targetScalarRole as ScalarItemRole | undefined;
      if (!rowId || rowContext !== params.context || !targetRole) return;

      syncStateBeforeMutation();

      setScalarItemsForContext(
        params.context,
        getScalarItemsForContext(params.context).map((row) =>
          row.id === rowId ? { ...row, scalarRole: targetRole } : row
        )
      );
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-scalar-file-row-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button as HTMLElement;
      const rowId = target.dataset.scalarFileRowId;
      const rowContext = target.dataset.scalarFileContext as ScalarItemEditContext | undefined;
      if (!rowId || rowContext !== params.context) return;

      await handleScalarFileSelection(params.context, rowId);
    });
  });
}

function countTemplateBlockPointLines(dataText: string) {
  return dataText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function renderTemplateBlockImportPanel(block: TemplateBlockFormData) {
  const manualReview = block.importManualReview;
  const warnings = block.importWarnings || [];
  const importCandidate =
    block.importPreviewCandidate?.candidateType === 'templateBlock'
      ? block.importPreviewCandidate
      : null;

  if (
    !block.importPreviewError &&
    !warnings.length &&
    !block.importParserLabel &&
    !manualReview?.available &&
    !importCandidate
  ) {
    return '';
  }

  return `
    <div class="import-manual-review-panel">
      ${block.importPreviewSelectedName
        ? `<div class="import-preview-file-status">${escapeHtml(t('step2.import.previewFile', { file: block.importPreviewSelectedName }))}</div>`
        : ''}
      ${block.importParserLabel
        ? `<div class="import-preview-file-status">${escapeHtml(t('step2.import.detectedParser', { parser: block.importParserLabel }))}</div>`
        : ''}
      ${warnings.length
        ? `
            <div class="import-preview-warning-list">
              ${warnings
                .map((warning) => `<div class="import-preview-warning-item">${escapeHtml(warning)}</div>`)
                .join('')}
            </div>
          `
        : ''}
      ${block.importPreviewError
        ? `<div class="error-message">${escapeHtml(block.importPreviewError)}</div>`
        : ''}
      ${importCandidate
        ? `
            <div class="import-manual-review-title">${escapeHtml(t('step2.import.previewTitle'))}</div>
            <div class="import-manual-review-subtitle">${escapeHtml(t('step2.import.previewSubtitle'))}</div>
            <div class="template-block-grid">
              <div class="form-group">
                <label class="form-label">${escapeHtml(t('step2.import.previewBlockName'))}</label>
                <div class="detail-list-value">${escapeHtml(importCandidate.templateBlock.blockTitle || '-')}</div>
              </div>
              <div class="form-group">
                <label class="form-label">${escapeHtml(t('step2.import.previewPointCount'))}</label>
                <div class="detail-list-value">${importCandidate.templateBlock.points.length}</div>
              </div>
            </div>
            <button
              class="secondary-btn"
              type="button"
              data-template-block-apply-import-id="${block.id}"
            >
              ${escapeHtml(t('step2.import.applyPreview'))}
            </button>
          `
        : ''}
      ${manualReview?.available
        ? `
            <div class="import-manual-review-title">${escapeHtml(t('step2.import.manualReviewTitle'))}</div>
            <div class="import-manual-review-subtitle">${escapeHtml(t('step2.import.manualReviewSubtitle'))}</div>

            <div class="template-block-grid">
              <div class="form-group">
                <label class="form-label">${escapeHtml(t('step2.import.dataStartRow'))}</label>
                <input
                  id="template-block-import-start-row-${block.id}"
                  class="form-input"
                  type="number"
                  min="1"
                  value="${manualReview.dataStartRow}"
                />
              </div>

              <div class="form-group">
                <label class="form-label">${escapeHtml(t('step2.import.xSource'))}</label>
                <select
                  id="template-block-import-x-source-${block.id}"
                  class="form-input"
                  data-template-block-import-x-source-id="${block.id}"
                >
                  <option value="column" ${manualReview.xSourceMode === 'column' ? 'selected' : ''}>${escapeHtml(t('step2.import.xSourceColumn'))}</option>
                  <option value="generated" ${manualReview.xSourceMode === 'generated' ? 'selected' : ''}>${escapeHtml(t('step2.import.xSourceGenerated'))}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${escapeHtml(t('step2.import.delimiter'))}</label>
                <select
                  id="template-block-import-delimiter-${block.id}"
                  class="form-input"
                >
                  <option value="comma" ${manualReview.delimiter === 'comma' ? 'selected' : ''}>${escapeHtml(t('step2.import.delimiterComma'))}</option>
                  <option value="tab" ${manualReview.delimiter === 'tab' ? 'selected' : ''}>${escapeHtml(t('step2.import.delimiterTab'))}</option>
                  <option value="semicolon" ${manualReview.delimiter === 'semicolon' ? 'selected' : ''}>${escapeHtml(t('step2.import.delimiterSemicolon'))}</option>
                  <option value="whitespace" ${manualReview.delimiter === 'whitespace' ? 'selected' : ''}>${escapeHtml(t('step2.import.delimiterWhitespace'))}</option>
                </select>
              </div>

              ${manualReview.xSourceMode === 'column'
                ? `
                    <div class="form-group">
                      <label class="form-label">${escapeHtml(t('step2.import.xColumn'))}</label>
                      <input
                        id="template-block-import-x-column-${block.id}"
                        class="form-input"
                        type="number"
                        min="1"
                        value="${manualReview.xColumnIndex + 1}"
                      />
                    </div>
                  `
                : `
                    <div class="form-group">
                      <label class="form-label">${escapeHtml(t('step2.import.generatedStart'))}</label>
                      <input
                        id="template-block-import-generated-start-${block.id}"
                        class="form-input"
                        type="number"
                        value="${manualReview.generatedXStart}"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label">${escapeHtml(t('step2.import.generatedStep'))}</label>
                      <input
                        id="template-block-import-generated-step-${block.id}"
                        class="form-input"
                        type="number"
                        value="${manualReview.generatedXStep}"
                      />
                    </div>
                  `}

              <div class="form-group">
                <label class="form-label">${escapeHtml(t('step2.import.yColumn'))}</label>
                <input
                  id="template-block-import-y-column-${block.id}"
                  class="form-input"
                  type="number"
                  min="1"
                  value="${manualReview.yColumnIndex + 1}"
                />
              </div>
            </div>

            <button
              class="secondary-btn"
              type="button"
              data-template-block-manual-preview-id="${block.id}"
              ${manualReview.previewLoading ? 'disabled' : ''}
            >
              ${escapeHtml(manualReview.previewLoading ? t('step2.import.generating') : t('step2.import.regenerate'))}
            </button>

            ${manualReview.previewError ? `<div class="error-message">${escapeHtml(manualReview.previewError)}</div>` : ''}

            <div class="import-manual-preview-table-wrapper">
              <table class="import-manual-preview-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(t('step2.import.rowNumber'))}</th>
                    ${Array.from({ length: manualReview.maxColumnCount })
                      .map((_, index) => `<th>${escapeHtml(t('step2.import.columnNumber', { index: index + 1 }))}</th>`)
                      .join('')}
                  </tr>
                </thead>
                <tbody>
                  ${manualReview.previewRows
                    .map(
                      (row) => `
                        <tr>
                          <td>${row.rowNumber}</td>
                          ${Array.from({ length: manualReview.maxColumnCount })
                            .map((_, index) => `<td>${escapeHtml(row.columns[index] || '')}</td>`)
                            .join('')}
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
        : ''}
    </div>
  `;
}

function getTemplateBlockFileButtonLabel(block: TemplateBlockFormData) {
  if (block.importPreviewSelectedName && !block.sourceFileName && !block.originalFileName) {
    return t('step2.import.reselectFile');
  }

  if (block.sourceFileName || block.originalFileName || block.replacementOriginalName) {
    return t('step2.import.replaceFile');
  }

  return t('step2.import.selectFile');
}

function getTemplateBlockDisplayedOriginalName(block: TemplateBlockFormData) {
  return block.replacementOriginalName || block.originalFileName || '-';
}

function shouldShowTemplateBlockAdjustButton(
  block: TemplateBlockFormData
) {
  return (
    !!(block.importPreviewSelectedPath || block.originalFilePath) &&
    !!block.importManualReview?.available
  );
}

function getTemplateBlockFieldConfig(templateType?: TemplateBlockType) {
  void templateType;
  return {
    typeLabel: t('step2.structured.typeLabel'),
    subtitle: t('step2.structured.subtitle'),
    dataLabel: t('step2.structured.dataLabel'),
    dataPlaceholder: t('step2.structured.dataPlaceholder'),
    titlePlaceholder: t('step2.structured.titlePlaceholder'),
    primaryLabelText: t('step2.structured.primaryLabelText'),
    primaryLabelPlaceholder: t('step2.structured.primaryLabelPlaceholder'),
    primaryUnitText: t('step2.structured.primaryUnitText'),
    primaryUnitPlaceholder: t('step2.structured.primaryUnitPlaceholder'),
    secondaryLabelText: t('step2.structured.secondaryLabelText'),
    secondaryLabelPlaceholder: t('step2.structured.secondaryLabelPlaceholder'),
    secondaryUnitText: t('step2.structured.secondaryUnitText'),
    secondaryUnitPlaceholder: t('step2.structured.secondaryUnitPlaceholder')
  };
}

function renderTemplateBlockCards(
  blocks: TemplateBlockFormData[],
  context: TemplateBlockEditContext
) {
  if (!blocks.length) {
    return `<div class="empty-tip">${escapeHtml(t('step2.structured.empty'))}</div>`;
  }

  return blocks
    .map(
      (block, index) => `
        ${(() => {
          const fieldConfig = getTemplateBlockFieldConfig();
          return `
        <div class="template-block-card">
          <div class="template-block-header">
            <div>
              <div class="template-block-type">${fieldConfig.typeLabel} ${index + 1}</div>
              <div class="template-block-subtitle">${fieldConfig.subtitle}</div>
            </div>
            <button
              class="danger-btn small-danger-btn"
              type="button"
              data-remove-template-block-id="${block.id}"
            >
              ${escapeHtml(t('dictionary.delete'))}
            </button>
          </div>

          <div class="template-block-file-row">
            <button
              class="file-btn"
              type="button"
              data-template-file-block-id="${block.id}"
              data-template-file-context="${context}"
              title="${escapeHtml(block.originalFilePath || '')}"
              ${block.importPreviewLoading ? 'disabled' : ''}
            >
              ${block.importPreviewLoading
                ? escapeHtml(t('step2.import.previewLoading'))
                : escapeHtml(getTemplateBlockFileButtonLabel(block))}
            </button>
            <div class="template-block-file-meta">
              ${escapeHtml(t('step2.import.originalFileLabel'))}：${escapeHtml(getTemplateBlockDisplayedOriginalName(block))}
              ${block.sourceFileName ? ` · ${escapeHtml(t('step2.import.savedFileLabel'))}：${escapeHtml(block.sourceFileName)}` : ''}
            </div>
            ${shouldShowTemplateBlockAdjustButton(block)
              ? `
                  <button
                    class="secondary-btn"
                    type="button"
                    data-template-block-toggle-import-id="${block.id}"
                    data-template-block-toggle-context="${context}"
                  >
                    ${escapeHtml(getActiveTemplateBlockImportId(context) === block.id ? t('step2.import.collapseParser') : t('step2.import.adjustParser'))}
                  </button>
                `
              : ''}
          </div>

          ${getActiveTemplateBlockImportId(context) === block.id
            ? renderTemplateBlockImportPanel(block)
            : ''}

          <div class="template-block-grid">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('step2.structured.purposeLabel'))}</label>
              <select id="template-block-purpose-${block.id}" class="form-input">
                ${STRUCTURED_BLOCK_PURPOSE_OPTIONS.map(
                  (option) => `
                    <option value="${option.value}" ${block.purposeType === option.value ? 'selected' : ''}>
                      ${option.label}
                    </option>
                  `
                ).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">${escapeHtml(t('step2.structured.blockTitleLabel'))} <span class="required-star">*</span></label>
              <input
                id="template-block-title-${block.id}"
                class="form-input"
                placeholder="${fieldConfig.titlePlaceholder}"
                value="${escapeHtml(block.blockTitle)}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">${fieldConfig.primaryLabelText}</label>
              <input
                id="template-block-primary-label-${block.id}"
                class="form-input"
                placeholder="${fieldConfig.primaryLabelPlaceholder}"
                value="${escapeHtml(block.primaryLabel)}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">${fieldConfig.primaryUnitText}</label>
              <input
                id="template-block-primary-unit-${block.id}"
                class="form-input"
                placeholder="${fieldConfig.primaryUnitPlaceholder}"
                value="${escapeHtml(block.primaryUnit)}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">${fieldConfig.secondaryLabelText}</label>
              <input
                id="template-block-secondary-label-${block.id}"
                class="form-input"
                placeholder="${fieldConfig.secondaryLabelPlaceholder}"
                value="${escapeHtml(block.secondaryLabel)}"
              />
            </div>

            <div class="form-group">
              <label class="form-label">${fieldConfig.secondaryUnitText}</label>
              <input
                id="template-block-secondary-unit-${block.id}"
                class="form-input"
                placeholder="${fieldConfig.secondaryUnitPlaceholder}"
                value="${escapeHtml(block.secondaryUnit)}"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">${fieldConfig.dataLabel} <span class="required-star">*</span></label>
            <textarea id="template-block-data-${block.id}" class="template-block-textarea" placeholder="${fieldConfig.dataPlaceholder}">${escapeHtml(block.dataText)}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">${escapeHtml(t('step2.structured.noteLabel'))}</label>
            <input
              id="template-block-note-${block.id}"
              class="form-input"
              placeholder="${escapeHtml(t('step2.structured.notePlaceholder'))}"
              value="${escapeHtml(block.note)}"
            />
          </div>
        </div>
      `;
        })()}
      `
    )
    .join('');
}

function renderReadonlyTemplateBlocks(blocks: TemplateBlockFormData[], showReadonlyHint = false) {
  if (!blocks.length) {
    return `<div class="empty-tip">${escapeHtml(t('step2.structured.readonlyEmpty'))}</div>`;
  }

  return blocks
    .map(
      (block, index) => `
        ${(() => {
          const fieldConfig = getTemplateBlockFieldConfig(block.templateType);
          return `
        <div class="template-block-card detail-template-block-card">
          <div class="template-block-header">
            <div>
              <div class="template-block-type">${fieldConfig.typeLabel} ${index + 1}</div>
              <div class="template-block-title">${escapeHtml(block.blockTitle)}</div>
            </div>
            ${showReadonlyHint ? `<div class="template-block-readonly-hint">${escapeHtml(t('step2.structured.readonlyHint'))}</div>` : ''}
          </div>

          <div class="detail-grid template-block-detail-grid">
            ${renderDetailPair(t('step2.structured.purposeLabel'), getStructuredBlockPurposeLabel(block.purposeType))}
            ${renderDetailPair(fieldConfig.primaryLabelText, block.primaryLabel || '-')}
            ${renderDetailPair(fieldConfig.primaryUnitText, block.primaryUnit || '-')}
            ${renderDetailPair(fieldConfig.secondaryLabelText, block.secondaryLabel || '-')}
            ${renderDetailPair(fieldConfig.secondaryUnitText, block.secondaryUnit || '-')}
            ${renderDetailPair(t('step2.structured.pointCountLabel'), String(countTemplateBlockPointLines(block.dataText)))}
            ${renderDetailPair(t('step2.structured.noteLabel'), block.note || '-')}
          </div>

          <div class="form-group">
            <label class="form-label">${fieldConfig.dataLabel}</label>
            <textarea class="template-block-textarea template-block-readonly-textarea" readonly>${escapeHtml(block.dataText)}</textarea>
          </div>

          <div class="template-block-file-row">
            ${block.sourceFileName && block.sourceFilePath
              ? `
                  <div class="saved-file-cell">
                    <button
                      class="file-link-btn"
                      type="button"
                      data-open-saved-file="${escapeHtml(block.sourceFilePath)}"
                    >
                      ${escapeHtml(block.sourceFileName)}
                    </button>
                    <button
                      class="file-folder-btn"
                      type="button"
                      data-open-saved-folder="${escapeHtml(block.sourceFilePath)}"
                      title="${escapeHtml(t('databaseDetail.openFolderTitle'))}"
                    >
                      ${escapeHtml(t('databaseDetail.openFolder'))}
                    </button>
                  </div>
                `
              : `<div class="detail-value">${escapeHtml(t('step2.import.savedFileLabel'))}：-</div>`}
            <div class="template-block-file-meta">
              ${escapeHtml(t('step2.import.originalFileLabel'))}：${escapeHtml(block.originalFileName || '-')}
            </div>
          </div>
        </div>
      `;
        })()}
      `
    )
    .join('');
}

function buildValidatedTemplateBlocks(
  blocks: TemplateBlockFormData[]
): { error: string; blocks: SaveExperimentTemplateBlockPayload[] } {
  const normalizedBlocks: SaveExperimentTemplateBlockPayload[] = [];

  for (const [index, block] of blocks.entries()) {
    const blockTitle = trimBlockTitle(block.blockTitle);
    const blockLabel = getTemplateBlockTypeLabel(block.templateType);
    const existingSameTypeTitle = blocks.find(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.templateType === block.templateType &&
        trimBlockTitle(candidate.blockTitle) === blockTitle
    );

    if (!blockTitle) {
      return {
        error: t('databaseDetail.validation.blockTitleRequired', {
          index: index + 1,
          blockLabel
        }),
        blocks: []
      };
    }

    if (existingSameTypeTitle) {
      return {
        error: t('databaseDetail.validation.blockTitleDuplicate', {
          blockLabel,
          title: blockTitle
        }),
        blocks: []
      };
    }

    const parsed = parseTemplateBlockPointInput(block.dataText, block.templateType);
    if (!parsed.success) {
      return {
        error: `${blockLabel}“${blockTitle}”：${parsed.error}`,
        blocks: []
      };
    }

    if (block.templateType === XY_TEMPLATE_TYPE) {
      normalizedBlocks.push({
        blockId: block.blockId,
        templateType: XY_TEMPLATE_TYPE,
        purposeType: block.purposeType || '',
        blockTitle,
        blockOrder: index + 1,
        xLabel: block.primaryLabel.trim(),
        xUnit: block.primaryUnit.trim(),
        yLabel: block.secondaryLabel.trim(),
        yUnit: block.secondaryUnit.trim(),
        note: block.note.trim(),
        points: parsed.points,
        sourceFileName: block.sourceFileName,
        sourceFilePath: block.sourceFilePath,
        originalFileName: block.originalFileName,
        originalFilePath: block.originalFilePath,
        replacementSourcePath: block.replacementSourcePath,
        replacementOriginalName: block.replacementOriginalName
      });
      continue;
    }

    normalizedBlocks.push({
      blockId: block.blockId,
      templateType: SPECTRUM_TEMPLATE_TYPE,
      purposeType: block.purposeType || '',
      blockTitle,
      blockOrder: index + 1,
      spectrumAxisLabel: block.primaryLabel.trim(),
      spectrumAxisUnit: block.primaryUnit.trim(),
      signalLabel: block.secondaryLabel.trim(),
      signalUnit: block.secondaryUnit.trim(),
      note: block.note.trim(),
      points: parsed.points,
      sourceFileName: block.sourceFileName,
      sourceFilePath: block.sourceFilePath,
      originalFileName: block.originalFileName,
      originalFilePath: block.originalFilePath,
      replacementSourcePath: block.replacementSourcePath,
      replacementOriginalName: block.replacementOriginalName
    });
  }

  return {
    error: '',
    blocks: normalizeTemplateBlocks(normalizedBlocks)
  };
}

function bindStep1DictionaryAddAction(params: {
  inputId: string;
  buttonId: string;
  dictionaryType: DictionaryType;
  feedbackId: string;
  successMessage: string;
  suggestionContainerId?: string;
}) {
  const input = document.getElementById(params.inputId) as HTMLInputElement | null;
  const button = document.getElementById(params.buttonId) as HTMLButtonElement | null;

  input?.addEventListener('input', () => {
    clearFieldFeedback(params.feedbackId);
  });

  button?.addEventListener('click', async () => {
    if (!input || !button || button.disabled) {
      return;
    }

    clearFieldFeedback(params.feedbackId);

    const originalButtonText = button.textContent || '＋';
    button.disabled = true;
    button.textContent = '...';

    try {
      const result = await window.electronAPI.addDictionaryItem({
        type: params.dictionaryType,
        value: input.value
      });

      if (!result.success) {
        setFieldFeedback(params.feedbackId, result.error || t('dictionary.addFailed'), 'error');
        return;
      }

      await reloadDictionaryItems();
      if (params.suggestionContainerId) {
        renderStep1Suggestions({
          containerId: params.suggestionContainerId,
          dictionaryType: params.dictionaryType,
          query: input.value
        });
      }
      setFieldFeedback(params.feedbackId, params.successMessage, 'success');
    } catch (error) {
      setFieldFeedback(
        params.feedbackId,
        getErrorMessage(error) || t('step1.dictionaryAddFailedRetry'),
        'error'
      );
    } finally {
      button.disabled = false;
      button.textContent = originalButtonText;
    }
  });
}

function bindStep1SuggestionInput(params: {
  inputId: string;
  dictionaryType: DictionaryType;
  containerId: string;
  feedbackId: string;
}) {
  const input = document.getElementById(params.inputId) as HTMLInputElement | null;
  const container = document.getElementById(params.containerId);

  if (!input || !container) {
    return;
  }

  input.addEventListener('input', async () => {
    clearFieldFeedback(params.feedbackId);

    const query = input.value;
    if (!query.trim()) {
      hideStep1Suggestions(params.containerId);
      return;
    }

    try {
      await ensureDictionaryItemsLoaded();
      renderStep1Suggestions({
        containerId: params.containerId,
        dictionaryType: params.dictionaryType,
        query
      });
    } catch (error) {
      hideStep1Suggestions(params.containerId);
      console.error('load step1 suggestions failed:', error);
    }
  });

  input.addEventListener('focus', () => {
    hideStep1Suggestions(params.containerId);
  });

  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      hideStep1Suggestions(params.containerId);
    }, 120);
  });

  container.addEventListener('mousedown', (event) => {
    const target = event.target as HTMLElement;
    const suggestionButton = target.closest('[data-step1-suggestion-value]') as HTMLElement | null;
    if (!suggestionButton) {
      return;
    }

    event.preventDefault();
    const nextValue = suggestionButton.dataset.step1SuggestionValue || '';
    input.value = nextValue;
    clearFieldFeedback(params.feedbackId);
    hideStep1Suggestions(params.containerId);
  });
}

function renderSettingsSubViewTabs() {
  const subViews: Array<{ key: SettingsSubView; label: string }> = [
    { key: 'general', label: t('common.generalSettings') },
    { key: 'dictionary', label: t('common.dictionaryManagement') },
    { key: 'logs', label: t('settings.logsTab') },
    { key: 'about', label: t('common.about') }
  ];

  return `
    <div class="settings-subview-tabs">
      ${subViews
        .map(
          (subView) => `
            <button
              class="group-tab-btn ${settingsSubView === subView.key ? 'active-group-tab' : ''}"
              type="button"
              data-settings-subview="${subView.key}"
            >
              ${subView.label}
            </button>
          `
        )
        .join('')}
    </div>
  `;
}

function renderDictionaryManagementSection(dictionaryType: DictionaryType, label: string) {
  const items = dictionaryItems[dictionaryType];
  const inputValue = dictionaryInputValues[dictionaryType];
  const errorMessage = dictionarySectionErrors[dictionaryType];
  const isAdding = dictionarySubmittingType === dictionaryType;

  return `
    <div class="detail-section">
      <div class="detail-section-title">${label}</div>
      <div class="dictionary-add-row">
        <input
          id="dictionary-input-${dictionaryType}"
          class="form-input"
          value="${escapeHtml(inputValue)}"
          placeholder="${escapeHtml(t('dictionary.placeholder', { label }))}"
        />
        <button
          class="secondary-btn dictionary-add-btn"
          type="button"
          data-dictionary-add-type="${dictionaryType}"
          ${isAdding || !!dictionaryDeletingId ? 'disabled' : ''}
        >
          ${escapeHtml(isAdding ? t('dictionary.adding') : t('dictionary.add'))}
        </button>
      </div>
      <div class="error-message">${escapeHtml(errorMessage)}</div>
      ${
        items.length
          ? `
            <div class="detail-list">
              ${items
                .map(
                  (item) => `
                    <div class="detail-list-item dictionary-list-item">
                      <div class="dictionary-list-value">${escapeHtml(item.value)}</div>
                      <button
                        class="danger-btn small-danger-btn"
                        type="button"
                        data-dictionary-delete-id="${escapeHtml(item.id)}"
                        data-dictionary-delete-label="${escapeHtml(item.value)}"
                        ${dictionaryDeletingId ? 'disabled' : ''}
                      >
                        ${escapeHtml(dictionaryDeletingId === item.id ? t('dictionary.deleting') : t('dictionary.delete'))}
                      </button>
                    </div>
                  `
                )
                .join('')}
            </div>
          `
          : `<div class="empty-tip">${escapeHtml(t('dictionary.empty'))}</div>`
      }
    </div>
  `;
}

function getOnboardingStepIndex(step: OnboardingStep) {
  switch (step) {
    case 'welcome':
      return 1;
    case 'legal':
      return 2;
    case 'storage':
      return 3;
    case 'admin':
      return 4;
    case 'progress':
      return 5;
    case 'complete':
      return 6;
    default:
      return 1;
  }
}

function bindAboutEntryEvents(preserveContentScroll = false) {
  document.querySelectorAll('[data-open-about-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      aboutDialogVisible = true;
      requestRender(preserveContentScroll);
    });
  });

  document.querySelectorAll('[data-open-third-party-notices]').forEach((button) => {
    button.addEventListener('click', () => {
      thirdPartyNoticesVisible = true;
      aboutDialogVisible = false;
      requestRender(preserveContentScroll);
    });
  });

  if (aboutDialogVisible) {
    bindAboutDialogEvents();
  }

  if (thirdPartyNoticesVisible) {
    bindThirdPartyNoticesEvents(preserveContentScroll);
  }
}

async function startOnboardingInitialization() {
  onboardingState.step = 'progress';
  onboardingState.error = '';
  requestRender();

  try {
    const result = await window.electronAPI.completeOnboarding({
      storageRoot: onboardingState.storageRoot,
      loginUsername: onboardingState.loginUsername,
      password: onboardingState.password,
      acceptedLicense: onboardingState.acceptedLicense,
      acceptedPrivacy: onboardingState.acceptedPrivacy
    });

    if (!result.success) {
      onboardingState.step = 'admin';
      onboardingState.error = result.error || t('onboarding.progress.error');
      requestRender();
      return;
    }

    appBootstrapState = await window.electronAPI.getAppBootstrapState();
    appSettings = appBootstrapState.appSettings;
    onboardingState.step = 'complete';
    onboardingState.password = '';
    onboardingState.confirmPassword = '';
    onboardingState.error = '';
    requestRender();
  } catch (error) {
    onboardingState.step = 'admin';
    onboardingState.error = getErrorMessage(error) || t('onboarding.progress.error');
    requestRender();
  }
}

function renderOnboardingPage(appName: string, version: string) {
  const stepIndex = getOnboardingStepIndex(onboardingState.step);
  const stepIndicator = t('onboarding.stepIndicator', { current: stepIndex, total: 6 });
  let contentHtml = '';

  if (onboardingState.step === 'welcome') {
    contentHtml = `
      <div class="onboarding-hero">
        <div class="onboarding-step-tag">${stepIndicator}</div>
        <h1>${escapeHtml(appName)}</h1>
        <p class="subtitle">${escapeHtml(t('onboarding.welcome.subtitle'))}</p>
        <div class="onboarding-note-card">
          ${escapeHtml(t('onboarding.welcome.note'))}
        </div>
      </div>
      <div class="form-action-row onboarding-actions">
        <button id="onboarding-welcome-next-btn" class="primary-btn action-btn">${escapeHtml(t('common.startInitialization'))}</button>
        <button type="button" class="secondary-btn action-btn" data-open-about-dialog>${escapeHtml(t('common.aboutProduct'))}</button>
      </div>
    `;
  } else if (onboardingState.step === 'legal') {
    contentHtml = `
      <div class="onboarding-hero">
        <div class="onboarding-step-tag">${stepIndicator}</div>
        <h1>${escapeHtml(t('onboarding.legal.title'))}</h1>
        <p class="subtitle">${escapeHtml(t('onboarding.legal.subtitle'))}</p>
      </div>

      <div class="onboarding-note-card">
        <strong>${escapeHtml(t('onboarding.legal.licenseTitle'))}</strong>
        <div>${escapeHtml(t('onboarding.legal.licenseText'))}</div>
      </div>

      <div class="onboarding-note-card">
        <strong>${escapeHtml(t('onboarding.legal.privacyTitle'))}</strong>
        <div>${escapeHtml(t('onboarding.legal.privacyText'))}</div>
      </div>

      <label class="checkbox-row onboarding-checkbox">
        <input id="onboarding-accept-license" type="checkbox" ${onboardingState.acceptedLicense ? 'checked' : ''} />
        <span>${escapeHtml(t('onboarding.legal.acceptLicense'))}</span>
      </label>

      <label class="checkbox-row onboarding-checkbox">
        <input id="onboarding-accept-privacy" type="checkbox" ${onboardingState.acceptedPrivacy ? 'checked' : ''} />
        <span>${escapeHtml(t('onboarding.legal.acceptPrivacy'))}</span>
      </label>

      <div id="onboarding-error" class="error-message large-error">${escapeHtml(onboardingState.error)}</div>

      <div class="form-action-row onboarding-actions">
        <button id="onboarding-legal-back-btn" class="secondary-btn action-btn" type="button">${escapeHtml(t('common.back'))}</button>
        <button id="onboarding-legal-next-btn" class="primary-btn action-btn" type="button">${escapeHtml(t('common.continue'))}</button>
      </div>
    `;
  } else if (onboardingState.step === 'storage') {
    contentHtml = `
      <div class="onboarding-hero">
        <div class="onboarding-step-tag">${stepIndicator}</div>
        <h1>${escapeHtml(t('onboarding.storage.title'))}</h1>
        <p class="subtitle">${escapeHtml(t('onboarding.storage.subtitle'))}</p>
      </div>

      <div class="form-group">
        <label class="form-label">${escapeHtml(t('onboarding.storage.label'))}</label>
        <input
          id="onboarding-storage-root"
          class="form-input"
          value="${escapeHtml(onboardingState.storageRoot)}"
          placeholder="${escapeHtml(t('onboarding.storage.placeholder'))}"
        />
      </div>

      <div class="onboarding-note-card">
        ${escapeHtml(t('onboarding.storage.note'))}
      </div>

      <div id="onboarding-error" class="error-message large-error">${escapeHtml(onboardingState.error)}</div>

      <div class="form-action-row onboarding-actions">
        <button id="onboarding-storage-back-btn" class="secondary-btn action-btn" type="button">${escapeHtml(t('common.back'))}</button>
        <button id="onboarding-storage-next-btn" class="primary-btn action-btn" type="button">${escapeHtml(t('common.continue'))}</button>
      </div>
    `;
  } else if (onboardingState.step === 'admin') {
    contentHtml = `
      <div class="onboarding-hero">
        <div class="onboarding-step-tag">${stepIndicator}</div>
        <h1>${escapeHtml(t('onboarding.admin.title'))}</h1>
        <p class="subtitle">${escapeHtml(t('onboarding.admin.subtitle'))}</p>
      </div>

      <div class="step-form-grid">
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('onboarding.admin.usernameLabel'))}</label>
          <input
            id="onboarding-login-username"
            class="form-input"
            value="${escapeHtml(onboardingState.loginUsername)}"
            placeholder="${escapeHtml(t('onboarding.admin.usernamePlaceholder'))}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">${escapeHtml(t('onboarding.admin.passwordLabel'))}</label>
          <input
            id="onboarding-login-password"
            class="form-input"
            type="password"
            placeholder="${escapeHtml(t('onboarding.admin.passwordPlaceholder'))}"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">${escapeHtml(t('onboarding.admin.confirmLabel'))}</label>
        <input
          id="onboarding-login-password-confirm"
          class="form-input"
          type="password"
          placeholder="${escapeHtml(t('onboarding.admin.confirmPlaceholder'))}"
        />
      </div>

      <div id="onboarding-error" class="error-message large-error">${escapeHtml(onboardingState.error)}</div>

      <div class="form-action-row onboarding-actions">
        <button id="onboarding-admin-back-btn" class="secondary-btn action-btn" type="button">${escapeHtml(t('common.back'))}</button>
        <button id="onboarding-admin-submit-btn" class="primary-btn action-btn" type="button">${escapeHtml(t('common.startInitialization'))}</button>
      </div>
    `;
  } else if (onboardingState.step === 'progress') {
    contentHtml = `
      <div class="onboarding-hero">
        <div class="onboarding-step-tag">${stepIndicator}</div>
        <h1>${escapeHtml(t('onboarding.progress.title'))}</h1>
        <p class="subtitle">${escapeHtml(t('onboarding.progress.subtitle'))}</p>
      </div>
      <div class="onboarding-progress-card">
        <div class="onboarding-progress-spinner" aria-hidden="true"></div>
        <div>${escapeHtml(t('onboarding.progress.text'))}</div>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="onboarding-hero">
        <div class="onboarding-step-tag">${stepIndicator}</div>
        <h1>${escapeHtml(t('onboarding.complete.title'))}</h1>
        <p class="subtitle">${escapeHtml(t('onboarding.complete.subtitle'))}</p>
      </div>

      <div class="onboarding-note-card">
        ${escapeHtml(t('onboarding.complete.accountNote', { username: onboardingState.loginUsername.trim() }))}
      </div>

      <div class="onboarding-note-card">
        ${escapeHtml(t('onboarding.complete.backupNote'))}
      </div>

      <div class="form-action-row onboarding-actions">
        <button id="onboarding-complete-login-btn" class="primary-btn action-btn" type="button">${escapeHtml(t('common.login'))}</button>
        <button type="button" class="secondary-btn action-btn" data-open-about-dialog>${escapeHtml(t('common.aboutProduct'))}</button>
      </div>
    `;
  }

  return `
    <div class="page-shell onboarding-shell">
      <div class="card onboarding-card">
        ${contentHtml}
        <div class="footer-tip">${escapeHtml(t('login.currentVersion', { version }))}</div>
      </div>
    </div>
    ${renderAboutDialog(appName, version)}
    ${renderThirdPartyNoticesDialog()}
  `;
}

async function render() {
  if (!root) return;

  const [appName, version] = await Promise.all([
    window.electronAPI.getAppName(),
    window.electronAPI.getAppVersion()
  ]);

  currentAppVersion = version;
  await ensureBootstrapStateLoaded();
  await ensureAppSettingsLoaded();
  await ensureRuntimeInfoLoaded();
  await ensurePersistedAnalysisUIStateLoaded();

  if (currentView === 'onboarding') {
    root.innerHTML = renderOnboardingPage(appName, version);

    bindAboutEntryEvents();

    document.getElementById('onboarding-welcome-next-btn')?.addEventListener('click', () => {
      onboardingState.step = 'legal';
      onboardingState.error = '';
      void render();
    });

    document.getElementById('onboarding-legal-back-btn')?.addEventListener('click', () => {
      onboardingState.step = 'welcome';
      onboardingState.error = '';
      void render();
    });

    document.getElementById('onboarding-legal-next-btn')?.addEventListener('click', () => {
      const acceptedLicense = (document.getElementById('onboarding-accept-license') as HTMLInputElement | null)?.checked || false;
      const acceptedPrivacy = (document.getElementById('onboarding-accept-privacy') as HTMLInputElement | null)?.checked || false;

      onboardingState.acceptedLicense = acceptedLicense;
      onboardingState.acceptedPrivacy = acceptedPrivacy;

      if (!acceptedLicense || !acceptedPrivacy) {
        onboardingState.error = t('onboarding.legal.error');
        requestRender();
        return;
      }

      onboardingState.step = 'storage';
      onboardingState.error = '';
      void render();
    });

    document.getElementById('onboarding-storage-back-btn')?.addEventListener('click', () => {
      onboardingState.step = 'legal';
      onboardingState.error = '';
      void render();
    });

    document.getElementById('onboarding-storage-next-btn')?.addEventListener('click', () => {
      const storageRoot =
        (document.getElementById('onboarding-storage-root') as HTMLInputElement | null)?.value.trim() || '';

      onboardingState.storageRoot = storageRoot;

      if (!storageRoot) {
        onboardingState.error = t('onboarding.storage.error');
        requestRender();
        return;
      }

      onboardingState.step = 'admin';
      onboardingState.error = '';
      void render();
    });

    document.getElementById('onboarding-admin-back-btn')?.addEventListener('click', () => {
      onboardingState.step = 'storage';
      onboardingState.error = '';
      void render();
    });

    document.getElementById('onboarding-admin-submit-btn')?.addEventListener('click', () => {
      const loginUsername =
        (document.getElementById('onboarding-login-username') as HTMLInputElement | null)?.value.trim() || '';
      const password =
        (document.getElementById('onboarding-login-password') as HTMLInputElement | null)?.value || '';
      const confirmPassword =
        (document.getElementById('onboarding-login-password-confirm') as HTMLInputElement | null)?.value || '';

      onboardingState.loginUsername = loginUsername;
      onboardingState.password = password;
      onboardingState.confirmPassword = confirmPassword;

      if (!loginUsername) {
        onboardingState.error = t('onboarding.admin.usernameError');
        requestRender();
        return;
      }

      if (password.length < 6) {
        onboardingState.error = t('onboarding.admin.passwordError');
        requestRender();
        return;
      }

      if (password !== confirmPassword) {
        onboardingState.error = t('onboarding.admin.passwordMismatch');
        requestRender();
        return;
      }

      void startOnboardingInitialization();
    });

    document.getElementById('onboarding-complete-login-btn')?.addEventListener('click', () => {
      currentView = 'login';
      aboutDialogVisible = false;
      void render();
    });

    return;
  }

  if (currentView === 'login') {
    root.innerHTML = `
      <div class="page-shell">
        <div class="card login-card">
          <h1>${appName}</h1>
          <p class="subtitle">${escapeHtml(t('login.subtitle'))}</p>

          <div class="form-group">
            <label class="form-label">${escapeHtml(t('login.usernameLabel'))}</label>
            <input id="username" class="form-input" placeholder="${escapeHtml(t('login.usernamePlaceholder'))}" />
          </div>

          <div class="form-group">
            <label class="form-label">${escapeHtml(t('login.passwordLabel'))}</label>
            <input id="password" type="password" class="form-input" placeholder="${escapeHtml(t('login.passwordPlaceholder'))}" />
          </div>

          <div id="error-message" class="error-message"></div>

          <button id="login-btn" class="primary-btn">${escapeHtml(t('common.login'))}</button>

          <div class="footer-tip">
            ${escapeHtml(t('login.currentVersion', { version }))}
          </div>

          <div class="form-action-row login-secondary-actions">
            <button type="button" class="secondary-btn action-btn" data-open-about-dialog>${escapeHtml(t('common.aboutProduct'))}</button>
          </div>
        </div>
      </div>
      ${renderAboutDialog(appName, version)}
      ${renderThirdPartyNoticesDialog()}
    `;

    bindAboutEntryEvents();

    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const errorMessage = document.getElementById('error-message');

    const handleLogin = async () => {
      const username = usernameInput?.value.trim() || '';
      const password = passwordInput?.value || '';

      if (!username || !password) {
        if (errorMessage) errorMessage.textContent = t('login.missingCredentials');
        return;
      }

      if (errorMessage) errorMessage.textContent = '';

      try {
        const result = await window.electronAPI.authenticate({ username, password });

        if (!result.success) {
          if (errorMessage) errorMessage.textContent = result.error || t('login.error');
          return;
        }

        currentView = 'home';
        void render();
      } catch (error) {
        console.error(error);
        if (errorMessage) errorMessage.textContent = t('login.error');
      }
    };

    loginBtn?.addEventListener('click', () => {
      void handleLogin();
    });
    passwordInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        void handleLogin();
      }
    });
    usernameInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        void handleLogin();
      }
    });

    return;
  }

  if (currentView === 'home') {
    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { label: t('common.home'), icon: '⌂', active: true },
          { id: 'menu-data-home', label: t('common.data'), icon: '▣' },
          { id: 'menu-analysis-home', label: t('common.analysis'), icon: '◫' },
          { id: 'menu-settings-home', label: t('common.settings'), icon: '⚙' }
        ])}

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">${escapeHtml(t('home.topbarTitle'))}</div>
            <button id="logout-btn" class="secondary-btn">${escapeHtml(t('common.logout'))}</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>${escapeHtml(t('home.welcomeTitle', { appName }))}</h2>
              <p class="subtitle">${escapeHtml(t('home.welcomeSubtitle'))}</p>

              <div class="name-preview-card">
                <div class="name-preview-label">${escapeHtml(t('home.firstUseTitle'))}</div>
                <div class="name-preview-value">${escapeHtml(t('home.firstUseNote'))}</div>
              </div>

              <div class="entry-grid">
                <div class="entry-card">
                  <div class="entry-icon">＋</div>
                  <div class="entry-title">${escapeHtml(t('home.addDataTitle'))}</div>
                  <div class="entry-desc">${escapeHtml(t('home.addDataDesc'))}</div>
                  <button id="add-data-btn" class="primary-btn">${escapeHtml(t('common.enter'))}</button>
                </div>

                <div class="entry-card">
                  <div class="entry-icon">▣</div>
                  <div class="entry-title">${escapeHtml(t('home.databaseTitle'))}</div>
                  <div class="entry-desc">${escapeHtml(t('home.databaseDesc'))}</div>
                  <button id="database-btn" class="secondary-btn big-btn">${escapeHtml(t('common.enter'))}</button>
                </div>

                <div class="entry-card">
                  <div class="entry-icon">◫</div>
                  <div class="entry-title">${escapeHtml(t('home.analysisTitle'))}</div>
                  <div class="entry-desc">${escapeHtml(t('home.analysisDesc'))}</div>
                  <button id="analysis-btn" class="secondary-btn big-btn">${escapeHtml(t('common.enter'))}</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    bindAppSidebarEvents();
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      currentView = 'login';
      void render();
    });

    document.getElementById('add-data-btn')?.addEventListener('click', () => {
      currentView = 'add-step1';
      void render();
    });

    document.getElementById('database-btn')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('analysis-btn')?.addEventListener('click', async () => {
      await openAnalysisWorkspace();
    });

    document.getElementById('menu-data-home')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-analysis-home')?.addEventListener('click', async () => {
      await openAnalysisWorkspace();
    });

    document.getElementById('menu-settings-home')?.addEventListener('click', () => {
      void openSettingsView();
    });

    return;
  }

  if (currentView === 'analysis') {
    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'analysis-menu-home', label: t('common.home'), icon: '⌂' },
          { id: 'analysis-menu-data', label: t('common.data'), icon: '▣' },
          { label: t('common.analysis'), icon: '◫', active: true },
          { id: 'analysis-menu-settings', label: t('common.settings'), icon: '⚙' }
        ])}

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">${escapeHtml(t('analysis.topbarTitle'))}</div>
            <div class="analysis-header-actions">
              <button id="analysis-add-scalar-chart-btn" class="secondary-btn" type="button">${escapeHtml(t('analysis.addScalar'))}</button>
              <button id="analysis-add-structured-chart-btn" class="secondary-btn" type="button">${escapeHtml(t('analysis.addStructured'))}</button>
            </div>
          </header>

          <section class="content-area">
            <div class="analysis-workspace-layout ${analysisInspectorCollapsed ? 'inspector-collapsed' : ''}">
              <div class="analysis-main-panel">
                ${analysisLoading
                  ? renderAnalysisEmptyState(t('analysis.loadingTitle'), t('analysis.loadingSubtitle'))
                  : analysisLoadError
                    ? `<div class="error-message large-error">${escapeHtml(analysisLoadError)}</div>`
                    : analysisCharts.length
                      ? analysisCharts.map((chart) => renderAnalysisChartCard(chart)).join('')
                      : `
                          <div class="welcome-card">
                            <h2>${escapeHtml(t('analysis.noChartsTitle'))}</h2>
                            <p class="subtitle">${escapeHtml(t('analysis.noChartsSubtitle'))}</p>
                            <div class="form-action-row">
                              <button id="analysis-add-scalar-chart-btn-empty" class="primary-btn action-btn" type="button">${escapeHtml(t('analysis.createScalar'))}</button>
                              <button id="analysis-add-structured-chart-btn-empty" class="secondary-btn" type="button">${escapeHtml(t('analysis.createStructured'))}</button>
                            </div>
                          </div>
                        `}
              </div>

              <aside class="analysis-inspector-panel ${analysisInspectorCollapsed ? 'collapsed' : ''}">
                <div class="analysis-inspector-header-row">
                  <div class="analysis-inspector-header">${escapeHtml(t('analysis.details'))}</div>
                  <button
                    id="analysis-inspector-toggle"
                    class="analysis-inspector-toggle-btn"
                    type="button"
                    title="${escapeHtml(analysisInspectorCollapsed ? t('analysis.expandDetails') : t('analysis.collapseDetails'))}"
                    aria-label="${escapeHtml(analysisInspectorCollapsed ? t('analysis.expandDetails') : t('analysis.collapseDetails'))}"
                  >
                    ${analysisInspectorCollapsed ? '»' : '«'}
                  </button>
                </div>
                ${analysisInspectorCollapsed ? '' : renderAnalysisInspector()}
              </aside>
            </div>
          </section>
        </main>
      </div>

      ${renderAnalysisComposerModal()}
      ${renderAnalysisExpandedOverlay()}
    `;

    bindAppSidebarEvents();
    bindAnalysisWorkspaceEvents();
    document.getElementById('analysis-add-scalar-chart-btn-empty')?.addEventListener('click', async () => {
      await addAnalysisChart('scalar');
    });
    document.getElementById('analysis-add-structured-chart-btn-empty')?.addEventListener('click', async () => {
      await addAnalysisChart('structured');
    });
    return;
  }

  if (currentView === 'add-step1') {
    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'menu-home', label: t('common.home'), icon: '⌂' },
          { label: t('addData.sidebarLabel'), icon: '＋', active: true },
          { id: 'menu-data-step1', label: t('common.data'), icon: '▣' },
          { id: 'menu-analysis-step1', label: t('common.analysis'), icon: '◫' },
          { id: 'menu-settings-step1', label: t('common.settings'), icon: '⚙' }
        ])}

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">${escapeHtml(t('addData.topbarTitle'))}</div>
            <button id="back-home-btn" class="secondary-btn">${escapeHtml(t('addData.backHome'))}</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>${escapeHtml(t('addData.heading'))}</h2>
              <p class="subtitle">${escapeHtml(t('addData.subtitle'))}</p>

              <div class="step-form-grid">
                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.testProject'))} <span class="required-star">*</span></label>
                  <div class="step1-suggestion-shell">
                    <div class="input-plus-row">
                      <input id="testProject" class="form-input" placeholder="${escapeHtml(t('step1.placeholder.testProject'))}" value="${escapeHtml(step1FormData.testProject)}" autocomplete="off" />
                      <button id="project-plus-btn" class="icon-btn" type="button">＋</button>
                    </div>
                    <div id="testProject-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="testProject-dictionary-feedback" class="field-feedback-message"></div>
                </div>

                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.sampleCode'))} <span class="required-star">*</span></label>
                  <input id="sampleCode" class="form-input" placeholder="${escapeHtml(t('step1.placeholder.sampleCode'))}" value="${escapeHtml(step1FormData.sampleCode)}" />
                </div>

                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.tester'))} <span class="required-star">*</span></label>
                  <div class="step1-suggestion-shell">
                    <div class="input-plus-row">
                      <input id="tester" class="form-input" placeholder="${escapeHtml(t('step1.placeholder.tester'))}" value="${escapeHtml(step1FormData.tester)}" autocomplete="off" />
                      <button id="tester-plus-btn" class="icon-btn" type="button">＋</button>
                    </div>
                    <div id="tester-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="tester-dictionary-feedback" class="field-feedback-message"></div>
                </div>

                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.instrument'))} <span class="required-star">*</span></label>
                  <div class="step1-suggestion-shell">
                    <div class="input-plus-row">
                      <input id="instrument" class="form-input" placeholder="${escapeHtml(t('step1.placeholder.instrument'))}" value="${escapeHtml(step1FormData.instrument)}" autocomplete="off" />
                      <button id="instrument-plus-btn" class="icon-btn" type="button">＋</button>
                    </div>
                    <div id="instrument-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="instrument-dictionary-feedback" class="field-feedback-message"></div>
                </div>

                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.testTime'))} <span class="required-star">*</span></label>
                  <input id="testTime" type="datetime-local" class="form-input" value="${escapeHtml(step1FormData.testTime)}" />
                </div>

                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.sampleOwner'))}</label>
                  <input id="sampleOwner" class="form-input" placeholder="${escapeHtml(t('step1.placeholder.sampleOwner'))}" value="${escapeHtml(step1FormData.sampleOwner)}" />
                </div>
              </div>

              <div class="dynamic-section">
                <div class="dynamic-header">
                  <div>
                    <div class="dynamic-title">${escapeHtml(t('step1.dynamic.title'))}</div>
                    <div class="dynamic-subtitle">${escapeHtml(t('step1.dynamic.subtitle'))}</div>
                  </div>
                  <button id="add-dynamic-field-btn" class="secondary-btn" type="button">${escapeHtml(t('step1.dynamic.addButton'))}</button>
                </div>

                <div id="dynamic-fields-container">
                  ${renderDynamicFields(step1FormData.dynamicFields, {
                    empty: t('step1.dynamic.empty'),
                    fieldPrefix: t('step1.dynamic.fieldPrefix'),
                    namePlaceholder: t('step1.dynamic.namePlaceholder'),
                    valuePlaceholder: t('step1.dynamic.valuePlaceholder'),
                    deleteButton: t('dictionary.delete')
                  })}
                </div>
              </div>

              <div id="step1-error" class="error-message large-error"></div>

              <div class="form-action-row">
                <button id="step1-cancel-btn" class="secondary-btn" type="button">${escapeHtml(t('addData.cancelAndReturn'))}</button>
                <button id="step1-next-btn" class="primary-btn action-btn" type="button">${escapeHtml(t('common.next'))}</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    bindAppSidebarEvents();
    bindStep1Events();

    document.getElementById('menu-data-step1')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-analysis-step1')?.addEventListener('click', async () => {
      await openAnalysisWorkspace();
    });

    document.getElementById('menu-settings-step1')?.addEventListener('click', () => {
      void openSettingsView();
    });

    return;
  }

  if (currentView === 'add-step2') {
    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'menu-home-step2', label: t('common.home'), icon: '⌂' },
          { label: t('addData.sidebarLabel'), icon: '＋', active: true },
          { id: 'menu-data-step2', label: t('common.data'), icon: '▣' },
          { id: 'menu-analysis-step2', label: t('common.analysis'), icon: '◫' },
          { id: 'menu-settings-step2', label: t('common.settings'), icon: '⚙' }
        ])}

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">${escapeHtml(t('step2.topbarTitle'))}</div>
            <button id="back-step1-btn-top" class="secondary-btn">${escapeHtml(t('common.back'))}</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>${escapeHtml(t('step2.heading'))}</h2>
              <p class="subtitle">${escapeHtml(t('step2.subtitle'))}</p>

              <div class="name-preview-card">
                <div class="name-preview-label">${escapeHtml(t('step2.namePreviewLabel'))}</div>
                <div class="name-preview-value">${escapeHtml(buildDisplayName(step1FormData))}</div>
              </div>

              ${renderScalarSections('create-step2', step2DataItems)}

              <div class="template-block-section">
                <div class="dynamic-header">
                  <div>
                    <div class="dynamic-title">${escapeHtml(t('step2.structured.sectionTitle'))}</div>
                    <div class="dynamic-subtitle">${escapeHtml(t('step2.structured.sectionSubtitle'))}</div>
                  </div>

                  <div class="template-block-toolbar">
                    <button id="add-template-block-btn" class="secondary-btn" type="button">${escapeHtml(t('step2.structured.addButton'))}</button>
                  </div>
                </div>

                ${renderStructuredRecommendationButtons(
                  'create-step2',
                  getActiveStep2TemplateFamily('create-step2')
                )}

                <div id="template-blocks-container" class="template-block-list">
                  ${renderTemplateBlockCards(step2TemplateBlocks, 'create-step2')}
                </div>
              </div>

              <div id="step2-error" class="error-message large-error"></div>

              <div class="form-action-row">
                <button id="back-step1-btn-bottom" class="secondary-btn" type="button">${escapeHtml(t('common.back'))}</button>
                <button id="finish-step2-btn" class="primary-btn action-btn" type="button">${escapeHtml(t('step2.finishButton'))}</button>
              </div>
            </div>
          </section>
        </main>
      </div>

      ${renderDuplicateWarningModal({
        visible: duplicateWarningState?.mode === 'create',
        actionLabel: '保存',
        sampleCode: duplicateWarningState?.mode === 'create' ? duplicateWarningState.sampleCode : '',
        testProject: duplicateWarningState?.mode === 'create' ? duplicateWarningState.testProject : '',
        testTime: duplicateWarningState?.mode === 'create' ? duplicateWarningState.testTime : '',
        matches: duplicateWarningState?.mode === 'create' ? duplicateWarningState.matches : [],
        submitting: duplicateWarningSubmitting
      })}
    `;

    bindAppSidebarEvents();
    bindStep2Events();
    bindDuplicateWarningModalHandlers();

    document.getElementById('menu-data-step2')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-analysis-step2')?.addEventListener('click', async () => {
      await openAnalysisWorkspace();
    });

    document.getElementById('menu-settings-step2')?.addEventListener('click', () => {
      void openSettingsView();
    });

    return;
  }

  if (currentView === 'save-success') {
    root.innerHTML = `
      <div class="page-shell">
        <div class="card login-card">
          <h1>${escapeHtml(t('saveSuccess.title'))}</h1>
          <p class="subtitle">${escapeHtml(t('saveSuccess.subtitle'))}</p>

          <div class="info-row">
            <span>${escapeHtml(t('saveSuccess.experimentId'))}</span>
            <strong>${lastSavedExperimentId ?? '-'}</strong>
          </div>

          <div class="info-row">
            <span>${escapeHtml(t('saveSuccess.displayName'))}</span>
            <strong>${escapeHtml(buildDisplayName(step1FormData))}</strong>
          </div>

          <button id="save-success-home-btn" class="primary-btn">${escapeHtml(t('common.backToHome'))}</button>
        </div>
      </div>
    `;

    document.getElementById('save-success-home-btn')?.addEventListener('click', () => {
      resetFormState();
      currentView = 'home';
      void render();
    });

    return;
  }

  if (currentView === 'database-list') {
    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'db-menu-home', label: t('common.home'), icon: '⌂' },
          { label: t('common.data'), icon: '▣', active: true },
          { id: 'db-menu-analysis', label: t('common.analysis'), icon: '◫' },
          { id: 'db-menu-settings', label: t('common.settings'), icon: '⚙' }
        ])}

	        <main class="main-content">
	          <header class="topbar">
	            <div class="topbar-title">${escapeHtml(t('database.topbarTitle'))}</div>
	            <div class="detail-top-actions">
	              <span>${escapeHtml(t('database.currentResults', { count: getVisibleExperimentIds().length }))}</span>
	              <span>${escapeHtml(t('database.selectedResults', { count: selectedExperimentIds.length }))}</span>
	              <button id="db-select-all-btn" class="secondary-btn">
	                ${escapeHtml(areAllVisibleSelected() ? t('database.cancelCurrentResults') : t('database.selectCurrentResults'))}
	              </button>
	              <button
	                id="db-clear-selection-btn"
                class="secondary-btn"
                type="button"
                ${selectedExperimentIds.length ? '' : 'disabled'}
              >
                ${escapeHtml(t('database.clearSelection'))}
              </button>
              <button
                id="db-delete-btn"
                class="danger-btn ${selectedExperimentIds.length ? '' : 'disabled-danger-btn'}"
                type="button"
                ${selectedExperimentIds.length ? '' : 'disabled'}
              >
                ${escapeHtml(t('dictionary.delete'))}
              </button>
              <button id="db-export-btn" class="secondary-btn export-top-btn">⤴</button>
              <button id="db-refresh-btn" class="secondary-btn">${escapeHtml(t('common.refresh'))}</button>
            </div>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>${escapeHtml(t('database.title'))}</h2>
              <p class="subtitle">${escapeHtml(t('database.subtitle'))}</p>

              <div class="search-row">
                <input
                  id="db-search-input"
                  class="form-input"
                  placeholder="${escapeHtml(t('database.searchPlaceholder'))}"
                  value="${escapeHtml(databaseSearchKeyword)}"
                />
                <button id="db-search-btn" class="primary-btn search-btn">${escapeHtml(t('common.search'))}</button>
                <button
                  id="db-filter-add-btn"
                  class="secondary-btn search-btn filter-add-btn"
                  type="button"
                  title="${escapeHtml(t('database.filter.addTooltip'))}"
                >
                  ＋
                </button>
              </div>
              ${renderCrossFilterControls({
                scope: 'database',
                chips: databaseCrossFilters,
                draftOpen: databaseFilterDraft.open,
                draftField: databaseFilterDraft.field,
                draftOperator: databaseFilterDraft.operator,
                draftValue: databaseFilterDraft.value,
                draftValue2: databaseFilterDraft.value2,
                draftPendingValues: databaseFilterDraft.pendingValues,
                draftCandidateQuery: databaseFilterCandidateQuery,
                candidateValues: getDatabaseFilterCandidateValues(),
                candidateLoading: databaseFilterCandidateLoading
              })}

              <div class="group-tabs">
                ${renderGroupTabs(databaseGroupBy, {
                  sampleCode: t('database.groupBy.sampleCode'),
                  testProject: t('database.groupBy.testProject'),
                  testTime: t('database.groupBy.testTime'),
                  instrument: t('database.groupBy.instrument'),
                  tester: t('database.groupBy.tester'),
                  sampleOwner: t('database.groupBy.sampleOwner')
                })}
              </div>

              <div class="database-list-wrapper">
                ${renderDatabaseGroups(databaseGroups)}
              </div>
            </div>
          </section>
        </main>
      </div>

      ${renderExportModal({
        exportModalVisible,
        selectedExperimentIds,
        exportMode,
        exportAvailableItemNames,
        exportSelectedItemName,
        exportCompressAfter,
        exportLoading
      })}
      ${renderDeleteModal({
        deleteModalVisible,
        deleteTargetIds,
        deleteLoading
      })}
    `;

    bindAppSidebarEvents();
    document.getElementById('db-menu-home')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.getElementById('db-menu-settings')?.addEventListener('click', () => {
      void openSettingsView();
    });

    document.getElementById('db-menu-analysis')?.addEventListener('click', async () => {
      await openAnalysisWorkspace();
    });

    document.getElementById('db-refresh-btn')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      void render();
    });

    const applyDatabaseSearch = async () => {
      const input = document.getElementById('db-search-input') as HTMLInputElement | null;
      databaseSearchKeyword = input?.value.trim() || '';
      await loadDatabaseList();
      void render();
    };

    document.getElementById('db-search-btn')?.addEventListener('click', () => {
      void applyDatabaseSearch();
    });

    document.getElementById('db-search-input')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      void applyDatabaseSearch();
    });

    bindDatabaseCrossFilterEvents();

    document.getElementById('db-select-all-btn')?.addEventListener('click', () => {
      toggleSelectAllVisible();
      void renderPreservingContentScroll();
    });

    document.getElementById('db-clear-selection-btn')?.addEventListener('click', () => {
      selectedExperimentIds = [];
      void renderPreservingContentScroll();
    });

    document.getElementById('db-delete-btn')?.addEventListener('click', () => {
      if (!selectedExperimentIds.length) {
        alert('请先勾选至少一条实验数据');
        return;
      }

      openDeleteModal(selectedExperimentIds);
      void render();
    });

    document.getElementById('db-export-btn')?.addEventListener('click', async () => {
      await openExportModal();
    });

    const groupButtons = document.querySelectorAll('[data-groupby]');
    groupButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const groupBy = target.dataset.groupby as GroupByType;
        databaseGroupBy = groupBy;
        await loadDatabaseList();
        void render();
      });
    });

    const selectButtons = document.querySelectorAll('[data-select-experiment-id]');
    selectButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button as HTMLElement;
        const id = Number(target.dataset.selectExperimentId);
        if (!id) return;

        toggleExperimentSelection(id);
        void renderPreservingContentScroll();
      });
    });

    const detailButtons = document.querySelectorAll('[data-open-detail-id]');
    detailButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const id = Number(target.dataset.openDetailId);
        if (!id) return;

        await openExperimentDetail(id);
      });
    });

    document.getElementById('export-cancel-btn')?.addEventListener('click', () => {
      closeExportModal();
      void render();
    });

    document.getElementById('delete-cancel-btn')?.addEventListener('click', () => {
      closeDeleteModal();
      void render();
    });

    document.getElementById('delete-confirm-btn')?.addEventListener('click', async () => {
      if (!deleteTargetIds.length || deleteLoading) return;

      deleteLoading = true;
      void render();

      try {
        let successCount = 0;
        let failureCount = 0;
        let warningCount = 0;
        let firstFailureReason = '';
        let firstWarningReason = '';

        for (const experimentId of deleteTargetIds) {
          const result = await window.electronAPI.deleteExperiment({
            experimentId
          });

          if (result.success) {
            successCount += 1;
            if (result.warning) {
              warningCount += 1;
              if (!firstWarningReason) {
                firstWarningReason = result.warning;
              }
            }
          } else {
            failureCount += 1;
            if (!firstFailureReason) {
              firstFailureReason = result.error || '删除失败';
            }
          }
        }

        deleteLoading = false;

        selectedExperimentIds = selectedExperimentIds.filter((id) => !deleteTargetIds.includes(id));
        closeDeleteModal();
        await loadDatabaseListView();

        const summaryLines = [
          `成功删除：${successCount} 条`,
          `删除失败：${failureCount} 条`
        ];

        if (warningCount) {
          summaryLines.push(`需要手动跟进：${warningCount} 条`);
        }

        if (firstFailureReason) {
          summaryLines.push(`首个失败原因：${firstFailureReason}`);
        }

        if (firstWarningReason) {
          summaryLines.push(`首个提醒：${firstWarningReason}`);
        }

        alert(summaryLines.join('\n'));
        void render();
      } catch (error) {
        deleteLoading = false;
        handleAsyncError(error, '删除实验数据失败');
        void render();
      }
    });

    const exportModeRadios = document.querySelectorAll('input[name="export-mode"]');
    exportModeRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        exportMode = target.value as ExportModeType;
        void render();
      });
    });

    document.getElementById('export-item-name-select')?.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      exportSelectedItemName = target.value;
    });

    document.getElementById('export-confirm-btn')?.addEventListener('click', async () => {
      exportLoading = true;

      const checkbox = document.getElementById('export-compress-checkbox') as HTMLInputElement | null;
      exportCompressAfter = !!checkbox?.checked;

      const itemNameSelect = document.getElementById('export-item-name-select') as HTMLSelectElement | null;
      if (itemNameSelect) {
        exportSelectedItemName = itemNameSelect.value;
      }

      void render();

      let result:
        | {
          canceled?: boolean;
          success?: boolean;
          exportPath?: string;
          compressed?: boolean;
          error?: string;
        }
        | undefined;

      if (exportMode === 'full') {
        result = await window.electronAPI.exportFullExperiments({
          experimentIds: selectedExperimentIds,
          compressAfterExport: exportCompressAfter
        });
      } else if (exportMode === 'single-item') {
        if (!exportSelectedItemName) {
          exportLoading = false;
          alert('请选择一个二级数据项名称');
          void render();
          return;
        }

        result = await window.electronAPI.exportItemNameCompare({
          experimentIds: selectedExperimentIds,
          mode: 'single',
          selectedItemName: exportSelectedItemName,
          compressAfterExport: exportCompressAfter
        });
      } else {
        result = await window.electronAPI.exportItemNameCompare({
          experimentIds: selectedExperimentIds,
          mode: 'all',
          compressAfterExport: exportCompressAfter
        });
      }

      exportLoading = false;

      if (result?.canceled) {
        closeExportModal();
        void render();
        return;
      }

      if (result?.success) {
        alert(`导出成功：\n${result.exportPath || ''}`);

        if (result.exportPath) {
          const shouldOpenExportPath = confirm(`是否打开导出位置？\n${result.exportPath}`);
          if (shouldOpenExportPath) {
            await openPathLocation(result.exportPath);
          }
        }

        selectedExperimentIds = [];
        closeExportModal();
        void render();
        return;
      }

      alert(result?.error || '导出失败');
      void render();
    });

    return;
  }

  if (currentView === 'database-detail') {
    if (!currentDetail) {
      currentEditHistory = [];
      currentView = 'database-list';
      await loadDatabaseListView();
      void render();
      return;
    }

      const editHistoryHtml = renderExperimentEditHistory(currentEditHistory, {
        empty: t('databaseDetail.historyEmpty'),
        editor: t('databaseDetail.historyEditor'),
        reason: t('databaseDetail.historyReason'),
        summary: t('databaseDetail.historySummary'),
        fallbackSummary: t('databaseDetail.historyFallbackSummary')
      });

    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'detail-menu-home', label: t('common.home'), icon: '⌂' },
          { id: 'detail-menu-list', label: t('common.data'), icon: '▣', active: true },
          { id: 'detail-menu-analysis', label: t('common.analysis'), icon: '◫' },
          { id: 'detail-menu-settings', label: t('common.settings'), icon: '⚙' }
        ])}

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">${escapeHtml(detailEditMode ? t('databaseDetail.titleEditing') : t('databaseDetail.titleReadonly'))}</div>
            <div class="detail-top-actions">
              ${detailEditMode
        ? `<button id="detail-cancel-edit-btn" class="secondary-btn">${escapeHtml(t('databaseDetail.cancelEdit'))}</button>`
        : `<button id="detail-edit-btn" class="secondary-btn">${escapeHtml(t('databaseDetail.edit'))}</button>`
      }
              <button id="detail-back-btn" class="secondary-btn">${escapeHtml(t('common.backToList'))}</button>
            </div>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2 id="detail-display-name-heading">${escapeHtml(
                detailEditMode && detailEditStep1
                  ? buildDisplayName(detailEditStep1)
                  : currentDetail.displayName
              )}</h2>
              <p class="subtitle">${escapeHtml(t('databaseDetail.subtitle'))}</p>

              <div class="detail-section">
                <div class="detail-section-title">${escapeHtml(t('databaseDetail.section.primaryInfo'))}</div>
                <div class="detail-grid">
                  ${detailEditMode && detailEditStep1
        ? `
                        ${renderDetailEditInput('edit-testProject', t('step1.field.testProject'), detailEditStep1.testProject)}
                        ${renderDetailEditInput('edit-sampleCode', t('step1.field.sampleCode'), detailEditStep1.sampleCode)}
                        ${renderDetailEditInput('edit-tester', t('step1.field.tester'), detailEditStep1.tester)}
                        ${renderDetailEditInput('edit-instrument', t('step1.field.instrument'), detailEditStep1.instrument)}
                        ${renderDetailEditInput('edit-testTime', t('step1.field.testTime'), detailEditStep1.testTime, 'datetime-local')}
                        ${renderDetailEditInput('edit-sampleOwner', t('step1.field.sampleOwner'), detailEditStep1.sampleOwner)}
                        ${renderDetailDerivedPreview(
                          'detail-edit-display-name-preview',
                          t('databaseDetail.derivedDisplayName'),
                          buildDisplayName(detailEditStep1),
                          t('databaseDetail.derivedDisplayNameHint')
                        )}
                      `
        : `
                        ${renderDetailPair(t('databaseDetail.label.experimentId'), String(currentDetail.id))}
                        ${renderDetailPair(t('step1.field.testProject'), currentDetail.testProject)}
                        ${renderDetailPair(t('step1.field.sampleCode'), currentDetail.sampleCode)}
                        ${renderDetailPair(t('step1.field.tester'), currentDetail.tester)}
                        ${renderDetailPair(t('step1.field.instrument'), currentDetail.instrument)}
                        ${renderDetailPair(t('step1.field.testTime'), currentDetail.testTime)}
                        ${renderDetailPair(t('step1.field.sampleOwner'), currentDetail.sampleOwner || '-')}
                        ${renderDetailPair(t('databaseDetail.label.displayName'), currentDetail.displayName)}
                      `
      }
                </div>
              </div>

              <div class="detail-section">
                <div class="detail-section-title">${escapeHtml(t('databaseDetail.section.dynamicFields'))}</div>
                ${detailEditMode && detailEditStep1
        ? `
                      <div class="detail-list">
                        ${detailEditStep1.dynamicFields.length
          ? detailEditStep1.dynamicFields
            .map(
              (field, index) => `
                                    <div class="detail-edit-row">
                                      <input id="edit-dynamic-name-${index}" class="form-input" value="${escapeHtml(field.name)}" placeholder="${escapeHtml(t('databaseDetail.dynamicNamePlaceholder'))}" />
                                      <input id="edit-dynamic-value-${index}" class="form-input" value="${escapeHtml(field.value)}" placeholder="${escapeHtml(t('databaseDetail.dynamicValuePlaceholder'))}" />
                                    </div>
                                  `
            )
            .join('')
          : `<div class="empty-tip">${escapeHtml(t('databaseDetail.dynamicEmpty'))}</div>`
        }
                      </div>
                    `
        : currentDetail.customFields.length
          ? `
                        <div class="detail-list">
                          ${currentDetail.customFields
            .map(
              (field) => `
                                <div class="detail-list-item">
                                  <span class="detail-list-key">${escapeHtml(field.fieldName)}</span>
                                  <span class="detail-list-value">${escapeHtml(field.fieldValue)}</span>
                                </div>
                              `
            )
            .join('')}
                        </div>
                      `
          : `<div class="empty-tip">${escapeHtml(t('databaseDetail.dynamicEmpty'))}</div>`
      }
              </div>

              ${detailEditMode
        ? `<div id="detail-edit-scalar-sections">${renderScalarSections('detail-edit', detailEditStep2)}</div>`
        : `
            ${renderStep2TemplateContextHint('detail-readonly')}
            ${renderReadonlyScalarSection(
              'condition',
              currentDetail.dataItems.filter((item) => resolveScalarItemRole(item) === 'condition')
            )}
            ${renderReadonlyScalarSection(
              'metric',
              currentDetail.dataItems.filter((item) => resolveScalarItemRole(item) === 'metric')
            )}
          `}

              <div class="detail-section">
                <div class="detail-section-title">${escapeHtml(t('databaseDetail.section.structuredBlocks'))}</div>
                ${detailEditMode
        ? `<div id="detail-edit-structured-section-body">${renderEditableStructuredSectionContent(
          'detail-edit',
          detailEditTemplateBlocks,
          'detail-add-template-block-btn'
        )}</div>`
        : currentDetail.templateBlocks.length
          ? renderReadonlyTemplateBlocks(
            currentDetail.templateBlocks.map((block) => ({
              id: `detail_template_${block.id}`,
              blockId: block.id,
              templateType: block.templateType,
              purposeType: block.purposeType || '',
              blockTitle: block.blockTitle,
              primaryLabel:
                block.templateType === XY_TEMPLATE_TYPE
                  ? block.xLabel
                  : block.spectrumAxisLabel,
              primaryUnit:
                block.templateType === XY_TEMPLATE_TYPE
                  ? block.xUnit
                  : block.spectrumAxisUnit,
              secondaryLabel:
                block.templateType === XY_TEMPLATE_TYPE
                  ? block.yLabel
                  : block.signalLabel,
              secondaryUnit:
                block.templateType === XY_TEMPLATE_TYPE
                  ? block.yUnit
                  : block.signalUnit,
              dataText: formatXYPointInput(block.points),
              note: block.note,
              sourceFileName: block.sourceFileName || '',
              sourceFilePath: block.sourceFilePath || '',
              originalFileName: block.originalFileName || '',
              originalFilePath: block.originalFilePath || '',
              createdAt: block.createdAt
            })))
          : `<div class="empty-tip">${escapeHtml(t('databaseDetail.structuredEmpty'))}</div>`
      }
              </div>

              <div class="detail-section">
                <div class="detail-section-title">${escapeHtml(t('databaseDetail.section.editHistory'))}</div>
                ${editHistoryHtml}
              </div>

      ${detailEditMode
        ? `
                    <div class="detail-section">
                      <div class="detail-section-title">${escapeHtml(t('databaseDetail.section.editConfirmation'))}</div>
                      <div class="detail-edit-confirm">
                        <input id="edit-reason-input" class="form-input" placeholder="${escapeHtml(t('databaseDetail.editReasonPlaceholder'))}" value="${escapeHtml(detailEditReason)}" />
                        <input id="edit-editor-input" class="form-input" placeholder="${escapeHtml(t('databaseDetail.editEditorPlaceholder'))}" value="${escapeHtml(detailEditor)}" />
                        <button id="detail-save-edit-btn" class="primary-btn action-btn">${escapeHtml(t('databaseDetail.saveEdit'))}</button>
                      </div>
                      <div id="detail-edit-error" class="error-message large-error"></div>
                    </div>
                  `
        : ''
      }
            </div>
          </section>
        </main>
      </div>

      ${renderDuplicateWarningModal({
        visible: duplicateWarningState?.mode === 'update',
        actionLabel: '修改',
        sampleCode: duplicateWarningState?.mode === 'update' ? duplicateWarningState.sampleCode : '',
        testProject: duplicateWarningState?.mode === 'update' ? duplicateWarningState.testProject : '',
        testTime: duplicateWarningState?.mode === 'update' ? duplicateWarningState.testTime : '',
        matches: duplicateWarningState?.mode === 'update' ? duplicateWarningState.matches : [],
        submitting: duplicateWarningSubmitting
      })}
    `;

    bindAppSidebarEvents();
    document.getElementById('detail-back-btn')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('detail-menu-list')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('detail-menu-home')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.getElementById('detail-menu-analysis')?.addEventListener('click', async () => {
      await openAnalysisWorkspace();
    });

    document.getElementById('detail-menu-settings')?.addEventListener('click', () => {
      void openSettingsView();
    });

    bindDuplicateWarningModalHandlers();

    const openSavedFileButtons = document.querySelectorAll('[data-open-saved-file]');
    openSavedFileButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const filePath = target.dataset.openSavedFile;
        if (!filePath) return;

        const result = await window.electronAPI.openSavedFile({
          filePath
        });

        if (!result.success) {
          alert(result.error || '打开文件失败');
        }
      });
    });

    const openSavedFolderButtons = document.querySelectorAll('[data-open-saved-folder]');
    openSavedFolderButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const filePath = target.dataset.openSavedFolder;
        if (!filePath) return;

        const result = await window.electronAPI.openInFolder({
          filePath
        });

        if (!result.success) {
          alert(result.error || '打开文件夹失败');
        }
      });
    });

    document.getElementById('detail-edit-btn')?.addEventListener('click', () => {
      prepareDetailEditState();
      detailEditMode = true;
      requestRender(true);
    });

    document.getElementById('detail-cancel-edit-btn')?.addEventListener('click', () => {
      detailEditMode = false;
      detailEditReason = '';
      detailEditor = '';
      detailEditStep1 = null;
      detailEditStep2 = [];
      detailEditTemplateBlocks = [];
      resetTemplateBlockImportState('detail-edit');
      requestRender(true);
    });

    if (detailEditMode) {
      bindScalarItemEditorEvents({
        context: 'detail-edit',
        addConditionButtonId: 'detail-add-condition-row-btn',
        addMetricButtonId: 'detail-add-metric-row-btn'
      });

      bindTemplateBlockEditorEvents({
        context: 'detail-edit',
        addButtonId: 'detail-add-template-block-btn'
      });

      bindDetailEditTemplateContextReactivity();
    }

    document.getElementById('detail-save-edit-btn')?.addEventListener('click', async () => {
      if (!currentDetail) return;

      const collected = collectDetailEditState();
      if (!collected) return;

      const errorBox = document.getElementById('detail-edit-error');

      if (!detailEditReason) {
        if (errorBox) errorBox.textContent = t('databaseDetail.validation.reasonRequired');
        return;
      }

      if (!detailEditor) {
        if (errorBox) errorBox.textContent = t('databaseDetail.validation.editorRequired');
        return;
      }

      if (
        !collected.step1.testProject ||
        !collected.step1.sampleCode ||
        !collected.step1.tester ||
        !collected.step1.instrument ||
        !collected.step1.testTime
      ) {
        if (errorBox) errorBox.textContent = t('databaseDetail.validation.primaryRequired');
        return;
      }

      try {
        const scalarValidationError = validateScalarItems(collected.step2);
        if (scalarValidationError) {
          if (errorBox) errorBox.textContent = scalarValidationError;
          return;
        }

        const templateBlocksResult = buildValidatedTemplateBlocks(collected.templateBlocks);
        if (templateBlocksResult.error) {
          if (errorBox) errorBox.textContent = templateBlocksResult.error;
          return;
        }

        const updatePayload: UpdateExperimentPayload = {
          experimentId: currentDetail.id,
          step1: {
            testProject: collected.step1.testProject,
            sampleCode: collected.step1.sampleCode,
            tester: collected.step1.tester,
            instrument: collected.step1.instrument,
            testTime: collected.step1.testTime,
            sampleOwner: collected.step1.sampleOwner,
            dynamicFields: collected.step1.dynamicFields
              .filter((field) => field.name && field.value)
              .map((field) => ({
                name: field.name,
                value: field.value
              }))
          },
          step2: collected.step2
            .filter((item) => item.itemName && item.itemValue)
            .map((item) => ({
              dataItemId: item.dataItemId,
              scalarRole: item.scalarRole,
              itemName: item.itemName,
              itemValue: item.itemValue,
              itemUnit: item.itemUnit,
              sourceFileName: item.sourceFileName,
              sourceFilePath: item.sourceFilePath,
              originalFileName: item.originalFileName,
              originalFilePath: item.originalFilePath,
              replacementSourcePath: item.replacementSourcePath,
              replacementOriginalName: item.replacementOriginalName
            })),
          templateBlocks: templateBlocksResult.blocks,
          displayName: buildDisplayName(collected.step1),
          editReason: detailEditReason,
          editor: detailEditor
        };

        const analysisWarnings = buildAnalysisPreparationWarnings(
          updatePayload.step2.map((item) => ({
            itemName: item.itemName,
            itemValue: item.itemValue,
            itemUnit: item.itemUnit
          })),
          updatePayload.templateBlocks
        );

        if (!confirmAnalysisPreparationWarnings(analysisWarnings)) {
          return;
        }

        const openedWarning = await openDuplicateWarningForUpdate(updatePayload);
        if (openedWarning) {
          return;
        }

        await performUpdateSave(updatePayload);
      } catch (error) {
        if (errorBox) errorBox.textContent = '修改失败，请稍后重试';
        console.error(error);
      }
    });

    return;
  }

  if (currentView === 'settings') {
    const selectedOrphanCount = selectedOrphanPaths.length;
    const missingDetailsHtml = fileIntegrityReport?.missingReferencedFiles.length
      ? `
          <div class="detail-section">
            <div class="detail-section-title">缺失引用文件</div>
            <div class="detail-list">
              ${fileIntegrityReport.missingReferencedFiles
          .slice(0, 10)
          .map(
            (entry) => `
                  <div class="detail-list-item">
                    <div class="detail-list-key">${escapeHtml(entry.filePath)}</div>
                    <div class="detail-list-value">
                      受影响记录：
                      ${entry.affectedRecords
              .map(
                (record) =>
                  `#${record.experimentId} ${escapeHtml(record.displayName)} / ${escapeHtml(
                    record.recordType === 'templateBlock'
                      ? `${getTemplateBlockTypeLabel(
                          (record.templateType as TemplateBlockType) || XY_TEMPLATE_TYPE
                        )}：${record.blockTitle || '-'}`
                      : record.itemName || '-'
                  )}`
              )
              .join('；')}
                    </div>
                    <button
                      class="secondary-btn"
                      type="button"
                      data-open-integrity-path="${escapeHtml(entry.filePath)}"
                    >
                      打开相关目录
                    </button>
                  </div>
                `
          )
          .join('')}
            </div>
          </div>
        `
      : '';
    const orphanEntriesHtml = fileIntegrityReport?.orphanFiles.length
      ? `
          <div class="detail-section">
            <div class="detail-section-title">孤儿文件</div>
            <div class="form-action-row">
              <button
                id="settings-select-all-orphans-btn"
                class="secondary-btn action-btn"
                type="button"
                ${fileIntegrityActionLoading ? 'disabled' : ''}
              >
                全选孤儿文件
              </button>
              <button
                id="settings-clear-orphans-btn"
                class="secondary-btn action-btn"
                type="button"
                ${fileIntegrityActionLoading ? 'disabled' : ''}
              >
                清空选择
              </button>
            </div>
            <div class="detail-list">
              ${fileIntegrityReport.orphanFiles
          .slice(0, 20)
          .map(
            (entry) => `
                  <div class="detail-list-item">
                    <label class="checkbox-row">
                      <input
                        type="checkbox"
                        data-select-orphan-path="${escapeHtml(entry.filePath)}"
                        ${selectedOrphanPaths.includes(entry.filePath) ? 'checked' : ''}
                      />
                      <span>${escapeHtml(entry.relativePath)}</span>
                    </label>
                    <div class="detail-list-value">${escapeHtml(entry.filePath)}</div>
                    <button
                      class="secondary-btn"
                      type="button"
                      data-open-integrity-path="${escapeHtml(entry.filePath)}"
                    >
                      打开所在目录
                    </button>
                  </div>
                `
          )
          .join('')}
            </div>
          </div>
        `
      : '';
    const missingExamplesHtml = fileIntegrityReport?.missingExamples.length
      ? `
          <div class="detail-section">
            <div class="detail-section-title">缺失文件示例（最多 10 条）</div>
            <div class="detail-stack">
              ${fileIntegrityReport.missingExamples
          .map(
            (filePath) => `<div class="detail-value" title="${escapeHtml(filePath)}">${escapeHtml(filePath)}</div>`
          )
          .join('')}
            </div>
          </div>
        `
      : '';
    const orphanExamplesHtml = fileIntegrityReport?.orphanExamples.length
      ? `
          <div class="detail-section">
            <div class="detail-section-title">孤儿文件示例（最多 10 条）</div>
            <div class="detail-stack">
              ${fileIntegrityReport.orphanExamples
          .map(
            (filePath) => `<div class="detail-value" title="${escapeHtml(filePath)}">${escapeHtml(filePath)}</div>`
          )
          .join('')}
            </div>
          </div>
        `
      : '';
    const recentOperationLogsHtml = recentOperationLogs
      ? renderRecentOperationLogs(recentOperationLogs, {
          empty: t('settings.logsEmpty'),
          operationType: t('settings.logsOperationType'),
          experimentId: t('settings.logsExperimentId'),
          actor: t('settings.logsActor'),
          summary: t('settings.logsSummary')
        })
      : `<div class="detail-value">${escapeHtml(t('settings.recentLogsEmpty'))}</div>`;
    const runtimeDbPath = appRuntimeInfo?.runtimeDbPath || '';
    const generalSettingsHtml = `
      <div class="detail-section">
        <div class="detail-section-title">${escapeHtml(t('language.sectionTitle'))}</div>
        <div class="form-group">
          <label class="form-label" for="settings-app-language">${escapeHtml(t('language.label'))}</label>
          <select id="settings-app-language" class="form-input">
            <option value="zh-CN" ${appSettings.appLanguage === 'zh-CN' ? 'selected' : ''}>${escapeHtml(t('language.option.zh-CN'))}</option>
            <option value="en" ${appSettings.appLanguage === 'en' ? 'selected' : ''}>${escapeHtml(t('language.option.en'))}</option>
          </select>
        </div>
        <div class="detail-value">${escapeHtml(t('language.hint'))}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">${escapeHtml(t('settings.storageRootTitle'))}</div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('settings.storageRootLabel'))}</label>
          <input id="settings-storage-root" class="form-input" value="${escapeHtml(appSettings.storageRoot)}" />
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">${escapeHtml(t('settings.loginSettingsTitle'))}</div>
        <div class="step-form-grid">
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('settings.loginUsernameLabel'))}</label>
            <input id="settings-login-username" class="form-input" value="${escapeHtml(appSettings.loginUsername)}" />
          </div>

          <div class="form-group">
            <label class="form-label">${escapeHtml(t('settings.loginPasswordLabel'))}</label>
            <input
              id="settings-login-password"
              class="form-input"
              type="password"
              placeholder="${escapeHtml(t('settings.loginPasswordPlaceholder'))}"
            />
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">${escapeHtml(t('settings.backupTitle'))}</div>
        <div class="backup-reminder-card">
          <div class="backup-reminder-title">${escapeHtml(t('settings.runtimeDbLocationTitle'))}</div>
          <div class="backup-reminder-text">
            ${escapeHtml(t('settings.backupText'))}
          </div>
          <div class="backup-reminder-path" title="${escapeHtml(runtimeDbPath || t('settings.runtimeDbUnavailable'))}">
            ${escapeHtml(runtimeDbPath || t('settings.runtimeDbUnavailable'))}
          </div>
          <div class="form-action-row about-action-row">
            <button
              id="settings-open-runtime-db-folder-btn"
              class="secondary-btn action-btn"
              type="button"
              ${runtimeDbPath ? '' : 'disabled'}
            >
              ${escapeHtml(t('settings.openRuntimeDbFolder'))}
            </button>
          </div>
        </div>
      </div>

      <div id="settings-error" class="error-message large-error"></div>

      <div class="form-action-row">
        <button id="settings-save-btn" class="primary-btn action-btn">${escapeHtml(t('common.saveSettings'))}</button>
        <button
          id="settings-file-integrity-btn"
          class="secondary-btn action-btn"
          type="button"
          ${fileIntegrityLoading ? 'disabled' : ''}
        >
          ${escapeHtml(fileIntegrityLoading ? t('settings.fileIntegrityChecking') : t('settings.fileIntegrityButton'))}
        </button>
        <button
          id="settings-open-storage-root-btn"
          class="secondary-btn action-btn"
          type="button"
          ${fileIntegrityActionLoading ? 'disabled' : ''}
        >
          ${escapeHtml(t('settings.openStorageRoot'))}
        </button>
      </div>

      ${fileIntegrityError ? `<div class="error-message large-error">${escapeHtml(fileIntegrityError)}</div>` : ''}

      ${fileIntegrityReport
        ? `
            <div class="detail-section">
              <div class="detail-section-title">文件完整性报告</div>
              <div class="info-row">
                <span>扫描根目录</span>
                <strong title="${escapeHtml(fileIntegrityReport.storageRoot)}">
                  ${escapeHtml(fileIntegrityReport.storageRoot)}
                </strong>
              </div>
              <div class="info-row">
                <span>根目录状态</span>
                <strong>${fileIntegrityReport.storageRootExists ? '存在' : '不存在'}</strong>
              </div>
              <div class="info-row">
                <span>数据库引用的托管文件</span>
                <strong>${fileIntegrityReport.referencedManagedFileCount}</strong>
              </div>
              <div class="info-row">
                <span>缺失文件</span>
                <strong>${fileIntegrityReport.missingReferencedFileCount}</strong>
              </div>
              <div class="info-row">
                <span>扫描到的托管文件</span>
                <strong>${fileIntegrityReport.scannedManagedFileCount}</strong>
              </div>
              <div class="info-row">
                <span>孤儿文件</span>
                <strong>${fileIntegrityReport.orphanManagedFileCount}</strong>
              </div>
            </div>

            <div class="form-action-row">
              <button
                id="settings-export-orphan-list-btn"
                class="secondary-btn action-btn"
                type="button"
                ${fileIntegrityActionLoading || !selectedOrphanCount ? 'disabled' : ''}
              >
                导出所选孤儿文件清单
              </button>
              <button
                id="settings-quarantine-orphans-btn"
                class="secondary-btn action-btn"
                type="button"
                ${fileIntegrityActionLoading || !selectedOrphanCount ? 'disabled' : ''}
              >
                ${fileIntegrityActionLoading ? '处理中...' : '隔离所选孤儿文件'}
              </button>
            </div>

            ${missingDetailsHtml}
            ${orphanEntriesHtml}
            ${missingExamplesHtml}
            ${orphanExamplesHtml}
          `
        : ''}
    `;
    const logsSettingsHtml = `
      <div class="detail-section">
        <div class="detail-section-title">${escapeHtml(t('settings.recentLogsTitle'))}</div>
        <div class="detail-section-subtitle">${escapeHtml(t('settings.subtitle.logs'))}</div>
        <div class="form-action-row">
          <button
            id="settings-recent-logs-btn"
            class="secondary-btn action-btn"
            type="button"
            ${operationLogLoading ? 'disabled' : ''}
          >
            ${escapeHtml(operationLogLoading ? t('settings.recentLogsLoading') : t('settings.recentLogsButton'))}
          </button>
          ${renderOperationLogFilterButtons(operationLogFilter, operationLogLoading, {
            all: t('settings.logsFilter.all'),
            delete: t('settings.logsFilter.delete'),
            export: t('settings.logsFilter.export')
          })}
        </div>

        ${operationLogError ? `<div class="error-message large-error">${escapeHtml(operationLogError)}</div>` : ''}
        ${recentOperationLogsHtml}
      </div>
    `;
    const dictionaryManagementHtml = `
      ${dictionaryLoadError ? `<div class="error-message large-error">${escapeHtml(dictionaryLoadError)}</div>` : ''}
      ${dictionaryLoading && !dictionaryLoaded ? `<div class="empty-tip">${escapeHtml(t('dictionary.loading'))}</div>` : ''}
      ${DICTIONARY_SECTION_META.map((type) =>
        renderDictionaryManagementSection(type, getDictionarySectionLabel(getCurrentLanguage(), type))
      ).join('')}
    `;
    const aboutSettingsHtml = `
      ${renderAboutSurface(appName, version)}
    `;

    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'settings-menu-home', label: t('common.home'), icon: '⌂' },
          { id: 'settings-menu-data', label: t('common.data'), icon: '▣' },
          { id: 'settings-menu-analysis', label: t('common.analysis'), icon: '◫' },
          { label: t('common.settings'), icon: '⚙', active: true }
        ])}

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">${escapeHtml(t('settings.topbarTitle'))}</div>
            <button id="settings-back-home-btn" class="secondary-btn">${escapeHtml(t('settings.backHome'))}</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>${escapeHtml(
                settingsSubView === 'general'
                  ? t('settings.heading.general')
                  : settingsSubView === 'dictionary'
                    ? t('settings.heading.dictionary')
                    : settingsSubView === 'logs'
                      ? t('settings.heading.logs')
                      : t('settings.heading.about')
              )}</h2>
              <p class="subtitle">
                ${
                  settingsSubView === 'general'
                    ? escapeHtml(t('settings.subtitle.general'))
                    : settingsSubView === 'dictionary'
                      ? escapeHtml(t('settings.subtitle.dictionary'))
                      : settingsSubView === 'logs'
                        ? escapeHtml(t('settings.subtitle.logs'))
                      : escapeHtml(t('settings.subtitle.about'))
                }
              </p>

              ${renderSettingsSubViewTabs()}
              ${
                settingsSubView === 'general'
                  ? generalSettingsHtml
                  : settingsSubView === 'dictionary'
                    ? dictionaryManagementHtml
                    : settingsSubView === 'logs'
                      ? logsSettingsHtml
                    : aboutSettingsHtml
              }
            </div>
          </section>
        </main>
      </div>
      ${renderThirdPartyNoticesDialog()}
    `;

    bindAppSidebarEvents();
    bindAboutEntryEvents(true);
    document.getElementById('settings-menu-home')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.getElementById('settings-menu-data')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('settings-menu-analysis')?.addEventListener('click', async () => {
      await openAnalysisWorkspace();
    });

    document.getElementById('settings-back-home-btn')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.querySelectorAll('[data-settings-subview]').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const nextSubView = target.dataset.settingsSubview as SettingsSubView | undefined;

        if (!nextSubView) {
          return;
        }

        await switchSettingsSubView(nextSubView);
      });
    });

    document.getElementById('settings-app-language')?.addEventListener('change', async (event) => {
      const target = event.target as HTMLSelectElement;
      const nextLanguage = target.value as AppLanguage;
      const previousLanguage = appSettings.appLanguage;

      if ((nextLanguage !== 'zh-CN' && nextLanguage !== 'en') || nextLanguage === previousLanguage) {
        target.value = previousLanguage;
        return;
      }

      appSettings = {
        ...appSettings,
        appLanguage: nextLanguage
      };
      requestRender(true);

      try {
        const result = await window.electronAPI.setAppLanguage({ appLanguage: nextLanguage });
        if (!result.success) {
          appSettings = {
            ...appSettings,
            appLanguage: previousLanguage
          };
          requestRender(true);
          alert(result.error || t('language.saveFailed'));
        }
      } catch (error) {
        appSettings = {
          ...appSettings,
          appLanguage: previousLanguage
        };
        requestRender(true);
        alert(getErrorMessage(error) || t('language.saveFailed'));
      }
    });

    if (settingsSubView === 'dictionary') {
      DICTIONARY_TYPES.forEach((dictionaryType) => {
        document
          .getElementById(`dictionary-input-${dictionaryType}`)
          ?.addEventListener('input', (event) => {
            const target = event.target as HTMLInputElement;
            dictionaryInputValues[dictionaryType] = target.value;

            if (dictionarySectionErrors[dictionaryType]) {
              dictionarySectionErrors[dictionaryType] = '';
            }
          });
      });

      document.querySelectorAll('[data-dictionary-add-type]').forEach((button) => {
        button.addEventListener('click', async () => {
          if (dictionarySubmittingType || dictionaryDeletingId) {
            return;
          }

          const target = button as HTMLElement;
          const dictionaryType = target.dataset.dictionaryAddType as DictionaryType | undefined;
          if (!dictionaryType) {
            return;
          }

          saveDictionaryInputsToState();
          dictionarySectionErrors[dictionaryType] = '';
          dictionarySubmittingType = dictionaryType;
          requestRender(true);

          try {
            const result = await window.electronAPI.addDictionaryItem({
              type: dictionaryType,
              value: dictionaryInputValues[dictionaryType]
            });

            if (!result.success) {
              dictionarySectionErrors[dictionaryType] = result.error || t('dictionary.addFailed');
              return;
            }

            dictionaryInputValues[dictionaryType] = '';
            await reloadDictionaryItems();
          } catch (error) {
            dictionarySectionErrors[dictionaryType] = getErrorMessage(error) || t('dictionary.addFailed');
          } finally {
            dictionarySubmittingType = null;
            requestRender(true);
          }
        });
      });

      document.querySelectorAll('[data-dictionary-delete-id]').forEach((button) => {
        button.addEventListener('click', async () => {
          if (dictionaryDeletingId || dictionarySubmittingType) {
            return;
          }

          const target = button as HTMLElement;
          const id = target.dataset.dictionaryDeleteId;
          const label = target.dataset.dictionaryDeleteLabel || '该词典项';
          if (!id) {
            return;
          }

          const shouldContinue = window.confirm(
            t('dictionary.deleteConfirm', { label })
          );
          if (!shouldContinue) {
            return;
          }

          dictionaryDeletingId = id;
          requestRender(true);

          try {
            const result = await window.electronAPI.deactivateDictionaryItem({ id });
            if (!result.success) {
              alert(result.error || t('dictionary.deleteFailed'));
              return;
            }

            await reloadDictionaryItems();
          } catch (error) {
            alert(getErrorMessage(error) || t('dictionary.deleteFailed'));
          } finally {
            dictionaryDeletingId = null;
            requestRender(true);
          }
        });
      });

      return;
    }

    document.getElementById('settings-save-btn')?.addEventListener('click', async () => {
      const storageRoot =
        (document.getElementById('settings-storage-root') as HTMLInputElement)?.value.trim() || '';
      const loginUsername =
        (document.getElementById('settings-login-username') as HTMLInputElement)?.value.trim() || '';
      const newPassword =
        (document.getElementById('settings-login-password') as HTMLInputElement)?.value || '';
      const errorBox = document.getElementById('settings-error');

      if (!storageRoot) {
        if (errorBox) errorBox.textContent = t('settings.storageRootRequired');
        return;
      }

      if (!loginUsername) {
        if (errorBox) errorBox.textContent = t('settings.loginUsernameRequired');
        return;
      }

      if (errorBox) errorBox.textContent = '';

      try {
        const result = await window.electronAPI.saveAppSettings({
          storageRoot,
          loginUsername,
          appLanguage: appSettings.appLanguage,
          newPassword: newPassword || undefined
        });

        if (!result.success) {
          if (errorBox) errorBox.textContent = result.error || t('settings.saveFailed');
          return;
        }

        appSettings = {
          storageRoot,
          loginUsername,
          appLanguage: appSettings.appLanguage
        };
        fileIntegrityReport = null;
        fileIntegrityError = '';

        const passwordInput = document.getElementById('settings-login-password') as HTMLInputElement | null;
        if (passwordInput) {
          passwordInput.value = '';
        }

        alert(t('settings.saveSuccess'));
      } catch (error) {
        if (errorBox) errorBox.textContent = t('settings.saveFailedRetry');
        console.error(error);
      }
    });

    document.getElementById('settings-file-integrity-btn')?.addEventListener('click', async () => {
      if (fileIntegrityLoading) {
        return;
      }

      fileIntegrityLoading = true;
      fileIntegrityError = '';
      requestRender(true);

      try {
        await reloadFileIntegrityReport();
      } catch (error) {
        fileIntegrityReport = null;
        fileIntegrityError = getErrorMessage(error) || '文件完整性检查失败';
      } finally {
        fileIntegrityLoading = false;
        requestRender(true);
      }
    });

    document.getElementById('settings-recent-logs-btn')?.addEventListener('click', async () => {
      if (operationLogLoading) {
        return;
      }

      operationLogLoading = true;
      operationLogError = '';
      requestRender(true);

      try {
        await reloadRecentOperationLogs();
      } catch (error) {
        recentOperationLogs = null;
        operationLogError = getErrorMessage(error) || t('settings.recentLogsLoadFailed');
      } finally {
        operationLogLoading = false;
        requestRender(true);
      }
    });

    document.querySelectorAll('[data-operation-log-filter]').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const nextFilter = target.dataset.operationLogFilter as OperationLogFilter | undefined;

        if (!nextFilter || operationLogLoading || nextFilter === operationLogFilter) {
          return;
        }

        operationLogFilter = nextFilter;
        operationLogLoading = true;
        operationLogError = '';
        requestRender(true);

        try {
          await reloadRecentOperationLogs(nextFilter);
        } catch (error) {
          recentOperationLogs = null;
          operationLogError = getErrorMessage(error) || t('settings.recentLogsLoadFailed');
        } finally {
          operationLogLoading = false;
          requestRender(true);
        }
      });
    });

    document.getElementById('settings-open-storage-root-btn')?.addEventListener('click', async () => {
      if (!appSettings.storageRoot) {
        alert(t('settings.openStorageRootMissing'));
        return;
      }

      await openPathLocation(appSettings.storageRoot);
    });

    document.getElementById('settings-open-runtime-db-folder-btn')?.addEventListener('click', async () => {
      if (!appRuntimeInfo?.runtimeDbPath) {
        alert(t('settings.openRuntimeDbMissing'));
        return;
      }

      await openPathLocation(appRuntimeInfo.runtimeDbPath);
    });

    document.querySelectorAll('[data-open-integrity-path]').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const targetPath = target.dataset.openIntegrityPath;
        if (!targetPath) return;

        await openPathLocation(targetPath);
      });
    });

    document.querySelectorAll('[data-select-orphan-path]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const target = checkbox as HTMLInputElement;
        const filePath = target.dataset.selectOrphanPath;
        if (!filePath) return;

        if (target.checked) {
          selectedOrphanPaths = Array.from(new Set([...selectedOrphanPaths, filePath]));
        } else {
          selectedOrphanPaths = selectedOrphanPaths.filter((item) => item !== filePath);
        }

        requestRender(true);
      });
    });

    document.getElementById('settings-select-all-orphans-btn')?.addEventListener('click', () => {
      if (!fileIntegrityReport?.orphanFiles.length) {
        return;
      }

      selectedOrphanPaths = fileIntegrityReport.orphanFiles.map((entry) => entry.filePath);
      requestRender(true);
    });

    document.getElementById('settings-clear-orphans-btn')?.addEventListener('click', () => {
      selectedOrphanPaths = [];
      requestRender(true);
    });

    document.getElementById('settings-export-orphan-list-btn')?.addEventListener('click', async () => {
      if (!fileIntegrityReport?.orphanFiles.length || !selectedOrphanPaths.length || fileIntegrityActionLoading) {
        return;
      }

      fileIntegrityActionLoading = true;
      requestRender(true);

      try {
        const result = await window.electronAPI.exportOrphanFileList({
          storageRoot: fileIntegrityReport.storageRoot,
          orphanPaths: selectedOrphanPaths
        });

        if (result.canceled) {
          return;
        }

        if (!result.success) {
          alert(result.error || '导出孤儿文件清单失败');
          return;
        }

        alert(`孤儿文件清单已导出：\n${result.exportPath || ''}`);
      } catch (error) {
        alert(getErrorMessage(error) || '导出孤儿文件清单失败');
      } finally {
        fileIntegrityActionLoading = false;
        requestRender(true);
      }
    });

    document.getElementById('settings-quarantine-orphans-btn')?.addEventListener('click', async () => {
      if (!fileIntegrityReport?.orphanFiles.length || !selectedOrphanPaths.length || fileIntegrityActionLoading) {
        return;
      }

      const shouldContinue = window.confirm(
        `将把 ${selectedOrphanPaths.length} 个所选孤儿文件移动到隔离目录，不会直接删除。是否继续？`
      );
      if (!shouldContinue) {
        return;
      }

      fileIntegrityActionLoading = true;
      requestRender(true);

      try {
        const result = await window.electronAPI.quarantineOrphanFiles({
          storageRoot: fileIntegrityReport.storageRoot,
          orphanPaths: selectedOrphanPaths
        });

        if (result.canceled) {
          return;
        }

        if (!result.success) {
          alert(result.error || '隔离孤儿文件失败');
          return;
        }

        await reloadFileIntegrityReport();
        alert(
          `已移动 ${result.movedCount || 0} 个文件到隔离目录。\n隔离目录：${result.quarantinePath || ''}`
        );
      } catch (error) {
        alert(getErrorMessage(error) || '隔离孤儿文件失败');
      } finally {
        fileIntegrityActionLoading = false;
        requestRender(true);
      }
    });

    return;
  }
}

function bindStep1Events() {
  document.getElementById('back-home-btn')?.addEventListener('click', goHome);
  document.getElementById('menu-home')?.addEventListener('click', goHome);
  document.getElementById('step1-cancel-btn')?.addEventListener('click', goHome);

  bindStep1DictionaryAddAction({
    inputId: 'testProject',
    buttonId: 'project-plus-btn',
    dictionaryType: 'testProject',
    feedbackId: 'testProject-dictionary-feedback',
    successMessage: t('step1.dictionaryAdded.testProject'),
    suggestionContainerId: 'testProject-suggestion-list'
  });

  bindStep1DictionaryAddAction({
    inputId: 'tester',
    buttonId: 'tester-plus-btn',
    dictionaryType: 'tester',
    feedbackId: 'tester-dictionary-feedback',
    successMessage: t('step1.dictionaryAdded.tester'),
    suggestionContainerId: 'tester-suggestion-list'
  });

  bindStep1DictionaryAddAction({
    inputId: 'instrument',
    buttonId: 'instrument-plus-btn',
    dictionaryType: 'instrument',
    feedbackId: 'instrument-dictionary-feedback',
    successMessage: t('step1.dictionaryAdded.instrument'),
    suggestionContainerId: 'instrument-suggestion-list'
  });

  bindStep1SuggestionInput({
    inputId: 'testProject',
    dictionaryType: 'testProject',
    containerId: 'testProject-suggestion-list',
    feedbackId: 'testProject-dictionary-feedback'
  });

  bindStep1SuggestionInput({
    inputId: 'tester',
    dictionaryType: 'tester',
    containerId: 'tester-suggestion-list',
    feedbackId: 'tester-dictionary-feedback'
  });

  bindStep1SuggestionInput({
    inputId: 'instrument',
    dictionaryType: 'instrument',
    containerId: 'instrument-suggestion-list',
    feedbackId: 'instrument-dictionary-feedback'
  });

  document.getElementById('add-dynamic-field-btn')?.addEventListener('click', () => {
    saveStep1InputsToState();
    step1FormData.dynamicFields.push({
      id: generateId(),
      name: '',
      value: ''
    });
    requestRender(true);
  });

  document.getElementById('step1-next-btn')?.addEventListener('click', async () => {
    saveStep1InputsToState();

    const errorMessage = validateStep1();
    const errorBox = document.getElementById('step1-error');

    if (errorMessage) {
      if (errorBox) errorBox.textContent = errorMessage;
      return;
    }

    if (errorBox) errorBox.textContent = '';

    try {
      const dictionaryValidationMessage = await validateStep1DictionaryMembership();
      if (dictionaryValidationMessage) {
        window.alert(dictionaryValidationMessage);
        return;
      }
    } catch (error) {
      window.alert(`${t('step1.dictionaryValidationFailed')}\n${getErrorMessage(error)}`);
      return;
    }

    currentView = 'add-step2';
    void render();
  });

  bindDynamicFieldEvents();
}

function bindDynamicFieldEvents() {
  const removeButtons = document.querySelectorAll('[data-remove-dynamic-id]');
  removeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const id = target.dataset.removeDynamicId;
      if (!id) return;

      saveStep1InputsToState();
      step1FormData.dynamicFields = step1FormData.dynamicFields.filter((field) => field.id !== id);
      requestRender(true);
    });
  });
}

function bindStep2Events() {
  bindScalarItemEditorEvents({
    context: 'create-step2',
    addConditionButtonId: 'create-add-condition-row-btn',
    addMetricButtonId: 'create-add-metric-row-btn'
  });

  bindTemplateBlockEditorEvents({
    context: 'create-step2',
    addButtonId: 'add-template-block-btn'
  });

  document.getElementById('back-step1-btn-top')?.addEventListener('click', () => {
    saveStep2InputsToState();
    currentView = 'add-step1';
    void render();
  });

  document.getElementById('back-step1-btn-bottom')?.addEventListener('click', () => {
    saveStep2InputsToState();
    currentView = 'add-step1';
    void render();
  });

  document.getElementById('menu-home-step2')?.addEventListener('click', () => {
    saveStep2InputsToState();
    goHome();
  });

  document.getElementById('finish-step2-btn')?.addEventListener('click', async () => {
    saveStep2InputsToState();

    const errorBox = document.getElementById('step2-error');
    const validationResult = validateStep2();
    const errorMessage = validationResult.error;

    if (errorMessage) {
      if (errorBox) errorBox.textContent = errorMessage;
      return;
    }

    if (errorBox) errorBox.textContent = '';

    try {
      const savePayload: SaveExperimentPayload = {
        step1: {
          testProject: step1FormData.testProject,
          sampleCode: step1FormData.sampleCode,
          tester: step1FormData.tester,
          instrument: step1FormData.instrument,
          testTime: step1FormData.testTime,
          sampleOwner: step1FormData.sampleOwner,
          dynamicFields: step1FormData.dynamicFields
            .filter((field) => field.name && field.value)
            .map((field) => ({
              name: field.name,
              value: field.value
            }))
        },
        step2: step2DataItems
          .filter((row) => row.itemName && row.itemValue)
          .map((row) => ({
            scalarRole: row.scalarRole,
            itemName: row.itemName,
            itemValue: row.itemValue,
            itemUnit: row.itemUnit,
            sourceFileName: row.sourceFileName,
            sourceFilePath: row.sourceFilePath,
            originalFileName: row.originalFileName,
            originalFilePath: row.originalFilePath
          })),
        templateBlocks: validationResult.templateBlocks,
        displayName: buildDisplayName(step1FormData)
      };

      const analysisWarnings = buildAnalysisPreparationWarnings(
        savePayload.step2.map((item) => ({
          itemName: item.itemName,
          itemValue: item.itemValue,
          itemUnit: item.itemUnit
        })),
        savePayload.templateBlocks
      );

      if (!confirmAnalysisPreparationWarnings(analysisWarnings)) {
        return;
      }

      const openedWarning = await openDuplicateWarningForCreate(savePayload);
      if (openedWarning) {
        return;
      }

      await performCreateSave(savePayload);
    } catch (error) {
      if (errorBox) errorBox.textContent = '保存实验数据失败，请稍后重试';
      console.error(error);
    }
  });

}

async function loadDatabaseList(
  query = databaseSearchKeyword,
  groupBy: GroupByType = databaseGroupBy
) {
  databaseGroups = await window.electronAPI.listExperiments({
    query,
    groupBy,
    crossFilters: databaseCrossFilters,
    sortOrder: databaseSortOrder
  });

  const validIds = databaseGroups.flatMap((group) => group.items.map((item) => item.id));
  selectedExperimentIds = selectedExperimentIds.filter((id) => validIds.includes(id));

  if (databaseFilterDraft.open) {
    void refreshDatabaseFilterCandidateValues(true);
  }
}

async function loadDatabaseListView() {
  await loadDatabaseList();
}

function hasActiveDatabaseSearchOrFilters() {
  return Boolean(databaseSearchKeyword || databaseCrossFilters.length);
}

function renderDatabaseGroups(groups: ExperimentGroup[]) {
  if (!groups.length) {
    return hasActiveDatabaseSearchOrFilters()
      ? `<div class="empty-tip">${escapeHtml(t('database.emptyFiltered'))}</div>`
      : `<div class="empty-tip">${escapeHtml(t('database.emptyDefault'))}</div>`;
  }

  return groups
    .map(
      (group) => `
        <div class="db-group-block">
          <div class="db-group-title">${escapeHtml(group.groupLabel)}</div>
          <div class="record-list">
            ${group.items
          .map(
            (item) => `
	                  <div class="record-card selectable-record-card">
	                    <button
	                      class="select-circle-btn ${isExperimentSelected(item.id) ? 'selected-circle-btn' : ''}"
                      data-select-experiment-id="${item.id}"
                      type="button"
                    >
                      ${isExperimentSelected(item.id) ? '●' : '○'}
                    </button>

	                    <div class="record-main">
	                      <div class="record-title">${escapeHtml(item.displayName)}</div>
	                      <div class="record-meta">
                        <span>${escapeHtml(t('database.card.sampleCode'))}：${escapeHtml(item.sampleCode)}</span>
                        <span>${escapeHtml(t('database.card.testProject'))}：${escapeHtml(item.testProject)}</span>
                        <span>${escapeHtml(t('database.card.tester'))}：${escapeHtml(item.tester)}</span>
                        <span>${escapeHtml(t('database.card.instrument'))}：${escapeHtml(item.instrument)}</span>
	                      </div>
	                    </div>
	
	                    <button class="secondary-btn" type="button" data-open-detail-id="${item.id}">${escapeHtml(t('database.card.viewDetails'))}</button>
	                  </div>
	                `
          )
          .join('')}
          </div>
        </div>
      `
    )
    .join('');
}

function prepareDetailEditState() {
  if (!currentDetail) return;

  detailEditStep1 = {
    testProject: currentDetail.testProject,
    sampleCode: currentDetail.sampleCode,
    tester: currentDetail.tester,
    instrument: currentDetail.instrument,
    testTime: currentDetail.testTime,
    sampleOwner: currentDetail.sampleOwner || '',
    dynamicFields: currentDetail.customFields.map((field) => ({
      id: `detail_field_${field.id}`,
      name: field.fieldName,
      value: field.fieldValue
    }))
  };

  detailEditStep2 = currentDetail.dataItems.map((item) => ({
    id: `detail_item_${item.id}`,
    dataItemId: item.id,
    scalarRole: resolveScalarItemRole(item),
    itemName: item.itemName,
    itemValue: item.itemValue,
    itemUnit: item.itemUnit || '',
    sourceFileName: item.sourceFileName || '',
    sourceFilePath: item.sourceFilePath || '',
    originalFileName: item.originalFileName || '',
    originalFilePath: item.originalFilePath || '',
    replacementSourcePath: '',
    replacementOriginalName: ''
  }));

  detailEditTemplateBlocks = currentDetail.templateBlocks.map((block) => ({
    id: `detail_template_${block.id}`,
    blockId: block.id,
    templateType: block.templateType,
    purposeType: block.purposeType || '',
    blockTitle: block.blockTitle,
    primaryLabel:
      block.templateType === XY_TEMPLATE_TYPE ? block.xLabel : block.spectrumAxisLabel,
    primaryUnit:
      block.templateType === XY_TEMPLATE_TYPE ? block.xUnit : block.spectrumAxisUnit,
    secondaryLabel:
      block.templateType === XY_TEMPLATE_TYPE ? block.yLabel : block.signalLabel,
    secondaryUnit:
      block.templateType === XY_TEMPLATE_TYPE ? block.yUnit : block.signalUnit,
    dataText: formatXYPointInput(block.points),
    note: block.note,
    sourceFileName: block.sourceFileName || '',
    sourceFilePath: block.sourceFilePath || '',
    originalFileName: block.originalFileName || '',
    originalFilePath: block.originalFilePath || '',
    replacementSourcePath: '',
    replacementOriginalName: '',
    importPreviewLoading: false,
    importPreviewError: '',
    importParserLabel: '',
    importWarnings: [] as string[],
    createdAt: block.createdAt
  }));
}

function collectDetailEditState() {
  if (!detailEditStep1) return null;

  syncDetailEditStep1InputsToState();

  detailEditStep2 = detailEditStep2.map((item) => ({
    ...item,
    itemName:
      (document.getElementById(`scalar-item-name-${item.id}`) as HTMLInputElement)?.value.trim() ||
      '',
    itemValue:
      (document.getElementById(`scalar-item-value-${item.id}`) as HTMLInputElement)?.value.trim() ||
      '',
    itemUnit:
      (document.getElementById(`scalar-item-unit-${item.id}`) as HTMLInputElement)?.value.trim() ||
      ''
  }));

  detailEditTemplateBlocks = detailEditTemplateBlocks.map((block) => {
    const purposeType = document.getElementById(
      `template-block-purpose-${block.id}`
    ) as HTMLSelectElement | null;
    const blockTitle = document.getElementById(
      `template-block-title-${block.id}`
    ) as HTMLInputElement | null;
    const primaryLabel = document.getElementById(
      `template-block-primary-label-${block.id}`
    ) as HTMLInputElement | null;
    const primaryUnit = document.getElementById(
      `template-block-primary-unit-${block.id}`
    ) as HTMLInputElement | null;
    const secondaryLabel = document.getElementById(
      `template-block-secondary-label-${block.id}`
    ) as HTMLInputElement | null;
    const secondaryUnit = document.getElementById(
      `template-block-secondary-unit-${block.id}`
    ) as HTMLInputElement | null;
    const dataText = document.getElementById(
      `template-block-data-${block.id}`
    ) as HTMLTextAreaElement | null;
    const note = document.getElementById(
      `template-block-note-${block.id}`
    ) as HTMLInputElement | null;

    return {
      ...block,
      purposeType: (purposeType?.value as StructuredBlockPurpose | undefined) || block.purposeType || '',
      blockTitle: blockTitle?.value || '',
      primaryLabel: primaryLabel?.value || '',
      primaryUnit: primaryUnit?.value || '',
      secondaryLabel: secondaryLabel?.value || '',
      secondaryUnit: secondaryUnit?.value || '',
      dataText: dataText?.value || '',
      note: note?.value || ''
    };
  });

  syncTemplateBlockImportInputsToState('detail-edit');

  detailEditReason =
    (document.getElementById('edit-reason-input') as HTMLInputElement)?.value.trim() || '';
  detailEditor =
    (document.getElementById('edit-editor-input') as HTMLInputElement)?.value.trim() || '';

  return {
    step1: detailEditStep1,
    step2: detailEditStep2,
    templateBlocks: detailEditTemplateBlocks
  };
}

function saveStep1InputsToState() {
  const testProject = document.getElementById('testProject') as HTMLInputElement | null;
  const sampleCode = document.getElementById('sampleCode') as HTMLInputElement | null;
  const tester = document.getElementById('tester') as HTMLInputElement | null;
  const instrument = document.getElementById('instrument') as HTMLInputElement | null;
  const testTime = document.getElementById('testTime') as HTMLInputElement | null;
  const sampleOwner = document.getElementById('sampleOwner') as HTMLInputElement | null;

  step1FormData.testProject = testProject?.value.trim() || '';
  step1FormData.sampleCode = sampleCode?.value.trim() || '';
  step1FormData.tester = tester?.value.trim() || '';
  step1FormData.instrument = instrument?.value.trim() || '';
  step1FormData.testTime = testTime?.value || '';
  step1FormData.sampleOwner = sampleOwner?.value.trim() || '';

  step1FormData.dynamicFields = step1FormData.dynamicFields.map((field) => {
    const nameInput = document.getElementById(`dynamic-name-${field.id}`) as HTMLInputElement | null;
    const valueInput = document.getElementById(`dynamic-value-${field.id}`) as HTMLInputElement | null;

    return {
      ...field,
      name: nameInput?.value.trim() || '',
      value: valueInput?.value.trim() || ''
    };
  });
}

function saveStep2InputsToState() {
  step2DataItems = step2DataItems.map((row) => {
    const itemName = document.getElementById(`scalar-item-name-${row.id}`) as HTMLInputElement | null;
    const itemValue = document.getElementById(`scalar-item-value-${row.id}`) as HTMLInputElement | null;
    const itemUnit = document.getElementById(`scalar-item-unit-${row.id}`) as HTMLInputElement | null;

    return {
      ...row,
      itemName: itemName?.value.trim() || '',
      itemValue: itemValue?.value.trim() || '',
      itemUnit: itemUnit?.value.trim() || ''
    };
  });

  step2TemplateBlocks = step2TemplateBlocks.map((block) => {
    const purposeType = document.getElementById(
      `template-block-purpose-${block.id}`
    ) as HTMLSelectElement | null;
    const blockTitle = document.getElementById(
      `template-block-title-${block.id}`
    ) as HTMLInputElement | null;
    const primaryLabel = document.getElementById(
      `template-block-primary-label-${block.id}`
    ) as HTMLInputElement | null;
    const primaryUnit = document.getElementById(
      `template-block-primary-unit-${block.id}`
    ) as HTMLInputElement | null;
    const secondaryLabel = document.getElementById(
      `template-block-secondary-label-${block.id}`
    ) as HTMLInputElement | null;
    const secondaryUnit = document.getElementById(
      `template-block-secondary-unit-${block.id}`
    ) as HTMLInputElement | null;
    const dataText = document.getElementById(
      `template-block-data-${block.id}`
    ) as HTMLTextAreaElement | null;
    const note = document.getElementById(
      `template-block-note-${block.id}`
    ) as HTMLInputElement | null;

    return {
      ...block,
      purposeType: (purposeType?.value as StructuredBlockPurpose | undefined) || block.purposeType || '',
      blockTitle: blockTitle?.value || '',
      primaryLabel: primaryLabel?.value || '',
      primaryUnit: primaryUnit?.value || '',
      secondaryLabel: secondaryLabel?.value || '',
      secondaryUnit: secondaryUnit?.value || '',
      dataText: dataText?.value || '',
      note: note?.value || ''
    };
  });

  syncTemplateBlockImportInputsToState('create-step2');
}

function validateStep1() {
  if (!step1FormData.testProject) return t('step1.validation.testProjectRequired');
  if (!step1FormData.sampleCode) return t('step1.validation.sampleCodeRequired');
  if (!step1FormData.tester) return t('step1.validation.testerRequired');
  if (!step1FormData.instrument) return t('step1.validation.instrumentRequired');
  if (!step1FormData.testTime) return t('step1.validation.testTimeRequired');

  for (const field of step1FormData.dynamicFields) {
    if ((field.name && !field.value) || (!field.name && field.value)) {
      return t('step1.validation.dynamicPairRequired');
    }
  }

  return '';
}

async function validateStep1DictionaryMembership() {
  const activeDictionaryItems = await window.electronAPI.listDictionaryItems();
  dictionaryItems = activeDictionaryItems;
  dictionaryLoaded = true;
  dictionaryLoadError = '';

  const dictionaryChecks: Array<{
    dictionaryType: DictionaryType;
    value: string;
    message: string;
  }> = [
    {
      dictionaryType: 'testProject',
      value: step1FormData.testProject,
      message: t('step1.dictionaryMissing.testProject', { value: step1FormData.testProject })
    },
    {
      dictionaryType: 'tester',
      value: step1FormData.tester,
      message: t('step1.dictionaryMissing.tester', { value: step1FormData.tester })
    },
    {
      dictionaryType: 'instrument',
      value: step1FormData.instrument,
      message: t('step1.dictionaryMissing.instrument', { value: step1FormData.instrument })
    }
  ];

  for (const check of dictionaryChecks) {
    if (!check.value) {
      continue;
    }

    const hasMatch = activeDictionaryItems[check.dictionaryType].some(
      (item) => item.isActive && item.value === check.value
    );

    if (!hasMatch) {
      return check.message;
    }
  }

  return '';
}

function validateStep2() {
  const hasAnyContent = step2DataItems.some((row) => {
    return row.itemName || row.itemValue || row.itemUnit || row.sourceFileName;
  }) || step2TemplateBlocks.length > 0;

  if (!hasAnyContent) {
    return {
      error: t('step2.validation.requireContent'),
      templateBlocks: []
    };
  }

  const scalarValidationError = validateScalarItems(step2DataItems);
  if (scalarValidationError) {
    return {
      error: scalarValidationError,
      templateBlocks: []
    };
  }

  const templateBlocksResult = buildValidatedTemplateBlocks(step2TemplateBlocks);
  return {
    error: templateBlocksResult.error,
    templateBlocks: templateBlocksResult.blocks
  };
}

function goHome() {
  currentView = 'home';
  void render();
}

function resetFormState() {
  step1FormData = {
    testProject: '',
    sampleCode: '',
    tester: '',
    instrument: '',
    testTime: '',
    sampleOwner: '',
    dynamicFields: []
  };

  step2DataItems = [];
  step2TemplateBlocks = [];
  resetTemplateBlockImportState('create-step2');
}

function renderFatalError(error: unknown) {
  console.error(error);

  const root = document.getElementById('app');
  if (root) {
    root.innerHTML = `
      <div style="padding:24px;font-family:sans-serif;color:#c00;white-space:pre-wrap;">
        渲染失败：
        ${escapeHtml(getErrorMessage(error))}
      </div>
    `;
  }
}

window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  handleAsyncError(event.reason);
});

window.addEventListener('beforeunload', () => {
  if (!persistedAnalysisUiStateLoaded) {
    return;
  }

  if (persistedAnalysisUiSaveTimer) {
    window.clearTimeout(persistedAnalysisUiSaveTimer);
    persistedAnalysisUiSaveTimer = null;
  }

  const serialized =
    pendingPersistedAnalysisUiStateSerialized ||
    JSON.stringify(buildPersistedAnalysisUIStateSnapshot());

  pendingPersistedAnalysisUiStateSerialized = null;

  if (serialized !== lastPersistedAnalysisUiStateSerialized) {
    void persistAnalysisUIState(serialized);
  }
});

void render().catch((error) => {
  renderFatalError(error);
});
