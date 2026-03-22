import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  AppSettings,
  AuthenticatePayload,
  SaveAppSettingsPayload
} from '../electron-api';

const PASSWORD_HASH_PREFIX = 'scrypt';

type AuthSettingsOptions = {
  defaultLoginUsername: string;
  defaultLoginPassword: string;
  getDefaultStorageRoot: () => string;
  ensureDir: (dirPath: string) => void;
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

export async function verifyLogin(
  prisma: PrismaClient,
  payload: AuthenticatePayload,
  options: AuthSettingsOptions
): Promise<ActionResult> {
  const username = payload.username.trim();

  if (!username || !payload.password) {
    return { success: false, error: '请输入账号和密码' };
  }

  const savedUsername = await getSettingValue(
    prisma,
    'loginUsername',
    options.defaultLoginUsername
  );
  const savedPasswordHash = await getSettingValue(
    prisma,
    'loginPasswordHash',
    hashPassword(options.defaultLoginPassword)
  );

  if (username !== savedUsername || !verifyPassword(payload.password, savedPasswordHash)) {
    return { success: false, error: '账号或密码错误' };
  }

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
