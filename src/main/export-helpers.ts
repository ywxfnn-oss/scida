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
import { getOperationActor, writeOperationLog } from './operation-log';
import {
  parseTemplateBlockMeta,
  SPECTRUM_TEMPLATE_TYPE,
  XY_TEMPLATE_TYPE,
  type SpectrumBlockMeta,
  type TemplateBlockType,
  type XYCurveBlockMeta,
  type XYPoint
} from '../template-blocks';

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

type StructuredExportExperiment = {
  id: number;
  displayName: string;
  sampleCode: string;
  templateBlocks: Array<{
    id: number;
    templateType: TemplateBlockType;
    blockTitle: string;
    metaJson: string;
    dataJson: string;
    sourceFilePath: string | null;
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

async function createStructuredSeriesWorkbook(
  secondaryItemName: string,
  entries: Array<{
    seriesLabel: string;
    xLabel: string;
    xUnit: string;
    yLabel: string;
    yUnit: string;
    points: XYPoint[];
  }>,
  outputPath: string
) {
  const workbook = new ExcelJS.Workbook();
  const sheetName = secondaryItemName.slice(0, 31) || '结构化数据';
  const sheet = workbook.addWorksheet(sheetName);
  const maxPointCount = entries.reduce((max, entry) => Math.max(max, entry.points.length), 0);

  sheet.columns = entries.flatMap((entry, index) => {
    const xHeader = `${entry.seriesLabel} X${entry.xLabel || entry.xUnit ? ` (${entry.xLabel}${entry.xUnit ? ` / ${entry.xUnit}` : ''})` : ''}`;
    const yHeader = `${entry.seriesLabel} Y${entry.yLabel || entry.yUnit ? ` (${entry.yLabel}${entry.yUnit ? ` / ${entry.yUnit}` : ''})` : ''}`;

    return [
      { header: xHeader, key: `x_${index}`, width: 24 },
      { header: yHeader, key: `y_${index}`, width: 24 }
    ];
  });

  for (let rowIndex = 0; rowIndex < maxPointCount; rowIndex += 1) {
    const nextRow: Record<string, number | string> = {};

    entries.forEach((entry, entryIndex) => {
      const point = entry.points[rowIndex];
      nextRow[`x_${entryIndex}`] = point ? point.x : '';
      nextRow[`y_${entryIndex}`] = point ? point.y : '';
    });

    sheet.addRow(nextRow);
  }

  await workbook.xlsx.writeFile(outputPath);
}

function parseStructuredPoints(dataJson: string): XYPoint[] {
  try {
    const parsed = JSON.parse(dataJson);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (point): point is XYPoint =>
          !!point &&
          typeof point === 'object' &&
          Number.isFinite((point as XYPoint).x) &&
          Number.isFinite((point as XYPoint).y)
      )
      .map((point) => ({
        x: Number(point.x),
        y: Number(point.y)
      }));
  } catch {
    return [];
  }
}

function buildUniqueSeriesHeaders(
  experiments: Array<{ displayName: string; sampleCode: string; id: number }>
) {
  const nameCounts = new Map<string, number>();

  experiments.forEach((experiment) => {
    nameCounts.set(experiment.displayName, (nameCounts.get(experiment.displayName) || 0) + 1);
  });

  const sampleCodeCounts = new Map<string, number>();

  const labels = experiments.map((experiment) => {
    if ((nameCounts.get(experiment.displayName) || 0) === 1) {
      return experiment.displayName;
    }

    const sampleCode = experiment.sampleCode.trim();
    if (sampleCode) {
      const sampleKey = `${experiment.displayName}__${sampleCode}`;
      const nextCount = (sampleCodeCounts.get(sampleKey) || 0) + 1;
      sampleCodeCounts.set(sampleKey, nextCount);
      return nextCount === 1
        ? `${experiment.displayName}（${sampleCode}）`
        : `${experiment.displayName}（${sampleCode}-${nextCount}）`;
    }

    return `${experiment.displayName}（#${experiment.id}）`;
  });

  return dedupeLabelsWithSuffix(labels);
}

function dedupeLabelsWithSuffix(labels: string[]) {
  const counts = new Map<string, number>();

  return labels.map((label) => {
    const count = (counts.get(label) || 0) + 1;
    counts.set(label, count);
    return count === 1 ? label : `${label}__${count}`;
  });
}

function buildResolvedExportNameMap(originalNames: string[]) {
  const usedNames = new Map<string, number>();
  const resolvedNameMap = new Map<string, string>();

  for (const originalName of originalNames) {
    if (resolvedNameMap.has(originalName)) {
      continue;
    }

    const safeBaseName = sanitizeFileNamePart(originalName) || '未命名';
    const nextCount = (usedNames.get(safeBaseName) || 0) + 1;
    usedNames.set(safeBaseName, nextCount);

    resolvedNameMap.set(
      originalName,
      nextCount === 1 ? safeBaseName : `${safeBaseName}__${nextCount}`
    );
  }

  return resolvedNameMap;
}

function buildUniqueFilePath(
  targetDir: string,
  baseName: string,
  extension: string
) {
  const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
  const safeBaseName = sanitizeFileNamePart(baseName) || '未命名';
  let candidatePath = path.join(targetDir, `${safeBaseName}${normalizedExtension}`);
  let suffix = 2;

  while (fileExists(candidatePath)) {
    candidatePath = path.join(targetDir, `${safeBaseName}__${suffix}${normalizedExtension}`);
    suffix += 1;
  }

  return candidatePath;
}

function copyFileToUniqueTarget(sourcePath: string, targetDir: string) {
  const parsed = path.parse(path.basename(sourcePath));
  let candidatePath = path.join(targetDir, `${parsed.name}${parsed.ext}`);
  let suffix = 2;

  while (fileExists(candidatePath)) {
    candidatePath = path.join(targetDir, `${parsed.name}__${suffix}${parsed.ext}`);
    suffix += 1;
  }

  fs.copyFileSync(sourcePath, candidatePath);
  return candidatePath;
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

async function logExportOperation(
  prisma: PrismaClient,
  payload: {
    operationType: 'export_full' | 'export_item_compare';
    experimentIds: number[];
    exportPath: string;
    compressed: boolean;
    itemNames?: string[];
  }
) {
  try {
    await writeOperationLog(prisma, {
      operationType: payload.operationType,
      actor: await getOperationActor(prisma),
      summary: JSON.stringify({
        experimentCount: payload.experimentIds.length,
        experimentIds: payload.experimentIds,
        exportPath: payload.exportPath,
        compressed: payload.compressed,
        itemNames: payload.itemNames || []
      })
    });
  } catch (error) {
    console.error('writeExportOperationLog failed:', {
      operationType: payload.operationType,
      experimentIds: payload.experimentIds,
      exportPath: payload.exportPath,
      error
    });
  }
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
      `${sanitizeFileNamePart(experiment.displayName)}_详情说明表.xlsx`
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

    await logExportOperation(prisma, {
      operationType: 'export_full',
      experimentIds,
      exportPath: zipPath,
      compressed: true
    });

    return {
      canceled: false,
      success: true,
      exportPath: zipPath,
      compressed: true
    };
  }

  await logExportOperation(prisma, {
    operationType: 'export_full',
    experimentIds,
    exportPath: exportRootPath,
    compressed: false
  });

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
      dataItems: true,
      templateBlocks: {
        where: {
          templateType: {
            in: [XY_TEMPLATE_TYPE, SPECTRUM_TEMPLATE_TYPE]
          }
        },
        select: {
          blockTitle: true
        }
      }
    }
  });

  const nameSet = new Set<string>();

  for (const experiment of experiments) {
    for (const item of experiment.dataItems) {
      if (item.itemName?.trim()) {
        nameSet.add(item.itemName.trim());
      }
    }

    for (const block of experiment.templateBlocks) {
      if (block.blockTitle?.trim()) {
        nameSet.add(block.blockTitle.trim());
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
      },
      templateBlocks: {
        where: {
          templateType: {
            in: [XY_TEMPLATE_TYPE, SPECTRUM_TEMPLATE_TYPE]
          }
        },
        orderBy: { blockOrder: 'asc' }
      }
    },
    orderBy: {
      id: 'asc'
    }
  });

  const resolvedFolderNames = buildResolvedExportNameMap(itemNames);

  for (const itemName of itemNames) {
    const safeItemFolderName = resolvedFolderNames.get(itemName) || '未命名';
    const itemFolderPath = path.join(exportRootPath, safeItemFolderName);
    ensureDir(itemFolderPath);

    const scalarRows: Array<{
      displayName: string;
      itemValue: string;
      itemUnit: string | null;
    }> = [];
    const xyEntries: Array<{
      experiment: StructuredExportExperiment;
      block: StructuredExportExperiment['templateBlocks'][number];
      points: XYPoint[];
      meta: XYCurveBlockMeta;
    }> = [];
    const spectrumEntries: Array<{
      experiment: StructuredExportExperiment;
      block: StructuredExportExperiment['templateBlocks'][number];
      points: XYPoint[];
      meta: SpectrumBlockMeta;
    }> = [];

    for (const experiment of experiments) {
      const matchedItems = experiment.dataItems.filter(
        (item) => item.itemName.trim() === itemName
      );

      for (const matchedItem of matchedItems) {
        scalarRows.push({
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
          copyFileToUniqueTarget(matchedItem.sourceFilePath, sampleDir);
        }
      }

      const matchedBlocks = experiment.templateBlocks.filter(
        (block) => block.blockTitle.trim() === itemName
      );

      for (const matchedBlock of matchedBlocks) {
        const points = parseStructuredPoints(matchedBlock.dataJson);
        if (!points.length) {
          continue;
        }

        if (matchedBlock.templateType === XY_TEMPLATE_TYPE) {
          xyEntries.push({
            experiment: experiment as StructuredExportExperiment,
            block: matchedBlock as StructuredExportExperiment['templateBlocks'][number],
            points,
            meta: parseTemplateBlockMeta(
              XY_TEMPLATE_TYPE,
              matchedBlock.metaJson
            ) as XYCurveBlockMeta
          });
        }

        if (matchedBlock.templateType === SPECTRUM_TEMPLATE_TYPE) {
          spectrumEntries.push({
            experiment: experiment as StructuredExportExperiment,
            block: matchedBlock as StructuredExportExperiment['templateBlocks'][number],
            points,
            meta: parseTemplateBlockMeta(
              SPECTRUM_TEMPLATE_TYPE,
              matchedBlock.metaJson
            ) as SpectrumBlockMeta
          });
        }

        if (matchedBlock.sourceFilePath && fileExists(matchedBlock.sourceFilePath)) {
          const sampleDir = path.join(
            itemFolderPath,
            sanitizeFileNamePart(experiment.sampleCode || '未分类样品')
          );
          ensureDir(sampleDir);
          copyFileToUniqueTarget(matchedBlock.sourceFilePath, sampleDir);
        }
      }
    }

    const hasScalarData = scalarRows.length > 0;
    const hasXYData = xyEntries.length > 0;
    const hasSpectrumData = spectrumEntries.length > 0;
    const hasStructuredData = hasXYData || hasSpectrumData;

    if (hasScalarData) {
      const scalarWorkbookBaseName =
        hasStructuredData ? `${safeItemFolderName}_标量数据` : safeItemFolderName;
      const scalarWorkbookPath = buildUniqueFilePath(
        itemFolderPath,
        scalarWorkbookBaseName,
        '.xlsx'
      );
      await createCompareWorkbook(itemName, scalarRows, scalarWorkbookPath);
    }

    if (hasXYData) {
      const xyWorkbookBaseName = hasScalarData
        ? `${safeItemFolderName}_结构化数据（XY）`
        : `${safeItemFolderName}_结构化数据（XY）`;
      const xyWorkbookPath = buildUniqueFilePath(
        itemFolderPath,
        xyWorkbookBaseName,
        '.xlsx'
      );
      const seriesHeaders = buildUniqueSeriesHeaders(
        xyEntries.map((entry) => ({
          id: entry.experiment.id,
          displayName: entry.experiment.displayName,
          sampleCode: entry.experiment.sampleCode
        }))
      );

      await createStructuredSeriesWorkbook(
        itemName,
        xyEntries.map((entry, index) => ({
          seriesLabel: seriesHeaders[index],
          xLabel: entry.meta.xLabel,
          xUnit: entry.meta.xUnit,
          yLabel: entry.meta.yLabel,
          yUnit: entry.meta.yUnit,
          points: entry.points
        })),
        xyWorkbookPath
      );
    }

    if (hasSpectrumData) {
      const spectrumWorkbookPath = buildUniqueFilePath(
        itemFolderPath,
        `${safeItemFolderName}_结构化数据（光谱）`,
        '.xlsx'
      );
      const seriesHeaders = buildUniqueSeriesHeaders(
        spectrumEntries.map((entry) => ({
          id: entry.experiment.id,
          displayName: entry.experiment.displayName,
          sampleCode: entry.experiment.sampleCode
        }))
      );

      await createStructuredSeriesWorkbook(
        itemName,
        spectrumEntries.map((entry, index) => ({
          seriesLabel: seriesHeaders[index],
          xLabel: entry.meta.spectrumAxisLabel,
          xUnit: entry.meta.spectrumAxisUnit,
          yLabel: entry.meta.signalLabel,
          yUnit: entry.meta.signalUnit,
          points: entry.points
        })),
        spectrumWorkbookPath
      );
    }
  }

  if (compressAfterExport) {
    const zipPath = `${exportRootPath}.zip`;
    await zipDirectory(exportRootPath, zipPath);
    fs.rmSync(exportRootPath, { recursive: true, force: true });

    await logExportOperation(prisma, {
      operationType: 'export_item_compare',
      experimentIds,
      exportPath: zipPath,
      compressed: true,
      itemNames
    });

    return {
      canceled: false,
      success: true,
      exportPath: zipPath,
      compressed: true
    };
  }

  await logExportOperation(prisma, {
    operationType: 'export_item_compare',
    experimentIds,
    exportPath: exportRootPath,
    compressed: false,
    itemNames
  });

  return {
    canceled: false,
    success: true,
    exportPath: exportRootPath,
    compressed: false
  };
}
