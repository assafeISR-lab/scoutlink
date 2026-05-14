'use client'

import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loadActive, loadCustomActive } from '@/app/(dashboard)/search/SearchParamsPanel'
import {
  PlayerFilterBar,
  DEFAULT_FILTERS, FILTER_PARAMS,
  getActiveChips, isFilterActive, clearFilterForKey,
  type Filters, type FilterMode, type FilterKey, type RangeBound,
} from '@/components/PlayerFilterBar'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCF(player: Player, fieldName: string): string {
  return player.customFields.find(f => f.fieldName === fieldName)?.value ?? ''
}

function PlayerAvatar({ player }: { player: Player }) {
  const [failed, setFailed] = useState(false)
  const photo = getCF(player, 'photo')
  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
      {player.firstName[0]}{player.lastName[0]}
    </div>
  )
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

  function clearFilterByKey(key: FilterKey) { updateFilter(clearFilterForKey(key)) }

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
      <PlayerFilterBar
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

      <div className="rounded-2xl border border-white/5" style={{ background: 'var(--card-bg)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ borderRadius: '16px', overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
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
                {canEdit && <th className="px-4 py-3" style={{ minWidth: 72, position: 'sticky', right: 0, top: 0, background: 'var(--card-solid)', zIndex: 4 }} />}
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
                const rowBgSolid = i % 2 !== 0 ? 'var(--row-odd-solid)' : 'var(--card-solid)'
                return (
                  <tr key={player.id} className="border-b border-white/5 last:border-0 transition-colors group" style={{ background: rowBg }}>
                    <td className="px-6 py-3" style={{ position: 'sticky', left: 0, background: rowBgSolid, zIndex: 3, maxWidth: 280, boxShadow: '4px 0 8px -2px rgba(0,0,0,0.4)' }}>
                      <Link href={`/databases/${databaseId}/players/${player.id}`} className="flex items-center gap-3 overflow-hidden">
                        <PlayerAvatar player={player} />
                        <p
                          className="text-sm font-medium text-white group-hover:text-[#00c896] transition-colors truncate"
                          style={{ maxWidth: '30ch' }}
                          title={`${player.firstName} ${player.lastName}`}
                        >{player.firstName} {player.lastName}</p>
                      </Link>
                    </td>
                    {show('position') && (
                      <td className="px-6 py-3 text-sm">
                        {player.position
                          ? <span className="text-xs px-2 py-0.5 rounded-full truncate inline-block" style={{ maxWidth: '30ch', background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }} title={player.position}>{player.position}</span>
                          : <span className="text-white/25">—</span>}
                      </td>
                    )}
                    {show('team')        && <td className="px-6 py-3 text-sm text-white/75"><Trunc text={player.clubName ?? ''} /></td>}
                    {show('league')      && <td className="px-6 py-3 text-sm text-white/75"><Trunc text={getCF(player, 'league')} /></td>}
                    {show('nationality') && <td className="px-6 py-3 text-sm text-white/75"><Trunc text={player.nationality ?? ''} /></td>}
                    {showDob && (
                      <td className="px-6 py-3 text-sm text-white/75">
                        {player.dateOfBirth ? (() => {
                          const ds = new Date(player.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          const age = calcAge(player.dateOfBirth)
                          return <span className="truncate block" style={{ maxWidth: '30ch' }} title={`${ds} (${age}y)`}>{ds} <span className="text-white/35 text-xs">({age}y)</span></span>
                        })() : <span className="text-white/25">—</span>}
                      </td>
                    )}
                    {show('height')      && <td className="px-6 py-3 text-sm text-white/75"><Trunc text={player.heightCm ? `${player.heightCm} cm` : ''} /></td>}
                    {show('weight')      && <td className="px-6 py-3 text-sm text-white/75"><Trunc text={player.weightKg ? `${player.weightKg} kg` : ''} /></td>}
                    {show('marketValue') && (() => {
                      const val = player.marketValue ? `€${(player.marketValue / 1_000_000).toFixed(1)}M` : ''
                      return (
                        <td className="px-6 py-3 text-sm" style={{ color: val ? '#00c896' : 'rgba(255,255,255,0.25)' }}>
                          <Trunc text={val} />
                        </td>
                      )
                    })()}
                    {show('contractExpiry') && (() => {
                      const raw = getCF(player, 'contractExpiry')
                      const year = getContractYear(player)
                      const soon = year !== null && year <= new Date().getFullYear() + 1
                      const display = raw ? new Date(raw).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ''
                      return (
                        <td className="px-6 py-3 text-sm" style={{ color: display ? (soon ? '#f59e0b' : 'rgba(255,255,255,0.75)') : 'rgba(255,255,255,0.25)' }}>
                          <Trunc text={display} />
                        </td>
                      )
                    })()}
                    {show('preferredFoot') && <td className="px-6 py-3 text-sm text-white/75"><Trunc text={getCF(player, 'foot')} /></td>}
                    {show('fmWages') && (() => {
                      const w = getFmWages(player)
                      const display = w != null ? `£${w.toLocaleString()}/w` : ''
                      return <td className="px-6 py-3 text-sm text-white/75"><Trunc text={display} /></td>
                    })()}
                    {canEdit && (
                      <td className="px-4 py-3" style={{ position: 'sticky', right: 0, background: rowBgSolid, zIndex: 3, boxShadow: '-4px 0 8px -2px rgba(0,0,0,0.4)' }}>
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

// ─── Truncating cell content ─────────────────────────────────────────────────

function Trunc({ text }: { text: string }) {
  if (!text) return <span className="text-white/25">—</span>
  return (
    <span className="truncate block" style={{ maxWidth: '30ch' }} title={text}>
      {text}
    </span>
  )
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ColHeader({ label, sortKey, currentSort, sortDir, onSort, minWidth, sticky, noSort }: {
  label: string; sortKey: SortKey; currentSort: SortKey; sortDir: SortDir
  onSort: (k: SortKey) => void; minWidth?: number; sticky?: 'left' | 'right'; noSort?: boolean
}) {
  const isSorted = currentSort === sortKey && !noSort
  const stickyStyle: React.CSSProperties = sticky
    ? { position: 'sticky', [sticky]: 0, top: 0, background: 'var(--card-solid)', zIndex: 4 }
    : { position: 'sticky', top: 0, background: 'var(--card-solid)', zIndex: 2 }
  return (
    <th className="text-left px-4 py-3" style={{ minWidth, ...stickyStyle }}>
      {noSort
        ? <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        : <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 text-xs uppercase tracking-widest font-medium transition-colors" style={{ color: isSorted ? '#00c896' : 'var(--text-secondary)' }}>
            {label}<span className="text-[10px]">{isSorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
          </button>}
    </th>
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
