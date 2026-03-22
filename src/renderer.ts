import './index.css';
import type {
  AppSettings,
  DuplicateExperimentCheckResult,
  ExperimentDetail,
  ExperimentGroup,
  FileIntegrityReport,
  GroupByType
} from './electron-api';
import {
  buildDisplayName,
  escapeHtml,
  formatTestTimeForDisplay,
  generateId,
  getErrorMessage,
  getPendingOriginalName,
  renderDeleteModal,
  renderDetailEditInput,
  renderDetailPair,
  renderDynamicFields,
  renderExportModal,
  renderGroupTabs,
  renderStep2Rows
} from './renderer/render-helpers';

let appSettings: AppSettings = {
  storageRoot: '',
  loginUsername: 'admin'
};

type ViewType =
  | 'login'
  | 'home'
  | 'add-step1'
  | 'add-step2'
  | 'save-success'
  | 'database-list'
  | 'database-detail'
  | 'settings';

type ExportModeType = 'full' | 'single-item' | 'all-items';

type DynamicField = {
  id: string;
  name: string;
  value: string;
};

type DataItem = {
  id: string;
  dataItemId?: number;
  itemName: string;
  itemValue: string;
  itemUnit: string;
  sourceFileName: string;
  sourceFilePath: string;
  originalFileName: string;
  originalFilePath: string;
  replacementSourcePath?: string;
  replacementOriginalName?: string;
};

type Step1FormData = {
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  sampleOwner: string;
  dynamicFields: DynamicField[];
};

let currentView: ViewType = 'login';
let lastSavedExperimentId: number | null = null;

let databaseSearchKeyword = '';
let databaseGroupBy: GroupByType = 'sampleCode';
let databaseGroups: ExperimentGroup[] = [];
let currentDetail: ExperimentDetail | null = null;

let detailEditMode = false;
let detailEditReason = '';
let detailEditor = '';
let detailEditStep1: Step1FormData | null = null;
let detailEditStep2: DataItem[] = [];

let selectedExperimentIds: number[] = [];
let exportModalVisible = false;
let exportCompressAfter = false;
let exportLoading = false;
let exportMode: ExportModeType = 'full';
let exportAvailableItemNames: string[] = [];
let exportSelectedItemName = '';
let deleteModalVisible = false;
let deleteLoading = false;
let deleteTargetIds: number[] = [];
let fileIntegrityLoading = false;
let fileIntegrityError = '';
let fileIntegrityReport: FileIntegrityReport | null = null;

let step1FormData: Step1FormData = {
  testProject: '',
  sampleCode: '',
  tester: '',
  instrument: '',
  testTime: '',
  sampleOwner: '',
  dynamicFields: []
};

let step2DataItems: DataItem[] = [
  {
    id: generateId(),
    itemName: '',
    itemValue: '',
    itemUnit: '',
    sourceFileName: '',
    sourceFilePath: '',
    originalFileName: '',
    originalFilePath: ''
  }
];

const root = document.getElementById('app');

function handleAsyncError(error: unknown, fallbackMessage = '操作失败，请稍后重试') {
  console.error(error);
  alert(`${fallbackMessage}\n${getErrorMessage(error)}`);
}

async function ensureAppSettingsLoaded() {
  if (!appSettings.storageRoot) {
    appSettings = await window.electronAPI.getAppSettings();
  }
}

function isExperimentSelected(id: number) {
  return selectedExperimentIds.includes(id);
}

function toggleExperimentSelection(id: number) {
  if (isExperimentSelected(id)) {
    selectedExperimentIds = selectedExperimentIds.filter((item) => item !== id);
  } else {
    selectedExperimentIds = [...selectedExperimentIds, id];
  }
}

function getVisibleExperimentIds() {
  return databaseGroups.flatMap((group) => group.items.map((item) => item.id));
}

function areAllVisibleSelected() {
  const visibleIds = getVisibleExperimentIds();
  return visibleIds.length > 0 && visibleIds.every((id) => selectedExperimentIds.includes(id));
}

function toggleSelectAllVisible() {
  const visibleIds = getVisibleExperimentIds();

  if (!visibleIds.length) return;

  if (areAllVisibleSelected()) {
    selectedExperimentIds = selectedExperimentIds.filter((id) => !visibleIds.includes(id));
  } else {
    const merged = new Set<number>([...selectedExperimentIds, ...visibleIds]);
    selectedExperimentIds = Array.from(merged);
  }
}

function closeExportModal() {
  exportModalVisible = false;
  exportLoading = false;
}

function openDeleteModal(targetIds: number[]) {
  deleteTargetIds = [...targetIds];
  deleteModalVisible = true;
  deleteLoading = false;
}

function closeDeleteModal() {
  deleteModalVisible = false;
  deleteLoading = false;
  deleteTargetIds = [];
}

function buildDuplicateWarningMessage(result: DuplicateExperimentCheckResult) {
  const lines = [
    '发现可能重复的实验记录。',
    '这只是提示，不会阻止保存。你仍然可以继续保存。',
    '',
    '最近匹配记录：',
    ...result.matches.map(
      (match, index) =>
        `${index + 1}. #${match.id} ${match.displayName} | ${match.sampleCode} | ${match.testProject} | ${match.testTime}`
    ),
    '',
    '是否仍然继续保存？'
  ];

  return lines.join('\n');
}

async function confirmContinueWhenLikelyDuplicate(payload: {
  sampleCode: string;
  testProject: string;
  testTime: string;
  excludeExperimentId?: number;
}) {
  const result = await window.electronAPI.checkDuplicateExperiments(payload);

  if (!result.matches.length) {
    return true;
  }

  return window.confirm(buildDuplicateWarningMessage(result));
}

async function openExportModal() {
  if (!selectedExperimentIds.length) {
    alert('请先勾选至少一条实验数据');
    return;
  }

  exportMode = 'full';
  exportSelectedItemName = '';
  exportAvailableItemNames = await window.electronAPI.getExportItemNames({
    experimentIds: selectedExperimentIds
  });
  if (exportAvailableItemNames.length) {
    exportSelectedItemName = exportAvailableItemNames[0];
  }
  exportModalVisible = true;
  void render();
}

async function renderPreservingContentScroll() {
  const contentArea = document.querySelector('.content-area') as HTMLElement | null;
  const scrollTop = contentArea?.scrollTop || 0;

  await render();

  const nextContentArea = document.querySelector('.content-area') as HTMLElement | null;
  if (nextContentArea) {
    nextContentArea.scrollTop = scrollTop;
  }
}

