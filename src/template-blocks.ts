export const XY_TEMPLATE_TYPE = 'xy' as const;
export const SPECTRUM_TEMPLATE_TYPE = 'spectrum' as const;
export const TEMPLATE_BLOCK_MAX_POINTS = 5000;
export const XY_BLOCK_MAX_POINTS = TEMPLATE_BLOCK_MAX_POINTS;
const STRUCTURED_BLOCK_PURPOSE_VALUES = [
  '',
  'spectrum',
  'iv',
  'xrd',
  'eqe',
  'responsivity',
  'custom'
] as const;

export type TemplateBlockType = typeof XY_TEMPLATE_TYPE | typeof SPECTRUM_TEMPLATE_TYPE;
export type StructuredBlockPurpose = (typeof STRUCTURED_BLOCK_PURPOSE_VALUES)[number];

export type XYPoint = {
  x: number;
  y: number;
};

export type XYCurveBlockMeta = {
  purposeType: StructuredBlockPurpose;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
  note: string;
};

export type SpectrumBlockMeta = {
  purposeType: StructuredBlockPurpose;
  spectrumAxisLabel: string;
  spectrumAxisUnit: string;
  signalLabel: string;
  signalUnit: string;
  note: string;
};

type TemplateBlockSharedFields = {
  blockId?: number;
  blockTitle: string;
  blockOrder: number;
  points: XYPoint[];
  sourceFileName: string;
  sourceFilePath: string;
  originalFileName: string;
  originalFilePath: string;
  createdAt?: string;
};

export type XYCurveBlockPayload = TemplateBlockSharedFields &
  XYCurveBlockMeta & {
    templateType: typeof XY_TEMPLATE_TYPE;
  };

export type SpectrumBlockPayload = TemplateBlockSharedFields &
  SpectrumBlockMeta & {
    templateType: typeof SPECTRUM_TEMPLATE_TYPE;
  };

export type TemplateBlockPayload = XYCurveBlockPayload | SpectrumBlockPayload;
export type TemplateBlockMeta = XYCurveBlockMeta | SpectrumBlockMeta;

export function normalizeStructuredBlockPurpose(
  value: string | null | undefined
): StructuredBlockPurpose {
  const normalized = (value || '').trim() as StructuredBlockPurpose;

  return STRUCTURED_BLOCK_PURPOSE_VALUES.includes(normalized) ? normalized : '';
}

export function trimBlockTitle(value: string) {
  return value.trim();
}

export function formatXYPointInput(points: XYPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join('\n');
}

export function getTemplateBlockTypeLabel(templateType?: TemplateBlockType) {
  void templateType;
  return '结构化数据块';
}

export function getTemplateBlockDataLabel(templateType?: TemplateBlockType) {
  void templateType;
  return 'XY 数据';
}

export function parseTemplateBlockPointInput(
  value: string,
  templateType: TemplateBlockType
) {
  const lines = value.split(/\r?\n/);
  const points: XYPoint[] = [];
  const blockLabel = getTemplateBlockTypeLabel(templateType);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    let parts: string[];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else {
      return {
        success: false as const,
        error: `第 ${index + 1} 行格式无效，仅支持 x,y 或 x<TAB>y`
      };
    }

    if (parts.length !== 2) {
      return {
        success: false as const,
        error: `第 ${index + 1} 行格式无效，仅支持 x,y 或 x<TAB>y`
      };
    }

    const x = Number(parts[0].trim());
    const y = Number(parts[1].trim());

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return {
        success: false as const,
        error: `第 ${index + 1} 行包含无效数值，请检查后重试`
      };
    }

    points.push({ x, y });

    if (points.length > TEMPLATE_BLOCK_MAX_POINTS) {
      return {
        success: false as const,
        error: `${blockLabel}最多支持 ${TEMPLATE_BLOCK_MAX_POINTS} 个数据点`
      };
    }
  }

  if (!points.length) {
    return {
      success: false as const,
      error: `请至少填写一组${getTemplateBlockDataLabel(templateType)}`
    };
  }

  return {
    success: true as const,
    points
  };
}

export function parseXYPointInput(value: string) {
  return parseTemplateBlockPointInput(value, XY_TEMPLATE_TYPE);
}

export function normalizeTemplateBlocks(
  blocks: TemplateBlockPayload[]
): TemplateBlockPayload[] {
  return blocks.map((block, index) => {
    if (block.templateType === XY_TEMPLATE_TYPE) {
      return {
        ...block,
        templateType: XY_TEMPLATE_TYPE,
        purposeType: normalizeStructuredBlockPurpose(block.purposeType),
        blockTitle: trimBlockTitle(block.blockTitle),
        blockOrder: index + 1,
        xLabel: block.xLabel.trim(),
        xUnit: block.xUnit.trim(),
        yLabel: block.yLabel.trim(),
        yUnit: block.yUnit.trim(),
        note: block.note.trim()
      };
    }

    return {
      ...block,
      templateType: SPECTRUM_TEMPLATE_TYPE,
      purposeType: normalizeStructuredBlockPurpose(block.purposeType),
      blockTitle: trimBlockTitle(block.blockTitle),
      blockOrder: index + 1,
      spectrumAxisLabel: block.spectrumAxisLabel.trim(),
      spectrumAxisUnit: block.spectrumAxisUnit.trim(),
      signalLabel: block.signalLabel.trim(),
      signalUnit: block.signalUnit.trim(),
      note: block.note.trim()
    };
  });
}

