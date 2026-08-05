import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X, Folder, Eye, RotateCw, Power, Info, Grid, List } from 'lucide-react'

interface TitleBarProps {
  showHidden?: boolean
  viewMode?: 'grid' | 'list'
  onToggleHidden?: () => void
  onSelectViewMode?: (mode: 'grid' | 'list') => void
  onNavigateHome?: () => void
}

export default function TitleBar({
  showHidden = false,
  viewMode = 'grid',
  onToggleHidden,
  onSelectViewMode,
  onNavigateHome
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showAboutModal, setShowAboutModal] = useState(false)

  useEffect(() => {
    // Initial check for window maximize state
    window.api.isWindowMaximized().then((maximized) => {
      setIsMaximized(maximized)
    })

    // Listen for window maximize state changes
    window.api.onWindowMaximizeChange((maximized) => {
      setIsMaximized(maximized)
    })
  }, [])

  // Close menus on clicking outside
  useEffect(() => {
    if (!activeMenu) return
    const handleOutsideClick = () => {
      setActiveMenu(null)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => {
      window.removeEventListener('click', handleOutsideClick)
    }
  }, [activeMenu])

  const handleMinimize = () => {
    window.api.minimizeWindow()
  }

  const handleMaximize = () => {
    window.api.maximizeWindow()
  }

  const handleClose = () => {
    window.api.closeWindow()
  }

  const toggleMenu = (menuName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenu((prev) => (prev === menuName ? null : menuName))
  }

  return (
    <>
      <div className="titlebar">
        {/* Drag Region & Left Menu Section */}
        <div className="titlebar-left">
          <div className="titlebar-brand" onClick={() => onNavigateHome?.()}>
            <svg
              className="logo-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="titlebar-app-name">Media Explorer</span>
          </div>

          {/* Top Application Menus */}
          <div className="titlebar-menu-bar">
            {/* File Menu */}
            <div className="titlebar-menu-container">
              <button
                className={`titlebar-menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
                onClick={(e) => toggleMenu('file', e)}
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div className="titlebar-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="titlebar-dropdown-item"
                    onClick={() => {
                      onNavigateHome?.()
                      setActiveMenu(null)
                    }}
                  >
                    <Folder size={14} />
                    <span>Open Home Folder</span>
                  </div>
                  <div className="titlebar-dropdown-divider" />
                  <div
                    className="titlebar-dropdown-item titlebar-dropdown-danger"
                    onClick={() => {
                      handleClose()
                      setActiveMenu(null)
                    }}
                  >
                    <Power size={14} />
                    <span>Quit</span>
                    <span className="dropdown-shortcut">CmdOrCtrl+Q</span>
                  </div>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div className="titlebar-menu-container">
              <button
                className={`titlebar-menu-btn ${activeMenu === 'edit' ? 'active' : ''}`}
                onClick={(e) => toggleMenu('edit', e)}
              >
                Edit
              </button>
              {activeMenu === 'edit' && (
                <div className="titlebar-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="titlebar-dropdown-item"
                    onClick={() => {
                      document.execCommand('selectAll')
                      setActiveMenu(null)
                    }}
                  >
                    <span>Select All</span>
                    <span className="dropdown-shortcut">Ctrl+A</span>
                  </div>
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="titlebar-menu-container">
              <button
                className={`titlebar-menu-btn ${activeMenu === 'view' ? 'active' : ''}`}
                onClick={(e) => toggleMenu('view', e)}
              >
                View
              </button>
              {activeMenu === 'view' && (
                <div className="titlebar-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="titlebar-dropdown-item"
                    onClick={() => {
                      onToggleHidden?.()
                      setActiveMenu(null)
                    }}
                  >
                    <Eye size={14} />
                    <span>{showHidden ? 'Hide Hidden Files' : 'Show Hidden Files'}</span>
                    <span className="dropdown-shortcut">Ctrl+H</span>
                  </div>
                  <div className="titlebar-dropdown-divider" />
                  <div
                    className={`titlebar-dropdown-item ${viewMode === 'grid' ? 'selected-option' : ''}`}
                    onClick={() => {
                      onSelectViewMode?.('grid')
                      setActiveMenu(null)
                    }}
                  >
                    <Grid size={14} />
                    <span>Grid View</span>
                  </div>
                  <div
                    className={`titlebar-dropdown-item ${viewMode === 'list' ? 'selected-option' : ''}`}
                    onClick={() => {
                      onSelectViewMode?.('list')
                      setActiveMenu(null)
                    }}
                  >
                    <List size={14} />
                    <span>List View</span>
                  </div>
                  <div className="titlebar-dropdown-divider" />
                  <div
                    className="titlebar-dropdown-item"
                    onClick={() => {
                      window.api.reloadWindow()
                      setActiveMenu(null)
                    }}
                  >
                    <RotateCw size={14} />
                    <span>Reload Window</span>
                  </div>
                </div>
              )}
            </div>

            {/* Window Menu */}
            <div className="titlebar-menu-container">
              <button
                className={`titlebar-menu-btn ${activeMenu === 'window' ? 'active' : ''}`}
                onClick={(e) => toggleMenu('window', e)}
              >
                Window
              </button>
              {activeMenu === 'window' && (
                <div className="titlebar-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="titlebar-dropdown-item"
                    onClick={() => {
                      handleMinimize()
                      setActiveMenu(null)
                    }}
                  >
                    <Minus size={14} />
                    <span>Minimize</span>
                  </div>
                  <div
                    className="titlebar-dropdown-item"
                    onClick={() => {
                      handleMaximize()
                      setActiveMenu(null)
                    }}
                  >
                    {isMaximized ? <Copy size={14} /> : <Square size={14} />}
                    <span>{isMaximized ? 'Restore' : 'Maximize'}</span>
                  </div>
                  <div className="titlebar-dropdown-divider" />
                  <div
                    className="titlebar-dropdown-item titlebar-dropdown-danger"
                    onClick={() => {
                      handleClose()
                      setActiveMenu(null)
                    }}
                  >
                    <X size={14} />
                    <span>Close Window</span>
                  </div>
                </div>
              )}
            </div>

            {/* Help Menu */}
            <div className="titlebar-menu-container">
              <button
                className={`titlebar-menu-btn ${activeMenu === 'help' ? 'active' : ''}`}
                onClick={(e) => toggleMenu('help', e)}
              >
                Help
              </button>
              {activeMenu === 'help' && (
                <div className="titlebar-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="titlebar-dropdown-item"
                    onClick={() => {
                      setShowAboutModal(true)
                      setActiveMenu(null)
                    }}
                  >
                    <Info size={14} />
                    <span>About Media Explorer</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Draggable Spacer */}
        <div className="titlebar-drag-spacer" />

        {/* Window Control Buttons */}
        <div className="titlebar-controls">
          <button
            className="titlebar-control-btn"
            onClick={handleMinimize}
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            className="titlebar-control-btn"
            onClick={handleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Copy size={12} /> : <Square size={12} />}
          </button>
          <button
            className="titlebar-control-btn titlebar-close-btn"
            onClick={handleClose}
            title="Close"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* About Modal */}
      {showAboutModal && (
        <div className="modal-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <div className="about-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg
                  className="logo-icon"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Media Explorer</h2>
              </div>
              <button className="control-btn" onClick={() => setShowAboutModal(false)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12 }}>
              A modern, frameless file explorer built with Electron, React, and TypeScript. Supports media metadata inspection, waveform visualization, and camera RAW image preview.
            </p>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="menu-item active" style={{ padding: '6px 16px' }} onClick={() => setShowAboutModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
