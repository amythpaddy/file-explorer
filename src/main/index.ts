import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  Menu,
  MenuItemConstructorOptions
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import * as ExifReader from 'exifreader'

// Register privileged schemes before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true
    }
  }
])

let showHidden = false

function updateMenuCheckbox(checked: boolean): void {
  const menu = Menu.getApplicationMenu()
  if (menu) {
    const item = menu.getMenuItemById('toggle-hidden')
    if (item) {
      item.checked = checked
    }
  }
}

function setupMenu(mainWindow: BrowserWindow): void {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? ([{ role: 'appMenu' }] as MenuItemConstructorOptions[])
      : []),
    {
      label: 'File',
      submenu: [{ role: 'quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: 'View',
      submenu: [
        {
          id: 'toggle-hidden',
          label: 'Show Hidden Files',
          type: 'checkbox',
          checked: showHidden,
          accelerator: 'CmdOrCtrl+H',
          click: (menuItem) => {
            showHidden = menuItem.checked
            mainWindow.webContents.send('toggle-hidden-files', showHidden)
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? ([
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ] as MenuItemConstructorOptions[])
          : ([{ role: 'close' }] as MenuItemConstructorOptions[]))
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: false,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  setupMenu(mainWindow)

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximize-change', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximize-change', false)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Handle media:// protocol to serve local files securely
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url)
      let filePath = decodeURIComponent(url.pathname)
      if (process.platform === 'win32') {
        if (filePath.startsWith('/')) {
          filePath = filePath.substring(1)
        }
      } else {
        if (url.hostname) {
          filePath = '/' + url.hostname + filePath
        }
      }
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (e) {
      console.error('Failed to handle media protocol:', e)
      return new Response('Not Found', { status: 404 })
    }
  })

  // IPC Handlers
  ipcMain.handle('read-dir', async (_event, dirPath: string) => {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
      const files: any[] = []
      for (const entry of entries) {
        try {
          const fullPath = path.join(dirPath, entry.name)
          const stats = await fs.promises.stat(fullPath)
          files.push({
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            mtime: stats.mtimeMs,
            birthtime: stats.birthtimeMs
          })
        } catch (e) {
          // Ignore files that are locked or throw permission errors
        }
      }
      return { success: true, files }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-system-drives', async () => {
    if (process.platform === 'win32') {
      const drives: any[] = []
      for (let i = 65; i <= 90; i++) {
        const drive = String.fromCharCode(i) + ':\\'
        if (fs.existsSync(drive)) {
          drives.push({ name: `Local Disk (${String.fromCharCode(i)}:)`, path: drive })
        }
      }
      return drives
    } else {
      return [
        { name: 'Root (/)', path: '/' },
        { name: 'Home', path: app.getPath('home') }
      ]
    }
  })

  ipcMain.handle('get-home-path', () => {
    return app.getPath('home')
  })

  ipcMain.handle('get-media-metadata', async (_event, filePath: string) => {
    const ext = path.extname(filePath).toLowerCase()
    const result: any = { type: 'unknown' }

    try {
    const rawImageExts = [
      '.cr2',
      '.cr3',
      '.nef',
      '.nrw',
      '.arw',
      '.srf',
      '.sr2',
      '.dng',
      '.orf',
      '.rw2',
      '.raw',
      '.raf',
      '.pef',
      '.ptx',
      '.srw',
      '.mrw',
      '.erf',
      '.kdc',
      '.dcr',
      '.rwl',
      '.bay',
      '.3fr',
      '.fff'
    ]
    const standardImageExts = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.tiff',
      '.tif',
      '.bmp',
      '.gif',
      '.svg',
      '.ico',
      '.heic',
      '.heif',
      '.avif'
    ]
    const imageExts = [...standardImageExts, ...rawImageExts]

    if (imageExts.includes(ext)) {
        result.type = 'image'
        result.isRaw = rawImageExts.includes(ext)
        const buffer = await fs.promises.readFile(filePath)
        try {
          let tags: any
          try {
            tags = ExifReader.load(buffer, { expanded: true })
          } catch {
            tags = ExifReader.load(buffer)
          }

          const exif: any = {}

          if (tags.Thumbnail && tags.Thumbnail.base64) {
            result.thumbnailUrl = `data:image/jpeg;base64,${tags.Thumbnail.base64}`
          } else if (tags['Thumbnail'] && tags['Thumbnail'].base64) {
            result.thumbnailUrl = `data:image/jpeg;base64,${tags['Thumbnail'].base64}`
          }

          const exifSource = tags.exif || tags
          if (exifSource['DateTimeOriginal']) exif.dateTime = exifSource['DateTimeOriginal'].description
          if (exifSource['Make']) exif.make = exifSource['Make'].description
          if (exifSource['Model']) exif.model = exifSource['Model'].description
          if (exifSource['ExposureTime']) exif.exposureTime = exifSource['ExposureTime'].description
          if (exifSource['FNumber']) exif.fNumber = exifSource['FNumber'].description
          if (exifSource['ISOSpeedRatings']) exif.iso = exifSource['ISOSpeedRatings'].description
          if (tags.gps && tags.gps.Latitude !== undefined && tags.gps.Longitude !== undefined) {
            exif.gps = {
              lat: tags.gps.Latitude,
              lon: tags.gps.Longitude
            }
          } else if (exifSource['GPSLatitude'] && exifSource['GPSLongitude']) {
            exif.gps = {
              lat: exifSource['GPSLatitude'].description,
              lon: exifSource['GPSLongitude'].description
            }
          }

          const fileSource = tags.file || tags
          if (fileSource['Image Width'] && fileSource['Image Height']) {
            exif.width = fileSource['Image Width'].value
            exif.height = fileSource['Image Height'].value
          } else if (exifSource['PixelXDimension'] && exifSource['PixelYDimension']) {
            exif.width = exifSource['PixelXDimension'].value
            exif.height = exifSource['PixelYDimension'].value
          } else if (exifSource['Image Width'] && exifSource['Image Height']) {
            exif.width = exifSource['Image Width'].value
            exif.height = exifSource['Image Height'].value
          }
          result.exif = exif
        } catch (exifErr: any) {
          result.exifError = exifErr.message
        }
      } else if (['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'].includes(ext)) {
        result.type = 'audio'
        const mm = await (eval('import("music-metadata")') as Promise<any>)
        const metadata = await mm.parseFile(filePath)

        const audioInfo: any = {
          title: metadata.common.title || path.basename(filePath, ext),
          artist: metadata.common.artist || 'Unknown Artist',
          album: metadata.common.album || 'Unknown Album',
          year: metadata.common.year,
          duration: metadata.format.duration,
          sampleRate: metadata.format.sampleRate,
          bitrate: metadata.format.bitrate,
          format: metadata.format.container
        }

        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const pic = metadata.common.picture[0]
          const base64 = pic.data.toString('base64')
          audioInfo.coverUrl = `data:${pic.format};base64,${base64}`
        }
        result.audio = audioInfo
      } else if (['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)) {
        result.type = 'video'
        const mm = await (eval('import("music-metadata")') as Promise<any>)
        const metadata = await mm.parseFile(filePath)
        const videoInfo: any = {
          duration: metadata.format.duration,
          format: metadata.format.container,
          bitrate: metadata.format.bitrate
        }
        result.video = videoInfo
      }
      return { success: true, metadata: result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('toggle-hidden-files-request', () => {
    showHidden = !showHidden
    updateMenuCheckbox(showHidden)
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('toggle-hidden-files', showHidden)
    }
  })

  ipcMain.handle('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.handle('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.handle('window-close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.close()
  })

  ipcMain.handle('window-is-maximized', () => {
    const win = BrowserWindow.getFocusedWindow()
    return win ? win.isMaximized() : false
  })

  ipcMain.handle('window-reload', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.webContents.reload()
  })

  ipcMain.handle('open-path', async (_event, filePath: string) => {
    try {
      const error = await shell.openPath(filePath)
      if (error) {
        return { success: false, error }
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
