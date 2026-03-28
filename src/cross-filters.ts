import type { CrossFilterChip, CrossFilterField, CrossFilterOperator } from './electron-api';
import type { StructuredBlockPurpose, TemplateBlockType } from './template-blocks';
import { trimBlockTitle, XY_TEMPLATE_TYPE } from './template-blocks';

export type CrossFilterScalarItemLike = {
  scalarRole?: string | null;
  itemName: string;
  itemValue: string;
  itemUnit?: string | null;
};

export type CrossFilterStructuredBlockLike = {
  templateType: TemplateBlockType;
  purposeType?: StructuredBlockPurpose | string | null;
  blockTitle: string;
  xLabel?: string;
  yLabel?: string;
  spectrumAxisLabel?: string;
  signalLabel?: string;
};

export type CrossFilterRecordLike = {
  sampleCode: string;
  testTime: string;
  testProject: string;
  tester: string;
  instrument: string;
  sampleOwner?: string | null;
  dataItems: CrossFilterScalarItemLike[];
  templateBlocks: CrossFilterStructuredBlockLike[];
};

const CROSS_FILTER_FIELD_LABELS: Record<CrossFilterField, string> = {
  sampleCode: '样品编号',
  testTime: '测试时间',
  testProject: '测试项目',
  tester: '测试人',
  instrument: '仪器',
  sampleOwner: '样品所属人员',
  conditionName: '实验条件名称',
  conditionValue: '实验条件值',
  metricName: '结果指标名称',
  metricValue: '结果指标值',
  secondaryName: '二级名称',
  secondaryValue: '二级值',
  structuredBlockName: '结构化数据块名称'
};

const CONDITION_NAME_KEYWORDS = [
  '温度',
  '偏压',
  '光功率',
  '波长',
  '频率',
  '环境气氛',
  '测试气氛',
  '条件',
  '气压',
  '湿度',
  'bias',
  'temperature',
  'power',
  'wavelength',
  'frequency',
  'condition',
  'atmosphere',
  'humidity'
];

const METRIC_NAME_KEYWORDS = [
  'rise time',
  'fall time',
  'responsivity',
  'eqe',
  'dark current',
  'd*',
  'detectivity',
  'nep',
  'on/off',
  'on off',
  '峰值响应',
  '截止波长',
  '响应度',
  '暗电流',
  '上升时间',
  '下降时间'
];

const STRUCTURED_BLOCK_PURPOSE_FILTER_LABELS: Record<string, string> = {
  spectrum: 'Spectrum',
  iv: 'IV',
  xrd: 'XRD',
  eqe: 'EQE',
  responsivity: 'Responsivity',
  custom: 'Custom'
};

export function getCrossFilterFieldLabel(field: CrossFilterField) {
  return CROSS_FILTER_FIELD_LABELS[field];
}

export function getCrossFilterFieldPlaceholder(field: CrossFilterField) {
  switch (field) {
    case 'sampleCode':
      return '输入样品编号';
    case 'testTime':
      return '输入测试时间';
    case 'testProject':
      return '输入测试项目';
    case 'tester':
      return '输入测试人';
    case 'instrument':
      return '输入仪器名称';
    case 'sampleOwner':
      return '输入样品所属人员';
    case 'conditionName':
      return '输入实验条件名称';
    case 'conditionValue':
      return '输入实验条件值';
    case 'metricName':
      return '输入结果指标名称';
    case 'metricValue':
      return '输入结果指标值';
    case 'secondaryName':
      return '输入二级名称';
    case 'secondaryValue':
      return '输入二级值';
    case 'structuredBlockName':
      return '输入结构化数据块名称';
  }
}

export function normalizeCrossFilterText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

export function formatCrossFilterChipLabel(chip: CrossFilterChip) {
  const operator = chip.operator || 'eq';
  const normalizedValue = chip.value.trim();
  const normalizedValue2 = (chip.value2 || '').trim();

  if (operator === 'gte') {
    return `${getCrossFilterFieldLabel(chip.field)}：>= ${normalizedValue}`;
  }

  if (operator === 'lte') {
    return `${getCrossFilterFieldLabel(chip.field)}：<= ${normalizedValue}`;
  }

  if (operator === 'between') {
    return `${getCrossFilterFieldLabel(chip.field)}：${normalizedValue} ~ ${normalizedValue2}`;
  }

  return `${getCrossFilterFieldLabel(chip.field)}：${normalizedValue}`;
}

export function supportsCrossFilterCandidatePicker(
  field: CrossFilterField,
  operator: CrossFilterOperator = 'eq'
) {
  return (
    operator === 'eq' &&
    ['conditionName', 'conditionValue', 'metricName', 'metricValue', 'structuredBlockName'].includes(field)
  );
}

export function getStructuredBlockPurposeFilterLabel(purposeType?: string | null) {
  return STRUCTURED_BLOCK_PURPOSE_FILTER_LABELS[(purposeType || '').trim()] || '';
}

