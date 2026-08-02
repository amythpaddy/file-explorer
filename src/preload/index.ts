import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  getSystemDrives: () => ipcRenderer.invoke('get-system-drives'),
  getHomePath: () => ipcRenderer.invoke('get-home-path'),
  getMediaMetadata: (filePath: string) => ipcRenderer.invoke('get-media-metadata', filePath)
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
