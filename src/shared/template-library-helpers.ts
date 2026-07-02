import type {
  AxisDefaults,
  BuiltinTemplateLibrary,
  CurveTemplateRecommendation,
  FindCurveTemplatesOptions,
  ImportMemory,
  ImportParsingSettingsSnapshot,
  ImportParsingTemplate,
  RecentCurveNames,
  ResolvedTemplateLibrary,
  ScientificFamilyRecommendation,
  ScientificTestTemplate,
  SetTemplateEnabledPayload,
  StructuredCurveTemplate,
  TemplateApplicationPreview,
  TemplateAlias,
  TemplateRecommendationReason,
  TemplateEntityType,
  TemplateLibraryState,
  TemplateLibraryUserTemplates,
  TemplateMemoryMatchCandidate,
  TemplateMemoryMatchQuery,
  TemplateOverride,
  TemplateRecommendedCondition,
  TemplateRecommendedMetric,
  TemplateLibrarySourceType,
  UpsertUserTemplatePayload
} from './template-library-types';
import { normalizeStructuredBlockPurpose, type StructuredBlockPurpose } from '../template-blocks';

const TEMPLATE_LIBRARY_STATE_VERSION = 1 as const;
const MAX_IMPORT_MEMORIES = 50;
const MAX_RECENT_CURVE_NAMES = 20;
const GENERIC_BLOCK_NAME_PATTERNS = [
  /^结构化数据(?:块|曲线)?(?:\s*\d+)?$/i,
  /^结构化数据块(?:\s*\d+)?$/i,
  /^结构化曲线(?:\s*\d+)?$/i,
  /^未指定$/i,
  /^unnamed block$/i,
  /^structured data(?:\s*\d+)?$/i,
  /^structured block(?:\s*\d+)?$/i,
  /^structured curve(?:\s*\d+)?$/i
];

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function normalizeTimestamp(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || new Date().toISOString();
}

function normalizeBoolean(value: unknown, fallbackValue = false) {
  return typeof value === 'boolean' ? value : fallbackValue;
}

function normalizePositiveInteger(value: unknown, fallbackValue: number) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallbackValue;
}

function normalizeOptionalInteger(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeTemplateId(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export function normalizeBlockName(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizePurposeType(value: unknown): StructuredBlockPurpose {
  const normalized = normalizeText(value).toLowerCase();

  switch (normalized) {
    case '':
    case 'unspecified':
      return '';
    case 'spectrum':
    case 'pl':
      return 'spectrum';
    case 'iv':
    case 'i-v':
    case 'dark iv':
    case 'dark i-v':
      return 'iv';
    case 'xrd':
      return 'xrd';
    case 'eqe':
      return 'eqe';
    case 'responsivity':
      return 'responsivity';
    case 'custom':
      return 'custom';
    default:
      return normalizeStructuredBlockPurpose(normalized);
  }
}

export function normalizeFileExtension(value: unknown) {
  return normalizeText(value).toLowerCase().replace(/^\./, '');
}

export function isGenericStructuredBlockName(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return true;
  }

  return GENERIC_BLOCK_NAME_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeAlias(value: unknown): TemplateAlias | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const aliasValue = normalizeText(candidate.value);

  if (!aliasValue) {
    return null;
  }

  const kind = normalizeOptionalText(candidate.kind);

  return {
    ...candidate,
    value: aliasValue,
    kind:
      kind === 'display' || kind === 'search' || kind === 'filenameHint' || kind === 'legacy'
        ? kind
        : undefined
  };
}

function normalizeAliases(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeAlias(item))
    .filter((item): item is TemplateAlias => Boolean(item));
}

function normalizeAxisDefaults(value: unknown): AxisDefaults {
  const candidate = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    ...candidate,
    primaryLabel: normalizeText(candidate.primaryLabel),
    primaryUnit: normalizeText(candidate.primaryUnit),
    secondaryLabel: normalizeText(candidate.secondaryLabel),
    secondaryUnit: normalizeText(candidate.secondaryUnit)
  };
}

function normalizeRecommendedCondition(value: unknown): TemplateRecommendedCondition | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const label = normalizeText(candidate.label);

  if (!label) {
    return null;
  }

  return {
    ...candidate,
    id: normalizeTemplateId(candidate.id) || normalizeTemplateId(label),
    label,
    unit: normalizeOptionalText(candidate.unit),
    defaultValue: normalizeOptionalText(candidate.defaultValue),
    note: normalizeOptionalText(candidate.note),
    priority: Number.isFinite(Number(candidate.priority)) ? Number(candidate.priority) : undefined
  };
}

function normalizeRecommendedMetric(value: unknown): TemplateRecommendedMetric | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const label = normalizeText(candidate.label);

  if (!label) {
    return null;
  }

  return {
    ...candidate,
    id: normalizeTemplateId(candidate.id) || normalizeTemplateId(label),
    label,
    unit: normalizeOptionalText(candidate.unit),
    defaultValue: normalizeOptionalText(candidate.defaultValue),
    note: normalizeOptionalText(candidate.note),
    priority: Number.isFinite(Number(candidate.priority)) ? Number(candidate.priority) : undefined
  };
}

