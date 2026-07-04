import './index.css';
import type {
  ActiveEntryDraft,
  AnalysisStep1FieldKey,
  AppLanguage,
  AppBootstrapState,
  AppRuntimeInfo,
  AppSettings,
  CrossFilterChip,
  CrossFilterField,
  CrossFilterOperator,
  DatabaseWorkspaceState,
  DictionaryItem,
  DictionaryItemsByType,
  DictionaryType,
  DuplicateExperimentMatch,
  EntryDraftDataItem,
  EntryDraftDynamicField,
  EntryDraftTemplateBlock,
  ExperimentEditHistoryEntry,
  ExperimentDetail,
  ExperimentGroup,
  ExperimentListItem,
  FrequentDatabaseFilter,
  ImportRecognitionStatus,
  ImportManualDelimiter,
  ImportManualXAxisSourceMode,
  ImportMemory,
  ImportResolvedEncoding,
  ImportTextEncoding,
  ImportPreviewFileResult,
  ExperimentListSortOrder,
  FileIntegrityReport,
  GroupByType,
  OperationLogFilter,
  PersistedAnalysisUIState,
  PersistedAnalysisUIStateChartConfig,
  PreviewManualImportXYResult,
  RecentEntrySuggestions,
  RecentOperationLogEntry,
  ResolvedTemplateLibrary,
  RelatedExperimentRecords,
  SaveActiveEntryDraftPayload,
  RecordDatabaseWorkspaceUsagePayload,
  SaveExperimentPayload,
  SaveExperimentTemplateBlockPayload,
  ScalarItemTemplate,
  ScalarTemplateRecommendation,
  ScalarTemplateSection,
  ScalarTemplateValueType,
  ScientificTestTemplate,
  StructuredCurveTemplate,
  UpsertImportMemoryPayload,
  TemplateApplicationPreview,
  TemplateRecommendedCondition,
  TemplateRecommendedMetric,
  TemplateOverride,
  UpdateExperimentPayload
} from './electron-api';
import {
  buildDisplayName,
  escapeHtml,
  formatDateTimeForDisplay,
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
  buildTemplateMemoryCandidates,
  findExactScientificFamilyForTestProject,
  findCurveTemplatesForFamily,
  findScientificFamiliesForTestProject,
  findScalarTemplatesForFamily,
  getTemplateApplicationPreview,
  isGenericStructuredBlockName,
  rankTemplateMemoryMatches,
} from './shared/template-library-helpers';
import {
  getStructuredBlockPurposeLabel,
  STRUCTURED_BLOCK_PURPOSE_OPTIONS,
  type Step2RecommendedStructuredBlock,
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

type Step2ScalarTemplatePickerState = {
  context: ScalarItemEditContext;
  role: ScalarItemRole;
  query: string;
};

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
  importMemoryAppliedId?: string;
  appliedCurveTemplateId?: string;
  createdAt?: string;
};

