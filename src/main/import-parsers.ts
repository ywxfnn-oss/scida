import path from 'node:path';
import type {
  ImportManualDelimiter,
  ImportManualPreviewRow,
  ImportManualXYReviewSupport,
  ImportPreviewXYTemplateBlockCandidate,
  PreviewManualImportXYPayload,
  SaveExperimentXYBlockPayload
} from '../electron-api';
import { XY_TEMPLATE_TYPE } from '../template-blocks';
import type {
  ImportFormatParser,
  ImportParserContext,
  ImportParserResult
} from './import-format-registry';

const MIN_DATA_POINTS = 2;
const MANUAL_PREVIEW_ROW_LIMIT = 12;
const XRD_LABEL = 'XRD 文本导入';
const XRD_PARSER_ID = 'xrd_text_generic';

type ParsedColumnHeader = {
  label: string;
  unit: string;
};

type ParsedXYRows = {
  points: Array<{ x: number; y: number }>;
  header: [ParsedColumnHeader, ParsedColumnHeader] | null;
  warnings: string[];
};

type TextRow = {
  rowNumber: number;
  rawLine: string;
};

type ManualXYParseResult =
  | {
      success: true;
      candidate: ImportPreviewXYTemplateBlockCandidate;
      manualReview: ImportManualXYReviewSupport;
    }
  | {
      success: false;
      error: string;
    };

function parseHeaderColumn(rawValue: string): ParsedColumnHeader {
  const trimmed = rawValue.trim();
  const match = trimmed.match(/^(.*?)(?:\s*[([]\s*(.*?)\s*[)\]])?$/);

  if (!match) {
    return {
      label: trimmed,
      unit: ''
    };
  }

  const label = match[1]?.trim() || trimmed;
  const unit = match[2]?.trim() || '';

  return {
    label,
    unit
  };
}

function buildBlockTitleFromFileName(fileName: string) {
  return path.parse(fileName).name.trim() || '导入XY数据';
}

function buildXRDTitleFromFileName(fileName: string) {
  const baseName = path.parse(fileName).name.trim();
  if (!baseName) {
    return 'XRD 图谱';
  }

  return /xrd|x-ray diffraction/i.test(baseName) ? baseName : `${baseName}-XRD`;
}

function splitLineByDelimiter(line: string, delimiter: ImportManualDelimiter) {
  if (delimiter === 'tab') {
    return line.split('\t').map((part) => part.trim());
  }

  if (delimiter === 'comma') {
    return line.split(',').map((part) => part.trim());
  }

  if (delimiter === 'semicolon') {
    return line.split(';').map((part) => part.trim());
  }

  return line
    .trim()
    .split(/\s+/)
    .map((part) => part.trim());
}

function splitDelimitedLine(line: string) {
  if (line.includes('\t')) {
    return splitLineByDelimiter(line, 'tab');
  }

  if (line.includes(',')) {
    return splitLineByDelimiter(line, 'comma');
  }

  if (line.includes(';')) {
    return splitLineByDelimiter(line, 'semicolon');
  }

  return splitLineByDelimiter(line, 'whitespace');
}

function isNumericPair(parts: string[]) {
  if (parts.length !== 2) {
    return false;
  }

  return parts.every((part) => part !== '' && Number.isFinite(Number(part)));
}

function getContentRows(content: string): TextRow[] {
  return content
    .split(/\r?\n/)
    .map((rawLine, index) => ({
      rowNumber: index + 1,
      rawLine
    }))
    .map((entry) => ({
      ...entry,
      rawLine: entry.rawLine.trim()
    }))
    .filter((entry) => entry.rawLine)
    .filter((entry) => !entry.rawLine.startsWith('#') && !entry.rawLine.startsWith('//'));
}

function detectSuggestedDelimiter(rows: TextRow[]): ImportManualDelimiter {
  let tabCount = 0;
  let commaCount = 0;
  let semicolonCount = 0;

  rows.slice(0, MANUAL_PREVIEW_ROW_LIMIT).forEach((row) => {
    if (row.rawLine.includes('\t')) {
      tabCount += 1;
    } else if (row.rawLine.includes(',')) {
      commaCount += 1;
    } else if (row.rawLine.includes(';')) {
      semicolonCount += 1;
    }
  });

  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) {
    return 'tab';
  }

  if (commaCount >= semicolonCount && commaCount > 0) {
    return 'comma';
  }

  if (semicolonCount > 0) {
    return 'semicolon';
  }

  return 'whitespace';
}

export function supportsTextLikeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return ['.csv', '.txt', '.dat', '.tsv'].includes(extension);
}

function buildDetectionText(fileName: string, content: string) {
  return `${fileName}\n${content}`.toLowerCase();
}

function isLikelyXRDText(fileName: string, content: string) {
  if (!supportsTextLikeExtension(fileName)) {
    return false;
  }

  const detectionText = buildDetectionText(fileName, content);
  let score = 0;

  if (detectionText.includes('xrd') || detectionText.includes('x-ray diffraction')) {
    score += 2;
  }

  if (
    detectionText.includes('2theta') ||
    detectionText.includes('2-theta') ||
    detectionText.includes('two theta') ||
    detectionText.includes('2θ')
  ) {
    score += 2;
  }

  if (detectionText.includes('intensity') || detectionText.includes('counts')) {
    score += 1;
  }

  return score >= 3;
}

