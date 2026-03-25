import type {
  ImportPreviewCandidate,
  ImportPreviewFileResult,
  ImportManualXYReviewSupport,
  ImportSelectedFile
} from '../electron-api';

export type ImportDetectionConfidence = 'high' | 'medium' | 'low';

export type ImportParserContext = {
  file: ImportSelectedFile;
  content: string;
};

export type ImportParserSuccess = {
  matched: true;
  parserId: string;
  parserLabel: string;
  detectionConfidence: ImportDetectionConfidence;
  warnings: string[];
  candidates: ImportPreviewCandidate[];
};

export type ImportParserFailure = {
  matched: false;
  parserId: string;
  parserLabel: string;
  warnings: string[];
  error: string;
};

export type ImportParserResult = ImportParserSuccess | ImportParserFailure;

export type ImportFormatParser = {
  id: string;
  label: string;
  canParse: (context: ImportParserContext) => boolean;
  parse: (context: ImportParserContext) => ImportParserResult;
};

export function buildUnmatchedImportResult(
  file: ImportSelectedFile,
  error: string,
  manualReview?: ImportManualXYReviewSupport
): ImportPreviewFileResult {
  return {
    filePath: file.filePath,
    fileName: file.fileName,
    matched: false,
    parserId: null,
    parserLabel: null,
    warnings: [],
    error,
    manualReview,
    candidates: []
  };
}

export function convertParserResultToPreviewFile(
  file: ImportSelectedFile,
  result: ImportParserResult
): ImportPreviewFileResult {
  if (!result.matched) {
    const failureResult = result as ImportParserFailure;

    return {
      filePath: file.filePath,
      fileName: file.fileName,
      matched: false,
      parserId: failureResult.parserId,
      parserLabel: failureResult.parserLabel,
      warnings: failureResult.warnings,
      error: failureResult.error,
      manualReview: undefined,
      candidates: []
    };
  }

  return {
    filePath: file.filePath,
    fileName: file.fileName,
    matched: true,
    parserId: result.parserId,
    parserLabel: result.parserLabel,
    warnings: result.warnings,
    manualReview: undefined,
    candidates: result.candidates
  };
}
