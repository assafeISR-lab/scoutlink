'use client'

import { useState, useMemo, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Player {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  position: string | null
  clubName: string | null
  nationality: string | null
  agentName: string | null
  dateOfBirth: string | null
  heightCm: number | null
  weightKg: number | null
  marketValue: number | null
  goalsThisYear: number | null
  totalGoals: number | null
  totalGames: number | null
  nationalGames: number | null
  yearsInProClub: number | null
  playsNational: boolean
}

type SortKey = 'name' | 'position' | 'club' | 'nationality' | 'age' | 'marketValue'
type SortDir = 'asc' | 'desc'
type FilterMode = 'AND' | 'OR'
type FilterKey = 'name' | 'position' | 'club' | 'nationality' | 'age' | 'marketValue'

interface Filters {
  name: string
  positions: string[]
  club: string
  nationalities: string[]
  ageMin: number | null
  ageMax: number | null
  marketValueMin: number | null
  marketValueMax: number | null
}

const DEFAULT_FILTERS: Filters = {
  name: '',
  positions: [],
  club: '',
  nationalities: [],
  ageMin: null,
  ageMax: null,
  marketValueMin: null,
  marketValueMax: null,
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function isFilterActive(filters: Filters): boolean {
  return (
    !!filters.name ||
    filters.positions.length > 0 ||
    !!filters.club ||
    filters.nationalities.length > 0 ||
    filters.ageMin !== null ||
    filters.ageMax !== null ||
    filters.marketValueMin !== null ||
    filters.marketValueMax !== null
  )
}

function activeFilterCount(filters: Filters): number {
  let n = 0
  if (filters.name) n++
  if (filters.positions.length > 0) n++
  if (filters.club) n++
  if (filters.nationalities.length > 0) n++
  if (filters.ageMin !== null || filters.ageMax !== null) n++
  if (filters.marketValueMin !== null || filters.marketValueMax !== null) n++
  return n
}

function columnHasFilter(col: FilterKey, filters: Filters): boolean {
  if (col === 'name') return !!filters.name
  if (col === 'position') return filters.positions.length > 0
  if (col === 'club') return !!filters.club
  if (col === 'nationality') return filters.nationalities.length > 0
  if (col === 'age') return filters.ageMin !== null || filters.ageMax !== null
  if (col === 'marketValue') return filters.marketValueMin !== null || filters.marketValueMax !== null
  return false
}

function matchesFilters(player: Player, filters: Filters, mode: FilterMode): boolean {
  const age = calcAge(player.dateOfBirth)

  const checks: (() => boolean)[] = []

  if (filters.name) {
    checks.push(() => `${player.firstName} ${player.lastName}`.toLowerCase().includes(filters.name.toLowerCase()))
  }
  if (filters.positions.length > 0) {
    checks.push(() => filters.positions.some(p => (player.position ?? '').toLowerCase() === p.toLowerCase()))
  }
  if (filters.club) {
    checks.push(() => (player.clubName ?? '').toLowerCase().includes(filters.club.toLowerCase()))
  }
  if (filters.nationalities.length > 0) {
    checks.push(() => filters.nationalities.some(n => (player.nationality ?? '').toLowerCase() === n.toLowerCase()))
  }
  if (filters.ageMin !== null || filters.ageMax !== null) {
    checks.push(() => {
      const a = age ?? 0
      if (filters.ageMin !== null && a < filters.ageMin) return false
      if (filters.ageMax !== null && a > filters.ageMax) return false
      return true
    })
  }
  if (filters.marketValueMin !== null || filters.marketValueMax !== null) {
    checks.push(() => {
      const mv = player.marketValue ?? 0
      if (filters.marketValueMin !== null && mv < filters.marketValueMin) return false
      if (filters.marketValueMax !== null && mv > filters.marketValueMax) return false
      return true
    })
  }

  if (checks.length === 0) return true
  return mode === 'AND' ? checks.every(f => f()) : checks.some(f => f())
}

export interface PlayersTableHandle {
  openCreateReport: () => void
}

const PlayersTable = forwardRef<PlayersTableHandle, {
  players: Player[]
  databaseId: string
  databaseName: string
  canEdit: boolean
}>(function PlayersTable({ players, databaseId, databaseName, canEdit }, ref) {
  const router = useRouter()
  const storageKey = `scoutlink_filters_${databaseId}`
  const storageModeKey = `scoutlink_filter_mode_${databaseId}`

  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filterMode, setFilterMode] = useState<FilterMode>('AND')
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null)
  const [showReport, setShowReport] = useState(false)

  useImperativeHandle(ref, () => ({
    openCreateReport: () => setShowReport(true),
  }))

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setFilters(JSON.parse(saved))
      const savedMode = localStorage.getItem(storageModeKey)
      if (savedMode === 'AND' || savedMode === 'OR') setFilterMode(savedMode)
    } catch {}
  }, [storageKey, storageModeKey])

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(filters))
  }, [filters, storageKey])

  useEffect(() => {
    localStorage.setItem(storageModeKey, filterMode)
  }, [filterMode, storageModeKey])

  // Derived unique values
  const uniquePositions = useMemo(() =>
    [...new Set(players.map(p => p.position).filter(Boolean) as string[])].sort()
  , [players])

  const uniqueNationalities = useMemo(() =>
    [...new Set(players.map(p => p.nationality).filter(Boolean) as string[])].sort()
  , [players])

  const ages = useMemo(() => players.map(p => calcAge(p.dateOfBirth)).filter(Boolean) as number[], [players])
  const ageRange = { min: ages.length ? Math.min(...ages) : 15, max: ages.length ? Math.max(...ages) : 45 }

  const mvs = useMemo(() => players.map(p => p.marketValue).filter(Boolean) as number[], [players])
  const mvRange = { min: 0, max: mvs.length ? Math.max(...mvs) : 200_000_000 }

  function updateFilter(patch: Partial<Filters>) {
    setFilters(f => ({ ...f, ...patch }))
  }

  function clearAllFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() =>
    players.filter(p => matchesFilters(p, filters, filterMode))
  , [players, filters, filterMode])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      if (sortKey === 'name') { av = `${a.firstName} ${a.lastName}`; bv = `${b.firstName} ${b.lastName}` }
      if (sortKey === 'position') { av = a.position ?? ''; bv = b.position ?? '' }
      if (sortKey === 'club') { av = a.clubName ?? ''; bv = b.clubName ?? '' }
      if (sortKey === 'nationality') { av = a.nationality ?? ''; bv = b.nationality ?? '' }
      if (sortKey === 'age') { av = calcAge(a.dateOfBirth) ?? -1; bv = calcAge(b.dateOfBirth) ?? -1 }
      if (sortKey === 'marketValue') { av = a.marketValue ?? -1; bv = b.marketValue ?? -1 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const hasFilters = isFilterActive(filters)
  const filterCount = activeFilterCount(filters)

  return (
    <div>
      {/* Active filters bar */}
      {hasFilters && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00c896] animate-pulse" />
            <span className="text-xs text-white/50">{filterCount} filter{filterCount !== 1 ? 's' : ''} active</span>
          </div>

          {/* AND / OR toggle */}
          <div className="flex items-center rounded-lg overflow-hidden border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode('AND')}
              className="px-2.5 py-1 font-semibold transition-colors"
              style={{ background: filterMode === 'AND' ? '#00c896' : 'rgba(255,255,255,0.04)', color: filterMode === 'AND' ? '#000' : 'rgba(255,255,255,0.4)' }}
            >AND</button>
            <button
              onClick={() => setFilterMode('OR')}
              className="px-2.5 py-1 font-semibold transition-colors"
              style={{ background: filterMode === 'OR' ? '#6c8fff' : 'rgba(255,255,255,0.04)', color: filterMode === 'OR' ? '#000' : 'rgba(255,255,255,0.4)' }}
            >OR</button>
          </div>

          <span className="text-xs text-white/25">
            {sorted.length} of {players.length} players shown
          </span>

          <button
            onClick={clearAllFilters}
            className="ml-auto text-xs text-white/30 hover:text-red-400 transition-colors"
          >
            Clear all filters ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-white/5 overflow-visible" style={{ background: 'linear-gradient(135deg, #141720 0%, #111318 100%)', borderRadius: '16px' }}>
        <div style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <ColHeader label="Player" sortKey="name" filterKey="name" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('name', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                  <TextFilter label="Search name" value={filters.name} onChange={v => updateFilter({ name: v })} />
                </ColHeader>
                <ColHeader label="Position" sortKey="position" filterKey="position" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('position', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                  <MultiSelectFilter options={uniquePositions} selected={filters.positions} onChange={v => updateFilter({ positions: v })} emptyText="No positions in database" />
                </ColHeader>
                <ColHeader label="Club" sortKey="club" filterKey="club" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('club', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                  <TextFilter label="Search club" value={filters.club} onChange={v => updateFilter({ club: v })} />
                </ColHeader>
                <ColHeader label="Nationality" sortKey="nationality" filterKey="nationality" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('nationality', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                  <MultiSelectFilter options={uniqueNationalities} selected={filters.nationalities} onChange={v => updateFilter({ nationalities: v })} emptyText="No nationalities in database" />
                </ColHeader>
                <ColHeader label="Age" sortKey="age" filterKey="age" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('age', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                  <RangeFilter
                    label="Age range"
                    min={ageRange.min}
                    max={ageRange.max}
                    low={filters.ageMin ?? ageRange.min}
                    high={filters.ageMax ?? ageRange.max}
                    onChange={(lo, hi) => updateFilter({
                      ageMin: lo === ageRange.min ? null : lo,
                      ageMax: hi === ageRange.max ? null : hi
                    })}
                    format={v => `${v} yrs`}
                  />
                </ColHeader>
                <ColHeader label="Market Value" sortKey="marketValue" filterKey="marketValue" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('marketValue', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter}>
                  <RangeFilter
                    label="Market value range"
                    min={mvRange.min}
                    max={mvRange.max}
                    low={filters.marketValueMin ?? mvRange.min}
                    high={filters.marketValueMax ?? mvRange.max}
                    onChange={(lo, hi) => updateFilter({
                      marketValueMin: lo === mvRange.min ? null : lo,
                      marketValueMax: hi === mvRange.max ? null : hi
                    })}
                    format={v => v === 0 ? '€0' : `€${(v / 1_000_000).toFixed(1)}M`}
                  />
                </ColHeader>
                {canEdit && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-6 py-12 text-center text-sm text-white/20">
                    {hasFilters ? 'No players match these filters' : 'No players yet'}
                  </td>
                </tr>
              ) : sorted.map((player, i) => {
                const age = calcAge(player.dateOfBirth)
                return (
                  <tr key={player.id} className="border-b border-white/5 last:border-0 transition-colors group"
                    style={i % 2 !== 0 ? { background: 'rgba(255,255,255,0.01)' } : {}}>
                    <td className="px-6 py-3">
                      <Link href={`/databases/${databaseId}/players/${player.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                          {player.firstName[0]}{player.lastName[0]}
                        </div>
                        <p className="text-sm font-medium text-white group-hover:text-[#00c896] transition-colors">{player.firstName} {player.lastName}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-white/50">{player.position || '—'}</td>
                    <td className="px-6 py-3 text-sm text-white/50">{player.clubName || '—'}</td>
                    <td className="px-6 py-3 text-sm text-white/50">{player.nationality || '—'}</td>
                    <td className="px-6 py-3 text-sm text-white/50">{age ?? '—'}</td>
                    <td className="px-6 py-3 text-sm text-white/50">
                      {player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(1)}M` : '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingPlayer(player)} title="Edit"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                          <button onClick={() => setDeletingPlayer(player)} title="Delete"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingPlayer && <EditModal player={editingPlayer} databaseId={databaseId} onClose={() => setEditingPlayer(null)} />}
      {deletingPlayer && <DeleteModal player={deletingPlayer} databaseId={databaseId} onClose={() => setDeletingPlayer(null)} />}
      {showReport && (
        <CreateReportModal
          players={sorted}
          databaseId={databaseId}
          databaseName={databaseName}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
})

export default PlayersTable

// ─── Column Header with sort + filter dropdown ────────────────────────────────

function ColHeader({ label, sortKey, filterKey, currentSort, sortDir, onSort, hasFilter, openFilter, setOpenFilter, children }: {
  label: string
  sortKey: SortKey
  filterKey: FilterKey
  currentSort: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
  hasFilter: boolean
  openFilter: FilterKey | null
  setOpenFilter: (k: FilterKey | null) => void
  children: React.ReactNode
}) {
  const isOpen = openFilter === filterKey
  const isSorted = currentSort === sortKey
  const btnRef = useRef<HTMLButtonElement>(null)
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      // ignore clicks inside any filter dropdown
      const dropdown = document.getElementById(`filter-drop-${filterKey}`)
      if (dropdown?.contains(target)) return
      if (btnRef.current?.contains(target)) return
      setOpenFilter(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, setOpenFilter, filterKey])

  function handleFilterClick() {
    if (isOpen) {
      setOpenFilter(null)
    } else {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect()
        setDropPos({ top: rect.bottom + 6, left: rect.left })
      }
      setOpenFilter(filterKey)
    }
  }

  return (
    <th className="text-left px-4 py-3" style={{ minWidth: filterKey === 'name' ? 180 : undefined }}>
      <div className="flex items-center gap-1">
        {/* Sort button */}
        <button
          onClick={() => onSort(sortKey)}
          className="flex items-center gap-1 text-xs uppercase tracking-widest font-medium transition-colors"
          style={{ color: isSorted ? '#00c896' : 'rgba(255,255,255,0.3)' }}
        >
          {label}
          <span className="text-[10px]">{isSorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>

        {/* Filter icon */}
        <button
          ref={btnRef}
          onClick={handleFilterClick}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors flex-shrink-0"
          style={{
            background: hasFilter ? 'rgba(0,200,150,0.15)' : (isOpen ? 'rgba(255,255,255,0.08)' : 'transparent'),
            color: hasFilter ? '#00c896' : 'rgba(255,255,255,0.3)',
          }}
          title="Filter"
        >
          {hasFilter ? (
            <span className="w-2 h-2 rounded-full bg-[#00c896]" />
          ) : (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A1 1 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown — fixed position to escape overflow:hidden */}
      {isOpen && dropPos && (
        <div
          id={`filter-drop-${filterKey}`}
          className="rounded-xl border border-white/10 p-3 min-w-[220px]"
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            zIndex: 9999,
            background: '#1a1f2e',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </th>
  )
}

// ─── Filter UIs ───────────────────────────────────────────────────────────────

function TextFilter({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">{label}</p>
      <div className="relative">
        <input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Type to filter..."
          className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        {value && (
          <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">✕</button>
        )}
      </div>
    </div>
  )
}

function MultiSelectFilter({ options, selected, onChange, emptyText }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  emptyText: string
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-white/30">Select</p>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-[10px] text-white/30 hover:text-red-400 transition-colors">Clear</button>
        )}
      </div>
      {options.length === 0 ? (
        <p className="text-xs text-white/20 py-2">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ background: selected.includes(opt) ? 'rgba(0,200,150,0.08)' : 'transparent' }}>
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-[#00c896] w-3.5 h-3.5"
              />
              <span className="text-sm text-white/70">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function RangeFilter({ label, min, max, low, high, onChange, format }: {
  label: string
  min: number
  max: number
  low: number
  high: number
  onChange: (lo: number, hi: number) => void
  format: (v: number) => string
}) {
  const safeLow = Math.max(min, Math.min(low, high))
  const safeHigh = Math.min(max, Math.max(high, low))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-white/30">{label}</p>
        <span className="text-xs text-white/50">{format(safeLow)} – {format(safeHigh)}</span>
      </div>
      <DualRangeSlider min={min} max={max} low={safeLow} high={safeHigh} onChange={onChange} />
    </div>
  )
}

function DualRangeSlider({ min, max, low, high, onChange }: {
  min: number; max: number; low: number; high: number
  onChange: (lo: number, hi: number) => void
}) {
  const range = max - min || 1
  const lowPct = ((low - min) / range) * 100
  const highPct = ((high - min) / range) * 100

  return (
    <div className="relative pt-1 pb-4">
      {/* Track */}
      <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="absolute h-full rounded-full" style={{
          background: 'linear-gradient(90deg, #00c896, #00a878)',
          left: `${lowPct}%`,
          right: `${100 - highPct}%`,
        }} />
      </div>

      {/* Low slider */}
      <input
        type="range"
        min={min}
        max={max}
        value={low}
        onChange={e => {
          const v = Number(e.target.value)
          if (v < high) onChange(v, high)
        }}
        className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer"
        style={{ zIndex: low > max - range * 0.05 ? 5 : 3 }}
      />

      {/* High slider */}
      <input
        type="range"
        min={min}
        max={max}
        value={high}
        onChange={e => {
          const v = Number(e.target.value)
          if (v > low) onChange(low, v)
        }}
        className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer"
        style={{ zIndex: 4 }}
      />

      {/* Visual thumbs */}
      <div className="absolute top-0 w-4 h-4 rounded-full border-2 pointer-events-none -translate-y-1/4"
        style={{ background: '#1a1f2e', borderColor: '#00c896', left: `calc(${lowPct}% - 8px)` }} />
      <div className="absolute top-0 w-4 h-4 rounded-full border-2 pointer-events-none -translate-y-1/4"
        style={{ background: '#1a1f2e', borderColor: '#00c896', left: `calc(${highPct}% - 8px)` }} />

      {/* Min/max labels */}
      <div className="flex justify-between mt-3">
        <span className="text-[10px] text-white/25">{min}</span>
        <span className="text-[10px] text-white/25">{max}</span>
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ player, databaseId, onClose }: { player: Player; databaseId: string; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toDateStr = (d: string | null) => d ? d.split('T')[0] : ''

  const [form, setForm] = useState({
    firstName: player.firstName,
    lastName: player.lastName,
    middleName: player.middleName ?? '',
    position: player.position ?? '',
    clubName: player.clubName ?? '',
    nationality: player.nationality ?? '',
    agentName: player.agentName ?? '',
    dateOfBirth: toDateStr(player.dateOfBirth),
    heightCm: player.heightCm?.toString() ?? '',
    weightKg: player.weightKg?.toString() ?? '',
    marketValue: player.marketValue != null ? (player.marketValue / 1_000_000).toString() : '',
    goalsThisYear: player.goalsThisYear?.toString() ?? '',
    totalGoals: player.totalGoals?.toString() ?? '',
    totalGames: player.totalGames?.toString() ?? '',
    nationalGames: player.nationalGames?.toString() ?? '',
    yearsInProClub: player.yearsInProClub?.toString() ?? '',
    playsNational: player.playsNational,
  })

  function set(field: string, value: string | boolean) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/databases/${databaseId}/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { onClose(); router.refresh() }
    else { const d = await res.json(); setError(d.error || 'Something went wrong') }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-1">Edit Player</h2>
        <p className="text-sm text-white/30 mb-6">{player.firstName} {player.lastName}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="First Name *" value={form.firstName} onChange={v => set('firstName', v)} required />
            <Field label="Middle Name" value={form.middleName} onChange={v => set('middleName', v)} />
            <Field label="Last Name *" value={form.lastName} onChange={v => set('lastName', v)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position" value={form.position} onChange={v => set('position', v)} />
            <Field label="Club" value={form.clubName} onChange={v => set('clubName', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nationality" value={form.nationality} onChange={v => set('nationality', v)} />
            <Field label="Agent Name" value={form.agentName} onChange={v => set('agentName', v)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date of Birth" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} type="date" />
            <Field label="Height (cm)" value={form.heightCm} onChange={v => set('heightCm', v)} type="number" />
            <Field label="Weight (kg)" value={form.weightKg} onChange={v => set('weightKg', v)} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Market Value (€M)" value={form.marketValue} onChange={v => set('marketValue', v)} type="number" />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.playsNational} onChange={e => set('playsNational', e.target.checked)} className="w-4 h-4 rounded accent-[#00c896]" />
                <span className="text-sm text-white/60">Plays for national team</span>
              </label>
            </div>
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs uppercase tracking-widest text-white/30 mb-3">Career Statistics</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Goals This Year" value={form.goalsThisYear} onChange={v => set('goalsThisYear', v)} type="number" />
              <Field label="Total Goals" value={form.totalGoals} onChange={v => set('totalGoals', v)} type="number" />
              <Field label="Total Games" value={form.totalGames} onChange={v => set('totalGames', v)} type="number" />
              <Field label="National Team Games" value={form.nationalGames} onChange={v => set('nationalGames', v)} type="number" />
              <Field label="Years in Pro Club" value={form.yearsInProClub} onChange={v => set('yearsInProClub', v)} type="number" />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/50" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
            <button type="submit" disabled={loading || !form.firstName.trim() || !form.lastName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ player, databaseId, onClose }: { player: Player; databaseId: string; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/databases/${databaseId}/players/${player.id}`, { method: 'DELETE' })
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => !loading && onClose()}>
      <div className="w-full max-w-sm rounded-2xl p-6 border border-white/10" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </div>
        <h2 className="text-lg font-semibold text-white text-center mb-2">Delete Player</h2>
        <p className="text-sm text-white/40 text-center mb-1">Are you sure you want to delete</p>
        <p className="text-sm font-semibold text-white text-center mb-4">"{player.firstName} {player.lastName}"?</p>
        <p className="text-xs text-white/25 text-center mb-6">This cannot be undone. All player data and notes will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm text-white/50 disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Report Modal ──────────────────────────────────────────────────────

function CreateReportModal({ players, databaseId, databaseName, onClose }: {
  players: Player[]
  databaseId: string
  databaseName: string
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleCreate() {
    if (!name.trim()) { setError('Report name is required'); return }
    setLoading(true)
    const snapshot = players.map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      position: p.position,
      clubName: p.clubName,
      nationality: p.nationality,
      age: p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      marketValue: p.marketValue,
      goalsThisYear: p.goalsThisYear,
      totalGoals: p.totalGoals,
      totalGames: p.totalGames,
      playsNational: p.playsNational,
    }))
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), databaseId, databaseName, players: snapshot }),
      })
      if (res.ok) {
        onClose()
        router.push('/reports')
        router.refresh()
      } else {
        const text = await res.text()
        let msg = 'Something went wrong'
        try { msg = JSON.parse(text)?.error || msg } catch {}
        setError(msg)
        setLoading(false)
      }
    } catch (err) {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6 border border-white/10" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(108,143,255,0.12)', border: '1px solid rgba(108,143,255,0.2)' }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#6c8fff"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-1">Create Report</h2>
        <p className="text-xs text-white/30 mb-5">
          Saving {players.length} player{players.length !== 1 ? 's' : ''} from <span className="text-white/50">{databaseName}</span>
        </p>

        <div className="mb-4">
          <label className="block text-xs text-white/40 mb-1">Report Name *</label>
          <input
            autoFocus
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={`${databaseName} — ${new Date().toLocaleDateString()}`}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none"
            style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/40" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
          <button onClick={handleCreate} disabled={loading || !name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aee)', color: '#fff' }}>
            {loading ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)' }}
        onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
    </div>
  )
}