async function render() {
  if (!root) return;

  const [appName, version] = await Promise.all([
    window.electronAPI.getAppName(),
    window.electronAPI.getAppVersion()
  ]);

  await ensureAppSettingsLoaded();

  if (currentView === 'login') {
    root.innerHTML = `
      <div class="page-shell">
        <div class="card login-card">
          <h1>${appName}</h1>
          <p class="subtitle">请先登录后进入系统</p>

          <div class="form-group">
            <label class="form-label">账号</label>
            <input id="username" class="form-input" placeholder="请输入账号" />
          </div>

          <div class="form-group">
            <label class="form-label">密码</label>
            <input id="password" type="password" class="form-input" placeholder="请输入密码" />
          </div>

          <div id="error-message" class="error-message"></div>

          <button id="login-btn" class="primary-btn">登录</button>

          <div class="footer-tip">
            当前版本：${version}
          </div>
        </div>
      </div>
    `;

    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const errorMessage = document.getElementById('error-message');

    const handleLogin = async () => {
      const username = usernameInput?.value.trim() || '';
      const password = passwordInput?.value || '';

      if (!username || !password) {
        if (errorMessage) errorMessage.textContent = '请输入账号和密码';
        return;
      }

      if (errorMessage) errorMessage.textContent = '';

      try {
        const result = await window.electronAPI.authenticate({ username, password });

        if (!result.success) {
          if (errorMessage) errorMessage.textContent = result.error || '账号或密码错误';
          return;
        }

        currentView = 'home';
        void render();
      } catch (error) {
        console.error(error);
        if (errorMessage) errorMessage.textContent = '登录失败，请稍后重试';
      }
    };

    loginBtn?.addEventListener('click', () => {
      void handleLogin();
    });
    passwordInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        void handleLogin();
      }
    });
    usernameInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        void handleLogin();
      }
    });

    return;
  }

  if (currentView === 'home') {
    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div class="menu-item active">主页</div>
          <div id="menu-data-home" class="menu-item">数据</div>
          <div id="menu-settings-home" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">主界面</div>
            <button id="logout-btn" class="secondary-btn">退出登录</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>欢迎使用 ${appName}</h2>
              <p class="subtitle">请选择你要进入的功能模块</p>

              <div class="entry-grid">
                <div class="entry-card">
                  <div class="entry-icon">＋</div>
                  <div class="entry-title">添加新数据</div>
                  <div class="entry-desc">进入实验数据录入流程</div>
                  <button id="add-data-btn" class="primary-btn">进入</button>
                </div>

                <div class="entry-card">
                  <div class="entry-icon">▣</div>
                  <div class="entry-title">数据库入口</div>
                  <div class="entry-desc">查看和搜索已保存数据</div>
                  <button id="database-btn" class="secondary-btn big-btn">进入</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      currentView = 'login';
      void render();
    });

    document.getElementById('add-data-btn')?.addEventListener('click', () => {
      currentView = 'add-step1';
      void render();
    });

    document.getElementById('database-btn')?.addEventListener('click', async () => {
      await loadDatabaseList();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-data-home')?.addEventListener('click', async () => {
      await loadDatabaseList();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-settings-home')?.addEventListener('click', () => {
      currentView = 'settings';
      void render();
    });

    return;
  }

  if (currentView === 'add-step1') {
    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="menu-home" class="menu-item">主页</div>
          <div class="menu-item active">添加数据</div>
          <div id="menu-data-step1" class="menu-item">数据</div>
          <div id="menu-settings-step1" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">添加新数据 · 一级界面</div>
            <button id="back-home-btn" class="secondary-btn">返回主页</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>一级信息录入</h2>
              <p class="subtitle">请先填写实验主信息，必填项完成后才能进入下一步</p>

              <div class="step-form-grid">
                <div class="form-group">
                  <label class="form-label">测试项目 <span class="required-star">*</span></label>
                  <div class="input-plus-row">
                    <input id="testProject" class="form-input" placeholder="请输入测试项目，如 XRD、能谱、夹杂分析" value="${escapeHtml(step1FormData.testProject)}" />
                    <button id="project-plus-btn" class="icon-btn" type="button">＋</button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">样品编号 <span class="required-star">*</span></label>
                  <input id="sampleCode" class="form-input" placeholder="请输入样品编号" value="${escapeHtml(step1FormData.sampleCode)}" />
                </div>

                <div class="form-group">
                  <label class="form-label">测试人 <span class="required-star">*</span></label>
                  <div class="input-plus-row">
                    <input id="tester" class="form-input" placeholder="请输入测试人" value="${escapeHtml(step1FormData.tester)}" />
                    <button id="tester-plus-btn" class="icon-btn" type="button">＋</button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">测试仪器 <span class="required-star">*</span></label>
                  <div class="input-plus-row">
                    <input id="instrument" class="form-input" placeholder="请输入测试仪器" value="${escapeHtml(step1FormData.instrument)}" />
                    <button id="instrument-plus-btn" class="icon-btn" type="button">＋</button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">测试时间 <span class="required-star">*</span></label>
                  <input id="testTime" type="datetime-local" class="form-input" value="${escapeHtml(step1FormData.testTime)}" />
                </div>

                <div class="form-group">
                  <label class="form-label">样品所属人员</label>
                  <input id="sampleOwner" class="form-input" placeholder="请输入样品所属人员" value="${escapeHtml(step1FormData.sampleOwner)}" />
                </div>
              </div>

              <div class="dynamic-section">
                <div class="dynamic-header">
                  <div>
                    <div class="dynamic-title">本次实验专属字段</div>
                    <div class="dynamic-subtitle">新添加字段只对当前这一次实验有效</div>
                  </div>
                  <button id="add-dynamic-field-btn" class="secondary-btn" type="button">新增字段</button>
                </div>

                <div id="dynamic-fields-container">
                  ${renderDynamicFields(step1FormData.dynamicFields)}
                </div>
              </div>

              <div id="step1-error" class="error-message large-error"></div>

              <div class="form-action-row">
                <button id="step1-cancel-btn" class="secondary-btn" type="button">取消并返回</button>
                <button id="step1-next-btn" class="primary-btn action-btn" type="button">下一步</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    bindStep1Events();

    document.getElementById('menu-data-step1')?.addEventListener('click', async () => {
      await loadDatabaseList();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-settings-step1')?.addEventListener('click', () => {
      currentView = 'settings';
      void render();
    });

    return;
  }

  if (currentView === 'add-step2') {
    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="menu-home-step2" class="menu-item">主页</div>
          <div class="menu-item active">添加数据</div>
          <div id="menu-data-step2" class="menu-item">数据</div>
          <div id="menu-settings-step2" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">添加新数据 · 二级界面</div>
            <button id="back-step1-btn-top" class="secondary-btn">返回上一步</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>二级数据录入</h2>
              <p class="subtitle">请填写具体数据项信息，可新增多行，并关联原始文件</p>

              <div class="name-preview-card">
                <div class="name-preview-label">自动命名预览</div>
                <div class="name-preview-value">${escapeHtml(buildDisplayName(step1FormData))}</div>
              </div>

              <div class="data-table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>数值</th>
                      <th>单位</th>
                      <th>原始文件</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderStep2Rows(step2DataItems)}
                  </tbody>
                </table>
              </div>

              <div class="table-toolbar">
                <button id="add-row-btn" class="secondary-btn" type="button">新增一行</button>
              </div>

              <div id="step2-error" class="error-message large-error"></div>

              <div class="form-action-row">
                <button id="back-step1-btn-bottom" class="secondary-btn" type="button">返回上一步</button>
                <button id="finish-step2-btn" class="primary-btn action-btn" type="button">完成录入</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    bindStep2Events();

    document.getElementById('menu-data-step2')?.addEventListener('click', async () => {
      await loadDatabaseList();
      currentView = 'database-list';
      void render();
    });

    document.getElementById('menu-settings-step2')?.addEventListener('click', () => {
      currentView = 'settings';
      void render();
    });

    return;
  }

  if (currentView === 'save-success') {
    root.innerHTML = `
      <div class="page-shell">
        <div class="card login-card">
          <h1>保存成功</h1>
          <p class="subtitle">实验数据已成功写入本地数据库</p>

          <div class="info-row">
            <span>实验编号</span>
            <strong>${lastSavedExperimentId ?? '-'}</strong>
          </div>

          <div class="info-row">
            <span>数据名称</span>
            <strong>${escapeHtml(buildDisplayName(step1FormData))}</strong>
          </div>

          <button id="save-success-home-btn" class="primary-btn">返回主页</button>
        </div>
      </div>
    `;

    document.getElementById('save-success-home-btn')?.addEventListener('click', () => {
      resetFormState();
      currentView = 'home';
      void render();
    });

    return;
  }

  if (currentView === 'database-list') {
    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="db-menu-home" class="menu-item">主页</div>
          <div class="menu-item active">数据</div>
          <div id="db-menu-settings" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">数据库入口</div>
            <div class="detail-top-actions">
              <button id="db-select-all-btn" class="secondary-btn">
                ${areAllVisibleSelected() ? '取消全选' : '全选'}
              </button>
              <button
                id="db-delete-btn"
                class="danger-btn ${selectedExperimentIds.length ? '' : 'disabled-danger-btn'}"
                type="button"
                ${selectedExperimentIds.length ? '' : 'disabled'}
              >
                删除
              </button>
              <button id="db-export-btn" class="secondary-btn export-top-btn">⤴</button>
              <button id="db-refresh-btn" class="secondary-btn">刷新</button>
            </div>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>实验数据列表</h2>
              <p class="subtitle">默认按样品编号分类，可搜索和切换分类方式</p>

              <div class="search-row">
                <input
                  id="db-search-input"
                  class="form-input"
                  placeholder="搜索样品编号、测试项目、测试人、测试仪器、名称"
                  value="${escapeHtml(databaseSearchKeyword)}"
                />
                <button id="db-search-btn" class="primary-btn search-btn">搜索</button>
              </div>

              <div class="group-tabs">
                ${renderGroupTabs(databaseGroupBy)}
              </div>

              <div class="database-list-wrapper">
                ${renderDatabaseGroups(databaseGroups)}
              </div>
            </div>
          </section>
        </main>
      </div>

      ${renderExportModal({
        exportModalVisible,
        selectedExperimentIds,
        exportMode,
        exportAvailableItemNames,
        exportSelectedItemName,
        exportCompressAfter,
        exportLoading
      })}
      ${renderDeleteModal({
        deleteModalVisible,
        deleteTargetIds,
        deleteLoading
      })}
    `;

    document.getElementById('db-menu-home')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.getElementById('db-menu-settings')?.addEventListener('click', () => {
      currentView = 'settings';
      void render();
    });

    document.getElementById('db-refresh-btn')?.addEventListener('click', async () => {
      await loadDatabaseList(databaseSearchKeyword, databaseGroupBy);
      void render();
    });

    document.getElementById('db-search-btn')?.addEventListener('click', async () => {
      const input = document.getElementById('db-search-input') as HTMLInputElement | null;
      databaseSearchKeyword = input?.value.trim() || '';
      await loadDatabaseList(databaseSearchKeyword, databaseGroupBy);
      void render();
    });

    document.getElementById('db-select-all-btn')?.addEventListener('click', () => {
      toggleSelectAllVisible();
      void renderPreservingContentScroll();
    });

    document.getElementById('db-delete-btn')?.addEventListener('click', () => {
      if (!selectedExperimentIds.length) {
        alert('请先勾选至少一条实验数据');
        return;
      }

      openDeleteModal(selectedExperimentIds);
      void render();
    });

    document.getElementById('db-export-btn')?.addEventListener('click', async () => {
      await openExportModal();
    });

    const groupButtons = document.querySelectorAll('[data-groupby]');
    groupButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const groupBy = target.dataset.groupby as GroupByType;
        databaseGroupBy = groupBy;
        await loadDatabaseList(databaseSearchKeyword, databaseGroupBy);
        void render();
      });
    });

    const selectButtons = document.querySelectorAll('[data-select-experiment-id]');
    selectButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button as HTMLElement;
        const id = Number(target.dataset.selectExperimentId);
        if (!id) return;

        toggleExperimentSelection(id);
        void renderPreservingContentScroll();
      });
    });

    const detailButtons = document.querySelectorAll('[data-open-detail-id]');
    detailButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const id = Number(target.dataset.openDetailId);
        if (!id) return;

        currentDetail = await window.electronAPI.getExperimentDetail(id);
        detailEditMode = false;
        detailEditReason = '';
        detailEditor = '';
        detailEditStep1 = null;
        detailEditStep2 = [];
        currentView = 'database-detail';
        void render();
      });
    });

    document.getElementById('export-cancel-btn')?.addEventListener('click', () => {
      closeExportModal();
      void render();
    });

    document.getElementById('delete-cancel-btn')?.addEventListener('click', () => {
      closeDeleteModal();
      void render();
    });

    document.getElementById('delete-confirm-btn')?.addEventListener('click', async () => {
      if (!deleteTargetIds.length || deleteLoading) return;

      deleteLoading = true;
      void render();

      try {
        let successCount = 0;
        let failureCount = 0;
        let firstFailureReason = '';

        for (const experimentId of deleteTargetIds) {
          const result = await window.electronAPI.deleteExperiment({
            experimentId
          });

          if (result.success) {
            successCount += 1;
          } else {
            failureCount += 1;
            if (!firstFailureReason) {
              firstFailureReason = result.error || '删除失败';
            }
          }
        }

        deleteLoading = false;

        selectedExperimentIds = selectedExperimentIds.filter((id) => !deleteTargetIds.includes(id));
        closeDeleteModal();
        await loadDatabaseList(databaseSearchKeyword, databaseGroupBy);

        const summaryLines = [
          `成功删除：${successCount} 条`,
          `删除失败：${failureCount} 条`
        ];

        if (firstFailureReason) {
          summaryLines.push(`首个失败原因：${firstFailureReason}`);
        }

        alert(summaryLines.join('\n'));
        void render();
      } catch (error) {
        deleteLoading = false;
        handleAsyncError(error, '删除实验数据失败');
        void render();
      }
    });

    const exportModeRadios = document.querySelectorAll('input[name="export-mode"]');
    exportModeRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        exportMode = target.value as ExportModeType;
        void render();
      });
    });

    document.getElementById('export-item-name-select')?.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      exportSelectedItemName = target.value;
    });

    document.getElementById('export-confirm-btn')?.addEventListener('click', async () => {
      exportLoading = true;

      const checkbox = document.getElementById('export-compress-checkbox') as HTMLInputElement | null;
      exportCompressAfter = !!checkbox?.checked;

      const itemNameSelect = document.getElementById('export-item-name-select') as HTMLSelectElement | null;
      if (itemNameSelect) {
        exportSelectedItemName = itemNameSelect.value;
      }

      void render();

      let result:
        | {
          canceled?: boolean;
          success?: boolean;
          exportPath?: string;
          compressed?: boolean;
          error?: string;
        }
        | undefined;

      if (exportMode === 'full') {
        result = await window.electronAPI.exportFullExperiments({
          experimentIds: selectedExperimentIds,
          compressAfterExport: exportCompressAfter
        });
      } else if (exportMode === 'single-item') {
        if (!exportSelectedItemName) {
          exportLoading = false;
          alert('请选择一个二级数据项名称');
          void render();
          return;
        }

        result = await window.electronAPI.exportItemNameCompare({
          experimentIds: selectedExperimentIds,
          mode: 'single',
          selectedItemName: exportSelectedItemName,
          compressAfterExport: exportCompressAfter
        });
      } else {
        result = await window.electronAPI.exportItemNameCompare({
          experimentIds: selectedExperimentIds,
          mode: 'all',
          compressAfterExport: exportCompressAfter
        });
      }

      exportLoading = false;

      if (result?.canceled) {
        closeExportModal();
        void render();
        return;
      }

      if (result?.success) {
        alert(`导出成功：\n${result.exportPath || ''}`);
        selectedExperimentIds = [];
        closeExportModal();
        void render();
        return;
      }

      alert(result?.error || '导出失败');
      void render();
    });

    return;
  }

  if (currentView === 'database-detail') {
    if (!currentDetail) {
      currentView = 'database-list';
      await loadDatabaseList(databaseSearchKeyword, databaseGroupBy);
      void render();
      return;
    }

    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="detail-menu-home" class="menu-item">主页</div>
          <div id="detail-menu-list" class="menu-item active">数据</div>
          <div id="detail-menu-settings" class="menu-item">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">实验详情（${detailEditMode ? '编辑中' : '只读'}）</div>
            <div class="detail-top-actions">
              ${detailEditMode
        ? `<button id="detail-cancel-edit-btn" class="secondary-btn">取消修改</button>`
        : `<button id="detail-edit-btn" class="secondary-btn">修改</button>`
      }
              <button id="detail-back-btn" class="secondary-btn">返回列表</button>
            </div>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>${escapeHtml(currentDetail.displayName)}</h2>
              <p class="subtitle">当前阶段支持详情只读查看和修改后留痕</p>

              <div class="detail-section">
                <div class="detail-section-title">一级主信息</div>
                <div class="detail-grid">
                  ${detailEditMode && detailEditStep1
        ? `
                        ${renderDetailEditInput('edit-testProject', '测试项目', detailEditStep1.testProject)}
                        ${renderDetailEditInput('edit-sampleCode', '样品编号', detailEditStep1.sampleCode)}
                        ${renderDetailEditInput('edit-tester', '测试人', detailEditStep1.tester)}
                        ${renderDetailEditInput('edit-instrument', '测试仪器', detailEditStep1.instrument)}
                        ${renderDetailEditInput('edit-testTime', '测试时间', detailEditStep1.testTime, 'datetime-local')}
                        ${renderDetailEditInput('edit-sampleOwner', '样品所属人员', detailEditStep1.sampleOwner)}
                        ${renderDetailEditInput('edit-displayName', '数据名称', currentDetail.displayName)}
                      `
        : `
                        ${renderDetailPair('实验编号', String(currentDetail.id))}
                        ${renderDetailPair('测试项目', currentDetail.testProject)}
                        ${renderDetailPair('样品编号', currentDetail.sampleCode)}
                        ${renderDetailPair('测试人', currentDetail.tester)}
                        ${renderDetailPair('测试仪器', currentDetail.instrument)}
                        ${renderDetailPair('测试时间', currentDetail.testTime)}
                        ${renderDetailPair('样品所属人员', currentDetail.sampleOwner || '-')}
                        ${renderDetailPair('数据名称', currentDetail.displayName)}
                      `
      }
                </div>
              </div>

              <div class="detail-section">
                <div class="detail-section-title">动态字段</div>
                ${detailEditMode && detailEditStep1
        ? `
                      <div class="detail-list">
                        ${detailEditStep1.dynamicFields.length
          ? detailEditStep1.dynamicFields
            .map(
              (field, index) => `
                                    <div class="detail-edit-row">
                                      <input id="edit-dynamic-name-${index}" class="form-input" value="${escapeHtml(field.name)}" placeholder="字段名称" />
                                      <input id="edit-dynamic-value-${index}" class="form-input" value="${escapeHtml(field.value)}" placeholder="字段值" />
                                    </div>
                                  `
            )
            .join('')
          : `<div class="empty-tip">无动态字段</div>`
        }
                      </div>
                    `
        : currentDetail.customFields.length
          ? `
                        <div class="detail-list">
                          ${currentDetail.customFields
            .map(
              (field) => `
                                <div class="detail-list-item">
                                  <span class="detail-list-key">${escapeHtml(field.fieldName)}</span>
                                  <span class="detail-list-value">${escapeHtml(field.fieldValue)}</span>
                                </div>
                              `
            )
            .join('')}
                        </div>
                      `
          : `<div class="empty-tip">无动态字段</div>`
      }
              </div>

              <div class="detail-section">
                <div class="detail-section-title">二级数据项</div>
                ${currentDetail.dataItems.length || detailEditMode
        ? `
                      <div class="data-table-wrapper">
                        <table class="data-table">
                          <thead>
                            <tr>
                              <th>名称</th>
                              <th>数值</th>
                              <th>单位</th>
                              <th>保存文件名</th>
                              <th>原始文件名</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${detailEditMode
          ? detailEditStep2
            .map(
              (item, index) => `
                                        <tr>
                                          <td><input id="edit-item-name-${index}" class="table-input" value="${escapeHtml(item.itemName)}" /></td>
                                          <td><input id="edit-item-value-${index}" class="table-input" value="${escapeHtml(item.itemValue)}" /></td>
                                          <td><input id="edit-item-unit-${index}" class="table-input" value="${escapeHtml(item.itemUnit)}" /></td>
                                          <td>
                                            <div class="detail-file-edit-cell">
                                              <div>${escapeHtml(item.sourceFileName || '-')}</div>
                                              <button
                                                class="secondary-btn detail-replace-file-btn"
                                                type="button"
                                                data-edit-file-row-id="${escapeHtml(item.id)}"
                                              >
                                                更换文件
                                              </button>
                                            </div>
                                          </td>
                                          <td>${escapeHtml(getPendingOriginalName(item))}</td>
                                        </tr>
                                      `
            )
            .join('')
          : currentDetail.dataItems
            .map(
              (item) => `
                                        <tr>
                                          <td>${escapeHtml(item.itemName)}</td>
                                          <td>${escapeHtml(item.itemValue)}</td>
                                          <td>${escapeHtml(item.itemUnit || '-')}</td>
                                          <td>
                                            ${item.sourceFileName && item.sourceFilePath
                  ? `
                                                  <div class="saved-file-cell">
                                                    <button
                                                      class="file-link-btn"
                                                      type="button"
                                                      data-open-saved-file="${escapeHtml(item.sourceFilePath)}"
                                                    >
                                                      ${escapeHtml(item.sourceFileName)}
                                                    </button>
                                                    <button
                                                      class="file-folder-btn"
                                                      type="button"
                                                      data-open-saved-folder="${escapeHtml(item.sourceFilePath)}"
                                                      title="打开所在文件夹"
                                                    >
                                                      打开文件夹
                                                    </button>
                                                  </div>
                                                `
                  : '-'
                }
                                          </td>
                                          <td>${escapeHtml(item.originalFileName || '-')}</td>
                                        </tr>
                                      `
            )
            .join('')
        }
                          </tbody>
                        </table>
                      </div>
                    `
        : `<div class="empty-tip">无二级数据项</div>`
      }
              </div>

              ${detailEditMode
        ? `
                    <div class="detail-section">
                      <div class="detail-section-title">修改确认</div>
                      <div class="detail-edit-confirm">
                        <input id="edit-reason-input" class="form-input" placeholder="请输入修改理由（必填）" value="${escapeHtml(detailEditReason)}" />
                        <input id="edit-editor-input" class="form-input" placeholder="请输入修改人（必填）" value="${escapeHtml(detailEditor)}" />
                        <button id="detail-save-edit-btn" class="primary-btn action-btn">修改确认</button>
                      </div>
                      <div id="detail-edit-error" class="error-message large-error"></div>
                    </div>
                  `
        : ''
      }
            </div>
          </section>
        </main>
      </div>
    `;

    document.getElementById('detail-back-btn')?.addEventListener('click', async () => {
      await loadDatabaseList(databaseSearchKeyword, databaseGroupBy);
      currentView = 'database-list';
      void render();
    });

    document.getElementById('detail-menu-list')?.addEventListener('click', async () => {
      await loadDatabaseList(databaseSearchKeyword, databaseGroupBy);
      currentView = 'database-list';
      void render();
    });

    document.getElementById('detail-menu-home')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.getElementById('detail-menu-settings')?.addEventListener('click', () => {
      currentView = 'settings';
      void render();
    });

    const openSavedFileButtons = document.querySelectorAll('[data-open-saved-file]');
    openSavedFileButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const filePath = target.dataset.openSavedFile;
        if (!filePath) return;

        const result = await window.electronAPI.openSavedFile({
          filePath
        });

        if (!result.success) {
          alert(result.error || '打开文件失败');
        }
      });
    });

    const openSavedFolderButtons = document.querySelectorAll('[data-open-saved-folder]');
    openSavedFolderButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const filePath = target.dataset.openSavedFolder;
        if (!filePath) return;

        const result = await window.electronAPI.openInFolder({
          filePath
        });

        if (!result.success) {
          alert(result.error || '打开文件夹失败');
        }
      });
    });

    document.getElementById('detail-edit-btn')?.addEventListener('click', () => {
      prepareDetailEditState();
      detailEditMode = true;
      void render();
    });

    document.getElementById('detail-cancel-edit-btn')?.addEventListener('click', () => {
      detailEditMode = false;
      detailEditReason = '';
      detailEditor = '';
      detailEditStep1 = null;
      detailEditStep2 = [];
      void render();
    });

    document.getElementById('detail-save-edit-btn')?.addEventListener('click', async () => {
      if (!currentDetail) return;

      const collected = collectDetailEditState();
      if (!collected) return;

      const errorBox = document.getElementById('detail-edit-error');

      if (!detailEditReason) {
        if (errorBox) errorBox.textContent = '请填写修改理由';
        return;
      }

      if (!detailEditor) {
        if (errorBox) errorBox.textContent = '请填写修改人';
        return;
      }

      if (
        !collected.step1.testProject ||
        !collected.step1.sampleCode ||
        !collected.step1.tester ||
        !collected.step1.instrument ||
        !collected.step1.testTime
      ) {
        if (errorBox) errorBox.textContent = '一级主信息中的必填项不能为空';
        return;
      }

      try {
        const shouldContinue = await confirmContinueWhenLikelyDuplicate({
          sampleCode: collected.step1.sampleCode,
          testProject: collected.step1.testProject,
          testTime: collected.step1.testTime,
          excludeExperimentId: currentDetail.id
        });

        if (!shouldContinue) {
          if (errorBox) {
            errorBox.textContent = '已取消修改，请确认是否为重复记录';
          }
          return;
        }

        const result = await window.electronAPI.updateExperiment({
          experimentId: currentDetail.id,
          step1: {
            testProject: collected.step1.testProject,
            sampleCode: collected.step1.sampleCode,
            tester: collected.step1.tester,
            instrument: collected.step1.instrument,
            testTime: collected.step1.testTime,
            sampleOwner: collected.step1.sampleOwner,
            dynamicFields: collected.step1.dynamicFields
              .filter((field) => field.name && field.value)
              .map((field) => ({
                name: field.name,
                value: field.value
              }))
          },
          step2: collected.step2
            .filter((item) => item.itemName && item.itemValue)
            .map((item) => ({
              dataItemId: item.dataItemId,
              itemName: item.itemName,
              itemValue: item.itemValue,
              itemUnit: item.itemUnit,
              sourceFileName: item.sourceFileName,
              sourceFilePath: item.sourceFilePath,
              originalFileName: item.originalFileName,
              originalFilePath: item.originalFilePath,
              replacementSourcePath: item.replacementSourcePath,
              replacementOriginalName: item.replacementOriginalName
            })),
          displayName: [
            collected.step1.testProject,
            collected.step1.sampleCode,
            collected.step1.tester,
            collected.step1.instrument,
            formatTestTimeForDisplay(collected.step1.testTime)
          ]
            .filter(Boolean)
            .join('-'),
          editReason: detailEditReason,
          editor: detailEditor
        });

        if (!result.success) {
          if (errorBox) errorBox.textContent = result.error || '修改失败';
          return;
        }

        currentDetail = await window.electronAPI.getExperimentDetail(currentDetail.id);
        detailEditMode = false;
        detailEditReason = '';
        detailEditor = '';
        detailEditStep1 = null;
        detailEditStep2 = [];
        void render();
      } catch (error) {
        if (errorBox) errorBox.textContent = '修改失败，请稍后重试';
        console.error(error);
      }
    });

    document.querySelectorAll('[data-edit-file-row-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLElement;
        const rowId = target.dataset.editFileRowId;
        if (!rowId) return;

        collectDetailEditState();

        try {
          const selected = await window.electronAPI.selectSourceFile();
          if (!selected) return;

          detailEditStep2 = detailEditStep2.map((item) => {
            if (item.id !== rowId) return item;

            return {
              ...item,
              replacementSourcePath: selected.originalPath,
              replacementOriginalName: selected.originalName
            };
          });

          void render();
        } catch (error) {
          handleAsyncError(error, '选择替换文件失败');
        }
      });
    });

    return;
  }

  if (currentView === 'settings') {
    const missingExamplesHtml = fileIntegrityReport?.missingExamples.length
      ? `
          <div class="detail-section">
            <div class="detail-section-title">缺失文件示例（最多 10 条）</div>
            <div class="detail-stack">
              ${fileIntegrityReport.missingExamples
          .map(
            (filePath) => `<div class="detail-value" title="${escapeHtml(filePath)}">${escapeHtml(filePath)}</div>`
          )
          .join('')}
            </div>
          </div>
        `
      : '';
    const orphanExamplesHtml = fileIntegrityReport?.orphanExamples.length
      ? `
          <div class="detail-section">
            <div class="detail-section-title">孤儿文件示例（最多 10 条）</div>
            <div class="detail-stack">
              ${fileIntegrityReport.orphanExamples
          .map(
            (filePath) => `<div class="detail-value" title="${escapeHtml(filePath)}">${escapeHtml(filePath)}</div>`
          )
          .join('')}
            </div>
          </div>
        `
      : '';

    root.innerHTML = `
      <div class="home-layout">
        <aside class="sidebar">
          <div class="sidebar-title">${appName}</div>
          <div id="settings-menu-home" class="menu-item">主页</div>
          <div class="menu-item active">设置</div>
        </aside>

        <main class="main-content">
          <header class="topbar">
            <div class="topbar-title">设置</div>
            <button id="settings-back-home-btn" class="secondary-btn">返回主页</button>
          </header>

          <section class="content-area">
            <div class="welcome-card">
              <h2>系统设置</h2>
              <p class="subtitle">当前阶段支持原始文件根目录和登录账号密码设置</p>

              <div class="detail-section">
                <div class="detail-section-title">原始文件根目录</div>
                <div class="form-group">
                  <label class="form-label">保存根目录</label>
                  <input id="settings-storage-root" class="form-input" value="${escapeHtml(appSettings.storageRoot)}" />
                </div>
              </div>

              <div class="detail-section">
                <div class="detail-section-title">登录设置</div>
                <div class="step-form-grid">
                  <div class="form-group">
                    <label class="form-label">登录账号</label>
                    <input id="settings-login-username" class="form-input" value="${escapeHtml(appSettings.loginUsername)}" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">新登录密码</label>
                    <input
                      id="settings-login-password"
                      class="form-input"
                      type="password"
                      placeholder="留空则保持当前密码不变"
                    />
                  </div>
                </div>
              </div>

              <div id="settings-error" class="error-message large-error"></div>

              <div class="form-action-row">
                <button id="settings-save-btn" class="primary-btn action-btn">保存设置</button>
                <button
                  id="settings-file-integrity-btn"
                  class="secondary-btn action-btn"
                  type="button"
                  ${fileIntegrityLoading ? 'disabled' : ''}
                >
                  ${fileIntegrityLoading ? '检查中...' : '检查文件完整性'}
                </button>
              </div>

              ${fileIntegrityError ? `<div class="error-message large-error">${escapeHtml(fileIntegrityError)}</div>` : ''}

              ${fileIntegrityReport
        ? `
                  <div class="detail-section">
                    <div class="detail-section-title">文件完整性报告</div>
                    <div class="info-row">
                      <span>扫描根目录</span>
                      <strong title="${escapeHtml(fileIntegrityReport.storageRoot)}">
                        ${escapeHtml(fileIntegrityReport.storageRoot)}
                      </strong>
                    </div>
                    <div class="info-row">
                      <span>根目录状态</span>
                      <strong>${fileIntegrityReport.storageRootExists ? '存在' : '不存在'}</strong>
                    </div>
                    <div class="info-row">
                      <span>数据库引用的托管文件</span>
                      <strong>${fileIntegrityReport.referencedManagedFileCount}</strong>
                    </div>
                    <div class="info-row">
                      <span>缺失文件</span>
                      <strong>${fileIntegrityReport.missingReferencedFileCount}</strong>
                    </div>
                    <div class="info-row">
                      <span>扫描到的托管文件</span>
                      <strong>${fileIntegrityReport.scannedManagedFileCount}</strong>
                    </div>
                    <div class="info-row">
                      <span>孤儿文件</span>
                      <strong>${fileIntegrityReport.orphanManagedFileCount}</strong>
                    </div>
                  </div>

                  ${missingExamplesHtml}
                  ${orphanExamplesHtml}
                `
        : ''}
            </div>
          </section>
        </main>
      </div>
    `;

    document.getElementById('settings-menu-home')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.getElementById('settings-back-home-btn')?.addEventListener('click', () => {
      currentView = 'home';
      void render();
    });

    document.getElementById('settings-save-btn')?.addEventListener('click', async () => {
      const storageRoot =
        (document.getElementById('settings-storage-root') as HTMLInputElement)?.value.trim() || '';
      const loginUsername =
        (document.getElementById('settings-login-username') as HTMLInputElement)?.value.trim() || '';
      const newPassword =
        (document.getElementById('settings-login-password') as HTMLInputElement)?.value || '';
      const errorBox = document.getElementById('settings-error');

      if (!storageRoot) {
        if (errorBox) errorBox.textContent = '请填写原始文件根目录';
        return;
      }

      if (!loginUsername) {
        if (errorBox) errorBox.textContent = '请填写登录账号';
        return;
      }

      if (errorBox) errorBox.textContent = '';

      try {
        const result = await window.electronAPI.saveAppSettings({
          storageRoot,
          loginUsername,
          newPassword: newPassword || undefined
        });

        if (!result.success) {
          if (errorBox) errorBox.textContent = result.error || '保存设置失败';
          return;
        }

        appSettings = {
          storageRoot,
          loginUsername
        };
        fileIntegrityReport = null;
        fileIntegrityError = '';

        const passwordInput = document.getElementById('settings-login-password') as HTMLInputElement | null;
        if (passwordInput) {
          passwordInput.value = '';
        }

        alert('设置已保存');
      } catch (error) {
        if (errorBox) errorBox.textContent = '保存设置失败，请稍后重试';
        console.error(error);
      }
    });

    document.getElementById('settings-file-integrity-btn')?.addEventListener('click', async () => {
      if (fileIntegrityLoading) {
        return;
      }

      fileIntegrityLoading = true;
      fileIntegrityError = '';
      void render();

      try {
        fileIntegrityReport = await window.electronAPI.scanFileIntegrity();
      } catch (error) {
        fileIntegrityReport = null;
        fileIntegrityError = getErrorMessage(error) || '文件完整性检查失败';
      } finally {
        fileIntegrityLoading = false;
        void render();
      }
    });

    return;
  }
}

