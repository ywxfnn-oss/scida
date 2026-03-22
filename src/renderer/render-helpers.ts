import type {
  DuplicateExperimentMatch,
  OperationLogFilter,
  GroupByType,
  RecentOperationLogEntry
} from '../electron-api';

type ExportModeType = 'full' | 'single-item' | 'all-items';

type DynamicFieldLike = {
  id: string;
  name: string;
  value: string;
};

type DataItemLike = {
  id: string;
  itemName: string;
  itemValue: string;
  itemUnit: string;
  sourceFileName: string;
  sourceFilePath: string;
  originalFileName: string;
  replacementOriginalName?: string;
};

type Step1FormDataLike = {
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
};

export function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function getPendingOriginalName(item: DataItemLike) {
  return item.replacementOriginalName || item.originalFileName || '-';
}

export function formatTestTimeForDisplay(value: string) {
  if (!value) return '';
  return value.replace('T', '-').replaceAll(':', '-');
}

export function formatDateTimeForDisplay(value: string) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildDisplayName(step1FormData: Step1FormDataLike) {
  const parts = [
    step1FormData.testProject,
    step1FormData.sampleCode,
    step1FormData.tester,
    step1FormData.instrument,
    formatTestTimeForDisplay(step1FormData.testTime)
  ].filter(Boolean);

  return parts.length ? parts.join('-') : '未生成名称';
}

