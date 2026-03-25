import fs from 'node:fs';
import path from 'node:path';
import { dialog } from 'electron';
import type {
  ImportPreviewPayload,
  ImportPreviewResult,
  ImportSelectedFile,
  PreviewManualImportXYPayload,
  PreviewManualImportXYResult,
  SelectImportFilesResult
} from '../electron-api';
import {
  buildUnmatchedImportResult,
  convertParserResultToPreviewFile,
  type ImportFormatParser
} from './import-format-registry';
import {
  buildManualXYReviewSupport,
  genericTwoColumnXYParser,
  previewManualXYCandidate,
  supportsTextLikeExtension,
  xrdTextParser
} from './import-parsers';

const IMPORT_FORMAT_PARSERS: ImportFormatParser[] = [
  xrdTextParser,
  genericTwoColumnXYParser
];

function buildSelectedFile(filePath: string): ImportSelectedFile {
  const stat = fs.statSync(filePath);

  return {
    filePath,
    fileName: path.basename(filePath),
    sizeBytes: stat.size
  };
}

function readImportFileAsUtf8(filePath: string) {
  return fs.readFileSync(filePath, 'utf8');
}

export async function selectImportFiles(): Promise<SelectImportFilesResult> {
  const result = await dialog.showOpenDialog({
    title: '选择导入文件',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Text / CSV',
        extensions: ['csv', 'txt', 'dat', 'tsv']
      },
      {
        name: 'All Files',
        extensions: ['*']
      }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return [];
  }

  return result.filePaths.map(buildSelectedFile);
}

export async function previewImportFiles(
  payload: ImportPreviewPayload
): Promise<ImportPreviewResult> {
  const uniquePaths = Array.from(
    new Set(payload.filePaths.map((filePath) => path.resolve(filePath.trim())).filter(Boolean))
  );

  const files = uniquePaths.map((filePath) => {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return buildUnmatchedImportResult(
        {
          filePath,
          fileName: path.basename(filePath),
          sizeBytes: 0
        },
        '导入文件不存在或路径无效'
      );
    }

    const selectedFile = buildSelectedFile(filePath);
    const content = readImportFileAsUtf8(filePath);
    const parser = IMPORT_FORMAT_PARSERS.find((candidate) =>
      candidate.canParse({ file: selectedFile, content })
    );
    const manualReview = supportsTextLikeExtension(selectedFile.fileName)
      ? buildManualXYReviewSupport(content) || undefined
      : undefined;

    if (!parser) {
      return buildUnmatchedImportResult(
        selectedFile,
        '当前版本未识别该文件格式，后续应降级到半手动映射流程',
        manualReview
      );
    }

    const result = parser.parse({
      file: selectedFile,
      content
    });

    if (!result.matched) {
      return {
        ...convertParserResultToPreviewFile(selectedFile, result),
        manualReview
      };
    }

    return {
      ...convertParserResultToPreviewFile(selectedFile, result),
      manualReview
    };
  });

  return { files };
}

export async function previewManualImportXY(
  payload: PreviewManualImportXYPayload
): Promise<PreviewManualImportXYResult> {
  const filePath = path.resolve(payload.filePath.trim());

  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return {
      success: false,
      error: '导入文件不存在或路径无效'
    };
  }

  const fileName = path.basename(filePath);
  const content = readImportFileAsUtf8(filePath);
  const result = previewManualXYCandidate({
    filePath,
    fileName,
    content,
    payload
  });

  if (!result.success) {
    const failureResult = result as { success: false; error: string };

    return {
      success: false,
      error: failureResult.error
    };
  }

  return {
    success: true,
    candidate: result.candidate,
    manualReview: result.manualReview
  };
}
