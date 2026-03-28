import type { StructuredBlockPurpose } from './template-blocks';

export type GroupByType =
  | 'sampleCode'
  | 'testProject'
  | 'testTime'
  | 'instrument'
  | 'tester'
  | 'sampleOwner';

export type ExperimentListSortOrder = 'newest' | 'oldest';

export type CrossFilterField =
  | 'sampleCode'
  | 'testTime'
  | 'testProject'
  | 'tester'
  | 'instrument'
  | 'sampleOwner'
  | 'secondaryName'
  | 'secondaryValue'
  | 'structuredBlockName';

export type CrossFilterChip = {
  id: string;
  field: CrossFilterField;
  value: string;
};

export type ActionResult = {
  success: boolean;
  error?: string;
  warning?: string;
};

export type AppSettings = {
  storageRoot: string;
  loginUsername: string;
};

export type AnalysisStep1FieldKey =
  | 'testProject'
  | 'sampleCode'
  | 'tester'
  | 'instrument'
  | 'testTime'
  | 'sampleOwner';

export type PersistedAnalysisUIStateScalarSeriesConfig = {
  xFieldKey: AnalysisStep1FieldKey;
  yMetricName: string;
  selectedRecordIds: number[];
  hidden?: boolean;
  displayName?: string;
  color?: string;
};

export type PersistedAnalysisUIStateStructuredSeriesConfig = {
  blockDisplayName: string;
  selectedRecordIds: number[];
  hidden?: boolean;
  displayName?: string;
  color?: string;
};

export type PersistedAnalysisUIStateChartConfig =
  | {
      chartType: 'scalar';
      semanticTitle: string;
      customTitle?: string;
      scalarSeries: PersistedAnalysisUIStateScalarSeriesConfig[];
    }
  | {
      chartType: 'structured';
      semanticTitle: string;
      customTitle?: string;
      structuredSeries: PersistedAnalysisUIStateStructuredSeriesConfig[];
    };

export type PersistedAnalysisUIState = {
  sidebarCollapsed: boolean;
  analysisDetailCollapsed: boolean;
  analysisCharts: PersistedAnalysisUIStateChartConfig[];
};

export type AuthenticatePayload = {
  username: string;
  password: string;
};

export type SaveAppSettingsPayload = {
  storageRoot: string;
  loginUsername: string;
  newPassword?: string;
};

export type DictionaryType = 'testProject' | 'tester' | 'instrument';

export type DictionaryItem = {
  id: string;
  type: DictionaryType;
  value: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
};

export type DictionaryItemsByType = {
  testProject: DictionaryItem[];
  tester: DictionaryItem[];
  instrument: DictionaryItem[];
};

export type ListDictionaryItemsPayload = {
  includeInactive?: boolean;
};

export type AddDictionaryItemPayload = {
  type: DictionaryType;
  value: string;
};

export type AddDictionaryItemResult = ActionResult & {
  item?: DictionaryItem;
};

export type DeactivateDictionaryItemPayload = {
  id: string;
};

export type SelectSourceFileResult = {
  originalPath: string;
  originalName: string;
} | null;

export type ImportSelectedFile = {
  filePath: string;
  fileName: string;
  sizeBytes: number;
};

export type SelectImportFilesResult = ImportSelectedFile[];

export type ImportManualDelimiter = 'comma' | 'tab' | 'semicolon' | 'whitespace';
export type ImportManualXAxisSourceMode = 'column' | 'generated';

export type ImportManualPreviewRow = {
  rowNumber: number;
  columns: string[];
};

export type ImportManualXYReviewSupport = {
  reviewType: 'xyText';
  suggestedDelimiter: ImportManualDelimiter;
  previewRows: ImportManualPreviewRow[];
  maxColumnCount: number;
};

export type CopyFileToStorageResult = ActionResult & {
  savedFileName?: string;
  savedPath?: string;
};

export type ScalarItemRole = 'condition' | 'metric';

export type ManagedSectionLabel = '实验条件' | '结果指标' | '结构化数据块';

