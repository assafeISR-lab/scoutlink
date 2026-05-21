'use client'

import { useState, useEffect, useRef } from 'react'
import FMRadarChart from '@/components/FMRadarChart'
import LinkChips from '@/components/LinkChips'
import FMAttributesEditor from '@/components/FMAttributesEditor'
import { SeasonStatsEditor } from '@/components/SeasonStatsGrid'
import HeatmapDisplay from '@/components/HeatmapDisplay'
import { positionPillStyle } from '@/lib/positionColor'

// ── Types ─────────────────────────────────────────────────────────────────────

type Note = { id: string; content: string; createdAt: string; agent: { id: string; fullName: string } }
type FieldSource = { id: string; fieldName: string; sourceName: string; sourceUrl: string | null; isActive: boolean }
type CustomField = { id: string; fieldName: string; value: string }

type FullPlayer = {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  position: string | null
  nationality: string | null
  dateOfBirth: string | null
  heightCm: number | null
  clubName: string | null
  marketValue: number | null
  agentName: string | null
  playsNational: boolean
  available: boolean
  createdAt: string
  fieldSources: FieldSource[]
  customFields: CustomField[]
  notes: Note[]
  addedBy: { fullName: string }
}

// ── Prefetch cache ─────────────────────────────────────────────────────────────

type CachedPlayer = { player: FullPlayer; canWrite: boolean; currentUserId: string }
const playerCache = new Map<string, CachedPlayer>()

function setCacheEntry(key: string, d: CachedPlayer) {
  playerCache.set(key, d)
  if (playerCache.size > 20) {
    const oldest = playerCache.keys().next().value
    if (oldest) playerCache.delete(oldest)
  }
}

export function prefetchPlayer(dbId: string, playerId: string) {
  const key = `${dbId}:${playerId}`
  if (playerCache.has(key)) return
  fetch(`/api/databases/${dbId}/players/${playerId}`)
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d) setCacheEntry(key, d) })
    .catch(() => {})
}

type InitialPlayerData = {
  id: string; firstName: string; middleName?: string | null; lastName: string
  position: string | null; clubName: string | null; nationality: string | null
  agentName?: string | null; dateOfBirth: string | null; heightCm: number | null
  marketValue: number | null; available: boolean; playsNational?: boolean
  customFields: { fieldName: string; value: string }[]
}

function buildInitialPlayer(p: InitialPlayerData): FullPlayer {
  return {
    id: p.id, firstName: p.firstName, middleName: p.middleName ?? null,
    lastName: p.lastName, position: p.position, nationality: p.nationality,
    dateOfBirth: p.dateOfBirth, heightCm: p.heightCm, clubName: p.clubName,
    marketValue: p.marketValue, agentName: p.agentName ?? null,
    playsNational: p.playsNational ?? false, available: p.available,
    createdAt: new Date().toISOString(), fieldSources: [],
    customFields: p.customFields as CustomField[], notes: [], addedBy: { fullName: '' },
  }
}

// ── Outer loader ──────────────────────────────────────────────────────────────

