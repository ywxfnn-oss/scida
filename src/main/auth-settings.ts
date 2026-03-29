import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  AppBootstrapState,
  AppSettings,
  AuthenticatePayload,
  CompleteOnboardingPayload,
  SaveAppSettingsPayload
} from '../electron-api';

const PASSWORD_HASH_PREFIX = 'scrypt';
const ONBOARDING_STATE_SETTING_KEY = 'onboardingStateV1';
const LEGACY_USER_SETTING_KEYS = [
  'storageRoot',
  'loginUsername',
  'loginPasswordHash',
  'loginPassword'
] as const;

type AuthSettingsOptions = {
  defaultLoginUsername: string;
  defaultLoginPassword: string;
  appVersion?: string;
  getDefaultStorageRoot: () => string;
  ensureDir: (dirPath: string) => void;
};

type StoredOnboardingState = {
  status: 'completed';
  licensePrivacyAcceptedAt: string;
  completedAt: string;
  completedByVersion: string;
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, savedKey] = storedHash.split(':');

  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !savedKey) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, 64).toString('hex');

  return timingSafeEqual(
    Buffer.from(savedKey, 'hex'),
    Buffer.from(derivedKey, 'hex')
  );
}

function normalizeStoredValue(value: string | null | undefined) {
  return value?.trim() || '';
}

function parseCompletedOnboardingState(value: string) {
  if (!value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredOnboardingState>;

    if (
      parsed.status !== 'completed' ||
      !normalizeStoredValue(parsed.licensePrivacyAcceptedAt) ||
      !normalizeStoredValue(parsed.completedAt)
    ) {
      return null;
    }

    return {
      status: 'completed' as const,
      licensePrivacyAcceptedAt: normalizeStoredValue(parsed.licensePrivacyAcceptedAt),
      completedAt: normalizeStoredValue(parsed.completedAt),
      completedByVersion: normalizeStoredValue(parsed.completedByVersion)
    };
  } catch (error) {
    console.error('parse onboarding state failed:', error);
    return null;
  }
}

function validateStorageRoot(storageRootInput: string, ensureDir: (dirPath: string) => void) {
  const trimmedStorageRoot = storageRootInput.trim();

  if (!trimmedStorageRoot) {
    throw new Error('请填写原始文件根目录');
  }

  const storageRoot = path.resolve(trimmedStorageRoot);

  ensureDir(storageRoot);

  const stat = fs.statSync(storageRoot);
  if (!stat.isDirectory()) {
    throw new Error('原始文件根目录必须是文件夹');
  }

  fs.accessSync(storageRoot, fs.constants.R_OK | fs.constants.W_OK);
  return storageRoot;
}

async function getStoredSettingValue(
  prisma: PrismaClient,
  key: string
) {
  const record = await prisma.appSetting.findUnique({
    where: { settingKey: key }
  });

  return normalizeStoredValue(record?.settingValue);
}

async function hasLegacyUserData(prisma: PrismaClient) {
  const settingRows = await prisma.appSetting.findMany({
    where: {
      settingKey: {
        in: [...LEGACY_USER_SETTING_KEYS]
      }
    },
    select: {
      settingValue: true
    }
  });

  if (settingRows.some((row) => normalizeStoredValue(row.settingValue))) {
    return true;
  }

  return (await prisma.experiment.count()) > 0;
}

export async function getSettingValue(
  prisma: PrismaClient,
  key: string,
  fallbackValue: string
) {
  const record = await prisma.appSetting.findUnique({
    where: { settingKey: key }
  });

  return record?.settingValue || fallbackValue;
}

export async function upsertSetting(
  prisma: PrismaClient,
  key: string,
  value: string
) {
  return prisma.appSetting.upsert({
    where: { settingKey: key },
    update: { settingValue: value },
    create: {
      settingKey: key,
      settingValue: value
    }
  });
}

export async function deleteSetting(
  prisma: PrismaClient,
  key: string
) {
  return prisma.appSetting.deleteMany({
    where: { settingKey: key }
  });
}

export async function getAppSettingsForRenderer(
  prisma: PrismaClient,
  options: AuthSettingsOptions
): Promise<AppSettings> {
  return {
    storageRoot: await getSettingValue(
      prisma,
      'storageRoot',
      options.getDefaultStorageRoot()
    ),
    loginUsername: await getSettingValue(
      prisma,
      'loginUsername',
      options.defaultLoginUsername
    )
  };
}

