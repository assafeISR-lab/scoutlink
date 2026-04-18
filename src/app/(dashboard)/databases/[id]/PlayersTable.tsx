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
type FilterParamType = 'text' | 'range' | 'multi'

interface FilterParam {
  key: FilterKey
  label: string
  group: string
  type: FilterParamType
}

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
  league: string
  preferredFeet: string[]
  contractExpiryYearMin: number | null
  contractExpiryYearMax: number | null
  fmWagesMin: number | null
  fmWagesMax: number | null
}

const DEFAULT_FILTERS: Filters = {
  name: '', positions: [], club: '', nationalities: [],
  ageMin: null, ageMax: null,
  marketValueMin: null, marketValueMax: null,
  heightMin: null, heightMax: null,
  weightMin: null, weightMax: null,
  league: '', preferredFeet: [],
  contractExpiryYearMin: null, contractExpiryYearMax: null,
  fmWagesMin: null, fmWagesMax: null,
}

const FILTER_PARAMS: FilterParam[] = [
  { key: 'nationality',    label: 'Nationality',    group: 'Identity',      type: 'multi' },
  { key: 'preferredFoot', label: 'Preferred Foot', group: 'Identity',      type: 'multi' },
  { key: 'age',           label: 'Age',            group: 'Identity',      type: 'range' },
  { key: 'height',        label: 'Height',         group: 'Identity',      type: 'range' },
  { key: 'weight',        label: 'Weight',         group: 'Identity',      type: 'range' },
  { key: 'name',          label: 'Player Name',    group: 'Club / Career', type: 'text'  },
  { key: 'club',          label: 'Club',           group: 'Club / Career', type: 'text'  },
  { key: 'league',        label: 'League',         group: 'Club / Career', type: 'text'  },
  { key: 'position',      label: 'Position',       group: 'Club / Career', type: 'multi' },
  { key: 'contractExpiry',label: 'Contract Expiry',group: 'Club / Career', type: 'range' },
  { key: 'marketValue',   label: 'Market Value',   group: 'Financial',     type: 'range' },
  { key: 'fmWages',       label: 'FM Wages',       group: 'Financial',     type: 'range' },
]

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

function getActiveChips(f: Filters): FilterKey[] {
  const keys: FilterKey[] = []
  if (f.name) keys.push('name')
  if (f.positions.length) keys.push('position')
  if (f.club) keys.push('club')
  if (f.nationalities.length) keys.push('nationality')
  if (f.ageMin !== null || f.ageMax !== null) keys.push('age')
  if (f.marketValueMin !== null || f.marketValueMax !== null) keys.push('marketValue')
  if (f.heightMin !== null || f.heightMax !== null) keys.push('height')
  if (f.weightMin !== null || f.weightMax !== null) keys.push('weight')
  if (f.league) keys.push('league')
  if (f.preferredFeet.length) keys.push('preferredFoot')
  if (f.contractExpiryYearMin !== null || f.contractExpiryYearMax !== null) keys.push('contractExpiry')
  if (f.fmWagesMin !== null || f.fmWagesMax !== null) keys.push('fmWages')
  return keys
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
    case 'age':           return f.ageMin !== null && f.ageMax !== null ? `${f.ageMin} – ${f.ageMax}` : f.ageMin !== null ? `≥ ${f.ageMin}` : `≤ ${f.ageMax}`
    case 'height':        return f.heightMin !== null && f.heightMax !== null ? `${f.heightMin} – ${f.heightMax} cm` : f.heightMin !== null ? `≥ ${f.heightMin} cm` : `≤ ${f.heightMax} cm`
    case 'weight':        return f.weightMin !== null && f.weightMax !== null ? `${f.weightMin} – ${f.weightMax} kg` : f.weightMin !== null ? `≥ ${f.weightMin} kg` : `≤ ${f.weightMax} kg`
    case 'marketValue':   return f.marketValueMin !== null && f.marketValueMax !== null ? `${fmtMV(f.marketValueMin)} – ${fmtMV(f.marketValueMax)}` : f.marketValueMin !== null ? `≥ ${fmtMV(f.marketValueMin)}` : `≤ ${fmtMV(f.marketValueMax!)}`
    case 'contractExpiry':return f.contractExpiryYearMin !== null && f.contractExpiryYearMax !== null ? `${f.contractExpiryYearMin} – ${f.contractExpiryYearMax}` : f.contractExpiryYearMin !== null ? `≥ ${f.contractExpiryYearMin}` : `≤ ${f.contractExpiryYearMax}`
    case 'fmWages':       return f.fmWagesMin !== null && f.fmWagesMax !== null ? `${fmtW(f.fmWagesMin)} – ${fmtW(f.fmWagesMax)}/w` : f.fmWagesMin !== null ? `≥ ${fmtW(f.fmWagesMin)}/w` : `≤ ${fmtW(f.fmWagesMax!)}/w`
  }
  return ''
}

