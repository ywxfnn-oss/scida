import type { CrossFilterChip, CrossFilterField } from './electron-api';
import type { StructuredBlockPurpose, TemplateBlockType } from './template-blocks';
import { trimBlockTitle, XY_TEMPLATE_TYPE } from './template-blocks';

export type CrossFilterScalarItemLike = {
  itemName: string;
  itemValue: string;
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
  secondaryName: '二级名称',
  secondaryValue: '二级值',
  structuredBlockName: '结构化数据块名称'
};

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
  return `${getCrossFilterFieldLabel(chip.field)}：${chip.value.trim()}`;
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
  if (chip.field === 'secondaryName') {
    return record.dataItems.some((item) => matchesExactText(item.itemName, chip.value));
  }

  if (chip.field === 'secondaryValue') {
    return record.dataItems.some((item) => matchesExactText(item.itemValue, chip.value));
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
  return chips.every((chip) => matchesCrossFilterChip(record, chip));
}
