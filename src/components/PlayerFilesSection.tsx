'use client'

import { useState, useEffect, useRef } from 'react'

interface PlayerFile {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { fullName: string }
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) {
    return (
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
    )
  }
  if (mimeType === 'application/pdf') {
    return (
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7H20.5v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
      </svg>
    )
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return (
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.38 0 2.5 1.12 2.5 2.5S13.38 11 12 11s-2.5-1.12-2.5-2.5S10.62 6 12 6zm5 12H7v-.57c0-2.09 3.29-3.14 5-3.14s5 1.05 5 3.14V18z"/>
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
    </svg>
  )
}

export default function PlayerFilesSection({
  playerId,
  databaseId,
  canWrite,
}: {
  playerId: string
  databaseId: string
  canWrite: boolean
}) {
  const [files, setFiles] = useState<PlayerFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const apiUrl = `/api/databases/${databaseId}/players/${playerId}/files`

  useEffect(() => {
    fetch(apiUrl)
      .then(r => r.json())
      .then(data => setFiles(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apiUrl])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large (max 20 MB)')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(apiUrl, { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) {
        setFiles(prev => [data, ...prev])
      } else {
        setError(data.error ?? 'Upload failed')
      }
    } catch {
      setError('Upload failed')
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(fileId: string) {
    setDeletingId(fileId)
    try {
      const res = await fetch(`${apiUrl}/${fileId}`, { method: 'DELETE' })
      if (res.ok) setFiles(prev => prev.filter(f => f.id !== fileId))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '16px 22px' }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>
            Files
          </p>
          {files.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
              {files.length}
            </span>
          )}
        </div>
        {canWrite && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.gps,.fit,.kml,.json"
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
              style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px dashed var(--border)' }}
              onMouseEnter={e => {
                if (!uploading) {
                  e.currentTarget.style.color = '#00c896'
                  e.currentTarget.style.borderColor = 'rgba(0,200,150,0.4)'
                  e.currentTarget.style.background = 'rgba(0,200,150,0.04)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {uploading ? (
                <>
                  <div className="w-3 h-3 rounded-full border animate-spin"
                    style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Attach file
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-[11px] mb-2 px-2 py-1 rounded-lg"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
            style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Loading…</span>
        </div>
      ) : files.length === 0 ? (
        <p className="text-[11px] italic" style={{ color: 'var(--text-faint)' }}>
          No files attached yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl group transition-colors"
              style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}
            >
              {/* Icon */}
              <span style={{ color: 'var(--text-faint)' }}>
                <FileIcon mimeType={file.mimeType} />
              </span>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium truncate block hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {file.fileName}
                </a>
                <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  {fmtSize(file.fileSize)} · {new Date(file.createdAt).toLocaleDateString()} · {file.uploadedBy.fullName}
                </p>
              </div>

              {/* Open link */}
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: 'var(--text-faint)', background: 'var(--hover-bg)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#00c896' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
              </a>

              {/* Delete */}
              {canWrite && (
                <button
                  onClick={() => handleDelete(file.id)}
                  disabled={deletingId === file.id}
                  className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 disabled:opacity-30"
                  style={{ color: 'var(--text-faint)', background: 'var(--hover-bg)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'var(--hover-bg)' }}
                >
                  {deletingId === file.id
                    ? <div className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
                    : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