function bindStep1Events() {
  document.getElementById('back-home-btn')?.addEventListener('click', goHome);
  document.getElementById('menu-home')?.addEventListener('click', goHome);
  document.getElementById('step1-cancel-btn')?.addEventListener('click', goHome);

  document.getElementById('project-plus-btn')?.addEventListener('click', () => {
    alert('后续阶段会扩展：将当前测试项目加入建议库');
  });

  document.getElementById('tester-plus-btn')?.addEventListener('click', () => {
    alert('后续阶段会扩展：将当前测试人加入建议库');
  });

  document.getElementById('instrument-plus-btn')?.addEventListener('click', () => {
    alert('后续阶段会扩展：将当前测试仪器加入建议库');
  });

  document.getElementById('add-dynamic-field-btn')?.addEventListener('click', () => {
    saveStep1InputsToState();
    step1FormData.dynamicFields.push({
      id: generateId(),
      name: '',
      value: ''
    });
    void render();
  });

  document.getElementById('step1-next-btn')?.addEventListener('click', () => {
    saveStep1InputsToState();

    const errorMessage = validateStep1();
    const errorBox = document.getElementById('step1-error');

    if (errorMessage) {
      if (errorBox) errorBox.textContent = errorMessage;
      return;
    }

    if (errorBox) errorBox.textContent = '';
    currentView = 'add-step2';
    void render();
  });

  bindDynamicFieldEvents();
}