function normalizeImportParsingSettingsSnapshot(value: unknown): ImportParsingSettingsSnapshot {
  const candidate = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    ...candidate,
    textEncoding: normalizeText(candidate.textEncoding) || 'auto',
    delimiter: normalizeText(candidate.delimiter) || 'comma',
    dataStartRow: normalizePositiveInteger(candidate.dataStartRow, 1),
    dataEndRow: normalizeOptionalInteger(candidate.dataEndRow),
    hasExplicitEndRow: normalizeBoolean(candidate.hasExplicitEndRow),
    dataStartColumn: normalizeOptionalInteger(candidate.dataStartColumn),
    dataEndColumn: normalizeOptionalInteger(candidate.dataEndColumn),
    xSourceMode: normalizeText(candidate.xSourceMode) === 'generated' ? 'generated' : 'column',
    xColumnIndex: normalizePositiveInteger(candidate.xColumnIndex, 1),
    yColumnIndex: normalizePositiveInteger(candidate.yColumnIndex, 2),
    generatedXStart:
      Number.isFinite(Number(candidate.generatedXStart)) ? Number(candidate.generatedXStart) : undefined,
    generatedXStep:
      Number.isFinite(Number(candidate.generatedXStep)) ? Number(candidate.generatedXStep) : undefined,
    ignoreEmptyRows: normalizeBoolean(candidate.ignoreEmptyRows, true),
    ignoreNonNumericRows: normalizeBoolean(candidate.ignoreNonNumericRows, true),
    collapseWhitespace: normalizeBoolean(candidate.collapseWhitespace, false)
  };
}

function normalizeScientificTestTemplate(
  value: unknown,
  fallbackSourceType: TemplateLibrarySourceType
): ScientificTestTemplate | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = normalizeTemplateId(candidate.id);
  const displayName = normalizeText(candidate.displayName);

  if (!id || !displayName) {
    return null;
  }

  return {
    ...candidate,
    id,
    version: normalizePositiveInteger(candidate.version, 1),
    displayName,
    aliases: normalizeAliases(candidate.aliases),
    enabled: normalizeBoolean(candidate.enabled, true),
    description: normalizeOptionalText(candidate.description),
    sourceType: fallbackSourceType,
    createdAt: normalizeOptionalText(candidate.createdAt),
    updatedAt: normalizeOptionalText(candidate.updatedAt)
  };
}

function normalizeStructuredCurveTemplate(
  value: unknown,
  fallbackSourceType: TemplateLibrarySourceType
): StructuredCurveTemplate | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = normalizeTemplateId(candidate.id);
  const familyId = normalizeTemplateId(candidate.familyId);
  const displayName = normalizeText(candidate.displayName);

  if (!id || !familyId || !displayName) {
    return null;
  }

  return {
    ...candidate,
    id,
    version: normalizePositiveInteger(candidate.version, 1),
    familyId,
    displayName,
    aliases: normalizeAliases(candidate.aliases),
    enabled: normalizeBoolean(candidate.enabled, true),
    purposeType: normalizePurposeType(candidate.purposeType),
    blockTitleDefault: normalizeText(candidate.blockTitleDefault) || displayName,
    axisDefaults: normalizeAxisDefaults(candidate.axisDefaults),
    recommendedConditions: Array.isArray(candidate.recommendedConditions)
      ? candidate.recommendedConditions
          .map((item) => normalizeRecommendedCondition(item))
          .filter((item): item is TemplateRecommendedCondition => Boolean(item))
      : [],
    recommendedMetrics: Array.isArray(candidate.recommendedMetrics)
      ? candidate.recommendedMetrics
          .map((item) => normalizeRecommendedMetric(item))
          .filter((item): item is TemplateRecommendedMetric => Boolean(item))
      : [],
    importParsingTemplateId: normalizeOptionalText(candidate.importParsingTemplateId)
      ? normalizeTemplateId(candidate.importParsingTemplateId)
      : undefined,
    filenameHints: Array.isArray(candidate.filenameHints)
      ? uniqueStrings(candidate.filenameHints.map((item) => normalizeText(item)))
      : undefined,
    sourceType: fallbackSourceType,
    createdAt: normalizeOptionalText(candidate.createdAt),
    updatedAt: normalizeOptionalText(candidate.updatedAt)
  };
}

function normalizeImportParsingTemplate(
  value: unknown,
  fallbackSourceType: TemplateLibrarySourceType
): ImportParsingTemplate | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = normalizeTemplateId(candidate.id);
  const displayName = normalizeText(candidate.displayName);

  if (!id || !displayName) {
    return null;
  }

  const settings = normalizeImportParsingSettingsSnapshot(candidate);

  return {
    ...candidate,
    id,
    version: normalizePositiveInteger(candidate.version, 1),
    displayName,
    familyId: normalizeOptionalText(candidate.familyId)
      ? normalizeTemplateId(candidate.familyId)
      : undefined,
    curveTemplateId: normalizeOptionalText(candidate.curveTemplateId)
      ? normalizeTemplateId(candidate.curveTemplateId)
      : undefined,
    fileExtension: normalizeOptionalText(candidate.fileExtension)
      ? normalizeFileExtension(candidate.fileExtension)
      : undefined,
    textEncoding: settings.textEncoding,
    delimiter: settings.delimiter,
    dataStartRow: settings.dataStartRow,
    dataEndRow: settings.dataEndRow,
    hasExplicitEndRow: settings.hasExplicitEndRow,
    dataStartColumn: settings.dataStartColumn,
    dataEndColumn: settings.dataEndColumn,
    xSourceMode: settings.xSourceMode,
    xColumnIndex: settings.xColumnIndex,
    yColumnIndex: settings.yColumnIndex,
    generatedXStart: settings.generatedXStart,
    generatedXStep: settings.generatedXStep,
    ignoreEmptyRows: settings.ignoreEmptyRows,
    ignoreNonNumericRows: settings.ignoreNonNumericRows,
    collapseWhitespace: settings.collapseWhitespace,
    sourceType: fallbackSourceType,
    createdAt: normalizeOptionalText(candidate.createdAt),
    updatedAt: normalizeOptionalText(candidate.updatedAt)
  };
}

