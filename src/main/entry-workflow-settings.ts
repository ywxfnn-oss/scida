import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  ActiveEntryDraft,
  EntryDraftDataItem,
  EntryDraftDynamicField,
  EntryDraftTemplateBlock,
  RecentEntrySuggestions,
  SaveActiveEntryDraftPayload
} from '../electron-api';
import { deleteSetting, getSettingValue, upsertSetting } from './auth-settings';
import { listDictionaryItems } from './dictionary-settings';

const ACTIVE_ENTRY_DRAFT_SETTING_KEY = 'entryWorkflow:activeDraftV1';
const MAX_RECENT_ENTRY_SUGGESTIONS = 8;
const TEMPLATE_TYPES = new Set(['xy', 'spectrum']);
const DRAFT_SOURCES = new Set(['new', 'copied-record']);
const DRAFT_RESUME_STEPS = new Set(['step1', 'step2']);
const SCALAR_ROLES = new Set(['condition', 'metric']);

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDraftDynamicField(value: unknown): EntryDraftDynamicField | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  return {
    id: normalizeText(candidate.id) || randomUUID(),
    name: normalizeText(candidate.name),
    value: normalizeText(candidate.value)
  };
}

function normalizeDraftDataItem(value: unknown): EntryDraftDataItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const scalarRole = normalizeText(candidate.scalarRole);

  return {
    id: normalizeText(candidate.id) || randomUUID(),
    scalarRole: SCALAR_ROLES.has(scalarRole) ? (scalarRole as EntryDraftDataItem['scalarRole']) : undefined,
    itemName: normalizeText(candidate.itemName),
    itemValue: normalizeText(candidate.itemValue),
    itemUnit: normalizeText(candidate.itemUnit),
    sourceFileName: normalizeText(candidate.sourceFileName),
    sourceFilePath: normalizeText(candidate.sourceFilePath),
    originalFileName: normalizeText(candidate.originalFileName),
    originalFilePath: normalizeText(candidate.originalFilePath)
  };
}

function normalizeDraftTemplateBlock(value: unknown): EntryDraftTemplateBlock | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const templateType = normalizeText(candidate.templateType);
  const purposeType = normalizeText(candidate.purposeType);

  if (!TEMPLATE_TYPES.has(templateType)) {
    return null;
  }

  return {
    id: normalizeText(candidate.id) || randomUUID(),
    templateType: templateType as EntryDraftTemplateBlock['templateType'],
    purposeType: purposeType ? (purposeType as EntryDraftTemplateBlock['purposeType']) : undefined,
    blockTitle: normalizeText(candidate.blockTitle),
    primaryLabel: normalizeText(candidate.primaryLabel),
    primaryUnit: normalizeText(candidate.primaryUnit),
    secondaryLabel: normalizeText(candidate.secondaryLabel),
    secondaryUnit: normalizeText(candidate.secondaryUnit),
    dataText: typeof candidate.dataText === 'string' ? candidate.dataText : '',
    note: normalizeText(candidate.note),
    sourceFileName: normalizeText(candidate.sourceFileName),
    sourceFilePath: normalizeText(candidate.sourceFilePath),
    originalFileName: normalizeText(candidate.originalFileName),
    originalFilePath: normalizeText(candidate.originalFilePath)
  };
}