function bindDynamicFieldEvents() {
  const removeButtons = document.querySelectorAll('[data-remove-dynamic-id]');
  removeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const id = target.dataset.removeDynamicId;
      if (!id) return;

      saveStep1InputsToState();
      step1FormData.dynamicFields = step1FormData.dynamicFields.filter((field) => field.id !== id);
      void render();
    });
  });
}

function bindStep2Events() {
  document.getElementById('add-row-btn')?.addEventListener('click', () => {
    saveStep2InputsToState();
    step2DataItems.push({
      id: generateId(),
      itemName: '',
      itemValue: '',
      itemUnit: '',
      sourceFileName: '',
      sourceFilePath: '',
      originalFileName: '',
      originalFilePath: ''
    });
    void render();
  });

  document.getElementById('back-step1-btn-top')?.addEventListener('click', () => {
    saveStep2InputsToState();
    currentView = 'add-step1';
    void render();
  });

  document.getElementById('back-step1-btn-bottom')?.addEventListener('click', () => {
    saveStep2InputsToState();
    currentView = 'add-step1';
    void render();
  });

  document.getElementById('menu-home-step2')?.addEventListener('click', () => {
    saveStep2InputsToState();
    goHome();
  });

  document.getElementById('finish-step2-btn')?.addEventListener('click', async () => {
    saveStep2InputsToState();

    const errorBox = document.getElementById('step2-error');
    const errorMessage = validateStep2();

    if (errorMessage) {
      if (errorBox) errorBox.textContent = errorMessage;
      return;
    }

    if (errorBox) errorBox.textContent = '';

    try {
      const shouldContinue = await confirmContinueWhenLikelyDuplicate({
        sampleCode: step1FormData.sampleCode,
        testProject: step1FormData.testProject,
        testTime: step1FormData.testTime
      });

      if (!shouldContinue) {
        if (errorBox) {
          errorBox.textContent = '已取消保存，请确认是否为重复记录';
        }
        return;
      }

      const result = await window.electronAPI.saveExperiment({
        step1: {
          testProject: step1FormData.testProject,
          sampleCode: step1FormData.sampleCode,
          tester: step1FormData.tester,
          instrument: step1FormData.instrument,
          testTime: step1FormData.testTime,
          sampleOwner: step1FormData.sampleOwner,
          dynamicFields: step1FormData.dynamicFields
            .filter((field) => field.name && field.value)
            .map((field) => ({
              name: field.name,
              value: field.value
            }))
        },
        step2: step2DataItems
          .filter((row) => row.itemName && row.itemValue)
          .map((row) => ({
            itemName: row.itemName,
            itemValue: row.itemValue,
            itemUnit: row.itemUnit,
            sourceFileName: row.sourceFileName,
            sourceFilePath: row.sourceFilePath,
            originalFileName: row.originalFileName,
            originalFilePath: row.originalFilePath
          })),
        displayName: buildDisplayName(step1FormData)
      });

      if (!result.success || !result.experimentId) {
        if (errorBox) errorBox.textContent = result.error || '保存实验数据失败';
        return;
      }

      lastSavedExperimentId = result.experimentId;
      currentView = 'save-success';
      void render();
    } catch (error) {
      if (errorBox) errorBox.textContent = '保存实验数据失败，请稍后重试';
      console.error(error);
    }
  });

  const removeButtons = document.querySelectorAll('[data-remove-row-id]');
  removeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button as HTMLElement;
      const id = target.dataset.removeRowId;
      if (!id) return;

      saveStep2InputsToState();

      if (step2DataItems.length === 1) {
        alert('至少保留一行数据');
        return;
      }

      step2DataItems = step2DataItems.filter((row) => row.id !== id);
      void render();
    });
  });

  const fileButtons = document.querySelectorAll('[data-file-row-id]');
  fileButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button as HTMLElement;
      const rowId = target.dataset.fileRowId;
      if (!rowId) return;

      saveStep2InputsToState();

      try {
        const selected = await window.electronAPI.selectSourceFile();
        if (!selected) return;

        const copied = await window.electronAPI.copyFileToStorage({
          sourcePath: selected.originalPath,
          testProject: step1FormData.testProject,
          sampleCode: step1FormData.sampleCode,
          tester: step1FormData.tester,
          instrument: step1FormData.instrument,
          testTime: step1FormData.testTime
        });

        if (!copied.success || !copied.savedFileName || !copied.savedPath) {
          alert(copied.error || '复制原始文件失败');
          return;
        }

        step2DataItems = step2DataItems.map((row) => {
          if (row.id !== rowId) return row;

          return {
            ...row,
            sourceFileName: copied.savedFileName,
            sourceFilePath: copied.savedPath,
            originalFileName: selected.originalName,
            originalFilePath: selected.originalPath
          };
        });

        void render();
      } catch (error) {
        handleAsyncError(error, '处理原始文件失败');
      }
    });
  });
}