export function sanitizeTemplateOverridePatch(
  targetType: TemplateEntityType,
  patch: Record<string, unknown>
) {
  const sanitized: Record<string, unknown> = {};

  if (typeof patch.displayName === 'string') {
    const displayName = normalizeText(patch.displayName);
    if (displayName) {
      sanitized.displayName = displayName;
    }
  }

  if (Array.isArray(patch.aliases)) {
    const aliases = normalizeAliases(patch.aliases);
    if (aliases.length) {
      sanitized.aliases = aliases;
    }
  }

  if (typeof patch.enabled === 'boolean') {
    sanitized.enabled = patch.enabled;
  }

  if (targetType === 'curve') {
    const purposeType = normalizePurposeType(patch.purposeType);
    if (purposeType) {
      sanitized.purposeType = purposeType;
    }

    const blockTitleDefault = normalizeText(patch.blockTitleDefault);
    if (blockTitleDefault) {
      sanitized.blockTitleDefault = blockTitleDefault;
    }

    if (patch.axisDefaults && typeof patch.axisDefaults === 'object') {
      sanitized.axisDefaults = normalizeAxisDefaults(patch.axisDefaults);
    }

    if (Array.isArray(patch.recommendedConditions)) {
      sanitized.recommendedConditions = patch.recommendedConditions
        .map((item) => normalizeRecommendedCondition(item))
        .filter((item): item is TemplateRecommendedCondition => Boolean(item));
    }

    if (Array.isArray(patch.recommendedMetrics)) {
      sanitized.recommendedMetrics = patch.recommendedMetrics
        .map((item) => normalizeRecommendedMetric(item))
        .filter((item): item is TemplateRecommendedMetric => Boolean(item));
    }

    const importParsingTemplateId = normalizeOptionalText(patch.importParsingTemplateId);
    if (importParsingTemplateId) {
      sanitized.importParsingTemplateId = normalizeTemplateId(importParsingTemplateId);
    } else if (patch.importParsingTemplateId === null) {
      sanitized.importParsingTemplateId = null;
    }

    if (Array.isArray(patch.filenameHints)) {
      sanitized.filenameHints = pruneStringList(
        patch.filenameHints.map((item) => normalizeText(item)),
        12
      );
    }
  }

  if (targetType === 'import') {
    const familyId = normalizeOptionalText(patch.familyId);
    if (familyId) {
      sanitized.familyId = normalizeTemplateId(familyId);
    }

    const curveTemplateId = normalizeOptionalText(patch.curveTemplateId);
    if (curveTemplateId) {
      sanitized.curveTemplateId = normalizeTemplateId(curveTemplateId);
    }

    const fileExtension = normalizeOptionalText(patch.fileExtension);
    if (fileExtension) {
      sanitized.fileExtension = normalizeFileExtension(fileExtension);
    }

    const parsingSnapshot = normalizeImportParsingSettingsSnapshot(patch);
    sanitized.textEncoding = parsingSnapshot.textEncoding;
    sanitized.delimiter = parsingSnapshot.delimiter;
    sanitized.dataStartRow = parsingSnapshot.dataStartRow;
    sanitized.dataEndRow = parsingSnapshot.dataEndRow;
    sanitized.hasExplicitEndRow = parsingSnapshot.hasExplicitEndRow;
    sanitized.dataStartColumn = parsingSnapshot.dataStartColumn;
    sanitized.dataEndColumn = parsingSnapshot.dataEndColumn;
    sanitized.xSourceMode = parsingSnapshot.xSourceMode;
    sanitized.xColumnIndex = parsingSnapshot.xColumnIndex;
    sanitized.yColumnIndex = parsingSnapshot.yColumnIndex;
    sanitized.generatedXStart = parsingSnapshot.generatedXStart;
    sanitized.generatedXStep = parsingSnapshot.generatedXStep;
    sanitized.ignoreEmptyRows = parsingSnapshot.ignoreEmptyRows;
    sanitized.ignoreNonNumericRows = parsingSnapshot.ignoreNonNumericRows;
    sanitized.collapseWhitespace = parsingSnapshot.collapseWhitespace;
  }

  return sanitized;
}

function normalizeTemplateOverride(value: unknown): TemplateOverride | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const targetType = normalizeText(candidate.targetType);
  const targetId = normalizeTemplateId(candidate.targetId);
  const patch = candidate.patch && typeof candidate.patch === 'object'
    ? sanitizeTemplateOverridePatch(
        targetType as TemplateEntityType,
        { ...(candidate.patch as Record<string, unknown>) }
      )
    : {};

  if (
    !targetId ||
    (targetType !== 'scientific' && targetType !== 'curve' && targetType !== 'import')
  ) {
    return null;
  }

  return {
    ...candidate,
    targetId,
    targetType: targetType as TemplateEntityType,
    patch,
    updatedAt: normalizeTimestamp(candidate.updatedAt)
  };
}

