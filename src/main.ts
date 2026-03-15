import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import * as ExcelJS from 'exceljs';
import archiver from 'archiver';
import started from 'electron-squirrel-startup';
import type {
  ActionResult,
  AppSettings,
  AuthenticatePayload,
  CopyFileToStorageResult,
  SaveAppSettingsPayload,
  SaveExperimentPayload,
  SaveExperimentResult,
  UpdateExperimentPayload
} from './electron-api';

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

type ExportExperiment = {
  id: number;
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  sampleOwner: string | null;
  displayName: string;
  customFields: Array<{
    fieldName: string;
    fieldValue: string;
  }>;
  dataItems: Array<{
    itemName: string;
    itemValue: string;
    itemUnit: string | null;
    sourceFileName: string | null;
    originalFileName: string | null;
  }>;
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

function fileExists(filePath: string) {
  return fs.existsSync(filePath);
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

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .split('')
    .map((char) => {
      const charCode = char.charCodeAt(0);

      if ('<>:"/\\|?*'.includes(char) || (charCode >= 0 && charCode <= 31)) {
        return '_';
      }

      return char;
    })
    .join('')
    .replace(/\s+/g, '_');
}

function formatTestTimeForFileName(value: string) {
  if (!value) return '';
  return value.replace('T', '-').replaceAll(':', '-');
}

function buildBaseName(payload: {
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
}) {
  const parts = [
    payload.testProject,
    payload.sampleCode,
    payload.tester,
    payload.instrument,
    formatTestTimeForFileName(payload.testTime)
  ]
    .filter(Boolean)
    .map(sanitizeFileNamePart);

  return parts.join('-') || '未命名数据';
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildUniqueTargetPath(targetDir: string, baseName: string, ext: string) {
  let counter = 0;
  let fileName = `${baseName}${ext}`;
  let fullPath = path.join(targetDir, fileName);

  while (fs.existsSync(fullPath)) {
    counter += 1;
    const suffix = `_${String(counter).padStart(2, '0')}`;
    fileName = `${baseName}${suffix}${ext}`;
    fullPath = path.join(targetDir, fileName);
  }

  return {
    fileName,
    fullPath
  };
}

function formatExportTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}-${mi}-${ss}`;
}

async function getSettingValue(key: string, fallbackValue: string) {
  const record = await prisma.appSetting.findUnique({
    where: { settingKey: key }
  });

  return record?.settingValue || fallbackValue;
}

async function upsertSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { settingKey: key },
    update: { settingValue: value },
    create: {
      settingKey: key,
      settingValue: value
    }
  });
}

async function deleteSetting(key: string) {
  return prisma.appSetting.deleteMany({
    where: { settingKey: key }
  });
}

async function getAppSettingsForRenderer(): Promise<AppSettings> {
  return {
    storageRoot: await getSettingValue('storageRoot', getDefaultStorageRoot()),
    loginUsername: await getSettingValue('loginUsername', DEFAULT_LOGIN_USERNAME)
  };
}

async function verifyLogin(payload: AuthenticatePayload): Promise<ActionResult> {
  const username = payload.username.trim();

  if (!username || !payload.password) {
    return { success: false, error: '请输入账号和密码' };
  }

  const savedUsername = await getSettingValue('loginUsername', DEFAULT_LOGIN_USERNAME);
  const savedPasswordHash = await getSettingValue(
    'loginPasswordHash',
    hashPassword(DEFAULT_LOGIN_PASSWORD)
  );

  if (username !== savedUsername || !verifyPassword(payload.password, savedPasswordHash)) {
    return { success: false, error: '账号或密码错误' };
  }

  return { success: true };
}

async function createExperimentDetailWorkbook(
  experiment: ExportExperiment | null,
  outputPath: string
) {
  if (!experiment) return;

  const workbook = new ExcelJS.Workbook();

  const sheet1 = workbook.addWorksheet('一级信息');
  sheet1.columns = [
    { header: '字段名', key: 'fieldName', width: 24 },
    { header: '字段值', key: 'fieldValue', width: 48 }
  ];

  sheet1.addRows([
    { fieldName: '实验编号', fieldValue: String(experiment.id) },
    { fieldName: '测试项目', fieldValue: experiment.testProject },
    { fieldName: '样品编号', fieldValue: experiment.sampleCode },
    { fieldName: '测试人', fieldValue: experiment.tester },
    { fieldName: '测试仪器', fieldValue: experiment.instrument },
    { fieldName: '测试时间', fieldValue: experiment.testTime },
    { fieldName: '样品所属人员', fieldValue: experiment.sampleOwner || '' },
    { fieldName: '自动命名名称', fieldValue: experiment.displayName }
  ]);

  const sheet2 = workbook.addWorksheet('动态字段');
  sheet2.columns = [
    { header: '字段名称', key: 'fieldName', width: 24 },
    { header: '字段值', key: 'fieldValue', width: 48 }
  ];

  if (experiment.customFields.length) {
    experiment.customFields.forEach((field) => {
      sheet2.addRow({
        fieldName: field.fieldName,
        fieldValue: field.fieldValue
      });
    });
  } else {
    sheet2.addRow({
      fieldName: '无',
      fieldValue: ''
    });
  }

  const sheet3 = workbook.addWorksheet('二级数据项');
  sheet3.columns = [
    { header: '名称', key: 'itemName', width: 24 },
    { header: '数值', key: 'itemValue', width: 20 },
    { header: '单位', key: 'itemUnit', width: 18 },
    { header: '保存文件名', key: 'sourceFileName', width: 42 },
    { header: '原始文件名', key: 'originalFileName', width: 42 }
  ];

  if (experiment.dataItems.length) {
    experiment.dataItems.forEach((item) => {
      sheet3.addRow({
        itemName: item.itemName,
        itemValue: item.itemValue,
        itemUnit: item.itemUnit || '',
        sourceFileName: item.sourceFileName || '',
        originalFileName: item.originalFileName || ''
      });
    });
  } else {
    sheet3.addRow({
      itemName: '无',
      itemValue: '',
      itemUnit: '',
      sourceFileName: '',
      originalFileName: ''
    });
  }

  await workbook.xlsx.writeFile(outputPath);
}

async function createCompareWorkbook(
  itemName: string,
  rows: Array<{
    displayName: string;
    itemValue: string;
    itemUnit: string | null;
  }>,
  outputPath: string
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(itemName);

  sheet.columns = [
    { header: '名称', key: 'displayName', width: 48 },
    { header: '数值', key: 'itemValue', width: 20 },
    { header: '单位', key: 'itemUnit', width: 18 }
  ];

  if (rows.length) {
    rows.forEach((row) => {
      sheet.addRow({
        displayName: row.displayName,
        itemValue: row.itemValue,
        itemUnit: row.itemUnit || ''
      });
    });
  } else {
    sheet.addRow({
      displayName: '无数据',
      itemValue: '',
      itemUnit: ''
    });
  }

  await workbook.xlsx.writeFile(outputPath);
}

function zipDirectory(sourceDir: string, zipPath: string) {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    output.on('error', (err) => reject(err));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });
}

async function chooseExportRoot() {
  const result = await dialog.showOpenDialog({
    title: '选择导出位置',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return result.filePaths[0];
}

async function exportFullExperiments(
  experimentIds: number[],
  compressAfterExport: boolean
) {
  const targetBaseDir = await chooseExportRoot();

  if (!targetBaseDir) {
    return {
      canceled: true
    };
  }

  const exportRootName = `SciDataManager_导出_${formatExportTimestamp()}`;
  const exportRootPath = path.join(targetBaseDir, exportRootName);

  ensureDir(exportRootPath);

  const experiments = await prisma.experiment.findMany({
    where: {
      id: {
        in: experimentIds
      }
    },
    include: {
      customFields: {
        orderBy: { sortOrder: 'asc' }
      },
      dataItems: {
        orderBy: { rowOrder: 'asc' }
      }
    },
    orderBy: {
      id: 'asc'
    }
  });

  for (const experiment of experiments) {
    const experimentDirName = sanitizeFileNamePart(experiment.displayName);
    const experimentDir = path.join(exportRootPath, experimentDirName);
    ensureDir(experimentDir);

    const detailWorkbookPath = path.join(
      experimentDir,
      `${sanitizeFileNamePart(experiment.displayName)}_详情说明.xlsx`
    );

    await createExperimentDetailWorkbook(experiment, detailWorkbookPath);

    const rawFileRoot = path.join(
      experimentDir,
      '原始文件',
      sanitizeFileNamePart(experiment.sampleCode || '未分类样品')
    );
    ensureDir(rawFileRoot);

    const copiedPaths = new Set<string>();

    for (const item of experiment.dataItems) {
      if (!item.sourceFilePath) continue;
      if (!fs.existsSync(item.sourceFilePath)) continue;
      if (copiedPaths.has(item.sourceFilePath)) continue;

      copiedPaths.add(item.sourceFilePath);

      const fileName = path.basename(item.sourceFilePath);
      const targetPath = path.join(rawFileRoot, fileName);
      fs.copyFileSync(item.sourceFilePath, targetPath);
    }
  }

  if (compressAfterExport) {
    const zipPath = `${exportRootPath}.zip`;
    await zipDirectory(exportRootPath, zipPath);
    fs.rmSync(exportRootPath, { recursive: true, force: true });

    return {
      canceled: false,
      success: true,
      exportPath: zipPath,
      compressed: true
    };
  }

  return {
    canceled: false,
    success: true,
    exportPath: exportRootPath,
    compressed: false
  };
}

async function getDistinctItemNames(experimentIds: number[]) {
  const experiments = await prisma.experiment.findMany({
    where: {
      id: {
        in: experimentIds
      }
    },
    include: {
      dataItems: true
    }
  });

  const nameSet = new Set<string>();

  for (const experiment of experiments) {
    for (const item of experiment.dataItems) {
      if (item.itemName?.trim()) {
        nameSet.add(item.itemName.trim());
      }
    }
  }

  return Array.from(nameSet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

async function exportByItemNames(
  experimentIds: number[],
  itemNames: string[],
  compressAfterExport: boolean
) {
  const targetBaseDir = await chooseExportRoot();

  if (!targetBaseDir) {
    return {
      canceled: true
    };
  }

  const exportRootName = `SciDataManager_二级数据项导出_${formatExportTimestamp()}`;
  const exportRootPath = path.join(targetBaseDir, exportRootName);

  ensureDir(exportRootPath);

  const experiments = await prisma.experiment.findMany({
    where: {
      id: {
        in: experimentIds
      }
    },
    include: {
      dataItems: {
        orderBy: { rowOrder: 'asc' }
      }
    },
    orderBy: {
      id: 'asc'
    }
  });

  for (const itemName of itemNames) {
    const safeItemFolderName = sanitizeFileNamePart(itemName);
    const itemFolderPath = path.join(exportRootPath, safeItemFolderName);
    ensureDir(itemFolderPath);

    const compareRows: Array<{
      displayName: string;
      itemValue: string;
      itemUnit: string | null;
    }> = [];

    for (const experiment of experiments) {
      const matchedItems = experiment.dataItems.filter(
        (item) => item.itemName.trim() === itemName
      );

      if (!matchedItems.length) continue;

      for (const matchedItem of matchedItems) {
        compareRows.push({
          displayName: experiment.displayName,
          itemValue: matchedItem.itemValue,
          itemUnit: matchedItem.itemUnit
        });

        if (matchedItem.sourceFilePath && fs.existsSync(matchedItem.sourceFilePath)) {
          const sampleDir = path.join(
            itemFolderPath,
            sanitizeFileNamePart(experiment.sampleCode || '未分类样品')
          );
          ensureDir(sampleDir);

          const fileName = path.basename(matchedItem.sourceFilePath);
          const targetPath = path.join(sampleDir, fileName);

          if (!fs.existsSync(targetPath)) {
            fs.copyFileSync(matchedItem.sourceFilePath, targetPath);
          }
        }
      }
    }

    const workbookPath = path.join(itemFolderPath, `${safeItemFolderName}.xlsx`);
    await createCompareWorkbook(itemName, compareRows, workbookPath);
  }

  if (compressAfterExport) {
    const zipPath = `${exportRootPath}.zip`;
    await zipDirectory(exportRootPath, zipPath);
    fs.rmSync(exportRootPath, { recursive: true, force: true });

    return {
      canceled: false,
      success: true,
      exportPath: zipPath,
      compressed: true
    };
  }

  return {
    canceled: false,
    success: true,
    exportPath: exportRootPath,
    compressed: false
  };
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
      return await verifyLogin(payload);
    } catch (error) {
      console.error('authenticate failed:', error);
      return { success: false, error: '登录失败，请稍后重试' };
    }
  });

  ipcMain.handle('settings:getAppSettings', async () => {
    try {
      return await getAppSettingsForRenderer();
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
        ensureDir(payload.storageRoot);

        await upsertSetting('storageRoot', payload.storageRoot);
        await upsertSetting('loginUsername', payload.loginUsername);

        if (payload.newPassword) {
          await upsertSetting('loginPasswordHash', hashPassword(payload.newPassword));
        }

        await deleteSetting('loginPassword');

        return { success: true };
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
          'storageRoot',
          getDefaultStorageRoot()
        );

        const projectDir = sanitizeFileNamePart(payload.testProject || '未分类项目');
        const sampleDir = sanitizeFileNamePart(payload.sampleCode || '未分类样品');

        const targetDir = path.join(storageRoot, projectDir, sampleDir);
        ensureDir(targetDir);

        const sourceExt = path.extname(payload.sourcePath);
        const baseName = buildBaseName(payload);

        const { fileName, fullPath } = buildUniqueTargetPath(targetDir, baseName, sourceExt);

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

          if (payload.step2.length) {
            await tx.experimentDataItem.createMany({
              data: payload.step2.map((item, index) => ({
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
            dataItems: payload.step2.map((item, index) => ({
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
        return await getDistinctItemNames(payload.experimentIds);
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
          ? await getDistinctItemNames(payload.experimentIds)
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