async function loadDatabaseList(query = '', groupBy: GroupByType = databaseGroupBy) {
  databaseGroups = await window.electronAPI.listExperiments({
    query,
    groupBy
  });

  const validIds = databaseGroups.flatMap((group) => group.items.map((item) => item.id));
  selectedExperimentIds = selectedExperimentIds.filter((id) => validIds.includes(id));
}

function renderDatabaseGroups(groups: ExperimentGroup[]) {
  if (!groups.length) {
    return `<div class="empty-tip">当前没有符合条件的实验数据</div>`;
  }

  return groups
    .map(
      (group) => `
        <div class="db-group-block">
          <div class="db-group-title">${escapeHtml(group.groupLabel)}</div>
          <div class="record-list">
            ${group.items
          .map(
            (item) => `
	                  <div class="record-card selectable-record-card">
	                    <button
	                      class="select-circle-btn ${isExperimentSelected(item.id) ? 'selected-circle-btn' : ''}"
                      data-select-experiment-id="${item.id}"
                      type="button"
                    >
                      ${isExperimentSelected(item.id) ? '●' : '○'}
                    </button>

	                    <div class="record-main">
	                      <div class="record-title">${escapeHtml(item.displayName)}</div>
	                      <div class="record-meta">
                        <span>样品编号：${escapeHtml(item.sampleCode)}</span>
                        <span>测试项目：${escapeHtml(item.testProject)}</span>
                        <span>测试人：${escapeHtml(item.tester)}</span>
                        <span>测试仪器：${escapeHtml(item.instrument)}</span>
	                      </div>
	                    </div>
	
	                    <button class="secondary-btn" type="button" data-open-detail-id="${item.id}">查看详情</button>
	                  </div>
	                `
          )
          .join('')}
          </div>
        </div>
      `
    )
    .join('');
}

