'use client'

import { useState, useRef, useEffect } from 'react'

export interface LinkChipItem {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
}

export default function LinkChips({
  links,
  canEdit = true,
}: {
  links: LinkChipItem[]
  canEdit?: boolean
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const visible = canEdit ? links : links.filter(l => l.value.startsWith('http'))
  if (visible.length === 0) return null

  return (
    <div>
      <p className="text-[10px] uppercase font-bold mt-2.5 mb-1.5 pt-2.5 pl-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderTop: '1px solid var(--border)', borderLeft: '2px solid #00c896' }}>Links</p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(({ label, value, onChange, onBlur }) => {
          const hasUrl = value.startsWith('http')
          if (canEdit && editing === label) {
            return (
              <input
                key={label}
                ref={inputRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={() => { setEditing(null); onBlur?.() }}
                placeholder="https://…"
                className="text-[10px] rounded-md px-2 py-0.5 focus:outline-none"
                style={{
                  background: 'rgba(0,200,150,0.07)',
                  border: '1px solid rgba(0,200,150,0.4)',
                  color: 'var(--text-primary)',
                  width: 150,
                  caretColor: '#00c896',
                }}
              />
            )
          }
          return (
            <div key={label} className="flex items-center">
              {hasUrl ? (
                <>
                  {/* Chip label → opens website */}
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-medium px-2 py-0.5 transition-all hover:opacity-80"
                    style={{
                      color: '#00c896',
                      background: 'rgba(0,200,150,0.08)',
                      border: '1px solid rgba(0,200,150,0.25)',
                      borderRadius: canEdit ? '6px 0 0 6px' : '6px',
                      textDecoration: 'none',
                    }}
                  >
                    {label}
                  </a>
                  {/* Edit icon → opens edit mode */}
                  {canEdit && (
                    <button
                      onClick={() => setEditing(label)}
                      className="flex items-center justify-center px-1.5 py-0.5 transition-all hover:opacity-80"
                      title="Edit URL"
                      style={{ color: '#00c896', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', borderLeft: 'none', borderRadius: '0 6px 6px 0' }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                  )}
                </>
              ) : (
                /* No URL yet → clicking opens edit mode */
                <button
                  onClick={canEdit ? () => setEditing(label) : undefined}
                  disabled={!canEdit}
                  className="text-[10px] font-medium px-2 py-0.5 transition-all"
                  style={{
                    color: 'var(--text-faint)',
                    background: 'transparent',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    cursor: canEdit ? 'pointer' : 'default',
                  }}
                >
                  {label}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