export type CopyFileToStoragePayload = {
  sourcePath: string;
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  displayName?: string;
  sectionLabel?: ManagedSectionLabel;
  secondaryItemName?: string;
  templateType?: 'xy' | 'spectrum';
  blockTitle?: string;
  blockToken?: string;
};

export type XYPoint = {
  x: number;
  y: number;
};

export type SaveExperimentXYBlockPayload = {
  blockId?: number;
  templateType: 'xy';
  purposeType: StructuredBlockPurpose;
  blockTitle: string;
  blockOrder: number;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
  note: string;
  points: XYPoint[];
  sourceFileName: string;
  sourceFilePath: string;
  originalFileName: string;
  originalFilePath: string;
  replacementSourcePath?: string;
  replacementOriginalName?: string;
};

export type SaveExperimentSpectrumBlockPayload = {
  blockId?: number;
  templateType: 'spectrum';
  purposeType: StructuredBlockPurpose;
  blockTitle: string;
  blockOrder: number;
  spectrumAxisLabel: string;
  spectrumAxisUnit: string;
  signalLabel: string;
  signalUnit: string;
  note: string;
  points: XYPoint[];
  sourceFileName: string;
  sourceFilePath: string;
  originalFileName: string;
  originalFilePath: string;
  replacementSourcePath?: string;
  replacementOriginalName?: string;
};

export type SaveExperimentTemplateBlockPayload =
  | SaveExperimentXYBlockPayload
  | SaveExperimentSpectrumBlockPayload;

export type ImportPreviewPayload = {
  filePaths: string[];
};

export type PreviewManualImportXYPayload = {
  filePath: string;
  delimiter: ImportManualDelimiter;
  dataStartRow: number;
  xSourceMode: ImportManualXAxisSourceMode;
  xColumnIndex: number;
  yColumnIndex: number;
  generatedXStart?: number;
  generatedXStep?: number;
  purposeType?: StructuredBlockPurpose;
  blockTitle: string;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
};

export type PreviewManualImportXYResult = ActionResult & {
  candidate?: ImportPreviewXYTemplateBlockCandidate;
  manualReview?: ImportManualXYReviewSupport;
};

export type ImportPreviewXYTemplateBlockCandidate = {
  candidateType: 'templateBlock';
  parserId: string;
  parserLabel: string;
  detectionConfidence: 'high' | 'medium' | 'low';
  warnings: string[];
  sourceFile: {
    filePath: string;
    fileName: string;
  };
  templateBlock: SaveExperimentXYBlockPayload;
};

export type ImportPreviewCandidate = ImportPreviewXYTemplateBlockCandidate;

export type ImportPreviewFileResult = {
  filePath: string;
  fileName: string;
  matched: boolean;
  parserId: string | null;
  parserLabel: string | null;
  warnings: string[];
  error?: string;
  manualReview?: ImportManualXYReviewSupport;
  candidates: ImportPreviewCandidate[];
};

export type ImportPreviewResult = {
  files: ImportPreviewFileResult[];
};

export type SaveExperimentPayload = {
  step1: {
    testProject: string;
    sampleCode: string;
    tester: string;
    instrument: string;
    testTime: string;
    sampleOwner: string;
    dynamicFields: { name: string; value: string }[];
  };
  step2: {
    scalarRole?: ScalarItemRole;
    itemName: string;
    itemValue: string;
    itemUnit: string;
    sourceFileName: string;
    sourceFilePath: string;
    originalFileName: string;
    originalFilePath: string;
  }[];
  templateBlocks: SaveExperimentTemplateBlockPayload[];
  displayName: string;
};

