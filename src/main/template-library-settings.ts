import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
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
  normalizeTemplateLibraryState,
  removeTemplateOverrideState,
  resolveTemplateLibrary,
  setTemplateEnabledState,
  upsertImportMemoryState,
  upsertTemplateOverrideState,
  upsertUserTemplateState
} from '../shared/template-library-helpers';

export const TEMPLATE_LIBRARY_SETTING_KEY = 'templateLibrary:v1';

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
  return resolveTemplateLibrary(DEFAULT_TEMPLATE_LIBRARY, state);
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
