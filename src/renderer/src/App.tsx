import { useEffect, useState } from 'react'
import {
  Folder,
  File,
  Image as ImageIcon,
  Music as MusicIcon,
  Video as VideoIcon,
  Search,
  Grid,
  List,
  ArrowUp,
  HardDrive,
  Home,
  ChevronRight,
  FileText,
  SlidersHorizontal,
  Check
} from 'lucide-react'
import PreviewPanel from './components/PreviewPanel'
import TitleBar from './components/TitleBar'

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [drives, setDrives] = useState<Array<{ name: string; path: string }>>([])
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterType, setFilterType] = useState<'all' | 'image' | 'audio' | 'video'>('all')

  const [selectedFile, setSelectedFile] = useState<any | null>(null)
  const [metadata, setMetadata] = useState<any | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)

  const [showHidden, setShowHidden] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)

  // Initialize paths and drives
  useEffect(() => {
    async function init() {
      const home = await window.api.getHomePath()
      setCurrentPath(home)
      const systemDrives = await window.api.getSystemDrives()
      setDrives(systemDrives)
      loadDirectory(home)
    }
    init()
  }, [])

  // Listen for hidden files toggle from main process
  useEffect(() => {
    window.api.onToggleHiddenFiles((show: boolean) => {
      setShowHidden(show)
    })
  }, [])

  // Listen for Ctrl+H (or Cmd+H on macOS) locally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      if (isCmdOrCtrl && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        window.api.toggleHiddenFiles()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showViewDropdown) return
    const handleOutsideClick = () => {
      setShowViewDropdown(false)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => {
      window.removeEventListener('click', handleOutsideClick)
    }
  }, [showViewDropdown])

  // Load directory items
  const loadDirectory = async (dirPath: string) => {
    setLoading(true)
    setSelectedFile(null)
    setMetadata(null)
    try {
      const result = await window.api.readDir(dirPath)
      if (result.success && result.files) {
        // Sort: folders first, then files alphabetically
        const sorted = [...result.files].sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
        setFiles(sorted)
        setCurrentPath(dirPath)
      } else {
        alert(`Error opening directory: ${result.error}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

const RAW_IMAGE_EXTENSIONS = [
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

const STANDARD_IMAGE_EXTENSIONS = [
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

const IMAGE_EXTENSIONS = [...STANDARD_IMAGE_EXTENSIONS, ...RAW_IMAGE_EXTENSIONS]

  // Handle single item click (select file/folder)
  const handleItemSelect = async (file: any) => {
    setSelectedFile(file)
    setMetadata(null)

    if (file.isDirectory) return

    const ext = getExtension(file.name)
    const isImage = IMAGE_EXTENSIONS.includes(ext)
    const isAudio = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'].includes(ext)
    const isVideo = ['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)

    if (isImage || isAudio || isVideo) {
      setMetadataLoading(true)
      try {
        const res = await window.api.getMediaMetadata(file.path)
        if (res.success) {
          setMetadata(res.metadata)
        }
      } catch (err) {
        console.error('Failed to load metadata', err)
      } finally {
        setMetadataLoading(false)
      }
    }
  }

  // Handle double click (navigate into folders or open files in OS)
  const handleItemDoubleClick = async (file: any) => {
    if (file.isDirectory) {
      loadDirectory(file.path)
    } else {
      const res = await window.api.openPath(file.path)
      if (!res.success && res.error) {
        console.error('Failed to open file:', res.error)
      }
    }
  }

  const navigateUp = () => {
    // Determine path separator
    const isWindows = currentPath.includes('\\')
    const separator = isWindows ? '\\' : '/'

    // Split segments and drop the last one
    const segments = currentPath.split(separator).filter(Boolean)

    if (segments.length === 0) return // Already at root

    let parentPath = ''
    if (isWindows) {
      // Windows disk check (e.g. C:)
      if (segments.length === 1) {
        parentPath = segments[0] + separator
      } else {
        parentPath = segments.slice(0, -1).join(separator)
      }
    } else {
      parentPath = '/' + segments.slice(0, -1).join('/')
    }

    if (parentPath) {
      loadDirectory(parentPath)
    }
  }

  const getExtension = (filename: string) => {
    const idx = filename.lastIndexOf('.')
    return idx === -1 ? '' : filename.substring(idx).toLowerCase()
  }

  const getFileIcon = (file: any) => {
    if (file.isDirectory)
      return <Folder size={32} className="logo-icon" style={{ color: 'var(--color-folder)' }} />

    const ext = getExtension(file.name)
    if (IMAGE_EXTENSIONS.includes(ext)) {
      return <ImageIcon size={32} style={{ color: 'var(--color-image)' }} />
    }
    if (['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'].includes(ext)) {
      return <MusicIcon size={32} style={{ color: 'var(--color-audio)' }} />
    }
    if (['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)) {
      return <VideoIcon size={32} style={{ color: 'var(--color-video)' }} />
    }
    return <FileText size={32} style={{ color: 'var(--color-file)' }} />
  }

  const getFileIconSmall = (file: any) => {
    if (file.isDirectory) return <Folder size={18} style={{ color: 'var(--color-folder)' }} />

    const ext = getExtension(file.name)
    if (IMAGE_EXTENSIONS.includes(ext)) {
      return <ImageIcon size={18} style={{ color: 'var(--color-image)' }} />
    }
    if (['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'].includes(ext)) {
      return <MusicIcon size={18} style={{ color: 'var(--color-audio)' }} />
    }
    if (['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)) {
      return <VideoIcon size={18} style={{ color: 'var(--color-video)' }} />
    }
    return <FileText size={18} style={{ color: 'var(--color-file)' }} />
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (ms?: number) => {
    if (!ms) return ''
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Filter and search computation
  const filteredFiles = files.filter((file) => {
    if (!showHidden && file.name.startsWith('.')) {
      return false
    }

    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (file.isDirectory) return true // Always show folders

    const ext = getExtension(file.name)
    if (filterType === 'image') {
      return IMAGE_EXTENSIONS.includes(ext)
    }
    if (filterType === 'audio') {
      return ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'].includes(ext)
    }
    if (filterType === 'video') {
      return ['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)
    }
    return true
  })

  // Quick shortcuts helper
  const navigateToShortcut = async (name: string) => {
    const home = await window.api.getHomePath()
    let target = home

    // Windows vs Linux path compatibility
    const separator = home.includes('\\') ? '\\' : '/'

    if (name === 'home') target = home
    else if (name === 'desktop') target = `${home}${separator}Desktop`
    else if (name === 'documents') target = `${home}${separator}Documents`
    else if (name === 'downloads') target = `${home}${separator}Downloads`
    else if (name === 'pictures') target = `${home}${separator}Pictures`
    else if (name === 'music') target = `${home}${separator}Music`
    else if (name === 'videos') target = `${home}${separator}Videos`

    loadDirectory(target)
  }

  // Breadcrumbs builder
  const renderBreadcrumbs = () => {
    const separator = currentPath.includes('\\') ? '\\' : '/'
    const segments = currentPath.split(separator).filter(Boolean)

    const breadcrumbs: React.ReactNode[] = []
    let accumulatedPath = currentPath.startsWith('/') ? '' : ''

    if (currentPath.startsWith('/')) {
      breadcrumbs.push(
        <span
          key="root"
          className="path-segment breadcrumb-root"
          onClick={() => loadDirectory('/')}
        >
          <HardDrive size={14} />
        </span>
      )
    }

    segments.forEach((segment, idx) => {
      if (currentPath.startsWith('/')) {
        accumulatedPath += '/' + segment
      } else {
        if (idx === 0) accumulatedPath = segment + separator
        else accumulatedPath += segment + (idx === segments.length - 1 ? '' : separator)
      }

      const currentAccPath = accumulatedPath

      breadcrumbs.push(
        <span key={`sep-${idx}`} className="path-separator">
          <ChevronRight size={12} />
        </span>
      )
      breadcrumbs.push(
        <span
          key={`seg-${idx}`}
          className="path-segment"
          onClick={() => loadDirectory(currentAccPath)}
        >
          {segment}
        </span>
      )
    })

    return breadcrumbs
  }

  return (
    <div className="app-layout">
      <TitleBar
        showHidden={showHidden}
        viewMode={viewMode}
        onToggleHidden={() => window.api.toggleHiddenFiles()}
        onSelectViewMode={(mode) => setViewMode(mode)}
        onNavigateHome={() => navigateToShortcut('home')}
      />

      <div className="app-body">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="sidebar-menu">
            {/* Drives Section */}
            <div className="menu-section">
            <span className="menu-title">Devices</span>
            {drives.map((drive) => (
              <div
                key={drive.path}
                className={`menu-item ${currentPath === drive.path ? 'active' : ''}`}
                onClick={() => loadDirectory(drive.path)}
              >
                <HardDrive size={16} />
                <span
                  style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  {drive.name}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Shortcuts Section */}
          <div className="menu-section">
            <span className="menu-title">Quick Access</span>
            <div className="menu-item" onClick={() => navigateToShortcut('home')}>
              <Home size={16} />
              <span>Home</span>
            </div>
            <div className="menu-item" onClick={() => navigateToShortcut('desktop')}>
              <Folder size={16} style={{ color: 'var(--color-folder)' }} />
              <span>Desktop</span>
            </div>
            <div className="menu-item" onClick={() => navigateToShortcut('pictures')}>
              <ImageIcon size={16} style={{ color: 'var(--color-image)' }} />
              <span>Pictures</span>
            </div>
            <div className="menu-item" onClick={() => navigateToShortcut('music')}>
              <MusicIcon size={16} style={{ color: 'var(--color-audio)' }} />
              <span>Music</span>
            </div>
            <div className="menu-item" onClick={() => navigateToShortcut('videos')}>
              <VideoIcon size={16} style={{ color: 'var(--color-video)' }} />
              <span>Videos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="workspace">
        <div className="workspace-header">
          <div className="path-container">
            <button
              className="control-btn"
              onClick={navigateUp}
              title="Go Up"
              style={{
                border: 'none',
                background: 'transparent',
                padding: '2px 6px',
                marginRight: 8,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <ArrowUp size={14} />
            </button>
            {renderBreadcrumbs()}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={14} />
              <input
                type="text"
                className="search-input"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="view-controls">
              <button
                className={`control-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid size={16} />
              </button>
              <button
                className={`control-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
              </button>
            </div>

            <div className="dropdown-container">
              <button
                className={`control-btn ${showViewDropdown ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowViewDropdown(!showViewDropdown)
                }}
                title="View Options"
              >
                <SlidersHorizontal size={16} />
              </button>
              {showViewDropdown && (
                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      window.api.toggleHiddenFiles()
                    }}
                  >
                    <div className="dropdown-item-checkbox">
                      {showHidden && <Check size={14} className="checkbox-icon" />}
                    </div>
                    <span>Show Hidden Files</span>
                    <span className="dropdown-shortcut">Ctrl+H</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Filter Tabs */}
        <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
          <button
            className={`menu-item ${filterType === 'all' ? 'active' : ''}`}
            style={{ padding: '6px 12px', borderRadius: '6px' }}
            onClick={() => setFilterType('all')}
          >
            All Files
          </button>
          <button
            className={`menu-item ${filterType === 'image' ? 'active' : ''}`}
            style={{ padding: '6px 12px', borderRadius: '6px' }}
            onClick={() => setFilterType('image')}
          >
            <ImageIcon size={14} style={{ color: 'var(--color-image)', marginRight: 6 }} />
            Images
          </button>
          <button
            className={`menu-item ${filterType === 'audio' ? 'active' : ''}`}
            style={{ padding: '6px 12px', borderRadius: '6px' }}
            onClick={() => setFilterType('audio')}
          >
            <MusicIcon size={14} style={{ color: 'var(--color-audio)', marginRight: 6 }} />
            Music
          </button>
          <button
            className={`menu-item ${filterType === 'video' ? 'active' : ''}`}
            style={{ padding: '6px 12px', borderRadius: '6px' }}
            onClick={() => setFilterType('video')}
          >
            <VideoIcon size={14} style={{ color: 'var(--color-video)', marginRight: 6 }} />
            Videos
          </button>
        </div>

        {/* Main Content Area */}
        <div className="content-pane">
          {loading ? (
            <div className="empty-preview">
              <div className="spinner">Scanning directory...</div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="empty-preview">
              <File size={48} className="empty-preview-icon" />
              <p className="empty-preview-text">
                This folder is empty or no files match search criteria
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="file-grid">
              {filteredFiles.map((file) => {
                const ext = getExtension(file.name)
                const isSelected = selectedFile?.path === file.path
                const selectionClass = isSelected
                  ? file.isDirectory
                    ? 'folder-selected selected'
                    : IMAGE_EXTENSIONS.includes(ext)
                      ? 'image-selected selected'
                      : ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'].includes(ext)
                        ? 'audio-selected selected'
                        : ['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)
                          ? 'video-selected selected'
                          : 'selected'
                  : ''

                return (
                  <div
                    key={file.path}
                    className={`grid-item ${selectionClass}`}
                    onClick={() => handleItemSelect(file)}
                    onDoubleClick={() => handleItemDoubleClick(file)}
                  >
                    <div className="grid-icon-wrapper">{getFileIcon(file)}</div>
                    <span className="grid-name">{file.name}</span>
                    <span className="grid-meta">
                      {file.isDirectory ? 'Folder' : formatSize(file.size)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="file-list">
              {filteredFiles.map((file) => {
                const ext = getExtension(file.name)
                const isSelected = selectedFile?.path === file.path
                const selectionClass = isSelected
                  ? file.isDirectory
                    ? 'folder-selected selected'
                    : IMAGE_EXTENSIONS.includes(ext)
                      ? 'image-selected selected'
                      : ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'].includes(ext)
                        ? 'audio-selected selected'
                        : ['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)
                          ? 'video-selected selected'
                          : 'selected'
                  : ''

                return (
                  <div
                    key={file.path}
                    className={`list-item ${selectionClass}`}
                    onClick={() => handleItemSelect(file)}
                    onDoubleClick={() => handleItemDoubleClick(file)}
                  >
                    <div className="list-icon">{getFileIconSmall(file)}</div>
                    <span className="list-name">{file.name}</span>
                    <span className="list-size">
                      {file.isDirectory ? '--' : formatSize(file.size)}
                    </span>
                    <span className="list-date">{formatDate(file.mtime)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

        {/* Right Preview Panel */}
        <PreviewPanel selectedFile={selectedFile} metadata={metadata} loading={metadataLoading} />
      </div>
    </div>
  )
}
