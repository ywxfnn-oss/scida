import type { ElectronAPI } from './electron-api';

export { };

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