function prepareDetailEditState() {
  if (!currentDetail) return;

  detailEditStep1 = {
    testProject: currentDetail.testProject,
    sampleCode: currentDetail.sampleCode,
    tester: currentDetail.tester,
    instrument: currentDetail.instrument,
    testTime: currentDetail.testTime,
    sampleOwner: currentDetail.sampleOwner || '',
    dynamicFields: currentDetail.customFields.map((field) => ({
      id: `detail_field_${field.id}`,
      name: field.fieldName,
      value: field.fieldValue
    }))
  };

  detailEditStep2 = currentDetail.dataItems.map((item) => ({
    id: `detail_item_${item.id}`,
    dataItemId: item.id,
    itemName: item.itemName,
    itemValue: item.itemValue,
    itemUnit: item.itemUnit || '',
    sourceFileName: item.sourceFileName || '',
    sourceFilePath: item.sourceFilePath || '',
    originalFileName: item.originalFileName || '',
    originalFilePath: item.originalFilePath || '',
    replacementSourcePath: '',
    replacementOriginalName: ''
  }));
}

function collectDetailEditState() {
  if (!detailEditStep1) return null;

  detailEditStep1.testProject =
    (document.getElementById('edit-testProject') as HTMLInputElement)?.value.trim() || '';
  detailEditStep1.sampleCode =
    (document.getElementById('edit-sampleCode') as HTMLInputElement)?.value.trim() || '';
  detailEditStep1.tester =
    (document.getElementById('edit-tester') as HTMLInputElement)?.value.trim() || '';
  detailEditStep1.instrument =
    (document.getElementById('edit-instrument') as HTMLInputElement)?.value.trim() || '';
  detailEditStep1.testTime =
    (document.getElementById('edit-testTime') as HTMLInputElement)?.value || '';
  detailEditStep1.sampleOwner =
    (document.getElementById('edit-sampleOwner') as HTMLInputElement)?.value.trim() || '';

  detailEditStep1.dynamicFields = detailEditStep1.dynamicFields.map((field, index) => ({
    ...field,
    name:
      (document.getElementById(`edit-dynamic-name-${index}`) as HTMLInputElement)?.value.trim() ||
      '',
    value:
      (document.getElementById(`edit-dynamic-value-${index}`) as HTMLInputElement)?.value.trim() ||
      ''
  }));

  detailEditStep2 = detailEditStep2.map((item, index) => ({
    ...item,
    itemName:
      (document.getElementById(`edit-item-name-${index}`) as HTMLInputElement)?.value.trim() || '',
    itemValue:
      (document.getElementById(`edit-item-value-${index}`) as HTMLInputElement)?.value.trim() ||
      '',
    itemUnit:
      (document.getElementById(`edit-item-unit-${index}`) as HTMLInputElement)?.value.trim() || ''
  }));

  detailEditReason =
    (document.getElementById('edit-reason-input') as HTMLInputElement)?.value.trim() || '';
  detailEditor =
    (document.getElementById('edit-editor-input') as HTMLInputElement)?.value.trim() || '';

  return {
    step1: detailEditStep1,
    step2: detailEditStep2
  };
}

