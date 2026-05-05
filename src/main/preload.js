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
  },
  // Auth
  authLogin: (email, password) => ipcRenderer.invoke('auth-login', email, password),
  authRegister: (email, password) => ipcRenderer.invoke('auth-register', email, password),
  authLogout: () => ipcRenderer.invoke('auth-logout'),
  authGetUser: () => ipcRenderer.invoke('auth-get-user'),
  authIsLoggedIn: () => ipcRenderer.invoke('auth-is-logged-in'),
  authCheckSubscription: () => ipcRenderer.invoke('auth-check-subscription'),
  authGetSubscriptionPlans: () => ipcRenderer.invoke('auth-get-subscription-plans'),
  authGetDevices: () => ipcRenderer.invoke('auth-get-devices'),
  authRemoveDevice: (deviceId) => ipcRenderer.invoke('auth-remove-device', deviceId),
  authSaveRememberedEmail: (email) => ipcRenderer.invoke('auth-save-remembered-email', email),
  authGetRememberedEmail: () => ipcRenderer.invoke('auth-get-remembered-email'),
  authClearRememberedEmail: () => ipcRenderer.invoke('auth-clear-remembered-email')
});
