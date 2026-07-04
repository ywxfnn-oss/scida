import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  DeleteUserTemplatePayload,
  ResolvedTemplateLibrary,
  SetTemplateEnabledPayload,
  TemplateLibraryState,
  TemplateOverride,
  UpsertImportMemoryPayload,
  UpsertUserTemplatePayload
} from '../electron-api';
import { deleteSetting, getSettingValue, upsertSetting } from './auth-settings';
import { DEFAULT_TEMPLATE_LIBRARY } from '../shared/default-template-library';
import {
  createEmptyTemplateLibraryState,
  deleteUserTemplateState,
  normalizeBlockName,
  normalizeTemplateLibraryState,
  normalizeTemplateId,
  removeTemplateOverrideState,
  resolveTemplateLibrary,
  setTemplateEnabledState,
  upsertImportMemoryState,
  upsertTemplateOverrideState,
  upsertUserTemplateState
} from '../shared/template-library-helpers';

export const TEMPLATE_LIBRARY_SETTING_KEY = 'templateLibrary:v1';
const LEGACY_TEST_TYPE_DICTIONARY_SETTING_KEY = 'dictionary:testProject';

function parseLegacyActiveTestTypeValues(rawValue: string): string[] {
  if (!rawValue.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed.flatMap((entry) => {
          if (!entry || typeof entry !== 'object') {
            return [];
          }

          const candidate = entry as Record<string, unknown>;
          const value = typeof candidate.value === 'string' ? candidate.value.trim() : '';
          const isActive = candidate.isActive === true;
          return value && isActive ? [value] : [];
        })
      )
    );
  } catch (error) {
    console.error('parse legacy testProject dictionary failed:', error);
    return [];
  }
}

function createLegacyScientificTemplateId(value: string, usedIds: Set<string>) {
  const baseId = `user:family:legacy:${normalizeTemplateId(value) || 'legacy-test-type'}`;
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let index = 2;
  while (usedIds.has(`${baseId}-${index}`)) {
    index += 1;
  }

  const nextId = `${baseId}-${index}`;
  usedIds.add(nextId);
  return nextId;
}

async function migrateLegacyTestProjectDictionaryToTemplateLibrary(
  prisma: PrismaClient,
  state: TemplateLibraryState
): Promise<{ state: TemplateLibraryState; consumedLegacyValues: boolean }> {
  const rawLegacyDictionary = await getSettingValue(prisma, LEGACY_TEST_TYPE_DICTIONARY_SETTING_KEY, '');
  const legacyValues = parseLegacyActiveTestTypeValues(rawLegacyDictionary);
  if (!legacyValues.length) {
    return { state, consumedLegacyValues: false };
  }

  const resolvedLibrary = resolveTemplateLibrary(DEFAULT_TEMPLATE_LIBRARY, state);
  const knownNames = new Set<string>();
  const usedIds = new Set<string>(resolvedLibrary.scientificTemplates.map((family) => family.id));

  resolvedLibrary.scientificTemplates.forEach((family) => {
    knownNames.add(normalizeBlockName(family.displayName));
    knownNames.add(normalizeBlockName(family.id));
    family.aliases.forEach((alias) => {
      knownNames.add(normalizeBlockName(alias.value));
    });
  });

  const nextScientificTemplates = [...state.userTemplates.scientificTemplates];
  const now = new Date().toISOString();
  let changed = false;

  legacyValues.forEach((value) => {
    const normalizedValue = normalizeBlockName(value);
    if (!normalizedValue || knownNames.has(normalizedValue)) {
      return;
    }

    changed = true;
    knownNames.add(normalizedValue);
    nextScientificTemplates.push({
      id: createLegacyScientificTemplateId(value, usedIds),
      version: 1,
      displayName: value,
      aliases: [{ value, kind: 'legacy' }],
      enabled: true,
      sourceType: 'user',
      createdAt: now,
      updatedAt: now
    });
  });

  if (!changed) {
    return { state, consumedLegacyValues: true };
  }

  return {
    state: normalizeTemplateLibraryState({
      ...state,
      userTemplates: {
        ...state.userTemplates,
        scientificTemplates: nextScientificTemplates
      },
      updatedAt: now
    }),
    consumedLegacyValues: true
  };
}

