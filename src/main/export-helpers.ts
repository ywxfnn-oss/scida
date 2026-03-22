import fs from 'node:fs';
import path from 'node:path';
import { dialog } from 'electron';
import type { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import archiver from 'archiver';
import {
  ensureDir,
  fileExists,
  formatExportTimestamp,
  sanitizeFileNamePart
} from './file-helpers';

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
    sourceFilePath?: string | null;
  }>;
};

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

export async function exportFullExperiments(
  prisma: PrismaClient,
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
      if (!fileExists(item.sourceFilePath)) continue;
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

export async function getDistinctItemNames(
  prisma: PrismaClient,
  experimentIds: number[]
) {
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

export async function exportByItemNames(
  prisma: PrismaClient,
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

        if (matchedItem.sourceFilePath && fileExists(matchedItem.sourceFilePath)) {
          const sampleDir = path.join(
            itemFolderPath,
            sanitizeFileNamePart(experiment.sampleCode || '未分类样品')
          );
          ensureDir(sampleDir);

          const fileName = path.basename(matchedItem.sourceFilePath);
          const targetPath = path.join(sampleDir, fileName);

          if (!fileExists(targetPath)) {
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
