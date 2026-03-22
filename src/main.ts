import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import started from 'electron-squirrel-startup';
import type {
  ActionResult,
  AuthenticatePayload,
  CopyFileToStorageResult,
  SaveAppSettingsPayload,
  SaveExperimentPayload,
  SaveExperimentResult,
  UpdateExperimentPayload
} from './electron-api';
import {
  buildManagedTargetPath,
  createManagedBackupPath,
  createManagedTempPath,
  ensureDir,
  fileExists,
  formatExportTimestamp
} from './main/file-helpers';
import {
  exportByItemNames,
  exportFullExperiments,
  getDistinctItemNames
} from './main/export-helpers';
import {
  getAppSettingsForRenderer,
  getSettingValue,
  saveAppSettings,
  verifyLogin
} from './main/auth-settings';

let prisma!: PrismaClient;

const DEFAULT_LOGIN_USERNAME = 'admin';
const DEFAULT_LOGIN_PASSWORD = '123456';
const PASSWORD_HASH_PREFIX = 'scrypt';

type MigrationFile = {
  name: string;
  sql: string;
  checksum: string;
};

type SqliteDatabase = InstanceType<typeof Database>;

type UpdateFilePlan = {
  index: number;
  dataItemId?: number;
  currentSourcePath: string;
  targetPath: string;
  targetFileName: string;
  replacementSourcePath: string;
  replacementOriginalName: string;
  action: 'rename' | 'replace' | 'create';
};

function getDefaultStorageRoot() {
  return path.join(app.getPath('userData'), 'storage', 'raw_files');
}

function getRuntimeDbPath() {
  return path.join(app.getPath('userData'), 'scidata.db');
}

function getBundledDbPath() {
  return path.join(app.getAppPath(), 'dev.db');
}

function getMigrationsDir() {
  return path.join(app.getAppPath(), 'prisma', 'migrations');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey}`;
}

function getMigrationFiles() {
  const migrationsDir = getMigrationsDir();

  if (!fileExists(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const sqlPath = path.join(migrationsDir, entry.name, 'migration.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      return {
        name: entry.name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex')
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function ensureMigrationTable(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    );
  `);
}

function tableExists(db: SqliteDatabase, tableName: string) {
  const row = db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`
    )
    .get(tableName);

  return !!row;
}

function getKnownMigrationTables() {
  return new Map<string, string[]>([
    ['20260313161434_init', ['User']],
    ['20260314023620_add_experiment_tables', ['Experiment', 'ExperimentCustomField', 'ExperimentDataItem']],
    ['20260314035050_add_edit_logs', ['EditLog']],
    ['20260314043854_add_app_settings', ['AppSetting']]
  ]);
}

function markMigrationApplied(db: SqliteDatabase, migration: MigrationFile) {
  db.prepare(
    `
      INSERT INTO "_prisma_migrations" (
        "id",
        "checksum",
        "finished_at",
        "migration_name",
        "logs",
        "rolled_back_at",
        "started_at",
        "applied_steps_count"
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
    `
  ).run(
    randomUUID(),
    migration.checksum,
    String(Date.now()),
    migration.name,
    String(Date.now())
  );
}

function inferExistingMigrations(
  db: SqliteDatabase,
  migrations: MigrationFile[]
) {
  const knownTables = getKnownMigrationTables();

  for (const migration of migrations) {
    const requiredTables = knownTables.get(migration.name);
    if (!requiredTables?.length) continue;

    const allTablesExist = requiredTables.every((tableName) => tableExists(db, tableName));
    if (!allTablesExist) continue;

    const existingRow = db
      .prepare(
        `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = ? LIMIT 1`
      )
      .get(migration.name);

    if (!existingRow) {
      markMigrationApplied(db, migration);
    }
  }
}

function getPendingMigrations(
  db: SqliteDatabase,
  migrations: MigrationFile[]
) {
  ensureMigrationTable(db);
  inferExistingMigrations(db, migrations);

  const appliedRows = db
    .prepare(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`)
    .all() as Array<{ migration_name: string }>;

  const appliedNames = new Set(appliedRows.map((row) => row.migration_name));

  return migrations.filter((migration) => !appliedNames.has(migration.name));
}