function matchesFilters(player: Player, f: Filters, mode: FilterMode): boolean {
  const age          = calcAge(player.dateOfBirth)
  const contractYear = getContractYear(player)
  const fmWages      = getFmWages(player)
  const checks: (() => boolean)[] = []

  if (f.name)            checks.push(() => `${player.firstName} ${player.lastName}`.toLowerCase().includes(f.name.toLowerCase()))
  if (f.positions.length) checks.push(() => f.positions.some(p => (player.position ?? '').toLowerCase() === p.toLowerCase()))
  if (f.club)            checks.push(() => (player.clubName ?? '').toLowerCase().includes(f.club.toLowerCase()))
  if (f.nationalities.length) checks.push(() => f.nationalities.some(n => (player.nationality ?? '').toLowerCase() === n.toLowerCase()))
  if (f.ageMin !== null || f.ageMax !== null) checks.push(() => { const a = age ?? 0; return (f.ageMin === null || a >= f.ageMin) && (f.ageMax === null || a <= f.ageMax) })
  if (f.marketValueMin !== null || f.marketValueMax !== null) checks.push(() => { const v = player.marketValue ?? 0; return (f.marketValueMin === null || v >= f.marketValueMin) && (f.marketValueMax === null || v <= f.marketValueMax) })
  if (f.heightMin !== null || f.heightMax !== null) checks.push(() => { const h = player.heightCm ?? 0; return (f.heightMin === null || h >= f.heightMin) && (f.heightMax === null || h <= f.heightMax) })
  if (f.weightMin !== null || f.weightMax !== null) checks.push(() => { const w = player.weightKg ?? 0; return (f.weightMin === null || w >= f.weightMin) && (f.weightMax === null || w <= f.weightMax) })
  if (f.league)          checks.push(() => getCF(player, 'league').toLowerCase().includes(f.league.toLowerCase()))
  if (f.preferredFeet.length) checks.push(() => f.preferredFeet.some(foot => getCF(player, 'foot').toLowerCase() === foot.toLowerCase()))
  if (f.contractExpiryYearMin !== null || f.contractExpiryYearMax !== null) checks.push(() => { const cy = contractYear ?? 0; return (f.contractExpiryYearMin === null || cy >= f.contractExpiryYearMin) && (f.contractExpiryYearMax === null || cy <= f.contractExpiryYearMax) })
  if (f.fmWagesMin !== null || f.fmWagesMax !== null) checks.push(() => { const w = fmWages ?? 0; return (f.fmWagesMin === null || w >= f.fmWagesMin) && (f.fmWagesMax === null || w <= f.fmWagesMax) })

  if (checks.length === 0) return true
  return mode === 'AND' ? checks.every(fn => fn()) : checks.some(fn => fn())
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PlayersTableHandle { openCreateReport: () => void }

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

  const [sortKey,    setSortKey]    = useState<SortKey>('name')
  const [sortDir,    setSortDir]    = useState<SortDir>('asc')
  const [filters,    setFilters]    = useState<Filters>(DEFAULT_FILTERS)
  const [filterMode, setFilterMode] = useState<FilterMode>('AND')
  const [addFilterOpen,  setAddFilterOpen]  = useState(false)
  const [pendingFilter,  setPendingFilter]  = useState<FilterKey | null>(null)
  const [editingPlayer,  setEditingPlayer]  = useState<Player | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null)
  const [showReport,     setShowReport]     = useState(false)
  const [visibleParams,  setVisibleParams]  = useState<Set<string>>(new Set())

  useImperativeHandle(ref, () => ({ openCreateReport: () => setShowReport(true) }))

  useEffect(() => {
    if (columnConfig !== null) setVisibleParams(new Set(columnConfig))
    else setVisibleParams(new Set([...loadActive(), ...loadCustomActive()]))
  }, [columnConfig])

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

  const show    = (key: string) => visibleParams.has(key)
  const showDob = show('age') || show('dateOfBirth')

  const uniquePositions     = useMemo(() => [...new Set(players.map(p => p.position).filter(Boolean) as string[])].sort(), [players])
  const uniqueNationalities = useMemo(() => [...new Set(players.map(p => p.nationality).filter(Boolean) as string[])].sort(), [players])
  const uniqueFeet          = useMemo(() => [...new Set(players.map(p => getCF(p, 'foot')).filter(Boolean))].sort(), [players])

  const ages          = useMemo(() => players.map(p => calcAge(p.dateOfBirth)).filter(Boolean) as number[], [players])
  const ageRange      = { min: ages.length ? Math.min(...ages) : 15, max: ages.length ? Math.max(...ages) : 45 }
  const heights       = useMemo(() => players.map(p => p.heightCm).filter(Boolean) as number[], [players])
  const heightRange   = { min: heights.length ? Math.min(...heights) : 150, max: heights.length ? Math.max(...heights) : 210 }
  const weights       = useMemo(() => players.map(p => p.weightKg).filter(Boolean) as number[], [players])
  const weightRange   = { min: weights.length ? Math.min(...weights) : 50, max: weights.length ? Math.max(...weights) : 120 }
  const cyears        = useMemo(() => players.map(p => getContractYear(p)).filter(Boolean) as number[], [players])
  const contractRange = { min: cyears.length ? Math.min(...cyears) : new Date().getFullYear(), max: cyears.length ? Math.max(...cyears) : new Date().getFullYear() + 8 }
  const wagesVals     = useMemo(() => players.map(p => getFmWages(p)).filter(Boolean) as number[], [players])
  const wagesRange    = { min: 0, max: wagesVals.length ? Math.max(...wagesVals) : 200_000 }

  const multiOptions: Record<string, string[]> = {
    position:     uniquePositions,
    nationality:  uniqueNationalities,
    preferredFoot: uniqueFeet.length ? uniqueFeet : ['Right', 'Left', 'Both'],
  }

  const rangeBounds: Record<string, { min: number; max: number; unit?: string; scale?: number }> = {
    age:           { ...ageRange,      unit: 'y' },
    height:        { ...heightRange,   unit: 'cm' },
    weight:        { ...weightRange,   unit: 'kg' },
    marketValue:   { min: 0, max: 200_000_000, unit: '€M', scale: 1_000_000 },
    contractExpiry:{ ...contractRange },
    fmWages:       { ...wagesRange,    unit: '£/w' },
  }

  function updateFilter(patch: Partial<Filters>) { setFilters(f => ({ ...f, ...patch })) }
  function clearAllFilters() { setFilters(DEFAULT_FILTERS) }

  function clearFilterByKey(key: FilterKey) {
    const p: Partial<Filters> = {}
    if (key === 'name')           p.name = ''
    if (key === 'position')       p.positions = []
    if (key === 'club')           p.club = ''
    if (key === 'nationality')    p.nationalities = []
    if (key === 'age')            { p.ageMin = null; p.ageMax = null }
    if (key === 'marketValue')    { p.marketValueMin = null; p.marketValueMax = null }
    if (key === 'height')         { p.heightMin = null; p.heightMax = null }
    if (key === 'weight')         { p.weightMin = null; p.weightMax = null }
    if (key === 'league')         p.league = ''
    if (key === 'preferredFoot')  p.preferredFeet = []
    if (key === 'contractExpiry') { p.contractExpiryYearMin = null; p.contractExpiryYearMax = null }
    if (key === 'fmWages')        { p.fmWagesMin = null; p.fmWagesMax = null }
    updateFilter(p)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => players.filter(p => matchesFilters(p, filters, filterMode)), [players, filters, filterMode])

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
  const activeChips = getActiveChips(filters)

  const visibleColCount = 1 +
    (show('position') ? 1 : 0) + (show('team') ? 1 : 0) + (show('league') ? 1 : 0) +
    (show('nationality') ? 1 : 0) + (showDob ? 1 : 0) + (show('height') ? 1 : 0) +
    (show('weight') ? 1 : 0) + (show('marketValue') ? 1 : 0) + (show('contractExpiry') ? 1 : 0) +
    (show('preferredFoot') ? 1 : 0) + (show('fmWages') ? 1 : 0) + (canEdit ? 1 : 0)

  return (
    <div>
      <FilterBar
        filters={filters}
        filterMode={filterMode}
        activeChips={activeChips}
        totalCount={players.length}
        filteredCount={sorted.length}
        addFilterOpen={addFilterOpen}
        pendingFilter={pendingFilter}
        onSetMode={setFilterMode}
        onRemoveChip={key => { clearFilterByKey(key); if (pendingFilter === key) setPendingFilter(null) }}
        onEditChip={key => { setAddFilterOpen(false); setPendingFilter(key) }}
        onToggleAddFilter={() => { setAddFilterOpen(o => !o); setPendingFilter(null) }}
        onSelectParam={key => { setAddFilterOpen(false); setPendingFilter(key) }}
        onClearAll={() => { clearAllFilters(); setPendingFilter(null) }}
        multiOptions={multiOptions}
        rangeBounds={rangeBounds}
        updateFilter={updateFilter}
        onClosePending={() => setPendingFilter(null)}
      />

      <div className="rounded-2xl border border-white/5" style={{ background: 'var(--card-bg)', borderRadius: '16px' }}>
        <div style={{ borderRadius: '16px', overflowX: 'auto' }}>
          <table style={{ minWidth: '600px', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-white/5">
                <ColHeader label="Player"       sortKey="name"          currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={200} sticky="left" />
                {show('position')    && <ColHeader label="Position"     sortKey="position"     currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={110} />}
                {show('team')        && <ColHeader label="Club"         sortKey="club"         currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={150} />}
                {show('league')      && <ColHeader label="League"       sortKey="league"       currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={140} />}
                {show('nationality') && <ColHeader label="Nationality"  sortKey="nationality"  currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={120} />}
                {showDob             && <ColHeader label="Date of Birth" sortKey="age"         currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={130} />}
                {show('height')      && <ColHeader label="Height"       sortKey="height"       currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={90} />}
                {show('weight')      && <ColHeader label="Weight"       sortKey="weight"       currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={90} />}
                {show('marketValue') && <ColHeader label="Market Value" sortKey="marketValue"  currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={130} />}
                {show('contractExpiry') && <ColHeader label="Contract"  sortKey="contractExpiry" currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={110} />}
                {show('preferredFoot') && <ColHeader label="Foot"       sortKey="name"         currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={80} noSort />}
                {show('fmWages')     && <ColHeader label="FM Wages"     sortKey="fmWages"      currentSort={sortKey} sortDir={sortDir} onSort={handleSort} minWidth={110} />}
                {canEdit && <th className="px-4 py-3" style={{ minWidth: 72, position: 'sticky', right: 0, background: 'var(--card-solid)', zIndex: 2 }} />}
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
                        {player.position ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>{player.position}</span> : <span className="text-white/25">—</span>}
                      </td>
                    )}
                    {show('team')        && <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{player.clubName || <span className="text-white/25">—</span>}</td>}
                    {show('league')      && <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{getCF(player, 'league') || <span className="text-white/25">—</span>}</td>}
                    {show('nationality') && <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{player.nationality || <span className="text-white/25">—</span>}</td>}
                    {showDob && (
                      <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">
                        {player.dateOfBirth
                          ? <>{new Date(player.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} <span className="text-white/35 text-xs">({calcAge(player.dateOfBirth)}y)</span></>
                          : <span className="text-white/25">—</span>}
                      </td>
                    )}
                    {show('height')      && <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{player.heightCm ? `${player.heightCm} cm` : <span className="text-white/25">—</span>}</td>}
                    {show('weight')      && <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{player.weightKg ? `${player.weightKg} kg` : <span className="text-white/25">—</span>}</td>}
                    {show('marketValue') && (
                      <td className="px-6 py-3 text-sm whitespace-nowrap" style={{ color: player.marketValue ? '#00c896' : 'rgba(255,255,255,0.25)' }}>
                        {player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(1)}M` : '—'}
                      </td>
                    )}
                    {show('contractExpiry') && (() => {
                      const raw = getCF(player, 'contractExpiry')
                      const year = getContractYear(player)
                      const soon = year !== null && year <= new Date().getFullYear() + 1
                      return (
                        <td className="px-6 py-3 text-sm whitespace-nowrap" style={{ color: raw ? (soon ? '#f59e0b' : 'rgba(255,255,255,0.75)') : 'rgba(255,255,255,0.25)' }}>
                          {raw ? new Date(raw).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      )
                    })()}
                    {show('preferredFoot') && <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{getCF(player, 'foot') || <span className="text-white/25">—</span>}</td>}
                    {show('fmWages') && (() => {
                      const w = getFmWages(player)
                      return <td className="px-6 py-3 text-sm text-white/75 whitespace-nowrap">{w != null ? `£${w.toLocaleString()}/w` : <span className="text-white/25">—</span>}</td>
                    })()}
                    {canEdit && (
                      <td className="px-4 py-3" style={{ position: 'sticky', right: 0, background: rowBg, zIndex: 1 }}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingPlayer(player)} title="Edit" className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors" style={{ background: 'var(--hover-bg)' }}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                          <button onClick={() => setDeletingPlayer(player)} title="Delete" className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 transition-colors" style={{ background: 'var(--hover-bg)' }}>
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

      {editingPlayer  && <EditModal  player={editingPlayer}   databaseId={databaseId} onClose={() => setEditingPlayer(null)} />}
      {deletingPlayer && <DeleteModal player={deletingPlayer} databaseId={databaseId} onClose={() => setDeletingPlayer(null)} />}
      {showReport && <CreateReportModal players={sorted} databaseId={databaseId} databaseName={databaseName} onClose={() => setShowReport(false)} />}
    </div>
  )
})

export default PlayersTable

// ─── Column Header ────────────────────────────────────────────────────────────

function ColHeader({ label, sortKey, currentSort, sortDir, onSort, minWidth, sticky, noSort }: {
  label: string; sortKey: SortKey; currentSort: SortKey; sortDir: SortDir
  onSort: (k: SortKey) => void; minWidth?: number; sticky?: 'left' | 'right'; noSort?: boolean
}) {
  const isSorted = currentSort === sortKey && !noSort
  return (
    <th className="text-left px-4 py-3" style={{ minWidth, ...(sticky ? { position: 'sticky', [sticky]: 0, background: 'var(--card-solid)', zIndex: 2 } : {}) }}>
      {noSort
        ? <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        : <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 text-xs uppercase tracking-widest font-medium transition-colors" style={{ color: isSorted ? '#00c896' : 'var(--text-secondary)' }}>
            {label}<span className="text-[10px]">{isSorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
          </button>}
    </th>
  )
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, filterMode, activeChips, totalCount, filteredCount, addFilterOpen, pendingFilter,
  onSetMode, onRemoveChip, onEditChip, onToggleAddFilter, onSelectParam, onClearAll,
  multiOptions, rangeBounds, updateFilter, onClosePending }: {
  filters: Filters; filterMode: FilterMode; activeChips: FilterKey[]
  totalCount: number; filteredCount: number; addFilterOpen: boolean; pendingFilter: FilterKey | null
  onSetMode: (m: FilterMode) => void; onRemoveChip: (k: FilterKey) => void; onEditChip: (k: FilterKey) => void
  onToggleAddFilter: () => void; onSelectParam: (k: FilterKey) => void; onClearAll: () => void
  multiOptions: Record<string, string[]>; rangeBounds: Record<string, { min: number; max: number; unit?: string; scale?: number }>
  updateFilter: (patch: Partial<Filters>) => void; onClosePending: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!addFilterOpen) return
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (document.getElementById('add-filter-dropdown')?.contains(t)) return
      if (btnRef.current?.contains(t)) return
      onToggleAddFilter()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [addFilterOpen, onToggleAddFilter])

  const hasFilters = activeChips.length > 0

  return (
    <div className="mb-4">
      <div className="relative flex items-center gap-2 flex-wrap rounded-xl border px-3 py-2" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-widest mr-1" style={{ color: 'var(--text-faint)' }}>Filter</span>

        <div className="flex rounded-md overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-strong)' }}>
          <button onClick={() => onSetMode('AND')} className="px-2.5 py-1 text-[11px] font-semibold transition-colors"
            style={{ background: filterMode === 'AND' ? 'rgba(0,200,150,0.18)' : 'transparent', color: filterMode === 'AND' ? '#00c896' : 'var(--text-faint)' }}>AND</button>
          <button onClick={() => onSetMode('OR')} className="px-2.5 py-1 text-[11px] font-semibold transition-colors"
            style={{ background: filterMode === 'OR' ? 'rgba(108,143,255,0.18)' : 'transparent', color: filterMode === 'OR' ? '#6c8fff' : 'var(--text-faint)' }}>OR</button>
        </div>

        {activeChips.map(key => (
          <div key={key} className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] cursor-pointer select-none"
            style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)' }}
            onClick={() => onEditChip(key)}>
            <span className="font-semibold" style={{ color: '#00c896' }}>{FILTER_PARAMS.find(p => p.key === key)?.label}</span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{chipValueSummary(key, filters)}</span>
            <button className="w-4 h-4 rounded flex items-center justify-center text-[10px] transition-all ml-0.5"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
              onClick={e => { e.stopPropagation(); onRemoveChip(key) }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,80,80,0.2)'; el.style.color = '#ff6b6b' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--hover-bg)'; el.style.color = 'var(--text-muted)' }}>✕</button>
          </div>
        ))}

        <button ref={btnRef} onClick={onToggleAddFilter}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] transition-all"
          style={{ background: addFilterOpen ? 'rgba(0,200,150,0.08)' : 'transparent', border: `1px dashed ${addFilterOpen ? '#00c896' : 'var(--border-strong)'}`, color: addFilterOpen ? '#00c896' : 'var(--text-muted)' }}>
          + Add Filter {addFilterOpen && <span className="text-[10px]">▴</span>}
        </button>

        {hasFilters && (
          <button onClick={onClearAll} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12.5px] transition-all"
            style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', color: '#ff6b6b' }}>
            ✕ Clear all
          </button>
        )}

        <span className="text-xs ml-auto whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
          {hasFilters
            ? <><strong style={{ color: '#00c896' }}>{filteredCount}</strong> of {totalCount} players</>
            : <><strong style={{ color: '#00c896' }}>{totalCount}</strong> players</>}
        </span>

        {addFilterOpen && <AddFilterDropdown activeKeys={activeChips} onSelect={onSelectParam} />}
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

function AddFilterDropdown({ activeKeys, onSelect }: { activeKeys: FilterKey[]; onSelect: (k: FilterKey) => void }) {
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
    <div id="add-filter-dropdown" className="absolute rounded-xl border overflow-hidden"
      style={{ top: 'calc(100% + 6px)', left: 14, width: 300, background: '#1a1d27', borderColor: '#2a2d3a', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 9999 }}>
      <div className="p-2.5 border-b" style={{ borderColor: '#2a2d3a' }}>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search parameters…"
          className="w-full px-2.5 py-1.5 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none"
          style={{ background: '#0f1117', border: '1px solid #2a2d3a' }}
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
  multiOptions: Record<string, string[]>; rangeBounds: Record<string, { min: number; max: number; unit?: string; scale?: number }>
  onApply: (patch: Partial<Filters>) => void; onCancel: () => void
}) {
  const param  = FILTER_PARAMS.find(p => p.key === filterKey)!
  const bounds = rangeBounds[filterKey] ?? { min: 0, max: 100 }
  const scale  = bounds.scale ?? 1

  const [textVal,       setTextVal]       = useState(() => filterKey === 'name' ? filters.name : filterKey === 'club' ? filters.club : filters.league)
  const [multiSelected, setMultiSelected] = useState<string[]>(() =>
    filterKey === 'position' ? filters.positions : filterKey === 'nationality' ? filters.nationalities : filters.preferredFeet)
  const [rangeMin, setRangeMin] = useState(() => {
    const v = filterKey === 'age' ? filters.ageMin : filterKey === 'height' ? filters.heightMin : filterKey === 'weight' ? filters.weightMin : filterKey === 'marketValue' ? filters.marketValueMin : filterKey === 'contractExpiry' ? filters.contractExpiryYearMin : filters.fmWagesMin
    return v !== null ? String(v / scale) : ''
  })
  const [rangeMax, setRangeMax] = useState(() => {
    const v = filterKey === 'age' ? filters.ageMax : filterKey === 'height' ? filters.heightMax : filterKey === 'weight' ? filters.weightMax : filterKey === 'marketValue' ? filters.marketValueMax : filterKey === 'contractExpiry' ? filters.contractExpiryYearMax : filters.fmWagesMax
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
    }
    if (param.type === 'range') {
      const lo = rangeMin !== '' ? parseFloat(rangeMin) * scale : null
      const hi = rangeMax !== '' ? parseFloat(rangeMax) * scale : null
      if (filterKey === 'age')            return onApply({ ageMin: lo, ageMax: hi })
      if (filterKey === 'height')         return onApply({ heightMin: lo, heightMax: hi })
      if (filterKey === 'weight')         return onApply({ weightMin: lo, weightMax: hi })
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
              <button key={opt} onClick={() => setMultiSelected(s => s.includes(opt) ? s.filter(x => x !== opt) : [...s, opt])}
                className="px-2.5 py-1 rounded-md text-xs transition-all"
                style={{ background: checked ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${checked ? 'rgba(0,200,150,0.4)' : 'rgba(255,255,255,0.12)'}`, color: checked ? '#00c896' : 'rgba(255,255,255,0.7)', fontWeight: checked ? 600 : 400 }}>
                {opt}
              </button>
            )
          })}
          {!(multiOptions[filterKey] ?? []).length && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No options available yet</span>}
        </div>
      )}

      <div className="flex gap-2 ml-auto">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
        <button onClick={handleApply} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>Apply</button>
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
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
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
            <Field label="Position" value={form.position} onChange={v => set('position', v)} />
            <Field label="Club"     value={form.clubName} onChange={v => set('clubName', v)} />
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
              <Field label="Goals This Year"    value={form.goalsThisYear}  onChange={v => set('goalsThisYear', v)}  type="number" />
              <Field label="Total Goals"        value={form.totalGoals}     onChange={v => set('totalGoals', v)}     type="number" />
              <Field label="Total Games"        value={form.totalGames}     onChange={v => set('totalGames', v)}     type="number" />
              <Field label="National Team Games" value={form.nationalGames} onChange={v => set('nationalGames', v)} type="number" />
              <Field label="Years in Pro Club"  value={form.yearsInProClub} onChange={v => set('yearsInProClub', v)} type="number" />
            </div>
          </div>
          <p className="text-xs text-white/25">Extended fields (league, contract, links, etc.) can be edited from the player's profile page.</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/50" style={{ background: 'var(--hover-bg)' }}>Cancel</button>
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
      id: p.id, name: `${p.firstName} ${p.lastName}`, position: p.position, clubName: p.clubName,
      nationality: p.nationality, age: p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      heightCm: p.heightCm, weightKg: p.weightKg, marketValue: p.marketValue,
      goalsThisYear: p.goalsThisYear, totalGoals: p.totalGoals, totalGames: p.totalGames, playsNational: p.playsNational,
    }))
    try {
      const res = await fetch('/api/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        <p className="text-xs text-white/30 mb-5">Saving {players.length} player{players.length !== 1 ? 's' : ''} from <span className="text-white/50">{databaseName}</span></p>
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