function normalizeImportMemory(value: unknown): ImportMemory | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const blockName = normalizeText(candidate.blockName);
  const purposeType = normalizePurposeType(candidate.purposeType);

  if (!purposeType) {
    return null;
  }

  const normalizedBlockName =
    normalizeBlockName(candidate.normalizedBlockName) || normalizeBlockName(blockName);

  return {
    ...candidate,
    id: normalizeTemplateId(candidate.id) || `${purposeType}:${normalizedBlockName || 'memory'}`,
    testProject: normalizeOptionalText(candidate.testProject),
    familyId: normalizeOptionalText(candidate.familyId)
      ? normalizeTemplateId(candidate.familyId)
      : undefined,
    curveTemplateId: normalizeOptionalText(candidate.curveTemplateId)
      ? normalizeTemplateId(candidate.curveTemplateId)
      : undefined,
    blockName,
    normalizedBlockName,
    purposeType,
    fileExtension: normalizeOptionalText(candidate.fileExtension)
      ? normalizeFileExtension(candidate.fileExtension)
      : undefined,
    importParsingSettings: normalizeImportParsingSettingsSnapshot(candidate.importParsingSettings),
    axisDefaults: candidate.axisDefaults ? normalizeAxisDefaults(candidate.axisDefaults) : undefined,
    usageCount: Math.max(1, Number(candidate.usageCount) || 1),
    lastUsedAt: normalizeTimestamp(candidate.lastUsedAt),
    createdAt: normalizeTimestamp(candidate.createdAt)
  };
}

function buildImportMemoryId(value: {
  testProject?: string;
  blockName?: string;
  normalizedBlockName?: string;
  purposeType?: string;
  fileExtension?: string;
}) {
  const purposeType = normalizePurposeType(value.purposeType);
  const normalizedBlockName =
    normalizeBlockName(value.normalizedBlockName) || normalizeBlockName(value.blockName);
  const normalizedTestProject = normalizeBlockName(value.testProject);
  const normalizedFileExtension = normalizeFileExtension(value.fileExtension);

  return normalizeTemplateId(
    `import-memory:${purposeType || 'unspecified'}:${normalizedTestProject || 'global'}:${
      normalizedBlockName || 'memory'
    }:${normalizedFileExtension || 'any'}`
  );
}

function normalizeRecentCurveNames(value: unknown): RecentCurveNames {
  if (!value || typeof value !== 'object') {
    return { global: [], byPurpose: {} };
  }

  const candidate = value as Record<string, unknown>;
  const global = Array.isArray(candidate.global)
    ? pruneStringList(candidate.global.map((item) => normalizeText(item)), MAX_RECENT_CURVE_NAMES)
    : [];

  const byPurposeSource =
    candidate.byPurpose && typeof candidate.byPurpose === 'object'
      ? (candidate.byPurpose as Record<string, unknown>)
      : {};
  const byPurpose: Record<string, string[]> = {};

  for (const [purpose, names] of Object.entries(byPurposeSource)) {
    const normalizedPurpose = normalizePurposeType(purpose);
    if (!normalizedPurpose || !Array.isArray(names)) {
      continue;
    }

    byPurpose[normalizedPurpose] = pruneStringList(
      names.map((item) => normalizeText(item)),
      MAX_RECENT_CURVE_NAMES
    );
  }

  return { global, byPurpose };
}

function pruneStringList(values: string[], maxCount: number) {
  return uniqueStrings(values.filter(Boolean)).slice(0, maxCount);
}

function normalizeUserTemplates(value: unknown): TemplateLibraryUserTemplates {
  const candidate = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    scientificTemplates: Array.isArray(candidate.scientificTemplates)
      ? candidate.scientificTemplates
          .map((item) => normalizeScientificTestTemplate(item, 'user'))
          .filter((item): item is ScientificTestTemplate => Boolean(item))
      : [],
    curveTemplates: Array.isArray(candidate.curveTemplates)
      ? candidate.curveTemplates
          .map((item) => normalizeStructuredCurveTemplate(item, 'user'))
          .filter((item): item is StructuredCurveTemplate => Boolean(item))
      : [],
    importParsingTemplates: Array.isArray(candidate.importParsingTemplates)
      ? candidate.importParsingTemplates
          .map((item) => normalizeImportParsingTemplate(item, 'user'))
          .filter((item): item is ImportParsingTemplate => Boolean(item))
      : []
  };
}

export function createEmptyTemplateLibraryState(): TemplateLibraryState {
  return {
    version: TEMPLATE_LIBRARY_STATE_VERSION,
    userTemplates: {
      scientificTemplates: [],
      curveTemplates: [],
      importParsingTemplates: []
    },
    userOverrides: [],
    disabledTemplateIds: [],
    importMemories: [],
    recentCurveNames: {
      global: [],
      byPurpose: {}
    },
    updatedAt: new Date().toISOString()
  };
}

export function normalizeTemplateLibraryState(value: unknown): TemplateLibraryState {
  const emptyState = createEmptyTemplateLibraryState();

  if (!value || typeof value !== 'object') {
    return emptyState;
  }

  const candidate = value as Record<string, unknown>;

  return {
    ...candidate,
    version: TEMPLATE_LIBRARY_STATE_VERSION,
    userTemplates: normalizeUserTemplates(candidate.userTemplates),
    userOverrides: Array.isArray(candidate.userOverrides)
      ? candidate.userOverrides
          .map((item) => normalizeTemplateOverride(item))
          .filter((item): item is TemplateOverride => Boolean(item))
      : [],
    disabledTemplateIds: uniqueStrings(
      Array.isArray(candidate.disabledTemplateIds)
        ? candidate.disabledTemplateIds.map((item) => normalizeTemplateId(item))
        : []
    ),
    importMemories: pruneTemplateMemories(
      Array.isArray(candidate.importMemories)
        ? candidate.importMemories
            .map((item) => normalizeImportMemory(item))
            .filter((item): item is ImportMemory => Boolean(item))
        : []
    ),
    recentCurveNames: normalizeRecentCurveNames(candidate.recentCurveNames),
    updatedAt: normalizeTimestamp(candidate.updatedAt)
  };
}

