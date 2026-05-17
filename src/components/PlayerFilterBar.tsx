'use client'

import { useState, useMemo, useEffect, useRef, useId } from 'react'

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type FilterMode = 'AND' | 'OR'
export type FilterKey =
  | 'name' | 'position' | 'club' | 'nationality'
  | 'age' | 'marketValue' | 'height'
  | 'league' | 'preferredFoot' | 'contractExpiry' | 'fmWages'
  | 'availability'
export type FilterParamType = 'text' | 'range' | 'multi'

export interface FilterParam {
  key: FilterKey
  label: string
  group: string
  type: FilterParamType
}

export interface Filters {
  name: string; positions: string[]; club: string; nationalities: string[]
  ageMin: number | null; ageMax: number | null
  marketValueMin: number | null; marketValueMax: number | null
  heightMin: number | null; heightMax: number | null
  league: string; preferredFeet: string[]
  contractExpiryYearMin: number | null; contractExpiryYearMax: number | null
  fmWagesMin: number | null; fmWagesMax: number | null
  availabilities: string[]
}

export const DEFAULT_FILTERS: Filters = {
  name: '', positions: [], club: '', nationalities: [],
  ageMin: null, ageMax: null, marketValueMin: null, marketValueMax: null,
  heightMin: null, heightMax: null,
  league: '', preferredFeet: [],
  contractExpiryYearMin: null, contractExpiryYearMax: null,
  fmWagesMin: null, fmWagesMax: null,
  availabilities: [],
}

export const FILTER_PARAMS: FilterParam[] = [
  { key: 'nationality',    label: 'Nationality',    group: 'Identity',      type: 'multi' },
  { key: 'preferredFoot', label: 'Preferred Foot', group: 'Identity',      type: 'multi' },
  { key: 'age',           label: 'Age',            group: 'Identity',      type: 'range' },
  { key: 'height',        label: 'Height',         group: 'Identity',      type: 'range' },
  { key: 'name',          label: 'Player Name',    group: 'Club / Career', type: 'text'  },
  { key: 'club',          label: 'Club',           group: 'Club / Career', type: 'text'  },
  { key: 'league',        label: 'League',         group: 'Club / Career', type: 'text'  },
  { key: 'position',      label: 'Position',       group: 'Club / Career', type: 'multi' },
  { key: 'contractExpiry',label: 'Contract Expiry',group: 'Club / Career', type: 'range' },
  { key: 'marketValue',   label: 'Market Value',   group: 'Financial',     type: 'range' },
  { key: 'fmWages',       label: 'FM Wages',       group: 'Financial',     type: 'range' },
  { key: 'availability',  label: 'Availability',   group: 'Status',        type: 'multi' },
]

// ─── Shared Helpers ───────────────────────────────────────────────────────────

export function getActiveChips(f: Filters): FilterKey[] {
  const keys: FilterKey[] = []
  if (f.name) keys.push('name')
  if (f.positions.length) keys.push('position')
  if (f.club) keys.push('club')
  if (f.nationalities.length) keys.push('nationality')
  if (f.ageMin !== null || f.ageMax !== null) keys.push('age')
  if (f.marketValueMin !== null || f.marketValueMax !== null) keys.push('marketValue')
  if (f.heightMin !== null || f.heightMax !== null) keys.push('height')
  if (f.league) keys.push('league')
  if (f.preferredFeet.length) keys.push('preferredFoot')
  if (f.contractExpiryYearMin !== null || f.contractExpiryYearMax !== null) keys.push('contractExpiry')
  if (f.fmWagesMin !== null || f.fmWagesMax !== null) keys.push('fmWages')
  if (f.availabilities.length) keys.push('availability')
  return keys
}

export function isFilterActive(f: Filters): boolean {
  return getActiveChips(f).length > 0
}

