import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './electron-api';

const electronAPI: ElectronAPI = {
    getAppVersion: (): Promise<string> => ipcRenderer.invoke('system:getAppVersion'),
    getAppName: (): Promise<string> => ipcRenderer.invoke('system:getAppName'),

    authenticate: (payload) => ipcRenderer.invoke('auth:authenticate', payload),

    getAppSettings: () => ipcRenderer.invoke('settings:getAppSettings'),

    saveAppSettings: (payload) => ipcRenderer.invoke('settings:saveAppSettings', payload),

    selectSourceFile: () =>
        ipcRenderer.invoke('file:selectSourceFile'),

    copyFileToStorage: (payload) =>
        ipcRenderer.invoke('file:copyToStorage', payload),

    checkDuplicateExperiments: (payload) =>
        ipcRenderer.invoke('experiment:checkDuplicates', payload),

    saveExperiment: (payload) => ipcRenderer.invoke('experiment:save', payload),

    listExperiments: (payload) => ipcRenderer.invoke('experiment:list', payload),
    listExperimentFilterOptions: () => ipcRenderer.invoke('experiment:listFilterOptions'),

    getExperimentDetail: (experimentId: number) =>
        ipcRenderer.invoke('experiment:getDetail', experimentId),
    listExperimentEditLogs: (payload) => ipcRenderer.invoke('experiment:listEditLogs', payload),

    deleteExperiment: (payload) => ipcRenderer.invoke('experiment:delete', payload),

    updateExperiment: (payload) => ipcRenderer.invoke('experiment:update', payload),

    exportFullExperiments: (payload) => ipcRenderer.invoke('export:fullExperiments', payload),

    getExportItemNames: (payload) => ipcRenderer.invoke('export:getItemNames', payload),

    exportItemNameCompare: (payload) => ipcRenderer.invoke('export:itemNameCompare', payload),

    scanFileIntegrity: () => ipcRenderer.invoke('file:scanIntegrity'),

    exportOrphanFileList: (payload) => ipcRenderer.invoke('file:exportOrphanList', payload),

    quarantineOrphanFiles: (payload) => ipcRenderer.invoke('file:quarantineOrphans', payload),

    listRecentOperationLogs: (payload) => ipcRenderer.invoke('log:listRecentOperations', payload),

    openPathLocation: (payload) => ipcRenderer.invoke('file:openPathLocation', payload),

    openSavedFile: (payload: { filePath: string }) => ipcRenderer.invoke('file:openSavedFile', payload),

    openInFolder: (payload: { filePath: string }) => ipcRenderer.invoke('file:openInFolder', payload)
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
