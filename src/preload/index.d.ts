import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      readDir: (dirPath: string) => Promise<{ success: boolean; files?: any[]; error?: string }>
      getSystemDrives: () => Promise<Array<{ name: string; path: string }>>
      getHomePath: () => Promise<string>
      getMediaMetadata: (
        filePath: string
      ) => Promise<{ success: boolean; metadata?: any; error?: string }>
      onToggleHiddenFiles: (callback: (show: boolean) => void) => void
      toggleHiddenFiles: () => Promise<void>
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      isWindowMaximized: () => Promise<boolean>
      reloadWindow: () => Promise<void>
      onWindowMaximizeChange: (callback: (isMaximized: boolean) => void) => void
      openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>
    }
  }
}