function backupRuntimeDb(runtimeDbPath: string) {
  const timestamp = formatExportTimestamp();
  const backupPath = path.join(
    path.dirname(runtimeDbPath),
    `scidata-backup-${timestamp}.db`
  );

  fs.copyFileSync(runtimeDbPath, backupPath);
  return backupPath;
}

function applyPendingMigrations(db: SqliteDatabase, migrations: MigrationFile[]) {
  for (const migration of migrations) {
    const transaction = db.transaction(() => {
      db.exec(migration.sql);
      markMigrationApplied(db, migration);
    });

    transaction();
  }
}

function hasLegacyPasswordSetting(db: SqliteDatabase) {
  if (!tableExists(db, 'AppSetting')) {
    return false;
  }

  const row = db
    .prepare(
      `SELECT settingValue FROM "AppSetting" WHERE settingKey = 'loginPassword' LIMIT 1`
    )
    .get() as { settingValue: string } | undefined;

  return !!row?.settingValue;
}

function ensureSettingValue(
  db: SqliteDatabase,
  key: string,
  value: string
) {
  if (!tableExists(db, 'AppSetting')) {
    return;
  }

  db.prepare(
    `
      INSERT INTO "AppSetting" ("settingKey", "settingValue", "createdAt", "updatedAt")
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT("settingKey") DO UPDATE SET
        "settingValue" = excluded."settingValue",
        "updatedAt" = CURRENT_TIMESTAMP
    `
  ).run(key, value);
}

function removeSettingValue(db: SqliteDatabase, key: string) {
  if (!tableExists(db, 'AppSetting')) {
    return;
  }

  db.prepare(`DELETE FROM "AppSetting" WHERE "settingKey" = ?`).run(key);
}

function runAuthSettingsMigration(db: SqliteDatabase) {
  if (!tableExists(db, 'AppSetting')) {
    return false;
  }

  const loginUsernameRow = db
    .prepare(
      `SELECT settingValue FROM "AppSetting" WHERE settingKey = 'loginUsername' LIMIT 1`
    )
    .get() as { settingValue: string } | undefined;
  const loginPasswordHashRow = db
    .prepare(
      `SELECT settingValue FROM "AppSetting" WHERE settingKey = 'loginPasswordHash' LIMIT 1`
    )
    .get() as { settingValue: string } | undefined;
  const legacyPasswordRow = db
    .prepare(
      `SELECT settingValue FROM "AppSetting" WHERE settingKey = 'loginPassword' LIMIT 1`
    )
    .get() as { settingValue: string } | undefined;

  let changed = false;

  if (!loginUsernameRow?.settingValue) {
    ensureSettingValue(db, 'loginUsername', DEFAULT_LOGIN_USERNAME);
    changed = true;
  }

  if (!loginPasswordHashRow?.settingValue) {
    const passwordToHash = legacyPasswordRow?.settingValue || DEFAULT_LOGIN_PASSWORD;
    ensureSettingValue(db, 'loginPasswordHash', hashPassword(passwordToHash));
    changed = true;
  }

  if (legacyPasswordRow?.settingValue) {
    removeSettingValue(db, 'loginPassword');
    changed = true;
  }

  return changed;
}

function ensureRuntimeDbSeeded(runtimeDbPath: string) {
  if (fileExists(runtimeDbPath)) {
    return;
  }

  const bundledDbPath = getBundledDbPath();
  if (fileExists(bundledDbPath)) {
    fs.copyFileSync(bundledDbPath, runtimeDbPath);
    return;
  }

  fs.closeSync(fs.openSync(runtimeDbPath, 'w'));
}

function prepareRuntimeDatabase(runtimeDbPath: string) {
  const hadExistingRuntimeDb = fileExists(runtimeDbPath);
  ensureRuntimeDbSeeded(runtimeDbPath);

  const db = new Database(runtimeDbPath);
  const migrations = getMigrationFiles();
  const pendingMigrations = getPendingMigrations(db, migrations);
  const needsAuthMigration = hasLegacyPasswordSetting(db);
  const needsDefaultAuthBootstrap =
    tableExists(db, 'AppSetting') &&
    !db
      .prepare(
        `SELECT 1 FROM "AppSetting" WHERE settingKey = 'loginPasswordHash' LIMIT 1`
      )
      .get();

  if ((pendingMigrations.length || needsAuthMigration || needsDefaultAuthBootstrap) && hadExistingRuntimeDb) {
    backupRuntimeDb(runtimeDbPath);
  }

  if (pendingMigrations.length) {
    applyPendingMigrations(db, pendingMigrations);
  }

  runAuthSettingsMigration(db);
  db.close();
}

