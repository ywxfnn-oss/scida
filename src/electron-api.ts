export type GroupByType =
  | 'sampleCode'
  | 'testProject'
  | 'testTime'
  | 'instrument'
  | 'tester'
  | 'sampleOwner';

export type ActionResult = {
  success: boolean;
  error?: string;
};

export type AppSettings = {
  storageRoot: string;
  loginUsername: string;
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

export type SelectSourceFileResult = {
  originalPath: string;
  originalName: string;
} | null;

export type CopyFileToStorageResult = ActionResult & {
  savedFileName?: string;
  savedPath?: string;
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
    itemName: string;
    itemValue: string;
    itemUnit: string;
    sourceFileName: string;
    sourceFilePath: string;
    originalFileName: string;
    originalFilePath: string;
  }[];
  displayName: string;
};

export type SaveExperimentResult = ActionResult & {
  experimentId?: number;
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
  step2: {
    itemName: string;
    itemValue: string;
    itemUnit: string;
    sourceFileName: string;
    sourceFilePath: string;
    originalFileName: string;
    originalFilePath: string;
  }[];
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

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  authenticate: (payload: AuthenticatePayload) => Promise<ActionResult>;
  getAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (payload: SaveAppSettingsPayload) => Promise<ActionResult>;
  selectSourceFile: () => Promise<SelectSourceFileResult>;
  copyFileToStorage: (payload: {
    sourcePath: string;
    testProject: string;
    sampleCode: string;
    tester: string;
    instrument: string;
    testTime: string;
  }) => Promise<CopyFileToStorageResult>;
  saveExperiment: (payload: SaveExperimentPayload) => Promise<SaveExperimentResult>;
  listExperiments: (payload?: {
    query?: string;
    groupBy?: GroupByType;
  }) => Promise<ExperimentGroup[]>;
  getExperimentDetail: (experimentId: number) => Promise<ExperimentDetail>;
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
  openSavedFile: (payload: { filePath: string }) => Promise<ActionResult>;
  openInFolder: (payload: { filePath: string }) => Promise<ActionResult>;
}