function mergeTemplatePatch<T extends Record<string, unknown>>(
  template: T,
  patch: Record<string, unknown>
) {
  const merged: Record<string, unknown> = {
    ...template,
    ...patch
  };

  if (patch.axisDefaults && typeof patch.axisDefaults === 'object') {
    merged.axisDefaults = {
      ...(template.axisDefaults as Record<string, unknown> | undefined),
      ...(patch.axisDefaults as Record<string, unknown>)
    };
  }

  return merged;
}

function applyTemplateOverrides<T extends { id: string }>(
  templates: T[],
  overrides: TemplateOverride[],
  targetType: TemplateEntityType,
  normalizeTemplate: (value: unknown) => T | null
) {
  const overrideMap = new Map(
    overrides
      .filter((override) => override.targetType === targetType)
      .map((override) => [override.targetId, override])
  );

  return templates
    .map((template) => {
      const override = overrideMap.get(template.id);
      if (!override) {
        return template;
      }

      return normalizeTemplate(mergeTemplatePatch(template as Record<string, unknown>, override.patch));
    })
    .filter((template): template is T => Boolean(template));
}

function normalizeResolvedScientificTemplate(value: unknown) {
  const candidate = value as Record<string, unknown> | null;
  return normalizeScientificTestTemplate(
    value,
    candidate?.sourceType === 'user' ? 'user' : 'builtin'
  );
}

function normalizeResolvedCurveTemplate(value: unknown) {
  const candidate = value as Record<string, unknown> | null;
  return normalizeStructuredCurveTemplate(
    value,
    candidate?.sourceType === 'user' ? 'user' : 'builtin'
  );
}

function normalizeResolvedImportTemplate(value: unknown) {
  const candidate = value as Record<string, unknown> | null;
  return normalizeImportParsingTemplate(
    value,
    candidate?.sourceType === 'user' ? 'user' : 'builtin'
  );
}

function buildTemplateMap<T extends { id: string }>(templates: T[]) {
  const map = new Map<string, T>();

  for (const template of templates) {
    map.set(template.id, template);
  }

  return map;
}

function filterActiveTemplates<T extends { id: string; enabled?: boolean }>(
  templates: T[],
  disabledIds: Set<string>
) {
  return templates.filter(
    (template) => (typeof template.enabled !== 'boolean' || template.enabled) && !disabledIds.has(template.id)
  );
}

export function resolveTemplateLibrary(
  builtinLibrary: BuiltinTemplateLibrary,
  state: TemplateLibraryState
): ResolvedTemplateLibrary {
  const normalizedState = normalizeTemplateLibraryState(state);

  const scientificTemplates = applyTemplateOverrides(
    [
      ...builtinLibrary.scientificTemplates.map((item) => normalizeScientificTestTemplate(item, 'builtin')),
      ...normalizedState.userTemplates.scientificTemplates
    ].filter((item): item is ScientificTestTemplate => Boolean(item)),
    normalizedState.userOverrides,
    'scientific',
    normalizeResolvedScientificTemplate
  );
  const curveTemplates = applyTemplateOverrides(
    [
      ...builtinLibrary.curveTemplates.map((item) => normalizeStructuredCurveTemplate(item, 'builtin')),
      ...normalizedState.userTemplates.curveTemplates
    ].filter((item): item is StructuredCurveTemplate => Boolean(item)),
    normalizedState.userOverrides,
    'curve',
    normalizeResolvedCurveTemplate
  );
  const importParsingTemplates = applyTemplateOverrides(
    [
      ...builtinLibrary.importParsingTemplates.map((item) => normalizeImportParsingTemplate(item, 'builtin')),
      ...normalizedState.userTemplates.importParsingTemplates
    ].filter((item): item is ImportParsingTemplate => Boolean(item)),
    normalizedState.userOverrides,
    'import',
    normalizeResolvedImportTemplate
  );

  const dedupedScientificTemplates = Array.from(buildTemplateMap(scientificTemplates).values());
  const dedupedCurveTemplates = Array.from(buildTemplateMap(curveTemplates).values());
  const dedupedImportTemplates = Array.from(buildTemplateMap(importParsingTemplates).values());
  const disabledIds = new Set(normalizedState.disabledTemplateIds.map((item) => normalizeTemplateId(item)));

  return {
    version: Math.max(builtinLibrary.version, normalizedState.version),
    state: normalizedState,
    scientificTemplates: dedupedScientificTemplates,
    curveTemplates: dedupedCurveTemplates,
    importParsingTemplates: dedupedImportTemplates,
    activeScientificTemplates: filterActiveTemplates(dedupedScientificTemplates, disabledIds),
    activeCurveTemplates: filterActiveTemplates(dedupedCurveTemplates, disabledIds),
    activeImportParsingTemplates: filterActiveTemplates(dedupedImportTemplates, disabledIds)
  };
}

export function createTemplateCompatibilityLookup(resolvedLibrary: ResolvedTemplateLibrary) {
  return {
    scientificTemplates: buildTemplateMap(resolvedLibrary.scientificTemplates),
    curveTemplates: buildTemplateMap(resolvedLibrary.curveTemplates),
    importParsingTemplates: buildTemplateMap(resolvedLibrary.importParsingTemplates)
  };
}

