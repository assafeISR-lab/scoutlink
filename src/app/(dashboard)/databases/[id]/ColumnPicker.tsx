'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  PARAM_KEYS, PARAM_LABELS,
  loadActive, loadCustomActive, loadCustomKeys,
} from '@/app/(dashboard)/search/SearchParamsPanel'

// ─── Keys that PlayersTable actually renders as columns ───────────────────────
// Only these can be toggled on/off. Everything else is stored but shown only
// on the individual player profile page.

const TABLE_COLUMNS = new Set([
  'position', 'team', 'league', 'nationality',
  'age', 'dateOfBirth', 'height', 'weight',
  'marketValue', 'contractExpiry', 'preferredFoot', 'fmWages',
])

// ─── Column groups (mirrors the order in PARAM_KEYS) ─────────────────────────

const GROUPS: { label: string; keys: string[] }[] = [
  {
    label: 'Identity',
    keys: ['photo', 'nationality', 'passports', 'preferredFoot', 'age', 'dateOfBirth', 'height', 'weight'],
  },
  {
    label: 'Club / Career',
    keys: ['team', 'league', 'position', 'joiningDate', 'contractExpiry', 'seasonStats'],
  },
  {
    label: 'Financial',
    keys: ['marketValue', 'fmWages', 'transferFeeExpect', 'transferFeeReal', 'salaryExpect', 'salaryReal'],
  },
  {
    label: 'Scouting',
    keys: ['heatMap', 'keyStrengths', 'areasForImprovement', 'recentForm', 'description'],
  },
  {
    label: 'Links & Meta',
    keys: ['transfermarktLink', 'sofascoreLink', 'instagramLink', 'highlightsLink', 'sentBy'],
  },
]

// Label lookup — PARAM_LABELS covers built-ins; custom keys use themselves as the label
function getLabel(key: string): string {
  return (PARAM_LABELS as Record<string, string>)[key] ?? key
}

interface Props {
  databaseId: string
  columnConfig: string[] | null   // saved DB config; null = not yet configured
  onUpdate: (newConfig: string[]) => void
}

export default function ColumnPicker({ databaseId, columnConfig, onUpdate }: Props) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    if (columnConfig !== null) return new Set(columnConfig.filter(k => TABLE_COLUMNS.has(k)))
    return new Set([...loadActive(), ...loadCustomActive()].filter(k => TABLE_COLUMNS.has(k)))
  })
  const [customKeys, setCustomKeys] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : loadCustomKeys()
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  // Re-initialise whenever the drawer transitions to open
  useEffect(() => {
    if (!open) return
    setCustomKeys(loadCustomKeys())
    setSelected(
      columnConfig !== null
        ? new Set(columnConfig.filter(k => TABLE_COLUMNS.has(k)))
        : new Set([...loadActive(), ...loadCustomActive()].filter(k => TABLE_COLUMNS.has(k)))
    )
    setError('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(key: string) {
    if (!TABLE_COLUMNS.has(key)) return   // guard: profile-only params are not toggleable
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function selectAll() {
    // Only select keys that are actually table columns
    setSelected(new Set([...PARAM_KEYS, ...customKeys].filter(k => TABLE_COLUMNS.has(k))))
  }

  function clearAll() {
    setSelected(new Set())
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const config = [...selected]
    try {
      const res = await fetch(`/api/databases/${databaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnConfig: config }),
      })
      if (!res.ok) {
        let msg = `Failed to save (${res.status})`
        try {
          const d = await res.json()
          if (d.error) msg = d.error
        } catch { /* response wasn't JSON — keep status-code message */ }
        setError(msg)
        setSaving(false)
        return
      }
      onUpdate(config)
      router.refresh()
      setOpen(false)
    } catch {
      setError('Network error')
    }
    setSaving(false)
  }

  const totalSelected   = selected.size
  const totalToggleable = TABLE_COLUMNS.size  // 12 — the only ones that matter for the count

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.25)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
        </svg>
        Columns
        {columnConfig !== null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(108,143,255,0.2)', color: '#6c8fff' }}>
            {columnConfig.filter(k => TABLE_COLUMNS.has(k)).length}
          </span>
        )}
      </button>

      {/* Backdrop + drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col"
            style={{
              width: 340,
              background: 'var(--card-bg)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Configure Columns</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                  {totalSelected} of {totalToggleable} table columns selected
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Select all / Clear all */}
            <div className="flex gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
              <button
                onClick={selectAll}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{ background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Clear All
              </button>
            </div>

            {/* Scrollable group list */}
            <div className="flex-1 overflow-y-auto">
              {GROUPS.map(group => (
                <div key={group.label} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="px-5 py-2.5" style={{ background: 'var(--subtle-bg)' }}>
                    <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>
                      {group.label}
                    </p>
                  </div>
                  <div>
                    {group.keys.map(key => (
                      <CheckRow
                        key={key}
                        label={getLabel(key)}
                        checked={selected.has(key)}
                        disabled={!TABLE_COLUMNS.has(key)}
                        onToggle={() => toggle(key)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Custom params section */}
              {customKeys.length > 0 && (
                <div className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="px-5 py-2.5" style={{ background: 'var(--subtle-bg)' }}>
                    <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>
                      Custom
                    </p>
                  </div>
                  <div>
                    {customKeys.map(key => (
                      <CheckRow
                        key={key}
                        label={key}
                        checked={selected.has(key)}
                        disabled={!TABLE_COLUMNS.has(key)}
                        onToggle={() => toggle(key)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function CheckRow({
  label, checked, disabled, onToggle,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  if (disabled) {
    return (
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-3">
          {/* Inert checkbox outline */}
          <div
            className="w-4 h-4 rounded flex-shrink-0"
            style={{ border: '1.5px solid rgba(255,255,255,0.25)', background: 'transparent' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wide uppercase"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}
        >
          Profile only
        </span>
      </div>
    )
  }

  return (
    <label
      onClick={onToggle}
      className="flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors"
      style={{ background: checked ? 'rgba(0,200,150,0.04)' : 'transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = checked ? 'rgba(0,200,150,0.06)' : 'var(--hover-bg)' }}
      onMouseLeave={e => { e.currentTarget.style.background = checked ? 'rgba(0,200,150,0.04)' : 'transparent' }}
    >
      {/* Checkbox */}
      <div
        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: checked ? '#00c896' : 'transparent',
          border: `2px solid ${checked ? '#00c896' : '#6b7280'}`,
        }}
      >
        {checked && (
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#000">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        )}
      </div>
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
    </label>
  )
}
