import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type ManagedFileTargetPayload = {
  sourcePath: string;
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
};

export function fileExists(filePath: string) {
  return fs.existsSync(filePath);
}

export function sanitizeFileNamePart(value: string) {
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

export function formatTestTimeForFileName(value: string) {
  if (!value) return '';
  return value.replace('T', '-').replaceAll(':', '-');
}

export function buildBaseName(payload: {
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

export function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function buildManagedTargetPath(
  storageRoot: string,
  payload: ManagedFileTargetPayload
) {
  const projectDir = sanitizeFileNamePart(payload.testProject || '未分类项目');
  const sampleDir = sanitizeFileNamePart(payload.sampleCode || '未分类样品');
  const targetDir = path.join(storageRoot, projectDir, sampleDir);
  const sourceExt = path.extname(payload.sourcePath);
  const baseName = buildBaseName(payload);
  const fileName = `${baseName}${sourceExt}`;
  const fullPath = path.join(targetDir, fileName);

  return {
    targetDir,
    fileName,
    fullPath
  };
}

export function createManagedTempPath(filePath: string) {
  const parsed = path.parse(filePath);
  return path.join(
    parsed.dir,
    `${parsed.name}.tmp-${randomUUID()}${parsed.ext || '.tmp'}`
  );
}

export function createManagedBackupPath(filePath: string) {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}.bak-${randomUUID()}${parsed.ext}`);
}

export function formatExportTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}-${mi}-${ss}`;
}