type ImportReviewManualState = {
  available: boolean;
  textEncoding: ImportTextEncoding;
  resolvedEncoding: ImportResolvedEncoding;
  recognitionStatus: ImportRecognitionStatus;
  recognitionMessage: string;
  delimiter: ImportManualDelimiter;
  suggestedDelimiter: ImportManualDelimiter;
  previewRows: Array<{
    rowNumber: number;
    columns: string[];
  }>;
  maxColumnCount: number;
  dataStartRow: number;
  dataEndRow: number | null;
  dataStartColumn: number;
  dataEndColumn: number | null;
  xSourceMode: ImportManualXAxisSourceMode;
  xColumnIndex: number;
  yColumnIndex: number;
  generatedXStart: number;
  generatedXStep: number;
  ignoreEmptyRows: boolean;
  ignoreNonNumericRows: boolean;
  collapseWhitespace: boolean;
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

type SettingsSubView = 'general' | 'dictionary' | 'template-library' | 'logs' | 'about';
type OnboardingStep = 'welcome' | 'legal' | 'storage' | 'admin' | 'progress' | 'complete';

type TemplateLibraryEditableRow = {
  id: string;
  label: string;
  unit: string;
  defaultValue: string;
  note: string;
  priority: string;
};

type TemplateLibraryEditorDraft = {
  templateType: 'curve' | 'scalar' | 'scientific';
  templateId: string;
  familyId: string;
  displayName: string;
  aliasesText: string;
  enabled: boolean;
  descriptionText: string;
  scalarSection: ScalarTemplateSection;
  unitDefault: string;
  defaultValue: string;
  valueType: ScalarTemplateValueType | '';
  note: string;
  purposeType: StructuredBlockPurpose;
  blockTitleDefault: string;
  primaryLabel: string;
  primaryUnit: string;
  secondaryLabel: string;
  secondaryUnit: string;
  recommendedConditions: TemplateLibraryEditableRow[];
  recommendedMetrics: TemplateLibraryEditableRow[];
  filenameHintsText: string;
  sourceType: 'builtin' | 'user' | 'userOverride';
  isBuiltin: boolean;
  hasLocalOverride: boolean;
  importParsingTemplateId?: string;
};

type TemplateLibraryTabKind =
  | 'all'
  | 'curves'
  | 'conditions'
  | 'metrics'
  | 'calculations'
  | 'bundles';

type TemplateLibrarySearchResult =
  | {
      resultType: 'family';
      familyId: string;
      title: string;
      subtitle: string;
      count: number;
    }
  | {
      resultType: 'curve';
      familyId: string;
      templateId: string;
      title: string;
      subtitle: string;
      purposeType: StructuredBlockPurpose;
      sourceType: TemplateLibraryEditorDraft['sourceType'];
      enabled: boolean;
    }
  | {
      resultType: 'condition' | 'metric';
      familyId: string;
      templateId: string;
      title: string;
      subtitle: string;
      unitDefault: string;
      sourceType: TemplateLibraryEditorDraft['sourceType'];
      enabled: boolean;
    };

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

type ProvenanceDictionaryType = Exclude<DictionaryType, 'testProject'>;

const DICTIONARY_TYPES: DictionaryType[] = [
  'testProject',
  'tester',
  'instrument',
  'sampleCode',
  'sampleOwner'
];
const PROVENANCE_DICTIONARY_TYPES: ProvenanceDictionaryType[] = [
  'tester',
  'instrument',
  'sampleOwner',
  'sampleCode'
];
const STEP1_SUGGESTION_RESULT_LIMIT = 48;
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
function buildEmptyDictionaryItems(): DictionaryItemsByType {
  return {
    testProject: [],
    tester: [],
    instrument: [],
    sampleCode: [],
    sampleOwner: []
  };
}

function buildEmptyDictionaryInputState(): Record<DictionaryType, string> {
  return {
    testProject: '',
    tester: '',
    instrument: '',
    sampleCode: '',
    sampleOwner: ''
  };
}

function buildEmptyDictionaryErrorState(): Record<DictionaryType, string> {
  return {
    testProject: '',
    tester: '',
    instrument: '',
    sampleCode: '',
    sampleOwner: ''
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
        warnings.add(`测试条件/结果指标项“${itemName}”为数值，但未填写单位；后续分析比较可能受限。`);
      }

      if (!isScalarValueLikelyNumeric(row.itemValue) && itemUnit) {
        warnings.add(`测试条件/结果指标项“${itemName}”更像文本值，但填写了单位；后续分析会将其视为不可绘制文本。`);
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
        `测试条件/结果指标项“${itemName}”在当前记录内存在多个单位（${Array.from(units).join(' / ')}）；后续分析需谨慎。`
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

function collectStep1MissingRequiredFieldLabels() {
  const missing: string[] = [];

  if (!step1FormData.testProject) missing.push(t('step1.field.testProject'));
  if (!step1FormData.sampleCode) missing.push(t('step1.field.sampleCode'));
  if (!step1FormData.tester) missing.push(t('step1.field.tester'));
  if (!step1FormData.instrument) missing.push(t('step1.field.instrument'));
  if (!hasCompleteLocalDateTimeValue(step1FormData.testTime)) missing.push(t('step1.field.testTime'));

  return missing;
}

function collectStep1PendingDictionaryLabels() {
  if (!dictionaryLoaded) {
    return [];
  }

  const isDictionaryValueConfirmed = (dictionaryType: DictionaryType, value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) {
      return true;
    }

    return dictionaryItems[dictionaryType].some(
      (item) => item.value.trim().toLowerCase() === normalizedValue
    );
  };

  const checks: Array<{ dictionaryType: DictionaryType; value: string; label: string }> = [
    {
      dictionaryType: 'sampleCode',
      value: step1FormData.sampleCode,
      label: t('step1.field.sampleCode')
    },
    {
      dictionaryType: 'tester',
      value: step1FormData.tester,
      label: t('step1.field.tester')
    },
    {
      dictionaryType: 'instrument',
      value: step1FormData.instrument,
      label: t('step1.field.instrument')
    },
    {
      dictionaryType: 'sampleOwner',
      value: step1FormData.sampleOwner,
      label: t('step1.field.sampleOwner')
    }
  ];

  return checks
    .filter((check) => check.value && !isDictionaryValueConfirmed(check.dictionaryType, check.value))
    .map((check) => check.label);
}

function renderStep1CompletenessStrip() {
  const missingFields = collectStep1MissingRequiredFieldLabels();
  const dictionaryPending = collectStep1PendingDictionaryLabels();
  const isReady = !missingFields.length;
  const detailText = isReady
    ? t('step1.status.readyDetail')
    : t('step1.status.missingFields', {
        fields: missingFields.join(' / ')
      });
  const dictionaryText = dictionaryPending.length
    ? t('step1.status.dictionaryPending', {
        fields: dictionaryPending.join(' / ')
      })
    : '';

  return `
    <div class="step1-status-strip ${isReady ? 'step1-status-strip-ready' : 'step1-status-strip-pending'}">
      <div class="step1-status-main">
        <span id="step1-status-badge" class="step1-status-badge">${escapeHtml(
          isReady ? t('step1.status.ready') : t('step1.status.pending')
        )}</span>
        <span id="step1-status-text" class="step1-status-text">${escapeHtml(detailText)}</span>
      </div>
      ${
        dictionaryText
          ? `<div id="step1-status-secondary" class="step1-status-secondary">${escapeHtml(dictionaryText)}</div>`
          : ''
      }
    </div>
  `;
}

function renderActiveDraftStatusCard(options?: { compact?: boolean }) {
  if (!activeEntryDraft) {
    return '';
  }

  const sourceText =
    activeEntryDraft.source === 'copied-record' && activeEntryDraft.originDisplayName
      ? t('draft.statusCopiedFrom', {
          label: activeEntryDraft.originDisplayName
        })
      : t('draft.statusActive');

  return `
    <div class="name-preview-card ${options?.compact ? 'name-preview-card-compact' : ''}">
      <div class="name-preview-label">${escapeHtml(t('draft.statusTitle'))}</div>
      <div class="name-preview-value">${escapeHtml(sourceText)}</div>
      <div class="subtitle ${options?.compact ? 'subtitle-compact' : ''}">${escapeHtml(
        t('draft.statusUpdatedAt', {
          updatedAt: formatDateTimeForDisplay(activeEntryDraft.updatedAt)
        })
      )}</div>
    </div>
  `;
}

function getStep2EntryCounts() {
  const conditionCount = step2DataItems.filter(
    (row) => (row.scalarRole || 'metric') === 'condition'
  ).length;
  const metricCount = step2DataItems.filter((row) => (row.scalarRole || 'metric') === 'metric').length;
  const blockCount = step2TemplateBlocks.length;

  return { conditionCount, metricCount, blockCount };
}

function renderStep2StatusArea() {
  const counts = getStep2EntryCounts();
  const hasAnyContent = counts.conditionCount || counts.metricCount || counts.blockCount;
  const family = getActiveStep2TemplateFamily('create-step2');

  return `
    <div class="step2-status-area">
      <div class="step2-status-strip">
        <span class="step2-status-label">${escapeHtml(t('step2.status.name'))}</span>
        <span class="step2-status-value">${escapeHtml(buildDisplayName(step1FormData))}</span>
      </div>
      <div class="step2-status-strip">
        <span class="step2-status-badge ${hasAnyContent ? 'step2-status-badge-ready' : ''}">${escapeHtml(
          hasAnyContent ? t('step2.status.ready') : t('step2.status.pending')
        )}</span>
        <span class="step2-status-text">${escapeHtml(
          hasAnyContent
            ? t('step2.status.summary', counts)
            : t('step2.status.empty')
        )}</span>
      </div>
      ${
        family
          ? `
              <div class="step2-status-strip step2-status-strip-template">
                <span class="step2-status-text">${escapeHtml(
                  t('step2.status.template', {
                    family: getLocalizedTemplateFamilyLabel(family)
                  })
                )}</span>
              </div>
            `
          : ''
      }
    </div>
  `;
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
let databaseSortOrder: ExperimentListSortOrder = 'newest';
let databaseStarredOnly = false;
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
let databaseWorkspaceStateLoaded = false;
let databaseWorkspaceStateLoadPromise: Promise<void> | null = null;
let frequentDatabaseFilters: FrequentDatabaseFilter[] = [];
let starredExperimentIds: number[] = [];
let databaseFrequentFiltersOpen = false;
let databaseGroups: ExperimentGroup[] = [];
let currentDetail: ExperimentDetail | null = null;
let currentEditHistory: ExperimentEditHistoryEntry[] = [];
let currentRelatedRecords: RelatedExperimentRecords = {
  sameProject: [],
  sameSampleCode: [],
  sameTester: []
};
let currentRelatedRecordsLoading = false;

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
let provenanceSelectedType: ProvenanceDictionaryType = 'tester';
let provenanceSearchQuery = '';
let provenanceHighlightedItemId: string | null = null;
let provenanceAddExpandedType: ProvenanceDictionaryType | null = null;
let activeEntryDraft: ActiveEntryDraft | null = null;
let activeEntryDraftLoaded = false;
let activeEntryDraftLoadPromise: Promise<void> | null = null;
let recentEntrySuggestions: RecentEntrySuggestions = {
  testProjects: [],
  instruments: []
};
let recentEntrySuggestionsLoaded = false;
let recentEntrySuggestionsLoadPromise: Promise<void> | null = null;
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
let analysisHandoffRecordIds: number[] = [];
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
let step2ScalarTemplatePicker: Step2ScalarTemplatePickerState | null = null;
let templateLibraryResolved: ResolvedTemplateLibrary | null = null;
let templateLibraryLoaded = false;
let templateLibraryLoadPromise: Promise<void> | null = null;
let templateLibraryError = '';
const preservedUiScrollPositions: Record<string, { left: number; top: number }> = {};
let templateLibrarySaving = false;
let templateLibrarySaveMessage = '';
let templateLibrarySearchQuery = '';
let templateLibrarySelectedFamilyId = '';
let templateLibrarySelectedKind: TemplateLibraryTabKind = 'curves';
let templateLibrarySelectedCurveTemplateId = '';
let templateLibraryEditorDraft: TemplateLibraryEditorDraft | null = null;
let templateLibraryDirty = false;
let templateLibraryExpandedRowToken = '';
let templateLibrarySearchShouldRefocus = false;
let templateLibrarySearchSelectionStart = 0;
let templateLibrarySearchSelectionEnd = 0;
const GENERIC_PRIMARY_AXIS_LABELS = new Set(['x', '主轴', '未指定']);
const GENERIC_SECONDARY_AXIS_LABELS = new Set(['y', '信号', '未指定']);

const root = document.getElementById('app');

function getCurrentLanguage(): AppLanguage {
  return appSettings.appLanguage;
}

function t(key: Parameters<typeof translate>[1], variables?: Record<string, string | number>) {
  return translate(getCurrentLanguage(), key, variables);
}

function normalizeTemplateKeywordList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function buildTemplateLibraryEditableRow(
  item?: Partial<TemplateRecommendedCondition | TemplateRecommendedMetric>
): TemplateLibraryEditableRow {
  return {
    id: item?.id || generateId(),
    label: item?.label || '',
    unit: item?.unit || '',
    defaultValue: item?.defaultValue || '',
    note: item?.note || '',
    priority: item?.priority === undefined ? '' : String(item.priority)
  };
}

function buildTemplateLibraryRows(
  items: Array<TemplateRecommendedCondition | TemplateRecommendedMetric>
) {
  return items.map((item) => buildTemplateLibraryEditableRow(item));
}

function convertTemplateLibraryRowsToRecommendationItems(rows: TemplateLibraryEditableRow[]) {
  return rows
    .map((row, index) => {
      const label = row.label.trim();
      if (!label) {
        return null;
      }

      const priorityNumber = Number(row.priority);

      return {
        id: row.id.trim() || `item-${index + 1}`,
        label,
        unit: row.unit.trim() || undefined,
        defaultValue: row.defaultValue.trim() || undefined,
        note: row.note.trim() || undefined,
        priority: Number.isFinite(priorityNumber) ? priorityNumber : undefined
      };
    })
    .filter((item) => Boolean(item)) as TemplateRecommendedCondition[];
}

function getTemplateLibraryDisabledIdsSet() {
  return new Set(templateLibraryResolved?.state.disabledTemplateIds || []);
}

function hasTemplateLibraryOverride(templateId: string, targetType: 'curve' | 'scalar' | 'scientific') {
  return Boolean(
    templateLibraryResolved?.state.userOverrides.some(
      (override) => override.targetType === targetType && override.targetId === templateId
    )
  );
}

function getTemplateLibraryEffectiveSourceType(
  template:
    | Pick<StructuredCurveTemplate, 'id' | 'sourceType'>
    | Pick<ScalarItemTemplate, 'id' | 'sourceType'>
    | Pick<ScientificTestTemplate, 'id' | 'sourceType'>,
  targetType: 'curve' | 'scalar' | 'scientific'
) {
  if (template.sourceType === 'user') {
    return 'user' as const;
  }

  return hasTemplateLibraryOverride(template.id, targetType) ? ('userOverride' as const) : ('builtin' as const);
}

function isTemplateLibraryTemplateEnabled(
  template: Pick<StructuredCurveTemplate, 'id' | 'enabled'> | Pick<ScalarItemTemplate, 'id' | 'enabled'>
) {
  return template.enabled && !getTemplateLibraryDisabledIdsSet().has(template.id);
}

function buildTemplateLibraryEditorDraft(template: StructuredCurveTemplate): TemplateLibraryEditorDraft {
  const sourceType = getTemplateLibraryEffectiveSourceType(template, 'curve');

  return {
    templateType: 'curve',
    templateId: template.id,
    familyId: template.familyId,
    displayName: template.displayName,
    aliasesText: template.aliases.map((alias) => alias.value).join('\n'),
    enabled: isTemplateLibraryTemplateEnabled(template),
    descriptionText: '',
    scalarSection: 'condition',
    unitDefault: '',
    defaultValue: '',
    valueType: '',
    note: '',
    purposeType: template.purposeType,
    blockTitleDefault: template.blockTitleDefault,
    primaryLabel: template.axisDefaults.primaryLabel,
    primaryUnit: template.axisDefaults.primaryUnit,
    secondaryLabel: template.axisDefaults.secondaryLabel,
    secondaryUnit: template.axisDefaults.secondaryUnit,
    recommendedConditions: buildTemplateLibraryRows(template.recommendedConditions),
    recommendedMetrics: buildTemplateLibraryRows(template.recommendedMetrics),
    filenameHintsText: (template.filenameHints || []).join('\n'),
    sourceType,
    isBuiltin: template.sourceType === 'builtin',
    hasLocalOverride: sourceType === 'userOverride',
    importParsingTemplateId: template.importParsingTemplateId
  };
}

function buildScalarTemplateLibraryEditorDraft(template: ScalarItemTemplate): TemplateLibraryEditorDraft {
  const sourceType = getTemplateLibraryEffectiveSourceType(template, 'scalar');

  return {
    templateType: 'scalar',
    templateId: template.id,
    familyId: template.familyId,
    displayName: template.displayName,
    aliasesText: template.aliases.map((alias) => alias.value).join('\n'),
    enabled: isTemplateLibraryTemplateEnabled(template),
    descriptionText: '',
    scalarSection: template.section,
    unitDefault: template.unitDefault || '',
    defaultValue: template.defaultValue || '',
    valueType: template.valueType || '',
    note: template.note || '',
    purposeType: '',
    blockTitleDefault: '',
    primaryLabel: '',
    primaryUnit: '',
    secondaryLabel: '',
    secondaryUnit: '',
    recommendedConditions: [],
    recommendedMetrics: [],
    filenameHintsText: '',
    sourceType,
    isBuiltin: template.sourceType === 'builtin',
    hasLocalOverride: sourceType === 'userOverride'
  };
}

function buildScientificTemplateLibraryEditorDraft(
  template: ScientificTestTemplate
): TemplateLibraryEditorDraft {
  const sourceType = getTemplateLibraryEffectiveSourceType(template, 'scientific');

  return {
    templateType: 'scientific',
    templateId: template.id,
    familyId: template.id,
    displayName: template.displayName,
    aliasesText: template.aliases.map((alias) => alias.value).join('\n'),
    enabled: isTemplateLibraryTemplateEnabled(template),
    descriptionText: template.description || '',
    scalarSection: 'condition',
    unitDefault: '',
    defaultValue: '',
    valueType: '',
    note: '',
    purposeType: '',
    blockTitleDefault: '',
    primaryLabel: '',
    primaryUnit: '',
    secondaryLabel: '',
    secondaryUnit: '',
    recommendedConditions: [],
    recommendedMetrics: [],
    filenameHintsText: '',
    sourceType,
    isBuiltin: template.sourceType === 'builtin',
    hasLocalOverride: sourceType === 'userOverride'
  };
}

function createUserCurveTemplateId() {
  return `user:curve:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9:-]+/g, '-');
}

function createUserScalarTemplateId(section: ScalarTemplateSection) {
  return `user:scalar:${section}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9:-]+/g, '-');
}

function createUserScientificFamilyId() {
  return `user:family:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9:-]+/g, '-');
}

function buildEmptyCurveTemplateLibraryDraft(familyId: string): TemplateLibraryEditorDraft {
  return {
    templateType: 'curve',
    templateId: createUserCurveTemplateId(),
    familyId,
    displayName: '',
    aliasesText: '',
    enabled: true,
    descriptionText: '',
    scalarSection: 'condition',
    unitDefault: '',
    defaultValue: '',
    valueType: '',
    note: '',
    purposeType: '',
    blockTitleDefault: '',
    primaryLabel: '',
    primaryUnit: '',
    secondaryLabel: '',
    secondaryUnit: '',
    recommendedConditions: [],
    recommendedMetrics: [],
    filenameHintsText: '',
    sourceType: 'user',
    isBuiltin: false,
    hasLocalOverride: false
  };
}

function buildEmptyScalarTemplateLibraryDraft(
  familyId: string,
  section: ScalarTemplateSection
): TemplateLibraryEditorDraft {
  return {
    templateType: 'scalar',
    templateId: createUserScalarTemplateId(section),
    familyId,
    displayName: '',
    aliasesText: '',
    enabled: true,
    descriptionText: '',
    scalarSection: section,
    unitDefault: '',
    defaultValue: '',
    valueType: '',
    note: '',
    purposeType: '',
    blockTitleDefault: '',
    primaryLabel: '',
    primaryUnit: '',
    secondaryLabel: '',
    secondaryUnit: '',
    recommendedConditions: [],
    recommendedMetrics: [],
    filenameHintsText: '',
    sourceType: 'user',
    isBuiltin: false,
    hasLocalOverride: false
  };
}

function buildEmptyScientificTemplateLibraryDraft(): TemplateLibraryEditorDraft {
  return {
    templateType: 'scientific',
    templateId: createUserScientificFamilyId(),
    familyId: '',
    displayName: t('templateLibrary.newFamilyDefaultName'),
    aliasesText: '',
    enabled: true,
    descriptionText: '',
    scalarSection: 'condition',
    unitDefault: '',
    defaultValue: '',
    valueType: '',
    note: '',
    purposeType: '',
    blockTitleDefault: '',
    primaryLabel: '',
    primaryUnit: '',
    secondaryLabel: '',
    secondaryUnit: '',
    recommendedConditions: [],
    recommendedMetrics: [],
    filenameHintsText: '',
    sourceType: 'user',
    isBuiltin: false,
    hasLocalOverride: false
  };
}

function getTemplateLibrarySectionLabel(section: ScalarTemplateSection | '') {
  if (section === 'metric') {
    return t('templateLibrary.resultType.metric');
  }
  return t('templateLibrary.resultType.condition');
}

function getTemplateLibraryStatusLabel(enabled: boolean) {
  return enabled ? t('templateLibrary.enabled') : t('templateLibrary.disabled');
}

function getTemplateLibraryStatusChipClass(enabled: boolean) {
  return `template-library-chip ${
    enabled ? 'template-library-chip-status-enabled' : 'template-library-chip-status-disabled'
  }`;
}

function getTemplateLibraryKindLabel(kind: TemplateLibraryTabKind) {
  switch (kind) {
    case 'all':
      return t('templateLibrary.kind.all');
    case 'conditions':
      return t('templateLibrary.kind.conditions');
    case 'metrics':
      return t('templateLibrary.kind.metrics');
    case 'curves':
    default:
      return t('templateLibrary.kind.curves');
  }
}

function getTemplateLibraryCreateCardLabel(kind: TemplateLibraryTabKind) {
  switch (kind) {
    case 'conditions':
      return t('templateLibrary.createCard.condition');
    case 'metrics':
      return t('templateLibrary.createCard.metric');
    case 'curves':
      return t('templateLibrary.createCard.curve');
    case 'all':
    default:
      return t('templateLibrary.createCard.chooseKind');
  }
}

function getTemplateLibraryVisibleBlockTitleOverride(draft: TemplateLibraryEditorDraft) {
  if (draft.templateType !== 'curve') {
    return '';
  }

  const normalizedDisplayName = draft.displayName.trim();
  const normalizedBlockTitle = draft.blockTitleDefault.trim();
  if (!normalizedBlockTitle || normalizedBlockTitle === normalizedDisplayName) {
    return '';
  }

  return draft.blockTitleDefault;
}

function getTemplateLibraryFamilyScalars(
  familyId: string,
  section?: ScalarTemplateSection
) {
  if (!templateLibraryResolved) {
    return [];
  }

  return findScalarTemplatesForFamily(familyId, templateLibraryResolved, {
    includeDisabled: true,
    section
  })
    .map((item) => item.scalarTemplate)
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'zh-CN'));
}

function getTemplateLibraryFamilyTemplates(
  familyId: string,
  kind: TemplateLibraryTabKind
): Array<StructuredCurveTemplate | ScalarItemTemplate> {
  if (kind === 'conditions') {
    return getTemplateLibraryFamilyScalars(familyId, 'condition');
  }

  if (kind === 'metrics') {
    return getTemplateLibraryFamilyScalars(familyId, 'metric');
  }

  const curves = getTemplateLibraryAllCurvesForFamily(familyId);
  const conditions = getTemplateLibraryFamilyScalars(familyId, 'condition');
  const metrics = getTemplateLibraryFamilyScalars(familyId, 'metric');

  if (kind === 'all') {
    return [...curves, ...conditions, ...metrics].sort((left, right) =>
      left.displayName.localeCompare(right.displayName, 'zh-CN')
    );
  }

  return curves;
}

function getTemplateLibraryFamilyTemplateCount(
  familyId: string,
  kind: TemplateLibraryTabKind = templateLibrarySelectedKind
) {
  return getTemplateLibraryFamilyTemplates(familyId, kind).length;
}

function getTemplateLibraryUserFamilyDeleteStats(familyId: string) {
  const userTemplates = templateLibraryResolved?.state.userTemplates;
  if (!userTemplates) {
    return {
      conditions: 0,
      metrics: 0,
      curves: 0
    };
  }

  return {
    conditions: userTemplates.scalarTemplates.filter(
      (template) => template.familyId === familyId && template.section === 'condition'
    ).length,
    metrics: userTemplates.scalarTemplates.filter(
      (template) => template.familyId === familyId && template.section === 'metric'
    ).length,
    curves: userTemplates.curveTemplates.filter((template) => template.familyId === familyId).length
  };
}

function isPersistedScientificFamily(templateId: string) {
  return Boolean(templateLibraryResolved?.scientificTemplates.some((family) => family.id === templateId));
}

function updateTemplateLibrarySaveStateIndicator() {
  const element = document.getElementById('template-library-save-state');
  if (!element) {
    return;
  }

  element.textContent = templateLibrarySaveMessage;
  element.classList.toggle('template-library-save-state-unsaved', templateLibraryDirty);
  element.classList.toggle(
    'template-library-save-state-saved',
    !templateLibraryDirty && Boolean(templateLibrarySaveMessage)
  );
}

function markTemplateLibraryDirty() {
  templateLibraryDirty = true;
  templateLibrarySaveMessage = t('templateLibrary.unsaved');
  updateTemplateLibrarySaveStateIndicator();
}

function clearTemplateLibraryDirtyState(message = '') {
  templateLibraryDirty = false;
  templateLibrarySaveMessage = message;
  updateTemplateLibrarySaveStateIndicator();
}

function confirmDiscardTemplateLibraryChanges() {
  if (!templateLibraryDirty) {
    return true;
  }

  return window.confirm(t('templateLibrary.confirmDiscardChanges'));
}

function getTemplateLibraryNormalizedQuery() {
  return templateLibrarySearchQuery.trim().toLowerCase();
}

function getTemplateLibraryFamilyById(familyId: string) {
  return templateLibraryResolved?.scientificTemplates.find((family) => family.id === familyId) || null;
}

function getTemplateLibraryAllCurvesForFamily(familyId: string) {
  if (!templateLibraryResolved) {
    return [];
  }

  return templateLibraryResolved.curveTemplates
    .filter((template) => template.familyId === familyId)
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'zh-CN'));
}

function templateLibraryTemplateMatchesQuery(template: StructuredCurveTemplate | ScalarItemTemplate, query: string) {
  if (!query) {
    return true;
  }

  const family = getTemplateLibraryFamilyById(template.familyId);
  if ('purposeType' in template) {
    return [
      family?.displayName || '',
      family?.id || '',
      ...(family?.aliases.map((alias) => alias.value) || []),
      template.displayName,
      template.blockTitleDefault,
      template.id,
      template.purposeType,
      ...template.aliases.map((alias) => alias.value)
    ]
      .join('\n')
      .toLowerCase()
      .includes(query);
  }

  return [
    family?.displayName || '',
    family?.id || '',
    ...(family?.aliases.map((alias) => alias.value) || []),
    template.displayName,
    template.id,
    template.unitDefault || '',
    getTemplateLibrarySectionLabel(template.section),
    ...template.aliases.map((alias) => alias.value)
  ]
    .join('\n')
    .toLowerCase()
    .includes(query);
}

function getTemplateLibrarySearchResults(): TemplateLibrarySearchResult[] {
  if (!templateLibraryResolved) {
    return [];
  }

  const query = getTemplateLibraryNormalizedQuery();
  if (!query) {
    return [];
  }

  const familyResults: TemplateLibrarySearchResult[] = templateLibraryResolved.scientificTemplates
    .filter((family) => {
      const haystack = [family.displayName, family.id, ...family.aliases.map((alias) => alias.value)]
        .join('\n')
        .toLowerCase();
      return haystack.includes(query);
    })
    .map((family) => ({
      resultType: 'family' as const,
      familyId: family.id,
      title: family.displayName,
      subtitle: t('templateLibrary.resultType.family'),
      count: getTemplateLibraryFamilyTemplateCount(family.id, 'all')
    }))
    .sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'));

  const curveResults: TemplateLibrarySearchResult[] = templateLibraryResolved.curveTemplates
    .filter((template) => {
      const family = getTemplateLibraryFamilyById(template.familyId);
      const haystack = [
        family?.displayName || '',
        family?.id || '',
        ...(family?.aliases.map((alias) => alias.value) || []),
        template.displayName,
        template.blockTitleDefault,
        template.id,
        template.purposeType,
        ...template.aliases.map((alias) => alias.value)
      ]
        .join('\n')
        .toLowerCase();
      return haystack.includes(query);
    })
    .map((template) => {
      const family = getTemplateLibraryFamilyById(template.familyId);
      return {
        resultType: 'curve' as const,
        familyId: template.familyId,
        templateId: template.id,
        title: template.displayName,
        subtitle: family?.displayName || '',
        purposeType: template.purposeType,
        sourceType: getTemplateLibraryEffectiveSourceType(template, 'curve'),
        enabled: isTemplateLibraryTemplateEnabled(template)
      };
    })
    .sort((left, right) => {
      const familyCompare = left.subtitle.localeCompare(right.subtitle, 'zh-CN');
      if (familyCompare !== 0) {
        return familyCompare;
      }
      return left.title.localeCompare(right.title, 'zh-CN');
    });

  const scalarResults: TemplateLibrarySearchResult[] = templateLibraryResolved.scalarTemplates
    .filter((template) => {
      const family = getTemplateLibraryFamilyById(template.familyId);
      const sectionLabel = getTemplateLibrarySectionLabel(template.section);
      const haystack = [
        family?.displayName || '',
        family?.id || '',
        ...(family?.aliases.map((alias) => alias.value) || []),
        template.displayName,
        template.id,
        template.unitDefault || '',
        sectionLabel,
        ...template.aliases.map((alias) => alias.value)
      ]
        .join('\n')
        .toLowerCase();
      return haystack.includes(query);
    })
    .map((template) => {
      const family = getTemplateLibraryFamilyById(template.familyId);
      return {
        resultType: template.section === 'metric' ? ('metric' as const) : ('condition' as const),
        familyId: template.familyId,
        templateId: template.id,
        title: template.displayName,
        subtitle: family?.displayName || '',
        unitDefault: template.unitDefault || '',
        sourceType: getTemplateLibraryEffectiveSourceType(template, 'scalar'),
        enabled: isTemplateLibraryTemplateEnabled(template)
      };
    })
    .sort((left, right) => {
      const familyCompare = left.subtitle.localeCompare(right.subtitle, 'zh-CN');
      if (familyCompare !== 0) {
        return familyCompare;
      }
      return left.title.localeCompare(right.title, 'zh-CN');
    });

  return [...familyResults, ...curveResults, ...scalarResults];
}

function getTemplateLibraryTemplateById(templateId: string) {
  if (!templateLibraryResolved) {
    return null;
  }

  return (
    templateLibraryResolved.curveTemplates.find((template) => template.id === templateId) ||
    templateLibraryResolved.scalarTemplates.find((template) => template.id === templateId) ||
    null
  );
}

function buildTemplateLibraryEditorDraftForCurrentSelection() {
  if (
    templateLibraryResolved &&
    templateLibrarySelectedFamilyId &&
    !templateLibrarySelectedCurveTemplateId
  ) {
    const selectedFamily = templateLibraryResolved.scientificTemplates.find(
      (family) => family.id === templateLibrarySelectedFamilyId
    );
    if (selectedFamily) {
      return buildScientificTemplateLibraryEditorDraft(selectedFamily);
    }
  }

  const selectedTemplate = getTemplateLibraryTemplateById(templateLibrarySelectedCurveTemplateId);
  if (selectedTemplate) {
    return 'purposeType' in selectedTemplate
      ? buildTemplateLibraryEditorDraft(selectedTemplate)
      : buildScalarTemplateLibraryEditorDraft(selectedTemplate);
  }

  return null;
}

function syncTemplateLibrarySelection() {
  if (!templateLibraryResolved) {
    templateLibrarySelectedFamilyId = '';
    templateLibrarySelectedCurveTemplateId = '';
    templateLibraryEditorDraft = null;
    templateLibraryDirty = false;
    templateLibrarySaveMessage = '';
    templateLibraryExpandedRowToken = '';
    return;
  }

  const families = templateLibraryResolved.scientificTemplates;
  if (!families.length) {
    templateLibrarySelectedFamilyId = '';
    templateLibrarySelectedCurveTemplateId = '';
    templateLibraryEditorDraft = null;
    templateLibraryDirty = false;
    templateLibrarySaveMessage = '';
    templateLibraryExpandedRowToken = '';
    return;
  }

  const familyExists = families.some((family) => family.id === templateLibrarySelectedFamilyId);
  if (!familyExists) {
    templateLibrarySelectedFamilyId = families[0].id;
  }

  const familyTemplates = getTemplateLibraryFamilyTemplates(
    templateLibrarySelectedFamilyId,
    templateLibrarySelectedKind
  );
  const shouldPreserveFamilyEditor =
    !templateLibrarySelectedCurveTemplateId &&
    templateLibraryEditorDraft?.templateType === 'scientific';
  const templateExists = familyTemplates.some((template) => template.id === templateLibrarySelectedCurveTemplateId);
  if (!templateExists && !shouldPreserveFamilyEditor) {
    templateLibrarySelectedCurveTemplateId = familyTemplates[0]?.id || '';
  }

  templateLibraryEditorDraft = buildTemplateLibraryEditorDraftForCurrentSelection();
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState('');
}

async function reloadTemplateLibraryResolved(options?: {
  preserveSelection?: boolean;
  nextFamilyId?: string;
  nextTemplateId?: string;
}) {
  templateLibraryResolved = await window.electronAPI.getResolvedTemplateLibrary();
  templateLibraryLoaded = true;
  templateLibraryError = '';

  if (options?.nextFamilyId) {
    templateLibrarySelectedFamilyId = options.nextFamilyId;
  }

  if (options?.nextTemplateId) {
    templateLibrarySelectedCurveTemplateId = options.nextTemplateId;
  }

  syncTemplateLibrarySelection();
}

async function ensureTemplateLibraryLoaded() {
  if (templateLibraryLoaded) {
    return;
  }

  if (!templateLibraryLoadPromise) {
    templateLibraryLoadPromise = (async () => {
      try {
        await reloadTemplateLibraryResolved();
      } catch (error) {
        templateLibraryError = getErrorMessage(error) || t('templateLibrary.loadFailed');
      } finally {
        templateLibraryLoadPromise = null;
      }
    })();
  }

  await templateLibraryLoadPromise;
}

async function selectTemplateLibraryFamily(nextFamilyId: string) {
  if (!templateLibraryResolved) {
    return;
  }

  if (templateLibrarySelectedFamilyId === nextFamilyId) {
    if (getTemplateLibraryNormalizedQuery()) {
      templateLibrarySearchQuery = '';
      requestRender(true);
    }
    return;
  }

  if (!confirmDiscardTemplateLibraryChanges()) {
    return;
  }

  templateLibrarySelectedFamilyId = nextFamilyId;
  if (getTemplateLibraryNormalizedQuery()) {
    templateLibrarySearchQuery = '';
  }
  templateLibrarySelectedCurveTemplateId = '';
  const nextFamily = templateLibraryResolved.scientificTemplates.find((family) => family.id === nextFamilyId);
  templateLibraryEditorDraft = nextFamily ? buildScientificTemplateLibraryEditorDraft(nextFamily) : null;
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState('');
  requestRender(true);
}

async function selectTemplateLibraryCurveTemplate(nextTemplateId: string) {
  if (!templateLibraryResolved) {
    return;
  }

  if (templateLibrarySelectedCurveTemplateId === nextTemplateId) {
    if (getTemplateLibraryNormalizedQuery()) {
      templateLibrarySearchQuery = '';
      requestRender(true);
    }
    return;
  }

  if (!confirmDiscardTemplateLibraryChanges()) {
    return;
  }

  const nextTemplate = templateLibraryResolved.curveTemplates.find((item) => item.id === nextTemplateId);
  if (!nextTemplate) {
    return;
  }

  templateLibrarySelectedFamilyId = nextTemplate.familyId;
  templateLibrarySelectedKind = 'curves';
  if (getTemplateLibraryNormalizedQuery()) {
    templateLibrarySearchQuery = '';
  }
  templateLibrarySelectedCurveTemplateId = nextTemplate.id;
  templateLibraryEditorDraft = buildTemplateLibraryEditorDraft(nextTemplate);
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState('');
  requestRender(true);
}

async function selectTemplateLibraryScalarTemplate(nextTemplateId: string) {
  if (!templateLibraryResolved) {
    return;
  }

  if (templateLibrarySelectedCurveTemplateId === nextTemplateId) {
    if (getTemplateLibraryNormalizedQuery()) {
      templateLibrarySearchQuery = '';
      requestRender(true);
    }
    return;
  }

  if (!confirmDiscardTemplateLibraryChanges()) {
    return;
  }

  const nextTemplate = templateLibraryResolved.scalarTemplates.find((item) => item.id === nextTemplateId);
  if (!nextTemplate) {
    return;
  }

  templateLibrarySelectedFamilyId = nextTemplate.familyId;
  templateLibrarySelectedKind = nextTemplate.section === 'metric' ? 'metrics' : 'conditions';
  if (getTemplateLibraryNormalizedQuery()) {
    templateLibrarySearchQuery = '';
  }
  templateLibrarySelectedCurveTemplateId = nextTemplate.id;
  templateLibraryEditorDraft = buildScalarTemplateLibraryEditorDraft(nextTemplate);
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState('');
  requestRender(true);
}

async function selectTemplateLibraryKind(nextKind: TemplateLibraryTabKind) {
  if (templateLibrarySelectedKind === nextKind) {
    return;
  }

  if (!confirmDiscardTemplateLibraryChanges()) {
    return;
  }

  templateLibrarySelectedKind = nextKind;
  if (templateLibrarySelectedCurveTemplateId) {
    const nextTemplate = getTemplateLibraryFamilyTemplates(templateLibrarySelectedFamilyId, nextKind)[0];
    templateLibrarySelectedCurveTemplateId = nextTemplate?.id || '';
    templateLibraryEditorDraft = nextTemplate
      ? 'purposeType' in nextTemplate
        ? buildTemplateLibraryEditorDraft(nextTemplate)
        : buildScalarTemplateLibraryEditorDraft(nextTemplate)
      : buildTemplateLibraryEditorDraftForCurrentSelection();
  } else {
    templateLibraryEditorDraft = buildTemplateLibraryEditorDraftForCurrentSelection();
  }
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState('');
  requestRender(true);
}

function startTemplateLibraryNewFamily() {
  if (!confirmDiscardTemplateLibraryChanges()) {
    return;
  }

  templateLibrarySelectedCurveTemplateId = '';
  templateLibraryEditorDraft = buildEmptyScientificTemplateLibraryDraft();
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState(t('templateLibrary.newFamilyReady'));
  requestRender(true);
}

function startTemplateLibraryNewTemplate() {
  if (!templateLibrarySelectedFamilyId) {
    return;
  }

  if (!confirmDiscardTemplateLibraryChanges()) {
    return;
  }

  if (templateLibrarySelectedKind === 'all') {
    alert(t('templateLibrary.chooseSpecificKindBeforeCreate'));
    return;
  }

  templateLibrarySelectedCurveTemplateId = '';
  templateLibraryEditorDraft =
    templateLibrarySelectedKind === 'conditions'
      ? buildEmptyScalarTemplateLibraryDraft(templateLibrarySelectedFamilyId, 'condition')
      : templateLibrarySelectedKind === 'metrics'
        ? buildEmptyScalarTemplateLibraryDraft(templateLibrarySelectedFamilyId, 'metric')
        : buildEmptyCurveTemplateLibraryDraft(templateLibrarySelectedFamilyId);
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState(t('templateLibrary.newTemplateReady'));
  requestRender(true);
}

function startTemplateLibraryDuplicateTemplate() {
  if (!templateLibraryEditorDraft) {
    return;
  }

  if (!confirmDiscardTemplateLibraryChanges()) {
    return;
  }

  templateLibrarySelectedCurveTemplateId = '';
  templateLibraryEditorDraft =
    templateLibraryEditorDraft.templateType === 'scientific'
      ? {
          ...templateLibraryEditorDraft,
          templateId: createUserScientificFamilyId(),
          familyId: '',
          displayName: templateLibraryEditorDraft.displayName
            ? `${templateLibraryEditorDraft.displayName} ${t('templateLibrary.copySuffix')}`
            : t('templateLibrary.newFamilyDefaultName'),
          aliasesText: templateLibraryEditorDraft.aliasesText,
          enabled: templateLibraryEditorDraft.enabled,
          descriptionText: templateLibraryEditorDraft.descriptionText,
          sourceType: 'user',
          isBuiltin: false,
          hasLocalOverride: false
        }
      : templateLibraryEditorDraft.templateType === 'scalar'
      ? {
          ...templateLibraryEditorDraft,
          templateId: createUserScalarTemplateId(templateLibraryEditorDraft.scalarSection),
          familyId: templateLibraryEditorDraft.familyId,
          displayName: templateLibraryEditorDraft.displayName
            ? `${templateLibraryEditorDraft.displayName} ${t('templateLibrary.copySuffix')}`
            : '',
          aliasesText: templateLibraryEditorDraft.aliasesText,
          enabled: templateLibraryEditorDraft.enabled,
          unitDefault: templateLibraryEditorDraft.unitDefault,
          defaultValue: templateLibraryEditorDraft.defaultValue,
          valueType: templateLibraryEditorDraft.valueType,
          note: templateLibraryEditorDraft.note,
          sourceType: 'user',
          isBuiltin: false,
          hasLocalOverride: false
        }
      : {
          ...templateLibraryEditorDraft,
          templateId: createUserCurveTemplateId(),
          familyId: templateLibraryEditorDraft.familyId,
          displayName: templateLibraryEditorDraft.displayName
            ? `${templateLibraryEditorDraft.displayName} ${t('templateLibrary.copySuffix')}`
            : '',
          aliasesText: templateLibraryEditorDraft.aliasesText,
          enabled: templateLibraryEditorDraft.enabled,
          purposeType: templateLibraryEditorDraft.purposeType,
          blockTitleDefault: templateLibraryEditorDraft.blockTitleDefault,
          primaryLabel: templateLibraryEditorDraft.primaryLabel,
          primaryUnit: templateLibraryEditorDraft.primaryUnit,
          secondaryLabel: templateLibraryEditorDraft.secondaryLabel,
          secondaryUnit: templateLibraryEditorDraft.secondaryUnit,
          recommendedConditions: templateLibraryEditorDraft.recommendedConditions.map((item) => ({ ...item })),
          recommendedMetrics: templateLibraryEditorDraft.recommendedMetrics.map((item) => ({ ...item })),
          filenameHintsText: templateLibraryEditorDraft.filenameHintsText,
          importParsingTemplateId: templateLibraryEditorDraft.importParsingTemplateId,
          sourceType: 'user',
          isBuiltin: false,
          hasLocalOverride: false
        };
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState(t('templateLibrary.duplicateReady'));
  requestRender(true);
}

function discardTemplateLibraryDraft() {
  const isScientificPersistedSelection =
    templateLibraryEditorDraft?.templateType === 'scientific' &&
    isPersistedScientificFamily(templateLibraryEditorDraft.templateId);
  if (templateLibrarySelectedCurveTemplateId || isScientificPersistedSelection) {
    return;
  }

  if (!window.confirm(t('templateLibrary.discardDraftConfirm'))) {
    return;
  }

  const nextTemplate = getTemplateLibraryFamilyTemplates(
    templateLibrarySelectedFamilyId,
    templateLibrarySelectedKind
  )[0];
  templateLibrarySelectedCurveTemplateId = '';
  if (nextTemplate) {
    templateLibrarySelectedCurveTemplateId = nextTemplate.id;
    templateLibraryEditorDraft =
      'purposeType' in nextTemplate
        ? buildTemplateLibraryEditorDraft(nextTemplate)
        : buildScalarTemplateLibraryEditorDraft(nextTemplate);
  } else {
    templateLibraryEditorDraft = buildTemplateLibraryEditorDraftForCurrentSelection();
  }
  templateLibraryExpandedRowToken = '';
  clearTemplateLibraryDirtyState('');
  requestRender(true);
}

async function saveTemplateLibraryEditorDraft() {
  if (!templateLibraryEditorDraft || templateLibrarySaving) {
    return;
  }

  const draft = templateLibraryEditorDraft;
  const trimmedDisplayName = draft.displayName.trim();

  if (!trimmedDisplayName) {
    alert(t('templateLibrary.validation.displayNameRequired'));
    return;
  }

  templateLibrarySaving = true;
  templateLibrarySaveMessage = t('templateLibrary.saving');
  updateTemplateLibrarySaveStateIndicator();

  try {
    const aliases = normalizeTemplateKeywordList(draft.aliasesText).map((value) => ({
      value,
      kind: 'search' as const
    }));
    if (draft.templateType === 'scientific') {
      if (draft.isBuiltin) {
        const overridePayload: TemplateOverride = {
          targetId: draft.templateId,
          targetType: 'scientific',
          patch: {
            displayName: trimmedDisplayName,
            aliases,
            enabled: draft.enabled,
            description: draft.descriptionText.trim()
          },
          updatedAt: new Date().toISOString()
        };

        const [overrideResult, enabledResult] = await Promise.all([
          window.electronAPI.upsertTemplateLibraryOverride(overridePayload),
          window.electronAPI.setTemplateEnabled({
            templateId: draft.templateId,
            enabled: draft.enabled
          })
        ]);

        if (!overrideResult.success || !enabledResult.success) {
          throw new Error(overrideResult.error || enabledResult.error || t('templateLibrary.saveFailed'));
        }
      } else {
        const saveResult = await window.electronAPI.upsertUserTemplate({
          templateType: 'scientific',
          template: {
            id: draft.templateId,
            version: 1,
            displayName: trimmedDisplayName,
            aliases,
            enabled: draft.enabled,
            description: draft.descriptionText.trim() || undefined,
            sourceType: 'user'
          }
        });

        if (!saveResult.success) {
          throw new Error(saveResult.error || t('templateLibrary.saveFailed'));
        }

        const enabledResult = await window.electronAPI.setTemplateEnabled({
          templateId: draft.templateId,
          enabled: draft.enabled
        });

        if (!enabledResult.success) {
          throw new Error(enabledResult.error || t('templateLibrary.saveFailed'));
        }
      }
    } else if (draft.templateType === 'scalar') {
      if (draft.isBuiltin) {
        const overridePayload: TemplateOverride = {
          targetId: draft.templateId,
          targetType: 'scalar',
          patch: {
            displayName: trimmedDisplayName,
            aliases,
            enabled: draft.enabled,
            section: draft.scalarSection,
            unitDefault: draft.unitDefault.trim(),
            defaultValue: draft.defaultValue.trim(),
            valueType: draft.valueType || null,
            note: draft.note.trim()
          },
          updatedAt: new Date().toISOString()
        };

        const [overrideResult, enabledResult] = await Promise.all([
          window.electronAPI.upsertTemplateLibraryOverride(overridePayload),
          window.electronAPI.setTemplateEnabled({
            templateId: draft.templateId,
            enabled: draft.enabled
          })
        ]);

        if (!overrideResult.success || !enabledResult.success) {
          throw new Error(overrideResult.error || enabledResult.error || t('templateLibrary.saveFailed'));
        }
      } else {
        const saveResult = await window.electronAPI.upsertUserTemplate({
          templateType: 'scalar',
          template: {
            id: draft.templateId,
            version: 1,
            familyId: draft.familyId,
            section: draft.scalarSection,
            displayName: trimmedDisplayName,
            aliases,
            unitDefault: draft.unitDefault.trim() || undefined,
            defaultValue: draft.defaultValue.trim() || undefined,
            valueType: draft.valueType || undefined,
            note: draft.note.trim() || undefined,
            enabled: draft.enabled,
            sourceType: 'user'
          }
        });

        if (!saveResult.success) {
          throw new Error(saveResult.error || t('templateLibrary.saveFailed'));
        }

        const enabledResult = await window.electronAPI.setTemplateEnabled({
          templateId: draft.templateId,
          enabled: draft.enabled
        });

        if (!enabledResult.success) {
          throw new Error(enabledResult.error || t('templateLibrary.saveFailed'));
        }
      }
    } else if (draft.isBuiltin) {
      const trimmedBlockTitle = draft.blockTitleDefault.trim() || trimmedDisplayName;
      const filenameHints = normalizeTemplateKeywordList(draft.filenameHintsText);
      const recommendedConditions = convertTemplateLibraryRowsToRecommendationItems(
        draft.recommendedConditions
      );
      const recommendedMetrics = convertTemplateLibraryRowsToRecommendationItems(
        draft.recommendedMetrics
      );
      const overridePayload: TemplateOverride = {
        targetId: draft.templateId,
        targetType: 'curve',
        patch: {
          displayName: trimmedDisplayName,
          aliases,
          enabled: draft.enabled,
          purposeType: draft.purposeType,
          blockTitleDefault: trimmedBlockTitle,
          axisDefaults: {
            primaryLabel: draft.primaryLabel.trim(),
            primaryUnit: draft.primaryUnit.trim(),
            secondaryLabel: draft.secondaryLabel.trim(),
            secondaryUnit: draft.secondaryUnit.trim()
          },
          recommendedConditions,
          recommendedMetrics,
          filenameHints
        },
        updatedAt: new Date().toISOString()
      };

      const [overrideResult, enabledResult] = await Promise.all([
        window.electronAPI.upsertTemplateLibraryOverride(overridePayload),
        window.electronAPI.setTemplateEnabled({
          templateId: draft.templateId,
          enabled: draft.enabled
        })
      ]);

      if (!overrideResult.success || !enabledResult.success) {
        throw new Error(
          overrideResult.error ||
            enabledResult.error ||
            t('templateLibrary.saveFailed')
        );
      }
    } else {
      const trimmedBlockTitle = draft.blockTitleDefault.trim() || trimmedDisplayName;
      const filenameHints = normalizeTemplateKeywordList(draft.filenameHintsText);
      const recommendedConditions = convertTemplateLibraryRowsToRecommendationItems(
        draft.recommendedConditions
      );
      const recommendedMetrics = convertTemplateLibraryRowsToRecommendationItems(
        draft.recommendedMetrics
      );
      const saveResult = await window.electronAPI.upsertUserTemplate({
        templateType: 'curve',
        template: {
          id: draft.templateId,
          version: 1,
          familyId: draft.familyId,
          displayName: trimmedDisplayName,
          aliases,
          enabled: draft.enabled,
          purposeType: draft.purposeType,
          blockTitleDefault: trimmedBlockTitle,
          axisDefaults: {
            primaryLabel: draft.primaryLabel.trim(),
            primaryUnit: draft.primaryUnit.trim(),
            secondaryLabel: draft.secondaryLabel.trim(),
            secondaryUnit: draft.secondaryUnit.trim()
          },
          recommendedConditions,
          recommendedMetrics,
          importParsingTemplateId: draft.importParsingTemplateId,
          filenameHints,
          sourceType: 'user'
        }
      });

      if (!saveResult.success) {
        throw new Error(saveResult.error || t('templateLibrary.saveFailed'));
      }

      const enabledResult = await window.electronAPI.setTemplateEnabled({
        templateId: draft.templateId,
        enabled: draft.enabled
      });

      if (!enabledResult.success) {
        throw new Error(enabledResult.error || t('templateLibrary.saveFailed'));
      }
    }

    if (draft.templateType === 'scientific') {
      templateLibrarySelectedCurveTemplateId = '';
    } else if (draft.templateType === 'scalar') {
      templateLibrarySelectedKind = draft.scalarSection === 'metric' ? 'metrics' : 'conditions';
    }

    await reloadTemplateLibraryResolved({
      nextFamilyId: draft.templateType === 'scientific' ? draft.templateId : draft.familyId,
      nextTemplateId: draft.templateType === 'scientific' ? undefined : draft.templateId
    });
    clearTemplateLibraryDirtyState(t('templateLibrary.saveSuccess'));
    requestRender(true);
  } catch (error) {
    templateLibrarySaveMessage = getErrorMessage(error) || t('templateLibrary.saveFailed');
    updateTemplateLibrarySaveStateIndicator();
    alert(templateLibrarySaveMessage);
  } finally {
    templateLibrarySaving = false;
  }
}

async function resetTemplateLibraryEditorOverride() {
  if (!templateLibraryEditorDraft || templateLibrarySaving) {
    return;
  }

  if (!templateLibraryEditorDraft.isBuiltin || !templateLibraryEditorDraft.hasLocalOverride) {
    return;
  }

  const shouldContinue = window.confirm(t('templateLibrary.resetOverrideConfirm'));
  if (!shouldContinue) {
    return;
  }

  templateLibrarySaving = true;
  templateLibrarySaveMessage = t('templateLibrary.saving');
  updateTemplateLibrarySaveStateIndicator();

  try {
    const result = await window.electronAPI.resetTemplateLibraryOverride({
      targetId: templateLibraryEditorDraft.templateId,
      targetType: templateLibraryEditorDraft.templateType
    });

    if (!result.success) {
      throw new Error(result.error || t('templateLibrary.resetOverrideFailed'));
    }

    await reloadTemplateLibraryResolved({
      nextFamilyId:
        templateLibraryEditorDraft.templateType === 'scientific'
          ? templateLibraryEditorDraft.templateId
          : templateLibraryEditorDraft.familyId,
      nextTemplateId:
        templateLibraryEditorDraft.templateType === 'scientific'
          ? undefined
          : templateLibraryEditorDraft.templateId
    });
    clearTemplateLibraryDirtyState(t('templateLibrary.resetOverrideSuccess'));
    requestRender(true);
  } catch (error) {
    templateLibrarySaveMessage = getErrorMessage(error) || t('templateLibrary.resetOverrideFailed');
    updateTemplateLibrarySaveStateIndicator();
    alert(templateLibrarySaveMessage);
  } finally {
    templateLibrarySaving = false;
  }
}

async function deleteTemplateLibraryEditorTemplate() {
  if (!templateLibraryEditorDraft || templateLibrarySaving) {
    return;
  }

  const isScientificTemplate = templateLibraryEditorDraft.templateType === 'scientific';
  if (!templateLibrarySelectedCurveTemplateId && !isScientificTemplate) {
    return;
  }

  if (templateLibraryEditorDraft.sourceType !== 'user' || templateLibraryEditorDraft.isBuiltin) {
    alert(t('templateLibrary.builtinDeleteHint'));
    return;
  }

  if (isScientificTemplate && !isPersistedScientificFamily(templateLibraryEditorDraft.templateId)) {
    discardTemplateLibraryDraft();
    return;
  }

  const familyDeleteStats = isScientificTemplate
    ? getTemplateLibraryUserFamilyDeleteStats(templateLibraryEditorDraft.templateId)
    : null;
  const shouldContinue = window.confirm(
    isScientificTemplate
      ? t('templateLibrary.deleteFamilyConfirm', {
          conditions: familyDeleteStats?.conditions || 0,
          metrics: familyDeleteStats?.metrics || 0,
          curves: familyDeleteStats?.curves || 0
        })
      : t('templateLibrary.deleteConfirm')
  );
  if (!shouldContinue) {
    return;
  }

  const familyTemplates = getTemplateLibraryFamilyTemplates(
    templateLibraryEditorDraft.familyId || templateLibraryEditorDraft.templateId,
    templateLibrarySelectedKind
  );
  const currentIndex = familyTemplates.findIndex(
    (template) => template.id === templateLibraryEditorDraft?.templateId
  );
  const fallbackTemplateId =
    !isScientificTemplate
      ? familyTemplates[currentIndex + 1]?.id || familyTemplates[currentIndex - 1]?.id || ''
      : '';
  const fallbackFamilyId = isScientificTemplate
    ? templateLibraryResolved?.scientificTemplates.find((family) => family.id !== templateLibraryEditorDraft.templateId)
        ?.id || ''
    : templateLibraryEditorDraft.familyId;

  templateLibrarySaving = true;
  templateLibrarySaveMessage = t('templateLibrary.saving');
  updateTemplateLibrarySaveStateIndicator();

  try {
    const result = await window.electronAPI.deleteUserTemplate({
      templateType: templateLibraryEditorDraft.templateType,
      templateId: templateLibraryEditorDraft.templateId
    });

    if (!result.success) {
      throw new Error(result.error || t('templateLibrary.deleteFailed'));
    }

    await reloadTemplateLibraryResolved({
      nextFamilyId: fallbackFamilyId || undefined,
      nextTemplateId: fallbackTemplateId || undefined
    });
    clearTemplateLibraryDirtyState('');
    requestRender(true);
  } catch (error) {
    templateLibrarySaveMessage = getErrorMessage(error) || t('templateLibrary.deleteFailed');
    updateTemplateLibrarySaveStateIndicator();
    alert(templateLibrarySaveMessage);
  } finally {
    templateLibrarySaving = false;
  }
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

async function reloadDatabaseWorkspaceState() {
  const state: DatabaseWorkspaceState = await window.electronAPI.getDatabaseWorkspaceState();
  frequentDatabaseFilters = state.frequentFilters || [];
  starredExperimentIds = state.starredExperimentIds;
  databaseWorkspaceStateLoaded = true;
}

async function ensureDatabaseWorkspaceStateLoaded() {
  if (databaseWorkspaceStateLoaded) {
    return;
  }

  if (!databaseWorkspaceStateLoadPromise) {
    databaseWorkspaceStateLoadPromise = (async () => {
      try {
        await reloadDatabaseWorkspaceState();
      } catch (error) {
        console.error('load database workspace state failed:', error);
        frequentDatabaseFilters = [];
        starredExperimentIds = [];
        databaseWorkspaceStateLoaded = true;
      }
    })();
  }

  await databaseWorkspaceStateLoadPromise;
}

function isExperimentStarred(experimentId: number) {
  return starredExperimentIds.includes(experimentId);
}

function buildCurrentDatabaseWorkspaceUsagePayload(
  overrides: Partial<RecordDatabaseWorkspaceUsagePayload> = {}
): RecordDatabaseWorkspaceUsagePayload {
  return {
    query: overrides.query !== undefined ? overrides.query : databaseSearchKeyword,
    groupBy: overrides.groupBy || databaseGroupBy,
    sortOrder: overrides.sortOrder || databaseSortOrder,
    starredOnly: overrides.starredOnly !== undefined ? overrides.starredOnly : databaseStarredOnly,
    crossFilters:
      overrides.crossFilters !== undefined
        ? overrides.crossFilters
        : databaseCrossFilters.map((chip) => ({ ...chip }))
  };
}

function applyDatabaseWorkspaceCombination(combination: RecordDatabaseWorkspaceUsagePayload) {
  databaseSearchKeyword = combination.query || '';
  databaseGroupBy = combination.groupBy || 'sampleCode';
  databaseSortOrder = combination.sortOrder || 'newest';
  databaseStarredOnly = Boolean(combination.starredOnly);
  databaseCrossFilters = Array.isArray(combination.crossFilters)
    ? combination.crossFilters.map((chip) => ({ ...chip }))
    : [];
  databaseFilterDraft = buildDefaultCrossFilterDraft();
  resetDatabaseFilterCandidateState();
}

function closeDatabaseFrequentFiltersPopover() {
  databaseFrequentFiltersOpen = false;
}

function hasCustomizedDatabaseWorkspaceState() {
  return Boolean(
    databaseSearchKeyword ||
      databaseCrossFilters.length ||
      databaseStarredOnly ||
      databaseGroupBy !== 'sampleCode' ||
      databaseSortOrder !== 'newest'
  );
}

function resetDatabaseWorkspaceControls() {
  databaseSearchKeyword = '';
  databaseGroupBy = 'sampleCode';
  databaseSortOrder = 'newest';
  databaseStarredOnly = false;
  databaseCrossFilters = [];
  databaseFilterDraft = buildDefaultCrossFilterDraft();
  resetDatabaseFilterCandidateState();
  closeDatabaseFrequentFiltersPopover();
}

async function recordCurrentDatabaseWorkspaceUsage() {
  if (!hasCustomizedDatabaseWorkspaceState()) {
    return;
  }

  try {
    await window.electronAPI.recordDatabaseWorkspaceUsage(
      buildCurrentDatabaseWorkspaceUsagePayload()
    );
    await reloadDatabaseWorkspaceState();
  } catch (error) {
    console.error('record database workspace usage failed:', error);
  }
}

async function reloadCurrentRelatedRecords(experimentId: number) {
  currentRelatedRecordsLoading = true;

  try {
    currentRelatedRecords = await window.electronAPI.listRelatedExperimentRecords(experimentId);
  } catch (error) {
    console.error('load related experiment records failed:', error);
    currentRelatedRecords = {
      sameProject: [],
      sameSampleCode: [],
      sameTester: []
    };
  } finally {
    currentRelatedRecordsLoading = false;
  }
}

async function reloadActiveEntryDraft() {
  activeEntryDraft = await window.electronAPI.getActiveEntryDraft();
  activeEntryDraftLoaded = true;
}

async function ensureActiveEntryDraftLoaded() {
  if (activeEntryDraftLoaded) {
    return activeEntryDraft;
  }

  if (!activeEntryDraftLoadPromise) {
    activeEntryDraftLoadPromise = (async () => {
      try {
        await reloadActiveEntryDraft();
      } catch (error) {
        console.error('load active entry draft failed:', error);
        activeEntryDraft = null;
        activeEntryDraftLoaded = true;
      }
    })();
  }

  await activeEntryDraftLoadPromise;
  return activeEntryDraft;
}

async function reloadRecentEntrySuggestions() {
  recentEntrySuggestions = await window.electronAPI.getRecentEntrySuggestions();
  recentEntrySuggestionsLoaded = true;
}

async function ensureRecentEntrySuggestionsLoaded() {
  if (recentEntrySuggestionsLoaded) {
    return recentEntrySuggestions;
  }

  if (!recentEntrySuggestionsLoadPromise) {
    recentEntrySuggestionsLoadPromise = (async () => {
      try {
        await reloadRecentEntrySuggestions();
      } catch (error) {
        console.error('load recent entry suggestions failed:', error);
        recentEntrySuggestions = {
          testProjects: [],
          instruments: []
        };
        recentEntrySuggestionsLoaded = true;
      }
    })();
  }

  await recentEntrySuggestionsLoadPromise;
  return recentEntrySuggestions;
}

async function ensureEntryWorkflowAssistDataLoaded() {
  await Promise.all([
    ensureDictionaryItemsLoaded().catch((error) => {
      console.error('load dictionary items for entry workflow failed:', error);
    }),
    ensureRecentEntrySuggestionsLoaded().catch((error) => {
      console.error('load recent entry workflow suggestions failed:', error);
    }),
    ensureTemplateLibraryLoaded().catch((error) => {
      console.error('load template library for entry workflow failed:', error);
    })
  ]);
}

function resetCreateFormToBlank() {
  resetFormState();
  currentView = 'add-step1';
}

async function openAddDataEntry() {
  const draft = await ensureActiveEntryDraftLoaded();
  if (draft) {
    await resumeActiveDraft();
    return;
  }

  resetCreateFormToBlank();
  await ensureEntryWorkflowAssistDataLoaded();
  void render();
}

function buildSaveDraftPayload(
  resumeStep: SaveActiveEntryDraftPayload['resumeStep'],
  overrides: Partial<Pick<SaveActiveEntryDraftPayload, 'source' | 'originExperimentId' | 'originDisplayName'>> = {}
): SaveActiveEntryDraftPayload {
  return {
    source: overrides.source || activeEntryDraft?.source || 'new',
    originExperimentId:
      overrides.originExperimentId !== undefined
        ? overrides.originExperimentId
        : activeEntryDraft?.originExperimentId,
    originDisplayName:
      overrides.originDisplayName !== undefined
        ? overrides.originDisplayName
        : activeEntryDraft?.originDisplayName,
    resumeStep,
    step1: {
      testProject: step1FormData.testProject,
      sampleCode: step1FormData.sampleCode,
      tester: step1FormData.tester,
      instrument: step1FormData.instrument,
      testTime: step1FormData.testTime,
      sampleOwner: step1FormData.sampleOwner,
      dynamicFields: step1FormData.dynamicFields.map((field): EntryDraftDynamicField => ({
        id: field.id,
        name: field.name,
        value: field.value
      }))
    },
    step2: step2DataItems.map((item): EntryDraftDataItem => ({
      id: item.id,
      scalarRole: item.scalarRole,
      itemName: item.itemName,
      itemValue: item.itemValue,
      itemUnit: item.itemUnit,
      sourceFileName: item.sourceFileName,
      sourceFilePath: item.sourceFilePath,
      originalFileName: item.originalFileName,
      originalFilePath: item.originalFilePath
    })),
    templateBlocks: step2TemplateBlocks.map((block): EntryDraftTemplateBlock => ({
      id: block.id,
      templateType: block.templateType,
      purposeType: block.purposeType,
      blockTitle: block.blockTitle,
      primaryLabel: block.primaryLabel,
      primaryUnit: block.primaryUnit,
      secondaryLabel: block.secondaryLabel,
      secondaryUnit: block.secondaryUnit,
      dataText: block.dataText,
      note: block.note,
      sourceFileName: block.sourceFileName,
      sourceFilePath: block.sourceFilePath,
      originalFileName: block.originalFileName,
      originalFilePath: block.originalFilePath
    }))
  };
}

function applyActiveEntryDraftToCreateForm(draft: ActiveEntryDraft) {
  step1FormData = {
    testProject: draft.step1.testProject,
    sampleCode: draft.step1.sampleCode,
    tester: draft.step1.tester,
    instrument: draft.step1.instrument,
    testTime: draft.step1.testTime,
    sampleOwner: draft.step1.sampleOwner,
    dynamicFields: draft.step1.dynamicFields.map((field) => ({
      id: field.id,
      name: field.name,
      value: field.value
    }))
  };

  step2DataItems = draft.step2.map((item) => ({
    id: item.id,
    scalarRole: item.scalarRole,
    itemName: item.itemName,
    itemValue: item.itemValue,
    itemUnit: item.itemUnit,
    sourceFileName: item.sourceFileName,
    sourceFilePath: item.sourceFilePath,
    originalFileName: item.originalFileName,
    originalFilePath: item.originalFilePath,
    replacementSourcePath: '',
    replacementOriginalName: ''
  }));

  step2TemplateBlocks = draft.templateBlocks.map((block) => ({
    id: block.id,
    templateType: block.templateType,
    purposeType: block.purposeType || '',
    blockTitle: block.blockTitle,
    primaryLabel: block.primaryLabel,
    primaryUnit: block.primaryUnit,
    secondaryLabel: block.secondaryLabel,
    secondaryUnit: block.secondaryUnit,
    dataText: block.dataText,
    note: block.note,
    sourceFileName: block.sourceFileName,
    sourceFilePath: block.sourceFilePath,
    originalFileName: block.originalFileName,
    originalFilePath: block.originalFilePath,
    replacementSourcePath: '',
    replacementOriginalName: '',
    importPreviewLoading: false,
    importPreviewError: '',
    importParserLabel: '',
    importWarnings: [] as string[],
    importPreviewSelectedName: '',
    importPreviewSelectedPath: ''
  }));

  resetTemplateBlockImportState('create-step2');
}

async function discardActiveDraftAndRefresh() {
  const result = await window.electronAPI.discardActiveEntryDraft();
  if (!result.success) {
    alert(result.error || t('draft.discardFailed'));
    return false;
  }

  activeEntryDraft = null;
  activeEntryDraftLoaded = true;
  activeEntryDraftLoadPromise = null;
  return true;
}

async function resumeActiveDraft() {
  const draft = await ensureActiveEntryDraftLoaded();
  if (!draft) {
    alert(t('draft.resumeMissing'));
    requestRender(true);
    return;
  }

  await ensureEntryWorkflowAssistDataLoaded();
  applyActiveEntryDraftToCreateForm(draft);
  currentView = draft.resumeStep === 'step2' ? 'add-step2' : 'add-step1';
  void render();
}

function hasAnyCreateDraftContent() {
  return Boolean(
    step1FormData.testProject ||
      step1FormData.sampleCode ||
      step1FormData.tester ||
      step1FormData.instrument ||
      step1FormData.testTime ||
      step1FormData.sampleOwner ||
      step1FormData.dynamicFields.some((field) => field.name || field.value) ||
      step2DataItems.some((item) =>
        item.itemName ||
        item.itemValue ||
        item.itemUnit ||
        item.sourceFileName ||
        item.originalFileName
      ) ||
      step2TemplateBlocks.some((block) =>
        block.purposeType ||
        block.blockTitle ||
        block.primaryLabel ||
        block.primaryUnit ||
        block.secondaryLabel ||
        block.secondaryUnit ||
        block.dataText ||
        block.note ||
        block.sourceFileName ||
        block.originalFileName
      )
  );
}

function buildComparableEntryDraftPayload(
  payload: SaveActiveEntryDraftPayload
): SaveActiveEntryDraftPayload {
  return {
    source: payload.source,
    originExperimentId:
      Number.isInteger(payload.originExperimentId) && Number(payload.originExperimentId) > 0
        ? Number(payload.originExperimentId)
        : undefined,
    originDisplayName: payload.originDisplayName || undefined,
    resumeStep: payload.resumeStep,
    step1: {
      ...payload.step1,
      dynamicFields: payload.step1.dynamicFields.map((field) => ({
        id: field.id,
        name: field.name,
        value: field.value
      }))
    },
    step2: payload.step2.map((item) => ({
      id: item.id,
      scalarRole: item.scalarRole,
      itemName: item.itemName,
      itemValue: item.itemValue,
      itemUnit: item.itemUnit,
      sourceFileName: item.sourceFileName,
      sourceFilePath: item.sourceFilePath,
      originalFileName: item.originalFileName,
      originalFilePath: item.originalFilePath
    })),
    templateBlocks: payload.templateBlocks.map((block) => ({
      id: block.id,
      templateType: block.templateType,
      purposeType: block.purposeType || undefined,
      blockTitle: block.blockTitle,
      primaryLabel: block.primaryLabel,
      primaryUnit: block.primaryUnit,
      secondaryLabel: block.secondaryLabel,
      secondaryUnit: block.secondaryUnit,
      dataText: block.dataText,
      note: block.note,
      sourceFileName: block.sourceFileName,
      sourceFilePath: block.sourceFilePath,
      originalFileName: block.originalFileName,
      originalFilePath: block.originalFilePath
    }))
  };
}

function hasPendingCreateFlowChanges(
  resumeStep: SaveActiveEntryDraftPayload['resumeStep']
) {
  if (!activeEntryDraft) {
    return hasAnyCreateDraftContent();
  }

  const currentPayload = buildComparableEntryDraftPayload(buildSaveDraftPayload(resumeStep));
  const savedDraftPayload = buildComparableEntryDraftPayload(activeEntryDraft);
  return JSON.stringify(currentPayload) !== JSON.stringify(savedDraftPayload);
}

async function saveCurrentDraft(
  resumeStep: SaveActiveEntryDraftPayload['resumeStep']
) {
  if (!hasAnyCreateDraftContent()) {
    alert(t('draft.nothingToSave'));
    return false;
  }

  const result = await window.electronAPI.saveActiveEntryDraft(buildSaveDraftPayload(resumeStep));
  if (!result.success) {
    alert(result.error || t('draft.saveFailed'));
    return false;
  }

  await reloadActiveEntryDraft();
  return true;
}

async function saveCurrentDraftAndReturn(resumeStep: SaveActiveEntryDraftPayload['resumeStep']) {
  const saved = await saveCurrentDraft(resumeStep);
  if (!saved) {
    return;
  }

  currentView = 'home';
  void render();
}

async function attemptLeaveCreateFlow(
  resumeStep: SaveActiveEntryDraftPayload['resumeStep'],
  navigate: () => Promise<void> | void
) {
  const hasPendingChanges = hasPendingCreateFlowChanges(resumeStep);
  if (!hasPendingChanges) {
    await navigate();
    return;
  }

  const canSaveDraft = hasAnyCreateDraftContent();
  if (canSaveDraft && window.confirm(t('draft.leaveConfirm'))) {
    const saved = await saveCurrentDraft(resumeStep);
    if (!saved) {
      return;
    }

    await navigate();
    return;
  }

  const confirmedDiscard = window.confirm(t('draft.leaveDiscardConfirm'));
  if (!confirmedDiscard) {
    return;
  }

  if (activeEntryDraft) {
    const discarded = await discardActiveDraftAndRefresh();
    if (!discarded) {
      return;
    }
  }

  resetFormState();
  await navigate();
}

function buildCopiedRecordDraftPayload(detail: ExperimentDetail): SaveActiveEntryDraftPayload {
  return {
    source: 'copied-record',
    originExperimentId: detail.id,
    originDisplayName: detail.displayName,
    resumeStep: 'step1',
    step1: {
      testProject: detail.testProject,
      sampleCode: detail.sampleCode,
      tester: detail.tester,
      instrument: detail.instrument,
      testTime: '',
      sampleOwner: detail.sampleOwner || '',
      dynamicFields: detail.customFields.map((field) => ({
        id: generateId(),
        name: field.fieldName,
        value: field.fieldValue
      }))
    },
    step2: detail.dataItems.map((item) => ({
      id: generateId(),
      scalarRole: resolveScalarItemRole(item),
      itemName: item.itemName,
      itemValue: '',
      itemUnit: item.itemUnit || '',
      sourceFileName: '',
      sourceFilePath: '',
      originalFileName: '',
      originalFilePath: ''
    })),
    templateBlocks: detail.templateBlocks.map((block) => ({
      id: generateId(),
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
      dataText: '',
      note: block.note,
      sourceFileName: '',
      sourceFilePath: '',
      originalFileName: '',
      originalFilePath: ''
    }))
  };
}

async function createNewDraftFromExperimentDetail(detail: ExperimentDetail) {
  const existingDraft = await ensureActiveEntryDraftLoaded();
  if (existingDraft) {
    const confirmed = window.confirm(
      t('draft.replaceConfirm', {
        label: existingDraft.originDisplayName || buildDisplayName(existingDraft.step1)
      })
    );
    if (!confirmed) {
      return;
    }
  }

  const result = await window.electronAPI.saveActiveEntryDraft(buildCopiedRecordDraftPayload(detail));
  if (!result.success) {
    alert(result.error || t('draft.copyFailed'));
    return;
  }

  await reloadActiveEntryDraft();
  const draft = activeEntryDraft;
  if (!draft) {
    alert(t('draft.resumeMissing'));
    return;
  }

  await ensureEntryWorkflowAssistDataLoaded();
  applyActiveEntryDraftToCreateForm(draft);
  currentView = 'add-step1';
  void render();
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

function getProvenanceCategoryHelperText(dictionaryType: ProvenanceDictionaryType) {
  switch (dictionaryType) {
    case 'tester':
      return t('provenance.categoryHelp.tester');
    case 'instrument':
      return t('provenance.categoryHelp.instrument');
    case 'sampleOwner':
      return t('provenance.categoryHelp.sampleOwner');
    case 'sampleCode':
      return t('provenance.categoryHelp.sampleCode');
    default:
      return '';
  }
}

function getProvenanceAddLabel(dictionaryType: ProvenanceDictionaryType) {
  switch (dictionaryType) {
    case 'tester':
      return t('provenance.addTester');
    case 'instrument':
      return t('provenance.addInstrument');
    case 'sampleOwner':
      return t('provenance.addOwner');
    case 'sampleCode':
      return t('provenance.addSampleIdentifier');
    default:
      return t('dictionary.add');
  }
}

function getProvenanceEmptyText(dictionaryType: ProvenanceDictionaryType) {
  switch (dictionaryType) {
    case 'tester':
      return t('provenance.emptyTester');
    case 'instrument':
      return t('provenance.emptyInstrument');
    case 'sampleOwner':
      return t('provenance.emptyOwner');
    case 'sampleCode':
      return t('provenance.emptySampleIdentifier');
    default:
      return t('dictionary.empty');
  }
}

function getNormalizedProvenanceSearchQuery() {
  return provenanceSearchQuery.trim().toLowerCase();
}

function getProvenanceSearchResults(): Array<{
  dictionaryType: ProvenanceDictionaryType;
  item: DictionaryItem;
}> {
  const query = getNormalizedProvenanceSearchQuery();
  if (!query) {
    return [];
  }

  return PROVENANCE_DICTIONARY_TYPES.flatMap((dictionaryType) =>
    dictionaryItems[dictionaryType]
      .filter((item) => item.value.trim().toLowerCase().includes(query))
      .map((item) => ({ dictionaryType, item }))
  );
}

function renderProvenanceSearchResults() {
  const query = getNormalizedProvenanceSearchQuery();
  if (!query) {
    return '';
  }

  const results = getProvenanceSearchResults();
  if (!results.length) {
    return `<div class="provenance-search-results provenance-search-results-empty">${escapeHtml(
      t('provenance.noMatches')
    )}</div>`;
  }

  return `
    <div class="provenance-search-results">
      ${results
        .map(
          ({ dictionaryType, item }) => `
            <button
              class="provenance-search-result"
              type="button"
              data-provenance-result-type="${dictionaryType}"
              data-provenance-result-id="${escapeHtml(item.id)}"
            >
              <span class="provenance-search-result-name">${escapeHtml(item.value)}</span>
              <span class="provenance-search-result-category">${escapeHtml(
                getDictionarySectionLabel(getCurrentLanguage(), dictionaryType)
              )}</span>
            </button>
          `
        )
        .join('')}
    </div>
  `;
}

function renderProvenanceAddCard(dictionaryType: ProvenanceDictionaryType) {
  const isExpanded = provenanceAddExpandedType === dictionaryType;
  const isSubmitting = dictionarySubmittingType === dictionaryType;
  const errorMessage = dictionarySectionErrors[dictionaryType];

  if (!isExpanded) {
    return `
      <button
        class="provenance-add-card"
        type="button"
        data-provenance-add-toggle="${dictionaryType}"
        ${dictionarySubmittingType || dictionaryDeletingId ? 'disabled' : ''}
      >
        <span class="provenance-add-card-plus">＋</span>
        <span>${escapeHtml(getProvenanceAddLabel(dictionaryType))}</span>
      </button>
    `;
  }

  return `
    <div class="provenance-add-card provenance-add-card-expanded">
      <input
        id="dictionary-input-${dictionaryType}"
        class="form-input provenance-add-input"
        value="${escapeHtml(dictionaryInputValues[dictionaryType])}"
        placeholder="${escapeHtml(t('dictionary.placeholder', { label: getDictionarySectionLabel(getCurrentLanguage(), dictionaryType) }))}"
      />
      <div class="provenance-add-actions">
        <button
          class="secondary-btn provenance-inline-btn"
          type="button"
          data-provenance-add-submit="${dictionaryType}"
          ${isSubmitting || !!dictionaryDeletingId ? 'disabled' : ''}
        >
          ${escapeHtml(isSubmitting ? t('dictionary.adding') : t('dictionary.add'))}
        </button>
        <button
          class="text-btn provenance-inline-text-btn"
          type="button"
          data-provenance-add-cancel="${dictionaryType}"
          ${isSubmitting ? 'disabled' : ''}
        >
          ${escapeHtml(t('common.cancelAction'))}
        </button>
      </div>
      ${errorMessage ? `<div class="error-message">${escapeHtml(errorMessage)}</div>` : ''}
    </div>
  `;
}

function renderProvenanceCategoryPanel(dictionaryType: ProvenanceDictionaryType) {
  const items = dictionaryItems[dictionaryType];

  return `
    <div class="provenance-category-panel">
      <div class="provenance-category-header">
        <div class="detail-section-title">${escapeHtml(
          getDictionarySectionLabel(getCurrentLanguage(), dictionaryType)
        )}</div>
        <div class="detail-section-subtitle">${escapeHtml(getProvenanceCategoryHelperText(dictionaryType))}</div>
      </div>

      ${items.length ? '' : `<div class="empty-tip provenance-empty-tip">${escapeHtml(getProvenanceEmptyText(dictionaryType))}</div>`}

      <div class="provenance-chip-grid">
        ${items
          .map(
            (item) => `
              <div
                class="provenance-chip-card ${provenanceHighlightedItemId === item.id ? 'provenance-chip-card-active' : ''}"
                data-provenance-chip-id="${escapeHtml(item.id)}"
              >
                <button
                  class="provenance-chip-main"
                  type="button"
                  data-provenance-chip-select="${escapeHtml(item.id)}"
                >
                  ${escapeHtml(item.value)}
                </button>
                <button
                  class="provenance-chip-delete"
                  type="button"
                  data-dictionary-delete-id="${escapeHtml(item.id)}"
                  data-dictionary-delete-label="${escapeHtml(item.value)}"
                  title="${escapeHtml(t('provenance.delete'))}"
                  aria-label="${escapeHtml(t('provenance.delete'))}"
                  ${dictionaryDeletingId ? 'disabled' : ''}
                >
                  ${dictionaryDeletingId === item.id ? '…' : '×'}
                </button>
              </div>
            `
          )
          .join('')}
        ${renderProvenanceAddCard(dictionaryType)}
      </div>
    </div>
  `;
}

function renderProvenanceManagementPanel() {
  const activeDictionaryType = provenanceSelectedType;

  return `
    <div class="provenance-management-shell">
      ${dictionaryLoadError ? `<div class="error-message large-error">${escapeHtml(dictionaryLoadError)}</div>` : ''}
      ${dictionaryLoading && !dictionaryLoaded ? `<div class="empty-tip">${escapeHtml(t('provenance.loading'))}</div>` : ''}

      <div class="provenance-search-shell">
        <div class="provenance-search-row">
          <input
            id="provenance-search-input"
            class="form-input provenance-search-input"
            value="${escapeHtml(provenanceSearchQuery)}"
            placeholder="${escapeHtml(t('provenance.searchPlaceholder'))}"
          />
          <button id="provenance-search-btn" class="secondary-btn provenance-search-btn" type="button">
            ${escapeHtml(t('common.search'))}
          </button>
        </div>
        ${renderProvenanceSearchResults()}
      </div>

      <div class="provenance-tab-row">
        ${PROVENANCE_DICTIONARY_TYPES.map(
          (dictionaryType) => `
            <button
              class="group-tab-btn ${activeDictionaryType === dictionaryType ? 'active-group-tab' : ''}"
              type="button"
              data-provenance-tab="${dictionaryType}"
            >
              ${escapeHtml(getDictionarySectionLabel(getCurrentLanguage(), dictionaryType))}
            </button>
          `
        ).join('')}
      </div>

      ${renderProvenanceCategoryPanel(activeDictionaryType)}
    </div>
  `;
}

async function openSettingsView(subView: SettingsSubView = 'general') {
  if (currentView === 'settings' && settingsSubView === 'template-library' && subView !== 'template-library') {
    if (!confirmDiscardTemplateLibraryChanges()) {
      return;
    }
  }

  currentView = 'settings';
  settingsSubView = subView;

  if (subView === 'template-library') {
    await ensureTemplateLibraryLoaded();
  }

  await render();
}

async function switchSettingsSubView(nextSubView: SettingsSubView) {
  if (settingsSubView === nextSubView) {
    return;
  }

  if (settingsSubView === 'template-library' && nextSubView !== 'template-library') {
    if (!confirmDiscardTemplateLibraryChanges()) {
      return;
    }
  }

  saveDictionaryInputsToState();
  settingsSubView = nextSubView;

  if (nextSubView === 'template-library') {
    await ensureTemplateLibraryLoaded();
    requestRender(true);
    return;
  }

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
    dictionaryLoadError = getErrorMessage(error) || t('provenance.loadFailed');
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

async function toggleExperimentStarStatus(
  experimentId: number,
  options: { reloadDatabaseList?: boolean; preserveScroll?: boolean } = {}
) {
  const result = await window.electronAPI.toggleStarredExperiment({ experimentId });
  if (!result.success) {
    alert(result.error || t('database.star.toggleFailed'));
    return;
  }

  await reloadDatabaseWorkspaceState();

  if (options.reloadDatabaseList) {
    await loadDatabaseList();
  }

  if (options.preserveScroll) {
    void renderPreservingContentScroll();
    return;
  }

  void render();
}

function getDatabaseGroupByOptions(): Array<{ key: GroupByType; label: string }> {
  return [
    { key: 'sampleCode', label: t('database.groupBy.sampleCode') },
    { key: 'testProject', label: t('database.groupBy.testProject') },
    { key: 'testTime', label: t('database.groupBy.testTime') },
    { key: 'instrument', label: t('database.groupBy.instrument') },
    { key: 'tester', label: t('database.groupBy.tester') },
    { key: 'sampleOwner', label: t('database.groupBy.sampleOwner') }
  ];
}

function getDatabaseGroupByLabel(groupBy: GroupByType) {
  return getDatabaseGroupByOptions().find((option) => option.key === groupBy)?.label || '';
}

function renderDatabaseBulkActionBar() {
  const allVisibleSelected = areAllVisibleSelected();
  const hasSelection = selectedExperimentIds.length > 0;
  const hasVisibleResults = getVisibleExperimentIds().length > 0;

  return `
    <section class="database-bulk-bar">
      <div class="database-bulk-meta">
        <div class="database-bulk-title">${escapeHtml(t('database.selectedResults', { count: selectedExperimentIds.length }))}</div>
      </div>
      <div class="database-bulk-actions">
        <button
          id="db-select-all-btn"
          class="secondary-btn database-toolbar-btn"
          type="button"
          ${hasVisibleResults ? '' : 'disabled'}
        >
          ${escapeHtml(allVisibleSelected ? t('database.cancelCurrentResults') : t('database.selectCurrentResults'))}
        </button>
        <button
          id="db-export-btn"
          class="secondary-btn database-toolbar-btn"
          type="button"
          ${hasSelection ? '' : 'disabled'}
          title="${escapeHtml(t('analysis.chart.export'))}"
        >
          ↓ ${escapeHtml(t('analysis.chart.export'))}
        </button>
        <button
          id="db-delete-btn"
          class="danger-btn database-toolbar-btn ${hasSelection ? '' : 'disabled-danger-btn'}"
          type="button"
          ${hasSelection ? '' : 'disabled'}
          title="${escapeHtml(t('dictionary.delete'))}"
        >
          ✕ ${escapeHtml(t('dictionary.delete'))}
        </button>
        <button id="db-clear-selection-btn" class="text-btn database-clear-selection-btn" type="button" ${hasSelection ? '' : 'disabled'}>
          ${escapeHtml(t('database.clearSelection'))}
        </button>
      </div>
    </section>
  `;
}

function renderDatabaseFilterChipStrip() {
  if (!databaseCrossFilters.length) {
    return '';
  }

  return `
    <section class="database-chip-strip">
      <div class="cross-filter-chip-row database-cross-filter-chip-row">
        ${databaseCrossFilters
          .map(
            (chip) => `
              <span class="cross-filter-chip">
                <span class="cross-filter-chip-label">${escapeHtml(formatLocalizedCrossFilterChipLabel(chip))}</span>
                <button
                  class="cross-filter-chip-remove"
                  type="button"
                  title="${escapeHtml(t('database.filter.removeCondition'))}"
                  data-cross-filter-remove="database::${chip.id}"
                >
                  ×
                </button>
              </span>
            `
          )
          .join('')}
        <button id="db-filter-clear-btn" class="text-btn cross-filter-clear-btn" type="button">
          ${escapeHtml(t('database.filter.clearAll'))}
        </button>
      </div>
    </section>
  `;
}

function formatFrequentDatabaseFilterLabel(item: FrequentDatabaseFilter) {
  const parts: string[] = [];

  if (item.query) {
    parts.push(t('database.frequent.searchLabel', { query: item.query }));
  }

  item.crossFilters.slice(0, 2).forEach((chip) => {
    parts.push(formatLocalizedCrossFilterChipLabel(chip));
  });

  if (item.starredOnly) {
    parts.push(t('database.star.filterOn'));
  }

  if (item.groupBy !== 'sampleCode') {
    parts.push(t('database.frequent.groupByLabel', { label: getDatabaseGroupByLabel(item.groupBy) }));
  }

  return parts.join('，');
}

function shouldDisplayFrequentDatabaseFilter(item: FrequentDatabaseFilter) {
  return Boolean(item.query || item.crossFilters.length);
}

function renderFrequentDatabaseFiltersEntry() {
  const visibleFrequentFilters = frequentDatabaseFilters.filter(shouldDisplayFrequentDatabaseFilter);

  return `
    <div class="database-frequent-entry">
      <button
        id="db-frequent-filters-btn"
        class="secondary-btn database-toolbar-btn database-frequent-trigger"
        type="button"
        aria-expanded="${databaseFrequentFiltersOpen ? 'true' : 'false'}"
      >
        ${escapeHtml(t('database.savedViews.title'))}
      </button>
      ${
        databaseFrequentFiltersOpen
          ? `
              <div class="database-frequent-popover">
                <div class="database-frequent-popover-header">
                  <div class="database-inline-label">${escapeHtml(t('database.savedViews.title'))}</div>
                  <button id="db-frequent-filters-close-btn" class="text-btn" type="button">×</button>
                </div>
                ${
                  visibleFrequentFilters.length
                    ? `<div class="database-frequent-list">
                        ${visibleFrequentFilters
                          .map(
                            (item) => `
                              <button
                                class="database-frequent-item"
                                type="button"
                                data-apply-frequent-filter-id="${item.id}"
                              >
                                <span>${escapeHtml(formatFrequentDatabaseFilterLabel(item))}</span>
                              </button>
                            `
                          )
                          .join('')}
                      </div>`
                    : `<div class="database-frequent-empty">${escapeHtml(t('database.savedViews.empty'))}</div>`
                }
              </div>
            `
          : ''
      }
    </div>
  `;
}

function renderDatabaseFilterPanel() {
  if (!databaseFilterDraft.open) {
    return '';
  }

  const fieldOptions = getCrossFilterFieldOptions();
  const operatorOptions = getCrossFilterOperatorOptions();
  const supportsRange = supportsCrossFilterRangeOperator(databaseFilterDraft.field);
  const supportsPendingValues = supportsCrossFilterPendingMultiValue(databaseFilterDraft.operator);
  const supportsCandidatePicker = supportsCrossFilterCandidatePicker(
    databaseFilterDraft.field,
    databaseFilterDraft.operator
  );
  const candidateValues = getDatabaseFilterCandidateValues();

  return `
    <div id="db-filter-mask" class="database-filter-mask">
      <div class="database-filter-popover" role="dialog" aria-modal="true">
        <div class="database-filter-popover-header">
          <div class="detail-section-title">${escapeHtml(t('database.filter.panelTitle'))}</div>
          <button id="db-filter-close-btn" class="text-btn" type="button">×</button>
        </div>
        <div class="cross-filter-draft-row ${supportsRange ? 'cross-filter-draft-row-range' : ''}">
          <select id="db-filter-field" class="form-input cross-filter-field-select">
            ${fieldOptions
              .map(
                (option) => `
                  <option value="${option.field}" ${databaseFilterDraft.field === option.field ? 'selected' : ''}>
                    ${option.label}
                  </option>
                `
              )
              .join('')}
          </select>
          ${
            supportsRange
              ? `
                  <select id="db-filter-operator" class="form-input cross-filter-operator-select">
                    ${operatorOptions
                      .map(
                        (option) => `
                          <option value="${option.operator}" ${databaseFilterDraft.operator === option.operator ? 'selected' : ''}>
                            ${option.label}
                          </option>
                        `
                      )
                      .join('')}
                  </select>
                `
              : ''
          }
          <input
            id="db-filter-value"
            class="form-input cross-filter-value-input"
            placeholder="${escapeHtml(
              supportsRange && databaseFilterDraft.operator !== 'eq'
                ? databaseFilterDraft.operator === 'between'
                  ? t('database.filter.rangeStart')
                  : t('database.filter.threshold')
                : getLocalizedCrossFilterFieldPlaceholder(databaseFilterDraft.field)
            )}"
            value="${escapeHtml(databaseFilterDraft.value)}"
          />
          ${
            supportsPendingValues
              ? `
                  <button id="db-filter-pending-add-btn" class="secondary-btn cross-filter-pending-add-btn" type="button">
                    ${escapeHtml(t('database.filter.addValue'))}
                  </button>
                `
              : ''
          }
          ${
            supportsRange && databaseFilterDraft.operator === 'between'
              ? `
                  <input
                    id="db-filter-value2"
                    class="form-input cross-filter-value-input"
                    placeholder="${escapeHtml(t('database.filter.rangeEnd'))}"
                    value="${escapeHtml(databaseFilterDraft.value2)}"
                  />
                `
              : ''
          }
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
                  ${databaseFilterDraft.pendingValues
                    .map(
                      (value) => `
                        <span class="cross-filter-pending-chip">
                          <span class="cross-filter-pending-chip-label">${escapeHtml(value)}</span>
                          <button
                            class="cross-filter-chip-remove"
                            type="button"
                            title="${escapeHtml(t('database.filter.removePendingValue'))}"
                            data-cross-filter-pending-remove="database::${encodeURIComponent(value)}"
                          >
                            ×
                          </button>
                        </span>
                      `
                    )
                    .join('')}
                </div>
                ${
                  supportsCandidatePicker
                    ? `
                        <div class="cross-filter-candidate-shell">
                          <div class="cross-filter-candidate-search-row">
                            <input
                              id="db-filter-candidate-search"
                              class="form-input cross-filter-candidate-search"
                              placeholder="${escapeHtml(t('database.filter.candidateSearchPlaceholder'))}"
                              value="${escapeHtml(databaseFilterCandidateQuery)}"
                            />
                            <span class="cross-filter-candidate-count">${escapeHtml(
                              t('database.filter.candidateCount', { count: candidateValues.length })
                            )}</span>
                          </div>
                          <div class="cross-filter-candidate-list">
                            ${
                              databaseFilterCandidateLoading
                                ? `<div class="cross-filter-candidate-empty">${escapeHtml(t('database.filter.candidateLoading'))}</div>`
                                : candidateValues.length
                                  ? candidateValues
                                      .map(
                                        (value) => `
                                          <label class="cross-filter-candidate-option">
                                            <input
                                              type="checkbox"
                                              data-cross-filter-candidate-toggle="database::${encodeURIComponent(value)}"
                                              ${databaseFilterDraft.pendingValues.includes(value) ? 'checked' : ''}
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
        <div class="database-filter-popover-actions">
          <button id="db-filter-apply-btn" class="primary-btn" type="button">
            ${escapeHtml(supportsPendingValues ? t('database.filter.apply') : t('database.filter.addCondition'))}
          </button>
          <button id="db-filter-cancel-btn" class="secondary-btn" type="button">${escapeHtml(t('database.filter.cancel'))}</button>
        </div>
      </div>
    </div>
  `;
}

function renderRelatedRecordItems(records: ExperimentListItem[]) {
  if (!records.length) {
    return `<div class="empty-tip">${escapeHtml(t('databaseDetail.relatedEmpty'))}</div>`;
  }

  return `
    <div class="detail-list">
      ${records
        .map(
          (record) => `
            <div class="detail-list-item">
              <div class="detail-list-key">${escapeHtml(record.displayName)}</div>
              <div class="detail-list-value">
                ${escapeHtml(t('database.card.sampleCode'))}：${escapeHtml(record.sampleCode)}<br />
                ${escapeHtml(t('database.card.testProject'))}：${escapeHtml(record.testProject)}<br />
                ${escapeHtml(t('database.card.tester'))}：${escapeHtml(record.tester)}
              </div>
              <button
                class="secondary-btn"
                type="button"
                data-open-related-detail-id="${record.id}"
              >
                ${escapeHtml(t('database.card.viewDetails'))}
              </button>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderRelatedRecordsSection() {
  if (currentRelatedRecordsLoading) {
    return `
      <div class="detail-section">
        <div class="detail-section-title">${escapeHtml(t('databaseDetail.section.relatedRecords'))}</div>
        <div class="detail-value">${escapeHtml(t('common.loading'))}</div>
      </div>
    `;
  }

  return `
    <div class="detail-section">
      <div class="detail-section-title">${escapeHtml(t('databaseDetail.section.relatedRecords'))}</div>
      <div class="detail-grid">
        <div>
          <div class="detail-section-title">${escapeHtml(t('databaseDetail.related.sameProject'))}</div>
          ${renderRelatedRecordItems(currentRelatedRecords.sameProject)}
        </div>
        <div>
          <div class="detail-section-title">${escapeHtml(t('databaseDetail.related.sameSampleCode'))}</div>
          ${renderRelatedRecordItems(currentRelatedRecords.sameSampleCode)}
        </div>
        <div>
          <div class="detail-section-title">${escapeHtml(t('databaseDetail.related.sameTester'))}</div>
          ${renderRelatedRecordItems(currentRelatedRecords.sameTester)}
        </div>
      </div>
    </div>
  `;
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
  await ensureDatabaseWorkspaceStateLoaded();

  const [detail, editHistory] = await Promise.all([
    window.electronAPI.getExperimentDetail(experimentId),
    window.electronAPI.listExperimentEditLogs({
      experimentId,
      limit: 5
    })
  ]);

  currentDetail = detail;
  currentEditHistory = editHistory;
  if (detail) {
    await reloadCurrentRelatedRecords(detail.id);
  }
  detailEditMode = false;
  detailEditReason = '';
  detailEditor = '';
  detailEditStep1 = null;
  detailEditStep2 = [];
  detailEditTemplateBlocks = [];
  resetTemplateBlockImportState('detail-edit');
  if (detail) {
    await reloadCurrentRelatedRecords(detail.id);
  } else {
    currentRelatedRecords = {
      sameProject: [],
      sameSampleCode: [],
      sameTester: []
    };
    currentRelatedRecordsLoading = false;
  }
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
    starredOnly: databaseStarredOnly,
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
      field: databaseFilterDraft.field,
      starredOnly: databaseStarredOnly
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
  closeDatabaseFrequentFiltersPopover();
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
  closeDatabaseFrequentFiltersPopover();
  closeDatabaseFilterDraft();
  await loadDatabaseList();
  await recordCurrentDatabaseWorkspaceUsage();
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

function isGenericStructuredBlockTitle(title: string) {
  const normalized = trimBlockTitle(title).toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    '结构化数据',
    '结构化数据块',
    '结构化曲线',
    '曲线/谱图数据',
    '曲线/谱图项',
    '未指定',
    'unnamed block',
    'structured data',
    'structured block',
    'structured curve',
    'curve/spectrum data',
    'curve/spectrum item'
  ].includes(normalized);
}

function getAnalysisStructuredBlockAxisMeta(block: ExperimentDetail['templateBlocks'][number]) {
  return {
    xLabel: block.templateType === XY_TEMPLATE_TYPE ? block.xLabel : block.spectrumAxisLabel,
    xUnit: block.templateType === XY_TEMPLATE_TYPE ? block.xUnit : block.spectrumAxisUnit,
    yLabel: block.templateType === XY_TEMPLATE_TYPE ? block.yLabel : block.signalLabel,
    yUnit: block.templateType === XY_TEMPLATE_TYPE ? block.yUnit : block.signalUnit
  };
}

function formatAnalysisAxisLabel(label: string, unit: string) {
  const trimmedLabel = label.trim() || '-';
  const trimmedUnit = unit.trim();
  return trimmedUnit ? `${trimmedLabel} (${trimmedUnit})` : trimmedLabel;
}

function buildAnalysisAxisPairSummary(
  xLabel: string,
  xUnit: string,
  yLabel: string,
  yUnit: string
) {
  return `X：${formatAnalysisAxisLabel(xLabel, xUnit)} · Y：${formatAnalysisAxisLabel(yLabel, yUnit)}`;
}

function getAnalysisStructuredBlockLegacyDisplayName(
  block: ExperimentDetail['templateBlocks'][number]
) {
  const purposeLabel = getStructuredBlockPurposeLabel(block.purposeType || '');
  const hasKnownPurpose = purposeLabel && purposeLabel !== '未指定';
  const trimmedTitle = trimBlockTitle(block.blockTitle);
  const hasSpecificTitle = trimmedTitle && !isGenericStructuredBlockTitle(trimmedTitle);
  const { xLabel, yLabel } = getAnalysisStructuredBlockAxisMeta(block);
  const axisSummary =
    [yLabel.trim(), xLabel.trim()].filter(Boolean).join(' - ') || t('step2.structured.sectionTitle');

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

function getAnalysisStructuredBlockDisplayName(
  block: ExperimentDetail['templateBlocks'][number],
  index = 0
) {
  const trimmedTitle = trimBlockTitle(block.blockTitle);
  const purposeLabel = getStructuredBlockPurposeLabel(block.purposeType || '');
  const hasMeaningfulTitle = trimmedTitle && !isGenericStructuredBlockTitle(trimmedTitle);
  const hasMeaningfulPurpose = purposeLabel && purposeLabel !== '未指定';

  if (hasMeaningfulTitle) {
    return trimmedTitle;
  }

  if (hasMeaningfulPurpose) {
    return purposeLabel;
  }

  return `${t('step2.structured.typeLabel')} ${index + 1}`;
}

function getAnalysisStructuredBlockOptionLabel(
  block: ExperimentDetail['templateBlocks'][number],
  index: number
) {
  const displayName = getAnalysisStructuredBlockDisplayName(block, index);
  const { xLabel, xUnit, yLabel, yUnit } = getAnalysisStructuredBlockAxisMeta(block);
  return `${displayName} · ${buildAnalysisAxisPairSummary(xLabel, xUnit, yLabel, yUnit)}`;
}

function findAnalysisStructuredBlockBySelectionName(
  blocks: ExperimentDetail['templateBlocks'],
  selectionName: string
) {
  return blocks.find((block, index) => {
    const displayName = getAnalysisStructuredBlockDisplayName(block, index);
    if (displayName === selectionName) {
      return true;
    }

    return getAnalysisStructuredBlockLegacyDisplayName(block) === selectionName;
  });
}

function getTemplateBlockReviewTitle(block: TemplateBlockFormData, index: number) {
  const trimmedTitle = trimBlockTitle(block.blockTitle);
  const purposeLabel = getStructuredBlockPurposeLabel(block.purposeType || '');
  const hasMeaningfulTitle = trimmedTitle && !isGenericStructuredBlockTitle(trimmedTitle);
  const hasMeaningfulPurpose = purposeLabel && purposeLabel !== '未指定';

  if (hasMeaningfulTitle) {
    return trimmedTitle;
  }

  if (hasMeaningfulPurpose) {
    return purposeLabel;
  }

  return `${t('step2.structured.typeLabel')} ${index + 1}`;
}

function getTemplateBlockReviewOrdinal(index: number) {
  return `#${index + 1}`;
}

function getAnalysisStructuredBlockNameOptions(recordIds: number[]) {
  if (!recordIds.length) {
    return [];
  }

  const optionMap = new Map<string, { value: string; label: string }>();
  analysisRecords
    .filter((entry) => recordIds.includes(entry.listItem.id))
    .forEach((entry) => {
      entry.detail.templateBlocks.forEach((block, index) => {
        const value = getAnalysisStructuredBlockDisplayName(block, index);
        if (!optionMap.has(value)) {
          optionMap.set(value, {
            value,
            label: getAnalysisStructuredBlockOptionLabel(block, index)
          });
        }
      });
    });

  return Array.from(optionMap.values()).sort((left, right) =>
    left.value.localeCompare(right.value, 'zh-CN')
  );
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

function pickSingleAnalysisOption(
  options: Array<string | { value: string }>,
  currentValue: string
) {
  const values = options.map((option) => (typeof option === 'string' ? option : option.value));

  if (values.includes(currentValue)) {
    return currentValue;
  }

  return values.length === 1 ? values[0] : '';
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
    return { error: '所选记录中的轴单位不一致，当前数值图不会自动混合不兼容单位' };
  }

  const xUnit = Array.from(xUnits)[0] || '';
  const yUnit = Array.from(yUnits)[0] || '';
  const xSourceLabel = getAnalysisStep1FieldLabel(composer.step1FieldKey);
  const xSourceValue = `step1:${composer.step1FieldKey}`;

  if (chart.scalarSeries.length) {
    const firstSeries = chart.scalarSeries[0];

    if (firstSeries.xMode !== xMode || firstSeries.xSourceValue !== xSourceValue) {
      return { error: '同一张数值图中的多条序列必须共享相同的 X 轴来源' };
    }

    if (
      normalizeAnalysisUnit(firstSeries.xUnit) !== normalizeAnalysisUnit(xUnit) ||
      normalizeAnalysisUnit(firstSeries.yUnit) !== normalizeAnalysisUnit(yUnit)
    ) {
      return { error: '同一张数值图中的多条序列不能静默混用不同单位' };
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

  const blockIndex = entry.detail.templateBlocks.findIndex((item) => item.id === block.id);
  const { xLabel, xUnit, yLabel, yUnit } = getAnalysisStructuredBlockAxisMeta(block);
  const defaultName = getAnalysisStructuredBlockDisplayName(block, blockIndex >= 0 ? blockIndex : 0);
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
    const matchedBlock = entry?.detail
      ? findAnalysisStructuredBlockBySelectionName(
          entry.detail.templateBlocks,
          composer.selectedBlockName
        )
      : undefined;

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
    return { error: '当前选择下没有可绘制的曲线/谱图数据，请更换记录或曲线/谱图项。', skippedRecordIds };
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
    messages.push('包含未指定曲线数据类型的曲线/谱图项，请谨慎解释叠加结果');
  }

  if (purposeSet.size > 1) {
    messages.push('当前曲线图混合了多种曲线数据类型，v1 仅提供并列可视化，不做自动语义对齐');
  }

  if (xMetaSet.size > 1 || yMetaSet.size > 1) {
    messages.push('当前曲线图的坐标标签或单位不完全一致，图中仍按各序列原始元数据显示');
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
            sourceBlockDisplayName: buildResult.series.sourceBlockDisplayName
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

function getAnalysisHandoffSelectedRecordIds() {
  if (!analysisHandoffRecordIds.length) {
    return [];
  }

  const availableRecordIds = new Set(analysisRecords.map((entry) => entry.listItem.id));
  return analysisHandoffRecordIds.filter((recordId) => availableRecordIds.has(recordId));
}

function clearAnalysisHandoffSelection() {
  analysisHandoffRecordIds = [];
}

function renderAnalysisHandoffNotice() {
  const handoffRecordIds = getAnalysisHandoffSelectedRecordIds();
  if (!handoffRecordIds.length) {
    return '';
  }

  return `
    <div class="name-preview-card">
      <div class="name-preview-label">${escapeHtml(t('database.analysisHandoff.noticeTitle'))}</div>
      <div class="name-preview-value">${escapeHtml(t('database.analysisHandoff.noticeBody', { count: handoffRecordIds.length }))}</div>
    </div>
  `;
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
  const handoffSelectedRecordIds = getAnalysisHandoffSelectedRecordIds();
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
          selectedRecordIds: [...handoffSelectedRecordIds],
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
          selectedRecordIds: [...handoffSelectedRecordIds],
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
        .map((block, index) => {
          const { xLabel, xUnit, yLabel, yUnit } = getAnalysisStructuredBlockAxisMeta(block);

          return `
            <div class="analysis-summary-item ${block.id === activeBlockId ? 'active' : ''}">
              <div class="analysis-summary-key">${escapeHtml(getAnalysisStructuredBlockDisplayName(block, index))}</div>
              <div class="analysis-summary-value">
                ${escapeHtml(getStructuredBlockPurposeLabel(block.purposeType || ''))}
                · ${escapeHtml(formatAnalysisAxisLabel(xLabel, xUnit))}
                → ${escapeHtml(formatAnalysisAxisLabel(yLabel, yUnit))}
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
                    ${chart.chartType === 'structured'
                      ? `
                          <div class="analysis-legend-meta">
                            ${escapeHtml((series as AnalysisStructuredSeries).recordDisplayName)}
                            ·
                            ${escapeHtml(
                              buildAnalysisAxisPairSummary(
                                (series as AnalysisStructuredSeries).xLabel,
                                (series as AnalysisStructuredSeries).xUnit,
                                (series as AnalysisStructuredSeries).yLabel,
                                (series as AnalysisStructuredSeries).yUnit
                              )
                            )}
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
  const currentBlockIndex = detail.templateBlocks.findIndex((block) => block.id === inspector.blockId);
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
  const currentBlockDisplayName = currentBlock
    ? getAnalysisStructuredBlockDisplayName(currentBlock, currentBlockIndex >= 0 ? currentBlockIndex : 0)
    : inspector.seriesName;

  return `
    <div class="analysis-inspector-title">${escapeHtml(t('analysis.inspector.currentStructured'))}</div>
    ${renderAnalysisSection(t('analysis.section.recordOverview'), metadataSection)}
    ${renderAnalysisSection(t('analysis.section.primaryInfo'), step1Section)}
    ${renderAnalysisSection(t('analysis.section.conditions'), renderAnalysisDataList(conditionItems, t('step2.condition.empty')))}
    ${renderAnalysisSection(
      t('analysis.section.currentStructured'),
      renderAnalysisDataList([
        { label: t('analysis.label.chart'), value: inspector.chartTitle },
        { label: t('analysis.label.block'), value: currentBlockDisplayName },
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
                (option) => `
                  <option value="${escapeHtml(option.value)}" ${composer.selectedBlockName === option.value ? 'selected' : ''}>
                    ${escapeHtml(option.label)}
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
      closeDatabaseFrequentFiltersPopover();
      await loadDatabaseList();
      await recordCurrentDatabaseWorkspaceUsage();
      void render();
    });
  });

  document.getElementById('db-filter-clear-btn')?.addEventListener('click', async () => {
    databaseCrossFilters = [];
    closeDatabaseFrequentFiltersPopover();
    closeDatabaseFilterDraft();
    await loadDatabaseList();
    await recordCurrentDatabaseWorkspaceUsage();
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

  document.getElementById('db-filter-close-btn')?.addEventListener('click', () => {
    closeDatabaseFilterDraft();
    void renderPreservingContentScroll();
  });

  document.getElementById('db-filter-mask')?.addEventListener('click', (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

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
    clearAnalysisHandoffSelection();
    currentView = 'home';
    void render();
  });

  document.getElementById('analysis-menu-add')?.addEventListener('click', async () => {
    clearAnalysisHandoffSelection();
    await openAddDataEntry();
  });

  document.getElementById('analysis-menu-data')?.addEventListener('click', async () => {
    clearAnalysisHandoffSelection();
    await loadDatabaseListView();
    currentView = 'database-list';
    void render();
  });

  document.getElementById('analysis-menu-settings')?.addEventListener('click', () => {
    clearAnalysisHandoffSelection();
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

  const discardResult = await window.electronAPI.discardActiveEntryDraft();
  if (!discardResult.success) {
    console.error('discard active draft after save failed:', discardResult.error);
    await reloadActiveEntryDraft();
    alert(t('draft.discardAfterSaveFailed'));
  } else {
    activeEntryDraft = null;
    activeEntryDraftLoaded = true;
    activeEntryDraftLoadPromise = null;
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
  document.querySelectorAll<HTMLElement>('[data-preserve-scroll-key]').forEach((element) => {
    const key = element.dataset.preserveScrollKey;
    if (!key) {
      return;
    }

    preservedUiScrollPositions[key] = {
      left: element.scrollLeft,
      top: element.scrollTop
    };
  });

  await render();

  const nextContentArea = document.querySelector('.content-area') as HTMLElement | null;
  if (nextContentArea) {
    nextContentArea.scrollTop = scrollTop;
  }

  document.querySelectorAll<HTMLElement>('[data-preserve-scroll-key]').forEach((element) => {
    const key = element.dataset.preserveScrollKey;
    if (!key) {
      return;
    }

    const position = preservedUiScrollPositions[key];
    if (!position) {
      return;
    }

    element.scrollLeft = position.left;
    element.scrollTop = position.top;
  });
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
  const normalizedQuery = query.toLowerCase();
  const recentValues =
    dictionaryType === 'testProject'
      ? recentEntrySuggestions.testProjects
      : dictionaryType === 'instrument'
        ? recentEntrySuggestions.instruments
        : [];
  const dictionaryValues =
    dictionaryItems[dictionaryType].filter((item) => item.isActive).map((item) => item.value);
  const familyValues =
    dictionaryType === 'testProject' && templateLibraryResolved
      ? (() => {
          if (!query) {
            return [...templateLibraryResolved.activeScientificTemplates]
              .sort((left, right) => {
                const leftPriority = left.sourceType === 'user' ? 0 : 1;
                const rightPriority = right.sourceType === 'user' ? 0 : 1;
                if (leftPriority !== rightPriority) {
                  return leftPriority - rightPriority;
                }

                return left.displayName.localeCompare(right.displayName, 'zh-CN');
              })
              .map((family) => family.displayName);
          }

          return findScientificFamiliesForTestProject(query, templateLibraryResolved)
            .filter((item) => item.score > 0)
            .sort((left, right) => {
              const leftPriority = left.family.sourceType === 'user' ? 0 : 1;
              const rightPriority = right.family.sourceType === 'user' ? 0 : 1;
              if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
              }

              if (right.score !== left.score) {
                return right.score - left.score;
              }

              return left.family.displayName.localeCompare(right.family.displayName, 'zh-CN');
            })
            .map((item) => item.family.displayName);
        })()
      : [];

  if (!query) {
    return Array.from(new Set([...recentValues, ...familyValues, ...dictionaryValues])).slice(0, STEP1_SUGGESTION_RESULT_LIMIT);
  }

  const dictionaryMatches = dictionaryValues.filter((value) => value.toLowerCase().includes(normalizedQuery));
  const recentMatches = recentValues.filter((value) => value.toLowerCase().includes(normalizedQuery));
  const familyMatches = familyValues.filter((value) => value.toLowerCase().includes(normalizedQuery));

  return Array.from(new Set([...familyMatches, ...recentMatches, ...dictionaryMatches])).slice(
    0,
    STEP1_SUGGESTION_RESULT_LIMIT
  );
}

function splitLocalDateTimeValue(value: string) {
  if (!value) {
    return { date: '', time: '' };
  }

  if (value.includes('T')) {
    const [datePart, timePart] = value.split('T');
    return {
      date: datePart || '',
      time: (timePart || '').slice(0, 5)
    };
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return { date: '', time: '' };
  }

  return {
    date: `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`,
    time: `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`
  };
}

function buildLocalDateTimeValue(date: string, time: string) {
  if (!date && !time) {
    return '';
  }

  if (!date) {
    return '';
  }

  return `${date}T${time ? time.slice(0, 5) : ''}`;
}

function hasCompleteLocalDateTimeValue(value: string) {
  const { date, time } = splitLocalDateTimeValue(value);
  return Boolean(date && time);
}

function pad2(value: number | string) {
  return String(value).padStart(2, '0');
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getDefaultDateTimePickerParts(value: string) {
  const parsed = splitLocalDateTimeValue(value);
  const now = new Date();
  const fallbackDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const fallbackTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const [year, month, day] = (parsed.date || fallbackDate).split('-');
  const [hour, minute] = (parsed.time || fallbackTime).split(':');

  return {
    year: year || String(now.getFullYear()),
    month: month || pad2(now.getMonth() + 1),
    day: day || pad2(now.getDate()),
    hour: hour || pad2(now.getHours()),
    minute: minute || pad2(now.getMinutes())
  };
}

function shiftCalendarMonth(year: number, month: number, delta: number) {
  const shifted = new Date(year, month - 1 + delta, 1);
  return {
    year: shifted.getFullYear(),
    month: shifted.getMonth() + 1
  };
}

function formatLocalDateTimePickerDisplay(value: string) {
  const { date, time } = splitLocalDateTimeValue(value);

  if (!date && !time) {
    return t('step1.testTime.placeholder');
  }

  if (!date) {
    return time;
  }

  if (!time) {
    return `${date} --:--`;
  }

  return `${date} ${time}`;
}

function buildDateTimeCalendarLabel(year: number, month: number) {
  return `${year}-${pad2(month)}`;
}

function buildDateTimeCalendarGrid(
  baseId: string,
  viewYear: number,
  viewMonth: number,
  selectedValue: string
) {
  const selectedParts = splitLocalDateTimeValue(selectedValue);
  const [selectedYear, selectedMonth, selectedDay] = selectedParts.date
    ? selectedParts.date.split('-').map((part) => Number(part))
    : [0, 0, 0];
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
  const dayCount = getDaysInMonth(viewYear, viewMonth);
  const today = new Date();
  const cells: string[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push('<span class="datetime-picker-day-cell datetime-picker-day-placeholder"></span>');
  }

  for (let day = 1; day <= dayCount; day += 1) {
    const isSelected = selectedYear === viewYear && selectedMonth === viewMonth && selectedDay === day;
    const isToday =
      today.getFullYear() === viewYear &&
      today.getMonth() + 1 === viewMonth &&
      today.getDate() === day;

    cells.push(`
      <button
        type="button"
        class="datetime-picker-day-cell datetime-picker-day-btn ${isSelected ? 'selected' : ''} ${
          isToday ? 'today' : ''
        }"
        data-datetime-picker-base="${baseId}"
        data-datetime-picker-day="${day}"
      >
        ${day}
      </button>
    `);
  }

  const trailingCount = (7 - (cells.length % 7)) % 7;
  for (let index = 0; index < trailingCount; index += 1) {
    cells.push('<span class="datetime-picker-day-cell datetime-picker-day-placeholder"></span>');
  }

  return cells.join('');
}

const DATETIME_PICKER_WHEEL_REPEAT_COUNT = 5;

function renderDateTimePickerWheel(
  id: string,
  wheelType: 'hour' | 'minute',
  label: string,
  value: string,
  options: Array<{ value: string; label: string }>
) {
  return `
    <div class="datetime-picker-select-group">
      <div class="datetime-picker-select-label">${escapeHtml(label)}</div>
      <div class="datetime-picker-wheel-shell">
        <div
          id="${id}"
          class="datetime-picker-wheel-list"
          tabindex="0"
          role="listbox"
          aria-label="${escapeHtml(label)}"
          data-datetime-picker-wheel="${wheelType}"
          data-datetime-picker-selected-value="${escapeHtml(value)}"
        >
          ${Array.from({ length: DATETIME_PICKER_WHEEL_REPEAT_COUNT }, (_, repeatIndex) =>
            options
              .map(
                (option) => `
                  <button
                    type="button"
                    class="datetime-picker-wheel-option ${option.value === value &&
                    repeatIndex === Math.floor(DATETIME_PICKER_WHEEL_REPEAT_COUNT / 2)
                      ? 'selected'
                      : ''}"
                    data-datetime-picker-wheel="${wheelType}"
                    data-datetime-picker-wheel-value="${escapeHtml(option.value)}"
                    aria-selected="${option.value === value &&
                    repeatIndex === Math.floor(DATETIME_PICKER_WHEEL_REPEAT_COUNT / 2)
                      ? 'true'
                      : 'false'}"
                  >
                    ${escapeHtml(option.label)}
                  </button>
            `
              )
              .join('')
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderDateTimePicker(baseId: string, value: string) {
  const displayValue = formatLocalDateTimePickerDisplay(value);
  const hasValue = hasCompleteLocalDateTimeValue(value);
  const pickerParts = getDefaultDateTimePickerParts(value);
  const initialViewYear = Number(pickerParts.year);
  const initialViewMonth = Number(pickerParts.month);
  const hourOptions = Array.from({ length: 24 }, (_, index) => {
    const hourValue = pad2(index);
    return { value: hourValue, label: hourValue };
  });
  const minuteOptions = Array.from({ length: 60 }, (_, index) => {
    const minuteValue = pad2(index);
    return { value: minuteValue, label: minuteValue };
  });

  return `
    <div id="${baseId}PickerShell" class="datetime-picker-shell">
      <input id="${baseId}Value" type="hidden" value="${escapeHtml(value)}" />
      <input id="${baseId}PickerViewYear" type="hidden" value="${initialViewYear}" />
      <input id="${baseId}PickerViewMonth" type="hidden" value="${pad2(initialViewMonth)}" />
      <input id="${baseId}PickerDraftDay" type="hidden" value="${pickerParts.day}" />
      <div class="datetime-picker-field-row">
        <input
          id="${baseId}PickerDisplay"
          class="form-input datetime-picker-display ${hasValue ? '' : 'datetime-picker-display-placeholder'}"
          value="${escapeHtml(displayValue)}"
          placeholder="${escapeHtml(t('step1.testTime.placeholder'))}"
          readonly
        />
        <button
          id="${baseId}PickerTrigger"
          class="secondary-btn datetime-picker-icon-btn"
          type="button"
          aria-expanded="false"
          aria-haspopup="dialog"
          title="${escapeHtml(t('step1.testTime.openPicker'))}"
          aria-label="${escapeHtml(t('step1.testTime.openPicker'))}"
        >
          ◷
        </button>
      </div>
      <div id="${baseId}PickerPopover" class="datetime-picker-popover" role="dialog" aria-modal="false">
        <div class="datetime-picker-preview" id="${baseId}PickerPreview">${escapeHtml(
          hasValue
            ? displayValue
            : `${pickerParts.year}-${pickerParts.month}-${pickerParts.day} ${pickerParts.hour}:${pickerParts.minute}`
        )}</div>
        <div class="datetime-picker-main">
          <div class="datetime-picker-calendar-panel">
            <div class="datetime-picker-calendar-header">
              <button
                id="${baseId}PickerPrevMonth"
                class="secondary-btn datetime-picker-nav-btn"
                type="button"
                title="${escapeHtml(t('step1.testTime.prevMonth'))}"
                aria-label="${escapeHtml(t('step1.testTime.prevMonth'))}"
              >
                ‹
              </button>
              <div id="${baseId}PickerCalendarLabel" class="datetime-picker-calendar-label">${escapeHtml(
                buildDateTimeCalendarLabel(initialViewYear, initialViewMonth)
              )}</div>
              <button
                id="${baseId}PickerNextMonth"
                class="secondary-btn datetime-picker-nav-btn"
                type="button"
                title="${escapeHtml(t('step1.testTime.nextMonth'))}"
                aria-label="${escapeHtml(t('step1.testTime.nextMonth'))}"
              >
                ›
              </button>
            </div>
            <div class="datetime-picker-weekday-row">
              <span>${escapeHtml(t('step1.testTime.weekdaySun'))}</span>
              <span>${escapeHtml(t('step1.testTime.weekdayMon'))}</span>
              <span>${escapeHtml(t('step1.testTime.weekdayTue'))}</span>
              <span>${escapeHtml(t('step1.testTime.weekdayWed'))}</span>
              <span>${escapeHtml(t('step1.testTime.weekdayThu'))}</span>
              <span>${escapeHtml(t('step1.testTime.weekdayFri'))}</span>
              <span>${escapeHtml(t('step1.testTime.weekdaySat'))}</span>
            </div>
            <div
              id="${baseId}PickerCalendarGrid"
              class="datetime-picker-calendar-grid"
            >
              ${buildDateTimeCalendarGrid(baseId, initialViewYear, initialViewMonth, value)}
            </div>
          </div>
          <div class="datetime-picker-time-panel">
            <div class="datetime-picker-time-title">${escapeHtml(t('step1.testTime.timeLabel'))}</div>
            <div class="datetime-picker-grid datetime-picker-grid-time">
              ${renderDateTimePickerWheel(
                `${baseId}HourWheel`,
                'hour',
                t('step1.testTime.hourLabel'),
                pickerParts.hour,
                hourOptions
              )}
              ${renderDateTimePickerWheel(
                `${baseId}MinuteWheel`,
                'minute',
                t('step1.testTime.minuteLabel'),
                pickerParts.minute,
                minuteOptions
              )}
            </div>
          </div>
        </div>
        <div class="datetime-picker-actions">
          <button id="${baseId}PickerClear" class="text-btn" type="button">${escapeHtml(t('common.clear'))}</button>
          <button id="${baseId}PickerDone" class="secondary-btn database-toolbar-btn" type="button">${escapeHtml(
            t('common.done')
          )}</button>
        </div>
      </div>
    </div>
  `;
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
      (value) => `
        <button
          type="button"
          class="step1-suggestion-item"
          data-step1-suggestion-value="${escapeHtml(value)}"
        >
          ${escapeHtml(value)}
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

function buildScalarTemplateDataItem(
  role: ScalarItemRole,
  template: Pick<ScalarItemTemplate, 'displayName' | 'unitDefault' | 'defaultValue'>
) {
  return {
    ...buildEmptyDataItem(role),
    itemName: template.displayName || '',
    itemUnit: template.unitDefault || '',
    itemValue: template.defaultValue || ''
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

function getMatchedScientificFamilyForTestProject(testProject: string) {
  ensureTemplateLibraryLoadedForStructuredBlocks();
  if (!templateLibraryResolved || !testProject.trim()) {
    return null;
  }

  return findExactScientificFamilyForTestProject(testProject, templateLibraryResolved);
}

function getResolvedStep2ScientificFamily(
  context: ScalarItemEditContext | TemplateBlockEditContext | 'detail-readonly'
) {
  return getMatchedScientificFamilyForTestProject(getStep2TemplateContext(context));
}

function getActiveStep2TemplateFamily(
  context: ScalarItemEditContext | TemplateBlockEditContext | 'detail-readonly'
) {
  const resolvedFamily = getResolvedStep2ScientificFamily(context);
  if (resolvedFamily) {
    return {
      id: resolvedFamily.id,
      displayName: resolvedFamily.displayName,
      description: resolvedFamily.description || ''
    };
  }

  return null;
}

function getLocalizedTemplateFamilyLabel(
  family: Pick<ScientificTestTemplate, 'id' | 'displayName'>
) {
  return family.id === 'generic' ? t('step2.templateContext.family.generic') : family.displayName;
}

function getScalarTemplateRecommendations(
  context: ScalarItemEditContext,
  role: ScalarItemRole,
  options?: {
    limit?: number;
    query?: string;
  }
) {
  if (!templateLibraryResolved) {
    ensureTemplateLibraryLoadedForScalarSections();
    return [] as ScalarTemplateRecommendation[];
  }

  const testProject = getStep2TemplateContext(context);
  const section: ScalarTemplateSection = role === 'condition' ? 'condition' : 'metric';
  const matchedFamily = findExactScientificFamilyForTestProject(testProject, templateLibraryResolved);
  if (!matchedFamily) {
    return [] as ScalarTemplateRecommendation[];
  }

  return findScalarTemplatesForFamily(matchedFamily.id, templateLibraryResolved, {
    section,
    query: options?.query,
    limit: options?.limit
  });
}

function getScalarTemplateFamilyLabelForStep2(recommendation: ScalarTemplateRecommendation) {
  return (
    recommendation.family?.displayName ||
    getTemplateLibraryFamilyById(recommendation.scalarTemplate.familyId)?.displayName ||
    recommendation.scalarTemplate.familyId
  );
}

function normalizeScalarItemNameForDuplicateCheck(value: string) {
  return value.trim().toLowerCase();
}

function hasScalarTemplateNameInSection(
  context: ScalarItemEditContext,
  role: ScalarItemRole,
  displayName: string
) {
  const normalizedTarget = normalizeScalarItemNameForDuplicateCheck(displayName);
  if (!normalizedTarget) {
    return false;
  }

  return getScalarItemsForContext(context).some(
    (row) =>
      (row.scalarRole || 'metric') === role &&
      normalizeScalarItemNameForDuplicateCheck(row.itemName) === normalizedTarget
  );
}

function toggleStep2ScalarTemplatePicker(
  context: ScalarItemEditContext,
  role: ScalarItemRole
) {
  const isOpen =
    step2ScalarTemplatePicker?.context === context && step2ScalarTemplatePicker?.role === role;

  step2ScalarTemplatePicker = isOpen
    ? null
    : {
        context,
        role,
        query: ''
      };
}

function addScalarItemFromTemplate(
  context: ScalarItemEditContext,
  role: ScalarItemRole,
  templateId: string
) {
  if (!templateLibraryResolved) {
    return;
  }

  const template = templateLibraryResolved.activeScalarTemplates.find((item) => item.id === templateId);
  if (!template) {
    return;
  }

  if (template.section !== (role === 'condition' ? 'condition' : 'metric')) {
    return;
  }

  if (hasScalarTemplateNameInSection(context, role, template.displayName)) {
    alert(t('step2.scalar.duplicateNameExists'));
    return;
  }

  setScalarItemsForContext(context, [
    ...getScalarItemsForContext(context),
    buildScalarTemplateDataItem(role, template)
  ]);
  step2ScalarTemplatePicker = null;
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

function renderScalarTemplateAssist(
  context: ScalarItemEditContext,
  role: ScalarItemRole
) {
  const commonRecommendations = getScalarTemplateRecommendations(context, role, { limit: 6 });
  const pickerOpen =
    step2ScalarTemplatePicker?.context === context && step2ScalarTemplatePicker?.role === role;
  const pickerQuery = pickerOpen ? step2ScalarTemplatePicker?.query || '' : '';
  const pickerResults = pickerOpen
    ? getScalarTemplateRecommendations(context, role, {
        query: pickerQuery,
        limit: pickerQuery.trim() ? 24 : 12
      })
    : [];
  const commonLabel =
    role === 'condition' ? t('step2.scalar.commonConditions') : t('step2.scalar.commonMetrics');
  const pickerTitle =
    role === 'condition'
      ? t('step2.scalar.selectConditionTemplate')
      : t('step2.scalar.selectMetricTemplate');

  return `
    ${
      commonRecommendations.length
        ? `
          <div class="step2-template-recommendation-row">
            <div class="step2-template-recommendation-label">${escapeHtml(commonLabel)}</div>
            <div class="step2-template-recommendation-list">
              ${commonRecommendations
                .map((recommendation) => {
                  const template = recommendation.scalarTemplate;
                  const alreadyAdded = hasScalarTemplateNameInSection(context, role, template.displayName);
                  const defaultUnit = template.unitDefault ? ` · ${template.unitDefault}` : '';

                  return `
                    <button
                      class="step2-template-pill ${alreadyAdded ? 'step2-template-pill-disabled' : ''}"
                      type="button"
                      data-step2-scalar-template-add="${escapeHtml(template.id)}"
                      data-step2-scalar-template-context="${escapeHtml(context)}"
                      data-step2-scalar-template-role="${escapeHtml(role)}"
                      ${alreadyAdded ? 'disabled' : ''}
                    >
                      <span>+ ${escapeHtml(template.displayName)}${escapeHtml(defaultUnit)}</span>
                      ${
                        alreadyAdded
                          ? `<span class="step2-template-pill-meta">${escapeHtml(t('step2.scalar.added'))}</span>`
                          : ''
                      }
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>
        `
        : ''
    }
    ${
      pickerOpen
        ? `
          <div class="detail-section step2-template-picker-shell">
            <div class="step2-template-picker-header">
              <div class="detail-section-title">${escapeHtml(pickerTitle)}</div>
              <button
                class="secondary-btn step2-template-picker-toggle-btn"
                type="button"
                data-step2-scalar-picker-toggle="${escapeHtml(`${context}:${role}`)}"
              >
                ${escapeHtml(t('common.done'))}
              </button>
            </div>
            <input
              class="form-input"
              data-step2-scalar-picker-search="${escapeHtml(`${context}:${role}`)}"
              value="${escapeHtml(pickerQuery)}"
              placeholder="${escapeHtml(t('step2.scalar.searchTemplates'))}"
            />
            <div
              class="template-library-result-grid step2-template-picker-grid"
              data-preserve-scroll-key="${escapeHtml(`step2-template-picker:${context}:${role}`)}"
            >
              ${
                pickerResults.length
                  ? pickerResults
                      .map((recommendation) => {
                        const template = recommendation.scalarTemplate;
                        const alreadyAdded = hasScalarTemplateNameInSection(
                          context,
                          role,
                          template.displayName
                        );

                        return `
                          <button
                            type="button"
                            class="template-library-search-item ${alreadyAdded ? 'template-library-search-item-disabled' : ''}"
                            data-step2-scalar-template-add="${escapeHtml(template.id)}"
                            data-step2-scalar-template-context="${escapeHtml(context)}"
                            data-step2-scalar-template-role="${escapeHtml(role)}"
                            ${alreadyAdded ? 'disabled' : ''}
                          >
                            <div class="template-library-search-item-main">
                              <span class="template-library-search-item-title">${escapeHtml(template.displayName)}</span>
                              <span class="template-library-chip">${escapeHtml(
                                role === 'condition'
                                  ? t('templateLibrary.resultType.condition')
                                  : t('templateLibrary.resultType.metric')
                              )}</span>
                            </div>
                            <div class="template-library-search-item-meta">
                              ${
                                template.unitDefault
                                  ? `<span class="template-library-chip">${escapeHtml(
                                      `${t('templateLibrary.field.unitDefault')}: ${template.unitDefault}`
                                    )}</span>`
                                  : ''
                              }
                              <span class="template-library-chip">${escapeHtml(
                                getTemplateLibrarySourceTypeLabel(
                                  getTemplateLibraryEffectiveSourceType(template, 'scalar')
                                )
                              )}</span>
                              ${
                                alreadyAdded
                                  ? `<span class="template-library-chip">${escapeHtml(
                                      t('step2.scalar.added')
                                    )}</span>`
                                  : ''
                              }
                            </div>
                            <div class="template-library-search-item-subtitle">${escapeHtml(
                              getScalarTemplateFamilyLabelForStep2(recommendation)
                            )}</div>
                          </button>
                        `;
                      })
                      .join('')
                  : `<div class="empty-tip">${escapeHtml(t('step2.scalar.noMatchingTemplates'))}</div>`
              }
            </div>
          </div>
        `
        : ''
    }
  `;
}

function renderStructuredRecommendationButtons(context: TemplateBlockEditContext) {
  const previews = getStructuredCurveTemplateOptions(context).slice(0, 6);
  if (!previews.length) {
    return '';
  }

  return `
    <div class="step2-template-recommendation-row">
      <div class="step2-template-recommendation-label">${escapeHtml(t('step2.structured.recommendationLabel'))}</div>
      <div class="step2-template-recommendation-list">
        ${previews
          .map(
            (item) => `
              <button
                class="step2-template-pill"
                type="button"
                data-template-block-context="${context}"
                data-template-block-curve-template-add="${escapeHtml(item.curveTemplateId)}"
              >
                <span>+ ${escapeHtml(item.displayName)}</span>
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

function normalizeStructuredTemplateField(value: string) {
  return value.trim().toLowerCase();
}

function isGenericStructuredAxisLabel(
  value: string,
  axis: 'primary' | 'secondary'
) {
  const normalized = normalizeStructuredTemplateField(value);
  if (!normalized) {
    return true;
  }

  return axis === 'primary'
    ? GENERIC_PRIMARY_AXIS_LABELS.has(normalized)
    : GENERIC_SECONDARY_AXIS_LABELS.has(normalized);
}

function getStructuredFamilyContextDisplay(
  context: TemplateBlockEditContext | 'detail-readonly'
) {
  const testProject = getStep2TemplateContext(context);
  const matchedFamily = getResolvedStep2ScientificFamily(context);
  return {
    testProject,
    matchedFamily,
    familyLabel: matchedFamily?.displayName || ''
  };
}

function getDefaultStructuredPurposeTypeForContext(context: TemplateBlockEditContext) {
  ensureTemplateLibraryLoadedForStructuredBlocks();
  const matchedFamily = getResolvedStep2ScientificFamily(context);
  if (matchedFamily && templateLibraryResolved) {
    const familyCurves = findCurveTemplatesForFamily(matchedFamily.id, templateLibraryResolved, { limit: 1 });
    if (familyCurves[0]?.curveTemplate.purposeType) {
      return familyCurves[0].curveTemplate.purposeType;
    }
  }

  return 'custom';
}

function buildTemplateBlockFromCurveTemplatePreview(preview: TemplateApplicationPreview) {
  return {
    ...buildEmptyTemplateBlock(XY_TEMPLATE_TYPE),
    purposeType: preview.purposeType || 'custom',
    blockTitle: preview.blockTitleDefault,
    primaryLabel: preview.axisDefaults.primaryLabel,
    primaryUnit: preview.axisDefaults.primaryUnit,
    secondaryLabel: preview.axisDefaults.secondaryLabel,
    secondaryUnit: preview.axisDefaults.secondaryUnit,
    appliedCurveTemplateId: preview.curveTemplateId
  };
}

function ensureTemplateLibraryLoadedForStructuredBlocks() {
  if (templateLibraryLoaded || templateLibraryLoadPromise) {
    return;
  }

  void ensureTemplateLibraryLoaded()
    .then(() => {
      requestRender(true);
    })
    .catch(() => {
      requestRender(true);
    });
}

function ensureTemplateLibraryLoadedForScalarSections() {
  if (templateLibraryLoaded || templateLibraryLoadPromise) {
    return;
  }

  void ensureTemplateLibraryLoaded()
    .then(() => {
      requestRender(true);
    })
    .catch(() => {
      requestRender(true);
    });
}

function getStructuredCurveTemplateOptions(
  context: TemplateBlockEditContext
) {
  ensureTemplateLibraryLoadedForStructuredBlocks();

  if (!templateLibraryResolved) {
    return [] as TemplateApplicationPreview[];
  }

  const matchedFamily = getResolvedStep2ScientificFamily(context);
  if (!matchedFamily) {
    return [] as TemplateApplicationPreview[];
  }

  return findCurveTemplatesForFamily(matchedFamily.id, templateLibraryResolved, { limit: 50 }).map((item) =>
    getTemplateApplicationPreview(item.curveTemplate, templateLibraryResolved)
  );
}

function getAppliedStructuredCurveTemplateOption(
  context: TemplateBlockEditContext,
  block: TemplateBlockFormData
) {
  if (block.appliedCurveTemplateId) {
    return (
      getStructuredCurveTemplateOptions(context).find(
        (item) => item.curveTemplateId === block.appliedCurveTemplateId
      ) || null
    );
  }

  return null;
}

function getImportMemoryFileExtension(block: TemplateBlockFormData) {
  const fileName =
    block.importPreviewSelectedName ||
    block.originalFileName ||
    block.replacementOriginalName ||
    block.sourceFileName ||
    '';
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return '';
  }

  return fileName.slice(lastDotIndex + 1).trim().toLowerCase();
}

function buildTemplateBlockImportParsingSettings(
  review: ImportReviewManualState
) {
  return {
    textEncoding: review.textEncoding,
    delimiter: review.delimiter,
    dataStartRow: review.dataStartRow,
    dataEndRow: review.dataEndRow || undefined,
    hasExplicitEndRow: Boolean(review.dataEndRow),
    dataStartColumn: review.dataStartColumn,
    dataEndColumn: review.dataEndColumn || undefined,
    xSourceMode: review.xSourceMode,
    xColumnIndex: review.xColumnIndex,
    yColumnIndex: review.yColumnIndex,
    generatedXStart: review.xSourceMode === 'generated' ? review.generatedXStart : undefined,
    generatedXStep: review.xSourceMode === 'generated' ? review.generatedXStep : undefined,
    ignoreEmptyRows: review.ignoreEmptyRows,
    ignoreNonNumericRows: review.ignoreNonNumericRows,
    collapseWhitespace: review.collapseWhitespace
  };
}

function getTemplateBlockImportAxisDefaults(block: TemplateBlockFormData) {
  const axisDefaults = {
    primaryLabel: block.primaryLabel.trim(),
    primaryUnit: block.primaryUnit.trim(),
    secondaryLabel: block.secondaryLabel.trim(),
    secondaryUnit: block.secondaryUnit.trim()
  };

  return Object.values(axisDefaults).some(Boolean) ? axisDefaults : undefined;
}

function getResolvedCurveTemplateById(templateId?: string) {
  if (!templateId || !templateLibraryResolved) {
    return null;
  }

  return templateLibraryResolved.curveTemplates.find((item) => item.id === templateId) || null;
}

function getTemplateBlockImportMemoryMatch(
  context: TemplateBlockEditContext,
  block: TemplateBlockFormData
) {
  ensureTemplateLibraryLoadedForStructuredBlocks();

  if (!templateLibraryResolved || !block.importManualReview || !block.purposeType) {
    return null;
  }

  const rankedMatches = rankTemplateMemoryMatches(
    buildTemplateMemoryCandidates(templateLibraryResolved.state.importMemories, {
      testProject: getStep2TemplateContext(context),
      blockName: block.blockTitle,
      purposeType: block.purposeType,
      fileExtension: getImportMemoryFileExtension(block)
    })
  );

  return rankedMatches[0] || null;
}

function buildTemplateBlockImportMemoryPayload(
  context: TemplateBlockEditContext,
  block: TemplateBlockFormData
): UpsertImportMemoryPayload | null {
  if (
    !block.importManualReview ||
    !block.purposeType ||
    !block.dataText.trim() ||
    countTemplateBlockPointLines(block.dataText) < 2
  ) {
    return null;
  }

  const appliedTemplate = getResolvedCurveTemplateById(block.appliedCurveTemplateId);

  return {
    testProject: getStep2TemplateContext(context) || undefined,
    familyId: appliedTemplate?.familyId || getResolvedStep2ScientificFamily(context)?.id,
    curveTemplateId: appliedTemplate?.id,
    blockName: block.blockTitle,
    purposeType: block.purposeType,
    fileExtension: getImportMemoryFileExtension(block) || undefined,
    importParsingSettings: buildTemplateBlockImportParsingSettings(block.importManualReview),
    axisDefaults: getTemplateBlockImportAxisDefaults(block)
  };
}

async function recordTemplateBlockImportMemory(
  context: TemplateBlockEditContext,
  blockId: string
) {
  const block = getTemplateBlocksForContext(context).find((item) => item.id === blockId);
  const payload = block ? buildTemplateBlockImportMemoryPayload(context, block) : null;
  if (!payload) {
    return;
  }

  templateLibraryResolved = await window.electronAPI.recordTemplateImportMemory(payload);
  const currentBlock = getTemplateBlocksForContext(context).find((item) => item.id === blockId);
  const matchedMemory = currentBlock ? getTemplateBlockImportMemoryMatch(context, currentBlock) : null;
  if (matchedMemory) {
    setTemplateBlocksForContext(
      context,
      getTemplateBlocksForContext(context).map((item) =>
        item.id === blockId ? { ...item, importMemoryAppliedId: matchedMemory.memory.id } : item
      )
    );
  }
  requestRender(true);
}

function applyImportMemoryAxisDefaultsSafely(
  block: TemplateBlockFormData,
  memory: ImportMemory
) {
  if (!memory.axisDefaults) {
    return block;
  }

  const nextBlock = { ...block };

  if (!nextBlock.primaryLabel.trim() || isGenericStructuredAxisLabel(nextBlock.primaryLabel, 'primary')) {
    nextBlock.primaryLabel = memory.axisDefaults.primaryLabel || nextBlock.primaryLabel;
  }
  if (!nextBlock.primaryUnit.trim()) {
    nextBlock.primaryUnit = memory.axisDefaults.primaryUnit || nextBlock.primaryUnit;
  }
  if (!nextBlock.secondaryLabel.trim() || isGenericStructuredAxisLabel(nextBlock.secondaryLabel, 'secondary')) {
    nextBlock.secondaryLabel = memory.axisDefaults.secondaryLabel || nextBlock.secondaryLabel;
  }
  if (!nextBlock.secondaryUnit.trim()) {
    nextBlock.secondaryUnit = memory.axisDefaults.secondaryUnit || nextBlock.secondaryUnit;
  }

  return nextBlock;
}

async function applyLastImportSettingsToTemplateBlock(
  context: TemplateBlockEditContext,
  blockId: string
) {
  const targetBlock = getTemplateBlocksForContext(context).find((block) => block.id === blockId);
  if (!targetBlock?.importManualReview) {
    return;
  }

  const matchedMemory = getTemplateBlockImportMemoryMatch(context, targetBlock);
  if (!matchedMemory) {
    return;
  }

  setTemplateBlocksForContext(
    context,
    getTemplateBlocksForContext(context).map((block) => {
      if (block.id !== blockId || !block.importManualReview) {
        return block;
      }

      const remembered = matchedMemory.memory.importParsingSettings;
      const nextReview = normalizeImportManualReviewState({
        ...block.importManualReview,
        textEncoding: remembered.textEncoding as ImportTextEncoding,
        delimiter: remembered.delimiter as ImportManualDelimiter,
        dataStartRow: remembered.dataStartRow,
        dataEndRow: remembered.hasExplicitEndRow ? remembered.dataEndRow || null : null,
        dataStartColumn: remembered.dataStartColumn || 1,
        dataEndColumn: remembered.dataEndColumn || null,
        xSourceMode: remembered.xSourceMode,
        xColumnIndex: remembered.xColumnIndex,
        yColumnIndex: remembered.yColumnIndex,
        generatedXStart: remembered.generatedXStart ?? 0,
        generatedXStep: remembered.generatedXStep ?? 1,
        ignoreEmptyRows: remembered.ignoreEmptyRows,
        ignoreNonNumericRows: remembered.ignoreNonNumericRows,
        collapseWhitespace: remembered.collapseWhitespace,
        previewLoading: false,
        previewError: ''
      });

      return {
        ...applyImportMemoryAxisDefaultsSafely(block, matchedMemory.memory),
        importManualReview: nextReview,
        importMemoryAppliedId: matchedMemory.memory.id
      };
    })
  );

  requestRender(true);
  await regenerateTemplateBlockImportFromManualReview(context, blockId, { skipInputSync: true });
}

function collectStructuredTemplateOverwriteFields(
  block: TemplateBlockFormData,
  preview: TemplateApplicationPreview
) {
  const conflictingFields: string[] = [];

  if (
    block.blockTitle.trim() &&
    !isGenericStructuredBlockName(block.blockTitle) &&
    block.blockTitle.trim() !== preview.blockTitleDefault.trim()
  ) {
    conflictingFields.push(t('step2.structured.blockTitleLabel'));
  }

  if (
    block.primaryLabel.trim() &&
    !isGenericStructuredAxisLabel(block.primaryLabel, 'primary') &&
    block.primaryLabel.trim() !== preview.axisDefaults.primaryLabel.trim()
  ) {
    conflictingFields.push(t('step2.structured.primaryLabelText'));
  }

  if (block.primaryUnit.trim() && block.primaryUnit.trim() !== preview.axisDefaults.primaryUnit.trim()) {
    conflictingFields.push(t('step2.structured.primaryUnitText'));
  }

  if (
    block.secondaryLabel.trim() &&
    !isGenericStructuredAxisLabel(block.secondaryLabel, 'secondary') &&
    block.secondaryLabel.trim() !== preview.axisDefaults.secondaryLabel.trim()
  ) {
    conflictingFields.push(t('step2.structured.secondaryLabelText'));
  }

  if (
    block.secondaryUnit.trim() &&
    block.secondaryUnit.trim() !== preview.axisDefaults.secondaryUnit.trim()
  ) {
    conflictingFields.push(t('step2.structured.secondaryUnitText'));
  }

  return conflictingFields;
}

function applyStructuredCurveTemplateToBlock(
  context: TemplateBlockEditContext,
  blockId: string,
  curveTemplateId: string
) {
  const blocks = getTemplateBlocksForContext(context);
  const targetBlock = blocks.find((block) => block.id === blockId);
  if (!targetBlock) {
    return;
  }

  const preview = getStructuredCurveTemplateOptions(context).find(
    (item) => item.curveTemplateId === curveTemplateId
  );
  if (!preview) {
    return;
  }

  const conflictingFields = collectStructuredTemplateOverwriteFields(targetBlock, preview);
  if (conflictingFields.length) {
    const confirmed = window.confirm(
      t('step2.structured.templateOverwriteConfirm', {
        template: preview.displayName,
        fields: conflictingFields.join('、')
      })
    );
    if (!confirmed) {
      return;
    }
  }

  setTemplateBlocksForContext(
    context,
    blocks.map((block) => {
      if (block.id !== blockId) {
        return block;
      }

      return {
        ...block,
        importMemoryAppliedId: '',
        appliedCurveTemplateId: preview.curveTemplateId,
        purposeType: preview.purposeType || block.purposeType || '',
        blockTitle:
          !block.blockTitle.trim() || isGenericStructuredBlockName(block.blockTitle) || conflictingFields.includes(t('step2.structured.blockTitleLabel'))
            ? preview.blockTitleDefault
            : block.blockTitle,
        primaryLabel:
          !block.primaryLabel.trim() ||
          isGenericStructuredAxisLabel(block.primaryLabel, 'primary') ||
          conflictingFields.includes(t('step2.structured.primaryLabelText'))
            ? preview.axisDefaults.primaryLabel
            : block.primaryLabel,
        primaryUnit:
          !block.primaryUnit.trim() || conflictingFields.includes(t('step2.structured.primaryUnitText'))
            ? preview.axisDefaults.primaryUnit
            : block.primaryUnit,
        secondaryLabel:
          !block.secondaryLabel.trim() ||
          isGenericStructuredAxisLabel(block.secondaryLabel, 'secondary') ||
          conflictingFields.includes(t('step2.structured.secondaryLabelText'))
            ? preview.axisDefaults.secondaryLabel
            : block.secondaryLabel,
        secondaryUnit:
          !block.secondaryUnit.trim() || conflictingFields.includes(t('step2.structured.secondaryUnitText'))
            ? preview.axisDefaults.secondaryUnit
            : block.secondaryUnit
      };
    })
  );
}

function renderStructuredCurveTemplateSelector(
  context: TemplateBlockEditContext,
  block: TemplateBlockFormData
) {
  const options = getStructuredCurveTemplateOptions(context);
  const appliedTemplate = getAppliedStructuredCurveTemplateOption(context, block);
  const familyContext = getStructuredFamilyContextDisplay(context);

  if (!familyContext.matchedFamily) {
    return `
      <div class="form-group template-block-template-selector-group template-block-compact-field">
        <label class="form-label template-block-compact-label">${escapeHtml(t('step2.structured.curveTemplateLabel'))}</label>
        <div class="template-block-compact-control">
          <div class="detail-section-subtitle">${escapeHtml(t('step2.structured.curveTemplateChooseFamily'))}</div>
        </div>
      </div>
    `;
  }

  if (!options.length) {
    return `
      <div class="form-group template-block-template-selector-group template-block-compact-field">
        <label class="form-label template-block-compact-label">${escapeHtml(t('step2.structured.curveTemplateLabel'))}</label>
        <div class="template-block-compact-control">
          <div class="detail-section-subtitle">${escapeHtml(t('step2.structured.curveTemplateEmpty'))}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="form-group template-block-template-selector-group template-block-compact-field">
      <label class="form-label template-block-compact-label">${escapeHtml(t('step2.structured.curveTemplateLabel'))}</label>
      <div class="template-block-compact-control">
        <div class="template-block-template-selector-row">
          <select
            id="template-block-curve-template-${block.id}"
            class="form-input"
            data-template-block-curve-template-id="${block.id}"
          >
            <option value="__custom__" ${block.appliedCurveTemplateId ? '' : 'selected'}>${escapeHtml(
              t('step2.structured.curveTemplateCustom')
            )}</option>
            ${options
              .map(
                (item) => `
                  <option
                    value="${escapeHtml(item.curveTemplateId)}"
                    ${block.appliedCurveTemplateId === item.curveTemplateId ? 'selected' : ''}
                  >
                    ${escapeHtml(item.displayName)}
                  </option>
                `
              )
              .join('')}
          </select>
          <span class="template-library-chip template-block-template-chip">${escapeHtml(
            appliedTemplate
              ? t('step2.structured.curveTemplateApplied', { template: appliedTemplate.displayName })
              : t('step2.structured.curveTemplateCustom')
          )}</span>
        </div>
      </div>
    </div>
  `;
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
    ${renderStructuredRecommendationButtons(context)}
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
      importManualReview: undefined as ImportReviewManualState | undefined,
      importMemoryAppliedId: ''
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

  const firstNumericRow = file.manualReview.previewRows.find((row) => {
    const numericColumnCount = row.columns.filter((value) => value !== '' && Number.isFinite(Number(value))).length;
    return numericColumnCount >= 2;
  });
  const defaultStartRow = firstNumericRow?.rowNumber || (file.manualReview.previewRows[0]?.rowNumber || 1);
  const numericColumnIndices = firstNumericRow
    ? firstNumericRow.columns
        .map((value, index) => ({ value, index }))
        .filter((entry) => entry.value !== '' && Number.isFinite(Number(entry.value)))
        .map((entry) => entry.index)
    : [];
  const defaultXColumnIndex = numericColumnIndices[0] ?? 0;
  const defaultYColumnIndex =
    numericColumnIndices.find((columnIndex) => columnIndex !== defaultXColumnIndex) ??
    Math.min(defaultXColumnIndex + 1, Math.max(0, file.manualReview.maxColumnCount - 1));

  return {
    available: true,
    textEncoding: file.selectedEncoding,
    resolvedEncoding: file.resolvedEncoding,
    recognitionStatus: file.recognitionStatus,
    recognitionMessage: file.recognitionMessage,
    delimiter: file.manualReview.suggestedDelimiter,
    suggestedDelimiter: file.manualReview.suggestedDelimiter,
    previewRows: file.manualReview.previewRows,
    maxColumnCount: file.manualReview.maxColumnCount,
    dataStartRow: defaultStartRow,
    dataEndRow: null,
    dataStartColumn: 1,
    dataEndColumn: file.manualReview.maxColumnCount,
    xSourceMode: file.manualReview.maxColumnCount > 1 ? 'column' : 'generated',
    xColumnIndex: Math.max(0, Math.min(defaultXColumnIndex, Math.max(0, file.manualReview.maxColumnCount - 1))),
    yColumnIndex: Math.max(0, Math.min(defaultYColumnIndex, Math.max(0, file.manualReview.maxColumnCount - 1))),
    generatedXStart: 0,
    generatedXStep: 1,
    ignoreEmptyRows: true,
    ignoreNonNumericRows: true,
    collapseWhitespace: true,
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
    resolvedEncoding: existing.resolvedEncoding,
    delimiter: next.suggestedDelimiter,
    suggestedDelimiter: next.suggestedDelimiter,
    previewRows: next.previewRows,
    maxColumnCount: nextMaxColumnCount,
    xSourceMode: nextXSourceMode,
    dataEndRow:
      existing.dataEndRow && next.previewRows.length
        ? Math.min(existing.dataEndRow, next.previewRows[next.previewRows.length - 1]?.rowNumber || existing.dataEndRow)
        : existing.dataEndRow,
    dataEndColumn:
      existing.dataEndColumn && nextMaxColumnCount
        ? Math.min(existing.dataEndColumn, nextMaxColumnCount)
        : existing.dataEndColumn,
    xColumnIndex: Math.min(existing.xColumnIndex, Math.max(0, nextMaxColumnCount - 1)),
    yColumnIndex: nextMaxColumnCount > 1 ? Math.min(existing.yColumnIndex, nextMaxColumnCount - 1) : 0
  };
}

function normalizeImportManualReviewState(review: ImportReviewManualState): ImportReviewManualState {
  const lastPreviewRow = review.previewRows[review.previewRows.length - 1]?.rowNumber || review.dataStartRow;
  const maxColumnCount = Math.max(1, review.maxColumnCount);
  const startRow = Math.max(1, review.dataStartRow);
  const endRow = review.dataEndRow ? Math.max(startRow, Math.min(review.dataEndRow, lastPreviewRow)) : null;
  const startColumn = Math.max(1, Math.min(review.dataStartColumn, maxColumnCount));
  const endColumn = review.dataEndColumn
    ? Math.max(startColumn, Math.min(review.dataEndColumn, maxColumnCount))
    : Math.max(startColumn, maxColumnCount);
  const allowedColumnIndices = Array.from(
    { length: Math.max(0, endColumn - startColumn + 1) },
    (_, index) => startColumn - 1 + index
  );
  const nextXColumnIndex = allowedColumnIndices.includes(review.xColumnIndex)
    ? review.xColumnIndex
    : allowedColumnIndices[0] || 0;
  const fallbackYColumnIndex =
    (allowedColumnIndices.includes(review.yColumnIndex) && review.yColumnIndex !== nextXColumnIndex
      ? review.yColumnIndex
      : undefined) ??
    allowedColumnIndices.find((columnIndex) => columnIndex !== nextXColumnIndex) ??
    nextXColumnIndex;

  return {
    ...review,
    dataStartRow: startRow,
    dataEndRow: endRow,
    dataStartColumn: startColumn,
    dataEndColumn: review.dataEndColumn ? endColumn : null,
    xColumnIndex: nextXColumnIndex,
    yColumnIndex: fallbackYColumnIndex
  };
}

function syncTemplateBlockImportInputsToState(context: TemplateBlockEditContext) {
  setTemplateBlocksForContext(
    context,
    getTemplateBlocksForContext(context).map((block) => {
      if (!block.importManualReview) {
        return block;
      }

      const nextReview: ImportReviewManualState = {
        ...block.importManualReview,
        textEncoding:
          ((document.getElementById(
            `template-block-import-encoding-${block.id}`
          ) as HTMLSelectElement | null)?.value as ImportTextEncoding | undefined) ||
          block.importManualReview.textEncoding,
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
        dataEndRow:
          Number(
            (document.getElementById(
              `template-block-import-end-row-${block.id}`
            ) as HTMLInputElement | null)?.value || 0
          ) || null,
        dataStartColumn:
          Math.max(
            1,
            Number(
              (document.getElementById(
                `template-block-import-start-column-${block.id}`
              ) as HTMLInputElement | null)?.value || block.importManualReview.dataStartColumn
            ) || block.importManualReview.dataStartColumn
          ),
        dataEndColumn:
          Number(
            (document.getElementById(
              `template-block-import-end-column-${block.id}`
            ) as HTMLInputElement | null)?.value || 0
          ) || null,
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
              ) as HTMLSelectElement | null)?.value || block.importManualReview.yColumnIndex + 1
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
        ignoreEmptyRows:
          (document.getElementById(
            `template-block-import-ignore-empty-${block.id}`
          ) as HTMLInputElement | null)?.checked ?? block.importManualReview.ignoreEmptyRows,
        ignoreNonNumericRows:
          (document.getElementById(
            `template-block-import-ignore-nonnumeric-${block.id}`
          ) as HTMLInputElement | null)?.checked ?? block.importManualReview.ignoreNonNumericRows,
        collapseWhitespace:
          (document.getElementById(
            `template-block-import-collapse-whitespace-${block.id}`
          ) as HTMLInputElement | null)?.checked ?? block.importManualReview.collapseWhitespace
      };

      return {
        ...block,
        importManualReview: normalizeImportManualReviewState(nextReview),
        importMemoryAppliedId: ''
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
        dataText: formatXYPointInput(candidate.templateBlock.points),
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
          importPreviewError: previewFile.recognitionStatus === 'failed' ? previewFile.error || '' : '',
          importParserLabel: previewFile.parserLabel || '',
          importWarnings: previewFile.warnings,
          importPreviewCandidate: previewFile.candidates[0],
          importPreviewSelectedName: selected.originalName,
          importPreviewSelectedPath: selected.originalPath,
          importManualReview: buildManualReviewState(block, previewFile),
          importMemoryAppliedId: ''
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
  blockId: string,
  options: { skipInputSync?: boolean } = {}
) {
  if (!options.skipInputSync) {
    if (context === 'detail-edit') {
      collectDetailEditState();
    } else {
      saveStep2InputsToState();
    }

    syncTemplateBlockImportInputsToState(context);
  }
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
      textEncoding: targetBlock.importManualReview.textEncoding,
      delimiter: targetBlock.importManualReview.delimiter,
      dataStartRow: targetBlock.importManualReview.dataStartRow,
      dataEndRow: targetBlock.importManualReview.dataEndRow,
      dataStartColumn: targetBlock.importManualReview.dataStartColumn,
      dataEndColumn: targetBlock.importManualReview.dataEndColumn,
      xSourceMode: targetBlock.importManualReview.xSourceMode,
      xColumnIndex: targetBlock.importManualReview.xColumnIndex,
      yColumnIndex: targetBlock.importManualReview.yColumnIndex,
      generatedXStart: targetBlock.importManualReview.generatedXStart,
      generatedXStep: targetBlock.importManualReview.generatedXStep,
      ignoreEmptyRows: targetBlock.importManualReview.ignoreEmptyRows,
      ignoreNonNumericRows: targetBlock.importManualReview.ignoreNonNumericRows,
      collapseWhitespace: targetBlock.importManualReview.collapseWhitespace,
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
            textEncoding: result.selectedEncoding || block.importManualReview.textEncoding,
            resolvedEncoding: result.resolvedEncoding || block.importManualReview.resolvedEncoding,
            recognitionStatus: result.recognitionStatus || block.importManualReview.recognitionStatus,
            recognitionMessage: result.recognitionMessage || block.importManualReview.recognitionMessage,
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

async function refreshTemplateBlockImportPreviewFromCurrentFile(
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
  const importFilePath = targetBlock?.importPreviewSelectedPath || targetBlock?.originalFilePath;
  const importFileName = targetBlock?.importPreviewSelectedName || targetBlock?.originalFileName;
  if (!targetBlock || !importFilePath) {
    return;
  }

  setTemplateBlocksForContext(
    context,
    getTemplateBlocksForContext(context).map((block) =>
      block.id === blockId ? { ...block, importPreviewLoading: true, importPreviewError: '' } : block
    )
  );
  requestRender(true);

  try {
    const previewResult = await window.electronAPI.previewImportFiles({
      filePaths: [importFilePath],
      textEncoding: targetBlock.importManualReview?.textEncoding || 'auto'
    });
    const previewFile = previewResult.files[0];
    if (!previewFile) {
      return;
    }

    setTemplateBlocksForContext(
      context,
      getTemplateBlocksForContext(context).map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        const nextManualReview = previewFile.manualReview
          ? block.importManualReview
            ? normalizeImportManualReviewState({
                ...updateManualReviewPreviewRows(block.importManualReview, previewFile.manualReview),
                textEncoding: previewFile.selectedEncoding,
                resolvedEncoding: previewFile.resolvedEncoding,
                recognitionStatus: previewFile.recognitionStatus,
                recognitionMessage: previewFile.recognitionMessage
              })
            : buildManualReviewState(block, previewFile)
          : undefined;

        return {
          ...block,
          importPreviewLoading: false,
          importPreviewError: previewFile.recognitionStatus === 'failed' ? previewFile.error || '' : '',
          importParserLabel: previewFile.parserLabel || '',
          importWarnings: previewFile.warnings,
          importPreviewCandidate: previewFile.candidates[0],
          importPreviewSelectedName: importFileName,
          importPreviewSelectedPath: importFilePath,
          importManualReview: nextManualReview,
          importMemoryAppliedId: ''
        };
      })
    );
  } catch (error) {
    setTemplateBlocksForContext(
      context,
      getTemplateBlocksForContext(context).map((block) =>
        block.id === blockId
          ? {
              ...block,
              importPreviewLoading: false,
              importPreviewError: getErrorMessage(error) || '导入预览失败'
            }
          : block
      )
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
  if (!block.purposeType) {
    block.purposeType = getDefaultStructuredPurposeTypeForContext(context);
  }
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
        XY_TEMPLATE_TYPE
      );
      requestRender(true);
    });
  }

  document.querySelectorAll('[data-template-block-curve-template-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const context = target.dataset.templateBlockContext as TemplateBlockEditContext | undefined;
      const curveTemplateId = target.dataset.templateBlockCurveTemplateAdd;
      if (context !== params.context || !curveTemplateId) {
        return;
      }

      if (params.context === 'detail-edit') {
        collectDetailEditState();
      } else {
        saveStep2InputsToState();
      }

      const preview = getStructuredCurveTemplateOptions(params.context).find(
        (item) => item.curveTemplateId === curveTemplateId
      );
      if (!preview) {
        return;
      }

      const nextBlock = buildTemplateBlockFromCurveTemplatePreview(preview);
      setTemplateBlocksForContext(params.context, [...getTemplateBlocksForContext(params.context), nextBlock]);
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

  document.querySelectorAll('[data-template-block-curve-template-id]').forEach((select) => {
    select.addEventListener('change', () => {
      const target = select as HTMLSelectElement;
      const blockId = target.dataset.templateBlockCurveTemplateId;
      if (!blockId) {
        return;
      }

      if (params.context === 'detail-edit') {
        collectDetailEditState();
      } else {
        saveStep2InputsToState();
      }

      if (!target.value || target.value === '__custom__') {
        setTemplateBlocksForContext(
          params.context,
          getTemplateBlocksForContext(params.context).map((block) =>
            block.id === blockId
              ? {
                  ...block,
                  importMemoryAppliedId: '',
                  appliedCurveTemplateId: '',
                  purposeType: block.purposeType || getDefaultStructuredPurposeTypeForContext(params.context)
                }
              : block
          )
        );
        requestRender(true);
        return;
      }

      applyStructuredCurveTemplateToBlock(params.context, blockId, target.value);
      requestRender(true);
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

      const targetBlock = getTemplateBlocksForContext(params.context).find((block) => block.id === blockId);
      const candidate =
        targetBlock?.importPreviewCandidate?.candidateType === 'templateBlock'
          ? targetBlock.importPreviewCandidate
          : null;
      if (!targetBlock || !candidate) {
        window.alert(t('step2.import.writeUnavailable'));
        return;
      }

      const nextDataText = formatXYPointInput(candidate.templateBlock.points);
      if (targetBlock.dataText.trim() && targetBlock.dataText.trim() !== nextDataText.trim()) {
        const shouldOverwrite = window.confirm(t('step2.import.overwriteConfirm'));
        if (!shouldOverwrite) {
          return;
        }
      }

      applyTemplateBlockImportCandidate({
        context: params.context,
        blockId
      });
      requestRender(true);
      void recordTemplateBlockImportMemory(params.context, blockId).catch((error) => {
        console.error('recordTemplateBlockImportMemory failed:', error);
      });
    });
  });

  document.querySelectorAll('[data-template-block-use-import-memory-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button as HTMLElement;
      const blockId = target.dataset.templateBlockUseImportMemoryId;
      if (!blockId) {
        return;
      }

      if (params.context === 'detail-edit') {
        collectDetailEditState();
      } else {
        saveStep2InputsToState();
      }

      syncTemplateBlockImportInputsToState(params.context);
      await applyLastImportSettingsToTemplateBlock(params.context, blockId);
    });
  });

  const triggerAutoImportPreview = async (blockId: string) => {
    await regenerateTemplateBlockImportFromManualReview(params.context, blockId);
  };

  document.querySelectorAll('[data-template-block-import-x-source-id]').forEach((select) => {
    select.addEventListener('change', async () => {
      const blockId = (select as HTMLElement).dataset.templateBlockImportXSourceId;
      if (!blockId) {
        return;
      }

      await triggerAutoImportPreview(blockId);
    });
  });

  document.querySelectorAll('[id^="template-block-import-encoding-"]').forEach((select) => {
    select.addEventListener('change', async () => {
      const blockId = (select as HTMLSelectElement).id.replace('template-block-import-encoding-', '');
      await refreshTemplateBlockImportPreviewFromCurrentFile(params.context, blockId);
    });
  });

  document.querySelectorAll('[id^="template-block-import-delimiter-"]').forEach((select) => {
    select.addEventListener('change', async () => {
      const blockId = (select as HTMLSelectElement).id.replace('template-block-import-delimiter-', '');
      await triggerAutoImportPreview(blockId);
    });
  });

  document
    .querySelectorAll(
      '[id^="template-block-import-start-row-"], [id^="template-block-import-end-row-"], [id^="template-block-import-start-column-"], [id^="template-block-import-end-column-"], [id^="template-block-import-x-column-"], [id^="template-block-import-y-column-"], [id^="template-block-import-generated-start-"], [id^="template-block-import-generated-step-"], [id^="template-block-import-ignore-empty-"], [id^="template-block-import-ignore-nonnumeric-"], [id^="template-block-import-collapse-whitespace-"]'
    )
    .forEach((input) => {
      input.addEventListener('change', async () => {
        const id = (input as HTMLElement).id;
        const blockId = id.split('-').slice(-1)[0];
        if (!blockId) {
          return;
        }

        syncTemplateBlockImportInputsToState(params.context);
        await triggerAutoImportPreview(blockId);
      });
    });

  document.querySelectorAll('[data-template-import-set-x]').forEach((button) => {
    button.addEventListener('click', async () => {
      const encoded = (button as HTMLElement).dataset.templateImportSetX;
      if (!encoded) {
        return;
      }

      const [blockId, columnIndexText] = encoded.split('::');
      const input = document.getElementById(`template-block-import-x-column-${blockId}`) as
        | HTMLSelectElement
        | null;
      if (!input) {
        return;
      }

      input.value = String(Number(columnIndexText) + 1);
      syncTemplateBlockImportInputsToState(params.context);
      await triggerAutoImportPreview(blockId);
    });
  });

  document.querySelectorAll('[data-template-import-set-y]').forEach((button) => {
    button.addEventListener('click', async () => {
      const encoded = (button as HTMLElement).dataset.templateImportSetY;
      if (!encoded) {
        return;
      }

      const [blockId, columnIndexText] = encoded.split('::');
      const input = document.getElementById(`template-block-import-y-column-${blockId}`) as
        | HTMLSelectElement
        | null;
      if (!input) {
        return;
      }

      input.value = String(Number(columnIndexText) + 1);
      syncTemplateBlockImportInputsToState(params.context);
      await triggerAutoImportPreview(blockId);
    });
  });

  let dragSelection:
    | {
        blockId: string;
        startRow: number;
      }
    | null = null;

  const handleDragSelectionMouseUp = () => {
    if (!dragSelection) {
      return;
    }

    const blockId = dragSelection.blockId;
    syncTemplateBlockImportInputsToState(params.context);
    dragSelection = null;
    document.removeEventListener('mouseup', handleDragSelectionMouseUp);
    void triggerAutoImportPreview(blockId);
  };

  const updateImportSelectionInputs = (blockId: string, endRow: number) => {
    if (!dragSelection || dragSelection.blockId !== blockId) {
      return;
    }

    const startRow = Math.min(dragSelection.startRow, endRow);
    const finalRow = Math.max(dragSelection.startRow, endRow);

    const startRowInput = document.getElementById(`template-block-import-start-row-${blockId}`) as
      | HTMLInputElement
      | null;
    const endRowInput = document.getElementById(`template-block-import-end-row-${blockId}`) as
      | HTMLInputElement
      | null;

    if (startRowInput) startRowInput.value = String(startRow);
    if (endRowInput) endRowInput.value = String(finalRow);
  };

  const bindRowSelectionTarget = (selector: string, blockIdKey: string) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const target = node as HTMLElement;
        const blockId = target.dataset[blockIdKey];
        const rowNumber = Number(target.dataset.templateImportRow);
        if (!blockId || Number.isNaN(rowNumber)) {
          return;
        }

        dragSelection = {
          blockId,
          startRow: rowNumber
        };
        document.removeEventListener('mouseup', handleDragSelectionMouseUp);
        document.addEventListener('mouseup', handleDragSelectionMouseUp);
        updateImportSelectionInputs(blockId, rowNumber);
      });

      node.addEventListener('mouseenter', (event) => {
        if (!dragSelection || !(event as MouseEvent).buttons) {
          return;
        }

        const target = node as HTMLElement;
        const blockId = target.dataset[blockIdKey];
        const rowNumber = Number(target.dataset.templateImportRow);
        if (!blockId || Number.isNaN(rowNumber)) {
          return;
        }

        updateImportSelectionInputs(blockId, rowNumber);
      });
    });
  };

  bindRowSelectionTarget('[data-template-import-cell-block-id]', 'templateImportCellBlockId');
  bindRowSelectionTarget(
    '[data-template-import-row-select-block-id]',
    'templateImportRowSelectBlockId'
  );
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
    (document.getElementById('edit-testTimeValue') as HTMLInputElement)?.value || '';
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
  const previewFieldIds = [
    'edit-sampleCode',
    'edit-tester',
    'edit-instrument',
    'edit-testTimeValue'
  ];

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
  const oppositeRole: ScalarItemRole = role === 'condition' ? 'metric' : 'condition';
  const contextPrefix = context === 'detail-edit' ? 'detail' : 'create';
  const addButtonId =
    role === 'condition'
      ? `${contextPrefix}-add-condition-row-btn`
      : `${contextPrefix}-add-metric-row-btn`;
  const addButtonTitle = role === 'condition' ? t('step2.condition.addButton') : t('step2.metric.addButton');
  const startedCount = rows.length;
  const emptySummary = t('step2.added.empty');

  return `
    <div class="detail-section step2-entry-section">
      <div class="dynamic-header step2-section-header">
        <div>
          <div class="dynamic-title">${meta.title}</div>
          <div class="dynamic-subtitle step2-section-subtitle">${meta.subtitle}</div>
        </div>
        <div class="table-toolbar step2-section-toolbar">
          <button
            class="secondary-btn step2-compact-add-btn"
            type="button"
            title="${escapeHtml(t('step2.scalar.addFromTemplate'))}"
            aria-label="${escapeHtml(t('step2.scalar.addFromTemplate'))}"
            data-step2-scalar-picker-toggle="${escapeHtml(`${context}:${role}`)}"
          >
            ${escapeHtml(t('step2.scalar.addFromTemplate'))}
          </button>
          <button
            id="${addButtonId}"
            class="secondary-btn step2-compact-add-btn"
            type="button"
            title="${escapeHtml(addButtonTitle)}"
            aria-label="${escapeHtml(addButtonTitle)}"
          >
            ${escapeHtml(t('step2.addCompact'))}
          </button>
        </div>
      </div>

      ${renderScalarTemplateAssist(context, role)}

      ${
        startedCount
          ? `<div class="step2-added-summary">${escapeHtml(
              t('step2.added.summary', { count: startedCount })
            )}</div>`
          : ''
      }

      ${rows.length
        ? `
            <div class="data-table-wrapper step2-data-table-wrapper">
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
        : `<div class="empty-tip step2-empty-tip">${escapeHtml(emptySummary)}</div>`}
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
  const showTemplateContext = context !== 'create-step2';

  return `
    ${showTemplateContext ? renderStep2TemplateContextHint(context) : ''}
    ${renderEditableScalarSection(context, 'condition', conditionRows)}
    ${renderEditableScalarSection(context, 'metric', metricRows)}
  `;
}

function validateScalarItems(rows: DataItem[]) {
  for (const row of rows) {
    const hasName = !!row.itemName;
    const hasValue = !!row.itemValue;

    if (isStartedScalarRow(row) && !hasName) {
      return t('step2.validation.missingName');
    }

    if (isStartedScalarRow(row) && !hasValue) {
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
    step2ScalarTemplatePicker = null;

    setScalarItemsForContext(params.context, [
      ...getScalarItemsForContext(params.context),
      buildEmptyDataItem('condition')
    ]);
    requestRender(true);
  });

  document.getElementById(params.addMetricButtonId)?.addEventListener('click', () => {
    syncStateBeforeMutation();
    step2ScalarTemplatePicker = null;

    setScalarItemsForContext(params.context, [
      ...getScalarItemsForContext(params.context),
      buildEmptyDataItem('metric')
    ]);
    requestRender(true);
  });

  document.querySelectorAll('[data-step2-scalar-picker-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const token = target.dataset.step2ScalarPickerToggle;
      if (!token) {
        return;
      }

      const [pickerContext, pickerRole] = token.split(':');
      if (pickerContext !== params.context || (pickerRole !== 'condition' && pickerRole !== 'metric')) {
        return;
      }

      syncStateBeforeMutation();
      toggleStep2ScalarTemplatePicker(params.context, pickerRole);
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-step2-scalar-picker-search]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const target = input as HTMLElement;
      const token = target.dataset.step2ScalarPickerSearch;
      if (!token || !step2ScalarTemplatePicker) {
        return;
      }

      const [pickerContext, pickerRole] = token.split(':');
      if (
        pickerContext !== params.context ||
        pickerRole !== step2ScalarTemplatePicker.role ||
        step2ScalarTemplatePicker.context !== params.context
      ) {
        return;
      }

      const value = (event.target as HTMLInputElement).value;
      step2ScalarTemplatePicker = {
        ...step2ScalarTemplatePicker,
        query: value
      };
      requestRender(true);
    });
  });

  document.querySelectorAll('[data-step2-scalar-template-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const templateId = target.dataset.step2ScalarTemplateAdd;
      const rowContext = target.dataset.step2ScalarTemplateContext as ScalarItemEditContext | undefined;
      const role = target.dataset.step2ScalarTemplateRole as ScalarItemRole | undefined;
      if (!templateId || rowContext !== params.context || !role) {
        return;
      }

      syncStateBeforeMutation();
      addScalarItemFromTemplate(params.context, role, templateId);
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
      step2ScalarTemplatePicker = null;

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
      step2ScalarTemplatePicker = null;

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

function getImportEncodingOptions() {
  return [
    { value: 'auto' as ImportTextEncoding, label: t('step2.import.encoding.auto') },
    { value: 'utf8' as ImportTextEncoding, label: t('step2.import.encoding.utf8') },
    { value: 'gbk' as ImportTextEncoding, label: t('step2.import.encoding.gbk') },
    { value: 'utf16' as ImportTextEncoding, label: t('step2.import.encoding.utf16') }
  ];
}

function getTemplateBlockImportRange(block: TemplateBlockFormData) {
  const review = block.importManualReview;
  const previewRows = review?.previewRows || [];
  const lastPreviewRow = previewRows[previewRows.length - 1]?.rowNumber || review?.dataStartRow || 1;

  return {
    startRow: review?.dataStartRow || 1,
    endRow: review?.dataEndRow || lastPreviewRow,
    startColumn: review?.dataStartColumn || 1,
    endColumn: review?.dataEndColumn || Math.max(review?.dataStartColumn || 1, review?.maxColumnCount || 1)
  };
}

function getTemplateBlockSelectedColumns(block: TemplateBlockFormData) {
  const range = getTemplateBlockImportRange(block);
  return Array.from(
    { length: Math.max(0, range.endColumn - range.startColumn + 1) },
    (_, index) => range.startColumn + index
  );
}

function renderTemplateBlockImportPreviewTable(block: TemplateBlockFormData) {
  const review = block.importManualReview;
  if (!review) {
    return '';
  }

  const range = getTemplateBlockImportRange(block);
  const yColumnNumber = review.yColumnIndex + 1;

  return `
    <div class="import-preview-table-region-help">${escapeHtml(t('step2.import.regionHelp'))}</div>
    <div
      class="import-preview-table-wrapper"
      data-preserve-scroll-key="${escapeHtml(`import-preview:${block.id}`)}"
    >
      <table class="import-preview-table-grid">
        <thead>
          <tr>
            <th class="import-preview-corner">#</th>
            ${Array.from({ length: review.maxColumnCount }, (_, index) => {
              const columnNumber = index + 1;
              const isX = review.xColumnIndex + 1 === columnNumber;
              const isY = yColumnNumber === columnNumber;
              const columnSelected =
                columnNumber >= range.startColumn &&
                columnNumber <= range.endColumn;
              return `
                <th class="import-preview-column-header ${columnSelected ? 'selected-range' : ''} ${isX ? 'column-x' : ''} ${isY ? 'column-y' : ''}">
                  <div class="import-preview-column-top">
                    <span>${escapeHtml(t('step2.import.columnNumber', { index: columnNumber }))}</span>
                    <span class="import-preview-column-badges">
                      ${isX ? '<span class="import-preview-column-badge">X</span>' : ''}
                      ${isY ? '<span class="import-preview-column-badge import-preview-column-badge-y">Y</span>' : ''}
                    </span>
                  </div>
                  <div class="import-preview-column-actions">
                    ${
                      review.xSourceMode === 'column'
                        ? `
                            <button
                              type="button"
                              class="import-preview-column-action ${isX ? 'active' : ''}"
                              data-template-import-set-x="${block.id}::${index}"
                            >
                              ${escapeHtml(t('step2.import.setAsX'))}
                            </button>
                          `
                        : ''
                    }
                    <button
                      type="button"
                      class="import-preview-column-action ${isY ? 'active' : ''}"
                      data-template-import-set-y="${block.id}::${index}"
                    >
                      ${escapeHtml(t('step2.import.setAsY'))}
                    </button>
                  </div>
                </th>
              `;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${review.previewRows
            .map((row) => {
              const rowSelected = row.rowNumber >= range.startRow && row.rowNumber <= range.endRow;
              return `
                <tr>
                  <th
                    class="import-preview-row-header ${rowSelected ? 'selected-range' : ''}"
                    data-template-import-row-select-block-id="${block.id}"
                    data-template-import-row="${row.rowNumber}"
                  >
                    ${row.rowNumber}
                  </th>
                  ${Array.from({ length: review.maxColumnCount }, (_, index) => {
                    const columnNumber = index + 1;
                    const value = row.columns[index] || '';
                    const isX = review.xColumnIndex + 1 === columnNumber;
                    const isY = yColumnNumber === columnNumber;
                    const columnSelected =
                      columnNumber >= range.startColumn &&
                      columnNumber <= range.endColumn;
                    const cellSelected = rowSelected && columnSelected;
                    return `
                      <td class="import-preview-cell ${cellSelected ? 'selected-range' : ''} ${cellSelected && isX ? 'column-x' : ''} ${
                        cellSelected && isY ? 'column-y' : ''
                      }">
                        <button
                          type="button"
                          class="import-preview-cell-btn"
                          data-template-import-cell-block-id="${block.id}"
                          data-template-import-row="${row.rowNumber}"
                          title="${escapeHtml(value)}"
                        >
                          ${escapeHtml(value || ' ')}
                        </button>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTemplateBlockImportColumnSelect(
  block: TemplateBlockFormData,
  mode: 'x' | 'y'
) {
  const review = block.importManualReview;
  if (!review) {
    return '';
  }

  return `
    <select
      id="template-block-import-${mode}-column-${block.id}"
      class="form-input import-inline-select"
    >
      ${getTemplateBlockSelectedColumns(block)
        .map((columnNumber) => {
          const columnIndex = columnNumber - 1;
          return `
            <option
              value="${columnNumber}"
              ${
                (mode === 'x' ? review.xColumnIndex : review.yColumnIndex) === columnIndex
                  ? 'selected'
                  : ''
              }
            >
              ${escapeHtml(t('step2.import.columnNumber', { index: columnNumber }))}
            </option>
          `;
        })
        .join('')}
    </select>
  `;
}

function renderTemplateBlockImportSummary(block: TemplateBlockFormData) {
  const review = block.importManualReview;
  if (!review) {
    return '';
  }

  const range = getTemplateBlockImportRange(block);
  const pointCount =
    block.importPreviewCandidate?.candidateType === 'templateBlock'
      ? block.importPreviewCandidate.templateBlock.points.length
      : 0;

  return `
    <div class="import-preview-summary">
      <div>${escapeHtml(t('step2.import.rowRangeSummary', { startRow: range.startRow, endRow: range.endRow }))}</div>
      <div>X：${escapeHtml(t('step2.import.columnNumber', { index: review.xColumnIndex + 1 }))}</div>
      <div>Y：${escapeHtml(t('step2.import.columnNumber', { index: review.yColumnIndex + 1 }))}</div>
      <div>${escapeHtml(t('step2.import.pointCount', { count: pointCount }))}</div>
    </div>
  `;
}

function renderTemplateBlockImportPanel(
  context: TemplateBlockEditContext,
  block: TemplateBlockFormData
) {
  const manualReview = block.importManualReview;
  const warnings = block.importWarnings || [];
  const pointCount =
    block.importPreviewCandidate?.candidateType === 'templateBlock'
      ? block.importPreviewCandidate.templateBlock.points.length
      : 0;
  const matchedMemory = getTemplateBlockImportMemoryMatch(context, block);
  const importMemoryMarkup = manualReview?.available
    ? matchedMemory
      ? block.importMemoryAppliedId === matchedMemory.memory.id
        ? `<div class="import-memory-row"><span class="import-memory-status applied">${escapeHtml(
            t('step2.import.lastSettingsApplied')
          )}</span></div>`
        : `
            <div class="import-memory-row">
              <button
                class="import-memory-action"
                type="button"
                data-template-block-use-import-memory-id="${block.id}"
              >
                ${escapeHtml(t('step2.import.useLastSettings'))}
              </button>
            </div>
          `
      : block.purposeType
        ? `<div class="import-memory-row"><span class="import-memory-status">${escapeHtml(
            t('step2.import.lastSettingsUnavailable')
          )}</span></div>`
        : ''
    : '';

  if (
    !block.importPreviewError &&
    !warnings.length &&
    !block.importParserLabel &&
    !manualReview?.available &&
    !pointCount
  ) {
    return '';
  }

  return `
    <div class="import-manual-review-panel">
      <div class="import-preview-file-bar">
        ${block.importPreviewSelectedName
          ? `<div class="import-preview-file-status">${escapeHtml(t('step2.import.previewFile', { file: block.importPreviewSelectedName }))}</div>`
          : ''}
        ${manualReview
          ? `
              <div class="import-preview-file-controls">
                <div class="import-inline-control">
                  <label class="form-label">${escapeHtml(t('step2.import.encoding'))}</label>
                  <select id="template-block-import-encoding-${block.id}" class="form-input import-inline-select">
                    ${getImportEncodingOptions()
                      .map(
                        (option) => `
                          <option value="${option.value}" ${manualReview.textEncoding === option.value ? 'selected' : ''}>
                            ${escapeHtml(option.label)}
                          </option>
                        `
                      )
                      .join('')}
                  </select>
                </div>
                <div class="import-inline-control">
                  <label class="form-label">${escapeHtml(t('step2.import.delimiter'))}</label>
                  <select id="template-block-import-delimiter-${block.id}" class="form-input import-inline-select">
                    <option value="comma" ${manualReview.delimiter === 'comma' ? 'selected' : ''}>${escapeHtml(t('step2.import.delimiterComma'))}</option>
                    <option value="tab" ${manualReview.delimiter === 'tab' ? 'selected' : ''}>${escapeHtml(t('step2.import.delimiterTab'))}</option>
                    <option value="semicolon" ${manualReview.delimiter === 'semicolon' ? 'selected' : ''}>${escapeHtml(t('step2.import.delimiterSemicolon'))}</option>
                    <option value="whitespace" ${manualReview.delimiter === 'whitespace' ? 'selected' : ''}>${escapeHtml(t('step2.import.delimiterWhitespace'))}</option>
                  </select>
                </div>
              </div>
            `
          : ''}
      </div>
      ${manualReview
        ? `<div class="import-preview-file-status">${escapeHtml(t('step2.import.recognitionStatus'))}：${escapeHtml(
            manualReview.recognitionMessage
          )}</div>`
        : ''}
      ${block.importParserLabel && manualReview?.recognitionStatus === 'success'
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
      ${manualReview?.available
        ? `
            <div class="import-manual-review-title">${escapeHtml(t('step2.import.mappingToolbarTitle'))}</div>
            <div class="import-manual-review-subtitle">${escapeHtml(t('step2.import.singleCurveHint'))}</div>

            <div class="import-mapping-toolbar">
              <div class="import-inline-control">
                <label class="form-label">${escapeHtml(t('step2.import.rangeStartRow'))}</label>
                <input
                  id="template-block-import-start-row-${block.id}"
                  class="form-input import-inline-input"
                  type="number"
                  min="1"
                  value="${manualReview.dataStartRow}"
                />
              </div>

              <div class="import-inline-control">
                <label class="form-label">${escapeHtml(t('step2.import.rangeEndRow'))}</label>
                <input
                  id="template-block-import-end-row-${block.id}"
                  class="form-input import-inline-input"
                  type="number"
                  min="${manualReview.dataStartRow}"
                  value="${manualReview.dataEndRow || ''}"
                />
              </div>

              <div class="import-inline-control">
                <label class="form-label">${escapeHtml(t('step2.import.xSource'))}</label>
                <select
                  id="template-block-import-x-source-${block.id}"
                  class="form-input import-inline-select"
                  data-template-block-import-x-source-id="${block.id}"
                >
                  <option value="column" ${manualReview.xSourceMode === 'column' ? 'selected' : ''}>${escapeHtml(t('step2.import.xSourceColumn'))}</option>
                  <option value="generated" ${manualReview.xSourceMode === 'generated' ? 'selected' : ''}>${escapeHtml(t('step2.import.xSourceGenerated'))}</option>
                </select>
              </div>

              ${manualReview.xSourceMode === 'column'
                ? `
                    <div class="import-inline-control">
                      <label class="form-label">${escapeHtml(t('step2.import.xColumnSingle'))}</label>
                      ${renderTemplateBlockImportColumnSelect(block, 'x')}
                    </div>
                  `
                : `
                    <div class="import-inline-control">
                      <label class="form-label">${escapeHtml(t('step2.import.generatedStart'))}</label>
                      <input
                        id="template-block-import-generated-start-${block.id}"
                        class="form-input import-inline-input"
                        type="number"
                        value="${manualReview.generatedXStart}"
                      />
                    </div>
                    <div class="import-inline-control">
                      <label class="form-label">${escapeHtml(t('step2.import.generatedStep'))}</label>
                      <input
                        id="template-block-import-generated-step-${block.id}"
                        class="form-input import-inline-input"
                        type="number"
                        value="${manualReview.generatedXStep}"
                      />
                    </div>
                  `}

              <div class="import-inline-control">
                <label class="form-label">${escapeHtml(t('step2.import.yColumn'))}</label>
                ${renderTemplateBlockImportColumnSelect(block, 'y')}
              </div>

              <div class="import-preview-count-chip">${escapeHtml(t('step2.import.pointCount', { count: pointCount }))}</div>
            </div>

            ${importMemoryMarkup}

            <details class="import-advanced-range">
              <summary>${escapeHtml(t('step2.import.advancedColumns'))}</summary>
              <div class="import-advanced-range-grid">
                <div class="import-inline-control">
                  <label class="form-label">${escapeHtml(t('step2.import.rangeStartColumn'))}</label>
                  <input
                    id="template-block-import-start-column-${block.id}"
                    class="form-input import-inline-input"
                    type="number"
                    min="1"
                    max="${Math.max(1, manualReview.maxColumnCount)}"
                    value="${manualReview.dataStartColumn}"
                  />
                </div>
                <div class="import-inline-control">
                  <label class="form-label">${escapeHtml(t('step2.import.rangeEndColumn'))}</label>
                  <input
                    id="template-block-import-end-column-${block.id}"
                    class="form-input import-inline-input"
                    type="number"
                    min="${manualReview.dataStartColumn}"
                    max="${Math.max(1, manualReview.maxColumnCount)}"
                    value="${manualReview.dataEndColumn || ''}"
                  />
                </div>
              </div>
            </details>

            <div class="import-cleaning-row">
              <label class="import-cleaning-option">
                <input id="template-block-import-ignore-empty-${block.id}" type="checkbox" ${manualReview.ignoreEmptyRows ? 'checked' : ''} />
                <span>${escapeHtml(t('step2.import.ignoreEmptyRows'))}</span>
              </label>
              <label class="import-cleaning-option">
                <input id="template-block-import-ignore-nonnumeric-${block.id}" type="checkbox" ${manualReview.ignoreNonNumericRows ? 'checked' : ''} />
                <span>${escapeHtml(t('step2.import.ignoreNonNumericRows'))}</span>
              </label>
              <label class="import-cleaning-option">
                <input id="template-block-import-collapse-whitespace-${block.id}" type="checkbox" ${manualReview.collapseWhitespace ? 'checked' : ''} />
                <span>${escapeHtml(t('step2.import.collapseWhitespace'))}</span>
              </label>
            </div>

            ${renderTemplateBlockImportSummary(block)}
            ${renderTemplateBlockImportPreviewTable(block)}

            <div class="import-action-row">
              <button
                class="secondary-btn"
                type="button"
                data-template-block-apply-import-id="${block.id}"
                ${manualReview.previewLoading || pointCount < 2 ? 'disabled' : ''}
              >
                ${escapeHtml(t('step2.import.writeCurrentBlock'))}
              </button>
            </div>

            ${manualReview.previewError ? `<div class="error-message">${escapeHtml(manualReview.previewError)}</div>` : ''}
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

function shouldRenderTemplateBlockImportPanel(
  block: TemplateBlockFormData
) {
  return (
    !!block.importPreviewLoading ||
    !!block.importPreviewError ||
    !!block.importManualReview?.available ||
    !!block.importPreviewSelectedPath ||
    !!block.originalFilePath
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

function renderStructuredBlockFamilyDisplay(context: TemplateBlockEditContext) {
  const familyContext = getStructuredFamilyContextDisplay(context);
  if (familyContext.matchedFamily) {
    return `
      <div class="form-group template-block-compact-field">
        <label class="form-label template-block-compact-label">${escapeHtml(t('step2.structured.purposeLabel'))}</label>
        <div class="template-block-compact-control">
          <div class="template-block-readonly-family">
            <span class="template-block-readonly-family-value">${escapeHtml(familyContext.familyLabel)}</span>
            <span class="template-block-readonly-family-hint">${escapeHtml(
              t('step2.structured.familyFromStep1')
            )}</span>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="form-group template-block-compact-field">
      <label class="form-label template-block-compact-label">${escapeHtml(t('step2.structured.purposeLabel'))}</label>
      <div class="template-block-compact-control">
        <div class="template-block-readonly-family template-block-readonly-family-warning">
          <span class="template-block-readonly-family-value">${escapeHtml(
            familyContext.testProject || t('step2.templateContext.unspecifiedProject')
          )}</span>
          <span class="template-block-readonly-family-hint">${escapeHtml(
            t('step2.structured.familyNeedsStep1')
          )}</span>
        </div>
      </div>
    </div>
  `;
}

function renderEditableTemplateBlockBasicFields(
  context: TemplateBlockEditContext,
  block: TemplateBlockFormData,
  fieldConfig: ReturnType<typeof getTemplateBlockFieldConfig>
) {
  return `
    <div class="template-block-grid">
      ${renderStructuredBlockFamilyDisplay(context)}

      ${context === 'create-step2' ? renderStructuredCurveTemplateSelector(context, block) : ''}

      <div class="form-group template-block-compact-field">
        <label class="form-label template-block-compact-label">${escapeHtml(t('step2.structured.blockTitleLabel'))} <span class="required-star">*</span></label>
        <div class="template-block-compact-control">
          <input
            id="template-block-title-${block.id}"
            class="form-input"
            placeholder="${fieldConfig.titlePlaceholder}"
            value="${escapeHtml(block.blockTitle)}"
          />
        </div>
      </div>

      <div class="template-block-axis-section">
        <div class="template-block-axis-row">
          <div class="template-block-axis-row-label">${escapeHtml(t('step2.structured.primaryAxisShort'))}</div>
          <div class="form-group">
            <label class="form-label">${fieldConfig.primaryLabelText}</label>
            <input
              id="template-block-primary-label-${block.id}"
              class="form-input"
              placeholder="${fieldConfig.primaryLabelPlaceholder}"
              value="${escapeHtml(block.primaryLabel)}"
            />
          </div>
          <div class="form-group template-block-axis-unit-group">
            <label class="form-label">${fieldConfig.primaryUnitText}</label>
            <input
              id="template-block-primary-unit-${block.id}"
              class="form-input"
              placeholder="${fieldConfig.primaryUnitPlaceholder}"
              value="${escapeHtml(block.primaryUnit)}"
            />
          </div>
        </div>

        <div class="template-block-axis-row">
          <div class="template-block-axis-row-label">${escapeHtml(t('step2.structured.secondaryAxisShort'))}</div>
          <div class="form-group">
            <label class="form-label">${fieldConfig.secondaryLabelText}</label>
            <input
              id="template-block-secondary-label-${block.id}"
              class="form-input"
              placeholder="${fieldConfig.secondaryLabelPlaceholder}"
              value="${escapeHtml(block.secondaryLabel)}"
            />
          </div>
          <div class="form-group template-block-axis-unit-group">
            <label class="form-label">${fieldConfig.secondaryUnitText}</label>
            <input
              id="template-block-secondary-unit-${block.id}"
              class="form-input"
              placeholder="${fieldConfig.secondaryUnitPlaceholder}"
              value="${escapeHtml(block.secondaryUnit)}"
            />
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEditableTemplateBlockFinalResult(
  block: TemplateBlockFormData,
  fieldConfig: ReturnType<typeof getTemplateBlockFieldConfig>
) {
  return `
    <div class="template-block-data-section">
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
}

function renderTemplateBlockCards(
  blocks: TemplateBlockFormData[],
  context: TemplateBlockEditContext
) {
  if (!blocks.length) {
    return `<div class="empty-tip step2-empty-tip">${escapeHtml(t('step2.added.empty'))}</div>`;
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
            </div>
            <button
              class="danger-btn small-danger-btn"
              type="button"
              data-remove-template-block-id="${block.id}"
            >
              ${escapeHtml(t('dictionary.delete'))}
            </button>
          </div>

          ${renderEditableTemplateBlockBasicFields(context, block, fieldConfig)}

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
          </div>

          ${shouldRenderTemplateBlockImportPanel(block)
            ? renderTemplateBlockImportPanel(context, block)
            : ''}

          ${renderEditableTemplateBlockFinalResult(block, fieldConfig)}
        </div>
      `;
        })()}
      `
    )
    .join('');
}

function renderReadonlyTemplateBlocks(
  blocks: TemplateBlockFormData[],
  showReadonlyHint = false,
  familyLabel = ''
) {
  if (!blocks.length) {
    return `<div class="empty-tip">${escapeHtml(t('step2.structured.readonlyEmpty'))}</div>`;
  }

  return blocks
    .map(
      (block, index) => `
        ${(() => {
          const fieldConfig = getTemplateBlockFieldConfig(block.templateType);
          const reviewTitle = getTemplateBlockReviewTitle(block, index);
          const purposeLabel = getStructuredBlockPurposeLabel(block.purposeType);
          const pointCount = countTemplateBlockPointLines(block.dataText);
          return `
        <div class="template-block-card detail-template-block-card">
          <div class="template-block-review-header">
            <div class="template-block-review-title-row">
              <div class="template-block-review-title">${escapeHtml(reviewTitle)}</div>
              ${
                reviewTitle !== getTemplateBlockReviewOrdinal(index)
                  ? `<span class="template-block-review-order">${escapeHtml(
                      getTemplateBlockReviewOrdinal(index)
                    )}</span>`
                  : ''
              }
            </div>
            <div class="template-block-review-meta">
              ${escapeHtml(t('step2.structured.pointCountLabel'))}：${pointCount}
            </div>
          </div>

          <div class="template-block-review-subrow">
            <div class="template-block-summary-chips">
              ${
                familyLabel
                  ? `<span class="template-block-summary-chip">${escapeHtml(
                      `${t('step2.structured.purposeLabel')}：${familyLabel}`
                    )}</span>`
                  : ''
              }
              ${
                purposeLabel && purposeLabel !== '未指定'
                  ? `<span class="template-block-summary-chip">${escapeHtml(
                      `${t('databaseDetail.curveDataTypeLabel')}：${purposeLabel}`
                    )}</span>`
                  : ''
              }
            </div>
            ${
              block.sourceFileName
                ? `
                    <div class="template-block-compact-file" title="${escapeHtml(block.sourceFileName)}">
                      <span class="template-block-source-label">${escapeHtml(t('step2.import.savedFileLabel'))}</span>
                      <span class="template-block-source-value template-block-source-value-truncated">${escapeHtml(
                        block.sourceFileName
                      )}</span>
                    </div>
                  `
                : ''
            }
            ${showReadonlyHint ? `<div class="template-block-readonly-hint">${escapeHtml(t('step2.structured.readonlyHint'))}</div>` : ''}
          </div>

          <div class="template-block-axis-inline">
            <div class="template-block-axis-inline-item">
              <span class="template-block-axis-inline-tag">X</span>
              <span class="template-block-axis-inline-text">${escapeHtml(
                `${block.primaryLabel || 'X'} (${block.primaryUnit || '-'})`
              )}</span>
            </div>
            <div class="template-block-axis-inline-item">
              <span class="template-block-axis-inline-tag">Y</span>
              <span class="template-block-axis-inline-text">${escapeHtml(
                `${block.secondaryLabel || 'Y'} (${block.secondaryUnit || '-'})`
              )}</span>
            </div>
          </div>

          <div class="template-block-source-summary">
            <div class="template-block-source-line compact">
              <span class="template-block-source-label">${escapeHtml(t('step2.import.savedFileLabel'))}</span>
              ${
                block.sourceFileName && block.sourceFilePath
                  ? `
                      <div class="saved-file-cell template-block-source-actions">
                        <button
                          class="file-link-btn"
                          type="button"
                          data-open-saved-file="${escapeHtml(block.sourceFilePath)}"
                          title="${escapeHtml(block.sourceFileName)}"
                        >
                          <span class="template-block-source-value-truncated">${escapeHtml(block.sourceFileName)}</span>
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
                  : `<span class="template-block-source-value">-</span>`
              }
            </div>
            <div class="template-block-source-line compact">
              <span class="template-block-source-label">${escapeHtml(t('step2.import.originalFileLabel'))}</span>
              <span
                class="template-block-source-value template-block-source-value-truncated"
                title="${escapeHtml(block.originalFileName || '-')}"
              >${escapeHtml(block.originalFileName || '-')}</span>
            </div>
            ${block.note
              ? `<div class="template-block-summary-note">${escapeHtml(
                  `${t('step2.structured.noteLabel')}：${block.note}`
                )}</div>`
              : ''}
          </div>

          <details class="template-block-data-details detail-template-block-data-details">
            <summary>${escapeHtml(t('databaseDetail.viewXYData'))}</summary>
            <div class="form-group template-block-data-editor detail-template-block-data-scroll">
              <label class="form-label">${fieldConfig.dataLabel}</label>
              <textarea class="template-block-textarea template-block-readonly-textarea" readonly>${escapeHtml(block.dataText)}</textarea>
            </div>
          </details>
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
  onSuccess?: () => void;
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
      params.onSuccess?.();
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
    try {
      await Promise.all([
        ensureDictionaryItemsLoaded(),
        ensureRecentEntrySuggestionsLoaded(),
        params.dictionaryType === 'testProject' ? ensureTemplateLibraryLoaded() : Promise.resolve()
      ]);
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

  input.addEventListener('focus', async () => {
    try {
      await Promise.all([
        ensureDictionaryItemsLoaded(),
        ensureRecentEntrySuggestionsLoaded(),
        params.dictionaryType === 'testProject' ? ensureTemplateLibraryLoaded() : Promise.resolve()
      ]);
      renderStep1Suggestions({
        containerId: params.containerId,
        dictionaryType: params.dictionaryType,
        query: input.value
      });
    } catch (error) {
      hideStep1Suggestions(params.containerId);
      console.error('load step1 suggestions failed:', error);
    }
  });

  input.addEventListener('click', async () => {
    try {
      await Promise.all([
        ensureDictionaryItemsLoaded(),
        ensureRecentEntrySuggestionsLoaded(),
        params.dictionaryType === 'testProject' ? ensureTemplateLibraryLoaded() : Promise.resolve()
      ]);
      renderStep1Suggestions({
        containerId: params.containerId,
        dictionaryType: params.dictionaryType,
        query: input.value
      });
    } catch (error) {
      hideStep1Suggestions(params.containerId);
      console.error('load step1 suggestions failed:', error);
    }
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

function bindDateTimePicker(baseId: string) {
  const shell = document.getElementById(`${baseId}PickerShell`);
  const hiddenInput = document.getElementById(`${baseId}Value`) as HTMLInputElement | null;
  const viewYearInput = document.getElementById(`${baseId}PickerViewYear`) as HTMLInputElement | null;
  const viewMonthInput = document.getElementById(`${baseId}PickerViewMonth`) as HTMLInputElement | null;
  const draftDayInput = document.getElementById(`${baseId}PickerDraftDay`) as HTMLInputElement | null;
  const displayInput = document.getElementById(`${baseId}PickerDisplay`) as HTMLInputElement | null;
  const trigger = document.getElementById(`${baseId}PickerTrigger`) as HTMLButtonElement | null;
  const popover = document.getElementById(`${baseId}PickerPopover`);
  const preview = document.getElementById(`${baseId}PickerPreview`);
  const calendarLabel = document.getElementById(`${baseId}PickerCalendarLabel`);
  const calendarGrid = document.getElementById(`${baseId}PickerCalendarGrid`);
  const prevMonthButton = document.getElementById(`${baseId}PickerPrevMonth`) as HTMLButtonElement | null;
  const nextMonthButton = document.getElementById(`${baseId}PickerNextMonth`) as HTMLButtonElement | null;
  const hourWheel = document.getElementById(`${baseId}HourWheel`) as HTMLElement | null;
  const minuteWheel = document.getElementById(`${baseId}MinuteWheel`) as HTMLElement | null;
  const clearButton = document.getElementById(`${baseId}PickerClear`) as HTMLButtonElement | null;
  const doneButton = document.getElementById(`${baseId}PickerDone`) as HTMLButtonElement | null;

  if (
    !shell ||
    !hiddenInput ||
    !viewYearInput ||
    !viewMonthInput ||
    !draftDayInput ||
    !displayInput ||
    !trigger ||
    !popover ||
    !preview ||
    !calendarLabel ||
    !calendarGrid ||
    !prevMonthButton ||
    !nextMonthButton ||
    !hourWheel ||
    !minuteWheel
  ) {
    return;
  }

  const getWheelOptions = (wheel: HTMLElement) =>
    Array.from(wheel.querySelectorAll('[data-datetime-picker-wheel-value]')) as HTMLButtonElement[];

  const getWheelValues = (wheel: HTMLElement) =>
    Array.from(
      new Set(
        getWheelOptions(wheel)
          .map((option) => option.dataset.datetimePickerWheelValue || '')
          .filter(Boolean)
      )
    );

  const getWheelSelectedValue = (wheel: HTMLElement) => {
    const datasetValue = wheel.dataset.datetimePickerSelectedValue;
    if (datasetValue) {
      return datasetValue;
    }

    const selectedOption = wheel.querySelector('.datetime-picker-wheel-option.selected') as HTMLButtonElement | null;
    return (
      selectedOption?.dataset.datetimePickerWheelValue ||
      getWheelOptions(wheel)[0]?.dataset.datetimePickerWheelValue ||
      '00'
    );
  };

  const updateWheelSelection = (wheel: HTMLElement, nextValue: string, shouldCenter = true) => {
    const allOptions = getWheelOptions(wheel);
    const matchingOptions = allOptions.filter(
      (option) => option.dataset.datetimePickerWheelValue === nextValue
    );
    const activeOption = matchingOptions[Math.floor(matchingOptions.length / 2)] || matchingOptions[0] || allOptions[0];

    if (!activeOption) {
      return;
    }

    allOptions.forEach((option) => {
      const isSelected = option === activeOption;
      option.classList.toggle('selected', isSelected);
      option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      option.classList.remove('wheel-distance-1', 'wheel-distance-2', 'wheel-distance-3');
    });

    wheel.dataset.datetimePickerSelectedValue = nextValue;
    const activeIndex = allOptions.indexOf(activeOption);
    allOptions.forEach((option, index) => {
      const distance = Math.abs(index - activeIndex);
      if (distance === 1) {
        option.classList.add('wheel-distance-1');
      } else if (distance === 2) {
        option.classList.add('wheel-distance-2');
      } else if (distance >= 3) {
        option.classList.add('wheel-distance-3');
      }
    });

    if (shouldCenter) {
      const nextScrollTop = activeOption.offsetTop - (wheel.clientHeight - activeOption.offsetHeight) / 2;
      wheel.scrollTo({ top: Math.max(nextScrollTop, 0), behavior: 'auto' });
    }
  };

  const syncWheelLoopPosition = (wheel: HTMLElement) => {
    const cycleHeight = wheel.scrollHeight / DATETIME_PICKER_WHEEL_REPEAT_COUNT;
    const lowerBound = cycleHeight * 0.75;
    const upperBound = cycleHeight * (DATETIME_PICKER_WHEEL_REPEAT_COUNT - 1.75);
    if (wheel.scrollTop <= lowerBound || wheel.scrollTop >= upperBound) {
      updateWheelSelection(wheel, getWheelSelectedValue(wheel));
    }
  };

  const getDraftDate = () => {
    const dayCount = getDaysInMonth(Number(viewYearInput.value), Number(viewMonthInput.value));
    const clampedDay = Math.min(Math.max(Number(draftDayInput.value) || 1, 1), dayCount);
    draftDayInput.value = pad2(clampedDay);

    return `${viewYearInput.value}-${viewMonthInput.value}-${draftDayInput.value}`;
  };

  const updateCalendar = () => {
    const viewYear = Number(viewYearInput.value);
    const viewMonth = Number(viewMonthInput.value);
    calendarLabel.textContent = buildDateTimeCalendarLabel(viewYear, viewMonth);
    calendarGrid.innerHTML = buildDateTimeCalendarGrid(baseId, viewYear, viewMonth, hiddenInput.value);
  };

  const updateDraftPreview = () => {
    preview.textContent = `${viewYearInput.value}-${viewMonthInput.value}-${draftDayInput.value} ${getWheelSelectedValue(
      hourWheel
    )}:${getWheelSelectedValue(minuteWheel)}`;
    updateCalendar();
  };

  const syncDisplay = () => {
    const nextDate = getDraftDate();
    const nextTime = `${getWheelSelectedValue(hourWheel)}:${getWheelSelectedValue(minuteWheel)}`;
    const nextValue = buildLocalDateTimeValue(nextDate, nextTime);
    hiddenInput.value = nextValue;
    displayInput.value = formatLocalDateTimePickerDisplay(nextValue);
    preview.textContent = formatLocalDateTimePickerDisplay(nextValue);
    displayInput.classList.toggle(
      'datetime-picker-display-placeholder',
      !hasCompleteLocalDateTimeValue(nextValue)
    );
    updateCalendar();
    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const openPopover = () => {
    shell.classList.add('datetime-picker-open');
    trigger.setAttribute('aria-expanded', 'true');
    window.requestAnimationFrame(() => {
      updateWheelSelection(hourWheel, getWheelSelectedValue(hourWheel));
      updateWheelSelection(minuteWheel, getWheelSelectedValue(minuteWheel));
    });
  };

  const closePopover = () => {
    shell.classList.remove('datetime-picker-open');
    trigger.setAttribute('aria-expanded', 'false');
  };

  const togglePopover = () => {
    if (shell.classList.contains('datetime-picker-open')) {
      closePopover();
      return;
    }

    openPopover();
    window.setTimeout(() => {
      prevMonthButton.focus();
    }, 0);
  };

  const bindWheel = (wheel: HTMLElement, onValueChange: () => void) => {
    let scrollTimer = 0;
    let scrollingStateTimer = 0;

    const updateSelectionFromScroll = () => {
      const options = getWheelOptions(wheel);
      if (!options.length) {
        return;
      }

      const centerLine = wheel.scrollTop + wheel.clientHeight / 2;
      let closestOption = options[0];
      let smallestDistance = Number.POSITIVE_INFINITY;

      options.forEach((option) => {
        const optionCenter = option.offsetTop + option.offsetHeight / 2;
        const distance = Math.abs(optionCenter - centerLine);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          closestOption = option;
        }
      });

      const nextValue = closestOption.dataset.datetimePickerWheelValue || getWheelSelectedValue(wheel);
      updateWheelSelection(wheel, nextValue, false);
      syncWheelLoopPosition(wheel);
      onValueChange();
    };

    wheel.addEventListener('focus', openPopover);
    wheel.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const option = target.closest('[data-datetime-picker-wheel-value]') as HTMLButtonElement | null;
      if (!option) {
        return;
      }

      const nextValue = option.dataset.datetimePickerWheelValue || getWheelSelectedValue(wheel);
      updateWheelSelection(wheel, nextValue);
      onValueChange();
    });

    wheel.addEventListener('scroll', () => {
      wheel.classList.add('is-scrolling');
      window.clearTimeout(scrollingStateTimer);
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(updateSelectionFromScroll, 60);
      scrollingStateTimer = window.setTimeout(() => {
        wheel.classList.remove('is-scrolling');
      }, 140);
    });

    wheel.addEventListener('keydown', (event) => {
      const wheelValues = getWheelValues(wheel);
      if (!wheelValues.length) {
        return;
      }

      const currentIndex = Math.max(0, wheelValues.indexOf(getWheelSelectedValue(wheel)));
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        updateWheelSelection(wheel, wheelValues[(currentIndex + 1) % wheelValues.length]);
        onValueChange();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        updateWheelSelection(wheel, wheelValues[(currentIndex - 1 + wheelValues.length) % wheelValues.length]);
        onValueChange();
      }
    });
  };

  trigger.addEventListener('click', togglePopover);
  displayInput.addEventListener('click', togglePopover);
  bindWheel(hourWheel, syncDisplay);
  bindWheel(minuteWheel, syncDisplay);

  prevMonthButton.addEventListener('click', () => {
    const shifted = shiftCalendarMonth(Number(viewYearInput.value), Number(viewMonthInput.value), -1);
    viewYearInput.value = String(shifted.year);
    viewMonthInput.value = pad2(shifted.month);
    const nextDay = Math.min(
      Number(draftDayInput.value) || 1,
      getDaysInMonth(shifted.year, shifted.month)
    );
    draftDayInput.value = pad2(nextDay);
    if (hasCompleteLocalDateTimeValue(hiddenInput.value)) {
      syncDisplay();
    } else {
      updateDraftPreview();
    }
    openPopover();
  });

  nextMonthButton.addEventListener('click', () => {
    const shifted = shiftCalendarMonth(Number(viewYearInput.value), Number(viewMonthInput.value), 1);
    viewYearInput.value = String(shifted.year);
    viewMonthInput.value = pad2(shifted.month);
    const nextDay = Math.min(
      Number(draftDayInput.value) || 1,
      getDaysInMonth(shifted.year, shifted.month)
    );
    draftDayInput.value = pad2(nextDay);
    if (hasCompleteLocalDateTimeValue(hiddenInput.value)) {
      syncDisplay();
    } else {
      updateDraftPreview();
    }
    openPopover();
  });

  calendarGrid.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const dayButton = target.closest('[data-datetime-picker-day]') as HTMLElement | null;
    if (!dayButton) {
      return;
    }

    draftDayInput.value = pad2(Number(dayButton.dataset.datetimePickerDay) || 1);
    syncDisplay();
  });

  clearButton?.addEventListener('click', () => {
    hiddenInput.value = '';
    const fallbackParts = getDefaultDateTimePickerParts('');
    viewYearInput.value = fallbackParts.year;
    viewMonthInput.value = fallbackParts.month;
    draftDayInput.value = fallbackParts.day;
    updateWheelSelection(hourWheel, fallbackParts.hour);
    updateWheelSelection(minuteWheel, fallbackParts.minute);
    displayInput.value = t('step1.testTime.placeholder');
    preview.textContent = `${viewYearInput.value}-${viewMonthInput.value}-${draftDayInput.value} ${getWheelSelectedValue(
      hourWheel
    )}:${getWheelSelectedValue(minuteWheel)}`;
    displayInput.classList.add('datetime-picker-display-placeholder');
    updateCalendar();
    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    closePopover();
    trigger.focus();
  });

  doneButton?.addEventListener('click', () => {
    closePopover();
    trigger.focus();
  });

  shell.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!shell.contains(document.activeElement)) {
        closePopover();
      }
    }, 0);
  });

  displayInput.value = formatLocalDateTimePickerDisplay(hiddenInput.value);
  displayInput.classList.toggle(
    'datetime-picker-display-placeholder',
    !hasCompleteLocalDateTimeValue(hiddenInput.value)
  );
  if (hasCompleteLocalDateTimeValue(hiddenInput.value)) {
    preview.textContent = formatLocalDateTimePickerDisplay(hiddenInput.value);
  } else {
    updateDraftPreview();
  }
  updateWheelSelection(hourWheel, getWheelSelectedValue(hourWheel));
  updateWheelSelection(minuteWheel, getWheelSelectedValue(minuteWheel));
}

function renderSettingsSubViewTabs() {
  const subViews: Array<{ key: SettingsSubView; label: string }> = [
    { key: 'general', label: t('common.generalSettings') },
    { key: 'dictionary', label: t('common.dictionaryManagement') },
    { key: 'template-library', label: t('settings.templateLibraryTab') },
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

function getTemplateLibrarySourceTypeLabel(sourceType: TemplateLibraryEditorDraft['sourceType']) {
  if (sourceType === 'user') {
    return t('templateLibrary.sourceType.user');
  }

  if (sourceType === 'userOverride') {
    return t('templateLibrary.sourceType.override');
  }

  return t('templateLibrary.sourceType.builtin');
}

function renderTemplateLibraryPanel() {
  if (templateLibraryError) {
    return `<div class="error-message large-error">${escapeHtml(templateLibraryError)}</div>`;
  }

  if (!templateLibraryResolved) {
    return `<div class="empty-tip">${escapeHtml(t('templateLibrary.loading'))}</div>`;
  }

  const families = templateLibraryResolved.scientificTemplates;
  const currentQuery = getTemplateLibraryNormalizedQuery();
  const familyTemplates = getTemplateLibraryFamilyTemplates(
    templateLibrarySelectedFamilyId,
    templateLibrarySelectedKind
  ).filter((template) => templateLibraryTemplateMatchesQuery(template, currentQuery));
  const searchResults = getTemplateLibrarySearchResults();
  const isSearchMode = Boolean(getTemplateLibraryNormalizedQuery());
  const editorDraft = templateLibraryEditorDraft;
  const editorTitle = editorDraft
    ? editorDraft.displayName.trim() ||
      (editorDraft.templateType === 'curve' ? editorDraft.blockTitleDefault.trim() : '') ||
      t('templateLibrary.editorTitle')
    : '';
  const isDraftMode = Boolean(
    editorDraft &&
      !templateLibrarySelectedCurveTemplateId &&
      editorDraft.templateType !== 'scientific'
  );
  const renderTemplates: Array<{
    id: string;
    templateType: 'scientific' | 'curve' | 'scalar';
    displayName: string;
    section: ScalarTemplateSection | '';
    unitDefault: string;
    purposeType: StructuredBlockPurpose;
    sourceType: TemplateLibraryEditorDraft['sourceType'];
    enabled: boolean;
    isDraft: boolean;
  }> = isDraftMode
    ? [
        {
          id: '__draft__',
          templateType: editorDraft?.templateType || 'curve',
          displayName: editorDraft?.displayName.trim() || t('templateLibrary.newDraftTitle'),
          section: editorDraft?.templateType === 'scalar' ? editorDraft.scalarSection : '',
          unitDefault: editorDraft?.templateType === 'scalar' ? editorDraft.unitDefault : '',
          purposeType: editorDraft?.purposeType || '',
          sourceType: 'user' as const,
          enabled: editorDraft?.enabled ?? true,
          isDraft: true
        },
        ...familyTemplates.map((template) =>
          'purposeType' in template
            ? {
                id: template.id,
                templateType: 'curve' as const,
                displayName: template.displayName,
                section: '' as const,
                unitDefault: '',
                purposeType: template.purposeType,
                sourceType: getTemplateLibraryEffectiveSourceType(template, 'curve'),
                enabled: isTemplateLibraryTemplateEnabled(template),
                isDraft: false
              }
            : {
                id: template.id,
                templateType: 'scalar' as const,
                displayName: template.displayName,
                section: template.section,
                unitDefault: template.unitDefault || '',
                purposeType: '' as const,
                sourceType: getTemplateLibraryEffectiveSourceType(template, 'scalar'),
                enabled: isTemplateLibraryTemplateEnabled(template),
                isDraft: false
              }
        )
      ]
    : familyTemplates.map((template) =>
        'purposeType' in template
          ? {
              id: template.id,
              templateType: 'curve' as const,
              displayName: template.displayName,
              section: '' as const,
              unitDefault: '',
              purposeType: template.purposeType,
              sourceType: getTemplateLibraryEffectiveSourceType(template, 'curve'),
              enabled: isTemplateLibraryTemplateEnabled(template),
              isDraft: false
            }
          : {
              id: template.id,
              templateType: 'scalar' as const,
              displayName: template.displayName,
              section: template.section,
              unitDefault: template.unitDefault || '',
              purposeType: '' as const,
              sourceType: getTemplateLibraryEffectiveSourceType(template, 'scalar'),
              enabled: isTemplateLibraryTemplateEnabled(template),
              isDraft: false
            }
      );
  const listCount = familyTemplates.length;
  const selectedFamilyName = getTemplateLibraryFamilyById(templateLibrarySelectedFamilyId)?.displayName || '-';
  const templateKindTabs: Array<{
    kind: TemplateLibraryTabKind;
    labelKey:
      | 'templateLibrary.kind.all'
      | 'templateLibrary.kind.curves'
      | 'templateLibrary.kind.conditions'
      | 'templateLibrary.kind.metrics'
      | 'templateLibrary.kind.calculations'
      | 'templateLibrary.kind.bundles';
    enabled: boolean;
  }> = [
    { kind: 'all', labelKey: 'templateLibrary.kind.all', enabled: true },
    { kind: 'curves', labelKey: 'templateLibrary.kind.curves', enabled: true },
    { kind: 'conditions', labelKey: 'templateLibrary.kind.conditions', enabled: true },
    { kind: 'metrics', labelKey: 'templateLibrary.kind.metrics', enabled: true },
    { kind: 'calculations', labelKey: 'templateLibrary.kind.calculations', enabled: false },
    { kind: 'bundles', labelKey: 'templateLibrary.kind.bundles', enabled: false }
  ];
  const isCreateDisabled = templateLibrarySelectedKind === 'all';
  const createCardLabel = getTemplateLibraryCreateCardLabel(templateLibrarySelectedKind);
  const createCardHtml = `
    <button
      type="button"
      class="template-library-result-card template-library-create-card ${isCreateDisabled ? 'template-library-create-card-disabled' : ''}"
      ${isCreateDisabled ? 'disabled' : 'data-template-list-create="true"'}
      title="${escapeHtml(createCardLabel)}"
      aria-label="${escapeHtml(createCardLabel)}"
    >
      <span class="template-library-create-card-plus">＋</span>
    </button>
  `;

  return `
    <div class="template-library-shell">
      <div class="detail-section template-library-search-section">
        <div class="template-library-search-row">
          <div class="template-library-search-box">
            <input
              id="template-library-search-input"
              class="form-input template-library-search-input"
              value="${escapeHtml(templateLibrarySearchQuery)}"
              placeholder="${escapeHtml(t('templateLibrary.searchPlaceholder'))}"
            />
            ${
              isSearchMode
                ? `
                  <div class="template-library-search-dropdown">
                    ${
                      searchResults.length
                        ? searchResults
                            .map((result) => {
                              if (result.resultType === 'family') {
                                return `
                                  <button
                                    type="button"
                                    class="template-library-search-item"
                                    data-template-family-id="${escapeHtml(result.familyId)}"
                                  >
                                    <div class="template-library-search-item-main">
                                      <span class="template-library-search-item-title">${escapeHtml(result.title)}</span>
                                      <span class="template-library-chip">${escapeHtml(result.subtitle)}</span>
                                    </div>
                                    <div class="template-library-search-item-subtitle">${escapeHtml(
                                      t('templateLibrary.familyCount', { count: result.count })
                                    )}</div>
                                  </button>
                                `;
                              }

                              if (result.resultType === 'curve') {
                                return `
                                  <button
                                    type="button"
                                    class="template-library-search-item"
                                    data-template-curve-id="${escapeHtml(result.templateId)}"
                                  >
                                    <div class="template-library-search-item-main">
                                      <span class="template-library-search-item-title">${escapeHtml(result.title)}</span>
                                      <span class="template-library-chip">${escapeHtml(t('templateLibrary.resultType.curve'))}</span>
                                    </div>
                                    <div class="template-library-search-item-meta">
                                      <span class="template-library-chip">${escapeHtml(
                                        getStructuredBlockPurposeLabel(result.purposeType)
                                      )}</span>
                                      <span class="template-library-chip">${escapeHtml(
                                        getTemplateLibrarySourceTypeLabel(result.sourceType)
                                      )}</span>
                                      <span class="${escapeHtml(getTemplateLibraryStatusChipClass(result.enabled))}">${escapeHtml(
                                        getTemplateLibraryStatusLabel(result.enabled)
                                      )}</span>
                                    </div>
                                    <div class="template-library-search-item-subtitle">${escapeHtml(result.subtitle)}</div>
                                  </button>
                                `;
                              }

                              return `
                                <button
                                  type="button"
                                  class="template-library-search-item"
                                  data-template-scalar-id="${escapeHtml(result.templateId)}"
                                >
                                  <div class="template-library-search-item-main">
                                    <span class="template-library-search-item-title">${escapeHtml(result.title)}</span>
                                    <span class="template-library-chip">${escapeHtml(
                                      result.resultType === 'metric'
                                        ? t('templateLibrary.resultType.metric')
                                        : t('templateLibrary.resultType.condition')
                                    )}</span>
                                  </div>
                                  <div class="template-library-search-item-meta">
                                    ${
                                      result.unitDefault
                                        ? `<span class="template-library-chip">${escapeHtml(
                                            `${t('templateLibrary.field.unitDefault')}: ${result.unitDefault}`
                                          )}</span>`
                                        : ''
                                    }
                                    <span class="template-library-chip">${escapeHtml(
                                      getTemplateLibrarySourceTypeLabel(result.sourceType)
                                    )}</span>
                                    <span class="${escapeHtml(getTemplateLibraryStatusChipClass(result.enabled))}">${escapeHtml(
                                      getTemplateLibraryStatusLabel(result.enabled)
                                    )}</span>
                                  </div>
                                  <div class="template-library-search-item-subtitle">${escapeHtml(result.subtitle)}</div>
                                </button>
                              `;
                            })
                            .join('')
                        : `<div class="empty-tip">${escapeHtml(t('templateLibrary.searchEmpty'))}</div>`
                    }
                  </div>
                `
                : ''
            }
          </div>
        </div>
      </div>

      <div class="detail-section template-library-family-section">
        <div class="detail-section-title">${escapeHtml(t('templateLibrary.familyListTitle'))}</div>
        <div class="template-library-family-grid" data-preserve-scroll-key="template-library-family-grid">
          ${families
            .map((family) => {
              const familyCount = getTemplateLibraryFamilyTemplateCount(family.id);
              const familySourceType = getTemplateLibraryEffectiveSourceType(family, 'scientific');
              const familyEnabled = isTemplateLibraryTemplateEnabled(family);

              return `
                <button
                  type="button"
                  class="template-library-family-card ${templateLibrarySelectedFamilyId === family.id ? 'template-library-family-card-active' : ''}"
                  data-template-family-id="${escapeHtml(family.id)}"
                >
                  <span class="template-library-family-card-title">${escapeHtml(family.displayName)}</span>
                  <span class="template-library-family-card-count">${escapeHtml(
                    t('templateLibrary.familyCountShort', { count: familyCount })
                  )}</span>
                  <span class="template-library-family-card-meta">
                    <span class="template-library-chip">${escapeHtml(
                      getTemplateLibrarySourceTypeLabel(familySourceType)
                    )}</span>
                    <span class="${escapeHtml(getTemplateLibraryStatusChipClass(familyEnabled))}">${escapeHtml(
                      getTemplateLibraryStatusLabel(familyEnabled)
                    )}</span>
                  </span>
                </button>
              `;
            })
            .join('')}
          <button
            type="button"
            class="template-library-family-card template-library-family-create-card"
            data-template-family-create="true"
            title="${escapeHtml(t('templateLibrary.newFamily'))}"
            aria-label="${escapeHtml(t('templateLibrary.newFamily'))}"
          >
            <span class="template-library-create-card-plus">＋</span>
          </button>
        </div>
      </div>

      <div class="detail-section template-library-tabs-section">
        <div class="template-library-kind-tabs">
          ${templateKindTabs
            .map(
              (tab) => `
                <button
                  type="button"
                  class="template-library-kind-tab ${templateLibrarySelectedKind === tab.kind ? 'template-library-kind-tab-active' : ''} ${!tab.enabled ? 'template-library-kind-tab-disabled' : ''}"
                  data-template-kind="${escapeHtml(tab.kind)}"
                  ${tab.enabled ? '' : 'disabled'}
                >
                  <span>${escapeHtml(t(tab.labelKey))}</span>
                  ${!tab.enabled ? `<span class="template-library-future-badge">${escapeHtml(t('templateLibrary.future'))}</span>` : ''}
                </button>
              `
            )
            .join('')}
        </div>
      </div>

      <div class="detail-section template-library-results-section">
        <div class="template-library-results-header">
          <div>
            <div class="detail-section-title">${escapeHtml(t('templateLibrary.templateListTitleGeneric'))}</div>
            <div class="detail-section-subtitle">${escapeHtml(
              t('templateLibrary.currentScopeHint', {
                family: selectedFamilyName,
                count: listCount,
                kind: getTemplateLibraryKindLabel(templateLibrarySelectedKind)
              })
            )}</div>
          </div>
        </div>
        <div
          class="template-library-result-grid"
          data-preserve-scroll-key="template-library-result-grid"
        >
          ${
            renderTemplates.length
              ? [
                  ...renderTemplates.map((template) => `
                    <div
                      class="template-library-result-card ${template.isDraft || templateLibrarySelectedCurveTemplateId === template.id ? 'template-library-result-card-active' : ''} ${template.isDraft ? '' : 'template-library-result-card-clickable'}"
                      ${
                        template.isDraft
                          ? ''
                          : `data-template-card-id="${escapeHtml(template.id)}" data-template-card-type="${escapeHtml(template.templateType)}" tabindex="0" role="button" aria-pressed="${templateLibrarySelectedCurveTemplateId === template.id ? 'true' : 'false'}"`
                      }
                    >
                      <div class="template-library-result-card-main">
                        <div class="template-library-result-card-title-row">
                          <span class="template-library-result-card-title">${escapeHtml(template.displayName)}</span>
                          ${
                            template.isDraft
                              ? `<span class="template-library-chip">${escapeHtml(t('templateLibrary.newDraftBadge'))}</span>`
                              : ''
                          }
                        </div>
                        <div class="template-library-result-card-meta">
                          ${
                            template.templateType === 'curve'
                              ? `<span class="template-library-chip">${escapeHtml(
                                  t('templateLibrary.resultType.curve')
                                )}</span>`
                              : ''
                          }
                          ${
                            template.templateType === 'curve' && template.purposeType
                              ? `<span class="template-library-chip">${escapeHtml(
                                  getStructuredBlockPurposeLabel(template.purposeType)
                                )}</span>`
                              : ''
                          }
                          ${
                            template.templateType === 'scalar'
                              ? `<span class="template-library-chip">${escapeHtml(
                                  getTemplateLibrarySectionLabel(template.section)
                                )}</span>`
                              : ''
                          }
                          ${
                            template.templateType === 'scalar' && template.unitDefault
                              ? `<span class="template-library-chip">${escapeHtml(
                                  `${t('templateLibrary.field.unitDefault')}: ${template.unitDefault}`
                                )}</span>`
                              : ''
                          }
                          <span class="template-library-chip">${escapeHtml(
                            getTemplateLibrarySourceTypeLabel(template.sourceType)
                          )}</span>
                          <span class="${escapeHtml(getTemplateLibraryStatusChipClass(template.enabled))}">${escapeHtml(
                            getTemplateLibraryStatusLabel(template.enabled)
                          )}</span>
                        </div>
                      </div>
                      ${
                        template.isDraft
                          ? `
                            <button
                              type="button"
                              class="secondary-btn action-btn template-library-card-close-btn"
                              data-template-draft-discard="true"
                              title="${escapeHtml(t('templateLibrary.discardDraft'))}"
                              aria-label="${escapeHtml(t('templateLibrary.discardDraft'))}"
                            >
                              ×
                            </button>
                          `
                          : ''
                      }
                    </div>
                  `),
                  createCardHtml
                ].join('')
              : `${createCardHtml}<div class="empty-tip">${escapeHtml(t('templateLibrary.templateListEmpty'))}</div>`
          }
        </div>
      </div>

      <div class="detail-section template-library-editor-wide-section">
        ${
          editorDraft
            ? `
              <div class="template-library-editor-shell">
                <div class="template-library-editor-header">
                  <div class="template-library-editor-header-main">
                    <div class="template-library-editor-title-row">
                      <div class="detail-section-title">${escapeHtml(editorTitle)}</div>
                      <span id="template-library-save-state" class="template-library-save-state">${escapeHtml(
                        templateLibrarySaveMessage
                      )}</span>
                    </div>
                  </div>
                    <div class="template-library-editor-header-side">
                      <div class="template-library-meta-strip">
                        <span class="template-library-chip">${escapeHtml(
                          getTemplateLibrarySourceTypeLabel(editorDraft.sourceType)
                        )}</span>
                        <span class="${escapeHtml(getTemplateLibraryStatusChipClass(editorDraft.enabled))}">${escapeHtml(
                          getTemplateLibraryStatusLabel(editorDraft.enabled)
                        )}</span>
                        <span class="template-library-chip">${escapeHtml(
                          editorDraft.templateType === 'scientific'
                            ? t('templateLibrary.resultType.family')
                            : editorDraft.templateType === 'curve'
                            ? getStructuredBlockPurposeLabel(editorDraft.purposeType)
                            : getTemplateLibrarySectionLabel(editorDraft.scalarSection)
                        )}</span>
                      </div>
                      <div class="template-library-editor-actions">
                        ${
                        editorDraft.isBuiltin && editorDraft.hasLocalOverride
                          ? `
                            <button
                              id="template-library-reset-btn"
                              type="button"
                              class="secondary-btn action-btn template-library-compact-btn"
                              ${templateLibrarySaving ? 'disabled' : ''}
                            >
                              ${escapeHtml(t('templateLibrary.resetOverride'))}
                            </button>
                          `
                          : ''
                      }
                      ${
                        !isDraftMode &&
                        editorDraft.sourceType === 'user' &&
                        (editorDraft.templateType !== 'scientific' || isPersistedScientificFamily(editorDraft.templateId))
                          ? `
                            <button
                              id="template-library-delete-btn"
                              type="button"
                              class="danger-btn action-btn template-library-compact-btn"
                              ${templateLibrarySaving ? 'disabled' : ''}
                            >
                              ${escapeHtml(t('templateLibrary.delete'))}
                            </button>
                          `
                          : ''
                      }
                      <button
                        id="template-library-duplicate-btn"
                        type="button"
                        class="secondary-btn action-btn template-library-compact-btn"
                        ${templateLibrarySaving ? 'disabled' : ''}
                      >
                        ${escapeHtml(t('templateLibrary.duplicateTemplate'))}
                      </button>
                      <button
                        id="template-library-save-btn"
                        type="button"
                        class="primary-btn action-btn template-library-compact-btn"
                        ${templateLibrarySaving ? 'disabled' : ''}
                      >
                        ${escapeHtml(
                          templateLibrarySaving
                            ? t('templateLibrary.saving')
                            : editorDraft.isBuiltin
                              ? t('templateLibrary.saveOverride')
                              : t('common.save')
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                ${
                  editorDraft.isBuiltin
                    ? `<div class="empty-tip">${escapeHtml(
                        t('templateLibrary.builtinOverrideHint')
                      )}</div>`
                    : ''
                }

                <div class="template-library-editor-body">
                  <div class="detail-section template-library-editor-section">
                    <div class="detail-section-title">${escapeHtml(t('templateLibrary.section.basic'))}</div>
                    <div class="template-library-readonly-meta">
                      <div class="detail-label">${escapeHtml(t('templateLibrary.templateId'))}</div>
                      <div class="detail-value">${escapeHtml(editorDraft.templateId)}</div>
                    </div>
                    ${
                      editorDraft.templateType !== 'scientific'
                        ? `
                        <div class="template-library-readonly-meta">
                          <div class="detail-label">${escapeHtml(t('templateLibrary.field.family'))}</div>
                          <div class="detail-value">${escapeHtml(
                            getTemplateLibraryFamilyById(editorDraft.familyId)?.displayName || editorDraft.familyId
                          )}</div>
                        </div>
                      `
                        : ''
                    }
                    <div class="template-library-basic-grid">
                      <div class="form-group">
                        <label class="form-label">${escapeHtml(
                          editorDraft.templateType === 'scientific'
                            ? t('templateLibrary.field.familyName')
                            : editorDraft.templateType === 'curve'
                            ? t('templateLibrary.field.curveName')
                            : t('templateLibrary.field.displayName')
                        )}</label>
                        <input id="template-library-display-name" class="form-input" value="${escapeHtml(
                          editorDraft.displayName
                        )}" />
                      </div>
                      ${
                        editorDraft.templateType === 'scientific'
                          ? `
                            <div class="form-group">
                              <label class="form-label">${escapeHtml(t('templateLibrary.field.familyDescription'))}</label>
                              <textarea id="template-library-description" class="form-input template-library-textarea template-library-textarea-compact">${escapeHtml(
                                editorDraft.descriptionText
                              )}</textarea>
                            </div>
                          `
                          : editorDraft.templateType === 'curve'
                          ? `<div class="empty-tip template-library-inline-hint">${escapeHtml(
                              t('templateLibrary.curveNameHint')
                            )}</div>`
                          : `
                            <div class="form-group">
                              <label class="form-label">${escapeHtml(t('templateLibrary.field.scalarSection'))}</label>
                              <select id="template-library-scalar-section" class="form-input">
                                <option value="condition" ${editorDraft.scalarSection === 'condition' ? 'selected' : ''}>
                                  ${escapeHtml(t('templateLibrary.resultType.condition'))}
                                </option>
                                <option value="metric" ${editorDraft.scalarSection === 'metric' ? 'selected' : ''}>
                                  ${escapeHtml(t('templateLibrary.resultType.metric'))}
                                </option>
                              </select>
                            </div>
                          `
                      }
                      <div class="form-group">
                        <label class="form-label">${escapeHtml(t('templateLibrary.field.status'))}</label>
                        <div class="template-library-status-toggle" role="group" aria-label="${escapeHtml(
                          t('templateLibrary.field.status')
                        )}">
                          <button
                            type="button"
                            id="template-library-status-enabled"
                            class="secondary-btn action-btn template-library-status-option ${editorDraft.enabled ? 'template-library-status-option-active' : ''}"
                            ${templateLibrarySaving ? 'disabled' : ''}
                          >
                            ${escapeHtml(t('templateLibrary.status.enabled'))}
                          </button>
                          <button
                            type="button"
                            id="template-library-status-disabled"
                            class="secondary-btn action-btn template-library-status-option ${editorDraft.enabled ? '' : 'template-library-status-option-active template-library-status-option-danger'}"
                            ${templateLibrarySaving ? 'disabled' : ''}
                          >
                            ${escapeHtml(t('templateLibrary.status.disabled'))}
                          </button>
                        </div>
                        <div class="detail-section-subtitle template-library-status-hint">${escapeHtml(
                          t('templateLibrary.field.enabledHint')
                        )}</div>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">${escapeHtml(t('templateLibrary.field.aliases'))}</label>
                      <textarea id="template-library-aliases" class="form-input template-library-textarea template-library-textarea-compact">${escapeHtml(
                        editorDraft.aliasesText
                      )}</textarea>
                    </div>
                  </div>

                  ${
                    editorDraft.templateType === 'scientific'
                      ? ''
                      : editorDraft.templateType === 'scalar'
                      ? `
                        <div class="detail-section template-library-editor-section">
                          <div class="detail-section-title">${escapeHtml(t('templateLibrary.section.scalarDefaults'))}</div>
                          <div class="template-library-basic-grid">
                            <div class="form-group">
                              <label class="form-label">${escapeHtml(t('templateLibrary.field.unitDefault'))}</label>
                              <input id="template-library-unit-default" class="form-input" value="${escapeHtml(
                                editorDraft.unitDefault
                              )}" />
                            </div>
                            <div class="form-group">
                              <label class="form-label">${escapeHtml(t('templateLibrary.field.defaultValue'))}</label>
                              <input id="template-library-default-value" class="form-input" value="${escapeHtml(
                                editorDraft.defaultValue
                              )}" />
                            </div>
                            <div class="form-group">
                              <label class="form-label">${escapeHtml(t('templateLibrary.field.valueType'))}</label>
                              <select id="template-library-value-type" class="form-input">
                                <option value="" ${editorDraft.valueType ? '' : 'selected'}>${escapeHtml(
                                  t('templateLibrary.valueType.empty')
                                )}</option>
                                <option value="number" ${editorDraft.valueType === 'number' ? 'selected' : ''}>${escapeHtml(
                                  t('templateLibrary.valueType.number')
                                )}</option>
                                <option value="text" ${editorDraft.valueType === 'text' ? 'selected' : ''}>${escapeHtml(
                                  t('templateLibrary.valueType.text')
                                )}</option>
                                <option value="date" ${editorDraft.valueType === 'date' ? 'selected' : ''}>${escapeHtml(
                                  t('templateLibrary.valueType.date')
                                )}</option>
                                <option value="boolean" ${editorDraft.valueType === 'boolean' ? 'selected' : ''}>${escapeHtml(
                                  t('templateLibrary.valueType.boolean')
                                )}</option>
                                <option value="option" ${editorDraft.valueType === 'option' ? 'selected' : ''}>${escapeHtml(
                                  t('templateLibrary.valueType.option')
                                )}</option>
                              </select>
                            </div>
                          </div>
                          <div class="form-group">
                            <label class="form-label">${escapeHtml(t('templateLibrary.field.note'))}</label>
                            <textarea id="template-library-note" class="form-input template-library-textarea template-library-textarea-compact">${escapeHtml(
                              editorDraft.note
                            )}</textarea>
                          </div>
                        </div>
                      `
                      : `
                        <div class="detail-section template-library-editor-section">
                          <div class="detail-section-title">${escapeHtml(t('templateLibrary.section.axisSettings'))}</div>
                          <div class="template-library-axis-header" aria-hidden="true">
                            <span>${escapeHtml(t('templateLibrary.axis.column.axis'))}</span>
                            <span>${escapeHtml(t('templateLibrary.axis.column.name'))}</span>
                            <span>${escapeHtml(t('templateLibrary.axis.column.unit'))}</span>
                          </div>
                          <div class="template-library-axis-rows">
                            <div class="template-library-axis-row">
                              <div class="template-library-axis-label">${escapeHtml(t('templateLibrary.axis.x'))}</div>
                              <input
                                id="template-library-primary-label"
                                class="form-input"
                                aria-label="${escapeHtml(t('templateLibrary.field.primaryLabel'))}"
                                placeholder="${escapeHtml(t('templateLibrary.field.primaryLabelPlaceholder'))}"
                                value="${escapeHtml(
                                editorDraft.primaryLabel
                              )}"
                              />
                              <input
                                id="template-library-primary-unit"
                                class="form-input"
                                aria-label="${escapeHtml(t('templateLibrary.field.primaryUnit'))}"
                                placeholder="${escapeHtml(t('templateLibrary.field.primaryUnitPlaceholder'))}"
                                value="${escapeHtml(
                                editorDraft.primaryUnit
                              )}"
                              />
                            </div>
                            <div class="template-library-axis-row">
                              <div class="template-library-axis-label">${escapeHtml(t('templateLibrary.axis.y'))}</div>
                              <input
                                id="template-library-secondary-label"
                                class="form-input"
                                aria-label="${escapeHtml(t('templateLibrary.field.secondaryLabel'))}"
                                placeholder="${escapeHtml(t('templateLibrary.field.secondaryLabelPlaceholder'))}"
                                value="${escapeHtml(
                                editorDraft.secondaryLabel
                              )}"
                              />
                              <input
                                id="template-library-secondary-unit"
                                class="form-input"
                                aria-label="${escapeHtml(t('templateLibrary.field.secondaryUnit'))}"
                                placeholder="${escapeHtml(t('templateLibrary.field.secondaryUnitPlaceholder'))}"
                                value="${escapeHtml(
                                editorDraft.secondaryUnit
                              )}"
                              />
                            </div>
                          </div>
                        </div>

                        <details class="template-library-advanced-shell">
                          <summary class="template-library-advanced-summary">
                            <span class="detail-section-title">${escapeHtml(t('templateLibrary.section.advanced'))}</span>
                          </summary>
                          <div class="detail-section template-library-editor-section template-library-advanced-section">
                            <div class="template-library-advanced-grid">
                              <div class="form-group">
                                <label class="form-label">${escapeHtml(t('templateLibrary.field.blockTitleOverride'))}</label>
                                <input
                                  id="template-library-block-title"
                                  class="form-input"
                                  placeholder="${escapeHtml(t('templateLibrary.field.blockTitleOverridePlaceholder'))}"
                                  value="${escapeHtml(getTemplateLibraryVisibleBlockTitleOverride(editorDraft))}"
                                />
                              </div>
                              <div class="form-group">
                                <label class="form-label">${escapeHtml(t('templateLibrary.field.curveDataTypeAdvanced'))}</label>
                                <select id="template-library-purpose-type" class="form-input">
                                  ${STRUCTURED_BLOCK_PURPOSE_OPTIONS.map(
                                    (option) => `
                                      <option value="${escapeHtml(option.value)}" ${editorDraft.purposeType === option.value ? 'selected' : ''}>
                                        ${escapeHtml(option.label)}
                                      </option>
                                    `
                                  ).join('')}
                                </select>
                              </div>
                              <div class="form-group">
                                <label class="form-label">${escapeHtml(t('templateLibrary.field.filenameHints'))}</label>
                                <textarea id="template-library-filename-hints" class="form-input template-library-textarea template-library-textarea-compact">${escapeHtml(
                                  editorDraft.filenameHintsText
                                )}</textarea>
                              </div>
                              <div class="template-library-future-note">
                                <div class="detail-label">${escapeHtml(t('templateLibrary.importDefaultsTitle'))}</div>
                                <div class="detail-section-subtitle">${escapeHtml(
                                  t('templateLibrary.importDefaultsFutureHint')
                                )}</div>
                              </div>
                            </div>
                          </div>
                        </details>
                      `
                  }
                </div>
              </div>
            `
            : `<div class="empty-tip">${escapeHtml(t('templateLibrary.editorEmpty'))}</div>`
        }
      </div>
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

        await Promise.all([ensureActiveEntryDraftLoaded(), ensureRecentEntrySuggestionsLoaded()]);
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
    if (!activeEntryDraftLoaded) {
      void ensureActiveEntryDraftLoaded().then(() => {
        requestRender(true);
      });
    }

    if (!recentEntrySuggestionsLoaded) {
      void ensureRecentEntrySuggestionsLoaded().then(() => {
        requestRender(true);
      });
    }

    const hasActiveDraft = Boolean(activeEntryDraft);
    const entryCardTitle = hasActiveDraft ? t('home.resumeDraftTitle') : t('home.addDataTitle');
    const entryCardDesc = hasActiveDraft
      ? t('home.resumeDraftDesc', {
          updatedAt: formatDateTimeForDisplay(activeEntryDraft?.updatedAt || '')
        })
      : t('home.addDataDesc');
    const entryCardPrimaryLabel = hasActiveDraft ? t('draft.resumeButton') : t('common.enter');
    const entryCardSecondaryActions = hasActiveDraft
      ? `
          <div class="form-action-row">
            <button id="discard-draft-btn" class="secondary-btn action-btn" type="button">${escapeHtml(
              t('draft.discardButton')
            )}</button>
          </div>
        `
      : '';

    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { label: t('common.home'), icon: '⌂', active: true },
          { id: 'menu-add-home', label: t('common.addData'), icon: '＋' },
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
                  <div class="entry-title">${escapeHtml(entryCardTitle)}</div>
                  <div class="entry-desc">${escapeHtml(entryCardDesc)}</div>
                  <button id="add-data-btn" class="primary-btn">${escapeHtml(entryCardPrimaryLabel)}</button>
                  ${entryCardSecondaryActions}
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

    document.getElementById('add-data-btn')?.addEventListener('click', async () => {
      await openAddDataEntry();
    });

    document.getElementById('menu-add-home')?.addEventListener('click', async () => {
      await openAddDataEntry();
    });

    document.getElementById('discard-draft-btn')?.addEventListener('click', async () => {
      const draft = await ensureActiveEntryDraftLoaded();
      if (!draft) {
        return;
      }

      const confirmed = window.confirm(
        t('draft.discardConfirm', {
          label: draft.originDisplayName || buildDisplayName(draft.step1)
        })
      );
      if (!confirmed) {
        return;
      }

      const discarded = await discardActiveDraftAndRefresh();
      if (!discarded) {
        return;
      }

      resetFormState();
      requestRender(true);
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
          { id: 'analysis-menu-add', label: t('common.addData'), icon: '＋' },
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
            ${renderAnalysisHandoffNotice()}
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
    if (!dictionaryLoaded || !recentEntrySuggestionsLoaded) {
      void ensureEntryWorkflowAssistDataLoaded().then(() => {
        requestRender(true);
      });
    }

    const canProceedToStep2 = !validateStep1();

    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'menu-home', label: t('common.home'), icon: '⌂' },
          { label: t('common.addData'), icon: '＋', active: true },
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
            <div class="welcome-card add-step1-card">
              <h2>${escapeHtml(t('addData.heading'))}</h2>
              <p class="subtitle subtitle-compact">${escapeHtml(t('addData.subtitle'))}</p>

              <div class="step1-status-stack">
                ${renderActiveDraftStatusCard({ compact: true })}
                ${renderStep1CompletenessStrip()}
              </div>

              <div class="step-form-grid">
                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.testProject'))} <span class="required-star">*</span></label>
                  <div class="step1-suggestion-shell">
                    <input id="testProject" class="form-input" placeholder="${escapeHtml(t('step1.placeholder.testProject'))}" value="${escapeHtml(step1FormData.testProject)}" autocomplete="off" />
                    <div id="testProject-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="testProject-dictionary-feedback" class="field-feedback-message"></div>
                </div>

                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.sampleCode'))} <span class="required-star">*</span></label>
                  <div class="step1-suggestion-shell">
                    <div class="input-plus-row">
                      <input
                        id="sampleCode"
                        class="form-input"
                        placeholder="${escapeHtml(t('step1.placeholder.sampleCode'))}"
                        value="${escapeHtml(step1FormData.sampleCode)}"
                        autocomplete="off"
                      />
                      <button id="sampleCode-plus-btn" class="icon-btn" type="button">＋</button>
                    </div>
                    <div id="sampleCode-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="sampleCode-dictionary-feedback" class="field-feedback-message"></div>
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
                  ${renderDateTimePicker('testTime', step1FormData.testTime)}
                </div>

                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('step1.field.sampleOwner'))}</label>
                  <div class="step1-suggestion-shell">
                    <div class="input-plus-row">
                      <input
                        id="sampleOwner"
                        class="form-input"
                        placeholder="${escapeHtml(t('step1.placeholder.sampleOwner'))}"
                        value="${escapeHtml(step1FormData.sampleOwner)}"
                        autocomplete="off"
                      />
                      <button id="sampleOwner-plus-btn" class="icon-btn" type="button">＋</button>
                    </div>
                    <div id="sampleOwner-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="sampleOwner-dictionary-feedback" class="field-feedback-message"></div>
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

              <div class="form-action-row form-action-row-compact">
                <button id="step1-cancel-btn" class="secondary-btn" type="button">${escapeHtml(t('addData.cancelAndReturn'))}</button>
                <button id="step1-save-draft-btn" class="secondary-btn" type="button">${escapeHtml(t('draft.saveAndReturn'))}</button>
                <button id="step1-next-btn" class="primary-btn action-btn" type="button" ${canProceedToStep2 ? '' : 'disabled'}>${escapeHtml(t('step1.nextButton'))}</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    bindAppSidebarEvents();
    bindStep1Events();

    document.getElementById('menu-data-step1')?.addEventListener('click', async () => {
      saveStep1InputsToState();
      await attemptLeaveCreateFlow('step1', async () => {
        await loadDatabaseListView();
        currentView = 'database-list';
        void render();
      });
    });

    document.getElementById('menu-analysis-step1')?.addEventListener('click', async () => {
      saveStep1InputsToState();
      await attemptLeaveCreateFlow('step1', async () => {
        await openAnalysisWorkspace();
      });
    });

    document.getElementById('menu-settings-step1')?.addEventListener('click', async () => {
      saveStep1InputsToState();
      await attemptLeaveCreateFlow('step1', async () => {
        await openSettingsView();
      });
    });

    return;
  }

  if (currentView === 'add-step2') {
    if (!dictionaryLoaded || !recentEntrySuggestionsLoaded) {
      void ensureEntryWorkflowAssistDataLoaded().then(() => {
        requestRender(true);
      });
    }

    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'menu-home-step2', label: t('common.home'), icon: '⌂' },
          { label: t('common.addData'), icon: '＋', active: true },
          { id: 'menu-data-step2', label: t('common.data'), icon: '▣' },
          { id: 'menu-analysis-step2', label: t('common.analysis'), icon: '◫' },
          { id: 'menu-settings-step2', label: t('common.settings'), icon: '⚙' }
        ])}

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">${escapeHtml(t('step2.topbarTitle'))}</div>
            <button id="back-step1-btn-top" class="text-btn" type="button">${escapeHtml(t('common.back'))}</button>
          </header>

          <section class="content-area">
            <div class="welcome-card add-step2-card">
              <h2>${escapeHtml(t('step2.heading'))}</h2>
              <p class="subtitle subtitle-compact">${escapeHtml(t('step2.subtitle'))}</p>

              <div class="step2-status-stack">
                ${renderStep2StatusArea()}
                ${renderActiveDraftStatusCard({ compact: true })}
              </div>

              ${renderScalarSections('create-step2', step2DataItems)}

              <div class="template-block-section step2-entry-section">
                <div class="dynamic-header step2-section-header">
                  <div>
                    <div class="dynamic-title">${escapeHtml(t('step2.structured.sectionTitle'))}</div>
                    <div class="dynamic-subtitle step2-section-subtitle">${escapeHtml(
                      t('step2.structured.sectionSubtitle')
                    )}</div>
                  </div>

                  <div class="template-block-toolbar step2-section-toolbar">
                    <button
                      id="add-template-block-btn"
                      class="secondary-btn step2-compact-add-btn"
                      type="button"
                      title="${escapeHtml(t('step2.structured.addButton'))}"
                      aria-label="${escapeHtml(t('step2.structured.addButton'))}"
                    >
                      ${escapeHtml(t('step2.addCompact'))}
                    </button>
                  </div>
                </div>

                ${renderStructuredRecommendationButtons('create-step2')}

                <div class="step2-added-summary">${escapeHtml(
                  step2TemplateBlocks.length
                    ? t('step2.added.summary', { count: step2TemplateBlocks.length })
                    : t('step2.added.empty')
                )}</div>

                <div id="template-blocks-container" class="template-block-list">
                  ${renderTemplateBlockCards(step2TemplateBlocks, 'create-step2')}
                </div>
              </div>

              <div id="step2-error" class="error-message large-error"></div>

              <div class="form-action-row form-action-row-compact">
                <button id="back-step1-btn-bottom" class="secondary-btn" type="button">${escapeHtml(t('common.back'))}</button>
                <button id="step2-save-draft-btn" class="secondary-btn" type="button">${escapeHtml(t('draft.saveAndReturn'))}</button>
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
      saveStep2InputsToState();
      await attemptLeaveCreateFlow('step2', async () => {
        await loadDatabaseListView();
        currentView = 'database-list';
        void render();
      });
    });

    document.getElementById('menu-analysis-step2')?.addEventListener('click', async () => {
      saveStep2InputsToState();
      await attemptLeaveCreateFlow('step2', async () => {
        await openAnalysisWorkspace();
      });
    });

    document.getElementById('menu-settings-step2')?.addEventListener('click', async () => {
      saveStep2InputsToState();
      await attemptLeaveCreateFlow('step2', async () => {
        await openSettingsView();
      });
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

          <div class="form-action-row">
            <button id="save-success-create-similar-btn" class="primary-btn action-btn">${escapeHtml(t('saveSuccess.createSimilar'))}</button>
            <button id="save-success-open-detail-btn" class="secondary-btn" type="button">${escapeHtml(t('saveSuccess.openSavedRecord'))}</button>
            <button id="save-success-home-btn" class="secondary-btn" type="button">${escapeHtml(t('common.backToHome'))}</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('save-success-home-btn')?.addEventListener('click', () => {
      resetFormState();
      currentView = 'home';
      void render();
    });

    document.getElementById('save-success-open-detail-btn')?.addEventListener('click', async () => {
      if (!lastSavedExperimentId) {
        return;
      }

      await openExperimentDetail(lastSavedExperimentId);
    });

    document.getElementById('save-success-create-similar-btn')?.addEventListener('click', async () => {
      if (!lastSavedExperimentId) {
        return;
      }

      const detail = await window.electronAPI.getExperimentDetail(lastSavedExperimentId);
      if (!detail) {
        alert(t('draft.copyFailed'));
        return;
      }

      await createNewDraftFromExperimentDetail(detail);
    });

    return;
  }

  if (currentView === 'database-list') {
    if (!databaseWorkspaceStateLoaded) {
      void ensureDatabaseWorkspaceStateLoaded().then(() => {
        requestRender(true);
      });
    }

    const visibleResultCount = getVisibleExperimentIds().length;
    const hasCustomizedWorkspaceState = hasCustomizedDatabaseWorkspaceState();
    const groupByOptions = getDatabaseGroupByOptions();

    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'db-menu-home', label: t('common.home'), icon: '⌂' },
          { id: 'db-menu-add', label: t('common.addData'), icon: '＋' },
          { label: t('common.data'), icon: '▣', active: true },
          { id: 'db-menu-analysis', label: t('common.analysis'), icon: '◫' },
          { id: 'db-menu-settings', label: t('common.settings'), icon: '⚙' }
        ])}

	        <main class="main-content">
	          <header class="topbar">
	            <div class="topbar-title">${escapeHtml(t('database.topbarTitle'))}</div>
	            <div class="detail-top-actions">
                <span>${escapeHtml(t('database.toolbar.resultCount', { count: visibleResultCount }))}</span>
            </div>
          </header>

          <section class="content-area">
            <div class="welcome-card database-workspace-card">
              <section class="database-search-bar-row">
                <input
                  id="db-search-input"
                  class="form-input database-search-input"
                  placeholder="${escapeHtml(t('database.searchPlaceholder'))}"
                  value="${escapeHtml(databaseSearchKeyword)}"
                />
                <button id="db-search-btn" class="secondary-btn database-toolbar-btn search-btn" type="button">${escapeHtml(t('common.search'))}</button>
                <button
                  id="db-filter-add-btn"
                  class="secondary-btn database-toolbar-btn database-toolbar-icon-btn"
                  type="button"
                  title="${escapeHtml(t('database.filter.addTooltip'))}"
                  aria-label="${escapeHtml(t('database.filter.addTooltip'))}"
                >
                  ＋
                </button>
                <button
                  id="db-reset-filters-btn"
                  class="secondary-btn database-toolbar-btn database-toolbar-icon-btn"
                  type="button"
                  title="${escapeHtml(t('database.resetFilters'))}"
                  aria-label="${escapeHtml(t('database.resetFilters'))}"
                  ${hasCustomizedWorkspaceState ? '' : 'disabled'}
                >
                  ↺
                </button>
                ${renderFrequentDatabaseFiltersEntry()}
              </section>

              <section class="database-browse-controls">
                <div class="database-control-group">
                  <span class="database-inline-label">${escapeHtml(t('database.controls.groupBy'))}</span>
                  <select id="db-groupby-select" class="form-input database-compact-select">
                    ${groupByOptions
                      .map(
                        (option) => `
                          <option value="${escapeHtml(option.key)}" ${databaseGroupBy === option.key ? 'selected' : ''}>
                            ${escapeHtml(option.label)}
                          </option>
                        `
                      )
                      .join('')}
                  </select>
                </div>
                <div class="database-control-group">
                  <span class="database-inline-label">${escapeHtml(t('database.controls.sort'))}</span>
                  <button
                    id="db-sort-toggle-btn"
                    class="secondary-btn database-toolbar-btn database-sort-toggle-btn"
                    type="button"
                    title="${escapeHtml(
                      databaseSortOrder === 'newest'
                        ? t('database.sort.toggleToOldest')
                        : t('database.sort.toggleToNewest')
                    )}"
                  >
                    ${escapeHtml(
                      databaseSortOrder === 'newest'
                        ? t('database.sort.toggleNewest')
                        : t('database.sort.toggleOldest')
                    )}
                  </button>
                </div>
                <div class="database-control-group">
                  <button
                    id="db-starred-filter-btn"
                    class="secondary-btn database-toolbar-btn database-pill-btn ${databaseStarredOnly ? 'database-pill-btn-active' : ''}"
                    type="button"
                  >
                    ${escapeHtml(t('database.star.filterLabel'))}
                  </button>
                </div>
              </section>

              ${renderDatabaseFilterChipStrip()}
              ${renderDatabaseBulkActionBar()}

              <div class="database-list-wrapper">
                ${renderDatabaseGroups(databaseGroups)}
              </div>
            </div>
          </section>
        </main>
      </div>

      ${renderDatabaseFilterPanel()}

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

    document.getElementById('db-menu-add')?.addEventListener('click', async () => {
      await openAddDataEntry();
    });

    document.getElementById('db-menu-settings')?.addEventListener('click', () => {
      void openSettingsView();
    });

    document.getElementById('db-menu-analysis')?.addEventListener('click', async () => {
      await openAnalysisWorkspace();
    });

    const applyDatabaseSearch = async () => {
      const input = document.getElementById('db-search-input') as HTMLInputElement | null;
      databaseSearchKeyword = input?.value.trim() || '';
      closeDatabaseFrequentFiltersPopover();
      await loadDatabaseList();
      await recordCurrentDatabaseWorkspaceUsage();
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

    document.getElementById('db-reset-filters-btn')?.addEventListener('click', async () => {
      resetDatabaseWorkspaceControls();
      await loadDatabaseList();
      await recordCurrentDatabaseWorkspaceUsage();
      void render();
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

    document.getElementById('db-groupby-select')?.addEventListener('change', async (event) => {
      databaseGroupBy = (event.target as HTMLSelectElement).value as GroupByType;
      closeDatabaseFrequentFiltersPopover();
      await loadDatabaseList();
      await recordCurrentDatabaseWorkspaceUsage();
      void render();
    });

    document.getElementById('db-starred-filter-btn')?.addEventListener('click', async () => {
      databaseStarredOnly = !databaseStarredOnly;
      closeDatabaseFrequentFiltersPopover();
      await loadDatabaseList();
      await recordCurrentDatabaseWorkspaceUsage();
      void render();
    });

    document.getElementById('db-sort-toggle-btn')?.addEventListener('click', async () => {
      databaseSortOrder = databaseSortOrder === 'newest' ? 'oldest' : 'newest';
      closeDatabaseFrequentFiltersPopover();
      await loadDatabaseList();
      await recordCurrentDatabaseWorkspaceUsage();
      void render();
    });

    document.getElementById('db-frequent-filters-btn')?.addEventListener('click', () => {
      databaseFrequentFiltersOpen = !databaseFrequentFiltersOpen;
      void renderPreservingContentScroll();
    });

    document.getElementById('db-frequent-filters-close-btn')?.addEventListener('click', () => {
      closeDatabaseFrequentFiltersPopover();
      void renderPreservingContentScroll();
    });

    document.querySelectorAll('[data-apply-frequent-filter-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const filterId = (button as HTMLElement).dataset.applyFrequentFilterId;
        const target = frequentDatabaseFilters.find((item) => item.id === filterId);
        if (!target) {
          return;
        }

        applyDatabaseWorkspaceCombination(target);
        closeDatabaseFrequentFiltersPopover();
        await loadDatabaseList();
        await recordCurrentDatabaseWorkspaceUsage();
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

    const starButtons = document.querySelectorAll('[data-toggle-star-id]');
    starButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const id = Number(target.dataset.toggleStarId);
        if (!id) return;

        await toggleExperimentStarStatus(id, {
          reloadDatabaseList: databaseStarredOnly,
          preserveScroll: true
        });
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

    if (!databaseWorkspaceStateLoaded) {
      void ensureDatabaseWorkspaceStateLoaded().then(() => {
        requestRender(true);
      });
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
          { id: 'detail-menu-add', label: t('common.addData'), icon: '＋' },
          { id: 'detail-menu-list', label: t('common.data'), icon: '▣', active: true },
          { id: 'detail-menu-analysis', label: t('common.analysis'), icon: '◫' },
          { id: 'detail-menu-settings', label: t('common.settings'), icon: '⚙' }
        ])}

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">${escapeHtml(detailEditMode ? t('databaseDetail.titleEditing') : t('databaseDetail.titleReadonly'))}</div>
            <div class="detail-top-actions">
              ${detailEditMode
        ? `<button id="detail-cancel-edit-btn" class="secondary-btn database-toolbar-btn">${escapeHtml(t('databaseDetail.cancelEdit'))}</button>`
        : `
            <button
              id="detail-back-btn"
              class="secondary-btn detail-toolbar-icon-btn"
              type="button"
              title="${escapeHtml(t('common.backToList'))}"
            >
              ←
            </button>
            <button
              id="detail-toggle-star-btn"
              class="secondary-btn detail-toolbar-icon-btn"
              type="button"
              title="${escapeHtml(
                isExperimentStarred(currentDetail.id) ? t('database.star.remove') : t('database.star.add')
              )}"
            >
              ${isExperimentStarred(currentDetail.id) ? '★' : '☆'}
            </button>
            <button
              id="detail-edit-btn"
              class="secondary-btn detail-toolbar-icon-btn"
              type="button"
              title="${escapeHtml(t('databaseDetail.edit'))}"
            >
              ✎
            </button>
          `
      }
              ${detailEditMode
                ? `<button
                    id="detail-back-btn"
                    class="secondary-btn detail-toolbar-icon-btn"
                    type="button"
                    title="${escapeHtml(t('common.backToList'))}"
                  >
                    ←
                  </button>`
                : ''}
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
                        <div class="detail-item">
                          <div class="detail-label">${escapeHtml(t('step1.field.testTime'))}</div>
                          ${renderDateTimePicker('edit-testTime', detailEditStep1.testTime)}
                        </div>
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
            })),
            false,
            getStructuredFamilyContextDisplay('detail-readonly').familyLabel || currentDetail.testProject
          )
          : `<div class="empty-tip">${escapeHtml(t('databaseDetail.structuredEmpty'))}</div>`
      }
              </div>

              ${detailEditMode ? '' : renderRelatedRecordsSection()}

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

    document.getElementById('detail-menu-add')?.addEventListener('click', async () => {
      await openAddDataEntry();
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

    document.getElementById('detail-toggle-star-btn')?.addEventListener('click', async () => {
      if (!currentDetail) {
        return;
      }

      await toggleExperimentStarStatus(currentDetail.id);
    });

    const relatedDetailButtons = document.querySelectorAll('[data-open-related-detail-id]');
    relatedDetailButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const experimentId = Number(target.dataset.openRelatedDetailId);
        if (!experimentId) {
          return;
        }

        await openExperimentDetail(experimentId);
      });
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

      bindDateTimePicker('edit-testTime');
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
        !hasCompleteLocalDateTimeValue(collected.step1.testTime)
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
    const dictionaryManagementHtml = renderProvenanceManagementPanel();
    const templateLibraryHtml = renderTemplateLibraryPanel();
    const aboutSettingsHtml = `
      ${renderAboutSurface(appName, version)}
    `;

    root.innerHTML = `
      <div class="home-layout">
        ${renderAppSidebar(appName, [
          { id: 'settings-menu-home', label: t('common.home'), icon: '⌂' },
          { id: 'settings-menu-add', label: t('common.addData'), icon: '＋' },
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
                    : settingsSubView === 'template-library'
                      ? t('settings.heading.templateLibrary')
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
                      : settingsSubView === 'template-library'
                        ? escapeHtml(t('settings.subtitle.templateLibrary'))
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
                    : settingsSubView === 'template-library'
                      ? templateLibraryHtml
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
      if (settingsSubView === 'template-library' && !confirmDiscardTemplateLibraryChanges()) {
        return;
      }
      currentView = 'home';
      void render();
    });

    document.getElementById('settings-menu-add')?.addEventListener('click', async () => {
      if (settingsSubView === 'template-library' && !confirmDiscardTemplateLibraryChanges()) {
        return;
      }
      await openAddDataEntry();
    });

    document.getElementById('settings-menu-data')?.addEventListener('click', async () => {
      if (settingsSubView === 'template-library' && !confirmDiscardTemplateLibraryChanges()) {
        return;
      }
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('settings-menu-analysis')?.addEventListener('click', async () => {
      if (settingsSubView === 'template-library' && !confirmDiscardTemplateLibraryChanges()) {
        return;
      }
      await openAnalysisWorkspace();
    });

    document.getElementById('settings-back-home-btn')?.addEventListener('click', () => {
      if (settingsSubView === 'template-library' && !confirmDiscardTemplateLibraryChanges()) {
        return;
      }
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
      const applyProvenanceSearch = () => {
        const input = document.getElementById('provenance-search-input') as HTMLInputElement | null;
        provenanceSearchQuery = input?.value || '';
        requestRender(true);
      };

      document.getElementById('provenance-search-btn')?.addEventListener('click', () => {
        applyProvenanceSearch();
      });

      document.getElementById('provenance-search-input')?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') {
          return;
        }

        event.preventDefault();
        applyProvenanceSearch();
      });

      document.getElementById('provenance-search-input')?.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        provenanceSearchQuery = target.value;
        requestRender(true);
      });

      document.querySelectorAll('[data-provenance-tab]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const dictionaryType = target.dataset.provenanceTab as ProvenanceDictionaryType | undefined;
          if (!dictionaryType) {
            return;
          }

          provenanceSelectedType = dictionaryType;
          provenanceAddExpandedType = null;
          provenanceHighlightedItemId = null;
          requestRender(true);
        });
      });

      document.querySelectorAll('[data-provenance-result-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const dictionaryType = target.dataset.provenanceResultType as ProvenanceDictionaryType | undefined;
          const itemId = target.dataset.provenanceResultId;
          if (!dictionaryType || !itemId) {
            return;
          }

          provenanceSelectedType = dictionaryType;
          provenanceHighlightedItemId = itemId;
          provenanceSearchQuery = '';
          provenanceAddExpandedType = null;
          requestRender(true);
        });
      });

      document.querySelectorAll('[data-provenance-chip-select]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const itemId = target.dataset.provenanceChipSelect;
          if (!itemId) {
            return;
          }

          provenanceHighlightedItemId = itemId;
          requestRender(true);
        });
      });

      document.querySelectorAll('[data-provenance-add-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const dictionaryType = target.dataset.provenanceAddToggle as ProvenanceDictionaryType | undefined;
          if (!dictionaryType) {
            return;
          }

          provenanceSelectedType = dictionaryType;
          provenanceAddExpandedType = dictionaryType;
          dictionarySectionErrors[dictionaryType] = '';
          requestRender(true);
        });
      });

      PROVENANCE_DICTIONARY_TYPES.forEach((dictionaryType) => {
        document
          .getElementById(`dictionary-input-${dictionaryType}`)
          ?.addEventListener('input', (event) => {
            const target = event.target as HTMLInputElement;
            dictionaryInputValues[dictionaryType] = target.value;

            if (dictionarySectionErrors[dictionaryType]) {
              dictionarySectionErrors[dictionaryType] = '';
            }
          });

        document
          .getElementById(`dictionary-input-${dictionaryType}`)
          ?.addEventListener('keydown', async (event) => {
            if (event.key !== 'Enter') {
              return;
            }

            event.preventDefault();
            const submitButton = document.querySelector(
              `[data-provenance-add-submit="${dictionaryType}"]`
            ) as HTMLButtonElement | null;
            submitButton?.click();
          });
      });

      document.querySelectorAll('[data-provenance-add-cancel]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const dictionaryType = target.dataset.provenanceAddCancel as ProvenanceDictionaryType | undefined;
          if (!dictionaryType) {
            return;
          }

          provenanceAddExpandedType = null;
          dictionarySectionErrors[dictionaryType] = '';
          requestRender(true);
        });
      });

      document.querySelectorAll('[data-provenance-add-submit]').forEach((button) => {
        button.addEventListener('click', async () => {
          if (dictionarySubmittingType || dictionaryDeletingId) {
            return;
          }

          const target = button as HTMLElement;
          const dictionaryType = target.dataset.provenanceAddSubmit as ProvenanceDictionaryType | undefined;
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
              dictionarySectionErrors[dictionaryType] = result.error || t('provenance.addFailed');
              return;
            }

            provenanceSelectedType = dictionaryType;
            provenanceHighlightedItemId = result.item?.id || null;
            provenanceAddExpandedType = null;
            dictionaryInputValues[dictionaryType] = '';
            await reloadDictionaryItems();
          } catch (error) {
            dictionarySectionErrors[dictionaryType] = getErrorMessage(error) || t('provenance.addFailed');
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
            t('provenance.deleteConfirm', { label })
          );
          if (!shouldContinue) {
            return;
          }

          dictionaryDeletingId = id;
          requestRender(true);

          try {
            const result = await window.electronAPI.deactivateDictionaryItem({ id });
            if (!result.success) {
              alert(result.error || t('provenance.deleteFailed'));
              return;
            }

            if (provenanceHighlightedItemId === id) {
              provenanceHighlightedItemId = null;
            }

            await reloadDictionaryItems();
          } catch (error) {
            alert(getErrorMessage(error) || t('provenance.deleteFailed'));
          } finally {
            dictionaryDeletingId = null;
            requestRender(true);
          }
        });
      });

      return;
    }

    if (settingsSubView === 'template-library') {
      document.querySelectorAll('[data-template-family-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const familyId = target.dataset.templateFamilyId;
          if (!familyId) {
            return;
          }

          void selectTemplateLibraryFamily(familyId);
        });
      });

      document.querySelectorAll('[data-template-family-create]').forEach((button) => {
        button.addEventListener('click', () => {
          startTemplateLibraryNewFamily();
        });
      });

      document.querySelectorAll('[data-template-curve-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const templateId = target.dataset.templateCurveId;
          if (!templateId) {
            return;
          }

          void selectTemplateLibraryCurveTemplate(templateId);
        });
      });

      document.querySelectorAll('[data-template-scalar-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const templateId = target.dataset.templateScalarId;
          if (!templateId) {
            return;
          }

          void selectTemplateLibraryScalarTemplate(templateId);
        });
      });

      document.querySelectorAll('[data-template-card-id]').forEach((card) => {
        const activate = () => {
          const target = card as HTMLElement;
          const templateId = target.dataset.templateCardId;
          const templateType = target.dataset.templateCardType;
          if (!templateId || !templateType) {
            return;
          }

          if (templateType === 'curve') {
            void selectTemplateLibraryCurveTemplate(templateId);
            return;
          }

          void selectTemplateLibraryScalarTemplate(templateId);
        };

        card.addEventListener('click', () => {
          activate();
        });

        card.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }

          event.preventDefault();
          activate();
        });
      });

      document.getElementById('template-library-search-input')?.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        templateLibrarySearchQuery = target.value;
        templateLibrarySearchShouldRefocus = true;
        templateLibrarySearchSelectionStart = target.selectionStart ?? target.value.length;
        templateLibrarySearchSelectionEnd = target.selectionEnd ?? target.value.length;
        requestRender(true);
      });

      document.getElementById('template-library-search-input')?.addEventListener('change', () => {
        requestRender(true);
      });

      document.getElementById('template-library-search-input')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          requestRender(true);
        }
      });

      document.querySelectorAll('[data-template-kind]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const nextKind = target.dataset.templateKind as TemplateLibraryTabKind | undefined;
          if (!nextKind || target.hasAttribute('disabled')) {
            return;
          }

          void selectTemplateLibraryKind(nextKind);
        });
      });

      document.querySelectorAll('[data-template-list-create]').forEach((button) => {
        button.addEventListener('click', () => {
          startTemplateLibraryNewTemplate();
        });
      });

      document.querySelectorAll('[data-template-draft-discard]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          discardTemplateLibraryDraft();
        });
      });

      document.getElementById('template-library-status-enabled')?.addEventListener('click', () => {
        if (!templateLibraryEditorDraft || templateLibraryEditorDraft.enabled) {
          return;
        }

        templateLibraryEditorDraft.enabled = true;
        markTemplateLibraryDirty();
        requestRender(true);
      });

      document.getElementById('template-library-status-disabled')?.addEventListener('click', () => {
        if (!templateLibraryEditorDraft || !templateLibraryEditorDraft.enabled) {
          return;
        }

        templateLibraryEditorDraft.enabled = false;
        markTemplateLibraryDirty();
        requestRender(true);
      });

      document.getElementById('template-library-duplicate-btn')?.addEventListener('click', () => {
        startTemplateLibraryDuplicateTemplate();
      });

      document.getElementById('template-library-reset-btn')?.addEventListener('click', () => {
        void resetTemplateLibraryEditorOverride();
      });

      document.getElementById('template-library-delete-btn')?.addEventListener('click', () => {
        void deleteTemplateLibraryEditorTemplate();
      });

      document.getElementById('template-library-save-btn')?.addEventListener('click', () => {
        void saveTemplateLibraryEditorDraft();
      });

      const bindDraftInput = (id: string, setter: (value: string) => void) => {
        document.getElementById(id)?.addEventListener('input', (event) => {
          const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          setter(target.value);
          markTemplateLibraryDirty();
        });
      };

      bindDraftInput('template-library-display-name', (value) => {
        if (!templateLibraryEditorDraft) {
          return;
        }

        const previousDisplayName = templateLibraryEditorDraft.displayName.trim();
        const previousBlockTitle = templateLibraryEditorDraft.blockTitleDefault.trim();
        templateLibraryEditorDraft.displayName = value;
        if (
          templateLibraryEditorDraft.templateType === 'curve' &&
          (!previousBlockTitle || previousBlockTitle === previousDisplayName)
        ) {
          templateLibraryEditorDraft.blockTitleDefault = value;
        }
      });
      bindDraftInput('template-library-block-title', (value) => {
        if (!templateLibraryEditorDraft || templateLibraryEditorDraft.templateType !== 'curve') {
          return;
        }

        templateLibraryEditorDraft.blockTitleDefault = value.trim()
          ? value
          : templateLibraryEditorDraft.displayName;
      });
      bindDraftInput('template-library-purpose-type', (value) => {
        if (templateLibraryEditorDraft) {
          templateLibraryEditorDraft.purposeType = value as StructuredBlockPurpose;
        }
      });
      bindDraftInput('template-library-scalar-section', (value) => {
        if (templateLibraryEditorDraft) {
          templateLibraryEditorDraft.scalarSection = value === 'metric' ? 'metric' : 'condition';
        }
      });
      bindDraftInput('template-library-aliases', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.aliasesText = value;
      });
      bindDraftInput('template-library-description', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.descriptionText = value;
      });
      bindDraftInput('template-library-primary-label', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.primaryLabel = value;
      });
      bindDraftInput('template-library-primary-unit', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.primaryUnit = value;
      });
      bindDraftInput('template-library-secondary-label', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.secondaryLabel = value;
      });
      bindDraftInput('template-library-secondary-unit', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.secondaryUnit = value;
      });
      bindDraftInput('template-library-filename-hints', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.filenameHintsText = value;
      });
      bindDraftInput('template-library-unit-default', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.unitDefault = value;
      });
      bindDraftInput('template-library-default-value', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.defaultValue = value;
      });
      bindDraftInput('template-library-value-type', (value) => {
        if (templateLibraryEditorDraft) {
          templateLibraryEditorDraft.valueType = value as ScalarTemplateValueType | '';
        }
      });
      bindDraftInput('template-library-note', (value) => {
        if (templateLibraryEditorDraft) templateLibraryEditorDraft.note = value;
      });

      document.querySelectorAll('[data-template-row-field]').forEach((input) => {
        input.addEventListener('input', (event) => {
          if (!templateLibraryEditorDraft) {
            return;
          }

          const target = event.target as HTMLInputElement;
          const token = target.dataset.templateRowField;
          if (!token) {
            return;
          }

          const [kind, field, rowId] = token.split(':');
          const rowSource =
            kind === 'conditions'
              ? templateLibraryEditorDraft.recommendedConditions
              : templateLibraryEditorDraft.recommendedMetrics;
          const row = rowSource.find((item) => item.id === rowId);
          if (!row) {
            return;
          }

          if (field === 'label') row.label = target.value;
          if (field === 'unit') row.unit = target.value;
          if (field === 'defaultValue') row.defaultValue = target.value;
          if (field === 'priority') row.priority = target.value;
          if (field === 'note') row.note = target.value;
          markTemplateLibraryDirty();
        });
      });

      document.querySelectorAll('[data-template-row-remove]').forEach((button) => {
        button.addEventListener('click', () => {
          if (!templateLibraryEditorDraft) {
            return;
          }

          const target = button as HTMLElement;
          const token = target.dataset.templateRowRemove;
          if (!token) {
            return;
          }

          const [kind, rowId] = token.split(':');
          if (templateLibraryExpandedRowToken === `${kind}:${rowId}`) {
            templateLibraryExpandedRowToken = '';
          }
          if (kind === 'conditions') {
            templateLibraryEditorDraft.recommendedConditions =
              templateLibraryEditorDraft.recommendedConditions.filter((item) => item.id !== rowId);
          } else {
            templateLibraryEditorDraft.recommendedMetrics =
              templateLibraryEditorDraft.recommendedMetrics.filter((item) => item.id !== rowId);
          }

          markTemplateLibraryDirty();
          requestRender(true);
        });
      });

      document.querySelectorAll('[data-template-row-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = button as HTMLElement;
          const token = target.dataset.templateRowToggle;
          if (!token) {
            return;
          }

          templateLibraryExpandedRowToken = templateLibraryExpandedRowToken === token ? '' : token;
          requestRender(true);
        });
      });

      document.getElementById('template-library-add-condition-btn')?.addEventListener('click', () => {
        if (!templateLibraryEditorDraft) {
          return;
        }

        const nextRow = buildTemplateLibraryEditableRow();
        templateLibraryEditorDraft.recommendedConditions = [
          ...templateLibraryEditorDraft.recommendedConditions,
          nextRow
        ];
        templateLibraryExpandedRowToken = `conditions:${nextRow.id}`;
        markTemplateLibraryDirty();
        requestRender(true);
      });

      document.getElementById('template-library-add-metric-btn')?.addEventListener('click', () => {
        if (!templateLibraryEditorDraft) {
          return;
        }

        const nextRow = buildTemplateLibraryEditableRow();
        templateLibraryEditorDraft.recommendedMetrics = [
          ...templateLibraryEditorDraft.recommendedMetrics,
          nextRow
        ];
        templateLibraryExpandedRowToken = `metrics:${nextRow.id}`;
        markTemplateLibraryDirty();
        requestRender(true);
      });

      if (templateLibrarySearchShouldRefocus) {
        const searchInput = document.getElementById('template-library-search-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.setSelectionRange(templateLibrarySearchSelectionStart, templateLibrarySearchSelectionEnd);
        }
        templateLibrarySearchShouldRefocus = false;
      }

      updateTemplateLibrarySaveStateIndicator();
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
  bindDateTimePicker('testTime');

  const syncStep1ProgressUI = () => {
    saveStep1InputsToState();

    const nextButton = document.getElementById('step1-next-btn') as HTMLButtonElement | null;
    if (nextButton) {
      nextButton.disabled = Boolean(validateStep1());
    }

    const strip = document.querySelector('.step1-status-strip');
    const badge = document.getElementById('step1-status-badge');
    const text = document.getElementById('step1-status-text');
    const secondary = document.getElementById('step1-status-secondary');
    if (!strip || !badge || !text) {
      return;
    }

    const missingFields = collectStep1MissingRequiredFieldLabels();
    const dictionaryPending = collectStep1PendingDictionaryLabels();
    const isReady = !missingFields.length;

    strip.classList.toggle('step1-status-strip-ready', isReady);
    strip.classList.toggle('step1-status-strip-pending', !isReady);
    badge.textContent = isReady ? t('step1.status.ready') : t('step1.status.pending');
    text.textContent = isReady
      ? t('step1.status.readyDetail')
      : t('step1.status.missingFields', {
          fields: missingFields.join(' / ')
        });

    const dictionaryText = dictionaryPending.length
      ? t('step1.status.dictionaryPending', {
          fields: dictionaryPending.join(' / ')
        })
      : '';

    if (secondary) {
      if (dictionaryText) {
        secondary.textContent = dictionaryText;
        secondary.style.display = '';
      } else {
        secondary.textContent = '';
        secondary.style.display = 'none';
      }
    } else if (dictionaryText) {
      strip.insertAdjacentHTML(
        'beforeend',
        `<div id="step1-status-secondary" class="step1-status-secondary">${escapeHtml(dictionaryText)}</div>`
      );
    }
  };

  document.getElementById('back-home-btn')?.addEventListener('click', async () => {
    saveStep1InputsToState();
    await attemptLeaveCreateFlow('step1', goHome);
  });
  document.getElementById('menu-home')?.addEventListener('click', async () => {
    saveStep1InputsToState();
    await attemptLeaveCreateFlow('step1', goHome);
  });
  document.getElementById('step1-cancel-btn')?.addEventListener('click', async () => {
    saveStep1InputsToState();
    await attemptLeaveCreateFlow('step1', goHome);
  });

  bindStep1DictionaryAddAction({
    inputId: 'tester',
    buttonId: 'tester-plus-btn',
    dictionaryType: 'tester',
    feedbackId: 'tester-dictionary-feedback',
    successMessage: t('step1.dictionaryAdded.tester'),
    suggestionContainerId: 'tester-suggestion-list',
    onSuccess: syncStep1ProgressUI
  });

  bindStep1DictionaryAddAction({
    inputId: 'instrument',
    buttonId: 'instrument-plus-btn',
    dictionaryType: 'instrument',
    feedbackId: 'instrument-dictionary-feedback',
    successMessage: t('step1.dictionaryAdded.instrument'),
    suggestionContainerId: 'instrument-suggestion-list',
    onSuccess: syncStep1ProgressUI
  });

  bindStep1DictionaryAddAction({
    inputId: 'sampleCode',
    buttonId: 'sampleCode-plus-btn',
    dictionaryType: 'sampleCode',
    feedbackId: 'sampleCode-dictionary-feedback',
    successMessage: t('step1.dictionaryAdded.sampleCode'),
    suggestionContainerId: 'sampleCode-suggestion-list',
    onSuccess: syncStep1ProgressUI
  });

  bindStep1DictionaryAddAction({
    inputId: 'sampleOwner',
    buttonId: 'sampleOwner-plus-btn',
    dictionaryType: 'sampleOwner',
    feedbackId: 'sampleOwner-dictionary-feedback',
    successMessage: t('step1.dictionaryAdded.sampleOwner'),
    suggestionContainerId: 'sampleOwner-suggestion-list',
    onSuccess: syncStep1ProgressUI
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

  bindStep1SuggestionInput({
    inputId: 'sampleCode',
    dictionaryType: 'sampleCode',
    containerId: 'sampleCode-suggestion-list',
    feedbackId: 'sampleCode-dictionary-feedback'
  });

  bindStep1SuggestionInput({
    inputId: 'sampleOwner',
    dictionaryType: 'sampleOwner',
    containerId: 'sampleOwner-suggestion-list',
    feedbackId: 'sampleOwner-dictionary-feedback'
  });

  const liveInputIds = ['testProject', 'sampleCode', 'tester', 'instrument', 'sampleOwner', 'testTimeValue'];
  liveInputIds.forEach((inputId) => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.addEventListener('input', syncStep1ProgressUI);
    input?.addEventListener('change', syncStep1ProgressUI);
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

  document.getElementById('step1-save-draft-btn')?.addEventListener('click', async () => {
    saveStep1InputsToState();
    await saveCurrentDraftAndReturn('step1');
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
  document.querySelectorAll('[id^="dynamic-name-"], [id^="dynamic-value-"]').forEach((input) => {
    input.addEventListener('input', syncStep1ProgressUI);
    input.addEventListener('change', syncStep1ProgressUI);
  });
  syncStep1ProgressUI();
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
    void (async () => {
      saveStep2InputsToState();
      await attemptLeaveCreateFlow('step2', goHome);
    })();
  });

  document.getElementById('step2-save-draft-btn')?.addEventListener('click', async () => {
    saveStep2InputsToState();
    await saveCurrentDraftAndReturn('step2');
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
    sortOrder: databaseSortOrder,
    starredOnly: databaseStarredOnly
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
  return Boolean(databaseSearchKeyword || databaseCrossFilters.length || databaseStarredOnly);
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
          <div class="db-group-title">${escapeHtml(`${getDatabaseGroupByLabel(databaseGroupBy)}：${group.groupLabel}`)}</div>
          <div class="record-list">
            ${group.items
          .map(
            (item) => `
	                  <div class="record-card selectable-record-card ${isExperimentSelected(item.id) ? 'record-card-selected' : ''}">
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

                      <div class="record-actions">
                        <button
                          class="secondary-btn database-icon-btn"
                          type="button"
                          data-toggle-star-id="${item.id}"
                          title="${escapeHtml(
                            isExperimentStarred(item.id) ? t('database.star.remove') : t('database.star.add')
                          )}"
                        >
                          ${isExperimentStarred(item.id) ? '★' : '☆'}
                        </button>
	                    <button class="secondary-btn record-detail-btn" type="button" data-open-detail-id="${item.id}">${escapeHtml(
                        t('database.card.viewDetails')
                      )}</button>
                      </div>
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
      blockTitle: blockTitle ? blockTitle.value : block.blockTitle,
      primaryLabel: primaryLabel ? primaryLabel.value : block.primaryLabel,
      primaryUnit: primaryUnit ? primaryUnit.value : block.primaryUnit,
      secondaryLabel: secondaryLabel ? secondaryLabel.value : block.secondaryLabel,
      secondaryUnit: secondaryUnit ? secondaryUnit.value : block.secondaryUnit,
      dataText: dataText ? dataText.value : block.dataText,
      note: note ? note.value : block.note
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
  const testTimeValue = document.getElementById('testTimeValue') as HTMLInputElement | null;
  const sampleOwner = document.getElementById('sampleOwner') as HTMLInputElement | null;

  step1FormData.testProject = testProject?.value.trim() || '';
  step1FormData.sampleCode = sampleCode?.value.trim() || '';
  step1FormData.tester = tester?.value.trim() || '';
  step1FormData.instrument = instrument?.value.trim() || '';
  step1FormData.testTime = testTimeValue?.value || '';
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
      blockTitle: blockTitle ? blockTitle.value : block.blockTitle,
      primaryLabel: primaryLabel ? primaryLabel.value : block.primaryLabel,
      primaryUnit: primaryUnit ? primaryUnit.value : block.primaryUnit,
      secondaryLabel: secondaryLabel ? secondaryLabel.value : block.secondaryLabel,
      secondaryUnit: secondaryUnit ? secondaryUnit.value : block.secondaryUnit,
      dataText: dataText ? dataText.value : block.dataText,
      note: note ? note.value : block.note
    };
  });

  syncTemplateBlockImportInputsToState('create-step2');
}

