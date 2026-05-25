const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Core processing
  validateUrl: (url) => ipcRenderer.invoke('validate-url', url),
  pasteFromClipboard: () => ipcRenderer.invoke('paste-from-clipboard'),
  process: (options) => ipcRenderer.invoke('process', options),
  stopProcess: () => ipcRenderer.invoke('stop-process'),
  openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath),
  getOutputPath: () => ipcRenderer.invoke('get-output-path'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  selectLocalFile: () => ipcRenderer.invoke('select-local-file'),
  openLicenseFile: () => ipcRenderer.invoke('open-license-file'),
  onProgress: (callback) => {
    ipcRenderer.on('progress', (event, data) => callback(data));
  },

  // License management (NEW - replaces auth)
  getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  activateLicense: (serialKey) => ipcRenderer.invoke('activate-license', serialKey),
  deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),
  startTrial: () => ipcRenderer.invoke('start-trial'),
  getTrialStatus: () => ipcRenderer.invoke('get-trial-status'),

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  },

  // Dependencies
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  installDependencies: () => ipcRenderer.invoke('install-dependencies'),
  getDependencyStatus: () => ipcRenderer.invoke('get-dependency-status'),
  onDependencyProgress: (callback) => {
    ipcRenderer.on('dependency-progress', (event, data) => callback(data));
  }
});