function saveStep1InputsToState() {
  const testProject = document.getElementById('testProject') as HTMLInputElement | null;
  const sampleCode = document.getElementById('sampleCode') as HTMLInputElement | null;
  const tester = document.getElementById('tester') as HTMLInputElement | null;
  const instrument = document.getElementById('instrument') as HTMLInputElement | null;
  const testTime = document.getElementById('testTime') as HTMLInputElement | null;
  const sampleOwner = document.getElementById('sampleOwner') as HTMLInputElement | null;

  step1FormData.testProject = testProject?.value.trim() || '';
  step1FormData.sampleCode = sampleCode?.value.trim() || '';
  step1FormData.tester = tester?.value.trim() || '';
  step1FormData.instrument = instrument?.value.trim() || '';
  step1FormData.testTime = testTime?.value || '';
  step1FormData.sampleOwner = sampleOwner?.value.trim() || '';

  step1FormData.dynamicFields = step1FormData.dynamicFields.map((field) => {
    const nameInput = document.getElementById(`dynamic-name-${field.id}`) as HTMLInputElement | null;
    const valueInput = document.getElementById(`dynamic-value-${field.id}`) as HTMLInputElement | null;

    return {
      ...field,
      name: nameInput?.value.trim() || '',
      value: valueInput?.value.trim() || ''
    };
  });
}

