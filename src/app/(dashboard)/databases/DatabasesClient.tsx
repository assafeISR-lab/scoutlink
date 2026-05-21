'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SearchAllLists, { type Player as SearchListPlayer } from './SearchAllLists'
import SearchClient from '@/app/(dashboard)/search/SearchClient'
import PlayerPanelCard, { prefetchPlayer } from './PlayerPanelCard'
import CreateDatabaseButton from './CreateDatabaseButton'
import ImportDatabasesButton from './ImportDatabasesButton'
import ColumnPicker from './[id]/ColumnPicker'
import AddPlayerButton from './[id]/AddPlayerButton'
import CreateReportModal, { type PlayerSnapshot } from './CreateReportModal'
import { loadActive, loadCustomActive } from '@/app/(dashboard)/search/SearchParamsPanel'
import { positionPillStyle } from '@/lib/positionColor'

type DbItem = {
  id: string
  name: string
  playerCount: number
  sharedWith: number
  permission: string
  ownerName?: string
  createdAt: string
}

type PlayerRow = {
  id: string
  databaseId?: string
  databaseName?: string
  firstName: string
  middleName?: string | null
  lastName: string
  position: string | null
  clubName: string | null
  nationality: string | null
  agentName?: string | null
  dateOfBirth: string | null
  heightCm: number | null
  marketValue: number | null
  available: boolean
  playsNational?: boolean
  customFields: { fieldName: string; value: string }[]
}

type AIResult = {
  score: number
  explanation: string
  player: {
    id: string
    databaseId: string
    databaseName: string
    firstName: string
    lastName: string
    position: string | null
    clubName: string | null
    nationality: string | null
    age: number | null
    heightCm: number | null
    marketValue: number | null
    photo: string
  }
}

function trunc(s: string | null | undefined, max = 30): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max) + '…' : s
}