async function initPrisma() {
  const userDataDir = app.getPath('userData');
  ensureDir(userDataDir);

  const runtimeDbPath = getRuntimeDbPath();
  prepareRuntimeDatabase(runtimeDbPath);

  const adapter = new PrismaBetterSqlite3({
    url: `file:${runtimeDbPath}`
  });

  prisma = new PrismaClient({ adapter });
  await prisma.$connect();
}

if (started) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1100,
    minHeight: 720,
    title: 'SciData Manager',
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[main] window did-finish-load');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[main] window did-fail-load:', errorCode, errorDescription);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

async function findConflictingDataItem(
  targetPath: string,
  excludeDataItemId?: number
) {
  return prisma.experimentDataItem.findFirst({
    where: {
      sourceFilePath: targetPath,
      ...(excludeDataItemId ? { NOT: { id: excludeDataItemId } } : {})
    }
  });
}

async function getManagedTargetConflictError(
  targetPath: string,
  options?: {
    excludeDataItemId?: number;
    currentSourcePath?: string;
  }
) {
  const conflictingItem = await findConflictingDataItem(
    targetPath,
    options?.excludeDataItemId
  );

  if (conflictingItem) {
    return '保存文件名与其他实验记录冲突，请调整后重试';
  }

  if (fileExists(targetPath) && targetPath !== options?.currentSourcePath) {
    return '目标保存文件已存在，无法覆盖，请调整后重试';
  }

  return '';
}

async function deleteExperimentPermanently(experimentId: number): Promise<ActionResult> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      dataItems: true
    }
  });

  if (!experiment) {
    return { success: false, error: '未找到对应实验记录' };
  }

  const savedFilePaths = Array.from(
    new Set(
      experiment.dataItems
        .map((item) => item.sourceFilePath?.trim() || '')
        .filter(Boolean)
    )
  );

  for (const filePath of savedFilePaths) {
    const sharedReferenceCount = await prisma.experimentDataItem.count({
      where: {
        sourceFilePath: filePath,
        experimentId: {
          not: experimentId
        }
      }
    });

    if (sharedReferenceCount > 0) {
      return {
        success: false,
        error: `无法删除：保存文件“${path.basename(filePath)}”仍被其他实验记录引用`
      };
    }
  }

  const deletedFilePaths: string[] = [];

  for (const filePath of savedFilePaths) {
    if (!fileExists(filePath)) {
      continue;
    }

    try {
      fs.rmSync(filePath);
      deletedFilePaths.push(filePath);
    } catch (error) {
      console.error('deleteExperiment file removal failed:', {
        experimentId,
        filePath,
        error
      });

      return {
        success: false,
        error: `删除保存文件失败：${path.basename(filePath)}。实验记录未删除`
      };
    }
  }

  try {
    await prisma.experiment.delete({
      where: { id: experimentId }
    });

    return { success: true };
  } catch (error) {
    console.error('deleteExperiment database removal failed after file deletion:', {
      experimentId,
      deletedFilePaths,
      error
    });

    return {
      success: false,
      error: '保存文件已删除，但数据库记录删除失败，可能需要手动恢复数据'
    };
  }
}