export function clearFilterForKey(key: FilterKey): Partial<Filters> {
  const p: Partial<Filters> = {}
  if (key === 'name')           p.name = ''
  if (key === 'position')       p.positions = []
  if (key === 'club')           p.club = ''
  if (key === 'nationality')    p.nationalities = []
  if (key === 'age')            { p.ageMin = null; p.ageMax = null }
  if (key === 'marketValue')    { p.marketValueMin = null; p.marketValueMax = null }
  if (key === 'height')         { p.heightMin = null; p.heightMax = null }
  if (key === 'league')         p.league = ''
  if (key === 'preferredFoot')  p.preferredFeet = []
  if (key === 'contractExpiry') { p.contractExpiryYearMin = null; p.contractExpiryYearMax = null }
  if (key === 'fmWages')        { p.fmWagesMin = null; p.fmWagesMax = null }
  if (key === 'availability')   p.availabilities = []
  return p
}

function chipValueSummary(key: FilterKey, f: Filters): string {
  const fmtMV = (v: number) => v === 0 ? '€0' : `€${(v / 1_000_000).toFixed(1)}M`
  const fmtW  = (v: number) => `£${(v / 1000).toFixed(0)}K`
  switch (key) {
    case 'name':          return f.name
    case 'position':      return f.positions.join(', ')
    case 'club':          return f.club
    case 'nationality':   return f.nationalities.join(', ')
    case 'league':        return f.league
    case 'preferredFoot': return f.preferredFeet.join(', ')
    case 'age':           return f.ageMin !== null && f.ageMax !== null ? `${f.ageMin}–${f.ageMax}` : f.ageMin !== null ? `≥${f.ageMin}` : `≤${f.ageMax}`
    case 'height':        return f.heightMin !== null && f.heightMax !== null ? `${f.heightMin}–${f.heightMax} cm` : f.heightMin !== null ? `≥${f.heightMin} cm` : `≤${f.heightMax} cm`
    case 'marketValue':   return f.marketValueMin !== null && f.marketValueMax !== null ? `${fmtMV(f.marketValueMin)}–${fmtMV(f.marketValueMax)}` : f.marketValueMin !== null ? `≥${fmtMV(f.marketValueMin)}` : `≤${fmtMV(f.marketValueMax!)}`
    case 'contractExpiry':return f.contractExpiryYearMin !== null && f.contractExpiryYearMax !== null ? `${f.contractExpiryYearMin}–${f.contractExpiryYearMax}` : f.contractExpiryYearMin !== null ? `≥${f.contractExpiryYearMin}` : `≤${f.contractExpiryYearMax}`
    case 'fmWages':       return f.fmWagesMin !== null && f.fmWagesMax !== null ? `${fmtW(f.fmWagesMin)}–${fmtW(f.fmWagesMax)}/w` : f.fmWagesMin !== null ? `≥${fmtW(f.fmWagesMin)}/w` : `≤${fmtW(f.fmWagesMax!)}/w`
    case 'availability':  return f.availabilities.join(', ')
  }
  return ''
}

// ─── PlayerFilterBar ──────────────────────────────────────────────────────────

export interface RangeBound { min: number; max: number; unit?: string; scale?: number }

export interface PlayerFilterBarProps {
  filters: Filters
  filterMode: FilterMode
  activeChips: FilterKey[]
  totalCount: number
  filteredCount: number
  addFilterOpen: boolean
  pendingFilter: FilterKey | null
  multiOptions: Record<string, string[]>
  rangeBounds: Record<string, RangeBound>
  /** Optional: shows a spinner instead of counts while data is loading */
  loading?: boolean
  /** Optional: custom placeholder for the name search input */
  placeholder?: string
  onSetMode: (m: FilterMode) => void
  onRemoveChip: (k: FilterKey) => void
  onEditChip: (k: FilterKey) => void
  onToggleAddFilter: () => void
  onSelectParam: (k: FilterKey) => void
  onClearAll: () => void
  updateFilter: (patch: Partial<Filters>) => void
  onClosePending: () => void
}