export function getStructuredBlockDisplayNameForFilter(block: CrossFilterStructuredBlockLike) {
  const purposeLabel = getStructuredBlockPurposeFilterLabel(block.purposeType);
  const blockTitle = trimBlockTitle(block.blockTitle);
  const hasSpecificTitle = blockTitle && blockTitle !== '结构化数据块';
  const xLabel = block.templateType === XY_TEMPLATE_TYPE ? block.xLabel : block.spectrumAxisLabel;
  const yLabel = block.templateType === XY_TEMPLATE_TYPE ? block.yLabel : block.signalLabel;
  const axisSummary = [blockTitle, yLabel?.trim() || '', xLabel?.trim() || ''].filter(Boolean).join(' · ');

  if (hasSpecificTitle) {
    return blockTitle;
  }

  if (purposeLabel) {
    return purposeLabel;
  }

  return axisSummary || '结构化数据块';
}

function matchesExactText(left: string | null | undefined, right: string) {
  return normalizeCrossFilterText(left) === normalizeCrossFilterText(right);
}

function parsePlainNumericValue(value: string | null | undefined) {
  const trimmed = (value || '').trim();

  if (!trimmed || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferLegacyScalarRole(itemName: string): 'condition' | 'metric' {
  const normalized = normalizeCrossFilterText(itemName);

  if (!normalized) {
    return 'metric';
  }

  if (CONDITION_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return 'condition';
  }

  if (METRIC_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return 'metric';
  }

  return 'metric';
}

function resolveScalarItemRole(item: CrossFilterScalarItemLike) {
  return item.scalarRole === 'condition' || item.scalarRole === 'metric'
    ? item.scalarRole
    : inferLegacyScalarRole(item.itemName);
}

function matchesScalarValueExact(item: CrossFilterScalarItemLike, target: string) {
  const joinedWithSpace = item.itemUnit?.trim()
    ? `${item.itemValue}${item.itemValue.trim() ? ' ' : ''}${item.itemUnit}`
    : item.itemValue;
  const joinedTight = item.itemUnit?.trim()
    ? `${item.itemValue}${item.itemUnit}`
    : item.itemValue;

  return [item.itemValue, joinedWithSpace, joinedTight].some((candidate) =>
    matchesExactText(candidate, target)
  );
}

function supportsNumericRange(field: CrossFilterField) {
  return field === 'conditionValue' || field === 'metricValue' || field === 'secondaryValue';
}

function formatScalarCandidateValue(item: CrossFilterScalarItemLike) {
  return item.itemUnit?.trim()
    ? `${item.itemValue}${item.itemValue.trim() ? ' ' : ''}${item.itemUnit}`
    : item.itemValue;
}

function matchesScalarValueNumeric(item: CrossFilterScalarItemLike, chip: CrossFilterChip) {
  if (!supportsNumericRange(chip.field)) {
    return false;
  }

  const left = parsePlainNumericValue(item.itemValue);
  const right = parsePlainNumericValue(chip.value);
  const operator = chip.operator || 'eq';

  if (left === null || right === null) {
    return false;
  }

  if (operator === 'gte') {
    return left >= right;
  }

  if (operator === 'lte') {
    return left <= right;
  }

  if (operator === 'between') {
    const right2 = parsePlainNumericValue(chip.value2);
    if (right2 === null) {
      return false;
    }

    const min = Math.min(right, right2);
    const max = Math.max(right, right2);
    return left >= min && left <= max;
  }

  return false;
}

function isExactMatchChip(chip: CrossFilterChip) {
  return (chip.operator || 'eq') === 'eq';
}

function getExactChipValues(
  chips: CrossFilterChip[],
  field: CrossFilterField
) {
  return chips
    .filter((chip) => chip.field === field && isExactMatchChip(chip) && chip.value.trim())
    .map((chip) => chip.value.trim());
}

function matchesScopedScalarName(
  itemName: string,
  scopedNames: string[]
) {
  if (!scopedNames.length) {
    return true;
  }

  return scopedNames.some((name) => matchesExactText(itemName, name));
}

function matchesTopLevelField(record: CrossFilterRecordLike, chip: CrossFilterChip) {
  switch (chip.field) {
    case 'sampleCode':
      return matchesExactText(record.sampleCode, chip.value);
    case 'testTime':
      return matchesExactText(record.testTime, chip.value);
    case 'testProject':
      return matchesExactText(record.testProject, chip.value);
    case 'tester':
      return matchesExactText(record.tester, chip.value);
    case 'instrument':
      return matchesExactText(record.instrument, chip.value);
    case 'sampleOwner':
      return matchesExactText(record.sampleOwner || '', chip.value);
    default:
      return false;
  }
}

function matchesScalarItemField(record: CrossFilterRecordLike, chip: CrossFilterChip) {
  if (chip.field === 'conditionName') {
    return record.dataItems.some(
      (item) => resolveScalarItemRole(item) === 'condition' && matchesExactText(item.itemName, chip.value)
    );
  }

  if (chip.field === 'conditionValue') {
    return record.dataItems.some(
      (item) =>
        resolveScalarItemRole(item) === 'condition' &&
        (isExactMatchChip(chip)
          ? matchesScalarValueExact(item, chip.value)
          : matchesScalarValueNumeric(item, chip))
    );
  }

  if (chip.field === 'metricName') {
    return record.dataItems.some(
      (item) => resolveScalarItemRole(item) === 'metric' && matchesExactText(item.itemName, chip.value)
    );
  }

  if (chip.field === 'metricValue') {
    return record.dataItems.some(
      (item) =>
        resolveScalarItemRole(item) === 'metric' &&
        (isExactMatchChip(chip)
          ? matchesScalarValueExact(item, chip.value)
          : matchesScalarValueNumeric(item, chip))
    );
  }

  if (chip.field === 'secondaryName') {
    return record.dataItems.some((item) => matchesExactText(item.itemName, chip.value));
  }

  if (chip.field === 'secondaryValue') {
    return record.dataItems.some((item) =>
      isExactMatchChip(chip)
        ? matchesScalarValueExact(item, chip.value)
        : matchesScalarValueNumeric(item, chip)
    );
  }

  return false;
}

function matchesStructuredBlockField(record: CrossFilterRecordLike, chip: CrossFilterChip) {
  if (chip.field !== 'structuredBlockName') {
    return false;
  }

  return record.templateBlocks.some((block) => {
    const target = chip.value;
    const candidates = [
      getStructuredBlockDisplayNameForFilter(block),
      trimBlockTitle(block.blockTitle),
      getStructuredBlockPurposeFilterLabel(block.purposeType)
    ].filter(Boolean);

    return candidates.some((candidate) => matchesExactText(candidate, target));
  });
}

export function matchesCrossFilterChip(record: CrossFilterRecordLike, chip: CrossFilterChip) {
  if (!chip.value.trim()) {
    return true;
  }

  return (
    matchesTopLevelField(record, chip) ||
    matchesScalarItemField(record, chip) ||
    matchesStructuredBlockField(record, chip)
  );
}

export function matchesCrossFilterSet(
  record: CrossFilterRecordLike,
  chips: CrossFilterChip[]
) {
  const exactGroups = new Map<CrossFilterField, CrossFilterChip[]>();
  const nonExactChips: CrossFilterChip[] = [];

  for (const chip of chips) {
    if (isExactMatchChip(chip)) {
      const existing = exactGroups.get(chip.field) || [];
      existing.push(chip);
      exactGroups.set(chip.field, existing);
      continue;
    }

    nonExactChips.push(chip);
  }

  const exactGroupsMatch = Array.from(exactGroups.values()).every((group) =>
    group.some((chip) => matchesCrossFilterChip(record, chip))
  );

  if (!exactGroupsMatch) {
    return false;
  }

  return nonExactChips.every((chip) => matchesCrossFilterChip(record, chip));
}

export function collectCrossFilterCandidateValues(
  records: CrossFilterRecordLike[],
  field: CrossFilterField,
  chips: CrossFilterChip[] = []
) {
  const values = new Set<string>();
  const scopedConditionNames = getExactChipValues(chips, 'conditionName');
  const scopedMetricNames = getExactChipValues(chips, 'metricName');

  records.forEach((record) => {
    if (field === 'conditionName') {
      record.dataItems.forEach((item) => {
        if (resolveScalarItemRole(item) === 'condition' && item.itemName.trim()) {
          values.add(item.itemName.trim());
        }
      });
      return;
    }

    if (field === 'conditionValue') {
      record.dataItems.forEach((item) => {
        if (
          resolveScalarItemRole(item) === 'condition' &&
          matchesScopedScalarName(item.itemName, scopedConditionNames)
        ) {
          const candidate = formatScalarCandidateValue(item).trim();
          if (candidate) values.add(candidate);
        }
      });
      return;
    }

    if (field === 'metricName') {
      record.dataItems.forEach((item) => {
        if (resolveScalarItemRole(item) === 'metric' && item.itemName.trim()) {
          values.add(item.itemName.trim());
        }
      });
      return;
    }

    if (field === 'metricValue') {
      record.dataItems.forEach((item) => {
        if (
          resolveScalarItemRole(item) === 'metric' &&
          matchesScopedScalarName(item.itemName, scopedMetricNames)
        ) {
          const candidate = formatScalarCandidateValue(item).trim();
          if (candidate) values.add(candidate);
        }
      });
      return;
    }

    if (field === 'structuredBlockName') {
      record.templateBlocks.forEach((block) => {
        const candidate = getStructuredBlockDisplayNameForFilter(block).trim();
        if (candidate) values.add(candidate);
      });
    }
  });

  return Array.from(values).sort((left, right) => left.localeCompare(right, 'zh-CN'));
}
