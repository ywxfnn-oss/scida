import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { fileExists } from './file-helpers';

export type MigrationFile = {
  name: string;
  sql: string;
  checksum: string;
};

export type SqliteDatabase = InstanceType<typeof Database>;

export function getRuntimeDbPath() {
  return path.join(app.getPath('userData'), 'scidata.db');
}

export function getBundledDbPath() {
  return path.join(app.getAppPath(), 'dev.db');
}

export function getMigrationsDir() {
  return path.join(app.getAppPath(), 'prisma', 'migrations');
}

export function getMigrationFiles() {
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

export function tableExists(db: SqliteDatabase, tableName: string) {
  const row = db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`
    )
    .get(tableName);

  return !!row;
}

export function getKnownMigrationTables() {
  return new Map<string, string[]>([
    ['20260313161434_init', ['User']],
    ['20260314023620_add_experiment_tables', ['Experiment', 'ExperimentCustomField', 'ExperimentDataItem']],
    ['20260314035050_add_edit_logs', ['EditLog']],
    ['20260314043854_add_app_settings', ['AppSetting']],
    ['20260322103000_add_operation_logs', ['OperationLog']]
  ]);
}