export function PlayerFilterBar({
  filters, filterMode, activeChips, totalCount, filteredCount, addFilterOpen, pendingFilter,
  multiOptions, rangeBounds, loading = false, placeholder = 'Search players…',
  onSetMode, onRemoveChip, onEditChip, onToggleAddFilter, onSelectParam, onClearAll,
  updateFilter, onClosePending,
}: PlayerFilterBarProps) {
  const uid    = useId()
  const dropId = `add-filter-dropdown-${uid}`
  const btnRef = useRef<HTMLButtonElement>(null)
  const hasFilters = activeChips.length > 0

  useEffect(() => {
    if (!addFilterOpen) return
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (document.getElementById(dropId)?.contains(t)) return
      if (btnRef.current?.contains(t)) return
      onToggleAddFilter()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [addFilterOpen, onToggleAddFilter, dropId])

  return (
    <div>
      <div className="relative flex items-center gap-2 flex-wrap rounded-xl border px-3 py-2"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>

        {/* Name search */}
        <div className="relative flex items-center flex-shrink-0">
          <svg className="absolute left-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-faint)' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text" value={filters.name} onChange={e => updateFilter({ name: e.target.value })}
            placeholder={placeholder}
            className="pl-8 py-1.5 rounded-lg text-sm focus:outline-none transition-colors"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: 220, paddingRight: filters.name ? 28 : 12 }}
            onFocus={e => { e.currentTarget.style.borderColor = '#00c896' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          {filters.name && (
            <button onClick={() => updateFilter({ name: '' })}
              className="absolute right-2 w-4 h-4 rounded flex items-center justify-center text-[11px] transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff6b6b' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)' }}>✕</button>
          )}
        </div>

        <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />

        {/* AND / OR */}
        <div className="flex rounded-md overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-strong)' }}>
          <button onClick={() => onSetMode('AND')} className="px-2.5 py-1 text-[11px] font-semibold transition-colors"
            style={{ background: filterMode === 'AND' ? 'rgba(0,200,150,0.18)' : 'transparent', color: filterMode === 'AND' ? '#00c896' : 'var(--text-faint)' }}>AND</button>
          <button onClick={() => onSetMode('OR')} className="px-2.5 py-1 text-[11px] font-semibold transition-colors"
            style={{ background: filterMode === 'OR' ? 'rgba(108,143,255,0.18)' : 'transparent', color: filterMode === 'OR' ? '#6c8fff' : 'var(--text-faint)' }}>OR</button>
        </div>

        {/* Active chips (name chip is already shown in the input) */}
        {activeChips.filter(key => key !== 'name').map(key => (
          <div key={key}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] cursor-pointer select-none"
            style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)' }}
            onClick={() => onEditChip(key)}>
            <span className="font-semibold" style={{ color: '#00c896' }}>{FILTER_PARAMS.find(p => p.key === key)?.label}</span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{chipValueSummary(key, filters)}</span>
            <button
              className="w-4 h-4 rounded flex items-center justify-center text-[10px] transition-all ml-0.5"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
              onClick={e => { e.stopPropagation(); onRemoveChip(key) }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,80,80,0.2)'; el.style.color = '#ff6b6b' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--hover-bg)'; el.style.color = 'var(--text-muted)' }}>✕</button>
          </div>
        ))}

        {/* Add Filter */}
        <button ref={btnRef} onClick={onToggleAddFilter}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] transition-all"
          style={{ background: addFilterOpen ? 'rgba(0,200,150,0.08)' : 'transparent', border: `1px dashed ${addFilterOpen ? '#00c896' : 'var(--border-strong)'}`, color: addFilterOpen ? '#00c896' : 'var(--text-muted)' }}>
          + Add Filter {addFilterOpen && <span className="text-[10px]">▴</span>}
        </button>

        {hasFilters && (
          <button onClick={onClearAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12.5px] transition-all"
            style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', color: '#ff6b6b' }}>
            ✕ Clear all
          </button>
        )}

        {/* Count / loading */}
        <span className="text-xs ml-auto whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
          {loading
            ? <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin inline-block" />
                loading…
              </span>
            : hasFilters
              ? <><strong style={{ color: '#00c896' }}>{filteredCount}</strong> of {totalCount} players</>
              : <><strong style={{ color: '#00c896' }}>{totalCount}</strong> players</>}
        </span>

        {addFilterOpen && <AddFilterDropdown dropId={dropId} activeKeys={activeChips} onSelect={onSelectParam} />}
      </div>

      {pendingFilter && (
        <FilterInputPanel
          filterKey={pendingFilter}
          filters={filters}
          multiOptions={multiOptions}
          rangeBounds={rangeBounds}
          onApply={patch => { updateFilter(patch); onClosePending() }}
          onCancel={onClosePending}
        />
      )}
    </div>
  )
}

