import './index.css';
import type {
  AppSettings,
  DictionaryItemsByType,
  DictionaryType,
  DuplicateExperimentMatch,
  ExperimentEditHistoryEntry,
  ExperimentDetail,
  ExperimentGroup,
  ImportManualDelimiter,
  ImportPreviewFileResult,
  ExperimentListSortOrder,
  FileIntegrityReport,
  GroupByType,
  OperationLogFilter,
  PreviewManualImportXYResult,
  RecentOperationLogEntry,
  SaveExperimentPayload,
  SaveExperimentTemplateBlockPayload,
  UpdateExperimentPayload
} from './electron-api';
import {
  buildDisplayName,
  escapeHtml,
  formatTestTimeForDisplay,
  generateId,
  getErrorMessage,
  getPendingOriginalName,
  renderDeleteModal,
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

let appSettings: AppSettings = {
  storageRoot: '',
  loginUsername: 'admin'
};

type ViewType =
  | 'login'
  | 'home'
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
  xColumnIndex: number;
  yColumnIndex: number;
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

type SettingsSubView = 'general' | 'dictionary';

const DICTIONARY_TYPES: DictionaryType[] = ['testProject', 'tester', 'instrument'];
const STEP1_SUGGESTION_LIMIT = 8;
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
const SCALAR_ROLE_META: Record<
  ScalarItemRole,
  { title: string; subtitle: string; addButtonLabel: string; emptyText: string }
> = {
  condition: {
    title: '实验条件',
    subtitle: '记录实验是如何进行的，如温度、偏压、光功率、波长、频率和测试气氛等条件。',
    addButtonLabel: '新增条件',
    emptyText: '当前还没有实验条件'
  },
  metric: {
    title: '结果指标',
    subtitle: '记录最终标量结果和关键测量指标，如 Rise time、Responsivity、D*、EQE 等。',
    addButtonLabel: '新增结果指标',
    emptyText: '当前还没有结果指标'
  }
};

const DICTIONARY_SECTION_META: Array<{ type: DictionaryType; label: string }> = [
  { type: 'testProject', label: '测试项目' },
  { type: 'tester', label: '测试人' },
  { type: 'instrument', label: '测试仪器' }
];

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

let currentView: ViewType = 'login';
let lastSavedExperimentId: number | null = null;
let settingsSubView: SettingsSubView = 'general';

let databaseSearchKeyword = '';
let databaseGroupBy: GroupByType = 'sampleCode';
const databaseSortOrder: ExperimentListSortOrder = 'newest';
let databaseFilterPanelVisible = false;
let databaseFilterSampleCode = '';
let databaseFilterTestProject = '';
let databaseFilterInstrument = '';
let databaseFilterTester = '';
let databaseFilterSampleOwner = '';
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

function handleAsyncError(error: unknown, fallbackMessage = '操作失败，请稍后重试') {
  console.error(error);
  alert(`${fallbackMessage}\n${getErrorMessage(error)}`);
}

async function ensureAppSettingsLoaded() {
  if (!appSettings.storageRoot) {
    appSettings = await window.electronAPI.getAppSettings();
  }
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
    dictionaryLoadError = getErrorMessage(error) || '加载词典列表失败';
  } finally {
    dictionaryLoading = false;
    requestRender(true);
  }
}

async function openPathLocation(targetPath: string) {
  const result = await window.electronAPI.openPathLocation({ targetPath });

  if (!result.success) {
    alert(result.error || '打开路径失败');
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
      <div class="step2-template-context-title">当前语义模板：${escapeHtml(family.label)}</div>
      <div class="step2-template-context-body">
        基于测试项目“${escapeHtml(testProject || '未指定')}”，推荐实验条件、结果指标和结构化数据起点；以下建议均可手动修改。
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
      <div class="step2-template-recommendation-label">推荐起点</div>
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
      <div class="step2-template-recommendation-label">推荐结构化数据</div>
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
    xColumnIndex: 0,
    yColumnIndex: 1,
    previewLoading: false,
    previewError: ''
  };
}