export default function PlayerPanelCard({ playerId, dbId, initialPlayer, initialCanWrite = false, onDeleted, triggerAction, onTriggerHandled, onLoaded, onSaveComplete, flushRef, onDirtyChange }: {
  playerId: string
  dbId: string
  initialPlayer?: InitialPlayerData
  initialCanWrite?: boolean
  onDeleted?: () => void
  triggerAction?: 'report' | 'delete' | null
  onTriggerHandled?: () => void
  onLoaded?: (canWrite: boolean) => void
  onSaveComplete?: () => void
  flushRef?: { current: (() => Promise<void>) | undefined }
  onDirtyChange?: (dirty: boolean) => void
}) {
  const cacheKey = `${dbId}:${playerId}`
  const cached = playerCache.get(cacheKey)

  const [data, setData] = useState<CachedPlayer | null>(
    cached ?? (initialPlayer ? { player: buildInitialPlayer(initialPlayer), canWrite: initialCanWrite, currentUserId: '' } : null)
  )
  const [loading, setLoading] = useState(!cached && !initialPlayer)
  const [notesLoading, setNotesLoading] = useState(!cached)
  const [error, setError] = useState(false)

  useEffect(() => {
    const key = `${dbId}:${playerId}`
    const hit = playerCache.get(key)

    if (hit) {
      setData(hit)
      setLoading(false)
      setNotesLoading(false)
      onLoaded?.(hit.canWrite)
      return
    }

    if (initialPlayer) {
      setData({ player: buildInitialPlayer(initialPlayer), canWrite: initialCanWrite, currentUserId: '' })
      setLoading(false)
    } else {
      setLoading(true)
      setData(null)
    }
    setNotesLoading(true)
    setError(false)

    fetch(`/api/databases/${dbId}/players/${playerId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setCacheEntry(`${dbId}:${playerId}`, d)
        setData(d)
        setLoading(false)
        setNotesLoading(false)
        onLoaded?.(d.canWrite)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [playerId, dbId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Failed to load player data.</p>
      </div>
    )
  }

  return (
    <PlayerPanelCardInner
      player={data.player}
      dbId={dbId}
      canWrite={data.canWrite}
      currentUserId={data.currentUserId}
      notesLoading={notesLoading}
      onDeleted={onDeleted}
      triggerAction={triggerAction}
      onTriggerHandled={onTriggerHandled}
      onSaveComplete={onSaveComplete}
      flushRef={flushRef}
      onDirtyChange={onDirtyChange}
    />
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const POSITION_ALIASES: Record<string, string> = {
  DC: 'Centre-Back', CB: 'Centre-Back',
  RB: 'Right-Back', LB: 'Left-Back',
  RWB: 'Right Wing-Back', LWB: 'Left Wing-Back',
}
const displayPos = (pos: string | null) => pos ? (POSITION_ALIASES[pos.toUpperCase()] ?? pos) : null

const toDateStr = (d: string | null) => {
  if (!d) return ''
  try { return new Date(d).toISOString().split('T')[0] } catch { return '' }
}

const fmtDate = (s: string | null | undefined): string | null => {
  if (!s) return null
  try { return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return null }
}

function calcAge(dob: string | null): string | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  return ((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Main card ─────────────────────────────────────────────────────────────────

function PlayerPanelCardInner({ player, dbId, canWrite, currentUserId, notesLoading, onDeleted, triggerAction, onTriggerHandled, onSaveComplete, flushRef, onDirtyChange }: {
  player: FullPlayer; dbId: string; canWrite: boolean; currentUserId: string; notesLoading?: boolean; onDeleted?: () => void
  triggerAction?: 'report' | 'delete' | null
  onTriggerHandled?: () => void
  onSaveComplete?: () => void
  flushRef?: { current: (() => Promise<void>) | undefined }
  onDirtyChange?: (dirty: boolean) => void
}) {
  const cf = (name: string) => player.customFields.find(f => f.fieldName === name)?.value ?? ''
  const isManual = (fieldName: string) =>
    player.fieldSources.some(s => s.fieldName === fieldName && s.isActive && s.sourceName === 'manual')
  const cfHas = (name: string) => !!cf(name)

  // ── Form state ────────────────────────────────────────────────────────────
  const [available,          setAvailable]          = useState(player.available)
  const [position,           setPosition]           = useState(player.position ?? '')
  const [heightCm,           setHeightCm]           = useState(player.heightCm?.toString() ?? '')
  const [dateOfBirth,        setDateOfBirth]        = useState(toDateStr(player.dateOfBirth))
  const [nationality,        setNationality]        = useState(player.nationality ?? '')
  const [foot,               setFoot]               = useState(cf('foot'))
  const [passports,          setPassports]          = useState(cf('passports'))
  const [playerPhone,        setPlayerPhone]        = useState(cf('playerPhone'))
  const [clubName,           setClubName]           = useState(player.clubName ?? '')
  const [league,             setLeague]             = useState(cf('league'))
  const [joiningDate,        setJoiningDate]        = useState(cf('joiningDate'))
  const [contractExpiry,     setContractExpiry]     = useState(cf('contractExpiry'))
  const [marketValue,        setMarketValue]        = useState(
    player.marketValue != null ? (player.marketValue / 1_000_000).toFixed(2).replace(/\.?0+$/, '') : ''
  )
  const [fmWages,            setFmWages]            = useState(cf('fmWages'))
  const [transferFeeExpect,  setTransferFeeExpect]  = useState(cf('transferFeeExpect'))
  const [transferFeeReal,    setTransferFeeReal]    = useState(cf('transferFeeReal'))
  const [salaryExpect,       setSalaryExpect]       = useState(cf('salaryExpect'))
  const [salaryReal,         setSalaryReal]         = useState(cf('salaryReal'))
  const [agentName,          setAgentName]          = useState(player.agentName ?? '')
  const [agentPhone,         setAgentPhone]         = useState(cf('agentPhone'))
  const [sentBy,             setSentBy]             = useState(cf('sentBy'))
  const [recentForm,         setRecentForm]         = useState(cf('recentForm'))
  const [playsNational,      setPlaysNational]      = useState(player.playsNational)
  const [transfermarktUrl,   setTransfermarktUrl]   = useState(
    cf('transfermarktUrl') || player.fieldSources.find(s => s.sourceName === 'Transfermarkt' && s.isActive)?.sourceUrl || ''
  )
  const [sofascoreUrl,       setSofascoreUrl]       = useState(
    cf('sofascoreUrl') || player.fieldSources.find(s => s.sourceName === 'Sofascore' && s.isActive)?.sourceUrl || ''
  )
  const [fmInsideUrl,        setFmInsideUrl]        = useState(cf('fmInsideUrl'))
  const [instagram,          setInstagram]          = useState(cf('instagram'))
  const [twitter,            setTwitter]            = useState(cf('twitter'))
  const [tiktok,             setTiktok]             = useState(cf('tiktok'))
  const [highlights,         setHighlights]         = useState(cf('highlights'))
  const [description,        setDescription]        = useState(cf('description'))
  const [fmAttributes,       setFmAttributes]       = useState(cf('fmAttributes'))
  const [seasonStats,        setSeasonStats]        = useState(cf('seasonStats') || '{"seasons":[]}')
  const [localActiveFm,      setLocalActiveFm]      = useState(false)

  // Refs to avoid stale closures in deferred callbacks
  const fmAttributesRef = useRef(fmAttributes)
  const seasonStatsRef  = useRef(seasonStats)

  // Notes — may start empty (phase-1 load from list data) and sync when full data arrives
  const [notes,       setNotes]       = useState<Note[]>(player.notes)
  const notesSynced = useRef(player.notes.length > 0)
  useEffect(() => {
    if (!notesSynced.current && player.notes.length > 0) {
      notesSynced.current = true
      setNotes(player.notes)
    }
  }, [player.notes.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync fieldSource-derived URLs when phase-2 data arrives
  useEffect(() => {
    if (player.fieldSources.length > 0) {
      const tmUrl = player.fieldSources.find(s => s.sourceName === 'Transfermarkt' && s.isActive)?.sourceUrl
      if (tmUrl && !transfermarktUrl) setTransfermarktUrl(tmUrl)
      const ssUrl = player.fieldSources.find(s => s.sourceName === 'Sofascore' && s.isActive)?.sourceUrl
      if (ssUrl && !sofascoreUrl) setSofascoreUrl(ssUrl)
    }
  }, [player.fieldSources.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const [noteAdding,  setNoteAdding]  = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving,  setNoteSaving]  = useState(false)

  // Report modal
  const [reportOpen,    setReportOpen]    = useState(false)
  const [reportName,    setReportName]    = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError,   setReportError]   = useState('')

  // Delete modal
  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError,   setDeleteError]   = useState('')

  // Deferred-save state
  const [isDirty,       setIsDirty]       = useState(false)
  const isDirtyRef      = useRef(false)
  const dirtyDbRef      = useRef<Set<string>>(new Set())
  const dirtyCustomRef  = useRef<Set<string>>(new Set())

  // Respond to external trigger (buttons in outer panel header)
  useEffect(() => {
    if (triggerAction === 'report') { setReportOpen(true); setReportName(''); setReportError(''); onTriggerHandled?.() }
    else if (triggerAction === 'delete') { setDeleteOpen(true); setDeleteError(''); onTriggerHandled?.() }
  }, [triggerAction]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save helpers ──────────────────────────────────────────────────────────
  function notifyList() {
    window.dispatchEvent(new CustomEvent('scoutlink:player-added'))
  }

  function markDirty(dbField?: string, customField?: string) {
    if (dbField) dirtyDbRef.current.add(dbField)
    if (customField) dirtyCustomRef.current.add(customField)
    if (!isDirtyRef.current) {
      isDirtyRef.current = true
      setIsDirty(true)
      onDirtyChange?.(true)
    }
  }

  async function flush() {
    if (!canWrite || !isDirtyRef.current) return

    // Build DB field patch (only dirty DB fields)
    const dbPatch: Record<string, unknown> = {}
    if (dirtyDbRef.current.has('position'))    dbPatch.position    = position
    if (dirtyDbRef.current.has('clubName'))     dbPatch.clubName    = clubName
    if (dirtyDbRef.current.has('nationality'))  dbPatch.nationality = nationality
    if (dirtyDbRef.current.has('agentName'))    dbPatch.agentName   = agentName
    if (dirtyDbRef.current.has('dateOfBirth'))  dbPatch.dateOfBirth = dateOfBirth || null
    if (dirtyDbRef.current.has('heightCm'))     dbPatch.heightCm    = heightCm || null
    if (dirtyDbRef.current.has('marketValue'))  dbPatch.marketValue = marketValue || null
    if (dirtyDbRef.current.has('playsNational')) dbPatch.playsNational = playsNational
    if (dirtyDbRef.current.has('available'))    dbPatch.available   = available

    // Build custom field patch (only dirty custom fields)
    const allCustomValues: Record<string, string> = {
      foot, passports, playerPhone,
      league, joiningDate, contractExpiry,
      fmWages, transferFeeExpect, transferFeeReal, salaryExpect, salaryReal,
      agentPhone, sentBy, recentForm, description,
      transfermarktUrl, sofascoreUrl, fmInsideUrl,
      instagram, twitter, tiktok, highlights,
      fmAttributes: fmAttributesRef.current,
      seasonStats: seasonStatsRef.current,
    }
    const customFields: Record<string, string> = {}
    for (const key of dirtyCustomRef.current) {
      if (key in allCustomValues) customFields[key] = allCustomValues[key]
    }

    await fetch(`/api/databases/${dbId}/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...dbPatch,
        changedFields: Array.from(dirtyDbRef.current),
        ...(Object.keys(customFields).length > 0 ? { customFields } : {}),
      }),
    }).catch(() => {})

    dirtyDbRef.current.clear()
    dirtyCustomRef.current.clear()
    isDirtyRef.current = false
    setIsDirty(false)
    onDirtyChange?.(false)
    playerCache.delete(`${dbId}:${player.id}`)
    onSaveComplete?.()
    notifyList()
  }

  // Keep flushRef pointing at the latest flush so the parent always has current state
  useEffect(() => { if (flushRef) flushRef.current = flush })

  function toggleAvailable() {
    const next = !available
    setAvailable(next)
    markDirty('available')
  }

  async function addNote() {
    if (!noteContent.trim()) return
    setNoteSaving(true)
    try {
      const res = await fetch(`/api/databases/${dbId}/players/${player.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent.trim() }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes(prev => [{ id: note.id, content: note.content, createdAt: note.createdAt, agent: note.agent }, ...prev])
        setNoteContent('')
        setNoteAdding(false)
      }
    } finally {
      setNoteSaving(false)
    }
  }

  async function createReport() {
    if (!reportName.trim()) { setReportError('Report name is required'); return }
    setReportLoading(true)
    setReportError('')
    const age = calcAge(dateOfBirth || player.dateOfBirth)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName.trim(),
          databaseId: dbId,
          databaseName: '',
          players: [{
            id: player.id,
            name: fullName,
            position: position || player.position,
            clubName: clubName || player.clubName,
            nationality: nationality || player.nationality,
            age: age ? Math.floor(parseFloat(age)) : null,
            heightCm: heightCm ? parseFloat(heightCm) : player.heightCm,
            marketValue: marketValue ? parseFloat(marketValue) * 1_000_000 : player.marketValue,
            agentName: agentName || player.agentName,
            fmAttributes: fmAttributes || null,
            playsNational: playsNational,
            notes: notes.map(n => ({ content: n.content, createdAt: n.createdAt, agentName: n.agent.fullName })),
          }],
        }),
      })
      if (res.ok) {
        setReportOpen(false)
        window.location.href = '/reports'
      } else {
        const data = await res.json().catch(() => ({}))
        setReportError(data.error || 'Something went wrong')
        setReportLoading(false)
      }
    } catch {
      setReportError('Network error — please try again')
      setReportLoading(false)
    }
  }

  async function deletePlayer() {
    setDeleteLoading(true)
    setDeleteError('')
    const res = await fetch(`/api/databases/${dbId}/players/${player.id}`, { method: 'DELETE' })
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('scoutlink:player-added'))
      onDeleted?.()
    } else {
      const data = await res.json().catch(() => ({}))
      setDeleteError(data.error || 'Something went wrong')
      setDeleteLoading(false)
    }
  }

  const age       = calcAge(dateOfBirth || player.dateOfBirth)
  const fullName  = [player.firstName, player.middleName, player.lastName].filter(Boolean).join(' ')
  const dateAdded = new Date(player.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const photoUrl  = cf('photo')

  return (
    <div className="px-4 pt-4 pb-8 flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {/* Row 1: photo + name + availability */}
        <div className="flex items-start gap-3 mb-2">
          <div
            className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={photoUrl
              ? { border: '1px solid var(--border)' }
              : { background: 'linear-gradient(135deg, #00c896, #00a878)', boxShadow: '0 0 12px rgba(0,200,150,0.25)' }}
          >
            {photoUrl
              ? <img src={photoUrl} alt={fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <span className="text-lg font-bold text-black">{player.firstName[0]}{player.lastName[0]}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight mb-1" style={{ fontSize: 16, color: 'var(--text-primary)' }}>{fullName}</p>
            <div className="flex items-center flex-wrap" style={{ gap: '3px 6px' }}>
              {position && (() => {
                const pos = displayPos(position)
                const s = positionPillStyle(pos)
                return s
                  ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={s}>{pos}</span>
                  : <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{pos}</span>
              })()}
              {clubName && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{clubName}</span>}
              {nationality && <><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>·</span><span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{nationality}</span></>}
              {age && <><span style={{ color: 'var(--text-faint)', fontSize: 11 }}>·</span><span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{age}y</span></>}
            </div>
          </div>
          <button
            onClick={canWrite ? toggleAvailable : undefined}
            disabled={!canWrite}
            className="text-[11px] px-2 py-0.5 rounded font-medium tracking-wider uppercase flex-shrink-0"
            style={available
              ? { background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.3)', cursor: canWrite ? 'pointer' : 'default' }
              : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', cursor: canWrite ? 'pointer' : 'default' }}
            onMouseEnter={e => { if (canWrite) e.currentTarget.style.opacity = '0.7' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {available ? 'Available' : 'Not Avail.'}
          </button>
        </div>

      </div>

      {/* ── Create Report modal ── */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setReportOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,159,67,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,159,67,0.12)', border: '1px solid rgba(255,159,67,0.25)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ff9f43"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            </div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Create Player Report</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>
              Saving full profile + {notes.length} note{notes.length !== 1 ? 's' : ''} for <span style={{ color: 'var(--text-muted)' }}>{fullName}</span>
            </p>
            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Report Name *</label>
              <input
                autoFocus
                value={reportName}
                onChange={e => { setReportName(e.target.value); setReportError('') }}
                onKeyDown={e => e.key === 'Enter' && createReport()}
                placeholder={`${fullName} — ${new Date().toLocaleDateString()}`}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#ff9f43' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>
            {reportError && <p className="text-xs mb-3" style={{ color: '#ef4444' }}>{reportError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setReportOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>Cancel</button>
              <button
                onClick={createReport}
                disabled={reportLoading || !reportName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #ff9f43, #f38b2a)', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,159,67,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
              >
                {reportLoading ? 'Creating…' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => !deleteLoading && setDeleteOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid rgba(239,68,68,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ef4444"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </div>
            <h2 className="text-lg font-semibold text-center mb-2" style={{ color: 'var(--text-primary)' }}>Delete Player</h2>
            <p className="text-sm text-center mb-1" style={{ color: 'var(--text-muted)' }}>Are you sure you want to delete</p>
            <p className="text-sm font-semibold text-center mb-3" style={{ color: 'var(--text-primary)' }}>"{fullName}"?</p>
            <p className="text-xs text-center mb-6" style={{ color: 'var(--text-faint)' }}>This cannot be undone. All player data, notes, and history will be permanently removed.</p>
            {deleteError && <p className="text-xs text-center mb-4" style={{ color: '#ef4444' }}>{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteOpen(false)} disabled={deleteLoading} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>Cancel</button>
              <button
                onClick={deletePlayer}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
              >
                {deleteLoading ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Source chips ── */}
      <LinkChips canEdit={canWrite} links={[
        { label: 'Transfermarkt', value: transfermarktUrl, onChange: setTransfermarktUrl, onBlur: () => markDirty(undefined, 'transfermarktUrl') },
        { label: 'Sofascore',     value: sofascoreUrl,     onChange: setSofascoreUrl,     onBlur: () => markDirty(undefined, 'sofascoreUrl') },
        { label: 'FMInside',      value: fmInsideUrl,      onChange: setFmInsideUrl,      onBlur: () => markDirty(undefined, 'fmInsideUrl') },
        { label: 'Instagram',     value: instagram,         onChange: setInstagram,         onBlur: () => markDirty(undefined, 'instagram') },
        { label: 'Twitter / X',   value: twitter,           onChange: setTwitter,           onBlur: () => markDirty(undefined, 'twitter') },
        { label: 'TikTok',        value: tiktok,            onChange: setTiktok,            onBlur: () => markDirty(undefined, 'tiktok') },
        { label: 'Highlights',    value: highlights,         onChange: setHighlights,         onBlur: () => markDirty(undefined, 'highlights') },
      ]} />

      {/* ── 3-column body ── */}
      <div className="grid grid-cols-3 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>

        {/* Physical */}
        <div className="p-3" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Physical</p>
          <Row label="Position"      display={displayPos(position || player.position || '')} manual={isManual('position')}   inputValue={position}    onChange={setPosition}    onSave={canWrite ? () => markDirty('position')    : undefined} />
          <Row label="Height"        display={heightCm ? `${heightCm} cm` : null}             manual={isManual('heightCm')}   inputValue={heightCm}    onChange={setHeightCm}    onSave={canWrite ? () => markDirty('heightCm')    : undefined} inputType="number" />
          <Row label="Age"           display={age ? `${age} yrs` : null}                      inputValue={dateOfBirth} onChange={setDateOfBirth} onSave={canWrite ? () => markDirty('dateOfBirth') : undefined} inputType="date" />
          <Row label="Date of Birth" display={fmtDate(dateOfBirth)}                           manual={isManual('dateOfBirth')} inputValue={dateOfBirth} onChange={setDateOfBirth} onSave={canWrite ? () => markDirty('dateOfBirth') : undefined} inputType="date" />
          <Row label="Foot"          display={foot || null}                                    manual={cfHas('foot')}          inputValue={foot}        onChange={setFoot}        onSave={canWrite ? () => markDirty(undefined, 'foot')        : undefined} />
          <Row label="Nationality"   display={nationality || null}                             manual={isManual('nationality')} inputValue={nationality} onChange={setNationality} onSave={canWrite ? () => markDirty('nationality')            : undefined} />
          <Row label="Passports"     display={passports || null}                               manual={cfHas('passports')}     inputValue={passports}   onChange={setPassports}   onSave={canWrite ? () => markDirty(undefined, 'passports')   : undefined} />
          <Row label="Player Phone"  display={playerPhone || null}                             manual={cfHas('playerPhone')}   inputValue={playerPhone} onChange={setPlayerPhone} onSave={canWrite ? () => markDirty(undefined, 'playerPhone') : undefined} />
        </div>

        {/* Contract & Value */}
        <div className="p-3" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Contract & Value</p>
          <Row label="Club"              display={clubName || null}          manual={isManual('clubName')}          inputValue={clubName}          onChange={setClubName}          onSave={canWrite ? () => markDirty('clubName')    : undefined} />
          <Row label="League"            display={league || null}            manual={cfHas('league')}               inputValue={league}            onChange={setLeague}            onSave={canWrite ? () => markDirty(undefined, 'league')              : undefined} />
          <Row label="Joining Date"      display={fmtDate(joiningDate)}      manual={cfHas('joiningDate')}          inputValue={joiningDate}        onChange={setJoiningDate}       onSave={canWrite ? () => markDirty(undefined, 'joiningDate')         : undefined} inputType="date" />
          <Row label="Contract Expiry"   display={fmtDate(contractExpiry)}   manual={cfHas('contractExpiry')}       inputValue={contractExpiry}     onChange={setContractExpiry}    onSave={canWrite ? () => markDirty(undefined, 'contractExpiry')      : undefined} inputType="date" />
          <Row label="Market Value"      display={marketValue ? `€${parseFloat(marketValue).toFixed(2)}m` : null} highlight manual={isManual('marketValue')} inputValue={marketValue} onChange={setMarketValue} onSave={canWrite ? () => markDirty('marketValue') : undefined} inputType="number" />
          <Row label="FM Wages"          display={fmWages || null}           manual={cfHas('fmWages')}              inputValue={fmWages}            onChange={setFmWages}           onSave={canWrite ? () => markDirty(undefined, 'fmWages')             : undefined} inputType="number" />
          <Row label="Fee Expectation"   display={transferFeeExpect || null} manual={cfHas('transferFeeExpect')}    inputValue={transferFeeExpect}  onChange={setTransferFeeExpect} onSave={canWrite ? () => markDirty(undefined, 'transferFeeExpect')   : undefined} />
          <Row label="Fee (Real)"        display={transferFeeReal || null}   manual={cfHas('transferFeeReal')}      inputValue={transferFeeReal}    onChange={setTransferFeeReal}   onSave={canWrite ? () => markDirty(undefined, 'transferFeeReal')     : undefined} />
          <Row label="Salary Expect."    display={salaryExpect || null}      manual={cfHas('salaryExpect')}         inputValue={salaryExpect}       onChange={setSalaryExpect}      onSave={canWrite ? () => markDirty(undefined, 'salaryExpect')        : undefined} />
          <Row label="Salary (Real)"     display={salaryReal || null}        manual={cfHas('salaryReal')}           inputValue={salaryReal}         onChange={setSalaryReal}        onSave={canWrite ? () => markDirty(undefined, 'salaryReal')          : undefined} />
        </div>

        {/* Scout Info */}
        <div className="p-3">
          <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Scout Info</p>
          <BoolRow label="Availability"   value={available}     onToggle={canWrite ? toggleAvailable : undefined} highlight trueLabel="Available" falseLabel="Not Avail." />
          <Row     label="Added"          display={dateAdded}   inputValue="" onChange={() => {}} />
          <Row     label="Scout"          display={player.addedBy.fullName} inputValue="" onChange={() => {}} />
          <Row     label="Referral"       display={sentBy || null}          manual={cfHas('sentBy')}    inputValue={sentBy}    onChange={setSentBy}    onSave={canWrite ? () => markDirty(undefined, 'sentBy')    : undefined} />
          <Row     label="Agent"          display={agentName || null}       manual={isManual('agentName')} inputValue={agentName} onChange={setAgentName} onSave={canWrite ? () => markDirty('agentName')             : undefined} />
          <Row     label="Agent Phone"    display={agentPhone || null}      manual={cfHas('agentPhone')} inputValue={agentPhone} onChange={setAgentPhone} onSave={canWrite ? () => markDirty(undefined, 'agentPhone') : undefined} />
          <BoolRow label="Plays National" value={playsNational} onToggle={canWrite ? () => { const n = !playsNational; setPlaysNational(n); markDirty('playsNational') } : undefined} neutral trueLabel="Yes" falseLabel="No" />
          <Row     label="Recent Form"    display={recentForm || null}      manual={cfHas('recentForm')} inputValue={recentForm} onChange={setRecentForm} onSave={canWrite ? () => markDirty(undefined, 'recentForm') : undefined} />
        </div>
      </div>

      {/* ── Description ── */}
      <DescRow value={description} onChange={setDescription} onSave={canWrite ? () => markDirty(undefined, 'description') : undefined} />

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-3 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>

        {/* Heat Map */}
        <div className="p-3 flex flex-col gap-2" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Heat Map</p>
          <HeatmapDisplay json={cf('heatmap') || null} />
        </div>

        {/* Season Stats */}
        <div className="p-3 flex flex-col gap-2" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Season Stats</p>
          <SeasonStatsEditor
            json={seasonStats}
            onChange={v => { setSeasonStats(v); seasonStatsRef.current = v }}
            onCellBlur={() => markDirty(undefined, 'seasonStats')}
          />
        </div>

        {/* FM Attributes */}
        <div className="p-3 flex flex-col gap-2">
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: localActiveFm ? 'rgba(0,200,150,0.8)' : 'var(--text-muted)' }}>FM Attributes</p>
          {localActiveFm ? (
            <FMAttributesEditor
              value={fmAttributes}
              onChange={v => { setFmAttributes(v); fmAttributesRef.current = v }}
              onBlur={() => { setLocalActiveFm(false); markDirty(undefined, 'fmAttributes') }}
              autoFocus
            />
          ) : (
            <div className={`group relative${canWrite ? ' cursor-text' : ''}`} onClick={() => { if (canWrite) setLocalActiveFm(true) }}>
              <FMRadarChart fmAttributes={fmAttributes} />
              {canWrite && fmAttributes && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#00c896"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Scout Notes ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4 py-2 border-b" style={{ background: 'var(--subtle-bg)', borderColor: 'var(--border)' }}>
          <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>
            Scout Notes {notes.length > 0 && <span style={{ color: '#00c896' }}>({notes.length})</span>}
          </p>
        </div>
        <div className="p-4">
          {notesLoading ? (
            <div className="flex items-center gap-2 py-1 mb-3">
              <div className="w-3 h-3 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Loading notes…</span>
            </div>
          ) : (
            <>
              {notes.length === 0 && !noteAdding && (
                <p className="text-sm mb-3" style={{ color: 'var(--text-faint)' }}>No notes yet.</p>
              )}
              {notes.length > 0 && (
                <div className="space-y-2.5 mb-3">
                  {notes.map(note => (
                    <NoteItem key={note.id} note={note} isOwn={note.agent.id === currentUserId} />
                  ))}
                </div>
              )}
            </>
          )}
          {canWrite && (
            noteAdding ? (
              <div className="flex flex-col gap-2">
                <textarea
                  autoFocus
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Add a scouting note…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
                  style={{ color: 'var(--text-primary)', background: 'var(--input-bg)', border: '1px solid var(--border)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#00c896' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addNote}
                    disabled={noteSaving || !noteContent.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-black disabled:opacity-50 transition-all"
                    style={{ background: '#00c896' }}
                  >
                    {noteSaving ? 'Saving…' : 'Add Note'}
                  </button>
                  <button
                    onClick={() => { setNoteAdding(false); setNoteContent('') }}
                    className="px-4 py-1.5 rounded-lg text-xs"
                    style={{ color: 'var(--text-muted)', background: 'var(--hover-bg)', border: '1px solid var(--border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setNoteAdding(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Add Note
              </button>
            )
          )}
        </div>
      </div>

    </div>
  )
}

// ── NoteItem ──────────────────────────────────────────────────────────────────

function NoteItem({ note, isOwn }: { note: Note; isOwn: boolean }) {
  const [editing,  setEditing]  = useState(false)
  const [content,  setContent]  = useState(note.content)
  const [loading,  setLoading]  = useState(false)

  async function handleSave() {
    if (!content.trim() || content === note.content) { setEditing(false); return }
    setLoading(true)
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).catch(() => {})
    setLoading(false)
    setEditing(false)
  }

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/notes/${note.id}`, { method: 'DELETE' }).catch(() => {})
    setLoading(false)
  }

  return (
    <div className="rounded-xl p-3 group" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus value={content} onChange={e => setContent(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid #00c896', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setContent(note.content) }} className="px-3 py-1 rounded-lg text-xs" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            <button onClick={handleSave} disabled={loading || !content.trim()} className="px-3 py-1 rounded-lg text-xs font-semibold text-black disabled:opacity-50" style={{ background: '#00c896' }}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{content}</p>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{note.agent.fullName} · {timeAgo(note.createdAt)}</p>
            {isOwn && (
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(true)} className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }} onMouseEnter={e => { e.currentTarget.style.color = '#00c896' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>Edit</button>
                <button onClick={handleDelete} disabled={loading} className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>Delete</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Row sub-components ────────────────────────────────────────────────────────

function Row({ label, display, manual = false, highlight = false, inputValue, onChange, inputType = 'text', onSave }: {
  label: string; display: string | null | undefined; manual?: boolean; highlight?: boolean
  inputValue: string; onChange: (v: string) => void; inputType?: string
  onSave?: (v: string) => void
}) {
  const hasValue  = display != null && display !== ''
  const isGreen   = highlight || manual
  const [active, setActive] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  useEffect(() => { if (active) inputRef.current?.focus() }, [active])

  if (active) {
    return (
      <div className="flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
        <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(0,200,150,0.8)' }}>{label}</span>
        <input
          ref={inputRef}
          type={inputType}
          value={inputValue}
          onChange={e => { onChange(e.target.value); onSave?.(e.target.value) }}
          placeholder="—"
          className="text-[11px] font-medium text-right focus:outline-none rounded px-2 py-1"
          style={{ width: inputType === 'date' ? 124 : 100, color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#00c896' }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'
            setActive(false)
            onSave?.(inputValue)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { setActive(false); onSave?.(inputValue) }
            else if (e.key === 'Escape') { setActive(false) }
          }}
        />
      </div>
    )
  }

  const canInline = !!onSave
  return (
    <div
      className={`flex items-center justify-between gap-2${canInline ? ' group cursor-text' : ''}`}
      onClick={canInline ? () => setActive(true) : undefined}
      style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}
    >
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-1">
        {manual && hasValue && <span title="Manually edited" style={{ color: '#00c896', fontSize: 9 }}>✎</span>}
        <span className="text-[11px] font-medium text-right" style={{ color: hasValue ? (isGreen ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>
          {display ?? '—'}
        </span>
        {canInline && (
          <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity flex-shrink-0" viewBox="0 0 24 24" fill="#00c896">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        )}
      </div>
    </div>
  )
}

function BoolRow({ label, value, onToggle, highlight = false, neutral = false, trueLabel = 'Yes', falseLabel = 'No' }: {
  label: string; value: boolean; onToggle?: () => void
  highlight?: boolean; neutral?: boolean; trueLabel?: string; falseLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <button
        onClick={onToggle}
        disabled={!onToggle}
        className="text-[11px] font-medium px-1.5 py-0.5 rounded tracking-wider uppercase transition-all"
        style={{
          background: value ? (highlight ? 'rgba(0,200,150,0.12)' : 'rgba(0,200,150,0.08)') : neutral ? 'var(--hover-bg)' : 'rgba(239,68,68,0.1)',
          color:      value ? '#00c896' : neutral ? 'var(--text-muted)' : '#ef4444',
          border:     `1px solid ${value ? 'rgba(0,200,150,0.3)' : neutral ? 'var(--border)' : 'rgba(239,68,68,0.25)'}`,
          cursor:     onToggle ? 'pointer' : 'default',
        }}
        onMouseEnter={e => { if (onToggle) e.currentTarget.style.opacity = '0.7' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
      >
        {value ? trueLabel : falseLabel}
      </button>
    </div>
  )
}

function DescRow({ value, onChange, onSave }: {
  value: string; onChange: (v: string) => void; onSave?: (v: string) => void
}) {
  const [active, setActive] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (active) taRef.current?.focus() }, [active])
  const hasValue  = value.trim().length > 0
  const canInline = !!onSave

  if (active) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Description</span>
        <textarea
          ref={taRef}
          value={value}
          onChange={e => { onChange(e.target.value); onSave?.(e.target.value) }}
          placeholder="—"
          rows={3}
          className="text-[11px] focus:outline-none rounded px-2 py-1 resize-none"
          style={{ color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#00c896' }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'
            setActive(false)
            onSave?.(value)
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`${canInline ? 'group cursor-text' : ''}`}
      onClick={canInline ? () => setActive(true) : undefined}
    >
      <div className="flex items-center gap-1 mb-1">
        <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--text-faint)', letterSpacing: '0.7px' }}>Description</p>
        {canInline && (
          <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity" viewBox="0 0 24 24" fill="#00c896">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        )}
      </div>
      <div
        className="text-[11px] whitespace-pre-wrap"
        style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 9px', minHeight: 56, lineHeight: 1.55, color: hasValue ? 'var(--text-secondary)' : 'var(--text-faint)', fontStyle: hasValue ? 'normal' : 'italic' }}
      >
        {value || 'No description yet. Click to add…'}
      </div>
    </div>
  )
}
