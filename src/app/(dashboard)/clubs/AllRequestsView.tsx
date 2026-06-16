'use client'

import { useState, useEffect, useCallback } from 'react'
import ClubRequestCard from './ClubRequestCard'
import type { ClubRow } from './ClubsClient'

interface RequestWithClub {
  id: string
  clubId: string
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
  club: { id: string; name: string }
  proposals: {
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
  }[]
}

const PROPOSAL_STATUSES = [
  { value: 'proposed',      label: 'Proposed',      color: '#6c8fff', bg: 'rgba(108,143,255,0.1)',  border: 'rgba(108,143,255,0.3)'  },
  { value: 'in_discussion', label: 'In Discussion', color: '#ff9f43', bg: 'rgba(255,159,67,0.1)',   border: 'rgba(255,159,67,0.3)'   },
  { value: 'offer',         label: 'Offer',         color: '#00c896', bg: 'rgba(0,200,150,0.1)',    border: 'rgba(0,200,150,0.3)'    },
  { value: 'signed',        label: 'Signed',        color: '#00c896', bg: 'rgba(0,200,150,0.15)',   border: 'rgba(0,200,150,0.5)'    },
  { value: 'rejected',      label: 'Rejected',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)'    },
]

type StageTab = 'all_open' | 'no_proposals' | 'proposed' | 'in_discussion' | 'offer' | 'signed' | 'all'

const STAGE_TABS: { value: StageTab; label: string; color: string; bg: string; border: string }[] = [
  { value: 'all_open',      label: 'All Open',      color: '#6c8fff', bg: 'rgba(108,143,255,0.15)', border: 'rgba(108,143,255,0.5)' },
  { value: 'no_proposals',  label: 'No Proposals',  color: '#aaa',    bg: 'rgba(150,150,150,0.1)',  border: 'rgba(150,150,150,0.3)' },
  { value: 'proposed',      label: 'Proposed',      color: '#6c8fff', bg: 'rgba(108,143,255,0.12)', border: 'rgba(108,143,255,0.4)' },
  { value: 'in_discussion', label: 'In Discussion', color: '#ff9f43', bg: 'rgba(255,159,67,0.12)',  border: 'rgba(255,159,67,0.4)'  },
  { value: 'offer',         label: 'Offer',         color: '#00c896', bg: 'rgba(0,200,150,0.12)',   border: 'rgba(0,200,150,0.4)'   },
  { value: 'signed',        label: 'Signed',        color: '#00c896', bg: 'rgba(0,200,150,0.18)',   border: 'rgba(0,200,150,0.6)'   },
  { value: 'all',           label: 'All',           color: 'var(--text-muted)', bg: 'var(--subtle-bg)', border: 'var(--border)' },
]

