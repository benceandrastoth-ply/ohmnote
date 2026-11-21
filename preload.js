// Narrow bridge between the page and the main process.
const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('ohm', {
  platform: process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux',
  listProjects: () => ipcRenderer.invoke('projects:list'),
  loadProject: (id) => ipcRenderer.invoke('project:load', id),
  saveProject: (p) => ipcRenderer.invoke('project:save', p),
  saveProjectSync: (p) => ipcRenderer.sendSync('project:saveSync', p),
  deleteProject: (id) => ipcRenderer.invoke('project:delete', id),
  exportProject: (p) => ipcRenderer.invoke('project:export', p),
  importProject: () => ipcRenderer.invoke('project:import'),
  exportPng: (rect, name) => ipcRenderer.invoke('export:png', rect, name),
  exportText: (text, name, ext, label) => ipcRenderer.invoke('export:text', text, name, ext, label),
  saveAsset: (pid, aid, dataUrl) => ipcRenderer.invoke('asset:save', pid, aid, dataUrl),
  loadAsset: (pid, name) => ipcRenderer.invoke('asset:load', pid, name),
  listAssets: (pid) => ipcRenderer.invoke('asset:list', pid),
  importAsset: (pid, name, dataUrl) => ipcRenderer.invoke('asset:import', pid, name, dataUrl),
  exportPdf: (name) => ipcRenderer.invoke('export:pdf', name),
  exportBinary: (bytes, name, ext, label) => ipcRenderer.invoke('export:binary', bytes, name, ext, label),
  listFonts: () => ipcRenderer.invoke('fonts:list'),
  fontSource: (id) => ipcRenderer.invoke('fonts:source', id),
  saveFont: (meta, bytes) => ipcRenderer.invoke('fonts:save', meta, bytes),
  deleteFont: (id) => ipcRenderer.invoke('fonts:delete', id),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
  setZoom: (f) => { if (f > 0.4 && f < 3 && Math.abs(webFrame.getZoomFactor() - f) > 0.001) webFrame.setZoomFactor(f); },
});
