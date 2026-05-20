'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SearchAllLists from './SearchAllLists'
import CreateDatabaseButton from './CreateDatabaseButton'
import ImportDatabasesButton from './ImportDatabasesButton'
import ColumnPicker from './[id]/ColumnPicker'
import AddPlayerButton from './[id]/AddPlayerButton'
import EditPlayerModal, { type SavedPlayerFields } from './EditPlayerModal'
import CreateReportModal, { type PlayerSnapshot } from './CreateReportModal'
import { loadActive, loadCustomActive } from '@/app/(dashboard)/search/SearchParamsPanel'

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
      style={{ color: active ? '#00c896' : 'var(--text-faint)' }}
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

function AIResultsPanel({ results, query, onCreateReport, onClose }: {
  results: AIResult[]
  query: string
  onCreateReport?: (players: PlayerSnapshot[]) => void
  onClose: () => void
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
          return (
            <div key={r.player.id}
              className="flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors"
              style={{ borderColor: 'var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}30` }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/databases/${r.player.databaseId}/players/${r.player.id}`}
                    className="text-sm font-medium hover:text-[#00c896] transition-colors"
                    style={{ color: 'var(--text-primary)' }}>
                    {r.player.firstName} {r.player.lastName}
                  </Link>
                  {r.player.position && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>
                      {r.player.position}
                    </span>
                  )}
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

function InlinePlayersTable({ databaseIds, allDbs, onCreateReport }: { databaseIds: string[]; allDbs: DbItem[]; onCreateReport?: (players: PlayerSnapshot[]) => void }) {
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
  const [editingPlayer, setEditingPlayer] = useState<PlayerRow | null>(null)

  const [fallbackCols] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return TABLE_COLS
    return new Set([...loadActive(), ...loadCustomActive()].filter(k => TABLE_COLS.has(k)))
  })

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1)
    window.addEventListener('scoutlink:player-added', handler)
    return () => window.removeEventListener('scoutlink:player-added', handler)
  }, [])

  useEffect(() => {
    setLoading(true)
    setPlayers(null)
    setColumnConfig(null)
    setAvailOverride({})
    const url = isMulti
      ? `/api/players?databaseIds=${databaseIds.join(',')}`
      : `/api/databases/${databaseIds[0]}/players`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players ?? [])
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

  function handlePlayerSaved(updated: SavedPlayerFields) {
    if (!editingPlayer) return
    setPlayers(prev => prev
      ? prev.map(p => p.id === editingPlayer.id ? { ...p, ...updated } : p)
      : prev
    )
    setAvailOverride(prev => { const next = { ...prev }; delete next[editingPlayer.id]; return next })
    setEditingPlayer(null)
  }

  const show = (key: string) => columnConfig !== null ? columnConfig.includes(key) : fallbackCols.has(key)
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

  if (loading) {
    return (
      <div className="rounded-2xl border flex items-center justify-center py-16" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No players in this list yet.</p>
      </div>
    )
  }

  const thProps = { current: sortKey, dir: sortDir, onSort: handleSort }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: '#00c896', fontWeight: 700 }}>{players.length}</span> player{players.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          {onCreateReport && players && players.length > 0 && (
            <button
              onClick={() => onCreateReport(players.map(rowToSnapshot))}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(255,159,67,0.1)', color: '#ff9f43', border: '1px solid rgba(255,159,67,0.25)' }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Create Report
            </button>
          )}
          {!isMulti && singleId && (
            <ColumnPicker databaseId={singleId} columnConfig={columnConfig} onUpdate={setColumnConfig} />
          )}
          {!isMulti && singleId && (
            <AddPlayerButton databaseId={singleId} />
          )}
        </div>
      </div>

      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          singleId={singleId}
          onClose={() => setEditingPlayer(null)}
          onSaved={handlePlayerSaved}
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 500 }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {isMulti && <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>List</th>}
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
            {sorted.map(p => {
              const cf = (key: string) => p.customFields.find(f => f.fieldName === key)?.value ?? ''
              const age = calcAge(p.dateOfBirth)
              const contractYear = (() => {
                const val = cf('contractExpiry')
                if (!val) return null
                const d = new Date(val)
                return isNaN(d.getTime()) ? null : d.getFullYear()
              })()
              const wages = (() => { const n = parseFloat(cf('fmWages')); return isNaN(n) ? null : n })()
              return (
                <tr key={p.id} className="border-b last:border-0 transition-colors group"
                  style={{ borderColor: 'var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

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
                    <Link href={`/databases/${p.databaseId ?? singleId}/players/${p.id}`} className="flex items-center gap-2.5 group">
                      <RowAvatar player={p} />
                      <div className="min-w-0">
                        {(() => {
                          const fullName = `${p.firstName} ${p.lastName}`
                          return (
                            <p className="text-sm font-medium truncate transition-colors group-hover:text-[#00c896]"
                              title={fullName.length > 30 ? fullName : undefined}
                              style={{ color: 'var(--text-primary)' }}>
                              {trunc(fullName)}
                            </p>
                          )
                        })()}
                        {!(availOverride[p.id] ?? p.available) && !show('availability') && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Unavailable</span>
                        )}
                      </div>
                    </Link>
                  </td>

                  {show('availability') && (() => {
                    const isAvail = availOverride[p.id] ?? p.available
                    return (
                      <td className="px-4 py-2.5">
                        <button
                          onClick={e => { e.stopPropagation(); toggleAvailable(p) }}
                          className="text-[11px] px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer"
                          style={isAvail
                            ? { background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.3)' }
                            : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                          title="Click to toggle availability"
                        >
                          {isAvail ? 'Available' : 'Not Available'}
                        </button>
                      </td>
                    )
                  })()}

                  {show('position') && (
                    <td className="px-4 py-2.5">
                      {p.position
                        ? <span className="text-[11px] px-1.5 py-0.5 rounded-full" title={p.position.length > 30 ? p.position : undefined} style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>{trunc(p.position)}</span>
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
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); setEditingPlayer(p) }}
                          className="w-6 h-6 flex items-center justify-center rounded-md"
                          style={{ background: 'rgba(108,143,255,0.08)', color: '#6c8fff' }}
                          title="Edit player"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
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
}: {
  ownedDbs: DbItem[]
  sharedDbs: DbItem[]
  importableDatabases: { id: string; name: string }[]
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
  const router = useRouter()

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

  function openReport(players: PlayerSnapshot[]) {
    setReportData({ players, databaseId: selectedDbId, databaseName: selectedDbName })
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="mr-auto">
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Players Watch List</h1>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Manage your scouting lists</p>
        </div>
        {canDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            Delete List
          </button>
        )}
        <ImportDatabasesButton databases={importableDatabases} />
        <CreateDatabaseButton />
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

      {/* Unified scope + search panel */}
      <div className="rounded-2xl border mb-4 overflow-visible" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>

        {/* Row 1 — List selector */}
        <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b" style={{ background: 'var(--subtle-bg)', borderColor: 'var(--border)', borderRadius: '1rem 1rem 0 0' }}>
          <span className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1" style={{ color: 'var(--text-faint)' }}>List</span>
          <button
            onClick={() => setSelectedIds([])}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={isAllLists ? {
              background: '#00c896', color: '#000', boxShadow: '0 2px 8px rgba(0,200,150,0.35)',
            } : {
              background: 'var(--card-bg)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
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
                  background: '#00c896', color: '#000', boxShadow: '0 2px 8px rgba(0,200,150,0.35)',
                } : {
                  background: 'var(--card-bg)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {trunc(db.name, 24)}
                <span className="ml-1.5 opacity-50">{db.playerCount}</span>
              </button>
            )
          })}
        </div>

        {/* Row 2 — AI search */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0 w-6 text-center" style={{ color: '#00c896' }}>AI</span>
          <ScoutAIBar bare databaseIds={isAllLists ? undefined : selectedIds} onResults={(results, query) => { setAiResults(results); setAiQuery(query) }} />
        </div>

        {/* Row 3 — Filter / keyword search */}
        <div className="px-4 py-2.5">
          <div className="flex items-start gap-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0 w-6 text-center mt-2" style={{ color: 'var(--text-faint)' }}>🔍</span>
            <div className="flex-1 min-w-0">
              <SearchAllLists bare databaseIds={isAllLists ? undefined : selectedIds} onCreateReport={openReport} onActiveChange={setFilterActive} />
            </div>
          </div>
        </div>

      </div>

      {/* AI results */}
      {aiResults && aiResults.length > 0 && (
        <AIResultsPanel
          results={aiResults}
          query={aiQuery}
          onCreateReport={openReport}
          onClose={() => setAiResults(null)}
        />
      )}

      {/* Player table — hidden while a search is active */}
      {!filterActive && !(aiResults && aiResults.length > 0) && (
        allDbs.length === 0
          ? <EmptyState message="You haven't created any lists yet." />
          : <InlinePlayersTable
              databaseIds={isAllLists ? allDbs.map(d => d.id) : selectedIds}
              allDbs={allDbs}
              onCreateReport={openReport}
            />
      )}

      {/* Create Report modal */}
      {reportData && (
        <CreateReportModal
          players={reportData.players}
          databaseId={reportData.databaseId}
          databaseName={reportData.databaseName}
          onClose={() => setReportData(null)}
        />
      )}
    </>
  )
}

function DatabaseCard({ id, name, playerCount, sharedWith, permission, ownerName, createdAt }: DbItem) {
  const isOwner = permission === 'owner'
  const color = isOwner ? '#00c896' : '#6c8fff'
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    await fetch(`/api/databases/${id}`, { method: 'DELETE' })
    window.dispatchEvent(new Event('scoutlink:db-deleted'))
    router.refresh()
  }

  return (
    <div className="relative group">
      <a
        href={`/databases/${id}`}
        className="block rounded-2xl border border-white/5 p-5 transition-all duration-200 hover:border-white/10 hover:scale-[1.01]"
        style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={color}>
              <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4S4 11.21 4 9zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] px-2 py-1 rounded-full font-medium uppercase tracking-wide"
              style={{ background: `${color}15`, color }}
            >
              {isOwner ? 'Owner' : permission}
            </span>
            {isOwner && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(true) }}
                className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                title="Delete list"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <h3 className="text-base font-semibold text-white mb-1 truncate">{name}</h3>
        {ownerName && <p className="text-xs text-white/30 mb-3">by {ownerName}</p>}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          <div>
            <p className="text-xl font-bold text-white">{playerCount}</p>
            <p className="text-[10px] text-white/30">Players</p>
          </div>
          {isOwner && sharedWith > 0 && (
            <div>
              <p className="text-xl font-bold text-white">{sharedWith}</p>
              <p className="text-[10px] text-white/30">Shared</p>
            </div>
          )}
          <div className="ml-auto">
            <p className="text-[10px] text-white/20">{new Date(createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </a>

      {confirming && (
        <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 p-5 z-10"
          style={{ background: 'rgba(10,12,18,0.97)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p className="text-sm font-semibold text-center" style={{ color: '#ffffff' }}>Delete &ldquo;{name}&rdquo;?</p>
          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.65)' }}>All {playerCount} players will be permanently removed.</p>
          <div className="flex gap-2">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(false) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoutAIBar({ databaseIds, bare, onResults }: {
  databaseIds?: string[]
  bare?: boolean
  onResults?: (results: AIResult[], query: string) => void
}) {
  const [value, setValue] = useState('')
  const [searching, setSearching] = useState(false)
  const router = useRouter()

  async function submit() {
    const q = value.trim()
    if (!q) return
    if (onResults) {
      setSearching(true)
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
        setSearching(false)
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
    <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
      <p className="text-white/30 text-sm">{message}</p>
    </div>
  )
}