function validateStep1() {
  if (!step1FormData.testProject) return t('step1.validation.testProjectRequired');
  if (!step1FormData.sampleCode) return t('step1.validation.sampleCodeRequired');
  if (!step1FormData.tester) return t('step1.validation.testerRequired');
  if (!step1FormData.instrument) return t('step1.validation.instrumentRequired');
  if (!hasCompleteLocalDateTimeValue(step1FormData.testTime)) return t('step1.validation.testTimeRequired');

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
      dictionaryType: 'tester',
      value: step1FormData.tester,
      message: t('step1.dictionaryMissing.tester', { value: step1FormData.tester })
    },
    {
      dictionaryType: 'instrument',
      value: step1FormData.instrument,
      message: t('step1.dictionaryMissing.instrument', { value: step1FormData.instrument })
    },
    {
      dictionaryType: 'sampleCode',
      value: step1FormData.sampleCode,
      message: t('step1.dictionaryMissing.sampleCode', { value: step1FormData.sampleCode })
    },
    {
      dictionaryType: 'sampleOwner',
      value: step1FormData.sampleOwner,
      message: t('step1.dictionaryMissing.sampleOwner', { value: step1FormData.sampleOwner })
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

function isStartedScalarRow(row: DataItem) {
  return Boolean(
    row.itemName ||
      row.itemValue ||
      row.itemUnit ||
      row.sourceFileName ||
      row.replacementOriginalName ||
      row.originalFileName
  );
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