export type UpdateExperimentDataItemPayload = {
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

export type SaveExperimentResult = ActionResult & {
  experimentId?: number;
};

export type CheckDuplicateExperimentPayload = {
  sampleCode: string;
  testProject: string;
  testTime: string;
  excludeExperimentId?: number;
};

export type DuplicateExperimentMatch = {
  id: number;
  displayName: string;
  sampleCode: string;
  testProject: string;
  testTime: string;
  tester: string;
  instrument: string;
};

export type DuplicateExperimentCheckResult = {
  matches: DuplicateExperimentMatch[];
};

export type ExperimentListItem = {
  id: number;
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  sampleOwner: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type ExperimentGroup = {
  groupKey: string;
  groupLabel: string;
  items: ExperimentListItem[];
};

export type ListExperimentsPayload = {
  query?: string;
  groupBy?: GroupByType;
  crossFilters?: CrossFilterChip[];
  sortOrder?: ExperimentListSortOrder;
};

export type ExperimentFilterOptions = {
  testProjects: string[];
  testers: string[];
};

export type ListExperimentEditLogsPayload = {
  experimentId: number;
  limit?: number;
};

export type ExperimentEditHistoryEntry = {
  id: number;
  editedAt: string;
  editor: string;
  editReason: string;
  summaryText: string;
};

export type ExperimentDetail = {
  id: number;
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  sampleOwner: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  customFields: {
    id: number;
    fieldName: string;
    fieldValue: string;
    sortOrder: number;
    createdAt: string;
  }[];
  dataItems: {
    id: number;
    itemName: string;
    itemValue: string;
    itemUnit: string | null;
    sourceFileName: string | null;
    sourceFilePath: string | null;
    originalFileName: string | null;
    originalFilePath: string | null;
    rowOrder: number;
    createdAt: string;
  }[];
  templateBlocks: Array<
    | {
        id: number;
        templateType: 'xy';
        purposeType: StructuredBlockPurpose;
        blockTitle: string;
        blockOrder: number;
        xLabel: string;
        xUnit: string;
        yLabel: string;
        yUnit: string;
        note: string;
        points: XYPoint[];
        sourceFileName: string | null;
        sourceFilePath: string | null;
        originalFileName: string | null;
        originalFilePath: string | null;
        createdAt: string;
      }
    | {
        id: number;
        templateType: 'spectrum';
        purposeType: StructuredBlockPurpose;
        blockTitle: string;
        blockOrder: number;
        spectrumAxisLabel: string;
        spectrumAxisUnit: string;
        signalLabel: string;
        signalUnit: string;
        note: string;
        points: XYPoint[];
        sourceFileName: string | null;
        sourceFilePath: string | null;
        originalFileName: string | null;
        originalFilePath: string | null;
        createdAt: string;
      }
  >;
} | null;

export type UpdateExperimentPayload = {
  experimentId: number;
  step1: {
    testProject: string;
    sampleCode: string;
    tester: string;
    instrument: string;
    testTime: string;
    sampleOwner: string;
    dynamicFields: { name: string; value: string }[];
  };
  step2: UpdateExperimentDataItemPayload[];
  templateBlocks: SaveExperimentTemplateBlockPayload[];
  displayName: string;
  editReason: string;
  editor: string;
};

export type ExportResult = {
  canceled?: boolean;
  success?: boolean;
  exportPath?: string;
  compressed?: boolean;
  error?: string;
};

export type SaveGeneratedFilePayload = {
  title: string;
  defaultFileName: string;
  filters: Array<{
    name: string;
    extensions: string[];
  }>;
  textContent?: string;
  base64Content?: string;
};

export type SaveGeneratedFileResult = ActionResult & {
  canceled?: boolean;
  savedPath?: string;
};

export type FileIntegrityReport = {
  storageRoot: string;
  storageRootExists: boolean;
  referencedManagedFileCount: number;
  missingReferencedFileCount: number;
  scannedManagedFileCount: number;
  orphanManagedFileCount: number;
  missingExamples: string[];
  orphanExamples: string[];
  missingReferencedFiles: Array<{
    filePath: string;
    affectedRecords: Array<{
      experimentId: number;
      displayName: string;
      sampleCode: string;
      testProject: string;
      testTime: string;
      recordType: 'dataItem' | 'templateBlock';
      dataItemId: number | null;
      itemName: string | null;
      templateBlockId: number | null;
      blockTitle: string | null;
      templateType: string | null;
      sourceFileName: string | null;
      originalFileName: string | null;
    }>;
  }>;
  orphanFiles: Array<{
    filePath: string;
    relativePath: string;
  }>;
};

export type ExportOrphanFileListPayload = {
  storageRoot: string;
  orphanPaths: string[];
};

export type ExportOrphanFileListResult = ActionResult & {
  canceled?: boolean;
  exportPath?: string;
};

export type QuarantineOrphanFilesPayload = {
  storageRoot: string;
  orphanPaths: string[];
};

export type QuarantineOrphanFilesResult = ActionResult & {
  canceled?: boolean;
  movedCount?: number;
  skippedCount?: number;
  quarantinePath?: string;
};

export type OperationLogFilter = 'all' | 'delete' | 'export';

export type ListRecentOperationLogsPayload = {
  filter?: OperationLogFilter;
  limit?: number;
};

export type RecentOperationLogEntry = {
  id: number;
  createdAt: string;
  operationType: string;
  experimentId: number | null;
  actor: string | null;
  summaryText: string;
};

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  authenticate: (payload: AuthenticatePayload) => Promise<ActionResult>;
  getAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (payload: SaveAppSettingsPayload) => Promise<ActionResult>;
  getPersistedAnalysisUIState: () => Promise<PersistedAnalysisUIState>;
  savePersistedAnalysisUIState: (payload: PersistedAnalysisUIState) => Promise<ActionResult>;
  listDictionaryItems: (
    payload?: ListDictionaryItemsPayload
  ) => Promise<DictionaryItemsByType>;
  addDictionaryItem: (
    payload: AddDictionaryItemPayload
  ) => Promise<AddDictionaryItemResult>;
  deactivateDictionaryItem: (
    payload: DeactivateDictionaryItemPayload
  ) => Promise<ActionResult>;
  selectSourceFile: () => Promise<SelectSourceFileResult>;
  selectImportFiles: () => Promise<SelectImportFilesResult>;
  previewImportFiles: (payload: ImportPreviewPayload) => Promise<ImportPreviewResult>;
  previewManualImportXY: (
    payload: PreviewManualImportXYPayload
  ) => Promise<PreviewManualImportXYResult>;
  copyFileToStorage: (
    payload: CopyFileToStoragePayload
  ) => Promise<CopyFileToStorageResult>;
  checkDuplicateExperiments: (
    payload: CheckDuplicateExperimentPayload
  ) => Promise<DuplicateExperimentCheckResult>;
  saveExperiment: (payload: SaveExperimentPayload) => Promise<SaveExperimentResult>;
  listExperiments: (payload?: ListExperimentsPayload) => Promise<ExperimentGroup[]>;
  listExperimentFilterOptions: () => Promise<ExperimentFilterOptions>;
  getExperimentDetail: (experimentId: number) => Promise<ExperimentDetail>;
  listExperimentEditLogs: (
    payload: ListExperimentEditLogsPayload
  ) => Promise<ExperimentEditHistoryEntry[]>;
  deleteExperiment: (payload: { experimentId: number }) => Promise<ActionResult>;
  updateExperiment: (payload: UpdateExperimentPayload) => Promise<ActionResult>;
  exportFullExperiments: (payload: {
    experimentIds: number[];
    compressAfterExport: boolean;
  }) => Promise<ExportResult>;
  getExportItemNames: (payload: {
    experimentIds: number[];
  }) => Promise<string[]>;
  exportItemNameCompare: (payload: {
    experimentIds: number[];
    mode: 'single' | 'all';
    selectedItemName?: string;
    compressAfterExport: boolean;
  }) => Promise<ExportResult>;
  scanFileIntegrity: () => Promise<FileIntegrityReport>;
  exportOrphanFileList: (
    payload: ExportOrphanFileListPayload
  ) => Promise<ExportOrphanFileListResult>;
  quarantineOrphanFiles: (
    payload: QuarantineOrphanFilesPayload
  ) => Promise<QuarantineOrphanFilesResult>;
  listRecentOperationLogs: (
    payload?: ListRecentOperationLogsPayload
  ) => Promise<RecentOperationLogEntry[]>;
  saveGeneratedFile: (
    payload: SaveGeneratedFilePayload
  ) => Promise<SaveGeneratedFileResult>;
  openPathLocation: (payload: { targetPath: string }) => Promise<ActionResult>;
  openSavedFile: (payload: { filePath: string }) => Promise<ActionResult>;
  openInFolder: (payload: { filePath: string }) => Promise<ActionResult>;
}
