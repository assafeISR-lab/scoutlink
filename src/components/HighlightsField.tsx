'use client'

import { useState } from 'react'

function parseHighlights(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch {}
  if (val.startsWith('http')) return [val]
  return []
}

function serializeHighlights(urls: string[]): string {
  const filtered = urls.filter(u => u.trim())
  if (filtered.length === 0) return ''
  return JSON.stringify(filtered)
}

export default function HighlightsField({
  value,
  onChange,
  onSave,
  canEdit = true,
}: {
  value: string | null | undefined
  onChange: (v: string) => void
  onSave?: () => void
  canEdit?: boolean
}) {
  const urls = parseHighlights(value)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function commit(newUrls: string[]) {
    onChange(serializeHighlights(newUrls))
    onSave?.()
  }

  function handleAdd() {
    const trimmed = draft.trim()
    if (!trimmed) { setAdding(false); return }
    commit([...urls, trimmed])
    setDraft('')
    setAdding(false)
  }

  function handleRemove(idx: number) {
    commit(urls.filter((_, i) => i !== idx))
  }

  if (!canEdit && urls.length === 0) return null

  return (
    <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
      <p className="text-[9px] uppercase tracking-[.7px] font-semibold mb-1.5" style={{ color: 'var(--text-faint)' }}>Highlights</p>

      {urls.length > 0 && (
        <div className="flex flex-col gap-1 mb-1.5">
          {urls.map((url, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md flex-1 min-w-0 transition-all hover:opacity-80"
                style={{ color: '#00c896', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', textDecoration: 'none' }}
              >
                <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
                <span className="truncate">Video {idx + 1}</span>
                <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
              </a>
              {canEdit && (
                <button
                  onClick={() => handleRemove(idx)}
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-all"
                  style={{ color: 'var(--text-faint)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        adding ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setDraft('') } }}
              onBlur={handleAdd}
              placeholder="https://…"
              className="flex-1 text-[10px] rounded-md px-2 py-0.5 focus:outline-none min-w-0"
              style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.4)', color: 'var(--text-primary)', caretColor: '#00c896' }}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md transition-all"
            style={{ color: 'var(--text-faint)', background: 'transparent', border: '1px dashed var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#00c896'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add highlight
          </button>
        )
      )}
    </div>
  )
}