function updateManualReviewPreviewRows(
  existing: ImportReviewManualState,
  next: NonNullable<PreviewManualImportXYResult['manualReview']>
): ImportReviewManualState {
  return {
    ...existing,
    delimiter: next.suggestedDelimiter,
    suggestedDelimiter: next.suggestedDelimiter,
    previewRows: next.previewRows,
    maxColumnCount: next.maxColumnCount
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
      xColumnIndex: targetBlock.importManualReview.xColumnIndex,
      yColumnIndex: targetBlock.importManualReview.yColumnIndex,
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
}

function getScalarFileButtonLabel(item: DataItem) {
  if (item.sourceFileName || item.originalFileName || item.replacementOriginalName) {
    return '更换原始文件';
  }

  return '选择原始文件';
}

function renderEditableScalarSection(
  context: ScalarItemEditContext,
  role: ScalarItemRole,
  rows: DataItem[]
) {
  const meta = SCALAR_ROLE_META[role];
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
                    <th>名称</th>
                    <th>数值</th>
                    <th>单位</th>
                    <th>原始文件</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map((row) => {
                      const fileMeta = [
                        `原始文件：${escapeHtml(getPendingOriginalName(row))}`,
                        row.sourceFileName ? `保存文件：${escapeHtml(row.sourceFileName)}` : ''
                      ]
                        .filter(Boolean)
                        .join(' · ');

                      return `
                        <tr>
                          <td>
                            <input
                              id="scalar-item-name-${row.id}"
                              class="table-input"
                              placeholder="${role === 'condition' ? '如：温度、偏压、光功率' : '如：Responsivity、Rise time'}"
                              value="${escapeHtml(row.itemName)}"
                            />
                          </td>
                          <td>
                            <input
                              id="scalar-item-value-${row.id}"
                              class="table-input"
                              placeholder="请输入数值"
                              value="${escapeHtml(row.itemValue)}"
                            />
                          </td>
                          <td>
                            <input
                              id="scalar-item-unit-${row.id}"
                              class="table-input"
                              placeholder="请输入单位"
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
                              <div>${fileMeta || '原始文件：-'}</div>
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
                                ${role === 'condition' ? '移至结果指标' : '移至实验条件'}
                              </button>
                              <button
                                class="danger-btn small-danger-btn"
                                type="button"
                                data-remove-scalar-row-id="${row.id}"
                                data-remove-scalar-context="${context}"
                              >
                                删除
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
  const meta = SCALAR_ROLE_META[role];

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
                    <th>名称</th>
                    <th>数值</th>
                    <th>单位</th>
                    <th>保存文件名</th>
                    <th>原始文件名</th>
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
                                      title="打开所在文件夹"
                                    >
                                      打开文件夹
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
      return '请为已填写的数据行补充名称';
    }

    if ((hasName || hasValue || hasUnit || hasFile) && !hasValue) {
      return '请为已填写的数据行补充数值';
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
      testTime: step1FormData.testTime
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
        ? `<div class="import-preview-file-status">预览文件：${escapeHtml(block.importPreviewSelectedName)}</div>`
        : ''}
      ${block.importParserLabel
        ? `<div class="import-preview-file-status">当前识别：${escapeHtml(block.importParserLabel)}</div>`
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
            <div class="import-manual-review-title">识别结果预览</div>
            <div class="import-manual-review-subtitle">识别或重新生成只更新预览，不会自动覆盖当前块。确认无误后，再写入当前块的主编辑字段。</div>
            <div class="template-block-grid">
              <div class="form-group">
                <label class="form-label">预览二级数据项名称</label>
                <div class="detail-list-value">${escapeHtml(importCandidate.templateBlock.blockTitle || '-')}</div>
              </div>
              <div class="form-group">
                <label class="form-label">预览点数</label>
                <div class="detail-list-value">${importCandidate.templateBlock.points.length}</div>
              </div>
            </div>
            <button
              class="secondary-btn"
              type="button"
              data-template-block-apply-import-id="${block.id}"
            >
              写入 XY 数据
            </button>
          `
        : ''}
      ${manualReview?.available
        ? `
            <div class="import-manual-review-title">行列映射调整</div>
            <div class="import-manual-review-subtitle">如果自动识别结果不理想，可在这里调整数据起始行、分隔符和 X/Y 列后重新生成预览。标题、主轴名称、单位和信号名称请直接在当前结构化数据块主字段中继续编辑；确认后再写入当前块。</div>

            <div class="template-block-grid">
              <div class="form-group">
                <label class="form-label">数据起始行</label>
                <input
                  id="template-block-import-start-row-${block.id}"
                  class="form-input"
                  type="number"
                  min="1"
                  value="${manualReview.dataStartRow}"
                />
              </div>

              <div class="form-group">
                <label class="form-label">分隔符</label>
                <select
                  id="template-block-import-delimiter-${block.id}"
                  class="form-input"
                >
                  <option value="comma" ${manualReview.delimiter === 'comma' ? 'selected' : ''}>逗号</option>
                  <option value="tab" ${manualReview.delimiter === 'tab' ? 'selected' : ''}>Tab</option>
                  <option value="semicolon" ${manualReview.delimiter === 'semicolon' ? 'selected' : ''}>分号</option>
                  <option value="whitespace" ${manualReview.delimiter === 'whitespace' ? 'selected' : ''}>空白字符</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">X 列</label>
                <input
                  id="template-block-import-x-column-${block.id}"
                  class="form-input"
                  type="number"
                  min="1"
                  value="${manualReview.xColumnIndex + 1}"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Y 列</label>
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
              ${manualReview.previewLoading ? '生成中...' : '重新生成块数据'}
            </button>

            ${manualReview.previewError ? `<div class="error-message">${escapeHtml(manualReview.previewError)}</div>` : ''}

            <div class="import-manual-preview-table-wrapper">
              <table class="import-manual-preview-table">
                <thead>
                  <tr>
                    <th>行号</th>
                    ${Array.from({ length: manualReview.maxColumnCount })
                      .map((_, index) => `<th>列 ${index + 1}</th>`)
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
    return '重新选择导入文件';
  }

  if (block.sourceFileName || block.originalFileName || block.replacementOriginalName) {
    return '更换导入文件';
  }

  return '导入原始文件';
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
    typeLabel: '结构化数据块',
    subtitle: '统一录入曲线、光谱等结构化序列数据；支持文件导入、解析调整、预览重生成和显式写入当前块',
    dataLabel: 'XY 数据',
    dataPlaceholder: '每行一组结构化数据，例如：&#10;0,1.23&#10;0.1,1.28',
    titlePlaceholder: '如：IV 曲线、XRD 图谱、EQE 曲线',
    primaryLabelText: '主轴名称',
    primaryLabelPlaceholder: '如：Voltage、Wavelength、2θ',
    primaryUnitText: '主轴单位',
    primaryUnitPlaceholder: '如：V、nm、degree',
    secondaryLabelText: '信号名称',
    secondaryLabelPlaceholder: '如：Current、Intensity、Responsivity',
    secondaryUnitText: '信号单位',
    secondaryUnitPlaceholder: '如：A、a.u.、A/W'
  };
}

function renderTemplateBlockCards(
  blocks: TemplateBlockFormData[],
  context: TemplateBlockEditContext
) {
  if (!blocks.length) {
    return `<div class="empty-tip">当前还没有添加结构化数据块</div>`;
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
              删除
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
                ? '导入预览中...'
                : escapeHtml(getTemplateBlockFileButtonLabel(block))}
            </button>
            <div class="template-block-file-meta">
              原始文件：${escapeHtml(getTemplateBlockDisplayedOriginalName(block))}
              ${block.sourceFileName ? ` · 保存文件：${escapeHtml(block.sourceFileName)}` : ''}
            </div>
            ${shouldShowTemplateBlockAdjustButton(block)
              ? `
                  <button
                    class="secondary-btn"
                    type="button"
                    data-template-block-toggle-import-id="${block.id}"
                    data-template-block-toggle-context="${context}"
                  >
                    ${getActiveTemplateBlockImportId(context) === block.id ? '收起解析' : '调整解析'}
                  </button>
                `
              : ''}
          </div>

          ${getActiveTemplateBlockImportId(context) === block.id
            ? renderTemplateBlockImportPanel(block)
            : ''}

          <div class="template-block-grid">
            <div class="form-group">
              <label class="form-label">数据用途</label>
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
              <label class="form-label">二级数据项名称 <span class="required-star">*</span></label>
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
            <label class="form-label">备注</label>
            <input
              id="template-block-note-${block.id}"
              class="form-input"
              placeholder="可选备注"
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
    return `<div class="empty-tip">无结构化数据块</div>`;
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
            ${showReadonlyHint ? '<div class="template-block-readonly-hint">当前仅支持查看，保存修改时会原样保留</div>' : ''}
          </div>

          <div class="detail-grid template-block-detail-grid">
            ${renderDetailPair('数据用途', getStructuredBlockPurposeLabel(block.purposeType))}
            ${renderDetailPair(fieldConfig.primaryLabelText, block.primaryLabel || '-')}
            ${renderDetailPair(fieldConfig.primaryUnitText, block.primaryUnit || '-')}
            ${renderDetailPair(fieldConfig.secondaryLabelText, block.secondaryLabel || '-')}
            ${renderDetailPair(fieldConfig.secondaryUnitText, block.secondaryUnit || '-')}
            ${renderDetailPair('数据点数', String(countTemplateBlockPointLines(block.dataText)))}
            ${renderDetailPair('备注', block.note || '-')}
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
                      title="打开所在文件夹"
                    >
                      打开文件夹
                    </button>
                  </div>
                `
              : '<div class="detail-value">保存文件：-</div>'}
            <div class="template-block-file-meta">
              原始文件：${escapeHtml(block.originalFileName || '-')}
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
        error: `请填写第 ${index + 1} 个${blockLabel}的标题`,
        blocks: []
      };
    }

    if (existingSameTypeTitle) {
      return {
        error: `${blockLabel}标题“${blockTitle}”重复，请修改后重试`,
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
        setFieldFeedback(params.feedbackId, result.error || '添加词典项失败', 'error');
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
        getErrorMessage(error) || '添加词典项失败，请稍后重试',
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
    { key: 'general', label: '常规设置' },
    { key: 'dictionary', label: '词典管理' }
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
          placeholder="请输入${label}"
        />
        <button
          class="secondary-btn dictionary-add-btn"
          type="button"
          data-dictionary-add-type="${dictionaryType}"
          ${isAdding || !!dictionaryDeletingId ? 'disabled' : ''}
        >
          ${isAdding ? '添加中...' : '添加'}
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
                        ${dictionaryDeletingId === item.id ? '删除中...' : '删除'}
                      </button>
                    </div>
                  `
                )
                .join('')}
            </div>
          `
          : `<div class="empty-tip">当前暂无可用词典项</div>`
      }
    </div>
  `;
}

async function render() {
  if (!root) return;

  const [appName, version] = await Promise.all([
    window.electronAPI.getAppName(),
    window.electronAPI.getAppVersion()
  ]);

  await ensureAppSettingsLoaded();

  if (currentView === 'login') {
    root.innerHTML = `
      <div class="page-shell">
        <div class="card login-card">
          <h1>${appName}</h1>
          <p class="subtitle">请先登录后进入系统</p>

          <div class="form-group">
            <label class="form-label">账号</label>
            <input id="username" class="form-input" placeholder="请输入账号" />
          </div>

          <div class="form-group">
            <label class="form-label">密码</label>
            <input id="password" type="password" class="form-input" placeholder="请输入密码" />
          </div>

          <div id="error-message" class="error-message"></div>

          <button id="login-btn" class="primary-btn">登录</button>

          <div class="footer-tip">
            当前版本：${version}
          </div>
        </div>
      </div>
    `;

    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const errorMessage = document.getElementById('error-message');

    const handleLogin = async () => {
      const username = usernameInput?.value.trim() || '';
      const password = passwordInput?.value || '';

      if (!username || !password) {
        if (errorMessage) errorMessage.textContent = '请输入账号和密码';
        return;
      }

      if (errorMessage) errorMessage.textContent = '';

      try {
        const result = await window.electronAPI.authenticate({ username, password });

        if (!result.success) {
          if (errorMessage) errorMessage.textContent = result.error || '账号或密码错误';
          return;
        }

        currentView = 'home';
        void render();
      } catch (error) {
        console.error(error);
        if (errorMessage) errorMessage.textContent = '登录失败，请稍后重试';
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
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div class="menu-item active">主页</div>
          <div id="menu-data-home" class="menu-item">数据</div>
          <div id="menu-settings-home" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">主界面</div>
            <button id="logout-btn" class="secondary-btn">退出登录</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>欢迎使用 ${appName}</h2>
              <p class="subtitle">请选择你要进入的功能模块；日常记录、查看和导出最终都会回到实验数据工作区。</p>

              <div class="name-preview-card">
                <div class="name-preview-label">首次使用建议</div>
                <div class="name-preview-value">如为首次使用，建议先进入设置，配置保存根目录并维护一级字段词典（测试项目 / 测试人 / 测试仪器）。</div>
              </div>

              <div class="entry-grid">
                <div class="entry-card">
                  <div class="entry-icon">＋</div>
                  <div class="entry-title">添加新数据</div>
                  <div class="entry-desc">进入 Step 1 / Step 2 录入流程，创建新的实验记录</div>
                  <button id="add-data-btn" class="primary-btn">进入</button>
                </div>

                <div class="entry-card">
                  <div class="entry-icon">▣</div>
                  <div class="entry-title">数据库入口</div>
                  <div class="entry-desc">进入主要工作区，查看、选择、打开和导出已有实验记录</div>
                  <button id="database-btn" class="secondary-btn big-btn">进入</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

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

    document.getElementById('menu-data-home')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-settings-home')?.addEventListener('click', () => {
      void openSettingsView();
    });

    return;
  }

  if (currentView === 'add-step1') {
    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="menu-home" class="menu-item">主页</div>
          <div class="menu-item active">添加数据</div>
          <div id="menu-data-step1" class="menu-item">数据</div>
          <div id="menu-settings-step1" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">添加新数据 · 一级界面</div>
            <button id="back-home-btn" class="secondary-btn">返回主页</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>一级信息录入</h2>
              <p class="subtitle">Step 1 用于定义实验身份信息和标准化一级元数据；必填项完成后才能进入 Step 2。</p>

              <div class="step-form-grid">
                <div class="form-group">
                  <label class="form-label">测试项目 <span class="required-star">*</span></label>
                  <div class="step1-suggestion-shell">
                    <div class="input-plus-row">
                      <input id="testProject" class="form-input" placeholder="请输入测试项目，如 XRD、能谱、夹杂分析" value="${escapeHtml(step1FormData.testProject)}" autocomplete="off" />
                      <button id="project-plus-btn" class="icon-btn" type="button">＋</button>
                    </div>
                    <div id="testProject-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="testProject-dictionary-feedback" class="field-feedback-message"></div>
                </div>

                <div class="form-group">
                  <label class="form-label">样品编号 <span class="required-star">*</span></label>
                  <input id="sampleCode" class="form-input" placeholder="请输入样品编号" value="${escapeHtml(step1FormData.sampleCode)}" />
                </div>

                <div class="form-group">
                  <label class="form-label">测试人 <span class="required-star">*</span></label>
                  <div class="step1-suggestion-shell">
                    <div class="input-plus-row">
                      <input id="tester" class="form-input" placeholder="请输入测试人" value="${escapeHtml(step1FormData.tester)}" autocomplete="off" />
                      <button id="tester-plus-btn" class="icon-btn" type="button">＋</button>
                    </div>
                    <div id="tester-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="tester-dictionary-feedback" class="field-feedback-message"></div>
                </div>

                <div class="form-group">
                  <label class="form-label">测试仪器 <span class="required-star">*</span></label>
                  <div class="step1-suggestion-shell">
                    <div class="input-plus-row">
                      <input id="instrument" class="form-input" placeholder="请输入测试仪器" value="${escapeHtml(step1FormData.instrument)}" autocomplete="off" />
                      <button id="instrument-plus-btn" class="icon-btn" type="button">＋</button>
                    </div>
                    <div id="instrument-suggestion-list" class="step1-suggestion-list"></div>
                  </div>
                  <div id="instrument-dictionary-feedback" class="field-feedback-message"></div>
                </div>

                <div class="form-group">
                  <label class="form-label">测试时间 <span class="required-star">*</span></label>
                  <input id="testTime" type="datetime-local" class="form-input" value="${escapeHtml(step1FormData.testTime)}" />
                </div>

                <div class="form-group">
                  <label class="form-label">样品所属人员</label>
                  <input id="sampleOwner" class="form-input" placeholder="请输入样品所属人员" value="${escapeHtml(step1FormData.sampleOwner)}" />
                </div>
              </div>

              <div class="dynamic-section">
                <div class="dynamic-header">
                  <div>
                    <div class="dynamic-title">本次实验专属字段</div>
                    <div class="dynamic-subtitle">新添加字段只对当前这一次实验有效</div>
                  </div>
                  <button id="add-dynamic-field-btn" class="secondary-btn" type="button">新增字段</button>
                </div>

                <div id="dynamic-fields-container">
                  ${renderDynamicFields(step1FormData.dynamicFields)}
                </div>
              </div>

              <div id="step1-error" class="error-message large-error"></div>

              <div class="form-action-row">
                <button id="step1-cancel-btn" class="secondary-btn" type="button">取消并返回</button>
                <button id="step1-next-btn" class="primary-btn action-btn" type="button">下一步</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    bindStep1Events();

    document.getElementById('menu-data-step1')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-settings-step1')?.addEventListener('click', () => {
      void openSettingsView();
    });

    return;
  }

  if (currentView === 'add-step2') {
    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="menu-home-step2" class="menu-item">主页</div>
          <div class="menu-item active">添加数据</div>
          <div id="menu-data-step2" class="menu-item">数据</div>
          <div id="menu-settings-step2" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">添加新数据 · 二级界面</div>
            <button id="back-step1-btn-top" class="secondary-btn">返回上一步</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>二级数据录入</h2>
              <p class="subtitle">Step 2 用于填写实验内容和二级数据项，包括实验条件、结果指标和结构化数据块。</p>

              <div class="name-preview-card">
                <div class="name-preview-label">自动命名预览</div>
                <div class="name-preview-value">${escapeHtml(buildDisplayName(step1FormData))}</div>
              </div>

              ${renderScalarSections('create-step2', step2DataItems)}

              <div class="template-block-section">
                <div class="dynamic-header">
                  <div>
                    <div class="dynamic-title">结构化数据块</div>
                    <div class="dynamic-subtitle">记录曲线型或序列型数据，如光谱、I-V、XRD、EQE 等；文件导入、解析调整和写入均在块内完成。</div>
                  </div>

                  <div class="template-block-toolbar">
                    <button id="add-template-block-btn" class="secondary-btn" type="button">添加结构化数据块</button>
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
                <button id="back-step1-btn-bottom" class="secondary-btn" type="button">返回上一步</button>
                <button id="finish-step2-btn" class="primary-btn action-btn" type="button">完成录入</button>
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

    bindStep2Events();
    bindDuplicateWarningModalHandlers();

    document.getElementById('menu-data-step2')?.addEventListener('click', async () => {
      await loadDatabaseListView();
      currentView = 'database-list';
      void render();
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
          <h1>保存成功</h1>
          <p class="subtitle">实验数据已成功写入本地数据库</p>

          <div class="info-row">
            <span>实验编号</span>
            <strong>${lastSavedExperimentId ?? '-'}</strong>
          </div>

          <div class="info-row">
            <span>数据名称</span>
            <strong>${escapeHtml(buildDisplayName(step1FormData))}</strong>
          </div>

          <button id="save-success-home-btn" class="primary-btn">返回主页</button>
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
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="db-menu-home" class="menu-item">主页</div>
          <div class="menu-item active">数据</div>
          <div id="db-menu-settings" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">数据库入口</div>
            <div class="detail-top-actions">
              <span>已选择 ${selectedExperimentIds.length} 条</span>
              <button id="db-select-all-btn" class="secondary-btn">
                ${areAllVisibleSelected() ? '取消全选' : '全选'}
              </button>
              <button
                id="db-clear-selection-btn"
                class="secondary-btn"
                type="button"
                ${selectedExperimentIds.length ? '' : 'disabled'}
              >
                清空选择
              </button>
              <button
                id="db-delete-btn"
                class="danger-btn ${selectedExperimentIds.length ? '' : 'disabled-danger-btn'}"
                type="button"
                ${selectedExperimentIds.length ? '' : 'disabled'}
              >
                删除
              </button>
              <button id="db-export-btn" class="secondary-btn export-top-btn">⤴</button>
              <button id="db-refresh-btn" class="secondary-btn">刷新</button>
            </div>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>实验数据列表</h2>
              <p class="subtitle">这里是已有实验记录的主要工作区：可浏览、勾选、打开详情并从所选记录发起导出。</p>

              <div class="search-row">
                <input
                  id="db-search-input"
                  class="form-input"
                  placeholder="搜索样品编号、测试项目、测试人、测试仪器、名称"
                  value="${escapeHtml(databaseSearchKeyword)}"
                />
                <button id="db-search-btn" class="primary-btn search-btn">搜索</button>
                <button id="db-filter-btn" class="secondary-btn search-btn" type="button">筛选</button>
              </div>

              ${databaseFilterPanelVisible
        ? `
              <div class="db-filter-panel">
                <div class="db-filter-panel-header">
                  <div class="db-filter-panel-title">筛选实验记录</div>
                  <div class="db-filter-panel-subtitle">按字段缩小当前实验列表范围；不改变分组方式。</div>
                </div>

                <div class="step-form-grid db-filter-grid">
                  <div class="form-group">
                    <label class="form-label">测试项目</label>
                    <input id="db-filter-test-project" class="form-input" value="${escapeHtml(databaseFilterTestProject)}" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">样品编号</label>
                    <input id="db-filter-sample-code" class="form-input" value="${escapeHtml(databaseFilterSampleCode)}" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">测试人</label>
                    <input id="db-filter-tester" class="form-input" value="${escapeHtml(databaseFilterTester)}" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">测试仪器</label>
                    <input id="db-filter-instrument" class="form-input" value="${escapeHtml(databaseFilterInstrument)}" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">样品所属人员</label>
                    <input id="db-filter-sample-owner" class="form-input" value="${escapeHtml(databaseFilterSampleOwner)}" />
                  </div>
                </div>

                <div class="form-action-row db-filter-actions">
                  <button id="db-filter-clear-btn" class="secondary-btn" type="button">清空筛选</button>
                  <button id="db-filter-apply-btn" class="primary-btn" type="button">应用筛选</button>
                </div>
              </div>
              `
        : ''}

              <div class="group-tabs">
                ${renderGroupTabs(databaseGroupBy)}
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

    document.getElementById('db-menu-home')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.getElementById('db-menu-settings')?.addEventListener('click', () => {
      void openSettingsView();
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

    document.getElementById('db-filter-btn')?.addEventListener('click', () => {
      databaseFilterPanelVisible = !databaseFilterPanelVisible;
      void renderPreservingContentScroll();
    });

    document.getElementById('db-filter-apply-btn')?.addEventListener('click', async () => {
      databaseFilterSampleCode =
        (document.getElementById('db-filter-sample-code') as HTMLInputElement | null)?.value.trim() || '';
      databaseFilterTestProject =
        (document.getElementById('db-filter-test-project') as HTMLInputElement | null)?.value.trim() || '';
      databaseFilterInstrument =
        (document.getElementById('db-filter-instrument') as HTMLInputElement | null)?.value.trim() || '';
      databaseFilterTester =
        (document.getElementById('db-filter-tester') as HTMLInputElement | null)?.value.trim() || '';
      databaseFilterSampleOwner =
        (document.getElementById('db-filter-sample-owner') as HTMLInputElement | null)?.value.trim() || '';
      databaseFilterPanelVisible = false;
      await loadDatabaseList();
      void render();
    });

    document.getElementById('db-filter-clear-btn')?.addEventListener('click', async () => {
      databaseFilterSampleCode = '';
      databaseFilterTestProject = '';
      databaseFilterInstrument = '';
      databaseFilterTester = '';
      databaseFilterSampleOwner = '';
      databaseFilterPanelVisible = false;
      await loadDatabaseList();
      void render();
    });

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

    const editHistoryHtml = renderExperimentEditHistory(currentEditHistory);

    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="detail-menu-home" class="menu-item">主页</div>
          <div id="detail-menu-list" class="menu-item active">数据</div>
          <div id="detail-menu-settings" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">实验详情（${detailEditMode ? '编辑中' : '只读'}）</div>
            <div class="detail-top-actions">
              ${detailEditMode
        ? `<button id="detail-cancel-edit-btn" class="secondary-btn">取消修改</button>`
        : `<button id="detail-edit-btn" class="secondary-btn">修改</button>`
      }
              <button id="detail-back-btn" class="secondary-btn">返回列表</button>
            </div>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>${escapeHtml(currentDetail.displayName)}</h2>
              <p class="subtitle">当前阶段支持详情只读查看和修改后留痕</p>

              <div class="detail-section">
                <div class="detail-section-title">一级主信息</div>
                <div class="detail-grid">
                  ${detailEditMode && detailEditStep1
        ? `
                        ${renderDetailEditInput('edit-testProject', '测试项目', detailEditStep1.testProject)}
                        ${renderDetailEditInput('edit-sampleCode', '样品编号', detailEditStep1.sampleCode)}
                        ${renderDetailEditInput('edit-tester', '测试人', detailEditStep1.tester)}
                        ${renderDetailEditInput('edit-instrument', '测试仪器', detailEditStep1.instrument)}
                        ${renderDetailEditInput('edit-testTime', '测试时间', detailEditStep1.testTime, 'datetime-local')}
                        ${renderDetailEditInput('edit-sampleOwner', '样品所属人员', detailEditStep1.sampleOwner)}
                        ${renderDetailEditInput('edit-displayName', '数据名称', currentDetail.displayName)}
                      `
        : `
                        ${renderDetailPair('实验编号', String(currentDetail.id))}
                        ${renderDetailPair('测试项目', currentDetail.testProject)}
                        ${renderDetailPair('样品编号', currentDetail.sampleCode)}
                        ${renderDetailPair('测试人', currentDetail.tester)}
                        ${renderDetailPair('测试仪器', currentDetail.instrument)}
                        ${renderDetailPair('测试时间', currentDetail.testTime)}
                        ${renderDetailPair('样品所属人员', currentDetail.sampleOwner || '-')}
                        ${renderDetailPair('数据名称', currentDetail.displayName)}
                      `
      }
                </div>
              </div>

              <div class="detail-section">
                <div class="detail-section-title">动态字段</div>
                ${detailEditMode && detailEditStep1
        ? `
                      <div class="detail-list">
                        ${detailEditStep1.dynamicFields.length
          ? detailEditStep1.dynamicFields
            .map(
              (field, index) => `
                                    <div class="detail-edit-row">
                                      <input id="edit-dynamic-name-${index}" class="form-input" value="${escapeHtml(field.name)}" placeholder="字段名称" />
                                      <input id="edit-dynamic-value-${index}" class="form-input" value="${escapeHtml(field.value)}" placeholder="字段值" />
                                    </div>
                                  `
            )
            .join('')
          : `<div class="empty-tip">无动态字段</div>`
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
          : `<div class="empty-tip">无动态字段</div>`
      }
              </div>

              ${detailEditMode
        ? renderScalarSections('detail-edit', detailEditStep2)
        : `
            ${renderStep2TemplateContextHint('detail-readonly')}
            ${renderReadonlyScalarSection(
              'condition',
              currentDetail.dataItems.filter((item) => inferScalarItemRole(item.itemName) === 'condition')
            )}
            ${renderReadonlyScalarSection(
              'metric',
              currentDetail.dataItems.filter((item) => inferScalarItemRole(item.itemName) === 'metric')
            )}
          `}

              <div class="detail-section">
                <div class="detail-section-title">结构化数据块</div>
                ${detailEditMode
        ? `
            <div class="template-block-toolbar">
              <button id="detail-add-template-block-btn" class="secondary-btn" type="button">添加结构化数据块</button>
            </div>
            ${renderStructuredRecommendationButtons(
              'detail-edit',
              getActiveStep2TemplateFamily('detail-edit')
            )}
            ${renderTemplateBlockCards(detailEditTemplateBlocks, 'detail-edit')}
          `
        : currentDetail.templateBlocks.length
          ? renderReadonlyTemplateBlocks(
            currentDetail.templateBlocks.map((block) => ({
              id: `detail_template_${block.id}`,
              blockId: block.id,
              templateType: block.templateType,
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
          : `<div class="empty-tip">无结构化数据块</div>`
      }
              </div>

              <div class="detail-section">
                <div class="detail-section-title">最近修改历史</div>
                ${editHistoryHtml}
              </div>

      ${detailEditMode
        ? `
                    <div class="detail-section">
                      <div class="detail-section-title">修改确认</div>
                      <div class="detail-edit-confirm">
                        <input id="edit-reason-input" class="form-input" placeholder="请输入修改理由（必填）" value="${escapeHtml(detailEditReason)}" />
                        <input id="edit-editor-input" class="form-input" placeholder="请输入修改人（必填）" value="${escapeHtml(detailEditor)}" />
                        <button id="detail-save-edit-btn" class="primary-btn action-btn">修改确认</button>
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
    }

    document.getElementById('detail-save-edit-btn')?.addEventListener('click', async () => {
      if (!currentDetail) return;

      const collected = collectDetailEditState();
      if (!collected) return;

      const errorBox = document.getElementById('detail-edit-error');

      if (!detailEditReason) {
        if (errorBox) errorBox.textContent = '请填写修改理由';
        return;
      }

      if (!detailEditor) {
        if (errorBox) errorBox.textContent = '请填写修改人';
        return;
      }

      if (
        !collected.step1.testProject ||
        !collected.step1.sampleCode ||
        !collected.step1.tester ||
        !collected.step1.instrument ||
        !collected.step1.testTime
      ) {
        if (errorBox) errorBox.textContent = '一级主信息中的必填项不能为空';
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
          displayName: [
            collected.step1.testProject,
            collected.step1.sampleCode,
            collected.step1.tester,
            collected.step1.instrument,
            formatTestTimeForDisplay(collected.step1.testTime)
          ]
            .filter(Boolean)
            .join('-'),
          editReason: detailEditReason,
          editor: detailEditor
        };

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
      ? renderRecentOperationLogs(recentOperationLogs)
      : `<div class="detail-value">点击“查看最近操作日志”加载最近 30 条操作日志</div>`;
    const generalSettingsHtml = `
      <div class="detail-section">
        <div class="detail-section-title">原始文件根目录</div>
        <div class="form-group">
          <label class="form-label">保存根目录</label>
          <input id="settings-storage-root" class="form-input" value="${escapeHtml(appSettings.storageRoot)}" />
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">登录设置</div>
        <div class="step-form-grid">
          <div class="form-group">
            <label class="form-label">登录账号</label>
            <input id="settings-login-username" class="form-input" value="${escapeHtml(appSettings.loginUsername)}" />
          </div>

          <div class="form-group">
            <label class="form-label">新登录密码</label>
            <input
              id="settings-login-password"
              class="form-input"
              type="password"
              placeholder="留空则保持当前密码不变"
            />
          </div>
        </div>
      </div>

      <div id="settings-error" class="error-message large-error"></div>

      <div class="form-action-row">
        <button id="settings-save-btn" class="primary-btn action-btn">保存设置</button>
        <button
          id="settings-file-integrity-btn"
          class="secondary-btn action-btn"
          type="button"
          ${fileIntegrityLoading ? 'disabled' : ''}
        >
          ${fileIntegrityLoading ? '检查中...' : '检查文件完整性'}
        </button>
        <button
          id="settings-open-storage-root-btn"
          class="secondary-btn action-btn"
          type="button"
          ${fileIntegrityActionLoading ? 'disabled' : ''}
        >
          打开保存根目录
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

      <div class="detail-section">
        <div class="detail-section-title">最近操作日志</div>
        <div class="form-action-row">
          <button
            id="settings-recent-logs-btn"
            class="secondary-btn action-btn"
            type="button"
            ${operationLogLoading ? 'disabled' : ''}
          >
            ${operationLogLoading ? '加载中...' : '查看最近操作日志'}
          </button>
          ${renderOperationLogFilterButtons(operationLogFilter, operationLogLoading)}
        </div>

        ${operationLogError ? `<div class="error-message large-error">${escapeHtml(operationLogError)}</div>` : ''}
        ${recentOperationLogsHtml}
      </div>
    `;
    const dictionaryManagementHtml = `
      ${dictionaryLoadError ? `<div class="error-message large-error">${escapeHtml(dictionaryLoadError)}</div>` : ''}
      ${dictionaryLoading && !dictionaryLoaded ? `<div class="empty-tip">词典加载中...</div>` : ''}
      ${DICTIONARY_SECTION_META.map(({ type, label }) =>
        renderDictionaryManagementSection(type, label)
      ).join('')}
    `;

    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="settings-menu-home" class="menu-item">主页</div>
          <div class="menu-item active">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">设置</div>
            <button id="settings-back-home-btn" class="secondary-btn">返回主页</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>${settingsSubView === 'general' ? '系统设置' : '词典管理'}</h2>
              <p class="subtitle">
                ${
                  settingsSubView === 'general'
                    ? '当前阶段支持原始文件根目录和登录账号密码设置'
                    : '维护一级字段建议词典。删除仅影响后续建议，不会修改历史记录。'
                }
              </p>

              ${renderSettingsSubViewTabs()}
              ${settingsSubView === 'general' ? generalSettingsHtml : dictionaryManagementHtml}
            </div>
          </section>
        </main>
      </div>
    `;

    document.getElementById('settings-menu-home')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
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
              dictionarySectionErrors[dictionaryType] = result.error || '添加词典项失败';
              return;
            }

            dictionaryInputValues[dictionaryType] = '';
            await reloadDictionaryItems();
          } catch (error) {
            dictionarySectionErrors[dictionaryType] = getErrorMessage(error) || '添加词典项失败';
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
            `删除“${label}”后，它将不会再出现在后续建议中，但不会修改已有记录。是否继续？`
          );
          if (!shouldContinue) {
            return;
          }

          dictionaryDeletingId = id;
          requestRender(true);

          try {
            const result = await window.electronAPI.deactivateDictionaryItem({ id });
            if (!result.success) {
              alert(result.error || '删除词典项失败');
              return;
            }

            await reloadDictionaryItems();
          } catch (error) {
            alert(getErrorMessage(error) || '删除词典项失败');
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
        if (errorBox) errorBox.textContent = '请填写原始文件根目录';
        return;
      }

      if (!loginUsername) {
        if (errorBox) errorBox.textContent = '请填写登录账号';
        return;
      }

      if (errorBox) errorBox.textContent = '';

      try {
        const result = await window.electronAPI.saveAppSettings({
          storageRoot,
          loginUsername,
          newPassword: newPassword || undefined
        });

        if (!result.success) {
          if (errorBox) errorBox.textContent = result.error || '保存设置失败';
          return;
        }

        appSettings = {
          storageRoot,
          loginUsername
        };
        fileIntegrityReport = null;
        fileIntegrityError = '';

        const passwordInput = document.getElementById('settings-login-password') as HTMLInputElement | null;
        if (passwordInput) {
          passwordInput.value = '';
        }

        alert('设置已保存');
      } catch (error) {
        if (errorBox) errorBox.textContent = '保存设置失败，请稍后重试';
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
        operationLogError = getErrorMessage(error) || '加载最近操作日志失败';
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
          operationLogError = getErrorMessage(error) || '加载最近操作日志失败';
        } finally {
          operationLogLoading = false;
          requestRender(true);
        }
      });
    });

    document.getElementById('settings-open-storage-root-btn')?.addEventListener('click', async () => {
      if (!appSettings.storageRoot) {
        alert('当前没有可打开的保存根目录');
        return;
      }

      await openPathLocation(appSettings.storageRoot);
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
    successMessage: '已加入测试项目词典',
    suggestionContainerId: 'testProject-suggestion-list'
  });

  bindStep1DictionaryAddAction({
    inputId: 'tester',
    buttonId: 'tester-plus-btn',
    dictionaryType: 'tester',
    feedbackId: 'tester-dictionary-feedback',
    successMessage: '已加入测试人词典',
    suggestionContainerId: 'tester-suggestion-list'
  });

  bindStep1DictionaryAddAction({
    inputId: 'instrument',
    buttonId: 'instrument-plus-btn',
    dictionaryType: 'instrument',
    feedbackId: 'instrument-dictionary-feedback',
    successMessage: '已加入测试仪器词典',
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
      window.alert(`词典校验失败，请稍后重试。\n${getErrorMessage(error)}`);
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
    filters: {
      sampleCode: databaseFilterSampleCode || undefined,
      testProject: databaseFilterTestProject || undefined,
      instrument: databaseFilterInstrument || undefined,
      tester: databaseFilterTester || undefined,
      sampleOwner: databaseFilterSampleOwner || undefined
    },
    sortOrder: databaseSortOrder
  });

  const validIds = databaseGroups.flatMap((group) => group.items.map((item) => item.id));
  selectedExperimentIds = selectedExperimentIds.filter((id) => validIds.includes(id));
}