// ─── Add Filter Dropdown ──────────────────────────────────────────────────────

function AddFilterDropdown({ dropId, activeKeys, onSelect }: {
  dropId: string; activeKeys: FilterKey[]; onSelect: (k: FilterKey) => void
}) {
  const [search, setSearch] = useState('')

  const groups = useMemo(() => {
    const list = search ? FILTER_PARAMS.filter(p => p.label.toLowerCase().includes(search.toLowerCase())) : FILTER_PARAMS
    const map = new Map<string, FilterParam[]>()
    for (const p of list) {
      if (!map.has(p.group)) map.set(p.group, [])
      map.get(p.group)!.push(p)
    }
    return map
  }, [search])

  const TAG: Record<FilterParamType, { label: string; color: string; bg: string }> = {
    range: { label: 'range', color: '#00c896', bg: 'rgba(0,200,150,0.1)' },
    multi: { label: 'multi', color: '#7b9fff', bg: 'rgba(100,150,255,0.1)' },
    text:  { label: 'text',  color: '#ffc840', bg: 'rgba(255,200,80,0.1)' },
  }

  return (
    <div id={dropId} className="absolute rounded-xl border overflow-hidden"
      style={{ top: 'calc(100% + 6px)', left: 14, width: 300, background: '#1a1d27', borderColor: '#2a2d3a', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 9999 }}>
      <div className="p-2.5 border-b" style={{ borderColor: '#2a2d3a' }}>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search parameters…"
          className="w-full px-2.5 py-1.5 rounded-lg text-sm focus:outline-none"
          style={{ background: '#0f1117', border: '1px solid #2a2d3a', color: '#ffffff' }}
          onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
          onBlur={e => e.currentTarget.style.borderColor = '#2a2d3a'} />
      </div>
      <div style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
        {[...groups.entries()].map(([group, params]) => (
          <div key={group}>
            <div className="px-3 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.28)' }}>{group}</div>
            {params.map(p => {
              const active = activeKeys.includes(p.key)
              const tag = TAG[p.type]
              return (
                <button key={p.key} onClick={() => onSelect(p.key)}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors"
                  style={{ color: active ? '#00c896' : 'rgba(255,255,255,0.75)', background: 'transparent' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <span>{active ? '✓ ' : ''}{p.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: tag.bg, color: tag.color }}>{tag.label}</span>
                </button>
              )
            })}
          </div>
        ))}
        {groups.size === 0 && <p className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No parameters match</p>}
      </div>
    </div>
  )
}

// ─── Filter Input Panel ───────────────────────────────────────────────────────

function FilterInputPanel({ filterKey, filters, multiOptions, rangeBounds, onApply, onCancel }: {
  filterKey: FilterKey; filters: Filters
  multiOptions: Record<string, string[]>; rangeBounds: Record<string, RangeBound>
  onApply: (patch: Partial<Filters>) => void; onCancel: () => void
}) {
  const param  = FILTER_PARAMS.find(p => p.key === filterKey)!
  const bounds = rangeBounds[filterKey] ?? { min: 0, max: 100 }
  const scale  = bounds.scale ?? 1

  const [textVal, setTextVal] = useState(() =>
    filterKey === 'name' ? filters.name : filterKey === 'club' ? filters.club : filters.league)
  const [multiSelected, setMultiSelected] = useState<string[]>(() =>
    filterKey === 'position' ? filters.positions : filterKey === 'nationality' ? filters.nationalities : filterKey === 'preferredFoot' ? filters.preferredFeet : filters.availabilities)
  const [rangeMin, setRangeMin] = useState(() => {
    const v = filterKey === 'age' ? filters.ageMin : filterKey === 'height' ? filters.heightMin : filterKey === 'marketValue' ? filters.marketValueMin : filterKey === 'contractExpiry' ? filters.contractExpiryYearMin : filters.fmWagesMin
    return v !== null ? String(v / scale) : ''
  })
  const [rangeMax, setRangeMax] = useState(() => {
    const v = filterKey === 'age' ? filters.ageMax : filterKey === 'height' ? filters.heightMax : filterKey === 'marketValue' ? filters.marketValueMax : filterKey === 'contractExpiry' ? filters.contractExpiryYearMax : filters.fmWagesMax
    return v !== null ? String(v / scale) : ''
  })

  function handleApply() {
    if (param.type === 'text') {
      if (filterKey === 'name')   return onApply({ name: textVal.trim() })
      if (filterKey === 'club')   return onApply({ club: textVal.trim() })
      if (filterKey === 'league') return onApply({ league: textVal.trim() })
    }
    if (param.type === 'multi') {
      if (filterKey === 'position')      return onApply({ positions: multiSelected })
      if (filterKey === 'nationality')   return onApply({ nationalities: multiSelected })
      if (filterKey === 'preferredFoot') return onApply({ preferredFeet: multiSelected })
      if (filterKey === 'availability')  return onApply({ availabilities: multiSelected })
    }
    if (param.type === 'range') {
      const lo = rangeMin !== '' ? parseFloat(rangeMin) * scale : null
      const hi = rangeMax !== '' ? parseFloat(rangeMax) * scale : null
      if (filterKey === 'age')            return onApply({ ageMin: lo, ageMax: hi })
      if (filterKey === 'height')         return onApply({ heightMin: lo, heightMax: hi })
      if (filterKey === 'marketValue')    return onApply({ marketValueMin: lo, marketValueMax: hi })
      if (filterKey === 'contractExpiry') return onApply({ contractExpiryYearMin: lo !== null ? Math.round(lo) : null, contractExpiryYearMax: hi !== null ? Math.round(hi) : null })
      if (filterKey === 'fmWages')        return onApply({ fmWagesMin: lo, fmWagesMax: hi })
    }
  }

  const inputStyle = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' } as React.CSSProperties

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-xl border px-4 py-3 mt-2" style={{ background: '#1a1d27', borderColor: '#2a2d3a' }}>
      <span className="text-sm font-semibold" style={{ color: '#00c896' }}>{param.label}</span>

      {param.type === 'text' && (
        <input autoFocus value={textVal} onChange={e => setTextVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
          placeholder="Type to filter…"
          className="px-2.5 py-1.5 rounded-lg text-sm focus:outline-none"
          style={{ ...inputStyle, width: 200 }}
          onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} />
      )}

      {param.type === 'range' && (
        <>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>from</span>
          <input type="number" value={rangeMin} onChange={e => setRangeMin(e.target.value)} placeholder={String(bounds.min / scale)}
            className="px-2.5 py-1.5 rounded-lg text-sm focus:outline-none" style={{ ...inputStyle, width: 90 }}
            onFocus={e => e.currentTarget.style.borderColor = '#00c896'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>to</span>
          <input type="number" value={rangeMax} onChange={e => setRangeMax(e.target.value)} placeholder={String(bounds.max / scale)}
            className="px-2.5 py-1.5 rounded-lg text-sm focus:outline-none" style={{ ...inputStyle, width: 90 }}
            onFocus={e => e.currentTarget.style.borderColor = '#00c896'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} />
          {bounds.unit && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{bounds.unit}</span>}
        </>
      )}

      {param.type === 'multi' && (
        <div className="flex flex-wrap gap-1.5">
          {(multiOptions[filterKey] ?? []).map(opt => {
            const checked = multiSelected.includes(opt)
            return (
              <button key={opt}
                onClick={() => setMultiSelected(s => s.includes(opt) ? s.filter(x => x !== opt) : [...s, opt])}
                className="px-2.5 py-1 rounded-md text-xs transition-all"
                style={{ background: checked ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${checked ? 'rgba(0,200,150,0.4)' : 'rgba(255,255,255,0.12)'}`, color: checked ? '#00c896' : 'rgba(255,255,255,0.7)', fontWeight: checked ? 600 : 400 }}>
                {opt}
              </button>
            )
          })}
          {!(multiOptions[filterKey] ?? []).length && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No options available</span>}
        </div>
      )}

      <div className="flex gap-2 ml-auto">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
        <button onClick={handleApply} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>Apply</button>
      </div>
    </div>
  )
}
