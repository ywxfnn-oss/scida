import type { StructuredBlockPurpose } from '../template-blocks';

export type TemplateLibrarySourceType = 'builtin' | 'user' | 'userOverride';
export type TemplateEntityType = 'scientific' | 'curve' | 'import';
export type TemplateLibraryVersion = 1;

export type TemplateAlias = {
  value: string;
  kind?: 'display' | 'search' | 'filenameHint' | 'legacy';
};

export type AxisDefaults = {
  primaryLabel: string;
  primaryUnit: string;
  secondaryLabel: string;
  secondaryUnit: string;
};

export type TemplateRecommendedCondition = {
  id: string;
  label: string;
  unit?: string;
  defaultValue?: string;
  note?: string;
  priority?: number;
};

export type TemplateRecommendedMetric = {
  id: string;
  label: string;
  unit?: string;
  defaultValue?: string;
  note?: string;
  priority?: number;
};

export type ScientificTestTemplate = {
  id: string;
  version: number;
  displayName: string;
  aliases: TemplateAlias[];
  enabled: boolean;
  description?: string;
  sourceType: TemplateLibrarySourceType;
  createdAt?: string;
  updatedAt?: string;
};

export type ImportParsingTemplate = {
  id: string;
  version: number;
  displayName: string;
  familyId?: string;
  curveTemplateId?: string;
  fileExtension?: string;
  textEncoding: string;
  delimiter: string;
  dataStartRow: number;
  dataEndRow?: number;
  hasExplicitEndRow: boolean;
  dataStartColumn?: number;
  dataEndColumn?: number;
  xSourceMode: 'column' | 'generated';
  xColumnIndex: number;
  yColumnIndex: number;
  generatedXStart?: number;
  generatedXStep?: number;
  ignoreEmptyRows: boolean;
  ignoreNonNumericRows: boolean;
  collapseWhitespace: boolean;
  sourceType: TemplateLibrarySourceType;
  createdAt?: string;
  updatedAt?: string;
};

export type StructuredCurveTemplate = {
  id: string;
  version: number;
  familyId: string;
  displayName: string;
  aliases: TemplateAlias[];
  enabled: boolean;
  purposeType: StructuredBlockPurpose;
  blockTitleDefault: string;
  axisDefaults: AxisDefaults;
  recommendedConditions: TemplateRecommendedCondition[];
  recommendedMetrics: TemplateRecommendedMetric[];
  importParsingTemplateId?: string;
  filenameHints?: string[];
  sourceType: TemplateLibrarySourceType;
  createdAt?: string;
  updatedAt?: string;
};

export type TemplateOverride = {
  targetId: string;
  targetType: TemplateEntityType;
  patch: Record<string, unknown>;
  updatedAt: string;
};

export type ImportParsingSettingsSnapshot = {
  textEncoding: string;
  delimiter: string;
  dataStartRow: number;
  dataEndRow?: number;
  hasExplicitEndRow: boolean;
  dataStartColumn?: number;
  dataEndColumn?: number;
  xSourceMode: 'column' | 'generated';
  xColumnIndex: number;
  yColumnIndex: number;
  generatedXStart?: number;
  generatedXStep?: number;
  ignoreEmptyRows: boolean;
  ignoreNonNumericRows: boolean;
  collapseWhitespace: boolean;
};

export type ImportMemory = {
  id: string;
  testProject?: string;
  familyId?: string;
  curveTemplateId?: string;
  blockName: string;
  normalizedBlockName: string;
  purposeType: StructuredBlockPurpose;
  fileExtension?: string;
  importParsingSettings: ImportParsingSettingsSnapshot;
  axisDefaults?: AxisDefaults;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
};

export type RecentCurveNames = {
  global: string[];
  byPurpose: Record<string, string[]>;
};

export type TemplateLibraryUserTemplates = {
  scientificTemplates: ScientificTestTemplate[];
  curveTemplates: StructuredCurveTemplate[];
  importParsingTemplates: ImportParsingTemplate[];
};

export type TemplateLibraryState = {
  version: TemplateLibraryVersion;
  userTemplates: TemplateLibraryUserTemplates;
  userOverrides: TemplateOverride[];
  disabledTemplateIds: string[];
  importMemories: ImportMemory[];
  recentCurveNames: RecentCurveNames;
  updatedAt: string;
};

export type BuiltinTemplateLibrary = {
  version: number;
  scientificTemplates: ScientificTestTemplate[];
  curveTemplates: StructuredCurveTemplate[];
  importParsingTemplates: ImportParsingTemplate[];
};

export type ResolvedTemplateLibrary = {
  version: number;
  state: TemplateLibraryState;
  scientificTemplates: ScientificTestTemplate[];
  curveTemplates: StructuredCurveTemplate[];
  importParsingTemplates: ImportParsingTemplate[];
  activeScientificTemplates: ScientificTestTemplate[];
  activeCurveTemplates: StructuredCurveTemplate[];
  activeImportParsingTemplates: ImportParsingTemplate[];
};

export type UpsertUserTemplatePayload =
  | {
      templateType: 'scientific';
      template: ScientificTestTemplate;
    }
  | {
      templateType: 'curve';
      template: StructuredCurveTemplate;
    }
  | {
      templateType: 'import';
      template: ImportParsingTemplate;
    };

export type SetTemplateEnabledPayload = {
  templateId: string;
  enabled: boolean;
};

export type ResetTemplateOverridePayload = {
  targetId: string;
  targetType: TemplateEntityType;
};

export type UpsertImportMemoryPayload = {
  testProject?: string;
  familyId?: string;
  curveTemplateId?: string;
  blockName: string;
  normalizedBlockName?: string;
  purposeType: StructuredBlockPurpose;
  fileExtension?: string;
  importParsingSettings: ImportParsingSettingsSnapshot;
  axisDefaults?: AxisDefaults;
};

export type TemplateMemoryMatchQuery = {
  testProject?: string;
  blockName?: string;
  purposeType?: string;
  fileExtension?: string;
};

export type TemplateMemoryMatchCandidate = {
  memory: ImportMemory;
  score: number;
  matchLevel: 1 | 2 | 3 | 4 | 5 | 6;
  reason:
    | 'testProject+blockName+purposeType+fileExtension'
    | 'testProject+blockName+purposeType'
    | 'blockName+purposeType+fileExtension'
    | 'blockName+purposeType'
    | 'purposeType+fileExtension'
    | 'purposeType';
};

export type TemplateRecommendationReason =
  | 'displayName'
  | 'alias'
  | 'id'
  | 'family'
  | 'fallback';

export type ScientificFamilyRecommendation = {
  family: ScientificTestTemplate;
  score: number;
  reason: TemplateRecommendationReason;
  matchedAlias?: string;
};

export type FindCurveTemplatesOptions = {
  includeDisabled?: boolean;
  limit?: number;
  query?: string;
};

export type CurveTemplateRecommendation = {
  curveTemplate: StructuredCurveTemplate;
  family?: ScientificTestTemplate;
  score: number;
  reason: TemplateRecommendationReason;
  matchedAlias?: string;
};

export type TemplateApplicationPreview = {
  curveTemplateId: string;
  familyId: string;
  familyDisplayName?: string;
  displayName: string;
  blockTitleDefault: string;
  purposeType: StructuredBlockPurpose;
  axisDefaults: AxisDefaults;
  recommendedConditions: TemplateRecommendedCondition[];
  recommendedMetrics: TemplateRecommendedMetric[];
  importParsingTemplate?: ImportParsingTemplate;
  reason?: string;
  matchedAlias?: string;
};