export function renderExportModal(params: {
  exportModalVisible: boolean;
  selectedExperimentIds: number[];
  exportMode: ExportModeType;
  exportAvailableItemNames: string[];
  exportSelectedItemName: string;
  exportCompressAfter: boolean;
  exportLoading: boolean;
}) {
  const {
    exportModalVisible,
    selectedExperimentIds,
    exportMode,
    exportAvailableItemNames,
    exportSelectedItemName,
    exportCompressAfter,
    exportLoading
  } = params;

  if (!exportModalVisible) return '';

  return `
    <div class="export-modal-mask">
      <div class="export-modal-card">
        <div class="export-modal-title">导出选中实验数据</div>
        <div class="export-modal-desc">
          当前已选择 <strong>${selectedExperimentIds.length}</strong> 条实验记录
        </div>

        <div class="form-group">
          <label class="form-label">导出模式</label>

          <label class="checkbox-row">
            <input
              type="radio"
              name="export-mode"
              value="full"
              ${exportMode === 'full' ? 'checked' : ''}
            />
            <span>完整资料导出（详情说明表 + 原始文件）</span>
          </label>

          <label class="checkbox-row">
            <input
              type="radio"
              name="export-mode"
              value="single-item"
              ${exportMode === 'single-item' ? 'checked' : ''}
            />
            <span>导出某一个二级数据项名称</span>
          </label>

          <label class="checkbox-row">
            <input
              type="radio"
              name="export-mode"
              value="all-items"
              ${exportMode === 'all-items' ? 'checked' : ''}
            />
            <span>导出全部二级数据项名称</span>
          </label>
        </div>

        ${exportMode === 'single-item'
      ? `
              <div class="form-group">
                <label class="form-label">选择二级数据项名称</label>
                ${exportAvailableItemNames.length
          ? `
                      <select id="export-item-name-select" class="form-input">
                        ${exportAvailableItemNames
              .map(
                (name) => `
                              <option value="${escapeHtml(name)}" ${exportSelectedItemName === name ? 'selected' : ''
                  }>
                                ${escapeHtml(name)}
                              </option>
                            `
              )
              .join('')}
                      </select>
                    `
          : `<div class="export-mode-tip">当前所选实验中没有可导出的二级数据项名称</div>`
        }
              </div>
            `
      : ''
    }

        ${exportMode === 'all-items'
      ? `
              <div class="form-group">
                <label class="form-label">导出说明</label>
                <div class="export-mode-tip">
                  将按二级数据项名称自动分类生成文件夹。每个名称文件夹内包含：
                  Excel 对比表 + 对应原始文件（按样品编号分子文件夹）。
                </div>
              </div>
            `
      : ''
    }

        <div class="form-group">
          <label class="form-label">导出形式</label>
          <label class="checkbox-row">
            <input id="export-compress-checkbox" type="checkbox" ${exportCompressAfter ? 'checked' : ''} />
            <span>导出后压缩成 zip</span>
          </label>
        </div>

        <div class="export-modal-actions">
          <button id="export-cancel-btn" class="secondary-btn">取消</button>
          <button id="export-confirm-btn" class="primary-btn">
            ${exportLoading ? '导出中...' : '开始导出'}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderDeleteModal(params: {
  deleteModalVisible: boolean;
  deleteTargetIds: number[];
  deleteLoading: boolean;
}) {
  const { deleteModalVisible, deleteTargetIds, deleteLoading } = params;

  if (!deleteModalVisible || !deleteTargetIds.length) return '';

  return `
    <div class="export-modal-mask">
      <div class="export-modal-card">
        <div class="export-modal-title">永久删除实验数据</div>
        <div class="export-modal-desc">
          将永久删除 <strong>${deleteTargetIds.length}</strong> 条已选实验记录及其关联动态字段、二级数据项、编辑记录和已保存文件。此操作不可恢复。
        </div>

        <div class="export-modal-actions">
          <button id="delete-cancel-btn" class="secondary-btn" type="button">取消</button>
          <button
            id="delete-confirm-btn"
            class="danger-btn"
            type="button"
            ${deleteLoading ? 'disabled' : ''}
          >
            ${deleteLoading ? '删除中...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderDuplicateWarningModal(params: {
  visible: boolean;
  actionLabel: string;
  sampleCode: string;
  testProject: string;
  testTime: string;
  matches: DuplicateExperimentMatch[];
  submitting: boolean;
}) {
  const {
    visible,
    actionLabel,
    sampleCode,
    testProject,
    testTime,
    matches,
    submitting
  } = params;

  if (!visible || !matches.length) return '';

  return `
    <div class="export-modal-mask">
      <div class="export-modal-card">
        <div class="export-modal-title">发现可能重复的实验记录</div>
        <div class="export-modal-desc">
          这是提示，不会阻止${escapeHtml(actionLabel)}。你可以返回编辑、查看已有记录，或仍然继续${escapeHtml(actionLabel)}。
        </div>

        <div class="detail-section">
          <div class="detail-section-title">匹配规则</div>
          <div class="detail-list">
            <div class="detail-list-item">
              <span class="detail-list-key">样品编号</span>
              <span class="detail-list-value">${escapeHtml(sampleCode || '-')}</span>
            </div>
            <div class="detail-list-item">
              <span class="detail-list-key">测试项目</span>
              <span class="detail-list-value">${escapeHtml(testProject || '-')}</span>
            </div>
            <div class="detail-list-item">
              <span class="detail-list-key">测试时间</span>
              <span class="detail-list-value">${escapeHtml(testTime || '-')}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">匹配到的现有记录</div>
          <div class="detail-list">
            ${matches
              .map(
                (match) => `
                  <div class="detail-list-item">
                    <div class="detail-list-key">#${match.id} ${escapeHtml(match.displayName)}</div>
                    <div class="detail-list-value">
                      样品编号：${escapeHtml(match.sampleCode)}<br />
                      测试项目：${escapeHtml(match.testProject)}<br />
                      测试时间：${escapeHtml(match.testTime)}<br />
                      测试人：${escapeHtml(match.tester)}<br />
                      测试仪器：${escapeHtml(match.instrument)}
                    </div>
                    <button
                      class="secondary-btn"
                      type="button"
                      data-open-duplicate-match-id="${match.id}"
                      ${submitting ? 'disabled' : ''}
                    >
                      查看详情
                    </button>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>

        <div class="export-modal-actions">
          <button
            id="duplicate-warning-cancel-btn"
            class="secondary-btn"
            type="button"
            ${submitting ? 'disabled' : ''}
          >
            返回编辑
          </button>
          <button
            id="duplicate-warning-continue-btn"
            class="primary-btn"
            type="button"
            ${submitting ? 'disabled' : ''}
          >
            ${submitting ? `${escapeHtml(actionLabel)}中...` : `仍然${escapeHtml(actionLabel)}`}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderGroupTabs(current: GroupByType) {
  const tabs: { key: GroupByType; label: string }[] = [
    { key: 'sampleCode', label: '按样品编号' },
    { key: 'testProject', label: '按测试项目' },
    { key: 'testTime', label: '按测试时间' },
    { key: 'instrument', label: '按测试仪器' },
    { key: 'tester', label: '按测试人' },
    { key: 'sampleOwner', label: '按样品所属人员' }
  ];

  return tabs
    .map(
      (tab) => `
        <button
          class="group-tab-btn ${current === tab.key ? 'active-group-tab' : ''}"
          data-groupby="${tab.key}"
          type="button"
        >
          ${tab.label}
        </button>
      `
    )
    .join('');
}

export function renderOperationLogFilterButtons(
  currentFilter: OperationLogFilter,
  disabled: boolean
) {
  const filters: Array<{ key: OperationLogFilter; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'delete', label: '删除' },
    { key: 'export', label: '导出' }
  ];

  return filters
    .map(
      (filter) => `
        <button
          class="${currentFilter === filter.key ? 'primary-btn' : 'secondary-btn'} action-btn"
          type="button"
          data-operation-log-filter="${filter.key}"
          ${disabled ? 'disabled' : ''}
        >
          ${filter.label}
        </button>
      `
    )
    .join('');
}

