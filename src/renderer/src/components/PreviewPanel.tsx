import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Play, Pause, Music as MusicIcon, FileText, Info } from 'lucide-react'

interface PreviewPanelProps {
  selectedFile: any
  metadata: any
  loading: boolean
}

export default function PreviewPanel({ selectedFile, metadata, loading }: PreviewPanelProps) {
  if (!selectedFile) {
    return (
      <div className="preview-panel">
        <div className="empty-preview">
          <Info size={48} className="empty-preview-icon" />
          <p className="empty-preview-text">Select a file or folder to preview its details</p>
        </div>
      </div>
    )
  }

  // Format path to media:// protocol URL for Electron
  const getMediaUrl = (filePath: string) => {
    // Normalize path separators and encode URI
    const normalized = filePath.replace(/\\/g, '/')
    return `media://${encodeURIComponent(normalized).replace(/%2F/g, '/').replace(/%3A/g, ':')}`
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  const formatDate = (ms?: number) => {
    if (!ms) return 'Unknown'
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const fileUrl = getMediaUrl(selectedFile.path)

  return (
    <div className="preview-panel fade-in">
      <div className="preview-header">
        <span className={`file-type-badge ${
          selectedFile.isDirectory ? 'badge-folder' : 
          metadata?.type === 'image' ? 'badge-image' :
          metadata?.type === 'audio' ? 'badge-audio' :
          metadata?.type === 'video' ? 'badge-video' : 'badge-file'
        }`}>
          {selectedFile.isDirectory ? 'Folder' : metadata?.type || 'File'}
        </span>
        <div className="preview-header-title">Overview</div>
      </div>

      <div className="preview-content">
        {loading ? (
          <div className="empty-preview">
            <div className="spinner">Reading metadata...</div>
          </div>
        ) : selectedFile.isDirectory ? (
          <FolderPreview folder={selectedFile} formatDate={formatDate} />
        ) : metadata?.type === 'image' ? (
          <ImagePreview file={selectedFile} fileUrl={fileUrl} exif={metadata.exif} formatSize={formatSize} formatDate={formatDate} />
        ) : metadata?.type === 'audio' ? (
          <AudioPreview file={selectedFile} fileUrl={fileUrl} audio={metadata.audio} formatDuration={formatDuration} formatSize={formatSize} />
        ) : metadata?.type === 'video' ? (
          <VideoPreview file={selectedFile} fileUrl={fileUrl} video={metadata.video} formatDuration={formatDuration} formatSize={formatSize} formatDate={formatDate} />
        ) : (
          <GenericFilePreview file={selectedFile} formatSize={formatSize} formatDate={formatDate} />
        )}
      </div>
    </div>
  )
}

/* ================= Folder Preview ================= */
function FolderPreview({ folder, formatDate }: { folder: any; formatDate: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="preview-visual-container ratio-square" style={{ background: 'rgba(139, 92, 246, 0.05)', color: 'var(--color-folder)' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
        </svg>
      </div>
      <div>
        <h3 className="file-title-large">{folder.name}</h3>
      </div>
      <div className="metadata-section">
        <div className="metadata-title">Directory Info</div>
        <table className="metadata-table">
          <tbody>
            <tr className="metadata-row">
              <td className="metadata-label">Full Path</td>
              <td className="metadata-value" title={folder.path}>{folder.path}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Last Modified</td>
              <td className="metadata-value">{formatDate(folder.mtime)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================= Image Preview ================= */
function ImagePreview({ file, fileUrl, exif, formatSize, formatDate }: { file: any; fileUrl: string; exif: any; formatSize: any; formatDate: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="preview-visual-container ratio-image">
        <img src={fileUrl} className="preview-image" alt={file.name} />
      </div>
      <div>
        <h3 className="file-title-large">{file.name}</h3>
      </div>
      <div className="metadata-section">
        <div className="metadata-title">Image Details</div>
        <table className="metadata-table">
          <tbody>
            <tr className="metadata-row">
              <td className="metadata-label">Dimensions</td>
              <td className="metadata-value">{exif?.width && exif?.height ? `${exif.width} × ${exif.height} px` : 'Unknown'}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">File Size</td>
              <td className="metadata-value">{formatSize(file.size)}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Created</td>
              <td className="metadata-value">{formatDate(file.birthtime)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {exif && (exif.make || exif.model || exif.exposureTime || exif.dateTime) && (
        <div className="metadata-section">
          <div className="metadata-title">EXIF Camera Data</div>
          <table className="metadata-table">
            <tbody>
              {exif.make && (
                <tr className="metadata-row">
                  <td className="metadata-label">Camera Make</td>
                  <td className="metadata-value">{exif.make}</td>
                </tr>
              )}
              {exif.model && (
                <tr className="metadata-row">
                  <td className="metadata-label">Model</td>
                  <td className="metadata-value">{exif.model}</td>
                </tr>
              )}
              {exif.dateTime && (
                <tr className="metadata-row">
                  <td className="metadata-label">Date Taken</td>
                  <td className="metadata-value">{exif.dateTime}</td>
                </tr>
              )}
              {exif.exposureTime && (
                <tr className="metadata-row">
                  <td className="metadata-label">Exposure</td>
                  <td className="metadata-value">{exif.exposureTime}s</td>
                </tr>
              )}
              {exif.fNumber && (
                <tr className="metadata-row">
                  <td className="metadata-label">Aperture</td>
                  <td className="metadata-value">f/{exif.fNumber}</td>
                </tr>
              )}
              {exif.iso && (
                <tr className="metadata-row">
                  <td className="metadata-label">ISO</td>
                  <td className="metadata-value">{exif.iso}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ================= Audio Preview ================= */
interface AudioPreviewProps {
  file: any
  fileUrl: string
  audio: any
  formatDuration: any
  formatSize: any
}

function AudioPreview({ file, fileUrl, audio, formatDuration, formatSize }: AudioPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [totalTime, setTotalTime] = useState('0:00')

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(6, 182, 212, 0.25)',
      progressColor: '#06b6d4',
      cursorColor: '#22d3ee',
      barWidth: 2,
      barGap: 1,
      height: 48,
      url: fileUrl
    })

    wavesurferRef.current = ws

    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    
    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60).toString().padStart(2, '0')
      return `${minutes}:${seconds}`
    }

    ws.on('timeupdate', (time) => {
      setCurrentTime(formatTime(time))
    })

    ws.on('ready', (duration) => {
      setTotalTime(formatTime(duration))
    })

    return () => {
      ws.destroy()
    }
  }, [fileUrl])

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="preview-visual-container ratio-square">
        {audio?.coverUrl ? (
          <img src={audio.coverUrl} className="preview-cover-art" alt="Album art" />
        ) : (
          <div className="preview-audio-fallback">
            <MusicIcon size={64} />
          </div>
        )}
      </div>

      <div>
        <h3 className="file-title-large" style={{ fontSize: 16 }}>{audio?.title || file.name}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {audio?.artist || 'Unknown Artist'}
        </p>
      </div>

      <div className="waveform-section">
        <div ref={containerRef} className="waveform-container" />
        <div className="audio-controls">
          <span className="audio-time">{currentTime}</span>
          <button className="audio-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
          </button>
          <span className="audio-time">{totalTime || formatDuration(audio?.duration)}</span>
        </div>
      </div>

      <div className="metadata-section">
        <div className="metadata-title">Audio Details</div>
        <table className="metadata-table">
          <tbody>
            <tr className="metadata-row">
              <td className="metadata-label">Album</td>
              <td className="metadata-value">{audio?.album || 'Unknown Album'}</td>
            </tr>
            {audio?.year && (
              <tr className="metadata-row">
                <td className="metadata-label">Year</td>
                <td className="metadata-value">{audio.year}</td>
              </tr>
            )}
            <tr className="metadata-row">
              <td className="metadata-label">Format</td>
              <td className="metadata-value" style={{ textTransform: 'uppercase' }}>{audio?.format || 'Unknown'}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Bitrate</td>
              <td className="metadata-value">{audio?.bitrate ? `${Math.round(audio.bitrate / 1000)} kbps` : 'Unknown'}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Sample Rate</td>
              <td className="metadata-value">{audio?.sampleRate ? `${audio.sampleRate / 1000} kHz` : 'Unknown'}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">File Size</td>
              <td className="metadata-value">{formatSize(file.size)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================= Video Preview ================= */
function VideoPreview({ file, fileUrl, video, formatDuration, formatSize, formatDate }: { file: any; fileUrl: string; video: any; formatDuration: any; formatSize: any; formatDate: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="preview-visual-container ratio-video">
        <video src={fileUrl} className="preview-video" controls muted preload="metadata" />
      </div>
      <div>
        <h3 className="file-title-large">{file.name}</h3>
      </div>

      <div className="metadata-section">
        <div className="metadata-title">Video Details</div>
        <table className="metadata-table">
          <tbody>
            <tr className="metadata-row">
              <td className="metadata-label">Duration</td>
              <td className="metadata-value">{formatDuration(video?.duration)}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Format</td>
              <td className="metadata-value" style={{ textTransform: 'uppercase' }}>{video?.format || 'Unknown'}</td>
            </tr>
            {video?.bitrate && (
              <tr className="metadata-row">
                <td className="metadata-label">Bitrate</td>
                <td className="metadata-value">{`${Math.round(video.bitrate / 1000)} kbps`}</td>
              </tr>
            )}
            <tr className="metadata-row">
              <td className="metadata-label">File Size</td>
              <td className="metadata-value">{formatSize(file.size)}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Created</td>
              <td className="metadata-value">{formatDate(file.birthtime)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================= Generic File Preview ================= */
function GenericFilePreview({ file, formatSize, formatDate }: { file: any; formatSize: any; formatDate: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="preview-visual-container ratio-square" style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-muted)' }}>
        <FileText size={64} />
      </div>
      <div>
        <h3 className="file-title-large">{file.name}</h3>
      </div>
      <div className="metadata-section">
        <div className="metadata-title">File Details</div>
        <table className="metadata-table">
          <tbody>
            <tr className="metadata-row">
              <td className="metadata-label">File Size</td>
              <td className="metadata-value">{formatSize(file.size)}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Full Path</td>
              <td className="metadata-value" title={file.path}>{file.path}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Created</td>
              <td className="metadata-value">{formatDate(file.birthtime)}</td>
            </tr>
            <tr className="metadata-row">
              <td className="metadata-label">Modified</td>
              <td className="metadata-value">{formatDate(file.mtime)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