function compareRecommendationScore(
  leftScore: number,
  rightScore: number,
  leftName: string,
  rightName: string
) {
  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  return leftName.localeCompare(rightName, 'zh-CN');
}

function buildSearchTerms(displayName: string, aliases: TemplateAlias[], id: string) {
  return {
    displayName: normalizeBlockName(displayName),
    aliases: aliases.map((alias) => normalizeBlockName(alias.value)).filter(Boolean),
    id: normalizeTemplateId(id)
  };
}

function matchQueryToTemplate(
  query: string,
  displayName: string,
  aliases: TemplateAlias[],
  id: string
): { score: number; reason: TemplateRecommendationReason; matchedAlias?: string } {
  const normalizedQuery = normalizeBlockName(query);
  if (!normalizedQuery) {
    return { score: 0, reason: 'fallback' };
  }

  const searchable = buildSearchTerms(displayName, aliases, id);

  if (searchable.displayName && normalizedQuery.includes(searchable.displayName)) {
    return { score: 100, reason: 'displayName' };
  }

  for (const alias of searchable.aliases) {
    if (normalizedQuery.includes(alias)) {
      return { score: 110, reason: 'alias', matchedAlias: alias };
    }
  }

  if (searchable.id && normalizedQuery.includes(searchable.id)) {
    return { score: 80, reason: 'id' };
  }

  if (searchable.displayName && searchable.displayName.includes(normalizedQuery)) {
    return { score: 70, reason: 'displayName' };
  }

  for (const alias of searchable.aliases) {
    if (alias.includes(normalizedQuery)) {
      return { score: 75, reason: 'alias', matchedAlias: alias };
    }
  }

  return { score: 0, reason: 'fallback' };
}

export function findScientificFamiliesForTestProject(
  testProject: string,
  resolvedLibrary: ResolvedTemplateLibrary
): ScientificFamilyRecommendation[] {
  const recommendations = resolvedLibrary.activeScientificTemplates.map((family) => {
    const matched = matchQueryToTemplate(testProject, family.displayName, family.aliases, family.id);
    return {
      family,
      score: matched.score,
      reason: matched.reason,
      matchedAlias: matched.matchedAlias
    };
  });

  const matchedRecommendations = recommendations.filter((item) => item.score > 0);
  const source = matchedRecommendations.length ? matchedRecommendations : recommendations;

  return [...source].sort((left, right) =>
    compareRecommendationScore(left.score, right.score, left.family.displayName, right.family.displayName)
  );
}

export function findCurveTemplatesForFamily(
  familyId: string,
  resolvedLibrary: ResolvedTemplateLibrary,
  options: FindCurveTemplatesOptions = {}
): CurveTemplateRecommendation[] {
  const includeDisabled = Boolean(options.includeDisabled);
  const familyKey = normalizeTemplateId(familyId);
  const query = normalizeText(options.query);
  const limit = options.limit && options.limit > 0 ? options.limit : undefined;
  const families = includeDisabled
    ? resolvedLibrary.scientificTemplates
    : resolvedLibrary.activeScientificTemplates;
  const curves = includeDisabled ? resolvedLibrary.curveTemplates : resolvedLibrary.activeCurveTemplates;
  const family = families.find((item) => item.id === familyKey);

  const scopedCurves = familyKey
    ? curves.filter((curveTemplate) => curveTemplate.familyId === familyKey)
    : curves;

  const recommendations = scopedCurves
    .map((curveTemplate) => {
      const matched = matchQueryToTemplate(
        query,
        curveTemplate.displayName,
        curveTemplate.aliases,
        curveTemplate.id
      );

      return {
        curveTemplate,
        family,
        score: matched.score,
        reason: query ? matched.reason : 'fallback',
        matchedAlias: matched.matchedAlias
      };
    })
    .filter((item) => !query || item.score > 0)
    .sort((left, right) =>
      compareRecommendationScore(
        left.score,
        right.score,
        left.curveTemplate.displayName,
        right.curveTemplate.displayName
      )
    );

  return typeof limit === 'number' ? recommendations.slice(0, limit) : recommendations;
}

export function findCurveTemplatesForTestProject(
  testProject: string,
  resolvedLibrary: ResolvedTemplateLibrary,
  options: FindCurveTemplatesOptions = {}
): CurveTemplateRecommendation[] {
  const familyRecommendations = findScientificFamiliesForTestProject(testProject, resolvedLibrary);
  const curveMap = new Map<string, CurveTemplateRecommendation>();

  for (const familyRecommendation of familyRecommendations) {
    const familyCurveRecommendations = findCurveTemplatesForFamily(
      familyRecommendation.family.id,
      resolvedLibrary,
      {
        includeDisabled: options.includeDisabled,
        query: options.query
      }
    );

    for (const curveRecommendation of familyCurveRecommendations) {
      const score =
        familyRecommendation.score +
        curveRecommendation.score +
        (familyRecommendation.score > 0 ? 20 : 0);
      const existing = curveMap.get(curveRecommendation.curveTemplate.id);

      if (!existing || score > existing.score) {
        curveMap.set(curveRecommendation.curveTemplate.id, {
          curveTemplate: curveRecommendation.curveTemplate,
          family: familyRecommendation.family,
          score,
          reason:
            curveRecommendation.reason !== 'fallback'
              ? curveRecommendation.reason
              : familyRecommendation.reason !== 'fallback'
                ? 'family'
                : 'fallback',
          matchedAlias: curveRecommendation.matchedAlias || familyRecommendation.matchedAlias
        });
      }
    }
  }

  const recommendations = Array.from(curveMap.values()).sort((left, right) =>
    compareRecommendationScore(
      left.score,
      right.score,
      left.curveTemplate.displayName,
      right.curveTemplate.displayName
    )
  );

  const source = recommendations.length
    ? recommendations
    : findCurveTemplatesForFamily('', resolvedLibrary, options);

  return typeof options.limit === 'number' && options.limit > 0
    ? source.slice(0, options.limit)
    : source;
}

