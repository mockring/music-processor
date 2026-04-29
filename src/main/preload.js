const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  validateUrl: (url) => ipcRenderer.invoke('validate-url', url),
  pasteFromClipboard: () => ipcRenderer.invoke('paste-from-clipboard'),
  process: (options) => ipcRenderer.invoke('process', options),
  openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath),
  getOutputPath: () => ipcRenderer.invoke('get-output-path'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  selectLocalFile: () => ipcRenderer.invoke('select-local-file'),
  openLicenseFile: () => ipcRenderer.invoke('open-license-file'),
  onProgress: (callback) => {
    ipcRenderer.on('progress', (event, data) => callback(data));
  }
});
