import { escapeHtml } from './render-helpers';

export type ImportReviewCandidateLike = {
  id: string;
  parserLabel: string;
  detectionConfidence: 'high' | 'medium' | 'low';
  warnings: string[];
  blockTitle: string;
  primaryLabel: string;
  primaryUnit: string;
  secondaryLabel: string;
  secondaryUnit: string;
  dataText: string;
  pointCount: number;
  attached: boolean;
};

export type ImportReviewManualStateLike = {
  available: boolean;
  delimiter: 'comma' | 'tab' | 'semicolon' | 'whitespace';
  suggestedDelimiter: 'comma' | 'tab' | 'semicolon' | 'whitespace';
  previewRows: Array<{
    rowNumber: number;
    columns: string[];
  }>;
  maxColumnCount: number;
  dataStartRow: number;
  xColumnIndex: number;
  yColumnIndex: number;
  blockTitle: string;
  primaryLabel: string;
  primaryUnit: string;
  secondaryLabel: string;
  secondaryUnit: string;
  previewLoading: boolean;
  previewError: string;
};

export type ImportReviewFileLike = {
  filePath: string;
  fileName: string;
  matched: boolean;
  parserId: string | null;
  parserLabel: string | null;
  warnings: string[];
  error?: string;
  manualReview?: ImportReviewManualStateLike;
  candidates: ImportReviewCandidateLike[];
};

function renderWarningList(warnings: string[]) {
  if (!warnings.length) {
    return '';
  }

  return `
    <div class="import-preview-warning-list">
      ${warnings
        .map((warning) => `<div class="import-preview-warning-item">${escapeHtml(warning)}</div>`)
        .join('')}
    </div>
  `;
}

function getConfidenceLabel(confidence: 'high' | 'medium' | 'low') {
  if (confidence === 'high') {
    return '高';
  }

  if (confidence === 'medium') {
    return '中';
  }

  return '低';
}

function renderCandidateCard(candidate: ImportReviewCandidateLike, loading: boolean) {
  return `
    <div class="import-preview-candidate-card">
      <div class="import-preview-candidate-header">
        <div>
          <div class="import-preview-candidate-title">${escapeHtml(candidate.parserLabel)}</div>
          <div class="import-preview-candidate-meta">
            识别置信度：${getConfidenceLabel(candidate.detectionConfidence)} · 数据点数：${candidate.pointCount}
          </div>
        </div>
        <button
          class="primary-btn"
          type="button"
          data-import-attach-candidate-id="${escapeHtml(candidate.id)}"
          ${candidate.attached || loading ? 'disabled' : ''}
        >
          ${candidate.attached ? '已附加' : '附加到模板块'}
        </button>
      </div>

      ${renderWarningList(candidate.warnings)}

      <div class="template-block-grid">
        <div class="form-group">
          <label class="form-label">二级数据项名称</label>
          <input
            id="import-candidate-title-${candidate.id}"
            class="form-input"
            value="${escapeHtml(candidate.blockTitle)}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">X 轴名称</label>
          <input
            id="import-candidate-primary-label-${candidate.id}"
            class="form-input"
            value="${escapeHtml(candidate.primaryLabel)}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">X 轴单位</label>
          <input
            id="import-candidate-primary-unit-${candidate.id}"
            class="form-input"
            value="${escapeHtml(candidate.primaryUnit)}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Y 轴名称</label>
          <input
            id="import-candidate-secondary-label-${candidate.id}"
            class="form-input"
            value="${escapeHtml(candidate.secondaryLabel)}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Y 轴单位</label>
          <input
            id="import-candidate-secondary-unit-${candidate.id}"
            class="form-input"
            value="${escapeHtml(candidate.secondaryUnit)}"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">数据预览</label>
        <textarea class="template-block-textarea template-block-readonly-textarea" readonly>${escapeHtml(candidate.dataText)}</textarea>
      </div>
    </div>
  `;
}