function normalizeActiveEntryDraft(value: unknown): ActiveEntryDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const source = normalizeText(candidate.source);
  const resumeStep = normalizeText(candidate.resumeStep);
  const step1 = candidate.step1 && typeof candidate.step1 === 'object'
    ? (candidate.step1 as Record<string, unknown>)
    : null;

  if (!DRAFT_SOURCES.has(source) || !DRAFT_RESUME_STEPS.has(resumeStep) || !step1) {
    return null;
  }

  const createdAt = normalizeText(candidate.createdAt);
  const updatedAt = normalizeText(candidate.updatedAt);
  const originExperimentId = Number(candidate.originExperimentId);

  return {
    source: source as ActiveEntryDraft['source'],
    originExperimentId:
      Number.isInteger(originExperimentId) && originExperimentId > 0 ? originExperimentId : undefined,
    originDisplayName: normalizeText(candidate.originDisplayName) || undefined,
    resumeStep: resumeStep as ActiveEntryDraft['resumeStep'],
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
    step1: {
      testProject: normalizeText(step1.testProject),
      sampleCode: normalizeText(step1.sampleCode),
      tester: normalizeText(step1.tester),
      instrument: normalizeText(step1.instrument),
      testTime: typeof step1.testTime === 'string' ? step1.testTime : '',
      sampleOwner: normalizeText(step1.sampleOwner),
      dynamicFields: Array.isArray(step1.dynamicFields)
        ? step1.dynamicFields
            .map((field) => normalizeDraftDynamicField(field))
            .filter((field): field is EntryDraftDynamicField => Boolean(field))
        : []
    },
    step2: Array.isArray(candidate.step2)
      ? candidate.step2
          .map((item) => normalizeDraftDataItem(item))
          .filter((item): item is EntryDraftDataItem => Boolean(item))
      : [],
    templateBlocks: Array.isArray(candidate.templateBlocks)
      ? candidate.templateBlocks
          .map((block) => normalizeDraftTemplateBlock(block))
          .filter((block): block is EntryDraftTemplateBlock => Boolean(block))
      : []
  };
}

function buildSerializedDraft(
  payload: SaveActiveEntryDraftPayload,
  existingDraft: ActiveEntryDraft | null
) {
  const normalizedDraft = normalizeActiveEntryDraft({
    ...payload,
    createdAt: existingDraft?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return normalizedDraft ? JSON.stringify(normalizedDraft) : '';
}

export async function getActiveEntryDraft(prisma: PrismaClient): Promise<ActiveEntryDraft | null> {
  const storedValue = await getSettingValue(prisma, ACTIVE_ENTRY_DRAFT_SETTING_KEY, '');
  if (!storedValue.trim()) {
    return null;
  }

  try {
    return normalizeActiveEntryDraft(JSON.parse(storedValue));
  } catch (error) {
    console.error('parse active entry draft failed:', error);
    return null;
  }
}

export async function saveActiveEntryDraft(
  prisma: PrismaClient,
  payload: SaveActiveEntryDraftPayload
): Promise<ActionResult> {
  const existingDraft = await getActiveEntryDraft(prisma);
  const serialized = buildSerializedDraft(payload, existingDraft);

  if (!serialized) {
    return { success: false, error: '保存草稿失败，请检查草稿内容后重试' };
  }

  await upsertSetting(prisma, ACTIVE_ENTRY_DRAFT_SETTING_KEY, serialized);
  return { success: true };
}

export async function discardActiveEntryDraft(prisma: PrismaClient): Promise<ActionResult> {
  await deleteSetting(prisma, ACTIVE_ENTRY_DRAFT_SETTING_KEY);
  return { success: true };
}

function collectRecentValues(
  rows: Array<{ testProject: string; instrument: string }>,
  allowedValues: Set<string>,
  key: 'testProject' | 'instrument'
) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const row of rows) {
    const candidate = normalizeText(row[key]);
    if (!candidate || seen.has(candidate) || !allowedValues.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    values.push(candidate);

    if (values.length >= MAX_RECENT_ENTRY_SUGGESTIONS) {
      break;
    }
  }

  return values;
}

export async function getRecentEntrySuggestions(
  prisma: PrismaClient
): Promise<RecentEntrySuggestions> {
  const [dictionaryItems, experiments] = await Promise.all([
    listDictionaryItems(prisma),
    prisma.experiment.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        testProject: true,
        instrument: true
      },
      take: 200
    })
  ]);

  const allowedProjects = new Set(
    dictionaryItems.testProject.filter((item) => item.isActive).map((item) => item.value)
  );
  const allowedInstruments = new Set(
    dictionaryItems.instrument.filter((item) => item.isActive).map((item) => item.value)
  );

  return {
    testProjects: collectRecentValues(experiments, allowedProjects, 'testProject'),
    instruments: collectRecentValues(experiments, allowedInstruments, 'instrument')
  };
}
