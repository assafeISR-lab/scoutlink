'use client'

import { useState, useEffect } from 'react'

interface Proposal {
  id: string
  status: string
  createdAt: string
  updatedAt: string
  note: string | null
  request: {
    id: string
    position: string | null
    ageMin: number | null
    ageMax: number | null
    budget: number | null
    transferType: string | null
    nationality: string | null
    notes: string | null
    status: string
    club: { id: string; name: string; country: string | null }
  }
}

const STATUS = {
  proposed:      { bg: 'rgba(108,143,255,0.1)',  color: '#6c8fff', border: 'rgba(108,143,255,0.3)',  label: 'Proposed' },
  in_discussion: { bg: 'rgba(255,159,67,0.1)',   color: '#ff9f43', border: 'rgba(255,159,67,0.3)',   label: 'In Discussion' },
  offer:         { bg: 'rgba(0,200,150,0.1)',    color: '#00c896', border: 'rgba(0,200,150,0.3)',    label: 'Offer' },
  signed:        { bg: 'rgba(0,200,150,0.15)',   color: '#00c896', border: 'rgba(0,200,150,0.5)',    label: '✓ Signed' },
  rejected:      { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', border: 'rgba(239,68,68,0.3)',    label: 'Rejected' },
} as Record<string, { bg: string; color: string; border: string; label: string }>

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function requestSummary(r: Proposal['request']): string[] {
  const parts: string[] = []
  if (r.position) parts.push(r.position)
  if (r.ageMin && r.ageMax) parts.push(`${r.ageMin}–${r.ageMax} yrs`)
  else if (r.ageMax) parts.push(`≤${r.ageMax} yrs`)
  else if (r.ageMin) parts.push(`≥${r.ageMin} yrs`)
  if (r.transferType) parts.push(r.transferType === 'free' ? 'Free agent' : r.transferType === 'loan' ? 'Loan' : 'Buy')
  if (r.budget) parts.push(`€${(r.budget / 1000).toFixed(0)}K/yr`)
  if (r.nationality) parts.push(r.nationality)
  return parts
}

export default function ProposalsSection({ playerId, dbId }: { playerId: string; dbId: string }) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/databases/${dbId}/players/${playerId}/proposals`)
      .then(r => r.json())
      .then(d => setProposals(d.proposals ?? []))
      .finally(() => setLoading(false))
  }, [playerId, dbId])

  async function handleStatusChange(proposalId: string, status: string) {
    const res = await fetch(`/api/databases/${dbId}/players/${playerId}/proposals`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, status }),
    })
    if (!res.ok) return
    const { proposal } = await res.json() as { proposal: Proposal }
    setProposals(prev => prev ? prev.map(p => p.id === proposal.id ? proposal : p) : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#6c8fff', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-8 py-16">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(108,143,255,0.08)', border: '1px solid rgba(108,143,255,0.2)' }}>
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#6c8fff">
            <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
          </svg>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>No proposals yet</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>
          Propose this player to a club from the <strong>Clubs</strong> page to track proposals here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">

      <p className="text-[10px] uppercase font-bold pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#6c8fff' }}>
        Proposals
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
          style={{ background: 'rgba(108,143,255,0.15)', color: '#6c8fff' }}>
          {proposals.length}
        </span>
      </p>

      {proposals.map(proposal => {
        const sc = STATUS[proposal.status] ?? STATUS.proposed
        const summary = requestSummary(proposal.request)
        const isClosed = proposal.request.status === 'closed'

        return (
          <div key={proposal.id} className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>

            {/* Club row */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="#6c8fff">
                  <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                </svg>
                <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {proposal.request.club.name}
                </span>
                {proposal.request.club.country && (
                  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
                    {proposal.request.club.country}
                  </span>
                )}
                {isClosed && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                    style={{ background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
                    Closed
                  </span>
                )}
              </div>
              <span className="text-[11px] flex-shrink-0 ml-3" style={{ color: 'var(--text-faint)' }}>
                {fmtDate(proposal.createdAt)}
              </span>
            </div>

            {/* Request summary + status */}
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-wrap gap-1.5 min-w-0">
                {summary.length > 0 ? summary.map((s, i) => (
                  <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(108,143,255,0.08)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.2)' }}>
                    {s}
                  </span>
                )) : (
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Open request</span>
                )}
              </div>

              <select
                value={proposal.status}
                onChange={e => handleStatusChange(proposal.id, e.target.value)}
                className="text-[11px] px-2 py-1 rounded-lg font-semibold focus:outline-none flex-shrink-0"
                style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
              >
                {Object.entries(STATUS).map(([v, s]) => (
                  <option key={v} value={v}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            {proposal.request.notes && (
              <div className="px-4 pb-3">
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                  {proposal.request.notes}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