async function writeTemplateLibraryState(prisma: PrismaClient, state: TemplateLibraryState) {
  const normalizedState = normalizeTemplateLibraryState({
    ...state,
    updatedAt: new Date().toISOString()
  });

  await upsertSetting(prisma, TEMPLATE_LIBRARY_SETTING_KEY, JSON.stringify(normalizedState));
  return normalizedState;
}

export async function getTemplateLibraryState(prisma: PrismaClient): Promise<TemplateLibraryState> {
  const savedValue = await getSettingValue(prisma, TEMPLATE_LIBRARY_SETTING_KEY, '');

  if (!savedValue.trim()) {
    return createEmptyTemplateLibraryState();
  }

  try {
    return normalizeTemplateLibraryState(JSON.parse(savedValue));
  } catch (error) {
    console.error('parse template library state failed:', error);
    return createEmptyTemplateLibraryState();
  }
}

export async function saveTemplateLibraryState(
  prisma: PrismaClient,
  state: TemplateLibraryState
): Promise<ActionResult> {
  await writeTemplateLibraryState(prisma, state);
  return { success: true };
}

export async function getResolvedTemplateLibrary(
  prisma: PrismaClient
): Promise<ResolvedTemplateLibrary> {
  const state = await getTemplateLibraryState(prisma);
  const migrationResult = await migrateLegacyTestProjectDictionaryToTemplateLibrary(prisma, state);
  const migratedState = migrationResult.state;

  if (migratedState !== state) {
    await writeTemplateLibraryState(prisma, migratedState);
  }

  if (migrationResult.consumedLegacyValues) {
    await deleteSetting(prisma, LEGACY_TEST_TYPE_DICTIONARY_SETTING_KEY);
  }

  return resolveTemplateLibrary(DEFAULT_TEMPLATE_LIBRARY, migratedState);
}

export async function upsertTemplateLibraryOverride(
  prisma: PrismaClient,
  override: TemplateOverride
): Promise<ActionResult> {
  const state = await getTemplateLibraryState(prisma);
  const nextState = upsertTemplateOverrideState(state, override);
  await writeTemplateLibraryState(prisma, nextState);
  return { success: true };
}

export async function resetTemplateLibraryOverride(
  prisma: PrismaClient,
  payload: { targetId: string; targetType: TemplateOverride['targetType'] }
): Promise<ActionResult> {
  const state = await getTemplateLibraryState(prisma);
  const nextState = removeTemplateOverrideState(state, payload);
  await writeTemplateLibraryState(prisma, nextState);
  return { success: true };
}

export async function upsertUserTemplate(
  prisma: PrismaClient,
  payload: UpsertUserTemplatePayload
): Promise<ActionResult> {
  const state = await getTemplateLibraryState(prisma);
  const nextState = upsertUserTemplateState(state, payload);
  await writeTemplateLibraryState(prisma, nextState);
  return { success: true };
}

export async function deleteUserTemplate(
  prisma: PrismaClient,
  payload: DeleteUserTemplatePayload
): Promise<ActionResult> {
  const state = await getTemplateLibraryState(prisma);
  const nextState = deleteUserTemplateState(state, payload);
  await writeTemplateLibraryState(prisma, nextState);
  return { success: true };
}

export async function recordTemplateImportMemory(
  prisma: PrismaClient,
  payload: UpsertImportMemoryPayload
): Promise<ResolvedTemplateLibrary> {
  const state = await getTemplateLibraryState(prisma);
  const nextState = upsertImportMemoryState(state, payload);
  await writeTemplateLibraryState(prisma, nextState);
  return resolveTemplateLibrary(DEFAULT_TEMPLATE_LIBRARY, nextState);
}

export async function setTemplateEnabled(
  prisma: PrismaClient,
  payload: SetTemplateEnabledPayload
): Promise<ActionResult> {
  const state = await getTemplateLibraryState(prisma);
  const nextState = setTemplateEnabledState(state, payload);
  await writeTemplateLibraryState(prisma, nextState);
  return { success: true };
}

export async function clearTemplateLibraryUserState(
  prisma: PrismaClient
): Promise<ActionResult> {
  await deleteSetting(prisma, TEMPLATE_LIBRARY_SETTING_KEY);
  return { success: true };
}