export function getTemplateApplicationPreview(
  curveTemplate: StructuredCurveTemplate,
  resolvedLibrary: ResolvedTemplateLibrary
): TemplateApplicationPreview {
  const family = resolvedLibrary.scientificTemplates.find((item) => item.id === curveTemplate.familyId);
  const importParsingTemplate = curveTemplate.importParsingTemplateId
    ? resolvedLibrary.importParsingTemplates.find(
        (item) => item.id === curveTemplate.importParsingTemplateId
      )
    : undefined;

  return {
    curveTemplateId: curveTemplate.id,
    familyId: curveTemplate.familyId,
    familyDisplayName: family?.displayName,
    displayName: curveTemplate.displayName,
    blockTitleDefault: curveTemplate.blockTitleDefault,
    purposeType: curveTemplate.purposeType,
    axisDefaults: curveTemplate.axisDefaults,
    recommendedConditions: curveTemplate.recommendedConditions,
    recommendedMetrics: curveTemplate.recommendedMetrics,
    importParsingTemplate,
    reason: importParsingTemplate
      ? 'linked import parsing template available'
      : 'no import parsing template linked'
  };
}

export function upsertUserTemplateState(
  state: TemplateLibraryState,
  payload: UpsertUserTemplatePayload
) {
  const normalizedState = normalizeTemplateLibraryState(state);
  const nextState = normalizeTemplateLibraryState(normalizedState);
  const now = new Date().toISOString();

  if (payload.templateType === 'scientific') {
    const normalizedTemplate = normalizeScientificTestTemplate(
      {
        ...payload.template,
        updatedAt: now,
        createdAt: payload.template.createdAt || now
      },
      'user'
    );
    if (!normalizedTemplate) {
      return nextState;
    }

    nextState.userTemplates.scientificTemplates = [
      ...nextState.userTemplates.scientificTemplates.filter((item) => item.id !== normalizedTemplate.id),
      normalizedTemplate
    ];
  } else if (payload.templateType === 'curve') {
    const normalizedTemplate = normalizeStructuredCurveTemplate(
      {
        ...payload.template,
        updatedAt: now,
        createdAt: payload.template.createdAt || now
      },
      'user'
    );
    if (!normalizedTemplate) {
      return nextState;
    }

    nextState.userTemplates.curveTemplates = [
      ...nextState.userTemplates.curveTemplates.filter((item) => item.id !== normalizedTemplate.id),
      normalizedTemplate
    ];
  } else {
    const normalizedTemplate = normalizeImportParsingTemplate(
      {
        ...payload.template,
        updatedAt: now,
        createdAt: payload.template.createdAt || now
      },
      'user'
    );
    if (!normalizedTemplate) {
      return nextState;
    }

    nextState.userTemplates.importParsingTemplates = [
      ...nextState.userTemplates.importParsingTemplates.filter((item) => item.id !== normalizedTemplate.id),
      normalizedTemplate
    ];
  }

  nextState.updatedAt = now;
  return normalizeTemplateLibraryState(nextState);
}

export function upsertTemplateOverrideState(
  state: TemplateLibraryState,
  override: TemplateOverride
) {
  const normalizedState = normalizeTemplateLibraryState(state);
  const normalizedOverride = normalizeTemplateOverride({
    ...override,
    patch: sanitizeTemplateOverridePatch(override.targetType, override.patch || {}),
    updatedAt: override.updatedAt || new Date().toISOString()
  });

  if (!normalizedOverride) {
    return normalizedState;
  }

  const nextState = normalizeTemplateLibraryState({
    ...normalizedState,
    userOverrides: [
      ...normalizedState.userOverrides.filter(
        (item) =>
          item.targetId !== normalizedOverride.targetId || item.targetType !== normalizedOverride.targetType
      ),
      normalizedOverride
    ],
    updatedAt: new Date().toISOString()
  });

  return nextState;
}

export function removeTemplateOverrideState(
  state: TemplateLibraryState,
  payload: { targetId: string; targetType: TemplateEntityType }
) {
  const normalizedState = normalizeTemplateLibraryState(state);
  const nextOverrides = normalizedState.userOverrides.filter(
    (item) => item.targetId !== payload.targetId || item.targetType !== payload.targetType
  );

  if (nextOverrides.length === normalizedState.userOverrides.length) {
    return normalizedState;
  }

  return normalizeTemplateLibraryState({
    ...normalizedState,
    userOverrides: nextOverrides,
    updatedAt: new Date().toISOString()
  });
}

export function setTemplateEnabledState(
  state: TemplateLibraryState,
  payload: SetTemplateEnabledPayload
) {
  const normalizedState = normalizeTemplateLibraryState(state);
  const templateId = normalizeTemplateId(payload.templateId);
  const disabledIds = new Set(normalizedState.disabledTemplateIds);

  if (!templateId) {
    return normalizedState;
  }

  if (payload.enabled) {
    disabledIds.delete(templateId);
  } else {
    disabledIds.add(templateId);
  }

  return normalizeTemplateLibraryState({
    ...normalizedState,
    disabledTemplateIds: Array.from(disabledIds),
    updatedAt: new Date().toISOString()
  });
}