function saveStep2InputsToState() {
  step2DataItems = step2DataItems.map((row) => {
    const itemName = document.getElementById(`item-name-${row.id}`) as HTMLInputElement | null;
    const itemValue = document.getElementById(`item-value-${row.id}`) as HTMLInputElement | null;
    const itemUnit = document.getElementById(`item-unit-${row.id}`) as HTMLInputElement | null;

    return {
      ...row,
      itemName: itemName?.value.trim() || '',
      itemValue: itemValue?.value.trim() || '',
      itemUnit: itemUnit?.value.trim() || ''
    };
  });
}

function validateStep1() {
  if (!step1FormData.testProject) return '请填写测试项目';
  if (!step1FormData.sampleCode) return '请填写样品编号';
  if (!step1FormData.tester) return '请填写测试人';
  if (!step1FormData.instrument) return '请填写测试仪器';
  if (!step1FormData.testTime) return '请选择测试时间';

  for (const field of step1FormData.dynamicFields) {
    if ((field.name && !field.value) || (!field.name && field.value)) {
      return '动态字段名称和值需要成对填写';
    }
  }

  return '';
}

function validateStep2() {
  const hasAnyContent = step2DataItems.some((row) => {
    return row.itemName || row.itemValue || row.itemUnit || row.sourceFileName;
  });

  if (!hasAnyContent) {
    return '请至少填写一行二级数据';
  }

  for (const row of step2DataItems) {
    const hasName = !!row.itemName;
    const hasValue = !!row.itemValue;
    const hasUnit = !!row.itemUnit;
    const hasFile = !!row.sourceFileName;

    if ((hasName || hasValue || hasUnit || hasFile) && !hasName) {
      return '请为已填写的数据行补充名称';
    }

    if ((hasName || hasValue || hasUnit || hasFile) && !hasValue) {
      return '请为已填写的数据行补充数值';
    }
  }

  return '';
}

function goHome() {
  currentView = 'home';
  void render();
}

function resetFormState() {
  step1FormData = {
    testProject: '',
    sampleCode: '',
    tester: '',
    instrument: '',
    testTime: '',
    sampleOwner: '',
    dynamicFields: []
  };

  step2DataItems = [
    {
      id: generateId(),
      itemName: '',
      itemValue: '',
      itemUnit: '',
      sourceFileName: '',
      sourceFilePath: '',
      originalFileName: '',
      originalFilePath: ''
    }
  ];
}

function renderFatalError(error: unknown) {
  console.error(error);

  const root = document.getElementById('app');
  if (root) {
    root.innerHTML = `
      <div style="padding:24px;font-family:sans-serif;color:#c00;white-space:pre-wrap;">
        渲染失败：
        ${escapeHtml(getErrorMessage(error))}
      </div>
    `;
  }
}

window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  handleAsyncError(event.reason);
});

void render().catch((error) => {
  renderFatalError(error);
});
