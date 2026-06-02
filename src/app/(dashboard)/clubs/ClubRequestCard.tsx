'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface Proposal {
  id: string
  status: string
  player: {
    id: string
    firstName: string
    lastName: string
    position: string | null
    clubName: string | null
    databaseId: string
    database: { name: string }
  }
}

interface Request {
  id: string
  teamLevel: string | null
  position: string | null
  ageMin: number | null
  ageMax: number | null
  budget: number | null
  transferType: string | null
  nationality: string | null
  notes: string | null
  status: string
  createdAt: string
  proposals: Proposal[]
}

interface MatchResult {
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
    foot: string
    league: string
  }
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  proposed:      { bg: 'rgba(108,143,255,0.1)',  color: '#6c8fff', border: 'rgba(108,143,255,0.3)',  label: 'Proposed' },
  in_discussion: { bg: 'rgba(255,159,67,0.1)',   color: '#ff9f43', border: 'rgba(255,159,67,0.3)',   label: 'In Discussion' },
  offer:         { bg: 'rgba(0,200,150,0.1)',    color: '#00c896', border: 'rgba(0,200,150,0.3)',    label: 'Offer' },
  signed:        { bg: 'rgba(0,200,150,0.15)',   color: '#00c896', border: 'rgba(0,200,150,0.5)',    label: '✓ Signed' },
  rejected:      { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', border: 'rgba(239,68,68,0.3)',    label: 'Rejected' },
}

interface PlayerSearchResult {
  id: string
  firstName: string
  lastName: string
  position: string | null
  clubName: string | null
  databaseId: string
  databaseName: string
}

