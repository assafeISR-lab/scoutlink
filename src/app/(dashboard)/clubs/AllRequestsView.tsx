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

export default function AllRequestsView({ clubs }: { clubs: ClubRow[] }) {
  const [requests, setRequests] = useState<RequestWithClub[]>([])
  const [loading, setLoading] = useState(true)

  // Request filters
  const [filterStatus, setFilterStatus] = useState<'open' | 'closed' | ''>('open')
  const [filterTeamLevel, setFilterTeamLevel] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterTransferType, setFilterTransferType] = useState('')
  const [filterNationality, setFilterNationality] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState('')
  const [filterAgeMax, setFilterAgeMax] = useState('')
  const [filterBudgetMax, setFilterBudgetMax] = useState('')

  // Proposal filter
  const [filterProposalStatus, setFilterProposalStatus] = useState('')

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

  const visibleRequests = requests
    .filter(r => !filterTeamLevel || r.teamLevel === filterTeamLevel)
    .filter(r => !filterPosition || (r.position ?? '').toLowerCase().includes(filterPosition.toLowerCase()))
    .filter(r => !filterTransferType || r.transferType === filterTransferType)
    .filter(r => !filterNationality || (r.nationality ?? '').toLowerCase().includes(filterNationality.toLowerCase()))
    .filter(r => !filterAgeMin || (r.ageMax == null || r.ageMax >= parseInt(filterAgeMin)))
    .filter(r => !filterAgeMax || (r.ageMin == null || r.ageMin <= parseInt(filterAgeMax)))
    .filter(r => !filterBudgetMax || (r.budget != null && r.budget <= parseFloat(filterBudgetMax) * 1000))
    .filter(r => !filterProposalStatus || r.proposals.some(p => p.status === filterProposalStatus))

  // Group requests by club
  const grouped = visibleRequests.reduce<{ clubId: string; clubName: string; requests: RequestWithClub[] }[]>((acc, req) => {
    const existing = acc.find(g => g.clubId === req.club.id)
    if (existing) { existing.requests.push(req) }
    else acc.push({ clubId: req.club.id, clubName: req.club.name, requests: [req] })
    return acc
  }, [])

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
            {visibleRequests.length}
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-0 rounded-xl overflow-hidden" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>

        {/* ── REQUESTS row ── */}
        <div className="flex items-center gap-3 flex-wrap px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[10px] uppercase font-bold flex-shrink-0" style={{ color: '#6c8fff', letterSpacing: '0.7px' }}>Requests</span>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Status</span>
            {([['', 'All'], ['open', 'Open'], ['closed', 'Closed']] as [string, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setFilterStatus(val as 'open' | 'closed' | '')}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
                style={filterStatus === val
                  ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
                  : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

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
          {(filterStatus !== 'open' || filterTeamLevel || filterPosition || filterTransferType || filterNationality || filterAgeMin || filterAgeMax || filterBudgetMax || filterProposalStatus) && (
            <button
              onClick={() => { setFilterStatus('open'); setFilterTeamLevel(''); setFilterPosition(''); setFilterTransferType(''); setFilterNationality(''); setFilterAgeMin(''); setFilterAgeMax(''); setFilterBudgetMax(''); setFilterProposalStatus('') }}
              className="ml-auto text-[11px] px-2 py-0.5 rounded-lg transition-all"
              style={{ color: 'var(--text-faint)', background: 'transparent', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--hover-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent' }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 px-2">
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#6c8fff', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center justify-center text-center py-10 px-4"
          style={{ background: 'var(--subtle-bg)', border: '1px dashed rgba(108,143,255,0.25)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No requests found</p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {filterStatus === 'open' ? 'No open requests match your filters.' : 'No requests match your filters.'}
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
