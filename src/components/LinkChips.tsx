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
      <p className="text-[9px] uppercase tracking-[.7px] font-semibold mt-2.5 mb-1.5 pt-2.5 border-t" style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>Links</p>
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
              <button
                onClick={canEdit ? () => setEditing(label) : undefined}
                disabled={!canEdit}
                className="text-[10px] font-medium px-2 py-0.5 transition-all"
                style={hasUrl ? {
                  color: '#00c896',
                  background: 'rgba(0,200,150,0.08)',
                  border: '1px solid rgba(0,200,150,0.25)',
                  borderRadius: hasUrl ? '6px 0 0 6px' : '6px',
                  cursor: canEdit ? 'pointer' : 'default',
                } : {
                  color: 'var(--text-faint)',
                  background: 'transparent',
                  border: '1px dashed var(--border)',
                  borderRadius: '6px',
                  cursor: canEdit ? 'pointer' : 'default',
                }}
              >
                {label}
              </button>
              {hasUrl && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-1.5 py-0.5 transition-all hover:opacity-80"
                  style={{ color: '#00c896', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', borderLeft: 'none', borderRadius: '0 6px 6px 0' }}
                >
                  ↗
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