export default function ClubRequestCard({
  request,
  clubId,
  clubName,
  teamLevels = [],
  onUpdated,
  onDeleted,
}: {
  request: Request
  clubId: string
  clubName: string
  teamLevels?: string[]
  onUpdated: (r: Request) => void
  onDeleted: (id: string) => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [matching, setMatching] = useState(false)
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null)
  const [proposing, setProposing] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [proposalDeleteConfirm, setProposalDeleteConfirm] = useState<string | null>(null)

  // Edit request
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ teamLevel: '', position: '', ageMin: '', ageMax: '', budget: '', transferType: '', nationality: '', notes: '' })
  const [editSaving, setEditSaving] = useState(false)

  // Manual search
  const [manualOpen, setManualOpen] = useState(false)
  const [manualQuery, setManualQuery] = useState('')
  const [manualResults, setManualResults] = useState<PlayerSearchResult[]>([])
  const [manualSearching, setManualSearching] = useState(false)
  const manualInputRef = useRef<HTMLInputElement>(null)
  const manualDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)

  const fetchManual = useCallback(async (q: string) => {
    if (q.length < 2) { setManualResults([]); return }
    setManualSearching(true)
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return
      const data = await res.json() as { players: PlayerSearchResult[] }
      setManualResults(data.players ?? [])
    } finally { setManualSearching(false) }
  }, [])

  useEffect(() => {
    if (manualDebounce.current) clearTimeout(manualDebounce.current)
    manualDebounce.current = setTimeout(() => fetchManual(manualQuery), 220)
    return () => { if (manualDebounce.current) clearTimeout(manualDebounce.current) }
  }, [manualQuery, fetchManual])

  useEffect(() => {
    if (!manualOpen) { setManualQuery(''); setManualResults([]) }
    else { setTimeout(() => manualInputRef.current?.focus(), 50) }
  }, [manualOpen])

  // Re-measure input position when results change so the portal stays aligned
  useEffect(() => {
    if (manualInputRef.current) setDropdownRect(manualInputRef.current.getBoundingClientRect())
  }, [manualResults])

  const isClosed = request.status === 'closed'

  // Build a human-readable summary of the request
  const summary: string[] = []
  if (request.position) summary.push(request.position)
  if (request.ageMin || request.ageMax) {
    if (request.ageMin && request.ageMax) summary.push(`${request.ageMin}–${request.ageMax} yrs`)
    else if (request.ageMax) summary.push(`≤${request.ageMax} yrs`)
    else summary.push(`≥${request.ageMin} yrs`)
  }
  if (request.transferType) summary.push(request.transferType === 'free' ? 'Free agent' : request.transferType === 'loan' ? 'Loan' : 'Buy')
  if (request.budget) summary.push(`€${(request.budget / 1000).toFixed(0)}K/yr`)
  if (request.nationality) summary.push(request.nationality)

  async function handleFindPlayers() {
    setMatching(true)
    setExpanded(true)
    try {
      const res = await fetch(`/api/clubs/${clubId}/requests/${request.id}/match`, { method: 'POST' })
      if (!res.ok) return
      const data = await res.json() as { results: MatchResult[] }
      setMatchResults(data.results ?? [])
    } finally {
      setMatching(false)
    }
  }

  async function handlePropose(playerId: string) {
    setProposing(playerId)
    try {
      const res = await fetch(`/api/clubs/${clubId}/requests/${request.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      if (!res.ok) return
      const { proposal } = await res.json() as { proposal: { id: string; status: string; player: Proposal['player'] } }
      onUpdated({ ...request, proposals: [...request.proposals.filter(p => p.player.id !== playerId), proposal] })
    } finally {
      setProposing(null)
    }
  }

  async function handleUpdateProposalStatus(proposalId: string, status: string) {
    const res = await fetch(`/api/clubs/${clubId}/requests/${request.id}/proposals`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, status }),
    })
    if (!res.ok) return
    const { proposal } = await res.json() as { proposal: Proposal }
    onUpdated({ ...request, proposals: request.proposals.map(p => p.id === proposalId ? proposal : p) })
  }

  async function handleRemoveProposal(proposalId: string) {
    const res = await fetch(`/api/clubs/${clubId}/requests/${request.id}/proposals`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId }),
    })
    if (!res.ok) return
    onUpdated({ ...request, proposals: request.proposals.filter(p => p.id !== proposalId) })
  }

  async function handleClose() {
    const res = await fetch(`/api/clubs/${clubId}/requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isClosed ? 'open' : 'closed' }),
    })
    if (!res.ok) return
    const { request: updated } = await res.json() as { request: Request }
    onUpdated(updated)
  }

  async function handleDelete() {
    await fetch(`/api/clubs/${clubId}/requests/${request.id}`, { method: 'DELETE' })
    onDeleted(request.id)
  }

  function openEdit() {
    setEditForm({
      teamLevel: request.teamLevel ?? '',
      position: request.position ?? '',
      ageMin: request.ageMin?.toString() ?? '',
      ageMax: request.ageMax?.toString() ?? '',
      budget: request.budget?.toString() ?? '',
      transferType: request.transferType ?? '',
      nationality: request.nationality ?? '',
      notes: request.notes ?? '',
    })
    setEditOpen(true)
  }

  async function handleEditRequest() {
    setEditSaving(true)
    try {
      const res = await fetch(`/api/clubs/${clubId}/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) return
      const { request: updated } = await res.json() as { request: Request }
      onUpdated(updated)
      setEditOpen(false)
    } finally {
      setEditSaving(false)
    }
  }

  const proposedIds = new Set(request.proposals.map(p => p.player.id))

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>

      {/* Request header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: expanded ? 'var(--subtle-bg)' : 'transparent', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
        onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {request.teamLevel && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(108,143,255,0.18)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.4)' }}>
                {request.teamLevel}
              </span>
            )}
            {summary.length > 0
              ? summary.map((s, i) => (
                <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(108,143,255,0.1)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.25)' }}>
                  {s}
                </span>
              ))
              : !request.teamLevel && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Open request</span>
            }
          </div>
          {request.notes && (
            <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-faint)' }}>{request.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {request.proposals.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(0,200,150,0.1)', color: '#00c896' }}>
              {request.proposals.length} Players Proposed
            </span>
          )}
          <svg className="w-3.5 h-3.5 transition-transform" style={{ color: 'var(--text-faint)', transform: expanded ? 'rotate(180deg)' : 'none' }}
            viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 flex flex-col gap-4">

          {/* Action buttons */}
          {!isClosed && (
            <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleFindPlayers}
                disabled={matching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff', boxShadow: '0 2px 12px rgba(108,143,255,0.25)' }}
                onMouseEnter={e => { if (!matching) e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,143,255,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(108,143,255,0.25)' }}>
                {matching
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />Finding Players…</>
                  : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18 2.5 2.5 0 0 0 10 15.5 2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/></svg>Find Matching Players</>
                }
              </button>
              <button
                onClick={() => setManualOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={manualOpen
                  ? { background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.4)' }
                  : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { if (!manualOpen) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                onMouseLeave={e => { if (!manualOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                Add Manually
              </button>
              <button
                onClick={openEdit}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                Edit
              </button>
              <button onClick={handleClose}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                Close Request
              </button>
              {deleteConfirm ? (
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                    Confirm Delete
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ml-auto"
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                  Delete
                </button>
              )}
            </div>

            {/* Manual player search */}
            {manualOpen && (
              <div className="relative">
                <div className="relative flex items-center">
                  <svg className="absolute left-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-faint)' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualQuery}
                    onChange={e => {
                      setManualQuery(e.target.value)
                      if (manualInputRef.current) setDropdownRect(manualInputRef.current.getBoundingClientRect())
                    }}
                    onFocus={() => { if (manualInputRef.current) setDropdownRect(manualInputRef.current.getBoundingClientRect()) }}
                    onKeyDown={e => { if (e.key === 'Escape') setManualOpen(false) }}
                    placeholder="Type player name…"
                    className="w-full pl-8 pr-8 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid rgba(108,143,255,0.4)', color: 'var(--text-primary)' }}
                  />
                  {manualSearching && (
                    <div className="absolute right-2.5 w-3.5 h-3.5 rounded-full border-2 animate-spin"
                      style={{ borderColor: '#6c8fff', borderTopColor: 'transparent' }} />
                  )}
                  {!manualSearching && manualQuery && (
                    <button onClick={() => setManualQuery('')}
                      className="absolute right-2.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>✕</button>
                  )}
                </div>

                {/* Dropdown via portal */}
                {manualResults.length > 0 && dropdownRect && createPortal(
                  <div style={{
                    position: 'fixed',
                    top: dropdownRect.bottom + 4,
                    left: dropdownRect.left,
                    width: dropdownRect.width,
                    background: 'var(--card-bg)',
                    border: '1px solid rgba(108,143,255,0.3)',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    zIndex: 9999,
                    maxHeight: Math.min(260, window.innerHeight - dropdownRect.bottom - 12),
                    overflowY: 'auto',
                  }}>
                    {manualResults.map(p => {
                      const alreadyProposed = proposedIds.has(p.id)
                      const isProposing = proposing === p.id
                      return (
                        <button
                          key={p.id}
                          disabled={alreadyProposed || !!proposing}
                          onClick={async () => {
                            await handlePropose(p.id)
                            setManualOpen(false)
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors disabled:cursor-default"
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => { if (!alreadyProposed) e.currentTarget.style.background = 'var(--hover-bg)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold" style={{ color: alreadyProposed ? 'var(--text-faint)' : 'var(--text-primary)' }}>
                              {p.firstName} {p.lastName}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {[p.position, p.clubName, p.databaseName].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {alreadyProposed ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-2 flex-shrink-0"
                              style={{ background: 'var(--subtle-bg)', color: 'var(--text-faint)' }}>
                              ✓ Proposed
                            </span>
                          ) : isProposing ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin ml-2 flex-shrink-0"
                              style={{ borderColor: '#6c8fff', borderTopColor: 'transparent' }} />
                          ) : (
                            <span className="text-[11px] font-semibold ml-2 flex-shrink-0" style={{ color: '#6c8fff' }}>
                              + Propose
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>,
                  document.body
                )}

                {manualQuery.length >= 2 && !manualSearching && manualResults.length === 0 && (
                  <p className="text-xs mt-1.5 px-1" style={{ color: 'var(--text-faint)' }}>
                    No players found for &ldquo;{manualQuery}&rdquo;
                  </p>
                )}
              </div>
            )}
            </div>
          )}

          {isClosed && (
            <button onClick={handleClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all w-fit"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              Reopen Request
            </button>
          )}

          {/* AI match results */}
          {matchResults !== null && (
            <div>
              <p className="text-[10px] uppercase font-bold mb-3 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#6c8fff' }}>
                AI Matches {matchResults.length > 0 && `— ${matchResults.length} found`}
              </p>
              {matchResults.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No matching players found in your lists for this request.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {matchResults.map(result => {
                    const already = proposedIds.has(result.player.id)
                    const existing = request.proposals.find(p => p.player.id === result.player.id)
                    const sc = STATUS_COLORS[existing?.status ?? '']
                    return (
                      <div key={result.player.id} className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
                        {/* Score */}
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            background: result.score >= 80 ? 'rgba(0,200,150,0.15)' : result.score >= 60 ? 'rgba(255,159,67,0.15)' : 'rgba(239,68,68,0.1)',
                            color: result.score >= 80 ? '#00c896' : result.score >= 60 ? '#ff9f43' : '#ef4444',
                          }}>
                          {result.score}
                        </div>
                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {result.player.firstName} {result.player.lastName}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {[result.player.position, result.player.clubName, result.player.league].filter(Boolean).join(' · ')}
                          </p>
                          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-faint)' }}>{result.explanation}</p>
                        </div>
                        {/* Propose / status */}
                        <div className="flex-shrink-0">
                          {already && sc ? (
                            <select
                              value={existing?.status}
                              onChange={e => handleUpdateProposalStatus(existing!.id, e.target.value)}
                              className="text-[10px] px-2 py-1 rounded-lg font-semibold focus:outline-none"
                              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                              {Object.entries(STATUS_COLORS).map(([v, s]) => (
                                <option key={v} value={v}>{s.label}</option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => handlePropose(result.player.id)}
                              disabled={proposing === result.player.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
                              style={{ background: 'rgba(108,143,255,0.1)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,143,255,0.2)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,143,255,0.1)' }}>
                              {proposing === result.player.id ? '…' : '+ Propose'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Existing proposals */}
          {request.proposals.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>
                Proposed Players ({request.proposals.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {request.proposals.map(p => {
                  const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.proposed
                  return (
                    <div key={p.id} className="rounded-xl overflow-hidden"
                      style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {p.player.firstName} {p.player.lastName}
                          </span>
                          {p.player.clubName && (
                            <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>{p.player.clubName}</span>
                          )}
                          <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(108,143,255,0.1)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.2)' }}>
                            {p.player.database.name}
                          </span>
                        </div>
                        <select value={p.status} onChange={e => handleUpdateProposalStatus(p.id, e.target.value)}
                          className="text-[10px] px-2 py-1 rounded-lg font-semibold focus:outline-none"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {Object.entries(STATUS_COLORS).map(([v, s]) => (
                            <option key={v} value={v}>{s.label}</option>
                          ))}
                        </select>
                        {proposalDeleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setProposalDeleteConfirm(null)}
                              className="text-[10px] px-2 py-0.5 rounded font-medium transition-all"
                              style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                              Cancel
                            </button>
                            <button
                              onClick={() => { handleRemoveProposal(p.id); setProposalDeleteConfirm(null) }}
                              className="text-[10px] px-2 py-0.5 rounded font-medium"
                              style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                              Delete
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setProposalDeleteConfirm(p.id)}
                            className="w-5 h-5 flex items-center justify-center rounded text-[10px]"
                            style={{ color: 'var(--text-faint)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="px-3 pb-2">
                        <button
                          onClick={() => router.push(`/databases?list=${p.player.databaseId}&player=${p.player.id}&tab=proposals`)}
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all"
                          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,143,255,0.08)'; e.currentTarget.style.color = '#6c8fff'; e.currentTarget.style.borderColor = 'rgba(108,143,255,0.3)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                          Go to Player Profile
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Edit Request Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #6c8fff, #5a7aff)' }} />
            <div className="p-6">
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Edit Request</h2>
              <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>{clubName}</p>
              <div className="flex flex-col gap-3 mb-5">
                {/* Team Level */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Team</label>
                  {teamLevels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {teamLevels.map(l => (
                        <button key={l} onClick={() => setEditForm(f => ({ ...f, teamLevel: f.teamLevel === l ? '' : l }))}
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                          style={editForm.teamLevel === l
                            ? { background: 'rgba(108,143,255,0.18)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.5)' }
                            : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input type="text" value={editForm.teamLevel} onChange={e => setEditForm(f => ({ ...f, teamLevel: e.target.value }))}
                      placeholder="e.g. First Team, U18…"
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                  )}
                </div>
                <EField label="Position" value={editForm.position} onChange={v => setEditForm(f => ({ ...f, position: v }))} placeholder="e.g. Striker, Centre-Back" />
                <div className="grid grid-cols-2 gap-3">
                  <EField label="Min Age" value={editForm.ageMin} onChange={v => setEditForm(f => ({ ...f, ageMin: v }))} placeholder="e.g. 18" type="number" />
                  <EField label="Max Age" value={editForm.ageMax} onChange={v => setEditForm(f => ({ ...f, ageMax: v }))} placeholder="e.g. 28" type="number" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Transfer Type</label>
                  <div className="flex gap-2">
                    {(['buy', 'loan', 'free'] as const).map(t => (
                      <button key={t} onClick={() => setEditForm(f => ({ ...f, transferType: f.transferType === t ? '' : t }))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                        style={editForm.transferType === t
                          ? { background: 'rgba(108,143,255,0.15)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.4)' }
                          : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <EField label="Budget (€/year)" value={editForm.budget} onChange={v => setEditForm(f => ({ ...f, budget: v }))} placeholder="e.g. 200000" type="number" />
                <EField label="Nationality" value={editForm.nationality} onChange={v => setEditForm(f => ({ ...f, nationality: v }))} placeholder="e.g. Israeli, French" />
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2} placeholder="Any additional requirements…"
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none resize-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                </div>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <button onClick={handleEditRequest} disabled={editSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff' }}>
                  {editSaving ? 'Saving…' : 'Save Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
    </div>
  )
}