export function renderRecentOperationLogs(entries: RecentOperationLogEntry[]) {
  if (!entries.length) {
    return `<div class="detail-value">暂无最近操作日志</div>`;
  }

  return `
    <div class="detail-list">
      ${entries
        .map(
          (entry) => `
            <div class="detail-list-item">
              <div class="detail-list-key">${escapeHtml(formatDateTimeForDisplay(entry.createdAt))}</div>
              <div class="detail-list-value">
                操作类型：${escapeHtml(entry.operationType)}<br />
                实验编号：${escapeHtml(entry.experimentId !== null ? String(entry.experimentId) : '-')}<br />
                操作人：${escapeHtml(entry.actor || '-')}<br />
                摘要：${escapeHtml(entry.summaryText || '-')}
              </div>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

export function renderDetailPair(label: string, value: string) {
  return `
    <div class="detail-item">
      <div class="detail-label">${escapeHtml(label)}</div>
      <div class="detail-value">${escapeHtml(value)}</div>
    </div>
  `;
}

export function renderDetailEditInput(
  id: string,
  label: string,
  value: string,
  type = 'text'
) {
  return `
    <div class="detail-item">
      <div class="detail-label">${escapeHtml(label)}</div>
      <input id="${id}" class="form-input" type="${type}" value="${escapeHtml(value)}" />
    </div>
  `;
}

export function renderDynamicFields(fields: DynamicFieldLike[]) {
  if (!fields.length) {
    return `<div class="empty-tip">当前还没有新增字段</div>`;
  }

  return fields
    .map(
      (field, index) => `
        <div class="dynamic-row">
          <div class="dynamic-index">字段 ${index + 1}</div>

          <div class="dynamic-inputs">
            <input
              id="dynamic-name-${field.id}"
              class="form-input"
              placeholder="字段名称，如 送检部门"
              value="${escapeHtml(field.name)}"
            />
            <input
              id="dynamic-value-${field.id}"
              class="form-input"
              placeholder="字段值"
              value="${escapeHtml(field.value)}"
            />
          </div>

          <button
            class="danger-btn"
            type="button"
            data-remove-dynamic-id="${field.id}"
          >
            删除
          </button>
        </div>
      `
    )
    .join('');
}

export function renderStep2Rows(rows: DataItemLike[]) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>
            <input
              id="item-name-${row.id}"
              class="table-input"
              placeholder="如：能量解析"
              value="${escapeHtml(row.itemName)}"
            />
          </td>
          <td>
            <input
              id="item-value-${row.id}"
              class="table-input"
              placeholder="请输入数值"
              value="${escapeHtml(row.itemValue)}"
            />
          </td>
          <td>
            <input
              id="item-unit-${row.id}"
              class="table-input"
              placeholder="如：keV"
              value="${escapeHtml(row.itemUnit)}"
            />
          </td>
          <td>
            <button
              class="file-btn"
              type="button"
              data-file-row-id="${row.id}"
              title="${escapeHtml(row.sourceFilePath || '')}"
            >
              ${row.sourceFileName ? escapeHtml(row.sourceFileName) : '选择原始文件'}
            </button>
          </td>
          <td>
            <button
              class="danger-btn small-danger-btn"
              type="button"
              data-remove-row-id="${row.id}"
            >
              删除
            </button>
          </td>
        </tr>
      `
    )
    .join('');
}
