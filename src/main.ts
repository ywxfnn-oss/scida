import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
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
  ensureDir,
  fileExists,
  formatExportTimestamp
} from './main/file-helpers';
import {
  exportByItemNames,
  exportFullExperiments,
  getDistinctItemNames
} from './main/export-helpers';
import { deleteExperimentPermanently } from './main/delete-helpers';
import { findLikelyDuplicateExperiments } from './main/duplicate-check';
import {
  exportOrphanFileList,
  openPathLocation,
  quarantineOrphanFiles,
  scanManagedFileIntegrity
} from './main/file-integrity';
import {
  getManagedTargetConflictError,
  updateExperimentWithManagedFiles
} from './main/record-file-update-helpers';
import {
  getBundledDbPath,
  getKnownMigrationTables,
  getMigrationFiles,
  getRuntimeDbPath,
  type MigrationFile,
  tableExists
} from './main/runtime-db-helpers';
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

type SqliteDatabase = InstanceType<typeof Database>;

function getDefaultStorageRoot() {
  return path.join(app.getPath('userData'), 'storage', 'raw_files');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey}`;
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
        const conflictError = await getManagedTargetConflictError(prisma, fullPath);

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
    'experiment:checkDuplicates',
    async (_event, payload: {
      sampleCode: string;
      testProject: string;
      testTime: string;
      excludeExperimentId?: number;
    }) => {
      try {
        return await findLikelyDuplicateExperiments(prisma, payload);
      } catch (error) {
        console.error('checkDuplicateExperiments failed:', error);
        return {
          matches: []
        };
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
        return await deleteExperimentPermanently(prisma, payload.experimentId);
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
    'file:scanIntegrity',
    async () => {
      try {
        const storageRoot = await getSettingValue(
          prisma,
          'storageRoot',
          getDefaultStorageRoot()
        );

        return await scanManagedFileIntegrity(prisma, storageRoot);
      } catch (error) {
        console.error('scanFileIntegrity failed:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    'file:exportOrphanList',
    async (_event, payload: { storageRoot: string; orphanPaths: string[] }) => {
      try {
        return await exportOrphanFileList(payload.storageRoot, payload.orphanPaths);
      } catch (error) {
        console.error('exportOrphanFileList failed:', error);
        return { success: false, error: '导出孤儿文件清单失败' };
      }
    }
  );

  ipcMain.handle(
    'file:quarantineOrphans',
    async (_event, payload: { storageRoot: string; orphanPaths: string[] }) => {
      try {
        return await quarantineOrphanFiles(payload.storageRoot, payload.orphanPaths);
      } catch (error) {
        console.error('quarantineOrphanFiles failed:', error);
        return { success: false, error: '隔离孤儿文件失败' };
      }
    }
  );

  ipcMain.handle(
    'file:openPathLocation',
    async (_event, payload: { targetPath: string }) => {
      try {
        return await openPathLocation(payload.targetPath);
      } catch (error) {
        console.error('openPathLocation failed:', error);
        return { success: false, error: '打开路径失败' };
      }
    }
  );

  ipcMain.handle(
    'experiment:update',
    async (_event, payload: UpdateExperimentPayload): Promise<ActionResult> => {
      try {
        return await updateExperimentWithManagedFiles(payload, {
          prisma,
          getDefaultStorageRoot
        });
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
