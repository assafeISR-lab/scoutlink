'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  PlayerFilterBar,
  DEFAULT_FILTERS, FILTER_PARAMS,
  getActiveChips, isFilterActive, clearFilterForKey,
  type Filters, type FilterMode, type FilterKey, type RangeBound,
} from '@/components/PlayerFilterBar'
import type { PlayerSnapshot } from './CreateReportModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomFieldEntry { fieldName: string; value: string }

export interface Player {
  id: string
  databaseId: string
  databaseName: string
  firstName: string
  lastName: string
  position: string | null
  clubName: string | null
  nationality: string | null
  dateOfBirth: string | null
  heightCm: number | null
  marketValue: number | null
  customFields: CustomFieldEntry[]
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
  const n = parseFloat(getCF(player, 'fmWages'))
  return isNaN(n) ? null : n
}

function matchesFilters(player: Player, f: Filters, mode: FilterMode): boolean {
  const age          = calcAge(player.dateOfBirth)
  const contractYear = getContractYear(player)
  const fmWages      = getFmWages(player)
  const checks: (() => boolean)[] = []

  if (f.name)             checks.push(() => `${player.firstName} ${player.lastName}`.toLowerCase().includes(f.name.toLowerCase()))
  if (f.positions.length) checks.push(() => {
    const playerPos = (player.position ?? '').toLowerCase().split(/[\/,]/).map(s => s.trim())
    return f.positions.some(p => playerPos.includes(p.toLowerCase()))
  })
  if (f.club)             checks.push(() => (player.clubName ?? '').toLowerCase().includes(f.club.toLowerCase()))
  if (f.nationalities.length) checks.push(() => f.nationalities.some(n => (player.nationality ?? '').toLowerCase() === n.toLowerCase()))
  if (f.ageMin !== null || f.ageMax !== null) checks.push(() => { const a = age ?? 0; return (f.ageMin === null || a >= f.ageMin) && (f.ageMax === null || a <= f.ageMax) })
  if (f.marketValueMin !== null || f.marketValueMax !== null) checks.push(() => { const v = player.marketValue ?? 0; return (f.marketValueMin === null || v >= f.marketValueMin) && (f.marketValueMax === null || v <= f.marketValueMax) })
  if (f.heightMin !== null || f.heightMax !== null) checks.push(() => { const h = player.heightCm ?? 0; return (f.heightMin === null || h >= f.heightMin) && (f.heightMax === null || h <= f.heightMax) })
  if (f.league)           checks.push(() => getCF(player, 'league').toLowerCase().includes(f.league.toLowerCase()))
  if (f.preferredFeet.length) checks.push(() => f.preferredFeet.some(foot => getCF(player, 'foot').toLowerCase() === foot.toLowerCase()))
  if (f.availabilities.length) checks.push(() => {
    const label = (player as any).available ? 'Available' : 'Not Available'
    return f.availabilities.includes(label)
  })
  if (f.injuries.length) checks.push(() => {
    const isInjured = !!getCF(player, 'injuryType')
    return f.injuries.includes(isInjured ? 'Injured' : 'Not Injured')
  })
  if (f.contractExpiryYearMin !== null || f.contractExpiryYearMax !== null) checks.push(() => { const cy = contractYear ?? 0; return (f.contractExpiryYearMin === null || cy >= f.contractExpiryYearMin) && (f.contractExpiryYearMax === null || cy <= f.contractExpiryYearMax) })
  if (f.fmWagesMin !== null || f.fmWagesMax !== null) checks.push(() => { const w = fmWages ?? 0; return (f.fmWagesMin === null || w >= f.fmWagesMin) && (f.fmWagesMax === null || w <= f.fmWagesMax) })

  if (checks.length === 0) return true
  return mode === 'AND' ? checks.every(fn => fn()) : checks.some(fn => fn())
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function PlayerAvatar({ player }: { player: Player }) {
  const [failed, setFailed] = useState(false)
  const photo = getCF(player, 'photo')
  if (photo && !failed) {
    return <img src={photo} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={() => setFailed(true)} />
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
      {player.firstName[0]}{player.lastName[0]}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SearchAllLists({ databaseIds, bare, onCreateReport, onActiveChange, onPlayerSelect, selectedPlayerId, onLoadingChange, onFilteredIds }: {
  databaseIds?: string[]
  bare?: boolean
  onCreateReport?: (players: PlayerSnapshot[]) => void
  onActiveChange?: (active: boolean) => void
  onPlayerSelect?: (player: Player) => void
  selectedPlayerId?: string
  onLoadingChange?: (v: boolean) => void
  onFilteredIds?: (ids: string[] | null) => void
}) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filterMode, setFilterMode] = useState<FilterMode>('AND')
  const [addFilterOpen, setAddFilterOpen] = useState(false)
  const [pendingFilter, setPendingFilter] = useState<FilterKey | null>(null)

  useEffect(() => {
    setLoading(true)
    onLoadingChange?.(true)
    setPlayers([])
    const url = databaseIds && databaseIds.length > 0
      ? `/api/players?databaseIds=${databaseIds.join(',')}`
      : '/api/players'
    fetch(url)
      .then(r => r.json())
      .then(d => setPlayers(d.players ?? []))
      .catch(() => {})
      .finally(() => { setLoading(false); onLoadingChange?.(false) })
  }, [databaseIds?.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const uniquePositions     = useMemo(() => [...new Set(players.flatMap(p => p.position ? p.position.split(/[\/,]/).map(s => s.trim()).filter(Boolean) : []))].sort(), [players])
  const uniqueNationalities = useMemo(() => [...new Set(players.map(p => p.nationality).filter(Boolean) as string[])].sort(), [players])
  const uniqueFeet          = useMemo(() => [...new Set(players.map(p => getCF(p, 'foot')).filter(Boolean))].sort(), [players])
  const ages                = useMemo(() => players.map(p => calcAge(p.dateOfBirth)).filter(Boolean) as number[], [players])
  const cyears              = useMemo(() => players.map(p => getContractYear(p)).filter(Boolean) as number[], [players])
  const wages               = useMemo(() => players.map(p => getFmWages(p)).filter(Boolean) as number[], [players])

  const multiOptions: Record<string, string[]> = {
    position:     uniquePositions,
    nationality:  uniqueNationalities,
    preferredFoot: uniqueFeet.length ? uniqueFeet : ['Right', 'Left', 'Both'],
    availability: ['Available', 'Not Available'],
    injury: ['Injured', 'Not Injured'],
  }

  const rangeBounds: Record<string, RangeBound> = {
    age:            { min: ages.length ? Math.min(...ages) : 15,   max: ages.length ? Math.max(...ages) : 45,   unit: 'y' },
    height:         { min: 150, max: 210, unit: 'cm' },
    marketValue:    { min: 0,   max: 200_000_000, unit: '€M', scale: 1_000_000 },
    contractExpiry: { min: cyears.length ? Math.min(...cyears) : new Date().getFullYear(), max: cyears.length ? Math.max(...cyears) : new Date().getFullYear() + 8 },
    fmWages:        { min: 0,   max: wages.length ? Math.max(...wages) : 200_000, unit: '£/w' },
  }

  function updateFilter(patch: Partial<Filters>) { setFilters(f => ({ ...f, ...patch })) }

  const activeChips = getActiveChips(filters)
  const hasFilters  = isFilterActive(filters)

  useEffect(() => { onActiveChange?.(hasFilters) }, [hasFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(
    () => hasFilters ? players.filter(p => matchesFilters(p, filters, filterMode)) : [],
    [players, filters, filterMode, hasFilters]
  )

  // Auto-select the first result the moment results appear (0 → N transition)
  const prevHadResultsRef = useRef(false)
  useEffect(() => {
    const hasResults = filtered.length > 0
    if (hasResults && !prevHadResultsRef.current) onPlayerSelect?.(filtered[0])
    prevHadResultsRef.current = hasResults
  }, [filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of the current filtered ID set so it can filter InlinePlayersTable
  useEffect(() => {
    onFilteredIds?.(loading ? null : (hasFilters ? filtered.map(p => p.id) : null))
  }, [filtered, hasFilters, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={bare ? '' : 'mb-8'}>
      <PlayerFilterBar
        bare={bare}
        filters={filters}
        filterMode={filterMode}
        activeChips={activeChips}
        totalCount={players.length}
        filteredCount={filtered.length}
        addFilterOpen={addFilterOpen}
        pendingFilter={pendingFilter}
        loading={loading}
        placeholder="Search players in lists…"
        onSetMode={setFilterMode}
        onRemoveChip={key => { updateFilter(clearFilterForKey(key)); if (pendingFilter === key) setPendingFilter(null) }}
        onEditChip={key => { setAddFilterOpen(false); setPendingFilter(key) }}
        onToggleAddFilter={() => { setAddFilterOpen(o => !o); setPendingFilter(null) }}
        onSelectParam={key => { setAddFilterOpen(false); setPendingFilter(key) }}
        onClearAll={() => { setFilters(DEFAULT_FILTERS); setPendingFilter(null) }}
        multiOptions={multiOptions}
        rangeBounds={rangeBounds}
        updateFilter={updateFilter}
        onClosePending={() => setPendingFilter(null)}
      />

    </div>
  )
}
