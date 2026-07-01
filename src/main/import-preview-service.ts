import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { dialog } from 'electron';
import type {
  ImportPreviewFileResult,
  ImportPreviewPayload,
  ImportResolvedEncoding,
  ImportPreviewResult,
  ImportTextEncoding,
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

function stripBom(text: string) {
  return text.replace(/^\uFEFF/, '');
}

function tryDecodeBuffer(buffer: Buffer, encoding: ImportResolvedEncoding) {
  try {
    const decoder =
      encoding === 'utf8'
        ? new TextDecoder('utf-8', { fatal: false })
        : encoding === 'utf16'
          ? new TextDecoder('utf-16le', { fatal: false })
          : new TextDecoder('gb18030', { fatal: false });
    return stripBom(decoder.decode(buffer));
  } catch {
    return '';
  }
}

function scoreDecodedText(text: string) {
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const nulCount = text.split('\0').length - 1;
  return replacementCount * 10 + nulCount * 8;
}

function detectBomEncoding(buffer: Buffer): ImportResolvedEncoding | null {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf8';
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'utf16';
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return 'utf16';
  }

  return null;
}

function decodeImportBuffer(buffer: Buffer, requestedEncoding: ImportTextEncoding = 'auto') {
  const bomEncoding = detectBomEncoding(buffer);
  if (requestedEncoding !== 'auto') {
    const resolvedEncoding: ImportResolvedEncoding =
      requestedEncoding === 'gbk' ? 'gbk' : requestedEncoding === 'utf16' ? 'utf16' : 'utf8';
    const content = tryDecodeBuffer(buffer, requestedEncoding === 'gbk' ? 'gbk' : requestedEncoding);
    return {
      content,
      selectedEncoding: requestedEncoding,
      resolvedEncoding
    };
  }

  const explicitEncoding = bomEncoding;
  if (explicitEncoding) {
    return {
      content: tryDecodeBuffer(buffer, explicitEncoding),
      selectedEncoding: 'auto' as const,
      resolvedEncoding: explicitEncoding
    };
  }

  const candidates: Array<{ encoding: ImportResolvedEncoding; content: string; score: number }> = ([
    'utf8',
    'gbk',
    'utf16'
  ] as const).map((encoding) => {
    const content = tryDecodeBuffer(buffer, encoding);
    return { encoding, content, score: scoreDecodedText(content) };
  });

  candidates.sort((left, right) => left.score - right.score);
  const best = candidates[0] || { encoding: 'utf8' as ImportResolvedEncoding, content: '', score: 0 };

  return {
    content: best.content,
    selectedEncoding: 'auto' as const,
    resolvedEncoding: best.encoding
  };
}

function buildRecognitionState(previewFile: ImportPreviewFileResult) {
  if (previewFile.matched && previewFile.candidates.length) {
    return {
      recognitionStatus: 'success' as const,
      recognitionMessage: `自动识别成功：${previewFile.parserLabel || '已识别数据格式'}`
    };
  }

  if (previewFile.manualReview) {
    return {
      recognitionStatus: 'uncertain' as const,
      recognitionMessage: '自动识别不确定，需手动选择数据区域'
    };
  }

  return {
    recognitionStatus: 'failed' as const,
    recognitionMessage: previewFile.error || '识别失败'
  };
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
    const buffer = fs.readFileSync(filePath);
    const decoded = decodeImportBuffer(buffer, payload.textEncoding || 'auto');
    const content = decoded.content;
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
        manualReview,
        {
          selectedEncoding: decoded.selectedEncoding,
          resolvedEncoding: decoded.resolvedEncoding,
          recognitionStatus: manualReview ? 'uncertain' : 'failed',
          recognitionMessage: manualReview
            ? '自动识别不确定，需手动选择数据区域'
            : '识别失败'
        }
      );
    }

    const result = parser.parse({
      file: selectedFile,
      content
    });

    const previewFile = convertParserResultToPreviewFile(selectedFile, result, {
      selectedEncoding: decoded.selectedEncoding,
      resolvedEncoding: decoded.resolvedEncoding,
      recognitionStatus: result.matched ? 'success' : manualReview ? 'uncertain' : 'failed',
      recognitionMessage: result.matched
        ? `自动识别成功：${result.parserLabel}`
        : manualReview
          ? '自动识别不确定，需手动选择数据区域'
          : ('error' in result ? result.error : '识别失败'),
      manualReview
    });

    return {
      ...previewFile,
      ...buildRecognitionState(previewFile)
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
  const decoded = decodeImportBuffer(fs.readFileSync(filePath), payload.textEncoding || 'auto');
  const content = decoded.content;
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
      error: failureResult.error,
      selectedEncoding: decoded.selectedEncoding,
      resolvedEncoding: decoded.resolvedEncoding,
      recognitionStatus: 'uncertain',
      recognitionMessage: failureResult.error
    };
  }

  return {
    success: true,
    candidate: result.candidate,
    manualReview: result.manualReview,
    selectedEncoding: decoded.selectedEncoding,
    resolvedEncoding: decoded.resolvedEncoding,
    recognitionStatus: 'uncertain',
    recognitionMessage: '已按手动选择区域重新生成预览'
  };
}