function rowToSnapshot(p: PlayerRow): PlayerSnapshot {
  return {
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    position: p.position,
    clubName: p.clubName,
    nationality: p.nationality,
    age: calcAge(p.dateOfBirth),
    heightCm: p.heightCm,
    marketValue: p.marketValue,
    agentName: p.agentName ?? null,
    fmAttributes: p.customFields.find(f => f.fieldName === 'fmAttributes')?.value ?? null,
    playsNational: p.playsNational ?? false,
    notes: [],
  }
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function fmtValue(v: number | null): string {
  if (!v) return '—'
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`
  return `€${v}`
}

function fmtWages(v: number | null): string {
  if (!v) return '—'
  if (v >= 1_000) return `£${(v / 1_000).toFixed(0)}k/w`
  return `£${v}/w`
}

function aiResultToPlayerRow(r: AIResult): PlayerRow {
  return {
    id: r.player.id,
    databaseId: r.player.databaseId,
    databaseName: r.player.databaseName,
    firstName: r.player.firstName,
    lastName: r.player.lastName,
    position: r.player.position,
    clubName: r.player.clubName,
    nationality: r.player.nationality,
    dateOfBirth: null,
    heightCm: r.player.heightCm,
    marketValue: r.player.marketValue,
    available: true,
    customFields: r.player.photo ? [{ fieldName: 'photo', value: r.player.photo }] : [],
  }
}

function searchListPlayerToPlayerRow(p: SearchListPlayer): PlayerRow {
  return {
    id: p.id,
    databaseId: p.databaseId,
    databaseName: p.databaseName,
    firstName: p.firstName,
    lastName: p.lastName,
    position: p.position,
    clubName: p.clubName,
    nationality: p.nationality,
    dateOfBirth: p.dateOfBirth,
    heightCm: p.heightCm,
    marketValue: p.marketValue,
    available: true,
    customFields: p.customFields,
  }
}

function RowAvatar({ player }: { player: PlayerRow }) {
  const [failed, setFailed] = useState(false)
  const photo = player.customFields.find(f => f.fieldName === 'photo')?.value ?? ''
  if (photo && !failed) {
    return (
      <img src={photo} alt="" referrerPolicy="no-referrer"
        className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
        onError={() => setFailed(true)} />
    )
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: 'var(--subtle-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
      {player.firstName[0]}{player.lastName[0]}
    </div>
  )
}

// Keys that can appear as table columns — mirrors ColumnPicker's TABLE_COLUMNS
const TABLE_COLS = new Set([
  'position', 'team', 'league', 'nationality',
  'age', 'dateOfBirth', 'height',
  'marketValue', 'contractExpiry', 'preferredFoot', 'fmWages',
  'availability',
])

type SortKey = 'name' | 'availability' | 'position' | 'team' | 'nationality' | 'age' | 'height' | 'marketValue' | 'contractExpiry' | 'preferredFoot' | 'fmWages'

function SortTh({ label, sortKey, current, dir, onSort }: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th
      className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium whitespace-nowrap cursor-pointer select-none transition-colors"
      style={{ color: active ? 'var(--text-secondary)' : 'var(--text-muted)' }}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: active ? 1 : 0.3 }}>
          {active && dir === 'asc'
            ? <path d="M12 8l-6 6h12z"/>
            : <path d="M12 16l6-6H6z"/>}
        </svg>
      </span>
    </th>
  )
}

// ─── AI Results Panel ─────────────────────────────────────────────────────────

function AIResultsPanel({ results, query, onCreateReport, onClose, onPlayerSelect, selectedPlayerId }: {
  results: AIResult[]
  query: string
  onCreateReport?: (players: PlayerSnapshot[]) => void
  onClose: () => void
  onPlayerSelect?: (player: PlayerRow) => void
  selectedPlayerId?: string
}) {
  function toSnap(r: AIResult): PlayerSnapshot {
    return {
      id: r.player.id,
      name: `${r.player.firstName} ${r.player.lastName}`,
      position: r.player.position,
      clubName: r.player.clubName,
      nationality: r.player.nationality,
      age: r.player.age,
      heightCm: r.player.heightCm,
      marketValue: r.player.marketValue,
      agentName: null,
      fmAttributes: null,
      playsNational: false,
      notes: [],
    }
  }

  return (
    <div className="rounded-2xl border overflow-hidden mb-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#00c896' }}>AI</span>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: '#00c896' }}>{results.length}</strong> result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onCreateReport && (
            <button
              onClick={() => onCreateReport(results.map(toSnap))}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(255,159,67,0.1)', color: '#ff9f43', border: '1px solid rgba(255,159,67,0.25)' }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Create Report
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}
            title="Dismiss results"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
      <div>
        {results.map((r, i) => {
          const sc = r.score >= 80 ? '#00c896' : r.score >= 60 ? '#ff9f43' : '#ef4444'
          const isSelected = selectedPlayerId === r.player.id
          return (
            <div key={r.player.id}
              className="flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors cursor-pointer group"
              style={{ borderColor: 'var(--border)', background: isSelected ? 'rgba(0,200,150,0.06)' : 'transparent', boxShadow: isSelected ? 'inset 3px 0 0 #00c896' : 'none' }}
              onClick={() => onPlayerSelect?.(aiResultToPlayerRow(r))}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover-bg)' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}30` }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium transition-colors" style={{ color: isSelected ? '#00c896' : 'var(--text-primary)' }}>
                    {r.player.firstName} {r.player.lastName}
                  </span>
                  <Link
                    href={`/databases/${r.player.databaseId}/players/${r.player.id}`}
                    onClick={e => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: 'var(--text-faint)' }}
                    title="Open full profile"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                  </Link>
                  {r.player.position && (() => { const s = positionPillStyle(r.player.position); return s
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={s}>{r.player.position}</span>
                    : <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{r.player.position}</span>
                  })()}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-auto"
                    style={{ background: `${sc}15`, color: sc, border: `1px solid ${sc}30` }}>
                    {r.score}%
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {[r.player.clubName, r.player.nationality, r.player.age ? `${r.player.age}y` : null].filter(Boolean).join(' · ')}
                </p>
                {r.explanation && (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-faint)' }}>{r.explanation}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Inline Players Table ─────────────────────────────────────────────────────

function InlinePlayersTable({ databaseIds, allDbs, onCreateReport, fillHeight, onPlayerSelect, selectedPlayerId, showOnlyIds, onListLoaded }: { databaseIds: string[]; allDbs: DbItem[]; onCreateReport?: (players: PlayerSnapshot[]) => void; fillHeight?: boolean; onPlayerSelect?: (player: PlayerRow) => void; selectedPlayerId?: string; showOnlyIds?: Set<string>; onListLoaded?: (players: PlayerRow[]) => void }) {
  const isMulti = databaseIds.length > 1
  const singleId = !isMulti ? databaseIds[0] : undefined

  const [players, setPlayers] = useState<PlayerRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [columnConfig, setColumnConfig] = useState<string[] | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [availOverride, setAvailOverride] = useState<Record<string, boolean>>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [fallbackCols] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return TABLE_COLS
    return new Set([...loadActive(), ...loadCustomActive()].filter(k => TABLE_COLS.has(k)))
  })

  const prevIdsRef = useRef(databaseIds.join(','))
  const pendingSelectRef = useRef<string | null>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedPlayerId) return
    // Defer until after the browser has recalculated layout (especially important
    // when the panel was just opened and the flex container height was just set)
    const rafId = requestAnimationFrame(() => {
      const row = tableScrollRef.current?.querySelector(`[data-player-id="${selectedPlayerId}"]`)
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(rafId)
  }, [selectedPlayerId])

  useEffect(() => {
    const handler = (e: Event) => {
      const playerId = (e as CustomEvent<{ playerId?: string }>).detail?.playerId
      if (playerId) pendingSelectRef.current = playerId
      setRefreshKey(k => k + 1)
    }
    window.addEventListener('scoutlink:player-added', handler)
    return () => window.removeEventListener('scoutlink:player-added', handler)
  }, [])

  useEffect(() => {
    const currentIds = databaseIds.join(',')
    const idsChanged = prevIdsRef.current !== currentIds
    prevIdsRef.current = currentIds

    if (idsChanged) {
      setLoading(true)
      setPlayers(null)
      setColumnConfig(null)
      setAvailOverride({})
    }

    const url = isMulti
      ? `/api/players?databaseIds=${databaseIds.join(',')}`
      : `/api/databases/${databaseIds[0]}/players`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const newPlayers: PlayerRow[] = d.players ?? []
        setPlayers(newPlayers)
        if (!isMulti) {
          const saved: string[] | null = d.columnConfig ?? null
          if (saved !== null) {
            // Auto-migrate: add any TABLE_COLS keys added after this config was saved
            const merged = [...new Set([...saved, ...Array.from(TABLE_COLS)])]
            setColumnConfig(merged)
          } else {
            setColumnConfig(null)
          }
        }
        if (pendingSelectRef.current) {
          const target = newPlayers.find(p => p.id === pendingSelectRef.current)
          pendingSelectRef.current = null
          if (target) onPlayerSelect?.(target)
        }
        onListLoaded?.(newPlayers)
        setLoading(false)
      })
      .catch(() => { setPlayers([]); setLoading(false) })
  }, [databaseIds.join(','), refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deletePlayer(p: PlayerRow) {
    const dbId = p.databaseId ?? singleId
    if (!dbId) return
    setDeletingId(p.id)
    await fetch(`/api/databases/${dbId}/players/${p.id}`, { method: 'DELETE' })
    setPlayers(prev => prev ? prev.filter(x => x.id !== p.id) : prev)
    setConfirmDeleteId(null)
    setDeletingId(null)
  }

  const show = (key: string) => {
    return columnConfig !== null ? columnConfig.includes(key) : fallbackCols.has(key)
  }
  const showDobCol = show('age') || show('dateOfBirth')

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  async function toggleAvailable(p: PlayerRow) {
    const dbId = p.databaseId ?? singleId
    if (!dbId) return
    const current = availOverride[p.id] ?? p.available
    const next = !current
    setAvailOverride(prev => ({ ...prev, [p.id]: next }))
    try {
      await fetch(`/api/databases/${dbId}/players/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: next, changedFields: ['available'] }),
      })
    } catch {
      setAvailOverride(prev => ({ ...prev, [p.id]: current }))
    }
  }

  const sorted = useMemo(() => {
    if (!players) return []
    const cf = (p: PlayerRow, key: string) => p.customFields.find(f => f.fieldName === key)?.value ?? ''
    return [...players].sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      switch (sortKey) {
        case 'name':          av = `${a.firstName} ${a.lastName}`;  bv = `${b.firstName} ${b.lastName}`;  break
        case 'availability':  av = (availOverride[a.id] ?? a.available) ? 1 : 0; bv = (availOverride[b.id] ?? b.available) ? 1 : 0; break
        case 'position':      av = a.position ?? '';                 bv = b.position ?? '';                break
        case 'team':          av = a.clubName ?? '';                 bv = b.clubName ?? '';                break
        case 'nationality':   av = a.nationality ?? '';              bv = b.nationality ?? '';             break
        case 'age':           av = calcAge(a.dateOfBirth) ?? -1;    bv = calcAge(b.dateOfBirth) ?? -1;   break
        case 'height':        av = a.heightCm ?? -1;                bv = b.heightCm ?? -1;               break
        case 'marketValue':   av = a.marketValue ?? -1;             bv = b.marketValue ?? -1;            break
        case 'contractExpiry': {
          const cy = (p: PlayerRow) => { const v = cf(p, 'contractExpiry'); const d = new Date(v); return isNaN(d.getTime()) ? -1 : d.getFullYear() }
          av = cy(a); bv = cy(b); break
        }
        case 'preferredFoot': av = cf(a, 'foot');                   bv = cf(b, 'foot');                   break
        case 'fmWages':       av = parseFloat(cf(a, 'fmWages')) || -1; bv = parseFloat(cf(b, 'fmWages')) || -1; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [players, sortKey, sortDir, availOverride])

  const displayRows = showOnlyIds ? sorted.filter(p => showOnlyIds.has(p.id)) : sorted

  if (loading) {
    return (
      <div className="rounded-2xl border flex items-center justify-center py-16" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)', ...(fillHeight ? { flex: 1, minHeight: 0 } : {}) }}>
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--border)', ...(fillHeight ? { flex: 1, minHeight: 0 } : {}) }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No players in this list yet.</p>
      </div>
    )
  }

  const thProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)', ...(fillHeight ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : {}) }}>
      {/* Header bar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b${fillHeight ? ' flex-shrink-0' : ''}`} style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {showOnlyIds ? (
            <><span style={{ color: '#00c896' }}>{displayRows.length}</span><span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> of </span><span style={{ color: '#00c896' }}>{players.length}</span> player{players.length !== 1 ? 's' : ''}</>
          ) : (
            <><span style={{ color: '#00c896' }}>{players.length}</span> player{players.length !== 1 ? 's' : ''}</>
          )}
        </p>
        <div className="flex items-center gap-2">
          {onCreateReport && displayRows.length > 0 && (
            <button
              onClick={() => onCreateReport(displayRows.map(rowToSnapshot))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-faint)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Create Report
            </button>
          )}
          {!isMulti && singleId && (
            <>
              <ColumnPicker databaseId={singleId} columnConfig={columnConfig} onUpdate={setColumnConfig} />
              <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />
              <AddPlayerButton databaseId={singleId} />
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div ref={tableScrollRef} style={fillHeight ? { overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0 } : { overflowX: 'auto' }}>
        <table className="w-full text-sm" style={{ minWidth: 500 }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {isMulti && <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>List</th>}
              <SortTh label="Player"       sortKey="name"          {...thProps} />
              {show('availability') && <SortTh label="Status"      sortKey="availability" {...thProps} />}
              {show('position')    && <SortTh label="Position"     sortKey="position"     {...thProps} />}
              {(show('team') || show('league')) && <SortTh label="Club / League" sortKey="team" {...thProps} />}
              {show('nationality') && <SortTh label="Nat."         sortKey="nationality"  {...thProps} />}
              {showDobCol          && <SortTh label="Age"          sortKey="age"          {...thProps} />}
              {show('height')      && <SortTh label="Height"       sortKey="height"       {...thProps} />}
              {show('marketValue') && <SortTh label="Value"        sortKey="marketValue"  {...thProps} />}
              {show('contractExpiry') && <SortTh label="Contract"  sortKey="contractExpiry" {...thProps} />}
              {show('preferredFoot')  && <SortTh label="Foot"      sortKey="preferredFoot"  {...thProps} />}
              {show('fmWages')     && <SortTh label="FM Wages"     sortKey="fmWages"      {...thProps} />}
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && showOnlyIds ? (
              <tr>
                <td colSpan={99} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
                  No players match these filters
                </td>
              </tr>
            ) : null}
            {displayRows.map(p => {
              const cf = (key: string) => p.customFields.find(f => f.fieldName === key)?.value ?? ''
              const age = calcAge(p.dateOfBirth)
              const contractYear = (() => {
                const val = cf('contractExpiry')
                if (!val) return null
                const d = new Date(val)
                return isNaN(d.getTime()) ? null : d.getFullYear()
              })()
              const wages = (() => { const n = parseFloat(cf('fmWages')); return isNaN(n) ? null : n })()
              const isSelected = selectedPlayerId === p.id
              return (
                <tr key={p.id}
                  data-player-id={p.id}
                  className={`border-b last:border-0 transition-colors group${onPlayerSelect ? ' cursor-pointer' : ''}`}
                  style={{ borderColor: 'var(--border)', ...(isSelected ? { background: 'rgba(0,200,150,0.06)', boxShadow: 'inset 3px 0 0 #00c896' } : {}) }}
                  onClick={() => onPlayerSelect?.(p)}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover-bg)'; prefetchPlayer(p.databaseId ?? singleId ?? '', p.id) }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>

                  {isMulti && (() => {
                    const dbName = p.databaseName ?? allDbs.find(d => d.id === p.databaseId)?.name ?? ''
                    return (
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full" title={dbName}
                          style={{ background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {trunc(dbName)}
                        </span>
                      </td>
                    )
                  })()}
                  <td className="px-4 py-2.5">
                    {onPlayerSelect ? (
                      <div className="flex items-center gap-2.5">
                        <RowAvatar player={p} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {(() => {
                              const fullName = `${p.firstName} ${p.lastName}`
                              return (
                                <p className="text-sm font-semibold truncate flex-1"
                                  title={fullName.length > 30 ? fullName : undefined}
                                  style={{ color: isSelected ? '#00c896' : 'var(--text-primary)' }}>
                                  {trunc(fullName)}
                                </p>
                              )
                            })()}
                            <Link
                              href={`/databases/${p.databaseId ?? singleId}/players/${p.id}`}
                              onClick={e => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity flex-shrink-0"
                              style={{ color: 'var(--text-faint)' }}
                              title="Open full profile"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                            </Link>
                          </div>
                          {!(availOverride[p.id] ?? p.available) && !show('availability') && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded tracking-wider uppercase whitespace-nowrap" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>Not Avail.</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Link href={`/databases/${p.databaseId ?? singleId}/players/${p.id}`} className="flex items-center gap-2.5 group">
                        <RowAvatar player={p} />
                        <div className="min-w-0">
                          {(() => {
                            const fullName = `${p.firstName} ${p.lastName}`
                            return (
                              <p className="text-sm font-semibold truncate transition-colors group-hover:text-[#00c896]"
                                title={fullName.length > 30 ? fullName : undefined}
                                style={{ color: 'var(--text-primary)' }}>
                                {trunc(fullName)}
                              </p>
                            )
                          })()}
                          {!(availOverride[p.id] ?? p.available) && !show('availability') && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded tracking-wider uppercase whitespace-nowrap" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>Not Avail.</span>
                          )}
                        </div>
                      </Link>
                    )}
                  </td>

                  {show('availability') && (() => {
                    const isAvail = availOverride[p.id] ?? p.available
                    return (
                      <td className="px-4 py-2.5">
                        <button
                          onClick={e => { e.stopPropagation(); toggleAvailable(p) }}
                          className="text-[11px] px-1.5 py-0.5 rounded font-medium tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap"
                          style={isAvail
                            ? { background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.3)' }
                            : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                          title="Click to toggle availability"
                        >
                          {isAvail ? 'Available' : 'Not Avail.'}
                        </button>
                      </td>
                    )
                  })()}

                  {show('position') && (
                    <td className="px-4 py-2.5">
                      {p.position
                        ? (() => { const s = positionPillStyle(p.position); return s
                            ? <span className="text-[11px] px-1.5 py-0.5 rounded" title={p.position.length > 30 ? p.position : undefined} style={s}>{trunc(p.position)}</span>
                            : <span className="text-[11px]" title={p.position.length > 30 ? p.position : undefined} style={{ color: 'var(--text-secondary)' }}>{trunc(p.position)}</span>
                          })()
                        : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                    </td>
                  )}

                  {(show('team') || show('league')) && (
                    <td className="px-4 py-2.5">
                      {show('team') && <p className="text-xs" title={(p.clubName?.length ?? 0) > 30 ? p.clubName! : undefined} style={{ color: 'var(--text-secondary)' }}>{trunc(p.clubName) || '—'}</p>}
                      {show('league') && cf('league') && <p className="text-[11px] mt-0.5" title={cf('league').length > 30 ? cf('league') : undefined} style={{ color: 'var(--text-faint)' }}>{trunc(cf('league'))}</p>}
                    </td>
                  )}

                  {show('nationality') && <td className="px-4 py-2.5 text-xs" title={(p.nationality?.length ?? 0) > 30 ? p.nationality! : undefined} style={{ color: 'var(--text-muted)' }}>{trunc(p.nationality) || '—'}</td>}

                  {showDobCol && <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{age != null ? `${age}y` : '—'}</td>}

                  {show('height') && <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{p.heightCm ? `${p.heightCm}cm` : '—'}</td>}

                  {show('marketValue') && <td className="px-4 py-2.5 text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtValue(p.marketValue)}</td>}

                  {show('contractExpiry') && <td className="px-4 py-2.5 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{contractYear ?? '—'}</td>}

                  {show('preferredFoot') && <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{cf('foot') || '—'}</td>}

                  {show('fmWages') && <td className="px-4 py-2.5 text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtWages(wages)}</td>}

                  <td className="px-2 py-2.5 text-right">
                    {confirmDeleteId === p.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] px-2 py-0.5 rounded-md"
                          style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deletePlayer(p)}
                          disabled={deletingId === p.id}
                          className="text-[10px] px-2 py-0.5 rounded-md font-medium disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                        >
                          {deletingId === p.id ? '…' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(p.id) }}
                          className="w-6 h-6 flex items-center justify-center rounded-md"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                          title="Remove player"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function DatabasesClient({
  ownedDbs,
  sharedDbs,
  importableDatabases,
  userName,
  userId: _userId,
}: {
  ownedDbs: DbItem[]
  sharedDbs: DbItem[]
  importableDatabases: { id: string; name: string }[]
  userName: string
  userId: string
}) {
  const allDbs = [...ownedDbs, ...sharedDbs]
  const firstId = ownedDbs[0]?.id ?? sharedDbs[0]?.id
  const [selectedIds, setSelectedIds] = useState<string[]>(firstId ? [firstId] : [])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [aiResults, setAiResults] = useState<AIResult[] | null>(null)
  const [aiQuery, setAiQuery] = useState('')
  const [reportData, setReportData] = useState<{ players: PlayerSnapshot[]; databaseId: string; databaseName: string } | null>(null)
  const [filterActive, setFilterActive] = useState(false)
  const [filteredPlayerIds, setFilteredPlayerIds] = useState<string[] | null>(null)
  const [aiSearching, setAiSearching] = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)
  const [scoutOpen, setScoutOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null)
  const [playerAction, setPlayerAction] = useState<'report' | 'delete' | null>(null)
  const [playerCanWrite, setPlayerCanWrite] = useState(false)
  const [playerDirty, setPlayerDirty] = useState(false)
  const [playerSaving, setPlayerSaving] = useState(false)
  const [playerSaved, setPlayerSaved] = useState(false)
  const playerFlushRef = useRef<(() => Promise<void>) | undefined>(undefined)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAutoSelectRef = useRef(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1100)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setAiResults(null)
    playerFlushRef.current?.()
    setScoutOpen(false)
    setSelectedPlayer(null)
    setPlayerCanWrite(false)
    setPlayerAction(null)
    setPlayerDirty(false)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    setPlayerSaving(false)
    setPlayerSaved(false)
    pendingAutoSelectRef.current = true
  }, [selectedIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (savedTimer.current) clearTimeout(savedTimer.current)
  }, [])

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  // Delete only available when exactly one owned list is selected
  const singleSelected = selectedIds.length === 1 ? allDbs.find(db => db.id === selectedIds[0]) : null
  const canDelete = singleSelected?.permission === 'owner'

  function togglePill(id: string) {
    setSelectedIds(prev => prev.includes(id) ? [] : [id])
  }

  async function handleDelete() {
    if (!singleSelected) return
    setDeleting(true)
    await fetch(`/api/databases/${singleSelected.id}`, { method: 'DELETE' })
    setConfirmDelete(false)
    setDeleting(false)
    const remaining = allDbs.filter(db => db.id !== singleSelected.id)
    setSelectedIds(remaining.length ? [remaining[0].id] : [])
    router.refresh()
  }

  const isAllLists = selectedIds.length === 0
  const selectedDbId = isAllLists ? (allDbs[0]?.id ?? '') : (selectedIds[0] ?? '')
  const selectedDbName = isAllLists ? 'All Lists' : (allDbs.find(d => d.id === selectedIds[0])?.name ?? 'List')
  const playerPanelOpen = selectedPlayer !== null
  const rightPanelOpen = scoutOpen || playerPanelOpen
  const splitPanelActive = rightPanelOpen && !isNarrow

  function resetSaveState() {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    setPlayerSaving(false)
    setPlayerSaved(false)
  }

  function handlePlayerSelect(player: PlayerRow) {
    playerFlushRef.current?.()
    setSelectedPlayer(player)
    setScoutOpen(false)
    setPlayerCanWrite(false)
    setPlayerAction(null)
    setPlayerDirty(false)
    resetSaveState()
  }

  function closeRightPanel() {
    playerFlushRef.current?.()
    setScoutOpen(false)
    setSelectedPlayer(null)
    setPlayerCanWrite(false)
    setPlayerAction(null)
    setPlayerDirty(false)
    resetSaveState()
  }

  function handleSavePlayer() {
    if (!playerDirty) return
    ;(document.activeElement as HTMLElement)?.blur()
    setPlayerSaving(true)
    setPlayerSaved(false)
    playerFlushRef.current?.()  // fire and forget
    setPlayerDirty(false)
  }

  function openReport(players: PlayerSnapshot[]) {
    setReportData({ players, databaseId: selectedDbId, databaseName: selectedDbName })
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="mr-auto pl-3 border-l-2" style={{ borderColor: '#00c896' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>ScoutLink Studio</h1>
          {allDbs.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
              <span style={{ color: '#00c896' }}>{allDbs.reduce((s, d) => s + d.playerCount, 0)}</span> players · {allDbs.length} list{allDbs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {canDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            Delete List
          </button>
        )}
        <ImportDatabasesButton databases={importableDatabases} />
        <CreateDatabaseButton />
        <button
          onClick={() => { if (selectedPlayer) playerFlushRef.current?.(); setScoutOpen(o => !o); setSelectedPlayer(null); setPlayerDirty(false); resetSaveState() }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={scoutOpen
            ? { background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.35)', boxShadow: '0 0 0 3px rgba(0,200,150,0.08)' }
            : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { if (!scoutOpen) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
          onMouseLeave={e => { if (!scoutOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
        >
          {scoutOpen && (
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00c896', boxShadow: '0 0 6px rgba(0,200,150,0.7)', animation: 'pulse 1.5s infinite' }} />
          )}
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          Web Scout
        </button>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && singleSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid rgba(239,68,68,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
              Delete &ldquo;{singleSelected.name}&rdquo;?
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
              This will permanently delete all {singleSelected.playerCount} player{singleSelected.playerCount !== 1 ? 's' : ''} in this list. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                {deleting ? 'Deleting…' : 'Delete List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Split layout ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: isNarrow && rightPanelOpen ? 'column' : 'row', gap: 0, ...(splitPanelActive ? { height: 'calc(100vh - 116px)' } : {}) }}>

      {/* ── Left: list panel ─────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        width: isNarrow || !rightPanelOpen ? '100%' : '44%',
        transition: 'width 0.35s cubic-bezier(.4,0,.2,1)',
        minWidth: 0,
        ...(splitPanelActive ? { height: '100%', display: 'flex', flexDirection: 'column' as const, paddingRight: 2 } : {}),
      }}>

      {/* Unified scope + search panel */}
      <div className="rounded-2xl border mb-4 overflow-visible" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)', ...(splitPanelActive ? { flexShrink: 0 } : {}) }}>

        {/* Row 1 — List selector */}
        <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b" style={{ background: 'var(--subtle-bg)', borderColor: 'var(--border)', borderRadius: '1rem 1rem 0 0' }}>
          <span className="w-7 flex-shrink-0 flex items-center justify-center" style={{ color: 'var(--text-faint)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </span>
          <button
            onClick={() => setSelectedIds([])}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={isAllLists ? {
              background: '#00c896', color: '#fff', border: '1px solid #00c896',
            } : {
              background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)',
            }}
            onMouseEnter={e => { if (!isAllLists) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--subtle-bg)' } }}
            onMouseLeave={e => { if (!isAllLists) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' } }}
          >
            All Lists
          </button>
          {allDbs.map(db => {
            const active = selectedIds.includes(db.id)
            return (
              <button
                key={db.id}
                onClick={() => togglePill(db.id)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={active ? {
                  background: '#00c896', color: '#fff', border: '1px solid #00c896',
                } : {
                  background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--subtle-bg)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' } }}
              >
                {trunc(db.name, 24)}
                <span className="ml-1.5 opacity-40">{db.playerCount}</span>
              </button>
            )
          })}
        </div>

        {/* Row 2 — AI search */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b relative" style={{ borderColor: 'var(--border)' }}>
          <span className="w-7 flex-shrink-0 flex items-center justify-center" style={{ color: 'rgba(0,200,150,0.55)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
            </svg>
          </span>
          <ScoutAIBar bare databaseIds={isAllLists ? undefined : selectedIds} onSearchingChange={setAiSearching} onResults={(results, query) => {
            setAiResults(results)
            setAiQuery(query)
            if (results.length > 0) handlePlayerSelect(aiResultToPlayerRow(results[0]))
          }} />
          {aiSearching && <ProgressBar />}
        </div>

        {/* Row 3 — Filter / keyword search */}
        <div className="flex items-start gap-2 px-4 py-2.5 relative">
          <span className="w-7 flex-shrink-0 flex items-center justify-center mt-1" style={{ color: 'var(--text-faint)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <SearchAllLists bare databaseIds={isAllLists ? undefined : selectedIds} onCreateReport={openReport} onActiveChange={setFilterActive} onLoadingChange={setFilterLoading} onFilteredIds={setFilteredPlayerIds} onPlayerSelect={p => handlePlayerSelect(searchListPlayerToPlayerRow(p))} selectedPlayerId={selectedPlayer?.id} />
          </div>
          {filterLoading && <ProgressBar />}
        </div>

      </div>

      {/* AI results */}
      {aiResults && aiResults.length > 0 && (
        <div style={splitPanelActive ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}}>
          <AIResultsPanel
            results={aiResults}
            query={aiQuery}
            onCreateReport={openReport}
            onClose={() => setAiResults(null)}
            onPlayerSelect={handlePlayerSelect}
            selectedPlayerId={selectedPlayer?.id}
          />
        </div>
      )}

      {/* Player table — always visible unless AI results are shown */}
      {!(aiResults && aiResults.length > 0) && (
        allDbs.length === 0
          ? <EmptyState message="You haven't created any lists yet." />
          : <InlinePlayersTable
              databaseIds={isAllLists ? allDbs.map(d => d.id) : selectedIds}
              allDbs={allDbs}
              onCreateReport={openReport}
              fillHeight={splitPanelActive}
              onPlayerSelect={handlePlayerSelect}
              selectedPlayerId={selectedPlayer?.id}
              showOnlyIds={filteredPlayerIds !== null ? new Set(filteredPlayerIds) : undefined}
              onListLoaded={players => {
                if (pendingAutoSelectRef.current && players.length > 0) {
                  pendingAutoSelectRef.current = false
                  handlePlayerSelect(players[0])
                }
              }}
            />
      )}

      </div> {/* end left panel */}

      {/* ── Divider (side-by-side mode only) ────────────────────── */}
      <div style={{
        flexShrink: 0,
        width: (!isNarrow && rightPanelOpen) ? 3 : 0,
        alignSelf: 'stretch',
        background: 'var(--border-strong)',
        margin: (!isNarrow && rightPanelOpen) ? '0 12px' : 0,
        borderRadius: 2,
        transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
      }} />

      {/* ── Right: scout / player panel ──────────────────────────── */}
      <div style={{
        flex: isNarrow ? 'none' : 1,
        width: isNarrow ? '100%' : undefined,
        height: isNarrow && !rightPanelOpen ? 0 : splitPanelActive ? '100%' : undefined,
        marginTop: isNarrow && rightPanelOpen ? 12 : 0,
        minWidth: 0,
        opacity: rightPanelOpen ? 1 : 0,
        pointerEvents: rightPanelOpen ? 'auto' : 'none',
        transition: 'opacity 0.3s ease, height 0.35s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}>
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)', ...(splitPanelActive ? { display: 'flex', flexDirection: 'column', height: '100%' } : {}) }}>
          {/* Panel header — changes based on mode */}
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
            {scoutOpen ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00c896', boxShadow: '0 0 6px rgba(0,200,150,0.7)', animation: 'pulse 1.5s infinite' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Web Scout</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→ adding to <strong style={{ color: 'var(--text-secondary)' }}>{selectedDbName}</strong></span>
              </div>
            ) : selectedPlayer ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)' }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#00c896"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{selectedPlayer.firstName} {selectedPlayer.lastName}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 flex-shrink-0">
              {playerPanelOpen && selectedPlayer && (
                <>
                  <button
                    onClick={handleSavePlayer}
                    disabled={playerSaving || (!playerDirty && !playerSaved)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={playerSaving
                      ? { background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.4)', cursor: 'default' }
                      : playerSaved && !playerDirty
                        ? { background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.45)', cursor: 'default' }
                        : playerDirty
                          ? { background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.35)' }
                          : { background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--border)', cursor: 'default' }}
                  >
                    {playerSaving ? (
                      <><div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin flex-shrink-0" />Saving…</>
                    ) : playerSaved && !playerDirty ? (
                      <><div className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.2)', border: '1px solid rgba(0,200,150,0.5)' }}><svg className="w-2 h-2" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>Saved</>
                    ) : (
                      <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16a3 3 0 110-6 3 3 0 010 6zm3-10H5V5h10v4z"/></svg>Save</>
                    )}
                  </button>
                  <button
                    onClick={() => setPlayerAction('report')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,159,67,0.08)'; e.currentTarget.style.color = '#ff9f43'; e.currentTarget.style.borderColor = 'rgba(255,159,67,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    Create Report
                  </button>
                  {playerCanWrite && (
                    <button
                      onClick={() => setPlayerAction('delete')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      Delete
                    </button>
                  )}
                </>
              )}
              <button
                onClick={closeRightPanel}
                className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                style={{ color: 'var(--text-faint)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>
          {/* Panel body — SearchClient always mounted (state survives), PlayerQuickPanel keyed by id */}
          <div style={splitPanelActive ? { overflowY: 'auto', flex: 1, minHeight: 0 } : {}}>
            <div style={{ display: scoutOpen ? 'block' : 'none' }}>
              <SearchClient
                panelMode
                targetDatabaseId={selectedDbId}
                targetListName={selectedDbName}
                onPlayerAdded={(name) => showToast(`${name} added to ${selectedDbName}`)}
                databases={allDbs.map(d => ({ id: d.id, name: d.name }))}
                userName={userName}
              />
            </div>
            {playerPanelOpen && selectedPlayer && (
              <PlayerPanelCard
                key={selectedPlayer.id}
                playerId={selectedPlayer.id}
                dbId={selectedPlayer.databaseId ?? selectedDbId}
                initialPlayer={selectedPlayer}
                initialCanWrite={(() => { const db = allDbs.find(d => d.id === (selectedPlayer.databaseId ?? selectedDbId)); return !!db && (db.permission === 'owner' || db.permission === 'contributor') })()}
                onDeleted={() => { setSelectedPlayer(null); setPlayerCanWrite(false); setPlayerDirty(false); resetSaveState() }}
                triggerAction={playerAction}
                onTriggerHandled={() => setPlayerAction(null)}
                onLoaded={(cw) => setPlayerCanWrite(cw)}
                onSaveComplete={() => {
                  setPlayerSaving(false)
                  setPlayerSaved(true)
                  if (savedTimer.current) clearTimeout(savedTimer.current)
                  savedTimer.current = setTimeout(() => setPlayerSaved(false), 2000)
                }}
                flushRef={playerFlushRef}
                onDirtyChange={setPlayerDirty}
              />
            )}
          </div>
        </div>
      </div>

      </div> {/* end split container */}

      {/* Create Report modal */}
      {reportData && (
        <CreateReportModal
          players={reportData.players}
          databaseId={reportData.databaseId}
          databaseName={reportData.databaseName}
          onClose={() => setReportData(null)}
        />
      )}

      {/* ── Toast notification ─────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: `translateX(-50%) translateY(${toast ? 0 : 16}px)`,
          opacity: toast ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          zIndex: 100,
        }}
      >
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium"
          style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,200,150,0.4)', color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.2)', border: '1px solid rgba(0,200,150,0.5)' }}>
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#00c896">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <span>{toast}</span>
        </div>
      </div>
    </>
  )
}


function ScoutAIBar({ databaseIds, bare, onResults, onSearchingChange }: {
  databaseIds?: string[]
  bare?: boolean
  onResults?: (results: AIResult[], query: string) => void
  onSearchingChange?: (v: boolean) => void
}) {
  const [value, setValue] = useState('')
  const [searching, setSearching] = useState(false)
  const router = useRouter()

  function setSearchingState(v: boolean) { setSearching(v); onSearchingChange?.(v) }

  async function submit() {
    const q = value.trim()
    if (!q) return
    if (onResults) {
      setSearchingState(true)
      try {
        const body: Record<string, string> = { message: q }
        if (databaseIds?.length === 1) body.databaseId = databaseIds[0]
        const res = await fetch('/api/scout-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        onResults(data.results ?? [], q)
      } catch { /* ignore */ } finally {
        setSearchingState(false)
      }
    } else {
      const params = new URLSearchParams()
      params.set('q', q)
      if (databaseIds && databaseIds.length > 0) params.set('databaseIds', databaseIds.join(','))
      router.push(`/scout-search?${params}`)
    }
  }

  const inner = (
    <>
      <div className="relative flex items-center gap-2 flex-1 rounded-lg px-3 py-1.5"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
        <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 3C9.23 3 6.19 5.95 6 9.66L4.08 12.19C3.84 12.5 4.08 13 4.5 13H6v3c0 1.1.9 2 2 2h1v3h7v-4.68C18.62 15.38 20 13.38 20 11c0-4.42-3.58-8-7-8zm.08 9.41l-.93-1.57c-.14-.23-.42-.3-.65-.15-.22.14-.29.42-.15.65l.92 1.56C11.8 13.3 11.4 14 11.4 14h1.2c0-.11-.03-.22-.08-.31l-.42-.71.98.41V13h-1v-.59zM11 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Scout AI — describe the player you are looking for"
          className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>
      {value.trim() && (
        <button
          onClick={submit}
          disabled={searching}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs disabled:opacity-50"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--input-border)' }}
          onMouseEnter={e => { if (!searching) { e.currentTarget.style.borderColor = '#00c896'; e.currentTarget.style.color = '#00c896' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          {searching
            ? <><div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />Searching…</>
            : <>Search <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></>
          }
        </button>
      )}
    </>
  )

  if (bare) return <div className="flex items-center gap-2 w-full">{inner}</div>

  return (
    <div className="relative flex items-center gap-2 rounded-xl border px-3 py-2 mb-3"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
      {inner}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--border)' }}>
      <p className="text-sm" style={{ color: 'var(--text-faint)' }}>{message}</p>
    </div>
  )
}

function ProgressBar() {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', width: '45%', height: '100%',
        background: 'linear-gradient(90deg, transparent, #00c896, rgba(0,200,150,0.4))',
        animation: 'sl-progress 1.4s ease-in-out infinite',
      }} />
    </div>
  )
}

