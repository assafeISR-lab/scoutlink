'use client'

import { useState } from 'react'

export const DEFAULT_LEVELS = [
  'First Team', 'U23', 'U21', 'U20', 'U19', 'U18', 'U17', 'U16', 'U15', 'U14',
]

export const SUGGESTED_LEVELS = [
  ['First Team', 'B Team', 'Reserves'],
  ['U23', 'U21', 'U20', 'U19'],
  ['U18', 'U17', 'U16', 'U15', 'U14'],
]

export const LEVEL_ORDER = [
  'First Team', 'B Team', 'Reserves',
  'U23', 'U21', 'U20', 'U19',
  'U18', 'U17', 'U16', 'U15', 'U14',
]

export function sortLevels(levels: string[]): string[] {
  return [...levels].sort((a, b) => {
    const ai = LEVEL_ORDER.indexOf(a)
    const bi = LEVEL_ORDER.indexOf(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
}

export function TeamPicker({
  existing,
  onConfirm,
  onClose,
  title = 'Add Teams',
  subtitle = 'Select all age groups for this club',
}: {
  existing: string[]
  onConfirm: (newLevels: string[]) => void
  onClose: () => void
  title?: string
  subtitle?: string
}) {
  const existingSet = new Set(existing)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [custom, setCustom] = useState('')

  function toggle(level: string) {
    if (existingSet.has(level)) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(level) ? next.delete(level) : next.add(level)
      return next
    })
  }

  function addCustom() {
    const val = custom.trim()
    if (!val || existingSet.has(val) || selected.has(val)) return
    setSelected(prev => new Set([...prev, val]))
    setCustom('')
  }

  function handleConfirm() {
    if (selected.size === 0) { onClose(); return }
    onConfirm(sortLevels([...selected]))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #6c8fff, #5a7aff)' }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(108,143,255,0.1)', border: '1px solid rgba(108,143,255,0.25)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#6c8fff">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{subtitle}</p>
            </div>
          </div>

          {/* Suggested grid */}
          <div className="flex flex-col gap-2 mb-4">
            {SUGGESTED_LEVELS.map((row, ri) => (
              <div key={ri} className="flex gap-2">
                {row.map(level => {
                  const isExisting = existingSet.has(level)
                  const isSelected = selected.has(level)
                  return (
                    <button
                      key={level}
                      onClick={() => toggle(level)}
                      disabled={isExisting}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={isExisting
                        ? { background: 'rgba(108,143,255,0.08)', color: 'rgba(108,143,255,0.4)', border: '1px solid rgba(108,143,255,0.15)', cursor: 'default' }
                        : isSelected
                          ? { background: 'rgba(108,143,255,0.18)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.5)', boxShadow: '0 0 0 2px rgba(108,143,255,0.15)' }
                          : { background: 'var(--subtle-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                      }
                      onMouseEnter={e => { if (!isExisting && !isSelected) e.currentTarget.style.background = 'var(--hover-bg)' }}
                      onMouseLeave={e => { if (!isExisting && !isSelected) e.currentTarget.style.background = 'var(--subtle-bg)' }}
                    >
                      {isExisting ? '✓ ' : isSelected ? '✓ ' : ''}{level}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex gap-2 mb-5">
            <input
              type="text"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
              placeholder="Custom team name…"
              className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
            <button
              onClick={addCustom}
              disabled={!custom.trim()}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: 'rgba(108,143,255,0.1)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }}
            >
              + Add
            </button>
          </div>

          {/* Selected custom tags */}
          {[...selected].filter(l => !SUGGESTED_LEVELS.flat().includes(l)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[...selected].filter(l => !SUGGESTED_LEVELS.flat().includes(l)).map(l => (
                <span key={l} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }}>
                  {l}
                  <button onClick={() => setSelected(prev => { const n = new Set(prev); n.delete(l); return n })}
                    className="hover:opacity-60">✕</button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={selected.size === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff', boxShadow: '0 2px 12px rgba(108,143,255,0.25)' }}
              onMouseEnter={e => { if (selected.size > 0) e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,143,255,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(108,143,255,0.25)' }}>
              Add {selected.size > 0 ? `${selected.size} Team${selected.size > 1 ? 's' : ''}` : 'Teams'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