function renderManualReviewPanel(file: ImportReviewFileLike, loading: boolean) {
  const manualReview = file.manualReview;

  if (!manualReview?.available) {
    return '';
  }

  return `
    <div class="import-manual-review-panel">
      <div class="import-manual-review-title">手动 XY 映射</div>
      <div class="import-manual-review-subtitle">当自动识别失败时，可手动指定数据起始行、分隔符和 X/Y 列</div>

      <div class="template-block-grid">
        <div class="form-group">
          <label class="form-label">数据起始行</label>
          <input
            id="import-manual-start-row-${escapeHtml(file.filePath)}"
            class="form-input"
            type="number"
            min="1"
            value="${manualReview.dataStartRow}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">分隔符</label>
          <select
            id="import-manual-delimiter-${escapeHtml(file.filePath)}"
            class="form-input"
          >
            <option value="comma" ${manualReview.delimiter === 'comma' ? 'selected' : ''}>逗号</option>
            <option value="tab" ${manualReview.delimiter === 'tab' ? 'selected' : ''}>Tab</option>
            <option value="semicolon" ${manualReview.delimiter === 'semicolon' ? 'selected' : ''}>分号</option>
            <option value="whitespace" ${manualReview.delimiter === 'whitespace' ? 'selected' : ''}>空白字符</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">X 列</label>
          <input
            id="import-manual-x-column-${escapeHtml(file.filePath)}"
            class="form-input"
            type="number"
            min="1"
            value="${manualReview.xColumnIndex + 1}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Y 列</label>
          <input
            id="import-manual-y-column-${escapeHtml(file.filePath)}"
            class="form-input"
            type="number"
            min="1"
            value="${manualReview.yColumnIndex + 1}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">二级数据项名称</label>
          <input
            id="import-manual-title-${escapeHtml(file.filePath)}"
            class="form-input"
            value="${escapeHtml(manualReview.blockTitle)}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">X 轴名称</label>
          <input
            id="import-manual-primary-label-${escapeHtml(file.filePath)}"
            class="form-input"
            value="${escapeHtml(manualReview.primaryLabel)}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">X 轴单位</label>
          <input
            id="import-manual-primary-unit-${escapeHtml(file.filePath)}"
            class="form-input"
            value="${escapeHtml(manualReview.primaryUnit)}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Y 轴名称</label>
          <input
            id="import-manual-secondary-label-${escapeHtml(file.filePath)}"
            class="form-input"
            value="${escapeHtml(manualReview.secondaryLabel)}"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Y 轴单位</label>
          <input
            id="import-manual-secondary-unit-${escapeHtml(file.filePath)}"
            class="form-input"
            value="${escapeHtml(manualReview.secondaryUnit)}"
          />
        </div>
      </div>

      <button
        class="secondary-btn"
        type="button"
        data-import-manual-preview-file="${escapeHtml(file.filePath)}"
        ${manualReview.previewLoading || loading ? 'disabled' : ''}
      >
        ${manualReview.previewLoading ? '生成中...' : '生成手动预览'}
      </button>

      ${manualReview.previewError ? `<div class="error-message">${escapeHtml(manualReview.previewError)}</div>` : ''}

      <div class="import-manual-preview-table-wrapper">
        <table class="import-manual-preview-table">
          <thead>
            <tr>
              <th>行号</th>
              ${Array.from({ length: manualReview.maxColumnCount })
                .map((_, index) => `<th>列 ${index + 1}</th>`)
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${manualReview.previewRows
              .map(
                (row) => `
                  <tr>
                    <td>${row.rowNumber}</td>
                    ${Array.from({ length: manualReview.maxColumnCount })
                      .map(
                        (_, index) =>
                          `<td>${escapeHtml(row.columns[index] || '')}</td>`
                      )
                      .join('')}
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderImportReviewPanel(params: {
  loading: boolean;
  error: string;
  files: ImportReviewFileLike[];
  importButtonId: string;
  attachTargetLabel?: string;
}) {
  const {
    loading,
    error,
    files,
    importButtonId,
    attachTargetLabel = '当前模板块编辑状态'
  } = params;

  return `
    <div class="template-block-import-panel">
      <div class="template-block-import-header">
        <div>
          <div class="dynamic-title">导入预览</div>
          <div class="dynamic-subtitle">选择导入文件后，先预览并确认，再附加到${escapeHtml(attachTargetLabel)}</div>
        </div>
        <button
          id="${escapeHtml(importButtonId)}"
          class="secondary-btn"
          type="button"
          ${loading ? 'disabled' : ''}
        >
          ${loading ? '导入预览中...' : '导入 XY 文件'}
        </button>
      </div>

      ${error ? `<div class="error-message">${escapeHtml(error)}</div>` : ''}

      ${files.length
        ? `
            <div class="import-preview-list">
              ${files
                .map((file) => `
                  <div class="import-preview-file-card ${!file.matched ? 'import-preview-file-card-unmatched' : ''}">
                    <div class="import-preview-file-title">${escapeHtml(file.fileName)}</div>
                    <div class="import-preview-file-status">
                      ${file.matched
                        ? escapeHtml(file.parserLabel || '已匹配')
                        : '未自动匹配'}
                    </div>
                    ${file.error ? `<div class="import-preview-file-error">${escapeHtml(file.error)}</div>` : ''}
                    ${renderWarningList(file.warnings)}
                    ${!file.matched ? renderManualReviewPanel(file, loading) : ''}
                    ${file.candidates.map((candidate) => renderCandidateCard(candidate, loading)).join('')}
                  </div>
                `)
                .join('')}
            </div>
          `
        : '<div class="empty-tip">当前还没有导入预览结果</div>'}
    </div>
  `;
}