export async function getAppBootstrapState(
  prisma: PrismaClient,
  options: AuthSettingsOptions
): Promise<AppBootstrapState> {
  const [appSettings, onboardingState, legacyUserData] = await Promise.all([
    getAppSettingsForRenderer(prisma, options),
    getStoredSettingValue(prisma, ONBOARDING_STATE_SETTING_KEY),
    hasLegacyUserData(prisma)
  ]);

  return {
    requiresOnboarding: !parseCompletedOnboardingState(onboardingState) && !legacyUserData,
    appSettings
  };
}

export async function verifyLogin(
  prisma: PrismaClient,
  payload: AuthenticatePayload,
  options: AuthSettingsOptions
): Promise<ActionResult> {
  const username = payload.username.trim();

  if (!username || !payload.password) {
    return { success: false, error: '请输入账号和密码' };
  }

  const bootstrapState = await getAppBootstrapState(prisma, options);

  if (bootstrapState.requiresOnboarding) {
    return { success: false, error: '请先完成首次初始化' };
  }

  const savedUsername = await getStoredSettingValue(prisma, 'loginUsername');
  const savedPasswordHash = await getStoredSettingValue(prisma, 'loginPasswordHash');

  if (!savedUsername || !savedPasswordHash) {
    return { success: false, error: '系统尚未配置登录账号，请先完成初始化' };
  }

  if (username !== savedUsername || !verifyPassword(payload.password, savedPasswordHash)) {
    return { success: false, error: '账号或密码错误' };
  }

  return { success: true };
}

export async function completeOnboarding(
  prisma: PrismaClient,
  payload: CompleteOnboardingPayload,
  options: AuthSettingsOptions
): Promise<ActionResult> {
  if (!payload.acceptedLicense || !payload.acceptedPrivacy) {
    return { success: false, error: '请先确认许可与隐私说明' };
  }

  const storageRoot = validateStorageRoot(payload.storageRoot, options.ensureDir);
  const loginUsername = payload.loginUsername.trim();
  const password = payload.password;

  if (!loginUsername) {
    return { success: false, error: '请填写本地管理员账号' };
  }

  if (password.length < 6) {
    return { success: false, error: '密码长度至少为 6 位' };
  }

  const completedAt = new Date().toISOString();
  const passwordHash = hashPassword(password);
  const onboardingState: StoredOnboardingState = {
    status: 'completed',
    licensePrivacyAcceptedAt: completedAt,
    completedAt,
    completedByVersion: options.appVersion || ''
  };

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { settingKey: 'storageRoot' },
      update: { settingValue: storageRoot },
      create: {
        settingKey: 'storageRoot',
        settingValue: storageRoot
      }
    }),
    prisma.appSetting.upsert({
      where: { settingKey: 'loginUsername' },
      update: { settingValue: loginUsername },
      create: {
        settingKey: 'loginUsername',
        settingValue: loginUsername
      }
    }),
    prisma.appSetting.upsert({
      where: { settingKey: 'loginPasswordHash' },
      update: { settingValue: passwordHash },
      create: {
        settingKey: 'loginPasswordHash',
        settingValue: passwordHash
      }
    }),
    prisma.appSetting.upsert({
      where: { settingKey: ONBOARDING_STATE_SETTING_KEY },
      update: { settingValue: JSON.stringify(onboardingState) },
      create: {
        settingKey: ONBOARDING_STATE_SETTING_KEY,
        settingValue: JSON.stringify(onboardingState)
      }
    }),
    prisma.appSetting.deleteMany({
      where: { settingKey: 'loginPassword' }
    })
  ]);

  return { success: true };
}

export async function saveAppSettings(
  prisma: PrismaClient,
  payload: SaveAppSettingsPayload,
  options: AuthSettingsOptions
): Promise<ActionResult> {
  options.ensureDir(payload.storageRoot);

  await upsertSetting(prisma, 'storageRoot', payload.storageRoot);
  await upsertSetting(prisma, 'loginUsername', payload.loginUsername);

  if (payload.newPassword) {
    await upsertSetting(
      prisma,
      'loginPasswordHash',
      hashPassword(payload.newPassword)
    );
  }

  await deleteSetting(prisma, 'loginPassword');

  return { success: true };
}
