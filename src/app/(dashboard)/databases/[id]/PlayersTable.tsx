'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loadActive, loadCustomActive } from '@/app/(dashboard)/search/SearchParamsPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomFieldEntry { fieldName: string; value: string }

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
  customFields: CustomFieldEntry[]
}

type SortKey = 'name' | 'position' | 'club' | 'nationality' | 'age' | 'marketValue' | 'height' | 'weight' | 'league' | 'contractExpiry' | 'fmWages'
type SortDir = 'asc' | 'desc'
type FilterMode = 'AND' | 'OR'
type FilterKey = 'name' | 'position' | 'club' | 'nationality' | 'age' | 'marketValue' | 'height' | 'weight' | 'league' | 'preferredFoot' | 'contractExpiry' | 'fmWages'

interface Filters {
  name: string
  positions: string[]
  club: string
  nationalities: string[]
  ageMin: number | null
  ageMax: number | null
  marketValueMin: number | null
  marketValueMax: number | null
  heightMin: number | null
  heightMax: number | null
  weightMin: number | null
  weightMax: number | null
  // Extended
  league: string
  preferredFeet: string[]
  contractExpiryYearMin: number | null
  contractExpiryYearMax: number | null
  fmWagesMin: number | null
  fmWagesMax: number | null
}

const DEFAULT_FILTERS: Filters = {
  name: '',
  positions: [],
  club: '',
  nationalities: [],
  ageMin: null, ageMax: null,
  marketValueMin: null, marketValueMax: null,
  heightMin: null, heightMax: null,
  weightMin: null, weightMax: null,
  league: '',
  preferredFeet: [],
  contractExpiryYearMin: null, contractExpiryYearMax: null,
  fmWagesMin: null, fmWagesMax: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCF(player: Player, fieldName: string): string {
  return player.customFields.find(f => f.fieldName === fieldName)?.value ?? ''
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function getContractYear(player: Player): number | null {
  const val = getCF(player, 'contractExpiry')
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.getFullYear()
}

function getFmWages(player: Player): number | null {
  const val = getCF(player, 'fmWages')
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function isFilterActive(f: Filters): boolean {
  return !!(f.name || f.positions.length || f.club || f.nationalities.length ||
    f.ageMin !== null || f.ageMax !== null || f.marketValueMin !== null || f.marketValueMax !== null ||
    f.heightMin !== null || f.heightMax !== null || f.weightMin !== null || f.weightMax !== null ||
    f.league || f.preferredFeet.length ||
    f.contractExpiryYearMin !== null || f.contractExpiryYearMax !== null ||
    f.fmWagesMin !== null || f.fmWagesMax !== null)
}

function activeFilterCount(f: Filters): number {
  let n = 0
  if (f.name) n++
  if (f.positions.length) n++
  if (f.club) n++
  if (f.nationalities.length) n++
  if (f.ageMin !== null || f.ageMax !== null) n++
  if (f.marketValueMin !== null || f.marketValueMax !== null) n++
  if (f.heightMin !== null || f.heightMax !== null) n++
  if (f.weightMin !== null || f.weightMax !== null) n++
  if (f.league) n++
  if (f.preferredFeet.length) n++
  if (f.contractExpiryYearMin !== null || f.contractExpiryYearMax !== null) n++
  if (f.fmWagesMin !== null || f.fmWagesMax !== null) n++
  return n
}

function columnHasFilter(col: FilterKey, f: Filters): boolean {
  if (col === 'name')        return !!f.name
  if (col === 'position')    return f.positions.length > 0
  if (col === 'club')        return !!f.club
  if (col === 'nationality') return f.nationalities.length > 0
  if (col === 'age')         return f.ageMin !== null || f.ageMax !== null
  if (col === 'marketValue') return f.marketValueMin !== null || f.marketValueMax !== null
  if (col === 'height')      return f.heightMin !== null || f.heightMax !== null
  if (col === 'weight')      return f.weightMin !== null || f.weightMax !== null
  if (col === 'league')      return !!f.league
  if (col === 'preferredFoot') return f.preferredFeet.length > 0
  if (col === 'contractExpiry') return f.contractExpiryYearMin !== null || f.contractExpiryYearMax !== null
  if (col === 'fmWages')    return f.fmWagesMin !== null || f.fmWagesMax !== null
  return false
}

function matchesFilters(player: Player, f: Filters, mode: FilterMode): boolean {
  const age = calcAge(player.dateOfBirth)
  const contractYear = getContractYear(player)
  const fmWages = getFmWages(player)

  const checks: (() => boolean)[] = []

  if (f.name) checks.push(() => `${player.firstName} ${player.lastName}`.toLowerCase().includes(f.name.toLowerCase()))
  if (f.positions.length)    checks.push(() => f.positions.some(p => (player.position ?? '').toLowerCase() === p.toLowerCase()))
  if (f.club)                checks.push(() => (player.clubName ?? '').toLowerCase().includes(f.club.toLowerCase()))
  if (f.nationalities.length) checks.push(() => f.nationalities.some(n => (player.nationality ?? '').toLowerCase() === n.toLowerCase()))
  if (f.ageMin !== null || f.ageMax !== null) checks.push(() => {
    const a = age ?? 0
    if (f.ageMin !== null && a < f.ageMin) return false
    if (f.ageMax !== null && a > f.ageMax) return false
    return true
  })
  if (f.marketValueMin !== null || f.marketValueMax !== null) checks.push(() => {
    const mv = player.marketValue ?? 0
    if (f.marketValueMin !== null && mv < f.marketValueMin) return false
    if (f.marketValueMax !== null && mv > f.marketValueMax) return false
    return true
  })
  if (f.heightMin !== null || f.heightMax !== null) checks.push(() => {
    const h = player.heightCm ?? 0
    if (f.heightMin !== null && h < f.heightMin) return false
    if (f.heightMax !== null && h > f.heightMax) return false
    return true
  })
  if (f.weightMin !== null || f.weightMax !== null) checks.push(() => {
    const w = player.weightKg ?? 0
    if (f.weightMin !== null && w < f.weightMin) return false
    if (f.weightMax !== null && w > f.weightMax) return false
    return true
  })
  if (f.league) checks.push(() => getCF(player, 'league').toLowerCase().includes(f.league.toLowerCase()))
  if (f.preferredFeet.length) checks.push(() => f.preferredFeet.some(foot => getCF(player, 'foot').toLowerCase() === foot.toLowerCase()))
  if (f.contractExpiryYearMin !== null || f.contractExpiryYearMax !== null) checks.push(() => {
    const cy = contractYear ?? 0
    if (f.contractExpiryYearMin !== null && cy < f.contractExpiryYearMin) return false
    if (f.contractExpiryYearMax !== null && cy > f.contractExpiryYearMax) return false
    return true
  })
  if (f.fmWagesMin !== null || f.fmWagesMax !== null) checks.push(() => {
    const w = fmWages ?? 0
    if (f.fmWagesMin !== null && w < f.fmWagesMin) return false
    if (f.fmWagesMax !== null && w > f.fmWagesMax) return false
    return true
  })

  if (checks.length === 0) return true
  return mode === 'AND' ? checks.every(fn => fn()) : checks.some(fn => fn())
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PlayersTableHandle {
  openCreateReport: () => void
}

const PlayersTable = forwardRef<PlayersTableHandle, {
  players: Player[]
  databaseId: string
  databaseName: string
  canEdit: boolean
  columnConfig: string[] | null
}>(function PlayersTable({ players, databaseId, databaseName, canEdit, columnConfig }, ref) {
  const router = useRouter()
  const storageKey     = `scoutlink_filters_${databaseId}`
  const storageModeKey = `scoutlink_filter_mode_${databaseId}`

  const [sortKey,  setSortKey]  = useState<SortKey>('name')
  const [sortDir,  setSortDir]  = useState<SortDir>('asc')
  const [filters,  setFilters]  = useState<Filters>(DEFAULT_FILTERS)
  const [filterMode, setFilterMode] = useState<FilterMode>('AND')
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)
  const [editingPlayer,  setEditingPlayer]  = useState<Player | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [visibleParams, setVisibleParams] = useState<Set<string>>(new Set())

  useImperativeHandle(ref, () => ({ openCreateReport: () => setShowReport(true) }))

  // Visible columns: from DB-saved columnConfig prop, or fall back to global settings
  useEffect(() => {
    if (columnConfig !== null) {
      setVisibleParams(new Set(columnConfig))
    } else {
      const active       = loadActive()
      const customActive = loadCustomActive()
      setVisibleParams(new Set([...active, ...customActive]))
    }
  }, [columnConfig])

  // Persisted filters
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setFilters(prev => ({ ...prev, ...JSON.parse(saved) }))
      const savedMode = localStorage.getItem(storageModeKey)
      if (savedMode === 'AND' || savedMode === 'OR') setFilterMode(savedMode)
    } catch {}
  }, [storageKey, storageModeKey])

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(filters)) }, [filters, storageKey])
  useEffect(() => { localStorage.setItem(storageModeKey, filterMode) }, [filterMode, storageModeKey])

  // Column visibility helpers
  const show = (key: string) => visibleParams.has(key)
  const showDob = show('age') || show('dateOfBirth')

  // Derived unique values for multi-select filters
  const uniquePositions = useMemo(() =>
    [...new Set(players.map(p => p.position).filter(Boolean) as string[])].sort(), [players])
  const uniqueNationalities = useMemo(() =>
    [...new Set(players.map(p => p.nationality).filter(Boolean) as string[])].sort(), [players])
  const uniqueFeet = useMemo(() =>
    [...new Set(players.map(p => getCF(p, 'foot')).filter(Boolean))].sort(), [players])

  // Range bounds
  const ages      = useMemo(() => players.map(p => calcAge(p.dateOfBirth)).filter(Boolean) as number[], [players])
  const ageRange  = { min: ages.length ? Math.min(...ages) : 15, max: ages.length ? Math.max(...ages) : 45 }
  const mvs       = useMemo(() => players.map(p => p.marketValue).filter(Boolean) as number[], [players])
  const mvRange   = { min: 0, max: mvs.length ? Math.max(...mvs) : 200_000_000 }
  const heights   = useMemo(() => players.map(p => p.heightCm).filter(Boolean) as number[], [players])
  const heightRange = { min: heights.length ? Math.min(...heights) : 150, max: heights.length ? Math.max(...heights) : 210 }
  const weights   = useMemo(() => players.map(p => p.weightKg).filter(Boolean) as number[], [players])
  const weightRange = { min: weights.length ? Math.min(...weights) : 50, max: weights.length ? Math.max(...weights) : 120 }

  const contractYears = useMemo(() =>
    players.map(p => getContractYear(p)).filter(Boolean) as number[], [players])
  const contractYearRange = {
    min: contractYears.length ? Math.min(...contractYears) : new Date().getFullYear(),
    max: contractYears.length ? Math.max(...contractYears) : new Date().getFullYear() + 8,
  }
  const fmWagesVals = useMemo(() =>
    players.map(p => getFmWages(p)).filter(Boolean) as number[], [players])
  const fmWagesRange = { min: 0, max: fmWagesVals.length ? Math.max(...fmWagesVals) : 200_000 }

  function updateFilter(patch: Partial<Filters>) { setFilters(f => ({ ...f, ...patch })) }
  function clearAllFilters() { setFilters(DEFAULT_FILTERS) }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() =>
    players.filter(p => matchesFilters(p, filters, filterMode)), [players, filters, filterMode])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av: string | number = 0, bv: string | number = 0
    if (sortKey === 'name')          { av = `${a.firstName} ${a.lastName}`; bv = `${b.firstName} ${b.lastName}` }
    if (sortKey === 'position')      { av = a.position ?? ''; bv = b.position ?? '' }
    if (sortKey === 'club')          { av = a.clubName ?? ''; bv = b.clubName ?? '' }
    if (sortKey === 'nationality')   { av = a.nationality ?? ''; bv = b.nationality ?? '' }
    if (sortKey === 'age')           { av = calcAge(a.dateOfBirth) ?? -1; bv = calcAge(b.dateOfBirth) ?? -1 }
    if (sortKey === 'marketValue')   { av = a.marketValue ?? -1; bv = b.marketValue ?? -1 }
    if (sortKey === 'height')        { av = a.heightCm ?? -1; bv = b.heightCm ?? -1 }
    if (sortKey === 'weight')        { av = a.weightKg ?? -1; bv = b.weightKg ?? -1 }
    if (sortKey === 'league')        { av = getCF(a, 'league'); bv = getCF(b, 'league') }
    if (sortKey === 'contractExpiry') { av = getContractYear(a) ?? -1; bv = getContractYear(b) ?? -1 }
    if (sortKey === 'fmWages')       { av = getFmWages(a) ?? -1; bv = getFmWages(b) ?? -1 }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [filtered, sortKey, sortDir])

  const hasFilters  = isFilterActive(filters)
  const filterCount = activeFilterCount(filters)

  // Count visible data columns (for empty row colSpan)
  const visibleColCount = 1 + // name always
    (show('position') ? 1 : 0) +
    (show('team') ? 1 : 0) +
    (show('league') ? 1 : 0) +
    (show('nationality') ? 1 : 0) +
    (showDob ? 1 : 0) +
    (show('height') ? 1 : 0) +
    (show('weight') ? 1 : 0) +
    (show('marketValue') ? 1 : 0) +
    (show('contractExpiry') ? 1 : 0) +
    (show('preferredFoot') ? 1 : 0) +
    (show('fmWages') ? 1 : 0) +
    (canEdit ? 1 : 0)

  return (
    <div>
      {/* Active filters bar */}
      {hasFilters && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00c896] animate-pulse" />
            <span className="text-xs text-white/50">{filterCount} filter{filterCount !== 1 ? 's' : ''} active</span>
          </div>
          <div className="flex items-center rounded-lg overflow-hidden border border-white/10 text-xs">
            <button onClick={() => setFilterMode('AND')} className="px-2.5 py-1 font-semibold transition-colors"
              style={{ background: filterMode === 'AND' ? '#00c896' : 'var(--hover-bg)', color: filterMode === 'AND' ? '#000' : 'var(--text-muted)' }}>AND</button>
            <button onClick={() => setFilterMode('OR')} className="px-2.5 py-1 font-semibold transition-colors"
              style={{ background: filterMode === 'OR' ? '#6c8fff' : 'var(--hover-bg)', color: filterMode === 'OR' ? '#000' : 'var(--text-muted)' }}>OR</button>
          </div>
          <span className="text-xs text-white/25">{sorted.length} of {players.length} players shown</span>
          <button onClick={clearAllFilters} className="ml-auto text-xs text-white/30 hover:text-red-400 transition-colors">
            Clear all filters ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-white/5" style={{ background: 'var(--card-bg)', borderRadius: '16px' }}>
        <div style={{ borderRadius: '16px', overflowX: 'auto' }}>
          <table style={{ minWidth: '600px', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-white/5">

                {/* Player — always shown */}
                <ColHeader label="Player" sortKey="name" filterKey="name" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('name', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={200} sticky="left">
                  <TextFilter label="Search name" value={filters.name} onChange={v => updateFilter({ name: v })} />
                </ColHeader>

                {show('position') && (
                  <ColHeader label="Position" sortKey="position" filterKey="position" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('position', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={110}>
                    <MultiSelectFilter options={uniquePositions} selected={filters.positions} onChange={v => updateFilter({ positions: v })} emptyText="No positions in list" />
                  </ColHeader>
                )}

                {show('team') && (
                  <ColHeader label="Club" sortKey="club" filterKey="club" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('club', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={150}>
                    <TextFilter label="Search club" value={filters.club} onChange={v => updateFilter({ club: v })} />
                  </ColHeader>
                )}

                {show('league') && (
                  <ColHeader label="League" sortKey="league" filterKey="league" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('league', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={140}>
                    <TextFilter label="Search league" value={filters.league} onChange={v => updateFilter({ league: v })} />
                  </ColHeader>
                )}

                {show('nationality') && (
                  <ColHeader label="Nationality" sortKey="nationality" filterKey="nationality" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('nationality', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={120}>
                    <MultiSelectFilter options={uniqueNationalities} selected={filters.nationalities} onChange={v => updateFilter({ nationalities: v })} emptyText="No nationalities in list" />
                  </ColHeader>
                )}

                {showDob && (
                  <ColHeader label="Date of Birth" sortKey="age" filterKey="age" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('age', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={130}>
                    <RangeFilter label="Age range" min={ageRange.min} max={ageRange.max}
                      low={filters.ageMin ?? ageRange.min} high={filters.ageMax ?? ageRange.max}
                      onChange={(lo, hi) => updateFilter({ ageMin: lo === ageRange.min ? null : lo, ageMax: hi === ageRange.max ? null : hi })}
                      format={v => `${v}y`} />
                  </ColHeader>
                )}

                {show('height') && (
                  <ColHeader label="Height" sortKey="height" filterKey="height" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('height', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={90}>
                    <RangeFilter label="Height range" min={heightRange.min} max={heightRange.max}
                      low={filters.heightMin ?? heightRange.min} high={filters.heightMax ?? heightRange.max}
                      onChange={(lo, hi) => updateFilter({ heightMin: lo === heightRange.min ? null : lo, heightMax: hi === heightRange.max ? null : hi })}
                      format={v => `${v}cm`} />
                  </ColHeader>
                )}

                {show('weight') && (
                  <ColHeader label="Weight" sortKey="weight" filterKey="weight" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('weight', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={90}>
                    <RangeFilter label="Weight range" min={weightRange.min} max={weightRange.max}
                      low={filters.weightMin ?? weightRange.min} high={filters.weightMax ?? weightRange.max}
                      onChange={(lo, hi) => updateFilter({ weightMin: lo === weightRange.min ? null : lo, weightMax: hi === weightRange.max ? null : hi })}
                      format={v => `${v}kg`} />
                  </ColHeader>
                )}

                {show('marketValue') && (
                  <ColHeader label="Market Value" sortKey="marketValue" filterKey="marketValue" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('marketValue', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={130}>
                    <RangeFilter label="Market value range" min={mvRange.min} max={mvRange.max}
                      low={filters.marketValueMin ?? mvRange.min} high={filters.marketValueMax ?? mvRange.max}
                      onChange={(lo, hi) => updateFilter({ marketValueMin: lo === mvRange.min ? null : lo, marketValueMax: hi === mvRange.max ? null : hi })}
                      format={v => v === 0 ? '€0' : `€${(v / 1_000_000).toFixed(1)}M`} />
                  </ColHeader>
                )}

                {show('contractExpiry') && (
                  <ColHeader label="Contract" sortKey="contractExpiry" filterKey="contractExpiry" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('contractExpiry', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={110}>
                    <RangeFilter label="Expiry year" min={contractYearRange.min} max={contractYearRange.max}
                      low={filters.contractExpiryYearMin ?? contractYearRange.min} high={filters.contractExpiryYearMax ?? contractYearRange.max}
                      onChange={(lo, hi) => updateFilter({ contractExpiryYearMin: lo === contractYearRange.min ? null : lo, contractExpiryYearMax: hi === contractYearRange.max ? null : hi })}
                      format={v => String(v)} />
                  </ColHeader>
                )}

                {show('preferredFoot') && (
                  <ColHeader label="Foot" sortKey="name" filterKey="preferredFoot" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('preferredFoot', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={80} noSort>
                    <MultiSelectFilter options={uniqueFeet.length ? uniqueFeet : ['Right', 'Left', 'Both']} selected={filters.preferredFeet} onChange={v => updateFilter({ preferredFeet: v })} emptyText="No data" />
                  </ColHeader>
                )}

                {show('fmWages') && (
                  <ColHeader label="FM Wages" sortKey="fmWages" filterKey="fmWages" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} hasFilter={columnHasFilter('fmWages', filters)} openFilter={openFilter} setOpenFilter={setOpenFilter} minWidth={110}>
                    <RangeFilter label="FM Wages range" min={fmWagesRange.min} max={fmWagesRange.max}
                      low={filters.fmWagesMin ?? fmWagesRange.min} high={filters.fmWagesMax ?? fmWagesRange.max}
                      onChange={(lo, hi) => updateFilter({ fmWagesMin: lo === fmWagesRange.min ? null : lo, fmWagesMax: hi === fmWagesRange.max ? null : hi })}
                      format={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}K`} />
                  </ColHeader>
                )}

                {canEdit && (
                  <th className="px-4 py-3" style={{ minWidth: 72, position: 'sticky', right: 0, background: 'var(--card-solid)', zIndex: 2 }} />
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-6 py-12 text-center text-sm text-white/20">
                    {hasFilters ? 'No players match these filters' : 'No players yet'}
                  </td>
                </tr>
              ) : sorted.map((player, i) => {
                const rowBg = i % 2 !== 0 ? 'var(--subtle-bg)' : 'var(--card-solid)'
                return (
                  <tr key={player.id} className="border-b border-white/5 last:border-0 transition-colors group" style={{ background: rowBg }}>

                    {/* Player name — always shown */}
                    <td className="px-6 py-3" style={{ position: 'sticky', left: 0, background: rowBg, zIndex: 1 }}>
                      <Link href={`/databases/${databaseId}/players/${player.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                          {player.firstName[0]}{player.lastName[0]}
                        </div>
                        <p className="text-sm font-medium text-white group-hover:text-[#00c896] transition-colors whitespace-nowrap">{player.firstName} {player.lastName}</p>
                      </Link>
                    </td>

                    {show('position') && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">
                        {player.position
                          ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>{player.position}</span>
                          : <span className="text-white/25">—</span>}
                      </td>
                    )}

                    {show('team') && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{player.clubName || <span className="text-white/25">—</span>}</td>
                    )}

                    {show('league') && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{getCF(player, 'league') || <span className="text-white/25">—</span>}</td>
                    )}

                    {show('nationality') && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{player.nationality || <span className="text-white/25">—</span>}</td>
                    )}

                    {showDob && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">
                        {player.dateOfBirth
                          ? <>{new Date(player.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} <span className="text-white/35 text-xs">({calcAge(player.dateOfBirth)}y)</span></>
                          : <span className="text-white/25">—</span>}
                      </td>
                    )}

                    {show('height') && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{player.heightCm ? `${player.heightCm} cm` : <span className="text-white/25">—</span>}</td>
                    )}

                    {show('weight') && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{player.weightKg ? `${player.weightKg} kg` : <span className="text-white/25">—</span>}</td>
                    )}

                    {show('marketValue') && (
                      <td className="px-6 py-3 text-sm whitespace-nowrap" style={{ color: player.marketValue ? '#00c896' : 'rgba(255,255,255,0.25)' }}>
                        {player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(1)}M` : '—'}
                      </td>
                    )}

                    {show('contractExpiry') && (() => {
                      const raw = getCF(player, 'contractExpiry')
                      const year = getContractYear(player)
                      const isExpiringSoon = year !== null && year <= new Date().getFullYear() + 1
                      return (
                        <td className="px-6 py-3 text-sm whitespace-nowrap" style={{ color: raw ? (isExpiringSoon ? '#f59e0b' : 'rgba(255,255,255,0.75)') : 'rgba(255,255,255,0.25)' }}>
                          {raw ? new Date(raw).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      )
                    })()}

                    {show('preferredFoot') && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">
                        {getCF(player, 'foot') || <span className="text-white/25">—</span>}
                      </td>
                    )}

                    {show('fmWages') && (() => {
                      const w = getFmWages(player)
                      return (
                        <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">
                          {w != null ? `£${w.toLocaleString()}/w` : <span className="text-white/25">—</span>}
                        </td>
                      )
                    })()}

                    {canEdit && (
                      <td className="px-4 py-3" style={{ position: 'sticky', right: 0, background: rowBg, zIndex: 1 }}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingPlayer(player)} title="Edit"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
                            style={{ background: 'var(--hover-bg)' }}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                          <button onClick={() => setDeletingPlayer(player)} title="Delete"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 transition-colors"
                            style={{ background: 'var(--hover-bg)' }}>
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

      {editingPlayer  && <EditModal player={editingPlayer}   databaseId={databaseId} onClose={() => setEditingPlayer(null)} />}
      {deletingPlayer && <DeleteModal player={deletingPlayer} databaseId={databaseId} onClose={() => setDeletingPlayer(null)} />}
      {showReport && (
        <CreateReportModal players={sorted} databaseId={databaseId} databaseName={databaseName} onClose={() => setShowReport(false)} />
      )}
    </div>
  )
})

export default PlayersTable

// ─── Column Header ────────────────────────────────────────────────────────────

function ColHeader({ label, sortKey, filterKey, currentSort, sortDir, onSort, hasFilter, openFilter, setOpenFilter, children, minWidth, sticky, noSort }: {
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
  minWidth?: number
  sticky?: 'left' | 'right'
  noSort?: boolean
}) {
  const isOpen   = openFilter === filterKey
  const isSorted = currentSort === sortKey && !noSort
  const btnRef   = useRef<HTMLButtonElement>(null)
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const dropdown = document.getElementById(`filter-drop-${filterKey}`)
      if (dropdown?.contains(target)) return
      if (btnRef.current?.contains(target)) return
      setOpenFilter(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, setOpenFilter, filterKey])

  function handleFilterClick() {
    if (isOpen) { setOpenFilter(null); return }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 6, left: rect.left })
    }
    setOpenFilter(filterKey)
  }

  return (
    <th className="text-left px-4 py-3" style={{
      minWidth,
      ...(sticky ? { position: 'sticky', [sticky]: 0, background: 'var(--card-solid)', zIndex: 2 } : {}),
    }}>
      <div className="flex items-center gap-1">
        {noSort ? (
          <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        ) : (
          <button onClick={() => onSort(sortKey)}
            className="flex items-center gap-1 text-xs uppercase tracking-widest font-medium transition-colors"
            style={{ color: isSorted ? '#00c896' : 'var(--text-secondary)' }}>
            {label}
            <span className="text-[10px]">{isSorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
          </button>
        )}
        <button ref={btnRef} onClick={handleFilterClick}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors flex-shrink-0"
          style={{
            background: hasFilter ? 'rgba(0,200,150,0.15)' : (isOpen ? 'var(--hover-bg)' : 'transparent'),
            color: hasFilter ? '#00c896' : 'var(--text-faint)',
          }} title="Filter">
          {hasFilter
            ? <span className="w-2 h-2 rounded-full bg-[#00c896]" />
            : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A1 1 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z"/></svg>}
        </button>
      </div>
      {isOpen && dropPos && (
        <div id={`filter-drop-${filterKey}`}
          className="rounded-xl border border-white/10 p-3 min-w-[220px]"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}
          onMouseDown={e => e.stopPropagation()}>
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
        <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="Type to filter..."
          className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none"
          style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }} />
        {value && <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">✕</button>}
      </div>
    </div>
  )
}

function MultiSelectFilter({ options, selected, onChange, emptyText }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; emptyText: string
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-white/30">Select</p>
        {selected.length > 0 && <button onClick={() => onChange([])} className="text-[10px] text-white/30 hover:text-red-400 transition-colors">Clear</button>}
      </div>
      {options.length === 0
        ? <p className="text-xs text-white/20 py-2">{emptyText}</p>
        : (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                style={{ background: selected.includes(opt) ? 'rgba(0,200,150,0.08)' : 'transparent' }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="accent-[#00c896] w-3.5 h-3.5" />
                <span className="text-sm text-white/70">{opt}</span>
              </label>
            ))}
          </div>
        )}
    </div>
  )
}

function RangeFilter({ label, min, max, low, high, onChange, format }: {
  label: string; min: number; max: number; low: number; high: number
  onChange: (lo: number, hi: number) => void; format: (v: number) => string
}) {
  const safeLow  = Math.max(min, Math.min(low, high))
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
  min: number; max: number; low: number; high: number; onChange: (lo: number, hi: number) => void
}) {
  const range   = max - min || 1
  const lowPct  = ((low  - min) / range) * 100
  const highPct = ((high - min) / range) * 100
  return (
    <div className="relative pt-1 pb-4">
      <div className="relative h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
        <div className="absolute h-full rounded-full" style={{ background: 'linear-gradient(90deg, #00c896, #00a878)', left: `${lowPct}%`, right: `${100 - highPct}%` }} />
      </div>
      <input type="range" min={min} max={max} value={low} onChange={e => { const v = Number(e.target.value); if (v < high) onChange(v, high) }}
        className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer" style={{ zIndex: low > max - range * 0.05 ? 5 : 3 }} />
      <input type="range" min={min} max={max} value={high} onChange={e => { const v = Number(e.target.value); if (v > low) onChange(low, v) }}
        className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer" style={{ zIndex: 4 }} />
      <div className="absolute top-0 w-4 h-4 rounded-full border-2 pointer-events-none -translate-y-1/4"
        style={{ background: 'var(--card-solid)', borderColor: '#00c896', left: `calc(${lowPct}% - 8px)` }} />
      <div className="absolute top-0 w-4 h-4 rounded-full border-2 pointer-events-none -translate-y-1/4"
        style={{ background: 'var(--card-solid)', borderColor: '#00c896', left: `calc(${highPct}% - 8px)` }} />
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
    firstName:     player.firstName,
    lastName:      player.lastName,
    middleName:    player.middleName ?? '',
    position:      player.position ?? '',
    clubName:      player.clubName ?? '',
    nationality:   player.nationality ?? '',
    agentName:     player.agentName ?? '',
    dateOfBirth:   toDateStr(player.dateOfBirth),
    heightCm:      player.heightCm?.toString() ?? '',
    weightKg:      player.weightKg?.toString() ?? '',
    marketValue:   player.marketValue != null ? (player.marketValue / 1_000_000).toString() : '',
    goalsThisYear: player.goalsThisYear?.toString() ?? '',
    totalGoals:    player.totalGoals?.toString() ?? '',
    totalGames:    player.totalGames?.toString() ?? '',
    nationalGames: player.nationalGames?.toString() ?? '',
    yearsInProClub:player.yearsInProClub?.toString() ?? '',
    playsNational: player.playsNational,
  })

  function set(field: string, value: string | boolean) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
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
      <div className="w-full max-w-2xl rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-1">Edit Player</h2>
        <p className="text-sm text-white/30 mb-6">{player.firstName} {player.lastName}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="First Name *" value={form.firstName} onChange={v => set('firstName', v)} required />
            <Field label="Middle Name"  value={form.middleName} onChange={v => set('middleName', v)} />
            <Field label="Last Name *"  value={form.lastName} onChange={v => set('lastName', v)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position"  value={form.position}  onChange={v => set('position', v)} />
            <Field label="Club"      value={form.clubName}  onChange={v => set('clubName', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nationality" value={form.nationality} onChange={v => set('nationality', v)} />
            <Field label="Agent Name"  value={form.agentName}   onChange={v => set('agentName', v)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date of Birth" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} type="date" />
            <Field label="Height (cm)"   value={form.heightCm}    onChange={v => set('heightCm', v)}    type="number" />
            <Field label="Weight (kg)"   value={form.weightKg}    onChange={v => set('weightKg', v)}    type="number" />
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
              <Field label="Goals This Year"    value={form.goalsThisYear} onChange={v => set('goalsThisYear', v)} type="number" />
              <Field label="Total Goals"        value={form.totalGoals}    onChange={v => set('totalGoals', v)}    type="number" />
              <Field label="Total Games"        value={form.totalGames}    onChange={v => set('totalGames', v)}    type="number" />
              <Field label="National Team Games" value={form.nationalGames} onChange={v => set('nationalGames', v)} type="number" />
              <Field label="Years in Pro Club"  value={form.yearsInProClub} onChange={v => set('yearsInProClub', v)} type="number" />
            </div>
          </div>
          <p className="text-xs text-white/25">Extended fields (league, contract, links, etc.) can be edited from the player's profile page.</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/50" style={{ background: 'var(--hover-bg)' }}>Cancel</button>
            <button type="submit" disabled={loading || !form.firstName.trim() || !form.lastName.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
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
    onClose(); router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => !loading && onClose()}>
      <div className="w-full max-w-sm rounded-2xl p-6 border border-white/10" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </div>
        <h2 className="text-lg font-semibold text-white text-center mb-2">Delete Player</h2>
        <p className="text-sm text-white/40 text-center mb-1">Are you sure you want to delete</p>
        <p className="text-sm font-semibold text-white text-center mb-4">"{player.firstName} {player.lastName}"?</p>
        <p className="text-xs text-white/25 text-center mb-6">This cannot be undone. All player data and notes will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm text-white/50 disabled:opacity-50" style={{ background: 'var(--hover-bg)' }}>Cancel</button>
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
  players: Player[]; databaseId: string; databaseName: string; onClose: () => void
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
      if (res.ok) { onClose(); router.push('/reports'); router.refresh() }
      else {
        const text = await res.text()
        let msg = 'Something went wrong'
        try { msg = JSON.parse(text)?.error || msg } catch {}
        setError(msg); setLoading(false)
      }
    } catch { setError('Network error — please try again'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6 border border-white/10" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(108,143,255,0.12)', border: '1px solid rgba(108,143,255,0.2)' }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#6c8fff"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-1">Create Report</h2>
        <p className="text-xs text-white/30 mb-5">
          Saving {players.length} player{players.length !== 1 ? 's' : ''} from <span className="text-white/50">{databaseName}</span>
        </p>
        <div className="mb-4">
          <label className="block text-xs text-white/40 mb-1">Report Name *</label>
          <input autoFocus value={name} onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={`${databaseName} — ${new Date().toLocaleDateString()}`}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
            onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/40" style={{ background: 'var(--hover-bg)' }}>Cancel</button>
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
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
        onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
    </div>
  )
}