app.whenReady().then(async () => {
  try {
    await initPrisma();
  } catch (error) {
    console.error('initPrisma failed:', error);
    dialog.showErrorBox('数据库初始化失败', String(error));
    app.quit();
    return;
  }

  ipcMain.handle('system:getAppVersion', () => app.getVersion());
  ipcMain.handle('system:getAppName', () => 'SciData Manager');
  ipcMain.handle('auth:authenticate', async (_event, payload: AuthenticatePayload) => {
    try {
      return await verifyLogin(prisma, payload, {
        defaultLoginUsername: DEFAULT_LOGIN_USERNAME,
        defaultLoginPassword: DEFAULT_LOGIN_PASSWORD,
        getDefaultStorageRoot,
        ensureDir
      });
    } catch (error) {
      console.error('authenticate failed:', error);
      return { success: false, error: '登录失败，请稍后重试' };
    }
  });

  ipcMain.handle('settings:getAppSettings', async () => {
    try {
      return await getAppSettingsForRenderer(prisma, {
        defaultLoginUsername: DEFAULT_LOGIN_USERNAME,
        defaultLoginPassword: DEFAULT_LOGIN_PASSWORD,
        getDefaultStorageRoot,
        ensureDir
      });
    } catch (error) {
      console.error('getAppSettings failed:', error);

      return {
        storageRoot: getDefaultStorageRoot(),
        loginUsername: DEFAULT_LOGIN_USERNAME
      };
    }
  });

  ipcMain.handle(
    'settings:saveAppSettings',
    async (_event, payload: SaveAppSettingsPayload): Promise<ActionResult> => {
      try {
        return await saveAppSettings(prisma, payload, {
          defaultLoginUsername: DEFAULT_LOGIN_USERNAME,
          defaultLoginPassword: DEFAULT_LOGIN_PASSWORD,
          getDefaultStorageRoot,
          ensureDir
        });
      } catch (error) {
        console.error('saveAppSettings failed:', error);
        return { success: false, error: '保存设置失败，请检查目录权限' };
      }
    }
  );

  ipcMain.handle('file:selectSourceFile', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择原始文件',
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths.length) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    return {
      originalPath: selectedPath,
      originalName: path.basename(selectedPath)
    };
  });

  ipcMain.handle(
    'file:copyToStorage',
    async (
      _event,
      payload: {
        sourcePath: string;
        testProject: string;
        sampleCode: string;
        tester: string;
        instrument: string;
        testTime: string;
      }
    ): Promise<CopyFileToStorageResult> => {
      try {
        if (!payload.sourcePath || !fileExists(payload.sourcePath)) {
          return { success: false, error: '原始文件不存在或路径无效' };
        }

        const storageRoot = await getSettingValue(
          prisma,
          'storageRoot',
          getDefaultStorageRoot()
        );

        const { targetDir, fileName, fullPath } = buildManagedTargetPath(
          storageRoot,
          payload
        );
        const conflictError = await getManagedTargetConflictError(fullPath);

        if (conflictError) {
          return { success: false, error: conflictError };
        }

        ensureDir(targetDir);

        fs.copyFileSync(payload.sourcePath, fullPath);

        return {
          success: true,
          savedFileName: fileName,
          savedPath: fullPath
        };
      } catch (error) {
        console.error('copyToStorage failed:', error);
        return { success: false, error: '复制文件到存储目录失败' };
      }
    }
  );

  ipcMain.handle(
    'experiment:save',
    async (_event, payload: SaveExperimentPayload): Promise<SaveExperimentResult> => {
      try {
        const experiment = await prisma.experiment.create({
          data: {
            testProject: payload.step1.testProject,
            sampleCode: payload.step1.sampleCode,
            tester: payload.step1.tester,
            instrument: payload.step1.instrument,
            testTime: payload.step1.testTime,
            sampleOwner: payload.step1.sampleOwner || null,
            displayName: payload.displayName,
            customFields: {
              create: payload.step1.dynamicFields.map((field, index) => ({
                fieldName: field.name,
                fieldValue: field.value,
                sortOrder: index + 1
              }))
            },
            dataItems: {
              create: payload.step2.map((item, index) => ({
                itemName: item.itemName,
                itemValue: item.itemValue,
                itemUnit: item.itemUnit || null,
                sourceFileName: item.sourceFileName || null,
                sourceFilePath: item.sourceFilePath || null,
                originalFileName: item.originalFileName || null,
                originalFilePath: item.originalFilePath || null,
                rowOrder: index + 1
              }))
            }
          }
        });

        return {
          success: true,
          experimentId: experiment.id
        };
      } catch (error) {
        console.error('saveExperiment failed:', error);
        return { success: false, error: '保存实验数据失败' };
      }
    }
  );

  ipcMain.handle(
    'experiment:list',
    async (
      _event,
      payload?: {
        query?: string;
        groupBy?: 'sampleCode' | 'testProject' | 'testTime' | 'instrument' | 'tester' | 'sampleOwner';
      }
    ) => {
      const keyword = (payload?.query || '').trim();
      const groupBy = payload?.groupBy || 'sampleCode';

      const experiments = await prisma.experiment.findMany({
        where: keyword
          ? {
            OR: [
              { displayName: { contains: keyword } },
              { sampleCode: { contains: keyword } },
              { testProject: { contains: keyword } },
              { tester: { contains: keyword } },
              { instrument: { contains: keyword } },
              { sampleOwner: { contains: keyword } }
            ]
          }
          : undefined,
        orderBy: {
          id: 'desc'
        }
      });

      const groupMap = new Map<
        string,
        {
          groupKey: string;
          groupLabel: string;
          items: typeof experiments;
        }
      >();

      for (const item of experiments) {
        let groupValue = '';

        switch (groupBy) {
          case 'sampleCode':
            groupValue = item.sampleCode || '未分类';
            break;
          case 'testProject':
            groupValue = item.testProject || '未分类';
            break;
          case 'testTime':
            groupValue = item.testTime ? item.testTime.slice(0, 10) : '未分类';
            break;
          case 'instrument':
            groupValue = item.instrument || '未分类';
            break;
          case 'tester':
            groupValue = item.tester || '未分类';
            break;
          case 'sampleOwner':
            groupValue = item.sampleOwner || '未分类';
            break;
          default:
            groupValue = item.sampleCode || '未分类';
        }

        if (!groupMap.has(groupValue)) {
          groupMap.set(groupValue, {
            groupKey: groupValue,
            groupLabel: groupValue,
            items: []
          });
        }

        const groupEntry = groupMap.get(groupValue);
        if (groupEntry) {
          groupEntry.items.push(item);
        }
      }

      return Array.from(groupMap.values());
    }
  );

  ipcMain.handle('experiment:getDetail', async (_event, experimentId: number) => {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        customFields: {
          orderBy: { sortOrder: 'asc' }
        },
        dataItems: {
          orderBy: { rowOrder: 'asc' }
        }
      }
    });

    return experiment;
  });

  ipcMain.handle(
    'experiment:delete',
    async (_event, payload: { experimentId: number }): Promise<ActionResult> => {
      try {
        return await deleteExperimentPermanently(payload.experimentId);
      } catch (error) {
        console.error('deleteExperiment failed:', {
          experimentId: payload.experimentId,
          error
        });

        return { success: false, error: '删除实验数据失败，请稍后重试' };
      }
    }
  );

  ipcMain.handle(
    'file:openSavedFile',
    async (_event, payload: { filePath: string }) => {
      try {
        if (!payload.filePath) {
          return { success: false, error: '文件路径为空' };
        }

        if (!fileExists(payload.filePath)) {
          return { success: false, error: '文件不存在或路径无效' };
        }

        const result = await shell.openPath(payload.filePath);

        if (result) {
          return { success: false, error: result };
        }

        return { success: true };
      } catch (error) {
        console.error('openSavedFile failed:', error);
        return { success: false, error: '打开文件失败' };
      }
    }
  );

  ipcMain.handle(
    'file:openInFolder',
    async (_event, payload: { filePath: string }) => {
      try {
        if (!payload.filePath) {
          return { success: false, error: '文件路径为空' };
        }

        if (!fileExists(payload.filePath)) {
          return { success: false, error: '文件不存在或路径无效' };
        }

        shell.showItemInFolder(payload.filePath);
        return { success: true };
      } catch (error) {
        console.error('openInFolder failed:', error);
        return { success: false, error: '打开文件夹失败' };
      }
    }
  );

  ipcMain.handle(
    'experiment:update',
    async (_event, payload: UpdateExperimentPayload): Promise<ActionResult> => {
      try {
        const oldExperiment = await prisma.experiment.findUnique({
          where: { id: payload.experimentId },
          include: {
            customFields: { orderBy: { sortOrder: 'asc' } },
            dataItems: { orderBy: { rowOrder: 'asc' } }
          }
        });

        if (!oldExperiment) {
          return { success: false, error: '未找到对应实验记录' };
        }

        const storageRoot = await getSettingValue(
          prisma,
          'storageRoot',
          getDefaultStorageRoot()
        );
        const oldDataItemMap = new Map(
          oldExperiment.dataItems.map((item) => [item.id, item])
        );
        const plannedTargetPaths = new Set<string>();
        const filePlans: UpdateFilePlan[] = [];

        for (const [index, item] of payload.step2.entries()) {
          const oldItem = item.dataItemId ? oldDataItemMap.get(item.dataItemId) : undefined;
          const currentSourcePath = oldItem?.sourceFilePath?.trim() || item.sourceFilePath.trim() || '';
          const replacementSourcePath = item.replacementSourcePath?.trim() || '';
          const replacementOriginalName = item.replacementOriginalName?.trim() || '';
          const hasManagedFile = !!currentSourcePath;
          const hasReplacement = !!replacementSourcePath;

          if (!hasManagedFile && !hasReplacement) {
            continue;
          }

          const namingSourcePath = hasReplacement ? replacementSourcePath : currentSourcePath;
          const { fileName, fullPath } = buildManagedTargetPath(storageRoot, {
            sourcePath: namingSourcePath,
            testProject: payload.step1.testProject,
            sampleCode: payload.step1.sampleCode,
            tester: payload.step1.tester,
            instrument: payload.step1.instrument,
            testTime: payload.step1.testTime
          });

          if (plannedTargetPaths.has(fullPath)) {
            return {
              success: false,
              error: '保存文件名与当前编辑中的其他数据项冲突，请调整后重试'
            };
          }

          plannedTargetPaths.add(fullPath);

          const conflictError = await getManagedTargetConflictError(fullPath, {
            excludeDataItemId: item.dataItemId,
            currentSourcePath
          });

          if (conflictError) {
            return { success: false, error: conflictError };
          }

          if (hasReplacement && !fileExists(replacementSourcePath)) {
            return { success: false, error: '新选择的原始文件不存在或路径无效' };
          }

          if (hasReplacement) {
            filePlans.push({
              index,
              dataItemId: item.dataItemId,
              currentSourcePath,
              targetPath: fullPath,
              targetFileName: fileName,
              replacementSourcePath,
              replacementOriginalName,
              action: hasManagedFile ? 'replace' : 'create'
            });
            continue;
          }

          if (currentSourcePath && fullPath !== currentSourcePath) {
            filePlans.push({
              index,
              dataItemId: item.dataItemId,
              currentSourcePath,
              targetPath: fullPath,
              targetFileName: fileName,
              replacementSourcePath: '',
              replacementOriginalName: '',
              action: 'rename'
            });
          }
        }

        const resolvedStep2 = payload.step2.map((item) => ({
          ...item,
          sourceFileName: item.sourceFileName || '',
          sourceFilePath: item.sourceFilePath || '',
          originalFileName: item.originalFileName || '',
          originalFilePath: item.originalFilePath || ''
        }));
        const rollbackActions: Array<() => void> = [];
        const finalizeActions: Array<() => void> = [];

        try {
          for (const plan of filePlans) {
            if (plan.action === 'rename') {
              if (!plan.currentSourcePath || !fileExists(plan.currentSourcePath)) {
                return { success: false, error: '当前保存文件不存在，无法按新名称更新' };
              }

              ensureDir(path.dirname(plan.targetPath));
              fs.renameSync(plan.currentSourcePath, plan.targetPath);

              rollbackActions.unshift(() => {
                if (fileExists(plan.targetPath) && !fileExists(plan.currentSourcePath)) {
                  ensureDir(path.dirname(plan.currentSourcePath));
                  fs.renameSync(plan.targetPath, plan.currentSourcePath);
                }
              });

              resolvedStep2[plan.index] = {
                ...resolvedStep2[plan.index],
                sourceFileName: plan.targetFileName,
                sourceFilePath: plan.targetPath
              };

              continue;
            }

            const tempPath = createManagedTempPath(plan.targetPath);

            if (plan.action === 'create') {
              try {
                ensureDir(path.dirname(plan.targetPath));
                fs.copyFileSync(plan.replacementSourcePath, tempPath);
                fs.renameSync(tempPath, plan.targetPath);
              } finally {
                if (fileExists(tempPath)) {
                  fs.rmSync(tempPath, { force: true });
                }
              }

              rollbackActions.unshift(() => {
                if (fileExists(plan.targetPath)) {
                  fs.rmSync(plan.targetPath, { force: true });
                }
              });

              resolvedStep2[plan.index] = {
                ...resolvedStep2[plan.index],
                sourceFileName: plan.targetFileName,
                sourceFilePath: plan.targetPath,
                originalFileName: plan.replacementOriginalName,
                originalFilePath: plan.replacementSourcePath
              };

              continue;
            }

            if (!plan.currentSourcePath || !fileExists(plan.currentSourcePath)) {
              return { success: false, error: '当前保存文件不存在，无法替换为新文件' };
            }

            const backupPath = createManagedBackupPath(plan.currentSourcePath);

            try {
              ensureDir(path.dirname(plan.targetPath));
              fs.renameSync(plan.currentSourcePath, backupPath);
              fs.copyFileSync(plan.replacementSourcePath, tempPath);
              fs.renameSync(tempPath, plan.targetPath);
            } catch (error) {
              if (fileExists(tempPath)) {
                fs.rmSync(tempPath, { force: true });
              }

              if (fileExists(backupPath) && !fileExists(plan.currentSourcePath)) {
                try {
                  ensureDir(path.dirname(plan.currentSourcePath));
                  fs.renameSync(backupPath, plan.currentSourcePath);
                } catch (restoreError) {
                  console.error('restoreSavedFileAfterReplace failed:', {
                    experimentId: payload.experimentId,
                    dataItemId: plan.dataItemId,
                    restoreError
                  });
                }
              }

              throw error;
            }

            finalizeActions.push(() => {
              if (fileExists(backupPath)) {
                fs.rmSync(backupPath, { force: true });
              }
            });

            rollbackActions.unshift(() => {
              if (fileExists(plan.targetPath)) {
                fs.rmSync(plan.targetPath, { force: true });
              }

              if (fileExists(backupPath) && !fileExists(plan.currentSourcePath)) {
                ensureDir(path.dirname(plan.currentSourcePath));
                fs.renameSync(backupPath, plan.currentSourcePath);
              }
            });

            resolvedStep2[plan.index] = {
              ...resolvedStep2[plan.index],
              sourceFileName: plan.targetFileName,
              sourceFilePath: plan.targetPath,
              originalFileName: plan.replacementOriginalName,
              originalFilePath: plan.replacementSourcePath
            };
          }
        } catch (error) {
          for (const rollback of rollbackActions) {
            try {
              rollback();
            } catch (rollbackError) {
              console.error('rollbackUpdatedSavedFile failed:', {
                experimentId: payload.experimentId,
                rollbackError
              });
            }
          }

          console.error('prepareUpdatedSavedFiles failed:', {
            experimentId: payload.experimentId,
            error
          });
          return { success: false, error: '更新保存文件失败，请检查文件状态后重试' };
        }

        const oldSnapshot = {
          testProject: oldExperiment.testProject,
          sampleCode: oldExperiment.sampleCode,
          tester: oldExperiment.tester,
          instrument: oldExperiment.instrument,
          testTime: oldExperiment.testTime,
          sampleOwner: oldExperiment.sampleOwner,
          displayName: oldExperiment.displayName,
          customFields: oldExperiment.customFields.map((field) => ({
            fieldName: field.fieldName,
            fieldValue: field.fieldValue,
            sortOrder: field.sortOrder
          })),
          dataItems: oldExperiment.dataItems.map((item) => ({
            itemName: item.itemName,
            itemValue: item.itemValue,
            itemUnit: item.itemUnit,
            sourceFileName: item.sourceFileName,
            sourceFilePath: item.sourceFilePath,
            originalFileName: item.originalFileName,
            originalFilePath: item.originalFilePath,
            rowOrder: item.rowOrder
          }))
        };

        try {
          await prisma.$transaction(async (tx) => {
            await tx.experiment.update({
              where: { id: payload.experimentId },
              data: {
                testProject: payload.step1.testProject,
                sampleCode: payload.step1.sampleCode,
                tester: payload.step1.tester,
                instrument: payload.step1.instrument,
                testTime: payload.step1.testTime,
                sampleOwner: payload.step1.sampleOwner || null,
                displayName: payload.displayName
              }
            });

            await tx.experimentCustomField.deleteMany({
              where: { experimentId: payload.experimentId }
            });

            await tx.experimentDataItem.deleteMany({
              where: { experimentId: payload.experimentId }
            });

            if (payload.step1.dynamicFields.length) {
              await tx.experimentCustomField.createMany({
                data: payload.step1.dynamicFields.map((field, index) => ({
                  experimentId: payload.experimentId,
                  fieldName: field.name,
                  fieldValue: field.value,
                  sortOrder: index + 1
                }))
              });
            }

            if (resolvedStep2.length) {
              await tx.experimentDataItem.createMany({
                data: resolvedStep2.map((item, index) => ({
                  experimentId: payload.experimentId,
                  itemName: item.itemName,
                  itemValue: item.itemValue,
                  itemUnit: item.itemUnit || null,
                  sourceFileName: item.sourceFileName || null,
                  sourceFilePath: item.sourceFilePath || null,
                  originalFileName: item.originalFileName || null,
                  originalFilePath: item.originalFilePath || null,
                  rowOrder: index + 1
                }))
              });
            }

            const newSnapshot = {
              testProject: payload.step1.testProject,
              sampleCode: payload.step1.sampleCode,
              tester: payload.step1.tester,
              instrument: payload.step1.instrument,
              testTime: payload.step1.testTime,
              sampleOwner: payload.step1.sampleOwner || null,
              displayName: payload.displayName,
              customFields: payload.step1.dynamicFields.map((field, index) => ({
                fieldName: field.name,
                fieldValue: field.value,
                sortOrder: index + 1
              })),
              dataItems: resolvedStep2.map((item, index) => ({
                itemName: item.itemName,
                itemValue: item.itemValue,
                itemUnit: item.itemUnit || null,
                sourceFileName: item.sourceFileName || null,
                sourceFilePath: item.sourceFilePath || null,
                originalFileName: item.originalFileName || null,
                originalFilePath: item.originalFilePath || null,
                rowOrder: index + 1
              }))
            };

            await tx.editLog.create({
              data: {
                experimentId: payload.experimentId,
                editor: payload.editor,
                editReason: payload.editReason,
                editedFieldsJson: JSON.stringify({
                  before: oldSnapshot,
                  after: newSnapshot
                })
              }
            });
          });
        } catch (error) {
          for (const rollback of rollbackActions) {
            try {
              rollback();
            } catch (rollbackError) {
              console.error('rollbackUpdatedSavedFileAfterDbFailure failed:', {
                experimentId: payload.experimentId,
                rollbackError
              });
            }
          }

          throw error;
        }

        try {
          for (const finalize of finalizeActions) {
            finalize();
          }
        } catch (error) {
          console.error('cleanupReplacedSavedFile failed:', {
            experimentId: payload.experimentId,
            error
          });

          return {
            success: false,
            error: '实验记录已更新，但旧的保存文件清理失败，可能需要手动处理'
          };
        }

        return { success: true };
      } catch (error) {
        console.error('updateExperiment failed:', error);
        return { success: false, error: '更新实验数据失败' };
      }
    }
  );

  ipcMain.handle(
    'export:fullExperiments',
    async (
      _event,
      payload: {
        experimentIds: number[];
        compressAfterExport: boolean;
      }
    ) => {
      try {
        return await exportFullExperiments(
          prisma,
          payload.experimentIds,
          payload.compressAfterExport
        );
      } catch (error) {
        console.error('exportFullExperiments failed:', error);
        return {
          canceled: false,
          success: false,
          error: '导出完整实验数据失败'
        };
      }
    }
  );

  ipcMain.handle(
    'export:getItemNames',
    async (
      _event,
      payload: {
        experimentIds: number[];
      }
    ) => {
      try {
        return await getDistinctItemNames(prisma, payload.experimentIds);
      } catch (error) {
        console.error('getExportItemNames failed:', error);
        return [];
      }
    }
  );

  ipcMain.handle(
    'export:itemNameCompare',
    async (
      _event,
      payload: {
        experimentIds: number[];
        mode: 'single' | 'all';
        selectedItemName?: string;
        compressAfterExport: boolean;
      }
    ) => {
      const itemNames =
        payload.mode === 'all'
          ? await getDistinctItemNames(prisma, payload.experimentIds)
          : payload.selectedItemName
            ? [payload.selectedItemName]
            : [];

      if (!itemNames.length) {
        return {
          canceled: false,
          success: false,
          error: '没有可导出的二级数据项名称'
        };
      }

      try {
        return await exportByItemNames(
          prisma,
          payload.experimentIds,
          itemNames,
          payload.compressAfterExport
        );
      } catch (error) {
        console.error('exportItemNameCompare failed:', error);
        return {
          canceled: false,
          success: false,
          error: '导出二级数据项失败'
        };
      }
    }
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  try {
    if (prisma) {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('prisma disconnect failed:', error);
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