function buildManualXYReviewSupportWithDelimiter(
  content: string,
  delimiter: ImportManualDelimiter,
  dataStartRow = 1
): ImportManualXYReviewSupport | null {
  const rows = getContentRows(content);

  if (!rows.length) {
    return null;
  }

  const startIndex = Math.max(0, dataStartRow - 1);
  const previewRows: ImportManualPreviewRow[] = rows
    .slice(startIndex, startIndex + MANUAL_PREVIEW_ROW_LIMIT)
    .map((row) => ({
      rowNumber: row.rowNumber,
      columns: splitLineByDelimiter(row.rawLine, delimiter)
    }));

  const maxColumnCount = previewRows.reduce(
    (max, row) => Math.max(max, row.columns.length),
    0
  );

  return {
    reviewType: 'xyText',
    suggestedDelimiter: delimiter,
    previewRows,
    maxColumnCount
  };
}

export function buildManualXYReviewSupport(
  content: string
): ImportManualXYReviewSupport | null {
  const rows = getContentRows(content);

  if (!rows.length) {
    return null;
  }

  return buildManualXYReviewSupportWithDelimiter(content, detectSuggestedDelimiter(rows));
}

function buildXYTemplateBlockCandidate(params: {
  parserId: string;
  parserLabel: string;
  detectionConfidence: 'high' | 'medium' | 'low';
  warnings: string[];
  filePath: string;
  fileName: string;
  blockTitle: string;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
  points: Array<{ x: number; y: number }>;
}): ImportPreviewXYTemplateBlockCandidate {
  const templateBlock: SaveExperimentXYBlockPayload = {
    templateType: XY_TEMPLATE_TYPE,
    blockTitle: params.blockTitle.trim() || buildBlockTitleFromFileName(params.fileName),
    blockOrder: 1,
    xLabel: params.xLabel.trim() || 'X',
    xUnit: params.xUnit.trim(),
    yLabel: params.yLabel.trim() || 'Y',
    yUnit: params.yUnit.trim(),
    note: '',
    points: params.points,
    sourceFileName: '',
    sourceFilePath: '',
    originalFileName: params.fileName,
    originalFilePath: params.filePath
  };

  return {
    candidateType: 'templateBlock',
    parserId: params.parserId,
    parserLabel: params.parserLabel,
    detectionConfidence: params.detectionConfidence,
    warnings: params.warnings,
    sourceFile: {
      filePath: params.filePath,
      fileName: params.fileName
    },
    templateBlock
  };
}

function parseTwoColumnXYContent(context: ImportParserContext): ParsedXYRows | null {
  const rows = getContentRows(context.content);

  if (!rows.length) {
    return null;
  }

  let header: [ParsedColumnHeader, ParsedColumnHeader] | null = null;
  const warnings: string[] = [];
  const points: Array<{ x: number; y: number }> = [];

  let startIndex = 0;
  const firstParts = splitDelimitedLine(rows[0].rawLine);
  if (!isNumericPair(firstParts)) {
    if (firstParts.length !== 2) {
      return null;
    }

    header = [parseHeaderColumn(firstParts[0]), parseHeaderColumn(firstParts[1])];
    startIndex = 1;
  }

  for (let index = startIndex; index < rows.length; index += 1) {
    const parts = splitDelimitedLine(rows[index].rawLine);

    if (!isNumericPair(parts)) {
      return null;
    }

    points.push({
      x: Number(parts[0]),
      y: Number(parts[1])
    });
  }

  if (points.length < MIN_DATA_POINTS) {
    return null;
  }

  if (!header) {
    warnings.push('未识别到列标题，预览已使用默认 X / Y 标签');
  }

  return {
    points,
    header,
    warnings
  };
}

