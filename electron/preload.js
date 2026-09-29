const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, native desktop APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  selectVideoFile: () => ipcRenderer.invoke('dialog:openVideoFile'),
  openExternalUrl: (url) => ipcRenderer.invoke('shell:openExternal', url),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings)
});