export function serializeTemplateBlockMeta(block: TemplateBlockPayload) {
  if (block.templateType === XY_TEMPLATE_TYPE) {
    const meta: XYCurveBlockMeta = {
      purposeType: normalizeStructuredBlockPurpose(block.purposeType),
      xLabel: block.xLabel.trim(),
      xUnit: block.xUnit.trim(),
      yLabel: block.yLabel.trim(),
      yUnit: block.yUnit.trim(),
      note: block.note.trim()
    };

    return JSON.stringify(meta);
  }

  const meta: SpectrumBlockMeta = {
    purposeType: normalizeStructuredBlockPurpose(block.purposeType),
    spectrumAxisLabel: block.spectrumAxisLabel.trim(),
    spectrumAxisUnit: block.spectrumAxisUnit.trim(),
    signalLabel: block.signalLabel.trim(),
    signalUnit: block.signalUnit.trim(),
    note: block.note.trim()
  };

  return JSON.stringify(meta);
}

export function parseTemplateBlockMeta(
  templateType: TemplateBlockType,
  metaJson: string
): TemplateBlockMeta {
  try {
    const parsed = JSON.parse(metaJson) as Record<string, unknown>;

    if (templateType === XY_TEMPLATE_TYPE) {
      return {
        purposeType: normalizeStructuredBlockPurpose(
          typeof parsed.purposeType === 'string' ? parsed.purposeType : ''
        ),
        xLabel: typeof parsed.xLabel === 'string' ? parsed.xLabel : '',
        xUnit: typeof parsed.xUnit === 'string' ? parsed.xUnit : '',
        yLabel: typeof parsed.yLabel === 'string' ? parsed.yLabel : '',
        yUnit: typeof parsed.yUnit === 'string' ? parsed.yUnit : '',
        note: typeof parsed.note === 'string' ? parsed.note : ''
      };
    }

    return {
      purposeType: normalizeStructuredBlockPurpose(
        typeof parsed.purposeType === 'string' ? parsed.purposeType : ''
      ),
      spectrumAxisLabel:
        typeof parsed.spectrumAxisLabel === 'string' ? parsed.spectrumAxisLabel : '',
      spectrumAxisUnit:
        typeof parsed.spectrumAxisUnit === 'string' ? parsed.spectrumAxisUnit : '',
      signalLabel: typeof parsed.signalLabel === 'string' ? parsed.signalLabel : '',
      signalUnit: typeof parsed.signalUnit === 'string' ? parsed.signalUnit : '',
      note: typeof parsed.note === 'string' ? parsed.note : ''
    };
  } catch {
    if (templateType === XY_TEMPLATE_TYPE) {
      return {
        purposeType: '',
        xLabel: '',
        xUnit: '',
        yLabel: '',
        yUnit: '',
        note: ''
      };
    }

    return {
      purposeType: '',
      spectrumAxisLabel: '',
      spectrumAxisUnit: '',
      signalLabel: '',
      signalUnit: '',
      note: ''
    };
  }
}

export function validateTemplateBlockPayloads(
  blocks: TemplateBlockPayload[]
): { success: true } | { success: false; error: string } {
  const seenTitles = new Map<TemplateBlockType, Set<string>>();

  for (const block of blocks) {
    const blockTitle = trimBlockTitle(block.blockTitle);
    const blockLabel = getTemplateBlockTypeLabel(block.templateType);

    if (!blockTitle) {
      return {
        success: false,
        error: `${blockLabel}标题不能为空`
      };
    }

    const titlesForType = seenTitles.get(block.templateType) || new Set<string>();
    if (titlesForType.has(blockTitle)) {
      return {
        success: false,
        error: `${blockLabel}标题“${blockTitle}”重复，请修改后重试`
      };
    }
    titlesForType.add(blockTitle);
    seenTitles.set(block.templateType, titlesForType);

    if (!Array.isArray(block.points) || !block.points.length) {
      return {
        success: false,
        error: `${blockLabel}“${blockTitle}”缺少有效数据点`
      };
    }

    if (block.points.length > TEMPLATE_BLOCK_MAX_POINTS) {
      return {
        success: false,
        error: `${blockLabel}“${blockTitle}”超过 ${TEMPLATE_BLOCK_MAX_POINTS} 个数据点上限`
      };
    }

    for (const point of block.points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        return {
          success: false,
          error: `${blockLabel}“${blockTitle}”包含无效数据点`
        };
      }
    }
  }

  return { success: true };
}
