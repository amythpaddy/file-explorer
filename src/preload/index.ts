import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  getSystemDrives: () => ipcRenderer.invoke('get-system-drives'),
  getHomePath: () => ipcRenderer.invoke('get-home-path'),
  getMediaMetadata: (filePath: string) => ipcRenderer.invoke('get-media-metadata', filePath),
  onToggleHiddenFiles: (callback: (show: boolean) => void) => {
    ipcRenderer.on('toggle-hidden-files', (_event, show) => callback(show))
  },
  toggleHiddenFiles: () => ipcRenderer.invoke('toggle-hidden-files-request'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  reloadWindow: () => ipcRenderer.invoke('window-reload'),
  onWindowMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window-maximize-change', (_event, isMaximized) => callback(isMaximized))
  },
  openPath: (filePath: string) => ipcRenderer.invoke('open-path', filePath)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