export function buildTemplateMemoryCandidates(
  memories: ImportMemory[],
  query: TemplateMemoryMatchQuery
): TemplateMemoryMatchCandidate[] {
  const normalizedTestProject = normalizeBlockName(query.testProject);
  const normalizedBlockName = normalizeBlockName(query.blockName);
  const normalizedPurposeType = normalizePurposeType(query.purposeType);
  const normalizedFileExtension = normalizeFileExtension(query.fileExtension);
  const genericBlockName = isGenericStructuredBlockName(query.blockName);

  if (!normalizedPurposeType) {
    return [];
  }

  const candidates: TemplateMemoryMatchCandidate[] = [];

  for (const memory of memories) {
    const samePurposeType = memory.purposeType === normalizedPurposeType;
    if (!samePurposeType) {
      continue;
    }

    const sameTestProject =
      normalizedTestProject && normalizeBlockName(memory.testProject) === normalizedTestProject;
    const sameBlockName =
      !genericBlockName &&
      normalizedBlockName &&
      memory.normalizedBlockName === normalizedBlockName;
    const sameExtension =
      normalizedFileExtension && normalizeFileExtension(memory.fileExtension) === normalizedFileExtension;

    if (sameTestProject && sameBlockName && sameExtension) {
      candidates.push({
        memory,
        score: 100,
        matchLevel: 1,
        reason: 'testProject+blockName+purposeType+fileExtension'
      });
      continue;
    }

    if (sameTestProject && sameBlockName) {
      candidates.push({
        memory,
        score: 90,
        matchLevel: 2,
        reason: 'testProject+blockName+purposeType'
      });
      continue;
    }

    if (sameBlockName && sameExtension) {
      candidates.push({
        memory,
        score: 80,
        matchLevel: 3,
        reason: 'blockName+purposeType+fileExtension'
      });
      continue;
    }

    if (sameBlockName) {
      candidates.push({
        memory,
        score: 70,
        matchLevel: 4,
        reason: 'blockName+purposeType'
      });
      continue;
    }

    if (sameExtension) {
      candidates.push({
        memory,
        score: 50,
        matchLevel: 5,
        reason: 'purposeType+fileExtension'
      });
      continue;
    }

    candidates.push({
      memory,
      score: 40,
      matchLevel: 6,
      reason: 'purposeType'
    });
  }

  return candidates;
}

export function rankTemplateMemoryMatches(candidates: TemplateMemoryMatchCandidate[]) {
  return [...candidates].sort((left, right) => {
    if (left.matchLevel !== right.matchLevel) {
      return left.matchLevel - right.matchLevel;
    }

    const leftGeneric = isGenericStructuredBlockName(left.memory.blockName);
    const rightGeneric = isGenericStructuredBlockName(right.memory.blockName);
    if (leftGeneric !== rightGeneric) {
      return leftGeneric ? 1 : -1;
    }

    if (right.memory.usageCount !== left.memory.usageCount) {
      return right.memory.usageCount - left.memory.usageCount;
    }

    const leftTime = Date.parse(left.memory.lastUsedAt);
    const rightTime = Date.parse(right.memory.lastUsedAt);
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

export function pruneTemplateMemories(memories: ImportMemory[]) {
  const dedupedById = new Map<string, ImportMemory>();

  for (const memory of memories) {
    dedupedById.set(memory.id, memory);
  }

  return Array.from(dedupedById.values())
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount;
      }

      const leftTime = Date.parse(left.lastUsedAt);
      const rightTime = Date.parse(right.lastUsedAt);
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    })
    .slice(0, MAX_IMPORT_MEMORIES);
}

export function upsertImportMemoryState(
  state: TemplateLibraryState,
  payload: {
    testProject?: string;
    familyId?: string;
    curveTemplateId?: string;
    blockName: string;
    normalizedBlockName?: string;
    purposeType: StructuredBlockPurpose;
    fileExtension?: string;
    importParsingSettings: ImportParsingSettingsSnapshot;
    axisDefaults?: AxisDefaults;
  }
) {
  const normalizedState = normalizeTemplateLibraryState(state);
  const now = new Date().toISOString();
  const memoryId = buildImportMemoryId(payload);
  const existing = normalizedState.importMemories.find((item) => item.id === memoryId);
  const normalizedMemory = normalizeImportMemory({
    ...payload,
    id: memoryId,
    createdAt: existing?.createdAt || now,
    lastUsedAt: now,
    usageCount: (existing?.usageCount || 0) + 1
  });

  if (!normalizedMemory) {
    return normalizedState;
  }

  return normalizeTemplateLibraryState({
    ...normalizedState,
    importMemories: pruneTemplateMemories([
      ...normalizedState.importMemories.filter((item) => item.id !== normalizedMemory.id),
      normalizedMemory
    ]),
    updatedAt: now
  });
}

export function pruneRecentCurveNames(recentCurveNames: RecentCurveNames): RecentCurveNames {
  const normalized = normalizeRecentCurveNames(recentCurveNames);
  const byPurpose: Record<string, string[]> = {};

  for (const [purposeType, names] of Object.entries(normalized.byPurpose)) {
    byPurpose[purposeType] = pruneStringList(names, MAX_RECENT_CURVE_NAMES);
  }

  return {
    global: pruneStringList(normalized.global, MAX_RECENT_CURVE_NAMES),
    byPurpose
  };
}