async function loadDatabaseListView() {
  await loadDatabaseList();
}

function hasActiveDatabaseSearchOrFilters() {
  return Boolean(
    databaseSearchKeyword ||
    databaseFilterSampleCode ||
    databaseFilterTestProject ||
    databaseFilterInstrument ||
    databaseFilterTester ||
    databaseFilterSampleOwner
  );
}

function renderDatabaseGroups(groups: ExperimentGroup[]) {
  if (!groups.length) {
    return hasActiveDatabaseSearchOrFilters()
      ? `<div class="empty-tip">当前搜索或筛选条件下没有符合条件的实验数据，可点击“重置”恢复默认列表</div>`
      : `<div class="empty-tip">当前没有符合条件的实验数据</div>`;
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
                        <span>样品编号：${escapeHtml(item.sampleCode)}</span>
                        <span>测试项目：${escapeHtml(item.testProject)}</span>
                        <span>测试人：${escapeHtml(item.tester)}</span>
                        <span>测试仪器：${escapeHtml(item.instrument)}</span>
	                      </div>
	                    </div>
	
	                    <button class="secondary-btn" type="button" data-open-detail-id="${item.id}">查看详情</button>
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
    scalarRole: inferScalarItemRole(item.itemName),
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
    purposeType: '',
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
  if (!step1FormData.testProject) return '请填写测试项目';
  if (!step1FormData.sampleCode) return '请填写样品编号';
  if (!step1FormData.tester) return '请填写测试人';
  if (!step1FormData.instrument) return '请填写测试仪器';
  if (!step1FormData.testTime) return '请选择测试时间';

  for (const field of step1FormData.dynamicFields) {
    if ((field.name && !field.value) || (!field.name && field.value)) {
      return '动态字段名称和值需要成对填写';
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
      message: `当前测试项目“${step1FormData.testProject}”不在词典中。\n如需继续使用，请先点击该字段右侧的 + 按钮加入词典。`
    },
    {
      dictionaryType: 'tester',
      value: step1FormData.tester,
      message: `当前测试人“${step1FormData.tester}”不在词典中。\n如需继续使用，请先点击该字段右侧的 + 按钮加入词典。`
    },
    {
      dictionaryType: 'instrument',
      value: step1FormData.instrument,
      message: `当前测试仪器“${step1FormData.instrument}”不在词典中。\n如需继续使用，请先点击该字段右侧的 + 按钮加入词典。`
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
      error: '请至少填写一行二级数据或一个结构化数据块',
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

void render().catch((error) => {
  renderFatalError(error);
});