export default function AllRequestsView({ clubs }: { clubs: ClubRow[] }) {
  const [requests, setRequests] = useState<RequestWithClub[]>([])
  const [loading, setLoading] = useState(true)

  // Stage tab
  const [stageTab, setStageTab] = useState<StageTab>('all_open')

  // Filter visibility
  const [filterOpen, setFilterOpen] = useState(false)

  // Request filters
  const [filterStatus, setFilterStatus] = useState<'open' | 'closed' | ''>('open')
  const [filterTeamLevel, setFilterTeamLevel] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterTransferType, setFilterTransferType] = useState('')
  const [filterNationality, setFilterNationality] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState('')
  const [filterAgeMax, setFilterAgeMax] = useState('')
  const [filterBudgetMax, setFilterBudgetMax] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Proposal filter
  const [filterProposalStatus, setFilterProposalStatus] = useState('')

  // Sync filterStatus with stageTab
  useEffect(() => {
    if (stageTab === 'all') {
      setFilterStatus('')
    } else if (stageTab === 'signed') {
      setFilterStatus('')
    } else {
      setFilterStatus('open')
    }
  }, [stageTab])

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    const qs = params.toString()
    return `/api/clubs/requests${qs ? `?${qs}` : ''}`
  }, [filterStatus])

  useEffect(() => {
    setLoading(true)
    fetch(buildUrl())
      .then(r => r.json())
      .then(d => { setRequests(d.requests ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [buildUrl])

  function handleUpdated(updated: RequestWithClub, clubInfo: { id: string; name: string }) {
    setRequests(prev => {
      const mapped = prev.map(r => r.id === updated.id ? { ...updated, club: clubInfo, clubId: clubInfo.id } : r)
      if (filterStatus === 'open' && updated.status === 'closed') return mapped.filter(r => r.id !== updated.id)
      if (filterStatus === 'closed' && updated.status === 'open') return mapped.filter(r => r.id !== updated.id)
      return mapped
    })
  }

  function handleDeleted(id: string) {
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  function getTeamLevels(clubId: string): string[] {
    const club = clubs.find(c => c.id === clubId)
    return (club?.teamLevels as string[] | null) ?? []
  }

  // Available team levels across loaded requests (for pills)
  const availableTeamLevels = [...new Set(requests.map(r => r.teamLevel).filter(Boolean) as string[])].sort()

  // Client-side filters (excluding status which triggers re-fetch)
  const visibleRequests = requests
    .filter(r => !filterTeamLevel || r.teamLevel === filterTeamLevel)
    .filter(r => !filterPosition || (r.position ?? '').toLowerCase().includes(filterPosition.toLowerCase()))
    .filter(r => !filterTransferType || r.transferType === filterTransferType)
    .filter(r => !filterNationality || (r.nationality ?? '').toLowerCase().includes(filterNationality.toLowerCase()))
    .filter(r => !filterAgeMin || (r.ageMax == null || r.ageMax >= parseInt(filterAgeMin)))
    .filter(r => !filterAgeMax || (r.ageMin == null || r.ageMin <= parseInt(filterAgeMax)))
    .filter(r => !filterBudgetMax || (r.budget != null && r.budget <= parseFloat(filterBudgetMax) * 1000))
    .filter(r => !filterDateFrom || new Date(r.createdAt) >= new Date(filterDateFrom))
    .filter(r => !filterDateTo   || new Date(r.createdAt) <= new Date(filterDateTo + 'T23:59:59'))
    .filter(r => !filterProposalStatus || r.proposals.some(p => p.status === filterProposalStatus))

  // Stage filtering on top of client-side filters
  const stageFilteredRequests = visibleRequests.filter(r => {
    switch (stageTab) {
      case 'all_open':      return r.status === 'open'
      case 'no_proposals':  return r.status === 'open' && r.proposals.length === 0
      case 'proposed':      return r.status === 'open' && r.proposals.some(p => p.status === 'proposed')
      case 'in_discussion': return r.status === 'open' && r.proposals.some(p => p.status === 'in_discussion')
      case 'offer':         return r.status === 'open' && r.proposals.some(p => p.status === 'offer')
      case 'signed':        return r.proposals.some(p => p.status === 'signed')
      case 'all':           return true
      default:              return true
    }
  })

  // Group requests by club
  const grouped = stageFilteredRequests.reduce<{ clubId: string; clubName: string; requests: RequestWithClub[] }[]>((acc, req) => {
    const existing = acc.find(g => g.clubId === req.club.id)
    if (existing) { existing.requests.push(req) }
    else acc.push({ clubId: req.club.id, clubName: req.club.name, requests: [req] })
    return acc
  }, [])

  const hasActiveFilters = !!(filterTeamLevel || filterPosition || filterTransferType || filterNationality || filterAgeMin || filterAgeMax || filterBudgetMax || filterDateFrom || filterDateTo || filterProposalStatus)

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <p className="text-[10px] uppercase font-bold pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#6c8fff' }}>
          All Requests
        </p>
        {!loading && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(108,143,255,0.15)', color: '#6c8fff' }}>
            {stageFilteredRequests.length}
          </span>
        )}
      </div>

      {/* Stage tabs row + Filter toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Stage tabs */}
        <div className="flex items-center gap-1 flex-wrap flex-1">
          {STAGE_TABS.map(tab => {
            const active = stageTab === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setStageTab(tab.value)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={active
                  ? { background: tab.bg, color: tab.color, border: `1px solid ${tab.border}` }
                  : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setFilterOpen(o => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex-shrink-0"
          style={filterOpen || hasActiveFilters
            ? { background: 'rgba(108,143,255,0.15)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.4)' }
            : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z"/>
          </svg>
          Filters
          {hasActiveFilters && !filterOpen && (
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6c8fff' }} />
          )}
        </button>
      </div>

      {/* Collapsible filter bar */}
      {filterOpen && (
        <div className="flex flex-col gap-0 rounded-xl overflow-hidden" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>

          {/* ── REQUESTS row (no Status pills — stage tabs handle status) ── */}
          <div className="flex items-center gap-3 flex-wrap px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[10px] uppercase font-bold flex-shrink-0" style={{ color: '#6c8fff', letterSpacing: '0.7px' }}>Requests</span>

            {/* Team Level */}
            {availableTeamLevels.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Team</span>
                  {availableTeamLevels.map(level => (
                    <button key={level} onClick={() => setFilterTeamLevel(filterTeamLevel === level ? '' : level)}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
                      style={filterTeamLevel === level
                        ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
                        : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {level}
                    </button>
                  ))}
                </div>
                <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />
              </>
            )}

            {/* Position */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Position</span>
              <input
                type="text" value={filterPosition} onChange={e => setFilterPosition(e.target.value)}
                placeholder="any…"
                className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
                style={{ background: 'var(--input-bg)', border: filterPosition ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 80 }}
              />
            </div>

            <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

            {/* Transfer Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Transfer</span>
              {(['buy', 'loan', 'free'] as const).map(val => (
                <button key={val} onClick={() => setFilterTransferType(filterTransferType === val ? '' : val)}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize transition-all"
                  style={filterTransferType === val
                    ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
                    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {val}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

            {/* Nationality */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Nationality</span>
              <input
                type="text" value={filterNationality} onChange={e => setFilterNationality(e.target.value)}
                placeholder="any…"
                className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
                style={{ background: 'var(--input-bg)', border: filterNationality ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 80 }}
              />
            </div>

            <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

            {/* Age range */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Age</span>
              <input
                type="number" value={filterAgeMin} onChange={e => setFilterAgeMin(e.target.value)}
                placeholder="min"
                className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
                style={{ background: 'var(--input-bg)', border: filterAgeMin ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 50 }}
              />
              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>–</span>
              <input
                type="number" value={filterAgeMax} onChange={e => setFilterAgeMax(e.target.value)}
                placeholder="max"
                className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
                style={{ background: 'var(--input-bg)', border: filterAgeMax ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 50 }}
              />
            </div>

            <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

            {/* Budget max */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Budget ≤</span>
              <input
                type="number" value={filterBudgetMax} onChange={e => setFilterBudgetMax(e.target.value)}
                placeholder="K€/yr"
                className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
                style={{ background: 'var(--input-bg)', border: filterBudgetMax ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 70 }}
              />
            </div>

            <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Date</span>
              <input
                type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
                style={{ background: 'var(--input-bg)', border: filterDateFrom ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 120 }}
              />
              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>–</span>
              <input
                type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
                style={{ background: 'var(--input-bg)', border: filterDateTo ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 120 }}
              />
            </div>
          </div>

          {/* ── PROPOSALS row ── */}
          <div className="flex items-center gap-3 flex-wrap px-3 py-2.5">
            <span className="text-[10px] uppercase font-bold flex-shrink-0" style={{ color: '#00c896', letterSpacing: '0.7px' }}>Proposals</span>
            <button onClick={() => setFilterProposalStatus('')}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
              style={filterProposalStatus === ''
                ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
                : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              All
            </button>
            {PROPOSAL_STATUSES.map(({ value, label, color, bg, border }) => {
              const active = filterProposalStatus === value
              const count = requests.filter(r => r.proposals.some(p => p.status === value)).length
              return (
                <button key={value} onClick={() => setFilterProposalStatus(active ? '' : value)}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
                  style={active
                    ? { background: bg, color, border: `1px solid ${border}` }
                    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {label}{count > 0 && <span className="ml-1 text-[10px] opacity-60">{count}</span>}
                </button>
              )
            })}

            {/* Reset */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterTeamLevel('')
                  setFilterPosition('')
                  setFilterTransferType('')
                  setFilterNationality('')
                  setFilterAgeMin('')
                  setFilterAgeMax('')
                  setFilterBudgetMax('')
                  setFilterDateFrom('')
                  setFilterDateTo('')
                  setFilterProposalStatus('')
                }}
                className="ml-auto text-[11px] px-2 py-0.5 rounded-lg transition-all"
                style={{ color: 'var(--text-faint)', background: 'transparent', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--hover-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent' }}>
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 px-2">
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#6c8fff', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading requests…</p>
        </div>
      ) : stageFilteredRequests.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center justify-center text-center py-10 px-4"
          style={{ background: 'var(--subtle-bg)', border: '1px dashed rgba(108,143,255,0.25)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No requests found</p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            No requests match this stage.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(group => (
            <div key={group.clubId}>
              <p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2"
                style={{ letterSpacing: '0.8px', color: 'var(--text-muted)', borderColor: 'rgba(108,143,255,0.5)' }}>
                {group.clubName}
                <span className="ml-1.5 font-normal opacity-60">{group.requests.length}</span>
              </p>
              <div className="flex flex-col gap-2">
                {group.requests.map(req => (
                  <ClubRequestCard
                    key={req.id}
                    request={req}
                    clubId={req.club.id}
                    clubName={req.club.name}
                    teamLevels={getTeamLevels(req.club.id)}
                    onUpdated={r => handleUpdated(r as RequestWithClub, req.club)}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