export function previewManualXYCandidate(params: {
  filePath: string;
  fileName: string;
  content: string;
  payload: PreviewManualImportXYPayload;
}): ManualXYParseResult {
  const rows = getContentRows(params.content);

  if (!rows.length) {
    return {
      success: false,
      error: '导入文件中没有可用数据行'
    };
  }

  if (params.payload.xColumnIndex === params.payload.yColumnIndex) {
    return {
      success: false,
      error: 'X 列和 Y 列不能相同'
    };
  }

  const dataStartIndex = params.payload.dataStartRow - 1;
  if (dataStartIndex < 0 || dataStartIndex >= rows.length) {
    return {
      success: false,
      error: '数据起始行超出可预览范围'
    };
  }

  const points: Array<{ x: number; y: number }> = [];

  for (let index = dataStartIndex; index < rows.length; index += 1) {
    const row = rows[index];
    const columns = splitLineByDelimiter(row.rawLine, params.payload.delimiter);
    const xRaw = columns[params.payload.xColumnIndex];
    const yRaw = columns[params.payload.yColumnIndex];

    if (typeof xRaw !== 'string' || typeof yRaw !== 'string') {
      return {
        success: false,
        error: `第 ${row.rowNumber} 行缺少所选列，请调整分隔符、起始行或列号`
      };
    }

    const x = Number(xRaw);
    const y = Number(yRaw);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return {
        success: false,
        error: `第 ${row.rowNumber} 行的所选 X/Y 列不是有效数值`
      };
    }

    points.push({ x, y });
  }

  if (points.length < MIN_DATA_POINTS) {
    return {
      success: false,
      error: '至少需要两行有效 XY 数据'
    };
  }

  return {
    success: true,
    candidate: buildXYTemplateBlockCandidate({
      parserId: 'manual_xy_mapping',
      parserLabel: '手动 XY 映射',
      detectionConfidence: 'low',
      warnings: ['该预览来自手动映射，请确认列选择和起始行'],
      filePath: params.filePath,
      fileName: params.fileName,
      blockTitle: params.payload.blockTitle,
      xLabel: params.payload.xLabel,
      xUnit: params.payload.xUnit,
      yLabel: params.payload.yLabel,
      yUnit: params.payload.yUnit,
      points
    }),
    manualReview:
      buildManualXYReviewSupportWithDelimiter(
        params.content,
        params.payload.delimiter,
        params.payload.dataStartRow
      ) || {
        reviewType: 'xyText',
        suggestedDelimiter: params.payload.delimiter,
        previewRows: [],
        maxColumnCount: 0
      }
  };
}

function parseXRDTextContent(context: ImportParserContext) {
  const rows = getContentRows(context.content);

  if (!rows.length) {
    return null;
  }

  const points: Array<{ x: number; y: number }> = [];
  const warnings: string[] = [];
  let dataStarted = false;

  for (const row of rows) {
    const parts = splitDelimitedLine(row.rawLine);

    if (isNumericPair(parts)) {
      points.push({
        x: Number(parts[0]),
        y: Number(parts[1])
      });
      dataStarted = true;
      continue;
    }

    if (dataStarted) {
      break;
    }
  }

  if (points.length < MIN_DATA_POINTS) {
    return null;
  }

  warnings.push('已按 XRD 文本格式设置默认坐标标签，请确认是否符合原始文件含义');

  return {
    points,
    warnings
  };
}

export const xrdTextParser: ImportFormatParser = {
  id: XRD_PARSER_ID,
  label: XRD_LABEL,
  canParse(context) {
    return isLikelyXRDText(context.file.fileName, context.content);
  },
  parse(context): ImportParserResult {
    const parsed = parseXRDTextContent(context);

    if (!parsed) {
      return {
        matched: false,
        parserId: this.id,
        parserLabel: this.label,
        warnings: [],
        error: '识别为 XRD 候选文件，但未解析出有效的双列衍射数据'
      };
    }

    const candidate = buildXYTemplateBlockCandidate({
      parserId: this.id,
      parserLabel: this.label,
      detectionConfidence: 'high',
      warnings: parsed.warnings,
      filePath: context.file.filePath,
      fileName: context.file.fileName,
      blockTitle: buildXRDTitleFromFileName(context.file.fileName),
      xLabel: '2θ',
      xUnit: 'degree',
      yLabel: 'Intensity',
      yUnit: 'a.u.',
      points: parsed.points
    });

    return {
      matched: true,
      parserId: this.id,
      parserLabel: this.label,
      detectionConfidence: candidate.detectionConfidence,
      warnings: parsed.warnings,
      candidates: [candidate]
    };
  }
};

export const genericTwoColumnXYParser: ImportFormatParser = {
  id: 'generic_xy_delimited',
  label: '通用双列 XY 文本/CSV',
  canParse(context) {
    return supportsTextLikeExtension(context.file.fileName);
  },
  parse(context): ImportParserResult {
    const parsed = parseTwoColumnXYContent(context);

    if (!parsed) {
      return {
        matched: false,
        parserId: this.id,
        parserLabel: this.label,
        warnings: [],
        error: '未识别为支持的双列 XY 文本/CSV 格式'
      };
    }

    const xHeader = parsed.header?.[0] || { label: 'X', unit: '' };
    const yHeader = parsed.header?.[1] || { label: 'Y', unit: '' };
    const candidate = buildXYTemplateBlockCandidate({
      parserId: this.id,
      parserLabel: this.label,
      detectionConfidence: parsed.header ? 'high' : 'medium',
      warnings: parsed.warnings,
      filePath: context.file.filePath,
      fileName: context.file.fileName,
      blockTitle: buildBlockTitleFromFileName(context.file.fileName),
      xLabel: xHeader.label,
      xUnit: xHeader.unit,
      yLabel: yHeader.label,
      yUnit: yHeader.unit,
      points: parsed.points
    });

    return {
      matched: true,
      parserId: this.id,
      parserLabel: this.label,
      detectionConfidence: candidate.detectionConfidence,
      warnings: parsed.warnings,
      candidates: [candidate]
    };
  }
};
