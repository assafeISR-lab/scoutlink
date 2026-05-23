'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function AutocompleteField({
  value,
  onChange,
  onSave,
  onPickSuggestion,
  suggestions,
  placeholder = '',
  canEdit = true,
  label,
  loading = false,
}: {
  value: string
  onChange: (v: string) => void
  onSave?: () => void
  onPickSuggestion?: (v: string) => void
  suggestions: string[]
  placeholder?: string
  canEdit?: boolean
  label?: string
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase())
  )

  function openDropdown() {
    if (inputRef.current) setDropdownRect(inputRef.current.getBoundingClientRect())
    setOpen(true)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!canEdit) {
    return (
      <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {label && <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{label}</span>}
        <span className="text-[10px]" style={{ color: value ? 'var(--text-primary)' : 'var(--text-faint)' }}>{value || '—'}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', height: 26 }}
      >
        <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Loading…</span>
      </div>
    )
  }

  const dropdown = open && filtered.length > 0 && dropdownRect ? createPortal(
    <div
      style={{
        position: 'fixed',
        top: dropdownRect.bottom + 2,
        left: dropdownRect.left,
        width: dropdownRect.width,
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        maxHeight: 160,
        overflowY: 'auto',
        borderRadius: 8,
        zIndex: 9999,
      }}
    >
      {filtered.map(s => (
        <button
          key={s}
          type="button"
          onMouseDown={e => {
            e.preventDefault()
            onChange(s)
            onPickSuggestion?.(s)
            setOpen(false)
            onSave?.()
          }}
          className="w-full text-left text-[10px] px-3 py-1.5 transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {s}
        </button>
      ))}
    </div>,
    document.body
  ) : null

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { e.currentTarget.style.borderColor = '#00c896'; openDropdown() }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; setTimeout(() => setOpen(false), 150); onSave?.() }}
        placeholder={placeholder}
        className="w-full text-[10px] px-2 py-1 rounded focus:outline-none"
        style={{
          background: 'var(--input-bg)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      />
      {dropdown}
    </div>
  )
}
